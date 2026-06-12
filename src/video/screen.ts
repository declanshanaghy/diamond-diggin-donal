// 320x200 4-color indexed framebuffer emulating the CGA graphics layer of the
// original (grafix asm / *_vid.c in Digger Remastered). Sprite data is CGA
// 2bpp: 4 pixels per byte, most significant bits = leftmost pixel.

export const WIDTH = 320;
export const HEIGHT = 200;

// CGA palettes: [palette][intensity][color index] → CSS color.
// Palette 1 = cyan/magenta/white (the Digger look), palette 0 = green/red/yellow.
const CGA_PALETTES: string[][][] = [
  [
    ['#000000', '#00aa00', '#aa0000', '#aa5500'],
    ['#000000', '#55ff55', '#ff5555', '#ffff55'],
  ],
  [
    ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa'],
    ['#000000', '#55ffff', '#ff55ff', '#ffffff'],
  ],
];

const vbuf = new Uint8Array(WIDTH * HEIGHT); // color index 0..3 per pixel
let palette = 0;
let intensity = 0;
let rgba = new Uint32Array(4);
let paletteDirty = true;

function computeRgba(): void {
  const cols = CGA_PALETTES[palette][intensity];
  for (let c = 0; c < 4; c++) {
    const v = parseInt(cols[c].slice(1), 16);
    // little-endian RGBA word: alpha | blue | green | red
    rgba[c] = (0xff << 24) | ((v & 0xff) << 16) | (v & 0xff00) | (v >>> 16);
  }
}

// gpal(): palette 0 = the classic game look (green/red/brown), palette 1 =
// cyan/magenta/white (high-score flash). ginten(): 1 = bright variants
// (bonus-mode flicker).
export function setPalette(pal: number): void {
  palette = pal & 1;
  paletteDirty = true;
}

export function setIntensity(inten: number): void {
  intensity = inten & 1;
  paletteDirty = true;
}

export function clearScreen(): void {
  vbuf.fill(0);
}

// gputim: masked blit of CGA 2bpp data. wBytes is width in bytes (4 px each).
// dest = (dest & mask) | data, clipped to screen.
export function putImage(
  x: number,
  y: number,
  data: Uint8Array,
  mask: Uint8Array,
  wBytes: number,
  h: number
): void {
  for (let row = 0; row < h; row++) {
    const py = y + row;
    if (py < 0 || py >= HEIGHT) continue;
    for (let bx = 0; bx < wBytes; bx++) {
      const d = data[row * wBytes + bx];
      const m = mask[row * wBytes + bx];
      for (let p = 0; p < 4; p++) {
        const px = x + bx * 4 + p;
        if (px < 0 || px >= WIDTH) continue;
        const shift = 6 - p * 2;
        const i = py * WIDTH + px;
        vbuf[i] = (vbuf[i] & ((m >> shift) & 3)) | ((d >> shift) & 3);
      }
    }
  }
}

// ggeti: save a wBytes*4 x h region into buf (unpacked, 1 byte per pixel).
export function getImage(x: number, y: number, buf: Uint8Array, wBytes: number, h: number): void {
  const w = wBytes * 4;
  for (let row = 0; row < h; row++) {
    const py = y + row;
    for (let px = 0; px < w; px++) {
      const sx = x + px;
      buf[row * w + px] =
        py >= 0 && py < HEIGHT && sx >= 0 && sx < WIDTH ? vbuf[py * WIDTH + sx] : 0;
    }
  }
}

// gputi: restore a region saved by getImage (opaque, no mask).
export function putImageRaw(x: number, y: number, buf: Uint8Array, wBytes: number, h: number): void {
  const w = wBytes * 4;
  for (let row = 0; row < h; row++) {
    const py = y + row;
    if (py < 0 || py >= HEIGHT) continue;
    for (let px = 0; px < w; px++) {
      const sx = x + px;
      if (sx < 0 || sx >= WIDTH) continue;
      vbuf[py * WIDTH + sx] = buf[row * w + px];
    }
  }
}

// ggetpix: read one pixel's color index (used for bullet collision with dirt).
export function getPixel(x: number, y: number): number {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return 0;
  return vbuf[y * WIDTH + x];
}

// Splash overlay: a non-destructive layer composited at render time.
// overlayBuf holds a color index per pixel (0xff = transparent); the dim
// rect darkens the game behind the splash panel by half.
export const overlayBuf = new Uint8Array(WIDTH * HEIGHT).fill(0xff);
let overlayActive = false;
let dimRect: { x0: number; y0: number; x1: number; y1: number } | null = null;

export function setOverlay(active: boolean): void {
  overlayActive = active;
  if (!active) {
    overlayBuf.fill(0xff);
    dimRect = null;
  }
}

export function setOverlayDim(x0: number, y0: number, x1: number, y1: number): void {
  dimRect = { x0, y0, x1, y1 };
}

let ctx: CanvasRenderingContext2D;
let imageData: ImageData;
let pixels: Uint32Array;

export function initScreen(canvas: HTMLCanvasElement): void {
  ctx = canvas.getContext('2d')!;
  imageData = ctx.createImageData(WIDTH, HEIGHT);
  pixels = new Uint32Array(imageData.data.buffer);
  computeRgba();
}

// Render the indexed framebuffer to the canvas (called from rAF).
export function render(): void {
  if (paletteDirty) {
    computeRgba();
    paletteDirty = false;
  }
  if (!overlayActive) {
    for (let i = 0; i < vbuf.length; i++) pixels[i] = rgba[vbuf[i]];
  } else {
    for (let i = 0; i < vbuf.length; i++) {
      let p = rgba[vbuf[i]];
      if (dimRect) {
        const x = i % WIDTH;
        const y = (i / WIDTH) | 0;
        if (x >= dimRect.x0 && x < dimRect.x1 && y >= dimRect.y0 && y < dimRect.y1)
          p = (0xff << 24) | ((p >> 1) & 0x7f7f7f); // 50% toward black
      }
      const o = overlayBuf[i];
      if (o !== 0xff) p = rgba[o];
      pixels[i] = p;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

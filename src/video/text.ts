// Bitmap text rendering (gwrite/outtext): 12x12 glyphs, 3 bytes per row CGA
// 2bpp, recolored to the requested color index at draw time.
// Derived from Digger Remastered (alpha.c / *_vid.c gwrite).
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { cgaFont } from '../assets/font';
import { HEIGHT, WIDTH, getPixel } from './screen';

const CHR_W = 3; // bytes (12 pixels)
const CHR_H = 12;

import * as screen from './screen';

export function gwrite(x: number, y: number, ch: string, c: number): void {
  const code = ch.charCodeAt(0);
  if (code - 32 < 0 || code - 32 >= 0x5f) return;
  const glyph = cgaFont[code - 32] ?? cgaFont[0]!;
  // Opaque blit: glyph pixels are 0 or 3; nonzero pixels take color c.
  const data = new Uint8Array(CHR_W * 4 * CHR_H);
  for (let row = 0; row < CHR_H; row++)
    for (let bx = 0; bx < CHR_W; bx++) {
      const b = glyph[row * CHR_W + bx];
      for (let p = 0; p < 4; p++) {
        const v = (b >> (6 - p * 2)) & 3;
        data[row * CHR_W * 4 + bx * 4 + p] = v === 0 ? 0 : c;
      }
    }
  screen.putImageRaw(x, y, data, CHR_W, CHR_H);
}

export function outtext(p: string, x: number, y: number, c: number): void {
  for (const ch of p) {
    gwrite(x, y, /[a-zA-Z0-9]/.test(ch) ? ch : ' ', c);
    x += 12;
  }
}

// Integer-scaled glyph rendering for the title logo.
export function gwriteScaled(x: number, y: number, ch: string, c: number, s: number): void {
  const code = ch.charCodeAt(0);
  if (code - 32 < 0 || code - 32 >= 0x5f) return;
  const glyph = cgaFont[code - 32] ?? cgaFont[0]!;
  const w = CHR_W * 4 * s;
  const data = new Uint8Array(w * CHR_H * s);
  for (let row = 0; row < CHR_H; row++)
    for (let bx = 0; bx < CHR_W; bx++) {
      const b = glyph[row * CHR_W + bx];
      for (let p = 0; p < 4; p++) {
        const v = (b >> (6 - p * 2)) & 3;
        const col = v === 0 ? 0 : c;
        for (let sy = 0; sy < s; sy++)
          for (let sx = 0; sx < s; sx++)
            data[(row * s + sy) * w + (bx * 4 + p) * s + sx] = col;
      }
    }
  screen.putImageRaw(x, y, data, CHR_W * s, CHR_H * s);
}

export function outtextScaled(p: string, x: number, y: number, c: number, s: number): void {
  for (const ch of p) {
    gwriteScaled(x, y, /[a-zA-Z0-9]/.test(ch) ? ch : ' ', c, s);
    x += 12 * s;
  }
}

// --- Splash overlay text: draws into the overlay layer (non-destructive,
// letter pixels only — the dimmed game stays visible between strokes).

function overlayGlyph(x: number, y: number, ch: string, c: number, s: number, erase: boolean): void {
  const code = ch.charCodeAt(0);
  if (code - 32 < 0 || code - 32 >= 0x5f) return;
  const glyph = cgaFont[code - 32] ?? cgaFont[0]!;
  for (let row = 0; row < CHR_H; row++)
    for (let bx = 0; bx < CHR_W; bx++) {
      const b = glyph[row * CHR_W + bx];
      for (let p = 0; p < 4; p++) {
        const v = (b >> (6 - p * 2)) & 3;
        if (v === 0 && !erase) continue;
        for (let sy = 0; sy < s; sy++)
          for (let sx = 0; sx < s; sx++) {
            const px = x + (bx * 4 + p) * s + sx;
            const py = y + row * s + sy;
            if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
            screen.overlayBuf[py * WIDTH + px] = erase ? 0xff : c;
          }
      }
    }
}

export function overlayText(p: string, x: number, y: number, c: number, s = 1): void {
  for (const ch of p) {
    overlayGlyph(x, y, /[a-zA-Z0-9]/.test(ch) ? ch : ' ', c, s, false);
    x += 12 * s;
  }
}

export function overlayTextClear(p: string, x: number, y: number, s = 1): void {
  for (const ch of p) {
    overlayGlyph(x, y, /[a-zA-Z0-9]/.test(ch) ? ch : ' ', 0, s, true);
    x += 12 * s;
  }
}

// Half-size (6x6) overlay text for fine print: samples every other pixel of
// the 12x12 glyphs.
export function overlayTextSmall(p: string, x: number, y: number, c: number): void {
  for (const ch of p) {
    const code = (/[a-zA-Z0-9]/.test(ch) ? ch : ' ').charCodeAt(0);
    if (code - 32 >= 0 && code - 32 < 0x5f) {
      const glyph = cgaFont[code - 32] ?? cgaFont[0]!;
      for (let row = 0; row < CHR_H; row += 2)
        for (let bx = 0; bx < CHR_W; bx++) {
          const b = glyph[row * CHR_W + bx];
          for (let p2 = 0; p2 < 4; p2 += 2) {
            const v = (b >> (6 - p2 * 2)) & 3;
            if (v === 0) continue;
            const px = x + ((bx * 4 + p2) >> 1);
            const py = y + (row >> 1);
            if (px < 0 || px >= WIDTH || py < 0 || py >= HEIGHT) continue;
            screen.overlayBuf[py * WIDTH + px] = c;
          }
        }
    }
    x += 6;
  }
}

export { WIDTH, HEIGHT, getPixel };

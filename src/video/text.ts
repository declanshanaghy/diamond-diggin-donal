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

export { WIDTH, HEIGHT, getPixel };

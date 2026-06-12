// Donal-izes the digger sprites: the original's magenta body becomes
// silver-white on top (Donal's white hair) and cyan below (his light-blue
// shirt), per the photo likeness. Wheels, antenna, and the digging scoop
// keep their original colors. Applied in place to the decoded CGA data at
// boot; sprite dimensions and animation timing are untouched.

import { cgaSprites } from './sprites';

const FIRST_DIGGER_FRAME = 1; // walk/fire frames 1..24, death 25..30
const LAST_DIGGER_FRAME = 30;
const HAIR_SPLIT_ROW = 9; // body pixels above this row turn white, below cyan
const W_BYTES = 4; // all digger frames are 16x15 (4 CGA bytes per row)

export function donalize(): void {
  for (let idx = FIRST_DIGGER_FRAME; idx <= LAST_DIGGER_FRAME; idx++) {
    const data = cgaSprites[idx].data;
    for (let i = 0; i < data.length; i++) {
      const row = Math.floor(i / W_BYTES);
      let b = data[i];
      for (let p = 0; p < 4; p++) {
        const shift = 6 - p * 2;
        if (((b >> shift) & 3) === 2) {
          const v = row < HAIR_SPLIT_ROW ? 3 : 1;
          b = (b & ~(3 << shift)) | (v << shift);
        }
      }
      data[i] = b;
    }
  }
}

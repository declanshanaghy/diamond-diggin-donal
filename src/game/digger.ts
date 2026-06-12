// Player (Donal) logic. STUB — the faithful port of digger.c lands in the
// player chunk; these signatures let the main loop run meanwhile.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

import { MHEIGHT, MWIDTH } from '../def';
import { drawemerald } from '../drawing';
import { getlevch, levplan } from './level';

const emfield = new Int8Array(MWIDTH * MHEIGHT);

export function makeemfield(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      emfield[y * MWIDTH + x] = getlevch(x, y, levplan()) === 'C' ? 1 : 0;
}

export function drawemeralds(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      if (emfield[y * MWIDTH + x] === 1) drawemerald(x * 20 + 12, y * 18 + 21);
}

export function countem(): number {
  let n = 0;
  for (let i = 0; i < MWIDTH * MHEIGHT; i++) if (emfield[i] === 1) n++;
  return n;
}

export function initdigger(): void {}
export function dodigger(): void {}
export function erasediggers(): void {}
export function digalive(_n: number): boolean {
  return true;
}
export function isalive(): boolean {
  return true;
}
export function killfire(_n: number): void {}
export function erasebonus(): void {}

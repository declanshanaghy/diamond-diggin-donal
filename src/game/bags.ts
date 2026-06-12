// Gold bag physics. STUB — the faithful port of bags.c lands in the bags
// chunk; these signatures let the main loop run meanwhile.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

import { BAGS, MHEIGHT, MWIDTH } from '../def';
import { drawgold } from '../drawing';
import { getlevch, levplan } from './level';

interface Bag {
  x: number;
  y: number;
  exist: boolean;
}

const bags: Bag[] = [];

export function initbags(): void {
  bags.length = 0;
  for (let y = 0; y < MHEIGHT; y++)
    for (let x = 0; x < MWIDTH; x++)
      if (getlevch(x, y, levplan()) === 'B' && bags.length < BAGS)
        bags.push({ x: x * 20 + 12, y: y * 18 + 18, exist: true });
}

export function drawbags(): void {
  bags.forEach((b, i) => {
    if (b.exist) drawgold(i, 0, b.x, b.y);
  });
}

export function dobags(): void {}
export function getnmovingbags(): number {
  return 0;
}
export function cleanupbags(): void {}
export function bagexist(_n: number): boolean {
  return false;
}
export function pushbags(_dir: number, _clfirst: number[], _clcoll: number[]): boolean {
  return true;
}
export function pushudbags(_clfirst: number[], _clcoll: number[]): boolean {
  return true;
}
export function bagy(_n: number): number {
  return 0;
}
export function getbagdir(_n: number): number {
  return -1;
}

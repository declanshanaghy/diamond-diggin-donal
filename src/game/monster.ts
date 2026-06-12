// Monster (Nobbin/Hobbin) logic. STUB — the faithful port of monster.c lands
// in the monster chunk; these signatures let the main loop run meanwhile.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

export function initmonsters(): void {}
export function domonsters(): void {}
export function erasemonsters(): void {}
export function monleft(): number {
  return 1;
}
export function incmont(_n: number): void {}
export function killmon(_n: number): void {}
export function killmonsters(_clfirst: number[], _clcoll: number[]): number {
  return 0;
}

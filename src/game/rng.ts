// The game's LCG, ported from main.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

let randv = 0;

export function seedrand(v: number): void {
  randv = v | 0;
}

export function randno(n: number): number {
  randv = (Math.imul(randv, 0x15a4e35) + 1) | 0;
  return (randv & 0x7fffffff) % n;
}

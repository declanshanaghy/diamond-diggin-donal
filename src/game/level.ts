// Level plan access, ported from main.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { levelData } from '../assets/levels';
import { game, levno } from './state';

// Which of the 8 layouts a given game level uses: 1-8 literal, then cycles
// "678, 5678, 5678, ..." (comment in main.c: l>8 → (l&3)+5).
export function levplan(): number {
  const l = levno();
  if (l > 8) return (l & 3) + 5;
  return l;
}

// Splash demo plays a randomly generated layout instead of a real level.
let demoLevel: string[][] | null = null;

export function setDemoLevel(level: string[][] | null): void {
  demoLevel = level;
}

export function getlevch(x: number, y: number, l: number): string {
  if (demoLevel) return demoLevel[y][x];
  // Two-digger mode opens extra tunnels on levels 3/4; not used (diggers=1).
  if ((l === 3 || l === 4) && !game.levfflag && game.diggers === 2 && y === 9 && (x === 6 || x === 8))
    return 'H';
  return levelData[l - 1][y][x];
}

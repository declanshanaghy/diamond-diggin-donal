// Scoring and lives. Minimal implementation for the game flow; the faithful
// port of scores.c (score table, name entry, localStorage) lands in the
// scores chunk.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

import { outtext } from '../video/text';
import { game } from './state';

export function loadscores(): void {}

export function initlives(): void {
  for (const p of game.players) p.lives = 3;
}

export function zeroscores(): void {
  for (const p of game.players) p.score = 0;
}

export function initscores(): void {
  drawscores();
}

export function drawscores(): void {
  writecurscore(3);
}

export function writecurscore(c: number): void {
  const s = game.players[game.curplayer].score;
  outtext(s === 0 ? '00000' : String(s).padStart(5, ' '), 0, 0, c);
}

export function addscore(_n: number, score: number): void {
  game.players[game.curplayer].score += score;
  drawscores();
}

export function declife(pl: number): void {
  if (!game.unlimlives) game.players[pl].lives--;
}

export function endofgame(): void {}

export function showtable(): void {}

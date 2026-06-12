// Scoring, ported from scores.c of Digger Remastered. The high-score table,
// name entry, and persistence land in the scores chunk; in-game scoring below
// is already faithful.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { gwrite, outtext } from '../video/text';
import { game } from './state';
import { getlives, addlife } from './digger';
import { drawlives } from '../drawing';
import { incpenalty } from '../sound/sound';

interface ScoreData {
  score: number;
  nextbs: number;
}

const scdat: ScoreData[] = [
  { score: 0, nextbs: 0 },
  { score: 0, nextbs: 0 },
];

const bonusscore = 20000;

export function writenum(n: number, x: number, y: number, w: number, c: number): void {
  let xp = (w - 1) * 12 + x;
  while (w > 0) {
    const d = n % 10;
    if (w > 1 || d > 0) gwrite(xp, y, String.fromCharCode(d + 48), c);
    n = Math.floor(n / 10);
    w--;
    xp -= 12;
  }
}

export function initscores(): void {
  for (let i = 0; i < game.diggers; i++) addscore(i, 0);
}

export function loadscores(): void {
  // High-score table persistence lands with the scores chunk.
}

export function zeroscores(): void {
  scdat[0].score = scdat[1].score = 0;
  scdat[0].nextbs = scdat[1].nextbs = bonusscore;
}

export function writecurscore(col: number): void {
  if (game.curplayer === 0) writenum(scdat[0].score, 0, 0, 6, col);
}

export function drawscores(): void {
  writenum(scdat[0].score, 0, 0, 6, 3);
}

export function addscore(n: number, score: number): void {
  scdat[n].score += score;
  if (scdat[n].score > 999999) scdat[n].score = 0;
  if (n === 0) writenum(scdat[n].score, 0, 0, 6, 1);
  if (scdat[n].score >= scdat[n].nextbs + n) {
    // +n to reproduce original bug
    if (getlives(n) < 5 || game.unlimlives) {
      addlife(n);
      drawlives();
    }
    scdat[n].nextbs += bonusscore;
  }
  incpenalty();
  incpenalty();
  incpenalty();
}

export function scorekill(n: number): void {
  addscore(n, 250);
}

export function scoreemerald(n: number): void {
  addscore(n, 25);
}

export function scoreoctave(n: number): void {
  addscore(n, 250);
}

export function scoregold(n: number): void {
  addscore(n, 500);
}

export function scorebonus(n: number): void {
  addscore(n, 1000);
}

export function scoreeatm(n: number, msc: number): void {
  addscore(n, msc * 200);
}

export function getscore0(): number {
  return scdat[0].score;
}

export function endofgame(): void {
  for (let i = 0; i < game.diggers; i++) addscore(i, 0);
  outtext('GAME OVER', 104, 0, 3);
}

export function showtable(): void {}

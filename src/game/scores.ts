// Scoring, ported from scores.c of Digger Remastered. The high-score table,
// name entry, and persistence land in the scores chunk; in-game scoring below
// is already faithful.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { gwrite, outtext } from '../video/text';
import { game } from './state';
import { getlives, addlife } from './digger';
import { drawlives } from '../drawing';
import { incpenalty, killsound, setupsound } from '../sound/sound';
import { clearScreen, setPalette, setIntensity } from '../video/screen';
import { input, kbhit, getkey, focusInitials, blurInitials } from '../input';

interface ScoreData {
  score: number;
  nextbs: number;
}

const scdat: ScoreData[] = [
  { score: 0, nextbs: 0 },
  { score: 0, nextbs: 0 },
];

const bonusscore = 20000;

// High-score table. Indexing mirrors the C source: display rows are
// scoreinit[1..10] paired with scorehigh[2..11]; slot 0 is the entry buffer.
const scorehigh = new Array<number>(12).fill(0);
const scoreinit: string[] = Array.from({ length: 11 }, () => '...');
let scoret = 0;

const STORAGE_KEY = 'diamond-diggin-donal.scores';

function numtostring(n: number): string {
  return String(n).padStart(6, ' ').slice(-6);
}

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
  let loaded = false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as { initials: string[]; scores: number[] };
      for (let i = 1; i < 11; i++) {
        scoreinit[i] = data.initials[i - 1] ?? '...';
        scorehigh[i + 1] = data.scores[i - 1] ?? 0;
      }
      loaded = true;
    }
  } catch {
    // corrupted storage falls through to defaults
  }
  if (!loaded)
    for (let i = 0; i < 11; i++) {
      scorehigh[i + 1] = 0;
      if (i < 11) scoreinit[i] = '...';
    }
}

function savescores(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        initials: scoreinit.slice(1, 11),
        scores: scorehigh.slice(2, 12),
      })
    );
  } catch {
    // storage unavailable (private browsing etc.) — table lives for the session
  }
}

function shufflehigh(): void {
  let j: number;
  for (j = 10; j > 1; j--) if (scoret < scorehigh[j]) break;
  for (let i = 10; i > j; i--) {
    scorehigh[i + 1] = scorehigh[i];
    scoreinit[i] = scoreinit[i - 1];
  }
  scorehigh[j + 1] = scoret;
  scoreinit[j] = scoreinit[0];
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

function cleartopline(): void {
  outtext('                          ', 0, 0, 3);
  outtext(' ', 308, 0, 3);
}

// Palette flash used during high-score celebration (flashywait of scores.c —
// the DOS busy-loop becomes one frame per toggle).
let flashp = 0;
function flashywait(): void {
  flashp = 1 - flashp;
  setPalette(flashp);
}

// getinitial of scores.c: blink the cursor until a key arrives. First loop
// accepts only alphanumerics, second any key (so backspace works).
function* getinitial(x: number, y: number): Generator<void, string, void> {
  gwrite(x, y, '_', 3);
  do {
    for (let i = 0; i < 8; i++) {
      if (kbhit()) {
        const key = getkey();
        if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) return key;
        if (key === 'Backspace' || key === 'Delete') return key;
        continue;
      }
      yield;
    }
    gwrite(x, y, ' ', 3);
    for (let i = 0; i < 8; i++) {
      if (kbhit()) {
        gwrite(x, y, '_', 3);
        const key = getkey();
        if ((key.length === 1 && /[a-zA-Z0-9]/.test(key)) || key === 'Backspace' || key === 'Delete')
          return key;
        break;
      }
      yield;
    }
    gwrite(x, y, '_', 3);
  } while (true);
}

function* getinitials(): Generator<void, void, void> {
  input.captureRaw = true;
  focusInitials(); // summon the OS keyboard on mobile
  yield;
  outtext('ENTER YOUR', 100, 70, 3);
  outtext(' INITIALS', 100, 90, 3);
  outtext('_ _ _', 128, 130, 3);
  const init = ['.', '.', '.'];
  killsound();
  for (let i = 0; i < 3; i++) {
    let k = '';
    while (k === '') {
      k = yield* getinitial(i * 24 + 128, 130);
      if (k === 'Backspace' || k === 'Delete') {
        if (i > 0) {
          gwrite(i * 24 + 128, 130, '_', 3);
          i--;
        }
        k = '';
      }
    }
    gwrite(i * 24 + 128, 130, k, 3);
    init[i] = k;
  }
  scoreinit[0] = init.join('');
  for (let i = 0; i < 20; i++) {
    flashywait();
    yield;
  }
  setPalette(0);
  setupsound();
  clearScreen();
  setIntensity(0);
  blurInitials(); // dismiss the OS keyboard
  input.captureRaw = false;
}

export function* endofgame(): Generator<void, void, void> {
  let initflag = false;
  for (let i = 0; i < game.diggers; i++) addscore(i, 0);
  for (let i = game.curplayer; i < game.curplayer + game.diggers; i++) {
    scoret = scdat[i].score;
    if (scoret > scorehigh[11]) {
      clearScreen();
      drawscores();
      outtext('PLAYER 1', 108, 0, 2);
      outtext(' NEW HIGH SCORE ', 64, 40, 2);
      yield* getinitials();
      shufflehigh();
      savescores();
      initflag = true;
    }
  }
  if (!initflag && !game.gauntlet) {
    cleartopline();
    outtext('GAME OVER', 104, 0, 3);
    for (let i = 0; i < 50 && !input.escape; i++) yield;
    outtext('         ', 104, 0, 3);
  }
}

export function showtable(): void {
  outtext('HIGH SCORES', 16, 25, 3);
  let col = 2;
  for (let i = 1; i < 11; i++) {
    outtext(`${scoreinit[i]}  ${numtostring(scorehigh[i + 1])}`, 16, 31 + 13 * i, col);
    col = 1;
  }
}

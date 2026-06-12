// Field and mid-level drawing, ported from drawing.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).
//
// field[] holds one 16-bit mask per tile: bits 0-4 horizontal dug columns,
// bits 6-11 vertical dug rows, bit 13 "tile untouched". Blob sprites (102-107)
// have all-zero data and shaped masks: they punch tunnel shapes out of dirt.

import {
  BAGS,
  MONSTERS,
  DIGGERS,
  FIREBALLS,
  MWIDTH,
  MHEIGHT,
  MSIZE,
  FIRSTBAG,
  FIRSTMONSTER,
  FIRSTBONUS,
  LASTBONUS,
  FIRSTFIREBALL,
  LASTFIREBALL,
  FIRSTDIGGER,
  LASTDIGGER,
  DIR_RIGHT,
  DIR_UP,
  DIR_LEFT,
  DIR_DOWN,
} from './def';
import {
  createspr,
  initspr,
  initmiscspr,
  drawmiscspr,
  drawspr,
  movedrawspr,
  getis,
  first,
} from './sprite';
import { setPalette, setIntensity } from './video/screen';
import { outtext } from './video/text';
import { game } from './game/state';
import { getlives } from './game/digger';
import { levplan, getlevch } from './game/level';
import { incpenalty } from './sound/sound';

export const field1 = new Int16Array(MSIZE);
export const field2 = new Int16Array(MSIZE);
export const field = new Int16Array(MSIZE);

const bitmasks = [
  0xfffe, 0xfffd, 0xfffb, 0xfff7, 0xffef, 0xffdf, 0xffbf, 0xff7f, 0xfeff, 0xfdff, 0xfbff, 0xf7ff,
];

const monspr = new Int16Array(MONSTERS);
const monspd = new Int16Array(MONSTERS);
const digspr = new Int16Array(DIGGERS);
const digspd = new Int16Array(DIGGERS);
const firespr = new Int16Array(FIREBALLS);

export function makefield(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++) {
      field[y * MWIDTH + x] = -1;
      const c = getlevch(x, y, levplan());
      if (c === 'S' || c === 'V') field[y * MWIDTH + x] &= 0xd03f;
      if (c === 'S' || c === 'H') field[y * MWIDTH + x] &= 0xdfe0;
      if (game.curplayer === 0) field1[y * MWIDTH + x] = field[y * MWIDTH + x];
      else field2[y * MWIDTH + x] = field[y * MWIDTH + x];
    }
}

export function drawstatics(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      field[y * MWIDTH + x] =
        game.curplayer === 0 ? field1[y * MWIDTH + x] : field2[y * MWIDTH + x];
  setPalette(0);
  setIntensity(0);
  drawbackg(levplan());
  drawfield();
}

export function savefield(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      if (game.curplayer === 0) field1[y * MWIDTH + x] = field[y * MWIDTH + x];
      else field2[y * MWIDTH + x] = field[y * MWIDTH + x];
}

export function drawfield(): void {
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      if ((field[y * MWIDTH + x] & 0x2000) === 0) {
        const xp = x * 20 + 12;
        const yp = y * 18 + 18;
        if ((field[y * MWIDTH + x] & 0xfc0) !== 0xfc0) {
          field[y * MWIDTH + x] &= 0xd03f;
          drawbottomblob(xp, yp - 15);
          drawbottomblob(xp, yp - 12);
          drawbottomblob(xp, yp - 9);
          drawbottomblob(xp, yp - 6);
          drawbottomblob(xp, yp - 3);
          drawtopblob(xp, yp + 3);
        }
        if ((field[y * MWIDTH + x] & 0x1f) !== 0x1f) {
          field[y * MWIDTH + x] &= 0xdfe0;
          drawrightblob(xp - 16, yp);
          drawrightblob(xp - 12, yp);
          drawrightblob(xp - 8, yp);
          drawrightblob(xp - 4, yp);
          drawleftblob(xp + 4, yp);
        }
        if (x < 14) if ((field[y * MWIDTH + x + 1] & 0xfdf) !== 0xfdf) drawrightblob(xp, yp);
        if (y < 9) if ((field[(y + 1) * MWIDTH + x] & 0xfdf) !== 0xfdf) drawbottomblob(xp, yp);
      }
}

export function eatfield(x: number, y: number, dir: number): void {
  const h0 = Math.floor((x - 12) / 20);
  const xr = Math.floor(((x - 12) % 20) / 4);
  const v0 = Math.floor((y - 18) / 18);
  let yr = Math.floor(((y - 18) % 18) / 3);
  let h = h0;
  let v = v0;
  incpenalty();
  switch (dir) {
    case DIR_RIGHT:
      h++;
      field[v * MWIDTH + h] &= bitmasks[xr];
      if (field[v * MWIDTH + h] & 0x1f) break;
      field[v * MWIDTH + h] &= 0xdfff;
      break;
    case DIR_UP:
      yr--;
      if (yr < 0) {
        yr += 6;
        v--;
      }
      field[v * MWIDTH + h] &= bitmasks[6 + yr];
      if (field[v * MWIDTH + h] & 0xfc0) break;
      field[v * MWIDTH + h] &= 0xdfff;
      break;
    case DIR_LEFT: {
      let xl = xr - 1;
      if (xl < 0) {
        xl += 5;
        h--;
      }
      field[v * MWIDTH + h] &= bitmasks[xl];
      if (field[v * MWIDTH + h] & 0x1f) break;
      field[v * MWIDTH + h] &= 0xdfff;
      break;
    }
    case DIR_DOWN:
      v++;
      field[v * MWIDTH + h] &= bitmasks[6 + yr];
      if (field[v * MWIDTH + h] & 0xfc0) break;
      field[v * MWIDTH + h] &= 0xdfff;
  }
}

export function creatembspr(): void {
  for (let i = 0; i < BAGS; i++) createspr(FIRSTBAG + i, 62, 4, 15, 0, 0);
  for (let i = 0; i < MONSTERS; i++) createspr(FIRSTMONSTER + i, 71, 4, 15, 0, 0);
  createdbfspr();
  for (let i = 0; i < MONSTERS; i++) {
    monspr[i] = 0;
    monspd[i] = 1;
  }
}

export function initmbspr(): void {
  for (let i = 0; i < BAGS; i++) initspr(FIRSTBAG + i, 62, 4, 15, 0, 0);
  for (let i = 0; i < MONSTERS; i++) initspr(FIRSTMONSTER + i, 71, 4, 15, 0, 0);
  initdbfspr();
}

export function drawmon(n: number, nobf: boolean, dir: number, x: number, y: number): void {
  monspr[n] += monspd[n];
  if (monspr[n] === 2 || monspr[n] === 0) monspd[n] = -monspd[n];
  if (monspr[n] > 2) monspr[n] = 2;
  if (monspr[n] < 0) monspr[n] = 0;
  if (nobf) initspr(FIRSTMONSTER + n, monspr[n] + 69, 4, 15, 0, 0);
  else
    switch (dir) {
      case DIR_RIGHT:
        initspr(FIRSTMONSTER + n, monspr[n] + 73, 4, 15, 0, 0);
        break;
      case DIR_LEFT:
        initspr(FIRSTMONSTER + n, monspr[n] + 77, 4, 15, 0, 0);
    }
  drawspr(FIRSTMONSTER + n, x, y);
}

export function drawmondie(n: number, nobf: boolean, dir: number, x: number, y: number): void {
  if (nobf) initspr(FIRSTMONSTER + n, 72, 4, 15, 0, 0);
  else
    switch (dir) {
      case DIR_RIGHT:
        initspr(FIRSTMONSTER + n, 76, 4, 15, 0, 0);
        break;
      case DIR_LEFT:
        initspr(FIRSTMONSTER + n, 80, 4, 14, 0, 0);
    }
  drawspr(FIRSTMONSTER + n, x, y);
}

export function drawgold(n: number, t: number, x: number, y: number): void {
  initspr(FIRSTBAG + n, t + 62, 4, 15, 0, 0);
  drawspr(FIRSTBAG + n, x, y);
}

export function drawlife(t: number, x: number, y: number): void {
  drawmiscspr(x, y, t + 110, 4, 12);
}

export function drawemerald(x: number, y: number): void {
  initmiscspr(x, y, 4, 10);
  drawmiscspr(x, y, 108, 4, 10);
  getis();
}

export function eraseemerald(x: number, y: number): void {
  initmiscspr(x, y, 4, 10);
  drawmiscspr(x, y, 109, 4, 10);
  getis();
}

export function createdbfspr(): void {
  for (let i = 0; i < DIGGERS; i++) {
    digspd[i] = 1;
    digspr[i] = 0;
  }
  for (let i = 0; i < FIREBALLS; i++) firespr[i] = 0;
  for (let i = FIRSTDIGGER; i < LASTDIGGER; i++) createspr(i, 0, 4, 15, 0, 0);
  for (let i = FIRSTBONUS; i < LASTBONUS; i++) createspr(i, 81, 4, 15, 0, 0);
  for (let i = FIRSTFIREBALL; i < LASTFIREBALL; i++) createspr(i, 82, 2, 8, 0, 0);
}

export function initdbfspr(): void {
  for (let i = 0; i < DIGGERS; i++) {
    digspd[i] = 1;
    digspr[i] = 0;
  }
  for (let i = 0; i < FIREBALLS; i++) firespr[i] = 0;
  for (let i = FIRSTDIGGER; i < LASTDIGGER; i++) initspr(i, 0, 4, 15, 0, 0);
  for (let i = FIRSTBONUS; i < LASTBONUS; i++) initspr(i, 81, 4, 15, 0, 0);
  for (let i = FIRSTFIREBALL; i < LASTFIREBALL; i++) initspr(i, 82, 2, 8, 0, 0);
}

export function drawrightblob(x: number, y: number): void {
  initmiscspr(x + 16, y - 1, 2, 18);
  drawmiscspr(x + 16, y - 1, 102, 2, 18);
  getis();
}

export function drawleftblob(x: number, y: number): void {
  initmiscspr(x - 8, y - 1, 2, 18);
  drawmiscspr(x - 8, y - 1, 104, 2, 18);
  getis();
}

export function drawtopblob(x: number, y: number): void {
  initmiscspr(x - 4, y - 6, 6, 6);
  drawmiscspr(x - 4, y - 6, 103, 6, 6);
  getis();
}

export function drawbottomblob(x: number, y: number): void {
  initmiscspr(x - 4, y + 15, 6, 6);
  drawmiscspr(x - 4, y + 15, 105, 6, 6);
  getis();
}

export function drawfurryblob(x: number, y: number): void {
  initmiscspr(x - 4, y + 15, 6, 8);
  drawmiscspr(x - 4, y + 15, 107, 6, 8);
  getis();
}

export function drawsquareblob(x: number, y: number): void {
  initmiscspr(x - 4, y + 17, 6, 6);
  drawmiscspr(x - 4, y + 17, 106, 6, 6);
  getis();
}

export function drawbackg(l: number): void {
  for (let y = 14; y < 200; y += 4)
    for (let x = 0; x < 320; x += 20) drawmiscspr(x, y, 93 + l, 5, 4);
}

export function drawfire(n: number, x: number, y: number, t: number): void {
  const nn = n === 0 ? 0 : 32;
  if (t === 0) {
    firespr[n]++;
    if (firespr[n] > 2) firespr[n] = 0;
    initspr(FIRSTFIREBALL + n, 82 + firespr[n] + nn, 2, 8, 0, 0);
  } else initspr(FIRSTFIREBALL + n, 84 + t + nn, 2, 8, 0, 0);
  drawspr(FIRSTFIREBALL + n, x, y);
}

export function drawbonus(x: number, y: number): void {
  initspr(FIRSTBONUS, 81, 4, 15, 0, 0);
  movedrawspr(FIRSTBONUS, x, y);
}

export function drawdigger(n: number, t: number, x: number, y: number, f: boolean): void {
  const nn = n === 0 ? 0 : 31;
  digspr[n] += digspd[n];
  if (digspr[n] === 2 || digspr[n] === 0) digspd[n] = -digspd[n];
  if (digspr[n] > 2) digspr[n] = 2;
  if (digspr[n] < 0) digspr[n] = 0;
  if (t >= 0 && t <= 6 && !(t & 1)) {
    initspr(FIRSTDIGGER + n, (t + (f ? 0 : 1)) * 3 + digspr[n] + 1 + nn, 4, 15, 0, 0);
    drawspr(FIRSTDIGGER + n, x, y);
    return;
  }
  if (t >= 10 && t <= 15) {
    initspr(FIRSTDIGGER + n, 40 + nn - t, 4, 15, 0, 0);
    drawspr(FIRSTDIGGER + n, x, y);
    return;
  }
  first[0] = first[1] = first[2] = first[3] = first[4] = -1;
}

export function drawlives(): void {
  let n = getlives(0) - 1;
  outtext('     ', 96, 0, 2);
  if (n > 4) {
    drawlife(0, 80, 0);
    outtext(`X${n}`, 100, 0, 2);
  } else
    for (let l = 1; l < 5; l++) {
      drawlife(n > 0 ? 0 : 2, l * 20 + 60, 0);
      n--;
    }
}

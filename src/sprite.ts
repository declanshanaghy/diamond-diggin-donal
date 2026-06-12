// Software sprite engine ported from sprite.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).
//
// Sprites save the background under them (sprmov buffers) and are redrawn
// with overlap resolution: any sprites whose rectangles touch the moved
// sprite get their backgrounds restored and are re-blitted.

import {
  SPRITES,
  TYPES,
  FIRSTBONUS,
  LASTBONUS,
  FIRSTBAG,
  LASTBAG,
  FIRSTMONSTER,
  LASTMONSTER,
  FIRSTFIREBALL,
  LASTFIREBALL,
  FIRSTDIGGER,
  LASTDIGGER,
} from './def';
import { cgaSprites } from './assets/sprites';
import { getImage, putImage, putImageRaw } from './video/screen';

const sprrdrwf = new Array<boolean>(SPRITES + 1).fill(false);
const sprrecf = new Array<boolean>(SPRITES + 1).fill(false);
const sprenf = new Array<boolean>(SPRITES).fill(false);
const sprch = new Int16Array(SPRITES + 1);
const sprmov: Uint8Array[] = [];
for (let i = 0; i < SPRITES; i++) sprmov.push(new Uint8Array(16 * 15)); // largest sprite
export const sprx = new Int16Array(SPRITES + 1);
export const spry = new Int16Array(SPRITES + 1);
const sprwid = new Int16Array(SPRITES + 1);
const sprhei = new Int16Array(SPRITES + 1);
const sprbwid = new Int16Array(SPRITES);
const sprbhei = new Int16Array(SPRITES);
const sprnch = new Int16Array(SPRITES);
const sprnwid = new Int16Array(SPRITES);
const sprnhei = new Int16Array(SPRITES);
const sprnbwid = new Int16Array(SPRITES);
const sprnbhei = new Int16Array(SPRITES);

function gputim(x: number, y: number, ch: number, w: number, h: number): void {
  const s = cgaSprites[ch];
  putImage(x, y, s.data, s.mask, w, h);
}

export function createspr(
  n: number,
  ch: number,
  wid: number,
  hei: number,
  bwid: number,
  bhei: number
): void {
  sprnch[n] = sprch[n] = ch;
  sprnwid[n] = sprwid[n] = wid;
  sprnhei[n] = sprhei[n] = hei;
  sprnbwid[n] = sprbwid[n] = bwid;
  sprnbhei[n] = sprbhei[n] = bhei;
  sprenf[n] = false;
}

export function movedrawspr(n: number, x: number, y: number): void {
  sprx[n] = x & -4;
  spry[n] = y;
  sprch[n] = sprnch[n];
  sprwid[n] = sprnwid[n];
  sprhei[n] = sprnhei[n];
  sprbwid[n] = sprnbwid[n];
  sprbhei[n] = sprnbhei[n];
  clearrdrwf();
  setrdrwflgs(n);
  putis();
  getImage(sprx[n], spry[n], sprmov[n], sprwid[n], sprhei[n]);
  sprenf[n] = true;
  sprrdrwf[n] = true;
  putims();
}

export function erasespr(n: number): void {
  if (!sprenf[n]) return;
  putImageRaw(sprx[n], spry[n], sprmov[n], sprwid[n], sprhei[n]);
  sprenf[n] = false;
  clearrdrwf();
  setrdrwflgs(n);
  putims();
}

export function drawspr(n: number, x: number, y: number): void {
  x &= -4;
  clearrdrwf();
  setrdrwflgs(n);
  const t1 = sprx[n];
  const t2 = spry[n];
  const t3 = sprwid[n];
  const t4 = sprhei[n];
  sprx[n] = x;
  spry[n] = y;
  sprwid[n] = sprnwid[n];
  sprhei[n] = sprnhei[n];
  clearrecf();
  setrdrwflgs(n);
  sprhei[n] = t4;
  sprwid[n] = t3;
  spry[n] = t2;
  sprx[n] = t1;
  sprrdrwf[n] = true;
  putis();
  sprenf[n] = true;
  sprx[n] = x;
  spry[n] = y;
  sprch[n] = sprnch[n];
  sprwid[n] = sprnwid[n];
  sprhei[n] = sprnhei[n];
  sprbwid[n] = sprnbwid[n];
  sprbhei[n] = sprnbhei[n];
  getImage(sprx[n], spry[n], sprmov[n], sprwid[n], sprhei[n]);
  putims();
  bcollides(n);
}

export function initspr(
  n: number,
  ch: number,
  wid: number,
  hei: number,
  bwid: number,
  bhei: number
): void {
  sprnch[n] = ch;
  sprnwid[n] = wid;
  sprnhei[n] = hei;
  sprnbwid[n] = bwid;
  sprnbhei[n] = bhei;
}

export function initmiscspr(x: number, y: number, wid: number, hei: number): void {
  sprx[SPRITES] = x;
  spry[SPRITES] = y;
  sprwid[SPRITES] = wid;
  sprhei[SPRITES] = hei;
  clearrdrwf();
  setrdrwflgs(SPRITES);
  putis();
}

export function getis(): void {
  for (let i = 0; i < SPRITES; i++)
    if (sprrdrwf[i]) getImage(sprx[i], spry[i], sprmov[i], sprwid[i], sprhei[i]);
  putims();
}

export function drawmiscspr(x: number, y: number, ch: number, wid: number, hei: number): void {
  sprx[SPRITES] = x & -4;
  spry[SPRITES] = y;
  sprch[SPRITES] = ch;
  sprwid[SPRITES] = wid;
  sprhei[SPRITES] = hei;
  gputim(sprx[SPRITES], spry[SPRITES], sprch[SPRITES], sprwid[SPRITES], sprhei[SPRITES]);
}

function clearrdrwf(): void {
  clearrecf();
  for (let i = 0; i < SPRITES + 1; i++) sprrdrwf[i] = false;
}

function clearrecf(): void {
  for (let i = 0; i < SPRITES + 1; i++) sprrecf[i] = false;
}

function setrdrwflgs(n: number): void {
  if (!sprrecf[n]) {
    sprrecf[n] = true;
    for (let i = 0; i < SPRITES; i++)
      if (sprenf[i] && i !== n) {
        if (collide(i, n)) {
          sprrdrwf[i] = true;
          setrdrwflgs(i);
        }
      }
  }
}

function collide(bx: number, si: number): boolean {
  if (sprx[bx] >= sprx[si]) {
    if (sprx[bx] > (sprwid[si] << 2) + sprx[si] - 1) return false;
  } else if (sprx[si] > (sprwid[bx] << 2) + sprx[bx] - 1) return false;
  if (spry[bx] >= spry[si]) {
    if (spry[bx] <= sprhei[si] + spry[si] - 1) return true;
    return false;
  }
  if (spry[si] <= sprhei[bx] + spry[bx] - 1) return true;
  return false;
}

function bcollide(bx: number, si: number): boolean {
  if (sprx[bx] >= sprx[si]) {
    if (sprx[bx] + sprbwid[bx] > (sprwid[si] << 2) + sprx[si] - sprbwid[si] - 1) return false;
  } else if (sprx[si] + sprbwid[si] > (sprwid[bx] << 2) + sprx[bx] - sprbwid[bx] - 1) return false;
  if (spry[bx] >= spry[si]) {
    if (spry[bx] + sprbhei[bx] <= sprhei[si] + spry[si] - sprbhei[si] - 1) return true;
    return false;
  }
  if (spry[si] + sprbhei[si] <= sprhei[bx] + spry[bx] - sprbhei[bx] - 1) return true;
  return false;
}

function putims(): void {
  for (let i = 0; i < SPRITES; i++)
    if (sprrdrwf[i]) gputim(sprx[i], spry[i], sprch[i], sprwid[i], sprhei[i]);
}

function putis(): void {
  for (let i = 0; i < SPRITES; i++)
    if (sprrdrwf[i]) putImageRaw(sprx[i], spry[i], sprmov[i], sprwid[i], sprhei[i]);
}

// Collision lists built by bcollides(): first[type] is the first sprite of
// that type overlapping the queried sprite, coll[] chains to the next.
export const first = new Array<number>(TYPES).fill(-1);
export const coll = new Array<number>(SPRITES).fill(-1);
const firstt = [FIRSTBONUS, FIRSTBAG, FIRSTMONSTER, FIRSTFIREBALL, FIRSTDIGGER];
const lastt = [LASTBONUS, LASTBAG, LASTMONSTER, LASTFIREBALL, LASTDIGGER];

export function bcollides(spr: number): void {
  for (let next = 0; next < TYPES; next++) first[next] = -1;
  for (let next = 0; next < SPRITES; next++) coll[next] = -1;
  for (let i = 0; i < TYPES; i++) {
    let next = -1;
    for (let spc = firstt[i]; spc < lastt[i]; spc++)
      if (sprenf[spc] && spc !== spr)
        if (bcollide(spr, spc)) {
          if (next === -1) first[i] = next = spc;
          else coll[(next = coll[next] = spc)] = -1;
        }
  }
}

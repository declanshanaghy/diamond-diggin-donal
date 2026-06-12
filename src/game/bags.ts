// Gold bag physics, ported from bags.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import {
  BAGS,
  TYPES,
  SPRITES,
  MWIDTH,
  MHEIGHT,
  DIR_NONE,
  DIR_RIGHT,
  DIR_UP,
  DIR_LEFT,
  DIR_DOWN,
  FIRSTBAG,
  FIRSTDIGGER,
} from '../def';
import { erasespr, movedrawspr, first, coll } from '../sprite';
import {
  drawgold,
  drawsquareblob,
  drawtopblob,
  drawfurryblob,
  eatfield,
  getfield,
} from '../drawing';
import { game, levof10 } from './state';
import { getlevch, levplan } from './level';
import {
  incpenalty,
  soundbreak,
  soundfall,
  soundfalloff,
  soundwobble,
  soundwobbleoff,
  soundgold,
} from '../sound/sound';
import {
  checkdiggerunderbag,
  killdigger,
  killemerald,
  reversedir,
  diggery,
  digalive,
  digresettime,
} from './digger';
import { checkmonscared, squashmonsters, mongold } from './monster';
import { scoregold } from './scores';

interface Bag {
  x: number;
  y: number;
  h: number;
  v: number;
  xr: number;
  yr: number;
  dir: number;
  wt: number;
  gt: number;
  fallh: number;
  wobbling: boolean;
  unfallen: boolean;
  exist: boolean;
}

const newBag = (): Bag => ({
  x: 0,
  y: 0,
  h: 0,
  v: 0,
  xr: 0,
  yr: 0,
  dir: DIR_NONE,
  wt: 15,
  gt: 0,
  fallh: 0,
  wobbling: false,
  unfallen: true,
  exist: false,
});

const bagdat: Bag[] = Array.from({ length: BAGS }, newBag);
const bagdat1: Bag[] = Array.from({ length: BAGS }, newBag);

let pushcount = 0;
let goldtime = 0;

export function initbags(): void {
  pushcount = 0;
  goldtime = 150 - levof10() * 10;
  for (let bag = 0; bag < BAGS; bag++) bagdat[bag].exist = false;
  let bag = 0;
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < MHEIGHT; y++)
      if (getlevch(x, y, levplan()) === 'B')
        if (bag < BAGS) {
          const b = bagdat[bag];
          b.exist = true;
          b.gt = 0;
          b.fallh = 0;
          b.dir = DIR_NONE;
          b.wobbling = false;
          b.wt = 15;
          b.unfallen = true;
          b.x = x * 20 + 12;
          b.y = y * 18 + 18;
          b.h = x;
          b.v = y;
          b.xr = 0;
          b.yr = 0;
          bag++;
        }
  for (let i = 0; i < BAGS; i++) bagdat1[i] = { ...bagdat[i] };
}

export function drawbags(): void {
  for (let bag = 0; bag < BAGS; bag++) {
    bagdat[bag] = { ...bagdat1[bag] };
    if (bagdat[bag].exist) movedrawspr(bag + FIRSTBAG, bagdat[bag].x, bagdat[bag].y);
  }
}

export function cleanupbags(): void {
  soundfalloff();
  for (let bag = 0; bag < BAGS; bag++) {
    const b = bagdat[bag];
    if (
      b.exist &&
      ((b.h === 7 && b.v === 9) ||
        b.xr !== 0 ||
        b.yr !== 0 ||
        b.gt !== 0 ||
        b.fallh !== 0 ||
        b.wobbling)
    ) {
      b.exist = false;
      erasespr(bag + FIRSTBAG);
    }
    bagdat1[bag] = { ...bagdat[bag] };
  }
}

export function dobags(): void {
  let soundfalloffflag = true;
  let soundwobbleoffflag = true;
  for (let bag = 0; bag < BAGS; bag++)
    if (bagdat[bag].exist) {
      const b = bagdat[bag];
      if (b.gt !== 0) {
        if (b.gt === 1) {
          soundbreak();
          drawgold(bag, 4, b.x, b.y);
          incpenalty();
        }
        if (b.gt === 3) {
          drawgold(bag, 5, b.x, b.y);
          incpenalty();
        }
        if (b.gt === 5) {
          drawgold(bag, 6, b.x, b.y);
          incpenalty();
        }
        b.gt++;
        if (b.gt === goldtime) removebag(bag);
        else if (b.v < MHEIGHT - 1 && b.gt < goldtime - 10)
          if ((getfield(b.h, b.v + 1) & 0x2000) === 0) b.gt = goldtime - 10;
      } else updatebag(bag);
    }
  for (let bag = 0; bag < BAGS; bag++) {
    if (bagdat[bag].dir === DIR_DOWN && bagdat[bag].exist) soundfalloffflag = false;
    if (bagdat[bag].dir !== DIR_DOWN && bagdat[bag].wobbling && bagdat[bag].exist)
      soundwobbleoffflag = false;
  }
  if (soundfalloffflag) soundfalloff();
  if (soundwobbleoffflag) soundwobbleoff();
}

const wblanim = [2, 0, 1, 0];

function updatebag(bag: number): void {
  const b = bagdat[bag];
  const x = b.x;
  const h = b.h;
  const xr = b.xr;
  const y = b.y;
  const v = b.v;
  const yr = b.yr;
  switch (b.dir) {
    case DIR_NONE:
      if (y < 180 && xr === 0) {
        if (b.wobbling) {
          if (b.wt === 0) {
            b.dir = DIR_DOWN;
            soundfall();
            break;
          }
          b.wt--;
          const wbl = b.wt % 8;
          if (!(wbl & 1)) {
            drawgold(bag, wblanim[wbl >> 1], x, y);
            incpenalty();
            soundwobble();
          }
        } else if ((getfield(h, v + 1) & 0xfdf) !== 0xfdf)
          if (!checkdiggerunderbag(h, v + 1)) b.wobbling = true;
      } else {
        b.wt = 15;
        b.wobbling = false;
      }
      break;
    case DIR_RIGHT:
    case DIR_LEFT:
      if (xr === 0) {
        if (y < 180 && (getfield(h, v + 1) & 0xfdf) !== 0xfdf) {
          b.dir = DIR_DOWN;
          b.wt = 0;
          soundfall();
        } else baghitground(bag);
      }
      break;
    case DIR_DOWN:
      if (yr === 0) b.fallh++;
      if (y >= 180) baghitground(bag);
      else if ((getfield(h, v + 1) & 0xfdf) === 0xfdf) if (yr === 0) baghitground(bag);
      checkmonscared(b.h);
  }
  if (b.dir !== DIR_NONE) {
    if (b.dir !== DIR_DOWN && pushcount !== 0) pushcount--;
    else pushbag(bag, b.dir);
  }
}

function baghitground(bag: number): void {
  const b = bagdat[bag];
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  if (b.dir === DIR_DOWN && b.fallh > 1) b.gt = 1;
  else b.fallh = 0;
  b.dir = DIR_NONE;
  b.wt = 15;
  b.wobbling = false;
  drawgold(bag, 0, b.x, b.y);
  for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
  for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
  incpenalty();
  let i = clfirst[1];
  while (i !== -1) {
    removebag(i - FIRSTBAG);
    i = clcoll[i];
  }
}

function pushbag(bag: number, dir: number): boolean {
  const b = bagdat[bag];
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  let push = true;
  let digf: boolean;
  const ox = b.x;
  const oy = b.y;
  let x = b.x;
  let y = b.y;
  const h = b.h;
  const v = b.v;
  if (b.gt !== 0) {
    getgold(bag);
    return true;
  }
  if (b.dir === DIR_DOWN && (dir === DIR_RIGHT || dir === DIR_LEFT)) {
    drawgold(bag, 3, x, y);
    for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
    for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
    incpenalty();
    let i = clfirst[4];
    while (i !== -1) {
      if (diggery(i - FIRSTDIGGER + game.curplayer) >= y)
        killdigger(i - FIRSTDIGGER + game.curplayer, 1, bag);
      i = clcoll[i];
    }
    if (clfirst[2] !== -1) squashmonsters(bag, clfirst, clcoll);
    return true;
  }
  if (
    (x === 292 && dir === DIR_RIGHT) ||
    (x === 12 && dir === DIR_LEFT) ||
    (y === 180 && dir === DIR_DOWN) ||
    (y === 18 && dir === DIR_UP)
  )
    push = false;
  if (push) {
    switch (dir) {
      case DIR_RIGHT:
        x += 4;
        break;
      case DIR_LEFT:
        x -= 4;
        break;
      case DIR_DOWN:
        if (b.unfallen) {
          b.unfallen = false;
          drawsquareblob(x, y);
          drawtopblob(x, y + 21);
        } else drawfurryblob(x, y);
        eatfield(x, y, dir);
        killemerald(h, v);
        y += 6;
    }
    switch (dir) {
      case DIR_DOWN: {
        drawgold(bag, 3, x, y);
        for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
        for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
        incpenalty();
        let i = clfirst[4];
        while (i !== -1) {
          if (diggery(i - FIRSTDIGGER + game.curplayer) >= y)
            killdigger(i - FIRSTDIGGER + game.curplayer, 1, bag);
          i = clcoll[i];
        }
        if (clfirst[2] !== -1) squashmonsters(bag, clfirst, clcoll);
        break;
      }
      case DIR_RIGHT:
      case DIR_LEFT: {
        b.wt = 15;
        b.wobbling = false;
        drawgold(bag, 0, x, y);
        for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
        for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
        incpenalty();
        pushcount = 1;
        if (clfirst[1] !== -1)
          if (!pushbags(dir, clfirst, clcoll)) {
            x = ox;
            y = oy;
            drawgold(bag, 0, ox, oy);
            incpenalty();
            push = false;
          }
        let i = clfirst[4];
        digf = false;
        while (i !== -1) {
          if (digalive(i - FIRSTDIGGER + game.curplayer)) digf = true;
          i = clcoll[i];
        }
        if (digf || clfirst[2] !== -1) {
          x = ox;
          y = oy;
          drawgold(bag, 0, ox, oy);
          incpenalty();
          push = false;
        }
      }
    }
    if (push) b.dir = dir;
    else b.dir = reversedir(dir);
    b.x = x;
    b.y = y;
    b.h = Math.floor((x - 12) / 20);
    b.v = Math.floor((y - 18) / 18);
    b.xr = (x - 12) % 20;
    b.yr = (y - 18) % 18;
  }
  return push;
}

export function pushbags(dir: number, clfirst: number[], clcoll: number[]): boolean {
  let push = true;
  let next = clfirst[1];
  while (next !== -1) {
    if (!pushbag(next - FIRSTBAG, dir)) push = false;
    next = clcoll[next];
  }
  return push;
}

export function pushudbags(clfirst: number[], clcoll: number[]): boolean {
  let push = true;
  let next = clfirst[1];
  while (next !== -1) {
    if (bagdat[next - FIRSTBAG].gt !== 0) getgold(next - FIRSTBAG);
    else push = false;
    next = clcoll[next];
  }
  return push;
}

export function removebag(bag: number): void {
  if (bagdat[bag].exist) {
    bagdat[bag].exist = false;
    erasespr(bag + FIRSTBAG);
  }
}

export function bagexist(bag: number): boolean {
  return bagdat[bag].exist;
}

export function bagy(bag: number): number {
  return bagdat[bag].y;
}

export function getbagdir(bag: number): number {
  if (bagdat[bag].exist) return bagdat[bag].dir;
  return -1;
}

export function removebags(clfirst: number[], clcoll: number[]): void {
  let next = clfirst[1];
  while (next !== -1) {
    removebag(next - FIRSTBAG);
    next = clcoll[next];
  }
}

export function getnmovingbags(): number {
  let n = 0;
  for (let bag = 0; bag < BAGS; bag++)
    if (bagdat[bag].exist && bagdat[bag].gt < 10 && (bagdat[bag].gt !== 0 || bagdat[bag].wobbling))
      n++;
  return n;
}

function getgold(bag: number): void {
  let f = true;
  drawgold(bag, 6, bagdat[bag].x, bagdat[bag].y);
  incpenalty();
  let i = first[4];
  while (i !== -1) {
    if (digalive(i - FIRSTDIGGER + game.curplayer)) {
      scoregold(i - FIRSTDIGGER + game.curplayer);
      soundgold();
      digresettime(i - FIRSTDIGGER + game.curplayer);
      f = false;
    }
    i = coll[i];
  }
  if (f) mongold();
  removebag(bag);
}

// Player (Donal) logic, ported from digger.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import {
  DIR_NONE,
  DIR_RIGHT,
  DIR_UP,
  DIR_LEFT,
  DIR_DOWN,
  TYPES,
  SPRITES,
  DIGGERS,
  MWIDTH,
  MSIZE,
  FIRSTBONUS,
  FIRSTMONSTER,
  FIRSTFIREBALL,
  FIRSTDIGGER,
} from '../def';
import { erasespr, movedrawspr, first, coll } from '../sprite';
import { getPixel, setIntensity } from '../video/screen';
import {
  drawdigger,
  drawemerald,
  eraseemerald,
  drawfire,
  drawbonus,
  drawrightblob,
  drawleftblob,
  drawtopblob,
  drawbottomblob,
  drawlives,
} from '../drawing';
import { eatfield } from '../drawing';
import { game, levof10 } from './state';
import { getlevch, levplan } from './level';
import { input, readdirect, getdirect, clearfire } from '../input';
import {
  incpenalty,
  soundem,
  soundemerald,
  soundeatm,
  soundddie,
  soundfire,
  soundfireoff,
  soundexplode,
  soundbonus,
  soundbonusoff,
  sound1up,
  music,
  musicoff,
} from '../sound/sound';
import {
  scoreemerald,
  scoreoctave,
  scorekill,
  scorebonus,
  scoreeatm,
} from './scores';
import { killmon, killmonsters } from './monster';
import { bagexist, pushbags, pushudbags, bagy, getbagdir } from './bags';

interface Digger {
  x: number;
  y: number;
  h: number;
  v: number;
  rx: number;
  ry: number;
  mdir: number;
  dir: number;
  bagtime: number;
  rechargetime: number;
  fx: number;
  fy: number;
  fdir: number;
  expsn: number;
  deathstage: number;
  deathbag: number;
  deathani: number;
  deathtime: number;
  emocttime: number;
  emn: number;
  msc: number;
  lives: number;
  ivt: number;
  notfiring: boolean;
  alive: boolean;
  firepressed: boolean;
  dead: boolean;
  invin: boolean;
}

const digdat: Digger[] = [];
for (let i = 0; i < DIGGERS; i++)
  digdat.push({
    x: 0,
    y: 0,
    h: 0,
    v: 0,
    rx: 0,
    ry: 0,
    mdir: 0,
    dir: 0,
    bagtime: 0,
    rechargetime: 0,
    fx: 0,
    fy: 0,
    fdir: 0,
    expsn: 0,
    deathstage: 0,
    deathbag: 0,
    deathani: 0,
    deathtime: 0,
    emocttime: 0,
    emn: 0,
    msc: 1,
    lives: 0,
    ivt: 0,
    notfiring: true,
    alive: false,
    firepressed: false,
    dead: false,
    invin: false,
  });

let startbonustimeleft = 0;
let bonustimeleft = 0;
let emmask = 0;
const emfield = new Int8Array(MSIZE);

export let bonusvisible = false;
export let bonusmode = false;
let digvisible = false;

export function setBonusVisible(v: boolean): void {
  bonusvisible = v;
}

export function initdigger(): void {
  for (let dig = game.curplayer; dig < game.diggers + game.curplayer; dig++) {
    const d = digdat[dig];
    if (d.lives === 0) continue;
    d.v = 9;
    d.mdir = 4;
    d.h = game.diggers === 1 ? 7 : 8 - dig * 2;
    d.x = d.h * 20 + 12;
    d.dir = dig === 0 ? DIR_RIGHT : DIR_LEFT;
    d.rx = 0;
    d.ry = 0;
    d.bagtime = 0;
    d.alive = true;
    d.dead = false; // alive !=> !dead but dead => !alive
    d.invin = false;
    d.ivt = 0;
    d.deathstage = 1;
    d.y = d.v * 18 + 18;
    movedrawspr(dig + FIRSTDIGGER - game.curplayer, d.x, d.y);
    d.notfiring = true;
    d.emocttime = 0;
    d.firepressed = false;
    d.expsn = 0;
    d.rechargetime = 0;
    d.emn = 0;
    d.msc = 1;
  }
  digvisible = true;
  bonusvisible = bonusmode = false;
}

function drawdig(n: number, d: number, x: number, y: number, f: boolean): void {
  drawdigger(n - game.curplayer, d, x, y, f);
  const dd = digdat[n];
  if (dd.invin) {
    dd.ivt--;
    if (dd.ivt === 0) dd.invin = false;
    else if (dd.ivt % 10 < 5) erasespr(FIRSTDIGGER + n - game.curplayer);
  }
}

export function dodigger(): void {
  for (let n = game.curplayer; n < game.diggers + game.curplayer; n++) {
    if (digdat[n].expsn !== 0) drawexplosion(n);
    else updatefire(n);
    if (digvisible) {
      if (digdat[n].alive) {
        if (digdat[n].bagtime !== 0) {
          drawdig(
            n,
            digdat[n].mdir,
            digdat[n].x,
            digdat[n].y,
            digdat[n].notfiring && digdat[n].rechargetime === 0
          );
          incpenalty();
          digdat[n].bagtime--;
        } else updatedigger(n);
      } else diggerdie(n);
    }
    if (digdat[n].emocttime > 0) digdat[n].emocttime--;
  }
  if (bonusmode && isalive()) {
    if (bonustimeleft !== 0) {
      bonustimeleft--;
      if (startbonustimeleft !== 0 || bonustimeleft < 20) {
        startbonustimeleft--;
        if (bonustimeleft & 1) {
          setIntensity(0);
          soundbonus();
        } else {
          setIntensity(1);
          soundbonus();
        }
        if (startbonustimeleft === 0) {
          music(0);
          soundbonusoff();
          setIntensity(1);
        }
      }
    } else {
      endbonusmode();
      soundbonusoff();
      music(1);
    }
  }
  if (bonusmode && !isalive()) {
    endbonusmode();
    soundbonusoff();
    music(1);
  }
}

function updatefire(n: number): void {
  let pix = 0;
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  let clflag: boolean;
  const d = digdat[n];
  if (d.notfiring) {
    if (d.rechargetime !== 0) d.rechargetime--;
    else if (getfirepflag(n - game.curplayer))
      if (d.alive) {
        d.rechargetime = levof10() * 3 + 60;
        d.notfiring = false;
        switch (d.dir) {
          case DIR_RIGHT:
            d.fx = d.x + 8;
            d.fy = d.y + 4;
            break;
          case DIR_UP:
            d.fx = d.x + 4;
            d.fy = d.y;
            break;
          case DIR_LEFT:
            d.fx = d.x;
            d.fy = d.y + 4;
            break;
          case DIR_DOWN:
            d.fx = d.x + 4;
            d.fy = d.y + 8;
        }
        d.fdir = d.dir;
        movedrawspr(FIRSTFIREBALL + n - game.curplayer, d.fx, d.fy);
        soundfire(n);
      }
  } else {
    switch (d.fdir) {
      case DIR_RIGHT:
        d.fx += 8;
        pix = getPixel(d.fx, d.fy + 4) | getPixel(d.fx + 4, d.fy + 4);
        break;
      case DIR_UP:
        d.fy -= 7;
        pix = 0;
        for (let i = 0; i < 7; i++) pix |= getPixel(d.fx + 4, d.fy + i);
        pix &= 0xc0;
        break;
      case DIR_LEFT:
        d.fx -= 8;
        pix = getPixel(d.fx, d.fy + 4) | getPixel(d.fx + 4, d.fy + 4);
        break;
      case DIR_DOWN:
        d.fy += 7;
        pix = 0;
        for (let i = 0; i < 7; i++) pix |= getPixel(d.fx, d.fy + i);
        pix &= 0x3;
        break;
    }
    drawfire(n - game.curplayer, d.fx, d.fy, 0);
    for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
    for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
    incpenalty();
    let i = clfirst[2];
    while (i !== -1) {
      killmon(i - FIRSTMONSTER);
      scorekill(n);
      d.expsn = 1;
      i = clcoll[i];
    }
    i = clfirst[4];
    while (i !== -1) {
      if (
        i - FIRSTDIGGER + game.curplayer !== n &&
        !digdat[i - FIRSTDIGGER + game.curplayer].invin &&
        digdat[i - FIRSTDIGGER + game.curplayer].alive
      ) {
        killdigger(i - FIRSTDIGGER + game.curplayer, 3, 0);
        d.expsn = 1;
      }
      i = clcoll[i];
    }
    if (
      clfirst[0] !== -1 ||
      clfirst[1] !== -1 ||
      clfirst[2] !== -1 ||
      clfirst[3] !== -1 ||
      clfirst[4] !== -1
    )
      clflag = true;
    else clflag = false;
    if (clfirst[0] !== -1 || clfirst[1] !== -1 || clfirst[3] !== -1) {
      d.expsn = 1;
      i = clfirst[3];
      while (i !== -1) {
        if (digdat[i - FIRSTFIREBALL + game.curplayer].expsn === 0)
          digdat[i - FIRSTFIREBALL + game.curplayer].expsn = 1;
        i = clcoll[i];
      }
    }
    switch (d.fdir) {
      case DIR_RIGHT:
        if (d.fx > 296) d.expsn = 1;
        else if (pix !== 0 && !clflag) {
          d.expsn = 1;
          d.fx -= 8;
          drawfire(n - game.curplayer, d.fx, d.fy, 0);
        }
        break;
      case DIR_UP:
        if (d.fy < 15) d.expsn = 1;
        else if (pix !== 0 && !clflag) {
          d.expsn = 1;
          d.fy += 7;
          drawfire(n - game.curplayer, d.fx, d.fy, 0);
        }
        break;
      case DIR_LEFT:
        if (d.fx < 16) d.expsn = 1;
        else if (pix !== 0 && !clflag) {
          d.expsn = 1;
          d.fx += 8;
          drawfire(n - game.curplayer, d.fx, d.fy, 0);
        }
        break;
      case DIR_DOWN:
        if (d.fy > 183) d.expsn = 1;
        else if (pix !== 0 && !clflag) {
          d.expsn = 1;
          d.fy -= 7;
          drawfire(n - game.curplayer, d.fx, d.fy, 0);
        }
    }
  }
}

export function erasediggers(): void {
  for (let i = 0; i < game.diggers; i++) erasespr(FIRSTDIGGER + i);
  digvisible = false;
}

function drawexplosion(n: number): void {
  switch (digdat[n].expsn) {
    case 1:
      soundexplode(n);
    // falls through
    case 2:
    case 3:
      drawfire(n - game.curplayer, digdat[n].fx, digdat[n].fy, digdat[n].expsn);
      incpenalty();
      digdat[n].expsn++;
      break;
    default:
      killfire(n);
      digdat[n].expsn = 0;
  }
}

export function killfire(n: number): void {
  if (!digdat[n].notfiring) {
    digdat[n].notfiring = true;
    erasespr(FIRSTFIREBALL + n - game.curplayer);
    soundfireoff(n);
  }
}

function updatedigger(n: number): void {
  const d = digdat[n];
  let push = true;
  let bagf: boolean;
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  readdirect(n - game.curplayer);
  const dir = getdirect(n - game.curplayer);
  let ddir: number;
  if (dir === DIR_RIGHT || dir === DIR_UP || dir === DIR_LEFT || dir === DIR_DOWN) ddir = dir;
  else ddir = DIR_NONE;
  if (d.rx === 0 && (ddir === DIR_UP || ddir === DIR_DOWN)) d.dir = d.mdir = ddir;
  if (d.ry === 0 && (ddir === DIR_RIGHT || ddir === DIR_LEFT)) d.dir = d.mdir = ddir;
  if (dir === DIR_NONE) d.mdir = DIR_NONE;
  else d.mdir = d.dir;
  if (
    (d.x === 292 && d.mdir === DIR_RIGHT) ||
    (d.x === 12 && d.mdir === DIR_LEFT) ||
    (d.y === 180 && d.mdir === DIR_DOWN) ||
    (d.y === 18 && d.mdir === DIR_UP)
  )
    d.mdir = DIR_NONE;
  const diggerox = d.x;
  const diggeroy = d.y;
  if (d.mdir !== DIR_NONE) eatfield(diggerox, diggeroy, d.mdir);
  switch (d.mdir) {
    case DIR_RIGHT:
      drawrightblob(d.x, d.y);
      d.x += 4;
      break;
    case DIR_UP:
      drawtopblob(d.x, d.y);
      d.y -= 3;
      break;
    case DIR_LEFT:
      drawleftblob(d.x, d.y);
      d.x -= 4;
      break;
    case DIR_DOWN:
      drawbottomblob(d.x, d.y);
      d.y += 3;
      break;
  }
  if (hitemerald((d.x - 12) / 20, (d.y - 18) / 18, (d.x - 12) % 20, (d.y - 18) % 18, d.mdir)) {
    if (d.emocttime === 0) d.emn = 0;
    scoreemerald(n);
    soundem();
    soundemerald(d.emn);
    d.emn++;
    if (d.emn === 8) {
      d.emn = 0;
      scoreoctave(n);
    }
    d.emocttime = 9;
  }
  drawdig(n, d.dir, d.x, d.y, d.notfiring && d.rechargetime === 0);
  for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
  for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
  incpenalty();

  let i = clfirst[1];
  bagf = false;
  while (i !== -1) {
    if (bagexist(i - 1)) {
      bagf = true;
      break;
    }
    i = clcoll[i];
  }

  if (bagf) {
    if (d.mdir === DIR_RIGHT || d.mdir === DIR_LEFT) {
      push = pushbags(d.mdir, clfirst, clcoll);
      d.bagtime++;
    } else if (!pushudbags(clfirst, clcoll)) push = false;
    if (!push) {
      // Strange, push not completely defined
      d.x = diggerox;
      d.y = diggeroy;
      drawdig(n, d.mdir, d.x, d.y, d.notfiring && d.rechargetime === 0);
      incpenalty();
      d.dir = reversedir(d.mdir);
    }
  }
  if (clfirst[2] !== -1 && bonusmode && d.alive)
    for (let nmon = killmonsters(clfirst, clcoll); nmon !== 0; nmon--) {
      soundeatm();
      sceatm(n);
    }
  if (clfirst[0] !== -1) {
    scorebonus(n);
    initbonusmode();
  }
  d.h = Math.floor((d.x - 12) / 20);
  d.rx = (d.x - 12) % 20;
  d.v = Math.floor((d.y - 18) / 18);
  d.ry = (d.y - 18) % 18;
}

function sceatm(n: number): void {
  scoreeatm(n, digdat[n].msc);
  digdat[n].msc <<= 1;
}

const deatharc = [3, 5, 6, 6, 5, 3, 0];

function diggerdie(n: number): void {
  const d = digdat[n];
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  switch (d.deathstage) {
    case 1:
      if (bagy(d.deathbag) + 6 > d.y) d.y = bagy(d.deathbag) + 6;
      drawdigger(n - game.curplayer, 15, d.x, d.y, false);
      incpenalty();
      if (getbagdir(d.deathbag) + 1 === 0) {
        soundddie();
        d.deathtime = 5;
        d.deathstage = 2;
        d.deathani = 0;
        d.y -= 6;
      }
      break;
    case 2:
      if (d.deathtime !== 0) {
        d.deathtime--;
        break;
      }
      if (d.deathani === 0) music(2);
      drawdigger(n - game.curplayer, 14 - d.deathani, d.x, d.y, false);
      for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
      for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
      incpenalty();
      if (d.deathani === 0 && clfirst[2] !== -1) killmonsters(clfirst, clcoll);
      if (d.deathani < 4) {
        d.deathani++;
        d.deathtime = 2;
      } else {
        d.deathstage = 4;
        if (game.musicflag || game.diggers > 1) d.deathtime = 60;
        else d.deathtime = 10;
      }
      break;
    case 3:
      d.deathstage = 5;
      d.deathani = 0;
      d.deathtime = 0;
      break;
    case 5:
      if (d.deathani >= 0 && d.deathani <= 6) {
        drawdigger(n - game.curplayer, 15, d.x, d.y - deatharc[d.deathani], false);
        if (d.deathani === 6 && !isalive()) musicoff();
        incpenalty();
        d.deathani++;
        if (d.deathani === 1) soundddie();
        if (d.deathani === 7) {
          d.deathtime = 5;
          d.deathani = 0;
          d.deathstage = 2;
        }
      }
      break;
    case 4:
      if (d.deathtime !== 0) d.deathtime--;
      else {
        d.dead = true;
        let alldead = true;
        for (let i = 0; i < game.diggers; i++)
          if (!digdat[i].dead) {
            alldead = false;
            break;
          }
        if (alldead) game.alldead = true;
        else if (isalive() && d.lives > 0) {
          if (!game.gauntlet) d.lives--;
          drawlives();
          if (d.lives > 0) {
            d.v = 9;
            d.mdir = 4;
            d.h = game.diggers === 1 ? 7 : 8 - n * 2;
            d.x = d.h * 20 + 12;
            d.dir = n === 0 ? DIR_RIGHT : DIR_LEFT;
            d.rx = 0;
            d.ry = 0;
            d.bagtime = 0;
            d.alive = true;
            d.dead = false;
            d.invin = true;
            d.ivt = 50;
            d.deathstage = 1;
            d.y = d.v * 18 + 18;
            erasespr(n + FIRSTDIGGER - game.curplayer);
            movedrawspr(n + FIRSTDIGGER - game.curplayer, d.x, d.y);
            d.notfiring = true;
            d.emocttime = 0;
            d.firepressed = false;
            d.expsn = 0;
            d.rechargetime = 0;
            d.emn = 0;
            d.msc = 1;
          }
          clearfire(n);
          if (bonusmode) music(0);
          else music(1);
        }
      }
  }
}

export function createbonus(): void {
  bonusvisible = true;
  drawbonus(292, 18);
}

function initbonusmode(): void {
  bonusmode = true;
  erasebonus();
  setIntensity(1);
  bonustimeleft = 250 - levof10() * 20;
  startbonustimeleft = 20;
  for (let i = 0; i < game.diggers; i++) digdat[i].msc = 1;
}

function endbonusmode(): void {
  bonusmode = false;
  setIntensity(0);
}

export function erasebonus(): void {
  if (bonusvisible) {
    bonusvisible = false;
    erasespr(FIRSTBONUS);
  }
  setIntensity(0);
}

export function reversedir(dir: number): number {
  switch (dir) {
    case DIR_RIGHT:
      return DIR_LEFT;
    case DIR_LEFT:
      return DIR_RIGHT;
    case DIR_UP:
      return DIR_DOWN;
    case DIR_DOWN:
      return DIR_UP;
  }
  return dir;
}

export function checkdiggerunderbag(h: number, v: number): boolean {
  for (let n = game.curplayer; n < game.diggers + game.curplayer; n++)
    if (digdat[n].alive)
      if (digdat[n].mdir === DIR_UP || digdat[n].mdir === DIR_DOWN)
        if (Math.floor((digdat[n].x - 12) / 20) === h)
          if (
            Math.floor((digdat[n].y - 18) / 18) === v ||
            Math.floor((digdat[n].y - 18) / 18) + 1 === v
          )
            return true;
  return false;
}

export function killdigger(n: number, stage: number, bag: number): void {
  if (digdat[n].invin) return;
  if (digdat[n].deathstage < 2 || digdat[n].deathstage > 4) {
    digdat[n].alive = false;
    digdat[n].deathstage = stage;
    digdat[n].deathbag = bag;
  }
}

export function makeemfield(): void {
  emmask = 1 << game.curplayer;
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < 10; y++)
      if (getlevch(x, y, levplan()) === 'C') emfield[y * MWIDTH + x] |= emmask;
      else emfield[y * MWIDTH + x] &= ~emmask;
}

export function drawemeralds(): void {
  emmask = 1 << game.curplayer;
  for (let x = 0; x < MWIDTH; x++)
    for (let y = 0; y < 10; y++)
      if (emfield[y * MWIDTH + x] & emmask) drawemerald(x * 20 + 12, y * 18 + 21);
}

const embox = [8, 12, 12, 9, 16, 12, 6, 9];

function hitemerald(x: number, y: number, rx: number, ry: number, dir: number): boolean {
  let hit = false;
  let r: number;
  x = Math.floor(x);
  y = Math.floor(y);
  if (dir !== DIR_RIGHT && dir !== DIR_UP && dir !== DIR_LEFT && dir !== DIR_DOWN) return hit;
  if (dir === DIR_RIGHT && rx !== 0) x++;
  if (dir === DIR_DOWN && ry !== 0) y++;
  if (dir === DIR_RIGHT || dir === DIR_LEFT) r = rx;
  else r = ry;
  if (emfield[y * MWIDTH + x] & emmask) {
    if (r === embox[dir]) {
      drawemerald(x * 20 + 12, y * 18 + 21);
      incpenalty();
    }
    if (r === embox[dir + 1]) {
      eraseemerald(x * 20 + 12, y * 18 + 21);
      incpenalty();
      hit = true;
      emfield[y * MWIDTH + x] &= ~emmask;
    }
  }
  return hit;
}

export function countem(): number {
  let n = 0;
  for (let i = 0; i < MSIZE; i++) if (emfield[i] & emmask) n++;
  return n;
}

export function killemerald(x: number, y: number): void {
  if (emfield[(y + 1) * MWIDTH + x] & emmask) {
    emfield[(y + 1) * MWIDTH + x] &= ~emmask;
    eraseemerald(x * 20 + 12, (y + 1) * 18 + 21);
  }
}

function getfirepflag(n: number): boolean {
  return n === 0 ? input.firepflag : false;
}

export function diggerx(n: number): number {
  return digdat[n].x;
}

export function diggery(n: number): number {
  return digdat[n].y;
}

export function digalive(n: number): boolean {
  return digdat[n].alive;
}

export function digresettime(n: number): void {
  digdat[n].bagtime = 0;
}

export function isalive(): boolean {
  for (let i = game.curplayer; i < game.diggers + game.curplayer; i++)
    if (digdat[i].alive) return true;
  return false;
}

export function getlives(pl: number): number {
  return digdat[pl].lives;
}

export function addlife(pl: number): void {
  digdat[pl].lives++;
  sound1up();
}

export function initlives(): void {
  for (let i = 0; i < game.diggers + game.nplayers - 1; i++) digdat[i].lives = 3;
}

export function declife(pl: number): void {
  if (!game.gauntlet) digdat[pl].lives--;
}

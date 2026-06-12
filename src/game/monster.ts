// Monster (Nobbin/Hobbin) AI, ported from monster.c of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import {
  MONSTERS,
  TYPES,
  SPRITES,
  DIR_NONE,
  DIR_RIGHT,
  DIR_UP,
  DIR_LEFT,
  DIR_DOWN,
  FIRSTBAG,
  FIRSTMONSTER,
  FIRSTDIGGER,
} from '../def';
import { erasespr, movedrawspr, first, coll } from '../sprite';
import {
  drawmon,
  drawmondie,
  drawrightblob,
  drawleftblob,
  drawtopblob,
  drawbottomblob,
  eatfield,
  getfield,
} from '../drawing';
import { game, levof10 } from './state';
import { randno } from './rng';
import { incpenalty, soundeatm } from '../sound/sound';
import {
  isalive,
  digalive,
  diggerx,
  diggery,
  killdigger,
  reversedir,
  createbonus,
  bonusmode,
  sceatm,
  hitemerald,
} from './digger';
import { bagexist, pushbags, pushudbags, removebags, bagy, getbagdir } from './bags';
import { scorekill } from './scores';

interface Monster {
  x: number;
  y: number;
  h: number;
  v: number;
  xr: number;
  yr: number;
  dir: number;
  hdir: number;
  t: number;
  hnt: number;
  death: number;
  bag: number;
  dtime: number;
  stime: number;
  chase: number;
  flag: boolean;
  nob: boolean;
  alive: boolean;
}

const mondat: Monster[] = Array.from({ length: MONSTERS }, () => ({
  x: 0,
  y: 0,
  h: 0,
  v: 0,
  xr: 0,
  yr: 0,
  dir: 0,
  hdir: 0,
  t: 0,
  hnt: 0,
  death: 0,
  bag: 0,
  dtime: 0,
  stime: 0,
  chase: 0,
  flag: false,
  nob: true,
  alive: false,
}));

let nextmonster = 0;
let totalmonsters = 0;
let maxmononscr = 0;
let nextmontime = 0;
let mongaptime = 0;
let chase = 0;
let unbonusflag = false;
let mongotgold = false;

export function initmonsters(): void {
  for (let i = 0; i < MONSTERS; i++) mondat[i].flag = false;
  nextmonster = 0;
  mongaptime = 45 - (levof10() << 1);
  totalmonsters = levof10() + 5;
  switch (levof10()) {
    case 1:
      maxmononscr = 3;
      break;
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
      maxmononscr = 4;
      break;
    case 8:
    case 9:
    case 10:
      maxmononscr = 5;
  }
  nextmontime = 10;
  unbonusflag = true;
}

export function erasemonsters(): void {
  for (let i = 0; i < MONSTERS; i++) if (mondat[i].flag) erasespr(i + FIRSTMONSTER);
}

export function domonsters(): void {
  if (nextmontime > 0) nextmontime--;
  else {
    if (nextmonster < totalmonsters && nmononscr() < maxmononscr && isalive() && !bonusmode)
      createmonster();
    if (unbonusflag && nextmonster === totalmonsters && nextmontime === 0)
      if (isalive()) {
        unbonusflag = false;
        createbonus();
      }
  }
  for (let i = 0; i < MONSTERS; i++)
    if (mondat[i].flag) {
      if (mondat[i].hnt > 10 - levof10()) {
        if (mondat[i].nob) {
          mondat[i].nob = false;
          mondat[i].hnt = 0;
        }
      }
      if (mondat[i].alive) {
        if (mondat[i].t === 0) {
          monai(i);
          if (randno(15 - levof10()) === 0)
            // Need to split for determinism
            if (mondat[i].nob && mondat[i].alive) monai(i);
        } else mondat[i].t--;
      } else mondie(i);
    }
}

function createmonster(): void {
  for (let i = 0; i < MONSTERS; i++)
    if (!mondat[i].flag) {
      const m = mondat[i];
      m.flag = true;
      m.alive = true;
      m.t = 0;
      m.nob = true;
      m.hnt = 0;
      m.h = 14;
      m.v = 0;
      m.x = 292;
      m.y = 18;
      m.xr = 0;
      m.yr = 0;
      m.dir = DIR_LEFT;
      m.hdir = DIR_LEFT;
      m.chase = chase + game.curplayer;
      chase = (chase + 1) % game.diggers;
      nextmonster++;
      nextmontime = mongaptime;
      m.stime = 5;
      movedrawspr(i + FIRSTMONSTER, m.x, m.y);
      break;
    }
}

export function mongold(): void {
  mongotgold = true;
}

function monai(mon: number): void {
  const m = mondat[mon];
  const clfirst = new Array<number>(TYPES);
  const clcoll = new Array<number>(SPRITES);
  let push = true;
  const monox = m.x;
  const monoy = m.y;
  let mdirp1: number;
  let mdirp2: number;
  let mdirp3: number;
  let mdirp4: number;
  if (m.xr === 0 && m.yr === 0) {
    // If we are here the monster needs to know which way to turn next.

    // Turn hobbin back into nobbin if it's had its time
    if (m.hnt > 30 + (levof10() << 1))
      if (!m.nob) {
        m.hnt = 0;
        m.nob = true;
      }

    // Set up monster direction properties to chase Digger
    let dig = m.chase;
    if (!digalive(dig)) dig = game.diggers - 1 - dig;

    if (Math.abs(diggery(dig) - m.y) > Math.abs(diggerx(dig) - m.x)) {
      if (diggery(dig) < m.y) {
        mdirp1 = DIR_UP;
        mdirp4 = DIR_DOWN;
      } else {
        mdirp1 = DIR_DOWN;
        mdirp4 = DIR_UP;
      }
      if (diggerx(dig) < m.x) {
        mdirp2 = DIR_LEFT;
        mdirp3 = DIR_RIGHT;
      } else {
        mdirp2 = DIR_RIGHT;
        mdirp3 = DIR_LEFT;
      }
    } else {
      if (diggerx(dig) < m.x) {
        mdirp1 = DIR_LEFT;
        mdirp4 = DIR_RIGHT;
      } else {
        mdirp1 = DIR_RIGHT;
        mdirp4 = DIR_LEFT;
      }
      if (diggery(dig) < m.y) {
        mdirp2 = DIR_UP;
        mdirp3 = DIR_DOWN;
      } else {
        mdirp2 = DIR_DOWN;
        mdirp3 = DIR_UP;
      }
    }

    // In bonus mode, run away from Digger
    if (bonusmode) {
      let t = mdirp1;
      mdirp1 = mdirp4;
      mdirp4 = t;
      t = mdirp2;
      mdirp2 = mdirp3;
      mdirp3 = t;
    }

    // Adjust priorities so that monsters don't reverse direction unless they
    // really have to
    let dir = reversedir(m.dir);
    if (dir === mdirp1) {
      mdirp1 = mdirp2;
      mdirp2 = mdirp3;
      mdirp3 = mdirp4;
      mdirp4 = dir;
    }
    if (dir === mdirp2) {
      mdirp2 = mdirp3;
      mdirp3 = mdirp4;
      mdirp4 = dir;
    }
    if (dir === mdirp3) {
      mdirp3 = mdirp4;
      mdirp4 = dir;
    }

    // Introduce a random element on levels <6 : occasionally swap p1 and p3
    if (randno(levof10() + 5) === 1)
      // Need to split for determinism
      if (levof10() < 6) {
        const t = mdirp1;
        mdirp1 = mdirp3;
        mdirp3 = t;
      }

    // Check field and find direction
    if (fieldclear(mdirp1, m.h, m.v)) dir = mdirp1;
    else if (fieldclear(mdirp2, m.h, m.v)) dir = mdirp2;
    else if (fieldclear(mdirp3, m.h, m.v)) dir = mdirp3;
    else if (fieldclear(mdirp4, m.h, m.v)) dir = mdirp4;

    // Hobbins don't care about the field: they go where they want.
    if (!m.nob) dir = mdirp1;

    // Monsters take a time penalty for changing direction
    if (m.dir !== dir) m.t++;

    // Save the new direction
    m.dir = dir;
  }

  // If monster is about to go off edge of screen, stop it.
  if (
    (m.x === 292 && m.dir === DIR_RIGHT) ||
    (m.x === 12 && m.dir === DIR_LEFT) ||
    (m.y === 180 && m.dir === DIR_DOWN) ||
    (m.y === 18 && m.dir === DIR_UP)
  )
    m.dir = DIR_NONE;

  // Change hdir for hobbin
  if (m.dir === DIR_LEFT || m.dir === DIR_RIGHT) m.hdir = m.dir;

  // Hobbins dig
  if (!m.nob) eatfield(m.x, m.y, m.dir);

  // (Draw new tunnels) and move monster
  switch (m.dir) {
    case DIR_RIGHT:
      if (!m.nob) drawrightblob(m.x, m.y);
      m.x += 4;
      break;
    case DIR_UP:
      if (!m.nob) drawtopblob(m.x, m.y);
      m.y -= 3;
      break;
    case DIR_LEFT:
      if (!m.nob) drawleftblob(m.x, m.y);
      m.x -= 4;
      break;
    case DIR_DOWN:
      if (!m.nob) drawbottomblob(m.x, m.y);
      m.y += 3;
      break;
  }

  // Hobbins can eat emeralds
  if (!m.nob) hitemerald((m.x - 12) / 20, (m.y - 18) / 18, (m.x - 12) % 20, (m.y - 18) % 18, m.dir);

  // If Digger's gone, don't bother
  if (!isalive()) {
    m.x = monox;
    m.y = monoy;
  }

  // If monster's just started, don't move yet
  if (m.stime !== 0) {
    m.stime--;
    m.x = monox;
    m.y = monoy;
  }

  // Increase time counter for hobbin
  if (!m.nob && m.hnt < 100) m.hnt++;

  // Draw monster
  drawmon(mon, m.nob, m.hdir, m.x, m.y);
  for (let i = 0; i < TYPES; i++) clfirst[i] = first[i];
  for (let i = 0; i < SPRITES; i++) clcoll[i] = coll[i];
  incpenalty();

  // Collision with another monster
  if (clfirst[2] !== -1) {
    m.t++; // Time penalty
    // Ensure both aren't moving in the same dir.
    let i = clfirst[2];
    do {
      const mm = i - FIRSTMONSTER;
      if (m.dir === mondat[mm].dir && mondat[mm].stime === 0 && m.stime === 0)
        mondat[mm].dir = reversedir(mondat[mm].dir);
      incpenalty();
      i = clcoll[i];
    } while (i !== -1);
  }

  // Check for collision with bag
  let i = clfirst[1];
  let bagf = false;
  while (i !== -1) {
    if (bagexist(i - FIRSTBAG)) {
      bagf = true;
      break;
    }
    i = clcoll[i];
  }

  if (bagf) {
    m.t++; // Time penalty
    mongotgold = false;
    if (m.dir === DIR_RIGHT || m.dir === DIR_LEFT) {
      push = pushbags(m.dir, clfirst, clcoll); // Horizontal push
      m.t++; // Time penalty
    } else if (!pushudbags(clfirst, clcoll))
      // Vertical push
      push = false;
    if (mongotgold)
      // No time penalty if monster eats gold
      m.t = 0;
    if (!m.nob && m.hnt > 1) removebags(clfirst, clcoll); // Hobbins eat bags
  }

  // Increase hobbin cross counter
  if (m.nob && clfirst[2] !== -1 && isalive()) m.hnt++;

  // See if bags push monster back
  if (!push) {
    m.x = monox;
    m.y = monoy;
    drawmon(mon, m.nob, m.hdir, m.x, m.y);
    incpenalty();
    if (m.nob)
      // The other way to create hobbin: stuck on h-bag
      m.hnt++;
    if ((m.dir === DIR_UP || m.dir === DIR_DOWN) && m.nob) m.dir = reversedir(m.dir); // If vertical, give up
  }

  // Collision with Digger
  if (clfirst[4] !== -1 && isalive()) {
    if (bonusmode) {
      killmon(mon);
      let i2 = clfirst[4];
      while (i2 !== -1) {
        if (digalive(i2 - FIRSTDIGGER + game.curplayer)) sceatm(i2 - FIRSTDIGGER + game.curplayer);
        i2 = clcoll[i2];
      }
      soundeatm(); // Collision in bonus mode
    } else {
      let i2 = clfirst[4];
      while (i2 !== -1) {
        if (digalive(i2 - FIRSTDIGGER + game.curplayer))
          killdigger(i2 - FIRSTDIGGER + game.curplayer, 3, 0); // Kill Digger
        i2 = clcoll[i2];
      }
    }
  }

  // Update co-ordinates
  m.h = Math.floor((m.x - 12) / 20);
  m.v = Math.floor((m.y - 18) / 18);
  m.xr = (m.x - 12) % 20;
  m.yr = (m.y - 18) % 18;
}

function mondie(mon: number): void {
  const m = mondat[mon];
  switch (m.death) {
    case 1:
      if (bagy(m.bag) + 6 > m.y) m.y = bagy(m.bag);
      drawmondie(mon, m.nob, m.hdir, m.x, m.y);
      incpenalty();
      if (getbagdir(m.bag) === -1) {
        m.dtime = 1;
        m.death = 4;
      }
      break;
    case 4:
      if (m.dtime !== 0) m.dtime--;
      else {
        killmon(mon);
        scorekill(game.curplayer);
      }
  }
}

function fieldclear(dir: number, x: number, y: number): boolean {
  switch (dir) {
    case DIR_RIGHT:
      if (x < 14)
        if ((getfield(x + 1, y) & 0x2000) === 0)
          if ((getfield(x + 1, y) & 1) === 0 || (getfield(x, y) & 0x10) === 0) return true;
      break;
    case DIR_UP:
      if (y > 0)
        if ((getfield(x, y - 1) & 0x2000) === 0)
          if ((getfield(x, y - 1) & 0x800) === 0 || (getfield(x, y) & 0x40) === 0) return true;
      break;
    case DIR_LEFT:
      if (x > 0)
        if ((getfield(x - 1, y) & 0x2000) === 0)
          if ((getfield(x - 1, y) & 0x10) === 0 || (getfield(x, y) & 1) === 0) return true;
      break;
    case DIR_DOWN:
      if (y < 9)
        if ((getfield(x, y + 1) & 0x2000) === 0)
          if ((getfield(x, y + 1) & 0x40) === 0 || (getfield(x, y) & 0x800) === 0) return true;
  }
  return false;
}

export function checkmonscared(h: number): void {
  for (let m = 0; m < MONSTERS; m++)
    if (h === mondat[m].h && mondat[m].dir === DIR_UP) mondat[m].dir = DIR_DOWN;
}

export function killmon(mon: number): void {
  if (mondat[mon].flag) {
    mondat[mon].flag = mondat[mon].alive = false;
    erasespr(mon + FIRSTMONSTER);
    if (bonusmode) totalmonsters++;
  }
}

export function squashmonsters(bag: number, clfirst: number[], clcoll: number[]): void {
  let next = clfirst[2];
  while (next !== -1) {
    const m = next - FIRSTMONSTER;
    if (mondat[m].y >= bagy(bag)) squashmonster(m, 1, bag);
    next = clcoll[next];
  }
}

export function killmonsters(clfirst: number[], clcoll: number[]): number {
  let next = clfirst[2];
  let n = 0;
  while (next !== -1) {
    killmon(next - FIRSTMONSTER);
    n++;
    next = clcoll[next];
  }
  return n;
}

function squashmonster(mon: number, death: number, bag: number): void {
  mondat[mon].alive = false;
  mondat[mon].death = death;
  mondat[mon].bag = bag;
}

export function monleft(): number {
  return nmononscr() + totalmonsters - nextmonster;
}

function nmononscr(): number {
  let n = 0;
  for (let i = 0; i < MONSTERS; i++) if (mondat[i].flag) n++;
  return n;
}

export function incmont(n: number): void {
  if (n > MONSTERS) n = MONSTERS;
  for (let m = 1; m < n; m++) mondat[m].t++;
}

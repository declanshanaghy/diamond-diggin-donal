// Sound effects and music sequencer, ported from sound.c of Digger
// Remastered. Every effect is a per-tick state machine that sets the PIT
// divisor t2val; music sets t0val with a volume envelope. The driver turns
// divisors into a square wave (Hz = 1193181 / divisor). t2val=40 and
// t0val=0x7d00 are the "no sound" sentinels (supersonic on real hardware).
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { FIREBALLS } from '../def';
import { game } from '../game/state';
import { input } from '../input';
import { newlevjingle, bonusjingle, backgjingle, dirge } from '../assets/music';
import { startDriver, applyTone } from './driver';

const PIT_FREQ = 1193181;

let t2val = 0;
let t0val = 0;
let musvol = 0;
let soundpausedflag = false;

let randvs = 0;
function randnos(n: number): number {
  randvs = (Math.imul(randvs, 0x15a4e35) + 1) | 0;
  return (randvs & 0x7fffffff) % n;
}

export function incpenalty(): void {
  game.penalty++;
}

// ------------------------------------------------------------ level jingle --
let soundlevdoneflag = false;
let nljpointer = 0;
let nljnoteduration = 0;

export function* soundlevdone(): Generator<void, void, void> {
  soundstop();
  nljpointer = 0;
  nljnoteduration = 20;
  soundlevdoneflag = soundpausedflag = true;
  while (soundlevdoneflag && !input.escape) yield;
  soundlevdoneoff();
}

function soundlevdoneoff(): void {
  soundlevdoneflag = soundpausedflag = false;
}

function soundlevdoneupdate(): void {
  if (nljpointer < 11) t2val = newlevjingle[nljpointer];
  t0val = t2val + 35;
  musvol = 50;
  if (nljnoteduration > 0) nljnoteduration--;
  else {
    nljnoteduration = 20;
    nljpointer++;
    if (nljpointer > 10) soundlevdoneoff();
  }
}

// -------------------------------------------------------------------- fall --
let soundfallflag = false;
let soundfallf = false;
let soundfallvalue = 0;
let soundfalln = 0;

export function soundfall(): void {
  soundfallvalue = 1000;
  soundfallflag = true;
}

export function soundfalloff(): void {
  soundfallflag = false;
  soundfalln = 0;
}

function soundfallupdate(): void {
  if (soundfallflag) {
    if (soundfalln < 1) {
      soundfalln++;
      if (soundfallf) t2val = soundfallvalue;
    } else {
      soundfalln = 0;
      if (soundfallf) {
        soundfallvalue += 50;
        soundfallf = false;
      } else soundfallf = true;
    }
  }
}

// ------------------------------------------------------------------- break --
let soundbreakflag = false;
let soundbreakduration = 0;
let soundbreakvalue = 0;

export function soundbreak(): void {
  soundbreakduration = 3;
  if (soundbreakvalue < 15000) soundbreakvalue = 15000;
  soundbreakflag = true;
}

function soundbreakoff(): void {
  soundbreakflag = false;
}

function soundbreakupdate(): void {
  if (soundbreakflag) {
    if (soundbreakduration !== 0) {
      soundbreakduration--;
      t2val = soundbreakvalue;
    } else soundbreakflag = false;
  }
}

// ------------------------------------------------------------------ wobble --
let soundwobbleflag = false;
let soundwobblen = 0;

export function soundwobble(): void {
  soundwobbleflag = true;
}

export function soundwobbleoff(): void {
  soundwobbleflag = false;
  soundwobblen = 0;
}

function soundwobbleupdate(): void {
  if (soundwobbleflag) {
    soundwobblen++;
    if (soundwobblen > 63) soundwobblen = 0;
    switch (soundwobblen) {
      case 0:
        t2val = 0x7d0;
        break;
      case 16:
      case 48:
        t2val = 0x9c4;
        break;
      case 32:
        t2val = 0xbb8;
        break;
    }
  }
}

// -------------------------------------------------------------------- fire --
const soundfireflag = new Array<boolean>(FIREBALLS).fill(false);
const sff = new Array<boolean>(FIREBALLS).fill(false);
const soundfirevalue = new Array<number>(FIREBALLS).fill(0);
const soundfiren = new Array<number>(FIREBALLS).fill(0);
let soundfirew = 0;

export function soundfire(n: number): void {
  soundfirevalue[n] = 500;
  soundfireflag[n] = true;
}

export function soundfireoff(n: number): void {
  soundfireflag[n] = false;
  soundfiren[n] = 0;
}

function soundfireupdate(): void {
  let f = false;
  for (let n = 0; n < FIREBALLS; n++) {
    sff[n] = false;
    if (soundfireflag[n]) {
      if (soundfiren[n] === 1) {
        soundfiren[n] = 0;
        soundfirevalue[n] += Math.floor(soundfirevalue[n] / 55);
        sff[n] = true;
        f = true;
        if (soundfirevalue[n] > 30000) soundfireoff(n);
      } else soundfiren[n]++;
    }
  }
  if (f) {
    let n: number;
    do {
      n = soundfirew++;
      if (soundfirew === FIREBALLS) soundfirew = 0;
    } while (!sff[n]);
    t2val = soundfirevalue[n] + randnos(soundfirevalue[n] >> 3);
  }
}

// ----------------------------------------------------------------- explode --
const soundexplodeflag = new Array<boolean>(FIREBALLS).fill(false);
const sef = new Array<boolean>(FIREBALLS).fill(false);
const soundexplodevalue = new Array<number>(FIREBALLS).fill(0);
const soundexplodeduration = new Array<number>(FIREBALLS).fill(0);
let soundexplodew = 0;

export function soundexplode(n: number): void {
  soundexplodevalue[n] = 1500;
  soundexplodeduration[n] = 10;
  soundexplodeflag[n] = true;
  soundfireoff(n);
}

function soundexplodeoff(n: number): void {
  soundexplodeflag[n] = false;
}

function soundexplodeupdate(): void {
  let f = false;
  for (let n = 0; n < FIREBALLS; n++) {
    sef[n] = false;
    if (soundexplodeflag[n]) {
      if (soundexplodeduration[n] !== 0) {
        soundexplodevalue[n] = soundexplodevalue[n] - (soundexplodevalue[n] >> 3);
        soundexplodeduration[n]--;
        sef[n] = true;
        f = true;
      } else soundexplodeflag[n] = false;
    }
  }
  if (f) {
    let n: number;
    do {
      n = soundexplodew++;
      if (soundexplodew === FIREBALLS) soundexplodew = 0;
    } while (!sef[n]);
    t2val = soundexplodevalue[n];
  }
}

// ------------------------------------------------------------------- bonus --
let soundbonusflag = false;
let soundbonusn = 0;

export function soundbonus(): void {
  soundbonusflag = true;
}

export function soundbonusoff(): void {
  soundbonusflag = false;
  soundbonusn = 0;
}

function soundbonusupdate(): void {
  if (soundbonusflag) {
    soundbonusn++;
    if (soundbonusn > 15) soundbonusn = 0;
    if (soundbonusn >= 0 && soundbonusn < 6) t2val = 0x4ce;
    if (soundbonusn >= 8 && soundbonusn < 14) t2val = 0x5e9;
  }
}

// ------------------------------------------------------- diamond (em) blip --
let soundemflag = false;

export function soundem(): void {
  soundemflag = true;
}

function soundemoff(): void {
  soundemflag = false;
}

function soundemupdate(): void {
  if (soundemflag) {
    t2val = 1000;
    soundemoff();
  }
}

// -------------------------------------------------- diamond octave (scale) --
let soundemeraldflag = false;
let soundemeraldduration = 0;
let emerfreq = 0;
let soundemeraldn = 0;

const emfreqs = [0x8e8, 0x7f0, 0x712, 0x6ac, 0x5f2, 0x54c, 0x4b8, 0x474];

export function soundemerald(n: number): void {
  emerfreq = emfreqs[n];
  soundemeraldduration = 7;
  soundemeraldn = 0;
  soundemeraldflag = true;
}

function soundemeraldoff(): void {
  soundemeraldflag = false;
}

function soundemeraldupdate(): void {
  if (soundemeraldflag) {
    if (soundemeraldduration !== 0) {
      if (soundemeraldn === 0 || soundemeraldn === 1) t2val = emerfreq;
      soundemeraldn++;
      if (soundemeraldn > 7) {
        soundemeraldn = 0;
        soundemeraldduration--;
      }
    } else soundemeraldoff();
  }
}

// -------------------------------------------------------------------- gold --
let soundgoldflag = false;
let soundgoldf = false;
let soundgoldvalue1 = 0;
let soundgoldvalue2 = 0;
let soundgoldduration = 0;

export function soundgold(): void {
  soundgoldvalue1 = 500;
  soundgoldvalue2 = 4000;
  soundgoldduration = 30;
  soundgoldf = false;
  soundgoldflag = true;
}

function soundgoldoff(): void {
  soundgoldflag = false;
}

function soundgoldupdate(): void {
  if (soundgoldflag) {
    if (soundgoldduration !== 0) soundgoldduration--;
    else soundgoldflag = false;
    if (soundgoldf) {
      soundgoldf = false;
      t2val = soundgoldvalue1;
    } else {
      soundgoldf = true;
      t2val = soundgoldvalue2;
    }
    soundgoldvalue1 += soundgoldvalue1 >> 4;
    soundgoldvalue2 -= soundgoldvalue2 >> 4;
  }
}

// ------------------------------------------------------------- eat monster --
let soundeatmflag = false;
let soundeatmvalue = 0;
let soundeatmduration = 0;
let soundeatmn = 0;

export function soundeatm(): void {
  soundeatmduration = 20;
  soundeatmn = 3;
  soundeatmvalue = 2000;
  soundeatmflag = true;
}

function soundeatmoff(): void {
  soundeatmflag = false;
}

function soundeatmupdate(): void {
  if (soundeatmflag) {
    if (soundeatmn !== 0) {
      if (soundeatmduration !== 0) {
        if (soundeatmduration % 4 === 1) t2val = soundeatmvalue;
        if (soundeatmduration % 4 === 3) t2val = soundeatmvalue - (soundeatmvalue >> 4);
        soundeatmduration--;
        soundeatmvalue -= soundeatmvalue >> 4;
      } else {
        soundeatmduration = 20;
        soundeatmn--;
        soundeatmvalue = 2000;
      }
    } else soundeatmflag = false;
  }
}

// ------------------------------------------------------------- digger dies --
let soundddieflag = false;
let soundddien = 0;
let soundddievalue = 0;

export function soundddie(): void {
  soundddien = 0;
  soundddievalue = 20000;
  soundddieflag = true;
}

function soundddieoff(): void {
  soundddieflag = false;
}

function soundddieupdate(): void {
  if (soundddieflag) {
    soundddien++;
    if (soundddien === 1) musicoff();
    if (soundddien >= 1 && soundddien <= 10) soundddievalue = 20000 - soundddien * 1000;
    if (soundddien > 10) soundddievalue += 500;
    if (soundddievalue > 30000) soundddieoff();
    t2val = soundddievalue;
  }
}

// --------------------------------------------------------------------- 1up --
let sound1upflag = false;
let sound1upduration = 0;

export function sound1up(): void {
  sound1upduration = 96;
  sound1upflag = true;
}

function sound1upoff(): void {
  sound1upflag = false;
}

function sound1upupdate(): void {
  if (sound1upflag) {
    if (Math.floor(sound1upduration / 3) % 2 !== 0) t2val = (sound1upduration << 2) + 600;
    sound1upduration--;
    if (sound1upduration < 1) sound1upflag = false;
  }
}

// ------------------------------------------------------------------- music --
let musicplaying = false;
let musicp = 0;
let tuneno = 0;
let noteduration = 0;
let notevalue = 0;
let musicmaxvol = 0;
let musicattackrate = 0;
let musicsustainlevel = 0;
let musicdecayrate = 0;
let musicnotewidth = 0;
let musicreleaserate = 0;
let musicstage = 0;
let musicn = 0;

// music(0) = bonus tune, music(1) = background tune, music(2) = funeral dirge
export function music(tune: number): void {
  tuneno = tune;
  musicp = 0;
  noteduration = 0;
  switch (tune) {
    case 0:
      musicmaxvol = 50;
      musicattackrate = 20;
      musicsustainlevel = 20;
      musicdecayrate = 10;
      musicreleaserate = 4;
      break;
    case 1:
      musicmaxvol = 50;
      musicattackrate = 50;
      musicsustainlevel = 8;
      musicdecayrate = 15;
      musicreleaserate = 1;
      break;
    case 2:
      musicmaxvol = 50;
      musicattackrate = 50;
      musicsustainlevel = 25;
      musicdecayrate = 5;
      musicreleaserate = 1;
  }
  musicplaying = true;
  if (tune === 2) soundddieoff();
}

export function musicon(): void {
  music(1);
}

export function musicoff(): void {
  musicplaying = false;
  musicp = 0;
}

function musicupdate(): void {
  if (!musicplaying) return;
  if (noteduration !== 0) noteduration--;
  else {
    musicstage = musicn = 0;
    switch (tuneno) {
      case 0:
        noteduration = bonusjingle[musicp + 1] * 3;
        musicnotewidth = noteduration - 3;
        notevalue = bonusjingle[musicp];
        musicp += 2;
        if (bonusjingle[musicp] === 0x7d64) musicp = 0;
        break;
      case 1:
        noteduration = backgjingle[musicp + 1] * 6;
        musicnotewidth = 12;
        notevalue = backgjingle[musicp];
        musicp += 2;
        if (backgjingle[musicp] === 0x7d64) musicp = 0;
        break;
      case 2:
        noteduration = dirge[musicp + 1] * 10;
        musicnotewidth = noteduration - 10;
        notevalue = dirge[musicp];
        musicp += 2;
        if (dirge[musicp] === 0x7d64) musicp = 0;
        break;
    }
  }
  musicn++;
  t0val = notevalue;
  if (musicn >= musicnotewidth) musicstage = 2;
  switch (musicstage) {
    case 0:
      if (musvol + musicattackrate >= musicmaxvol) {
        musicstage = 1;
        musvol = musicmaxvol;
        break;
      }
      musvol += musicattackrate;
      break;
    case 1:
      if (musvol - musicdecayrate <= musicsustainlevel) {
        musvol = musicsustainlevel;
        break;
      }
      musvol -= musicdecayrate;
      break;
    case 2:
      if (musvol - musicreleaserate <= 1) {
        musvol = 1;
        break;
      }
      musvol -= musicreleaserate;
  }
  if (musvol === 1) t0val = 0x7d00;
}

// -------------------------------------------------------------- tick & API --

// soundint of sound.c, called at 72.8 Hz by the driver.
function soundint(): void {
  if (soundpausedflag && !soundlevdoneflag) {
    applyTone(0, 0);
    return;
  }
  t0val = 0x7d00;
  t2val = 40;
  musvol = Math.max(musvol, 0);
  if (soundlevdoneflag) {
    soundlevdoneupdate();
  } else {
    if (game.musicflag) musicupdate();
    soundemeraldupdate();
    soundwobbleupdate();
    soundddieupdate();
    soundbreakupdate();
    soundgoldupdate();
    soundemupdate();
    soundexplodeupdate();
    soundfireupdate();
    soundeatmupdate();
    soundfallupdate();
    sound1upupdate();
    soundbonusupdate();
  }
  if (!game.soundflag) {
    applyTone(0, 0);
    return;
  }
  if (t2val !== 40) {
    // an effect owns the speaker this tick
    applyTone(PIT_FREQ / t2val, 1);
  } else if (t0val !== 0x7d00) {
    // music note with envelope volume
    const tv = t0val < 1000 ? 1000 : t0val;
    applyTone(PIT_FREQ / tv, Math.min(Math.max(musvol, 1), 50) / 50);
  } else {
    applyTone(0, 0);
  }
}

export function setupsound(): void {
  startDriver(soundint);
}

export function killsound(): void {
  applyTone(0, 0);
}

export function soundstop(): void {
  soundfalloff();
  soundwobbleoff();
  for (let i = 0; i < FIREBALLS; i++) soundfireoff(i);
  musicoff();
  soundbonusoff();
  for (let i = 0; i < FIREBALLS; i++) soundexplodeoff(i);
  soundbreakoff();
  soundemoff();
  soundemeraldoff();
  soundgoldoff();
  soundeatmoff();
  soundddieoff();
  sound1upoff();
}

export function soundpause(): void {
  soundpausedflag = true;
}

export function soundpauseoff(): void {
  soundpausedflag = false;
}

// Keyboard input, ported from input.c of Digger Remastered (joystick and
// second-player paths dropped; this port is single-player keyboard only).
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).
//
// Keys: arrows or WASD move, F1 or Space fires. + / - change speed,
// F7 toggles music, F9 sound, F10 or Escape exits to title, P pauses.

import { DIR_NONE, DIR_RIGHT, DIR_UP, DIR_LEFT, DIR_DOWN } from './def';
import { game } from './game/state';
import { incpenalty } from './sound/sound';

export const input = {
  escape: false,
  pausef: false,
  firepflag: false,
  akeypressed: '',
  // While true (initials entry), checkkeyb leaves the key buffer to whoever
  // is consuming raw keys — mirrors the C original where only one reader
  // calls getkey().
  captureRaw: false,
};

// Live pressed state (keydown/keyup), the "interrupt flags" of the original.
let leftpressed = false;
let rightpressed = false;
let uppressed = false;
let downpressed = false;
let f1pressed = false;

// Sticky accumulators so very short presses are not overlooked.
let aleftpressed = false;
let arightpressed = false;
let auppressed = false;
let adownpressed = false;
let af1pressed = false;
let start = false;

let dynamicdir = DIR_NONE;
let staticdir = DIR_NONE;
let keydir = 0;
let oupressed = false;
let odpressed = false;
let olpressed = false;
let orpressed = false;

const keybuf: string[] = [];

const MOVE: Record<string, 'l' | 'r' | 'u' | 'd' | 'f'> = {
  ArrowLeft: 'l',
  ArrowRight: 'r',
  ArrowUp: 'u',
  ArrowDown: 'd',
  KeyA: 'l',
  KeyD: 'r',
  KeyW: 'u',
  KeyS: 'd',
  F1: 'f',
  Space: 'f',
};

export function initkeyb(): void {
  window.addEventListener('keydown', (e) => {
    const m = MOVE[e.code];
    if (m === 'l') leftpressed = aleftpressed = true;
    if (m === 'r') rightpressed = arightpressed = true;
    if (m === 'u') uppressed = auppressed = true;
    if (m === 'd') downpressed = adownpressed = true;
    if (m === 'f') f1pressed = af1pressed = true;
    if (m !== undefined || e.code.startsWith('F1')) e.preventDefault();
    if (!e.repeat) keybuf.push(e.key);
  });
  window.addEventListener('keyup', (e) => {
    const m = MOVE[e.code];
    if (m === 'l') leftpressed = false;
    if (m === 'r') rightpressed = false;
    if (m === 'u') uppressed = false;
    if (m === 'd') downpressed = false;
    if (m === 'f') f1pressed = false;
  });
  window.addEventListener('blur', () => {
    leftpressed = rightpressed = uppressed = downpressed = f1pressed = false;
  });
}

export function kbhit(): boolean {
  return keybuf.length > 0;
}

export function getkey(): string {
  return keybuf.shift() ?? '';
}

// Per-frame key processing (checkkeyb of input.c).
export function checkkeyb(): void {
  if (input.captureRaw) return;
  while (kbhit()) {
    const k = getkey();
    input.akeypressed = k;
    switch (k) {
      case '+':
      case '=':
        if (game.ftime > 10000) game.ftime -= 10000;
        break;
      case '-':
        game.ftime += 10000;
        break;
      case 'F7':
        game.musicflag = !game.musicflag;
        break;
      case 'F9':
        game.soundflag = !game.soundflag;
        break;
      case 'F10':
      case 'Escape':
        input.escape = true;
        break;
      case 'p':
      case 'P':
        input.pausef = true;
        break;
    }
    if (k !== 'Escape' && k !== 'n' && k !== 'N') start = true;
  }
}

export function teststart(): boolean {
  if (start) {
    start = false;
    return true;
  }
  return false;
}

export function flushkeybuf(): void {
  keybuf.length = 0;
  aleftpressed = arightpressed = auppressed = adownpressed = af1pressed = false;
}

export function clearfire(_n: number): void {
  af1pressed = false;
}

export function readdirect(_n: number): void {
  let u = false;
  let d = false;
  let l = false;
  let r = false;
  if (auppressed || uppressed) {
    u = true;
    auppressed = false;
  }
  if (adownpressed || downpressed) {
    d = true;
    adownpressed = false;
  }
  if (aleftpressed || leftpressed) {
    l = true;
    aleftpressed = false;
  }
  if (arightpressed || rightpressed) {
    r = true;
    arightpressed = false;
  }
  if (f1pressed || af1pressed) {
    input.firepflag = true;
    af1pressed = false;
  } else input.firepflag = false;
  if (u && !oupressed) staticdir = dynamicdir = DIR_UP;
  if (d && !odpressed) staticdir = dynamicdir = DIR_DOWN;
  if (l && !olpressed) staticdir = dynamicdir = DIR_LEFT;
  if (r && !orpressed) staticdir = dynamicdir = DIR_RIGHT;
  if (
    (oupressed && !u && dynamicdir === DIR_UP) ||
    (odpressed && !d && dynamicdir === DIR_DOWN) ||
    (olpressed && !l && dynamicdir === DIR_LEFT) ||
    (orpressed && !r && dynamicdir === DIR_RIGHT)
  ) {
    dynamicdir = DIR_NONE;
    if (u) dynamicdir = staticdir = DIR_UP;
    if (d) dynamicdir = staticdir = DIR_DOWN;
    if (l) dynamicdir = staticdir = DIR_LEFT;
    if (r) dynamicdir = staticdir = DIR_RIGHT;
  }
  oupressed = u;
  odpressed = d;
  olpressed = l;
  orpressed = r;
  keydir = staticdir;
  if (dynamicdir !== DIR_NONE) keydir = dynamicdir;
  staticdir = DIR_NONE;
  void incpenalty;
}

export function getdirect(_n: number): number {
  return keydir;
}

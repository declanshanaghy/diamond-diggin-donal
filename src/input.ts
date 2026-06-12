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
  // Splash demo mode: when set, getdirect returns this direction instead of
  // keyboard input.
  autopilot: null as number | null,
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
    if (m !== undefined && m !== 'f') touchdir = null; // keyboard overrides swipe
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

// Touch controls: swipe anywhere to steer (Donal keeps digging in the last
// swiped direction), tap to fire. Any touch also counts as "press any key",
// and a tap types an A during initials entry so the high-score table works
// without a keyboard. Keyboard input overrides the remembered swipe.
let touchdir: number | null = null;
export function initTouch(): void {
  const SWIPE_PX = 24;
  let sx = 0;
  let sy = 0;
  let tracking = false;
  window.addEventListener(
    'pointerdown',
    (e) => {
      sx = e.clientX;
      sy = e.clientY;
      tracking = true;
      start = true;
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerup',
    (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) < SWIPE_PX && Math.abs(dy) < SWIPE_PX) {
        // tap = fire; during initials entry a tap summons the OS keyboard
        if (input.captureRaw) {
          focusInitials();
          return;
        }
        af1pressed = true;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) touchdir = dx > 0 ? DIR_RIGHT : DIR_LEFT;
      else touchdir = dy > 0 ? DIR_DOWN : DIR_UP;
    },
    { passive: true }
  );
}

// Hidden text input used during initials entry so mobile devices show the
// OS keyboard. Its events feed the same key buffer; stopPropagation keeps
// physical keyboards from double-typing via the window handler.
let initInput: HTMLInputElement | null = null;

function ensureInitInput(): HTMLInputElement {
  if (!initInput) {
    const el = document.createElement('input');
    el.type = 'text';
    el.autocapitalize = 'characters';
    el.autocomplete = 'off';
    el.setAttribute('aria-hidden', 'true');
    el.style.position = 'fixed';
    el.style.bottom = '0';
    el.style.left = '50%';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.opacity = '0';
    el.style.border = 'none';
    document.body.appendChild(el);
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        keybuf.push('Backspace');
      }
    });
    el.addEventListener('input', () => {
      for (const ch of el.value) keybuf.push(ch);
      el.value = '';
    });
    initInput = el;
  }
  return initInput;
}

export function focusInitials(): void {
  ensureInitInput().focus();
}

export function blurInitials(): void {
  initInput?.blur();
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
  if (input.autopilot !== null) return input.autopilot;
  if (keydir === DIR_NONE && touchdir !== null) return touchdir;
  return keydir;
}

// Main game flow, ported from main.c of Digger Remastered. The C code blocks
// inside newframe(); here every `yield` is one simulation frame (ftime µs,
// 80000 = 12.5 fps), driven by the requestAnimationFrame accumulator below.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

import { DIR_LEFT, DIR_RIGHT, FIRSTBAG, FIRSTDIGGER, FIRSTMONSTER } from '../def';
import {
  creatembspr,
  initmbspr,
  drawstatics,
  makefield,
  savefield,
  drawmon,
  drawdigger,
  drawgold,
  drawemerald,
  drawbonus,
  drawlives,
} from '../drawing';
import { movedrawspr } from '../sprite';
import { clearScreen, render } from '../video/screen';
import { outtext } from '../video/text';
import { game } from './state';
import { seedrand } from './rng';
import {
  initdigger,
  dodigger,
  erasediggers,
  countem,
  makeemfield,
  drawemeralds,
  digalive,
  isalive,
  killfire,
  erasebonus,
  initlives,
  declife,
  getlives,
  setBonusVisible,
} from './digger';
import { initmonsters, domonsters, erasemonsters, monleft, incmont } from './monster';
import { initbags, drawbags, dobags, getnmovingbags, cleanupbags } from './bags';
import {
  loadscores,
  zeroscores,
  initscores,
  drawscores,
  addscore,
  endofgame,
  showtable,
} from './scores';
import {
  input,
  initkeyb,
  checkkeyb,
  teststart,
  flushkeybuf,
  readdirect,
} from '../input';
import {
  musicon,
  musicoff,
  soundstop,
  soundlevdone,
  soundpause,
  soundpauseoff,
} from '../sound/sound';
import { drawtitle } from './title';

type Frames = Generator<void, void, void>;

function getalllives(): number {
  let t = 0;
  for (let i = game.curplayer; i < game.diggers + game.curplayer; i++) t += getlives(i);
  return t;
}

function initlevel(): void {
  game.players[game.curplayer].levdone = false;
  makefield();
  makeemfield();
  initbags();
  game.levnotdrawn = true;
}

function drawscreen(): void {
  creatembspr();
  drawstatics();
  drawbags();
  drawemeralds();
  initdigger();
  initmonsters();
}

function initchars(): void {
  initmbspr();
  initdigger();
  initmonsters();
}

function checklevdone(): void {
  game.players[game.curplayer].levdone =
    (countem() === 0 || monleft() === 0) && isalive();
}

function* testpause(): Frames {
  if (input.pausef) {
    soundpause();
    cleartopline();
    outtext('PRESS ANY KEY', 80, 0, 1);
    flushkeybuf();
    while (!teststart()) yield;
    cleartopline();
    drawscores();
    for (let i = 0; i < game.diggers; i++) addscore(i, 0);
    drawlives();
    input.pausef = false;
  } else soundpauseoff();
}

function cleartopline(): void {
  outtext('                          ', 0, 0, 3);
  outtext(' ', 308, 0, 3);
}

export function* gameflow(): Frames {
  initlives();
  game.players[0].level = game.startlev;
  game.alldead = false;
  clearScreen();
  game.curplayer = 0;
  initlevel();
  zeroscores();
  setBonusVisible(true);
  while (getalllives() !== 0 && !input.escape) {
    while (!game.alldead && !input.escape) {
      initmbspr();
      seedrand(Math.floor(performance.now()));
      if (game.levnotdrawn) {
        game.levnotdrawn = false;
        drawscreen();
        yield;
      } else initchars();
      outtext('        ', 108, 0, 3);
      initscores();
      drawlives();
      musicon();
      flushkeybuf();
      for (let i = 0; i < game.diggers; i++) readdirect(i);
      while (!game.alldead && !game.players[game.curplayer].levdone && !input.escape) {
        game.penalty = 0;
        dodigger();
        domonsters();
        dobags();
        if (game.penalty > 8) incmont(game.penalty - 8);
        yield* testpause();
        checklevdone();
        yield;
      }
      erasediggers();
      musicoff();
      let t = 20;
      while ((getnmovingbags() !== 0 || t !== 0) && !input.escape) {
        if (t !== 0) t--;
        game.penalty = 0;
        dobags();
        dodigger();
        domonsters();
        if (game.penalty < 8) t = 0;
        yield;
      }
      soundstop();
      for (let i = 0; i < game.diggers; i++) killfire(i);
      erasebonus();
      cleanupbags();
      savefield();
      erasemonsters();
      if (game.players[game.curplayer].levdone) yield* soundlevdone();
      if (countem() === 0 || game.players[game.curplayer].levdone) {
        for (let i = game.curplayer; i < game.diggers + game.curplayer; i++)
          if (getlives(i) > 0 && !digalive(i)) declife(i);
        drawlives();
        game.players[game.curplayer].level++;
        if (game.players[game.curplayer].level > 1000) game.players[game.curplayer].level = 1000;
        initlevel();
      } else if (game.alldead) {
        for (let i = game.curplayer; i < game.curplayer + game.diggers; i++)
          if (getlives(i) > 0) declife(i);
        drawlives();
      }
      if (game.alldead && getalllives() === 0 && !input.escape) yield* endofgame();
    }
    game.alldead = false;
  }
}

// Title screen with the sprite parade, ported from mainprog() of main.c.
export function* mainprog(): Frames {
  loadscores();
  input.escape = false;
  do {
    soundstop();
    creatembspr();
    clearScreen();
    drawtitle();
    outtext('ONE', 220, 25, 3);
    outtext(' PLAYER ', 192, 39, 3);
    showtable();
    let frame = 0;
    let x = 0;
    yield;
    teststart();
    let started = false;
    while (!started) {
      started = teststart();
      if (frame === 0) for (let t = 54; t < 174; t += 12) outtext('            ', 164, t, 0);
      if (frame === 50) {
        movedrawspr(FIRSTMONSTER, 292, 63);
        x = 292;
      }
      if (frame > 50 && frame <= 77) {
        x -= 4;
        drawmon(0, true, DIR_LEFT, x, 63);
      }
      if (frame > 77) drawmon(0, true, DIR_RIGHT, 184, 63);
      if (frame === 83) outtext('NOBBIN', 216, 64, 2);
      if (frame === 90) {
        movedrawspr(FIRSTMONSTER + 1, 292, 82);
        drawmon(1, false, DIR_LEFT, 292, 82);
        x = 292;
      }
      if (frame > 90 && frame <= 117) {
        x -= 4;
        drawmon(1, false, DIR_LEFT, x, 82);
      }
      if (frame > 117) drawmon(1, false, DIR_RIGHT, 184, 82);
      if (frame === 123) outtext('HOBBIN', 216, 83, 2);
      if (frame === 130) {
        movedrawspr(FIRSTDIGGER, 292, 101);
        drawdigger(0, DIR_LEFT, 292, 101, true);
        x = 292;
      }
      if (frame > 130 && frame <= 157) {
        x -= 4;
        drawdigger(0, DIR_LEFT, x, 101, true);
      }
      if (frame > 157) drawdigger(0, DIR_RIGHT, 184, 101, true);
      if (frame === 163) outtext('DONAL', 222, 102, 2);
      if (frame === 178) {
        movedrawspr(FIRSTBAG, 184, 120);
        drawgold(0, 0, 184, 120);
      }
      if (frame === 183) outtext('GOLD', 216, 121, 2);
      if (frame === 198) drawemerald(184, 141);
      if (frame === 203) outtext('DIAMOND', 216, 140, 2);
      if (frame === 218) drawbonus(184, 158);
      if (frame === 223) outtext('BONUS', 216, 159, 2);
      yield;
      frame++;
      if (frame > 250) frame = 0;
    }
    if (input.escape) break;
    yield* gameflow();
    input.escape = false;
  } while (true);
}

// Frame driver: advances the generator at ftime intervals, renders every rAF.
export function startLoop(): void {
  initkeyb();
  const gen = mainprog();
  let acc = 0;
  let last = performance.now();
  function tick(now: number): void {
    acc += now - last;
    last = now;
    const stepMs = game.ftime / 1000;
    // Never let the accumulator run away on a background tab.
    if (acc > stepMs * 10) acc = stepMs * 10;
    while (acc >= stepMs) {
      acc -= stepMs;
      checkkeyb();
      if (gen.next().done) return;
    }
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

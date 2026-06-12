// Temporary chunk-5 smoke test: render level 1 statics — dirt, tunnels,
// diamonds, bags, status bar. Replaced by the real game boot as chunks land.

import { MWIDTH, MHEIGHT } from './def';
import { initScreen, render, clearScreen } from './video/screen';
import { outtext } from './video/text';
import {
  makefield,
  drawstatics,
  drawemerald,
  drawgold,
  drawlives,
  creatembspr,
} from './drawing';
import { getlevch } from './game/level';
import { levplan } from './game/level';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
initScreen(canvas);
clearScreen();

creatembspr();
makefield();
drawstatics();

// Diamonds and bags from the level plan (placement mirrors digger.c/bags.c init).
let bag = 0;
for (let y = 0; y < MHEIGHT; y++)
  for (let x = 0; x < MWIDTH; x++) {
    const c = getlevch(x, y, levplan());
    if (c === 'C') drawemerald(x * 20 + 12, y * 18 + 21);
    if (c === 'B' && bag < 7) drawgold(bag++, 0, x * 20 + 12, y * 18 + 18);
  }

outtext('00000', 0, 0, 3);
drawlives();

function frame(): void {
  render();
  requestAnimationFrame(frame);
}
frame();

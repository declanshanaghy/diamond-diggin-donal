// Temporary visual smoke test for the video layer: tiles dirt and draws a
// sampler of extracted sprites. Replaced by the real game boot as chunks land.

import { cgaSprites } from './assets/sprites';
import { initScreen, putImage, render, setIntensity } from './video/screen';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
initScreen(canvas);
setIntensity(1);

const draw = (n: number, x: number, y: number, wBytes = 4, h = 15) =>
  putImage(x, y, cgaSprites[n].data, cgaSprites[n].mask, wBytes, h);

// Dirt background à la drawbackg(): sprite 93+l is a 20x4 pattern tiled
// every 20px horizontally and 4px vertically from y=14.
for (let y = 14; y < 200; y += 4)
  for (let x = 0; x < 320; x += 20) draw(94, x, y, 5, 4);

// Sampler row: digger walk frames, nobbin, hobbin, bag, gold, diamond, cherry.
const sampler = [0, 1, 2, 56, 69, 70, 71, 73, 62, 65, 66, 67, 68, 108, 81];
sampler.forEach((n, i) => draw(n, 16 + i * 20, 40));

// Graves
[57, 58, 59, 60, 61].forEach((n, i) => draw(n, 16 + i * 20, 80));

// Fireballs (8x8, wBytes=2)
[82, 83, 84, 85, 86, 87].forEach((n, i) => draw(n, 16 + i * 12, 120, 2, 8));

function frame(): void {
  render();
  requestAnimationFrame(frame);
}
frame();

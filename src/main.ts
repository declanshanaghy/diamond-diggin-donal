// Diamond Diggin' Donal — boot.

import { initScreen } from './video/screen';
import { startLoop } from './game/loop';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
initScreen(canvas);
startLoop();

// Diamond Diggin' Donal — boot.

import { initScreen } from './video/screen';
import { startLoop } from './game/loop';
import { setupsound } from './sound/sound';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
initScreen(canvas);
setupsound();
startLoop();

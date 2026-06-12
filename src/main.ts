// Diamond Diggin' Donal — boot.

import { initScreen } from './video/screen';
import { startLoop } from './game/loop';
import { setupsound } from './sound/sound';
import { donalize } from './assets/donalize';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
donalize();
initScreen(canvas);
setupsound();
startLoop();

// Dev console probe (harmless in production).
import { game } from './game/state';
import { input } from './input';
import * as digger from './game/digger';
(window as unknown as Record<string, unknown>).__ddd = { game, input, digger };

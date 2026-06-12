// PC-speaker emulation on WebAudio: one square-wave oscillator whose
// frequency/volume are updated at 72.8 Hz (timer0 divisor 0x4000), exactly
// the rate the sound state machines of Digger Remastered run at.
// Derived from newsnd.c/sound.c, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

const PIT_FREQ = 1193181;
const TICK_HZ = PIT_FREQ / 0x4000; // 72.83 Hz
const MASTER = 0.06; // PC speakers were not subtle; we can be

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;
let timer: number | null = null;
let tickFn: (() => void) | null = null;

export function startDriver(tick: () => void): void {
  tickFn = tick;
  if (timer === null) timer = window.setInterval(() => tickFn && tickFn(), 1000 / TICK_HZ);
  // Audio can only start (and on mobile, restart after interruptions) inside
  // a user gesture, so keep these listeners for the whole session and resume
  // whenever the context is not running.
  const ensureAudio = (): void => {
    if (!ctx) {
      ctx = new AudioContext();
      osc = ctx.createOscillator();
      osc.type = 'square';
      gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    }
    if (ctx.state !== 'running') void ctx.resume();
  };
  window.addEventListener('keydown', ensureAudio);
  window.addEventListener('pointerdown', ensureAudio);
  window.addEventListener('touchstart', ensureAudio, { passive: true });
}

// Apply one tick's outcome: a tone frequency in Hz (0 = silence) and a
// volume in [0,1] (the PWM pulse-width level of the original).
export function applyTone(freq: number, vol: number): void {
  if (!ctx || !osc || !gain || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  if (freq > 0 && freq < 20000) {
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setTargetAtTime(MASTER * vol, t, 0.002);
  } else {
    gain.gain.setTargetAtTime(0, t, 0.002);
  }
}

export function stopDriver(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  applyTone(0, 0);
}

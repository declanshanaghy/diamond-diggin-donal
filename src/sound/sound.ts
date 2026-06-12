// Sound interface. The per-frame effect state machines and the music
// sequencer are ported from sound.c in the sound chunk; until then these are
// typed no-ops so game logic can call them faithfully.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

export function incpenalty(): void {}
export function soundem(): void {}
export function soundemerald(_n: number): void {}
export function soundgold(): void {}
export function soundeatm(): void {}
export function soundddie(): void {}
export function soundbreak(): void {}
export function soundwobble(): void {}
export function soundfire(_n: number): void {}
export function soundexplode(_n: number): void {}
export function sound1up(): void {}
export function soundbonus(): void {}
export function soundlevdone(): void {}
export function soundfall(): void {}
export function musicon(): void {}
export function musicoff(): void {}
export function setupsound(): void {}
export function killsound(): void {}
export function soundstop(): void {}
export function soundpause(): void {}

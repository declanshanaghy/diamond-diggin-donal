// Replaces the digger walk/fire frames (sprite indices 1..24) with a pixel
// portrait of Donal: light hair, wire-rimmed glasses, a friendly smile, and
// his shirt. Direction is shown by where the eyes look, the walk cycle by
// the feet, and "fire ready" by the big grin. Death/grave frames (25..30)
// keep the original art. Sprite dimensions (16x15) and timing are untouched.
//
// CGA palette 0 colors: 1 = green (shirt), 2 = red (mouth), 3 = light
// (hair/skin — the brightest the palette offers).

import { cgaSprites } from './sprites';

// Template legend: '.' transparent, 'K' opaque black, '1' '2' '3' colors.
// Eye pupils are placed per direction inside the lens interiors.

type Dir = 'right' | 'up' | 'left' | 'down';

function face(dir: Dir, loaded: boolean, step: boolean): string[] {
  // Lens interiors are cols 3-5 (left eye) and 10-12 (right eye) on row 6.
  const pupil = { right: 2, left: 0, up: 1, down: 1 }[dir];
  const lens = (off: number): string =>
    '333'.slice(0, off) + 'K' + '333'.slice(off + 1);
  const eyeRow = `33K${lens(pupil)}KKKK${lens(pupil)}K33`;
  const mouth = loaded
    ? ['.333KK3333KK333.', '..33KKKKKKKK33..'] // big grin
    : ['.33333333333333.', '..33KKKKKKKK33..']; // modest smile
  const feet = step ? '.111........111.' : '..111......111..';
  return [
    '....33333333....', // 0 hair
    '..333333333333..', // 1 hair
    '.33333333333333.', // 2 hair
    '.33KKKKKKKKKK33.', // 3 hairline
    '.33333333333333.', // 4 forehead
    '.3KKKKK33KKKKK3.', // 5 glasses top rims
    eyeRow, //             6 lenses + bridge + pupils
    '.3KKKKK33KKKKK3.', // 7 glasses bottom rims
    '.33333333333333.', // 8 cheeks
    mouth[0], //           9 mouth top
    mouth[1], //          10 mouth bottom
    '..333333333333..', // 11 chin
    '.11111111111111.', // 12 shirt
    '.11111111111111.', // 13 shirt
    feet, //              14 feet
  ];
}

// Squashed/dying Donal (sprite 25, drawn while crushed, during the death
// bounce, and as the first morph toward the gravestone): eyes shut behind
// the glasses, a frown, flattened into the ground.
function hurtFace(): string[] {
  return [
    '................',
    '................',
    '................',
    '................',
    '................',
    '....33333333....',
    '..333333333333..',
    '.33KKKKKKKKKK33.',
    '.3KKKKK33KKKKK3.',
    '33K3K3KKKK3K3K33',
    '.3KKKKK33KKKKK3.',
    '.33333333333333.',
    '..33KKKKKKKK33..',
    '.333KK3333KK333.',
    '.11111111111111.',
  ];
}

function encode(rows: string[]): { data: Uint8Array; mask: Uint8Array } {
  const data = new Uint8Array(4 * 15);
  const mask = new Uint8Array(4 * 15);
  for (let r = 0; r < 15; r++)
    for (let b = 0; b < 4; b++) {
      let d = 0;
      let m = 0;
      for (let p = 0; p < 4; p++) {
        const ch = rows[r][b * 4 + p];
        const shift = 6 - p * 2;
        if (ch === '.') m |= 3 << shift;
        else if (ch !== 'K') d |= parseInt(ch, 10) << shift;
      }
      data[r * 4 + b] = d;
      mask[r * 4 + b] = m;
    }
  return { data, mask };
}

export function donalize(): void {
  const dirs: Dir[] = ['right', 'up', 'left', 'down'];
  // drawdigger: sprite = (t + (loaded ? 0 : 1)) * 3 + animframe + 1,
  // t = 0/2/4/6 for right/up/left/down → loaded frames 1-3, 7-9, 13-15,
  // 19-21; unloaded 4-6, 10-12, 16-18, 22-24. Anim frames 0,1,2 ping-pong.
  for (let d = 0; d < 4; d++)
    for (const loaded of [true, false])
      for (let anim = 0; anim < 3; anim++) {
        const idx = (d * 2 + (loaded ? 0 : 1)) * 3 + anim + 1;
        cgaSprites[idx] = encode(face(dirs[d], loaded, anim === 1));
      }
  cgaSprites[25] = encode(hurtFace());
}

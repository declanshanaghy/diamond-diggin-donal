// Title screen backdrop. Placeholder until the branded title chunk; the
// original decompresses a full-screen title image (title_gz.c).

import { outtext } from '../video/text';

export function drawtitle(): void {
  outtext('DIAMOND', 76, 70, 1);
  outtext('DIGGIN', 100, 84, 2);
  outtext('DONAL', 112, 98, 3);
  outtext('PRESS ANY KEY', 82, 180, 3);
}

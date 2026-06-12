// Title screen branding. The original drew a full-screen DIGGER logo
// (title_gz.c); diamond-diggin-donal gets its own logo in the same chunky
// CGA style, with the high-score table and sprite parade in their original
// positions.

import { outtext, outtextScaled } from '../video/text';
import { drawemerald } from '../drawing';

export function drawtitle(): void {
  // Big logo line: DIAMOND in cyan, flanked by a pair of diamonds.
  outtextScaled('DIAMOND', 76, 0, 1, 2);
  drawemerald(48, 7);
  drawemerald(256, 7);
  // Sub-line in magenta along the free bottom band.
  outtext('DIGGIN DONAL', 88, 187, 2);
}

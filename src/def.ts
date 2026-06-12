// Core constants ported from def.h of Digger Remastered.
// Copyright (c) Andrew Jenner 1998-2004. License: GNU GPL v2 (see LICENSE).

export const DIR_NONE = -1;
export const DIR_RIGHT = 0;
export const DIR_UP = 2;
export const DIR_LEFT = 4;
export const DIR_DOWN = 6;

export const TYPES = 5;

export const BONUSES = 1;
export const BAGS = 7;
export const MONSTERS = 6;
export const DIGGERS = 1; // original 1983 game: single player (C source supports 2)
export const FIREBALLS = DIGGERS;
export const SPRITES = BONUSES + BAGS + MONSTERS + FIREBALLS + DIGGERS;

// Sprite slot order. By LAST I mean last+1.
export const FIRSTBONUS = 0;
export const LASTBONUS = FIRSTBONUS + BONUSES;
export const FIRSTBAG = LASTBONUS;
export const LASTBAG = FIRSTBAG + BAGS;
export const FIRSTMONSTER = LASTBAG;
export const LASTMONSTER = FIRSTMONSTER + MONSTERS;
export const FIRSTFIREBALL = LASTMONSTER;
export const LASTFIREBALL = FIRSTFIREBALL + FIREBALLS;
export const FIRSTDIGGER = LASTFIREBALL;
export const LASTDIGGER = FIRSTDIGGER + DIGGERS;

export const MWIDTH = 15;
export const MHEIGHT = 10;
export const MSIZE = MWIDTH * MHEIGHT;

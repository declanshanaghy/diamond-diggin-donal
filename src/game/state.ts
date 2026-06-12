// Central mutable game state (the globals of main.c et al, gathered in one
// object like sobomax's `dgstate` refactor). Grows as modules are ported.
// Derived from Digger Remastered, Copyright (c) Andrew Jenner 1998-2004.
// License: GNU GPL v2 (see LICENSE).

export interface PlayerData {
  level: number;
  lives: number;
  score: number;
}

export const game = {
  curplayer: 0,
  nplayers: 1,
  diggers: 1,
  gauntlet: false,
  levfflag: false, // external level file loaded (unused in this port)
  players: [{ level: 1, lives: 3, score: 0 }] as PlayerData[],
};

export function levof10(): number {
  const l = game.players[game.curplayer].level;
  return l > 10 ? 10 : l;
}

export function levno(): number {
  return game.players[game.curplayer].level;
}

export function getlives(pl: number): number {
  return game.players[pl]?.lives ?? 0;
}

# Diamond Diggin' Donal 💎

A faithful web clone of **Digger** (Windmill Software, 1983). Donal digs tunnels,
dodges Nobbins and Hobbins, drops gold bags on his enemies, and collects
**diamonds** — his goal in life is to dig the most diamonds ever and beat his
high score.

Play it: https://declanshanaghy.github.io/diamond-diggin-donal/

## Fidelity

The game logic, sprite data, level layouts, music, and sound effects are ported
to TypeScript from the GPL **Digger Remastered** C source, reverse engineered
from the 1983 original by Andrew Jenner. Gameplay aims to be pixel- and
behavior-exact, rendered in the authentic CGA 4-color look at 320×200.

Deviations from the original, by design:

- The hero is **Donal** (likeness of the real Donal, in glorious CGA).
- Emeralds are **diamonds**.
- The title screen says so.

## Controls

- **Arrow keys / WASD** — move
- **F1 / Space** — fire

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build
npm run extract  # regenerate src/assets/* from the GPL reference source
```

## Credits & License

- Original game: Windmill Software (1983).
- [Digger Remastered](https://digger.org) by Andrew Jenner — the GPL source
  this port derives from.
- This project is licensed under the **GNU GPL v2** (see [LICENSE](LICENSE)),
  as a derivative work of Digger Remastered.

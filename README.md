# Costume Caper

Costume Caper is a 2D pixel-art adventure game built with Phaser and Vite. Players must sneak past monsters in a haunted mansion, collect keys, use the right disguises, recover the mask, and escape.

## Features

- Pixel-art graphics rendered at an internal resolution of 320 x 180.
- A tilemap created with Tiled and loaded from `public/assets/maps/mansion.json`.
- Three disguises:
  - Ghost: fools ghosts.
  - Skeleton: fools skeleton guards.
  - Witch: opens magic doors.
- Enemies with patrol, chase, search, and dash behaviors.
- Keys and costumes randomized using the level seed.
- A stamina system for sprinting.
- 8-bit audio generated with the Web Audio API, with no external audio files required.
- A menu, HUD, victory/defeat screens, and sound toggle.

## Requirements

- Node.js 18 or later.
- npm.

## Installation

```bash
npm install
```

## Development server

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Production build

```bash
npm run build
```

## Preview the production build

```bash
npm run preview
```

## Controls

### Menu

- `W` / `S`: navigate the selection.
- `Enter`: select.
- `H`: open the guide.
- `R`: retry from the end screens.

### Gameplay

- `W` / `A` / `S` / `D` or the arrow keys: move.
- `Shift`: hold to sprint.
- `1`, `2`, `3`: toggle the corresponding disguise.

The goal is to collect enough keys to open the chests, recover the mask, and reach the exit. Wearing the correct disguise near an enemy helps you avoid detection or pass guarded areas.

## Project structure

```text
.
├── public/
│   └── assets/
│       ├── characters/       # Character sprites
│       ├── costumes/         # Hair, hats, and outfits
│       ├── maps/             # Tilemap JSON and Tiled source files
│       └── tiles/             # Dungeon tileset
├── src/
│   ├── entities/             # Player and Enemy
│   ├── scenes/               # Boot, preload, menu, game, and end scenes
│   ├── systems/              # Costume, loot, detection, and audio systems
│   ├── ui/                   # HUD and runtime-generated pixel textures
│   ├── main.js               # Phaser configuration and bootstrap
│   └── style.css             # Canvas layout and presentation
├── index.html
├── package.json
└── package-lock.json
```

## Runtime architecture

Phaser starts the scenes in the following order:

1. `BootScene`: initializes the starting environment.
2. `PreloadScene`: loads the tilemap, tileset, and sprites.
3. `MenuScene`: displays the main menu and guide.
4. `GameScene`: handles the map, player, enemies, keys, chests, doors, and exit.
5. `EndScene`: displays the result, time, and options to continue playing.

Assets in `public/` are served directly using paths beginning with `assets/`. Image assets are loaded by `PreloadScene`; small textures such as the key icon, lock icon, and vignette effect are generated at runtime.

## Technologies

- [Phaser](https://phaser.io/) `^4.2.1`
- [Vite](https://vite.dev/) `^8.3.4`
- JavaScript ES modules
- Web Audio API
- Tiled JSON tilemap

## Content development

### Editing the map

The runtime map file is `public/assets/maps/mansion.json`. If you edit the map with Tiled, update the corresponding JSON file and ensure the tileset still points to `../tiles/dungeon-tiles.png`.

Objects in the `Objects` layer are read by `GameScene` through the `kind` property. Supported values include `chest`, `door`, `enemy`, `mask`, `exit`, and `keySpot`.

### Adding or changing disguises

Disguises are defined in `src/systems/CostumeSystem.js`. When adding a new asset:

1. Place the asset in `public/assets/`.
2. Load the asset in `src/scenes/PreloadScene.js`.
3. Add its definition to `COSTUMES`.
4. Update `COSTUME_ORDER` and the detection logic if necessary.
5. Update the HUD or controls if the number of disguises changes.

### Audio

Gameplay audio is synthesized in `src/systems/Sfx.js`, so no `.mp3` or `.wav` files are needed for the existing effects.

## Asset sources and licenses

The assets used in `public/assets/` come from the following sources:

1. **Modular Pixel Character Clothing Pack — RealHumanName**  
   https://realhumanname.itch.io/modular-pixel-character-clothing-pack

   Used as the source for character clothing and accessories. Sprites should be checked for layer compatibility and viewing direction before being added or changed in the game.

2. **Tiny Dungeon — Kenney**  
   https://kenney-assets.itch.io/tiny-dungeon

   A free tileset released under the **CC0** license, used as the foundation for dungeon walls, floors, corridors, and environment.

When distributing or publishing the project, follow the terms of each asset source and retain appropriate attribution if required by the license or the publishing page.

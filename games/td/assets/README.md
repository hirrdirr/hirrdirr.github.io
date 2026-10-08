# Core Defense assets

This directory is the canonical home for visual and audio-ready game assets used by `games/td`.

## Directory structure

- `environment/vegetation/` — bushes, grass, trees and other foliage
- `environment/rocks/` — stones, cliffs and rock props
- `environment/lights/` — lamps, torches and other light-source sprites
- `environment/props/` — crates, barrels, pipes, fences and miscellaneous map props
- `towers/` — tower sprites and tower-specific visual assets
- `enemies/` — enemy and boss sprites
- `projectiles/` — bullets, missiles, beams and other projectile sprites
- `effects/` — explosions, hit effects, particles and temporary visual effects
- `maps/` — map-specific backgrounds, tiles, overlays and decorative layers
- `ui/` — icons and game UI artwork

## Naming convention

Use lowercase snake_case names and keep related variants numbered consistently.

Examples:

- `bush_01.png`
- `bush_02.png`
- `rock_large_01.png`
- `lamp_warm_01.png`
- `tower_sniper_01.png`
- `enemy_tank_01.png`
- `projectile_plasma_01.png`
- `effect_explosion_01.png`

Avoid filenames such as `final.png`, `new2.png` or `bush-final-final.png`.

## Asset workflow

1. New TD graphics should be placed in this directory rather than beside the game code.
2. Reuse an existing asset when it fits before introducing a near-duplicate.
3. Keep assets from the same visual set/style together so maps remain visually coherent.
4. Prefer transparent PNG/WebP/SVG where appropriate. Pixel-art sprites should keep hard edges and should not be unintentionally smoothed when rendered.
5. Map-specific art belongs in `maps/`; reusable scenery belongs in `environment/`.
6. When adding third-party assets, verify the license and keep attribution/license notes alongside the relevant asset pack when required.
7. Do not move or rename existing runtime files solely for organization unless their imports/references are updated and tested in the same change.

## Future graphics work

When changing the game's visuals, treat this folder as the default asset library. New bushes, lights, animated props, towers, enemies, map decorations and UI graphics should be added here and referenced from the renderer/game code as needed.

The folder structure itself does not change current game behavior; it is intentionally safe to introduce before new graphical assets are added.

## Start menu artwork

`ui/core_defense_menu_01.png` is the original 1672 × 941 Core Defense menu artwork
provided by the repository owner on 2026-10-08 as `Core Defense_ Meadow Path.png`.
The supplied PNG is used unchanged; no third-party assets were fetched for this menu.

The five clickable areas are real HTML buttons positioned in `../menu.css` as
percentages of the artwork. Both the image and buttons share the same container.
Small screens crop the outer scenery while keeping the central controls visible.
Keep this coordinate system when replacing the image or adding menu actions.
The map and difficulty labels baked into the artwork are a visual preview;
the current game map and rules still apply.

## Enemy walk sprites

The repository owner's supplied sheets are used unchanged:

| File | Existing enemy kind | Frame layout | Draw size |
| --- | --- | --- | --- |
| `enemies/goblin_walk_4f.png` | `normal` (basic) | Four 192 × 192 frames in one 768 × 192 row | 36 × 36 world pixels |
| `enemies/ogre_walk_4f.png` | `tank` (brute) | Four 256 × 256 frames in one 1024 × 256 row | 52 × 52 world pixels |

`../js/enemy-sprites.js` owns asset paths, frame geometry, draw sizes and stride.
Frames advance every 8 world pixels for the goblin and 7 for the ogre: roughly
7 and 5 frames per second at their base speeds. Movement-driven cycles respond
automatically to pause, speed controls and slow effects. Sprites remain upright,
flip horizontally when moving left, and keep their facing on vertical segments.
Canvas smoothing is disabled only for the sprite draw; source PNGs and gameplay
hitboxes are unchanged. Other enemy kinds retain their existing Canvas art.

To add another compatible horizontal sheet, add an entry keyed by the existing
enemy kind in `ENEMY_SPRITES`. Images load once, validate their dimensions and
fall back to procedural art if loading fails. No third-party art was downloaded
for this integration.

# Ball

Canvas arcade game at `/games/dxball/`, embedded in the site's Jekyll layout.
No build step or runtime dependencies.

## Bank shots and powerups

- Launching or returning from the paddle arms a bank opportunity. Hit a side
  wall before the first brick to charge it; the gold brackets and `BANK REDO`
  indicate a charged ball.
- The first breakable brick takes **+1 damage**, with **+30 base points** scaled
  by the combo multiplier earned on that hit. Heavy Ball adds its usual damage;
  Pierce continues through the brick. Metal consumes the opportunity without
  taking damage. Another paddle return is required to rearm it.
- Satellites, turrets and mystery chains keep their own damage and drop rules.
  They cannot use a ball's bank charge. Mystery feedback takes priority when
  the banked target is a mystery brick.
- Pierce deals damage once per brick passage, including with Slowmo. Leaving
  and hitting the same brick again is a new passage. Expiring inside a brick
  resolves the collision without awarding a second hit.
- Multiball is capped at **six total balls**. A pickup at the cap awards 100
  points without extending the combo. Splits do not copy bank charges. A pickup
  while all balls are caught adds balls ready for the next launch.
- Permanent and timed Orbit/Turrets continue to stack independently: at most
  five satellites per ball and three turret pairs, with four bullets in flight.

## Performance and timing

Simulation uses fixed 1/60-second steps, independently of the rendering limit
(60 FPS active, 8 FPS in menus). Catch-up is capped at four steps after a stall.
Pause, visibility changes and focus loss discard elapsed menu time and input.
HUD updates run at 10 Hz, with immediate updates for state transitions/pickups.

Backgrounds and brick sprites retain their caches. Ball and satellite glows now
use small cached sprites as well. Particle, drop, bullet and ball counts are
bounded. The backing canvas stays within 2.4 million pixels, including 4K
displays. Resize preserves the current board and damage, then pauses safely.

## Checks

```sh
node --check games/dxball/dxball.js
node --test games/dxball/tests/*.test.mjs
```

Tests run the real game closure in a seeded Node VM with a minimal DOM/Canvas
stub; no test API is added to the shipped game. Coverage includes bank shots,
collision order, embedded metal recovery, pierce contact lifetime, sticky aim,
weapon expiry, mystery effects, all eight levels/seven drafts, keyboard guards,
resize, backing-buffer limits, cached rendering, refresh-rate independence and
a 60-second simulated stress run with maximum weapons. GitHub Actions runs
these checks on Ball pull requests and changes merged into `main`.

Browser smoke checks: start/launch/pause/restart, mouse/keyboard controls, light
and dark themes, upgrade choice, and short/narrow viewport layouts. The VM
checks do not measure GPU usage. A physical integrated-GPU laptop and mobile
touch device remain necessary for representative performance/input testing.

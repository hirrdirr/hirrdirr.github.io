# Slot Rush v0.3.0 — pit wall and rendering

Reviewed against v0.2.0 (`3adf5a85f5a51452972d8257681804d40c7e1bd6`).

## Findings and decisions

- The road rebuilt roughly 21,000 path vertices, its conductor rails, seams and shadows on every frame. Those pixels do not change during a race. Cache one transparent road layer at the current backing resolution, while scenery animations and cars remain live.
- Menus and pause continued drawing, and every frame measured layout and rebuilt speed-label HTML. Inactive screens now draw on demand; resize events update resolution; changed HUD values update at 20 Hz. Physics remains 120 Hz, rendering is capped at 60 Hz with tests at 30/60/90/120/144/240 Hz.
- Very large high-DPI backing canvases were unbounded by total size. Retain up to 2x device density, capped at 1920×1200. Three recently visited scenery boards are retained in a bounded LRU cache (about 6.6 MiB of raw scenery pixels); evicted boards are released.
- Time Attack had no explanation of where time was gained or lost, and replay returned through map selection. Three sectors per lap now compare with the same lap of the existing PB ghost. First forward crossings prevent double-counting after a respawn. Results count clean laps, and replay retains map and lane.
- Ghost recording stopped at 8,500 samples, so long finishes could create records rejected on reload. Bounded decimation retains the start and continues recording through the finish. Invalid timestamp sequences are rejected, and storage failures are reported instead of implying a durable save.
- Mobile PB text overflowed its narrow column. A two-row dashboard gives times enough room. Controls remain directly below the canvas, ahead of the new sector panel. Track seams/start markings now scale with each road's width.

All ten environments, both lanes, track splines, physics constants, timing rules, URLs and record keys are retained. Existing ghosts supply sector references without migration. No listing or public menu entry is added. Test files are excluded from Jekyll publication.

## Automated validation

```sh
node --test games/slot-rush/tests/*.test.mjs
node --check games/slot-rush/scenery.js
```

Ten tests cover all 20 map/lane combinations through a complete race, closed finite geometry, records and reload, nine sector crossings, ghost replay, immediate retry, crashes and respawn, pause, hidden tabs, restart, combined/cancelled inputs, long recordings, failed storage, road-cache invalidation, resolution bounds, high-refresh pacing and leaving countdown.

Additional comparison runs against the old source produced identical race finish times on all 20 combinations. A separate 6,000-step mixed-throttle/crash run per combination produced identical distance, speed, stress, time, completed laps and crash counts in all 20 cases.

## Browser validation and reproduction

```sh
node games/slot-rush/tests/prepare-browser-qa.mjs /absolute/path/to/qa
```

Serve the generated `dist` directory with a local static server (or `sites-preview start /absolute/path/to/qa` in the managed environment). Open the root page and run the comparison. `responsive.html` provides 320/390/768 px iframe viewports. The normal uninstrumented game is in `mobile/index.html`; its name does not change its viewport.

The harness executes the actual browser scripts and Canvas 2D rendering. It supplies a deterministic frame clock and counts drawing operations; it is not an FPS/GPU profiler. Original and updated pages use equal backing dimensions. Benchmarks include warm-up, 180 moving-race callbacks and 120 paused callbacks, repeated three times. Test records belong to the local preview origin, never hirrdirr.se.

Browser results: all 20 races completed, nine sectors each, with identical times to the baseline and no game errors. Phone layout checks at 320 and 390 px found no overflowing dashboard/sector cells after the correction; menu, map and lane selection, finish and retry were exercised. Rendering was inspected with the original scenery intact.

Measurement results are recorded in the pull request. Times measure synchronous JavaScript and Canvas command submission only; cloud-machine scheduling causes outliers. They do not establish CPU/GPU percentages, battery savings or real-device frame rates.

## Remaining limits

No physical integrated-GPU laptop, iPhone/Android touch device or Safari was available. Browser viewport tests and pointer-event tests do not substitute for those devices. The existing simulation clock and 60 ms catch-up clamp are unchanged, so severe stalls still slow simulation time. Existing sampled ghosts yield interpolated sector reference times, displayed to hundredths of a second.

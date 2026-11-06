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


## v0.4.0 — electric slot-car audio

- A dependency-free Web Audio module synthesizes a two-layer electric motor and filtered rail/friction noise. Speed, throttle release, displayed lateral load and crash stress control the mix; the ghost remains silent.
- Countdown tones fire once per displayed number/GO transition. Plastic impact, re-slot, lap and finish cues come from the actual game events. A personal best gets a higher final note. No physics, records or track geometry changed.
- The master volume starts at 35%, uses a perceptual gain curve, and has a separate mute button. Both preferences persist under `slotrush.audio.v1`, independent of records. The range supports keyboard input without triggering throttle or restart.
- Audio initializes only after user activation, including touch clicks. Unsupported/failed devices leave the game playable. Pause, hidden tabs, map changes and restarts cancel old effects. Idle/muted contexts suspend; the finish cue gets time to decay before suspension.
- Three continuous sources are reused; one-shot voices are bounded and disconnected after playback. A seeded noise buffer avoids altering the physics random stream. There are no audio downloads or third-party assets.

Validation: 18 Node tests cover existing 20 track/lane race completions plus audio lifecycle, cue counts, saved settings, silent ghosts, keyboard isolation and bounded nodes. Chromium rendered 11 actual Web Audio signal cases (motor speeds, corner load, effects, mute and pause); all passed signal/decay/clipping checks. At 100% volume the largest tested absolute peak was 0.505, below clipping. Browser UI checks verified saved volume/mute after reload, active and suspended contexts, and no horizontal overflow at 320 px. Physical mobile audio devices/Safari and subjective speaker/headphone balance were not tested.

Run `node games/slot-rush/tests/prepare-browser-qa.mjs /absolute/preview` and open `audio-browser.html` in that preview for the reproducible browser signal checks. Test pages remain excluded from the public Jekyll build.

## v0.4.1 — mechanical motor and visible stability

The original audio's clean tones were too musical, and its brief crash noise did not clearly convey a plastic slot car leaving its rail. The replacement keeps synthesis lightweight while adding a harmonic-rich commutator waveform, filtered gear mesh, gentle torque ripple and brush noise. There are now four continuous sources, reused throughout play; coasting reduces their drive sound as the car slows. Derailment uses a speed-scaled plastic snap, chassis knock, short motor spin-down and three decaying bounces/scrapes. Re-slotting uses a mechanical contact sound. Existing volume/mute settings and event timing are preserved.

A readable HTML stability meter beneath the canvas replaces the small canvas lateral-load meter. It reports remaining margin from the exact accumulated stress used by derailment physics, with green/stable, amber/beginning to slip and red/release-throttle text. It reaches zero on derailment, stays there if paused during the crash, and recovers on throttle release or respawn. It updates with the existing 20 Hz HUD and has an accessible meter value. Physics, tracks, records and record keys are unchanged.

Validation: all 19 Node tests passed, including warning/recovery/derailment/pause/reset coverage. All 20 track/lane finish times and distances exactly matched v0.4.0. Chromium rendered 13 real audio cases (including coast and two impact speeds); all passed output, silence, decay and clipping checks. The largest tested absolute peak at 100% was 0.7081. The 320 px browser view showed the real warning at 46% and derailment at 0%, with no horizontal overflow. The sound is procedural, not a recording of a physical toy; subjective listening and physical phone/Safari testing remain unverified.

## v0.4.2 — audible stability warning

The requested stability indicator was an audio cue. Increasing the existing friction noise did not provide a distinct warning. A short, descending pulse now starts when accumulated derailment stress reaches 18% of the crash threshold. Its cadence and pitch rise with risk; it stops below 8% risk, leaving a small hysteresis band to prevent repeated starts near the threshold. Recovery releases a sounding pulse over 20 ms. Crash, pause, menu, restart and mute clear it through the existing audio lifecycle. The warning shares the existing volume/mute controls. No new display, physics, records or track changes are included.

Scheduling uses the audio clock and emits at most one current pulse per update, with no catch-up burst after a stall. There is no extra continuous audio source or timer. Short voices disconnect after playing and share the existing bounded voice pool. The audio script URL is versioned to refresh previously cached sound code.

Validation: all 21 Node tests passed, including all 20 map/lane races and new threshold, cadence, hysteresis, recovery, lifecycle, bounded-voice and stall checks. Chromium rendered all 18 audio scenarios successfully. At 20% risk it produced 7 pulses over two seconds, versus 14 at 90% risk; recovery at 0.35 seconds prevented further pulses. Mute and pause produced zero output, and the largest tested absolute peak at full volume was 0.7306 (below clipping). These are actual audio-signal/timing checks, not subjective listening or physical-device performance measurements.

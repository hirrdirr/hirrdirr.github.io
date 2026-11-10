# v0.1.0 verification — 2026-11-10

## Automated

    node --test games/realm/tests/*.test.mjs

**19 passed, 0 failed.** Coverage:

- Normalized movement, building/water/world collision and dodge tunneling.
- Flood-fill reachability of every NPC, herb, cache, beacon and enemy spawn.
- Attack cooldowns, one-time kills, XP, gold and loot pickup.
- Level healing, equipment ownership, enemy telegraphs and safe-zone protection.
- Dodge immunity, consumables and death/respawn progression retention.
- First quest acceptance, combat and claim; repeated claims denied.
- Herb collection before acceptance, one-time caches and early boss completion.
- Merchant proximity, costs and material sales.
- Save round trip, v0 migration, malformed/oversized files, unknown item IDs,
  bounded values, invalid position fallback and permanent boss defeat.
- Backup recovery, corruption preservation, future-version protection,
  denied storage and long-run bounds for transient collections.

Syntax checks cover every production JavaScript module. git diff --check passes.

## Performance sample

An executor Node run advanced **36,000 ticks / 10 simulated minutes**, with all
11 enemies and repeated player attacks. Average tick time was **0.053 ms**;
the slowest one-minute block averaged **0.064 ms/tick**. Effects stayed bounded
and the intentionally undrained event buffer stayed at its 100-event cap.

This is a CPU simulation measurement on the test host, not a promise of browser
FPS, GPU load or performance on the player's hardware. Average render duration
is available in the pause menu; a 30 FPS setting reduces rendering work.

## Browser playtest

Checked in Chromium through the actual UI:

- Character creation and welcome artwork.
- WASD/arrow movement, following camera and visible scene collision.
- Elin dialogue, quest acceptance and live objective tracking.
- Five taggrot kills using normal attacks and Lantern Strike.
- Enemy damage, loot pickup, XP and level 2/3 progression.
- Herb interaction, river bridge traversal and safe-zone return.
- Inventory details and weapon comparison.
- Selling amber, purchasing a potion and updated gold/item counts.
- Returning to Elin, receiving the sword and unlocking the beacon quest.
- Paused inventory/dialogue views and legible desktop layout.

The test environment blocked browser reload with a URL-policy error.
End-to-end browser reload persistence was **not verified**; serialization,
recovery and restored progression are covered by automated tests above.
Narrow-screen layouts and light-theme rules are implemented but still merit
manual testing on the user's Windows browser. Audio was checked by code paths
and runtime operation, not by an independent listening test.

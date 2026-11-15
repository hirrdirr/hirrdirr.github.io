# Growing Realm beyond single player

## Existing boundary

The client sends small action objects to command(state, action) and movement
to step(state, input, fixedDelta). The simulation mutates game state and emits
bounded events; rendering, DOM menus, audio and persistence consume that state.
The simulation and content modules do not import browser APIs.

In v0.2, enemy-ai.js owns intent, windup, pounce, projectile and eruption rules.
The renderer reads their directions and timers to show the same attacks the
simulation resolves. Damage stays in the rules layer. Collision candidates use
a 128-pixel cell index; tests compare it with a full scan of the authored world.

In v0.3, talents.js owns the data-driven rank/prerequisite/point rules and
stat effects. inventory.js checks slot and stack limits; trading.js validates
merchant quotes and then commits one item/currency transfer. No DOM handler
changes gold, items or talent ranks directly. ui-panels.js consumes the same
rules for prices, disabled states, comparisons and talent descriptions.

Buyback entries have stable IDs, consumed once. Quest/chest claims preflight the
whole item bundle before changing progression. These synchronous local commands
are consistent within one game session; they are not distributed transactions.
A future server must add authenticated ownership, idempotency and durable atomic
writes. The v3 save adapter reconstructs legal talent allocations and migrates
older specialization saves to unspent points without trusting saved point totals.

The renderer reads local state directly. This is a useful starting boundary,
not a finished multiplayer SDK. A server needs its own trusted command
validation, player/entity ownership and connection lifecycle.

## Localization boundary (0.3.1)

`i18n.js` has no DOM or gameplay dependencies. `tr(key, ...values)` reads the
English catalog and interpolates numbered placeholders once. Values may be
reordered in another locale. Rule modules emit localized presentation messages
but still store and compare stable IDs. Localization itself did not change save schema 3. Existing player
names are never translated. All item numbers, quest rewards, talent effects,
world positions and combat timers match the preceding release.

The committed HTML is generated from a template and the same dictionary. The
normal Realm tests check that generated output is current, so static labels,
metadata and accessibility text cannot silently drift from the catalog.
No runtime network request, dependency or language selector is introduced.

## Equipment boundary (0.4.0)

`inventory.js` defines the three equipment slots and owns `transferEquipment`.
It stages the incoming removal and outgoing return in a copied bag, validates
capacity, then commits inventory and equipment together. `simulation.js` clamps
health to the resulting maximum and emits the existing equipment event; the
main loop saves that event. Stats read the valid equipment slots exactly once.

`trading.js` owns only bag copies. It rejects a sale of worn gear when no bag
copy exists, while allowing sale of a spare of the same type. UI rendering uses
bag counts directly and keeps unequip actions on the equipment slots.

The v4 save adapter transfers one owned bag copy for each valid old equipped
reference. Version gating makes this migration idempotent. The same migration
serves startup, backup recovery and imports. See [equipment.md](equipment.md)
for the ownership, capacity and backup contracts.

## Character presentation boundary (0.4.1)

`character-panel.js` renders slots, grouped attributes and selected-item details
from existing state, item data, localization and `stats(player)`. It reuses bag
buttons and equipment comparisons from `ui-panels.js`. It does not mutate
inventory or validate transfers. `ui.js` dispatches the existing equip/unequip
commands and uses their result to select the transferred copy. Focus restoration
matches the complete button dataset, then the selected slot/item, and preserves
panel scroll position.

`character-preview.js` owns a small Canvas lifecycle independent of simulation.
`main.js` injects a resolver for the cached world player sprite. UI mounting,
unmounting and visibility events control animation; reduced motion draws a still
frame. Nothing is added to saved state. See [character-panel.md](character-panel.md)
for lifecycle and extension details.

## Current roadmap priority

Next: **0.4.2 — Equipment Expansion**, adding functional categories, itemization
and supporting loot systems. No additional slots are included in 0.4.1. The networking notes
below are long-term architecture considerations, not the next release scope.

## Stage 1: small authoritative multiplayer

1. Run the rule/content modules in a dedicated server process. Keep health,
   combat, loot, cooldowns, quests and inventory authoritative there.
2. Introduce a transport adapter with a bounded command queue. Client commands
   contain sequence numbers and intentions, never trusted damage, position,
   item grants, XP totals or quest rewards.
3. Add player/entity IDs, replace the single player with a collection, and
   implement connection, disconnect and reconnect behavior.
4. Validate message schema, size, order, ownership, rate and legal action.
   Recheck proximity and cooldowns on the server. Audit economy changes.
5. Send compact snapshots/deltas at an independently selected network rate.
   Render other players with interpolation. Add local movement prediction and
   reconciliation after basic latency tests demonstrate the need.
6. Separate global events from events addressed to a player. Give rewards
   idempotent transaction IDs and a policy for shared kills and loot.
7. Limit replication to nearby entities. Begin with one small shared zone and
   a modest player cap; measure server tick time and outbound bandwidth.

GitHub Pages can continue hosting the client. WebSocket/game-server hosting must
be provisioned separately; Pages does not run a persistent game server. Host
selection and ongoing costs are later decisions. A relational database alone
is not a realtime authoritative simulation.

## Stage 2: accounts and durable progression

Use a maintained identity provider and server-verified sessions. Store
characters, inventories, quest states and world flags in a transactional
database with migrations, backups and recovery procedures. Treat local JSON
as untrusted: do not import its XP/items directly into a shared economy.
A fresh online character or limited conversion is safer.

Keep database/service-role credentials on the server. The public repository
and browser bundle must never contain privileged secrets. Add deletion/export
flows and a privacy policy for the actual account data collected.

## Stage 3: larger world

Add data-driven zones, navigation/pathfinding, content pipelines, interest
management, parties, instancing and economy rules based on observed needs.
Current enemy steering is collision-aware movement, not full pathfinding.
Do not promise MMO-scale concurrency from this prototype.

Before adding many more enemies, profile the existing collision index and
line-of-sight checks alongside replication. Introduce worker processes only
when needed.

## Desktop distribution

The web client can first be packaged in a desktop shell, retaining Canvas and
the UI. Abstract filesystem persistence and platform input behind adapters,
support controller mappings and plan updates. A native engine port still
requires a renderer/UI rewrite; stable content IDs, save DTOs, quest definitions
and rule tests provide reusable specifications.

## Useful next single-player work

Expand authored scenery and animated sprite directions, add configurable
keybindings, improve navigation around complex obstacles, and test on
lower-powered Windows laptops. Keep each increment complete and playable
before starting networking.

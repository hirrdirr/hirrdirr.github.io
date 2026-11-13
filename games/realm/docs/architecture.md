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

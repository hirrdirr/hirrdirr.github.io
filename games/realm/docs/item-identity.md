# Equipment identity and permanent stats

## Permanent gear stats in 0.4.4

Eligible equipment gets a single draw from the saved simulation RNG at creation.
All three profiles have equal weight. The standard profile keeps the base stats.
The focused profile adds one point of attack or defense, one percentage point of
haste or spell power, or two units of movement speed, depending on the template.
For health-focused pieces it trades one health for two movement units. The hardy
profile adds 2 / 4 / 6 maximum health at common / uncommon / rare quality. Where
the template has enough of its specialty stat to retain a positive value, it gives
up one increment of that stat. Health-focused pieces receive the full health gain.

`gear-rolls.js` lists the eligible templates and their specialties. Drops roll
before touching the ground. Caches and purchases roll after capacity checks.
Quest rewards, starter gear, story-only equipment and migrated items use the
standard profile. Capacity previews, trades of existing gear and loading consume
no gear RNG. Base merchant previews are labeled as such. Inventory, buyback and
combat share the resolved instance values, including both rings.

Schema 6 stores the actual numeric deltas in the existing `modifiers` field.
The loader checks the entire combination against the template's allowed profiles.
Future balance edits must keep historical combinations readable or explicitly
migrate them. Schema 5 accepts only empty modifiers and upgrades to 6 with the
same IDs and stats, preserving the original backup. A 0.4.3 client treats a v6
file as a future save and protects it from autosave.

## Data model

An equipment record is stored once in `player.itemInstances`:

```json
{"gear-27":{"id":"gear-27","templateId":"moonBlade","modifiers":{}}}
```

The key and `id` must match. `templateId` references the authoritative `ITEMS`
definition. `resolveItem(player, ref)` returns the shared effective item for that
record, with the saved deltas applied once. An empty object uses base stats.

`player.itemSequence` is a persisted monotonic safe-integer allocator. IDs are
unique within a journey, not global account identifiers. Allocation uses no
clock, network or gameplay RNG. Moving an item never allocates another ID.
Discarded IDs are not reused. Import replaces a journey; it does not merge two
identity namespaces. Template-only equip/sell commands are rejected.

| Location | Equipment reference | Stackable representation |
| --- | --- | --- |
| `player.inventory` | Instance ID with count 1 | Template ID with count 1–999 |
| `player.equipment` | Instance ID or null per slot | Not permitted |
| `state.buyback` | `entry.item` is the sold instance ID | Template ID for one sold copy |
| `state.drops` | `drop.item` is the awarded instance ID | Template ID for one drop |

Every record has exactly one owning location across these four containers.
A spare sword and a worn sword of the same template have different records.
Two identical rings require two records and retain their own assignments.

## Creation, transfer and retirement

`createItemInstance` is the sole factory. Starter gear uses it directly.
`grantItems` creates bag equipment after capacity validation and is shared by
purchases, quests, caches and other rewards. A bundle preflight stages all rewards
without mutating the real registry, sequence, bag, currency or quest state.

Enemy loot is instantiated when the existing loot roll awards it, before pickup.
Pickup transfers the same reference into the bag. Blocked nearby loot retains
its reference and the existing minimum lifetime. Existing 90-second expiry and
64-drop eviction rules are unchanged; retiring a drop removes its record.

Equip/swap/unequip stage the final bag before changing ownership. A full-bag swap
works because each incoming instance frees one slot. Unequip cannot stack into
another copy. Trades validate first, then transfer one selected instance and its
price. Buyback keeps that instance in the registry until repurchased or evicted
by the existing eight-entry limit. Eviction retires only the evicted record.

## Identity migration introduced in schema 5

The storage key remains `hirrdirr.realm.save`. All prior progression validation,
talent migration, checkpoints, flags, quest progress and currency rules remain.

For v0–v3, valid equipped references first consume their existing shared bag
copies, following the 0.4.0 rules. For v4, worn copies already belong to their
slots, so no bag subtraction occurs. Then each worn copy and each remaining
equipment quantity receives its own ID in stable order. Buyback equipment and
outstanding equipment drops also receive separate IDs. Stackables retain counts.
Missing/unowned malformed legacy slot references never fabricate starter gear.

Migration preserves legitimate bags that expand beyond 16 occupied slots.
Existing copies remain selectable; new equipment cannot be acquired until there
is room. Equipping into empty slots and selling reduce overflow. Nothing is
silently truncated to fit. Repeated schema-5 loads retain IDs and do not migrate
again. Re-importing the same legacy file replaces the journey deterministically.

Original raw files are preserved as `.v0` through `.v4` before automatic writes.
Imports also retain `.import.vN` and the preceding local journey as `.recovery`.
Backup failure blocks automatic replacement. Current/future-version protection
and corrupted-save recovery retain the previous contracts.

## Validation and failure behavior

Schema 5 rejects the entire save for malformed records, unknown equipment
templates, mismatched IDs, nonempty modifiers, invalid counters, missing
references, equipment quantities other than one, duplicate ownership, wrong
slot categories or orphan records. It also rejects malformed current buyback or
drop entries. The loader does not choose which duplicate owner to trust.
`SaveStore` preserves the raw original, tries a valid backup, and otherwise blocks
autosave until recovery or a confirmed replacement. No online anti-cheat promise
is made: deliberate coherent offline editing remains possible.

The instance count bound covers 999 copies of each equipment template plus ten
worn slots, eight buyback entries and 64 drops. Import/validation share an 8 MiB
limit, increased from 256 KiB so a valid legacy bag can expand and still round
trip. Extremely large migrated bags can exceed browser storage quota; the normal
save-failure message and export/recovery path apply. Originals remain backed up.

## UI and scope

The existing ten-slot Character Panel is retained. Each equipment copy has its
own button and selection; stackable quantities still display on their buttons.
Internal IDs appear only in action data, not visible item names. Comparisons
resolve the selected record and target slot. Shop comparisons create a read-only
projection, never allocating a real record or consuming an ID.

The next milestone is **0.5.0 — XP Scaling & World Respawn**.

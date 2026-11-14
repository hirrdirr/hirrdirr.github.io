# Equipment ownership — v0.4.0

## Invariants

- `player.inventory[id]` counts only unequipped bag copies. Positive stacks
  occupy one of 16 bag slots, with up to 999 copies each.
- Each key in `EQUIPMENT_SLOTS` owns either one valid item of that slot's type
  or `null`. The existing slots are weapon, armor and charm.
- Total ownership is bag count plus matching equipped slots. Equipping,
  unequipping and swapping conserve that total for every item ID.
- Item types remain fungible: two identical swords have the same stats. No
  instance IDs, durability, affixes or new equipment categories are introduced.
- Stats use equipped items once, independent of bag quantities. Transfers clamp
  current health down if necessary, never heal it or accumulate bonuses.

## Transactions and capacity

`transferEquipment(player, slot, nextId)` validates ownership and slot type,
copies the bag, removes one incoming copy, checks capacity for the outgoing
copy, then commits both containers. `nextId = null` means unequip. Failure
returns a localized reason and leaves the player unchanged. The simulation
emits the existing equip/unequip event only after success, triggering persistence.

| Situation | Result |
| --- | --- |
| Full bag, new item is its last bag copy | Its removed stack can make room for the old equipment |
| Full bag, new item has extra bag copies | Swap requires an existing non-full stack for the old equipment |
| Full bag, unequip into an existing non-full stack | Allowed |
| Full bag, unequip needs a new stack | Rejected; equipment remains worn |
| Outgoing item's stack already contains 999 | Rejected; nothing changes |
| Swap another copy of the currently worn type | Counts and stats stay unchanged |

Legacy over-capacity bags are retained, not truncated. Transfers still use the
existing bag rules: an existing stack can grow within its cap; a new stack
requires space. Equipping into an empty slot may reduce an overflowing bag.

Merchants sell only bag copies. An item type may be present both in a slot and
in the bag, representing different copies; the bag copies remain sellable.
Worn-only items cannot be sold until unequipped. Quest-bound protection, rare
confirmation, prices and buyback IDs are unchanged. Rewards and loot use the
same bag-capacity checks as before, now naturally excluding worn items.

## Save migration and recovery

Save schema **4** keeps the existing local-storage key and field names but
changes their ownership meaning. `deserialize` applies this migration to v0–v3:

1. Sanitize known inventory IDs/counts using the existing bounds.
2. Start with empty equipment slots.
3. For each old slot, require a string ID, a matching item slot and a positive
   owned inventory count. Transfer exactly one copy out of that count; remove
   the stack when it becomes zero. Keep the equipped copy in the slot.
4. Skip invalid or unowned references without consuming legitimate bag items.
   Missing starter items are not fabricated, including in malformed pre-v3 saves.
5. Preserve the existing progression validation and serialize the result as v4.

v4 loads validate slots independently of bag ownership and never subtract again.
Valid names, levels, XP, gold, talents, reset history, quests, discoveries,
checkpoints, buyback and other persisted progress keep their existing meaning.
The old pre-v3 specialization-to-talent migration still applies where needed.

Before automatic replacement, `SaveStore` preserves the original raw legacy save
under `hirrdirr.realm.save.vN`; this also applies when recovering an old `.backup`.
If that write fails, automatic saving is blocked and the player can export the
temporary migrated journey. The old original is left untouched.

Confirmed imports keep the current local journey as `.recovery`, and keep the
exact imported legacy text as `.import.vN` (latest import for that version).
Failure to write the required recovery copies prevents replacing the current
save. Routine `.backup` and future-version protection remain in place. The
original files can be imported again through the existing menu; they migrate
afresh into a replacement journey, not on top of the current inventory.

These are synchronous single-player commands and local-storage writes. They do
not offer cross-tab transactions or protect against deliberate offline save
editing; use one active game tab. No backend is introduced.

## Next milestone

0.4.1 focuses on character-panel presentation and an animated character preview.
Additional slots can build on the shared slot list and item definitions, with
their own UI, migration and balance review. None are added in 0.4.0.

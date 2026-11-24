# Equipment ownership — v0.4.4

The ten slots are Weapon, Armor, Charm, Head, Shoulders, Hands, Legs, Feet,
Ring 1 and Ring 2. `EQUIPMENT_DEFINITIONS` centralizes category, label and icon;
`ring1` and `ring2` both accept the `ring` template category.

Every equipment copy has a record in `player.itemInstances`. A slot contains
that record's ID or null. Bag equipment entries use the same IDs with count 1;
consumables/materials retain template IDs and stack quantities. Worn gear does
not occupy bag space. See [item-identity.md](item-identity.md) for serialization,
allocation, lifecycle and migration details.

## Transfers and capacity

`transferEquipment(player, slot, nextId)` requires a compatible owned instance,
stages incoming removal and outgoing return, checks final bag capacity, then
commits both containers. `nextId = null` means unequip. Failure changes neither
container. A specific instance cannot be worn twice, and template-only equip
commands cannot choose an arbitrary copy. The UI supplies explicit ring targets.

| Situation | Result |
| --- | --- |
| Full bag, swap a carried instance for worn gear | Allowed; incoming removal frees one slot |
| Full bag, unequip with an identical template already carried | Rejected; equipment does not stack |
| Empty compatible slot | Incoming instance leaves the bag and occupies that slot |
| Same instance already equipped | Rejected; it is not in the bag |
| Another instance of the same template | Normal swap; both identities survive |
| Legacy bag exceeds 16 slots | Preserved; equip into empty slots or sell to make room |
| Existing consumable stack in a full bag | May grow up to 999 copies |

Stats resolve each worn instance through its template and permanent rolled profile, alongside talent
bonuses. Transfers clamp health down when necessary and never grant healing or
accumulate permanent stat bonuses. See the [roll rules](item-identity.md#permanent-gear-stats-in-044) for stat ranges.

## Trading and saving

The merchant accepts an exact bag instance, never a worn copy. Spare identical
copies remain independently sellable; bound items and rare-sale confirmation
keep their protections. Buyback retains and restores the original record.

Schema 5 upgrades v4 separate ownership and the earlier v0–v3 shared-copy saves.
Original raw saves are backed up before autosaving; imports and corruption
recovery keep their established protections. Ambiguous current ownership rejects
the save instead of silently deleting or cloning an item.

These are synchronous single-player transactions, not cross-tab or server
transactions. Use one active game tab. No networking or backend is introduced.

## Next milestone

**0.5.1 — Combat HUD Overhaul**.

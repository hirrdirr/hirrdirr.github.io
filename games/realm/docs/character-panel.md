# Character Panel — 0.4.3

## Presentation and interactions

The wide layout places five equipment slots on each side of the existing player
portrait, with grouped attributes at the right. Left: Head, Shoulders, Armor,
Hands, Weapon. Right: Charm, Ring 1, Ring 2, Legs, Feet. Bag contents and selected
item details stay below. At 1050 px and below, attributes move below the loadout;
at 570 px and below, the portrait leads, equipment becomes two five-card columns,
and bag/details stack. The existing dialog scrolls vertically.

Only entries from `EQUIPMENT_SLOTS` are rendered. Empty slots have a muted category
icon and explicit text. Rarity uses the existing names, colors and icons. Buttons
expose selection with `aria-pressed`; keyboard focus has its own visible outline.
Item and stat explanations use native titles and accessible labels. Item details
are a polite live region, and existing transaction feedback remains visible.

Selection identifies an equipment **slot** or a bag **instance ID** (stackable items retain their template ID), never a guessed
quantity. A successful equip selects its slot; a successful unequip selects its
returned bag copy. A rejected transfer keeps the current selection. The UI
restores focus using the original button's complete data identity, then selected
slot/item, then Close. It preserves the dialog's scroll offset when rerendering.
Identical equipment copies render separate buttons. Technical IDs stay in
internal action data, while labels and details show the normal item names.
All ownership/capacity validation remains in existing commands. Ring details
show a comparison and explicit equip button for each ring slot; merchant
comparisons also show both replacement outcomes. A queued native close event
from a preceding view is ignored while the shared dialog is already open again.

Attributes come from the shared `stats` result, including talent bonuses. Strike
damage is a normal melee hit before critical/combo bonuses; strikes per second is
the maximum attack rate. Movement speed is relative to base walking speed. Burst
is shown separately because it does not use melee critical/combo rules. These
labels explain existing calculations; none introduces a new gameplay statistic.

## Preview lifecycle

`CharacterPreview` owns one 240 × 280 canvas, one optional RAF request, one
IntersectionObserver and the visibility/focus/reduced-motion listeners. Mounting
first unmounts the preceding instance. Closing the dialog or changing views
cancels the frame and removes listeners. A hidden document, unfocused window,
disconnected/hidden canvas or offscreen portrait prevents animation. Scrolling
back into view resumes it. Reduced motion draws time zero and schedules no loop.

`drawCharacterPreview` draws the cached 40 × 48 world sprite at 4×, with smoothing
disabled, a fixed floor shadow and a ±1.5 px idle offset. The RAF callback draws at
most 30 times per second using elapsed time, independent of simulation rate.
There is no second world renderer, sprite regeneration, network asset request,
particle system or persistent animation state.

The constructor's `resolveSprite(player)` callback is the future appearance seam.
It currently returns `renderer.art.player[0]`; equipment does not alter the base
portrait. Future equipment layers should be composed/cached behind this boundary
rather than adding ownership rules to the preview. The ten functional slots
use shared category labels/icons; equipment expansion does not change this lifecycle.
Save schema is 5; equipment records and ownership are documented in
[item-identity.md](item-identity.md).

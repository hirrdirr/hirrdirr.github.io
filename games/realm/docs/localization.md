# English copy and stable game data

English (`en`) is the active language in 0.3.1. There is no language selector.
The catalog `js/locales/en.js` contains plain strings, never HTML or game rules.
`tr(key, ...values)` inserts numbered placeholders in one pass. Missing keys or
arguments are errors, caught by tests; `createTranslator(otherDictionary)` falls
back to English for missing translations. A later locale can reorder placeholders
without changing gameplay. Select the locale at startup before importing content.

## Authoring

- Keep catalog keys stable when editing wording. Keys have content/UI namespaces;
  they are distinct from persisted IDs such as `moonBlade`, `ancient` or `camp`.
- Keep sentences together when possible. Pass numbers and displayed names as
  parameters, not pieces of untranslated sentences. Keyboard keys and universal
  numeric notation (HP, XP, FPS, ranks) stay in UI markup where appropriate.
- Catalog values are trusted authored copy. Player-provided names are escaped
  before HTML insertion and inserted with textContent in the HUD/toasts.
- Put new static labels or accessible descriptions in `templates/index.html` as
  `{{catalog.key}}`. `{{version}}` and `{{language}}` come from code.
- Run `node games/realm/scripts/localize-html.mjs` after changing static copy.
  Commit both the source template and generated `index.html`. The generator
  escapes text/attribute values; do not put HTML into the catalog.
- Run `npm run test:realm`. The suite checks catalog references/placeholders,
  static-output freshness, Swedish remnants in runtime sources/HTML/CSS, save
  compatibility, and gameplay/UI regressions. The remnant scan is a guardrail,
  not a substitute for reading new text and reviewing it in the browser.

## Consistent terminology

| Original | English display | Stable ID where applicable |
| --- | --- | --- |
| Lyktdalen | Lantern Vale | village |
| Glödmyren | Emberfen | marsh |
| Vandrarlägret | Wanderer’s Camp | camp |
| Mossgläntan | Mossglade | trail |
| Skymningsskogen | Duskwood | forest |
| Den gamla fyren | Old Beacon | ruins |
| Myrhjärtat | Fenheart | ancient |
| Den rotbundne väktaren | Rootbound Warden | warden |
| Taggrot / Glödvinge | Thornroot / Emberwing | sprout / wisp |
| Lyktväktare | Lantern Guardian | guardian |
| Skymningsjägare | Dusk Hunter | hunter |
| Runvävare | Runeweaver | weaver |
| Lyktslag | Lantern Burst | burst |
| Lyktvärn | Lantern Ward | guard |
| Skuggsprång | Shadow Rush | rush |
| Glimtskott | Glimmerbolt | bolt |
| Undanmanöver | Dodge | dodge |

Elin, Mira, Ivo and Signe retain their names. User-created character names,
including old default names, are preserved exactly. The display changes never
rename item IDs, talent IDs, quest IDs, flags, merchant records or checkpoints.

Use **health**, **defense**, **attack speed**, **cooldown**, **talent point**,
**respecialize/reset**, **quest-bound**, **gold**, **buyback**, **bag** and **slot**
consistently. Descriptions use game-world units for range; percentages distinguish
multipliers from added percentage points. The Runeweaver Prism description now
states the existing additive base-damage bonus accurately; its effect is unchanged.

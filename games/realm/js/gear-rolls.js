import { ITEMS } from './data.js';

// Only authored loot and shop templates participate. Starter and story gear
// have no entry. Each eligible template has three equally likely outcomes.
const groups = {
  attack: ['keeperBlade', 'swiftBlade', 'moonBlade'],
  defense: ['forestCoat', 'barkCoat', 'ironCharm', 'briarPads'],
  haste: ['workGloves', 'runnerWrap', 'duskGrips', 'emberCharm'],
  spellPower: ['runeFocus', 'fenCowl', 'emberBand'],
  speed: ['trailBoots', 'fenBoots', 'trailCharm'],
  hp: ['copperBand', 'trailCap', 'mossMantle', 'linenLegs', 'reedLegs']
};
const vitality = { common: 2, uncommon: 4, rare: 6 };
const increments = { attack: 1, defense: 1, haste: 0.01, spellPower: 0.01, speed: 2 };
const neutral = Object.freeze({});
const profiles = new Map(Object.entries(ITEMS)
  .filter(([, item]) => item.slot)
  .map(([id, item]) => [id, [{ delta: neutral, effective: item }]]));

function profile(base, delta) {
  const effective = { ...base };
  for (const [key, value] of Object.entries(delta)) {
    effective[key] = Math.round(((base[key] || 0) + value) * 100) / 100;
  }
  return { delta: Object.freeze(delta), effective: Object.freeze(effective) };
}

for (const [stat, ids] of Object.entries(groups)) {
  for (const id of ids) {
    const base = ITEMS[id], step = increments[stat];
    // Pure vitality pieces trade one health for mobility on the focused roll.
    const focused = stat === 'hp' ? { hp: -1, speed: 2 } : { [stat]: step };
    const hardy = { hp: vitality[base.rarity] };
    if (stat !== 'hp' && base[stat] > step) hardy[stat] = -step;
    profiles.get(id).push(profile(base, focused), profile(base, hardy));
  }
}

export const canRollGear = id => (profiles.get(id)?.length || 0) > 1;

export function rollModifiers(id, rng) {
  const options = profiles.get(id);
  if (!rng || !options || options.length === 1) return neutral;
  return options[Math.floor(rng() * options.length)].delta;
}

// Resolve imported plain JSON against complete, authored combinations. Runtime
// records share the canonical deltas, so combat just retrieves a prepared item.
export function gearProfile(id, modifiers) {
  const options = profiles.get(id);
  if (!options || !modifiers || typeof modifiers !== 'object' || Array.isArray(modifiers)) return null;
  for (const option of options) if (option.delta === modifiers) return option;
  const keys = Object.keys(modifiers);
  if (!keys.length) return options[0];
  return options.find(({ delta }) => keys.length === Object.keys(delta).length &&
    keys.every(key => Object.hasOwn(delta, key) && modifiers[key] === delta[key])) || null;
}

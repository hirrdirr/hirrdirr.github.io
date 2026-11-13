// Content and allocation rules are shared by simulation, save validation and UI.
export const TALENT_TREES = Object.freeze({
  guardian: { name: 'Lyktväktare', subtitle: 'Stå kvar. Slå tillbaka.', color: '#dbbd7c', icon: 'shield' },
  hunter: { name: 'Skymningsjägare', subtitle: 'Rörelse, precision och huggkedjor.', color: '#bdafd9', icon: 'fang' },
  weaver: { name: 'Runvävare', subtitle: 'Ljus, läkedom och runmagi.', color: '#8dcfc1', icon: 'rune' }
});
const node = (tree, tier, column, name, maxRank, icon, description, effects, requires = []) =>
  ({ tree, tier, column, name, maxRank, icon, description, effects, requires });
export const TALENTS = Object.freeze({
  vigor: node('guardian', 0, 0, 'Djupa rötter', 3, 'heart', r => `+${r * 8} maxhälsa.`, r => ({ hp: r * 8 })),
  steel: node('guardian', 0, 1, 'Barkhud', 3, 'armor', r => `+${r} försvar mot alla träffar.`, r => ({ defense: r })),
  guard: node('guardian', 1, 0, 'Lyktvärn', 1, 'shield', () => 'Aktiv [1]: minska inkommande skada med 40% i 4 s. 14 s återhämtning.', () => ({}), [['vigor', 2]]),
  edge: node('guardian', 1, 1, 'Stadig klinga', 2, 'sword', r => `+${r * 6}% skada med hugg och Skuggsprång.`, r => ({ meleeBonus: r * .06 }), [['steel', 2]]),
  resolve: node('guardian', 2, 0, 'Varmt ljus', 2, 'lantern', r => `Lyktvärn varar ${r} s längre och minskar skadan med ytterligare ${r * 5} procentenheter.`, r => ({ guardDuration: r, guardReduction: r * .05 }), [['guard', 1]]),
  remedy: node('guardian', 2, 1, 'Fältläkare', 2, 'potion', r => `Läkedrycker återställer ${r * 10} extra hälsa.`, r => ({ potionHealing: r * 10 }), [['edge', 1]]),
  bastion: node('guardian', 3, 0, 'Orubblig', 1, 'bastion', () => 'Lyktvärn återhämtar sig 3 s snabbare och minskar skadan med ytterligare 15 procentenheter.', () => ({ guardRecovery: 3, guardReduction: .15 }), [['resolve', 2]]),
  retaliation: node('guardian', 3, 1, 'Återsken', 1, 'counter', () => 'En träff under Lyktvärn förstärker nästa vanliga hugg med 50%. Laddningen varar 5 s och staplas inte.', () => ({ retaliation: 1 }), [['guard', 1], ['edge', 2]]),
  tempo: node('hunter', 0, 0, 'Lätta händer', 3, 'tempo', r => `+${r * 4}% attackhastighet.`, r => ({ haste: r * .04 })),
  precision: node('hunter', 0, 1, 'Skarp blick', 3, 'eye', r => `+${r * 3}% chans till kritisk träff med hugg, Skuggsprång och Glimtskott. Kritiska träffar ger 150% skada.`, r => ({ critChance: r * .03 })),
  rush: node('hunter', 1, 0, 'Skuggsprång', 1, 'fang', () => 'Aktiv [2]: rusa mot ett mål inom 210 steg och slå för 140% attack. Kräver fri sikt; passerar aldrig väggar. 12 s återhämtning.', () => ({}), [['tempo', 2]]),
  footwork: node('hunter', 1, 1, 'Skogssteg', 2, 'boots', r => `+${r * 6} rörelsefart och ${(r * .15).toFixed(2)} s kortare återhämtning på undanmanöver.`, r => ({ speed: r * 6, recovery: r * .15 }), [['precision', 2]]),
  momentum: node('hunter', 2, 0, 'Jaktens rytm', 2, 'combo', r => `Tredje hugget i kedjan ger ytterligare ${r * 8}% attack som skada.`, r => ({ comboBonus: r * .08 }), [['rush', 1]]),
  exposed: node('hunter', 2, 1, 'Öm punkt', 2, 'critical', r => `Kritiska träffar ger ${150 + r * 15}% skada.`, r => ({ critPower: r * .15 }), [['precision', 3]]),
  dance: node('hunter', 3, 0, 'Skuggdans', 1, 'dodge', () => 'En träff med tredje hugget kortar Skuggsprångs återhämtning med 2 s och undanmanöverns med 0,5 s.', () => ({ dance: 1 }), [['momentum', 2]]),
  hunter: node('hunter', 3, 1, 'Andra andningen', 1, 'heart', () => 'Varje besegrad fiende återställer 6 hälsa.', () => ({ killHealing: 6 }), [['exposed', 2]]),
  embers: node('weaver', 0, 0, 'Glödens kraft', 3, 'burst', r => `+${r * 8}% skada med Lyktslag.`, r => ({ burstBonus: r * .08 })),
  focus: node('weaver', 0, 1, 'Klarsyn', 3, 'rune', r => `+${r * 6}% återhämtningshastighet för Lyktslag och Glimtskott.`, r => ({ magicHaste: r * .06 })),
  bolt: node('weaver', 1, 0, 'Glimtskott', 1, 'bolt', () => 'Aktiv [3]: skjut en ljusruna för 150% attack. Den träffar första fienden längs vägen. Räckvidd 360 steg, 4 s återhämtning.', () => ({}), [['focus', 2]]),
  bloom: node('weaver', 1, 1, 'Ljusblom', 2, 'leaf', r => `Lyktslag återställer ${r * 4} hälsa när det träffar minst en fiende.`, r => ({ burstHealing: r * 4 }), [['embers', 2]]),
  reach: node('weaver', 2, 0, 'Ljusring', 2, 'ring', r => `Lyktslags räckvidd ökar med ${r * 10} steg.`, r => ({ burstRadius: r * 10 }), [['embers', 3]]),
  resonance: node('weaver', 2, 1, 'Runresonans', 2, 'crystal', r => `+${r * 10}% skada med Glimtskott.`, r => ({ boltBonus: r * .10 }), [['bolt', 1]]),
  piercing: node('weaver', 3, 0, 'Genomlysning', 1, 'pierce', () => 'Glimtskott går genom den första fienden och kan träffa en till. Varje fiende träffas bara en gång.', () => ({ boltPierce: 1 }), [['resonance', 2]]),
  renewal: node('weaver', 3, 1, 'Vårens återkomst', 1, 'bloom', () => 'Lyktslag återställer ytterligare 8% av din maxhälsa när det träffar en fiende.', () => ({ burstHealPercent: .08 }), [['bloom', 2]])
});
export const TIER_POINTS = Object.freeze([0, 3, 6, 10]);
export const earnedTalentPoints = level => Number.isFinite(level) ? Math.max(0, Math.min(20, Math.floor(level)) - 2) : 0;
export const talentRank = (p, id) => Object.hasOwn(TALENTS, id) ? Math.max(0, Math.min(TALENTS[id].maxRank, Math.floor(Number(p.talents?.[id]) || 0))) : 0;
export const spentTalentPoints = (p, tree) => Object.entries(TALENTS).reduce((n, [id, t]) => n + (!tree || t.tree === tree ? talentRank(p, id) : 0), 0);
export const availableTalentPoints = p => Math.max(0, earnedTalentPoints(p.level) - spentTalentPoints(p));
export function talentRequirement(p, id) {
  if (!Object.hasOwn(TALENTS, id)) return 'Okänd talang.';
  const t = TALENTS[id];
  if (talentRank(p, id) >= t.maxRank) return 'Högsta rank uppnådd.';
  if (p.level < 3) return 'Första poängen låses upp på nivå 3.';
  if (spentTalentPoints(p, t.tree) < TIER_POINTS[t.tier]) return `Kräver ${TIER_POINTS[t.tier]} investerade poäng i ${TALENT_TREES[t.tree].name}.`;
  for (const [parent, rank] of t.requires) if (talentRank(p, parent) < rank) return `Kräver ${TALENTS[parent].name}, rank ${rank}.`;
  if (!availableTalentPoints(p)) return p.level >= 20 ? 'Alla poäng är använda. Återställ hos Mira för att välja en ny väg.' : 'Inga lediga talentpoäng. Nästa nivå ger en ny poäng.';
  // Talent menus pause the simulation, so combat timers must not block learning.
  // Respecialization at Mira still requires leaving combat.
  if (p.dead) return 'Återvänd till din lykta först.';
  return '';
}
export function learnTalent(p, id) {
  if (talentRequirement(p, id)) return false;
  p.talents[id] = talentRank(p, id) + 1;
  return true;
}
export function talentEffects(p) {
  const total = {};
  for (const [id, t] of Object.entries(TALENTS)) {
    const rank = talentRank(p, id);
    if (rank) for (const [key, value] of Object.entries(t.effects(rank))) total[key] = (total[key] || 0) + value;
  }
  return total;
}
export function sanitizeTalents(raw, level) {
  const p = { level, talents: {}, combat: 0, dead: false };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p.talents;
  // Dependencies only point to lower tiers. Reconstruct, never trust saved totals.
  for (const tier of [0, 1, 2, 3]) for (const [id, t] of Object.entries(TALENTS)) {
    if (t.tier !== tier || !Number.isFinite(raw[id])) continue;
    const desired = Math.max(0, Math.min(t.maxRank, Math.floor(raw[id])));
    while (talentRank(p, id) < desired && learnTalent(p, id)) { /* All normal allocation checks apply. */ }
  }
  return p.talents;
}
export const respecCost = p => p.respecCount ? 10 : 0;

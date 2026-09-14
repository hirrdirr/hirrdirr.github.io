// Original Core Defense rules. All distances are world pixels, times are seconds.
export const WORLD = {
  width: 960,
  height: 600,
  tile: 40,
  lives: 30,
  gold: 240,
  sellRatio: 0.7,
};
export const TARGET_MODES = ["First", "Last", "Strong", "Weak", "Closest"];
const tier = (name, cost, description, changes) => ({
  name,
  cost,
  description,
  changes,
});
export const TOWERS = {
  repeater: {
    name: "Repeater",
    role: "Billigt allroundförsvar",
    description:
      "Snabba, pålitliga skott. Billig att bygga; behöver stöd mot tungt pansar.",
    color: "#5ed8b4",
    cost: 60,
    damage: 7,
    rate: 2.8,
    range: 125,
    projectileSpeed: 620,
    paths: [
      {
        name: "Slagkraft",
        tiers: [
          tier("Härdad ammunition", 45, "+45% skada, +10% pansarbrytning", {
            damageMul: 1.45,
            penetrationAdd: 0.1,
          }),
          tier("Magnetladdning", 95, "+65% skada, +20 räckvidd", {
            damageMul: 1.65,
            rangeAdd: 20,
          }),
          tier("Överladdning", 190, "+90% skada, +25% pansarbrytning", {
            damageMul: 1.9,
            penetrationAdd: 0.25,
          }),
        ],
      },
      {
        name: "Eldvolym",
        tiers: [
          tier("Snabbmatning", 40, "+30% eldhastighet", { rateMul: 1.3 }),
          tier("Dubbeldrift", 90, "+50% eldhastighet, +10 räckvidd", {
            rateMul: 1.5,
            rangeAdd: 10,
          }),
          tier("Fullt flöde", 180, "+60% eldhastighet, +25% skada", {
            rateMul: 1.6,
            damageMul: 1.25,
          }),
        ],
      },
    ],
  },
  sniper: {
    name: "Långskott",
    role: "Precision / pansarbrytning",
    description:
      "Kraftiga precisionsskott över långa avstånd. Bryter igenom 65% av pansarets reduktion.",
    color: "#f1c765",
    cost: 120,
    damage: 48,
    rate: 0.7,
    range: 235,
    projectileSpeed: 1100,
    penetration: 0.65,
    paths: [
      {
        name: "Genomslag",
        tiers: [
          tier("Tung kärna", 85, "+50% skada", { damageMul: 1.5 }),
          tier("Pansarspets", 170, "+60% skada, full pansarbrytning", {
            damageMul: 1.6,
            penetrationAdd: 0.35,
          }),
          tier("Kärnkrossare", 340, "+110% skada", { damageMul: 2.1 }),
        ],
      },
      {
        name: "Prickskytt",
        tiers: [
          tier("Optik", 70, "+45 räckvidd, +15% eldhastighet", {
            rangeAdd: 45,
            rateMul: 1.15,
          }),
          tier("Snabblåsning", 155, "+65% eldhastighet", { rateMul: 1.65 }),
          tier("Dubbelkondensator", 300, "+55% eldhastighet, +40% skada", {
            rateMul: 1.55,
            damageMul: 1.4,
          }),
        ],
      },
    ],
  },
  cannon: {
    name: "Bastion",
    role: "Tung kanon / koncentrerad ytskada",
    description:
      "Tunga granater med en liten sprängradie. Bra mot täta, bepansrade grupper.",
    color: "#eda477",
    cost: 140,
    damage: 40,
    rate: 0.8,
    range: 165,
    projectileSpeed: 360,
    splash: 46,
    penetration: 0.35,
    paths: [
      {
        name: "Belägring",
        tiers: [
          tier("Högtryck", 95, "+50% skada, +15% pansarbrytning", {
            damageMul: 1.5,
            penetrationAdd: 0.15,
          }),
          tier("Volfram", 195, "+65% skada, +25% pansarbrytning", {
            damageMul: 1.65,
            penetrationAdd: 0.25,
          }),
          tier("Slagbrytare", 360, "+90% skada, full pansarbrytning", {
            damageMul: 1.9,
            penetrationAdd: 0.25,
          }),
        ],
      },
      {
        name: "Tryckvåg",
        tiers: [
          tier("Splitter", 85, "+20 sprängradie", { splashAdd: 20 }),
          tier("Chockgranat", 175, "Bromsar 25% i 1,2 s, +25% skada", {
            slowAdd: 0.25,
            slowTimeAdd: 1.2,
            damageMul: 1.25,
          }),
          tier("Massverkan", 330, "+25 sprängradie, +55% skada", {
            splashAdd: 25,
            damageMul: 1.55,
          }),
        ],
      },
    ],
  },
  mortar: {
    name: "Nova",
    role: "Artilleri / stora svärmar",
    description:
      "Stor sprängradie och lång räckvidd, men kan inte skjuta på mål närmare än 65. Granaterna träffar en markposition.",
    color: "#bd9af9",
    cost: 160,
    damage: 28,
    rate: 0.8,
    range: 230,
    minRange: 65,
    projectileSpeed: 260,
    splash: 80,
    ground: true,
    paths: [
      {
        name: "Fragmentering",
        tiers: [
          tier("Vid laddning", 100, "+22 sprängradie, +20% skada", {
            splashAdd: 22,
            damageMul: 1.2,
          }),
          tier("Kaskad", 200, "+65% skada, +15 sprängradie", {
            damageMul: 1.65,
            splashAdd: 15,
          }),
          tier("Supernova", 370, "+90% skada, +20 räckvidd", {
            damageMul: 1.9,
            rangeAdd: 20,
          }),
        ],
      },
      {
        name: "Termisk",
        tiers: [
          tier("Glödgranat", 95, "Bränner 8 skada/s i 3 s", {
            burnAdd: 8,
            burnTimeAdd: 3,
          }),
          tier("Plasmablandning", 190, "+16 brandskada/s, +25% skada", {
            burnAdd: 16,
            damageMul: 1.25,
          }),
          tier("Solstorm", 360, "+34 brandskada/s, +1 s brandtid", {
            burnAdd: 34,
            burnTimeAdd: 1,
          }),
        ],
      },
    ],
  },
  cryo: {
    name: "Frostlänk",
    role: "Kontroll / bromsning",
    description:
      "Bromsar grupper 32% i 1,6 s. Skapar mer skjuttid åt andra torn. Bossar har motstånd mot bromsning.",
    color: "#83d7f4",
    cost: 90,
    damage: 4,
    rate: 1.3,
    range: 140,
    projectileSpeed: 450,
    splash: 34,
    slow: 0.32,
    slowTime: 1.6,
    paths: [
      {
        name: "Djupfrysning",
        tiers: [
          tier("Kallfront", 65, "+10% bromsning, +0,4 s varaktighet", {
            slowAdd: 0.1,
            slowTimeAdd: 0.4,
          }),
          tier("Permafrost", 135, "+12% bromsning, +18 effektområde", {
            slowAdd: 0.12,
            splashAdd: 18,
          }),
          tier("Absolut noll", 260, "+14% bromsning, +1 s varaktighet", {
            slowAdd: 0.14,
            slowTimeAdd: 1,
          }),
        ],
      },
      {
        name: "Sprödhet",
        tiers: [
          tier("Sprickbildning", 65, "Träffade fiender tar 12% extra skada", {
            vulnerabilityAdd: 0.12,
          }),
          tier("Kristallisering", 135, "+13% sårbarhet, +25 räckvidd", {
            vulnerabilityAdd: 0.13,
            rangeAdd: 25,
          }),
          tier("Brytpunkt", 260, "+15% sårbarhet, +60% eldhastighet", {
            vulnerabilityAdd: 0.15,
            rateMul: 1.6,
          }),
        ],
      },
    ],
  },
  gatling: {
    name: "Gatling",
    role: "Närförsvar / hög eldvolym",
    description:
      "Mycket hög eldhastighet. Effektiv mot lätta mål och snabba fiender inom räckvidd.",
    color: "#ee8aa6",
    cost: 150,
    damage: 4,
    rate: 9,
    range: 140,
    projectileSpeed: 760,
    paths: [
      {
        name: "Övervarv",
        tiers: [
          tier("Kylmantel", 100, "+30% eldhastighet", { rateMul: 1.3 }),
          tier("Sex pipor", 205, "+40% eldhastighet, +25% skada", {
            rateMul: 1.4,
            damageMul: 1.25,
          }),
          tier("Orkan", 390, "+50% eldhastighet, +40% skada", {
            rateMul: 1.5,
            damageMul: 1.4,
          }),
        ],
      },
      {
        name: "Penetrator",
        tiers: [
          tier("Stålkärna", 100, "+25% skada, +30% pansarbrytning", {
            damageMul: 1.25,
            penetrationAdd: 0.3,
          }),
          tier("Urholkning", 205, "+60% skada, +25% pansarbrytning", {
            damageMul: 1.6,
            penetrationAdd: 0.25,
          }),
          tier("Pansarsåg", 390, "+80% skada, +30% pansarbrytning", {
            damageMul: 1.8,
            penetrationAdd: 0.3,
          }),
        ],
      },
    ],
  },
  relay: {
    name: "Relä",
    role: "Stöd / förstärker andra torn",
    description:
      "Ger närliggande stridstorn +10% skada och +16% eldhastighet. Starkaste bonusen gäller; flera reläer staplas inte.",
    color: "#99afff",
    cost: 130,
    damage: 0,
    rate: 0,
    range: 135,
    projectileSpeed: 0,
    buffDamage: 0.1,
    buffRate: 0.16,
    paths: [
      {
        name: "Förstärkare",
        tiers: [
          tier("Effektsteg", 90, "+8% skadebonus", { buffDamageAdd: 0.08 }),
          tier("Högeffekt", 185, "+12% skadebonus, +15 räckvidd", {
            buffDamageAdd: 0.12,
            rangeAdd: 15,
          }),
          tier("Reaktor", 350, "+20% skadebonus", { buffDamageAdd: 0.2 }),
        ],
      },
      {
        name: "Synkronisering",
        tiers: [
          tier("Länkvidd", 85, "+30 räckvidd", { rangeAdd: 30 }),
          tier("Taktgenerator", 180, "+16% eldhastighetsbonus", {
            buffRateAdd: 0.16,
          }),
          tier("Nätverk", 340, "+25% eldhastighetsbonus, +25 räckvidd", {
            buffRateAdd: 0.25,
            rangeAdd: 25,
          }),
        ],
      },
    ],
  },
};
export const ENEMIES = {
  normal: {
    name: "Drönare",
    hp: 38,
    speed: 58,
    reward: 6,
    leak: 1,
    radius: 10,
    color: "#e59782",
    armor: 0,
  },
  fast: {
    name: "Löpare",
    hp: 27,
    speed: 96,
    reward: 6,
    leak: 1,
    radius: 9,
    color: "#e9c663",
    armor: 0,
  },
  swift: {
    name: "Pil",
    hp: 24,
    speed: 148,
    reward: 7,
    leak: 1,
    radius: 8,
    color: "#eedf9c",
    armor: 0,
  },
  tank: {
    name: "Koloss",
    hp: 205,
    speed: 37,
    reward: 14,
    leak: 3,
    radius: 16,
    color: "#a8b7c4",
    armor: 0.1,
  },
  armored: {
    name: "Pansardrönare",
    hp: 105,
    speed: 54,
    reward: 10,
    leak: 2,
    radius: 12,
    color: "#94abcb",
    armor: 0.55,
  },
  regen: {
    name: "Reparatör",
    hp: 90,
    speed: 65,
    reward: 11,
    leak: 2,
    radius: 11,
    color: "#8dd6a3",
    armor: 0.05,
    regen: 0.035,
  },
  elite: {
    name: "Väktare",
    hp: 410,
    speed: 52,
    reward: 26,
    leak: 4,
    radius: 19,
    color: "#d79ff1",
    armor: 0.35,
    slowResist: 0.35,
  },
  boss: {
    name: "Belägraren",
    hp: 1900,
    speed: 28,
    reward: 130,
    leak: 12,
    radius: 26,
    color: "#f18399",
    armor: 0.3,
    slowResist: 0.65,
  },
};
export function towerStats(tower) {
  const base = TOWERS[tower.kind];
  const s = {
    damage: base.damage,
    rate: base.rate,
    range: base.range,
    projectileSpeed: base.projectileSpeed,
    minRange: base.minRange || 0,
    splash: base.splash || 0,
    penetration: base.penetration || 0,
    slow: base.slow || 0,
    slowTime: base.slowTime || 0,
    burn: 0,
    burnTime: 0,
    vulnerability: 0,
    buffDamage: base.buffDamage || 0,
    buffRate: base.buffRate || 0,
    ground: !!base.ground,
  };
  for (let p = 0; p < 2; p++)
    for (let l = 0; l < (tower.levels?.[p] || 0); l++) {
      for (const [key, value] of Object.entries(
        base.paths[p].tiers[l].changes,
      )) {
        if (key.endsWith("Mul")) s[key.slice(0, -3)] *= value;
        else s[key.slice(0, -3)] += value;
      }
    }
  s.penetration = Math.min(1, s.penetration);
  s.slow = Math.min(0.7, s.slow);
  return s;
}
export function upgradeOption(tower, path) {
  if (!Number.isInteger(path) || path < 0 || path > 1) return null;
  const level = tower.levels[path];
  if (level >= 3) return { maxed: true, locked: false };
  return {
    ...TOWERS[tower.kind].paths[path].tiers[level],
    level: level + 1,
    locked: level >= 1 && tower.levels[1 - path] >= 2,
    maxed: false,
  };
}

import { tr } from './i18n.js';

// Field notes can be found before a commission. Operations require its active instructions.
const note = target => ({ type: 'record', target, count: 1, label: tr(`work.${target}`) });
const operate = target => ({ type: 'operate', target, count: 1, label: tr(`work.${target}`) });
const hunt = (target, count) => ({ type: 'kill', target, count, label: tr(`work.${target}`) });
function story(id, npc, objectives, rewards, options = {}) {
  return { name: tr(`quest.${id}.name`), text: tr(`quest.${id}.text`),
    ending: tr(`quest.${id}.ending`), npc, objectives, rewards, optional: true, ...options };
}

export const TIDE_QUESTS = {
  ferry: story('ferry', 'nell', [note('mooring'), note('skiff')],
    { xp: 30, gold: 7, items: {} }),
  well: story('well', 'mira', [note('trough'), note('drain')],
    { xp: 30, gold: 8, items: { potion: 2 } }),
  rollcall: story('rollcall', 'nell', [note('plate')],
    { xp: 35, gold: 12, items: {} }, { requires: 'ferry', turnIn: 'elin' }),
  lanterns: story('lanterns', 'elin', [operate('nearLamp'), operate('farLamp')],
    { xp: 38, gold: 9, items: { potion: 1 } }, { ordered: true }),
  dryBed: story('dryBed', 'signe', [note('notch'), note('silt')],
    { xp: 65, gold: 16, items: {} }, { requires: 'beacon', turnIn: 'nell' }),
  reedBed: story('reedBed', 'signe', [hunt('shearwing', 2), note('blind')],
    { xp: 82, gold: 20, items: { potion: 2 } }, { requires: 'beacon' }),
  passengers: story('passengers', 'nell', [note('votive'), note('cairn')],
    { xp: 70, gold: 18, items: { copperBand: 1 } }, { requires: 'dryBed', turnIn: 'signe' }),
  tollHeron: story('tollHeron', 'nell', [note('tollArch'), hunt('knell', 1)],
    { xp: 98, gold: 24, items: { duskGrips: 1 } }, { requires: 'beacon' }),
  shift: story('shift', 'orin', [note('clock'), note('tin')],
    { xp: 115, gold: 32, items: {} }, { requires: 'heart' }),
  rivets: story('rivets', 'orin', [operate('bleeder'), operate('wheel')],
    { xp: 125, gold: 32, items: { potion: 3 } }, { requires: 'heart', turnIn: 'ada', ordered: true }),
  blueRoad: story('blueRoad', 'orin', [note('pilot')],
    { xp: 210, gold: 40, items: { potion: 2 } }, { requires: 'lastCasting', turnIn: 'linn', optional: false }),
  soundings: story('soundings', 'linn', [note('westStaff'), note('eastStaff'), operate('eastValve')],
    { xp: 240, gold: 44, items: {} }, { requires: 'blueRoad', optional: false }),
  balance: story('balance', 'linn', [hunt('manta', 1), operate('floatNet')],
    { xp: 265, gold: 48, items: { saltMantle: 1 } }, { requires: 'soundings', optional: false, ordered: true }),
  moonDial: story('moonDial', 'linn', [hunt('ebbwright', 1), operate('dialBrake')],
    { xp: 370, gold: 75, items: { pilotRing: 1 } }, { requires: 'balance', optional: false, ordered: true }),
  letters: story('letters', 'linn', [note('mail')],
    { xp: 145, gold: 35, items: {} }, { requires: 'blueRoad', turnIn: 'nell' })
};

export const TIDE_NPCS = [
  { id: 'nell', x: 902, y: 706, color: 'reed', name: tr('tide.nell'), role: tr('tide.nellRole'), greeting: tr('tide.nellHello') },
  { id: 'orin', x: 2598, y: 776, color: 'copper', name: tr('tide.orin'), role: tr('tide.orinRole'), greeting: tr('tide.orinHello') },
  { id: 'linn', x: 2816, y: 760, color: 'brine', name: tr('tide.linn'), role: tr('tide.linnRole'), greeting: tr('tide.linnHello') }
];

function fieldwork(id, sprite, x, y, kind = 'record') {
  return { id, kind, sprite, x, y, prompt: tr(`work.${id}`), text: tr(`lore.${id}`) };
}

export const TIDE_MARKS = [
  fieldwork('mooring', 'bollard', 941, 795),
  fieldwork('skiff', 'skiff', 917, 1000),
  fieldwork('trough', 'trough', 261, 614),
  fieldwork('drain', 'trough', 257, 899),
  fieldwork('plate', 'tablet', 1164, 637),
  fieldwork('nearLamp', 'lamp', 688, 840, 'operate'),
  fieldwork('farLamp', 'lamp', 934, 684, 'operate'),
  fieldwork('notch', 'tablet', 1292, 581),
  fieldwork('silt', 'bollard', 1410, 865),
  fieldwork('blind', 'blind', 1472, 1124),
  fieldwork('votive', 'tablet', 1416, 335),
  fieldwork('cairn', 'cairn', 1632, 1190),
  fieldwork('tollArch', 'tollArch', 1192, 314),
  fieldwork('clock', 'tablet', 2452, 684),
  fieldwork('tin', 'tin', 2436, 1155),
  fieldwork('bleeder', 'wheel', 2480, 824, 'operate'),
  fieldwork('wheel', 'wheel', 2200, 1118, 'operate'),
  fieldwork('pilot', 'tablet', 2690, 772),
  fieldwork('westStaff', 'staff', 2832, 518),
  fieldwork('eastStaff', 'staff', 3220, 602),
  { ...fieldwork('eastValve', 'brassWheel', 2940, 810, 'operate'), prompt: tr('tide.eastValve'), readings: ['westStaff', 'eastStaff'] },
  { id: 'westValve', kind: 'operate', sprite: 'blueWheel', x: 2880, y: 810, alternativeFor: 'eastValve',
    readings: ['westStaff', 'eastStaff'], prompt: tr('tide.westValve'), text: tr('lore.westValve') },
  fieldwork('floatNet', 'float', 3124, 1040, 'operate'),
  fieldwork('dialBrake', 'dial', 3110, 170, 'operate'),
  fieldwork('mail', 'mailbox', 3340, 1128),
  fieldwork('cove', 'cairn', 2778, 1025),
  fieldwork('whistle', 'staff', 1335, 978),
  { id: 'soundingFire', kind: 'fire', checkpoint: 'sounding', x: 2810, y: 824 },
  { id: 'survivorsBox', kind: 'chest', x: 2872, y: 1045, item: 'seaGrips', quantity: 1 },
  { id: 'reedCache', kind: 'chest', x: 1330, y: 1048, item: 'potion', quantity: 3 }
];

export const TIDE_SPAWNS = [
  ['knell', 1232, 215],
  ['shearwing', 1510, 1040], ['shearwing', 1720, 1170],
  ['claw', 2970, 735], ['claw', 3060, 905], ['claw', 2900, 425],
  ['manta', 3012, 1016], ['manta', 3260, 1020],
  ['heron', 3270, 474], ['heron', 3010, 350],
  ['ebbwright', 3110, 250]
];

// Content IDs are stable: saves and a future server refer to IDs, never UI labels.
export const VERSION = '0.3.0';
export const ITEMS = Object.freeze({
  trainingSword: { value: 1, name: 'Vandrarsvärd', slot: 'weapon', rarity: 'common', attack: 2, icon: 'sword', description: 'En sliten klinga. Ett nytt kapitel.' },
  linenCoat: { value: 1, name: 'Resekappa', slot: 'armor', rarity: 'common', defense: 1, icon: 'armor', description: 'Lätt nog för långa vandringar.' },
  keeperBlade: { value: 14, name: 'Lyktvaktens klinga', slot: 'weapon', rarity: 'uncommon', attack: 7, icon: 'sword', description: 'Smidd för att hålla mörkret på avstånd.' },
  forestCoat: { value: 14, name: 'Skogsväktarens mantel', slot: 'armor', rarity: 'uncommon', defense: 4, hp: 12, icon: 'armor', description: 'Mjuk mossa, starka sömmar.' },
  moonBlade: { value: 24, name: 'Månskärva', slot: 'weapon', rarity: 'rare', attack: 10, icon: 'sword', description: 'En gammal klinga med ett svalt sken.' },
  beaconCharm: { questItem: true, name: 'Fyrens hjärta', slot: 'charm', rarity: 'rare', attack: 3, hp: 24, icon: 'charm', description: 'Ett litet ljus som aldrig ger upp.' },
  potion: { value: 4, name: 'Läkedryck', rarity: 'common', icon: 'potion', description: 'Återställer 55 hälsa. 8 sekunders återhämtning.' },
  amber: { name: 'Skogsbärnsten', rarity: 'common', icon: 'amber', value: 4, description: 'Ivo köper dessa för 4 guld styck.' },
  swiftBlade: { name: 'Vargtand', slot: 'weapon', rarity: 'uncommon', attack: 7, haste: .20, value: 16, icon: 'sword', description: 'En lätt klinga för snabba, sammanhängande hugg.' },
  trailCharm: { name: 'Vandrarens vind', slot: 'charm', rarity: 'uncommon', speed: 12, recovery: .5, value: 14, icon: 'charm', description: 'Snabbare steg och kortare väntan mellan undanmanövrer.' },
  barkCoat: { name: 'Barkvävd jacka', slot: 'armor', rarity: 'uncommon', defense: 3, hp: 24, value: 14, icon: 'armor', description: 'Mer livskraft, lite mindre skydd än skogsväktarens mantel.' },
  marshCoat: { name: 'Glödmyrens väktarmantel', slot: 'armor', rarity: 'rare', defense: 6, hp: 24, value: 24, icon: 'armor', description: 'Signes runor leder bort hettan från myren.' },
  emberCharm: { name: 'Glödvingens sigill', slot: 'charm', rarity: 'rare', attack: 2, haste: .12, value: 24, icon: 'charm', description: 'En varm sten som ger dina hugg en lättare rytm.' },
  emberBlade: { name: 'Askgryning', slot: 'weapon', rarity: 'rare', attack: 14, value: 30, icon: 'sword', description: 'Smidd ur myrens sista glöd. Början på nästa resa.' },
  ironCharm: { name: 'Järnrot', slot: 'charm', rarity: 'uncommon', defense: 2, hp: 12, value: 18, icon: 'shield', description: 'Ett stadigt fäste när striden blir närgången.' },
  runnerWrap: { name: 'Skymningsväv', slot: 'armor', rarity: 'uncommon', defense: 2, haste: .06, speed: 6, value: 20, icon: 'armor', description: 'Vävd för snabba steg, med mindre skydd än en tung mantel.' },
  runeFocus: { name: 'Runvävarens prisma', slot: 'charm', rarity: 'uncommon', spellPower: .12, value: 22, icon: 'crystal', description: 'Förstärker skadan från Lyktslag och Glimtskott med 12%.' },
  emberShard: { name: 'Glödskärva', rarity: 'uncommon', icon: 'amber', value: 7, description: 'En svalnande glödsten. Ivo köper den för 7 guld.' }
});
export const ENEMIES = Object.freeze({
  sprout: { name: 'Taggrot', behavior: 'melee', level: 1, hp: 36, attack: 6, speed: 48, xp: 16, gold: 3, aggro: 135, leash: 200, radius: 12, cooldown: 1.6 },
  wolf: { name: 'Skymningsvarg', behavior: 'pounce', level: 2, hp: 68, attack: 12, speed: 65, xp: 26, gold: 5, aggro: 165, leash: 240, radius: 13, cooldown: 2.2 },
  warden: { name: 'Den rotbundne väktaren', behavior: 'melee', level: 4, hp: 300, attack: 21, speed: 40, xp: 95, gold: 28, aggro: 185, leash: 280, radius: 23, cooldown: 2.8, boss: true, flag: 'wardenDefeated' },
  wisp: { name: 'Glödvinge', behavior: 'ranged', level: 4, hp: 92, attack: 17, speed: 49, xp: 34, gold: 7, aggro: 225, leash: 260, radius: 12, cooldown: 2.1 },
  ancient: { name: 'Myrhjärtat', behavior: 'eruption', level: 6, hp: 1350, attack: 44, speed: 30, xp: 145, gold: 40, aggro: 220, leash: 270, radius: 24, cooldown: 2.4, boss: true, flag: 'ancientDefeated' }
});
// One weighted drop per kill. Copies stay in the bag for individual trading.
export const LOOT_TABLES = Object.freeze({
  sprout: [['amber', 68], ['potion', 25], ['barkCoat', 7]],
  wolf: [['amber', 60], ['potion', 22], ['swiftBlade', 10], ['trailCharm', 8]],
  warden: [['moonBlade', 100]],
  wisp: [['emberShard', 68], ['potion', 22], ['emberCharm', 10]],
  ancient: [['emberCharm', 100]]
});
export const QUESTS = Object.freeze({
  roots: { name: 'Ljus längs vägen', npc: 'elin', text: 'Taggrötterna har tagit över stigen öster om byn. Besegra fem och kom tillbaka, så får du en riktig lyktvaktsklinga.',
    objectives: [{ type: 'kill', target: 'sprout', count: 5, label: 'Besegra taggrötter' }], rewards: { xp: 60, gold: 18, items: { keeperBlade: 1 } } },
  herbs: { name: 'En glimt av liv', npc: 'mira', text: 'Tre glimörter växer längs skogsstigen: en vid byns östra utkant och två vid bron. Samla dem med E så syr jag en mantel åt dig.',
    objectives: [{ type: 'gather', target: 'glimmer', count: 3, label: 'Samla glimört' }], rewards: { xp: 45, gold: 10, items: { forestCoat: 1, potion: 2 } } },
  beacon: { name: 'Fyren som tystnade', npc: 'elin', requires: 'roots', text: 'Bortom bron, i nordost, vilar den gamla fyren. Besegra den rotbundne väktaren, tänd fyren med E och återvänd till mig. Ta gärna med Miras mantel och några läkedrycker.',
    objectives: [{ type: 'kill', target: 'warden', count: 1, label: 'Besegra väktaren' }, { type: 'beacon', target: 'beacon', count: 1, label: 'Återtänd fyren' }],
    rewards: { xp: 100, gold: 40, items: { beaconCharm: 1 } } },
  embers: { name: 'Skrift i askan', npc: 'signe', requires: 'beacon', text: 'Fyrens ljus väckte runorna i Glödmyren, söder om skogsstigen. Läs de tre runstenarna med E och besegra fyra glödvingar. Deras skott går att undvika genom att röra sig åt sidan.',
    objectives: [{ type: 'rune', target: 'ember', count: 3, label: 'Läs myrens runstenar' }, { type: 'kill', target: 'wisp', count: 4, label: 'Besegra glödvingar' }],
    rewards: { xp: 110, gold: 36, items: { marshCoat: 1, potion: 2 } } },
  heart: { name: 'Ett hjärta av glöd', npc: 'signe', requires: 'embers', text: 'Runorna pekar mot Myrhjärtat vid den gamla slussen i sydost. Det markerar marken innan glöden bryter fram. Besegra det, återställ sigillet med E och kom tillbaka till mig.',
    objectives: [{ type: 'kill', target: 'ancient', count: 1, label: 'Besegra Myrhjärtat' }, { type: 'seal', target: 'seal', count: 1, label: 'Återställ myrens sigill' }],
    rewards: { xp: 160, gold: 60, items: { emberBlade: 1 } } }
});
export const NPCS = Object.freeze([
  { id: 'elin', name: 'Elin', role: 'Lyktvakt', x: 528, y: 832, color: 'gold', greeting: 'Välkommen till Lyktdalen. Så länge byns lykta brinner finns det en väg hem.' },
  { id: 'mira', name: 'Mira', role: 'Örtkännare & mentor', x: 352, y: 768, color: 'rose', greeting: 'Skogen bär både sår och läkedom. Vila här en stund; jag ser till att du blir hel igen.' },
  { id: 'ivo', name: 'Ivo', role: 'Handlare', x: 640, y: 784, color: 'blue', greeting: 'En flaska i väskan är värd två på hyllan. Visa mig det du vill sälja, eller se vad jag har på hyllorna.' },
  { id: 'signe', name: 'Signe', role: 'Runvandrare', x: 1264, y: 768, color: 'rose', greeting: 'Jag såg fyren tändas. Nu svarar något under myren. Vila vid lägrets lykta innan du följer glöden söderut.' }
]);
export const SPAWN = Object.freeze({ x: 448, y: 880 });
export const CHECKPOINTS = Object.freeze({ village: SPAWN, camp: { x: 1232, y: 784 } });
export const xpForLevel = level => 60 + (level - 1) * 35;
export const RARITIES = { common: 'Vanlig', uncommon: 'Ovanlig', rare: 'Sällsynt' };

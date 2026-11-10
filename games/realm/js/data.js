// Content IDs are stable: saves and a future server refer to IDs, never UI labels.
export const VERSION = '0.1.0';
export const ITEMS = Object.freeze({
  trainingSword: { name: 'Vandrarsvärd', slot: 'weapon', rarity: 'common', attack: 2, icon: 'sword', description: 'En sliten klinga. Ett nytt kapitel.' },
  linenCoat: { name: 'Resekappa', slot: 'armor', rarity: 'common', defense: 1, icon: 'armor', description: 'Lätt nog för långa vandringar.' },
  keeperBlade: { name: 'Lyktvaktens klinga', slot: 'weapon', rarity: 'uncommon', attack: 7, icon: 'sword', description: 'Smidd för att hålla mörkret på avstånd.' },
  forestCoat: { name: 'Skogsväktarens mantel', slot: 'armor', rarity: 'uncommon', defense: 4, hp: 12, icon: 'armor', description: 'Mjuk mossa, starka sömmar.' },
  moonBlade: { name: 'Månskärva', slot: 'weapon', rarity: 'rare', attack: 10, icon: 'sword', description: 'En gammal klinga med ett svalt sken.' },
  beaconCharm: { name: 'Fyrens hjärta', slot: 'charm', rarity: 'rare', attack: 3, hp: 24, icon: 'charm', description: 'Ett litet ljus som aldrig ger upp.' },
  potion: { name: 'Läkedryck', rarity: 'common', icon: 'potion', description: 'Återställer 55 hälsa. 8 sekunders återhämtning.' },
  amber: { name: 'Skogsbärnsten', rarity: 'common', icon: 'amber', value: 4, description: 'Ivo köper dessa för 4 guld styck.' }
});
export const ENEMIES = Object.freeze({
  sprout: { name: 'Taggrot', level: 1, hp: 36, attack: 6, speed: 48, xp: 16, gold: 3, aggro: 135, leash: 200, radius: 12, cooldown: 1.6 },
  wolf: { name: 'Skymningsvarg', level: 2, hp: 62, attack: 10, speed: 76, xp: 26, gold: 5, aggro: 165, leash: 240, radius: 13, cooldown: 1.8 },
  warden: { name: 'Den rotbundne väktaren', level: 4, hp: 260, attack: 19, speed: 40, xp: 95, gold: 28, aggro: 185, leash: 280, radius: 23, cooldown: 2.8, boss: true }
});
export const QUESTS = Object.freeze({
  roots: { name: 'Ljus längs vägen', npc: 'elin', text: 'Taggrötterna har tagit över stigen öster om byn. Besegra fem och kom tillbaka, så får du en riktig lyktvaktsklinga.',
    objectives: [{ type: 'kill', target: 'sprout', count: 5, label: 'Besegra taggrötter' }], rewards: { xp: 60, gold: 18, items: { keeperBlade: 1 } } },
  herbs: { name: 'En glimt av liv', npc: 'mira', text: 'Tre glimörter växer längs skogsstigen: en vid byns östra utkant och två vid bron. Samla dem med E så syr jag en mantel åt dig.',
    objectives: [{ type: 'gather', target: 'glimmer', count: 3, label: 'Samla glimört' }], rewards: { xp: 45, gold: 10, items: { forestCoat: 1, potion: 2 } } },
  beacon: { name: 'Fyren som tystnade', npc: 'elin', requires: 'roots', text: 'Bortom bron, i nordost, vilar den gamla fyren. Besegra den rotbundne väktaren, tänd fyren med E och återvänd till mig. Ta gärna med Miras mantel och några läkedrycker.',
    objectives: [{ type: 'kill', target: 'warden', count: 1, label: 'Besegra väktaren' }, { type: 'beacon', target: 'beacon', count: 1, label: 'Återtänd fyren' }],
    rewards: { xp: 100, gold: 40, items: { beaconCharm: 1 } } }
});
export const NPCS = Object.freeze([
  { id: 'elin', name: 'Elin', role: 'Lyktvakt', x: 528, y: 832, color: 'gold', greeting: 'Välkommen till Lyktdalen. Så länge byns lykta brinner finns det en väg hem.' },
  { id: 'mira', name: 'Mira', role: 'Örtkännare', x: 352, y: 768, color: 'rose', greeting: 'Skogen bär både sår och läkedom. Vila här en stund; jag ser till att du blir hel igen.' },
  { id: 'ivo', name: 'Ivo', role: 'Handlare', x: 640, y: 784, color: 'blue', greeting: 'En flaska i väskan är värd två på hyllan. Jag köper gärna din skogsbärnsten.' }
]);
export const SPAWN = Object.freeze({ x: 448, y: 880 });
export const xpForLevel = level => 60 + (level - 1) * 35;
export const RARITIES = { common: 'Vanlig', uncommon: 'Ovanlig', rare: 'Sällsynt' };

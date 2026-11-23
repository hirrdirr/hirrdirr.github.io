import { bagId, bagCount, put, setBag, equipTemplate, sellTemplate, itemRef, gearTemplates, totals, legacyView } from './item-helpers.mjs';
import { templateId, discardItem } from '../js/item-instances.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, LOOT_TABLES } from '../js/data.js';
import { createGame, command, stats, step } from '../js/simulation.js';
import { EQUIPMENT_SLOTS, EQUIPMENT_DEFINITIONS, acceptsEquipment, compatibleSlots, emptyEquipment, BAG_SLOTS } from '../js/inventory.js';
import { serialize, deserialize, SAVE_VERSION } from '../js/save.js';
import { MERCHANTS } from '../js/trading.js';
import { characterPanel, characterItemDetail } from '../js/character-panel.js';
import { compareEquipment, tradePanel } from '../js/ui-panels.js';
const fixture = await readFile(new URL('./fixtures/v0.4.1-equipment.json', import.meta.url), 'utf8');
const newIds = ['trailCap','fenCowl','mossMantle','briarPads','workGloves','duskGrips','linenLegs','reedLegs','trailBoots','fenBoots','copperBand','emberBand'];
const data = s => JSON.parse(serialize(s)).data;
const total = totals;
const fullBag = (p, exclude = []) => setBag(p, Object.fromEntries(Object.keys(ITEMS).filter(id => !exclude.includes(id)).slice(0, BAG_SLOTS).map(id => [id, 1])));
const fullSet = { head:'fenCowl', shoulders:'briarPads', hands:'duskGrips', legs:'reedLegs', feet:'fenBoots', ring1:'emberBand', ring2:'emberBand' };
function wear(s, set) { for (const [slot,id] of Object.entries(set)) { const [ref]=put(s.player,id); assert.equal(command(s,{type:'equip',id:ref,slot}),true); } }

test('ten physical slots use centralized categories; both rings share one category', () => {
  assert.deepEqual(EQUIPMENT_SLOTS, ['weapon','armor','charm','head','shoulders','hands','legs','feet','ring1','ring2']);
  assert.deepEqual(compatibleSlots('copperBand'), ['ring1','ring2']);
  assert.equal(ITEMS.copperBand.slot, 'ring'); assert.equal(EQUIPMENT_DEFINITIONS.ring2.category, 'ring');
  assert.equal(acceptsEquipment('__proto__','copperBand'),false);
  assert.equal(acceptsEquipment('ring1',['copperBand']),false);
});

test('every item accepts only matching slots and transfers exactly one copy in both directions', () => {
  for (const [id,item] of Object.entries(ITEMS).filter(([,i])=>i.slot)) for (const slot of EQUIPMENT_SLOTS) {
    const s=createGame(); const [ref]=put(s.player,id); const before=data(s), owned=total(s.player);
    const appropriate=item.slot===(slot.startsWith('ring')?'ring':slot);
    assert.equal(command(s,{type:'equip',id:ref,slot}),appropriate,`${id} -> ${slot}`);
    if (!appropriate) { assert.deepEqual(data(s),before); continue; }
    assert.equal(s.player.equipment[slot],ref); assert.deepEqual(total(s.player),owned);
    assert.equal(command(s,{type:'unequip',slot}),true); assert.deepEqual(total(s.player),owned);
  }
});

test('two worn rings require two real copies; moving and same-item swapping conserve ownership', () => {
  const s=createGame(),p=s.player;put(p,'copperBand',1);const base=stats(p);
  assert.equal(equipTemplate(s,'copperBand','ring2'),true);
  const before=data(s);assert.equal(equipTemplate(s,'copperBand','ring1'),false);assert.deepEqual(data(s),before);
  assert.equal(stats(p).maxHp,base.maxHp+4);
  command(s,{type:'unequip',slot:'ring2'});equipTemplate(s,'copperBand','ring1');
  assert.equal(p.equipment.ring2,null);assert.equal((bagCount(p,'copperBand') || undefined),undefined);
  put(p,'copperBand',2);const owned=total(p);
  equipTemplate(s,'copperBand','ring2');
  assert.equal(stats(p).maxHp,base.maxHp+8);assert.equal((bagCount(p,'copperBand') || undefined),1);
  for(let i=0;i<8;i++){equipTemplate(s,'copperBand','ring2');assert.deepEqual(total(p),owned);assert.equal(stats(p).maxHp,base.maxHp+8);}
  for(const slot of ['ring1','ring2'])command(s,{type:'unequip',slot});
  assert.equal((bagCount(p,'copperBand') || undefined),3);assert.deepEqual(stats(p),base);
});

test('implicit ring commands choose an empty slot, explicit invalid targets never fall back', () => {
  const s=createGame();put(s.player,'copperBand',2);
  equipTemplate(s,'copperBand');equipTemplate(s,'copperBand');
  assert.equal(gearTemplates(s.player).ring1,'copperBand');assert.equal(gearTemplates(s.player).ring2,'copperBand');
  put(s.player,'emberBand',1);
  for(const slot of ['ring','armor','constructor',null,[],{}]){const before=data(s);assert.equal(command(s,{type:'equip',id:bagId(s.player,'emberBand'),slot}),false);assert.deepEqual(data(s),before);}
});

test('new-slot and ring swaps are atomic with a full non-stacking bag', () => {
  for(const [slot,oldId,nextId] of [['head','trailCap','fenCowl'],['ring1','copperBand','emberBand'],['ring2','emberBand','copperBand']]) {
    const s=createGame(),p=s.player;wear(s,{[slot]:oldId});setBag(p,{[nextId]:15,potion:999});
    const before=data(s);assert.equal(command(s,{type:'unequip',slot}),false);assert.deepEqual(data(s),before);
    const ref=bagId(p,nextId),previous=p.equipment[slot],owned=total(p);
    assert.equal(command(s,{type:'equip',slot,id:ref}),true);assert.deepEqual(total(p),owned);assert.equal(p.inventory[previous],1);
    const full=data(s);assert.equal(command(s,{type:'unequip',slot}),false);assert.deepEqual(data(s),full);
  }
});

test('actual 0.4.1 save retains every persisted value and gains only seven empty slots', () => {
  const expected=JSON.parse(fixture).data;expected.player.equipment={...emptyEquipment(),...expected.player.equipment};
  let s=deserialize(fixture);assert.equal(SAVE_VERSION,5);assert.deepEqual(legacyView(data(s)),expected);
  for(let i=0;i<10;i++){s=deserialize(serialize(s));assert.deepEqual(legacyView(data(s)),expected);}
});

test('all ten equipped slots, two identical rings, bag duplicates and pending rewards round trip', () => {
  let s=deserialize(fixture);wear(s,fullSet);put(s.player,'emberBand',3);s.drops.push({id:1,x:s.player.x,y:s.player.y,item:itemRef(s.player,'fenCowl'),life:80});
  const expected=data(s),owned=total(s.player),st=stats(s.player);
  for(let i=0;i<10;i++){s=deserialize(serialize(s));assert.deepEqual(data(s),expected);assert.deepEqual(total(s.player),owned);assert.deepEqual(stats(s.player),st);}
});

test('malformed current-slot references reject the save without mutating the character', () => {
  const s=createGame();put(s.player,'copperBand',2);const before=data(s),st=stats(s.player);
  const raw=JSON.parse(serialize(s));raw.data.player.equipment.head=bagId(s.player,'copperBand');
  assert.throws(()=>deserialize(JSON.stringify(raw)),/identities/);assert.deepEqual(data(s),before);assert.deepEqual(stats(s.player),st);
});

test('buying, selling and buyback of spare rings never touch either worn ring', () => {
  let s=createGame();Object.assign(s.player,{x:640,y:784,gold:500});
  for(let i=0;i<3;i++)assert.equal(command(s,{type:'buy',id:'copperBand'}),true);
  equipTemplate(s,'copperBand','ring1');equipTemplate(s,'copperBand','ring2');
  const owned=total(s.player),gold=s.player.gold;
  for(let i=0;i<10;i++){
    assert.equal(sellTemplate(s,'copperBand'),true);assert.equal(sellTemplate(s,'copperBand'),false);
    assert.equal(gearTemplates(s.player).ring1,'copperBand');assert.equal(gearTemplates(s.player).ring2,'copperBand');
    const sale=s.buyback[0].id;assert.equal(command(s,{type:'buyback',id:sale}),true);assert.equal(command(s,{type:'buyback',id:sale}),false);
    s=deserialize(serialize(s));assert.deepEqual(total(s.player),owned);assert.equal(s.player.gold,gold);
  }
});

test('all twelve items have valid icons, bounded supported stats and obtainable sources', async () => {
  const svg=await readFile(new URL('../assets/icons.svg',import.meta.url),'utf8');
  const sources=new Set([...Object.values(LOOT_TABLES).flat().map(([id])=>id),...MERCHANTS.ivo.stock.map(o=>o.id)]);
  const supported=['hp','attack','defense','haste','speed','recovery','spellPower'];
  for(const id of newIds){const item=ITEMS[id];assert.ok(sources.has(id),id);assert.ok(compatibleSlots(id).length);assert.ok(item.name&&item.description&&item.value>0);assert.ok(supported.some(k=>item[k]>0));assert.match(svg,new RegExp(`id="${item.icon}"`));}
  for(const offer of MERCHANTS.ivo.stock)assert.ok(offer.price>ITEMS[offer.id].value);
  assert.equal(MERCHANTS.ivo.stock.filter(o=>newIds.includes(o.id)).length,4);
  for(const table of Object.values(LOOT_TABLES))assert.equal(table.reduce((n,[,w])=>n+w,0),100);
  assert.deepEqual(LOOT_TABLES.warden,[['moonBlade',100]]);assert.deepEqual(LOOT_TABLES.ancient,[['emberCharm',100]]);
});

test('real enemy kills can drop each new loot item and full-bag pickup keeps the reward', () => {
  for(const type of ['sprout','wolf','wisp']){
    const s=createGame(),e=s.enemies.find(e=>e.type===type);s.enemies=[e];s.player.level=20;
    const found=new Set();
    for(let i=0;i<2000;i++){
      Object.assign(e,{hp:1,mode:'idle',x:1504,y:648});Object.assign(s.player,{x:1464,y:648});s.player.cooldowns.attack=0;
      assert.equal(command(s,{type:'attack'}),true);const drop=s.drops.pop();found.add(templateId(s.player,drop.item));discardItem(s.player,drop.item);s.events=[];s.effects=[];
    }
    for(const [id] of LOOT_TABLES[type])assert.ok(found.has(id),id);
  }
  const s=createGame();fullBag(s.player,['fenCowl']);s.drops=[{id:1,x:s.player.x,y:s.player.y,item:itemRef(s.player,'fenCowl'),life:90}];
  step(s);assert.equal(s.drops.length,1);assert.equal((bagCount(s.player,'fenCowl') || undefined),undefined);
  delete s.player.inventory[Object.keys(s.player.inventory)[0]];step(s);assert.equal(s.drops.length,0);assert.equal((bagCount(s.player,'fenCowl') || undefined),1);
});

test('expanded stats apply exactly once with talents, no free healing or permanent bonuses', () => {
  const s=createGame(),p=s.player;p.level=6;p.talents={vigor:3,steel:1,tempo:1};p.hp=70;p.cooldowns.guard=9;
  const base=stats(p);wear(s,fullSet);const geared=stats(p),owned=total(p);
  assert.equal(geared.maxHp,base.maxHp+16);assert.equal(geared.attack,base.attack+2);assert.equal(geared.defense,base.defense+1);
  assert.ok(Math.abs(geared.haste-base.haste-.03)<1e-9);assert.equal(geared.speed,base.speed+5);
  assert.ok(Math.abs(geared.dodgeCooldown-(base.dodgeCooldown-.2))<1e-9);
  assert.ok(Math.abs(geared.burstMultiplier-base.burstMultiplier-.18)<1e-9);assert.equal(p.hp,70);
  for(let i=0;i<8;i++){
    for(const slot of Object.keys(fullSet))assert.equal(command(s,{type:'unequip',slot}),true);
    assert.deepEqual(stats(p),base);
    for(const [slot,id] of Object.entries(fullSet))assert.equal(equipTemplate(s,id,slot),true);
    assert.deepEqual(total(p),owned);assert.deepEqual(stats(p),geared);assert.equal(p.hp,70);assert.equal(p.cooldowns.guard,9);
  }
  p.hp=stats(p).maxHp;command(s,{type:'unequip',slot:'legs'});assert.equal(p.hp,stats(p).maxHp);
});

test('ring comparisons model each replacement separately and panel renders exactly ten functional slots', () => {
  const s=createGame();wear(s,{ring1:'copperBand',ring2:'emberBand'});put(s.player,'copperBand',1);
  assert.match(compareEquipment(s.player,'copperBand','ring1'),/same combat stats/);
  assert.match(compareEquipment(s.player,'copperBand','ring2'),/Strike damage/);
  const detail=characterItemDetail(s.player,{side:'bag',id:bagId(s.player,'copperBand')});
  for(const slot of ['ring1','ring2'])assert.match(detail,new RegExp(`data-action="equip" data-slot="${slot}"`));
  assert.match(tradePanel(s,{side:'stock',id:'copperBand'}),/Replace Ring 1/);assert.match(tradePanel(s,{side:'stock',id:'copperBand'}),/Replace Ring 2/);
  const html=characterPanel(s);assert.equal((html.match(/data-equipment=/g)||[]).length,10);
  for(const slot of EQUIPMENT_SLOTS)assert.match(html,new RegExp(`data-equipment="${slot}"`));
  assert.match(html,/character-preview/);assert.doesNotMatch(html,/undefined/);
});

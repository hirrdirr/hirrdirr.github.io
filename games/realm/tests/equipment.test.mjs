import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ITEMS, NPCS } from '../js/data.js';
import { createGame, command, stats, addItem } from '../js/simulation.js';
import { BAG_SLOTS, occupiedSlots, transferEquipment, emptyEquipment } from '../js/inventory.js';
import { serialize, deserialize, SaveStore, SAVE_KEY, SAVE_VERSION } from '../js/save.js';
import { bagId, bagCount, put, setBag, equipTemplate, gearTemplates, bagTemplates, totals, legacyView } from './item-helpers.mjs';

const legacy = await readFile(new URL('./fixtures/v0.3.1-equipment.json', import.meta.url), 'utf8');
const data = s => JSON.parse(serialize(s)).data;
const shop = s => Object.assign(s.player, NPCS.find(n=>n.id==='ivo'), {gold:500});
const fullBag = p => setBag(p,{copperBand:15,potion:3});
function storage(initial={}) { const map=new Map(Object.entries(initial)); return {map,getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}; }

test('new characters own two distinct starter instances outside the bag',()=>{
 const s=createGame(),p=s.player;assert.deepEqual(p.inventory,{potion:3});assert.equal(occupiedSlots(p),1);
 assert.deepEqual(gearTemplates(p),{...emptyEquipment(),weapon:'trainingSword',armor:'linenCoat'});
 assert.notEqual(p.equipment.weapon,p.equipment.armor);assert.equal(totals(p).trainingSword,1);
 assert.equal(stats(p).attack,11);assert.equal(stats(p).defense,1);assert.deepEqual(data(deserialize(serialize(s))),data(s));
});
test('primary slots transfer exact instances in both directions and preserve other copies',()=>{
 for(const [slot,id] of [['weapon','moonBlade'],['armor','marshCoat'],['charm','trailCharm']]){
  const s=createGame(),p=s.player,previous=p.equipment[slot],[ref]=put(p,id),owned=totals(p),hp=p.hp;
  assert.equal(command(s,{type:'equip',id:ref}),true);assert.equal(p.inventory[ref],undefined);assert.equal(p.equipment[slot],ref);
  if(previous)assert.equal(p.inventory[previous],1);assert.deepEqual(totals(p),owned);assert.equal(p.hp,hp);
  assert.equal(command(s,{type:'unequip',slot}),true);assert.equal(p.inventory[ref],1);assert.deepEqual(totals(p),owned);
 }
});
test('identical swords can swap but never alias the same instance',()=>{
 const s=createGame(),p=s.player,[a,b]=put(p,'moonBlade',2),owned=totals(p);
 assert.equal(command(s,{type:'equip',id:a}),true);const st=stats(p);
 assert.equal(command(s,{type:'equip',id:a}),false);
 assert.equal(command(s,{type:'equip',id:b}),true);assert.equal(p.inventory[a],1);assert.equal(p.equipment.weapon,b);assert.deepEqual(stats(p),st);
 command(s,{type:'unequip',slot:'weapon'});assert.equal(p.inventory[b],1);assert.equal(bagCount(p,'moonBlade'),2);assert.deepEqual(totals(p),owned);
});
test('invalid, template-only, foreign, worn, mismatched and dead-player transfers are atomic',()=>{
 const s=createGame(),[ref]=put(s.player,'moonBlade');
 for(const action of [{type:'equip',id:'__proto__'},{type:'equip',id:'constructor'},{type:'equip',id:'potion'},{type:'equip',id:'moonBlade'},{type:'equip',id:'gear-999'},{type:'equip',id:[ref]},{type:'equip',id:s.player.equipment.weapon},{type:'equip',id:ref,slot:'armor'},{type:'unequip',slot:'__proto__'},{type:'unequip',slot:'charm'}]){
  const before=data(s);assert.equal(command(s,action),false);assert.deepEqual(data(s),before);
 }
 s.player.dead=true;const before=data(s);assert.equal(command(s,{type:'equip',id:ref}),false);assert.equal(transferEquipment(s.player,'weapon',ref).ok,false);assert.deepEqual(data(s),before);
});
test('full bag rejects unequip even when another identical item is in the bag',()=>{
 const s=createGame(),p=s.player;fullBag(p);const before=data(s),st=stats(p);
 assert.equal(command(s,{type:'unequip',slot:'weapon'}),false);assert.deepEqual(data(s),before);assert.deepEqual(stats(p),st);
 assert.match(s.events.at(-1).text,/bag is full/);
});
test('a full-bag swap frees exactly one slot regardless of duplicate templates',()=>{
 const s=createGame(),p=s.player;fullBag(p);const [first,second]=Object.keys(p.inventory).filter(k=>k!=='potion');
 command(s,{type:'equip',id:first,slot:'ring1'});put(p,'copperBand');assert.equal(occupiedSlots(p),BAG_SLOTS);
 const before=totals(p);assert.equal(command(s,{type:'equip',id:second,slot:'ring1'}),true);
 assert.equal(p.inventory[first],1);assert.equal(p.equipment.ring1,second);assert.equal(occupiedSlots(p),BAG_SLOTS);assert.deepEqual(totals(p),before);
});
test('equipment never stacks while consumables respect their stack cap',()=>{
 const s=createGame(),p=s.player;assert.equal(addItem(s,'trainingSword',2),true);assert.equal(bagCount(p,'trainingSword'),2);assert.equal(occupiedSlots(p),3);
 assert.equal(addItem(s,'potion',996),true);assert.equal(addItem(s,'potion'),false);assert.equal(p.inventory.potion,999);
 for(const ref of Object.keys(p.inventory).filter(k=>k!=='potion'))assert.equal(p.inventory[ref],1);
});
test('gear changes do not heal, stack bonuses or change talents and cooldowns',()=>{
 const s=createGame(),p=s.player;p.level=7;p.talents={vigor:3,guard:1,steel:1};put(p,'forestCoat');p.cooldowns.guard=8;p.hp=75;
 const baseline=stats(p),owned=totals(p);
 for(let i=0;i<10;i++){assert.equal(equipTemplate(s,'forestCoat'),true);assert.equal(stats(p).maxHp,baseline.maxHp+12);assert.equal(p.hp,75);assert.equal(equipTemplate(s,'linenCoat'),true);assert.deepEqual(stats(p),baseline);}
 assert.deepEqual(totals(p),owned);assert.equal(p.cooldowns.guard,8);equipTemplate(s,'forestCoat');p.hp=stats(p).maxHp;equipTemplate(s,'linenCoat');assert.equal(p.hp,baseline.maxHp);
});
test('real 0.3.1 migration preserves all progress and total owned quantities',()=>{
 const original=JSON.parse(legacy),expected=structuredClone(original.data);
 expected.player.equipment={...emptyEquipment(),...expected.player.equipment};expected.player.inventory.moonBlade=2;delete expected.player.inventory.marshCoat;delete expected.player.inventory.trailCharm;
 let s=deserialize(legacy);assert.equal(SAVE_VERSION,5);assert.deepEqual(legacyView(data(s)),expected);
 for(const id of Object.keys(ITEMS))assert.equal(totals(s.player)[id],original.data.player.inventory[id]||0);
 const stable=data(s),st=stats(s.player);for(let i=0;i<10;i++){s=deserialize(serialize(s));assert.deepEqual(data(s),stable);assert.deepEqual(stats(s.player),st);}
});
test('v0 through v3 deduct only valid owned equipped copies before minting identities',()=>{
 for(const version of [0,1,2,3]){
  const raw=JSON.parse(legacy);raw.version=version;raw.data.player.inventory={trainingSword:3,moonBlade:1,potion:5};raw.data.player.equipment={weapon:'trainingSword',armor:'moonBlade',charm:'trailCharm',unknown:'moonBlade'};
  let s=deserialize(JSON.stringify(raw));assert.deepEqual(bagTemplates(s.player),{potion:5,trainingSword:2,moonBlade:1});assert.deepEqual(gearTemplates(s.player),{...emptyEquipment(),weapon:'trainingSword'});
  const before=data(s);assert.deepEqual(data(deserialize(serialize(s))),before);
  for(const malformed of [{weapon:['moonBlade'],armor:{id:'marshCoat'},charm:12},{weapon:'__proto__',armor:'constructor',charm:'potion'}]){
   raw.data.player.equipment=malformed;s=deserialize(JSON.stringify(raw));assert.deepEqual(bagTemplates(s.player),raw.data.player.inventory);assert.deepEqual(s.player.equipment,emptyEquipment());
  }
 }
});
test('v4 migration retains independently owned equipment without subtracting spare copies',()=>{
 const raw=JSON.parse(legacy);raw.version=4;raw.data.player.inventory={moonBlade:2,potion:5};const s=deserialize(JSON.stringify(raw));
 assert.deepEqual(bagTemplates(s.player),raw.data.player.inventory);assert.deepEqual(gearTemplates(s.player),{...emptyEquipment(),...raw.data.player.equipment});assert.equal(totals(s.player).moonBlade,3);assert.equal(bagCount(s.player,'trainingSword'),0);
});
test('legacy over-capacity bags retain every copy and empty slots can reduce overflow',()=>{
 const raw=JSON.parse(legacy);raw.version=4;raw.data.player.inventory={copperBand:30,potion:999};raw.data.player.equipment={};
 const s=deserialize(JSON.stringify(raw));assert.equal(occupiedSlots(s.player),31);assert.equal(bagCount(s.player,'copperBand'),30);
 assert.equal(equipTemplate(s,'copperBand','ring1'),true);assert.equal(occupiedSlots(s.player),30);assert.equal(addItem(s,'moonBlade'),false);
 assert.deepEqual(data(deserialize(serialize(s))),data(s));
});
test('legacy backup survives repeated saves; backup failure blocks automatic replacement',()=>{
 const mem=storage({[SAVE_KEY]:legacy}),store=new SaveStore(mem);let s=store.load();assert.equal(mem.getItem(SAVE_KEY+'.v3'),legacy);assert.match(store.notice,/equipped items/);
 for(let i=0;i<4;i++){assert.equal(store.save(s),true);s=new SaveStore(mem).load();}assert.equal(mem.getItem(SAVE_KEY+'.v3'),legacy);assert.equal(bagCount(s.player,'moonBlade'),2);
 const blocked=new SaveStore({getItem:k=>k===SAVE_KEY?legacy:null,setItem(){throw Error('quota');}});const temporary=blocked.load();assert.ok(temporary);assert.equal(blocked.blocked,true);assert.equal(blocked.save(temporary),false);
});
test('corrupt-save recovery preserves the original and backs up the recovered legacy file',()=>{
 const mem=storage({[SAVE_KEY]:'broken',[SAVE_KEY+'.backup']:legacy}),store=new SaveStore(mem),s=store.load();
 assert.equal(mem.getItem(SAVE_KEY+'.recovery'),'broken');assert.equal(mem.getItem(SAVE_KEY+'.v3'),legacy);assert.equal(store.save(s),true);assert.equal(store.save(s),true);assert.equal(mem.getItem(SAVE_KEY+'.v3'),legacy);
});
test('legacy import preserves both originals; failed replacement leaves current journey intact',()=>{
 const current=serialize(createGame('Current')),mem=storage({[SAVE_KEY]:current}),store=new SaveStore(mem);
 assert.equal(store.replace(deserialize(legacy),legacy),true);assert.equal(mem.getItem(SAVE_KEY+'.import.v3'),legacy);assert.equal(mem.getItem(SAVE_KEY+'.recovery'),current);assert.equal(JSON.parse(mem.getItem(SAVE_KEY)).version,5);assert.equal(bagCount(store.load().player,'moonBlade'),2);
 const failing=storage({[SAVE_KEY]:current});failing.setItem=()=>{throw Error('quota');};assert.equal(new SaveStore(failing).replace(deserialize(legacy),legacy),false);assert.equal(failing.getItem(SAVE_KEY),current);
});
test('selling an exact spare protects worn gear and restores that spare through buyback',()=>{
 const s=deserialize(legacy),p=s.player;shop(s);const ref=bagId(p,'moonBlade'),worn=p.equipment.weapon,owned=totals(p),money=p.gold;
 assert.equal(command(s,{type:'sell',id:worn,confirm:true}),false);assert.equal(command(s,{type:'sell',id:ref}),false);assert.equal(command(s,{type:'sell',id:ref,confirm:true}),true);
 assert.equal(p.inventory[ref],undefined);assert.equal(p.equipment.weapon,worn);assert.equal(s.buyback[0].item,ref);assert.equal(p.gold,money+24);
 const sale=s.buyback[0].id;assert.equal(command(s,{type:'buyback',id:sale}),true);assert.equal(p.inventory[ref],1);assert.equal(command(s,{type:'buyback',id:sale}),false);assert.equal(p.gold,money);assert.deepEqual(totals(p),owned);
});
test('repeated buy/equip/sell/buyback/reload cycles conserve identities and currency',()=>{
 let s=createGame();shop(s);command(s,{type:'buy',id:'keeperBlade'});const ref=bagId(s.player,'keeperBlade'),starter=s.player.equipment.weapon,gold=s.player.gold,records=structuredClone(s.player.itemInstances);
 for(let i=0;i<20;i++){
  for(const id of [ref,starter])assert.equal(command(s,{type:'equip',id}),true);
  assert.equal(command(s,{type:'sell',id:ref}),true);assert.equal(command(s,{type:'buyback',id:s.buyback[0].id}),true);
  s=deserialize(serialize(s));assert.deepEqual(s.player.itemInstances,records);assert.equal(s.player.inventory[ref],1);assert.equal(s.player.gold,gold);
 }
});
test('template-only equip and sale cannot arbitrarily choose among identical owned items',()=>{
 const s=createGame();shop(s);put(s.player,'copperBand',3);const before=data(s);
 assert.equal(command(s,{type:'equip',id:'copperBand',slot:'ring1'}),false);assert.equal(command(s,{type:'sell',id:'copperBand'}),false);assert.deepEqual(data(s),before);
});

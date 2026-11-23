import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame, command, addItem, step, stats } from '../js/simulation.js';
import { ITEMS, QUESTS, NPCS } from '../js/data.js';
import { occupiedSlots, bundleCapacityReason } from '../js/inventory.js';
import { instanceNumber, templateId, resolveItem } from '../js/item-instances.js';
import { serialize, deserialize, SaveStore, SAVE_KEY, MAX_SAVE_BYTES } from '../js/save.js';
import { bagIds, bagId, bagCount, setBag, put, itemRef, legacyView } from './item-helpers.mjs';
import { characterPanel, characterItemDetail } from '../js/character-panel.js';
import { tradePanel, compareEquipment } from '../js/ui-panels.js';
const fixture=await readFile(new URL('./fixtures/v0.4.2-identity.json',import.meta.url),'utf8');
const data=s=>JSON.parse(serialize(s)).data;
const near=(s,id)=>Object.assign(s.player,NPCS.find(n=>n.id===id));
function integrity(s){
 const p=s.player,refs=[...Object.keys(p.inventory).filter(id=>instanceNumber(id)),...Object.values(p.equipment).filter(Boolean),...s.buyback.map(e=>e.item).filter(id=>instanceNumber(id)),...s.drops.map(e=>e.item).filter(id=>instanceNumber(id))];
 assert.equal(new Set(refs).size,refs.length);assert.deepEqual([...refs].sort(),Object.keys(p.itemInstances).sort());
 for(const id of refs){assert.equal(p.itemInstances[id].id,id);assert.ok(ITEMS[p.itemInstances[id].templateId].slot);assert.deepEqual(p.itemInstances[id].modifiers,{});assert.ok(instanceNumber(id)<p.itemSequence);}
 for(const id of Object.keys(p.inventory).filter(id=>instanceNumber(id)))assert.equal(p.inventory[id],1);
}
function memory(initial={}){const m=new Map(Object.entries(initial));return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};}

test('each identical acquisition creates one persistent record and a separate bag slot',()=>{
 let s=createGame();assert.equal(addItem(s,'moonBlade',3),true);const ids=bagIds(s.player,'moonBlade');assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);assert.equal(occupiedSlots(s.player),4);
 for(const id of ids){assert.deepEqual(resolveItem(s.player,id),ITEMS.moonBlade);assert.equal(s.player.inventory[id],1);}
 const initial=data(s);for(let i=0;i<20;i++){s=deserialize(serialize(s));assert.deepEqual(data(s),initial);integrity(s);}
});
test('real v4 fixture preserves every bag copy, all ten slots, buyback and outstanding drops',()=>{
 const before=JSON.parse(fixture).data;before.buyback[1].price=ITEMS.potion.value;
 let s=deserialize(fixture);assert.deepEqual(legacyView(data(s)),before);assert.notEqual(s.player.equipment.ring1,s.player.equipment.ring2);assert.equal(bagCount(s.player,'copperBand'),3);
 const initial=data(s),st=stats(s.player);for(let i=0;i<20;i++){s=deserialize(serialize(s));assert.deepEqual(data(s),initial);assert.deepEqual(stats(s.player),st);integrity(s);}
 // Re-importing the old file replaces the journey, so its deterministic migration
 // does not merge another set of records into the existing one.
 assert.deepEqual(data(deserialize(fixture)),initial);
});
test('v4 migration preserves legitimate maximum stacks beyond the old file limit',()=>{
 const raw=JSON.parse(fixture);raw.data.player.inventory=Object.fromEntries(Object.keys(ITEMS).map(id=>[id,999]));
 const s=deserialize(JSON.stringify(raw));for(const id of Object.keys(ITEMS))assert.equal(bagCount(s.player,id),999,id);
 const text=serialize(s);assert.ok(text.length>262144);assert.ok(text.length<MAX_SAVE_BYTES);assert.deepEqual(data(deserialize(text)),data(s));integrity(s);
});
test('schema-4 import and startup retain original backups before saving schema 5',()=>{
 const mem=memory({[SAVE_KEY]:fixture}),store=new SaveStore(mem),s=store.load();assert.equal(mem.getItem(SAVE_KEY+'.v4'),fixture);assert.match(store.notice,/individual identities/);
 assert.equal(store.save(s),true);assert.equal(JSON.parse(mem.getItem(SAVE_KEY)).version,5);assert.equal(store.replace(deserialize(fixture),fixture),true);assert.equal(mem.getItem(SAVE_KEY+'.import.v4'),fixture);integrity(store.load());
});
test('invalid current identity graphs fail as a whole rather than creating or discarding items',()=>{
 const original=data(deserialize(fixture));
 const mutations=[
  d=>d.player.equipment.ring2=d.player.equipment.ring1,
  d=>d.player.inventory[d.player.equipment.weapon]=1,
  d=>d.player.inventory[Object.keys(d.player.itemInstances)[0]]=2,
  d=>d.player.equipment.weapon='gear-999999',
  d=>d.player.equipment.head=d.player.equipment.weapon,
  d=>delete d.player.itemInstances[d.player.equipment.weapon],
  d=>d.player.itemInstances[d.player.equipment.weapon].id=d.player.equipment.armor,
  d=>d.player.itemInstances[d.player.equipment.weapon].templateId='potion',
  d=>d.player.itemInstances[d.player.equipment.weapon].templateId='__proto__',
  d=>d.player.itemInstances[d.player.equipment.weapon].modifiers={attack:999},
  d=>d.player.itemInstances[d.player.equipment.weapon].modifiers=[],
  d=>d.player.itemInstances[d.player.equipment.weapon].attack=999,
  d=>d.player.itemSequence=1,
  d=>d.player.itemSequence=Number.MAX_SAFE_INTEGER,
  d=>d.player.inventory.moonBlade=1,
  d=>d.player.inventory['gear-01']=1,
  d=>d.player.equipment.weapon='moonBlade',
  d=>d.buyback[0].item=d.player.equipment.weapon,
  d=>d.drops[0].item=d.buyback[0].item,
  d=>d.drops[0].item='copperBand',
  d=>d.buyback[0].item='emberBand',
  d=>d.player.itemInstances['gear-99999']={id:'gear-99999',templateId:'moonBlade',modifiers:{}},
  d=>delete d.player.inventory[bagId(d.player,'moonBlade')],
  d=>d.player.equipment.unknown=null,
  d=>d.drops[0].x=-100,
  d=>d.buyback.push({...d.buyback[0]})
 ];
 for(const mutate of mutations){const d=structuredClone(original);mutate(d);assert.throws(()=>deserialize(JSON.stringify({version:5,data:d})),/identities/);}
 assert.deepEqual(data(deserialize(serialize(deserialize(fixture)))),original);
});
test('corrupt instance graphs preserve original data and recover only from a valid backup',()=>{
 const s=deserialize(fixture),raw=JSON.parse(serialize(s));raw.data.player.equipment.ring2=raw.data.player.equipment.ring1;const corrupt=JSON.stringify(raw),backup=serialize(s);
 let mem=memory({[SAVE_KEY]:corrupt,[SAVE_KEY+'.backup']:backup}),store=new SaveStore(mem),loaded=store.load();assert.deepEqual(data(loaded),data(s));assert.equal(mem.getItem(SAVE_KEY+'.recovery'),corrupt);
 mem=memory({[SAVE_KEY]:corrupt});store=new SaveStore(mem);assert.equal(store.load(),null);assert.equal(store.blocked,true);assert.equal(store.save(createGame()),false);assert.equal(mem.getItem(SAVE_KEY),corrupt);
});
test('full-bag equipment purchases leave sequence, records, gold and buyback untouched',()=>{
 const s=createGame();near(s,'ivo');s.player.gold=500;setBag(s.player,{moonBlade:15,potion:3});const before=data(s);
 assert.equal(command(s,{type:'buy',id:'keeperBlade'}),false);assert.equal(addItem(s,'copperBand',2),false);assert.deepEqual(data(s),before);
 assert.equal(command(s,{type:'buy',id:'potion'}),true);assert.equal(s.player.inventory.potion,4);integrity(s);
});
test('bundle preflight counts each equipment copy and never allocates on failure',()=>{
 const s=createGame();setBag(s.player,{moonBlade:14,potion:3});const before=data(s);
 assert.match(bundleCapacityReason(s.player,{copperBand:2,potion:1}),/full/);assert.deepEqual(data(s),before);
 assert.equal(bundleCapacityReason(s.player,{copperBand:1,potion:1}),'');assert.deepEqual(data(s),before);
 for(const quantity of [0,-1,1.5,NaN,Infinity]){assert.equal(addItem(s,'moonBlade',quantity),false);assert.deepEqual(data(s),before);}
});
test('equipment purchase, sale and buyback preserve the selected copy through reload',()=>{
 let s=createGame();near(s,'ivo');s.player.gold=500;for(let i=0;i<3;i++)assert.equal(command(s,{type:'buy',id:'copperBand'}),true);
 const [a,b,c]=bagIds(s.player,'copperBand');command(s,{type:'equip',id:a,slot:'ring1'});command(s,{type:'equip',id:b,slot:'ring2'});
 const record=structuredClone(s.player.itemInstances[c]),money=s.player.gold;assert.equal(command(s,{type:'sell',id:c}),true);const sale=s.buyback[0].id;
 s=deserialize(serialize(s));assert.equal(s.buyback[0].item,c);assert.equal(command(s,{type:'buyback',id:sale}),true);assert.deepEqual(s.player.itemInstances[c],record);assert.equal(s.player.gold,money);assert.equal(s.player.equipment.ring1,a);assert.equal(s.player.equipment.ring2,b);integrity(s);
 const before=data(s);assert.equal(command(s,{type:'buyback',id:sale}),false);assert.deepEqual(data(s),before);
});
test('buyback eviction retires only the oldest sold copy and never reuses its identity',()=>{
 const s=createGame();near(s,'ivo');put(s.player,'copperBand',9);const ids=bagIds(s.player,'copperBand');for(const id of ids)assert.equal(command(s,{type:'sell',id}),true);
 assert.equal(s.buyback.length,8);assert.equal(s.player.itemInstances[ids[0]],undefined);for(const id of ids.slice(1))assert.ok(s.player.itemInstances[id]);
 addItem(s,'copperBand');const newer=bagId(s.player,'copperBand');assert.ok(instanceNumber(newer)>Math.max(...ids.map(instanceNumber)));integrity(s);assert.doesNotThrow(()=>deserialize(serialize(s)));
});
test('blocked buyback keeps the original instance and charges nothing',()=>{
 const s=createGame();near(s,'ivo');s.player.gold=500;const [ref]=put(s.player,'moonBlade');command(s,{type:'sell',id:ref,confirm:true});setBag(s.player,{copperBand:16});const before=data(s);
 assert.equal(command(s,{type:'buyback',id:s.buyback[0].id}),false);assert.deepEqual(data(s),before);integrity(s);
});
test('ground loot keeps its identity through save, blocked pickup and eventual collection',()=>{
 let s=createGame();s.enemies=[];setBag(s.player,{copperBand:16});const ref=itemRef(s.player,'moonBlade');s.drops=[{id:1,x:s.player.x,y:s.player.y,item:ref,life:1}];
 for(let i=0;i<150;i++)step(s);assert.equal(s.drops[0].item,ref);assert.equal(s.player.inventory[ref],undefined);s=deserialize(serialize(s));
 command(s,{type:'equip',id:bagId(s.player,'copperBand'),slot:'ring1'});step(s);assert.equal(s.drops.length,0);assert.equal(s.player.inventory[ref],1);integrity(s);
});
test('expired and capped-out equipment drops retire their records without reusing IDs',()=>{
 const s=createGame();s.enemies=[];const ref=itemRef(s.player,'moonBlade');s.drops=[{id:1,x:1000,y:944,item:ref,life:.001}];step(s);assert.equal(s.drops.length,0);assert.equal(s.player.itemInstances[ref],undefined);integrity(s);
 const e=createGame().enemies.find(e=>e.type==='warden');s.enemies=[e];s.player.level=20;const retired=[];
 for(let i=0;i<70;i++){Object.assign(e,{hp:1,mode:'idle',x:1504,y:648});Object.assign(s.player,{x:1464,y:648});s.player.cooldowns.attack=0;command(s,{type:'attack'});retired.push(s.drops.at(-1).item);}
 assert.equal(s.drops.length,64);for(const id of retired.slice(0,6))assert.equal(s.player.itemInstances[id],undefined);integrity(s);
});
test('UI renders separate selectable copies without exposing technical IDs as visible text',()=>{
 const s=createGame(),p=s.player,[a,b]=put(p,'moonBlade',2),before=data(s),html=characterPanel(s,{side:'bag',id:b});
 assert.ok(html.includes(`data-item="${a}"`));assert.ok(html.includes(`data-item="${b}"`));assert.ok(characterItemDetail(p,{side:'bag',id:b}).includes(`data-id="${b}"`));
 assert.doesNotMatch(html.replace(/<[^>]*>/g,''),/gear-\d+/);assert.equal((html.match(/data-equipment=/g)||[]).length,10);
 compareEquipment(p,'moonBlade');tradePanel(s,{side:'stock',id:'copperBand'});assert.deepEqual(data(s),before);
});
test('quest reward creation is one-time and uses the same equipment factory',()=>{
 const s=createGame();near(s,'elin');s.quests.roots={status:'active',progress:QUESTS.roots.objectives.map(o=>o.count)};
 assert.equal(command(s,{type:'complete',id:'roots'}),true);const ref=bagId(s.player,'keeperBlade');assert.ok(instanceNumber(ref));const before=data(s);assert.equal(command(s,{type:'complete',id:'roots'}),false);assert.deepEqual(data(s),before);integrity(s);
});

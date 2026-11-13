import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, step, stats, questReady, giveXP, TICK } from '../js/simulation.js';
import { ITEMS, ENEMIES, NPCS, QUESTS, SPAWN } from '../js/data.js';
import { blocked, moveBody, WIDTH, HEIGHT, LANDMARKS, ENEMY_SPAWNS, riverLeft } from '../js/world.js';
import { serialize, deserialize, SaveStore, SAVE_KEY } from '../js/save.js';

const run=(s,seconds,input={})=>{for(let i=0;i<Math.round(seconds/TICK);i++)step(s,input);};
function atNPC(s,id) {const n=NPCS.find(n=>n.id===id);s.player.x=n.x;s.player.y=n.y+30;}
function memory(initial={}) {const data=new Map(Object.entries(initial));return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),data};}
function killEnemy(s,e) {
  s.player.x=e.x-40;s.player.y=e.y;
  while(e.hp>0){s.player.cooldowns.attack=0;command(s,{type:'attack'});}
}
test('movement is normalized and blocked at buildings, rivers and world edges',()=>{
  const a=createGame(),b=createGame();
  run(a,.1,{x:1,y:0});run(b,.1,{x:1,y:1});
  assert.ok(Math.abs(Math.hypot(a.player.x-SPAWN.x,a.player.y-SPAWN.y)-Math.hypot(b.player.x-SPAWN.x,b.player.y-SPAWN.y))<.01);
  const body={x:riverLeft(800)-20,y:800};moveBody(body,200,0);assert.ok(body.x<riverLeft(body.y));
  const wall={x:200,y:688};moveBody(wall,150,0);assert.ok(wall.x<224);
  moveBody(body,-10000,0);assert.ok(body.x>=43);
});
test('every NPC, herb, chest, boss and regular spawn is reachable from the village',()=>{
  const size=16,cols=WIDTH/size,rows=HEIGHT/size,visited=new Set(),queue=[[28,55]];
  visited.add('28,55');
  for(let head=0;head<queue.length;head++){
    const [x,y]=queue[head];
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy,key=nx+','+ny;
      if(nx<0||ny<0||nx>=cols||ny>=rows||visited.has(key)||blocked(nx*size,ny*size))continue;
      visited.add(key);queue.push([nx,ny]);
    }
  }
  for(const p of [...NPCS,...LANDMARKS,...ENEMY_SPAWNS.map(([,x,y])=>({x,y}))]){
    assert.ok(queue.some(([x,y])=>Math.hypot(x*size-p.x,y*size-p.y)<55),'Unreachable: '+(p.id||p.x+','+p.y));
  }
  for(const [type,x,y] of ENEMY_SPAWNS)assert.equal(blocked(x,y,ENEMIES[type].radius),false,'Blocked spawn '+type);
});
test('attack has a cooldown; a kill awards XP/gold once and drops collectible loot',()=>{
  const s=createGame(),e=s.enemies[0];s.player.x=e.x-40;s.player.y=e.y;
  command(s,{type:'attack'});const hp=e.hp;assert.equal(command(s,{type:'attack'}),false);assert.equal(e.hp,hp);
  killEnemy(s,e);assert.equal(s.player.xp,16);assert.equal(s.player.gold,3);assert.equal(s.drops.length,1);
  s.player.x=e.x;s.player.y=e.y;step(s);assert.equal(s.drops.length,0);
  assert.equal((s.player.inventory.amber||0)+(s.player.inventory.potion-3),1);
  command(s,{type:'attack'});assert.equal(s.player.gold,3);
});
test('level-up increases stats and heals; equipment must be owned and have the correct slot',()=>{
  const s=createGame();s.player.hp=1;giveXP(s,60);assert.equal(s.player.level,2);assert.equal(s.player.hp,stats(s.player).maxHp);
  assert.equal(command(s,{type:'equip',id:'moonBlade'}),false);
  s.player.inventory.moonBlade=1;assert.equal(command(s,{type:'equip',id:'moonBlade'}),true);assert.equal(stats(s.player).attack,21);
  assert.equal(command(s,{type:'equip',id:'potion'}),false);
});
test('enemy telegraphs before damage and cannot hurt a player inside the safe zone',()=>{
  const s=createGame(),e=s.enemies[0];s.enemies=[e];s.player.x=e.x-28;s.player.y=e.y;
  run(s,.1);assert.equal(s.player.hp,100);run(s,1);assert.ok(s.player.hp<100);
  s.player.x=690;s.player.y=800;s.player.hp=100;e.x=710;e.y=800;e.mode='chase';e.cooldown=0;
  run(s,4);assert.equal(s.player.hp,100);
});
test('dodge avoids an imminent attack, has a cooldown and cannot cross river colliders',()=>{
  const s=createGame(),e=s.enemies[0];s.enemies=[e];s.player.x=e.x-28;s.player.y=e.y;s.player.facing={x:-1,y:0};
  e.mode='windup';e.windup=.1;command(s,{type:'dodge'});assert.equal(command(s,{type:'dodge'}),false);run(s,.2);assert.equal(s.player.hp,100);
  s.player.x=riverLeft(800)-20;s.player.y=800;s.player.facing={x:1,y:0};s.player.cooldowns.dodge=0;command(s,{type:'dodge'});run(s,.2);assert.ok(s.player.x<riverLeft(800));
});
test('potions consume one item, respect cooldown and are not wasted at full health',()=>{
  const s=createGame();assert.equal(command(s,{type:'potion'}),false);s.player.hp=20;assert.equal(command(s,{type:'potion'}),true);
  assert.equal(s.player.hp,75);assert.equal(s.player.inventory.potion,2);assert.equal(command(s,{type:'potion'}),false);
});
test('death stops movement and respawn keeps XP, gold, items and quests',()=>{
  const s=createGame(),e=s.enemies[0];s.enemies=[e];s.player.x=e.x-20;s.player.y=e.y;s.player.hp=1;s.player.xp=15;s.discovered.push('trail');
  e.mode='windup';e.windup=.01;step(s);assert.equal(s.player.dead,true);const x=s.player.x;run(s,1,{x:1});assert.equal(s.player.x,x);
  assert.equal(command(s,{type:'respawn'}),true);assert.equal(s.player.dead,false);assert.equal(s.player.x,SPAWN.x);assert.equal(s.player.xp,15);assert.equal(s.player.hp,stats(s.player).maxHp);
});
test('full first quest: accept, kill five, return, receive equipment; rewards cannot duplicate',()=>{
  const s=createGame();assert.equal(command(s,{type:'accept',id:'roots'}),false);
  atNPC(s,'elin');assert.equal(command(s,{type:'accept',id:'roots'}),true);
  for(const e of s.enemies.filter(e=>e.type==='sprout').slice(0,5))killEnemy(s,e);
  assert.equal(questReady(s,'roots'),true);assert.equal(command(s,{type:'complete',id:'roots'}),false);
  atNPC(s,'elin');assert.equal(command(s,{type:'complete',id:'roots'}),true);const gold=s.player.gold;
  assert.equal(s.player.inventory.keeperBlade,1);assert.equal(command(s,{type:'complete',id:'roots'}),false);assert.equal(s.player.gold,gold);
  assert.equal(command(s,{type:'accept',id:'beacon'}),true);
});
test('herbs collected before accepting count; gathering and chest rewards are one-time',()=>{
  const s=createGame();for(const herb of LANDMARKS.filter(l=>l.kind==='herb')){s.player.x=herb.x;s.player.y=herb.y;command(s,{type:'interact'});command(s,{type:'interact'});}
  assert.equal(s.harvested.length,3);atNPC(s,'mira');command(s,{type:'accept',id:'herbs'});assert.equal(questReady(s,'herbs'),true);command(s,{type:'complete',id:'herbs'});assert.equal(s.player.inventory.forestCoat,1);
  const chest=LANDMARKS.find(l=>l.id==='chest2');s.player.x=chest.x;s.player.y=chest.y;command(s,{type:'interact'});command(s,{type:'interact'});
  assert.equal(s.chests.length,1);assert.equal(s.player.inventory.moonBlade,1);
});
test('boss and beacon progression work even when explored before taking the quest',()=>{
  const s=createGame(),beacon=LANDMARKS.find(l=>l.id==='beacon');s.player.x=beacon.x;s.player.y=beacon.y+40;
  command(s,{type:'interact'});assert.equal(s.flags.beaconLit,false);
  killEnemy(s,s.enemies.find(e=>e.type==='warden'));
  s.player.x=beacon.x;s.player.y=beacon.y+40;command(s,{type:'interact'});assert.equal(s.flags.beaconLit,true);
  s.quests.roots={status:'done',progress:[5]};atNPC(s,'elin');command(s,{type:'accept',id:'beacon'});assert.equal(questReady(s,'beacon'),true);
  command(s,{type:'complete',id:'beacon'});assert.equal(s.player.inventory.beaconCharm,1);
});
test('shop requires proximity and an explicit item; selling transfers one copy',()=>{
  const s=createGame();s.player.gold=24;assert.equal(command(s,{type:'buy',id:'potion'}),false);atNPC(s,'ivo');
  assert.equal(command(s,{type:'buy',id:'potion'}),true);assert.equal(s.player.gold,12);assert.equal(s.player.inventory.potion,4);
  s.player.inventory.amber=3;command(s,{type:'sell',id:'amber'});assert.equal(s.player.gold,16);assert.equal(s.player.inventory.amber,2);
  assert.equal(command(s,{type:'sell'}),false);
});
test('save round-trip restores progress, gear, discoveries, name, death and boss state',()=>{
  const s=createGame('Åsa <test>');giveXP(s,200);s.player.inventory.forestCoat=1;command(s,{type:'equip',id:'forestCoat'});s.quests.roots={status:'active',progress:[3]};s.chests=['chest2'];s.harvested=['herb1'];s.flags.wardenDefeated=true;
  s.player.hp=0;s.player.dead=true;
  const copy=deserialize(serialize(s));
  for(const key of ['name','level','xp','equipment','inventory','dead','hp'])assert.deepEqual(copy.player[key],s.player[key]);
  assert.deepEqual(copy.quests,s.quests);assert.deepEqual(copy.chests,s.chests);assert.equal(copy.enemies.find(e=>e.type==='warden').hp,0);
});
test('older v0 saves migrate and invalid values are bounded without trusting unknown IDs',()=>{
  const raw=JSON.parse(serialize(createGame()));raw.version=0;raw.data.player.level=999;raw.data.player.gold=-100;raw.data.player.x=-999;raw.data.player.inventory={potion:Infinity,invalid:9,moonBlade:4};raw.data.player.equipment={weapon:'__proto__',armor:'moonBlade'};
  raw.data.harvested=['herb1','herb1','fake'];const s=deserialize(JSON.stringify(raw));
  assert.equal(s.player.level,20);assert.equal(s.player.gold,0);assert.equal(s.player.x,SPAWN.x);assert.equal(s.player.equipment.weapon,'trainingSword');assert.equal(s.player.equipment.armor,'linenCoat');assert.deepEqual(s.harvested,['herb1']);
});
test('corruption recovers the validated backup and preserves the damaged original',()=>{
  const backup=serialize(createGame('Backup')),storage=memory({[SAVE_KEY]:'broken',[SAVE_KEY+'.backup']:backup}),store=new SaveStore(storage);
  assert.equal(store.load().player.name,'Backup');assert.equal(storage.getItem(SAVE_KEY+'.recovery'),'broken');assert.equal(store.save(createGame()),true);
});
test('future saves and unrecoverable corruption remain protected from autosave',()=>{
  for(const raw of [JSON.stringify({version:99,data:{}}),'broken']) {
    const storage=memory({[SAVE_KEY]:raw}),store=new SaveStore(storage);assert.equal(store.load(),null);assert.equal(store.blocked,true);
    assert.equal(store.save(createGame()),false);assert.equal(storage.getItem(SAVE_KEY),raw);
  }
});
test('storage denial does not crash and failed replacement keeps protection',()=>{
  const storage={getItem(){throw Error('Denied');},setItem(){throw Error('Denied');}},store=new SaveStore(storage);
  assert.equal(store.load(),null);assert.equal(store.save(createGame()),false);store.blocked=true;assert.equal(store.replace(createGame()),false);assert.equal(store.blocked,true);
});
test('malformed save shape and large imports are rejected',()=>{
  assert.throws(()=>deserialize('not-json'));assert.throws(()=>deserialize(JSON.stringify({version:1,data:{player:{}}})));assert.throws(()=>deserialize(' '.repeat(262145)));
});
test('long runs bound transient events/effects/drops and keep all coordinates finite',()=>{
  const s=createGame();for(let i=0;i<18000;i++){step(s,{attack:i%25===0});}
  assert.ok(s.events.length<=100);assert.ok(s.effects.length<=70);assert.ok(s.drops.length<=11);assert.ok(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, step, stats, questReady, giveXP, TICK } from '../js/simulation.js';
import { ENEMIES, NPCS, CHECKPOINTS } from '../js/data.js';
import { LANDMARKS, lineClear, blocked, WORLD, terrain, WIDTH, HEIGHT } from '../js/world.js';
import { serialize, deserialize, SaveStore, SAVE_KEY, SAVE_VERSION } from '../js/save.js';

const run=(s,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/TICK);i++)step(s,input);};
function alone(type) {
  const s=createGame(),e=s.enemies.find(e=>e.type===type);s.enemies=[e];
  // Open road below the bridge, outside all safe areas.
  Object.assign(e,{x:1504,y:648,homeX:1504,homeY:648,cooldown:0,mode:'chase'});
  Object.assign(s.player,{x:1404,y:648,combat:10});
  s.discovered=['village','trail','forest','ruins','camp','marsh'];
  return {s,e};
}
function npc(s,id){Object.assign(s.player,NPCS.find(n=>n.id===id));}
function landmark(s,id){const l=LANDMARKS.find(l=>l.id===id);s.player.x=l.x;s.player.y=l.y;command(s,{type:'interact'});}
function defeat(s,e) {
  s.player.x=e.x-32;s.player.y=e.y;s.targetId=e.id;
  for(let n=0;e.hp>0&&n<200;n++){s.player.cooldowns.attack=0;command(s,{type:'attack'});}
  assert.equal(e.hp,0);
}
const memory=initial=>{const m=new Map(Object.entries(initial));return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};

test('third connected melee hit is stronger, expires naturally, and uses equipment attack speed',()=>{
  const {s,e}=alone('warden');s.player.x=e.x-40;
  const damage=[];
  for(let i=0;i<3;i++){const hp=e.hp;command(s,{type:'attack'});damage.push(hp-e.hp);s.player.cooldowns.attack=0;}
  assert.deepEqual(damage,[11,11,15]);assert.equal(s.player.combo,3);
  run(s,1.2,{x:-1});assert.equal(s.player.combo,0);
  s.player.inventory.swiftBlade=1;command(s,{type:'equip',id:'swiftBlade'});
  assert.ok(stats(s.player).attackCooldown<.36);
  command(s,{type:'attack'});assert.ok(s.player.cooldowns.attack<.36);
});
test('target selection prioritizes a chosen enemy, cycles, and clears dead targets',()=>{
  const {s,e}=alone('sprout');s.player.x=e.x-40;
  const other={...e,id:'enemy99',x:e.x-8,hp:100};s.enemies.push(other);
  command(s,{type:'target',id:e.id});command(s,{type:'attack'});
  assert.equal(other.hp,100);assert.ok(e.hp<ENEMIES.sprout.hp);
  command(s,{type:'target'});assert.equal(s.targetId,other.id);
  s.targetId=e.id;defeat(s,e);assert.equal(s.targetId,null);
});
test('wolf pounce commits to a direction; sidestepping avoids it and standing still is hit',()=>{
  const {s,e}=alone('wolf');step(s);assert.equal(e.mode,'windup');
  const aim={...e.aim};run(s,.4,{y:1});assert.deepEqual(e.aim,aim);
  run(s,.8);assert.equal(s.player.hp,100);
  const straight=alone('wolf');run(straight.s,1.3);assert.ok(straight.s.player.hp<100);
});
test('ranged shots have readable windup, travel, collide, and can be dodged',()=>{
  const {s,e}=alone('wisp');s.player.x=e.x-155;
  run(s,.3);assert.equal(s.projectiles.length,0);assert.equal(s.player.hp,100);
  run(s,.5);assert.ok(s.projectiles.length>0);assert.equal(s.player.hp,100);
  run(s,1);assert.ok(s.player.hp<100);
  const dodge=alone('wisp');dodge.s.player.x=dodge.e.x-155;run(dodge.s,.75);run(dodge.s,.8,{y:1});
  assert.equal(dodge.s.player.hp,100);
  const wall=alone('wisp');wall.s.enemies=[];wall.s.projectiles=[{x:221,y:675,vx:190,vy:0,damage:17,life:1}];
  run(wall.s,.2);assert.equal(wall.s.projectiles.length,0);
});
test('Lyktslag interrupts a normal windup but cannot cancel a boss telegraph',()=>{
  for(const type of ['wolf','wisp','ancient']) {
    const {s,e}=alone(type);s.player.x=e.x-60;step(s);assert.equal(e.mode,'windup');
    command(s,{type:'burst'});assert.equal(e.mode,type==='ancient'?'windup':'chase');
    if(type!=='ancient')assert.ok(e.cooldown>=.8);
  }
});
test('Myrhjärtat eruptions stay where announced and a defeated boss cancels its attacks',()=>{
  const {s,e}=alone('ancient');s.player.x=e.x-120;step(s);
  assert.equal(s.hazards.length,1);const origin={x:s.hazards[0].x,y:s.hazards[0].y};
  run(s,.7,{y:1});assert.equal(s.hazards[0].x,origin.x);assert.equal(s.hazards[0].y,origin.y);
  run(s,.4);assert.equal(s.player.hp,100);
  e.hp=200;e.cooldown=0;e.mode='chase';step(s);assert.equal(s.hazards.length,2);
  defeat(s,e);assert.equal(s.hazards.length,0);assert.equal(s.flags.ancientDefeated,true);assert.equal(s.flags.wardenDefeated,false);
});
test('safe camp heals, sets a checkpoint, blocks enemy damage, and survives death and saving',()=>{
  const {s,e}=alone('ancient');s.player.hp=10;landmark(s,'campfire');assert.equal(s.player.checkpoint,'camp');assert.equal(s.player.hp,100);
  s.hazards.push({x:s.player.x,y:s.player.y,radius:62,damage:1000,delay:.01,maxDelay:1});step(s);assert.equal(s.player.hp,100);
  s.player.dead=true;s.player.hp=0;const copy=deserialize(serialize(s));command(copy,{type:'respawn'});
  assert.equal(copy.player.x,CHECKPOINTS.camp.x);assert.equal(copy.player.y,CHECKPOINTS.camp.y);assert.equal(copy.player.dead,false);
});
test('level three grants the first talent and the old specialization command is retired',()=>{
  const s=createGame();assert.equal(command(s,{type:'learnTalent',id:'vigor'}),false);giveXP(s,155);
  const before=stats(s.player);assert.equal(command(s,{type:'learnTalent',id:'vigor'}),true);
  assert.equal(stats(s.player).maxHp,before.maxHp+8);assert.equal(command(s,{type:'specialize',id:'ember'}),false);
  assert.deepEqual(deserialize(serialize(s)).player.talents,{vigor:1});
});
test('chapter two: prerequisite, runes, four glödvingar, equipment, boss, seal and final reward',()=>{
  const s=createGame();npc(s,'signe');assert.equal(command(s,{type:'accept',id:'embers'}),false);
  s.quests.beacon={status:'done',progress:[1,1]};command(s,{type:'accept',id:'embers'});
  for(const id of ['rune1','rune2','rune3']){landmark(s,id);landmark(s,id);}
  assert.equal(s.runes.length,3);assert.equal(s.quests.embers.progress[0],3);
  for(const e of s.enemies.filter(e=>e.type==='wisp').slice(0,4))defeat(s,e);
  assert.equal(questReady(s,'embers'),true);npc(s,'signe');command(s,{type:'complete',id:'embers'});
  assert.equal(s.player.inventory.marshCoat,1);command(s,{type:'accept',id:'heart'});
  landmark(s,'seal');assert.equal(s.flags.sealRestored,false);
  defeat(s,s.enemies.find(e=>e.type==='ancient'));landmark(s,'seal');assert.equal(questReady(s,'heart'),true);
  npc(s,'signe');command(s,{type:'complete',id:'heart'});assert.equal(s.player.inventory.emberBlade,1);
  const gold=s.player.gold;assert.equal(command(s,{type:'complete',id:'heart'}),false);assert.equal(s.player.gold,gold);
  const saved=deserialize(serialize(s));assert.equal(saved.flags.sealRestored,true);assert.equal(saved.enemies.find(e=>e.type==='ancient').hp,0);
  assert.deepEqual(saved.runes,s.runes);assert.equal(saved.quests.heart.status,'done');
});
test('early rune and permanent boss exploration counts when later accepting quests',()=>{
  const s=createGame();for(const id of ['rune1','rune2','rune3'])landmark(s,id);
  defeat(s,s.enemies.find(e=>e.type==='ancient'));landmark(s,'seal');npc(s,'signe');s.quests.beacon={status:'done',progress:[1,1]};
  command(s,{type:'accept',id:'embers'});assert.equal(s.quests.embers.progress[0],3);
  s.quests.embers.status='done';command(s,{type:'accept',id:'heart'});assert.equal(questReady(s,'heart'),true);
});
test('duplicate dropped equipment stays in the bag for individual sale',()=>{
  const s=createGame();s.drops=[{id:1,x:s.player.x,y:s.player.y,item:'swiftBlade',life:90}];step(s);
  assert.equal(s.player.inventory.swiftBlade,1);s.drops=[{id:2,x:s.player.x,y:s.player.y,item:'swiftBlade',life:90}];step(s);
  assert.equal(s.player.inventory.swiftBlade,2);assert.equal(s.player.gold,0);
});
test('enemy loot rolls produce differentiated rewards at sane frequencies',()=>{
  const {s,e}=alone('wisp'),counts={};
  for(let i=0;i<1000;i++) {
    Object.assign(e,{hp:1,mode:'idle',x:1504,y:648});s.player.x=1464;s.player.y=648;s.player.cooldowns.attack=0;
    command(s,{type:'attack'});const drop=s.drops.pop();assert.ok(drop);counts[drop.item]=(counts[drop.item]||0)+1;
  }
  assert.ok(counts.emberShard>600&&counts.emberShard<750);assert.ok(counts.potion>150&&counts.potion<300);assert.ok(counts.emberCharm>60&&counts.emberCharm<150);
  assert.equal(counts.amber,undefined);
});
test('real v1 shape migrates without losing chapter one progress, and its original is retained',()=>{
  const raw=JSON.stringify({version:1,savedAt:'2026-11-10T08:00:00.000Z',data:{player:{name:'V1-vandrare',x:448,y:880,hp:112,level:4,xp:27,gold:98,inventory:{trainingSword:1,linenCoat:1,keeperBlade:1,forestCoat:1,beaconCharm:1,potion:4},equipment:{weapon:'keeperBlade',armor:'forestCoat',charm:'beaconCharm'},dead:false},quests:{roots:{status:'done',progress:[5]},herbs:{status:'done',progress:[3]},beacon:{status:'done',progress:[1,1]}},harvested:['herb1','herb2','herb3'],chests:['chest1'],discovered:['village','trail','forest','ruins'],flags:{beaconLit:true,wardenDefeated:true},seed:985321,time:1924}});
  const storage=memory({[SAVE_KEY]:raw}),store=new SaveStore(storage),s=store.load();
  assert.equal(s.player.name,'V1-vandrare');assert.equal(s.player.level,4);assert.equal(s.player.xp,27);assert.equal(s.player.hp,112);
  assert.equal(s.player.equipment.charm,'beaconCharm');assert.equal(s.quests.beacon.status,'done');assert.equal(s.flags.ancientDefeated,false);
  assert.deepEqual(s.runes,[]);assert.deepEqual(s.player.talents,{});assert.equal(s.enemies.filter(e=>e.hp>0&&e.type==='wisp').length,5);
  assert.equal(storage.getItem(SAVE_KEY+'.v1'),raw);assert.equal(store.save(s),true);assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).version,SAVE_VERSION);
  store.load();store.save(s);assert.equal(storage.getItem(SAVE_KEY+'.v1'),raw);
});
test('migration backup storage failure keeps a valid journey playable and original protected',()=>{
  const d=JSON.parse(serialize(createGame('Quota')));d.version=1;const raw=JSON.stringify(d);
  const store=new SaveStore({getItem:k=>k===SAVE_KEY?raw:null,setItem(){throw Error('quota');}});
  assert.equal(store.load().player.name,'Quota');assert.equal(store.blocked,true);assert.equal(store.save(createGame()),false);
});
test('current saves preserve pending loot and cooldowns, and repairs unknown new fields',()=>{
  const {s,e}=alone('ancient');defeat(s,e);s.player.cooldowns.potion=6.4;
  const copy=deserialize(serialize(s));assert.equal(copy.drops.length,1);assert.equal(copy.drops[0].item,'emberCharm');assert.equal(copy.player.cooldowns.potion,6.4);
  const raw=JSON.parse(serialize(s));raw.data.player.specialization='__proto__';raw.data.player.checkpoint='lost';raw.data.runes=['rune1','rune1','fake'];
  const repaired=deserialize(JSON.stringify(raw));assert.equal(Object.hasOwn(repaired.player,'specialization'),false);assert.equal(repaired.player.checkpoint,'village');assert.deepEqual(repaired.runes,['rune1']);
});
test('spatial collision index agrees with a full obstacle scan across the entire world',()=>{
  const original=(x,y,r)=>{
    if(x<32+r||y<32+r||x>WIDTH-32-r||y>HEIGHT-32-r)return true;
    if([[-r,0],[r,0],[0,-r],[0,r]].some(([dx,dy])=>terrain(x+dx,y+dy)==='water'))return true;
    return WORLD.obstacles.some(p=>p.kind==='house'?x+r>p.x-p.w/2&&x-r<p.x+p.w/2&&y+r>p.y-42&&y-r<p.y+8:Math.hypot(p.x-x,p.y-y)<(p.kind==='beacon'?21:p.kind==='rock'?13:10)+r);
  };
  for(let y=32;y<HEIGHT;y+=13)for(let x=32;x<WIDTH;x+=17)for(const radius of [2,11,24])assert.equal(blocked(x,y,radius),original(x,y,radius));
  assert.equal(lineClear({x:208,y:680},{x:336,y:680}),false);
});
test('ranged swarm keeps projectiles, hazards and presentation effects bounded',()=>{
  const {s,e}=alone('wisp');s.enemies=Array.from({length:80},(_,i)=>({...e,id:'enemy'+i,cooldown:i*.02}));
  for(let i=0;i<3600;i++) {
    s.player.invulnerable=1;step(s,{y:Math.sin(i/100),x:Math.cos(i/100)});
    assert.ok(s.projectiles.length<=32);assert.ok(s.hazards.length<=12);assert.ok(s.effects.length<=70);
  }
  assert.ok(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y)));
});

test('dodging while attacking follows movement rather than auto-aim toward the enemy',()=>{
  const {s,e}=alone('warden');s.player.x=e.x-40;
  step(s,{x:-1,attack:true});assert.ok(s.player.facing.x>0);
  const x=s.player.x;command(s,{type:'dodge'});run(s,.18);
  assert.ok(s.player.x<x-70);
});
test('chapter-two boss lasts several telegraphs and rewards avoidance over trading hits',()=>{
  const fights=[];
  for(const avoid of [false,true]) {
    const s=createGame(),e=s.enemies.find(e=>e.type==='ancient');s.enemies=[e];
    Object.assign(s.player,{x:e.x-60,y:e.y,level:5,inventory:{potion:3},equipment:{weapon:'moonBlade',armor:'marshCoat',charm:'beaconCharm'}});
    s.player.hp=stats(s.player).maxHp;
    let seconds=0,hits=0;
    while(e.hp>0&&!s.player.dead&&seconds<45) {
      const p=s.player;let x=e.x-p.x,y=e.y-p.y;
      if(Math.hypot(x,y)<60){x=0;y=0;}
      if(avoid&&s.hazards.some(h=>Math.hypot(h.x-p.x,h.y-p.y)<h.radius+18)){x=0;y=p.y<e.y?-1:1;}
      command(s,{type:'burst'});if(p.hp<stats(p).maxHp-60)command(s,{type:'potion'});
      step(s,{x,y,attack:true});hits+=s.events.filter(event=>event.type==='hurt').length;s.events=[];seconds+=TICK;
    }
    assert.equal(e.hp,0);assert.equal(s.player.dead,false);assert.ok(seconds>10&&seconds<35);
    fights.push({hits,potions:s.player.inventory.potion});
  }
  assert.ok(fights[0].hits>=3);assert.equal(fights[1].hits,0);assert.ok(fights[1].potions>fights[0].potions);
});

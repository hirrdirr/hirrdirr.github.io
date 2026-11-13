import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, command, step, stats, giveXP, TICK } from '../js/simulation.js';
import { ITEMS, NPCS, QUESTS, xpForLevel } from '../js/data.js';
import { TALENTS, TALENT_TREES, learnTalent, talentRequirement, spentTalentPoints, availableTalentPoints, sanitizeTalents } from '../js/talents.js';
import { MERCHANTS, tradeQuote, BUYBACK_LIMIT } from '../js/trading.js';
import { BAG_SLOTS, MAX_GOLD, occupiedSlots } from '../js/inventory.js';
import { serialize, deserialize, SaveStore, SAVE_KEY } from '../js/save.js';
import { LANDMARKS, blocked } from '../js/world.js';
import { tradePanel, talentPanel, compareEquipment } from '../js/ui-panels.js';

const run=(s,seconds)=>{for(let i=0;i<Math.round(seconds/TICK);i++)step(s);};
function near(s,id){const n=NPCS.find(n=>n.id===id);s.player.x=n.x;s.player.y=n.y;}
function shop(){const s=createGame();near(s,'ivo');s.player.gold=300;return s;}
function allocate(p,entries){for(const [id,count] of Object.entries(entries))for(let i=0;i<count;i++)assert.equal(learnTalent(p,id),true,id+': '+talentRequirement(p,id));}
function fillBag(p,exclude){p.inventory=Object.fromEntries(Object.keys(ITEMS).filter(id=>!exclude.includes(id)).slice(0,BAG_SLOTS).map(id=>[id,1]));assert.equal(occupiedSlots(p),16);}
function arena(){
  const s=createGame(),e=s.enemies.find(e=>e.type==='warden');s.enemies=[e];
  Object.assign(s.player,{x:1404,y:648,level:20,hp:300});
  Object.assign(e,{x:1504,y:648,homeX:1504,homeY:648,hp:10000,mode:'windup',windup:99,windupMax:99});
  s.discovered=['village','trail','forest','ruins','camp','marsh'];return {s,p:s.player,e};
}
const guardian={vigor:3,steel:3,guard:1,edge:2,resolve:2,bastion:1,retaliation:1,remedy:2};
const hunter={tempo:3,precision:3,rush:1,footwork:2,momentum:2,exposed:2,dance:1,hunter:1};
const weaver={embers:3,focus:3,bolt:1,bloom:2,reach:2,resonance:2,piercing:1,renewal:1};

test('merchant quotes configured prices and rejects unknown stock, quantity tricks, death and distance',()=>{
  const s=shop();for(const offer of MERCHANTS.ivo.stock){const q=tradeQuote(s,{type:'buy',id:offer.id});assert.equal(q.price,offer.price);assert.ok(offer.price>ITEMS[offer.id].value);}
  const before=serialize(s);
  for(const action of [{type:'buy'},{type:'buy',id:'moonBlade'},{type:'buy',id:'potion',quantity:-1},{type:'sell',id:'potion',quantity:100},{type:'buy',id:'potion',merchant:'fake'}])assert.equal(command(s,action),false);
  // Only presentation events change, never the persisted inventory or money.
  const after=JSON.parse(serialize(s));const prev=JSON.parse(before);delete after.savedAt;delete prev.savedAt;assert.deepEqual(after,prev);
  s.player.dead=true;assert.equal(command(s,{type:'buy',id:'potion'}),false);s.player.dead=false;s.player.x-=200;assert.equal(command(s,{type:'sell',id:'potion'}),false);
});
test('buy, individual sale and stable-ID buyback conserve inventory and cannot replay a refund',()=>{
  const s=shop();s.player.inventory.amber=3;const money=s.player.gold;
  assert.equal(command(s,{type:'sell',id:'amber'}),true);assert.equal(s.player.inventory.amber,2);assert.equal(s.player.gold,money+4);
  const id=s.buyback[0].id;assert.equal(command(s,{type:'buyback',id}),true);assert.equal(s.player.inventory.amber,3);assert.equal(s.player.gold,money);
  assert.equal(command(s,{type:'buyback',id}),false);assert.equal(s.player.inventory.amber,3);
  assert.equal(command(s,{type:'buy',id:'potion'}),true);assert.equal(s.player.inventory.potion,4);assert.equal(s.player.gold,money-12);
  const copy=deserialize(serialize(s));assert.deepEqual(copy.player.inventory,s.player.inventory);assert.equal(copy.player.gold,s.player.gold);
});
test('equipped copies and quest rewards cannot be sold; unequip first, confirm rare sales',()=>{
  const s=shop();s.player.inventory.trainingSword=2;const gold=s.player.gold;
  assert.equal(command(s,{type:'sell',id:'trainingSword'}),false);assert.equal(command(s,{type:'unequip',slot:'weapon'}),true);
  assert.equal(command(s,{type:'sell',id:'trainingSword'}),true);assert.equal(s.player.inventory.trainingSword,1);
  s.player.inventory.beaconCharm=1;assert.equal(command(s,{type:'sell',id:'beaconCharm',confirm:true}),false);
  s.player.inventory.moonBlade=1;assert.equal(command(s,{type:'sell',id:'moonBlade'}),false);assert.equal(command(s,{type:'sell',id:'moonBlade',confirm:true}),true);
  assert.equal(s.player.gold,gold+1+ITEMS.moonBlade.value);assert.equal(s.player.inventory.beaconCharm,1);
});
test('full bag, full stack, insufficient gold and gold cap fail without partial transactions',()=>{
  const s=shop();fillBag(s.player,['runeFocus','runnerWrap']);const gold=s.player.gold;
  assert.equal(command(s,{type:'buy',id:'runeFocus'}),false);assert.equal(s.player.gold,gold);assert.equal(s.player.inventory.runeFocus,undefined);
  const potions=s.player.inventory.potion;assert.equal(command(s,{type:'buy',id:'potion'}),true);assert.equal(s.player.inventory.potion,potions+1);
  s.player.inventory.potion=999;const before=s.player.gold;assert.equal(command(s,{type:'buy',id:'potion'}),false);assert.equal(s.player.gold,before);
  s.player.gold=3;s.player.inventory.potion=2;assert.equal(command(s,{type:'buy',id:'potion'}),false);assert.equal(s.player.inventory.potion,2);
  s.player.gold=MAX_GOLD;assert.equal(command(s,{type:'sell',id:'potion'}),false);assert.equal(s.player.inventory.potion,2);
});
test('buyback is bounded, survives reload and rejects buying into a full bag',()=>{
  let s=shop();s.player.inventory.amber=12;for(let i=0;i<10;i++)command(s,{type:'sell',id:'amber'});
  assert.equal(s.buyback.length,BUYBACK_LIMIT);assert.equal(s.buyback.at(-1).id,'sale-3');
  s=deserialize(serialize(s));assert.equal(s.tradeSequence,11);const id=s.buyback[0].id;
  fillBag(s.player,['amber','runeFocus']);const gold=s.player.gold;
  assert.equal(command(s,{type:'buyback',id}),false);assert.equal(s.player.gold,gold);assert.ok(s.buyback.some(e=>e.id===id));
  delete s.player.inventory.linenCoat;assert.equal(command(s,{type:'buyback',id}),true);assert.equal(s.player.inventory.amber,1);assert.equal(command(s,{type:'buyback',id}),false);
});
test('sold starter equipment never reappears after a v3 reload',()=>{
  let s=shop();command(s,{type:'unequip',slot:'weapon'});command(s,{type:'sell',id:'trainingSword'});
  const gold=s.player.gold;for(let i=0;i<4;i++){s=deserialize(serialize(s));assert.equal(s.player.inventory.trainingSword,undefined);assert.equal(s.player.equipment.weapon,null);assert.equal(command(s,{type:'sell',id:'trainingSword'}),false);assert.equal(s.player.gold,gold);}
  assert.equal(command(s,{type:'buyback',id:s.buyback[0].id}),true);assert.equal(s.player.inventory.trainingSword,1);
});
test('full-inventory quest and chest claims keep all rewards pending, including gold and XP',()=>{
  const s=shop();near(s,'elin');s.quests.roots={status:'active',progress:[5]};fillBag(s.player,['keeperBlade','runeFocus']);
  const gold=s.player.gold,xp=s.player.xp;assert.equal(command(s,{type:'complete',id:'roots'}),false);
  assert.equal(s.quests.roots.status,'active');assert.equal(s.player.gold,gold);assert.equal(s.player.xp,xp);assert.equal(s.player.inventory.keeperBlade,undefined);
  delete s.player.inventory.amber;assert.equal(command(s,{type:'complete',id:'roots'}),true);assert.equal(s.player.inventory.keeperBlade,1);
  const chest=LANDMARKS.find(x=>x.id==='chest2');s.player.x=chest.x;s.player.y=chest.y;fillBag(s.player,['moonBlade','runeFocus']);
  const money=s.player.gold;assert.equal(command(s,{type:'interact'}),false);assert.equal(s.chests.includes(chest.id),false);assert.equal(s.player.gold,money);
  delete s.player.inventory.amber;assert.equal(command(s,{type:'interact'}),true);assert.equal(s.player.inventory.moonBlade,1);
});
test('blocked ground loot remains collectible after space is freed',()=>{
  const s=shop();s.enemies=[];fillBag(s.player,['moonBlade','runeFocus']);s.drops=[{id:1,x:s.player.x,y:s.player.y,item:'moonBlade',life:1}];
  run(s,2);assert.equal(s.drops.length,1);assert.equal(s.player.inventory.moonBlade,undefined);
  delete s.player.inventory.amber;step(s);assert.equal(s.drops.length,0);assert.equal(s.player.inventory.moonBlade,1);
});
test('leveling grants exactly earned points; ranks, branch gates and prerequisites cannot be bypassed',()=>{
  const s=createGame(),p=s.player;assert.equal(learnTalent(p,'vigor'),false);giveXP(s,xpForLevel(1)+xpForLevel(2));
  assert.equal(p.level,3);assert.equal(availableTalentPoints(p),1);assert.equal(learnTalent(p,'guard'),false);assert.equal(learnTalent(p,'vigor'),true);assert.equal(learnTalent(p,'steel'),false);
  p.level=8;allocate(p,{vigor:2});assert.equal(learnTalent(p,'vigor'),false);assert.equal(learnTalent(p,'edge'),false);assert.equal(learnTalent(p,'resolve'),false);
  assert.equal(learnTalent(p,'guard'),true);allocate(p,{tempo:1,focus:1});assert.equal(spentTalentPoints(p),6);assert.equal(availableTalentPoints(p),0);
  p.level=9;p.combat=5;assert.equal(learnTalent(p,'steel'),false);p.combat=0;p.dead=true;assert.equal(learnTalent(p,'steel'),false);
});
test('combat timer blocks talents until it expires, then allocation succeeds',()=>{
  const s=createGame(),p=s.player;p.level=3;p.combat=5;
  assert.match(talentRequirement(p,'vigor'),/striden/);
  assert.equal(command(s,{type:'learnTalent',id:'vigor'}),false);
  assert.equal(p.talents.vigor,undefined);
  assert.match(talentPanel(s,'vigor'),/id="talent-combat-notice"[^>]*>Du är i strid/);
  assert.match(talentPanel(s,'vigor'),/data-action="learnTalent"[^>]*disabled/);
  run(s,5.1);
  assert.equal(p.combat,0);assert.equal(talentRequirement(p,'vigor'),'');
  assert.equal(command(s,{type:'learnTalent',id:'vigor'}),true);
  assert.equal(deserialize(serialize(s)).player.talents.vigor,1);
});
test('all 24 talents are reachable with legal ranks and round-trip allocations preserve every tree',()=>{
  assert.equal(Object.keys(TALENTS).length,24);assert.equal(Object.keys(TALENT_TREES).length,3);
  for(const build of [guardian,hunter,weaver]){const s=createGame();s.player.level=20;allocate(s.player,build);assert.equal(spentTalentPoints(s.player),15);assert.deepEqual(deserialize(serialize(s)).player.talents,s.player.talents);}
  const p={level:20,talents:{},combat:0};allocate(p,{vigor:3,steel:3,tempo:3,precision:3,embers:3,focus:3});assert.equal(availableTalentPoints(p),0);assert.equal(learnTalent(p,'guard'),false);
});
test('sanitizer reconstructs legal prerequisites and budgets, never saved free-point totals',()=>{
  const bad=Object.fromEntries(Object.keys(TALENTS).map(id=>[id,999]));const p={level:6,talents:sanitizeTalents(bad,6)};
  assert.equal(spentTalentPoints(p),4);assert.equal(availableTalentPoints(p),0);
  assert.deepEqual(sanitizeTalents({guard:1,bastion:1,bolt:1},20),{});assert.deepEqual(sanitizeTalents({vigor:-3,steel:NaN,focus:'3'},20),{});
  const s=createGame();const raw=JSON.parse(serialize(s));raw.data.player.talents=bad;raw.data.player.talentPoints=100;const loaded=deserialize(JSON.stringify(raw));assert.deepEqual(loaded.player.talents,{});assert.equal(availableTalentPoints(loaded.player),0);
});
test('respec requires Mira, explicit confirmation and its fee; refunds points without healing or resetting cooldowns',()=>{
  const s=createGame(),p=s.player;p.level=20;p.gold=20;allocate(p,guardian);p.hp=40;p.cooldowns.guard=9;p.guardTime=3;p.counterTime=4;
  assert.equal(command(s,{type:'respec',confirm:true}),false);near(s,'mira');assert.equal(command(s,{type:'respec'}),false);
  p.combat=1;assert.equal(command(s,{type:'respec',confirm:true}),false);p.combat=0;
  assert.equal(command(s,{type:'respec',confirm:true}),true);assert.equal(p.gold,20);assert.equal(p.hp,40);assert.equal(availableTalentPoints(p),18);assert.equal(p.cooldowns.guard,9);assert.equal(p.guardTime,0);assert.equal(p.counterTime,0);
  allocate(p,{vigor:1});assert.equal(command(s,{type:'respec',confirm:true}),true);assert.equal(p.gold,10);
  allocate(p,{vigor:1});p.gold=9;assert.equal(command(s,{type:'respec',confirm:true}),false);assert.deepEqual(p.talents,{vigor:1});
  assert.equal(deserialize(serialize(s)).player.respecCount,2);
});
test('talent and item changes recompute health, armor, haste, mobility and magic without repeated stacking',()=>{
  const s=createGame(),p=s.player;p.level=20;const base=stats(p);allocate(p,{vigor:3,steel:3,tempo:3,precision:3,footwork:2,focus:3});
  let st=stats(p);assert.equal(st.maxHp,base.maxHp+24);assert.equal(st.defense,base.defense+3);assert.equal(st.speed,170);assert.equal(st.dodgeCooldown,2.2);assert.ok(st.attackCooldown<base.attackCooldown);assert.ok(st.burstCooldown<5);
  p.inventory.runnerWrap=1;p.inventory.runeFocus=1;command(s,{type:'equip',id:'runnerWrap'});command(s,{type:'equip',id:'runeFocus'});st=stats(p);
  assert.equal(st.speed,176);assert.equal(st.burstMultiplier,1.8*1.12);assert.equal(st.boltMultiplier,1.5*1.12);
  for(let i=0;i<5;i++)assert.deepEqual(stats(p),st);const hp=p.hp;command(s,{type:'unequip',slot:'charm'});assert.equal(p.hp,hp);assert.equal(stats(p).burstMultiplier,1.8);
});
test('active talents unlock separately and cooldowns survive saving',()=>{
  const {s,p}=arena();for(const id of ['guard','rush','bolt'])assert.equal(command(s,{type:id}),false);
  allocate(p,{vigor:3,guard:1,tempo:3,rush:1,focus:3,bolt:1});
  for(const id of ['guard','rush','bolt']){assert.equal(command(s,{type:id}),true);assert.equal(command(s,{type:id}),false);assert.ok(p.cooldowns[id]>0);}
  const copy=deserialize(serialize(s));for(const id of ['guard','rush','bolt'])assert.equal(copy.player.cooldowns[id],p.cooldowns[id]);
  assert.equal(copy.playerShots.length,0);assert.equal(copy.player.guardTime,0);
});
test('Lyktvärn reduces real incoming damage and Återsken empowers exactly one connected melee hit',()=>{
  const {s,p,e}=arena();allocate(p,guardian);const st=stats(p);assert.equal(st.guardDuration,6);assert.equal(st.guardCooldown,11);assert.equal(st.guardReduction,.65);p.x=e.x-40;
  command(s,{type:'guard'});const hp=p.hp;s.hazards=[{x:p.x,y:p.y,radius:62,damage:70,delay:0,maxDelay:1}];step(s);
  assert.equal(hp-p.hp,Math.round((70-st.defense)*.35));assert.equal(p.counterTime,5);
  const before=e.hp;command(s,{type:'attack'});assert.equal(before-e.hp,Math.round(st.attack*st.meleeMultiplier*1.5));assert.equal(p.counterTime,0);
  p.cooldowns.attack=0;const after=e.hp;command(s,{type:'attack'});assert.equal(after-e.hp,Math.round(st.attack*st.meleeMultiplier));
});
test('Skuggsprång hits at range but cannot cross occluding terrain or spend cooldown without a target',()=>{
  const {s,p,e}=arena();allocate(p,{tempo:3,rush:1});const hp=e.hp;assert.equal(command(s,{type:'rush'}),true);assert.ok(Math.hypot(p.x-e.x,p.y-e.y)<55);assert.equal(hp-e.hp,Math.round(stats(p).attack*1.4));assert.equal(blocked(p.x,p.y),false);
  p.cooldowns.rush=0;s.enemies=[];assert.equal(command(s,{type:'rush'}),false);assert.equal(p.cooldowns.rush,0);
  s.enemies=[e];p.x=208;p.y=680;e.x=336;e.y=680;assert.equal(command(s,{type:'rush'}),false);assert.equal(p.x,208);
});
test('Glimtskott travels, collides, and piercing hits each of at most two enemies once',()=>{
  for(const pierce of [false,true]){
    const {s,p,e}=arena();allocate(p,pierce?weaver:{focus:3,bolt:1});e.x=p.x+70;
    const e2={...e,id:'second',x:p.x+120},e3={...e,id:'third',x:p.x+175};s.enemies.push(e2,e3);const damage=Math.round(stats(p).attack*stats(p).boltMultiplier);
    command(s,{type:'bolt'});assert.equal(e.hp,10000);run(s,.65);
    assert.equal(e.hp,10000-damage);assert.equal(e2.hp,10000-(pierce?damage:0));assert.equal(e3.hp,10000);assert.equal(s.playerShots.length,0);
  }
  const {s,p}=arena();s.enemies=[];allocate(p,{focus:3,bolt:1});p.x=208;p.y=680;p.facing={x:1,y:0};command(s,{type:'bolt'});run(s,.3);assert.equal(s.playerShots.length,0);
});
test('Lyktslag synergy changes damage and reach and heals once only when it hits',()=>{
  const {s,p,e}=arena();allocate(p,weaver);const st=stats(p);assert.equal(st.burstRadius,120);p.hp=100;e.x=p.x+135;
  const before=e.hp;command(s,{type:'burst'});assert.equal(before-e.hp,Math.round(st.attack*1.8*1.24));assert.equal(p.hp,100+Math.round(8+st.maxHp*.08));
  s.enemies=[];p.cooldowns.burst=0;const hp=p.hp;command(s,{type:'burst'});assert.equal(p.hp,hp);
});
test('critical talents increase actual damage; finishers shorten movement cooldowns and kills heal',()=>{
  const {s,p,e}=arena();allocate(p,hunter);p.x=e.x-40;s.seed=0;const st=stats(p);
  // First roll from this seed is above 9%; search the next legal seed for a critical.
  s.seed=1972;while(((Math.imul(s.seed,1664525)+1013904223)>>>0)/4294967296>=st.critChance)s.seed++;
  const before=e.hp;command(s,{type:'attack'});assert.equal(before-e.hp,Math.round(st.attack*1.8));assert.ok(s.events.some(x=>x.type==='critical'));
  p.cooldowns.attack=0;command(s,{type:'attack'});p.cooldowns.attack=0;p.cooldowns.rush=9;p.cooldowns.dodge=2;command(s,{type:'attack'});
  assert.equal(p.combo,3);assert.equal(p.cooldowns.rush,7);assert.equal(p.cooldowns.dodge,1.5);assert.equal(st.comboMultiplier,1.51);
  p.hp=100;e.hp=1;p.cooldowns.attack=0;command(s,{type:'attack'});assert.equal(p.hp,106);
});
test('potion talents heal their stated amount, and losing max-health gear clamps health',()=>{
  const {s,p}=arena();allocate(p,guardian);p.hp=100;command(s,{type:'potion'});assert.equal(p.hp,175);
  p.inventory.forestCoat=1;command(s,{type:'equip',id:'forestCoat'});p.hp=stats(p).maxHp;command(s,{type:'unequip',slot:'armor'});assert.equal(p.hp,stats(p).maxHp);
});
test('real v2 specialization migrates to unspent talents and preserves its untouched original',()=>{
  const s=shop();s.player.level=7;s.player.inventory.swiftBlade=2;const raw=JSON.parse(serialize(s));raw.version=2;raw.data.player.specialization='ember';delete raw.data.player.talents;delete raw.data.player.respecCount;delete raw.data.buyback;
  const text=JSON.stringify(raw),memory=new Map([[SAVE_KEY,text]]),store=new SaveStore({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}),loaded=store.load();
  assert.equal(availableTalentPoints(loaded.player),5);assert.equal(Object.hasOwn(loaded.player,'specialization'),false);assert.equal(loaded.player.gold,300);assert.equal(loaded.player.inventory.swiftBlade,2);
  assert.equal(memory.get(SAVE_KEY+'.v2'),text);assert.match(store.notice,/5 poäng/);store.save(loaded);assert.equal(memory.get(SAVE_KEY+'.v2'),text);assert.equal(JSON.parse(memory.get(SAVE_KEY)).version,3);
});
test('older overflowing bags retain every item and buyback repair never trusts an edited price',()=>{
  const s=shop();s.player.inventory=Object.fromEntries(Object.keys(ITEMS).map(id=>[id,2]));const raw=JSON.parse(serialize(s));raw.version=2;
  let loaded=deserialize(JSON.stringify(raw));assert.deepEqual(loaded.player.inventory,s.player.inventory);assert.ok(occupiedSlots(loaded.player)>BAG_SLOTS);
  raw.version=3;raw.data.buyback=[{id:'sale-7',merchant:'ivo',item:'potion',price:-99},{id:'sale-7',merchant:'ivo',item:'potion',price:0},{id:'sale-8',merchant:'ivo',item:'beaconCharm',price:1},{id:'sale-9',merchant:'fake',item:'potion',price:1}];
  loaded=deserialize(JSON.stringify(raw));assert.equal(loaded.buyback.length,1);assert.equal(loaded.buyback[0].price,4);assert.equal(loaded.tradeSequence,8);
});
test('panels expose prices, equipment protection, all talents and honest full-character comparisons',()=>{
  const s=shop();let html=tradePanel(s,{side:'bag',id:'trainingSword'});assert.match(html,/Ta av Vandrarsvärd/);assert.match(html,/data-action="sell"[^>]+disabled/);assert.doesNotMatch(html,/Sälj alla/);
  html=talentPanel(s,'guard');assert.equal((html.match(/data-talent=/g)||[]).length,24);assert.match(html,/class="talent-links"/);assert.match(html,/Första poängen/);
  html=compareEquipment(s.player,'runnerWrap');assert.match(html,/Hugg \/ sekund/);assert.match(html,/Rörelsefart/);
});

test('ranged hits provoke idle enemies outside their normal detection radius',()=>{
  const {s,p,e}=arena();allocate(p,{focus:3,bolt:1});p.x=1200;p.y=580;e.x=1450;e.y=580;e.homeX=e.x;e.homeY=e.y;e.mode='idle';e.windup=0;
  command(s,{type:'bolt'});run(s,.8);assert.ok(e.hp<10000);assert.equal(e.mode,'chase');assert.ok(e.x<e.homeX);
});
test('offensive talent abilities cannot damage enemies from a safe village or camp',()=>{
  const s=shop(),p=s.player;p.level=20;allocate(p,{tempo:3,rush:1,focus:3,bolt:1,vigor:3,guard:1});
  for(const id of ['bolt','rush']){assert.equal(command(s,{type:id}),false);assert.equal(p.cooldowns[id],0);}
  assert.equal(s.playerShots.length,0);assert.equal(command(s,{type:'guard'}),true);
});

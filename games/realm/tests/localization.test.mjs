import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import english from '../js/locales/en.js';
import { tr, createTranslator, LANGUAGE } from '../js/i18n.js';
import { VERSION, ITEMS, QUESTS, NPCS } from '../js/data.js';
import { TALENTS, talentRequirement, availableTalentPoints } from '../js/talents.js';
import { createGame, command, step, TICK, stats } from '../js/simulation.js';
import { deserialize, serialize, SaveStore, SAVE_KEY, SAVE_VERSION } from '../js/save.js';
import { tradePanel, talentPanel, escapeHTML } from '../js/ui-panels.js';
import { UI } from '../js/ui.js';
import { renderHTML } from '../scripts/localize-html.mjs';

const fixture = await readFile(new URL('./fixtures/v0.3.0-swedish.json', import.meta.url), 'utf8');
const swedishCopy = /[åäöÅÄÖ]|\b(?:guld|vandrare|lykt\w*|glöd\w*|talanger|uppdrag|sparfil|poäng|myren|andas igen|byns|vid byns|utrustad|sälj|köp)\b/i;
const source = file => readFile(new URL('../'+file, import.meta.url),'utf8');

test('English catalog interpolates values once, supports locale fallback and rejects incomplete messages', () => {
  assert.equal(LANGUAGE,'en'); assert.equal(VERSION,'0.3.1');
  const translate=createTranslator({'ui.restores_health':'Heal {0} HP'});
  assert.equal(translate('ui.restores_health',55),'Heal 55 HP');
  assert.equal(translate('data.lanternkeeper_blade'),'Lanternkeeper Blade');
  assert.equal(tr('main.welcome_back','{0} <Mira>'),'Welcome back, {0} <Mira>.');
  assert.throws(()=>tr('missing.key'),/Unknown localization key/);
  assert.throws(()=>tr('ui.restores_health'),/Missing localization value/);
  assert.equal(escapeHTML(tr('main.welcome_back','<Mira>')),'Welcome back, &lt;Mira&gt;.');
});

test('all English messages and referenced keys resolve, with no leftover Swedish copy or HTML in the catalog', async () => {
  for(const [key,text] of Object.entries(english)) {
    assert.doesNotMatch(text,swedishCopy,key);
    assert.doesNotMatch(text,/<\/?[a-z][^>]*>/i,key);
    const count=Math.max(-1,...Array.from(text.matchAll(/\{(\d+)\}/g),m=>Number(m[1])))+1;
    assert.doesNotMatch(tr(key,...Array.from({length:count},(_,i)=>i+1)),/\{\d+\}/,key);
  }
  for(const name of (await readdir(new URL('../js',import.meta.url))).filter(n=>n.endsWith('.js'))) {
    const text=await source('js/'+name);
    assert.doesNotMatch(text,swedishCopy,name);
    for(const [,key] of text.matchAll(/\btr\(["']([^"']+)["']/g))assert.ok(Object.hasOwn(english,key),name+': '+key);
  }
});

test('committed static page matches the English template, including metadata and accessible controls', async () => {
  const html=await source('index.html');assert.equal(html,await renderHTML());
  assert.match(html,/<html lang="en">/);assert.match(html,/<small>0\.3\.1<\/small>/);
  assert.match(html,/<title>Project Realm · Lantern Vale/);
  assert.match(html,/aria-label="Lantern Ward \(1\)"/);assert.match(html,/aria-label="Close menu"/);
  assert.doesNotMatch(html,swedishCopy);assert.doesNotMatch(html,/\{\{|\{\d+\}/);
  assert.doesNotMatch(await source('realm.css'),swedishCopy);
  assert.match(html,/class="nav-label-short" aria-hidden="true">Bag<\/span>/);
});

test('a save produced by the Swedish 0.3.0 code preserves all persisted data through English load and save', () => {
  const before=JSON.parse(fixture),s=deserialize(fixture),after=JSON.parse(serialize(s));
  assert.equal(SAVE_VERSION,3);assert.equal(after.version,before.version);
  assert.deepEqual(after.data,before.data);
  assert.equal(s.player.name,'Åsa Vandrare');assert.equal(s.player.respecCount,2);
  assert.equal(availableTalentPoints(s.player),2);assert.equal(s.tradeSequence,8);
  assert.equal(ITEMS[s.player.equipment.weapon].name,'Moonshard');
  const memory=new Map([[SAVE_KEY,fixture]]),store=new SaveStore({getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)});
  const loaded=store.load();assert.equal(store.notice,'');assert.equal(store.save(loaded),true);
  assert.equal(memory.get(SAVE_KEY+'.backup'),fixture);
  assert.deepEqual(JSON.parse(memory.get(SAVE_KEY)).data,before.data);
});

test('old IDs still support buying, protected rare sales, buyback, quest rewards and paid respecialization', () => {
  const s=deserialize(fixture),p=s.player,ivo=NPCS.find(n=>n.id==='ivo');Object.assign(p,{x:ivo.x,y:ivo.y});
  const gold=p.gold;assert.equal(command(s,{type:'buy',id:'potion'}),true);assert.equal(p.inventory.potion,8);
  assert.equal(command(s,{type:'sell',id:'moonBlade',confirm:true}),false);
  command(s,{type:'unequip',slot:'weapon'});assert.equal(command(s,{type:'sell',id:'moonBlade'}),false);
  assert.equal(command(s,{type:'sell',id:'moonBlade',confirm:true}),true);
  assert.equal(command(s,{type:'buyback',id:s.buyback[0].id}),true);assert.equal(p.gold,gold-12);assert.equal(p.inventory.moonBlade,1);
  const signe=NPCS.find(n=>n.id==='signe');Object.assign(p,{x:signe.x,y:signe.y});
  s.quests.embers.progress=QUESTS.embers.objectives.map(o=>o.count);
  assert.equal(command(s,{type:'complete',id:'embers'}),true);assert.equal(s.quests.embers.status,'done');assert.equal(p.inventory.marshCoat,2);
  const mira=NPCS.find(n=>n.id==='mira');Object.assign(p,{x:mira.x,y:mira.y});const money=p.gold;
  assert.equal(command(s,{type:'respec',confirm:true}),true);assert.equal(p.gold,money-10);assert.equal(p.respecCount,3);assert.equal(availableTalentPoints(p),18);
});

test('talent descriptions render at every rank and panels expose localized rank, combat and trade feedback', () => {
  const s=deserialize(fixture);s.player.combat=4.2;
  for(const [id,t] of Object.entries(TALENTS))for(let rank=1;rank<=t.maxRank;rank++){
    assert.doesNotMatch(t.description(rank),swedishCopy);
    assert.doesNotMatch(talentPanel(s,id),/undefined|\{\d+\}/,id);
  }
  const panel=talentPanel(s,'steel');assert.match(panel,/You are in combat/);assert.match(panel,/id="talent-combat-seconds">5</);
  assert.match(panel,/Learn rank 3 · 1 point/);assert.match(panel,/data-action="learnTalent"[^>]*disabled/);
  for(let i=0;i<300;i++)step(s,{},TICK);
  assert.equal(s.player.combat,0);assert.equal(talentRequirement(s.player,'steel'),'');
  assert.equal(command(s,{type:'learnTalent',id:'steel'}),true);
  assert.match(tradePanel(s,{side:'stock',id:'potion'}),/Approach the merchant first/);
  assert.ok(stats(s.player).defense>0);
});

// Small event/element doubles exercise the actual UI handlers. These are not browser tests.
function uiHarness(s) {
  const elements=new Map();
  function element(id){if(!elements.has(id))elements.set(id,{
    id,open:false,hidden:false,textContent:'',innerHTML:'',dataset:{},scrollTop:0,handlers:{},
    classList:{toggle(){},add(){}},addEventListener(type,fn){this.handlers[type]=fn;},
    showModal(){this.open=true;},close(){this.open=false;this.handlers.close?.();},focus(){},querySelector(){return null;}
  });return elements.get(id);}
  const previous=globalThis.document;globalThis.document={getElementById:element,querySelectorAll:()=>[],activeElement:null};
  const ui=new UI(()=>s,{started:()=>true,command:a=>command(s,a),resume(){},pause(){}});
  return {ui,element,restore(){if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}};
}

test('the actual rare-sale UI confirms or cancels inside the game and revalidates the transaction', () => {
  const s=deserialize(fixture),ivo=NPCS.find(n=>n.id==='ivo');Object.assign(s.player,{x:ivo.x,y:ivo.y});command(s,{type:'unequip',slot:'weapon'});
  const h=uiHarness(s),{ui,element}=h;try{
    ui.view='merchant';const gold=s.player.gold;
    ui.confirmRareSale('moonBlade');assert.equal(ui.confirmDialog.open,true);assert.match(element('realm-confirm-description').textContent,/Sell Moonshard for 24 gold/);
    element('realm-confirm-cancel').handlers.click();assert.equal(ui.pendingSale,null);assert.equal(s.player.gold,gold);
    ui.confirmRareSale('moonBlade');element('realm-confirm-accept').handlers.click();
    assert.equal(ui.confirmDialog.open,false);assert.equal(s.player.gold,gold+24);assert.equal(s.player.inventory.moonBlade,undefined);
    assert.equal(command(s,{type:'buyback',id:s.buyback[0].id}),true);
    ui.confirmRareSale('moonBlade');s.player.x=448;element('realm-confirm-accept').handlers.click();assert.equal(s.player.inventory.moonBlade,1);assert.equal(s.player.gold,gold);
  }finally{h.restore();}
});

test('the actual talent UI refreshes the live countdown and unlocks allocation without closing the panel', () => {
  const s=createGame();s.player.level=3;s.player.combat=2.5;const h=uiHarness(s),{ui,element}=h;
  try{
    ui.open('talents');assert.equal(ui.allowsSimulation,true);assert.match(element('panel-content').innerHTML,/data-action="learnTalent"[^>]*disabled/);
    for(let i=0;i<60;i++)step(s,{},TICK);ui.refreshTalentCombat();assert.equal(element('talent-combat-seconds').textContent,2);
    for(let i=0;i<100;i++)step(s,{},TICK);ui.refreshTalentCombat();
    assert.equal(ui.panel.open,true);assert.doesNotMatch(element('panel-content').innerHTML,/data-action="learnTalent"[^>]*disabled/);
    assert.equal(command(s,{type:'learnTalent',id:'vigor'}),true);
  }finally{h.restore();}
});

test('opening another NPC clears stale panel feedback without hiding current quest feedback', () => {
  const h=uiHarness(createGame());try{
    h.ui.view='talents';h.element('panel-feedback').hidden=false;h.ui.dialogue('elin');
    assert.equal(h.element('panel-feedback').hidden,true);
    h.element('panel-feedback').hidden=false;h.ui.dialogue('elin');
    assert.equal(h.element('panel-feedback').hidden,false);
    h.ui.dialogue('mira');assert.equal(h.element('panel-feedback').hidden,true);
  }finally{h.restore();}
});

import { tr } from './i18n.js';
import { createGame, command, step, TICK } from './simulation.js';
import { SaveStore, serialize, deserialize } from './save.js';
import { Renderer } from './renderer.js';
import { UI } from './ui.js';
import { AudioBus } from './audio.js';
import { ITEMS, QUESTS, NPCS } from './data.js';
import { TALENTS, availableTalentPoints } from './talents.js';
const $=id=>document.getElementById(id);
// Storage can throw even when merely accessing window.localStorage.
let storage;try{storage=window.localStorage;}catch{storage={getItem(){throw Error('storage blocked');},setItem(){throw Error('storage blocked');}};}
const saves=new SaveStore(storage),loaded=saves.load();
let state=loaded||createGame(),started=false,focusPaused=false,raf=0,last=0,accumulator=0,lastDraw=0,lastHUD=0,lastSave=0,frameLimit=60;
const renderer=new Renderer($('world'),$('minimap')),audio=new AudioBus(),keys=new Set();
try{const prefs=JSON.parse(storage.getItem('hirrdirr.realm.settings')||'{}');if([30,60].includes(prefs.fps))frameLimit=prefs.fps;if(Number.isFinite(prefs.volume))audio.volume=Math.max(0,Math.min(1,prefs.volume));}catch{}
function preferences(){try{storage.setItem('hirrdirr.realm.settings',JSON.stringify({fps:frameLimit,volume:audio.volume}));}catch{}}
function warning(){const message=saves.message;$('save-warning').hidden=!message;$('save-warning').textContent=message;}
function save(manual=false) {
  if(!started)return;
  const success=saves.save(state);
  $('save-status').textContent=success?tr("main.saved_on_this_device"):tr("main.not_saved_export_from_the_menu");
  warning();if(manual)ui.toast(success?tr("main.your_journey_is_saved"):saves.message||tr("main.the_existing_save_is_protected_export_your_journey_from_the_menu"));
}
function pause(){keys.clear();accumulator=0;if(raf)cancelAnimationFrame(raf);raf=0;}
function resume(){
  keys.clear();last=performance.now();lastDraw=0;accumulator=0;
  if(started&&(!ui.isOpen||ui.allowsSimulation)&&!focusPaused&&!document.hidden&&!raf)raf=requestAnimationFrame(loop);
}
function processEvents() {
  let needsSave=false;
  for(const event of state.events.splice(0)) {
    audio.play(event.type);
    if(event.type==='dialogue')ui.dialogue(event.id);
    else if(event.type==='message')ui.toast(event.text);
    else if(event.type==='item')ui.toast('+'+event.quantity+' '+ITEMS[event.id].name);
    else if(event.type==='level')ui.toast(tr("main.level_your_health_and_attack_have_increased", event.level, event.level>=3?tr("main.unspent_talent_points_n", availableTalentPoints(state.player)):''));
    else if(event.type==='questAccepted')ui.toast(tr("main.new_quest", QUESTS[event.id].name));
    else if(event.type==='questReady')ui.toast(tr("main.quest_ready_return_to", NPCS.find(n=>n.id===QUESTS[event.id].npc).name));
    else if(event.type==='questDone'){ui.toast(tr("main.quest_completed", QUESTS[event.id].name));if(event.id==='beacon')ui.toast(tr("main.chapter_01_complete_signe_awaits_east_of_the_bridge"));if(event.id==='heart')ui.toast(tr("main.chapter_02_complete_the_fen_breathes_again"));}
    else if(event.type==='discovery')ui.toast(tr("main.discovered_12_xp", event.name));
    else if(event.type==='equip')ui.toast(tr("main.equipped", ITEMS[event.id].name));
    else if(event.type==='beacon')ui.toast(tr("main.the_beacon_shines_again_return_to_elin"));
    else if(event.type==='rune')ui.toast(tr("main.runestone_read_18_xp"));
    else if(event.type==='seal')ui.toast(tr("main.the_seal_is_restored_return_to_signe"));
    else if(event.type==='checkpoint')ui.toast(tr("main.full_health_checkpoint", event.name));
    else if(event.type==='talent')ui.toast(tr("main.rank_learned", TALENTS[event.id].name, state.player.talents[event.id]));
    else if(event.type==='respec')ui.toast(tr("main.your_talents_have_been_reset_points_to_spend", availableTalentPoints(state.player)));
    else if(event.type==='unequip')ui.toast(tr("main.unequipped", ITEMS[event.id].name));
    else if(event.type==='trade')ui.toast(tr("main.gold", {buy:tr("main.bought"),sell:tr("main.sold"),buyback:tr("main.bought_back")}[event.action], ITEMS[event.id].name, event.action==='sell'?'+':'−', event.price));
    else if(event.type==='death'){save();ui.open('death');}
    else if(event.type==='respawn'){renderer.resetCamera();ui.view=null;ui.panel.close();}
    if(['questAccepted','questDone','equip','item','respawn','beacon','rune','seal','checkpoint','talent','respec','unequip','trade','kill'].includes(event.type))needsSave=true;
  }
  if(needsSave)save();
}
function dispatch(input) {
  if(!started)return;
  audio.unlock();command(state,input);processEvents();ui.hud(renderer);renderer.render(state,0);
}
function download(raw,name) {
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const ui=new UI(()=>state,{
  started:()=>started,pause,resume,command:dispatch,
  save:()=>save(true),
  export:()=>download(serialize(state),'project-realm-save.json'),
  volume:value=>{audio.volume=value;audio.unlock();preferences();},
  frameLimit:value=>{frameLimit=value===30?30:60;preferences();},
  settings:()=>({volume:audio.volume,fps:frameLimit,diagnostics:tr("main.canvas_ms_average_draw_time_enemies", $('world').width, $('world').height, (renderer.metrics.frames?renderer.metrics.total/renderer.metrics.frames:0).toFixed(1), state.enemies.length)}),
  fullscreen:async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else{document.querySelector('.realm-shell').classList.add('fullscreen-shell');await document.querySelector('.realm-shell').requestFullscreen();}}
    catch{ui.toast(tr("main.fullscreen_is_not_available_in_this_browser"));}
  },
  import:async file=>{
    try{
      if(file.size>262144)throw Error(tr("main.the_file_is_too_large"));
      const candidate=deserialize(await file.text());
      if(!window.confirm(tr("main.replace_your_current_journey_with_level_a_copy_of_the_current_sav", candidate.player.name, candidate.player.level)))return;
      if(!saves.replace(candidate)){warning();ui.toast(tr("main.the_import_could_not_be_saved_your_current_journey_is_unchanged"));return;}
      state=candidate;renderer.resetCamera();ui.close();processEvents();ui.hud(renderer);renderer.render(state,0);warning();
      if(state.player.dead)ui.open('death');else resume();
      ui.toast(tr("main.your_journey_has_been_imported"));
    }catch(error){ui.toast(tr("main.could_not_import", error.message));}
  },
  newGame:()=>newJourney()
});
function newJourney() {
  if(!window.confirm(tr("main.start_a_new_journey_this_replaces_the_current_local_save_export_i")))return;
  pause();state=createGame();started=false;focusPaused=false;ui.view=null;ui.panel.close();
  $('character-name').disabled=false;$('character-name').value=tr("simulation.wanderer");$('start-button').textContent=tr("main.begin_your_new_journey");
  $('new-from-welcome').hidden=true;renderer.resetCamera();renderer.render(state,0);ui.hud(renderer);
  $('welcome').dataset.replace='true';$('welcome').showModal();
}
function loop(now) {
  raf=0;
  if(!started||(ui.isOpen&&!ui.allowsSimulation)||focusPaused||document.hidden)return;
  const delta=Math.min(.1,Math.max(0,(now-last)/1000));last=now;accumulator+=delta;
  const input=ui.isOpen?{}:{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),y:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')),attack:keys.has('Space')};
  while(accumulator>=TICK&&!state.player.dead){step(state,input,TICK);accumulator-=TICK;}
  processEvents();ui.refreshTalentCombat();
  if(now-lastDraw>=1000/frameLimit-1){renderer.render(state,(now-lastDraw)/1000||TICK);lastDraw=now;}
  if(now-lastHUD>100){ui.hud(renderer);lastHUD=now;}
  if(now-lastSave>15000){save();lastSave=now;}
  if((!ui.isOpen||ui.allowsSimulation)&&!focusPaused&&!document.hidden)raf=requestAnimationFrame(loop);
}
const shortcut={KeyQ:'burst',ShiftLeft:'dodge',ShiftRight:'dodge',KeyR:'potion',KeyE:'interact',Digit1:'guard',Digit2:'rush',Digit3:'bolt'};
window.addEventListener('keydown',event=>{
  if(event.ctrlKey||event.metaKey||event.altKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
  if(!started)return;
  if(ui.isOpen) {
    if(ui.confirmDialog.open)return;
    if(!event.repeat&&['KeyI','KeyC','KeyJ','KeyN','KeyP'].includes(event.code)){event.preventDefault();ui.close();}
    return;
  }
  if(event.code==='Tab') {
    if(document.activeElement===$('world')){event.preventDefault();if(!event.repeat&&!focusPaused)dispatch({type:'target'});}
    return;
  }
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();
  if(focusPaused)return;
  keys.add(event.code);audio.unlock();
  if(event.repeat)return;
  if(shortcut[event.code])dispatch({type:shortcut[event.code]});
  else if(['KeyI','KeyC'].includes(event.code))ui.open('inventory');
  else if(event.code==='KeyJ')ui.open('journal');
  else if(event.code==='KeyN')ui.open('talents');
  else if(['Escape','KeyP'].includes(event.code)){event.preventDefault();ui.open('settings');}
});
window.addEventListener('keyup',event=>keys.delete(event.code));
document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{if(!ui.isOpen&&!focusPaused){dispatch({type:b.dataset.command});$('world').focus({preventScroll:true});}}));
$('world').addEventListener('pointerdown',event=>{
  if(event.button!==0||ui.isOpen||focusPaused)return;
  const canvas=$('world'),rect=canvas.getBoundingClientRect();
  const x=(event.clientX-rect.left)/rect.width*canvas.width+renderer.camera.x,y=(event.clientY-rect.top)/rect.height*canvas.height+renderer.camera.y;
  const target=state.enemies.filter(e=>e.hp>0&&Math.abs(e.x-x)<32&&y>e.y-65&&y<e.y+12).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
  canvas.focus({preventScroll:true});if(target)dispatch({type:'target',id:target.id});dispatch({type:'attack'});
});
$('pause-button').addEventListener('click',()=>ui.open('settings'));
window.addEventListener('blur',()=>{if(started&&!ui.isOpen){focusPaused=true;$('focus-overlay').hidden=false;}pause();save();});
window.addEventListener('focus',()=>{if(ui.allowsSimulation&&!document.hidden&&!focusPaused)resume();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){focusPaused=started;$('focus-overlay').hidden=!started;pause();save();}
  else if(ui.isOpen){focusPaused=false;$('focus-overlay').hidden=true;if(ui.allowsSimulation)resume();}
});
$('resume-focus').addEventListener('click',()=>{focusPaused=false;$('focus-overlay').hidden=true;audio.unlock();resume();$('world').focus({preventScroll:true});});
window.addEventListener('pagehide',()=>save());
$('theme-button').addEventListener('click',()=>{document.body.classList.toggle('light');try{storage.setItem('hirrdirr_theme',document.body.classList.contains('light')?'light':'dark');}catch{}});
const observer=new ResizeObserver(entries=>{
  const box=entries[0].contentRect;
  const width=Math.max(320,Math.min(960,Math.round(box.width))),height=Math.max(320,Math.min(720,Math.round(width*box.height/box.width)));
  if($('world').width!==width||$('world').height!==height){$('world').width=width;$('world').height=height;renderer.resetCamera();renderer.render(state,0);}
});
observer.observe(document.querySelector('.viewport'));
$('welcome').addEventListener('cancel',event=>event.preventDefault());
$('start-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(!loaded||$('welcome').dataset.replace==='true') {
    state=createGame($('character-name').value);
    if($('welcome').dataset.replace==='true'&&!saves.replace(state)){warning();ui.toast(tr("main.this_journey_is_temporary_export_it_before_closing"));}
  }
  started=true;focusPaused=false;$('focus-overlay').hidden=true;$('welcome').close();audio.unlock();
  renderer.resetCamera();renderer.render(state,0);ui.hud(renderer);save();resume();
  if(state.player.dead)ui.open('death');else ui.toast(loaded&&!$('welcome').dataset.replace?tr("main.welcome_back", state.player.name):tr("main.talk_to_elin_and_mira_in_the_village_press_e_to_interact"));
  $('world').focus({preventScroll:true});
});
$('new-from-welcome').addEventListener('click',newJourney);
if(loaded){$('character-name').value=state.player.name;$('character-name').disabled=true;$('start-button').textContent=tr("main.continue_journey_level", state.player.level);$('new-from-welcome').hidden=false;}
if(saves.message||saves.notice){$('welcome-warning').textContent=saves.message||saves.notice;$('welcome-warning').hidden=false;warning();}
renderer.render(state,0);ui.hud(renderer);$('welcome').showModal();

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
  $('save-status').textContent=success?'Sparat på den här enheten':'Sparning saknas · exportera via menyn';
  warning();if(manual)ui.toast(success?'Resan är sparad.':saves.message||'Sparningen är skyddad. Exportera din resa via menyn.');
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
    else if(event.type==='level')ui.toast('Nivå '+event.level+'! Din hälsa och attack har ökat.'+(event.level>=3?' '+availableTalentPoints(state.player)+' lediga talentpoäng · N':''));
    else if(event.type==='questAccepted')ui.toast('Nytt uppdrag · '+QUESTS[event.id].name);
    else if(event.type==='questReady')ui.toast('Uppdrag klart · Återvänd till '+NPCS.find(n=>n.id===QUESTS[event.id].npc).name);
    else if(event.type==='questDone'){ui.toast('Uppdrag slutfört · '+QUESTS[event.id].name);if(event.id==='beacon')ui.toast('Kapitel 01 avklarat. Signe väntar öster om bron!');if(event.id==='heart')ui.toast('Kapitel 02 avklarat. Myren andas igen!');}
    else if(event.type==='discovery')ui.toast('Upptäckt: '+event.name+' · +12 XP');
    else if(event.type==='equip')ui.toast(ITEMS[event.id].name+' utrustad');
    else if(event.type==='beacon')ui.toast('Fyren lyser igen. Återvänd till Elin!');
    else if(event.type==='rune')ui.toast('Runsten läst · +18 XP');
    else if(event.type==='seal')ui.toast('Sigillet är återställt. Återvänd till Signe!');
    else if(event.type==='checkpoint')ui.toast('Full hälsa · Återkomstplats: '+event.name);
    else if(event.type==='talent')ui.toast(TALENTS[event.id].name+' · rank '+state.player.talents[event.id]+' inlärd');
    else if(event.type==='respec')ui.toast('Dina talanger är återställda. '+availableTalentPoints(state.player)+' poäng att fördela.');
    else if(event.type==='unequip')ui.toast(ITEMS[event.id].name+' avlagd');
    else if(event.type==='trade')ui.toast(({buy:'Köpt',sell:'Sålt',buyback:'Återköpt'}[event.action])+' · '+ITEMS[event.id].name+' · '+(event.action==='sell'?'+':'−')+event.price+' guld');
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
  settings:()=>({volume:audio.volume,fps:frameLimit,diagnostics:'Canvas '+$('world').width+' × '+$('world').height+' · '+(renderer.metrics.frames?renderer.metrics.total/renderer.metrics.frames:0).toFixed(1)+' ms genomsnittlig ritning · '+state.enemies.length+' fiender'}),
  fullscreen:async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else{document.querySelector('.realm-shell').classList.add('fullscreen-shell');await document.querySelector('.realm-shell').requestFullscreen();}}
    catch{ui.toast('Helskärm är inte tillgängligt i den här webbläsaren.');}
  },
  import:async file=>{
    try{
      if(file.size>262144)throw Error('Filen är för stor.');
      const candidate=deserialize(await file.text());
      if(!window.confirm('Ersätta din nuvarande resa med '+candidate.player.name+', nivå '+candidate.player.level+'? En kopia av den nuvarande sparningen bevaras.'))return;
      if(!saves.replace(candidate)){warning();ui.toast('Importen kunde inte sparas. Din nuvarande resa är kvar.');return;}
      state=candidate;renderer.resetCamera();ui.close();processEvents();ui.hud(renderer);renderer.render(state,0);warning();
      if(state.player.dead)ui.open('death');else resume();
      ui.toast('Resan är importerad.');
    }catch(error){ui.toast('Kunde inte importera: '+error.message);}
  },
  newGame:()=>newJourney()
});
function newJourney() {
  if(!window.confirm('Börja en ny resa? Den tidigare lokala sparningen ersätts. Exportera den först om du vill fortsätta den senare.'))return;
  pause();state=createGame();started=false;focusPaused=false;ui.view=null;ui.panel.close();
  $('character-name').disabled=false;$('character-name').value='Vandrare';$('start-button').textContent='Börja din nya resa →';
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
    if($('welcome').dataset.replace==='true'&&!saves.replace(state)){warning();ui.toast('Resan startas tillfälligt. Exportera den innan du stänger.');}
  }
  started=true;focusPaused=false;$('focus-overlay').hidden=true;$('welcome').close();audio.unlock();
  renderer.resetCamera();renderer.render(state,0);ui.hud(renderer);save();resume();
  if(state.player.dead)ui.open('death');else ui.toast(loaded&&!$('welcome').dataset.replace?'Välkommen tillbaka, '+state.player.name+'.':'Prata med Elin och Mira i byn. E för att interagera.');
  $('world').focus({preventScroll:true});
});
$('new-from-welcome').addEventListener('click',newJourney);
if(loaded){$('character-name').value=state.player.name;$('character-name').disabled=true;$('start-button').textContent='Fortsätt resan · nivå '+state.player.level+' →';$('new-from-welcome').hidden=false;}
if(saves.message||saves.notice){$('welcome-warning').textContent=saves.message||saves.notice;$('welcome-warning').hidden=false;warning();}
renderer.render(state,0);ui.hud(renderer);$('welcome').showModal();

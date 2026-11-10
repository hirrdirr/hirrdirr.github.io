import { ITEMS, QUESTS, NPCS, RARITIES, xpForLevel } from './data.js';
import { stats, questReady, nearestInteraction } from './simulation.js';
import { zoneAt } from './world.js';
const $ = id => document.getElementById(id);
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const itemIcon = name => '<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="./assets/icons.svg#'+name+'"></use></svg>';
const itemStats = item => [item.attack?'+'+item.attack+' attack':'',item.defense?'+'+item.defense+' försvar':'',item.hp?'+'+item.hp+' maxhälsa':''].filter(Boolean).join(' · ');
const rewardsText = q => q.rewards.xp+' XP · '+q.rewards.gold+' guld · '+Object.entries(q.rewards.items).map(([id,n])=>(n>1?n+' × ':'')+ITEMS[id].name).join(' · ');
function setText(id,value) {const el=$(id);if(el.textContent!==String(value))el.textContent=String(value);}
export class UI {
  constructor(getState,actions) {
    this.state=getState;this.actions=actions;this.panel=$('panel');this.view=null;this.selected='trainingSword';this.lastTracker='';this.lastMap=0;
    document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>this.open(button.dataset.panel)));
    $('close-panel').addEventListener('click',()=>this.close());
    this.panel.addEventListener('close',()=>{this.view=null;actions.resume();});
    this.panel.addEventListener('cancel',e=>{if(this.view==='death')e.preventDefault();});
    $('panel-content').addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b||b.disabled)return;
      if(b.dataset.item){this.selected=b.dataset.item;this.inventory();return;}
      if(b.dataset.action) {
        const action=b.dataset.action;
        if(['accept','complete','equip','buy','sell','respawn','potion'].includes(action)) {
          actions.command({type:action,id:b.dataset.id});
          if(action==='respawn'){this.close();return;}
          if(this.view==='inventory')this.inventory();
          else if(this.view==='dialogue')this.dialogue(this.npcId);
        } else actions[action]?.();
      }
    });
    $('panel-content').addEventListener('input',event=>{
      if(event.target.id==='volume-control')actions.volume(Number(event.target.value));
    });
    $('panel-content').addEventListener('change',event=>{
      if(event.target.id==='frame-limit')actions.frameLimit(Number(event.target.value));
      if(event.target.id==='import-save'&&event.target.files[0])actions.import(event.target.files[0]);
    });
  }
  get isOpen(){return this.panel.open||$('welcome').open;}
  open(view) {
    if(!this.actions.started())return;
    if(this.state().player.dead&&view!=='death')view='death';
    this.view=view;
    if(view==='inventory')this.inventory();
    else if(view==='journal')this.journal();
    else if(view==='settings')this.settings();
    else if(view==='help')this.help();
    else if(view==='death')this.death();
    if(!this.panel.open)this.panel.showModal();
    this.actions.pause();
  }
  close(){if(this.view==='death')return;this.panel.close();}
  heading(kicker,title){$('panel-kicker').textContent=kicker;$('panel-title').textContent=title;$('close-panel').hidden=this.view==='death';}
  inventory() {
    const s=this.state(),p=s.player,st=stats(p),item=ITEMS[this.selected],equipped=item?.slot&&p.equipment[item.slot]===this.selected;
    this.heading('LYKTVANDRARE · NIVÅ '+p.level,'Karaktär & väska');
    let html='<div class="inventory-layout"><section class="character-sheet"><h3>'+escapeHTML(p.name)+'</h3><dl class="stat-list"><dt>Hälsa</dt><dd>'+Math.ceil(p.hp)+' / '+st.maxHp+'</dd><dt>Attack</dt><dd>'+st.attack+'</dd><dt>Försvar</dt><dd>'+st.defense+'</dd><dt>Erfarenhet</dt><dd>'+p.xp+' / '+xpForLevel(p.level)+'</dd><dt>Guld</dt><dd>'+p.gold+'</dd></dl><div>';
    for(const [slot,label] of [['weapon','Vapen'],['armor','Rustning'],['charm','Amulett']])html+='<div class="gear-slot"><small>'+label+'</small>'+escapeHTML(ITEMS[p.equipment[slot]]?.name||'Ingen utrustad')+'</div>';
    html+='</div></section><section><p>Välj ett föremål för information och utrustning.</p><div class="inventory-grid">';
    for(const [id,count] of Object.entries(p.inventory).filter(([,n])=>n>0)) {
      const data=ITEMS[id],worn=Object.values(p.equipment).includes(id);
      html+='<button class="item-button '+data.rarity+(this.selected===id?' selected':'')+'" data-item="'+id+'" aria-label="'+escapeHTML(data.name)+(worn?', utrustad':'')+', antal '+count+'" aria-pressed="'+(this.selected===id)+'"><span class="item-symbol" aria-hidden="true">'+itemIcon(data.icon)+'</span>'+(worn?'<em>UTR.</em>':'')+'<small>'+count+'</small></button>';
    }
    html+='</div><div class="item-detail">';
    if(item&&p.inventory[this.selected]) {
      html+='<span class="item-rarity '+item.rarity+'">'+RARITIES[item.rarity]+'</span><h3>'+item.name+'</h3><p>'+item.description+'</p><p>'+itemStats(item)+'</p>';
      if(item.slot) {
        const old=ITEMS[p.equipment[item.slot]],delta=(item.attack||0)-(old?.attack||0)+(item.defense||0)-(old?.defense||0);
        if(!equipped)html+='<p>Jämfört med utrustat: '+(delta>=0?'+':'')+delta+' '+(item.slot==='weapon'?'attack':item.slot==='armor'?'försvar':'attack')+'</p>';
        html+='<button class="primary" data-action="equip" data-id="'+this.selected+'" '+(equipped?'disabled':'')+'>'+(equipped?'Utrustad':'Utrusta')+'</button>';
      } else if(this.selected==='potion')html+='<button data-action="potion" '+(p.hp>=st.maxHp||p.cooldowns.potion>0?'disabled':'')+'>Drick läkedryck</button>';
    } else html+='<p>Välj ett föremål ovan.</p>';
    $('panel-content').innerHTML=html+'</div></section></div>';
  }
  questHTML(id,dialogue=false) {
    const s=this.state(),q=QUESTS[id],state=s.quests[id],ready=questReady(s,id);
    const locked=q.requires&&s.quests[q.requires]?.status!=='done';
    let html='<section class="quest-entry"><span class="quest-status">'+(state?.status==='done'?'Avklarat':ready?'Redo att lämnas in':state?'Pågående':locked?'Låst':'Tillgängligt')+'</span><h3>'+q.name+'</h3><p>'+q.text+'</p><ul>';
    q.objectives.forEach((o,i)=>{html+='<li>'+o.label+' · '+(state?.progress[i]||0)+' / '+o.count+'</li>';});
    html+='</ul><p class="quest-rewards">'+rewardsText(q)+'</p>';
    if(dialogue) {
      if(!state&&!locked)html+='<button class="primary" data-action="accept" data-id="'+id+'">Acceptera uppdrag</button>';
      else if(ready)html+='<button class="primary" data-action="complete" data-id="'+id+'">Slutför & hämta belöning</button>';
    } else if(ready)html+='<p>Återvänd till '+NPCS.find(n=>n.id===q.npc).name+' i Lyktdalen.</p>';
    if(locked)html+='<p>Slutför '+QUESTS[q.requires].name+' först.</p>';
    return html+'</section>';
  }
  journal() {
    this.heading('TRE UPPDRAG · ETT FÖRSTA KAPITEL','Uppdragsjournal');
    $('panel-content').innerHTML='<p>Uppdrag accepteras och lämnas in hos byborna. Din resa sparas automatiskt.</p>'+Object.keys(QUESTS).map(id=>this.questHTML(id)).join('');
  }
  dialogue(id) {
    const npc=NPCS.find(n=>n.id===id);if(!npc)return;
    this.view='dialogue';this.npcId=id;this.heading(npc.role.toUpperCase(),npc.name);
    const s=this.state();let html='<p class="dialogue-greeting">“'+npc.greeting+'”</p>';
    if(id==='ivo')html+='<p style="margin-top:16px">Du har '+s.player.gold+' guld och '+(s.player.inventory.amber||0)+' skogsbärnsten.</p><div class="shop-actions"><button class="primary" data-action="buy" '+(s.player.gold<12?'disabled':'')+'>Köp läkedryck · 12 guld</button><button data-action="sell" '+(!s.player.inventory.amber?'disabled':'')+'>Sälj all bärnsten · '+((s.player.inventory.amber||0)*4)+' guld</button></div>';
    else html+=Object.entries(QUESTS).filter(([,q])=>q.npc===id).map(([qid])=>this.questHTML(qid,true)).join('');
    if(id==='mira')html+='<p>Din hälsa är återställd. Välkommen tillbaka när du behöver vila.</p>';
    $('panel-content').innerHTML=html;
    if(!this.panel.open)this.panel.showModal();
    this.actions.pause();
  }
  settings() {
    this.heading('EN STUND VID LYKTAN','Spelet är pausat');
    const settings=this.actions.settings();
    $('panel-content').innerHTML='<div class="settings-grid"><label class="setting" for="volume-control">Ljudvolym<input id="volume-control" type="range" min="0" max="1" step=".05" value="'+settings.volume+'"></label><label class="setting" for="frame-limit">Bildfrekvens<select id="frame-limit"><option value="60" '+(settings.fps===60?'selected':'')+'>60 FPS · Standard</option><option value="30" '+(settings.fps===30?'selected':'')+'>30 FPS · Låg belastning</option></select></label></div><div class="menu-actions"><button class="primary" data-action="save">Spara nu</button><button data-action="export">Exportera sparfil</button><button data-action="fullscreen">Helskärm</button></div><label class="file-label">Importera sparfil<input id="import-save" type="file" accept=".json,application/json"></label><p style="margin-top:16px">Resan sparas lokalt i den här webbläsaren. Exportera en säkerhetskopia för att flytta den till en annan dator.</p><p style="margin-top:12px">'+escapeHTML(settings.diagnostics)+'</p><button class="danger-link" data-action="newGame">Börja en ny resa…</button><p>Stäng med Esc för att fortsätta.</p>';
  }
  help() {
    this.heading('PACKA LÄTT. HÅLL LYKTAN NÄRA.','Kontroller & tips');
    const controls=[['WASD / Pilar','Förflytta dig'],['Space / Klick i världen','Attackera närmaste fienden inom räckhåll'],['Q','Lyktslag: områdesattack, 5 s återhämtning'],['Shift','Undanmanöver, 2,5 s återhämtning'],['R','Läkedryck: +55 hälsa, 8 s återhämtning'],['E','Prata, samla örter, öppna kistor eller tänd fyren'],['I / C','Karaktär, utrustning och väska'],['J','Uppdragsjournal'],['Esc / P','Pausa och öppna menyn']];
    $('panel-content').innerHTML='<p>Prata med Elin vid byns lykta och Mira väster om henne. Ta båda uppdragen innan du går österut.</p><table class="help-table">'+controls.map(([key,description])=>'<tr><td><kbd>'+key+'</kbd></td><td>'+description+'</td></tr>').join('')+'</table><p class="help-tip">Orange markeringar visar fiendens nästa slag. Flytta dig eller använd Shift innan slaget landar. Loot plockas upp när du går nära. Vila vid byns lykta eller prata med Mira för full hälsa.</p><p style="margin-top:14px">Menyer och en inaktiv flik pausar världen. Vid död återvänder du till byn med dina föremål och din XP kvar. Första kapitlet är klart när fyren lyser och Elin har gett dig belöningen.</p>';
  }
  death() {
    this.heading('LYKTAN VISAR VÄGEN HEM','Du föll i strid');
    $('panel-content').innerHTML='<div class="death-message"><h3>Din resa är inte över.</h3><p>Byborna hittar dig och hjälper dig hem. Du behåller din utrustning, XP och uppdragsprogression.</p><button class="primary" data-action="respawn">Återvänd till Lyktdalen →</button></div>';
  }
  toast(text) {
    const toast=document.createElement('div');toast.className='toast';toast.textContent=text;
    const container=$('toasts');container.append(toast);while(container.children.length>3)container.firstChild.remove();
    setTimeout(()=>toast.remove(),4500);
  }
  hud(renderer) {
    const s=this.state(),p=s.player,st=stats(p),zone=zoneAt(p.x,p.y);
    setText('player-name',p.name);setText('player-level','Nivå '+p.level);setText('health-value',Math.ceil(p.hp)+' / '+st.maxHp);
    $('health-fill').style.width=(p.hp/st.maxHp*100).toFixed(1)+'%';$('xp-fill').style.width=(p.xp/xpForLevel(p.level)*100).toFixed(1)+'%';
    setText('gold-value',p.gold+' guld');setText('potion-count',(p.inventory.potion||0)+' drycker');setText('zone-name',zone.name);setText('zone-type',zone.subtitle);
    for(const [type,max] of [['attack',.42],['burst',5],['dodge',2.5],['potion',8]]) {
      const b=document.querySelector('[data-command="'+type+'"]');b.querySelector('.cooldown').style.height=(p.cooldowns[type]/max*100).toFixed(0)+'%';
    }
    const target=nearestInteraction(s),interaction=$('interaction');
    interaction.hidden=!target||p.dead;
    if(target)interaction.querySelector('span').textContent=target.kind==='npc'?'Prata med '+target.name:target.kind==='herb'?'Samla glimört':target.kind==='chest'?'Öppna gömman':target.kind==='beacon'?'Undersök fyren':target.kind==='sign'?'Läs vägvisaren':'Vila vid lyktan';
    let tracker='';
    for(const [id,q] of Object.entries(s.quests))if(q.status==='active') {
      const def=QUESTS[id],ready=questReady(s,id);
      tracker+='<section class="quest-card"><h3>'+def.name+'</h3>'+(ready?'<p class="done">Återvänd till '+NPCS.find(n=>n.id===def.npc).name+' ◆</p>':'<ul>'+def.objectives.map((o,i)=>'<li>'+o.label+' <span'+(q.progress[i]>=o.count?' class="done"':'')+'>'+q.progress[i]+'/'+o.count+'</span></li>').join('')+'</ul>')+'</section>';
    }
    if(!tracker)tracker=s.quests.beacon?.status==='done'?'<section class="quest-card"><h3>Lyktdalens väktare</h3><p class="done">Kapitel 01 avklarat ◆</p><p>Utforska skogen och hitta de tre gömmorna.</p></section>':'<section class="quest-card"><h3>En ny början</h3><p>Prata med Elin vid byns lykta.<br>Mira har också ett uppdrag.</p></section>';
    if(tracker!==this.lastTracker){$('quest-tracker').innerHTML=tracker;this.lastTracker=tracker;}
    setText('field-note',zone.safe?'Här kan du andas ut. Bybornas lykta ger värme, vila och en väg tillbaka.':zone.id==='ruins'?'Väktaren slår hårt, men långsamt. Läs marken. Lämna plats åt rötterna.':'Gå utanför stigen ibland. Skogen gömmer mer än det som jagar dig.');
    renderer.renderMap(s);
  }
}

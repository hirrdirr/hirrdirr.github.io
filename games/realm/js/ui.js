import { ITEMS, QUESTS, NPCS, RARITIES, ENEMIES, xpForLevel } from './data.js';
import { stats, questReady, nearestInteraction } from './simulation.js';
import { zoneAt } from './world.js';
import { TALENTS, availableTalentPoints, spentTalentPoints, talentRank, respecCost } from './talents.js';
import { BAG_SLOTS, occupiedSlots } from './inventory.js';
import { escapeHTML, itemStats, bagButton, compareEquipment, tradePanel, talentPanel } from './ui-panels.js';
export { escapeHTML } from './ui-panels.js';
const $ = id => document.getElementById(id);
const rewardsText = q => q.rewards.xp+' XP · '+q.rewards.gold+' guld · '+Object.entries(q.rewards.items).map(([id,n])=>(n>1?n+' × ':'')+ITEMS[id].name).join(' · ');
function setText(id,value) {const el=$(id);if(el.textContent!==String(value))el.textContent=String(value);}
export class UI {
  constructor(getState,actions) {
    this.state=getState;this.actions=actions;this.panel=$('panel');this.view=null;this.selected='trainingSword';this.lastTracker='';this.lastMap=0;
    this.tradeSelection={side:'stock',id:'potion'};this.selectedTalent='vigor';this.activeTree='guardian';
    document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>this.open(button.dataset.panel)));
    $('close-panel').addEventListener('click',()=>this.close());
    this.panel.addEventListener('close',()=>{this.view=null;actions.resume();$('world').focus({preventScroll:true});});
    this.panel.addEventListener('cancel',e=>{if(this.view==='death')e.preventDefault();});
    $('panel-content').addEventListener('click',event=>{
      const b=event.target.closest('button');if(!b||b.disabled)return;
      const focusKey=Object.entries(b.dataset).find(([key])=>['item','stock','saleItem','buybackItem','talent','tree','action'].includes(key));
      const scroll=this.panel.scrollTop;
      const restore=()=>{this.panel.scrollTop=scroll;if(focusKey)Array.from($('panel-content').querySelectorAll('button')).find(el=>el.dataset[focusKey[0]]===focusKey[1]&&!el.disabled)?.focus({preventScroll:true});};
      if(b.dataset.item){this.selected=b.dataset.item;this.inventory();restore();return;}
      if(b.dataset.talent){this.selectedTalent=b.dataset.talent;this.activeTree=TALENTS[this.selectedTalent].tree;this.talents();restore();return;}
      if(b.dataset.tree){this.activeTree=b.dataset.tree;this.selectedTalent=Object.keys(TALENTS).find(id=>TALENTS[id].tree===this.activeTree);this.talents();restore();return;}
      for(const [key,side] of [['stock','stock'],['saleItem','bag'],['buybackItem','buyback']])if(b.dataset[key]){this.tradeSelection={side,id:b.dataset[key]};this.merchant();restore();return;}
      if(b.dataset.action) {
        const action=b.dataset.action;
        if(action==='talents'){this.open('talents');return;}
        if(['accept','complete','equip','unequip','buy','sell','buyback','respawn','potion','learnTalent','respec'].includes(action)) {
          let confirm=false;
          if(action==='sell'&&ITEMS[b.dataset.id]?.rarity==='rare'){
            confirm=window.confirm('Sälja 1 '+ITEMS[b.dataset.id].name+' för '+ITEMS[b.dataset.id].value+' guld? Föremålet läggs i Ivos återköpslista.');if(!confirm)return;
          }
          if(action==='respec'){
            const p=this.state().player,cost=respecCost(p);
            confirm=window.confirm('Återställa '+spentTalentPoints(p)+' investerade poäng? '+(cost?'Det kostar '+cost+' guld.':'Din första återställning är gratis.'));if(!confirm)return;
          }
          actions.command({type:action,id:b.dataset.id,slot:b.dataset.slot,merchant:'ivo',confirm});
          if(action==='respawn'){this.close();return;}
          if(this.view==='inventory')this.inventory();
          else if(this.view==='dialogue')this.dialogue(this.npcId);
          else if(this.view==='merchant')this.merchant();
          else if(this.view==='talents'){this.talents();if(action==='learnTalent')$('panel-content').querySelector('[data-talent="'+b.dataset.id+'"]').classList.add('just-learned');}
          restore();
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
    if(this.view!==view){this.panel.scrollTop=0;$('panel-feedback').hidden=true;}
    this.view=view;
    if(view==='inventory')this.inventory();
    else if(view==='journal')this.journal();
    else if(view==='settings')this.settings();
    else if(view==='help')this.help();
    else if(view==='talents')this.talents();
    else if(view==='merchant')this.merchant();
    else if(view==='death')this.death();
    if(!this.panel.open)this.panel.showModal();
    this.actions.pause();
  }
  close(){if(this.view==='death')return;this.panel.close();}
  heading(kicker,title){$('panel-kicker').textContent=kicker;$('panel-title').textContent=title;$('close-panel').hidden=this.view==='death';this.panel.classList.toggle('merchant-panel',this.view==='merchant');this.panel.classList.toggle('talents-panel',this.view==='talents');}
  merchant(){this.heading('IVO · HANDLARE I LYKTDALEN','Ivos handelsbod');$('panel-content').innerHTML=tradePanel(this.state(),this.tradeSelection);}
  talents(){this.heading('TRE VÄGAR · EN VANDRARE','Dina talanger');$('panel-content').innerHTML=talentPanel(this.state(),this.selectedTalent,this.activeTree);}
  inventory() {
    const s=this.state(),p=s.player,st=stats(p),item=ITEMS[this.selected],equipped=item?.slot&&p.equipment[item.slot]===this.selected;
    this.heading('LYKTVANDRARE · NIVÅ '+p.level,'Karaktär & väska');
    let html='<div class="inventory-layout"><section class="character-sheet"><h3>'+escapeHTML(p.name)+'</h3><dl class="stat-list">';
    for(const [label,value] of [['Hälsa',Math.ceil(p.hp)+' / '+st.maxHp],['Huggskada',Math.round(st.attack*st.meleeMultiplier)],['Försvar',st.defense],['Kritisk chans',Math.round(st.critChance*100)+'%'],['Hugg / sekund',(1/st.attackCooldown).toFixed(2)],['Lyktslag',Math.round(st.attack*st.burstMultiplier)],['Rörelsefart',Math.round(st.speed/158*100)+'%'],['Undanmanöver',st.dodgeCooldown.toFixed(2)+' s'],['Erfarenhet',p.level===20?'Maxnivå':p.xp+' / '+xpForLevel(p.level)],['Guld',p.gold]])html+='<dt>'+label+'</dt><dd>'+value+'</dd>';
    html+='</dl><div>';
    for(const [slot,label] of [['weapon','Vapen'],['armor','Rustning'],['charm','Amulett']])html+='<div class="gear-slot"><small>'+label+'</small>'+escapeHTML(ITEMS[p.equipment[slot]]?.name||'Ingen utrustad')+(p.equipment[slot]?'<button class="text-button" data-action="unequip" data-slot="'+slot+'" aria-label="Ta av '+ITEMS[p.equipment[slot]].name+'">Ta av</button>':'')+'</div>';
    html+='</div><div class="talent-inventory"><h4>Din väg</h4><p>'+(p.level<3?'Din första talentpoäng väntar på nivå 3.':availableTalentPoints(p)+' lediga · '+spentTalentPoints(p)+' investerade poäng')+'</p><button data-action="talents">Öppna talanger <kbd>N</kbd></button></div></section><section><div class="bag-heading"><h3>Din väska</h3><span>'+occupiedSlots(p)+' / '+BAG_SLOTS+' fack</span></div><p>Välj ett föremål för information. Lika föremål delar fack.</p><div class="inventory-grid">';
    for(const [id,count] of Object.entries(p.inventory))if(count>0)html+=bagButton(p,id,this.selected===id);
    html+='</div><div class="item-detail" aria-live="polite">';
    if(item&&p.inventory[this.selected]) {
      html+='<span class="item-rarity '+item.rarity+'">'+RARITIES[item.rarity]+(item.questItem?' · Bunden till uppdrag':'')+'</span><h3>'+item.name+'</h3><p>'+item.description+'</p><p>'+itemStats(item)+'</p><p>'+(item.questItem?'Kan inte säljas.':'Säljvärde: '+item.value+' guld per exemplar hos Ivo.')+'</p>';
      if(item.slot) {
        html+=compareEquipment(p,this.selected);
        html+='<button class="primary" data-action="'+(equipped?'unequip':'equip')+'" data-slot="'+item.slot+'" data-id="'+this.selected+'">'+(equipped?'Ta av':'Utrusta')+'</button>';
      } else if(this.selected==='potion')html+='<button data-action="potion" '+(p.hp>=st.maxHp||p.cooldowns.potion>0?'disabled':'')+'>Drick läkedryck · +'+st.potionHealing+' hälsa</button>';
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
    } else if(ready)html+='<p>Återvänd till '+NPCS.find(n=>n.id===q.npc).name+(q.npc==='signe'?' i Vandrarlägret.':' i Lyktdalen.')+'</p>';
    if(locked)html+='<p>Slutför '+QUESTS[q.requires].name+' först.</p>';
    return html+'</section>';
  }
  journal() {
    this.heading('FEM UPPDRAG · TVÅ KAPITEL','Uppdragsjournal');
    $('panel-content').innerHTML='<p>Uppdrag accepteras och lämnas in hos Elin, Mira och Signe. Din resa sparas automatiskt.</p>'+Object.keys(QUESTS).map(id=>this.questHTML(id)).join('');
  }
  dialogue(id) {
    const npc=NPCS.find(n=>n.id===id);if(!npc)return;
    this.view='dialogue';this.npcId=id;this.heading(npc.role.toUpperCase(),npc.name);
    const s=this.state(),greeting=id==='signe'&&!s.flags.beaconLit?'Fyren i norr har tystnat. Hjälp Elin att väcka den, så kan vi följa ljuset söderut tillsammans.':id==='signe'&&s.flags.sealRestored?'Myren andas igen. Du har gett oss tid att förstå vad som väntar bortom slussen.':npc.greeting;let html='<p class="dialogue-greeting">“'+greeting+'”</p>';
    if(id==='ivo'){this.open('merchant');return;}
    html+=Object.entries(QUESTS).filter(([,q])=>q.npc===id).map(([qid])=>this.questHTML(qid,true)).join('');
    if(id==='mira')html+='<p>Din hälsa är återställd. Jag kan också hjälpa dig att välja en ny väg. Första återställningen av dina talanger är gratis, därefter 10 guld.</p><button class="primary" data-action="talents">Studera & återställ talanger</button>';
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
    const controls=[['WASD / Pilar','Förflytta dig'],['Space / Klick','Hugg inom räckhåll. Håll Space för en kedja: tredje träffen ger +35% skada.'],['Tab / Klick på fiende','Välj mål. Space prioriterar det valda målet inom räckhåll.'],['Q','Lyktslag: områdesattack som avbryter vanliga fienders attacker, 5 s återhämtning'],['Shift','Undanmanöver, 2,5 s återhämtning'],['R','Läkedryck: +55 hälsa, 8 s återhämtning'],['E','Prata, läs runor, samla, öppna kistor och aktivera lyktor'],['I / C','Karaktär, utrustning och väska'],['N','Talangträd: en poäng per nivå från nivå 3'],['1 / 2 / 3','Lyktvärn / Skuggsprång / Glimtskott, när talangen har lärts'],['J','Uppdragsjournal'],['Esc / P','Pausa och öppna menyn']];
    $('panel-content').innerHTML='<p>Prata med Elin vid byns lykta och Mira väster om henne. Ta båda uppdragen innan du går österut.</p><table class="help-table">'+controls.map(([key,description])=>'<tr><td><kbd>'+key+'</kbd></td><td>'+description+'</td></tr>').join('')+'</table><p class="help-tip">Orange markeringar visar fiendens nästa slag. Flytta dig eller använd Shift innan slaget landar. Loot plockas upp när du går nära. Vila vid en lykta för full hälsa och en ny återkomstplats. Extra exemplar av utrustning sparas i väskan. Hos Ivo väljer du ett föremål i taget att sälja, köpa eller återköpa. Utrustning måste tas av innan den säljs. Väskan rymmer 16 olika föremål; lika fynd staplas.</p><p style="margin-top:14px">Menyer och en inaktiv flik pausar världen. Vid död återvänder du till din senaste lykta med föremål och XP kvar. Öppna talanger med N från nivå 3. Kombinera grenarna och besök Mira om du vill återställa poängen. Efter fyren väntar Signe i lägret öster om bron: följ hennes runor in i Glödmyren.</p>';
  }
  death() {
    this.heading('LYKTAN VISAR VÄGEN HEM','Du föll i strid');
    $('panel-content').innerHTML='<div class="death-message"><h3>Din resa är inte över.</h3><p>Lyktans ljus leder dig tillbaka till din senaste viloplats. Du behåller din utrustning, XP och uppdragsprogression.</p><button class="primary" data-action="respawn">Återvänd till '+(this.state().player.checkpoint==='camp'?'Vandrarlägret':'Lyktdalen')+' →</button></div>';
  }
  toast(text) {
    if(this.panel.open){$('panel-feedback').textContent=text;$('panel-feedback').hidden=false;}
    const toast=document.createElement('div');toast.className='toast';toast.textContent=text;
    const container=$('toasts');container.append(toast);while(container.children.length>3)container.firstChild.remove();
    setTimeout(()=>toast.remove(),4500);
  }
  hud(renderer) {
    const s=this.state(),p=s.player,st=stats(p),zone=zoneAt(p.x,p.y);
    setText('player-name',p.name);setText('player-level','Nivå '+p.level);setText('health-value',Math.ceil(p.hp)+' / '+st.maxHp);
    $('health-fill').style.width=(p.hp/st.maxHp*100).toFixed(1)+'%';$('xp-fill').style.width=(p.xp/xpForLevel(p.level)*100).toFixed(1)+'%';
    setText('gold-value',p.gold+' guld');setText('potion-count',(p.inventory.potion||0)+' drycker');setText('zone-name',zone.name);setText('zone-type',zone.subtitle);
    for(const [type,max] of [['attack',st.attackCooldown],['burst',st.burstCooldown],['dodge',st.dodgeCooldown],['potion',8],['guard',st.guardCooldown],['rush',st.rushCooldown],['bolt',st.boltCooldown]]) {
      const b=document.querySelector('[data-command="'+type+'"]');if(['guard','rush','bolt'].includes(type))b.hidden=!talentRank(p,type);b.querySelector('.cooldown').style.height=(Math.min(1,p.cooldowns[type]/max)*100).toFixed(0)+'%';
    }
    $('buff-status').hidden=p.guardTime<=0&&p.counterTime<=0;setText('buff-status',p.counterTime>0?'Återsken redo · '+p.counterTime.toFixed(1)+' s':'Lyktvärn · '+p.guardTime.toFixed(1)+' s');
    document.querySelector('[data-command="potion"]').title='Återställer '+st.potionHealing+' hälsa';
    const enemy=s.enemies.find(e=>e.id===s.targetId&&e.hp>0),targetHUD=$('target-hud');
    targetHUD.hidden=!enemy;
    if(enemy){
      const def=ENEMIES[enemy.type];setText('target-name',def.name);setText('target-hp',Math.ceil(enemy.hp)+' / '+def.hp+' · nivå '+def.level);
      $('target-fill').style.width=(enemy.hp/def.hp*100).toFixed(1)+'%';
      setText('target-intent',enemy.mode==='return'?'Återvänder · osårbar':enemy.mode==='windup'?({pounce:'Språng! Flytta åt sidan',ranged:'Skott! Bryt siktlinjen',eruption:'Glödutbrott! Lämna markeringen'}[def.behavior]||'Slag! Lämna markeringen'):({pounce:'Språngjägare',ranged:'Distansfiende',eruption:'Glödväktare'}[def.behavior]||'Närstrid'));
    }
    setText('combo-count',p.combo?('◆'.repeat(p.combo)+'◇'.repeat(3-p.combo)):'◇◇◇');
    const target=nearestInteraction(s),interaction=$('interaction');
    interaction.hidden=!target||p.dead;
    $('combo-hud').hidden=p.combo===0||Boolean(target)||p.dead;
    if(target)interaction.querySelector('span').textContent=target.kind==='npc'?'Prata med '+target.name:target.kind==='herb'?'Samla glimört':target.kind==='chest'?'Öppna gömman':target.kind==='beacon'?'Undersök fyren':target.kind==='sign'?'Läs vägvisaren':target.kind==='rune'?'Läs runstenen':target.kind==='seal'?'Undersök sigillet':target.kind==='gate'?'Undersök slussen':'Vila & sätt återkomstplats';
    let tracker='';
    for(const [id,q] of Object.entries(s.quests))if(q.status==='active') {
      const def=QUESTS[id],ready=questReady(s,id);
      tracker+='<section class="quest-card"><h3>'+def.name+'</h3>'+(ready?'<p class="done">Återvänd till '+NPCS.find(n=>n.id===def.npc).name+' ◆</p>':'<ul>'+def.objectives.map((o,i)=>'<li>'+o.label+' <span'+(q.progress[i]>=o.count?' class="done"':'')+'>'+q.progress[i]+'/'+o.count+'</span></li>').join('')+'</ul>')+'</section>';
    }
    if(!tracker) {
      if(s.quests.heart?.status==='done')tracker='<section class="quest-card"><h3>Glöden har stillnat</h3><p class="done">Kapitel 02 avklarat ◆</p><p>Hitta världens fyra gömmor och prova nya utrustningsval.</p></section>';
      else if(s.quests.beacon?.status==='done')tracker='<section class="quest-card"><h3>En röst från myren</h3><p>Signe väntar i Vandrarlägret, strax öster om bron. Följ vägen söderut från skogsstigen.</p></section>';
      else tracker='<section class="quest-card"><h3>En ny början</h3><p>Prata med Elin vid byns lykta.<br>Mira har också ett uppdrag.</p></section>';
    }
    if(availableTalentPoints(p))tracker+='<section class="quest-card"><h3>'+availableTalentPoints(p)+' lediga talentpoäng</h3><p>Öppna Talanger (N) och utveckla din vandrare.</p></section>';
    if(tracker!==this.lastTracker){$('quest-tracker').innerHTML=tracker;this.lastTracker=tracker;}
    setText('field-note',zone.id==='marsh'?'Glödvingarnas skott färdas rakt. Rör dig åt sidan, använd träden och följ runornas ljus.':zone.id==='camp'?'Vila vid lyktan med E. Här återvänder du om du faller. Mira i byn hjälper dig med dina talanger.':zone.safe?'Här kan du andas ut. Bybornas lykta ger värme, vila och en väg tillbaka.':zone.id==='ruins'?'Väktaren slår hårt, men långsamt. Läs marken. Lämna plats åt rötterna.':'Gå utanför stigen ibland. Skogen gömmer mer än det som jagar dig.');
    renderer.renderMap(s);
  }
}

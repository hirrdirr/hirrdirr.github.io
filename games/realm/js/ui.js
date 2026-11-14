import { tr } from './i18n.js';
import { ITEMS, QUESTS, NPCS, RARITIES, ENEMIES, xpForLevel } from './data.js';
import { stats, questReady, nearestInteraction } from './simulation.js';
import { zoneAt } from './world.js';
import { TALENTS, availableTalentPoints, spentTalentPoints, talentRank, respecCost } from './talents.js';
import { BAG_SLOTS, occupiedSlots } from './inventory.js';
import { escapeHTML, itemStats, bagButton, compareEquipment, tradePanel, talentPanel } from './ui-panels.js';
export { escapeHTML } from './ui-panels.js';
const $ = id => document.getElementById(id);
const rewardsText = q => tr("ui.xp_gold", q.rewards.xp, q.rewards.gold, Object.entries(q.rewards.items).map(([id,n])=>(n>1?n+' × ':'')+ITEMS[id].name).join(' · '));
function setText(id,value) {const el=$(id);if(el.textContent!==String(value))el.textContent=String(value);}
export class UI {
  constructor(getState,actions) {
    this.state=getState;this.actions=actions;this.panel=$('panel');this.view=null;this.selected='trainingSword';this.lastTracker='';this.lastMap=0;
    this.tradeSelection={side:'stock',id:'potion'};this.selectedTalent='vigor';this.activeTree='guardian';this.pendingSale=null;this.confirmDialog=$('realm-confirm');
    document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>this.open(button.dataset.panel)));
    $('close-panel').addEventListener('click',()=>this.close());
    this.panel.addEventListener('close',()=>{this.view=null;actions.resume();$('world').focus({preventScroll:true});});
    this.panel.addEventListener('cancel',e=>{if(this.view==='death')e.preventDefault();});
    $('realm-confirm-cancel').addEventListener('click',()=>this.confirmDialog.close());
    $('realm-confirm-accept').addEventListener('click',()=>{
      const sale=this.pendingSale;
      this.confirmDialog.close();
      if(!sale)return;
      // The transaction layer revalidates inventory, merchant proximity and currency.
      this.actions.command({type:'sell',id:sale,merchant:'ivo',confirm:true});
      if(this.view==='merchant')this.merchant();
    });
    this.confirmDialog.addEventListener('close',()=>{this.pendingSale=null;});
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
            this.confirmRareSale(b.dataset.id);return;
          }
          if(action==='respec'){
            const p=this.state().player,cost=respecCost(p);
            confirm=window.confirm(tr("ui.reset_spent_points", spentTalentPoints(p), cost?tr("ui.this_costs_gold", cost):tr("ui.your_first_respecialization_is_free")));if(!confirm)return;
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
  get isOpen(){return this.panel.open||$('welcome').open||this.confirmDialog.open;}
  get allowsSimulation(){return this.panel.open&&this.view==='talents'&&!this.confirmDialog.open;}
  confirmRareSale(id){
    const item=ITEMS[id];
    if(this.view!=='merchant'||!item||item.rarity!=='rare')return;
    this.pendingSale=id;
    $('realm-confirm-title').textContent=tr("ui.sell_a_rare_item");
    $('realm-confirm-description').textContent=tr("ui.sell_for_gold_you_can_buy_it_back_from_ivo_while_it_remains_among", item.name, item.value);
    this.confirmDialog.showModal();
  }
  refreshTalentCombat(){
    if(!this.allowsSimulation)return;
    const p=this.state().player,blocked=p.combat>0,notice=$('talent-combat-notice');
    if(!notice)return;
    // Refresh the action state only when combat ends, preserving selection otherwise.
    if(this.talentCombatBlocked!==blocked){
      this.talentCombatBlocked=blocked;
      const focused=document.activeElement?.dataset?.action==='learnTalent';
      this.talents();
      if(focused)$('panel-content').querySelector('[data-action="learnTalent"]')?.focus({preventScroll:true});
    }else if(blocked){
      const countdown=$('talent-combat-seconds');if(countdown)countdown.textContent=Math.ceil(p.combat);
    }
  }
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
    if(view==='talents')this.actions.resume();else this.actions.pause();
  }
  close(){if(this.view==='death')return;this.panel.close();}
  heading(kicker,title){$('panel-kicker').textContent=kicker;$('panel-title').textContent=title;$('close-panel').hidden=this.view==='death';this.panel.classList.toggle('merchant-panel',this.view==='merchant');this.panel.classList.toggle('talents-panel',this.view==='talents');}
  merchant(){this.heading(tr("ui.ivo_lantern_vale_merchant"),tr("trading.ivos_trading_post"));$('panel-content').innerHTML=tradePanel(this.state(),this.tradeSelection);}
  talents(){this.heading(tr("ui.three_paths_one_wanderer"),tr("ui.your_talents"));$('panel-content').innerHTML=talentPanel(this.state(),this.selectedTalent,this.activeTree);this.talentCombatBlocked=this.state().player.combat>0;}
  inventory() {
    const s=this.state(),p=s.player,st=stats(p),item=ITEMS[this.selected],equipped=item?.slot&&p.equipment[item.slot]===this.selected;
    this.heading(tr("ui.lantern_wanderer_level", p.level),tr("ui.character_bag"));
    let html='<div class="inventory-layout"><section class="character-sheet"><h3>'+escapeHTML(p.name)+'</h3><dl class="stat-list">';
    for(const [label,value] of [[tr("ui.health"),Math.ceil(p.hp)+' / '+st.maxHp],[tr("ui-panels.strike_damage"),Math.round(st.attack*st.meleeMultiplier)],[tr("ui-panels.defense_2"),st.defense],[tr("ui.critical_chance"),Math.round(st.critChance*100)+'%'],[tr("ui-panels.strikes_second"),(1/st.attackCooldown).toFixed(2)],[tr("ui-panels.lantern_burst"),Math.round(st.attack*st.burstMultiplier)],[tr("ui-panels.movement_speed_2"),Math.round(st.speed/158*100)+'%'],[tr("ui-panels.dodge"),st.dodgeCooldown.toFixed(2)+' s'],[tr("ui.experience"),p.level===20?tr("ui.max_level"):p.xp+' / '+xpForLevel(p.level)],[tr("ui.gold"),p.gold]])html+='<dt>'+label+'</dt><dd>'+value+'</dd>';
    html+='</dl><div>';
    for(const [slot,label] of [['weapon',tr("ui.weapon")],['armor',tr("ui.armor")],['charm',tr("ui.charm")]])html+=`<div class="gear-slot"><small>${label}</small>${escapeHTML(ITEMS[p.equipment[slot]]?.name||tr("ui.nothing_equipped"))}${p.equipment[slot]?`<button class="text-button" data-action="unequip" data-slot="${slot}" aria-label="${tr("ui-panels.unequip", ITEMS[p.equipment[slot]].name)}">${tr("ui.unequip")}</button>`:''}</div>`;
    html+=`</div><div class="talent-inventory"><h4>${tr("ui.your_path")}</h4><p>${p.level<3?tr("ui.your_first_talent_point_awaits_at_level_3"):tr("ui.unspent_points_spent", availableTalentPoints(p), spentTalentPoints(p))}</p><button data-action="talents">${tr("ui.open_talents")}<kbd>${tr("ui.n")}</kbd></button></div></section><section><div class="bag-heading"><h3>${tr("ui-panels.your_bag")}</h3><span>${tr("ui-panels.slots", occupiedSlots(p), BAG_SLOTS)}</span></div><p>${tr("ui.select_an_item_for_details_identical_items_share_a_slot")}</p><div class="inventory-grid">`;
    for(const [id,count] of Object.entries(p.inventory))if(count>0)html+=bagButton(p,id,this.selected===id);
    html+='</div><div class="item-detail" aria-live="polite">';
    if(item&&p.inventory[this.selected]) {
      html+=`<span class="item-rarity ${item.rarity}">${RARITIES[item.rarity]}${item.questItem?tr("ui-panels.quest_bound"):''}</span><h3>${item.name}</h3><p>${item.description}</p><p>${itemStats(item)}</p><p>${item.questItem?tr("ui.cannot_be_sold"):tr("ui.sell_value_gold_each_at_ivos_shop", item.value)}</p>`;
      if(item.slot) {
        html+=compareEquipment(p,this.selected);
        html+=`<button class="primary" data-action="${equipped?'unequip':'equip'}" data-slot="${item.slot}" data-id="${this.selected}">${equipped?tr("ui.unequip"):tr("ui.equip")}</button>`;
      } else if(this.selected==='potion')html+=`<button data-action="potion" ${p.hp>=st.maxHp||p.cooldowns.potion>0?'disabled':''}>${tr("ui.drink_healing_potion_health", st.potionHealing)}</button>`;
    } else html+=`<p>${tr("ui.select_an_item_above")}</p>`;
    $('panel-content').innerHTML=html+'</div></section></div>';
  }
  questHTML(id,dialogue=false) {
    const s=this.state(),q=QUESTS[id],state=s.quests[id],ready=questReady(s,id);
    const locked=q.requires&&s.quests[q.requires]?.status!=='done';
    let html=`<section class="quest-entry"><span class="quest-status">${state?.status==='done'?tr("ui.completed"):ready?tr("ui.ready_to_turn_in"):state?tr("ui.in_progress"):locked?tr("ui.locked"):tr("ui.available")}</span><h3>${q.name}</h3><p>${q.text}</p><ul>`;
    q.objectives.forEach((o,i)=>{html+='<li>'+o.label+' · '+(state?.progress[i]||0)+' / '+o.count+'</li>';});
    html+='</ul><p class="quest-rewards">'+rewardsText(q)+'</p>';
    if(dialogue) {
      if(!state&&!locked)html+=`<button class="primary" data-action="accept" data-id="${id}">${tr("ui.accept_quest")}</button>`;
      else if(ready)html+=`<button class="primary" data-action="complete" data-id="${id}">${tr("ui.complete_claim_reward")}</button>`;
    } else if(ready)html+=`<p>${tr("ui.return_to", NPCS.find(n=>n.id===q.npc).name, q.npc==='signe'?tr("ui.at_wanderers_camp"):tr("ui.in_lantern_vale"))}</p>`;
    if(locked)html+=`<p>${tr("ui.complete_first", QUESTS[q.requires].name)}</p>`;
    return html+'</section>';
  }
  journal() {
    this.heading(tr("ui.five_quests_two_chapters"),tr("ui.quest_journal"));
    $('panel-content').innerHTML=`<p>${tr("ui.accept_and_turn_in_quests_with_elin_mira_and_signe_your_journey_s")}</p>${Object.keys(QUESTS).map(id=>this.questHTML(id)).join('')}`;
  }
  dialogue(id) {
    const npc=NPCS.find(n=>n.id===id);if(!npc)return;
    if(this.view!=='dialogue'||this.npcId!==id)$('panel-feedback').hidden=true;
    this.view='dialogue';this.npcId=id;this.heading(npc.role.toUpperCase(),npc.name);
    const s=this.state(),greeting=id==='signe'&&!s.flags.beaconLit?tr("ui.the_beacon_to_the_north_has_gone_dark_help_elin_rekindle_it_and_w"):id==='signe'&&s.flags.sealRestored?tr("ui.the_fen_breathes_again_you_have_given_us_time_to_discover_what_li"):npc.greeting;let html='<p class="dialogue-greeting">“'+greeting+'”</p>';
    if(id==='ivo'){this.open('merchant');return;}
    html+=Object.entries(QUESTS).filter(([,q])=>q.npc===id).map(([qid])=>this.questHTML(qid,true)).join('');
    if(id==='mira')html+=`<p>${tr("ui.your_health_is_restored_i_can_also_help_you_choose_a_new_path_you")}</p><button class="primary" data-action="talents">${tr("ui.study_reset_talents")}</button>`;
    $('panel-content').innerHTML=html;
    if(!this.panel.open)this.panel.showModal();
    this.actions.pause();
  }
  settings() {
    this.heading(tr("ui.a_moment_by_the_lantern"),tr("ui.game_paused"));
    const settings=this.actions.settings();
    $('panel-content').innerHTML=`<div class="settings-grid"><label class="setting" for="volume-control">${tr("ui.sound_volume")}<input id="volume-control" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label><label class="setting" for="frame-limit">${tr("ui.frame_rate")}<select id="frame-limit"><option value="60" ${settings.fps===60?'selected':''}>${tr("ui.60_fps_standard")}</option><option value="30" ${settings.fps===30?'selected':''}>${tr("ui.30_fps_low_power")}</option></select></label></div><div class="menu-actions"><button class="primary" data-action="save">${tr("ui.save_now")}</button><button data-action="export">${tr("ui.export_save")}</button><button data-action="fullscreen">${tr("ui.fullscreen")}</button></div><label class="file-label">${tr("ui.import_save")}<input id="import-save" type="file" accept=".json,application/json"></label><p style="margin-top:16px">${tr("ui.your_journey_is_saved_locally_in_this_browser_export_a_backup_to")}</p><p style="margin-top:12px">${escapeHTML(settings.diagnostics)}</p><button class="danger-link" data-action="newGame">${tr("ui.start_a_new_journey")}</button><p>${tr("ui.press_esc_to_close_and_continue")}</p>`;
  }
  help() {
    this.heading(tr("ui.travel_light_keep_your_lantern_close"),tr("ui.controls_tips"));
    const controls=[[tr("ui.wasd_arrow_keys"),tr("ui.move")],[tr("ui.space_click"),tr("ui.strike_within_reach_hold_space_to_chain_attacks_the_third_hit_dea")],[tr("ui.tab_click_an_enemy"),tr("ui.select_a_target_space_prioritizes_your_selected_target_when_in_ra")],['Q',tr("ui.lantern_burst_area_attack_that_interrupts_normal_enemies_5_s_cool")],['Shift',tr("ui.dodge_2_5_s_cooldown")],['R',tr("ui.healing_potion_55_health_8_s_cooldown")],['E',tr("ui.talk_read_runes_gather_open_caches_and_activate_lanterns")],['I / C',tr("ui.character_equipment_and_bag")],['N',tr("ui.talent_trees_one_point_per_level_from_level_3")],['1 / 2 / 3',tr("ui.lantern_ward_shadow_rush_glimmerbolt_once_learned")],['J',tr("ui.quest_journal")],['Esc / P',tr("ui.pause_and_open_the_menu")]];
    $('panel-content').innerHTML=`<p>${tr("ui.talk_to_elin_by_the_village_lantern_and_mira_to_her_west_accept_b")}</p><table class="help-table">${controls.map(([key,description])=>'<tr><td><kbd>'+key+'</kbd></td><td>'+description+'</td></tr>').join('')}</table><p class="help-tip">${tr("ui.orange_markers_warn_of_the_next_enemy_attack_move_or_press_shift")}</p><p style="margin-top:14px">${tr("ui.most_menus_and_an_inactive_tab_pause_the_world_the_talent_panel_k")}</p>`;
  }
  death() {
    this.heading(tr("ui.the_lantern_guides_you_home"),tr("ui.you_fell_in_battle"));
    $('panel-content').innerHTML=`<div class="death-message"><h3>${tr("ui.your_journey_is_not_over")}</h3><p>${tr("ui.the_lanterns_light_guides_you_back_to_your_last_resting_place_you")}</p><button class="primary" data-action="respawn">${tr("ui.return_to_2", this.state().player.checkpoint==='camp'?tr("world.wanderers_camp"):tr("world.lantern_vale"))}</button></div>`;
  }
  toast(text) {
    if(this.panel.open){$('panel-feedback').textContent=text;$('panel-feedback').hidden=false;}
    const toast=document.createElement('div');toast.className='toast';toast.textContent=text;
    const container=$('toasts');container.append(toast);while(container.children.length>3)container.firstChild.remove();
    setTimeout(()=>toast.remove(),4500);
  }
  hud(renderer) {
    const s=this.state(),p=s.player,st=stats(p),zone=zoneAt(p.x,p.y);
    setText('player-name',p.name);setText('player-level',tr("simulation.level", p.level));setText('health-value',Math.ceil(p.hp)+' / '+st.maxHp);
    $('health-fill').style.width=(p.hp/st.maxHp*100).toFixed(1)+'%';$('xp-fill').style.width=(p.xp/xpForLevel(p.level)*100).toFixed(1)+'%';
    setText('gold-value',tr("ui-panels.gold_3", p.gold));setText('potion-count',tr("ui.potions", p.inventory.potion||0));setText('zone-name',zone.name);setText('zone-type',zone.subtitle);
    for(const [type,max] of [['attack',st.attackCooldown],['burst',st.burstCooldown],['dodge',st.dodgeCooldown],['potion',8],['guard',st.guardCooldown],['rush',st.rushCooldown],['bolt',st.boltCooldown]]) {
      const b=document.querySelector('[data-command="'+type+'"]');if(['guard','rush','bolt'].includes(type))b.hidden=!talentRank(p,type);b.querySelector('.cooldown').style.height=(Math.min(1,p.cooldowns[type]/max)*100).toFixed(0)+'%';
    }
    $('buff-status').hidden=p.guardTime<=0&&p.counterTime<=0;setText('buff-status',p.counterTime>0?tr("ui.afterglow_ready_s", p.counterTime.toFixed(1)):tr("ui.lantern_ward_s", p.guardTime.toFixed(1)));
    document.querySelector('[data-command="potion"]').title=tr("ui.restores_health", st.potionHealing);
    const enemy=s.enemies.find(e=>e.id===s.targetId&&e.hp>0),targetHUD=$('target-hud');
    targetHUD.hidden=!enemy;
    if(enemy){
      const def=ENEMIES[enemy.type];setText('target-name',def.name);setText('target-hp',tr("ui.level", Math.ceil(enemy.hp), def.hp, def.level));
      $('target-fill').style.width=(enemy.hp/def.hp*100).toFixed(1)+'%';
      setText('target-intent',enemy.mode==='return'?tr("ui.returning_invulnerable"):enemy.mode==='windup'?({pounce:tr("ui.pounce_move_aside"),ranged:tr("ui.shot_break_line_of_sight"),eruption:tr("ui.eruption_leave_the_marker")}[def.behavior]||tr("ui.strike_leave_the_marker")):({pounce:tr("ui.pouncing_hunter"),ranged:tr("ui.ranged_enemy"),eruption:tr("ui.ember_guardian")}[def.behavior]||tr("ui.melee")));
    }
    setText('combo-count',p.combo?('◆'.repeat(p.combo)+'◇'.repeat(3-p.combo)):'◇◇◇');
    const target=nearestInteraction(s),interaction=$('interaction');
    interaction.hidden=!target||p.dead;
    $('combo-hud').hidden=p.combo===0||Boolean(target)||p.dead;
    if(target)interaction.querySelector('span').textContent=target.kind==='npc'?tr("ui.talk_to", target.name):target.kind==='herb'?tr("data.gather_glimmerherbs"):target.kind==='chest'?tr("ui.open_cache"):target.kind==='beacon'?tr("ui.inspect_beacon"):target.kind==='sign'?tr("ui.read_signpost"):target.kind==='rune'?tr("ui.read_runestone"):target.kind==='seal'?tr("ui.inspect_seal"):target.kind==='gate'?tr("ui.inspect_sluice"):tr("ui.rest_set_checkpoint");
    let tracker='';
    for(const [id,q] of Object.entries(s.quests))if(q.status==='active') {
      const def=QUESTS[id],ready=questReady(s,id);
      tracker+=`<section class="quest-card"><h3>${def.name}</h3>${ready?`<p class="done">${tr("ui.return_to_3", NPCS.find(n=>n.id===def.npc).name)}</p>`:'<ul>'+def.objectives.map((o,i)=>'<li>'+o.label+' <span'+(q.progress[i]>=o.count?' class="done"':'')+'>'+q.progress[i]+'/'+o.count+'</span></li>').join('')+'</ul>'}</section>`;
    }
    if(!tracker) {
      if(s.quests.heart?.status==='done')tracker=`<section class="quest-card"><h3>${tr("ui.the_embers_are_quiet")}</h3><p class="done">${tr("ui.chapter_02_complete")}</p><p>${tr("ui.find_the_worlds_four_caches_and_try_different_equipment")}</p></section>`;
      else if(s.quests.beacon?.status==='done')tracker=`<section class="quest-card"><h3>${tr("ui.a_voice_from_the_fen")}</h3><p>${tr("ui.signe_awaits_at_wanderers_camp_just_east_of_the_bridge_follow_the")}</p></section>`;
      else tracker=`<section class="quest-card"><h3>${tr("ui.a_new_beginning")}</h3><p>${tr("ui.talk_to_elin_by_the_village_lantern")}<br>${tr("ui.mira_also_has_a_quest")}</p></section>`;
    }
    if(availableTalentPoints(p))tracker+=`<section class="quest-card"><h3>${tr("ui.unspent_talent_points", availableTalentPoints(p))}</h3><p>${tr("ui.open_talents_n_to_develop_your_wanderer")}</p></section>`;
    if(tracker!==this.lastTracker){$('quest-tracker').innerHTML=tracker;this.lastTracker=tracker;}
    setText('field-note',zone.id==='marsh'?tr("ui.emberwing_shots_travel_in_a_straight_line_sidestep_use_the_trees"):zone.id==='camp'?tr("ui.rest_at_the_lantern_with_e_you_will_return_here_if_you_fall_mira"):zone.safe?tr("ui.take_a_breath_the_village_lantern_offers_warmth_rest_and_a_way_ho"):zone.id==='ruins'?tr("ui.the_warden_hits_hard_but_slowly_watch_the_ground_give_the_roots_r"):tr("ui.stray_from_the_path_now_and_then_the_forest_hides_more_than_the_c"));
    renderer.renderMap(s);
  }
}

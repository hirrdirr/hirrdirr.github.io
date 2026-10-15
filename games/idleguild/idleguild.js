(() => {
  const SAVE_KEY = 'idleGuildSaveV2';

  const quests = [
    { id:'rats', name:'Rats in the Cellar', enemy:'Giant Rat', icon:'🐀', enemyHp:72, enemyDamage:7, enemyDefense:1, enemyAttackMs:1400, gold:35, xp:15, power:28 },
    { id:'chickens', name:'Missing Chickens', enemy:'Wild Fox', icon:'🦊', enemyHp:100, enemyDamage:10, enemyDefense:2, enemyAttackMs:1200, gold:48, xp:22, power:40 },
    { id:'scouts', name:'Goblin Scouts', enemy:'Goblin Scout', icon:'👺', enemyHp:150, enemyDamage:13, enemyDefense:3, enemyAttackMs:1100, gold:72, xp:34, power:58 },
    { id:'bandits', name:'Bandit Trouble', enemy:'Bandit Raider', icon:'🥷', enemyHp:220, enemyDamage:18, enemyDefense:5, enemyAttackMs:1050, gold:105, xp:50, power:82 },
    { id:'captain', name:'Goblin Captain', enemy:'Goblin Captain', icon:'👹', enemyHp:360, enemyDamage:25, enemyDefense:7, enemyAttackMs:950, gold:180, xp:90, power:118, boss:true }
  ];

  const upgrades = [
    { id:'blade', name:'Blade Mastery', icon:'⚔️', description:'+4 Damage per rank', baseCost:60, scale:1.52 },
    { id:'vitality', name:'Vitality', icon:'❤️', description:'+18 Max HP per rank', baseCost:55, scale:1.50 },
    { id:'armor', name:'Armor Training', icon:'🛡️', description:'+2 Defense per rank', baseCost:65, scale:1.55 },
    { id:'instinct', name:'Battle Instinct', icon:'✨', description:'+2% Critical chance per rank', baseCost:90, scale:1.62, maxRank:10 }
  ];

  const freshState = () => ({
    gold:100,
    level:1,
    xp:0,
    cleared:[],
    upgrades:{ blade:0, vitality:0, armor:0, instinct:0 },
    activeQuest:null,
    combat:null,
    lastSavedAt:Date.now()
  });

  let state = loadState();
  let tickHandle = null;
  let saveHandle = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    gold:$('goldValue'), level:$('heroLevel'), xp:$('xpValue'), xpNext:$('xpNext'), xpBar:$('xpBar'),
    hp:$('statHp'), damage:$('statDamage'), defense:$('statDefense'), power:$('statPower'), areaProgress:$('areaProgress'),
    questList:$('questList'), upgradeList:$('upgradeList'), activeName:$('activeQuestName'), activeStatus:$('activeQuestStatus'),
    idle:$('idleState'), active:$('activeState'), enemy:$('enemyName'), heroHpText:$('heroHpText'), enemyHpText:$('enemyHpText'),
    heroHpBar:$('heroHpBar'), enemyHpBar:$('enemyHpBar'), heroSprite:$('heroSprite'), enemySprite:$('enemySprite'),
    heroCombatant:$('heroCombatant'), enemyCombatant:$('enemyCombatant'), combatRound:$('combatRound'), combatEstimate:$('combatEstimate'),
    combatLog:$('combatLog'), result:$('resultBox'), reset:$('resetSave')
  };

  function xpNeeded(level){ return 100 + ((level - 1) * 45); }

  function stats(){
    const l = state.level;
    const u = state.upgrades || freshState().upgrades;
    const hp = 120 + (l-1)*18 + u.vitality*18;
    const damage = 14 + (l-1)*4 + u.blade*4;
    const defense = 6 + (l-1)*2 + u.armor*2;
    const crit = .05 + u.instinct*.02;
    const power = Math.round(hp*.18 + damage*2.3 + defense*2.6 + crit*80);
    return { hp, damage, defense, crit, power, attackMs:950 };
  }

  function upgradeCost(upgrade){
    const rank = state.upgrades[upgrade.id] || 0;
    return Math.round(upgrade.baseCost * Math.pow(upgrade.scale, rank));
  }

  function threatLabel(q){
    const ratio = stats().power / q.power;
    if (ratio >= 1.35) return 'Easy';
    if (ratio >= 1.05) return 'Favored';
    if (ratio >= .82) return 'Risky';
    return 'Deadly';
  }

  function isUnlocked(index){ return index === 0 || state.cleared.includes(quests[index-1].id); }

  function loadState(){
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('idleGuildSaveV1');
      if (!raw) return freshState();
      const parsed = JSON.parse(raw);
      const merged = { ...freshState(), ...parsed };
      merged.upgrades = { ...freshState().upgrades, ...(parsed.upgrades || {}) };
      if (!merged.combat) merged.activeQuest = null;
      return merged;
    } catch { return freshState(); }
  }

  function saveState(){
    state.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function addXp(amount){
    state.xp += amount;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      addLog(`Alden reached level ${state.level}!`);
    }
  }

  function render(){
    const s = stats();
    const needed = xpNeeded(state.level);
    els.gold.textContent = Math.floor(state.gold).toLocaleString();
    els.level.textContent = state.level;
    els.xp.textContent = state.xp;
    els.xpNext.textContent = needed;
    els.xpBar.style.width = `${Math.min(100, state.xp/needed*100)}%`;
    els.hp.textContent = s.hp;
    els.damage.textContent = s.damage;
    els.defense.textContent = s.defense;
    els.power.textContent = s.power;
    els.areaProgress.textContent = `${state.cleared.length} / ${quests.length} cleared`;
    renderQuestList();
    renderUpgrades();
    renderCombat();
  }

  function renderQuestList(){
    els.questList.innerHTML = '';
    quests.forEach((q, i) => {
      const unlocked = isUnlocked(i);
      const cleared = state.cleared.includes(q.id);
      const row = document.createElement('div');
      row.className = `ig-quest${unlocked ? '' : ' locked'}`;
      row.innerHTML = `
        <div>
          <h3>${q.boss ? '👑 ' : ''}${q.name}${cleared ? ' ✓' : ''}</h3>
          <div class="ig-meta">${q.enemy} • Power ${q.power} • ${q.gold} gold • ${q.xp} XP • ${threatLabel(q)}</div>
        </div>
        <button type="button" ${!unlocked || state.activeQuest ? 'disabled' : ''}>${cleared ? 'Fight again' : 'Start fight'}</button>`;
      row.querySelector('button').addEventListener('click', () => startQuest(q.id));
      els.questList.appendChild(row);
    });
  }

  function renderUpgrades(){
    els.upgradeList.innerHTML = '';
    upgrades.forEach(upgrade => {
      const rank = state.upgrades[upgrade.id] || 0;
      const maxed = upgrade.maxRank && rank >= upgrade.maxRank;
      const cost = maxed ? 0 : upgradeCost(upgrade);
      const row = document.createElement('div');
      row.className = 'ig-upgrade';
      row.innerHTML = `
        <div>
          <h3>${upgrade.icon} ${upgrade.name}</h3>
          <p>${upgrade.description}</p>
        </div>
        <div class="ig-upgrade-cost">
          <span class="ig-upgrade-rank">Rank ${rank}${upgrade.maxRank ? ` / ${upgrade.maxRank}` : ''}</span>
          <button type="button" ${maxed || state.activeQuest || state.gold < cost ? 'disabled' : ''}>${maxed ? 'MAX' : `🪙 ${cost}`}</button>
        </div>`;
      row.querySelector('button').addEventListener('click', () => buyUpgrade(upgrade.id));
      els.upgradeList.appendChild(row);
    });
  }

  function buyUpgrade(id){
    const upgrade = upgrades.find(u => u.id === id);
    if (!upgrade || state.activeQuest) return;
    const rank = state.upgrades[id] || 0;
    if (upgrade.maxRank && rank >= upgrade.maxRank) return;
    const cost = upgradeCost(upgrade);
    if (state.gold < cost) return;
    state.gold -= cost;
    state.upgrades[id] = rank + 1;
    saveState();
    render();
  }

  function startQuest(id){
    const q = quests.find(x => x.id === id);
    const index = quests.findIndex(x => x.id === id);
    if (!q || !isUnlocked(index) || state.activeQuest) return;

    const s = stats();
    const now = Date.now();
    state.activeQuest = id;
    state.combat = {
      heroHp:s.hp,
      heroMaxHp:s.hp,
      enemyHp:q.enemyHp,
      enemyMaxHp:q.enemyHp,
      nextHeroAttack:now + 350,
      nextEnemyAttack:now + q.enemyAttackMs,
      startedAt:now,
      attacks:0,
      log:[`Alden engages ${q.enemy}.`]
    };
    els.result.className = 'ig-result hidden';
    saveState();
    render();
    startTicker();
  }

  function renderCombat(){
    if (!state.activeQuest || !state.combat) {
      els.activeName.textContent = 'No active quest';
      els.activeStatus.textContent = 'Ready';
      els.idle.classList.remove('hidden');
      els.active.classList.add('hidden');
      return;
    }

    const q = quests.find(x => x.id === state.activeQuest);
    const c = state.combat;
    if (!q) return;
    els.idle.classList.add('hidden');
    els.active.classList.remove('hidden');
    els.activeName.textContent = q.name;
    els.activeStatus.textContent = 'Fighting';
    els.enemy.textContent = q.enemy;
    els.enemySprite.textContent = q.icon;
    els.heroHpText.textContent = `${Math.max(0, Math.ceil(c.heroHp))} / ${c.heroMaxHp} HP`;
    els.enemyHpText.textContent = `${Math.max(0, Math.ceil(c.enemyHp))} / ${c.enemyMaxHp} HP`;
    els.heroHpBar.style.width = `${Math.max(0, c.heroHp/c.heroMaxHp*100)}%`;
    els.enemyHpBar.style.width = `${Math.max(0, c.enemyHp/c.enemyMaxHp*100)}%`;
    els.combatRound.textContent = `${c.attacks} attacks exchanged`;
    els.combatEstimate.textContent = `${threatLabel(q)} • Your Power ${stats().power} vs ${q.power}`;
    els.combatLog.innerHTML = (c.log || []).slice(-5).map(line => `<div class="ig-log-line">${line}</div>`).join('');
    els.combatLog.scrollTop = els.combatLog.scrollHeight;
  }

  function heroAttack(q, animate){
    const c = state.combat;
    if (!c) return;
    const s = stats();
    const crit = Math.random() < s.crit;
    let damage = Math.max(1, Math.round(s.damage - q.enemyDefense*.55));
    if (crit) damage = Math.round(damage * 1.85);
    c.enemyHp -= damage;
    c.attacks++;
    addLog(`Alden hits ${q.enemy} for <strong>${damage}</strong>${crit ? ' — CRITICAL!' : '.'}`);
    if (animate) animateAttack(true, crit);
  }

  function enemyAttack(q, animate){
    const c = state.combat;
    if (!c) return;
    const s = stats();
    const damage = Math.max(1, Math.round(q.enemyDamage - s.defense*.55));
    c.heroHp -= damage;
    c.attacks++;
    addLog(`${q.enemy} hits Alden for <strong>${damage}</strong>.`);
    if (animate) animateAttack(false, false);
  }

  function processCombat(now, animate = true){
    if (!state.activeQuest || !state.combat) return;
    const q = quests.find(x => x.id === state.activeQuest);
    const c = state.combat;
    const s = stats();
    if (!q) return;

    let safety = 0;
    while (safety++ < 500 && c.heroHp > 0 && c.enemyHp > 0) {
      const next = Math.min(c.nextHeroAttack, c.nextEnemyAttack);
      if (next > now) break;

      if (c.nextHeroAttack <= c.nextEnemyAttack) {
        heroAttack(q, animate && now - c.nextHeroAttack < 180);
        c.nextHeroAttack += s.attackMs;
      } else {
        enemyAttack(q, animate && now - c.nextEnemyAttack < 180);
        c.nextEnemyAttack += q.enemyAttackMs;
      }
    }

    if (c.enemyHp <= 0) finishQuest(q, true);
    else if (c.heroHp <= 0) finishQuest(q, false);
    else renderCombat();
  }

  function finishQuest(q, won){
    if (!state.combat) return;
    if (won) {
      state.gold += q.gold;
      addXp(q.xp);
      if (!state.cleared.includes(q.id)) state.cleared.push(q.id);
      els.result.innerHTML = `<strong>Victory!</strong><br>${q.enemy} defeated • +${q.gold} gold • +${q.xp} XP`;
      els.result.className = 'ig-result success';
    } else {
      els.result.innerHTML = `<strong>Defeat.</strong><br>Alden was knocked out by ${q.enemy}. Spend gold in the Training Hall, level up on earlier fights, then return stronger.`;
      els.result.className = 'ig-result fail';
    }
    state.activeQuest = null;
    state.combat = null;
    saveState();
    stopTicker();
    render();
  }

  function addLog(text){
    if (!state.combat) return;
    if (!state.combat.log) state.combat.log = [];
    state.combat.log.push(text);
    if (state.combat.log.length > 12) state.combat.log.shift();
  }

  function animateAttack(hero, crit){
    const attacker = hero ? els.heroSprite : els.enemySprite;
    const victim = hero ? els.enemySprite : els.heroSprite;
    const attackClass = hero ? 'ig-strike-right' : 'ig-strike-left';
    const hitClass = hero ? 'ig-hit-right' : 'ig-hit-left';
    attacker.classList.remove(attackClass);
    victim.classList.remove(hitClass, 'ig-crit');
    void attacker.offsetWidth;
    attacker.classList.add(attackClass);
    victim.classList.add(hitClass);
    if (crit) attacker.classList.add('ig-crit');
    setTimeout(() => {
      attacker.classList.remove(attackClass, 'ig-crit');
      victim.classList.remove(hitClass);
    }, 260);
  }

  function startTicker(){
    stopTicker();
    tickHandle = setInterval(() => processCombat(Date.now(), true), 100);
    saveHandle = setInterval(saveState, 2000);
  }

  function stopTicker(){
    if (tickHandle) clearInterval(tickHandle);
    if (saveHandle) clearInterval(saveHandle);
    tickHandle = null;
    saveHandle = null;
  }

  function resolveOfflineCombat(){
    if (!state.activeQuest || !state.combat) return;
    processCombat(Date.now(), false);
  }

  els.reset.addEventListener('click', () => {
    if (!confirm('Reset all Idle Guild progress?')) return;
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('idleGuildSaveV1');
    state = freshState();
    els.result.className = 'ig-result hidden';
    stopTicker();
    render();
  });

  window.addEventListener('beforeunload', saveState);
  resolveOfflineCombat();
  render();
  if (state.activeQuest) startTicker();
})();

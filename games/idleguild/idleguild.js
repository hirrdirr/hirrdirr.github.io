(() => {
  const SAVE_KEY = 'idleGuildSaveV1';

  const quests = [
    { id:'rats', name:'Rats in the Cellar', enemy:'Giant Rat', duration:10, power:22, gold:35, xp:15 },
    { id:'chickens', name:'Missing Chickens', enemy:'Fox', duration:15, power:30, gold:48, xp:22 },
    { id:'scouts', name:'Goblin Scouts', enemy:'Goblin Scout', duration:25, power:42, gold:72, xp:34 },
    { id:'bandits', name:'Bandit Trouble', enemy:'Bandit', duration:40, power:58, gold:105, xp:50 },
    { id:'captain', name:'Goblin Captain', enemy:'Goblin Captain', duration:60, power:78, gold:180, xp:90, boss:true }
  ];

  const freshState = () => ({
    gold:100,
    level:1,
    xp:0,
    cleared:[],
    activeQuest:null,
    activeQuestStartedAt:null,
    lastSavedAt:Date.now()
  });

  let state = loadState();
  let tickHandle = null;

  const $ = (id) => document.getElementById(id);
  const els = {
    gold:$('goldValue'), level:$('heroLevel'), xp:$('xpValue'), xpNext:$('xpNext'), xpBar:$('xpBar'),
    hp:$('statHp'), damage:$('statDamage'), defense:$('statDefense'), power:$('statPower'), areaProgress:$('areaProgress'),
    questList:$('questList'), activeName:$('activeQuestName'), activeStatus:$('activeQuestStatus'), idle:$('idleState'), active:$('activeState'),
    enemy:$('enemyName'), time:$('timeRemaining'), questBar:$('questProgressBar'), odds:$('questOdds'), result:$('resultBox'), reset:$('resetSave')
  };

  function xpNeeded(level){ return 100 + ((level - 1) * 45); }
  function stats(){
    const l = state.level;
    return { hp:120 + (l-1)*18, damage:14 + (l-1)*4, defense:6 + (l-1)*2, power:40 + (l-1)*14 };
  }
  function successChance(q){
    const p = stats().power;
    if (p >= q.power) return 1;
    return Math.max(.35, Math.min(.95, p / q.power));
  }
  function isUnlocked(index){ return index === 0 || state.cleared.includes(quests[index-1].id); }

  function loadState(){
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      return { ...freshState(), ...JSON.parse(raw) };
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
    renderActive();
  }

  function renderQuestList(){
    els.questList.innerHTML = '';
    quests.forEach((q, i) => {
      const unlocked = isUnlocked(i);
      const cleared = state.cleared.includes(q.id);
      const row = document.createElement('div');
      row.className = `ig-quest${unlocked ? '' : ' locked'}`;
      const chance = Math.round(successChance(q) * 100);
      row.innerHTML = `
        <div>
          <h3>${q.boss ? '👑 ' : ''}${q.name}${cleared ? ' ✓' : ''}</h3>
          <div class="ig-meta">${q.duration}s • ${q.gold} gold • ${q.xp} XP • ${chance}% success</div>
        </div>
        <button type="button" ${!unlocked || state.activeQuest ? 'disabled' : ''}>${cleared ? 'Run again' : 'Start quest'}</button>`;
      row.querySelector('button').addEventListener('click', () => startQuest(q.id));
      els.questList.appendChild(row);
    });
  }

  function renderActive(){
    if (!state.activeQuest) {
      els.activeName.textContent = 'No active quest';
      els.activeStatus.textContent = 'Ready';
      els.idle.classList.remove('hidden');
      els.active.classList.add('hidden');
      return;
    }
    const q = quests.find(x => x.id === state.activeQuest);
    if (!q) return;
    els.idle.classList.add('hidden');
    els.active.classList.remove('hidden');
    els.activeName.textContent = q.name;
    els.activeStatus.textContent = 'In progress';
    els.enemy.textContent = q.enemy;
    els.odds.textContent = `${Math.round(successChance(q)*100)}% estimated success chance`;
    updateQuestClock();
  }

  function startQuest(id){
    const q = quests.find(x => x.id === id);
    const index = quests.findIndex(x => x.id === id);
    if (!q || !isUnlocked(index) || state.activeQuest) return;
    state.activeQuest = id;
    state.activeQuestStartedAt = Date.now();
    els.result.className = 'ig-result hidden';
    saveState();
    render();
    startTicker();
  }

  function updateQuestClock(){
    if (!state.activeQuest) return;
    const q = quests.find(x => x.id === state.activeQuest);
    const elapsed = Math.max(0, (Date.now() - state.activeQuestStartedAt) / 1000);
    const remaining = Math.max(0, q.duration - elapsed);
    els.time.textContent = `${Math.ceil(remaining)}s`;
    els.questBar.style.width = `${Math.min(100, elapsed/q.duration*100)}%`;
    if (remaining <= 0) finishQuest(q);
  }

  function finishQuest(q){
    const won = Math.random() <= successChance(q);
    if (won) {
      state.gold += q.gold;
      addXp(q.xp);
      if (!state.cleared.includes(q.id)) state.cleared.push(q.id);
      els.result.innerHTML = `<strong>Quest complete!</strong><br>+${q.gold} gold • +${q.xp} XP`;
      els.result.className = 'ig-result success';
    } else {
      els.result.innerHTML = `<strong>Quest failed.</strong><br>Alden returns empty-handed. Train up and try again.`;
      els.result.className = 'ig-result fail';
    }
    state.activeQuest = null;
    state.activeQuestStartedAt = null;
    saveState();
    stopTicker();
    render();
  }

  function resolveOfflineQuest(){
    if (!state.activeQuest || !state.activeQuestStartedAt) return;
    const q = quests.find(x => x.id === state.activeQuest);
    if (!q) return;
    const elapsed = (Date.now() - state.activeQuestStartedAt) / 1000;
    if (elapsed >= q.duration) finishQuest(q);
  }

  function startTicker(){
    stopTicker();
    tickHandle = setInterval(updateQuestClock, 250);
  }
  function stopTicker(){ if (tickHandle) clearInterval(tickHandle); tickHandle = null; }

  els.reset.addEventListener('click', () => {
    if (!confirm('Reset all Idle Guild progress?')) return;
    localStorage.removeItem(SAVE_KEY);
    state = freshState();
    els.result.className = 'ig-result hidden';
    stopTicker();
    render();
  });

  window.addEventListener('beforeunload', saveState);
  resolveOfflineQuest();
  render();
  if (state.activeQuest) startTicker();
})();

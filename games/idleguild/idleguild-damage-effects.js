(() => {
  const hero = document.getElementById('heroCombatant');
  const enemy = document.getElementById('enemyCombatant');
  const log = document.getElementById('combatLog');
  if (!hero || !enemy || !log) return;

  let lastSeen = '';

  function spawnDamage(target, amount, crit = false) {
    const effect = document.createElement('span');
    effect.className = `ig-damage-number${crit ? ' crit' : ''}`;
    effect.textContent = `-${amount}`;
    target.appendChild(effect);
    effect.addEventListener('animationend', () => effect.remove(), { once:true });
  }

  function inspectLatestHit() {
    const line = log.lastElementChild;
    if (!line) return;
    const html = line.innerHTML;
    if (!html || html === lastSeen) return;
    lastSeen = html;

    const amountMatch = line.textContent.match(/for\s+(\d+)/i);
    if (!amountMatch) return;
    const amount = amountMatch[1];
    const isCrit = /critical/i.test(line.textContent);

    if (/^Alden hits/i.test(line.textContent.trim())) spawnDamage(enemy, amount, isCrit);
    else if (/hits Alden for/i.test(line.textContent)) spawnDamage(hero, amount, false);
  }

  const observer = new MutationObserver(inspectLatestHit);
  observer.observe(log, { childList:true, subtree:true });
})();
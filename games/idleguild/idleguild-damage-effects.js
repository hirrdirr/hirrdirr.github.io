(() => {
  const hero = document.getElementById('heroCombatant');
  const enemy = document.getElementById('enemyCombatant');
  const log = document.getElementById('combatLog');
  const round = document.getElementById('combatRound');
  if (!hero || !enemy || !log || !round) return;

  let lastSeenAttack = '';

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

    const attackKey = `${round.textContent}|${line.textContent}`;
    if (attackKey === lastSeenAttack) return;
    lastSeenAttack = attackKey;

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
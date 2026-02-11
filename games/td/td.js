(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const tile = 30;
  const cols = Math.floor(canvas.width / tile);
  const rows = Math.floor(canvas.height / tile);

  const path = [
    {x: 0.5, y: 8.5},
    {x: 10.5, y: 8.5},
    {x: 10.5, y: 3.5},
    {x: 22.5, y: 3.5},
    {x: 22.5, y: 13.5},
    {x: 30.5, y: 13.5},
  ].map(p => ({ x: p.x * tile, y: p.y * tile }));

  const isRoad = new Set();
  function markRoad() {
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i+1];
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      let x = a.x, y = a.y;
      for (let steps = 0; steps < 2000; steps++) {
        const gx = Math.floor(x / tile);
        const gy = Math.floor(y / tile);
        isRoad.add(`${gx},${gy}`);
        if (Math.abs(x - b.x) < 1 && Math.abs(y - b.y) < 1) break;
        x += dx * tile * 0.2;
        y += dy * tile * 0.2;
      }
    }
  }
  markRoad();

  let gold = 120;
  let lives = 20;
  let wave = 0;
  let placing = null;

  const towers = [];
  const enemies = [];
  const bullets = [];

  const towerTypes = {
    sniper:  { cost:50, range:150, fireRate:0.8, damage:18, bulletSpeed:420 },
    gatling: { cost:35, range: 95, fireRate:4.5, damage: 5, bulletSpeed:520 },
  };

  const btn1 = document.getElementById("t1");
  const btn2 = document.getElementById("t2");
  const btnStart = document.getElementById("start");
  const stats = document.getElementById("stats");

  function setPlacing(t) {
    placing = t;
    btn1.classList.toggle("active", t === "sniper");
    btn2.classList.toggle("active", t === "gatling");
  }
  btn1.onclick = () => setPlacing(placing === "sniper" ? null : "sniper");
  btn2.onclick = () => setPlacing(placing === "gatling" ? null : "gatling");

  btnStart.onclick = () => startWave();

  function startWave() {
    wave++;
    const count = 8 + wave * 2;
    for (let i = 0; i < count; i++) enemies.push(makeEnemy(i * 0.7));
  }

  function makeEnemy(delay) {
    const hp = 30 + wave * 8;
    return {
      t: -delay,
      hp, maxHp: hp,
      speed: 55 + wave * 3,
      idx: 0,
      x: path[0].x,
      y: path[0].y,
      r: 10,
      reward: 7 + Math.floor(wave/2),
    };
  }

  const dist2 = (ax,ay,bx,by) => {
    const dx=ax-bx, dy=ay-by;
    return dx*dx+dy*dy;
  };

  function gridFromMouse(ev) {
    const rect = canvas.getBoundingClientRect();
    const mx = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const my = (ev.clientY - rect.top) * (canvas.height / rect.height);
    const gx = Math.floor(mx / tile);
    const gy = Math.floor(my / tile);
    return {gx, gy};
  }

  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("mousedown", (ev) => {
    const {gx, gy} = gridFromMouse(ev);
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;

    const key = `${gx},${gy}`;
    const occupied = towers.some(t => t.gx === gx && t.gy === gy);

    if (ev.button === 2) {
      const idx = towers.findIndex(t => t.gx === gx && t.gy === gy);
      if (idx !== -1) towers.splice(idx, 1);
      return;
    }

    if (!placing) return;
    if (isRoad.has(key) || occupied) return;

    const type = towerTypes[placing];
    if (gold < type.cost) return;

    gold -= type.cost;
    towers.push({
      kind: placing,
      gx, gy,
      x: (gx + 0.5) * tile,
      y: (gy + 0.5) * tile,
      cd: 0,
    });
  });

  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function update(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.t += dt;
      if (e.t < 0) continue;

      const target = path[Math.min(e.idx + 1, path.length - 1)];
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      const step = e.speed * dt;
      if (d <= step) {
        e.x = target.x; e.y = target.y;
        if (e.idx < path.length - 2) e.idx++;
        else {
          lives--;
          enemies.splice(i, 1);
          continue;
        }
      } else {
        e.x += (dx / d) * step;
        e.y += (dy / d) * step;
      }
    }

    for (const t of towers) {
      const tt = towerTypes[t.kind];
      t.cd -= dt;
      if (t.cd > 0) continue;

      let best = null;
      let bestD2 = Infinity;
      for (const e of enemies) {
        if (e.t < 0) continue;
        const d2 = dist2(t.x, t.y, e.x, e.y);
        if (d2 <= tt.range * tt.range && d2 < bestD2) { best = e; bestD2 = d2; }
      }
      if (best) {
        t.cd = 1 / tt.fireRate;
        bullets.push({ x: t.x, y: t.y, speed: tt.bulletSpeed, dmg: tt.damage, target: best, life: 1.2 });
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      if (b.life <= 0 || !b.target || b.target.hp <= 0) { bullets.splice(i, 1); continue; }

      const dx = b.target.x - b.x;
      const dy = b.target.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = b.speed * dt;

      if (d <= step + b.target.r) {
        b.target.hp -= b.dmg;
        if (b.target.hp <= 0) {
          gold += b.target.reward;
          const idx = enemies.indexOf(b.target);
          if (idx !== -1) enemies.splice(idx, 1);
        }
        bullets.splice(i, 1);
      } else {
        b.x += (dx / d) * step;
        b.y += (dy / d) * step;
      }
    }

    stats.textContent = `Guld: ${gold} | Liv: ${lives} | Våg: ${wave} | Fiender: ${enemies.filter(e=>e.t>=0).length}`;
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#2b3b55";
    for (let x = 0; x <= cols; x++) { ctx.beginPath(); ctx.moveTo(x*tile, 0); ctx.lineTo(x*tile, canvas.height); ctx.stroke(); }
    for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, y*tile); ctx.lineTo(canvas.width, y*tile); ctx.stroke(); }
    ctx.globalAlpha = 1;

    for (const key of isRoad) {
      const [gx, gy] = key.split(",").map(Number);
      ctx.fillStyle = "#172235";
      ctx.fillRect(gx * tile, gy * tile, tile, tile);
    }

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.lineWidth = 1;

    for (const t of towers) {
      const tt = towerTypes[t.kind];
      ctx.fillStyle = t.kind === "sniper" ? "#eab308" : "#22c55e";
      ctx.fillRect((t.gx * tile) + 6, (t.gy * tile) + 6, tile - 12, tile - 12);

      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(t.x, t.y, tt.range, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const e of enemies) {
      if (e.t < 0) continue;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();

      const w = 26, h = 4;
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "#111827";
      ctx.fillRect(e.x - w/2, e.y - e.r - 10, w, h);
      ctx.fillStyle = "#93c5fd";
      ctx.fillRect(e.x - w/2, e.y - e.r - 10, w * pct, h);
    }

    ctx.fillStyle = "#e5e7eb";
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); }

    if (lives <= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px system-ui";
      ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
      ctx.font = "18px system-ui";
      ctx.fillText("Refresh för att spela igen (ja, brutalt. som livet).", canvas.width/2 - 190, canvas.height/2 + 36);
    }
  }
})();
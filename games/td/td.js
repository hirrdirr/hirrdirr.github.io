(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  // Grid
  const tile = 30;
  const cols = Math.floor(canvas.width / tile);
  const rows = Math.floor(canvas.height / tile);

  // Waypoints
  const path = [
    {x: 0.5, y: 8.5},
    {x: 10.5, y: 8.5},
    {x: 10.5, y: 3.5},
    {x: 22.5, y: 3.5},
    {x: 22.5, y: 13.5},
    {x: 30.5, y: 13.5},
  ].map(p => ({ x: p.x * tile, y: p.y * tile }));

  // Road tiles
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

  // State
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

  let hoveredTower = -1;
  let selectedTower = -1;
  let showAllRanges = false;
  let paused = false;

  let mouse = { mx: 0, my: 0, gx: 0, gy: 0, inside: false };

  // --- Icons (inline Lucide SVG, no external deps) ---
  const LUCIDE = {
    circleDollarSign: (s=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"></path>
      <path d="M12 18V6"></path>
    </svg>`,
    heart: (s=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"></path>
    </svg>`,
    play: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <polygon points="6 3 20 12 6 21 6 3"></polygon>
    </svg>`,
    pause: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <rect x="6" y="4" width="4" height="16" rx="1"></rect>
      <rect x="14" y="4" width="4" height="16" rx="1"></rect>
    </svg>`
,
    chevronLeft: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <path d="m15 18-6-6 6-6"></path>
    </svg>`,
    chevronRight: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <path d="m9 18 6-6-6-6"></path>
    </svg>`,
    circleQuestionMark: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path>
    </svg>`  };

  // UI refs
  const btn1 = document.getElementById("t1");
  const btn2 = document.getElementById("t2");
  const btnStart = document.getElementById("start");
  const stats = document.getElementById("stats");

  // --- Move HUD into overlay above the canvas ---
  const wrap = canvas.parentElement; // .td-wrap
  if (wrap) {
    let overlay = wrap.querySelector(".td-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "td-overlay";
      wrap.appendChild(overlay);
    }
    if (stats) overlay.appendChild(stats);
    if (btnStart) overlay.appendChild(btnStart);
  }

  // --- Right-side slide-out Instructions Drawer (like a hidden tab) ---
  function createInstructionsDrawer() {
    if (!wrap) return;
    if (wrap.querySelector("#td-drawer")) return;

    const drawer = document.createElement("aside");
    drawer.id = "td-drawer";
    drawer.className = "td-drawer";

    drawer.innerHTML = `
      <button type="button" class="td-drawer-handle" aria-label="Öppna instruktioner" title="Instruktioner">
        ${LUCIDE.circleQuestionMark(18)}
        <span class="td-drawer-chev">${LUCIDE.chevronLeft(18)}</span>
      </button>

      <div class="td-drawer-panel" role="region" aria-label="Instruktioner">
        <div class="td-drawer-head">
          <div class="td-drawer-title">Instruktioner</div>
          <button type="button" class="td-drawer-close" aria-label="Stäng instruktioner" title="Stäng">
            ${LUCIDE.chevronRight(18)}
          </button>
        </div>

        <div class="td-drawer-line"><strong>Placera:</strong> vänsterklick</div>
        <div class="td-drawer-line"><strong>Ta bort:</strong> högerklick</div>
        <div class="td-drawer-line"><strong>Range:</strong> R</div>
        <div class="td-drawer-line"><strong>Avbryt placering:</strong> ESC</div>
        <div class="td-drawer-line"><strong>Pausa:</strong> Play/Pause (eller Space)</div>
      </div>
    `;

    wrap.appendChild(drawer);

    const handle = drawer.querySelector(".td-drawer-handle");
    const closeBtn = drawer.querySelector(".td-drawer-close");

    function setOpen(v) {
      drawer.classList.toggle("open", v);
      handle.setAttribute("aria-label", v ? "Stäng instruktioner" : "Öppna instruktioner");
    }

    handle.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
    closeBtn.addEventListener("click", () => setOpen(false));

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && drawer.classList.contains("open")) setOpen(false);
    });
  }

  createInstructionsDrawer();

  function updateTowerButtonLabels() {
    if (btn1) btn1.innerHTML = `
      <span class="td-tower-name">SNIPER</span>
      <span class="td-tower-cost"><span class="td-cost-num">${towerTypes.sniper.cost}</span><span class="td-ico-after">${LUCIDE.circleDollarSign(16)}</span></span>
    `;
    if (btn2) btn2.innerHTML = `
      <span class="td-tower-name">GATLING</span>
      <span class="td-tower-cost"><span class="td-cost-num">${towerTypes.gatling.cost}</span><span class="td-ico-after">${LUCIDE.circleDollarSign(16)}</span></span>
    `;
  }
  updateTowerButtonLabels();

  function setPlacing(t) {
    placing = t;
    btn1?.classList.toggle("active", t === "sniper");
    btn2?.classList.toggle("active", t === "gatling");
  }
  btn1 && (btn1.onclick = () => setPlacing(placing === "sniper" ? null : "sniper"));
  btn2 && (btn2.onclick = () => setPlacing(placing === "gatling" ? null : "gatling"));

  function startWave() {
    wave++;
    const count = 8 + wave * 2;
    for (let i = 0; i < count; i++) enemies.push(makeEnemy(i * 0.7));
  }

  function makeEnemy(delay) {
    const hp = 30 + wave * 8;
    return {
      t: -delay,
      hp,
      maxHp: hp,
      speed: 55 + wave * 3,
      idx: 0,
      x: path[0].x,
      y: path[0].y,
      r: 10,
      reward: 7 + Math.floor(wave/2),
    };
  }

  function setPaused(v) {
    paused = v;
    updatePlayPauseButton();
  }

  function updatePlayPauseButton() {
    if (!btnStart) return;
    btnStart.classList.add("td-btn-icon");

    const waveActive = enemies.length > 0; // includes delayed spawns
    const showPlay = paused || !waveActive;

    btnStart.innerHTML = showPlay ? LUCIDE.play(18) : LUCIDE.pause(18);
    btnStart.title = showPlay ? (paused ? "Fortsätt" : "Starta våg") : "Pausa";
    btnStart.setAttribute("aria-label", btnStart.title);
  }

  btnStart && (btnStart.onclick = () => {
    const waveActive = enemies.length > 0;

    if (paused) { setPaused(false); return; }
    if (!waveActive) { startWave(); setPaused(false); return; }

    setPaused(true);
  });
  updatePlayPauseButton();

  // Helpers
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
    const inside = (mx >= 0 && my >= 0 && mx < canvas.width && my < canvas.height);
    return {mx, my, gx, gy, inside};
  }

  // Input
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  canvas.addEventListener("mousemove", (ev) => {
    mouse = gridFromMouse(ev);

    hoveredTower = -1;
    let bestD2 = Infinity;
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];
      const d2 = dist2(t.x, t.y, mouse.mx, mouse.my);
      const hitR = tile * 0.55;
      if (d2 < hitR * hitR && d2 < bestD2) {
        hoveredTower = i;
        bestD2 = d2;
      }
    }
  });

  canvas.addEventListener("mouseleave", () => {
    mouse.inside = false;
    hoveredTower = -1;
  });

  canvas.addEventListener("mousedown", (ev) => {
    if (paused) return; // don't allow interactions while paused

    const {gx, gy} = gridFromMouse(ev);
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;

    const key = `${gx},${gy}`;
    const occupiedIdx = towers.findIndex(t => t.gx === gx && t.gy === gy);
    const occupied = occupiedIdx !== -1;

    if (ev.button === 2) { // remove
      if (occupiedIdx !== -1) {
        towers.splice(occupiedIdx, 1);
        if (selectedTower === occupiedIdx) selectedTower = -1;
      }
      return;
    }

    // select when not placing
    if (!placing && ev.button === 0) {
      selectedTower = occupied ? occupiedIdx : -1;
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

  window.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() === "r") showAllRanges = !showAllRanges;
    if (ev.key === "Escape") setPlacing(null);
    if (ev.key === " "){ // space toggles pause
      ev.preventDefault();
      if (enemies.length > 0) setPaused(!paused);
    }
  });

  // Drawing helpers
  function drawRangeRing(x, y, r, strong=false) {
    ctx.save();
    ctx.globalAlpha = strong ? 0.95 : 0.35;
    ctx.strokeStyle = "#93c5fd";
    ctx.lineWidth = strong ? 2.2 : 1;
    ctx.setLineDash(strong ? [7, 6] : [4, 10]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawGhostTower(gx, gy, kind, ok) {
    const x = (gx + 0.5) * tile;
    const y = (gy + 0.5) * tile;
    const tt = towerTypes[kind];

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = kind === "sniper" ? "#eab308" : "#22c55e";
    ctx.fillRect(gx * tile + 6, gy * tile + 6, tile - 12, tile - 12);

    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = ok ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(gx * tile + 4, gy * tile + 4, tile - 8, tile - 8);
    ctx.restore();

    drawRangeRing(x, y, tt.range, true);
  }

  // Loop
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    if (!paused) update(dt);
    render();
    updatePlayPauseButton();

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function update(dt) {
    // Enemies
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

    // Towers shoot
    for (const t of towers) {
      const tt = towerTypes[t.kind];
      t.cd -= dt;
      if (t.cd > 0) continue;

      let best = null;
      let bestD2 = Infinity;
      for (const e of enemies) {
        if (e.t < 0) continue;
        const d2 = dist2(t.x, t.y, e.x, e.y);
        if (d2 <= tt.range * tt.range && d2 < bestD2) {
          best = e; bestD2 = d2;
        }
      }
      if (best) {
        t.cd = 1 / tt.fireRate;
        bullets.push({
          x: t.x, y: t.y,
          speed: tt.bulletSpeed,
          dmg: tt.damage,
          target: best,
          life: 1.2
        });
      }
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      if (b.life <= 0 || !b.target || b.target.hp <= 0) {
        bullets.splice(i, 1);
        continue;
      }

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

    // HUD (overlay)
    const aliveCount = enemies.filter(e => e.t >= 0).length;
    if (stats) {
      stats.innerHTML =
        `${LUCIDE.circleDollarSign(16)}<strong>${gold}</strong>` +
        `&nbsp; | &nbsp; ${LUCIDE.heart(16)}<strong>${lives}</strong>` +
        `&nbsp; | &nbsp; <span class="td-hud-label">Wave</span> <strong>${wave}</strong>` +
        `&nbsp; | &nbsp; <span class="td-hud-label">Fiender</span> <strong>${aliveCount}</strong>`;
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#2b3b55";
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tile, 0);
      ctx.lineTo(x * tile, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tile);
      ctx.lineTo(canvas.width, y * tile);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Road
    for (const key of isRoad) {
      const [gx, gy] = key.split(",").map(Number);
      ctx.fillStyle = "#172235";
      ctx.fillRect(gx * tile, gy * tile, tile, tile);
    }

    // Path line
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Towers
    for (let i = 0; i < towers.length; i++) {
      const t = towers[i];

      ctx.fillStyle = t.kind === "sniper" ? "#eab308" : "#22c55e";
      ctx.fillRect((t.gx * tile) + 6, (t.gy * tile) + 6, tile - 12, tile - 12);

      if (i === hoveredTower || i === selectedTower) {
        ctx.save();
        ctx.strokeStyle = (i === selectedTower) ? "#7dd3fc" : "#94a3b8";
        ctx.lineWidth = 2;
        ctx.strokeRect((t.gx * tile) + 4, (t.gy * tile) + 4, tile - 8, tile - 8);
        ctx.restore();
      }
    }

    // Ranges
    if (showAllRanges) {
      for (const t of towers) drawRangeRing(t.x, t.y, towerTypes[t.kind].range, false);
    } else {
      const showIdx = hoveredTower !== -1 ? hoveredTower : selectedTower;
      if (showIdx !== -1) {
        const t = towers[showIdx];
        drawRangeRing(t.x, t.y, towerTypes[t.kind].range, true);
      }
    }

    // Enemies
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

    // Bullets
    ctx.fillStyle = "#e5e7eb";
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI*2);
      ctx.fill();
    }

    // Ghost placement preview
    if (placing && mouse.inside && !paused) {
      const gx = mouse.gx, gy = mouse.gy;
      if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) {
        const key = `${gx},${gy}`;
        const occupied = towers.some(t => t.gx === gx && t.gy === gy);
        const enoughGold = gold >= towerTypes[placing].cost;
        const ok = !isRoad.has(key) && !occupied && enoughGold;
        drawGhostTower(gx, gy, placing, ok);
      }
    }

    // Pause overlay
    if (paused) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e6edf3";
      ctx.font = "700 28px system-ui";
      ctx.fillText("PAUSED", 24, 44);
      ctx.font = "14px system-ui";
      ctx.fillText("Tryck Space eller Play för att fortsätta", 24, 66);
    }

    // Game over
    if (lives <= 0) {
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px system-ui";
      ctx.fillText("GAME OVER", canvas.width/2 - 150, canvas.height/2);
      ctx.font = "18px system-ui";
      ctx.fillText("Refresh för att spela igen.", canvas.width/2 - 110, canvas.height/2 + 36);
    }
  }
})();
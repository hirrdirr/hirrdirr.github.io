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
    </svg>`,
    circleQuestionMark: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 2-3 4"></path>
      <path d="M12 17h.01"></path>
    </svg>`,
    chevronRight: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <path d="m9 18 6-6-6-6"></path>
    </svg>`,
    chevronLeft: (s=18) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="td-ico">
      <path d="m15 18-6-6 6-6"></path>
    </svg>`
  };

  // UI refs
  const btn1 = document.getElementById("t1");
  btn1?.classList.add("td-tower-btn");
  const btn2 = document.getElementById("t2");
  btn2?.classList.add("td-tower-btn");
  const btnStart = document.getElementById("start");
  const stats = document.getElementById("stats");

  function renderTowerButtons() {
    const b1 = document.getElementById("t1");
    const b2 = document.getElementById("t2");
    if (b1) {
      b1.classList.add("td-tower");
      b1.innerHTML = `<span class="td-tname">SNIPER</span>
                      <span class="td-tcost">50 ${LUCIDE.circleDollarSign(16)}</span>`;
    }
    if (b2) {
      b2.classList.add("td-tower");
      b2.innerHTML = `<span class="td-tname">GATLING</span>
                      <span class="td-tcost">35 ${LUCIDE.circleDollarSign(16)}</span>`;
    }
  }
  renderTowerButtons();

  // --- Move HUD into overlay above the canvas ---
  const wrap = canvas.parentElement; // .td-wrap
  if (wrap) {
    let overlay = wrap.querySelector(".td-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "td-overlay";
      wrap.appendChild(overlay);
    }

    // Lägg till play/pause-knapp i overlay om den inte finns
    let playPauseBtn = overlay.querySelector("#start");
    if (!playPauseBtn) {
      playPauseBtn = document.createElement("button");
      playPauseBtn.id = "start";
      playPauseBtn.className = "td-btn-icon td-btn";
      playPauseBtn.innerHTML = LUCIDE.play(18);
      playPauseBtn.setAttribute("aria-label", "Starta / Pausa spelet");
      overlay.appendChild(playPauseBtn);
    }

    // --- Instructions drawer ---
    function createDrawerAnchoredToWrap() {
      let drawer = wrap.querySelector("#td-drawer");
      if (!drawer) {
        drawer = document.createElement("aside");
        drawer.id = "td-drawer";
        drawer.className = "td-drawer";
        drawer.innerHTML = `
          <div class="td-drawer-panel" role="region" aria-label="Instruktioner">
            <div class="td-drawer-head">
              <div class="td-drawer-title">Instruktioner</div>
            </div>
            <div class="td-drawer-line"><strong>Placera:</strong> vänsterklick</div>
            <div class="td-drawer-line"><strong>Ta bort:</strong> högerklick</div>
            <div class="td-drawer-line"><strong>Range:</strong> R</div>
            <div class="td-drawer-line"><strong>Avbryt placering:</strong> ESC</div>
            <div class="td-drawer-line"><strong>Pausa:</strong> Play/Pause (eller Space)</div>
          </div>`;
        wrap.appendChild(drawer);
      }

      // Vi använder INTE det gamla handtaget längre
    }

    createDrawerAnchoredToWrap();

    // NY: Toggle-knapp för drawer i overlay (syns på små skärmar)
    function createDrawerToggleInOverlay() {
      const overlay = document.querySelector(".td-overlay");
      if (!overlay) return;

      let toggle = overlay.querySelector(".td-drawer-toggle");
      if (!toggle) {
        toggle = document.createElement("button");
        toggle.className = "td-drawer-toggle";
        toggle.type = "button";
        toggle.innerHTML = LUCIDE.chevronLeft(20);
        toggle.setAttribute("aria-label", "Öppna instruktioner");
        overlay.appendChild(toggle);
      }

      const drawer = document.getElementById("td-drawer");

      function sync() {
        const isOpen = drawer.classList.contains("open");
        toggle.innerHTML = isOpen ? LUCIDE.chevronRight(20) : LUCIDE.chevronLeft(20);
        toggle.setAttribute("aria-label", isOpen ? "Stäng instruktioner" : "Öppna instruktioner");
      }

      toggle.addEventListener("click", () => {
        drawer.classList.toggle("open");
        sync();
      });

      window.addEventListener("keydown", e => {
        if (e.key === "Escape" && drawer.classList.contains("open")) {
          drawer.classList.remove("open");
          sync();
        }
      });

      sync();
    }

    createDrawerToggleInOverlay();
  }

  // Play/Pause logic
  function updatePlayPauseButton() {
    const btn = document.getElementById("start");
    if (btn) {
      btn.innerHTML = paused ? LUCIDE.play(18) : LUCIDE.pause(18);
    }
  }

  btnStart?.addEventListener("click", () => {
    paused = !paused;
    updatePlayPauseButton();
  });

  window.addEventListener("keydown", e => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      paused = !paused;
      updatePlayPauseButton();
    }
  });

  // Mouse handling (placering etc.) – antar att detta redan finns i din kod
  // ... (lägg till din mouse-move, click, right-click logik här om den saknas) ...

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
    // Enemies movement
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
        const d2 = (t.x - e.x)**2 + (t.y - e.y)**2;
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
          gold += b.target.reward || 10;
          const idx = enemies.indexOf(b.target);
          if (idx !== -1) enemies.splice(idx, 1);
        }
        bullets.splice(i, 1);
      } else {
        b.x += (dx / d) * step;
        b.y += (dy / d) * step;
      }
    }

    // HUD update
    const aliveCount = enemies.filter(e => e.t >= 0).length;
    if (stats) {
      stats.innerHTML =
        `${LUCIDE.circleDollarSign(16)}<strong>${gold}</strong>` +
        ` | ${LUCIDE.heart(16)}<strong>${lives}</strong>` +
        ` | Wave <strong>${wave}</strong>` +
        ` | Fiender <strong>${aliveCount}</strong>`;
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid + road + path line (din befintliga kod här)
    // ... (lägg till din grid, road, path rendering om den saknas i utdraget) ...

    // Towers, ranges, enemies, bullets, ghost tower – din befintliga render-kod

    // Pause overlay
    if (paused) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let overlayEl = canvas.parentElement.querySelector(".paused-overlay");
      if (!overlayEl) {
        overlayEl = document.createElement("div");
        overlayEl.className = "paused-overlay";
        overlayEl.innerHTML = `
          <h2>PAUSED</h2>
          <p>Tryck Space eller Play för att fortsätta</p>
        `;
        canvas.parentElement.appendChild(overlayEl);
      }
      overlayEl.classList.add("visible");
    } else {
      const overlayEl = canvas.parentElement.querySelector(".paused-overlay");
      if (overlayEl) overlayEl.classList.remove("visible");
    }

    // Game over (din befintliga kod)
    if (lives <= 0) {
      // ... din game over rendering ...
    }
  }

  // Lägg eventuellt till mouse listeners, tower placement logic etc. här
  // Exempel:
  // canvas.addEventListener("mousemove", ...);
  // canvas.addEventListener("click", ...);
  // canvas.addEventListener("contextmenu", ...);

})();

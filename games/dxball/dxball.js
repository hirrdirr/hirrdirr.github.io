(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const wrap = document.querySelector(".dxball-wrap");

  const uiLevel = document.getElementById("uiLevel");
  const uiLevelMax = document.getElementById("uiLevelMax");
  const uiLives = document.getElementById("uiLives");
  const uiScore = document.getElementById("uiScore");
  const uiPowers = document.getElementById("uiPowers");
  const uiTheme = document.getElementById("uiTheme");
  const uiRemaining = document.getElementById("uiRemaining");
  const uiProgress = document.getElementById("uiProgress");
  const uiProgressBar = document.getElementById("uiProgressBar");
  const btnPause = document.getElementById("btnPause");

  const overlayCenter = document.getElementById("overlayCenter");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const overlayPause = document.getElementById("overlayPause");
  const overlayRotate = document.getElementById("overlayRotate");

  const btnPlay = document.getElementById("btnPlay");
  const btnRestart = document.getElementById("btnRestart");
  const btnResume = document.getElementById("btnResume");
  const btnRestart2 = document.getElementById("btnRestart2");

  // --- Config ---
  // Powerup drop chance per DESTROYED brick (global, from any brick)
  const POWERUP_DROP_CHANCE = 0.18; // 18%
  const MAX_DROPS_ON_SCREEN = 4;

  // Stor boll = heavy hit. När aktiv: 2 skada per träff.
  const BIGBALL_DAMAGE = 2;

  // O-FÖRSTÖRBARA (indestructible) bricks
  const INDESTRUCTIBLE_LEVEL_CHANCE = 0.55; // "några banor"
  const INDESTRUCTIBLE_MAX_PER_LEVEL = 10;

  // Lås scroll på sidan (viktigt på mobil)
  document.body.classList.add("dxball-noscr");

  ["touchmove", "gesturestart"].forEach(evt => {
    canvas.addEventListener(evt, e => e.preventDefault(), { passive: false });
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randi(a, b) { return Math.floor(rand(a, b + 1)); }
  function len(x, y) { return Math.hypot(x, y); }

  let W = 800, H = 600, DPR = 1;

  function getTopbarOffsetPx() {
    const candidates = [
      "header.site-header",
      "header",
      ".topbar",
      ".navbar",
      ".site-nav",
      ".site-header",
      "#topbar",
      "#navbar"
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      const pos = cs.position;
      const rect = el.getBoundingClientRect();
      if ((pos === "fixed" || pos === "sticky") && rect.height > 0 && rect.top <= 0.5) {
        return Math.round(rect.height);
      }
    }
    return 0;
  }

  function resize() {
    const headerH = getTopbarOffsetPx();
    const rectBefore = wrap.getBoundingClientRect();
    const overlap = headerH > 0 && rectBefore.top < headerH ? (headerH - rectBefore.top) : 0;

    wrap.style.marginTop = overlap > 0 ? `${Math.round(overlap)}px` : "0px";

    const rectAfter = wrap.getBoundingClientRect();
    const availableH = Math.max(320, Math.floor(window.innerHeight - rectAfter.top));
    wrap.style.height = availableH + "px";

    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    DPR = dpr;

    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(320, Math.floor(rect.height));

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  window.addEventListener("resize", resize);
  resize();

  function updateRotateOverlay() {
    const isTouch = matchMedia("(pointer: coarse)").matches;
    if (!isTouch) { overlayRotate.classList.add("hidden"); return; }
    const portrait = H > W;
    overlayRotate.classList.toggle("hidden", !portrait);
  }
  window.addEventListener("resize", updateRotateOverlay);
  updateRotateOverlay();

  // --- Pointer Lock (musen låses när du klickar i spelet) ---
  function isPointerLocked() { return document.pointerLockElement === canvas; }

  function requestPointerLockSafe() {
    if (!canvas.requestPointerLock) return;
    if (paused || modalOpen || gameOver) return;
    canvas.requestPointerLock();
  }

  function exitPointerLockSafe() {
    if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  }

  document.addEventListener("pointerlockchange", () => {
    if (!isPointerLocked()) document.documentElement.classList.remove("dx-cursor-hidden");
  });

  // --- Game constants ---
  const LEVEL_COUNT = 8;
  uiLevelMax.textContent = String(LEVEL_COUNT);

  const COLORS = {
    wall: "rgba(139, 209, 234, 0.22)",
    paddle: "#7de9ef",
    ball: "#fff4dc",
    brick1: "#65cee4",
    brick2: "#ffc06b",
    brick3: "#f87f9f",
    brickPower: "#d2a0ff",
    brickInd: "#7b92a8"
  };

  // --- State ---
  let running = false;
  let paused = true;
  let gameOver = false;

  let hasStarted = false;
  let modalOpen = false;

  let levelIndex = 0;
  let lives = 3;
  let score = 0;

  // Input
  const keys = new Set();
  let usingMouse = false;
  let touchActive = false;

  // Paddle
  const paddle = {
    x: 0, y: 0,
    w: 120, h: 16,
    vx: 0,
    speed: 980,
    targetX: null
  };

  // Balls
  const balls = [];
  function makeBall(x, y, vx, vy, r=8) {
    return { x, y, vx, vy, r, pierce:false, sticky:false, stuck:false };
  }

  // Bricks / drops
  let bricks = [];
  let drops = [];

  // Powerups timers
  const powers = { wide:0, bigball:0, pierce:0, multiball:0, slow:0, sticky:0 };

  const POWER_DEFS = [
    { id:"wide", label:"Bred bräda", color:"#8ad1ff" },
    { id:"bigball", label:"Stor boll", color:"#a7ff9b" },
    { id:"pierce", label:"Genomskär", color:"#b28dff" },
    { id:"multiball", label:"Multiboll", color:"#ffd166" },
    { id:"slow", label:"Slowmo", color:"#ff9bd3" },
    { id:"sticky", label:"Klister", color:"#ff6b6b" },
  ];

  function anyBallStuck() { return balls.some(b => b.stuck); }

  function powersLabel() {
    const active = [];
    for (const def of POWER_DEFS) {
      const t = powers[def.id] || 0;
      if (t > 0) active.push(`${def.label} ${Math.ceil(t)}s`);
    }
    return active.length ? active.join(" · ") : "—";
  }

  function showStartOverlay(title, text) {
    modalOpen = true;
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    overlayCenter.classList.remove("hidden");
    overlayPause.classList.add("hidden");
    btnPlay.hidden = gameOver;
    btnPlay.textContent = levelIndex > 0 ? "▶ FORTSÄTT" : "▶ SPELA";
    document.documentElement.classList.remove("dx-cursor-hidden");
    exitPointerLockSafe();
  }

  function hideStartOverlay() {
    modalOpen = false;
    overlayCenter.classList.add("hidden");
  }

  function setPaused(p) {
    paused = p;

    const shouldShowPause = paused && running && hasStarted && !modalOpen && !gameOver;
    overlayPause.classList.toggle("hidden", !shouldShowPause);

    if (paused) {
      document.documentElement.classList.remove("dx-cursor-hidden");
      exitPointerLockSafe();
    } else {
      if (usingMouse && isPointerLocked()) document.documentElement.classList.add("dx-cursor-hidden");
    }
  }

  function updateUI() {
    uiLevel.textContent = String(levelIndex + 1);
    uiLives.textContent = String(lives);
    uiScore.textContent = String(score);
    uiPowers.textContent = powersLabel();
    if (uiTheme) uiTheme.textContent = BACKGROUND_THEMES[levelIndex % BACKGROUND_THEMES.length].name;
    const left = remainingBricks();
    const total = bricks.filter(b => !b.indestructible).length;
    const percent = total ? Math.round((1 - left / total) * 100) : 0;
    uiRemaining.textContent = String(left);
    uiProgress.style.width = percent + "%";
    uiProgressBar.setAttribute("aria-valuenow", String(percent));
  }

  // --- Levels ---
  function levelTemplate(idx, cols, rows) {
    const g = Array.from({ length: rows }, () => Array(cols).fill(0));
    const mid = Math.floor(cols / 2);
    const put = (x,y,v) => { if (y>=0 && y<rows && x>=0 && x<cols) g[y][x]=v; };

    const ring = () => {
      for (let y=0;y<rows;y++){
        for (let x=0;x<cols;x++){
          const edge = (x===0||x===cols-1||y===0||y===rows-1);
          if (edge) put(x,y, randi(1,2));
        }
      }
      for (let i=0;i<Math.floor(cols/2);i++) put(randi(1,cols-2), randi(1,rows-2), 0);
    };

    const pyramid = () => {
      for (let y=0;y<rows;y++){
        const span = Math.max(0, mid - y);
        for (let x=span; x<cols-span; x++){
          put(x,y, 1 + (y>Math.floor(rows/2)));
        }
      }
    };

    const waves = () => {
      for (let y=0;y<rows;y++){
        for (let x=0;x<cols;x++){
          const s = Math.sin((x/cols)*Math.PI*2 + y*0.7);
          if (s > 0.15) put(x,y, 1 + (s>0.65 ? 2 : 0));
        }
      }
    };

    const checker = () => {
      for (let y=0;y<rows;y++){
        for (let x=0;x<cols;x++){
          if ((x+y)%2===0) put(x,y, randi(1,3));
        }
      }
    };

    const tunnels = () => {
      for (let y=0;y<rows;y++){
        for (let x=0;x<cols;x++){
          const corridor = (x===mid || x===mid-1);
          if (!corridor || y%3===0) put(x,y, randi(1,2));
        }
      }
      for (let x=0;x<cols;x++) put(x,0,3);
    };

    const diamond = () => {
      for (let y=0;y<rows;y++){
        for (let x=0;x<cols;x++){
          const d = Math.abs(x-mid) + Math.abs(y-Math.floor(rows/2));
          if (d <= Math.floor(rows/2)) put(x,y, d<3 ? 3 : (d<5?2:1));
        }
      }
    };

    const snakes = () => {
      for (let y=0;y<rows;y++){
        const dir = y%2===0 ? 1 : -1;
        const start = dir===1 ? 0 : cols-1;
        for (let i=0;i<cols;i++){
          const x = start + dir*i;
          if (i<cols-2 || y%3===0) put(x,y, randi(1,2));
        }
        put(randi(2, cols-3), y, 0);
      }
    };

    [ring, pyramid, waves, checker, tunnels, diamond, snakes][idx % 7]();
    return g;
  }

  function buildLevel(idx) {
    scenery.image = null; // A freshly generated level gets its own background.
    const cols = clamp(Math.floor(W / 70), 9, 14);
    const rows = clamp(Math.floor(H / 52), 6, 9);

    const grid = levelTemplate(idx, cols, rows);

    const marginX = 24;
    const topY = 70;
    const gap = 6;
    const brickW = (W - marginX*2 - gap*(cols-1)) / cols;
    const brickH = clamp((H*0.26) / rows, 18, 26);

    // Ska denna bana ha indestructibles?
    const enableInd = (Math.random() < INDESTRUCTIBLE_LEVEL_CHANCE);
    let indCount = 0;

    bricks = [];
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        const hp0 = grid[y][x];
        if (!hp0) continue;

        let hp = hp0;
        if (idx >= 3 && Math.random() < 0.18) hp = clamp(hp + 1, 1, 3);
        if (idx >= 6 && Math.random() < 0.12) hp = 3;

        // Indestructible placeras mest nära botten (sista 2 raderna),
        // och bara ett begränsat antal.
        let indestructible = false;
        if (enableInd && indCount < INDESTRUCTIBLE_MAX_PER_LEVEL) {
          const nearBottom = (y >= rows - 2);
          const chance = nearBottom ? 0.22 : 0.03; // “oftast lagret ner mot brädan”
          if (Math.random() < chance) {
            indestructible = true;
            indCount++;
          }
        }

        bricks.push({
          x: marginX + x*(brickW+gap),
          y: topY + y*(brickH+gap),
          w: brickW, h: brickH,
          hp,
          maxHp: hp,
          indestructible
        });
      }
    }
  }

  function remainingBricks() {
    // indestructible räknas inte som “måste bort”
    return bricks.reduce((n,b)=> n + (!b.indestructible && b.hp>0 ? 1 : 0), 0);
  }

  // --- Reset & serve ---
  function spawnServeBall() {
    balls.length = 0;
    const b = makeBall(W/2, paddle.y - 14, 0, 0, 8);
    b.sticky = powers.sticky > 0;
    b.stuck = true;
    balls.push(b);
  }

  function launchStuckBalls() {
    for (const b of balls) {
      if (b.stuck) {
        const dir = (Math.random() < 0.5 ? -1 : 1);
        b.vx = dir * rand(120, 220);
        b.vy = -rand(420, 520);
        b.stuck = false;
      }
    }
  }

  function resetGame() {
    running = true;
    gameOver = false;

    levelIndex = 0;
    lives = 3;
    score = 0;

    for (const k in powers) powers[k] = 0;
    particles.length = 0;

    drops = [];
    balls.length = 0;

    paddle.w = 120;
    paddle.h = 16;
    paddle.x = W/2 - paddle.w/2;
    paddle.y = H - 54;
    paddle.vx = 0;
    paddle.targetX = null;

    buildLevel(levelIndex);
    spawnServeBall();

    updateUI();

    hasStarted = false;
    setPaused(true);

    showStartOverlay(
      "DX-Ball",
      `Tryck <b>Spela</b> för att starta runnen.<br>
       <b>Klicka/tappa</b> (eller <b>SPACE</b>) för att släppa kulan.<br>
       Pausa med <b>ESC</b> eller <b>P</b>.`
    );
  }

  // --- Powerups (global drop from any destroyed brick) ---
  function dropPower(x, y) {
    if (drops.length >= MAX_DROPS_ON_SCREEN) return;
    const def = POWER_DEFS[randi(0, POWER_DEFS.length - 1)];
    drops.push({ id:def.id, label:def.label, x, y, vy: rand(160,240), r:10, color:def.color });
  }

  function applyPower(id) {
    const dur = 14;
    switch (id) {
      case "wide": powers.wide = dur; break;
      case "bigball": powers.bigball = dur; break;
      case "pierce": powers.pierce = dur; break;
      case "slow": powers.slow = 10; break;
      case "sticky": powers.sticky = 12; break;
      case "multiball": {
        powers.multiball = 2;
        const newBalls = [];
        for (const b of balls) {
          if (b.stuck) continue;
          const speed = len(b.vx, b.vy);
          const a = Math.atan2(b.vy, b.vx);
          const a1 = a + rand(-0.55, -0.25);
          const a2 = a + rand(0.25, 0.55);
          newBalls.push(makeBall(b.x, b.y, Math.cos(a1)*speed, Math.sin(a1)*speed, b.r));
          newBalls.push(makeBall(b.x, b.y, Math.cos(a2)*speed, Math.sin(a2)*speed, b.r));
        }
        balls.push(...newBalls.slice(0, 4));
        break;
      }
    }
    updateUI();
  }

  function updatePaddleFromPowers(dt) {
    const baseW = 120;
    const targetW = (powers.wide > 0) ? 170 : baseW;
    paddle.w += (targetW - paddle.w) * clamp(dt*10, 0, 1);
    paddle.x = clamp(paddle.x, 10, W - paddle.w - 10);
    paddle.y = H - 54;
  }

  function updateBallFromPowers(b) {
    b.pierce = powers.pierce > 0;
    b.r = (powers.bigball > 0) ? 12 : 8;
    b.sticky = powers.sticky > 0;
  }

  // --- Input helpers ---
  function startRunIfNeeded() {
    if (!running) return;
    if (!hasStarted) hasStarted = true;
    if (modalOpen) hideStartOverlay();
    if (paused) setPaused(false);
  }

  function primaryAction() {
    startRunIfNeeded();
    if (!paused && anyBallStuck()) launchStuckBalls();
  }

  // --- Keyboard ---
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft","arrowright"," "].includes(k)) e.preventDefault();

    if (["arrowleft","arrowright","a","d"].includes(k)) {
      paddle.targetX = null;
    }

    if (k === "escape" || k === "p") {
      if (!running) return;
      if (!paused) setPaused(true);
      else startRunIfNeeded();
      return;
    }

    keys.add(k);
    if (k === " ") primaryAction();
  }, { passive: false, capture: true });

  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()), { capture: true });

  // --- Mouse / Touch ---
  function setPointerTarget(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    paddle.targetX = x - paddle.w/2;
  }

  function handleMouseMove(e) {
    usingMouse = true;

    if (isPointerLocked()) {
      const prev = paddle.x;
      paddle.x = clamp(paddle.x + e.movementX, 10, W - paddle.w - 10);
      paddle.vx = (paddle.x - prev) / (1/60);
      paddle.targetX = null;
      return;
    }

    setPointerTarget(e.clientX);
  }

  canvas.addEventListener("mousemove", handleMouseMove);

  canvas.addEventListener("mouseleave", () => {
    if (usingMouse && !isPointerLocked()) paddle.targetX = null;
  });

  canvas.addEventListener("mousedown", (e) => {
    usingMouse = true;
    canvas.focus({ preventScroll: true });

    primaryAction();

    requestPointerLockSafe();
    if (!paused) document.documentElement.classList.add("dx-cursor-hidden");
    if (!isPointerLocked()) setPointerTarget(e.clientX);
  });

  canvas.addEventListener("touchstart", (e) => {
    touchActive = true;
    usingMouse = false;
    canvas.focus({ preventScroll: true });

    const t = e.changedTouches[0];
    setPointerTarget(t.clientX);

    primaryAction();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    const t = e.changedTouches[0];
    setPointerTarget(t.clientX);
  }, { passive: false });

  canvas.addEventListener("touchend", () => { touchActive = false; });

  // Buttons
  btnPlay.addEventListener("click", () => {
    startRunIfNeeded(); // släpper inte kulan
    canvas.focus({ preventScroll: true });
  });

  btnRestart.addEventListener("click", () => resetGame());
  btnResume.addEventListener("click", () => { startRunIfNeeded(); canvas.focus({ preventScroll: true }); });
  btnRestart2.addEventListener("click", () => resetGame());
  btnPause.addEventListener("click", () => {
    if (!running || gameOver || modalOpen) return;
    setPaused(!paused);
  });

  // --- Physics helpers ---
  function reflectBall(b, nx, ny) {
    const dot = b.vx*nx + b.vy*ny;
    b.vx -= 2*dot*nx;
    b.vy -= 2*dot*ny;
  }

  function speedUp(b, amount) {
    const s = len(b.vx, b.vy);
    const ns = clamp(s + amount, 240, 860);
    const f = ns / (s || 1);
    b.vx *= f;
    b.vy *= f;
  }

  function collideBallAABB(b, r, box) {
    const cx = clamp(b.x, box.x, box.x + box.w);
    const cy = clamp(b.y, box.y, box.y + box.h);
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d2 = dx*dx + dy*dy;
    if (d2 > r*r) return { hit:false };

    const overlapX = (r - Math.abs(dx));
    const overlapY = (r - Math.abs(dy));
    if (overlapX < overlapY) return { hit:true, nx: Math.sign(dx) || 1, ny: 0 };
    return { hit:true, nx: 0, ny: Math.sign(dy) || 1 };
  }

  // --- Visual feedback only – never alters collisions, damage, or scoring.
  const particles = [];
  let sceneTime = 0;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function burst(x, y, color, amount) {
    if (reduceMotion) return;
    for (let n = 0; n < amount && particles.length < 160; n++) {
      const angle = rand(0, Math.PI * 2);
      const velocity = rand(60, 195);
      const life = rand(0.20, 0.56);
      particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        color, life, maxLife: life, size: rand(1.5, 4.2)
      });
    }
  }

  function updateVisualFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 1.4); p.vy += 95 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (const brick of bricks) {
      if (brick.flash > 0) brick.flash = Math.max(0, brick.flash - dt);
    }
  }

  // --- Loop ---
  let last = performance.now();

  function tick(now) {
    const dtRaw = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.02, dtRaw);
    sceneTime += dt * (reduceMotion ? 0 : (paused ? 0.20 : 1));

    updateRotateOverlay();

    if (running && !paused && !gameOver) step(dt);

    draw();
    requestAnimationFrame(tick);
  }

  function step(dt) {
    updateVisualFx(dt);
    for (const k in powers) if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);

    updatePaddle(dt);
    updatePaddleFromPowers(dt);

    // Drops
    for (let i=drops.length-1;i>=0;i--){
      const d = drops[i];
      d.y += d.vy * dt;

      if (d.y + d.r > paddle.y && d.y - d.r < paddle.y + paddle.h &&
          d.x > paddle.x && d.x < paddle.x + paddle.w) {
        applyPower(d.id);
        drops.splice(i, 1);
        continue;
      }
      if (d.y - d.r > H + 40) drops.splice(i, 1);
    }

    const slowFactor = (powers.slow > 0) ? 0.72 : 1.0;

    for (let bi = balls.length-1; bi >= 0; bi--) {
      const b = balls[bi];
      updateBallFromPowers(b);

      if (b.stuck) {
        b.x = clamp(paddle.x + paddle.w/2, 10, W-10);
        b.y = paddle.y - (b.r + 2);
        continue;
      }

      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 10) b.trail.shift();
      b.x += b.vx * dt * slowFactor;
      b.y += b.vy * dt * slowFactor;

      // Walls
      const left = 10, right = W - 10, top = 10;
      if (b.x - b.r < left) { b.x = left + b.r; b.vx = Math.abs(b.vx); speedUp(b, 8); }
      if (b.x + b.r > right) { b.x = right - b.r; b.vx = -Math.abs(b.vx); speedUp(b, 8); }
      if (b.y - b.r < top) { b.y = top + b.r; b.vy = Math.abs(b.vy); speedUp(b, 10); }

      // Paddle
      const hitP = collideBallAABB(b, b.r, paddle);
      if (hitP.hit && b.vy > 0) {
        burst(b.x, paddle.y, "#80edee", 8);
        b.y = paddle.y - b.r - 0.5;

        const rel = ((b.x - (paddle.x + paddle.w/2)) / (paddle.w/2));
        const relC = clamp(rel, -1, 1);

        const baseSpeed = clamp(len(b.vx, b.vy), 420, 780);
        const angle = (-Math.PI/2) + relC * (Math.PI * 0.40);
        const spin = clamp(paddle.vx / 900, -0.35, 0.35);

        b.vx = Math.cos(angle) * baseSpeed + spin * 260;
        b.vy = Math.sin(angle) * baseSpeed;

        if (b.sticky) b.stuck = true;
        else speedUp(b, 12);
      }

      // Bricks
      for (let i=0;i<bricks.length;i++){
        const br = bricks[i];
        if (br.hp <= 0) continue;

        const hit = collideBallAABB(b, b.r, br);
        if (!hit.hit) continue;

        // O-förstörbar brick: alltid studsa, aldrig skada, aldrig pierce igenom.
        if (br.indestructible) {
          burst(b.x, b.y, "#9bb4cb", 3);
          reflectBall(b, hit.nx, hit.ny);
          speedUp(b, 6); // liten “thunk”-känsla
          break;
        }

        // Normal brick:
        // Stor boll gör extra skada (2) när power är aktiv.
        const dmg = (powers.bigball > 0) ? BIGBALL_DAMAGE : 1;

        if (!b.pierce) {
          reflectBall(b, hit.nx, hit.ny);
        }

        br.hp -= dmg;
        br.flash = 0.16;
        burst(b.x, b.y, br.hp >= 3 ? COLORS.brick3 : (br.hp === 2 ? COLORS.brick2 : COLORS.brick1), br.hp <= 0 ? 11 : 5);
        score += 10;

        speedUp(b, 10 + (Math.abs(hit.nx) ? 4 : 0));

        if (br.hp <= 0) {
          score += 30;

          // Global random drop from ANY destroyed brick
          if (Math.random() < POWERUP_DROP_CHANCE) {
            dropPower(br.x + br.w/2, br.y + br.h/2);
          }
        }

        break;
      }

      // Fell out
      if (b.y - b.r > H + 40) balls.splice(bi, 1);
    }

    // Lost all balls
    if (balls.length === 0) {
      lives -= 1;
      updateUI();

      if (lives <= 0) {
        gameOver = true;
        setPaused(true);
        showStartOverlay(
          "Game Over",
          `Poäng: <b>${score}</b><br>
           Du kom till bana <b>${levelIndex + 1}</b> av <b>${LEVEL_COUNT}</b>.<br><br>
           Klicka <b>Börja om</b> för att köra igen.`
        );
        return;
      }

      spawnServeBall();
      setPaused(true);
      showStartOverlay(
        "Försök igen",
        `Du har <b>${lives}</b> liv kvar.<br>
         Tryck <b>Spela</b> för att fortsätta runnen.<br>
         <b>Klicka/tappa</b> (eller <b>SPACE</b>) för att släppa kulan.`
      );
    }

    // Level clear (indestructibles räknas inte)
    if (remainingBricks() === 0) {
      levelIndex += 1;
      updateUI();

      if (levelIndex >= LEVEL_COUNT) {
        gameOver = true;
        setPaused(true);
        showStartOverlay(
          "GG!",
          `Du klarade alla banor!<br>
           Slutpoäng: <b>${score}</b><br><br>
           Klicka <b>Börja om</b> för en ny run.`
        );
        return;
      }

      buildLevel(levelIndex);
      drops = [];
      spawnServeBall();
      setPaused(true);
      showStartOverlay(
        `Bana ${levelIndex + 1}`,
        `Ny bana laddad.<br>
         Liv: <b>${lives}</b> (fylls inte på mellan banor).<br>
         Tryck <b>Spela</b>, sen <b>klicka/tappa</b> (eller <b>SPACE</b>) för att släppa kulan.`
      );
    }

    updateUI();
  }

  function dropPower(x, y) {
    if (drops.length >= MAX_DROPS_ON_SCREEN) return;
    const def = POWER_DEFS[randi(0, POWER_DEFS.length - 1)];
    drops.push({ id:def.id, label:def.label, x, y, vy: rand(160,240), r:10, color:def.color });
  }

  function updatePaddle(dt) {
    let dir = 0;
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    if (left) dir -= 1;
    if (right) dir += 1;

    if (!isPointerLocked() && paddle.targetX !== null && (usingMouse || touchActive)) {
      const prevX = paddle.x;
      paddle.x = clamp(paddle.targetX, 10, W - paddle.w - 10);
      paddle.vx = (paddle.x - prevX) / Math.max(dt, 0.0001);
    } else if (!isPointerLocked()) {
      const vx = dir * paddle.speed;
      paddle.vx = vx;
      paddle.x += vx * dt;
      paddle.x = clamp(paddle.x, 10, W - paddle.w - 10);
    } else {
      const vx = dir * (paddle.speed * 0.7);
      paddle.x = clamp(paddle.x + vx * dt, 10, W - paddle.w - 10);
    }

    paddle.y = H - 54;
  }

  // --- Eight atmospheric scenes. All decoration is cached per level / size. ---
  // Keep the playfield readable: no foreground buildings or hard-edged icons.
  const BACKGROUND_THEMES = [
    {
      name: "TWILIGHT GARDEN", sky: ["#101b33", "#3c3d62", "#9b666c", "#142c42"],
      glow: "#ffb89b", glowX: .76, glowY: .57,
      far: "#434560", mid: "#293b54", near: "#142e41",
      fog: "#e5a3ad", sparkA: "#ffd6b3", sparkB: "#b1e7f0", kind: "dusk"
    },
    {
      name: "MOONLIT LAKE", sky: ["#07162e", "#223d63", "#3f6881", "#102638"],
      glow: "#b1d8f3", glowX: .72, glowY: .33,
      far: "#385b7a", mid: "#24465d", near: "#0c2a3e",
      fog: "#a7d2eb", sparkA: "#d1e8ff", sparkB: "#9ee3eb", kind: "lake"
    },
    {
      name: "CRIMSON DUSK", sky: ["#23162b", "#66354f", "#b86d60", "#32253c"],
      glow: "#ffc18c", glowX: .28, glowY: .61,
      far: "#725063", mid: "#43384f", near: "#2b2943",
      fog: "#f9ada6", sparkA: "#ffcea1", sparkB: "#f8a9bd", kind: "dusk"
    },
    {
      name: "TEMPLE MIST", sky: ["#141b38", "#3d4069", "#736a85", "#202b45"],
      glow: "#d3b7f4", glowX: .58, glowY: .46,
      far: "#62647f", mid: "#424d69", near: "#23344c",
      fog: "#d0c4f1", sparkA: "#ddd0ff", sparkB: "#b8d9fa", kind: "mist"
    },
    {
      name: "LANTERN NIGHT", sky: ["#071628", "#223249", "#634853", "#111c32"],
      glow: "#ffa771", glowX: .73, glowY: .69,
      far: "#42495f", mid: "#243b51", near: "#12293e",
      fog: "#efa885", sparkA: "#ffd49f", sparkB: "#ffc2a3", kind: "lantern"
    },
    {
      name: "STORM HORIZON", sky: ["#0b1424", "#28354b", "#5b6071", "#172637"],
      glow: "#b9c6e1", glowX: .43, glowY: .49,
      far: "#4a566b", mid: "#303e53", near: "#1a2b3e",
      fog: "#a9b9cb", sparkA: "#c3d8e8", sparkB: "#a5c0d8", kind: "storm"
    },
    {
      name: "AURORA PEAKS", sky: ["#071729", "#193a51", "#295b65", "#102639"],
      glow: "#7fe0c9", glowX: .53, glowY: .30,
      far: "#3d5b70", mid: "#26495b", near: "#142e43",
      fog: "#99d5d2", sparkA: "#abffde", sparkB: "#e3bbff", kind: "aurora"
    },
    {
      name: "FINAL NIGHTFALL", sky: ["#070e20", "#222345", "#4c3554", "#0c192b"],
      glow: "#bc90d7", glowX: .64, glowY: .57,
      far: "#4b4568", mid: "#2d3555", near: "#111f38",
      fog: "#ae95d3", sparkA: "#ffc1bb", sparkB: "#b5cbff", kind: "nightfall"
    }
  ];

  const scenery = { image: null, width: 0, height: 0, themeIndex: -1, light: null };

  function sceneRandom(seed) {
    // Deterministic for a given scene: resizing never changes the composition.
    const n = Math.sin(seed * 127.13 + levelIndex * 79.97) * 43758.5453;
    return n - Math.floor(n);
  }

  function glowAt(g, x, y, radius, color, alpha) {
    g.save();
    g.globalAlpha = alpha;
    const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gradient;
    g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    g.restore();
  }

  function softClouds(g, color, amount, high, strength) {
    // Blurred color fields rather than vector cloud drawings.
    for (let i = 0; i < amount; i++) {
      const x = sceneRandom(i + 1.3) * W;
      const y = H * (high + sceneRandom(i + 27.2) * .29);
      const width = W * (.13 + sceneRandom(i + 43.4) * .23);
      g.save();
      g.translate(x, y);
      g.scale(1, .25 + sceneRandom(i + 17) * .12);
      glowAt(g, 0, 0, width, color, strength * (.6 + sceneRandom(i + 13) * .4));
      g.restore();
    }
  }

  function ridge(g, baseY, amp, phase, color, opacity) {
    g.save();
    g.globalAlpha = opacity;
    g.shadowColor = color;
    g.shadowBlur = 13;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W + 12; x += 12) {
      const t = x / W;
      const y = baseY
        + Math.sin(t * Math.PI * 3.6 + phase) * amp
        + Math.sin(t * Math.PI * 8.4 + phase * .7) * amp * .25
        + Math.sin(t * Math.PI * 14 + phase * 1.3) * amp * .075;
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    g.restore();
  }

  function drawLake(g, theme) {
    const waterTop = H * .74;
    const water = g.createLinearGradient(0, waterTop, 0, H);
    water.addColorStop(0, "#41667b");
    water.addColorStop(.28, "#1c3e58");
    water.addColorStop(1, "#091f35");
    g.globalAlpha = .79;
    g.fillStyle = water;
    g.fillRect(0, waterTop, W, H - waterTop);
    g.globalAlpha = 1;

    glowAt(g, W * theme.glowX, waterTop + H * .055, W * .20, "#9dc6dc", .16);
    for (let i = 0; i < 145; i++) {
      const depth = sceneRandom(i + 301);
      const y = waterTop + H * .015 + depth * H * .22;
      const x = W * (theme.glowX + (sceneRandom(i + 812) - .5) * (.18 + depth * .84));
      const w = (5 + depth * 46) * (.4 + sceneRandom(i + 512));
      g.globalAlpha = .035 + (1 - depth) * .17;
      g.fillStyle = i % 4 === 0 ? "#e5d9d0" : "#acdfeb";
      g.fillRect(x, y, w, Math.max(1, depth * 1.5));
    }
    g.globalAlpha = 1;
  }

  function drawAurora(g) {
    // Translucent light curtains with blurred boundaries, behind the blocks.
    const strips = [
      { color: "#69d5b6", x: .20, turn: -.09, alpha: .20 },
      { color: "#8de8cf", x: .41, turn: .12, alpha: .17 },
      { color: "#a78bdc", x: .65, turn: -.07, alpha: .13 }
    ];
    g.save();
    g.globalCompositeOperation = "screen";
    for (const strip of strips) {
      g.beginPath();
      g.moveTo(W * (strip.x - .13), -H * .08);
      g.bezierCurveTo(W * (strip.x + strip.turn), H * .11,
        W * (strip.x - .16), H * .25,
        W * (strip.x + .19), H * .60);
      g.lineWidth = Math.max(45, W * .115);
      g.lineCap = "round";
      g.strokeStyle = strip.color;
      g.globalAlpha = strip.alpha;
      g.shadowBlur = 32;
      g.shadowColor = strip.color;
      g.stroke();
    }
    g.restore();
  }

  // Integrated scenery: rounded clusters share the horizon rather than
  // appearing as isolated vector buildings or icons.
  function drawTreeBand(g, baseY, color, opacity, density, maxHeight, seedOffset) {
    g.save();
    g.fillStyle = color;
    g.globalAlpha = opacity;
    g.shadowColor = color;
    g.shadowBlur = Math.max(5, Math.min(18, H * .018));
    g.fillRect(0, baseY, W, H - baseY);

    const spacing = W / density;
    for (let i = -1; i <= density; i++) {
      const jitter = sceneRandom(i + 3201 + seedOffset) * spacing * .7;
      const x = (i + .15) * spacing + jitter;
      const height = maxHeight * (.25 + sceneRandom(i + 3247 + seedOffset) * .75);
      const spread = spacing * (1.15 + sceneRandom(i + 3299 + seedOffset) * 1.6);
      const top = baseY - height;
      g.beginPath();
      g.moveTo(x - spread * .62, baseY + 2);
      g.bezierCurveTo(x - spread * .68, top + height * .63,
        x - spread * .28, top + height * .12, x - spread * .13, top + height * .14);
      g.quadraticCurveTo(x, top - height * .07, x + spread * .14, top + height * .15);
      g.bezierCurveTo(x + spread * .44, top + height * .18,
        x + spread * .72, top + height * .7, x + spread * .62, baseY + 2);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  function scatterLanternGlows(g, count, minY, maxY, color, seedOffset) {
    for (let i = 0; i < count; i++) {
      const x = sceneRandom(i + 4101 + seedOffset) * W;
      const y = H * (minY + sceneRandom(i + 4231 + seedOffset) * (maxY - minY));
      const radius = Math.min(W, H) * (.014 + sceneRandom(i + 4311 + seedOffset) * .024);
      glowAt(g, x, y, radius, color, .075 + sceneRandom(i + 4431 + seedOffset) * .14);
      // Tiny warm centres read as distant lights nested in the landscape.
      g.save();
      g.fillStyle = color;
      g.globalAlpha = .13 + sceneRandom(i + 4489 + seedOffset) * .22;
      g.beginPath();
      g.arc(x, y, Math.max(1, radius * .035), 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  function drawShrubMist(g, yTop, color) {
    const fog = g.createLinearGradient(0, yTop, 0, H);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(.43, color);
    fog.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fog;
    g.fillRect(0, yTop, W, H - yTop);
  }

  function drawLakeReeds(g) {
    g.save();
    g.strokeStyle = "#163b48";
    g.lineWidth = Math.max(1, Math.min(2.4, W / 720));
    g.globalAlpha = .32;
    for (let i = 0; i < 85; i++) {
      const x = sceneRandom(i + 5101) * W;
      const y = H * (.86 + sceneRandom(i + 5167) * .13);
      const tall = H * (.012 + sceneRandom(i + 5207) * .037);
      g.beginPath();
      g.moveTo(x, y + tall * .5);
      g.quadraticCurveTo(x + (sceneRandom(i + 5219) - .5) * 11,
        y - tall * .25, x + (sceneRandom(i + 5233) - .5) * 16, y - tall);
      g.stroke();
    }
    g.restore();
  }

  function createScenery() {
    const theme = BACKGROUND_THEMES[levelIndex % BACKGROUND_THEMES.length];
    const layer = document.createElement("canvas");
    layer.width = Math.max(1, Math.ceil(W));
    layer.height = Math.max(1, Math.ceil(H));
    const g = layer.getContext("2d");
    const light = document.body.classList.contains("light");

    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky[0]);
    sky.addColorStop(.45, theme.sky[1]);
    sky.addColorStop(.78, theme.sky[2]);
    sky.addColorStop(1, theme.sky[3]);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    // Place lighting in the *atmosphere*, not as a pasted-on building or emblem.
    glowAt(g, W * theme.glowX, H * theme.glowY, H * .68, theme.glow, .29);
    glowAt(g, W * theme.glowX, H * theme.glowY, H * .28, theme.glow, .12);

    if (theme.kind === "aurora") drawAurora(g);
    softClouds(g, theme.fog, theme.kind === "storm" ? 22 : 13,
      theme.kind === "storm" ? .13 : .28,
      theme.kind === "mist" ? .14 : .075);

    ridge(g, H * .63, H * .070, 1.4 + levelIndex * .83, theme.far, .87);
    ridge(g, H * .74, H * .047, 2.8 + levelIndex * .47, theme.mid, .96);

    if (theme.kind === "lake") {
      drawLake(g, theme);
    } else {
      ridge(g, H * .86, H * .029, 1.1 + levelIndex * .66, theme.near, 1);
    }

    // Overlapping foliage is softened into the landscape, not drawn as standalone objects.
    drawTreeBand(g, H * .83,
      theme.kind === "storm" ? "#21354a" : theme.kind === "dusk" ? "#273348" : "#1d3547",
      theme.kind === "mist" ? .29 : .37, 66, H * .081, 0);
    drawTreeBand(g, H * .90,
      theme.kind === "mist" ? "#1b3248" : "#10283a",
      theme.kind === "lake" ? .23 : .39, 90, H * .044, 131);
    if (theme.kind === "lake") drawLakeReeds(g);
    drawShrubMist(g, H * .68,
      theme.kind === "mist" ? "rgba(207,205,255,.080)" :
      theme.kind === "storm" ? "rgba(171,191,221,.058)" :
      "rgba(179,198,223,.047)");

    // Scene-specific conditions are atmospheric, never intrusive in gameplay.
    if (theme.kind === "lantern") {
      scatterLanternGlows(g, 22, .59, .87, "#ffae75", 0);
    } else if (theme.kind === "dusk") {
      scatterLanternGlows(g, 11, .68, .87, "#ffca9a", 37);
    } else if (theme.kind === "mist") {
      scatterLanternGlows(g, 8, .68, .85, "#ded5ff", 71);
    } else if (theme.kind === "aurora") {
      scatterLanternGlows(g, 9, .69, .86, "#99ecd5", 103);
    } else if (theme.kind === "storm") {
      g.save();
      g.strokeStyle = "#c5d6e7";
      g.lineWidth = 1;
      g.globalAlpha = .055;
      for (let i = 0; i < 170; i++) {
        const x = sceneRandom(i + 923) * W;
        const y = sceneRandom(i + 1139) * H;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 5, y + 13);
        g.stroke();
      }
      g.restore();
    } else if (theme.kind === "nightfall") {
      glowAt(g, W * .27, H * .24, H * .34, "#a683c7", .09);
      scatterLanternGlows(g, 8, .68, .88, "#c1a3ff", 167);
    }

    // Thin mist between foreground and playfield.
    const fog = g.createLinearGradient(0, H * .54, 0, H);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(.60, "rgba(179,186,219,.045)");
    fog.addColorStop(1, "rgba(170,196,230,.075)");
    g.fillStyle = fog;
    g.fillRect(0, H * .54, W, H * .46);
    softClouds(g, theme.fog, 10, .66, .060);

    // Small light flecks; seeded and baked into the cache so they never jitter.
    g.save();
    for (let i = 0; i < 135; i++) {
      const x = sceneRandom(i + 1551) * W;
      const y = sceneRandom(i + 1741) * H * .69;
      g.globalAlpha = .06 + sceneRandom(i + 1811) * .22;
      g.fillStyle = i % 2 ? theme.sparkA : theme.sparkB;
      const dot = i % 12 ? 1 : 2;
      g.fillRect(Math.floor(x), Math.floor(y), dot, dot);
    }
    // Light grain prevents the smooth gradients from feeling like flat vectors.
    for (let i = 0; i < 470; i++) {
      g.globalAlpha = .022;
      g.fillStyle = i % 2 ? "#ffffff" : "#05101e";
      g.fillRect(sceneRandom(i + 2031) * W,
        sceneRandom(i + 2901) * H, 2, 2);
    }
    g.restore();

    // Darkening keeps projectiles and blocks easy to track, including light mode.
    g.fillStyle = light ? "rgba(10,17,35,.13)" : "rgba(3,12,27,.19)";
    g.fillRect(0, 0, W, H);

    scenery.image = layer;
    scenery.width = W;
    scenery.height = H;
    scenery.themeIndex = levelIndex;
    scenery.light = light;
  }

  function drawAtmosphere() {
    const light = document.body.classList.contains("light");
    if (!scenery.image || scenery.width !== W || scenery.height !== H ||
        scenery.themeIndex !== levelIndex || scenery.light !== light) {
      createScenery();
    }
    ctx.drawImage(scenery.image, 0, 0, W, H);
    if (reduceMotion) return;

    const theme = BACKGROUND_THEMES[levelIndex % BACKGROUND_THEMES.length];
    for (let n = 0; n < 14; n++) {
      const seed = n * 3.87;
      const x = (W * ((n * 47 % 101) / 101) + Math.sin(sceneTime * .20 + seed) * 18 + W) % W;
      const y = (H * ((n * 13 % 29) / 29) + Math.cos(sceneTime * .27 + seed) * 11 + H) % H;
      ctx.globalAlpha = n % 4 === 0 ? .17 : .10;
      ctx.fillStyle = n % 2 ? theme.sparkA : theme.sparkB;
      ctx.fillRect(x, y, n % 5 === 0 ? 2 : 1, n % 5 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawBrick(b) {
    const r=Math.min(5,b.h*.20);
    const metal=b.indestructible;
    const color=metal?COLORS.brickInd:
      (b.hp>=3?COLORS.brick3:(b.hp===2?COLORS.brick2:COLORS.brick1));
    ctx.save();
    ctx.shadowColor=metal?"rgba(92,155,185,.17)":color;
    ctx.shadowBlur=metal?7:10;
    ctx.globalAlpha=metal?.95:1;
    ctx.fillStyle=metal?"#344c63":"#102235";
    roundRect(ctx,b.x,b.y+2,b.w,b.h,r);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle=color;
    roundRect(ctx,b.x+1,b.y,b.w-2,b.h-3,r);ctx.fill();
    // bevel and interior glints
    ctx.fillStyle=metal?"rgba(215,237,249,.20)":"rgba(255,255,255,.36)";
    ctx.fillRect(b.x+5,b.y+3,Math.max(0,b.w-10),Math.min(3,b.h*.15));
    ctx.fillStyle="rgba(11,27,50,.19)";
    ctx.fillRect(b.x+5,b.y+b.h-7,Math.max(0,b.w-10),3);
    ctx.strokeStyle=metal?"rgba(196,220,232,.38)":"rgba(255,253,239,.18)";
    ctx.lineWidth=1;ctx.strokeRect(b.x+3.5,b.y+3.5,b.w-7,b.h-9);
    if(metal) {
      ctx.fillStyle="#1f334b";
      for(let i=0;i<3;i++)ctx.fillRect(b.x+b.w*(.28+i*.22)-2,b.y+b.h*.34,4,Math.max(2,b.h*.28));
      ctx.fillStyle="#bad2dd";
      ctx.fillRect(b.x+7,b.y+b.h*.55,5,3);
      ctx.fillRect(b.x+b.w-12,b.y+b.h*.55,5,3);
    } else {
      ctx.fillStyle="rgba(255,255,255,.64)";
      ctx.fillRect(b.x+7,b.y+7,Math.min(8,b.w*.17),2);
      if(b.hp===3) {
        ctx.fillStyle="rgba(72,32,68,.38)";
        ctx.fillRect(b.x+b.w*.5-7,b.y+b.h*.5-2,14,4);
      }
    }
    if(b.flash>0) {
      ctx.fillStyle="rgba(255,255,255,"+(b.flash*.95)+")";
      roundRect(ctx,b.x+2,b.y+1,b.w-4,b.h-5,r);ctx.fill();
    }
    ctx.restore();
  }

  function drawPaddle() {
    ctx.save();
    const x = paddle.x, y = paddle.y, w = paddle.w, h = paddle.h;
    const wide = powers.wide > 0;
    const glowColor = wide ? "#ffb182" : "#5ae7eb";

    // The previous radial gradient was painted into a short rectangle (y - 35 .. y + 45),
    // clipping its upper edge into a hard horizontal line. Draw a complete, scaled
    // radial-gradient disc instead: both axes fade continuously to true transparency.
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(Math.max(w * .87, 88), Math.max(h * 4.3, 52));
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    halo.addColorStop(0, wide ? "rgba(255,180,123,.24)" : "rgba(79,224,235,.22)");
    halo.addColorStop(.52, wide ? "rgba(255,180,123,.12)" : "rgba(79,224,235,.10)");
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.shadowBlur = 17;
    ctx.shadowColor = glowColor;
    ctx.fillStyle = "#15334b";
    roundRect(ctx, x - 3, y - 2, w + 6, h + 5, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    const paint = ctx.createLinearGradient(0, y, 0, y + h);
    paint.addColorStop(0, wide ? "#ffe1a4" : "#d3ffff");
    paint.addColorStop(.4, wide ? "#f6aa7b" : "#6fe1e9");
    paint.addColorStop(1, wide ? "#bb6a74" : "#397c99");
    ctx.fillStyle = paint;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.58)";
    roundRect(ctx, x + 10, y + 2, w - 20, 2, 1);
    ctx.fill();
    ctx.fillStyle = "#17384e";
    ctx.fillRect(x + w / 2 - 9, y + 5, 18, 5);
    ctx.fillStyle = wide ? "#ffde98" : "#b4f9f2";
    ctx.fillRect(x + w / 2 - 4, y + 6, 8, 3);
    ctx.restore();
  }

  function drawBalls() {
    for (const b of balls) {
      const color=b.pierce?"#e1a9ff":(powers.bigball>0?"#ffcc81":"#c8fbf7");
      if(b.trail && !b.stuck) {
        ctx.save();
        for(let i=0;i<b.trail.length;i++) {
          const t=b.trail[i],fade=(i+1)/(b.trail.length+1);
          ctx.globalAlpha=fade*.31;ctx.fillStyle=color;
          ctx.beginPath();ctx.arc(t.x,t.y,Math.max(1,b.r*fade*.75),0,Math.PI*2);ctx.fill();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor=color;ctx.shadowBlur=b.pierce?23:17;
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(255,255,255,.88)";
      ctx.beginPath();ctx.arc(b.x-b.r*.24,b.y-b.r*.28,Math.max(1,b.r*.33),0,Math.PI*2);ctx.fill();
      if(b.pierce) {
        ctx.strokeStyle="#e1a9ff";ctx.lineWidth=2;ctx.beginPath();
        ctx.arc(b.x,b.y,b.r+4,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawDrops() {
    for(const d of drops) {
      const def=POWER_DEFS.find(item=>item.id===d.id);
      const glyph={wide:"↔",bigball:"●",pierce:"✦",multiball:"✣",slow:"◷",sticky:"◆"}[d.id] || "✦";
      const y=d.y+(reduceMotion?0:Math.sin(sceneTime*4+d.x)*2);
      ctx.save();
      ctx.translate(d.x,y);
      ctx.shadowColor=d.color;ctx.shadowBlur=20;
      ctx.fillStyle="#13263c";ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=d.color;ctx.strokeStyle=d.color;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();
      ctx.shadowBlur=0;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="bold 15px Arial,sans-serif";ctx.fillText(glyph,0,.5);
      ctx.restore();
    }
  }

  function drawParticles() {
    if(reduceMotion)return;
    ctx.save();
    for(const p of particles) {
      ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
      ctx.fillStyle=p.color;
      ctx.fillRect(p.x,p.y,p.size,p.size);
    }
    ctx.restore();
  }

  function draw() {
    drawAtmosphere();

    // Arena edges / never obscure play.
    ctx.save();
    ctx.strokeStyle=COLORS.wall;ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(10,H-16);ctx.lineTo(10,11);ctx.lineTo(W-10,11);ctx.lineTo(W-10,H-16);
    ctx.stroke();
    ctx.strokeStyle="rgba(255,187,130,.20)";
    ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(16,18);ctx.lineTo(W-16,18);ctx.stroke();
    ctx.restore();

    for(const b of bricks)if(b.hp>0)drawBrick(b);
    drawDrops();
    drawPaddle();
    drawBalls();
    drawParticles();

    if (balls.some(b=>b.stuck) && !paused && !gameOver) {
      ctx.save();
      ctx.fillStyle="#f7d5ac";ctx.globalAlpha=.75+.20*Math.sin(sceneTime*4);
      ctx.textAlign="center";ctx.font='700 13px "Pixelify Sans",Arial,sans-serif';
      ctx.fillText("KLICKA / SPACE FÖR ATT SKJUTA",W*.5,Math.max(86,paddle.y-45));
      ctx.restore();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+rr, y);
    c.arcTo(x+w, y, x+w, y+h, rr);
    c.arcTo(x+w, y+h, x, y+h, rr);
    c.arcTo(x, y+h, x, y, rr);
    c.arcTo(x, y, x+w, y, rr);
    c.closePath();
  }

  // --- Boot ---
  resetGame();
  requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) setPaused(true);
  });
})();

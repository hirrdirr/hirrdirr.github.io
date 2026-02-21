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

  const overlayCenter = document.getElementById("overlayCenter");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayText = document.getElementById("overlayText");

  const overlayPause = document.getElementById("overlayPause");
  const overlayRotate = document.getElementById("overlayRotate");

  const btnPlay = document.getElementById("btnPlay");
  const btnRestart = document.getElementById("btnRestart");
  const btnResume = document.getElementById("btnResume");
  const btnRestart2 = document.getElementById("btnRestart2");

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
    // Försök hitta en fast/sticky header/topbar (Jekyll theme varierar)
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

      // Om den ligger fast/sticky och sitter uppe vid top
      if ((pos === "fixed" || pos === "sticky") && rect.height > 0 && rect.top <= 0.5) {
        return Math.round(rect.height);
      }
    }
    return 0;
  }

  function resize() {
    // Gör så spelet hamnar UNDER topbaren (om den är fixed/sticky)
    const headerH = getTopbarOffsetPx();
    wrap.style.marginTop = headerH ? `${headerH}px` : "0px";

    // Height = viewport minus topbar
    const availableH = Math.max(320, Math.floor(window.innerHeight - headerH));
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

  // --- Game constants ---
  const LEVEL_COUNT = 8;
  uiLevelMax.textContent = String(LEVEL_COUNT);

  const COLORS = {
    wall: "rgba(255,255,255,0.10)",
    paddle: "#d7e3ff",
    ball: "#eaf2ff",
    brick1: "#d7e3ff",
    brick2: "#ffd166",
    brick3: "#ff6b6b",
    brickPower: "#b28dff"
  };

  // --- State ---
  let running = false;
  let paused = true;
  let gameOver = false;

  let hasStarted = false;   // spelarens run har startat (för pause-overlay regler)
  let modalOpen = false;    // center-overlay öppet

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
    speed: 980,     // snabbare för keyboard
    targetX: null
  };

  // Balls (multi-ball)
  const balls = [];
  function makeBall(x, y, vx, vy, r=8) {
    return { x, y, vx, vy, r, pierce:false, sticky:false, stuck:false };
  }

  // Bricks / drops
  let bricks = [];
  let drops = [];

  // Powerups timers
  const powers = {
    wide: 0,
    bigball: 0,
    pierce: 0,
    multiball: 0,
    slow: 0,
    sticky: 0,
  };

  const POWER_DEFS = [
    { id: "wide",     label: "Bred bräda",   color: "#8ad1ff" },
    { id: "bigball",  label: "Stor boll",    color: "#a7ff9b" },
    { id: "pierce",   label: "Genomskär",    color: "#b28dff" },
    { id: "multiball",label: "Multiboll",    color: "#ffd166" },
    { id: "slow",     label: "Slowmo",       color: "#ff9bd3" },
    { id: "sticky",   label: "Klister",      color: "#ff6b6b" },
  ];

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
    document.documentElement.classList.remove("dx-cursor-hidden");
  }

  function hideStartOverlay() {
    modalOpen = false;
    overlayCenter.classList.add("hidden");
  }

  function setPaused(p) {
    paused = p;

    const shouldShowPause = paused && running && hasStarted && !modalOpen && !gameOver;
    overlayPause.classList.toggle("hidden", !shouldShowPause);

    if (paused) document.documentElement.classList.remove("dx-cursor-hidden");
    else if (usingMouse) document.documentElement.classList.add("dx-cursor-hidden");
  }

  function updateUI() {
    uiLevel.textContent = String(levelIndex + 1);
    uiLives.textContent = String(lives);
    uiScore.textContent = String(score);
    uiPowers.textContent = powersLabel();
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
    const cols = clamp(Math.floor(W / 70), 9, 14);
    const rows = clamp(Math.floor(H / 52), 6, 9);

    const grid = levelTemplate(idx, cols, rows);

    const marginX = 24;
    const topY = 70;
    const gap = 6;
    const brickW = (W - marginX*2 - gap*(cols-1)) / cols;
    const brickH = clamp((H*0.26) / rows, 18, 26);

    bricks = [];
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        const hp0 = grid[y][x];
        if (!hp0) continue;

        let hp = hp0;
        if (idx >= 3 && Math.random() < 0.18) hp = clamp(hp + 1, 1, 3);
        if (idx >= 6 && Math.random() < 0.12) hp = 3;

        bricks.push({
          x: marginX + x*(brickW+gap),
          y: topY + y*(brickH+gap),
          w: brickW, h: brickH,
          hp, maxHp: hp,
          dropChance: 0.12 + idx*0.02
        });
      }
    }
  }

  function remainingBricks() {
    return bricks.reduce((n,b)=> n + (b.hp>0 ? 1 : 0), 0);
  }

  // --- Reset & serve ---
  function spawnServeBall() {
    balls.length = 0;
    const b = makeBall(W/2, paddle.y - 14, rand(-140, 140), -420, 8);
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
      `Klicka/tappa för att starta.<br>
       Styr med <b>WASD</b>, <b>piltangenter</b>, <b>mus</b> eller <b>touch</b>.<br>
       Pausa med <b>ESC</b> eller <b>P</b>.`
    );
  }

  // --- Powerups ---
  function dropPower(x, y) {
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

  // --- Input (robust: capture + focus) ---
  function onKeyDown(e) {
    const k = e.key.toLowerCase();

    // Stoppa scroll
    if (["arrowleft","arrowright"," "].includes(k)) e.preventDefault();

    // Om user kör keyboard: släpp mus-target så paddeln inte "drar iväg"
    if (["arrowleft","arrowright","a","d"].includes(k)) {
      usingMouse = false;
      touchActive = false;
      paddle.targetX = null;
    }

    if (k === "escape" || k === "p") {
      if (!running) return;
      if (!paused) setPaused(true);
      else { hideStartOverlay(); setPaused(false); }
      return;
    }

    keys.add(k);

    if (!paused && k === " ") launchStuckBalls();
  }

  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }

  window.addEventListener("keydown", onKeyDown, { passive: false, capture: true });
  window.addEventListener("keyup", onKeyUp, { capture: true });

  function setPointerTarget(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    paddle.targetX = x - paddle.w/2;
  }

  canvas.addEventListener("mousemove", (e) => {
    usingMouse = true;
    setPointerTarget(e.clientX);
  });

  canvas.addEventListener("mouseleave", () => {
    // VIKTIGT: annars kan target ligga kvar och paddeln vill “till hörnet”
    if (usingMouse) paddle.targetX = null;
  });

  canvas.addEventListener("mousedown", (e) => {
    usingMouse = true;
    canvas.focus({ preventScroll: true });

    if (!running) return;
    hasStarted = true;
    hideStartOverlay();
    if (paused) setPaused(false);
    launchStuckBalls();

    document.documentElement.classList.add("dx-cursor-hidden");
    setPointerTarget(e.clientX);
  });

  canvas.addEventListener("touchstart", (e) => {
    touchActive = true;
    usingMouse = false;
    canvas.focus({ preventScroll: true });

    const t = e.changedTouches[0];
    setPointerTarget(t.clientX);

    if (!running) return;
    hasStarted = true;
    hideStartOverlay();
    if (paused) setPaused(false);
    launchStuckBalls();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    const t = e.changedTouches[0];
    setPointerTarget(t.clientX);
  }, { passive: false });

  canvas.addEventListener("touchend", () => { touchActive = false; });

  btnPlay.addEventListener("click", () => {
    hasStarted = true;
    hideStartOverlay();
    setPaused(false);
    launchStuckBalls();
    canvas.focus({ preventScroll: true });
  });

  btnRestart.addEventListener("click", () => resetGame());
  btnResume.addEventListener("click", () => { hideStartOverlay(); setPaused(false); canvas.focus({ preventScroll: true }); });
  btnRestart2.addEventListener("click", () => resetGame());

  // --- Physics ---
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

  // --- Loop ---
  let last = performance.now();

  function tick(now) {
    const dtRaw = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.02, dtRaw);

    updateRotateOverlay();

    if (running && !paused && !gameOver) step(dt);

    draw();
    requestAnimationFrame(tick);
  }

  function step(dt) {
    for (const k in powers) if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);

    updatePaddle(dt);
    updatePaddleFromPowers(dt);

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

      b.x += b.vx * dt * slowFactor;
      b.y += b.vy * dt * slowFactor;

      const left = 10, right = W - 10, top = 10;
      if (b.x - b.r < left) { b.x = left + b.r; b.vx = Math.abs(b.vx); speedUp(b, 8); }
      if (b.x + b.r > right) { b.x = right - b.r; b.vx = -Math.abs(b.vx); speedUp(b, 8); }
      if (b.y - b.r < top) { b.y = top + b.r; b.vy = Math.abs(b.vy); speedUp(b, 10); }

      const hitP = collideBallAABB(b, b.r, paddle);
      if (hitP.hit && b.vy > 0) {
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

      for (let i=0;i<bricks.length;i++){
        const br = bricks[i];
        if (br.hp <= 0) continue;

        const hit = collideBallAABB(b, b.r, br);
        if (!hit.hit) continue;

        if (!b.pierce) reflectBall(b, hit.nx, hit.ny);

        br.hp -= 1;
        score += 10;

        speedUp(b, 10 + (Math.abs(hit.nx) ? 4 : 0));

        if (br.hp <= 0) {
          score += 30;
          if (Math.random() < br.dropChance) dropPower(br.x + br.w/2, br.y + br.h/2);
        }
        break;
      }

      if (b.y - b.r > H + 40) balls.splice(bi, 1);
    }

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
         Klicka/tappa för att fortsätta.`
      );
    }

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
         Klicka/tappa för att fortsätta.`
      );
    }

    updateUI();
  }

  function updatePaddle(dt) {
    // Tangentbord
    let dir = 0;
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    if (left) dir -= 1;
    if (right) dir += 1;

    // Mus/touch = DIREKT (ingen “max speed” lagg)
    if (paddle.targetX !== null && (usingMouse || touchActive)) {
      const prevX = paddle.x;
      paddle.x = clamp(paddle.targetX, 10, W - paddle.w - 10);
      paddle.vx = (paddle.x - prevX) / Math.max(dt, 0.0001);
    } else {
      // Keyboard
      const vx = dir * paddle.speed;
      paddle.vx = vx;
      paddle.x += vx * dt;
      paddle.x = clamp(paddle.x, 10, W - paddle.w - 10);
    }

    paddle.y = H - 54;
  }

  // --- Draw ---
  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    for (const b of bricks) {
      if (b.hp <= 0) continue;
      let col = COLORS.brick1;
      if (b.hp >= 3) col = COLORS.brick3;
      else if (b.hp === 2) col = COLORS.brick2;

      ctx.fillStyle = col;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.10)";
      roundRect(ctx, b.x+2, b.y+2, b.w-4, b.h-4, 7);
      ctx.fill();
    }

    for (const d of drops) {
      ctx.beginPath();
      ctx.fillStyle = d.color;
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.arc(d.x-2, d.y-2, d.r*0.55, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.fillStyle = COLORS.paddle;
    roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 10);
    ctx.fill();

    for (const b of balls) {
      ctx.beginPath();
      ctx.fillStyle = COLORS.ball;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();

      if (b.pierce) {
        ctx.strokeStyle = COLORS.brickPower;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r+2, 0, Math.PI*2);
        ctx.stroke();
      }
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

  // Boot
  resetGame();
  requestAnimationFrame(tick);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) setPaused(true);
  });
})();

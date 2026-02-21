(() => {
  "use strict";

  // --- Canvas & DPR resize ---
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const wrap = document.querySelector(".dxball-wrap");
  const hud = document.getElementById("hud");

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

  // Prevent page scroll on touch while playing in this area
  // (touch-action:none on canvas does most, but iOS can be… iOS.)
  ["touchmove", "gesturestart"].forEach(evt => {
    canvas.addEventListener(evt, e => e.preventDefault(), { passive: false });
  });

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randi(a, b) { return Math.floor(rand(a, b + 1)); }
  function len(x, y) { return Math.hypot(x, y); }

  let W = 800, H = 600, DPR = 1;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // cap for perf
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

  // --- Orientation hint (mobil) ---
  function updateRotateOverlay() {
    const isTouch = matchMedia("(pointer: coarse)").matches;
    if (!isTouch) { overlayRotate.classList.add("hidden"); return; }
    const portrait = H > W;
    overlayRotate.classList.toggle("hidden", !portrait);
  }
  window.addEventListener("resize", updateRotateOverlay);
  updateRotateOverlay();

  // --- Game constants ---
  const LEVEL_COUNT = 8; // 5-10: vi kör 8 stabila + random variation
  uiLevelMax.textContent = String(LEVEL_COUNT);

  const COLORS = {
    bg: "#0b0f14",
    wall: "rgba(255,255,255,0.10)",
    paddle: "#d7e3ff",
    ball: "#eaf2ff",
    text: "rgba(255,255,255,0.85)",
    brick1: "#d7e3ff",
    brick2: "#ffd166",
    brick3: "#ff6b6b",
    brickPower: "#b28dff"
  };

  // --- State ---
  let running = false;
  let paused = true;
  let gameOver = false;

  let levelIndex = 0;
  let lives = 3;
  let score = 0;

  // Input state
  const keys = new Set();
  let usingMouse = false;
  let mouseX = 0;
  let touchActive = false;

  // Paddle
  const paddle = {
    x: 0, y: 0,
    w: 120, h: 16,
    vx: 0,
    speed: 680, // px/s
    targetX: null
  };

  // Balls (multi-ball)
  const balls = [];
  function makeBall(x, y, vx, vy, r=8) {
    return {
      x, y, vx, vy, r,
      pierce: false,
      sticky: false,
      stuck: false
    };
  }

  // Bricks
  let bricks = [];
  // Drops (powerups)
  let drops = [];

  // Active powerups with timers (seconds)
  const powers = {
    wide: 0,
    bigball: 0,
    pierce: 0,
    multiball: 0, // instant effect handled on pickup, but we keep label briefly
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

  function setPaused(p) {
    paused = p;
    overlayPause.classList.toggle("hidden", !paused || !running);
    if (paused) {
      document.documentElement.classList.remove("dx-cursor-hidden");
    } else {
      if (usingMouse) document.documentElement.classList.add("dx-cursor-hidden");
    }
  }

  function showStartOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.innerHTML = text;
    overlayCenter.classList.remove("hidden");
  }

  function hideStartOverlay() {
    overlayCenter.classList.add("hidden");
  }

  function updateUI() {
    uiLevel.textContent = String(levelIndex + 1);
    uiLives.textContent = String(lives);
    uiScore.textContent = String(score);
    uiPowers.textContent = powersLabel();
  }

  // --- Levels: templates + random variation ---
  function levelTemplate(idx, cols, rows) {
    // return hp grid [rows][cols] with 0 empty, 1-3 hp, and "P" = power brick marker
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
      // holes
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
      // strong caps
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
        // carve
        put(randi(2, cols-3), y, 0);
      }
    };

    const templates = [ring, pyramid, waves, checker, tunnels, diamond, snakes];
    templates[idx % templates.length]();

    // Add some guaranteed "power" candidates by marking as 1-2 hp and setting powerChance higher
    // (We’ll handle actual drops on break with probability.)
    return g;
  }

  function buildLevel(idx) {
    const cols = clamp(Math.floor(W / 70), 9, 14);
    const rows = clamp(Math.floor(H / 52), 6, 9);

    const grid = levelTemplate(idx, cols, rows);

    // Convert to bricks with padding
    const marginX = 24;
    const topY = 70;
    const gap = 6;
    const brickW = (W - marginX*2 - gap*(cols-1)) / cols;
    const brickH = clamp((H*0.26) / rows, 18, 26);

    bricks = [];
    for (let y=0;y<rows;y++){
      for (let x=0;x<cols;x++){
        const hp = grid[y][x];
        if (!hp) continue;

        // Random spice: some bricks become tougher on higher levels
        let realHp = hp;
        if (idx >= 3 && Math.random() < 0.18) realHp = clamp(hp + 1, 1, 3);
        if (idx >= 6 && Math.random() < 0.12) realHp = 3;

        bricks.push({
          x: marginX + x*(brickW+gap),
          y: topY + y*(brickH+gap),
          w: brickW,
          h: brickH,
          hp: realHp,
          maxHp: realHp,
          // drop chance increases slightly with level
          dropChance: 0.12 + idx*0.02
        });
      }
    }
  }

  function remainingBricks() {
    return bricks.reduce((n,b)=> n + (b.hp>0 ? 1 : 0), 0);
  }

  // --- Reset & start ---
  function resetGame() {
    running = true;
    paused = true;
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

    buildLevel(levelIndex);
    spawnServeBall();

    updateUI();
    setPaused(true);

    showStartOverlay(
      "DX-Ball",
      `Klicka/tappa för att starta.<br>
       Styr med <b>WASD</b>, <b>piltangenter</b>, <b>mus</b> eller <b>touch</b>.<br>
       Pausa med <b>ESC</b> eller <b>P</b>.`
    );
  }

  function spawnServeBall() {
    balls.length = 0;
    const b = makeBall(W/2, paddle.y - 14, rand(-140, 140), -420, 8);
    b.sticky = powers.sticky > 0;
    b.stuck = true; // sits on paddle until launch
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

  // --- Powerups ---
  function dropPower(x, y) {
    const def = POWER_DEFS[randi(0, POWER_DEFS.length - 1)];
    drops.push({
      id: def.id,
      label: def.label,
      x, y,
      vy: rand(160, 240),
      r: 10,
      color: def.color
    });
  }

  function applyPower(id) {
    const dur = 14; // seconds (basic duration)
    switch (id) {
      case "wide":
        powers.wide = dur;
        break;
      case "bigball":
        powers.bigball = dur;
        break;
      case "pierce":
        powers.pierce = dur;
        break;
      case "slow":
        powers.slow = 10;
        break;
      case "sticky":
        powers.sticky = 12;
        break;
      case "multiball": {
        powers.multiball = 2; // just to show label briefly
        // spawn 2 extra balls from each existing ball
        const newBalls = [];
        for (const b of balls) {
          if (b.stuck) continue;
          const speed = len(b.vx, b.vy);
          const a1 = Math.atan2(b.vy, b.vx) + rand(-0.55, -0.25);
          const a2 = Math.atan2(b.vy, b.vx) + rand(0.25, 0.55);
          newBalls.push(makeBall(b.x, b.y, Math.cos(a1)*speed, Math.sin(a1)*speed, b.r));
          newBalls.push(makeBall(b.x, b.y, Math.cos(a2)*speed, Math.sin(a2)*speed, b.r));
        }
        balls.push(...newBalls.slice(0, 4)); // cap
        break;
      }
    }
    updateUI();
  }

  function updatePaddleFromPowers(dt) {
    // width
    const baseW = 120;
    const targetW = (powers.wide > 0) ? 170 : baseW;
    paddle.w += (targetW - paddle.w) * clamp(dt*10, 0, 1);

    // keep on screen
    paddle.x = clamp(paddle.x, 10, W - paddle.w - 10);
    paddle.y = H - 54;
  }

  function updateBallFromPowers(b) {
    b.pierce = powers.pierce > 0;
    b.r = (powers.bigball > 0) ? 12 : 8;
    b.sticky = powers.sticky > 0;
  }

  // --- Input ---
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowleft","arrowright","a","d","w","s","p","escape"," "].includes(k) || e.key === "Escape") {
      // Stop page scroll on space/arrows
      if (["arrowleft","arrowright"," "].includes(k)) e.preventDefault();
    }

    if (k === "escape" || k === "p") {
      if (!running) return;
      if (!paused) {
        setPaused(true);
      } else {
        hideStartOverlay();
        setPaused(false);
      }
      return;
    }

    keys.add(k);

    if (!paused && k === " ") {
      // Space launches stuck balls
      launchStuckBalls();
    }
  }, { passive: false });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });

  canvas.addEventListener("mousemove", (e) => {
    usingMouse = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left);
    paddle.targetX = mouseX - paddle.w/2;
  });

  canvas.addEventListener("mousedown", () => {
    usingMouse = true;
    if (!running) return;
    hideStartOverlay();
    if (paused) setPaused(false);
    launchStuckBalls();
    document.documentElement.classList.add("dx-cursor-hidden");
  });

  // Touch controls: drag paddle, tap to launch
  canvas.addEventListener("touchstart", (e) => {
    touchActive = true;
    usingMouse = false;

    const rect = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    const x = (t.clientX - rect.left);
    paddle.targetX = x - paddle.w/2;

    if (!running) return;
    hideStartOverlay();
    if (paused) setPaused(false);
    launchStuckBalls();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const t = e.changedTouches[0];
    const x = (t.clientX - rect.left);
    paddle.targetX = x - paddle.w/2;
  }, { passive: false });

  canvas.addEventListener("touchend", () => {
    touchActive = false;
  });

  // Buttons
  btnPlay.addEventListener("click", () => {
    hideStartOverlay();
    setPaused(false);
    launchStuckBalls();
  });
  btnRestart.addEventListener("click", () => resetGame());
  btnResume.addEventListener("click", () => { hideStartOverlay(); setPaused(false); });
  btnRestart2.addEventListener("click", () => resetGame());
  btnRestart2 && btnRestart2.addEventListener("click", () => resetGame());

  // --- Physics helpers ---
  function reflectBall(b, nx, ny) {
    // Reflect velocity vector around normal (nx,ny)
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
    // returns {hit, nx, ny, px, py} normal direction if collision
    const cx = clamp(b.x, box.x, box.x + box.w);
    const cy = clamp(b.y, box.y, box.y + box.h);
    const dx = b.x - cx;
    const dy = b.y - cy;
    const d2 = dx*dx + dy*dy;
    if (d2 > r*r) return { hit:false };

    // Determine side by penetration
    const overlapX = (r - Math.abs(dx));
    const overlapY = (r - Math.abs(dy));
    if (overlapX < overlapY) {
      return { hit:true, nx: Math.sign(dx) || 1, ny: 0 };
    } else {
      return { hit:true, nx: 0, ny: Math.sign(dy) || 1 };
    }
  }

  // --- Update loop ---
  let last = performance.now();

  function tick(now) {
    const dtRaw = (now - last) / 1000;
    last = now;

    // cap dt to avoid tunneling if tab was inactive
    const dt = Math.min(0.02, dtRaw);

    updateRotateOverlay();

    if (running && !paused && !gameOver) {
      step(dt);
    }

    draw();
    requestAnimationFrame(tick);
  }

  function step(dt) {
    // power timers
    for (const k in powers) {
      if (powers[k] > 0) powers[k] = Math.max(0, powers[k] - dt);
    }

    updatePaddle(dt);
    updatePaddleFromPowers(dt);

    // Drops
    for (let i=drops.length-1;i>=0;i--){
      const d = drops[i];
      d.y += d.vy * dt;
      // catch by paddle
      if (d.y + d.r > paddle.y && d.y - d.r < paddle.y + paddle.h &&
          d.x > paddle.x && d.x < paddle.x + paddle.w) {
        applyPower(d.id);
        drops.splice(i, 1);
        continue;
      }
      if (d.y - d.r > H + 40) drops.splice(i, 1);
    }

    // Balls
    const slowFactor = (powers.slow > 0) ? 0.72 : 1.0;

    for (let bi = balls.length-1; bi >= 0; bi--) {
      const b = balls[bi];
      updateBallFromPowers(b);

      if (b.stuck) {
        b.x = clamp(paddle.x + paddle.w/2, 10, W-10);
        b.y = paddle.y - (b.r + 2);
        continue;
      }

      // integrate
      b.x += b.vx * dt * slowFactor;
      b.y += b.vy * dt * slowFactor;

      // Walls
      const left = 10, right = W - 10, top = 10;
      if (b.x - b.r < left) { b.x = left + b.r; b.vx = Math.abs(b.vx); speedUp(b, 8); }
      if (b.x + b.r > right) { b.x = right - b.r; b.vx = -Math.abs(b.vx); speedUp(b, 8); }
      if (b.y - b.r < top) { b.y = top + b.r; b.vy = Math.abs(b.vy); speedUp(b, 10); }

      // Paddle collision
      const hitP = collideBallAABB(b, b.r, paddle);
      if (hitP.hit && b.vy > 0) {
        // place ball outside paddle
        b.y = paddle.y - b.r - 0.5;

        // "DX-ball" style: angle depends on hit position + paddle movement (spin)
        const rel = ((b.x - (paddle.x + paddle.w/2)) / (paddle.w/2));
        const relClamped = clamp(rel, -1, 1);

        const baseSpeed = clamp(len(b.vx, b.vy), 420, 780);
        const angle = (-Math.PI/2) + relClamped * (Math.PI * 0.40);

        // add some of paddle velocity for extra spice (wall-banks feel more alive)
        const spin = clamp(paddle.vx / 700, -0.35, 0.35);

        b.vx = Math.cos(angle) * baseSpeed + spin * 260;
        b.vy = Math.sin(angle) * baseSpeed;

        // sticky: stick ball to paddle (one bounce) if active
        if (b.sticky) {
          b.stuck = true;
        } else {
          speedUp(b, 12);
        }
      }

      // Brick collisions
      for (let i=0;i<bricks.length;i++){
        const br = bricks[i];
        if (br.hp <= 0) continue;

        const hit = collideBallAABB(b, b.r, br);
        if (!hit.hit) continue;

        // score + damage
        if (!b.pierce) {
          reflectBall(b, hit.nx, hit.ny);
        }

        br.hp -= 1;
        score += 10;

        // speed tweaks (more acceleration when wall-banking etc)
        speedUp(b, 10 + (Math.abs(hit.nx) ? 4 : 0));

        if (br.hp <= 0) {
          score += 30;
          // drop chance
          if (Math.random() < br.dropChance) {
            dropPower(br.x + br.w/2, br.y + br.h/2);
          }
        }

        break; // one brick per step to keep it stable
      }

      // Fell out
      if (b.y - b.r > H + 40) {
        balls.splice(bi, 1);
      }
    }

    // if all balls lost -> life--
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

      // serve new ball
      spawnServeBall();
      setPaused(true);
      showStartOverlay(
        "Försök igen",
        `Du har <b>${lives}</b> liv kvar.<br>
         Klicka/tappa för att fortsätta.`
      );
    }

    // Level clear
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
    let dir = 0;

    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");

    if (left) dir -= 1;
    if (right) dir += 1;

    // mouse/touch target
    if (paddle.targetX !== null && (usingMouse || touchActive)) {
      const dx = paddle.targetX - paddle.x;
      const maxMove = paddle.speed * dt;
      const mv = clamp(dx, -maxMove, maxMove);
      paddle.vx = mv / dt;
      paddle.x += mv;
    } else {
      // keyboard
      const vx = dir * paddle.speed;
      paddle.vx = vx;
      paddle.x += vx * dt;
    }

    paddle.x = clamp(paddle.x, 10, W - paddle.w - 10);
  }

  // --- Render ---
  function draw() {
    // Clear
    ctx.clearRect(0, 0, W, H);

    // Arena frame
    ctx.strokeStyle = COLORS.wall;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // Bricks
    for (const b of bricks) {
      if (b.hp <= 0) continue;

      let col = COLORS.brick1;
      if (b.hp >= 3) col = COLORS.brick3;
      else if (b.hp === 2) col = COLORS.brick2;

      ctx.fillStyle = col;
      roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();

      // small inner highlight
      ctx.fillStyle = "rgba(0,0,0,0.10)";
      roundRect(ctx, b.x+2, b.y+2, b.w-4, b.h-4, 7);
      ctx.fill();
    }

    // Drops
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

    // Paddle
    ctx.fillStyle = COLORS.paddle;
    roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 10);
    ctx.fill();

    // Balls
    for (const b of balls) {
      ctx.beginPath();
      ctx.fillStyle = COLORS.ball;
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();

      // pierce indicator
      if (b.pierce) {
        ctx.strokeStyle = COLORS.brickPower;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r+2, 0, Math.PI*2);
        ctx.stroke();
      }
    }

    // Small tip when paused but started
    if (running && paused && overlayCenter.classList.contains("hidden") && overlayPause.classList.contains("hidden")) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.fillText("Paus: ESC / P", 18, H - 18);
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

  // If user clicks outside then comes back, don’t keep cursor hidden while paused
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) setPaused(true);
  });
})();

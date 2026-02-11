(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const statusEl = document.getElementById('status');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start');
  const hsListEl = document.getElementById('hsList');

  let W=0,H=0, DPR=1;
  function resize(){
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width * DPR));
    H = Math.max(1, Math.floor(rect.height * DPR));
    canvas.width = W; canvas.height = H;
  }
  addEventListener('resize', resize);

  // --- Highscore storage ---
  const HS_KEY = 'dd_scores';
  function loadScores(){
    try{
      const raw = localStorage.getItem(HS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    }catch{
      return [];
    }
  }
  function saveScores(arr){
    localStorage.setItem(HS_KEY, JSON.stringify(arr));
  }
  function fmtDate(ts){
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  }
  function renderHighscores(list){
    const top = (list || []).slice(0,10);
    hsListEl.innerHTML = top.length ? top.map((e,i) => {
      return `<li>
        <span>${i+1}. <span class="hs-score">${e.score}</span></span>
        <span class="hs-date">${fmtDate(e.ts)}</span>
      </li>`;
    }).join('') : `<li><span>Inga highscores ännu.</span><span class="hs-date">—</span></li>`;
  }
  function pushHighscore(score){
    const list = loadScores();
    list.push({ score, ts: Date.now() });
    list.sort((a,b) => b.score - a.score);
    const trimmed = list.slice(0, 10);
    saveScores(trimmed);
    return trimmed;
  }

  // state
  const S = {
    running:false, paused:false, dead:false,
    t:0, dt:0, last:0,
    score:0,
    shake:0,
    shakeEnd: 0,
    shakeStart: 0,
    // input
    k: {l:0,r:0,u:0,d:0},
    touch: null,
    // entities
    p: {x:0,y:0,vx:0,vy:0,r:10},
    rocks: [],
    parts: [],
    spawn: 0,
    difficulty: 0
  };

  // init highs
  const initList = loadScores();
  const initHigh = initList.length ? initList[0].score : 0;
  highEl.textContent = initHigh;
  renderHighscores(initList);

  function reset(){
    S.t=0; S.score=0; S.dead=false;
    S.rocks.length=0; S.parts.length=0;
    S.spawn=0; S.difficulty=0; S.shake=0;
    S.shakeEnd = 0; S.shakeStart = 0;
    S.p.x = W*0.5; S.p.y = H*0.5;
    S.p.vx = 0; S.p.vy = 0;
    scoreEl.textContent = "0";
  }

  // input
  function setKey(code, val){
    if(code==="ArrowLeft"||code==="KeyA") S.k.l=val;
    if(code==="ArrowRight"||code==="KeyD") S.k.r=val;
    if(code==="ArrowUp"||code==="KeyW") S.k.u=val;
    if(code==="ArrowDown"||code==="KeyS") S.k.d=val;
  }
  addEventListener('keydown', (e)=>{
    if(e.code==="KeyP"){
      if(S.running && !S.dead){
        S.paused = !S.paused;
        statusEl.textContent = S.paused ? "Paused" : "Running";
      }
      return;
    }
    setKey(e.code, 1);
  });
  addEventListener('keyup', (e)=> setKey(e.code, 0));

  // touch: drag toward finger
  canvas.addEventListener('pointerdown', (e)=>{
    S.touch = {x:e.clientX, y:e.clientY};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e)=>{
    if(S.touch){ S.touch.x=e.clientX; S.touch.y=e.clientY; }
  });
  canvas.addEventListener('pointerup', ()=>{ S.touch=null; });

  function rand(a,b){ return a + Math.random()*(b-a); }

  function spawnRock(){
    // spawn from edges aimed roughly inward
    const edge = (Math.random()*4)|0;
    let x,y, vx,vy;
    const speed = (220 + S.difficulty*120) * DPR;

    if(edge===0){ x = -30*DPR; y = rand(0,H); }
    if(edge===1){ x = W+30*DPR; y = rand(0,H); }
    if(edge===2){ x = rand(0,W); y = -30*DPR; }
    if(edge===3){ x = rand(0,W); y = H+30*DPR; }

    const tx = S.p.x + rand(-120,120)*DPR;
    const ty = S.p.y + rand(-120,120)*DPR;
    const dx = tx - x, dy = ty - y;
    const d = Math.hypot(dx,dy) || 1;
    vx = dx/d * speed; vy = dy/d * speed;

    const r = rand(10, 22) * DPR;
    S.rocks.push({x,y,vx,vy,r, spin: rand(-3,3), a: rand(0,Math.PI*2)});
  }

  function burst(x,y, n){
    for(let i=0;i<n;i++){
      const a = rand(0,Math.PI*2);
      const s = rand(60, 420)*DPR;
      S.parts.push({
        x,y,
        vx:Math.cos(a)*s,
        vy:Math.sin(a)*s,
        life: rand(.25,.9),
        t:0,
        r: rand(1,3)*DPR
      });
    }
  }

  function die(ts){
    S.dead=true;
    S.running=false;
    statusEl.textContent = "Game Over";

    // shake for ~2 seconds then stop
    S.shake = 18*DPR;
    S.shakeStart = ts;
    S.shakeEnd = ts + 2000;

    burst(S.p.x, S.p.y, 80);

    const list = pushHighscore(S.score);
    highEl.textContent = list.length ? list[0].score : 0;
    renderHighscores(list);

    overlay.style.display = "block";
    startBtn.textContent = "Spela igen";
  }

  // loop
  function step(ts){
    requestAnimationFrame(step);
    if(!S.last) S.last = ts;
    S.dt = Math.min(0.033, (ts - S.last)/1000);
    S.last = ts;

    // always ensure canvas matches layout size
    resize();

    if(!S.running || S.paused){
      draw(ts);
      return;
    }

    S.t += S.dt;

    // difficulty ramps over time
    S.difficulty = Math.min(3.5, S.t / 22);

    // score
    S.score = Math.floor(S.t * 10);
    scoreEl.textContent = S.score;

    // spawn faster over time
    S.spawn -= S.dt;
    const spawnEvery = Math.max(0.14, 0.55 - S.difficulty*0.12);
    if(S.spawn <= 0){
      S.spawn = spawnEvery;
      spawnRock();
      if(Math.random() < 0.2 + S.difficulty*0.1) spawnRock();
    }

    // player physics
    const p = S.p;
    const accel = 1800 * DPR;
    let ax = (S.k.r - S.k.l);
    let ay = (S.k.d - S.k.u);

    if(S.touch){
      const tx = S.touch.x * DPR;
      const ty = S.touch.y * DPR;
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx,dy) || 1;
      ax = dx/d; ay = dy/d;
    }

    p.vx += ax * accel * S.dt;
    p.vy += ay * accel * S.dt;

    // drift + damping
    const damp = Math.pow(0.0008, S.dt);
    p.vx *= damp; p.vy *= damp;

    // speed cap
    const maxV = (620 + S.difficulty*120) * DPR;
    const v = Math.hypot(p.vx,p.vy);
    if(v > maxV){ p.vx = p.vx/v*maxV; p.vy = p.vy/v*maxV; }

    p.x += p.vx * S.dt;
    p.y += p.vy * S.dt;

    // bounds bounce (soft)
    const margin = 12*DPR;
    if(p.x < margin){ p.x = margin; p.vx *= -0.55; S.shake = Math.max(S.shake, 6*DPR); }
    if(p.x > W-margin){ p.x = W-margin; p.vx *= -0.55; S.shake = Math.max(S.shake, 6*DPR); }
    if(p.y < margin){ p.y = margin; p.vy *= -0.55; S.shake = Math.max(S.shake, 6*DPR); }
    if(p.y > H-margin){ p.y = H-margin; p.vy *= -0.55; S.shake = Math.max(S.shake, 6*DPR); }

    // rocks update + collision
    for(let i=S.rocks.length-1;i>=0;i--){
      const r = S.rocks[i];
      r.x += r.vx * S.dt;
      r.y += r.vy * S.dt;
      r.a += r.spin * S.dt;

      // remove offscreen far
      if(r.x < -140*DPR || r.x > W+140*DPR || r.y < -140*DPR || r.y > H+140*DPR){
        S.rocks.splice(i,1);
        continue;
      }

      const dx = r.x - p.x, dy = r.y - p.y;
      const d = Math.hypot(dx,dy);
      if(d < r.r + p.r){
        S.shake = 20*DPR;
        burst(r.x, r.y, 40);
        die(ts);
        break;
      }
    }

    // particles
    for(let i=S.parts.length-1;i>=0;i--){
      const q = S.parts[i];
      q.t += S.dt;
      q.x += q.vx * S.dt;
      q.y += q.vy * S.dt;
      q.vx *= Math.pow(0.02, S.dt);
      q.vy *= Math.pow(0.02, S.dt);
      if(q.t >= q.life) S.parts.splice(i,1);
    }

    // shake decay while running
    S.shake *= Math.pow(0.03, S.dt);

    draw(ts);
  }

  function draw(ts){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0,0,W,H);

    // death shake timer (2s) + stop
    let sh = S.shake;
    if(S.shakeEnd && ts >= S.shakeEnd){
      sh = 0;
      S.shake = 0;
      S.shakeEnd = 0;
      S.shakeStart = 0;
    } else if(S.shakeEnd && ts < S.shakeEnd){
      const total = (S.shakeEnd - S.shakeStart) || 2000;
      const left = (S.shakeEnd - ts);
      const k = Math.max(0, Math.min(1, left / total));
      sh = sh * k;
    }

    const ox = (Math.random()*2-1) * sh;
    const oy = (Math.random()*2-1) * sh;
    ctx.translate(ox, oy);

    const g = ctx.createRadialGradient(W*0.5,H*0.5, 40*DPR, W*0.5,H*0.5, Math.max(W,H)*0.65);
    g.addColorStop(0, "rgba(120,160,255,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // rocks
    for(const r of S.rocks){
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.a);

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(220,235,255,0.12)";
      ctx.beginPath();
      ctx.arc(0,0,r.r*1.15,0,Math.PI*2);
      ctx.fill();

      ctx.strokeStyle = "rgba(200,220,255,0.28)";
      ctx.lineWidth = 2*DPR;
      ctx.beginPath();
      const spikes = 7 + (r.r/DPR|0)%4;
      for(let i=0;i<spikes;i++){
        const a = i/spikes * Math.PI*2;
        const rr = r.r * (0.72 + 0.38*Math.sin(i*1.7 + r.a*2));
        const x = Math.cos(a)*rr, y = Math.sin(a)*rr;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    // player trail
    const p = S.p;
    const speed = Math.hypot(p.vx,p.vy);
    const trail = Math.min(18*DPR, 6*DPR + speed*0.02);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "rgba(140,190,255,0.55)";
    ctx.lineWidth = 3*DPR;
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx*0.02, p.y - p.vy*0.02);
    ctx.lineTo(p.x - p.vx*0.04, p.y - p.vy*0.04);
    ctx.stroke();

    // player glow
    ctx.globalAlpha = 1;
    const pg = ctx.createRadialGradient(p.x,p.y, 2*DPR, p.x,p.y, (p.r+trail)*1.7);
    pg.addColorStop(0, "rgba(160,210,255,0.9)");
    pg.addColorStop(1, "rgba(160,210,255,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(p.x,p.y,(p.r+trail)*1.7,0,Math.PI*2);
    ctx.fill();

    // player core
    ctx.fillStyle = "rgba(210,235,255,0.95)";
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();

    // particles
    for(const q of S.parts){
      const a = 1 - (q.t/q.life);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(180,220,255,0.9)";
      ctx.beginPath();
      ctx.arc(q.x,q.y,q.r,0,Math.PI*2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if(S.dead) statusEl.textContent = "Game Over";
    else if(S.paused) statusEl.textContent = "Paused";
    else if(S.running) statusEl.textContent = "Running";
    else statusEl.textContent = "Ready";
  }

  startBtn.addEventListener('click', ()=>{
    overlay.style.display = "none";
    S.paused = false;
    // sync sizes before placing player
    resize();
    reset();
    S.running = true;
    statusEl.textContent = "Running";
    if(!S.last) S.last = performance.now();
  });

  requestAnimationFrame(step);
})();
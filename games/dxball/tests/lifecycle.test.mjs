import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame,brick,arena} from './harness.mjs';

test('all eight levels and seven upgrade drafts complete without losing the build or timed buffs',()=>{
  for(const seed of [7,23,52]) {
    const g=loadGame({seed});g.api.primaryAction();g.api.applyPower('orbit');g.api.applyPower('turret');
    g.api.state={lives:2};
    for(let level=0;level<8;level++) {
      assert.equal(g.api.state.levelIndex,level);
      assert.ok(g.api.state.bricks.some(b=>!b.indestructible));
      for(const b of g.api.state.bricks)if(!b.indestructible)b.hp=0;
      g.api.step(1/120);
      if(level===7)break;
      const choices=g.api.state.draftChoices;
      assert.equal(choices.length,3);assert.equal(new Set(choices.map(d=>d.id)).size,3);
      const id=choices[0].id,before=g.api.state.runUpgrades[id];
      g.api.chooseUpgrade(id);g.api.chooseUpgrade(id);
      assert.equal(g.api.state.runUpgrades[id],before+1);
      assert.equal(g.api.state.paused,true);
      g.api.primaryAction();
    }
    assert.equal(g.api.state.gameOver,true);
    assert.equal(Object.values(g.api.state.runUpgrades).reduce((a,b)=>a+b,0),7);
    assert.equal(g.api.state.weaponBuffs.orbit.length,1);
    assert.equal(g.api.state.weaponBuffs.turret.length,1);
    assert.equal(g.elements.get('uiLevel').textContent,'8');
    g.api.primaryAction();assert.equal(g.api.state.paused,true);
    g.api.resetGame();
    assert.equal(g.api.state.levelIndex,0);assert.equal(g.api.state.score,0);
    assert.equal(Object.values(g.api.state.runUpgrades).reduce((a,b)=>a+b,0),0);
    assert.equal(g.api.state.weaponBuffs.orbit.length,0);
  }
});

test('a clear on the last-ball frame wins over life loss',()=>{
  const g=loadGame();g.api.primaryAction();g.api.state={bricks:[brick(400,180,0)],lives:1};
  const b=g.api.state.balls[0];b.x=400;b.y=720;b.vx=0;b.vy=500;
  g.api.step(1/120);
  assert.equal(g.api.state.lives,1);assert.equal(g.api.state.gameOver,false);
  assert.equal(g.api.state.levelIndex,1);assert.equal(g.api.state.draftChoices.length,3);
});

test('losing every ball costs one life, resets combo, and preserves permanent upgrades',()=>{
  const g=loadGame();arena(g);g.api.state.runUpgrades.satellite=2;
  const target=g.api.state.bricks[0];g.api.damageBrick(target,1,435,190);
  g.api.state.balls.push(g.api.makeBall(400,720,0,500),g.api.makeBall(430,720,0,500));
  g.api.step(1/120);
  assert.equal(g.api.state.lives,2);assert.equal(g.api.state.balls.length,1);
  assert.equal(g.api.state.balls[0].stuck,true);assert.equal(g.api.state.comboHits,0);
  assert.equal(g.api.orbitCount(),2);
});

test('pause, hidden tabs, focus loss and long stalls never simulate accumulated menu time',()=>{
  const g=loadGame();g.api.startRunIfNeeded();g.api.applyPower('orbit');g.frame(1000);
  g.key('ArrowRight');g.document.hidden=true;g.dispatch('visibilitychange');
  const timer=g.api.state.weaponBuffs.orbit[0];g.frame(301000);
  assert.equal(g.api.state.weaponBuffs.orbit[0],timer);
  g.document.hidden=false;g.api.startRunIfNeeded();const x=g.api.state.paddle.x;
  g.frame(301017);assert.equal(g.api.state.paddle.x,x);
  assert.ok(timer-g.api.state.weaponBuffs.orbit[0]<.02);
  g.dispatch('blur');g.frame(601017);assert.equal(g.api.state.paused,true);
  g.api.startRunIfNeeded();g.frame(602017);
  assert.ok(timer-g.api.state.weaponBuffs.orbit[0]<.09,'catch-up work must be bounded');
});

test('P still resumes after clicking Pause, while Space on a menu button keeps native activation',()=>{
  const g=loadGame();g.api.startRunIfNeeded();g.elements.get('btnPause').dispatch('click');
  const button={closest:selector=>selector.includes('button')?{}:null};
  g.key('p',{target:button});assert.equal(g.api.state.paused,false);
  g.api.setPaused(true);g.key(' ',{target:button});assert.equal(g.api.state.paused,true);
});

test('pointer-lock movement produces spin only while the paddle actually moves',()=>{
  const g=loadGame();g.api.startRunIfNeeded();const canvas=g.elements.get('game');
  g.document.pointerLockElement=canvas;const x=g.api.state.paddle.x;
  canvas.dispatch('mousemove',{movementX:12});g.api.step(1/120);
  assert.equal(g.api.state.paddle.x,x+12);assert.ok(g.api.state.paddle.vx>0);
  g.api.step(1/120);assert.equal(g.api.state.paddle.vx,0);
});

test('resize preserves brick damage and the build and pauses safely with every target still on screen',()=>{
  const g=loadGame({width:1920,height:1080,dpr:2});g.api.primaryAction();
  g.api.state.runUpgrades.satellite=2;
  const bricks=g.api.state.bricks, hp=bricks.map(b=>b.hp);bricks[0].hp=0;hp[0]=0;
  for(const [w,h] of [[844,326],[320,620],[1920,1080]]) {
    g.resize(w,h);
    assert.deepEqual(bricks.map(b=>b.hp),hp);
    assert.ok(bricks.every(b=>b.x>=23.99&&b.x+b.w<=w-23.99&&b.y>=69.99&&b.y+b.h<h-80));
    assert.equal(g.api.state.paused,true);assert.equal(g.api.orbitCount(),2);
    assert.ok(g.api.state.balls.every(b=>b.x>0&&b.x<w&&b.y<h));
  }
});

test('backing buffers respect the pixel budget on 4K high-DPI displays',()=>{
  for(const [width,height,dpr] of [[1920,1080,2],[3840,2160,2],[844,390,3]]) {
    const g=loadGame({width,height,dpr}),canvas=g.elements.get('game');
    assert.ok(canvas.width*canvas.height<=2400000);
    assert.ok(g.api.state.DPR<=1.5);
  }
});

test('short landscape playfields fit the viewport and leave room below every level',()=>{
  for(const height of [180,210,282,326]) {
    const g=loadGame({width:844,height});
    assert.equal(g.api.state.H,height);
    for(let level=0;level<8;level++) {
      g.api.buildLevel(level);
      assert.ok(g.api.state.bricks.some(b=>!b.indestructible));
      assert.ok(g.api.state.bricks.every(b=>b.y+b.h<g.api.state.paddle.y-20));
    }
  }
});

test('weapon-heavy rendering reuses sprites and never rebuilds scenery or reads layout each frame',()=>{
  const g=loadGame();g.api.primaryAction();
  g.api.state.runUpgrades.satellite=2;
  for(let i=0;i<3;i++)g.api.applyPower('orbit');
  for(let i=0;i<3;i++)g.api.applyPower('multiball');
  g.api.applyPower('bigball');g.api.applyPower('pierce');g.api.step(1/120);
  g.api.draw();const canvases=[...g.elements.keys()].filter(k=>k.startsWith('canvas')).length;
  const layouts=g.counts.layout;
  for(let i=0;i<60;i++)g.api.draw();
  assert.equal([...g.elements.keys()].filter(k=>k.startsWith('canvas')).length,canvases);
  assert.equal(g.counts.layout,layouts);assert.equal(g.api.orbitCount(),5);
  assert.equal(g.api.state.balls.length,6);assert.ok(g.api.state.particles.length<=160);
});

test('reduced motion suppresses particles and trails while keeping bank cues and gameplay',()=>{
  const g=loadGame({reducedMotion:true});g.api.primaryAction();
  g.api.damageBrick(g.api.state.bricks.find(b=>!b.indestructible),1,400,180);
  g.frame(0);g.frame(1000/60);
  assert.equal(g.api.state.particles.length,0);
  assert.ok(g.api.state.balls.every(b=>!b.trail?.length));
  g.api.state.balls[0].bankCharged=true;g.api.updateUI();
  assert.equal(g.elements.get('uiBank').hidden,false);
});

test('bank points use the newly earned combo multiplier and Combo Keeper still extends its window',()=>{
  const g=loadGame(),target=brick(40,250,3);arena(g,[target]);
  for(let i=0;i<4;i++)g.api.damageBrick(brick(600,100,3),1,600,100,'turret');
  g.api.state.runUpgrades.combo=2;
  g.api.state.balls.push(g.api.makeBall(30,310,-400,-300));g.advance(.12);
  assert.equal(target.hp,1);assert.equal(g.api.state.comboMultiplier,2);
  assert.equal(g.api.state.score,120);assert.ok(g.api.state.comboTimer>4);
});

test('maximum combined weapons remain finite and bounded in a deterministic 60-second stress run',()=>{
  const g=loadGame();g.api.primaryAction();
  Object.assign(g.api.state.runUpgrades,{satellite:2,turret:1,sturdy:2,combo:2,scavenger:2,magnet:2});
  for(let n=0;n<3600;n++) {
    const s=g.api.state;
    if(s.gameOver)g.api.resetGame();
    if(s.draftChoices.length)g.api.chooseUpgrade(s.draftChoices[0].id);
    g.api.primaryAction();
    if(n%60===0)for(const power of ['orbit','turret','multiball','bigball','pierce','wide','slow'])g.api.applyPower(power);
    const descending=g.api.state.balls.find(b=>b.vy>0);
    if(descending)g.api.state.paddle.x=Math.max(10,Math.min(950-g.api.state.paddle.w,descending.x-g.api.state.paddle.w/2));
    g.api.step(1/60);
    const state=g.api.state;
    assert.ok(state.balls.length<=6 && state.turretBullets.length<=4 && state.drops.length<=4 && state.particles.length<=160);
    assert.ok(state.balls.every(b=>Number.isFinite(b.x+b.y+b.vx+b.vy)&&Math.hypot(b.vx,b.vy)<=860.001));
  }
});

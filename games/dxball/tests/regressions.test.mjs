import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame,brick,arena} from './harness.mjs';

test('repeated multiball pickups keep the total ball population bounded',()=>{
  const g=loadGame();g.api.primaryAction();
  for(let i=0;i<20;i++)g.api.applyPower('multiball');
  assert.ok(g.api.state.balls.length<=6);
});

test('piercing damage is once per passage, not once per simulation frame',()=>{
  const g=loadGame(), target=brick();arena(g,[target]);
  const b=g.api.makeBall(435,220,0,-250);g.api.state.balls.push(b);
  g.api.applyPower('pierce');g.advance(.16);
  assert.equal(target.hp,2);
  assert.equal(g.api.state.comboHits,1);
});

test('upgrade choice cannot be bypassed by gameplay shortcuts',()=>{
  const g=loadGame();g.api.primaryAction();g.api.showUpgradeDraft();
  g.key(' ');g.key('p');g.key('Escape');g.api.primaryAction();
  assert.equal(g.api.state.paused,true);
  assert.equal(g.api.state.modalOpen,true);
});

test('30–240 Hz callbacks advance the same game clock and cap rendering at 60 Hz',()=>{
  for(const hz of [30,60,90,120,144,240]){
    const g=loadGame();g.api.startRunIfNeeded();g.api.applyPower('wide');
    const initial=g.api.state.powers.wide;g.frame(0);
    const before=g.counts.drawImage||0;
    // A stuck ball avoids random collisions and keeps the level active.
    for(let i=1;i<=hz*2;i++)g.frame(i*1000/hz);
    assert.ok(Math.abs(initial-g.api.state.powers.wide-2)<.02,`${hz} Hz timer drift`);
    const drawCount=(g.counts.drawImage-before)/(g.api.state.bricks.length+2);
    assert.ok(drawCount<=122,`${hz} Hz rendered too often`);
  }
});

test('ball motion and collisions are identical across display refresh rates',()=>{
  let reference;
  for(const hz of [30,60,90,120,144,240]) {
    const g=loadGame();arena(g,[brick(200,220,3)]);
    g.api.state.balls.push(g.api.makeBall(25,450,-200,-400));g.frame(0);
    for(let i=1;i<=hz;i++)g.frame(i*1000/hz);
    const b=g.api.state.balls[0];
    const result=[b.x,b.y,b.vx,b.vy,g.api.state.score,g.api.state.bricks[0].hp];
    reference??=result;
    result.forEach((value,i)=>assert.ok(Math.abs(value-reference[i])<1e-7,`${hz} Hz trajectory differs`));
  }
});

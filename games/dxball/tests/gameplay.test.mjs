import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame,brick,arena} from './harness.mjs';

function bankSetup({heavy=false,pierce=false,metal=false}={}) {
  const g=loadGame(),target=brick(40,250,3,{indestructible:metal});
  arena(g,[target]);
  const ball=g.api.makeBall(30,310,-400,-300);
  g.api.state.balls.push(ball);
  if(heavy)g.api.applyPower('bigball');
  if(pierce)g.api.applyPower('pierce');
  return {g,target,ball};
}

test('a side-wall bank rewards one extra damage and combo-scaled bonus points',()=>{
  const {g,target,ball}=bankSetup();g.advance(.12);
  assert.equal(target.hp,1);assert.equal(g.api.state.score,40);
  assert.equal(g.api.state.comboHits,1);
  assert.equal(ball.bankCharged,false);assert.equal(ball.bankEligible,false);
  assert.match(g.api.state.eventFeedback.label,/BANKSKOTT/);
  // A wall later in the same flight must not rearm it.
  ball.x=19;ball.y=400;ball.vx=-400;ball.vy=0;g.advance(.02);
  assert.equal(ball.bankCharged,false);
});

test('bank + heavy + pierce stack once; metal consumes the bank without taking damage',()=>{
  const {g,target,ball}=bankSetup({heavy:true,pierce:true});g.advance(.12);
  assert.equal(target.hp,0);assert.equal(g.api.state.score,70);
  assert.ok(ball.vy<0);assert.equal(ball.bankCharged,false);
  const m=bankSetup({heavy:true,pierce:true,metal:true});m.g.advance(.12);
  assert.equal(m.target.hp,3);assert.equal(m.g.api.state.score,0);
  assert.equal(m.ball.bankCharged,false);assert.equal(m.ball.bankEligible,false);
});

test('direct hits cannot charge a bank until the ball returns to the paddle',()=>{
  const g=loadGame(),target=brick();arena(g,[target]);
  const b=g.api.makeBall(435,215,0,-500);g.api.state.balls.push(b);g.advance(.02);
  assert.equal(target.hp,2);assert.equal(b.bankEligible,false);
  b.x=19;b.y=400;b.vx=-500;b.vy=0;g.advance(.02);assert.equal(b.bankCharged,false);
  const p=g.api.state.paddle;b.x=p.x+p.w/2;b.y=p.y-9;b.vx=0;b.vy=500;
  g.advance(.02);assert.equal(b.bankEligible,true);assert.ok(b.vy<0);
});

test('a banked mystery brick still explains its mystery effect',()=>{
  const {g,target}=bankSetup();target.mystery=true;target.hp=1;g.advance(.12);
  assert.equal(target.hp,0);assert.match(g.api.state.eventFeedback.label,/MYSTERY/);
  assert.ok(g.api.state.score>=70);
});

test('pickup magnet, permanent width, temporary width and mystery shrink compose',()=>{
  const g=loadGame();g.api.startRunIfNeeded();
  g.api.state.runUpgrades.sturdy=2;g.api.state.runUpgrades.magnet=2;
  const p=g.api.state.paddle;
  g.api.state={mysteryShrink:6,drops:[{id:'wide',x:p.x-25,y:p.y-20,vy:160,r:10}]};
  g.advance(1);
  assert.equal(g.api.state.drops.length,0);assert.ok(g.api.state.powers.wide>12);
  assert.ok(Math.abs(p.w-161)<.01);
  g.advance(5.2);g.advance(1);assert.ok(Math.abs(p.w-206)<.01);
});

test('pierce hits every crossed tile in travel order; each can be hit again after exit',()=>{
  const g=loadGame(),low=brick(400,210,3,{h:10}),high=brick(400,190,3,{h:10});
  arena(g,[high,low]); // Array order deliberately opposes travel order.
  const b=g.api.makeBall(435,240,0,-800);g.api.state.balls.push(b);
  g.api.applyPower('pierce');g.api.step(.06);
  assert.equal(low.hp,2);assert.equal(high.hp,2);assert.equal(g.api.state.comboHits,2);
  g.advance(.05);b.vy=Math.abs(b.vy);g.advance(.12);
  assert.equal(high.hp,1);assert.equal(low.hp,1);
});

test('slow and heavy pierce damage once per passage; expiry inside does not damage twice',()=>{
  for(const heavy of [false,true]) {
    const g=loadGame(),target=brick();arena(g,[target]);
    g.api.state.balls.push(g.api.makeBall(435,220,0,-250));
    g.api.applyPower('pierce');g.api.applyPower('slow');if(heavy)g.api.applyPower('bigball');
    g.advance(.08);assert.equal(target.hp,heavy?1:2);
    g.api.state.powers.pierce=.001;g.advance(.03);
    assert.equal(target.hp,heavy?1:2);assert.equal(g.api.state.comboHits,1);
  }
});

test('nearest metal blocks piercing and turrets; embedded balls recover without sticking',()=>{
  const g=loadGame(),behind=brick(400,160,3),metal=brick(400,205,3,{indestructible:true});
  arena(g,[behind,metal]);g.api.applyPower('pierce');
  const b=g.api.makeBall(435,239,0,-860);g.api.state.balls.push(b);g.advance(.04);
  assert.ok(b.vy>0);assert.equal(metal.hp,3);assert.equal(behind.hp,3);
  g.api.state={turretBullets:[{x:435,y:250,vy:-510}]};g.api.updateTurrets(.15);
  assert.equal(g.api.state.turretBullets.length,0);assert.equal(behind.hp,3);
  b.x=435;b.y=214;b.vx=0;b.vy=-500;g.advance(.04);
  assert.ok(b.y<metal.y-b.r || b.y>metal.y+metal.h+b.r);
  assert.ok(Number.isFinite(b.x+b.y+b.vx+b.vy));
});

test('swept paddle catches a fast ball and sticky still gives exactly three aimed catches',()=>{
  const g=loadGame();arena(g);const p=g.api.state.paddle;
  const b=g.api.makeBall(p.x+p.w/2,p.y-30,0,860);g.api.state.balls.push(b);
  g.api.applyPower('sticky');
  for(let i=0;i<3;i++) {
    b.x=p.x+p.w/2;b.y=p.y-30;b.vx=0;b.vy=860;g.api.step(.06);
    assert.equal(b.stuck,true);assert.equal(b.aiming,true);
    assert.equal(g.api.state.powers.sticky,2-i);
    g.key('e');g.api.launchStuckBalls();assert.ok(b.vx>0);assert.ok(b.vy<0);
  }
  b.x=p.x+p.w/2;b.y=p.y-30;b.vx=0;b.vy=860;g.api.step(.06);
  assert.equal(b.stuck,false);assert.ok(b.vy<0);
});

test('permanent and individually timed weapons stack above their upgrade caps and expire independently',()=>{
  const g=loadGame();g.api.startRunIfNeeded();
  const s=g.api.state;s.runUpgrades.satellite=2;s.runUpgrades.turret=1;
  g.api.applyPower('orbit');g.api.applyPower('turret');g.advance(3);
  g.api.applyPower('orbit');g.api.applyPower('turret');
  assert.equal(g.api.orbitCount(),4);assert.equal(g.api.turretPairs(),3);
  g.advance(13.05);assert.equal(g.api.orbitCount(),3);assert.equal(g.api.turretPairs(),2);
  g.advance(3);assert.equal(g.api.orbitCount(),2);assert.equal(g.api.turretPairs(),1);
  for(let i=0;i<10;i++){g.api.applyPower('orbit');g.api.applyPower('turret');}
  assert.equal(g.api.orbitCount(),5);assert.equal(g.api.turretPairs(),3);
});

test('satellites share the brick cooldown and cannot spend the main ball bank',()=>{
  const g=loadGame(),target=brick(400,180,3);arena(g,[target]);
  g.api.state.runUpgrades.satellite=2;
  for(let i=0;i<6;i++) {const b=g.api.makeBall(435,191,0,0);b.bankCharged=true;g.api.state.balls.push(b);}
  g.api.updateSatellites(.01);assert.equal(target.hp,2);
  g.api.updateSatellites(.1);assert.equal(target.hp,2);
  assert.ok(g.api.state.balls.every(b=>b.bankCharged));
  g.api.updateSatellites(.54);assert.equal(target.hp,1);
});

test('turret bullets finish after buffs expire, respect nearest tiles, and never inherit heavy damage',()=>{
  const g=loadGame(),low=brick(400,220,3),high=brick(400,180,3);arena(g,[high,low]);
  g.api.applyPower('bigball');g.api.state={turretBullets:[{x:435,y:270,vy:-510}]};
  g.api.updateTurrets(.2);assert.equal(low.hp,2);assert.equal(high.hp,3);
  assert.equal(g.api.state.turretBullets.length,0);
});

test('multiball cap pickups award points without inflating combo; splits cannot duplicate bank rewards',()=>{
  const {g,ball}=bankSetup();g.advance(.04);assert.equal(ball.bankCharged,true);
  g.api.applyPower('multiball');assert.equal(g.api.state.balls.filter(b=>b.bankCharged).length,1);
  assert.equal(g.api.state.balls.slice(1).every(b=>!b.bankEligible),true);
  for(let i=0;i<4;i++)g.api.applyPower('multiball');
  const {score,comboHits}=g.api.state;g.api.applyPower('multiball');
  assert.equal(g.api.state.balls.length,6);assert.equal(g.api.state.score,score+100);
  assert.equal(g.api.state.comboHits,comboHits);
});

test('multiball collected while caught queues real launchable balls',()=>{
  const g=loadGame();g.api.startRunIfNeeded();g.api.applyPower('sticky');g.api.applyPower('multiball');
  assert.equal(g.api.state.balls.length,3);assert.ok(g.api.state.balls.every(b=>b.stuck&&b.aiming));
  g.api.launchStuckBalls();assert.ok(g.api.state.balls.every(b=>!b.stuck&&b.vy<0));
  assert.equal(g.api.state.powers.sticky,3);
});

test('mystery effects retain bounded chains/drops and cannot damage indestructible neighbors',()=>{
  const seen=new Set();
  for(let seed=1;seed<=100 && seen.size<4;seed++) {
    const g=loadGame({seed}),mystery=brick(400,180,1,{mystery:true});
    const neighbors=[brick(400,208,2),brick(475,180,2),brick(475,208,2),brick(400,236,2)];
    const metal=brick(380,180,3,{indestructible:true});arena(g,[mystery,...neighbors,metal]);
    g.api.damageBrick(mystery,1,435,190,'ball');
    const label=g.api.state.eventFeedback.label;seen.add(label.split('•')[1].trim().replace(/\+\d+ POÄNG/,'bonus'));
    assert.equal(metal.hp,3);assert.ok(neighbors.filter(b=>b.hp<2).length<=3);
    assert.ok(g.api.state.drops.length<=4);assert.ok(g.api.state.particles.length<=160);
  }
  assert.equal(seen.size,4);
});

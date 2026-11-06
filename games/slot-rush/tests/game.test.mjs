import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGame,select,drive} from './harness.mjs';
test('all ten maps and both lanes are closed, smooth and complete a valid recorded race',()=>{
 const g=loadGame();
 for(let map=0;map<10;map++)for(let lane=0;lane<2;lane++){
  select(g,map,lane);const length=g.api.getState().trackLength;
  const a=g.api.laneAt(0),b=g.api.laneAt(length-.01);
  assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.02);
  const geometry=g.api.getGeometry();assert.equal(geometry.lanes.length,2);
  assert.ok(geometry.lanes.flat().every(p=>Number.isFinite(p.k)&&p.x>0&&p.x<960&&p.y>0&&p.y<600));
  const done=drive(g);assert.equal(done.completed,3);assert.equal(done.crashes,0);
  assert.equal(done.lapTimes.length,3);assert.equal(done.sectorTimes.length,9);assert.equal(done.cleanLaps,3);
  assert.ok(done.sectorTimes.every((v,i,a)=>!i||v>a[i-1]));
  assert.ok(Math.abs(done.sectorTimes.at(-1)-done.time)<1/120+.001);
  assert.equal(g.storage.size,2*map+lane+1);
 }
 const reload=loadGame({storage:g.storage});select(reload,9,1);
 assert.ok(reload.api.getState().ghostFrames>2);assert.equal(reload.api.getState().referenceSplits.length,9);
});
test('retry retains map and lane and races the saved ghost',()=>{
 const g=loadGame();select(g,6,1);drive(g);const best=g.api.getState().best;
 g.api.confirmRace();let s=g.api.getState();assert.equal(s.state,'countdown');assert.equal(s.activeMap,6);assert.equal(s.activeLane,1);assert.equal(s.time,0);assert.equal(s.best,best);assert.ok(s.ghostFrames>2);
 for(let i=0;i<410;i++)g.api.tick(1/120);
 const done=drive(g);assert.equal(done.best,best);assert.ok(done.ghostPosition);
});
test('crashes, respawns, restart, pause and hidden-tab resume preserve race state',()=>{
 const g=loadGame();select(g);
 for(let i=0;i<6000&&g.api.getState().state!=='crashed';i++){g.api.setGas(true);g.api.tick(1/120);}
 let s=g.api.getState();assert.equal(s.state,'crashed');assert.ok(s.crashes>0);
 g.elements.get('pause').click();const frozen=g.api.getState();
 for(let i=0;i<120;i++)g.api.tick(1/120);
 assert.equal(g.api.getState().time,frozen.time);
 g.elements.get('pause').click();for(let i=0;i<140;i++)g.api.tick(1/120);
 assert.equal(g.api.getState().state,'racing');assert.ok(g.api.getState().distance<s.distance);
 g.api.start();assert.equal(g.api.getState().crashes,0);assert.equal(g.api.getState().recordFrames,1);
 g.document.hidden=true;g.events.visibilitychange();assert.equal(g.api.getState().state,'paused');assert.equal(g.pending.size,0);
 g.document.hidden=false;g.events.visibilitychange();assert.equal(g.pending.size,1);g.frame(100000);assert.equal(g.api.getState().time,0);
});
test('sectors ignore recrossings after a crash and interpolate legacy ghosts',()=>{
 const g=loadGame();const frames=[[0,0,0,0,0,0],[3,0,0,0,0,110],[4,0,0,0,1,90],[6,0,0,0,0,150],[9,0,0,0,0,300]];
 const splits=g.api.splitTimes(frames,300);assert.equal(splits.length,3);assert.ok(Math.abs(splits[0]-30/11)<1e-10);assert.equal(splits[1],7);assert.equal(splits[2],9);
});
test('corrupt timestamps are rejected; storage failure leaves a session record and honest message',()=>{
 const key='slotrush.rookie.rail.v013.0';const storage=new Map([[key,JSON.stringify({schema:1,time:2,frames:[[0,0,0,0,0,0],[3,0,0,0,0,20],[2,0,0,0,0,30]]})]]);
 assert.equal(loadGame({storage}).api.getState().best,0);
 const g=loadGame({failStorage:true});select(g);drive(g);assert.equal(g.api.getState().storageFailed,true);assert.ok(g.elements.get('ovbody').innerHTML.includes('kunde inte sparas'));assert.equal(g.storage.size,0);
});
test('recording retains a final frame beyond the old 8500-frame limit',()=>{
 const g=loadGame();select(g);for(let i=0;i<65000;i++)g.api.tick(1/120);
 const done=drive(g);assert.ok(done.recordFrames<8500);const record=JSON.parse([...g.storage.values()][0]);assert.equal(record.frames.at(-1)[0],record.time);assert.equal(record.frames[0][0],0);
 const reload=loadGame({storage:g.storage});assert.ok(reload.api.getState().best>500);
});
test('static screens stop scheduling; track cache and backing pixel budget survive resize/map changes',()=>{
 const g=loadGame({width:1200,dpr:3});g.frame(1000);assert.equal(g.pending.size,0);assert.equal(g.elements.get('game').width,1920);
 const first=g.counts.lineTo;select(g);g.frame(2000);const afterBuild=g.counts.lineTo;
 for(let i=1;i<=120;i++)g.frame(2000+i*1000/60);
 assert.ok(g.counts.lineTo-afterBuild<1000,'cached road should not rebuild its 20,000+ vertices');
 assert.ok(first>20000);assert.equal(g.counts.layout,1);
 g.api.changeMap();g.api.chooseMap(1);g.frame(5000);assert.ok(g.counts.lineTo>afterBuild+20000);
 g.events.resize();g.frame(5017);assert.equal(g.counts.layout,2);
});
test('simultaneous throttle inputs are ORed; cancelled pointer and blur release gas',()=>{
 const g=loadGame();select(g);const key=code=>({code,preventDefault(){}});
 g.events.keydown(key('Space'));g.elements.get('pedal').pointerdown({preventDefault(){},pointerId:1});
 g.events.keyup(key('Space'));assert.equal(g.api.getState().gas,true);
 g.elements.get('pedal').pointercancel();assert.equal(g.api.getState().gas,false);
 g.events.keydown(key('KeyW'));g.events.blur();assert.equal(g.api.getState().gas,false);assert.equal(g.api.getState().state,'paused');
});

test('30–240 Hz displays keep the same physics clock and cap drawing at 60 Hz',()=>{
 for(const hz of [30,60,90,120,144,240]){
  const g=loadGame();select(g);g.frame(1000);const before=g.counts.drawImage;
  for(let i=1;i<=hz*2;i++)g.frame(1000+i*1000/hz);
  const frames=(g.counts.drawImage-before)/2;
  assert.ok(frames<=121,`${hz} Hz: ${frames} draws`);
  assert.ok(frames>=Math.min(hz,60)*2-2);
  assert.ok(g.api.getState().time>1.99&&g.api.getState().time<2.02);
 }
});
test('leaving countdown removes its overlay even when the menu stops the frame loop',()=>{
 const g=loadGame();g.api.changeMap();g.api.chooseMap(0);g.api.showLaneSelect();g.api.chooseLane(0);g.api.confirmRace();g.api.tick(1/120);
 assert.ok(g.elements.get('countdown').classList.contains('visible'));
 g.api.changeMap();g.frame(1000);assert.equal(g.elements.get('countdown').classList.contains('visible'),false);assert.equal(g.pending.size,0);
});

test('stability warns on actual accumulated stress, recovers on release and shows derailment through pause',()=>{
 const g=loadGame();select(g);assert.equal(g.api.getState().stability.percent,100);
 for(let i=0;i<6000&&g.api.getState().stability.tone!=='warning';i++){g.api.setGas(true);g.api.tick(1/120);}
 assert.equal(g.api.getState().stability.label,'BÖRJAR SLÄPPA');
 g.api.setGas(false);for(let i=0;i<120;i++)g.api.tick(1/120);
 assert.equal(g.api.getState().state,'racing');assert.equal(g.api.getState().stability.percent,100);
 for(let i=0;i<6000&&g.api.getState().stability.tone!=='danger';i++){g.api.setGas(true);g.api.tick(1/120);}
 assert.equal(g.api.getState().state,'racing');assert.equal(g.api.getState().stability.label,'SLÄPP GASEN');
 for(let i=0;i<600&&g.api.getState().state!=='crashed';i++){g.api.setGas(true);g.api.tick(1/120);}
 assert.equal(g.api.getState().stability.percent,0);assert.equal(g.api.getState().stability.label,'URSPÅRAD');
 g.frame(1000);assert.equal(g.elements.get('stability-meter')['aria-valuenow'],'0');assert.equal(g.elements.get('stability').dataset.tone,'danger');
 g.elements.get('pause').click();g.frame(1017);assert.equal(g.api.getState().stability.percent,0);assert.equal(g.elements.get('stability-state').textContent,'PAUS');
 g.elements.get('pause').click();for(let i=0;i<140;i++)g.api.tick(1/120);
 assert.equal(g.api.getState().stability.percent,100);assert.equal(g.api.getState().state,'racing');
 g.api.changeMap();g.frame(3000);assert.equal(g.elements.get('stability-value').textContent,'100%');assert.equal(g.elements.get('stability-state').textContent,'REDO');
});

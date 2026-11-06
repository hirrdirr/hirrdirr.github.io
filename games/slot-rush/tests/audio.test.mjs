import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {loadGame,select,drive} from './harness.mjs';
const source=fs.readFileSync(new URL('../audio.js',import.meta.url),'utf8');
function audioHarness({storage=new Map(),supported=true,broken=false,blocked=false}={}){
 const contexts=[],timers=new Map();let timer=0;
 class Param{value=0;setTargetAtTime(v){this.value=v;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
 class Node{gain=new Param();frequency=new Param();Q=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();connections=[];connect(target){this.connections.push(target);return target;}setPeriodicWave(wave){this.wave=wave;}disconnect(){this.disconnected=true;}start(t){this.started=t??0;}stop(t){this.stopped=t??0;}}
 class Context{
  currentTime=0;sampleRate=8000;state='suspended';destination=new Node();nodes=[];
  constructor(){if(broken)throw Error('device unavailable');contexts.push(this);}
  node(kind){const n=new Node();n.kind=kind;this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}createOscillator(){return this.node('oscillator');}createBufferSource(){return this.node('noise');}createDynamicsCompressor(){return this.node('compressor');}createBiquadFilter(){return this.node('filter');}
  createPeriodicWave(real,imag){return {real,imag};}
  createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)};}
  resume(){if(!blocked)this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
 }
 const sandbox={console,Math,Set,Float32Array,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},setTimeout:f=>{timers.set(++timer,f);return timer;},clearTimeout:id=>timers.delete(id)};
 sandbox.window=sandbox;if(supported)sandbox.AudioContext=Context;
 vm.runInNewContext(source,sandbox);const audio=sandbox.SlotRushAudio.create();
 return {audio,contexts,timers,storage,idle(){const q=[...timers.values()];timers.clear();q.forEach(f=>f());}};
}
test('audio is lazy, has a modest default volume, and persists mute/volume independently of records',()=>{
 const h=audioHarness();assert.equal(h.contexts.length,0);assert.equal(h.audio.settings().volume,.35);
 h.audio.unlock();assert.equal(h.contexts.length,1);h.audio.setVolume(.6);h.audio.setMuted(true);
 const reload=audioHarness({storage:h.storage});assert.equal(reload.audio.settings().volume,.6);assert.equal(reload.audio.settings().muted,true);
 reload.audio.unlock();assert.equal(reload.contexts.length,0);reload.audio.setMuted(false);assert.equal(reload.contexts.length,1);
 reload.audio.setVolume(0);reload.idle();assert.equal(reload.audio.status().context,'suspended');
 reload.audio.setMuted(false);assert.equal(reload.audio.settings().volume,.35);
});
test('motor pitch follows speed/throttle, friction follows load, and updates reuse the graph',()=>{
 const h=audioHarness();h.audio.unlock();h.audio.begin();const c=h.contexts[0],initial=c.nodes.length;
 const motors=c.nodes.filter(n=>n.kind==='oscillator'),railGain=c.nodes.find(n=>n.kind==='filter'&&n.type==='bandpass').connections[0];
 assert.ok(motors[0].wave.imag.filter(v=>v>0).length>8,'motor has multiple commutator harmonics');
 h.audio.update(60,true,.2,0);const low=motors[0].frequency.value,quiet=railGain.gain.value;
 h.audio.update(240,true,1.5,.6);assert.ok(motors[0].frequency.value>low);assert.ok(railGain.gain.value>quiet);
 const stressed=railGain.gain.value;h.audio.update(240,true,.2,0);assert.ok(railGain.gain.value<stressed);
 const powered=motors[0].frequency.value;h.audio.update(240,false,1.5,.6);assert.ok(motors[0].frequency.value<powered);
 for(let i=0;i<5000;i++)h.audio.update(220,i%2,1.2,.1);
 assert.equal(c.nodes.length,initial);h.audio.update(0,false,0,0);assert.equal(railGain.gain.value,0);
});
test('pause/menu/mute cancel effects, suspend the device, and resume cancels pending suspension',()=>{
 const h=audioHarness();h.audio.unlock();h.audio.begin();h.audio.cue('crash');assert.equal(h.audio.status().voices,7);
 h.audio.stop();assert.equal(h.audio.status().voices,0);h.idle();assert.equal(h.audio.status().context,'suspended');
 h.audio.begin();assert.equal(h.audio.status().context,'running');h.audio.stop();h.audio.begin();h.idle();assert.equal(h.audio.status().context,'running');
 h.audio.cue('finish',true);assert.equal(h.audio.status().voices,4);assert.equal(h.audio.status().active,false);
 h.audio.begin();assert.equal(h.audio.status().voices,0);h.audio.cue('respawn');h.audio.setMuted(true);h.idle();assert.equal(h.audio.status().voices,0);assert.equal(h.audio.status().context,'suspended');
});
test('one-shot voices are bounded and disconnect when ended',()=>{
 const h=audioHarness();h.audio.unlock();h.audio.begin();for(let i=0;i<50;i++)h.audio.cue('lap');
 assert.equal(h.audio.status().voices,16);for(const n of h.contexts[0].nodes)if(n.onended)n.onended();assert.equal(h.audio.status().voices,0);
});
test('unsupported audio, failed devices and malformed preferences do not break the game',()=>{
 for(const options of [{supported:false},{broken:true},{storage:new Map([['slotrush.audio.v1','not json']])}]){
  const h=audioHarness(options);assert.doesNotThrow(()=>{h.audio.unlock();h.audio.begin();h.audio.update(100,true,1,.5);h.audio.cue('crash');h.audio.stop();});
 }
});
test('a pending first beep is discarded when pause or a later countdown event wins',async()=>{
 const h=audioHarness({blocked:true});h.audio.unlock();h.audio.begin();h.audio.cue('count',3);h.audio.stop();await Promise.resolve();assert.equal(h.audio.status().voices,0);
});
function soundSpy(){
 const calls=[];let volume=.35,muted=false;
 return {calls,settings:()=>({volume,muted,supported:true}),status:()=>({}),unlock(){calls.push(['unlock']);},begin(){calls.push(['begin']);},stop(){calls.push(['stop']);},update(...v){calls.push(['update',...v]);},cue(...v){calls.push(['cue',...v]);},setVolume(v){volume=v;},setMuted(v){muted=v;}};
}
test('game cues occur once per displayed countdown, lap, crash, respawn and finish; ghosts stay silent',()=>{
 const sound=soundSpy(),g=loadGame({sound});select(g);
 assert.deepEqual(sound.calls.filter(c=>c[1]==='count').map(c=>c[2]),[3,2,1,0]);
 drive(g);assert.equal(sound.calls.filter(c=>c[1]==='lap').length,2);assert.equal(sound.calls.filter(c=>c[1]==='finish').length,1);
 g.api.confirmRace();for(let i=0;i<410;i++)g.api.tick(1/120);
 const before=sound.calls.length;drive(g);const replay=sound.calls.slice(before);
 assert.equal(replay.filter(c=>c[1]==='lap').length,2);assert.equal(replay.filter(c=>c[1]==='finish').length,1);
 select(g);for(let i=0;i<6000&&g.api.getState().state!=='crashed';i++){g.api.setGas(true);g.api.tick(1/120);}
 assert.equal(sound.calls.filter(c=>c[1]==='crash').length,1);
 for(let i=0;i<140;i++)g.api.tick(1/120);assert.equal(sound.calls.filter(c=>c[1]==='respawn').length,1);
 g.elements.get('pause').click();assert.equal(sound.calls.at(-1)[0],'stop');
 g.api.changeMap();assert.equal(sound.calls.at(-1)[0],'stop');
});
test('volume keyboard focus does not throttle or restart the race',()=>{
 const sound=soundSpy(),g=loadGame({sound});select(g);
 for(const code of ['Space','KeyW','KeyR'])g.events.keydown({code,target:{tagName:'INPUT'},preventDefault(){throw Error('range keyboard was captured');}});
 assert.equal(g.api.getState().gas,false);assert.equal(g.api.getState().state,'racing');
 g.elements.get('sound-volume').input({target:{value:'72'}});assert.equal(sound.settings().volume,.72);
});

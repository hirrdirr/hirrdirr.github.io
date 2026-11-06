// A small electric slot car: synthesized locally, with no downloads or audio loops to decode.
// The game owns timing. This module never advances physics or predicts a corner.
(()=>{'use strict';
const KEY='slotrush.audio.v1',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
window.SlotRushAudio={create(){
 let volume=.35,muted=false,ctx=null,master,motorGain,whineGain,railGain,brushGain,rippleGain;
 let motor,whine,ripple,motorFilter,railFilter,brushFilter,noise,motorWave;
 let active=false,suspendTimer=0,unlocked=false,failed=false,cueSerial=0;
 let warningActive=false,warningVoice=null,lastWarning=-Infinity;
 const voices=new Set(),supported=Boolean(window.AudioContext||window.webkitAudioContext);
 try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved){if(Number.isFinite(saved.volume))volume=clamp(saved.volume,0,1);muted=saved.muted===true;}}catch(e){}
 const audible=()=>supported&&!failed&&!muted&&volume>0;
 function smooth(param,value,seconds=.035){param.setTargetAtTime(value,ctx.currentTime,seconds);}
 function cancelSuspend(){clearTimeout(suspendTimer);suspendTimer=0;}
 function suspendLater(ms=100){
  cancelSuspend();if(!ctx)return;
  suspendTimer=setTimeout(()=>{suspendTimer=0;if(!active||!audible())ctx.suspend().catch(()=>{});},ms);
 }
 function build(){
  const Audio=window.AudioContext||window.webkitAudioContext;
  ctx=new Audio({latencyHint:'interactive'});
  const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=6;limiter.attack.value=.003;limiter.release.value=.12;
  master=ctx.createGain();master.gain.value=muted?0:volume*volume;
  limiter.connect(master);master.connect(ctx.destination);
  // Deterministic noise avoids consuming the game's random stream (crash spin).
  noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noise.getChannelData(0);let seed=7283;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
  // Uneven commutator harmonics, gear mesh and brush noise give the small DC
  // motor a mechanical buzz instead of two clean, musical oscillator tones.
  motorWave=ctx.createPeriodicWave(new Float32Array(13),new Float32Array([0,1,.26,.52,.16,.32,.10,.20,.07,.12,.04,.08,.025]));
  motorFilter=ctx.createBiquadFilter();motorFilter.type='lowpass';motorFilter.Q.value=.65;motorFilter.connect(limiter);
  function tone(type,destination){const source=ctx.createOscillator(),gain=ctx.createGain();source.type=type;gain.gain.value=0;source.connect(gain);gain.connect(destination);source.start();return {source,gain};}
  ({source:motor,gain:motorGain}=tone('triangle',motorFilter));motor.setPeriodicWave(motorWave);
  ({source:whine,gain:whineGain}=tone('triangle',motorFilter));
  // Small torque ripple roughens the buzz; it stops with the motor, including mute.
  ({source:ripple,gain:rippleGain}=tone('sine',motorGain.gain));
  const rail=ctx.createBufferSource();rail.buffer=noise;rail.loop=true;
  railFilter=ctx.createBiquadFilter();railFilter.type='bandpass';railFilter.frequency.value=1200;railFilter.Q.value=.7;
  railGain=ctx.createGain();railGain.gain.value=0;
  rail.connect(railFilter);railFilter.connect(railGain);railGain.connect(limiter);rail.start();
  brushFilter=ctx.createBiquadFilter();brushFilter.type='bandpass';brushFilter.Q.value=.65;
  brushGain=ctx.createGain();brushGain.gain.value=0;
  rail.connect(brushFilter);brushFilter.connect(brushGain);brushGain.connect(limiter);
  return limiter;
 }
 let bus;
 function unlock(){
  unlocked=true;if(!audible())return;
  cancelSuspend();
  try{if(!ctx)bus=build();if(ctx.state!=='running')ctx.resume().catch(()=>{});if(!active)suspendLater(1600);}
  catch(e){failed=true;if(ctx)ctx.close().catch(()=>{});ctx=null;}
 }
 function stopVoices(){
  for(const voice of voices){try{voice.source.stop();}catch(e){}voice.source.disconnect();voice.gain.disconnect();if(voice.filter)voice.filter.disconnect();}
  voices.clear();
 }
 function resetWarning(){
  warningActive=false;lastWarning=-Infinity;
  if(warningVoice){
   // Release the current pulse promptly without a hard cut or cancelling lap cues.
   warningVoice.gain.gain.cancelScheduledValues(ctx.currentTime);
   smooth(warningVoice.gain.gain,0,.004);warningVoice.source.stop(ctx.currentTime+.02);warningVoice=null;
  }
 }
 function silence(){resetWarning();if(!ctx)return;smooth(motorGain.gain,0,.012);smooth(whineGain.gain,0,.012);smooth(railGain.gain,0,.012);smooth(brushGain.gain,0,.012);smooth(rippleGain.gain,0,.012);}
 function stop(){cueSerial++;active=false;silence();stopVoices();suspendLater();}
 function begin(){stop();active=true;if(unlocked)unlock();}
 function update(speed,gas,load,stress){
  if(!ctx||ctx.state!=='running'||!active||!audible())return;
  const v=clamp(speed/337,0,1),moving=clamp(speed/22,0,1),grip=clamp((load-.65)/1.1,0,1);
  const rpm=75+v*275+(gas?18:0),power=gas?1:.46;
  smooth(motor.frequency,rpm,.045);
  smooth(whine.frequency,rpm*3.17,.045);
  smooth(motorFilter.frequency,900+v*2100+(gas?250:0),.06);
  smooth(motorGain.gain,moving*(.19+v*.08)*power);
  smooth(whineGain.gain,moving*(.025+v*.022)*power);
  smooth(ripple.frequency,18+v*91,.05);
  smooth(rippleGain.gain,moving*.032*power);
  smooth(brushFilter.frequency,1200+v*2200,.06);
  smooth(brushGain.gain,moving*(.038+v*.045)*power);
  smooth(railFilter.frequency,900+v*900+clamp(stress,0,1)*650,.06);
  smooth(railGain.gain,moving*(.016+grip*.095+clamp(stress,0,1)*.10),.025);
  // The same accumulated stress that derails the car at .82 drives the warning.
  // Hysteresis avoids chatter near its threshold. Schedule only the current pulse:
  // a stalled frame must never queue a burst of missed warnings.
  const risk=clamp(stress/.82,0,1);
  if(speed<=0||risk<.08){resetWarning();return;}
  if(!warningActive&&risk<.18)return;
  warningActive=true;
  if(ctx.currentTime-lastWarning<.36-.24*risk)return;
  lastWarning=ctx.currentTime;
  warningVoice=note(1600+risk*400,.075,.18+risk*.05,0,1350+risk*400,'triangle');
 }
 // Short voices are scheduled against the audio clock; never timers per note.
 function note(freq,duration,level,delay=0,end=freq,type='sine',noiseVoice=false){
  if(!ctx||ctx.state!=='running'||!audible()||voices.size>=16)return;
  const t=ctx.currentTime+delay,source=noiseVoice?ctx.createBufferSource():ctx.createOscillator(),gain=ctx.createGain();
  let filter;
  if(noiseVoice){source.buffer=noise;filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(freq,t);filter.frequency.exponentialRampToValueAtTime(end,t+duration);source.connect(filter);filter.connect(gain);}
  else{source.type=type;source.frequency.setValueAtTime(freq,t);source.frequency.exponentialRampToValueAtTime(end,t+duration);source.connect(gain);}
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);gain.gain.setValueAtTime(0,t+duration+.01);gain.connect(bus);
  const voice={source,gain,filter};voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();if(filter)filter.disconnect();voices.delete(voice);if(warningVoice===voice)warningVoice=null;};
  source.start(t);source.stop(t+duration+.015);
  return voice;
 }
 function cue(name,value){
  const serial=++cueSerial;
  // The first beep may share the gesture that resumes a suspended audio device.
  // Drop it if a newer event/pause wins; never replay a backlog after resuming.
  if(name==='count'&&value===3&&ctx&&ctx.state==='suspended'&&audible()){
   ctx.resume().then(()=>{if(serial===cueSerial&&active&&ctx.state==='running')cue(name,value);}).catch(()=>{});return;
  }
  if(name==='count'){note(value===0?1046.5:523.25,value===0?.24:.10,.22);}
  else if(name==='crash'){
   silence();const impact=.7+.3*clamp((Number.isFinite(value)?value:240)/337,0,1);
   // Guide pin snaps free, chassis hits plastic, then skids/tumbles to rest.
   note(4600,.12,.78*impact,0,800,'sine',true);
   note(210,.075,.32*impact,0,90,'triangle');
   note(350+impact*650,.26,.11,0,65,'triangle');
   note(2200,.38,.24*impact,.025,260,'sine',true);
   for(let i=0;i<3;i++)note(2800-i*600,.055,.28*impact*Math.pow(.58,i),.10+i*.11,650,'sine',true);
  }
  else if(name==='respawn'){note(2100,.055,.22,0,700,'sine',true);note(170,.08,.11,.035,110,'triangle');}
  else if(name==='lap'){note(660,.11,.13);note(880,.14,.13,.10);}
  else if(name==='finish'){
   stop();if(!audible())return;
   // A personal best resolves one note higher; ordinary finishes stay compact.
   [523.25,659.25,783.99,...(value?[1046.5]:[])].forEach((f,i)=>note(f,.28,.19,i*.13));
   suspendLater(1100);
  }
 }
 function settings(){return {volume,muted,supported:supported&&!failed};}
 function setVolume(value){if(!Number.isFinite(value))return;volume=clamp(value,0,1);muted=false;applySettings();}
 function setMuted(value){muted=Boolean(value);if(!muted&&volume===0)volume=.35;applySettings();}
 function applySettings(){
  try{localStorage.setItem(KEY,JSON.stringify({volume,muted}));}catch(e){}
  if(ctx)smooth(master.gain,muted?0:volume*volume,.015);
  if(audible()){if(unlocked)unlock();}else{cueSerial++;silence();stopVoices();suspendLater();}
 }
 return {unlock,begin,stop,update,cue,settings,setVolume,setMuted,
  status:()=>({...settings(),context:ctx?.state||'uninitialized',active,voices:voices.size})};
}};
})();

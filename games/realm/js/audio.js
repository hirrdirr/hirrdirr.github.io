// Short synthesized cues, generated on demand. No audio files or background loop.
export class AudioBus {
  constructor() { this.volume=.22;this.ctx=null;this.enabled=true; }
  unlock() {
    if(!this.enabled)return;
    try { this.ctx ||= new (window.AudioContext||window.webkitAudioContext)(); if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{}); } catch { this.enabled=false; }
  }
  play(type) {
    if(!this.enabled||this.volume<=0||!this.ctx||this.ctx.state!=='running')return;
    const tones={attack:[230,105,.07,'triangle'],burst:[390,170,.22,'triangle'],hurt:[130,60,.14,'sawtooth'],heal:[440,720,.25,'sine'],item:[660,880,.09,'sine'],equip:[370,550,.09,'triangle'],level:[520,1040,.5,'sine'],questDone:[660,990,.4,'sine'],questAccepted:[440,660,.16,'sine'],dodge:[180,310,.08,'sine'],beacon:[330,880,.7,'sine']};
    const tone=tones[type];if(!tone)return;
    const [a,b,duration,wave]=tone,t=this.ctx.currentTime,o=this.ctx.createOscillator(),gain=this.ctx.createGain();
    o.type=wave;o.frequency.setValueAtTime(a,t);o.frequency.exponentialRampToValueAtTime(b,t+duration);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(this.volume*.16,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(gain);gain.connect(this.ctx.destination);o.start(t);o.stop(t+duration+.02);
    o.onended=()=>{o.disconnect();gain.disconnect();};
  }
}

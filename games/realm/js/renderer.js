import { makeArt } from './art.js';
import { WORLD, WIDTH, HEIGHT, TILE, SAFE, CAMP, terrain, riverLeft, inSafe, LANDMARKS } from './world.js';
import { NPCS, ENEMIES, QUESTS, ITEMS } from './data.js';
import { questReady } from './simulation.js';
function makeCanvas(w,h) { const c=document.createElement('canvas'); c.width=w;c.height=h;return c; }
function rand(seed) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}; }
export class Renderer {
  constructor(canvas, minimap) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.map=minimap;this.art=makeArt();this.camera={x:0,y:0};this.first=true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.ground=this.makeGround();this.mapGround=this.makeMap();
    this.metrics={frames:0,total:0,max:0};
  }
  makeGround() {
    const c=makeCanvas(WIDTH,HEIGHT),g=c.getContext('2d'),random=rand(18075);
    for(let y=0;y<HEIGHT;y+=TILE) for(let x=0;x<WIDTH;x+=TILE) {
      const kind=terrain(x+16,y+16);
      const greens=['#426951','#456c51','#486e53','#40674f'];
      g.fillStyle=kind==='water'?'#285c64':kind==='bridge'?'#705c43':kind==='path'?'#a99b72':kind==='ruin'?'#64766b':kind==='marsh'?['#515f50','#596451','#626750'][Math.floor(random()*3)]:greens[Math.floor(random()*4)];
      g.fillRect(x,y,TILE,TILE);
      if(kind==='water') {
        g.fillStyle='#34737a';
        for(let n=0;n<2;n++) g.fillRect(x+random()*23,y+random()*30,6+random()*8,2);
      } else if(kind==='bridge') {
        g.fillStyle='#ad8b59';g.fillRect(x+1,y+1,8,30);g.fillRect(x+12,y+1,8,30);g.fillRect(x+23,y+1,8,30);
        g.fillStyle='#c4a071';g.fillRect(x+2,y+2,2,27);g.fillRect(x+13,y+2,2,27);
        g.fillStyle='#534b37';g.fillRect(x+3,y+5,3,3);g.fillRect(x+24,y+25,3,3);
      } else if(kind==='path'||kind==='ruin') {
        const tones=kind==='path'?['#bdb18a','#c3b68c','#958b69']:['#819084','#748577','#526e5b'];
        for(let n=0;n<5;n++) {g.fillStyle=tones[n%3];g.fillRect(x+Math.floor(random()*25),y+Math.floor(random()*26),4+Math.floor(random()*6),3+Math.floor(random()*4));}
      } else {
        g.fillStyle=kind==='marsh'?'#999167':'#547c58';
        for(let n=0;n<4;n++) {const a=x+Math.floor(random()*28),b=y+Math.floor(random()*28);g.fillRect(a,b,2,4);g.fillRect(a+3,b-2,2,5);}
        if(random()<.12) {
          const a=x+12,b=y+19;g.fillStyle=kind==='marsh'?'#e6b575':random()<.55?'#c5bd85':'#a9a2bf';g.fillRect(a,b,3,3);g.fillRect(a+9,b-9,3,3);
          g.fillStyle='#2b5749';g.fillRect(a+1,b+3,2,3);
        }
      }
    }
    // Irregular river banks, bridge rails, warm village paving and ruin fragments.
    for(let y=32;y<HEIGHT-32;y+=12) {
      if(y>594&&y<700)continue;
      const x=riverLeft(y);
      g.fillStyle='#7c956c';g.fillRect(x-5,y,5,12);g.fillRect(x+96,y,6,12);
      g.fillStyle='#75a396';g.fillRect(x+3,y+4,7,2);g.fillRect(x+84,y+7,9,2);
    }
    for(const y of [600,692]) {
      g.fillStyle='#534733';g.fillRect(955,y,200,5);
      for(let x=956;x<1160;x+=40) {g.fillStyle='#6e563a';g.fillRect(x,y-8,7,17);g.fillStyle='#c6a36b';g.fillRect(x,y-9,7,4);}
    }
    for(let n=0;n<15;n++) {
      const x=1424+(n%5)*64,y=230+Math.floor(n/5)*94;
      g.fillStyle='#3c575255';g.fillRect(x+4,y+8,25,14);
      g.fillStyle='#84927d';g.fillRect(x,y,22,16);
      g.fillStyle='#acb098';g.fillRect(x,y,22,4);
      g.fillStyle='#4f7655';g.fillRect(x+12,y+11,13,6);
    }
    // Village borders are flower beds, not misleading impassable fences.
    for(let x=208;x<688;x+=24) for(const y of [615,1014]) {
      g.fillStyle='#355845';g.fillRect(x,y,13,6);g.fillStyle='#e0b77a';g.fillRect(x+3,y-2,3,3);
    }
    // The marsh is a tended place gone wild: old paving, reeds, and a sealed sluice.
    for (let n=0;n<32;n++) {
      const x=1390+(n*73)%458,y=785+(n*97)%424;
      if(terrain(x,y)!=='marsh')continue;
      g.fillStyle='#3f5146';g.fillRect(x,y,13,5);
      g.fillStyle='#9b9169';g.fillRect(x+2,y-12,2,14);g.fillRect(x+8,y-17,2,20);
      g.fillStyle='#c09c66';g.fillRect(x+1,y-14,4,6);g.fillRect(x+7,y-19,4,6);
    }
    for(let n=0;n<12;n++) {
      const angle=n*Math.PI/6,x=1744+Math.cos(angle)*91,y=976+Math.sin(angle)*76;
      g.fillStyle='#3f5048';g.fillRect(x,y,17,12);g.fillStyle='#98987b';g.fillRect(x,y,17,3);
    }
    g.fillStyle='#3d5149';g.fillRect(1790,1200,67,28);
    g.fillStyle='#89917b';for(let x=1794;x<1855;x+=16)g.fillRect(x,1203,13,7);
    // A rolled blanket, supplies and a lantern make Signe's refuge recognizable.
    g.fillStyle='#374e46';g.fillRect(1282,728,42,30);
    g.fillStyle='#8f7370';g.fillRect(1284,730,36,21);g.fillStyle='#c8ad8a';g.fillRect(1284,730,7,21);
    g.fillStyle='#84613f';g.fillRect(1304,774,20,14);g.fillStyle='#b99a61';g.fillRect(1304,774,20,4);
    for(let x=1190;x<1339;x+=25) {g.fillStyle='#a3ab79';g.fillRect(x,811,9,3);}
    return c;
  }
  makeMap() {
    const c=makeCanvas(232,155),g=c.getContext('2d');
    for(let y=0;y<155;y+=2) for(let x=0;x<232;x+=2) {
      const t=terrain(x/232*WIDTH,y/155*HEIGHT);
      g.fillStyle=t==='water'?'#366974':t==='path'||t==='bridge'?'#b1a279':t==='ruin'?'#7b8b7d':t==='marsh'?'#8a7757':'#355344';
      g.fillRect(x,y,2,2);
    }
    g.strokeStyle='#91b18b';for(const r of [SAFE,CAMP])g.strokeRect(r.x/WIDTH*232,r.y/HEIGHT*155,r.w/WIDTH*232,r.h/HEIGHT*155);
    return c;
  }
  resetCamera() {this.first=true;}
  render(s,dt) {
    const started=performance.now(),g=this.ctx,w=this.canvas.width,h=this.canvas.height,p=s.player;
    const tx=Math.max(0,Math.min(WIDTH-w,p.x-w/2)),ty=Math.max(0,Math.min(HEIGHT-h,p.y-h/2));
    const smoothing=this.first||this.reduced?1:Math.min(1,dt*13);
    this.camera.x+=(tx-this.camera.x)*smoothing;this.camera.y+=(ty-this.camera.y)*smoothing;this.first=false;
    const cx=Math.round(this.camera.x),cy=Math.round(this.camera.y);
    g.imageSmoothingEnabled=false;
    g.drawImage(this.ground,cx,cy,w,h,0,0,w,h);
    g.save();g.translate(-cx,-cy);
    if(!this.reduced) {
      g.fillStyle='#a0c2b448';
      for(let n=0;n<16;n++) {
        const y=(n*81+s.time*10)%HEIGHT,x=riverLeft(y)+20+(n*17)%55;
        if(y>600&&y<700)continue;
        g.fillRect(x,y,8,2);
      }
    }
    const visible=o=>o.x>cx-180&&o.x<cx+w+180&&o.y>cy-20&&o.y<cy+h+180;
    const entities=[
      ...WORLD.props.filter(visible).map(o=>({...o,renderType:'prop'})),
      ...NPCS.filter(visible).map(o=>({...o,renderType:'npc'})),
      ...s.enemies.filter(e=>e.hp>0&&visible(e)).map(e=>({...e,renderType:'enemy'})),
      {...p,renderType:'player'}
    ].sort((a,b)=>a.y-b.y);
    for(const drop of s.drops) {
      if(!visible(drop))continue;
      g.fillStyle=ITEMS[drop.item].rarity==='rare'?'#9bd5e9':ITEMS[drop.item].rarity==='uncommon'?'#b6d990':'#f1d28f';g.fillRect(drop.x-5,drop.y-10,10,10);
      g.fillStyle='#9f6d43';g.fillRect(drop.x-3,drop.y-7,6,5);
      g.strokeStyle='#f4d99566';g.strokeRect(drop.x-8,drop.y-13,16,16);
    }
    for(const e of s.enemies) if(e.hp>0&&e.mode==='windup'&&visible(e)) {
      const def=ENEMIES[e.type],progress=1-e.windup/(e.windupMax||1);
      g.fillStyle='#df855237';g.strokeStyle='#efb989';g.lineWidth=2;
      if(def.behavior==='pounce') {
        g.save();g.translate(e.x,e.y);g.rotate(Math.atan2(e.aim.y,e.aim.x));
        g.fillRect(0,-20,145,40);g.strokeRect(0,-20,145,40);
        g.fillStyle='#efb98966';g.fillRect(0,-20,145*progress,40);
        g.beginPath();g.moveTo(120,-10);g.lineTo(132,0);g.lineTo(120,10);g.stroke();g.restore();
      } else if(def.behavior==='ranged') {
        g.setLineDash([5,7]);g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.x+e.aim.x*240,e.y+e.aim.y*240);g.stroke();g.setLineDash([]);
      } else if(def.behavior!=='eruption') {
        const radius=def.boss?100:45;
        g.beginPath();g.arc(e.x,e.y,radius,0,Math.PI*2);g.fill();g.stroke();
        g.fillStyle='#df855252';g.beginPath();g.arc(e.x,e.y,radius*progress,0,Math.PI*2);g.fill();
      }
    }
    for(const hazard of s.hazards) {
      const progress=1-hazard.delay/hazard.maxDelay;
      g.fillStyle='#e8844838';g.strokeStyle='#ffd39a';g.lineWidth=2;
      g.beginPath();g.arc(hazard.x,hazard.y,hazard.radius,0,Math.PI*2);g.fill();g.stroke();
      g.fillStyle='#e99a645f';g.beginPath();g.arc(hazard.x,hazard.y,hazard.radius*progress,0,Math.PI*2);g.fill();
      this.label(g,'!',hazard.x,hazard.y+6,'#ffdeab',20);
    }
    const target=s.enemies.find(e=>e.id===s.targetId&&e.hp>0);
    if(target&&visible(target)) {
      const r=ENEMIES[target.type].radius+7;
      g.strokeStyle='#f8dfa3';g.lineWidth=2;
      for(const dir of [-1,1]) {g.beginPath();g.moveTo(target.x+dir*(r-6),target.y+7);g.lineTo(target.x+dir*r,target.y+7);g.lineTo(target.x+dir*r,target.y-1);g.stroke();}
    }
    for(const e of entities) {
      if(e.renderType==='prop')this.prop(g,e,s,p);
      else if(e.renderType==='npc')this.npc(g,e,s);
      else if(e.renderType==='enemy')this.enemy(g,e,s);
      else this.player(g,p,s);
    }
    for(const shot of s.projectiles) if(visible(shot)) {
      g.fillStyle='#a9634e';g.fillRect(shot.x-shot.vx*.025-4,shot.y-shot.vy*.025-4,8,8);
      g.fillStyle='#f0b572';g.fillRect(shot.x-4,shot.y-4,8,8);g.fillStyle='#fff0c3';g.fillRect(shot.x-2,shot.y-2,4,4);
    }
    for(const fx of s.effects) {
      g.globalAlpha=Math.min(1,fx.life*3);
      if(['slash','finisher','burst','slam','eruption'].includes(fx.type)) {
        const slash=['slash','finisher'].includes(fx.type),radius=slash?60:fx.type==='eruption'?62:100;
        g.strokeStyle=['slam','eruption'].includes(fx.type)?'#efb080':fx.type==='burst'?'#cce6a4':fx.type==='finisher'?'#fff7d7':'#f9e6b2';g.lineWidth=fx.type==='finisher'?8:slash?5:3;
        g.beginPath();
        const angle=fx.angle||0;
        g.arc(fx.x,fx.y,radius*(1-fx.life/fx.maxLife*.35),slash?angle-1.1:0,slash?angle+1.1:Math.PI*2);g.stroke();
      } else if(fx.type==='impact') {
        const size=(1-fx.life/fx.maxLife)*19+3;g.fillStyle='#fff1c5';
        for(let n=0;n<6;n++)g.fillRect(fx.x+Math.cos(n*Math.PI/3)*size-2,fx.y+Math.sin(n*Math.PI/3)*size-2,4,4);
      } else {
        this.label(g,fx.text,fx.x,fx.y-(1-fx.life/fx.maxLife)*25,fx.type==='hurt'?'#ffc0a8':fx.type==='damage'?'#fff3d7':'#cde6a0',fx.type==='level'?18:14);
      }
      g.globalAlpha=1;
    }
    if(!this.reduced) {
      for(let i=0;i<9;i++) {
        const x=448+Math.sin(s.time*.7+i*2.4)*75,y=790+Math.cos(s.time*.6+i*1.7)*43;
        g.fillStyle=i%2?'#f4d89980':'#c2d99e80';g.fillRect(x,y,2,2);
        const mx=1430+(i*83)%390+Math.sin(s.time+i)*12,my=820+(i*47)%320+Math.cos(s.time*.6+i)*15;
        if(visible({x:mx,y:my})){g.fillStyle='#e9b27999';g.fillRect(mx,my,2,2);}
      }
    }
    g.restore();
    // Gentle, cheap edge shading. No filters or per-frame full-canvas gradients.
    g.fillStyle='#142b3022';g.fillRect(0,0,w,8);g.fillRect(0,h-8,w,8);
    const elapsed=performance.now()-started;this.metrics.frames++;this.metrics.total+=elapsed;this.metrics.max=Math.max(this.metrics.max,elapsed);
  }
  shadow(g,x,y,w=28) {g.fillStyle='#122e3050';g.fillRect(x-w/2,y-4,w,7);}
  label(g,text,x,y,color='#f1e9d2',size=12) {
    g.font='600 '+size+'px system-ui, sans-serif';g.textAlign='center';g.fillStyle='#10252c';g.fillText(text,Math.round(x)+1,Math.round(y)+1);g.fillStyle=color;g.fillText(text,Math.round(x),Math.round(y));
  }
  prop(g,o,s,p) {
    if(o.kind==='herb'&&s.harvested.includes(o.id))return;
    if(o.kind==='tree') {
      if(p.x>o.x-46&&p.x<o.x+46&&p.y<o.y&&p.y>o.y-120)g.globalAlpha=.48;
      g.drawImage(this.art.trees[o.variant],Math.round(o.x-56),Math.round(o.y-134));g.globalAlpha=1;return;
    }
    if(o.kind==='house') {g.drawImage(o.roof==='blue'?this.art.houseBlue:this.art.houseRed,o.x-88,o.y-154);return;}
    const kind=o.kind==='rune'&&s.runes.includes(o.id)?'runeRead':o.kind==='seal'&&s.flags.sealRestored?'sealLit':o.kind==='chest'&&s.chests.includes(o.id)?'chestOpen':o.kind==='beacon'&&s.flags.beaconLit?'beaconLit':o.kind;
    const sprite=this.art[kind];if(!sprite)return;
    if(kind==='fire'||kind==='beaconLit') {
      const gradient=g.createRadialGradient(o.x,o.y-25,3,o.x,o.y-25,45);
      gradient.addColorStop(0,kind==='fire'?'#f9c1753d':'#83dbc942');gradient.addColorStop(1,'#f9c17500');
      g.fillStyle=gradient;g.fillRect(o.x-45,o.y-70,90,90);
    }
    g.drawImage(sprite,o.x-32,o.y-71);
  }
  npc(g,n,s) {
    this.shadow(g,n.x,n.y);g.drawImage(this.art[n.color][0],n.x-20,n.y-41+(this.reduced?0:Math.floor(Math.sin(s.time*1.4+n.x)*.7)));
    const quests=Object.entries(QUESTS).filter(([,q])=>q.npc===n.id);
    const ready=quests.some(([id])=>questReady(s,id));
    const available=quests.some(([id,q])=>!s.quests[id]&&(!q.requires||s.quests[q.requires]?.status==='done'));
    if(ready||available)this.label(g,ready?'◆':'!',n.x,n.y-64,'#f0ce84',20);
    this.label(g,n.name,n.x,n.y-45,'#f0dca6',12);
  }
  player(g,p,s) {
    this.shadow(g,p.x,p.y,30);
    const moving=p.moving&&!this.reduced,frame=moving?1+Math.floor(s.time*8)%2:0;
    g.save();
    if(p.invulnerable>.3&&Math.floor(s.time*15)%2)g.globalAlpha=.6;
    if(p.dead) {g.translate(p.x,p.y-13);g.rotate(Math.PI/2);g.drawImage(this.art.player[0],-20,-23);}
    else {
      const sprite=p.facing.y<-.45?this.art.playerBack[frame]:this.art.player[frame];
      g.drawImage(sprite,Math.round(p.x-20),Math.round(p.y-41-(p.attackTime>0?2:0)));
    }
    if(p.attackTime>0&&!p.dead) {
      const fx=[...s.effects].reverse().find(f=>['slash','finisher','burst'].includes(f.type));
      if(fx){g.save();g.translate(p.x,p.y-16);g.rotate((fx.angle||0)+(1-p.attackTime/.2)*1.4-.7);g.fillStyle='#ebdfb0';g.fillRect(15,-2,28,4);g.fillStyle='#b68e54';g.fillRect(12,-6,4,12);g.restore();}
    }
    g.restore();
    g.fillStyle='#dfd5aa';g.fillRect(p.x-2,p.y+8,4,2);
  }
  enemy(g,e,s) {
    const def=ENEMIES[e.type],sprite=this.art[e.type][this.reduced?0:Math.floor(s.time*5+e.x)%3];
    this.shadow(g,e.x,e.y,def.boss?50:30);
    if(e.hit>0)g.globalAlpha=.6;
    g.drawImage(sprite,Math.round(e.x-sprite.width/2),Math.round(e.y-sprite.height+7));g.globalAlpha=1;
    if(e.mode==='chase'||e.mode==='windup'||e.mode==='pounce'||e.hp<def.hp||s.targetId===e.id) {
      const w=def.boss?70:40,y=e.y-sprite.height-5;
      g.fillStyle='#182d2c';g.fillRect(e.x-w/2-1,y-1,w+2,6);
      g.fillStyle=def.boss?'#ce8e64':'#c3a567';g.fillRect(e.x-w/2,y,w*e.hp/def.hp,4);
      if(def.boss||s.targetId===e.id)this.label(g,def.name,e.x,y-8,'#f0d7b0',12);
    }
  }
  renderMap(s) {
    const g=this.map.getContext('2d');g.imageSmoothingEnabled=false;g.drawImage(this.mapGround,0,0);
    const point=(x,y,color,r=3)=>{g.fillStyle=color;g.fillRect(x/WIDTH*232-r/2,y/HEIGHT*155-r/2,r,r);};
    for(const npc of NPCS)point(npc.x,npc.y,'#e6bf75');
    for(const l of LANDMARKS) {
      if(l.kind==='herb'&&!s.harvested.includes(l.id))point(l.x,l.y,'#a9d5a2');
      if(l.kind==='rune'&&!s.runes.includes(l.id))point(l.x,l.y,'#edbd85',4);
      if(l.kind==='seal')point(l.x,l.y,s.flags.sealRestored?'#a1ede0':'#dc9c82',5);
      if(l.kind==='beacon')point(l.x,l.y,s.flags.beaconLit?'#a1ede0':'#dc9c82',5);
    }
    for(const e of s.enemies)if(e.hp>0&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<260)point(e.x,e.y,'#e49078',ENEMIES[e.type].boss?5:3);
    const p=s.player;g.strokeStyle='#fff2c8';g.strokeRect(p.x/WIDTH*232-4,p.y/HEIGHT*155-4,8,8);point(p.x,p.y,'#fff4cf',3);
  }
}

/* Slot Rush illustrated scenery – v0.2.0
   Hand-composed trackside environments with baked organic material textures.
   Everything stays beneath the gameplay rails, never in front of the car.
   Assets are generated once per chosen map, not re-painted every frame. */
(function(root){
'use strict';
const W=960,H=600,TAU=Math.PI*2;
const THEMES=[
 {name:'Garage workshop',base:[48,55,47],grain:12,accent:'#c39e71',glow:'#e7c78b',kind:'garage'},
 {name:'Speedway',base:[44,57,56],grain:12,accent:'#bfdbcb',glow:'#cbdcda',kind:'speedway'},
 {name:'Woodland',base:[37,62,44],grain:16,accent:'#a7bc80',glow:'#c8d79b',kind:'woodland'},
 {name:'Pit paddock',base:[63,59,49],grain:15,accent:'#c7a777',glow:'#e9cc98',kind:'paddock'},
 {name:'Grand Prix',base:[51,64,49],grain:13,accent:'#d8cf9e',glow:'#f0daa4',kind:'grandprix'},
 {name:'Desert canyon',base:[91,70,54],grain:23,accent:'#d3a578',glow:'#f9d3a1',kind:'desert'},
 {name:'Harbor docks',base:[34,58,63],grain:14,accent:'#80b6bf',glow:'#b2e1d7',kind:'harbor'},
 {name:'Highland forest',base:[42,57,50],grain:18,accent:'#a2baa0',glow:'#d0d5b9',kind:'highland'},
 {name:'Midnight speedway',base:[33,38,55],grain:10,accent:'#a9b7ef',glow:'#b7c8ff',kind:'night'},
 {name:'Championship arena',base:[50,45,57],grain:13,accent:'#e0be93',glow:'#f6d4a0',kind:'final'}
];
function hash(x,y,seed){
 let h=Math.imul((x|0)+31,374761393)^Math.imul((y|0)+seed,668265263);
 h=(h^(h>>>13))|0;h=Math.imul(h,1274126177);
 return ((h^(h>>>16))>>>0)/4294967295;
}
function random(seed){let value=(seed*718361+179424673)|0;return function(){value^=value<<13;value^=value>>>17;value^=value<<5;return (value>>>0)/4294967296;};}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function gradNoise(x,y,size,seed){
 const gx=x/size,gy=y/size,ix=Math.floor(gx),iy=Math.floor(gy);
 let fx=gx-ix,fy=gy-iy;
 fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
 const a=hash(ix,iy,seed),b=hash(ix+1,iy,seed),c=hash(ix,iy+1,seed),d=hash(ix+1,iy+1,seed);
 return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
function materialLayer(g,theme,index){
 const image=g.createImageData(W,H),data=image.data,b=theme.base,amount=theme.grain,seed=index*433+91;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const coarse=gradNoise(x,y,92,seed)-.5;
  const mid=gradNoise(x,y,23,seed+7)-.5;
  const fine=hash(x,y,seed+17)-.5;
  const mottled=coarse*amount*2+mid*amount*.65+fine*amount*.95;
  const cx=(x-W*.52)/W,cy=(y-H*.44)/H;
  const edge=(cx*cx+cy*cy)*28;
  const sun=(1-y/H)*8+(1-x/W)*3;
  const p=(y*W+x)*4;
  data[p]=clamp(b[0]+mottled-edge+sun,0,255);
  data[p+1]=clamp(b[1]+mottled*.92-edge+sun,0,255);
  data[p+2]=clamp(b[2]+mottled*.74-edge+sun*.7,0,255);
  data[p+3]=255;
 }
 g.putImageData(image,0,0);
}
function stroke(g,x1,y1,x2,y2,color,w=1){
 g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w;g.strokeStyle=color;g.stroke();
}
function poly(g,pts,fill,strokeColor,w=1){
 g.beginPath();g.moveTo(pts[0][0],pts[0][1]);
 for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);
 g.closePath();g.fillStyle=fill;g.fill();
 if(strokeColor){g.strokeStyle=strokeColor;g.lineWidth=w;g.stroke();}
}
function oval(g,x,y,rx,ry,fill,rot=0){
 g.beginPath();g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),rot,0,TAU);
 g.fillStyle=fill;g.fill();
}
function radial(g,x,y,r,inner,outer){
 const c=g.createRadialGradient(x-r*.28,y-r*.3,1,x,y,r);
 c.addColorStop(0,inner);c.addColorStop(1,outer);return c;
}
function shade(g,x,y,w,h,colors){
 const c=g.createLinearGradient(x,y,x+w*.3,y+h);
 colors.forEach((v,i)=>c.addColorStop(i/(colors.length-1),v));
 return c;
}
function section(g,x,y,w,h,col,outline='#ffffff19'){
 g.fillStyle=col;g.fillRect(x,y,w,h);
 if(outline){g.strokeStyle=outline;g.lineWidth=1;g.strokeRect(x+.5,y+.5,w-1,h-1);}
}
function floorDecals(g,seed,count,baseColor){
 const rnd=random(seed);
 for(let i=0;i<count;i++){
  const x=rnd()*W,y=rnd()*H;
  if(rnd()<.5){oval(g,x,y,2+rnd()*8,.4+rnd()*1.6,baseColor,rnd()*2);}
  else{stroke(g,x,y,x+2+rnd()*12,y-1+rnd()*2,'#d9d3b219',.6+rnd());}
 }
}
function rubber(g,x,y,w,h,rnd){
 g.save();g.translate(x,y);g.rotate(rnd()*.15-.075);
 g.strokeStyle='#161c1a66';g.lineWidth=2.2;
 for(let line=0;line<2;line++){
  g.beginPath();g.moveTo(line*8,-h/2);g.bezierCurveTo(-3+line*8,-h*.2,5+line*8,h*.15,line*8,h/2);g.stroke();
 }
 g.restore();
}
function kerb(g,x,y,w,rnd){
 g.save();g.translate(x,y);g.rotate((rnd()-.5)*.13);
 const depth=16;
 section(g,4,5,w,depth,'#10191884',null);
 section(g,0,0,w,depth,shade(g,0,0,w,depth,['#d4d4c5','#838c85']),'#f4eadf22');
 for(let i=0;i<w;i+=19)section(g,i+1,1,12,depth-2,i%38?'#e4d7bb':'#b5634e',null);
 g.restore();
}
function foliage(g,x,y,r,rnd,night=false){
 oval(g,x+5,y+7,r*1.07,r*.93,'#0c1913b7');
 const green=night?['#243e38','#335747','#466652','#6a7d5c']:['#284c36','#426f46','#588551','#809b59'];
 const n=8;
 for(let i=0;i<n;i++){
  const ang=i*TAU/n+.2,off=r*.38;
  const px=x+Math.cos(ang)*off,py=y+Math.sin(ang)*off;
  oval(g,px,py,r*(.48+rnd()*.19),r*(.41+rnd()*.23),radial(g,px,py,r*.8,green[2],green[0]));
 }
 oval(g,x-r*.19,y-r*.2,r*.68,r*.58,radial(g,x-r*.18,y-r*.2,r*.7,green[3],green[1]));
 for(let i=0;i<10;i++){
  let a=rnd()*TAU,d=rnd()*r*.78,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
  oval(g,px,py,1.1+rnd()*2,.7+rnd(),rnd()<.3?'#cad79d99':'#a2b88366');
 }
}
function fir(g,x,y,h,rnd){
 oval(g,x+5,y+6,h*.31,h*.31,'#101e1bbb');
 section(g,x-2,y,4,12,'#735c47',null);
 const tints=['#203d31','#2c5340','#487357','#658b6b'];
 for(let tier=0;tier<4;tier++){
  const half=h*(.30-tier*.038),top=y-h*.63+tier*h*.19;
  poly(g,[[x,top],[x-half,y+12+tier*h*.04],[x+half,y+12+tier*h*.04]],tints[tier],'#809b8159');
  stroke(g,x,top+8,x-half*.24,y+6+tier*h*.04,'#9db6a24c',1);
 }
}
function rock(g,x,y,r,rnd,sand=false){
 const pts=[],n=7;for(let i=0;i<n;i++){let a=i*TAU/n,d=r*(.77+rnd()*.3);pts.push([x+Math.cos(a)*d,y+Math.sin(a)*d*.66]);}
 poly(g,pts,sand?'#483729b3':'#142019ae');
 const shift=pts.map(p=>[p[0]-4,p[1]-6]);
 poly(g,shift,radial(g,x-3,y-6,r,sand?'#c5a078':'#809488',sand?'#78604c':'#3e544d'),'#c3b29624');
 poly(g,[[x-3,y-6],shift[0],shift[1]],[0].length&& (sand?'#d6b68b77':'#b1bfb077'));
 stroke(g,x-r*.3,y-r*.35,x+r*.18,y-r*.17,sand?'#e4cba17f':'#b9cdc270',1);
}
function stand(g,x,y,w,h,rnd,roof='#485d55'){
 section(g,x+7,y+9,w,h,'#101919bb',null);
 section(g,x,y,w,h,shade(g,x,y,w,h,['#61746c','#242e30','#1e2727']),'#a2b0aa55');
 for(let row=0;row<3;row++){
  let top=y+6+row*(h-11)/3;
  section(g,x+4,top,w-8,(h-16)/3,row%2?'#283637':'#364645',null);
  for(let col=0;col<w-12;col+=6){
   if(rnd()>.21){
    const tint=['#baa17d','#879e98','#b0babb','#d4bc98','#617a72'][Math.floor(rnd()*5)];
    oval(g,x+8+col+2*rnd(),top+4+rnd()*4,1.3,1.1,tint);
   }
  }
 }
 poly(g,[[x-7,y-4],[x+w+5,y-4],[x+w+13,y+6],[x-10,y+6]],shade(g,x-6,y-5,w,12,[roof,'#1d2e2b']),'#c5d5c044');
 stroke(g,x+3,y+h-5,x+w-3,y+h-5,'#d0cbb580',1.6);
}
function trailer(g,x,y,w,h,rnd,color='#697a6d'){
 section(g,x+7,y+8,w,h,'#0e1812b5',null);
 section(g,x,y,w,h,shade(g,x,y,w,h,['#aab3a5',color,'#364a40']),'#d0d6c355');
 section(g,x+9,y+9,w-18,h-18,shade(g,x,y,w,h,['#778d7a','#506257']),'#dee7c034');
 for(let i=0;i<Math.floor(w/14);i++)stroke(g,x+14+i*14,y+7,x+14+i*14,y+h-7,'#ffffff22',1);
 section(g,x+w*.74,y+h*.22,w*.14,h*.51,'#30413d','#c7d8cc77');
 section(g,x+9,y+h*.2,w*.16,h*.37,'#344f55','#c2dad4b5');
 oval(g,x+w*.84,y+h*.79,3,2,'#f9e3a2');
}
function floodlight(g,x,y,light){
 oval(g,x+8,y+12,18,8,'#00000055');
 section(g,x-2,y-3,4,33,'#77837c','#aebdb0');
 poly(g,[[x-10,y-9],[x+11,y-9],[x+7,y-3],[x-7,y-3]],'#384844','#c8d2c088');
 for(let i=0;i<4;i++)section(g,x-7+i*4,y-8,3,3,light,null);
}
function tireStack(g,x,y,r=11){
 oval(g,x+3,y+4,r+4,r*.62,'#0008');
 for(let i=2;i>=0;i--){
  oval(g,x,y-i*3,r,r*.62,'#111a19','#000');
  g.strokeStyle='#75807566';g.lineWidth=1;g.beginPath();g.ellipse(x,y-i*3,r-2,r*.47,0,0,TAU);g.stroke();
  oval(g,x,y-i*3,r*.45,r*.24,'#303d39');
 }
}
function tents(g,x,y,w,rnd,tint){
 oval(g,x+w*.55,y+w*.46,w*.65,w*.32,'#101a19b0');
 poly(g,[[x,y+w*.28],[x+w/2,y-w*.19],[x+w,y+w*.28],[x+w*.84,y+w*.57],[x+w*.16,y+w*.57]],
  shade(g,x,y,w,w*.6,['#ecdfca',tint,'#716c63']),'#e6dbbd88');
 poly(g,[[x+w/2,y-w*.19],[x+w,y+w*.28],[x+w*.53,y+w*.15]],'#ffffff3d');
 for(let i=0;i<3;i++)stroke(g,x+i*w*.5,y+w*.3,x+i*w*.5,y+w*.7,'#333e3b',2);
}
function canyonRidges(g,seed,rnd){
 for(let band=0;band<4;band++){
  const ox=band%2?766:0,oy=85+band*135,points=[[ox,oy+25]];
  for(let i=0;i<=11;i++){const x=ox+i*18,y=oy+14*Math.sin(i*.8+band)+rnd()*13;points.push([x,y]);}
  points.push([ox+198,oy+88],[ox,oy+89]);
  poly(g,points,band%2?'#6b5344':'#815f49','#bd926b70');
  for(let i=0;i<14;i++){
   const x=ox+rnd()*193,y=oy+24+rnd()*60;
   stroke(g,x,y,x+3+rnd()*15,y-2-rnd()*8,'#c49a7268',.8+rnd());
  }
 }
}
function pier(g,x,y,w,h,rnd){
 section(g,x+4,y+7,w,h,'#0c1a1db6',null);
 section(g,x,y,w,h,shade(g,x,y,w,h,['#a5997b','#625d52','#3c4846']),'#d0c0a266');
 for(let p=5;p<w;p+=9)stroke(g,x+p,y+2,x+p,y+h-2,'#302c2a88',1);
 for(let p=13;p<w;p+=40){section(g,x+p,y+h*.36,7,7,'#d0caba','#4c4b41');}
}
function water(g,x,y,w,h,rnd){
 section(g,x,y,w,h,shade(g,x,y,w,h,['#31616e','#173c4c','#0b2737']),'#6594a077');
 for(let i=0;i<230;i++){
  const px=x+4+rnd()*(w-8),py=y+2+rnd()*(h-4);
  const length=4+rnd()*26;
  stroke(g,px,py,Math.min(x+w-3,px+length),py+rnd()-.5,
   rnd()<.66?'#9cc6c03d':'#173b48bb',.7+rnd());
 }
}
function stripedRunoff(g,x,y,w,h,rnd){
 section(g,x,y,w,h,'#343f3c77','#6c7d7644');
 for(let i=0;i<w;i+=21)poly(g,[[x+i,y],[x+i+9,y],[x+i,y+h],[x+i-9,y+h]],
    i%42?'#d7b68e30':'#9bb2ad30');
}
function signs(g,x,y,w,color){
 // Team/pit insignia made of lines and color bars, never obscured giant letters.
 section(g,x,y,w,17,'#1f2b2b','#b9c4b35c');
 for(let i=0;i<4;i++)section(g,x+7+i*22,y+5,15,6,i%2?color:'#e5d8ba',null);
}
function decorateStatic(g,index,theme,rnd){
 const gold=theme.accent;
 floorDecals(g,index*39+6,index===5?1800:950,index===5?'#e8b58420':'#cdd8c61b');
 // Surface variation is integrated into every scene rather than floating icons.
 for(let i=0;i<15;i++){
  const x=45+rnd()*865,y=54+rnd()*495;
  if(i%3===0)rubber(g,x,y,5,16+rnd()*35,rnd);
 }
 switch(theme.kind){
 case 'garage':
  stripedRunoff(g,36,37,890,88,rnd);
  for(let i=0;i<5;i++)section(g,58+i*165,45,145,64,
     shade(g,58+i*165,45,145,64,['#707c6a','#333f37']),'#a9b7a04c');
  for(let i=0;i<10;i++)stroke(g,55+i*84,124,91+i*84,124,'#d0bd9588',2);
  trailer(g,66,493,190,50,rnd,'#586d61');
  for(let i=0;i<5;i++)tireStack(g,655+i*31,518,12);
  trailer(g,684,62,208,49,rnd,'#5b6c60');
  floodlight(g,316,73,'#efdfb0');floodlight(g,594,73,'#e9d8ad');
  kerb(g,311,544,328,rnd);
  break;
 case 'speedway':
  stripedRunoff(g,30,34,900,98,rnd);
  stand(g,45,42,378,86,rnd);stand(g,529,42,379,86,rnd);
  stand(g,276,518,420,65,rnd);
  kerb(g,62,466,154,rnd);kerb(g,746,469,154,rnd);
  for(let i=0;i<7;i++)floodlight(g,87+i*129,129,theme.glow);
  signs(g,392,139,177,gold);
  break;
 case 'woodland':
  for(let i=0;i<34;i++){
   let x=34+i*27+(rnd()-.5)*20,y=49+(i%4)*24;
   foliage(g,x,y,14+rnd()*11,rnd);
   x=40+i*27+(rnd()-.5)*18;y=540+(i%3)*16;
   foliage(g,x,y,15+rnd()*13,rnd);
  }
  for(let i=0;i<24;i++){
   let x=i%2?55+rnd()*90:790+rnd()*113,y=155+rnd()*295;
   foliage(g,x,y,8+rnd()*9,rnd);
  }
  for(let i=0;i<35;i++)rock(g,20+rnd()*920,35+rnd()*540,3+rnd()*5,rnd);
  kerb(g,333,539,270,rnd);
  break;
 case 'paddock':
  stripedRunoff(g,43,41,875,99,rnd);
  for(let i=0;i<5;i++)trailer(g,55+i*179,54,156,60,rnd,
    i%2?'#707568':'#566d68');
  for(let i=0;i<7;i++){
   tireStack(g,60+i*28,500,10);
   kerb(g,78+i*120,540,96,rnd);
  }
  for(let i=0;i<5;i++)rock(g,720+i*36,460,4+rnd()*5,rnd);
  signs(g,361,508,242,gold);
  break;
 case 'grandprix':
  for(let i=0;i<6;i++){
   let x=35+i*155;
   stand(g,x,45,143,78,rnd,'#5c6c50');
  }
  stand(g,72,524,300,60,rnd);stand(g,587,524,300,60,rnd);
  tents(g,418,506,116,rnd,'#ceb98b');
  for(let i=0;i<18;i++)foliage(g,20+i*52,152+(i%3)*6,7+rnd()*5,rnd);
  signs(g,386,137,194,gold);
  break;
 case 'desert':
  canyonRidges(g,index,rnd);
  for(let i=0;i<66;i++){
   const x=22+rnd()*916,y=38+rnd()*525;
   rock(g,x,y,5+rnd()*16,rnd,true);
  }
  for(let i=0;i<180;i++){
   const x=rnd()*W,y=rnd()*H;
   stroke(g,x,y,x+3+rnd()*20,y-(rnd()*3),'#eac9a52a',1.2);
  }
  kerb(g,315,540,300,rnd);
  break;
 case 'harbor':
  water(g,33,50,133,498,rnd);water(g,791,44,130,500,rnd);
  pier(g,55,82,94,58,rnd);pier(g,814,370,88,71,rnd);
  for(let i=0;i<5;i++){
   trailer(g,240+i*129,43,109,51,rnd,i%2?'#607c7f':'#6c7069');
  }
  for(let i=0;i<10;i++){
   const y=155+i*37;
   oval(g,64,y,4.2,4.2,i%2?'#e7c68a':'#9fd5ce');
   oval(g,881,y,4.2,4.2,i%2?'#e7c68a':'#9fd5ce');
  }
  signs(g,330,519,300,gold);
  break;
 case 'highland':
  for(let i=0;i<34;i++){
   const x=30+i*28,y=52+(i%5)*15;
   fir(g,x,y,23+rnd()*18,rnd);
   fir(g,30+i*29,551+(i%3)*9,19+rnd()*22,rnd);
  }
  for(let i=0;i<28;i++){
   const x=i%2?60+rnd()*95:803+rnd()*95,y=155+rnd()*300;
   if(i%3)fir(g,x,y,11+rnd()*18,rnd);else rock(g,x,y,8+rnd()*17,rnd);
  }
  kerb(g,420,538,220,rnd);
  break;
 case 'night':
  stripedRunoff(g,40,43,880,65,rnd);
  stand(g,50,49,330,73,rnd,'#343f61');stand(g,580,49,331,73,rnd,'#343f61');
  stand(g,324,522,312,60,rnd,'#303a54');
  for(let i=0;i<18;i++){
   const x=57+i*49,y=i%2?145:491;
   floodlight(g,x,y,theme.glow);
  }
  kerb(g,57,450,140,rnd);kerb(g,740,455,140,rnd);
  signs(g,388,124,185,'#c4b6e8');
  break;
 case 'final':
  for(let i=0;i<4;i++)stand(g,48+i*222,40,206,88,rnd,'#68566c');
  stand(g,323,515,314,69,rnd,'#6b536e');
  tents(g,58,473,86,rnd,'#ce9f7c');tents(g,807,473,86,rnd,'#b5a7d9');
  signs(g,396,140,171,'#c9af89');
  for(let i=0;i<5;i++)floodlight(g,105+i*189,147,theme.glow);
  kerb(g,310,545,360,rnd);
  break;
 }
}
function animated(g,index,time,reduce){
 const kind=THEMES[index].kind,t=reduce?0:time;
 g.save();
 if(['grandprix','speedway','final'].includes(kind)){
  const count=kind==='final'?7:6,baseY=kind==='grandprix'?158:144;
  for(let i=0;i<count;i++){
   const x=77+i*(810/(count-1)),w=22,dy=Math.sin(t*1.2+i*.65)*2.7;
   stroke(g,x,baseY,x,baseY+29,'#839286',2);
   poly(g,[[x+2,baseY+1],[x+w,baseY+3+dy],[x+w-3,baseY+13+dy*.5],[x+2,baseY+11]],
    i%2?'#bd8c73':'#ded1ac','#ffffff4d');
  }
 }
 if(kind==='harbor'){
  for(let i=0;i<28;i++){
   const side=i%2?812:51,y=62+(i*57)%463;
   const x=side+((i*11+t*4)%(i%2?77:98));
   stroke(g,x,y,x+10+4*Math.sin(i+t),y,'#add7d25a',1.1);
  }
 }
 if(['garage','paddock','night','final'].includes(kind)){
  const count=kind==='night'?15:6;
  for(let i=0;i<count;i++){
   const x=67+i*(kind==='night'?59:155),y=kind==='night'?127:141,
    power=.55+.4*Math.sin(t*1.25+i*.75);
   g.globalAlpha=.23+power*.36;
   oval(g,x,y,3.5,2,THEMES[index].glow);
  }
  g.globalAlpha=1;
 }
 if(kind==='desert'){
  for(let i=0;i<23;i++){
   const x=40+((i*71+t*(1.5+i%4))%890),y=143+(i*29)%330;
   stroke(g,x,y,x+4+(i%4)*2,y-1,'#ecd0ad44',1);
  }
 }
 if(['woodland','highland'].includes(kind)){
  for(let i=0;i<20;i++){
   const x=38+((i*73+t*(2+i%3))%885),
    y=152+(i*37)%302+Math.sin(t*.7+i)*4;
   oval(g,x,y,1.8,1.1,i%3?'#d6c79a67':'#88b39a67',i*.7);
  }
 }
 g.restore();
}
let cacheMap=-1,cache=null;
function getScene(index){
 if(cache&&cacheMap===index)return cache;
 if(!root.document||typeof root.document.createElement!=='function')return null;
 const canvas=root.document.createElement('canvas');canvas.width=W;canvas.height=H;
 const g=canvas.getContext('2d');if(!g||typeof g.createImageData!=='function')return null;
 const theme=THEMES[index],rnd=random(index*41+2718);
 materialLayer(g,theme,index);
 decorateStatic(g,index,theme,rnd);
 cacheMap=index;cache=canvas;return cache;
}
function draw(ctx,index,time,reducedMotion){
 const map=clamp(index|0,0,THEMES.length-1),scene=getScene(map);
 if(scene)ctx.drawImage(scene,0,0,W,H);
 else{ctx.fillStyle='#29372e';ctx.fillRect(0,0,W,H);}
 animated(ctx,map,time,!!reducedMotion);
}
root.SlotRushScenery={draw,THEMES,reset(){cacheMap=-1;cache=null;}};
})(window);

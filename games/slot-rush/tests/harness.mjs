import fs from 'node:fs';
import vm from 'node:vm';
export function loadGame({html,storage=new Map(),width=960,dpr=1,failStorage=false}={}){
 html??=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const counts={},elements=new Map(),events={},pending=new Map();let raf=0;
 const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get(o,k){if(k in o)return o[k];return (...args)=>{counts[k]=(counts[k]||0)+1;};}});
 function element(id){
  if(!elements.has(id)){
   const classes=new Set();
   elements.set(id,{id,textContent:'',innerHTML:'',dataset:{},style:{},width:960,height:600,clientWidth:width,
    classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},toggle(k,on){if(on)classes.add(k);else classes.delete(k);},contains:k=>classes.has(k)},
    getContext:()=>context,getBoundingClientRect(){counts.layout=(counts.layout||0)+1;return {width};},
    setAttribute(k,v){this[k]=v;},addEventListener(k,f){this[k]=f;},setPointerCapture(){}});
  }
  return elements.get(id);
 }
 const document={hidden:false,getElementById:element,createElement:()=>element('canvas'+elements.size),addEventListener:(k,f)=>events[k]=f};
 const sandbox={document,console,Math,Map,Set,ResizeObserver:class{observe(){}},localStorage:{getItem:k=>storage.get(k)??null,setItem(k,v){if(failStorage)throw Error('quota');storage.set(k,v);}},requestAnimationFrame(f){pending.set(++raf,f);return raf;},cancelAnimationFrame:id=>pending.delete(id)};
 sandbox.SlotRushScenery={draw:()=>context.drawImage()};sandbox.window=sandbox;sandbox.devicePixelRatio=dpr;sandbox.matchMedia=()=>({matches:false});sandbox.addEventListener=(k,f)=>events[k]=f;
 vm.createContext(sandbox);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],sandbox);
 return {api:sandbox.slotRushDebug,elements,events,document,counts,storage,frame(now){const callbacks=[...pending.values()];pending.clear();callbacks.forEach(f=>f(now));},pending,context,sandbox};
}
export function select(g,map=0,lane=0){g.api.changeMap();g.api.chooseMap(map);g.api.showLaneSelect();g.api.chooseLane(lane);g.api.confirmRace();for(let i=0;i<410;i++)g.api.tick(1/120);}
export function drive(g,{steps=36000,crash=false}={}){
 for(let i=0;i<steps;i++){
  const s=g.api.getState();if(s.state==='finished')return s;
  let maxK=0;for(let d=0;d<=100;d+=10)maxK=Math.max(maxK,Math.abs(g.api.laneAt(s.distance+d).k));
  g.api.setGas(crash||s.speed<Math.min(280,Math.sqrt(590*.72/(maxK||.0001))));g.api.tick(1/120);
 }
 throw Error('Run did not finish');
}

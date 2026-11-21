import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real game closure, without exposing debug controls in production.
export function loadGame({width=960, height=640, dpr=1, seed=7, reducedMotion=false, source}={}) {
  const counts = {}, elements = new Map(), events = {}, pending = new Map();
  let now = 0, raf = 0, serial = 0;
  const viewport = {width, height};
  const context = new Proxy({
    createLinearGradient: () => ({addColorStop(){}}),
    createRadialGradient: () => ({addColorStop(){}})
  }, {get(o,k) { return k in o ? o[k] : (...args) => { counts[k] = (counts[k] || 0) + 1; }; }});
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(/overlayPause|overlayRotate|upgradeOverlay/.test(id) ? ['hidden'] : []);
    const listeners = {}, attributes = {};
    const el = {id, textContent:'', innerHTML:'', children:[], hidden:false, dataset:{},
      style:{setProperty(k,v){this[k]=v;}},
      classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},contains:k=>classes.has(k),
        toggle(k,on){on ??= !classes.has(k); if(on)classes.add(k);else classes.delete(k);}},
      getContext:()=>context,
      getBoundingClientRect(){counts.layout=(counts.layout||0)+1;return {left:0,top:0,width:viewport.width,height:viewport.height};},
      setAttribute(k,v){attributes[k]=String(v);}, getAttribute:k=>attributes[k] ?? null,
      append(...v){this.children.push(...v);}, replaceChildren(...v){this.children=v;},
      querySelector:()=>el.children[0] ?? null,
      addEventListener(k,f){(listeners[k]??=[]).push(f);},
      dispatch(k,e={}){for(const f of listeners[k]||[])f(e);},
      focus(){document.activeElement=el;}, closest:()=>null,
    };
    elements.set(id,el); return el;
  }
  const listen = (k,f) => (events[k] ??= []).push(f);
  const document = {hidden:false,body:element('body'),documentElement:element('html'),
    getElementById:element,createElement:tag=>element(tag+serial++),
    querySelector:s=>s==='.dxball-wrap'?element('wrap'):null,
    querySelectorAll:()=>[element('guide1'),element('guide2')],addEventListener:listen};
  const math = Object.create(Math);
  math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const sandbox={document,console,Math:math,performance:{now:()=>now},
    devicePixelRatio:dpr,innerHeight:height,
    matchMedia:q=>({matches:q.includes('reduced-motion') && reducedMotion}),
    getComputedStyle:()=>({position:'static'}),addEventListener:listen,
    requestAnimationFrame(f){pending.set(++raf,f);return raf;}};
  sandbox.window=sandbox;
  source ??= fs.readFileSync(new URL('../dxball.js',import.meta.url),'utf8');
  source=source.replace(/\}\)\(\);\s*$/, `
    globalThis.ballTest = {
      step, tick, draw, resetGame, buildLevel, makeBall, applyPower, damageBrick,
      launchStuckBalls, startRunIfNeeded, primaryAction, showUpgradeDraft, chooseUpgrade,
      updateTurrets, updateSatellites, updateUI, orbitCount, turretPairs, setPaused,
      rayBoxHit, traceStickyAim, resize, updateRotateOverlay,
      get state(){return {W,H,DPR,balls,bricks,paddle,powers,weaponBuffs,runUpgrades,
        drops,turretBullets,score,lives,levelIndex,comboHits,comboMultiplier,comboTimer,
        paused,modalOpen,gameOver,eventFeedback,draftChoices,particles,brickSprites};},
      set state(v){
        if ('bricks' in v) bricks=v.bricks;
        if ('lives' in v) lives=v.lives;
        if ('levelIndex' in v) levelIndex=v.levelIndex;
        if ('turretBullets' in v) turretBullets=v.turretBullets;
        if ('drops' in v) drops=v.drops;
        if ('mysteryShrink' in v) mysteryShrink=v.mysteryShrink;
      }
    };
  })();`);
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  const dispatch=(type,e={})=>{for(const f of events[type]||[])f(e);};
  return {api:sandbox.ballTest,elements,context,counts,document,sandbox,viewport,
    dispatch,
    key(key,options={}){dispatch('keydown',{key,preventDefault(){},...options});},
    frame(time){now=time;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(f=>f(now));},
    advance(seconds){for(let i=0;i<Math.round(seconds*120);i++)sandbox.ballTest.step(1/120);},
    resize(w,h){viewport.width=w;viewport.height=h;sandbox.innerHeight=h;dispatch('resize');},
  };
}

export const brick=(x=400,y=180,hp=3,extra={})=>({x,y,w:70,h:22,hp,maxHp:hp,indestructible:false,mystery:false,satCooldown:0,...extra});
export function arena(g, bricks=[brick()]) {
  g.api.startRunIfNeeded();
  g.api.state={bricks};
  g.api.state.balls.length=0;
  // A distant target keeps isolated collision tests on the same level.
  bricks.push(brick(850,70,3));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { HUD_KEY, readLayout, project, resolveLayout } from '../js/hud-layout.js';
const base = {
  player:{x:10,y:10,w:160,h:55}, target:{x:10,y:82,w:160,h:75},
  map:{x:1070,y:10,w:190,h:150}, tracker:{x:1050,y:172,w:210,h:125},
  abilities:{x:478,y:625,w:324,h:75}
};
const view = {w:1280,h:720};
const fixed = [{x:450,y:5,w:380,h:22},{x:10,y:625,w:75,h:80}];
const prefs = (widgets={},folds={}) => ({version:1,widgets,folds});
function read(raw) { return readLayout({getItem(key){assert.equal(key,HUD_KEY); return raw;}}); }

test('HUD storage is independent, versioned, and rejects invalid positions, scales and unknown widgets', () => {
  const valid = prefs({map:{x:.75,y:.08,scale:.85}},{map:true,tracker:false});
  assert.deepEqual(read(JSON.stringify(valid)),valid);
  for (const value of [null,'{','[]',JSON.stringify({...valid,version:2}),
    JSON.stringify(prefs({target:{x:-.1,y:0,scale:1}})), JSON.stringify(prefs({player:{x:.2,y:2,scale:1}})),
    JSON.stringify(prefs({map:{x:.2,y:0,scale:'1'}})),JSON.stringify(prefs({abilities:{x:.5,y:1,scale:.8}})),
    JSON.stringify(prefs({abc:{x:0,y:0,scale:1}})),JSON.stringify(prefs([]))]) assert.deepEqual(read(value),prefs());
  assert.deepEqual(readLayout({getItem(){throw Error();}}),prefs());
});
test('both ends of each normalized axis keep scaled widgets inside the viewport', () => {
  for (const x of [0,.45,1]) for (const y of [0,.7,1]) for (const scale of [.8,1,1.25]) {
    const b = project(base.map,{x,y,scale},view);
    assert.ok(b.x>=0 && b.y>=0 && b.x+b.w<=view.w && b.y+b.h<=view.h);
  }
});
test('layouts clear occupied controls, fixed overlays and the entire camera lane', () => {
  const safe={player:{x:.18,y:.12,scale:1.1}};
  assert.ok(resolveLayout(safe,base,view,fixed));
  for (const [x,y] of [[0,.13],[.5,0],[.99,.05],[.22,.5],[0,1]]) {
    assert.equal(resolveLayout({player:{x,y,scale:1}},base,view,fixed),null);
  }
  assert.equal(resolveLayout({abilities:{x:.5,y:1,scale:1.25}},base,{w:390,h:600},[]),null);
  assert.deepEqual(safe.player,{x:.18,y:.12,scale:1.1});
});

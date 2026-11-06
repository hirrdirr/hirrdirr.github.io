import test from "node:test";
import assert from "node:assert/strict";
import {loadDiscoveryData,makeDemoReleases,demoCatalog,gameLink,stockholmMonday} from "../assets/discover/game-data.mjs";
import {scoreFor} from "../assets/discover/explore-core.mjs";

test("Stockholm week begins Monday across a local DST boundary",()=>{
  assert.equal(stockholmMonday(new Date("2026-11-06T08:00:00Z")).toISOString().slice(0,10),"2026-11-02");
  assert.equal(stockholmMonday(new Date("2026-03-29T22:15:00Z")).toISOString().slice(0,10),"2026-03-30");
});

test("demo releases are dynamic, bounded, explicitly fictional and never fake IGDB URLs",()=>{
  const data=makeDemoReleases(new Date("2026-11-06T08:00:00Z"));
  assert.equal(data.window_start,"2026-10-19");
  assert.equal(data.window_end,"2026-12-14");
  assert.ok(data.games.length>=5);
  assert.ok(data.games.every(g=>g.id>=910000 && g.name.startsWith("DEMO: ") && !g.slug));
  assert.equal(new Set(data.games.map(g=>g.id)).size,data.games.length);
  assert.ok(demoCatalog(new Date("2026-11-06T08:00:00Z")).length>data.games.length);
});

test("default mode falls back to demo when keys have not generated a cache",async()=>{
  const result=await loadDiscoveryData({
    now:new Date("2026-11-06T08:00:00Z"),
    fetcher:async()=>({ok:true,json:async()=>({generated_at:null,games:[]})})
  });
  assert.equal(result.demo,true);
  assert.equal(result.reason,"not-connected");
  assert.equal(result.data.games[0].name,"DEMO: Starbound Trails");
});

test("explicit demo does not call the network",async()=>{
  const result=await loadDiscoveryData({forceDemo:true,fetcher:()=>{throw Error("Must not fetch");}});
  assert.equal(result.demo,true);
  assert.equal(result.reason,"forced");
});

test("network outage falls back to demo instead of a broken blank page",async()=>{
  const result=await loadDiscoveryData({fetcher:()=>Promise.reject(Error("offline"))});
  assert.equal(result.demo,true);
  assert.equal(result.reason,"unavailable");
});

test("valid live cache, including a genuinely empty week, never turns into invented games",async()=>{
  const original={source:"IGDB",generated_at:"2026-11-06T07:30:00+00:00",
    window_start:"2026-10-19",window_end:"2026-12-14",games:[]};
  const result=await loadDiscoveryData({fetcher:async()=>({ok:true,json:async()=>original})});
  assert.equal(result.demo,false);
  assert.deepEqual(result.data.games,[]);
});

test("a game link preserves the integer ID and opt-in demo status",()=>{
  assert.equal(gameLink(910001,true),"/discover/game/?id=910001&demo=1");
  assert.equal(gameLink(1234,false),"/discover/game/?id=1234");
  assert.equal(scoreFor({rating:82,rating_count:143}),4.1);
});

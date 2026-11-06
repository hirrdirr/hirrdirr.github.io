import test from "node:test";
import assert from "node:assert/strict";
import {WISHLIST_LIMIT,wishlistKey,snapshotGame,normalizeWishlist,wishlistToggle,wishlistSort} from "../assets/discover/wishlist-core.mjs";

const when="2026-11-06T09:00:00Z";
const game={id:910001,name:"DEMO: Starbound Trails",date:"2026-11-02",genres:["Indie","Äventyr"],cover_id:null,summary:"Ett påhittat spel."};
test("real games and fictional demos cannot share a wishlist identity",()=>{
  assert.equal(wishlistKey(910001,true),"demo:910001");
  assert.equal(wishlistKey(910001,false),"igdb:910001");
  assert.equal(wishlistKey(-1),null);
  const d=wishlistToggle([],game,true,when);
  const r=wishlistToggle(d.items,game,false,when);
  assert.equal(r.items.length,2);
});
test("saving a game stores a durable compact snapshot without prices or ratings",()=>{
  const g={...game,price:{amount:499,currency:"SEK"},rating:82,rating_count:100,slug:"not-real"};
  const item=snapshotGame(g,true,when);
  assert.equal(item.saved_at,when);
  assert.equal(item.slug,"");
  assert.equal(item.price,undefined);
  assert.equal(item.rating,undefined);
  assert.equal(item.summary,"Ett påhittat spel.");
});
test("toggles correctly without changing the original list",()=>{
  const first=wishlistToggle([],game,true,when);
  assert.equal(first.added,true);
  assert.equal(first.items.length,1);
  const original=structuredClone(first.items);
  const second=wishlistToggle(first.items,game,true,when);
  assert.equal(second.added,false);
  assert.equal(second.changed,true);
  assert.deepEqual(second.items,[]);
  assert.deepEqual(first.items,original);
});
test("invalid or malformed storage entries are dropped and duplicates removed",()=>{
  const entry=snapshotGame(game,true,when);
  const list=normalizeWishlist({items:[entry,entry,{id:"bad",name:"Bad"},null]});
  assert.equal(list.length,1);
  assert.deepEqual(normalizeWishlist(null),[]);
});
test("collection limit prevents unlimited browser storage growth",()=>{
  const items=Array.from({length:WISHLIST_LIMIT},(_,i)=>snapshotGame({...game,id:i+1},false,when));
  const result=wishlistToggle(items,{...game,id:99999},false,when);
  assert.equal(result.changed,false);
  assert.equal(result.items.length,WISHLIST_LIMIT);
});
test("wishlist sort preserves data and sorts release dates and names",()=>{
  const a=snapshotGame({...game,id:1,name:"Zebra",date:"2025-01-01"},false,"2026-11-04T09:00:00Z");
  const b=snapshotGame({...game,id:2,name:"Alpha",date:"2026-11-01"},false,when);
  const items=[a,b];
  assert.deepEqual(wishlistSort(items,"name").map(g=>g.id),[2,1]);
  assert.deepEqual(wishlistSort(items,"release").map(g=>g.id),[2,1]);
  assert.deepEqual(wishlistSort(items,"added").map(g=>g.id),[2,1]);
  assert.deepEqual(items,[a,b]);
});

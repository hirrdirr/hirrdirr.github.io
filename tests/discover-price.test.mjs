import test from "node:test";
import assert from "node:assert/strict";
import {displayPrice} from "../assets/discover/price.mjs";

const now=new Date("2026-11-06T09:00:00Z");
const valid={price:{amount:249,currency:"SEK",shop:"Steam",checked_at:"2026-11-06T08:00:00Z"}};

test("formatted current Swedish price only when a separately sourced snapshot exists",()=>{
  const p=displayPrice(valid,{now});
  assert.equal(p.shop,"Steam");
  assert.equal(p.text,"249,00 kr");
  assert.equal(p.label,"Butikspris");
});
test("unconfigured IGDB and demo catalogs do not invent current prices",()=>{
  assert.equal(displayPrice({name:"Example"},{now}),null);
  assert.equal(displayPrice({price:null},{now}),null);
});
test("reject stale, future, foreign currency or malformed prices",()=>{
  assert.equal(displayPrice({price:{...valid.price,checked_at:"2026-11-01T08:00:00Z"}},{now}),null);
  assert.equal(displayPrice({price:{...valid.price,checked_at:"2026-11-07T08:00:00Z"}},{now}),null);
  assert.equal(displayPrice({price:{...valid.price,currency:"USD"}},{now}),null);
  assert.equal(displayPrice({price:{...valid.price,amount:-5}},{now}),null);
});
test("free and discounted offers have explicit presentation",()=>{
  const p=displayPrice({price:{...valid.price,amount:0,discount_percent:100}},{now});
  assert.equal(p.text,"Gratis");
  assert.equal(p.discount,100);
});
test("demo prices are marked as fictional even if populated",()=>{
  const p=displayPrice(valid,{demo:true,now});
  assert.equal(p.label,"DEMO-PRIS");
  assert.equal(p.shop,"Fiktiv butik");
});

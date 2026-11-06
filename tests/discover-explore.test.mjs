import test from "node:test";
import assert from "node:assert/strict";
import {DEMO_GAMES,scoreFor,validCachedGames,genresFor,filterGames} from "../assets/discover/explore-core.mjs";
test("demo names are unmistakably fictional and identifiers unique",()=>{
  assert.equal(DEMO_GAMES.length,13);
  assert.ok(DEMO_GAMES.every(g=>g.name.startsWith("DEMO: ")));
  assert.equal(new Set(DEMO_GAMES.map(g=>g.id)).size,13);
});
test("rejects missing or malformed release entries",()=>{
  assert.deepEqual(validCachedGames(null),[]);
  assert.equal(validCachedGames({games:[{id:5,name:"OK",date:"2026-11-05"},{id:"bad",name:"No",date:"2026-11-05"}]}).length,1);
});
test("rating only counts five or more IGDB votes",()=>{
  assert.equal(scoreFor({rating:90,rating_count:5}),4.5);
  assert.equal(scoreFor({rating:90,rating_count:4}),null);
  assert.equal(scoreFor({rating:null,rating_count:100}),null);
});
test("Swedish insensitive search, exact genre and minimum rating filter",()=>{
  assert.equal(filterGames(DEMO_GAMES,{query:"NEON",genre:"Indie"}).length,1);
  assert.ok(genresFor(DEMO_GAMES).includes("Racing"));
  assert.ok(filterGames(DEMO_GAMES,{minimum:4.5}).every(g=>scoreFor(g)>=4.5));
  assert.ok(!filterGames(DEMO_GAMES,{minimum:4.5}).some(g=>g.id===990011));
});
test("sorting does not mutate source arrays",()=>{
  const copy=[...DEMO_GAMES];
  assert.equal(filterGames(copy,{sort:"name"})[0].name,"DEMO: Broken Orbit");
  assert.equal(filterGames(copy,{sort:"date"})[0].date,"2026-11-06");
  assert.deepEqual(copy,DEMO_GAMES);
});

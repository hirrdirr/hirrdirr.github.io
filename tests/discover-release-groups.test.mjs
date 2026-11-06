import test from "node:test";
import assert from "node:assert/strict";
import {groupReleasesByDate,releaseDateLabel} from "../assets/discover/release-groups.mjs";
import {makeDemoReleases} from "../assets/discover/game-data.mjs";

const input=[
  {id:1,date:"2026-11-03",name:"Bravo",rating:90,rating_count:4},
  {id:2,date:"2026-11-02",name:"Zulu",rating:80,rating_count:10},
  {id:3,date:"2026-11-03",name:"Alpha",rating:70,rating_count:25},
  {id:4,date:"2026-11-02",name:"Alpha",rating:95,rating_count:30}
];

test("groups all games for the same release day under one heading",()=>{
  const grouped=groupReleasesByDate(input);
  assert.deepEqual(grouped.map(day=>day.date),["2026-11-02","2026-11-03"]);
  assert.deepEqual(grouped.map(day=>day.games.length),[2,2]);
  assert.deepEqual(grouped[0].games.map(g=>g.name),["Alpha","Zulu"]);
});
test("sort by rating applies within dates without losing chronology or undervoted handling",()=>{
  const grouped=groupReleasesByDate(input,{sort:"rating"});
  assert.deepEqual(grouped.map(day=>day.date),["2026-11-02","2026-11-03"]);
  assert.deepEqual(grouped[1].games.map(g=>g.name),["Alpha","Bravo"]);
});
test("filters have already run upstream; grouping does not mutate input",()=>{
  const subset=input.filter(g=>g.id!==4);
  const before=structuredClone(subset);
  const groups=groupReleasesByDate(subset);
  assert.equal(groups[0].games.length,1);
  assert.deepEqual(subset,before);
});
test("Swedish labels show weekday and day/month of the release",()=>{
  assert.equal(releaseDateLabel("2026-11-02"),"Mån 2/11");
  assert.equal(releaseDateLabel("2026-11-06"),"Fre 6/11");
});
test("demo includes four fictional releases on the same day",()=>{
  const data=makeDemoReleases(new Date("2026-11-06T08:00:00Z"));
  const groups=groupReleasesByDate(data.games);
  assert.ok(groups.some(day=>day.games.length>=4));
  assert.ok(data.games.every(g=>g.name.startsWith("DEMO: ")));
});

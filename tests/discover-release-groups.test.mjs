import test from "node:test";
import assert from "node:assert/strict";
import {groupReleasesByDate,releaseWeekColumns,releaseDateLabel} from "../assets/discover/release-groups.mjs";
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

test("seven weekday columns flow Monday to Sunday, with releases stacked within matching day",()=>{
  const days=releaseWeekColumns(input,"2026-11-02");
  assert.equal(days.length,7);
  assert.deepEqual(days.map(d=>d.date),["2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08"]);
  assert.deepEqual(days.map(d=>d.games.length),[2,2,0,0,0,0,0]);
  assert.deepEqual(days[0].games.map(g=>g.name),["Alpha","Zulu"]);
});
test("weekday columns preserve same-day groups even after rating sort",()=>{
  const days=releaseWeekColumns(input,"2026-11-02",{sort:"rating"});
  assert.equal(days[0].games[0].id,4);
  assert.equal(days[1].games[0].id,3);
});
test("rejects a start date that is not Monday",()=>{
  assert.throws(()=>releaseWeekColumns(input,"2026-11-03"),RangeError);
});
test("four releases appear stacked in Monday demo column",()=>{
  const data=makeDemoReleases(new Date("2026-11-06T08:00:00Z"));
  const days=releaseWeekColumns(data.games,"2026-11-02");
  assert.ok(days[0].games.length>=4);
});

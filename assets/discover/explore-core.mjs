/* Pure, browser-independent catalog helpers for offline tests. */
const demo = [
  ["Neon Tides","2026-11-02",["Action","Indie"],84,126],
  ["Small Kingdom","2026-09-18",["Strategi","Simulation"],92,85],
  ["Echoes of Orion","2026-10-21",["RPG","Äventyr"],79,253],
  ["Monster Motel","2025-05-05",["Skräck","Indie"],73,41],
  ["Circuit Rush","2026-11-06",["Racing","Action"],null,0],
  ["Meadowbound","2022-08-17",["Simulation","Indie"],95,477],
  ["Steel Pilgrim","2024-11-11",["Action","RPG"],89,202],
  ["Mystic Circuit","2023-03-09",["Strategi","RPG"],80,12],
  ["Broken Orbit","2026-01-27",["Äventyr","Skräck"],66,78],
  ["Paper Planet","2024-06-20",["Pussel","Indie"],82,300],
  ["Glacier Run","2026-04-29",["Racing","Indie"],90,3],
  ["Valley of Sparks","2025-12-01",["Simulation","Äventyr"],87,54],
  ["Rift Botanist","2026-07-30",["Simulation","Pussel"],81,71]
];
export const DEMO_GAMES = demo.map(([name,date,genres,rating,rating_count],i)=>({
  id:990001+i,name:"DEMO: "+name,date,genres,rating,rating_count,slug:"",cover_id:null
}));
export function scoreFor(game) {
  return game && Number.isFinite(game.rating) && game.rating >= 0 && game.rating <= 100 &&
    Number.isInteger(game.rating_count) && game.rating_count>=5 ? game.rating/20 : null;
}
export function validCachedGames(json) {
  return json && Array.isArray(json.games) ? json.games.filter(g =>
    g && Number.isInteger(g.id) && g.id>0 && typeof g.name==="string" && g.name.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(g.date || "")) : [];
}
export function genresFor(games) {
  return [...new Set(games.flatMap(g=>Array.isArray(g.genres) ? g.genres.filter(x=>typeof x==="string") : []))]
    .sort((a,b)=>a.localeCompare(b,"sv"));
}
export function filterGames(games,{query="",genre="",minimum=0,sort="rating"}={}) {
  const term=String(query).trim().toLocaleLowerCase("sv-SE");
  const min=Number(minimum)||0;
  const filtered=games.filter(g=>(!term||g.name.toLocaleLowerCase("sv-SE").includes(term)) &&
    (!genre||(Array.isArray(g.genres)&&g.genres.includes(genre))) &&
    (!min||(scoreFor(g)!==null && scoreFor(g)>=min)));
  return filtered.sort((a,b)=>{
    if(sort==="name")return a.name.localeCompare(b.name,"sv");
    if(sort==="date")return b.date.localeCompare(a.date)||a.name.localeCompare(b.name,"sv");
    return (scoreFor(b)??-1)-(scoreFor(a)??-1)||b.date.localeCompare(a.date);
  });
}

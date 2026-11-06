/* Shared public data selection: demo is always explicitly labeled and never mixed with IGDB. */
import {DEMO_GAMES,validCachedGames} from "./explore-core.mjs";

const dayMs=86400000;
const iso=d=>d.toISOString().slice(0,10);
function addDays(d,n){return new Date(d.getTime()+dayMs*n);}
export function stockholmMonday(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(now);
  const value=t=>Number(parts.find(p=>p.type===t).value);
  const date=new Date(Date.UTC(value("year"),value("month")-1,value("day")));
  return addDays(date,-((date.getUTCDay()+6)%7));
}
export function makeDemoReleases(now=new Date()){
  const start=stockholmMonday(now);
  const day=n=>iso(addDays(start,n));
  return {
    source:"Fiktiv demo", generated_at:null, window_start:day(-14),window_end:day(42),
    platforms:[{id:6,name:"PC (Windows)"}],
    games:[
      {id:910001,name:"DEMO: Starbound Trails",date:day(0),genres:["Äventyr","Indie"],rating:82,rating_count:143,slug:"",cover_id:null,
        summary:"En påhittad berättelse om en ensam utforskare som söker vägen mellan avlägsna stjärnsystem."},
      {id:910008,name:"DEMO: Moonlit Mechanics",date:day(0),genres:["Simulation","Pussel"],rating:86,rating_count:78,slug:"",cover_id:null,
        summary:"Ett påhittat pusselspel om mekaniska verkstäder och märkliga uppfinningar."},
      {id:910009,name:"DEMO: Emberline",date:day(0),genres:["Action","Indie"],rating:74,rating_count:42,slug:"",cover_id:null,
        summary:"Ett fiktivt actionäventyr genom en värld av glödande ruiner."},
      {id:910010,name:"DEMO: Wanderwood",date:day(0),genres:["Äventyr","RPG"],rating:null,rating_count:0,slug:"",cover_id:null,
        summary:"Ett påhittat rollspel i en skog där varje väg leder till en ny berättelse."},
      {id:910002,name:"DEMO: Hollow Skies",date:day(2),genres:["Action","RPG"],rating:91,rating_count:65,slug:"",cover_id:null,
        summary:"Ett fiktivt action-RPG där svävande städer och förlorade minnen står i centrum."},
      {id:910003,name:"DEMO: Little Circuit",date:day(4),genres:["Strategi","Simulation"],rating:null,rating_count:0,slug:"",cover_id:null,
        summary:"Bygg ett eget litet robotverk och experimentera med smarta produktionskedjor."},
      {id:910004,name:"DEMO: After Midnight",date:day(9),genres:["Indie","Skräck"],rating:75,rating_count:28,slug:"",cover_id:null,
        summary:"En fiktiv skräckberättelse där en tyst radiostation plötsligt börjar sända igen."},
      {id:910005,name:"DEMO: Racing Lines",date:day(-4),genres:["Racing"],rating:88,rating_count:204,slug:"",cover_id:null,
        summary:"Ett påhittat arkadracingspel med snabba kurvor och neonupplysta banor."},
      {id:910006,name:"DEMO: Bloom Circuit",date:day(16),genres:["Simulation","Indie"],rating:null,rating_count:0,slug:"",cover_id:null,
        summary:"Odla din egen mekaniska trädgård i en fantasifull, påhittad värld."},
      {id:910007,name:"DEMO: Lantern Valley",date:day(30),genres:["Äventyr","Pussel"],rating:null,rating_count:0,slug:"",cover_id:null,
        summary:"Utforska en påhittad dal där ljus och skuggor förändrar vägarna."}
    ]
  };
}
export function demoCatalog(now=new Date()) {
  return [...makeDemoReleases(now).games,...DEMO_GAMES].map(g=>({
    ...g,summary:typeof g.summary==="string"?g.summary:"Det här är ett fiktivt exempelspel som används för att testa Game Discovery."
  }));
}
export function gameLink(id,demo){
  return "/discover/game/?id="+encodeURIComponent(String(id))+(demo?"&demo=1":"");
}
export async function loadDiscoveryData({forceDemo=false,fetcher=fetch,now=new Date()}={}){
  if(forceDemo)return {demo:true,reason:"forced",data:makeDemoReleases(now)};
  try {
    const response=await fetcher("/assets/data/discover/releases.json",{cache:"no-cache"});
    if(!response.ok)throw new Error("Speldatan kunde inte hämtas");
    const json=await response.json();
    const stamp=Date.parse(json.generated_at);
    // A configured but empty release week must remain a real empty week, not fake games.
    const valid=typeof json.generated_at==="string"&&Number.isFinite(stamp)&&
      typeof json.window_start==="string"&&typeof json.window_end==="string"&&
      Array.isArray(json.games);
    if(!valid)return {demo:true,reason:"not-connected",data:makeDemoReleases(now)};
    return {demo:false,reason:"connected",data:{...json,games:validCachedGames(json)}};
  } catch {
    return {demo:true,reason:"unavailable",data:makeDemoReleases(now)};
  }
}

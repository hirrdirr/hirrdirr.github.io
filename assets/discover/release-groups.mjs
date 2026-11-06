/* Deterministic, date-first release grouping used by Release Radar.
   Sorting changes the order of games within each date, never the date order. */
export function groupReleasesByDate(games,{sort="date"}={}){
  const sorted=[...games].filter(g=>g && typeof g.date==="string" && /^\d{4}-\d{2}-\d{2}$/.test(g.date))
    .sort((a,b)=>a.date.localeCompare(b.date));
  const days=[];
  for(const game of sorted){
    let group=days.at(-1);
    if(!group || group.date!==game.date){
      group={date:game.date,games:[]};
      days.push(group);
    }
    group.games.push(game);
  }
  for(const day of days){
    if(sort==="rating"){
      day.games.sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name,"sv"));
    }else{
      day.games.sort((a,b)=>a.name.localeCompare(b.name,"sv"));
    }
  }
  return days;
}
function score(game){
  return Number.isFinite(game.rating) && game.rating>=0 && game.rating<=100 &&
    Number.isInteger(game.rating_count) && game.rating_count>=5 ? game.rating : -1;
}
export function releaseDateLabel(iso){
  const d=new Date(iso+"T12:00:00Z");
  if(!Number.isFinite(d.getTime())) return iso;
  const weekday=new Intl.DateTimeFormat("sv-SE",{weekday:"short",timeZone:"UTC"}).format(d);
  return weekday.slice(0,1).toLocaleUpperCase("sv-SE")+weekday.slice(1).replace(/\.$/,"")+
    " "+d.getUTCDate()+"/"+(d.getUTCMonth()+1);
}

/* Seven side-by-side weekday columns, including days without releases. */
export function releaseWeekColumns(games, weekStart, options={}) {
  const monday=typeof weekStart==="string"
    ? new Date(weekStart+"T00:00:00Z") : new Date(weekStart);
  if(!Number.isFinite(monday.getTime()) || monday.getUTCDay()!==1)
    throw new RangeError("Expected a valid Monday for release-week columns");
  const groups=new Map(groupReleasesByDate(games,options).map(day=>[day.date,day.games]));
  return Array.from({length:7},(_,index)=>{
    const day=new Date(monday.getTime()+index*86400000);
    const date=day.toISOString().slice(0,10);
    return {date,games:groups.get(date)||[]};
  });
}

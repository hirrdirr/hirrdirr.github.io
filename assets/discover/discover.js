import {releaseWeekColumns,releaseDateLabel} from "./release-groups.mjs";
import {displayPrice} from "./price.mjs";
import {loadDiscoveryData,gameLink} from "./game-data.mjs";
/* Release Radar: consumes cached data only; never exposes API credentials. */
(() => {
  "use strict";

  const root = document.querySelector(".discover-page");
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const dayMS = 86400000;
  const prev = $("discover-prev");
  const next = $("discover-next");
  const weekLabel = $("discover-week");
  const weekRange = $("discover-week-range");
  const search = $("discover-query");
  const genreSelect = $("discover-genre");
  const sortSelect = $("discover-sort");
  const results = $("discover-games");
  const empty = $("discover-empty");
  const emptyTitle = $("discover-empty-title");
  const emptyText = $("discover-empty-text");
  const status = $("discover-status");
  const count = $("discover-count");
  const viewList = $("discover-view-list");
  const viewGrid = $("discover-view-grid");
  const dayToolbar = $("discover-day-toolbar");
  const daysLeft = $("discover-days-left");
  const daysRight = $("discover-days-right");
  let view = "list";
  const fmtShort = new Intl.DateTimeFormat("sv-SE", { day:"numeric", month:"short", timeZone:"UTC" });
  const forcedDemo = new URLSearchParams(location.search).get("demo") === "1";
  let demo = forcedDemo;
  let data = null;
  let offset = 0;

  function swedishToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone:"Europe/Stockholm", year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(new Date());
    const take = (kind) => Number(parts.find((p) => p.type === kind).value);
    return new Date(Date.UTC(take("year"), take("month") - 1, take("day")));
  }
  function monday(d) {
    const weekday = d.getUTCDay() || 7;
    return new Date(d.getTime() - (weekday - 1) * dayMS);
  }
  const current = monday(swedishToday());
  function iso(d) { return d.toISOString().slice(0,10); }
  function addDays(d, n) { return new Date(d.getTime() + n * dayMS); }
  function labelDate(str) { return fmtShort.format(new Date(str + "T12:00:00Z")); }
  function elt(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function sample() {
    const week = iso(current);
    const d = (n) => iso(addDays(current,n));
    return {
      source:"Demo – fiktiva exempel", generated_at:null, window_start:d(-14), window_end:d(35),
      games:[
        { id:910001, name:"DEMO: Starbound Trails", slug:"", date:d(0), cover_id:null, genres:["Äventyr","Indie"], rating:82, rating_count:143 },
        { id:910002, name:"DEMO: Hollow Skies", slug:"", date:d(2), cover_id:null, genres:["Action","RPG"], rating:91, rating_count:65 },
        { id:910003, name:"DEMO: Little Circuit", slug:"", date:d(4), cover_id:null, genres:["Strategi","Simulation"], rating:null, rating_count:0 },
        { id:910004, name:"DEMO: After Midnight", slug:"", date:d(9), cover_id:null, genres:["Indie","Skräck"], rating:75, rating_count:28 },
        { id:910005, name:"DEMO: Racing Lines", slug:"", date:d(-4), cover_id:null, genres:["Racing"], rating:88, rating_count:204 }
      ]
    };
  }
  function validGame(g) {
    return g && Number.isInteger(g.id) && typeof g.name==="string" &&
      /^\d{4}-\d\d-\d\d$/.test(g.date || "");
  }
  function getBoundDays() {
    if (!data || !data.window_start || !data.window_end) return [0,0];
    const start = new Date(data.window_start + "T00:00:00Z").getTime();
    const end = new Date(data.window_end + "T00:00:00Z").getTime();
    const currentTime = current.getTime();
    return [Math.ceil((start-currentTime)/(7*dayMS)),Math.floor((end-1-currentTime)/(7*dayMS))];
  }
  function visibleWeekGames() {
    const start = iso(addDays(current, offset*7));
    const end = iso(addDays(current, offset*7+7));
    return (data ? data.games : []).filter((g) => g.date >= start && g.date < end);
  }
  function updateGenres(games) {
    const chosen = genreSelect.value;
    const genres = [...new Set(games.flatMap((g) => Array.isArray(g.genres) ? g.genres : []))].sort((a,b)=>a.localeCompare(b,"sv"));
    genreSelect.replaceChildren(new Option("Alla genrer",""));
    genres.forEach((g) => genreSelect.add(new Option(g,g)));
    if (genres.includes(chosen)) genreSelect.value=chosen;
  }
  function card(game) {
    const article = elt("article","discover-card");
    const cover = elt("div","discover-cover");
    const fallback = elt("span","discover-cover-fallback","◈");
    fallback.setAttribute("aria-hidden","true");
    cover.append(fallback);
    if (typeof game.cover_id === "string" && /^[A-Za-z0-9_]+$/.test(game.cover_id)) {
      const img = document.createElement("img");
      img.src = "https://images.igdb.com/igdb/image/upload/t_cover_big/" + game.cover_id + ".jpg";
      img.alt = "Omslag till " + game.name;
      img.loading="lazy";
      img.decoding="async";
      img.addEventListener("error", () => img.remove(), { once:true });
      cover.append(img);
    }
    article.append(cover);
    const main = elt("div","discover-card-main");
    const meta = elt("div","discover-card-meta");
    meta.append(elt("span","discover-date",labelDate(game.date)));
    meta.append(elt("span","", "PC / Windows"));
    main.append(meta);
    main.append(elt("h3","",game.name));
    const genres = Array.isArray(game.genres) ? game.genres.slice(0,3) : [];
    main.append(elt("p","discover-card-genres",genres.length ? genres.join(" · ") : "Genre ej angiven"));
    const bottom = elt("div","discover-card-bottom");
    const hasRating = Number.isFinite(game.rating) && game.rating>=0 && game.rating<=100 && game.rating_count>=5;
    const score = hasRating ? (game.rating/20).toLocaleString("sv-SE",{minimumFractionDigits:1,maximumFractionDigits:1}) : null;
    const rating = elt("span",hasRating ? "discover-rating":"discover-unrated", hasRating ? "★ " + score + "/5" : "Inget betyg ännu");
    if (hasRating) rating.setAttribute("aria-label",(demo?"Fiktivt demobetyg ":"IGDB-betyg ") + score + " av 5");
    bottom.append(rating);
    const details = elt("a","discover-card-detail","Speldetaljer ↗");
    details.href=gameLink(game.id,demo);
    details.setAttribute("aria-label","Visa detaljer för "+game.name);
    bottom.append(details);
    if (!demo && typeof game.slug === "string" && /^[a-z0-9-]+$/.test(game.slug)) {
      const a = elt("a","discover-card-link","Se på IGDB ↗");
      a.href = "https://www.igdb.com/games/" + encodeURIComponent(game.slug);
      a.target="_blank";
      a.rel="noopener noreferrer";
      a.setAttribute("aria-label","Läs om " + game.name + " på IGDB (ny flik)");
      bottom.append(a);
    }
    const price=displayPrice(game,{demo});
    if(price){
      const priceRow=elt("div","discover-price");
      priceRow.append(elt("span","",price.text),elt("small","",price.label+" · "+price.shop));
      if(price.discount) priceRow.append(elt("span","discover-discount","−"+price.discount+"%"));
      main.append(priceRow);
    }
    main.append(bottom);
    article.append(main);
    return article;
  }
  function render() {
    const [minOffset,maxOffset] = getBoundDays();
    offset = Math.max(minOffset,Math.min(maxOffset,offset));
    const start = addDays(current, offset*7);
    const end = addDays(start,6);
    weekLabel.textContent = offset===0 ? "Den här veckan" : offset===1 ? "Nästa vecka" : offset===-1 ? "Förra veckan" : "Vecka " + weekNumber(start);
    weekRange.textContent = fmtShort.format(start) + " – " + fmtShort.format(end);
    prev.disabled = offset<=minOffset;
    next.disabled = offset>=maxOffset;
    const weekGames = visibleWeekGames();
    updateGenres(weekGames);
    const q = search.value.trim().toLocaleLowerCase("sv-SE");
    const genre = genreSelect.value;
    const filtered = weekGames.filter((g) => (!q || g.name.toLocaleLowerCase("sv-SE").includes(q)) &&
      (!genre || (Array.isArray(g.genres) && g.genres.includes(genre))));
    if (view === "list") {
      const columns=releaseWeekColumns(filtered,start,{sort:sortSelect.value});
      const fragment=document.createDocumentFragment();
      for (const day of columns) {
        const section=elt("section","discover-release-day");
        const heading=elt("div","discover-release-day-heading");
        const title=elt("h3","",releaseDateLabel(day.date));
        title.id="discover-date-"+day.date;
        heading.append(title);
        heading.append(elt("span","discover-day-count",day.games.length+" spel"));
        section.setAttribute("aria-labelledby",title.id);
        section.append(heading);
        const list=elt("div","discover-release-day-list");
        if(!day.games.length){
          list.append(elt("p","discover-day-empty","Inga spelsläpp"));
        } else {
          for(const game of day.games)list.append(card(game));
        }
        section.append(list);
        fragment.append(section);
      }
      results.className="discover-day-timeline";
      results.setAttribute("aria-label","Veckodagar från måndag till söndag med spelsläpp under varje dag");
      results.replaceChildren(fragment);
      dayToolbar.hidden=false;
      updateDayArrows();
    } else {
      if (sortSelect.value==="rating") filtered.sort((a,b)=>(Number.isFinite(b.rating)?b.rating:-1)-(Number.isFinite(a.rating)?a.rating:-1) || a.date.localeCompare(b.date));
      else if(sortSelect.value==="name") filtered.sort((a,b)=>a.name.localeCompare(b.name,"sv"));
      else filtered.sort((a,b)=>a.date.localeCompare(b.date) || a.name.localeCompare(b.name,"sv"));
      const fragment=document.createDocumentFragment();
      for(const game of filtered)fragment.append(card(game));
      results.className="discover-game-grid";
      results.setAttribute("aria-label","Spelsläpp i kompakt rutnät");
      results.replaceChildren(fragment);
      dayToolbar.hidden=true;
    }
    count.textContent = filtered.length + " av " + weekGames.length + " spel";
    empty.hidden = filtered.length>0;
    if (!data || !data.generated_at) {
      emptyTitle.textContent = demo ? "Inga demosläpp den här veckan" : "Speldatan är inte aktiverad ännu";
      emptyText.textContent = demo ? "Välj en annan vecka eller rensa sökningen." : "För att hämta riktiga releaser behöver IGDB-nycklarna konfigureras i GitHub Actions. Testa ?demo=1 för en fiktiv designförhandsvisning.";
    } else {
      emptyTitle.textContent = weekGames.length ? "Inga spel matchar filtren" : "Inga PC-släpp hittades";
      emptyText.textContent = "Prova en annan vecka eller ändra filtren.";
    }
  }
  function weekNumber(day) {
    const d = new Date(day);
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d-yearStart)/dayMS)+1)/7);
  }
  function updateDayArrows() {
    if(view!=="list")return;
    daysLeft.disabled=results.scrollLeft<=1;
    daysRight.disabled=results.scrollLeft+results.clientWidth>=results.scrollWidth-2;
  }
  function scrollDays(direction) {
    const column=results.querySelector(".discover-release-day");
    if(!column)return;
    const width=column.getBoundingClientRect().width+14;
    results.scrollBy({left:width*direction,behavior:"smooth"});
  }
  function setView(next) {
    view=next;
    viewList.setAttribute("aria-pressed",String(view==="list"));
    viewGrid.setAttribute("aria-pressed",String(view==="grid"));
    try { localStorage.setItem("hirrdirr_discover_release_view_v1",view); } catch {}
    render();
    results.scrollLeft=0;
    updateDayArrows();
  }
  function bind() {
    prev.addEventListener("click",()=>{offset--; render();results.scrollLeft=0;updateDayArrows();});
    next.addEventListener("click",()=>{offset++; render();results.scrollLeft=0;updateDayArrows();});
    search.addEventListener("input",render);
    genreSelect.addEventListener("change",render);
    sortSelect.addEventListener("change",render);
    viewList.addEventListener("click",()=>setView("list"));
    viewGrid.addEventListener("click",()=>setView("grid"));
    daysLeft.addEventListener("click",()=>scrollDays(-1));
    daysRight.addEventListener("click",()=>scrollDays(1));
    results.addEventListener("scroll",updateDayArrows,{passive:true});
    window.addEventListener("resize",updateDayArrows);
  }
  async function init() {
    try {
      const saved=localStorage.getItem("hirrdirr_discover_release_view_v1");
      if(saved==="grid")view="grid";
    }catch{}
    viewList.setAttribute("aria-pressed",String(view==="list"));
    viewGrid.setAttribute("aria-pressed",String(view==="grid"));
    bind();
    const result=await loadDiscoveryData({forceDemo:forcedDemo});
    demo=result.demo;
    data=result.data;
    const banner=$("discover-demo-banner");
    banner.hidden=!demo;
    $("discover-explore-link").href="/discover/explore/"+(demo?"?demo=1":"");
    if(demo){
      status.textContent=result.reason==="forced"
        ? "DEMOLÄGE (manuellt valt) – fiktiva spelsläpp och betyg."
        : "DEMOLÄGE (automatiskt) – fiktiva spelsläpp tills IGDB är anslutet.";
      $("discover-section-description").textContent="Prova veckonavigering, genrer och spelens detaljvyer med tydligt märkta fiktiva exempel.";
    } else {
      const stamp=new Date(data.generated_at);
      const stale=!Number.isFinite(stamp.getTime())||Date.now()-stamp.getTime()>3*dayMS;
      status.textContent=stale
        ? "IGDB-data kan vara inaktuell – hämtad "+(Number.isFinite(stamp.getTime())?stamp.toLocaleDateString("sv-SE"):"okänt datum")
        : "Speldata från IGDB · hämtad "+stamp.toLocaleDateString("sv-SE");
    }
    render();
  }
  init();
})();
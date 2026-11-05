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
  const fmtShort = new Intl.DateTimeFormat("sv-SE", { day:"numeric", month:"short", timeZone:"UTC" });
  const demo = new URLSearchParams(location.search).get("demo") === "1";
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
    if (hasRating) rating.setAttribute("aria-label","IGDB-betyg " + score + " av 5");
    bottom.append(rating);
    if (!demo && typeof game.slug === "string" && /^[a-z0-9-]+$/.test(game.slug)) {
      const a = elt("a","discover-card-link","Se på IGDB ↗");
      a.href = "https://www.igdb.com/games/" + encodeURIComponent(game.slug);
      a.target="_blank";
      a.rel="noopener noreferrer";
      a.setAttribute("aria-label","Läs om " + game.name + " på IGDB (ny flik)");
      bottom.append(a);
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
    if (sortSelect.value==="rating") filtered.sort((a,b)=>(Number.isFinite(b.rating)?b.rating:-1)-(Number.isFinite(a.rating)?a.rating:-1) || a.date.localeCompare(b.date));
    else if(sortSelect.value==="name") filtered.sort((a,b)=>a.name.localeCompare(b.name,"sv"));
    else filtered.sort((a,b)=>a.date.localeCompare(b.date) || a.name.localeCompare(b.name,"sv"));
    results.replaceChildren();
    const fragment = document.createDocumentFragment();
    filtered.forEach((g)=>fragment.append(card(g)));
    results.append(fragment);
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
  function bind() {
    prev.addEventListener("click",()=>{offset--; render();});
    next.addEventListener("click",()=>{offset++; render();});
    search.addEventListener("input",render);
    genreSelect.addEventListener("change",render);
    sortSelect.addEventListener("change",render);
  }
  async function init() {
    bind();
    if (demo) {
      data=sample();
      status.textContent="DEMOLÄGE – alla spel och betyg på sidan är fiktiva.";
      render();
      return;
    }
    try {
      const response=await fetch("/assets/data/discover/releases.json",{cache:"no-cache"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const json=await response.json();
      if (!json || !Array.isArray(json.games)) throw new Error("Ogiltigt dataformat");
      data={...json,games:json.games.filter(validGame)};
      if (json.generated_at) {
        const stamp=new Date(json.generated_at);
        const stale = !Number.isFinite(stamp.getTime()) || Date.now()-stamp.getTime()>3*dayMS;
        status.textContent=stale ? "Speldata kan vara inaktuell – senaste hämtning: " + stamp.toLocaleDateString("sv-SE") :
          "Speldata från IGDB · uppdaterad " + stamp.toLocaleDateString("sv-SE");
      } else {
        status.textContent="IGDB-anslutning väntar på konfiguration.";
      }
    } catch (err) {
      data={games:[],generated_at:null,window_start:null,window_end:null};
      status.textContent="Speldata kunde inte hämtas just nu.";
      console.warn("Game Discovery:",err);
    }
    render();
  }
  init();
})();
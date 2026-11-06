import {DEMO_GAMES,scoreFor,validCachedGames,genresFor,filterGames} from "./explore-core.mjs";
const $=id=>document.getElementById(id);
if(document.querySelector(".explore-page")){
  const demo=new URLSearchParams(location.search).get("demo")==="1";
  const key=demo?"hirrdirr_explore_demo_ratings_v1":"hirrdirr_explore_draft_ratings_v1";
  const query=$("explore-search"),genre=$("explore-genre"),min=$("explore-min"),sort=$("explore-sort");
  const list=$("explore-results"),more=$("explore-more"),empty=$("explore-empty");
  let all=[],shown=12,ratings={};
  const fmt=new Intl.DateTimeFormat("sv-SE",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  const e=(tag,cls="",txt)=>{const n=document.createElement(tag);n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n;};
  try {
    const saved=JSON.parse(localStorage.getItem(key)||"{}");
    if(saved && typeof saved==="object"&&!Array.isArray(saved))
      ratings=Object.fromEntries(Object.entries(saved).filter(([k,v])=>/^\d+$/.test(k)&&Number.isInteger(v)&&v>=1&&v<=5));
  } catch {}
  function card(g){
    const article=e("article","explore-game");
    const cover=e("div","explore-cover");cover.append(e("span","","◈"));
    if(typeof g.cover_id==="string"&&/^[a-zA-Z0-9_]+$/.test(g.cover_id)){
      const img=e("img");img.alt="Omslag till "+g.name;img.loading="lazy";img.decoding="async";
      img.src="https://images.igdb.com/igdb/image/upload/t_cover_big/"+g.cover_id+".jpg";
      img.addEventListener("error",()=>img.remove(),{once:true});cover.append(img);
    }
    article.append(cover);
    const info=e("div","explore-info");
    info.append(e("p","explore-meta",fmt.format(new Date(g.date+"T12:00:00Z"))+" / PC"));
    info.append(e("h3","",g.name));
    info.append(e("p","",Array.isArray(g.genres)&&g.genres.length?g.genres.slice(0,3).join(" · "):"Ingen genre angiven"));
    const score=scoreFor(g);
    const n=e("p","explore-score",score===null?"IGDB · Inget betyg ännu":"★ IGDB "+score.toLocaleString("sv-SE",{minimumFractionDigits:1,maximumFractionDigits:1})+"/5");
    if(score!==null)n.title=g.rating_count+" användarbetyg hos IGDB";info.append(n);
    if(!demo && typeof g.slug==="string" && /^[a-z0-9-]+$/.test(g.slug)){
      const link=e("a","explore-igdb","Se spelet på IGDB ↗");
      link.href="https://www.igdb.com/games/"+encodeURIComponent(g.slug);
      link.target="_blank";link.rel="noopener noreferrer";info.append(link);
    }
    article.append(info);
    const own=e("div","explore-own");
    own.append(e("strong","","Mitt testbetyg"));
    const stars=e("div","explore-stars");stars.setAttribute("role","group");
    stars.setAttribute("aria-label","Ditt betyg för "+g.name);
    const feedback=e("p","explore-feedback");
    const buttons=[];
    const sync=()=>{
      const v=ratings[String(g.id)]||0;
      buttons.forEach((b,i)=>{b.classList.toggle("selected",i<v);b.setAttribute("aria-pressed",i+1===v?"true":"false");});
      feedback.textContent=v?("Ditt betyg: "+v+"/5 · Sparat lokalt"):"Inget betyg ännu";
    };
    for(let i=1;i<=5;i++){
      const b=e("button","","★");b.type="button";b.setAttribute("aria-label",i+" av 5 stjärnor för "+g.name);
      b.title=i+"/5 (klicka igen för att ta bort)";
      b.addEventListener("click",()=>{
        if(ratings[String(g.id)]===i)delete ratings[String(g.id)];else ratings[String(g.id)]=i;
        sync();
        try{localStorage.setItem(key,JSON.stringify(ratings));}
        catch{feedback.textContent+=" · Kan inte lagra i webbläsaren";}
      });
      stars.append(b);buttons.push(b);
    }
    own.append(stars,feedback);sync();article.append(own);return article;
  }
  function options(){return {query:query.value,genre:genre.value,minimum:min.value,sort:sort.value};}
  function render(){
    const filtered=filterGames(all,options());
    const fragment=document.createDocumentFragment();
    filtered.slice(0,shown).forEach(g=>fragment.append(card(g)));
    list.replaceChildren(fragment);
    $("explore-status").textContent=filtered.length+" av "+all.length+" spel matchar filtren";
    empty.hidden=filtered.length!==0;
    $("explore-empty-text").textContent=all.length?"Prova en annan genre eller rensa filtren.":"Det finns ännu inga speldata. Prova demo för en fiktiv förhandsvisning.";
    more.hidden=shown>=filtered.length;
    more.textContent="Visa fler ("+(filtered.length-shown)+" kvar) ↓";
  }
  function initGenre(){
    genre.replaceChildren(new Option("Alla genrer",""));
    genresFor(all).forEach(x=>genre.add(new Option(x,x)));
  }
  async function init(){
    $("explore-back").href="/discover/"+(demo?"?demo=1":"");
    if(demo){
      all=DEMO_GAMES;
      $("explore-mode-title").textContent="DEMOLÄGE – fiktiva spel";
      $("explore-mode-description").textContent="Samtliga speltitlar och communitybetyg nedan är påhittade. Dina personliga testbetyg finns enbart i den här webbläsaren.";
      $("explore-mode-link").href="/discover/explore/";$("explore-mode-link").textContent="Visa vanlig version ↗";
    }else{
      try{
        const response=await fetch("/assets/data/discover/releases.json",{cache:"no-cache"});
        if(!response.ok)throw new Error("HTTP "+response.status);
        const data=await response.json();
        all=data.generated_at?validCachedGames(data):[];
        $("explore-mode-title").textContent=data.generated_at?"Begränsat urval – Release Radar":"IGDB är inte anslutet ännu";
        $("explore-mode-description").textContent=data.generated_at?
          "Sökningen gäller just nu bara spel som finns i Release Radars åttaveckors-cache, inte en fullständig spelkatalog.":
          "Vi väntar på riktiga speldata. Du kan testa spelkatalogen med enbart fiktiva spel i demoläget.";
      }catch{
        all=[];$("explore-mode-title").textContent="Speldata kunde inte läsas";
        $("explore-mode-description").textContent="Prova demoläget eller försök senare.";
      }
    }
    [query,genre,min,sort].forEach(x=>x.addEventListener(x===query?"input":"change",()=>{shown=12;render();}));
    $("explore-reset").addEventListener("click",()=>{query.value="";genre.value="";min.value="0";sort.value="rating";shown=12;render();query.focus();});
    more.addEventListener("click",()=>{shown+=12;render();});
    initGenre();render();
  }
  init();
}

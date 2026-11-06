import {displayPrice} from "./price.mjs";
import {loadDiscoveryData,demoCatalog,gameLink} from "./game-data.mjs";
import {scoreFor} from "./explore-core.mjs";

const $=id=>document.getElementById(id);
const el=(tag,cls="",text)=>{const v=document.createElement(tag);v.className=cls;if(text!==undefined)v.textContent=String(text);return v;};
const params=new URLSearchParams(location.search);
const forcedDemo=params.get("demo")==="1";
const numericId=params.get("id");
const id=numericId && /^\d{1,12}$/.test(numericId) ? Number(numericId):null;
const fmt=new Intl.DateTimeFormat("sv-SE",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const statuses=new Set(["not-played","playing","completed","paused","dropped"]);
let stars=0;
let buttons=[];
let ratings={};
let reviewKey="";
let ratingKey="";

function storageData(key){
  try{
    const value=JSON.parse(localStorage.getItem(key)||"{}");
    return value && typeof value==="object" && !Array.isArray(value) ? value : {};
  }catch{return {};}
}
function saveStorage(key,data){
  try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{return false;}
}
function current(){
  return stars>0 || $("detail-playing").value!=="not-played" || Boolean($("detail-notes").value.trim());
}
function syncStars(){
  buttons.forEach((btn,i)=>{
    btn.classList.toggle("active",i<stars);
    btn.setAttribute("aria-pressed",stars===i+1?"true":"false");
  });
  $("detail-star-label").textContent=stars?stars+" av 5 stjärnor":"Inget betyg valt";
}
function buildStars(){
  const holder=$("detail-star-buttons");
  for(let n=1;n<=5;n++){
    const b=el("button","","★");
    b.type="button";
    b.setAttribute("aria-label",n+" av 5 stjärnor");
    b.title=n+"/5 · Klicka igen för att ångra";
    b.addEventListener("click",()=>{
      stars=stars===n?0:n;
      syncStars();
      $("detail-save-status").textContent="Osparade ändringar.";
    });
    buttons.push(b);
    holder.append(b);
  }
}
function buildCover(game){
  const holder=$("detail-cover");
  holder.append(el("span","detail-placeholder","◈"));
  if(typeof game.cover_id==="string" && /^[a-zA-Z0-9_]+$/.test(game.cover_id)){
    const img=el("img");
    img.alt="Omslag till "+game.name;
    img.src="https://images.igdb.com/igdb/image/upload/t_cover_big/"+game.cover_id+".jpg";
    img.decoding="async";
    img.addEventListener("error",()=>img.remove(),{once:true});
    holder.append(img);
  }
}
async function init(){
  const result=await loadDiscoveryData({forceDemo:forcedDemo});
  const isDemo=result.demo;
  const games=isDemo?demoCatalog():result.data.games;
  const game=games.find(g=>g.id===id);
  $("detail-back").href="/discover/explore/"+(isDemo?"?demo=1":"");
  $("detail-radar").href="/discover/"+(isDemo?"?demo=1":"");
  $("detail-mode").textContent=isDemo
    ? "DEMOLÄGE · Detta är ett påhittat spel och dess communitybetyg är fiktivt."
    : "IGDB · Verkliga speldata från Release Radars begränsade cache.";
  if(!game){
    $("detail-error").hidden=false;
    $("detail-mode").textContent=isDemo?"DEMOLÄGE · Inget matchande exempelspel hittades.":"Spelet finns inte i den aktuella cachen.";
    return;
  }
  $("detail-content").hidden=false;
  document.title=game.name+" • Game Discovery • hirrdirr";
  buildCover(game);
  $("detail-name").textContent=game.name;
  $("detail-summary").textContent=typeof game.summary==="string" && game.summary.trim()
    ? game.summary : "Ingen spelbeskrivning finns tillgänglig i den hämtade datan ännu.";
  $("detail-date").textContent=fmt.format(new Date(game.date+"T12:00:00Z"));
  $("detail-genres").textContent=Array.isArray(game.genres)&&game.genres.length?game.genres.join(" · "):"Ej angivet";
  const score=scoreFor(game);
  $("detail-score").textContent=score===null?"Ej betygsatt":"★ "+score.toLocaleString("sv-SE",{minimumFractionDigits:1,maximumFractionDigits:1})+"/5";
  $("detail-votes").textContent=score===null?"Saknar minst fem giltiga röster":game.rating_count+" röster hos IGDB · omräknat till 1–5";
  const price=displayPrice(game,{demo:isDemo});
  if(price){
    const priceRow=$("detail-price");
    priceRow.hidden=false;
    $("detail-price-value").textContent=price.text+(price.discount?" · −"+price.discount+"%":"");
    $("detail-price-shop").textContent=price.label+" · "+price.shop;
  }

  if(!isDemo && typeof game.slug==="string" && /^[a-z0-9-]+$/.test(game.slug)){
    const link=$("detail-igdb");
    link.href="https://www.igdb.com/games/"+encodeURIComponent(game.slug);
    link.hidden=false;
  }
  ratingKey=isDemo?"hirrdirr_explore_demo_ratings_v1":"hirrdirr_explore_draft_ratings_v1";
  reviewKey=isDemo?"hirrdirr_discover_demo_reviews_v1":"hirrdirr_discover_draft_reviews_v1";
  ratings=storageData(ratingKey);
  const reviews=storageData(reviewKey);
  const saved=reviews[String(game.id)];
  stars=Number.isInteger(ratings[String(game.id)])&&ratings[String(game.id)]>=1&&ratings[String(game.id)]<=5?ratings[String(game.id)]:0;
  if(saved && typeof saved==="object"){
    if(!stars && Number.isInteger(saved.rating) && saved.rating>=1 && saved.rating<=5)stars=saved.rating;
    $("detail-playing").value=statuses.has(saved.status)?saved.status:"not-played";
    $("detail-notes").value=typeof saved.notes==="string"?saved.notes.slice(0,2500):"";
  }
  buildStars();
  syncStars();
  $("detail-review-form").addEventListener("submit",event=>{
    event.preventDefault();
    const status=$("detail-playing").value;
    const notes=$("detail-notes").value.slice(0,2500);
    const reviews=storageData(reviewKey);
    if(current())reviews[String(game.id)]={rating:stars,status,notes,updatedAt:new Date().toISOString()};
    else delete reviews[String(game.id)];
    if(stars)ratings[String(game.id)]=stars;else delete ratings[String(game.id)];
    const okReview=saveStorage(reviewKey,reviews);
    const okStars=saveStorage(ratingKey,ratings);
    $("detail-save-status").textContent=okReview && okStars
      ? "Sparat lokalt på den här enheten. Inte publicerat."
      : "Lagring är blockerad i webbläsaren. Ditt utkast kunde inte sparas säkert.";
  });
  $("detail-delete").addEventListener("click",()=>{
    stars=0;
    $("detail-playing").value="not-played";
    $("detail-notes").value="";
    const reviews=storageData(reviewKey);
    delete reviews[String(game.id)];
    delete ratings[String(game.id)];
    const okReview=saveStorage(reviewKey,reviews);
    const okStars=saveStorage(ratingKey,ratings);
    syncStars();
    $("detail-save-status").textContent=okReview && okStars?"Ditt lokala utkast är raderat.":"Kunde inte uppdatera webbläsarens lagring.";
  });
  for(const field of [$("detail-playing"),$("detail-notes")]){
    field.addEventListener(field.tagName==="TEXTAREA"?"input":"change",()=>{$("detail-save-status").textContent="Osparade ändringar.";});
  }
}
init();

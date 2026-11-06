import {wishlistSort} from "./wishlist-core.mjs";
import {loadWishlist,watchWishlist,changeWish} from "./wishlist-ui.mjs";
import {gameLink} from "./game-data.mjs";
const $=id=>document.getElementById(id);
const root=document.querySelector(".discover-wishlist-page");
if(root){
  const search=$("wishlist-search"),mode=$("wishlist-mode"),sort=$("wishlist-sort");
  const results=$("wishlist-results"),empty=$("wishlist-empty");
  const fmt=new Intl.DateTimeFormat("sv-SE",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
  const element=(tag,cls="",text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
  function render(){
    const all=loadWishlist();
    const term=search.value.trim().toLocaleLowerCase("sv-SE");
    const filtered=wishlistSort(all.filter(game=>
      (!term||game.name.toLocaleLowerCase("sv-SE").includes(term))&&
      (mode.value==="all"||(mode.value==="demo")===game.demo)),sort.value);
    $("wishlist-total").textContent=filtered.length+" av "+all.length+" sparade spel";
    empty.hidden=filtered.length!==0;
    $("wishlist-empty-title").textContent=all.length?"Inga spel matchar dina filter":"Din önskelista är tom";
    $("wishlist-empty-description").textContent=all.length?"Prova att ändra sökningen eller filtret.":"Spara ett spel från Release Radar eller Explore för att hitta det här.";
    const fragment=document.createDocumentFragment();
    for(const game of filtered){
      const row=element("article","wishlist-game");
      const art=element("div","wishlist-cover");
      art.append(element("span","wishlist-art-fallback","◈"));
      if(game.cover_id){
        const img=element("img");img.src="https://images.igdb.com/igdb/image/upload/t_cover_big/"+game.cover_id+".jpg";
        img.alt="Omslag till "+game.name;img.loading="lazy";img.decoding="async";
        img.addEventListener("error",()=>img.remove(),{once:true});art.append(img);
      }
      row.append(art);
      const main=element("div","wishlist-main");
      main.append(element("p","wishlist-game-type",game.demo?"DEMOSPEL · FIKTIVT":"PC / WINDOWS"));
      const title=element("h3");const detail=element("a","wishlist-game-link",game.name);
      detail.href=gameLink(game.id,game.demo);title.append(detail);main.append(title);
      const genres=element("p","wishlist-game-genres",game.genres.length?game.genres.join(" · "):"Genre saknas");
      main.append(genres);
      if(game.date)main.append(element("p","wishlist-game-date","Släppt/släpps "+fmt.format(new Date(game.date+"T12:00:00Z"))));
      const actions=element("div","wishlist-actions");
      const remove=element("button","wishlist-remove","♥ Ta bort");
      remove.type="button";
      remove.setAttribute("aria-label","Ta bort "+game.name+" från önskelistan");
      remove.addEventListener("click",()=>{
        const result=changeWish(game,game.demo);
        if(!result.ok)remove.textContent="Kunde inte uppdatera";
      });
      actions.append(remove);main.append(actions);row.append(main);fragment.append(row);
    }
    results.replaceChildren(fragment);
  }
  [search,mode,sort].forEach(control=>control.addEventListener(control===search?"input":"change",render));
  watchWishlist(render);
  render();
}

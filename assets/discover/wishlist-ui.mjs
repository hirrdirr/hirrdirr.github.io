import {WISHLIST_STORAGE_KEY,wishlistKey,normalizeWishlist,wishlistToggle} from "./wishlist-core.mjs";
const eventName="hirrdirr:wishlist-updated";
export function loadWishlist(){
  try{
    const raw=JSON.parse(localStorage.getItem(WISHLIST_STORAGE_KEY)||'{"items":[]}');
    return normalizeWishlist(raw);
  }catch{return [];}
}
function persistWishlist(items){
  try{
    localStorage.setItem(WISHLIST_STORAGE_KEY,JSON.stringify({version:1,items}));
    window.dispatchEvent(new Event(eventName));
    return true;
  }catch{return false;}
}
export function hasWish(id,demo){
  const key=wishlistKey(id,demo);
  return Boolean(key)&&loadWishlist().some(item=>wishlistKey(item.id,item.demo)===key);
}
export function changeWish(game,demo=false){
  const change=wishlistToggle(loadWishlist(),game,demo);
  return change.changed?{...change,ok:persistWishlist(change.items)}:{...change,ok:false};
}
export function watchWishlist(callback){
  const onChange=()=>callback(loadWishlist());
  window.addEventListener(eventName,onChange);
  window.addEventListener("storage",onChange);
  return ()=>{window.removeEventListener(eventName,onChange);window.removeEventListener("storage",onChange);};
}
export function wishlistHref(){return "/discover/wishlist/";}
export function makeWishlistButton(game,demo=false,{compact=false}={}){
  const button=document.createElement("button");
  button.type="button";
  button.className="discover-wishlist-toggle"+(compact?" discover-wishlist-compact":"");
  const sync=()=>{
    const saved=hasWish(game.id,demo);
    button.setAttribute("aria-pressed",saved?"true":"false");
    button.setAttribute("aria-label",(saved?"Ta bort ":"Spara ")+game.name+(saved?" från":" till")+" önskelistan");
    button.textContent=saved?"♥ Sparat":"♡ Spara";
    button.title=saved?"Ta bort från önskelistan":"Spara till önskelistan";
  };
  sync();
  watchWishlist(sync);
  button.addEventListener("click",()=>{
    const outcome=changeWish(game,demo);
    if(!outcome.ok) {
      button.title="Kunde inte spara. Kontrollera webbläsarens lokala lagring.";
      button.textContent="Kunde inte spara";
    }
  });
  return button;
}
export function bindWishlistLink(anchor){
  if(!anchor)return;
  const sync=items=>{
    const count=items.length;
    anchor.textContent="♡ Önskelista"+(count?" ("+count+")":"");
  };
  sync(loadWishlist());
  watchWishlist(sync);
}

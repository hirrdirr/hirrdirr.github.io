/* Local, private bookmarks. Snapshots keep titles visible after the rotating release cache changes. */
export const WISHLIST_STORAGE_KEY = "hirrdirr_discover_wishlist_v1";
export const WISHLIST_LIMIT = 300;
export function wishlistKey(id,demo=false){
  if(!Number.isSafeInteger(id)||id<=0)return null;
  return (demo?"demo:":"igdb:")+id;
}
export function snapshotGame(game,demo=false,when=new Date().toISOString()){
  if(!game || !Number.isSafeInteger(game.id) || game.id<=0 ||
     typeof game.name!=="string" || !game.name.trim()) return null;
  const date=typeof game.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(game.date)?game.date:null;
  const genres=Array.isArray(game.genres)?game.genres.filter(g=>typeof g==="string").slice(0,5).map(g=>g.slice(0,70)):[];
  return {
    id:game.id,demo:Boolean(demo),name:game.name.trim().slice(0,180),
    date,genres,
    cover_id:typeof game.cover_id==="string"&&/^[A-Za-z0-9_]+$/.test(game.cover_id)?game.cover_id:null,
    slug:!demo&&typeof game.slug==="string"&&/^[a-z0-9-]+$/.test(game.slug)?game.slug:"",
    summary:typeof game.summary==="string"?game.summary.slice(0,1500):"",
    saved_at:typeof when==="string"&&!Number.isNaN(Date.parse(when))?when:new Date().toISOString()
  };
}
export function normalizeWishlist(payload){
  const raw=Array.isArray(payload?.items)?payload.items:[];
  const list=[];const seen=new Set();
  for(const item of raw){
    const snapshot=snapshotGame(item,item?.demo,item?.saved_at);
    if(!snapshot)continue;
    const key=wishlistKey(snapshot.id,snapshot.demo);
    if(seen.has(key))continue;
    seen.add(key);list.push(snapshot);
    if(list.length>=WISHLIST_LIMIT)break;
  }
  return list;
}
export function wishlistToggle(items,game,demo=false,when=new Date().toISOString()){
  const safe=normalizeWishlist({items});
  const key=wishlistKey(game?.id,demo);
  if(!key)return {items:safe,added:false,changed:false};
  if(safe.some(item=>wishlistKey(item.id,item.demo)===key)){
    return {items:safe.filter(item=>wishlistKey(item.id,item.demo)!==key),added:false,changed:true};
  }
  if(safe.length>=WISHLIST_LIMIT)return {items:safe,added:false,changed:false};
  const snapshot=snapshotGame(game,demo,when);
  if(!snapshot)return {items:safe,added:false,changed:false};
  return {items:[snapshot,...safe],added:true,changed:true};
}
export function wishlistSort(items,sort="added"){
  const list=[...items];
  if(sort==="name")return list.sort((a,b)=>a.name.localeCompare(b.name,"sv"));
  if(sort==="release")return list.sort((a,b)=>(b.date||"").localeCompare(a.date||"")||a.name.localeCompare(b.name,"sv"));
  return list.sort((a,b)=>(b.saved_at||"").localeCompare(a.saved_at||""));
}

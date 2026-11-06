/* Optional cached shop prices. IGDB does not supply store prices.
   Price objects must be separately sourced and checked recently, never guessed. */
export function displayPrice(game,{demo=false,now=new Date()}={}){
  const p=game?.price;
  if(!p||typeof p!=="object"||Array.isArray(p)) return null;
  if(!Number.isFinite(p.amount)||p.amount<0||p.amount>1000000) return null;
  if(p.currency!=="SEK" || typeof p.shop!=="string" || !p.shop.trim()) return null;
  const when=typeof p.checked_at==="string" ? Date.parse(p.checked_at):NaN;
  const age=now.getTime()-when;
  // Only claim current prices with a dated snapshot less than 48 h old.
  if(!Number.isFinite(when)||age<(-10*60*1000)||age>48*60*60*1000) return null;
  const text = p.amount===0?"Gratis":new Intl.NumberFormat("sv-SE",{
    style:"currency",currency:"SEK",maximumFractionDigits:2
  }).format(p.amount);
  const discount=Number.isInteger(p.discount_percent) &&
    p.discount_percent>0 && p.discount_percent<=100 ? p.discount_percent:null;
  return {
    text,
    label:demo?"DEMO-PRIS":"Butikspris",
    shop:demo?"Fiktiv butik":p.shop.trim().slice(0,70),
    discount,
    demo
  };
}

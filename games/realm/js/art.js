// Original, code-native pixel artwork. Rasterized once into a small sprite atlas.
// World rendering only blits cached sprites; no per-frame pixel construction.
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const palette = { o: '#152d31', h: '#543b35', H: '#956749', s: '#e4b584', S: '#f8d5a0', t: '#328d86', T: '#69b5a0', d: '#21565d', b: '#354650', B: '#60757d', g: '#d4a956', G: '#f4d784', w: '#d3e1d9', r: '#ad6572', R: '#e69c9c', l: '#87b86c', L: '#b7d582', v: '#496c47', c: '#6cd3d1' };
const person = [
  '      ooooo     ',
  '     ohhhhho    ',
  '    ohHHHHhho   ',
  '    ohHHHHhho   ',
  '    osssssso    ',
  '    oSsososo    ',
  '     sSSSso     ',
  '    oddgdddo    ',
  '   odttgtttdo   ',
  '  osdtTgTtdswo  ',
  '  osdtTgTtdswo  ',
  '   odttgttdow   ',
  '   otttgtttwo   ',
  '   oddgggddwo   ',
  '   oddddddowo   ',
  '    obb bbo     ',
  '    obb bbo     ',
  '   ohho ohho    '
];
function pixelSprite(rows, replacements = {}, frame = 0, back = false) {
  const c = canvas(40, 48), ctx = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ' ') return;
    let color = replacements[ch] || palette[ch];
    if (back && y >= 4 && y <= 6 && 'sS'.includes(ch)) color = palette.h;
    ctx.fillStyle = color || palette.o;
    let shift = 0;
    if (y >= 15 && frame) shift = (x < 8 ? 1 : -1) * (frame === 1 ? 1 : -1);
    ctx.fillRect(4 + x * 2, 5 + y * 2 + shift * 2, 2, 2);
  }));
  return c;
}
function polygon(ctx, points, color) {
  ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill();
}
function tree(variant) {
  const c = canvas(112, 144), g = c.getContext('2d');
  g.fillStyle = '#132d2b66'; g.fillRect(26, 126, 66, 10);
  g.fillStyle = '#493f31'; g.fillRect(49, 88, 16, 46);
  g.fillStyle = '#82664a'; g.fillRect(51, 91, 5, 41);
  g.fillStyle = '#343b2d'; g.fillRect(44, 129, 29, 5);
  const tones = variant === 1 ? ['#153d37','#205145','#2e6751','#4e8260'] : ['#153e3c','#215950','#31745e','#55936e'];
  for (let n = 0; n < 3; n++) {
    const y = 14 + n * 27, w = 22 + n * 13, cx = 56;
    polygon(g, [[cx,y],[cx+8,y+12],[cx+w-7,y+28],[cx+w,y+34],[cx+w-5,y+40],[cx+w+7,y+46],[cx+12,y+50],[cx,y+47],[cx-18,y+51],[cx-w-8,y+45],[cx-w+2,y+34],[cx-w+10,y+27]], tones[0]);
    polygon(g, [[cx,y+4],[cx+3,y+16],[cx+w-10,y+31],[cx+w-4,y+37],[cx+10,y+41],[cx-5,y+45],[cx-w+1,y+39],[cx-w+13,y+26]], tones[1]);
    polygon(g, [[cx-2,y+8],[cx-8,y+22],[cx-19,y+30],[cx-12,y+33],[cx-24,y+39],[cx-2,y+34],[cx+6,y+32]], tones[2]);
    g.fillStyle = tones[3]; g.fillRect(cx-5,y+16,4,7); g.fillRect(cx-15,y+30,7,3);
  }
  return c;
}
function house(color) {
  const c = canvas(176, 176), g = c.getContext('2d');
  const roof = color === 'blue' ? ['#273e4b','#3e5e68','#5a8286'] : ['#673d37','#9b5544','#c57b53'];
  g.fillStyle = '#102b2c55'; g.fillRect(12, 147, 158, 14);
  g.fillStyle = '#555a4a'; g.fillRect(22, 125, 132, 31);
  g.fillStyle = '#9d9770'; g.fillRect(24, 83, 128, 63);
  g.fillStyle = '#d0bb89'; g.fillRect(29, 88, 117, 48);
  g.fillStyle = '#544b36';
  for (const x of [24, 66, 106, 147]) g.fillRect(x, 85, 5, 59);
  g.fillRect(24, 117, 128, 5);
  g.fillStyle = '#323b35'; g.fillRect(76, 113, 27, 38);
  g.fillStyle = '#765a3d'; g.fillRect(79, 117, 21, 31);
  g.fillStyle = '#d6af66'; g.fillRect(94, 131, 3, 3);
  for (const x of [37, 119]) {
    g.fillStyle = '#3d4032'; g.fillRect(x-3, 94, 21, 26);
    g.fillStyle = '#e6b363'; g.fillRect(x, 96, 15, 18);
    g.fillStyle = '#ffe3a0'; g.fillRect(x+2, 97, 5, 7);
    g.fillStyle = '#6c5136'; g.fillRect(x+6, 96, 3, 19); g.fillRect(x, 104, 15, 3);
    g.fillStyle = '#687347'; g.fillRect(x-5, 119, 25, 5);
    g.fillStyle = '#cd887c'; g.fillRect(x-1, 117, 4, 4); g.fillRect(x+12, 115, 4, 5);
  }
  polygon(g, [[13,91],[37,33],[133,33],[166,91],[160,97],[18,97]], roof[0]);
  polygon(g, [[20,87],[41,36],[130,36],[157,87]], roof[1]);
  for (let row = 0; row < 6; row++) {
    const y = 41 + row * 8;
    g.fillStyle = row % 2 ? roof[1] : roof[2];
    g.fillRect(40-row*3, y, 88+row*7, 3);
    g.fillStyle = roof[0];
    for(let col=0;col<8;col++) g.fillRect(42+col*14-(row%2)*6,y+3,2,5);
  }
  g.fillStyle = '#b9875f'; g.fillRect(38, 31, 96, 5);
  g.fillStyle = '#5c6558'; g.fillRect(119,18,18,31);
  g.fillStyle = '#8c9780'; g.fillRect(121,20,7,26); g.fillRect(116,16,24,6);
  g.fillStyle = '#b8b19a'; g.fillRect(67,150,41,5);
  return c;
}
function monster(type, frame) {
  if (type === 'sprout') return pixelSprite([
    '   vL    Lv     ','    lL  Ll      ','     vllv       ','    vvvvvv      ','   vllllllv     ',
    '  vlLLllLLlv    ','  vlowllwolv    ','  vllwllwllv    ','   vllllllv     ','    vlllv       ',
    '  vvvlllvvv     ',' vvlvlllvllv    ','  v vlllv v     ','    vh hh       ','   vvh hhvv     '
  ], {}, frame);
  if (type === 'wolf') return pixelSprite([
    '  Bo      oB    ','  BBooooooBB    ','  oBBBBBBBBBo   ','  oBwwBBwwBBo   ','  oBwoBBowBBo   ',
    '   oBBwwBBBo    ','   oBwoowBBo    ','    oBBBBBo     ','   oBBBBBBBo    ','  oBBwwwwBBBo   ',
    '  oBBwwwwBBBo   ','   oBBBBBBBo    ','    obb bbo     ','   obbb bbbo    '
  ], { B:'#7c9194', b:'#4d636a' }, frame);
  const c = canvas(76, 88), g = c.getContext('2d');
  g.fillStyle = '#303c39'; g.fillRect(12,28,52,46); g.fillRect(6,39,12,29); g.fillRect(59,39,12,29);
  g.fillStyle = '#687766'; g.fillRect(17,25,43,43); g.fillRect(11,41,10,20); g.fillRect(56,40,10,23);
  g.fillStyle = '#8f9e7e'; g.fillRect(20,27,13,29); g.fillRect(36,27,18,9);
  g.fillStyle = '#293c34'; g.fillRect(23,38,9,7); g.fillRect(44,38,9,7); g.fillRect(33,53,12,5);
  g.fillStyle = '#b8df82'; g.fillRect(26,39,5,3); g.fillRect(45,39,5,3);
  g.fillStyle = '#526849'; g.fillRect(19,67,14,13+frame*2); g.fillRect(47,67,14,15-frame*2);
  polygon(g, [[26,28],[14,20],[12,7],[18,7],[21,17],[30,20],[35,9],[41,6],[40,19],[53,17],[57,7],[62,9],[60,22],[50,30]], '#546247');
  g.fillStyle = '#8ca25a'; g.fillRect(14,7,13,5); g.fillRect(49,10,16,5); g.fillRect(37,3,11,5);
  g.fillStyle = '#b2b65c'; g.fillRect(18,8,5,2); g.fillRect(54,11,8,2);
  return c;
}
function prop(kind) {
  const c = canvas(64, 80), g = c.getContext('2d');
  if (kind === 'rock') {
    polygon(g, [[7,63],[13,44],[30,37],[47,44],[56,62],[43,70],[20,70]], '#3e5553');
    polygon(g, [[13,60],[18,45],[31,41],[46,47],[50,59],[35,64]], '#72817a');
    polygon(g, [[18,46],[30,41],[39,45],[26,51],[19,58]], '#a1a28b');
    g.fillStyle='#64805b';g.fillRect(11,61,14,5);g.fillRect(40,64,11,5);
  } else if (kind === 'chest' || kind === 'chestOpen') {
    g.fillStyle='#322e28';g.fillRect(12,48,40,23);
    g.fillStyle='#8b5638';g.fillRect(14,48,36,21);
    g.fillStyle='#ba7f47';g.fillRect(14,kind === 'chestOpen'?30:43,36,12);
    g.fillStyle='#e1b863';g.fillRect(18,43,4,27);g.fillRect(42,43,4,27);g.fillRect(14,54,36,3);g.fillRect(30,53,6,8);
  } else if (kind === 'herb') {
    g.fillStyle='#3e6e54';g.fillRect(30,46,3,25);
    polygon(g,[[31,62],[19,55],[16,45],[28,49],[34,61],[41,46],[49,43],[45,57]],'#74a86e');
    g.fillStyle='#9dd9b2';g.fillRect(27,37,9,9);g.fillRect(23,41,17,4);
    g.fillStyle='#d3ecbc';g.fillRect(29,39,4,5);
  } else if (kind === 'sign') {
    g.fillStyle='#5b4b34';g.fillRect(29,42,6,29);
    g.fillStyle='#bd935c';g.fillRect(10,31,44,20);
    g.fillStyle='#785a3b';g.fillRect(10,50,44,3);
    g.fillStyle='#4c4935';g.fillRect(18,39,26,3);g.fillRect(38,36,3,9);
  } else if (kind === 'fire') {
    polygon(g,[[8,64],[16,57],[48,57],[56,64],[49,73],[17,73]],'#737c67');
    g.fillStyle='#a2a18a';g.fillRect(17,58,9,5);g.fillRect(38,62,11,5);
    g.fillStyle='#4b4131';g.fillRect(22,61,23,7);
    polygon(g,[[21,60],[27,43],[30,51],[35,33],[43,50],[43,62]],'#d88f48');
    polygon(g,[[28,61],[33,49],[38,44],[40,58],[37,64]],'#ffe3a0');
  } else if (kind === 'beacon' || kind === 'beaconLit') {
    g.fillStyle='#3c5454';g.fillRect(10,66,46,9);g.fillRect(17,56,32,12);
    g.fillStyle='#788d7d';g.fillRect(20,20,25,40);g.fillRect(16,15,33,8);
    g.fillStyle='#a0ac90';g.fillRect(23,23,7,32);
    g.fillStyle='#425f52';g.fillRect(32,27,12,5);g.fillRect(25,45,20,4);
    polygon(g,[[33,1],[43,12],[33,25],[24,13]],kind==='beaconLit'?'#85e4d6':'#44675e');
    g.fillStyle=kind==='beaconLit'?'#dbffe7':'#729580';g.fillRect(31,5,3,13);
  }
  return c;
}
export function makeArt() {
  const art = {};
  for (const [id, colors] of Object.entries({ player:{},gold:{t:'#a67a3e',T:'#e0bd6a'},rose:{t:'#a4657b',T:'#df9a9b'},blue:{t:'#4b6c8b',T:'#82a9bb'} })) {
    art[id] = [0,1,2].map(f=>pixelSprite(person,colors,f));
    art[id+'Back'] = [0,1,2].map(f=>pixelSprite(person,colors,f,true));
  }
  for (const id of ['sprout','wolf','warden']) art[id]=[0,1,2].map(f=>monster(id,f));
  art.trees = [0,1,2].map(tree);
  art.houseRed=house('red'); art.houseBlue=house('blue');
  for (const id of ['rock','fire','chest','chestOpen','beacon','beaconLit','herb','sign']) art[id]=prop(id);
  return art;
}

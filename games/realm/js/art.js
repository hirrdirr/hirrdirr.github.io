// Original, code-native pixel artwork. Rasterized once into a small sprite atlas.
// World rendering only blits cached sprites; no per-frame pixel construction.
import { addTideglassArt } from './tideglass-art.js';

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
  const tones = variant === 3 ? ['#403e35','#765342','#a66b48','#d69a60'] : variant === 1 ? ['#153d37','#205145','#2e6751','#4e8260'] : ['#153e3c','#215950','#31745e','#55936e'];
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
// Cast iron, broken brick and oxidized copper, rasterized with the other sprites.
function foundryMonster(type, frame) {
  const boss = type === 'striker', c = canvas(boss ? 84 : 48, boss ? 88 : 50);
  const g = c.getContext('2d'), iron = '#39343c', edge = '#92837a', coal = '#ae5641', light = '#ffd793';
  const box = (x,y,w,h,color) => { g.fillStyle = color; g.fillRect(x,y,w,h); };
  if (type === 'skitter') {
    // Low six-legged crawler, with a broken crucible for a carapace.
    for (const x of [5,18,32]) {
      const step = frame === 1 ? 2 : 0;
      box(x,32,4,10+step,iron); box(x-3,40+step,7,3,edge);
    }
    polygon(g,[[3,28],[9,18],[29,15],[41,22],[44,33],[34,38],[10,36]],iron);
    polygon(g,[[7,26],[13,19],[28,17],[37,22],[29,27],[12,30]],'#936752');
    box(19,20,3,9,coal);box(22,19,4,3,light);box(34,28,8,3,light);
    polygon(g,[[35,34],[45,32],[42,40]],edge);
  } else if (!boss) {
    // A walking chimney with a glowing, side-facing exhaust.
    box(11,35,7,10+frame,iron);box(28,35,7,12-frame,iron);
    polygon(g,[[9,35],[11,20],[18,17],[18,5],[29,5],[30,17],[37,22],[39,36]],iron);
    box(16,3,16,5,edge);box(19,11,9,3,coal);
    box(12,24,21,9,edge);box(15,26,19,5,iron);box(17,27,14,3,light);
    box(31,18,12,7,coal);box(40,18,4,6,light);
  } else {
    // The foundry bell walks on two heavy feet and carries its missing clapper.
    box(23,67,10,14+frame,iron);box(45,67,11,16-frame,iron);
    polygon(g,[[12,62],[20,53],[24,27],[31,19],[48,19],[56,28],[60,53],[68,64],[64,70],[15,70]],iron);
    polygon(g,[[20,59],[27,48],[30,29],[36,24],[48,24],[53,46],[59,60]],'#997559');
    box(16,62,47,5,edge);box(33,15,14,7,edge);box(36,10,8,7,iron);
    polygon(g,[[38,26],[44,26],[40,39],[47,44],[36,59],[39,46],[34,41]],light);
    box(26,33,8,4,iron);box(46,33,7,4,iron);
    box(54,44,15,7,coal);box(67,19+frame,4,42,edge);box(60,15+frame,18,12,iron);box(61,16+frame,15,3,light);
  }
  return c;
}

function reachProp(kind) {
  const c=canvas(64,80),g=c.getContext('2d');
  const box=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const iron='#403b41', stone='#80716d', copper='#b98058', ember='#f7c578';
  if (kind==='snag') {
    polygon(g,[[20,73],[27,57],[27,42],[12,33],[8,18],[15,28],[28,34],[32,7],[37,3],[34,29],[46,23],[54,11],[52,27],[36,38],[36,60],[44,72]],iron);
    box(29,45,3,20,stone);box(36,30,5,3,copper);
  } else if (kind==='slag') {
    polygon(g,[[4,68],[12,48],[22,40],[30,44],[39,30],[52,40],[60,66],[47,73],[15,72]],iron);
    polygon(g,[[11,61],[20,45],[27,47],[22,57]],stone);
    polygon(g,[[34,46],[40,34],[49,41],[44,49]],stone);
    box(30,53,3,8,copper);box(33,60,8,3,ember);
  } else if (kind==='furnace') {
    // The broken cupola still holds a bright seam around its pouring mouth.
    polygon(g,[[4,73],[8,51],[14,40],[19,17],[43,17],[47,45],[58,54],[62,73]],iron);
    box(18,11,10,31,stone);box(33,5,11,38,stone);
    box(15,12,14,5,copper);box(31,6,15,5,copper);
    polygon(g,[[12,64],[17,47],[42,44],[52,56],[54,67]],stone);
    polygon(g,[[19,65],[24,53],[38,51],[45,59],[45,65]],iron);
    box(26,59,11,5,ember);box(23,63,20,3,copper);
    box(5,69,55,5,iron);box(8,67,47,3,stone);
  } else if (kind==='gauge') {
    box(13,58,37,13,iron);box(25,19,12,40,copper);box(19,13,24,14,stone);
    box(23,16,16,8,iron);box(31,17,3,6,ember);
    for(let y=29;y<55;y+=6)box(26,y,5,2,iron);
    box(37,49,15,6,stone);
  } else {
    box(5,9,8,61,iron);box(51,9,8,61,iron);box(4,8,56,7,copper);
    box(29,15,5,10,iron);
    polygon(g,[[14,53],[20,46],[23,29],[29,24],[36,24],[43,30],[45,46],[50,53]],copper);
    box(14,52,37,5,stone);box(32,35,3,8,iron);box(29,42,4,11,iron);
    box(20,64,16,4,stone);box(31,62,5,7,iron);
  }
  return c;
}

function monster(type, frame) {
  if (type === 'wisp') {
    const c = canvas(58, 58), g = c.getContext('2d'), lift = frame === 1 ? -7 : frame === 2 ? 4 : 0;
    for (const side of [-1, 1]) {
      g.save(); g.translate(29, 28); g.scale(side, 1);
      polygon(g, [[2,0],[18,-19+lift],[25,-15+lift],[23,1],[13,11],[3,9]], '#4b393e');
      polygon(g, [[5,0],[18,-14+lift],[21,-12+lift],[18,0],[11,7],[5,6]], '#c47654');
      polygon(g, [[7,0],[17,-8+lift],[16,0],[11,4]], '#f1bf75');
      g.fillStyle='#8e4e48';g.fillRect(7,10,9,6);g.fillStyle='#e1a66b';g.fillRect(10,11,3,3);
      g.restore();
    }
    polygon(g, [[29,15],[35,24],[33,39],[29,46],[25,38],[24,24]], '#543d42');
    g.fillStyle='#edaa67';g.fillRect(27,23,5,14);g.fillStyle='#fff0b5';g.fillRect(28,24,3,7);
    g.fillStyle='#f4d2a3';g.fillRect(23,16,3,4);g.fillRect(33,16,3,4);
    return c;
  }
  if (type === 'ancient') {
    const c = canvas(88, 96), g = c.getContext('2d');
    polygon(g, [[14,31],[27,14],[60,14],[74,31],[81,66],[68,80],[22,80],[8,65]], '#303c3c');
    polygon(g, [[22,31],[31,20],[58,20],[68,34],[69,66],[57,76],[26,68]], '#66716b');
    polygon(g, [[25,32],[33,22],[45,22],[39,37],[26,48]], '#939784');
    g.fillStyle='#394c47';g.fillRect(4,44,17,32);g.fillRect(68,43,17,33);
    g.fillStyle='#7e8474';g.fillRect(5,45,8,20);g.fillRect(70,44,7,22);
    g.fillStyle='#293b39';g.fillRect(24,76,15,13+frame);g.fillRect(54,75,15,15-frame);
    polygon(g, [[43,34],[57,47],[53,63],[43,71],[33,59],[32,45]], '#603f3b');
    polygon(g, [[43,39],[51,47],[48,59],[43,64],[38,57],[37,47]], '#de9459');
    g.fillStyle=frame===1?'#fff3b4':'#f5cc85';g.fillRect(41,45,5,12);
    g.fillStyle='#edb76d';g.fillRect(28,29,9,3);g.fillRect(53,29,9,3);g.fillRect(24,55,5,13);g.fillRect(59,57,4,12);
    polygon(g, [[29,20],[19,9],[22,4],[34,14],[42,4],[48,7],[45,17],[62,6],[68,10],[61,23]], '#7e6751');
    g.fillStyle='#c19a64';g.fillRect(25,9,5,4);g.fillRect(57,13,8,3);
    return c;
  }
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
  } else if (kind === 'rune' || kind === 'runeRead') {
    polygon(g, [[14,69],[18,25],[27,13],[44,17],[50,35],[48,71]], '#344b47');
    polygon(g, [[20,64],[23,27],[30,19],[41,22],[43,64]], '#7b8a78');
    g.fillStyle='#a9ae8e';g.fillRect(24,28,4,27);
    g.strokeStyle=kind==='runeRead'?'#b9e4c8':'#edba78';g.lineWidth=3;g.beginPath();
    g.moveTo(33,28);g.lineTo(33,54);g.moveTo(26,35);g.lineTo(39,44);g.moveTo(39,32);g.lineTo(27,47);g.stroke();
    g.fillStyle='#49634c';g.fillRect(11,66,43,7);g.fillStyle='#c99569';g.fillRect(17,67,4,3);
  } else if (kind === 'seal' || kind === 'sealLit') {
    polygon(g, [[5,59],[18,46],[46,46],[60,59],[48,73],[16,73]], '#354e49');
    polygon(g, [[11,59],[21,50],[43,50],[54,59],[45,68],[19,68]], '#7e8972');
    g.strokeStyle=kind==='sealLit'?'#a0e1b7':'#e3a16b';g.lineWidth=3;
    g.strokeRect(25,53,15,12);g.beginPath();g.moveTo(16,58);g.lineTo(49,64);g.moveTo(21,66);g.lineTo(45,53);g.stroke();
    g.fillStyle=kind==='sealLit'?'#d4f5bf':'#f7c783';g.fillRect(30,57,5,5);
  } else if (kind === 'gate' || kind === 'gateOpen') {
    g.fillStyle='#304744';g.fillRect(5,13,14,60);g.fillRect(46,13,14,60);g.fillRect(9,9,46,14);
    g.fillStyle='#788372';g.fillRect(7,15,9,53);g.fillRect(48,15,9,53);g.fillRect(10,11,44,7);
    g.fillStyle='#b4ac84';g.fillRect(7,25,10,3);g.fillRect(48,45,10,3);
    if (kind === 'gate') {
      g.fillStyle='#715c45';g.fillRect(18,31,28,5);g.fillRect(18,54,28,5);
      g.fillStyle='#8e7450';for(let x=20;x<46;x+=7)g.fillRect(x,25,3,45);
    }
    g.fillStyle='#415e48';g.fillRect(2,68,22,5);g.fillRect(41,66,22,7);
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
  for (const [id, colors] of Object.entries({ player:{},reed:{t:'#68764e',T:'#a0ad76',H:'#aaa89e'},brine:{t:'#357b85',T:'#99caca',h:'#b4a999'},copper:{t:'#96553f',T:'#d59260',H:'#b1a69a',h:'#82766e',d:'#4a4146'},gold:{t:'#a67a3e',T:'#e0bd6a'},rose:{t:'#a4657b',T:'#df9a9b'},blue:{t:'#4b6c8b',T:'#82a9bb'} })) {
    art[id] = [0,1,2].map(f=>pixelSprite(person,colors,f));
    art[id+'Back'] = [0,1,2].map(f=>pixelSprite(person,colors,f,true));
  }
  for (const id of ['sprout','wolf','warden','wisp','ancient']) art[id]=[0,1,2].map(f=>monster(id,f));
  for (const id of ['skitter','sentry','striker']) art[id]=[0,1,2].map(frame=>foundryMonster(id,frame));
  for (const id of ['slag','snag','gauge','bell','furnace']) art[id]=reachProp(id);
  art.trees = [0,1,2,3].map(tree);
  art.houseRed=house('red'); art.houseBlue=house('blue');
  for (const id of ['rock','fire','chest','chestOpen','beacon','beaconLit','herb','sign','rune','runeRead','seal','sealLit','gate','gateOpen']) art[id]=prop(id);
  addTideglassArt(art);
  return art;
}

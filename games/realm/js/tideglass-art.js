// Hand-pixelled silhouettes for the ferry, salt workers and tidal machinery.
// Each pattern is rasterized only when the shared sprite cache is built.
const ink = { x:'#273c47', b:'#425765', m:'#657d85', s:'#a3bbb7', w:'#e2e6cf',
  t:'#35767b', c:'#67afa8', a:'#bc8354', g:'#e4bb79', r:'#aa5c4f', y:'#ffda83', l:'#82905b' };

const scenery = {
  bollard: ['    gga','    aba','    awa','   abbba','   awwsa','    aba','    abb','  mmmmmm'],
  skiff: ['              a','            aa',' x         aa   ax',' abaa     aa  aab','  bswwwwwwwwssbb','   xbbbabbabbbx','     xxxxxxxx'],
  trough: ['  ssssss',' mswwwssm','msbttttssm','mbccccccmb',' mbbbbbbmb','  m    mm'],
  tablet: ['   ssssss','  smmmsssm','  mwwwwssm','  maaaasbm','  mwsswsbm','  mwwwwsbm','  mssswsbm','  mmmmmmmb',' bbbbbbbbbb'],
  lamp: ['     a','    aga','   abbbba','   byyyab','   bywyab','   abbbba','     a','     a','    aba','   bbabb'],
  lampCold: ['     a','    aga','   abbbba','   bmmsab','   bmbsab','   abbbba','     a','     a','    aba','   bbabb'],
  blind: ['     lll','   lllllll',' lllgllgllgll','lgglllglllglll',' abba  abba',' abb    aba',' a gggggg a',' abbaaaabba'],
  cairn: ['     w','    mwm','   msssm','    mxm','  sssmssm',' mmmssmmm','bbmmmmmmbb'],
  tin: ['   bbb','  bwccb',' mcccssm',' btssstb',' btttttb','  bbbbb'],
  wheel: ['    aaa','  arrgrra',' ar xgx ra',' argggggra',' ar xgx ra','  arrrrra','    aba',' bbbabbbb'],
  brassWheel: ['    aaa','  aggygga',' ag xyx ga',' agyyyyyga',' ag xyx ga','  aggggga','    aba',' bbbabbbb'],
  blueWheel: ['    mmm','  mccwccm',' mc xwx cm',' mcwwwwwcm',' mc xwx cm','  mcccccm','    mbm',' bbbmbbbb'],
  staff: ['   gs','   wg','   rr','   ww','   mm','   ww','   rr','   ww','   mm','   ww','  mmmm'],
  float: ['    ag','    aa','  aaggaa    m',' aggyggga  mm',' agggagga ms','  aagaaa ms','   awwwwwb','  bbbbbbbbb'],
  dial: ['       ww','    ssswssss','   sb gg  bms','  sb  g   b ms',' sb   g    b ms',' swgggwggggggws',' sb   g   b  ms','  sb  g  b  ms','   sb g b  ms','    ssssssss','       ab','    ssmamss','  mmsssssssmm'],
  mailbox: ['   aaagaaaa','  aagggaaaaa',' bbwwbbwwbbbb',' bbwwbbwwbbbb',' bbxxbbssbbbb',' abaaabaababa','  ab      ab','  bb      bb'],
  sailstone: ['     w','    sw','   ssw','   csm','  scsm','  tcmb  w','  tcmb sw',' mtcsmssw',' bmbbmmbb'],
  seaGrass: ['     l',' l  lc   l',' cl lc  lc','  cltc  tc','   ctc ct','  ttctct','   tttt'],
  tideHouse: ['     g           w','     a          sw','  gwwwwwwwwwwwwss','   scccccccccccs','   scttcttcttcts','   abbbbbbbbbbbb','   a wwt  xwwb a','   a ttb  xywb a','   a      xxxb a','  mmssssssssssmmm'],
  ferryPost: ['   rrr','   arrgg','   a','   a       a','   ab    bba','   a bbbb  a','   a       a','  bab     bab'],
  tollArch: ['     aaagaaaa','   sssswwwssss','  mb mmxgxmm bm','  mb    g    bm','  mb    a    bm','  mb         bm','  mb         bm','  bs         sb',' mbbb       bbbm'],
  shiftHut: ['         rr','      aaarrr','   aggggggggg',' abaaaaaaaaaaa','  ax ww  ss a','  ax ss  mm a','  ax    bbb a',' bbbaaaaaaabbb'],
  postRack: ['  a       a','  aaaaagaaaa','  abws bsba','  abws bsba','  aaaaagaaaa','  absb bwwa','  abmb bssa','  aaaaaaaba','  ab     ab']
};

const creatures = {
  knell: ['       xxx      x','    xxbbbmwgggggg','     xxxbsg','        mm',' xx      mm',' xbxx   bms','  xbbxxxbbm','   xbbgggbm','    xbgagbx','     xgggx','      a  a','     ga  ga'],
  shearwing: ['        wrr','       wwwggg','    m  wws','  smm  sm',' swsssmss','  bsssss','   bmmmb','    a a','   ga ga'],
  claw: [' aa             aa',' agga  c   c  agga','  agg  x   x  gga','   aa msssssm aa','    absswwsssba','   attccccccctta','  abbtccccccctbba',' bb  btttttttb  bb',' b  bb bbbbb bb  b'],
  manta: ['w               w','ss     a a     ss',' css  sxxxs  ssc','  cssstccctsssc','   cwwccwccwwc','    ttcwwwctt','       tct','        tc','         ttc','           cc'],
  heron: ['        ccw','       cwwgggg','        ssm','         ss','   cwww  ms','  wwccscss',' sstctccsm','  bttttbb','    mm m','    a  a','   ga  ga'],
  ebbwright: ['         w','       sgggs','     ssggxggss','    smg  g  gms','    swgggygggws','    smg  g  gms','     ssggxggss','   ssbmmgggmmbss','  scctbbwwbbtcccs',' sscttbgggggbttccs',' bmmb bsggsb bmmb',' swws bwsswb swws',' bssb bsggsb bssb','  bb  bbbbb  bb','     sbm  mbs','    sssm  msss','   bbbbb  bbbbb']
};
function raster(rows, scale, width, height, frame, creature) {
  const sheet = document.createElement('canvas');
  sheet.width = width; sheet.height = height;
  const g = sheet.getContext('2d');
  const columns = Math.max(...rows.map(row => row.length));
  const left = Math.floor((width - columns * scale) / 2);
  const top = height - (creature ? 7 : 8) - rows.length * scale;
  rows.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel === ' ') return;
    let shift = 0;
    if (frame && creature) {
      const outer = x < columns / 3 || x > columns * 2 / 3;
      if (y >= rows.length - 3) shift = (x < columns / 2 ? 1 : -1) * frame;
      else if (outer) shift = frame;
    }
    g.fillStyle = ink[pixel];
    g.fillRect(left + x * scale, top + y * scale + shift, scale, scale);
  }));
  return sheet;
}

export function addTideglassArt(art) {
  for (const [id, rows] of Object.entries(scenery)) {
    const scale = ['tideHouse', 'shiftHut', 'postRack', 'dial'].includes(id) ? 4 : 3;
    art[id] = raster(rows, scale, Math.max(64, Math.max(...rows.map(r => r.length)) * scale), 80, 0, false);
  }
  for (const [id, rows] of Object.entries(creatures)) {
    const boss = id === 'ebbwright' || id === 'knell';
    art[id] = [0, 1, -1].map(frame => raster(rows, boss ? 4 : 3, boss ? 84 : 56, boss ? 86 : 48, frame * 2, true));
  }
}

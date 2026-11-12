(() => {
  const W = 640, H = 480, PX = 125, PY = 452, SC = 1.08, ROUNDS = 5, TIME = 45;
  const SWATCH = ['#f5f3ee', '#24232f', '#e64a5f', '#ff9e6b', '#ffd25c', '#7fe0c2', '#4fa8ff', '#2b3a78', '#9b6bff', '#f2a7c3', '#c9a227', '#8a8f9e', '#7a2340', '#3f8a5a'];
  const HAIRC = ['#1b1a20', '#4a2f1d', '#8a5a35', '#d9b36a', '#b8323f', '#f2a7c3', '#4fa8ff', '#e8e2d0'];
  const SKINS = ['#f6d7bf', '#e9b994', '#c98e64', '#9a6440', '#6b4428'];
  const CATS = {
    hair: ['Bob:chic,formal', 'Long waves:formal,beach,royal', 'Ponytail:sporty,casual', 'Space buns:futuristic,edgy,rock', 'Curls:cozy,garden,casual', 'Pixie:edgy,rock,futuristic'],
    top: ['Tee:sporty,beach,casual', 'Knit sweater:cozy,winter,rainy', 'Silk blouse:formal,garden', 'Crop top:beach,edgy', 'Band tee:rock,edgy,casual', 'Flight top:futuristic,sporty', 'Royal bodice:royal,formal'],
    bottom: ['Shorts:beach,sporty,casual', 'Jeans:casual,rock,rainy', 'Ball gown:royal,formal', 'Pleated skirt:garden,formal', 'Track pants:sporty', 'Cargo pants:futuristic,rainy,casual', 'Plaid mini:edgy,rock'],
    shoes: ['Sandals:beach,garden', 'Sneakers:sporty,casual', 'Heels:formal,royal,garden', 'Boots:winter,rainy,rock', 'Moon boots:futuristic,winter'],
    outer: ['None:', 'Leather jacket:rock,edgy', 'Puffer coat:winter,cozy', 'Raincoat:rainy', 'Royal cape:royal', 'Blazer:formal', 'Holo jacket:futuristic'],
    extra: ['None:', 'Sun hat:beach,garden', 'Crown:royal', 'Headphones:rock,sporty', 'Space visor:futuristic', 'Beanie:winter,cozy', 'Umbrella:rainy', 'Flower crown:garden']
  };
  for (const k in CATS) CATS[k] = CATS[k].map(s => { const [name, t] = s.split(':'); return {name, tags: t ? t.split(',') : []}; });
  const TABS = ['hair', 'top', 'bottom', 'shoes', 'outer', 'extra'];
  const TAB_LABEL = {hair: 'Hair', top: 'Top', bottom: 'Bottom', shoes: 'Shoes', outer: 'Layer', extra: 'Extra'};
  const WEIGHT = {top: 2, bottom: 2, shoes: 1, outer: 1, extra: 1, hair: .5};
  const FOCUS = {hair: [-62, -350, 124, 130], top: [-70, -275, 140, 150], bottom: [-98, -180, 196, 184], shoes: [-48, -72, 96, 76], outer: [-100, -290, 200, 300], extra: [-90, -370, 180, 260]};
  const THEMES = [
    {name: 'Beach Day', tags: ['beach', 'casual', 'sporty'], colors: [3, 4, 5, 6, 0], hint: 'sunny, breezy and bright'},
    {name: 'Winter Gala', tags: ['winter', 'formal', 'cozy'], colors: [7, 0, 12, 11, 10], hint: 'elegant, warm and frosty'},
    {name: 'Rock Concert', tags: ['rock', 'edgy'], colors: [1, 2, 8, 12], hint: 'loud, dark and bold'},
    {name: 'Royal Ball', tags: ['royal', 'formal'], colors: [10, 8, 12, 0], hint: 'regal, rich and golden'},
    {name: 'Space Explorer', tags: ['futuristic', 'sporty'], colors: [0, 11, 5, 6, 8], hint: 'sleek, shiny and techy'},
    {name: 'Garden Party', tags: ['garden', 'formal', 'casual'], colors: [9, 5, 4, 0, 13], hint: 'soft pastels and flowers'},
    {name: 'Rainy City', tags: ['rainy', 'casual', 'cozy'], colors: [4, 7, 11, 1], hint: 'practical and cosy'},
    {name: 'Sports Day', tags: ['sporty', 'casual'], colors: [2, 6, 0, 4], hint: 'active and colourful'}
  ];
  const JUDGES = [['Mira', '#e8577a'], ['Theo', '#5cb8ff'], ['Ines', '#ffcf5c']];

  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r *= f; g *= f; b *= f; } else { r += (255 - r) * (f - 1); g += (255 - g) * (f - 1); b += (255 - b) * (f - 1); }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  };
  const poly = (ctx, pts, color) => { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  const line = (ctx, pts, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const TORSO = [[-41, -251], [41, -251], [31, -174], [39, -138], [-39, -138], [-31, -174]];
  const sleeves = (ctx, c, end, w = 17) => { line(ctx, [[-40, -243], [-44, -200], [-48, end]], c, w); line(ctx, [[40, -243], [44, -200], [48, end]], c, w); };

  const DRAW = {
    hairBack(ctx, i, c) {
      ctx.fillStyle = c;
      if (i === 0) { ctx.beginPath(); ctx.roundRect(-37, -336, 74, 76, [32, 32, 10, 10]); ctx.fill(); }
      if (i === 1) { ctx.beginPath(); ctx.moveTo(-36, -310); ctx.quadraticCurveTo(-52, -240, -40, -196); ctx.quadraticCurveTo(0, -186, 40, -196); ctx.quadraticCurveTo(52, -240, 36, -310); ctx.arc(0, -300, 36, 0, Math.PI, true); ctx.fill(); }
      if (i === 2) { ctx.beginPath(); ctx.moveTo(26, -322); ctx.quadraticCurveTo(70, -300, 52, -228); ctx.quadraticCurveTo(44, -260, 30, -300); ctx.fill(); }
      if (i === 3) { G.circle(-28, -330, 15, c); G.circle(28, -330, 15, c); }
      if (i === 4) for (let k = 0; k < 14; k++) { const a = Math.PI * .9 + k * Math.PI * 1.2 / 13; G.circle(Math.cos(a) * 36, -296 + Math.sin(a) * 36, 15, c); }
    },
    hairFront(ctx, i, c) {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, -298, 32, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
      if (i === 0) poly(ctx, [[-32, -302], [-28, -318], [0, -330], [28, -318], [32, -302], [14, -306], [0, -312], [-14, -306]], c);
      if (i === 1) { poly(ctx, [[-32, -300], [-20, -326], [16, -330], [32, -300], [6, -312], [-18, -300]], c); line(ctx, [[-31, -300], [-36, -270], [-32, -244]], c, 9); line(ctx, [[31, -300], [36, -270], [32, -244]], c, 9); }
      if (i === 2) poly(ctx, [[-31, -300], [-22, -324], [22, -326], [31, -298], [10, -316]], c);
      if (i === 3) poly(ctx, [[-31, -302], [-18, -314], [0, -310], [18, -314], [31, -302], [0, -320]], c);
      if (i === 4) for (let k = 0; k < 6; k++) G.circle(-25 + k * 10, -318 + (k % 2) * 4, 8, c);
      if (i === 5) poly(ctx, [[-32, -296], [-26, -322], [-10, -334], [4, -326], [16, -336], [24, -322], [33, -300], [18, -312], [4, -306], [-12, -314]], c);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(-12, -320, 10, 4, -.4, 0, Math.PI * 2); ctx.fill();
    },
    body(ctx, skin) {
      G.rr(-25, -146, 19, 136, 9, skin); G.rr(6, -146, 19, 136, 9, skin);
      G.rr(-27, -16, 22, 14, 6, skin); G.rr(5, -16, 22, 14, 6, skin);
      line(ctx, [[-40, -242], [-45, -200], [-49, -152]], skin, 13); line(ctx, [[40, -242], [45, -200], [49, -152]], skin, 13);
      G.circle(-50, -146, 8, skin); G.circle(50, -146, 8, skin);
      poly(ctx, TORSO, skin);
      G.rr(-8, -274, 16, 28, 6, skin);
      G.circle(-30, -294, 6, skin); G.circle(30, -294, 6, skin);
      G.circle(0, -296, 30, skin);
    },
    face(ctx) {
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#2b2235'; ctx.beginPath(); ctx.ellipse(s * 11, -294, 4.2, 5.2, 0, 0, Math.PI * 2); ctx.fill();
        G.circle(s * 11 + 1.5, -296, 1.4, '#ffffff');
        line(ctx, [[s * 6, -305], [s * 15, -306]], '#4a3a3a', 2);
        G.circle(s * 17, -284, 5, 'rgba(232,87,122,.25)');
      }
      ctx.strokeStyle = '#a8455a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -282, 6, .3, Math.PI - .3); ctx.stroke();
    },
    shoes(ctx, i, c) {
      for (const x of [-16, 16]) {
        if (i === 0) { G.rr(x - 12, -4, 24, 5, 2, shade(c, .7)); line(ctx, [[x - 9, -6], [x + 9, -12]], c, 3); line(ctx, [[x - 9, -12], [x + 9, -6]], c, 3); }
        if (i === 1) { G.rr(x - 13, -16, 26, 14, 7, c); G.rr(x - 14, -5, 28, 5, 2, '#f5f3ee'); line(ctx, [[x - 4, -14], [x + 4, -10]], '#f5f3ee', 1.5); }
        if (i === 2) { poly(ctx, [[x - 11, -14], [x + 12, -8], [x + 13, -2], [x - 11, -2]], c); G.rr(x - 12, -6, 4, 6, 1, shade(c, .6)); }
        if (i === 3) { G.rr(x - 13, -64, 26, 62, 6, c); G.rr(x - 14, -6, 28, 6, 2, shade(c, .55)); G.rr(x - 13, -64, 26, 6, 3, shade(c, 1.3)); }
        if (i === 4) { G.rr(x - 17, -56, 34, 56, 14, c); for (let y = -46; y < 0; y += 12) line(ctx, [[x - 14, y], [x + 14, y]], shade(c, .8), 2); G.rr(x - 18, -7, 36, 7, 3, '#f5f3ee'); }
      }
    },
    bottom(ctx, i, c) {
      const d = shade(c, .78), l = shade(c, 1.2);
      if (i === 0) { poly(ctx, [[-40, -146], [40, -146], [42, -104], [3, -104], [0, -120], [-3, -104], [-42, -104]], c); G.rr(-40, -148, 80, 7, 2, d); }
      if (i === 1 || i === 4 || i === 5) {
        poly(ctx, [[-40, -146], [40, -146], [32, -14], [6, -14], [0, -122], [-6, -14], [-32, -14]], c);
        G.rr(-40, -148, 80, 7, 2, d);
        if (i === 1) { line(ctx, [[-22, -140], [-20, -20]], l, 1.5); line(ctx, [[22, -140], [20, -20]], l, 1.5); G.rr(-32, -24, 26, 8, 2, d); G.rr(6, -24, 26, 8, 2, d); }
        if (i === 4) { line(ctx, [[-38, -140], [-31, -18]], '#f5f3ee', 3); line(ctx, [[38, -140], [31, -18]], '#f5f3ee', 3); }
        if (i === 5) { G.rr(-40, -100, 16, 20, 3, d); G.rr(24, -100, 16, 20, 3, d); }
      }
      if (i === 2) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-31, -174); ctx.lineTo(31, -174); ctx.quadraticCurveTo(70, -90, 96, -6); ctx.quadraticCurveTo(0, 6, -96, -6); ctx.quadraticCurveTo(-70, -90, -31, -174); ctx.fill();
        for (const x of [-50, -20, 20, 50]) line(ctx, [[x * .25, -160], [x, -10]], d, 2);
        G.rr(-32, -178, 64, 9, 3, l);
      }
      if (i === 3) { poly(ctx, [[-34, -164], [34, -164], [60, -78], [-60, -78]], c); for (let x = -50; x <= 50; x += 14) line(ctx, [[x * .55, -160], [x, -80]], d, 1.6); G.rr(-34, -166, 68, 7, 2, d); }
      if (i === 6) {
        poly(ctx, [[-38, -152], [38, -152], [50, -110], [-50, -110]], c);
        ctx.save(); ctx.beginPath(); ctx.moveTo(-38, -152); ctx.lineTo(38, -152); ctx.lineTo(50, -110); ctx.lineTo(-50, -110); ctx.clip();
        for (let x = -50; x < 50; x += 10) { line(ctx, [[x, -155], [x, -108]], d, 2); }
        for (let y = -148; y < -110; y += 10) line(ctx, [[-50, y], [50, y]], l, 1.5);
        ctx.restore();
      }
    },
    top(ctx, i, c) {
      const d = shade(c, .78), l = shade(c, 1.25);
      if (i === 3) { poly(ctx, [[-41, -251], [41, -251], [32, -192], [-32, -192]], c); sleeves(ctx, c, -222, 16); ctx.fillStyle = shade(c, .9); ctx.fillRect(-32, -196, 64, 4); }
      else if (i === 6) {
        poly(ctx, [[-38, -244], [38, -244], [26, -176], [30, -150], [-30, -150], [-26, -176]], c);
        G.circle(-40, -238, 14, l); G.circle(40, -238, 14, l);
        for (let y = -232; y < -160; y += 14) line(ctx, [[-14, y], [14, y + 8]], '#c9a227', 1.8);
        line(ctx, [[-38, -244], [-12, -232], [0, -240], [12, -232], [38, -244]], '#c9a227', 3);
      } else {
        poly(ctx, TORSO, c);
        if (i === 0 || i === 4) sleeves(ctx, c, -214, 18);
        if (i === 1 || i === 5) { sleeves(ctx, c, -160); G.rr(-58, -166, 18, 8, 3, d); G.rr(40, -166, 18, 8, 3, d); }
        if (i === 1) { G.rr(-12, -276, 24, 22, 6, d); for (let y = -150; y < -138; y += 4) line(ctx, [[-38, y], [38, y]], d, 1.5); }
        if (i === 2) { poly(ctx, [[-10, -252], [10, -252], [0, -226]], '#00000000'); G.circle(-40, -238, 11, l); G.circle(40, -238, 11, l); sleeves(ctx, c, -218, 14); poly(ctx, [[-12, -252], [0, -228], [-20, -246]], l); poly(ctx, [[12, -252], [0, -228], [20, -246]], l); for (let y = -222; y < -150; y += 16) G.circle(0, y, 2, d); }
        if (i === 4) { poly(ctx, [[4, -230], [-10, -200], [0, -200], [-6, -172], [12, -206], [2, -206], [10, -230]], '#ffd25c'); }
        if (i === 5) { line(ctx, [[0, -250], [0, -142]], d, 2); G.rr(14, -232, 16, 10, 2, '#ff9e6b'); G.rr(-14, -258, 28, 8, 4, d); }
        if (i === 0 || i === 4) { ctx.strokeStyle = d; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -252, 9, .2, Math.PI - .2); ctx.stroke(); }
      }
    },
    outerBack(ctx, i, c) {
      if (i === 4) { ctx.fillStyle = shade(c, .8); ctx.beginPath(); ctx.moveTo(-42, -250); ctx.lineTo(42, -250); ctx.quadraticCurveTo(70, -120, 82, -2); ctx.lineTo(-82, -2); ctx.quadraticCurveTo(-70, -120, -42, -250); ctx.fill(); }
      if (i === 3) { ctx.fillStyle = shade(c, .85); ctx.beginPath(); ctx.arc(0, -292, 40, Math.PI * .85, Math.PI * 2.15); ctx.fill(); }
    },
    outer(ctx, i, c) {
      const d = shade(c, .75), l = shade(c, 1.25);
      if (i === 1 || i === 5) {
        const bottom = -132;
        poly(ctx, [[-43, -252], [-8, -250], [-12, bottom], [-42, bottom]], c); poly(ctx, [[43, -252], [8, -250], [12, bottom], [42, bottom]], c);
        sleeves(ctx, c, -158, 18);
        poly(ctx, [[-8, -250], [-24, -246], [-12, -200]], i === 5 ? d : l); poly(ctx, [[8, -250], [24, -246], [12, -200]], i === 5 ? d : l);
        if (i === 1) { line(ctx, [[-12, -230], [-12, -140]], '#c9ccd4', 2); G.rr(-38, -190, 12, 3, 1, '#c9ccd4'); }
        if (i === 5) { G.rr(-38, -168, 18, 4, 1, d); G.circle(-14, -178, 2.5, d); G.circle(-14, -160, 2.5, d); }
      }
      if (i === 2) {
        poly(ctx, [[-46, -254], [46, -254], [44, -128], [-44, -128]], c);
        for (let y = -232; y < -130; y += 22) line(ctx, [[-44, y], [44, y]], d, 2.5);
        sleeves(ctx, c, -158, 22); G.rr(-18, -268, 36, 18, 8, l); line(ctx, [[0, -252], [0, -130]], d, 2);
      }
      if (i === 3) {
        poly(ctx, [[-44, -254], [44, -254], [52, -60], [-52, -60]], c); sleeves(ctx, c, -156, 19);
        line(ctx, [[0, -250], [0, -62]], d, 2); for (let y = -230; y < -70; y += 34) { G.circle(-8, y, 3, l); G.circle(8, y, 3, l); }
      }
      if (i === 4) { for (let x = -40; x <= 40; x += 10) G.circle(x, -250, 8, '#f5f3ee'); G.circle(0, -244, 7, '#c9a227'); G.circle(0, -244, 3, '#e64a5f'); }
      if (i === 6) {
        const g = ctx.createLinearGradient(-45, -250, 45, -190);
        g.addColorStop(0, l); g.addColorStop(.5, '#e8f6ff'); g.addColorStop(1, c);
        poly(ctx, [[-44, -254], [-8, -250], [-12, -192], [-40, -192]], g); poly(ctx, [[44, -254], [8, -250], [12, -192], [40, -192]], g);
        sleeves(ctx, g, -160, 18);
      }
    },
    extra(ctx, i, c) {
      const d = shade(c, .75);
      if (i === 1) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -318, 64, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -322, 30, Math.PI, 0); ctx.fill(); G.rr(-30, -330, 60, 7, 2, '#e64a5f'); }
      if (i === 2) { poly(ctx, [[-28, -322], [-30, -350], [-16, -336], [0, -356], [16, -336], [30, -350], [28, -322]], '#c9a227'); G.circle(0, -334, 4, '#e64a5f'); G.circle(-16, -330, 3, '#4fa8ff'); G.circle(16, -330, 3, '#4fa8ff'); }
      if (i === 3) { ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -300, 38, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); G.rr(-44, -310, 14, 28, 6, c); G.rr(30, -310, 14, 28, 6, c); }
      if (i === 4) { G.circle(0, -298, 46, 'rgba(180,220,255,.28)'); ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -298, 46, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse(-18, -316, 12, 6, -.6, 0, Math.PI * 2); ctx.fill(); }
      if (i === 5) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, -304, 33, Math.PI, 0); ctx.fill(); G.rr(-34, -312, 68, 12, 5, d); G.circle(0, -340, 9, '#f5f3ee'); }
      if (i === 6) { line(ctx, [[52, -146], [62, -330]], '#4a3a3a', 3); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-8, -330); ctx.quadraticCurveTo(62, -400, 132, -330); for (let k = 0; k < 5; k++) ctx.quadraticCurveTo(118 - k * 28, -340, 104 - k * 28, -330); ctx.fill(); }
      if (i === 7) for (let k = 0; k < 9; k++) { const a = Math.PI * 1.08 + k * Math.PI * .84 / 8, x = Math.cos(a) * 32, y = -300 + Math.sin(a) * 32; for (let p = 0; p < 5; p++) G.circle(x + Math.cos(p * 1.26) * 4, y + Math.sin(p * 1.26) * 4, 3, k % 2 ? c : '#f2a7c3'); G.circle(x, y, 2, '#ffd25c'); }
    }
  };

  function doll(ctx, o, only) { // only: draw a grey mannequin wearing just that category (for thumbnails)
    const skin = only ? '#3a3f66' : SKINS[o.skin], show = cat => !only || only === cat;
    const outer = o.outer.i, hair = o.hair.i;
    if (show('outer') && outer) DRAW.outerBack(ctx, outer, SWATCH[o.outer.c]);
    if (show('hair')) DRAW.hairBack(ctx, hair, HAIRC[o.hair.c]);
    DRAW.body(ctx, skin);
    if (show('shoes')) DRAW.shoes(ctx, o.shoes.i, SWATCH[o.shoes.c]);
    if (show('bottom')) DRAW.bottom(ctx, o.bottom.i, SWATCH[o.bottom.c]);
    if (show('top')) DRAW.top(ctx, o.top.i, SWATCH[o.top.c]);
    if (show('outer') && outer) DRAW.outer(ctx, outer, SWATCH[o.outer.c]);
    if (!only) DRAW.face(ctx);
    if (show('hair')) DRAW.hairFront(ctx, hair, HAIRC[o.hair.c]);
    if (show('extra') && o.extra.i) DRAW.extra(ctx, o.extra.i, SWATCH[o.extra.c]);
  }

  GameBox.register({
    id: 'dressup', title: 'Style Studio', genre: 'Casual', kind: 'Dress-up', w: W, h: H, cursor: 'pointer',
    desc: 'Five rounds of fashion week, each with a theme like Beach Day or Royal Ball. Mix and match hair, tops, bottoms, shoes, layers and accessories in any colour, watch the style meter, then walk the runway before time runs out. Three judges score how well your look fits the theme.',
    controls: [['Click tabs and items', 'Change hair, clothes and extras'], ['Click a colour', 'Recolour the selected piece'], ['1-6', 'Switch tab'], ['Left Right', 'Previous / next item'], ['Up Down', 'Change colour'], ['Enter / Space', 'Walk the runway']],
    info() { return `Round ${this.round}/${ROUNDS} · ${this.theme.name}`; },
    init() {
      this.round = 0; this.parts = []; this.themes = G.shuffle(THEMES.slice()).slice(0, ROUNDS); this.tab = 'top';
      this.o = {skin: Math.floor(G.rnd(SKINS.length)), hair: {i: 0, c: 1}, top: {i: 0, c: 0}, bottom: {i: 1, c: 7}, shoes: {i: 1, c: 0}, outer: {i: 0, c: 1}, extra: {i: 0, c: 4}};
      this.nextRound();
    },
    nextRound() { this.round++; this.theme = this.themes[this.round - 1]; this.time = TIME; this.result = null; },
    score() {
      const th = this.theme; let total = 0, weight = 0, worst = null;
      for (const cat of TABS) {
        const it = CATS[cat][this.o[cat].i], w = WEIGHT[cat], none = it.name === 'None';
        const tag = it.tags.some(t => th.tags.includes(t)) ? 1 : none ? .45 : 0;
        const col = cat === 'hair' || none ? 1 : th.colors.includes(this.o[cat].c) ? 1 : .35;
        const s = tag * .7 + col * .3;
        total += w * s; weight += w;
        if (w >= 1 && (!worst || s < worst.s)) worst = {s, cat, it, tag, col};
      }
      return {pct: total / weight, worst};
    },
    walk() {
      if (this.result) return;
      const {pct, worst} = this.score();
      const marks = JUDGES.map(() => G.clamp(Math.round(2 + pct * 8 + (Math.random() * 2 - 1)), 1, 10));
      const sum = marks.reduce((a, b) => a + b, 0);
      const note = pct > .85 ? 'A perfect fit for the theme!' : worst.tag < 1 ? `The ${worst.it.name.toLowerCase()} doesn't say ${this.theme.name}.` : 'Great pieces, but rethink the colours.';
      this.result = {marks, sum, note, t: 0};
      G.score += sum * 20; G.sfx('select');
    },
    pick(cat, i) { this.o[cat].i = i; G.sfx('click', .6); },
    key(k) {
      if (this.result) return;
      const n = '123456'.indexOf(k); if (n >= 0) this.tab = TABS[n];
      const cat = this.tab, items = CATS[cat];
      if (k === 'ArrowRight') this.pick(cat, (this.o[cat].i + 1) % items.length);
      if (k === 'ArrowLeft') this.pick(cat, (this.o[cat].i + items.length - 1) % items.length);
      const pal = cat === 'hair' ? HAIRC : SWATCH;
      if (k === 'ArrowUp') this.o[cat].c = (this.o[cat].c + 1) % pal.length;
      if (k === 'ArrowDown') this.o[cat].c = (this.o[cat].c + pal.length - 1) % pal.length;
      if (k === 'Enter' || k === ' ') this.walk();
    },
    pointer(type, x, y) {
      if (type !== 'down' || this.result) return;
      if (y > 8 && y < 42 && x > 258) { const i = Math.floor((x - 260) / 62); if (TABS[i]) { this.tab = TABS[i]; G.sfx('click', .4); } return; }
      const cat = this.tab, items = CATS[cat];
      if (y > 52 && y < 256 && x > 260) { const c = Math.floor((x - 262) / 92), r = Math.floor((y - 52) / 104), i = r * 4 + c; if (c < 4 && items[i]) this.pick(cat, i); return; }
      const sw = (row, list, apply) => list.forEach((col, i) => { if (G.dist(x, y, 280 + i * 34, row) < 14) { apply(i); G.sfx('click', .4); } });
      if (cat === 'hair') { sw(282, HAIRC, i => { this.o.hair.c = i; }); sw(316, SKINS, i => { this.o.skin = i; }); }
      else { sw(282, SWATCH.slice(0, 7), i => { this.o[cat].c = i; }); sw(316, SWATCH.slice(7), i => { this.o[cat].c = i + 7; }); }
      if (x > 300 && x < 620 && y > 404 && y < 456) this.walk();
    },
    update(dt) {
      if (this.result) {
        this.result.t += dt;
        if (this.result.t > 4.2) { if (this.round >= ROUNDS) return G.end('Fashion week wrapped'); this.nextRound(); }
        return;
      }
      if ((this.time -= dt) <= 0) { this.time = 0; this.walk(); }
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      G.clear('#241b33');
      const spot = ctx.createRadialGradient(PX, 300, 20, PX, 300, 260);
      spot.addColorStop(0, '#4a3a6a'); spot.addColorStop(1, '#241b33');
      ctx.fillStyle = spot; ctx.fillRect(0, 0, 252, H);
      ctx.fillStyle = '#3a2d52'; ctx.beginPath(); ctx.ellipse(PX, PY, 90, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(PX, PY + (this.result ? Math.sin(this.result.t * 6) * 2 : 0)); ctx.scale(SC, SC); doll(ctx, this.o); ctx.restore();
      G.panel(8, 8, 236, 58, 12, 'rgba(12,10,28,.75)');
      G.text(`ROUND ${this.round}/${ROUNDS}`, 18, 26, {size: 10, weight: 700, color: '#9aa0c8'});
      G.text(this.theme.name, 18, 46, {size: 17, display: true, color: '#ffcf5c'});
      G.text(this.theme.hint, 18, 60, {size: 11, color: '#c4c8ee'});
      G.rr(252, 0, W - 252, H, 0, '#1a1428');
      TABS.forEach((t, i) => {
        const on = this.tab === t;
        G.rr(260 + i * 62, 10, 58, 30, 10, on ? '#e8577a' : '#2b2340');
        G.text(TAB_LABEL[t], 289 + i * 62, 30, {size: 12, align: 'center', weight: 700, color: on ? '#ffffff' : '#c4c8ee'});
      });
      const cat = this.tab, items = CATS[cat];
      items.forEach((it, i) => {
        const x = 262 + (i % 4) * 92, y = 52 + Math.floor(i / 4) * 104, on = this.o[cat].i === i;
        G.rr(x, y, 86, 98, 10, on ? '#3b2d58' : '#241c38');
        if (on) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 86, 98, 10); ctx.stroke(); }
        if (it.name !== 'None') {
          const [fx, fy, fw, fh] = FOCUS[cat], s = Math.min(74 / fw, 68 / fh);
          const o = {...this.o, [cat]: {i, c: this.o[cat].c}};
          ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, 78, 72); ctx.clip();
          ctx.translate(x + 43 - (fx + fw / 2) * s, y + 40 - (fy + fh / 2) * s); ctx.scale(s, s); doll(ctx, o, cat); ctx.restore();
        } else G.text('—', x + 43, y + 46, {size: 22, align: 'center', color: '#6b6f99'});
        G.text(it.name, x + 43, y + 90, {size: 10, align: 'center', weight: 700, color: on ? '#ffffff' : '#c4c8ee'});
      });
      G.text(cat === 'hair' ? 'HAIR COLOUR  ·  SKIN TONE' : 'COLOUR', 266, 266, {size: 10, weight: 700, color: '#9aa0c8'});
      const swatches = (row, list, sel) => list.forEach((c, i) => { G.circle(280 + i * 34, row, 12, c); if (i === sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(280 + i * 34, row, 15, 0, Math.PI * 2); ctx.stroke(); } });
      if (cat === 'hair') { swatches(282, HAIRC, this.o.hair.c); swatches(316, SKINS, this.o.skin); }
      else { swatches(282, SWATCH.slice(0, 7), this.o[cat].c < 7 ? this.o[cat].c : -1); swatches(316, SWATCH.slice(7), this.o[cat].c - 7); }
      const {pct} = this.score();
      G.bar({x: 266, y: 344, w: 350, h: 15, v: pct, max: 1, color: pct > .75 ? '#5ee6c1' : pct > .5 ? '#ffcf5c' : '#ff6b8b', label: `STYLE MATCH ${Math.round(pct * 100)}%`, id: 'style'});
      G.bar({x: 266, y: 370, w: 350, h: 12, v: this.time, max: TIME, color: this.time < 10 ? '#ff4b62' : '#8b7bff', label: `${Math.ceil(this.time)}s`});
      G.rr(300, 404, 320, 52, 16, '#e8577a'); G.text('Walk the runway  ✦', 460, 436, {size: 16, align: 'center', weight: 700});
      if (this.result) {
        const r = this.result;
        ctx.fillStyle = 'rgba(12,8,24,.88)'; ctx.fillRect(252, 0, W - 252, H);
        G.text('THE JUDGES SAY', 446, 70, {size: 14, align: 'center', weight: 700, color: '#9aa0c8'});
        JUDGES.forEach(([name, col], i) => {
          const x = 290 + i * 104, shown = r.t > .5 + i * .5;
          G.rr(x, 96, 92, 120, 14, shown ? '#2b2340' : '#1f1830');
          G.circle(x + 46, 128, 18, col); G.text(name, x + 46, 166, {size: 12, align: 'center', weight: 700});
          G.text(shown ? String(r.marks[i]) : '?', x + 46, 202, {size: 28, align: 'center', display: true, color: shown ? '#ffcf5c' : '#6b6f99'});
          if (shown && r.t < .6 + i * .5) G.sfx('coin', .4);
        });
        if (r.t > 2) { G.text(`${r.sum} / 30`, 446, 266, {size: 30, align: 'center', display: true, color: '#5ee6c1'}); G.text(`+${r.sum * 20} points`, 446, 290, {size: 13, align: 'center', color: '#c4c8ee'}); }
        if (r.t > 2.4) G.text(r.note, 446, 330, {size: 13, align: 'center', weight: 700, color: '#e8e9ff'});
      }
      G.fx(this.parts, dt);
    }
  });
})();

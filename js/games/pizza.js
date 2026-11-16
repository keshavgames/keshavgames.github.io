(() => {
  // Make the pizza each customer orders: paint the sauce, sprinkle cheese, add toppings, bake it just right and slice it.
  // Toppings and customers are Blender renders.
  const W = 800, H = 540, CX = 415, CY = 285, R = 150, IN = 132;
  const SAUCES = {tomato: '#c8321e', white: '#f2ead6', pesto: '#4a8a2a'};
  const TOPS = ['pepperoni', 'mushroom', 'olive', 'pepper', 'pineapple', 'basil'];
  const TOP_LV = [1, 1, 1, 5, 9, 12];
  const MONS = ['sproutle', 'puddlet', 'emberpup', 'bloomoth', 'pebblor', 'voltle', 'frostling', 'gloomp'];
  const ASSETS = [...TOPS.map(t => `img/topping_${t}.png`), ...MONS.map(m => `img/mon_${m}.png`)];
  const RIGHT = 600;
  const topBtn = i => ({x: RIGHT + (i % 2) * 96, y: 152 + Math.floor(i / 2) * 74, w: 88, h: 66});

  const layer = () => { const c = document.createElement('canvas'); c.width = c.height = 300; return c; };
  const cover = c => { const d = c.getContext('2d').getImageData(0, 0, 300, 300).data; let n = 0, k = 0;
    for (let y = 30; y < 270; y += 10) for (let x = 30; x < 270; x += 10) if ((x - 150) ** 2 + (y - 150) ** 2 < 120 * 120) { n++; if (d[(y * 300 + x) * 4 + 3] > 40) k++; }
    return k / n; };

  GameBox.register({
    id: 'pizza', title: 'Pizza Maker', genre: 'Simulation', kind: 'Pizza shop', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Read the order card. Paint sauce, sprinkle cheese, click toppings on, bake until the needle is in the green, then serve!',
    desc: 'Run a little pizza shop for hungry monsters. Each order card shows the sauce, cheese, toppings and slices they want. Paint the sauce on with your mouse, sprinkle the cheese, drop on the right number of toppings, then bake it in the brick oven and pull it out when it is golden, not raw and not burnt! Thirty days with new toppings, fussier customers and hotter ovens.',
    controls: [['Drag on the pizza', 'Paint sauce / sprinkle cheese'], ['Click a topping, then the pizza', 'Add toppings'], ['Space', 'Take the pizza out of the oven'], ['Slice / Serve buttons', 'Finish the order']],
    info() { return `Day ${G.level} · Pizza ${Math.min(this.need, this.served + 1)}/${this.need} · ${this.good} good`; },
    init() {
      const n = G.level; this.need = Math.min(7, 3 + Math.floor(n / 5)); this.served = 0; this.good = 0; this.perfect = 0;
      this.patMax = Math.max(55, 110 - n * 1.8); this.parts = []; this.t = 0; this.done = null; this.cust = null; this.next = .3;
      this.sauceL = layer(); this.cheeseL = layer(); this.fresh();
    },
    fresh() {
      this.sauceL.getContext('2d').clearRect(0, 0, 300, 300); this.cheeseL.getContext('2d').clearRect(0, 0, 300, 300);
      this.pz = {sauce: null, sc: 0, cc: 0, tops: [], bake: null, cuts: 0}; this.tool = null; this.oven = null; this.last = null;
    },
    newCustomer() {
      const n = G.level, Rn = Math.random, sauces = n < 4 ? ['tomato'] : n < 8 ? ['tomato', 'white'] : ['tomato', 'white', 'pesto'];
      const pool = TOPS.filter((t, i) => n >= TOP_LV[i]), kinds = Math.min(3, 1 + Math.floor(n / 5)), tops = {};
      G.shuffle(pool.slice()).slice(0, kinds).forEach(t => tops[t] = 2 + Math.floor(Rn() * Math.min(5, 2 + n / 6)));
      this.cust = {mon: G.pick(MONS), x: -160, pat: this.patMax, mood: 0, leave: 0, say: '', order: {sauce: G.pick(sauces), cheese: n < 5 || Rn() < .8, tops, slices: n >= 6 ? G.pick([4, 6, 8]) : 0}};
      this.fresh(); G.sfx('select', .4);
    },
    check() {
      const o = this.cust.order, p = this.pz, wrong = [];
      if (p.sauce !== o.sauce || p.sc < .55) wrong.push(p.sc < .55 ? 'More sauce, please!' : `I wanted ${o.sauce} sauce!`);
      if (o.cheese ? p.cc < .45 : p.cc > .12) wrong.push(o.cheese ? 'Where is the cheese?' : 'No cheese for me!');
      const count = {}; p.tops.forEach(t => count[t.k] = (count[t.k] || 0) + 1);
      for (const [k, v] of Object.entries(o.tops)) if (Math.abs((count[k] || 0) - v) > 1) { wrong.push((count[k] || 0) < v ? `More ${k}!` : `Too much ${k}!`); break; }
      for (const [k, v] of Object.entries(count)) if (!o.tops[k] && v > 1) { wrong.push(`I didn't want ${k}!`); break; }
      if (p.bake !== 'perfect') wrong.push(p.bake === 'burnt' ? 'It is burnt!' : 'It is still raw!');
      if (o.slices && p.cuts * 2 !== o.slices) wrong.push(`Cut it into ${o.slices}!`);
      return wrong;
    },
    serve() {
      const c = this.cust; if (!c || c.leave || this.oven || c.x < 100) return;
      const wrong = this.check(), total = 4 + (c.order.slices ? 1 : 0), right = Math.max(0, total - wrong.length);
      this.served++; c.leave = 1.4; G.score += right * 40;
      if (!wrong.length) { this.good++; this.perfect++; c.mood = 2; c.say = G.pick(['Perfect pizza!', 'Yummy yum!', 'Best pizza ever!']); G.score += 150 + Math.round(c.pat) * 3; G.sfx('win', .6); G.party(); }
      else if (right >= total - 1) { this.good++; c.mood = 1; c.say = wrong[0]; G.sfx('coin', .5); }
      else { c.mood = -1; c.say = wrong[0]; G.sfx('lose', .5); }
      this.after();
    },
    after() {
      if (this.served >= this.need) {
        const st = this.perfect >= this.need ? 3 : this.perfect >= Math.ceil(this.need * .5) ? 2 : 1, ok = this.good >= Math.ceil(this.need / 2);
        this.done = {t: 1.8, go: () => ok ? G.win(st, `${this.perfect} perfect pizzas!`) : G.end(`Only ${this.good} happy customers`)};
        if (ok) G.party();
      }
    },
    paint(x, y) {
      const lx = x - CX + 150, ly = y - CY + 150, p = this.pz; if (Math.hypot(x - CX, y - CY) > IN + 10) { this.last = null; return; }
      if (this.tool === 'tomato' || this.tool === 'white' || this.tool === 'pesto') {
        if (p.sauce && p.sauce !== this.tool) { this.sauceL.getContext('2d').clearRect(0, 0, 300, 300); p.sc = 0; }
        p.sauce = this.tool; const c = this.sauceL.getContext('2d'); c.save(); c.beginPath(); c.arc(150, 150, IN - 4, 0, Math.PI * 2); c.clip();
        c.strokeStyle = SAUCES[this.tool]; c.fillStyle = SAUCES[this.tool]; c.lineWidth = 46; c.lineCap = 'round'; c.beginPath(); c.moveTo(...(this.last || [lx, ly])); c.lineTo(lx, ly); c.stroke(); c.restore();
        if (Math.random() < .3) G.note(180 + Math.random() * 60, .04, {type: 'sine', vol: .05});
      }
      if (this.tool === 'cheese') {
        const c = this.cheeseL.getContext('2d'); c.save(); c.beginPath(); c.arc(150, 150, IN - 2, 0, Math.PI * 2); c.clip(); c.lineCap = 'round';
        for (let i = 0; i < 9; i++) { const a = Math.random() * 6.28, r = Math.random() * 28, sx = lx + Math.cos(a) * r, sy = ly + Math.sin(a) * r, b = Math.random() * 6.28;
          c.strokeStyle = Math.random() < .5 ? '#ffe680' : '#fff2b0'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(b) * 9, sy + Math.sin(b) * 9); c.stroke(); }
        c.restore();
      }
      this.last = [lx, ly];
    },
    pointer(type, x, y) {
      if (this.done || !this.cust || this.cust.leave) return;
      const p = this.pz, painting = this.tool && !TOPS.includes(this.tool);
      if (type === 'move' && G.pointer.down && painting && !p.bake && !this.oven) { this.paint(x, y); return; }
      if (type === 'up') { if (this.last !== null || painting) { p.sc = cover(this.sauceL); p.cc = cover(this.cheeseL); } this.last = null; return; }
      if (type !== 'down') return;
      if (this.oven) { if (y > 440 || Math.hypot(x - CX, y - CY) < 200) this.takeOut(); return; }
      // right panel
      Object.keys(SAUCES).forEach((s, i) => { const bx = RIGHT + 8 + i * 62; if (x > bx && x < bx + 54 && y > 40 && y < 94) { if (G.level < [1, 4, 8][i]) return G.sfx('hit', .3); this.tool = s; G.sfx('click', .4); } });
      if (x > RIGHT && x < RIGHT + 184 && y > 102 && y < 142) { this.tool = 'cheese'; G.sfx('click', .4); }
      TOPS.forEach((t, i) => { const b = topBtn(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) { if (G.level < TOP_LV[i]) return G.sfx('hit', .3); this.tool = t; G.sfx('click', .4); } });
      if (x > RIGHT && x < RIGHT + 184 && y > 380 && y < 432) { if (!p.bake) { this.oven = {p: 0, dur: Math.max(2.2, 4.2 - G.level * .07)}; this.tool = null; G.sfx('power', .4); } }
      if (y > 452 && y < 530) {
        if (x > 250 && x < 400) { if (p.bake) { p.cuts = p.cuts >= 4 ? 1 : p.cuts + 1; G.sfx('swing', .5); } else G.popText(this.parts, 325, 440, 'Bake it first!', '#ff8a8a', 16); }
        if (x > 420 && x < 600) this.serve();
        if (x > 620 && x < 780) { this.fresh(); G.sfx('splash', .3); }
      }
      if (Math.hypot(x - CX, y - CY) < IN && !p.bake) {
        if (TOPS.includes(this.tool)) { if (p.tops.length < 40) { p.tops.push({k: this.tool, x: x - CX, y: y - CY, r: Math.random() * 6.28}); G.sfx('step', .4); } }
        else if (painting) { this.last = null; this.paint(x, y); }
      }
    },
    takeOut() {
      const o = this.oven, n = G.level, g0 = .45, g1 = g0 + Math.max(.1, .26 - n * .005);
      this.pz.bake = o.p < g0 ? 'raw' : o.p <= g1 ? 'perfect' : 'burnt'; this.oven = null;
      G.sfx(this.pz.bake === 'perfect' ? 'coin' : 'hit', .5);
      G.popText(this.parts, CX, CY - 60, this.pz.bake === 'perfect' ? 'Golden!' : this.pz.bake === 'burnt' ? 'Burnt!' : 'Too pale!', this.pz.bake === 'perfect' ? '#ffd84a' : '#ff8a8a', 26);
    },
    key(k) { if ((k === ' ' || k === 'Enter') && this.oven) this.takeOut(); else if (k === 'Enter') this.serve(); },
    update(dt) {
      this.t += dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.oven) { this.oven.p += dt / this.oven.dur; if (this.oven.p >= 1.08) { this.oven.p = 1.08; this.takeOut(); } }
      const c = this.cust;
      if (!c) { if ((this.next -= dt) <= 0) this.newCustomer(); return; }
      if (c.leave) { c.leave -= dt; c.x -= 260 * dt * (c.leave < 1 ? 1 : 0); if (c.leave <= 0) { this.cust = null; this.next = .6; } return; }
      c.x = Math.min(120, c.x + 420 * dt);
      if ((c.pat -= dt) <= 0) { this.served++; c.leave = 1.4; c.mood = -1; c.say = 'Too slow! Bye!'; G.sfx('lose', .4); this.after(); }
    },
    drawPizza(ctx, x, y, s) {
      const p = this.pz; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (p.bake === 'perfect') ctx.filter = 'saturate(1.25) brightness(.97)'; if (p.bake === 'burnt') ctx.filter = 'brightness(.42) sepia(.5)';
      G.circle(0, 6, R, 'rgba(0,0,0,.18)'); G.circle(0, 0, R, p.bake === 'perfect' ? '#d89a4a' : '#e8c088'); G.circle(0, 0, R - 8, p.bake === 'perfect' ? '#e8b060' : '#f0cc94'); G.circle(0, 0, IN, '#f6dcaa');
      ctx.drawImage(this.sauceL, -150, -150); ctx.drawImage(this.cheeseL, -150, -150);
      if (p.bake === 'perfect' && p.cc > .2) { const Rr = G.seeded(9); for (let i = 0; i < 16; i++) { const a = Rr() * 6.28, r = Rr() * 110; G.circle(Math.cos(a) * r, Math.sin(a) * r, 4 + Rr() * 5, 'rgba(200,120,40,.45)'); } }
      for (const t of p.tops) { const img = G.img(`img/topping_${t.k}.png`); if (!img.complete || !img.naturalWidth) continue; const sz = t.k === 'olive' || t.k === 'pineapple' ? 30 : 40; ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.r); ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore(); }
      ctx.filter = 'none';
      if (p.cuts) { ctx.strokeStyle = 'rgba(90,50,20,.55)'; ctx.lineWidth = 3; for (let i = 0; i < p.cuts; i++) { const a = i * Math.PI / p.cuts + .3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(-Math.cos(a) * R, -Math.sin(a) * R); ctx.stroke(); } }
      ctx.restore();
    },
    drawTicket(ctx, o) {
      G.rr(18, 18, 214, 190, 12, '#fffdf4'); ctx.fillStyle = '#e84a4a'; ctx.fillRect(18, 18, 214, 8);
      G.text('ORDER', 125, 48, {size: 15, align: 'center', weight: 800, color: '#c43a3a'});
      G.circle(42, 72, 12, SAUCES[o.sauce]); ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(42, 72, 12, 0, 7); ctx.stroke(); G.text(`${o.sauce} sauce`, 62, 78, {size: 14, weight: 800, color: '#5a3a2a'});
      G.text(o.cheese ? '🧀 cheese' : '🚫 no cheese', 30, 104, {size: 14, weight: 800, color: o.cheese ? '#5a3a2a' : '#c43a3a'});
      Object.entries(o.tops).forEach(([k, v], i) => { const img = G.img(`img/topping_${k}.png`), y = 118 + i * 28; if (img.complete) ctx.drawImage(img, 28, y, 26, 26); G.text(`× ${v}  ${k}`, 60, y + 19, {size: 14, weight: 800, color: '#5a3a2a'}); });
      if (o.slices) G.text(`✂ ${o.slices} slices`, 150, 104, {size: 14, weight: 800, color: '#5a3a2a'});
    },
    draw(ctx, dt) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff0dc'); g.addColorStop(1, '#ffd9b0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(232,74,74,.12)'; for (let y = 0; y < 440; y += 40) for (let x = (y / 40) % 2 * 40; x < W; x += 80) ctx.fillRect(x, y, 40, 40);
      G.rr(250, 120, 330, 330, 30, '#b8844a'); G.rr(256, 126, 318, 318, 26, '#c8945a');
      const c = this.cust, p = this.pz;
      if (c) {
        const img = G.img(`img/mon_${c.mon}.png`), bob = Math.sin(this.t * 3) * 4; if (img.complete) ctx.drawImage(img, c.x - 100, 230 + bob, 200, 200);
        if (!c.leave) { this.drawTicket(ctx, c.order); G.bar({x: 40, y: 420, w: 170, h: 12, v: c.pat, max: this.patMax, color: c.pat < 15 ? '#ff5b5b' : '#5ec76b'}); }
        else { G.rr(c.x - 90, 190, 180, 44, 16, '#fff'); G.text(c.say, c.x, 218, {size: 14, align: 'center', weight: 800, color: c.mood === 2 ? '#e8508a' : c.mood === 1 ? '#5a8a3a' : '#c43a3a'}); }
      }
      if (this.oven) {
        G.rr(250, 110, 330, 330, 30, '#8a4a3a'); for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) G.rr(256 + x * 54 + (y % 2) * 27 - 10, 116 + y * 40, 50, 36, 4, ['#a85a42', '#9a4e3a'][(x + y) % 2]);
        ctx.fillStyle = '#1a0a08'; ctx.beginPath(); ctx.arc(CX, 330, 130, Math.PI, 0); ctx.lineTo(CX + 130, 400); ctx.lineTo(CX - 130, 400); ctx.fill();
        for (let i = 0; i < 7; i++) { const fx = CX - 110 + i * 36, fh = 30 + Math.sin(this.t * 10 + i * 2) * 12; ctx.fillStyle = i % 2 ? '#ff9a2a' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(fx - 14, 400); ctx.quadraticCurveTo(fx, 400 - fh * 2, fx + 14, 400); ctx.fill(); }
        this.pz.bake = this.oven.p < .45 ? null : this.oven.p < .45 + Math.max(.1, .26 - G.level * .005) ? 'perfect' : 'burnt'; this.drawPizza(ctx, CX, 330, .5); this.pz.bake = null;
        const n = G.level, g0 = .45, g1 = g0 + Math.max(.1, .26 - n * .005), mx = 270, mw = 290;
        G.rr(mx, 452, mw, 30, 10, '#f4e4c8'); G.rr(mx + mw * g0, 452, mw * (g1 - g0), 30, 0, '#5ec76b'); G.rr(mx + mw * g1, 452, mw * (1 - g1), 30, 0, '#5a3a2a');
        G.text('raw', mx + 30, 472, {size: 12, align: 'center', weight: 800, color: '#a08060'}); G.text('burnt', mx + mw - 30, 472, {size: 12, align: 'center', weight: 800, color: '#fff'});
        const nx = mx + mw * Math.min(1, this.oven.p); ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(nx, 446); ctx.lineTo(nx - 8, 436); ctx.lineTo(nx + 8, 436); ctx.fill(); ctx.fillRect(nx - 2, 446, 4, 40);
        G.text('Click or press SPACE when the needle is in the green!', CX, 508, {size: 15, align: 'center', weight: 800, color: '#7a3a2a'});
      } else this.drawPizza(ctx, CX, CY, 1);
      if (p.bake === 'burnt' && !this.oven) for (let i = 0; i < 3; i++) { const q = (this.t * .6 + i / 3) % 1; G.circle(CX - 40 + i * 40, CY - 80 - q * 90, 14 + q * 20, `rgba(80,80,80,${.4 * (1 - q)})`); }
      // tool panel
      G.rr(RIGHT - 8, 10, 200, 430, 16, 'rgba(255,255,255,.55)');
      G.text('SAUCE', RIGHT, 32, {size: 12, weight: 800, color: '#7a3a2a'});
      Object.entries(SAUCES).forEach(([s, col], i) => { const bx = RIGHT + 8 + i * 62, lock = G.level < [1, 4, 8][i]; G.rr(bx, 40, 54, 54, 14, this.tool === s ? '#ffcf5c' : '#fff'); G.circle(bx + 27, 63, 18, lock ? '#ccc' : col); G.text(lock ? '🔒' : s, bx + 27, lock ? 70 : 90, {size: lock ? 16 : 10, align: 'center', weight: 800, color: '#7a3a2a'}); });
      G.rr(RIGHT, 102, 184, 40, 12, this.tool === 'cheese' ? '#ffcf5c' : '#fff3c0'); G.text('🧀 Cheese', RIGHT + 92, 128, {size: 16, align: 'center', weight: 800, color: '#7a5a1a'});
      TOPS.forEach((t, i) => { const b = topBtn(i), lock = G.level < TOP_LV[i], img = G.img(`img/topping_${t}.png`); G.rr(b.x, b.y, b.w, b.h, 12, this.tool === t ? '#ffcf5c' : lock ? '#e0d4c4' : '#fff');
        if (!lock && img.complete) for (let k = 0; k < 3; k++) ctx.drawImage(img, b.x + 14 + k * 16, b.y + 6 + (k % 2) * 8, 34, 34);
        G.text(lock ? `🔒 Day ${TOP_LV[i]}` : t, b.x + b.w / 2, b.y + 60, {size: 11, align: 'center', weight: 800, color: '#7a3a2a'}); });
      G.rr(RIGHT, 380, 184, 52, 14, p.bake ? '#c8b8a8' : '#e8642a'); G.text(p.bake ? 'Baked' : '🔥 Bake', RIGHT + 92, 413, {size: 20, align: 'center', weight: 800, color: '#fff'});
      // bottom bar
      G.rr(0, 444, W, H - 444, 0, '#7a3a2a');
      if (!this.oven) {
        G.text(`Day ${G.level}`, 30, 478, {size: 18, weight: 800, color: '#ffcf5c'}); G.text(`Pizza ${Math.min(this.need, this.served + 1)}/${this.need}`, 30, 506, {size: 15, weight: 800, color: '#fff'});
        G.rr(250, 452, 150, 78, 14, p.bake ? '#c87a3a' : '#9a6a4a'); G.text('🔪 Slice', 325, 488, {size: 18, align: 'center', weight: 800, color: '#fff'}); G.text(`${p.cuts * 2 || 'no'} slices`, 325, 512, {size: 12, align: 'center', weight: 800, color: '#ffe0c0'});
        G.rr(420, 452, 180, 78, 14, '#3fc060'); G.text('Serve!', 510, 500, {size: 24, align: 'center', weight: 800, color: '#fff'});
        G.rr(620, 452, 160, 78, 14, '#9a4a4a'); G.text('Start over', 700, 498, {size: 16, align: 'center', weight: 800, color: '#fff'});
        if (this.tool && !p.bake) { const hint = TOPS.includes(this.tool) ? `Click the pizza to add ${this.tool}` : this.tool === 'cheese' ? 'Drag on the pizza to sprinkle cheese' : 'Drag on the pizza to spread the sauce'; G.text(hint, CX, 112, {size: 14, align: 'center', weight: 800, color: '#7a3a2a'}); }
        else if (!this.tool && !p.bake && c && !c.leave) G.text('Pick a sauce to start →', CX, 112, {size: 14, align: 'center', weight: 800, color: '#7a3a2a'});
      }
      G.fx(this.parts, dt);
    }
  });
})();

(() => {
  // Bake the cake each customer asks for: layers, frosting, toppings and candles. Customers are the Blender creatures.
  const W = 800, H = 540;
  const FROST = {pink: '#ff9fc8', choc: '#7a4a2a', mint: '#8ae8c0', lemon: '#ffe27a', berry: '#b07bff', vanilla: '#fff6e0'};
  const TOPS = ['sprinkles', 'cherries', 'stars', 'berries', 'drizzle'];
  const MONS = ['sproutle', 'puddlet', 'emberpup', 'bloomoth', 'pebblor', 'voltle', 'frostling', 'gloomp'];

  GameBox.register({
    id: 'cake', title: 'Cake Maker', genre: 'Casual', kind: 'Cake decorating', w: W, h: H, levels: 30, assets: MONS.map(m => `img/mon_${m}.png`), thumb: 'jpg', cursor: 'pointer',
    hint: 'Look at the order card, then build the same cake: layers, frosting, topping and candles. Press SERVE!',
    desc: 'A bakery full of hungry little monsters. Each one shows you the cake they want on an order card. Stack the layers, pick the frosting colour, add the right topping and the right number of candles, then serve it with a smile. Get it exactly right for a big tip. Thirty days of busier and busier customers.',
    controls: [['Click the buttons', 'Build the cake'], ['Enter', 'Serve']],
    info() { return `Day ${G.level} · Served ${this.served}/${this.need} · ${Math.ceil(this.time)}s`; },
    init() { this.need = Math.min(8, 3 + Math.floor(G.level / 5)); this.served = 0; this.perfect = 0; this.time = 50 + this.need * 14 - Math.min(30, G.level); this.t = 0; this.done = null; this.parts = []; this.newOrder(); },
    newOrder() {
      const n = G.level, R = Math.random;
      const kinds = Object.keys(FROST).slice(0, Math.min(6, 3 + Math.floor(n / 4)));
      this.order = {layers: 1 + Math.floor(R() * Math.min(3, 1 + n / 6)), frost: kinds[Math.floor(R() * kinds.length)], top: TOPS[Math.floor(R() * Math.min(5, 2 + n / 5))], candles: Math.floor(R() * Math.min(6, 1 + n / 3)), mon: MONS[Math.floor(R() * MONS.length)]};
      this.cake = {layers: 1, frost: null, top: null, candles: 0}; this.mood = 0; this.walk = 1;
    },
    serve() {
      if (this.done || this.walk > 0) return; const o = this.order, c = this.cake;
      const right = [o.layers === c.layers, o.frost === c.frost, o.top === c.top, o.candles === c.candles].filter(Boolean).length;
      this.served++; G.score += right * 50 + (right === 4 ? 150 : 0); if (right === 4) this.perfect++;
      this.mood = right === 4 ? 2 : right >= 2 ? 1 : -1; G.sfx(right === 4 ? 'win' : right >= 2 ? 'coin' : 'lose', .6);
      if (right === 4) for (let i = 0; i < 20; i++) this.parts.push({x: 400, y: 280, vx: (Math.random() - .5) * 300, vy: -Math.random() * 300, life: .8, color: G.pick(['#ff9fc8', '#ffe27a', '#8ae8c0', '#b07bff'])});
      this.leave = 1.2;
      if (this.served >= this.need) { const st = this.perfect >= this.need ? 3 : this.perfect >= this.need * .6 ? 2 : 1; G.party(); this.done = {t: 1.4, go: () => G.win(st, `${this.perfect} perfect cakes!`)}; }
    },
    buttons() {
      const b = []; const add = (label, x, y, w, go, c) => b.push({label, x, y, w, go, c});
      add('− layer', 470, 120, 100, () => { this.cake.layers = Math.max(1, this.cake.layers - 1); }, '#7a6a9a'); add('+ layer', 580, 120, 100, () => { this.cake.layers = Math.min(3, this.cake.layers + 1); }, '#7a6a9a');
      Object.entries(FROST).forEach(([k, col], i) => add('', 470 + (i % 3) * 72, 178 + Math.floor(i / 3) * 46, 64, () => { this.cake.frost = k; }, col));
      TOPS.forEach((t, i) => add(t, 470 + (i % 3) * 100, 290 + Math.floor(i / 3) * 44, 92, () => { this.cake.top = t; }, '#e88a5a'));
      add('− candle', 470, 384, 120, () => { this.cake.candles = Math.max(0, this.cake.candles - 1); }, '#c8a43a'); add('+ candle', 600, 384, 120, () => { this.cake.candles = Math.min(6, this.cake.candles + 1); }, '#c8a43a');
      add('SERVE!', 520, 450, 180, () => this.serve(), '#3fc060');
      return b;
    },
    pointer(type, x, y) { if (type !== 'down' || this.leave > 0) return; for (const b of this.buttons()) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + 38) { b.go(); G.sfx('click', .4); } },
    key(k) { if (k === 'Enter') this.serve(); },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.walk = Math.max(0, this.walk - dt * 2);
      if (this.leave > 0 && (this.leave -= dt) <= 0) this.newOrder();
      if ((this.time -= dt) <= 0) this.done = {t: .5, go: () => this.served >= Math.ceil(this.need / 2) ? G.win(1, 'Closing time!') : G.end('The bakery closed early')};
    },
    drawCake(ctx, c, cx, base, s) {
      const lw = 150 * s, lh = 46 * s; ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.ellipse(cx, base + 6 * s, lw * .75, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
      const frost = c.frost ? FROST[c.frost] : '#f4e4c8';
      for (let i = 0; i < c.layers; i++) {
        const w = lw * (1 - i * .18), y = base - (i + 1) * lh;
        G.rr(cx - w / 2, y, w, lh, 10 * s, i % 2 ? '#e8b878' : '#d8a060'); G.rr(cx - w / 2, y, w, lh * .32, 10 * s, frost);
        if (c.frost) for (let d = 0; d < 6; d++) { const dx = cx - w / 2 + 10 * s + d * (w - 20 * s) / 5; G.rr(dx - 5 * s, y + lh * .2, 10 * s, (8 + (d % 3) * 7) * s, 5 * s, frost); }
      }
      const topY = base - c.layers * lh, tw = lw * (1 - (c.layers - 1) * .18);
      const R = G.seeded(7);
      if (c.top === 'sprinkles') for (let i = 0; i < 26; i++) { ctx.fillStyle = ['#ff4b4b', '#4aa8ff', '#ffd84a', '#5ee66b', '#ff7bd0'][i % 5]; ctx.save(); ctx.translate(cx - tw / 2 + 10 * s + R() * (tw - 20 * s), topY + 3 * s + R() * 9 * s); ctx.rotate(R() * 3); ctx.fillRect(-4 * s, -1.2 * s, 8 * s, 2.4 * s); ctx.restore(); }
      if (c.top === 'cherries') for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * 32 * s; G.circle(x, topY - 4 * s, 9 * s, '#d81a3a'); G.circle(x - 3 * s, topY - 7 * s, 3 * s, 'rgba(255,255,255,.6)'); }
      if (c.top === 'stars') for (let i = 0; i < 4; i++) G.star(cx + (i - 1.5) * 28 * s, topY - 2 * s, 9 * s, '#ffd84a');
      if (c.top === 'berries') for (let i = 0; i < 7; i++) G.circle(cx + (i - 3) * 16 * s, topY + (i % 2) * 4 * s, 6 * s, i % 2 ? '#4a3aa8' : '#7a5ae8');
      if (c.top === 'drizzle') { ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 4 * s; ctx.beginPath(); for (let i = 0; i <= 10; i++) { const x = cx - tw / 2 + 8 * s + i * (tw - 16 * s) / 10; ctx.lineTo(x, topY + (i % 2 ? 10 : 2) * s); } ctx.stroke(); }
      for (let i = 0; i < c.candles; i++) { const x = cx + (i - (c.candles - 1) / 2) * 18 * s; G.rr(x - 3 * s, topY - 30 * s, 6 * s, 26 * s, 2 * s, ['#4aa8ff', '#ff7bd0', '#5ee66b'][i % 3]); ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.ellipse(x, topY - 36 * s + Math.sin(this.t * 10 + i), 3.5 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe8f0'); g.addColorStop(1, '#ffd6e0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, 260);
      G.rr(0, 360, 450, 180, 0, '#c8946a'); G.rr(0, 352, 450, 14, 4, '#e8b88a');
      // customer and their order card
      const o = this.order, mon = G.img(`img/mon_${o.mon}.png`), mx = 120 - this.walk * 200 + (this.leave > 0 ? (1.2 - this.leave) * 300 : 0), bob = Math.sin(this.t * 3) * 4;
      if (mon.complete) ctx.drawImage(mon, mx - 90, 150 + bob, 180, 180);
      if (this.leave > 0) G.text(this.mood === 2 ? '♥ PERFECT!' : this.mood === 1 ? 'Thanks!' : 'Hmm…', mx, 140, {size: 22, align: 'center', display: true, color: this.mood === 2 ? '#ff4b8b' : '#7a4a5a'});
      G.rr(230, 26, 210, 150, 14, '#ffffff'); G.text('ORDER', 335, 50, {size: 13, align: 'center', weight: 800, color: '#c44a6a'}); this.drawCake(ctx, o, 335, 160, .55);
      G.text(`${o.layers} layer${o.layers > 1 ? 's' : ''} · ${o.top} · ${o.candles} candle${o.candles === 1 ? '' : 's'}`, 335, 70, {size: 11, align: 'center', weight: 700, color: '#7a5a6a'});
      this.drawCake(ctx, this.cake, 300, 440, 1);
      for (const b of this.buttons()) { G.rr(b.x, b.y, b.w, 38, 10, b.c); G.text(b.label, b.x + b.w / 2, b.y + 25, {size: 13, align: 'center', weight: 800, color: b.label ? '#fff' : '#000'}); if (!b.label && this.cake.frost && FROST[this.cake.frost] === b.c) { ctx.strokeStyle = '#3a2a3a'; ctx.lineWidth = 3; ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, 42); } }
      G.text('LAYERS', 470, 112, {size: 11, weight: 800, color: '#7a4a5a'}); G.text('FROSTING', 470, 172, {size: 11, weight: 800, color: '#7a4a5a'}); G.text('TOPPING', 470, 284, {size: 11, weight: 800, color: '#7a4a5a'}); G.text(`CANDLES: ${this.cake.candles}`, 470, 378, {size: 11, weight: 800, color: '#7a4a5a'});
      G.text(`Served ${this.served}/${this.need}`, W - 20, 36, {size: 18, align: 'right', weight: 800, color: '#7a4a5a'}); G.text(`${Math.ceil(Math.max(0, this.time))}s`, W - 20, 62, {size: 16, align: 'right', weight: 800, color: this.time < 15 ? '#e84a5a' : '#7a4a5a'});
      for (const p of this.parts) G.circle(p.x, p.y, 4, p.color);
    }
  });
})();

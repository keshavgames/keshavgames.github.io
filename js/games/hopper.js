(() => {
  // Hop across roads, rivers and rails. Traffic is the Blender karts; the river carries Blender speedboats you can ride.
  const W = 560, H = 700, T = 56, COLS = 10;
  const KARTS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'], BOATS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
  const ASSETS = [...KARTS.map(c => `img/kart_${c}.png`), ...BOATS.map(c => `img/boat_${c}.png`), ...['up', 'down', 'left', 'right'].map(d => `img/kid4_${d}_1.png`)];

  GameBox.register({
    id: 'hopper', title: 'Road Hopper', genre: 'Arcade', kind: 'Cross the road', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg',
    hint: 'Hop forward with Up / W. Dodge the karts, ride the boats over the river, watch for trains!',
    desc: 'Hop forward across busy kart roads, rivers full of speedboats you can ride, and railway lines where trains thunder past after the bell. Every lane you cross scores a point, and coins are worth extra. Reach the flag to finish the level. Thirty levels that get busier and faster, with three hearts per run.',
    controls: [['Up / W / click above', 'Hop forward'], ['Left Right / A D', 'Hop sideways'], ['Down / S', 'Hop back']],
    info() { return `Level ${G.level} · Row ${this.best}/${this.goal}`; },
    init() {
      const n = G.level, R = G.seeded(n * 17 + 3); this.R = R; this.goal = 24 + n * 2; this.rows = [];
      for (let i = 0; i <= this.goal + 12; i++) this.rows.push(this.makeRow(i));
      this.p = {c: 4, r: 0, x: 4 * T + T / 2, hop: 0, dir: 'up', ride: 0}; this.cam = 0; this.best = 0; this.lives = 3; this.t = 0; this.dead = 0; this.coins = 0; this.done = null; this.parts = [];
    },
    makeRow(i) {
      const R = this.R, n = G.level, safe = i === 0 || i % 9 === 0 || i >= this.goal;
      if (safe) return {k: 'grass', trees: i === 0 || i >= this.goal ? [] : [R.int(COLS), R.int(COLS)], coin: R() < .3 ? R.int(COLS) : -1};
      const r = R(), sp = (35 + R() * 40 + n * 2.5) * (R() < .5 ? -1 : 1);
      if (r < .45) { const things = [], gap = 3 + R.int(3); for (let x = R.int(3); x < COLS + 4; x += gap + R.int(2)) things.push({x: x * T, img: `kart_${R.pick(KARTS)}`, w: T * (R() < .2 ? 1.6 : 1.1)}); return {k: 'road', sp, things}; }
      if (r < .75 && n > 2) { const things = [], gap = 2 + R.int(2); for (let x = R.int(2); x < COLS + 4; x += gap + 2) things.push({x: x * T, img: `boat_${R.pick(BOATS)}`, w: T * (2 + R() * .9)}); return {k: 'river', sp: sp * .6, things}; }
      if (r < .87 && n > 2) return {k: 'rail', train: -9999, warn: 0, next: 2 + R() * 4, sp: Math.sign(sp) * (700 + n * 10)};
      return {k: 'grass', trees: [R.int(COLS), R.int(COLS), R.int(COLS)].filter(() => R() < .7), coin: R() < .4 ? R.int(COLS) : -1};
    },
    hop(dc, dr, dir) {
      if (this.dead > 0 || this.done || this.p.hop > 0) return;
      const nc = this.p.c + dc, nr = this.p.r + dr, row = this.rows[nr];
      if (nc < 0 || nc >= COLS || nr < 0 || !row) return;
      if (row.k === 'grass' && row.trees.includes(nc)) { this.p.dir = dir; return; }
      this.p.c = nc; this.p.r = nr; this.p.x = nc * T + T / 2; this.p.dir = dir; this.p.hop = .12; G.sfx('jump', .4);
      if (nr > this.best) { this.best = nr; G.score += 10; }
      if (row.k === 'grass' && row.coin === nc) { row.coin = -1; this.coins++; G.score += 50; G.sfx('coin'); }
      if (nr >= this.goal) { G.party(); G.score += 500 + G.level * 40; this.done = {t: 1, go: () => G.win(this.lives === 3 ? 3 : this.lives === 2 ? 2 : 1, 'Made it across!')}; }
    },
    key(k) { const m = {arrowup: [0, 1, 'up'], w: [0, 1, 'up'], arrowdown: [0, -1, 'down'], s: [0, -1, 'down'], arrowleft: [-1, 0, 'left'], a: [-1, 0, 'left'], arrowright: [1, 0, 'right'], d: [1, 0, 'right']}[k.toLowerCase()]; if (m) this.hop(...m); },
    pointer(type, x, y) { if (type !== 'down') return; const py = H - 150; if (y < py - 30) this.hop(0, 1, 'up'); else if (y > py + 40) this.hop(0, -1, 'down'); else this.hop(x < this.p.x ? -1 : 1, 0, x < this.p.x ? 'left' : 'right'); },
    die(why) { if (this.dead > 0) return; this.dead = 1.1; this.lives--; G.sfx(why === 'splash' ? 'splash' : 'hurt'); G.shake(8, .3); this.why = why; for (let i = 0; i < 16; i++) this.parts.push({x: this.p.x, y: this.screenY(this.p.r), vx: (Math.random() - .5) * 220, vy: (Math.random() - .5) * 220, life: .6, color: why === 'splash' ? '#9fd8ff' : '#ffcf5c'}); },
    screenY(r) { return H - 150 - (r - this.cam) * T; },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.p.hop -= dt; this.cam += (Math.max(0, this.p.r - 2) - this.cam) * Math.min(1, dt * 8);
      for (const row of this.rows) {
        if (row.things) for (const th of row.things) { th.x += row.sp * dt; const span = (COLS + 4) * T; if (row.sp > 0 && th.x > COLS * T + T * 2) th.x -= span; if (row.sp < 0 && th.x < -T * 2 - th.w) th.x += span; }
        if (row.k === 'rail') { row.next -= dt; if (row.next < 1.2 && row.next > 0 && !row.warn) { row.warn = 1; } if (row.next <= 0) { row.train = row.sp > 0 ? -800 : COLS * T + 100; row.next = 4 + Math.random() * 4; row.warn = 0; } if (row.train > -9000) row.train += row.sp * dt; }
      }
      if (this.dead > 0) { if ((this.dead -= dt) <= 0) { if (this.lives <= 0) { this.done = {t: .2, go: () => G.end(`Row ${this.best}: out of hearts`)}; return; } let r = this.p.r; while (r > 0 && this.rows[r].k !== 'grass') r--; this.p.r = r; this.p.c = 4; while (this.rows[r].trees?.includes(this.p.c)) this.p.c++; this.p.x = this.p.c * T + T / 2; this.p.ride = 0; } return; }
      const row = this.rows[this.p.r], px = this.p.x;
      if (row.k === 'road') for (const th of row.things) if (px > th.x + 6 && px < th.x + th.w - 6) return this.die('car');
      if (row.k === 'river' && this.p.hop <= 0) {
        const on = row.things.find(th => px > th.x + 4 && px < th.x + th.w - 4);
        if (!on) return this.die('splash');
        this.p.x += row.sp * dt; this.p.c = Math.round((this.p.x - T / 2) / T);
        if (this.p.x < 0 || this.p.x > COLS * T) return this.die('splash');
      }
      if (row.k === 'rail' && row.train > -9000 && px > row.train && px < row.train + 700) return this.die('train');
      if (this.p.r < this.cam - 1.5) return this.die('car');
    },
    draw(ctx, dt) {
      G.clear('#5aa04a');
      for (let r = Math.floor(this.cam) - 2; r < this.cam + 14; r++) {
        const row = this.rows[r]; if (!row) continue; const y = this.screenY(r) - T / 2;
        if (row.k === 'grass') { ctx.fillStyle = r % 2 ? '#7ccd5a' : '#74c454'; ctx.fillRect(0, y, W, T); for (const c of row.trees) { G.circle(c * T + T / 2 + 3, y + T / 2 + 4, 20, 'rgba(0,0,0,.18)'); G.circle(c * T + T / 2, y + T / 2, 20, '#2f7a34'); G.circle(c * T + T / 2 - 6, y + T / 2 - 6, 9, '#4a9a46'); } if (row.coin >= 0) { G.circle(row.coin * T + T / 2, y + T / 2 + Math.sin(this.t * 4) * 3, 11, '#ffcf5c'); G.circle(row.coin * T + T / 2 - 3, y + T / 2 - 3, 4, '#fff6c0'); } if (r === this.goal) { ctx.fillStyle = '#ddd'; ctx.fillRect(W / 2 - 2, y - 40, 4, 60); ctx.fillStyle = '#ff4b4b'; ctx.fillRect(W / 2 + 2, y - 40, 34, 22); } }
        if (row.k === 'road') { ctx.fillStyle = '#4a4e58'; ctx.fillRect(0, y, W, T); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let x = 0; x < W; x += 50) ctx.fillRect(x, y + T / 2 - 2, 26, 4); }
        if (row.k === 'river') { ctx.fillStyle = '#3a8ad8'; ctx.fillRect(0, y, W, T); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; for (let x = (this.t * row.sp * .3) % 60 - 60; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.quadraticCurveTo(x + 12, y + 14, x + 24, y + 20); ctx.stroke(); } }
        if (row.k === 'rail') { ctx.fillStyle = '#8a7a6a'; ctx.fillRect(0, y, W, T); ctx.fillStyle = '#5a4a3a'; for (let x = 0; x < W; x += 24) ctx.fillRect(x, y + 8, 10, T - 16); ctx.fillStyle = '#c8ccd8'; ctx.fillRect(0, y + 16, W, 4); ctx.fillRect(0, y + T - 20, W, 4);
          if (row.warn && Math.floor(this.t * 6) % 2) { G.circle(20, y + T / 2, 9, '#ff3b3b'); G.circle(W - 20, y + T / 2, 9, '#ff3b3b'); }
          if (row.train > -9000) { for (let k = 0; k < 4; k++) { G.rr(row.train + k * 172, y + 4, 166, T - 8, 10, k === 0 ? '#e84a4a' : '#5a6a8a'); G.rr(row.train + k * 172 + 10, y + 10, 146, 12, 4, 'rgba(255,255,255,.35)'); } } }
        if (row.things) for (const th of row.things) { const img = G.img(`img/${th.img}.png`); if (!img.complete) continue; ctx.save(); ctx.translate(th.x + th.w / 2, y + T / 2); if (row.sp < 0) ctx.scale(-1, 1); ctx.drawImage(img, -th.w * .62, -th.w * .62, th.w * 1.24, th.w * 1.24); ctx.restore(); }
      }
      if (this.dead <= 0 || Math.floor(this.t * 10) % 2) { const y = this.screenY(this.p.r) - (this.p.hop > 0 ? Math.sin(this.p.hop / .12 * Math.PI) * 14 : 0), img = G.img(`img/kid4_${this.p.dir}_1.png`); if (img.complete) ctx.drawImage(img, this.p.x - 40, y - 62, 80, 80); }
      for (const p of this.parts) G.circle(p.x, p.y, 3, p.color);
      G.panel(10, 10, W - 20, 40, 12, 'rgba(0,0,0,.35)');
      for (let i = 0; i < 3; i++) G.text('♥', 24 + i * 24, 38, {size: 22, color: i < this.lives ? '#ff5b6b' : 'rgba(255,255,255,.2)'});
      G.text(`${this.best} / ${this.goal}`, W / 2, 37, {size: 18, align: 'center', weight: 800, color: '#fff'}); G.text(`● ${this.coins}`, W - 24, 37, {size: 16, align: 'right', weight: 800, color: '#ffcf5c'});
    }
  });
})();

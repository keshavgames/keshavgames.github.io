(() => {
  const W = 640, H = 520, T = 40, COLS = 16, ROWS = 11, PANEL = 440;
  const ROUTE = [[-1, 1], [4, 1], [4, 6], [1, 6], [1, 9], [8, 9], [8, 3], [12, 3], [12, 8], [16, 8]];
  const TOWERS = {
    arrow: {name: 'Arrow', cost: 50, range: 110, rate: .55, dmg: 12, color: '#c9a26b'},
    frost: {name: 'Frost', cost: 80, range: 85, rate: 1.1, dmg: 5, color: '#5cb8ff'},
    cannon: {name: 'Cannon', cost: 120, range: 125, rate: 1.6, dmg: 42, color: '#8a8f9e'},
    laser: {name: 'Laser', cost: 200, range: 150, rate: .1, dmg: 6, color: '#ff6b8b'}
  };
  const KINDS = Object.keys(TOWERS);
  const FOES = {
    runner: {hp: 30, speed: 72, gold: 5, color: '#ffcf5c', r: 9},
    grunt: {hp: 60, speed: 46, gold: 7, color: '#7fbf4a', r: 11},
    tank: {hp: 230, speed: 28, gold: 20, color: '#8b7bff', r: 15},
    boss: {hp: 1300, speed: 22, gold: 120, color: '#e04e5f', r: 20}
  };
  const pts = ROUTE.map(([x, y]) => [x * T + T / 2, y * T + T / 2]);
  const pathSet = new Set();
  for (let i = 0; i < ROUTE.length - 1; i++) {
    let [x, y] = ROUTE[i]; const [tx, ty] = ROUTE[i + 1];
    while (x !== tx || y !== ty) { pathSet.add(x + ',' + y); x += Math.sign(tx - x); y += Math.sign(ty - y); }
    pathSet.add(tx + ',' + ty);
  }
  const segLens = pts.slice(1).map((p, i) => G.dist(p[0], p[1], pts[i][0], pts[i][1]));
  const TOTAL = segLens.reduce((a, b) => a + b, 0);
  const posAt = d => { // point along the route at distance d
    for (let i = 0; i < segLens.length; i++) {
      if (d <= segLens[i]) { const t = d / segLens[i]; return [G.lerp(pts[i][0], pts[i + 1][0], t), G.lerp(pts[i][1], pts[i + 1][1], t)]; }
      d -= segLens[i];
    }
    return pts.at(-1);
  };
  const stat = (t, key) => {
    const base = TOWERS[t.kind][key];
    if (key === 'dmg') return base * Math.pow(1.55, t.lvl - 1);
    if (key === 'range') return base * (1 + .12 * (t.lvl - 1));
    if (key === 'rate') return base * Math.pow(.88, t.lvl - 1);
    return base;
  };

  GameBox.register({
    id: 'td', title: 'Gem Garrison', genre: 'Strategy', kind: 'Tower defense', w: W, h: H, cursor: 'pointer',
    desc: 'Monsters march along the road toward your gem vault. Build arrow towers for steady damage, frost towers to slow, cannons for splash and lasers for raw power. Upgrade and sell between waves. Every fifth wave brings a boss.',
    controls: [['Click a tower button / 1-4', 'Choose a tower to build'], ['Click grass', 'Build there'], ['Click a tower', 'Select it, then Upgrade or Sell'], ['U / Backspace', 'Upgrade / sell the selected tower'], ['Space', 'Send the next wave early (bonus gold)'], ['X', 'Cancel']],
    info() { return `Wave ${this.wave} · Gold ${this.gold}`; },
    init() {
      this.gold = 160; this.lives = 20; this.wave = 0; this.towers = []; this.foes = []; this.shots = []; this.rings = []; this.beams = []; this.parts = [];
      this.build = null; this.sel = null; this.queue = []; this.spawnT = 0; this.breakT = 20;
      this.decor = [];
      for (let i = 0; i < 16; i++) { const x = Math.floor(G.rnd(COLS)), y = Math.floor(G.rnd(ROWS)); if (!pathSet.has(x + ',' + y) && !this.decor.some(d => d.x === x && d.y === y)) this.decor.push({x, y, kind: Math.random() < .6 ? 'tree' : 'rock'}); }
    },
    startWave() {
      if (this.queue.length) return;
      if (this.breakT > 0 && this.wave > 0) { const bonus = Math.floor(this.breakT) * 2; this.gold += bonus; if (bonus) G.popText(this.parts, W - 90, PANEL - 20, `+${bonus} early`, '#ffcf5c'); }
      this.wave++; this.breakT = 0;
      const n = 8 + this.wave * 2, list = [];
      for (let i = 0; i < n; i++) list.push(this.wave >= 4 && i % 4 === 3 ? 'tank' : this.wave >= 2 && i % 3 === 1 ? 'runner' : 'grunt');
      if (this.wave % 5 === 0) list.push('boss');
      this.queue = list; this.spawnT = .5; G.sfx('power');
    },
    free(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && !pathSet.has(x + ',' + y) && !this.towers.some(t => t.x === x && t.y === y) && !this.decor.some(d => d.x === x && d.y === y); },
    upgrade() {
      const t = this.sel; if (!t || t.lvl >= 3) return;
      const cost = Math.round(TOWERS[t.kind].cost * .75 * t.lvl);
      if (this.gold < cost) return G.sfx('hit', .4);
      this.gold -= cost; t.spent += cost; t.lvl++; G.sfx('power'); G.burst(this.parts, t.x * T + 20, t.y * T + 20, '#ffcf5c', 12);
    },
    sell() {
      const t = this.sel; if (!t) return;
      this.gold += Math.round(t.spent * .7); this.towers = this.towers.filter(o => o !== t); this.sel = null; G.sfx('coin');
    },
    key(k) {
      const i = '1234'.indexOf(k);
      if (i >= 0) { this.build = KINDS[i]; this.sel = null; G.sfx('select'); }
      if (k === 'x') { this.build = null; this.sel = null; }
      if (k === ' ') this.startWave();
      if (k === 'u') this.upgrade();
      if (k === 'Backspace' || k === 'Delete') this.sell();
    },
    buttons() {
      const b = KINDS.map((k, i) => ({x: 10 + i * 96, y: PANEL + 10, w: 88, h: 60, act: 'build', kind: k}));
      b.push({x: W - 112, y: PANEL + 10, w: 102, h: 60, act: 'wave'});
      if (this.sel) { b.push({x: 400, y: PANEL + 10, w: 60, h: 28, act: 'up'}, {x: 400, y: PANEL + 42, w: 60, h: 28, act: 'sell'}); }
      return b;
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (y >= PANEL) {
        const b = this.buttons().find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
        if (!b) return;
        if (b.act === 'build') { this.build = this.build === b.kind ? null : b.kind; this.sel = null; G.sfx('select'); }
        if (b.act === 'wave') this.startWave();
        if (b.act === 'up') this.upgrade();
        if (b.act === 'sell') this.sell();
        return;
      }
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      const hit = this.towers.find(t => t.x === tx && t.y === ty);
      if (hit) { this.sel = hit; this.build = null; G.sfx('click'); return; }
      if (this.build) {
        const cost = TOWERS[this.build].cost;
        if (!this.free(tx, ty) || this.gold < cost) return G.sfx('hit', .4);
        this.gold -= cost; this.towers.push({kind: this.build, x: tx, y: ty, lvl: 1, spent: cost, cd: 0, ang: 0, target: null});
        G.sfx('crunch', .5); G.burst(this.parts, tx * T + 20, ty * T + 20, TOWERS[this.build].color, 10);
        if (!G.keys.Shift) this.build = null;
        return;
      }
      this.sel = null;
    },
    update(dt) {
      if (!this.queue.length && !this.foes.length && this.wave > 0 && this.breakT <= 0) { this.breakT = 15; G.score += this.wave * 100; this.gold += 20 + this.wave * 5; G.sfx('win'); }
      if (this.breakT > 0 && !this.queue.length && !this.foes.length) { if ((this.breakT -= dt) <= 0) this.startWave(); }
      if (this.queue.length && (this.spawnT -= dt) <= 0) {
        const kind = this.queue.shift(), F = FOES[kind], w = this.wave - 1, mul = 1 + w * .22 + w * w * .012;
        this.foes.push({kind, d: 0, hp: F.hp * mul, max: F.hp * mul, speed: F.speed, gold: F.gold, color: F.color, r: F.r, slow: 0, x: pts[0][0], y: pts[0][1], flash: 0});
        this.spawnT = kind === 'boss' ? 2 : kind === 'runner' ? .45 : .8;
      }
      for (const f of this.foes) {
        f.slow -= dt; f.flash -= dt;
        f.d += f.speed * (f.slow > 0 ? .5 : 1) * dt;
        [f.x, f.y] = posAt(f.d);
        if (f.d >= TOTAL) {
          f.hp = 0; f.leaked = true; this.lives -= f.kind === 'boss' ? 5 : 1; G.shake(5); G.flash(); G.sfx('hurt');
          if (this.lives <= 0) { this.lives = 0; return G.end('The vault was raided'); }
        }
      }
      for (const t of this.towers) {
        t.cd -= dt;
        const range = stat(t, 'range'), cx = t.x * T + 20, cy = t.y * T + 20;
        const inRange = this.foes.filter(f => f.hp > 0 && G.dist(cx, cy, f.x, f.y) < range + f.r);
        const target = inRange.sort((a, b) => b.d - a.d)[0];
        if (target) t.ang = Math.atan2(target.y - cy, target.x - cx);
        if (!target || t.cd > 0) continue;
        t.cd = stat(t, 'rate');
        const dmg = stat(t, 'dmg');
        if (t.kind === 'arrow') { this.shots.push({x: cx, y: cy, target, dmg, speed: 520, kind: 'arrow'}); G.sfx('shoot', .3); }
        else if (t.kind === 'cannon') { this.shots.push({x: cx, y: cy, sx: cx, sy: cy, tx: target.x, ty: target.y, t: 0, dmg, kind: 'ball'}); G.sfx('boom', .25); }
        else if (t.kind === 'frost') { this.rings.push({x: cx, y: cy, r: 10, max: range}); for (const f of inRange) { this.hit(f, dmg); f.slow = 1.6 + t.lvl * .4; } G.sfx('select', .3); }
        else { this.hit(target, dmg); this.beams.push({x: cx, y: cy, tx: target.x, ty: target.y, t: .08}); }
      }
      for (const s of this.shots) {
        if (s.kind === 'arrow') {
          const tg = s.target, d = G.dist(s.x, s.y, tg.x, tg.y);
          if (tg.hp <= 0) { s.dead = true; continue; }
          if (d < 8) { this.hit(tg, s.dmg); s.dead = true; continue; }
          s.x += (tg.x - s.x) / d * s.speed * dt; s.y += (tg.y - s.y) / d * s.speed * dt;
        } else {
          s.t += dt / .6; s.x = G.lerp(s.sx, s.tx, s.t); s.y = G.lerp(s.sy, s.ty, s.t) - Math.sin(s.t * Math.PI) * 40;
          if (s.t >= 1) {
            s.dead = true; this.rings.push({x: s.tx, y: s.ty, r: 6, max: 50, boom: true}); G.sfx('crunch', .4);
            for (const f of this.foes) if (f.hp > 0 && G.dist(f.x, f.y, s.tx, s.ty) < 50 + f.r) this.hit(f, s.dmg);
          }
        }
      }
      this.shots = this.shots.filter(s => !s.dead);
      for (const r of this.rings) r.r += 240 * dt;
      this.rings = this.rings.filter(r => r.r < r.max);
      for (const b of this.beams) b.t -= dt;
      this.beams = this.beams.filter(b => b.t > 0);
      this.foes = this.foes.filter(f => f.hp > 0);
    },
    hit(f, dmg) {
      if (f.hp <= 0) return;
      f.hp -= dmg; f.flash = .06;
      if (f.hp > 0) return;
      this.gold += f.gold; G.score += f.gold * 10;
      G.burst(this.parts, f.x, f.y, f.color, f.kind === 'boss' ? 40 : 10); G.popText(this.parts, f.x, f.y - 14, `+${f.gold}`, '#ffcf5c', 12);
      if (f.kind === 'boss') { G.shake(10, .5); G.sfx('boom'); }
    },
    draw(ctx, dt) {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const path = pathSet.has(x + ',' + y);
        ctx.fillStyle = path ? '#c9a36b' : (x + y) % 2 ? '#4f9a4a' : '#55a24f';
        ctx.fillRect(x * T, y * T, T, T);
        if (path) { ctx.fillStyle = 'rgba(90,60,30,.18)'; ctx.fillRect(x * T + 8, y * T + 14, 5, 4); ctx.fillRect(x * T + 26, y * T + 26, 4, 3); }
      }
      for (const d of this.decor) {
        const cx = d.x * T + 20, cy = d.y * T + 20;
        if (d.kind === 'tree') { G.circle(cx + 2, cy + 6, 13, 'rgba(0,0,0,.2)'); G.circle(cx, cy, 14, '#2f7a3d'); G.circle(cx - 4, cy - 4, 8, '#3d9a4c'); }
        else { ctx.fillStyle = '#8a8f9e'; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 14, 10, 0, 0, Math.PI * 2); ctx.fill(); G.circle(cx - 3, cy, 5, '#a2a7b5'); }
      }
      const [vx, vy] = pts.at(-2);
      G.rr(W - 26, vy - 22, 26, 44, 6, '#6b4a33'); G.gem(W - 13, vy, 9, '#5ee6c1');
      if (this.sel) { const s = this.sel; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x * T + 20, s.y * T + 20, stat(s, 'range'), 0, Math.PI * 2); ctx.stroke(); }
      for (const t of this.towers) {
        const cx = t.x * T + 20, cy = t.y * T + 20, c = TOWERS[t.kind].color;
        G.rr(t.x * T + 4, t.y * T + 4, 32, 32, 8, '#3a3f5c'); G.circle(cx, cy, 12, c);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.ang);
        if (t.kind === 'cannon') G.rr(0, -5, 18, 10, 3, '#5a5f70'); else if (t.kind === 'laser') G.rr(0, -3, 16, 6, 3, '#ffd0d8'); else if (t.kind === 'arrow') G.rr(0, -2, 15, 4, 2, '#6b4a33'); else G.gem(10, 0, 6, '#e8f6ff');
        ctx.restore();
        for (let i = 0; i < t.lvl; i++) G.circle(t.x * T + 9 + i * 7, t.y * T + 34, 2.5, '#ffcf5c');
      }
      for (const f of this.foes) {
        G.circle(f.x, f.y + 4, f.r, 'rgba(0,0,0,.25)');
        G.circle(f.x, f.y, f.r, f.flash > 0 ? '#ffffff' : f.slow > 0 ? '#9ad7ff' : f.color);
        G.circle(f.x - f.r * .35, f.y - 2, f.r * .18, '#1b1a33'); G.circle(f.x + f.r * .35, f.y - 2, f.r * .18, '#1b1a33');
        G.bar({x: f.x - 14, y: f.y - f.r - 9, w: 28, h: 4, v: f.hp, max: f.max, color: '#e04e5f'});
      }
      for (const s of this.shots) {
        if (s.kind === 'arrow') { ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - 6, s.y - 2); ctx.stroke(); }
        else G.circle(s.x, s.y, 5, '#2b2b30');
      }
      for (const b of this.beams) { ctx.strokeStyle = 'rgba(255,107,139,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke(); }
      for (const r of this.rings) { ctx.strokeStyle = r.boom ? `rgba(255,160,80,${1 - r.r / r.max})` : `rgba(140,210,255,${1 - r.r / r.max})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); }
      if (this.build && G.pointer.y < PANEL) {
        const tx = Math.floor(G.pointer.x / T), ty = Math.floor(G.pointer.y / T), ok = this.free(tx, ty) && this.gold >= TOWERS[this.build].cost;
        ctx.globalAlpha = .5; G.rr(tx * T + 4, ty * T + 4, 32, 32, 8, ok ? '#5ee6c1' : '#ff4b62');
        ctx.strokeStyle = ok ? '#ffffff' : '#ff4b62'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tx * T + 20, ty * T + 20, TOWERS[this.build].range, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
      G.fx(this.parts, dt);
      G.panel(8, 8, 240, 30, 8);
      G.bar({x: 16, y: 15, w: 140, h: 15, v: this.lives, max: 20, color: this.lives < 6 ? '#ff4b62' : '#5ee6c1', label: `VAULT ${this.lives}/20`, id: 'lives'});
      G.text(`◆ ${this.gold}`, 240, 28, {size: 15, align: 'right', weight: 700, color: '#ffcf5c'});
      // build panel
      G.rr(0, PANEL, W, H - PANEL, 0, '#1a1d33');
      for (const b of this.buttons()) {
        if (b.act === 'build') {
          const T0 = TOWERS[b.kind], on = this.build === b.kind, afford = this.gold >= T0.cost;
          G.rr(b.x, b.y, b.w, b.h, 10, on ? '#3b4170' : '#262a48');
          if (on) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 10); ctx.stroke(); }
          G.circle(b.x + 22, b.y + 30, 12, T0.color);
          G.text(T0.name, b.x + 40, b.y + 26, {size: 12, weight: 700});
          G.text(`◆ ${T0.cost}`, b.x + 40, b.y + 44, {size: 12, color: afford ? '#ffcf5c' : '#ff6b8b'});
          G.text(String(KINDS.indexOf(b.kind) + 1), b.x + b.w - 8, b.y + 14, {size: 10, align: 'right', color: '#6b6f99'});
        } else if (b.act === 'wave') {
          const busy = this.queue.length > 0;
          G.rr(b.x, b.y, b.w, b.h, 10, busy ? '#262a48' : '#2f8f5c');
          G.text(busy ? 'Incoming…' : 'Next wave', b.x + b.w / 2, b.y + 28, {size: 13, align: 'center', weight: 700});
          G.text(busy ? `${this.queue.length} left` : this.breakT > 0 ? `auto in ${Math.ceil(this.breakT)}s` : 'Space', b.x + b.w / 2, b.y + 46, {size: 11, align: 'center', color: '#c4c8ee'});
        } else {
          const t = this.sel, max = t.lvl >= 3, cost = Math.round(TOWERS[t.kind].cost * .75 * t.lvl);
          G.rr(b.x, b.y, b.w, b.h, 7, b.act === 'up' ? (max ? '#262a48' : '#3d6fd9') : '#8a3a4a');
          G.text(b.act === 'up' ? (max ? 'MAX' : `Up ${cost}`) : `Sell ${Math.round(t.spent * .7)}`, b.x + b.w / 2, b.y + 18, {size: 11, align: 'center', weight: 700});
        }
      }
      if (this.sel) G.text(`${TOWERS[this.sel.kind].name} Lv${this.sel.lvl} · dmg ${Math.round(stat(this.sel, 'dmg'))}`, 470, PANEL + 76, {size: 10, color: '#9aa0c8'});
    }
  });
})();

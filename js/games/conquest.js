(() => {
  const W = 640, H = 480;
  const OWNER = {'-1': '#8a8f9e', 0: '#3d8bff', 1: '#e04e5f', 2: '#3fbf6a'};
  const NAMES = {0: 'You', 1: 'Crimson Fleet', 2: 'Jade Armada'};

  GameBox.register({
    id: 'conquest', title: 'Isle Conquest', genre: 'Strategy', kind: 'Real-time strategy', w: W, h: H, cursor: 'pointer',
    desc: 'Every island you own trains sailors over time, and bigger islands train faster. Drag from your islands to send fleets to grey neutral or enemy islands; if more sailors land than defend, you take it. Rival admirals expand too. Capture every enemy island to win the level.',
    controls: [['Drag from your island', 'Send a fleet to the island you release on'], ['Click your islands', 'Select several, then click a target'], ['1 2 3', 'Send 25%, 50% or 100% of the sailors'], ['Right-click / X', 'Clear selection']],
    info() { return `Level ${this.level} · Sending ${Math.round(this.share * 100)}%`; },
    init() { this.level = 1; this.share = .5; this.parts = []; this.setup(); },
    setup() {
      const n = 10 + this.level * 2, ais = Math.min(2, this.level);
      this.isles = [];
      for (let tries = 0; this.isles.length < n && tries < 2000; tries++) {
        const r = 16 + G.rnd(20), x = 40 + r + G.rnd(W - 80 - r * 2), y = 50 + r + G.rnd(H - 90 - r * 2);
        if (this.isles.some(o => G.dist(o.x, o.y, x, y) < o.r + r + 46)) continue;
        this.isles.push({x, y, r, owner: -1, troops: Math.round(4 + G.rnd(18) + r * .3), grow: 0, sel: false, seed: G.rnd(100)});
      }
      const corners = [[60, H - 70], [W - 60, 70], [W - 60, H - 70]];
      const claim = (owner, [x, y]) => { const isle = this.isles.filter(i => i.owner === -1).sort((a, b) => G.dist(a.x, a.y, x, y) - G.dist(b.x, b.y, x, y))[0]; isle.owner = owner; isle.troops = 30; isle.r = Math.max(isle.r, 28); };
      claim(0, corners[0]);
      for (let a = 1; a <= ais; a++) claim(a, corners[a]);
      this.fleets = []; this.drag = null; this.aiT = [0, 2, 3.2]; this.t = 0;
    },
    send(from, to) {
      if (from === to || from.owner !== 0 && from.owner < 1) return;
      const n = Math.floor(from.troops * this.share);
      this.launch(from, to, n);
    },
    launch(from, to, n) {
      if (n < 1) return;
      from.troops -= n;
      this.fleets.push({owner: from.owner, n, x: from.x, y: from.y, to, sx: from.x, sy: from.y, t: 0, dur: G.dist(from.x, from.y, to.x, to.y) / 70});
      if (from.owner === 0) G.sfx('swing', .6);
    },
    at(x, y) { return this.isles.find(i => G.dist(i.x, i.y, x, y) < i.r + 10); },
    key(k) {
      const i = '123'.indexOf(k); if (i >= 0) this.share = [.25, .5, 1][i];
      if (k === 'x') for (const s of this.isles) s.sel = false;
    },
    pointer(type, x, y) {
      const isle = this.at(x, y);
      if (type === 'down') {
        if (isle && isle.owner === 0) { this.drag = isle; isle.sel = !isle.sel || true; }
        else if (isle) { const sel = this.isles.filter(i => i.sel && i.owner === 0); for (const s of sel) { this.send(s, isle); s.sel = false; } }
        else for (const s of this.isles) s.sel = false;
      }
      if (type === 'up' && this.drag) {
        const target = isle;
        if (target && target !== this.drag) { const sel = this.isles.filter(i => i.sel && i.owner === 0); for (const s of sel.length ? sel : [this.drag]) { this.send(s, target); s.sel = false; } }
        this.drag = null;
      }
    },
    think(ai) { // send from the strongest island toward the softest worthwhile target
      const mine = this.isles.filter(i => i.owner === ai);
      if (!mine.length) return;
      const src = mine.sort((a, b) => b.troops - a.troops)[0];
      let best = null, bestScore = -1e9;
      for (const t of this.isles) {
        if (t.owner === ai) continue;
        const d = G.dist(src.x, src.y, t.x, t.y), need = t.troops + (t.owner >= 0 ? d / 70 * t.r / 12 : 0) + 3;
        if (src.troops * .7 <= need) continue;
        const s = t.r * 2 - d * .15 - need + (t.owner === 0 ? 8 : 0);
        if (s > bestScore) { bestScore = s; best = t; }
      }
      if (best) this.launch(src, best, Math.floor(src.troops * .7));
    },
    update(dt) {
      this.t += dt;
      for (const i of this.isles) if (i.owner >= 0 && i.troops < 99 + i.r) { i.grow += dt * i.r / 14; while (i.grow >= 1) { i.grow--; i.troops++; } }
      for (let a = 1; a <= Math.min(2, this.level); a++) if ((this.aiT[a] -= dt) <= 0) { this.aiT[a] = Math.max(1, 2.6 - this.level * .2) + G.rnd(1.2); this.think(a); }
      for (const f of this.fleets) {
        f.t += dt / f.dur;
        f.x = G.lerp(f.sx, f.to.x, Math.min(1, f.t)); f.y = G.lerp(f.sy, f.to.y, Math.min(1, f.t));
        if (f.t < 1) continue;
        f.done = true;
        const t = f.to;
        if (t.owner === f.owner) t.troops += f.n;
        else {
          t.troops -= f.n;
          if (t.troops < 0) {
            const was = t.owner;
            t.owner = f.owner; t.troops = -t.troops;
            G.burst(this.parts, t.x, t.y, OWNER[f.owner], 18);
            if (f.owner === 0) { G.score += 100 + Math.round(t.r * 3); G.sfx('coin'); } else if (was === 0) { G.sfx('hurt', .5); G.shake(3); }
          } else G.sfx('hit', .3);
        }
      }
      this.fleets = this.fleets.filter(f => !f.done);
      const alive = o => this.isles.some(i => i.owner === o) || this.fleets.some(f => f.owner === o);
      if (!alive(0)) return G.end('Your fleet was sunk');
      if (![1, 2].some(alive)) {
        G.score += 1000 * this.level; G.sfx('win');
        G.popText(this.parts, W / 2, H / 2, `LEVEL ${this.level} CONQUERED`, '#ffcf5c', 22);
        if (this.level === 5) return G.end('Ruler of the seas');
        this.level++; this.setup();
      }
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      G.clear('#0f3a5c');
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2;
      for (let y = 20; y < H; y += 34) { ctx.beginPath(); for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x / 40 + now + y) * 3); ctx.stroke(); }
      if (this.drag) {
        const sel = this.isles.filter(i => i.sel && i.owner === 0);
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
        for (const s of sel.length ? sel : [this.drag]) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(G.pointer.x, G.pointer.y); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      for (const i of this.isles) {
        G.circle(i.x, i.y + 4, i.r + 6, 'rgba(255,255,255,.12)');
        ctx.fillStyle = '#d9c38f'; ctx.beginPath();
        for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6, rr = i.r + 5 + Math.sin(i.seed + k * 1.7) * 3; ctx.lineTo(i.x + Math.cos(a) * rr, i.y + Math.sin(a) * rr); }
        ctx.fill();
        G.circle(i.x, i.y, i.r, '#4f9a4a'); G.circle(i.x - i.r * .3, i.y - i.r * .2, i.r * .35, '#3f8a3d');
        ctx.strokeStyle = OWNER[i.owner]; ctx.lineWidth = i.sel ? 5 : 3; ctx.beginPath(); ctx.arc(i.x, i.y, i.r + 8, 0, Math.PI * 2); ctx.stroke();
        if (i.owner >= 0) { G.rr(i.x - 1, i.y - i.r - 16, 2, 14, 1, '#5a3d2a'); ctx.fillStyle = OWNER[i.owner]; ctx.beginPath(); ctx.moveTo(i.x + 1, i.y - i.r - 16); ctx.lineTo(i.x + 13, i.y - i.r - 12); ctx.lineTo(i.x + 1, i.y - i.r - 8); ctx.fill(); }
        G.rr(i.x - 16, i.y - 9, 32, 18, 9, 'rgba(0,0,0,.45)');
        G.text(String(Math.floor(i.troops)), i.x, i.y + 5, {size: 13, align: 'center', weight: 700});
      }
      for (const f of this.fleets) {
        const a = Math.atan2(f.to.y - f.sy, f.to.x - f.sx);
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(a);
        ctx.fillStyle = OWNER[f.owner]; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-8, -6); ctx.lineTo(-8, 6); ctx.fill();
        ctx.restore();
        G.text(String(f.n), f.x, f.y - 9, {size: 10, align: 'center', weight: 700, shadow: true});
      }
      G.fx(this.parts, dt);
      const tot = o => this.isles.filter(i => i.owner === o).reduce((s, i) => s + i.troops, 0) + this.fleets.filter(f => f.owner === o).reduce((s, f) => s + f.n, 0);
      const mine = tot(0), all = mine + tot(1) + tot(2) + 1;
      G.panel(8, 8, 280, 26, 8);
      G.bar({x: 16, y: 14, w: 200, h: 14, v: mine, max: all, color: OWNER[0], label: `POWER ${Math.round(mine / all * 100)}%`, id: 'power'});
      G.text(`LV ${this.level}`, 280, 26, {size: 12, align: 'right', weight: 700});
      G.text(`Send ${Math.round(this.share * 100)}%  (1 2 3)`, W - 12, 26, {size: 12, align: 'right', weight: 700, color: '#c4c8ee', shadow: true});
    }
  });
})();

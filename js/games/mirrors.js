(() => {
  // Turn the mirrors so the laser lights every crystal. The beam's path is built first, then the mirrors are scrambled.
  const W = 640, H = 600, DIR = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // right, down, left, up
  const bounce = (d, m) => m === '/' ? [3, 2, 1, 0][d] : [1, 0, 3, 2][d]; // '/' and '\'

  function build(n) {
    const R = G.seeded(n * 71 + 3), N = Math.min(9, 5 + Math.floor(n / 9));
    for (let tries = 0; tries < 300; tries++) {
      const grid = Array.from({length: N}, () => new Array(N).fill(null)); let x = 0, y = R.int(N), d = 0;
      const src = {x: -1, y, d}, path = [], targets = [], turns = Math.min(9, 2 + Math.floor(n / 4)), goals = Math.min(4, 1 + Math.floor(n / 12));
      let ok = true, made = 0;
      for (let step = 0; step < 80; step++) {
        if (x < 0 || y < 0 || x >= N || y >= N) { ok = made >= turns; break; }
        if (grid[y][x]) { ok = false; break; }
        const k = path.length; path.push([x, y]);
        if (made < turns && k > 0 && R() < .45) { const nd = R() < .5 ? (d + 1) % 4 : (d + 3) % 4, m = (d === 0 || d === 2) === (nd === 3 || nd === 1) ? (bounce(d, '/') === nd ? '/' : '\\') : null; if (m && bounce(d, m) === nd) { grid[y][x] = {k: 'mirror', m, fixed: false}; d = nd; made++; } else grid[y][x] = {k: 'empty'}; }
        else grid[y][x] = {k: 'empty'};
        x += DIR[d][0]; y += DIR[d][1];
      }
      if (!ok) continue;
      const empties = path.filter(([a, b]) => grid[b][a].k === 'empty'); if (empties.length < goals) continue;
      for (const [a, b] of R.shuffle(empties.slice()).slice(0, goals)) { grid[b][a] = {k: 'crystal'}; targets.push([a, b]); }
      for (let y2 = 0; y2 < N; y2++) for (let x2 = 0; x2 < N; x2++) { if (grid[y2][x2] && grid[y2][x2].k !== 'empty') continue; if (path.some(([a, b]) => a === x2 && b === y2)) continue; const r = R(); grid[y2][x2] = r < .12 ? {k: 'wall'} : r < .12 + Math.min(.12, n * .004) ? {k: 'mirror', m: R() < .5 ? '/' : '\\', fixed: false} : null; }
      for (const row of grid) for (const c of row) if (c && c.k === 'empty') Object.assign(c, {k: null});
      const mirrors = []; grid.forEach((row, b) => row.forEach((c, a) => { if (c && c.k === 'mirror') { if (R() < .75) c.m = c.m === '/' ? '\\' : '/'; mirrors.push(c); } }));
      return {N, grid, src, targets};
    }
    return build(n - 1); // rare: fall back to the previous layout size
  }

  GameBox.register({
    id: 'mirrors', title: 'Laser Mirrors', genre: 'Puzzle', kind: 'Light puzzle', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click a mirror to flip it. Bounce the laser through every crystal!',
    desc: 'A laser beam shines into a grid of mirrors. Click any mirror to flip it the other way and steer the beam so it passes through every glowing crystal. Walls stop the beam cold. Fifty puzzles with more mirrors, more crystals and bigger grids as you go.',
    controls: [['Click a mirror', 'Flip it'], ['R', 'Restart the puzzle']],
    info() { return `Puzzle ${G.level} · Flips ${this.flips}`; },
    init() { this.L = build(G.level); this.flips = 0; this.t = 0; this.done = null; this.trace(); },
    trace() {
      const {N, grid, src} = this.L; let x = 0, y = src.y, d = src.d; const pts = [[-0.5, y + .5]], lit = new Set();
      for (let i = 0; i < 200; i++) {
        if (x < 0 || y < 0 || x >= N || y >= N) { pts.push([x + .5 - DIR[d][0] * .5, y + .5 - DIR[d][1] * .5]); break; }
        const c = grid[y][x];
        if (c && c.k === 'wall') { pts.push([x + .5 - DIR[d][0] * .5, y + .5 - DIR[d][1] * .5]); break; }
        if (c && c.k === 'crystal') lit.add(x + ',' + y);
        if (c && c.k === 'mirror') { pts.push([x + .5, y + .5]); d = bounce(d, c.m); }
        x += DIR[d][0]; y += DIR[d][1];
      }
      this.beam = pts; this.lit = lit; return this.L.targets.every(([a, b]) => lit.has(a + ',' + b));
    },
    view() { const N = this.L.N, s = Math.floor(Math.min((W - 120) / N, (H - 140) / N)); return {s, ox: (W - N * s) / 2 + 20, oy: 90 + (H - 120 - N * s) / 2}; },
    pointer(type, x, y) {
      if (type !== 'down' || this.done) return; const {s, ox, oy} = this.view(), cx = Math.floor((x - ox) / s), cy = Math.floor((y - oy) / s), c = this.L.grid[cy]?.[cx];
      if (!c || c.k !== 'mirror') return; c.m = c.m === '/' ? '\\' : '/'; this.flips++; G.sfx('click', .6);
      if (this.trace()) { G.sfx('power'); G.party(); G.score += 300 + G.level * 30; this.done = {t: 1.2, go: () => G.win(this.flips <= this.L.targets.length + 4 ? 3 : this.flips <= 14 ? 2 : 1, 'All crystals lit!')}; }
    },
    key(k) { if (k === 'r') this.init(); },
    update(dt) { this.t += dt; if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); },
    draw(ctx) {
      G.clear('#0e1022'); const {s, ox, oy} = this.view(), {N, grid, src} = this.L;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = ox + x * s, py = oy + y * s, c = grid[y][x];
        G.rr(px + 2, py + 2, s - 4, s - 4, 6, (x + y) % 2 ? '#1a1e38' : '#1e2240');
        if (!c) continue;
        if (c.k === 'wall') { G.rr(px + 4, py + 4, s - 8, s - 8, 6, '#3a3e5a'); ctx.strokeStyle = '#4a4e6a'; ctx.lineWidth = 2; ctx.strokeRect(px + 10, py + 10, s - 20, s - 20); }
        if (c.k === 'crystal') { const on = this.lit.has(x + ',' + y); ctx.fillStyle = on ? '#5ef0ff' : '#2a6a7a'; ctx.beginPath(); ctx.moveTo(px + s / 2, py + 8); ctx.lineTo(px + s - 12, py + s / 2); ctx.lineTo(px + s / 2, py + s - 8); ctx.lineTo(px + 12, py + s / 2); ctx.closePath(); ctx.fill(); if (on) { const g = ctx.createRadialGradient(px + s / 2, py + s / 2, 2, px + s / 2, py + s / 2, s * .8); g.addColorStop(0, 'rgba(94,240,255,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px - s / 2, py - s / 2, s * 2, s * 2); } }
        if (c.k === 'mirror') { ctx.save(); ctx.translate(px + s / 2, py + s / 2); ctx.rotate(c.m === '/' ? -Math.PI / 4 : Math.PI / 4); G.rr(-s * .42, -5, s * .84, 10, 4, '#c8d8f0'); G.rr(-s * .42, -2, s * .84, 3, 2, '#ffffff'); ctx.restore(); G.circle(px + s / 2, py + s / 2, 4, '#8a9ab8'); }
      }
      // laser
      const L = this.beam; ctx.lineCap = 'round';
      for (const [w, col] of [[10, 'rgba(255,60,90,.25)'], [4, '#ff4b6b'], [1.5, '#fff']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); L.forEach(([x, y], i) => { const px = ox + x * s, py = oy + y * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
      G.rr(ox - 46, oy + src.y * s + s / 2 - 16, 40, 32, 8, '#5a5e7a'); G.circle(ox - 8, oy + src.y * s + s / 2, 7, '#ff4b6b');
      G.text(`PUZZLE ${G.level}`, 20, 40, {size: 20, weight: 800, color: '#cfd4ff'});
      G.text(`◆ ${this.L.targets.filter(([a, b]) => this.lit.has(a + ',' + b)).length}/${this.L.targets.length}`, W / 2, 40, {size: 20, align: 'center', weight: 800, color: '#5ef0ff'});
      G.text(`FLIPS ${this.flips}`, W - 20, 40, {size: 16, align: 'right', weight: 800, color: '#cfd4ff'});
    }
  });
})();

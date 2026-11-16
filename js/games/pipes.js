(() => {
  // Rotate pipe pieces so water flows from the tap to the flower. A hidden solution path is built first, then everything is spun.
  const W = 640, H = 600;
  // pipe openings as bits: 1 up, 2 right, 4 down, 8 left
  const rot = m => ((m << 1) | (m >> 3)) & 15, DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];

  function build(n) {
    const R = G.seeded(n * 53 + 9), N = Math.min(8, 4 + Math.floor(n / 8));
    for (let tries = 0; tries < 200; tries++) {
      const seen = new Set(['0,0']), path = [[0, 0]];
      const walk = () => { // random self-avoiding walk to the bottom-right corner
        while (true) { const [x, y] = path.at(-1); if (x === N - 1 && y === N - 1) return true;
          const opts = DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen.has(a + ',' + b));
          if (!opts.length) return false; const nx = R() < .55 ? opts.sort((p, q) => (q[0] + q[1]) - (p[0] + p[1]))[0] : R.pick(opts); seen.add(nx.join(',')); path.push(nx); } };
      if (!walk() || path.length < N * 1.4) continue;
      const g = Array.from({length: N}, () => new Array(N).fill(0));
      path.forEach(([x, y], i) => { const link = (a, b) => { const k = DIRS.findIndex(([dx, dy]) => a[0] + dx === b[0] && a[1] + dy === b[1]); return DIRS[k][2]; };
        let m = 0; if (i > 0) m |= link([x, y], path[i - 1]); else m |= 8; if (i < path.length - 1) m |= link([x, y], path[i + 1]); else m |= 2; g[y][x] = m; });
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!g[y][x]) g[y][x] = R.pick([5, 10, 3, 6, 12, 9, 7, 11, 13, 14]);
      const turns = g.map(r => r.map(() => R.int(4)));
      const tiles = g.map((r, y) => r.map((m, x) => { let v = m; for (let k = 0; k < turns[y][x]; k++) v = rot(v); return v; }));
      return {N, tiles, minTurns: path.length};
    }
  }

  GameBox.register({
    id: 'pipes', title: 'Pipe Flow', genre: 'Puzzle', kind: 'Rotate pipes', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click pipes to turn them. Connect the tap (top left) to the flower (bottom right)!',
    desc: 'A garden full of mixed-up pipes. Click a piece to turn it a quarter turn and line the pipes up so water runs all the way from the tap to the thirsty flower. Pipes that already connect to the tap fill with water so you can see how far you have got. Fifty gardens that grow from 4 by 4 to 8 by 8.',
    controls: [['Click a pipe', 'Turn it'], ['R', 'Shuffle again (same puzzle)']],
    info() { return `Garden ${G.level} · Turns ${this.turns}`; },
    init() { this.L = build(G.level); this.tiles = this.L.tiles.map(r => r.slice()); this.turns = 0; this.t = 0; this.done = null; this.anim = {}; this.flow(); },
    flow() { // flood from the tap through matching openings
      const {N} = this.L, wet = Array.from({length: N}, () => new Array(N).fill(false)), q = [];
      if (this.tiles[0][0] & 8) { wet[0][0] = true; q.push([0, 0]); }
      while (q.length) { const [x, y] = q.pop(), m = this.tiles[y][x]; for (const [dx, dy, out, inn] of DIRS) { const nx = x + dx, ny = y + dy; if ((m & out) && nx >= 0 && ny >= 0 && nx < N && ny < N && !wet[ny][nx] && (this.tiles[ny][nx] & inn)) { wet[ny][nx] = true; q.push([nx, ny]); } } }
      this.wet = wet; return wet[N - 1][N - 1] && (this.tiles[N - 1][N - 1] & 2);
    },
    view() { const N = this.L.N, s = Math.floor(Math.min((W - 120) / N, (H - 140) / N)); return {s, ox: (W - N * s) / 2, oy: 90 + (H - 120 - N * s) / 2}; },
    pointer(type, x, y) {
      if (type !== 'down' || this.done) return; const {s, ox, oy} = this.view(), N = this.L.N, cx = Math.floor((x - ox) / s), cy = Math.floor((y - oy) / s);
      if (cx < 0 || cy < 0 || cx >= N || cy >= N) return;
      this.tiles[cy][cx] = rot(this.tiles[cy][cx]); this.turns++; this.anim[cy + ',' + cx] = .15; G.sfx('click', .5);
      if (this.flow()) { G.sfx('splash'); G.party(); G.score += 300 + G.level * 30; const par = this.L.minTurns * 2.2; this.done = {t: 1.2, go: () => G.win(this.turns <= par ? 3 : this.turns <= par * 1.7 ? 2 : 1, 'The flower is happy!')}; }
    },
    key(k) { if (k === 'r') this.init(); },
    update(dt) { this.t += dt; for (const k in this.anim) this.anim[k] -= dt; if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9ed8a0'); g.addColorStop(1, '#6ab868'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const {s, ox, oy} = this.view(), N = this.L.N;
      G.rr(ox - 10, oy - 10, N * s + 20, N * s + 20, 16, '#5a4a3a');
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const m = this.tiles[y][x], px = ox + x * s, py = oy + y * s, wet = this.wet[y][x], c = s / 2, w = s * .28, a = (this.anim[y + ',' + x] || 0) > 0;
        G.rr(px + 2, py + 2, s - 4, s - 4, 8, (x + y) % 2 ? '#8a6a4a' : '#7a5a3a');
        ctx.save(); ctx.translate(px + c, py + c); if (a) ctx.rotate(-this.anim[y + ',' + x] / .15 * Math.PI / 2);
        const col = wet ? '#4ab0ff' : '#b8bcc8', edge = wet ? '#2a78c8' : '#7a7e8a';
        for (const [k, [dx, dy]] of [[1, [0, -1]], [2, [1, 0]], [4, [0, 1]], [8, [-1, 0]]]) if (m & k) { ctx.fillStyle = edge; ctx.fillRect(dx ? (dx > 0 ? 0 : -c) : -w / 2 - 3, dy ? (dy > 0 ? 0 : -c) : -w / 2 - 3, dx ? c : w + 6, dy ? c : w + 6); }
        for (const [k, [dx, dy]] of [[1, [0, -1]], [2, [1, 0]], [4, [0, 1]], [8, [-1, 0]]]) if (m & k) { ctx.fillStyle = col; ctx.fillRect(dx ? (dx > 0 ? 0 : -c) : -w / 2, dy ? (dy > 0 ? 0 : -c) : -w / 2, dx ? c : w, dy ? c : w); }
        G.circle(0, 0, w * .75, col); if (wet) G.circle(-w * .2, -w * .2, w * .2, 'rgba(255,255,255,.6)');
        ctx.restore();
      }
      // tap and flower
      G.rr(ox - 56, oy + s / 2 - 16, 50, 32, 8, '#c8ccd8'); G.rr(ox - 70, oy + s / 2 - 30, 22, 30, 6, '#e84a4a');
      const fx = ox + N * s + 30, fy = oy + (N - .5) * s, happy = !!this.done;
      G.rr(ox + N * s + 4, fy - 8, 20, 16, 4, '#b87a3a'); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + (happy ? this.t * 2 : 0); G.circle(fx + 6 + Math.cos(a) * 14, fy - 30 + Math.sin(a) * 14, 10, happy ? '#ff7bd0' : '#c8a0b8'); }
      G.circle(fx + 6, fy - 30, 9, '#ffcf5c'); ctx.fillStyle = '#3f8a36'; ctx.fillRect(fx + 4, fy - 20, 4, 30);
      G.text(`GARDEN ${G.level}`, 20, 40, {size: 20, weight: 800, color: '#1f4a2a'}); G.text(`TURNS ${this.turns}`, W - 20, 40, {size: 18, align: 'right', weight: 800, color: '#1f4a2a'});
    }
  });
})();

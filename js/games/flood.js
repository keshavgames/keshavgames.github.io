(() => {
  // Flood the board with one colour from the top-left corner, within the move limit.
  const W = 600, H = 660, COLORS = ['#ff5b6b', '#ffcf5c', '#5ee66b', '#4aa8ff', '#b07bff', '#ff9f43'];

  function solveGreedy(g, N) { // a quick greedy solver sets the move limit
    const b = g.map(r => r.slice()); let moves = 0;
    while (moves < 200) {
      const region = flood(b, N), cols = new Map();
      for (const [x, y] of region) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const c = b[y + dy]?.[x + dx]; if (c !== undefined && c !== b[0][0]) cols.set(c, (cols.get(c) || 0) + 1); }
      if (!cols.size) return moves;
      let best = -1, bestGain = -1; for (const c of cols.keys()) { const t = b.map(r => r.slice()); paint(t, N, c); const gain = flood(t, N).length; if (gain > bestGain) { bestGain = gain; best = c; } }
      paint(b, N, best); moves++;
    }
    return moves;
  }
  function flood(b, N) { const c0 = b[0][0], seen = new Set(['0,0']), q = [[0, 0]], out = []; while (q.length) { const [x, y] = q.pop(); out.push([x, y]); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(k) && b[ny][nx] === c0) { seen.add(k); q.push([nx, ny]); } } } return out; }
  function paint(b, N, c) { for (const [x, y] of flood(b, N)) b[y][x] = c; }

  GameBox.register({
    id: 'flood', title: 'Color Flood', genre: 'Puzzle', kind: 'Flood fill', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Pick a colour to spread from the top-left corner. Fill the whole board before you run out of moves!',
    desc: 'A blotchy board of colours. Your blob starts in the top-left corner: pick a colour and the blob turns that colour, swallowing every touching square of it. Keep picking until the whole board is one colour, before your moves run out. Fifty boards with more squares and more colours.',
    controls: [['Click a colour button', 'Flood with that colour'], ['1-6', 'Pick colour 1 to 6']],
    info() { return `Board ${G.level} · Moves ${this.moves}/${this.limit}`; },
    init() {
      const n = G.level, R = G.seeded(n * 29 + 1); this.N = Math.min(16, 6 + Math.floor(n / 4)); this.k = Math.min(6, 3 + Math.floor(n / 10));
      this.b = Array.from({length: this.N}, () => Array.from({length: this.N}, () => R.int(this.k)));
      this.limit = solveGreedy(this.b, this.N) + Math.max(1, 4 - Math.floor(n / 15)); this.moves = 0; this.done = null; this.t = 0; this.wave = new Map();
    },
    pick(c) {
      if (this.done || c >= this.k || c === this.b[0][0]) return;
      const before = new Set(flood(this.b, this.N).map(p => p.join(','))); paint(this.b, this.N, c); this.moves++; G.note(G.midi(60 + [0, 2, 4, 7, 9, 12][c]), .25, {type: 'triangle', vol: .12});
      for (const [x, y] of flood(this.b, this.N)) if (!before.has(x + ',' + y)) this.wave.set(x + ',' + y, .3);
      const done = flood(this.b, this.N).length === this.N * this.N;
      if (done) { G.party(); G.score += 200 + (this.limit - this.moves) * 60 + G.level * 20; const spare = this.limit - this.moves; this.done = {t: 1, go: () => G.win(spare >= 2 ? 3 : spare >= 1 ? 2 : 1, `Flooded in ${this.moves} moves!`)}; }
      else if (this.moves >= this.limit) this.done = {t: 1, go: () => G.end('Out of moves!')};
    },
    key(k) { const i = '123456'.indexOf(k); if (i >= 0) this.pick(i); },
    pointer(type, x, y) { if (type !== 'down') return; for (let i = 0; i < this.k; i++) { const bx = W / 2 - this.k * 40 + i * 80 + 8; if (x > bx && x < bx + 64 && y > H - 90 && y < H - 26) this.pick(i); } },
    update(dt) { this.t += dt; for (const [k, v] of this.wave) { if (v - dt <= 0) this.wave.delete(k); else this.wave.set(k, v - dt); } if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); },
    draw(ctx) {
      G.clear('#1e1a30'); const N = this.N, size = Math.min(W - 60, H - 200), s = size / N, ox = (W - size) / 2, oy = 80;
      G.rr(ox - 8, oy - 8, size + 16, size + 16, 14, '#2e2848');
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const w = this.wave.get(x + ',' + y) || 0, pad = 1 + w * 6; G.rr(ox + x * s + pad, oy + y * s + pad, s - pad * 2, s - pad * 2, Math.min(6, s / 4), COLORS[this.b[y][x]]); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(ox - 2, oy - 2, s + 4, s + 4);
      for (let i = 0; i < this.k; i++) { const bx = W / 2 - this.k * 40 + i * 80 + 8, cur = i === this.b[0][0]; G.rr(bx, H - 90 + (cur ? 6 : 0), 64, 64, 16, cur ? 'rgba(255,255,255,.15)' : COLORS[i]); G.text(String(i + 1), bx + 32, H - 48 + (cur ? 6 : 0), {size: 20, align: 'center', weight: 800, color: cur ? 'rgba(255,255,255,.4)' : '#1e1a30'}); }
      const left = this.limit - this.moves;
      G.text(`BOARD ${G.level}`, 24, 46, {size: 20, weight: 800, color: '#fff'}); G.text(`${left} ${left === 1 ? 'move' : 'moves'} left`, W - 24, 46, {size: 20, align: 'right', weight: 800, color: left <= 2 ? '#ff6b6b' : '#ffcf5c'});
    }
  });
})();

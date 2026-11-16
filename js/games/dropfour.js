(() => {
  // Drop discs into a 7x6 frame; four in a row (across, down or diagonal) wins.
  const W = 640, H = 600, C = 7, R = 6, S = 76, OX = 54, OY = 120;

  function winner(b) {
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { const p = b[y][x]; if (!p) continue; for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { let k = 1; while (k < 4 && b[y + dy * k]?.[x + dx * k] === p) k++; if (k === 4) return {p, cells: [0, 1, 2, 3].map(i => [x + dx * i, y + dy * i])}; } }
    return null;
  }
  function drop(b, col, p) { for (let y = R - 1; y >= 0; y--) if (!b[y][col]) { const n = b.map(r => r.slice()); n[y][col] = p; return {b: n, y}; } return null; }
  function evalBoard(b) { // count open threes and twos for each side
    let s = 0;
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const cells = [0, 1, 2, 3].map(i => b[y + dy * i]?.[x + dx * i]); if (cells.some(c => c === undefined)) continue;
      const a = cells.filter(c => c === 2).length, h = cells.filter(c => c === 1).length;
      if (a && !h) s += [0, 1, 6, 40, 1000][a]; if (h && !a) s -= [0, 1, 6, 45, 1000][h];
    }
    for (let y = 0; y < R; y++) if (b[y][3] === 2) s += 3; else if (b[y][3] === 1) s -= 3;
    return s;
  }
  function minimax(b, depth, turn, a, bt) {
    const w = winner(b); if (w) return {v: w.p === 2 ? 10000 + depth : -10000 - depth}; if (depth === 0) return {v: evalBoard(b)};
    let best = null; for (const col of [3, 2, 4, 1, 5, 0, 6]) { const d = drop(b, col, turn); if (!d) continue; const v = minimax(d.b, depth - 1, 3 - turn, a, bt).v; if (!best || (turn === 2 ? v > best.v : v < best.v)) best = {v, col}; if (turn === 2) a = Math.max(a, v); else bt = Math.min(bt, v); if (bt <= a) break; }
    return best || {v: 0};
  }

  GameBox.register({
    id: 'dropfour', title: 'Drop Four', genre: 'Strategy', kind: 'Four in a row', w: W, h: H, levels: 20, modes: ['bot', 'local'], assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click a column to drop your disc. Get four in a row before the bot does!',
    desc: 'Take turns dropping discs into the frame. The first to line up four of their colour across, down or diagonally wins. Block the other side when they have three in a row! Twenty bots that think more moves ahead each level, or play a friend on the same screen.',
    controls: [['Click a column / 1-7', 'Drop a disc']],
    info() { return `Game ${G.level} · ${this.turn === 1 ? 'Your turn' : G.mode === 'local' ? 'Yellow to move' : 'Bot thinking'}`; },
    init() { this.b = Array.from({length: R}, () => new Array(C).fill(0)); this.turn = 1; this.falling = null; this.done = null; this.win = null; this.wait = 0; this.t = 0; },
    play(col) {
      if (this.done || this.falling) return; const d = drop(this.b, col, this.turn); if (!d) return;
      this.falling = {col, y: -1, ty: d.y, p: this.turn, nb: d.b}; G.sfx('click', .5);
    },
    land() {
      const f = this.falling; this.b = f.nb; this.falling = null; G.sfx('hit', .4); const w = winner(this.b);
      if (w) { this.win = w; const me = w.p === 1;
        if (G.mode === 'local') this.done = {t: 1.6, go: () => G.end(me ? 'Red wins!' : 'Yellow wins!')};
        else if (me) { G.party(); const moves = this.b.flat().filter(c => c === 1).length; G.score += 500 + G.level * 50 + (21 - moves) * 20; this.done = {t: 1.6, go: () => G.win(moves <= 8 ? 3 : moves <= 13 ? 2 : 1, 'Four in a row!')}; }
        else this.done = {t: 1.6, go: () => G.end('The bot got four in a row')}; return; }
      if (this.b[0].every(Boolean)) { this.done = {t: 1.2, go: () => G.end("It's a draw!")}; return; }
      this.turn = 3 - this.turn; this.wait = .35;
    },
    key(k) { const i = '1234567'.indexOf(k); if (i >= 0 && (this.turn === 1 || G.mode === 'local')) this.play(i); },
    pointer(type, x) { if (type !== 'down' || (this.turn === 2 && G.mode !== 'local')) return; const col = Math.floor((x - OX) / S); if (col >= 0 && col < C) this.play(col); },
    update(dt) {
      this.t += dt; if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.falling) { const f = this.falling; f.v = (f.v || 0) + 40 * dt; f.y += f.v; if (f.y >= f.ty) this.land(); return; }
      if (this.turn === 2 && G.mode !== 'local' && (this.wait -= dt) <= 0) {
        const depth = Math.min(6, G.level < 4 ? 1 : 1 + Math.floor(G.level / 3)), mistake = Math.random() < Math.max(.03, .75 - G.level * .05);
        const free = [0, 1, 2, 3, 4, 5, 6].filter(c => !this.b[0][c]);
        this.play(mistake ? G.pick(free) : minimax(this.b, depth, 2, -1e9, 1e9).col ?? G.pick(free));
      }
    },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3a7a'); g.addColorStop(1, '#1a2450'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const hov = Math.floor((G.pointer.x - OX) / S);
      if (!this.done && !this.falling && (this.turn === 1 || G.mode === 'local') && hov >= 0 && hov < C) { G.circle(OX + (hov + .5) * S, OY - 40, S * .38, this.turn === 1 ? '#ff5b5b' : '#ffd84a'); ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(OX + hov * S, OY, S, R * S); }
      const disc = (x, y, p, glow) => { G.circle(x + 2, y + 3, S * .38, 'rgba(0,0,0,.3)'); G.circle(x, y, S * .38, p === 1 ? '#e84040' : '#f0c020'); G.circle(x, y, S * .28, p === 1 ? '#ff5b5b' : '#ffd84a'); if (glow) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, S * .4, 0, Math.PI * 2); ctx.stroke(); } };
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) if (this.b[y][x]) disc(OX + (x + .5) * S, OY + (y + .5) * S, this.b[y][x], this.win && this.win.cells.some(c => c[0] === x && c[1] === y) && Math.floor(this.t * 4) % 2);
      if (this.falling) disc(OX + (this.falling.col + .5) * S, OY + (this.falling.y + .5) * S, this.falling.p);
      ctx.save(); ctx.beginPath(); ctx.rect(OX - 12, OY - 12, C * S + 24, R * S + 24); for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { ctx.moveTo(OX + (x + .5) * S + S * .4, OY + (y + .5) * S); ctx.arc(OX + (x + .5) * S, OY + (y + .5) * S, S * .4, 0, Math.PI * 2); }
      ctx.fillStyle = '#2a6ae8'; ctx.fill('evenodd'); ctx.restore();
      ctx.strokeStyle = '#1a4ab8'; ctx.lineWidth = 4; ctx.strokeRect(OX - 12, OY - 12, C * S + 24, R * S + 24);
      G.text(this.turn === 1 ? 'Red: your turn' : G.mode === 'local' ? 'Yellow: your turn' : 'Bot is thinking…', W / 2, 44, {size: 20, align: 'center', weight: 800, color: this.turn === 1 ? '#ff8a8a' : '#ffe08a'});
    }
  });
})();

(() => {
  // Checkers vs a bot that looks further ahead each level, or two players on one screen.
  const W = 600, H = 660, S = 64, OX = 44, OY = 90;

  function moves(b, side, onlyFrom) { // all legal moves; captures are compulsory
    const caps = [], plain = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const p = b[y][x]; if (!p || p.s !== side || (onlyFrom && (onlyFrom[0] !== x || onlyFrom[1] !== y))) continue;
      const dirs = p.k ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : side === 0 ? [[1, -1], [-1, -1]] : [[1, 1], [-1, 1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy, jx = x + dx * 2, jy = y + dy * 2;
        if (b[ny]?.[nx] === null) plain.push({from: [x, y], to: [nx, ny]});
        if (b[ny]?.[nx] && b[ny][nx].s !== side && b[jy]?.[jx] === null) caps.push({from: [x, y], to: [jx, jy], cap: [nx, ny]});
      }
    }
    return caps.length ? caps : onlyFrom ? [] : plain;
  }
  function apply(b, m) { const n = b.map(r => r.slice()), p = {...n[m.from[1]][m.from[0]]}; n[m.from[1]][m.from[0]] = null; if (m.cap) n[m.cap[1]][m.cap[0]] = null; if ((p.s === 0 && m.to[1] === 0) || (p.s === 1 && m.to[1] === 7)) p.k = true; n[m.to[1]][m.to[0]] = p; return n; }
  function score(b) { let s = 0; for (const r of b) for (const p of r) if (p) s += (p.k ? 3 : 1) * (p.s === 1 ? 1 : -1); return s; }
  function search(b, side, depth, a, bt) { // minimax with alpha-beta; multi-jumps are taken greedily
    const ms = moves(b, side); if (!ms.length) return {v: side === 1 ? -99 : 99};
    if (depth === 0) return {v: score(b)};
    let best = null;
    for (const m of ms) {
      let nb = apply(b, m); if (m.cap) { let cur = m.to, more; while ((more = moves(nb, side, cur)).length && more[0].cap) { nb = apply(nb, more[0]); cur = more[0].to; } }
      const v = search(nb, 1 - side, depth - 1, a, bt).v + (Math.random() - .5) * .3;
      if (!best || (side === 1 ? v > best.v : v < best.v)) best = {v, m};
      if (side === 1) a = Math.max(a, v); else bt = Math.min(bt, v); if (bt <= a) break;
    }
    return best;
  }

  GameBox.register({
    id: 'checkers', title: 'Checkers', genre: 'Strategy', kind: 'Board game', w: W, h: H, levels: 20, modes: ['bot', 'local'], assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click a piece, then click where to move. Jump over pieces to capture them! Jumps are a must.',
    desc: 'Classic checkers. Move your pieces diagonally forward, jump over the other side to capture, and reach the far row to crown a king that can move both ways. If you can jump, you must. Twenty bots that think further ahead each level, or play a friend on the same screen.',
    controls: [['Click a piece', 'Select it'], ['Click a square', 'Move or jump there']],
    info() { return `Game ${G.level} · ${this.turn === 0 ? 'Your turn' : G.mode === 'local' ? 'Red to move' : 'Bot thinking'}`; },
    init() {
      this.b = Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => (x + y) % 2 === 1 && y < 3 ? {s: 1, k: false} : (x + y) % 2 === 1 && y > 4 ? {s: 0, k: false} : null));
      this.turn = 0; this.sel = null; this.chain = null; this.wait = 0; this.done = null; this.t = 0; this.last = null; this.parts = [];
    },
    legal() { return moves(this.b, this.turn, this.chain); },
    play(m) {
      this.b = apply(this.b, m); this.last = m; G.sfx(m.cap ? 'hit' : 'click', .6);
      if (m.cap) { this.parts.push({x: OX + (m.cap[0] + .5) * S, y: OY + (m.cap[1] + .5) * S, t: .4}); const more = moves(this.b, this.turn, m.to); if (more.length && more[0].cap) { this.chain = m.to; this.sel = m.to; return; } }
      this.chain = null; this.sel = null; this.turn = 1 - this.turn; this.wait = .5;
      const mine = this.b.flat().filter(p => p && p.s === 0).length, theirs = this.b.flat().filter(p => p && p.s === 1).length;
      if (!moves(this.b, this.turn).length) this.finish(1 - this.turn, mine, theirs);
    },
    finish(winner, mine, theirs) {
      if (G.mode === 'local') { this.done = {t: 1.2, go: () => G.end(winner === 0 ? 'Blue wins!' : 'Red wins!')}; return; }
      if (winner === 0) { G.party(); G.score += 500 + G.level * 60 + mine * 30; this.done = {t: 1.2, go: () => G.win(mine >= 8 ? 3 : mine >= 4 ? 2 : 1, `You won with ${mine} pieces left!`)}; }
      else this.done = {t: 1.2, go: () => G.end('The bot wins this time')};
    },
    pointer(type, x, y) {
      if (type !== 'down' || this.done || (this.turn === 1 && G.mode !== 'local')) return;
      const cx = Math.floor((x - OX) / S), cy = Math.floor((y - OY) / S); if (cx < 0 || cy < 0 || cx > 7 || cy > 7) return;
      const legal = this.legal(), p = this.b[cy][cx];
      if (p && p.s === this.turn && !this.chain) { if (legal.some(m => m.from[0] === cx && m.from[1] === cy)) { this.sel = [cx, cy]; G.sfx('select', .5); } else G.sfx('click', .3); return; }
      if (this.sel) { const m = legal.find(m => m.from[0] === this.sel[0] && m.from[1] === this.sel[1] && m.to[0] === cx && m.to[1] === cy); if (m) this.play(m); }
    },
    update(dt) {
      this.t += dt; for (const p of this.parts) p.t -= dt; this.parts = this.parts.filter(p => p.t > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.turn === 1 && G.mode !== 'local' && (this.wait -= dt) <= 0) {
        const depth = Math.min(6, 1 + Math.floor(G.level / 3));
        const r = Math.random() < Math.max(.05, .7 - G.level * .05) ? {m: G.pick(this.legal())} : search(this.b, 1, depth, -1e9, 1e9);
        if (r && r.m) { this.play(r.m); while (this.chain && this.turn === 1) { const more = moves(this.b, 1, this.chain); this.play(more[0]); } }
        this.wait = .5;
      }
    },
    draw(ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#3a2a1e'); bg.addColorStop(1, '#2a1e16'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      G.rr(OX - 14, OY - 14, S * 8 + 28, S * 8 + 28, 14, '#6a4a2a');
      const legal = this.done ? [] : this.legal();
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#7a5232' : '#f0dcb0'; ctx.fillRect(OX + x * S, OY + y * S, S, S);
        if (this.last && ((this.last.from[0] === x && this.last.from[1] === y) || (this.last.to[0] === x && this.last.to[1] === y))) { ctx.fillStyle = 'rgba(255,220,100,.18)'; ctx.fillRect(OX + x * S, OY + y * S, S, S); }
      }
      if (this.sel) for (const m of legal) if (m.from[0] === this.sel[0] && m.from[1] === this.sel[1]) G.circle(OX + (m.to[0] + .5) * S, OY + (m.to[1] + .5) * S, 12, 'rgba(120,255,140,.55)');
      if (!this.sel && this.turn === 0 && legal[0]?.cap) for (const m of legal) { ctx.strokeStyle = 'rgba(255,200,60,.9)'; ctx.lineWidth = 3; ctx.strokeRect(OX + m.from[0] * S + 3, OY + m.from[1] * S + 3, S - 6, S - 6); }
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const p = this.b[y][x]; if (!p) continue; const cx = OX + (x + .5) * S, cy = OY + (y + .5) * S, sel = this.sel && this.sel[0] === x && this.sel[1] === y, up = sel ? -4 : 0;
        G.circle(cx + 2, cy + 5, S * .38, 'rgba(0,0,0,.35)'); G.circle(cx, cy + up, S * .38, p.s === 0 ? '#2a6ae8' : '#d83a3a'); G.circle(cx, cy + up, S * .3, p.s === 0 ? '#4a8aff' : '#f05a5a'); G.circle(cx - 6, cy - 6 + up, S * .08, 'rgba(255,255,255,.45)');
        if (p.k) G.star(cx, cy + up, S * .16, '#ffd84a');
      }
      for (const pt of this.parts) G.circle(pt.x, pt.y, (1 - pt.t / .4) * 40, `rgba(255,255,255,${pt.t})`);
      const mine = this.b.flat().filter(p => p && p.s === 0).length, theirs = this.b.flat().filter(p => p && p.s === 1).length;
      G.text(`BLUE ${mine}`, OX, 50, {size: 20, weight: 800, color: '#7aaaff'}); G.text(`RED ${theirs}`, W - OX, 50, {size: 20, align: 'right', weight: 800, color: '#ff8a8a'});
      G.text(this.turn === 0 ? (this.chain ? 'Keep jumping!' : 'Your turn') : G.mode === 'local' ? "Red's turn" : 'Thinking…', W / 2, 50, {size: 16, align: 'center', weight: 800, color: '#f0dcb0'});
    }
  });
})();

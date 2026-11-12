(() => {
  const W = 480, H = 568, N = 8, S = 56, OX = 16, OY = 104;
  const COLORS = ['#ff6b8b', '#5ee6c1', '#ffcf5c', '#8b7bff', '#5cb8ff', '#ff9f5c'];
  const cx = c => OX + c * S + S / 2, cy = r => OY + r * S + S / 2;

  function shape(ctx, t, x, y, r) {
    ctx.fillStyle = COLORS[t]; ctx.beginPath();
    const poly = (n, rot, f = 1) => { for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n; ctx.lineTo(x + Math.cos(a) * r * f, y + Math.sin(a) * r * f); } };
    if (t === 0) poly(4, -Math.PI / 2); else if (t === 1) ctx.arc(x, y, r * .85, 0, Math.PI * 2); else if (t === 2) poly(3, -Math.PI / 2, 1.05);
    else if (t === 3) poly(6, 0, .95); else if (t === 4) poly(4, Math.PI / 4, .95);
    else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .5 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - r * .25, y - r * .3, r * .3, r * .16, -.5, 0, Math.PI * 2); ctx.fill();
  }

  GameBox.register({
    id: 'match3', title: 'Crystal Cascade', genre: 'Puzzle', kind: 'Match-3', w: W, h: H, cursor: 'pointer',
    desc: 'Swap neighbouring crystals to line up three or more of a kind. Four in a row makes a line crystal, an L or T shape makes a bomb, and five in a row makes a star that clears a whole colour. Reach each level\'s target before your moves run out.',
    controls: [['Click two neighbours / Drag', 'Swap crystals'], ['Arrows + Space', 'Move the cursor, pick, then swap'], ['H', 'Show a hint']],
    info() { return `Level ${this.level} · ${this.moves} moves left`; },
    init() {
      this.level = 1; this.moves = 25; this.target = 1200; this.levelScore = 0; this.parts = [];
      this.sel = null; this.cursor = {r: 3, c: 3}; this.phase = 'idle'; this.combo = 0; this.idleT = 0; this.hint = null;
      this.fill();
    },
    gem(t, r, c, fromY) { return {t, sp: null, x: cx(c), y: fromY ?? cy(r), scale: 1}; },
    fill() {
      do {
        this.g = [];
        for (let r = 0; r < N; r++) { this.g.push([]); for (let c = 0; c < N; c++) { let t; do t = Math.floor(G.rnd(6)); while ((c > 1 && this.g[r][c - 1].t === t && this.g[r][c - 2].t === t) || (r > 1 && this.g[r - 1][c].t === t && this.g[r - 2][c].t === t)); this.g[r].push(this.gem(t, r, c, cy(r) - 500)); } }
      } while (!this.findMove());
    },
    runs() { // every horizontal and vertical run of 3+
      const out = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N;) { let e = c; while (e + 1 < N && this.g[r][e + 1].t === this.g[r][c].t) e++; if (e - c >= 2) out.push({dir: 'h', r, c0: c, c1: e, len: e - c + 1}); c = e + 1; }
      for (let c = 0; c < N; c++) for (let r = 0; r < N;) { let e = r; while (e + 1 < N && this.g[e + 1][c].t === this.g[r][c].t) e++; if (e - r >= 2) out.push({dir: 'v', c, r0: r, r1: e, len: e - r + 1}); r = e + 1; }
      return out;
    },
    swapCells(a, b) { const t = this.g[a.r][a.c]; this.g[a.r][a.c] = this.g[b.r][b.c]; this.g[b.r][b.c] = t; },
    findMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const a = {r, c}, b = {r: r + dr, c: c + dc};
        if (b.r >= N || b.c >= N) continue;
        if (this.g[r][c].sp === 'star' || this.g[b.r][b.c].sp === 'star') return [a, b];
        this.swapCells(a, b); const ok = this.runs().length > 0; this.swapCells(a, b);
        if (ok) return [a, b];
      }
      return null;
    },
    trySwap(a, b) {
      if (this.phase !== 'idle' || this.moves <= 0) return;
      if (Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) { this.sel = b; return; }
      this.sel = null; this.hint = null; this.idleT = 0;
      this.swapCells(a, b); this.swapA = a; this.swapB = b; this.phase = 'swap'; G.sfx('click');
    },
    afterSwap() {
      const A = this.g[this.swapA.r][this.swapA.c], B = this.g[this.swapB.r][this.swapB.c];
      if (A.sp === 'star' || B.sp === 'star') { // a star clears every crystal of the other colour
        const star = A.sp === 'star' ? A : B, other = star === A ? B : A, kill = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (this.g[r][c].t === other.t || this.g[r][c] === star) kill.add(r * N + c);
        this.moves--; this.combo = 0; G.sfx('power'); this.clear(kill, []); return;
      }
      if (!this.runs().length) { this.swapCells(this.swapA, this.swapB); this.phase = 'back'; G.sfx('hit', .3); return; }
      this.moves--; this.combo = 0; this.resolve();
    },
    resolve() {
      const runs = this.runs();
      if (!runs.length) {
        this.combo = 0;
        if (this.levelScore >= this.target) return this.levelUp();
        if (this.moves <= 0) return G.end('Out of moves');
        if (!this.findMove()) { this.reshuffle(); return; }
        this.phase = 'idle'; return;
      }
      this.combo++;
      const kill = new Set(), make = [], count = new Map();
      for (const run of runs) for (let i = 0; i < run.len; i++) {
        const k = run.dir === 'h' ? run.r * N + run.c0 + i : (run.r0 + i) * N + run.c;
        kill.add(k); count.set(k, (count.get(k) || 0) + 1);
      }
      const pivot = run => { // the swapped cell if it is in the run, else the middle
        for (const p of [this.swapA, this.swapB]) if (p && (run.dir === 'h' ? p.r === run.r && p.c >= run.c0 && p.c <= run.c1 : p.c === run.c && p.r >= run.r0 && p.r <= run.r1)) return p;
        return run.dir === 'h' ? {r: run.r, c: (run.c0 + run.c1) >> 1} : {r: (run.r0 + run.r1) >> 1, c: run.c};
      };
      for (const [k, n] of count) if (n > 1) make.push({r: Math.floor(k / N), c: k % N, sp: 'bomb', t: this.g[Math.floor(k / N)][k % N].t});
      for (const run of runs) {
        if (run.len < 4) continue;
        const p = pivot(run);
        if (!make.some(m => m.r === p.r && m.c === p.c)) make.push({...p, sp: run.len >= 5 ? 'star' : run.dir === 'h' ? 'row' : 'col', t: this.g[p.r][p.c].t});
      }
      this.swapA = this.swapB = null;
      this.clear(kill, make);
    },
    clear(kill, make) {
      const keep = new Set(make.map(m => m.r * N + m.c));
      const queue = [...kill];
      for (let i = 0; i < queue.length; i++) { // specials caught in the blast fire too
        const k = queue[i], r = Math.floor(k / N), c = k % N, g = this.g[r][c];
        if (!g.sp || keep.has(k) || g.fired) continue;
        g.fired = true;
        const add = (rr, cc) => { if (rr >= 0 && cc >= 0 && rr < N && cc < N && !kill.has(rr * N + cc)) { kill.add(rr * N + cc); queue.push(rr * N + cc); } };
        if (g.sp === 'row') for (let x = 0; x < N; x++) add(r, x);
        if (g.sp === 'col') for (let y = 0; y < N; y++) add(y, c);
        if (g.sp === 'bomb') for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) add(r + y, c + x);
        if (g.sp === 'star') for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (this.g[y][x].t === g.t) add(y, x);
        G.shake(4, .2);
      }
      const gained = (kill.size - keep.size) * 10 * this.combo;
      G.score += gained; this.levelScore += gained;
      if (gained) G.popText(this.parts, W / 2, OY - 14, `+${gained}${this.combo > 1 ? `  x${this.combo}` : ''}`, '#ffcf5c', 18);
      G.sfx(this.combo > 2 ? 'power' : 'coin', .6);
      for (const k of kill) {
        if (keep.has(k)) continue;
        const r = Math.floor(k / N), c = k % N;
        this.g[r][c].dying = true; G.burst(this.parts, cx(c), cy(r), COLORS[this.g[r][c].t], 5, 120);
      }
      for (const m of make) Object.assign(this.g[m.r][m.c], {sp: m.sp, t: m.t, dying: false, fired: false});
      this.phase = 'clear'; this.clearT = .2;
    },
    collapse() {
      for (let c = 0; c < N; c++) {
        const col = [];
        for (let r = N - 1; r >= 0; r--) if (!this.g[r][c].dying) col.push(this.g[r][c]);
        let spawn = 0;
        for (let r = N - 1; r >= 0; r--) {
          const g = col.shift() || this.gem(Math.floor(G.rnd(6)), r, c, OY - S * (++spawn));
          this.g[r][c] = g; g.scale = 1;
        }
      }
      this.phase = 'fall';
    },
    reshuffle() {
      const all = this.g.flat(); G.shuffle(all);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) this.g[r][c] = all[r * N + c];
      G.popText(this.parts, W / 2, H / 2, 'SHUFFLE', '#c4c8ee', 22);
      this.phase = 'fall';
    },
    levelUp() {
      this.level++; this.moves = 25; this.levelScore = 0; this.target = Math.round(1200 * Math.pow(this.level, 1.25));
      G.sfx('win'); G.popText(this.parts, W / 2, H / 2, `LEVEL ${this.level}`, '#5ee6c1', 28); this.phase = 'idle';
    },
    cellAt(x, y) { const c = Math.floor((x - OX) / S), r = Math.floor((y - OY) / S); return r >= 0 && c >= 0 && r < N && c < N ? {r, c} : null; },
    pointer(type, x, y) {
      const cell = this.cellAt(x, y);
      if (type === 'down') { this.dragFrom = cell; if (!cell) return; if (this.sel && (this.sel.r !== cell.r || this.sel.c !== cell.c)) this.trySwap(this.sel, cell); else this.sel = cell; }
      if (type === 'move' && G.pointer.down && this.dragFrom && cell && (cell.r !== this.dragFrom.r || cell.c !== this.dragFrom.c)) {
        const d = {r: this.dragFrom.r + Math.sign(cell.r - this.dragFrom.r) * (Math.abs(cell.r - this.dragFrom.r) >= Math.abs(cell.c - this.dragFrom.c) ? 1 : 0), c: this.dragFrom.c + Math.sign(cell.c - this.dragFrom.c) * (Math.abs(cell.c - this.dragFrom.c) > Math.abs(cell.r - this.dragFrom.r) ? 1 : 0)};
        this.trySwap(this.dragFrom, d); this.dragFrom = null;
      }
    },
    key(k) {
      const dirs = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
      if (k === 'h') { this.hint = this.findMove(); return; }
      if (k === ' ' || k === 'Enter') { this.sel = this.sel ? null : {...this.cursor}; return; }
      const d = dirs[k]; if (!d) return;
      const next = {r: G.clamp(this.cursor.r + d[0], 0, N - 1), c: G.clamp(this.cursor.c + d[1], 0, N - 1)};
      if (this.sel) this.trySwap(this.sel, next);
      this.cursor = next;
    },
    update(dt) {
      let moving = false;
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = this.g[r][c], tx = cx(c), ty = cy(r);
        const sp = 900 * dt;
        if (Math.abs(g.x - tx) > .5) { g.x += G.clamp(tx - g.x, -sp, sp); moving = true; } else g.x = tx;
        if (Math.abs(g.y - ty) > .5) { g.y += G.clamp(ty - g.y, -sp, sp); moving = true; } else g.y = ty;
        if (g.dying) g.scale = Math.max(0, g.scale - dt * 5);
      }
      if (this.phase === 'swap' && !moving) this.afterSwap();
      else if (this.phase === 'back' && !moving) this.phase = 'idle';
      else if (this.phase === 'clear' && (this.clearT -= dt) <= 0) this.collapse();
      else if (this.phase === 'fall' && !moving) this.resolve();
      if (this.phase === 'idle' && (this.idleT += dt) > 7 && !this.hint) this.hint = this.findMove();
    },
    draw(ctx, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d1446'); bg.addColorStop(1, '#0d0b24');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      G.rr(OX - 6, OY - 6, N * S + 12, N * S + 12, 14, 'rgba(0,0,0,.35)');
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) G.rr(OX + c * S + 2, OY + r * S + 2, S - 4, S - 4, 8, (r + c) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)');
      const now = performance.now() / 1000;
      ctx.save(); ctx.beginPath(); ctx.rect(OX - 6, OY - 6, N * S + 12, N * S + 12); ctx.clip();
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const g = this.g[r][c], rad = 20 * g.scale;
        if (rad <= 0) continue;
        const isHint = this.hint && this.hint.some(p => p.r === r && p.c === c);
        shape(ctx, g.t, g.x, g.y + (isHint ? Math.sin(now * 10) * 3 : 0), rad);
        if (g.sp === 'row' || g.sp === 'col') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); if (g.sp === 'row') { ctx.moveTo(g.x - 18, g.y); ctx.lineTo(g.x + 18, g.y); } else { ctx.moveTo(g.x, g.y - 18); ctx.lineTo(g.x, g.y + 18); } ctx.stroke(); }
        if (g.sp === 'bomb') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(g.x, g.y, rad + 2 + Math.sin(now * 6) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
        if (g.sp === 'star') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; G.circle(g.x, g.y, rad + 6, `hsla(${now * 200 % 360} 90% 60% / .5)`); ctx.restore(); }
      }
      ctx.restore();
      if (this.sel) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(OX + this.sel.c * S + 2, OY + this.sel.r * S + 2, S - 4, S - 4, 8); ctx.stroke(); }
      if (performance.now() - G.pointer.used > 3000) { ctx.strokeStyle = 'rgba(255,207,92,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(OX + this.cursor.c * S + 4, OY + this.cursor.r * S + 4, S - 8, S - 8, 8); ctx.stroke(); }
      G.fx(this.parts, dt);
      G.text(`LEVEL ${this.level}`, 18, 32, {size: 18, display: true, color: '#ffcf5c'});
      G.bar({x: 18, y: 44, w: 300, h: 14, v: this.levelScore, max: this.target, color: '#5ee6c1', label: `TARGET ${this.levelScore}/${this.target}`, id: 'goal'});
      G.bar({x: 18, y: 66, w: 300, h: 14, v: this.moves, max: 25, color: this.moves <= 5 ? '#ff4b62' : '#ffcf5c', label: `MOVES ${this.moves}`, id: 'moves'});
      if (this.combo > 1) G.text(`Cascade x${this.combo}`, W - 18, 76, {size: 16, align: 'right', weight: 700, color: '#ff9f5c'});
    }
  });
})();

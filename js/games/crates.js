(() => {
  // Push every crate onto a star. Levels are made by pulling crates backwards from a solved room, so each one has an answer.
  const W = 640, H = 560;
  const ASSETS = ['down', 'up', 'left', 'right'].map(d => `img/kid4_${d}_0.png`);
  const D = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};

  function build(n) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const R = G.seeded(n * 131 + 7 + attempt * 999), w = Math.min(10, 6 + Math.floor(n / 8)), h = Math.min(9, 6 + Math.floor(n / 10));
      const m = Array.from({length: h}, (_, y) => Array.from({length: w}, (_, x) => x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 1 : 0));
      for (let i = 0; i < Math.floor(w * h * .1); i++) { const x = 1 + R.int(w - 2), y = 1 + R.int(h - 2); m[y][x] = 1; }
      const free = []; for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (!m[y][x]) free.push([x, y]);
      const count = Math.min(5, 1 + Math.floor(n / 7)); if (free.length < count + 4) continue;
      const goals = R.shuffle(free.slice()).slice(0, count), crates = goals.map(g => g.slice());
      let p = R.pick(free.filter(f => !goals.some(g => g[0] === f[0] && g[1] === f[1])));
      const at = (arr, x, y) => arr.findIndex(c => c[0] === x && c[1] === y);
      let pulls = 0; const want = 8 + n * 3;
      for (let k = 0; k < want * 12 && pulls < want; k++) { // pull: the player steps back while dragging the crate in front of them
        let [dx, dy] = R.pick(Object.values(D));
        const near = crates.some(c => Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) === 1);
        if (!near && R() < .6) { const c = R.pick(crates); [dx, dy] = Math.abs(c[0] - p[0]) > Math.abs(c[1] - p[1]) ? [Math.sign(c[0] - p[0]), 0] : [0, Math.sign(c[1] - p[1])]; if (!dx && !dy) dx = 1; } // wander toward a crate
        else if (near && R() < .5) { const c = crates.find(c => Math.abs(c[0] - p[0]) + Math.abs(c[1] - p[1]) === 1); [dx, dy] = [c[0] - p[0], c[1] - p[1]]; } // face it, ready to pull
        const cx = p[0] + dx, cy = p[1] + dy, bx = p[0] - dx, by = p[1] - dy;
        if (!dx && !dy) continue;
        if (m[by]?.[bx] || at(crates, bx, by) >= 0) continue;
        const ci = at(crates, cx, cy);
        if (ci >= 0 && R() < .7) { crates[ci] = [p[0], p[1]]; pulls++; }
        p = [bx, by];
      }
      if (crates.every(c => goals.some(g => g[0] === c[0] && g[1] === c[1])) || pulls < Math.min(want, 3 + n)) continue; // too easy: try again
      return {m, w, h, goals, crates, p, pulls};
    }
    return build(Math.max(1, n - 1));
  }

  GameBox.register({
    id: 'crates', title: 'Crate Push', genre: 'Puzzle', kind: 'Box pushing', w: W, h: H, levels: 50, assets: ASSETS, thumb: 'jpg',
    hint: 'Push every crate onto a star. You can push but not pull! Z to undo, R to restart.',
    desc: 'A warehouse puzzle. Walk around and push the wooden crates onto the glowing stars. You can only push, never pull, so think before you shove one into a corner. Undo as often as you like. Fifty rooms that start with one crate and end with five, all made so they can be solved.',
    controls: [['Arrows / WASD', 'Walk and push'], ['Z / Backspace', 'Undo'], ['R', 'Restart the room']],
    info() { return `Room ${G.level} · Moves ${this.moves}`; },
    init() { this.L = build(G.level); this.reset(); },
    reset() { const L = this.L; this.p = L.p.slice(); this.crates = L.crates.map(c => c.slice()); this.moves = 0; this.hist = []; this.dir = 'down'; this.done = null; this.t = 0; this.parts = []; },
    key(k) {
      if (this.done) return; const k2 = k.toLowerCase();
      if (k2 === 'z' || k === 'Backspace') { const h = this.hist.pop(); if (h) { this.p = h.p; this.crates = h.c; this.moves--; G.sfx('click', .5); } return; }
      if (k2 === 'r') { this.reset(); return; }
      const dir = {arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right'}[k2]; if (!dir) return;
      this.dir = dir; const [dx, dy] = D[dir], nx = this.p[0] + dx, ny = this.p[1] + dy, m = this.L.m;
      if (m[ny][nx]) return;
      const ci = this.crates.findIndex(c => c[0] === nx && c[1] === ny);
      if (ci >= 0) { const bx = nx + dx, by = ny + dy; if (m[by][bx] || this.crates.some(c => c[0] === bx && c[1] === by)) { G.sfx('click', .3); return; } this.hist.push({p: this.p.slice(), c: this.crates.map(c => c.slice())}); this.crates[ci] = [bx, by]; G.sfx('step', .6); if (this.L.goals.some(g => g[0] === bx && g[1] === by)) G.sfx('coin', .5); }
      else this.hist.push({p: this.p.slice(), c: this.crates.map(c => c.slice())});
      this.p = [nx, ny]; this.moves++;
      if (this.crates.every(c => this.L.goals.some(g => g[0] === c[0] && g[1] === c[1]))) { G.party(); G.score += 300 + G.level * 30 + Math.max(0, 200 - this.moves * 2); const par = this.L.pulls * 2 + 6; this.done = {t: 1, go: () => G.win(this.moves <= par ? 3 : this.moves <= par * 1.6 ? 2 : 1, `Solved in ${this.moves} moves`)}; }
    },
    pointer(type, x, y) { if (type !== 'down' || this.done) return; const {s, ox, oy} = this.view(), dx = x - (ox + (this.p[0] + .5) * s), dy = y - (oy + (this.p[1] + .5) * s); if (Math.abs(dx) > Math.abs(dy)) this.key(dx > 0 ? 'ArrowRight' : 'ArrowLeft'); else this.key(dy > 0 ? 'ArrowDown' : 'ArrowUp'); },
    view() { const L = this.L, s = Math.floor(Math.min((W - 40) / L.w, (H - 90) / L.h)); return {s, ox: (W - L.w * s) / 2, oy: 70 + (H - 90 - L.h * s) / 2}; },
    update(dt) { this.t += dt; if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); },
    draw(ctx, dt) {
      G.clear('#2a2236'); const L = this.L, {s, ox, oy} = this.view();
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const px = ox + x * s, py = oy + y * s;
        if (L.m[y][x]) { G.rr(px, py, s, s, 4, '#5a4a6a'); G.rr(px + 3, py + 3, s - 6, s * .45, 3, '#6a5a7a'); }
        else { ctx.fillStyle = (x + y) % 2 ? '#c8b89a' : '#d2c2a4'; ctx.fillRect(px, py, s, s); }
      }
      for (const [gx, gy] of L.goals) { G.star(ox + (gx + .5) * s, oy + (gy + .5) * s, s * .3, `rgba(255,207,92,${.6 + Math.sin(this.t * 4) * .2})`); }
      for (const [cx, cy] of this.crates) {
        const on = L.goals.some(g => g[0] === cx && g[1] === cy), px = ox + cx * s, py = oy + cy * s;
        G.rr(px + 4, py + 6, s - 6, s - 6, 6, 'rgba(0,0,0,.25)'); G.rr(px + 3, py + 3, s - 6, s - 6, 6, on ? '#e8a83a' : '#b87a3a');
        ctx.strokeStyle = on ? '#8a5a1a' : '#7a4a1a'; ctx.lineWidth = 3; ctx.strokeRect(px + 8, py + 8, s - 16, s - 16); ctx.beginPath(); ctx.moveTo(px + 8, py + 8); ctx.lineTo(px + s - 8, py + s - 8); ctx.stroke();
        if (on) G.star(px + s / 2, py + s / 2, s * .16, '#fff6c0');
      }
      const img = G.img(`img/kid4_${this.dir}_0.png`); if (img.complete) ctx.drawImage(img, ox + this.p[0] * s - s * .45, oy + this.p[1] * s - s * .85, s * 1.9, s * 1.9);
      const onGoal = this.crates.filter(c => L.goals.some(g => g[0] === c[0] && g[1] === c[1])).length;
      G.text(`ROOM ${G.level}`, 20, 34, {size: 18, weight: 800, color: '#fff'}); G.text(`★ ${onGoal}/${L.goals.length}`, W / 2, 34, {size: 18, align: 'center', weight: 800, color: '#ffcf5c'}); G.text(`MOVES ${this.moves}`, W - 20, 34, {size: 16, align: 'right', weight: 800, color: '#fff'});
      G.text('Z undo · R restart', W - 20, 54, {size: 11, align: 'right', weight: 700, color: 'rgba(255,255,255,.5)'});
    }
  });
})();

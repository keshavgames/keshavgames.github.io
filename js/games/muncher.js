(() => {
  // A maze chase: eat every seed while beetles hunt you. Sun berries turn the tables for a few seconds.
  const W = 640, H = 660, T = 28;
  const BEETLES = [{c: '#ff5b6b', name: 'chaser'}, {c: '#ff9fd8', name: 'ambusher'}, {c: '#5ee6e0', name: 'flanker'}, {c: '#ffb84a', name: 'wanderer'}];

  function maze(n) { // a mirrored maze carved by random walks so it loops and stays open
    const R = G.seeded(n * 37 + 2), cw = 21, ch = 21, half = Math.ceil(cw / 2);
    const m = Array.from({length: ch}, () => new Array(cw).fill(1));
    const carve = (x, y) => { m[y][x] = 0; m[y][cw - 1 - x] = 0; };
    const stack = [[1, 1]]; carve(1, 1); const seen = new Set(['1,1']);
    while (stack.length) { const [x, y] = stack.at(-1), opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, x + dx / 2, y + dy / 2]).filter(([a, b]) => a > 0 && b > 0 && a < half && b < ch - 1 && !seen.has(a + ',' + b)); if (!opts.length) { stack.pop(); continue; } const [a, b, mx, my] = R.pick(opts); seen.add(a + ',' + b); carve(mx, my); carve(a, b); stack.push([a, b]); }
    for (let i = 0; i < 40; i++) { const x = 1 + R.int(half - 1), y = 1 + R.int(ch - 2); if (m[y][x] && ((m[y][x - 1] === 0 && m[y][x + 1] === 0) || (m[y - 1]?.[x] === 0 && m[y + 1]?.[x] === 0))) carve(x, y); }
    for (let x = 1; x < cw - 1; x++) carve(x, 1), carve(x, ch - 2), carve(x, 10); for (let y = 1; y < ch - 1; y++) carve(1, y), carve(half - 1, y);
    for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) m[y][x] = (y === 8 || y === 12 || x === 8 || x === 12) && !(y === 8 && x === 10) ? 1 : 0; // the beetle nest
    return m;
  }

  GameBox.register({
    id: 'muncher', title: 'Maze Muncher', genre: 'Arcade', kind: 'Maze chase', w: W, h: H, levels: 50, assets: [], thumb: 'jpg',
    hint: 'Eat every seed! Avoid the beetles, or eat a glowing sun berry and chase them back!',
    desc: 'Munchy the round green critter is hungry. Steer through the maze and gobble every seed while four beetles hunt you down: one chases, one sneaks ahead of you, one flanks and one wanders. Grab a glowing sun berry and the beetles turn blue and scared, so you can chase them home. Fifty mazes with faster beetles.',
    controls: [['Arrows / WASD', 'Steer'], ['Swipe / click a side', 'Steer']],
    info() { return `Maze ${G.level} · Seeds left ${this.left}`; },
    init() {
      this.m = maze(G.level); this.seeds = this.m.map((r, y) => r.map((c, x) => c === 0 && !(y >= 9 && y <= 11 && x >= 9 && x <= 11) ? 1 : 0));
      for (const [x, y] of [[1, 1], [19, 1], [1, 19], [19, 19]]) if (this.m[y][x] === 0) this.seeds[y][x] = 2;
      this.seeds[15][10] = 0; this.left = this.seeds.flat().filter(Boolean).length;
      this.p = {x: 10, y: 15, fx: 10, fy: 15, dir: [0, 0], want: [-1, 0], mouth: 0};
      this.bugs = BEETLES.map((b, i) => ({...b, x: 9 + (i % 3), y: 10, fx: 9 + (i % 3), fy: 10, dir: [0, -1], out: 1.5 + i * 2.5, dead: 0}));
      this.scared = 0; this.lives = 3; this.t = 0; this.done = null; this.parts = []; this.combo = 0; this.hurt = 0;
    },
    open(x, y) { return this.m[y]?.[x] === 0; },
    key(k) { const d = {arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0]}[k.toLowerCase()]; if (d) this.p.want = d; },
    pointer(type, x, y) { if (type !== 'down') return; const ox = (W - 21 * T) / 2, oy = 70, dx = x - (ox + (this.p.fx + .5) * T), dy = y - (oy + (this.p.fy + .5) * T); this.p.want = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; },
    step(o, sp, dt, choose) { // grid movement: pick a new direction at each cell centre
      const dist = sp * dt;
      if (o.x === o.fx && o.y === o.fy) { const d = choose(o); if (d && this.open(o.x + d[0], o.y + d[1])) { o.dir = d; o.fx = o.x + d[0]; o.fy = o.y + d[1]; } else o.dir = [0, 0]; }
      if (o.dir[0] || o.dir[1]) { o.px = (o.px ?? o.x) + o.dir[0] * dist; o.py = (o.py ?? o.y) + o.dir[1] * dist; if ((o.dir[0] && Math.sign(o.fx - o.px) !== o.dir[0]) || (o.dir[1] && Math.sign(o.fy - o.py) !== o.dir[1])) { o.x = o.fx; o.y = o.fy; o.px = o.x; o.py = o.y; } }
      else { o.px = o.x; o.py = o.y; }
    },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.hurt > 0) { this.hurt -= dt; return; }
      const n = G.level, p = this.p; this.scared -= dt; p.mouth += dt * 12;
      this.step(p, 5.2, dt, o => this.open(o.x + o.want[0], o.y + o.want[1]) ? o.want : this.open(o.x + o.dir[0], o.y + o.dir[1]) ? o.dir : null);
      const s = this.seeds[p.y][p.x];
      if (s) { this.seeds[p.y][p.x] = 0; this.left--; G.score += s === 2 ? 50 : 10; if (s === 2) { this.scared = Math.max(3, 8 - n * .1); this.combo = 0; G.sfx('power'); } else if (this.left % 2) G.note(660 + (this.left % 4) * 40, .05, {type: 'square', vol: .03}); if (!this.left) { G.party(); G.score += 500 + n * 30; this.done = {t: 1, go: () => G.win(this.lives === 3 ? 3 : this.lives === 2 ? 2 : 1, 'Every seed munched!')}; return; } }
      const sp = Math.min(4.6, 3.2 + n * .028);
      for (const [i, b] of this.bugs.entries()) {
        if ((b.out -= dt) > 0) continue;
        if (b.dead > 0) { b.dead -= dt; if (b.dead <= 0) { b.x = b.fx = 10; b.y = b.fy = 10; b.px = 10; b.py = 10; } continue; }
        const target = this.scared > 0 ? [b.x < 10 ? 20 : 0, b.y < 10 ? 20 : 0] : i === 0 ? [p.x, p.y] : i === 1 ? [p.x + p.want[0] * 4, p.y + p.want[1] * 4] : i === 2 ? [p.x * 2 - this.bugs[0].x, p.y * 2 - this.bugs[0].y] : Math.hypot(b.x - p.x, b.y - p.y) > 7 ? [p.x, p.y] : [1, 19];
        this.step(b, this.scared > 0 ? sp * .55 : sp, dt, o => { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => this.open(o.x + d[0], o.y + d[1]) && !(d[0] === -o.dir[0] && d[1] === -o.dir[1])); if (!opts.length) return [-o.dir[0], -o.dir[1]]; if (i === 3 && Math.random() < .3) return G.pick(opts); return opts.sort((a, c) => Math.hypot(o.x + a[0] - target[0], o.y + a[1] - target[1]) - Math.hypot(o.x + c[0] - target[0], o.y + c[1] - target[1]))[0]; });
        if (Math.hypot((b.px ?? b.x) - (p.px ?? p.x), (b.py ?? b.y) - (p.py ?? p.y)) < .6) {
          if (this.scared > 0) { b.dead = 2.5; this.combo++; G.score += 100 * this.combo; G.sfx('coin'); G.popText(this.parts, (W - 21 * T) / 2 + (b.px + .5) * T, 70 + (b.py + .5) * T, `+${100 * this.combo}`, '#5cb8ff', 16); }
          else { this.lives--; G.sfx('hurt'); G.shake(8, .3); if (this.lives <= 0) { this.done = {t: 1, go: () => G.end('The beetles got Munchy')}; return; } this.hurt = 1; Object.assign(p, {x: 10, y: 15, fx: 10, fy: 15, px: 10, py: 15, dir: [0, 0]}); this.bugs.forEach((q, k) => Object.assign(q, {x: 9 + (k % 3), y: 10, fx: 9 + (k % 3), fy: 10, px: 9 + (k % 3), py: 10, out: 1 + k * 1.5, dir: [0, -1]})); return; }
        }
      }
    },
    draw(ctx) {
      G.clear('#141026'); const ox = (W - 21 * T) / 2, oy = 70;
      for (let y = 0; y < 21; y++) for (let x = 0; x < 21; x++) {
        const px = ox + x * T, py = oy + y * T;
        if (this.m[y][x]) { G.rr(px + 2, py + 2, T - 4, T - 4, 6, '#3a2a6a'); G.rr(px + 4, py + 4, T - 8, T / 2 - 4, 4, '#4a3a8a'); }
        const s = this.seeds[y][x]; if (s === 1) G.circle(px + T / 2, py + T / 2, 3, '#ffe8a0'); if (s === 2) { G.circle(px + T / 2, py + T / 2, 8 + Math.sin(this.t * 6) * 2, 'rgba(255,207,92,.35)'); G.circle(px + T / 2, py + T / 2, 6, '#ffcf5c'); }
      }
      const p = this.p, px = ox + ((p.px ?? p.x) + .5) * T, py = oy + ((p.py ?? p.y) + .5) * T, ang = Math.atan2(p.dir[1], p.dir[0] || (p.dir[1] ? 0 : 1)), mo = Math.abs(Math.sin(p.mouth)) * .6;
      if (this.hurt <= 0 || Math.floor(this.t * 10) % 2) { ctx.fillStyle = '#6ee86a'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, T * .45, ang + mo, ang + Math.PI * 2 - mo); ctx.closePath(); ctx.fill(); G.circle(px + Math.cos(ang - 1.2) * 6, py + Math.sin(ang - 1.2) * 6, 2.5, '#1a2a10'); }
      for (const b of this.bugs) {
        if (b.dead > 0) { const ex = ox + ((b.px ?? b.x) + .5) * T, ey = oy + ((b.py ?? b.y) + .5) * T; G.circle(ex - 4, ey, 3, '#fff'); G.circle(ex + 4, ey, 3, '#fff'); continue; }
        const bx = ox + ((b.px ?? b.x) + .5) * T, by = oy + ((b.py ?? b.y) + .5) * T, scared = this.scared > 0, flash = scared && this.scared < 1.5 && Math.floor(this.t * 8) % 2, col = scared ? (flash ? '#fff' : '#3a5ae8') : b.c;
        for (let k = -1; k <= 1; k++) { ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 8, by + k * 5); ctx.lineTo(bx - 13, by + k * 6 + Math.sin(this.t * 20 + k) * 2); ctx.moveTo(bx + 8, by + k * 5); ctx.lineTo(bx + 13, by + k * 6 - Math.sin(this.t * 20 + k) * 2); ctx.stroke(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(bx, by + 1, 10, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(bx, by - 8); ctx.lineTo(bx, by + 12); ctx.stroke();
        G.circle(bx, by - 9, 6, scared ? '#2a3aa8' : '#2a1a2a'); G.circle(bx - 3, by - 10, 2, '#fff'); G.circle(bx + 3, by - 10, 2, '#fff');
      }
      G.fx(this.parts, 0);
      G.text(`MAZE ${G.level}`, 20, 44, {size: 18, weight: 800, color: '#cfc4ff'}); G.text(`${this.left} seeds`, W / 2, 44, {size: 18, align: 'center', weight: 800, color: '#ffe8a0'});
      for (let i = 0; i < this.lives; i++) { ctx.fillStyle = '#6ee86a'; ctx.beginPath(); ctx.moveTo(W - 30 - i * 26, 38); ctx.arc(W - 30 - i * 26, 38, 10, .5, Math.PI * 2 - .5); ctx.closePath(); ctx.fill(); }
    }
  });
})();

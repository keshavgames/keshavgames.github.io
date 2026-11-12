(() => {
  const T = 32, FOV = 1.25, DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // # wall, : shadow floor (harder to spot you), $ gem, P start, X exit
  const LEVELS = [
    {map: ['####################', '#P.......#.........#', '#........#.........#', '#........#...::::..#', '#........#...:$::..#', '#........#...::::..#', '#..................#', '####.#####.........#', '#........#....######', '#........#.........#', '#....::..#.........#', '#....::............#', '#........#........X#', '#........#.........#', '####################'],
      guards: [[[11, 6], [17, 6], [17, 2], [11, 2]], [[11, 10], [17, 10]]], cams: []},
    {map: ['####################', '#P..#.......#......#', '#...#..:::..#..$...#', '#...#..:::..#......#', '#...####.####......#', '#..................#', '#.::.####.###.####.#', '#.::.#..........:#.#', '#....#..$.......:#.#', '#....#..........:#.#', '#....###.####.####.#', '#..................#', '#.####.########.##.#', '#.....:..........X.#', '####################'],
      guards: [[[1, 5], [18, 5]], [[6, 7], [15, 7], [15, 9], [6, 9]], [[18, 11], [1, 11]]], cams: [[10, 14, -Math.PI / 2]]},
    {map: ['####################', '#P.:.#........#....#', '#..:.#..####..#.$..#', '#..:.#..#$.#..#....#', '#....#..#..#..##.###', '#....#..##.#.......#', '#..................#', '###.####.####.######', '#.......:#.........#', '#..$....:#..::::...#', '#.......:#..::::...#', '#####.####......####', '#..................#', '#X.................#', '####################'],
      guards: [[[1, 6], [18, 6]], [[10, 8], [18, 8], [18, 10], [10, 10]], [[18, 12], [1, 12]], [[6, 1], [13, 1], [13, 5], [6, 5]]], cams: [[19, 9, Math.PI], [0, 12, 0]]}
  ];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  GameBox.register({
    id: 'stealth', title: 'Shadow Heist', genre: 'Adventure', kind: 'Top-down stealth', w: 640, h: 480,
    desc: 'Slip past patrolling guards and security cameras to steal every gem, then reach the exit. Stay out of their vision cones, hide in dark carpet to fill the detection bar more slowly, and only run when you must: guards hear footsteps.',
    controls: [['W A S D / Arrows', 'Sneak'], ['Shift', 'Run (guards hear it)']],
    info() { return `Level ${this.level}/3 · Gems ${this.got}/${this.total}`; },
    init() { this.level = 1; this.hp = 3; this.parts = []; this.load(); },
    load() {
      const L = LEVELS[this.level - 1];
      this.map = L.map.map(r => r.split(''));
      this.gems = []; this.got = 0;
      this.map.forEach((row, y) => row.forEach((c, x) => {
        if (c === 'P') { this.start = {x: x * T + 16, y: y * T + 16}; row[x] = '.'; }
        if (c === '$') { this.gems.push({x: x * T + 16, y: y * T + 16}); row[x] = '.'; }
        if (c === 'X') this.exit = {x, y};
      }));
      this.total = this.gems.length;
      this.guards = L.guards.map(route => ({route, wp: 0, x: route[0][0] * T + 16, y: route[0][1] * T + 16, ang: 0, path: [], state: 'patrol', look: 0, target: null, repath: 0}));
      // cameras sit on a wall tile; their eye is nudged out onto the floor so sight lines start in the room
      this.cams = L.cams.map(([x, y, a]) => ({x: x * T + 16 + Math.cos(a) * 17, y: y * T + 16 + Math.sin(a) * 17, base: a, ang: a}));
      this.p = {x: this.start.x, y: this.start.y, r: 9};
      this.alert = 0; this.alarm = 0; this.spotted = false; this.t = 0; this.noiseT = 0; this.seenBy = 0;
    },
    wall(tx, ty) { return (this.map[ty]?.[tx] ?? '#') === '#'; },
    los(ax, ay, bx, by) {
      const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6);
      for (let i = 1; i < n; i++) { const t = i / n; if (this.wall(Math.floor((ax + (bx - ax) * t) / T), Math.floor((ay + (by - ay) * t) / T))) return false; }
      return true;
    },
    path(sx, sy, tx, ty) { // BFS over tiles, returns tile centers to walk through
      const W = 20, H = 15, prev = new Int16Array(W * H).fill(-1), q = [sy * W + sx];
      prev[sy * W + sx] = sy * W + sx;
      for (let i = 0; i < q.length; i++) {
        const c = q[i], x = c % W, y = (c / W) | 0;
        if (x === tx && y === ty) break;
        for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = ny * W + nx; if (!this.wall(nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } }
      }
      const out = [], end = ty * W + tx;
      if (prev[end] < 0) return out;
      for (let c = end; c !== sy * W + sx; c = prev[c]) out.unshift({x: (c % W) * T + 16, y: ((c / W) | 0) * T + 16});
      return out;
    },
    sees(x, y, ang, range, fov) {
      const p = this.p, d = Math.hypot(p.x - x, p.y - y);
      if (d > range || Math.abs(angDiff(Math.atan2(p.y - y, p.x - x), ang)) > fov / 2 || !this.los(x, y, p.x, p.y)) return 0;
      return 1 - d / range;
    },
    goTo(g, x, y, state) { g.state = state; g.target = {x, y}; g.path = this.path(Math.floor(g.x / T), Math.floor(g.y / T), Math.floor(x / T), Math.floor(y / T)); g.repath = .5; },
    caught() {
      this.hp--; G.shake(10, .4); G.flash(); G.sfx('hurt');
      G.popText(this.parts, this.p.x, this.p.y - 20, 'CAUGHT!', '#ff6b8b', 20);
      if (this.hp <= 0) return G.end('Busted');
      const got = this.gems.map(g => g.got);
      this.load(); this.gems.forEach((g, i) => { g.got = got[i]; }); this.got = got.filter(Boolean).length;
    },
    update(dt) {
      const p = this.p;
      this.t += dt;
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      const running = !!G.keys.Shift && (mx || my);
      if (mx || my) {
        const l = Math.hypot(mx, my), sp = (running ? 150 : 85) * dt;
        p.x += mx / l * sp; p.y += my / l * sp;
        if (running && (this.noiseT -= dt) <= 0) { // footsteps carry to nearby guards
          this.noiseT = .4; G.sfx('step', .5);
          for (const g of this.guards) if (g.state !== 'chase' && G.dist(g.x, g.y, p.x, p.y) < 150) this.goTo(g, p.x, p.y, 'investigate');
        }
      }
      for (let ty = Math.floor((p.y - p.r) / T); ty <= Math.floor((p.y + p.r) / T); ty++)
        for (let tx = Math.floor((p.x - p.r) / T); tx <= Math.floor((p.x + p.r) / T); tx++) {
          if (!this.wall(tx, ty)) continue;
          const cx = G.clamp(p.x, tx * T, tx * T + T), cy = G.clamp(p.y, ty * T, ty * T + T), dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
          if (d < p.r && d > 0) { p.x = cx + dx / d * p.r; p.y = cy + dy / d * p.r; }
        }
      for (const g of this.gems) if (!g.got && G.dist(g.x, g.y, p.x, p.y) < 16) {
        g.got = true; this.got++; G.score += 250; G.sfx('coin'); G.burst(this.parts, g.x, g.y, '#5ee6c1', 14);
        if (this.got === this.total) { G.sfx('power'); G.popText(this.parts, p.x, p.y - 24, 'EXIT UNLOCKED', '#ffcf5c'); }
      }
      if (this.got === this.total && Math.floor(p.x / T) === this.exit.x && Math.floor(p.y / T) === this.exit.y) {
        G.score += 500 + (this.spotted ? 0 : 500) + Math.max(0, Math.round((90 - this.t) * 5));
        if (!this.spotted) G.popText(this.parts, p.x, p.y - 30, 'GHOST BONUS', '#5ee6c1', 18);
        G.sfx('win');
        if (this.level === 3) return G.end('Heist complete');
        this.level++; this.load(); return;
      }
      // detection
      const shadow = this.map[Math.floor(p.y / T)]?.[Math.floor(p.x / T)] === ':';
      let seen = 0;
      for (const g of this.guards) {
        const s = this.sees(g.x, g.y, g.ang, 170, FOV);
        if (s) { seen = Math.max(seen, s); g.saw = p.x; g.sawY = p.y; }
      }
      for (const c of this.cams) {
        c.ang = c.base + Math.sin(this.t * .8) * .7;
        const s = this.sees(c.x, c.y, c.ang, 190, .75);
        if (s) {
          seen = Math.max(seen, s * 1.2);
          for (const g of this.guards) if (g.state === 'patrol') this.goTo(g, p.x, p.y, 'investigate');
        }
      }
      this.seenBy = seen;
      if (seen) this.alert = Math.min(1, this.alert + (.6 + 2.4 * seen) * (shadow ? .35 : 1) * (running ? 1.4 : 1) * dt);
      else if (!this.alarm) this.alert = Math.max(0, this.alert - .25 * dt);
      if (this.alert >= 1) {
        if (!this.alarm) { G.sfx('laser'); G.shake(4, .3); }
        this.alarm = 5; this.spotted = true;
      }
      if (this.alarm > 0) {
        if (seen) this.alarm = 5;
        if ((this.alarm -= dt) <= 0) { this.alarm = 0; this.alert = .5; for (const g of this.guards) g.state = 'return'; }
      }
      // guards
      for (const g of this.guards) {
        g.repath -= dt;
        if (this.alarm > 0 && g.state !== 'chase' && (this.sees(g.x, g.y, g.ang, 200, FOV) || G.dist(g.x, g.y, p.x, p.y) < 260)) g.state = 'chase';
        if (g.state === 'chase' && g.repath <= 0) this.goTo(g, p.x, p.y, this.alarm > 0 ? 'chase' : 'return');
        if (g.state === 'patrol' && !g.path.length) {
          g.wp = (g.wp + 1) % g.route.length; const [wx, wy] = g.route[g.wp];
          this.goTo(g, wx * T + 16, wy * T + 16, 'patrol');
        }
        if (g.state === 'return' && !g.path.length) { const [wx, wy] = g.route[g.wp]; this.goTo(g, wx * T + 16, wy * T + 16, 'patrol'); }
        if (g.state === 'investigate' && !g.path.length) { g.look += dt; g.ang += Math.sin(g.look * 3) * 2 * dt; if (g.look > 2.5) { g.look = 0; g.state = 'return'; } }
        const speed = g.state === 'chase' ? 118 : g.state === 'investigate' ? 75 : 55;
        if (g.path.length) {
          const n = g.path[0], d = G.dist(g.x, g.y, n.x, n.y), s = speed * dt;
          const want = Math.atan2(n.y - g.y, n.x - g.x);
          g.ang += angDiff(want, g.ang) * Math.min(1, dt * 8);
          if (d <= s) { g.x = n.x; g.y = n.y; g.path.shift(); } else { g.x += (n.x - g.x) / d * s; g.y += (n.y - g.y) / d * s; }
        }
        if (G.dist(g.x, g.y, p.x, p.y) < 18) return this.caught();
      }
    },
    cone(ctx, x, y, ang, range, fov, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i <= 24; i++) {
        const a = ang - fov / 2 + fov * i / 24, cx = Math.cos(a), cy = Math.sin(a);
        let d = 0;
        while (d < range && !this.wall(Math.floor((x + cx * d) / T), Math.floor((y + cy * d) / T))) d += 6;
        ctx.lineTo(x + cx * d, y + cy * d);
      }
      ctx.closePath(); ctx.fill();
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      G.clear('#141526');
      this.map.forEach((row, ty) => row.forEach((c, tx) => {
        const x = tx * T, y = ty * T;
        if (c === '#') { G.rr(x, y, T, T, 0, '#363b5c'); ctx.fillStyle = '#454b72'; ctx.fillRect(x, y, T, 5); }
        else if (c === ':') G.rr(x, y, T, T, 0, '#0c0c18');
        else { ctx.fillStyle = (tx + ty) % 2 ? '#1c1e33' : '#1f2138'; ctx.fillRect(x, y, T, T); }
        if (c === 'X') {
          const open = this.got === this.total;
          G.rr(x + 3, y + 3, T - 6, T - 6, 6, open ? `rgba(94,230,193,${.5 + Math.sin(now * 5) * .3})` : '#3a2030');
          G.text('EXIT', x + 16, y + 20, {size: 9, align: 'center', weight: 700, color: open ? '#0b2a22' : '#9a5a6a'});
        }
      }));
      const coneColor = this.alarm > 0 ? 'rgba(255,80,100,.28)' : this.alert > .4 ? 'rgba(255,160,80,.22)' : 'rgba(255,230,140,.16)';
      for (const g of this.guards) this.cone(ctx, g.x, g.y, g.ang, 170, FOV, coneColor);
      for (const c of this.cams) { this.cone(ctx, c.x, c.y, c.ang, 190, .75, 'rgba(140,200,255,.16)'); G.rr(c.x - 7, c.y - 7, 14, 14, 3, '#5d6390'); G.circle(c.x + Math.cos(c.ang) * 5, c.y + Math.sin(c.ang) * 5, 3, '#ff6b8b'); }
      for (const gm of this.gems) if (!gm.got) G.gem(gm.x, gm.y + Math.sin(now * 3 + gm.x) * 2, 9, '#5ee6c1');
      for (const g of this.guards) {
        G.circle(g.x, g.y + 3, 11, 'rgba(0,0,0,.4)');
        G.circle(g.x, g.y, 11, g.state === 'chase' ? '#c4364a' : '#3d6fd9');
        G.circle(g.x + Math.cos(g.ang) * 4, g.y + Math.sin(g.ang) * 4, 6, '#f2d3b1');
        G.circle(g.x + Math.cos(g.ang) * 11, g.y + Math.sin(g.ang) * 11, 2.5, '#fff3c4');
        if (g.state === 'investigate') G.text('?', g.x, g.y - 16, {align: 'center', size: 16, weight: 700, color: '#ffcf5c'});
        if (g.state === 'chase') G.text('!', g.x, g.y - 16, {align: 'center', size: 18, weight: 700, color: '#ff6b8b'});
      }
      const p = this.p;
      if (G.state !== 'over') {
        const hidden = this.map[Math.floor(p.y / T)]?.[Math.floor(p.x / T)] === ':';
        ctx.globalAlpha = hidden ? .55 : 1;
        G.circle(p.x, p.y, 9, '#22233a'); ctx.strokeStyle = '#5ee6c1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.stroke();
        G.circle(p.x - 3, p.y - 1, 1.6, '#5ee6c1'); G.circle(p.x + 3, p.y - 1, 1.6, '#5ee6c1');
        ctx.globalAlpha = 1;
      }
      G.fx(this.parts, dt);
      G.panel(8, 6, 300, 22, 8);
      G.bar({x: 16, y: 11, w: 120, h: 12, v: this.hp, max: 3, color: '#e8577a', label: `LIVES ${this.hp}`, id: 'hp'});
      const ac = this.alarm > 0 ? (Math.floor(now * 6) % 2 ? '#ff4b62' : '#ffcf5c') : this.alert > .5 ? '#ff9f5c' : '#e8e9ff';
      G.bar({x: 146, y: 11, w: 150, h: 12, v: this.alarm > 0 ? 1 : this.alert, max: 1, color: ac, label: this.alarm > 0 ? 'ALARM' : 'DETECTION'});
      G.text(`GEMS ${this.got}/${this.total}  ·  LEVEL ${this.level}`, G.W - 12, 22, {align: 'right', size: 12, weight: 700, color: '#c4c8ee', shadow: true});
    }
  });
})();

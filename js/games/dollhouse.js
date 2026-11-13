(() => {
  // Top-down house at night. The doll only moves while no light is on it. Doll and kid are Blender sprites.
  const W = 800, H = 500, T = 48, RW = 8, RH = 6;
  const DIRS4 = ['down', 'up', 'left', 'right'];
  const ASSETS = ['img/doll_still.png', 'img/doll_reach.png', 'img/doll_face.png', ...DIRS4.flatMap(d => [0, 1, 2].map(f => `img/kid4_${d}_${f}.png`))];
  const FLOORS = [['#5a4430', '#4e3a28'], ['#4a3a3a', '#403232'], ['#3e4a40', '#344036'], ['#5a4c3a', '#4c4030']];
  const PAPER = ['#6a4a5a', '#4a5a6a', '#5a6a4a', '#6a5a4a', '#5a4a6a'];

  GameBox.register({
    id: 'dollhouse', title: 'Doll House', genre: 'Horror', kind: 'Top-down horror', w: W, h: H, levels: 50, assets: ASSETS, thumb: 'jpg',
    hint: 'The doll only moves in the dark. Keep your flashlight on it while you find the keys!',
    desc: 'You are locked inside a creaky old house with a porcelain doll that is never where you left it. It cannot move while your flashlight or a lamp is on it, so keep it in the light while you search the rooms for the keys to the front door. Turn your back and it comes for you. Fifty houses, more dolls as you go.',
    controls: [['WASD / Arrows', 'Walk'], ['Mouse', 'Aim the flashlight (or it points where you walk)'], ['Shift', 'Run']],
    info() { return `House ${G.level} · Keys ${this.keys}/${this.needKeys}`; },
    init() {
      const n = G.level, R = G.seeded(n * 71 + 3);
      const RX = this.RX = Math.min(5, 3 + Math.floor(n / 12)), RY = this.RY = Math.min(4, 2 + Math.floor(n / 12));
      const MW = this.MW = RX * (RW + 1) + 1, MH = this.MH = RY * (RH + 1) + 1;
      const m = this.map = Array.from({length: MH}, (_, y) => Array.from({length: MW}, (_, x) => (x % (RW + 1) === 0 || y % (RH + 1) === 0) ? 1 : 0));
      // doors: a random spanning tree over rooms plus a few extra loops
      const seen = new Set(['0,' + (RY - 1)]), stack = [[0, RY - 1]], door = (ax, ay, bx, by) => {
        if (ax !== bx) { const wx = Math.max(ax, bx) * (RW + 1), y0 = ay * (RH + 1) + 2 + R.int(RH - 3); m[y0][wx] = m[y0 + 1][wx] = 0; }
        else { const wy = Math.max(ay, by) * (RH + 1), x0 = ax * (RW + 1) + 2 + R.int(RW - 3); m[wy][x0] = m[wy][x0 + 1] = 0; }
      };
      while (stack.length) {
        const [cx, cy] = stack.at(-1), opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < RX && y < RY && !seen.has(x + ',' + y));
        if (!opts.length) { stack.pop(); continue; }
        const [nx, ny] = R.pick(opts); seen.add(nx + ',' + ny); door(cx, cy, nx, ny); stack.push([nx, ny]);
      }
      for (let i = 0; i < RX * RY / 3; i++) { const x = R.int(RX - 1), y = R.int(RY); door(x, y, x + 1, y); }
      // rooms: floor, paper, a lamp sometimes, furniture
      this.rooms = [];
      for (let ry = 0; ry < RY; ry++) for (let rx = 0; rx < RX; rx++) {
        const x0 = rx * (RW + 1) + 1, y0 = ry * (RH + 1) + 1, start = rx === 0 && ry === RY - 1;
        this.rooms.push({rx, ry, x0, y0, floor: R.pick(FLOORS), paper: R.pick(PAPER), lamp: !start && R() < Math.max(.12, .38 - n * .006)});
      }
      this.furn = [];
      const free = (x, y, w, h) => { for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const c = m[y + j]?.[x + i]; if (c === undefined) return false; if ((j >= 0 && j < h && i >= 0 && i < w) && c !== 0) return false; if (c === 0 && (j < 0 || j >= h || i < 0 || i >= w)) { /* keep a walkway */ } } return !this.furn.some(f => x < f.x + f.w + 1 && x + w + 1 > f.x && y < f.y + f.h + 1 && y + h + 1 > f.y); };
      for (const r of this.rooms) {
        const kinds = R.shuffle(['bed', 'table', 'shelf', 'piano', 'chest']).slice(0, 1 + R.int(2));
        for (const k of kinds) {
          const [w, h] = {bed: [2, 3], table: [2, 2], shelf: [3, 1], piano: [3, 1], chest: [2, 1]}[k];
          for (let tries = 0; tries < 20; tries++) {
            const x = r.x0 + 1 + R.int(RW - w - 1), y = k === 'shelf' || k === 'piano' ? r.y0 : r.y0 + 1 + R.int(RH - h - 1);
            if (!free(x, y, w, h) || (k !== 'shelf' && k !== 'piano' && y === r.y0)) continue;
            if (r.rx === 0 && r.ry === RY - 1 && x <= 5 && x + w >= 1 && y + h >= r.y0 + RH - 3) continue; // keep the spawn clear
            if (k === 'shelf' || k === 'piano') { let near = false; for (let i = -1; i <= w; i++) if (m[y - 1]?.[x + i] === 0) near = true; if (near) continue; }
            const f = {k, x, y, w, h}; this.furn.push(f); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[y + j][x + i] = 2; break;
          }
        }
        if (R() < .5) r.rug = {x: r.x0 + 2, y: r.y0 + 2, w: RW - 4, h: RH - 3, c: R.pick(['#6a2a2a', '#2a3a6a', '#4a5a2a'])};
      }
      const sr = this.rooms.find(r => r.rx === 0 && r.ry === RY - 1);
      this.p = {x: sr.x0 + 2.5, y: sr.y0 + RH - 1.5, a: -Math.PI / 2, dir: 'up', step: 0, moving: false};
      // reachability from the start; items and the exit only go on reachable tiles
      const dist = this.bfs(Math.floor(this.p.x), Math.floor(this.p.y));
      const cells = []; for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (m[y][x] === 0 && dist[y][x] > 0) cells.push([x, y, dist[y][x]]);
      cells.sort((a, b) => b[2] - a[2]);
      const far = this.rooms.filter(r => r.ry === 0).sort((a, b) => b.rx - a.rx)[0]; // front door: top row, far side
      const spotsX = []; for (let x = far.x0 + 1; x < far.x0 + RW - 1; x++) if (dist[far.y0][x] > 0) spotsX.push(x);
      const ex = spotsX.length ? R.pick(spotsX) : far.x0 + 3; m[far.y0][ex] = 0; m[0][ex] = 3; this.exit = {x: ex, y: 0};
      this.needKeys = Math.min(5, 2 + Math.floor(n / 10)); this.keys = 0;
      const pool = R.shuffle(cells.filter(c => c[2] > 6)), picks = [];
      for (const c of pool) { if (picks.length >= this.needKeys) break; if (picks.every(q => Math.hypot(q[0] - c[0], q[1] - c[1]) > 5)) picks.push(c); }
      this.items = picks.map(([x, y]) => ({x: x + .5, y: y + .5, got: false}));
      const dolls = Math.min(3, 1 + Math.floor(n / 15));
      this.dolls = cells.slice(0, Math.max(1, cells.length / 3 | 0)).filter((_, i) => i % 7 === 0).slice(0, dolls).map(([x, y]) => ({x: x + .5, y: y + .5, path: [], repath: 0, lit: true, wasLit: true, twitch: 0, moved: 0}));
      while (this.dolls.length < dolls) this.dolls.push({...this.dolls[0], path: []});
      this.lives = n <= 8 ? 3 : n <= 45 ? 2 : 1; this.scare = 0; this.dying = 0; this.t = 0; this.hurtT = 0; this.parts = []; this.beatT = 0; this.mouseT = -9;
      this.msg = `Find ${this.needKeys} keys, then the front door.`; this.msgT = 3.5;
      this.cx = this.p.x * T - W / 2; this.cy = this.p.y * T - H / 2;
    },
    bfs(sx, sy) {
      const m = this.map, d = m.map(r => r.map(() => -1)), q = [[sx, sy]]; d[sy][sx] = 0;
      for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if ((m[ny]?.[nx] === 0 || m[ny]?.[nx] === 3) && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } } }
      return d;
    },
    solid(x, y) { const c = this.map[Math.floor(y)]?.[Math.floor(x)]; return c === undefined || c === 1 || c === 2 || (c === 3 && this.keys < this.needKeys); },
    roomAt(x, y) { return this.rooms.find(r => x >= r.x0 && x < r.x0 + RW && y >= r.y0 && y < r.y0 + RH); },
    see(ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), steps = Math.ceil(d * 4); for (let i = 1; i < steps; i++) { const t = i / steps, c = this.map[Math.floor(ay + (by - ay) * t)]?.[Math.floor(ax + (bx - ax) * t)]; if (c === 1) return false; } return true; },
    litBy(dl) { // the doll is frozen if a lamp lights its room, or your flashlight is on it
      const p = this.p, r = this.roomAt(dl.x, dl.y);
      if (r && r.lamp && this.lampOn(r)) return true;
      const dx = dl.x - p.x, dy = dl.y - p.y, d = Math.hypot(dx, dy);
      let rel = Math.atan2(dy, dx) - p.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      return d < 7.5 && Math.abs(rel) < .5 && this.see(p.x, p.y, dl.x, dl.y);
    },
    lampOn(r) { return Math.sin(this.t * 7 + r.x0) + Math.sin(this.t * 2.3 + r.y0 * 3) > -1.6; },
    pointer(type, x, y) { if (type !== 'up') this.mouseT = this.t; },
    update(dt) {
      const p = this.p, n = G.level;
      this.t += dt; this.msgT -= dt; this.hurtT -= dt;
      if (this.dying > 0) { this.dying -= dt; this.scare -= dt; if (this.dying <= 0) G.end('The doll wants to play forever'); return; }
      if (this.scare > 0) { this.scare -= dt; return; }
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      p.moving = mx || my;
      if (p.moving) {
        const sp = (G.keys.Shift ? 5.4 : 4) * dt, l = Math.hypot(mx, my), vx = mx / l * sp, vy = my / l * sp, r = .28;
        const ok = (x, y) => !this.solid(x - r, y - r) && !this.solid(x + r, y - r) && !this.solid(x - r, y + r) && !this.solid(x + r, y + r);
        if (ok(p.x + vx, p.y)) p.x += vx; if (ok(p.x, p.y + vy)) p.y += vy;
        p.step += sp; p.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up');
        if (p.step > .9) { p.step = 0; G.sfx('step', .3); }
      }
      // aim: the mouse if it moved recently, otherwise where you walk
      let want = p.a;
      if (this.t - this.mouseT < 2.5) want = Math.atan2(G.pointer.y + this.cy - p.y * T, G.pointer.x + this.cx - p.x * T);
      else if (p.moving) want = Math.atan2(my, mx);
      p.a += Math.atan2(Math.sin(want - p.a), Math.cos(want - p.a)) * Math.min(1, dt * 10);
      if (this.t - this.mouseT < 2.5) { const c = Math.cos(p.a), s = Math.sin(p.a); p.dir = Math.abs(c) > Math.abs(s) ? (c > 0 ? 'right' : 'left') : (s > 0 ? 'down' : 'up'); }
      for (const it of this.items) if (!it.got && Math.hypot(it.x - p.x, it.y - p.y) < .7) {
        it.got = true; this.keys++; G.sfx('coin'); G.score += 150; G.burst(this.parts, it.x * T - this.cx, it.y * T - this.cy, '#ffcf5c', 18);
        this.msg = this.keys < this.needKeys ? `Key ${this.keys} of ${this.needKeys}!` : 'The front door is unlocked!'; this.msgT = 2.5;
        if (this.keys === this.needKeys) G.sfx('power');
      }
      if (this.keys === this.needKeys && Math.hypot(this.exit.x + .5 - p.x, this.exit.y + .5 - p.y) < 1) {
        G.score += 900 + n * 40; return G.win(this.lives === (n <= 8 ? 3 : n <= 45 ? 2 : 1) ? 3 : this.lives > 1 ? 2 : 1, 'You escaped the house!');
      }
      // dolls
      let nearest = 99;
      const speed = Math.min(5, 2.3 + n * .05);
      for (const dl of this.dolls) {
        dl.lit = this.litBy(dl); dl.twitch -= dt;
        const d = Math.hypot(dl.x - p.x, dl.y - p.y); nearest = Math.min(nearest, d);
        if (dl.lit) { if (!dl.wasLit && d < 8) { dl.twitch = .25; G.sfx('click', .6); } dl.wasLit = true; continue; }
        if (dl.wasLit) { dl.wasLit = false; dl.wait = Math.max(.25, .8 - n * .01); if (d < 9) G.sfx('select', .25); }
        if ((dl.wait -= dt) > 0) continue; // it waits a moment before it dares to move
        if (d < 4 && Math.random() < dt * 2) G.sfx('step', .35 * (1 - d / 4) + .1);
        if ((dl.repath -= dt) <= 0) {
          dl.repath = .35; const dd = this.bfs(Math.floor(p.x), Math.floor(p.y));
          let cx = Math.floor(dl.x), cy = Math.floor(dl.y); const path = [];
          for (let k = 0; k < 60 && dd[cy]?.[cx] > 0; k++) { let best = null; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = dd[cy + oy]?.[cx + ox]; if (v >= 0 && v < dd[cy][cx] && (!best || v < best[2])) best = [cx + ox, cy + oy, v]; } if (!best) break; cx = best[0]; cy = best[1]; path.push([cx + .5, cy + .5]); }
          dl.path = path;
        }
        let step = speed * dt;
        while (step > 0 && dl.path.length) { const [tx, ty] = dl.path[0], dd2 = Math.hypot(tx - dl.x, ty - dl.y); if (dd2 <= step) { dl.x = tx; dl.y = ty; dl.path.shift(); step -= dd2; } else { dl.x += (tx - dl.x) / dd2 * step; dl.y += (ty - dl.y) / dd2 * step; step = 0; } }
        if (!dl.path.length && d < 1.2) { dl.x += (p.x - dl.x) * Math.min(1, dt * 3); dl.y += (p.y - dl.y) * Math.min(1, dt * 3); }
        if (Math.hypot(dl.x - p.x, dl.y - p.y) < .55) return this.grab(dl);
      }
      this.nearest = nearest;
      if (nearest < 6 && (this.beatT -= dt) <= 0) { this.beatT = .25 + nearest * .1; G.sfx('beat', 1.2 - nearest / 6); }
      const tx = p.x * T - W / 2, ty = p.y * T - H / 2;
      this.cx += (Math.max(-T, Math.min(this.MW * T - W + T, tx)) - this.cx) * Math.min(1, dt * 6);
      this.cy += (Math.max(-T * 2, Math.min(this.MH * T - H + T, ty)) - this.cy) * Math.min(1, dt * 6);
    },
    grab(dl) {
      G.scream(1, 1.5); G.sfx('boom', .9); G.shake(18, .9); G.flash('rgba(140,0,0,.7)', .6);
      if (--this.lives <= 0) { this.scare = 1.6; this.dying = 1.6; return; }
      this.scare = .8;
      const cells = []; for (let y = 1; y < this.MH - 1; y++) for (let x = 1; x < this.MW - 1; x++) if (this.map[y][x] === 0 && Math.hypot(x - this.p.x, y - this.p.y) > 9) cells.push([x, y]);
      const c = G.pick(cells.length ? cells : [[1, 1]]); dl.x = c[0] + .5; dl.y = c[1] + .5; dl.path = [];
      this.msg = `It let go… ${this.lives} ${this.lives > 1 ? 'lives' : 'life'} left`; this.msgT = 2.5;
    },
    drawFurn(ctx, f, sx, sy) {
      const w = f.w * T, h = f.h * T;
      if (f.k === 'bed') { G.rr(sx + 2, sy + 2, w - 4, h - 4, 6, '#3a2418'); G.rr(sx + 6, sy + 12, w - 12, h - 18, 5, '#c8c0b0'); G.rr(sx + 8, sy + 14, w - 16, 26, 6, '#efe8da'); G.rr(sx + 6, sy + 48, w - 12, h - 56, 5, '#6a3a4a'); ctx.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 4; i++) ctx.fillRect(sx + 10, sy + 56 + i * 20, w - 20, 3); }
      if (f.k === 'table') { G.rr(sx + 4, sy + 8, w - 8, h - 14, 6, '#5a3a22'); G.rr(sx + 4, sy + 4, w - 8, h - 22, 6, '#7a5232'); G.circle(sx + w / 2, sy + h / 2 - 8, 10, '#d8d0c0'); G.rr(sx + w / 2 - 3, sy + h / 2 - 24, 6, 12, 2, '#efe6c8'); }
      if (f.k === 'shelf') { G.rr(sx, sy - 22, w, h + 18, 3, '#4a2e1a'); for (let i = 0; i < 2; i++) { ctx.fillStyle = '#2a1a10'; ctx.fillRect(sx + 4, sy - 16 + i * 20, w - 8, 3); for (let b = 0; b < 9; b++) { ctx.fillStyle = ['#6a2a2a', '#2a4a6a', '#4a6a2a', '#6a5a2a'][(b + i) % 4]; ctx.fillRect(sx + 8 + b * (w - 16) / 9, sy - 30 + i * 20 + 16, (w - 16) / 9 - 3, 14); } } }
      if (f.k === 'piano') { G.rr(sx, sy - 20, w, h + 16, 4, '#141010'); ctx.fillStyle = '#efe8da'; ctx.fillRect(sx + 6, sy + 16, w - 12, 12); ctx.fillStyle = '#141010'; for (let b = 0; b < 14; b++) if (b % 7 !== 2 && b % 7 !== 6) ctx.fillRect(sx + 10 + b * (w - 20) / 14, sy + 16, 5, 7); }
      if (f.k === 'chest') { G.rr(sx + 4, sy + 6, w - 8, h - 8, 5, '#6a4224'); ctx.fillStyle = '#c9a227'; ctx.fillRect(sx + 4, sy + 16, w - 8, 4); ctx.fillRect(sx + w / 2 - 4, sy + 12, 8, 12); }
    },
    draw(ctx, dt) {
      const p = this.p, cx = Math.round(this.cx), cy = Math.round(this.cy), m = this.map;
      if (this.scare > 0 && (this.dying < 1.2 || !this.dying)) {
        G.clear('#000'); const face = G.img('img/doll_face.png'), k = this.dying ? 1.2 - this.dying : .8 - this.scare, s = Math.min(1.3, .55 + k * 1.6) * H * 1.3;
        if (face.complete && face.naturalWidth) { const j = (Math.random() - .5) * 24; ctx.drawImage(face, W / 2 - s / 2 + j, H / 2 - s * .5 + j, s, s); }
        ctx.fillStyle = `rgba(140,0,0,${.15 + Math.random() * .15})`; ctx.fillRect(0, 0, W, H); return;
      }
      G.clear('#050407');
      const x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.min(this.MW - 1, Math.ceil((cx + W) / T)), y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(this.MH - 1, Math.ceil((cy + H) / T) + 1);
      for (const r of this.rooms) { // floors and rugs
        const sx = r.x0 * T - cx, sy = r.y0 * T - cy;
        if (sx > W || sy > H || sx + RW * T < 0 || sy + RH * T < 0) continue;
        for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) { ctx.fillStyle = r.floor[(i + j) % 2]; ctx.fillRect(sx + i * T, sy + j * T, T, T); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(sx + i * T, sy + j * T + T - 2, T, 2); }
        if (r.rug) { G.rr(r.rug.x * T - cx, r.rug.y * T - cy, r.rug.w * T, r.rug.h * T, 8, r.rug.c); ctx.strokeStyle = 'rgba(255,220,160,.25)'; ctx.lineWidth = 3; ctx.strokeRect(r.rug.x * T - cx + 8, r.rug.y * T - cy + 8, r.rug.w * T - 16, r.rug.h * T - 16); }
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((m[y][x] === 0 || m[y][x] === 3) && m[y - 1]?.[x] === 1) { const r = this.roomAt(x, y) || this.rooms[0]; ctx.fillStyle = r.paper; ctx.fillRect(x * T - cx, y * T - cy - 30, T, 30); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x * T - cx, y * T - cy - 4, T, 4); }
      const ents = [];
      for (const f of this.furn) ents.push({y: f.y + f.h, draw: () => this.drawFurn(ctx, f, f.x * T - cx, f.y * T - cy)});
      for (const it of this.items) if (!it.got) ents.push({y: it.y, draw: () => { const x = it.x * T - cx, yy = it.y * T - cy + Math.sin(this.t * 3) * 4; G.circle(x - 6, yy, 7, '#ffcf5c'); G.circle(x - 6, yy, 3, '#4a3420'); G.rr(x, yy - 3, 16, 5, 2, '#ffcf5c'); G.rr(x + 10, yy + 1, 3, 6, 1, '#ffcf5c'); }});
      for (const dl of this.dolls) ents.push({y: dl.y, draw: () => { const img = G.img(dl.lit ? 'img/doll_still.png' : 'img/doll_reach.png'); if (!img.complete || !img.naturalWidth) return; const j = dl.twitch > 0 ? (Math.random() - .5) * 6 : 0; ctx.drawImage(img, dl.x * T - cx - 48 + j, dl.y * T - cy - 112, 96, 128); }});
      ents.push({y: p.y, draw: () => { const f = p.moving ? 1 + Math.floor(this.t * 8) % 2 : 0, img = G.img(`img/kid4_${p.dir}_${f}.png`); if (img.complete && img.naturalWidth) ctx.drawImage(img, p.x * T - cx - 48, p.y * T - cy - 82, 96, 96); }});
      // walls drawn row by row so things in front of a wall cover it
      ents.sort((a, b) => a.y - b.y);
      let e = 0;
      for (let y = y0; y <= y1; y++) {
        while (e < ents.length && ents[e].y < y + .5) ents[e++].draw();
        for (let x = x0; x <= x1; x++) {
          const c = m[y][x], sx = x * T - cx, sy = y * T - cy;
          if (c === 1) { ctx.fillStyle = '#2a2026'; ctx.fillRect(sx, sy - 30, T, T); ctx.fillStyle = '#3a2e34'; ctx.fillRect(sx, sy - 30, T, 6); if (m[y + 1]?.[x] !== 1) { const r = this.roomAt(x, y + 1) || this.rooms[0]; ctx.fillStyle = r.paper; ctx.fillRect(sx, sy + T - 30, T, 30); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(sx + T / 2 - 1, sy + T - 30, 2, 30); ctx.fillStyle = '#2a1a12'; ctx.fillRect(sx, sy + T - 6, T, 6); } }
          if (c === 3) { const open = this.keys === this.needKeys; G.rr(sx + 2, sy - 30, T - 4, T + 28, 4, '#3a2416'); G.rr(sx + 6, sy - 24, T - 12, T + 18, 3, open ? '#6a4a2a' : '#4a3020'); G.circle(sx + T - 14, sy + 10, 3, '#c9a227'); G.rr(sx + 8, sy - 44, T - 16, 14, 3, open ? '#2a8a3a' : '#a82020'); }
        }
      }
      while (e < ents.length) ents[e++].draw();
      // lamps
      for (const r of this.rooms) if (r.lamp) { const lx = (r.x0 + RW - 1.2) * T - cx, ly = (r.y0 + .9) * T - cy; G.rr(lx - 3, ly - 6, 6, 30, 2, '#2a2a2a'); ctx.fillStyle = this.lampOn(r) ? '#f0d890' : '#5a5040'; ctx.beginPath(); ctx.moveTo(lx - 16, ly - 4); ctx.lineTo(lx + 16, ly - 4); ctx.lineTo(lx + 9, ly - 24); ctx.lineTo(lx - 9, ly - 24); ctx.fill(); }
      // darkness, with the flashlight cone and lit rooms cut out
      const dk = this.dark || (this.dark = Object.assign(document.createElement('canvas'), {width: W, height: H})), d = dk.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.fillStyle = 'rgba(3,2,8,.93)'; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      for (const r of this.rooms) if (r.lamp && this.lampOn(r)) { const g = d.createRadialGradient((r.x0 + RW / 2) * T - cx, (r.y0 + RH / 2) * T - cy, 40, (r.x0 + RW / 2) * T - cx, (r.y0 + RH / 2) * T - cy, RW * T * .6); g.addColorStop(0, 'rgba(0,0,0,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(r.x0 * T - cx - T, r.y0 * T - cy - T * 2, (RW + 2) * T, (RH + 3) * T); }
      const px = p.x * T - cx, py = p.y * T - cy - 20;
      let g = d.createRadialGradient(px, py, 0, px, py, 80); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(px - 80, py - 80, 160, 160);
      d.save(); d.translate(px, py); d.rotate(p.a); g = d.createRadialGradient(0, 0, 10, 0, 0, 7.5 * T); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.75, 'rgba(0,0,0,.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.moveTo(0, 0); d.arc(0, 0, 7.5 * T, -.5, .5); d.closePath(); d.fill(); d.restore();
      for (const it of this.items) if (!it.got) { const ix = it.x * T - cx, iy = it.y * T - cy; g = d.createRadialGradient(ix, iy, 0, ix, iy, 34); g.addColorStop(0, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(ix - 34, iy - 34, 68, 68); }
      ctx.drawImage(dk, 0, 0);
      for (const dl of this.dolls) if (!dl.lit) { const sx = dl.x * T - cx, sy = dl.y * T - cy - 80; if (sx > 0 && sx < W && sy > 0 && sy < H) { G.circle(sx - 5, sy, 1.8, 'rgba(255,60,40,.9)'); } } // its one red eye shows in the dark
      if (this.nearest < 4) { const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(120,0,0,${.65 * (1 - this.nearest / 4)})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
      // HUD
      for (let i = 0; i < this.needKeys; i++) { G.rr(14 + i * 26, 12, 22, 22, 5, i < this.keys ? '#ffcf5c' : 'rgba(255,255,255,.12)'); G.circle(21 + i * 26, 23, 4, i < this.keys ? '#4a3420' : 'rgba(0,0,0,.3)'); }
      for (let i = 0; i < this.lives; i++) G.text('♥', W - 20 - i * 22, 52, {size: 20, align: 'right', color: '#ff5b6b', shadow: true});
      G.text(`HOUSE ${G.level}`, W - 16, 26, {size: 13, align: 'right', weight: 800, color: '#ffcf5c', shadow: true});
      // a small compass to the nearest key or the door
      const goals = this.keys < this.needKeys ? this.items.filter(i => !i.got) : [{x: this.exit.x + .5, y: this.exit.y + .5}];
      const gl = goals.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (gl) { const a = Math.atan2(gl.y - p.y, gl.x - p.x); ctx.save(); ctx.translate(W / 2, 26); ctx.rotate(a); ctx.fillStyle = this.keys < this.needKeys ? 'rgba(255,207,92,.9)' : 'rgba(94,230,193,.9)'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore(); }
      if (this.msgT > 0) G.text(this.msg, W / 2, H - 24, {size: 17, align: 'center', weight: 800, color: '#ffe8a0', shadow: true});
      else if (G.level <= 3) G.text('Keep your light on the doll!', W / 2, H - 24, {size: 14, align: 'center', weight: 700, color: 'rgba(255,232,160,.7)', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

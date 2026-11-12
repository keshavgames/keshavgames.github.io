(() => {
  // First-person raycaster: draws into a 320x200 pixel buffer, then scales it up for a gritty look.
  const RW = 320, RH = 200, TEX = 64, FOG = .32;
  const buf = document.createElement('canvas'); buf.width = RW; buf.height = RH;
  const bctx = buf.getContext('2d');
  const img = bctx.createImageData(RW, RH), px = new Uint32Array(img.data.buffer);
  const zbuf = new Float32Array(RW), beam = new Float32Array(RW);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function paint(w, h, fn) { // draw a texture with canvas, then read it back as pixels
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); fn(g, w, h);
    return new Uint32Array(g.getImageData(0, 0, w, h).data.buffer);
  }
  const speckle = (g, n, color, size = 2) => { g.fillStyle = color; for (let i = 0; i < n; i++) g.fillRect(Math.random() * 64, Math.random() * 64, size, size); };
  const wallTile = stain => paint(TEX, TEX, g => {
    g.fillStyle = '#2e352d'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 40; y += 10) for (let x = 0; x < 64; x += 16) {
      g.fillStyle = `hsl(${95 + Math.random() * 20} 9% ${40 + Math.random() * 9}%)`; g.fillRect(x + (y / 10 % 2) * 8 + 1, y + 1, 14, 8);
    }
    g.fillStyle = '#3a4339'; g.fillRect(0, 40, 64, 24);
    g.fillStyle = '#232922'; g.fillRect(0, 39, 64, 3);
    speckle(g, 90, 'rgba(20,18,12,.35)');
    if (stain) {
      g.fillStyle = 'rgba(90,10,14,.75)';
      for (let i = 0; i < 6; i++) g.fillRect(20 + i * 3 + Math.random() * 3, 18 + Math.random() * 6, 3, 18 + Math.random() * 26);
      g.beginPath(); g.ellipse(28, 22, 10, 6, .3, 0, Math.PI * 2); g.fill();
    }
  });
  const TEXS = {
    1: wallTile(false), 2: wallTile(true),
    3: paint(TEX, TEX, g => { // locked exit door
      g.fillStyle = '#3b3f46'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2b2e33'; g.fillRect(8, 6, 48, 58);
      g.fillStyle = '#4a4f58'; g.fillRect(12, 10, 18, 50); g.fillRect(34, 10, 18, 50);
      g.fillStyle = '#ff2030'; g.fillRect(26, 2, 12, 4); speckle(g, 40, 'rgba(0,0,0,.3)');
      g.fillStyle = '#d8d3c4'; g.font = 'bold 9px sans-serif'; g.fillText('EXIT', 21, 36);
    }),
    floor: paint(TEX, TEX, g => {
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) { g.fillStyle = (x + y) % 64 ? '#3c3a34' : '#4a473f'; g.fillRect(x, y, 32, 32); }
      speckle(g, 140, 'rgba(15,12,8,.35)'); g.fillStyle = 'rgba(70,10,10,.35)'; g.fillRect(40, 10, 9, 5);
    }),
    ceil: paint(TEX, TEX, g => {
      g.fillStyle = '#26282a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1b1c1e'; g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 64);
      speckle(g, 60, 'rgba(0,0,0,.4)');
    })
  };
  const SPR = {
    fuse: paint(TEX, TEX, g => {
      g.fillStyle = '#c99a2e'; g.fillRect(26, 40, 12, 22); g.fillStyle = '#ffd25c'; g.fillRect(28, 42, 8, 18);
      g.fillStyle = '#6b6f75'; g.fillRect(24, 38, 16, 4); g.fillRect(24, 60, 16, 4);
    }),
    battery: paint(TEX, TEX, g => {
      g.fillStyle = '#2f8f5c'; g.fillRect(25, 44, 14, 20); g.fillStyle = '#7fe0a8'; g.fillRect(27, 47, 4, 14);
      g.fillStyle = '#c9ccd4'; g.fillRect(29, 41, 6, 3);
    }),
    medkit: paint(TEX, TEX, g => {
      g.fillStyle = '#e9e4da'; g.fillRect(20, 46, 24, 18); g.fillStyle = '#c4202c'; g.fillRect(30, 49, 4, 12); g.fillRect(26, 53, 12, 4);
    }),
    monster: paint(TEX, TEX, g => {
      g.fillStyle = '#7d776d';
      g.beginPath(); g.ellipse(32, 9, 6, 8, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(25, 17); g.lineTo(39, 17); g.lineTo(37, 40); g.lineTo(27, 40); g.fill();
      g.fillRect(20, 18, 4, 30); g.fillRect(40, 18, 4, 30);
      g.fillRect(18, 47, 2, 6); g.fillRect(21, 47, 2, 7); g.fillRect(41, 47, 2, 7); g.fillRect(44, 47, 2, 6);
      g.fillRect(27, 40, 4, 24); g.fillRect(33, 40, 4, 24);
      g.fillStyle = '#4a463f'; g.fillRect(29, 20, 6, 18); g.fillRect(28, 13, 8, 2);
      g.fillStyle = '#120f0c'; g.fillRect(28, 6, 3, 4); g.fillRect(33, 6, 3, 4); g.fillRect(29, 13, 6, 3);
      g.fillStyle = '#ff1e2e'; g.fillRect(29, 7, 1, 2); g.fillRect(34, 7, 1, 2);
    })
  };
  const EXIT_GLOW = 0xff9de8b0;

  function makeMap(size) {
    const m = Array.from({length: size}, () => new Uint8Array(size).fill(1));
    const stack = [[1, 1]]; m[1][1] = 0;
    while (stack.length) { // recursive-backtracker maze
      const [x, y] = stack.at(-1);
      const opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy; return nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && m[ny][nx] === 1;
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = G.pick(opts);
      m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; stack.push([x + dx, y + dy]);
    }
    // open extra gaps so there are loops to escape through, and carve a few rooms
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      if (m[y][x] !== 1 || Math.random() > .1) continue;
      if ((!m[y][x - 1] && !m[y][x + 1] && m[y - 1][x] && m[y + 1][x]) || (!m[y - 1][x] && !m[y + 1][x] && m[y][x - 1] && m[y][x + 1])) m[y][x] = 0;
    }
    for (let i = 0; i < 3; i++) {
      const rx = 1 + 2 * Math.floor(G.rnd((size - 4) / 2)), ry = 1 + 2 * Math.floor(G.rnd((size - 4) / 2));
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) m[ry + dy][rx + dx] = 0;
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x] === 1 && Math.random() < .12) m[y][x] = 2;
    return m;
  }
  const open = (m, x, y) => m[y] !== undefined && (m[y][x] === 0 || m[y][x] === 4);
  function bfs(m, sx, sy) {
    const n = m.length, d = Array.from({length: n}, () => new Int16Array(n).fill(-1)), q = [[sx, sy]];
    d[sy][sx] = 0;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (m[ny]?.[nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } }
    }
    return d;
  }
  function route(m, sx, sy, tx, ty) { // shortest path of cells from start to target
    const n = m.length, prev = new Int32Array(n * n).fill(-1), q = [sy * n + sx];
    prev[sy * n + sx] = sy * n + sx;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % n, y = (c / n) | 0;
      if (x === tx && y === ty) break;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = ny * n + nx;
        if (open(m, nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); }
      }
    }
    const t = ty * n + tx;
    if (prev[t] < 0) return [];
    const path = [];
    for (let c = t; c !== sy * n + sx; c = prev[c]) path.unshift([c % n, (c / n) | 0]);
    return path;
  }
  function sight(m, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / .1);
    for (let i = 1; i < n; i++) { const t = i / n; if (!open(m, Math.floor(ax + (bx - ax) * t), Math.floor(ay + (by - ay) * t))) return false; }
    return true;
  }
  const shade = (c, l) => {
    if (l >= 1) l = 1;
    return 0xff000000 | ((((c >>> 16) & 255) * l) << 16) | ((((c >>> 8) & 255) * l) << 8) | ((c & 255) * l);
  };

  GameBox.register({
    id: 'horror', title: 'Hollow Ward', genre: 'Horror', kind: 'First-person horror', w: 640, h: 400, pointerLock: true,
    desc: 'You wake up in an abandoned hospital ward with the power cut. Find five fuses to restart the exit door, then escape before the thing in the halls finds you. Running is loud, and your flashlight battery will not last.',
    controls: [['W S / Up Down', 'Walk'], ['A D', 'Strafe'], ['Q E / Left Right', 'Turn'], ['Mouse', 'Look (click the screen first)'], ['Shift', 'Run (it hears you)'], ['F', 'Flashlight on or off']],
    info() { return `Floor ${this.floor} · Fuses ${this.fuses}/5`; },
    init() {
      this.floor = 1; this.hp = 100; this.stamina = 100; this.tired = false; this.battery = 100; this.light = true;
      this.parts = []; this.build();
    },
    build() {
      const size = Math.min(29, 19 + this.floor * 2);
      const m = this.map = makeMap(size), d = bfs(m, 1, 1);
      let best = null;
      for (let i = 1; i < size - 1; i++) for (const [x, y, ix, iy] of [[i, 0, i, 1], [i, size - 1, i, size - 2], [0, i, 1, i], [size - 1, i, size - 2, i]])
        if (d[iy][ix] > 0 && (!best || d[iy][ix] > best.d)) best = {x, y, d: d[iy][ix]};
      m[best.y][best.x] = 3; this.exit = best;
      const cells = [], ends = [];
      for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
        if (m[y][x] !== 0 || d[y][x] < 5) continue;
        const c = [x, y]; cells.push(c);
        if (DIRS.filter(([dx, dy]) => m[y + dy][x + dx] === 0).length === 1) ends.push(c);
      }
      const spots = G.shuffle(ends).concat(G.shuffle(cells.filter(c => !ends.includes(c))));
      this.items = spots.slice(0, 10).map(([x, y], i) => ({x: x + .5, y: y + .5, type: i < 5 ? 'fuse' : i < 8 ? 'battery' : 'medkit'}));
      const far = cells.filter(([x, y]) => d[y][x] > 12);
      const [mx, my] = G.pick(far.length ? far : cells);
      this.mon = {x: mx + .5, y: my + .5, state: 'wander', path: [], repath: 0, stun: 0, lost: 0, calm: 3, target: null};
      this.p = {x: 1.5, y: 1.5, a: d[1][2] > 0 ? 0 : Math.PI / 2};
      this.fuses = 0; this.walked = 0; this.beatT = 0; this.scare = 0; this.msg = 'Find 5 fuses to power the exit.'; this.msgT = 5;
    },
    key(k) {
      if (k === 'f') { this.light = !this.light; G.sfx('click'); }
    },
    look(dx) { this.p.a += dx * .0026; },
    update(dt) {
      const p = this.p, m = this.map, mon = this.mon;
      this.msgT -= dt; this.scare -= dt;
      const turn = G.held('ArrowRight', 'e') - G.held('ArrowLeft', 'q');
      p.a += turn * 2.4 * dt;
      const fwd = G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), str = G.held('d') - G.held('a');
      const moving = fwd || str, running = G.keys.Shift && moving && !this.tired;
      if (running) { this.stamina -= 30 * dt; if (this.stamina <= 0) { this.stamina = 0; this.tired = true; } }
      else { this.stamina = Math.min(100, this.stamina + 16 * dt); if (this.stamina > 30) this.tired = false; }
      const speed = running ? 3.4 : 2;
      let vx = Math.cos(p.a) * fwd - Math.sin(p.a) * str, vy = Math.sin(p.a) * fwd + Math.cos(p.a) * str;
      const len = Math.hypot(vx, vy) || 1; vx *= speed * dt / len; vy *= speed * dt / len;
      const r = .22, ok = (x, y) => open(m, Math.floor(x - r), Math.floor(y - r)) && open(m, Math.floor(x + r), Math.floor(y - r)) && open(m, Math.floor(x - r), Math.floor(y + r)) && open(m, Math.floor(x + r), Math.floor(y + r));
      if (moving) {
        if (ok(p.x + vx, p.y)) p.x += vx;
        if (ok(p.x, p.y + vy)) p.y += vy;
        this.walked += Math.hypot(vx, vy);
        if (this.walked > (running ? .9 : 1.5)) { this.walked = 0; G.sfx('step', running ? 1 : .6); }
      }
      if (this.light) { this.battery = Math.max(0, this.battery - 1.5 * dt); }
      for (const it of this.items) {
        if (it.got || Math.hypot(it.x - p.x, it.y - p.y) > .55) continue;
        it.got = true; G.sfx('coin');
        if (it.type === 'fuse') {
          this.fuses++; G.score += 100;
          this.msg = this.fuses < 5 ? `Fuse ${this.fuses} of 5` : 'The exit door has power. Find it.'; this.msgT = 3;
          if (this.fuses === 5) { m[this.exit.y][this.exit.x] = 4; G.sfx('power'); }
        } else if (it.type === 'battery') { this.battery = Math.min(100, this.battery + 45); this.msg = 'Fresh batteries'; this.msgT = 2; }
        else { this.hp = Math.min(100, this.hp + 35); this.msg = 'Patched up'; this.msgT = 2; }
      }
      if (Math.floor(p.x) === this.exit.x && Math.floor(p.y) === this.exit.y) {
        G.score += 500 + this.floor * 100; G.sfx('win'); this.floor++;
        this.build(); this.msg = `Floor ${this.floor}. It followed you down.`; this.msgT = 4; return;
      }
      // the creature: wanders, hunts when it sees your light or hears you run, loses you after a while
      const d = Math.hypot(mon.x - p.x, mon.y - p.y);
      mon.stun -= dt; mon.calm -= dt; mon.repath -= dt;
      if (mon.calm <= 0) {
        const sees = d < (this.light && this.battery > 0 ? 9 : 4.5) && sight(m, mon.x, mon.y, p.x, p.y);
        const hears = (running && d < 7) || d < 2;
        if (sees || hears) {
          if (mon.state !== 'hunt') { G.sfx('beat', 1.6); G.shake(3, .3); this.msg = 'It knows where you are. Run.'; this.msgT = 2.5; }
          mon.state = 'hunt'; mon.lost = 0;
        } else if (mon.state === 'hunt' && (mon.lost += dt) > 6) { mon.state = 'wander'; mon.target = null; }
      }
      if (mon.repath <= 0) {
        mon.repath = .4;
        if (mon.state !== 'hunt' && (!mon.target || !mon.path.length)) {
          const open0 = []; for (let y = 1; y < m.length - 1; y++) for (let x = 1; x < m.length - 1; x++) if (m[y][x] === 0) open0.push([x, y]);
          mon.target = G.pick(open0);
        }
        const [tx, ty] = mon.state === 'hunt' ? [Math.floor(p.x), Math.floor(p.y)] : mon.target;
        mon.path = route(m, Math.floor(mon.x), Math.floor(mon.y), tx, ty);
      }
      if (mon.stun <= 0 && mon.path.length) {
        const [cx, cy] = mon.path[0], gx = cx + .5, gy = cy + .5, dd = Math.hypot(gx - mon.x, gy - mon.y);
        const sp = (mon.state === 'hunt' ? 2.05 + this.floor * .12 : 1.2) * dt;
        if (dd <= sp) { mon.x = gx; mon.y = gy; mon.path.shift(); } else { mon.x += (gx - mon.x) / dd * sp; mon.y += (gy - mon.y) / dd * sp; }
      }
      if (d < .6 && mon.stun <= 0 && mon.calm <= 0) { // after a hit it backs off for a few seconds so you can run
        this.hp -= 34; mon.stun = 1.6; mon.calm = 4.5; mon.state = 'wander'; mon.target = null; mon.path = [];
        this.scare = .45; G.shake(14, .5); G.flash('rgba(160,0,10,.6)', .6); G.sfx('hurt'); G.sfx('boom', .6);
        if (this.hp <= 0) { this.hp = 0; return G.end('It caught you'); }
      }
      if (d < 8 && (this.beatT -= dt) <= 0) { this.beatT = .3 + d * .12; G.sfx('beat', 1.2 - d / 10); }
    },
    draw(ctx, dt) {
      const p = this.p, m = this.map, n = m.length;
      const dirX = Math.cos(p.a), dirY = Math.sin(p.a), plX = -dirY * .66, plY = dirX * .66;
      const flick = this.battery < 15 && Math.random() < .2 ? .15 : 1;
      const on = this.light && this.battery > 0 ? flick * Math.min(1, .35 + this.battery / 60) : 0;
      for (let x = 0; x < RW; x++) { const c = (2 * x / RW - 1) * 1.25; beam[x] = on * Math.max(0, 1 - c * c) * 1.15; }
      const amb = dist => FOG / (1 + dist * .55), fall = dist => 1 / (1 + dist * dist * .05);
      // floor and ceiling
      const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
      for (let y = RH / 2 + 1; y < RH; y++) {
        const rowD = (RH / 2) / (y - RH / 2), sx = rowD * (rx1 - rx0) / RW, sy = rowD * (ry1 - ry0) / RW;
        let fx = p.x + rowD * rx0, fy = p.y + rowD * ry0;
        const a = amb(rowD), f = fall(rowD), top = (RH - y - 1) * RW, bot = y * RW;
        for (let x = 0; x < RW; x++) {
          const t = (((fy - Math.floor(fy)) * TEX) | 0) * TEX + (((fx - Math.floor(fx)) * TEX) | 0), l = a + beam[x] * f;
          px[bot + x] = shade(TEXS.floor[t], l); px[top + x] = shade(TEXS.ceil[t], l * .7);
          fx += sx; fy += sy;
        }
      }
      // walls (DDA ray per column)
      for (let x = 0; x < RW; x++) {
        const cam = 2 * x / RW - 1, rdx = dirX + plX * cam, rdy = dirY + plY * cam;
        let mx = Math.floor(p.x), my = Math.floor(p.y);
        const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy), stx = rdx < 0 ? -1 : 1, sty = rdy < 0 ? -1 : 1;
        let sdx = (rdx < 0 ? p.x - mx : mx + 1 - p.x) * ddx, sdy = (rdy < 0 ? p.y - my : my + 1 - p.y) * ddy, side = 0, tile = 0;
        for (let i = 0; i < 64; i++) {
          if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
          if (mx < 0 || my < 0 || mx >= n || my >= n) { tile = -1; break; }
          tile = m[my][mx]; if (tile !== 0 && tile !== 4) break;
        }
        const perp = Math.max(.05, side ? sdy - ddy : sdx - ddx);
        zbuf[x] = perp;
        const lh = RH / perp, y0 = Math.max(0, Math.floor(RH / 2 - lh / 2)), y1 = Math.min(RH - 1, Math.floor(RH / 2 + lh / 2));
        if (tile === -1) { for (let y = y0; y <= y1; y++) px[y * RW + x] = EXIT_GLOW; continue; }
        let wx = side ? p.x + perp * rdx : p.y + perp * rdy; wx -= Math.floor(wx);
        let tx = (wx * TEX) | 0; if ((!side && rdx > 0) || (side && rdy < 0)) tx = TEX - tx - 1;
        const tex = TEXS[tile] || TEXS[1], l = (amb(perp) + beam[x] * fall(perp)) * (side ? .78 : 1) + (tile === 3 ? .12 : 0);
        const step = TEX / lh; let tp = (y0 - RH / 2 + lh / 2) * step;
        for (let y = y0; y <= y1; y++) { px[y * RW + x] = shade(tex[((tp | 0) & 63) * TEX + tx], l); tp += step; }
      }
      // sprites: items and the creature, far to near
      const spr = this.items.filter(i => !i.got).map(i => ({x: i.x, y: i.y, tex: SPR[i.type], scale: .6, glow: .3}));
      spr.push({x: this.mon.x, y: this.mon.y, tex: SPR.monster, scale: 1.25, glow: 0, mon: true});
      for (const s of spr) s.d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
      spr.sort((a, b) => b.d - a.d);
      const inv = 1 / (plX * dirY - dirX * plY);
      for (const s of spr) {
        const sx = s.x - p.x, sy = s.y - p.y, tX = inv * (dirY * sx - dirX * sy), tY = inv * (-plY * sx + plX * sy);
        if (tY < .15) continue;
        const scx = (RW / 2) * (1 + tX / tY), size = Math.abs(RH / tY) * s.scale;
        const lift = s.mon ? -(size - RH / tY) / 2 : (RH / tY - size) / 2;
        const ys = Math.floor(RH / 2 - size / 2 + lift), xs = Math.floor(scx - size / 2);
        const a = amb(tY), f = fall(tY);
        for (let x = Math.max(0, xs); x < Math.min(RW, xs + size); x++) {
          if (tY >= zbuf[x]) continue;
          const tx = Math.floor((x - xs) * TEX / size), l = Math.max(s.glow, a + beam[x] * f);
          for (let y = Math.max(0, ys); y < Math.min(RH, ys + size); y++) {
            const c = s.tex[Math.floor((y - ys) * TEX / size) * TEX + tx];
            if (!(c >>> 24)) continue;
            const emissive = (c & 255) > 200 && ((c >>> 8) & 255) < 80;
            px[y * RW + x] = emissive ? c : shade(c, l);
          }
        }
      }
      bctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(buf, 0, 0, G.W, G.H); ctx.imageSmoothingEnabled = true;
      // vignette, danger tint and the scare
      const d = Math.hypot(this.mon.x - p.x, this.mon.y - p.y);
      const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * .25, G.W / 2, G.H / 2, G.W * .65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${d < 6 ? 60 : 0},0,0,${d < 6 ? .75 + Math.sin(performance.now() / 120) * .1 : .7})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
      if (this.scare > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.scare * 3)})`; ctx.fillRect(0, 0, G.W, G.H);
        ctx.fillStyle = '#d6cfc0'; ctx.beginPath(); ctx.ellipse(G.W / 2, G.H / 2, 120, 160, 0, 0, Math.PI * 2); ctx.fill();
        G.circle(G.W / 2 - 45, G.H / 2 - 30, 26, '#0b0806'); G.circle(G.W / 2 + 45, G.H / 2 - 30, 26, '#0b0806');
        G.circle(G.W / 2 - 45, G.H / 2 - 30, 6, '#ff1e2e'); G.circle(G.W / 2 + 45, G.H / 2 - 30, 6, '#ff1e2e');
        ctx.fillStyle = '#0b0806'; ctx.beginPath(); ctx.ellipse(G.W / 2, G.H / 2 + 70, 50, 34, 0, 0, Math.PI * 2); ctx.fill();
      }
      G.circle(G.W / 2, G.H / 2, 2, 'rgba(255,255,255,.5)');
      G.panel(10, G.H - 86, 210, 76);
      G.bar({x: 20, y: G.H - 76, w: 190, h: 14, v: this.hp, max: 100, color: '#d9374b', label: `HEALTH ${Math.ceil(this.hp)}`, id: 'hp'});
      G.bar({x: 20, y: G.H - 54, w: 190, h: 14, v: this.stamina, max: 100, color: this.tired ? '#7a7f99' : '#5ee6c1', label: 'STAMINA'});
      G.bar({x: 20, y: G.H - 32, w: 190, h: 14, v: this.battery, max: 100, color: '#ffcf5c', label: `LIGHT ${this.light ? Math.ceil(this.battery) + '%' : 'OFF'}`});
      G.text(`FLOOR ${this.floor}  ·  FUSES ${this.fuses}/5`, 14, 24, {size: 13, weight: 700, color: '#d8d3c4', shadow: true});
      if (this.msgT > 0) { ctx.globalAlpha = Math.min(1, this.msgT); G.text(this.msg, G.W / 2, 56, {size: 16, align: 'center', color: '#e8e2d0', shadow: true}); ctx.globalAlpha = 1; }
    }
  });
})();

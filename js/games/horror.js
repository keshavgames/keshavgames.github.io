(() => {
  // First-person hospital maze on the shared raycaster, with a Blender-rendered creature.
  const RW = 320, RH = 200;
  const R = Ray.create(RW, RH);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const FRAMES = ['walk1', 'walk2', 'walk3', 'walk4', 'idle', 'attack', 'scream'];
  const ASSETS = [...FRAMES.map(f => `img/monster_${f}.png`), 'img/monster_face.png'];
  const speckle = (g, n, color, size = 2) => { g.fillStyle = color; for (let i = 0; i < n; i++) g.fillRect(Math.random() * 64, Math.random() * 64, size, size); };
  const wallTile = stain => Ray.paint(64, 64, g => {
    g.fillStyle = '#2e352d'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 40; y += 10) for (let x = 0; x < 64; x += 16) { g.fillStyle = `hsl(${95 + Math.random() * 20} 9% ${40 + Math.random() * 9}%)`; g.fillRect(x + (y / 10 % 2) * 8 + 1, y + 1, 14, 8); }
    g.fillStyle = '#3a4339'; g.fillRect(0, 40, 64, 24); g.fillStyle = '#232922'; g.fillRect(0, 39, 64, 3);
    speckle(g, 90, 'rgba(20,18,12,.35)');
    if (stain) {
      g.fillStyle = 'rgba(90,10,14,.75)';
      for (let i = 0; i < 6; i++) g.fillRect(20 + i * 3 + Math.random() * 3, 18 + Math.random() * 6, 3, 18 + Math.random() * 26);
      g.beginPath(); g.ellipse(28, 22, 10, 6, .3, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(20,4,4,.8)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 4, 8); g.lineTo(36 + i * 4, 34); g.stroke(); }
    }
  });
  let TEX = null;
  const textures = () => TEX ||= {
    1: wallTile(false), 2: wallTile(true),
    3: Ray.paint(64, 64, g => {
      g.fillStyle = '#3b3f46'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#2b2e33'; g.fillRect(8, 6, 48, 58);
      g.fillStyle = '#4a4f58'; g.fillRect(12, 10, 18, 50); g.fillRect(34, 10, 18, 50);
      g.fillStyle = '#ff2030'; g.fillRect(26, 2, 12, 4); speckle(g, 40, 'rgba(0,0,0,.3)');
      g.fillStyle = '#d8d3c4'; g.font = 'bold 9px sans-serif'; g.fillText('EXIT', 21, 36);
    }),
    floor: Ray.paint(64, 64, g => {
      for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) { g.fillStyle = (x + y) % 64 ? '#3c3a34' : '#4a473f'; g.fillRect(x, y, 32, 32); }
      speckle(g, 140, 'rgba(15,12,8,.35)'); g.fillStyle = 'rgba(70,10,10,.35)'; g.fillRect(40, 10, 9, 5);
    }),
    ceil: Ray.paint(64, 64, g => { g.fillStyle = '#26282a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1b1c1e'; g.fillRect(0, 31, 64, 2); g.fillRect(31, 0, 2, 64); speckle(g, 60, 'rgba(0,0,0,.4)'); }),
    fuse: Ray.paint(64, 64, g => { g.fillStyle = '#c99a2e'; g.fillRect(26, 40, 12, 22); g.fillStyle = '#ffd25c'; g.fillRect(28, 42, 8, 18); g.fillStyle = '#6b6f75'; g.fillRect(24, 38, 16, 4); g.fillRect(24, 60, 16, 4); }),
    battery: Ray.paint(64, 64, g => { g.fillStyle = '#2f8f5c'; g.fillRect(25, 44, 14, 20); g.fillStyle = '#7fe0a8'; g.fillRect(27, 47, 4, 14); g.fillStyle = '#c9ccd4'; g.fillRect(29, 41, 6, 3); }),
    medkit: Ray.paint(64, 64, g => { g.fillStyle = '#e9e4da'; g.fillRect(20, 46, 24, 18); g.fillStyle = '#c4202c'; g.fillRect(30, 49, 4, 12); g.fillRect(26, 53, 12, 4); })
  };
  const EXIT_GLOW = Ray.pack(176, 232, 157);

  function makeMap(size, rnd) {
    const m = Array.from({length: size}, () => new Uint8Array(size).fill(1)), stack = [[1, 1]];
    m[1][1] = 0;
    while (stack.length) {
      const [x, y] = stack.at(-1);
      const opts = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && m[ny][nx] === 1; });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = rnd.pick(opts);
      m[y + dy / 2][x + dx / 2] = 0; m[y + dy][x + dx] = 0; stack.push([x + dx, y + dy]);
    }
    for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
      if (m[y][x] !== 1 || rnd() > .12) continue;
      if ((!m[y][x - 1] && !m[y][x + 1] && m[y - 1][x] && m[y + 1][x]) || (!m[y - 1][x] && !m[y + 1][x] && m[y][x - 1] && m[y][x + 1])) m[y][x] = 0;
    }
    for (let i = 0; i < 2 + (size >> 3); i++) {
      const rx = 1 + 2 * rnd.int((size - 4) / 2), ry = 1 + 2 * rnd.int((size - 4) / 2);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) m[ry + dy][rx + dx] = 0;
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x] === 1 && rnd() < .12) m[y][x] = 2;
    return m;
  }
  const walk = (m, x, y) => m[y] !== undefined && (m[y][x] === 0 || m[y][x] === 4);
  function bfs(m, sx, sy) {
    const n = m.length, d = Array.from({length: n}, () => new Int16Array(n).fill(-1)), q = [[sx, sy]];
    d[sy][sx] = 0;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (m[ny]?.[nx] === 0 && d[ny][nx] < 0) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } } }
    return d;
  }
  function route(m, sx, sy, tx, ty) {
    const n = m.length, prev = new Int32Array(n * n).fill(-1), q = [sy * n + sx];
    prev[sy * n + sx] = sy * n + sx;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % n, y = (c / n) | 0;
      if (x === tx && y === ty) break;
      for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = ny * n + nx; if (walk(m, nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } }
    }
    const t = ty * n + tx; if (prev[t] < 0) return [];
    const path = []; for (let c = t; c !== sy * n + sx; c = prev[c]) path.unshift([c % n, (c / n) | 0]);
    return path;
  }

  GameBox.register({
    id: 'horror', title: 'Hollow Ward', genre: 'Horror', kind: 'First-person horror', w: 640, h: 400, pointerLock: true, levels: 50, assets: ASSETS,
    hint: 'Find the fuses, power the exit, get out. Do not let it see your light.',
    desc: 'You wake up in an abandoned hospital with the power cut. Find the fuses to restart the exit door and escape before the thing in the halls finds you. It shrieks when it spots you, and running makes noise. Fifty floors, each bigger and darker than the last.',
    controls: [['W S / Up Down', 'Walk'], ['A D', 'Strafe'], ['Q E / Left Right', 'Turn'], ['Mouse', 'Look (click the screen first)'], ['Shift', 'Run (it hears you)'], ['F', 'Flashlight on or off']],
    info() { return `Floor ${G.level} · Fuses ${this.fuses}/${this.need}`; },
    init() {
      const n = G.level, rnd = G.seeded(n * 97 + 13);
      this.hp = 100; this.stamina = 100; this.tired = false; this.battery = 100; this.light = true; this.parts = [];
      this.need = Math.min(5, 2 + Math.floor(n / 6));
      const size = Math.min(31, 11 + 2 * Math.floor(n / 3));
      const m = this.map = makeMap(size, rnd), d = bfs(m, 1, 1);
      let best = null;
      for (let i = 1; i < size - 1; i++) for (const [x, y, ix, iy] of [[i, 0, i, 1], [i, size - 1, i, size - 2], [0, i, 1, i], [size - 1, i, size - 2, i]])
        if (d[iy][ix] > 0 && (!best || d[iy][ix] > best.d)) best = {x, y, d: d[iy][ix]};
      m[best.y][best.x] = 3; this.exit = best;
      const cells = [], ends = [];
      for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
        if (m[y][x] !== 0 || d[y][x] < 4) continue;
        const c = [x, y]; cells.push(c);
        if (DIRS.filter(([dx, dy]) => m[y + dy][x + dx] === 0).length === 1) ends.push(c);
      }
      const spots = rnd.shuffle(ends).concat(rnd.shuffle(cells.filter(c => !ends.includes(c))));
      const kinds = [...Array(this.need).fill('fuse'), 'battery', 'battery', 'medkit'];
      this.items = spots.slice(0, kinds.length).map(([x, y], i) => ({x: x + .5, y: y + .5, type: kinds[i]}));
      const far = cells.filter(([x, y]) => d[y][x] > Math.min(12, size / 2));
      const [mx, my] = rnd.pick(far.length ? far : cells);
      this.mon = {x: mx + .5, y: my + .5, state: 'wander', path: [], repath: 0, stun: 0, lost: 0, calm: 4, target: null, step: 0, shriek: 0, growlT: 3};
      this.p = {x: 1.5, y: 1.5, a: d[1][2] > 0 ? 0 : Math.PI / 2};
      this.fuses = 0; this.walked = 0; this.beatT = 0; this.scare = 0; this.dying = 0; this.bob = 0; this.t = 0;
      this.msg = `Floor ${n}: find ${this.need} fuses.`; this.msgT = 4;
    },
    key(k) { if (k === 'f') { this.light = !this.light; G.sfx('click'); } },
    look(dx) { this.p.a += dx * .0026; },
    tex(name) { return G.pixels(`img/monster_${name}.png`) || textures().fuse; },
    update(dt) {
      const p = this.p, m = this.map, mon = this.mon;
      this.t += dt; this.msgT -= dt; this.scare -= dt; mon.shriek -= dt;
      if (this.dying > 0) { if ((this.dying -= dt) <= 0) G.end('It caught you'); return; }
      p.a += (G.held('ArrowRight', 'e') - G.held('ArrowLeft', 'q')) * 2.4 * dt;
      const fwd = G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), str = G.held('d') - G.held('a');
      const moving = fwd || str, running = G.keys.Shift && moving && !this.tired;
      if (running) { this.stamina -= 26 * dt; if (this.stamina <= 0) { this.stamina = 0; this.tired = true; } }
      else { this.stamina = Math.min(100, this.stamina + 18 * dt); if (this.stamina > 30) this.tired = false; }
      const speed = running ? 3.5 : 2.2;
      let vx = Math.cos(p.a) * fwd - Math.sin(p.a) * str, vy = Math.sin(p.a) * fwd + Math.cos(p.a) * str;
      const len = Math.hypot(vx, vy) || 1; vx *= speed * dt / len; vy *= speed * dt / len;
      const r = .22, ok = (x, y) => walk(m, Math.floor(x - r), Math.floor(y - r)) && walk(m, Math.floor(x + r), Math.floor(y - r)) && walk(m, Math.floor(x - r), Math.floor(y + r)) && walk(m, Math.floor(x + r), Math.floor(y + r));
      if (moving) {
        if (ok(p.x + vx, p.y)) p.x += vx;
        if (ok(p.x, p.y + vy)) p.y += vy;
        this.walked += Math.hypot(vx, vy); this.bob += Math.hypot(vx, vy) * 9;
        if (this.walked > (running ? .9 : 1.5)) { this.walked = 0; G.sfx('step', running ? 1 : .6); }
      }
      if (this.light) this.battery = Math.max(0, this.battery - 1.1 * dt);
      for (const it of this.items) {
        if (it.got || Math.hypot(it.x - p.x, it.y - p.y) > .6) continue;
        it.got = true; G.sfx('coin');
        if (it.type === 'fuse') {
          this.fuses++; G.score += 100;
          this.msg = this.fuses < this.need ? `Fuse ${this.fuses} of ${this.need}!` : 'The exit has power! Follow the arrow.'; this.msgT = 3;
          if (this.fuses === this.need) { m[this.exit.y][this.exit.x] = 4; G.sfx('power'); }
        } else if (it.type === 'battery') { this.battery = Math.min(100, this.battery + 50); this.msg = 'Fresh batteries'; this.msgT = 2; }
        else { this.hp = Math.min(100, this.hp + 35); this.msg = 'Patched up'; this.msgT = 2; }
      }
      if (Math.floor(p.x) === this.exit.x && Math.floor(p.y) === this.exit.y) {
        G.score += 500 + G.level * 50;
        return G.win(this.hp >= 70 ? 3 : this.hp >= 35 ? 2 : 1, 'You escaped!');
      }
      // the creature: wanders, hunts when it sees your light or hears you run, loses you after a while
      const d = Math.hypot(mon.x - p.x, mon.y - p.y), lit = this.light && this.battery > 0;
      mon.stun -= dt; mon.calm -= dt; mon.repath -= dt;
      if (mon.calm <= 0) {
        const sees = d < (lit ? 9 : 4.5) && Ray.los({tile: (x, y) => (walk(m, x, y) ? 0 : 1)}, mon.x, mon.y, p.x, p.y);
        const hears = (running && d < 7) || d < 2;
        if (sees || hears) {
          if (mon.state !== 'hunt') { mon.shriek = .9; G.scream(Math.max(.35, 1 - d / 12), 1.3); G.shake(5, .4); this.msg = 'IT SEES YOU. RUN!'; this.msgT = 2.5; }
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
      if (mon.stun <= 0 && mon.shriek <= 0 && mon.path.length) {
        const [cx, cy] = mon.path[0], gx = cx + .5, gy = cy + .5, dd = Math.hypot(gx - mon.x, gy - mon.y);
        const sp = (mon.state === 'hunt' ? 1.85 + G.level * .035 : 1.15) * dt;
        mon.step += sp;
        if (dd <= sp) { mon.x = gx; mon.y = gy; mon.path.shift(); } else { mon.x += (gx - mon.x) / dd * sp; mon.y += (gy - mon.y) / dd * sp; }
      }
      if (d < .65 && mon.stun <= 0 && mon.calm <= 0) { // after a hit it backs off for a few seconds so you can run
        this.hp -= 34; mon.stun = 1.6; mon.calm = 4.5; mon.state = 'wander'; mon.target = null; mon.path = [];
        G.shake(16, .6); G.flash('rgba(160,0,10,.65)', .7); G.scream(1, 1.5); G.sfx('boom', .7);
        if (this.hp <= 0) { this.hp = 0; this.scare = 1.4; this.dying = 1.4; return; }
        this.scare = .7;
      }
      if (d < 9 && (this.beatT -= dt) <= 0) { this.beatT = .28 + d * .1; G.sfx('beat', 1.3 - d / 9); }
      if (d < 6 && (mon.growlT -= dt) <= 0) { mon.growlT = 2.5 + G.rnd(3); G.sfx('growl', 1 - d / 7); }
    },
    draw(ctx, dt) {
      const p = this.p, m = this.map, n = m.length, T = textures(), mon = this.mon;
      const flick = this.battery < 15 && Math.random() < .2 ? .15 : 1;
      const on = this.light && this.battery > 0 ? flick * Math.min(1, .4 + this.battery / 60) : 0;
      const d = Math.hypot(mon.x - p.x, mon.y - p.y);
      const frame = mon.shriek > 0 ? 'scream' : d < 1.6 ? 'attack' : mon.path.length && mon.stun <= 0 ? FRAMES[Math.floor(mon.step * 2.2) % 4] : 'idle';
      const sprites = this.items.filter(i => !i.got).map(i => ({x: i.x, y: i.y, tex: T[i.type], scale: .6, glow: .35}));
      sprites.push({x: mon.x, y: mon.y, tex: this.tex(frame), scale: 1.25, glow: .08});
      Ray.render(R, {x: p.x, y: p.y, a: p.a, bob: Math.sin(this.bob) * 2}, {
        tile: (x, y) => x < 0 || y < 0 || x >= n || y >= n ? -1 : m[y][x],
        see: t => t === 4,
        wallTex: t => t === -1 ? EXIT_GLOW : T[t] || T[1],
        floorTex: T.floor, ceilTex: T.ceil,
        light: dd => .34 / (1 + dd * .5),
        beam: c => on * Math.max(0, 1 - (c * 1.25) ** 2) * 1.2,
        emissive: c => (c & 255) > 200 && ((c >>> 8) & 255) < 70,
        sprites
      });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(R.canvas, 0, 0, G.W, G.H); ctx.imageSmoothingEnabled = true;
      const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * .25, G.W / 2, G.H / 2, G.W * .65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${d < 6 ? 70 : 0},0,0,${d < 6 ? .78 + Math.sin(performance.now() / 110) * .1 : .7})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
      if (this.scare > 0) { // jumpscare: the Blender face fills the screen and shudders
        const face = G.img('img/monster_face.png'), k = 1 + (1 - this.scare) * .25;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.scare * 3)})`; ctx.fillRect(0, 0, G.W, G.H);
        if (face.complete && face.naturalWidth) {
          const s = G.W * 1.15 * k, jx = (Math.random() - .5) * 26, jy = (Math.random() - .5) * 26;
          ctx.drawImage(face, G.W / 2 - s / 2 + jx, G.H / 2 - s * .5 + jy, s, s);
          ctx.fillStyle = 'rgba(120,0,0,.25)'; ctx.fillRect(0, 0, G.W, G.H);
        }
      }
      // compass toward the next goal, so nobody gets hopelessly lost
      const goals = this.fuses < this.need ? this.items.filter(i => i.type === 'fuse' && !i.got) : [{x: this.exit.x + .5, y: this.exit.y + .5}];
      const g = goals.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (g && this.scare <= 0) {
        const rel = Math.atan2(g.y - p.y, g.x - p.x) - p.a, cx = G.W / 2, cy = 30;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rel);
        ctx.fillStyle = this.fuses < this.need ? 'rgba(255,207,92,.85)' : 'rgba(94,230,193,.9)';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
        G.text(`${Math.round(Math.hypot(g.x - p.x, g.y - p.y))}m`, cx, cy + 26, {size: 11, align: 'center', color: '#e8e2d0', shadow: true});
      }
      G.circle(G.W / 2, G.H / 2, 2, 'rgba(255,255,255,.5)');
      G.panel(10, G.H - 86, 210, 76);
      G.bar({x: 20, y: G.H - 76, w: 190, h: 14, v: this.hp, max: 100, color: '#d9374b', label: `HEALTH ${Math.ceil(this.hp)}`, id: 'hp'});
      G.bar({x: 20, y: G.H - 54, w: 190, h: 14, v: this.stamina, max: 100, color: this.tired ? '#7a7f99' : '#5ee6c1', label: 'STAMINA'});
      G.bar({x: 20, y: G.H - 32, w: 190, h: 14, v: this.battery, max: 100, color: '#ffcf5c', label: `LIGHT ${this.light ? Math.ceil(this.battery) + '%' : 'OFF'}`});
      G.text(`FLOOR ${G.level}  ·  FUSES ${this.fuses}/${this.need}`, 14, 24, {size: 13, weight: 700, color: '#d8d3c4', shadow: true});
      if (this.msgT > 0) { ctx.globalAlpha = Math.min(1, this.msgT); G.text(this.msg, G.W / 2, 78, {size: 18, align: 'center', weight: 800, color: /RUN/.test(this.msg) ? '#ff4b62' : '#e8e2d0', shadow: true}); ctx.globalAlpha = 1; }
    }
  });
})();

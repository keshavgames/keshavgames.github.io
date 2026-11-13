(() => {
  // First-person space-station horror on the shared raycaster. The Signal is a Blender sprite.
  const RW = 320, RH = 200, R = Ray.create(RW, RH);
  const FRAMES = ['walk1', 'walk2', 'walk3', 'walk4', 'idle', 'attack'];
  const ASSETS = [...FRAMES.map(f => `img/signal_${f}.png`), 'img/signal_face.png'];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  // tiles: 0 floor, 1 panel wall, 2 window, 3 relay (broken), 6 relay (fixed), 4 escape pod, 5 bulkhead door (closed), 7 open door
  let TEX = null;
  const rivets = g => { g.fillStyle = 'rgba(0,0,0,.35)'; for (const [x, y] of [[4, 4], [58, 4], [4, 58], [58, 58], [4, 31], [58, 31]]) g.fillRect(x, y, 3, 3); };
  const textures = () => TEX ||= {
    1: Ray.paint(64, 64, g => { g.fillStyle = '#4a5260'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#3c434f'; g.fillRect(2, 2, 60, 28); g.fillRect(2, 34, 60, 22); g.fillStyle = '#58616f'; g.fillRect(2, 2, 60, 2); g.fillRect(2, 34, 60, 2); g.fillStyle = '#d8a020'; for (let x = -8; x < 64; x += 12) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 6, 58); g.lineTo(x + 12, 58); g.lineTo(x + 6, 64); g.fill(); } g.fillStyle = '#1c1f24'; g.fillRect(0, 56, 64, 2); rivets(g); }),
    2: Ray.paint(64, 64, g => { g.fillStyle = '#4a5260'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#04060c'; g.fillRect(8, 10, 48, 34); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${Math.random()})`; g.fillRect(8 + Math.random() * 48, 10 + Math.random() * 34, 1, 1); } g.fillStyle = 'rgba(80,120,255,.35)'; g.beginPath(); g.arc(46, 38, 14, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#2a2f38'; g.lineWidth = 4; g.strokeRect(8, 10, 48, 34); rivets(g); }),
    3: Ray.paint(64, 64, g => { g.fillStyle = '#3a404a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#14161a'; g.fillRect(10, 8, 44, 30); g.fillStyle = '#ff3b3b'; g.fillRect(14, 12, 36, 4); for (let i = 0; i < 5; i++) g.fillRect(16 + i * 7, 32 - i * 3, 4, 3 + i * 3); g.beginPath(); g.arc(32, 50, 6, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffcf5c'; g.fillRect(14, 44, 6, 8); g.fillRect(44, 44, 6, 8); rivets(g); }),
    6: Ray.paint(64, 64, g => { g.fillStyle = '#3a404a'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#0a1a10'; g.fillRect(10, 8, 44, 30); g.fillStyle = '#5ef08a'; g.fillRect(14, 12, 36, 4); for (let i = 0; i < 5; i++) g.fillRect(16 + i * 7, 32 - i * 3, 4, 3 + i * 3); g.beginPath(); g.arc(32, 50, 6, 0, Math.PI * 2); g.fill(); rivets(g); }),
    4: Ray.paint(64, 64, g => { g.fillStyle = '#2a3038'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c4d8f0'; g.beginPath(); g.arc(32, 30, 20, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a7090'; g.beginPath(); g.arc(32, 30, 14, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5ef08a'; g.fillRect(8, 56, 48, 4); }),
    5: Ray.paint(64, 64, g => { g.fillStyle = '#6a6e74'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#585c62'; g.fillRect(30, 0, 4, 64); g.fillStyle = '#d8a020'; for (let y = 0; y < 64; y += 16) { g.fillRect(0, y, 64, 6); } g.fillStyle = '#2a2a2a'; for (let y = 0; y < 64; y += 16) for (let x = -10; x < 64; x += 14) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y); g.lineTo(x + 12, y + 6); g.lineTo(x + 6, y + 6); g.fill(); } }),
    floor: Ray.paint(64, 64, g => { g.fillStyle = '#23272e'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a1d22'; for (let i = 0; i < 64; i += 8) { g.fillRect(i, 0, 2, 64); g.fillRect(0, i, 64, 2); } g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, 64, 1); }),
    ceil: Ray.paint(64, 64, g => { g.fillStyle = '#1c1f25'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#c8e0ff'; g.fillRect(28, 0, 8, 64); g.fillStyle = '#14161a'; g.fillRect(0, 30, 64, 4); }),
    med: Ray.paint(64, 64, g => { g.fillStyle = '#e9e4da'; g.fillRect(20, 46, 24, 18); g.fillStyle = '#2a8a4a'; g.fillRect(30, 49, 4, 12); g.fillRect(26, 53, 12, 4); })
  };
  const walk = (m, x, y) => { const c = m[y]?.[x]; return c === 0 || c === 7; };

  GameBox.register({
    id: 'deadsignal', title: 'Dead Signal', genre: 'Horror', kind: 'First-person sci-fi horror', w: 640, h: 400, pointerLock: true, levels: 30, assets: ASSETS, thumb: 'jpg',
    hint: 'Fix the red relays (hold E), then reach the escape pod. Watch the tracker. Shut doors behind you!',
    desc: 'The research station went silent and something got aboard. Repair the communication relays so the escape pod will launch, but repairs are loud and the Signal hunts by sound. Your motion tracker beeps faster as it gets close. Slam bulkhead doors to slow it down. Thirty decks.',
    controls: [['W S / Up Down', 'Walk'], ['A D', 'Strafe'], ['Q / Left Right', 'Turn'], ['Mouse', 'Look (click the screen first)'], ['E (hold)', 'Repair a relay / open or shut a door'], ['Shift', 'Run (it hears you)']],
    info() { return `Deck ${G.level} · Relays ${this.fixed}/${this.need}`; },
    init() {
      const n = G.level, rnd = G.seeded(n * 41 + 9), S = this.S = Math.min(33, 15 + 2 * Math.floor(n / 3));
      const m = this.map = Array.from({length: S}, () => new Array(S).fill(1));
      const rooms = [], count = 4 + Math.floor(S / 5);
      for (let t = 0; rooms.length < count && t < 300; t++) {
        const w = 3 + rnd.int(4), h = 3 + rnd.int(4), x = 1 + rnd.int(S - w - 2), y = 1 + rnd.int(S - h - 2);
        if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
        rooms.push({x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1)});
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) m[y + j][x + i] = 0;
      }
      rooms.sort((a, b) => a.cx + a.cy - b.cx - b.cy);
      this.doors = [];
      const corridor = (a, b) => { let x = a.cx, y = a.cy; const path = []; while (x !== b.cx) { x += Math.sign(b.cx - x); path.push([x, y]); } while (y !== b.cy) { y += Math.sign(b.cy - y); path.push([x, y]); } for (const [px, py] of path) if (m[py][px] === 1) { m[py][px] = 0; } };
      for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i]);
      for (let i = 0; i < rooms.length / 3; i++) corridor(rnd.pick(rooms), rnd.pick(rooms));
      // bulkhead doors where a corridor enters a room
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        if (m[y][x] !== 0 || rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) continue;
        const ns = m[y - 1][x] === 1 && m[y + 1][x] === 1, ew = m[y][x - 1] === 1 && m[y][x + 1] === 1;
        if ((ns || ew) && rnd() < .14) { m[y][x] = 7; this.doors.push({x, y, hp: 0}); }
      }
      // windows on some outer-facing walls
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) if (m[y][x] === 1 && rnd() < .06 && DIRS.some(([dx, dy]) => m[y + dy][x + dx] === 0)) m[y][x] = 2;
      const start = rooms[0], end = rooms[rooms.length - 1];
      this.p = {x: start.cx + .5, y: start.cy + .5, a: 0};
      // relays: wall tiles next to room floors, spread across rooms; the pod sits on the far room's wall
      const wallNext = r => { const out = []; for (let j = 0; j < r.h; j++) for (let i = 0; i < r.w; i++) for (const [dx, dy] of DIRS) { const x = r.x + i + dx, y = r.y + j + dy; if (m[y]?.[x] === 1 || m[y]?.[x] === 2) out.push([x, y, r.x + i, r.y + j]); } return out; };
      this.need = Math.min(5, 2 + Math.floor(n / 7)); this.fixed = 0; this.relays = [];
      for (const r of rnd.shuffle(rooms.slice(1, -1).concat(rooms.length > 3 ? [] : [end]))) { if (this.relays.length >= this.need) break; const w = rnd.pick(wallNext(r)); if (!w) continue; m[w[1]][w[0]] = 3; this.relays.push({x: w[0], y: w[1], fx: w[2] + .5, fy: w[3] + .5, prog: 0, done: false}); }
      this.need = this.relays.length;
      const pw = rnd.pick(wallNext(end).filter(w => m[w[1]][w[0]] === 1)) || wallNext(end)[0]; m[pw[1]][pw[0]] = 4; this.pod = {x: pw[0], y: pw[1], fx: pw[2] + .5, fy: pw[3] + .5};
      this.items = []; for (const r of rnd.shuffle(rooms.slice(1)).slice(0, 2)) this.items.push({x: r.x + .5 + rnd.int(r.w), y: r.y + .5 + rnd.int(r.h), got: false});
      const far = rooms[Math.max(1, rooms.length - 2)];
      this.mon = {x: far.cx + .5, y: far.cy + .5, state: 'wander', path: [], repath: 0, stun: 0, lost: 0, calm: 5 + Math.max(0, 6 - n), target: null, step: 0, shriek: 0, bash: 0};
      this.hp = 100; this.stamina = 100; this.tired = false; this.t = 0; this.bob = 0; this.walked = 0; this.scare = 0; this.dying = 0; this.beepT = 0; this.noise = 0; this.parts = [];
      this.msg = `Deck ${n}: repair ${this.need} relays.`; this.msgT = 3.5;
    },
    look(dx) { this.p.a += dx * .0026; },
    facing(max = 1.3) { // the tile right in front of you
      const p = this.p; for (let d = .3; d <= max; d += .1) { const x = Math.floor(p.x + Math.cos(p.a) * d), y = Math.floor(p.y + Math.sin(p.a) * d), c = this.map[y]?.[x]; if (c && c !== 0 && c !== 7 || c === 7 && d > .7) return {x, y, c}; } return null;
    },
    key(k) {
      if (k !== 'e') return;
      const f = this.facing(1.6);
      if (f && (f.c === 5 || f.c === 7)) {
        const dd = this.doors.find(d => d.x === f.x && d.y === f.y); if (!dd) return;
        if (Math.floor(this.p.x) === f.x && Math.floor(this.p.y) === f.y) return;
        this.map[f.y][f.x] = f.c === 7 ? 5 : 7; dd.hp = 3.2 - Math.min(1.6, G.level * .05); G.sfx('boom', .4); G.shake(3, .15);
      }
    },
    update(dt) {
      const p = this.p, m = this.map, mon = this.mon, n = G.level;
      this.t += dt; this.msgT -= dt; this.scare -= dt; mon.shriek -= dt; this.noise = Math.max(0, this.noise - dt);
      if (this.dying > 0) { if ((this.dying -= dt) <= 0) G.end('The Signal found you'); return; }
      p.a += (G.held('ArrowRight') - G.held('ArrowLeft', 'q')) * 2.4 * dt;
      const fwd = G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), str = G.held('d') - G.held('a'), moving = fwd || str;
      const running = G.keys.Shift && moving && !this.tired;
      if (running) { this.stamina -= 26 * dt; this.noise = 1; if (this.stamina <= 0) { this.stamina = 0; this.tired = true; } } else { this.stamina = Math.min(100, this.stamina + 18 * dt); if (this.stamina > 30) this.tired = false; }
      if (moving) {
        const sp = (running ? 3.5 : 2.3) * dt; let vx = Math.cos(p.a) * fwd - Math.sin(p.a) * str, vy = Math.sin(p.a) * fwd + Math.cos(p.a) * str; const l = Math.hypot(vx, vy); vx *= sp / l; vy *= sp / l;
        const r = .22, ok = (x, y) => walk(m, Math.floor(x - r), Math.floor(y - r)) && walk(m, Math.floor(x + r), Math.floor(y - r)) && walk(m, Math.floor(x - r), Math.floor(y + r)) && walk(m, Math.floor(x + r), Math.floor(y + r));
        if (ok(p.x + vx, p.y)) p.x += vx; if (ok(p.x, p.y + vy)) p.y += vy;
        this.bob += sp * 9; this.walked += sp; if (this.walked > (running ? .9 : 1.5)) { this.walked = 0; G.sfx('step', running ? .9 : .5); }
      }
      // repairing: hold E while facing a red relay. It is loud.
      const f = this.facing(1.4); this.repairing = null;
      if (G.keys.e && f && f.c === 3) {
        const rl = this.relays.find(q => q.x === f.x && q.y === f.y);
        if (rl) { this.repairing = rl; rl.prog += dt / Math.max(1.6, 2.4 + n * .03); this.noise = Math.max(this.noise, .8); if (Math.random() < dt * 6) G.sfx('click', .5);
          if (rl.prog >= 1) { rl.done = true; m[rl.y][rl.x] = 6; this.fixed++; G.sfx('power'); G.score += 200; this.msg = this.fixed < this.need ? `Relay ${this.fixed} of ${this.need} online!` : 'Signal restored! Get to the escape pod!'; this.msgT = 3; if (this.fixed === this.need) G.sfx('win'); } }
      }
      for (const it of this.items) if (!it.got && Math.hypot(it.x - p.x, it.y - p.y) < .6) { it.got = true; this.hp = Math.min(100, this.hp + 40); G.sfx('coin'); this.msg = 'Patched up'; this.msgT = 2; }
      if (this.fixed === this.need && Math.hypot(this.pod.fx - p.x, this.pod.fy - p.y) < .9) { G.score += 1000 + n * 60; return G.win(this.hp >= 70 ? 3 : this.hp >= 35 ? 2 : 1, 'You launched the escape pod!'); }
      // the Signal: wanders, hunts what it sees or hears, has to bash through shut doors
      const d = Math.hypot(mon.x - p.x, mon.y - p.y);
      mon.stun -= dt; mon.calm -= dt; mon.repath -= dt;
      const passable = (x, y) => walk(m, x, y) || m[y]?.[x] === 5;
      if (mon.calm <= 0) {
        const sees = d < 8 && Ray.los({tile: (x, y) => (walk(m, x, y) ? 0 : 1)}, mon.x, mon.y, p.x, p.y);
        const hears = (this.noise > .5 && d < 6 + n * .15) || d < 1.8;
        if (sees || hears) { if (mon.state !== 'hunt') { mon.shriek = .8; G.scream(Math.max(.3, 1 - d / 12), 1.1); this.msg = 'IT HEARD YOU!'; this.msgT = 2; } mon.state = 'hunt'; mon.lost = 0; }
        else if (mon.state === 'hunt' && (mon.lost += dt) > 5) { mon.state = 'wander'; mon.target = null; }
      }
      if (mon.repath <= 0) {
        mon.repath = .4;
        if (mon.state !== 'hunt' && (!mon.target || !mon.path.length)) { const fl = []; for (let y = 1; y < this.S - 1; y++) for (let x = 1; x < this.S - 1; x++) if (m[y][x] === 0) fl.push([x, y]); mon.target = G.pick(fl); }
        const [tx, ty] = mon.state === 'hunt' ? [Math.floor(p.x), Math.floor(p.y)] : mon.target;
        mon.path = this.route(Math.floor(mon.x), Math.floor(mon.y), tx, ty, passable);
      }
      if (mon.stun <= 0 && mon.shriek <= 0 && mon.path.length) {
        const [cx, cy] = mon.path[0];
        if (m[cy][cx] === 5) { // a shut bulkhead: it hammers on it
          const dd = this.doors.find(q => q.x === cx && q.y === cy);
          if ((mon.bash -= dt) <= 0) { mon.bash = .5; G.sfx('boom', Math.max(.15, .7 - d / 15)); if (d < 10) G.shake(2, .1); }
          if (dd && (dd.hp -= dt) <= 0) { m[cy][cx] = 7; G.sfx('crunch'); }
        } else {
          const gx = cx + .5, gy = cy + .5, dd = Math.hypot(gx - mon.x, gy - mon.y), sp = (mon.state === 'hunt' ? Math.min(3.2, 1.75 + n * .045) : 1.1) * dt;
          mon.step += sp; if (dd <= sp) { mon.x = gx; mon.y = gy; mon.path.shift(); } else { mon.x += (gx - mon.x) / dd * sp; mon.y += (gy - mon.y) / dd * sp; }
        }
      }
      if (d < .7 && mon.stun <= 0 && mon.calm <= 0) {
        this.hp -= 34; mon.stun = 1.6; mon.calm = 4.5; mon.state = 'wander'; mon.target = null; mon.path = [];
        G.shake(16, .6); G.flash('rgba(0,120,160,.55)', .7); G.scream(1, 1.4); G.sfx('boom', .7);
        if (this.hp <= 0) { this.hp = 0; this.scare = 1.4; this.dying = 1.4; return; }
        this.scare = .7;
      }
      // motion tracker beeps faster as it gets close
      if (d < 14 && (this.beepT -= dt) <= 0) { this.beepT = .18 + d * .07; G.sfx('select', Math.max(.15, 1 - d / 14)); }
    },
    route(sx, sy, tx, ty, ok) {
      const n = this.S, prev = new Int32Array(n * n).fill(-1), q = [sy * n + sx]; prev[sy * n + sx] = sy * n + sx;
      for (let i = 0; i < q.length; i++) { const c = q[i], x = c % n, y = (c / n) | 0; if (x === tx && y === ty) break; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy, k = ny * n + nx; if (nx >= 0 && ny >= 0 && nx < n && ny < n && ok(nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } } }
      const t = ty * n + tx; if (prev[t] < 0) return []; const path = []; for (let c = t; c !== sy * n + sx; c = prev[c]) path.unshift([c % n, (c / n) | 0]); return path;
    },
    draw(ctx, dt) {
      const p = this.p, m = this.map, T = textures(), mon = this.mon, d = Math.hypot(mon.x - p.x, mon.y - p.y);
      const frame = mon.shriek > 0 || d < 1.6 ? 'attack' : mon.path.length && mon.stun <= 0 ? FRAMES[Math.floor(mon.step * 2.2) % 4] : 'idle';
      const sprites = this.items.filter(i => !i.got).map(i => ({x: i.x, y: i.y, tex: T.med, scale: .6, glow: .4}));
      const tex = G.pixels(`img/signal_${frame}.png`); if (tex) sprites.push({x: mon.x, y: mon.y, tex, scale: 1.25, glow: .1});
      const flick = Math.random() < .03 ? .4 : 1;
      Ray.render(R, {x: p.x, y: p.y, a: p.a, bob: Math.sin(this.bob) * 2}, {
        tile: (x, y) => x < 0 || y < 0 || x >= this.S || y >= this.S ? 1 : m[y][x],
        see: t => t === 7, wallTex: t => T[t] || T[1], floorTex: T.floor, ceilTex: T.ceil,
        light: dd => flick * .55 / (1 + dd * .35), beam: c => Math.max(0, 1 - (c * 1.2) ** 2) * .9,
        emissive: c => ((c >>> 8) & 255) > 200 && (c & 255) < 140, fogColor: '#05080e', fogDensity: .08, sprites
      });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(R.canvas, 0, 0, G.W, G.H); ctx.imageSmoothingEnabled = true;
      const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * .25, G.W / 2, G.H / 2, G.W * .65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,${d < 5 ? 40 : 0},${d < 5 ? 60 : 0},${d < 5 ? .8 : .65})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
      if (this.scare > 0) {
        const face = G.img('img/signal_face.png'), k = 1 + (1 - this.scare) * .25;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.scare * 3)})`; ctx.fillRect(0, 0, G.W, G.H);
        if (face.complete && face.naturalWidth) { const s = G.W * 1.1 * k, j = (Math.random() - .5) * 24; ctx.drawImage(face, G.W / 2 - s / 2 + j, G.H / 2 - s * .5 + j, s, s); }
        ctx.fillStyle = 'rgba(0,80,120,.25)'; ctx.fillRect(0, 0, G.W, G.H); return;
      }
      // motion tracker
      const tx = G.W / 2, ty = G.H - 58, tr = 50;
      ctx.fillStyle = 'rgba(4,20,16,.82)'; ctx.beginPath(); ctx.arc(tx, ty + 30, tr + 10, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(94,240,138,.35)'; ctx.lineWidth = 1; for (const r of [tr * .33, tr * .66, tr]) { ctx.beginPath(); ctx.arc(tx, ty + 30, r, Math.PI, 0); ctx.stroke(); }
      const sweep = (this.t * 2) % 1; ctx.strokeStyle = `rgba(94,240,138,${.6 - sweep * .6})`; ctx.beginPath(); ctx.arc(tx, ty + 30, tr * sweep, Math.PI, 0); ctx.stroke();
      if (d < 14) { const rel = Math.atan2(mon.y - p.y, mon.x - p.x) - p.a - Math.PI / 2, rr = Math.min(1, d / 14) * tr, bx = tx + Math.cos(rel) * rr, by = ty + 30 + Math.sin(rel) * rr; if (by <= ty + 30) { G.circle(bx, by, 6, 'rgba(94,240,138,.3)'); G.circle(bx, by, 3.5, '#9ff8b8'); } }
      G.text(d < 14 ? `${d.toFixed(0)}m` : '--', tx, ty + 26, {size: 11, align: 'center', weight: 800, color: '#9ff8b8'});
      // compass to the next relay or the pod
      const goals = this.fixed < this.need ? this.relays.filter(r => !r.done).map(r => ({x: r.fx, y: r.fy})) : [{x: this.pod.fx, y: this.pod.fy}];
      const g = goals.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (g) { const rel = Math.atan2(g.y - p.y, g.x - p.x) - p.a; ctx.save(); ctx.translate(G.W / 2, 30); ctx.rotate(rel); ctx.fillStyle = this.fixed < this.need ? 'rgba(255,90,90,.9)' : 'rgba(94,240,138,.9)'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore(); G.text(`${Math.round(Math.hypot(g.x - p.x, g.y - p.y))}m`, G.W / 2, 56, {size: 11, align: 'center', color: '#e8e2d0', shadow: true}); }
      const f = this.facing(1.6);
      if (this.repairing) { G.panel(G.W / 2 - 110, G.H / 2 + 30, 220, 26, 8, 'rgba(0,0,0,.7)'); G.rr(G.W / 2 - 104, G.H / 2 + 36, 208 * this.repairing.prog, 14, 5, '#ffcf5c'); G.text('REPAIRING… (it can hear you)', G.W / 2, G.H / 2 + 74, {size: 13, align: 'center', weight: 800, color: '#ffcf5c', shadow: true}); }
      else if (f && f.c === 3) G.text('Hold E to repair', G.W / 2, G.H / 2 + 44, {size: 15, align: 'center', weight: 800, color: '#fff', shadow: true});
      else if (f && (f.c === 5 || f.c === 7) && this.doors.some(q => q.x === f.x && q.y === f.y)) G.text(f.c === 7 ? 'E: shut door' : 'E: open door', G.W / 2, G.H / 2 + 44, {size: 15, align: 'center', weight: 800, color: '#fff', shadow: true});
      for (let i = 0; i < this.need; i++) G.rr(14 + i * 22, 14, 16, 22, 4, i < this.fixed ? '#5ef08a' : '#ff5b5b');
      G.panel(10, G.H - 62, 170, 52);
      G.bar({x: 20, y: G.H - 52, w: 150, h: 14, v: this.hp, max: 100, color: '#d9374b', label: `HEALTH ${Math.ceil(this.hp)}`, id: 'hp'});
      G.bar({x: 20, y: G.H - 30, w: 150, h: 14, v: this.stamina, max: 100, color: this.tired ? '#7a7f99' : '#5ee6c1', label: 'STAMINA'});
      if (this.msgT > 0) G.text(this.msg, G.W / 2, 92, {size: 16, align: 'center', weight: 800, color: '#cfe8ff', shadow: true});
      G.circle(G.W / 2, G.H / 2, 2, 'rgba(255,255,255,.5)');
    }
  });
})();

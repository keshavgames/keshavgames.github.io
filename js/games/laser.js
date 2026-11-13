(() => {
  // Neon free-for-all on the shared raycaster. Soldiers and the blaster are Blender renders.
  const RW = 320, RH = 200, R = Ray.create(RW, RH);
  const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
  const NEON = {blue: '#5cb8ff', red: '#ff5b6b', green: '#7ee08a', yellow: '#ffd25c', purple: '#b07bff', orange: '#ff9f43', pink: '#ff7bd0', teal: '#4ff0d8'};
  const ASSETS = [...COLORS.flatMap(c => ['front', 'back', 'left', 'right'].flatMap(d => [0, 1].map(f => `img/soldier_${c}_${d}_${f}.png`))), 'img/gun_blaster.png'];
  const MAPS = [
    {name: 'Cyan Cube', hue: '#2ad8ff', rows: [
      '########################', '#S....#........#.....S.#', '#.....#..P.....#.......#', '#..##.....##.......##..#', '#..##.....##.......##..#', '#.......#....#.........#',
      '#.......#....#....P....#', '####..###....###..######', '#......................#', '#..P...oo....oo........#', '#......oo....oo....##..#', '#S.................##.S#',
      '#..##..............P...#', '#..##....oo....oo......#', '#........oo....oo......#', '#......................#', '######..###....###..####', '#.....................P#',
      '#..P....#....#.........#', '#..##...#....#....##...#', '#..##.............##...#', '#.......#.....#........#', '#S......#.....#......S.#', '########################']},
    {name: 'Magenta Maze', hue: '#ff3bd0', rows: [
      '########################', '#S.........##.........S#', '#.####.###.##.###.####.#', '#.#..........P.......#.#', '#.#.##.##.####.##.##.#.#', '#......#........#......#',
      '#.##.#.#.######.#.#.##.#', '#..P.#..........#..#...#', '###..####.##.####..#.###', '#........#..#.........S#', '#.######.#..#.#######..#', '#S.......P..........P..#',
      '#.######.#..#.#######..#', '#........#..#..........#', '###..####.##.####..#.###', '#....#..........#..#...#', '#.##.#.#.######.#.#.##.#', '#......#...P....#......#',
      '#.#.##.##.####.##.##.#.#', '#.#..................#.#', '#.####.###.##.###.####.#', '#S.........##.........S#', '#......................#', '########################']},
    {name: 'Sunset Yard', hue: '#ff9f43', rows: [
      '########################', '#S.......#....#.......S#', '#........#....#........#', '#..oo..........P...oo..#', '#..oo..............oo..#', '#.......####..####.....#',
      '#..P...#..........#....#', '#.......#..oo..oo.#....#', '##..##..#..oo..oo.#..###', '#.......#.........P#...#', '#S.........####........#', '#..........####.......S#',
      '#.....P...####.........#', '#.......#..........#....#', '##..##..#..oo..oo..#..##', '#.......#..oo..oo..#...#', '#.......#..........#...#', '#..P....####..####.....#',
      '#.................P....#', '#..oo..............oo..#', '#..oo..............oo..#', '#S.......#....#.......S#', '#........#....#........#', '########################']}
  ].map(m => ({...m, grid: m.rows.map(r => r.padEnd(24, '#').slice(0, 24).split(''))}));
  const POWERS = {heal: '#ff5b6b', shield: '#5cb8ff', rapid: '#ffd25c', speed: '#7ee08a'};
  let TEX = {};
  const textures = hue => TEX[hue] ||= {
    wall: Ray.paint(64, 64, g => { g.fillStyle = '#141826'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1c2236'; g.fillRect(3, 3, 58, 58); g.fillStyle = '#262d45'; g.fillRect(6, 10, 52, 18); g.fillRect(6, 34, 52, 18); g.fillStyle = hue; g.fillRect(0, 4, 64, 2); g.fillRect(0, 58, 64, 2); g.fillRect(0, 0, 1, 64); g.globalAlpha = .35; g.fillRect(28, 20, 8, 4); g.globalAlpha = 1; }),
    pillar: Ray.paint(64, 64, g => { g.fillStyle = '#20263a'; g.fillRect(0, 0, 64, 64); g.fillStyle = hue; for (let y = 6; y < 64; y += 14) g.fillRect(0, y, 64, 3); }),
    floor: Ray.paint(64, 64, g => { g.fillStyle = '#0c0f18'; g.fillRect(0, 0, 64, 64); g.fillStyle = hue; g.globalAlpha = .35; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); g.globalAlpha = 1; }),
    pad: Ray.paint(64, 64, g => { g.fillStyle = '#0c0f18'; g.fillRect(0, 0, 64, 64); g.strokeStyle = hue; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 22, 0, Math.PI * 2); g.stroke(); }),
    ...Object.fromEntries(Object.entries(POWERS).map(([k, c]) => [k, Ray.paint(64, 64, g => {
      g.fillStyle = c; g.beginPath(); g.moveTo(32, 18); g.lineTo(48, 34); g.lineTo(32, 50); g.lineTo(16, 34); g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.fillText({heal: '+', shield: 'S', rapid: '»', speed: '>'}[k], 32, 39);
    })]))
  };
  const BOT_NAMES = ['Zap', 'Blink', 'Nova', 'Glitch', 'Pixel', 'Spark', 'Byte'];

  GameBox.register({
    id: 'laser', title: 'Laser Arena', genre: 'Shooter', kind: 'Neon deathmatch', w: 640, h: 400, pointerLock: true, levels: 20, assets: ASSETS, thumb: 'jpg',
    hint: 'Tag everyone with your blaster! First to the target score wins. Grab the glowing power-ups.',
    desc: 'A neon free-for-all in three glowing arenas. Every bot is out for itself, so dodge behind pillars, grab health, shields, rapid fire and speed boosts, and be first to reach the tag target. No reloading: just do not let your blaster overheat. Twenty matches against smarter and smarter bots.',
    controls: [['WASD', 'Move'], ['Mouse', 'Look (click the screen first)'], ['Click / Space', 'Fire'], ['Q E / Left Right', 'Turn'], ['Shift', 'Sprint']],
    info() { const me = this.P[0]; return `Match ${G.level} · ${this.map.name} · You ${me.frags}/${this.goal}`; },
    init() {
      const n = G.level; this.map = MAPS[(n - 1) % MAPS.length]; this.grid = this.map.grid.map(r => r.slice());
      this.spawns = []; this.pads = [];
      this.grid.forEach((row, y) => row.forEach((c, x) => { if (c === 'S') this.spawns.push([x + .5, y + .5]); if (c === 'P') this.pads.push({x: x + .5, y: y + .5, kind: Object.keys(POWERS)[this.pads.length % 4], t: 0}); }));
      const bots = Math.min(7, 3 + Math.floor(n / 5));
      this.goal = Math.min(15, 5 + Math.floor(n / 2)); this.time = 180;
      this.P = Array.from({length: bots + 1}, (_, i) => ({i, name: i ? BOT_NAMES[i - 1] : 'You', color: COLORS[i], frags: 0, deaths: 0, hp: 100, shield: 0, a: 0, x: 0, y: 0, alive: true, respawn: 0, cd: 0, heat: 0, over: 0, rapid: 0, fast: 0, walk: 0, moving: false, safe: 0, flash: 0, hurt: 0, hitT: 0, streak: 0, path: [], repath: 0, react: 0, target: null, strafe: 1, strafeT: 0}));
      for (const p of this.P) this.spawn(p, true);
      this.beams = []; this.feed = []; this.parts = []; this.t = 0; this.done = false; this.msg = `${this.map.name}: first to ${this.goal} tags!`; this.msgT = 3;
    },
    tile(x, y) { const c = this.grid[y]?.[x]; return c === '#' ? 1 : c === 'o' ? 2 : c === undefined ? 1 : 0; },
    spawn(p, first) {
      const opts = this.spawns.map(([x, y]) => ({x, y, d: Math.min(...this.P.filter(q => q !== p && q.alive && q.x).map(q => Math.hypot(q.x - x, q.y - y)), 99)}));
      opts.sort((a, b) => b.d - a.d); const s = first ? this.spawns[p.i % this.spawns.length] : [opts[Math.floor(Math.random() * Math.min(3, opts.length))].x, opts[0].y];
      Object.assign(p, {x: first ? s[0] : opts[0].x, y: first ? s[1] : opts[0].y, hp: 100, shield: 0, alive: true, safe: 1.5, heat: 0, over: 0, path: [], target: null});
      p.a = Math.atan2(12 - p.y, 12 - p.x);
    },
    look(dx) { this.P[0].a += dx * .0026; },
    pointer(type) { if (type === 'down') this.wantFire = true; if (type === 'up') this.wantFire = false; },
    los(a, b) { return Ray.los({tile: (x, y) => this.tile(x, y)}, a.x, a.y, b.x, b.y); },
    fire(p) {
      if (!p.alive || p.cd > 0 || p.over > 0) return;
      p.cd = p.rapid > 0 ? .11 : .22; p.heat += .13; p.flash = .07; if (p.heat >= 1) { p.over = 1.2; if (p.i === 0) G.sfx('hurt', .4); }
      if (p.i === 0) G.sfx('laser'); else if (Math.hypot(p.x - this.P[0].x, p.y - this.P[0].y) < 10) G.sfx('laser', .35);
      // hitscan with a little aim help: the closest enemy inside a narrow cone and in sight
      const wall = Ray.hit({tile: (x, y) => this.tile(x, y)}, p.x, p.y, p.a, 40).d;
      let best = null, bestD = 1e9, cone = p.i === 0 ? .07 : .05;
      for (const q of this.P) {
        if (q === p || !q.alive) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y); let rel = Math.atan2(q.y - p.y, q.x - p.x) - p.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        if (d < wall && Math.abs(rel) < Math.max(cone, .35 / d) && d < bestD) { best = q; bestD = d; }
      }
      const len = best ? bestD : wall;
      this.beams.push({x: p.x, y: p.y, x2: p.x + Math.cos(p.a) * len, y2: p.y + Math.sin(p.a) * len, c: NEON[p.color], t: .12, i: p.i});
      if (best) this.damage(best, 25, p);
    },
    damage(q, dmg, from) {
      if (q.safe > 0) return;
      const soak = Math.min(q.shield, dmg * .6); q.shield -= soak; q.hp -= dmg - soak; q.hurt = .3; from.hitT = .15;
      if (from.i === 0) { G.sfx('hit', .6); G.popText(this.parts, 320, 170, `-${dmg}`, '#ffcf5c', 16); }
      if (q.i === 0) { G.flash('rgba(255,40,80,.3)', .2); G.shake(4, .15); }
      if (q.hp <= 0) {
        q.alive = false; q.deaths++; q.respawn = 2; q.streak = 0; from.frags++; from.streak++;
        this.feed.unshift({t: 4, text: `${from.name} tagged ${q.name}`, c: NEON[from.color]}); this.feed.length = Math.min(this.feed.length, 5);
        if (from.i === 0) { G.score += 100 + from.streak * 25; G.sfx('coin'); const s = ['', '', 'DOUBLE!', 'TRIPLE!', 'UNSTOPPABLE!'][Math.min(4, from.streak)]; this.msg = s || '+1 TAG'; this.msgT = 1.2; }
        if (q.i === 0) { this.msg = `Tagged by ${from.name}!`; this.msgT = 1.8; G.sfx('lose', .5); }
        if (from.frags >= this.goal && !this.done) this.finish(from);
      }
    },
    finish(winner) {
      const me = this.P[0];
      if (winner === me) { const lead = me.frags - Math.max(...this.P.slice(1).map(q => q.frags)); G.score += 500 + G.level * 50; this.done = {t: .7, go: () => G.win(lead >= 4 || me.deaths <= 1 ? 3 : lead >= 2 ? 2 : 1, 'You win the match!')}; }
      else this.done = {t: .7, go: () => G.end(`${winner.name} won the match`)};
      this.msg = winner === me ? 'YOU WIN!' : `${winner.name} WINS`; this.msgT = 2;
    },
    route(p, tx, ty) {
      const S = 24, prev = new Int16Array(S * S).fill(-1), sx = Math.floor(p.x), sy = Math.floor(p.y), q = [sy * S + sx]; prev[q[0]] = q[0];
      for (let i = 0; i < q.length; i++) { const c = q[i], x = c % S, y = (c / S) | 0; if (x === tx && y === ty) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = ny * S + nx; if (!this.tile(nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } } }
      const t = ty * S + tx; if (prev[t] < 0) return []; const path = []; for (let c = t; c !== sy * S + sx; c = prev[c]) path.unshift([c % S + .5, ((c / S) | 0) + .5]); return path;
    },
    move(p, vx, vy) { const r = .22, ok = (x, y) => !this.tile(Math.floor(x - r), Math.floor(y - r)) && !this.tile(Math.floor(x + r), Math.floor(y - r)) && !this.tile(Math.floor(x - r), Math.floor(y + r)) && !this.tile(Math.floor(x + r), Math.floor(y + r)); if (ok(p.x + vx, p.y)) p.x += vx; if (ok(p.x, p.y + vy)) p.y += vy; },
    bot(p, dt) {
      const n = G.level, skill = Math.min(1, .35 + n * .035);
      p.react -= dt; p.repath -= dt; p.strafeT -= dt;
      // pick a target: the nearest enemy it can see
      let tgt = null, td = 1e9;
      for (const q of this.P) if (q !== p && q.alive && q.safe <= 0) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < 15 && d < td && this.los(p, q)) { tgt = q; td = d; } }
      if (tgt !== p.target) { p.target = tgt; p.react = .55 - skill * .35; }
      if (tgt) {
        const want = Math.atan2(tgt.y - p.y, tgt.x - p.x) + (Math.random() - .5) * (.5 - skill * .4) / Math.max(1, td / 4);
        p.a += Math.atan2(Math.sin(want - p.a), Math.cos(want - p.a)) * Math.min(1, dt * (3 + skill * 5));
        if (p.strafeT <= 0) { p.strafeT = .6 + Math.random(); p.strafe = -p.strafe; }
        const sp = 2 * dt; this.move(p, -Math.sin(p.a) * p.strafe * sp, Math.cos(p.a) * p.strafe * sp); p.moving = true;
        if (td > 6) this.move(p, Math.cos(p.a) * sp, Math.sin(p.a) * sp);
        let rel = Math.atan2(tgt.y - p.y, tgt.x - p.x) - p.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        if (p.react <= 0 && Math.abs(rel) < .12 && p.heat < .85) this.fire(p);
        return;
      }
      // otherwise wander toward power-ups or the middle
      if (p.repath <= 0 || !p.path.length) {
        p.repath = 2; const pads = this.pads.filter(q => q.t <= 0);
        const goal = (p.hp < 60 && pads.length) ? pads.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : {x: 2 + Math.random() * 20, y: 2 + Math.random() * 20};
        p.path = this.route(p, Math.floor(goal.x), Math.floor(goal.y));
      }
      const nx = p.path[0]; if (!nx) return;
      const dx = nx[0] - p.x, dy = nx[1] - p.y, d = Math.hypot(dx, dy);
      if (d < .2) { p.path.shift(); return; }
      p.a += Math.atan2(Math.sin(Math.atan2(dy, dx) - p.a), Math.cos(Math.atan2(dy, dx) - p.a)) * Math.min(1, dt * 6);
      const sp = 2.6 * (p.fast > 0 ? 1.4 : 1) * dt; this.move(p, dx / d * sp, dy / d * sp); p.moving = true; p.walk += sp;
    },
    update(dt) {
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const me = this.P[0]; this.t += dt; this.msgT -= dt; this.time -= dt;
      if (this.time <= 0) { const top = this.P.slice().sort((a, b) => b.frags - a.frags)[0]; this.finish(top.frags === me.frags ? me : top); return; }
      for (const p of this.P) {
        p.cd -= dt; p.flash -= dt; p.hurt -= dt; p.hitT -= dt; p.safe -= dt; p.rapid -= dt; p.fast -= dt; p.moving = false;
        if (p.over > 0) { p.over -= dt; if (p.over <= 0) p.heat = 0; } else p.heat = Math.max(0, p.heat - dt * .45);
        if (!p.alive) { if ((p.respawn -= dt) <= 0) this.spawn(p); continue; }
        if (p.i === 0) {
          p.a += (G.held('ArrowRight', 'e') - G.held('ArrowLeft', 'q')) * 2.6 * dt;
          const f = G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), s = G.held('d') - G.held('a');
          if (f || s) { const sp = (G.keys.Shift ? 4 : 3.1) * (p.fast > 0 ? 1.4 : 1) * dt, l = Math.hypot(f, s); this.move(p, (Math.cos(p.a) * f - Math.sin(p.a) * s) / l * sp, (Math.sin(p.a) * f + Math.cos(p.a) * s) / l * sp); p.moving = true; p.walk += sp; }
          if (this.wantFire || G.keys[' ']) this.fire(p);
        } else this.bot(p, dt);
        for (const pad of this.pads) if (pad.t <= 0 && Math.hypot(pad.x - p.x, pad.y - p.y) < .6) {
          pad.t = 15; if (pad.kind === 'heal') p.hp = Math.min(100, p.hp + 50); if (pad.kind === 'shield') p.shield = Math.min(100, p.shield + 50); if (pad.kind === 'rapid') p.rapid = 8; if (pad.kind === 'speed') p.fast = 8;
          if (p.i === 0) { G.sfx('power'); this.msg = {heal: '+50 HEALTH', shield: '+50 SHIELD', rapid: 'RAPID FIRE!', speed: 'SPEED BOOST!'}[pad.kind]; this.msgT = 1.5; }
        }
      }
      for (const pad of this.pads) pad.t -= dt;
      for (const b of this.beams) b.t -= dt; this.beams = this.beams.filter(b => b.t > 0);
      for (const f of this.feed) f.t -= dt; this.feed = this.feed.filter(f => f.t > 0);
    },
    sprite(viewer, o) {
      const f = [Math.cos(o.a), Math.sin(o.a)], to = [viewer.x - o.x, viewer.y - o.y], l = Math.hypot(...to) || 1;
      const front = (f[0] * to[0] + f[1] * to[1]) / l, side = f[0] * -Math.sin(viewer.a) + f[1] * Math.cos(viewer.a);
      const dir = front > .7 ? 'front' : front < -.7 ? 'back' : side > 0 ? 'right' : 'left';
      return G.pixels(`img/soldier_${o.color}_${dir}_${Math.floor(o.walk * 2.5) % 2}.png`);
    },
    project(cam, x, y) { // world point to screen x and depth, matching the raycaster's camera
      const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), plX = -dirY * .66, plY = dirX * .66, inv = 1 / (plX * dirY - dirX * plY);
      const sx = x - cam.x, sy = y - cam.y, tX = inv * (dirY * sx - dirX * sy), tY = inv * (-plY * sx + plX * sy);
      return {x: (RW / 2) * (1 + tX / tY), d: tY};
    },
    draw(ctx, dt) {
      const me = this.P[0], T = textures(this.map.hue), hue = this.map.hue;
      const sprites = this.P.filter(o => o !== me && o.alive).map(o => ({x: o.x, y: o.y, tex: this.sprite(me, o), scale: .95, glow: o.safe > 0 ? .9 : .25}));
      for (const pad of this.pads) if (pad.t <= 0) sprites.push({x: pad.x, y: pad.y, tex: T[pad.kind], scale: .45, lift: .25 + Math.sin(this.t * 3) * .05, glow: 1});
      const neon = Ray.hex(hue);
      Ray.render(R, {x: me.x, y: me.y, a: me.a, bob: me.moving ? Math.sin(me.walk * 7) * 2 : 0}, {
        tile: (x, y) => this.tile(x, y), wallTex: t => t === 2 ? T.pillar : T.wall, floorTex: T.floor,
        floorAt: (x, y) => this.pads.some(q => Math.floor(q.x) === x && Math.floor(q.y) === y) ? T.pad : null,
        sky: k => Ray.pack(14 + 30 * k | 0, 8 + 14 * k | 0, 30 + 40 * k | 0), light: d => Math.max(.35, 1.05 - d * .04),
        emissive: c => c === neon || (c & 0xffffff) === (neon & 0xffffff), fogColor: '#0a0614', fogDensity: .03, sprites
      });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(R.canvas, 0, 0, G.W, G.H); ctx.imageSmoothingEnabled = true;
      // laser beams from other players that cross your view
      const k = G.W / RW, hz = G.H / 2;
      for (const b of this.beams) {
        if (b.i === 0) continue;
        const a = this.project(me, b.x, b.y), c = this.project(me, b.x2, b.y2);
        if (a.d < .2 && c.d < .2) continue;
        const clip = (p, q) => { if (p.d >= .2) return p; const t = (.2 - p.d) / (q.d - p.d); return {x: (RW / 2) * (1 + ((p.x / (RW / 2) - 1) * p.d * (1 - t) + (q.x / (RW / 2) - 1) * q.d * t) / .2), d: .2}; };
        const A = clip(a, c), C = clip(c, a);
        ctx.strokeStyle = b.c; ctx.globalAlpha = b.t / .12; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(A.x * k, hz + 6 / A.d); ctx.lineTo(C.x * k, hz + 6 / C.d); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (!me.alive) {
        ctx.fillStyle = 'rgba(40,0,30,.55)'; ctx.fillRect(0, 0, G.W, G.H);
        G.text('TAGGED!', G.W / 2, G.H / 2 - 10, {size: 32, align: 'center', display: true, color: '#ff7bd0', shadow: true});
        G.text(`Back in ${Math.max(0, me.respawn).toFixed(1)}`, G.W / 2, G.H / 2 + 22, {size: 15, align: 'center', weight: 800, color: '#fff', shadow: true});
      } else {
        // my beam, gun, heat
        for (const b of this.beams) if (b.i === 0) { ctx.strokeStyle = NEON.blue; ctx.globalAlpha = b.t / .12; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(G.W * .64, G.H * .8); ctx.lineTo(G.W / 2, G.H / 2); ctx.stroke(); ctx.globalAlpha = 1; }
        const gun = G.img('img/gun_blaster.png'), gw = G.W * .62, gh = gw * 2 / 3, bob = me.moving ? Math.sin(me.walk * 7) * 6 : 0, kick = me.flash > 0 ? 10 : 0;
        if (gun.complete && gun.naturalWidth) ctx.drawImage(gun, G.W - gw + 10, G.H - gh + 16 + bob + kick, gw, gh);
        if (me.flash > 0) G.circle(G.W * .64, G.H * .8 + bob, 16, 'rgba(120,220,255,.9)');
        if (me.hurt > 0) { ctx.fillStyle = `rgba(255,30,80,${me.hurt * .8})`; ctx.fillRect(0, 0, G.W, G.H); }
        if (me.safe > 0) G.text('SHIELDED', G.W / 2, G.H / 2 + 50, {size: 12, align: 'center', weight: 800, color: '#9fe8ff', shadow: true});
        ctx.strokeStyle = me.hitT > 0 ? '#ff4b62' : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); const cx = G.W / 2, cy = G.H / 2;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(cx + dx * 5, cy + dy * 5); ctx.lineTo(cx + dx * 12, cy + dy * 12); } ctx.stroke();
        G.bar({x: 14, y: G.H - 44, w: 170, h: 14, v: me.hp, max: 100, color: me.hp < 30 ? '#ff4b62' : '#5ee6c1', label: `HP ${Math.ceil(me.hp)}`});
        if (me.shield > 0) G.bar({x: 14, y: G.H - 24, w: 170, h: 10, v: me.shield, max: 100, color: '#5cb8ff', label: ''});
        G.bar({x: G.W - 184, y: G.H - 28, w: 170, h: 12, v: me.over > 0 ? 1 : me.heat, max: 1, color: me.over > 0 ? '#ff4b62' : me.heat > .7 ? '#ff9f43' : '#9fe8ff', label: me.over > 0 ? 'OVERHEATED' : 'HEAT'});
        if (me.rapid > 0) G.text(`RAPID ${Math.ceil(me.rapid)}`, G.W - 16, G.H - 40, {size: 12, align: 'right', weight: 800, color: POWERS.rapid, shadow: true});
        if (me.fast > 0) G.text(`SPEED ${Math.ceil(me.fast)}`, G.W - 16, G.H - 54, {size: 12, align: 'right', weight: 800, color: POWERS.speed, shadow: true});
      }
      // scoreboard and feed
      const board = this.P.slice().sort((a, b) => b.frags - a.frags);
      G.panel(G.W - 150, 10, 140, 16 + board.length * 16, 8, 'rgba(6,4,16,.6)');
      board.forEach((q, i) => { G.circle(G.W - 138, 24 + i * 16, 4, NEON[q.color]); G.text(q.name, G.W - 128, 28 + i * 16, {size: 12, weight: q.i === 0 ? 800 : 600, color: q.i === 0 ? '#fff' : '#c4c8ee'}); G.text(String(q.frags), G.W - 18, 28 + i * 16, {size: 12, align: 'right', weight: 800, color: '#fff'}); });
      this.feed.forEach((f, i) => G.text(f.text, 14, 24 + i * 16, {size: 12, weight: 700, color: f.c, shadow: true}));
      const mm = Math.floor(Math.max(0, this.time) / 60), ss = String(Math.floor(Math.max(0, this.time) % 60)).padStart(2, '0');
      G.text(`${mm}:${ss}`, G.W / 2, 24, {size: 16, align: 'center', weight: 800, color: '#fff', shadow: true});
      G.text(`FIRST TO ${this.goal}`, G.W / 2, 40, {size: 10, align: 'center', weight: 800, color: hue, shadow: true});
      if (this.msgT > 0) G.text(this.msg, G.W / 2, 92, {size: 22, align: 'center', display: true, color: '#fff', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

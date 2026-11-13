(() => {
  // First-person night forest on the shared raycaster. Trees, lanterns, the gate and the stalker are Blender sprites.
  const RW = 320, RH = 200, R = Ray.create(RW, RH);
  const TREES = ['tree_pine', 'tree_pine2', 'tree_dead'];
  const SPR = [...TREES, 'stalker_idle', 'stalker_lunge', 'lantern_off', 'lantern_on', 'gate'];
  const ASSETS = [...SPR.map(s => `img/${s}.png`), 'img/stalker_face.png'];
  // 1 map unit = 3.2 m, so sprite scale = real height / 3.2 (each sprite's frame height in metres)
  const SCALE = {tree_pine: 1.94, tree_pine2: 1.94, tree_dead: 1.94, stalker_idle: 1.22, stalker_lunge: 1.22, lantern_off: .47, lantern_on: .47, gate: 1.25};
  let TEX = null;
  const textures = () => TEX ||= {
    floor: Ray.paint(64, 64, g => {
      g.fillStyle = '#1d2a18'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 260; i++) { g.fillStyle = ['#2a3a1f', '#16210f', '#3a2f1c', '#24331a', '#4a3a22'][i % 5]; g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 3, 1 + Math.random() * 2); }
    }),
    hedge: Ray.paint(64, 64, g => {
      g.fillStyle = '#0b140c'; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 180; i++) { g.fillStyle = ['#13241a', '#0e1c12', '#1a2e1e', '#08110a'][i % 4]; g.beginPath(); g.ellipse(Math.random() * 64, Math.random() * 64, 3 + Math.random() * 5, 2 + Math.random() * 3, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, 52, 64, 12);
    })
  };
  const SKY = Array.from({length: 32}, (_, i) => { const t = i / 31; return Ray.pack(6 + 18 * t * t, 9 + 26 * t * t, 16 + 40 * t * t); }); // night sky, lighter at the horizon

  GameBox.register({
    id: 'woods', title: 'Whisper Woods', genre: 'Horror', kind: 'First-person forest horror', w: 640, h: 400, pointerLock: true, levels: 30, assets: ASSETS, thumb: 'jpg',
    hint: 'Light every lantern, then find the gate. Something follows you. Do not stare at it!',
    desc: 'Lost in a forest at night, you have to light the old stone lanterns to open the moon gate home. Something with antlers is following you. It only moves when you are not looking, but staring at it makes it angry. Lit lanterns keep it away. Thirty nights, each forest bigger than the last.',
    controls: [['W S / Up Down', 'Walk'], ['A D', 'Strafe'], ['Q E / Left Right', 'Turn'], ['Mouse', 'Look (click the screen first)'], ['Shift', 'Run']],
    info() { return `Night ${G.level} · Lanterns ${this.lit}/${this.lanterns.length}`; },
    init() {
      const n = G.level, rnd = G.seeded(n * 131 + 7), N = this.N = Math.min(46, 22 + n);
      this.hp = 100; this.stamina = 100; this.tired = false; this.t = 0; this.bob = 0; this.walked = 0; this.scare = 0; this.dying = 0; this.static = 0; this.beatT = 0;
      this.p = {x: N / 2 + .5, y: N - 3.5, a: -Math.PI / 2};
      this.gate = {x: N / 2 + .5, y: 2.5};
      const count = Math.min(8, 3 + Math.floor(n / 4)), spots = [];
      for (let tries = 0; spots.length < count && tries < 4000; tries++) {
        const x = 4 + rnd() * (N - 8), y = 4 + rnd() * (N - 8);
        if ([...spots, this.p, this.gate].every(s => Math.hypot(s.x - x, s.y - y) > Math.max(5, N / 5))) spots.push({x, y});
      }
      this.lanterns = spots.map(s => ({x: s.x, y: s.y, on: false})); this.lit = 0;
      // trees on a grid, one per cell at most, then carve walkable paths to every goal
      const tree = this.tree = Array.from({length: N}, () => new Array(N).fill(null)), dens = Math.min(.48, .38 + n * .004);
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++)
        if (rnd() < dens) tree[y][x] = {x: x + .25 + rnd() * .5, y: y + .25 + rnd() * .5, kind: TREES[rnd.int(n < 4 ? 2 : 3)]};
      const clear = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (tree[y]?.[x]) tree[y][x] = null; };
      const carve = (a, b) => { let x = a.x, y = a.y; for (let i = 0; i < 400 && Math.hypot(b.x - x, b.y - y) > .8; i++) { const k = rnd() < .5; if (k) x += Math.sign(b.x - x) * .9; else y += Math.sign(b.y - y) * .9; clear(x, y, .45); } };
      [this.gate, ...this.lanterns].forEach(g => { carve(this.p, g); clear(g.x, g.y, 1.6); });
      clear(this.p.x, this.p.y, 1.2);
      this.trees = tree.flat().filter(Boolean);
      // the stalker starts far behind you
      this.st = {x: this.p.x, y: Math.min(N - 2, this.p.y + 10), watch: 0, tele: 7, shown: false, lunge: 0, seenT: 0};
      this.place(this.st, 12, Math.PI / 2);
      this.msg = `Light ${count} lanterns, then reach the gate.`; this.msgT = 4;
      this.flies = Array.from({length: 18}, () => ({x: Math.random() * 640, y: 160 + Math.random() * 200, p: Math.random() * 6}));
    },
    free(x, y, r = .32) {
      const N = this.N; if (x < 1.3 || y < 1.3 || x > N - 1.3 || y > N - 1.3) return false;
      for (let cy = Math.floor(y) - 1; cy <= Math.floor(y) + 1; cy++) for (let cx = Math.floor(x) - 1; cx <= Math.floor(x) + 1; cx++) {
        const t = this.tree[cy]?.[cx]; if (t && Math.hypot(t.x - x, t.y - y) < r) return false;
      }
      return true;
    },
    place(st, dist, around) { // put the stalker somewhere free at a distance, never inside a lantern's glow
      const p = this.p;
      for (let i = 0; i < 160; i++) {
        const a = i < 60 ? around + (Math.random() - .5) * 2.6 : Math.random() * Math.PI * 2, d = dist * (.85 + Math.random() * .3), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        if (!this.free(x, y, .5)) continue;
        if (this.lanterns.some(l => l.on && Math.hypot(l.x - x, l.y - y) < 3.2)) continue;
        st.x = x; st.y = y; return true;
      }
      return false;
    },
    look(dx) { this.p.a += dx * .0026; },
    hit(dmg) {
      const st = this.st;
      this.hp -= dmg; G.shake(16, .6); G.flash('rgba(160,0,10,.6)', .7); G.scream(1, 1.5); G.sfx('boom', .7);
      st.watch = 0; st.lunge = 0; st.tele = 6; this.place(st, 13, this.p.a + Math.PI);
      if (this.hp <= 0) { this.hp = 0; this.scare = 1.5; this.dying = 1.5; } else this.scare = .8;
    },
    update(dt) {
      const p = this.p, st = this.st, n = G.level;
      this.t += dt; this.msgT -= dt; this.scare -= dt; this.static = Math.max(0, this.static - dt * .8);
      if (this.dying > 0) { if ((this.dying -= dt) <= 0) G.end('It took you into the trees'); return; }
      p.a += (G.held('ArrowRight', 'e') - G.held('ArrowLeft', 'q')) * 2.4 * dt;
      const fwd = G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), str = G.held('d') - G.held('a'), moving = fwd || str;
      const running = G.keys.Shift && moving && !this.tired;
      if (running) { this.stamina -= 22 * dt; if (this.stamina <= 0) { this.stamina = 0; this.tired = true; } }
      else { this.stamina = Math.min(100, this.stamina + 16 * dt); if (this.stamina > 30) this.tired = false; }
      if (moving) {
        const sp = (running ? 3.6 : 2.3) * dt; let vx = Math.cos(p.a) * fwd - Math.sin(p.a) * str, vy = Math.sin(p.a) * fwd + Math.cos(p.a) * str;
        const l = Math.hypot(vx, vy); vx *= sp / l; vy *= sp / l;
        if (this.free(p.x + vx, p.y)) p.x += vx; if (this.free(p.x, p.y + vy)) p.y += vy;
        this.bob += sp * 9; this.walked += sp; if (this.walked > (running ? .9 : 1.4)) { this.walked = 0; G.sfx('step', running ? .8 : .45); }
      }
      for (const l of this.lanterns) if (!l.on && Math.hypot(l.x - p.x, l.y - p.y) < 1.1) {
        l.on = true; this.lit++; G.sfx('power'); G.score += 200; G.burst?.(this.parts || (this.parts = []), 320, 200, '#ffcf5c', 20);
        this.msg = this.lit < this.lanterns.length ? `Lantern ${this.lit} of ${this.lanterns.length}!` : 'The gate is open! Follow the arrow.'; this.msgT = 3;
        if (this.lit === this.lanterns.length) G.sfx('win');
      }
      if (this.lit === this.lanterns.length && Math.hypot(this.gate.x - p.x, this.gate.y - p.y) < 1.2) {
        G.score += 1000 + n * 60 + Math.round(this.hp) * 5;
        return G.win(this.hp >= 80 ? 3 : this.hp >= 40 ? 2 : 1, 'You found the way home!');
      }
      // the stalker: frozen while you look, moves closer when you look away, lunges if you stare too long
      const dx = st.x - p.x, dy = st.y - p.y, d = Math.hypot(dx, dy);
      let rel = Math.atan2(dy, dx) - p.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const seen = Math.abs(rel) < .62 && d < 11;
      if (st.lunge > 0) { // rushing you: it closes the gap fast
        st.lunge -= dt; const sp = Math.min(d - .6, 9 * dt); st.x -= dx / d * sp; st.y -= dy / d * sp;
        if (d < 1.1) return this.hit(55);
      } else if (seen) {
        if (!st.shown) { st.shown = true; G.scream(.18 + (1 - d / 11) * .3, .5); this.static = Math.max(this.static, .6); }
        st.watch += dt * (1.2 - d / 14);
        this.static = Math.max(this.static, Math.min(1, st.watch / 2.2) * .9);
        if (st.watch > 2.4) { st.lunge = 1.2; G.scream(1, 1); G.shake(8, .5); }
      } else {
        st.shown = false; st.watch = Math.max(0, st.watch - dt * .7);
        if ((st.tele -= dt) <= 0) {
          const lit = this.lit;
          st.tele = Math.max(2.5, 5.6 - lit * .3 - n * .05) * (.8 + Math.random() * .4);
          const step = .8 + lit * .2 + n * .02, target = Math.max(1.5, Math.min(13, d - step));
          if (target <= 1.6) return this.hit(40); // it reached you from behind
          // usually it moves out of sight; sometimes it slips right into your path
          this.place(st, target, Math.random() < .3 ? p.a : p.a + Math.PI + (Math.random() - .5) * 2);
          if (Math.random() < .5) G.sfx('step', .25 + (1 - target / 13) * .5);
        }
      }
      if (d < 8 && (this.beatT -= dt) <= 0) { this.beatT = .3 + d * .09; G.sfx('beat', 1.2 - d / 8); }
      for (const f of this.flies) { f.p += dt; f.x += Math.sin(f.p * 1.3) * 12 * dt; f.y += Math.cos(f.p * .9) * 8 * dt; }
    },
    draw(ctx, dt) {
      const p = this.p, st = this.st, T = textures(), px = s => G.pixels(`img/${s}.png`);
      const sprites = [];
      const near = (x, y, r = 15) => { const dx = x - p.x, dy = y - p.y; return dx * dx + dy * dy < r * r && dx * Math.cos(p.a) + dy * Math.sin(p.a) > -1.5; };
      for (const t of this.trees) if (near(t.x, t.y)) sprites.push({x: t.x, y: t.y, tex: px(t.kind), scale: SCALE[t.kind]});
      for (const l of this.lanterns) if (near(l.x, l.y, 30)) sprites.push({x: l.x, y: l.y, tex: px(l.on ? 'lantern_on' : 'lantern_off'), scale: SCALE.lantern_on, glow: l.on ? .9 : .25});
      const open = this.lit === this.lanterns.length;
      sprites.push({x: this.gate.x, y: this.gate.y, tex: px('gate'), scale: SCALE.gate, glow: open ? 1 : .2, wide: 1});
      const sk = st.lunge > 0 || st.watch > 1.6 ? 'stalker_lunge' : 'stalker_idle';
      const stS = {x: st.x, y: st.y, tex: px(sk), scale: SCALE[sk], glow: .14}; sprites.push(stS);
      const glowAt = (x, y) => this.lanterns.reduce((s, l) => l.on ? s + Math.max(0, 1 - Math.hypot(l.x - x, l.y - y) / 4) * .5 : s, 0);
      Ray.render(R, {x: p.x, y: p.y, a: p.a, bob: Math.sin(this.bob) * 2}, {
        tile: (x, y) => x <= 0 || y <= 0 || x >= this.N - 1 || y >= this.N - 1 ? 1 : 0,
        wallTex: () => T.hedge, floorTex: T.floor,
        sky: f => SKY[Math.min(31, Math.floor(f * 32))],
        light: dd => .75 / (1 + dd * .22) + glowAt(p.x, p.y) * .3,
        beam: c => Math.max(0, 1 - (c * 1.3) ** 2) * .9,
        fogColor: '#162034', fogDensity: .11,
        sprites: sprites.filter(s => s.tex)
      });
      ctx.imageSmoothingEnabled = false; ctx.drawImage(R.canvas, 0, 0, G.W, G.H); ctx.imageSmoothingEnabled = true;
      const sc = stS._screen; // two ember eyes so it shows up in the dark
      if (sc && sc.d < 13 && sc.x > 0 && sc.x < RW && R.zbuf[Math.floor(sc.x)] > sc.d) {
        const k = G.W / RW, ex = sc.x * k, ey = (sc.y + sc.h * .2) * k, gap = sc.w * .055 * k, r = Math.max(1.5, sc.w * .016 * k), a = Math.min(1, 1.3 - sc.d / 12);
        for (const sx of [-1, 1]) { G.circle(ex + sx * gap, ey, r * 3, `rgba(255,60,20,${a * .25})`); G.circle(ex + sx * gap, ey, r, `rgba(255,150,90,${a})`); }
      }
      this.stS = null;
      for (const f of this.flies) { const a = .4 + Math.sin(f.p * 3) * .4; G.circle(f.x, f.y, 2, `rgba(220,255,140,${a})`); }
      const d = Math.hypot(st.x - p.x, st.y - p.y);
      if (this.static > .02) { // TV snow when it is close or you stare
        ctx.globalAlpha = Math.min(.6, this.static * .6);
        for (let i = 0; i < 260; i++) { const v = Math.random() * 255 | 0; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(Math.random() * G.W, Math.random() * G.H, 3 + Math.random() * 10, 2); }
        ctx.globalAlpha = 1;
      }
      const vg = ctx.createRadialGradient(G.W / 2, G.H / 2, G.H * .25, G.W / 2, G.H / 2, G.W * .65);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(${d < 5 ? 60 : 0},0,0,${d < 5 ? .8 : .65})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, G.W, G.H);
      if (this.scare > 0) { // jumpscare: the skull fills the screen
        const face = G.img('img/stalker_face.png'), k = 1 + (1 - this.scare) * .3;
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.scare * 3)})`; ctx.fillRect(0, 0, G.W, G.H);
        if (face.complete && face.naturalWidth) { const s = G.W * 1.05 * k, j = (Math.random() - .5) * 24; ctx.drawImage(face, G.W / 2 - s / 2 + j, G.H / 2 - s * .5 + j, s, s); }
        ctx.fillStyle = 'rgba(100,0,0,.25)'; ctx.fillRect(0, 0, G.W, G.H);
        return;
      }
      if (st.watch > 1.1 && st.lunge <= 0) G.text('LOOK AWAY!', G.W / 2, G.H / 2 - 60, {size: 30, align: 'center', display: true, color: '#ff5b5b', shadow: true});
      // compass
      const goals = open ? [this.gate] : this.lanterns.filter(l => !l.on);
      const g = goals.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (g) {
        const rel = Math.atan2(g.y - p.y, g.x - p.x) - p.a;
        ctx.save(); ctx.translate(G.W / 2, 30); ctx.rotate(rel); ctx.fillStyle = open ? 'rgba(140,220,255,.9)' : 'rgba(255,207,92,.9)';
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
        G.text(`${Math.round(Math.hypot(g.x - p.x, g.y - p.y))}m`, G.W / 2, 56, {size: 11, align: 'center', color: '#e8e2d0', shadow: true});
      }
      for (let i = 0; i < this.lanterns.length; i++) { const on = this.lanterns[i].on; G.rr(14 + i * 22, 14, 16, 22, 4, on ? '#ffcf5c' : 'rgba(255,255,255,.14)'); if (on) G.circle(22 + i * 22, 25, 4, '#fff3c0'); }
      G.panel(10, G.H - 62, 200, 52);
      G.bar({x: 20, y: G.H - 52, w: 180, h: 14, v: this.hp, max: 100, color: '#d9374b', label: `HEALTH ${Math.ceil(this.hp)}`, id: 'hp'});
      G.bar({x: 20, y: G.H - 30, w: 180, h: 14, v: this.stamina, max: 100, color: this.tired ? '#7a7f99' : '#5ee6c1', label: 'STAMINA'});
      if (this.msgT > 0) G.text(this.msg, G.W / 2, G.H - 70, {size: 16, align: 'center', weight: 800, color: '#f0e6c8', shadow: true});
      G.circle(G.W / 2, G.H / 2, 2, 'rgba(255,255,255,.5)');
      if (this.parts) G.fx(this.parts, dt);
    }
  });
})();

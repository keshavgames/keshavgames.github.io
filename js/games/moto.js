(() => {
  // Side-view motocross with simple two-wheel physics. Bike and wheels are Blender renders.
  const W = 800, H = 450, PX = 60, R = 23, L = 74, GRAV = 1250;
  const ASSETS = ['img/moto_body.png', 'img/moto_wheel.png'];
  const SKIES = [['#8fd0ff', '#d8f0ff', '#7cb85a', '#8a5a34'], ['#ffb27a', '#ffe0b0', '#c89a4a', '#8a4a2a'], ['#7a8ad8', '#c8b8f0', '#5a8a6a', '#4a3a3a'], ['#9ad8e8', '#e8f8ff', '#e8f0f4', '#9aa8b8']];

  GameBox.register({
    id: 'moto', title: 'Moto Stunt', genre: 'Racing', kind: 'Motocross stunts', w: W, h: H, levels: 50, assets: ASSETS, thumb: 'jpg',
    hint: 'Right / D to go, Left / A to brake. Up and Down lean the bike. Do flips in the air!',
    desc: 'Ride a dirt bike over hills, ramps and huge jumps. Lean forward and back to land on both wheels, and spin full flips in the air for bonus points. Bump your helmet on the ground and you restart from the last flag, so take risks. Beat the target time for three stars on fifty tracks.',
    controls: [['Right / D', 'Throttle'], ['Left / A', 'Brake / reverse'], ['Up / W', 'Lean back (wheelie, backflip)'], ['Down / S', 'Lean forward (frontflip)'], ['R', 'Back to the last flag']],
    info() { return `Track ${G.level} · ${this.time.toFixed(1)}s · Flips ${this.flips}`; },
    init() {
      const n = G.level, Rnd = G.seeded(n * 47 + 3), len = 6500 + Math.min(6000, n * 120);
      this.sky = SKIES[Math.floor((n - 1) / 5) % SKIES.length];
      // ground heights every 10 px, built from a run of features that get bolder on later tracks
      const g = []; let y = 330;
      const push = (count, fn) => { for (let i = 0; i < count; i++) { y = fn(i, count); g.push(y); } };
      push(60, () => 330);
      while (g.length * 10 < len) {
        const f = Rnd.pick(n < 4 ? ['hill', 'bumps', 'flat', 'ramp'] : ['hill', 'bumps', 'ramp', 'jump', 'step', 'whoops', 'valley']), base = y;
        const amp = Math.min(150, 40 + n * 3) * (.6 + Rnd() * .6);
        if (f === 'flat') push(20 + Rnd.int(20), () => base);
        if (f === 'hill') { const k = Math.max(40 + Rnd.int(30), Math.ceil(amp * .5)); push(k, i => base - Math.sin(i / k * Math.PI) * amp); }
        if (f === 'valley') { const k = Math.max(40 + Rnd.int(30), Math.ceil(amp * .5)); push(k, i => base + Math.sin(i / k * Math.PI) * Math.min(90, amp)); }
        if (f === 'bumps') { const k = 50; push(k, i => base - (1 - Math.cos(i / 12 * Math.PI * 2)) * 8); }
        if (f === 'whoops') { const k = 60; push(k, i => base - (1 - Math.cos(i / 9 * Math.PI * 2)) * 5); }
        if (f === 'ramp') { const k = Math.max(18 + Rnd.int(10), Math.ceil(amp * .8 / 6)); push(k, i => base - i / k * amp * .8); push(30, () => y + (base - y) / 30 * 1.2); }
        if (f === 'jump') { const k = Math.max(16, Math.ceil(amp / 6)); push(k, i => base - i / k * amp); const top = y, gap = 16 + Rnd.int(Math.min(14, 3 + n / 3)); push(gap, i => top + 12 * i / gap + Math.sin(i / gap * Math.PI) * Math.min(130, 70 + n * 2, gap * 2.6)); push(45, i => top + 12 + (base - top - 12) * (i / 45)); } // takeoff, a dip you can fly over (or roll through), downhill landing
        if (f === 'step') { push(14, i => base - i / 14 * 60); push(20, () => base - 60); push(6, i => base - 60 + i / 6 * 60); }
        y = Math.max(140, Math.min(400, y)); g[g.length - 1] = y;
      }
      push(80, () => y);
      this.ground = g; this.len = g.length * 10 - 400; this.finish = this.len - 200;
      this.flags = []; for (let x = 900; x < this.finish - 300; x += 900) this.flags.push({x, got: false});
      this.deco = Array.from({length: Math.floor(this.len / 140)}, (_, i) => ({x: i * 140 + Rnd() * 100, k: Rnd.int(4), s: .6 + Rnd() * .6}));
      this.target = this.len / 340; this.time = 0; this.flips = 0; this.crashes = 0; this.t = 0; this.parts = []; this.done = null;
      this.spawn(120); this.msg = `Track ${n}`; this.msgT = 1.6;
    },
    gy(x) { const g = this.ground, i = Math.max(0, Math.min(g.length - 2, Math.floor(x / 10))), f = x / 10 - i; return g[i] * (1 - f) + g[i + 1] * f; },
    spawn(x) {
      const y = this.gy(x) - R - 2;
      this.A = {x: x - L / 2, y: this.gy(x - L / 2) - R - 2, px: x - L / 2, py: this.gy(x - L / 2) - R - 2, ground: false};
      this.B = {x: x + L / 2, y: this.gy(x + L / 2) - R - 2, px: x + L / 2, py: this.gy(x + L / 2) - R - 2, ground: false};
      this.spin = 0; this.airSpin = 0; this.best = x; this.stuckT = 0; this.rot = [0, 0]; this.crashT = 0; this.last = x; this.cam = x - 250;
    },
    key(k) { if (k === 'r' && !this.done) { this.spawn(this.last); this.time += 1; } },
    angle() { return Math.atan2(this.B.y - this.A.y, this.B.x - this.A.x); },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.crashT > 0) { if ((this.crashT -= dt) <= 0) this.spawn(this.last); return; }
      this.time += dt;
      const mid = (this.A.x + this.B.x) / 2; if (mid > (this.best || 0) + 30) { this.best = mid; this.stuckT = 0; } else if ((this.stuckT = (this.stuckT || 0) + dt) > 2.5) { this.stuckT = 0; this.msg = 'Stuck! Back to the flag'; this.msgT = 1.2; this.again(mid); this.spawn(this.last); return; }
      const thr = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a'), lean = G.held('ArrowUp', 'w') - G.held('ArrowDown', 's');
      const steps = 4, h = dt / steps;
      for (let s = 0; s < steps; s++) this.step(h, thr, lean);
      const a = this.angle(), cx = (this.A.x + this.B.x) / 2, cy = (this.A.y + this.B.y) / 2;
      // head check: hitting the helmet on the ground is a crash
      const hx = cx + Math.cos(a - Math.PI / 2) * 64 + Math.cos(a) * 8, hy = cy + Math.sin(a - Math.PI / 2) * 64 + Math.sin(a) * 8;
      if (hy > this.gy(hx) - 6) { this.crash(hx, hy); return; }
      // flips: count full turns made while both wheels are off the ground
      const air = !this.A.ground && !this.B.ground, da = Math.atan2(Math.sin(a - (this.lastA ?? a)), Math.cos(a - (this.lastA ?? a))); this.lastA = a;
      if (air) this.airSpin += da;
      else if (Math.abs(this.airSpin) > 0) {
        const turns = Math.floor(Math.abs(this.airSpin) / (Math.PI * 2) + .15);
        if (turns > 0) { this.flips += turns; G.score += turns * 500; this.msg = `${this.airSpin < 0 ? 'BACKFLIP' : 'FRONTFLIP'}${turns > 1 ? ' x' + turns : ''}! +${turns * 500}`; this.msgT = 1.6; G.sfx('power'); G.burst(this.parts, cx - this.cam, cy, '#ffcf5c', 20); }
        this.airSpin = 0;
      }
      this.rot[0] += (this.A.x - this.A.px) / R; this.rot[1] += (this.B.x - this.B.px) / R;
      for (const f of this.flags) if (!f.got && cx > f.x) { f.got = true; this.last = f.x + 10; G.sfx('coin'); this.msg = 'CHECKPOINT'; this.msgT = 1; }
      if (cx > this.finish) {
        G.score += 1000 + Math.max(0, Math.round((this.target * 1.6 - this.time) * 30)) + G.level * 40; G.party(); G.sfx('win');
        const stars = this.time <= this.target ? 3 : this.time <= this.target * 1.35 ? 2 : 1;
        this.done = {t: 1.2, go: () => G.win(stars, `Finished in ${this.time.toFixed(1)}s!`)}; this.msg = 'FINISH!'; this.msgT = 2;
      }
      this.cam += (cx - 260 - this.cam) * Math.min(1, dt * 5);
      if (Math.random() < dt * 30 && this.A.ground && thr > 0) this.parts.push({x: this.A.x - this.cam - 10, y: this.A.y + R - 4, vx: -80 - Math.random() * 80, vy: -60 - Math.random() * 60, life: .4, color: this.sky[3]});
    },
    step(h, thr, lean) {
      const A = this.A, B = this.B, damp = .999;
      for (const p of [A, B]) { const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + GRAV * h * h; }
      const a = this.angle(), nx = -Math.sin(a), ny = Math.cos(a);
      // engine drives the rear wheel along the ground; in the air the throttle does nothing
      if (A.ground && thr) { const acc = (thr > 0 ? 1050 : 800) * thr * h * h; A.x += Math.cos(a) * acc; A.y += Math.sin(a) * acc; }
      // leaning turns the bike around its middle, stronger in the air; early tracks help it stay upright
      const tq = lean * (A.ground || B.ground ? 2.2 : 4.4) * h * h * 60;
      A.x -= nx * tq; A.y -= ny * tq; B.x += nx * tq; B.y += ny * tq;
      if ((A.ground || B.ground) && !lean && G.level < 8) { const fix = -a * .02 * (1 - G.level / 8); A.x -= nx * fix; A.y -= ny * fix; B.x += nx * fix; B.y += ny * fix; }
      for (let it = 0; it < 3; it++) {
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, diff = (d - L) / d / 2;
        A.x += dx * diff; A.y += dy * diff; B.x -= dx * diff; B.y -= dy * diff;
        for (const p of [A, B]) {
          const g0 = this.gy(p.x - 4), g1 = this.gy(p.x + 4), slope = Math.atan2(g1 - g0, 8);
          const ground = this.gy(p.x), pen = (p.y + R) - ground;
          p.ground = pen > -2;
          if (pen > 0) { // lift the wheel out and keep only its speed along the slope
            const vx = p.x - p.px, vy = p.y - p.py, tx = Math.cos(slope), ty = Math.sin(slope), along = vx * tx + vy * ty;
            p.y -= pen; p.px = p.x - tx * along; p.py = p.y - ty * along;
          }
        }
      }
      if (A.x < 20) { A.x = 20; A.px = 20; } if (B.x < 20 + L) { B.x = 20 + L; B.px = B.x; }
    },
    again(x) { // failing the same spot three times moves the flag past it
      if (Math.abs(x - (this.crashX ?? -999)) < 300) { if (++this.repeat >= 3) { this.last = Math.min(this.finish - 100, x + 260); this.repeat = 0; this.msg = 'Tricky bit! Skipping ahead'; } } else { this.crashX = x; this.repeat = 1; }
    },
    crash(x, y) {
      this.crashes++; this.crashT = 1.1; G.sfx('crunch'); G.sfx('hurt'); G.shake(10, .4); G.burst(this.parts, x - this.cam, y, '#ff9f43', 18, 220); G.burst(this.parts, x - this.cam, y, this.sky[3], 14, 160);
      this.msg = 'CRASH! Back to the flag'; this.msgT = 1.1;
      this.again(x);
    },
    draw(ctx, dt) {
      const [s0, s1, hill, dirt] = this.sky, cam = this.cam;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, s0); g.addColorStop(1, s1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      G.circle(680, 70, 32, 'rgba(255,250,220,.85)');
      for (const [par, amp, col, base] of [[.2, 50, 'rgba(255,255,255,.35)', 230], [.45, 40, hill, 280]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 16) { const wx = x + cam * par; ctx.lineTo(x, base - Math.abs(Math.sin(wx * .004)) * amp - Math.sin(wx * .011) * amp * .4); } ctx.lineTo(W, H); ctx.fill(); }
      // ground
      const x0 = Math.max(0, Math.floor(cam / 10)), x1 = Math.min(this.ground.length - 1, Math.ceil((cam + W) / 10) + 1);
      ctx.fillStyle = dirt; ctx.beginPath(); ctx.moveTo(x0 * 10 - cam, H); for (let i = x0; i <= x1; i++) ctx.lineTo(i * 10 - cam, this.ground[i]); ctx.lineTo(x1 * 10 - cam, H); ctx.fill();
      ctx.lineWidth = 8; for (const [col, off] of [['rgba(0,0,0,.3)', 6], [hill, 2]]) { ctx.strokeStyle = col; ctx.beginPath(); for (let i = x0; i <= x1; i++) { const x = i * 10 - cam; i === x0 ? ctx.moveTo(x, this.ground[i] + off) : ctx.lineTo(x, this.ground[i] + off); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = x0; i <= x1; i += 3) ctx.fillRect(i * 10 - cam, this.ground[i] + 18 + (i * 7) % 30, 6, 4);
      for (const d of this.deco) { const x = d.x - cam; if (x < -40 || x > W + 40) continue; const y = this.gy(d.x); if (d.k === 0) { G.circle(x, y - 6, 8 * d.s, '#2a2a2a'); G.circle(x, y - 6, 3 * d.s, '#666'); } if (d.k === 1) { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 2, y - 30 * d.s, 4, 30 * d.s); G.circle(x, y - 36 * d.s, 14 * d.s, '#3f8a36'); } }
      for (const f of this.flags) { const x = f.x - cam; if (x < -40 || x > W + 40) continue; const y = this.gy(f.x); ctx.fillStyle = '#ddd'; ctx.fillRect(x - 2, y - 70, 4, 70); ctx.fillStyle = f.got ? '#7ee08a' : '#ff9f43'; ctx.beginPath(); ctx.moveTo(x + 2, y - 70); ctx.lineTo(x + 30, y - 60); ctx.lineTo(x + 2, y - 50); ctx.fill(); }
      const fx = this.finish - cam; if (fx > -60 && fx < W + 60) { const y = this.gy(this.finish); for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(fx - 10 + j * 10, y - 120 + i * 15, 10, 15); } ctx.fillStyle = '#ddd'; ctx.fillRect(fx - 12, y - 120, 4, 120); ctx.fillRect(fx + 8, y - 120, 4, 120); }
      // bike
      if (this.crashT <= 0) {
        const a = this.angle(), cx = (this.A.x + this.B.x) / 2 - cam, cy = (this.A.y + this.B.y) / 2;
        const wheel = G.img('img/moto_wheel.png'), body = G.img('img/moto_body.png');
        for (const [p, r] of [[this.A, this.rot[0]], [this.B, this.rot[1]]]) if (wheel.complete && wheel.naturalWidth) { ctx.save(); ctx.translate(p.x - cam, p.y); ctx.rotate(r); ctx.drawImage(wheel, -24, -24, 48, 48); ctx.restore(); }
        if (body.complete && body.naturalWidth) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.drawImage(body, -72, -84, 144, 108); ctx.restore(); }
      }
      G.fx(this.parts, dt);
      // HUD
      const prog = Math.min(1, ((this.A.x + this.B.x) / 2) / this.finish);
      G.panel(150, 10, 500, 14, 7, 'rgba(0,0,0,.3)'); G.rr(152, 12, 496 * prog, 10, 5, '#ffcf5c');
      for (const f of this.flags) G.rr(150 + 500 * f.x / this.finish - 2, 8, 4, 18, 2, f.got ? '#7ee08a' : '#fff');
      G.text(`${this.time.toFixed(1)}s`, 16, 26, {size: 20, weight: 800, color: '#fff', shadow: true});
      G.text(`★★★ under ${this.target.toFixed(0)}s`, 16, 46, {size: 11, weight: 800, color: '#ffcf5c', shadow: true});
      G.text(`FLIPS ${this.flips}`, W - 16, 26, {size: 16, align: 'right', weight: 800, color: '#fff', shadow: true});
      if (this.msgT > 0) G.text(this.msg, W / 2, 96, {size: 26, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

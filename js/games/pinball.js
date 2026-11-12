(() => {
  const W = 400, H = 640, BR = 9, GRAV = 760, FL = 56, REST = .52, UP = -.5;
  const SEGS = [];
  const wall = (ax, ay, bx, by, kind = 'wall') => SEGS.push({ax, ay, bx, by, kind, flash: 0});
  wall(20, 670, 20, 200);
  let lx = 20, ly = 200;
  for (let a = 190; a <= 360; a += 10) { const r = a * Math.PI / 180, x = 200 + Math.cos(r) * 180, y = 200 + Math.sin(r) * 180; wall(lx, ly, x, y); lx = x; ly = y; }
  wall(380, 200, 380, 670);
  wall(345, 670, 345, 250);
  wall(20, 470, 112, 548); wall(345, 470, 253, 548);
  wall(55, 400, 55, 460); wall(55, 460, 95, 488); wall(55, 400, 95, 488, 'sling');
  wall(310, 400, 310, 460); wall(310, 460, 270, 488); wall(310, 400, 270, 488, 'sling');
  for (const x of [125, 165, 205, 245]) wall(x, 62, x, 94);
  const BUMPERS = [{x: 140, y: 205, r: 20}, {x: 230, y: 205, r: 20}, {x: 185, y: 272, r: 20}];
  const LANES = [145, 185, 225];

  function collide(b, ax, ay, bx, by, rad, e) { // ball vs a segment with thickness; returns the push normal or null
    const dx = bx - ax, dy = by - ay, t = G.clamp(((b.x - ax) * dx + (b.y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    const cx = ax + dx * t, cy = ay + dy * t, ex = b.x - cx, ey = b.y - cy, d = Math.hypot(ex, ey);
    if (d >= BR + rad || d === 0) return null;
    const nx = ex / d, ny = ey / d;
    b.x = cx + nx * (BR + rad); b.y = cy + ny * (BR + rad);
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
    return {nx, ny, vn, t};
  }

  GameBox.register({
    id: 'pinball', title: 'Star Pinball', genre: 'Arcade', kind: 'Pinball', w: W, h: H,
    desc: 'A space-themed pinball table with three pop bumpers, kicking slingshots, a drop-target bank and three rollover lanes. Light all three lanes or drop every target to raise the multiplier. You get three balls and a short ball save after each launch.',
    controls: [['Z / A / Left', 'Left flipper'], ['M / D / Right / /', 'Right flipper'], ['Space / Down', 'Hold to pull the plunger, release to launch']],
    info() { return `Ball ${4 - this.balls}/3 · x${this.mult}`; },
    init() {
      this.balls = 3; this.mult = 1; this.lit = [false, false, false]; this.targets = [0, 1, 2].map(i => ({x: 300, y: 250 + i * 22, up: true}));
      this.flips = [{px: 115, py: 552, side: 1, a: REST}, {px: 250, py: 552, side: -1, a: REST}];
      this.bflash = [0, 0, 0]; this.parts = []; this.resetT = 0; this.newBall();
    },
    newBall() { this.ball = {x: 362, y: 590, vx: 0, vy: 0, inLane: true}; this.charge = 0; this.saveT = 0; this.laneCd = 0; },
    tip(f, a = f.a) { return [f.px + f.side * Math.cos(a) * FL, f.py + Math.sin(a) * FL]; },
    key(k) {
      if (['z', 'a', 'ArrowLeft', 'm', 'd', 'ArrowRight', '/'].includes(k)) G.sfx('click', .6);
    },
    points(n, x, y) { G.score += n * this.mult; if (x !== undefined) G.popText(this.parts, x, y, `+${n * this.mult}`, '#ffcf5c', 13); },
    update(dt) {
      const b = this.ball;
      const pull = G.held(' ', 'ArrowDown', 's');
      if (b.inLane && b.y > 560) {
        if (pull) this.charge = Math.min(1, this.charge + dt * 1.2);
        else if (this.charge > 0) { b.vy = -(520 + 720 * this.charge); this.charge = 0; G.sfx('jump'); }
      }
      if (this.resetT > 0 && (this.resetT -= dt) <= 0) for (const t of this.targets) t.up = true;
      this.saveT -= dt; this.laneCd -= dt;
      for (let i = 0; i < 3; i++) this.bflash[i] -= dt;
      for (const s of SEGS) s.flash -= dt;
      const held = [G.held('z', 'a', 'ArrowLeft'), G.held('m', 'd', 'ArrowRight', '/')];
      const n = 6, h = dt / n;
      for (let step = 0; step < n; step++) {
        const prev = this.flips.map(f => this.tip(f));
        this.flips.forEach((f, i) => {
          const target = held[i] ? UP : REST, sp = (held[i] ? 22 : 13) * h;
          f.a = f.a > target ? Math.max(target, f.a - sp) : Math.min(target, f.a + sp);
        });
        b.vy += GRAV * h; b.x += b.vx * h; b.y += b.vy * h;
        const v = Math.hypot(b.vx, b.vy); if (v > 1500) { b.vx *= 1500 / v; b.vy *= 1500 / v; }
        for (const s of SEGS) {
          const c = collide(b, s.ax, s.ay, s.bx, s.by, 0, s.kind === 'sling' ? .9 : .5);
          if (c && s.kind === 'sling' && c.vn < -80) { b.vx += c.nx * 300; b.vy += c.ny * 300; s.flash = .15; this.points(50); G.sfx('hit', .6); }
        }
        this.targets.forEach((t, i) => {
          if (!t.up) return;
          const c = collide(b, t.x, t.y, t.x, t.y + 18, 3, .5);
          if (!c) return;
          t.up = false; this.points(300, t.x - 20, t.y); G.sfx('crunch', .6);
          if (this.targets.every(o => !o.up)) { this.points(2000, 250, 230); this.mult = Math.min(5, this.mult + 1); this.resetT = 1.2; G.sfx('power'); }
        });
        BUMPERS.forEach((u, i) => {
          const dx = b.x - u.x, dy = b.y - u.y, d = Math.hypot(dx, dy);
          if (d >= u.r + BR || !d) return;
          const nx = dx / d, ny = dy / d;
          b.x = u.x + nx * (u.r + BR); b.y = u.y + ny * (u.r + BR);
          b.vx = nx * 520 + b.vx * .2; b.vy = ny * 520 + b.vy * .2;
          if (this.bflash[i] < .05) { this.points(100, u.x, u.y - 26); G.sfx('coin', .5); }
          this.bflash[i] = .15;
        });
        this.flips.forEach((f, i) => { // moving flipper: hit relative to the flipper surface velocity
          const [tx, ty] = this.tip(f), [ox, oy] = prev[i];
          const rel = {x: b.x, y: b.y, vx: 0, vy: 0};
          const dx = tx - f.px, dy = ty - f.py, t = G.clamp(((b.x - f.px) * dx + (b.y - f.py) * dy) / (dx * dx + dy * dy), 0, 1);
          const svx = (f.px + (tx - f.px) * t - (f.px + (ox - f.px) * t)) / h, svy = (f.py + (ty - f.py) * t - (f.py + (oy - f.py) * t)) / h;
          rel.vx = b.vx - svx; rel.vy = b.vy - svy;
          const c = collide(rel, f.px, f.py, tx, ty, 7 - 3 * t, .3);
          if (!c) return;
          b.x = rel.x; b.y = rel.y; b.vx = rel.vx + svx; b.vy = rel.vy + svy;
        });
        if (b.x > 345 && b.y > 600 - BR) { b.y = 600 - BR; if (b.vy > 0) b.vy = 0; b.vx = 0; }
      }
      if (b.inLane && b.y < 240) { b.inLane = false; this.saveT = 8; }
      if (!b.inLane && b.y < 94 && b.y > 60 && this.laneCd <= 0) {
        const i = LANES.findIndex(x => Math.abs(b.x - x) < 14);
        if (i >= 0 && !this.lit[i]) {
          this.lit[i] = true; this.laneCd = .3; this.points(200); G.sfx('select');
          if (this.lit.every(Boolean)) { this.lit = [false, false, false]; this.mult = Math.min(5, this.mult + 1); this.points(1000, 185, 120); G.sfx('power'); }
        }
      }
      if (b.y > H + 30) {
        if (this.saveT > 0) { G.popText(this.parts, W / 2, 400, 'BALL SAVED', '#5ee6c1', 20); G.sfx('power'); this.newBall(); return; }
        this.balls--; G.shake(5); G.sfx('lose');
        if (this.balls <= 0) return G.end();
        this.mult = Math.max(1, this.mult - 1); this.newBall();
      }
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1a1550'); bg.addColorStop(1, '#0a0b24');
      ctx.fillStyle = '#05061a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(20, 670); ctx.lineTo(20, 200); ctx.arc(200, 200, 180, Math.PI, 0); ctx.lineTo(380, 670); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 40; i++) { const x = 30 + (i * 73) % 310, y = 40 + (i * 131) % 520; ctx.globalAlpha = .3 + .3 * Math.sin(now * 2 + i); G.circle(x, y, 1.2, '#c9ccff'); }
      ctx.globalAlpha = 1;
      G.circle(185, 380, 70, 'rgba(139,123,255,.08)');
      ctx.strokeStyle = '#8b7bff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (const s of SEGS) {
        if (s.kind === 'sling') continue;
        ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.stroke();
      }
      for (const [x, y, d] of [[55, 400, 1], [310, 400, -1]]) {
        const s = SEGS.find(o => o.kind === 'sling' && o.ax === x);
        ctx.fillStyle = s.flash > 0 ? '#ffffff' : '#ff6b8b'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); ctx.lineTo(x + d * 40, y + 88); ctx.closePath(); ctx.fill();
      }
      LANES.forEach((x, i) => { G.circle(x, 112, 6, this.lit[i] ? '#ffcf5c' : 'rgba(255,207,92,.2)'); G.text('▼', x, 84, {size: 10, align: 'center', color: 'rgba(255,255,255,.3)'}); });
      BUMPERS.forEach((u, i) => {
        const hot = this.bflash[i] > 0;
        G.circle(u.x, u.y, u.r + 6, hot ? 'rgba(255,207,92,.45)' : 'rgba(94,230,193,.15)');
        G.circle(u.x, u.y, u.r, hot ? '#ffcf5c' : '#5ee6c1'); G.circle(u.x, u.y, u.r - 7, '#1a1550'); G.gem(u.x, u.y, 7, hot ? '#ffffff' : '#5ee6c1');
      });
      for (const t of this.targets) G.rr(t.x - 3, t.y, 7, 18, 2, t.up ? '#ffcf5c' : 'rgba(255,207,92,.15)');
      for (const f of this.flips) {
        const [tx, ty] = this.tip(f);
        ctx.strokeStyle = '#e8e9ff'; ctx.lineWidth = 13; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        G.circle(f.px, f.py, 5, '#8b7bff');
      }
      const py = 600 + this.charge * 26;
      G.rr(352, py, 20, 10, 3, '#ff6b8b');
      ctx.strokeStyle = '#9aa0c8'; ctx.lineWidth = 2; ctx.beginPath();
      for (let y = py + 10; y < 650; y += 6) { ctx.moveTo(352, y); ctx.lineTo(372, y + 3); }
      ctx.stroke();
      const b = this.ball, g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BR);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8a8fb5');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI * 2); ctx.fill();
      G.fx(this.parts, dt);
      G.panel(24, 586, 120, 46);
      G.bar({x: 32, y: 594, w: 104, h: 12, v: this.balls, max: 3, color: '#ff6b8b', label: `BALLS ${this.balls}`, id: 'balls'});
      if (this.saveT > 0) G.bar({x: 32, y: 614, w: 104, h: 8, v: this.saveT, max: 8, color: '#5ee6c1'});
      G.text(`x${this.mult}`, 300, 620, {size: 22, display: true, align: 'center', color: '#ffcf5c', shadow: true});
      if (b.inLane && b.y > 560) G.text('Hold Space', 362, 560, {size: 10, align: 'center', color: '#c4c8ee'});
    }
  });
})();

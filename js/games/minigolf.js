(() => {
  // Top-down mini golf: drag back from the ball to aim and set power. 50 generated holes.
  const W = 800, H = 500, BR = 7, CUP = 13;
  const THEMES = [{grass: ['#4fb04a', '#47a443'], wall: '#8a5a32', top: '#b07a46', bg: '#2f6a2a'}, {grass: ['#5ab8a0', '#50ac94'], wall: '#5a6a8a', top: '#7a8cb0', bg: '#264a5a'}, {grass: ['#8ac04a', '#80b442'], wall: '#7a3a3a', top: '#a85a5a', bg: '#4a3a2a'}, {grass: ['#4aa0c8', '#4296bc'], wall: '#e8e8f0', top: '#ffffff', bg: '#1a3a5a'}];

  // a hole is a list of axis-aligned rooms joined into a path, plus obstacles inside it
  function makeHole(n) {
    const R = G.seeded(n * 101 + 17), cells = 4 + Math.min(5, Math.floor(n / 6)), size = 110;
    let x = 0, y = 0, dir = 0; const path = [[0, 0]];
    for (let i = 1; i < cells; i++) {
      const opts = [[1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !path.some(([px, py]) => px === x + dx && py === y + dy) && Math.abs(y + dy) <= 1);
      const [dx, dy] = opts.length ? R.pick(opts) : [1, 0]; x += dx; y += dy; path.push([x, y]);
    }
    const minX = Math.min(...path.map(p => p[0])), maxX = Math.max(...path.map(p => p[0])), minY = Math.min(...path.map(p => p[1])), maxY = Math.max(...path.map(p => p[1]));
    const ox = (W - (maxX - minX + 1) * size) / 2 - minX * size, oy = (H - (maxY - minY + 1) * size) / 2 - minY * size + 10;
    const rects = path.map(([px, py]) => ({x: ox + px * size, y: oy + py * size, w: size, h: size}));
    const start = {x: rects[0].x + size / 2, y: rects[0].y + size / 2}, last = rects.at(-1), cup = {x: last.x + size / 2, y: last.y + size / 2};
    const feats = [], kinds = ['bumper', 'block', 'sand', 'water', 'slope', 'spinner', 'mover'].slice(0, 2 + Math.min(5, Math.floor(n / 4)));
    for (let i = 1; i < rects.length - 1; i++) {
      if (R() < .35 && n < 8) continue;
      const r = rects[i], k = R.pick(kinds), cx = r.x + size / 2, cy = r.y + size / 2;
      if (k === 'bumper') feats.push({k, x: cx + (R() - .5) * 30, y: cy + (R() - .5) * 30, r: 14});
      if (k === 'block') feats.push({k, x: cx - 18, y: cy - 18, w: 36, h: 36});
      if (k === 'sand') feats.push({k, x: r.x + 18, y: r.y + 18, w: size - 36, h: size - 36});
      if (k === 'water') { const top = R() < .5; feats.push({k, x: cx - 22, y: top ? r.y + 8 : r.y + size * .5 - 8, w: 44, h: size * .5}); } // always leaves a lane beside it
      if (k === 'slope') { const a = R() * Math.PI * 2; feats.push({k, x: r.x + 4, y: r.y + 4, w: size - 8, h: size - 8, fx: Math.cos(a) * 60, fy: Math.sin(a) * 60}); }
      if (k === 'spinner') feats.push({k, x: cx, y: cy, len: 44, sp: (R() < .5 ? -1 : 1) * (1.2 + R())});
      if (k === 'mover') feats.push({k, x: cx, y: cy, w: 20, h: 40, range: 30, sp: 1.5 + R(), ax: R() < .5});
    }
    // walls: every rect edge that is not shared with a neighbour in the path
    const walls = [];
    rects.forEach((r, i) => {
      const nb = (dx, dy) => rects.some(o => o !== r && Math.abs(o.x - (r.x + dx * size)) < 1 && Math.abs(o.y - (r.y + dy * size)) < 1);
      if (!nb(0, -1)) walls.push([r.x, r.y, r.x + size, r.y]); if (!nb(0, 1)) walls.push([r.x, r.y + size, r.x + size, r.y + size]);
      if (!nb(-1, 0)) walls.push([r.x, r.y, r.x, r.y + size]); if (!nb(1, 0)) walls.push([r.x + size, r.y, r.x + size, r.y + size]);
    });
    const par = Math.max(2, Math.min(6, 1 + Math.ceil(rects.length / 2.5) + (feats.some(f => f.k === 'water') ? 1 : 0)));
    return {rects, walls, feats, start, cup, par};
  }

  GameBox.register({
    id: 'minigolf', title: 'Mini Golf', genre: 'Sports', kind: 'Putting', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Drag back from the ball and let go to putt. Get it in the cup in as few shots as you can!',
    desc: 'Fifty bendy mini golf holes with bumpers, sand traps, water, slopes, spinning bars and sliding blocks. Pull back from the ball like a slingshot to aim and choose your power, then let go. Sink it at or under par for three stars, and hit a hole in one for a big bonus.',
    controls: [['Drag from the ball', 'Aim and power'], ['Release', 'Putt'], ['R', 'Restart the hole']],
    info() { return `Hole ${G.level} · Par ${this.hole.par} · Shots ${this.shots}`; },
    init() {
      this.hole = makeHole(G.level); this.theme = THEMES[Math.floor((G.level - 1) / 5) % THEMES.length];
      this.ball = {x: this.hole.start.x, y: this.hole.start.y, vx: 0, vy: 0, z: 0}; this.safe = {x: this.ball.x, y: this.ball.y};
      this.shots = 0; this.aim = null; this.t = 0; this.sunk = 0; this.done = null; this.parts = []; this.msg = `Hole ${G.level} · Par ${this.hole.par}`; this.msgT = 2;
    },
    key(k) { if (k === 'r' && !this.done) this.init(); },
    moving() { return Math.hypot(this.ball.vx, this.ball.vy) > 4; },
    pointer(type, x, y) {
      if (this.done || this.sunk) return;
      if (type === 'down' && !this.moving()) this.aim = {x, y};
      if (type === 'move' && this.aim) { this.aim.x = x; this.aim.y = y; }
      if (type === 'up' && this.aim) {
        const dx = this.ball.x - x, dy = this.ball.y - y, d = Math.min(150, Math.hypot(dx, dy));
        if (d > 8) { const p = d / 150 * 620; this.ball.vx = dx / Math.hypot(dx, dy) * p; this.ball.vy = dy / Math.hypot(dx, dy) * p; this.shots++; this.safe = {x: this.ball.x, y: this.ball.y}; G.sfx('hit', .6); }
        this.aim = null;
      }
    },
    inRects(x, y) { return this.hole.rects.some(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const b = this.ball, h = this.hole;
      for (const f of h.feats) { if (f.k === 'spinner') f.a = (f.a || 0) + f.sp * dt; if (f.k === 'mover') f.off = Math.sin(this.t * f.sp) * f.range; }
      if (this.sunk) { this.sunk -= dt; b.x += (h.cup.x - b.x) * Math.min(1, dt * 10); b.y += (h.cup.y - b.y) * Math.min(1, dt * 10); if (this.sunk <= 0) this.finish(); return; }
      const steps = 4;
      for (let s = 0; s < steps; s++) {
        const st = dt / steps; let fric = 1.15;
        for (const f of h.feats) {
          const inside = f.w && b.x > f.x && b.x < f.x + f.w && b.y > f.y && b.y < f.y + f.h;
          if (f.k === 'sand' && inside) fric = 4;
          if (f.k === 'slope' && inside) { b.vx += f.fx * st; b.vy += f.fy * st; }
          if (f.k === 'water' && inside) { this.splash(); return; }
        }
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 0) { const ns = Math.max(0, sp - (40 + sp * fric) * st); b.vx *= ns / sp; b.vy *= ns / sp; }
        b.x += b.vx * st; b.y += b.vy * st;
        for (const [x1, y1, x2, y2] of h.walls) this.hitSeg(b, x1, y1, x2, y2, .8);
        for (const f of h.feats) {
          if (f.k === 'bumper') { const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy); if (d < f.r + BR) { const nx = dx / d, ny = dy / d; b.x = f.x + nx * (f.r + BR); b.y = f.y + ny * (f.r + BR); const dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= 2 * dot * nx * 1.2; b.vy -= 2 * dot * ny * 1.2; G.sfx('coin', .3); f.hit = .2; } } }
          if (f.k === 'block') this.hitBox(b, f.x, f.y, f.w, f.h);
          if (f.k === 'mover') { const mx = f.x + (f.ax ? f.off : 0) - (f.ax ? f.h : f.w) / 2, my = f.y + (f.ax ? 0 : f.off) - (f.ax ? f.w : f.h) / 2; this.hitBox(b, mx, my, f.ax ? f.h : f.w, f.ax ? f.w : f.h); }
          if (f.k === 'spinner') { const c = Math.cos(f.a), s2 = Math.sin(f.a); this.hitSeg(b, f.x - c * f.len, f.y - s2 * f.len, f.x + c * f.len, f.y + s2 * f.len, 1, f); }
        }
        if (!this.inRects(b.x, b.y)) { b.x = this.safe.x; b.y = this.safe.y; b.vx = b.vy = 0; }
        const dc = Math.hypot(b.x - h.cup.x, b.y - h.cup.y);
        if (dc < CUP - 2 && Math.hypot(b.vx, b.vy) < 330) { this.sunk = .35; b.vx = b.vy = 0; G.sfx('coin'); return; }
        if (dc < CUP + 10 && Math.hypot(b.vx, b.vy) < 120) { b.vx += (h.cup.x - b.x) * 3 * st; b.vy += (h.cup.y - b.y) * 3 * st; } // the cup gently pulls the ball in
      }
      if (!this.moving()) { b.vx = b.vy = 0; if (this.shots >= h.par + 6 && !this.aim) { this.msg = 'Max shots: pick up, next hole!'; this.msgT = 2; G.score += 25; this.done = {t: 1.6, go: () => G.win(1, 'Max shots, on to the next hole')}; } }
    },
    hitSeg(b, x1, y1, x2, y2, bounce, f) {
      const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / l2)), px = x1 + dx * t, py = y1 + dy * t;
      const ex = b.x - px, ey = b.y - py, d = Math.hypot(ex, ey);
      if (d < BR + 3 && d > 0) {
        const nx = ex / d, ny = ey / d; b.x = px + nx * (BR + 3); b.y = py + ny * (BR + 3);
        const dot = b.vx * nx + b.vy * ny; if (dot < 0) { b.vx -= (1 + bounce) * dot * nx; b.vy -= (1 + bounce) * dot * ny; if (Math.abs(dot) > 60) G.sfx('click', .4); }
        if (f) { const r = Math.hypot(px - f.x, py - f.y); b.vx += -Math.sin(f.a) * f.sp * r * .6 * Math.sign((b.x - f.x) * Math.cos(f.a) + (b.y - f.y) * Math.sin(f.a) || 1); }
      }
    },
    hitBox(b, x, y, w, h) { this.hitSeg(b, x, y, x + w, y, .8); this.hitSeg(b, x, y + h, x + w, y + h, .8); this.hitSeg(b, x, y, x, y + h, .8); this.hitSeg(b, x + w, y, x + w, y + h, .8); },
    splash() { const b = this.ball; G.sfx('splash'); G.burst(this.parts, b.x, b.y, '#9fd8ff', 14); this.shots++; b.x = this.safe.x; b.y = this.safe.y; b.vx = b.vy = 0; this.msg = 'Splash! +1 shot'; this.msgT = 1.5; },
    finish() {
      const par = this.hole.par, s = this.shots, diff = s - par;
      const name = s === 1 ? 'HOLE IN ONE!' : diff <= -2 ? 'EAGLE!' : diff === -1 ? 'BIRDIE!' : diff === 0 ? 'PAR' : diff === 1 ? 'Bogey' : `${s} shots`;
      G.score += Math.max(50, (par - s + 3) * 150) + (s === 1 ? 1000 : 0); if (diff <= 0) G.party(); this.msg = name; this.msgT = 2.5;
      const stars = diff <= 0 ? 3 : diff <= 2 ? 2 : 1;
      this.done = {t: 1.4, go: () => G.win(stars, `${name} (${s} on a par ${par})`)};
    },
    draw(ctx, dt) {
      const th = this.theme, h = this.hole;
      G.clear(th.bg);
      for (let i = 0; i < 40; i++) G.circle((i * 211) % W, (i * 137) % H, 18 + (i % 4) * 6, 'rgba(0,0,0,.12)');
      for (const r of h.rects) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(r.x + 6, r.y + 8, r.w, r.h); }
      for (const r of h.rects) for (let k = 0; k < 6; k++) { ctx.fillStyle = th.grass[k % 2]; ctx.fillRect(r.x, r.y + k * r.h / 6, r.w, r.h / 6 + 1); }
      for (const f of h.feats) {
        if (f.k === 'sand') { G.rr(f.x, f.y, f.w, f.h, 18, '#e8d39a'); for (let i = 0; i < 12; i++) G.circle(f.x + 10 + (i * 37) % (f.w - 20), f.y + 10 + (i * 23) % (f.h - 20), 1.5, '#c8b37a'); }
        if (f.k === 'water') { G.rr(f.x, f.y, f.w, f.h, 12, '#3a8ad8'); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const yy = f.y + 14 + i * f.h / 3 + Math.sin(this.t * 2 + i) * 3; ctx.beginPath(); ctx.moveTo(f.x + 8, yy); ctx.quadraticCurveTo(f.x + f.w / 2, yy - 6, f.x + f.w - 8, yy); ctx.stroke(); } }
        if (f.k === 'slope') { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(f.x, f.y, f.w, f.h); const a = Math.atan2(f.fy, f.fx); for (let i = 0; i < 4; i++) { const cx = f.x + f.w * (.25 + (i % 2) * .5), cy = f.y + f.h * (.25 + Math.floor(i / 2) * .5), o = ((this.t * 20) % 16) - 8; ctx.save(); ctx.translate(cx + Math.cos(a) * o, cy + Math.sin(a) * o); ctx.rotate(a); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.fill(); ctx.restore(); } }
      }
      // the cup and flag
      G.circle(h.cup.x, h.cup.y, CUP + 3, 'rgba(255,255,255,.5)'); G.circle(h.cup.x, h.cup.y, CUP, '#1a1a1a');
      ctx.fillStyle = '#ddd'; ctx.fillRect(h.cup.x - 1, h.cup.y - 56, 3, 56); ctx.fillStyle = '#ff4b4b'; ctx.beginPath(); ctx.moveTo(h.cup.x + 2, h.cup.y - 56); ctx.lineTo(h.cup.x + 28 + Math.sin(this.t * 4) * 3, h.cup.y - 48); ctx.lineTo(h.cup.x + 2, h.cup.y - 40); ctx.fill();
      G.circle(h.start.x, h.start.y, 10, 'rgba(255,255,255,.18)');
      // walls with a raised top
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of h.walls) { ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1 + 3, y1 + 4); ctx.lineTo(x2 + 3, y2 + 4); ctx.stroke(); }
      for (const [x1, y1, x2, y2] of h.walls) { ctx.strokeStyle = th.wall; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = th.top; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1 - 1); ctx.lineTo(x2, y2 - 1); ctx.stroke(); }
      for (const f of h.feats) {
        if (f.k === 'bumper') { f.hit = (f.hit || 0) - dt; G.circle(f.x + 3, f.y + 4, f.r, 'rgba(0,0,0,.3)'); G.circle(f.x, f.y, f.r + (f.hit > 0 ? 3 : 0), '#ff5b8b'); G.circle(f.x, f.y, f.r * .55, '#ffd0e0'); }
        if (f.k === 'block') { G.rr(f.x + 3, f.y + 4, f.w, f.h, 5, 'rgba(0,0,0,.3)'); G.rr(f.x, f.y, f.w, f.h, 5, th.wall); G.rr(f.x + 4, f.y + 4, f.w - 8, f.h - 8, 4, th.top); }
        if (f.k === 'mover') { const w = f.ax ? f.h : f.w, hh = f.ax ? f.w : f.h, x = f.x + (f.ax ? f.off : 0) - w / 2, y = f.y + (f.ax ? 0 : f.off) - hh / 2; G.rr(x + 3, y + 4, w, hh, 5, 'rgba(0,0,0,.3)'); G.rr(x, y, w, hh, 5, '#5a7ae0'); G.rr(x + 3, y + 3, w - 6, hh - 6, 4, '#8aa8ff'); }
        if (f.k === 'spinner') { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); G.rr(-f.len + 3, -3, f.len * 2, 10, 4, 'rgba(0,0,0,.3)'); G.rr(-f.len, -5, f.len * 2, 10, 4, '#ffcf5c'); ctx.restore(); G.circle(f.x, f.y, 7, '#c49a2a'); }
      }
      // ball (rises a touch when it drops into the cup)
      const b = this.ball, sc = this.sunk > 0 ? this.sunk / .35 : 1;
      G.circle(b.x + 2, b.y + 3, BR * sc, 'rgba(0,0,0,.3)'); G.circle(b.x, b.y, BR * sc, '#ffffff'); G.circle(b.x - 2, b.y - 2, 2.5 * sc, '#e8eef8');
      if (this.aim) { // aim line with dotted preview and a power bar
        const dx = b.x - this.aim.x, dy = b.y - this.aim.y, d = Math.min(150, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), p = d / 150;
        ctx.strokeStyle = `hsl(${120 - p * 120},90%,55%)`; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a) * (40 + p * 160), b.y + Math.sin(a) * (40 + p * 160)); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(a) * d, b.y - Math.sin(a) * d); ctx.stroke();
        G.rr(W / 2 - 80, H - 26, 160, 12, 6, 'rgba(0,0,0,.4)'); G.rr(W / 2 - 78, H - 24, 156 * p, 8, 4, `hsl(${120 - p * 120},90%,55%)`);
      }
      G.fx(this.parts, dt);
      G.panel(10, 10, 210, 40, 10, 'rgba(0,0,0,.35)');
      G.text(`HOLE ${G.level}  ·  PAR ${h.par}`, 22, 35, {size: 15, weight: 800, color: '#fff'});
      G.text(`SHOTS ${this.shots}`, W - 18, 35, {size: 18, align: 'right', weight: 800, color: this.shots > h.par ? '#ffb070' : '#fff', shadow: true});
      if (this.msgT > 0) G.text(this.msg, W / 2, 60, {size: 26, align: 'center', display: true, color: '#fff', shadow: true});
      else if (!this.shots && G.level <= 2) G.text('Drag back from the ball, then let go', W / 2, 60, {size: 15, align: 'center', weight: 800, color: '#fff', shadow: true});
    }
  });
})();

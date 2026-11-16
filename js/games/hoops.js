(() => {
  // Side-view basketball shootout: drag back from the ball to shoot. Hit the target score before the buzzer.
  const W = 800, H = 500, BR = 15, FLOOR = 450;

  GameBox.register({
    id: 'hoops', title: 'Hoop Shot', genre: 'Sports', kind: 'Basketball shootout', w: W, h: H, levels: 30, assets: ['img/basketball.png'], thumb: 'jpg', cursor: 'pointer',
    hint: 'Drag back from the ball and let go to shoot. Score before the buzzer!',
    desc: 'A basketball shootout against the clock. Drag back from the ball like a slingshot, watch the dotted arc and let go. Swishes score extra, and three in a row sets you on fire for double points. Later rounds shoot from farther away and the hoop starts sliding around. Thirty rounds.',
    controls: [['Drag from the ball', 'Aim and power'], ['Release', 'Shoot']],
    info() { return `Round ${G.level} · ${this.pts}/${this.need} · ${Math.ceil(this.time)}s`; },
    init() {
      const n = G.level; this.need = 6 + Math.min(22, Math.floor(n * .8)); this.time = 45; this.pts = 0; this.streak = 0; this.t = 0; this.parts = []; this.done = null; this.aim = null;
      this.hoop = {x: 640, y: 210, bx: 640, by: 210}; this.moveX = n > 8 ? Math.min(90, (n - 8) * 5) : 0; this.moveY = n > 14 ? Math.min(70, (n - 14) * 4) : 0;
      this.newBall();
    },
    newBall() { const n = G.level, far = Math.min(300, 60 + n * 8); this.ball = {x: 140 + Math.random() * Math.max(40, 300 - far), y: FLOOR - BR, vx: 0, vy: 0, live: false, rot: 0, touched: false, scored: false}; },
    pointer(type, x, y) {
      if (this.done) return; const b = this.ball;
      if (type === 'down' && !b.live) this.aim = {x, y};
      if (type === 'move' && this.aim) { this.aim.x = x; this.aim.y = y; }
      if (type === 'up' && this.aim) { this.aim.x = x; this.aim.y = y; const v = this.vel(); if (v) { b.vx = v[0]; b.vy = v[1]; b.live = true; G.sfx('swing'); } this.aim = null; }
    },
    vel() { const b = this.ball, dx = b.x - this.aim.x, dy = b.y - this.aim.y, d = Math.min(180, Math.hypot(dx, dy)); if (d < 10) return null; const p = d * 5.2; return [dx / Math.hypot(dx, dy) * p, dy / Math.hypot(dx, dy) * p]; },
    rims() { const h = this.hoop; return [[h.x - 40, h.y], [h.x + 40, h.y]]; },
    update(dt) {
      this.t += dt; if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.time -= dt;
      if (this.time <= 0) { const ok = this.pts >= this.need; this.done = {t: .8, go: () => ok ? G.win(this.pts >= this.need * 1.4 ? 3 : this.pts >= this.need * 1.15 ? 2 : 1, `${this.pts} points!`) : G.end(`${this.pts} of ${this.need} points`)}; G.sfx(ok ? 'win' : 'lose'); if (ok) G.party(); return; }
      const h = this.hoop; h.x = h.bx + Math.sin(this.t * .9) * this.moveX; h.y = h.by + Math.sin(this.t * 1.3) * this.moveY;
      const b = this.ball; if (!b.live) return;
      const steps = 4; for (let s = 0; s < steps; s++) {
        const st = dt / steps, py = b.y; b.vy += 980 * st; b.x += b.vx * st; b.y += b.vy * st; b.rot += b.vx * st / BR;
        for (const [rx, ry] of this.rims()) { const dx = b.x - rx, dy = b.y - ry, d = Math.hypot(dx, dy); if (d < BR + 2) { const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny; b.x = rx + nx * (BR + 2); b.y = ry + ny * (BR + 2); if (dot < 0) { b.vx -= 1.7 * dot * nx; b.vy -= 1.7 * dot * ny; } b.touched = true; G.sfx('click', .5); } }
        const bbx = h.x + 52; if (b.x + BR > bbx && b.x < bbx + 10 && b.y > h.y - 110 && b.y < h.y + 10) { b.x = bbx - BR; b.vx = -Math.abs(b.vx) * .6; b.touched = true; G.sfx('hit', .4); }
        if (!b.scored && py < h.y && b.y >= h.y && b.x > h.x - 38 && b.x < h.x + 38 && b.vy > 0) {
          b.scored = true; this.streak++; const fire = this.streak >= 3, swish = !b.touched, far = b.sx === undefined ? 0 : 0;
          const p = (swish ? 3 : 2) * (fire ? 2 : 1); this.pts += p; G.score += p * 50; G.sfx(swish ? 'coin' : 'hit'); G.popText(this.parts, h.x, h.y - 40, `${swish ? 'SWISH! ' : ''}+${p}${fire ? ' 🔥' : ''}`, fire ? '#ff9f43' : '#ffcf5c', 20);
          for (let i = 0; i < 12; i++) this.parts.push({x: h.x, y: h.y + 20, vx: (Math.random() - .5) * 160, vy: Math.random() * 120, life: .6, color: '#fff'});
        }
        if (b.y > FLOOR - BR) { b.y = FLOOR - BR; b.vy *= -.55; b.vx *= .8; if (Math.abs(b.vy) < 60) { if (!b.scored) this.streak = 0; this.newBall(); return; } }
        if (b.x < -60 || b.x > W + 60) { if (!b.scored) this.streak = 0; this.newBall(); return; }
      }
    },
    draw(ctx, dt) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a3a6a'); g.addColorStop(1, '#4a3a6a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < 4; r++) for (let x = 0; x < W; x += 18) G.circle(x + (r % 2) * 9, 120 + r * 26 + Math.sin(this.t * 5 + x) * 1.5, 7, ['#ff5b6b', '#ffcf5c', '#5cb8ff', '#7ee08a', '#fff'][(x / 18 + r) % 5]);
      ctx.fillStyle = '#c8884a'; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, FLOOR, 2, H - FLOOR);
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(640, FLOOR, 260, Math.PI, Math.PI * 1.5); ctx.stroke();
      const h = this.hoop;
      ctx.fillStyle = '#5a5e6a'; ctx.fillRect(h.x + 80, h.y - 100, 10, FLOOR - h.y + 100); ctx.fillRect(h.x + 58, h.y - 60, 30, 8);
      G.rr(h.x + 52, h.y - 120, 12, 130, 3, '#f4f4f4'); ctx.strokeStyle = '#e84a4a'; ctx.lineWidth = 2; ctx.strokeRect(h.x + 54, h.y - 50, 8, 34);
      // net, then the ball, then the front of the rim so the ball drops through
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5; for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(h.x - 36 + i * 12, h.y); ctx.lineTo(h.x - 24 + i * 8, h.y + 40); ctx.stroke(); } for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(h.x - 36 + j * 4, h.y + j * 10); ctx.lineTo(h.x + 36 - j * 4, h.y + j * 10); ctx.stroke(); }
      const b = this.ball, img = G.img('img/basketball.png');
      if (this.aim) { const v = this.vel(); if (v) { ctx.fillStyle = 'rgba(255,255,255,.7)'; let x = b.x, y = b.y, vx = v[0], vy = v[1]; for (let i = 0; i < 28; i++) { for (let k = 0; k < 3; k++) { vy += 980 * .012; x += vx * .012; y += vy * .012; } if (i % 2 === 0) G.circle(x, y, 3, 'rgba(255,255,255,.75)'); } } }
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(b.x, FLOOR + 4, BR * (1 - (FLOOR - b.y) / 900), 5, 0, 0, Math.PI * 2); ctx.fill();
      if (img.complete) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.drawImage(img, -BR - 1, -BR - 1, BR * 2 + 2, BR * 2 + 2); ctx.restore(); }
      ctx.strokeStyle = '#ff6b2a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(h.x, h.y, 38, 7, 0, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.ellipse(h.x, h.y, 38, 7, 0, Math.PI, Math.PI * 2); ctx.stroke();
      if (this.streak >= 3) G.text('ON FIRE! x2', W / 2, 92, {size: 22, align: 'center', display: true, color: '#ff9f43', shadow: true});
      G.panel(W / 2 - 120, 12, 240, 56, 12, 'rgba(10,10,20,.75)');
      G.text(`${this.pts}`, W / 2 - 60, 54, {size: 34, align: 'center', display: true, color: '#ffcf5c'}); G.text(`/${this.need}`, W / 2 - 18, 54, {size: 16, weight: 800, color: '#cfd4ff'});
      G.text(`${Math.ceil(Math.max(0, this.time))}`, W / 2 + 70, 54, {size: 34, align: 'center', display: true, color: this.time < 10 ? '#ff5b5b' : '#fff'});
      G.fx(this.parts, dt);
    }
  });
})();

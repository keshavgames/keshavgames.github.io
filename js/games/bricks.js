GameBox.register({
  id: 'bricks', title: 'Brick Smash', genre: 'Arcade', kind: 'Brick breaker', w: 480, h: 520,
  desc: 'Bounce the ball off your paddle to clear every brick; dark bricks take two hits. Catch falling power-ups: W widens the paddle, S slows the ball, M splits it into three and a heart adds a life.',
  controls: [['A D / Left Right', 'Move paddle'], ['Drag / Touch', 'Move paddle'], ['Space', 'Launch the ball']],
  TOP: 40,
  info() { return `Level ${this.level} · Bricks ${this.bricks.length}`; },
  init() {
    this.px = G.W / 2; this.pvx = 0; this.lives = 3; this.level = 1; this.parts = []; this.drops = [];
    this.wide = 0; this.slow = 0; this.build(); this.reset();
  },
  pw() { return this.wide > 0 ? 130 : 84; },
  build() {
    this.bricks = [];
    const cols = 8, rows = Math.min(3 + this.level, 8), bw = (G.W - 40) / cols;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (this.level > 2 && (r * 3 + c + this.level) % 7 === 0) continue; // gaps make later layouts less uniform
      const hp = this.level > 1 && r < this.level && Math.random() < .5 ? 2 : 1;
      this.bricks.push({x: 20 + c * bw + 2, y: this.TOP + 34 + r * 22, w: bw - 4, h: 18, hue: (r * 40 + this.level * 70) % 360, hp});
    }
  },
  reset() { this.wait = 1.2; this.balls = [{x: this.px, y: G.H - 36, vx: 0, vy: 0, trail: []}]; },
  speed() { return (300 + this.level * 30) * (this.slow > 0 ? .72 : 1); },
  launch() {
    const a = -Math.PI / 2 + (Math.random() - .5) * .8, sp = this.speed(), b = this.balls[0];
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; this.wait = 0; G.sfx('click');
  },
  key(k) { if (k === ' ' && this.wait > 0) this.launch(); },
  update(dt) {
    this.wide -= dt; this.slow -= dt;
    const pw = this.pw(), dir = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a');
    this.pvx += (dir * 440 - this.pvx) * Math.min(1, dt * 16);
    this.px += this.pvx * dt;
    if (G.pointer.down) this.px += (G.pointer.x - this.px) * Math.min(1, dt * 18);
    this.px = G.clamp(this.px, pw / 2, G.W - pw / 2);
    if (this.wait > 0) {
      const b = this.balls[0]; b.x = this.px; b.y = G.H - 36;
      if ((this.wait -= dt) <= 0) this.launch();
    } else {
      const sp = this.speed();
      for (const b of this.balls) {
        const cur = Math.hypot(b.vx, b.vy) || 1; b.vx *= sp / cur; b.vy *= sp / cur; // keeps the slow effect in sync
        const n = Math.ceil(sp * dt / 5); // substeps so the ball never skips through a brick
        for (let i = 0; i < n && !b.dead && this.bricks.length; i++) this.move(b, dt / n);
        b.trail.unshift({x: b.x, y: b.y}); b.trail.length = Math.min(b.trail.length, 8);
      }
      if (!this.bricks.length) {
        this.level++; G.score += 200; G.sfx('win'); G.popText(this.parts, G.W / 2, G.H / 2, `LEVEL ${this.level}`, '#ffcf5c', 24);
        this.build(); this.reset(); this.drops = []; return;
      }
      this.balls = this.balls.filter(b => !b.dead);
      if (!this.balls.length) {
        this.lives--; G.shake(6); G.flash(); G.sfx('hurt');
        if (this.lives <= 0) return G.end();
        this.reset();
      }
    }
    const py = G.H - 30;
    for (const d of this.drops) {
      d.y += 140 * dt;
      if (d.y > py - 8 && d.y < py + 14 && Math.abs(d.x - this.px) < pw / 2 + 10) { d.got = true; this.power(d.type); }
    }
    this.drops = this.drops.filter(d => !d.got && d.y < G.H + 20);
  },
  power(t) {
    G.sfx('power');
    G.popText(this.parts, this.px, G.H - 54, {W: 'WIDE', S: 'SLOW', M: 'MULTI', L: '+1 LIFE'}[t], '#ffcf5c');
    if (t === 'W') this.wide = 10;
    if (t === 'S') this.slow = 8;
    if (t === 'L') this.lives = Math.min(5, this.lives + 1);
    if (t === 'M' && this.wait <= 0 && this.balls.length) {
      const src = this.balls[0];
      for (const a of [-.5, .5]) {
        const c = Math.cos(a), s = Math.sin(a);
        this.balls.push({x: src.x, y: src.y, vx: src.vx * c - src.vy * s, vy: src.vx * s + src.vy * c, trail: []});
      }
    }
  },
  move(b, dt) {
    const r = 6, py = G.H - 30, pw = this.pw();
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); }
    if (b.x > G.W - r) { b.x = G.W - r; b.vx = -Math.abs(b.vx); }
    if (b.y < this.TOP + r) { b.y = this.TOP + r; b.vy = Math.abs(b.vy); }
    if (b.vy > 0 && b.y + r >= py && b.y + r <= py + 14 && Math.abs(b.x - this.px) <= pw / 2 + r) {
      const a = -Math.PI / 2 + G.clamp((b.x - this.px) / (pw / 2), -1, 1) * 1.05, sp = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.y = py - r; G.sfx('click');
    }
    if (b.y > G.H + r) { b.dead = true; return; }
    const i = this.bricks.findIndex(k => b.x + r > k.x && b.x - r < k.x + k.w && b.y + r > k.y && b.y - r < k.y + k.h);
    if (i < 0) return;
    const k = this.bricks[i];
    const ox = Math.min(b.x + r - k.x, k.x + k.w - b.x + r), oy = Math.min(b.y + r - k.y, k.y + k.h - b.y + r);
    if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
    if (--k.hp > 0) { G.score += 5; G.sfx('hit', .6); return; }
    this.bricks.splice(i, 1); G.score += 10; G.sfx('crunch', .7);
    G.burst(this.parts, k.x + k.w / 2, k.y + k.h / 2, `hsl(${k.hue} 70% 62%)`, 8);
    if (Math.random() < .12) this.drops.push({x: k.x + k.w / 2, y: k.y, type: G.pick(['W', 'W', 'S', 'S', 'M', 'M', 'L'])});
  },
  draw(ctx, dt) {
    G.clear('#0a0c1e');
    G.rr(0, 0, G.W, this.TOP, 0, '#0d1030');
    for (const k of this.bricks) {
      ctx.fillStyle = `hsl(${k.hue} ${k.hp > 1 ? 45 : 70}% ${k.hp > 1 ? 42 : 62}%)`;
      ctx.beginPath(); ctx.roundRect(k.x, k.y, k.w, k.h, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(k.x + 4, k.y + 3, k.w - 8, 3);
      if (k.hp > 1) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(k.x + 3, k.y + 3, k.w - 6, k.h - 6); }
    }
    for (const d of this.drops) {
      G.rr(d.x - 13, d.y - 9, 26, 18, 9, {W: '#5ee6c1', S: '#5cb8ff', M: '#ffcf5c', L: '#ff6b8b'}[d.type]);
      G.text(d.type === 'L' ? '♥' : d.type, d.x, d.y + 5, {size: 13, color: '#1b1a33', align: 'center', weight: 700});
    }
    const pw = this.pw();
    G.rr(this.px - pw / 2, G.H - 30, pw, 10, 5, this.wide > 0 ? '#5ee6c1' : '#e8e9ff');
    for (const b of this.balls) {
      b.trail.forEach((p, i) => { ctx.globalAlpha = (1 - i / b.trail.length) * .3; G.circle(p.x, p.y, 6 - i * .5, '#ffcf5c'); });
      ctx.globalAlpha = 1; G.circle(b.x, b.y, 6, '#ffcf5c');
    }
    G.fx(this.parts, dt);
    G.bar({x: 14, y: 13, w: 160, h: 15, v: this.lives, max: 5, color: '#ff6b8b', label: `LIVES ${this.lives}`, id: 'lives'});
    let x = 190;
    if (this.wide > 0) { G.text('WIDE', x, 25, {size: 11, color: '#5ee6c1'}); G.bar({x: x + 36, y: 17, w: 60, h: 8, v: this.wide, max: 10, color: '#5ee6c1'}); x += 110; }
    if (this.slow > 0) { G.text('SLOW', x, 25, {size: 11, color: '#5cb8ff'}); G.bar({x: x + 36, y: 17, w: 60, h: 8, v: this.slow, max: 8, color: '#5cb8ff'}); }
    if (this.wait > 0 && G.state === 'play') G.text('Press Space to launch', G.W / 2, G.H - 60, {align: 'center', color: '#9aa0c8'});
  }
});

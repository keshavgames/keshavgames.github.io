GameBox.register({
  id: 'flyer', title: 'Cave Flyer', genre: 'Action', kind: 'Cave flyer', w: 640, h: 360,
  desc: 'Hold to climb, let go to drop, and thread your ship through a cave that keeps getting tighter. Scraping the walls or ramming a pillar damages the hull; green repair kits patch it up.',
  controls: [['Space / W / Up', 'Hold to climb'], ['Hold mouse / Touch', 'Climb']],
  STEP: 16, X: 140,
  info() { return `${Math.floor(this.dist / 10)} m`; },
  init() {
    this.y = G.H / 2; this.vy = 0; this.speed = 200; this.dist = 0; this.off = 0; this.hp = 100; this.hitCd = 0;
    this.gap = 250; this.top = (G.H - this.gap) / 2; this.drift = 0; this.nextBlock = 600; this.nextKit = 1400;
    this.cols = []; this.blocks = []; this.kits = []; this.trail = []; this.parts = [];
    for (let x = 0; x <= G.W + this.STEP; x += this.STEP) this.cols.push({top: this.top, bot: this.top + this.gap});
  },
  col() { // next slice of cave wall: wanders up and down, narrows with distance
    this.gap = Math.max(130, 250 - this.dist * 0.008);
    this.drift = G.clamp(this.drift + (Math.random() - .5) * 8, -9, 9);
    this.top += this.drift;
    const lo = 12, hi = G.H - this.gap - 12;
    if (this.top < lo || this.top > hi) { this.drift *= -1; this.top = G.clamp(this.top, lo, hi); }
    return {top: this.top, bot: this.top + this.gap};
  },
  damage(n, color) {
    this.hp -= n; this.hitCd = .25;
    G.burst(this.parts, this.X, this.y, color, 10); G.shake(5); G.sfx('hit');
    if (this.hp <= 0) { this.hp = 0; G.burst(this.parts, this.X, this.y, '#ffcf5c', 30); G.flash(); G.sfx('boom'); G.end('Ship destroyed'); }
  },
  update(dt) {
    this.hitCd -= dt;
    const up = G.held(' ', 'ArrowUp', 'w') || G.pointer.down;
    this.vy = G.clamp(this.vy + (up ? -1500 : 900) * dt, -360, 420);
    this.y += this.vy * dt;
    this.speed = Math.min(360, 200 + this.dist * 0.01);
    const dx = this.speed * dt;
    this.dist += dx; this.off += dx; G.score += dx / 10;
    while (this.off >= this.STEP) { this.off -= this.STEP; this.cols.shift(); this.cols.push(this.col()); }
    if ((this.nextBlock -= dx) <= 0) {
      this.nextBlock = 380 + G.rnd(260);
      const c = this.cols.at(-1), gap = c.bot - c.top, h = gap * .35;
      this.blocks.push({x: G.W + 20, y: c.top + 20 + G.rnd(gap - h - 40), w: 26, h});
    }
    if ((this.nextKit -= dx) <= 0) {
      this.nextKit = 1300 + G.rnd(900);
      const c = this.cols.at(-1);
      this.kits.push({x: G.W + 20, y: c.top + 30 + G.rnd(c.bot - c.top - 60)});
    }
    for (const b of this.blocks) b.x -= dx;
    for (const k of this.kits) k.x -= dx;
    this.blocks = this.blocks.filter(b => b.x + b.w > -10 && !b.dead);
    const X = this.X, r = 8, c = this.cols[Math.floor((X + this.off) / this.STEP)];
    // walls push the ship back inside and scrape the hull instead of killing instantly
    if (this.y - r < c.top) { this.y = c.top + r; this.vy = Math.abs(this.vy) * .4; if (this.hitCd <= 0) this.damage(12, '#5ee6c1'); }
    if (this.y + r > c.bot) { this.y = c.bot - r; this.vy = -Math.abs(this.vy) * .4; if (this.hitCd <= 0) this.damage(12, '#5ee6c1'); }
    if (G.state !== 'play') return;
    for (const b of this.blocks) if (X + r > b.x && X - r < b.x + b.w && this.y + r > b.y && this.y - r < b.y + b.h) {
      b.dead = true; G.burst(this.parts, b.x + b.w / 2, this.y, '#3a4290', 20); G.sfx('crunch');
      this.damage(30, '#ffcf5c');
      if (G.state !== 'play') return;
    }
    for (const k of this.kits) if (!k.got && Math.hypot(k.x - X, k.y - this.y) < 20) {
      k.got = true; this.hp = Math.min(100, this.hp + 25); G.popText(this.parts, X, this.y - 20, '+25 HULL', '#5ee6c1'); G.sfx('power');
    }
    this.kits = this.kits.filter(k => !k.got && k.x > -20);
    this.trail.push({x: X - 10, y: this.y});
    for (const p of this.trail) p.x -= dx;
    this.trail = this.trail.filter(p => p.x > X - 120);
  },
  draw(ctx, dt) {
    G.clear('#081020');
    const S = this.STEP, o = this.off, lastX = (this.cols.length - 1) * S - o;
    ctx.fillStyle = '#232a5c';
    ctx.beginPath(); ctx.moveTo(-o, 0); this.cols.forEach((c, i) => ctx.lineTo(i * S - o, c.top)); ctx.lineTo(lastX, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-o, G.H); this.cols.forEach((c, i) => ctx.lineTo(i * S - o, c.bot)); ctx.lineTo(lastX, G.H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5ee6c1'; ctx.lineWidth = 2;
    for (const edge of ['top', 'bot']) { ctx.beginPath(); this.cols.forEach((c, i) => ctx.lineTo(i * S - o, c[edge])); ctx.stroke(); }
    for (const b of this.blocks) { G.rr(b.x, b.y, b.w, b.h, 6, '#3a4290'); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(b.x + 4, b.y + 4, 4, b.h - 8); }
    for (const k of this.kits) { G.rr(k.x - 10, k.y - 10, 20, 20, 5, '#5ee6c1'); ctx.fillStyle = '#081020'; ctx.fillRect(k.x - 2, k.y - 7, 4, 14); ctx.fillRect(k.x - 7, k.y - 2, 14, 4); }
    ctx.fillStyle = '#5ee6c1';
    this.trail.forEach((p, i) => {
      const f = i / this.trail.length;
      ctx.globalAlpha = f * .6; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + 3 * f, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (G.state !== 'over') {
      ctx.save(); ctx.translate(this.X, this.y); ctx.rotate(G.clamp(this.vy / 900, -.5, .5));
      ctx.fillStyle = this.hitCd > .1 ? '#ffffff' : '#ffcf5c';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    G.fx(this.parts, dt);
    G.bar({x: 14, y: 14, w: 200, h: 15, v: this.hp, max: 100, color: this.hp < 30 ? '#ff6b8b' : '#ffcf5c', label: `HULL ${Math.ceil(this.hp)}`, id: 'hull'});
  }
});

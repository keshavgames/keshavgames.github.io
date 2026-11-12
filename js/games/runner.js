GameBox.register({
  id: 'runner', title: 'Gem Runner', genre: 'Action', kind: 'Endless runner', w: 640, h: 360,
  desc: 'Run, jump and double-jump over spike rows while bats swoop at head height, so time your jumps under them. Gems add points and a little health, hearts heal more. The pace keeps rising.',
  controls: [['Space / W / Up', 'Jump (press again for a double jump)'], ['Click / Tap', 'Jump']],
  GROUND: 300, X: 110,
  info() { return `${Math.floor(this.dist / 30)} m`; },
  init() {
    this.y = this.GROUND; this.vy = 0; this.jumps = 0; this.speed = 300; this.dist = 0; this.t = 0;
    this.hp = 100; this.inv = 0; this.obs = []; this.bats = []; this.gems = []; this.parts = []; this.next = 500; this.nextBat = 1800;
  },
  jump() {
    if (this.jumps >= 2) return;
    this.vy = this.jumps ? -560 : -680; this.jumps++;
    G.burst(this.parts, this.X, this.y, '#9aa0c8', 6); G.sfx('jump');
  },
  key(k, repeat) { if (!repeat && (k === ' ' || k === 'ArrowUp' || k === 'w')) this.jump(); },
  pointer(type) { if (type === 'down') this.jump(); },
  hurt(n) {
    this.hp -= n; this.inv = 1;
    G.shake(7); G.flash(); G.sfx('hurt'); G.burst(this.parts, this.X, this.y - 15, '#ffcf5c', 14);
    if (this.hp <= 0) { this.hp = 0; G.end(); }
  },
  update(dt) {
    this.t += dt; this.inv -= dt;
    this.speed = Math.min(620, 300 + this.dist * 0.012);
    const dx = this.speed * dt;
    this.dist += dx; G.score += dx / 20;
    this.vy += 2000 * dt; this.y += this.vy * dt;
    if (this.y >= this.GROUND) { this.y = this.GROUND; this.vy = 0; this.jumps = 0; }
    if ((this.next -= dx) <= 0) {
      const w = 22 * (1 + Math.floor(G.rnd(3))); // one to three spikes wide
      this.obs.push({x: G.W + 20, w, h: 26});
      const roll = Math.random();
      if (roll < .5) this.gems.push({x: G.W + 20 + w / 2, y: this.GROUND - 90 - G.rnd(50), type: 'gem'});
      else if (roll < .58) this.gems.push({x: G.W + 20 + w / 2, y: this.GROUND - 110, type: 'heart'});
      this.next = 260 + G.rnd(320) + this.speed * .3;
    }
    if (this.dist > 1500 && (this.nextBat -= dx) <= 0) {
      this.nextBat = 900 + G.rnd(900);
      this.bats.push({x: G.W + 40, base: this.GROUND - 70 - G.rnd(20), ph: G.rnd(6)});
    }
    for (const o of this.obs) o.x -= dx;
    for (const g of this.gems) g.x -= dx;
    for (const b of this.bats) { b.x -= dx * 1.25; b.y = b.base + Math.sin(this.t * 6 + b.ph) * 8; }
    this.obs = this.obs.filter(o => o.x + o.w > -20);
    this.bats = this.bats.filter(b => b.x > -30);
    const L = this.X - 13, R = this.X + 13, T = this.y - 30;
    if (this.inv <= 0) {
      if (this.obs.some(o => R > o.x + 4 && L < o.x + o.w - 4 && this.y > this.GROUND - o.h + 6)) this.hurt(34);
      else if (this.bats.some(b => Math.abs(b.x - this.X) < 24 && b.y + 8 > T && b.y - 8 < this.y)) this.hurt(25);
      if (G.state !== 'play') return;
    }
    for (const g of this.gems) if (Math.abs(g.x - this.X) < 22 && Math.abs(g.y - (this.y - 15)) < 26) {
      g.got = true;
      if (g.type === 'heart') { this.hp = Math.min(100, this.hp + 30); G.popText(this.parts, g.x, g.y - 10, '+30 HP', '#ff6b8b'); G.sfx('power'); }
      else { G.score += 25; this.hp = Math.min(100, this.hp + 6); G.burst(this.parts, g.x, g.y, '#5ee6c1'); G.popText(this.parts, g.x, g.y - 10, '+25'); G.sfx('coin'); }
    }
    this.gems = this.gems.filter(g => !g.got && g.x > -20);
  },
  hills(ctx, f, base, amp, color) {
    const o = this.dist * f;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, G.H);
    for (let x = 0; x <= G.W; x += 16) ctx.lineTo(x, base - Math.sin((x + o) / 90) * amp - Math.sin((x + o) / 37) * amp * .35);
    ctx.lineTo(G.W, G.H); ctx.fill();
  },
  draw(ctx, dt) {
    const sky = ctx.createLinearGradient(0, 0, 0, G.H);
    sky.addColorStop(0, '#16163a'); sky.addColorStop(1, '#2b1f4a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, G.W, G.H);
    G.circle(520, 70, 26, 'rgba(255,207,92,.18)');
    this.hills(ctx, .2, 220, 40, '#221d4a');
    this.hills(ctx, .45, 262, 26, '#1b1840');
    ctx.fillStyle = '#120f2a'; ctx.fillRect(0, this.GROUND, G.W, G.H - this.GROUND);
    ctx.fillStyle = '#5ee6c1'; ctx.fillRect(0, this.GROUND, G.W, 2);
    ctx.fillStyle = '#2a2558';
    for (let x = -(this.dist % 40); x < G.W; x += 40) ctx.fillRect(x, this.GROUND + 14, 18, 3);
    ctx.fillStyle = '#ff6b8b';
    for (const o of this.obs) for (let x = o.x; x < o.x + o.w - 1; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, this.GROUND); ctx.lineTo(x + 11, this.GROUND - o.h); ctx.lineTo(x + 22, this.GROUND); ctx.fill();
    }
    for (const g of this.gems) {
      const bob = Math.sin(this.t * 5 + g.x) * 3;
      if (g.type === 'heart') G.heart(g.x, g.y + bob, 9, '#ff6b8b'); else G.gem(g.x, g.y + bob, 9, '#5ee6c1');
    }
    for (const b of this.bats) {
      const flap = Math.sin(this.t * 22 + b.ph) * 7;
      ctx.fillStyle = '#8b7bff'; ctx.beginPath();
      ctx.moveTo(b.x - 18, b.y - flap); ctx.quadraticCurveTo(b.x - 8, b.y - 4, b.x, b.y + 4); ctx.quadraticCurveTo(b.x + 8, b.y - 4, b.x + 18, b.y - flap);
      ctx.quadraticCurveTo(b.x, b.y + 2, b.x - 18, b.y - flap); ctx.fill();
      G.circle(b.x, b.y + 2, 6, '#6a5bd6'); G.circle(b.x - 2, b.y + 1, 1.5, '#ff6b8b'); G.circle(b.x + 2, b.y + 1, 1.5, '#ff6b8b');
    }
    const blink = this.inv > 0 && Math.floor(this.inv * 14) % 2;
    if (G.state !== 'over' && !blink) {
      const squash = this.y < this.GROUND ? 1.1 : 1 + Math.sin(this.t * 22) * .05;
      ctx.save(); ctx.translate(this.X, this.y); ctx.scale(1 / squash, squash);
      ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.roundRect(-13, -30, 26, 30, 7); ctx.fill();
      ctx.fillStyle = '#1b1a33'; ctx.fillRect(3, -22, 5, 6);
      ctx.restore();
    }
    G.fx(this.parts, dt);
    G.bar({x: 14, y: 14, w: 200, h: 15, v: this.hp, max: 100, color: this.hp < 35 ? '#ff6b8b' : '#5ee6c1', label: `HP ${Math.ceil(this.hp)}`, id: 'hp'});
  }
});

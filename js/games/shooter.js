GameBox.register({
  id: 'shooter', title: 'Star Defender', genre: 'Action', kind: 'Vertical shooter', w: 480, h: 600,
  desc: 'Your ship fires on its own. Steer to blast drones, divers and armored tanks, and let none slip past. A mothership arrives every fifty seconds. Grab D for double shot, S for a shield and + for repairs.',
  controls: [['A D / Left Right', 'Steer'], ['Drag / Touch', 'Steer']],
  info() { return this.boss ? 'Mothership incoming' : `Wave ${this.wave}`; },
  init() {
    this.x = G.W / 2; this.vx = 0; this.hp = 100; this.inv = 0; this.t = 0; this.fire = 0; this.spawn = 1; this.wave = 1;
    this.double = 0; this.shield = 0; this.boss = null; this.bossAt = 50;
    this.shots = []; this.foes = []; this.bolts = []; this.drops = []; this.parts = [];
    this.stars ||= Array.from({length: 70}, () => ({x: G.rnd(G.W), y: G.rnd(G.H), v: 20 + G.rnd(90)}));
  },
  foe() {
    const r = Math.random(), t = this.t;
    const kind = t > 25 && r < .18 ? 'tank' : t > 10 && r < .45 ? 'diver' : 'drone';
    const x = kind === 'drone' ? 70 + G.rnd(G.W - 140) : 30 + G.rnd(G.W - 60);
    const stats = {
      drone: {hp: 1, r: 14, vy: 90, pts: 10, color: '#ff6b8b'},
      diver: {hp: 1, r: 13, vy: 150, pts: 20, color: '#ffcf5c'},
      tank: {hp: 3, r: 18, vy: 50, pts: 30, color: '#8b7bff'}
    }[kind];
    return {kind, x, x0: x, y: -24, t: 0, ph: G.rnd(6), cd: 1 + G.rnd(1), flash: 0, ...stats};
  },
  aimed(x, y, speed, spread = 0) {
    const a = Math.atan2(G.H - 50 - y, this.x - x) + spread;
    this.bolts.push({x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed});
  },
  hurt(n) {
    if (this.shield > 0) { G.sfx('hit', .5); return; }
    this.hp -= n; this.inv = 1.2; G.shake(7); G.flash(); G.sfx('hurt');
    G.burst(this.parts, this.x, G.H - 50, '#ffcf5c', 18);
    if (this.hp <= 0) { this.hp = 0; G.sfx('boom'); G.end(); }
  },
  kill(f) {
    G.score += f.pts; G.burst(this.parts, f.x, f.y, f.color, 16); G.sfx('crunch', .6);
    if (Math.random() < .08) this.drops.push({x: f.x, y: f.y, type: G.pick(['D', 'S', '+'])});
  },
  update(dt) {
    this.t += dt; this.double -= dt; this.shield -= dt;
    const dir = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a');
    this.vx += (dir * 380 - this.vx) * Math.min(1, dt * 14);
    this.x += this.vx * dt;
    if (G.pointer.down) this.x += (G.pointer.x - this.x) * Math.min(1, dt * 12);
    this.x = G.clamp(this.x, 20, G.W - 20);
    const py = G.H - 50;
    if ((this.fire -= dt) <= 0) {
      this.fire = .16;
      if (this.double > 0) { this.shots.push({x: this.x - 8, y: py - 14}, {x: this.x + 8, y: py - 14}); }
      else this.shots.push({x: this.x, y: py - 18});
      G.sfx('shoot', .5);
    }
    for (const s of this.shots) s.y -= 640 * dt;
    if (!this.boss && this.t >= this.bossAt) {
      this.boss = {x: G.W / 2, y: -60, hp: 60 + this.wave * 20, max: 60 + this.wave * 20, cd: 2, spawn: 3, dir: 1, flash: 0};
      G.sfx('power'); G.shake(4, .6);
    }
    if (!this.boss && (this.spawn -= dt) <= 0) { this.spawn = Math.max(.35, 1.1 - this.t * .012); this.foes.push(this.foe()); }
    const B = this.boss;
    if (B) {
      B.y = Math.min(90, B.y + 60 * dt); B.x += B.dir * 90 * dt; B.flash -= dt;
      if (B.x < 90 || B.x > G.W - 90) B.dir *= -1;
      if ((B.cd -= dt) <= 0) { B.cd = 1.4; for (const s of [-.4, -.2, 0, .2, .4]) this.aimed(B.x, B.y + 30, 220, s); G.sfx('laser', .6); }
      if ((B.spawn -= dt) <= 0) { B.spawn = 3.5; const f = this.foe(); f.x = f.x0 = G.clamp(B.x, 70, G.W - 70); f.y = B.y + 20; this.foes.push(f); }
      for (const s of this.shots) if (!s.dead && Math.abs(s.x - B.x) < 70 && Math.abs(s.y - B.y) < 30) {
        s.dead = true; B.hp--; B.flash = .06; G.score += 2;
        if (B.hp <= 0) {
          G.score += 500; this.hp = Math.min(100, this.hp + 20); G.burst(this.parts, B.x, B.y, '#8b7bff', 50, 300);
          G.popText(this.parts, B.x, B.y, '+500', '#ffcf5c', 22); G.shake(12, .6); G.sfx('boom');
          this.boss = null; this.wave++; this.bossAt = this.t + 50; break;
        }
      }
    }
    for (const f of this.foes) {
      f.t += dt; f.y += f.vy * dt;
      if (f.kind === 'drone') f.x = f.x0 + Math.sin(f.t * 2 + f.ph) * 50;
      if (f.kind === 'diver' && f.y > 60) f.x += G.clamp(this.x - f.x, -100 * dt, 100 * dt);
      if (f.kind === 'tank' && (f.cd -= dt) <= 0) { f.cd = 1.6 + G.rnd(1); this.aimed(f.x, f.y + 16, 240); }
      if (f.y > G.H + 20) { // slipped past: costs health
        f.hp = 0; G.burst(this.parts, f.x, G.H - 4, f.color, 10); this.hurt(8);
        if (G.state !== 'play') return;
      }
    }
    for (const b of this.bolts) { b.x += b.vx * dt; b.y += b.vy * dt; }
    for (const s of this.shots) for (const f of this.foes) {
      if (s.dead || f.hp <= 0 || Math.abs(s.x - f.x) > f.r || Math.abs(s.y - f.y) > f.r) continue;
      s.dead = true; f.flash = .08;
      if (--f.hp <= 0) this.kill(f);
    }
    if (this.inv > 0) this.inv -= dt;
    else {
      const ram = this.foes.find(f => f.hp > 0 && Math.hypot(f.x - this.x, f.y - py) < f.r + 12);
      const bolt = this.bolts.find(b => !b.dead && Math.abs(b.x - this.x) < 12 && Math.abs(b.y - py) < 14);
      if (ram) { ram.hp = 0; G.burst(this.parts, ram.x, ram.y, ram.color, 14); this.hurt(25); }
      else if (bolt) { bolt.dead = true; this.hurt(12); }
      if (G.state !== 'play') return;
    }
    for (const d of this.drops) {
      d.y += 120 * dt;
      if (Math.abs(d.x - this.x) < 22 && Math.abs(d.y - py) < 22) {
        d.got = true; G.sfx('power');
        if (d.type === 'D') this.double = 8;
        if (d.type === 'S') this.shield = 5;
        if (d.type === '+') this.hp = Math.min(100, this.hp + 30);
        G.popText(this.parts, this.x, py - 30, {D: 'DOUBLE SHOT', S: 'SHIELD', '+': '+30 HP'}[d.type], '#5ee6c1');
      }
    }
    this.drops = this.drops.filter(d => !d.got && d.y < G.H + 20);
    this.shots = this.shots.filter(s => !s.dead && s.y > -20);
    this.foes = this.foes.filter(f => f.hp > 0);
    this.bolts = this.bolts.filter(b => !b.dead && b.y < G.H + 20 && b.y > -40 && b.x > -20 && b.x < G.W + 20);
  },
  draw(ctx, dt) {
    G.clear('#07071a');
    ctx.fillStyle = '#c9ccff';
    for (const s of this.stars) {
      s.y += s.v * dt;
      if (s.y > G.H) { s.y = 0; s.x = G.rnd(G.W); }
      ctx.globalAlpha = s.v / 110; ctx.fillRect(s.x, s.y, 2, 2);
    }
    ctx.globalAlpha = 1;
    const B = this.boss;
    if (B) {
      const c = B.flash > 0 ? '#ffffff' : '#6a5bd6';
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(B.x, B.y, 72, 26, 0, 0, Math.PI * 2); ctx.fill();
      G.circle(B.x, B.y - 12, 26, B.flash > 0 ? '#fff' : '#8b7bff');
      for (const ox of [-45, -15, 15, 45]) G.circle(B.x + ox, B.y + 8, 5, '#ff6b8b');
    }
    ctx.fillStyle = '#5ee6c1'; for (const s of this.shots) ctx.fillRect(s.x - 1.5, s.y - 8, 3, 12);
    ctx.fillStyle = '#ff6b8b'; for (const b of this.bolts) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
    for (const f of this.foes) {
      const color = f.flash > 0 ? '#ffffff' : f.color;
      f.flash -= dt;
      if (f.kind === 'drone') { G.gem(f.x, f.y, f.r, color); continue; }
      ctx.fillStyle = color; ctx.beginPath();
      if (f.kind === 'diver') { ctx.moveTo(f.x - f.r, f.y - f.r * .7); ctx.lineTo(f.x + f.r, f.y - f.r * .7); ctx.lineTo(f.x, f.y + f.r); }
      else for (let i = 0; i < 6; i++) ctx.lineTo(f.x + Math.cos(i * Math.PI / 3) * f.r, f.y + Math.sin(i * Math.PI / 3) * f.r);
      ctx.closePath(); ctx.fill();
      if (f.kind === 'tank') G.bar({x: f.x - 16, y: f.y - 28, w: 32, h: 4, v: f.hp, max: 3, color: '#8b7bff'});
    }
    for (const d of this.drops) {
      G.rr(d.x - 12, d.y - 12, 24, 24, 7, {D: '#ffcf5c', S: '#5cb8ff', '+': '#5ee6c1'}[d.type]);
      G.text(d.type, d.x, d.y + 5, {size: 14, color: '#1b1a33', align: 'center', weight: 700});
    }
    const py = G.H - 50, blink = this.inv > 0 && Math.floor(this.inv * 10) % 2;
    if (G.state !== 'over' && !blink) {
      ctx.fillStyle = '#ff9f5c'; ctx.beginPath(); ctx.moveTo(this.x - 6, py + 12); ctx.lineTo(this.x, py + 20 + Math.random() * 6); ctx.lineTo(this.x + 6, py + 12); ctx.fill();
      ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(this.x, py - 18); ctx.lineTo(this.x + 17, py + 14); ctx.lineTo(this.x, py + 7); ctx.lineTo(this.x - 17, py + 14); ctx.closePath(); ctx.fill();
      if (this.shield > 0) { ctx.strokeStyle = 'rgba(92,184,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x, py, 28, 0, Math.PI * 2); ctx.stroke(); }
    }
    G.fx(this.parts, dt);
    G.bar({x: 14, y: G.H - 26, w: 180, h: 14, v: this.hp, max: 100, color: this.hp < 30 ? '#ff6b8b' : '#5ee6c1', label: `HULL ${Math.ceil(this.hp)}`, id: 'hp'});
    if (this.double > 0) G.bar({x: G.W - 114, y: G.H - 24, w: 100, h: 8, v: this.double, max: 8, color: '#ffcf5c'});
    if (B) {
      G.text('MOTHERSHIP', G.W / 2, 22, {align: 'center', size: 12, color: '#c4c8ee', weight: 700});
      G.bar({x: 90, y: 30, w: G.W - 180, h: 10, v: B.hp, max: B.max, color: '#8b7bff', id: 'boss'});
    }
  }
});

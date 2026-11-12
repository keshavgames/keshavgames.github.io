GameBox.register({
  id: 'dodge', title: 'Rock Dodge', genre: 'Arcade', kind: 'Dodge-em-up', w: 480, h: 520,
  desc: 'Rocks rain down faster every second, and bigger rocks hit harder. Gems add points and patch your hull, hearts heal, and blue orbs wrap you in a shield that smashes rocks for bonus points.',
  controls: [['A D / Left Right', 'Move'], ['Shift', 'Dash while moving']],
  info() { return `Survived ${Math.floor(this.time)}s`; },
  init() {
    this.x = G.W / 2; this.vx = 0; this.items = []; this.parts = []; this.spawn = 0; this.time = 0;
    this.hp = 100; this.inv = 0; this.shield = 0; this.dash = 0; this.dashCd = 0;
  },
  update(dt) {
    this.time += dt; G.score += dt * 10;
    this.inv -= dt; this.shield -= dt; this.dashCd -= dt; this.dash -= dt;
    const dir = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a');
    if (G.keys.Shift && this.dashCd <= 0 && dir) { this.dash = .22; this.dashCd = 1.2; G.sfx('swing'); }
    const top = this.dash > 0 ? 900 : 360;
    this.vx += (dir * top - this.vx) * Math.min(1, dt * (this.dash > 0 ? 30 : 14));
    this.x = G.clamp(this.x + this.vx * dt, 20, G.W - 20);
    if ((this.spawn -= dt) <= 0) {
      this.spawn = Math.max(.13, .6 - this.time * .009);
      const roll = Math.random();
      const type = roll < .1 ? 'gem' : roll < .13 ? 'heart' : roll < .16 ? 'shield' : 'rock';
      this.items.push({type, x: 15 + G.rnd(G.W - 30), y: -24, r: type === 'rock' ? 10 + G.rnd(14) : 11, v: 150 + G.rnd(90) + this.time * 5, spin: G.rnd(6)});
    }
    const py = G.H - 34;
    for (const it of this.items) {
      it.y += it.v * dt; it.spin += dt * 2;
      if (Math.abs(it.x - this.x) > it.r + 17 || Math.abs(it.y - py) > it.r + 9) continue;
      it.y = G.H + 100;
      if (it.type === 'gem') {
        G.score += 25; this.hp = Math.min(100, this.hp + 8);
        G.burst(this.parts, it.x, py, '#5ee6c1'); G.popText(this.parts, it.x, py - 24, '+25'); G.sfx('coin');
      } else if (it.type === 'heart') {
        this.hp = Math.min(100, this.hp + 30); G.popText(this.parts, it.x, py - 24, '+30 HP', '#ff6b8b'); G.sfx('power');
      } else if (it.type === 'shield') {
        this.shield = 5; G.popText(this.parts, it.x, py - 24, 'SHIELD', '#5cb8ff'); G.sfx('power');
      } else if (this.shield > 0) {
        G.score += 10; G.burst(this.parts, it.x, py - 10, '#9aa0c8', 14); G.popText(this.parts, it.x, py - 24, '+10'); G.sfx('crunch');
      } else if (this.inv <= 0) {
        this.hp -= Math.round(it.r * 1.6); this.inv = .7;
        G.burst(this.parts, this.x, py, '#ffcf5c', 16); G.shake(7); G.flash(); G.sfx('hurt');
        if (this.hp <= 0) { this.hp = 0; G.burst(this.parts, this.x, py, '#ffcf5c', 30); return G.end(); }
      }
    }
    this.items = this.items.filter(it => it.y < G.H + 40);
  },
  draw(ctx, dt) {
    G.clear('#0a0c1e');
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 14; i++) ctx.fillRect((i * 97) % G.W, ((i * 61 + this.time * 320) % (G.H + 40)) - 40, 2, 26);
    for (const it of this.items) {
      if (it.type === 'gem') G.gem(it.x, it.y, it.r, '#5ee6c1');
      else if (it.type === 'heart') G.heart(it.x, it.y, 10, '#ff6b8b');
      else if (it.type === 'shield') {
        G.circle(it.x, it.y, 10, '#5cb8ff');
        ctx.strokeStyle = 'rgba(92,184,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(it.x, it.y, 14 + Math.sin(it.spin * 3) * 2, 0, Math.PI * 2); ctx.stroke();
      } else {
        G.circle(it.x, it.y, it.r, '#7d82ad');
        G.circle(it.x + Math.cos(it.spin) * it.r * .4, it.y + Math.sin(it.spin) * it.r * .4, it.r * .3, '#5f6491');
        G.circle(it.x - Math.cos(it.spin + 2) * it.r * .45, it.y - Math.sin(it.spin + 2) * it.r * .45, it.r * .18, '#5f6491');
      }
    }
    const blink = this.inv > 0 && Math.floor(this.inv * 14) % 2;
    if (G.state !== 'over' && !blink) {
      ctx.save(); ctx.translate(this.x, G.H - 35); ctx.rotate(this.vx / 360 * .25);
      if (this.dash > 0) { ctx.globalAlpha = .35; G.rr(-30 - Math.sign(this.vx) * 20, -2, 60, 8, 4, '#ffcf5c'); ctx.globalAlpha = 1; }
      ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(18, 11); ctx.lineTo(-18, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
      if (this.shield > 0) {
        ctx.strokeStyle = `rgba(92,184,255,${this.shield < 1.5 && Math.floor(this.shield * 8) % 2 ? .2 : .8})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(this.x, G.H - 34, 26, 0, Math.PI * 2); ctx.stroke();
      }
    }
    G.fx(this.parts, dt);
    G.bar({x: 14, y: 14, w: 200, h: 15, v: this.hp, max: 100, color: this.hp < 30 ? '#ff6b8b' : '#5ee6c1', label: `HULL ${Math.ceil(this.hp)}`, id: 'hp'});
    if (this.shield > 0) G.bar({x: 14, y: 38, w: 120, h: 8, v: this.shield, max: 5, color: '#5cb8ff'});
    G.bar({x: G.W - 104, y: 16, w: 90, h: 8, v: this.dashCd > 0 ? 1.2 - this.dashCd : 1.2, max: 1.2, color: '#ffcf5c'});
    G.text('DASH', G.W - 110, 25, {size: 11, align: 'right', color: '#9aa0c8'});
  }
});

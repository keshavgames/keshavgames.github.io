(() => {
  const W = 640, H = 400, GRAV = 260;
  const WEAPONS = [
    {name: 'Shell', r: 26, dmg: 35, count: Infinity},
    {name: 'Big Bang', r: 46, dmg: 55, count: 2},
    {name: 'Triple', r: 20, dmg: 22, count: 2, spread: 3}
  ];

  GameBox.register({
    id: 'artillery', title: 'Tank Duel', genre: 'Strategy', kind: 'Artillery', w: W, h: H,
    desc: 'Turn-based tank battle across destructible hills. Set your angle and power, read the wind and lob shells at the enemy tank. Craters reshape the ground, and tanks that fall take damage. Each round the enemy gunner gets sharper.',
    controls: [['Left Right', 'Aim the barrel'], ['Up Down', 'Power'], ['A D', 'Drive (uses fuel)'], ['Q', 'Switch weapon'], ['Space', 'Fire']],
    info() { return `Round ${this.round} · Wind ${this.wind > 0 ? '→' : '←'} ${Math.abs(Math.round(this.wind))}`; },
    init() {
      this.round = 1; this.parts = [];
      this.me = {x: 0, y: 0, hp: 100, ang: 45, pow: 60, fuel: 60, color: '#3d8bff', vy: 0};
      this.cpu = {x: 0, y: 0, hp: 100, ang: 135, pow: 60, fuel: 0, color: '#e04e5f', vy: 0};
      this.newRound();
    },
    newRound() {
      const a = [G.rnd(6), G.rnd(6), G.rnd(6)], base = 260 + G.rnd(40);
      this.h = Array.from({length: W}, (_, x) => base - Math.sin(x / 90 + a[0]) * 50 - Math.sin(x / 37 + a[1]) * 18 - Math.sin(x / 13 + a[2]) * 5);
      this.me.x = 70 + G.rnd(90); this.cpu.x = W - 70 - G.rnd(90);
      this.me.y = this.h[Math.round(this.me.x)]; this.cpu.y = this.h[Math.round(this.cpu.x)];
      this.cpu.hp = 100; this.ammo = WEAPONS.map(w => w.count); this.weapon = 0;
      this.shells = []; this.booms = []; this.turn = 'me'; this.newTurn();
    },
    newTurn() { this.wind = (Math.random() - .5) * 80; this.me.fuel = 60; this.thinkT = 1; },
    key(k) {
      if (this.turn !== 'me') return;
      if (k === 'q') { do this.weapon = (this.weapon + 1) % 3; while (!this.ammo[this.weapon]); G.sfx('click'); }
      if (k === ' ') this.fire(this.me, this.weapon);
    },
    fire(t, w) {
      const W0 = WEAPONS[w], n = W0.spread || 1;
      if (this.ammo && t === this.me && !this.ammo[w]) return;
      if (t === this.me && this.ammo[w] !== Infinity) this.ammo[w]--;
      for (let i = 0; i < n; i++) {
        const a = (t.ang + (i - (n - 1) / 2) * 5) * Math.PI / 180, v = t.pow * 6.5;
        this.shells.push({x: t.x + Math.cos(a) * 18, y: t.y - 12 - Math.sin(a) * 18, vx: Math.cos(a) * v, vy: -Math.sin(a) * v, w: W0, from: t});
      }
      this.turn = 'flight'; this.shooter = t; G.sfx('boom', .5); G.shake(3, .15);
      if (t === this.me && this.ammo[this.weapon] === 0) this.weapon = 0;
    },
    simulate(ang, pow, wind) { // where a shell would land: used by the CPU gunner
      const a = ang * Math.PI / 180; let x = this.cpu.x + Math.cos(a) * 18, y = this.cpu.y - 12 - Math.sin(a) * 18, vx = Math.cos(a) * pow * 6.5, vy = -Math.sin(a) * pow * 6.5;
      for (let i = 0; i < 600; i++) {
        vx += wind * .02; vy += GRAV * .02; x += vx * .02; y += vy * .02;
        if (x < 0 || x >= W) return {x, y};
        if (y >= this.h[Math.floor(x)] || G.dist(x, y, this.me.x, this.me.y - 8) < 14) return {x, y};
      }
      return {x, y};
    },
    explode(x, y, w) {
      this.booms.push({x, y, r: w.r, t: .4}); G.sfx('boom'); G.shake(w.r / 5, .35);
      for (let i = Math.max(0, Math.floor(x - w.r)); i < Math.min(W, Math.ceil(x + w.r)); i++) {
        const d = Math.sqrt(w.r * w.r - (i - x) ** 2);
        if (y + d > this.h[i]) this.h[i] = Math.min(H - 4, y + d);
      }
      G.burst(this.parts, x, y, '#8a6a4a', 20, 200);
      for (const t of [this.me, this.cpu]) {
        const d = G.dist(x, y, t.x, t.y - 8);
        if (d < w.r + 12) {
          const dmg = Math.round(w.dmg * (1 - d / (w.r + 12)));
          t.hp -= dmg; G.popText(this.parts, t.x, t.y - 34, `-${dmg}`, '#ff6b8b', 18);
          if (t === this.cpu) G.score += dmg * 10;
        }
      }
    },
    settle(dt) { // tanks drop onto the ground below them; long drops hurt
      let moving = false;
      for (const t of [this.me, this.cpu]) {
        const ground = this.h[Math.round(G.clamp(t.x, 0, W - 1))];
        if (t.y < ground - .5) { t.vy += 600 * dt; t.y = Math.min(ground, t.y + t.vy * dt); moving = true; if (!t.fall) t.fall = t.y; }
        else { if (t.fall !== undefined && ground - t.fall > 20) { const dmg = Math.round((ground - t.fall - 20) * .5); t.hp -= dmg; G.popText(this.parts, t.x, t.y - 30, `-${dmg}`, '#ff6b8b'); } t.y = ground; t.vy = 0; t.fall = undefined; }
      }
      return moving;
    },
    update(dt) {
      const me = this.me;
      if (this.turn === 'me') {
        me.ang = G.clamp(me.ang + (G.held('ArrowLeft') - G.held('ArrowRight')) * 60 * dt, 0, 180);
        me.pow = G.clamp(me.pow + (G.held('ArrowUp') - G.held('ArrowDown')) * 40 * dt, 10, 100);
        const drive = G.held('d') - G.held('a');
        if (drive && me.fuel > 0) {
          const nx = G.clamp(me.x + drive * 40 * dt, 10, W - 10), slope = this.h[Math.round(nx)] - this.h[Math.round(me.x)];
          if (slope > -3) { me.x = nx; me.y = this.h[Math.round(me.x)]; me.fuel -= 40 * dt; }
        }
      } else if (this.turn === 'cpu') {
        if ((this.thinkT -= dt) <= 0) {
          let best = null;
          for (let a = 95; a <= 175; a += 4) for (let p = 30; p <= 100; p += 5) {
            const hit = this.simulate(a, p, this.wind), d = Math.abs(hit.x - this.me.x) + Math.abs(hit.y - this.me.y) * .3;
            if (!best || d < best.d) best = {a, p, d};
          }
          const err = Math.max(.02, .16 - this.round * .03);
          this.cpu.ang = best.a + (Math.random() - .5) * 80 * err; this.cpu.pow = G.clamp(best.p + (Math.random() - .5) * 100 * err, 10, 100);
          this.fire(this.cpu, this.round > 1 && Math.random() < .25 ? 1 : 0);
        }
      }
      for (const s of this.shells) {
        s.vx += this.wind * dt; s.vy += GRAV * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < -50 || s.x > W + 50 || s.y > H + 20) { s.dead = true; continue; }
        const xi = Math.floor(s.x);
        const hitTank = [this.me, this.cpu].some(t => (t !== s.from || s.y > s.from.y - 40) && G.dist(s.x, s.y, t.x, t.y - 8) < 14);
        if (hitTank || (xi >= 0 && xi < W && s.y >= this.h[xi])) { s.dead = true; this.explode(s.x, s.y, s.w); }
      }
      this.shells = this.shells.filter(s => !s.dead);
      for (const b of this.booms) b.t -= dt;
      this.booms = this.booms.filter(b => b.t > 0);
      if (this.turn === 'flight' && !this.shells.length && !this.booms.length && !this.settle(dt)) {
        if (this.me.hp <= 0) { this.me.hp = 0; return G.end('Tank destroyed'); }
        if (this.cpu.hp <= 0) {
          this.cpu.hp = 0; G.score += 1000 * this.round; G.sfx('win');
          G.popText(this.parts, W / 2, 140, `ROUND ${this.round} WON`, '#ffcf5c', 24);
          this.round++; this.me.hp = Math.min(100, this.me.hp + 30); this.newRound(); return;
        }
        this.turn = this.shooter === this.me ? 'cpu' : 'me';
        if (this.turn === 'me') this.newTurn(); else this.thinkT = 1.1;
      } else if (this.turn === 'flight') this.settle(dt);
    },
    tank(ctx, t, now) {
      const ground = t.y, slope = Math.atan2(this.h[Math.round(G.clamp(t.x + 8, 0, W - 1))] - this.h[Math.round(G.clamp(t.x - 8, 0, W - 1))], 16);
      ctx.save(); ctx.translate(t.x, ground); ctx.rotate(slope);
      G.rr(-16, -10, 32, 10, 4, '#2b2b30');
      for (let i = -12; i <= 12; i += 6) G.circle(i, -4, 3, '#55555f');
      G.rr(-13, -18, 26, 9, 4, t.color);
      ctx.restore();
      const a = t.ang * Math.PI / 180;
      ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(t.x, ground - 16); ctx.lineTo(t.x + Math.cos(a) * 20, ground - 16 - Math.sin(a) * 20); ctx.stroke();
      G.circle(t.x, ground - 16, 7, t.color);
      G.bar({x: t.x - 22, y: ground - 40, w: 44, h: 5, v: t.hp, max: 100, color: t.color});
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2b4a7a'); sky.addColorStop(1, '#e8a87c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(80,60,110,.5)'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 200 - Math.abs(Math.sin(x / 120)) * 70 - Math.sin(x / 31) * 8);
      ctx.lineTo(W, H); ctx.fill();
      for (let i = 0; i < 4; i++) { const cx = ((i * 190 + now * this.wind * .4) % (W + 120) + W + 120) % (W + 120) - 60; G.circle(cx, 50 + i * 18, 18, 'rgba(255,255,255,.5)'); G.circle(cx + 20, 46 + i * 18, 14, 'rgba(255,255,255,.5)'); }
      ctx.fillStyle = '#5a7d3a'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x < W; x++) ctx.lineTo(x, this.h[x]);
      ctx.lineTo(W, H); ctx.fill();
      ctx.fillStyle = '#6a4a2f'; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x < W; x++) ctx.lineTo(x, this.h[x] + 8);
      ctx.lineTo(W, H); ctx.fill();
      this.tank(ctx, this.me, now); this.tank(ctx, this.cpu, now);
      if (this.turn === 'me') { // short dotted preview of the launch arc
        const a = this.me.ang * Math.PI / 180, v = this.me.pow * 6.5;
        let x = this.me.x + Math.cos(a) * 18, y = this.me.y - 12 - Math.sin(a) * 18, vx = Math.cos(a) * v, vy = -Math.sin(a) * v;
        for (let i = 0; i < 14; i++) { for (let k = 0; k < 3; k++) { vx += this.wind * .02; vy += GRAV * .02; x += vx * .02; y += vy * .02; } G.circle(x, y, 2, `rgba(255,255,255,${.7 - i * .045})`); }
      }
      for (const s of this.shells) G.circle(s.x, s.y, 4, '#1b1a20');
      for (const b of this.booms) { G.circle(b.x, b.y, b.r * (1.2 - b.t), `rgba(255,170,80,${b.t * 2})`); G.circle(b.x, b.y, b.r * .5 * (1.2 - b.t), `rgba(255,240,200,${b.t * 2})`); }
      G.fx(this.parts, dt);
      G.panel(8, 8, 220, 52);
      G.bar({x: 16, y: 16, w: 204, h: 14, v: this.me.hp, max: 100, color: '#3d8bff', label: `YOU ${Math.max(0, Math.ceil(this.me.hp))}`, id: 'me'});
      G.bar({x: 16, y: 38, w: 204, h: 14, v: this.cpu.hp, max: 100, color: '#e04e5f', label: `ENEMY ${Math.max(0, Math.ceil(this.cpu.hp))}`, id: 'cpu'});
      G.panel(W - 228, 8, 220, 52);
      const w = WEAPONS[this.weapon];
      G.text(`${w.name} ${this.ammo[this.weapon] === Infinity ? '' : '×' + this.ammo[this.weapon]}`, W - 216, 28, {size: 13, weight: 700, color: '#ffcf5c'});
      G.text(`Angle ${Math.round(this.me.ang)}°  Power ${Math.round(this.me.pow)}`, W - 216, 48, {size: 12, color: '#e8e9ff'});
      G.text('WIND', W / 2, 22, {size: 11, align: 'center', weight: 700, shadow: true});
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2, 34); ctx.lineTo(W / 2 + this.wind * .8, 34); ctx.stroke();
      G.circle(W / 2 + this.wind * .8, 34, 4, '#ffffff');
      G.bar({x: 16, y: H - 20, w: 100, h: 8, v: this.me.fuel, max: 60, color: '#ffcf5c', label: ''});
      G.text('FUEL', 122, H - 12, {size: 10, color: '#1b1a33', weight: 700});
      const label = this.turn === 'me' ? 'Your turn' : this.turn === 'cpu' ? 'Enemy aiming…' : '';
      if (label) G.text(label, W / 2, 62, {size: 14, align: 'center', weight: 700, shadow: true});
    }
  });
})();

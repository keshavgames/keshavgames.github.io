(() => {
  // Throw a spinning axe at a target: stop the aim swing, then the power swing. Wind and moving targets later.
  const W = 800, H = 480;

  GameBox.register({
    id: 'axetoss', title: 'Axe Toss', genre: 'Skill', kind: 'Throwing', w: W, h: H, levels: 50, assets: ['img/axe.png', 'img/kid_idle.png'], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click once to lock your aim, click again to lock your power. Hit the bullseye!',
    desc: 'Lumberjack target practice. A marker swings up and down your target: click to lock where you aim. Then a power bar fills: click again to throw. Too little and the axe falls short, too much and it sails over. Score points in the rings, hit the target total in five throws, and watch out for swaying targets and wind later on. Fifty rounds.',
    controls: [['Click / Space', 'Lock aim, then lock power']],
    info() { return `Round ${G.level} · ${this.score}/${this.need} · Axes ${5 - this.thrown}`; },
    init() {
      const n = G.level, R = G.seeded(n * 19 + 2);
      this.dist = 380 + Math.min(220, n * 6); this.tx = 160 + this.dist; this.ty = 250; this.ring = Math.max(46, 70 - n * .5);
      this.move = n > 8 ? Math.min(60, (n - 8) * 2.5) : 0; this.wind = n > 15 ? (R() - .5) * Math.min(1, (n - 15) * .04) : 0;
      this.need = Math.min(24, 12 + Math.floor(n / 4)); this.score = 0; this.thrown = 0; this.stuck = []; this.stage = 'aim'; this.t = 0; this.ax = null; this.done = null; this.parts = []; this.aimY = 0; this.pow = 0;
    },
    click() {
      if (this.done || this.ax) return;
      if (this.stage === 'aim') { this.lockY = this.aimY; this.stage = 'power'; this.pt = 0; G.sfx('click'); return; }
      if (this.stage === 'power') {
        const p = this.pow; this.stage = 'fly'; G.sfx('swing');
        const ideal = 1, err = (p - ideal); // power off by err moves the hit up or down
        this.ax = {x: 140, y: 300, t: 0, dur: .55 + this.dist / 1400, tyAim: this.lockY + err * 140 + this.wind * 120, spin: 0};
      }
    },
    key(k) { if (k === ' ') this.click(); }, pointer(type) { if (type === 'down') this.click(); },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.ty = 250 + Math.sin(this.t * 1.3) * this.move;
      if (this.stage === 'aim') this.aimY = this.ty + Math.sin(this.t * (2.2 + G.level * .03)) * (this.ring + 40);
      if (this.stage === 'power') { this.pt += dt; this.pow = (Math.sin(this.pt * (2.4 + G.level * .02) - Math.PI / 2) + 1) / 2 * 1.6 + .2; }
      const a = this.ax;
      if (a) {
        a.t += dt; const k = Math.min(1, a.t / a.dur);
        a.x = 140 + (this.tx - 140) * k; a.y = 300 + (a.tyAim - 300) * k - Math.sin(k * Math.PI) * 120; a.spin += dt * 14;
        if (k >= 1) {
          const d = Math.abs(a.tyAim - this.ty), r = this.ring, pts = d < r * .2 ? 10 : d < r * .45 ? 6 : d < r * .7 ? 4 : d < r ? 2 : 0;
          this.thrown++; this.score += pts;
          if (pts) { this.stuck.push({dy: a.tyAim - this.ty}); G.sfx(pts === 10 ? 'win' : 'hit'); G.shake(pts === 10 ? 6 : 3, .15); G.popText(this.parts, this.tx, a.tyAim - 30, pts === 10 ? 'BULLSEYE! 10' : `+${pts}`, pts === 10 ? '#ffcf5c' : '#fff', pts === 10 ? 22 : 16); G.score += pts * 20; for (let i = 0; i < 10; i++) this.parts.push({x: this.tx - 10, y: a.tyAim, vx: -Math.random() * 150, vy: -Math.random() * 150, life: .5, color: '#c49a6a'}); }
          else { G.sfx('step'); G.popText(this.parts, this.tx, 120, 'Miss!', '#ff8b8b', 16); }
          this.ax = null; this.stage = 'aim';
          if (this.score >= this.need) { G.party(); this.done = {t: 1, go: () => G.win(this.thrown <= 3 ? 3 : this.thrown <= 4 ? 2 : 1, `${this.score} points!`)}; }
          else if (this.thrown >= 5) this.done = {t: 1, go: () => G.end(`${this.score} of ${this.need} points`)};
        }
      }
    },
    draw(ctx, dt) {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#9ad4ff'); sky.addColorStop(1, '#e8f6ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) { const x = i * 75 + 10; ctx.fillStyle = '#2f6a3a'; ctx.beginPath(); ctx.moveTo(x, 360); ctx.lineTo(x + 30, 200 + (i % 3) * 30); ctx.lineTo(x + 60, 360); ctx.fill(); }
      ctx.fillStyle = '#6aa84a'; ctx.fillRect(0, 360, W, H);
      // target: a sawn log round on a stand
      const tx = this.tx, ty = this.ty, r = this.ring;
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(tx - 6, ty, 12, 420 - ty); ctx.fillRect(tx - 40, 410, 80, 10);
      G.circle(tx + 6, ty + 6, r + 10, 'rgba(0,0,0,.2)'); G.circle(tx, ty, r + 10, '#8a5a30');
      [['#f2dcb0', 1], ['#e84a4a', .7], ['#f2dcb0', .45], ['#ffcf5c', .2]].forEach(([c, k]) => G.circle(tx, ty, r * k, c));
      ctx.strokeStyle = 'rgba(120,80,40,.3)'; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.arc(tx, ty, r * k / 6, 0, Math.PI * 2); ctx.stroke(); }
      const axe = G.img('img/axe.png');
      for (const s of this.stuck) if (axe.complete) { ctx.save(); ctx.translate(tx - 20, ty + s.dy); ctx.rotate(-Math.PI / 2 - .2); ctx.drawImage(axe, -40, -60, 80, 80); ctx.restore(); }
      // thrower's arm and the flying axe
      const kid = G.img('img/kid_idle.png'); if (kid.complete && kid.naturalWidth) ctx.drawImage(kid, 40, 200, 170, 170);
      if (this.ax && axe.complete) { ctx.save(); ctx.translate(this.ax.x, this.ax.y); ctx.rotate(this.ax.spin); ctx.drawImage(axe, -40, -40, 80, 80); ctx.restore(); }
      else if (axe.complete && !this.done) { ctx.save(); ctx.translate(150, 250); ctx.rotate(-.6); ctx.drawImage(axe, -40, -60, 80, 80); ctx.restore(); }
      // aim and power UI
      if (this.stage === 'aim') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - r - 30, this.aimY); ctx.lineTo(tx - r - 6, this.aimY); ctx.stroke(); G.circle(tx - r - 36, this.aimY, 6, '#fff'); G.text('CLICK TO AIM', W / 2, 60, {size: 22, align: 'center', display: true, color: '#2a4a6a'}); }
      if (this.stage === 'power') {
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(tx - r - 40, this.lockY); ctx.lineTo(tx - r - 6, this.lockY); ctx.stroke(); ctx.setLineDash([]);
        G.rr(200, 410, 300, 26, 10, 'rgba(0,0,0,.35)'); const g = ctx.createLinearGradient(200, 0, 500, 0); g.addColorStop(0, '#5cb8ff'); g.addColorStop(.45, '#3fd07a'); g.addColorStop(.55, '#3fd07a'); g.addColorStop(1, '#ff5b5b'); ctx.fillStyle = g; ctx.fillRect(204, 414, 292 * Math.min(1, this.pow / 1.8), 18);
        ctx.fillStyle = '#fff'; ctx.fillRect(200 + 300 * (1 / 1.8) - 1, 404, 3, 38); G.text('CLICK FOR POWER', W / 2, 60, {size: 22, align: 'center', display: true, color: '#2a4a6a'});
      }
      if (Math.abs(this.wind) > .02) G.text(`WIND ${this.wind > 0 ? '↓' : '↑'}`, W - 20, 30, {size: 14, align: 'right', weight: 800, color: '#2a4a6a'});
      G.text(`${this.score} / ${this.need}`, 20, 34, {size: 22, weight: 800, color: '#2a4a6a'});
      for (let i = 0; i < 5; i++) if (axe.complete) { ctx.globalAlpha = i < 5 - this.thrown ? 1 : .2; ctx.drawImage(axe, 18 + i * 30, 40, 36, 36); ctx.globalAlpha = 1; }
      G.fx(this.parts, dt);
    }
  });
})();

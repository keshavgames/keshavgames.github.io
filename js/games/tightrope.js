(() => {
  // Walk a tightrope high above the circus floor: keep your balance against the wobble and the gusts.
  const W = 800, H = 500;

  GameBox.register({
    id: 'tightrope', title: 'Tightrope', genre: 'Skill', kind: 'Balance', w: W, h: H, levels: 30, assets: ['img/kid_idle.png', 'img/kid_run1.png', 'img/kid_run3.png'], thumb: 'jpg',
    hint: 'Hold Right to walk. Use A and D (or Left/Right on the pole) to lean against the wobble!',
    desc: 'Cross a wire high above the big top. Walking makes you wobble, and wind gusts push you around later on, so lean the other way to stay upright. Lean too far and you fall into the safety net. Collect stars on the way. Thirty ropes, each longer and windier.',
    controls: [['Right / W / hold click', 'Walk forward'], ['A / D', 'Lean left / right'], ['Mouse left / right half', 'Lean (while walking)']],
    info() { return `Rope ${G.level} · ${Math.round(this.x / this.len * 100)}%`; },
    init() {
      const n = G.level, R = G.seeded(n * 23 + 8);
      this.len = 900 + Math.min(1600, n * 60); this.x = 0; this.tilt = 0; this.vt = 0; this.wind = 0; this.gustT = 3; this.t = 0; this.fall = 0; this.done = null; this.parts = []; this.walk = 0;
      this.stars = Array.from({length: 5}, (_, i) => ({x: this.len * (i + 1) / 6, got: false})); this.got = 0;
    },
    update(dt) {
      this.t += dt; if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); if (this.fall) this.fall += dt; return; }
      const n = G.level, p = G.pointer, mouse = performance.now() - p.used < 1500 && p.down;
      const go = G.held('ArrowRight', 'w') || G.held('ArrowUp') || mouse;
      const lean = G.held('d') - G.held('a') + (mouse ? (p.x > W / 2 ? 1 : -1) * Math.min(1, Math.abs(p.x - W / 2) / 200) : 0);
      if ((this.gustT -= dt) <= 0) { this.gustT = Math.max(1.5, 5 - n * .1) + Math.random() * 2; this.gustDir = Math.random() < .5 ? -1 : 1; this.gust = n > 3 ? 1.1 : 0; }
      if (this.gust > 0) { this.gust -= dt; this.wind = this.gustDir * Math.min(1, .4 + n * .03); } else this.wind *= Math.pow(.2, dt);
      // a wobbly inverted pendulum: gravity tips you over, leaning pushes back
      const wobble = go ? Math.sin(this.t * 7) * (.5 + n * .02) : 0;
      this.vt += (Math.sin(this.tilt) * (2.2 + n * .05) + wobble * .6 + this.wind * 1.4 - lean * 3.2) * dt;
      this.vt *= Math.pow(.55, dt); this.tilt += this.vt * dt;
      if (go) { this.x += (90 + Math.min(60, n * 2)) * dt; this.walk += dt; }
      for (const s of this.stars) if (!s.got && Math.abs(s.x - this.x) < 20) { s.got = true; this.got++; G.sfx('coin'); G.score += 100; }
      if (Math.abs(this.tilt) > 1.05) { this.fall = .01; G.sfx('lose'); this.done = {t: 1.5, go: () => G.end('Into the net!')}; }
      if (this.x >= this.len) { G.score += 500 + G.level * 40 + this.got * 50; G.party(); this.done = {t: 1, go: () => G.win(this.got >= 5 ? 3 : this.got >= 3 ? 2 : 1, 'You made it across!')}; }
    },
    draw(ctx, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a1640'); bg.addColorStop(1, '#5a2a5a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? 'rgba(232,74,90,.35)' : 'rgba(255,240,220,.15)'; ctx.beginPath(); ctx.moveTo(W / 2, -60); ctx.lineTo(i * 80 - 80, H); ctx.lineTo(i * 80, H); ctx.fill(); }
      for (const sx of [180, 620]) { const g = ctx.createRadialGradient(sx, 0, 10, sx, 200, 300); g.addColorStop(0, 'rgba(255,240,180,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      // net and crowd below
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 430); ctx.lineTo(x + 20, 460); ctx.moveTo(x + 20, 430); ctx.lineTo(x, 460); ctx.stroke(); }
      for (let x = 0; x < W; x += 16) G.circle(x + 8, 480 + Math.sin(this.t * 6 + x) * 2, 7, ['#ff5b6b', '#ffcf5c', '#5cb8ff', '#7ee08a'][(x / 16) % 4]);
      const cam = this.x - 260, ry = 230;
      ctx.strokeStyle = '#d8c8a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(W, ry); ctx.stroke();
      for (const px of [0, this.len]) { const x = px - cam; if (x > -40 && x < W + 40) { G.rr(x - 30, ry, 60, 260, 6, '#8a5a3a'); G.rr(x - 50, ry - 8, 100, 12, 4, '#c4202c'); } }
      for (const s of this.stars) if (!s.got) G.star(s.x - cam, ry - 120 + Math.sin(this.t * 3 + s.x) * 6, 14, '#ffcf5c');
      // the walker with a balance pole, tilting
      const fallY = this.fall ? Math.min(200, this.fall * this.fall * 400) : 0, img = G.img(Math.abs(this.walk % .5) < .25 ? 'img/kid_run1.png' : 'img/kid_run3.png');
      ctx.save(); ctx.translate(260, ry + fallY); ctx.rotate(this.tilt + (this.fall ? this.fall * 3 : 0));
      ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-90, -70 + Math.sin(this.t * 2) * 2); ctx.lineTo(90, -70 - Math.sin(this.t * 2) * 2); ctx.stroke(); G.circle(-90, -70, 6, '#e84a5a'); G.circle(90, -70, 6, '#e84a5a');
      if (img.complete && img.naturalWidth) ctx.drawImage(img, -60, -118, 120, 120);
      ctx.restore();
      // balance meter
      G.rr(W / 2 - 150, 30, 300, 16, 8, 'rgba(0,0,0,.4)'); const k = Math.max(-1, Math.min(1, this.tilt / 1.05));
      G.rr(W / 2 - 40, 30, 80, 16, 8, 'rgba(94,230,138,.4)'); G.circle(W / 2 + k * 145, 38, 10, Math.abs(k) > .7 ? '#ff5b5b' : '#fff');
      G.text('BALANCE', W / 2, 64, {size: 11, align: 'center', weight: 800, color: '#fff'});
      if (Math.abs(this.wind) > .1) G.text(this.wind > 0 ? 'GUST →' : '← GUST', W / 2, 100, {size: 20, align: 'center', display: true, color: '#9fe8ff', shadow: true});
      G.rr(20, H - 30, W - 40, 8, 4, 'rgba(255,255,255,.2)'); G.rr(20, H - 30, (W - 40) * Math.min(1, this.x / this.len), 8, 4, '#ffcf5c');
      G.text(`★ ${this.got}/5`, W - 20, 30, {size: 16, align: 'right', weight: 800, color: '#ffcf5c'});
    }
  });
})();

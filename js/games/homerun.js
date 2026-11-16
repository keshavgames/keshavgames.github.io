(() => {
  // Home run derby: swing on time to launch the ball over the fence. Batter is the Blender kid; balls are Blender renders.
  const W = 800, H = 450, PLATE = 150, MOUND = 560, GROUND = 380, FENCE = 1600;

  GameBox.register({
    id: 'homerun', title: 'Home Run Derby', genre: 'Sports', kind: 'Batting', w: W, h: H, levels: 30, assets: ['img/baseball.png', 'img/kid_idle.png'], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click or press Space to swing when the ball reaches the plate. Perfect timing = home run!',
    desc: 'Step up to the plate. Watch the pitch come in and swing at just the right moment: perfect timing sends the ball sailing over the fence, early or late hits go foul or stay in the park. Hit enough homers in ten pitches to win the round. Later pitchers throw faster balls, slow changeups and dropping curves. Thirty rounds.',
    controls: [['Click / Space', 'Swing']],
    info() { return `Round ${G.level} · Homers ${this.hr}/${this.need} · Pitches ${10 - this.pitches}`; },
    init() { this.need = Math.min(7, 3 + Math.floor(G.level / 6)); this.hr = 0; this.pitches = 0; this.t = 0; this.parts = []; this.done = null; this.cam = 0; this.longest = 0; this.next(); },
    next() {
      const n = G.level, kinds = ['fast', 'fast', 'slow', 'curve'].slice(0, n < 4 ? 1 : n < 10 ? 2 : n < 16 ? 3 : 4), kind = G.pick(kinds);
      const sp = {fast: 380 + n * 9, slow: 240 + n * 4, curve: 320 + n * 6}[kind];
      this.ball = {x: MOUND, y: 300, vx: -sp, vy: -40, kind, state: 'pitch', z: 0}; this.windup = .9 + Math.random() * .6; this.swing = 0; this.res = null; this.cam = 0;
    },
    swingNow() {
      if (this.swing > 0 || this.done || this.ball.state !== 'pitch' || this.windup > 0) return;
      this.swing = .25; G.sfx('swing');
      const b = this.ball, dt0 = (b.x - PLATE) / Math.abs(b.vx); // seconds until the ball reaches the plate
      if (Math.abs(dt0) < .1 && Math.abs(b.y - 300) < 40) {
        const timing = dt0 / .1; // -1 late, +1 early: a 0.1 s window either side, at any pitch speed
        const q = 1 - Math.abs(timing), power = 500 + q * 650 + Math.random() * 60, ang = -(.35 + q * .25) + timing * .15;
        b.vx = Math.cos(ang) * power; b.vy = Math.sin(ang) * power; b.state = 'hit'; b.side = timing; G.sfx(q > .75 ? 'boom' : 'hit'); G.shake(q > .75 ? 8 : 4, .2);
        for (let i = 0; i < 12; i++) this.parts.push({x: PLATE, y: 300, vx: Math.random() * 200, vy: (Math.random() - .5) * 200, life: .4, color: '#fff6c0'});
      }
    },
    key(k) { if (k === ' ') this.swingNow(); }, pointer(type) { if (type === 'down') this.swingNow(); },
    result(text, homer, dist) {
      this.res = {text, t: 1.6}; this.pitches++; if (homer) { this.hr++; G.score += 200 + Math.round(dist); G.party(40); G.sfx('win'); } this.longest = Math.max(this.longest, dist || 0);
      const left = 10 - this.pitches;
      if (this.hr >= this.need) this.done = {t: 1.6, go: () => G.win(this.pitches <= this.need + 2 ? 3 : this.pitches <= this.need + 5 ? 2 : 1, `${this.hr} homers, longest ${Math.round(this.longest / 10)} m`)};
      else if (this.hr + left < this.need) this.done = {t: 1.6, go: () => G.end(`${this.hr} of ${this.need} home runs`)};
    },
    update(dt) {
      this.t += dt; this.swing -= dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); }
      if (this.res) { this.res.t -= dt; if (this.res.t <= 0 && !this.done) this.next(); this.cam += (Math.max(0, this.ball.x - 400) - this.cam) * Math.min(1, dt * 4); if (this.ball.state !== 'hit') return; }
      const b = this.ball;
      if (this.windup > 0) { this.windup -= dt; return; }
      if (b.state === 'pitch') {
        b.x += b.vx * dt; b.y += b.vy * dt; b.vy += (b.kind === 'curve' ? 260 : b.kind === 'slow' ? 120 : 60) * dt;
        if (b.x < PLATE - 60 && !this.res) { this.result(this.swing > 0 ? 'Swing and a miss!' : 'Strike!', false); G.sfx('click'); b.state = 'done'; }
      } else if (b.state === 'hit') {
        b.vy += 500 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y >= GROUND && b.vy > 0 && !this.res) {
          const dist = b.x - PLATE, foul = Math.abs(b.side) > .75;
          if (foul) this.result('Foul ball!', false);
          else if (b.x > FENCE) this.result(`HOME RUN! ${Math.round(dist / 10)} m`, true, dist);
          else this.result(dist > FENCE * .6 ? `Deep fly ball, ${Math.round(dist / 10)} m` : 'Caught out!', false);
          b.vy *= -.3; b.vx *= .5;
        }
        if (b.x > FENCE && b.y < GROUND - 60 && !this.res) this.result(`HOME RUN! ${Math.round((b.x - PLATE) / 10 + 8)} m`, true, b.x - PLATE + 80);
        this.cam += (Math.max(0, b.x - 400) - this.cam) * Math.min(1, dt * 4);
      }
    },
    draw(ctx, dt) {
      const cam = this.cam;
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND); sky.addColorStop(0, '#4ab0f0'); sky.addColorStop(1, '#c8ecff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 5; i++) { const x = ((i * 380 - cam * .3) % 1900 + 1900) % 1900 - 200; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x, 60 + (i % 3) * 30, 70, 20, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(-cam, 0);
      // the outfield wall and a crowd behind it
      ctx.fillStyle = '#2a6a3a'; ctx.fillRect(FENCE, GROUND - 120, 2000, 120); for (let x = FENCE; x < FENCE + 2000; x += 14) G.circle(x + 7, GROUND - 130 + Math.sin(this.t * 6 + x) * 2, 6, ['#ff5b6b', '#ffcf5c', '#fff', '#5cb8ff'][(x / 14) % 4]);
      G.text('HOME RUN', FENCE + 80, GROUND - 60, {size: 22, display: true, color: '#ffcf5c'});
      ctx.fillStyle = '#4aa848'; ctx.fillRect(-400, GROUND, FENCE + 2400, H - GROUND); ctx.fillStyle = '#c8945a'; ctx.beginPath(); ctx.ellipse(PLATE + 200, GROUND + 30, 380, 40, 0, 0, Math.PI * 2); ctx.fill();
      for (let x = 0; x < FENCE; x += 200) G.text(`${x / 10}m`, PLATE + x, GROUND + 50, {size: 11, align: 'center', weight: 800, color: 'rgba(255,255,255,.6)'});
      G.rr(MOUND - 40, GROUND - 6, 80, 12, 6, '#b07a48'); G.rr(PLATE - 14, GROUND - 3, 28, 6, 2, '#fff');
      const kid = G.img('img/kid_idle.png');
      if (kid.complete) { ctx.save(); ctx.translate(MOUND + 20, GROUND); ctx.scale(-1.2, 1.2); ctx.filter = 'hue-rotate(200deg)'; ctx.drawImage(kid, -64, -128, 128, 128); ctx.restore(); }
      if (kid.complete) { ctx.save(); ctx.translate(PLATE - 46, GROUND); ctx.scale(1.25, 1.25); ctx.drawImage(kid, -64, -128, 128, 128); ctx.restore(); }
      const ang = this.swing > 0 ? -1.6 + (1 - this.swing / .25) * 3.2 : -2.2; // bat: cocked back, then whips round
      ctx.save(); ctx.translate(PLATE - 30, 300); ctx.rotate(ang); G.rr(0, -5, 74, 10, 5, '#a86a3a'); G.rr(0, -4, 20, 8, 3, '#2a2a2a'); ctx.restore();
      const b = this.ball, img = G.img('img/baseball.png');
      if (this.windup <= 0 && img.complete && b.state !== 'done') { ctx.drawImage(img, b.x - 9, b.y - 9, 18, 18); }
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(10, 10, 260, 48, 10, 'rgba(10,20,40,.7)');
      G.text(`HOMERS ${this.hr}/${this.need}`, 24, 40, {size: 17, weight: 800, color: '#ffcf5c'}); G.text(`${10 - this.pitches} left`, 256, 40, {size: 14, align: 'right', weight: 800, color: '#fff'});
      if (this.ball.state === 'pitch' && this.windup <= 0) G.text({fast: 'FASTBALL', slow: 'CHANGEUP', curve: 'CURVEBALL'}[this.ball.kind], W - 20, 34, {size: 14, align: 'right', weight: 800, color: '#fff', shadow: true});
      if (this.res) G.text(this.res.text, W / 2, 120, {size: this.res.text.startsWith('HOME') ? 36 : 26, align: 'center', display: true, color: this.res.text.startsWith('HOME') ? '#ffcf5c' : '#fff', shadow: true});
    }
  });
})();

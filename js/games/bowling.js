(() => {
  // Bowling: stop the sliding marker to pick your spot, then the swinging arrow for your aim. Pins are Blender renders.
  const W = 520, H = 720, LANE_X = 160, LANE_W = 200, PIN_Y = 200, BR = 13, PR = 8;
  const RACK = [[0, 0], [-1, 1], [1, 1], [-2, 2], [0, 2], [2, 2], [-3, 3], [-1, 3], [1, 3], [3, 3]];

  GameBox.register({
    id: 'bowling', title: 'Bowling', genre: 'Sports', kind: 'Ten pin', w: W, h: H, levels: 30, assets: ['img/bowlball.png', 'img/pin.png'], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click to stop the ball where you want it, then click to lock the aim arrow. Knock them all down!',
    desc: 'Ten-pin bowling on a shiny lane. Click to stop the ball sliding at the line, then click again when the arrow points where you want to roll. Strikes and spares score bonus points. Each round is three frames with a target score, and later rounds add oily lanes that make the ball curve. Thirty rounds.',
    controls: [['Click / Space', 'Stop the slide, then lock the aim']],
    info() { return `Round ${G.level} · Frame ${Math.min(3, this.frame + 1)}/3 · ${this.total}/${this.need}`; },
    init() { this.frame = 0; this.roll = 0; this.total = 0; this.need = Math.min(48, 14 + G.level); this.t = 0; this.parts = []; this.done = null; this.cards = []; this.hook = G.level > 10 ? (Math.random() < .5 ? -1 : 1) * Math.min(1, (G.level - 10) * .05) : 0; this.rack(); this.ready(); },
    rack() { this.pins = RACK.map(([c, r]) => ({x: LANE_X + LANE_W / 2 + c * 19, y: PIN_Y - r * 22, vx: 0, vy: 0, down: false, fall: 0, gone: false})); },
    ready() { this.stage = 'slide'; this.ball = {x: LANE_X + LANE_W / 2, y: H - 110, vx: 0, vy: 0, rolling: false, rot: 0}; this.settle = 0; },
    click() {
      if (this.done) return;
      if (this.stage === 'slide') { this.stage = 'aim'; G.sfx('click'); return; }
      if (this.stage === 'aim') { const a = this.angle; this.ball.vx = Math.sin(a) * 560; this.ball.vy = -Math.cos(a) * 560; this.ball.rolling = true; this.stage = 'roll'; G.sfx('step', .8); }
    },
    key(k) { if (k === ' ') this.click(); }, pointer(type) { if (type === 'down') this.click(); },
    update(dt) {
      this.t += dt; for (const c of this.cards) c.t -= dt; this.cards = this.cards.filter(c => c.t > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const b = this.ball;
      if (this.stage === 'slide') b.x = LANE_X + LANE_W / 2 + Math.sin(this.t * 2.2) * (LANE_W / 2 - BR - 4);
      if (this.stage === 'aim') this.angle = Math.sin(this.t * 2.6) * .22;
      if (this.stage !== 'roll') return;
      const steps = 6; for (let s = 0; s < steps; s++) {
        const st = dt / steps;
        if (b.rolling) { b.vx += this.hook * 120 * st * (b.y < H * .55 ? 1 : 0); b.x += b.vx * st; b.y += b.vy * st; b.rot += b.vy * st / BR;
          if (b.x < LANE_X + BR || b.x > LANE_X + LANE_W - BR) { b.x = Math.max(LANE_X + BR - 6, Math.min(LANE_X + LANE_W - BR + 6, b.x)); b.vx = 0; b.vy *= .98; b.gutter = true; }
          if (b.y < PIN_Y - 110) b.rolling = false; }
        for (const p of this.pins) {
          if (p.gone) continue;
          if (b.rolling && !b.gutter) { const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy); if (d < BR + PR) { const nx = dx / d, ny = dy / d, rel = b.vx * nx + b.vy * ny; if (rel > 0) { p.vx += nx * rel * 1.5; p.vy += ny * rel * 1.5; b.vx -= nx * rel * .25; b.vy -= ny * rel * .25; p.down = true; G.sfx('crunch', .5); } } }
          p.x += p.vx * st; p.y += p.vy * st; p.vx *= Math.pow(.3, st); p.vy *= Math.pow(.3, st);
          if (p.down) p.fall = Math.min(1, p.fall + st * 4);
          if (p.x < LANE_X - 10 || p.x > LANE_X + LANE_W + 10 || p.y < PIN_Y - 100) p.gone = true;
        }
        for (let i = 0; i < this.pins.length; i++) for (let j = i + 1; j < this.pins.length; j++) {
          const a = this.pins[i], c = this.pins[j]; if (a.gone || c.gone) continue; const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
          if (d < PR * 2 && d > 0) { const nx = dx / d, ny = dy / d, rel = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny; if (rel > 0) { a.vx -= nx * rel * .9; a.vy -= ny * rel * .9; c.vx += nx * rel * .9; c.vy += ny * rel * .9; if (rel > 25) { a.down = true; c.down = true; } } const o = (PR * 2 - d) / 2; a.x -= nx * o; a.y -= ny * o; c.x += nx * o; c.y += ny * o; }
        }
      }
      const moving = this.pins.some(p => !p.gone && Math.hypot(p.vx, p.vy) > 6);
      if (!b.rolling && !moving && (this.settle += dt) > .7) this.scoreRoll();
    },
    scoreRoll() {
      const downNow = this.pins.filter(p => p.down || p.gone).length, before = this.roll === 0 ? 0 : this.firstDown;
      const got = downNow - before; let bonus = 0, label = `${got}`;
      if (this.roll === 0 && downNow === 10) { bonus = 10; label = 'STRIKE!'; G.party(80); G.sfx('win'); }
      else if (this.roll === 1 && downNow === 10) { bonus = 5; label = 'SPARE!'; G.sfx('coin'); }
      else if (got === 0) label = this.ball.gutter ? 'Gutter ball' : 'Missed!';
      this.total += got + bonus; G.score += (got + bonus) * 20; this.cards.push({text: label, t: 1.6});
      if (this.roll === 0 && downNow < 10) { this.roll = 1; this.firstDown = downNow; for (const p of this.pins) if (p.down) p.gone = true; this.ready(); return; }
      this.frame++; this.roll = 0; this.rack(); this.ready();
      if (this.frame >= 3) { const ok = this.total >= this.need; this.done = {t: 1.4, go: () => ok ? G.win(this.total >= this.need + 10 ? 3 : this.total >= this.need + 4 ? 2 : 1, `${this.total} points!`) : G.end(`${this.total} of ${this.need} points`)}; }
    },
    draw(ctx, dt) {
      ctx.fillStyle = '#1a1424'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 8; i++) { ctx.fillStyle = `hsla(${280 + i * 10},60%,50%,.12)`; ctx.fillRect(0, i * 90, W, 45); }
      // lane with boards, arrows and gutters
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(LANE_X - 24, 40, LANE_W + 48, H - 40);
      const g = ctx.createLinearGradient(0, 40, 0, H); g.addColorStop(0, '#d8a868'); g.addColorStop(1, '#f0c890'); ctx.fillStyle = g; ctx.fillRect(LANE_X, 40, LANE_W, H - 40);
      ctx.fillStyle = 'rgba(120,70,30,.15)'; for (let x = LANE_X; x < LANE_X + LANE_W; x += 10) ctx.fillRect(x, 40, 1, H - 40);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(LANE_X, 260, LANE_W, 140);
      for (let i = 0; i < 7; i++) { const x = LANE_X + 18 + i * (LANE_W - 36) / 6, y = 420 + Math.abs(3 - i) * 10; ctx.fillStyle = '#6a3a1a'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x - 5, y + 4); ctx.lineTo(x + 5, y + 4); ctx.fill(); }
      ctx.fillStyle = '#e84a4a'; ctx.fillRect(LANE_X, H - 140, LANE_W, 3);
      if (this.hook) G.text(this.hook > 0 ? 'OILY LANE →' : '← OILY LANE', W / 2, 300, {size: 12, align: 'center', weight: 800, color: 'rgba(90,50,20,.6)'});
      // pins (fallen ones lie on their side), then the ball
      const pinImg = G.img('img/pin.png');
      for (const p of this.pins.slice().sort((a, c) => a.y - c.y)) { if (p.gone || !pinImg.complete) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.fall * (p.vx >= 0 ? 1.4 : -1.4)); ctx.globalAlpha = p.down && p.fall >= 1 ? .7 : 1; ctx.drawImage(pinImg, -12, -40, 24, 48); ctx.restore(); }
      const b = this.ball, bi = G.img('img/bowlball.png');
      if (this.stage === 'aim') { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(this.angle); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-2, -120, 4, 90); ctx.beginPath(); ctx.moveTo(0, -136); ctx.lineTo(-10, -116); ctx.lineTo(10, -116); ctx.fill(); ctx.restore(); }
      if (bi.complete) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.drawImage(bi, -BR - 2, -BR - 2, BR * 2 + 4, BR * 2 + 4); ctx.restore(); }
      // score card
      G.panel(10, 10, W - 20, 50, 10, 'rgba(255,255,255,.92)');
      G.text(`ROUND ${G.level}`, 24, 42, {size: 14, weight: 800, color: '#2a2440'}); G.text(`FRAME ${Math.min(3, this.frame + 1)}/3`, W / 2, 42, {size: 14, align: 'center', weight: 800, color: '#2a2440'});
      G.text(`${this.total} / ${this.need}`, W - 24, 42, {size: 18, align: 'right', weight: 800, color: this.total >= this.need ? '#2a8a3a' : '#2a2440'});
      for (const c of this.cards) G.text(c.text, W / 2, H / 2, {size: 40, align: 'center', display: true, color: c.text === 'STRIKE!' ? '#ffcf5c' : c.text === 'SPARE!' ? '#7ee08a' : '#fff', shadow: true});
      if (this.stage === 'slide') G.text('Click to stop the ball', W / 2, H - 40, {size: 16, align: 'center', weight: 800, color: '#fff'});
      if (this.stage === 'aim') G.text('Click to roll!', W / 2, H - 40, {size: 16, align: 'center', weight: 800, color: '#fff'});
      G.fx(this.parts, dt);
    }
  });
})();

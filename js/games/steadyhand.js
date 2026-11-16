(() => {
  // Guide the ring along the wiggly wire with your mouse without touching it.
  const W = 800, H = 500;

  function wire(n) {
    const R = G.seeded(n * 61 + 13), pts = [], amp = 40 + Math.min(150, n * 4), freq = 1 + Math.min(4, n * .12);
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, x = 60 + t * (W - 120);
      const y = H / 2 + Math.sin(t * Math.PI * 2 * freq + n) * amp * .6 + Math.sin(t * Math.PI * 2 * freq * 2.3 + n * 2) * amp * .3 + (R() - .5) * Math.min(10, n * .3);
      pts.push([x, y]);
    }
    return pts;
  }

  GameBox.register({
    id: 'steadyhand', title: 'Steady Hand', genre: 'Skill', kind: 'Buzz wire', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'none',
    hint: 'Click the ring at the start, then move it along the wire to the end without touching!',
    desc: 'The classic buzz-wire test. Pick up the ring at the green post and slide it along the twisting wire to the red post. Touch the wire and it buzzes. Three buzzes and you start over. Later wires get wigglier, the ring gets smaller, and some sections even move. Fifty wires for the steadiest hands.',
    controls: [['Click the start post', 'Pick up the ring'], ['Mouse', 'Move the ring']],
    info() { return `Wire ${G.level} · Buzzes ${this.buzz}/3`; },
    init() { this.base = wire(G.level); this.pts = this.base.map(p => p.slice()); this.held = false; this.prog = 0; this.buzz = 0; this.cool = 0; this.t = 0; this.done = null; this.parts = []; this.gap = Math.max(11, 26 - G.level * .3); this.time = 0; },
    pointer(type, x, y) { if (type === 'down' && !this.held && !this.done && Math.hypot(x - this.pts[0][0], y - this.pts[0][1]) < 40) { this.held = true; this.prog = 0; G.sfx('select'); } },
    update(dt) {
      this.t += dt; this.cool -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const n = G.level;
      if (n > 15) this.pts.forEach((p, i) => { p[1] = this.base[i][1] + Math.sin(this.t * 1.5 + i * .1) * Math.min(25, (n - 15)) * (i > 20 && i < 100 ? 1 : 0); });
      if (!this.held) return;
      this.time += dt;
      const mx = G.pointer.x, my = G.pointer.y;
      // nearest point on the wire, only allowed to move forward a little at a time
      let best = 1e9, bi = this.prog;
      for (let i = Math.max(0, this.prog - 3); i <= Math.min(this.pts.length - 1, this.prog + 6); i++) { const d = Math.hypot(this.pts[i][0] - mx, this.pts[i][1] - my); if (d < best) { best = d; bi = i; } }
      this.prog = Math.max(this.prog, bi); this.dist = best;
      if (best > this.gap && this.cool <= 0) {
        this.buzz++; this.cool = .6; G.sfx('hurt'); G.note(110, .3, {type: 'sawtooth', vol: .08}); G.shake(5, .2);
        for (let i = 0; i < 12; i++) this.parts.push({x: mx, y: my, vx: (Math.random() - .5) * 300, vy: (Math.random() - .5) * 300, life: .4, color: '#ffe08a'});
        if (this.buzz >= 3) { this.held = false; this.done = {t: 1, go: () => G.end('Bzzzt! Too many buzzes')}; }
      }
      if (this.prog >= this.pts.length - 2) { G.score += 600 + G.level * 30 - this.buzz * 100 + Math.max(0, 300 - Math.round(this.time * 10)); G.party(); this.done = {t: 1, go: () => G.win(this.buzz === 0 ? 3 : this.buzz === 1 ? 2 : 1, 'Steady!')}; }
    },
    draw(ctx, dt) {
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1a2a3a'); bg.addColorStop(1, '#2a3a4a'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      G.rr(30, 60, W - 60, H - 100, 20, '#3a2a1a'); G.rr(40, 70, W - 80, H - 120, 16, '#4a3624');
      const p = this.pts;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 8; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x + 3, y + 5) : ctx.moveTo(x + 3, y + 5)); ctx.stroke();
      ctx.strokeStyle = this.cool > 0 ? '#ff8b6b' : '#e8c070'; ctx.lineWidth = 6; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x - 1, y - 2) : ctx.moveTo(x - 1, y - 2)); ctx.stroke();
      if (this.held) { ctx.strokeStyle = 'rgba(94,230,138,.5)'; ctx.lineWidth = 6; ctx.beginPath(); p.slice(0, this.prog + 1).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      G.rr(p[0][0] - 10, p[0][1] - 10, 20, H - 60 - p[0][1], 4, '#3fc060'); G.rr(p.at(-1)[0] - 10, p.at(-1)[1] - 10, 20, H - 60 - p.at(-1)[1], 4, '#e84a4a');
      // the ring: an ellipse around the wire held by a handle
      const rx = this.held ? G.pointer.x : p[0][0], ry = this.held ? G.pointer.y : p[0][1], r = this.gap;
      ctx.strokeStyle = '#cfd8e8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(rx, ry, r * .55, r, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#3a6ad8'; ctx.fillRect(rx - 5, ry + r, 10, 50);
      if (!this.held && !this.done) G.text('Click the ring to pick it up', W / 2, 40, {size: 18, align: 'center', weight: 800, color: '#fff'});
      for (let i = 0; i < 3; i++) G.circle(W - 40 - i * 24, 30, 8, i < this.buzz ? '#ff5b5b' : 'rgba(255,255,255,.2)');
      G.text(`WIRE ${G.level}`, 30, 36, {size: 15, weight: 800, color: '#cfd8e8'});
      for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; G.circle(q.x, q.y, 2, `rgba(255,224,138,${Math.max(0, q.life * 2)})`); } this.parts = this.parts.filter(q => q.life > 0);
      if (!this.held || this.done) return;
      G.rr(W / 2 - 100, H - 26, 200, 8, 4, 'rgba(255,255,255,.2)'); G.rr(W / 2 - 100, H - 26, 200 * this.prog / (p.length - 1), 8, 4, '#3fc060');
    }
  });
})();

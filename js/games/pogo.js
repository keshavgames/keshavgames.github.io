(() => {
  // Bounce upward on a pogo stick from platform to platform. Springs launch you, crumbly platforms break, and the screen wraps sideways.
  const W = 480, H = 720, PW = 70;

  GameBox.register({
    id: 'pogo', title: 'Pogo Jump', genre: 'Arcade', kind: 'Endless jumper', w: W, h: H, levels: 30, assets: ['img/kid_jump.png', 'img/kid_idle.png'], thumb: 'jpg',
    hint: 'Steer left and right with the arrows or the mouse. You bounce by yourself. Climb to the flag!',
    desc: 'Bounce up and up on a pogo stick. You hop automatically: just steer left and right to land on the next platform. Green ones are solid, blue ones slide, brown ones crumble after one bounce and springs send you flying. Go off one side and you come back on the other. Reach the flag height to win. Thirty levels that get gappier and trickier.',
    controls: [['Left Right / A D', 'Steer'], ['Mouse', 'Steer toward the pointer']],
    info() { return `Level ${G.level} · ${Math.floor(this.height / 10)} m / ${this.goal / 10} m`; },
    init() {
      const n = G.level, R = G.seeded(n * 11 + 5); this.R = R; this.goal = 3000 + n * 300;
      this.plats = [{x: 0, y: H - 60, k: 'solid', ground: true}]; let y = H - 60;
      while (y > -this.goal - 400) { y -= 70 + R() * Math.min(70, 20 + n * 2.5); const r = R(), k = r < Math.min(.25, n * .012) ? 'crumble' : r < Math.min(.45, .1 + n * .015) ? 'slide' : 'solid'; this.plats.push({x: R() * (W - PW), y, k, spring: R() < .08, vx: k === 'slide' ? (R() < .5 ? -1 : 1) * (40 + n * 3) : 0}); }
      this.p = {x: W / 2, y: H - 61, vy: -720, face: 1}; this.cam = 0; this.height = 0; this.t = 0; this.done = null; this.parts = []; this.stars = 0;
      this.gems = this.plats.filter((_, i) => i % 7 === 3).map(pl => ({x: pl.x + PW / 2, y: pl.y - 50, got: false}));
    },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const p = this.p, mouse = performance.now() - G.pointer.used < 1500;
      let steer = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a'); if (!steer && mouse) steer = Math.max(-1, Math.min(1, (G.pointer.x - p.x) / 60));
      p.x += steer * 340 * dt; if (steer) p.face = Math.sign(steer); if (p.x < -20) p.x += W + 40; if (p.x > W + 20) p.x -= W + 40;
      const oy = p.y; p.vy += 1350 * dt; p.y += p.vy * dt;
      for (const pl of this.plats) {
        if (pl.k === 'slide') { pl.x += pl.vx * dt; if (pl.x < 0 || pl.x > W - PW) pl.vx *= -1; }
        if (pl.gone) { pl.y += 300 * dt; continue; }
        if (p.vy > 0 && oy <= pl.y && p.y >= pl.y && (pl.ground || (p.x > pl.x - 10 && p.x < pl.x + PW + 10))) {
          p.y = pl.y; p.vy = pl.spring && Math.abs(p.x - (pl.x + PW / 2)) < 22 ? -1250 : -720; G.sfx(pl.spring ? 'power' : 'jump', .5);
          if (pl.k === 'crumble') { pl.gone = true; G.sfx('crunch', .5); }
          for (let i = 0; i < 5; i++) this.parts.push({x: p.x, y: pl.y, vx: (Math.random() - .5) * 120, vy: -Math.random() * 60, life: .4, color: '#fff'});
        }
      }
      for (const g of this.gems) if (!g.got && Math.hypot(g.x - p.x, g.y - p.y + 30) < 26) { g.got = true; this.stars++; G.score += 50; G.sfx('coin'); }
      this.height = Math.max(this.height, H - 100 - p.y); this.cam = Math.min(this.cam, p.y - H * .45);
      if (this.height >= this.goal) { G.party(); G.score += 500 + G.level * 40; this.done = {t: 1, go: () => G.win(this.stars >= 6 ? 3 : this.stars >= 3 ? 2 : 1, 'You reached the flag!')}; }
      if (p.y - this.cam > H + 60) this.done = {t: .6, go: () => G.end(`Fell at ${Math.floor(this.height / 10)} m`)};
      G.score = Math.max(G.score, Math.floor(this.height / 10));
    },
    draw(ctx, dt) {
      const k = Math.min(1, this.height / this.goal), g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `hsl(${200 + k * 60},60%,${70 - k * 35}%)`); g.addColorStop(1, `hsl(${190 + k * 40},55%,${85 - k * 30}%)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (k > .6) for (let i = 0; i < 30; i++) G.circle((i * 97) % W, (i * 53 - this.cam * .05) % H, 1.5, `rgba(255,255,255,${(k - .6) * 2})`);
      for (let i = 0; i < 6; i++) { const y = ((i * 150 - this.cam * .3) % (H + 100)) - 50; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.beginPath(); ctx.ellipse((i * 173) % W, y, 50, 14, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.save(); ctx.translate(0, -this.cam);
      const fy = H - 100 - this.goal; ctx.fillStyle = '#ddd'; ctx.fillRect(W / 2 - 2, fy - 60, 4, 60); ctx.fillStyle = '#ff4b4b'; ctx.fillRect(W / 2 + 2, fy - 60, 40, 26); G.rr(0, fy, W, 10, 4, '#ffcf5c');
      for (const pl of this.plats) { const y = pl.y; if (y - this.cam < -20 || y - this.cam > H + 20) continue; const col = {solid: '#5ec85a', slide: '#5cb8ff', crumble: '#b8875a'}[pl.k]; G.rr(pl.x + 3, y + 4, PW, 12, 6, 'rgba(0,0,0,.2)'); G.rr(pl.x, y, pl.ground ? W : PW, 12, 6, pl.gone ? 'rgba(184,135,90,.5)' : col); G.rr(pl.x + 4, y + 2, PW - 8, 3, 2, 'rgba(255,255,255,.4)'); if (pl.k === 'crumble' && !pl.gone) { ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.moveTo(pl.x + 20, y); ctx.lineTo(pl.x + 26, y + 12); ctx.moveTo(pl.x + 48, y); ctx.lineTo(pl.x + 42, y + 12); ctx.stroke(); }
        if (pl.spring && !pl.gone) { ctx.strokeStyle = '#c8ccd8'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(pl.x + PW / 2 - 8, y - i * 4); ctx.lineTo(pl.x + PW / 2 + 8, y - i * 4 - 2); } ctx.stroke(); G.rr(pl.x + PW / 2 - 12, y - 18, 24, 5, 2, '#ff5b5b'); } }
      for (const gm of this.gems) if (!gm.got) G.star(gm.x, gm.y + Math.sin(this.t * 4 + gm.x) * 4, 12, '#ffcf5c');
      const p = this.p, img = G.img(p.vy < 0 ? 'img/kid_jump.png' : 'img/kid_idle.png'), squash = p.vy < -600 ? 1.08 : 1;
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 30); ctx.stroke(); G.rr(p.x - 14, p.y - 30, 28, 5, 2, '#e84a4a');
      if (img.complete) { ctx.save(); ctx.translate(p.x, p.y - 22); ctx.scale(p.face * .62, .62 * squash); ctx.drawImage(img, -64, -128, 128, 128); ctx.restore(); }
      G.fx(this.parts, 0); ctx.restore();
      G.rr(W - 22, 60, 10, H - 120, 5, 'rgba(255,255,255,.35)'); G.rr(W - 22, 60 + (H - 120) * (1 - k), 10, (H - 120) * k, 5, '#ffcf5c');
      G.text(`${Math.floor(this.height / 10)} m`, 16, 38, {size: 24, weight: 800, color: '#fff', shadow: true}); G.text(`★ ${this.stars}`, 16, 64, {size: 16, weight: 800, color: '#ffcf5c', shadow: true});
    }
  });
})();

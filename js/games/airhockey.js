(() => {
  // Air hockey: your mallet follows the mouse (or keys). First to 7 goals. Puck and mallets are Blender renders.
  const W = 480, H = 720, PR = 18, MR = 30, GOAL = 150, M = 24;

  GameBox.register({
    id: 'airhockey', title: 'Air Hockey', genre: 'Sports', kind: 'Air hockey', w: W, h: H, levels: 20, modes: ['bot', 'local'], assets: ['img/puck.png', 'img/mallet_blue.png', 'img/mallet_red.png'], thumb: 'jpg', cursor: 'none',
    hint: 'Move your mallet with the mouse and smack the puck into the top goal! First to 7.',
    desc: 'A glowing air hockey table. Slide your mallet with the mouse to smash the puck past the robot into its goal, and guard yours at the bottom. The puck bounces off the rails and speeds up with every hit. First to seven wins. Twenty robots that get faster, or play a friend: one on WASD, one on the arrows.',
    controls: [['Mouse', 'Move your mallet (vs robot)'], ['WASD', 'Player 1 (two players)'], ['Arrows', 'Player 2 (two players)']],
    info() { return `Match ${G.level} · ${this.s[0]} - ${this.s[1]}`; },
    init() { this.clock = 150; this.s = [0, 0]; this.parts = []; this.done = null; this.t = 0; this.me = {x: W / 2, y: H - 100, vx: 0, vy: 0}; this.op = {x: W / 2, y: 100, vx: 0, vy: 0}; this.serve(1); },
    serve(toward) { this.puck = {x: W / 2, y: H / 2 + toward * 60, vx: (Math.random() - .5) * 60, vy: 0}; this.pause = .8; },
    moveMallet(m, tx, ty, dt, top) {
      const minY = top ? M + MR : H / 2 + MR, maxY = top ? H / 2 - MR : H - M - MR;
      tx = Math.max(M + MR, Math.min(W - M - MR, tx)); ty = Math.max(minY, Math.min(maxY, ty));
      const nx = m.x + (tx - m.x) * Math.min(1, dt * 18), ny = m.y + (ty - m.y) * Math.min(1, dt * 18);
      m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
    },
    keysMallet(m, up, down, left, right, dt, top) { const sp = 520; this.moveMallet(m, m.x + (G.held(right) - G.held(left)) * sp * dt * 3, m.y + (G.held(down) - G.held(up)) * sp * dt * 3, dt, top); },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const duel = G.mode === 'local', pk = this.puck;
      if (duel) { this.keysMallet(this.me, 'w', 's', 'a', 'd', dt, false); this.keysMallet(this.op, 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', dt, true); }
      else {
        this.moveMallet(this.me, G.pointer.x, G.pointer.y, dt, false);
        // the robot tracks the puck, attacks it when it is on its side, guards the goal otherwise
        const skill = Math.min(1, .35 + G.level * .035), op = this.op;
        let tx = pk.x + (Math.random() - .5) * (1 - skill) * 60, ty = pk.y < H / 2 ? pk.y - 20 : 90;
        if (pk.y < H / 2 && pk.vy > 150) ty = 70;
        const nx = op.x + Math.max(-1, Math.min(1, tx - op.x)) * Math.min(Math.abs(tx - op.x), (260 + skill * 420) * dt), ny = op.y + Math.max(-1, Math.min(1, ty - op.y)) * Math.min(Math.abs(ty - op.y), (220 + skill * 380) * dt);
        this.moveMallet(op, nx, ny, dt * 3, true);
      }
      this.clock -= dt;
      if (this.clock <= 0 && this.s[0] !== this.s[1]) return this.finish(this.s[0] > this.s[1] ? 0 : 1);
      if (this.pause > 0) { this.pause -= dt; return; }
      if (Math.hypot(pk.vx, pk.vy) < 40) { if ((this.stall = (this.stall || 0) + dt) > 3) { this.stall = 0; this.serve(pk.y < H / 2 ? -1 : 1); this.msg = 'Re-serve!'; return; } } else this.stall = 0; // a pinned or stopped puck gets re-served
      const steps = 4; for (let s = 0; s < steps; s++) {
        const st = dt / steps; pk.x += pk.vx * st; pk.y += pk.vy * st; pk.vx *= Math.pow(.92, st); pk.vy *= Math.pow(.92, st);
        if (pk.x < M + PR) { pk.x = M + PR; pk.vx = Math.abs(pk.vx); G.sfx('click', .4); } if (pk.x > W - M - PR) { pk.x = W - M - PR; pk.vx = -Math.abs(pk.vx); G.sfx('click', .4); }
        const inGoal = Math.abs(pk.x - W / 2) < GOAL / 2;
        if (pk.y < M + PR && !inGoal) { pk.y = M + PR; pk.vy = Math.abs(pk.vy); G.sfx('click', .4); } if (pk.y > H - M - PR && !inGoal) { pk.y = H - M - PR; pk.vy = -Math.abs(pk.vy); G.sfx('click', .4); }
        if (pk.y < -PR) return this.goal(0); if (pk.y > H + PR) return this.goal(1);
        for (const m of [this.me, this.op]) {
          const dx = pk.x - m.x, dy = pk.y - m.y, d = Math.hypot(dx, dy);
          if (d < PR + MR && d > 0) { const nx = dx / d, ny = dy / d; pk.x = m.x + nx * (PR + MR); pk.y = m.y + ny * (PR + MR); const rel = (pk.vx - m.vx) * nx + (pk.vy - m.vy) * ny; if (rel < 0) { pk.vx -= 1.9 * rel * nx; pk.vy -= 1.9 * rel * ny; G.sfx('hit', .5); this.parts.push({x: pk.x, y: pk.y, vx: 0, vy: 0, life: .2, color: '#fff'}); }
            const sp = Math.hypot(pk.vx, pk.vy); if (sp > 1300) { pk.vx *= 1300 / sp; pk.vy *= 1300 / sp; } }
        }
      }
    },
    goal(who) {
      this.s[who]++; G.sfx(who === 0 ? 'coin' : 'hurt'); G.shake(6, .3); for (let i = 0; i < 30; i++) this.parts.push({x: W / 2, y: who === 0 ? 20 : H - 20, vx: (Math.random() - .5) * 400, vy: (who === 0 ? 1 : -1) * Math.random() * 300, life: .8, color: who === 0 ? '#5cb8ff' : '#ff5b6b'});
      if (who === 0) G.score += 100;
      if (this.s[who] >= 7 || this.clock <= 0) return this.finish(who);
      this.serve(who === 0 ? -1 : 1);
    },
    finish(who) {
      {
        const me = who === 0;
        if (G.mode === 'local') this.done = {t: 1, go: () => G.end(me ? 'Player 1 (blue) wins!' : 'Player 2 (red) wins!')};
        else if (me) { G.party(); G.score += 500 + G.level * 40; this.done = {t: 1, go: () => G.win(this.s[1] <= 2 ? 3 : this.s[1] <= 4 ? 2 : 1, `${this.s[0]} - ${this.s[1]}`)}; }
        else this.done = {t: 1, go: () => G.end(`The robot won ${this.s[1]} - ${this.s[0]}`)};
      }
    },
    draw(ctx, dt) {
      ctx.fillStyle = '#0c1424'; ctx.fillRect(0, 0, W, H);
      G.rr(M - 10, M - 10, W - 2 * M + 20, H - 2 * M + 20, 30, '#2a3448'); G.rr(M, M, W - 2 * M, H - 2 * M, 22, '#dfeefc');
      ctx.fillStyle = 'rgba(80,120,180,.12)'; for (let y = M + 12; y < H - M; y += 22) for (let x = M + 12; x < W - M; x += 22) ctx.fillRect(x, y, 2, 2);
      ctx.strokeStyle = 'rgba(255,90,110,.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(M, H / 2); ctx.lineTo(W - M, H / 2); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,150,255,.5)'; for (const y of [M, H - M]) { ctx.beginPath(); ctx.arc(W / 2, y, 90, y === M ? 0 : Math.PI, y === M ? Math.PI : Math.PI * 2); ctx.stroke(); }
      G.rr(W / 2 - GOAL / 2, 0, GOAL, M + 4, 6, '#ff5b6b'); G.rr(W / 2 - GOAL / 2, H - M - 4, GOAL, M + 4, 6, '#5cb8ff');
      const draw = (src, x, y, r) => { const img = G.img(src); G.circle(x + 4, y + 6, r, 'rgba(0,0,0,.25)'); if (img.complete) ctx.drawImage(img, x - r, y - r, r * 2, r * 2); };
      draw('img/puck.png', this.puck.x, this.puck.y, PR); draw('img/mallet_blue.png', this.me.x, this.me.y, MR); draw('img/mallet_red.png', this.op.x, this.op.y, MR);
      for (const p of this.parts) G.circle(p.x, p.y, 3, p.color);
      G.text(String(this.s[1]), W - 52, H / 2 - 24, {size: 36, align: 'center', display: true, color: '#ff5b6b'}); G.text(String(this.s[0]), W - 52, H / 2 + 54, {size: 36, align: 'center', display: true, color: '#3a8aff'});
      G.text(this.clock > 0 ? `${Math.floor(this.clock / 60)}:${String(Math.floor(this.clock % 60)).padStart(2, '0')}` : 'GOLDEN GOAL', 52, H / 2 + 14, {size: 14, align: 'center', weight: 800, color: '#2a3448'});
      if (this.pause > 0 && this.s[0] + this.s[1] === 0) G.text('First to 7!', W / 2, H / 2 + 120, {size: 22, align: 'center', display: true, color: '#2a3448'});
    }
  });
})();

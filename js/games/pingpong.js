(() => {
  // Side-view table tennis: move your bat up and down; where the ball hits the bat decides the shot.
  const W = 800, H = 480, TABLE_Y = 330, TL = 120, TR = 680, NET = 400, BR = 7;

  GameBox.register({
    id: 'pingpong', title: 'Table Tennis', genre: 'Sports', kind: 'Table tennis', w: W, h: H, levels: 20, modes: ['bot', 'local'], assets: [], thumb: 'jpg', cursor: 'none',
    hint: 'Move your bat up and down with the mouse or W/S. The ball must bounce once on their side!',
    desc: 'Fast table tennis from the side. Slide your bat up and down to meet the ball: hit it with the top of the bat for a smash, the middle for a safe return, the bottom for a high lob. It has to bounce on the other side of the net. First to seven points. Twenty bots that get sneakier, or play a friend on W/S and the arrow keys.',
    controls: [['Mouse / W S', 'Move your bat (left side)'], ['Up Down', 'Player 2 bat (two players)']],
    info() { return `Match ${G.level} · ${this.s[0]} - ${this.s[1]}`; },
    init() { this.s = [0, 0]; this.bats = [{x: TL - 40, y: 280, vy: 0}, {x: TR + 40, y: 280, vy: 0}]; this.t = 0; this.parts = []; this.done = null; this.server = 0; this.serve(); },
    serve() { const s = this.server; this.ball = {x: s ? TR - 20 : TL + 20, y: 220, vx: s ? -420 : 420, vy: -200, last: s, bounced: false, side: s}; this.pause = .8; },
    point(who, why) {
      this.s[who]++; this.msg = why; this.msgT = 1.2; G.sfx(who === 0 ? 'coin' : 'hurt', .7); if (who === 0) G.score += 80;
      this.server = 1 - this.server;
      if (this.s[who] >= 7 && this.s[who] - this.s[1 - who] >= 2 || this.s[who] >= 9) {
        const me = who === 0;
        if (G.mode === 'local') this.done = {t: 1, go: () => G.end(me ? 'Left player wins!' : 'Right player wins!')};
        else if (me) { G.party(); G.score += 400 + G.level * 40; this.done = {t: 1, go: () => G.win(this.s[1] <= 2 ? 3 : this.s[1] <= 4 ? 2 : 1, `${this.s[0]} - ${this.s[1]}`)}; }
        else this.done = {t: 1, go: () => G.end(`Bot wins ${this.s[1]} - ${this.s[0]}`)};
        return;
      }
      this.serve();
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const [L, Rb] = this.bats, b = this.ball, duel = G.mode === 'local';
      const move = (bat, ty, sp) => { const ny = bat.y + Math.max(-sp * dt, Math.min(sp * dt, ty - bat.y)); bat.vy = (ny - bat.y) / dt; bat.y = Math.max(140, Math.min(TABLE_Y + 40, ny)); };
      if (duel) { move(L, L.y + (G.held('s') - G.held('w')) * 900, 520); move(Rb, Rb.y + (G.held('ArrowDown') - G.held('ArrowUp')) * 900, 520); }
      else {
        if (performance.now() - G.pointer.used < 2000) move(L, G.pointer.y, 900); else move(L, L.y + (G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp')) * 900, 520);
        // the bot predicts where the ball will be when it reaches its bat
        const skill = Math.min(1, .4 + G.level * .03); let ty = 280;
        if (b.vx > 0) { let px = b.x, py = b.y, vx = b.vx, vy = b.vy; for (let i = 0; i < 200 && px < Rb.x; i++) { vy += 700 / 60; px += vx / 60; py += vy / 60; if (py > TABLE_Y - BR && px > TL && px < TR && vy > 0) vy = -vy * .85; } ty = py + (1 - skill) * Math.sin(this.t * 3 + b.x * .01) * 85; }
        move(Rb, ty, 150 + skill * 450);
      }
      if (this.pause > 0) { this.pause -= dt; return; }
      const steps = 3; for (let s = 0; s < steps; s++) {
        const st = dt / steps; b.vy += 700 * st; b.x += b.vx * st; b.y += b.vy * st;
        if (b.y > TABLE_Y - BR && b.vy > 0 && b.x > TL && b.x < TR) { // bounce on the table
          const side = b.x < NET ? 0 : 1; b.y = TABLE_Y - BR; b.vy = -b.vy * .85; G.sfx('click', .6);
          if (side === b.last) { return this.point(1 - side, side === 0 ? 'Bounced on your own side!' : 'Bounced on their side twice!'); }
          if (b.bounced) return this.point(b.last, 'Point!');
          b.bounced = true;
        }
        if (Math.abs(b.x - NET) < 4 && b.y > TABLE_Y - 40) { return this.point(1 - b.last, 'Into the net!'); }
        for (const [i, bat] of [[0, L], [1, Rb]]) {
          const hitX = i === 0 ? b.x < bat.x + 10 && b.x > bat.x - 12 && b.vx < 0 : b.x > bat.x - 10 && b.x < bat.x + 12 && b.vx > 0;
          if (hitX && Math.abs(b.y - bat.y) < 36) {
            if (!b.bounced && b.last !== i) return this.point(i, 'Volley! Let it bounce first');
            const off = (b.y - bat.y) / 36; // -1 top of the bat, +1 bottom
            const speed = 330 + G.level * (i === 1 && !duel ? 6 : 0) - off * 120 + Math.abs(bat.vy) * .15;
            b.vx = (i === 0 ? 1 : -1) * speed; b.vy = -160 + off * 120 - (off < -.4 ? -140 : 0); b.last = i; b.bounced = false; G.sfx('hit', .6);
            for (let k = 0; k < 6; k++) this.parts.push({x: b.x, y: b.y, vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 120, life: .3, color: '#fff'});
          }
        }
        if (b.y > H + 20 || b.x < -30 || b.x > W + 30) return this.point(b.bounced ? b.last : 1 - b.last, b.bounced ? 'Point!' : 'Out!');
      }
    },
    draw(ctx, dt) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#2a3a5a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 30, H);
      ctx.fillStyle = '#1e5aa8'; ctx.fillRect(TL, TABLE_Y, TR - TL, 14); ctx.fillStyle = '#fff'; ctx.fillRect(TL, TABLE_Y, TR - TL, 3); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(TL + 30, TABLE_Y + 14, 10, 110); ctx.fillRect(TR - 40, TABLE_Y + 14, 10, 110);
      ctx.fillStyle = '#ddd'; ctx.fillRect(NET - 2, TABLE_Y - 32, 4, 32); ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let y = TABLE_Y - 30; y < TABLE_Y; y += 6) ctx.fillRect(NET - 2, y, 4, 2);
      const b = this.ball;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; if (b.x > TL && b.x < TR) { ctx.beginPath(); ctx.ellipse(b.x, TABLE_Y + 1, BR * Math.max(.3, 1 - (TABLE_Y - b.y) / 300), 3, 0, 0, Math.PI * 2); ctx.fill(); }
      G.circle(b.x, b.y, BR, '#ffffff'); G.circle(b.x - 2, b.y - 2, 2.5, '#f8e8c8');
      for (const [i, bat] of this.bats.entries()) { ctx.save(); ctx.translate(bat.x, bat.y); G.rr(-6, -36, 12, 72, 6, i ? '#e84a4a' : '#3a8aff'); G.rr(-3, 30, 6, 30, 3, '#8a5a2a'); ctx.restore(); }
      for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; G.circle(p.x, p.y, 2, `rgba(255,255,255,${p.life * 3})`); } this.parts = this.parts.filter(p => p.life > 0);
      G.text(String(this.s[0]), W / 2 - 70, 70, {size: 54, align: 'center', display: true, color: '#5cb8ff'}); G.text(String(this.s[1]), W / 2 + 70, 70, {size: 54, align: 'center', display: true, color: '#ff6b6b'});
      G.text('FIRST TO 7', W / 2, 30, {size: 12, align: 'center', weight: 800, color: '#cfd4ff'});
      if (this.msgT > 0) G.text(this.msg, W / 2, 140, {size: 22, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

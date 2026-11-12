(() => {
  const W = 640, H = 420, L = 40, R = 600, T = 40, B = 380, GT = 160, GB = 260, MY = 210, BR = 7;
  const TEAM = ['#3d6fd9', '#e04e5f'];

  GameBox.register({
    id: 'soccer', title: 'Turbo Kickoff', genre: 'Sports', kind: '2v2 soccer', w: W, h: H,
    desc: 'Fast two-on-two football against a CPU team in a two-minute match. Dribble past defenders, pass to your teammate and aim shots into the corners with your movement keys. Run into the ball carrier to steal it. Goals score big, and a win adds a bonus.',
    controls: [['W A S D / Arrows', 'Run'], ['J / Space', 'Shoot (hold up or down to aim high or low)'], ['K', 'Pass to your teammate'], ['Shift', 'Sprint'], ['Q', 'Switch player']],
    info() { const t = Math.ceil(this.time); return `BLUE ${this.goals[0]} : ${this.goals[1]} RED · ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; },
    init() { this.goals = [0, 0]; this.time = 120; this.parts = []; this.kickoff(1); },
    kickoff(team) {
      this.ps = [[0, 280, MY], [0, 140, MY - 70], [1, 360, MY], [1, 500, MY + 70]].map(([t, x, y]) => ({team: t, x, y, vx: 0, vy: 0, r: 12, fx: t ? -1 : 1, fy: 0, kickCd: .3, stealCd: 0, stamina: 100}));
      this.ps[team ? 2 : 0].x = team ? 336 : 304;
      this.ball = {x: W / 2, y: MY, vx: 0, vy: 0, owner: null, spin: 0};
      this.ctrl = 0; this.pauseT = 1.2; this.msg = 'KICK OFF'; this.after = null;
    },
    kick(p, tx, ty, power) {
      const b = this.ball, d = Math.hypot(tx - b.x, ty - b.y) || 1;
      b.owner = null; b.vx = (tx - b.x) / d * power; b.vy = (ty - b.y) / d * power; p.kickCd = .4;
      G.sfx('hit', .6);
    },
    shoot(p) {
      const aim = p.team ? 0 : G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      const ty = G.clamp((p.team ? GT + 12 + G.rnd(GB - GT - 24) : MY + aim * 40 + (Math.random() - .5) * 24), GT + 8, GB - 8);
      this.kick(p, p.team ? L - 20 : R + 20, ty, 560 + G.rnd(60));
    },
    pass(p) {
      const mate = this.ps.find(o => o !== p && o.team === p.team), lx = mate.x + mate.vx * .35, ly = mate.y + mate.vy * .35;
      this.kick(p, lx, ly, G.clamp(G.dist(p.x, p.y, lx, ly) * 1.6, 260, 480));
      return this.ps.indexOf(mate);
    },
    key(k) {
      if (this.pauseT > 0) return;
      const me = this.ps[this.ctrl], b = this.ball;
      if (k === 'j' || k === ' ') { if (b.owner === this.ctrl || (b.owner === null && G.dist(me.x, me.y, b.x, b.y) < 28)) this.shoot(me); }
      if (k === 'k' && b.owner === this.ctrl) this.ctrl = this.pass(me);
      if (k === 'q') this.ctrl = this.ctrl ? 0 : 1;
    },
    steer(p, tx, ty, sp, dt) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
      const s = d < 30 ? sp * d / 30 : sp, wx = d > 1 ? dx / d * s : 0, wy = d > 1 ? dy / d * s : 0;
      p.vx += (wx - p.vx) * Math.min(1, dt * 8); p.vy += (wy - p.vy) * Math.min(1, dt * 8);
    },
    ai(p, dt) {
      const b = this.ball, dir = p.team ? -1 : 1, oppGoal = p.team ? L : R, ownGoal = p.team ? R : L;
      const owner = b.owner !== null ? this.ps[b.owner] : null, mates = this.ps.filter(o => o.team === p.team);
      const speed = p.team ? 148 + this.goals[0] * 4 : 150;
      if (owner === p) {
        if (Math.abs(oppGoal - p.x) < 210 && p.kickCd <= 0) return this.shoot(p);
        const foe = this.ps.find(o => o.team !== p.team && G.dist(o.x, o.y, p.x, p.y) < 55 && (o.x - p.x) * dir > 0);
        if (foe && Math.random() < dt * 1.6) { this.pass(p); return; }
        let ty = MY + (p.y < MY ? -30 : 30);
        if (foe) ty = p.y + (p.y > foe.y ? 70 : -70);
        return this.steer(p, oppGoal, ty, speed, dt);
      }
      if (owner && owner.team === p.team) return this.steer(p, G.clamp(owner.x + dir * 130, L + 40, R - 40), owner.y < MY ? MY + 90 : MY - 90, speed, dt);
      const chaser = mates.slice().sort((a, c) => G.dist(a.x, a.y, b.x, b.y) - G.dist(c.x, c.y, b.x, b.y))[0];
      if (chaser === p) return this.steer(p, b.x + b.vx * .15, b.y + b.vy * .15, speed + 15, dt);
      this.steer(p, ownGoal + dir * 80, G.lerp(MY, b.y, .55), speed, dt); // hold a line in front of your own goal
    },
    update(dt) {
      const b = this.ball;
      if (this.pauseT > 0) { if ((this.pauseT -= dt) <= 0 && this.after) { const f = this.after; this.after = null; f(); } return; }
      if ((this.time -= dt) <= 0) {
        this.time = 0; const [a, c] = this.goals;
        if (a > c) G.score += 1000;
        return G.end(a > c ? 'You win!' : a < c ? 'Full time' : 'Draw');
      }
      const me = this.ps[this.ctrl];
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      const sprint = G.keys.Shift && me.stamina > 0 && (mx || my);
      me.stamina = sprint ? Math.max(0, me.stamina - 35 * dt) : Math.min(100, me.stamina + 16 * dt);
      if (mx || my) { const l = Math.hypot(mx, my); this.steer(me, me.x + mx / l * 100, me.y + my / l * 100, sprint ? 228 : 155, dt); }
      else this.steer(me, me.x, me.y, 0, dt);
      this.ps.forEach(p => { if (p !== me) this.ai(p, dt); });
      for (const p of this.ps) {
        p.kickCd -= dt; p.stealCd -= dt;
        p.x = G.clamp(p.x + p.vx * dt, L + p.r, R - p.r); p.y = G.clamp(p.y + p.vy * dt, T + p.r, B - p.r);
        const s = Math.hypot(p.vx, p.vy); if (s > 20) { p.fx = p.vx / s; p.fy = p.vy / s; }
      }
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        const a = this.ps[i], c = this.ps[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1, o = 24 - d;
        if (o > 0) { a.x -= dx / d * o / 2; a.y -= dy / d * o / 2; c.x += dx / d * o / 2; c.y += dy / d * o / 2; }
      }
      if (b.owner !== null) {
        const o = this.ps[b.owner];
        b.x += (o.x + o.fx * 15 - b.x) * Math.min(1, dt * 18); b.y += (o.y + o.fy * 15 - b.y) * Math.min(1, dt * 18);
        b.vx = o.vx; b.vy = o.vy; b.spin += Math.hypot(o.vx, o.vy) * dt * .1;
        for (const q of this.ps) {
          if (q.team === o.team || q.stealCd > 0 || G.dist(q.x, q.y, b.x, b.y) > q.r + 10) continue;
          q.stealCd = .5;
          if (Math.random() < (q === me ? .65 : .45)) {
            b.owner = this.ps.indexOf(q); o.kickCd = .5; G.sfx('swing');
            if (q.team === 0) this.ctrl = b.owner;
          }
        }
      } else {
        b.x += b.vx * dt; b.y += b.vy * dt; b.spin += Math.hypot(b.vx, b.vy) * dt * .1;
        const f = Math.pow(.42, dt); b.vx *= f; b.vy *= f;
        const mouth = b.y > GT && b.y < GB;
        if (b.y < T + BR) { b.y = T + BR; b.vy = Math.abs(b.vy) * .7; }
        if (b.y > B - BR) { b.y = B - BR; b.vy = -Math.abs(b.vy) * .7; }
        if (!mouth && b.x < L + BR) { b.x = L + BR; b.vx = Math.abs(b.vx) * .7; }
        if (!mouth && b.x > R - BR) { b.x = R - BR; b.vx = -Math.abs(b.vx) * .7; }
        if (mouth && (b.x < L - 4 || b.x > R + 4)) {
          const team = b.x > R ? 0 : 1;
          this.goals[team]++; b.vx *= .2; b.vy *= .2; b.x = G.clamp(b.x, L - 20, R + 20);
          G.score = Math.max(0, G.score + (team ? -200 : 500));
          this.msg = team ? 'RED SCORES' : 'GOAL!'; this.pauseT = 2.2; this.after = () => this.kickoff(team ? 0 : 1);
          G.sfx(team ? 'lose' : 'win'); G.shake(6, .4);
          G.burst(this.parts, b.x, b.y, TEAM[team], 30, 240);
          return;
        }
        for (const p of this.ps) {
          const d = G.dist(p.x, p.y, b.x, b.y), sp = Math.hypot(b.vx, b.vy);
          if (d > p.r + BR + 2 || p.kickCd > 0) continue;
          if (sp < 430) {
            b.owner = this.ps.indexOf(p); G.sfx('click', .5);
            if (p.team === 0) this.ctrl = b.owner;
          } else { const nx = (b.x - p.x) / d, ny = (b.y - p.y) / d, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; b.vx *= .5; b.vy *= .5; p.kickCd = .2; G.sfx('hit', .4); } }
          break;
        }
      }
    },
    draw(ctx, dt) {
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#2e8a4a' : '#2a8045'; ctx.fillRect(i * 64, 0, 64, H); }
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(L, T, R - L, B - T);
      ctx.beginPath(); ctx.moveTo(W / 2, T); ctx.lineTo(W / 2, B); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, MY, 46, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeRect(L, MY - 90, 80, 180); ctx.strokeRect(R - 80, MY - 90, 80, 180);
      G.circle(W / 2, MY, 3, '#fff');
      for (const [x, d] of [[L, -1], [R, 1]]) {
        G.rr(Math.min(x, x + d * 24), GT, 24, GB - GT, 0, 'rgba(255,255,255,.12)');
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
        for (let y = GT; y <= GB; y += 10) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * 24, y); ctx.stroke(); }
        for (let k = 0; k <= 24; k += 8) { ctx.beginPath(); ctx.moveTo(x + d * k, GT); ctx.lineTo(x + d * k, GB); ctx.stroke(); }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, GT); ctx.lineTo(x + d * 24, GT); ctx.lineTo(x + d * 24, GB); ctx.lineTo(x, GB); ctx.stroke();
      }
      const b = this.ball;
      for (const p of this.ps) G.circle(p.x + 2, p.y + 4, p.r, 'rgba(0,0,0,.25)');
      G.circle(b.x + 2, b.y + 3, BR, 'rgba(0,0,0,.3)');
      this.ps.forEach((p, i) => {
        G.circle(p.x, p.y, p.r, TEAM[p.team]);
        G.circle(p.x + p.fx * 5, p.y + p.fy * 5, 5.5, '#f0c9a0');
        if (p.team === 0 && i === this.ctrl) {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 26); ctx.lineTo(p.x + 6, p.y - 26); ctx.lineTo(p.x, p.y - 18); ctx.fill();
        }
      });
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
      G.circle(0, 0, BR, '#ffffff'); G.circle(0, 0, 2.6, '#1b1a33');
      for (let k = 0; k < 5; k++) G.circle(Math.cos(k * 1.257) * 5, Math.sin(k * 1.257) * 5, 1.4, '#1b1a33');
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(W / 2 - 92, 4, 184, 30, 8);
      G.text(String(this.goals[0]), W / 2 - 22, 27, {size: 20, align: 'center', display: true, color: '#8fb4ff'});
      G.text(String(this.goals[1]), W / 2 + 22, 27, {size: 20, align: 'center', display: true, color: '#ff8f9f'});
      G.text(':', W / 2, 26, {size: 18, align: 'center', weight: 700});
      const t = Math.ceil(this.time);
      G.text(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, W / 2 + 80, 25, {size: 12, align: 'right', weight: 700, color: '#c4c8ee'});
      G.text('BLUE', W / 2 - 84, 25, {size: 11, weight: 700, color: '#8fb4ff'});
      G.bar({x: 14, y: H - 26, w: 160, h: 12, v: this.ps[this.ctrl].stamina, max: 100, color: '#ffcf5c', label: 'STAMINA'});
      if (this.pauseT > 0) G.text(this.msg, W / 2, MY - 60, {size: 34, align: 'center', display: true, color: '#ffffff', shadow: true});
    }
  });
})();

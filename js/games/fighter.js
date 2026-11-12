(() => {
  const W = 640, H = 400, FLOOR = 340, GRAV = 1900;
  const RIVALS = [
    {name: 'REN', gi: '#3d6fd9', band: '#ffcf5c', skill: .45, speed: 155, power: 1},
    {name: 'MIRA', gi: '#2fb89a', band: '#e8577a', skill: .65, speed: 190, power: 1.1},
    {name: 'TORA', gi: '#b8323f', band: '#1b1a33', skill: .82, speed: 165, power: 1.3}
  ];
  const MOVES = {
    jab: {start: .06, active: .08, rec: .14, reach: 58, y: -100, dmg: 6, stun: .25, kb: 140},
    kick: {start: .12, active: .1, rec: .26, reach: 74, y: -46, dmg: 11, stun: .35, kb: 240},
    air: {start: .05, active: .35, rec: .1, reach: 60, y: -30, dmg: 9, stun: .3, kb: 180},
    special: {start: .22, active: .02, rec: .35, reach: 0, y: -90, dmg: 16, stun: .4, kb: 260}
  };
  const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  function limb(ctx, ax, ay, tx, ty, L1, L2, bend, color, w) { // two-bone limb solved with the law of cosines
    const dx = tx - ax, dy = ty - ay;
    const d = G.clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + .01, L1 + L2 - .01), a = Math.atan2(dy, dx);
    const off = Math.acos(G.clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const ja = a + bend * off, jx = ax + Math.cos(ja) * L1, jy = ay + Math.sin(ja) * L1, ex = ax + Math.cos(a) * d, ey = ay + Math.sin(a) * d;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(jx, jy); ctx.lineTo(ex, ey); ctx.stroke();
    return [ex, ey];
  }

  GameBox.register({
    id: 'fighter', title: 'Dojo Duel', genre: 'Action', kind: 'Fighting', w: W, h: H,
    desc: 'One-on-one martial arts against three rivals, best of three rounds each. Mix quick jabs and long kicks, block to take only chip damage, and spend half your spirit meter on a Spirit Wave. Beat all three to become champion.',
    controls: [['A D / Left Right', 'Walk'], ['W / Up', 'Jump'], ['S / Down', 'Block (hold)'], ['J', 'Jab'], ['K', 'Kick (in the air: flying kick)'], ['L', 'Spirit Wave (50 meter)']],
    info() { return `vs ${RIVALS[this.rival].name} · Round ${this.round}`; },
    init() { this.rival = 0; this.parts = []; this.newMatch(); },
    newMatch() { this.pw = 0; this.cw = 0; this.round = 0; this.newRound(); },
    newRound() {
      this.round++;
      const R = RIVALS[this.rival];
      this.P = this.fighter(200, 1, {gi: '#e8e6df', band: '#e04e5f', speed: 165, power: 1});
      this.C = this.fighter(440, -1, R);
      this.waves = []; this.timer = 60; this.phase = 'intro'; this.phaseT = 1.6; this.input = {};
    },
    fighter(x, face, look) { return {x, y: FLOOR, vx: 0, vy: 0, face, hp: 100, meter: 0, state: 'idle', t: 0, move: null, hitDone: false, fired: false, stun: 0, blocking: false, look, walk: 0, think: 0, plan: {}}; },
    key(k) {
      const map = {w: 'up', ArrowUp: 'up', j: 'jab', k: 'kick', l: 'special'};
      if (map[k]) this.input[map[k]] = true;
    },
    ai(c, p, dt) {
      const R = RIVALS[this.rival], inp = {}, d = Math.abs(p.x - c.x), toward = p.x > c.x ? 'right' : 'left', away = toward === 'right' ? 'left' : 'right';
      const grounded = c.y >= FLOOR;
      if (p.state === 'attack' && d < 100 && grounded) {
        if (c.blockRoll === undefined) c.blockRoll = Math.random() < R.skill;
        if (c.blockRoll) { inp.down = true; return inp; }
      } else c.blockRoll = undefined;
      const wave = this.waves.find(w => w.owner !== c && Math.abs(w.x - c.x) < 170 && Math.sign(c.x - w.x) === Math.sign(w.vx));
      if (wave && grounded) {
        if (c.waveRoll === undefined) c.waveRoll = Math.random();
        if (c.waveRoll < R.skill) { inp.down = true; return inp; }
        if (c.waveRoll < R.skill + .2) inp.up = true;
      } else c.waveRoll = undefined;
      if ((c.think -= dt) > 0) return {...c.plan, ...inp};
      c.think = .16 + G.rnd(.3) * (1.2 - R.skill);
      const plan = {}, r = Math.random();
      if (d > 150) { plan[toward] = true; if (c.meter >= 50 && r < .3) inp.special = true; else if (r > .93) inp.up = true; }
      else if (d > 85) { if (r < .55) plan[toward] = true; else if (r < .8) inp.kick = true; else if (r < .88) inp.up = true; }
      else if (r < .34) inp.jab = true; else if (r < .6) inp.kick = true; else if (r < .78) plan[away] = true; else if (r < .86) { inp.up = true; plan[toward] = true; }
      c.plan = plan;
      return {...plan, ...inp};
    },
    land(a, d, m, hx, hy) {
      const isP = a === this.P;
      if (d.state === 'block' || (d.stun > 0 && d.blocking)) {
        d.hp -= 1; d.stun = .18; d.blocking = true; d.vx = a.face * 170;
        a.meter = Math.min(100, a.meter + 2); d.meter = Math.min(100, d.meter + 3);
        G.sfx('hit', .4); G.burst(this.parts, hx, hy, '#c4c8ee', 5, 90);
      } else {
        const dmg = Math.round(m.dmg * a.look.power);
        d.hp -= dmg; d.stun = m.stun; d.blocking = false; d.state = 'hit'; d.t = 0;
        d.vx = a.face * m.kb; if (d.y < FLOOR) d.vy = -260;
        a.meter = Math.min(100, a.meter + 8); d.meter = Math.min(100, d.meter + 5);
        G.sfx('hit'); G.shake(m === MOVES.special ? 8 : 4, .15); G.burst(this.parts, hx, hy, '#ffcf5c', 12, 200);
        if (isP) { G.score += dmg * 10; G.popText(this.parts, hx, hy - 10, String(dmg), '#ffcf5c'); }
      }
      if (d.hp <= 0) { d.hp = 0; d.state = 'ko'; d.t = 0; d.vy = -360; d.vx = a.face * 220; this.endRound(isP ? 'P' : 'C', 'K.O.'); }
    },
    endRound(winner, text) {
      if (this.phase !== 'fight') return;
      this.phase = 'end'; this.phaseT = 2.6; this.banner = text; G.sfx(text === 'K.O.' ? 'boom' : 'beat');
      if (winner === 'P') {
        this.pw++; G.score += 300;
        if (this.P.hp >= 100) { G.score += 500; this.banner = 'PERFECT'; }
      } else if (winner === 'C') this.cw++;
      this.winner = winner;
    },
    step(f, o, inp, dt) {
      f.t += dt;
      const grounded = f.y >= FLOOR;
      if (f.state === 'ko') {
        f.vy += GRAV * dt; f.y = Math.min(FLOOR, f.y + f.vy * dt); f.x = G.clamp(f.x + f.vx * dt, 30, W - 30);
        if (f.y >= FLOOR) f.vx *= .9;
        return;
      }
      if (f.stun > 0) {
        f.stun -= dt; f.state = f.blocking ? 'block' : 'hit'; f.vx *= Math.pow(.02, dt);
        if (f.stun <= 0) { f.state = 'idle'; f.blocking = false; }
      } else if (f.state === 'attack') {
        const m = MOVES[f.move], t = f.t;
        if (f.move === 'special' && t >= m.start && !f.fired) {
          f.fired = true; this.waves.push({x: f.x + f.face * 40, y: f.y - 90, vx: f.face * 380, owner: f}); G.sfx('laser');
        }
        if (f.move !== 'special' && t >= m.start && t < m.start + m.active && !f.hitDone) {
          const hx = f.x + f.face * m.reach, hy = f.y + m.y;
          if (Math.abs(hx - o.x) < 26 && hy > o.y - 120 && hy < o.y + 4 && o.state !== 'ko') { f.hitDone = true; this.land(f, o, m, hx, hy); }
        }
        if (grounded) f.vx *= Math.pow(.01, dt);
        if (f.move === 'air' ? grounded && t > .05 : t >= m.start + m.active + m.rec) f.state = 'idle';
      } else {
        if (grounded) f.face = o.x > f.x ? 1 : -1;
        const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        if (grounded) {
          if (inp.down) { f.state = 'block'; f.vx = 0; }
          else {
            const back = dir && dir !== f.face;
            f.vx = dir * f.look.speed * (back ? .75 : 1);
            f.state = dir ? 'walk' : 'idle';
            if (dir) f.walk += Math.abs(f.vx) * dt / 18;
            if (inp.up) { f.vy = -660; f.state = 'jump'; G.sfx('jump', .6); }
          }
        }
        const attack = mv => { f.state = 'attack'; f.move = mv; f.t = 0; f.hitDone = false; f.fired = false; G.sfx('swing', .6); };
        if (f.state !== 'block') {
          if (inp.special && f.meter >= 50 && grounded) { f.meter -= 50; attack('special'); }
          else if (inp.kick) attack(grounded ? 'kick' : 'air');
          else if (inp.jab && grounded) attack('jab');
        }
      }
      f.vy += GRAV * dt; f.y += f.vy * dt;
      if (f.y >= FLOOR) { f.y = FLOOR; f.vy = 0; if (f.state === 'jump') f.state = 'idle'; }
      f.x = G.clamp(f.x + f.vx * dt, 30, W - 30);
    },
    update(dt) {
      const P = this.P, C = this.C;
      this.phaseT -= dt;
      if (this.phase === 'intro') { if (this.phaseT <= 0) { this.phase = 'fight'; G.sfx('power'); } this.input = {}; return; }
      if (this.phase === 'end') {
        this.step(P, C, {}, dt); this.step(C, P, {}, dt);
        if (this.phaseT > 0) return;
        if (this.pw === 2) {
          G.score += 1000 * (this.rival + 1);
          if (this.rival === 2) return G.end('Champion!');
          this.rival++; this.newMatch(); return;
        }
        if (this.cw === 2) return G.end('Defeated');
        this.newRound(); return;
      }
      if ((this.timer -= dt) <= 0) { this.timer = 0; this.endRound(P.hp > C.hp ? 'P' : P.hp < C.hp ? 'C' : 'D', 'TIME'); }
      const pin = {left: G.held('a', 'ArrowLeft'), right: G.held('d', 'ArrowRight'), down: G.held('s', 'ArrowDown'), ...this.input};
      this.input = {};
      this.step(P, C, pin, dt);
      this.step(C, P, this.ai(C, P, dt), dt);
      const gap = Math.abs(P.x - C.x);
      if (gap < 44 && Math.abs(P.y - C.y) < 80) { const push = (44 - gap) / 2 * Math.sign(P.x - C.x || 1); P.x = G.clamp(P.x + push, 30, W - 30); C.x = G.clamp(C.x - push, 30, W - 30); }
      for (const w of this.waves) {
        w.x += w.vx * dt;
        const tgt = w.owner === P ? C : P;
        if (Math.abs(w.x - tgt.x) < 24 && tgt.state !== 'ko' && Math.abs(w.y - (tgt.y - 70)) < 60) { w.dead = true; this.land(w.owner, tgt, MOVES.special, w.x, w.y); }
        const other = this.waves.find(o => o !== w && o.owner !== w.owner && Math.abs(o.x - w.x) < 20);
        if (other) { w.dead = other.dead = true; G.burst(this.parts, w.x, w.y, '#c4c8ee', 16); G.sfx('boom', .5); }
        if (w.x < -30 || w.x > W + 30) w.dead = true;
      }
      this.waves = this.waves.filter(w => !w.dead);
    },
    pose(f) {
      const t = f.t, idle = {lean: 4, fh: [30, -102], bh: [16, -94], ff: [16, 0], bf: [-18, 0]};
      if (f.state === 'walk') {
        const ph = f.walk;
        return {...idle, ff: [16 + Math.sin(ph) * 14, -Math.max(0, Math.cos(ph)) * 8], bf: [-18 - Math.sin(ph) * 14, -Math.max(0, -Math.cos(ph)) * 8]};
      }
      if (f.state === 'jump') return {lean: 2, fh: [26, -112], bh: [10, -104], ff: [18, -30], bf: [-14, -24]};
      if (f.state === 'block') return {lean: -2, fh: [20, -116], bh: [26, -100], ff: [18, 0], bf: [-20, 0]};
      if (f.state === 'hit') return {lean: -14, fh: [6, -96], bh: [-6, -90], ff: [14, 0], bf: [-20, 0], hurt: true};
      if (f.state === 'attack') {
        const m = MOVES[f.move], ext = t < m.start ? t / m.start : t < m.start + m.active ? 1 : Math.max(0, 1 - (t - m.start - m.active) / m.rec);
        if (f.move === 'jab') return {...idle, lean: 4 + ext * 8, fh: lerp2(idle.fh, [64, -100], ext)};
        if (f.move === 'kick') return {...idle, lean: 4 - ext * 16, ff: lerp2(idle.ff, [74, -46], ext), fh: [18, -108], bh: [4, -100]};
        if (f.move === 'air') return {lean: -6, fh: [20, -112], bh: [6, -104], ff: lerp2([18, -30], [62, -30], Math.min(1, t / .05)), bf: [-12, -26]};
        return {...idle, lean: 6 + ext * 6, fh: lerp2(idle.fh, [52, -92], ext), bh: lerp2(idle.bh, [48, -84], ext)};
      }
      const b = Math.sin(t * 4) * 2;
      return {...idle, fh: [30, -102 + b], bh: [16, -94 + b]};
    },
    drawFighter(ctx, f) {
      const L = f.look;
      ctx.save(); ctx.translate(f.x, f.y);
      G.rr(-26, -4, 52, 8, 4, 'rgba(0,0,0,.3)');
      ctx.scale(f.face, 1);
      if (f.state === 'ko' && f.y >= FLOOR) { ctx.translate(-30, -8); ctx.rotate(-Math.min(1, f.t * 2.5) * 1.45); }
      const P = f.state === 'ko' ? {lean: -10, fh: [10, -80], bh: [-6, -84], ff: [16, 0], bf: [-14, 0]} : this.pose(f);
      const bob = f.state === 'idle' ? Math.sin(f.t * 4) * 1.5 : 0, hip = [0, -58 + bob], neck = [P.lean, -106 + bob];
      const skin = '#f0c9a0', dark = f.stun > 0 && !f.blocking && Math.floor(f.t * 30) % 2 ? '#ffffff' : L.gi;
      limb(ctx, hip[0], hip[1], P.bf[0], P.bf[1], 30, 30, -1, '#c9c4b8', 12);
      limb(ctx, neck[0] - 4, neck[1] + 6, P.bh[0], P.bh[1], 22, 22, 1, '#b9b4a8', 10);
      ctx.strokeStyle = dark; ctx.lineWidth = 26; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(neck[0], neck[1] + 4); ctx.stroke();
      ctx.strokeStyle = L.band; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(hip[0] - 13, hip[1] - 2); ctx.lineTo(hip[0] + 13, hip[1] - 2); ctx.stroke();
      const [fx, fy] = limb(ctx, hip[0], hip[1], P.ff[0], P.ff[1], 30, 30, -1, dark, 13);
      G.rr(fx - 4, fy - 4, 14, 6, 3, skin);
      G.circle(neck[0] + 2, neck[1] - 14, 13, skin);
      ctx.fillStyle = '#1b1a20'; ctx.beginPath(); ctx.arc(neck[0] + 1, neck[1] - 16, 13, Math.PI * .95, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = L.band; ctx.fillRect(neck[0] - 12, neck[1] - 19, 26, 4);
      G.circle(neck[0] + 9, neck[1] - 13, 1.8, '#1b1a20');
      const [hx, hy] = limb(ctx, neck[0] + 2, neck[1] + 6, P.fh[0], P.fh[1], 22, 22, 1, dark, 11);
      G.circle(hx, hy, 6.5, skin);
      ctx.restore();
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      const wall = ctx.createLinearGradient(0, 0, 0, FLOOR);
      wall.addColorStop(0, '#3a2a22'); wall.addColorStop(1, '#5a4130');
      ctx.fillStyle = wall; ctx.fillRect(0, 0, W, FLOOR);
      for (let x = 40; x < W; x += 140) {
        G.rr(x, 40, 110, 190, 2, '#efe3c8');
        ctx.strokeStyle = '#6b4a33'; ctx.lineWidth = 3; ctx.strokeRect(x, 40, 110, 190);
        ctx.lineWidth = 1.5; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + i * 27.5, 40); ctx.lineTo(x + i * 27.5, 230); ctx.stroke(); }
        for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x, 40 + i * 31.6); ctx.lineTo(x + 110, 40 + i * 31.6); ctx.stroke(); }
      }
      G.rr(W / 2 - 34, 20, 68, 120, 4, '#7a1f2a'); G.circle(W / 2, 70, 20, '#efe3c8'); G.circle(W / 2, 70, 12, '#7a1f2a');
      for (const lx of [70, W - 70]) { G.rr(lx - 10, 236, 20, 28, 8, '#e04e5f'); G.circle(lx, 250, 22, `rgba(255,160,90,${.15 + Math.sin(now * 3 + lx) * .03})`); }
      ctx.fillStyle = '#8a5a35'; ctx.fillRect(0, FLOOR - 70, W, 70 + H - FLOOR);
      for (let y = FLOOR - 70; y < H; y += 14) { ctx.fillStyle = y % 28 ? '#93623b' : '#7f532f'; ctx.fillRect(0, y, W, 13); }
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, FLOOR - 70, W, 6);
      for (const w of this.waves) {
        const c = w.owner === this.P ? '#5cb8ff' : '#ff9f5c';
        for (let i = 0; i < 5; i++) G.circle(w.x - Math.sign(w.vx) * i * 9, w.y, 14 - i * 2.4, i ? c + '55' : c);
        G.circle(w.x, w.y, 6, '#ffffff');
      }
      this.drawFighter(ctx, this.C); this.drawFighter(ctx, this.P);
      G.fx(this.parts, dt);
      // HUD
      const R = RIVALS[this.rival];
      G.bar({x: 20, y: 18, w: 250, h: 18, v: this.P.hp, max: 100, color: this.P.hp < 30 ? '#ff4b62' : '#ffcf5c', id: 'php'});
      const f = G.clamp(this.C.hp / 100, 0, 1), trail = Math.max(f, (G.lag.chp ?? f) - G.dt * .45); G.lag.chp = trail;
      G.rr(368, 16, 254, 22, 11, 'rgba(8,9,24,.72)');
      if (trail > f) G.rr(370 + 250 * (1 - trail), 18, 250 * trail, 18, 9, 'rgba(255,255,255,.5)');
      if (f > 0) G.rr(370 + 250 * (1 - f), 18, Math.max(18, 250 * f), 18, 9, f < .3 ? '#ff4b62' : '#ffcf5c');
      G.text('YOU', 22, 54, {size: 13, weight: 700, shadow: true});
      G.text(R.name, W - 22, 54, {size: 13, weight: 700, align: 'right', shadow: true});
      for (let i = 0; i < 2; i++) { G.circle(90 + i * 16, 50, 5, i < this.pw ? '#ffcf5c' : 'rgba(255,255,255,.25)'); G.circle(W - 90 - i * 16, 50, 5, i < this.cw ? '#ffcf5c' : 'rgba(255,255,255,.25)'); }
      G.text(String(Math.ceil(this.timer)), W / 2, 40, {size: 26, align: 'center', display: true, shadow: true});
      G.bar({x: 20, y: H - 22, w: 160, h: 10, v: this.P.meter, max: 100, color: this.P.meter >= 50 ? '#5cb8ff' : '#3d5a8a', label: 'SPIRIT'});
      G.bar({x: W - 180, y: H - 22, w: 160, h: 10, v: this.C.meter, max: 100, color: this.C.meter >= 50 ? '#ff9f5c' : '#8a5a3d'});
      if (this.phase === 'intro') {
        const t = this.phaseT;
        G.text(t > .6 ? `ROUND ${this.round}` : 'FIGHT!', W / 2, 190, {size: 40, align: 'center', display: true, color: t > .6 ? '#efe3c8' : '#ffcf5c', shadow: true});
        if (this.round === 1 && t > .6) G.text(`vs ${R.name}`, W / 2, 222, {size: 16, align: 'center', weight: 700, shadow: true});
      }
      if (this.phase === 'end') G.text(this.banner, W / 2, 190, {size: 44, align: 'center', display: true, color: '#ff6b8b', shadow: true});
    }
  });
})();

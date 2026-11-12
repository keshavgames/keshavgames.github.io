(() => {
  const T = 32, ROWS = 13;
  // Hand-made 16x13 chunks. # ground, = stone, - one-way plank, ^ spikes, b bounce mushroom,
  // o gem, h heart, e beetle, f bee, C checkpoint, G goal, P start.
  const CH = {
    start: ['................', '................', '................', '................', '................', '................', '................', '................', '.........o.o....', '........====....', '..P.............', '################', '################'],
    gap: ['................', '................', '................', '................', '................', '................', '................', '......o..o......', '................', '................', '................', '######....######', '######....######'],
    stairs: ['................', '................', '................', '................', '................', '........ooo.....', '.......=====....', '................', '....o.......o...', '...===.....===..', '................', '################', '################'],
    spikes: ['................', '................', '................', '................', '................', '................', '................', '......o.o.......', '......---.......', '................', '.....^^^^^......', '################', '################'],
    beetles: ['................', '................', '................', '................', '................', '................', '................', '....o.....o.....', '................', '...===...===....', '..e.......e.....', '################', '################'],
    bounce: ['................', '.......ooo......', '................', '......=====.....', '................', '................', '................', '................', '................', '...h............', '....b...........', '################', '################'],
    islands: ['................', '................', '................', '................', '................', '................', '................', '.......oo.......', '.......==.......', '....o......o....', '...==......==...', '###..........###', '###..........###'],
    bees: ['................', '................', '................', '................', '................', '................', '....f.....f.....', '................', '................', '..o....o....o...', '................', '################', '################'],
    tunnel: ['................', '................', '................', '................', '................', '..o.o.o.o.o.o...', '................', '================', '................', '.o.o.o..........', '.......e........', '################', '################'],
    pit: ['................', '................', '................', '................', '................', '................', '..........o.....', '.........---....', '.....o..........', '....---.........', '................', '###..........###', '###..........###'],
    check: ['................', '................', '................', '................', '................', '................', '................', '................', '................', '................', '.......C........', '################', '################'],
    goal: ['................', '................', '................', '................', '................', '................', '................', '........ooo.....', '................', '................', '............G...', '################', '################']
  };
  const LEVELS = [
    ['start', 'gap', 'stairs', 'beetles', 'check', 'spikes', 'bounce', 'goal'],
    ['start', 'beetles', 'islands', 'bees', 'check', 'spikes', 'tunnel', 'gap', 'goal'],
    ['start', 'bees', 'pit', 'spikes', 'check', 'tunnel', 'islands', 'bees', 'pit', 'beetles', 'goal']
  ];
  const SOLID = '#=b';

  GameBox.register({
    id: 'platformer', title: 'Moss Hop', genre: 'Adventure', kind: 'Platformer', w: 640, h: 416,
    desc: 'Guide a little moss sprite through three forest levels. Stomp beetles, dodge bees and spikes, bounce off mushrooms and grab every gem. Checkpoint flags save your spot if you fall.',
    controls: [['A D / Left Right', 'Run'], ['Space / W / Up', 'Jump (hold to jump higher)'], ['Jump on enemies', 'Stomp them']],
    info() { return `Level ${this.level}/3 · Gems ${this.gems}`; },
    init() { this.level = 1; this.hp = 3; this.gems = 0; this.parts = []; this.load(); },
    load() {
      const rows = Array.from({length: ROWS}, () => '');
      for (const name of LEVELS[this.level - 1]) CH[name].forEach((r, i) => { rows[i] += r; });
      this.cols = rows[0].length;
      this.map = rows.map(r => r.split(''));
      this.items = []; this.foes = []; this.flags = [];
      this.map.forEach((row, ty) => row.forEach((c, tx) => {
        const x = tx * T + T / 2, y = (ty + 1) * T;
        if (c === 'P') this.spawnAt = {x, y};
        else if (c === 'o' || c === 'h') this.items.push({x, y: y - T / 2, type: c});
        else if (c === 'e') this.foes.push({type: 'beetle', x, y, dir: -1});
        else if (c === 'f') this.foes.push({type: 'bee', x, y: y - T / 2, base: y, ph: G.rnd(6)});
        else if (c === 'C' || c === 'G') this.flags.push({x, y, type: c, on: false});
        else return;
        row[tx] = '.';
      }));
      this.respawn = {...this.spawnAt};
      this.p = {x: this.spawnAt.x, y: this.spawnAt.y, vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, inv: 0, face: 1, squash: 1};
      this.cam = 0; this.t = 0;
    },
    tile(tx, ty) { if (ty < 0 || ty >= ROWS) return '.'; if (tx < 0 || tx >= this.cols) return '#'; return this.map[ty][tx]; },
    solid(tx, ty) { return SOLID.includes(this.tile(tx, ty)); },
    key(k) { if (k === ' ' || k === 'w' || k === 'ArrowUp') this.p.buffer = .12; },
    hurt() {
      const p = this.p;
      if (p.inv > 0) return;
      this.hp--; p.inv = 1.2; p.vy = -320; p.vx = -p.face * 220;
      G.shake(6); G.flash(); G.sfx('hurt');
      if (this.hp <= 0) G.end();
    },
    update(dt) {
      const p = this.p;
      this.t += dt; p.inv -= dt; p.coyote -= dt; p.buffer -= dt;
      const dir = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft');
      if (dir) p.face = dir;
      const accel = p.ground ? 1800 : 1100;
      if (dir) p.vx = G.clamp(p.vx + dir * accel * dt, -230, 230);
      else { const f = (p.ground ? 2000 : 600) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
      if (p.ground) p.coyote = .1;
      if (p.buffer > 0 && p.coyote > 0) { p.vy = -560; p.buffer = 0; p.coyote = 0; p.ground = false; G.sfx('jump'); p.squash = .7; }
      const jumpHeld = G.held(' ', 'w', 'ArrowUp');
      if (!jumpHeld && p.vy < -220) p.vy = -220; // short hop when jump is released early
      p.vy = Math.min(700, p.vy + (p.vy > 0 ? 1700 : 1500) * dt);
      // horizontal move and collision
      p.x += p.vx * dt;
      for (let ty = Math.floor((p.y - 28) / T); ty <= Math.floor((p.y - 1) / T); ty++) {
        if (p.vx > 0 && this.solid(Math.floor((p.x + 10) / T), ty)) { p.x = Math.floor((p.x + 10) / T) * T - 10.01; p.vx = 0; }
        if (p.vx < 0 && this.solid(Math.floor((p.x - 10) / T), ty)) { p.x = (Math.floor((p.x - 10) / T) + 1) * T + 10.01; p.vx = 0; }
      }
      // vertical move and collision
      const prevY = p.y, wasGround = p.ground;
      p.y += p.vy * dt; p.ground = false;
      const l = Math.floor((p.x - 9) / T), r = Math.floor((p.x + 9) / T);
      if (p.vy >= 0) {
        const ty = Math.floor(p.y / T);
        for (let tx = l; tx <= r; tx++) {
          const c = this.tile(tx, ty);
          if (SOLID.includes(c) || (c === '-' && prevY <= ty * T + .5)) {
            p.y = ty * T; p.vy = 0; p.ground = true;
            if (c === 'b') { p.vy = -900; p.ground = false; G.sfx('jump'); p.squash = .6; G.burst(this.parts, p.x, p.y, '#ff9fbf', 8); }
            break;
          }
        }
      } else {
        const ty = Math.floor((p.y - 28) / T);
        for (let tx = l; tx <= r; tx++) if (this.solid(tx, ty)) { p.y = (ty + 1) * T + 28; p.vy = 0; break; }
      }
      if (p.ground && !wasGround) p.squash = 1.25;
      p.squash += (1 - p.squash) * Math.min(1, dt * 12);
      // spikes: the lower part of a spike tile hurts
      for (let tx = l; tx <= r; tx++) {
        const ty = Math.floor((p.y - 4) / T);
        if (this.tile(tx, ty) === '^' && p.y > ty * T + 14) this.hurt();
      }
      if (p.y > ROWS * T + 80) { // fell into a pit
        this.hurt(); if (G.state !== 'play') return;
        Object.assign(p, {x: this.respawn.x, y: this.respawn.y, vx: 0, vy: 0, inv: 1.5});
      }
      if (G.state !== 'play') return;
      for (const e of this.foes) {
        if (e.dead) continue;
        let top, half;
        if (e.type === 'beetle') {
          const nx = e.x + e.dir * 50 * dt, front = Math.floor((nx + e.dir * 12) / T), row = Math.floor((e.y - 4) / T);
          if (this.solid(front, row) || !(this.solid(front, row + 1) || this.tile(front, row + 1) === '-')) e.dir *= -1; else e.x = nx;
          top = e.y - 18; half = 12;
        } else { e.y = e.base + 20 + Math.sin(this.t * 1.8 + e.ph) * 95; top = e.y - 10; half = 11; } // dips down to ground level
        const bottom = e.type === 'beetle' ? e.y : e.y + 10;
        if (p.x + 10 < e.x - half || p.x - 10 > e.x + half || p.y < top || p.y - 28 > bottom) continue;
        if (p.vy > 0 && p.y - top < 16) {
          e.dead = true; p.vy = -420; G.score += 50; G.sfx('crunch'); G.burst(this.parts, e.x, top, e.type === 'bee' ? '#ffcf5c' : '#e04e5f', 14);
          G.popText(this.parts, e.x, top - 8, '+50');
        } else this.hurt();
        if (G.state !== 'play') return;
      }
      for (const it of this.items) {
        if (it.got || Math.abs(it.x - p.x) > 18 || Math.abs(it.y - (p.y - 14)) > 22) continue;
        it.got = true;
        if (it.type === 'h') { this.hp = Math.min(3, this.hp + 1); G.sfx('power'); G.popText(this.parts, it.x, it.y - 10, '+1', '#ff6b8b'); }
        else { this.gems++; G.score += 10; G.sfx('coin'); G.burst(this.parts, it.x, it.y, '#5ee6c1', 6); }
      }
      for (const f of this.flags) {
        if (Math.abs(f.x - p.x) > 20 || p.y < f.y - 70) continue;
        if (f.type === 'C' && !f.on) { f.on = true; this.respawn = {x: f.x, y: f.y}; G.sfx('power'); G.popText(this.parts, f.x, f.y - 70, 'CHECKPOINT', '#7ed957'); }
        if (f.type === 'G') {
          G.score += 500 + Math.max(0, Math.round((120 - this.t) * 5)); G.sfx('win');
          if (this.level === 3) return G.end('Forest cleared!');
          this.level++; this.load(); return;
        }
      }
      const target = G.clamp(p.x - G.W / 2 + p.face * 40, 0, this.cols * T - G.W);
      this.cam += (target - this.cam) * Math.min(1, dt * 5);
    },
    draw(ctx, dt) {
      const cam = this.cam, now = this.t;
      const sky = ctx.createLinearGradient(0, 0, 0, G.H);
      sky.addColorStop(0, '#7cc6d9'); sky.addColorStop(1, '#f6d6a8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, G.W, G.H);
      G.circle(520, 70, 34, 'rgba(255,248,214,.8)');
      for (const [f, base, amp, color] of [[.15, 250, 50, '#9fd1b3'], [.35, 290, 34, '#6fb38c']]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, G.H);
        for (let x = 0; x <= G.W; x += 12) ctx.lineTo(x, base - Math.sin((x + cam * f) / 110) * amp - Math.sin((x + cam * f) / 41) * amp * .3);
        ctx.lineTo(G.W, G.H); ctx.fill();
      }
      ctx.fillStyle = '#3f8a5f';
      for (let i = -1; i < 9; i++) {
        const x = i * 90 - (cam * .55) % 90;
        ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x + 26, 250); ctx.lineTo(x + 52, 330); ctx.fill();
      }
      ctx.save(); ctx.translate(-Math.round(cam), 0);
      const c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(this.cols - 1, Math.ceil((cam + G.W) / T));
      for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1; tx++) {
        const c = this.map[ty][tx], x = tx * T, y = ty * T;
        if (c === '#') {
          G.rr(x, y, T, T, 0, '#6b4a33');
          ctx.fillStyle = '#5a3d2a'; ctx.fillRect(x + 6, y + 14, 5, 4); ctx.fillRect(x + 20, y + 22, 6, 4);
          if (this.tile(tx, ty - 1) !== '#') { G.rr(x, y, T, 10, 0, '#6ad46a'); ctx.fillStyle = '#4fb455'; ctx.fillRect(x, y + 8, T, 3); ctx.fillRect(x + 6, y + 10, 4, 4); ctx.fillRect(x + 22, y + 10, 4, 3); }
        } else if (c === '=') {
          G.rr(x + 1, y + 1, T - 2, T - 2, 5, '#8f96a8'); G.rr(x + 3, y + 3, T - 6, 8, 3, '#a9afbf');
          G.rr(x, y, T, 6, 3, '#6ad46a');
        } else if (c === '-') {
          G.rr(x, y, T, 10, 3, '#b07a45'); ctx.fillStyle = '#8a5a2f'; ctx.fillRect(x + 15, y, 2, 10);
        } else if (c === '^') {
          ctx.fillStyle = '#c9ccd4';
          for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 16, y + T); ctx.lineTo(x + i * 16 + 8, y + 12); ctx.lineTo(x + i * 16 + 16, y + T); ctx.fill(); }
        } else if (c === 'b') {
          G.rr(x + 11, y + 14, 10, 18, 3, '#f3e6d0');
          ctx.fillStyle = '#e8577a'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 17, 12, 0, Math.PI, 0); ctx.fill();
          G.circle(x + 9, y + 10, 3, '#fff'); G.circle(x + 20, y + 7, 2.5, '#fff');
        }
      }
      for (const f of this.flags) {
        G.rr(f.x - 2, f.y - 70, 4, 70, 2, '#5a3d2a');
        ctx.fillStyle = f.type === 'G' ? '#ffcf5c' : f.on ? '#7ed957' : '#c9ccd4';
        const wave = Math.sin(now * 6) * 3;
        ctx.beginPath(); ctx.moveTo(f.x + 2, f.y - 70); ctx.lineTo(f.x + 30, f.y - 62 + wave); ctx.lineTo(f.x + 2, f.y - 52); ctx.fill();
      }
      for (const it of this.items) {
        if (it.got) continue;
        const bob = Math.sin(now * 4 + it.x) * 3;
        if (it.type === 'h') G.heart(it.x, it.y + bob, 9, '#e8577a'); else G.gem(it.x, it.y + bob, 9, '#2fb89a');
      }
      for (const e of this.foes) {
        if (e.dead) continue;
        if (e.type === 'beetle') {
          ctx.fillStyle = '#c4364a'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 9, 13, 10, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(e.x - 13, e.y - 9, 26, 5);
          ctx.fillStyle = '#7a1e2c'; ctx.fillRect(e.x - 1, e.y - 19, 2, 10);
          G.circle(e.x + e.dir * 12, e.y - 6, 5, '#2b1e1e'); G.circle(e.x + e.dir * 14, e.y - 7, 1.5, '#fff');
          ctx.fillStyle = '#2b1e1e'; for (const lx of [-8, 0, 8]) ctx.fillRect(e.x + lx + Math.sin(now * 14 + lx) * 1.5, e.y - 4, 2, 4);
        } else {
          const f = Math.sin(now * 30) * 4;
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(e.x - 4, e.y - 10 - f, 7, 4, -.5, 0, Math.PI * 2); ctx.ellipse(e.x + 4, e.y - 10 + f, 7, 4, .5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.ellipse(e.x, e.y, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2b1e1e'; ctx.fillRect(e.x - 3, e.y - 8, 3, 16); ctx.fillRect(e.x + 4, e.y - 8, 3, 16);
        }
      }
      const p = this.p, blink = p.inv > 0 && Math.floor(p.inv * 14) % 2;
      if (!blink && G.state !== 'over') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(2 - p.squash, p.squash);
        G.rr(-11, -26, 22, 26, 10, '#7ed957'); G.rr(-11, -10, 22, 10, 6, '#5fbf3f');
        ctx.fillStyle = '#4fa83a'; ctx.beginPath(); ctx.ellipse(p.face * 3, -30, 8, 4, p.face * -.6, 0, Math.PI * 2); ctx.fill();
        G.circle(p.face * 4 - 4, -17, 3, '#fff'); G.circle(p.face * 4 + 4, -17, 3, '#fff');
        G.circle(p.face * 5 - 4, -17, 1.5, '#1b1a33'); G.circle(p.face * 5 + 4, -17, 1.5, '#1b1a33');
        ctx.restore();
      }
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(8, 8, 196, 50);
      G.bar({x: 18, y: 18, w: 176, h: 14, v: this.hp, max: 3, color: '#e8577a', label: `HEALTH ${this.hp}/3`, id: 'hp'});
      for (let i = 0; i < 3; i++) G.heart(26 + i * 22, 46, 6, i < this.hp ? '#e8577a' : 'rgba(255,255,255,.25)');
      G.text(`Gems ${this.gems}`, 194, 50, {align: 'right', size: 12, color: '#c4c8ee'});
      G.text(`LEVEL ${this.level}`, G.W - 14, 26, {align: 'right', size: 14, weight: 700, color: '#1b2a3a'});
    }
  });
})();

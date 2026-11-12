(() => {
  const W = 640, H = 480, WALL = 32, DOOR_Y = 208, DOOR_H = 64;
  const TYPES = {
    slime: {hp: 22, r: 13, speed: 70, dmg: 8, xp: 6, color: '#5ee6c1'},
    bat: {hp: 12, r: 10, speed: 135, dmg: 6, xp: 5, color: '#8b7bff'},
    archer: {hp: 18, r: 12, speed: 80, dmg: 10, xp: 9, color: '#e8e2d0'},
    knight: {hp: 50, r: 15, speed: 55, dmg: 14, xp: 14, color: '#9aa0c8'},
    golem: {hp: 320, r: 34, speed: 45, dmg: 20, xp: 80, color: '#6b544a'}
  };
  const lightCv = document.createElement('canvas'); lightCv.width = W; lightCv.height = H;
  const lctx = lightCv.getContext('2d');

  function paintRoom() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#211c2b'; g.fillRect(0, 0, W, H);
    for (let y = WALL; y < H - WALL; y += 32) for (let x = WALL; x < W - WALL; x += 32) {
      g.fillStyle = `hsl(${255 + G.rnd(15)} 12% ${15 + G.rnd(5)}%)`; g.fillRect(x + 1, y + 1, 30, 30);
      if (Math.random() < .12) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.moveTo(x + 5 + G.rnd(10), y + 4); g.lineTo(x + 12 + G.rnd(12), y + 16); g.lineTo(x + 8 + G.rnd(14), y + 28); g.stroke(); }
    }
    for (let y = 0; y < H; y += 16) for (let x = (y / 16 % 2) * 16 - 16; x < W; x += 32) {
      if (y >= WALL && y < H - WALL && x > WALL && x < W - WALL - 32) continue;
      g.fillStyle = `hsl(${270 + G.rnd(10)} 10% ${22 + G.rnd(6)}%)`; g.fillRect(x + 1, y + 1, 30, 14);
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(WALL, WALL, W - WALL * 2, 8);
    return c;
  }
  function push(o, rects) { // shove a circle out of solid rectangles
    for (const b of rects) {
      const cx = G.clamp(o.x, b.x, b.x + b.w), cy = G.clamp(o.y, b.y, b.y + b.h);
      const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
      if (d >= o.r) continue;
      if (d > 0) { o.x = cx + dx / d * o.r; o.y = cy + dy / d * o.r; }
      else { o.y = b.y - o.r; }
    }
  }
  const inRect = (x, y, rects) => rects.some(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);

  GameBox.register({
    id: 'rpg', title: 'Ember Keep', genre: 'RPG', kind: 'Fantasy action RPG', w: W, h: H,
    desc: 'Fight room by room down a cursed keep: slimes, bats, skeleton archers and charging knights, with an Ember Golem guarding every floor. Level up from experience orbs, drink potions, and save mana for your fire nova.',
    controls: [['W A S D / Arrows', 'Move'], ['J / Space / Click', 'Sword swing (click aims at the mouse)'], ['K / Shift', 'Dash through attacks (costs mana)'], ['Q / L', 'Ember Nova (50 mana)']],
    info() { return `Floor ${this.floor} · Room ${Math.min(this.room + 1, 5)}/5 · Lv ${this.p.lvl}`; },
    init() {
      this.p = {x: 60, y: 240, r: 12, face: 0, hp: 100, max: 100, mana: 100, lvl: 1, xp: 0, inv: 0, dash: 0, dashCd: 0, dx: 1, dy: 0, swing: 0, swingCd: 0, swingAng: 0, hit: new Set()};
      this.floor = 1; this.room = -1; this.parts = []; this.nova = 0;
      this.newRoom();
    },
    newRoom() {
      this.room++; this.doorOpen = false; this.stairs = null;
      this.enemies = []; this.shots = []; this.rings = []; this.drops = [];
      this.img = paintRoom();
      this.pillars = [];
      for (let i = 0, tries = 0; i < 2 + Math.floor(G.rnd(3)) && tries < 40; tries++) {
        const b = {x: 150 + G.rnd(320), y: 70 + G.rnd(300), w: 34 + G.rnd(20), h: 34 + G.rnd(20)};
        if (this.pillars.some(o => b.x < o.x + o.w + 50 && b.x + b.w + 50 > o.x && b.y < o.y + o.h + 50 && b.y + b.h + 50 > o.y)) continue;
        this.pillars.push(b); i++;
      }
      this.torches = [[160, 18], [480, 18], [160, H - 18], [480, H - 18]];
      Object.assign(this.p, {x: 56, y: 240});
      const mul = 1 + .3 * (this.floor - 1);
      if (this.room === 4) { this.pillars = []; this.spawn('golem', 470, 240, mul); this.msg('The Ember Golem wakes'); return; }
      const pool = ['slime', 'slime', 'bat'];
      if (this.room >= 1 || this.floor > 1) pool.push('archer');
      if (this.room >= 2 || this.floor > 1) pool.push('knight');
      const solids = this.solids();
      for (let i = 0; i < 3 + this.room + this.floor; i++) {
        let x, y, n = 0;
        do { x = 200 + G.rnd(380); y = 60 + G.rnd(360); } while ((inRect(x, y, solids) || G.dist(x, y, this.p.x, this.p.y) < 200) && ++n < 30);
        this.spawn(G.pick(pool), x, y, mul);
      }
      if (this.room === 0) this.msg(`Floor ${this.floor}`);
    },
    msg(t) { G.popText(this.parts, W / 2, H / 2 - 40, t, '#ffcf5c', 22); },
    spawn(type, x, y, mul) {
      const T = TYPES[type];
      this.enemies.push({type, x, y, r: T.r, hp: T.hp * mul, max: T.hp * mul, speed: T.speed, dmg: T.dmg * (1 + .2 * (mul - 1) / .3), xp: T.xp, color: T.color,
        t: 0, ph: G.rnd(6), cd: 1 + G.rnd(1), kx: 0, ky: 0, flash: 0, hop: 0, wind: 0, charge: 0, phase: 'walk', timer: 2, summon: 6, mul});
    },
    solids() {
      const s = [{x: 0, y: 0, w: W, h: WALL}, {x: 0, y: H - WALL, w: W, h: WALL}, {x: 0, y: 0, w: WALL, h: H},
        {x: W - WALL, y: 0, w: WALL, h: DOOR_Y}, {x: W - WALL, y: DOOR_Y + DOOR_H, w: WALL, h: H - DOOR_Y - DOOR_H}, ...this.pillars];
      if (!this.doorOpen) s.push({x: W - WALL, y: DOOR_Y, w: WALL, h: DOOR_H});
      return s;
    },
    attack(ang) {
      const p = this.p;
      if (p.swingCd > 0) return;
      p.swing = .2; p.swingCd = .34; p.swingAng = ang; p.hit = new Set(); G.sfx('swing');
    },
    key(k) {
      const p = this.p;
      if (k === 'j' || k === ' ') this.attack(p.face);
      if ((k === 'k' || k === 'Shift') && p.dashCd <= 0 && p.mana >= 20) { p.dash = .18; p.dashCd = .55; p.mana -= 20; G.sfx('swing'); }
      if ((k === 'q' || k === 'l') && p.mana >= 50) {
        p.mana -= 50; this.nova = .4; G.sfx('boom'); G.shake(6);
        for (const e of this.enemies) {
          const d = G.dist(p.x, p.y, e.x, e.y);
          if (d < 130 + e.r) this.hitEnemy(e, 25 + p.lvl * 5, (e.x - p.x) / (d || 1), (e.y - p.y) / (d || 1), 380);
        }
      }
    },
    pointer(type, x, y) { if (type === 'down') this.attack(Math.atan2(y - this.p.y, x - this.p.x)); },
    hitEnemy(e, dmg, nx, ny, kb = 240) {
      if (e.hp <= 0) return;
      const crit = Math.random() < .1;
      dmg = Math.round(dmg * (crit ? 2 : 1) * (.9 + G.rnd(.2)));
      e.hp -= dmg; e.flash = .1;
      if (e.type !== 'golem') { e.kx = nx * kb; e.ky = ny * kb; }
      G.popText(this.parts, e.x, e.y - e.r - 6, crit ? `${dmg}!` : String(dmg), crit ? '#ffcf5c' : '#ffffff', crit ? 18 : 14);
      G.sfx('hit', .7);
      if (e.hp > 0) return;
      G.burst(this.parts, e.x, e.y, e.color, e.type === 'golem' ? 60 : 16, e.type === 'golem' ? 320 : 170);
      G.score += e.xp * 10;
      for (let i = 0; i < Math.ceil(e.xp / 3); i++) this.drops.push({type: 'orb', x: e.x + G.rnd(20) - 10, y: e.y + G.rnd(20) - 10});
      if (Math.random() < .18) this.drops.push({type: 'potion', x: e.x, y: e.y});
      if (e.type === 'golem') {
        G.score += 500 * this.floor; G.shake(14, .7); G.sfx('win');
        this.stairs = {x: W / 2, y: H / 2}; this.msg('Floor cleared! Take the stairs.');
        this.enemies = this.enemies.filter(o => o === e);
      }
    },
    hurt(dmg, sx, sy) {
      const p = this.p;
      if (p.inv > 0 || p.dash > 0 || G.state !== 'play') return;
      p.hp -= Math.round(dmg); p.inv = .7;
      const d = G.dist(sx, sy, p.x, p.y) || 1; p.x += (p.x - sx) / d * 14; p.y += (p.y - sy) / d * 14;
      G.shake(6); G.flash(); G.sfx('hurt');
      if (p.hp <= 0) { p.hp = 0; G.end('Fallen in the keep'); }
    },
    shoot(x, y, dx, dy, speed, dmg, color, kind) { this.shots.push({x, y, vx: dx * speed, vy: dy * speed, dmg, color, kind, r: kind === 'fire' ? 7 : 4}); },
    golem(e, dt, dx, dy, d) {
      e.mx = e.my = 0; e.timer -= dt;
      if (e.phase === 'walk') {
        e.mx = dx / d * e.speed; e.my = dy / d * e.speed;
        if (e.timer <= 0) { e.phase = G.pick(['slam', 'volley']); e.timer = e.phase === 'slam' ? .9 : .6; }
      } else if (e.timer <= 0) {
        if (e.phase === 'slam') { this.rings.push({x: e.x, y: e.y, r: e.r, dmg: 18 * e.mul, hit: false}); G.shake(10, .4); G.sfx('boom'); }
        else {
          const n = e.hp < e.max / 2 ? 14 : 10;
          for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n + e.t; this.shoot(e.x, e.y, Math.cos(a), Math.sin(a), 170, 12 * e.mul, '#ff9f5c', 'fire'); }
          G.sfx('laser');
        }
        e.phase = 'walk'; e.timer = 2.2;
      }
      if (e.hp < e.max / 2 && (e.summon -= dt) <= 0) {
        e.summon = 6;
        for (const oy of [-60, 60]) this.spawn('bat', e.x - 40, e.y + oy, e.mul);
      }
    },
    update(dt) {
      const p = this.p;
      p.inv -= dt; p.dashCd -= dt; p.swingCd -= dt; this.nova -= dt;
      p.mana = Math.min(100, p.mana + 12 * dt);
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      if (mx || my) { const l = Math.hypot(mx, my); p.dx = mx / l; p.dy = my / l; p.face = Math.atan2(p.dy, p.dx); }
      if (p.dash > 0) { p.dash -= dt; p.x += p.dx * 520 * dt; p.y += p.dy * 520 * dt; if (Math.random() < .6) G.burst(this.parts, p.x, p.y, '#5cb8ff', 1, 30); }
      else if (mx || my) { p.x += p.dx * 170 * dt; p.y += p.dy * 170 * dt; }
      const solids = this.solids();
      push(p, solids);
      if (this.doorOpen && p.x > W - 14) return this.newRoom();
      if (this.stairs && G.dist(p.x, p.y, this.stairs.x, this.stairs.y) < 26) { this.floor++; this.room = -1; G.score += 300; G.sfx('power'); return this.newRoom(); }
      // sword arc: hits each enemy once per swing
      if (p.swing > 0) {
        p.swing -= dt;
        const dmg = 10 + p.lvl * 3;
        for (const e of this.enemies) {
          if (p.hit.has(e) || e.hp <= 0) continue;
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          if (d > 52 + e.r) continue;
          let da = Math.atan2(dy, dx) - p.swingAng; da = Math.atan2(Math.sin(da), Math.cos(da));
          if (Math.abs(da) > 1.2 && d > e.r + 8) continue;
          p.hit.add(e); this.hitEnemy(e, dmg, dx / d, dy / d);
        }
      }
      for (const e of this.enemies) {
        e.t += dt; e.cd -= dt; e.flash -= dt;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        let vx = 0, vy = 0;
        if (e.type === 'slime') {
          if (e.cd <= 0) { e.cd = .9 + G.rnd(.4); e.hop = .35; e.hx = dx / d; e.hy = dy / d; }
          if (e.hop > 0) { e.hop -= dt; vx = e.hx * 170; vy = e.hy * 170; }
        } else if (e.type === 'bat') {
          vx = dx / d * e.speed + Math.cos(e.t * 5 + e.ph) * 80; vy = dy / d * e.speed + Math.sin(e.t * 6 + e.ph) * 80;
        } else if (e.type === 'archer') {
          const want = d < 170 ? -1 : d > 260 ? 1 : 0, side = Math.sin(e.t * .8 + e.ph) * 50;
          vx = dx / d * e.speed * want - dy / d * side; vy = dy / d * e.speed * want + dx / d * side;
          if (e.cd <= 0 && d < 400) { e.cd = 1.8 + G.rnd(.6); this.shoot(e.x, e.y, dx / d, dy / d, 250, 10 * e.mul, '#e8e2d0', 'arrow'); G.sfx('shoot', .5); }
        } else if (e.type === 'knight') {
          if (e.charge > 0) { e.charge -= dt; vx = e.cx * 360; vy = e.cy * 360; }
          else if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.charge = .45; e.cx = dx / d; e.cy = dy / d; G.sfx('swing'); } }
          else { vx = dx / d * e.speed; vy = dy / d * e.speed; if (d < 170 && e.cd <= 0) { e.wind = .5; e.cd = 2.6; } }
        } else { this.golem(e, dt, dx, dy, d); vx = e.mx; vy = e.my; }
        e.x += (vx + e.kx) * dt; e.y += (vy + e.ky) * dt;
        const decay = Math.max(0, 1 - dt * 8); e.kx *= decay; e.ky *= decay;
        push(e, solids);
        if (d < e.r + p.r) this.hurt(e.dmg, e.x, e.y);
        if (G.state !== 'play') return;
      }
      for (let i = 0; i < this.enemies.length; i++) for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, o = a.r + b.r - d;
        if (o > 0) { a.x -= dx / d * o / 2; a.y -= dy / d * o / 2; b.x += dx / d * o / 2; b.y += dy / d * o / 2; }
      }
      const wasAlive = this.enemies.length;
      this.enemies = this.enemies.filter(e => e.hp > 0);
      if (wasAlive && !this.enemies.length && this.room < 4 && !this.doorOpen) { this.doorOpen = true; G.sfx('power'); this.msg('The door opens'); }
      for (const s of this.shots) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (inRect(s.x, s.y, solids)) s.dead = true;
        else if (G.dist(s.x, s.y, p.x, p.y) < p.r + s.r) { s.dead = true; this.hurt(s.dmg, s.x, s.y); }
      }
      this.shots = this.shots.filter(s => !s.dead);
      for (const r of this.rings) {
        r.r += 260 * dt;
        if (!r.hit && Math.abs(G.dist(r.x, r.y, p.x, p.y) - r.r) < 14) { r.hit = true; this.hurt(r.dmg, r.x, r.y); }
      }
      this.rings = this.rings.filter(r => r.r < 260);
      for (const o of this.drops) {
        const d = G.dist(o.x, o.y, p.x, p.y);
        if (o.type === 'orb' && d < 130) { o.x += (p.x - o.x) / d * 320 * dt; o.y += (p.y - o.y) / d * 320 * dt; }
        if (d > p.r + 8) continue;
        o.got = true;
        if (o.type === 'potion') { p.hp = Math.min(p.max, p.hp + 30); G.popText(this.parts, p.x, p.y - 20, '+30 HP', '#ff6b8b'); G.sfx('power'); }
        else {
          p.xp += 3; G.sfx('coin', .4);
          while (p.xp >= 30 + p.lvl * 20) {
            p.xp -= 30 + p.lvl * 20; p.lvl++; p.max += 15; p.hp = p.max; p.mana = 100;
            G.popText(this.parts, p.x, p.y - 34, 'LEVEL UP', '#ffcf5c', 20); G.sfx('win');
          }
        }
      }
      this.drops = this.drops.filter(o => !o.got);
    },
    draw(ctx, dt) {
      const p = this.p, now = performance.now() / 1000;
      ctx.drawImage(this.img, 0, 0, W, H);
      // door
      if (this.doorOpen) {
        G.rr(W - WALL, DOOR_Y, WALL, DOOR_H, 0, '#0b0910');
        G.text('›', W - 46 + Math.sin(now * 6) * 4, DOOR_Y + 44, {size: 34, color: '#ffcf5c', weight: 700});
      } else {
        G.rr(W - WALL, DOOR_Y, WALL, DOOR_H, 0, '#4a3524');
        ctx.fillStyle = '#2b1e14'; for (let i = 0; i < 4; i++) ctx.fillRect(W - WALL + 4 + i * 7, DOOR_Y + 4, 3, DOOR_H - 8);
      }
      if (this.stairs) {
        for (let i = 0; i < 5; i++) G.rr(this.stairs.x - 26 + i * 3, this.stairs.y - 20 + i * 8, 52 - i * 6, 8, 2, `hsl(260 10% ${30 - i * 4}%)`);
      }
      for (const b of this.pillars) {
        G.rr(b.x, b.y + 6, b.w, b.h, 6, 'rgba(0,0,0,.4)');
        G.rr(b.x, b.y, b.w, b.h, 6, '#4b4258'); G.rr(b.x + 4, b.y + 4, b.w - 8, 8, 3, '#5d5370');
      }
      for (const o of this.drops) {
        if (o.type === 'orb') G.circle(o.x, o.y, 4, '#7ff0d2');
        else { G.rr(o.x - 6, o.y - 8, 12, 14, 4, '#ff6b8b'); G.rr(o.x - 3, o.y - 12, 6, 5, 2, '#e8e2d0'); }
      }
      for (const r of this.rings) { ctx.strokeStyle = `rgba(255,159,92,${1 - r.r / 260})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); }
      for (const e of this.enemies) this.drawEnemy(ctx, e, now);
      // hero
      const blink = p.inv > 0 && Math.floor(p.inv * 16) % 2;
      if (!blink && G.state !== 'over') {
        G.circle(p.x, p.y + 10, 11, 'rgba(0,0,0,.35)');
        G.circle(p.x, p.y, 12, '#3d7bd9'); G.circle(p.x, p.y - 4, 8, '#f2d3b1');
        ctx.fillStyle = '#9aa0c8'; ctx.beginPath(); ctx.arc(p.x, p.y - 6, 9, Math.PI, 0); ctx.fill();
        G.circle(p.x + Math.cos(p.face) * 4, p.y - 3 + Math.sin(p.face) * 2, 1.6, '#1b1a33');
      }
      if (p.swing > 0) {
        const t = 1 - p.swing / .2, a0 = p.swingAng - 1.2, a = a0 + 2.4 * t;
        ctx.strokeStyle = `rgba(255,255,255,${.6 * (1 - t) + .2})`; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(p.x, p.y, 40, a0, a); ctx.stroke();
        ctx.strokeStyle = '#e8e9ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 12, p.y + Math.sin(a) * 12); ctx.lineTo(p.x + Math.cos(a) * 52, p.y + Math.sin(a) * 52); ctx.stroke();
      }
      if (this.nova > 0) { ctx.strokeStyle = `rgba(255,159,92,${this.nova * 2})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(p.x, p.y, 130 * (1 - this.nova / .4) + 20, 0, Math.PI * 2); ctx.stroke(); }
      for (const s of this.shots) {
        if (s.kind === 'fire') { G.circle(s.x, s.y, 7, '#ff9f5c'); G.circle(s.x, s.y, 3.5, '#fff3c4'); }
        else { ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .04, s.y - s.vy * .04); ctx.stroke(); }
      }
      // torch light: darken the room, then cut soft holes around light sources
      lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
      lctx.fillStyle = 'rgba(6,4,14,.6)'; lctx.fillRect(0, 0, W, H);
      lctx.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r) => { const g = lctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2); };
      hole(p.x, p.y, 190);
      for (const [x, y] of this.torches) hole(x, y, 120 + Math.sin(now * 9 + x) * 6);
      for (const s of this.shots) if (s.kind === 'fire') hole(s.x, s.y, 45);
      if (this.doorOpen) hole(W - 16, DOOR_Y + DOOR_H / 2, 90);
      ctx.drawImage(lightCv, 0, 0, W, H);
      for (const [x, y] of this.torches) {
        G.rr(x - 3, y - 6, 6, 14, 2, '#5a3d2a');
        G.circle(x, y - 10 + Math.sin(now * 12 + x) * 1.5, 6, '#ff9f5c'); G.circle(x, y - 10, 3, '#fff3c4');
      }
      G.fx(this.parts, dt);
      G.panel(8, 8, 220, 74);
      G.bar({x: 18, y: 18, w: 200, h: 14, v: p.hp, max: p.max, color: '#e04e5f', label: `HP ${Math.ceil(p.hp)}/${p.max}`, id: 'hp'});
      G.bar({x: 18, y: 40, w: 200, h: 12, v: p.mana, max: 100, color: '#5cb8ff', label: 'MANA'});
      G.bar({x: 18, y: 60, w: 200, h: 12, v: p.xp, max: 30 + p.lvl * 20, color: '#ffcf5c', label: `LV ${p.lvl}`});
      G.text(`FLOOR ${this.floor}  ·  ROOM ${Math.min(this.room + 1, 5)}/5`, W - 14, 26, {align: 'right', size: 12, weight: 700, color: '#c4c8ee', shadow: true});
      const boss = this.enemies.find(e => e.type === 'golem');
      if (boss) { G.text('EMBER GOLEM', W / 2, H - 30, {align: 'center', size: 12, weight: 700, shadow: true}); G.bar({x: 120, y: H - 24, w: W - 240, h: 10, v: boss.hp, max: boss.max, color: '#ff9f5c', id: 'boss'}); }
    },
    drawEnemy(ctx, e, now) {
      const c = e.flash > 0 ? '#ffffff' : e.color;
      G.circle(e.x, e.y + e.r * .8, e.r * .9, 'rgba(0,0,0,.3)');
      if (e.type === 'slime') {
        const sq = e.hop > 0 ? 1.15 : 1 + Math.sin(e.t * 6) * .06;
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(e.x, e.y + 2, e.r * sq, e.r / sq, 0, 0, Math.PI * 2); ctx.fill();
        G.circle(e.x - 4, e.y - 1, 2.2, '#123'); G.circle(e.x + 4, e.y - 1, 2.2, '#123');
      } else if (e.type === 'bat') {
        const f = Math.sin(e.t * 24) * 7;
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(e.x - 18, e.y - f); ctx.quadraticCurveTo(e.x, e.y - 2, e.x + 18, e.y - f); ctx.quadraticCurveTo(e.x, e.y + 8, e.x - 18, e.y - f); ctx.fill();
        G.circle(e.x, e.y + 1, 6, c); G.circle(e.x - 2, e.y, 1.4, '#ff6b8b'); G.circle(e.x + 2, e.y, 1.4, '#ff6b8b');
      } else if (e.type === 'archer') {
        G.rr(e.x - 7, e.y - 2, 14, 14, 4, '#bdb6a3'); G.circle(e.x, e.y - 8, 8, c);
        G.circle(e.x - 3, e.y - 9, 2, '#1b1a33'); G.circle(e.x + 3, e.y - 9, 2, '#1b1a33');
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x + 10, e.y + 2, 9, -1.3, 1.3); ctx.stroke();
      } else if (e.type === 'knight') {
        const warn = e.wind > 0 && Math.floor(e.wind * 20) % 2;
        G.rr(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, 6, warn ? '#ff6b8b' : c);
        G.rr(e.x - 9, e.y - 5, 18, 4, 2, '#1b1a33'); G.rr(e.x - 3, e.y - e.r - 6, 6, 8, 2, '#e04e5f');
      } else {
        G.circle(e.x, e.y, e.r, c); G.circle(e.x - 12, e.y - 10, 9, e.flash > 0 ? '#fff' : '#5a463d'); G.circle(e.x + 14, e.y + 8, 11, e.flash > 0 ? '#fff' : '#5a463d');
        ctx.strokeStyle = '#ff9f5c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x - 20, e.y + 4); ctx.lineTo(e.x - 4, e.y + 12); ctx.lineTo(e.x + 6, e.y - 6); ctx.lineTo(e.x + 22, e.y - 2); ctx.stroke();
        const glow = e.phase !== 'walk' ? '#fff3c4' : '#ff9f5c';
        G.circle(e.x - 9, e.y - 8, 4, glow); G.circle(e.x + 9, e.y - 8, 4, glow);
      }
      if (e.hp < e.max && e.type !== 'golem') G.bar({x: e.x - 16, y: e.y - e.r - 12, w: 32, h: 4, v: e.hp, max: e.max, color: '#e04e5f'});
    }
  });
})();

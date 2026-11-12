(() => {
  const W = 640, H = 480, WORLD = 1600, CYCLE = 90, NIGHT = 62;
  const light = document.createElement('canvas'); light.width = W; light.height = H;
  const lctx = light.getContext('2d');
  const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };

  GameBox.register({
    id: 'survival', title: 'Frostbound', genre: 'Simulation', kind: 'Winter survival', w: W, h: H,
    desc: 'Stranded in a frozen forest, keep three bars alive: health, warmth and hunger. Chop trees for wood, pick berries, hunt rabbits and keep a campfire burning. When night falls, wolves come out of the dark, and only fire keeps them at bay. How many days can you last?',
    controls: [['W A S D / Arrows', 'Walk'], ['Shift', 'Run'], ['Space / E', 'Attack, chop or pick (whatever is in front of you)'], ['B', 'Build a campfire (5 wood)'], ['F', 'Feed the nearest fire (2 wood)'], ['Q', 'Eat (meat, then berries)']],
    info() { return `Day ${this.day} · ${this.isNight() ? 'Night' : 'Day'}`; },
    init() {
      this.p = {x: WORLD / 2, y: WORLD / 2, hp: 100, warm: 100, food: 100, face: 0, swing: 0};
      this.inv = {wood: 3, berry: 2, meat: 0};
      this.day = 1; this.t = 8; this.parts = []; this.steps = []; this.stepT = 0; this.wasNight = false;
      this.fires = [{x: WORLD / 2 + 40, y: WORLD / 2, fuel: 70}];
      this.trees = []; this.bushes = []; this.rocks = []; this.rabbits = []; this.wolves = [];
      for (let i = 0; i < 150; i++) { const x = G.rnd(WORLD), y = G.rnd(WORLD); if (G.dist(x, y, WORLD / 2, WORLD / 2) > 90) this.trees.push({x, y, hp: 3, s: .8 + G.rnd(.5)}); }
      for (let i = 0; i < 45; i++) this.bushes.push({x: G.rnd(WORLD), y: G.rnd(WORLD), berries: 3, regrow: 0});
      for (let i = 0; i < 30; i++) this.rocks.push({x: G.rnd(WORLD), y: G.rnd(WORLD), r: 8 + G.rnd(10)});
      for (let i = 0; i < 14; i++) this.rabbits.push(this.rabbit());
      this.snow = Array.from({length: 90}, () => ({x: G.rnd(W), y: G.rnd(H), s: .5 + G.rnd(1)}));
      this.msg = 'Gather wood and keep the fire burning.'; this.msgT = 5;
    },
    rabbit() { return {x: G.rnd(WORLD), y: G.rnd(WORLD), vx: 0, vy: 0, t: 0, hp: 1}; },
    isNight() { return this.t >= NIGHT; },
    dark() { const t = this.t; return t < NIGHT - 6 ? 0 : t < NIGHT ? (t - NIGHT + 6) / 6 : t > CYCLE - 5 ? (CYCLE - t) / 5 : 1; },
    nearFire(x, y, r = 120) { return this.fires.find(f => f.fuel > 0 && G.dist(x, y, f.x, f.y) < r); },
    say(t) { this.msg = t; this.msgT = 3; },
    key(k) {
      const p = this.p, inv = this.inv;
      if (k === ' ' || k === 'e') this.act();
      if (k === 'b') {
        if (inv.wood < 5) return this.say('You need 5 wood for a campfire.');
        inv.wood -= 5; this.fires.push({x: p.x + Math.cos(p.face) * 30, y: p.y + Math.sin(p.face) * 30, fuel: 60}); G.sfx('power'); this.say('Campfire built.');
      }
      if (k === 'f') {
        const f = this.fires.filter(f => G.dist(p.x, p.y, f.x, f.y) < 80).sort((a, b) => a.fuel - b.fuel)[0];
        if (!f) return this.say('Stand next to a fire to feed it.');
        if (inv.wood < 2) return this.say('You need 2 wood.');
        inv.wood -= 2; f.fuel = Math.min(150, f.fuel + 45); G.sfx('crunch', .5); G.burst(this.parts, f.x, f.y, '#ff9f5c', 10);
      }
      if (k === 'q') {
        if (inv.meat) { inv.meat--; p.food = Math.min(100, p.food + 35); G.sfx('coin'); }
        else if (inv.berry) { inv.berry--; p.food = Math.min(100, p.food + 12); G.sfx('coin'); }
        else this.say('Nothing to eat. Pick berries or hunt rabbits.');
      }
    },
    act() {
      const p = this.p, fx = Math.cos(p.face), fy = Math.sin(p.face);
      p.swing = .2; G.sfx('swing', .6);
      const prey = [...this.wolves, ...this.rabbits].find(a => { const d = G.dist(p.x, p.y, a.x, a.y); return d < 52 && ((a.x - p.x) * fx + (a.y - p.y) * fy) / (d || 1) > .3; });
      if (prey) {
        prey.hp -= this.wolves.includes(prey) ? 15 : 1; prey.flash = .1;
        const d = G.dist(p.x, p.y, prey.x, prey.y) || 1; prey.x += (prey.x - p.x) / d * 20; prey.y += (prey.y - p.y) / d * 20;
        G.sfx('hit'); G.burst(this.parts, prey.x, prey.y, '#c4202c', 6);
        if (prey.hp <= 0) {
          if (this.wolves.includes(prey)) { G.score += 100; this.inv.meat++; this.wolves = this.wolves.filter(w => w !== prey); this.say('Wolf down. +1 meat'); }
          else { G.score += 20; this.inv.meat++; Object.assign(prey, this.rabbit()); this.say('+1 meat'); }
        }
        return;
      }
      const tree = this.trees.find(t => t.hp > 0 && G.dist(p.x, p.y, t.x, t.y) < 48);
      if (tree) {
        tree.hp--; G.sfx('crunch', .6); G.burst(this.parts, tree.x, tree.y - 10, '#e8eef5', 6); tree.shake = .2;
        if (tree.hp <= 0) { this.inv.wood += 3; this.say('+3 wood'); }
        return;
      }
      const bush = this.bushes.find(b => b.berries > 0 && G.dist(p.x, p.y, b.x, b.y) < 44);
      if (bush) { bush.berries--; this.inv.berry++; if (!bush.berries) bush.regrow = 45; G.sfx('coin', .5); }
    },
    update(dt) {
      const p = this.p;
      this.msgT -= dt; p.swing -= dt;
      this.t += dt;
      if (this.t >= CYCLE) { this.t = 0; this.day++; G.score += 500; G.sfx('win'); this.say(`Day ${this.day}. You survived the night.`); }
      const night = this.isNight();
      if (night && !this.wasNight) {
        for (let i = 0; i < 2 + this.day; i++) { const a = G.rnd(Math.PI * 2); this.wolves.push({x: p.x + Math.cos(a) * 420, y: p.y + Math.sin(a) * 420, hp: 30, cd: 0, flash: 0}); }
        this.say('Night falls. Wolves are howling. Stay near the fire.'); G.sfx('lose', .6);
      }
      if (!night && this.wasNight) this.wolves = [];
      this.wasNight = night;
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      const run = G.keys.Shift;
      if (mx || my) {
        const l = Math.hypot(mx, my), sp = (run ? 175 : 115) * dt;
        p.x = G.clamp(p.x + mx / l * sp, 10, WORLD - 10); p.y = G.clamp(p.y + my / l * sp, 10, WORLD - 10); p.face = Math.atan2(my, mx);
        if ((this.stepT -= dt) <= 0) { this.stepT = .18; this.steps.push({x: p.x, y: p.y + 8, life: 8}); }
      }
      for (const t of this.trees) if (t.hp > 0) { const d = G.dist(p.x, p.y, t.x, t.y); if (d < 14 * t.s + 8) { p.x = t.x + (p.x - t.x) / d * (14 * t.s + 8); p.y = t.y + (p.y - t.y) / d * (14 * t.s + 8); } }
      const fire = this.nearFire(p.x, p.y);
      p.warm = G.clamp(p.warm + (fire ? 10 : night ? -3 : -1.4) * dt, 0, 100);
      p.food = Math.max(0, p.food - (run && (mx || my) ? 1.6 : .9) * dt);
      if (p.warm <= 0) p.hp -= 5 * dt;
      if (p.food <= 0) p.hp -= 3 * dt;
      if (p.warm > 50 && p.food > 50) p.hp = Math.min(100, p.hp + dt);
      if (p.hp <= 0) { p.hp = 0; return G.end(p.warm <= 0 ? 'Frozen' : p.food <= 0 ? 'Starved' : 'Hunted'); }
      for (const f of this.fires) f.fuel = Math.max(0, f.fuel - dt);
      for (const b of this.bushes) if (b.regrow > 0 && (b.regrow -= dt) <= 0) b.berries = 3;
      for (const r of this.rabbits) {
        r.t -= dt; const d = G.dist(p.x, p.y, r.x, r.y);
        if (d < 120) { r.vx = (r.x - p.x) / d * 140; r.vy = (r.y - p.y) / d * 140; }
        else if (r.t <= 0) { r.t = 1 + G.rnd(2); const a = G.rnd(Math.PI * 2); r.vx = Math.cos(a) * 30; r.vy = Math.sin(a) * 30; }
        r.x = G.clamp(r.x + r.vx * dt, 0, WORLD); r.y = G.clamp(r.y + r.vy * dt, 0, WORLD);
      }
      for (const w of this.wolves) {
        w.cd -= dt; w.flash -= dt;
        const f = this.nearFire(w.x, w.y, 95), d = G.dist(p.x, p.y, w.x, w.y) || 1;
        let vx, vy;
        if (f) { const fd = G.dist(w.x, w.y, f.x, f.y) || 1; vx = (w.x - f.x) / fd * 120; vy = (w.y - f.y) / fd * 120; }
        else { vx = (p.x - w.x) / d * 108; vy = (p.y - w.y) / d * 108; }
        w.x += vx * dt; w.y += vy * dt; w.face = Math.atan2(vy, vx);
        if (d < 22 && w.cd <= 0) { w.cd = 1; p.hp -= 10; G.shake(6); G.flash(); G.sfx('hurt'); }
      }
      for (const s of this.steps) s.life -= dt;
      this.steps = this.steps.filter(s => s.life > 0);
    },
    draw(ctx, dt) {
      const p = this.p, ox = Math.round(W / 2 - p.x), oy = Math.round(H / 2 - p.y), now = performance.now() / 1000;
      G.clear('#e4ebf2');
      ctx.save(); ctx.translate(ox, oy);
      const x0 = Math.floor(-ox / 64) - 1, y0 = Math.floor(-oy / 64) - 1;
      for (let gx = x0; gx < x0 + 12; gx++) for (let gy = y0; gy < y0 + 10; gy++) {
        const h = hash(gx, gy);
        if (h > .55) { ctx.fillStyle = '#d8e1ea'; ctx.beginPath(); ctx.ellipse(gx * 64 + 32, gy * 64 + 32, 20 + h * 14, 8, h * 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.strokeStyle = '#8a94a8'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, WORLD, WORLD);
      for (const s of this.steps) { ctx.globalAlpha = s.life / 8 * .5; G.circle(s.x, s.y, 3, '#b9c4d2'); }
      ctx.globalAlpha = 1;
      const vis = o => o.x > p.x - W / 2 - 60 && o.x < p.x + W / 2 + 60 && o.y > p.y - H / 2 - 60 && o.y < p.y + H / 2 + 80;
      for (const r of this.rocks) if (vis(r)) { ctx.fillStyle = '#9aa3b2'; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * .7, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f3f6fa'; ctx.beginPath(); ctx.ellipse(r.x - 2, r.y - r.r * .4, r.r * .7, r.r * .3, 0, 0, Math.PI * 2); ctx.fill(); }
      for (const b of this.bushes) if (vis(b)) { G.circle(b.x, b.y, 14, '#3f6b4a'); G.circle(b.x - 6, b.y - 6, 9, '#4f7d58'); for (let i = 0; i < b.berries; i++) G.circle(b.x - 6 + i * 6, b.y + 2 - (i % 2) * 6, 3, '#d9374b'); }
      for (const f of this.fires) if (vis(f)) {
        for (const a of [.5, -.5]) { ctx.save(); ctx.translate(f.x, f.y + 4); ctx.rotate(a); G.rr(-12, -3, 24, 6, 3, '#6b4a33'); ctx.restore(); }
        if (f.fuel > 0) { const fl = Math.sin(now * 14 + f.x) * 2; ctx.fillStyle = '#ff9f5c'; ctx.beginPath(); ctx.moveTo(f.x - 9, f.y + 2); ctx.quadraticCurveTo(f.x, f.y - 26 - fl, f.x + 9, f.y + 2); ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.moveTo(f.x - 4, f.y + 2); ctx.quadraticCurveTo(f.x, f.y - 14 + fl, f.x + 4, f.y + 2); ctx.fill(); }
        G.bar({x: f.x - 16, y: f.y + 12, w: 32, h: 4, v: f.fuel, max: 150, color: '#ff9f5c'});
      }
      const things = [...this.trees.filter(vis).map(t => ['tree', t]), ...this.rabbits.filter(vis).map(r => ['rabbit', r]), ...this.wolves.filter(vis).map(w => ['wolf', w]), ['me', p]];
      things.sort((a, b) => a[1].y - b[1].y);
      for (const [kind, o] of things) {
        if (kind === 'tree') {
          if (o.hp <= 0) { G.rr(o.x - 6, o.y - 6, 12, 10, 3, '#6b4a33'); G.rr(o.x - 7, o.y - 8, 14, 4, 2, '#f3f6fa'); continue; }
          const s = o.s, sh = (o.shake = (o.shake || 0) - dt) > 0 ? Math.sin(now * 60) * 2 : 0;
          G.circle(o.x + 6, o.y + 4, 14 * s, 'rgba(70,90,120,.18)');
          G.rr(o.x - 4 * s, o.y - 12 * s, 8 * s, 14 * s, 2, '#5a3d2a');
          for (let k = 0; k < 3; k++) {
            const y = o.y - 14 * s - k * 16 * s, w = (22 - k * 5) * s;
            ctx.fillStyle = '#2f5a45'; ctx.beginPath(); ctx.moveTo(o.x - w + sh, y); ctx.lineTo(o.x + sh, y - 22 * s); ctx.lineTo(o.x + w + sh, y); ctx.fill();
            ctx.fillStyle = '#f3f6fa'; ctx.beginPath(); ctx.moveTo(o.x - w * .55 + sh, y - 10 * s); ctx.lineTo(o.x + sh, y - 22 * s); ctx.lineTo(o.x + w * .55 + sh, y - 10 * s); ctx.fill();
          }
        } else if (kind === 'rabbit') {
          G.circle(o.x, o.y, 7, o.flash > 0 ? '#ff6b8b' : '#f7f7f2'); G.circle(o.x + 5, o.y - 5, 5, '#f7f7f2');
          G.rr(o.x + 4, o.y - 15, 3, 9, 2, '#f7f7f2'); G.rr(o.x + 8, o.y - 14, 3, 8, 2, '#f7f7f2'); G.circle(o.x + 7, o.y - 6, 1.2, '#1b1a33');
        } else if (kind === 'wolf') {
          ctx.save(); ctx.translate(o.x, o.y); ctx.scale(Math.cos(o.face || 0) < 0 ? -1 : 1, 1);
          G.rr(-16, -10, 30, 14, 7, o.flash > 0 ? '#ff6b8b' : '#6b7280'); G.circle(14, -12, 8, '#6b7280');
          ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.moveTo(10, -18); ctx.lineTo(13, -26); ctx.lineTo(16, -18); ctx.fill();
          G.rr(-20, -10, 8, 4, 2, '#6b7280'); for (const lx of [-12, -4, 4, 10]) G.rr(lx, 2, 3, 8, 1, '#4b5260');
          G.circle(17, -13, 1.6, '#ffcf5c');
          ctx.restore();
        } else {
          G.circle(o.x, o.y + 10, 9, 'rgba(70,90,120,.25)');
          G.rr(o.x - 9, o.y - 14, 18, 22, 7, '#e86b3a'); G.circle(o.x, o.y - 18, 8, '#f0c9a0');
          ctx.fillStyle = '#c4364a'; ctx.beginPath(); ctx.arc(o.x, o.y - 20, 9, Math.PI, 0); ctx.fill(); G.circle(o.x, o.y - 30, 3, '#f3f6fa');
          const sa = o.swing > 0 ? (1 - o.swing / .2) * 14 : 0;
          ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x, o.y - 4); ctx.lineTo(o.x + Math.cos(o.face) * (22 + sa), o.y - 4 + Math.sin(o.face) * (22 + sa)); ctx.stroke();
          G.circle(o.x + Math.cos(o.face) * (24 + sa), o.y - 4 + Math.sin(o.face) * (24 + sa), 2.5, '#c9ccd4');
        }
      }
      ctx.restore();
      // night darkness with firelight
      const dark = this.dark();
      if (dark > 0) {
        lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
        lctx.fillStyle = `rgba(8,12,34,${.82 * dark})`; lctx.fillRect(0, 0, W, H);
        lctx.globalCompositeOperation = 'destination-out';
        const hole = (x, y, r) => { const g = lctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.fillRect(x - r, y - r, r * 2, r * 2); };
        hole(W / 2, H / 2, 70);
        for (const f of this.fires) if (f.fuel > 0) hole(f.x + ox, f.y + oy, 130 + Math.sin(now * 10 + f.x) * 6);
        ctx.drawImage(light, 0, 0, W, H);
        for (const w of this.wolves) { const x = w.x + ox, y = w.y + oy; G.circle(x + 15, y - 13, 1.8, '#ffe08a'); }
      }
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const s of this.snow) { s.y += 40 * s.s * dt; s.x += Math.sin(now + s.y / 40) * 12 * dt; if (s.y > H) { s.y = -4; s.x = G.rnd(W); } ctx.fillRect(s.x, s.y, 2 * s.s, 2 * s.s); }
      G.fx(this.parts, dt);
      G.panel(8, 8, 200, 74);
      G.bar({x: 16, y: 16, w: 184, h: 14, v: p.hp, max: 100, color: '#e04e5f', label: `HEALTH ${Math.ceil(p.hp)}`, id: 'hp'});
      G.bar({x: 16, y: 38, w: 184, h: 14, v: p.warm, max: 100, color: p.warm < 25 ? '#9ad7ff' : '#ff9f5c', label: 'WARMTH'});
      G.bar({x: 16, y: 60, w: 184, h: 14, v: p.food, max: 100, color: '#7fbf4a', label: 'HUNGER'});
      G.panel(W - 196, 8, 188, 30, 8);
      G.text(`🪵 ${this.inv.wood}   🫐 ${this.inv.berry}   🍖 ${this.inv.meat}`, W - 186, 28, {size: 14, weight: 700});
      G.text(`DAY ${this.day}  ${this.isNight() ? '☾' : '☀'}`, W - 14, 58, {size: 14, align: 'right', weight: 700, color: dark > .5 ? '#e8e9ff' : '#1b2a3a', shadow: dark > .5});
      if (this.msgT > 0) { ctx.globalAlpha = Math.min(1, this.msgT); G.text(this.msg, W / 2, H - 22, {size: 14, align: 'center', weight: 700, color: dark > .5 ? '#ffffff' : '#1b2a3a', shadow: dark > .5}); ctx.globalAlpha = 1; }
    }
  });
})();

(() => {
  const W = 640, H = 480, WIN = 300, CELL = 40;
  const FOES = {
    bat: {hp: 8, r: 9, speed: 95, dmg: 5, xp: 1, color: '#8b7bff'},
    ghoul: {hp: 22, r: 12, speed: 62, dmg: 8, xp: 2, color: '#7fbf9a'},
    wraith: {hp: 60, r: 15, speed: 48, dmg: 12, xp: 5, color: '#c9ccff'},
    elite: {hp: 400, r: 24, speed: 55, dmg: 20, xp: 30, color: '#ff9f5c'},
    lord: {hp: 2600, r: 38, speed: 62, dmg: 30, xp: 100, color: '#e04e5f'}
  };
  const UPGRADES = [
    {id: 'bolt', name: 'Spark Bolt', text: '+6 damage, fires 12% faster', max: 6},
    {id: 'twin', name: 'Twin Spark', text: 'Fire one more bolt per volley', max: 3},
    {id: 'lantern', name: 'Lanterns', text: 'One more lantern circles you', max: 5},
    {id: 'aura', name: 'Ember Aura', text: 'Burn everything close to you', max: 5},
    {id: 'nova', name: 'Thorn Nova', text: 'Burst of thorns every few seconds', max: 5},
    {id: 'speed', name: 'Swift Boots', text: '+12% move speed', max: 4},
    {id: 'vital', name: 'Vitality', text: '+25 max health and heal fully', max: 5},
    {id: 'magnet', name: 'Lodestone', text: 'Pull experience from farther away', max: 4},
    {id: 'regen', name: 'Mending', text: 'Regenerate 1 health per second', max: 4}
  ];
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

  GameBox.register({
    id: 'survivor', title: 'Lantern Night', genre: 'Action', kind: 'Horde survival', w: W, h: H,
    desc: 'Survive five minutes of a cursed night. Your weapons fire on their own; you only move. Collect experience gems to level up and pick one of three upgrades each time. An elite arrives every minute and the Night Lord at four.',
    controls: [['W A S D / Arrows', 'Move'], ['1 2 3 / Click', 'Pick an upgrade when you level up']],
    info() { const t = Math.floor(this.t); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')} · Kills ${this.kills}`; },
    init() {
      this.p = {x: 0, y: 0, r: 12, hp: 100, max: 100, inv: 0, face: 1};
      this.lv = {bolt: 1, twin: 0, lantern: 0, aura: 0, nova: 0, speed: 0, vital: 0, magnet: 0, regen: 0};
      this.level = 1; this.xp = 0; this.t = 0; this.kills = 0; this.spawnT = 0; this.elites = 1; this.lordDone = false;
      this.foes = []; this.bolts = []; this.thorns = []; this.gems = []; this.parts = [];
      this.boltT = 0; this.novaT = 3; this.auraT = 0; this.spin = 0; this.choice = null;
    },
    need() { return 5 + this.level * 4; },
    spawn(type) {
      const F = FOES[type], a = G.rnd(Math.PI * 2), d = 380 + G.rnd(60), mul = 1 + this.t / 120;
      this.foes.push({type, x: this.p.x + Math.cos(a) * d, y: this.p.y + Math.sin(a) * d, r: F.r, hp: F.hp * (type === 'lord' ? 1 : mul), max: F.hp * (type === 'lord' ? 1 : mul),
        speed: F.speed, dmg: F.dmg, xp: F.xp, color: F.color, flash: 0, ph: G.rnd(6)});
    },
    offer() {
      const opts = G.shuffle(UPGRADES.filter(u => this.lv[u.id] < u.max)).slice(0, 3);
      this.choice = opts.length ? opts : null;
      if (this.choice) G.sfx('power');
    },
    take(i) {
      const u = this.choice?.[i]; if (!u) return;
      this.lv[u.id]++; this.choice = null; G.sfx('select');
      if (u.id === 'vital') { this.p.max += 25; this.p.hp = this.p.max; }
      if (this.xp >= this.need()) { this.xp -= this.need(); this.level++; this.offer(); }
    },
    key(k) { if (this.choice && '123'.includes(k)) this.take(+k - 1); },
    pointer(type, x, y) {
      if (type !== 'down' || !this.choice) return;
      this.choice.forEach((u, i) => { const cx = W / 2 + (i - 1) * 190; if (Math.abs(x - cx) < 85 && Math.abs(y - 250) < 90) this.take(i); });
    },
    hit(f, dmg, src) {
      f.hp -= dmg; f.flash = .08;
      if (src) { const d = G.dist(f.x, f.y, src.x, src.y) || 1; f.x += (f.x - src.x) / d * 6; f.y += (f.y - src.y) / d * 6; }
      if (f.hp > 0) return;
      this.kills++; G.score += f.xp * 5;
      this.gems.push({x: f.x, y: f.y, v: f.xp});
      if (f.type === 'elite') { this.gems.push({x: f.x + 10, y: f.y, v: 15, big: true}); G.sfx('boom'); }
      if (f.type === 'lord') { G.score += 3000; G.sfx('win'); G.shake(14, .6); G.popText(this.parts, f.x - this.p.x + W / 2, f.y - this.p.y + H / 2, 'NIGHT LORD SLAIN', '#ffcf5c', 22); }
      if (Math.random() < .3) G.burst(this.parts, f.x - this.p.x + W / 2, f.y - this.p.y + H / 2, f.color, 6);
    },
    update(dt) {
      if (this.choice) return; // the night waits while you choose
      const p = this.p, L = this.lv;
      this.t += dt; p.inv -= dt;
      if (this.t >= WIN) { G.score += 5000; return G.end('Dawn breaks!'); }
      p.hp = Math.min(p.max, p.hp + L.regen * dt);
      const mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      if (mx || my) { const l = Math.hypot(mx, my), sp = 130 * (1 + L.speed * .12); p.x += mx / l * sp * dt; p.y += my / l * sp * dt; if (mx) p.face = mx; }
      // spawning grows with time; elites each minute; the Night Lord at 4:00
      const rate = 1.2 + this.t / 18;
      this.spawnT += dt * rate;
      while (this.spawnT >= 1 && this.foes.length < 240) {
        this.spawnT--;
        const r = Math.random();
        this.spawn(this.t > 90 && r < .15 ? 'wraith' : this.t > 30 && r < .5 ? 'ghoul' : r < .7 ? 'bat' : 'ghoul');
      }
      if (this.t > this.elites * 60) { this.elites++; this.spawn('elite'); G.sfx('laser'); }
      if (this.t > 240 && !this.lordDone) { this.lordDone = true; this.spawn('lord'); G.shake(8, .8); G.sfx('boom'); }
      // weapons
      if ((this.boltT -= dt) <= 0) {
        this.boltT = Math.max(.25, 1 * Math.pow(.88, L.bolt - 1));
        const targets = this.foes.slice().sort((a, b) => G.dist(a.x, a.y, p.x, p.y) - G.dist(b.x, b.y, p.x, p.y)).slice(0, 1 + L.twin);
        for (const f of targets) {
          const d = G.dist(f.x, f.y, p.x, p.y) || 1;
          this.bolts.push({x: p.x, y: p.y, vx: (f.x - p.x) / d * 420, vy: (f.y - p.y) / d * 420, dmg: 10 + L.bolt * 6, life: 1.2});
        }
        if (targets.length) G.sfx('shoot', .3);
      }
      this.spin += dt * 3;
      if (L.nova && (this.novaT -= dt) <= 0) {
        this.novaT = Math.max(1.2, 3.2 - L.nova * .35);
        const n = 6 + L.nova * 2;
        for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; this.thorns.push({x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, dmg: 8 + L.nova * 4, life: .7}); }
      }
      const auraR = L.aura ? 50 + L.aura * 12 : 0, auraTick = (this.auraT -= dt) <= 0;
      if (auraTick) this.auraT = .4;
      const lanterns = [];
      for (let i = 0; i < L.lantern; i++) { const a = this.spin + i * Math.PI * 2 / L.lantern; lanterns.push({x: p.x + Math.cos(a) * 72, y: p.y + Math.sin(a) * 72}); }
      // spatial grid so crowds stay cheap to separate
      const grid = new Map();
      for (const f of this.foes) { const k = Math.floor(f.x / CELL) + ',' + Math.floor(f.y / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(f); }
      for (const f of this.foes) {
        f.flash -= dt;
        const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy) || 1;
        const wob = f.type === 'bat' ? Math.sin(this.t * 6 + f.ph) * .6 : 0, a = Math.atan2(dy, dx) + wob;
        f.x += Math.cos(a) * f.speed * dt; f.y += Math.sin(a) * f.speed * dt;
        const gx = Math.floor(f.x / CELL), gy = Math.floor(f.y / CELL);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) for (const o of grid.get((gx + ox) + ',' + (gy + oy)) || []) {
          if (o === f) continue;
          const ex = f.x - o.x, ey = f.y - o.y, e = Math.hypot(ex, ey) || 1, ov = f.r + o.r - e;
          if (ov > 0) { f.x += ex / e * ov * .5; f.y += ey / e * ov * .5; }
        }
        if (d < f.r + p.r && p.inv <= 0) {
          p.hp -= f.dmg; p.inv = .45; G.shake(4); G.flash('rgba(255,50,80,.3)', .2); G.sfx('hurt', .7);
          if (p.hp <= 0) { p.hp = 0; return G.end('The night took you'); }
        }
        if (auraR && auraTick && d < auraR + f.r) this.hit(f, 4 + L.aura * 3, null);
        for (const l of lanterns) { // each foe can be singed by a lantern at most every .35s
          if (G.dist(l.x, l.y, f.x, f.y) > f.r + 10 || this.t - (f.lanternHit ?? -1) < .35) continue;
          f.lanternHit = this.t; this.hit(f, 9 + L.lantern * 2, l);
        }
        if (d > 800 && f.type !== 'lord' && f.type !== 'elite') { f.x = p.x - dx * .8; f.y = p.y - dy * .8; } // stragglers loop back in front
      }
      for (const list of [this.bolts, this.thorns]) for (const b of list) {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        const f = this.foes.find(f => f.hp > 0 && G.dist(f.x, f.y, b.x, b.y) < f.r + 4);
        if (f) { this.hit(f, b.dmg, b); b.life = 0; }
      }
      this.bolts = this.bolts.filter(b => b.life > 0); this.thorns = this.thorns.filter(b => b.life > 0);
      this.foes = this.foes.filter(f => f.hp > 0);
      const reach = 60 * (1 + this.lv.magnet * .5);
      for (const g of this.gems) {
        const d = G.dist(g.x, g.y, p.x, p.y);
        if (d < reach) { g.x += (p.x - g.x) / d * 360 * dt; g.y += (p.y - g.y) / d * 360 * dt; }
        if (d < p.r + 6) {
          g.got = true; this.xp += g.v; G.sfx('coin', .25);
          if (this.xp >= this.need() && !this.choice) { this.xp -= this.need(); this.level++; this.offer(); }
        }
      }
      this.gems = this.gems.filter(g => !g.got);
      if (this.gems.length > 400) this.gems.splice(0, this.gems.length - 400);
    },
    draw(ctx, dt) {
      const p = this.p, ox = W / 2 - p.x, oy = H / 2 - p.y, now = performance.now() / 1000;
      G.clear('#1b2329');
      ctx.save(); ctx.translate(ox, oy);
      const x0 = Math.floor((p.x - W / 2) / 64) - 1, y0 = Math.floor((p.y - H / 2) / 64) - 1;
      for (let gx = x0; gx < x0 + 12; gx++) for (let gy = y0; gy < y0 + 10; gy++) {
        const h = hash(gx, gy), x = gx * 64, y = gy * 64;
        ctx.fillStyle = h > .5 ? '#1e272e' : '#1a2228'; ctx.fillRect(x, y, 64, 64);
        if (h > .82) { ctx.fillStyle = '#1f2a24'; ctx.fillRect(x + h * 40, y + h * 30, 3, 8); ctx.fillRect(x + h * 40 + 5, y + h * 30 + 2, 3, 6); }
        if (h < .04) { G.circle(x + 32, y + 32, 8, '#20262c'); }
      }
      if (this.lv.aura) { const r = 50 + this.lv.aura * 12; G.circle(p.x, p.y, r, `rgba(255,140,60,${.12 + Math.sin(now * 8) * .03})`); }
      for (const g of this.gems) G.gem(g.x, g.y, g.big ? 8 : 4.5, g.big ? '#ffcf5c' : g.v > 1 ? '#5ee6c1' : '#5cb8ff');
      for (const f of this.foes) {
        const c = f.flash > 0 ? '#ffffff' : f.color;
        if (f.type === 'bat') {
          const w = Math.sin(now * 20 + f.ph) * 5;
          ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(f.x - 13, f.y - w); ctx.quadraticCurveTo(f.x, f.y - 2, f.x + 13, f.y - w); ctx.quadraticCurveTo(f.x, f.y + 6, f.x - 13, f.y - w); ctx.fill();
        } else if (f.type === 'wraith' || f.type === 'lord') {
          ctx.fillStyle = c; ctx.globalAlpha = f.type === 'wraith' ? .8 : 1;
          ctx.beginPath(); ctx.arc(f.x, f.y - f.r * .2, f.r, Math.PI, 0);
          for (let i = 0; i <= 4; i++) ctx.lineTo(f.x + f.r - i * f.r / 2, f.y + f.r * .8 + (i % 2 ? -6 : 0) + Math.sin(now * 6 + i) * 2);
          ctx.fill(); ctx.globalAlpha = 1;
          G.circle(f.x - f.r * .35, f.y - f.r * .25, f.r * .14, '#1b1a33'); G.circle(f.x + f.r * .35, f.y - f.r * .25, f.r * .14, '#1b1a33');
        } else {
          G.circle(f.x, f.y, f.r, c); G.circle(f.x - f.r * .35, f.y - 2, 2, '#ff4b62'); G.circle(f.x + f.r * .35, f.y - 2, 2, '#ff4b62');
        }
        if (f.type === 'elite' || f.type === 'lord') G.bar({x: f.x - 30, y: f.y - f.r - 12, w: 60, h: 5, v: f.hp, max: f.max, color: '#ff9f5c'});
      }
      ctx.fillStyle = '#fff3c4'; for (const b of this.bolts) { G.circle(b.x, b.y, 4, '#ffcf5c'); G.circle(b.x, b.y, 2, '#fff3c4'); }
      for (const b of this.thorns) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillStyle = '#7fe0a8'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -3); ctx.lineTo(-6, 3); ctx.fill(); ctx.restore(); }
      for (let i = 0; i < this.lv.lantern; i++) {
        const a = this.spin + i * Math.PI * 2 / this.lv.lantern, x = p.x + Math.cos(a) * 72, y = p.y + Math.sin(a) * 72;
        G.circle(x, y, 14, 'rgba(255,207,92,.18)'); G.rr(x - 5, y - 7, 10, 14, 3, '#ffcf5c'); G.rr(x - 3, y - 4, 6, 8, 2, '#fff3c4');
      }
      const blink = p.inv > 0 && Math.floor(p.inv * 20) % 2;
      if (!blink) {
        G.circle(p.x, p.y + 10, 10, 'rgba(0,0,0,.4)');
        G.rr(p.x - 9, p.y - 10, 18, 22, 7, '#3d4a8a'); G.circle(p.x, p.y - 12, 8, '#f2d3b1');
        ctx.fillStyle = '#2b2f55'; ctx.beginPath(); ctx.moveTo(p.x - 11, p.y - 13); ctx.lineTo(p.x, p.y - 30); ctx.lineTo(p.x + 11, p.y - 13); ctx.fill();
        G.rr(p.x + p.face * 11 - 3, p.y - 4, 6, 10, 2, '#ffcf5c');
      }
      G.bar({x: p.x - 18, y: p.y + 16, w: 36, h: 4, v: p.hp, max: p.max, color: '#e04e5f'});
      ctx.restore();
      const vg = ctx.createRadialGradient(W / 2, H / 2, 140, W / 2, H / 2, 420);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.55)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      G.fx(this.parts, dt);
      G.bar({x: 8, y: 6, w: W - 16, h: 10, v: this.xp, max: this.need(), color: '#5cb8ff', id: 'xp'});
      G.text(`LV ${this.level}`, 14, 34, {size: 13, weight: 700, shadow: true});
      G.bar({x: 60, y: 24, w: 150, h: 12, v: p.hp, max: p.max, color: '#e04e5f', label: `HP ${Math.ceil(p.hp)}`, id: 'hp'});
      const left = Math.max(0, WIN - this.t);
      G.text(`${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} until dawn`, W / 2, 36, {size: 15, align: 'center', weight: 700, shadow: true});
      G.text(`☠ ${this.kills}`, W - 14, 36, {size: 13, align: 'right', weight: 700, shadow: true});
      if (this.choice) {
        ctx.fillStyle = 'rgba(5,6,16,.72)'; ctx.fillRect(0, 0, W, H);
        G.text('LEVEL UP! Choose one', W / 2, 140, {size: 22, align: 'center', display: true, color: '#ffcf5c'});
        this.choice.forEach((u, i) => {
          const cx = W / 2 + (i - 1) * 190, hover = Math.abs(G.pointer.x - cx) < 85 && Math.abs(G.pointer.y - 250) < 90;
          G.rr(cx - 85, 160, 170, 180, 14, hover ? '#2b2f55' : '#1f2240');
          ctx.strokeStyle = hover ? '#ffcf5c' : '#3b4170'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(cx - 85, 160, 170, 180, 14); ctx.stroke();
          G.text(String(i + 1), cx, 196, {size: 22, align: 'center', display: true, color: '#5cb8ff'});
          G.text(u.name, cx, 232, {size: 16, align: 'center', weight: 700});
          const words = u.text.split(' '); let line = '', ly = 262;
          for (const w of words) { if ((line + w).length > 20) { G.text(line, cx, ly, {size: 12, align: 'center', color: '#c4c8ee'}); line = ''; ly += 16; } line += w + ' '; }
          G.text(line, cx, ly, {size: 12, align: 'center', color: '#c4c8ee'});
          G.text(`Level ${this.lv[u.id]} → ${this.lv[u.id] + 1}`, cx, 326, {size: 11, align: 'center', color: '#9aa0c8'});
        });
      }
    }
  });
})();

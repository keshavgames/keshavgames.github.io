(() => {
  // Three-lane tug of war: spend energy to send troops down a lane. Troops are the Blender top-down soldiers.
  const W = 800, H = 520, LANES = [150, 260, 370], BASE_X = [60, 740];
  const UNITS = {
    scout: {cost: 2, hp: 30, dmg: 6, rate: .5, range: 26, speed: 70, label: 'Scout', tip: 'fast and cheap'},
    knight: {cost: 4, hp: 90, dmg: 14, rate: .8, range: 28, speed: 40, label: 'Knight', tip: 'tough'},
    archer: {cost: 4, hp: 40, dmg: 10, rate: .9, range: 110, speed: 45, label: 'Archer', tip: 'shoots from far'},
    giant: {cost: 7, hp: 260, dmg: 30, rate: 1.4, range: 30, speed: 26, label: 'Giant', tip: 'smashes bases'}
  };
  const KEYS = Object.keys(UNITS);
  const ASSETS = ['blue', 'red'].flatMap(c => [0, 1].map(f => `img/top_${c}_${f}.png`));

  GameBox.register({
    id: 'lanewars', title: 'Lane Wars', genre: 'Strategy', kind: 'Lane battle', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Pick a troop, then click a lane to send it. Knock down the red base before they knock down yours!',
    desc: 'A three-lane tug of war. Energy fills up over time: spend it to send scouts, knights, archers or giants down any lane. Troops fight whatever they meet and smash the enemy base when they get through. Watch which lane the red army is pushing and send the right troops to stop it. Thirty battles against sharper commanders.',
    controls: [['1-4 / click a card', 'Pick a troop'], ['Click a lane', 'Send it'], ['Q W E', 'Send to top, middle, bottom lane']],
    info() { return `Battle ${G.level} · Base ${Math.ceil(this.base[0])} vs ${Math.ceil(this.base[1])}`; },
    init() { this.units = []; this.arrows = []; this.base = [500, 400 + G.level * 20]; this.energy = [5, 5]; this.pick = 'knight'; this.t = 0; this.botT = 2; this.done = null; this.parts = []; },
    send(side, kind, lane) {
      const U = UNITS[kind]; if (this.energy[side] < U.cost || this.done) return false; this.energy[side] -= U.cost;
      const hpMul = side === 1 ? 1 + G.level * .02 : 1;
      this.units.push({side, kind, lane, x: side ? BASE_X[1] - 40 : BASE_X[0] + 40, hp: U.hp * hpMul, max: U.hp * hpMul, cd: 0, walk: Math.random()}); if (!side) G.sfx('select', .4); return true;
    },
    key(k) { const i = '1234'.indexOf(k); if (i >= 0) this.pick = KEYS[i]; const l = 'qwe'.indexOf(k.toLowerCase()); if (l >= 0) this.send(0, this.pick, l); },
    pointer(type, x, y) {
      if (type !== 'down') return;
      for (let i = 0; i < 4; i++) { const cx = 140 + i * 140; if (x > cx && x < cx + 128 && y > H - 78 && y < H - 8) { this.pick = KEYS[i]; G.sfx('click', .4); return; } }
      const lane = LANES.findIndex(ly => Math.abs(y - ly) < 50); if (lane >= 0) this.send(0, this.pick, lane);
    },
    bot(dt) {
      if ((this.botT -= dt) > 0) return; const n = G.level; this.botT = Math.max(.6, 2.4 - n * .05) * (.7 + Math.random() * .6);
      // reacts to the lane where you push hardest, otherwise attacks a random lane
      const press = [0, 1, 2].map(l => this.units.filter(u => u.side === 0 && u.lane === l).reduce((s, u) => s + u.hp, 0) - this.units.filter(u => u.side === 1 && u.lane === l).reduce((s, u) => s + u.hp, 0));
      const smart = Math.random() < Math.min(.9, .3 + n * .025), lane = smart ? press.indexOf(Math.max(...press)) : Math.floor(Math.random() * 3);
      const opts = KEYS.filter(k => UNITS[k].cost <= this.energy[1]); if (!opts.length) return;
      const kind = smart && press[lane] > 120 && opts.includes('giant') ? 'giant' : G.pick(opts); this.send(1, kind, lane);
    },
    update(dt) {
      this.t += dt; for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.energy[0] = Math.min(10, this.energy[0] + dt * .9); this.energy[1] = Math.min(10, this.energy[1] + dt * (.75 + G.level * .012));
      this.bot(dt);
      for (const u of this.units) {
        const U = UNITS[u.kind], dir = u.side ? -1 : 1; u.cd -= dt;
        const foes = this.units.filter(o => o.side !== u.side && o.lane === u.lane && o.hp > 0 && (o.x - u.x) * dir > -10).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x));
        const f = foes[0], baseX = BASE_X[1 - u.side];
        if (f && Math.abs(f.x - u.x) <= U.range) { if (u.cd <= 0) { u.cd = U.rate; if (u.kind === 'archer') this.arrows.push({x: u.x, y: LANES[u.lane] - 6, tx: f, side: u.side}); else { f.hp -= U.dmg; G.sfx('hit', .15); } } }
        else if (Math.abs(baseX - u.x) <= U.range + 10) { if (u.cd <= 0) { u.cd = U.rate; this.base[1 - u.side] -= U.dmg * (u.kind === 'giant' ? 1.5 : 1); G.sfx('crunch', .3); for (let i = 0; i < 4; i++) this.parts.push({x: baseX, y: LANES[u.lane], vx: (Math.random() - .5) * 120, vy: -Math.random() * 120, life: .4, color: u.side ? '#7aaaff' : '#ff8a8a'}); } }
        else { u.x += dir * U.speed * dt; u.walk += dt * 4; }
      }
      for (const a of this.arrows) { const dx = a.tx.x - a.x; a.x += Math.sign(dx) * 300 * dt; if (Math.abs(dx) < 8) { a.tx.hp -= UNITS.archer.dmg; a.hit = true; } }
      this.arrows = this.arrows.filter(a => !a.hit && a.tx.hp > 0);
      for (const u of this.units) if (u.hp <= 0 && !u.dead) { u.dead = true; for (let i = 0; i < 6; i++) this.parts.push({x: u.x, y: LANES[u.lane], vx: (Math.random() - .5) * 100, vy: (Math.random() - .5) * 100, life: .5, color: '#fff'}); if (u.side) G.score += 10; }
      this.units = this.units.filter(u => u.hp > 0);
      if (this.base[1] <= 0) { G.party(); G.score += 600 + G.level * 50; const hp = this.base[0] / 500; this.done = {t: 1.2, go: () => G.win(hp > .7 ? 3 : hp > .35 ? 2 : 1, 'Red base destroyed!')}; }
      if (this.base[0] <= 0) this.done = {t: 1.2, go: () => G.end('Your base fell')};
    },
    draw(ctx) {
      G.clear('#6aa84a'); ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let x = 0; x < W; x += 40) for (let y = 0; y < H; y += 40) if ((x + y) % 80 === 0) ctx.fillRect(x, y, 40, 40);
      for (const ly of LANES) { G.rr(80, ly - 34, W - 160, 68, 20, '#c8a46a'); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 100; x < W - 100; x += 30) ctx.fillRect(x, ly - 2, 14, 4); }
      for (const [side, x] of BASE_X.entries()) { const col = side ? '#c83a3a' : '#2a6ae8'; G.rr(x - 44, 90, 88, 340, 12, '#7a7a8a'); G.rr(x - 36, 98, 72, 324, 8, '#9a9aa8'); for (let i = 0; i < 4; i++) G.rr(x - 44 + i * 24, 76, 16, 18, 3, '#7a7a8a'); ctx.fillStyle = '#5a4a3a'; ctx.fillRect(x - 2, 30, 4, 50); ctx.fillStyle = col; ctx.fillRect(side ? x - 32 : x + 2, 32, 30, 20);
        G.bar({x: x - 44, y: 440, w: 88, h: 10, v: Math.max(0, this.base[side]), max: side ? 400 + G.level * 20 : 500, color: col}); }
      for (const u of this.units.slice().sort((a, b) => a.lane - b.lane)) {
        const img = G.img(`img/top_${u.side ? 'red' : 'blue'}_${Math.floor(u.walk) % 2}.png`), y = LANES[u.lane] + (u.kind === 'archer' ? -14 : u.kind === 'scout' ? 14 : 0), s = u.kind === 'giant' ? 72 : u.kind === 'scout' ? 40 : 50;
        if (img.complete) { ctx.save(); ctx.translate(u.x, y); ctx.rotate(u.side ? Math.PI : 0); ctx.drawImage(img, -s / 2, -s / 2, s, s); ctx.restore(); }
        G.bar({x: u.x - 16, y: y - s / 2 - 6, w: 32, h: 4, v: u.hp, max: u.max, color: u.side ? '#ff6b6b' : '#5ee6c1'});
        G.text(UNITS[u.kind].label[0], u.x, y + s / 2 + 8, {size: 9, align: 'center', weight: 800, color: '#2a2a2a'});
      }
      for (const a of this.arrows) { ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x - 8, a.y); ctx.lineTo(a.x + 8, a.y); ctx.stroke(); }
      for (const p of this.parts) G.circle(p.x, p.y, 3, p.color);
      G.panel(10, H - 86, W - 20, 82, 14, 'rgba(20,24,40,.85)');
      for (let i = 0; i < 10; i++) G.rr(20 + i * 11, H - 76, 9, 62, 3, i < Math.floor(this.energy[0]) ? '#ff7bd0' : 'rgba(255,255,255,.12)');
      KEYS.forEach((k, i) => { const U = UNITS[k], cx = 140 + i * 140, can = this.energy[0] >= U.cost, sel = this.pick === k; G.rr(cx, H - 78, 128, 70, 12, sel ? '#ffcf5c' : can ? '#3a4a6a' : '#2a2e3a'); G.text(`${i + 1} ${U.label}`, cx + 64, H - 50, {size: 15, align: 'center', weight: 800, color: sel ? '#2a2010' : '#fff'}); G.text(`⚡${U.cost} · ${U.tip}`, cx + 64, H - 28, {size: 11, align: 'center', weight: 700, color: sel ? '#2a2010' : '#c4c8ee'}); });
      G.text('Click a lane to send', W - 24, H - 40, {size: 12, align: 'right', weight: 800, color: '#cfd4ff'});
    }
  });
})();

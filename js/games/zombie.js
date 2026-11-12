(() => {
  const W = 640, H = 480;
  const GUNS = [
    {name: 'Pistol', mag: 12, rate: .26, reload: 1, dmg: 18, pellets: 1, spread: .04, ammo: Infinity},
    {name: 'Shotgun', mag: 6, rate: .7, reload: 1.6, dmg: 11, pellets: 7, spread: .32, ammo: 18},
    {name: 'SMG', mag: 30, rate: .075, reload: 1.4, dmg: 9, pellets: 1, spread: .12, ammo: 90}
  ];
  const ZOMBIES = {
    walker: {hp: 40, r: 12, speed: 52, dmg: 12, pts: 10, color: '#6f8f5a'},
    runner: {hp: 25, r: 11, speed: 115, dmg: 8, pts: 15, color: '#8fa86a'},
    spitter: {hp: 35, r: 12, speed: 60, dmg: 10, pts: 20, color: '#7fbf4a'},
    brute: {hp: 170, r: 19, speed: 36, dmg: 25, pts: 50, color: '#55704a'}
  };
  const ground = document.createElement('canvas'); ground.width = W; ground.height = H;
  const gctx = ground.getContext('2d');
  const light = document.createElement('canvas'); light.width = W; light.height = H;
  const lctx = light.getContext('2d');

  function paintGround() {
    gctx.fillStyle = '#25301f'; gctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { gctx.fillStyle = `hsl(${85 + G.rnd(25)} 25% ${12 + G.rnd(10)}%)`; gctx.fillRect(G.rnd(W), G.rnd(H), 2, 3 + G.rnd(4)); }
    gctx.fillStyle = 'rgba(60,45,30,.5)'; gctx.fillRect(0, 222, W, 36); gctx.fillRect(302, 0, 36, H);
  }
  const hitRect = (x, y, rects) => rects.find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
  function push(o, rects) {
    for (const b of rects) {
      const cx = G.clamp(o.x, b.x, b.x + b.w), cy = G.clamp(o.y, b.y, b.y + b.h), dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
      if (d < o.r && d > 0) { o.x = cx + dx / d * o.r; o.y = cy + dy / d * o.r; }
    }
    o.x = G.clamp(o.x, o.r, W - o.r); o.y = G.clamp(o.y, o.r, H - o.r);
  }

  GameBox.register({
    id: 'zombie', title: 'Dead Acre', genre: 'Action', kind: 'Zombie shooter', w: W, h: H, cursor: 'crosshair',
    desc: 'Hold the farm through the night. Walkers shamble, runners sprint, spitters lob acid and brutes soak up bullets. Swap between pistol, shotgun and SMG, grab ammo and medkits, and save grenades for crowds.',
    controls: [['W A S D', 'Move'], ['Mouse', 'Aim'], ['Click / Hold', 'Shoot'], ['Arrows', 'Aim and shoot without a mouse'], ['R', 'Reload'], ['1 2 3', 'Switch gun'], ['Q', 'Throw grenade']],
    info() { return `Wave ${this.wave} · ${this.left + this.zs.length} zombies left`; },
    init() {
      paintGround();
      this.p = {x: W / 2, y: H / 2, r: 11, hp: 100, inv: 0, ang: 0};
      this.guns = GUNS.map(g => ({...g, inMag: g.mag}));
      this.gun = 0; this.cool = 0; this.reloading = 0; this.flash = 0; this.nades = 2;
      this.zs = []; this.shots = []; this.spit = []; this.drops = []; this.booms = []; this.thrown = []; this.parts = [];
      this.crates = [{x: 120, y: 90, w: 46, h: 40}, {x: 480, y: 340, w: 50, h: 40}, {x: 470, y: 80, w: 36, h: 60}, {x: 130, y: 350, w: 60, h: 30}, {x: 250, y: 140, w: 30, h: 30}, {x: 380, y: 300, w: 30, h: 30}];
      this.wave = 0; this.nextWave();
    },
    nextWave() {
      this.wave++; this.left = 6 + this.wave * 4; this.spawnT = 2.5; this.breakT = 0;
      G.popText(this.parts, W / 2, H / 2 - 30, `WAVE ${this.wave}`, '#ff6b8b', 26);
    },
    spawnZombie() {
      const pool = ['walker', 'walker', 'walker'];
      if (this.wave >= 2) pool.push('runner', 'runner');
      if (this.wave >= 3) pool.push('spitter');
      if (this.wave >= 4) pool.push('brute');
      const type = G.pick(pool), Z = ZOMBIES[type], side = Math.floor(G.rnd(4));
      const x = side === 0 ? -20 : side === 1 ? W + 20 : G.rnd(W), y = side === 2 ? -20 : side === 3 ? H + 20 : G.rnd(H);
      const tough = 1 + (this.wave - 1) * .1;
      this.zs.push({type, x, y, r: Z.r, hp: Z.hp * tough, max: Z.hp * tough, speed: Z.speed * (.85 + G.rnd(.3)), dmg: Z.dmg, pts: Z.pts, color: Z.color, cd: 2, flash: 0, t: G.rnd(6), kx: 0, ky: 0});
      this.left--;
    },
    key(k) {
      if (k === 'r') this.reload();
      if (k === '1' || k === '2' || k === '3') { const i = +k - 1; if (i !== this.gun) { this.gun = i; this.reloading = 0; G.sfx('click'); } }
      if (k === 'q' && this.nades > 0) {
        this.nades--; const p = this.p;
        this.thrown.push({x: p.x, y: p.y, vx: Math.cos(p.ang) * 330, vy: Math.sin(p.ang) * 330, t: .9}); G.sfx('swing');
      }
    },
    reload() {
      const g = this.guns[this.gun];
      if (this.reloading > 0 || g.inMag === g.mag || g.ammo <= 0) return;
      this.reloading = g.reload; G.sfx('click');
    },
    fire() {
      const g = this.guns[this.gun], p = this.p;
      if (this.cool > 0 || this.reloading > 0) return;
      if (g.inMag <= 0) { this.reload(); return; }
      g.inMag--; this.cool = g.rate; this.flash = .05;
      for (let i = 0; i < g.pellets; i++) {
        const a = p.ang + (Math.random() - .5) * g.spread * 2;
        this.shots.push({x: p.x + Math.cos(p.ang) * 16, y: p.y + Math.sin(p.ang) * 16, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, dmg: g.dmg, life: .6});
      }
      G.sfx(g.pellets > 1 ? 'boom' : 'shoot', g.pellets > 1 ? .5 : .8); G.shake(g.pellets > 1 ? 4 : 1.5, .1);
      if (g.inMag === 0) this.reload();
    },
    splat(x, y, r, color = 'rgba(70,10,12,.55)') { gctx.fillStyle = color; gctx.beginPath(); gctx.arc(x, y, r, 0, Math.PI * 2); gctx.fill(); },
    damage(z, n, ax, ay) {
      z.hp -= n; z.flash = .08; z.kx += ax * 60; z.ky += ay * 60;
      G.burst(this.parts, z.x, z.y, '#7a1018', 3, 90);
      if (z.hp > 0) return;
      G.score += z.pts; this.splat(z.x, z.y, z.r + 4); G.sfx('crunch', .6);
      const roll = Math.random();
      if (roll < .08) this.drops.push({x: z.x, y: z.y, type: 'med'});
      else if (roll < .2) this.drops.push({x: z.x, y: z.y, type: 'ammo'});
      else if (roll < .24) this.drops.push({x: z.x, y: z.y, type: 'nade'});
    },
    hurt(n) {
      const p = this.p;
      if (p.inv > 0) return;
      p.hp -= n; p.inv = .5; G.shake(6); G.flash(); G.sfx('hurt');
      if (p.hp <= 0) { p.hp = 0; G.end('Overrun'); }
    },
    update(dt) {
      const p = this.p;
      p.inv -= dt; this.cool -= dt; this.flash -= dt;
      const g = this.guns[this.gun];
      if (this.reloading > 0 && (this.reloading -= dt) <= 0) {
        const need = g.mag - g.inMag, take = Math.min(need, g.ammo);
        g.inMag += take; if (g.ammo !== Infinity) g.ammo -= take;
      }
      const mx = G.held('d') - G.held('a'), my = G.held('s') - G.held('w');
      if (mx || my) { const l = Math.hypot(mx, my); p.x += mx / l * 160 * dt; p.y += my / l * 160 * dt; }
      push(p, this.crates);
      const ax = G.held('ArrowRight') - G.held('ArrowLeft'), ay = G.held('ArrowDown') - G.held('ArrowUp');
      if (ax || ay) { p.ang = Math.atan2(ay, ax); this.fire(); }
      else { p.ang = Math.atan2(G.pointer.y - p.y, G.pointer.x - p.x); if (G.pointer.down) this.fire(); }
      // waves
      if (this.left > 0 && (this.spawnT -= dt) <= 0) { this.spawnT = Math.max(.35, 1.4 - this.wave * .1); this.spawnZombie(); }
      if (!this.left && !this.zs.length) {
        if (!this.breakT) { this.breakT = 5; G.score += 100 * this.wave; G.sfx('win'); G.popText(this.parts, W / 2, H / 2, 'WAVE CLEARED', '#5ee6c1', 22); }
        else if ((this.breakT -= dt) <= 0) this.nextWave();
      }
      for (const z of this.zs) {
        z.t += dt; z.cd -= dt; z.flash -= dt;
        const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1;
        let sp = z.speed;
        if (z.type === 'spitter') {
          sp = d < 200 ? -z.speed * .6 : d > 260 ? z.speed : 0;
          if (z.cd <= 0 && d < 340) { z.cd = 2.2; this.spit.push({x: z.x, y: z.y, vx: dx / d * 230, vy: dy / d * 230}); G.sfx('splash', .5); }
        }
        const wob = Math.sin(z.t * 3) * .4;
        z.x += (Math.cos(Math.atan2(dy, dx) + wob * (z.type === 'runner' ? .3 : 1)) * sp + z.kx) * dt;
        z.y += (Math.sin(Math.atan2(dy, dx) + wob * (z.type === 'runner' ? .3 : 1)) * sp + z.ky) * dt;
        z.kx *= .85; z.ky *= .85;
        if (z.x > 0 && z.x < W && z.y > 0 && z.y < H) push(z, this.crates);
        if (d < z.r + p.r) this.hurt(z.dmg);
        if (G.state !== 'play') return;
      }
      for (let i = 0; i < this.zs.length; i++) for (let j = i + 1; j < this.zs.length; j++) {
        const a = this.zs[i], b = this.zs[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, o = a.r + b.r - d;
        if (o > 0) { a.x -= dx / d * o / 2; a.y -= dy / d * o / 2; b.x += dx / d * o / 2; b.y += dy / d * o / 2; }
      }
      for (const s of this.shots) {
        for (let k = 0; k < 2 && !s.dead; k++) {
          s.x += s.vx * dt / 2; s.y += s.vy * dt / 2;
          if (hitRect(s.x, s.y, this.crates)) { s.dead = true; G.burst(this.parts, s.x, s.y, '#c9a26b', 2, 60); break; }
          const z = this.zs.find(z => z.hp > 0 && G.dist(z.x, z.y, s.x, s.y) < z.r);
          if (z) { s.dead = true; this.damage(z, s.dmg, s.vx / 900, s.vy / 900); }
        }
        if ((s.life -= dt) <= 0 || s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) s.dead = true;
      }
      this.shots = this.shots.filter(s => !s.dead);
      this.zs = this.zs.filter(z => z.hp > 0);
      for (const s of this.spit) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (G.dist(s.x, s.y, p.x, p.y) < p.r + 6) { s.dead = true; this.hurt(10); this.splat(s.x, s.y, 10, 'rgba(120,200,60,.3)'); }
        else if (hitRect(s.x, s.y, this.crates) || s.x < 0 || s.x > W || s.y < 0 || s.y > H) { s.dead = true; this.splat(s.x, s.y, 8, 'rgba(120,200,60,.25)'); }
      }
      this.spit = this.spit.filter(s => !s.dead);
      if (G.state !== 'play') return;
      for (const n of this.thrown) {
        n.x += n.vx * dt; n.y += n.vy * dt; n.vx *= .97; n.vy *= .97;
        if ((n.t -= dt) <= 0) {
          n.dead = true; this.booms.push({x: n.x, y: n.y, t: .35}); G.sfx('boom'); G.shake(10, .4);
          this.splat(n.x, n.y, 30, 'rgba(20,16,12,.6)');
          for (const z of this.zs) { const d = G.dist(z.x, z.y, n.x, n.y); if (d < 95) this.damage(z, 130 * (1 - d / 140), (z.x - n.x) / (d || 1) * 4, (z.y - n.y) / (d || 1) * 4); }
          this.zs = this.zs.filter(z => z.hp > 0);
        }
      }
      this.thrown = this.thrown.filter(n => !n.dead);
      for (const b of this.booms) b.t -= dt;
      this.booms = this.booms.filter(b => b.t > 0);
      for (const d of this.drops) {
        if (G.dist(d.x, d.y, p.x, p.y) > 20) continue;
        d.got = true; G.sfx('power');
        if (d.type === 'med') { p.hp = Math.min(100, p.hp + 40); G.popText(this.parts, p.x, p.y - 22, '+40 HP', '#ff6b8b'); }
        else if (d.type === 'nade') { this.nades++; G.popText(this.parts, p.x, p.y - 22, '+1 GRENADE', '#ffcf5c'); }
        else { this.guns[1].ammo += 12; this.guns[2].ammo += 60; G.popText(this.parts, p.x, p.y - 22, 'AMMO', '#ffcf5c'); }
      }
      this.drops = this.drops.filter(d => !d.got);
      if (Math.random() < dt * .4) { gctx.fillStyle = 'rgba(37,48,31,.04)'; gctx.fillRect(0, 0, W, H); } // old stains slowly fade
    },
    draw(ctx, dt) {
      const p = this.p, now = performance.now() / 1000;
      ctx.drawImage(ground, 0, 0, W, H);
      for (const d of this.drops) {
        if (d.type === 'med') { G.rr(d.x - 9, d.y - 7, 18, 14, 3, '#e9e4da'); ctx.fillStyle = '#c4202c'; ctx.fillRect(d.x - 2, d.y - 5, 4, 10); ctx.fillRect(d.x - 5, d.y - 2, 10, 4); }
        else if (d.type === 'nade') { G.circle(d.x, d.y, 6, '#4b5a3a'); G.rr(d.x - 2, d.y - 9, 4, 4, 1, '#9aa0a8'); }
        else { G.rr(d.x - 10, d.y - 7, 20, 14, 2, '#8a6a3a'); G.text('AMMO', d.x, d.y + 3, {size: 7, align: 'center', weight: 700, color: '#ffe9b0'}); }
      }
      for (const b of this.crates) {
        G.rr(b.x + 4, b.y + 6, b.w, b.h, 3, 'rgba(0,0,0,.4)');
        G.rr(b.x, b.y, b.w, b.h, 3, '#8a6a3a'); ctx.strokeStyle = '#5e4524'; ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6); ctx.beginPath(); ctx.moveTo(b.x + 3, b.y + 3); ctx.lineTo(b.x + b.w - 3, b.y + b.h - 3); ctx.stroke();
      }
      for (const z of this.zs) {
        const c = z.flash > 0 ? '#ffffff' : z.color, a = Math.atan2(p.y - z.y, p.x - z.x);
        G.circle(z.x, z.y + 3, z.r, 'rgba(0,0,0,.35)');
        ctx.strokeStyle = c; ctx.lineWidth = z.r * .45; ctx.lineCap = 'round';
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(z.x + Math.cos(a + s * .9) * z.r * .7, z.y + Math.sin(a + s * .9) * z.r * .7); ctx.lineTo(z.x + Math.cos(a + s * .35) * z.r * 1.6 + Math.sin(z.t * 4 + s) * 2, z.y + Math.sin(a + s * .35) * z.r * 1.6); ctx.stroke(); }
        G.circle(z.x, z.y, z.r, c);
        G.circle(z.x + Math.cos(a) * z.r * .45 - Math.sin(a) * 4, z.y + Math.sin(a) * z.r * .45 + Math.cos(a) * 4, 2, '#ff3b3b');
        G.circle(z.x + Math.cos(a) * z.r * .45 + Math.sin(a) * 4, z.y + Math.sin(a) * z.r * .45 - Math.cos(a) * 4, 2, '#ff3b3b');
        if (z.hp < z.max) G.bar({x: z.x - 14, y: z.y - z.r - 10, w: 28, h: 4, v: z.hp, max: z.max, color: '#e04e5f'});
      }
      for (const s of this.spit) G.circle(s.x, s.y, 5, '#9be05a');
      for (const n of this.thrown) G.circle(n.x, n.y, 5, '#4b5a3a');
      ctx.strokeStyle = 'rgba(255,230,160,.8)'; ctx.lineWidth = 2;
      for (const s of this.shots) { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .02, s.y - s.vy * .02); ctx.stroke(); }
      const blink = p.inv > 0 && Math.floor(p.inv * 20) % 2;
      if (!blink && G.state !== 'over') {
        G.circle(p.x, p.y + 3, 11, 'rgba(0,0,0,.4)');
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
        G.rr(6, -3, 16 + (this.gun === 1 ? 4 : 0), 6, 2, '#2b2b30');
        G.circle(0, 0, 11, '#3d6fd9'); G.circle(2, 0, 6, '#f2d3b1'); G.rr(-4, -6, 8, 12, 3, '#5a3d2a');
        ctx.restore();
      }
      // night: darkness with a flashlight cone, a halo and muzzle flashes cut out of it
      lctx.globalCompositeOperation = 'source-over'; lctx.clearRect(0, 0, W, H);
      lctx.fillStyle = 'rgba(2,4,10,.68)'; lctx.fillRect(0, 0, W, H);
      lctx.globalCompositeOperation = 'destination-out';
      const cone = lctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 330);
      cone.addColorStop(0, 'rgba(0,0,0,1)'); cone.addColorStop(1, 'rgba(0,0,0,0)');
      lctx.fillStyle = cone; lctx.beginPath(); lctx.moveTo(p.x, p.y); lctx.arc(p.x, p.y, 330, p.ang - .42, p.ang + .42); lctx.closePath(); lctx.fill();
      const halo = (x, y, r) => { const gr = lctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = gr; lctx.fillRect(x - r, y - r, r * 2, r * 2); };
      halo(p.x, p.y, 105);
      if (this.flash > 0) halo(p.x + Math.cos(p.ang) * 20, p.y + Math.sin(p.ang) * 20, 160);
      for (const b of this.booms) halo(b.x, b.y, 200 * b.t / .35 + 40);
      ctx.drawImage(light, 0, 0, W, H);
      for (const b of this.booms) { G.circle(b.x, b.y, 95 * (1 - b.t / .35) + 10, `rgba(255,170,80,${b.t * 2})`); }
      if (this.flash > 0) G.circle(p.x + Math.cos(p.ang) * 24, p.y + Math.sin(p.ang) * 24, 7, '#fff3c4');
      for (const z of this.zs) if (G.dist(z.x, z.y, p.x, p.y) > 85) { G.circle(z.x - 3, z.y - 2, 1.5, 'rgba(255,60,60,.8)'); G.circle(z.x + 3, z.y - 2, 1.5, 'rgba(255,60,60,.8)'); }
      G.fx(this.parts, dt);
      const g = this.guns[this.gun];
      G.panel(8, H - 62, 250, 54);
      G.bar({x: 18, y: H - 52, w: 230, h: 14, v: p.hp, max: 100, color: p.hp < 30 ? '#ff4b62' : '#e04e5f', label: `HEALTH ${Math.ceil(p.hp)}`, id: 'hp'});
      G.text(`${g.name}  ${this.reloading > 0 ? 'RELOADING…' : `${g.inMag} / ${g.ammo === Infinity ? '∞' : g.ammo}`}`, 18, H - 18, {size: 13, weight: 700, color: g.inMag ? '#e8e9ff' : '#ff6b8b'});
      G.text(`Grenades ${this.nades}`, 248, H - 18, {size: 12, align: 'right', color: '#ffcf5c'});
      G.text(`WAVE ${this.wave}`, W - 14, 26, {size: 14, align: 'right', weight: 700, color: '#ff6b8b', shadow: true});
      if (this.breakT > 0) G.text(`Next wave in ${Math.ceil(this.breakT)}`, W / 2, 40, {size: 14, align: 'center', color: '#c4c8ee', shadow: true});
    }
  });
})();

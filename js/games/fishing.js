(() => {
  const W = 640, H = 480, SURF = 190, DOCK = 150, DAY = 180;
  const FISH = [
    {name: 'Minnow', color: '#c9d6df', size: 14, depth: [210, 300], weight: 30, value: 10, power: .5},
    {name: 'Sunfish', color: '#ff9f5c', size: 18, depth: [220, 320], weight: 20, value: 20, power: .7},
    {name: 'Perch', color: '#e8c35a', size: 20, depth: [230, 340], weight: 20, value: 25, power: .8},
    {name: 'Trout', color: '#e8a0b4', size: 26, depth: [260, 380], weight: 12, value: 45, power: 1.1},
    {name: 'Bass', color: '#7fa86a', size: 30, depth: [280, 400], weight: 10, value: 60, power: 1.3},
    {name: 'Catfish', color: '#8a7f73', size: 36, depth: [370, 460], weight: 6, value: 90, power: 1.6},
    {name: 'Pike', color: '#9bbf7a', size: 40, depth: [300, 440], weight: 3, value: 150, power: 2},
    {name: 'Golden Koi', color: '#ffcf5c', size: 30, depth: [250, 420], weight: 1, value: 400, power: 1.8}
  ];
  const pickSpecies = () => { let r = G.rnd(FISH.reduce((s, f) => s + f.weight, 0)); return FISH.find(f => (r -= f.weight) < 0) || FISH[0]; };

  function drawFish(ctx, x, y, size, color, dir, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    const wag = Math.sin(t * 10) * size * .12;
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0, 0, size, size * .42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-size * .8, 0); ctx.lineTo(-size * 1.4, -size * .4 + wag); ctx.lineTo(-size * 1.4, size * .4 + wag); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(size * .1, -size * .12, size * .6, size * .12, 0, 0, Math.PI * 2); ctx.fill();
    G.circle(size * .62, -size * .08, Math.max(1.5, size * .08), '#1b1a33');
    ctx.restore();
  }

  GameBox.register({
    id: 'fishing', title: 'Lakeside Lure', genre: 'Casual', kind: 'Fishing', w: W, h: H,
    desc: 'Spend a lazy afternoon on the dock. Hold to charge a cast, wait for a bite and strike fast, then reel by holding and easing off to keep the line tension in the green zone. Eight species from minnows to the rare golden koi before sundown.',
    controls: [['Space / Hold click', 'Charge and cast, strike when a fish bites, reel in'], ['Release', 'Ease off so the line does not snap']],
    info() { return `Caught ${this.count} · Species ${this.seen.size}/8`; },
    init() {
      this.time = DAY; this.phase = 'aim'; this.power = 0; this.lure = null; this.fish = []; this.parts = [];
      this.count = 0; this.seen = new Set(); this.card = null; this.hooked = null; this.held = false;
      for (let i = 0; i < 12; i++) this.fish.push(this.newFish());
    },
    newFish() {
      const s = pickSpecies(), dir = Math.random() < .5 ? -1 : 1;
      return {s, x: 180 + G.rnd(440), y: s.depth[0] + G.rnd(s.depth[1] - s.depth[0]), dir, speed: 20 + G.rnd(25), t: G.rnd(6), state: 'swim', scare: 0};
    },
    holding() { return !!(G.keys[' '] || G.pointer.down); },
    key(k) { if (k === ' ') this.strike(); },
    pointer(type) { if (type === 'down') this.strike(); },
    strike() {
      if (this.phase !== 'bite') return;
      this.phase = 'reel'; this.tension = 35; this.progress = 0; this.slack = 0; this.runT = 1; this.running = false;
      G.sfx('splash'); G.shake(3);
    },
    update(dt) {
      const hold = this.holding();
      if (this.phase !== 'reel' && (this.time -= dt) <= 0) { this.time = 0; return G.end('Sundown'); }
      for (const f of this.fish) {
        f.t += dt;
        if (f === this.hooked) continue;
        if (f.state === 'swim') {
          f.x += f.dir * f.speed * dt; f.y += Math.sin(f.t * 1.3) * 6 * dt;
          if (f.x < 175 || f.x > 625) f.dir *= -1;
          const L = this.lure;
          if (L && L.wet && this.phase === 'wait' && G.dist(f.x, f.y, L.x, L.y) < 110 && Math.random() < dt * .7) f.state = 'approach';
        } else if (f.state === 'approach') {
          const L = this.lure;
          if (!L || this.phase !== 'wait') { f.state = 'swim'; continue; }
          const d = G.dist(f.x, f.y, L.x, L.y); f.dir = L.x > f.x ? 1 : -1;
          f.x += (L.x - f.x) / d * 40 * dt; f.y += (L.y - f.y) / d * 40 * dt;
          if (d < 12) { this.phase = 'bite'; this.biteT = .75; this.hooked = f; G.sfx('select'); }
        } else if (f.state === 'flee') {
          f.x += f.dir * 160 * dt; if ((f.scare -= dt) <= 0) f.state = 'swim';
          if (f.x < 175 || f.x > 625) { f.dir *= -1; f.x = G.clamp(f.x, 175, 625); }
        }
      }
      if (this.card && (this.card.t -= dt) <= 0) this.card = null;
      if (this.phase === 'aim') {
        if (this.needRelease) { if (!hold) this.needRelease = false; } // a held reel button must not start the next cast
        else if (hold) { this.power = Math.min(1, this.power + dt * .8); this.held = true; }
        else if (this.held) {
          this.held = false;
          this.lure = {x: DOCK, y: 150, tx: DOCK + 40 + this.power * 430, t: 0, wet: false};
          this.phase = 'cast'; this.power = 0; G.sfx('swing');
        }
      } else if (this.phase === 'cast') {
        const L = this.lure; L.t += dt / .7;
        L.x = G.lerp(DOCK, L.tx, Math.min(1, L.t)); L.y = 150 + (SURF - 150) * L.t - Math.sin(Math.min(1, L.t) * Math.PI) * 90;
        if (L.t >= 1) { L.y = SURF; L.wet = true; this.phase = 'wait'; G.sfx('splash', .6); G.burst(this.parts, L.x, SURF, '#bfe6ff', 10, 80); }
      } else if (this.phase === 'wait') {
        const L = this.lure;
        if (hold) { L.x -= 70 * dt; L.y = Math.max(SURF + 4, L.y - 25 * dt); }
        else L.y = Math.min(460, L.y + 38 * dt);
        if (L.x < DOCK + 12) { this.lure = null; this.phase = 'aim'; }
      } else if (this.phase === 'bite') {
        const f = this.hooked;
        f.x = this.lure.x + Math.sin(f.t * 30) * 2;
        if ((this.biteT -= dt) <= 0) { f.state = 'flee'; f.scare = 1.2; f.dir = f.x < 400 ? 1 : -1; this.hooked = null; this.phase = 'wait'; }
      } else if (this.phase === 'reel') {
        const f = this.hooked, s = f.s;
        if ((this.runT -= dt) <= 0) { this.running = !this.running; this.runT = this.running ? .6 + G.rnd(.9) * s.power : 1 + G.rnd(1.5) / s.power; }
        this.tension += ((hold ? 70 : -55) + (this.running ? 42 * s.power : 0)) * dt;
        const zone = this.tension >= 30 && this.tension <= 85;
        this.progress += (hold ? (zone ? 24 : 6) / s.power : -4) * dt - (this.running ? 6 * s.power * dt : 0);
        this.progress = Math.max(0, this.progress);
        this.slack = this.tension <= 0 ? this.slack + dt : 0;
        this.tension = Math.max(0, this.tension);
        const L = this.lure;
        L.x = G.lerp(L.x, DOCK + 40 + (1 - this.progress / 100) * 380, dt * 3); L.y = G.lerp(L.y, SURF + 30 + (1 - this.progress / 100) * 120, dt * 3);
        f.x = L.x + Math.sin(f.t * 12) * (this.running ? 10 : 3); f.y = L.y + 6; f.dir = -1;
        if (this.tension > 100) { G.sfx('hurt'); G.shake(5); G.popText(this.parts, L.x, SURF - 20, 'SNAP!', '#ff6b8b', 20); return this.lose(); }
        if (this.slack > 2) { G.popText(this.parts, L.x, SURF - 20, 'It got away', '#c4c8ee'); return this.lose(); }
        if (this.progress >= 100) {
          const kg = (s.size / 10) ** 2 * (.7 + G.rnd(.6)) * .4, value = Math.round(s.value * (.8 + G.rnd(.6)));
          G.score += value; this.count++; this.seen.add(s.name);
          this.card = {s, kg, value, t: 2.5, first: this.seen.size > (this.lastSeen || 0)}; this.lastSeen = this.seen.size;
          G.sfx(s.value >= 150 ? 'win' : 'coin'); G.burst(this.parts, DOCK + 40, SURF, s.color, 20);
          this.fish[this.fish.indexOf(f)] = this.newFish(); this.hooked = null; this.lure = null; this.phase = 'aim'; this.needRelease = true;
        }
      }
    },
    lose() {
      const f = this.hooked; f.state = 'flee'; f.scare = 1.5; f.dir = 1;
      this.hooked = null; this.lure = null; this.phase = 'aim'; this.needRelease = true;
    },
    draw(ctx, dt) {
      const k = 1 - this.time / DAY;
      const top = `hsl(${G.lerp(205, 270, k)} ${G.lerp(60, 45, k)}% ${G.lerp(62, 30, k)}%)`, low = `hsl(${G.lerp(195, 20, k)} ${G.lerp(70, 80, k)}% ${G.lerp(80, 62, k)}%)`;
      const sky = ctx.createLinearGradient(0, 0, 0, SURF);
      sky.addColorStop(0, top); sky.addColorStop(1, low);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, SURF);
      const sunY = G.lerp(50, 200, k); G.circle(500, sunY, 24, k > .6 ? '#ff9f5c' : '#fff3c4');
      ctx.fillStyle = `hsl(${G.lerp(140, 260, k)} 25% ${G.lerp(35, 22, k)}%)`; ctx.beginPath(); ctx.moveTo(150, SURF);
      for (let x = 150; x <= W; x += 20) ctx.lineTo(x, SURF - 26 - Math.sin(x / 50) * 12 - Math.sin(x / 17) * 4);
      ctx.lineTo(W, SURF); ctx.fill();
      const water = ctx.createLinearGradient(0, SURF, 0, H);
      water.addColorStop(0, `hsl(${G.lerp(195, 210, k)} 55% ${G.lerp(45, 30, k)}%)`); water.addColorStop(1, '#0b2236');
      ctx.fillStyle = water; ctx.fillRect(0, SURF, W, H - SURF);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5;
      const now = performance.now() / 1000;
      for (let i = 0; i < 9; i++) { const y = SURF + 6 + i * 4, off = Math.sin(now + i) * 20; ctx.beginPath(); ctx.moveTo(170 + i * 50 + off, y); ctx.lineTo(200 + i * 50 + off, y); ctx.stroke(); }
      ctx.fillStyle = '#2c4a36'; for (let x = 170; x < W; x += 38) { ctx.beginPath(); ctx.moveTo(x, H); ctx.quadraticCurveTo(x + Math.sin(now + x) * 8, H - 40, x + 4, H - 70); ctx.lineTo(x + 8, H); ctx.fill(); }
      for (const f of this.fish) { ctx.globalAlpha = f === this.hooked ? 1 : .55; drawFish(ctx, f.x, f.y, f.s.size * .8, f === this.hooked ? f.s.color : '#0e2a3e', f.dir, f.t); }
      ctx.globalAlpha = 1;
      G.rr(0, 160, DOCK + 10, 14, 2, '#8a5a35'); for (let x = 8; x < DOCK; x += 40) G.rr(x, 172, 8, H - 172, 2, '#5a3d2a');
      ctx.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x < DOCK; x += 22) { ctx.beginPath(); ctx.moveTo(x, 160); ctx.lineTo(x, 174); ctx.stroke(); }
      G.rr(96, 112, 22, 48, 8, '#3d6fd9'); G.circle(107, 102, 11, '#f0c9a0'); ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.ellipse(107, 95, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(99, 86, 16, 9);
      const rodX = 150, rodY = 70 + (this.phase === 'aim' ? this.power * 25 : 0);
      ctx.strokeStyle = '#5a3d2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(115, 130); ctx.lineTo(rodX, rodY); ctx.stroke();
      if (this.lure) {
        const L = this.lure;
        ctx.strokeStyle = this.phase === 'reel' && this.tension > 85 ? '#ff6b8b' : 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rodX, rodY); ctx.quadraticCurveTo((rodX + L.x) / 2, Math.max(rodY, L.y) + (this.phase === 'reel' ? -10 : 30), L.x, L.y); ctx.stroke();
        G.circle(L.x, L.y, 4, '#ff4b62'); G.circle(L.x, L.y - 4, 2.5, '#ffffff');
      }
      if (this.phase === 'bite') G.text('!', this.lure.x, SURF - 14, {size: 30, align: 'center', display: true, color: '#ffcf5c', shadow: true});
      G.fx(this.parts, dt);
      G.bar({x: 14, y: 12, w: 200, h: 14, v: this.time, max: DAY, color: '#ffcf5c', label: `DAYLIGHT ${Math.ceil(this.time)}s`});
      if (this.phase === 'aim') {
        G.bar({x: 14, y: 34, w: 140, h: 10, v: this.power, max: 1, color: '#5ee6c1'});
        G.text(this.power ? 'Release to cast' : 'Hold Space to charge a cast', 162, 43, {size: 12, color: '#1b1a33', weight: 700});
      }
      if (this.phase === 'wait') G.text('Waiting for a bite… hold to reel the lure in', 14, 46, {size: 12, color: '#1b1a33', weight: 700});
      if (this.phase === 'reel') {
        G.panel(W - 76, 210, 62, 250);
        const zy = y => 440 - y / 100 * 210;
        G.rr(W - 60, zy(100), 18, 210, 9, 'rgba(255,255,255,.12)');
        G.rr(W - 60, zy(85), 18, zy(30) - zy(85), 4, 'rgba(94,230,193,.35)');
        G.rr(W - 60, zy(Math.min(100, this.tension)), 18, zy(0) - zy(Math.min(100, this.tension)), 6, this.tension > 85 ? '#ff4b62' : this.tension < 30 ? '#9aa0c8' : '#5ee6c1');
        G.text('LINE', W - 51, 452, {size: 10, align: 'center', weight: 700});
        G.bar({x: W - 280, y: 14, w: 266, h: 14, v: this.progress, max: 100, color: this.hooked.s.color, label: `${this.hooked.s.name.toUpperCase()}  ${Math.floor(this.progress)}%`, id: 'catch'});
      }
      if (this.card) {
        const c = this.card;
        G.panel(W / 2 - 150, 110, 300, 150, 14, 'rgba(12,16,40,.88)');
        drawFish(ctx, W / 2, 168, c.s.size * 1.3, c.s.color, 1, now);
        G.text(c.s.name, W / 2, 222, {size: 18, align: 'center', weight: 700});
        G.text(`${c.kg.toFixed(2)} kg  ·  +${c.value} pts${c.first ? '  ·  NEW!' : ''}`, W / 2, 246, {size: 13, align: 'center', color: '#ffcf5c'});
      }
    }
  });
})();

(() => {
  // Pseudo-3D rally stage on snow and ice. Cars are Blender renders; pines come from the Whisper Woods set.
  const W = 640, H = 400, SEG = 200, ROAD = 2000, CAM_H = 1000, DRAW = 160, M = 300;
  const DEPTH = 1 / Math.tan(50 * Math.PI / 180), MAXV = SEG * 62;
  const COLORS = ['blue', 'red', 'yellow', 'green', 'white', 'orange'];
  const NAMES = ['You', 'Red Fox', 'Bumble', 'Pine', 'Frost', 'Ember'];
  const ASSETS = [...COLORS.flatMap(c => ['c', 'l', 'r'].map(v => `img/rally_${c}_${v}.png`)), 'img/tree_pine.png', 'img/tree_pine2.png'];
  const SKIES = [{sky: ['#9ec9f0', '#e6f2fb'], fog: '#e8f0f8', light: 1}, {sky: ['#f0a878', '#fbe0c8'], fog: '#f6dccb', light: .9}, {sky: ['#3a3f6a', '#8a7aa8'], fog: '#6a6a8a', light: .65}];

  GameBox.register({
    id: 'snowrally', title: 'Snow Rally', genre: 'Racing', kind: 'Ice rally', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg',
    hint: 'Up to drive, Left/Right to steer. The ice is slippery: steer early and ease off on bends!',
    desc: 'A rally stage down a snowy mountain against five other cars. The road is icy, so your car slides wide on corners: turn in early, let off the gas, and do not hit the snowbanks or other cars. Finish in the top three to move on. Thirty stages at day, sunset and night.',
    controls: [['Up / W', 'Gas'], ['Down / S', 'Brake'], ['Left Right / A D', 'Steer']],
    info() { return `Stage ${G.level} · ${this.place()}${['', 'st', 'nd', 'rd'][this.place()] || 'th'} · ${Math.round(this.speed / MAXV * 160)} km/h`; },
    init() {
      const n = G.level, R = G.seeded(n * 37 + 11);
      this.look = SKIES[Math.floor((n - 1) / 10) % 3];
      const segs = this.segs = [];
      const lastY = () => segs.length ? segs.at(-1).p2.y : 0;
      const add = (curve, y) => { const i = segs.length; segs.push({i, p1: {y: lastY(), z: i * SEG}, p2: {y, z: (i + 1) * SEG}, curve, sprites: [], dark: Math.floor(i / 3) % 2}); };
      const ease = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + .5);
      const road = (enter, hold, leave, curve, hill) => { const y0 = lastY(), y1 = y0 + hill * SEG, t = enter + hold + leave;
        for (let k = 0; k < enter; k++) add(curve * (k / enter) ** 2, ease(y0, y1, k / t)); for (let k = 0; k < hold; k++) add(curve, ease(y0, y1, (enter + k) / t)); for (let k = 0; k < leave; k++) add(ease(curve, 0, k / leave), ease(y0, y1, (enter + hold + k) / t)); };
      road(30, 30, 30, 0, 0);
      const pieces = 12 + Math.min(16, Math.floor(n / 2));
      for (let k = 0; k < pieces; k++) { const sharp = Math.min(6, 2 + n * .12); road(15 + R.int(30), 20 + R.int(50), 15 + R.int(30), (R() < .5 ? -1 : 1) * (R() < .25 ? 0 : 1 + R() * sharp), (R() - .5) * 60); }
      road(40, 40, 40, 0, 0); road(60, 60, 60, 0, 0);
      this.finish = (segs.length - 120) * SEG; this.trackLen = segs.length * SEG;
      for (let i = 12; i < segs.length; i += 2 + R.int(3)) segs[i].sprites.push({img: R() < .6 ? 'tree_pine' : 'tree_pine2', off: (R() < .5 ? -1 : 1) * (1.4 + R() * 2.2), w: 1500 + R() * 900});
      for (let i = 40; i < segs.length; i += 25 + R.int(20)) segs[i].sprites.push({img: 'flag', off: R() < .5 ? -1.15 : 1.15, w: 260});
      this.x = 0; this.vx = 0; this.z = 0; this.speed = 0; this.t = 0; this.go = 3.2; this.done = null; this.shake = 0; this.steerV = 'c';
      this.cars = COLORS.slice(1).map((c, i) => ({color: c, name: NAMES[i + 1], z: (i + 1) * SEG * 4, x: [-.5, .5, -.2, .3, -.4][i], speed: 0, top: MAXV * (.7 + Math.min(.14, n * .005) + i * .015), done: false}));
      this.flakes = Array.from({length: 80}, () => ({x: R() * W, y: R() * H, s: 1 + R() * 2, v: 40 + R() * 70}));
      this.msg = `Stage ${n}`; this.msgT = 2;
    },
    seg(z) { return this.segs[Math.max(0, Math.min(this.segs.length - 1, Math.floor(z / SEG)))]; },
    place() { return 1 + this.cars.filter(c => c.z > this.z).length; },
    update(dt) {
      this.t += dt; this.msgT -= dt; this.shake = Math.max(0, this.shake - dt);
      for (const f of this.flakes) { f.y += f.v * dt; f.x += Math.sin(this.t + f.s) * 20 * dt - this.vx * 30 * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } if (f.x < 0) f.x += W; if (f.x > W) f.x -= W; }
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); this.speed *= Math.pow(.3, dt); this.z += this.speed * dt; return; }
      if (this.go > 0) { const b = Math.ceil(this.go); this.go -= dt; if (Math.ceil(this.go) !== b && this.go > 0) G.sfx('beat'); if (this.go <= 0) { G.sfx('power'); this.msg = 'GO!'; this.msgT = 1; } return; }
      const seg = this.seg(this.z), pct = this.speed / MAXV;
      const gas = G.held('ArrowUp', 'w'), brake = G.held('ArrowDown', 's'), steer = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a');
      const off = Math.abs(this.x) > 1;
      this.speed += (gas ? MAXV / 4.5 : brake ? -MAXV / 1.5 : -MAXV / 6) * dt;
      if (off) this.speed += (MAXV * .3 - this.speed) * Math.min(1, dt * 2.5);
      this.speed = Math.max(0, Math.min(MAXV, this.speed));
      // ice: steering builds sideways speed slowly, corners push you outward
      this.vx += steer * 2.6 * pct * dt; this.vx -= seg.curve * pct * pct * .9 * dt; this.vx *= Math.pow(.18, dt);
      this.x += this.vx * dt * 1.8;
      if (Math.abs(this.x) > 2.2) { this.x = Math.sign(this.x) * 2.2; this.vx *= -.3; this.speed *= .6; this.shake = .3; G.sfx('crunch', .6); }
      this.steerV = this.vx > .08 ? 'r' : this.vx < -.08 ? 'l' : 'c';
      this.z += this.speed * dt;
      for (const c of this.cars) {
        const cs = this.seg(c.z);
        c.speed += (c.top * (1 - Math.abs(cs.curve) * .03) - c.speed) * Math.min(1, dt * .8);
        // they drift back toward their line and away from you
        if (Math.abs(c.z - this.z) < SEG * 6 && Math.abs(c.x - this.x) < .4) c.x += (c.x > this.x ? 1 : -1) * .5 * dt;
        c.x = Math.max(-.8, Math.min(.8, c.x));
        if (!c.done) { c.z += c.speed * dt; if (c.z >= this.finish) { c.done = true; c.doneT = this.t; } }
        const dz = c.z - this.z;
        if (dz > 0 && dz < SEG * .9 && Math.abs(c.x - this.x) < .45 && this.speed > c.speed) { this.speed = c.speed * .7; this.shake = .25; G.sfx('hit'); this.vx += (this.x < c.x ? -.4 : .4); }
      }
      if (this.z >= this.finish) {
        const pl = this.place(); G.score += Math.max(0, 7 - pl) * 200 + G.level * 30;
        if (pl <= 3) { G.party(); this.done = {t: 1.6, go: () => G.win(pl === 1 ? 3 : pl === 2 ? 2 : 1, ['', 'Stage won!', 'Second place!', 'Third place!'][pl])}; }
        else this.done = {t: 1.6, go: () => G.end(`Finished ${pl}th: top 3 to pass`)};
        this.msg = ['', '1st!', '2nd!', '3rd!'][pl] || `${pl}th`; this.msgT = 3;
      }
      G.score += Math.round(this.speed * dt / 100);
    },
    project(p, cx, cy, cz) {
      const z = p.z - cz; if (z <= 0) return null;
      const s = DEPTH / z; return {x: Math.round(W / 2 + s * (p.x - cx) * W / 2), y: Math.round(H / 2 - s * (p.y - cy) * H / 2), w: Math.round(s * ROAD * W / 2), s};
    },
    draw(ctx, dt) {
      const L = this.look, j = this.shake > 0 ? (Math.random() - .5) * 8 : 0;
      ctx.save(); ctx.translate(j, j * .5);
      const sky = ctx.createLinearGradient(0, 0, 0, H / 2); sky.addColorStop(0, L.sky[0]); sky.addColorStop(1, L.sky[1]); ctx.fillStyle = sky; ctx.fillRect(-10, -10, W + 20, H + 20);
      const base = this.seg(this.z), bp = (this.z % SEG) / SEG, curveOff = this.segs.slice(base.i, base.i + 20).reduce((s, q) => s + q.curve, 0);
      // distant peaks drift with the bends
      for (const [par, col, hgt] of [[.4, 'rgba(255,255,255,.75)', 120], [.8, L.light < .8 ? '#4a4a6a' : '#b8c8dc', 80]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, H / 2 + 10); for (let x = -10; x <= W + 10; x += 20) { const wx = x + curveOff * 6 * par + this.t * 0; ctx.lineTo(x, H / 2 + 10 - Math.abs(Math.sin(wx * .012 + par * 3)) * hgt - Math.sin(wx * .037) * hgt * .25); } ctx.lineTo(W + 10, H / 2 + 10); ctx.fill(); }
      const camY = CAM_H + base.p1.y + (base.p2.y - base.p1.y) * bp;
      let x = 0, dx = -base.curve * bp, maxy = H;
      const list = [];
      for (let k = 0; k < DRAW; k++) {
        const s = this.segs[base.i + k]; if (!s) break;
        const p1 = this.project({x: 0, y: s.p1.y, z: s.p1.z}, this.x * ROAD - x, camY, this.z - (k === 0 ? 0 : 0));
        const p2 = this.project({x: 0, y: s.p2.y, z: s.p2.z}, this.x * ROAD - x - dx, camY, this.z);
        x += dx; dx += s.curve;
        if (!p1 || !p2 || p2.y >= maxy || p2.y >= p1.y) { s.clip = maxy; list.push([s, p1, p2]); continue; }
        const fog = Math.min(1, k / DRAW) ** 1.6;
        const quad = (c, x1, y1, w1, x2, y2, w2) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1 - w1, y1 + 1); ctx.lineTo(x2 - w2, y2 - 1); ctx.lineTo(x2 + w2, y2 - 1); ctx.lineTo(x1 + w1, y1 + 1); ctx.fill(); }; // 1px overlap hides seams
        ctx.fillStyle = s.dark ? '#e6eef6' : '#f4f8fc'; ctx.fillRect(-10, p2.y, W + 20, p1.y - p2.y + 1);
        quad(s.dark ? '#c43a3a' : '#ffffff', p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12);
        quad(s.dark ? '#9aa6b6' : '#a6b2c2', p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
        if (s.dark) quad('rgba(255,255,255,.55)', p1.x, p1.y, p1.w * .02, p2.x, p2.y, p2.w * .02);
        if (s.i * SEG >= this.finish && s.i * SEG < this.finish + SEG * 3) quad(s.i % 2 ? '#111' : '#fff', p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
        if (fog > .02) { ctx.globalAlpha = fog; ctx.fillStyle = L.fog; ctx.fillRect(-10, p2.y, W + 20, p1.y - p2.y + 1); ctx.globalAlpha = 1; }
        s.clip = maxy; maxy = p2.y; list.push([s, p1, p2]);
      }
      // sprites and cars, far to near
      for (let k = list.length - 1; k >= 0; k--) {
        const [s, p1] = list[k]; if (!p1) continue;
        for (const sp of s.sprites) {
          const img = sp.img === 'flag' ? null : G.img(`img/${sp.img}.png`);
          const sx = p1.x + p1.s * sp.off * ROAD * W / 2, w = p1.s * sp.w * W / 2;
          if (sp.img === 'flag') { const h = w * 3; ctx.fillStyle = '#ddd'; ctx.fillRect(sx - w * .05, p1.y - h, w * .1, h); ctx.fillStyle = '#ff5b6b'; ctx.fillRect(sx, p1.y - h, w * .9, w * .6); continue; }
          if (!img.complete || !img.naturalWidth) continue;
          const h = w * 2; if (p1.y - h > s.clip) continue;
          ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, W + 20, s.clip + 10); ctx.clip(); ctx.drawImage(img, sx - w / 2, p1.y - h, w, h); ctx.restore();
        }
        for (const c of this.cars) {
          if (Math.floor(c.z / SEG) !== s.i || c.z < this.z) continue;
          const img = G.img(`img/rally_${c.color}_c.png`); if (!img.complete || !img.naturalWidth) continue;
          const sx = p1.x + p1.s * c.x * ROAD * W / 2, w = p1.s * 1290 * W / 2, h = w * 2 / 3;
          ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, W + 20, s.clip + 10); ctx.clip(); ctx.drawImage(img, sx - w / 2, p1.y - h * .9, w, h); ctx.restore();
        }
      }
      // the player's car
      const me = G.img(`img/rally_blue_${this.steerV}.png`), bounce = this.speed > 100 ? Math.sin(this.t * 30) * 1.5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(W / 2, H - 22, 100, 14, 0, 0, Math.PI * 2); ctx.fill();
      if (me.complete && me.naturalWidth) ctx.drawImage(me, W / 2 - 120, H - 176 + bounce, 240, 160);
      if (this.speed > MAXV * .4) for (let i = 0; i < 3; i++) this.parts = (this.parts || []).concat([{x: W / 2 + (Math.random() - .5) * 160, y: H - 30, vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 40, life: .5, color: '#ffffff'}]);
      if (this.parts) { G.fx(this.parts, dt); if (this.parts.length > 120) this.parts.splice(0, this.parts.length - 120); }
      for (const f of this.flakes) G.circle(f.x, f.y, f.s, 'rgba(255,255,255,.85)');
      if (L.light < 1) { ctx.fillStyle = `rgba(10,10,40,${(1 - L.light) * .6})`; ctx.fillRect(-10, -10, W + 20, H + 20); }
      ctx.restore();
      // HUD
      const pl = this.place();
      G.text(`${pl}${['', 'st', 'nd', 'rd'][pl] || 'th'}`, 16, 44, {size: 36, display: true, color: pl <= 3 ? '#ffcf5c' : '#fff', shadow: true});
      G.text(`${Math.round(this.speed / MAXV * 160)} km/h`, W - 16, H - 18, {size: 18, align: 'right', weight: 800, color: '#fff', shadow: true});
      const prog = Math.min(1, this.z / this.finish); G.panel(160, 12, 320, 12, 6, 'rgba(0,0,0,.3)'); G.rr(161, 13, 318 * prog, 10, 5, '#5cb8ff');
      for (const c of this.cars) G.circle(160 + 320 * Math.min(1, c.z / this.finish), 18, 4, {red: '#ff5b6b', yellow: '#ffd25c', green: '#7ee08a', white: '#eee', orange: '#ff9f43'}[c.color]);
      if (Math.abs(this.x) > 1) G.text('OFF THE ROAD!', W / 2, 110, {size: 18, align: 'center', weight: 800, color: '#ff6b6b', shadow: true});
      if (this.go > 0) G.text(String(Math.ceil(this.go)), W / 2, H / 2 - 20, {size: 72, align: 'center', display: true, color: '#fff', shadow: true});
      else if (this.msgT > 0) G.text(this.msg, W / 2, 80, {size: 30, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

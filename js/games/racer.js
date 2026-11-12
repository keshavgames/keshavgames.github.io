(() => {
  // Pseudo-3D road: a list of flat segments projected to the screen, nearest first.
  const W = 640, H = 400, SEG = 200, ROAD = 2000, LANES = 3, CAM_H = 1000, DRAW = 150;
  const DEPTH = 1 / Math.tan(50 * Math.PI / 180), PLAYER_Z = CAM_H * DEPTH;
  const MAXV = SEG * 60, ACCEL = MAXV / 5, BRAKE = -MAXV, DECEL = -MAXV / 5, OFF_DECEL = -MAXV / 2, OFF_LIMIT = MAXV / 4;
  const COLORS = {
    light: {road: '#4b4a63', grass: '#2f6f55', rumble: '#f3f1ff', lane: '#f3f1ff'},
    dark: {road: '#46455c', grass: '#2a6550', rumble: '#e04e5f'},
    start: {road: '#f3f1ff', grass: '#2f6f55', rumble: '#f3f1ff'}
  };
  const FOG = '#c27a86';
  const SPRITES = {palm: .38, bush: .3, rock: .26, sign: .55, car: .3};
  const easeIn = (a, b, p) => a + (b - a) * p * p;
  const easeInOut = (a, b, p) => a + (b - a) * ((-Math.cos(p * Math.PI) / 2) + .5);
  const overlap = (x1, w1, x2, w2) => !(x1 + w1 / 2 < x2 - w2 / 2 || x1 - w1 / 2 > x2 + w2 / 2);

  function build() {
    const segs = [];
    const lastY = () => segs.length ? segs.at(-1).p2.y : 0;
    const add = (curve, y) => {
      const n = segs.length;
      segs.push({i: n, p1: {y: lastY(), z: n * SEG}, p2: {y, z: (n + 1) * SEG}, curve, sprites: [], cars: [], color: Math.floor(n / 3) % 2 ? COLORS.dark : COLORS.light});
    };
    const road = (enter, hold, leave, curve, hill) => {
      const y0 = lastY(), y1 = y0 + hill * SEG, total = enter + hold + leave;
      for (let n = 0; n < enter; n++) add(easeIn(0, curve, n / enter), easeInOut(y0, y1, n / total));
      for (let n = 0; n < hold; n++) add(curve, easeInOut(y0, y1, (enter + n) / total));
      for (let n = 0; n < leave; n++) add(easeInOut(curve, 0, n / leave), easeInOut(y0, y1, (enter + hold + n) / total));
    };
    road(25, 25, 25, 0, 0); road(50, 50, 50, 3, 20); road(25, 25, 25, 0, -20);
    road(25, 50, 25, -4, 40); road(50, 25, 50, 0, -30); road(25, 25, 25, 5, 0);
    road(25, 25, 25, -5, 10); road(25, 25, 25, 5, -10); road(50, 100, 50, -2, 60);
    road(50, 50, 50, 6, -40); road(25, 25, 25, 0, 0); road(50, 50, 50, -6, 20);
    road(100, 100, 100, 2, 0); road(50, 50, 50, -3, 30); road(25, 25, 25, 0, 0);
    road(50, 50, 50, 0, -lastY() / SEG); // settle back to the start height so the loop closes
    for (let i = 0; i < 4; i++) segs[i].color = COLORS.start;
    for (let n = 20; n < segs.length; n += 3 + Math.floor(G.rnd(3))) {
      const side = Math.random() < .5 ? -1 : 1, kind = G.pick(['palm', 'palm', 'palm', 'bush', 'rock']);
      segs[n].sprites.push({kind, offset: side * (1.25 + G.rnd(1.6))});
      if (Math.random() < .5) segs[n].sprites.push({kind: 'palm', offset: -side * (1.3 + G.rnd(1.2))});
    }
    for (let n = 60; n < segs.length; n += 140) segs[n].sprites.push({kind: 'sign', offset: G.pick([-1.4, 1.4])});
    return segs;
  }

  GameBox.register({
    id: 'racer', title: 'Sunset Rush', genre: 'Racing', kind: '3D arcade racer', w: W, h: H,
    desc: 'Floor it down a coastal highway at sunset. Weave through traffic, hug the curves and hit nitro on the straights. Every lap adds time; crashing into cars or roadside palms dents the car, and too many dents end the run.',
    controls: [['W / Up', 'Accelerate'], ['S / Down', 'Brake'], ['A D / Left Right', 'Steer'], ['Shift / Space', 'Nitro']],
    info() { return `Lap ${this.lap} · Passed ${this.passed}`; },
    init() {
      this.segs = build(); this.len = this.segs.length * SEG;
      this.pos = 0; this.x = 0; this.speed = 0; this.time = 45; this.hp = 100; this.nitro = 60; this.lap = 1; this.passed = 0;
      this.sky = 0; this.hitCd = 0; this.steer = 0; this.parts = [];
      this.cars = Array.from({length: 45}, () => ({z: 3000 + G.rnd(this.len - 6000), offset: G.pick([-.66, 0, .66]) + G.rnd(.2) - .1, speed: MAXV * (.25 + G.rnd(.35)), hue: G.pick([0, 45, 200, 140, 280, 20])}));
      for (const c of this.cars) c.ahead = true;
    },
    seg(z) { return this.segs[Math.floor(z / SEG) % this.segs.length]; },
    update(dt) {
      const ps = this.seg(this.pos + PLAYER_Z), sp = this.speed / MAXV, dx = dt * 2 * sp;
      this.hitCd -= dt;
      const steer = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft');
      this.steer += (steer - this.steer) * Math.min(1, dt * 10);
      this.x += dx * steer - dx * sp * ps.curve * .3; // centrifugal drift on curves
      const nitro = (G.keys.Shift || G.keys[' ']) && this.nitro > 0 && this.speed > 0;
      if (nitro) this.nitro = Math.max(0, this.nitro - 35 * dt); else this.nitro = Math.min(100, this.nitro + 5 * dt);
      const top = MAXV * (nitro ? 1.3 : 1);
      if (G.held('w', 'ArrowUp')) this.speed += ACCEL * (nitro ? 1.6 : 1) * dt;
      else if (G.held('s', 'ArrowDown')) this.speed += BRAKE * dt;
      else this.speed += DECEL * dt;
      if (Math.abs(this.x) > 1) {
        if (this.speed > OFF_LIMIT) this.speed += OFF_DECEL * dt;
        for (const s of ps.sprites) {
          if (!overlap(this.x, .26, s.offset + Math.sign(s.offset) * SPRITES[s.kind] / 2, SPRITES[s.kind])) continue;
          if (this.hitCd <= 0) { this.hp -= 18; this.hitCd = .6; G.shake(10, .35); G.flash(); G.sfx('crunch'); G.sfx('hurt', .6); }
          this.speed = MAXV / 5; this.pos = (this.pos - SEG * 2 + this.len) % this.len; break;
        }
      }
      for (const c of this.cars) {
        const old = c.z;
        c.z = (c.z + c.speed * dt) % this.len;
        const rel = ((c.z - (this.pos + PLAYER_Z)) % this.len + this.len * 1.5) % this.len - this.len / 2;
        const ahead = rel > 0;
        if (c.ahead && !ahead && Math.abs(rel) < 3000 && this.speed > c.speed) { this.passed++; G.score += 50; this.nitro = Math.min(100, this.nitro + 12); }
        c.ahead = ahead;
        if (Math.abs(rel) < SEG && this.speed > c.speed && overlap(this.x, .26, c.offset, SPRITES.car)) {
          this.speed = c.speed * (c.speed / this.speed); this.pos = (c.z - PLAYER_Z - SEG + this.len) % this.len;
          if (this.hitCd <= 0) { this.hp -= 12; this.hitCd = .6; G.shake(8, .3); G.flash(); G.sfx('crunch'); }
        }
        if (old > c.z && c.z < 1000) c.offset = G.pick([-.66, 0, .66]);
      }
      this.speed = G.clamp(this.speed, 0, top);
      this.x = G.clamp(this.x, -3, 3);
      const before = this.pos;
      this.pos = (this.pos + this.speed * dt) % this.len;
      if (this.pos < before) { this.lap++; this.time += 32; this.hp = Math.min(100, this.hp + 15); G.score += 1000; G.sfx('win'); G.popText(this.parts, W / 2, 120, `LAP ${this.lap}  +32s`, '#ffcf5c', 22); }
      this.sky += ps.curve * sp * dt * 6;
      G.score += this.speed * dt / 400;
      if (this.hp <= 0) { this.hp = 0; G.sfx('boom'); return G.end('Wrecked'); }
      if ((this.time -= dt) <= 0) { this.time = 0; return G.end("Time's up"); }
    },
    project(p, cx, cy, cz, world) {
      const camX = (world.x || 0) - cx, camY = world.y - cy, camZ = world.z - cz;
      p.scale = DEPTH / camZ; p.camZ = camZ;
      p.x = Math.round(W / 2 + p.scale * camX * W / 2); p.y = Math.round(H / 2 - p.scale * camY * H / 2); p.w = Math.round(p.scale * ROAD * W / 2);
    },
    poly(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill(); },
    sprite(ctx, kind, x, y, scale, clip, hue) {
      const w = SPRITES[kind] * ROAD * scale * W / 2;
      const h = kind === 'palm' ? w * 2.4 : kind === 'sign' ? w * .7 : kind === 'car' ? w * .62 : w * .8;
      if (w < 1.5 || y - h > clip || x + w < 0 || x - w > W) return; // tiny, hidden behind a hill or off screen
      const key = kind + (hue ?? ''), bmp = this.bmps[key] || (this.bmps[key] = this.bitmap(kind, hue));
      const sx = w / 100, sy = h / 100;
      if (y > clip) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, clip); ctx.clip(); } // only clip sprites that dip below a hill
      ctx.drawImage(bmp, x - 75 * sx, y - 105 * sy, 150 * sx, 110 * sy);
      if (y > clip) ctx.restore();
    },
    bmps: {},
    bitmap(kind, hue) { // sprites are painted once into a 150x110-unit box, then drawn as images
      const c = document.createElement('canvas'); c.width = 300; c.height = 220;
      const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.translate(75, 105);
      if (kind === 'palm') {
        ctx.strokeStyle = '#6b4a33'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -50, -4, -95); ctx.stroke();
        ctx.fillStyle = '#2f8f5c';
        for (const a of [-2.6, -2.1, -1.5, -1, -.5]) { ctx.beginPath(); ctx.ellipse(-4 + Math.cos(a) * 26, -95 + Math.sin(a) * 9 + 6, 30, 7, a + Math.PI / 2 + .9, 0, Math.PI * 2); ctx.fill(); }
      } else if (kind === 'bush') {
        ctx.fillStyle = '#3d8a54'; ctx.beginPath(); ctx.arc(-20, -30, 30, 0, Math.PI * 2); ctx.arc(20, -32, 32, 0, Math.PI * 2); ctx.arc(0, -55, 30, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'rock') {
        ctx.fillStyle = '#8c7f86'; ctx.beginPath(); ctx.moveTo(-50, 0); ctx.lineTo(-40, -60); ctx.lineTo(5, -95); ctx.lineTo(45, -55); ctx.lineTo(50, 0); ctx.fill();
        ctx.fillStyle = '#a2959c'; ctx.beginPath(); ctx.moveTo(-40, -60); ctx.lineTo(5, -95); ctx.lineTo(0, -40); ctx.fill();
      } else if (kind === 'sign') {
        ctx.fillStyle = '#3a3a4a'; ctx.fillRect(-40, -40, 8, 40); ctx.fillRect(32, -40, 8, 40);
        ctx.fillStyle = '#ffcf5c'; ctx.fillRect(-50, -100, 100, 62); ctx.fillStyle = '#1b1a33'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('»»', 0, -58);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-52, -8, 104, 10);
        ctx.fillStyle = `hsl(${hue} 65% 52%)`; ctx.beginPath(); ctx.roundRect(-50, -70, 100, 62, 10); ctx.fill();
        ctx.fillStyle = `hsl(${hue} 50% 38%)`; ctx.beginPath(); ctx.roundRect(-36, -98, 72, 34, 10); ctx.fill();
        ctx.fillStyle = '#20243d'; ctx.fillRect(-28, -92, 56, 22);
        ctx.fillStyle = '#ff4b62'; ctx.fillRect(-46, -50, 16, 8); ctx.fillRect(30, -50, 16, 8);
        ctx.fillStyle = '#15151f'; ctx.fillRect(-48, -12, 18, 12); ctx.fillRect(30, -12, 18, 12);
      }
      return c;
    },
    draw(ctx, dt) {
      const sky = ctx.createLinearGradient(0, 0, 0, H * .6);
      sky.addColorStop(0, '#2b1f5c'); sky.addColorStop(.6, '#c4567a'); sky.addColorStop(1, '#ff9f7a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      const sunX = W / 2 - this.sky * 40 % W;
      ctx.fillStyle = '#ffd25c'; ctx.beginPath(); ctx.arc(((sunX % W) + W) % W, H * .42, 60, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#c4567a'; for (let i = 0; i < 5; i++) ctx.fillRect(0, H * .42 - 8 - i * 11, W, 2 + i * .6);
      for (const [f, base, amp, color] of [[60, H * .5, 40, '#4a2d63'], [120, H * .52, 24, '#3a2452']]) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - Math.abs(Math.sin((x + this.sky * f) / 70)) * amp - Math.sin((x + this.sky * f) / 23) * 6);
        ctx.lineTo(W, H); ctx.fill();
      }
      const base = this.seg(this.pos), bp = (this.pos % SEG) / SEG, ps = this.seg(this.pos + PLAYER_Z), pp = ((this.pos + PLAYER_Z) % SEG) / SEG;
      const py = ps.p1.y + (ps.p2.y - ps.p1.y) * pp;
      let maxy = H, x = 0, dx = -base.curve * bp;
      for (const c of this.cars) c.seg = this.seg(c.z);
      for (const s of this.segs) s.cars.length = 0;
      for (const c of this.cars) c.seg.cars.push(c);
      for (let n = 0; n < DRAW; n++) {
        const s = this.segs[(base.i + n) % this.segs.length], looped = s.i < base.i, cz = this.pos - (looped ? this.len : 0);
        s.fog = 1 / Math.exp((n / DRAW) ** 2 * 3.5);
        s.clip = maxy; s.s1 = s.s1 || {}; s.s2 = s.s2 || {};
        this.project(s.s1, this.x * ROAD - x, py + CAM_H, cz, {y: s.p1.y, z: s.p1.z});
        this.project(s.s2, this.x * ROAD - x - dx, py + CAM_H, cz, {y: s.p2.y, z: s.p2.z});
        x += dx; dx += s.curve;
        s.visible = !(s.s1.camZ <= DEPTH || s.s2.y >= s.s1.y || s.s2.y >= maxy);
        if (!s.visible) continue;
        const {x: x1, y: y1, w: w1} = s.s1, {x: x2, y: y2, w: w2} = s.s2, c = s.color;
        const r1 = w1 / 6, r2 = w2 / 6;
        ctx.fillStyle = c.grass; ctx.fillRect(0, y2, W, y1 - y2);
        this.poly(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, c.rumble);
        this.poly(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, c.rumble);
        this.poly(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, c.road);
        if (c.lane) {
          const l1 = w1 / 40, l2 = w2 / 40;
          for (let lane = 1; lane < LANES; lane++) {
            const lx1 = x1 - w1 + lane * w1 * 2 / LANES, lx2 = x2 - w2 + lane * w2 * 2 / LANES;
            this.poly(ctx, lx1 - l1, y1, lx1 + l1, y1, lx2 + l2, y2, lx2 - l2, y2, c.lane);
          }
        }
        if (s.fog < 1) { ctx.globalAlpha = 1 - s.fog; ctx.fillStyle = FOG; ctx.fillRect(0, y2, W, y1 - y2); ctx.globalAlpha = 1; }
        maxy = y2;
      }
      for (let n = DRAW - 1; n > 0; n--) {
        const s = this.segs[(base.i + n) % this.segs.length];
        if (!s.s1 || s.s1.camZ <= DEPTH) continue;
        ctx.globalAlpha = Math.max(.25, s.fog);
        for (const c of s.cars) {
          const t = (c.z % SEG) / SEG, sc = s.s1.scale + (s.s2.scale - s.s1.scale) * t;
          const sx = s.s1.x + (s.s2.x - s.s1.x) * t + sc * c.offset * ROAD * W / 2, sy = s.s1.y + (s.s2.y - s.s1.y) * t;
          this.sprite(ctx, 'car', sx, sy, sc, s.clip, c.hue);
        }
        for (const sp of s.sprites) this.sprite(ctx, sp.kind, s.s1.x + s.s1.scale * sp.offset * ROAD * W / 2, s.s1.y, s.s1.scale, s.clip);
        ctx.globalAlpha = 1;
      }
      // the player's car
      const bounce = this.speed > 0 ? Math.sin(performance.now() / 40) * this.speed / MAXV * 1.5 : 0;
      const cx = W / 2, cy = H - 22 + bounce, tilt = this.steer * .06;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
      G.rr(-74, -4, 148, 12, 6, 'rgba(0,0,0,.35)');
      G.rr(-70, -46, 140, 44, 12, '#e04e5f'); G.rr(-52, -76, 104, 34, 12, '#b8323f');
      G.rr(-44, -70, 88, 22, 6, '#20243d'); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-40, -68, 30, 4);
      G.rr(-66, -34, 26, 10, 3, '#ff9f5c'); G.rr(40, -34, 26, 10, 3, '#ff9f5c');
      G.rr(-30, -26, 60, 10, 3, '#1b1a33');
      G.rr(-70, -10, 30, 14, 4, '#141420'); G.rr(40, -10, 30, 14, 4, '#141420');
      if ((G.keys.Shift || G.keys[' ']) && this.nitro > 0 && G.state === 'play') for (const ex of [-22, 22]) { ctx.fillStyle = Math.random() < .5 ? '#5cb8ff' : '#fff3c4'; ctx.beginPath(); ctx.moveTo(ex - 5, -12); ctx.lineTo(ex, 6 + Math.random() * 14); ctx.lineTo(ex + 5, -12); ctx.fill(); }
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(8, 8, 214, 74);
      G.bar({x: 18, y: 18, w: 194, h: 14, v: this.time, max: 50, color: this.time < 8 ? '#ff4b62' : '#ffcf5c', label: `TIME ${Math.ceil(this.time)}`, id: 'time'});
      G.bar({x: 18, y: 40, w: 194, h: 14, v: this.hp, max: 100, color: this.hp < 30 ? '#ff4b62' : '#5ee6c1', label: `CAR ${Math.ceil(this.hp)}%`, id: 'hp'});
      G.bar({x: 18, y: 62, w: 194, h: 10, v: this.nitro, max: 100, color: '#5cb8ff', label: 'NITRO'});
      G.text(`${Math.round(this.speed / MAXV * 240)}`, W - 64, H - 30, {size: 34, align: 'right', display: true, shadow: true});
      G.text('km/h', W - 18, H - 30, {size: 13, align: 'right', weight: 700, shadow: true});
    }
  });
})();

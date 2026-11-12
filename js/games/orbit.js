(() => {
  const W = 640, H = 480, SHIFT = 180, THRUST = 135, TURN = 3.4;
  const NAMES = ['Vela', 'Orin', 'Kestrel', 'Juno', 'Pell', 'Arda'];
  const HUES = [200, 25, 140, 280, 340, 50];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  GameBox.register({
    id: 'orbit', title: 'Orbit Courier', genre: 'Simulation', kind: 'Space flight', w: W, h: H,
    desc: 'Fly a delivery shuttle between small planets, each with its own gravity. Pick up a parcel, then land gently on the destination: slow down and keep your ship upright to the surface. Landing refuels you. The dotted line shows where gravity will carry you. Deliver as many as you can in one shift.',
    controls: [['W / Up', 'Thrust'], ['A D / Left Right', 'Rotate'], ['Land slowly, nose up', 'Refuel and pick up or deliver']],
    info() { return `Delivered ${this.done}`; },
    init() {
      this.time = SHIFT; this.done = 0; this.parts = []; this.rocks = []; this.inv = 0;
      this.planets = [];
      for (let tries = 0; this.planets.length < 5 && tries < 500; tries++) {
        const r = 22 + G.rnd(22), x = 60 + r + G.rnd(W - 120 - r * 2), y = 60 + r + G.rnd(H - 120 - r * 2);
        if (this.planets.some(p => G.dist(p.x, p.y, x, y) < p.r + r + 90)) continue;
        const i = this.planets.length;
        this.planets.push({x, y, r, m: r * r * 60, name: NAMES[i], hue: HUES[i]});
      }
      const home = this.planets[0];
      this.ship = {x: home.x, y: home.y - home.r - 8, vx: 0, vy: 0, a: 0, fuel: 100, hull: 100, landed: home, thrust: false};
      this.newJob(home);
    },
    newJob(from) {
      const others = this.planets.filter(p => p !== from);
      this.pickup = G.pick(others); this.dest = G.pick(this.planets.filter(p => p !== this.pickup)); this.cargo = false; this.jobT = 0;
    },
    accel(x, y) {
      let ax = 0, ay = 0;
      for (const p of this.planets) { const dx = p.x - x, dy = p.y - y, d2 = Math.max(dx * dx + dy * dy, p.r * p.r), d = Math.sqrt(d2); ax += dx / d * p.m / d2; ay += dy / d * p.m / d2; }
      return [ax, ay];
    },
    damage(n) {
      if (this.inv > 0) return;
      this.ship.hull -= n; this.inv = .5; G.shake(6); G.flash(); G.sfx('hurt');
      if (this.ship.hull <= 0) { this.ship.hull = 0; G.burst(this.parts, this.ship.x, this.ship.y, '#ff9f5c', 40, 260); G.sfx('boom'); G.end('Hull breached'); }
    },
    update(dt) {
      const s = this.ship;
      this.inv -= dt; this.jobT += dt;
      if ((this.time -= dt) <= 0) { this.time = 0; return G.end('Shift over'); }
      s.a += (G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft')) * TURN * dt;
      s.thrust = G.held('w', 'ArrowUp') && s.fuel > 0;
      if (s.thrust) {
        s.vx += Math.sin(s.a) * THRUST * dt; s.vy -= Math.cos(s.a) * THRUST * dt; s.fuel = Math.max(0, s.fuel - 7 * dt);
        if (Math.random() < .7) this.parts.push({x: s.x - Math.sin(s.a) * 12, y: s.y + Math.cos(s.a) * 12, vx: -Math.sin(s.a) * 80 + G.rnd(30) - 15, vy: Math.cos(s.a) * 80 + G.rnd(30) - 15, life: .35, color: G.pick(['#ffcf5c', '#ff9f5c'])});
      }
      if (s.landed) {
        const p = s.landed;
        s.fuel = Math.min(100, s.fuel + 30 * dt);
        if (!s.thrust) { s.vx = s.vy = 0; return this.rocksUpdate(dt); }
        s.from = p; s.lift = .6; s.landed = null; // brief grace so take-off does not count as landing again
      }
      s.lift = (s.lift || 0) - dt;
      const [ax, ay] = this.accel(s.x, s.y);
      s.vx += ax * dt; s.vy += ay * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.x = (s.x + W) % W; s.y = (s.y + H) % H;
      for (const p of this.planets) {
        const d = G.dist(s.x, s.y, p.x, p.y);
        if (d > p.r + 8) continue;
        const nx = (s.x - p.x) / d, ny = (s.y - p.y) / d, up = Math.atan2(nx, -ny), speed = Math.hypot(s.vx, s.vy);
        if (s.lift > 0 && p === s.from) { s.x = p.x + nx * (p.r + 8.5); s.y = p.y + ny * (p.r + 8.5); continue; }
        if (speed < 75 && Math.abs(angDiff(s.a, up)) < .55) {
          s.landed = p; s.a = up; s.vx = s.vy = 0; s.x = p.x + nx * (p.r + 8); s.y = p.y + ny * (p.r + 8); G.sfx('click');
          if (!this.cargo && p === this.pickup) { this.cargo = true; G.sfx('power'); G.popText(this.parts, s.x, s.y - 20, 'PARCEL LOADED', '#5ee6c1'); }
          else if (this.cargo && p === this.dest) {
            const bonus = Math.max(0, Math.round(60 - this.jobT) * 5);
            G.score += 250 + bonus; this.done++; this.time += 12; G.sfx('win');
            G.popText(this.parts, s.x, s.y - 20, `DELIVERED +${250 + bonus}  +12s`, '#ffcf5c', 15);
            if (this.done % 2 === 0 && this.rocks.length < 6) this.rocks.push({x: G.rnd(W), y: -20, vx: G.rnd(60) - 30, vy: 20 + G.rnd(30), r: 9 + G.rnd(8), rot: 0});
            this.newJob(p);
          }
        } else {
          this.damage(Math.max(10, speed * .25));
          const vn = s.vx * nx + s.vy * ny; s.vx -= 1.6 * vn * nx; s.vy -= 1.6 * vn * ny;
          s.x = p.x + nx * (p.r + 9); s.y = p.y + ny * (p.r + 9);
          G.burst(this.parts, s.x, s.y, '#c9ccd4', 8);
        }
        if (G.state !== 'play') return;
      }
      this.rocksUpdate(dt);
    },
    rocksUpdate(dt) {
      const s = this.ship;
      for (const r of this.rocks) {
        r.x = (r.x + r.vx * dt + W) % W; r.y = (r.y + r.vy * dt + H) % H; r.rot += dt;
        if (G.dist(r.x, r.y, s.x, s.y) < r.r + 8) { this.damage(20); const d = G.dist(r.x, r.y, s.x, s.y) || 1; s.vx += (s.x - r.x) / d * 80; s.vy += (s.y - r.y) / d * 80; s.landed = null; }
      }
    },
    draw(ctx, dt) {
      const s = this.ship, now = performance.now() / 1000;
      G.clear('#070818');
      for (let i = 0; i < 90; i++) G.circle((i * 137.5) % W, (i * 89.3) % H, (i % 3) * .5 + .5, `rgba(220,225,255,${.3 + (i % 4) * .15})`);
      for (const p of this.planets) {
        const g = ctx.createRadialGradient(p.x - p.r * .4, p.y - p.r * .4, p.r * .2, p.x, p.y, p.r);
        g.addColorStop(0, `hsl(${p.hue} 70% 68%)`); g.addColorStop(1, `hsl(${p.hue} 55% 32%)`);
        G.circle(p.x, p.y, p.r + 26, `hsla(${p.hue} 70% 60% / .06)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        G.text(p.name, p.x, p.y + p.r + 18, {size: 11, align: 'center', weight: 700, color: '#c4c8ee'});
        const target = this.cargo ? this.dest : this.pickup;
        if (p === target) {
          ctx.strokeStyle = this.cargo ? '#ffcf5c' : '#5ee6c1'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -now * 20;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          G.text(this.cargo ? 'DELIVER' : 'PICK UP', p.x, p.y - p.r - 18, {size: 11, align: 'center', weight: 700, color: this.cargo ? '#ffcf5c' : '#5ee6c1'});
        }
      }
      for (const r of this.rocks) {
        ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.fillStyle = '#7a7f99'; ctx.beginPath();
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = r.r * (.75 + ((k * 37) % 10) / 30); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.fill(); ctx.restore();
      }
      if (!s.landed) { // gravity preview
        let x = s.x, y = s.y, vx = s.vx, vy = s.vy;
        for (let i = 0; i < 110; i++) {
          const [ax, ay] = this.accel(x, y); vx += ax * .025; vy += ay * .025; x += vx * .025; y += vy * .025;
          if (this.planets.some(p => G.dist(x, y, p.x, p.y) < p.r)) break;
          if (i % 4 === 0) G.circle((x + W) % W, (y + H) % H, 1.5, `rgba(255,255,255,${.6 - i / 220})`);
        }
      }
      G.fx(this.parts, dt);
      const blink = this.inv > 0 && Math.floor(this.inv * 20) % 2;
      if (G.state !== 'over' && !blink) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
        ctx.fillStyle = '#e8e9ff'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 9); ctx.lineTo(0, 5); ctx.lineTo(-9, 9); ctx.closePath(); ctx.fill();
        G.circle(0, -2, 3, '#5cb8ff');
        if (this.cargo) G.rr(-4, 4, 8, 6, 1, '#c9a26b');
        ctx.restore();
      }
      const speed = Math.hypot(s.vx, s.vy);
      G.panel(8, 8, 220, 74);
      G.bar({x: 16, y: 16, w: 204, h: 14, v: s.fuel, max: 100, color: s.fuel < 20 ? '#ff4b62' : '#ffcf5c', label: `FUEL ${Math.ceil(s.fuel)}`, id: 'fuel'});
      G.bar({x: 16, y: 38, w: 204, h: 14, v: s.hull, max: 100, color: s.hull < 30 ? '#ff4b62' : '#5ee6c1', label: `HULL ${Math.ceil(s.hull)}`, id: 'hull'});
      G.bar({x: 16, y: 60, w: 204, h: 12, v: this.time, max: SHIFT, color: '#8b7bff', label: `SHIFT ${Math.ceil(this.time)}s`});
      G.text(`${this.cargo ? `Deliver to ${this.dest.name}` : `Pick up at ${this.pickup.name}`}`, W - 12, 24, {size: 13, align: 'right', weight: 700, color: this.cargo ? '#ffcf5c' : '#5ee6c1', shadow: true});
      G.text(`Speed ${Math.round(speed)}${speed > 75 ? '  too fast to land' : ''}`, W - 12, 44, {size: 11, align: 'right', color: speed > 75 ? '#ff6b8b' : '#9aa0c8'});
    }
  });
})();

(() => {
  // Track centerline: a closed Catmull-Rom curve through these points (canvas is 640 x 480).
  const PTS = [[100, 120], [260, 70], [450, 80], [580, 140], [590, 300], [520, 420], [380, 410], [320, 300], [220, 330], [150, 420], [60, 300]];
  const SEG = 24, HALF = 36; // samples per segment, half the track width
  const path = [];
  for (let i = 0; i < PTS.length; i++) {
    const [p0, p1, p2, p3] = [-1, 0, 1, 2].map(o => PTS[(i + o + PTS.length) % PTS.length]);
    for (let s = 0; s < SEG; s++) {
      const t = s / SEG, t2 = t * t, t3 = t2 * t;
      path.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  const CPS = PTS.map((_, i) => i * SEG); // one checkpoint per control point; 0 is the start line
  const track = new Path2D();
  path.forEach(([x, y], i) => i ? track.lineTo(x, y) : track.moveTo(x, y));
  track.closePath();
  const offTrack = (x, y) => !path.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < HALF * HALF);

  GameBox.register({
    id: 'drift', title: 'Neon Drift', genre: 'Racing', kind: 'Top-down racer', w: 640, h: 480,
    desc: 'Time-attack racing on a twisting circuit. Every checkpoint adds time. Sliding through corners charges your boost; gravel and walls chew up the hull, and each lap patches it a little.',
    controls: [['W / Up', 'Accelerate'], ['S / Down', 'Brake and reverse'], ['A D / Left Right', 'Steer'], ['Space / Shift', 'Boost']],
    info() { return `Lap ${this.lap} · ${Math.round(Math.hypot(this.vx, this.vy) / 3)} km/h`; },
    init() {
      const [x, y] = path[0], [nx, ny] = path[3];
      Object.assign(this, {x, y, ang: Math.atan2(ny - y, nx - x), speed: 0, vx: 0, vy: 0, time: 8, lap: 1, next: 1,
        hp: 100, boost: 40, boosting: false, skids: [], parts: [], hitCd: 0});
    },
    update(dt) {
      this.hitCd -= dt;
      const off = offTrack(this.x, this.y);
      const gas = G.held('ArrowUp', 'w'), brake = G.held('ArrowDown', 's'), steer = G.held('ArrowRight', 'd') - G.held('ArrowLeft', 'a');
      this.boosting = (G.keys[' '] || G.keys.Shift) && this.boost > 0 && gas;
      if (this.boosting) this.boost = Math.max(0, this.boost - 45 * dt);
      const top = this.boosting ? 430 : 330;
      this.speed += (gas * (this.boosting ? 560 : 380) - brake * 520) * dt;
      this.speed -= this.speed * (off ? 2.4 : .55) * dt;
      this.speed = G.clamp(this.speed, -120, top);
      this.ang += steer * 3 * dt * G.clamp(this.speed / 140, -1, 1);
      // velocity chases the heading; low grip on asphalt lets the car slide out in turns
      const hx = Math.cos(this.ang), hy = Math.sin(this.ang), grip = Math.min(1, dt * (off ? 7 : 3.2));
      this.vx += (hx * this.speed - this.vx) * grip;
      this.vy += (hy * this.speed - this.vy) * grip;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (nx < 8 || nx > G.W - 8 || ny < 8 || ny > G.H - 8) { // wall hit
        this.vx *= -.4; this.vy *= -.4; this.speed *= .3;
        if (this.hitCd <= 0) { this.hp -= 12; this.hitCd = .4; G.shake(6); G.sfx('crunch'); G.burst(this.parts, this.x, this.y, '#ffcf5c', 10); }
      }
      this.x = G.clamp(nx, 8, G.W - 8); this.y = G.clamp(ny, 8, G.H - 8);
      const slip = Math.abs(this.vy * hx - this.vx * hy);
      if (slip > 60) { this.skids.push({x: this.x, y: this.y, life: 2}); if (!off) this.boost = Math.min(100, this.boost + 28 * dt); }
      if (off && Math.abs(this.speed) > 40) { this.hp -= 9 * dt; if (Math.random() < .3) G.burst(this.parts, this.x, this.y, '#3d5a3a', 1, 60); }
      if (this.hp <= 0) { this.hp = 0; G.burst(this.parts, this.x, this.y, '#ff9f5c', 30); G.sfx('boom'); return G.end('Wrecked'); }
      const [cx, cy] = path[CPS[this.next]];
      if (Math.hypot(cx - this.x, cy - this.y) < 50) {
        G.score += 100; this.time += Math.max(.45, .9 - (this.lap - 1) * .06);
        G.burst(this.parts, cx, cy, '#5ee6c1', 10); G.sfx('coin', .6);
        if (this.next === 0) { this.lap++; G.score += 500; this.hp = Math.min(100, this.hp + 25); G.popText(this.parts, cx, cy - 20, `LAP ${this.lap}`, '#ffcf5c', 20); G.sfx('power'); }
        this.next = (this.next + 1) % CPS.length;
      }
      if ((this.time -= dt) <= 0) { this.time = 0; G.end("Time's up"); }
    },
    draw(ctx, dt) {
      G.clear('#0c1d22');
      ctx.lineJoin = ctx.lineCap = 'round';
      ctx.lineWidth = HALF * 2 + 10; ctx.strokeStyle = '#e8e9ff'; ctx.stroke(track);
      ctx.setLineDash([12, 12]); ctx.strokeStyle = '#ff6b8b'; ctx.stroke(track);
      ctx.setLineDash([]); ctx.lineWidth = HALF * 2; ctx.strokeStyle = '#2a2d4a'; ctx.stroke(track);
      ctx.setLineDash([10, 14]); ctx.lineWidth = 2; ctx.strokeStyle = '#4a4f7a'; ctx.stroke(track); ctx.setLineDash([]);
      const [sx, sy] = path[0], [tx, ty] = path[1];
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(ty - sy, tx - sx));
      for (let i = -HALF, n = 0; i < HALF; i += 8, n++) {
        ctx.fillStyle = n % 2 ? '#f3f1ff' : '#14152a'; ctx.fillRect(-4, i, 4, 8);
        ctx.fillStyle = n % 2 ? '#14152a' : '#f3f1ff'; ctx.fillRect(0, i, 4, 8);
      }
      ctx.restore();
      ctx.fillStyle = '#14152a';
      for (let i = this.skids.length - 1; i >= 0; i--) {
        const s = this.skids[i];
        if ((s.life -= dt) <= 0) { this.skids.splice(i, 1); continue; }
        ctx.globalAlpha = s.life / 2 * .8; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
      }
      const [cx, cy] = path[CPS[this.next]];
      ctx.globalAlpha = .55 + Math.sin(performance.now() / 150) * .3;
      ctx.strokeStyle = '#5ee6c1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.ang);
      if (this.boosting) { ctx.fillStyle = '#ff9f5c'; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.lineTo(-24 - Math.random() * 8, 0); ctx.lineTo(-13, 4); ctx.fill(); }
      G.rr(-13, -7, 26, 14, 4, this.hitCd > .2 ? '#ffffff' : '#ff6b8b');
      ctx.fillStyle = '#1b1a33'; ctx.fillRect(1, -5, 6, 10);
      ctx.fillStyle = '#ffcf5c'; ctx.fillRect(11, -6, 2, 3); ctx.fillRect(11, 3, 2, 3);
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(8, 8, 196, 76);
      G.bar({x: 18, y: 18, w: 176, h: 14, v: this.time, max: 15, color: this.time < 4 ? '#ff6b8b' : '#ffcf5c', label: `TIME ${this.time.toFixed(1)}`, id: 'time'});
      G.bar({x: 18, y: 40, w: 176, h: 14, v: this.hp, max: 100, color: this.hp < 30 ? '#ff6b8b' : '#5ee6c1', label: `HULL ${Math.ceil(this.hp)}`, id: 'hull'});
      G.bar({x: 18, y: 62, w: 176, h: 12, v: this.boost, max: 100, color: '#5cb8ff', label: 'BOOST'});
    }
  });
})();

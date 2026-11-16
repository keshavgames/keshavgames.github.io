(() => {
  // Top-down speedboat racing through buoy gates. Boats are Blender renders.
  const W = 800, H = 500, LAPS = 3, GATE = 150;
  const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];
  const NAMES = ['You', 'Splash', 'Kelp', 'Sunny', 'Coral', 'Tide'];
  const ASSETS = COLORS.map(c => `img/boat_${c}.png`);
  const SEAS = [{water: ['#2a8ad0', '#1f78c0'], foam: 'rgba(255,255,255,.5)', land: '#e8d8a0', grass: '#5aa04a'}, {water: ['#1aa0a8', '#138890'], foam: 'rgba(255,255,255,.55)', land: '#f0e2b8', grass: '#6ab052'}, {water: ['#2a4a8a', '#203e78'], foam: 'rgba(200,220,255,.45)', land: '#c8c0a8', grass: '#3f7a4a'}];

  GameBox.register({
    id: 'boat', title: 'Boat Blitz', genre: 'Racing', kind: 'Speedboat racing', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg',
    hint: 'Steer through every pair of buoys! Boats slide on water, so turn early. Hit the yellow ramps for a boost.',
    desc: 'Six speedboats race around a buoy course on open water. Pass between every pair of buoys in order, slide around the turns, and launch off yellow ramps for a burst of speed. Missing a gate costs you, so steer early. Thirty courses across sunny bays, tropical lagoons and night water, or race a friend on split screen.',
    controls: [['W / Up', 'Throttle'], ['A D / Left Right', 'Steer'], ['S / Down', 'Slow down'], ['2P: Arrows', 'Player 2']],
    info() { const me = this.B[0]; return `Course ${G.level} · Lap ${Math.min(LAPS, me.lap + 1)}/${LAPS} · Place ${this.place(me)}`; },
    init() {
      const n = G.level, R = G.seeded(n * 59 + 4); this.sea = SEAS[Math.floor((n - 1) / 10) % 3];
      const k = 7 + Math.min(5, Math.floor(n / 5)), base = 700 + Math.min(500, n * 14);
      this.gates = Array.from({length: k}, (_, i) => { const a = i / k * Math.PI * 2, r = base * (.65 + R() * .45); return {x: Math.cos(a) * r * 1.3, y: Math.sin(a) * r}; });
      this.gates.forEach((g, i) => { const nx = this.gates[(i + 1) % k], pv = this.gates[(i - 1 + k) % k]; g.a = Math.atan2(nx.y - pv.y, nx.x - pv.x); });
      this.ramps = this.gates.filter((_, i) => i % 3 === 1).map((g, i) => { const nx = this.gates[(this.gates.indexOf(g) + 1) % k]; return {x: (g.x + nx.x) / 2, y: (g.y + nx.y) / 2, a: Math.atan2(nx.y - g.y, nx.x - g.x)}; });
      this.isles = Array.from({length: 10}, () => ({x: (R() - .5) * base * 1.2, y: (R() - .5) * base * .8, r: 40 + R() * 70})).filter(s => this.gates.every(g => Math.hypot(g.x - s.x, g.y - s.y) > s.r + 220));
      const duel = G.mode === 'local', g0 = this.gates[0], back = g0.a + Math.PI;
      this.B = COLORS.map((c, i) => ({i, color: c, name: duel && i === 1 ? 'Player 2' : NAMES[i], human: i === 0 || (duel && i === 1), x: g0.x + Math.cos(back) * (80 + Math.floor(i / 2) * 60) - Math.sin(back) * (i % 2 ? 36 : -36), y: g0.y + Math.sin(back) * (80 + Math.floor(i / 2) * 60) + Math.cos(back) * (i % 2 ? 36 : -36), a: g0.a, vx: 0, vy: 0, gate: 0, lap: 0, done: false, doneT: 0, boost: 0, skill: .8 + Math.min(.16, n * .006) + i * .012, miss: 0, wake: 0}));
      this.parts = []; this.wakes = []; this.t = 0; this.go = 3.2; this.over = null; this.results = null; this.msgT = 0;
    },
    prog(b) { return b.lap * this.gates.length + b.gate - Math.hypot(this.gates[b.gate].x - b.x, this.gates[b.gate].y - b.y) / 5000; },
    place(b) { return 1 + this.B.filter(o => o !== b && (o.done && b.done ? o.doneT < b.doneT : o.done ? true : b.done ? false : this.prog(o) > this.prog(b))).length; },
    steerBoat(b, thr, steer, dt) {
      const sp = Math.hypot(b.vx, b.vy), fwd = b.vx * Math.cos(b.a) + b.vy * Math.sin(b.a);
      b.a += steer * (1.2 + Math.min(1.6, sp / 160)) * dt;
      const top = (b.human ? 1 : b.skill) * (b.boost > 0 ? 470 : 330);
      if (thr > 0 && fwd < top) { b.vx += Math.cos(b.a) * 300 * dt; b.vy += Math.sin(b.a) * 300 * dt; }
      if (thr < 0) { b.vx *= Math.pow(.3, dt); b.vy *= Math.pow(.3, dt); }
      // water: sideways slip fades slowly, forward speed fades a little
      const side = -b.vx * Math.sin(b.a) + b.vy * Math.cos(b.a), keepF = Math.pow(.7, dt), keepS = Math.pow(.08, dt);
      const f2 = (b.vx * Math.cos(b.a) + b.vy * Math.sin(b.a)) * keepF, s2 = side * keepS;
      b.vx = Math.cos(b.a) * f2 - Math.sin(b.a) * s2; b.vy = Math.sin(b.a) * f2 + Math.cos(b.a) * s2;
      b.x += b.vx * dt; b.y += b.vy * dt;
      for (const s of this.isles) { const d = Math.hypot(b.x - s.x, b.y - s.y); if (d < s.r + 16) { const nx = (b.x - s.x) / d, ny = (b.y - s.y) / d; b.x = s.x + nx * (s.r + 16); b.y = s.y + ny * (s.r + 16); const dot = b.vx * nx + b.vy * ny; b.vx -= nx * dot * 1.6; b.vy -= ny * dot * 1.6; if (b.human) { G.sfx('crunch', .5); G.shake(4, .2); } } }
      if ((b.wake -= dt) <= 0 && sp > 60) { b.wake = .05; this.wakes.push({x: b.x - Math.cos(b.a) * 34, y: b.y - Math.sin(b.a) * 34, life: 1.4, s: sp / 330}); }
    },
    ai(b, dt) {
      const g = this.gates[b.gate], nx = this.gates[(b.gate + 1) % this.gates.length];
      const tx = g.x + (nx.x - g.x) * .15, ty = g.y + (nx.y - g.y) * .15;
      let rel = Math.atan2(ty - b.y, tx - b.x) - b.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      this.steerBoat(b, Math.abs(rel) > 1.3 ? 0 : 1, Math.max(-1, Math.min(1, rel * 2.5)), dt);
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.over && this.over.t > 0 && (this.over.t -= dt) <= 0) this.over.go();
      for (const w of this.wakes) w.life -= dt; this.wakes = this.wakes.filter(w => w.life > 0); if (this.wakes.length > 500) this.wakes.splice(0, this.wakes.length - 500);
      if (this.go > 0) { const c = Math.ceil(this.go); this.go -= dt; if (Math.ceil(this.go) !== c && this.go > 0) G.sfx('beat', .8); if (this.go <= 0) { G.sfx('power'); this.msg = 'GO!'; this.msgT = 1; } return; }
      const duel = G.mode === 'local';
      for (const b of this.B) {
        b.boost -= dt;
        if (b.done) { b.vx *= Math.pow(.4, dt); b.vy *= Math.pow(.4, dt); b.x += b.vx * dt; b.y += b.vy * dt; continue; }
        if (b.i === 0) this.steerBoat(b, G.held('w', duel ? 'w' : 'ArrowUp') - G.held('s', duel ? 's' : 'ArrowDown'), G.held('d', duel ? 'd' : 'ArrowRight') - G.held('a', duel ? 'a' : 'ArrowLeft'), dt);
        else if (duel && b.i === 1) this.steerBoat(b, G.held('ArrowUp') - G.held('ArrowDown'), G.held('ArrowRight') - G.held('ArrowLeft'), dt);
        else this.ai(b, dt);
        // passing between the buoys of the next gate
        const g = this.gates[b.gate], along = (b.x - g.x) * Math.cos(g.a) + (b.y - g.y) * Math.sin(g.a), across = -(b.x - g.x) * Math.sin(g.a) + (b.y - g.y) * Math.cos(g.a);
        if (along > 0 && along < 60 && Math.abs(across) < GATE / 2) {
          b.gate = (b.gate + 1) % this.gates.length; if (b.human) G.sfx('coin', .5);
          if (b.gate === 0) { b.lap++; if (b.lap >= LAPS) { b.done = true; b.doneT = this.t; if (b.human) this.finish(b); } else if (b.human) { this.msg = b.lap === LAPS - 1 ? 'FINAL LAP!' : `LAP ${b.lap + 1}`; this.msgT = 1.5; } }
        } else if (along > 60 && along < 200 && Math.abs(across) < 400 && b.human && b.missT !== b.gate) { b.missT = b.gate; this.msg = 'Missed a gate! Go back through it'; this.msgT = 1.6; G.sfx('hurt', .4); }
        for (const r of this.ramps) if (Math.hypot(r.x - b.x, r.y - b.y) < 34 && b.boost < .5) { b.boost = 1.2; if (b.human) { G.sfx('power', .6); this.msg = 'BOOST!'; this.msgT = .8; } this.parts.push(...Array.from({length: 10}, () => ({x: b.x, y: b.y, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: .5, color: '#fff'}))); }
      }
      for (let i = 0; i < this.B.length; i++) for (let j = i + 1; j < this.B.length; j++) { const a = this.B[i], c = this.B[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); if (d < 40 && d > 0) { const p = (40 - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; c.x += dx / d * p; c.y += dy / d * p; } }
      for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.results && this.t > this.results + 4) for (const b of this.B) if (!b.done) { b.done = true; b.doneT = this.t + 1 - this.prog(b) * 1e-4; }
    },
    finish(b) {
      const pl = this.place(b); this.results = this.t;
      if (G.mode === 'local') { G.party(); this.msg = `${b.name === 'You' ? 'PLAYER 1' : 'PLAYER 2'} WINS!`; this.msgT = 3; this.over = {t: 2.2, go: () => G.end(`${b.name === 'You' ? 'Player 1' : 'Player 2'} wins!`)}; return; }
      this.msg = ['', '1st PLACE!', '2nd place!', '3rd place!'][pl] || `${pl}th place`; this.msgT = 3; G.score += Math.max(0, 7 - pl) * 150 + G.level * 30;
      if (pl <= 3) { G.party(); this.over = {t: 2.2, go: () => G.win(pl === 1 ? 3 : pl === 2 ? 2 : 1, ['', 'You won the race!', 'Second place!', 'On the podium!'][pl])}; }
      else this.over = {t: 2.2, go: () => G.end(`Finished ${pl}th: top 3 to pass`)};
    },
    view(ctx, me, vx, vy, vw, vh) {
      const S = this.sea; ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
      const cx = me.x + me.vx * .35, cy = me.y + me.vy * .35;
      ctx.fillStyle = S.water[0]; ctx.fillRect(vx, vy, vw, vh);
      ctx.translate(vx + vw / 2 - cx, vy + vh / 2 - cy);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
      for (let gx = Math.floor((cx - vw) / 90) * 90; gx < cx + vw; gx += 90) for (let gy = Math.floor((cy - vh) / 70) * 70; gy < cy + vh; gy += 70) { const o = Math.sin(this.t * 2 + gx * .01 + gy * .02) * 6; ctx.beginPath(); ctx.moveTo(gx + o, gy); ctx.quadraticCurveTo(gx + 12 + o, gy - 5, gx + 24 + o, gy); ctx.stroke(); }
      for (const s of this.isles) { G.circle(s.x, s.y, s.r + 14, 'rgba(255,255,255,.25)'); G.circle(s.x, s.y, s.r + 8, S.land); G.circle(s.x, s.y, s.r * .75, S.grass); G.circle(s.x - s.r * .2, s.y - s.r * .2, s.r * .3, 'rgba(0,0,0,.12)'); }
      for (const w of this.wakes) { ctx.strokeStyle = `rgba(255,255,255,${w.life * .35 * w.s})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(w.x, w.y, 6 + (1.4 - w.life) * 22, 0, Math.PI * 2); ctx.stroke(); }
      for (const r of this.ramps) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a); G.rr(-26, -22, 52, 44, 6, '#ffcf5c'); ctx.fillStyle = '#e8a020'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 12, -12); ctx.lineTo(-4 + i * 12, 0); ctx.lineTo(-14 + i * 12, 12); ctx.fill(); } ctx.restore(); }
      this.gates.forEach((g, i) => {
        const nextForMe = i === me.gate;
        for (const s of [-1, 1]) { const bx = g.x - Math.sin(g.a) * s * GATE / 2, by = g.y + Math.cos(g.a) * s * GATE / 2, bob = Math.sin(this.t * 3 + i) * 2; G.circle(bx + 3, by + 4, 12, 'rgba(0,0,0,.2)'); G.circle(bx, by + bob, 12, s < 0 ? '#ff5b5b' : '#5ee66b'); G.circle(bx - 3, by - 3 + bob, 4, 'rgba(255,255,255,.6)'); }
        if (nextForMe) { ctx.strokeStyle = `rgba(255,255,255,${.5 + Math.sin(this.t * 6) * .3})`; ctx.setLineDash([8, 8]); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x - Math.sin(g.a) * GATE / 2, g.y + Math.cos(g.a) * GATE / 2); ctx.lineTo(g.x + Math.sin(g.a) * GATE / 2, g.y - Math.cos(g.a) * GATE / 2); ctx.stroke(); ctx.setLineDash([]); }
      });
      for (const b of this.B) {
        const img = G.img(`img/boat_${b.color}.png`); if (!img.complete || !img.naturalWidth) continue;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.drawImage(img, -36, -36, 72, 72); ctx.restore();
        if (!b.human) G.text(b.name, b.x, b.y - 30, {size: 10, align: 'center', weight: 800, color: '#fff', shadow: true});
      }
      for (const p of this.parts) G.circle(p.x, p.y, 3, `rgba(255,255,255,${p.life * 2})`);
      ctx.restore();
      // arrow toward my next gate
      const g = this.gates[me.gate], ang = Math.atan2(g.y - me.y, g.x - me.x);
      ctx.save(); ctx.translate(vx + vw / 2, vy + 28); ctx.rotate(ang); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-3, 0); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill(); ctx.restore();
      const pl = this.place(me);
      G.text(`${pl}${['', 'st', 'nd', 'rd'][pl] || 'th'}`, vx + 16, vy + 44, {size: 34, display: true, color: pl === 1 ? '#ffcf5c' : '#fff', shadow: true});
      G.text(`LAP ${Math.min(LAPS, me.lap + 1)}/${LAPS}`, vx + 18, vy + 64, {size: 13, weight: 800, color: '#fff', shadow: true});
    },
    draw(ctx, dt) {
      if (G.mode === 'local') { this.view(ctx, this.B[0], 0, 0, W / 2 - 2, H); this.view(ctx, this.B[1], W / 2 + 2, 0, W / 2 - 2, H); ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 2, 0, 4, H); }
      else this.view(ctx, this.B[0], 0, 0, W, H);
      if (this.go > 0) G.text(String(Math.ceil(this.go)), W / 2, H / 2, {size: 80, align: 'center', display: true, color: '#fff', shadow: true});
      else if (this.msgT > 0) G.text(this.msg, W / 2, H / 2 - 60, {size: 28, align: 'center', display: true, color: '#ffcf5c', shadow: true});
    }
  });
})();

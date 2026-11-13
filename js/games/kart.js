(() => {
  // Top-down kart racing with items. Karts are Blender renders; tracks are generated loops.
  const W = 800, H = 500, LAPS = 3, WIDTH = 120;
  const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'pink', 'teal'];
  const NAMES = ['You', 'Rosa', 'Moss', 'Sunny', 'Violet', 'Blaze', 'Pip', 'Wave'];
  const ASSETS = COLORS.map(c => `img/kart_${c}.png`);
  const ITEMS = {turbo: {c: '#ff9f43', i: '»'}, goo: {c: '#7ee08a', i: '●'}, zap: {c: '#5cb8ff', i: '⚡'}, bubble: {c: '#ff7bd0', i: '○'}};
  const THEMES = [
    {name: 'Meadow Loop', grass: '#5aa04a', grass2: '#4f9442', road: '#5a5d66', curb: ['#e8e8e8', '#e84a4a'], deco: '#2f6a2a'},
    {name: 'Desert Dash', grass: '#e2c07a', grass2: '#d6b26a', road: '#6a6258', curb: ['#f4f0e0', '#e88a3a'], deco: '#6a9a3a'},
    {name: 'Snowy Spin', grass: '#e8f2fa', grass2: '#dce8f4', road: '#5a6474', curb: ['#ffffff', '#4a8ae8'], deco: '#2f5a4a'},
    {name: 'Candy Curve', grass: '#ffc8e0', grass2: '#ffb8d6', road: '#7a5a8a', curb: ['#ffffff', '#ff5ba8'], deco: '#a85ae8'}
  ];

  function buildTrack(R, n) {
    const pts = [], k = 7 + R.int(4), base = 600 + Math.min(320, n * 11);
    for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2, r = base * (.62 + R() * .5); pts.push([Math.cos(a) * r * 1.25, Math.sin(a) * r]); }
    const out = [], seg = 14;
    for (let i = 0; i < k; i++) { // Catmull-Rom through the control points
      const p0 = pts[(i - 1 + k) % k], p1 = pts[i], p2 = pts[(i + 1) % k], p3 = pts[(i + 2) % k];
      for (let s = 0; s < seg; s++) {
        const t = s / seg, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    return out;
  }

  GameBox.register({
    id: 'kart', title: 'Kart Chaos', genre: 'Racing', kind: 'Kart racing', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg',
    hint: 'Steer with arrows or A/D, drive with W. Hit the ? boxes for items and press Space to use them!',
    desc: 'Eight toy karts, three laps, total chaos. Drive through the glowing item boxes to grab a turbo boost, a goo puddle to drop behind you, a zap orb that chases the kart ahead, or a bubble shield. Hold Shift while turning to drift and charge a mini boost. Thirty tracks across meadow, desert, snow and candy land, or race a friend on split screen.',
    controls: [['W / Up', 'Drive'], ['A D / Left Right', 'Steer'], ['S / Down', 'Brake / reverse'], ['Shift', 'Drift'], ['Space', 'Use item'], ['2P: Arrows + Enter (item), / drift', 'Player 2']],
    info() { const me = this.K[0]; return `Track ${G.level} · Lap ${Math.min(LAPS, me.lap + 1)}/${LAPS} · Place ${this.place(me)}`; },
    init() {
      const n = G.level, R = G.seeded(n * 83 + 1);
      this.theme = THEMES[(n - 1) % THEMES.length];
      this.path = buildTrack(R, n); const P = this.path, N = P.length;
      this.len = []; let acc = 0; for (let i = 0; i < N; i++) { this.len.push(acc); const a = P[i], b = P[(i + 1) % N]; acc += Math.hypot(b[0] - a[0], b[1] - a[1]); } this.total = acc;
      this.boxes = []; for (let i = 1; i < 6; i++) { const idx = Math.floor(N * i / 6), [x, y] = P[idx], nx = P[(idx + 1) % N], a = Math.atan2(nx[1] - y, nx[0] - x); for (const off of [-35, 0, 35]) this.boxes.push({x: x - Math.sin(a) * off, y: y + Math.cos(a) * off, t: 0}); }
      this.deco = Array.from({length: 120}, () => { const i = R.int(N), [x, y] = P[i], nx = P[(i + 1) % N], a = Math.atan2(nx[1] - y, nx[0] - x), side = R() < .5 ? -1 : 1, off = WIDTH + 30 + R() * 260; return {x: x - Math.sin(a) * off * side, y: y + Math.cos(a) * off * side, r: 14 + R() * 18}; })
        .filter(d => this.nearest(d.x, d.y).d > WIDTH * .8);
      const duel = G.mode === 'local', count = 8;
      const [sx, sy] = P[N - 3], [tx, ty] = P[N - 2], sa = Math.atan2(ty - sy, tx - sx);
      this.K = Array.from({length: count}, (_, i) => {
        const row = Math.floor(i / 2), col = i % 2 ? 1 : -1, bx = sx - Math.cos(sa) * row * 46 - Math.sin(sa) * col * 28, by = sy - Math.sin(sa) * row * 46 + Math.cos(sa) * col * 28;
        return {i, name: duel && i === 1 ? 'Player 2' : NAMES[i], color: COLORS[i], x: bx, y: by, a: sa, v: 0, steer: 0, human: i === 0 || (duel && i === 1), seg: N - 3, lap: -1, prog: 0, item: null, boost: 0, spin: 0, shield: 0, drift: 0, charge: 0, finished: false, finishT: 0, skill: .76 + Math.min(.18, n * .0065) + (i % 3) * .012, aiOff: (R() - .5) * 40};
      });
      for (const k of this.K) k.seg = this.nearest(k.x, k.y).i;
      this.traps = []; this.zaps = []; this.parts = []; this.t = 0; this.go = 3.2; this.over = null; this.results = null;
      this.msg = this.theme.name; this.msgT = 2;
    },
    nearest(x, y, hint) { // closest point on the centre line; searches near a hint index when given
      const P = this.path, N = P.length; let best = 1e18, bi = 0;
      const range = hint === undefined ? N : 30, start = hint === undefined ? 0 : hint - 10;
      for (let k = 0; k < range; k++) { const i = ((start + k) % N + N) % N, dx = P[i][0] - x, dy = P[i][1] - y, d = dx * dx + dy * dy; if (d < best) { best = d; bi = i; } }
      return {i: bi, d: Math.sqrt(best)};
    },
    progress(k) { return k.lap * this.total + this.len[k.seg]; },
    ahead(o, k) { if (o.finished && k.finished) return o.finishT < k.finishT; if (o.finished || k.finished) return o.finished; return this.progress(o) > this.progress(k); },
    place(k) { return 1 + this.K.filter(o => o !== k && this.ahead(o, k)).length; },
    use(k) {
      if (!k.item || this.go > 0) return; const it = k.item; k.item = null;
      if (it === 'turbo') { k.boost = 1.6; if (k.human) G.sfx('power'); }
      if (it === 'goo') { this.traps.push({x: k.x - Math.cos(k.a) * 34, y: k.y - Math.sin(k.a) * 34, life: 25}); G.sfx('splash', .4); }
      if (it === 'bubble') { k.shield = 8; if (k.human) G.sfx('select'); }
      if (it === 'zap') { const ahead = this.K.filter(o => o !== k && !o.finished && this.progress(o) > this.progress(k)).sort((a, b) => this.progress(a) - this.progress(b))[0]; this.zaps.push({x: k.x, y: k.y, target: ahead || null, a: k.a, life: 5, owner: k}); G.sfx('laser', .5); }
    },
    key(k) { if (k === ' ') this.use(this.K[0]); if (k === 'Enter' && G.mode === 'local') this.use(this.K[1]); },
    drive(k, thr, steer, drift, dt) {
      const near = this.nearest(k.x, k.y, k.seg), off = near.d > WIDTH / 2 + 6;
      k.seg = near.i;
      if (k.spin > 0) { k.spin -= dt; k.a += 12 * dt; k.v *= Math.pow(.15, dt); return; }
      const top = (off ? 150 : 330) * (k.boost > 0 ? 1.55 : 1) * (k.human ? 1 : k.skill);
      k.v += (thr > 0 ? 420 : thr < 0 ? -500 : 0) * dt * (thr > 0 && k.v > top ? 0 : 1);
      if (!thr) k.v *= Math.pow(.5, dt); if (k.v > top) k.v += (top - k.v) * Math.min(1, dt * 3); if (k.v < -120) k.v = -120;
      const grip = Math.min(1, Math.abs(k.v) / 120);
      if (drift && steer && k.v > 180) { k.drift = Math.sign(steer); k.charge = Math.min(1.4, k.charge + dt); } else if (k.drift) { if (k.charge > .7) { k.boost = Math.max(k.boost, .5 + (k.charge - .7)); if (k.human) G.sfx('power', .5); } k.drift = 0; k.charge = 0; }
      k.steer += (steer - k.steer) * Math.min(1, dt * 10);
      k.a += k.steer * (k.drift ? 3.4 : 2.6) * grip * dt * Math.sign(k.v || 1);
      const slide = k.drift ? .35 : 0, mv = k.a - k.drift * slide;
      k.x += Math.cos(mv) * k.v * dt; k.y += Math.sin(mv) * k.v * dt;
      if (near.d > WIDTH / 2 + 90) { const [cx, cy] = this.path[near.i]; k.x += (cx - k.x) * dt * 2; k.y += (cy - k.y) * dt * 2; k.v *= .96; } // soft wall far off the road
      if (k.boost > 0 && Math.random() < .5) this.parts.push({x: k.x - Math.cos(k.a) * 26, y: k.y - Math.sin(k.a) * 26, vx: -Math.cos(k.a) * 60, vy: -Math.sin(k.a) * 60, life: .3, color: '#ffb347', size: 6});
      if (k.drift && Math.random() < .6) this.parts.push({x: k.x - Math.cos(k.a) * 22, y: k.y - Math.sin(k.a) * 22, vx: 0, vy: 0, life: .35, color: k.charge > .7 ? '#ff9f43' : '#cfe8ff', size: 4});
    },
    ai(k, dt) {
      const P = this.path, N = P.length, look = 4 + Math.floor(k.v / 110), [tx, ty] = P[(k.seg + look) % N], [nx, ny] = P[(k.seg + look + 1) % N];
      const off = k.aiOff, ta = Math.atan2(ny - ty, nx - tx), gx = tx - Math.sin(ta) * off, gy = ty + Math.cos(ta) * off;
      let rel = Math.atan2(gy - k.y, gx - k.x) - k.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      // rubber band: stragglers try harder, leaders ease off a little
      const me = this.K[0], gap = this.progress(me) - this.progress(k), band = Math.max(.9, Math.min(1.04, 1 + gap / 5000));
      k.skillNow = band;
      this.drive(k, Math.abs(rel) > 1.2 && k.v > 200 ? 0 : 1, Math.max(-1, Math.min(1, rel * 2.2)), false, dt);
      k.v *= 1 + (band - 1) * dt;
      if (k.item && Math.random() < dt * .5) this.use(k);
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.over && this.over.t > 0 && (this.over.t -= dt) <= 0) this.over.go();
      if (this.go > 0) { const before = Math.ceil(this.go); this.go -= dt; if (Math.ceil(this.go) !== before && this.go > 0) G.sfx('beat', .8); if (this.go <= 0) { G.sfx('power'); this.msg = 'GO!'; this.msgT = 1; } return; }
      const duel = G.mode === 'local';
      for (const k of this.K) {
        k.boost -= dt; k.shield -= dt;
        if (k.finished) { k.v *= Math.pow(.4, dt); k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt; continue; }
        const before = k.seg;
        if (k.i === 0) this.drive(k, G.held('w', duel ? 'w' : 'ArrowUp') - G.held('s', duel ? 's' : 'ArrowDown'), G.held('d', duel ? 'd' : 'ArrowRight') - G.held('a', duel ? 'a' : 'ArrowLeft'), G.keys.Shift, dt);
        else if (duel && k.i === 1) this.drive(k, G.held('ArrowUp') - G.held('ArrowDown'), G.held('ArrowRight') - G.held('ArrowLeft'), G.keys['/'], dt);
        else this.ai(k, dt);
        const N = this.path.length;
        if (before > N * .8 && k.seg < N * .2) { // crossed the line
          k.lap++;
          if (k.lap >= LAPS) { k.finished = true; k.finishT = this.t; if (k.human) this.finishMe(k); }
          else if (k.human && k.lap > 0) { this.msg = k.lap === LAPS - 1 ? 'FINAL LAP!' : `LAP ${k.lap + 1}`; this.msgT = 1.5; G.sfx('coin'); }
        } else if (before < N * .2 && k.seg > N * .8) k.lap--;
        for (const b of this.boxes) if (b.t <= 0 && Math.hypot(b.x - k.x, b.y - k.y) < 30) { b.t = 4; if (!k.item) { const pl = this.place(k); k.item = pl > 5 ? G.pick(['turbo', 'zap', 'turbo']) : pl < 3 ? G.pick(['goo', 'bubble', 'goo']) : G.pick(Object.keys(ITEMS)); if (k.human) G.sfx('select'); } }
        for (const tr of this.traps) if (tr.life > 0 && Math.hypot(tr.x - k.x, tr.y - k.y) < 26) { tr.life = 0; if (k.shield > 0) { k.shield = 0; continue; } k.spin = .9; if (k.human) { G.sfx('splash'); G.shake(4, .2); } }
      }
      // kart bumps
      for (let i = 0; i < this.K.length; i++) for (let j = i + 1; j < this.K.length; j++) { const a = this.K[i], b = this.K[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d < 34 && d > 0) { const push = (34 - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; } }
      for (const b of this.boxes) b.t -= dt; for (const tr of this.traps) tr.life -= dt; this.traps = this.traps.filter(t => t.life > 0);
      for (const z of this.zaps) {
        z.life -= dt; const tg = z.target && !z.target.finished ? z.target : null;
        const want = tg ? Math.atan2(tg.y - z.y, tg.x - z.x) : z.a; z.a += Math.atan2(Math.sin(want - z.a), Math.cos(want - z.a)) * Math.min(1, dt * 5);
        z.x += Math.cos(z.a) * 520 * dt; z.y += Math.sin(z.a) * 520 * dt;
        if (tg && Math.hypot(tg.x - z.x, tg.y - z.y) < 26) { z.life = 0; if (tg.shield > 0) tg.shield = 0; else { tg.spin = 1.1; G.burst(this.parts, tg.x, tg.y, '#5cb8ff', 14); if (tg.human) { G.sfx('hurt'); G.shake(6, .3); } } }
      }
      this.zaps = this.zaps.filter(z => z.life > 0);
      // everyone else finishes a bit after the player, in their current order
      if (this.results && this.t > this.results.t + 4) for (const k of this.K) if (!k.finished) { k.finished = true; k.finishT = this.t + this.progress(k) * -1e-6; }
    },
    finishMe(k) {
      const pl = this.place(k); this.results = {t: this.t};
      if (G.mode === 'local') { this.over = {t: 2.2, go: () => G.end(`${k.name === 'You' ? 'Player 1' : k.name} wins!`)}; this.msg = `${k.name === 'You' ? 'PLAYER 1' : 'PLAYER 2'} WINS!`; this.msgT = 3; G.party(); return; }
      this.msg = ['', '1st PLACE!', '2nd place!', '3rd place!'][pl] || `${pl}th place`; this.msgT = 3;
      G.score += Math.max(0, 9 - pl) * 150 + G.level * 30;
      if (pl <= 3) { G.party(); this.over = {t: 2.2, go: () => G.win(pl === 1 ? 3 : pl === 2 ? 2 : 1, ['', 'You won the race!', 'Second place!', 'On the podium!'][pl])}; }
      else this.over = {t: 2.2, go: () => G.end(`Finished ${pl}th: top 3 to pass`)};
    },
    view(ctx, me, vx, vy, vw, vh) {
      const th = this.theme, P = this.path, N = P.length;
      ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
      ctx.fillStyle = th.grass; ctx.fillRect(vx, vy, vw, vh);
      const cx = me.x + Math.cos(me.a) * 90, cy = me.y + Math.sin(me.a) * 90;
      ctx.translate(vx + vw / 2 - cx, vy + vh / 2 - cy);
      ctx.fillStyle = th.grass2; for (let gx = Math.floor((cx - vw) / 80) * 80; gx < cx + vw; gx += 80) for (let gy = Math.floor((cy - vh) / 80) * 80; gy < cy + vh; gy += 80) if ((gx + gy) / 80 % 2 === 0) ctx.fillRect(gx, gy, 80, 80);
      const trace = () => { ctx.beginPath(); P.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
      ctx.lineJoin = 'round';
      trace(); ctx.strokeStyle = th.curb[1]; ctx.lineWidth = WIDTH + 18; ctx.stroke();
      trace(); ctx.setLineDash([22, 22]); ctx.strokeStyle = th.curb[0]; ctx.lineWidth = WIDTH + 18; ctx.stroke(); ctx.setLineDash([]);
      trace(); ctx.strokeStyle = th.road; ctx.lineWidth = WIDTH; ctx.stroke();
      trace(); ctx.setLineDash([26, 30]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      // start / finish line
      const [sx, sy] = P[0], [tx, ty] = P[1], sa = Math.atan2(ty - sy, tx - sx);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(sa); for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(j * 10 - 10, -WIDTH / 2 + i * WIDTH / 12, 10, WIDTH / 12); } ctx.restore();
      for (const d of this.deco) if (Math.abs(d.x - cx) < vw && Math.abs(d.y - cy) < vh) { G.circle(d.x + 6, d.y + 8, d.r, 'rgba(0,0,0,.18)'); G.circle(d.x, d.y, d.r, th.deco); G.circle(d.x - d.r * .3, d.y - d.r * .3, d.r * .5, 'rgba(255,255,255,.15)'); }
      for (const b of this.boxes) if (b.t <= 0) { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(this.t * 1.5); G.rr(-13, -13, 26, 26, 6, `hsla(${(this.t * 120) % 360},90%,60%,.85)`); ctx.restore(); G.text('?', b.x, b.y + 6, {size: 16, align: 'center', weight: 800, color: '#fff'}); }
      for (const tr of this.traps) { G.circle(tr.x, tr.y, 18, '#5ac84a'); G.circle(tr.x - 5, tr.y - 4, 6, '#9af08a'); }
      for (const z of this.zaps) { G.circle(z.x, z.y, 12, 'rgba(92,184,255,.4)'); G.circle(z.x, z.y, 7, '#cfe8ff'); }
      for (const k of this.K.slice().sort((a, b) => a.y - b.y)) {
        const img = G.img(`img/kart_${k.color}.png`); if (!img.complete || !img.naturalWidth) continue;
        ctx.save(); ctx.translate(k.x + 4, k.y + 6); ctx.rotate(k.a); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-24, -15, 48, 30); ctx.restore();
        ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.a + (k.drift ? k.drift * .3 : 0)); ctx.drawImage(img, -32, -32, 64, 64); ctx.restore();
        if (k.shield > 0) { ctx.strokeStyle = 'rgba(255,123,208,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y, 30, 0, Math.PI * 2); ctx.stroke(); }
        if (!k.human) G.text(k.name, k.x, k.y - 30, {size: 10, align: 'center', weight: 800, color: '#fff', shadow: true});
      }
      G.fx(this.parts, 0);
      ctx.restore();
      // HUD for this view
      const pl = this.place(me);
      G.text(`${pl}${['', 'st', 'nd', 'rd'][pl] || 'th'}`, vx + 16, vy + 44, {size: 36, display: true, color: pl === 1 ? '#ffcf5c' : '#fff', shadow: true});
      G.text(`LAP ${Math.max(1, Math.min(LAPS, me.lap + 1))}/${LAPS}`, vx + 18, vy + 66, {size: 13, weight: 800, color: '#fff', shadow: true});
      G.rr(vx + vw - 66, vy + 12, 52, 52, 12, 'rgba(0,0,0,.45)');
      if (me.item) { G.circle(vx + vw - 40, vy + 38, 20, ITEMS[me.item].c); G.text(ITEMS[me.item].i, vx + vw - 40, vy + 45, {size: 20, align: 'center', weight: 800, color: '#fff'}); }
      if (me.charge > .7) G.text('BOOST READY', vx + vw / 2, vy + vh - 20, {size: 13, align: 'center', weight: 800, color: '#ff9f43', shadow: true});
    },
    draw(ctx, dt) {
      const duel = G.mode === 'local';
      if (duel) { this.view(ctx, this.K[0], 0, 0, W / 2 - 2, H); this.view(ctx, this.K[1], W / 2 + 2, 0, W / 2 - 2, H); ctx.fillStyle = '#111'; ctx.fillRect(W / 2 - 2, 0, 4, H); }
      else this.view(ctx, this.K[0], 0, 0, W, H);
      for (const p of this.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; } this.parts = this.parts.filter(p => p.life > 0);
      // mini map
      if (!duel) {
        const P = this.path, xs = P.map(p => p[0]), ys = P.map(p => p[1]), mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys), s = 120 / Math.max(mxx - mnx, mxy - mny);
        G.panel(W - 140, H - 120, 132, 112, 10, 'rgba(0,0,0,.35)');
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); P.forEach(([x, y], i) => { const px = W - 134 + (x - mnx) * s, py = H - 114 + (y - mny) * s; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke();
        for (const k of this.K) G.circle(W - 134 + (k.x - mnx) * s, H - 114 + (k.y - mny) * s, k.human ? 4.5 : 3, k.human ? '#fff' : ({blue: '#5cb8ff', red: '#ff5b6b', green: '#7ee08a', yellow: '#ffd25c', purple: '#b07bff', orange: '#ff9f43', pink: '#ff7bd0', teal: '#4ff0d8'})[k.color]);
      }
      if (this.go > 0) G.text(String(Math.ceil(this.go)), W / 2, H / 2, {size: 80, align: 'center', display: true, color: '#fff', shadow: true});
      else if (this.msgT > 0) G.text(this.msg, W / 2, H / 2 - 60, {size: 32, align: 'center', display: true, color: '#ffcf5c', shadow: true});
    }
  });
})();

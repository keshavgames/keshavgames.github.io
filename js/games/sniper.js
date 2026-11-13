(() => {
  // Scope shooting gallery against Blender tin robots, with sway, breath, bullet travel time and wind.
  const W = 800, H = 500;
  const ASSETS = ['invader', 'helper'].flatMap(k => ['idle', 'walk0', 'walk1', 'hit'].map(p => `img/bot_${k}_${p}.png`));
  const THEMES = [
    {name: 'Red Canyon', sky: ['#f6c58a', '#f39a6a'], far: '#c2694a', mid: '#a4523a', near: '#7a3a26', ground: '#c88a4a', rock: '#8a4a30'},
    {name: 'Frost Pass', sky: ['#cfe6ff', '#9fc4ef'], far: '#a8bcd8', mid: '#e8f0fa', near: '#c8d6e8', ground: '#f4f8fc', rock: '#8a9aaa'},
    {name: 'Pine Valley', sky: ['#bfe3ff', '#8cc8f0'], far: '#5a8a6a', mid: '#3f7a4a', near: '#2f5a36', ground: '#6aa04a', rock: '#6a6a5a'}
  ];

  GameBox.register({
    id: 'sniper', title: 'Sniper Ridge', genre: 'Shooter', kind: 'Scope shooting', w: W, h: H, levels: 50, assets: ASSETS, thumb: 'jpg', cursor: 'none',
    hint: 'Hold right-click or Shift to zoom. Click to fire. Only hit the grey robots, never the green helpers!',
    desc: 'Tin robot invaders are hiding all over the ridge. Peer through your scope, steady your breath and knock them over before time runs out, but leave the friendly green helper bots alone. Far shots take time to land, and later missions add wind you have to aim into. Fifty missions across canyon, snow and pine valley.',
    controls: [['Mouse', 'Aim'], ['Right-click / Shift (hold)', 'Zoom the scope'], ['Click', 'Fire'], ['Space (hold)', 'Hold your breath: less sway'], ['R', 'Reload']],
    info() { return `Mission ${G.level} · ${this.hits}/${this.need} robots · ${Math.ceil(this.time)}s`; },
    init() {
      const n = G.level, R = G.seeded(n * 17 + 4);
      this.theme = THEMES[Math.floor((n - 1) / 3) % 3];
      this.need = Math.min(12, 3 + Math.floor(n / 4)); this.hits = 0; this.shots = 0; this.landed = 0; this.oops = 0;
      this.time = 50 + this.need * 4; this.ammo = 5; this.reload = 0; this.breath = 1; this.holding = false; this.zoom = 0;
      this.wind = n > 8 ? (R() - .5) * Math.min(1, (n - 8) * .05) * 2 : 0;
      // cover spots at three depths: far ridge, middle rocks, near crates
      this.spots = [];
      for (const [depth, y, count] of [[.38, 268, 5], [.6, 330, 4], [.9, 420, 3]]) for (let i = 0; i < count; i++) {
        const x = 70 + (i + .2 + R() * .6) * (660 / count);
        this.spots.push({x, y, depth, kind: R.pick(depth > .8 ? ['crate', 'barrels', 'sandbags'] : ['rock', 'rock', 'bush']), w: 90 * depth + R() * 30 * depth, h: 60 * depth + R() * 20 * depth, bot: null});
      }
      this.trees = Array.from({length: 14}, () => ({x: R() * W, y: 230 + R() * 30, s: .5 + R() * .5}));
      this.bots = []; this.shots3 = []; this.parts = []; this.t = 0; this.spawnT = .8; this.msg = `${this.theme.name}: ${this.need} robots`; this.msgT = 2.5; this.done = null;
      this.sway = {x: 0, y: 0}; this.aim = {x: W / 2, y: H / 2};
    },
    spawn() {
      const free = this.spots.filter(s => !s.bot); if (!free.length) return;
      const s = G.pick(free), n = G.level, helper = n > 3 && Math.random() < Math.min(.3, .1 + n * .005);
      const b = {s, helper, up: 0, state: 'rise', t: 0, stay: Math.max(1.2, 3.6 - n * .045) + Math.random() * 1.5, hp: !helper && n > 12 && Math.random() < .25 ? 2 : 1, walk: 0, dir: Math.random() < .5 ? -1 : 1, dx: 0, moving: !helper && n > 6 && Math.random() < Math.min(.45, n * .012), fall: 0};
      s.bot = b; this.bots.push(b);
    },
    pointer(type, x, y, e) {
      if (type === 'down') { if (e && e.button === 2) { this.scoping = true; return; } this.fire(); }
      if (type === 'up' && e && e.button === 2) this.scoping = false;
    },
    key(k) { if (k === 'r' && this.ammo < 5 && this.reload <= 0) { this.reload = .9; G.sfx('click'); } },
    botRect(b) { // the robot's on-screen box (feet at the spot line, rising out of cover)
      const s = b.s, h = 150 * s.depth, w = h * .8, x = s.x + b.dx, top = s.y - h * b.up * .95;
      return {x: x - w / 2, y: top, w, h, cx: x};
    },
    fire() {
      if (this.done || this.reload > 0) return;
      if (this.ammo <= 0) { this.reload = .9; G.sfx('click'); return; }
      this.ammo--; this.shots++; G.sfx('gun'); G.shake(this.zoom > .5 ? 5 : 3, .12);
      const ax = this.aim.x + this.sway.x, ay = this.aim.y + this.sway.y;
      // find what is under the crosshair, nearest depth first; the bullet takes longer to reach far targets
      const cands = this.bots.filter(b => b.state !== 'down' && b.up > .3).map(b => ({b, r: this.botRect(b)})).sort((a, c) => c.b.s.depth - a.b.s.depth);
      let hitBot = null, depth = .5;
      for (const {b, r} of cands) {
        const drift = this.wind * (1 - b.s.depth) * 90; // wind pushes far shots sideways
        if (ax - drift > r.x + r.w * .12 && ax - drift < r.x + r.w * .88 && ay > r.y && ay < r.y + r.h * b.up) { hitBot = b; depth = b.s.depth; break; }
      }
      const delay = .05 + (1 - depth) * .35;
      this.shots3.push({x: ax, y: ay, t: delay, b: hitBot, head: hitBot && ay < this.botRect(hitBot).y + this.botRect(hitBot).h * .32});
      if (this.ammo <= 0) this.reload = 1;
    },
    land(sh) {
      const b = sh.b;
      if (!b || b.state === 'down') { G.burst(this.parts, sh.x, sh.y, '#d8c8a8', 6, 80); G.sfx('step', .4); return; }
      if (b.helper) { this.oops++; b.state = 'down'; G.sfx('lose', .6); G.shake(6, .3); this.msg = this.oops >= 2 ? 'Too many helpers hit!' : 'Oops! That was a helper bot!'; this.msgT = 2; if (this.oops >= 2) this.done = {t: 1, go: () => G.end('Mission failed: you hit the helpers')}; return; }
      if (--b.hp > 0) { G.sfx('hit'); G.burst(this.parts, sh.x, sh.y, '#ffe08a', 10); return; }
      b.state = 'down'; this.hits++; this.landed++; G.sfx('coin'); G.burst(this.parts, sh.x, sh.y, '#ffcf5c', 18, 200);
      G.score += 100 + (sh.head ? 50 : 0) + Math.round((1 - b.s.depth) * 80);
      G.popText(this.parts, sh.x, sh.y - 20, sh.head ? 'HEADSHOT +150' : '+100', sh.head ? '#ff9f43' : '#ffcf5c', sh.head ? 18 : 15);
      if (this.hits >= this.need) { const acc = this.landed / Math.max(1, this.shots); G.score += Math.round(this.time) * 10; this.done = {t: 1, go: () => G.win(this.oops === 0 && acc >= .75 ? 3 : acc >= .5 ? 2 : 1, 'Ridge cleared!')}; G.party(); }
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); }
      else if ((this.time -= dt) <= 0) { this.time = 0; this.done = {t: .6, go: () => G.end('Out of time')}; }
      this.aim.x = G.pointer.x; this.aim.y = G.pointer.y;
      const wantZoom = this.scoping || G.keys.Shift; this.zoom += ((wantZoom ? 1 : 0) - this.zoom) * Math.min(1, dt * 10);
      this.holding = G.keys[' '] && this.breath > 0;
      this.breath = Math.max(0, Math.min(1, this.breath + (this.holding ? -dt / 3 : dt / 4)));
      const amp = (this.holding ? 1.5 : 6 + Math.min(6, G.level * .12)) * (.4 + this.zoom * .8);
      this.sway.x = Math.sin(this.t * 1.3) * amp + Math.sin(this.t * 2.9) * amp * .4; this.sway.y = Math.cos(this.t * 1.1) * amp * .7;
      if (this.reload > 0 && (this.reload -= dt) <= 0) { this.ammo = 5; G.sfx('select'); }
      if (!this.done && (this.spawnT -= dt) <= 0) { this.spawnT = Math.max(.6, 1.6 - G.level * .02) * (.7 + Math.random() * .6); if (this.bots.filter(b => b.state !== 'down').length < Math.min(5, 2 + Math.floor(G.level / 8))) this.spawn(); }
      for (const b of this.bots) {
        b.t += dt;
        if (b.state === 'rise') { b.up = Math.min(1, b.up + dt * 3); if (b.up >= 1) { b.state = 'stand'; b.t = 0; } }
        else if (b.state === 'stand') { if (b.moving) { b.dx += b.dir * 40 * b.s.depth * dt; b.walk += dt; if (Math.abs(b.dx) > b.s.w * .7) b.dir *= -1; } if (b.t > b.stay) b.state = 'duck'; }
        else if (b.state === 'duck') { b.up -= dt * 3; if (b.up <= 0) { b.s.bot = null; b.gone = true; } }
        else if (b.state === 'down') { b.fall += dt; if (b.fall > 1) { b.s.bot = null; b.gone = true; } }
      }
      this.bots = this.bots.filter(b => !b.gone);
      for (const sh of this.shots3) if ((sh.t -= dt) <= 0 && !sh.done) { sh.done = true; this.land(sh); }
      this.shots3 = this.shots3.filter(s => !s.done);
    },
    scene(ctx) {
      const th = this.theme;
      const sky = ctx.createLinearGradient(0, 0, 0, 280); sky.addColorStop(0, th.sky[1]); sky.addColorStop(1, th.sky[0]); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      G.circle(640, 80, 34, 'rgba(255,250,220,.9)');
      const ridge = (base, amp, color, seed) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base - Math.abs(Math.sin(x * .011 + seed) * amp) - Math.sin(x * .031 + seed * 2) * amp * .3); ctx.lineTo(W, H); ctx.fill(); };
      ridge(250, 70, th.far, 1); ridge(275, 40, th.mid, 3);
      for (const t of this.trees) { ctx.fillStyle = th.near; ctx.beginPath(); ctx.moveTo(t.x, t.y - 40 * t.s); ctx.lineTo(t.x - 12 * t.s, t.y); ctx.lineTo(t.x + 12 * t.s, t.y); ctx.fill(); }
      ridge(310, 18, th.near, 5);
      ctx.fillStyle = th.ground; ctx.fillRect(0, 360, W, H); ridge(360, 12, th.ground, 7);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 137) % W, 380 + (i * 53) % 110, 6, 2);
      // robots, then the cover in front of them, depth by depth
      for (const depth of [.38, .6, .9]) {
        for (const b of this.bots.filter(b => b.s.depth === depth)) this.drawBot(ctx, b);
        for (const s of this.spots.filter(s => s.depth === depth)) this.drawCover(ctx, s);
      }
      if (Math.abs(this.wind) > .02) { // a little flag shows the wind
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(40, 440); ctx.lineTo(40, 380); ctx.stroke();
        const w = this.wind * 60, flap = Math.sin(this.t * 8) * 4; ctx.fillStyle = '#e84a4a'; ctx.beginPath(); ctx.moveTo(40, 382); ctx.lineTo(40 + w, 388 + flap); ctx.lineTo(40, 398); ctx.fill();
      }
    },
    drawCover(ctx, s) {
      const th = this.theme, x = s.x - s.w / 2, y = s.y - s.h * .55;
      if (s.kind === 'rock') { ctx.fillStyle = th.rock; ctx.beginPath(); ctx.ellipse(s.x, s.y, s.w / 2, s.h * .55, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(s.x - s.w * .15, s.y - s.h * .3, s.w * .18, s.h * .12, 0, 0, Math.PI * 2); ctx.fill(); }
      if (s.kind === 'bush') { for (let k = 0; k < 5; k++) G.circle(s.x + (k - 2) * s.w * .18, s.y - s.h * .2 - (k % 2) * s.h * .15, s.h * .38, k % 2 ? '#3f7a3a' : '#4f8a46'); }
      if (s.kind === 'crate') { G.rr(x, y, s.w, s.h * .58, 4, '#9a6a3a'); ctx.strokeStyle = '#6a4626'; ctx.lineWidth = 4; ctx.strokeRect(x + 4, y + 4, s.w - 8, s.h * .58 - 8); ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + s.w - 4, y + s.h * .58 - 4); ctx.stroke(); }
      if (s.kind === 'barrels') { for (let k = 0; k < 3; k++) { G.rr(x + k * s.w / 3, y, s.w / 3 - 4, s.h * .58, 6, k % 2 ? '#3a6a9a' : '#c45a3a'); ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + k * s.w / 3, y + s.h * .2, s.w / 3 - 4, 4); } }
      if (s.kind === 'sandbags') { for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) G.rr(x + k * s.w / 4 + (r ? s.w / 8 : 0) - (r ? s.w / 8 : 0) * (k === 3), y + r * s.h * .28, s.w / 4 - 2, s.h * .3, 8, r ? '#b8a07a' : '#c8b08a'); }
    },
    drawBot(ctx, b) {
      const r = this.botRect(b), pose = b.state === 'down' ? 'hit' : b.moving && b.state === 'stand' ? `walk${Math.floor(b.walk * 4) % 2}` : 'idle';
      const img = G.img(`img/bot_${b.helper ? 'helper' : 'invader'}_${pose}.png`); if (!img.complete || !img.naturalWidth) return;
      ctx.save(); ctx.translate(r.cx, r.y + r.h);
      if (b.state === 'down') { ctx.rotate(b.fall * 1.6 * (b.dir || 1)); ctx.globalAlpha = Math.max(0, 1 - b.fall); }
      ctx.drawImage(img, -r.w / 2, -r.h, r.w, r.h);
      if (b.hp > 1 && b.state !== 'down') { ctx.strokeStyle = 'rgba(120,200,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -r.h * .5, r.w * .5, r.h * .55, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.restore();
    },
    draw(ctx, dt) {
      this.scene(ctx);
      G.fx(this.parts, dt);
      const ax = this.aim.x + this.sway.x, ay = this.aim.y + this.sway.y, z = this.zoom;
      if (z > .05) { // the scope: a magnified circle of the scene around the crosshair
        const rad = 150 * z + 20, mag = 1 + z * 1.8;
        const snap = this.snapC || (this.snapC = Object.assign(document.createElement('canvas'), {width: W, height: H}));
        const sc = snap.getContext('2d'); sc.drawImage(ctx.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height, 0, 0, W, H);
        ctx.fillStyle = `rgba(0,0,0,${.55 * z})`; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, rad, 0, Math.PI * 2); ctx.clip();
        ctx.translate(ax, ay); ctx.scale(mag, mag); ctx.translate(-ax, -ay); ctx.drawImage(snap, 0, 0); ctx.restore();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(ax, ay, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax - rad, ay); ctx.lineTo(ax - 8, ay); ctx.moveTo(ax + 8, ay); ctx.lineTo(ax + rad, ay); ctx.moveTo(ax, ay - rad); ctx.lineTo(ax, ay - 8); ctx.moveTo(ax, ay + 8); ctx.lineTo(ax, ay + rad); ctx.stroke();
        G.circle(ax, ay, 2, '#ff3b3b');
      } else {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax, ay, 14, 0, Math.PI * 2); ctx.moveTo(ax - 22, ay); ctx.lineTo(ax - 8, ay); ctx.moveTo(ax + 8, ay); ctx.lineTo(ax + 22, ay); ctx.moveTo(ax, ay - 22); ctx.lineTo(ax, ay - 8); ctx.moveTo(ax, ay + 8); ctx.lineTo(ax, ay + 22); ctx.stroke();
        G.circle(ax, ay, 2, '#ff3b3b');
      }
      // HUD
      G.panel(10, 10, 240, 52, 10, 'rgba(0,0,0,.45)');
      G.text(`ROBOTS ${this.hits}/${this.need}`, 22, 32, {size: 16, weight: 800, color: '#fff'});
      G.text(`${Math.ceil(this.time)}s`, 236, 32, {size: 16, align: 'right', weight: 800, color: this.time < 10 ? '#ff6b6b' : '#ffcf5c'});
      for (let i = 0; i < 5; i++) G.rr(22 + i * 14, 42, 10, 14, 2, i < this.ammo ? '#ffcf5c' : 'rgba(255,255,255,.2)');
      if (this.reload > 0) G.text('RELOADING', 100, 54, {size: 11, weight: 800, color: '#ff9f43'});
      G.bar({x: W - 170, y: 16, w: 154, h: 12, v: this.breath, max: 1, color: this.holding ? '#5cb8ff' : '#9fe8ff', label: 'BREATH'});
      if (Math.abs(this.wind) > .02) G.text(`WIND ${this.wind > 0 ? '→' : '←'} ${Math.round(Math.abs(this.wind) * 20)}`, W - 16, 48, {size: 13, align: 'right', weight: 800, color: '#fff', shadow: true});
      if (this.oops) G.text(`Helpers hit: ${this.oops}/2`, W - 16, 66, {size: 12, align: 'right', weight: 800, color: '#7ee08a', shadow: true});
      if (this.msgT > 0) G.text(this.msg, W / 2, 110, {size: 22, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

(() => {
  const W = 640, H = 480, WORLD = 3000;
  const NAMES = ['Mochi', 'Nova', 'Pixel', 'Bloop', 'Zed', 'Kiwi', 'Orbit', 'Jelly', 'Ember', 'Fizz', 'Dot', 'Tofu', 'Glim', 'Rook'];
  const HUES = [350, 20, 45, 90, 160, 190, 215, 260, 290, 320];
  const rad = m => Math.sqrt(m) * 4.2;
  const speedOf = m => Math.max(55, 190 * Math.pow(25 / m, .28));

  GameBox.register({
    id: 'blob', title: 'Blob Arena', genre: 'Action', kind: 'Arena eat-em-up', w: W, h: H, cursor: 'crosshair',
    desc: 'Grow by eating pellets and any blob noticeably smaller than you, and run from anything bigger. Big blobs move slower and slowly shrink. Spiky mines burst blobs that are too large to slip past them. How big can you get?',
    controls: [['Mouse', 'Steer toward the pointer'], ['W A S D / Arrows', 'Steer'], ['Space', 'Boost (costs a little mass)']],
    info() { return `Mass ${Math.floor(this.me.m)} · Rank ${this.rank}`; },
    init() {
      this.me = this.blob('You', WORLD / 2, WORLD / 2, 25, 200);
      this.me.player = true;
      this.bots = NAMES.map(n => this.blob(n, G.rnd(WORLD), G.rnd(WORLD), 15 + G.rnd(60), G.pick(HUES)));
      this.pellets = Array.from({length: 700}, () => this.pellet());
      this.mines = Array.from({length: 22}, () => ({x: 100 + G.rnd(WORLD - 200), y: 100 + G.rnd(WORLD - 200), r: 26}));
      this.scale = 1.1; this.best = 25; this.rank = 1; this.parts = []; this.top = [this.me];
    },
    blob(name, x, y, m, hue) { return {name, x, y, m, hue, vx: 0, vy: 0, boost: 0, cd: 0, think: 0, tx: x, ty: y, dead: 0}; },
    pellet() { return {x: G.rnd(WORLD), y: G.rnd(WORLD), hue: G.pick(HUES)}; },
    key(k) {
      const b = this.me;
      if (k === ' ' && b.cd <= 0 && b.m > 30) { b.m *= .93; b.boost = .35; b.cd = 1.4; G.sfx('swing'); }
    },
    burst(b) { // a mine pops a big blob into pellets
      const lost = b.m * .4; b.m -= lost;
      for (let i = 0; i < Math.min(40, lost / 3); i++) { const a = G.rnd(Math.PI * 2), d = rad(b.m) + 20 + G.rnd(80); this.pellets.push({x: b.x + Math.cos(a) * d, y: b.y + Math.sin(a) * d, hue: b.hue}); }
      if (b.player) { G.shake(8, .3); G.sfx('boom'); G.flash('rgba(120,255,160,.25)'); }
    },
    think(b, all) {
      const r = rad(b.m);
      let threat = null, prey = null, td = 1e9, pd = 1e9;
      for (const o of all) {
        if (o === b || o.dead) continue;
        const d = G.dist(b.x, b.y, o.x, o.y);
        if (o.m > b.m * 1.15 && d < 260 + rad(o.m) && d < td) { threat = o; td = d; }
        if (b.m > o.m * 1.15 && d < 330 && d < pd) { prey = o; pd = d; }
      }
      if (threat) { b.tx = b.x + (b.x - threat.x); b.ty = b.y + (b.y - threat.y); if (td < rad(threat.m) + r + 40 && b.cd <= 0 && b.m > 30) { b.m *= .93; b.boost = .35; b.cd = 2; } }
      else if (prey) { b.tx = prey.x; b.ty = prey.y; }
      else {
        let best = null, bd = 1e9;
        for (let i = 0; i < 60; i++) { const p = this.pellets[Math.floor(G.rnd(this.pellets.length))], d = G.dist(b.x, b.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
        if (best) { b.tx = best.x; b.ty = best.y; }
      }
      if (r > 30) for (const mn of this.mines) if (G.dist(b.x, b.y, mn.x, mn.y) < r + 90) { b.tx = b.x + (b.x - mn.x); b.ty = b.y + (b.y - mn.y); }
    },
    update(dt) {
      const me = this.me, all = [me, ...this.bots];
      const usingMouse = performance.now() - G.pointer.used < 2500;
      let dx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), dy = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      if (!dx && !dy && usingMouse) { dx = (G.pointer.x - W / 2) / this.scale; dy = (G.pointer.y - H / 2) / this.scale; if (Math.hypot(dx, dy) < 8) dx = dy = 0; }
      me.tx = me.x + dx * 100; me.ty = me.y + dy * 100;
      for (const b of this.bots) {
        if (b.dead) { if ((b.dead -= dt) <= 0) { Object.assign(b, this.blob(b.name, G.rnd(WORLD), G.rnd(WORLD), 15 + G.rnd(30), b.hue)); if (G.dist(b.x, b.y, me.x, me.y) < 500) b.x = (b.x + WORLD / 2) % WORLD; } continue; }
        if ((b.think -= dt) <= 0) { b.think = .3 + G.rnd(.2); this.think(b, all); }
      }
      for (const b of all) {
        if (b.dead) continue;
        b.cd -= dt; b.boost -= dt;
        const ddx = b.tx - b.x, ddy = b.ty - b.y, d = Math.hypot(ddx, ddy);
        const sp = speedOf(b.m) * (b.boost > 0 ? 2.3 : 1) * (d < 20 && b.player ? d / 20 : 1);
        const want = d > 1 ? [ddx / d * sp, ddy / d * sp] : [0, 0];
        b.vx += (want[0] - b.vx) * Math.min(1, dt * 6); b.vy += (want[1] - b.vy) * Math.min(1, dt * 6);
        const r = rad(b.m);
        b.x = G.clamp(b.x + b.vx * dt, r * .5, WORLD - r * .5); b.y = G.clamp(b.y + b.vy * dt, r * .5, WORLD - r * .5);
        if (b.m > 80) b.m -= b.m * .004 * dt; // big blobs slowly lose mass
        for (let i = this.pellets.length - 1; i >= 0; i--) {
          const p = this.pellets[i];
          if (Math.abs(p.x - b.x) < r && Math.abs(p.y - b.y) < r && G.dist(p.x, p.y, b.x, b.y) < r) {
            b.m += 1.2;
            if (this.pellets.length > 700) this.pellets.splice(i, 1); else this.pellets[i] = this.pellet();
            if (b.player) G.sfx('click', .25);
          }
        }
        for (const mn of this.mines) {
          if (r > mn.r * 1.3 && G.dist(b.x, b.y, mn.x, mn.y) < r + mn.r * .5) { this.burst(b); mn.x = 100 + G.rnd(WORLD - 200); mn.y = 100 + G.rnd(WORLD - 200); }
        }
      }
      for (const a of all) for (const b of all) {
        if (a === b || a.dead || b.dead || a.m <= b.m * 1.15) continue;
        if (G.dist(a.x, a.y, b.x, b.y) < rad(a.m) - rad(b.m) * .4) {
          a.m += b.m * .85;
          if (b.player) { G.shake(10, .4); return G.end(`Eaten by ${a.name}`); }
          if (a.player) { G.sfx('crunch'); G.score += Math.floor(b.m); G.popText(this.parts, W / 2, H / 2 - rad(a.m) * this.scale - 10, `+${Math.floor(b.m)}`, '#ffcf5c'); }
          b.dead = 3;
        }
      }
      this.best = Math.max(this.best, me.m);
      G.score = Math.max(G.score, Math.floor(this.best));
      const ranked = all.filter(b => !b.dead).sort((a, b) => b.m - a.m);
      this.rank = ranked.indexOf(me) + 1; this.top = ranked.slice(0, 5);
      const target = G.clamp(1.15 - (rad(me.m) - 20) / 260, .42, 1.15);
      this.scale += (target - this.scale) * Math.min(1, dt * 2);
    },
    draw(ctx, dt) {
      const me = this.me, s = this.scale;
      G.clear('#10131f');
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-me.x, -me.y);
      const vx0 = me.x - W / 2 / s, vy0 = me.y - H / 2 / s, vx1 = me.x + W / 2 / s, vy1 = me.y + H / 2 / s;
      ctx.strokeStyle = '#1b2033'; ctx.lineWidth = 1 / s; ctx.beginPath();
      for (let x = Math.floor(vx0 / 50) * 50; x < vx1; x += 50) { ctx.moveTo(x, vy0); ctx.lineTo(x, vy1); }
      for (let y = Math.floor(vy0 / 50) * 50; y < vy1; y += 50) { ctx.moveTo(vx0, y); ctx.lineTo(vx1, y); }
      ctx.stroke();
      ctx.strokeStyle = '#ff6b8b'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, WORLD, WORLD);
      for (const p of this.pellets) if (p.x > vx0 - 10 && p.x < vx1 + 10 && p.y > vy0 - 10 && p.y < vy1 + 10) G.circle(p.x, p.y, 5, `hsl(${p.hue} 80% 65%)`);
      for (const b of [me, ...this.bots].filter(b => !b.dead).sort((a, b) => a.m - b.m)) {
        const r = rad(b.m);
        if (b.x + r < vx0 || b.x - r > vx1 || b.y + r < vy0 || b.y - r > vy1) continue;
        G.circle(b.x, b.y, r, `hsl(${b.hue} 70% 45%)`);
        G.circle(b.x, b.y, r - Math.max(3, r * .08), `hsl(${b.hue} 75% 60%)`);
        G.circle(b.x - r * .3, b.y - r * .35, r * .18, 'rgba(255,255,255,.25)');
        if (b.player) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 / s; ctx.beginPath(); ctx.arc(b.x, b.y, r + 2 / s, 0, Math.PI * 2); ctx.stroke(); }
        if (r * s > 14) G.text(b.name, b.x, b.y + Math.min(14, r * .25), {size: Math.max(10, r * .35), align: 'center', weight: 700, shadow: true});
      }
      for (const mn of this.mines) {
        if (mn.x < vx0 - 40 || mn.x > vx1 + 40 || mn.y < vy0 - 40 || mn.y > vy1 + 40) continue;
        ctx.fillStyle = '#3fd27a'; ctx.beginPath();
        for (let i = 0; i < 28; i++) { const a = i * Math.PI / 14, rr = i % 2 ? mn.r * .8 : mn.r * 1.1; ctx.lineTo(mn.x + Math.cos(a) * rr, mn.y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); G.circle(mn.x, mn.y, mn.r * .6, '#2aa85d');
      }
      ctx.restore();
      G.fx(this.parts, dt);
      G.panel(W - 172, 8, 164, 30 + this.top.length * 18);
      G.text('LEADERBOARD', W - 160, 28, {size: 11, weight: 700, color: '#9aa0c8'});
      this.top.forEach((b, i) => G.text(`${i + 1}. ${b.name}  ${Math.floor(b.m)}`, W - 160, 48 + i * 18, {size: 13, weight: b.player ? 700 : 500, color: b.player ? '#ffcf5c' : '#e8e9ff'}));
      const lead = this.top[0]?.m || me.m;
      G.bar({x: 14, y: H - 28, w: 220, h: 14, v: me.m, max: Math.max(lead, me.m), color: '#5cb8ff', label: `MASS ${Math.floor(me.m)}`, id: 'mass'});
      G.bar({x: 244, y: H - 25, w: 70, h: 8, v: me.cd > 0 ? 1.4 - me.cd : 1.4, max: 1.4, color: '#ffcf5c'});
      G.text('BOOST', 320, H - 17, {size: 11, color: '#9aa0c8'});
    }
  });
})();

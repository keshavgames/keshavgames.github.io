(() => {
  // Top-down dogfights over the sea. Planes are Blender renders; the screen wraps around.
  const W = 800, H = 520;
  const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'black'];
  const ASSETS = COLORS.map(c => `img/plane_${c}.png`);
  const POW = {repair: '#7ee08a', twin: '#ffcf5c', boost: '#5cb8ff'};
  const wrap = (v, m) => ((v % m) + m) % m;
  const dWrap = (a, b, m) => { let d = b - a; if (d > m / 2) d -= m; if (d < -m / 2) d += m; return d; };

  GameBox.register({
    id: 'skyace', title: 'Sky Ace', genre: 'Shooter', kind: 'Dogfight', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg',
    hint: 'Turn with A and D, speed up with W, fire with Space. Get behind them!',
    desc: 'Toy biplanes duel above a sunny sea. Your plane never stops flying, so bank around, get on their tail and fire. Grab repair kits, twin guns and boosts. Shoot down every wave across thirty levels, or challenge a friend to a two-player dogfight on one keyboard. Fly off one edge and you come back on the other.',
    controls: [['A D / Left Right', 'Turn'], ['W S', 'Faster / slower'], ['Space', 'Fire'], ['2P: Arrows + Enter', 'Player 2 turns, throttles and fires']],
    info() { return G.mode === 'local' ? `Dogfight ${this.duel[0]} - ${this.duel[1]}` : `Wave ${G.level} · Enemies left ${this.queue + this.foes.filter(f => f.alive).length}`; },
    init() {
      const n = G.level, R = G.seeded(n * 61 + 2);
      this.islands = Array.from({length: 3 + R.int(3)}, () => ({x: R() * W, y: R() * H, r: 30 + R() * 50, k: R()}));
      this.clouds = Array.from({length: 7}, () => ({x: R() * W, y: R() * H, r: 30 + R() * 40, v: 10 + R() * 14}));
      this.bullets = []; this.parts = []; this.pows = []; this.falling = []; this.t = 0; this.msgT = 2.5; this.over = null;
      const duel = G.mode === 'local';
      this.me = this.plane(120, H / 2, 0, 'blue', 'p1');
      if (duel) { this.p2 = this.plane(W - 120, H / 2, Math.PI, 'red', 'p2'); this.duel = this.duelLvl === n && this.duel ? this.duel : [0, 0]; this.duelLvl = n; this.msg = 'First to 5 wins!'; this.foes = []; this.queue = 0; return; }
      this.p2 = null; this.lives = 3; this.foes = [];
      this.queue = Math.min(10, 2 + Math.floor(n / 3)); this.maxField = Math.min(3, 1 + Math.floor(n / 8)); this.spawnT = 1.2;
      this.msg = `Wave ${n}: ${this.queue} enemy planes`;
    },
    plane(x, y, a, color, who) { return {x, y, a, color, who, speed: 170, hp: 100, cd: 0, twin: 0, boost: 0, alive: true, safe: 2, smoke: 0, turn: 0, ai: {jink: 0}}; },
    fire(p) {
      if (p.cd > 0 || !p.alive) return;
      p.cd = p.who === 'bot' ? Math.max(.18, .36 - G.level * .006) : .11;
      const guns = p.twin > 0 ? [-9, 9] : [0];
      for (const off of guns) this.bullets.push({x: p.x + Math.cos(p.a) * 30 - Math.sin(p.a) * off, y: p.y + Math.sin(p.a) * 30 + Math.cos(p.a) * off, vx: Math.cos(p.a) * 560 + Math.cos(p.a) * p.speed, vy: Math.sin(p.a) * 560 + Math.sin(p.a) * p.speed, owner: p, life: .75});
      if (p.who !== 'bot') G.sfx('shoot', .5); else G.sfx('shoot', .15);
    },
    key(k) { if (k === ' ') this.fire(this.me); if (k === 'Enter' && this.p2) this.fire(this.p2); },
    fly(p, turn, thr, dt) {
      p.turn = turn; p.a += turn * (p.who === 'bot' ? 2.4 : 3.1) * dt;
      const target = 170 + thr * 70 + (p.boost > 0 ? 80 : 0); p.speed += (target - p.speed) * Math.min(1, dt * 2);
      p.x = wrap(p.x + Math.cos(p.a) * p.speed * dt, W); p.y = wrap(p.y + Math.sin(p.a) * p.speed * dt, H);
      if (p.hp < 50 && (p.smoke -= dt) <= 0) { p.smoke = .06; this.parts.push({x: p.x - Math.cos(p.a) * 20, y: p.y - Math.sin(p.a) * 20, vx: 0, vy: 0, life: .9, color: p.hp < 25 ? '#3a3a3a' : '#9a9a9a', size: 7}); }
    },
    bot(p, dt) {
      const me = this.me; if (!me.alive) { this.fly(p, Math.sin(this.t + p.x) * .4, 0, dt); return; }
      const lead = .25, tx = me.x + Math.cos(me.a) * me.speed * lead, ty = me.y + Math.sin(me.a) * me.speed * lead;
      const dx = dWrap(p.x, tx, W), dy = dWrap(p.y, ty, H), d = Math.hypot(dx, dy);
      let rel = Math.atan2(dy, dx) - p.a; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      // if the player is right behind, break away
      const bx = dWrap(me.x, p.x, W), by = dWrap(me.y, p.y, H); let behind = Math.atan2(by, bx) - me.a; behind = Math.atan2(Math.sin(behind), Math.cos(behind));
      if ((p.ai.jink -= dt) <= 0 && Math.abs(behind) < .3 && Math.hypot(bx, by) < 220 && Math.random() < .5) p.ai.jink = .8 + Math.random() * .6, p.ai.dir = Math.random() < .5 ? -1 : 1;
      const skill = Math.min(1, .35 + G.level * .025);
      const turn = p.ai.jink > 0 ? p.ai.dir : Math.max(-1, Math.min(1, rel * (2 + skill * 2)));
      this.fly(p, turn * (.65 + skill * .25), d > 260 ? 1 : d < 120 ? -1 : 0, dt);
      if (Math.abs(rel) < .14 + (1 - skill) * .1 && d < 360 && Math.random() < dt * (3 + skill * 4)) this.fire(p);
    },
    hit(p, dmg, from) {
      if (p.safe > 0) return;
      p.hp -= dmg; G.sfx('hit', from.who === 'bot' ? .3 : .5); this.parts.push({x: p.x, y: p.y, vx: 0, vy: 0, life: .15, color: '#ffe08a', size: 8});
      if (p === this.me || p === this.p2) G.shake(3, .1);
      if (p.hp > 0) return;
      p.alive = false; this.falling.push({x: p.x, y: p.y, a: p.a, color: p.color, t: 1.2, spin: (Math.random() < .5 ? -1 : 1) * 6}); G.sfx('boom', .7); G.burst(this.parts, p.x, p.y, '#ff9f43', 20, 200);
      if (G.mode === 'local') { const w = p === this.me ? 1 : 0; this.duel[w]++; this.msg = `${w ? 'RED' : 'BLUE'} scores!`; this.msgT = 1.5; this.respawn = {who: p, t: 1.6}; if (this.duel[w] >= 5) this.over = {t: 1.2, go: () => G.end(w ? 'Red ace wins!' : 'Blue ace wins!')}; return; }
      if (p === this.me) {
        if (--this.lives <= 0) { this.over = {t: 1.4, go: () => G.end('Shot down!')}; return; }
        this.respawn = {who: p, t: 1.8}; this.msg = `${this.lives} ${this.lives > 1 ? 'planes' : 'plane'} left`; this.msgT = 1.6;
      } else {
        G.score += p.color === 'black' ? 250 : 120;
        if (Math.random() < .3) this.pows.push({x: p.x, y: p.y, kind: G.pick(Object.keys(POW)), life: 12});
        if (!this.queue && !this.foes.some(f => f.alive)) { G.score += 600 + G.level * 40; G.party(); this.over = {t: 1.2, go: () => G.win(this.lives >= 3 ? 3 : this.lives === 2 ? 2 : 1, 'Sky cleared!')}; }
      }
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.over && this.over.t > 0 && (this.over.t -= dt) <= 0) this.over.go();
      for (const c of this.clouds) c.x = wrap(c.x + c.v * dt, W + 200);
      if (this.respawn && (this.respawn.t -= dt) <= 0) { const p = this.respawn.who; Object.assign(p, {x: p === this.p2 ? W - 120 : 120, y: H / 2, a: p === this.p2 ? Math.PI : 0, hp: 100, alive: true, safe: 2, speed: 170}); this.respawn = null; }
      const planes = [this.me, this.p2, ...this.foes].filter(Boolean);
      for (const p of planes) { p.cd -= dt; p.safe -= dt; p.twin -= dt; p.boost -= dt; }
      const me = this.me;
      if (me.alive && !this.over) {
        const turn = G.held('d') - G.held('a') + (this.p2 ? 0 : G.held('ArrowRight') - G.held('ArrowLeft')), thr = G.held('w') - G.held('s') + (this.p2 ? 0 : G.held('ArrowUp') - G.held('ArrowDown'));
        this.fly(me, Math.max(-1, Math.min(1, turn)), Math.max(-1, Math.min(1, thr)), dt);
        if (G.keys[' ']) this.fire(me);
      }
      if (this.p2 && this.p2.alive && !this.over) { const p2 = this.p2; this.fly(p2, G.held('ArrowRight') - G.held('ArrowLeft'), G.held('ArrowUp') - G.held('ArrowDown'), dt); if (G.keys.Enter) this.fire(p2); }
      if (!this.p2 && this.queue > 0 && (this.spawnT -= dt) <= 0 && this.foes.filter(f => f.alive).length < this.maxField) {
        const edge = G.pick([[W + 30, Math.random() * H, Math.PI], [-30, Math.random() * H, 0], [Math.random() * W, -30, Math.PI / 2], [Math.random() * W, H + 30, -Math.PI / 2]]);
        const ace = G.level >= 6 && Math.random() < Math.min(.4, G.level * .015);
        const f = this.plane(wrap(edge[0], W), wrap(edge[1], H), edge[2], ace ? 'black' : G.pick(['red', 'green', 'yellow', 'purple']), 'bot');
        f.hp = ace ? 50 : 25 + Math.min(15, G.level * .5); f.max = f.hp; f.safe = .6; this.foes.push(f); this.queue--; this.spawnT = Math.max(1.2, 3 - G.level * .05);
      }
      for (const f of this.foes) if (f.alive && !this.over) this.bot(f, dt);
      for (const b of this.bullets) {
        b.life -= dt;
        if (b.owner.who !== 'bot') { // gentle aim help for the players
          const tg = (this.p2 ? [b.owner === me ? this.p2 : me] : this.foes).filter(f => f && f.alive)
            .map(f => ({f, dx: dWrap(b.x, f.x, W), dy: dWrap(b.y, f.y, H)})).filter(o => Math.hypot(o.dx, o.dy) < 160)
            .sort((a, c) => Math.hypot(a.dx, a.dy) - Math.hypot(c.dx, c.dy))[0];
          if (tg) { const sp = Math.hypot(b.vx, b.vy), ang = Math.atan2(b.vy, b.vx); let rel = Math.atan2(tg.dy, tg.dx) - ang; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); if (Math.abs(rel) < .3) { const na = ang + rel * Math.min(1, dt * 6); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } }
        }
        b.x = wrap(b.x + b.vx * dt, W); b.y = wrap(b.y + b.vy * dt, H);
        for (const p of planes) if (p.alive && p !== b.owner && !(p.who === 'bot' && b.owner.who === 'bot') && Math.hypot(dWrap(b.x, p.x, W), dWrap(b.y, p.y, H)) < 22) { b.life = 0; this.hit(p, b.owner.who === 'bot' ? 6 + Math.min(4, G.level * .12) : 12, b.owner); break; }
      }
      this.bullets = this.bullets.filter(b => b.life > 0);
      for (const f of this.falling) { f.t -= dt; f.a += f.spin * dt; if (f.t <= 0 && !f.splash) { f.splash = 1; G.burst(this.parts, f.x, f.y, '#cfe8ff', 14, 120); G.sfx('splash', .5); } }
      this.falling = this.falling.filter(f => f.t > -.5);
      for (const pw of this.pows) { pw.life -= dt; for (const p of [me, this.p2]) if (p && p.alive && Math.hypot(dWrap(p.x, pw.x, W), dWrap(p.y, pw.y, H)) < 30) { pw.life = 0; G.sfx('power'); if (pw.kind === 'repair') p.hp = 100; if (pw.kind === 'twin') p.twin = 10; if (pw.kind === 'boost') p.boost = 8; this.msg = {repair: 'REPAIRED!', twin: 'TWIN GUNS!', boost: 'BOOST!'}[pw.kind]; this.msgT = 1.3; } }
      this.pows = this.pows.filter(p => p.life > 0);
    },
    drawPlane(ctx, p, x, y, a, scale = 1, alpha = 1) {
      const img = G.img(`img/plane_${p.color}.png`); if (!img.complete || !img.naturalWidth) return;
      const bank = 1 - Math.abs(p.turn || 0) * .18, xs = [x], ys = [y];
      if (x < 60) xs.push(x + W); if (x > W - 60) xs.push(x - W); if (y < 60) ys.push(y + H); if (y > H - 60) ys.push(y - H);
      for (const px of xs) for (const py of ys) { // drawn twice near an edge so it slides across the wrap
        ctx.save(); ctx.globalAlpha = .25 * alpha; ctx.translate(px + 26 * scale, py + 34 * scale); ctx.rotate(a); ctx.scale(scale * .9, scale * .9 * bank); ctx.filter = 'brightness(0)'; ctx.drawImage(img, -48, -48, 96, 96); ctx.restore();
        ctx.save(); ctx.globalAlpha = alpha * (p.safe > 0 && Math.floor(this.t * 10) % 2 ? .4 : 1); ctx.translate(px, py); ctx.rotate(a); ctx.scale(scale, scale * bank); ctx.drawImage(img, -48, -48, 96, 96); ctx.restore();
      }
    },
    draw(ctx, dt) {
      // sea, islands
      const sea = ctx.createLinearGradient(0, 0, 0, H); sea.addColorStop(0, '#2a7fc0'); sea.addColorStop(1, '#1f63a0'); ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const x = (i * 97 + this.t * 8) % W, y = (i * 53) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 10, y - 4, x + 20, y); ctx.stroke(); }
      for (const is of this.islands) { G.circle(is.x, is.y, is.r + 10, '#e8d8a0'); G.circle(is.x, is.y, is.r, is.k < .5 ? '#5aa04a' : '#6ab052'); G.circle(is.x - is.r * .3, is.y - is.r * .2, is.r * .45, '#4a8a3c'); for (let k = 0; k < 3; k++) G.circle(is.x + (k - 1) * is.r * .35, is.y + is.r * .25, 6, '#2f6a2a'); }
      for (const pw of this.pows) { if (pw.life < 3 && Math.floor(pw.life * 6) % 2) continue; G.circle(pw.x, pw.y, 16, 'rgba(255,255,255,.35)'); G.circle(pw.x, pw.y, 12, POW[pw.kind]); G.text({repair: '+', twin: '2', boost: '»'}[pw.kind], pw.x, pw.y + 5, {size: 14, align: 'center', weight: 800, color: '#fff'}); }
      for (const f of this.falling) this.drawPlane(ctx, f, f.x, f.y, f.a, Math.max(.2, .4 + f.t * .5), Math.max(0, Math.min(1, f.t + .5)));
      for (const b of this.bullets) { ctx.strokeStyle = b.owner.who === 'bot' ? '#ffb070' : '#fff6a0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .02, b.y - b.vy * .02); ctx.stroke(); }
      for (const p of [this.me, this.p2, ...this.foes].filter(p => p && p.alive)) {
        this.drawPlane(ctx, p, p.x, p.y, p.a);
        if (p.who === 'bot' || this.p2) G.bar({x: p.x - 18, y: p.y - 40, w: 36, h: 5, v: p.hp, max: p.max || 100, color: p.who === 'bot' ? '#ff6b6b' : '#5ee6c1'});
      }
      G.fx(this.parts, dt);
      for (const c of this.clouds) { const x = c.x - 100; ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const [ox, oy, r] of [[0, 0, 1], [c.r * .7, 6, .8], [-c.r * .6, 8, .7], [c.r * .2, -c.r * .4, .7]]) { ctx.beginPath(); ctx.arc(x + ox, c.y + oy, c.r * r, 0, Math.PI * 2); ctx.fill(); } }
      // HUD
      if (this.p2) { G.text(`BLUE ${this.duel[0]}`, 16, 28, {size: 18, weight: 800, color: '#5cb8ff', shadow: true}); G.text(`RED ${this.duel[1]}`, W - 16, 28, {size: 18, align: 'right', weight: 800, color: '#ff6b6b', shadow: true}); }
      else {
        G.bar({x: 16, y: H - 30, w: 180, h: 14, v: this.me.hp, max: 100, color: this.me.hp < 30 ? '#ff4b62' : '#5ee6c1', label: `PLANE ${Math.max(0, Math.ceil(this.me.hp))}`});
        for (let i = 0; i < this.lives; i++) { const img = G.img('img/plane_blue.png'); if (img.complete) ctx.drawImage(img, 10 + i * 34, 6, 34, 34); }
        G.text(`ENEMIES ${this.queue + this.foes.filter(f => f.alive).length}`, W - 16, 28, {size: 16, align: 'right', weight: 800, color: '#fff', shadow: true});
        if (this.me.twin > 0) G.text('TWIN GUNS', W / 2, H - 20, {size: 12, align: 'center', weight: 800, color: POW.twin, shadow: true});
      }
      if (this.msgT > 0) G.text(this.msg, W / 2, H / 2 - 40, {size: 26, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

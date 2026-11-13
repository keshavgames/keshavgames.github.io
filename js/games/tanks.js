(() => {
  // Top-down tank battles. Hulls and turrets are Blender renders; turrets turn on their own.
  const W = 800, H = 520, T = 40, CW = 20, CH = 13;
  const COLORS = ['green', 'blue', 'red', 'yellow', 'purple', 'grey'];
  const ASSETS = COLORS.flatMap(c => [`img/tank_hull_${c}.png`, `img/tank_turret_${c}.png`]);
  // tiles: 0 ground, 1 brick, 2 steel, 3 bush, 4 water
  const ENEMY = {scout: {color: 'grey', hp: 1, speed: 130, rate: 1.4}, tank: {color: 'red', hp: 2, speed: 95, rate: 1.1}, heavy: {color: 'purple', hp: 4, speed: 70, rate: 1.0}, ace: {color: 'yellow', hp: 2, speed: 120, rate: .7}};
  const POW = {shield: '#5cb8ff', triple: '#ffcf5c', speed: '#7ee08a', life: '#ff6b8b'};

  GameBox.register({
    id: 'tanks', title: 'Tank Clash', genre: 'Shooter', kind: 'Top-down tanks', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg', cursor: 'crosshair',
    hint: 'Destroy every enemy tank! Shells bounce off steel once. Hide in bushes.',
    desc: 'Toy tanks battle in brick mazes. Against the computer, wipe out each wave of enemy tanks: scouts are fast, heavies take a beating, aces shoot fast. Shells bounce off steel once and smash bricks. Grab shields, triple shot and speed. Or play a two-player duel on one keyboard. Thirty battlefields.',
    controls: [['WASD', 'Drive'], ['Mouse / Click', 'Aim and fire (vs bots)'], ['Space', 'Fire'], ['2P: Arrows + Enter', 'Player 2 drives and fires']],
    info() { return G.mode === 'local' ? `Duel ${this.score2[0]} - ${this.score2[1]}` : `Battle ${G.level} · Enemies left ${this.left + this.foes.length}`; },
    init() {
      const n = G.level, R = G.seeded(n * 29 + 5);
      // a mirrored maze so both sides are fair
      const m = this.map = Array.from({length: CH}, (_, y) => Array.from({length: CW}, (_, x) => x === 0 || y === 0 || x === CW - 1 || y === CH - 1 ? 2 : 0));
      for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW / 2; x++) {
        const r = R(); let t = 0;
        if (r < .2) t = 1; else if (r < .24 + Math.min(.06, n * .003)) t = 2; else if (r < .3) t = 3; else if (r < .32 && n > 4) t = 4;
        if (y === 6 && x < 4) t = 0;
        m[y][x] = t; m[y][CW - 1 - x] = t;
      }
      for (const [x, y] of [[2, 6], [CW - 3, 6], [CW / 2, 1], [CW / 2, CH - 2], [CW / 2 - 1, CH - 2], [CW / 2 - 1, 1]]) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (m[y + j]?.[x + i] !== undefined && x + i > 0 && x + i < CW - 1 && y + j > 0 && y + j < CH - 1) m[y + j][x + i] = 0;
      this.hp = Array.from({length: CH}, () => new Array(CW).fill(2));
      this.shells = []; this.parts = []; this.marks = []; this.pows = []; this.t = 0; this.msgT = 0; this.over = 0;
      const duel = G.mode === 'local';
      this.tanksAll = [];
      this.p1 = this.makeTank(duel ? 2.5 : CW / 2 - .5, duel ? 6.5 : CH - 1.5, duel ? 0 : -Math.PI / 2, 'blue', 3, 160, 'p1');
      if (duel) { this.p2 = this.makeTank(CW - 2.5, 6.5, Math.PI, 'green', 3, 160, 'p2'); this.score2 = this.score2 && this.duelLevel === n ? this.score2 : [0, 0]; this.duelLevel = n; }
      this.lives = duel ? 99 : 3; this.foes = [];
      const kinds = ['scout', 'tank', 'heavy', 'ace'].slice(0, n < 4 ? 1 : n < 9 ? 2 : n < 15 ? 3 : 4);
      this.queue = Array.from({length: duel ? 0 : Math.min(14, 3 + Math.floor(n / 2))}, () => R.pick(kinds)); this.left = this.queue.length; this.spawnT = 1;
      this.maxField = Math.min(4, 2 + Math.floor(n / 10)); this.msg = duel ? 'First to 5 wins!' : `Battle ${n}: ${this.queue.length} enemy tanks`; this.msgT = 2.5;
    },
    makeTank(cx, cy, a, color, hp, speed, who) { const t = {x: cx * T, y: cy * T, a, ta: a, color, hp, max: hp, speed, who, cd: 0, shield: 2, triple: 0, fast: 0, alive: true, track: 0, ai: {t: 0, goal: null, path: []}}; this.tanksAll.push(t); return t; },
    solidAt(px, py, forTank = true) { const x = Math.floor(px / T), y = Math.floor(py / T), c = this.map[y]?.[x]; return c === undefined || c === 1 || c === 2 || (forTank && c === 4); },
    tankFree(t, x, y) { const r = 16; if ([[-r, -r], [r, -r], [-r, r], [r, r]].some(([dx, dy]) => this.solidAt(x + dx, y + dy))) return false; return !this.alive().some(o => o !== t && Math.hypot(o.x - x, o.y - y) < 32); },
    alive() { return [this.p1, this.p2, ...this.foes].filter(t => t && t.alive); },
    drive(t, dx, dy, dt) {
      if (!dx && !dy) return;
      const want = Math.atan2(dy, dx); let d = Math.atan2(Math.sin(want - t.a), Math.cos(want - t.a));
      t.a += Math.sign(d) * Math.min(Math.abs(d), 9 * dt);
      if (Math.abs(d) > .9) return;
      const sp = t.speed * (t.fast > 0 ? 1.4 : 1) * dt, l = Math.hypot(dx, dy), nx = t.x + dx / l * sp, ny = t.y + dy / l * sp;
      if (this.tankFree(t, nx, t.y)) t.x = nx; if (this.tankFree(t, t.x, ny)) t.y = ny;
      if ((t.track += sp) > 14) { t.track = 0; this.marks.push({x: t.x, y: t.y, a: t.a, life: 4}); }
    },
    fire(t) {
      if (t.cd > 0 || !t.alive || this.shells.filter(s => s.owner === t).length >= (t.triple > 0 ? 6 : 3)) return;
      t.cd = t.rate || .45; const spread = t.triple > 0 ? [-.18, 0, .18] : [0];
      for (const s of spread) { const a = t.ta + s; this.shells.push({x: t.x + Math.cos(a) * 30, y: t.y + Math.sin(a) * 30, vx: Math.cos(a) * 430, vy: Math.sin(a) * 430, owner: t, bounces: 1, life: 3}); }
      G.sfx('shoot'); this.parts.push({x: t.x + Math.cos(t.ta) * 34, y: t.y + Math.sin(t.ta) * 34, vx: 0, vy: 0, life: .12, color: '#ffe08a', size: 9});
    },
    hitTank(t, from) {
      if (t.shield > 0) { G.sfx('hit', .4); return; }
      t.hp--; G.sfx('hit'); G.burst(this.parts, t.x, t.y, '#ff9f43', 8);
      if (t.hp > 0) return;
      t.alive = false; G.sfx('boom'); G.shake(8, .3); G.burst(this.parts, t.x, t.y, '#ffcf5c', 26, 240); G.burst(this.parts, t.x, t.y, '#5a5a5a', 14, 120);
      if (G.mode === 'local') { const w = t === this.p1 ? 1 : 0; this.score2[w]++; this.msg = `${w ? 'GREEN' : 'BLUE'} scores!`; this.msgT = 1.6; this.respawnT = 1.6; this.respawnWho = t; if (this.score2[w] >= 5) { this.over = {t: 1, go: () => G.end(w ? 'Green tank wins!' : 'Blue tank wins!')}; } return; }
      if (t === this.p1) {
        if (--this.lives <= 0) { this.over = {t: 1.2, go: () => G.end('Your tank was destroyed')}; return; }
        this.respawnT = 1.6; this.respawnWho = t; this.msg = `${this.lives} ${this.lives > 1 ? 'tanks' : 'tank'} left`; this.msgT = 1.6;
      } else {
        G.score += {scout: 100, tank: 150, heavy: 250, ace: 200}[t.kind] || 100;
        if (Math.random() < .3) this.pows.push({x: t.x, y: t.y, kind: G.pick(Object.keys(POW)), life: 12});
        if (!this.left && !this.foes.some(f => f.alive)) { G.score += 600 + G.level * 40; this.over = {t: 1.1, go: () => G.win(this.lives >= 3 ? 3 : this.lives === 2 ? 2 : 1, 'Battlefield cleared!')}; G.party(); }
      }
    },
    pointer(type) { if (type === 'down' && G.mode !== 'local') this.fire(this.p1); },
    key(k) { if (k === ' ' ) this.fire(this.p1); if (k === 'Enter' && this.p2) this.fire(this.p2); },
    bot(t, dt) {
      const ai = t.ai, p = this.p1; ai.t -= dt; t.cd -= 0;
      if (!p.alive) return;
      const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy);
      // aim the turret at the player, with some wobble on early levels
      const want = Math.atan2(dy, dx) + Math.sin(this.t * 2 + t.x) * Math.max(0, .25 - G.level * .012);
      t.ta += Math.atan2(Math.sin(want - t.ta), Math.cos(want - t.ta)) * Math.min(1, dt * 4);
      const clear = this.lineClear(t.x, t.y, p.x, p.y);
      if (clear && d < 520 && Math.abs(Math.atan2(Math.sin(want - t.ta), Math.cos(want - t.ta))) < .15 && Math.random() < dt * 2.2) this.fire(t);
      if (ai.t <= 0 || !ai.path.length) { ai.t = 1.2; ai.path = this.route(Math.floor(t.x / T), Math.floor(t.y / T), Math.floor(p.x / T), Math.floor(p.y / T)); }
      const nx = ai.path[0];
      if (nx && !(clear && d < 220)) { const gx = nx[0] * T + T / 2, gy = nx[1] * T + T / 2; if (Math.hypot(gx - t.x, gy - t.y) < 6) ai.path.shift(); else this.drive(t, gx - t.x, gy - t.y, dt); }
      // blocked by bricks: shoot them
      const ahead = this.map[Math.floor((t.y + Math.sin(t.a) * 30) / T)]?.[Math.floor((t.x + Math.cos(t.a) * 30) / T)];
      if (ahead === 1 && Math.random() < dt * 2) { t.ta = t.a; this.fire(t); }
    },
    lineClear(ax, ay, bx, by) { const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 12); for (let i = 1; i < n; i++) { const c = this.map[Math.floor((ay + (by - ay) * i / n) / T)]?.[Math.floor((ax + (bx - ax) * i / n) / T)]; if (c === 1 || c === 2) return false; } return true; },
    route(sx, sy, tx, ty) {
      const prev = new Int16Array(CW * CH).fill(-1), q = [sy * CW + sx]; prev[q[0]] = q[0];
      const pass = (x, y) => { const c = this.map[y]?.[x]; return c === 0 || c === 3 || c === 1; }; // it will blast through bricks
      for (let i = 0; i < q.length; i++) { const c = q[i], x = c % CW, y = (c / CW) | 0; if (x === tx && y === ty) break; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ox, ny = y + oy, k = ny * CW + nx; if (pass(nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } } }
      const t = ty * CW + tx; if (prev[t] < 0) return []; const path = []; for (let c = t; c !== sy * CW + sx; c = prev[c]) path.unshift([c % CW, (c / CW) | 0]); return path.slice(0, 6);
    },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.over) { if (this.over.t > 0 && (this.over.t -= dt) <= 0) this.over.go(); }
      for (const t of this.tanksAll) { t.cd -= dt; t.shield -= dt; t.triple -= dt; t.fast -= dt; }
      if (this.respawnT > 0 && (this.respawnT -= dt) <= 0) { const t = this.respawnWho; const home = t === this.p2 ? [CW - 2.5, 6.5] : G.mode === 'local' ? [2.5, 6.5] : [CW / 2 - .5, CH - 1.5]; Object.assign(t, {x: home[0] * T, y: home[1] * T, hp: t.max, alive: true, shield: 2}); }
      const p1 = this.p1;
      if (p1.alive && !this.over) {
        const dx = G.held('d') - G.held('a') + (G.mode === 'local' ? 0 : G.held('ArrowRight') - G.held('ArrowLeft')), dy = G.held('s') - G.held('w') + (G.mode === 'local' ? 0 : G.held('ArrowDown') - G.held('ArrowUp'));
        this.drive(p1, dx, dy, dt);
        if (G.mode !== 'local' && performance.now() - G.pointer.used < 4000) p1.ta = Math.atan2(G.pointer.y - p1.y, G.pointer.x - p1.x); else p1.ta = p1.a;
        if (G.keys[' ']) this.fire(p1);
      }
      if (this.p2 && this.p2.alive && !this.over) { const p2 = this.p2; this.drive(p2, G.held('ArrowRight') - G.held('ArrowLeft'), G.held('ArrowDown') - G.held('ArrowUp'), dt); p2.ta = p2.a; if (G.keys.Enter) this.fire(p2); }
      // enemies arrive from the top
      if (G.mode !== 'local' && this.queue.length && (this.spawnT -= dt) <= 0 && this.foes.filter(f => f.alive).length < this.maxField) {
        const spots = [[1.5, 1.5], [CW / 2 - .5, 1.5], [CW - 1.5, 1.5]].filter(([x, y]) => this.tankFree(null, x * T, y * T));
        if (spots.length) { const [x, y] = G.pick(spots), kind = this.queue.shift(), K = ENEMY[kind]; const f = this.makeTank(x, y, Math.PI / 2, K.color, K.hp, K.speed * (1 + G.level * .01), 'bot'); f.kind = kind; f.rate = K.rate; f.shield = .8; this.foes.push(f); this.left = this.queue.length; this.spawnT = Math.max(1.2, 3.5 - G.level * .06); }
      }
      for (const f of this.foes) if (f.alive && !this.over) this.bot(f, dt);
      // shells
      for (const s of this.shells) {
        s.life -= dt; const ox = s.x, oy = s.y; s.x += s.vx * dt; s.y += s.vy * dt;
        const cx = Math.floor(s.x / T), cy = Math.floor(s.y / T), c = this.map[cy]?.[cx];
        if (c === 1) { if (--this.hp[cy][cx] <= 0) { this.map[cy][cx] = 0; G.burst(this.parts, cx * T + T / 2, cy * T + T / 2, '#b0583a', 12); } G.sfx('crunch', .5); s.life = 0; continue; }
        if (c === 2 || c === undefined) {
          if (s.bounces-- > 0) { const hx = Math.floor(ox / T) !== cx, hy = Math.floor(oy / T) !== cy; if (hx) s.vx *= -1; if (hy) s.vy *= -1; if (!hx && !hy) { s.vx *= -1; s.vy *= -1; } s.x = ox; s.y = oy; G.sfx('click', .5); }
          else s.life = 0;
          continue;
        }
        for (const t of this.alive()) if (Math.hypot(t.x - s.x, t.y - s.y) < 18 && (t !== s.owner || s.bounces < 1)) {
          if (G.mode !== 'local' && t.who === 'bot' && s.owner.who === 'bot') { s.life = 0; break; } // bots do not hurt each other
          s.life = 0; this.hitTank(t, s.owner); break;
        }
        for (const o of this.shells) if (o !== s && o.life > 0 && o.owner !== s.owner && Math.hypot(o.x - s.x, o.y - s.y) < 8) { o.life = s.life = 0; G.burst(this.parts, s.x, s.y, '#fff', 6); }
      }
      this.shells = this.shells.filter(s => s.life > 0);
      for (const pw of this.pows) { pw.life -= dt; for (const t of [this.p1, this.p2]) if (t && t.alive && Math.hypot(t.x - pw.x, t.y - pw.y) < 26) { pw.life = 0; G.sfx('power'); if (pw.kind === 'shield') t.shield = 8; if (pw.kind === 'triple') t.triple = 10; if (pw.kind === 'speed') t.fast = 10; if (pw.kind === 'life') this.lives = Math.min(5, this.lives + 1); this.msg = {shield: 'SHIELD!', triple: 'TRIPLE SHOT!', speed: 'SPEED!', life: 'EXTRA TANK!'}[pw.kind]; this.msgT = 1.4; } }
      this.pows = this.pows.filter(p => p.life > 0);
      for (const mk of this.marks) mk.life -= dt; this.marks = this.marks.filter(m => m.life > 0);
    },
    drawTank(ctx, t) {
      const hull = G.img(`img/tank_hull_${t.color}.png`), tur = G.img(`img/tank_turret_${t.color}.png`), s = 64;
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a); if (hull.complete && hull.naturalWidth) ctx.drawImage(hull, -s / 2, -s / 2, s, s); ctx.restore();
      ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.ta); if (tur.complete && tur.naturalWidth) ctx.drawImage(tur, -s / 2, -s / 2, s, s); ctx.restore();
      if (t.shield > 0) { ctx.strokeStyle = `rgba(120,200,255,${.4 + Math.sin(this.t * 10) * .2})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(t.x, t.y, 26, 0, Math.PI * 2); ctx.stroke(); }
      if (t.max > 1 && t.hp < t.max) G.bar({x: t.x - 18, y: t.y - 32, w: 36, h: 5, v: t.hp, max: t.max, color: t.who === 'bot' ? '#ff6b6b' : '#5ee6c1'});
    },
    draw(ctx, dt) {
      const m = this.map;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { ctx.fillStyle = (x + y) % 2 ? '#7a8a4a' : '#748446'; ctx.fillRect(x * T, y * T, T, T); }
      for (const mk of this.marks) { ctx.save(); ctx.translate(mk.x, mk.y); ctx.rotate(mk.a); ctx.fillStyle = `rgba(40,30,20,${mk.life * .07})`; ctx.fillRect(-4, -22, 8, 6); ctx.fillRect(-4, 16, 8, 6); ctx.restore(); }
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const c = m[y][x], sx = x * T, sy = y * T;
        if (c === 1) { const dmg = this.hp[y][x] < 2; ctx.fillStyle = '#5a2a1a'; ctx.fillRect(sx, sy, T, T); for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { ctx.fillStyle = dmg && (r + k) % 3 === 0 ? '#6a3a2a' : '#b0583a'; ctx.fillRect(sx + 1 + k * 13 + (r % 2) * 6 - (r % 2 && k === 2 ? 6 : 0), sy + 1 + r * 10, 11, 8); } }
        if (c === 2) { G.rr(sx + 1, sy + 1, T - 2, T - 2, 4, '#8a929e'); G.rr(sx + 5, sy + 5, T - 10, T - 10, 3, '#a8b0bc'); for (const [ox, oy] of [[8, 8], [32, 8], [8, 32], [32, 32]]) G.circle(sx + ox, sy + oy, 2, '#5a626e'); }
        if (c === 4) { ctx.fillStyle = '#2a6ab0'; ctx.fillRect(sx, sy, T, T); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; const o = (this.t * 20 + x * 7) % 20; ctx.beginPath(); ctx.moveTo(sx + 4, sy + 12 + o * .3); ctx.quadraticCurveTo(sx + 20, sy + 6 + o * .3, sx + 36, sy + 12 + o * .3); ctx.stroke(); }
      }
      for (const pw of this.pows) { const blink = pw.life < 3 && Math.floor(pw.life * 6) % 2; if (blink) continue; G.circle(pw.x, pw.y, 15, 'rgba(255,255,255,.25)'); G.circle(pw.x, pw.y, 11, POW[pw.kind]); G.text({shield: 'S', triple: '3', speed: '»', life: '♥'}[pw.kind], pw.x, pw.y + 5, {size: 13, align: 'center', weight: 800, color: '#fff'}); }
      for (const t of this.alive()) this.drawTank(ctx, t);
      for (const s of this.shells) { G.circle(s.x, s.y, 5, '#2a2a2a'); G.circle(s.x - 1, s.y - 1, 2.5, '#ffe08a'); }
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (m[y][x] === 3) { for (let k = 0; k < 5; k++) G.circle(x * T + 8 + (k * 13) % 26, y * T + 10 + Math.floor(k / 2) * 11, 11, k % 2 ? '#2f6a2a' : '#3f8a36'); }
      G.fx(this.parts, dt);
      // HUD
      if (G.mode === 'local') { G.text(`BLUE ${this.score2[0]}`, 16, 28, {size: 18, weight: 800, color: '#5cb8ff', shadow: true}); G.text(`GREEN ${this.score2[1]}`, W - 16, 28, {size: 18, align: 'right', weight: 800, color: '#7ee08a', shadow: true}); }
      else {
        for (let i = 0; i < this.lives; i++) { const hull = G.img('img/tank_hull_blue.png'); if (hull.complete) ctx.drawImage(hull, 8 + i * 30, 6, 30, 30); }
        G.text(`ENEMIES ${this.left + this.foes.filter(f => f.alive).length}`, W - 16, 28, {size: 16, align: 'right', weight: 800, color: '#fff', shadow: true});
        const p = this.p1; if (p.triple > 0) G.text('TRIPLE', W / 2 - 60, 28, {size: 12, align: 'center', weight: 800, color: POW.triple, shadow: true}); if (p.fast > 0) G.text('SPEED', W / 2 + 60, 28, {size: 12, align: 'center', weight: 800, color: POW.speed, shadow: true});
      }
      if (this.msgT > 0) G.text(this.msg, W / 2, H / 2, {size: 28, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

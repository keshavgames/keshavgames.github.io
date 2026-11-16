(() => {
  // Keep a fish tank: feed the fish, wipe the glass, scoop up the coins they drop and buy more fish. Fish are Blender renders.
  const W = 800, H = 540, TANK = 430, SAND = TANK - 16;
  const FISH = [ // cost, coin value, seconds between coins, drawn width, swim speed
    {k: 'goldie', cost: 10, val: 5, every: 6, size: 70, speed: 60},
    {k: 'stripe', cost: 30, val: 8, every: 6, size: 74, speed: 72},
    {k: 'blue', cost: 60, val: 12, every: 6.5, size: 80, speed: 55},
    {k: 'pinky', cost: 100, val: 18, every: 7, size: 76, speed: 78},
    {k: 'lime', cost: 150, val: 25, every: 7, size: 82, speed: 66},
    {k: 'puffer', cost: 220, val: 40, every: 8, size: 86, speed: 40},
    {k: 'angel', cost: 320, val: 60, every: 8, size: 94, speed: 50},
    {k: 'ruby', cost: 450, val: 90, every: 9, size: 102, speed: 46}
  ];
  const SNAIL = 80, MAXFISH = 14;

  GameBox.register({
    id: 'aquarium', title: 'Aquarium Keeper', genre: 'Simulation', kind: 'Fish tank', w: W, h: H, levels: 30, assets: FISH.map(f => `img/fish_${f.k}.png`), thumb: 'jpg', cursor: 'pointer',
    hint: 'Click the water to drop food. Click or swipe the coins. Buy more fish at the bottom!',
    desc: 'Your very own fish tank. Drop food for hungry fish, wipe the green gunk off the glass and scoop up the coins your fish drop. Spend coins on fancier fish that drop bigger coins, or a snail that collects for you. Watch out for the grabby octopus on later days: tap it until it lets go! Thirty days, each with a coin goal.',
    controls: [['Click the water', 'Drop fish food'], ['Click / swipe coins', 'Collect them'], ['Click green gunk', 'Wipe the glass'], ['Click the octopus', 'Make it let go'], ['Click a shop button', 'Buy a fish or snail']],
    info() { return `Day ${G.level} · ${this.earned}/${this.goal} coins · ${Math.ceil(Math.max(0, this.time))}s`; },
    init() {
      const n = G.level;
      this.goal = 150 + (n - 1) * 50; this.time = 120; this.coins = 20 + n * 6; this.earned = 0;
      this.fish = []; this.add(0); this.add(0); if (n > 8) this.add(1); if (n > 18) this.add(2);
      this.food = []; this.drops = []; this.dirt = []; this.bubbles = []; this.parts = []; this.snail = null; this.octo = null;
      this.octoT = 26; this.dirtT = 5; this.t = 0; this.done = null; this.unlocked = Math.min(8, 3 + Math.floor(n / 3));
      this.hungerRate = 1 / (38 - Math.min(16, n * .6)); this.dirtEvery = Math.max(3, 9 - n * .2);
    },
    add(i) {
      const f = FISH[i]; this.fish.push({f, x: 120 + Math.random() * 560, y: 80 + Math.random() * 200, tx: 400, ty: 200, vx: 0, vy: 0, dir: 1, hunger: Math.random() * .25, coinT: Math.random() * f.every, sick: false, wob: Math.random() * 6, born: 1});
    },
    collect(d) { if (d.got) return; d.got = true; this.coins += d.val; this.earned += d.val; G.score += d.val; G.popText(this.parts, d.x, d.y - 12, `+${d.val}`, '#ffe27a', 15); G.sfx('coin', .3); },
    tip() { const o = this.octo, f = o.fish; return {x: o.x + (f.x - o.x) * o.p, y: 46 + (f.y - 46) * o.p}; },
    buy(i) {
      if (i === 8) { if (this.snail || this.coins < SNAIL) return G.sfx('hit', .3); this.coins -= SNAIL; this.snail = {x: 400, dir: 1}; G.sfx('power', .5); return; }
      const f = FISH[i]; if (i >= this.unlocked || this.coins < f.cost || this.fish.length >= MAXFISH) return G.sfx('hit', .3);
      this.coins -= f.cost; this.add(i); const nf = this.fish[this.fish.length - 1]; nf.x = 400; nf.y = 40; G.sfx('splash', .5); G.burst(this.parts, 400, 50, '#bfefff', 14, 120);
    },
    pointer(type, x, y) {
      if (this.done) return;
      if (type === 'move' && G.pointer.down) { for (const d of this.drops) if (Math.hypot(d.x - x, d.y - y) < 30) this.collect(d); return; }
      if (type !== 'down') return;
      if (y > TANK + 8) { for (let i = 0; i < 9; i++) { const bx = 10 + i * 87; if (x > bx && x < bx + 82 && y > TANK + 16) this.buy(i); } return; }
      const o = this.octo;
      if (o && !o.flee) { const tp = this.tip(); if (Math.hypot(x - o.x, y - 30) < 54 || Math.hypot(x - tp.x, y - tp.y) < 36) { o.hp--; o.hit = .15; G.sfx('hit', .5); G.shake(4);
        if (o.hp <= 0) { o.flee = .01; o.p = Math.min(o.p, .5); this.coins += 30; this.earned += 30; G.popText(this.parts, o.x, 80, 'Go away! +30', '#ffcf5c', 20); G.sfx('win', .4); } return; } }
      let hitCoin = false; for (const d of this.drops) if (Math.hypot(d.x - x, d.y - y) < 30) { this.collect(d); hitCoin = true; }
      if (hitCoin) return;
      for (let i = this.dirt.length - 1; i >= 0; i--) { const s = this.dirt[i]; if (Math.hypot(x - s.x, y - s.y) < s.r + 8) { this.dirt.splice(i, 1); G.burst(this.parts, s.x, s.y, '#a8e8a0', 8, 80); G.note(1400, .05, {type: 'sine', vol: .08}); G.note(1800, .05, {type: 'sine', vol: .06, when: .05}); return; } }
      if (this.food.length < 6 && y > 30 && y < SAND - 10) { this.food.push({x, y, life: 5}); G.note(700, .04, {type: 'triangle', vol: .1}); }
    },
    update(dt) {
      this.t += dt; const n = G.level;
      for (const b of this.bubbles) { b.y -= (40 + b.r * 12) * dt; b.x += Math.sin(this.t * 3 + b.y * .05) * 14 * dt; }
      this.bubbles = this.bubbles.filter(b => b.y > 8); if (Math.random() < dt * 5) this.bubbles.push({x: 712 + Math.random() * 14, y: SAND - 14, r: 2 + Math.random() * 4});
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if ((this.time -= dt) <= 0) { this.done = {t: .6, go: () => G.end(`Earned ${this.earned} of ${this.goal} coins`)}; return; }
      for (const p of this.food) { if (p.y < SAND - 2) p.y += 42 * dt; else p.life -= dt; }
      this.food = this.food.filter(p => p.life > 0 && !p.eaten);
      const slow = 1 - Math.min(.7, this.dirt.length * .06);
      for (const f of this.fish) {
        f.born = Math.max(0, f.born - dt); if (f.grabbed) continue;
        f.hunger = Math.min(1, f.hunger + this.hungerRate * dt); if (f.hunger >= 1) f.sick = true;
        let tx = f.tx, ty = f.ty, sp = f.f.speed * (f.sick ? .45 : 1);
        const meal = f.hunger > .3 && this.food.reduce((b, p) => !b || Math.hypot(p.x - f.x, p.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? p : b, null);
        if (meal) { tx = meal.x; ty = meal.y; sp *= 1.9; if (Math.hypot(meal.x - f.x, meal.y - f.y) < 22) { meal.eaten = true; this.food = this.food.filter(p => !p.eaten); f.hunger = 0; f.sick = false; G.popText(this.parts, f.x, f.y - 30, '♥', '#ff7bd0', 20); G.note(520, .06, {type: 'square', vol: .05}); } }
        else if (Math.hypot(tx - f.x, ty - f.y) < 24) { f.tx = 60 + Math.random() * (W - 120); f.ty = 60 + Math.random() * (SAND - 140); }
        const a = Math.atan2(ty - f.y, tx - f.x); f.vx += (Math.cos(a) * sp - f.vx) * dt * 2.2; f.vy += (Math.sin(a) * sp - f.vy) * dt * 2.2;
        f.x = Math.max(30, Math.min(W - 30, f.x + f.vx * dt)); f.y = Math.max(30, Math.min(SAND - 24, f.y + f.vy * dt));
        if (Math.abs(f.vx) > 6) f.dir += ((f.vx > 0 ? 1 : -1) - f.dir) * Math.min(1, dt * 7);
        if (!f.sick && (f.coinT -= dt * slow * (f.hunger > .6 ? .5 : 1)) <= 0) { f.coinT = f.f.every; this.drops.push({x: f.x, y: f.y + 12, val: f.f.val, life: 8}); }
      }
      for (const d of this.drops) { if (d.y < SAND - 6) d.y += 60 * dt; else d.life -= dt; }
      this.drops = this.drops.filter(d => d.life > 0 && !d.got);
      if ((this.dirtT -= dt) <= 0 && this.dirt.length < 12) { this.dirtT = this.dirtEvery; this.dirt.push({x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (SAND - 80), r: 16 + Math.random() * 16, s: Math.random() * 99}); }
      if (this.snail) { const s = this.snail, d = this.drops.filter(d => d.y >= SAND - 7).sort((a, b) => Math.abs(a.x - s.x) - Math.abs(b.x - s.x))[0];
        if (d) { s.dir = d.x > s.x ? 1 : -1; s.x += s.dir * 55 * dt; if (Math.abs(d.x - s.x) < 14) this.collect(d); } }
      if (n >= 5 && !this.octo && this.fish.length > 1 && (this.octoT -= dt) <= 0) { const f = G.pick(this.fish.filter(f => !f.grabbed)); this.octo = {fish: f, x: f.x, p: 0, hp: 4 + Math.floor(n / 6), hit: 0, flee: 0, carry: false}; G.sfx('growl', .35); }
      const o = this.octo;
      if (o) {
        o.hit = Math.max(0, o.hit - dt);
        if (o.flee) { o.flee += dt; if (o.carry) o.fish.y -= 160 * dt; if (o.flee > 1.3) { if (o.carry) this.fish = this.fish.filter(f => f !== o.fish); this.octo = null; this.octoT = 34 - Math.min(14, n * .4); } }
        else { o.p += dt / 7; o.x += (o.fish.x - o.x) * Math.min(1, dt * 1.5);
          if (o.p >= 1) { o.fish.grabbed = true; o.carry = true; o.flee = .01; G.popText(this.parts, o.fish.x, o.fish.y - 30, 'It grabbed a fish!', '#ff6b8b', 18); G.sfx('lose', .4); } }
      }
      if (this.earned >= this.goal) { G.party(); G.score += Math.round(this.time) * 10; const st = this.time > 40 ? 3 : this.time > 15 ? 2 : 1; this.done = {t: 1.2, go: () => G.win(st, `${this.fish.length} happy fish!`)}; }
    },
    drawBack(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, TANK); g.addColorStop(0, '#62d0f4'); g.addColorStop(.6, '#1e86c4'); g.addColorStop(1, '#0c4e8a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, TANK);
      for (let i = 0; i < 6; i++) { const x = (i * 150 + Math.sin(this.t * .4 + i) * 40) % (W + 100) - 50; ctx.fillStyle = `rgba(255,255,255,${.05 + .03 * Math.sin(this.t + i * 2)})`; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 50, 0); ctx.lineTo(x + 140, SAND); ctx.lineTo(x + 40, SAND); ctx.fill(); }
      const R = G.seeded(4);
      for (let i = 0; i < 9; i++) { const x = 30 + R() * (W - 60), h = 80 + R() * 120, c = R() < .5 ? '#2a9a5a' : '#3ab86a'; ctx.strokeStyle = c; ctx.lineWidth = 7; ctx.lineCap = 'round';
        for (let b = 0; b < 3; b++) { ctx.beginPath(); ctx.moveTo(x + b * 9, SAND); for (let s = 1; s <= 6; s++) ctx.lineTo(x + b * 9 + Math.sin(this.t * 1.5 + s * .7 + i + b) * s * 3, SAND - h * s / 6 * (1 - b * .15)); ctx.stroke(); } }
      // castle
      ctx.fillStyle = '#8a8aa8'; ctx.fillRect(70, SAND - 120, 110, 120); ctx.fillRect(56, SAND - 160, 40, 160); ctx.fillRect(154, SAND - 160, 40, 160);
      for (const tx of [56, 154]) for (let k = 0; k < 3; k++) ctx.fillRect(tx + k * 15, SAND - 172, 10, 14);
      ctx.fillStyle = '#5a5a78'; ctx.beginPath(); ctx.arc(125, SAND - 34, 22, Math.PI, 0); ctx.lineTo(147, SAND); ctx.lineTo(103, SAND); ctx.fill();
      ctx.fillStyle = '#3a3a58'; ctx.fillRect(68, SAND - 130, 10, 18); ctx.fillRect(166, SAND - 130, 10, 18);
      // treasure chest
      G.rr(560, SAND - 34, 70, 36, 6, '#8a5a2a'); G.rr(556, SAND - 48, 78, 20, 8, '#a8743a'); ctx.fillStyle = '#ffcf5c'; ctx.fillRect(591, SAND - 40, 8, 12);
      if (Math.sin(this.t * .7) > .6) { ctx.fillStyle = 'rgba(255,230,120,.5)'; ctx.beginPath(); ctx.ellipse(595, SAND - 50, 30, 8, 0, 0, Math.PI * 2); ctx.fill(); }
      // sand
      ctx.fillStyle = '#e8d49a'; ctx.beginPath(); ctx.moveTo(0, TANK); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, SAND - 4 + Math.sin(x * .03) * 5); ctx.lineTo(W, TANK); ctx.fill();
      for (let i = 0; i < 40; i++) G.circle(R() * W, SAND + 2 + R() * 12, 2 + R() * 3, ['#c8b07a', '#f4e4b8', '#b0a080', '#d89a7a'][i % 4]);
      G.rr(706, SAND - 12, 26, 12, 4, '#4a4a5a');
    },
    draw(ctx, dt) {
      this.drawBack(ctx);
      for (const b of this.bubbles) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
      for (const p of this.food) { G.circle(p.x, p.y, 4.5, '#c8742a'); G.circle(p.x - 1, p.y - 1, 1.6, '#f4b46a'); }
      for (const d of this.drops) { const a = d.life < 2 ? (Math.sin(this.t * 20) > 0 ? .4 : 1) : 1; ctx.globalAlpha = a;
        if (d.val >= 40) { ctx.fillStyle = d.val >= 90 ? '#ff5b8b' : '#7ae8ff'; ctx.beginPath(); ctx.moveTo(d.x, d.y - 13); ctx.lineTo(d.x + 11, d.y - 3); ctx.lineTo(d.x, d.y + 12); ctx.lineTo(d.x - 11, d.y - 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(d.x - 4, d.y - 7, 4, 4); }
        else { const r = d.val >= 18 ? 12 : d.val >= 8 ? 10 : 8.5; G.circle(d.x, d.y, r, d.val >= 18 ? '#d8d8e8' : '#e8a82a'); G.circle(d.x, d.y, r * .7, d.val >= 18 ? '#f4f4ff' : '#ffd84a'); G.circle(d.x - r * .3, d.y - r * .3, r * .25, 'rgba(255,255,255,.8)'); }
        ctx.globalAlpha = 1; }
      if (this.snail) { const s = this.snail; ctx.save(); ctx.translate(s.x, SAND - 4); ctx.scale(s.dir, 1); G.rr(-18, -6, 34, 10, 5, '#d8b07a'); ctx.fillStyle = '#d8b07a'; ctx.fillRect(12, -16, 3, 10); ctx.fillRect(16, -14, 3, 8); G.circle(0, -14, 13, '#c45a8a'); ctx.strokeStyle = '#ffb0d0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, -14, 7, 0, Math.PI * 1.6); ctx.stroke(); ctx.restore(); }
      for (const f of this.fish) {
        const img = G.img(`img/fish_${f.f.k}.png`); if (!img.complete || !img.naturalWidth) continue;
        const w = f.f.size * (1 - f.born * .5), h = w * img.naturalHeight / img.naturalWidth, sq = 1 + Math.sin(this.t * 8 + f.wob) * .04;
        ctx.save(); ctx.translate(f.x, f.y + Math.sin(this.t * 2 + f.wob) * 3); ctx.scale(f.dir, sq); if (f.sick) ctx.filter = 'hue-rotate(70deg) saturate(.45) brightness(.85)'; ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
        if (f.hunger > .6 && !f.grabbed) { const bx = f.x + 18, by = f.y - h / 2 - 16; G.circle(bx, by, 12, f.sick ? '#ff9a9a' : '#ffffff'); G.circle(bx - 10, by + 12, 3, f.sick ? '#ff9a9a' : '#ffffff'); G.circle(bx - 2, by, 4, '#c8742a'); G.circle(bx + 4, by + 3, 3.5, '#c8742a'); }
      }
      const o = this.octo;
      if (o) { const tp = this.tip(), y0 = o.flee ? 30 - o.flee * 80 : 30, k = o.hit > 0 ? '#ff9ad0' : '#9a5ad8';
        ctx.strokeStyle = k; ctx.lineCap = 'round'; for (let i = -2; i <= 2; i++) { if (!i) continue; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(o.x + i * 14, y0 + 20); ctx.quadraticCurveTo(o.x + i * 30, y0 + 60, o.x + i * 26 + Math.sin(this.t * 4 + i) * 10, y0 + 80); ctx.stroke(); }
        ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(o.x, y0 + 20); ctx.quadraticCurveTo(o.x + Math.sin(this.t * 3) * 30, (y0 + tp.y) / 2, tp.x, o.flee && o.carry ? o.fish.y : tp.y); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(o.x, y0, 46, 38, 0, 0, Math.PI * 2); ctx.fillStyle = k; ctx.fill();
        for (const s of [-1, 1]) { G.circle(o.x + s * 16, y0 + 4, 11, '#fff'); G.circle(o.x + s * 16 + (tp.x > o.x ? 3 : -3), y0 + 7, 6, '#1a1030'); }
        ctx.strokeStyle = '#4a2068'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x - 22, y0 - 12); ctx.lineTo(o.x - 6, y0 - 6); ctx.moveTo(o.x + 22, y0 - 12); ctx.lineTo(o.x + 6, y0 - 6); ctx.stroke();
        if (!o.flee) { for (let i = 0; i < o.hp; i++) G.circle(o.x - (o.hp - 1) * 7 + i * 14, y0 - 50, 5, '#ff5b8b'); G.text('TAP IT!', o.x, y0 + 62, {size: 14, align: 'center', weight: 800, color: '#fff', shadow: true}); }
      }
      for (const s of this.dirt) { const R = G.seeded(Math.floor(s.s * 1000)); for (let i = 0; i < 6; i++) G.circle(s.x + (R() - .5) * s.r, s.y + (R() - .5) * s.r, s.r * (.4 + R() * .4), `rgba(${70 + R() * 40 | 0},${140 + R() * 40 | 0},${60 + R() * 30 | 0},.55)`); }
      G.fx(this.parts, dt);
      // glass edge and HUD
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, TANK - 6);
      G.rr(10, 10, 130, 36, 12, 'rgba(10,30,60,.6)'); G.circle(32, 28, 11, '#e8a82a'); G.circle(32, 28, 7.5, '#ffd84a'); G.text(`${this.coins}`, 50, 36, {size: 20, weight: 800, color: '#fff'});
      G.bar({x: 260, y: 14, w: 280, h: 18, v: Math.min(this.earned, this.goal), max: this.goal, color: '#ffd84a', label: `Goal ${this.earned}/${this.goal}`});
      G.rr(W - 96, 10, 86, 36, 12, 'rgba(10,30,60,.6)'); G.text(`${Math.ceil(Math.max(0, this.time))}s`, W - 53, 36, {size: 20, align: 'center', weight: 800, color: this.time < 20 ? '#ff8a8a' : '#fff'});
      if (this.t < 5 && !this.done) G.text('Click the water to feed · click coins to collect', W / 2, 70, {size: 16, align: 'center', weight: 800, color: '#fff', shadow: true});
      // shop
      G.rr(0, TANK, W, H - TANK, 0, '#1a2a44'); G.rr(0, TANK, W, 6, 0, '#3a5a84');
      for (let i = 0; i < 9; i++) {
        const bx = 10 + i * 87, by = TANK + 16, snail = i === 8, f = FISH[i], cost = snail ? SNAIL : f.cost, locked = !snail && i >= this.unlocked, ok = !locked && this.coins >= cost && !(snail && this.snail);
        G.rr(bx, by, 82, 84, 12, ok ? '#2e4e7a' : '#22334e');
        if (locked) { G.text('🔒', bx + 41, by + 40, {size: 24, align: 'center'}); G.text(`Day ${(i - 2) * 3}`, bx + 41, by + 70, {size: 11, align: 'center', weight: 800, color: '#7a8aa8'}); continue; }
        if (snail) { G.circle(bx + 41, by + 30, 16, '#c45a8a'); G.rr(bx + 22, by + 40, 40, 10, 5, '#d8b07a'); }
        else { const img = G.img(`img/fish_${f.k}.png`); if (img.complete && img.naturalWidth) ctx.drawImage(img, bx + 9, by + 6, 64, 45); }
        G.text(snail ? (this.snail ? 'Got it!' : 'Snail') : `+${f.val}`, bx + 41, by + 60, {size: 11, align: 'center', weight: 800, color: '#bcd4f4'});
        G.text(`${cost}`, bx + 41, by + 77, {size: 14, align: 'center', weight: 800, color: ok ? '#ffd84a' : '#7a8aa8'});
      }
    }
  });
})();

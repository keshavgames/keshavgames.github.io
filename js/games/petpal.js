(() => {
  // A pet to look after: feed it, play catch, wash it, put it to bed and dress it up. Pets, food, hats and toys are Blender renders. Saved in this browser.
  const W = 800, H = 540, SAVE = 'gamebox-petpal', FLOOR = 430, PX = 400;
  const PETS = [['sproutle', 'Sprout'], ['puddlet', 'Puddle'], ['emberpup', 'Ember'], ['bloomoth', 'Bloom'], ['pebblor', 'Pebble'], ['voltle', 'Zip'], ['frostling', 'Frosty'], ['gloomp', 'Gloomy']];
  const FOODS = ['apple', 'cookie', 'cupcake', 'carrot', 'broccoli'];
  const HATS = [['party', 20, 1], ['bow', 30, 1], ['cap', 40, 2], ['flower', 60, 3], ['tophat', 80, 4], ['crown', 120, 5], ['wizard', 150, 6]];
  const NEEDS = [['food', 'Food', '#ff9f43', .9], ['fun', 'Fun', '#ff7bd0', 1.1], ['clean', 'Clean', '#4aa8ff', .6], ['sleep', 'Energy', '#a07aff', .5]];
  const SAY = {food: "I'm hungry!", fun: 'Play with me!', clean: "I'm stinky!", sleep: 'So sleepy…'};
  const ASSETS = [...PETS.map(p => `img/mon_${p[0]}.png`), ...FOODS.map(f => `img/food_${f}.png`), ...HATS.map(h => `img/hat_${h[0]}.png`), 'img/toy_ball.png', 'img/toy_sponge.png'];
  const BTN = ['Feed', 'Play', 'Wash', 'Sleep', 'Dress'];
  const btnX = i => 20 + i * 154;

  GameBox.register({
    id: 'petpal', title: 'Pet Pal', genre: 'Simulation', kind: 'Virtual pet', w: W, h: H, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Pick a pet, then keep its four bars full: feed it, play catch, wash it and put it to bed. Click your pet to tickle it!',
    desc: 'Adopt one of eight little monsters and look after it. Feed it snacks (every pet has a favourite, and one food it hates), play Treat Catch to earn coins, scrub it clean with a soapy sponge and tuck it into bed. A happy pet grows and levels up, unlocking hats like a crown and a wizard hat. Your pet is saved in this browser and waits for you to come back.',
    controls: [['Click the buttons', 'Feed, play, wash, sleep, dress'], ['Click your pet', 'Tickle it'], ['Drag the sponge', 'Scrub it clean'], ['Mouse or ← →', 'Move in Treat Catch']],
    info() { const s = this.s; return s ? `${PETS[s.pet][1]} · Level ${s.lvl} · ${s.coins} coins` : 'Choose a pet'; },
    init() {
      let s = null; try { s = JSON.parse(localStorage.getItem(SAVE)); } catch {}
      this.heads = this.heads || {}; this.parts = []; this.t = 0; this.saveT = 3; this.foam = []; this.drops = []; this.fly = null; this.chomp = 0; this.shakeT = 0; this.tickle = 0; this.speech = null; this.sayT = 4; this.rinse = 0; this.tray = false; this.lvlT = 0;
      if (s && s.needs) { const away = Math.min(900, Math.max(0, (Date.now() - (s.t || Date.now())) / 1000)); for (const [k, , , r] of NEEDS) s.needs[k] = Math.max(15, s.needs[k] - away * r * .1); this.s = s; this.mode = 'room'; this.say(`Welcome back!`); }
      else { this.s = null; this.mode = 'pick'; }
    },
    persist() { if (this.s) { this.s.t = Date.now(); try { localStorage.setItem(SAVE, JSON.stringify(this.s)); } catch {} } },
    adopt(i) {
      const old = this.s; this.s = {pet: i, lvl: old?.lvl || 1, xp: old?.xp || 0, coins: old?.coins ?? 30, hats: old?.hats || [], hat: old?.hat || null, needs: {food: 70, fun: 70, clean: 80, sleep: 80}};
      this.mode = 'room'; this.persist(); G.party(); G.sfx('win', .5); this.say(`Hi! I'm ${PETS[i][1]}!`);
    },
    say(text) { this.speech = {text, t: 2.6}; },
    mood() { const n = this.s.needs; return (n.food + n.fun + n.clean + n.sleep) / 4; },
    fav() { return FOODS[this.s.pet % 5]; }, yuck() { return FOODS[(this.s.pet + 2) % 5]; },
    gainXp(v) {
      const s = this.s; s.xp += v; const need = 60 + s.lvl * 40;
      if (s.xp >= need) { s.xp -= need; s.lvl++; s.coins += 20; this.lvlT = 2.5; G.party(); G.sfx('win', .6); this.say(`Level ${s.lvl}! I grew!`); this.persist(); }
    },
    size() { return 300 * Math.min(1.3, 1 + (this.s.lvl - 1) * .03); },
    head(k) {
      if (this.heads[k]) return this.heads[k]; const img = G.img(`img/mon_${k}.png`); if (!img.complete || !img.naturalWidth) return null;
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 256, 256);
      const d = x.getImageData(0, 0, 256, 256).data; let top = 0, sx = 0, cnt = 0;
      for (let y = 0; y < 256 && !top; y++) { let n = 0; for (let i = 50; i < 206; i++) if (d[(y * 256 + i) * 4 + 3] > 160) n++; if (n > 44) top = y; }
      for (let y = top; y < top + 30; y++) for (let i = 0; i < 256; i++) if (d[(y * 256 + i) * 4 + 3] > 160) { sx += i; cnt++; }
      return (this.heads[k] = {top, cx: cnt ? sx / cnt : 128});
    },
    base() { return FLOOR + 14 + this.size() * .18; },
    petBox() { const sz = this.size(), b = this.base(); return {x: PX - sz * .32, y: b - sz * .8, w: sz * .64, h: sz * .66}; },
    feed(f) {
      if (this.fly || this.chomp > 0) return; const i = FOODS.indexOf(f);
      this.fly = {f, x: 120 + i * 120, y: 480, t: 0}; G.sfx('swing', .3);
    },
    eat(f) {
      const n = this.s.needs;
      if (f === this.yuck()) { this.shakeT = .6; this.say(`Bleh! No ${f}!`); G.sfx('lose', .3); G.burst(this.parts, PX, FLOOR - 120, '#8a8a6a', 10, 160); return; }
      this.chomp = .9; const fav = f === this.fav();
      n.food = Math.min(100, n.food + (fav ? 45 : f === 'cupcake' ? 35 : 28)); if (fav) n.fun = Math.min(100, n.fun + 10); if (f === 'cupcake') n.clean = Math.max(0, n.clean - 6);
      this.gainXp(fav ? 12 : 6); this.say(fav ? `Yum! ${f[0].toUpperCase() + f.slice(1)} is my favourite!` : 'Yum!');
      for (let k = 0; k < (fav ? 8 : 3); k++) G.popText(this.parts, PX + (Math.random() - .5) * 120, FLOOR - 160 - Math.random() * 40, '♥', '#ff5b8b', 22);
    },
    startPlay() { this.mode = 'play'; this.game = {x: PX, items: [], time: 25, coins: 0, caught: 0, spawn: .5, stun: 0, over: 0}; this.tray = false; G.sfx('power', .5); },
    wake() { this.mode = 'room'; this.say('Good morning!'); G.sfx('select', .4); },
    pointer(type, x, y) {
      if (this.mode === 'pick') { if (type === 'down') PETS.forEach((p, i) => { const bx = 70 + (i % 4) * 172, by = 110 + Math.floor(i / 4) * 200; if (x > bx && x < bx + 150 && y > by && y < by + 180) this.adopt(i); }); return; }
      if (this.mode === 'play') { this.game.px = x; return; }
      if (this.mode === 'wash') {
        if (type === 'down' && y > 450) { if (x > 600) { this.mode = 'room'; this.foam = []; } else if (x > 420) { this.rinse = 1.4; G.sfx('splash', .5); } return; }
        if (G.pointer.down && type === 'move') { const b = this.petBox(); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && this.foam.length < 140) {
          this.foam.push({x: x - PX, y: y - FLOOR, r: 7 + Math.random() * 9}); const n = this.s.needs; n.clean = Math.min(100, n.clean + .7); this.gainXp(.08);
          if (Math.random() < .25) G.note(900 + Math.random() * 700, .05, {type: 'sine', vol: .05}); } }
        return;
      }
      if (type !== 'down') return;
      if (this.mode === 'sleep') { if (y > 450) this.wake(); return; }
      if (this.mode === 'dress') {
        if (y > 450) { if (x > 600) this.mode = 'room'; else if (x > 380) { this.mode = 'pick'; } return; }
        ['none', ...HATS.map(h => h[0])].forEach((h, i) => { const bx = 60 + (i % 4) * 176, by = 90 + Math.floor(i / 4) * 170; if (x < bx || x > bx + 160 || y < by || y > by + 150) return;
          const s = this.s; if (h === 'none') { s.hat = null; return G.sfx('click', .4); }
          const [, cost, lv] = HATS[i - 1]; if (s.hats.includes(h)) { s.hat = h; G.sfx('select', .5); }
          else if (s.lvl >= lv && s.coins >= cost) { s.coins -= cost; s.hats.push(h); s.hat = h; G.sfx('coin', .6); G.party(); }
          else G.sfx('hit', .3); this.persist(); });
        return;
      }
      if (this.tray) { if (y > 450) { const i = Math.floor((x - 60) / 120); if (x > 680) this.tray = false; else if (i >= 0 && i < 5) this.feed(FOODS[i]); } return; }
      if (y > 450) { const i = BTN.findIndex((b, i) => x > btnX(i) && x < btnX(i) + 140); if (i < 0) return; G.sfx('click', .4);
        if (i === 0) this.tray = true; if (i === 1) this.startPlay(); if (i === 2) this.mode = 'wash'; if (i === 3) { this.mode = 'sleep'; this.say('Night night…'); } if (i === 4) this.mode = 'dress'; return; }
      const b = this.petBox(); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && this.tickle <= 0) {
        this.tickle = .35; const n = this.s.needs; n.fun = Math.min(100, n.fun + 3); this.gainXp(1.5); G.popText(this.parts, x, y - 20, '♥', '#ff5b8b', 20);
        [660, 880, 1100].forEach((f, k) => G.note(f + Math.random() * 80, .07, {type: 'triangle', vol: .08, when: k * .06}));
        if (Math.random() < .08) { this.s.coins++; G.popText(this.parts, x, y - 50, '+1 coin', '#ffd84a', 16); }
        if (Math.random() < .2) this.say(G.pick(['Hee hee!', 'That tickles!', 'Again!', 'I love you!']));
      }
    },
    key(k) { if (this.mode === 'sleep' && (k === ' ' || k === 'Enter')) this.wake(); },
    updPlay(dt) {
      const g = this.game; g.over = Math.max(0, g.over - dt);
      if (g.time <= 0) { if (g.over <= 0) { this.mode = 'room'; this.s.coins += g.coins; const n = this.s.needs; n.fun = Math.min(100, n.fun + Math.min(45, 10 + g.caught * 2)); n.sleep = Math.max(0, n.sleep - 8); this.gainXp(10 + g.caught); this.say(`I caught ${g.caught}! +${g.coins} coins`); this.persist(); } return; }
      if ((g.time -= dt) <= 0) { g.over = 2.2; G.sfx('win', .5); return; }
      g.stun = Math.max(0, g.stun - dt);
      const keys = (G.held('ArrowRight', 'd') ? 1 : 0) - (G.held('ArrowLeft', 'a') ? 1 : 0);
      if (keys) { g.x += keys * 420 * dt; g.px = null; } else if (g.px != null) g.x += (g.px - g.x) * Math.min(1, dt * 10);
      if (g.stun > 0) g.x -= 0; g.x = Math.max(60, Math.min(W - 60, g.x));
      const speed = 1 + (25 - g.time) / 25;
      if ((g.spawn -= dt) <= 0) { g.spawn = Math.max(.32, .7 - (25 - g.time) * .015); const r = Math.random(); g.items.push({x: 40 + Math.random() * (W - 80), y: -20, v: (150 + Math.random() * 80) * speed, k: r < .12 ? 'gold' : r < .3 ? 'sock' : r < .6 ? 'cookie' : 'star', spin: Math.random() * 6}); }
      for (const it of g.items) { it.y += it.v * dt; it.spin += dt * 3;
        if (!it.got && it.y > FLOOR - 120 && it.y < FLOOR - 30 && Math.abs(it.x - g.x) < 62 && g.stun <= 0) { it.got = true;
          if (it.k === 'sock') { g.stun = 1; G.sfx('hurt', .4); G.shake(5); G.popText(this.parts, it.x, it.y - 20, 'Stinky!', '#9a9a6a', 18); }
          else { g.caught++; const c = it.k === 'gold' ? 5 : it.k === 'star' ? 1 : 0; g.coins += c; G.sfx('coin', .3); G.popText(this.parts, it.x, it.y - 20, c ? `+${c}` : '♥', c ? '#ffd84a' : '#ff5b8b', 18); } } }
      g.items = g.items.filter(it => !it.got && it.y < H + 30);
    },
    update(dt) {
      this.t += dt; const s = this.s; if (!s) return;
      this.lvlT = Math.max(0, this.lvlT - dt); this.tickle -= dt; this.shakeT = Math.max(0, this.shakeT - dt);
      if (this.speech && (this.speech.t -= dt) <= 0) this.speech = null;
      if (this.mode === 'play') return this.updPlay(dt);
      const asleep = this.mode === 'sleep', n = s.needs;
      for (const [k, , , r] of NEEDS) { if (k === 'sleep' && asleep) n.sleep = Math.min(100, n.sleep + 9 * dt); else n[k] = Math.max(0, n[k] - r * dt * (asleep ? .3 : 1)); }
      if (asleep && n.sleep >= 100) this.wake();
      if (this.mood() > 60) this.gainXp(dt * 1.2);
      if (this.fly) { const f = this.fly; f.t += dt / .45; if (f.t >= 1) { this.fly = null; this.eat(f.f); } }
      if (this.chomp > 0) { const b = Math.floor(this.chomp / .3); this.chomp -= dt; if (Math.floor(Math.max(0, this.chomp) / .3) !== b) G.sfx('crunch', .35); }
      if (this.rinse > 0) { this.rinse -= dt; for (let i = 0; i < 4; i++) this.drops.push({x: PX + (Math.random() - .5) * 220, y: 60 + Math.random() * 30, v: 500 + Math.random() * 200}); if (this.foam.length) this.foam.splice(0, Math.ceil(this.foam.length * dt * 3)); if (this.rinse <= 0) { this.foam = []; n.clean = Math.min(100, n.clean + 15); this.say('Squeaky clean!'); G.sfx('win', .4); } }
      for (const d of this.drops) d.y += d.v * dt; this.drops = this.drops.filter(d => d.y < FLOOR);
      if ((this.sayT -= dt) <= 0) { this.sayT = 7; const low = NEEDS.filter(([k]) => n[k] < 30).sort((a, b) => n[a[0]] - n[b[0]])[0]; if (low && !asleep && !this.speech) this.say(SAY[low[0]]); }
      if ((this.saveT -= dt) <= 0) { this.saveT = 3; this.persist(); }
    },
    drawPet(ctx, x, base, size, sq = 0, rot = 0) {
      const k = PETS[this.s.pet][0], img = G.img(`img/mon_${k}.png`); if (!img.complete || !img.naturalWidth) return;
      const w = size * (1 + sq), h = size * (1 - sq);
      ctx.save(); ctx.translate(x, base); ctx.rotate(rot); ctx.drawImage(img, -w / 2, -h, w, h);
      const hd = this.head(k), hat = this.s.hat;
      if (hd && hat) { const hi = G.img(`img/hat_${hat}.png`); if (hi.complete && hi.naturalWidth) { const hw = size * (hat === 'flower' || hat === 'bow' ? .4 : .36), hh = hw * hi.naturalHeight / hi.naturalWidth; ctx.drawImage(hi, -w / 2 + hd.cx / 256 * w - hw / 2, -h + hd.top / 256 * h - hh * (hat === 'bow' || hat === 'flower' ? .55 : .78), hw, hh); } }
      ctx.restore();
    },
    room(ctx, night) {
      const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, '#ffe6f2'); g.addColorStop(1, '#ffd2e6'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, FLOOR);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 48) ctx.fillRect(x, 0, 18, FLOOR);
      G.rr(54, 84, 190, 150, 10, '#fff'); const sky = ctx.createLinearGradient(0, 94, 0, 224); sky.addColorStop(0, night ? '#0c1030' : '#7ac8ff'); sky.addColorStop(1, night ? '#2a2a60' : '#d8f0ff'); ctx.fillStyle = sky; ctx.fillRect(64, 94, 170, 130);
      if (night) { G.circle(190, 130, 18, '#fff6c0'); G.circle(198, 124, 15, '#0c1030'); for (let i = 0; i < 10; i++) G.circle(74 + (i * 53) % 150, 104 + (i * 37) % 100, 1.5, '#fff'); }
      else { G.circle(200, 125, 20, '#ffe27a'); for (const [cx, cy] of [[110, 150], [150, 190]]) { G.circle(cx + Math.sin(this.t * .3) * 10, cy, 16, '#fff'); G.circle(cx + 18 + Math.sin(this.t * .3) * 10, cy + 4, 13, '#fff'); } }
      ctx.fillStyle = '#fff'; ctx.fillRect(146, 94, 6, 130); ctx.fillRect(64, 156, 170, 6);
      G.rr(560, 90, 120, 96, 8, '#c8946a'); G.rr(570, 100, 100, 76, 4, '#ffeef6'); G.text('♥', 620, 152, {size: 40, align: 'center', color: '#ff7bb0'});
      G.rr(560, 250, 190, 12, 4, '#c8946a'); const ball = G.img('img/toy_ball.png'); if (ball.complete && ball.naturalWidth) ctx.drawImage(ball, 590, 206, 46, 46);
      ctx.fillStyle = '#d8a070'; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 90) ctx.fillRect(x, FLOOR, 3, H - FLOOR);
      ctx.fillStyle = '#ff9fc8'; ctx.beginPath(); ctx.ellipse(PX, FLOOR + 14, 200, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffb8d8'; ctx.beginPath(); ctx.ellipse(PX, FLOOR + 14, 160, 15, 0, 0, Math.PI * 2); ctx.fill();
    },
    bars(ctx) {
      const s = this.s; NEEDS.forEach(([k, label, col], i) => G.bar({x: 18 + i * 196, y: 14, w: 180, h: 20, v: s.needs[k], max: 100, color: s.needs[k] < 30 ? '#ff5b5b' : col, label}));
      G.text(`${PETS[s.pet][1]} · Level ${s.lvl}`, 20, 62, {size: 18, weight: 800, color: '#7a3a5a'}); G.bar({x: 20, y: 70, w: 160, h: 8, v: s.xp, max: 60 + s.lvl * 40, color: '#ffcf5c'});
      G.circle(W - 110, 56, 11, '#e8a82a'); G.circle(W - 110, 56, 7.5, '#ffd84a'); G.text(`${s.coins}`, W - 92, 63, {size: 20, weight: 800, color: '#7a3a5a'});
    },
    buttons(ctx, labels, icons) {
      G.rr(0, 444, W, H - 444, 0, '#7a4a8a');
      labels.forEach((l, i) => { if (!l) return; const x = l.x ?? btnX(i), w = l.w ?? 140; G.rr(x, 452, w, 78, 14, l.c || '#a06ab8'); G.rr(x, 452, w, 6, 4, 'rgba(255,255,255,.25)');
        const ic = icons && icons[i] && G.img(icons[i]); if (ic && ic.complete && ic.naturalWidth) { const k = 42 / Math.max(ic.naturalWidth, ic.naturalHeight); ctx.drawImage(ic, x + w / 2 - ic.naturalWidth * k / 2, 458, ic.naturalWidth * k, ic.naturalHeight * k); }
        G.text(l.t, x + w / 2, l.big ? 498 : 520, {size: l.big ? 22 : 15, align: 'center', weight: 800, color: '#fff'}); });
    },
    draw(ctx, dt) {
      if (this.mode === 'pick') {
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe6f2'); g.addColorStop(1, '#e6e0ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        G.text('Choose your pet!', W / 2, 70, {size: 36, align: 'center', display: true, color: '#7a3a8a'});
        PETS.forEach(([k, name], i) => { const bx = 70 + (i % 4) * 172, by = 110 + Math.floor(i / 4) * 200, hov = G.pointer.x > bx && G.pointer.x < bx + 150 && G.pointer.y > by && G.pointer.y < by + 180; G.rr(bx, by, 150, 180, 18, hov ? '#fff' : 'rgba(255,255,255,.7)');
          const img = G.img(`img/mon_${k}.png`); if (img.complete) ctx.drawImage(img, bx + 5, by + 2 + (hov ? Math.sin(this.t * 8) * 4 : 0), 140, 140); G.text(name, bx + 75, by + 164, {size: 18, align: 'center', weight: 800, color: '#7a3a8a'}); });
        return;
      }
      const s = this.s, n = s.needs, night = this.mode === 'sleep';
      if (this.mode === 'play') return this.drawPlay(ctx, dt);
      this.room(ctx, night);
      const sz = this.size(), mood = this.mood(), base = this.base();
      let sq = Math.sin(this.t * (mood > 50 ? 4 : 1.6)) * (mood > 50 ? .04 : .02), rot = 0, lift = mood > 70 ? Math.abs(Math.sin(this.t * 3)) * 10 : 0;
      if (this.chomp > 0) sq = Math.sin(this.chomp * Math.PI / .3) * .1;
      if (this.tickle > 0) { sq = Math.sin(this.tickle * 30) * .08; lift = 14; }
      if (this.shakeT > 0) rot = Math.sin(this.shakeT * 40) * .12;
      if (night) { sq = .06 + Math.sin(this.t * 1.5) * .03; lift = 0; }
      if (this.lvlT > 0) lift = Math.abs(Math.sin(this.lvlT * 6)) * 30;
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(PX, FLOOR + 14, sz * .3, 12, 0, 0, Math.PI * 2); ctx.fill();
      this.drawPet(ctx, PX, base - lift, sz, sq, rot);
      // dirt, stink lines and foam sit on top of the pet
      if (n.clean < 55) { const R = G.seeded(s.pet * 7 + 3), k = Math.ceil((55 - n.clean) / 55 * 9); for (let i = 0; i < k; i++) G.circle(PX + (R() - .5) * sz * .45, base - lift - sz * (.2 + R() * .4), 6 + R() * 8, 'rgba(110,80,40,.55)'); }
      if (n.clean < 30) { ctx.strokeStyle = 'rgba(120,160,60,.7)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const x = PX - 60 + i * 60; ctx.beginPath(); for (let y = 0; y < 50; y += 5) ctx.lineTo(x + Math.sin(y * .2 + this.t * 4 + i) * 6, base - sz * .85 - y - (this.t * 20 % 20)); ctx.stroke(); } }
      for (const f of this.foam) { G.circle(PX + f.x, FLOOR + f.y, f.r, 'rgba(255,255,255,.92)'); G.circle(PX + f.x - f.r * .3, FLOOR + f.y - f.r * .3, f.r * .3, 'rgba(200,230,255,.9)'); }
      for (const d of this.drops) { ctx.fillStyle = 'rgba(120,190,255,.8)'; ctx.fillRect(d.x, d.y, 3, 12); }
      if (mood < 30 && !night) for (const sx of [-1, 1]) { const y = base - sz * .55 + (this.t * 40 % 30); G.circle(PX + sx * sz * .14, y, 5, 'rgba(90,170,255,.85)'); }
      if (mood > 75 && !night && Math.sin(this.t * 2) > .3) G.star(PX + Math.cos(this.t) * sz * .45, base - sz * .7 + Math.sin(this.t * 1.3) * 30, 8, '#ffd84a');
      if (this.fly) { const f = this.fly, x = f.x + (PX - f.x) * f.t, y = f.y + (base - sz * .5 - f.y) * f.t - Math.sin(f.t * Math.PI) * 120, img = G.img(`img/food_${f.f}.png`); if (img.complete) ctx.drawImage(img, x - 32, y - 32, 64, 64); }
      if (night) { ctx.fillStyle = 'rgba(10,10,50,.55)'; ctx.fillRect(0, 0, W, 444); for (let i = 0; i < 3; i++) { const p = (this.t * .5 + i / 3) % 1; G.text('z', PX + 60 + p * 60, base - sz * .7 - p * 90, {size: 18 + p * 24, weight: 800, color: `rgba(255,255,255,${1 - p})`}); } }
      G.fx(this.parts, dt);
      if (this.speech) { const t = this.speech.text, w = Math.max(120, t.length * 10 + 30), x = PX + sz * .25, y = base - sz - 10; G.rr(x, y - 34, w, 42, 18, '#fff'); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 18, y + 6); ctx.lineTo(x + 8, y + 22); ctx.lineTo(x + 34, y + 6); ctx.fill(); G.text(t, x + w / 2, y - 7, {size: 16, align: 'center', weight: 800, color: '#7a3a5a'}); }
      if (this.lvlT > 0) G.text(`LEVEL ${s.lvl}!`, W / 2, 140, {size: 44, align: 'center', display: true, color: '#ffcf5c', shadow: true});
      this.bars(ctx);
      if (this.mode === 'dress') return this.drawDress(ctx);
      if (this.mode === 'wash') return this.buttons(ctx, [{t: 'Scrub your pet with the sponge!', x: 20, w: 390, c: '#5a8ad8', big: true}, {t: 'Rinse', x: 420, w: 170, c: '#4aa8ff'}, {t: 'Done', x: 600, w: 180, c: '#3fc060'}], [null, null, null]), this.sponge(ctx);
      if (night) return this.buttons(ctx, [{t: 'Wake up', x: 300, w: 200, c: '#5a5ab8', big: true}]);
      if (this.tray) {
        G.rr(0, 444, W, H - 444, 0, '#7a4a8a');
        FOODS.forEach((f, i) => { const x = 60 + i * 120, img = G.img(`img/food_${f}.png`); G.rr(x, 452, 110, 78, 14, f === this.fav() ? '#e8a84a' : '#a06ab8'); if (img.complete) ctx.drawImage(img, x + 27, 454, 56, 56); G.text(f === this.fav() ? '★ ' + f : f, x + 55, 522, {size: 13, align: 'center', weight: 800, color: '#fff'}); });
        G.rr(690, 452, 96, 78, 14, '#5a3a6a'); G.text('Back', 738, 498, {size: 18, align: 'center', weight: 800, color: '#fff'}); return;
      }
      this.buttons(ctx, BTN.map((t, i) => ({t, c: ['#e88a4a', '#e85a9a', '#4a9ae8', '#7a5ad8', '#3ab88a'][i]})), ['img/food_apple.png', 'img/toy_ball.png', 'img/toy_sponge.png', null, 'img/hat_party.png']);
      G.circle(btnX(3) + 70, 480, 16, '#fff6c0'); G.circle(btnX(3) + 78, 474, 14, '#7a5ad8');
      for (const [k, , , ] of NEEDS) if (n[k] < 30) { const i = {food: 0, fun: 1, clean: 2, sleep: 3}[k]; if (Math.sin(this.t * 6) > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(btnX(i) - 3, 449, 146, 84); } }
    },
    sponge(ctx) { const img = G.img('img/toy_sponge.png'); if (img.complete && G.pointer.y < 444) ctx.drawImage(img, G.pointer.x - 40, G.pointer.y - 30, 80, 60); },
    drawDress(ctx) {
      ctx.fillStyle = 'rgba(60,30,80,.75)'; ctx.fillRect(0, 84, W, 360); const s = this.s;
      ['none', ...HATS.map(h => h[0])].forEach((h, i) => { const bx = 60 + (i % 4) * 176, by = 90 + Math.floor(i / 4) * 170, own = h === 'none' || s.hats.includes(h), on = (s.hat || 'none') === h;
        G.rr(bx, by, 160, 150, 16, on ? '#ffcf5c' : own ? '#fff' : 'rgba(255,255,255,.55)');
        if (h === 'none') G.text('No hat', bx + 80, by + 82, {size: 18, align: 'center', weight: 800, color: '#7a3a5a'});
        else { const img = G.img(`img/hat_${h}.png`); if (img.complete && img.naturalWidth) { const k = 96 / Math.max(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, bx + 80 - img.naturalWidth * k / 2, by + 60 - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); }
          const [, cost, lv] = HATS[i - 1]; G.text(own ? (on ? 'Wearing' : 'Wear') : s.lvl < lv ? `🔒 Level ${lv}` : `${cost} coins`, bx + 80, by + 136, {size: 15, align: 'center', weight: 800, color: !own && s.lvl >= lv && s.coins >= cost ? '#c8742a' : '#7a3a5a'}); } });
      this.buttons(ctx, [{t: 'Pick a hat!', x: 20, w: 350, c: '#a06ab8', big: true}, {t: 'Swap pet', x: 380, w: 210, c: '#5a8ad8', big: true}, {t: 'Done', x: 600, w: 180, c: '#3fc060', big: true}]);
    },
    drawPlay(ctx, dt) {
      const g = this.game, sky = ctx.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#8ad0ff'); sky.addColorStop(1, '#e0f4ff'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) { const x = (i * 230 + this.t * 12) % (W + 120) - 60; G.circle(x, 80 + i * 30, 26, '#fff'); G.circle(x + 30, 86 + i * 30, 20, '#fff'); }
      ctx.fillStyle = '#7ccd5a'; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = '#5ab84a'; for (let x = 0; x < W; x += 16) ctx.fillRect(x, FLOOR, 8, 6);
      for (const it of g.items) {
        if (it.k === 'star' || it.k === 'gold') G.star(it.x, it.y, it.k === 'gold' ? 20 : 14, it.k === 'gold' ? '#ffb000' : '#ffe27a');
        else if (it.k === 'cookie') { const img = G.img('img/food_cookie.png'); if (img.complete) ctx.drawImage(img, it.x - 22, it.y - 22, 44, 44); }
        else { ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(Math.sin(it.spin) * .5); G.rr(-10, -22, 20, 30, 6, '#d8d8c0'); G.rr(-10, 0, 34, 16, 8, '#d8d8c0'); ctx.fillStyle = '#c84a4a'; ctx.fillRect(-10, -22, 20, 6); ctx.restore(); ctx.strokeStyle = 'rgba(120,150,60,.7)'; ctx.lineWidth = 2; for (const o of [-8, 8]) { ctx.beginPath(); ctx.moveTo(it.x + o, it.y - 28); ctx.quadraticCurveTo(it.x + o + 6, it.y - 38, it.x + o, it.y - 48); ctx.stroke(); } }
      }
      const st = g.stun > 0; this.drawPet(ctx, g.x, FLOOR + 41 - (st ? 0 : Math.abs(Math.sin(this.t * 10)) * 4), 150, st ? .08 : 0, st ? Math.sin(this.t * 30) * .15 : 0);
      if (st) G.text('✦ ✦', g.x, FLOOR - 140, {size: 20, align: 'center', color: '#ffd84a'});
      G.fx(this.parts, dt);
      G.rr(16, 14, 210, 40, 12, 'rgba(255,255,255,.8)'); G.text(`Caught ${g.caught} · ${g.coins} coins`, 121, 40, {size: 17, align: 'center', weight: 800, color: '#7a3a5a'});
      G.rr(W - 110, 14, 94, 40, 12, 'rgba(255,255,255,.8)'); G.text(`${Math.ceil(Math.max(0, g.time))}s`, W - 63, 42, {size: 22, align: 'center', weight: 800, color: g.time < 6 ? '#e84a5a' : '#7a3a5a'});
      if (g.time > 22) G.text('Catch stars and cookies! Dodge the stinky socks!', W / 2, 110, {size: 20, align: 'center', weight: 800, color: '#fff', shadow: true});
      if (g.time <= 0) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, W, H); G.text(`Great catch! +${g.coins} coins`, W / 2, H / 2, {size: 40, align: 'center', display: true, color: '#ffcf5c', shadow: true}); }
    }
  });
})();

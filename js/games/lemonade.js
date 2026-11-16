(() => {
  // Plan a lemonade recipe and price for the weather, then serve the queue as fast as you can. Kids and monsters are Blender renders.
  const W = 800, H = 540, FEET = 432, STAND = 520, DAY = 50, CUPS = 8;
  const WEATHER = [
    {k: 'hot', label: 'Hot and sunny', temp: 34, demand: 1, pay: 5, ice: 5, best: 100},
    {k: 'sunny', label: 'Sunny', temp: 26, demand: .8, pay: 4, ice: 3, best: 72},
    {k: 'cloudy', label: 'Cloudy', temp: 19, demand: .62, pay: 3.5, ice: 2, best: 40},
    {k: 'rain', label: 'Rainy', temp: 14, demand: .48, pay: 3, ice: 0, best: 24}];
  const MONS = ['sproutle', 'puddlet', 'emberpup', 'bloomoth', 'pebblor', 'voltle', 'frostling', 'gloomp'];
  const ASSETS = ['img/lemon.png', 'img/sugar.png', 'img/ice.png', 'img/pitcher.png', 'img/cup_lemonade.png', 'img/kid_idle.png', ...[0, 1, 2, 3].map(i => `img/kid_run${i}.png`), ...MONS.map(m => `img/mon_${m}.png`)];
  const ROWS = [['lemons', 'Lemons', 'img/lemon.png', 1, 6], ['sugar', 'Sugar', 'img/sugar.png', 1, 6], ['ice', 'Ice', 'img/ice.png', 0, 6], ['price', 'Price per cup', null, 1, 6], ['pitchers', 'Pitchers to make', 'img/pitcher.png', 1, 8]];
  const TIPS = {hot: 'Hot days: people want lots of ice and will pay more!', sunny: 'Nice day! Keep lemons and sugar about the same.', cloudy: 'Cooler today. Not much ice, a fair price.', rain: 'Rainy days: few people, so keep it cheap and skip the ice.'};

  GameBox.register({
    id: 'lemonade', title: 'Lemonade Stand', genre: 'Simulation', kind: 'Shop tycoon', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Check the weather, pick your recipe and price, then click POUR fast to serve everyone in line!',
    desc: 'Run your own lemonade stand. Each morning, look at the weather and choose how many lemons, how much sugar and ice go in each pitcher, what to charge and how many pitchers to make. Then open up and pour cups as fast as you can while kids and monsters line up. Happy customers tell their friends; too sour, too sweet or too pricey and they walk away. Make the day\'s profit goal for thirty days.',
    controls: [['+ / - buttons', 'Plan the recipe'], ['Space / POUR button', 'Serve the next customer'], ['M / Mix button', 'Mix a new pitcher']],
    info() { return this.phase === 'plan' ? `Day ${G.level} · Goal: ${this.goal} coins profit` : `Day ${G.level} · Profit ${this.earned - this.spent}/${this.goal}`; },
    init() {
      const n = G.level, R = G.seeded(n * 31 + 7);
      this.wx = n <= 2 ? WEATHER[1] : n === 3 ? WEATHER[0] : WEATHER[Math.floor(R() * 4)];
      this.goal = Math.max(5, Math.round(this.wx.best * (.12 + n * .02)));
      this.money = 22 + n * 2; this.plan = {lemons: 3, sugar: 3, ice: 2, price: 2, pitchers: 3};
      this.phase = 'plan'; this.t = 0; this.parts = []; this.done = null; this.drops = [];
    },
    cost() { const p = this.plan; return 1 + p.lemons + Math.ceil(p.sugar / 2) + Math.ceil(p.ice / 3); },
    taste() { const p = this.plan, w = this.wx; return 1 - Math.abs(p.lemons - p.sugar) * .14 - Math.abs(p.lemons + p.sugar - 7) * .07 - Math.abs(p.ice - w.ice) * .09; },
    open() {
      const total = this.cost() * this.plan.pitchers; if (total > this.money) return G.sfx('hit', .4);
      this.spent = total; this.earned = 0; this.sold = 0; this.left = this.plan.pitchers - 1; this.cups = CUPS; this.rep = 0;
      this.time = DAY; this.walkers = []; this.spawn = .3; this.pour = 0; this.mix = 0; this.lost = 0; this.yum = 0; this.wid = 0;
      this.phase = 'sell'; G.sfx('power', .5);
    },
    queue() { return this.walkers.filter(c => c.state === 'queue').sort((a, b) => a.joined - b.joined); },
    serve() {
      if (this.phase !== 'sell' || this.pour > 0 || this.mix > 0) return; const q = this.queue()[0]; if (!q || q.slot !== 0 || Math.abs(q.x - q.tx) > 6) return;
      if (this.cups <= 0) { G.popText(this.parts, STAND, 280, this.left > 0 ? 'Mix a new pitcher!' : 'Sold out!', '#ff8a8a', 18); return G.sfx('hit', .3); }
      this.pour = .32; this.cups--; this.sold++; this.earned += this.plan.price; G.score += this.plan.price * 10; G.sfx('splash', .3);
      const tq = this.taste(), cheap = this.plan.price <= this.wx.pay - 1;
      q.state = 'leave'; q.dir = 1; q.cup = true;
      if (tq > .72) { this.rep = Math.min(1.5, this.rep + .12); this.yum++; q.say = G.pick(cheap ? ['Yum! Cheap too!', 'So good!'] : ['Yum!', 'Perfect!', 'Refreshing!']); }
      else { this.rep = Math.max(-1, this.rep - .06); const p = this.plan; q.say = p.lemons - p.sugar > 1 ? 'Too sour!' : p.sugar - p.lemons > 1 ? 'Too sweet!' : p.ice < this.wx.ice - 1 ? 'Needs ice!' : p.ice > this.wx.ice + 1 ? 'Too cold!' : p.lemons + p.sugar < 5 ? 'Too watery!' : 'Too strong!'; }
      q.sayT = 1.6; G.popText(this.parts, STAND - 40, 300, `+${this.plan.price}`, '#ffd84a', 20); setCoin(this);
    },
    mixPitcher() { if (this.phase !== 'sell' || this.mix > 0 || this.cups > 0 || this.left <= 0) return; this.mix = 1.2; this.left--; G.sfx('swing', .4); },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (this.phase === 'plan') {
        ROWS.forEach(([k, , , lo, hi], i) => { const y0 = 150 + i * 56; if (y > y0 && y < y0 + 44) { if (x > 470 && x < 520) this.plan[k] = Math.max(lo, this.plan[k] - 1); if (x > 600 && x < 650) this.plan[k] = Math.min(hi, this.plan[k] + 1); G.sfx('click', .3); } });
        if (x > 250 && x < 550 && y > 452 && y < 530) this.open();
        return;
      }
      if (this.phase === 'sell') {
        if (y > 452) { if (x > 250 && x < 470) this.serve(); if (x > 490 && x < 690) this.mixPitcher(); return; }
        const q = this.queue()[0]; if (q && Math.abs(x - q.x) < 50 && y > FEET - 130) this.serve();
      }
    },
    key(k) { if (k === ' ' || k === 'Enter') this.serve(); if (k === 'm') this.mixPitcher(); },
    update(dt) {
      this.t += dt;
      if (this.wx.k === 'rain') { for (let i = 0; i < 3; i++) this.drops.push({x: Math.random() * (W + 100), y: -10}); for (const d of this.drops) { d.y += 700 * dt; d.x -= 120 * dt; } this.drops = this.drops.filter(d => d.y < FEET); }
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.phase !== 'sell') return;
      this.pour = Math.max(0, this.pour - dt); if (this.mix > 0 && (this.mix -= dt) <= 0) { this.cups = CUPS; G.sfx('select', .4); }
      if ((this.time -= dt) <= 0 || (this.cups <= 0 && this.left <= 0 && !this.mix)) return this.close();
      if ((this.spawn -= dt) <= 0) { this.spawn = .85 + Math.random() * .6; const fromLeft = Math.random() < .6, mon = Math.random() < .35;
        this.walkers.push({id: this.wid++, x: fromLeft ? -60 : W + 60, dir: fromLeft ? 1 : -1, sp: 90 + Math.random() * 50, state: 'walk', mon: mon ? G.pick(MONS) : null, tint: Math.floor(Math.random() * 5), decided: false, pat: 0, sayT: 0}); }
      const q = this.queue(); q.forEach((c, i) => { c.slot = i; c.tx = STAND - 70 - i * 70; });
      for (const c of this.walkers) {
        c.sayT = Math.max(0, c.sayT - dt);
        if (c.state === 'walk') {
          c.x += c.dir * c.sp * dt;
          if (!c.decided && (c.dir > 0 ? c.x > STAND - 470 : c.x < STAND + 180)) { c.decided = true; const pf = Math.max(0, Math.min(1, (this.wx.pay + this.rep - this.plan.price + 1) / 3)), want = this.wx.demand * pf * (1 + this.rep * .25);
            if (Math.random() < want && q.length < 5 && (this.cups > 0 || this.left > 0)) { c.state = 'queue'; c.joined = this.t; c.pat = 8; c.tx = STAND - 70 - q.length * 70; q.push(c); }
            else if (pf < .4 && Math.random() < .5) { c.say = 'Too pricey!'; c.sayT = 1.4; } }
        } else if (c.state === 'queue') {
          const d = c.tx - c.x; if (Math.abs(d) > 3) { c.dir = Math.sign(d); c.x += c.dir * Math.min(Math.abs(d), c.sp * 1.4 * dt); }
          if ((c.pat -= dt * (c.slot === 0 ? 1 : .5)) <= 0) { c.state = 'leave'; c.dir = -1; c.say = 'Too slow!'; c.sayT = 1.4; this.lost++; this.rep = Math.max(-1, this.rep - .08); G.sfx('lose', .2); }
        } else c.x += c.dir * c.sp * 1.2 * dt;
      }
      this.walkers = this.walkers.filter(c => c.x > -100 && c.x < W + 100);
    },
    close() {
      this.phase = 'done'; const profit = this.earned - this.spent, r = profit / Math.max(1, this.goal);
      const go = profit >= this.goal ? () => G.win(r >= 1.6 ? 3 : r >= 1.25 ? 2 : 1, `${profit} coins profit!`) : () => G.end(`Profit ${profit} of ${this.goal} coins`);
      if (profit >= this.goal) { G.party(); G.score += profit * 10; } this.done = {t: 3.2, go};
    },
    sky(ctx) {
      const w = this.wx.k, g = ctx.createLinearGradient(0, 0, 0, 330);
      const cols = {hot: ['#ffb84a', '#ffe8a0'], sunny: ['#5ab8ff', '#cdeeff'], cloudy: ['#9aaabc', '#dde4ec'], rain: ['#5a6878', '#9aa8b4']}[w];
      g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 360);
      if (w === 'hot' || w === 'sunny') { const r = w === 'hot' ? 54 : 42; G.circle(680, 80, r + 14, 'rgba(255,240,150,.35)'); G.circle(680, 80, r, '#ffe04a'); }
      const cl = w === 'cloudy' || w === 'rain' ? 6 : 2; for (let i = 0; i < cl; i++) { const x = (i * 170 + this.t * 8) % (W + 200) - 100, y = 50 + (i % 3) * 30, c = w === 'rain' ? '#8a96a4' : '#fff'; G.circle(x, y, 30, c); G.circle(x + 34, y + 6, 24, c); G.circle(x - 30, y + 8, 22, c); }
      const R = G.seeded(3); for (let i = 0; i < 7; i++) { const x = i * 120 - 20, h = 110 + R() * 70, col = ['#e8a87a', '#a8c8e8', '#e8d07a', '#c8a8e0', '#9ad0a0'][i % 5];
        G.rr(x, 330 - h, 110, h, 4, col); ctx.fillStyle = '#8a4a3a'; ctx.beginPath(); ctx.moveTo(x - 8, 330 - h); ctx.lineTo(x + 55, 330 - h - 40); ctx.lineTo(x + 118, 330 - h); ctx.fill();
        for (let k = 0; k < 2; k++) G.rr(x + 18 + k * 50, 330 - h + 24, 26, 30, 3, w === 'rain' || w === 'cloudy' ? '#ffe8a0' : '#cfeaff'); G.rr(x + 42, 290, 26, 40, 3, '#6a4a3a'); }
      ctx.fillStyle = '#9ad86a'; ctx.fillRect(0, 330, W, 30); ctx.fillStyle = '#d8d2c4'; ctx.fillRect(0, 360, W, 90); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 60) ctx.fillRect(x, 360, 2, 90);
    },
    stand(ctx) {
      G.rr(STAND - 10, 250, 12, 120, 2, '#8a5a2a'); G.rr(STAND + 198, 250, 12, 120, 2, '#8a5a2a');
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#ffd84a'; ctx.beginPath(); ctx.moveTo(STAND - 24 + i * 32, 214); ctx.lineTo(STAND + 8 + i * 32, 214); ctx.lineTo(STAND + 8 + i * 32, 250); ctx.arc(STAND - 8 + i * 32, 250, 16, 0, Math.PI); ctx.fill(); }
      G.rr(STAND - 20, 340, 240, 22, 4, '#c8945a'); G.rr(STAND - 10, 360, 220, 72, 4, '#e8b878'); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = STAND; x < STAND + 210; x += 30) ctx.fillRect(x, 360, 2, 72);
      G.rr(STAND + 20, 372, 160, 46, 8, '#fff8d8'); G.text('LEMONADE', STAND + 100, 394, {size: 18, align: 'center', display: true, color: '#e8a020'}); G.text(`${this.plan.price} coin${this.plan.price > 1 ? 's' : ''} a cup`, STAND + 100, 412, {size: 12, align: 'center', weight: 800, color: '#7a5a2a'});
      const pit = G.img('img/pitcher.png'), cup = G.img('img/cup_lemonade.png'), lem = G.img('img/lemon.png');
      if (lem.complete) for (let i = 0; i < 4; i++) ctx.drawImage(lem, STAND + 120 + (i % 2) * 34 + (i > 1 ? 17 : 0), 320 - (i > 1 ? 18 : 0), 44, 33);
      if (cup.complete) for (let i = 0; i < 3; i++) ctx.drawImage(cup, STAND + 66 + i * 8, 306 - i * 10, 34, 47);
      if (pit.complete) { ctx.save(); ctx.translate(STAND + 20, 344); if (this.pour > 0) ctx.rotate(-Math.sin(this.pour / .32 * Math.PI) * .6); if (this.mix > 0) ctx.rotate(Math.sin(this.t * 30) * .08); ctx.drawImage(pit, -30, -80, 60, 80); ctx.restore(); }
      if (this.pour > 0) { ctx.fillStyle = '#ffe680'; ctx.fillRect(STAND - 18, 300, 5, 40); }
    },
    walker(ctx, c) {
      const y = FEET; ctx.save(); ctx.translate(c.x, y);
      if (c.mon) { const img = G.img(`img/mon_${c.mon}.png`), b = c.state === 'queue' && Math.abs(c.tx - c.x) < 4 ? Math.sin(this.t * 3 + c.id) * 2 : -Math.abs(Math.sin(this.t * 9 + c.id)) * 8; ctx.scale(c.dir < 0 ? -1 : 1, 1); if (img.complete) ctx.drawImage(img, -60, -112 + b, 120, 120); }
      else { const still = c.state === 'queue' && Math.abs(c.tx - c.x) < 4, img = G.img(still ? 'img/kid_idle.png' : `img/kid_run${Math.floor(this.t * 9 + c.id) % 4}.png`); ctx.scale(c.dir < 0 ? -1 : 1, 1); ctx.filter = ['none', 'hue-rotate(40deg)', 'hue-rotate(-60deg) saturate(1.3)', 'brightness(.8)', 'hue-rotate(160deg)'][c.tint];
        if (img.complete && img.naturalWidth) { const h = 120, w = h * img.naturalWidth / img.naturalHeight; ctx.drawImage(img, -w / 2, -h, w, h); } ctx.filter = 'none'; }
      ctx.restore();
      if (c.cup) { const cup = G.img('img/cup_lemonade.png'); if (cup.complete) ctx.drawImage(cup, c.x + 14, FEET - 74, 22, 31); }
      if (c.state === 'queue' && c.slot === 0) G.bar({x: c.x - 30, y: FEET - 150, w: 60, h: 7, v: c.pat, max: 8, color: c.pat < 3 ? '#ff5b5b' : '#5ec76b'});
      if (c.sayT > 0) { const good = /Yum|good|Perfect|Refresh|Cheap/.test(c.say); G.rr(c.x - 62, FEET - 176, 124, 30, 12, '#fff'); G.text(c.say, c.x, FEET - 156, {size: 13, align: 'center', weight: 800, color: good ? '#3a9a4a' : '#c43a3a'}); }
    },
    weatherBadge(x, y) {
      const w = this.wx; G.rr(x, y, 230, 64, 14, 'rgba(255,255,255,.8)'); G.text({hot: '☀', sunny: '🌤', cloudy: '☁', rain: '🌧'}[w.k], x + 36, y + 45, {size: 34, align: 'center'});
      G.text(w.label, x + 70, y + 28, {size: 16, weight: 800, color: '#3a3a5a'}); G.text(`${w.temp}°`, x + 70, y + 50, {size: 15, weight: 800, color: w.temp > 30 ? '#e8642a' : '#4a6a9a'});
    },
    draw(ctx, dt) {
      this.sky(ctx);
      if (this.phase === 'plan') return this.drawPlan(ctx);
      this.stand(ctx);
      for (const c of [...this.walkers].sort((a, b) => a.id - b.id)) this.walker(ctx, c);
      if (this.wx.k === 'rain') { ctx.strokeStyle = 'rgba(200,220,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (const d of this.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y + 14); } ctx.stroke(); }
      G.fx(this.parts, dt);
      G.rr(14, 12, 160, 40, 12, 'rgba(255,255,255,.85)'); G.circle(36, 32, 11, '#e8a82a'); G.circle(36, 32, 7.5, '#ffd84a'); G.text(`${this.earned - this.spent}`, 54, 40, {size: 20, weight: 800, color: this.earned - this.spent >= this.goal ? '#3a9a4a' : '#5a3a2a'}); G.text(`/ ${this.goal}`, 110, 40, {size: 14, weight: 800, color: '#8a7a6a'});
      G.rr(W - 110, 12, 96, 40, 12, 'rgba(255,255,255,.85)'); G.text(`${Math.ceil(Math.max(0, this.time))}s`, W - 62, 41, {size: 22, align: 'center', weight: 800, color: this.time < 10 ? '#e84a5a' : '#5a3a2a'});
      G.rr(190, 12, 150, 40, 12, 'rgba(255,255,255,.85)'); const stars = Math.round((this.rep + 1) / 2.5 * 5); for (let i = 0; i < 5; i++) G.star(212 + i * 26, 32, 10, i < stars ? '#ffc020' : '#d8d0c0');
      G.rr(0, 444, W, H - 444, 0, '#6a4a2a');
      G.text(`Cups in pitcher: ${this.cups}`, 20, 478, {size: 15, weight: 800, color: '#fff'}); G.text(`Pitchers left: ${this.left}`, 20, 504, {size: 15, weight: 800, color: '#ffe0a0'});
      const ready = this.queue()[0]?.slot === 0 && this.cups > 0 && !this.mix;
      G.rr(250, 452, 220, 78, 16, ready ? (Math.sin(this.t * 10) > 0 ? '#ffc020' : '#ffd84a') : '#a8946a'); G.text('POUR!', 360, 500, {size: 28, align: 'center', display: true, color: '#5a3a0a'});
      const needMix = this.cups <= 0 && this.left > 0; G.rr(490, 452, 200, 78, 16, this.mix > 0 ? '#5a8ad8' : needMix ? '#4aa8ff' : '#7a6a5a'); G.text(this.mix > 0 ? 'Stirring…' : this.cups <= 0 && this.left <= 0 ? 'Sold out!' : 'Mix pitcher', 590, 498, {size: 18, align: 'center', weight: 800, color: '#fff'});
      if (this.t < 3 && this.phase === 'sell') G.text('Click POUR (or Space) when someone is waiting!', W / 2, 90, {size: 18, align: 'center', weight: 800, color: '#fff', shadow: true});
      if (this.phase === 'done') {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); G.rr(220, 110, 360, 300, 20, '#fff8e8'); const profit = this.earned - this.spent;
        G.text('End of the day!', W / 2, 158, {size: 28, align: 'center', display: true, color: '#e8a020'});
        [['Cups sold', this.sold], ['Money in', this.earned], ['Spent on supplies', -this.spent], ['Profit', profit], ['Goal', this.goal]].forEach(([l, v], i) => { G.text(l, 260, 206 + i * 36, {size: 17, weight: 800, color: '#5a3a2a'}); G.text(`${v}`, 540, 206 + i * 36, {size: 17, align: 'right', weight: 800, color: i === 3 ? (profit >= this.goal ? '#3a9a4a' : '#c43a3a') : '#5a3a2a'}); });
        G.text(profit >= this.goal ? 'You hit the goal!' : 'Not quite — try a new recipe or price!', W / 2, 392, {size: 15, align: 'center', weight: 800, color: profit >= this.goal ? '#3a9a4a' : '#c43a3a'});
      }
    },
    drawPlan(ctx) {
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, W, H);
      G.rr(40, 20, 720, 420, 22, 'rgba(255,250,235,.95)');
      G.text(`Day ${G.level}: plan your lemonade`, 70, 64, {size: 26, display: true, color: '#e8a020'}); this.weatherBadge(510, 34);
      G.text(TIPS[this.wx.k], 70, 122, {size: 14, weight: 800, color: '#7a6a5a'});
      ROWS.forEach(([k, label, icon], i) => { const y0 = 150 + i * 56, img = icon && G.img(icon);
        G.rr(60, y0, 680, 44, 12, i % 2 ? '#fff' : '#fff4d0'); if (img && img.complete && img.naturalWidth) { const s = 36 / Math.max(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, 84 - img.naturalWidth * s / 2, y0 + 22 - img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s); } else { G.circle(84, y0 + 22, 13, '#e8a82a'); G.circle(84, y0 + 22, 9, '#ffd84a'); }
        G.text(label, 116, y0 + 29, {size: 17, weight: 800, color: '#5a3a2a'});
        G.rr(470, y0 + 4, 50, 36, 10, '#e88a6a'); G.text('−', 495, y0 + 31, {size: 24, align: 'center', weight: 800, color: '#fff'}); G.text(`${this.plan[k]}`, 560, y0 + 31, {size: 22, align: 'center', weight: 800, color: '#5a3a2a'}); G.rr(600, y0 + 4, 50, 36, 10, '#5ec76b'); G.text('+', 625, y0 + 31, {size: 24, align: 'center', weight: 800, color: '#fff'});
        if (k === 'price') G.text('coins', 690, y0 + 28, {size: 13, weight: 800, color: '#8a7a6a'}); });
      const total = this.cost() * this.plan.pitchers, ok = total <= this.money;
      G.text(`Each pitcher costs ${this.cost()} coins and fills ${CUPS} cups.  Total: ${total} of your ${this.money} coins.`, 400, 434, {size: 14, align: 'center', weight: 800, color: ok ? '#5a3a2a' : '#c43a3a'});
      G.rr(0, 444, W, H - 444, 0, '#6a4a2a'); G.rr(250, 452, 300, 78, 16, ok ? '#3fc060' : '#8a7a6a'); G.text(ok ? 'Open the stand!' : 'Too expensive!', 400, 500, {size: 24, align: 'center', weight: 800, color: '#fff'});
      G.text(`Goal: ${this.goal} coins profit`, 30, 496, {size: 15, weight: 800, color: '#ffe0a0'});
    }
  });
  function setCoin(g) { G.burst(g.parts, STAND - 40, 320, '#ffd84a', 8, 120); }
})();

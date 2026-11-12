(() => {
  const W = 640, H = 480, SEATS = [110, 250, 390, 530], DAY = 80;
  const PRICE = {coffee: 4, latte: 6, tea: 4, juice: 5, cake: 7, cookie: 3};
  const MENU = [['coffee', 'cookie', 'cake'], ['coffee', 'cookie', 'cake', 'tea', 'latte'], ['coffee', 'cookie', 'cake', 'tea', 'latte', 'juice']];
  const GOAL = [70, 130, 190];
  const STATIONS = [
    {id: 'coffee', label: 'Espresso', x: 62, brew: 2.4, day: 1},
    {id: 'milk', label: 'Steamer', x: 166, day: 2},
    {id: 'tea', label: 'Kettle', x: 270, brew: 3, day: 2},
    {id: 'juice', label: 'Juicer', x: 374, brew: 1.6, day: 3},
    {id: 'cake', label: 'Cakes', x: 478, day: 1},
    {id: 'cookie', label: 'Cookies', x: 578, day: 1}
  ];
  const SKIN = ['#f2d3b1', '#e0b48c', '#c68b5e', '#9a6440', '#6b4428'], HAIR = ['#1b1a20', '#5a3d2a', '#c99a4a', '#b8323f', '#8b7bff', '#e8e2d0'];

  function item(ctx, k, x, y, s = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (k === 'coffee' || k === 'latte' || k === 'tea') {
      G.rr(-9, -6, 18, 16, 4, '#f3ead7'); ctx.strokeStyle = '#f3ead7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(10, 2, 4, -1.4, 1.4); ctx.stroke();
      G.rr(-7, -5, 14, 5, 2, k === 'coffee' ? '#5a3a24' : k === 'latte' ? '#d9b48a' : '#c98a3a');
      if (k === 'latte') G.heart(0, -3, 2.5, '#ffffff');
      if (k === 'tea') { ctx.strokeStyle = '#8a8f9e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(8, -14); ctx.stroke(); G.rr(6, -16, 5, 4, 1, '#ffcf5c'); }
    } else if (k === 'juice') { G.rr(-6, -12, 12, 22, 3, '#ff9f5c'); G.rr(-6, -12, 12, 4, 2, '#ffd2a8'); ctx.strokeStyle = '#e04e5f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(5, -18); ctx.stroke(); }
    else if (k === 'cake') { ctx.fillStyle = '#f0d9a8'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(10, 8); ctx.lineTo(10, -4); ctx.lineTo(-10, 2); ctx.fill(); ctx.fillStyle = '#f2a7c3'; ctx.beginPath(); ctx.moveTo(-10, 2); ctx.lineTo(10, -4); ctx.lineTo(10, -8); ctx.lineTo(-10, -1); ctx.fill(); G.circle(6, -9, 2.5, '#e04e5f'); }
    else { G.circle(0, 0, 10, '#c9935a'); for (const [a, b] of [[-4, -3], [3, -4], [0, 3], [5, 3], [-5, 4]]) G.circle(a, b, 1.6, '#4a2f1d'); }
    ctx.restore();
  }

  GameBox.register({
    id: 'cafe', title: 'Cafe Rush', genre: 'Simulation', kind: 'Time management', w: W, h: H, cursor: 'pointer',
    desc: 'Run a busy little cafe for three days. Customers order coffee, lattes, tea, juice and treats; prepare items onto your tray, then click a customer to serve them before their patience runs out. Lattes need coffee taken to the steamer. Hit each day\'s earnings goal and keep your reputation up.',
    controls: [['Click a station', 'Start brewing, or take a finished item'], ['Click Steamer', 'Turn a coffee on your tray into a latte'], ['Click a customer', 'Serve what they ordered from your tray'], ['Click a tray item', 'Throw it away']],
    info() { return `Day ${this.day}/3 · Today ${this.earned}/${GOAL[this.day - 1]}`; },
    init() { this.day = 1; this.rep = 100; this.parts = []; this.startDay(); },
    startDay() {
      this.time = DAY; this.earned = 0; this.tray = []; this.seats = [null, null, null, null]; this.spawnT = 2; this.banner = 2.2;
      this.st = Object.fromEntries(STATIONS.map(s => [s.id, {busy: 0, ready: false}]));
    },
    unlocked(s) { return this.day >= s.day; },
    spawn() {
      const free = this.seats.map((s, i) => s ? -1 : i).filter(i => i >= 0);
      if (!free.length) return;
      const i = G.pick(free), menu = MENU[this.day - 1], roll = Math.random();
      const n = this.day > 1 && roll > .9 ? 3 : roll > .6 ? 2 : 1;
      const order = Array.from({length: n}, () => G.pick(menu));
      const pat = [30, 25, 21][this.day - 1];
      this.seats[i] = {order, done: order.map(() => false), patience: pat, max: pat, skin: G.pick(SKIN), hair: G.pick(HAIR), style: Math.floor(G.rnd(3)), enter: 0, leave: 0, mood: null};
    },
    addTray(k) {
      if (this.tray.length >= 3) { G.sfx('hit', .3); G.popText(this.parts, W / 2, 430, 'Tray full', '#ff6b8b'); return false; }
      this.tray.push(k); G.sfx('click'); return true;
    },
    station(s) {
      const st = this.st[s.id];
      if (!this.unlocked(s)) return;
      if (s.id === 'milk') {
        const i = this.tray.indexOf('coffee');
        if (i < 0) { G.popText(this.parts, s.x, 290, 'Bring a coffee', '#c4c8ee'); return G.sfx('hit', .3); }
        this.tray[i] = 'latte'; G.sfx('splash', .5); return;
      }
      if (s.id === 'cake' || s.id === 'cookie') return this.addTray(s.id);
      if (st.ready) { if (this.addTray(s.id)) st.ready = false; return; }
      if (st.busy <= 0) { st.busy = s.brew; G.sfx('select', .5); }
    },
    serve(i) {
      const c = this.seats[i];
      if (!c || c.leave) return;
      let served = false;
      c.order.forEach((k, j) => { if (!c.done[j]) { const t = this.tray.indexOf(k); if (t >= 0) { this.tray.splice(t, 1); c.done[j] = true; served = true; } } });
      if (!served) { G.sfx('hit', .3); return; }
      G.sfx('coin', .6);
      if (c.done.every(Boolean)) {
        const base = c.order.reduce((s, k) => s + PRICE[k], 0), tip = Math.round(base * .5 * c.patience / c.max);
        this.earned += base + tip; G.score += base + tip;
        G.popText(this.parts, SEATS[i], 70, `+${base + tip}${tip ? ` (tip ${tip})` : ''}`, '#ffcf5c', 16);
        c.leave = 1; c.mood = 'happy';
      } else c.patience = Math.min(c.max, c.patience + 4);
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (y > 286 && y < 410) { const s = STATIONS.find(s => Math.abs(x - s.x) < 46); if (s) return this.station(s); }
      if (y > 60 && y < 250) { const i = SEATS.findIndex(sx => Math.abs(x - sx) < 56); if (i >= 0) return this.serve(i); }
      if (y > 420) { const t = Math.floor((x - (W / 2 - 90)) / 60); if (t >= 0 && t < this.tray.length) { this.tray.splice(t, 1); G.sfx('swing', .5); } }
    },
    update(dt) {
      if (this.banner > 0) { this.banner -= dt; return; }
      this.time -= dt;
      for (const s of STATIONS) { const st = this.st[s.id]; if (st.busy > 0 && (st.busy -= dt) <= 0) { st.ready = true; G.sfx('select', .4); } }
      if ((this.spawnT -= dt) <= 0 && this.time > 6) { this.spawnT = [7, 5.5, 4.5][this.day - 1] + G.rnd(2.5); this.spawn(); }
      this.seats.forEach((c, i) => {
        if (!c) return;
        c.enter = Math.min(1, c.enter + dt * 3);
        if (c.leave) { if ((c.leave -= dt * 1.5) <= 0) this.seats[i] = null; return; }
        if ((c.patience -= dt) <= 0) {
          c.leave = 1; c.mood = 'angry'; this.rep -= 20; G.sfx('hurt', .6); G.shake(4);
          if (this.rep <= 0) { this.rep = 0; G.end('Bad reviews closed the cafe'); }
        }
      });
      if (G.state !== 'play') return;
      if (this.time <= 0) {
        if (this.earned < GOAL[this.day - 1]) return G.end('Missed the day\'s goal');
        G.score += 200 * this.day; G.sfx('win');
        if (this.day === 3) { G.score += 1000; return G.end('Best cafe in town!'); }
        this.day++; this.rep = Math.min(100, this.rep + 20); this.startDay();
      }
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      G.clear('#f1dfc4');
      ctx.fillStyle = '#e8d2b0'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, 220);
      G.rr(250, 22, 140, 80, 8, '#a8d4e8'); ctx.strokeStyle = '#8a5a35'; ctx.lineWidth = 5; ctx.strokeRect(250, 22, 140, 80); ctx.beginPath(); ctx.moveTo(320, 22); ctx.lineTo(320, 102); ctx.stroke();
      G.rr(30, 60, 160, 8, 2, '#8a5a35'); G.rr(450, 60, 160, 8, 2, '#8a5a35');
      for (let i = 0; i < 4; i++) { item(ctx, 'coffee', 50 + i * 36, 50, .9); item(ctx, i % 2 ? 'cake' : 'cookie', 470 + i * 36, 50, .9); }
      this.seats.forEach((c, i) => {
        if (!c) return;
        const x = SEATS[i] + (c.leave ? (1 - c.leave) * 220 * (i < 2 ? -1 : 1) : 0), y = 200 - c.enter * 30 + 30, bob = Math.sin(now * 3 + i) * 1.5;
        ctx.globalAlpha = c.leave ? Math.max(0, c.leave) : 1;
        G.rr(x - 26, y - 32 + bob, 52, 50, 16, ['#3d6fd9', '#2fb89a', '#8b5cd6'][c.style]);
        G.circle(x, y - 48 + bob, 20, c.skin);
        ctx.fillStyle = c.hair; ctx.beginPath(); ctx.arc(x, y - 52 + bob, 21, Math.PI, 0); ctx.fill();
        if (c.style === 1) { G.circle(x - 18, y - 44 + bob, 7, c.hair); G.circle(x + 18, y - 44 + bob, 7, c.hair); }
        const mood = c.mood || (c.patience / c.max < .3 ? 'angry' : 'ok');
        G.circle(x - 7, y - 48 + bob, 2.2, '#1b1a33'); G.circle(x + 7, y - 48 + bob, 2.2, '#1b1a33');
        ctx.strokeStyle = '#1b1a33'; ctx.lineWidth = 2; ctx.beginPath();
        if (mood === 'happy') ctx.arc(x, y - 42 + bob, 6, .2, Math.PI - .2); else if (mood === 'angry') ctx.arc(x, y - 34 + bob, 6, Math.PI + .3, -.3); else { ctx.moveTo(x - 5, y - 39 + bob); ctx.lineTo(x + 5, y - 39 + bob); }
        ctx.stroke();
        if (!c.leave) {
          const bw = c.order.length * 32 + 12;
          G.rr(x - bw / 2, y - 120, bw, 40, 12, '#ffffff');
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - 6, y - 81); ctx.lineTo(x + 6, y - 81); ctx.lineTo(x, y - 72); ctx.fill();
          c.order.forEach((k, j) => { ctx.globalAlpha = c.done[j] ? .25 : 1; item(ctx, k, x - bw / 2 + 22 + j * 32, y - 100); });
          ctx.globalAlpha = 1;
          G.bar({x: x - 30, y: y - 132, w: 60, h: 6, v: c.patience, max: c.max, color: c.patience / c.max < .3 ? '#ff4b62' : c.patience / c.max < .6 ? '#ffcf5c' : '#5ee6c1'});
        }
        ctx.globalAlpha = 1;
      });
      G.rr(0, 220, W, 50, 0, '#8a5a35'); G.rr(0, 220, W, 10, 0, '#a8744a');
      G.rr(0, 270, W, 160, 0, '#6b4a33');
      for (const s of STATIONS) {
        const st = this.st[s.id], on = this.unlocked(s), hover = Math.abs(G.pointer.x - s.x) < 46 && G.pointer.y > 286 && G.pointer.y < 410;
        G.rr(s.x - 46, 290, 92, 116, 12, on ? (hover ? '#4a3a5a' : '#3a2f4a') : '#2b2433');
        ctx.globalAlpha = on ? 1 : .35;
        if (s.id === 'coffee' || s.id === 'tea' || s.id === 'juice') {
          G.rr(s.x - 26, 304, 52, 44, 8, s.id === 'coffee' ? '#9aa0c8' : s.id === 'tea' ? '#e8577a' : '#ffcf5c');
          if (st.busy > 0) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.x, 326, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - st.busy / s.brew)); ctx.stroke(); for (let k = 0; k < 3; k++) G.circle(s.x - 8 + k * 8, 296 - ((now * 30 + k * 10) % 20), 3, 'rgba(255,255,255,.5)'); }
          if (st.ready) item(ctx, s.id, s.x, 372, 1.2);
          if (!st.ready && st.busy <= 0) G.text('click', s.x, 378, {size: 11, align: 'center', color: '#c4c8ee'});
        } else if (s.id === 'milk') { G.rr(s.x - 18, 304, 36, 52, 8, '#e8e2f0'); G.rr(s.x - 6, 296, 12, 12, 3, '#9aa0c8'); item(ctx, 'latte', s.x, 376, 1); }
        else { G.rr(s.x - 32, 340, 64, 10, 4, '#e8e2f0'); for (let k = 0; k < 3; k++) item(ctx, s.id, s.x - 20 + k * 20, 328 - (k % 2) * 6, .9); }
        G.text(on ? s.label : `Day ${s.day}`, s.x, 398, {size: 11, align: 'center', weight: 700});
        ctx.globalAlpha = 1;
      }
      G.rr(W / 2 - 96, 424, 192, 50, 14, '#d9c3a0');
      for (let i = 0; i < 3; i++) { G.circle(W / 2 - 60 + i * 60, 449, 20, 'rgba(0,0,0,.08)'); if (this.tray[i]) item(ctx, this.tray[i], W / 2 - 60 + i * 60, 450, 1.3); }
      G.text('TRAY', W / 2 - 112, 455, {size: 11, align: 'right', weight: 700, color: '#6b4a33'});
      G.fx(this.parts, dt);
      G.panel(8, 6, 200, 70);
      G.bar({x: 16, y: 14, w: 184, h: 14, v: this.earned, max: GOAL[this.day - 1], color: '#ffcf5c', label: `EARNED ${this.earned}/${GOAL[this.day - 1]}`, id: 'earn'});
      G.bar({x: 16, y: 36, w: 184, h: 14, v: this.rep, max: 100, color: this.rep < 40 ? '#ff4b62' : '#5ee6c1', label: `REPUTATION ${this.rep}`, id: 'rep'});
      G.bar({x: 16, y: 58, w: 184, h: 10, v: this.time, max: DAY, color: '#8b7bff', label: ''});
      if (this.banner > 0) { G.panel(W / 2 - 160, 120, 320, 90, 16, 'rgba(27,26,51,.9)'); G.text(`DAY ${this.day}`, W / 2, 160, {size: 28, align: 'center', display: true, color: '#ffcf5c'}); G.text(`Goal: ${GOAL[this.day - 1]} coins${this.day > 1 ? ' · new items on the menu' : ''}`, W / 2, 190, {size: 13, align: 'center'}); }
    }
  });
})();

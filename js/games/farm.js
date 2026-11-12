(() => {
  const W = 640, H = 480, COLS = 8, ROWS = 5, S = 52, X0 = 24, Y0 = 124, DAY = 50, SEASON = 14;
  const CROPS = {
    turnip: {name: 'Turnip', cost: 10, sell: 28, days: 2, color: '#efe6f5', leaf: '#6fbf5a'},
    carrot: {name: 'Carrot', cost: 15, sell: 45, days: 3, color: '#ff9f5c', leaf: '#5fae4a'},
    berry: {name: 'Strawberry', cost: 30, sell: 30, days: 4, regrow: 2, color: '#e04e5f', leaf: '#3f9a4a'},
    sunflower: {name: 'Sunflower', cost: 25, sell: 70, days: 4, color: '#ffcf5c', leaf: '#4f9a3a'},
    pumpkin: {name: 'Pumpkin', cost: 50, sell: 180, days: 6, color: '#ff8c2a', leaf: '#3f8a3a'}
  };
  const SEEDS = Object.keys(CROPS);
  const SHOP = [...SEEDS.map(k => ({kind: 'seed', k, cost: CROPS[k].cost, label: `${CROPS[k].name} seed`})),
    {kind: 'can', cost: 150, label: 'Big watering can'}, {kind: 'scarecrow', cost: 100, label: 'Scarecrow'},
    {kind: 'sprinkler', cost: 220, label: 'Sprinkler'}, {kind: 'tonic', cost: 40, label: 'Energy tonic'}];
  const TOOLS = ['hoe', 'water', 'seed', 'hand'];

  GameBox.register({
    id: 'farm', title: 'Tiny Acre', genre: 'Simulation', kind: 'Farming sim', w: W, h: H, cursor: 'pointer',
    desc: 'You have one fourteen-day season to turn a patch of grass into a thriving farm. Till soil, plant seeds, water every day and harvest to sell. Each action costs energy. Scarecrows keep crows away, sprinklers water for you, and rain is free water. Earn as much as you can.',
    controls: [['1 2 3 4', 'Hoe, watering can, seeds, harvest'], ['Click a field tile', 'Use the current tool'], ['Q E', 'Choose which seed to plant'], ['Click the shop', 'Buy seeds and upgrades'], ['Enter', 'Sleep to start the next day']],
    info() { return `Day ${this.day}/${SEASON} · Coins ${this.coins}`; },
    init() {
      this.day = 1; this.coins = 60; this.energy = 100; this.clock = 0; this.tool = 0; this.seed = 0; this.parts = [];
      this.seeds = {turnip: 4, carrot: 0, berry: 0, sunflower: 0, pumpkin: 0}; this.bigCan = false; this.placing = null;
      this.tiles = Array.from({length: ROWS * COLS}, () => ({soil: false, wet: false, crop: null, obj: null}));
      this.rain = false; this.note = 'Till grass with the hoe, plant, water, then sleep.'; this.noteT = 6; this.sleepT = 0;
      this.drops = Array.from({length: 80}, () => ({x: G.rnd(W), y: G.rnd(H)}));
    },
    msg(t) { this.note = t; this.noteT = 3; },
    spend(n) { if (this.energy < n) { this.msg('Too tired. Sleep to restore energy (Enter).'); G.sfx('hit', .3); return false; } this.energy -= n; return true; },
    useTile(i) {
      const t = this.tiles[i];
      if (this.placing) {
        if (t.crop || t.obj) return G.sfx('hit', .3);
        t.obj = this.placing; t.soil = false; this.placing = null; G.sfx('crunch', .6); return;
      }
      const tool = TOOLS[this.tool];
      if (tool === 'hoe' && !t.soil && !t.obj) { if (this.spend(4)) { t.soil = true; G.sfx('step'); } }
      else if (tool === 'water' && t.soil) {
        if (!this.spend(2)) return;
        const row = Math.floor(i / COLS), col = i % COLS;
        for (let c = col; c < (this.bigCan ? Math.min(COLS, col + 3) : col + 1); c++) { const o = this.tiles[row * COLS + c]; if (o.soil) o.wet = true; }
        G.sfx('splash', .5); G.burst(this.parts, X0 + col * S + S / 2, Y0 + row * S + S / 2, '#5cb8ff', 8, 80);
      } else if (tool === 'seed' && t.soil && !t.crop) {
        const k = SEEDS[this.seed];
        if (!this.seeds[k]) { this.msg(`No ${CROPS[k].name} seeds. Buy some in the shop.`); return G.sfx('hit', .3); }
        if (this.spend(1)) { this.seeds[k]--; t.crop = {k, age: 0}; G.sfx('click'); }
      } else if (tool === 'hand' && t.crop && t.crop.age >= CROPS[t.crop.k].days) {
        if (!this.spend(1)) return;
        const C = CROPS[t.crop.k];
        this.coins += C.sell; G.score += C.sell; G.sfx('coin');
        G.popText(this.parts, X0 + (i % COLS) * S + S / 2, Y0 + Math.floor(i / COLS) * S, `+${C.sell}`, '#ffcf5c');
        if (C.regrow) t.crop.age = C.days - C.regrow; else t.crop = null;
      }
    },
    buy(item) {
      if (this.coins < item.cost) { this.msg('Not enough coins.'); return G.sfx('hit', .3); }
      if (item.kind === 'can' && this.bigCan) return;
      this.coins -= item.cost; G.sfx('select');
      if (item.kind === 'seed') { this.seeds[item.k]++; this.seed = SEEDS.indexOf(item.k); }
      if (item.kind === 'can') { this.bigCan = true; this.msg('The big can waters three tiles in a row.'); }
      if (item.kind === 'tonic') this.energy = Math.min(100, this.energy + 40);
      if (item.kind === 'scarecrow' || item.kind === 'sprinkler') { this.placing = item.kind; this.msg(`Click a free tile to place the ${item.kind}.`); }
    },
    sleep() {
      if (this.sleepT > 0) return;
      this.sleepT = 1.6; G.sfx('power');
      let eaten = 0;
      this.tiles.forEach((t, i) => {
        const r = Math.floor(i / COLS), c = i % COLS;
        if (t.crop && (t.wet || this.rain)) t.crop.age++;
        const guarded = this.tiles.some((o, j) => o.obj === 'scarecrow' && Math.abs(Math.floor(j / COLS) - r) <= 2 && Math.abs(j % COLS - c) <= 2);
        if (t.crop && !guarded && Math.random() < .07) { t.crop = null; eaten++; }
        t.wet = false;
      });
      this.day++;
      if (this.day > SEASON) return G.end('Harvest festival!');
      this.rain = Math.random() < .2;
      this.tiles.forEach((t, i) => {
        if (this.rain && t.soil) t.wet = true;
        if (t.obj === 'sprinkler') for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const r = Math.floor(i / COLS) + dr, c = i % COLS + dc;
          if (r >= 0 && c >= 0 && r < ROWS && c < COLS && this.tiles[r * COLS + c].soil) this.tiles[r * COLS + c].wet = true;
        }
      });
      this.energy = 100; this.clock = 0;
      this.msg(eaten ? `Crows ate ${eaten} crop${eaten > 1 ? 's' : ''} overnight. A scarecrow would help.` : this.rain ? 'Rainy day: everything is watered.' : `Good morning! Day ${this.day}.`);
    },
    key(k) {
      const i = '1234'.indexOf(k); if (i >= 0) { this.tool = i; this.placing = null; G.sfx('click', .5); }
      if (k === 'q') this.seed = (this.seed + SEEDS.length - 1) % SEEDS.length;
      if (k === 'e') this.seed = (this.seed + 1) % SEEDS.length;
      if (k === 'Enter') this.sleep();
    },
    pointer(type, x, y) {
      if (type !== 'down' || this.sleepT > 0) return;
      const c = Math.floor((x - X0) / S), r = Math.floor((y - Y0) / S);
      if (c >= 0 && r >= 0 && c < COLS && r < ROWS) return this.useTile(r * COLS + c);
      if (x > 456) {
        const i = Math.floor((y - 76) / 30);
        if (i >= 0 && i < SHOP.length) return this.buy(SHOP[i]);
        if (y > 76 + SHOP.length * 30 + 8 && y < 76 + SHOP.length * 30 + 44) return this.sleep();
      }
      if (y > 400) {
        const t = Math.floor((x - 24) / 74);
        if (t >= 0 && t < 4) { if (t === 2 && this.tool === 2) this.seed = (this.seed + 1) % SEEDS.length; this.tool = t; this.placing = null; G.sfx('click', .5); }
      }
    },
    update(dt) {
      this.noteT -= dt;
      if (this.sleepT > 0) { this.sleepT -= dt; return; }
      if ((this.clock += dt) >= DAY) { this.msg('You stayed up too late and collapsed into bed.'); this.sleep(); }
      if (this.rain) for (const d of this.drops) { d.y += 500 * dt; d.x -= 60 * dt; if (d.y > H) { d.y = -10; d.x = G.rnd(W + 60); } }
    },
    drawCrop(ctx, t, x, y) {
      const C = CROPS[t.crop.k], p = t.crop.age / C.days, cx = x + S / 2, cy = y + S / 2 + 6;
      if (p <= 0) { G.circle(cx, cy + 6, 4, '#4a2f1d'); return; }
      ctx.fillStyle = C.leaf;
      if (p < .5) { ctx.beginPath(); ctx.ellipse(cx - 4, cy, 5, 3, -.6, 0, Math.PI * 2); ctx.ellipse(cx + 4, cy, 5, 3, .6, 0, Math.PI * 2); ctx.fill(); return; }
      if (t.crop.k === 'sunflower') {
        G.rr(cx - 1.5, cy - 22 * p, 3, 26 * p, 1, C.leaf);
        if (p >= 1) { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; G.circle(cx + Math.cos(a) * 8, cy - 22 + Math.sin(a) * 8, 4, C.color); } G.circle(cx, cy - 22, 6, '#6b4a33'); }
        return;
      }
      for (const a of [-.9, 0, .9]) { ctx.beginPath(); ctx.ellipse(cx + Math.sin(a) * 6, cy - 8 * p, 4, 10 * p, a, 0, Math.PI * 2); ctx.fill(); }
      if (p >= 1) {
        if (t.crop.k === 'pumpkin') { ctx.fillStyle = C.color; ctx.beginPath(); ctx.ellipse(cx, cy + 4, 15, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c96a1a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 14); ctx.stroke(); }
        else if (t.crop.k === 'berry') { for (const [dx, dy] of [[-8, 6], [6, 8], [0, -2]]) { ctx.fillStyle = C.color; ctx.beginPath(); ctx.moveTo(cx + dx - 4, cy + dy - 3); ctx.lineTo(cx + dx + 4, cy + dy - 3); ctx.lineTo(cx + dx, cy + dy + 5); ctx.fill(); } }
        else if (t.crop.k === 'carrot') { ctx.fillStyle = C.color; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 2); ctx.lineTo(cx + 6, cy + 2); ctx.lineTo(cx, cy + 16); ctx.fill(); }
        else G.circle(cx, cy + 6, 9, C.color);
        const tw = (performance.now() / 300 + x) % 6;
        if (tw < 1) G.circle(cx + 12, cy - 12, 2, '#ffffff');
      }
    },
    draw(ctx, dt) {
      const k = this.clock / DAY, now = performance.now() / 1000;
      const sky = ctx.createLinearGradient(0, 0, 0, 110);
      sky.addColorStop(0, `hsl(${G.lerp(200, 250, k)} ${this.rain ? 20 : 60}% ${G.lerp(70, 35, k * k)}%)`); sky.addColorStop(1, `hsl(${G.lerp(190, 25, k)} 60% ${G.lerp(85, 60, k)}%)`);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 110);
      if (!this.rain) G.circle(40 + k * 380, 90 - Math.sin(k * Math.PI) * 70, 16, '#fff3c4');
      ctx.fillStyle = '#6aa85a'; ctx.fillRect(0, 100, W, H - 100);
      ctx.fillStyle = '#629e52'; for (let i = 0; i < 90; i++) ctx.fillRect((i * 83) % 450, 105 + (i * 41) % 290, 3, 5);
      G.rr(30, 50, 90, 62, 4, '#c96a4a'); ctx.fillStyle = '#7a3a2a'; ctx.beginPath(); ctx.moveTo(22, 54); ctx.lineTo(75, 22); ctx.lineTo(128, 54); ctx.fill();
      G.rr(64, 80, 20, 32, 3, '#5a3d2a'); G.rr(38, 66, 18, 16, 2, '#ffe9a8'); G.rr(94, 66, 18, 16, 2, '#ffe9a8');
      ctx.strokeStyle = '#a07a4a'; ctx.lineWidth = 3;
      ctx.strokeRect(X0 - 8, Y0 - 8, COLS * S + 16, ROWS * S + 16);
      this.tiles.forEach((t, i) => {
        const x = X0 + (i % COLS) * S, y = Y0 + Math.floor(i / COLS) * S;
        if (t.soil) { G.rr(x + 2, y + 2, S - 4, S - 4, 6, t.wet ? '#5a3a24' : '#8a5a35'); ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let r = 0; r < 3; r++) ctx.fillRect(x + 8, y + 12 + r * 12, S - 16, 2); }
        else { G.rr(x + 2, y + 2, S - 4, S - 4, 6, '#74b562'); ctx.fillStyle = '#5f9e4f'; ctx.fillRect(x + 12, y + 20, 3, 6); ctx.fillRect(x + 30, y + 30, 3, 6); }
        if (t.crop) this.drawCrop(ctx, t, x, y);
        if (t.obj === 'scarecrow') { G.rr(x + 24, y + 10, 4, 38, 1, '#6b4a33'); G.rr(x + 12, y + 20, 28, 4, 1, '#6b4a33'); G.circle(x + 26, y + 12, 7, '#e8c35a'); G.rr(x + 18, y + 22, 16, 14, 3, '#c4364a'); }
        if (t.obj === 'sprinkler') { G.rr(x + 22, y + 22, 8, 16, 2, '#9aa0c8'); G.circle(x + 26, y + 20, 6, '#5cb8ff'); }
      });
      const hc = Math.floor((G.pointer.x - X0) / S), hr = Math.floor((G.pointer.y - Y0) / S);
      if (hc >= 0 && hr >= 0 && hc < COLS && hr < ROWS) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(X0 + hc * S + 2, Y0 + hr * S + 2, S - 4, S - 4, 6); ctx.stroke(); }
      // shop
      G.rr(456, 64, 176, SHOP.length * 30 + 58, 12, 'rgba(27,26,51,.85)');
      G.text('SHOP', 468, 82 - 8, {size: 11, weight: 700, color: '#9aa0c8'});
      SHOP.forEach((it, i) => {
        const y = 76 + i * 30, hover = G.pointer.x > 456 && G.pointer.y > y && G.pointer.y < y + 30, owned = it.kind === 'can' && this.bigCan;
        if (hover) G.rr(460, y + 2, 168, 26, 6, 'rgba(255,255,255,.08)');
        G.text(it.label, 468, y + 20, {size: 12, color: owned ? '#6b6f99' : '#e8e9ff'});
        G.text(owned ? 'owned' : `${it.cost}c`, 622, y + 20, {size: 12, align: 'right', weight: 700, color: this.coins >= it.cost ? '#ffcf5c' : '#ff6b8b'});
      });
      const sy = 76 + SHOP.length * 30 + 8;
      G.rr(466, sy, 156, 36, 10, '#3d4a8a'); G.text('Sleep (Enter)', 544, sy + 23, {size: 13, align: 'center', weight: 700});
      // toolbar
      TOOLS.forEach((t, i) => {
        const x = 24 + i * 74, y = 404, on = this.tool === i;
        G.rr(x, y, 66, 60, 10, on ? '#2b2f55' : 'rgba(27,26,51,.75)');
        if (on) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, 66, 60, 10); ctx.stroke(); }
        const label = t === 'seed' ? CROPS[SEEDS[this.seed]].name : {hoe: 'Hoe', water: this.bigCan ? 'Big can' : 'Water', hand: 'Harvest'}[t];
        if (t === 'hoe') { G.rr(x + 30, y + 10, 4, 26, 1, '#8a5a35'); G.rr(x + 22, y + 8, 18, 6, 2, '#9aa0c8'); }
        if (t === 'water') { G.rr(x + 20, y + 14, 22, 18, 4, '#5cb8ff'); G.rr(x + 40, y + 16, 10, 4, 2, '#5cb8ff'); }
        if (t === 'seed') { G.circle(x + 33, y + 22, 10, CROPS[SEEDS[this.seed]].color); G.text(String(this.seeds[SEEDS[this.seed]]), x + 33, y + 27, {size: 11, align: 'center', weight: 700, color: '#1b1a33'}); }
        if (t === 'hand') { G.rr(x + 22, y + 14, 22, 18, 6, '#c9a26b'); G.rr(x + 18, y + 12, 30, 6, 3, '#8a6a3a'); }
        G.text(label, x + 33, y + 52, {size: 10, align: 'center', weight: 700});
        G.text(String(i + 1), x + 60, y + 13, {size: 9, align: 'right', color: '#6b6f99'});
      });
      if (this.placing) G.text(`Placing ${this.placing}…`, 330, 440, {size: 13, weight: 700, color: '#1b1a33'});
      if (this.rain) { ctx.strokeStyle = 'rgba(200,220,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (const d of this.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y + 12); } ctx.stroke(); }
      if (k > .7) { ctx.fillStyle = `rgba(20,10,50,${(k - .7) * 1.2})`; ctx.fillRect(0, 0, W, H); }
      G.fx(this.parts, dt);
      G.panel(136, 8, 314, 54);
      G.text(`Day ${this.day}/${SEASON}${this.rain ? '  ☂' : ''}`, 146, 28, {size: 14, weight: 700});
      G.text(`${this.coins} coins`, 440, 28, {size: 14, align: 'right', weight: 700, color: '#ffcf5c'});
      G.bar({x: 146, y: 38, w: 140, h: 14, v: this.energy, max: 100, color: this.energy < 20 ? '#ff4b62' : '#5ee6c1', label: `ENERGY ${Math.ceil(this.energy)}`, id: 'energy'});
      G.bar({x: 296, y: 38, w: 144, h: 14, v: DAY - this.clock, max: DAY, color: '#ffcf5c', label: 'DAYLIGHT'});
      if (this.noteT > 0) { ctx.globalAlpha = Math.min(1, this.noteT); G.text(this.note, X0 + COLS * S / 2, 112, {size: 12, align: 'center', weight: 700, color: '#1b1a33'}); ctx.globalAlpha = 1; }
      if (this.sleepT > 0) {
        ctx.fillStyle = `rgba(10,8,30,${Math.min(1, Math.sin(this.sleepT / 1.6 * Math.PI) * 1.4)})`; ctx.fillRect(0, 0, W, H);
        G.text(`Day ${this.day}`, W / 2, H / 2, {size: 32, align: 'center', display: true, color: '#ffcf5c'});
      }
    }
  });
})();

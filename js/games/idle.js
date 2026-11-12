(() => {
  const W = 640, H = 480, CX = 150, CY = 215, CR = 74;
  const GENS = [
    {name: 'Pickaxe Miner', base: 15, rate: .2, color: '#c9a26b'},
    {name: 'Mine Cart', base: 100, rate: 1.2, color: '#8a8f9e'},
    {name: 'Steam Drill', base: 1100, rate: 8, color: '#ff9f5c'},
    {name: 'Dynamite Crew', base: 12000, rate: 47, color: '#e04e5f'},
    {name: 'Excavator', base: 130000, rate: 260, color: '#ffcf5c'},
    {name: 'Gem Refinery', base: 1.4e6, rate: 1400, color: '#5ee6c1'},
    {name: 'Crystal Portal', base: 2e7, rate: 7800, color: '#8b7bff'}
  ];
  const CLICK_UP = [100, 1000, 12000, 150000, 2e6];
  const fmt = n => {
    if (n < 1000) return n < 10 ? n.toFixed(1).replace('.0', '') : Math.floor(n).toString();
    const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi'], i = Math.min(u.length, Math.floor(Math.log10(n) / 3));
    return (n / 10 ** (i * 3)).toFixed(2) + u[i - 1];
  };

  GameBox.register({
    id: 'idle', title: 'Gem Mine Tycoon', genre: 'Casual', kind: 'Idle clicker', w: W, h: H, cursor: 'pointer',
    desc: 'Tap the crystal to mine gems, then hire miners, carts, drills and stranger things that dig for you, even while you are away. Click golden veins for a frenzy, and once you are rich enough, dig deeper for a permanent boost. Progress saves on this device.',
    controls: [['Click the crystal / Space', 'Mine gems'], ['Click a row / 1-7', 'Buy a digger'], ['Click a golden vein', 'Seven-times frenzy']],
    info() { return `${fmt(this.rate())}/s · Depth ${this.depth}`; },
    init() {
      const s = G.load('idle') || {};
      this.gems = s.gems || 0; this.total = s.total || 0; this.owned = s.owned || GENS.map(() => 0);
      this.clickLvl = s.clickLvl || 0; this.depth = s.depth || 0; this.parts = []; this.vein = null; this.veinT = 40 + G.rnd(40); this.frenzy = 0;
      this.saveT = 3; this.pulse = 0; this.away = 0;
      if (s.t) {
        const secs = Math.min(7200, (Date.now() - s.t) / 1000), gain = secs * this.rate() * .5;
        if (gain >= 1) { this.gems += gain; this.total += gain; this.away = gain; this.awayT = 5; }
      }
    },
    mult() { return (1 + this.depth * .5) * (this.frenzy > 0 ? 7 : 1); },
    rate() { return GENS.reduce((s, g, i) => s + g.rate * this.owned[i], 0) * (1 + this.depth * .5) * (this.frenzy > 0 ? 7 : 1); },
    clickPower() { return 2 ** this.clickLvl * this.mult() + this.rate() * .03; }, // taps stay useful as diggers grow
    cost(i) { return Math.ceil(GENS[i].base * 1.15 ** this.owned[i]); },
    deeper() { return 1e6 * 10 ** this.depth; },
    persist() { G.save('idle', {gems: this.gems, total: this.total, owned: this.owned, clickLvl: this.clickLvl, depth: this.depth, t: Date.now()}); },
    onPause() { this.persist(); },
    stop() { this.persist(); },
    mine(x, y) {
      const n = this.clickPower(); this.gems += n; this.total += n; this.pulse = .12;
      G.popText(this.parts, x + G.rnd(30) - 15, y - 20, `+${fmt(n)}`, '#ffffff', 15); G.burst(this.parts, x, y, '#7ff0d2', 4, 120); G.sfx('click', .5);
    },
    buy(i) {
      const c = this.cost(i);
      if (this.gems < c) return G.sfx('hit', .3);
      this.gems -= c; this.owned[i]++; G.sfx('coin', .6);
    },
    key(k) {
      if (k === ' ') this.mine(CX, CY);
      const i = '1234567'.indexOf(k); if (i >= 0) this.buy(i);
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (G.dist(x, y, CX, CY) < CR + 6) return this.mine(x, y);
      if (this.vein && G.dist(x, y, this.vein.x, this.vein.y) < 22) { this.vein = null; this.frenzy = 12; G.sfx('win'); G.flash('rgba(255,207,92,.35)', .4); return; }
      if (x > 314 && y > 58 && y < 58 + GENS.length * 50) return this.buy(Math.floor((y - 58) / 50));
      if (x > 14 && x < 150 && y > 400 && y < 440 && this.clickLvl < CLICK_UP.length) {
        const c = CLICK_UP[this.clickLvl];
        if (this.gems >= c) { this.gems -= c; this.clickLvl++; G.sfx('power'); } else G.sfx('hit', .3);
      }
      if (x > 160 && x < 300 && y > 400 && y < 440 && this.total >= this.deeper()) {
        this.depth++; this.gems = 0; this.owned = GENS.map(() => 0); this.clickLvl = 0; G.sfx('boom'); G.shake(10, .6);
        G.popText(this.parts, CX, CY - 100, `DEPTH ${this.depth}: +50% forever`, '#ffcf5c', 18); this.persist();
      }
    },
    update(dt) {
      const r = this.rate();
      this.gems += r * dt; this.total += r * dt;
      this.frenzy -= dt; this.pulse -= dt; this.awayT -= dt;
      if (this.vein && (this.vein.t -= dt) <= 0) this.vein = null;
      if ((this.veinT -= dt) <= 0) { this.veinT = 45 + G.rnd(45); this.vein = {x: 40 + G.rnd(220), y: 110 + G.rnd(250), t: 8}; G.sfx('select'); }
      G.score = Math.floor(this.total);
      if ((this.saveT -= dt) <= 0) { this.saveT = 3; this.persist(); G.record(); }
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      const bg = ctx.createRadialGradient(CX, CY, 20, CX, CY, 380);
      bg.addColorStop(0, '#2a2240'); bg.addColorStop(1, '#0e0b18');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.04)';
      for (let i = 0; i < 26; i++) { const x = (i * 71) % 300, y = 40 + (i * 113) % 420; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y + 6); ctx.lineTo(x + 6, y + 22); ctx.fill(); }
      const s = 1 + Math.max(0, this.pulse) * 1.2 + Math.sin(now * 2) * .02;
      ctx.save(); ctx.translate(CX, CY); ctx.scale(s, s);
      G.circle(0, 0, CR + 22, this.frenzy > 0 ? 'rgba(255,207,92,.18)' : 'rgba(94,230,193,.12)');
      const facets = [['#7ff0d2', [[0, -CR], [CR * .7, -CR * .2], [0, CR * .1]]], ['#4fd1b0', [[0, -CR], [0, CR * .1], [-CR * .7, -CR * .2]]], ['#2fb89a', [[-CR * .7, -CR * .2], [0, CR * .1], [0, CR]]], ['#5ee6c1', [[CR * .7, -CR * .2], [0, CR], [0, CR * .1]]]];
      for (const [c, pts] of facets) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(-6, -CR + 14); ctx.lineTo(16, -CR * .45); ctx.lineTo(0, -CR * .3); ctx.fill();
      ctx.restore();
      if (this.vein) { const b = 1 + Math.sin(now * 8) * .15; G.circle(this.vein.x, this.vein.y, 22 * b, 'rgba(255,207,92,.3)'); G.gem(this.vein.x, this.vein.y, 14 * b, '#ffcf5c'); }
      G.text(`${fmt(this.gems)} gems`, CX, 52, {size: 24, align: 'center', display: true, color: '#7ff0d2', shadow: true});
      G.text(`${fmt(this.rate())} per second${this.frenzy > 0 ? '  ·  FRENZY x7' : ''}`, CX, 74, {size: 13, align: 'center', weight: 700, color: this.frenzy > 0 ? '#ffcf5c' : '#c4c8ee'});
      G.text(`+${fmt(this.clickPower())} per tap`, CX, 330, {size: 12, align: 'center', color: '#9aa0c8'});
      if (this.frenzy > 0) G.bar({x: 50, y: 344, w: 200, h: 8, v: this.frenzy, max: 12, color: '#ffcf5c'});
      G.bar({x: 24, y: 366, w: 252, h: 14, v: this.total, max: this.deeper(), color: '#8b7bff', label: `DEPTH ${this.depth} → ${fmt(this.deeper())}`, id: 'depth'});
      const cu = this.clickLvl < CLICK_UP.length;
      G.rr(14, 400, 136, 40, 10, cu && this.gems >= CLICK_UP[this.clickLvl] ? '#2f8f5c' : '#2b2f55');
      G.text(cu ? 'Sharper picks' : 'Picks maxed', 82, 416, {size: 12, align: 'center', weight: 700});
      if (cu) G.text(`x2 tap · ${fmt(CLICK_UP[this.clickLvl])}`, 82, 432, {size: 11, align: 'center', color: '#ffcf5c'});
      const can = this.total >= this.deeper();
      G.rr(160, 400, 140, 40, 10, can ? '#8b5cd6' : '#2b2f55');
      G.text('Dig deeper', 230, 416, {size: 12, align: 'center', weight: 700, color: can ? '#ffffff' : '#6b6f99'});
      G.text(can ? 'reset for +50%' : `at ${fmt(this.deeper())} mined`, 230, 432, {size: 11, align: 'center', color: '#c4c8ee'});
      G.text('DIGGERS', 324, 44, {size: 11, weight: 700, color: '#9aa0c8'});
      GENS.forEach((g, i) => {
        const y = 58 + i * 50, c = this.cost(i), ok = this.gems >= c, locked = i > 0 && !this.owned[i - 1] && !this.owned[i];
        G.rr(314, y, 312, 44, 10, ok ? '#24294a' : '#1a1d33');
        if (ok) { ctx.strokeStyle = 'rgba(94,230,193,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(314, y, 312, 44, 10); ctx.stroke(); }
        G.rr(322, y + 8, 28, 28, 7, locked ? '#3a3f5c' : g.color);
        G.text(locked ? '???' : g.name, 360, y + 20, {size: 13, weight: 700, color: locked ? '#6b6f99' : '#e8e9ff'});
        G.text(`${fmt(g.rate * (1 + this.depth * .5))}/s each`, 360, y + 36, {size: 11, color: '#9aa0c8'});
        G.text(`${fmt(c)}`, 616, y + 20, {size: 13, align: 'right', weight: 700, color: ok ? '#ffcf5c' : '#ff6b8b'});
        G.text(`owned ${this.owned[i]}`, 616, y + 36, {size: 11, align: 'right', color: '#9aa0c8'});
      });
      G.text(`Lifetime: ${fmt(this.total)} gems`, 470, H - 14, {size: 11, align: 'center', color: '#6b6f99'});
      G.fx(this.parts, dt);
      if (this.awayT > 0) { ctx.globalAlpha = Math.min(1, this.awayT); G.panel(W / 2 - 150, 200, 300, 60, 12, 'rgba(12,16,40,.92)'); G.text('While you were away', W / 2, 224, {size: 13, align: 'center', color: '#c4c8ee'}); G.text(`+${fmt(this.away)} gems`, W / 2, 248, {size: 18, align: 'center', weight: 700, color: '#7ff0d2'}); ctx.globalAlpha = 1; }
    }
  });
})();

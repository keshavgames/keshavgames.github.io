(() => {
  const COLORS = ['#ff6b8b', '#5ee6c1', '#ffcf5c', '#8b7bff', '#5cb8ff', '#ff9f5c', '#e86bff', '#b5f25c'];
  // regular polygons: [sides, rotation, size factor]; 1 is a circle and 5 a star
  const POLY = {0: [4, -Math.PI / 2, 1], 2: [3, -Math.PI / 2, 1], 3: [4, Math.PI / 4, .9], 4: [6, 0, .9], 6: [5, -Math.PI / 2, .95], 7: [8, Math.PI / 8, .9]};
  const SIZE = 105, GAP = 12, TOP = 40;

  function shape(ctx, k, r) {
    ctx.fillStyle = COLORS[k]; ctx.beginPath();
    if (k === 1) ctx.arc(0, 0, r * .8, 0, Math.PI * 2);
    else if (k === 5) for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    else { const [n, rot, f] = POLY[k]; for (let i = 0; i < n; i++) { const a = rot + i * Math.PI * 2 / n; ctx.lineTo(Math.cos(a) * r * f, Math.sin(a) * r * f); } }
    ctx.closePath(); ctx.fill();
  }

  GameBox.register({
    id: 'memory', title: 'Gem Pairs', genre: 'Puzzle', kind: 'Memory cards', w: 480, h: 520, cursor: 'pointer',
    desc: 'Flip two cards at a time to find matching gems. Every match adds three seconds and builds a streak multiplier; a wrong pair costs two seconds and resets the streak. Clear the board for a fresh deal.',
    controls: [['Click / Tap', 'Flip a card']],
    info() { return `Board ${this.board} · Streak x${this.mult()}`; },
    mult() { return Math.min(1 + this.streak, 5); },
    init() { this.time = 45; this.board = 0; this.streak = 0; this.parts = []; this.deal(); },
    deal() {
      this.board++;
      this.cards = G.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7])
        .map((k, i) => ({k, col: i % 4, row: Math.floor(i / 4), open: false, done: false, f: 0}));
      this.picked = []; this.hide = 0; this.next = 0;
    },
    at(c) { return [GAP + c.col * (SIZE + GAP), TOP + GAP + c.row * (SIZE + GAP)]; },
    pointer(type, x, y) {
      if (type !== 'down' || this.hide > 0 || this.next > 0) return;
      const c = this.cards.find(c => {
        const [cx, cy] = this.at(c);
        return !c.open && !c.done && x >= cx && x <= cx + SIZE && y >= cy && y <= cy + SIZE;
      });
      if (!c) return;
      c.open = true; this.picked.push(c); G.sfx('click');
      if (this.picked.length < 2) return;
      const [a, b] = this.picked;
      if (a.k === b.k) {
        a.done = b.done = true; this.picked = [];
        const gain = 100 * this.mult();
        G.score += gain; this.time += 3; this.streak++;
        for (const m of [a, b]) { const [cx, cy] = this.at(m); G.burst(this.parts, cx + SIZE / 2, cy + SIZE / 2, COLORS[m.k], 10); }
        const [cx, cy] = this.at(b); G.popText(this.parts, cx + SIZE / 2, cy + 20, '+' + gain);
        G.sfx('coin');
        if (this.cards.every(c => c.done)) { G.score += 250; this.next = .7; G.sfx('win'); }
      } else { this.hide = .7; this.streak = 0; this.time -= 2; G.sfx('hit', .5); }
    },
    update(dt) {
      if ((this.time -= dt) <= 0) { this.time = 0; return G.end("Time's up"); }
      if (this.hide > 0 && (this.hide -= dt) <= 0) { for (const c of this.picked) c.open = false; this.picked = []; }
      if (this.next > 0 && (this.next -= dt) <= 0) this.deal();
    },
    draw(ctx, dt) {
      G.clear('#0b0d1f');
      G.rr(0, 0, G.W, TOP, 0, '#0d1030');
      for (const c of this.cards) {
        c.f += ((c.open || c.done ? 1 : 0) - c.f) * Math.min(1, dt * 14);
        const [x, y] = this.at(c), face = c.f > .5;
        ctx.save(); ctx.translate(x + SIZE / 2, y + SIZE / 2); ctx.scale(Math.max(Math.abs(Math.cos(Math.PI * c.f)), .03), 1);
        ctx.fillStyle = face ? (c.done ? '#173a37' : '#1f2448') : '#2c2470';
        ctx.beginPath(); ctx.roundRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 14); ctx.fill();
        if (face) shape(ctx, c.k, 30);
        else {
          ctx.strokeStyle = '#4a3fa0'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(-SIZE / 2 + 8, -SIZE / 2 + 8, SIZE - 16, SIZE - 16, 9); ctx.stroke();
          G.gem(0, 0, 10, '#4a3fa0');
        }
        ctx.restore();
      }
      G.fx(this.parts, dt);
      G.bar({x: 14, y: 13, w: 260, h: 15, v: this.time, max: 60, color: this.time < 10 ? '#ff6b8b' : '#ffcf5c', label: `TIME ${Math.ceil(this.time)}s`, id: 'time'});
      G.text(`Streak x${this.mult()}`, G.W - 14, 26, {align: 'right', color: this.streak ? '#5ee6c1' : '#9aa0c8'});
    }
  });
})();

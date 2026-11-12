GameBox.register({
  id: 'snake', title: 'Gem Snake', genre: 'Arcade', kind: 'Classic snake', w: 480, h: 520,
  desc: 'Eat gems to grow longer and refill your energy bar before it runs dry. Every sixth gem drops a golden gem worth five times as much, but it fades fast. Walls and your own tail end the run.',
  controls: [['W A S D / Arrows', 'Steer'], ['P', 'Pause']],
  N: 24, TOP: 40,
  info() { return `Length ${this.body.length}`; },
  init() {
    this.body = [{x: 12, y: 12}, {x: 11, y: 12}, {x: 10, y: 12}];
    this.prev = this.body.map(c => ({...c}));
    this.dir = {x: 1, y: 0}; this.queue = []; this.t = 0; this.step = 0.12; this.parts = [];
    this.energy = 100; this.eaten = 0; this.gold = null; this.food = null;
    this.food = this.place();
  },
  free(p) {
    return !this.body.some(c => c.x === p.x && c.y === p.y) && !(this.food && this.food.x === p.x && this.food.y === p.y) && !(this.gold && this.gold.x === p.x && this.gold.y === p.y);
  },
  place() {
    let p;
    do p = {x: Math.floor(G.rnd(this.N)), y: Math.floor(G.rnd(this.N))}; while (!this.free(p));
    return p;
  },
  key(k) {
    const m = {ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0]}[k];
    if (!m) return;
    const prev = this.queue.at(-1) || this.dir;
    if (m[0] === -prev.x && m[1] === -prev.y) return; // no instant reverse into your own neck
    if ((m[0] !== prev.x || m[1] !== prev.y) && this.queue.length < 3) this.queue.push({x: m[0], y: m[1]});
  },
  update(dt) {
    this.energy -= dt * (5 + this.body.length * .06);
    if (this.energy <= 0) { this.energy = 0; G.flash(); return G.end('Out of energy'); }
    if (this.gold && (this.gold.t -= dt) <= 0) this.gold = null;
    this.t += dt;
    while (this.t >= this.step) {
      this.t -= this.step;
      if (this.queue.length) this.dir = this.queue.shift();
      const h = {x: this.body[0].x + this.dir.x, y: this.body[0].y + this.dir.y};
      // the tail moves away this step, so it is not an obstacle
      const bite = this.body.some((c, i) => i < this.body.length - 1 && c.x === h.x && c.y === h.y);
      if (h.x < 0 || h.y < 0 || h.x >= this.N || h.y >= this.N || bite) {
        this.t = this.step; G.shake(8); G.flash(); G.sfx('hurt'); return G.end();
      }
      this.prev = this.body.map(c => ({...c}));
      this.body.unshift(h);
      const s = G.W / this.N, cx = (h.x + .5) * s, cy = (h.y + .5) * s + this.TOP;
      if (this.gold && h.x === this.gold.x && h.y === this.gold.y) {
        G.score += 50; this.energy = 100; this.gold = null;
        G.burst(this.parts, cx, cy, '#ffcf5c', 22); G.popText(this.parts, cx, cy - 12, '+50'); G.sfx('power');
      } else if (h.x === this.food.x && h.y === this.food.y) {
        G.score += 10; this.energy = Math.min(100, this.energy + 30); this.eaten++;
        this.step = Math.max(0.06, this.step * 0.97);
        G.burst(this.parts, cx, cy, '#ff6b8b'); G.sfx('coin');
        this.food = this.place();
        if (this.eaten % 6 === 0 && !this.gold) this.gold = {...this.place(), t: 6};
      } else this.body.pop();
    }
  },
  draw(ctx, dt) {
    const s = G.W / this.N, a = Math.min(this.t / this.step, 1), T = this.TOP, now = performance.now();
    G.clear('#0d1030');
    G.bar({x: 14, y: 13, w: 220, h: 15, v: this.energy, max: 100, color: this.energy < 30 ? '#ff6b8b' : '#5ee6c1', label: 'ENERGY', id: 'energy'});
    G.text(`Gems ${this.eaten}`, G.W - 14, 26, {align: 'right', color: '#9aa0c8'});
    ctx.save(); ctx.translate(0, T);
    ctx.fillStyle = '#0a0c1e'; ctx.fillRect(0, 0, G.W, G.W);
    ctx.fillStyle = '#10142e';
    for (let y = 0; y < this.N; y++) for (let x = y % 2; x < this.N; x += 2) ctx.fillRect(x * s, y * s, s, s);
    G.gem((this.food.x + .5) * s, (this.food.y + .5) * s, s * .42 * (1 + Math.sin(now / 180) * .08), '#ff6b8b');
    if (this.gold && (this.gold.t > 2 || Math.floor(now / 120) % 2)) {
      const gx = (this.gold.x + .5) * s, gy = (this.gold.y + .5) * s;
      ctx.strokeStyle = 'rgba(255,207,92,.5)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, s * .7 + Math.sin(now / 120) * 2, 0, Math.PI * 2); ctx.stroke();
      G.gem(gx, gy, s * .48, '#ffcf5c');
    }
    // glide each segment from its last cell to its current one so movement looks smooth
    for (let i = this.body.length - 1; i >= 0; i--) {
      const c = this.body[i], p = this.prev[i] || this.prev[i - 1] || c;
      const x = (p.x + (c.x - p.x) * a) * s, y = (p.y + (c.y - p.y) * a) * s;
      ctx.fillStyle = i ? `hsl(162 62% ${Math.max(34, 56 - i)}%)` : '#7ff0d2';
      ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, s - 3, s - 3, 6); ctx.fill();
      if (!i) { // eyes look where the snake is heading
        const ex = x + s / 2 + this.dir.x * 4, ey = y + s / 2 + this.dir.y * 4;
        G.circle(ex - this.dir.y * 4, ey - this.dir.x * 4, 2.2, '#0a0c1e');
        G.circle(ex + this.dir.y * 4, ey + this.dir.x * 4, 2.2, '#0a0c1e');
      }
    }
    ctx.restore();
    G.fx(this.parts, dt);
  }
});

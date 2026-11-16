(() => {
  // A squishy pop-it board. Free popping is always fine; each level asks you to pop a pattern before the timer.
  const W = 640, H = 600;
  const SHAPES = ['round', 'heart', 'star', 'square', 'rainbow'];
  const inShape = (s, u, v) => { // u, v in -1..1
    if (s === 'round') return u * u + v * v < .95;
    if (s === 'square') return Math.abs(u) < .9 && Math.abs(v) < .9;
    if (s === 'heart') { const x = u * 1.1, y = -v * 1.1 + .3; return (x * x + y * y - .6) ** 3 - x * x * y ** 3 < 0; }
    if (s === 'star') { const a = Math.atan2(v, u), r = Math.hypot(u, v), k = .55 + .4 * Math.abs(Math.cos(a * 2.5)); return r < k; }
    return v < .6 && u * u + (v - .6) ** 2 < .95 && u * u + (v - .6) ** 2 > .25; // rainbow arch
  };

  GameBox.register({
    id: 'popit', title: 'Pop It', genre: 'Casual', kind: 'Fidget popper', w: W, h: H, levels: 30, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Pop the glowing bubbles before the timer runs out! Popping others is fine, it just feels nice.',
    desc: 'A squishy rainbow pop-it in five shapes. Press the bubbles to pop them with a satisfying sound, then flip the board to pop them all again. Each level lights up a pattern to pop before time runs out, faster and bigger each time. Or just pop for fun. Thirty levels.',
    controls: [['Click / drag', 'Pop bubbles'], ['F', 'Flip the board']],
    info() { return `Level ${G.level} · ${this.got}/${this.need}`; },
    init() {
      const n = G.level, R = G.seeded(n * 13 + 5); this.shape = SHAPES[(n - 1) % SHAPES.length]; this.N = Math.min(11, 6 + Math.floor(n / 6)); this.bubbles = [];
      const s = 440 / this.N; for (let y = 0; y < this.N; y++) for (let x = 0; x < this.N; x++) { const u = (x + .5) / this.N * 2 - 1, v = (y + .5) / this.N * 2 - 1; if (inShape(this.shape, u, v)) this.bubbles.push({x: W / 2 + u * 220, y: 330 + v * 220, r: s * .42, popped: false, hue: (x + y * .6) * 360 / (this.N * 1.6), anim: 0}); }
      const want = Math.min(this.bubbles.length, 5 + n * 2); R.shuffle(this.bubbles).slice(0, want).forEach(b => b.target = true); this.need = want; this.got = 0;
      this.time = 15 + want * .9; this.flipT = 0; this.done = null; this.t = 0; this.dragged = new Set();
    },
    pop(b) {
      if (b.popped) return; b.popped = true; b.anim = .2; const n = 300 + (b.hue % 360) * 1.6; G.note(n, .08, {type: 'sine', vol: .14}); G.note(n * .5, .05, {type: 'triangle', vol: .06});
      if (b.target && !this.done) { this.got++; G.score += 20; if (this.got >= this.need) { G.party(); G.score += 200 + Math.round(this.time) * 10; this.done = {t: 1, go: () => G.win(this.time > this.need * .6 ? 3 : this.time > 3 ? 2 : 1, 'Pattern popped!')}; } }
    },
    flip() { this.bubbles.forEach(b => { b.popped = false; b.anim = .15; }); this.flipT = .3; G.sfx('swing'); },
    hit(x, y) { for (const b of this.bubbles) if (Math.hypot(x - b.x, y - b.y) < b.r) { if (!this.dragged.has(b)) { this.dragged.add(b); this.pop(b); } } },
    pointer(type, x, y) { if (type === 'down') { this.dragged = new Set(); this.hit(x, y); } if (type === 'move' && G.pointer.down) this.hit(x, y); },
    key(k) { if (k === 'f') this.flip(); },
    update(dt) {
      this.t += dt; this.flipT -= dt; for (const b of this.bubbles) b.anim = Math.max(0, b.anim - dt);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if ((this.time -= dt) <= 0) this.done = {t: .6, go: () => G.end(`${this.got} of ${this.need} popped`)};
    },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#ffe0f0'); g.addColorStop(1, '#e0e8ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const squish = this.flipT > 0 ? 1 - Math.sin(this.flipT / .3 * Math.PI) * .15 : 1;
      ctx.save(); ctx.translate(W / 2, 330); ctx.scale(1, squish); ctx.translate(-W / 2, -330);
      for (const b of this.bubbles) G.circle(b.x, b.y + 4, b.r + 6, 'rgba(0,0,0,.08)');
      for (const b of this.bubbles) G.circle(b.x, b.y, b.r + 6, `hsl(${b.hue},70%,72%)`);
      for (const b of this.bubbles) {
        const c = `hsl(${b.hue},80%,${b.popped ? 58 : 66}%)`, press = b.anim > 0 ? b.anim / .2 : 0;
        if (b.popped) { G.circle(b.x, b.y, b.r * .92, `hsl(${b.hue},70%,50%)`); G.circle(b.x, b.y + b.r * .15, b.r * .7, `hsl(${b.hue},75%,58%)`); }
        else { G.circle(b.x, b.y, b.r * (1 - press * .2), c); G.circle(b.x - b.r * .3, b.y - b.r * .3, b.r * .3, 'rgba(255,255,255,.55)'); }
        if (b.target && !b.popped && !this.done) { ctx.strokeStyle = `rgba(255,255,255,${.6 + Math.sin(this.t * 6) * .4})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2); ctx.stroke(); }
      }
      ctx.restore();
      G.text(`${this.got} / ${this.need}`, W / 2, 56, {size: 36, align: 'center', display: true, color: '#7a4a9a'});
      G.rr(W / 2 - 150, 74, 300, 10, 5, 'rgba(0,0,0,.08)'); G.rr(W / 2 - 150, 74, 300 * Math.max(0, this.time) / (15 + this.need * .9), 10, 5, this.time < 5 ? '#ff6b8b' : '#a07aff');
      G.text('F: flip it over', W - 20, H - 16, {size: 12, align: 'right', weight: 800, color: '#9a8ab8'});
    }
  });
})();

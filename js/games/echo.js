(() => {
  // Watch the lights, hear the tones, then play the sequence back. 50 levels of longer and faster sequences.
  const W = 640, H = 520, CX = W / 2, CY = 280;
  const PADS = [{c: '#3fd07a', d: '#1a6a3a', n: 64}, {c: '#ff5b6b', d: '#7a2030', n: 69}, {c: '#ffd04a', d: '#7a6018', n: 72}, {c: '#4aa8ff', d: '#1a4a80', n: 76}, {c: '#b07bff', d: '#4a2a80', n: 79}, {c: '#ff9f43', d: '#7a4818', n: 81}];

  GameBox.register({
    id: 'echo', title: 'Echo Lights', genre: 'Music', kind: 'Memory tones', w: W, h: H, levels: 50, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Watch which lights glow and listen. Then press them in the same order!',
    desc: 'Glowing pads play a tune of lights and tones. Watch, listen, then play it back in the same order. Every level the tune gets longer and quicker, and later levels add more pads. Use the number keys or click the pads. Fifty levels for super memories.',
    controls: [['1-6 / click', 'Press a pad'], ['Space', 'Hear the tune again (once per level)']],
    info() { return `Level ${G.level} · ${this.pos}/${this.seq.length}`; },
    init() {
      const n = G.level, R = G.seeded(n * 41 + 7);
      this.count = n < 8 ? 4 : n < 20 ? 5 : 6;
      const len = 2 + Math.ceil(n * .55);
      this.seq = []; for (let i = 0; i < len; i++) { let p; do p = R.int(this.count); while (i > 1 && p === this.seq[i - 1] && p === this.seq[i - 2]); this.seq.push(p); }
      this.gap = Math.max(.28, .7 - n * .01); this.pos = 0; this.mode = 'show'; this.showT = -.8; this.lit = -1; this.litT = 0; this.replay = 1; this.mistakes = 0; this.done = null; this.t = 0; this.parts = [];
    },
    padAt(i) { const a = -Math.PI / 2 + i / this.count * Math.PI * 2, r = 150; return {x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, r: this.count > 4 ? 62 : 74}; },
    light(i, dur = .3) { this.lit = i; this.litT = dur; G.note(G.midi(PADS[i].n), dur + .15, {type: 'sine', vol: .18}); G.note(G.midi(PADS[i].n + 12), dur, {type: 'triangle', vol: .04}); },
    press(i) {
      if (this.mode !== 'play' || this.done || i >= this.count) return;
      this.light(i, .22);
      if (i === this.seq[this.pos]) {
        this.pos++; G.score += 10;
        if (this.pos === this.seq.length) { this.mode = 'win'; G.party(); G.score += 100 + G.level * 20; this.done = {t: 1, go: () => G.win(this.mistakes === 0 ? 3 : 2, 'Perfect echo!')}; }
      } else {
        this.mistakes++; G.sfx('hurt'); G.shake(5, .2);
        if (this.mistakes >= 2) { this.mode = 'lose'; this.done = {t: 1, go: () => G.end('Oops, wrong light!')}; }
        else { this.mode = 'show'; this.pos = 0; this.showT = -.9; this.msg = 'Not quite! Watch again…'; this.msgT = 1.5; }
      }
    },
    key(k) { const i = '123456'.indexOf(k); if (i >= 0) this.press(i); if (k === ' ' && this.mode === 'play' && this.replay > 0) { this.replay--; this.mode = 'show'; this.pos = 0; this.showT = -.4; } },
    pointer(type, x, y) { if (type !== 'down') return; for (let i = 0; i < this.count; i++) { const p = this.padAt(i); if (Math.hypot(x - p.x, y - p.y) < p.r) this.press(i); } },
    update(dt) {
      this.t += dt; this.litT -= dt; this.msgT -= dt; if (this.litT <= 0) this.lit = -1;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.mode === 'show') {
        const before = this.showT; this.showT += dt;
        const step = Math.floor(this.showT / this.gap), prev = Math.floor(before / this.gap);
        if (this.showT >= 0 && step !== prev && step < this.seq.length) this.light(this.seq[step], this.gap * .7);
        if (step >= this.seq.length) { this.mode = 'play'; this.pos = 0; }
      }
    },
    draw(ctx, dt) {
      const bg = ctx.createRadialGradient(CX, CY, 40, CX, CY, 420); bg.addColorStop(0, '#2a2450'); bg.addColorStop(1, '#0c0a1e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) G.circle((i * 157) % W, (i * 91) % H, 1 + (i % 3) * .5, `rgba(255,255,255,${.2 + .2 * Math.sin(this.t * 2 + i)})`);
      G.circle(CX, CY, 70, '#16122e'); G.circle(CX, CY, 60, '#221c44');
      G.text(this.mode === 'show' ? 'WATCH' : this.mode === 'play' ? 'YOUR TURN' : this.mode === 'win' ? 'YES!' : 'OH NO', CX, CY + 7, {size: 18, align: 'center', weight: 800, color: this.mode === 'play' ? '#ffcf5c' : '#cfd4ff'});
      for (let i = 0; i < this.count; i++) {
        const p = this.padAt(i), on = this.lit === i, pad = PADS[i];
        if (on) { const g = ctx.createRadialGradient(p.x, p.y, p.r * .3, p.x, p.y, p.r * 1.8); g.addColorStop(0, pad.c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); }
        G.circle(p.x + 4, p.y + 6, p.r, 'rgba(0,0,0,.35)'); G.circle(p.x, p.y, p.r, on ? pad.c : pad.d); G.circle(p.x - p.r * .3, p.y - p.r * .3, p.r * .35, `rgba(255,255,255,${on ? .5 : .12})`);
        G.text(String(i + 1), p.x, p.y + 8, {size: 22, align: 'center', weight: 800, color: on ? '#fff' : 'rgba(255,255,255,.5)'});
      }
      for (let i = 0; i < this.seq.length; i++) { const x = CX - this.seq.length * 9 + i * 18 + 9; G.circle(x, 34, 6, i < this.pos ? PADS[this.seq[i]].c : 'rgba(255,255,255,.18)'); }
      G.text(`LEVEL ${G.level}`, 18, 30, {size: 14, weight: 800, color: '#cfd4ff'});
      if (this.mode === 'play' && this.replay) G.text('Space: hear it again', W - 16, H - 16, {size: 12, align: 'right', weight: 700, color: 'rgba(207,212,255,.6)'});
      if (this.msgT > 0) G.text(this.msg, CX, H - 30, {size: 18, align: 'center', weight: 800, color: '#ff9fb0'});
    }
  });
})();

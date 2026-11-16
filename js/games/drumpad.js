(() => {
  // Listen to a short drum groove, then play it back in time on eight pads.
  const W = 720, H = 520;
  const PADS = [['kick', 'Kick', '#ff5b6b', 'a'], ['snare', 'Snare', '#ffcf5c', 's'], ['hat', 'Hi-hat', '#5ee6c1', 'd'], ['clap', 'Clap', '#b07bff', 'f'], ['tom', 'Tom', '#ff9f43', 'j'], ['openhat', 'Open hat', '#4aa8ff', 'k'], ['cymbal', 'Crash', '#e8e8f0', 'l'], ['cow', 'Cowbell', '#9ad84a', ';']];

  function groove(n) { // simple bars that grow: kick and snare first, then hats, claps and fills
    const R = G.seeded(n * 31 + 3), steps = n < 6 ? 8 : 16, hits = [], kinds = Math.min(8, 2 + Math.floor(n / 3));
    for (let s = 0; s < steps; s++) {
      if (s % (steps / 2) === 0) hits.push({s, p: 0});
      if (s % (steps / 2) === steps / 4) hits.push({s, p: 1});
      if (kinds > 2 && s % 2 === 1 && R() < .5) hits.push({s, p: 2});
      if (kinds > 3 && R() < .1) hits.push({s, p: 3 + R.int(Math.min(5, kinds - 3))});
    }
    const uniq = new Map(); for (const h of hits) uniq.set(h.s + ':' + h.p, h); // one hit per step and pad
    const byStep = new Map(); for (const h of uniq.values()) if (!byStep.has(h.s)) byStep.set(h.s, h); // one pad per step keeps it playable
    return {steps, hits: [...byStep.values()].sort((a, b) => a.s - b.s)};
  }

  GameBox.register({
    id: 'drumpad', title: 'Drum Pad', genre: 'Music', kind: 'Copy the beat', w: W, h: H, levels: 30, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Listen to the groove, then play it back on the pads in time with the clicks!',
    desc: 'A drum machine with eight pads. Each level plays a short groove while the pads light up. Then it is your turn: play it back in time with the metronome. The closer you are to the beat, the more stars you get. Grooves get longer and busier over thirty levels. Free play any time between turns.',
    controls: [['A S D F J K L ;', 'Hit pads 1 to 8'], ['Click / tap', 'Hit a pad'], ['Space', 'Hear the groove again']],
    info() { return `Groove ${G.level} · ${this.mode === 'play' ? 'your turn' : 'listen'}`; },
    init() {
      const g = groove(G.level); this.g = g; this.bpm = 84 + Math.min(40, G.level * 2); this.step = 60 / this.bpm / 2;
      this.mode = 'listen'; this.t = -1; this.lit = {}; this.taps = []; this.done = null; this.parts = []; this.score2 = null; this.tries = 0;
    },
    hit(p) {
      const k = PADS[p][0]; G.drum(k); this.lit[p] = .18;
      if (this.mode === 'play' && this.t >= -this.step) this.taps.push({p, t: this.t});
    },
    key(k) { const i = PADS.findIndex(q => q[3] === k.toLowerCase()); if (i >= 0) this.hit(i); if (k === ' ' && this.mode === 'play' && this.t < 0) { this.mode = 'listen'; this.t = -.6; } },
    pointer(type, x, y) { if (type !== 'down') return; for (let i = 0; i < 8; i++) { const [px, py] = this.padXY(i); if (x > px && x < px + 150 && y > py && y < py + 120) this.hit(i); } },
    padXY(i) { return [30 + (i % 4) * 168, 210 + Math.floor(i / 4) * 140]; },
    judge() {
      const g = this.g; let good = 0, total = 0; const used = new Set();
      for (const h of g.hits) { total++; const at = h.s * this.step; const tp = this.taps.findIndex((q, k) => !used.has(k) && q.p === h.p && Math.abs(q.t - at) < .16); if (tp >= 0) { used.add(tp); good += Math.abs(this.taps[tp].t - at) < .08 ? 1 : .6; } }
      const extra = this.taps.length - used.size; return Math.max(0, (good - extra * .3) / total);
    },
    update(dt) {
      for (const k in this.lit) this.lit[k] -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      const before = this.t; this.t += dt; const len = this.g.steps * this.step;
      // metronome clicks on every beat in both phases
      const b0 = Math.floor(before / (this.step * 2)), b1 = Math.floor(this.t / (this.step * 2));
      if (b1 !== b0 && this.t >= 0 && this.t < len) G.note(b1 % 4 === 0 ? 1320 : 990, .04, {type: 'square', vol: .03});
      if (this.mode === 'listen') {
        for (const h of this.g.hits) { const at = h.s * this.step; if (before < at && this.t >= at) { G.drum(PADS[h.p][0]); this.lit[h.p] = .2; } }
        if (this.t > len + .3) { this.mode = 'play'; this.t = -this.step * 8; this.taps = []; }
      } else if (this.mode === 'play' && this.t > len + .3) {
        const s = this.judge(); this.score2 = s; this.tries++;
        if (s >= .55) { G.score += Math.round(s * 500) + G.level * 20; G.party(); this.mode = 'done'; this.done = {t: 1.4, go: () => G.win(s >= .9 ? 3 : s >= .72 ? 2 : 1, `${Math.round(s * 100)}% in time!`)}; }
        else if (this.tries < 3) { this.msg = `${Math.round(s * 100)}%: listen again!`; this.mode = 'listen'; this.t = -1; }
        else { this.mode = 'done'; this.done = {t: 1.4, go: () => G.end('Keep practising that groove')}; }
      }
    },
    draw(ctx, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c1830'); bg.addColorStop(1, '#2e2448'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // the groove grid
      const g = this.g, gx = 40, gw = W - 80, cw = gw / g.steps, len = g.steps * this.step;
      G.panel(gx - 10, 30, gw + 20, 140, 14, 'rgba(0,0,0,.3)');
      for (let s = 0; s < g.steps; s++) { ctx.fillStyle = s % 4 === 0 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'; ctx.fillRect(gx + s * cw + 2, 44, cw - 4, 112); }
      if (this.mode === 'listen' || this.score2 !== null) for (const h of g.hits) G.rr(gx + h.s * cw + 4, 48 + h.p * 13, cw - 8, 11, 4, PADS[h.p][2]);
      else for (const h of g.hits) G.rr(gx + h.s * cw + 4, 48 + h.p * 13, cw - 8, 11, 4, 'rgba(255,255,255,.18)');
      for (const tp of this.taps) { const x = gx + tp.t / this.step * cw; if (x >= gx - 4 && x <= gx + gw) G.circle(x + cw / 2, 54 + tp.p * 13, 5, '#fff'); }
      if (this.t >= 0 && this.t <= len) { const x = gx + this.t / len * gw; ctx.fillStyle = '#fff'; ctx.fillRect(x, 40, 3, 120); }
      G.text(this.mode === 'listen' ? 'LISTEN…' : this.mode === 'play' ? (this.t < 0 ? `GET READY… ${Math.ceil(-this.t / (this.step * 2))}` : 'YOUR TURN!') : '', W / 2, 196, {size: 18, align: 'center', weight: 800, color: this.mode === 'play' ? '#ffcf5c' : '#cfd4ff'});
      for (let i = 0; i < 8; i++) {
        const [x, y] = this.padXY(i), on = (this.lit[i] || 0) > 0, [, name, col, key] = PADS[i];
        G.rr(x + 3, y + 5, 150, 120, 18, 'rgba(0,0,0,.4)'); G.rr(x, y - (on ? 3 : 0), 150, 120, 18, on ? col : '#3a3458');
        G.rr(x + 8, y + 8 - (on ? 3 : 0), 134, 104, 14, on ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.04)');
        G.text(name, x + 75, y + 60, {size: 17, align: 'center', weight: 800, color: on ? '#1c1830' : col});
        G.text(key.toUpperCase(), x + 75, y + 90, {size: 13, align: 'center', weight: 800, color: on ? '#1c1830' : 'rgba(255,255,255,.4)'});
      }
      G.text(`GROOVE ${G.level}`, 20, 22, {size: 13, weight: 800, color: '#cfd4ff'}); G.text(`${this.bpm} BPM`, W - 20, 22, {size: 13, align: 'right', weight: 800, color: '#cfd4ff'});
      if (this.msg && this.mode === 'listen') G.text(this.msg, W / 2, H - 8, {size: 14, align: 'center', weight: 800, color: '#ff9fb0'});
    }
  });
})();

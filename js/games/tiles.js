(() => {
  // Tap the dark tiles as they fall; each one plays the next note of the song.
  const W = 480, H = 640, COLS = 4, KEYS = ['d', 'f', 'j', 'k'];
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // a major pentatonic, two octaves
  const HUES = [200, 280, 330, 20, 140, 45];

  function song(n) { // a seeded little tune: phrases that rise and fall, rests on the off beats
    const R = G.seeded(n * 97 + 5), len = 32 + Math.min(48, n * 2), notes = []; let deg = 4, t = 0;
    while (notes.length < len) {
      const phrase = 4 + R.int(5), dir = R() < .5 ? 1 : -1;
      for (let i = 0; i < phrase && notes.length < len; i++) {
        deg = Math.max(0, Math.min(SCALE.length - 1, deg + (R() < .75 ? dir : -dir) * (1 + (R() < .2 ? 1 : 0))));
        const hold = n > 5 && R() < Math.min(.25, n * .01) ? 2 : 1;
        notes.push({t, deg, hold}); t += hold;
      }
      t += R() < .3 ? 1 : 0;
    }
    // column by pitch so low notes sit left, but never the same column twice in a row
    let last = -1; for (const nt of notes) { let c = Math.min(3, Math.floor(nt.deg / 2.5)); if (c === last) c = (c + 1 + (nt.deg % 2)) % 4; nt.col = c; last = c; }
    return notes;
  }

  GameBox.register({
    id: 'tiles', title: 'Tile Tap', genre: 'Music', kind: 'Piano tiles', w: W, h: H, levels: 30, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Tap the dark tiles as they reach the line (D F J K or click). Each one plays the song!',
    desc: 'Dark tiles fall down four lanes, and every one you tap plays the next note of a little song. Hit them as they cross the line, hold the long ones, and never tap an empty lane. Thirty songs that start gentle and get quicker. Use D F J K or click the lanes.',
    controls: [['D F J K', 'Tap lanes 1 to 4'], ['Click / tap', 'Tap a lane']],
    info() { return `Song ${G.level} · ${this.hit}/${this.notes.length}`; },
    init() {
      this.notes = song(G.level); this.hit = 0; this.lives = 3; this.t = -2; this.flash = []; this.combo = 0; this.best = 0; this.done = null; this.parts = []; this.hue = HUES[(G.level - 1) % HUES.length];
      this.bpm = 92 + Math.min(80, G.level * 3); this.beat = 60 / this.bpm; this.speed = 260 + G.level * 6; this.holding = null; this.root = 60 + (G.level % 5);
    },
    lane(c) {
      if (this.done) return;
      const lineT = this.t, nt = this.notes.find(q => !q.done && !q.miss);
      if (nt && nt.col === c && Math.abs(nt.t * this.beat - lineT) < .28) {
        nt.done = true; this.hit++; this.combo++; this.best = Math.max(this.best, this.combo);
        G.note(G.midi(this.root + SCALE[nt.deg]), .5 + nt.hold * .3, {type: 'triangle', vol: .16}); G.note(G.midi(this.root + SCALE[nt.deg] - 12), .4, {type: 'sine', vol: .06});
        G.score += 10 + Math.min(40, this.combo); this.flash.push({c, t: .25, ok: true});
        if (nt.hold > 1) this.holding = {nt, c, until: (nt.t + nt.hold) * this.beat};
        if (this.hit === this.notes.length) this.finish();
      } else { this.wrong(c); }
    },
    wrong(c) { this.flash.push({c, t: .4, ok: false}); this.combo = 0; G.sfx('hurt', .5); G.shake(4, .15); if (--this.lives <= 0) this.done = {t: 1, go: () => G.end('Wrong note!')}; },
    finish() { const acc = this.lives; G.party(); this.done = {t: 1.2, go: () => G.win(acc === 3 ? 3 : acc === 2 ? 2 : 1, 'Song complete!')}; G.score += 300 + G.level * 20; },
    key(k) { const c = KEYS.indexOf(k.toLowerCase()); if (c >= 0) this.lane(c); },
    pointer(type, x) { if (type === 'down') this.lane(Math.max(0, Math.min(3, Math.floor(x / (W / COLS))))); },
    update(dt) {
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.t += dt;
      for (const nt of this.notes) if (!nt.done && !nt.miss && this.t - nt.t * this.beat > .3) { nt.miss = true; this.wrong(nt.col); break; }
      for (const f of this.flash) f.t -= dt; this.flash = this.flash.filter(f => f.t > 0);
    },
    draw(ctx, dt) {
      const lw = W / COLS, line = H - 120, hue = this.hue;
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, `hsl(${hue},45%,92%)`); bg.addColorStop(1, `hsl(${hue + 30},55%,84%)`); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let c = 1; c < COLS; c++) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(c * lw - 1, 0, 2, H); }
      for (const f of this.flash) { ctx.fillStyle = f.ok ? `rgba(255,255,255,${f.t * 2})` : `rgba(255,60,80,${f.t * 1.5})`; ctx.fillRect(f.c * lw, 0, lw, H); }
      for (const nt of this.notes) {
        const y = line - (nt.t * this.beat - this.t) * this.speed, h = Math.max(90, nt.hold * this.beat * this.speed) - 6;
        if (y < -h || y - h > H) continue;
        const x = nt.col * lw + 4;
        if (nt.done) { ctx.fillStyle = `hsla(${hue},40%,70%,.35)`; ctx.fillRect(x, y - h, lw - 8, h); continue; }
        const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, `hsl(${hue},45%,22%)`); g.addColorStop(1, nt.miss ? '#c43a4a' : `hsl(${hue},55%,12%)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y - h, lw - 8, h, 10); ctx.fill();
        if (nt.hold > 1) { ctx.fillStyle = `hsla(${hue},80%,70%,.6)`; ctx.fillRect(x + lw / 2 - 8, y - h + 10, 8, h - 20); }
        G.circle(x + (lw - 8) / 2, y - 22, 6, `hsla(${hue},90%,75%,.8)`);
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(0, line, W, 4);
      for (let c = 0; c < COLS; c++) { G.rr(c * lw + 10, line + 18, lw - 20, 56, 14, 'rgba(255,255,255,.55)'); G.text(KEYS[c].toUpperCase(), c * lw + lw / 2, line + 54, {size: 22, align: 'center', weight: 800, color: `hsl(${hue},40%,30%)`}); }
      G.text(`${this.hit}`, W / 2, 60, {size: 44, align: 'center', display: true, color: `hsl(${hue},45%,25%)`});
      if (this.combo > 4) G.text(`${this.combo} combo!`, W / 2, 92, {size: 16, align: 'center', weight: 800, color: `hsl(${hue + 40},70%,40%)`});
      for (let i = 0; i < 3; i++) G.text('♥', 20 + i * 24, 34, {size: 22, color: i < this.lives ? '#e84a6a' : 'rgba(0,0,0,.15)'});
      G.rr(W - 130, 20, 110, 10, 5, 'rgba(0,0,0,.12)'); G.rr(W - 130, 20, 110 * this.hit / this.notes.length, 10, 5, `hsl(${hue},60%,45%)`);
      if (this.t < 0) G.text(`Song ${G.level}`, W / 2, H / 2 - 40, {size: 36, align: 'center', display: true, color: `hsl(${hue},45%,25%)`});
    }
  });
})();

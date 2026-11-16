(() => {
  // A 16-step beat and melody maker. Click cells to turn them on; your song is saved in the browser.
  const W = 800, H = 500, STEPS = 16;
  const ROWS = [['Kick', 'kick', '#ff5b6b'], ['Snare', 'snare', '#ffcf5c'], ['Clap', 'clap', '#b07bff'], ['Hi-hat', 'hat', '#5ee6c1'], ['Bass', 'bass', '#4aa8ff'], ['Lead', 'lead', '#ff9f43']];
  const BASS = [36, 36, 43, 41], LEAD = [72, 74, 76, 79, 81, 84];
  const PRESETS = {
    'Bouncy': ['1000100010001000', '0000100000001000', '0000000000000000', '1010101010101010', '1000001010000010', '0010000000100100'],
    'Robot': ['1000000110000000', '0000100000001000', '0000000000001010', '0110011001100110', '1001001010010010', '1000100000101000'],
    'Chill': ['1000000000100000', '0000100000000000', '0000000000001000', '1000100010001000', '1000000010000000', '0001000000010010']
  };
  const SAVE = 'gamebox-beatmaker';

  GameBox.register({
    id: 'beatmaker', title: 'Beat Maker', genre: 'Music', kind: 'Music maker', w: W, h: H, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Click the squares to make a beat, then press Play! Try the presets for ideas.',
    desc: 'Make your own songs. Six rows of sounds, sixteen steps that loop forever: kick, snare, clap, hi-hat, a bass line and a lead melody. Click squares to switch them on, change the speed, try a preset or press Random for a surprise. Your beat is saved for next time.',
    controls: [['Click a square', 'Turn a sound on or off'], ['Space', 'Play / stop'], ['Up Down', 'Speed'], ['C', 'Clear']],
    info() { return `${this.bpm} BPM · ${this.playing ? 'playing' : 'stopped'}`; },
    init() {
      let saved = null; try { saved = JSON.parse(localStorage.getItem(SAVE)); } catch {}
      this.grid = saved?.grid || PRESETS.Bouncy.map(r => r.split('').map(Number)); this.bpm = saved?.bpm || 110;
      this.playing = true; this.pos = -1; this.acc = 0; this.flash = {}; this.t = 0;
    },
    persist() { try { localStorage.setItem(SAVE, JSON.stringify({grid: this.grid, bpm: this.bpm})); } catch {} },
    play(row, step) {
      const kind = ROWS[row][1];
      if (kind === 'bass') G.note(G.midi(BASS[Math.floor(step / 4)]), .3, {type: 'sawtooth', vol: .08});
      else if (kind === 'lead') G.note(G.midi(LEAD[(step * 3 + row) % LEAD.length]), .22, {type: 'square', vol: .045});
      else G.drum(kind, .9);
    },
    key(k) {
      if (k === ' ') this.playing = !this.playing;
      if (k === 'ArrowUp') this.bpm = Math.min(180, this.bpm + 5); if (k === 'ArrowDown') this.bpm = Math.max(60, this.bpm - 5);
      if (k === 'c') { this.grid = ROWS.map(() => new Array(STEPS).fill(0)); this.persist(); }
      this.persist();
    },
    cell(x, y) { const gx = 130, gy = 70, cw = 40, ch = 52; const s = Math.floor((x - gx) / cw), r = Math.floor((y - gy) / ch); return s >= 0 && s < STEPS && r >= 0 && r < ROWS.length ? [r, s] : null; },
    pointer(type, x, y) {
      if (type !== 'down') return;
      const c = this.cell(x, y);
      if (c) { const [r, s] = c; this.grid[r][s] ^= 1; if (this.grid[r][s]) this.play(r, s); this.persist(); return; }
      const btns = this.buttons();
      for (const b of btns) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + 40) { b.go(); this.persist(); G.sfx('select'); }
    },
    buttons() {
      const list = [{label: this.playing ? '■ Stop' : '▶ Play', go: () => { this.playing = !this.playing; }, c: '#3fc060'}, {label: '− Slower', go: () => { this.bpm = Math.max(60, this.bpm - 10); }, c: '#4a5070'}, {label: '+ Faster', go: () => { this.bpm = Math.min(180, this.bpm + 10); }, c: '#4a5070'},
        ...Object.keys(PRESETS).map(n => ({label: n, go: () => { this.grid = PRESETS[n].map(r => r.split('').map(Number)); }, c: '#7a5ae8'})),
        {label: 'Random', go: () => { this.grid = ROWS.map((_, r) => Array.from({length: STEPS}, (_, s) => Math.random() < [.3, .15, .1, .5, .3, .25][r] ? 1 : 0)); this.grid[0][0] = 1; }, c: '#ff9f43'}, {label: 'Clear', go: () => { this.grid = ROWS.map(() => new Array(STEPS).fill(0)); }, c: '#c44a5a'}];
      let x = 20; return list.map(b => { const w = 22 + b.label.length * 8.5, o = {...b, x, y: H - 60, w}; x += w + 8; return o; });
    },
    update(dt) {
      this.t += dt; for (const k in this.flash) this.flash[k] -= dt;
      if (!this.playing) return;
      this.acc += dt; const step = 60 / this.bpm / 4;
      while (this.acc >= step) { this.acc -= step; this.pos = (this.pos + 1) % STEPS; for (let r = 0; r < ROWS.length; r++) if (this.grid[r][this.pos]) { this.play(r, this.pos); this.flash[r + ':' + this.pos] = .15; } }
    },
    draw(ctx) {
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#1a1630'); bg.addColorStop(1, '#2a1e44'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      G.text('BEAT MAKER', 20, 40, {size: 26, display: true, color: '#fff'}); G.text(`${this.bpm} BPM`, W - 20, 40, {size: 18, align: 'right', weight: 800, color: '#ffcf5c'});
      const gx = 130, gy = 70, cw = 40, ch = 52;
      ROWS.forEach(([name, , col], r) => {
        G.text(name, 20, gy + r * ch + 32, {size: 15, weight: 800, color: col});
        for (let s = 0; s < STEPS; s++) {
          const on = this.grid[r][s], x = gx + s * cw, y = gy + r * ch, f = (this.flash[r + ':' + s] || 0) > 0, cur = s === this.pos && this.playing;
          G.rr(x + 3, y + 4, cw - 6, ch - 8, 8, s % 4 === 0 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.05)');
          if (cur) G.rr(x + 3, y + 4, cw - 6, ch - 8, 8, 'rgba(255,255,255,.12)');
          if (on) { G.rr(x + 5 - (f ? 2 : 0), y + 6 - (f ? 2 : 0), cw - 10 + (f ? 4 : 0), ch - 12 + (f ? 4 : 0), 7, col); if (f) G.rr(x + 9, y + 10, cw - 18, ch - 20, 5, 'rgba(255,255,255,.5)'); }
        }
      });
      for (const b of this.buttons()) { G.rr(b.x, b.y, b.w, 40, 10, b.c); G.text(b.label, b.x + b.w / 2, b.y + 26, {size: 14, align: 'center', weight: 800, color: '#fff'}); }
    }
  });
})();

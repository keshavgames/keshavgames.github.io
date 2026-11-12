(() => {
  const W = 480, H = 600, LANES = [120, 200, 280, 360], HIT_Y = 520, SPEED = 430, BPM = 118, BARS = 64;
  const BEAT = 60 / BPM, S16 = BEAT / 4;
  const COLORS = ['#ff6b8b', '#ffcf5c', '#5ee6c1', '#5cb8ff'];
  const KEYS = {d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3};
  const ROOTS = [110, 87.31, 130.81, 98]; // A F C G
  const SCALE = [0, 3, 5, 7, 10, 12, 15];
  const PATTERNS = {
    easy: [[0, 8], [0, 4, 8, 12], [0, 6, 8, 12]],
    mid: [[0, 4, 6, 8, 12], [0, 3, 6, 8, 12, 14], [0, 2, 4, 8, 10, 12]],
    hard: [[0, 2, 4, 6, 8, 10, 12, 14], [0, 3, 4, 6, 8, 11, 12, 14], [0, 2, 3, 6, 8, 10, 11, 14]]
  };
  let noiseBuf = null;

  function compose() { // drums, bass and a melody; the melody notes become the chart
    const notes = [], events = [];
    let step = 3;
    for (let bar = 0; bar < BARS; bar++) {
      const t0 = bar * 4 * BEAT, root = ROOTS[bar % 4];
      const level = bar < 8 || bar >= 60 ? 'easy' : bar < 24 ? 'mid' : 'hard';
      for (let b = 0; b < 4; b++) {
        const t = t0 + b * BEAT;
        events.push({t, type: 'kick'});
        if (b % 2) events.push({t, type: 'snare'});
        if (bar >= 4) events.push({t: t + BEAT / 2, type: 'hat'});
        events.push({t, type: 'bass', f: root * (b === 3 ? 1.5 : 1)});
      }
      for (const s of G.pick(PATTERNS[level])) {
        step = G.clamp(step + G.pick([-2, -1, 1, 2]), 0, SCALE.length - 1);
        const t = t0 + s * S16, lane = step % 4;
        notes.push({t, lane}); events.push({t, type: 'lead', f: root * 4 * 2 ** (SCALE[step] / 12)});
        if (bar >= 40 && bar < 60 && s % 8 === 0 && Math.random() < .5) notes.push({t, lane: (lane + 2) % 4});
      }
    }
    events.sort((a, b) => a.t - b.t); notes.sort((a, b) => a.t - b.t);
    return {notes, events};
  }

  GameBox.register({
    id: 'rhythm', title: 'Beat Lanes', genre: 'Music', kind: 'Rhythm', w: W, h: H,
    desc: 'A synthwave track built fresh every run. Hit each note as it crosses the line in time with the music; the melody you hear is the chart you play. Misses drain the groove bar. Sound on recommended.',
    controls: [['D F J K', 'Hit the four lanes'], ['Left Down Up Right', 'Also hit the lanes']],
    info() { return `Combo ${this.combo} · Accuracy ${this.judged ? Math.round(this.acc / this.judged * 100) : 100}%`; },
    init() {
      this.kill();
      const song = compose();
      this.notes = song.notes; this.events = song.events; this.ev = 0;
      this.health = 100; this.combo = 0; this.best = 0; this.acc = 0; this.judged = 0;
      this.press = [0, 0, 0, 0]; this.judge = null; this.started = false; this.parts = [];
    },
    clock() { return this.ac ? this.ac.currentTime : performance.now() / 1000 - (this.paused || 0); },
    now() { return this.clock() - this.t0; },
    kill() { if (this.master) { try { this.master.disconnect(); } catch {} this.master = null; } },
    play(ev, at) {
      const a = this.ac;
      if (!a || !this.master || G.isMuted()) return;
      const out = this.master, g = a.createGain(); g.connect(out);
      const env = (v, d) => { g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(.0001, at + d); };
      const osc = (type, f0, f1, d) => { const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + d); o.start(at); o.stop(at + d + .02); return o; };
      const noise = (type, freq, d) => {
        if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
        const s = a.createBufferSource(); s.buffer = noiseBuf; const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq;
        s.connect(f); f.connect(g); s.start(at); s.stop(at + d + .02);
      };
      if (ev.type === 'kick') { env(.8, .18); osc('sine', 150, 45, .18).connect(g); }
      else if (ev.type === 'snare') { env(.32, .14); noise('bandpass', 1800, .14); }
      else if (ev.type === 'hat') { env(.09, .04); noise('highpass', 7000, .04); }
      else if (ev.type === 'bass') {
        env(.2, BEAT * .9); const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.connect(g);
        osc('sawtooth', ev.f, 0, BEAT * .9).connect(f);
      } else { env(.07, .22); osc('square', ev.f, 0, .22).connect(g); osc('triangle', ev.f * 2, 0, .22).connect(g); }
    },
    onPause(p) {
      if (this.ac) { if (p) this.ac.suspend(); else this.ac.resume(); }
      else if (p) this.pauseAt = performance.now() / 1000; else this.paused = (this.paused || 0) + performance.now() / 1000 - this.pauseAt;
    },
    stop() { this.kill(); this.ac?.resume?.(); },
    finish(title) { this.kill(); G.end(title); },
    key(k, repeat) {
      const lane = KEYS[k];
      if (lane === undefined || repeat || !this.started) return;
      this.press[lane] = .12;
      const now = this.now();
      let best = null;
      for (const n of this.notes) {
        if (n.t - now > .2) break;
        if (n.done || n.lane !== lane) continue;
        if (Math.abs(n.t - now) <= .14 && (!best || Math.abs(n.t - now) < Math.abs(best.t - now))) best = n;
      }
      if (!best) return;
      best.done = true;
      const off = Math.abs(best.t - now), grade = off < .045 ? 'PERFECT' : off < .09 ? 'GREAT' : 'GOOD';
      const base = {PERFECT: 300, GREAT: 200, GOOD: 100}[grade];
      this.combo++; this.best = Math.max(this.best, this.combo);
      this.acc += {PERFECT: 1, GREAT: .8, GOOD: .5}[grade]; this.judged++;
      G.score += Math.round(base * (1 + Math.min(this.combo, 50) / 50));
      this.health = Math.min(100, this.health + (grade === 'PERFECT' ? 3 : 2));
      this.judge = {text: grade, t: .5, color: grade === 'PERFECT' ? '#5ee6c1' : grade === 'GREAT' ? '#ffcf5c' : '#c4c8ee'};
      G.burst(this.parts, LANES[lane], HIT_Y, COLORS[lane], 8, 140);
    },
    update(dt) {
      if (!this.started) {
        this.started = true; this.ac = G.audio();
        if (this.ac) { this.master = this.ac.createGain(); this.master.gain.value = .9; this.master.connect(this.ac.destination); }
        this.t0 = this.clock() + 2;
      }
      for (let i = 0; i < 4; i++) this.press[i] -= dt;
      if (this.judge && (this.judge.t -= dt) <= 0) this.judge = null;
      const now = this.now();
      while (this.ev < this.events.length && this.events[this.ev].t < now + .3) {
        const e = this.events[this.ev++];
        if (e.t > now - .05) this.play(e, this.t0 + e.t);
      }
      for (const n of this.notes) {
        if (n.t > now) break;
        if (n.done || now - n.t < .14) continue;
        n.done = true; this.combo = 0; this.judged++; this.health -= 8;
        this.judge = {text: 'MISS', t: .5, color: '#ff6b8b'};
        if (this.health <= 0) { this.health = 0; return this.finish('Song failed'); }
      }
      if (now > this.notes.at(-1).t + 2) {
        G.score += Math.round(5000 * this.acc / Math.max(1, this.judged)) + this.best * 20;
        this.finish('Song complete!');
      }
    },
    draw(ctx, dt) {
      const now = this.started ? this.now() : -2, pulse = now > 0 ? 1 - (now % BEAT) / BEAT : 0;
      G.clear('#0b0820');
      const glow = ctx.createRadialGradient(W / 2, H * .45, 20, W / 2, H * .45, 360);
      glow.addColorStop(0, `rgba(139,123,255,${.12 + pulse * .12})`); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      LANES.forEach((x, i) => {
        G.rr(x - 38, 0, 76, H, 0, i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.055)');
        if (this.press[i] > 0 || G.keys[Object.keys(KEYS).find(k => KEYS[k] === i)]) {
          const g = ctx.createLinearGradient(0, HIT_Y, 0, HIT_Y - 220);
          g.addColorStop(0, COLORS[i] + '66'); g.addColorStop(1, COLORS[i] + '00');
          ctx.fillStyle = g; ctx.fillRect(x - 38, HIT_Y - 220, 76, 220);
        }
      });
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) { const y = HIT_Y - ((Math.ceil(now / BEAT) + k) * BEAT - now) * SPEED; if (y > 0) { ctx.beginPath(); ctx.moveTo(82, y); ctx.lineTo(398, y); ctx.stroke(); } }
      for (const n of this.notes) {
        const y = HIT_Y - (n.t - now) * SPEED;
        if (y < -20) break;
        if (n.done || y > H + 20) continue;
        G.rr(LANES[n.lane] - 32, y - 9, 64, 18, 9, COLORS[n.lane]);
        G.rr(LANES[n.lane] - 26, y - 6, 52, 5, 3, 'rgba(255,255,255,.45)');
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(82, HIT_Y - 1, 316, 2);
      LANES.forEach((x, i) => {
        const on = this.press[i] > 0;
        ctx.strokeStyle = COLORS[i]; ctx.lineWidth = on ? 4 : 2;
        ctx.beginPath(); ctx.roundRect(x - 32, HIT_Y - 11, 64, 22, 11); ctx.stroke();
        G.text('DFJK'[i], x, HIT_Y + 44, {size: 15, align: 'center', weight: 700, color: on ? COLORS[i] : '#6b6f99'});
      });
      G.fx(this.parts, dt);
      if (this.judge) { ctx.globalAlpha = Math.min(1, this.judge.t * 3); G.text(this.judge.text, W / 2, 300, {size: 26, align: 'center', display: true, color: this.judge.color, shadow: true}); ctx.globalAlpha = 1; }
      if (this.combo > 4) G.text(`${this.combo} COMBO`, W / 2, 336, {size: 16, align: 'center', weight: 700, color: '#e8e9ff', shadow: true});
      if (now < 0 && this.started) G.text(String(Math.ceil(-now)), W / 2, 260, {size: 60, align: 'center', display: true, color: '#ffcf5c', shadow: true});
      const total = this.notes.length ? this.notes.at(-1).t : 1;
      G.bar({x: 14, y: 12, w: W - 28, h: 6, v: Math.max(0, now), max: total, color: '#8b7bff'});
      G.bar({x: 14, y: 26, w: 180, h: 14, v: this.health, max: 100, color: this.health < 30 ? '#ff4b62' : '#5ee6c1', label: 'GROOVE', id: 'hp'});
      const mult = 1 + Math.min(this.combo, 50) / 50;
      G.text(`x${mult.toFixed(1)}`, W - 14, 40, {size: 16, align: 'right', weight: 700, color: mult > 1.5 ? '#ffcf5c' : '#c4c8ee'});
    }
  });
})();

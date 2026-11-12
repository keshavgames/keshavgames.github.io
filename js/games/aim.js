GameBox.register({
  id: 'aim', title: 'Target Rush', genre: 'Skill', kind: 'Aim trainer', w: 480, h: 520, cursor: 'crosshair',
  desc: 'Targets pop up and shrink away. Hit them dead center for big points and keep your streak alive. Gold targets are worth double; never click the purple decoys. Missed targets and misclicks drain your focus bar.',
  controls: [['Click / Tap', 'Shoot a target']],
  TOP: 40,
  info() { return `Accuracy ${this.shots ? Math.round(this.hits / this.shots * 100) : 100}%`; },
  mult() { return Math.min(1 + Math.floor(this.combo / 5), 4); },
  init() { this.time = 45; this.focus = 100; this.targets = []; this.parts = []; this.spawn = 0; this.combo = 0; this.hits = 0; this.shots = 0; },
  radius(t) { // grows in fast, holds, then shrinks as its timer runs out
    const p = t.life / t.max;
    return t.size * Math.min(1, (1 - p) * 6) * Math.min(1, p * 1.5 + .25);
  },
  lose(n) { this.focus -= n; this.combo = 0; if (this.focus <= 0) { this.focus = 0; G.end('Lost focus'); } },
  pointer(type, x, y) {
    if (type !== 'down') return;
    this.shots++;
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i], R = this.radius(t), d = Math.hypot(x - t.x, y - t.y);
      if (d > R + 2) continue;
      this.targets.splice(i, 1);
      if (t.type === 'decoy') { G.flash('rgba(139,123,255,.35)'); G.sfx('hurt'); G.popText(this.parts, t.x, t.y, 'DECOY', '#8b7bff'); this.lose(20); return; }
      this.hits++; this.combo++; this.focus = Math.min(100, this.focus + 4);
      const gain = (d < R * .33 ? 30 : d < R * .66 ? 20 : 10) * this.mult() * (t.type === 'gold' ? 2 : 1);
      G.score += gain; G.popText(this.parts, t.x, t.y, '+' + gain, t.type === 'gold' ? '#ffcf5c' : '#ffffff');
      G.burst(this.parts, t.x, t.y, t.type === 'gold' ? '#ffcf5c' : '#ff6b8b', 12); G.sfx(t.type === 'gold' ? 'coin' : 'shoot');
      return;
    }
    G.score = Math.max(0, G.score - 5); G.popText(this.parts, x, y, '-5', '#9aa0c8'); G.sfx('click'); this.lose(8);
  },
  update(dt) {
    if ((this.time -= dt) <= 0) { this.time = 0; return G.end("Time's up"); }
    const elapsed = 45 - this.time;
    if ((this.spawn -= dt) <= 0 && this.targets.length < 4) {
      this.spawn = Math.max(.32, .8 - elapsed * .012);
      const max = Math.max(.9, 1.7 - elapsed * .02), roll = Math.random();
      const type = elapsed > 8 && roll < .14 ? 'decoy' : roll > .9 ? 'gold' : 'normal';
      this.targets.push({x: 44 + G.rnd(G.W - 88), y: this.TOP + 44 + G.rnd(G.H - this.TOP - 88), life: max, max, type, size: type === 'gold' ? 24 : 34});
    }
    for (const t of this.targets) if ((t.life -= dt) <= 0) { t.gone = true; if (t.type !== 'decoy') this.lose(12); }
    this.targets = this.targets.filter(t => !t.gone);
  },
  draw(ctx, dt) {
    G.clear('#0b0d1f');
    ctx.strokeStyle = '#151a3a'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 40; i < G.W; i += 40) { ctx.moveTo(i, this.TOP); ctx.lineTo(i, G.H); }
    for (let i = this.TOP + 40; i < G.H; i += 40) { ctx.moveTo(0, i); ctx.lineTo(G.W, i); }
    ctx.stroke();
    for (const t of this.targets) {
      const R = this.radius(t);
      const rings = t.type === 'gold' ? ['#ffcf5c', '#fff3c4', '#ffcf5c'] : t.type === 'decoy' ? ['#8b7bff', '#2c2470', '#8b7bff'] : ['#ff6b8b', '#f3f1ff', '#ff6b8b'];
      [1, .66, .33].forEach((f, i) => G.circle(t.x, t.y, R * f, rings[i]));
      if (t.type === 'decoy') { ctx.strokeStyle = '#f3f1ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t.x - R * .4, t.y - R * .4); ctx.lineTo(t.x + R * .4, t.y + R * .4); ctx.moveTo(t.x + R * .4, t.y - R * .4); ctx.lineTo(t.x - R * .4, t.y + R * .4); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, R + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t.life / t.max); ctx.stroke();
    }
    G.fx(this.parts, dt);
    G.rr(0, 0, G.W, this.TOP, 0, '#0d1030');
    G.bar({x: 14, y: 13, w: 180, h: 15, v: this.focus, max: 100, color: this.focus < 30 ? '#ff6b8b' : '#5ee6c1', label: `FOCUS ${Math.ceil(this.focus)}`, id: 'focus'});
    G.bar({x: 210, y: 13, w: 160, h: 15, v: this.time, max: 45, color: '#ffcf5c', label: `${Math.ceil(this.time)}s`, id: 'time'});
    G.text(`x${this.mult()}`, G.W - 14, 26, {align: 'right', size: 16, color: this.mult() > 1 ? '#ffcf5c' : '#9aa0c8', weight: 700});
  }
});

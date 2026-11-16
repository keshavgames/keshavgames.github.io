(() => {
  // Stack sliding blocks as high as you can. Whatever hangs over the edge gets sliced off.
  const W = 480, H = 720;

  GameBox.register({
    id: 'stack', title: 'Stack Tower', genre: 'Arcade', kind: 'Timing stacker', w: W, h: H, levels: 30, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Tap or press Space to drop the sliding block. Line it up perfectly to keep it wide!',
    desc: 'Build a tower to the clouds. A block slides back and forth above your tower: tap to drop it. Any part that hangs over the edge is chopped off, so your blocks get thinner and thinner. Drop one perfectly and it grows back a little. Reach the target height to win the level. Thirty levels with faster blocks.',
    controls: [['Space / click', 'Drop the block']],
    info() { return `Level ${G.level} · Height ${this.blocks.length - 1}/${this.goal}`; },
    init() {
      this.goal = 12 + G.level * 2; this.blocks = [{x: W / 2 - 90, w: 180}]; this.cur = null; this.fall = []; this.t = 0; this.perfect = 0; this.done = null; this.cam = 0; this.parts = [];
      this.spawn();
    },
    spawn() { const top = this.blocks.at(-1), sp = 160 + G.level * 9 + this.blocks.length * 3; this.cur = {x: Math.random() < .5 ? -top.w : W, w: top.w, dir: 1, sp}; if (this.cur.x > 0) this.cur.dir = -1; },
    drop() {
      if (this.done || !this.cur) return; const top = this.blocks.at(-1), c = this.cur;
      let left = Math.max(c.x, top.x), right = Math.min(c.x + c.w, top.x + top.w);
      if (right - left <= 2) { this.fall.push({x: c.x, w: c.w, y: this.blocks.length, vy: 0}); this.cur = null; G.sfx('lose'); this.done = {t: 1.2, go: () => G.end(`Height ${this.blocks.length - 1}`)}; return; }
      if (Math.abs(c.x - top.x) < 6) { left = top.x; right = top.x + top.w; this.perfect++; G.sfx('coin'); G.score += 30; if (this.perfect >= 3) { left -= 8; right += 8; } G.popText(this.parts, W / 2, H * .35, this.perfect >= 3 ? 'PERFECT! +grow' : 'PERFECT!', '#ffcf5c', 20); }
      else { this.perfect = 0; G.sfx('hit', .6); const cut = c.x < left ? {x: c.x, w: left - c.x} : {x: right, w: c.x + c.w - right}; this.fall.push({...cut, y: this.blocks.length, vy: 0}); }
      this.blocks.push({x: left, w: right - left}); G.score += 10;
      if (this.blocks.length - 1 >= this.goal) { G.party(); G.score += 400 + G.level * 30; const w = right - left; this.done = {t: 1, go: () => G.win(w > 120 ? 3 : w > 70 ? 2 : 1, `Height ${this.blocks.length - 1}!`)}; this.cur = null; return; }
      this.spawn();
    },
    key(k) { if (k === ' ') this.drop(); }, pointer(type) { if (type === 'down') this.drop(); },
    update(dt) {
      this.t += dt; if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go();
      if (this.cur) { const c = this.cur; c.x += c.dir * c.sp * dt; if (c.x + c.w > W + 40) c.dir = -1; if (c.x < -40) c.dir = 1; }
      for (const f of this.fall) { f.vy += 1400 * dt; f.y -= f.vy * dt / 30; } this.fall = this.fall.filter(f => f.y > this.cam - 30);
      this.cam += (Math.max(0, this.blocks.length - 10) - this.cam) * Math.min(1, dt * 4);
    },
    draw(ctx, dt) {
      const k = Math.min(1, this.blocks.length / (this.goal + 5)), hue = 220 - k * 160;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `hsl(${hue},60%,${55 + k * 15}%)`); g.addColorStop(1, `hsl(${hue + 30},50%,80%)`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { const y = ((i * 170 + this.cam * 18) % (H + 200)) - 100; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse((i * 137) % W, y, 60, 18, 0, 0, Math.PI * 2); ctx.fill(); }
      const BH = 36, base = H - 80, yOf = i => base - (i - this.cam) * BH, col = i => `hsl(${(i * 14 + 200) % 360},70%,60%)`, side = i => `hsl(${(i * 14 + 200) % 360},60%,42%)`;
      const block = (x, w, y, i) => { ctx.fillStyle = side(i); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x + w + 14, y - 10); ctx.lineTo(x + w + 14, y + BH - 10); ctx.lineTo(x + w, y + BH); ctx.lineTo(x, y + BH); ctx.fill(); ctx.fillStyle = col(i); ctx.fillRect(x, y, w, BH); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w, 5); };
      ctx.fillStyle = '#5a6a4a'; ctx.fillRect(0, base + BH, W, H);
      this.blocks.forEach((b, i) => { const y = yOf(i); if (y < H + 40) block(b.x, b.w, y, i); });
      for (const f of this.fall) block(f.x, f.w, yOf(f.y), Math.round(f.y));
      if (this.cur) block(this.cur.x, this.cur.w, yOf(this.blocks.length) - 30, this.blocks.length);
      G.text(`${this.blocks.length - 1}`, W / 2, 80, {size: 56, align: 'center', display: true, color: '#fff', shadow: true});
      G.text(`GOAL ${this.goal}`, W / 2, 110, {size: 14, align: 'center', weight: 800, color: '#fff', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

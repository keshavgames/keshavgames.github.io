(() => {
  // Water-blaster reflex duel: wait for the bell, then fire first. Fire early and you lose the round.
  const W = 800, H = 450;
  const ASSETS = ['img/kid_idle.png', 'img/kid_jump.png'];

  GameBox.register({
    id: 'quickdraw', title: 'Quick Draw', genre: 'Skill', kind: 'Reflex duel', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg',
    hint: 'Wait… wait… when you hear the bell and see SPLASH!, press Space as fast as you can!',
    desc: 'A sunny standoff with water blasters. Both players wait with their fingers ready. When the bell rings and SPLASH! appears, fire first to soak the other one. Press too early and you get soaked instead. Best of five rounds against quicker and quicker bots, or against a friend on the same keyboard.',
    controls: [['Space / click', 'Fire (Player 1)'], ['Enter', 'Fire (Player 2 in two-player mode)']],
    info() { return `Duel ${G.level} · ${this.wins[0]} - ${this.wins[1]}`; },
    init() { this.wins = [0, 0]; this.parts = []; this.done = null; this.times = []; this.round(); },
    round() { this.phase = 'wait'; this.wait = 1.6 + Math.random() * 2.6; this.t = 0; this.result = null; this.fake = G.level > 8 && Math.random() < .3 ? .6 + Math.random() * this.wait * .5 : -1; this.botT = Math.max(.27, .6 - G.level * .012) + Math.random() * .12; },
    fire(who) {
      if (this.phase === 'result' || this.done) return;
      if (this.phase === 'wait') { this.result = {winner: 1 - who, early: true}; G.sfx('lose', .5); return this.finishRound(); }
      this.result = {winner: who, time: this.t}; if (who === 0) this.times.push(this.t); G.sfx('splash'); G.shake(6, .2); this.finishRound();
    },
    finishRound() {
      this.phase = 'result'; this.wins[this.result.winner]++; this.resT = 1.8;
      const k = this.result.winner === 0 ? 1 : 0, x = k ? 600 : 200; for (let i = 0; i < 30; i++) this.parts.push({x, y: 270, vx: (Math.random() - .5) * 300, vy: -Math.random() * 300, life: .8, color: '#7fd0ff'});
    },
    key(k) { if (k === ' ') this.fire(0); if (k === 'Enter' && G.mode === 'local') this.fire(1); },
    pointer(type) { if (type === 'down') this.fire(0); },
    update(dt) {
      for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt; } this.parts = this.parts.filter(p => p.life > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      this.t += dt;
      if (this.phase === 'wait') {
        if (this.fake > 0 && this.t > this.fake && !this.faked) { this.faked = true; G.sfx('click'); }
        if (this.t >= this.wait) { this.phase = 'draw'; this.t = 0; this.faked = false; G.note(1568, .4, {type: 'sine', vol: .2}); G.note(2093, .4, {type: 'sine', vol: .12}); }
      } else if (this.phase === 'draw') { if (G.mode !== 'local' && this.t >= this.botT) this.fire(1); }
      else if (this.phase === 'result' && (this.resT -= dt) <= 0) {
        if (this.wins[0] >= 3 || this.wins[1] >= 3) {
          const me = this.wins[0] >= 3, best = this.times.length ? Math.min(...this.times) : 9;
          if (G.mode === 'local') this.done = {t: .2, go: () => G.end(me ? 'Player 1 wins the duel!' : 'Player 2 wins the duel!')};
          else if (me) { G.score += 500 + G.level * 40 + Math.round(Math.max(0, .6 - best) * 1000); G.party(); this.done = {t: .2, go: () => G.win(this.wins[1] === 0 ? 3 : this.wins[1] === 1 ? 2 : 1, `Fastest draw ${Math.round(best * 1000)} ms`)}; }
          else this.done = {t: .2, go: () => G.end('Soaked! Try again')};
        } else this.round();
      }
    },
    draw(ctx, dt) {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffb86a'); sky.addColorStop(.6, '#ffe0a8'); sky.addColorStop(.61, '#e8c27a'); sky.addColorStop(1, '#d6a85a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      G.circle(W / 2, 200, 70, 'rgba(255,250,220,.8)');
      for (const [x, h] of [[90, 120], [700, 150], [520, 90]]) { ctx.fillStyle = '#5a8a3a'; ctx.fillRect(x - 12, 290 - h, 24, h); ctx.fillRect(x - 40, 290 - h * .6, 28, 14); ctx.fillRect(x - 40, 290 - h * .6 - 30, 14, 34); ctx.fillRect(x + 12, 290 - h * .7, 26, 14); ctx.fillRect(x + 26, 290 - h * .7 - 26, 14, 30); }
      const draw = this.phase !== 'wait';
      for (const [i, x, flip, hue] of [[0, 210, 1, 0], [1, 590, -1, 160]]) {
        const lost = this.result && this.result.winner !== i, img = G.img(lost ? 'img/kid_jump.png' : 'img/kid_idle.png');
        if (img.complete && img.naturalWidth) { ctx.save(); ctx.translate(x, 330); ctx.scale(flip * 1.6, 1.6); if (hue) ctx.filter = `hue-rotate(${hue}deg)`; ctx.drawImage(img, -64, -128, 128, 128); ctx.restore(); }
        ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(x, 332, 50, 8, 0, 0, Math.PI * 2); ctx.fill();
        if (lost) for (let k = 0; k < 6; k++) G.circle(x + (k - 2.5) * 12, 160 + (k % 2) * 30 + Math.sin(k + this.resT * 8) * 6, 5, 'rgba(120,200,255,.8)');
      }
      for (const p of this.parts) G.circle(p.x, p.y, 4, `rgba(127,208,255,${p.life})`);
      if (this.phase === 'wait') G.text(this.faked ? '…not yet!' : 'Wait for it…', W / 2, 90, {size: 30, align: 'center', display: true, color: '#7a4a1a'});
      if (this.phase === 'draw') G.text('SPLASH!', W / 2, 110, {size: 72, align: 'center', display: true, color: '#1a8ae8', shadow: true});
      if (this.phase === 'result') { const r = this.result, me = r.winner === 0; G.text(r.early ? (me ? 'They fired too early!' : 'Too early!') : `${me ? 'You win' : G.mode === 'local' ? 'Player 2 wins' : 'Bot wins'} the round${me && r.time ? ` in ${Math.round(r.time * 1000)} ms` : ''}!`, W / 2, 100, {size: 26, align: 'center', display: true, color: me ? '#2a8a3a' : '#c43a3a'}); }
      G.text(`${this.wins[0]}`, 210, 60, {size: 40, align: 'center', display: true, color: '#7a4a1a'}); G.text(`${this.wins[1]}`, 590, 60, {size: 40, align: 'center', display: true, color: '#7a4a1a'});
      G.text('FIRST TO 3', W / 2, 30, {size: 12, align: 'center', weight: 800, color: '#7a4a1a'});
      G.text(G.mode === 'local' ? 'P1: Space' : 'You: Space', 210, 420, {size: 13, align: 'center', weight: 800, color: '#7a4a1a'}); G.text(G.mode === 'local' ? 'P2: Enter' : `Bot ${G.level}`, 590, 420, {size: 13, align: 'center', weight: 800, color: '#7a4a1a'});
    }
  });
})();

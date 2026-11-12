(() => {
  const W = 640, H = 480, CW = 92, CH = 124;
  const CARDS = {
    strike: {name: 'Strike', cost: 1, type: 'atk', text: 'Deal 6 damage.', dmg: 6},
    defend: {name: 'Defend', cost: 1, type: 'skill', text: 'Gain 5 block.', block: 5},
    ember: {name: 'Ember Bolt', cost: 1, type: 'atk', text: 'Deal 7. Apply 3 Burn.', dmg: 7, burn: 3},
    frost: {name: 'Frost Shard', cost: 1, type: 'atk', text: 'Deal 5. Apply 2 Weak.', dmg: 5, weak: 2},
    twin: {name: 'Twin Strike', cost: 1, type: 'atk', text: 'Deal 4 twice.', dmg: 4, hits: 2},
    cleave: {name: 'Cleave', cost: 1, type: 'atk', text: 'Deal 7 to ALL enemies.', dmg: 7, all: true},
    bash: {name: 'Bash', cost: 2, type: 'atk', text: 'Deal 10. Apply 2 Vulnerable.', dmg: 10, vuln: 2},
    fireball: {name: 'Fireball', cost: 2, type: 'atk', text: 'Deal 18 damage.', dmg: 18},
    shield: {name: 'Arcane Shield', cost: 2, type: 'skill', text: 'Gain 13 block.', block: 13},
    quick: {name: 'Quick Slash', cost: 0, type: 'atk', text: 'Deal 4. Draw 1 card.', dmg: 4, draw: 1},
    insight: {name: 'Insight', cost: 1, type: 'skill', text: 'Draw 2 cards.', draw: 2},
    mend: {name: 'Mend', cost: 1, type: 'skill', text: 'Heal 7. Exhaust.', heal: 7, exhaust: true},
    bramble: {name: 'Bramble', cost: 1, type: 'power', text: 'Gain 3 Thorns.', thorns: 3},
    surge: {name: 'Power Surge', cost: 1, type: 'power', text: 'Gain 2 Strength.', str: 2},
    barrier: {name: 'Barrier', cost: 1, type: 'skill', text: 'Gain 8 block. Apply 1 Weak to ALL.', block: 8, weakAll: 1},
    meteor: {name: 'Meteor', cost: 3, type: 'atk', text: 'Deal 26 to ALL enemies.', dmg: 26, all: true}
  };
  const REWARDS = Object.keys(CARDS).filter(k => k !== 'strike' && k !== 'defend');
  const TYPE_COLOR = {atk: '#c4364a', skill: '#3d6fd9', power: '#8b5cd6'};
  const ENEMIES = {
    slime: {name: 'Bog Slime', hp: 24, color: '#5ee6c1', moves: [['atk', 6], ['atk', 7], ['def', 6]]},
    imp: {name: 'Ash Imp', hp: 17, color: '#ff9f5c', moves: [['atk', 3, 2], ['buff', 2], ['atk', 4, 2]]},
    mage: {name: 'Hex Mage', hp: 30, color: '#8b7bff', moves: [['curse', 2], ['atk', 9], ['atk', 10]]},
    golem: {name: 'Rune Golem', hp: 64, color: '#9aa0c8', moves: [['def', 12], ['atk', 15], ['atk', 7, 2]]},
    king: {name: 'Hollow King', hp: 150, color: '#e04e5f', moves: [['buff', 3], ['atk', 12], ['atk', 5, 3], ['def', 16], ['curse', 2], ['atk', 24]]}
  };
  const FLOORS = [['slime'], ['imp', 'slime'], ['mage'], ['slime', 'imp'], ['golem'], ['mage', 'imp'], ['slime', 'mage'], ['imp', 'imp', 'slime'], ['golem', 'imp'], ['king']];

  function wrap(text, max) {
    const out = []; let line = '';
    for (const w of text.split(' ')) { if ((line + w).length > max) { out.push(line.trim()); line = ''; } line += w + ' '; }
    out.push(line.trim()); return out;
  }

  GameBox.register({
    id: 'cards', title: 'Spellbound', genre: 'RPG', kind: 'Deckbuilder', w: W, h: H, cursor: 'pointer',
    desc: 'Climb a ten-floor tower with a deck of spells. Each turn you have 3 energy to play cards; enemies show their next move above their heads, so block what is coming. After each victory, add one of three new cards to your deck. Beat the Hollow King to win.',
    controls: [['Click a card', 'Select it, then click an enemy to target'], ['1-9', 'Play a card from your hand'], ['Left Right', 'Change target'], ['E', 'End turn']],
    info() { return `Floor ${this.floor}/10 · Deck ${this.deck.length}`; },
    init() {
      this.max = 60; this.hp = 60; this.floor = 0; this.parts = [];
      this.deck = ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'ember'];
      this.nextFloor();
    },
    nextFloor() {
      this.floor++;
      const mul = 1 + (this.floor - 1) * .06;
      this.foes = FLOORS[this.floor - 1].map((k, i, a) => {
        const E = ENEMIES[k];
        return {k, name: E.name, color: E.color, hp: Math.round(E.hp * mul), max: Math.round(E.hp * mul), block: 0, str: 0, weak: 0, vuln: 0, burn: 0, i: Math.floor(G.rnd(E.moves.length)), x: 420 + (i - (a.length - 1) / 2) * 120, shake: 0, lunge: 0};
      });
      this.draw_ = G.shuffle(this.deck.slice()); this.discard = []; this.hand = [];
      this.me = {block: 0, str: 0, weak: 0, vuln: 0, thorns: 0};
      this.phase = 'player'; this.queue = []; this.qT = 0; this.sel = null; this.target = 0; this.reward = null;
      this.startTurn();
    },
    startTurn() { this.energy = 3; this.me.block = 0; this.drawCards(5); this.phase = 'player'; },
    drawCards(n) {
      for (let i = 0; i < n && this.hand.length < 9; i++) {
        if (!this.draw_.length) { this.draw_ = G.shuffle(this.discard); this.discard = []; }
        if (!this.draw_.length) return;
        this.hand.push(this.draw_.pop());
      }
    },
    alive() { return this.foes.filter(f => f.hp > 0); },
    intent(f) { return ENEMIES[f.k].moves[f.i % ENEMIES[f.k].moves.length]; },
    damage(src, dst, base, isPlayerTarget) {
      let d = Math.floor((base + src.str) * (src.weak > 0 ? .75 : 1) * (dst.vuln > 0 ? 1.5 : 1));
      const absorbed = Math.min(dst.block, d); dst.block -= absorbed; d -= absorbed;
      if (isPlayerTarget) { this.hp -= d; if (d) { G.shake(5); G.flash('rgba(255,50,80,.3)', .25); G.sfx('hurt', .7); } else G.sfx('hit', .4); G.popText(this.parts, 140, 200, d ? `-${d}` : 'Blocked', d ? '#ff6b8b' : '#5cb8ff', 18); }
      else { dst.hp -= d; dst.shake = .2; G.score += d; G.sfx('hit', .6); G.popText(this.parts, dst.x, 170, String(d), '#ffcf5c', 18); G.burst(this.parts, dst.x, 230, dst.color, 8); }
      return d;
    },
    play(idx, foe) {
      const key = this.hand[idx], c = CARDS[key];
      if (!c || c.cost > this.energy || this.phase !== 'player') return G.sfx('hit', .3);
      const living = this.alive();
      if (c.type === 'atk' && !c.all && !foe) foe = living[Math.min(this.target, living.length - 1)];
      this.energy -= c.cost; this.hand.splice(idx, 1); this.sel = null;
      if (!c.exhaust && c.type !== 'power') this.discard.push(key);
      const me = this.me;
      if (c.dmg) for (const f of c.all ? living : [foe]) for (let h = 0; h < (c.hits || 1); h++) if (f.hp > 0) this.damage(me, f, c.dmg, false);
      if (c.burn) foe.burn += c.burn;
      if (c.weak) foe.weak += c.weak;
      if (c.vuln) foe.vuln += c.vuln;
      if (c.weakAll) for (const f of living) f.weak += c.weakAll;
      if (c.block) { me.block += c.block; G.sfx('select'); }
      if (c.heal) { this.hp = Math.min(this.max, this.hp + c.heal); G.popText(this.parts, 140, 200, `+${c.heal}`, '#5ee6c1', 18); }
      if (c.thorns) me.thorns += c.thorns;
      if (c.str) me.str += c.str;
      if (c.draw) this.drawCards(c.draw);
      if (c.type !== 'atk' && !c.block && !c.heal) G.sfx('power', .6);
      for (const f of this.foes) if (f.hp <= 0 && !f.dead) { f.dead = true; G.burst(this.parts, f.x, 230, f.color, 30, 220); G.sfx('crunch'); }
      if (!this.alive().length) this.win();
      this.target = Math.min(this.target, Math.max(0, this.alive().length - 1));
    },
    win() {
      this.phase = 'reward'; G.score += this.floor * 200; G.sfx('win');
      if (this.floor === 10) { G.score += 5000; return G.end('The tower falls silent'); }
      if (FLOORS[this.floor - 1][0] === 'golem') { this.max += 10; }
      this.hp = Math.min(this.max, this.hp + 8);
      this.reward = G.shuffle(REWARDS.slice()).slice(0, 3);
    },
    endTurn() {
      if (this.phase !== 'player') return;
      this.phase = 'enemy'; this.discard.push(...this.hand); this.hand = []; this.sel = null;
      for (const f of this.alive()) {
        this.queue.push(() => {
          if (f.burn > 0) { f.hp -= f.burn; G.popText(this.parts, f.x, 160, `🔥${f.burn}`, '#ff9f5c', 15); f.burn--; if (f.hp <= 0) { f.dead = true; G.burst(this.parts, f.x, 230, f.color, 30); return; } }
          f.block = 0;
          const [type, a, b] = this.intent(f);
          f.lunge = .25;
          if (type === 'atk') for (let h = 0; h < (b || 1); h++) { this.damage(f, this.me, a, true); if (this.me.thorns) { f.hp -= this.me.thorns; } }
          else if (type === 'def') { f.block += a; G.sfx('select', .5); }
          else if (type === 'buff') { f.str += a; G.sfx('power', .5); }
          else { this.me.weak += a; this.me.vuln += 1; G.sfx('laser', .5); }
          f.i++; f.weak = Math.max(0, f.weak - 1); f.vuln = Math.max(0, f.vuln - 1);
          if (f.hp <= 0 && !f.dead) { f.dead = true; G.burst(this.parts, f.x, 230, f.color, 30); }
        });
      }
      this.queue.push(() => {
        this.me.weak = Math.max(0, this.me.weak - 1); this.me.vuln = Math.max(0, this.me.vuln - 1);
        if (!this.alive().length) return this.win();
        this.startTurn();
      });
      this.qT = .35;
    },
    key(k) {
      if (this.reward) { const i = '123'.indexOf(k); if (i >= 0) this.pick(i); if (k === 's') this.pick(-1); return; }
      if (k === 'e') this.endTurn();
      if (k === 'ArrowLeft') this.target = Math.max(0, this.target - 1);
      if (k === 'ArrowRight') this.target = Math.min(this.alive().length - 1, this.target + 1);
      const n = '123456789'.indexOf(k);
      if (n >= 0 && n < this.hand.length) this.play(n);
    },
    pick(i) {
      if (i >= 0) { this.deck.push(this.reward[i]); G.sfx('select'); }
      this.reward = null; this.nextFloor();
    },
    cardRects() {
      const n = this.hand.length, gap = Math.min(CW + 8, (W - 200) / Math.max(1, n));
      const x0 = W / 2 - ((n - 1) * gap) / 2 - CW / 2 + 40;
      return this.hand.map((k, i) => {
        const hover = G.pointer.x > x0 + i * gap && G.pointer.x < x0 + i * gap + Math.min(gap, CW) && G.pointer.y > H - CH - 10;
        return {x: x0 + i * gap, y: H - CH - 6 - (hover || this.sel === i ? 22 : 0), i, hover};
      });
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (this.reward) {
        this.reward.forEach((k, i) => { const cx = W / 2 - 160 + i * 120; if (x > cx && x < cx + CW + 10 && y > 170 && y < 170 + CH + 10) this.pick(i); });
        if (x > W / 2 - 50 && x < W / 2 + 50 && y > 330 && y < 362) this.pick(-1);
        return;
      }
      if (x > W - 120 && x < W - 16 && y > H - 190 && y < H - 150) return this.endTurn();
      const r = this.cardRects().reverse().find(r => x > r.x && x < r.x + CW && y > r.y && y < r.y + CH);
      if (r) {
        const c = CARDS[this.hand[r.i]];
        if (c.type === 'atk' && !c.all && this.alive().length > 1) { this.sel = this.sel === r.i ? null : r.i; G.sfx('click'); }
        else this.play(r.i);
        return;
      }
      const foe = this.alive().find(f => Math.abs(x - f.x) < 50 && y > 150 && y < 300);
      if (foe) { this.target = this.alive().indexOf(foe); if (this.sel !== null) this.play(this.sel, foe); }
    },
    update(dt) {
      for (const f of this.foes) { f.shake -= dt; f.lunge -= dt; }
      if (this.phase === 'enemy' && (this.qT -= dt) <= 0 && this.queue.length) {
        this.queue.shift()(); this.qT = .55;
        if (this.hp <= 0) { this.hp = 0; this.queue = []; return G.end('Defeated in the tower'); }
      }
    },
    drawCard(ctx, key, x, y, dim) {
      const c = CARDS[key];
      ctx.globalAlpha = dim ? .55 : 1;
      G.rr(x + 3, y + 5, CW, CH, 10, 'rgba(0,0,0,.35)');
      G.rr(x, y, CW, CH, 10, '#f3ead7'); G.rr(x + 4, y + 4, CW - 8, 30, 7, TYPE_COLOR[c.type]);
      G.text(c.name, x + CW / 2 + 6, y + 24, {size: c.name.length > 11 ? 10 : 11, align: 'center', weight: 700});
      G.circle(x + 6, y + 6, 13, '#2b2f55'); G.text(String(c.cost), x + 6, y + 11, {size: 14, align: 'center', weight: 700, color: '#ffcf5c'});
      const art = {atk: '⚔', skill: '⛨', power: '✦'}[c.type];
      G.text(art, x + CW / 2, y + 66, {size: 26, align: 'center', color: TYPE_COLOR[c.type]});
      wrap(c.text, 15).forEach((l, i) => G.text(l, x + CW / 2, y + 88 + i * 12, {size: 9.5, align: 'center', weight: 600, color: '#2b2416'}));
      ctx.globalAlpha = 1;
    },
    draw(ctx, dt) {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1b1235'); bg.addColorStop(1, '#2b1d4a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { G.rr(30 + i * 104, 40, 70, 200, 35, 'rgba(255,255,255,.03)'); }
      G.rr(0, 290, W, 40, 0, 'rgba(0,0,0,.25)');
      // hero
      G.circle(140, 300, 34, 'rgba(0,0,0,.3)');
      ctx.fillStyle = '#3d4a8a'; ctx.beginPath(); ctx.moveTo(110, 300); ctx.lineTo(140, 196); ctx.lineTo(170, 300); ctx.fill();
      G.circle(140, 200, 18, '#f0c9a0'); ctx.fillStyle = '#2b2f55'; ctx.beginPath(); ctx.moveTo(116, 196); ctx.lineTo(140, 150); ctx.lineTo(164, 196); ctx.fill();
      G.rr(176, 190, 4, 110, 2, '#8a5a35'); G.circle(178, 186, 8, '#5ee6c1');
      G.bar({x: 86, y: 316, w: 110, h: 13, v: this.hp, max: this.max, color: '#e04e5f', label: `${this.hp}/${this.max}`, id: 'hp'});
      if (this.me.block) { G.gem(78, 322, 12, '#5cb8ff'); G.text(String(this.me.block), 78, 327, {size: 11, align: 'center', weight: 700}); }
      const st = (o, x, y) => { let s = []; if (o.str) s.push(['STR ' + o.str, '#ffcf5c']); if (o.weak) s.push(['WEAK ' + o.weak, '#9aa0c8']); if (o.vuln) s.push(['VULN ' + o.vuln, '#ff9f5c']); if (o.burn) s.push(['BURN ' + o.burn, '#ff6b5c']); if (o.thorns) s.push(['THORNS ' + o.thorns, '#7fe0a8']); s.forEach(([t, c], i) => G.text(t, x, y + i * 12, {size: 10, weight: 700, color: c, align: 'center'})); };
      st(this.me, 140, 346);
      // enemies
      const living = this.alive();
      for (const f of this.foes) {
        if (f.hp <= 0) continue;
        const sx = f.x + (f.shake > 0 ? Math.sin(f.shake * 80) * 4 : 0) - (f.lunge > 0 ? Math.sin(f.lunge / .25 * Math.PI) * 30 : 0);
        G.circle(sx, 296, 36, 'rgba(0,0,0,.3)');
        if (f.k === 'slime') { ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(sx, 270, 40, 30, 0, Math.PI, 0); ctx.lineTo(sx + 40, 296); ctx.lineTo(sx - 40, 296); ctx.fill(); }
        else if (f.k === 'imp') { G.circle(sx, 262, 24, f.color); ctx.fillStyle = f.color; ctx.beginPath(); ctx.moveTo(sx - 18, 246); ctx.lineTo(sx - 12, 222); ctx.lineTo(sx - 4, 242); ctx.moveTo(sx + 18, 246); ctx.lineTo(sx + 12, 222); ctx.lineTo(sx + 4, 242); ctx.fill(); G.rr(sx - 10, 282, 20, 14, 4, f.color); }
        else if (f.k === 'mage') { ctx.fillStyle = f.color; ctx.beginPath(); ctx.moveTo(sx - 30, 296); ctx.lineTo(sx, 200); ctx.lineTo(sx + 30, 296); ctx.fill(); G.circle(sx, 236, 13, '#1b1235'); G.circle(sx + 34, 230, 7, '#ff6bff'); }
        else if (f.k === 'golem') { G.rr(sx - 38, 216, 76, 80, 14, f.color); G.rr(sx - 28, 196, 56, 32, 10, '#b5bacb'); ctx.strokeStyle = '#5cb8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 20, 240); ctx.lineTo(sx, 260); ctx.lineTo(sx + 20, 236); ctx.stroke(); }
        else { G.rr(sx - 36, 206, 72, 90, 18, '#2b1d3a'); G.circle(sx, 200, 24, '#d8d3c4'); ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.moveTo(sx - 24, 186); for (let i = 0; i < 5; i++) { ctx.lineTo(sx - 24 + i * 12 + 6, 160); ctx.lineTo(sx - 24 + i * 12 + 12, 184); } ctx.fill(); }
        G.circle(sx - 8, f.k === 'golem' ? 210 : f.k === 'king' ? 200 : 258, 3, '#1b1a33'); G.circle(sx + 8, f.k === 'golem' ? 210 : f.k === 'king' ? 200 : 258, 3, '#1b1a33');
        G.bar({x: f.x - 45, y: 316, w: 90, h: 12, v: f.hp, max: f.max, color: '#e04e5f', label: `${Math.max(0, f.hp)}/${f.max}`});
        if (f.block) { G.gem(f.x - 52, 322, 11, '#5cb8ff'); G.text(String(f.block), f.x - 52, 326, {size: 10, align: 'center', weight: 700}); }
        G.text(f.name, f.x, 344, {size: 11, align: 'center', weight: 700, color: '#c4c8ee'});
        st(f, f.x, 358);
        const [type, a, b] = this.intent(f), dmg = type === 'atk' ? Math.floor((a + f.str) * (f.weak > 0 ? .75 : 1) * (this.me.vuln > 0 ? 1.5 : 1)) : 0;
        const label = type === 'atk' ? `⚔ ${dmg}${b ? '×' + b : ''}` : type === 'def' ? `⛨ ${a}` : type === 'buff' ? '✦ Buff' : '☠ Curse';
        G.rr(f.x - 34, 140, 68, 22, 11, 'rgba(0,0,0,.45)');
        G.text(label, f.x, 156, {size: 13, align: 'center', weight: 700, color: type === 'atk' ? '#ff6b8b' : type === 'def' ? '#5cb8ff' : '#ffcf5c'});
        if (living.indexOf(f) === this.target && this.phase === 'player') { ctx.strokeStyle = this.sel !== null ? '#ffcf5c' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, 298, 46, 10, 0, 0, Math.PI * 2); ctx.stroke(); }
      }
      // hand, energy, end turn
      for (const r of this.cardRects()) if (!r.hover && this.sel !== r.i) this.drawCard(ctx, this.hand[r.i], r.x, r.y, CARDS[this.hand[r.i]].cost > this.energy);
      for (const r of this.cardRects()) if (r.hover || this.sel === r.i) this.drawCard(ctx, this.hand[r.i], r.x, r.y, CARDS[this.hand[r.i]].cost > this.energy);
      G.circle(48, H - 70, 30, '#2b2f55'); G.circle(48, H - 70, 24, this.energy ? '#ffcf5c' : '#5a5f80');
      G.text(`${this.energy}/3`, 48, H - 64, {size: 16, align: 'center', weight: 700, color: '#1b1a33'});
      G.text(`Draw ${this.draw_.length} · Discard ${this.discard.length}`, 14, H - 22, {size: 10, color: '#9aa0c8'});
      const can = this.phase === 'player';
      G.rr(W - 120, H - 190, 104, 40, 12, can ? '#2f8f5c' : '#3a3f5c'); G.text(can ? 'End turn' : 'Enemy turn…', W - 68, H - 165, {size: 13, align: 'center', weight: 700});
      G.text(`FLOOR ${this.floor} / 10`, 14, 26, {size: 13, weight: 700, color: '#c4c8ee'});
      G.fx(this.parts, dt);
      if (this.reward) {
        ctx.fillStyle = 'rgba(8,6,20,.82)'; ctx.fillRect(0, 0, W, H);
        G.text('Victory! Add a card to your deck', W / 2, 140, {size: 20, align: 'center', display: true, color: '#ffcf5c'});
        this.reward.forEach((k, i) => { this.drawCard(ctx, k, W / 2 - 160 + i * 120 + 5, 175, false); G.text(String(i + 1), W / 2 - 160 + i * 120 + 51, 320, {size: 12, align: 'center', color: '#9aa0c8'}); });
        G.rr(W / 2 - 50, 330, 100, 32, 10, '#3a3f5c'); G.text('Skip (S)', W / 2, 351, {size: 13, align: 'center', weight: 700});
      }
    }
  });
})();

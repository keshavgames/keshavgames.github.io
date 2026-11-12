(() => {
  const W = 640, H = 480, WALL = 112;
  const WORDS = {
    short: 'cat dog sun run map key red box cup hat jam fox owl bee web ice gem axe bow ore fin elf oak ash elm fir ink log mud pan rug sky top van arc fog hut lid net orb pit rod saw tin yak zap wolf bear lamp moat rope sand ship tide vine wind gold iron coal fire rain snow star moon hill lake pond road path tree leaf seed root rock wall tent cart bell drum horn harp flag king town farm mill'.split(' '),
    mid: 'stone tower arrow knight castle dragon shield sword armor goblin wizard potion banner forest river bridge torch flame siege march valor spear helmet throne crown cannon archer battle hammer lantern garden market harbor meadow orchard village temple wagon anvil quiver saddle scroll candle cellar feather goblet kettle ladder mirror needle pillow ribbon rocket silver timber velvet window'.split(' '),
    long: 'catapult fortress champion dungeon warlock treasure mountain kingdom crossbow sentinel guardian barricade trebuchet villager horseman blacksmith enchanted parchment cathedral courtyard drawbridge battlement lighthouse waterfall sanctuary alchemist chronicle fireplace gatehouse ironworks marketplace silversmith stronghold'.split(' ')
  };
  const PHRASES = ['hold the line', 'raise the drawbridge', 'for the kingdom', 'light the beacons', 'charge the gates', 'man the walls', 'sound the horns', 'guard the crown'];
  const KINDS = {bat: {speed: 1.7, dmg: 8, color: '#8b7bff'}, goblin: {speed: 1, dmg: 12, color: '#7fbf4a'}, knight: {speed: .75, dmg: 20, color: '#9aa0c8'}, ogre: {speed: .45, dmg: 40, color: '#c4364a'}};

  GameBox.register({
    id: 'typing', title: 'Word Siege', genre: 'Skill', kind: 'Typing defense', w: W, h: H, rawKeys: true,
    desc: 'Invaders march on your castle, each carrying a word. Type a word to fire an arrow at its carrier. The first letter you type locks on to the closest matching enemy. Typos break your combo, and every fifth wave an ogre brings a whole phrase.',
    controls: [['Letters', 'Type the word above an enemy'], ['Space', 'Type spaces in ogre phrases'], ['Backspace', 'Drop your current target'], ['Pause button', 'Pause (P types a letter here)']],
    info() { return `Wave ${this.wave} · ${this.wpm()} WPM`; },
    init() {
      this.hp = 100; this.wave = 0; this.enemies = []; this.arrows = []; this.parts = []; this.target = null;
      this.combo = 0; this.chars = 0; this.typoCount = 0; this.active = 0; this.nextWave();
    },
    wpm() { return this.active > 3 ? Math.round(this.chars / 5 / (this.active / 60)) : 0; },
    nextWave() {
      this.wave++; this.toSpawn = 5 + this.wave * 2; this.spawnT = 1.5; this.breakT = 0; this.boss = this.wave % 5 === 0;
      this.banner = {text: this.boss ? `WAVE ${this.wave} · OGRE` : `WAVE ${this.wave}`, t: 2};
    },
    pickWord() {
      const used = new Set(this.enemies.map(e => e.word[0]));
      const pool = this.wave < 3 ? [...WORDS.short, ...WORDS.mid.slice(0, 20)] : this.wave < 5 ? [...WORDS.short.slice(40), ...WORDS.mid] : [...WORDS.mid, ...WORDS.long];
      for (let i = 0; i < 20; i++) { const w = G.pick(pool); if (!used.has(w[0])) return w; } // prefer unique first letters
      return G.pick(pool);
    },
    spawn(kind) {
      const K = KINDS[kind], words = kind === 'ogre' ? G.shuffle(PHRASES.slice()).slice(0, 2) : [this.pickWord()];
      this.enemies.push({kind, words, word: words[0], typed: 0, x: W + 30, y: 150 + G.rnd(270), speed: (20 + this.wave * 2.5) * K.speed, dmg: K.dmg, color: K.color, t: G.rnd(6), dying: 0});
    },
    key(k) {
      if (k === 'Backspace') { if (this.target) this.target.typed = 0; this.target = null; return; }
      if (k.length !== 1) return;
      let t = this.target;
      if (!t) {
        t = this.enemies.filter(e => !e.dying && e.word[0] === k).sort((a, b) => a.x - b.x)[0];
        if (!t) return this.typo();
        this.target = t;
      } else if (t.word[t.typed] !== k) return this.typo();
      t.typed++; this.chars++; G.sfx('click', .5);
      if (t.typed < t.word.length) return;
      this.combo++;
      const mult = Math.min(3, 1 + Math.floor(this.combo / 10) * .5);
      G.score += Math.round(t.word.length * 10 * mult);
      this.arrows.push({x: WALL - 10, y: 120, tx: t.x, ty: t.y, t: 0, enemy: t});
      G.sfx('shoot');
      const next = t.words.indexOf(t.word) + 1;
      if (next < t.words.length) { t.word = t.words[next]; t.typed = 0; t.x += 40; G.popText(this.parts, t.x, t.y - 40, 'OOF!', '#ffcf5c'); }
      else t.dying = 1;
      this.target = null;
    },
    typo() { this.combo = 0; this.typoCount++; G.sfx('hit', .4); G.shake(2, .1); },
    update(dt) {
      this.active += dt;
      if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
      if (this.toSpawn > 0 && (this.spawnT -= dt) <= 0) {
        this.spawnT = Math.max(.9, 2.4 - this.wave * .12); this.toSpawn--;
        if (this.boss && this.toSpawn === 0) this.spawn('ogre');
        else this.spawn(this.wave > 2 && Math.random() < .25 ? 'knight' : Math.random() < .3 ? 'bat' : 'goblin');
      }
      if (!this.toSpawn && !this.enemies.length) {
        if (!this.breakT) { this.breakT = 3; G.score += this.wave * 100; G.sfx('win'); this.hp = Math.min(100, this.hp + 10); }
        else if ((this.breakT -= dt) <= 0) this.nextWave();
      }
      for (const e of this.enemies) {
        e.t += dt;
        if (e.dying) { e.dying -= dt * 3; continue; }
        e.x -= e.speed * dt;
        if (e.x < WALL + 14) {
          e.dying = .01; this.hp -= e.dmg; G.shake(6, .3); G.flash(); G.sfx('boom', .6);
          G.burst(this.parts, WALL, e.y, '#c9a26b', 16);
          if (this.target === e) this.target = null;
          if (this.hp <= 0) { this.hp = 0; return G.end('The castle fell'); }
        }
      }
      this.enemies = this.enemies.filter(e => !(e.dying && e.dying <= 0));
      for (const a of this.arrows) {
        a.t += dt / .22;
        if (a.t >= 1 && !a.hit) { a.hit = true; G.burst(this.parts, a.enemy.x, a.enemy.y, a.enemy.color, 14); G.sfx('crunch', .6); }
      }
      this.arrows = this.arrows.filter(a => a.t < 1.2);
    },
    draw(ctx, dt) {
      const sky = ctx.createLinearGradient(0, 0, 0, 140);
      sky.addColorStop(0, '#3a6fb0'); sky.addColorStop(1, '#a9d4e8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 140);
      ctx.fillStyle = '#5b9e57'; ctx.fillRect(0, 130, W, H - 130);
      ctx.fillStyle = '#4f9150'; for (let i = 0; i < 60; i++) ctx.fillRect((i * 97) % W, 140 + (i * 53) % 330, 3, 6);
      ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(WALL, 260); ctx.lineTo(W, 200); ctx.lineTo(W, 380); ctx.lineTo(WALL, 330); ctx.fill();
      G.rr(0, 60, WALL, H - 60, 0, '#8a8f9e');
      for (let y = 60; y < H; y += 20) for (let x = (y / 20 % 2) * 14; x < WALL; x += 28) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y, 26, 2); ctx.fillRect(x, y, 2, 20); }
      for (let x = 0; x < WALL; x += 24) G.rr(x, 44, 16, 18, 2, '#8a8f9e');
      G.rr(WALL - 40, 92, 36, 40, 4, '#6b7080'); G.rr(WALL - 30, 100, 14, 22, 7, '#2b2f40');
      G.rr(10, 14, 4, 50, 1, '#5a3d2a'); ctx.fillStyle = '#e04e5f'; ctx.beginPath(); ctx.moveTo(14, 14); ctx.lineTo(40, 22); ctx.lineTo(14, 30); ctx.fill();
      for (const e of this.enemies.slice().sort((a, b) => a.y - b.y)) {
        const s = e.kind === 'ogre' ? 1.8 : e.kind === 'knight' ? 1.15 : 1, bob = Math.sin(e.t * 8) * 2;
        ctx.globalAlpha = e.dying ? Math.max(0, e.dying) : 1;
        G.circle(e.x, e.y + 14 * s, 12 * s, 'rgba(0,0,0,.2)');
        if (e.kind === 'bat') {
          const f = Math.sin(e.t * 20) * 7;
          ctx.fillStyle = e.color; ctx.beginPath(); ctx.moveTo(e.x - 16, e.y - f); ctx.quadraticCurveTo(e.x, e.y - 3, e.x + 16, e.y - f); ctx.quadraticCurveTo(e.x, e.y + 6, e.x - 16, e.y - f); ctx.fill();
        } else {
          G.rr(e.x - 10 * s, e.y - 10 * s + bob, 20 * s, 22 * s, 6 * s, e.color);
          G.circle(e.x, e.y - 14 * s + bob, 9 * s, e.kind === 'knight' ? '#c9ccd4' : e.kind === 'ogre' ? '#b8323f' : '#9bd16b');
          G.circle(e.x - 4 * s, e.y - 15 * s + bob, 1.6 * s, '#1b1a33');
          if (e.kind === 'knight') G.rr(e.x - 16, e.y - 8 + bob, 6, 22, 2, '#5a6080');
        }
        if (!e.dying) {
          ctx.font = `700 ${e.kind === 'ogre' ? 15 : 14}px ${G.BODY}`;
          const tw = ctx.measureText(e.word).width, by = e.y - 34 * s - 6, bx = e.x - tw / 2;
          G.rr(bx - 7, by - 15, tw + 14, 21, 7, this.target === e ? 'rgba(27,26,51,.95)' : 'rgba(27,26,51,.75)');
          if (this.target === e) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx - 7, by - 15, tw + 14, 21, 7); ctx.stroke(); }
          const done = e.word.slice(0, e.typed);
          ctx.textAlign = 'left'; ctx.fillStyle = '#ffcf5c'; ctx.fillText(done, bx, by);
          ctx.fillStyle = '#ffffff'; ctx.fillText(e.word.slice(e.typed), bx + ctx.measureText(done).width, by);
        }
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = '#5a3d2a'; ctx.lineWidth = 2;
      for (const a of this.arrows) {
        if (a.t > 1) continue;
        const x = G.lerp(a.x, a.tx, a.t), y = G.lerp(a.y, a.ty, a.t) - Math.sin(a.t * Math.PI) * 40, ang = Math.atan2(a.ty - a.y - Math.cos(a.t * Math.PI) * 40 * Math.PI * .3, a.tx - a.x);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 16, y - Math.sin(ang) * 16); ctx.stroke();
      }
      G.fx(this.parts, dt);
      G.panel(WALL + 8, 8, 230, 30, 8);
      G.bar({x: WALL + 16, y: 15, w: 214, h: 15, v: this.hp, max: 100, color: this.hp < 30 ? '#ff4b62' : '#5ee6c1', label: `CASTLE ${Math.ceil(this.hp)}`, id: 'hp'});
      const mult = Math.min(3, 1 + Math.floor(this.combo / 10) * .5);
      G.text(`Combo ${this.combo}  ·  x${mult}`, W - 14, 28, {size: 14, align: 'right', weight: 700, color: '#1b1a33'});
      if (this.banner) G.text(this.banner.text, (W + WALL) / 2, 110, {size: 28, align: 'center', display: true, color: '#ffffff', shadow: true});
      if (this.breakT > 0) G.text('Wave cleared! Castle repaired +10', (W + WALL) / 2, 150, {size: 14, align: 'center', weight: 700, color: '#1b1a33'});
    }
  });
})();

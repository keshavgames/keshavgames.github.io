(() => {
  // Catch and battle original Blender creatures. The team is saved between areas.
  const W = 800, H = 500, T = 40, MW = 20, MH = 12;
  const SPECIES = {
    sproutle: {el: 'leaf', hp: 44, atk: 10, def: 10, spd: 9, moves: ['tackle', 'leafdart', 'regrow']},
    puddlet: {el: 'water', hp: 46, atk: 10, def: 11, spd: 8, moves: ['tackle', 'splash', 'bubbles']},
    emberpup: {el: 'fire', hp: 40, atk: 12, def: 8, spd: 11, moves: ['tackle', 'ember', 'flametail']},
    bloomoth: {el: 'bug', hp: 38, atk: 10, def: 8, spd: 13, moves: ['tackle', 'pollen', 'wingbuzz']},
    pebblor: {el: 'rock', hp: 50, atk: 11, def: 14, spd: 5, moves: ['tackle', 'pebble', 'harden']},
    voltle: {el: 'spark', hp: 42, atk: 12, def: 10, spd: 10, moves: ['tackle', 'zap', 'charge']},
    frostling: {el: 'ice', hp: 44, atk: 11, def: 10, spd: 9, moves: ['tackle', 'icicle', 'snowball']},
    gloomp: {el: 'ghost', hp: 40, atk: 13, def: 9, spd: 12, moves: ['tackle', 'spook', 'shadow']}
  };
  const MOVES = {
    tackle: {name: 'Tackle', el: 'normal', pow: 35}, leafdart: {name: 'Leaf Dart', el: 'leaf', pow: 50}, regrow: {name: 'Regrow', el: 'leaf', heal: .35},
    splash: {name: 'Splash Jet', el: 'water', pow: 50}, bubbles: {name: 'Bubble Wall', el: 'water', buff: 'def'},
    ember: {name: 'Ember', el: 'fire', pow: 50}, flametail: {name: 'Flame Tail', el: 'fire', pow: 70, acc: .85},
    pollen: {name: 'Pollen Puff', el: 'bug', pow: 45}, wingbuzz: {name: 'Wing Buzz', el: 'bug', pow: 65, acc: .9},
    pebble: {name: 'Pebble Toss', el: 'rock', pow: 55}, harden: {name: 'Harden', el: 'rock', buff: 'def'},
    zap: {name: 'Zap', el: 'spark', pow: 55}, charge: {name: 'Charge Up', el: 'spark', buff: 'atk'},
    icicle: {name: 'Icicle', el: 'ice', pow: 55}, snowball: {name: 'Snowball', el: 'ice', pow: 40, buffFoe: 'spd'},
    spook: {name: 'Spook', el: 'ghost', pow: 50}, shadow: {name: 'Shadow Bite', el: 'ghost', pow: 70, acc: .85}
  };
  const STRONG = {fire: ['leaf', 'ice', 'bug'], water: ['fire', 'rock'], leaf: ['water', 'rock'], rock: ['fire', 'ice', 'bug', 'spark'], spark: ['water', 'bug'], ghost: ['ghost'], ice: ['leaf', 'bug'], bug: ['leaf']};
  const ELC = {fire: '#ff7a3a', water: '#3a8aff', leaf: '#4fc04a', rock: '#a88a5a', spark: '#e8c020', ghost: '#9a5ae8', ice: '#6ad0f0', bug: '#c0d040', normal: '#9a9aaa'};
  const NAMES = Object.keys(SPECIES);
  const ASSETS = [...NAMES.map(n => `img/mon_${n}.png`), ...['down', 'up', 'left', 'right'].flatMap(d => [0, 1, 2].map(f => `img/kid4_${d}_${f}.png`))];
  const mult = (a, d) => STRONG[a]?.includes(d) ? 2 : STRONG[d]?.includes(a) ? .5 : 1;
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const mon = (sp, lvl) => { const b = SPECIES[sp], m = {sp, lvl, xp: 0}; stats(m); m.hp = m.max; return m; };
  function stats(m) { const b = SPECIES[m.sp]; m.max = Math.round(b.hp + m.lvl * 4.2); m.atk = b.atk + m.lvl * 1.6; m.def = b.def + m.lvl * 1.5; m.spd = b.spd + m.lvl; m.buff = {atk: 1, def: 1, spd: 1}; }
  const SAVE = 'gamebox-tamer';
  const load = () => { try { return JSON.parse(localStorage.getItem(SAVE)) || null; } catch { return null; } };
  const save = s => { try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch {} };

  GameBox.register({
    id: 'tamer', title: 'Monster Tamer', genre: 'RPG', kind: 'Catch and battle', w: W, h: H, levels: 30, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Walk in tall grass to find wild monsters. Weaken them, then throw an orb to catch them! Beat the trainer to win the area.',
    desc: 'Pick a starter and explore thirty areas full of original creatures: fire pups, water blobs, leafy sprouts, crystal armadillos, electric turtles, frosty penguins, moths and ghosts. Walk through tall grass to meet wild ones, weaken them and throw a capture orb. Fire beats leaf, water beats fire, leaf beats water and more. Your team saves between areas.',
    controls: [['Arrows / WASD', 'Walk'], ['1-4 / click', 'Pick a move or button in battle'], ['Esc', 'Back in the battle menu']],
    info() { const s = this.save; return s ? `Area ${G.level} · Caught ${Object.keys(s.dex).length}/${NAMES.length}` : 'Choose your starter'; },
    init() {
      this.save = load(); this.t = 0; this.parts = []; this.done = null; this.msgT = 0;
      if (!this.save || !this.save.party?.length) { this.mode = 'starter'; return; }
      this.startArea();
    },
    startArea() {
      const n = G.level, R = G.seeded(n * 71 + 9), s = this.save;
      s.party.forEach(m => { stats(m); m.hp = m.max; });
      // keep the team in step with the areas so nobody gets stuck
      const want = 3 + Math.floor(n * 1.25), avg = s.party.reduce((a, m) => a + m.lvl, 0) / s.party.length;
      if (avg < want - 2) { s.party.forEach(m => { m.lvl = Math.max(m.lvl, want - 2); stats(m); m.hp = m.max; }); this.msg = 'Training camp! Your team grew stronger.'; this.msgT = 3; }
      save(s);
      const m = this.map = Array.from({length: MH}, (_, y) => Array.from({length: MW}, (_, x) => x === 0 || y === 0 || x === MW - 1 || y === MH - 1 ? 2 : 0));
      for (let i = 0; i < 6 + R.int(4); i++) { const x = 2 + R.int(MW - 6), y = 1 + R.int(MH - 5), w = 2 + R.int(4), h = 2 + R.int(3); for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) if (m[y + j]?.[x + k] === 0) m[y + j][x + k] = 1; }
      for (let i = 0; i < 10; i++) { const x = 2 + R.int(MW - 4), y = 2 + R.int(MH - 4); if (m[y][x] === 0) m[y][x] = 2; }
      if (R() < .7) { const x = 4 + R.int(MW - 10), y = 2 + R.int(MH - 6); for (let j = 0; j < 2; j++) for (let k = 0; k < 3; k++) m[y + j][x + k] = 3; }
      let x = 1, y = MH - 2; while (x < MW - 3 || y > 2) { m[y][x] = 4; if (x < MW - 3 && (R() < .6 || y <= 2)) x++; else y--; }
      m[y][x] = 4; this.trainer = {x: MW - 2, y: 2}; m[2][MW - 2] = 4; m[2][MW - 3] = 4;
      this.p = {x: 1.5, y: MH - 1.5, dir: 'right', step: 0, moving: false};
      const pool = NAMES.slice(0, Math.min(8, 4 + Math.floor(n / 3)));
      this.pool = pool; this.R = R;
      const tl = 2 + Math.floor(n * 1.15), tc = Math.min(4, 1 + Math.floor(n / 7));
      this.foeTeam = Array.from({length: tc}, (_, i) => mon(R.pick(pool), tl + (i === tc - 1 ? 1 : 0)));
      this.mode = 'world'; this.encT = 0; this.msg = this.msg || `Area ${n}: beat the trainer!`; this.msgT = Math.max(this.msgT, 2.5);
    },
    key(k) {
      if (this.mode === 'starter') { const i = '123'.indexOf(k); if (i >= 0) this.pickStarter(i); return; }
      if (this.mode === 'battle') { const i = '1234'.indexOf(k); if (i >= 0) this.battleClick(i); if (k === 'Escape' && this.b.menu !== 'main') this.b.menu = 'main'; }
    },
    pickStarter(i) { const sp = ['sproutle', 'puddlet', 'emberpup'][i]; this.save = {party: [mon(sp, 5)], dex: {[sp]: true}}; save(this.save); G.sfx('power'); this.startArea(); this.msg = `${cap(sp)} joins you!`; this.msgT = 2.5; },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (this.mode === 'starter') { const i = Math.floor((x - 100) / 200); if (i >= 0 && i < 3 && y > 150 && y < 420) this.pickStarter(i); return; }
      if (this.mode === 'battle') { for (let i = 0; i < 4; i++) { const bx = 420 + (i % 2) * 185, by = 370 + Math.floor(i / 2) * 58; if (x > bx && x < bx + 175 && y > by && y < by + 50) this.battleClick(i); } }
      if (this.mode === 'world') { this.tap = {x: x / T, y: y / T, t: 1.2}; }
    },
    solid(x, y) { const c = this.map[Math.floor(y)]?.[Math.floor(x)]; return c === undefined || c === 2 || c === 3; },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if (this.mode === 'world') this.walk(dt);
      if (this.mode === 'battle') this.battleTick(dt);
    },
    walk(dt) {
      const p = this.p; let mx = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my = G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp');
      if (!mx && !my && this.tap && (this.tap.t -= dt) > 0) { const dx = this.tap.x - p.x, dy = this.tap.y - p.y; if (Math.hypot(dx, dy) > .2) { mx = Math.abs(dx) > .15 ? Math.sign(dx) : 0; my = Math.abs(dy) > .15 ? Math.sign(dy) : 0; } }
      p.moving = !!(mx || my);
      if (!p.moving) return;
      const sp = 3.6 * dt, l = Math.hypot(mx, my), nx = p.x + mx / l * sp, ny = p.y + my / l * sp, r = .25;
      if (!this.solid(nx - r, p.y) && !this.solid(nx + r, p.y)) p.x = nx; if (!this.solid(p.x, ny - r) && !this.solid(p.x, ny + r)) p.y = ny;
      p.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up'); p.step += sp;
      if (Math.hypot(p.x - this.trainer.x - .5, p.y - this.trainer.y - .5) < 1.1) return this.startBattle(this.foeTeam, true);
      if (this.map[Math.floor(p.y)][Math.floor(p.x)] === 1) { this.encT += sp; if (this.encT > 1.2 && Math.random() < .14) { this.encT = 0; const lv = Math.max(2, 2 + Math.floor(G.level * 1.15) + this.R.int(3) - 1); this.startBattle([mon(G.pick(this.pool), lv)], false); } }
    },
    startBattle(team, trainer) {
      const party = this.save.party, first = party.findIndex(m => m.hp > 0);
      team.forEach(m => { stats(m); m.hp = m.max; });
      this.b = {team, trainer, foe: 0, mine: Math.max(0, first), menu: 'main', log: [trainer ? 'The trainer wants to battle!' : `A wild ${cap(team[0].sp)} appeared!`], wait: 1.2, anim: null, queue: [], faintedMine: 0, orb: null};
      this.mode = 'battle'; G.sfx('select');
    },
    me() { return this.save.party[this.b.mine]; }, foe() { return this.b.team[this.b.foe]; },
    say(t) { this.b.log.push(t); if (this.b.log.length > 2) this.b.log.shift(); },
    battleClick(i) {
      const b = this.b; if (b.wait > 0 || b.anim || b.queue.length || b.over) return;
      if (b.menu === 'main') {
        if (i === 0) b.menu = 'fight';
        if (i === 1) { if (b.trainer) return this.say("You can't catch a trainer's monster!"); this.throwOrb(); }
        if (i === 2) { const alive = this.save.party.map((m, k) => k).filter(k => k !== b.mine && this.save.party[k].hp > 0); if (!alive.length) return this.say('No one else can battle!'); b.menu = 'swap'; }
        if (i === 3) { if (b.trainer) return this.say('No running from a trainer!'); this.say('Got away safely!'); G.sfx('step'); b.over = {t: .8, go: () => this.afterWild()}; }
        return;
      }
      if (b.menu === 'fight') { const mv = SPECIES[this.me().sp].moves[i]; if (!mv) { b.menu = 'main'; return; } b.menu = 'main'; this.turn(mv); return; }
      if (b.menu === 'swap') { const alive = this.save.party.map((m, k) => k).filter(k => k !== b.mine && this.save.party[k].hp > 0); const k = alive[i]; if (k === undefined) { b.menu = 'main'; return; } b.mine = k; b.menu = 'main'; this.say(`Go, ${cap(this.me().sp)}!`); b.queue.push({who: 'foe'}); b.wait = .8; }
    },
    turn(mv) { const b = this.b, fast = this.me().spd * this.me().buff.spd >= this.foe().spd * this.foe().buff.spd; b.queue.push(...(fast ? [{who: 'me', mv}, {who: 'foe'}] : [{who: 'foe'}, {who: 'me', mv}])); },
    act(who, mvKey) {
      const b = this.b, A = who === 'me' ? this.me() : this.foe(), D = who === 'me' ? this.foe() : this.me();
      if (!A || A.hp <= 0 || !D || D.hp <= 0) return;
      const moves = SPECIES[A.sp].moves; mvKey = mvKey || this.aiMove(A, D);
      const mv = MOVES[mvKey]; this.say(`${who === 'foe' ? (b.trainer ? "Trainer's " : 'Wild ') : ''}${cap(A.sp)} used ${mv.name}!`);
      b.anim = {who, t: .5, mv};
      if (mv.heal) { A.hp = Math.min(A.max, A.hp + A.max * mv.heal); G.sfx('power', .6); return; }
      if (mv.buff) { A.buff[mv.buff] = Math.min(2, A.buff[mv.buff] + .35); this.say(`${cap(A.sp)}'s ${mv.buff === 'def' ? 'defense' : 'attack'} rose!`); G.sfx('select'); return; }
      if (Math.random() > (mv.acc || 1)) { this.say('It missed!'); return; }
      const el = mv.el === 'normal' ? 'normal' : mv.el, m = el === 'normal' ? 1 : mult(el, SPECIES[D.sp].el), stab = el === SPECIES[A.sp].el ? 1.25 : 1;
      const dmg = Math.max(1, Math.round(((2 * A.lvl / 5 + 2) * mv.pow * (A.atk * A.buff.atk) / (D.def * D.buff.def) / 50 + 2) * m * stab * (.85 + Math.random() * .15)));
      D.hp = Math.max(0, D.hp - dmg); b.hit = {who: who === 'me' ? 'foe' : 'me', t: .4, dmg};
      if (mv.buffFoe) D.buff[mv.buffFoe] = Math.max(.6, D.buff[mv.buffFoe] - .2);
      G.sfx(m > 1 ? 'boom' : 'hit', m > 1 ? .6 : .8); G.shake(m > 1 ? 7 : 3, .2);
      if (m > 1) this.say("It's super effective!"); else if (m < 1) this.say("It's not very effective…");
    },
    aiMove(A, D) { // prefers a strong hit, heals when low
      const opts = SPECIES[A.sp].moves; if (A.hp < A.max * .3 && opts.includes('regrow') && Math.random() < .6) return 'regrow';
      const scored = opts.map(k => { const mv = MOVES[k]; return [k, mv.pow ? mv.pow * (mv.el === 'normal' ? 1 : mult(mv.el, SPECIES[D.sp].el)) * (mv.acc || 1) : 20]; });
      scored.sort((a, b) => b[1] - a[1]); return Math.random() < .75 ? scored[0][0] : G.pick(opts);
    },
    throwOrb() {
      const b = this.b, f = this.foe(); const chance = Math.min(.95, .2 + (1 - f.hp / f.max) * .75);
      const shakes = Math.random() < chance ? 3 : Math.floor(Math.random() * 3);
      b.orb = {t: 0, shakes, ok: shakes === 3}; this.say('You threw a capture orb!'); G.sfx('swing');
    },
    battleTick(dt) {
      const b = this.b; b.wait -= dt;
      if (b.over) { if ((b.over.t -= dt) <= 0) { const go = b.over.go; b.over = null; go(); } return; }
      if (b.hit) { b.hit.t -= dt; if (b.hit.t <= 0) b.hit = null; }
      if (b.anim) { b.anim.t -= dt; if (b.anim.t <= 0) { b.anim = null; b.wait = .55; this.checkFaint(); } return; }
      if (b.orb) {
        b.orb.t += dt; const o = b.orb;
        if (o.t > .8 + o.shakes * .6 + (o.ok ? .3 : .2) && !o.end) {
          o.end = true;
          if (o.ok) { const f = this.foe(); this.say(`Gotcha! ${cap(f.sp)} was caught!`); G.sfx('win'); G.party(60); this.save.dex[f.sp] = true; G.score += 300;
            const s = this.save; if (s.party.length < 6) s.party.push(f); else { const worst = s.party.reduce((a, m, i) => m.lvl < s.party[a].lvl ? i : a, 0); s.party[worst] = f; this.say(`${cap(f.sp)} took a team spot.`); }
            save(s); b.over = {t: 1.6, go: () => this.afterWild()}; }
          else { this.say('Oh no! It broke free!'); b.orb = null; b.queue.push({who: 'foe'}); b.wait = .6; }
        } else if (o.t > .8 && Math.floor((o.t - .8) / .6) < o.shakes && Math.floor((o.t - .8 - dt) / .6) !== Math.floor((o.t - .8) / .6)) G.sfx('click');
        return;
      }
      if (b.wait > 0) return;
      if (b.queue.length) { const q = b.queue.shift(); this.act(q.who, q.mv); }
    },
    checkFaint() {
      const b = this.b, f = this.foe(), me = this.me();
      if (f && f.hp <= 0) {
        const xp = 12 + f.lvl * 7; this.say(`${cap(f.sp)} fainted! +${xp} XP`); b.queue = []; G.sfx('coin'); G.score += 50 + f.lvl * 10;
        for (const m of this.save.party) if (m.hp > 0) { m.xp += m === me ? xp : Math.round(xp / 3); while (m.xp >= m.lvl * 18) { m.xp -= m.lvl * 18; m.lvl++; const ratio = m.hp / m.max; stats(m); m.hp = Math.min(m.max, Math.round(m.max * ratio) + 6); if (m === me) { this.say(`${cap(m.sp)} grew to level ${m.lvl}!`); G.sfx('power'); } } }
        save(this.save);
        if (b.foe < b.team.length - 1) { b.foe++; this.say(`The trainer sends out ${cap(this.foe().sp)}!`); b.wait = 1; return; }
        if (b.trainer) { G.party(); this.say('You beat the trainer!'); const st = b.faintedMine === 0 ? 3 : b.faintedMine === 1 ? 2 : 1; G.score += 800 + G.level * 50; b.over = {t: 1.6, go: () => { this.done = {t: .1, go: () => G.win(st, 'Area cleared!')}; }}; }
        else b.over = {t: 1.4, go: () => this.afterWild()};
        return;
      }
      if (me && me.hp <= 0) {
        b.faintedMine++; this.say(`${cap(me.sp)} fainted!`); b.queue = []; G.sfx('lose', .5);
        const next = this.save.party.findIndex(m => m.hp > 0);
        if (next < 0) { save(this.save); b.over = {t: 1.6, go: () => { this.done = {t: .1, go: () => G.end('Your team needs a rest')}; }}; return; }
        b.mine = next; this.say(`Go, ${cap(this.me().sp)}!`); b.wait = 1;
      }
    },
    afterWild() { // a snack between wild battles: everyone gets half their health back
      for (const m of this.save.party) m.hp = Math.min(m.max, m.hp + m.max * .5);
      save(this.save); this.mode = 'world'; this.msg = 'Your team had a snack: +50% health'; this.msgT = 1.6;
    },
    drawMon(ctx, m, x, y, s, flip, alpha = 1) { const img = G.img(`img/mon_${m.sp}.png`); if (!img.complete || !img.naturalWidth) return; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, -s / 2, -s, s, s); ctx.restore(); },
    hpBox(ctx, m, x, y, wide) {
      G.panel(x, y, 250, wide ? 64 : 52, 12, 'rgba(255,255,255,.92)');
      G.text(cap(m.sp), x + 14, y + 22, {size: 16, weight: 800, color: '#2a2f45'}); G.text(`Lv ${m.lvl}`, x + 236, y + 22, {size: 13, align: 'right', weight: 800, color: '#2a2f45'});
      G.rr(x + 14, y + 31, 6, 12, 2, ELC[SPECIES[m.sp].el]);
      const f = m.hp / m.max; G.rr(x + 26, y + 32, 210, 10, 5, '#d8dce8'); G.rr(x + 26, y + 32, 210 * f, 10, 5, f > .5 ? '#3fc060' : f > .2 ? '#e8b020' : '#e84040');
      if (wide) { G.text(`${Math.ceil(m.hp)}/${m.max}`, x + 236, y + 58, {size: 11, align: 'right', weight: 700, color: '#2a2f45'}); G.rr(x + 26, y + 48, 120, 5, 2, '#d8dce8'); G.rr(x + 26, y + 48, 120 * Math.min(1, m.xp / (m.lvl * 18)), 5, 2, '#5cb8ff'); }
    },
    drawBattle(ctx) {
      const b = this.b, me = this.me(), f = this.foe();
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#a8dcff'); sky.addColorStop(.6, '#e8f6ff'); sky.addColorStop(.61, '#8ad06a'); sky.addColorStop(1, '#6ab04a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#5aa04a'; ctx.beginPath(); ctx.ellipse(590, 230, 150, 34, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(220, 370, 170, 38, 0, 0, Math.PI * 2); ctx.fill();
      const lunge = (who) => b.anim && b.anim.who === who ? Math.sin((1 - b.anim.t / .5) * Math.PI) * 40 : 0;
      const shake = (who) => b.hit && b.hit.who === who ? (Math.random() - .5) * 12 : 0;
      if (f && !(b.orb && b.orb.t > .7 && !(b.orb.end && !b.orb.ok))) this.drawMon(ctx, f, 590 - lunge('foe') + shake('foe'), 245, 210, false, f.hp <= 0 ? .3 : 1);
      if (me) this.drawMon(ctx, me, 220 + lunge('me') + shake('me'), 390, 240, true, me.hp <= 0 ? .3 : 1);
      if (b.hit) G.text(`-${b.hit.dmg}`, b.hit.who === 'foe' ? 590 : 220, b.hit.who === 'foe' ? 120 : 250, {size: 28, align: 'center', display: true, color: '#ff4b4b', shadow: true});
      if (b.anim && MOVES[SPECIES[(b.anim.who === 'me' ? me : f).sp].moves[0]] && b.anim.mv.pow) { const k = 1 - b.anim.t / .5, sx = b.anim.who === 'me' ? 260 : 560, ex = b.anim.who === 'me' ? 580 : 230, sy = b.anim.who === 'me' ? 300 : 170, ey = b.anim.who === 'me' ? 170 : 310; G.circle(sx + (ex - sx) * k, sy + (ey - sy) * k, 14, ELC[b.anim.mv.el]); G.circle(sx + (ex - sx) * k, sy + (ey - sy) * k, 6, '#fff'); }
      if (b.orb) { const o = b.orb, k = Math.min(1, o.t / .7), x = 260 + (590 - 260) * k, y = 330 - Math.sin(k * Math.PI) * 160 + (k >= 1 ? -70 : 0) * 0, wob = o.t > .8 && !o.end ? Math.sin(o.t * 18) * .4 : 0;
        ctx.save(); ctx.translate(x, k >= 1 ? 225 : y); ctx.rotate(wob); G.circle(0, 0, 18, '#e84040'); ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(-18, -2, 36, 4); G.circle(0, 0, 6, '#fff'); ctx.restore(); }
      if (f) this.hpBox(ctx, f, 30, 30, false); if (me) this.hpBox(ctx, me, 520, 286, true);
      G.panel(10, 360, 400, 128, 14, 'rgba(30,34,52,.92)');
      b.log.forEach((l, i) => G.text(l, 26, 396 + i * 30, {size: 16, weight: 700, color: '#fff'}));
      let labels = ['FIGHT', 'ORB', 'SWAP', 'RUN'], cols = ['#e84a4a', '#e8a020', '#3a8aff', '#7a7f99'];
      if (b.menu === 'fight') { const mv = SPECIES[me.sp].moves; labels = [0, 1, 2, 3].map(i => mv[i] ? MOVES[mv[i]].name : '◀ Back'); cols = [0, 1, 2, 3].map(i => mv[i] ? ELC[MOVES[mv[i]].el] : '#7a7f99'); }
      if (b.menu === 'swap') { const alive = this.save.party.map((m, k) => k).filter(k => k !== b.mine && this.save.party[k].hp > 0); labels = [0, 1, 2, 3].map(i => alive[i] !== undefined ? `${cap(this.save.party[alive[i]].sp)} L${this.save.party[alive[i]].lvl}` : '◀ Back'); cols = labels.map(l => l === '◀ Back' ? '#7a7f99' : '#3a8aff'); }
      const busy = b.wait > 0 || b.anim || b.queue.length || b.over || b.orb;
      labels.forEach((l, i) => { const bx = 420 + (i % 2) * 185, by = 370 + Math.floor(i / 2) * 58; G.rr(bx, by, 175, 50, 12, busy ? 'rgba(80,84,100,.8)' : cols[i]); G.text(`${i + 1}  ${l}`, bx + 87, by + 31, {size: l.length > 12 ? 13 : 16, align: 'center', weight: 800, color: '#fff'}); });
      if (b.menu === 'fight' && !busy) { const mv = SPECIES[me.sp].moves; const hov = [0, 1, 2, 3].find(i => { const bx = 420 + (i % 2) * 185, by = 370 + Math.floor(i / 2) * 58; return G.pointer.x > bx && G.pointer.x < bx + 175 && G.pointer.y > by && G.pointer.y < by + 50; }); if (hov !== undefined && mv[hov] && f) { const M = MOVES[mv[hov]], m = M.el === 'normal' || !M.pow ? 1 : mult(M.el, SPECIES[f.sp].el); G.text(M.pow ? (m > 1 ? 'Super effective!' : m < 1 ? 'Not very effective' : `Power ${M.pow}`) : M.heal ? 'Heals you' : 'Boosts you', 600, 360, {size: 13, align: 'center', weight: 800, color: m > 1 ? '#3fc060' : m < 1 ? '#e84040' : '#2a2f45'}); } }
    },
    drawWorld(ctx) {
      const m = this.map;
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const c = m[y][x], sx = x * T, sy = y * T;
        ctx.fillStyle = (x + y) % 2 ? '#7ccd5a' : '#74c454'; ctx.fillRect(sx, sy, T, T);
        if (c === 4) { ctx.fillStyle = '#e0c890'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(sx + 6, sy + 8, 4, 3); }
        if (c === 3) { ctx.fillStyle = '#4a9ae0'; ctx.fillRect(sx, sy, T, T); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; const o = Math.sin(this.t * 2 + x) * 3; ctx.beginPath(); ctx.moveTo(sx + 6, sy + 18 + o); ctx.quadraticCurveTo(sx + 20, sy + 12 + o, sx + 34, sy + 18 + o); ctx.stroke(); }
        if (c === 1) for (let k = 0; k < 3; k++) { const gx = sx + 6 + k * 12, sway = Math.sin(this.t * 3 + x + k) * 2; ctx.fillStyle = k % 2 ? '#3f9a3a' : '#2f8a30'; ctx.beginPath(); ctx.moveTo(gx - 6, sy + T); ctx.lineTo(gx + sway, sy + 8); ctx.lineTo(gx + 6, sy + T); ctx.fill(); }
        if ((x * 7 + y * 13) % 17 === 0 && c === 0) { G.circle(sx + 12, sy + 14, 3, '#ffd0e0'); G.circle(sx + 28, sy + 26, 3, '#fff6a0'); }
      }
      const ents = [];
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (m[y][x] === 2) ents.push({y: y + 1, d: () => { G.circle(x * T + 22, y * T + 32, 14, 'rgba(0,0,0,.18)'); G.rr(x * T + 16, y * T + 22, 8, 16, 2, '#7a4a24'); G.circle(x * T + 20, y * T + 14, 18, '#2f7a34'); G.circle(x * T + 14, y * T + 8, 9, '#4a9a46'); }});
      const tr = this.trainer, kid = (dir, f) => G.img(`img/kid4_${dir}_${f}.png`);
      ents.push({y: tr.y + 1, d: () => { const img = kid('left', 0); if (img.complete) { ctx.save(); ctx.filter = 'hue-rotate(150deg) saturate(1.4)'; ctx.drawImage(img, tr.x * T - 28, tr.y * T - 40, 96, 96); ctx.restore(); } G.text('!', tr.x * T + 20, tr.y * T - 30 + Math.sin(this.t * 5) * 3, {size: 22, align: 'center', display: true, color: '#ff4b4b', shadow: true}); }});
      const p = this.p; ents.push({y: p.y, d: () => { const img = kid(p.dir, p.moving ? 1 + Math.floor(this.t * 8) % 2 : 0); if (img.complete && img.naturalWidth) ctx.drawImage(img, p.x * T - 48, p.y * T - 82, 96, 96); }});
      ents.sort((a, b) => a.y - b.y).forEach(e => e.d());
      // team strip
      const party = this.save.party;
      G.panel(8, H - 56, 50 + party.length * 52, 48, 12, 'rgba(255,255,255,.85)');
      party.forEach((mm, i) => { const img = G.img(`img/mon_${mm.sp}.png`); if (img.complete) ctx.drawImage(img, 14 + i * 52, H - 58, 48, 48); G.text(`L${mm.lvl}`, 38 + i * 52, H - 12, {size: 10, align: 'center', weight: 800, color: '#2a2f45'}); });
      G.text(`Caught ${Object.keys(this.save.dex).length}/${NAMES.length}`, W - 14, 26, {size: 14, align: 'right', weight: 800, color: '#fff', shadow: true});
      G.text(`AREA ${G.level}`, 14, 26, {size: 14, weight: 800, color: '#fff', shadow: true});
    },
    drawStarter(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#8ad0ff'); g.addColorStop(1, '#d8f0ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      G.text('Pick your first monster!', W / 2, 90, {size: 34, align: 'center', display: true, color: '#2a2f45'});
      ['sproutle', 'puddlet', 'emberpup'].forEach((sp, i) => { const x = 100 + i * 200, hov = G.pointer.x > x && G.pointer.x < x + 200 && G.pointer.y > 150 && G.pointer.y < 420; G.rr(x + 10, 150 + (hov ? -6 : 0), 180, 260, 20, '#fff'); this.drawMon(ctx, {sp}, x + 100, 330 + (hov ? -6 : 0), 170 + Math.sin(this.t * 3 + i) * 4); G.text(cap(sp), x + 100, 370, {size: 20, align: 'center', weight: 800, color: '#2a2f45'}); G.text(`${i + 1}  ${SPECIES[sp].el.toUpperCase()}`, x + 100, 396, {size: 13, align: 'center', weight: 800, color: ELC[SPECIES[sp].el]}); });
    },
    draw(ctx, dt) {
      if (this.mode === 'starter') this.drawStarter(ctx);
      else if (this.mode === 'battle') this.drawBattle(ctx);
      else this.drawWorld(ctx);
      if (this.msgT > 0 && this.mode === 'world') G.text(this.msg, W / 2, 60, {size: 20, align: 'center', display: true, color: '#fff', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

(() => {
  // Top-down battle royale: 24 players, loot, building, a shrinking storm. Bots, local duo, or online with friends.
  const W = 800, H = 500, WORLD = 3000, N = 24, PR = 15;
  const COLORS = ['orange', 'blue', 'red', 'green', 'purple', 'yellow', 'teal', 'pink'];
  const HEX = {orange: '#ff8c2a', blue: '#3d8bff', red: '#e04e5f', green: '#3fbf6a', purple: '#8b5cd6', yellow: '#ffcf5c', teal: '#2fb89a', pink: '#ff6bb5'};
  const RARITY = [['Common', '#b8bcc8', 1], ['Uncommon', '#5ee67a', 1.1], ['Rare', '#5cb8ff', 1.2], ['Epic', '#b57bff', 1.32], ['Legendary', '#ffb347', 1.48]];
  const GUNS = {
    pistol: {name: 'Pistol', dmg: 22, rate: .3, mag: 12, spread: .05, speed: 950, life: .6, reload: 1.1, img: 'pistol'},
    smg: {name: 'SMG', dmg: 13, rate: .085, mag: 30, spread: .11, speed: 950, life: .5, reload: 1.5, img: 'smg'},
    shotgun: {name: 'Shotgun', dmg: 10, rate: .85, mag: 5, spread: .32, speed: 820, life: .33, reload: 2, pellets: 8, img: 'rifle'},
    rifle: {name: 'Rifle', dmg: 29, rate: .15, mag: 30, spread: .045, speed: 1150, life: .8, reload: 2, img: 'rifle'},
    sniper: {name: 'Sniper', dmg: 92, rate: 1.3, mag: 5, spread: .008, speed: 1700, life: 1, reload: 2.5, img: 'sniper'}
  };
  const GUN_KINDS = Object.keys(GUNS);
  const PHASES = [[25, 18, 1050, 1], [20, 16, 680, 2], [16, 14, 400, 4], [13, 12, 210, 6], [10, 10, 80, 9], [8, 10, 0, 12]];
  const NAMES = ['Zap', 'Mochi', 'Rex', 'Pixel', 'Nova', 'Bolt', 'Taco', 'Ziggy', 'Luna', 'Gizmo', 'Ace', 'Noodle', 'Blaze', 'Kiwi', 'Turbo', 'Pip', 'Echo', 'Sprout', 'Ninja', 'Cosmo', 'Bean', 'Dash', 'Fuzz', 'Jinx'];
  const segRect = (x1, y1, x2, y2, r) => { // does the segment cross rectangle r?
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
      if (p === 0) { if (q < 0) return false; continue; }
      const t = q / p; if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  };

  GameBox.register({
    id: 'royale', thumb: 'jpg', title: 'Storm Royale', genre: 'Shooter', kind: 'Battle royale', w: W, h: H, cursor: 'crosshair', modes: ['bot', 'local', 'online'],
    assets: [...COLORS.flatMap(c => [0, 1].map(f => `img/top_${c}_${f}.png`)), ...['pistol', 'smg', 'rifle', 'sniper'].map(k => `img/gun_${k}.png`)],
    hint: 'Grab loot, chop trees for wood, build walls, stay out of the storm. Be the last one standing!',
    desc: 'Twenty-four players land on an island. Grab guns from the ground and from glowing chests (rarer colours hit harder), chop trees with your pickaxe for wood and build walls to block shots, and stay inside the safe circle as the storm closes in. Play solo against bots, team up with a friend on one keyboard, or play friends online.',
    controls: [['W A S D', 'Move'], ['Mouse', 'Aim'], ['Click / Space', 'Shoot or swing the pickaxe'], ['1 2 3 4', 'Pickaxe, then your three gun slots'], ['Q', 'Build a wall (10 wood)'], ['E', 'Swap the gun in your hand for one on the ground'], ['R', 'Reload'],
      ['2 Players', 'P1: W A S D move, F shoot (auto-aims), G build, R reload, Q E switch'], ['2 Players', 'P2: arrows move, / shoot, . build, , switch']],
    info() { const me = this.ps?.[this.me]; return `Alive ${this.alive} · Kills ${me ? me.kills : 0}`; },
    init() {
      this.seed = this.seed && G.net?.role === 'client' ? this.seed : Math.floor(Math.random() * 1e9);
      this.build(); this.parts = []; this.bullets = []; this.t = 0; this.sendT = 0; this.lootT = 0; this.over = false; this.feed = [];
      const humans = G.mode === 'local' ? 2 : G.mode === 'online' && G.net ? 1 + G.net.peers.length : 1;
      this.me = G.net?.role === 'client' ? G.net.index : 0;
      this.ps = [];
      const rnd = Math.random;
      for (let i = 0; i < N; i++) {
        let x, y;
        do { x = 200 + rnd() * (WORLD - 400); y = 200 + rnd() * (WORLD - 400); } while (this.blocked(x, y, PR + 4));
        this.ps.push({i, name: i < humans ? (G.mode === 'local' ? `P${i + 1}` : i === 0 ? 'You' : `Friend ${i}`) : NAMES[i % NAMES.length], human: i < humans,
          x, y, a: rnd() * 6.28, hp: 100, sh: 0, alive: true, color: COLORS[i % COLORS.length], slots: [null, null, null], cur: 0, wood: 30, kills: 0,
          cd: 0, reload: 0, walk: 0, hurt: 0, place: 0, team: G.mode === 'local' && i < 2 ? 1 : i + 10, think: 0, goal: null, target: null, swing: 0, drop: 2});
      }
      this.alive = N;
      this.storm = {cx: WORLD / 2, cy: WORLD / 2, r: 2200, from: null, phase: -1, t: 3, shrinking: false};
      this.nextPhase();
      this.remote = {};
      if (G.net?.role === 'host') G.net.send({t: 'seed', seed: this.seed});
    },
    build() { // island layout from the seed: buildings, trees, rocks, chests and floor loot
      const r = G.seeded(this.seed);
      this.walls = []; this.floors = []; this.trees = []; this.rocks = []; this.chests = []; this.loot = [];
      for (let b = 0; b < 22; b++) {
        const w = 160 + r.int(4) * 40, h = 140 + r.int(4) * 40, x = 150 + r() * (WORLD - 300 - w), y = 150 + r() * (WORLD - 300 - h);
        if (this.floors.some(f => x < f.x + f.w + 80 && x + w + 80 > f.x && y < f.y + f.h + 80 && y + h + 80 > f.y)) continue;
        this.floors.push({x, y, w, h, c: r.pick(['#8a7a68', '#6f7a8a', '#7a6a7a', '#80705a'])});
        const t = 12, door = 56, side = r.int(4);
        const add = (x, y, w, h) => { if (w > 2 && h > 2) this.walls.push({x, y, w, h, hp: Infinity, wood: false}); };
        // four walls, each with a doorway on one or two sides
        const gap = (s) => s === side || s === (side + 2) % 4 && r() < .5;
        if (gap(0)) { add(x, y, (w - door) / 2, t); add(x + (w + door) / 2, y, (w - door) / 2, t); } else add(x, y, w, t);
        if (gap(2)) { add(x, y + h - t, (w - door) / 2, t); add(x + (w + door) / 2, y + h - t, (w - door) / 2, t); } else add(x, y + h - t, w, t);
        if (gap(3)) { add(x, y, t, (h - door) / 2); add(x, y + (h + door) / 2, t, (h - door) / 2); } else add(x, y, t, h);
        if (gap(1)) { add(x + w - t, y, t, (h - door) / 2); add(x + w - t, y + (h + door) / 2, t, (h - door) / 2); } else add(x + w - t, y, t, h);
        this.chests.push({x: x + w / 2 + (r() - .5) * (w - 80), y: y + h / 2 + (r() - .5) * (h - 80), open: false});
        for (let k = 0; k < 2; k++) this.loot.push(this.item(x + 30 + r() * (w - 60), y + 30 + r() * (h - 60), r));
      }
      const inBuilding = (x, y, pad) => this.floors.some(f => x > f.x - pad && x < f.x + f.w + pad && y > f.y - pad && y < f.y + f.h + pad);
      for (let i = 0; i < 260; i++) { const x = r() * WORLD, y = r() * WORLD; if (!inBuilding(x, y, 40)) this.trees.push({x, y, r: 22 + r() * 14, hp: 60}); }
      for (let i = 0; i < 70; i++) { const x = r() * WORLD, y = r() * WORLD; if (!inBuilding(x, y, 30)) this.rocks.push({x, y, r: 16 + r() * 14, hp: 90}); }
      for (let i = 0; i < 90; i++) { const x = 100 + r() * (WORLD - 200), y = 100 + r() * (WORLD - 200); if (!inBuilding(x, y, 0)) this.loot.push(this.item(x, y, r)); }
    },
    item(x, y, r = Math.random) {
      const roll = r();
      if (roll < .62) { const kind = GUN_KINDS[Math.floor(r() * GUN_KINDS.length)], rar = Math.min(4, Math.floor(-Math.log(1 - r() * .97) * 1.1)); return {x, y, type: 'gun', kind, rar}; }
      return {x, y, type: roll < .78 ? 'bandage' : roll < .9 ? 'shield' : 'medkit'};
    },
    blocked(x, y, rad) {
      if (x < rad || y < rad || x > WORLD - rad || y > WORLD - rad) return true;
      for (const w of this.walls) if (x + rad > w.x && x - rad < w.x + w.w && y + rad > w.y && y - rad < w.y + w.h) return true;
      for (const o of this.trees) if (o.hp > 0 && (x - o.x) ** 2 + (y - o.y) ** 2 < (rad + o.r * .55) ** 2) return true;
      for (const o of this.rocks) if (o.hp > 0 && (x - o.x) ** 2 + (y - o.y) ** 2 < (rad + o.r) ** 2) return true;
      return false;
    },
    clear(x1, y1, x2, y2) { return !this.walls.some(w => segRect(x1, y1, x2, y2, w)); },
    nextPhase() {
      const s = this.storm; s.phase++;
      if (s.phase >= PHASES.length) { s.t = 1e9; return; }
      const [wait, shrink, nr, dmg] = PHASES[s.phase];
      const a = Math.random() * 6.28, d = Math.random() * Math.max(0, s.r - nr) * .8;
      s.ncx = G.clamp(s.cx + Math.cos(a) * d, nr + 50, WORLD - nr - 50); s.ncy = G.clamp(s.cy + Math.sin(a) * d, nr + 50, WORLD - nr - 50); s.nr = nr;
      s.t = wait; s.shrink = shrink; s.dmg = dmg; s.shrinking = false;
    },
    key(k) {
      if (G.net?.role === 'client') return;
      const p = this.ps[0];
      if (G.mode === 'local') {
        const p2 = this.ps[1];
        if (k === 'q' || k === 'e') this.cycle(p, k === 'e' ? 1 : -1);
        if (k === 'g') this.buildWall(p);
        if (k === 'r') this.startReload(p);
        if (k === ',') this.cycle(p2, 1);
        if (k === '.') this.buildWall(p2);
        return;
      }
      const i = '1234'.indexOf(k); if (i >= 0) p.cur = i;
      if (k === 'q') this.buildWall(p);
      if (k === 'r') this.startReload(p);
      if (k === 'e') this.swap(p);
    },
    netMessage(m, from) {
      if (m.t === 'seed') { this.seed = m.seed; this.build(); return; }
      if (m.t === 's') { this.snap = m; return; }
      if (m.t === 'world') { this.loot = m.loot; this.walls = m.walls.map(w => ({...w, hp: w.hp ?? Infinity})); this.trees.forEach((t, i) => { t.hp = m.trees[i] ?? t.hp; }); this.chests.forEach((c, i) => { c.open = !!m.chests[i]; }); return; }
      const idx = G.net?.inputs[from]?.index; if (idx === undefined) return;
      const p = this.ps[idx], R = this.remote[idx] ||= {aim: 0, fire: false};
      if (m.t === 'aim') R.aim = m.a; if (m.t === 'fire') R.fire = m.down;
      if (m.t === 'act') { if (m.k === 'q') this.buildWall(p); if (m.k === 'r') this.startReload(p); if (m.k === 'e') this.swap(p); const s = '1234'.indexOf(m.k); if (s >= 0) p.cur = s; }
    },
    pointer(type, x, y) {
      if (G.net?.role !== 'client') return;
      if (type === 'down' || type === 'up') G.net.send({t: 'fire', down: type === 'down'});
    },
    cycle(p, d) { const opts = [0, ...[1, 2, 3].filter(s => p.slots[s - 1])]; p.cur = opts[(opts.indexOf(p.cur) + d + opts.length) % opts.length]; },
    gun(p) { return p.cur > 0 ? p.slots[p.cur - 1] : null; },
    startReload(p) { const g = this.gun(p); if (g && p.reload <= 0 && g.ammo < GUNS[g.kind].mag) p.reload = GUNS[g.kind].reload; },
    swap(p) {
      const it = this.loot.find(l => l.type === 'gun' && G.dist(l.x, l.y, p.x, p.y) < 50);
      if (!it) return;
      const slot = p.cur > 0 ? p.cur - 1 : p.slots.findIndex(s => !s) >= 0 ? p.slots.findIndex(s => !s) : 0;
      const old = p.slots[slot];
      p.slots[slot] = {kind: it.kind, rar: it.rar, ammo: GUNS[it.kind].mag}; p.cur = slot + 1;
      this.loot.splice(this.loot.indexOf(it), 1);
      if (old) this.loot.push({x: p.x + 20, y: p.y, type: 'gun', kind: old.kind, rar: old.rar});
      if (p.human) G.sfx('select');
    },
    buildWall(p) {
      if (!p.alive || p.wood < 10) return;
      const d = 46, cx = p.x + Math.cos(p.a) * d, cy = p.y + Math.sin(p.a) * d, horiz = Math.abs(Math.sin(p.a)) > Math.abs(Math.cos(p.a));
      const w = horiz ? {x: cx - 36, y: cy - 6, w: 72, h: 12} : {x: cx - 6, y: cy - 36, w: 12, h: 72};
      if (this.ps.some(o => o.alive && o.x + PR > w.x && o.x - PR < w.x + w.w && o.y + PR > w.y && o.y - PR < w.y + w.h)) return;
      p.wood -= 10; this.walls.push({...w, hp: 150, wood: true});
      if (p.human || G.dist(p.x, p.y, this.ps[this.me].x, this.ps[this.me].y) < 400) G.sfx('crunch', .6);
    },
    shoot(p) {
      const g = this.gun(p);
      if (p.cd > 0 || p.reload > 0) return;
      if (!g) { // pickaxe: melee hit and harvesting
        p.cd = .4; p.swing = .2;
        const hx = p.x + Math.cos(p.a) * 34, hy = p.y + Math.sin(p.a) * 34;
        for (const o of this.ps) if (o !== p && o.alive && G.dist(o.x, o.y, hx, hy) < 28 && o.team !== p.team) this.damage(o, 20, p);
        for (const t of [...this.trees, ...this.rocks]) if (t.hp > 0 && G.dist(t.x, t.y, hx, hy) < t.r + 16) { t.hp -= 20; p.wood = Math.min(999, p.wood + 8); if (p.human) { G.sfx('crunch', .5); G.popText(this.parts, t.x, t.y - t.r, '+8 wood', '#c9a26b', 13); } break; }
        for (const w of this.walls) if (w.wood && hx > w.x - 10 && hx < w.x + w.w + 10 && hy > w.y - 10 && hy < w.y + w.h + 10) { w.hp -= 40; break; }
        if (p.human) G.sfx('swing', .6);
        return;
      }
      const G0 = GUNS[g.kind];
      if (g.ammo <= 0) return this.startReload(p);
      g.ammo--; p.cd = G0.rate;
      const mult = RARITY[g.rar][2];
      for (let k = 0; k < (G0.pellets || 1); k++) {
        const a = p.a + (Math.random() - .5) * 2 * G0.spread;
        this.bullets.push({x: p.x + Math.cos(p.a) * 22, y: p.y + Math.sin(p.a) * 22, vx: Math.cos(a) * G0.speed, vy: Math.sin(a) * G0.speed, dmg: G0.dmg * mult, owner: p, life: G0.life});
      }
      const me = this.ps[this.me], d = G.dist(p.x, p.y, me.x, me.y);
      if (d < 700) G.sfx(g.kind === 'shotgun' || g.kind === 'sniper' ? 'boom' : 'gun', Math.max(.15, 1 - d / 700) * (g.kind === 'shotgun' || g.kind === 'sniper' ? .6 : 1));
      if (g.ammo === 0) this.startReload(p);
    },
    damage(o, dmg, by) {
      if (!o.alive) return;
      const s = Math.min(o.sh, dmg); o.sh -= s; o.hp -= dmg - s; o.hurt = .25;
      if (by?.human && by.i === this.me) { G.popText(this.parts, o.x, o.y - 26, String(Math.round(dmg)), s ? '#5cb8ff' : '#ffffff', 14); G.sfx('hit', .5); }
      if (o.hp > 0) return;
      o.alive = false; o.place = this.alive; this.alive--;
      if (by) { by.kills++; if (by.i === this.me || (G.mode === 'local' && by.i < 2)) G.score += 100; }
      this.feed.unshift({t: 4, text: `${by ? by.name : 'Storm'} ✖ ${o.name}`});
      for (const s2 of o.slots) if (s2) this.loot.push({x: o.x + (Math.random() - .5) * 40, y: o.y + (Math.random() - .5) * 40, type: 'gun', kind: s2.kind, rar: s2.rar});
      this.loot.push({x: o.x, y: o.y + 20, type: 'medkit'});
      G.burst(this.parts, o.x, o.y, HEX[o.color], 24, 200);
      if (o.human) { if (o.i === this.me || G.mode === 'local') { G.shake(8, .4); G.sfx('hurt'); } }
    },
    input(p) {
      const k = G.keys;
      if (G.mode === 'local' && p.i < 2) {
        const [u, d, l, r, f] = p.i === 0 ? ['w', 's', 'a', 'd', 'f'] : ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '/'];
        const mx = (k[r] ? 1 : 0) - (k[l] ? 1 : 0), my = (k[d] ? 1 : 0) - (k[u] ? 1 : 0);
        let aim = mx || my ? Math.atan2(my, mx) : p.a;
        const t = this.nearestFoe(p, 360);
        if (t && k[f]) aim = Math.atan2(t.y - p.y, t.x - p.x) + (Math.random() - .5) * .06;
        return {mx, my, aim, fire: !!k[f]};
      }
      if (p.i === 0 && G.mode !== 'local') {
        const v = this.view; // mouse aims relative to the player's screen position
        return {mx: G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft'), my: G.held('s', 'ArrowDown') - G.held('w', 'ArrowUp'),
          aim: v ? Math.atan2(G.pointer.y - (p.y - v.y), G.pointer.x - (p.x - v.x)) : p.a, fire: G.pointer.down || !!k[' ']};
      }
      if (G.mode === 'online' && p.human) {
        const peer = G.net?.peers.find(c => G.net.inputs[c.peer]?.index === p.i), kk = peer ? G.net.inputs[peer.peer].keys : {};
        const R = this.remote[p.i] || {aim: p.a, fire: false};
        return {mx: (kk.d || kk.ArrowRight ? 1 : 0) - (kk.a || kk.ArrowLeft ? 1 : 0), my: (kk.s || kk.ArrowDown ? 1 : 0) - (kk.w || kk.ArrowUp ? 1 : 0), aim: R.aim, fire: R.fire || !!kk[' ']};
      }
      return this.bot(p);
    },
    nearestFoe(p, range) {
      let best = null, bd = range;
      for (const o of this.ps) { if (o === p || !o.alive || o.team === p.team) continue; const d = G.dist(p.x, p.y, o.x, o.y); if (d < bd && this.clear(p.x, p.y, o.x, o.y)) { bd = d; best = o; } }
      return best;
    },
    bot(p) {
      const s = this.storm, inp = {mx: 0, my: 0, aim: p.a, fire: false};
      if ((p.think -= G.dt) <= 0) {
        p.think = .25 + Math.random() * .15;
        p.target = this.nearestFoe(p, 380);
        const safeR = s.shrinking || s.t < 8 ? s.nr : s.r, safeX = s.shrinking || s.t < 8 ? s.ncx : s.cx, safeY = s.shrinking || s.t < 8 ? s.ncy : s.cy;
        if (G.dist(p.x, p.y, safeX, safeY) > safeR * .85) p.goal = {x: safeX + (Math.random() - .5) * safeR * .5, y: safeY + (Math.random() - .5) * safeR * .5};
        else if (!p.slots.some(Boolean) || (!p.goal && Math.random() < .5)) {
          const items = [...this.loot.filter(l => l.type === 'gun'), ...this.chests.filter(c => !c.open)];
          let best = null, bd = 900;
          for (const it of items) { const d = G.dist(p.x, p.y, it.x, it.y); if (d < bd && G.dist(it.x, it.y, safeX, safeY) < safeR) { bd = d; best = it; } }
          p.goal = best ? {x: best.x, y: best.y} : {x: safeX + (Math.random() - .5) * safeR, y: safeY + (Math.random() - .5) * safeR};
        }
        if (p.slots.some(Boolean) && !this.gun(p)) p.cur = p.slots.findIndex(Boolean) + 1;
        if (p.hurt > 0 && p.wood >= 10 && Math.random() < .25) this.buildWall(p);
      }
      const t = p.target;
      if (t && t.alive) {
        const d = G.dist(p.x, p.y, t.x, t.y), err = Math.max(.05, .32 - this.t / 500);
        inp.aim = Math.atan2(t.y - p.y, t.x - p.x) + Math.sin(this.t * 3 + p.i) * err;
        inp.fire = (this.gun(p) ? d < 360 : d < 40) && this.clear(p.x, p.y, t.x, t.y);
        const want = this.gun(p) ? (d > 300 ? 1 : d < 160 ? -1 : 0) : 1;
        const side = Math.sin(this.t * 1.7 + p.i * 2);
        inp.mx = Math.cos(inp.aim) * want - Math.sin(inp.aim) * side * .7; inp.my = Math.sin(inp.aim) * want + Math.cos(inp.aim) * side * .7;
      } else if (p.goal) {
        const dx = p.goal.x - p.x, dy = p.goal.y - p.y, d = Math.hypot(dx, dy);
        if (d < 20) p.goal = null; else { inp.mx = dx / d; inp.my = dy / d; inp.aim = Math.atan2(dy, dx); }
        const tree = this.trees.find(o => o.hp > 0 && G.dist(o.x, o.y, p.x + inp.mx * 30, p.y + inp.my * 30) < o.r + 10);
        if (tree && p.wood < 60) { inp.aim = Math.atan2(tree.y - p.y, tree.x - p.x); p.cur = 0; inp.fire = true; }
      }
      return inp;
    },
    update(dt) {
      if (G.net?.role === 'client') return this.clientUpdate(dt);
      this.t += dt;
      for (const f of this.feed) f.t -= dt;
      this.feed = this.feed.filter(f => f.t > 0).slice(0, 5);
      const s = this.storm;
      if ((s.t -= dt) <= 0) {
        if (!s.shrinking) { s.shrinking = true; s.from = {cx: s.cx, cy: s.cy, r: s.r}; s.t = s.shrink; s.total = s.shrink; if (this.ps[this.me].alive) G.sfx('laser', .6); }
        else { s.cx = s.ncx; s.cy = s.ncy; s.r = s.nr; this.nextPhase(); }
      }
      if (s.shrinking) { const k = 1 - Math.max(0, s.t) / s.total; s.cx = G.lerp(s.from.cx, s.ncx, k); s.cy = G.lerp(s.from.cy, s.ncy, k); s.r = G.lerp(s.from.r, s.nr, k); }
      for (const p of this.ps) {
        if (!p.alive) continue;
        p.cd -= dt; p.hurt -= dt; p.swing -= dt; p.drop -= dt;
        const g = this.gun(p);
        if (p.reload > 0 && (p.reload -= dt) <= 0 && g) g.ammo = GUNS[g.kind].mag;
        const inp = this.input(p);
        p.a = inp.aim;
        const len = Math.hypot(inp.mx, inp.my);
        if (len > .1) {
          const sp = 175 * dt / Math.max(1, len), nx = p.x + inp.mx * sp, ny = p.y + inp.my * sp;
          if (!this.blocked(nx, p.y, PR)) p.x = nx;
          if (!this.blocked(p.x, ny, PR)) p.y = ny;
          p.walk += sp;
        }
        if (inp.fire) this.shoot(p);
        if (G.dist(p.x, p.y, s.cx, s.cy) > s.r) { p.stormT = (p.stormT || 0) + dt; if (p.stormT > 1) { p.stormT = 0; this.damage(p, s.dmg || 1, null); } }
        for (const c of this.chests) if (!c.open && G.dist(c.x, c.y, p.x, p.y) < 34) {
          c.open = true; p.wood += 20;
          this.loot.push(this.item(c.x + 22, c.y, () => Math.random() * .62), this.item(c.x - 22, c.y));
          if (p.human) { G.sfx('power'); G.popText(this.parts, c.x, c.y - 20, 'CHEST!', '#ffcf5c'); }
        }
        for (let li = this.loot.length - 1; li >= 0; li--) {
          const l = this.loot[li];
          if (G.dist(l.x, l.y, p.x, p.y) > 26) continue;
          if (l.type === 'gun') {
            const empty = p.slots.findIndex(x => !x);
            if (empty < 0) continue;
            p.slots[empty] = {kind: l.kind, rar: l.rar, ammo: GUNS[l.kind].mag};
            if (!this.gun(p)) p.cur = empty + 1;
            if (p.human && p.i === this.me) { G.sfx('select'); G.popText(this.parts, p.x, p.y - 30, `${RARITY[l.rar][0]} ${GUNS[l.kind].name}`, RARITY[l.rar][1], 13); }
          } else if (l.type === 'shield') { if (p.sh >= 100) continue; p.sh = Math.min(100, p.sh + 50); }
          else { if (p.hp >= 100) continue; p.hp = Math.min(100, p.hp + (l.type === 'medkit' ? 100 : 30)); }
          if (l.type !== 'gun' && p.human) G.sfx('power', .6);
          this.loot.splice(li, 1);
        }
      }
      for (const b of this.bullets) {
        for (let k = 0; k < 3 && b.life > 0; k++) {
          b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
          const w = this.walls.find(w => b.x > w.x && b.x < w.x + w.w && b.y > w.y && b.y < w.y + w.h);
          if (w) { if (w.wood) w.hp -= b.dmg; b.life = 0; G.burst(this.parts, b.x, b.y, w.wood ? '#c9a26b' : '#9aa0a8', 3, 80); break; }
          if (this.trees.some(t => t.hp > 0 && (b.x - t.x) ** 2 + (b.y - t.y) ** 2 < (t.r * .5) ** 2) || this.rocks.some(t => t.hp > 0 && (b.x - t.x) ** 2 + (b.y - t.y) ** 2 < t.r ** 2)) { b.life = 0; break; }
          const hit = this.ps.find(o => o.alive && o !== b.owner && o.team !== b.owner.team && (b.x - o.x) ** 2 + (b.y - o.y) ** 2 < (PR + 3) ** 2);
          if (hit) { this.damage(hit, b.dmg, b.owner); b.life = 0; }
        }
        b.life -= dt;
      }
      this.bullets = this.bullets.filter(b => b.life > 0);
      this.walls = this.walls.filter(w => w.hp > 0);
      // match end
      const living = this.ps.filter(p => p.alive), humans = this.ps.filter(p => p.human);
      const teams = new Set(living.map(p => p.team));
      if (!this.over) {
        if (teams.size <= 1) {
          this.over = true;
          const win = living[0];
          G.score += win?.human ? 1000 : 0;
          if (win?.human) G.party();
          setTimeout(() => G.end(win ? (win.human ? (G.mode === 'online' && win.i !== 0 ? `${win.name} is the champion!` : 'You are the champion!') : `${win.name} won`) : 'Nobody survived'), 1500);
        } else if (G.mode !== 'online' && humans.every(p => !p.alive)) {
          this.over = true; const best = Math.min(...humans.map(p => p.place));
          G.score += Math.max(0, (N - best) * 30);
          setTimeout(() => G.end(`#${best} of ${N}`), 1200);
        }
      }
      if (G.net?.role === 'host') {
        if ((this.sendT -= dt) <= 0) {
          this.sendT = .06;
          G.net.send({t: 's', p: this.ps.map(p => [Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), Math.ceil(p.hp), Math.ceil(p.sh), p.alive ? 1 : 0, p.cur, p.wood, p.kills, p.place, p.slots.map(s => s ? [s.kind, s.rar, s.ammo] : 0), p.hurt > 0 ? 1 : 0, Math.round(p.walk)]),
            b: this.bullets.map(b => [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy)]), s: {cx: this.storm.cx, cy: this.storm.cy, r: this.storm.r, ncx: this.storm.ncx, ncy: this.storm.ncy, nr: this.storm.nr, t: this.storm.t, sh: this.storm.shrinking}, alive: this.alive, feed: this.feed});
        }
        if ((this.lootT -= dt) <= 0) {
          this.lootT = .5;
          G.net.send({t: 'world', loot: this.loot, walls: this.walls.map(w => ({x: w.x, y: w.y, w: w.w, h: w.h, wood: w.wood, hp: w.wood ? w.hp : null})), trees: this.trees.map(t => t.hp), chests: this.chests.map(c => c.open ? 1 : 0)});
        }
      }
    },
    clientUpdate(dt) {
      const m = this.snap; if (!m) return;
      m.p.forEach((q, i) => {
        const p = this.ps[i]; if (!p) return;
        [p.x, p.y, p.a, p.hp, p.sh] = q; p.alive = !!q[5]; p.cur = q[6]; p.wood = q[7]; p.kills = q[8]; p.place = q[9];
        p.slots = q[10].map(s => s ? {kind: s[0], rar: s[1], ammo: s[2]} : null); p.hurt = q[11] ? .2 : 0; p.walk = q[12];
      });
      this.bullets = m.b.map(([x, y, vx, vy]) => ({x, y, vx, vy}));
      Object.assign(this.storm, {cx: m.s.cx, cy: m.s.cy, r: m.s.r, ncx: m.s.ncx, ncy: m.s.ncy, nr: m.s.nr, t: m.s.t, shrinking: m.s.sh});
      this.alive = m.alive; this.feed = m.feed;
      const me = this.ps[this.me], v = this.view;
      if (v && me) {
        const a = Math.atan2(G.pointer.y - (me.y - v.y), G.pointer.x - (me.x - v.x));
        if (Math.abs(a - (this.sentAim ?? 99)) > .03) { this.sentAim = a; G.net.send({t: 'aim', a}); }
      }
      for (const k of ['q', 'r', 'e', '1', '2', '3', '4']) { if (G.keys[k] && !this.held?.[k]) G.net.send({t: 'act', k}); }
      this.held = {...G.keys};
    },
    viewport(ctx, p, vx, vy, vw, vh, primary) {
      const cx = G.clamp(p.x - vw / 2, -60, WORLD - vw + 60), cy = G.clamp(p.y - vh / 2, -60, WORLD - vh + 60);
      if (primary) this.view = {x: cx - vx, y: cy - vy};
      ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip(); ctx.translate(vx - cx, vy - cy);
      // ground: grass with sandy and mossy patches
      const T0 = 100, x0 = Math.floor(cx / T0), y0 = Math.floor(cy / T0);
      for (let tx = x0; tx <= x0 + vw / T0 + 1; tx++) for (let ty = y0; ty <= y0 + vh / T0 + 1; ty++) {
        const h = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1, edge = tx < 0 || ty < 0 || tx >= WORLD / T0 || ty >= WORLD / T0;
        ctx.fillStyle = edge ? '#3b8fc4' : h > .93 ? '#c9b48a' : h > .5 ? '#5aa04f' : '#55994a'; ctx.fillRect(tx * T0, ty * T0, T0 + 1, T0 + 1);
      }
      for (const f of this.floors) { G.rr(f.x, f.y, f.w, f.h, 4, f.c); ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let yy = f.y; yy < f.y + f.h; yy += 20) ctx.fillRect(f.x, yy, f.w, 1); }
      const seen = o => o.x > cx - 80 && o.x < cx + vw + 80 && o.y > cy - 80 && o.y < cy + vh + 80;
      for (const c of this.chests) if (seen(c)) {
        G.rr(c.x - 16, c.y - 12, 32, 24, 4, c.open ? '#6b4a33' : '#b8862e');
        if (!c.open) { G.rr(c.x - 16, c.y - 4, 32, 4, 1, '#ffcf5c'); G.circle(c.x, c.y, 30 + Math.sin(this.t * 4) * 3, 'rgba(255,207,92,.16)'); }
      }
      for (const l of this.loot) if (seen(l)) {
        if (l.type === 'gun') {
          const col = RARITY[l.rar][1]; G.circle(l.x, l.y, 16, col + '40');
          const img = G.img(`img/gun_${GUNS[l.kind].img}.png`); if (img.complete) ctx.drawImage(img, l.x - 26, l.y - 20, 52, 35);
          ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(l.x, l.y, 16, 0, Math.PI * 2); ctx.stroke();
        } else if (l.type === 'shield') { G.rr(l.x - 7, l.y - 11, 14, 22, 5, '#5cb8ff'); G.rr(l.x - 4, l.y - 14, 8, 5, 2, '#e8f6ff'); }
        else { G.rr(l.x - 10, l.y - 8, 20, 16, 4, '#f3ead7'); ctx.fillStyle = '#e04e5f'; ctx.fillRect(l.x - 2, l.y - 6, 4, 12); ctx.fillRect(l.x - 6, l.y - 2, 12, 4); }
      }
      for (const r of this.rocks) if (r.hp > 0 && seen(r)) { G.circle(r.x + 3, r.y + 4, r.r, 'rgba(0,0,0,.2)'); G.circle(r.x, r.y, r.r, '#8a8f9e'); G.circle(r.x - r.r * .3, r.y - r.r * .3, r.r * .45, '#a2a7b5'); }
      for (const w of this.walls) {
        if (!seen({x: w.x + w.w / 2, y: w.y + w.h / 2})) continue;
        G.rr(w.x, w.y, w.w, w.h, 2, w.wood ? `hsl(30 45% ${25 + Math.min(1, w.hp / 150) * 18}%)` : '#5a5f70');
        if (w.wood) { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1; ctx.strokeRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4); }
      }
      ctx.strokeStyle = 'rgba(255,240,180,.9)'; ctx.lineWidth = 2; ctx.beginPath();
      for (const b of this.bullets) { ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .018, b.y - b.vy * .018); }
      ctx.stroke();
      for (const o of this.ps) {
        if (!o.alive || !seen(o)) continue;
        const img = G.img(`img/top_${o.color}_${Math.floor(o.walk / 22) % 2}.png`);
        G.circle(o.x + 3, o.y + 5, PR, 'rgba(0,0,0,.25)');
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a + Math.PI / 2);
        if (img.complete && img.naturalWidth) ctx.drawImage(img, -30, -30, 60, 60); else G.circle(0, 0, PR, HEX[o.color]);
        if (o.swing > 0) { ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 30, -2.2, -.9); ctx.stroke(); }
        ctx.restore();
        if (o.hurt > 0) G.circle(o.x, o.y, PR + 2, 'rgba(255,60,80,.35)');
        if (o !== p) {
          G.bar({x: o.x - 20, y: o.y - 34, w: 40, h: 5, v: o.hp, max: 100, color: '#5ee67a'});
          if (o.sh > 0) G.bar({x: o.x - 20, y: o.y - 41, w: 40, h: 3, v: o.sh, max: 100, color: '#5cb8ff'});
          if (o.human || G.dist(o.x, o.y, p.x, p.y) < 200) G.text(o.name, o.x, o.y - 46, {size: 11, align: 'center', weight: 700, color: o.human ? '#ffcf5c' : '#ffffff', shadow: true});
        }
      }
      // storm: purple outside the circle, next circle outlined
      const s = this.storm;
      ctx.fillStyle = 'rgba(120,40,200,.32)'; ctx.beginPath(); ctx.rect(cx - 10, cy - 10, vw + 20, vh + 20); ctx.arc(s.cx, s.cy, Math.max(0, s.r), 0, Math.PI * 2, true); ctx.fill();
      ctx.strokeStyle = 'rgba(200,140,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(s.cx, s.cy, Math.max(0, s.r), 0, Math.PI * 2); ctx.stroke();
      if (s.nr !== undefined) { ctx.setLineDash([12, 10]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.ncx, s.ncy, s.nr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      G.fx(this.parts, primary ? G.dt : 0);
      ctx.restore();
      if (G.dist(p.x, p.y, s.cx, s.cy) > s.r && p.alive) { ctx.fillStyle = 'rgba(140,40,220,.22)'; ctx.fillRect(vx, vy, vw, vh); G.text('IN THE STORM! GET TO THE CIRCLE', vx + vw / 2, vy + 60, {size: 15, align: 'center', weight: 800, color: '#e8c8ff', shadow: true}); }
      this.hud(ctx, p, vx, vy, vw, vh);
    },
    hud(ctx, p, vx, vy, vw, vh) {
      G.bar({x: vx + 14, y: vy + vh - 40, w: Math.min(200, vw * .4), h: 14, v: p.hp, max: 100, color: '#5ee67a', label: `HP ${Math.ceil(p.hp)}`});
      G.bar({x: vx + 14, y: vy + vh - 20, w: Math.min(200, vw * .4), h: 10, v: p.sh, max: 100, color: '#5cb8ff', label: ''});
      const sx = vx + vw / 2 - 118;
      for (let i = 0; i < 4; i++) {
        const sl = i ? p.slots[i - 1] : null, on = p.cur === i;
        G.rr(sx + i * 60, vy + vh - 64, 54, 54, 10, on ? 'rgba(255,255,255,.28)' : 'rgba(8,9,24,.6)');
        if (sl) { G.rr(sx + i * 60 + 3, vy + vh - 14, 48, 4, 2, RARITY[sl.rar][1]); const img = G.img(`img/gun_${GUNS[sl.kind].img}.png`); if (img.complete) ctx.drawImage(img, sx + i * 60 - 2, vy + vh - 60, 58, 39); G.text(String(sl.ammo), sx + i * 60 + 48, vy + vh - 20, {size: 10, align: 'right', weight: 700}); }
        else if (!i) { ctx.strokeStyle = '#c9ccd4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + 14, vy + vh - 20); ctx.lineTo(sx + 40, vy + vh - 52); ctx.stroke(); ctx.strokeStyle = '#8a8f9e'; ctx.beginPath(); ctx.arc(sx + 40, vy + vh - 52, 12, 2.4, 4.6); ctx.stroke(); }
        G.text(String(i + 1), sx + i * 60 + 6, vy + vh - 50, {size: 10, color: '#c4c8ee'});
      }
      G.text(`🪵 ${p.wood}`, vx + vw - 14, vy + vh - 18, {size: 15, align: 'right', weight: 800, shadow: true});
      if (p.reload > 0) G.text('RELOADING…', vx + vw / 2, vy + vh - 74, {size: 13, align: 'center', weight: 800, shadow: true});
      if (!p.alive) { ctx.fillStyle = 'rgba(40,0,10,.5)'; ctx.fillRect(vx, vy, vw, vh); G.text(`ELIMINATED · #${p.place}`, vx + vw / 2, vy + vh / 2, {size: 26, align: 'center', display: true, color: '#ff6b8b', shadow: true}); }
    },
    minimap(ctx, me) {
      const s = 110, x = W - s - 10, y = 10, k = s / WORLD;
      G.rr(x - 3, y - 3, s + 6, s + 6, 8, 'rgba(8,9,24,.7)'); G.rr(x, y, s, s, 4, '#4f9a4a');
      ctx.fillStyle = '#7a6a5a'; for (const f of this.floors) ctx.fillRect(x + f.x * k, y + f.y * k, Math.max(2, f.w * k), Math.max(2, f.h * k));
      const st = this.storm;
      ctx.strokeStyle = '#c88cff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + st.cx * k, y + st.cy * k, Math.max(0, st.r * k), 0, Math.PI * 2); ctx.stroke();
      if (st.nr !== undefined) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + st.ncx * k, y + st.ncy * k, st.nr * k, 0, Math.PI * 2); ctx.stroke(); }
      for (const o of this.ps) if (o.alive && (o === me || (G.mode === 'local' && o.i < 2))) G.circle(x + o.x * k, y + o.y * k, 3, '#ffffff');
      const t = Math.max(0, Math.ceil(st.t));
      G.text(st.shrinking ? `Storm closing ${t}s` : `Storm moves in ${t}s`, x + s / 2, y + s + 18, {size: 11, align: 'center', weight: 700, shadow: true});
    },
    draw(ctx, dt) {
      G.clear('#3b8fc4');
      const me = this.ps[this.me];
      if (G.mode === 'local') {
        this.viewport(ctx, this.ps[0], 0, 0, W / 2 - 2, H, true); this.viewport(ctx, this.ps[1], W / 2 + 2, 0, W / 2 - 2, H, false);
        G.rr(W / 2 - 2, 0, 4, H, 0, '#000');
      } else {
        const spect = me.alive ? me : this.ps.find(o => o.alive && o.human) || this.ps.find(o => o.alive) || me;
        this.viewport(ctx, spect, 0, 0, W, H, true);
      }
      this.minimap(ctx, me);
      G.panel(10, 10, 150, 30, 8);
      G.text(`👥 ${this.alive} left  ·  ✖ ${me.kills}`, 20, 31, {size: 14, weight: 800});
      this.feed.forEach((f, i) => G.text(f.text, W - 130, 160 + i * 16, {size: 11, align: 'right', weight: 700, color: '#ffe0e0', shadow: true}));
      if (this.t < 3 && G.net?.role !== 'client') G.text('DROP IN! Find a weapon fast!', W / 2, 90, {size: 22, align: 'center', display: true, color: '#ffcf5c', shadow: true});
    }
  });
})();

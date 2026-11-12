(() => {
  // 1v1 attack-and-defend shooter on the shared raycaster: plant at A or B, or stop the plant.
  const W = 800, H = 500, WIN = 4, ROUND_T = 60, BOMB_T = 30, BUY_T = 4;
  const BASE = [
    '##########################', '#TTT.....#......#........#', '#TTT.....#......#..AAAA..#', '#........#..cc..#..AAAA..#',
    '#..###...#......#..AAAA..#', '#..###.......cc.....cc...#', '#........#......#........#', '####..####..##..####..####',
    '#........#......#........#', '#..c.....#..##..#.....c..#', '#........#......#........#', '#....##..........##......#',
    '#....##....cc....##......#', '#........#......#........#', '####..####..##..####..####', '#........#......#........#',
    '#..BBBB..#..cc..#...###..#', '#..BBBB.............###..#', '#..BBBB..#......#........#', '#........#......#.....DDD#',
    '#........#......#.....DDD#', '##########################'
  ];
  const WEAPONS = {
    pistol: {name: 'Pistol', cost: 0, dmg: 26, rate: .26, mag: 12, spread: .02, move: .03, reload: 1.1},
    smg: {name: 'SMG', cost: 1200, dmg: 17, rate: .085, mag: 25, spread: .045, move: .035, reload: 1.6},
    rifle: {name: 'Rifle', cost: 2700, dmg: 31, rate: .11, mag: 30, spread: .016, move: .06, reload: 2},
    sniper: {name: 'Sniper', cost: 4500, dmg: 115, rate: 1.25, mag: 5, spread: .002, move: .16, reload: 2.6}
  };
  const BUY = ['pistol', 'smg', 'rifle', 'sniper'];
  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const tex = (fn) => Ray.paint(64, 64, fn);
  let T = null;
  const textures = () => T ||= {
    wall: tex(g => { g.fillStyle = '#9a8f80'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 16) for (let x = (y / 16 % 2) * 16; x < 64; x += 32) { g.fillStyle = `hsl(32 12% ${50 + Math.random() * 8}%)`; g.fillRect(x + 1, y + 1, 30, 14); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 56, 64, 8); }),
    crate: tex(g => { g.fillStyle = '#a8763c'; g.fillRect(0, 0, 64, 64); g.strokeStyle = '#6b4a24'; g.lineWidth = 5; g.strokeRect(3, 3, 58, 58); g.beginPath(); g.moveTo(4, 4); g.lineTo(60, 60); g.moveTo(60, 4); g.lineTo(4, 60); g.stroke(); }),
    floor: tex(g => { g.fillStyle = '#6d6a64'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .12})`; g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2); } g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); }),
    siteA: tex(g => { g.fillStyle = '#7a5f5a'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(255,107,139,.55)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('A', 32, 46); }),
    siteB: tex(g => { g.fillStyle = '#5a647a'; g.fillRect(0, 0, 64, 64); g.fillStyle = 'rgba(92,184,255,.55)'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText('B', 32, 46); }),
    bomb: tex(g => { g.fillStyle = '#2b2b30'; g.fillRect(18, 44, 28, 18); g.fillStyle = '#e04e5f'; g.fillRect(22, 48, 8, 4); g.fillStyle = '#5ee6c1'; g.fillRect(34, 48, 8, 4); g.fillStyle = '#ffcf5c'; g.fillRect(24, 54, 16, 4); })
  };

  GameBox.register({
    id: 'strike', title: 'Strike Point', genre: 'Shooter', kind: '1v1 tactical shooter', w: W, h: H, pointerLock: true, modes: ['bot', 'local', 'online'],
    assets: [...['orange', 'blue'].flatMap(c => ['front', 'back', 'left', 'right'].flatMap(d => [0, 1].map(f => `img/soldier_${c}_${d}_${f}.png`))), ...BUY.map(w => `img/gun_${w}.png`)],
    hint: 'Attackers plant at A or B. Defenders stop them. First to 4 rounds wins!',
    desc: 'A one-on-one tactical shooter. Each round one side attacks and must plant a device at site A or B; the other side defends or defuses it. Buy guns between rounds with the money you earn. Play a bot, a friend on the same keyboard (split screen), or a friend online with a room code.',
    controls: [['W A S D', 'Move (vs bot / online)'], ['Mouse / Left Right', 'Aim (click the screen to lock the mouse)'], ['Click / Space', 'Shoot'], ['E', 'Plant or defuse (hold)'], ['R', 'Reload'], ['1 2 3 4', 'Buy pistol, SMG, rifle, sniper'],
      ['2 Players', 'P1: W S move, A D turn, Q E strafe, F shoot, G plant, R reload, 1-4 buy'], ['2 Players', 'P2: arrows move and turn, / shoot, . plant, , reload, 7-0 buy']],
    info() { return `Round ${this.round} · You ${this.wins[0]} - ${this.wins[1]}`; },
    init() {
      const flip = Math.random() < .5;
      this.map = BASE.map(r => (flip ? r.split('').reverse().join('') : r).split(''));
      this.n = {w: this.map[0].length, h: this.map.length};
      const S = this.S = {tile: (x, y) => { const c = this.map[y]?.[x]; return c === undefined || c === '#' ? 1 : c === 'c' ? 2 : 0; }};
      this.spawns = {T: [], D: []}; this.sites = {A: [], B: []};
      this.map.forEach((row, y) => row.forEach((c, x) => { if (c === 'T' || c === 'D') this.spawns[c].push([x + .5, y + .5]); if (c === 'A' || c === 'B') this.sites[c].push([x + .5, y + .5]); }));
      this.P = [0, 1].map(i => ({i, x: 0, y: 0, a: 0, hp: 100, armor: 0, weapon: 'pistol', ammo: 12, cd: 0, reload: 0, money: 800, alive: true, walk: 0, moving: false, recoil: 0, flash: 0, act: 0, hurt: 0, hitT: 0, kills: 0, path: [], repath: 0, react: 0, goal: null, bought: false}));
      this.wins = [0, 0]; this.round = 0; this.parts = []; this.feed = []; this.events = [];
      this.R1 = Ray.create(320, 200); this.R2 = [Ray.create(200, 250), Ray.create(200, 250)];
      this.remote = {look: 0, fire: false};
      this.snap = null; this.sendT = 0;
      this.newRound();
    },
    team(i) { return (this.round % 2 === 1) === (i === 0) ? 'T' : 'D'; },
    color(i) { return this.team(i) === 'T' ? 'orange' : 'blue'; },
    newRound() {
      this.round++;
      this.P.forEach((p, i) => {
        const [x, y] = this.spawns[this.team(i)][4] || this.spawns[this.team(i)][0];
        Object.assign(p, {x, y, a: this.team(i) === 'T' ? Math.PI / 4 * (x < this.n.w / 2 ? 1 : 3) : Math.PI / 4 * (x < this.n.w / 2 ? -1 : -3), hp: 100, alive: true, cd: 0, reload: 0, act: 0, recoil: 0, bought: false, path: [], goal: null, react: 0});
        if (!WEAPONS[p.weapon] || p.died) { p.weapon = 'pistol'; p.armor = 0; }
        p.died = false; p.ammo = WEAPONS[p.weapon].mag;
      });
      this.bomb = null; this.phase = 'buy'; this.phaseT = BUY_T; this.timer = ROUND_T; this.result = null;
      this.botSite = G.pick(['A', 'B']);
      this.banner(`ROUND ${this.round}`, `You are ${this.team(0) === 'T' ? 'ATTACKING: plant at A or B' : 'DEFENDING: stop the plant'}`);
    },
    banner(a, b = '') { this.msg = {a, b, t: 2.6}; },
    buy(p, w) {
      const W0 = WEAPONS[w];
      if (this.phase !== 'buy' || !W0 || p.money < W0.cost || p.weapon === w) return false;
      p.money -= W0.cost; p.weapon = w; p.ammo = W0.mag; p.bought = true; G.sfx('coin'); return true;
    },
    autoBuy(p) { // kids should not have to shop: pick the best gun you can afford, then armour
      if (!p.bought) for (const w of ['sniper', 'rifle', 'smg']) if (w !== 'sniper' || Math.random() < .3) if (this.buy(p, w)) break;
      if (p.armor < 50 && p.money >= 650) { p.money -= 650; p.armor = 100; }
    },
    key(k) {
      if (G.net?.role === 'client') return;
      const p0 = this.P[0], p1 = this.P[1];
      const i = '1234'.indexOf(k); if (i >= 0) this.buy(p0, BUY[i]);
      if (G.mode === 'local') { const j = '7890'.indexOf(k); if (j >= 0) this.buy(p1, BUY[j]); }
      if (k === 'r') this.startReload(p0);
      if (k === ',' && G.mode === 'local') this.startReload(p1);
    },
    look(dx) {
      if (G.net?.role === 'client') { G.net.send({t: 'look', dx}); return; }
      if (G.mode !== 'local') this.P[0].a += dx * .0024;
    },
    netMessage(m) {
      if (m.t === 'look') this.remote.look += m.dx;
      else if (m.t === 'fire') this.remote.fire = m.down;
      else if (m.t === 'buy') this.buy(this.P[1], m.w);
      else if (m.t === 'reload') this.startReload(this.P[1]);
      else if (m.t === 's') this.snap = m;
    },
    pointer(type) {
      if (G.net?.role === 'client') { if (type === 'down' || type === 'up') G.net.send({t: 'fire', down: type === 'down'}); }
    },
    startReload(p) { const W0 = WEAPONS[p.weapon]; if (p.reload > 0 || p.ammo === W0.mag) return; p.reload = W0.reload; },
    input(p) { // one frame of intent for a player, from keys, the mouse, a remote friend or the bot
      const k = G.keys, i = p.i;
      if (i === 1 && G.mode === 'bot') return this.bot(p);
      if (i === 1 && G.mode === 'online') {
        const peer = G.net?.peers[0], kk = peer ? G.net.inputs[peer.peer]?.keys || {} : {};
        const turn = this.remote.look * .0024; this.remote.look = 0;
        if (kk.r) this.startReload(p);
        BUY.forEach((w, b) => { if (kk[String(b + 1)]) this.buy(p, w); });
        return {fwd: (kk.w || kk.ArrowUp ? 1 : 0) - (kk.s || kk.ArrowDown ? 1 : 0), str: (kk.d ? 1 : 0) - (kk.a ? 1 : 0), turnBy: turn + ((kk.ArrowRight ? 1 : 0) - (kk.ArrowLeft ? 1 : 0)) * 2.6 * G.dt,
          fire: this.remote.fire || !!kk[' '], act: !!kk.e};
      }
      if (G.mode === 'local') {
        if (i === 0) return {fwd: (k.w ? 1 : 0) - (k.s ? 1 : 0), str: (k.e ? 1 : 0) - (k.q ? 1 : 0), turnBy: ((k.d ? 1 : 0) - (k.a ? 1 : 0)) * 2.6 * G.dt, fire: !!k.f, act: !!k.g};
        return {fwd: (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0), str: 0, turnBy: ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * 2.6 * G.dt, fire: !!k['/'], act: !!k['.']};
      }
      return {fwd: G.held('w', 'ArrowUp') - G.held('s', 'ArrowDown'), str: G.held('d') - G.held('a'), turnBy: (G.held('ArrowRight') - G.held('ArrowLeft')) * 2.6 * G.dt, fire: G.pointer.down || !!k[' '], act: !!k.e};
    },
    path(p, tx, ty) {
      const w = this.n.w, h = this.n.h, prev = new Int32Array(w * h).fill(-1), sx = Math.floor(p.x), sy = Math.floor(p.y), q = [sy * w + sx];
      prev[sy * w + sx] = sy * w + sx;
      for (let i = 0; i < q.length; i++) {
        const c = q[i], x = c % w, y = (c / w) | 0;
        if (x === tx && y === ty) break;
        for (const [dx, dy] of DIRS4) { const nx = x + dx, ny = y + dy, k = ny * w + nx; if (!this.S.tile(nx, ny) && prev[k] < 0) { prev[k] = c; q.push(k); } }
      }
      const out = [], end = ty * w + tx;
      if (prev[end] < 0) return out;
      for (let c = end; c !== sy * w + sx; c = prev[c]) out.unshift([c % w + .5, ((c / w) | 0) + .5]);
      return out;
    },
    bot(p) {
      const foe = this.P[0], inp = {fwd: 0, str: 0, turnBy: 0, fire: false, act: false};
      const d = G.dist(p.x, p.y, foe.x, foe.y), toFoe = Math.atan2(foe.y - p.y, foe.x - p.x);
      const sees = foe.alive && d < 20 && (Math.abs(angDiff(toFoe, p.a)) < 1.3 || p.hurt > 0) && Ray.los(this.S, p.x, p.y, foe.x, foe.y);
      const skill = Math.min(1, .45 + this.wins[0] * .1 + this.round * .03);
      if (sees) {
        p.react += G.dt;
        const err = (1 - skill) * .12 * Math.sin(performance.now() / 170 + p.i);
        const diff = angDiff(toFoe + err, p.a);
        inp.turnBy = G.clamp(diff, -3.2 * G.dt, 3.2 * G.dt);
        inp.fire = p.react > .55 - skill * .3 && Math.abs(diff) < .1;
        inp.str = Math.sin(performance.now() / 600) > 0 ? 1 : -1;
        return inp;
      }
      p.react = 0;
      // goals: attackers head for a site and plant; defenders guard, then defuse
      const team = this.team(p.i);
      let goal;
      if (team === 'T') goal = this.bomb ? [this.bomb.x, this.bomb.y + 1.5] : this.sites[this.botSite][5];
      else goal = this.bomb ? [this.bomb.x, this.bomb.y] : this.sites[this.botSite][2];
      const onSite = this.map[Math.floor(p.y)][Math.floor(p.x)] === this.botSite;
      if (team === 'T' && !this.bomb && onSite) { inp.act = true; return inp; }
      if (team === 'D' && this.bomb && G.dist(p.x, p.y, this.bomb.x, this.bomb.y) < .9) { inp.act = true; return inp; }
      if ((p.repath -= G.dt) <= 0 || !p.path.length) { p.repath = .6; p.path = this.path(p, Math.floor(goal[0]), Math.floor(goal[1])); }
      const nx = p.path[0];
      if (!nx) { inp.turnBy = 1.2 * G.dt; return inp; } // waiting at the goal: sweep the view
      if (G.dist(p.x, p.y, nx[0], nx[1]) < .25) p.path.shift();
      const want = Math.atan2(nx[1] - p.y, nx[0] - p.x), diff = angDiff(want, p.a);
      inp.turnBy = G.clamp(diff, -4 * G.dt, 4 * G.dt); inp.fwd = Math.abs(diff) < .9 ? 1 : 0;
      return inp;
    },
    fire(p) {
      const W0 = WEAPONS[p.weapon];
      if (p.cd > 0 || p.reload > 0 || this.phase !== 'live') return;
      if (p.ammo <= 0) return this.startReload(p);
      p.ammo--; p.cd = W0.rate; p.recoil = Math.min(1, p.recoil + (p.weapon === 'sniper' ? 1 : .22)); p.flash = .06;
      const spread = W0.spread + (p.moving ? W0.move : 0) + p.recoil * .025, ang = p.a + (Math.random() - .5) * 2 * spread;
      const wall = Ray.hit(this.S, p.x, p.y, ang, 40).d, c = Math.cos(ang), s = Math.sin(ang);
      this.events.push({e: 'gun', x: p.x, y: p.y});
      if (p.i === 0 || G.mode !== 'bot') G.sfx('gun', .8); else G.sfx('gun', Math.max(.2, 1 - G.dist(p.x, p.y, this.P[0].x, this.P[0].y) / 14));
      for (const o of this.P) {
        if (o === p || !o.alive) continue;
        const dx = o.x - p.x, dy = o.y - p.y, along = dx * c + dy * s;
        if (along <= 0 || along > wall || Math.abs(-dx * s + dy * c) > .27) continue;
        this.damage(o, W0.dmg * (p.weapon === 'sniper' ? 1 : Math.max(.6, 1 - along / 30)), p);
      }
    },
    damage(o, dmg, by) {
      if (o.armor > 0) { o.armor = Math.max(0, o.armor - dmg * .5); dmg *= .65; }
      o.hp -= dmg; o.hurt = .3; by.hitT = .15;
      this.events.push({e: 'hit', i: o.i});
      if (o.hp > 0) return;
      o.hp = 0; o.alive = false; o.died = true; by.kills++; by.money = Math.min(16000, by.money + 300);
      this.feed.unshift({t: 4, text: `${by.i === 0 ? 'P1' : G.mode === 'bot' ? 'BOT' : 'P2'} ⌖ ${o.i === 0 ? 'P1' : G.mode === 'bot' ? 'BOT' : 'P2'}`});
      if (by.i === 0) G.score += 100;
    },
    endRound(team, why) {
      if (this.phase === 'post') return;
      this.phase = 'post'; this.phaseT = 3.2;
      const winner = this.P.findIndex((_, i) => this.team(i) === team);
      this.wins[winner]++;
      this.P.forEach((p, i) => { p.money = Math.min(16000, p.money + (i === winner ? 3000 : 1900)); });
      if (winner === 0) G.score += 500;
      const who = winner === 0 ? (G.mode === 'local' ? 'PLAYER 1' : 'YOU') : G.mode === 'bot' ? 'BOT' : 'PLAYER 2';
      this.banner(`${who} WIN${who === 'YOU' ? '' : 'S'} THE ROUND`, why);
      G.sfx(winner === 0 || G.mode === 'local' ? 'win' : 'lose');
    },
    update(dt) {
      if (G.net?.role === 'client') return this.clientUpdate(dt);
      if (this.msg) this.msg.t -= dt;
      for (const f of this.feed) f.t -= dt;
      this.feed = this.feed.filter(f => f.t > 0).slice(0, 4);
      this.phaseT -= dt;
      if (this.phase === 'buy' && this.phaseT <= 0) { this.P.forEach(p => this.autoBuy(p)); this.phase = 'live'; G.sfx('power'); }
      if (this.phase === 'post') {
        if (this.phaseT <= 0) {
          if (this.wins[0] >= WIN || this.wins[1] >= WIN) {
            const p1 = this.wins[0] >= WIN;
            return G.end(G.mode === 'local' ? `Player ${p1 ? 1 : 2} wins!` : p1 ? 'You win the match!' : (G.mode === 'bot' ? 'The bot wins' : 'Your friend wins'));
          }
          this.newRound();
        }
      }
      for (const p of this.P) {
        p.cd -= dt; p.hurt -= dt; p.hitT -= dt; p.flash -= dt; p.recoil = Math.max(0, p.recoil - dt * 2.2);
        if (p.reload > 0 && (p.reload -= dt) <= 0) p.ammo = WEAPONS[p.weapon].mag;
        if (!p.alive) continue;
        const inp = this.input(p);
        p.a += inp.turnBy || 0;
        if (this.phase === 'buy') continue;
        const sp = 3.1 * dt, len = Math.hypot(inp.fwd, inp.str) || 1;
        const vx = (Math.cos(p.a) * inp.fwd - Math.sin(p.a) * inp.str) / len * sp, vy = (Math.sin(p.a) * inp.fwd + Math.cos(p.a) * inp.str) / len * sp;
        p.moving = !!(inp.fwd || inp.str);
        const r = .22, free = (x, y) => !this.S.tile(Math.floor(x - r), Math.floor(y - r)) && !this.S.tile(Math.floor(x + r), Math.floor(y - r)) && !this.S.tile(Math.floor(x - r), Math.floor(y + r)) && !this.S.tile(Math.floor(x + r), Math.floor(y + r));
        if (p.moving && !inp.act) { if (free(p.x + vx, p.y)) p.x += vx; if (free(p.x, p.y + vy)) p.y += vy; p.walk += Math.hypot(vx, vy); }
        if (inp.fire && this.phase === 'live') this.fire(p);
        // plant / defuse by holding the action key
        const team = this.team(p.i), tileC = this.map[Math.floor(p.y)][Math.floor(p.x)];
        if (inp.act && this.phase === 'live' && team === 'T' && !this.bomb && (tileC === 'A' || tileC === 'B')) {
          if ((p.act += dt) >= 2.5) { this.bomb = {x: p.x, y: p.y, t: BOMB_T, site: tileC, def: 0}; p.act = 0; p.money += 300; this.banner('DEVICE PLANTED', `Site ${tileC} · ${BOMB_T}s`); G.sfx('laser'); }
        } else if (inp.act && this.phase === 'live' && team === 'D' && this.bomb && G.dist(p.x, p.y, this.bomb.x, this.bomb.y) < 1) {
          if ((this.bomb.def += dt) >= 4) { this.bomb.def = 0; this.endRound('D', 'Device defused'); }
        } else { p.act = 0; if (this.bomb && team === 'D') this.bomb.def = 0; }
      }
      if (this.phase === 'live') {
        const [a, b] = this.P;
        const deadT = this.P.find((p, i) => !p.alive && this.team(i) === 'T'), deadD = this.P.find((p, i) => !p.alive && this.team(i) === 'D');
        if (deadD) this.endRound('T', 'Defender eliminated');
        else if (deadT && !this.bomb) this.endRound('D', 'Attacker eliminated');
        else if (this.bomb) {
          this.bomb.t -= dt;
          if (Math.floor(this.bomb.t * 2) !== Math.floor((this.bomb.t + dt) * 2)) G.sfx('click', .6);
          if (this.bomb.t <= 0) { G.sfx('boom'); G.shake(10, .6); this.endRound('T', 'The device went off'); }
        } else if ((this.timer -= dt) <= 0) this.endRound('D', 'Time ran out');
        void a; void b;
      }
      if (G.mode === 'online' && G.net?.role === 'host' && (this.sendT -= dt) <= 0) {
        this.sendT = .05;
        G.net.send({t: 's', P: this.P.map(p => ({x: p.x, y: p.y, a: p.a, hp: p.hp, armor: p.armor, weapon: p.weapon, ammo: p.ammo, money: p.money, alive: p.alive, walk: p.walk, flash: p.flash, hurt: p.hurt, hitT: p.hitT, act: p.act, reload: p.reload})),
          bomb: this.bomb, phase: this.phase, phaseT: this.phaseT, timer: this.timer, wins: this.wins, round: this.round, msg: this.msg, feed: this.feed, flip: this.map[1][1] !== 'T', ev: this.events});
        this.events = [];
      } else if (G.mode !== 'online') this.events = [];
    },
    clientUpdate() {
      const s = this.snap; if (!s) return;
      if (s.flip !== (this.map[1][1] !== 'T')) this.map = BASE.map(r => (s.flip ? r.split('').reverse().join('') : r).split(''));
      s.P.forEach((q, i) => Object.assign(this.P[i], q));
      Object.assign(this, {bomb: s.bomb, phase: s.phase, phaseT: s.phaseT, timer: s.timer, wins: s.wins, round: s.round, msg: s.msg, feed: s.feed});
      for (const e of s.ev || []) { if (e.e === 'gun') G.sfx('gun', .7); if (e.e === 'hit' && e.i === 1) G.flash('rgba(255,40,60,.35)', .2); }
      s.ev = [];
    },
    sprite(viewer, o) {
      const f = [Math.cos(o.a), Math.sin(o.a)], to = [viewer.x - o.x, viewer.y - o.y], l = Math.hypot(...to) || 1;
      const front = (f[0] * to[0] + f[1] * to[1]) / l, side = f[0] * -Math.sin(viewer.a) + f[1] * Math.cos(viewer.a);
      const dir = front > .7 ? 'front' : front < -.7 ? 'back' : side > 0 ? 'right' : 'left';
      return G.pixels(`img/soldier_${this.color(o.i)}_${dir}_${Math.floor(o.walk * 2.5) % 2}.png`);
    },
    view(ctx, R, p, vx, vy, vw, vh) {
      const t = textures(), S = this.S;
      const sprites = this.P.filter(o => o !== p && o.alive).map(o => ({x: o.x, y: o.y, tex: this.sprite(p, o), scale: .95}));
      if (this.bomb) sprites.push({x: this.bomb.x, y: this.bomb.y, tex: t.bomb, scale: .5, glow: .6});
      Ray.render(R, {x: p.x, y: p.y, a: p.a, bob: p.moving ? Math.sin(p.walk * 7) * 2 : 0}, {
        tile: S.tile, wallTex: c => c === 2 ? t.crate : t.wall, floorTex: t.floor,
        floorAt: (x, y) => { const c = this.map[y]?.[x]; return c === 'A' ? t.siteA : c === 'B' ? t.siteB : null; },
        sky: k => Ray.pack(110 + 60 * k | 0, 160 + 50 * k | 0, 230), light: d => Math.max(.45, 1.15 - d * .035), fogColor: '#c8d8ec', fogDensity: .035, sprites
      });
      ctx.save(); ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
      ctx.imageSmoothingEnabled = false; ctx.drawImage(R.canvas, vx, vy, vw, vh); ctx.imageSmoothingEnabled = true;
      if (!p.alive) { ctx.fillStyle = 'rgba(80,0,10,.55)'; ctx.fillRect(vx, vy, vw, vh); G.text('ELIMINATED', vx + vw / 2, vy + vh / 2, {size: 28, align: 'center', display: true, color: '#ff6b8b', shadow: true}); ctx.restore(); return; }
      // gun in hand, with bob, recoil and muzzle flash
      const gun = G.img(`img/gun_${p.weapon}.png`), gw = vw * .62, gh = gw * 2 / 3;
      const bob = p.moving ? Math.sin(p.walk * 7) * 6 : 0, kick = p.recoil * 22 + (p.reload > 0 ? 60 : 0);
      if (gun.complete && gun.naturalWidth) ctx.drawImage(gun, vx + vw - gw + 10, vy + vh - gh + 16 + bob + kick, gw, gh);
      if (p.flash > 0) { G.circle(vx + vw * .62, vy + vh * .72 + bob, 22, 'rgba(255,220,120,.9)'); G.circle(vx + vw * .62, vy + vh * .72 + bob, 10, '#fff'); }
      if (p.hurt > 0) { ctx.fillStyle = `rgba(255,30,50,${p.hurt})`; ctx.fillRect(vx, vy, vw, vh); }
      const cx = vx + vw / 2, cy = vy + vh / 2, gap = 5 + p.recoil * 10 + (p.moving ? 4 : 0);
      ctx.strokeStyle = p.hitT > 0 ? '#ff4b62' : '#ffffff'; ctx.lineWidth = 2; ctx.beginPath();
      for (const [dx, dy] of DIRS4) { ctx.moveTo(cx + dx * gap, cy + dy * gap); ctx.lineTo(cx + dx * (gap + 7), cy + dy * (gap + 7)); }
      ctx.stroke();
      // HUD
      G.bar({x: vx + 14, y: vy + vh - 44, w: Math.min(180, vw * .4), h: 14, v: p.hp, max: 100, color: p.hp < 30 ? '#ff4b62' : '#5ee6c1', label: `HP ${Math.ceil(p.hp)}`});
      if (p.armor > 0) G.bar({x: vx + 14, y: vy + vh - 24, w: Math.min(180, vw * .4), h: 10, v: p.armor, max: 100, color: '#5cb8ff', label: ''});
      G.text(p.reload > 0 ? 'RELOADING' : `${p.ammo} / ${WEAPONS[p.weapon].mag}`, vx + vw - 16, vy + vh - 18, {size: 18, align: 'right', weight: 800, shadow: true, color: p.ammo ? '#ffffff' : '#ff6b8b'});
      G.text(`$${p.money}`, vx + 14, vy + vh - 54, {size: 13, weight: 800, color: '#7fe08a', shadow: true});
      const team = this.team(p.i);
      G.text(team === 'T' ? 'ATTACK' : 'DEFEND', vx + 14, vy + 22, {size: 13, weight: 800, color: team === 'T' ? '#ff9f5c' : '#5cb8ff', shadow: true});
      if (p.act > 0 || (this.bomb && this.bomb.def > 0 && team === 'D')) {
        const v = p.act > 0 ? p.act / 2.5 : this.bomb.def / 4;
        G.bar({x: cx - 90, y: cy + 40, w: 180, h: 14, v, max: 1, color: '#ffcf5c', label: p.act > 0 ? 'PLANTING' : 'DEFUSING'});
      }
      this.radar(ctx, p, vx + vw - 96, vy + 10, 86);
      ctx.restore();
    },
    radar(ctx, p, x, y, s) {
      const k = s / Math.max(this.n.w, this.n.h);
      G.rr(x - 4, y - 4, s + 8, this.n.h * k + 8, 8, 'rgba(8,9,24,.6)');
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      this.map.forEach((row, ty) => row.forEach((c, tx) => { if (c === '#' || c === 'c') ctx.fillRect(x + tx * k, y + ty * k, k, k); else if (c === 'A' || c === 'B') { ctx.fillStyle = c === 'A' ? 'rgba(255,107,139,.6)' : 'rgba(92,184,255,.6)'; ctx.fillRect(x + tx * k, y + ty * k, k, k); ctx.fillStyle = 'rgba(255,255,255,.35)'; } }));
      if (this.bomb) G.circle(x + this.bomb.x * k, y + this.bomb.y * k, 3, Math.floor(performance.now() / 200) % 2 ? '#ff4b62' : '#ffcf5c');
      for (const o of this.P) if (o.alive && (o === p || Ray.los(this.S, p.x, p.y, o.x, o.y))) G.circle(x + o.x * k, y + o.y * k, 3, o === p ? '#ffffff' : '#ff4b62');
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + p.x * k, y + p.y * k); ctx.lineTo(x + (p.x + Math.cos(p.a) * 2) * k, y + (p.y + Math.sin(p.a) * 2) * k); ctx.stroke();
    },
    draw(ctx, dt) {
      G.clear('#0b0d14');
      const me = G.net?.role === 'client' ? this.P[1] : this.P[0];
      if (G.mode === 'local') { this.view(ctx, this.R2[0], this.P[0], 0, 0, W / 2 - 2, H); this.view(ctx, this.R2[1], this.P[1], W / 2 + 2, 0, W / 2 - 2, H); G.rr(W / 2 - 2, 0, 4, H, 0, '#000'); }
      else this.view(ctx, this.R1, me, 0, 0, W, H);
      // shared HUD: score, clock, device timer, buy menu, banners, feed
      G.panel(W / 2 - 110, 6, 220, 40, 10);
      G.text(String(this.wins[0]), W / 2 - 70, 34, {size: 24, align: 'center', display: true, color: '#ffcf5c'});
      G.text(String(this.wins[1]), W / 2 + 70, 34, {size: 24, align: 'center', display: true, color: '#c4c8ee'});
      const clock = this.phase === 'buy' ? `BUY ${Math.ceil(this.phaseT)}` : this.bomb ? `💣 ${Math.ceil(this.bomb.t)}` : (t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`)(Math.ceil(Math.max(0, this.timer)));
      G.text(clock, W / 2, 33, {size: 18, align: 'center', weight: 800, color: this.bomb ? '#ff4b62' : '#ffffff'});
      if (this.phase === 'buy') {
        const views = G.mode === 'local' ? [[this.P[0], 0, '1 2 3 4'], [this.P[1], W / 2, '7 8 9 0']] : [[me, 0, '1 2 3 4']];
        for (const [p, ox, keys] of views) {
          const vw = G.mode === 'local' ? W / 2 : W, bx = ox + vw / 2 - 170;
          G.panel(bx, 70, 340, 120, 14, 'rgba(8,9,24,.82)');
          G.text(`BUY (keys ${keys}) · $${p.money}`, bx + 170, 92, {size: 13, align: 'center', weight: 800, color: '#7fe08a'});
          BUY.forEach((w, i) => {
            const W0 = WEAPONS[w], ok = p.money >= W0.cost, on = p.weapon === w;
            G.rr(bx + 12 + i * 80, 104, 72, 74, 10, on ? '#3d6fd9' : ok ? '#2b2f55' : '#1f2240');
            const img = G.img(`img/gun_${w}.png`); if (img.complete) ctx.drawImage(img, bx + 12 + i * 80, 102, 72, 48);
            G.text(W0.name, bx + 48 + i * 80, 160, {size: 11, align: 'center', weight: 700, color: ok ? '#ffffff' : '#6b6f99'});
            G.text(W0.cost ? `$${W0.cost}` : 'free', bx + 48 + i * 80, 173, {size: 10, align: 'center', color: ok ? '#7fe08a' : '#ff6b8b'});
          });
        }
      }
      if (this.msg && this.msg.t > 0) {
        ctx.globalAlpha = Math.min(1, this.msg.t);
        G.text(this.msg.a, W / 2, H / 2 - 40, {size: 30, align: 'center', display: true, color: '#ffffff', shadow: true});
        G.text(this.msg.b, W / 2, H / 2 - 12, {size: 15, align: 'center', weight: 700, color: '#ffcf5c', shadow: true});
        ctx.globalAlpha = 1;
      }
      this.feed.forEach((f, i) => G.text(f.text, W / 2, 66 + i * 16, {size: 12, align: 'center', weight: 700, color: '#ff9f9f', shadow: true}));
      G.fx(this.parts, dt);
    }
  });
})();

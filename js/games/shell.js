(() => {
  const W = 800, H = 500, ROUNDS = [{you: 3, him: 2, items: 1, slip: .4}, {you: 4, him: 4, items: 2, slip: .2}, {you: 5, him: 5, items: 3, slip: .08}];
  const ITEMS = {
    ball: {name: 'Crystal Ball', tip: 'Peek at the next shell', color: '#8b7bff'},
    magnet: {name: 'Magnet', tip: 'Pull out the next shell', color: '#c9ccd4'},
    sparkler: {name: 'Sparkler', tip: 'Next live shell hits twice', color: '#ffcf5c'},
    rope: {name: 'Rope', tip: 'He skips his next turn', color: '#c9a26b'},
    candy: {name: 'Cotton Candy', tip: '+1 life', color: '#ff9fd0'},
    juggle: {name: 'Juggle', tip: 'Shuffle the shells left', color: '#5ee6c1'}
  };
  const KEYS = Object.keys(ITEMS);
  const slot = (side, i) => [side ? W - 36 - (i % 2) * 46 : 36 + (i % 2) * 46, 334 + Math.floor(i / 2) * 42]; // item trays beside each player
  const TAUNTS = {start: ['Step right up…', 'Pick a shell, any shell.', 'The show must go on.'], selfDud: ['Lucky, lucky.', 'Again! Again!'], hitYou: ['Hehehe…', 'Oh, that one stung!', 'Applause, please.'], hurt: ['ACK!', 'You will pay for that…', 'Not my mask!'], think: ['Hmm…', 'Let me see…', 'Decisions, decisions.']};

  function icon(ctx, k, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
    if (k === 'ball') { G.rr(-9, 7, 18, 5, 2, '#6b4a33'); G.circle(0, -2, 10, '#8b7bff'); G.circle(-3, -5, 3, 'rgba(255,255,255,.6)'); }
    if (k === 'magnet') { ctx.strokeStyle = '#e04e5f'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI, 0); ctx.stroke(); G.rr(-11, -2, 6, 10, 1, '#c9ccd4'); G.rr(5, -2, 6, 10, 1, '#c9ccd4'); }
    if (k === 'sparkler') { ctx.strokeStyle = '#8a8f9e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(4, -4); ctx.stroke(); G.star(5, -6, 8, '#ffcf5c'); }
    if (k === 'rope') { ctx.strokeStyle = '#c9a26b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, .5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.stroke(); }
    if (k === 'candy') { ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 0); ctx.stroke(); G.circle(-3, -4, 6, '#ff9fd0'); G.circle(3, -6, 6, '#ffb8de'); G.circle(0, -1, 6, '#ff9fd0'); }
    if (k === 'juggle') { G.circle(-6, 4, 4, '#ff6b8b'); G.circle(6, 4, 4, '#5cb8ff'); G.circle(0, -6, 4, '#ffcf5c'); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  GameBox.register({
    id: 'shell', thumb: 'jpg', title: 'Last Shell', genre: 'Horror', kind: 'Shell gamble duel', w: W, h: H, cursor: 'pointer',
    assets: ['idle', 'grin', 'hurt', 'aim'].map(p => `img/ringmaster_${p}.png`),
    hint: 'Red shells hurt, grey ones are duds. Shoot yourself with a dud to keep your turn!',
    desc: 'Across a candlelit table in an abandoned circus tent, the Ringmaster loads his popgun with red live shells and grey duds and shows you how many of each. Take turns: shoot him, or risk shooting yourself, because a dud on yourself keeps your turn. Carnival items bend the odds. Win three rounds to escape the tent.',
    controls: [['1 / Click', 'Shoot the Ringmaster'], ['2 / Click', 'Shoot yourself (a dud keeps your turn)'], ['3-8 / Click an item', 'Use an item']],
    info() { return `Round ${this.round + 1}/3 · ${this.live} live, ${this.dud} dud`; },
    init() { this.round = 0; this.tickets = 3; this.over = false; this.timer = null; this.parts = []; this.bubble = null; this.startRound(); },
    later(t, fn) { this.timer = {t, fn}; }, // in-game timer: input waits while it runs, and a restart clears it
    startRound() {
      const R = ROUNDS[this.round];
      this.lives = [R.you, R.him]; this.max = [R.you, R.him]; this.items = [[], []];
      this.say(G.pick(TAUNTS.start), 3);
      this.load();
    },
    load() {
      const R = ROUNDS[this.round], n = 2 + Math.floor(G.rnd(Math.min(7, 3 + this.round * 2)));
      const live = Math.max(1, Math.min(n - 1, Math.round(n * (.35 + G.rnd(.3)))));
      this.shells = G.shuffle([...Array(live).fill(true), ...Array(n - live).fill(false)]);
      this.live = live; this.dud = n - live; this.reveal = 2.4; this.known = [null, null];
      for (const side of [0, 1]) for (let i = 0; i < R.items; i++) if (this.items[side].length < 8) this.items[side].push(G.pick(KEYS));
      this.turn = 0; this.skip = [false, false]; this.double = false; this.anim = null; this.wait = 2.6; G.sfx('click');
    },
    say(text, t = 2.2) { this.bubble = {text, t}; },
    pose() {
      if (this.anim?.shooter === 1) return 'aim';
      if (this.flinch > 0) return 'hurt';
      if (this.gloat > 0) return 'grin';
      return 'idle';
    },
    act(side, action) { // action: 'him' / 'self' (shoot) or an item index
      if (this.anim || this.reveal > 0 || this.turn !== side || this.over || this.timer) return;
      if (typeof action === 'number') return this.useItem(side, action);
      const target = action === 'self' ? side : 1 - side;
      this.anim = {shooter: side, target, t: side === 1 ? 1.4 : .8};
    },
    useItem(side, i) {
      const k = this.items[side][i]; if (!k) return;
      if (k === 'candy' && this.lives[side] >= this.max[side]) return side === 0 && this.say('You are already full, friend.');
      this.items[side].splice(i, 1); G.sfx('select');
      const who = side === 0 ? 'You' : 'He';
      if (k === 'ball') { this.known[side] = this.shells[0]; if (side === 0) this.flashInfo = {text: this.shells[0] ? 'LIVE' : 'DUD', color: this.shells[0] ? '#ff4b62' : '#c4c8ee', t: 2}; else this.say('I see… interesting.'); }
      if (k === 'magnet') { const s = this.shells.shift(); if (s) this.live--; else this.dud--; this.flashInfo = {text: `${who} pulled out a ${s ? 'LIVE' : 'DUD'} shell`, color: s ? '#ff4b62' : '#c4c8ee', t: 2}; this.known = [null, null]; if (!this.shells.length) this.load(); }
      if (k === 'sparkler') { this.double = true; this.flashInfo = {text: 'SPARKLER: next live hits twice!', color: '#ffcf5c', t: 1.8}; }
      if (k === 'rope') { this.skip[1 - side] = true; this.flashInfo = {text: side === 0 ? 'You tied him up! He skips a turn.' : 'He tied you up! You skip a turn.', color: '#c9a26b', t: 2}; }
      if (k === 'candy') { this.lives[side]++; this.flashInfo = {text: `${who} ate cotton candy: +1 life`, color: '#ff9fd0', t: 1.8}; }
      if (k === 'juggle') { G.shuffle(this.shells); this.known = [null, null]; this.flashInfo = {text: 'The shells were juggled!', color: '#5ee6c1', t: 1.8}; }
    },
    fire() {
      const {shooter, target} = this.anim, live = this.shells.shift();
      if (live) this.live--; else this.dud--;
      this.known = [null, null]; this.anim = null;
      if (live) {
        const dmg = this.double ? 2 : 1;
        this.lives[target] = Math.max(0, this.lives[target] - dmg);
        G.shake(14, .45); G.flash('rgba(255,240,200,.85)', .35); G.sfx('boom'); G.sfx('gun');
        G.popText(this.parts, target === 1 ? W / 2 : W / 2, target === 1 ? 170 : 360, `BANG! -${dmg}`, '#ff4b62', 30);
        if (target === 1) { this.flinch = 1.2; this.say(G.pick(TAUNTS.hurt)); G.scream(.45, .9); G.score += 150 * dmg; }
        else { this.gloat = 1.5; this.say(G.pick(TAUNTS.hitYou)); G.sfx('hurt'); }
        this.turn = 1 - shooter;
      } else {
        G.sfx('click'); G.sfx('hit', .3);
        G.popText(this.parts, W / 2, target === 1 ? 170 : 360, '*click* DUD', '#c4c8ee', 24);
        if (target === shooter) { if (shooter === 0) { G.score += 50; } else this.say(G.pick(TAUNTS.selfDud)); }
        else this.turn = 1 - shooter;
      }
      this.double = false;
      if (this.turn !== shooter && this.skip[this.turn]) { this.skip[this.turn] = false; this.turn = shooter; this.flashInfo = {text: 'Tied up! Turn skipped.', color: '#c9a26b', t: 1.6}; }
      if (!this.lives[0]) {
        if (--this.tickets <= 0) { this.over = true; this.later(1.4, () => G.end('The Ringmaster wins')); return; }
        this.flashInfo = {text: `Try again! ${this.tickets} ticket${this.tickets > 1 ? 's' : ''} left`, color: '#ffcf5c', t: 2.4}; this.later(1.8, () => this.startRound()); return;
      }
      if (!this.lives[1]) {
        G.score += 1000 * (this.round + 1) + this.lives[0] * 200; G.sfx('win');
        if (this.round === 2) { this.over = true; G.party(); this.later(1.6, () => G.end('You escaped the tent!')); return; }
        this.round++; this.flashInfo = {text: `ROUND ${this.round + 1}`, color: '#ffcf5c', t: 2.4}; this.wait = 2.6; this.later(1.2, () => this.startRound()); return;
      }
      if (!this.shells.length) { this.flashInfo = {text: 'Reloading…', color: '#ffcf5c', t: 1.6}; this.later(.9, () => this.load()); }
      this.wait = this.turn === 1 ? 1.4 : 0;
    },
    ai() { // the Ringmaster plays the odds, and uses his tricks when they help
      const L = this.live, D = this.dud, p = L / Math.max(1, L + D), my = this.items[1], know = this.known[1];
      const use = k => { const i = my.indexOf(k); if (i >= 0) { this.useItem(1, i); this.wait = 1; return true; } return false; };
      if (this.lives[1] < this.max[1] && use('candy')) return;
      if (know === null && p > .2 && p < .8 && use('ball')) return;
      const willLive = know ?? (p >= .5);
      if (willLive && !this.double && use('sparkler')) return;
      if (willLive && !this.skip[0] && use('rope')) return;
      if (know === null && p > .4 && p < .6 && use('magnet')) return;
      this.say(G.pick(TAUNTS.think), 1.2);
      this.act(1, willLive !== (know === null && Math.random() < ROUNDS[this.round].slip) ? 'him' : 'self'); // early rounds: he guesses wrong sometimes
    },
    key(k) {
      if (k === '1') this.act(0, 'him');
      if (k === '2') this.act(0, 'self');
      const i = '345678'.indexOf(k); if (i >= 0) this.act(0, i);
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (y > 420 && y < 470) { if (x > 230 && x < 390) this.act(0, 'him'); if (x > 410 && x < 570) this.act(0, 'self'); }
      this.items[0].forEach((k, i) => { const [ix, iy] = slot(0, i); if (Math.abs(x - ix) < 21 && Math.abs(y - iy) < 21) this.act(0, i); });
    },
    update(dt) {
      this.reveal -= dt; this.flinch -= dt; this.gloat -= dt; this.wait -= dt;
      if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
      if (this.flashInfo && (this.flashInfo.t -= dt) <= 0) this.flashInfo = null;
      if (this.anim && (this.anim.t -= dt) <= 0) this.fire();
      if (this.timer && (this.timer.t -= dt) <= 0) { const f = this.timer.fn; this.timer = null; f(); }
      if (!this.anim && !this.over && !this.timer && this.turn === 1 && this.reveal <= 0 && this.wait <= 0) this.ai();
    },
    draw(ctx, dt) {
      const now = performance.now() / 1000;
      // circus tent at night: faded stripes, a single hanging bulb
      G.clear('#0a0506');
      for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? 'rgba(120,20,26,.35)' : 'rgba(200,180,140,.12)'; ctx.beginPath(); ctx.moveTo(W / 2, -40); ctx.lineTo(i * 60 - 80, H); ctx.lineTo(i * 60 - 20, H); ctx.fill(); }
      const glow = ctx.createRadialGradient(W / 2, 140, 20, W / 2, 200, 420);
      glow.addColorStop(0, 'rgba(255,200,120,.35)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, 26); ctx.stroke();
      G.circle(W / 2, 32, 8 + Math.sin(now * 13) * .6, '#ffe2a0');
      // the Ringmaster
      const img = G.img(`img/ringmaster_${this.pose()}.png`), sway = Math.sin(now * 1.3) * 4, shake = this.flinch > 0 ? (Math.random() - .5) * 12 : 0;
      const lean = this.anim?.target === 0 ? 30 : 0; // he leans in when the gun points at you
      if (img.complete && img.naturalWidth) ctx.drawImage(img, W / 2 - 270 - lean / 2 + sway + shake, -50 - lean / 3, 540 + lean, 540 + lean);
      // table, candles for lives, the popgun
      ctx.fillStyle = '#3a2216'; ctx.beginPath(); ctx.moveTo(0, 300); ctx.lineTo(W, 300); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = '#4a2c1c'; ctx.fillRect(0, 300, W, 8);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 320 + i * 30, W, 2); }
      const candles = (side, x0, dir) => { for (let i = 0; i < this.max[side]; i++) {
        const x = x0 + dir * i * 26, lit = i < this.lives[side];
        G.rr(x - 6, 252, 12, 46, 3, '#efe3c8');
        if (lit) { G.circle(x, 244, 14, 'rgba(255,190,90,.25)'); ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.ellipse(x, 244 + Math.sin(now * 9 + i) * 1, 4, 8, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.strokeStyle = 'rgba(200,200,200,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, 250); ctx.quadraticCurveTo(x + 6, 238, x - 2, 226); ctx.stroke(); }
      } };
      candles(0, 40, 1); candles(1, W - 40, -1);
      G.text('YOU', 40, 230, {size: 12, weight: 800, color: '#ffcf5c', shadow: true}); G.text('RINGMASTER', W - 40, 230, {size: 12, weight: 800, align: 'right', color: '#ff9f9f', shadow: true});
      const aim = this.anim, gx = W / 2, gy = 345;
      if (aim?.target === 0) { // the barrel turns to face you: a growing black hole with a brass ring
        const k = 1 - Math.max(0, aim.t) / (aim.shooter === 1 ? 1.4 : .8), r = 22 + k * 38;
        ctx.fillStyle = `rgba(120,0,0,${.25 * k})`; ctx.fillRect(0, 0, W, H);
        G.circle(gx, 392, r + 14, '#2b2b30'); G.circle(gx, 392, r + 6, '#c9a227'); G.circle(gx, 392, r, '#050303'); G.circle(gx - r * .35, 392 - r * .35, r * .18, 'rgba(255,255,255,.08)');
        if (Math.floor(now * 4) !== this.beatT) { this.beatT = Math.floor(now * 4); if (this.beatT % 2 === 0) G.sfx('beat'); }
      } else if (this.reveal <= 0) {
        ctx.save(); ctx.translate(gx, gy - (aim ? 30 : 0)); ctx.rotate(aim ? -Math.PI / 2 * .9 : 0);
        G.rr(-90, -10, 120, 20, 8, '#8a5a35'); for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#e04e5f' : '#f3ead7'; ctx.fillRect(-80 + i * 20, -10, 10, 20); }
        G.rr(20, -7, 90, 14, 6, '#2b2b30'); G.rr(100, -9, 14, 18, 4, '#ffcf5c');
        ctx.restore();
      }
      // the load being shown before it is shuffled in
      if (this.reveal > 0) {
        const n = this.shells.length, shown = [...Array(this.live).fill(true), ...Array(this.dud).fill(false)];
        G.panel(W / 2 - n * 22 - 20, 352, n * 44 + 40, 64, 14, 'rgba(10,6,6,.8)');
        shown.forEach((l, i) => { const x = W / 2 - n * 22 + i * 44 + 22; G.rr(x - 10, 364, 20, 40, 6, l ? '#e0303f' : '#7a7f8e'); G.rr(x - 10, 396, 20, 8, 2, '#c9a227'); });
        G.text(`${this.live} LIVE  ·  ${this.dud} DUD`, W / 2, 340, {size: 18, align: 'center', weight: 800, color: '#ffffff', shadow: true});
      }
      // items: yours along the bottom left, his up by his candles
      for (const side of [0, 1]) this.items[side].forEach((k, i) => {
        const [x, y] = slot(side, i); G.rr(x - 19, y - 19, 38, 38, 9, side ? 'rgba(255,120,120,.1)' : 'rgba(255,255,255,.12)'); icon(ctx, k, x, y, 26);
        if (!side && i < 6) G.text(String(i + 3), x + 16, y - 9, {size: 9, align: 'right', color: '#c4c8ee'});
      });
      const hov = this.items[0].findIndex((k, i) => { const [x, y] = slot(0, i); return Math.abs(G.pointer.x - x) < 19 && Math.abs(G.pointer.y - y) < 19; });
      if (hov >= 0) { const it = ITEMS[this.items[0][hov]], [, y] = slot(0, hov); G.panel(110, y - 18, 230, 36, 8, 'rgba(10,6,6,.92)'); G.text(`${it.name}: ${it.tip}`, 120, y + 5, {size: 12, weight: 700, color: it.color}); }
      // your buttons
      const mine = this.turn === 0 && !this.anim && this.reveal <= 0 && !this.over && !this.timer;
      G.rr(230, 422, 160, 46, 14, mine ? '#c4202c' : '#3a2a2a'); G.text('1  SHOOT HIM', 310, 451, {size: 15, align: 'center', weight: 800, color: mine ? '#fff' : '#8a7a7a'});
      G.rr(410, 422, 160, 46, 14, mine ? '#4a4f68' : '#2a2a32'); G.text('2  SHOOT YOURSELF', 490, 451, {size: 13, align: 'center', weight: 800, color: mine ? '#fff' : '#7a7a8a'});
      G.text(this.over ? '' : this.turn === 0 ? (this.reveal > 0 ? 'Watch the shells…' : 'YOUR TURN') : 'HIS TURN', W / 2, 490, {size: 12, align: 'center', weight: 800, color: this.turn === 0 ? '#ffcf5c' : '#ff9f9f'});
      if (this.double) G.text('SPARKLER READY', W / 2, 300, {size: 12, align: 'center', weight: 800, color: '#ffcf5c', shadow: true});
      if (this.bubble) { G.panel(W / 2 + 110, 70, 200, 40, 14, 'rgba(240,230,210,.92)'); G.text(this.bubble.text, W / 2 + 210, 95, {size: 14, align: 'center', weight: 700, color: '#2a1010'}); }
      if (this.flashInfo) G.text(this.flashInfo.text, W / 2, 140, {size: 24, align: 'center', display: true, color: this.flashInfo.color, shadow: true});
      const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 520);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      G.fx(this.parts, dt);
      G.text(`ROUND ${this.round + 1} / 3`, W / 2, 22, {size: 13, align: 'center', weight: 800, color: '#ffcf5c', shadow: true});
      for (let i = 0; i < 3; i++) { G.rr(14 + i * 30, 10, 26, 16, 3, i < this.tickets ? '#ffcf5c' : 'rgba(255,255,255,.12)'); if (i < this.tickets) G.text('★', 27 + i * 30, 23, {size: 11, align: 'center', color: '#7a2a10'}); }
    }
  });
})();

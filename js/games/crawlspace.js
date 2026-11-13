(() => {
  // Side-view chase through an old house. The kid and the Crawler are Blender sprites.
  const W = 800, H = 450, FLOOR = 382, CEIL = 70, LOW = 292;
  const KID = ['idle', 'run0', 'run1', 'run2', 'run3', 'crouch', 'jump'];
  const ASSETS = [...KID.map(k => `img/kid_${k}.png`), ...[0, 1, 2, 3].map(i => `img/crawler_walk${i}.png`), 'img/crawler_lunge.png', 'img/crawler_face.png'];
  const PAPER = [['#4a3b52', '#3c2f44'], ['#3f4a3a', '#34402f'], ['#5a4334', '#4a372a'], ['#3a4656', '#2f3a48'], ['#583a3a', '#4a2f2f'], ['#4d4a36', '#403d2c']];

  GameBox.register({
    id: 'crawlspace', title: 'Crawlspace', genre: 'Horror', kind: 'Side-view chase', w: W, h: H, levels: 50, assets: ASSETS, thumb: 'jpg',
    hint: 'Find the keys, reach the exit. If it sees you, RUN, or hide in a locker before it gets close!',
    desc: 'Something lives under this old house, and it crawls. Sneak room to room with your flashlight, grab the keys and unlock the way out. It only sees what is in front of it, so creep up behind it, duck through the low tunnels, and hide in a locker when it hunts you. Fifty houses.',
    controls: [['A D / Left Right', 'Move'], ['W / Space / Up', 'Jump'], ['S / Down', 'Crouch'], ['E', 'Hide in a locker or come out'], ['Shift', 'Sprint']],
    info() { return `House ${G.level} · Keys ${this.keys}/${this.needKeys}`; },
    init() {
      const n = G.level, R = G.seeded(n * 53 + 11);
      const rooms = Math.min(9, 3 + Math.floor(n / 6)); let x = 0;
      this.rooms = []; this.crates = []; this.lows = []; this.spots = []; this.items = [];
      for (let i = 0; i < rooms; i++) {
        const w = 720 + R.int(320), paper = R.pick(PAPER), room = {x, w, paper, lamp: x + 140 + R.int(w - 280), window: R() < .5, pics: [x + 80 + R.int(w / 3), x + w / 2 + R.int(w / 3)]};
        this.rooms.push(room);
        if (i > 0) this.spots.push({x: x + 60 + R.int(80), kind: R() < .5 ? 'locker' : 'wardrobe'});
        if (i > 0 && R() < .8) this.spots.push({x: x + w - 200 - R.int(100), kind: R() < .5 ? 'locker' : 'wardrobe'});
        const crates = i === 0 ? 0 : R.int(3);
        for (let c = 0; c < crates; c++) { const cx = x + 220 + R.int(w - 440), ch = 46 + R.int(2) * 30; if (!this.crates.some(k => Math.abs(k.x - cx) < 120)) this.crates.push({x: cx, w: 58, h: ch}); }
        if (i > 0 && (n > 2 && R() < .45)) { const lx = x + 260 + R.int(w - 520); if (!this.crates.some(k => k.x > lx - 80 && k.x < lx + 260)) this.lows.push({x: lx, w: 170 + R.int(120)}); }
        x += w;
      }
      this.len = x;
      this.needKeys = Math.min(3, 1 + Math.floor(n / 15)); this.keys = 0;
      const keyRooms = R.shuffle(this.rooms.slice(1).map((_, i) => i + 1)).slice(0, this.needKeys);
      for (const ri of keyRooms) { const r = this.rooms[ri]; let kx; do { kx = r.x + 150 + R.int(r.w - 300); } while (this.crates.some(c => Math.abs(c.x + c.w / 2 - kx) < 50)); this.items.push({x: kx, y: FLOOR - 40, got: false}); }
      this.exit = {x: this.len - 110};
      this.p = {x: 90, y: FLOOR, vx: 0, vy: 0, ground: true, face: 1, crouch: false, hidden: -1, step: 0, stamina: 100, tired: false};
      const count = n >= 30 ? 2 : 1;
      this.mons = Array.from({length: count}, (_, i) => {
        const r = this.rooms[Math.min(this.rooms.length - 1, 2 + i * 2)] || this.rooms.at(-1);
        return {x: r.x + r.w / 2, y: FLOOR, face: -1, state: 'roam', target: r.x + R.int(r.w), t: 0, step: 0, lost: 0, sniff: 0, seenT: 0, delay: 4 + i * 6};
      });
      this.lives = n <= 5 ? 3 : n <= 35 ? 2 : 1; this.spotted = 0; this.scare = 0; this.dying = 0; this.cam = 0; this.t = 0; this.beatT = 0; this.parts = [];
      this.msg = this.needKeys > 1 ? `Find ${this.needKeys} keys, then the exit door →` : 'Find the key, then the exit door →'; this.msgT = 3.5;
    },
    ceilAt(x) { return this.lows.some(l => x > l.x - 10 && x < l.x + l.w + 10) ? LOW : CEIL; },
    groundAt(x, w = 18) { let g = FLOOR; for (const c of this.crates) if (x + w > c.x && x - w < c.x + c.w) g = Math.min(g, FLOOR - c.h); return g; },
    blocked(x, y, w = 18) { return this.crates.some(c => x + w > c.x && x - w < c.x + c.w && y > FLOOR - c.h + 4); },
    nearSpot() { const p = this.p; return this.spots.findIndex(s => Math.abs(s.x + 30 - p.x) < 46 && p.ground); },
    key(k) {
      const p = this.p, c = k.toLowerCase();
      if (c === 'e') {
        if (p.hidden >= 0) { p.hidden = -1; G.sfx('click'); return; }
        const s = this.nearSpot(); if (s >= 0) { p.hidden = s; p.x = this.spots[s].x + 30; p.vx = 0; G.sfx('click'); G.sfx('boom', .2); }
      }
      if ((c === 'w' || c === ' ' || c === 'arrowup') && p.ground && p.hidden < 0 && this.ceilAt(p.x) === CEIL) { p.vy = -560; p.ground = false; G.sfx('jump', .5); }
    },
    update(dt) {
      const p = this.p, n = G.level;
      this.t += dt; this.msgT -= dt;
      if (this.dying > 0) { this.dying -= dt; this.scare -= dt; if (this.dying <= 0) G.end('The Crawler got you'); return; }
      if (this.scare > 0) { this.scare -= dt; return; }
      // player
      if (p.hidden < 0) {
        const dir = G.held('d', 'ArrowRight') - G.held('a', 'ArrowLeft');
        const low = this.ceilAt(p.x) === LOW || this.ceilAt(p.x + dir * 20) === LOW;
        p.crouch = (G.held('s', 'ArrowDown') || low) && p.ground;
        const sprint = G.keys.Shift && dir && !p.crouch && !p.tired;
        if (sprint) { p.stamina -= 30 * dt; if (p.stamina <= 0) { p.stamina = 0; p.tired = true; } } else { p.stamina = Math.min(100, p.stamina + 20 * dt); if (p.stamina > 35) p.tired = false; }
        const speed = p.crouch ? 120 : sprint ? 300 : 225;
        p.vx = dir * speed; if (dir) p.face = dir;
        const nx = Math.max(30, Math.min(this.len - 30, p.x + p.vx * dt));
        if (!this.blocked(nx, p.y)) p.x = nx;
        if (!p.crouch && this.ceilAt(p.x) === LOW && p.ground) p.crouch = true;
        p.vy += 1500 * dt; p.y += p.vy * dt;
        const g = this.groundAt(p.x);
        if (p.y >= g) { if (!p.ground && p.vy > 300) G.sfx('step', .7); p.y = g; p.vy = 0; p.ground = true; } else p.ground = p.y >= g - .5 && p.vy >= 0;
        if (p.ground && p.y < g) p.ground = false;
        if (dir && p.ground) { p.step += Math.abs(p.vx) * dt; if (p.step > (p.crouch ? 40 : 70)) { p.step = 0; G.sfx('step', p.crouch ? .15 : sprint ? .55 : .3); } }
      }
      for (const it of this.items) if (!it.got && Math.abs(it.x - p.x) < 34 && Math.abs(it.y - (p.y - 50)) < 70 && p.hidden < 0) {
        it.got = true; this.keys++; G.sfx('coin'); G.score += 150; G.burst(this.parts, it.x - this.cam, it.y, '#ffcf5c', 18);
        this.msg = this.keys < this.needKeys ? `Key ${this.keys} of ${this.needKeys}!` : 'The exit is unlocked! Go →'; this.msgT = 2.6;
        if (this.keys === this.needKeys) G.sfx('power');
      }
      if (this.keys === this.needKeys && p.x > this.exit.x - 20 && p.hidden < 0) {
        G.score += 800 + n * 40;
        return G.win(this.spotted === 0 ? 3 : this.spotted <= 2 ? 2 : 1, 'You got out!');
      } else if (p.x > this.exit.x - 30 && this.keys < this.needKeys && this.msgT < 0) { this.msg = 'Locked! Find the key first.'; this.msgT = 2; }
      // the Crawler: roams, sees forward only, chases, searches where it lost you
      let closest = 1e9;
      for (const m of this.mons) {
        if ((m.delay -= dt) > 0) continue;
        const dx = p.x - m.x, d = Math.abs(dx), sight = 380 + n * 4;
        const canSee = p.hidden < 0 && d < sight && (Math.sign(dx) === m.face || d < 110) && !(p.crouch && this.ceilAt(p.x) === LOW && d > 160);
        if (canSee) {
          if (m.state !== 'chase') { m.state = 'chase'; this.spotted++; G.scream(.55, 1); G.shake(6, .4); this.msg = 'IT SEES YOU! RUN or HIDE!'; this.msgT = 2.2; }
          m.lost = 0; m.lastX = p.x;
        } else if (m.state === 'chase') {
          if (p.hidden >= 0 && Math.abs(this.spots[p.hidden].x + 30 - m.x) < 95) { this.catch(m); return; } // it saw you climb in
          if ((m.lost += dt) > (p.hidden >= 0 ? .2 : 3)) { m.state = 'search'; m.target = m.lastX ?? m.x; m.sniff = 2.5; }
        }
        let speed = 75 + n * 1.4, goal = m.target;
        if (m.state === 'chase') { goal = p.x; speed = Math.min(255, 150 + n * 2.1); }
        else if (m.state === 'search') { if (Math.abs(m.x - goal) < 10 && (m.sniff -= dt) <= 0) { m.state = 'roam'; m.target = Math.random() * this.len; } speed *= 1.3; }
        else if (Math.abs(m.x - goal) < 12) { m.target = Math.max(60, Math.min(this.len - 200, m.x + (Math.random() - .5) * 1600)); }
        const mdx = goal - m.x;
        if (Math.abs(mdx) > 4) { m.face = Math.sign(mdx); const st = Math.min(Math.abs(mdx), speed * dt); m.x += m.face * st; m.step += st; }
        m.y = this.groundAt(m.x, 60);
        if (m.state === 'chase' && d < 46 && p.hidden < 0 && Math.abs((p.y) - m.y) < 70) { this.catch(m); return; }
        if (p.hidden < 0 || m.state === 'chase') closest = Math.min(closest, d);
        if (m.state === 'chase' && Math.random() < dt * .6) G.sfx('growl', .6);
      }
      if (closest < 520 && (this.beatT -= dt) <= 0) { this.beatT = .25 + closest / 900; G.sfx('beat', 1.2 - closest / 520); }
      this.near = closest;
      this.cam += (Math.max(0, Math.min(this.len - W, p.x - W * .4)) - this.cam) * Math.min(1, dt * 6);
    },
    catch(m) {
      G.scream(1, 1.6); G.sfx('boom', .9); G.shake(18, 1); G.flash('rgba(140,0,0,.7)', .6);
      if (--this.lives <= 0) { this.scare = 1.6; this.dying = 1.6; return; }
      // a close call: it shoves you away and slinks off to the far end of the house
      this.scare = .7; this.p.hidden = -1; this.p.vy = -380; this.p.ground = false;
      const far = this.rooms.reduce((a, r) => Math.abs(r.x + r.w / 2 - this.p.x) > Math.abs(a.x + a.w / 2 - this.p.x) ? r : a);
      m.x = far.x + far.w / 2; m.state = 'roam'; m.target = m.x; m.delay = 2.5;
      this.msg = `It let you go… ${this.lives} ${this.lives > 1 ? 'lives' : 'life'} left`; this.msgT = 2.5;
    },
    drawRoom(ctx, r, cam) {
      const x0 = r.x - cam;
      if (x0 > W || x0 + r.w < 0) return;
      const [a, b] = r.paper;
      ctx.fillStyle = a; ctx.fillRect(x0, CEIL, r.w, FLOOR - CEIL);
      ctx.fillStyle = b; for (let x = x0; x < x0 + r.w; x += 34) ctx.fillRect(x, CEIL, 12, FLOOR - CEIL - 110);
      ctx.fillStyle = 'rgba(255,255,255,.04)'; for (let x = x0 + 17; x < x0 + r.w; x += 34) for (let y = CEIL + 20; y < FLOOR - 120; y += 40) ctx.fillRect(x - 3, y, 6, 6);
      ctx.fillStyle = '#2a1f19'; ctx.fillRect(x0, FLOOR - 110, r.w, 110); ctx.fillStyle = '#3a2b21'; ctx.fillRect(x0, FLOOR - 112, r.w, 6);
      for (let x = x0 + 20; x < x0 + r.w; x += 90) { ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2; ctx.strokeRect(x, FLOOR - 96, 70, 80); }
      ctx.fillStyle = 'rgba(30,20,10,.25)'; ctx.beginPath(); ctx.ellipse(x0 + r.w * .3, CEIL + 90, 50, 26, .3, 0, Math.PI * 2); ctx.fill(); // damp stain
      if (r.window) { const wx = x0 + r.w * .62; ctx.fillStyle = '#0d1424'; ctx.fillRect(wx, CEIL + 50, 90, 110); ctx.fillStyle = '#c8d4f0'; ctx.beginPath(); ctx.arc(wx + 64, CEIL + 78, 10, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a2b21'; ctx.lineWidth = 6; ctx.strokeRect(wx, CEIL + 50, 90, 110); ctx.beginPath(); ctx.moveTo(wx + 45, CEIL + 50); ctx.lineTo(wx + 45, CEIL + 160); ctx.moveTo(wx, CEIL + 105); ctx.lineTo(wx + 90, CEIL + 105); ctx.stroke(); }
      r.pics.forEach((px, i) => { const sx = px - cam; ctx.fillStyle = '#6a4a22'; ctx.fillRect(sx - 4, CEIL + 64, 58, 72); ctx.fillStyle = i ? '#2a3424' : '#3a2a2a'; ctx.fillRect(sx, CEIL + 68, 50, 64); ctx.fillStyle = 'rgba(210,190,160,.45)'; ctx.beginPath(); ctx.ellipse(sx + 25, CEIL + 96, 10, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(sx + 12, CEIL + 110, 26, 22); });
      ctx.fillStyle = '#1a120d'; ctx.fillRect(x0, CEIL - 10, r.w, 14); for (let x = x0; x < x0 + r.w; x += 120) ctx.fillRect(x, CEIL - 30, 18, 30);
      ctx.fillStyle = '#4a3424'; ctx.fillRect(x0, FLOOR, r.w, H - FLOOR); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let x = x0; x < x0 + r.w; x += 46) ctx.fillRect(x, FLOOR, 2, H - FLOOR);
      ctx.fillStyle = '#2a1d14'; ctx.fillRect(x0, FLOOR, r.w, 5);
      ctx.fillStyle = '#120c08'; ctx.fillRect(x0 - 8, CEIL, 16, FLOOR - CEIL); // door frame between rooms
      const lx = r.lamp - cam; ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, CEIL); ctx.lineTo(lx, CEIL + 40); ctx.stroke(); ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(lx - 18, CEIL + 52); ctx.lineTo(lx + 18, CEIL + 52); ctx.lineTo(lx + 8, CEIL + 38); ctx.lineTo(lx - 8, CEIL + 38); ctx.fill();
      if (this.lampOn(r)) G.circle(lx, CEIL + 54, 5, '#ffe8b0');
    },
    lampOn(r) { const k = Math.sin(this.t * 13 + r.x) + Math.sin(this.t * 3.1 + r.x * .7); return k > -1.2; },
    draw(ctx, dt) {
      const p = this.p, cam = this.cam;
      if (this.scare > 0 && (this.dying < 1.15 || !this.dying)) { // jumpscare after the grab
        G.clear('#000'); const face = G.img('img/crawler_face.png'), k = this.dying ? 1.15 - this.dying : .7 - this.scare, s = Math.min(1.3, .6 + k * 1.5) * H * 1.3;
        if (face.complete && face.naturalWidth) { const j = (Math.random() - .5) * 26; ctx.drawImage(face, W / 2 - s / 2 + j, H / 2 - s * .5 + j, s, s); }
        ctx.fillStyle = `rgba(140,0,0,${.15 + Math.random() * .15})`; ctx.fillRect(0, 0, W, H); return;
      }
      G.clear('#07060a');
      for (const r of this.rooms) this.drawRoom(ctx, r, cam);
      for (const l of this.lows) { // collapsed ceiling you have to crawl under
        const x = l.x - cam; ctx.fillStyle = '#1e1610'; ctx.fillRect(x - 10, CEIL, l.w + 20, LOW - CEIL);
        ctx.fillStyle = '#3a2a1c'; for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(x + l.w * i / 5, LOW - 8); ctx.rotate((i % 2 ? .12 : -.1)); ctx.fillRect(-40, -8, 80, 14); ctx.restore(); }
        ctx.fillStyle = '#5a5e64'; ctx.fillRect(x - 10, LOW - 30, l.w + 20, 10); G.text('CRAWL', x + l.w / 2, LOW + 22, {size: 11, align: 'center', weight: 800, color: 'rgba(255,220,160,.6)'});
      }
      // exit door
      const ex = this.exit.x - cam, open = this.keys === this.needKeys;
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(ex, FLOOR - 190, 90, 190); ctx.fillStyle = open ? '#4a3420' : '#3a2616'; ctx.fillRect(ex + 8, FLOOR - 182, 74, 182);
      G.circle(ex + 70, FLOOR - 90, 5, '#c9a227'); G.rr(ex + 22, FLOOR - 230, 46, 26, 6, open ? '#2a8a3a' : '#a82020'); G.text('EXIT', ex + 45, FLOOR - 212, {size: 13, align: 'center', weight: 800, color: '#fff'});
      if (!open) { G.rr(ex + 34, FLOOR - 104, 22, 20, 4, '#c9a227'); ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ex + 45, FLOOR - 104, 8, Math.PI, 0); ctx.stroke(); }
      // hiding spots
      this.spots.forEach((s, i) => {
        const x = s.x - cam; if (x < -80 || x > W + 20) return;
        if (s.kind === 'locker') { G.rr(x, FLOOR - 170, 60, 170, 4, '#4a5560'); ctx.fillStyle = '#39434c'; ctx.fillRect(x + 4, FLOOR - 166, 52, 162); ctx.fillStyle = '#20262c'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 14, FLOOR - 150 + k * 8, 32, 3); ctx.fillStyle = '#8a949e'; ctx.fillRect(x + 46, FLOOR - 96, 4, 18); }
        else { G.rr(x - 8, FLOOR - 186, 76, 186, 6, '#4a2e1c'); ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 2, FLOOR - 176, 31, 170); ctx.fillRect(x + 31, FLOOR - 176, 31, 170); G.circle(x + 26, FLOOR - 92, 3, '#c9a227'); G.circle(x + 34, FLOOR - 92, 3, '#c9a227'); }
        if (p.hidden === i) { const blink = Math.floor(this.t * 1.5) % 5 ? 1 : 0; if (blink) { G.circle(x + 24, FLOOR - 142, 2.5, '#fff'); G.circle(x + 34, FLOOR - 142, 2.5, '#fff'); } }
      });
      for (const c of this.crates) { const x = c.x - cam; G.rr(x, FLOOR - c.h, c.w, c.h, 3, '#7a5a34'); ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3; ctx.strokeRect(x + 3, FLOOR - c.h + 3, c.w - 6, c.h - 6); ctx.beginPath(); ctx.moveTo(x + 3, FLOOR - c.h + 3); ctx.lineTo(x + c.w - 3, FLOOR - 3); ctx.stroke(); }
      for (const it of this.items) if (!it.got) { const x = it.x - cam, y = it.y + Math.sin(this.t * 3) * 5; G.circle(x, y, 18, 'rgba(255,207,92,.18)'); G.circle(x - 8, y, 8, '#ffcf5c'); G.circle(x - 8, y, 3.5, '#4a3420'); G.rr(x - 2, y - 3, 22, 6, 2, '#ffcf5c'); G.rr(x + 12, y + 2, 4, 7, 1, '#ffcf5c'); G.rr(x + 6, y + 2, 4, 5, 1, '#ffcf5c'); }
      // the Crawler(s)
      for (const m of this.mons) {
        if (m.delay > 0) continue;
        const lunge = m.state === 'chase' && Math.abs(p.x - m.x) < 140;
        const img = G.img(lunge ? 'img/crawler_lunge.png' : `img/crawler_walk${Math.floor(m.step / 26) % 4}.png`);
        if (!img.complete || !img.naturalWidth) continue;
        const w = 260, h = 173, x = m.x - cam;
        ctx.save(); ctx.translate(x, m.y); ctx.scale(m.face, 1); ctx.drawImage(img, -w * .55, -h + 4, w, h); ctx.restore();
      }
      // the kid
      if (p.hidden < 0) {
        const pose = !p.ground ? 'jump' : p.crouch ? 'crouch' : Math.abs(p.vx) > 1 ? `run${Math.floor(p.step / 18) % 4}` : 'idle';
        const img = G.img(`img/kid_${pose}.png`);
        if (img.complete && img.naturalWidth) { ctx.save(); ctx.translate(p.x - cam, p.y + 2); ctx.scale(p.face, 1); ctx.drawImage(img, -64, -128, 128, 128); ctx.restore(); }
      }
      // darkness with the flashlight, lamps and key glints cut out of it
      const dk = this.dark || (this.dark = Object.assign(document.createElement('canvas'), {width: W, height: H})), d = dk.getContext('2d');
      d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H); d.fillStyle = 'rgba(2,2,6,.9)'; d.fillRect(0, 0, W, H);
      d.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a = 1) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
      for (const r of this.rooms) if (this.lampOn(r)) hole(r.lamp - cam, CEIL + 120, 230, .75);
      for (const r of this.rooms) if (r.window) hole(r.x + r.w * .62 - cam + 45, CEIL + 105, 120, .4);
      for (const it of this.items) if (!it.got) hole(it.x - cam, it.y, 60, .8);
      hole(ex + 45, FLOOR - 120, 140, .7);
      const px = p.x - cam, py = p.y - (p.crouch ? 40 : 66);
      hole(px, py, 110, p.hidden >= 0 ? .3 : .85);
      if (p.hidden < 0) { // flashlight cone
        d.save(); d.translate(px + p.face * 30, py); d.scale(p.face, 1);
        const g = d.createRadialGradient(0, 0, 10, 0, 0, 420); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.7, 'rgba(0,0,0,.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.beginPath(); d.moveTo(0, 0); d.lineTo(420, -130); d.lineTo(420, 150); d.closePath(); d.fill(); d.restore();
      }
      ctx.drawImage(dk, 0, 0);
      if (this.near < 400) { const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(120,0,0,${.6 * (1 - this.near / 400)})`); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); }
      // HUD: map strip, keys, prompts
      G.panel(150, 10, 500, 18, 9, 'rgba(0,0,0,.5)');
      const mx = x => 158 + (x / this.len) * 484;
      G.rr(mx(this.exit.x) - 4, 13, 8, 12, 2, open ? '#3fbf5a' : '#c4202c');
      for (const it of this.items) if (!it.got) G.circle(mx(it.x), 19, 4, '#ffcf5c');
      for (const m of this.mons) if (m.delay <= 0 && m.state === 'chase') G.circle(mx(m.x), 19, 5, '#ff4b4b');
      G.circle(mx(p.x), 19, 5, '#5ee6c1');
      for (let i = 0; i < this.needKeys; i++) G.text('🔑', 20 + i * 26, 30, {size: 18, color: i < this.keys ? '#fff' : 'rgba(255,255,255,.2)'});
      if (this.needKeys) for (let i = this.keys; i < this.needKeys; i++) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(18 + i * 26, 12, 22, 22); }
      for (let i = 0; i < this.lives; i++) G.text('♥', W - 22 - i * 22, 50, {size: 20, align: 'right', color: '#ff5b6b', shadow: true});
      G.text(`HOUSE ${G.level}`, W - 16, 26, {size: 13, align: 'right', weight: 800, color: '#ffcf5c', shadow: true});
      G.bar({x: 16, y: H - 26, w: 140, h: 12, v: p.stamina, max: 100, color: p.tired ? '#7a7f99' : '#5ee6c1', label: 'SPRINT'});
      const s = this.nearSpot();
      if (p.hidden >= 0) G.text('Hiding… press E to come out', W / 2, H - 20, {size: 15, align: 'center', weight: 800, color: '#cfe8ff', shadow: true});
      else if (s >= 0) G.text('E: HIDE', this.spots[s].x + 30 - cam, FLOOR - 196, {size: 15, align: 'center', weight: 800, color: '#fff', shadow: true});
      if (this.msgT > 0) G.text(this.msg, W / 2, 62, {size: 17, align: 'center', weight: 800, color: '#ffe8a0', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

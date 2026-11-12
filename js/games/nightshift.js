(() => {
  const W = 800, H = 500, COLORS = ['cream', 'ash', 'red'];
  const ASSETS = [...COLORS.flatMap(c => [`img/wax_${c}_stand.png`, `img/wax_${c}_reach.png`]), 'img/wax_face.png'];
  // the museum: each room is a camera; figures walk from the Grand Hall toward one of your two doors
  const ROOMS = [
    {name: 'Grand Hall', next: [1, 2], mx: 90, my: 20, spots: [[.3, .78, .9], [.55, .74, .8], [.75, .8, .95]]},
    {name: 'West Gallery', next: [3, 4], mx: 20, my: 70, spots: [[.25, .8, .95], [.6, .72, .7], [.8, .85, 1.05]]},
    {name: 'East Gallery', next: [3, 5], mx: 160, my: 70, spots: [[.2, .84, 1.05], [.45, .72, .7], [.75, .8, .95]]},
    {name: 'Gift Shop', next: [4, 5], mx: 90, my: 110, spots: [[.3, .82, 1], [.55, .76, .85], [.72, .86, 1.05]]},
    {name: 'West Corridor', next: [6], mx: 20, my: 150, spots: [[.5, .7, .62], [.42, .8, .9], [.58, .9, 1.15]]},
    {name: 'East Corridor', next: [7], mx: 160, my: 150, spots: [[.5, .7, .62], [.58, .8, .9], [.42, .9, 1.15]]},
    {name: 'LEFT DOOR'}, {name: 'RIGHT DOOR'}
  ];
  const DOOR = {6: 0, 7: 1};

  function paintRoom(i) { // each camera view is painted once into its own canvas
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'), R = G.seeded(i * 31 + 5);
    const corridor = i >= 4, bx = corridor ? 330 : 190, by = corridor ? 150 : 110, bw = W - bx * 2, bh = corridor ? 170 : 230;
    const wall = ['#5b4a3c', '#4a5260', '#5a4658', '#4f5a48', '#463e38', '#3e4450'][i];
    x.fillStyle = '#16120f'; x.fillRect(0, 0, W, H);
    x.fillStyle = wall; x.fillRect(bx, by, bw, bh);                                         // back wall
    const side = (sx, ex) => { x.beginPath(); x.moveTo(sx, 0); x.lineTo(ex, by); x.lineTo(ex, by + bh); x.lineTo(sx, H); x.fill(); };
    x.fillStyle = shade(wall, -.25); side(0, bx); side(W, bx + bw);                         // side walls
    x.fillStyle = '#2a211b'; x.beginPath(); x.moveTo(0, H); x.lineTo(bx, by + bh); x.lineTo(bx + bw, by + bh); x.lineTo(W, H); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2;                                     // floor tiles
    for (let k = 1; k < 9; k++) { const t = k / 9, y = by + bh + (H - by - bh) * t * t; x.beginPath(); x.moveTo(bx - bx * t * t, y); x.lineTo(bx + bw + bx * t * t, y); x.stroke(); }
    for (let k = 0; k <= 8; k++) { const fx = bx + bw * k / 8; x.beginPath(); x.moveTo(fx, by + bh); x.lineTo(W / 2 + (fx - W / 2) * 3.2, H); x.stroke(); }
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bx, by, bw, 14);
    if (i === 0) { // grand hall: pillars, banner, chandelier, an empty plinth
      for (const px of [bx + 30, bx + bw - 60]) { x.fillStyle = '#7a6a58'; x.fillRect(px, by, 30, bh); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 20, by, 10, bh); }
      x.fillStyle = '#7a1a22'; x.fillRect(W / 2 - 60, by + 20, 120, 70); x.fillStyle = '#d8b46a'; x.font = '700 14px Outfit, sans-serif'; x.textAlign = 'center'; x.fillText('WAXWORKS', W / 2, by + 60);
      x.strokeStyle = '#a08a5a'; x.lineWidth = 3; x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, 50); x.stroke(); x.beginPath(); x.ellipse(W / 2, 60, 60, 14, 0, 0, Math.PI * 2); x.stroke();
    }
    if (i === 1 || i === 2) for (let k = 0; k < 3; k++) { // galleries: framed paintings
      const fx = bx + 30 + k * (bw - 60) / 3 + 10, fw = (bw - 60) / 3 - 20;
      x.fillStyle = '#8a6a2a'; x.fillRect(fx - 6, by + 40, fw + 12, 90); x.fillStyle = ['#2a3a4a', '#4a2a2a', '#2a4a3a'][(k + i) % 3]; x.fillRect(fx, by + 46, fw, 78);
      x.fillStyle = 'rgba(220,200,170,.5)'; x.beginPath(); x.ellipse(fx + fw / 2, by + 78, fw * .16, 22, 0, 0, Math.PI * 2); x.fill(); // a portrait
    }
    if (i === 3) for (let k = 0; k < 3; k++) { // gift shop shelves with little busts
      x.fillStyle = '#3a2a1a'; x.fillRect(bx + 20, by + 50 + k * 55, bw - 40, 8);
      for (let j = 0; j < 7; j++) { x.fillStyle = `hsl(${R.int(360)},30%,${40 + R.int(30)}%)`; x.beginPath(); x.ellipse(bx + 50 + j * (bw - 100) / 6, by + 38 + k * 55, 9, 12, 0, 0, Math.PI * 2); x.fill(); }
    }
    if (corridor) { // corridors: a door at the end, the office glow
      x.fillStyle = '#0a0806'; x.fillRect(W / 2 - 34, by + 40, 68, bh - 40); x.fillStyle = 'rgba(255,220,140,.12)'; x.fillRect(W / 2 - 34, by + 40, 68, bh - 40);
      for (let k = 0; k < 4; k++) { const t = .2 + k * .2; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(bx * (1 - t) - 10, by * (1 - t) + 40, 14, (by + bh) * (1 - t) + H * t - by * (1 - t) - 60); }
    }
    const g = x.createRadialGradient(W / 2, H * .45, 60, W / 2, H / 2, 520); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    return c;
  }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * (1 + k)))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; }

  GameBox.register({
    id: 'nightshift', thumb: 'jpg', title: 'Night Shift', genre: 'Horror', kind: 'Camera survival', w: W, h: H, levels: 20, assets: ASSETS, cursor: 'pointer',
    hint: 'Watch the cameras: a figure you are watching cannot move. Shut the door when one is outside!',
    desc: 'You are the night guard at a closed wax museum, and the wax figures do not stay on their plinths. Flip through the cameras: a figure you are watching freezes in place. Check the door lights, slam the doors when one is right outside, and keep the power up until 6 AM. Twenty nights, each one longer and busier.',
    controls: [['Space / click CAMERAS', 'Open or close the cameras'], ['1-6 / click the map', 'Pick a camera'], ['Q / E', 'Left / right door'], ['A / D', 'Left / right door light']],
    info() { return `Night ${G.level} · ${this.clock()} · Power ${Math.ceil(this.power)}%`; },
    init() {
      const n = G.level;
      this.rooms = this.rooms || ROOMS.slice(0, 6).map((r, i) => paintRoom(i));
      this.noise = this.noise || [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W / 4; c.height = H / 4; const x = c.getContext('2d'), d = x.createImageData(c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; });
      const count = n < 4 ? 1 : n < 14 ? 2 : 3;
      this.figs = Array.from({length: count}, (_, i) => ({i, color: COLORS[i], node: 0, t: 1.5 + i * 2.5, wait: 0, moved: 0, slot: i}));
      this.hourLen = 12 + Math.min(6, n * .3); this.time = 0; this.power = 100;
      this.doors = [false, false]; this.doorY = [0, 0]; this.light = [0, 0]; this.cams = false; this.cam = 0; this.camFlip = 0;
      this.scare = 0; this.dead = false; this.done = false; this.tip = n <= 2 ? 6 : 0; this.static = 0; this.banged = [0, 0]; this.t = 0;
      this.parts = [];
    },
    clock() { const h = Math.floor(this.time / this.hourLen); return `${h === 0 ? 12 : h} AM`; },
    aggro() { return Math.min(.75, .3 + G.level * .022); },
    interval(f) { return Math.max(2.6, 5.2 - G.level * .1) * (f.color === 'red' ? .72 : 1); },
    usage() { return 1 + this.doors[0] + this.doors[1] + (this.cams ? 1 : 0) + (this.light[0] > 0 || this.light[1] > 0 ? 1 : 0); },
    toggleDoor(s) { if (this.cams || this.power <= 0 || this.scare) return; this.doors[s] = !this.doors[s]; G.sfx('boom', .35); G.shake(3, .12); },
    flashLight(s) { if (this.cams || this.power <= 0 || this.scare) return; this.light[s] = 1.4; this.light[1 - s] = 0; G.sfx('click');
      if (this.figs.some(f => f.node === 6 + s)) { G.sfx('growl', .7); G.shake(4, .3); } },
    toggleCams() { if (this.power <= 0 || this.scare) return; this.cams = !this.cams; this.camFlip = .18; this.light = [0, 0]; G.sfx('select'); this.tip = 0; },
    pickCam(c) { if (!this.cams) return; this.cam = c; this.static = .25; G.sfx('click'); },
    key(k) {
      const c = k.toLowerCase();
      if (c === ' ' || c === 's' || c === 'arrowdown' || c === 'arrowup') this.toggleCams();
      if (c === 'q') this.toggleDoor(0); if (c === 'e') this.toggleDoor(1);
      if (c === 'a') this.flashLight(0); if (c === 'd') this.flashLight(1);
      if (c >= '1' && c <= '6') this.pickCam(+c - 1);
    },
    pointer(type, x, y) {
      if (type !== 'down') return;
      if (y > 452 && x > 250 && x < 550) return this.toggleCams();
      if (this.cams) { for (let i = 0; i < 6; i++) { const r = ROOMS[i], rx = 580 + r.mx, ry = 300 + r.my; if (x > rx && x < rx + 58 && y > ry && y < ry + 30) return this.pickCam(i); } return; }
      for (const s of [0, 1]) {
        const px = s ? W - 232 : 182;
        if (x > px && x < px + 50 && y > 210 && y < 260) this.toggleDoor(s);
        if (x > px && x < px + 50 && y > 270 && y < 320) this.flashLight(s);
      }
    },
    attack(f) { // the figure reaches you: the face lunges out of the dark
      if (this.scare) return;
      this.scare = 1.7; this.scarer = f; this.cams = false; G.scream(1, 1.6); G.sfx('boom', .9); G.shake(18, 1); G.flash('rgba(120,0,0,.7)', .6);
    },
    update(dt) {
      this.t += dt; this.camFlip -= dt; this.static -= dt; this.tip -= dt;
      for (const s of [0, 1]) { this.light[s] -= dt; this.doorY[s] += ((this.doors[s] ? 1 : 0) - this.doorY[s]) * Math.min(1, dt * 14); this.banged[s] -= dt; }
      if (this.scare > 0) { this.scare -= dt; if (this.scare <= 0 && !this.done) { this.done = true; G.end('The wax caught you'); } return; }
      this.time += dt;
      if (this.time >= this.hourLen * 6) {
        if (!this.done) { this.done = true; G.score += 1000 + Math.round(this.power) * 20 + G.level * 100; G.win(this.power > 55 ? 3 : this.power > 30 ? 2 : 1, '6 AM! You survived'); }
        return;
      }
      if (this.power > 0) { this.power -= this.usage() * .16 * (1 + G.level * .035) * dt; if (this.power <= 0) { this.power = 0; this.doors = [false, false]; this.cams = false; this.light = [0, 0]; this.outT = 3 + Math.random() * 4; G.sfx('lose'); } }
      else if ((this.outT -= dt) <= 0) return this.attack(this.figs[0]);
      for (const f of this.figs) {
        f.moved -= dt;
        if (f.node >= 6) { // waiting outside a door
          f.wait += dt;
          const side = DOOR[f.node];
          if (f.wait > Math.max(2.8, 4.6 - G.level * .08)) {
            if (this.doors[side]) { f.node = G.level > 10 ? G.pick([1, 2, 3]) : G.pick([0, 1, 2]); f.wait = 0; f.t = this.interval(f) * 1.3; this.heard = side; this.banged[side] = .6; G.sfx('crunch'); G.sfx('boom', .5); G.shake(6, .3); }
            else return this.attack(f);
          }
          continue;
        }
        if ((f.t -= dt) > 0) continue;
        f.t = this.interval(f) * (.7 + Math.random() * .6);
        const watched = this.cams && this.cam === f.node;
        if (watched) { f.tense = 1; continue; } // a figure on the screen you are watching cannot move
        if (Math.random() > this.aggro()) continue;
        const to = G.pick(ROOMS[f.node].next);
        if (to >= 6 && this.figs.some(q => q.node === to)) continue; // only one figure fits in a doorway
        const from = f.node; f.node = to; f.wait = 0; f.moved = 1.2; f.tense = 0;
        if (this.cams && (this.cam === from || this.cam === f.node)) this.static = .5;
        G.sfx('step', f.node >= 4 ? .9 : .4);
        if (f.node >= 4 && Math.random() < .5) G.sfx('growl', .35);
      }
    },
    drawFig(ctx, f, x, y, h, light = 1) {
      const pose = f.node >= 4 || f.tense ? 'reach' : 'stand', img = G.img(`img/wax_${f.color}_${pose}.png`);
      if (!img.complete || !img.naturalWidth) return;
      ctx.globalAlpha = light; ctx.drawImage(img, x - h * .3125, y - h, h * .625, h); ctx.globalAlpha = 1;
    },
    drawCams(ctx) {
      const room = this.rooms[this.cam];
      ctx.drawImage(room, 0, 0);
      const here = this.figs.filter(f => f.node === this.cam);
      here.sort((a, b) => ROOMS[this.cam].spots[a.slot][1] - ROOMS[this.cam].spots[b.slot][1]);
      for (const f of here) { const [sx, sy, sc] = ROOMS[this.cam].spots[f.slot]; this.drawFig(ctx, f, sx * W, sy * H, 300 * sc); }
      ctx.save(); ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#4a7a5a'; ctx.fillRect(0, 0, W, H); ctx.restore();
      ctx.globalAlpha = .1 + Math.max(0, this.static) * 1.6; ctx.drawImage(this.noise[Math.floor(this.t * 20) % 3], 0, 0, W, H); ctx.globalAlpha = 1;
      for (let y = 0; y < H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, y, W, 2); }
      G.text(`CAM ${this.cam + 1}  ·  ${ROOMS[this.cam].name.toUpperCase()}`, 24, 40, {size: 18, weight: 800, color: '#e8f0e0', shadow: true});
      if (Math.floor(this.t * 2) % 2) { G.circle(30, 64, 6, '#ff3b3b'); G.text('REC', 42, 69, {size: 12, weight: 800, color: '#ffb0b0'}); }
      if (here.length) G.text(here.some(f => f.tense) ? 'It knows you are watching…' : '', 24, 92, {size: 13, color: '#ffd0a0', shadow: true});
      // the map
      G.panel(572, 292, 222, 196, 10, 'rgba(0,0,0,.55)');
      ctx.strokeStyle = 'rgba(200,230,200,.35)'; ctx.lineWidth = 3;
      ROOMS.slice(0, 6).forEach((r, i) => r.next.forEach(j => { if (j < 6) { const b = ROOMS[j]; ctx.beginPath(); ctx.moveTo(609 + r.mx, 315 + r.my); ctx.lineTo(609 + b.mx, 315 + b.my); ctx.stroke(); } }));
      G.rr(640, 468, 100, 16, 4, 'rgba(255,220,140,.4)'); G.text('YOU', 690, 480, {size: 10, align: 'center', weight: 800, color: '#2a2010'});
      ROOMS.slice(0, 6).forEach((r, i) => {
        const rx = 580 + r.mx, ry = 300 + r.my, on = i === this.cam, busy = this.figs.some(f => f.node === i);
        G.rr(rx, ry, 58, 30, 6, on ? '#9ff0b0' : 'rgba(40,60,45,.95)');
        G.text(`CAM ${i + 1}`, rx + 29, ry + 19, {size: 11, align: 'center', weight: 800, color: on ? '#0c2a14' : '#cfe8d0'});
        if (busy && G.level <= 4) G.circle(rx + 52, ry + 6, 4, '#ff5b5b'); // early nights: red dots show where they are
      });
    },
    drawOffice(ctx) {
      const flick = this.power <= 0 ? .25 : .92 + Math.sin(this.t * 37) * .03;
      G.clear('#0d0b0a');
      // back wall, desk, posters
      ctx.fillStyle = '#3a3530'; ctx.fillRect(170, 60, 460, 330);
      ctx.fillStyle = '#2c2824'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(170, 60); ctx.lineTo(170, 390); ctx.lineTo(0, 500); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(630, 60); ctx.lineTo(630, 390); ctx.lineTo(W, 500); ctx.fill();
      ctx.fillStyle = '#1e1a17'; ctx.beginPath(); ctx.moveTo(0, 500); ctx.lineTo(170, 390); ctx.lineTo(630, 390); ctx.lineTo(W, 500); ctx.fill();
      ctx.fillStyle = '#2e2924'; ctx.fillRect(170, 250, 460, 140); ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let px = 180; px < 630; px += 38) ctx.fillRect(px, 250, 3, 140); ctx.fillStyle = '#4a3a2c'; ctx.fillRect(170, 246, 460, 8);
      for (let px = 186; px < 630; px += 28) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(px, 60, 12, 186); }
      G.rr(300, 110, 90, 120, 4, '#5a2a2a'); G.text('SMILE!', 345, 140, {size: 13, align: 'center', weight: 800, color: '#f0d8a0'});
      G.circle(345, 185, 26, '#e8d4b0'); G.circle(336, 180, 4, '#2a1a10'); G.circle(354, 180, 4, '#2a1a10'); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(345, 190, 12, .2, Math.PI - .2); ctx.stroke();
      G.rr(420, 120, 110, 80, 4, '#2a3a4a'); G.text('STAFF ONLY', 475, 165, {size: 12, align: 'center', weight: 800, color: '#a0c0e0'});
      G.rr(200, 330, 400, 70, 6, '#4a3626'); G.rr(200, 330, 400, 10, 4, '#5e4630');
      G.rr(250, 290, 120, 50, 6, '#1a1c20'); G.rr(258, 296, 104, 36, 3, this.cams ? '#9ff0b0' : '#1a3a2a');                 // the old monitor
      const fanA = this.t * 25; G.circle(500, 305, 26, '#26282c'); ctx.strokeStyle = '#6a6c70'; ctx.lineWidth = 6;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(500, 305); ctx.lineTo(500 + Math.cos(fanA + k * 2.1) * 22, 305 + Math.sin(fanA + k * 2.1) * 22); ctx.stroke(); }
      G.rr(440, 316, 26, 18, 3, '#8a2a2a'); G.circle(453, 314, 6, '#d8c070'); // cupcake for luck
      // doorways
      for (const s of [0, 1]) {
        const x0 = s ? 640 : 40, w = 120, top = 120, bot = 420, lit = this.light[s] > 0 && this.power > 0;
        ctx.fillStyle = lit ? '#2a2c22' : '#050404'; ctx.fillRect(x0, top, w, bot - top);
        const f = this.figs.find(q => q.node === 6 + s);
        if (f && lit) { this.drawFig(ctx, f, x0 + w / 2, bot + 10, 300, .95); }
        if (lit) { const g = ctx.createRadialGradient(x0 + w / 2, 250, 10, x0 + w / 2, 250, 180); g.addColorStop(0, 'rgba(255,240,170,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(x0, top, w, bot - top); }
        const dh = (bot - top) * this.doorY[s];
        if (dh > 1) { // steel shutter rolling down
          ctx.fillStyle = '#6a6e74'; ctx.fillRect(x0, top, w, dh);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; for (let y = top + 8; y < top + dh; y += 16) ctx.fillRect(x0, y, w, 3);
          ctx.fillStyle = '#e0b030'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * 20, top + dh - 10); ctx.lineTo(x0 + k * 20 + 10, top + dh - 10); ctx.lineTo(x0 + k * 20 + 20, top + dh); ctx.lineTo(x0 + k * 20 + 10, top + dh); ctx.fill(); }
          if (this.banged[s] > 0) G.text('BANG!', x0 + w / 2, top + dh / 2, {size: 26, align: 'center', display: true, color: '#ff5b5b', shadow: true});
        }
        ctx.strokeStyle = '#1a1614'; ctx.lineWidth = 8; ctx.strokeRect(x0, top, w, bot - top);
        // buttons
        const px = s ? W - 232 : 182, near = this.figs.some(q => q.node === 6 + s);
        G.rr(px, 210, 50, 50, 10, this.doors[s] ? '#3a8a4a' : '#c4202c'); G.text(this.doors[s] ? 'OPEN' : 'SHUT', px + 25, 240, {size: 11, align: 'center', weight: 800, color: '#fff'});
        G.text(s ? 'E' : 'Q', px + 25, 254, {size: 9, align: 'center', color: 'rgba(255,255,255,.7)'});
        G.rr(px, 270, 50, 50, 10, this.light[s] > 0 ? '#ffe28a' : '#5a5a4a'); G.text('LIGHT', px + 25, 300, {size: 11, align: 'center', weight: 800, color: this.light[s] > 0 ? '#2a2010' : '#fff'});
        G.text(s ? 'D' : 'A', px + 25, 314, {size: 9, align: 'center', color: 'rgba(255,255,255,.7)'});
        if (near && G.level <= 3 && Math.floor(this.t * 4) % 2) { ctx.strokeStyle = '#ff4b4b'; ctx.lineWidth = 3; ctx.strokeRect(px - 4, 206, 58, 118); } // training wheels on early nights
      }
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(400, 0); ctx.lineTo(400, 48); ctx.stroke(); G.rr(388, 44, 24, 10, 3, '#2a2a2a');
      const lamp = ctx.createRadialGradient(400, 60, 6, 400, 240, 420); lamp.addColorStop(0, `rgba(255,226,160,${this.power > 0 ? .22 : 0})`); lamp.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = lamp; ctx.fillRect(0, 0, W, H);
      if (this.power > 0) G.circle(400, 58, 7, '#fff2c8');
      ctx.fillStyle = `rgba(0,0,0,${1 - flick})`; ctx.fillRect(0, 0, W, H);
    },
    draw(ctx, dt) {
      if (this.scare > 0) { // jumpscare: the melted face lunges at the screen
        G.clear('#000');
        const face = G.img('img/wax_face.png'), k = 1.7 - this.scare, s = Math.min(1.25, .45 + k * 1.6) * H * 1.15;
        if (face.complete && face.naturalWidth) { const j = (Math.random() - .5) * 26; ctx.drawImage(face, W / 2 - s / 2 + j, H / 2 - s * .52 + j, s, s); }
        ctx.fillStyle = `rgba(160,0,0,${.15 + Math.random() * .15})`; ctx.fillRect(0, 0, W, H);
        return;
      }
      if (this.cams) this.drawCams(ctx); else this.drawOffice(ctx);
      if (this.camFlip > 0) { ctx.fillStyle = `rgba(0,0,0,${this.camFlip * 4})`; ctx.fillRect(0, 0, W, H); }
      // HUD
      const hour = this.clock(), use = this.usage();
      G.text(hour, W - 24, 40, {size: 28, align: 'right', display: true, color: '#fff', shadow: true});
      G.text(`NIGHT ${G.level}`, W - 24, 62, {size: 12, align: 'right', weight: 800, color: '#ffcf5c', shadow: true});
      if (!this.cams) {
        G.text(`POWER ${Math.ceil(this.power)}%`, 20, 34, {size: 18, weight: 800, color: this.power < 20 ? '#ff6b6b' : '#fff', shadow: true});
        for (let i = 0; i < 5; i++) G.rr(20 + i * 16, 44, 12, 14, 2, i < use ? (use > 3 ? '#ff6b6b' : use > 2 ? '#ffcf5c' : '#7ee08a') : 'rgba(255,255,255,.12)');
        G.text('USE', 104, 56, {size: 10, weight: 800, color: 'rgba(255,255,255,.6)'});
      }
      G.rr(250, 456, 300, 36, 12, this.cams ? 'rgba(20,40,25,.9)' : 'rgba(30,30,36,.85)');
      G.text(this.cams ? '▼ CLOSE CAMERAS (Space)' : '▲ CAMERAS (Space)', W / 2, 479, {size: 14, align: 'center', weight: 800, color: '#cfe8d0'});
      if (this.tip > 0) { G.panel(W / 2 - 230, 70, 460, 44, 12, 'rgba(0,0,0,.75)'); G.text(this.cams ? 'Watching a figure freezes it. Check where they are!' : 'Open the CAMERAS. If one reaches a door, shut it!', W / 2, 98, {size: 14, align: 'center', weight: 700, color: '#ffe8a0'}); }
      if (this.power <= 0) G.text('POWER OUT', W / 2, 250, {size: 30, align: 'center', display: true, color: '#ff6b6b', shadow: true});
      G.fx(this.parts, dt);
    }
  });
})();

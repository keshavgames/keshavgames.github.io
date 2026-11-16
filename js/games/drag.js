(() => {
  // Side-view drag race: launch on green, shift in the green zone, save the nitro. Cars are Blender renders.
  const W = 800, H = 450, PXM = 14, LEN = 400; // 14 px per metre, quarter-mile style 400 m
  const COLORS = ['blue', 'red', 'green', 'yellow', 'purple', 'black'];
  const ASSETS = [...COLORS.map(c => `img/drag_${c}.png`), 'img/drag_wheel.png'];
  const GEARS = [3.2, 2.2, 1.6, 1.25, 1.0];

  GameBox.register({
    id: 'drag', title: 'Drag Strip', genre: 'Racing', kind: 'Drag racing', w: W, h: H, levels: 30, modes: ['bot', 'local'], assets: ASSETS, thumb: 'jpg',
    hint: 'Press Space on GREEN to launch, then Space again each time the needle hits the green zone!',
    desc: 'Two cars, one straight 400 metre strip. Wait for the lights, launch the moment they turn green, then shift up each time the needle swings into the green zone. Too early and you bog, too late and you hit the limiter. Hit N for one blast of nitro. Beat thirty rivals, or race a friend on the same keyboard.',
    controls: [['Space', 'Launch and shift (Player 1)'], ['N', 'Nitro (Player 1)'], ['Enter', 'Launch and shift (Player 2)'], ['/', 'Nitro (Player 2)']],
    info() { return G.mode === 'local' ? 'Two-player drag race' : `Race ${G.level} · vs ${this.cars[1].name}`; },
    init() {
      const n = G.level, duel = G.mode === 'local', R = G.seeded(n * 13 + 7);
      const rival = ['Rookie Rae', 'Turbo Tim', 'Speedy Sue', 'Nitro Nan', 'Big Bo', 'Max Mach'][Math.min(5, Math.floor((n - 1) / 5))];
      const mk = (lane, color, name, bot, power) => ({lane, color, name, bot, power, x: 0, v: 0, gear: 0, rpm: .15, launched: false, early: false, done: false, time: 0, nitro: 1, nitroT: 0, react: 0, rot: 0, flash: 0, shiftMsg: '', shiftT: 0, perfect: 0, smoke: 0});
      this.cars = [mk(1, 'blue', duel ? 'Player 1' : 'You', false, 1 + Math.min(.25, Math.floor(n / 4) * .03)), mk(0, duel ? 'red' : COLORS[1 + (n % 5)], duel ? 'Player 2' : rival, !duel, duel ? 1 + Math.min(.25, Math.floor(n / 4) * .03) : .9 + Math.min(.34, n * .0115))];
      const bot = this.cars[1]; bot.skill = Math.min(.95, .45 + n * .018); bot.reactT = .55 - Math.min(.35, n * .012) + R() * .15;
      this.tree = -2.2 - R() * .8; this.green = false; this.t = 0; this.parts = []; this.done = null; this.cam = 0; this.msg = 'Get ready…'; this.msgT = 2;
    },
    press(c) {
      if (this.done || c.done) return;
      if (!c.launched) {
        if (!this.green) { if (!c.early) { c.early = true; c.shiftMsg = 'JUMP START! +0.5s'; c.shiftT = 1.5; G.sfx('lose', .5); } return; }
        c.launched = true; c.react = this.t; c.smoke = .8; G.sfx('boom', .4); c.shiftMsg = c.react < .25 ? 'GREAT LAUNCH!' : c.react < .5 ? 'Good launch' : 'Slow launch'; c.shiftT = 1.2; if (c.react < .25) c.perfect++; return;
      }
      if (c.gear >= GEARS.length - 1) return;
      const r = c.rpm; let msg, eff;
      if (r >= .82 && r <= .96) { msg = 'PERFECT SHIFT!'; eff = 1.06; c.perfect++; if (!c.bot) G.sfx('coin'); }
      else if (r > .96) { msg = 'Late shift'; eff = .97; } else if (r > .65) { msg = 'Early shift'; eff = .93; } else { msg = 'Way too early!'; eff = .82; }
      c.gear++; c.rpm = Math.max(.3, r * GEARS[c.gear] / GEARS[c.gear - 1]); c.v *= eff; c.flash = .25; c.shiftMsg = msg; c.shiftT = 1; if (!c.bot) G.sfx('shoot', .5);
    },
    nitro(c) { if (c.nitro > 0 && c.launched && !c.done) { c.nitro = 0; c.nitroT = 2.2; if (!c.bot) G.sfx('power'); } },
    key(k) {
      if (k === ' ') this.press(this.cars[0]); if (k === 'n') this.nitro(this.cars[0]);
      if (G.mode === 'local') { if (k === 'Enter') this.press(this.cars[1]); if (k === '/') this.nitro(this.cars[1]); }
    },
    pointer(type) { if (type === 'down') this.press(this.cars[0]); },
    update(dt) {
      this.t += dt; this.msgT -= dt;
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); }
      if (!this.green && this.t >= 0 && this.tree < 0) { this.tree += dt; if (this.tree >= 0) { this.green = true; this.t = 0; G.sfx('power'); this.msg = 'GO!'; this.msgT = .8; } else if (Math.floor(this.tree * 2) !== Math.floor((this.tree - dt) * 2) && this.tree > -1.5) G.sfx('beat', .7); }
      for (const c of this.cars) {
        c.shiftT -= dt; c.flash -= dt; c.smoke -= dt; c.nitroT -= dt;
        if (c.bot && !c.done) { // the rival launches after its reaction time and shifts with some error
          if (this.green && !c.launched && this.t > c.reactT) this.press(c);
          if (c.launched) { const target = .89 + (Math.random() - .5) * (1 - c.skill) * .5; if (c.rpm >= target && Math.random() < .4) this.press(c); if (c.x > LEN * .55 && c.nitro) this.nitro(c); }
        }
        if (!c.launched) { c.rpm = this.green ? c.rpm : .15 + Math.random() * .03; continue; }
        if (c.done) { c.v *= Math.pow(.45, dt); c.x += c.v * dt; c.rot += c.v * dt / .4; continue; }
        const g = GEARS[c.gear], torque = c.rpm < .3 ? .7 : c.rpm < .9 ? 1 : c.rpm < 1 ? .9 : .25; // past the limiter it barely pulls
        const acc = 7.5 * c.power * g * torque * (c.nitroT > 0 ? 1.6 : 1) - c.v * c.v * .0016;
        c.v = Math.max(0, c.v + acc * dt);
        c.rpm = Math.min(1.04, c.rpm + dt * (.55 / g) * (c.nitroT > 0 ? 1.3 : 1));
        c.x += c.v * dt; c.rot += c.v * dt / .4; c.time = this.t + (c.early ? .5 : 0);
        if (c.smoke > 0 || c.nitroT > 0) this.parts.push({x: c.x, lane: c.lane, vx: -40 - Math.random() * 40, vy: -10 - Math.random() * 20, life: .6, color: c.nitroT > 0 ? '#5cb8ff' : '#d8d8d8', wx: true});
        if (c.x >= LEN) { c.done = true; c.time = this.t + (c.early ? .5 : 0); this.finish(); }
      }
      for (const p of this.parts) { p.x += p.vx * dt / PXM; p.vy += 20 * dt; p.life -= dt; p.y = (p.y || 0) + p.vy * dt; }
      this.parts = this.parts.filter(p => p.life > 0);
      const lead = Math.max(this.cars[0].x, G.mode === 'local' ? this.cars[1].x : this.cars[0].x);
      this.cam += ((G.mode === 'local' ? (this.cars[0].x + this.cars[1].x) / 2 : this.cars[0].x) * PXM - 260 - this.cam) * Math.min(1, dt * 8);
    },
    finish() {
      const [a, b] = this.cars; if (this.done || !(a.done || b.done)) return;
      const both = a.done && b.done, aWins = a.done && (!b.done || a.time <= b.time);
      if (!both && !aWins && G.mode !== 'local') { } // wait for the player to cross to show times
      if (!(a.done && b.done) && G.mode === 'local') { const w = a.done ? a : b; this.msg = `${w.name} WINS!`; this.msgT = 3; G.party(); this.done = {t: 2.2, go: () => G.end(`${w.name} wins in ${w.time.toFixed(2)}s`)}; return; }
      if (!a.done) return;
      if (aWins) {
        const st = a.perfect >= 5 ? 3 : a.perfect >= 3 ? 2 : 1; G.score += 800 + G.level * 50 + a.perfect * 100; G.party(); G.sfx('win');
        this.msg = `YOU WIN! ${a.time.toFixed(2)}s`; this.msgT = 3; this.done = {t: 2, go: () => G.win(st, `${a.time.toFixed(2)}s, ${a.perfect} perfect`)};
      } else { this.msg = `${b.name} wins`; this.msgT = 3; this.done = {t: 2, go: () => G.end(`${b.name} won by ${(a.time - b.time).toFixed(2)}s`)}; }
    },
    laneY(l) { return l ? 360 : 250; },
    draw(ctx, dt) {
      const cam = this.cam;
      const sky = ctx.createLinearGradient(0, 0, 0, 200); sky.addColorStop(0, '#5ab0f0'); sky.addColorStop(1, '#cfe8fb'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 6; i++) { const x = ((i * 260 - cam * .2) % 1560 + 1560) % 1560 - 200; ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(x, 60 + (i % 3) * 25, 60, 18, 0, 0, Math.PI * 2); ctx.fill(); }
      // grandstand with a cheering crowd
      const so = -((cam * .6) % 40);
      ctx.fillStyle = '#5a6070'; ctx.fillRect(0, 120, W, 80); ctx.fillStyle = '#4a5060'; for (let r = 0; r < 4; r++) ctx.fillRect(0, 128 + r * 18, W, 4);
      for (let x = so; x < W; x += 14) for (let r = 0; r < 4; r++) { const k = Math.floor((x + cam * .6) / 14) * 7 + r; G.circle(x + (r % 2) * 7, 124 + r * 18 + Math.sin(this.t * 8 + k) * (this.green ? 2 : 0), 5, ['#ff5b6b', '#ffcf5c', '#5cb8ff', '#7ee08a', '#b07bff', '#fff'][k % 6]); }
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(0, 196, W, 12);
      // strip: two lanes, white lines, distance boards
      ctx.fillStyle = '#7ac05a'; ctx.fillRect(0, 208, W, 16);
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(0, 224, W, 200); ctx.fillStyle = '#7ac05a'; ctx.fillRect(0, 424, W, 30);
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 302, W, 4); for (let x = -((cam) % 60); x < W; x += 60) ctx.fillRect(x, 298, 30, 3);
      for (let m = 0; m <= LEN; m += 100) { const x = m * PXM - cam; if (x < -60 || x > W + 60) continue; ctx.fillStyle = '#fff'; ctx.fillRect(x - 2, 224, 4, 200); G.rr(x - 26, 176, 52, 22, 4, m === LEN ? '#111' : '#2a2a30'); G.text(m === LEN ? 'FINISH' : `${m}m`, x, 192, {size: 11, align: 'center', weight: 800, color: '#fff'}); }
      const fx = LEN * PXM - cam; if (fx > -40 && fx < W + 40) for (let i = 0; i < 20; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(fx + j * 10, 224 + i * 10, 10, 10); }
      // start lights tree
      const tx = 40 - cam; if (tx > -60) { ctx.fillStyle = '#222'; ctx.fillRect(tx - 6, 150, 12, 74); G.rr(tx - 20, 100, 40, 90, 6, '#1a1a1e');
        for (let i = 0; i < 3; i++) G.circle(tx, 114 + i * 22, 8, this.green ? '#3a3a3a' : this.tree > -1.5 + i * .5 ? '#ffb020' : '#4a3a1a'); G.circle(tx, 180, 9, this.green ? '#3fe060' : '#1a3a1a'); }
      for (const p of this.parts) G.circle(p.x * PXM - cam, this.laneY(p.lane) - 10 + p.y, 10 + (1 - p.life) * 14, p.color === '#5cb8ff' ? `rgba(92,184,255,${p.life})` : `rgba(220,220,220,${p.life * .8})`);
      for (const c of this.cars) {
        const x = c.x * PXM - cam + 60, y = this.laneY(c.lane), body = G.img(`img/drag_${c.color}.png`), wheel = G.img('img/drag_wheel.png');
        const ay = y - 20, lift = c.launched && c.gear === 0 && c.rpm < .6 ? Math.min(8, c.v * .5) : 0; // body is 50 px per metre; axle line sits 80 px below the image top
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 120, 10, 0, 0, Math.PI * 2); ctx.fill();
        for (const ax of [-1.35, 1.3]) if (wheel.complete && wheel.naturalWidth) { ctx.save(); ctx.translate(x + ax * 50, ay); ctx.rotate(c.rot); ctx.drawImage(wheel, -21.5, -21.5, 43, 43); ctx.restore(); }
        if (body.complete && body.naturalWidth) { ctx.save(); ctx.translate(x - 67, ay); ctx.rotate(-lift * .006); ctx.drawImage(body, -48, -80, 230, 103.5); ctx.restore(); }
        if (c.flash > 0 || c.nitroT > 0) { G.circle(x - 118, y - 20, 10 + Math.random() * 8, c.nitroT > 0 ? 'rgba(92,184,255,.9)' : 'rgba(255,170,60,.9)'); G.circle(x - 118, y - 20, 5, '#fff'); }
        if (c.shiftT > 0) G.text(c.shiftMsg, x, y - 96, {size: 14, align: 'center', weight: 800, color: c.shiftMsg.includes('PERFECT') || c.shiftMsg.includes('GREAT') ? '#ffcf5c' : c.shiftMsg.includes('JUMP') || c.shiftMsg.includes('Way') ? '#ff6b6b' : '#fff', shadow: true});
        G.text(c.name, x, y - 80, {size: 11, align: 'center', weight: 800, color: 'rgba(255,255,255,.85)', shadow: true});
      }
      // gauges
      const gauges = G.mode === 'local' ? [[this.cars[1], W - 120, 'P2: Enter'], [this.cars[0], 120, 'P1: Space']] : [[this.cars[0], 120, 'Space']];
      for (const [c, gx, label] of gauges) {
        const gy = 90; G.circle(gx, gy, 62, 'rgba(10,12,20,.8)');
        ctx.lineWidth = 10; const arc = (a0, a1, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(gx, gy, 50, Math.PI * .75 + a0 * Math.PI * 1.5, Math.PI * .75 + a1 * Math.PI * 1.5); ctx.stroke(); };
        arc(0, .82, '#3a3f52'); arc(.82, .96, '#3fe060'); arc(.96, 1, '#ff4b4b');
        const a = Math.PI * .75 + Math.min(1.04, c.rpm) * Math.PI * 1.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * 46, gy + Math.sin(a) * 46); ctx.stroke(); G.circle(gx, gy, 6, '#ff9f43');
        G.text(c.launched ? `GEAR ${c.gear + 1}` : 'READY', gx, gy + 30, {size: 12, align: 'center', weight: 800, color: '#fff'});
        G.text(`${Math.round(c.v * 2.4)} km/h`, gx, gy + 82, {size: 13, align: 'center', weight: 800, color: '#fff', shadow: true});
        G.text(c.nitro ? 'NITRO READY' : c.nitroT > 0 ? 'NITRO!' : 'nitro used', gx, gy + 98, {size: 11, align: 'center', weight: 800, color: c.nitro ? '#5cb8ff' : '#7a7f99', shadow: true});
        G.text(label, gx, gy - 70, {size: 11, align: 'center', weight: 800, color: '#ffcf5c', shadow: true});
      }
      if (this.msgT > 0) G.text(this.msg, W / 2, 60, {size: 30, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

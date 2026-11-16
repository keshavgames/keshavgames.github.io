(() => {
  // Hunt the hidden fleet before it finds yours. The bot searches, then circles a hit to finish the ship.
  const W = 820, H = 520, N = 10, S = 34;
  const FLEET = [5, 4, 3, 3, 2];

  function place(R) {
    const g = Array.from({length: N}, () => new Array(N).fill(-1)), ships = [];
    FLEET.forEach((len, id) => { for (let t = 0; t < 500; t++) { const hz = R() < .5, x = R.int(hz ? N - len + 1 : N), y = R.int(hz ? N : N - len + 1); const cells = Array.from({length: len}, (_, i) => [x + (hz ? i : 0), y + (hz ? 0 : i)]); if (cells.some(([a, b]) => g[b][a] >= 0)) continue; cells.forEach(([a, b]) => g[b][a] = id); ships.push({cells, hits: 0}); break; } });
    return {g, ships, shots: Array.from({length: N}, () => new Array(N).fill(0))};
  }

  GameBox.register({
    id: 'seabattle', title: 'Sea Battle', genre: 'Strategy', kind: 'Naval guessing game', w: W, h: H, levels: 20, assets: [], thumb: 'jpg', cursor: 'crosshair',
    hint: 'Click the enemy sea on the right to fire. Sink all five ships before they sink yours!',
    desc: 'Two fleets hide on two seas. Fire at the enemy sea one square at a time: a splash is a miss, an explosion is a hit. Find a hit and try the squares around it to finish the ship. Meanwhile the enemy fires back at your fleet on the left. Sink all five enemy ships first. Twenty admirals that search smarter each level.',
    controls: [['Click the right sea', 'Fire a shot']],
    info() { return `Battle ${G.level} · Ships left ${this.foe.ships.filter(s => s.hits < s.cells.length).length}`; },
    init() { const R = G.seeded(G.level * 7 + Date.now() % 1000); this.me = place(R); this.foe = place(R); this.turn = 0; this.wait = 0; this.done = null; this.t = 0; this.fx = []; this.targets = []; this.msg = 'Your turn: fire!'; },
    fire(side, x, y) { // side 1 = shoot at the enemy sea
      const sea = side ? this.foe : this.me; if (sea.shots[y][x]) return false;
      const id = sea.g[y][x]; sea.shots[y][x] = id >= 0 ? 2 : 1;
      const ox = side ? 440 : 40;
      this.fx.push({x: ox + (x + .5) * S, y: 90 + (y + .5) * S, t: .6, hit: id >= 0});
      if (id >= 0) { const sh = sea.ships[id]; sh.hits++; G.sfx('boom', .6); G.shake(4, .2); if (sh.hits === sh.cells.length) { this.msg = side ? 'You sank a ship!' : 'They sank your ship!'; G.sfx(side ? 'win' : 'lose', .6); if (side) G.score += 200; } else this.msg = side ? 'HIT!' : 'They hit you!'; if (side) G.score += 40; }
      else { G.sfx('splash', .5); this.msg = side ? 'Splash, a miss.' : 'They missed!'; }
      const fleetLeft = sea.ships.some(s => s.hits < s.cells.length);
      if (!fleetLeft) { if (side) { G.party(); const left = this.me.ships.filter(s => s.hits < s.cells.length).length; G.score += 600 + G.level * 50; this.done = {t: 1.3, go: () => G.win(left >= 4 ? 3 : left >= 2 ? 2 : 1, 'Enemy fleet sunk!')}; } else this.done = {t: 1.3, go: () => G.end('Your fleet was sunk')}; }
      return id >= 0;
    },
    pointer(type, x, y) {
      if (type !== 'down' || this.turn !== 0 || this.done || this.wait > 0) return;
      const cx = Math.floor((x - 440) / S), cy = Math.floor((y - 90) / S); if (cx < 0 || cy < 0 || cx >= N || cy >= N || this.foe.shots[cy][cx]) return;
      this.fire(1, cx, cy); this.turn = 1; this.wait = .9;
    },
    botShot() {
      const sea = this.me, sh = sea.shots, n = G.level, open = (x, y) => x >= 0 && y >= 0 && x < N && y < N && !sh[y][x];
      // finish wounded ships first: try squares next to hits that are not on a sunk ship
      const hits = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (sh[y][x] === 2 && sea.ships[sea.g[y][x]].hits < sea.ships[sea.g[y][x]].cells.length) hits.push([x, y]);
      if (hits.length && Math.random() < Math.min(.95, .55 + n * .03)) {
        const opts = []; for (const [x, y] of hits) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(x + dx, y + dy)) { const lined = hits.some(([a, b]) => (a === x - dx && b === y - dy)); opts.push({x: x + dx, y: y + dy, w: lined ? 3 : 1}); }
        if (opts.length) { opts.sort((a, b) => b.w - a.w); const top = opts.filter(o => o.w === opts[0].w); const o = G.pick(top); return this.fire(0, o.x, o.y); }
      }
      const cand = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (open(x, y) && (n < 6 || (x + y) % 2 === 0)) cand.push([x, y]); // smarter admirals search in a checkerboard
      const [x, y] = G.pick(cand.length ? cand : (() => { const all = []; for (let y2 = 0; y2 < N; y2++) for (let x2 = 0; x2 < N; x2++) if (open(x2, y2)) all.push([x2, y2]); return all; })()); this.fire(0, x, y);
    },
    update(dt) {
      this.t += dt; for (const f of this.fx) f.t -= dt; this.fx = this.fx.filter(f => f.t > 0);
      if (this.done) { if (this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); return; }
      if ((this.wait -= dt) > 0) return;
      if (this.turn === 1) { this.botShot(); this.turn = 0; this.wait = .4; }
    },
    sea(ctx, data, ox, show, label) {
      G.text(label, ox + N * S / 2, 74, {size: 16, align: 'center', weight: 800, color: '#cfe8ff'});
      G.rr(ox - 6, 84, N * S + 12, N * S + 12, 10, '#0e3a5a');
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const px = ox + x * S, py = 90 + y * S; ctx.fillStyle = (x + y) % 2 ? '#1f6aa0' : '#2474b0'; ctx.fillRect(px, py, S, S); const w = Math.sin(this.t * 2 + x * .7 + y) * 2; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(px + 6, py + 18 + w); ctx.lineTo(px + 28, py + 18 + w); ctx.stroke(); }
      data.ships.forEach(sh => { const sunk = sh.hits === sh.cells.length; if (!show && !sunk) return; const xs = sh.cells.map(c => c[0]), ys = sh.cells.map(c => c[1]); const x0 = Math.min(...xs), y0 = Math.min(...ys), w = (Math.max(...xs) - x0 + 1) * S, h = (Math.max(...ys) - y0 + 1) * S; G.rr(ox + x0 * S + 4, 90 + y0 * S + 4, w - 8, h - 8, 14, sunk ? '#5a3a3a' : '#9aa6b6'); G.rr(ox + x0 * S + 9, 90 + y0 * S + 9, w - 18, h - 18, 10, sunk ? '#7a4a4a' : '#c4ccd8'); });
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const s = data.shots[y][x], cx = ox + (x + .5) * S, cy = 90 + (y + .5) * S; if (s === 1) { G.circle(cx, cy, 5, 'rgba(255,255,255,.7)'); } if (s === 2) { G.circle(cx, cy, 11, '#ff5a2a'); G.circle(cx, cy, 6, '#ffd04a'); } }
    },
    draw(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1e34'); g.addColorStop(1, '#14304e'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      this.sea(ctx, this.me, 40, true, 'YOUR FLEET'); this.sea(ctx, this.foe, 440, false, 'ENEMY SEA');
      for (const f of this.fx) G.circle(f.x, f.y, (1 - f.t / .6) * 30, f.hit ? `rgba(255,140,40,${f.t})` : `rgba(200,230,255,${f.t})`);
      const hx = Math.floor((G.pointer.x - 440) / S), hy = Math.floor((G.pointer.y - 90) / S);
      if (this.turn === 0 && hx >= 0 && hy >= 0 && hx < N && hy < N && !this.foe.shots[hy][hx]) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 3; ctx.strokeRect(440 + hx * S + 2, 90 + hy * S + 2, S - 4, S - 4); }
      G.text(this.msg, W / 2, 34, {size: 22, align: 'center', display: true, color: '#fff'});
      G.text(this.turn === 0 ? 'YOUR SHOT' : 'ENEMY FIRING…', W / 2, 470, {size: 14, align: 'center', weight: 800, color: this.turn === 0 ? '#ffcf5c' : '#ff8a8a'});
    }
  });
})();

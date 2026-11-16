(() => {
  // Word search with kid-friendly themes. Drag across letters to circle a word.
  const W = 760, H = 560;
  const THEMES = {
    Animals: ['CAT', 'DOG', 'LION', 'TIGER', 'ZEBRA', 'HORSE', 'MOUSE', 'SHARK', 'EAGLE', 'PANDA', 'KOALA', 'OTTER', 'SNAKE', 'MONKEY', 'RABBIT', 'TURTLE', 'PARROT', 'GIRAFFE', 'PENGUIN', 'DOLPHIN'],
    Food: ['PIZZA', 'APPLE', 'BREAD', 'MANGO', 'GRAPE', 'PASTA', 'SALAD', 'TACO', 'CAKE', 'CHEESE', 'BANANA', 'COOKIE', 'CARROT', 'NOODLE', 'MUFFIN', 'CHERRY', 'PANCAKE', 'POPCORN', 'SANDWICH', 'CUPCAKE'],
    Space: ['STAR', 'MOON', 'SUN', 'MARS', 'COMET', 'ORBIT', 'ROCKET', 'PLANET', 'GALAXY', 'SATURN', 'ALIEN', 'ASTEROID', 'JUPITER', 'NEBULA', 'METEOR', 'GRAVITY', 'CRATER', 'LAUNCH', 'SHUTTLE', 'COSMOS'],
    Sports: ['GOAL', 'BALL', 'SKATE', 'SWIM', 'TENNIS', 'HOCKEY', 'SOCCER', 'GOLF', 'RUGBY', 'BOXING', 'KARATE', 'SURF', 'RELAY', 'SPRINT', 'DIVING', 'CYCLING', 'BASEBALL', 'ARCHERY', 'BOWLING', 'SKIING'],
    Games: ['LEVEL', 'SCORE', 'BOSS', 'COIN', 'POWER', 'QUEST', 'MAZE', 'PUZZLE', 'HERO', 'JUMP', 'RACE', 'DRAGON', 'CASTLE', 'POTION', 'SHIELD', 'PORTAL', 'BONUS', 'COMBO', 'TROPHY', 'PIXEL']
  };
  const HUES = ['#ff6b8b', '#ffb84a', '#5ee66b', '#4ab8ff', '#b07bff', '#ff8f5a', '#4ff0d8', '#ffd84a'];

  function build(n) {
    const R = G.seeded(n * 43 + 6), names = Object.keys(THEMES), theme = names[(n - 1) % names.length], N = Math.min(13, 8 + Math.floor(n / 6));
    const dirs = [[1, 0], [0, 1], ...(n > 4 ? [[1, 1]] : []), ...(n > 12 ? [[-1, 0], [0, -1], [1, -1]] : []), ...(n > 20 ? [[-1, -1], [-1, 1]] : [])];
    const grid = Array.from({length: N}, () => new Array(N).fill('')), placed = [];
    const pool = R.shuffle(THEMES[theme].filter(w => w.length <= N)), want = Math.min(10, 5 + Math.floor(n / 5));
    for (const w of pool) {
      if (placed.length >= want) break;
      for (let t = 0; t < 120; t++) {
        const [dx, dy] = R.pick(dirs), x0 = R.int(N), y0 = R.int(N), x1 = x0 + dx * (w.length - 1), y1 = y0 + dy * (w.length - 1);
        if (x1 < 0 || y1 < 0 || x1 >= N || y1 >= N) continue;
        let ok = true; for (let i = 0; i < w.length; i++) { const c = grid[y0 + dy * i][x0 + dx * i]; if (c && c !== w[i]) { ok = false; break; } }
        if (!ok) continue;
        for (let i = 0; i < w.length; i++) grid[y0 + dy * i][x0 + dx * i] = w[i];
        placed.push({w, x0, y0, dx, dy, found: false}); break;
      }
    }
    const abc = 'AAABCDEEEEFGHIIIJKLMNOOOPQRSSTTUUVWXYZ';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = abc[R.int(abc.length)];
    return {theme, N, grid, words: placed};
  }

  GameBox.register({
    id: 'wordhunt', title: 'Word Hunt', genre: 'Puzzle', kind: 'Word search', w: W, h: H, levels: 30, assets: [], thumb: 'jpg', cursor: 'pointer',
    hint: 'Find the words in the list! Drag from the first letter to the last.',
    desc: 'Hidden words in a jumble of letters, with themes like animals, food, space, sports and games. Drag from the first letter to the last to circle a word. Early puzzles only hide words across and down; later ones go diagonal and even backwards. Find them all quickly for three stars. Thirty puzzles.',
    controls: [['Drag across letters', 'Circle a word']],
    info() { return `Puzzle ${G.level} · ${this.found}/${this.L.words.length} words`; },
    init() { this.L = build(G.level); this.found = 0; this.drag = null; this.t = 0; this.done = null; this.marks = []; this.flash = 0; },
    cell(x, y) { const {N} = this.L, s = Math.min(460 / N, 34), ox = 30, oy = (H - N * s) / 2 + 10; const cx = Math.floor((x - ox) / s), cy = Math.floor((y - oy) / s); return cx >= 0 && cy >= 0 && cx < N && cy < N ? [cx, cy, s, ox, oy] : null; },
    pointer(type, x, y) {
      if (this.done) return; const c = this.cell(x, y);
      if (type === 'down' && c) this.drag = {a: [c[0], c[1]], b: [c[0], c[1]]};
      if (type === 'move' && this.drag && c) { const dx = c[0] - this.drag.a[0], dy = c[1] - this.drag.a[1]; if (!dx || !dy || Math.abs(dx) === Math.abs(dy)) this.drag.b = [c[0], c[1]]; }
      if (type === 'up' && this.drag) {
        const [ax, ay] = this.drag.a, [bx, by] = this.drag.b;
        const hit = this.L.words.find(w => !w.found && ((w.x0 === ax && w.y0 === ay && w.x0 + w.dx * (w.w.length - 1) === bx && w.y0 + w.dy * (w.w.length - 1) === by) || (w.x0 === bx && w.y0 === by && w.x0 + w.dx * (w.w.length - 1) === ax && w.y0 + w.dy * (w.w.length - 1) === ay)));
        if (hit) { hit.found = true; this.found++; this.marks.push({a: [ax, ay], b: [bx, by], c: HUES[this.marks.length % HUES.length]}); G.sfx('coin'); G.score += 50 + hit.w.length * 10; if (this.found === this.L.words.length) { G.party(); const tm = this.t; this.done = {t: 1, go: () => G.win(tm < 60 + this.L.words.length * 8 ? 3 : tm < 120 + this.L.words.length * 10 ? 2 : 1, `All words in ${Math.round(tm)}s!`)}; } }
        else if (ax !== bx || ay !== by) { G.sfx('hurt', .3); this.flash = .3; }
        this.drag = null;
      }
    },
    update(dt) { if (!this.done) this.t += dt; this.flash -= dt; if (this.done && this.done.t > 0 && (this.done.t -= dt) <= 0) this.done.go(); },
    draw(ctx) {
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#fff6e0'); bg.addColorStop(1, '#ffe2c8'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const {N, grid, words, theme} = this.L, s = Math.min(460 / N, 34), ox = 30, oy = (H - N * s) / 2 + 10;
      G.rr(ox - 10, oy - 10, N * s + 20, N * s + 20, 16, '#ffffff');
      const pill = (a, b, col) => { const x1 = ox + (a[0] + .5) * s, y1 = oy + (a[1] + .5) * s, x2 = ox + (b[0] + .5) * s, y2 = oy + (b[1] + .5) * s; ctx.strokeStyle = col; ctx.lineWidth = s * .8; ctx.lineCap = 'round'; ctx.globalAlpha = .45; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 1; };
      for (const m of this.marks) pill(m.a, m.b, m.c);
      if (this.drag) pill(this.drag.a, this.drag.b, this.flash > 0 ? '#ff4b4b' : '#8a7aff');
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) G.text(grid[y][x], ox + (x + .5) * s, oy + (y + .5) * s + s * .17, {size: s * .52, align: 'center', weight: 800, color: '#3a2a4a'});
      const lx = ox + N * s + 50; G.text(theme.toUpperCase(), lx, 60, {size: 26, display: true, color: '#e8604a'});
      words.forEach((w, i) => { const y = 100 + i * 36; G.rr(lx - 8, y - 22, 200, 30, 10, w.found ? 'rgba(94,230,107,.25)' : 'rgba(255,255,255,.7)'); G.text(w.w, lx + 4, y, {size: 18, weight: 800, color: w.found ? '#2a8a3a' : '#3a2a4a'}); if (w.found) { ctx.strokeStyle = '#2a8a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, y - 7); ctx.lineTo(lx + 8 + w.w.length * 13, y - 7); ctx.stroke(); } });
      G.text(`${this.found}/${words.length} · ${Math.floor(this.t)}s`, W - 20, H - 20, {size: 16, align: 'right', weight: 800, color: '#7a5a4a'});
    }
  });
})();

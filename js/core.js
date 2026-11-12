// Game Box core: game registry, hash router, home grid, shared player, levels, modes, HUD helpers and sound.
(() => {
  const $ = id => document.getElementById(id);
  const list = [];
  const cv = $('cv'), ctx = cv.getContext('2d');
  const store = {
    get: id => { try { return Number(localStorage.getItem('gamebox-' + id)) || 0; } catch { return 0; } },
    set: (id, v) => { try { localStorage.setItem('gamebox-' + id, String(v)); } catch {} }
  };
  const prog = { // level progress: highest unlocked level and best stars per level
    get(id) { try { return JSON.parse(localStorage.getItem('gamebox-lv-' + id)) || {top: 1, stars: {}}; } catch { return {top: 1, stars: {}}; } },
    set(id, p) { try { localStorage.setItem('gamebox-lv-' + id, JSON.stringify(p)); } catch {} }
  };
  const pad = n => String(Math.floor(n)).padStart(6, '0');
  const BODY = 'Rubik, system-ui, sans-serif', DISPLAY = 'Bungee, Impact, sans-serif';
  const GENRES = ['Shooter', 'Action', 'Adventure', 'Horror', 'RPG', 'Racing', 'Arcade', 'Puzzle', 'Strategy', 'Simulation', 'Sports', 'Casual', 'Music', 'Skill'];
  const MODE_LABEL = {bot: 'vs Bots', solo: '1 Player', local: '2 Players', online: 'Online'};
  let game = null, last = 0, raf = 0, genre = 'All', shownScore = '', shownInfo = '';

  // ---- sound: a tiny synth, so no audio files are needed ----
  let actx = null, noise = null, muted = false;
  const lastPlay = {};
  try { muted = localStorage.getItem('gamebox-muted') === '1'; } catch {}
  const SFX = { // [wave, start Hz, end Hz, seconds, volume]
    click: ['square', 660, 640, .05, .03], coin: ['square', 988, 1480, .1, .04], jump: ['square', 280, 620, .12, .04],
    shoot: ['square', 880, 220, .08, .025], laser: ['sawtooth', 1200, 300, .12, .03], hit: ['sawtooth', 240, 90, .1, .05],
    hurt: ['sawtooth', 180, 50, .28, .07], power: ['triangle', 420, 1260, .3, .06], win: ['triangle', 523, 1047, .45, .07],
    lose: ['triangle', 392, 98, .6, .07], beat: ['sine', 70, 40, .2, .3], select: ['triangle', 520, 780, .08, .05],
    boom: ['noise', 900, 80, .45, .18], step: ['noise', 700, 300, .07, .05], splash: ['noise', 2400, 400, .3, .07],
    swing: ['noise', 3200, 900, .1, .05], crunch: ['noise', 1800, 200, .12, .08], gun: ['noise', 2600, 300, .14, .12],
    growl: ['sawtooth', 90, 55, .9, .09]
  };
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    return actx;
  }
  function noiseBuf(a) {
    if (!noise) {
      noise = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const ch = noise.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    return noise;
  }
  function sfx(name, vol = 1) {
    const a = actx, d = SFX[name];
    if (muted || !a || !d || a.state !== 'running') return;
    const t = a.currentTime;
    if (t - (lastPlay[name] || 0) < .03) return; // stacked copies only make noise louder
    lastPlay[name] = t;
    const [type, f0, f1, dur, v] = d;
    const g = a.createGain();
    g.gain.setValueAtTime(v * vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    g.connect(a.destination);
    let src;
    if (type === 'noise') {
      src = a.createBufferSource(); src.buffer = noiseBuf(a);
      const f = a.createBiquadFilter(); f.type = 'lowpass';
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      src.connect(f); f.connect(g);
    } else {
      src = a.createOscillator(); src.type = type;
      src.frequency.setValueAtTime(f0, t); src.frequency.exponentialRampToValueAtTime(f1, t + dur);
      src.connect(g);
    }
    src.start(t); src.stop(t + dur + .02);
  }
  function scream(vol = 1, dur = 1.6) { // shrieking voice: noisy formants plus a wavering, distorted howl
    const a = actx;
    if (muted || !a || a.state !== 'running') return;
    const t = a.currentTime, out = a.createGain();
    out.gain.setValueAtTime(.0001, t); out.gain.exponentialRampToValueAtTime(.55 * vol, t + .06);
    out.gain.setValueAtTime(.55 * vol, t + dur * .6); out.gain.exponentialRampToValueAtTime(.0001, t + dur);
    const shaper = a.createWaveShaper(), curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 6); }
    shaper.curve = curve; shaper.connect(out); out.connect(a.destination);
    for (const [f0, f1, type, g] of [[620, 1400, 'sawtooth', .5], [910, 1900, 'square', .25], [310, 520, 'sawtooth', .35]]) {
      const o = a.createOscillator(), og = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + .25); o.frequency.exponentialRampToValueAtTime(f0 * .7, t + dur);
      lfo.frequency.value = 9 + Math.random() * 5; lg.gain.value = f0 * .06; lfo.connect(lg); lg.connect(o.frequency);
      og.gain.value = g; o.connect(og); og.connect(shaper);
      o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
    }
    for (const [freq, q] of [[1100, 3], [2600, 5], [3500, 6]]) {
      const n = a.createBufferSource(), bp = a.createBiquadFilter(), ng = a.createGain();
      n.buffer = noiseBuf(a); bp.type = 'bandpass'; bp.frequency.setValueAtTime(freq, t); bp.frequency.exponentialRampToValueAtTime(freq * 1.4, t + dur); bp.Q.value = q;
      ng.gain.value = .9; n.connect(bp); bp.connect(ng); ng.connect(shaper); n.start(t); n.stop(t + dur);
    }
  }

  // ---- images (Blender renders and other art) ----
  const images = {};
  function img(src) {
    if (!images[src]) { const i = new Image(); i.src = src; images[src] = i; }
    return images[src];
  }
  function preload(srcs) { return Promise.all(srcs.map(s => { const i = img(s); return i.complete && i.naturalWidth ? null : new Promise(r => { i.onload = i.onerror = r; }); })); }
  function pixels(src) { // decoded RGBA as a Uint32Array for software renderers
    const i = img(src);
    if (!i.complete || !i.naturalWidth) return null;
    if (!i._px) {
      const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(i, 0, 0);
      try { i._px = {w: c.width, h: c.height, data: new Uint32Array(g.getImageData(0, 0, c.width, c.height).data.buffer)}; } catch { return null; }
    }
    return i._px;
  }

  // Shared state and helpers every game reaches through the global G.
  const G = window.G = {
    W: 480, H: 480, ctx, score: 0, state: 'ready', newBest: false, endTitle: 'Game over', dt: 0,
    keys: {}, pointer: {x: 0, y: 0, down: false, used: 0}, lag: {}, level: 1, mode: null, stars: 0,
    shakeT: 0, shakeAmt: 0, flashT: 0, flashMax: 1, flashColor: '', confetti: [],
    BODY, DISPLAY,
    rnd: n => Math.random() * n,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    pick: a => a[Math.floor(Math.random() * a.length)],
    held: (...names) => names.some(n => G.keys[n]) ? 1 : 0,
    seeded(seed) { // deterministic random numbers, so level 23 is always the same level 23
      let s = (seed * 2654435761) >>> 0 || 1;
      const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      r.int = n => Math.floor(r() * n); r.pick = a => a[Math.floor(r() * a.length)];
      r.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      return r;
    },
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    clear(color = '#070814') { ctx.fillStyle = color; ctx.fillRect(0, 0, G.W, G.H); },
    rr(x, y, w, h, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); },
    circle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); ctx.fill(); },
    gem(x, y, r, color) {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath();
      ctx.moveTo(x, y - r); ctx.lineTo(x + r / 2, y - r / 2); ctx.lineTo(x - r / 2, y - r / 2); ctx.closePath(); ctx.fill();
    },
    heart(x, y, s, color) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y + s * .9);
      ctx.bezierCurveTo(x - s * 1.5, y - s * .1, x - s * .6, y - s * 1.2, x, y - s * .35);
      ctx.bezierCurveTo(x + s * .6, y - s * 1.2, x + s * 1.5, y - s * .1, x, y + s * .9); ctx.fill();
    },
    star(x, y, r, color) {
      ctx.fillStyle = color; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    },
    text(s, x, y, {size = 14, color = '#eef0ff', align = 'left', weight = 600, display = false, base = 'alphabetic', shadow = false} = {}) {
      ctx.font = display ? `400 ${size}px ${DISPLAY}` : `${weight} ${size}px ${BODY}`;
      ctx.textAlign = align; ctx.textBaseline = base;
      if (shadow) { ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillText(s, x + 1, y + 2); }
      ctx.fillStyle = color; ctx.fillText(s, x, y);
      ctx.textBaseline = 'alphabetic';
    },
    panel(x, y, w, h, r = 10, color = 'rgba(8,9,24,.62)') { G.rr(x, y, w, h, r, color); },
    // status bar; with an id it keeps a pale "recent damage" trail that drains smoothly
    bar({x, y, w, h = 14, v, max = 1, color = '#5ee6c1', label = '', id = ''}) {
      const f = G.clamp(v / max, 0, 1), r = h / 2;
      let trail = f;
      if (id) { trail = Math.max(f, (G.lag[id] ?? f) - G.dt * .45); G.lag[id] = trail; }
      G.rr(x - 2, y - 2, w + 4, h + 4, r + 2, 'rgba(8,9,24,.72)');
      if (trail > f) G.rr(x, y, w * trail, h, r, 'rgba(255,255,255,.5)');
      if (f > 0) {
        G.rr(x, y, Math.max(w * f, h), h, r, color);
        ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x + r, y + 2, Math.max(0, w * f - h), Math.max(1, h * .22));
      }
      if (label) G.text(label, x + 7, y + h * .74, {size: Math.max(9, Math.round(h * .7)), weight: 700, shadow: true});
    },
    burst(parts, x, y, color, n = 12, speed = 170) {
      for (let i = 0; i < n; i++) {
        const a = G.rnd(Math.PI * 2), v = 40 + G.rnd(speed);
        parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .4 + G.rnd(.4), color});
      }
    },
    popText(parts, x, y, text, color = '#ffcf5c', size = 16) { parts.push({x, y, vx: 0, vy: -46, life: .9, color, text, size}); },
    fx(parts, dt) { // moves and draws particles from burst() and popText()
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.min(1, p.life * 2.5);
        if (p.text) G.text(p.text, p.x, p.y, {size: p.size, color: p.color, align: 'center', weight: 700, shadow: true});
        else { ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
      }
      ctx.globalAlpha = 1;
    },
    party(n = 120) { // confetti over the whole screen
      const colors = ['#ff6b8b', '#ffcf5c', '#5ee6c1', '#5cb8ff', '#8b7bff', '#ff9f5c'];
      for (let i = 0; i < n; i++) G.confetti.push({x: G.rnd(G.W), y: -10 - G.rnd(G.H * .5), vx: G.rnd(80) - 40, vy: 80 + G.rnd(160), r: G.rnd(6), vr: G.rnd(8) - 4, c: G.pick(colors), life: 3});
    },
    shake(amount = 6, time = .25) { G.shakeAmt = Math.max(G.shakeT > 0 ? G.shakeAmt : 0, amount); G.shakeT = Math.max(G.shakeT, time); },
    flash(color = 'rgba(255,50,80,.4)', time = .3) { G.flashColor = color; G.flashT = G.flashMax = time; },
    sfx, scream, audio, isMuted: () => muted, img, preload, pixels,
    load(key) { try { return JSON.parse(localStorage.getItem('gamebox-save-' + key)); } catch { return null; } },
    save(key, data) { try { localStorage.setItem('gamebox-save-' + key, JSON.stringify(data)); } catch {} },
    record() { // keep the high score without ending the run (idle and sandbox games)
      const s = Math.floor(G.score);
      if (game && s > store.get(game.id)) { store.set(game.id, s); $('best').textContent = pad(s); }
    },
    end(title = 'Game over') {
      if (G.state === 'over' || G.state === 'won') return;
      G.state = 'over'; G.endTitle = title;
      const s = Math.floor(G.score);
      G.newBest = s > store.get(game.id);
      if (G.newBest) store.set(game.id, s);
      document.exitPointerLock?.();
      G.net?.send?.({t: 'end', title, won: false});
      sfx(/win|champion|complete|cleared|wrapped|dawn|best|ruler|festival|silent|victory/i.test(title) ? 'win' : 'lose');
      if (/win|champion|complete|cleared|victory/i.test(title)) G.party();
      sync();
    },
    win(stars = 3, title = 'Level complete!') { // finish a level: save stars, unlock the next one, celebrate
      if (G.state !== 'play') return;
      G.state = 'won'; G.endTitle = title; G.stars = stars;
      if (game.levels) {
        const p = prog.get(game.id);
        p.stars[G.level] = Math.max(p.stars[G.level] || 0, stars);
        p.top = Math.max(p.top, Math.min(game.levels, G.level + 1));
        prog.set(game.id, p);
      }
      const s = Math.floor(G.score);
      G.newBest = s > store.get(game.id);
      if (G.newBest) store.set(game.id, s);
      document.exitPointerLock?.();
      sfx('win'); G.party();
      sync();
    }
  };
  window.GameBox = {list, register: def => list.push(def), prog};

  // ---- home ----
  const tile = g => {
    const best = store.get(g.id), p = g.levels ? prog.get(g.id) : null;
    const extra = p ? ` · Lv ${Math.min(p.top, g.levels)}/${g.levels}` : best ? ` · HI ${pad(best)}` : '';
    const badge = g.modes?.includes('online') ? '<span class="badge">Online</span>' : g.modes?.includes('local') ? '<span class="badge">2P</span>' : '';
    return `<a class="tile" href="#${g.id}"><span class="thumb"><img src="thumbs/${g.id}.${g.thumb || 'svg'}" alt="" width="320" height="200" loading="lazy">${badge}</span>` +
      `<span class="name">${g.title}</span><span class="meta">${g.kind}${extra}</span></a>`;
  };

  function renderChips() {
    const present = GENRES.filter(x => list.some(g => g.genre === x));
    $('chips').innerHTML = ['All', ...present].map(x => `<button class="chip" type="button" data-genre="${x}" aria-pressed="${x === genre}">${x}</button>`).join('');
  }

  function renderHome() {
    const q = $('search').value.trim().toLowerCase();
    const shown = list.filter(g => (genre === 'All' || g.genre === genre) && `${g.title} ${g.genre} ${g.kind} ${g.desc}`.toLowerCase().includes(q));
    $('grid').innerHTML = shown.map(tile).join('') || '<p class="empty">No games match that search.</p>';
    $('count').textContent = `${shown.length} of ${list.length} games`;
    $('total').textContent = list.length;
  }

  // ---- player ----
  function levelGrid() {
    const p = prog.get(game.id);
    let html = '';
    for (let n = 1; n <= game.levels; n++) {
      const locked = n > p.top, st = p.stars[n] || 0;
      html += `<button type="button" class="lvl${n === G.level ? ' on' : ''}" data-lvl="${n}"${locked ? ' disabled' : ''}>${locked ? '🔒' : n}<i>${'★'.repeat(st)}</i></button>`;
    }
    return html;
  }
  function sync() {
    const s = G.state, L = game.levels;
    $('veil').hidden = s === 'play';
    $('vkind').textContent = s === 'ready' ? game.kind : s === 'paused' ? 'Paused' : L ? `Level ${G.level}` : 'Final score';
    $('vtitle').textContent = {ready: game.title, paused: game.title, over: G.endTitle, won: G.endTitle}[s];
    $('vtext').innerHTML = s === 'won' ? `<span class="stars">${'★'.repeat(G.stars)}<s>${'★'.repeat(3 - G.stars)}</s></span>`
      : s === 'over' ? `You scored ${Math.floor(G.score).toLocaleString()}.${G.newBest ? ' New high score!' : ''}`
      : s === 'paused' ? 'Press P or Resume to keep going.' : (game.hint || 'Controls are under the screen.');
    const next = L && G.level >= L ? 'Play again' : 'Next level ▶';
    $('vbtn').textContent = {ready: L ? `Play level ${G.level}` : 'Play', paused: 'Resume', over: L ? 'Try again' : 'Play again', won: L ? next : 'Play again'}[s];
    const showPick = s !== 'play' && s !== 'paused';
    $('vlevels').hidden = !(L && showPick);
    if (L && showPick) $('vlevels').innerHTML = levelGrid();
    $('vmodes').hidden = !(game.modes && showPick);
    if (game.modes && showPick) $('vmodes').innerHTML = game.modes.map(m => `<button type="button" class="mode${G.mode === m ? ' on' : ''}" data-mode="${m}">${MODE_LABEL[m] || m}</button>`).join('');
    $('vnet').hidden = !(showPick && G.mode === 'online');
    $('vbtn').hidden = showPick && G.mode === 'online' && !(G.net?.role === 'host' && G.net.peers.length);
    $('pause').textContent = s === 'paused' ? 'Resume' : 'Pause';
    $('pause').disabled = s !== 'play' && s !== 'paused';
    $('best').textContent = pad(store.get(game.id));
  }

  async function open(g) {
    game = g; document.title = `${g.title} · Game Box`;
    G.W = g.w; G.H = g.h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // sharp on high-DPI screens
    cv.width = G.W * dpr; cv.height = G.H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    $('player').style.setProperty('--ratio', G.W / G.H);
    cv.style.cursor = g.cursor || 'default';
    $('ptitle').textContent = g.title;
    $('about').textContent = g.desc;
    $('ctrl').innerHTML = (g.controls || []).map(([keys, what]) =>
      `<div><dt>${keys.split(' / ').map(k => `<kbd>${k}</kbd>`).join('<span class="or">or</span>')}</dt><dd>${what}</dd></div>`).join('');
    $('more').innerHTML = list.filter(x => x !== g && x.genre === g.genre).concat(list.filter(x => x.genre !== g.genre)).slice(0, 8).map(tile).join('');
    G.score = 0; G.keys = {}; G.pointer.down = false; G.state = 'ready'; G.newBest = false; G.lag = {}; G.confetti = [];
    G.shakeT = G.flashT = 0;
    G.mode = g.modes ? g.modes[0] : null;
    G.level = g.levels ? Math.min(prog.get(g.id).top, g.levels) : 1;
    G.net?.close?.(); G.net = null;
    if (g.assets) { G.clear('#070814'); G.text('Loading…', G.W / 2, G.H / 2, {align: 'center', size: 18}); await preload(g.assets); if (game !== g) return; }
    g.init(); sync();
    last = performance.now(); raf = requestAnimationFrame(loop);
  }

  function start() {
    G.score = 0; G.newBest = false; G.keys = {}; G.lag = {}; G.shakeT = G.flashT = 0; G.confetti = [];
    game.init(); G.state = 'play'; sync();
  }
  function primary() {
    const a = audio(); a?.resume?.().catch?.(() => {}); // audio may only start from a click or key press
    if (G.state === 'paused') { G.state = 'play'; game.onPause?.(false); sync(); return; }
    if (G.state === 'play') return;
    if (G.mode === 'online' && G.net?.role !== 'host') return; // the host starts online games
    if (G.state === 'won' && game.levels) G.level = G.level >= game.levels ? 1 : G.level + 1;
    if (G.mode === 'online') G.net.send({t: 'start', level: G.level});
    start();
  }
  function pause() {
    if (G.mode === 'online') return; // online games keep running
    if (G.state === 'play') {
      G.state = 'paused'; G.keys = {}; G.pointer.down = false;
      document.exitPointerLock?.(); game.onPause?.(true); sync();
    } else if (G.state === 'paused') primary();
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((t - last) / 1000, 1 / 30); last = t;
    G.dt = G.state === 'paused' ? 0 : dt;
    if (G.state === 'play') game.update(dt);
    ctx.save();
    if (G.shakeT > 0 && G.dt) {
      G.shakeT -= dt;
      const a = G.shakeAmt * Math.min(1, G.shakeT * 5);
      ctx.translate((Math.random() - .5) * 2 * a, (Math.random() - .5) * 2 * a);
    }
    game.draw(ctx, G.dt);
    ctx.restore();
    if (G.flashT > 0) {
      G.flashT -= G.dt;
      ctx.globalAlpha = Math.max(0, G.flashT / G.flashMax); ctx.fillStyle = G.flashColor; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1;
    }
    for (let i = G.confetti.length - 1; i >= 0; i--) {
      const c = G.confetti[i];
      c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; c.life -= dt;
      if (c.life <= 0 || c.y > G.H + 20) { G.confetti.splice(i, 1); continue; }
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.r); ctx.fillStyle = c.c; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
    }
    const s = pad(G.score), info = game.info ? game.info() : '';
    if (s !== shownScore) $('score').textContent = shownScore = s;
    if (info !== shownInfo) $('info').textContent = shownInfo = info;
  }

  function route() {
    cancelAnimationFrame(raf);
    game?.stop?.();
    G.net?.close?.(); G.net = null;
    document.exitPointerLock?.();
    const g = list.find(x => x.id === location.hash.slice(1));
    $('home').hidden = !!g; $('player').hidden = !g;
    if (g) open(g); else { game = null; document.title = 'Game Box'; renderHome(); }
    scrollTo({top: 0});
  }

  // ---- online rooms (PeerJS, loaded on demand) ----
  function setNet(role, status) {
    $('nstatus').textContent = status;
    $('nhost').disabled = !!role; $('njoin').disabled = !!role; $('ncode').disabled = !!role;
    sync();
  }
  $('nhost').onclick = async () => {
    setNet('pending', 'Making a room…');
    try {
      G.net = await window.Net.host(game.id, {
        onJoin: () => { setNet('host', `${G.net.peers.length} friend${G.net.peers.length > 1 ? 's' : ''} joined. Press Play!`); sfx('power'); },
        onLeave: () => setNet('host', G.net.peers.length ? `${G.net.peers.length} friend(s) in the room` : 'Your friend left. Waiting…'),
        onMessage: (m, from) => game.netMessage?.(m, from)
      });
      setNet('host', `Room code: ${G.net.code} — tell your friend to type it and press Join.`);
    } catch (e) { G.net = null; setNet(null, 'Could not make a room. Online play needs the internet (school Wi-Fi may block it).'); }
  };
  $('njoin').onclick = async () => {
    const code = $('ncode').value.trim().toUpperCase();
    if (code.length < 4) { $('nstatus').textContent = 'Type the room code your friend gave you.'; return; }
    setNet('pending', 'Joining…');
    try {
      G.net = await window.Net.join(game.id, code, {
        onMessage: m => {
          if (m.t === 'start') { G.level = m.level || 1; start(); }
          else if (m.t === 'end') { G.endTitle = m.title; if (G.state === 'play') { G.state = 'over'; sync(); } }
          else game.netMessage?.(m);
        },
        onLeave: () => { setNet(null, 'The host left the room.'); if (G.state === 'play') G.end('Host left'); }
      });
      setNet('client', 'Joined! Waiting for the host to press Play…');
    } catch (e) { G.net = null; setNet(null, 'Could not join. Check the code and try again.'); }
  };

  // ---- input ----
  const norm = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
  addEventListener('keydown', e => {
    if (!game || e.target.matches?.('input')) return;
    const k = norm(e);
    if ((k === ' ' || k === 'Enter') && e.target.closest?.('button, a')) return; // let focused controls work
    if (k === 'Escape') { location.hash = ''; return; }
    if (k.startsWith('Arrow') || k === ' ' || k === "'" || k === '/' || k === 'Tab') e.preventDefault();
    if (k === 'p' && !game.rawKeys) { if (!e.repeat) pause(); return; }
    if (G.state !== 'play') { if ((k === ' ' || k === 'Enter') && !e.repeat) primary(); return; }
    G.keys[k] = true;
    G.net?.role === 'client' && G.net.send({t: 'key', k, down: true});
    game.key?.(k, e.repeat, e);
  });
  addEventListener('keyup', e => {
    const k = norm(e); G.keys[k] = false;
    G.net?.role === 'client' && G.net.send({t: 'key', k, down: false});
  });

  const toGame = e => {
    const r = cv.getBoundingClientRect();
    G.pointer.x = (e.clientX - r.left) * G.W / r.width;
    G.pointer.y = (e.clientY - r.top) * G.H / r.height;
  };
  cv.addEventListener('pointerdown', e => {
    if (!game || G.state !== 'play') return;
    e.preventDefault(); toGame(e); G.pointer.down = true; G.pointer.used = performance.now();
    cv.setPointerCapture?.(e.pointerId);
    if (game.pointerLock && document.pointerLockElement !== cv) cv.requestPointerLock?.()?.catch?.(() => {});
    game.pointer?.('down', G.pointer.x, G.pointer.y);
  });
  cv.addEventListener('pointermove', e => {
    toGame(e); G.pointer.used = performance.now();
    if (game && G.state === 'play') game.pointer?.('move', G.pointer.x, G.pointer.y);
  });
  cv.addEventListener('pointerup', e => {
    toGame(e);
    if (game && G.state === 'play' && G.pointer.down) game.pointer?.('up', G.pointer.x, G.pointer.y);
    G.pointer.down = false;
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  const lift = () => { G.pointer.down = false; };
  addEventListener('pointerup', lift);
  addEventListener('pointercancel', lift);
  document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === cv && game?.look && G.state === 'play') game.look(e.movementX, e.movementY);
  });
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && game?.pointerLock && G.state === 'play') pause();
  });

  addEventListener('blur', () => { if (game && G.state === 'play') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && G.state === 'play') pause(); });

  $('veil').onclick = e => {
    const lvl = e.target.closest('[data-lvl]'), mode = e.target.closest('[data-mode]');
    if (lvl) { G.level = +lvl.dataset.lvl; document.activeElement?.blur(); if (G.mode !== 'online' || G.net?.role === 'host') { audio()?.resume?.(); if (G.mode === 'online') G.net.send({t: 'start', level: G.level}); start(); } return; }
    if (mode) { G.mode = mode.dataset.mode; G.sfx('select'); sync(); return; }
    if (e.target.closest('#vnet')) return;
    document.activeElement?.blur(); primary();
  };
  $('pause').onclick = e => { e.currentTarget.blur(); pause(); };
  const showMute = () => { $('mute').textContent = muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', String(!muted)); };
  $('mute').onclick = e => {
    e.currentTarget.blur(); muted = !muted; showMute();
    try { localStorage.setItem('gamebox-muted', muted ? '1' : '0'); } catch {}
    game?.onMute?.(muted);
  };
  showMute();
  $('fs').hidden = !document.fullscreenEnabled;
  $('fs').onclick = e => {
    e.currentTarget.blur();
    const req = document.fullscreenElement ? document.exitFullscreen() : $('stage').requestFullscreen();
    req?.catch?.(() => {});
  };
  $('chips').onclick = e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    genre = b.dataset.genre; renderChips(); renderHome();
  };
  $('search').addEventListener('input', () => { if (location.hash.length > 1) location.hash = ''; else renderHome(); });

  addEventListener('hashchange', route);
  addEventListener('DOMContentLoaded', () => { renderChips(); route(); });
})();

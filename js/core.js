// Game Box core: game registry, hash router, home grid, shared player, HUD helpers and sound.
(() => {
  const $ = id => document.getElementById(id);
  const list = [];
  const cv = $('cv'), ctx = cv.getContext('2d');
  const store = {
    get: id => { try { return Number(localStorage.getItem('gamebox-' + id)) || 0; } catch { return 0; } },
    set: (id, v) => { try { localStorage.setItem('gamebox-' + id, String(v)); } catch {} }
  };
  const pad = n => String(Math.floor(n)).padStart(6, '0');
  const BODY = 'Rubik, system-ui, sans-serif', DISPLAY = 'Bungee, Impact, sans-serif';
  const GENRES = ['Action', 'Adventure', 'Horror', 'RPG', 'Racing', 'Arcade', 'Puzzle', 'Strategy', 'Simulation', 'Sports', 'Casual', 'Music', 'Skill'];
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
    swing: ['noise', 3200, 900, .1, .05], crunch: ['noise', 1800, 200, .12, .08]
  };
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    return actx;
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
      if (!noise) {
        noise = a.createBuffer(1, a.sampleRate, a.sampleRate);
        const ch = noise.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      }
      src = a.createBufferSource(); src.buffer = noise;
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

  // Shared state and helpers every game reaches through the global G.
  const G = window.G = {
    W: 480, H: 480, ctx, score: 0, state: 'ready', newBest: false, endTitle: 'Game over', dt: 0,
    keys: {}, pointer: {x: 0, y: 0, down: false, used: 0}, lag: {},
    shakeT: 0, shakeAmt: 0, flashT: 0, flashMax: 1, flashColor: '',
    BODY, DISPLAY,
    rnd: n => Math.random() * n,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    pick: a => a[Math.floor(Math.random() * a.length)],
    held: (...names) => names.some(n => G.keys[n]) ? 1 : 0,
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
    shake(amount = 6, time = .25) { G.shakeAmt = Math.max(G.shakeT > 0 ? G.shakeAmt : 0, amount); G.shakeT = Math.max(G.shakeT, time); },
    flash(color = 'rgba(255,50,80,.4)', time = .3) { G.flashColor = color; G.flashT = G.flashMax = time; },
    sfx, audio, isMuted: () => muted,
    load(key) { try { return JSON.parse(localStorage.getItem('gamebox-save-' + key)); } catch { return null; } },
    save(key, data) { try { localStorage.setItem('gamebox-save-' + key, JSON.stringify(data)); } catch {} },
    record() { // keep the high score without ending the run (idle and sandbox games)
      const s = Math.floor(G.score);
      if (game && s > store.get(game.id)) { store.set(game.id, s); $('best').textContent = pad(s); }
    },
    end(title = 'Game over') {
      if (G.state === 'over') return;
      G.state = 'over'; G.endTitle = title;
      const s = Math.floor(G.score);
      G.newBest = s > store.get(game.id);
      if (G.newBest) store.set(game.id, s);
      document.exitPointerLock?.();
      sfx(title === 'Game over' ? 'lose' : 'win');
      sync();
    }
  };
  window.GameBox = {list, register: def => list.push(def)};

  // ---- home ----
  const tile = g => {
    const best = store.get(g.id);
    return `<a class="tile" href="#${g.id}"><span class="thumb"><img src="thumbs/${g.id}.svg" alt="" width="320" height="200" loading="lazy"></span>` +
      `<span class="name">${g.title}</span><span class="meta">${g.kind}${best ? ` · HI ${pad(best)}` : ''}</span></a>`;
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
  function sync() {
    const s = G.state;
    $('veil').hidden = s === 'play';
    $('vkind').textContent = s === 'ready' ? game.kind : s === 'paused' ? 'Paused' : 'Final score';
    $('vtitle').textContent = {ready: game.title, paused: game.title, over: G.endTitle}[s];
    $('vtext').textContent = s === 'over' ? `You scored ${Math.floor(G.score).toLocaleString()}.${G.newBest ? ' New high score!' : ''}`
      : s === 'paused' ? 'Press P or Resume to keep going.' : 'Controls and tips are under the screen.';
    $('vbtn').textContent = {ready: 'Play', paused: 'Resume', over: 'Play again'}[s];
    $('pause').textContent = s === 'paused' ? 'Resume' : 'Pause';
    $('pause').disabled = s === 'ready' || s === 'over';
    $('best').textContent = pad(store.get(game.id));
  }

  function open(g) {
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
    G.score = 0; G.keys = {}; G.pointer.down = false; G.state = 'ready'; G.newBest = false; G.lag = {};
    G.shakeT = G.flashT = 0;
    g.init(); sync();
    last = performance.now(); raf = requestAnimationFrame(loop);
  }

  function start() {
    G.score = 0; G.newBest = false; G.keys = {}; G.lag = {}; G.shakeT = G.flashT = 0;
    game.init(); G.state = 'play'; sync();
  }
  function primary() {
    const a = audio(); a?.resume?.().catch?.(() => {}); // audio may only start from a click or key press
    if (G.state === 'paused') { G.state = 'play'; game.onPause?.(false); sync(); }
    else if (G.state !== 'play') start();
  }
  function pause() {
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
    const s = pad(G.score), info = game.info ? game.info() : '';
    if (s !== shownScore) $('score').textContent = shownScore = s;
    if (info !== shownInfo) $('info').textContent = shownInfo = info;
  }

  function route() {
    cancelAnimationFrame(raf);
    game?.stop?.();
    document.exitPointerLock?.();
    const g = list.find(x => x.id === location.hash.slice(1));
    $('home').hidden = !!g; $('player').hidden = !g;
    if (g) open(g); else { game = null; document.title = 'Game Box'; renderHome(); }
    scrollTo({top: 0});
  }

  // ---- input ----
  const norm = e => e.key.length === 1 ? e.key.toLowerCase() : e.key;
  addEventListener('keydown', e => {
    if (!game || e.target.matches?.('input')) return;
    const k = norm(e);
    if ((k === ' ' || k === 'Enter') && e.target.closest?.('button, a')) return; // let focused controls work
    if (k === 'Escape') { location.hash = ''; return; }
    if (k.startsWith('Arrow') || k === ' ' || k === "'" || k === '/') e.preventDefault();
    if (k === 'p' && !game.rawKeys) { if (!e.repeat) pause(); return; }
    if (G.state !== 'play') { if ((k === ' ' || k === 'Enter') && !e.repeat) primary(); return; }
    G.keys[k] = true;
    game.key?.(k, e.repeat, e);
  });
  addEventListener('keyup', e => { G.keys[norm(e)] = false; });

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

  $('veil').onclick = () => { document.activeElement?.blur(); primary(); };
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

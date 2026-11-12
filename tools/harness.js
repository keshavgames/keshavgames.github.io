// Dev-only test helpers for the local server (node serve.js). Load in the page console with:
//   await import('/tools/harness.js')
// frame(id, n): step and draw a game n frames by hand (works while the tab is in the background).
// peek(): save the canvas to thumbs/_debug.jpg to look at.  snap(id): save thumbs/<id>.jpg (320x200).
// sim(id, {level, runs, seconds, policy}): play headless runs and count how they ended.
const find = id => GameBox.list.find(g => g.id === id);
window.frame = (id, n = 1, dt = 1 / 60) => {
  const g = find(id), c = document.getElementById('cv'), x = c.getContext('2d');
  for (let i = 0; i < n; i++) g.update(dt);
  x.setTransform(c.width / g.w, 0, 0, c.height / g.h, 0, 0); g.draw(x, dt); x.setTransform(1, 0, 0, 1, 0, 0);
  return 'ok';
};
const put = async (path, canvas) => {
  const b = await new Promise(r => canvas.toBlob(r, 'image/jpeg', .86));
  return (await fetch(path, {method: 'PUT', body: b})).status;
};
const shrink = (w, h) => { const c = document.getElementById('cv'), t = document.createElement('canvas'); t.width = w; t.height = h;
  const sr = c.width / c.height, tr = w / h; let sw = c.width, sh = c.height, sx = 0, sy = 0;
  if (sr > tr) { sw = sh * tr; sx = (c.width - sw) / 2; } else { sh = sw / tr; sy = (c.height - sh) / 2; }
  t.getContext('2d').drawImage(c, sx, sy, sw, sh, 0, 0, w, h); return t; };
window.peek = (w = 800) => { const c = document.getElementById('cv'); return put('/thumbs/_debug.jpg', shrink(w, Math.round(w * c.height / c.width))); };
window.snap = id => put(`/thumbs/${id}.jpg`, shrink(320, 200));
window.sim = (id, {level = 1, runs = 20, seconds = 300, dt = 1 / 30, policy = () => {}, mode = 'bot'} = {}) => {
  const g = find(id), out = {}, oe = G.end, ow = G.win, ol = G.level, om = G.mode;
  let errors = 0, firstError = null, total = 0;
  for (let r = 0; r < runs; r++) {
    let end = null; G.end = t => { end = end || 'end: ' + t; }; G.win = (s, t) => { end = end || `win${s ?? ''}`; };
    G.level = level; G.mode = mode; G.score = 0; G.keys = {};
    try { g.init(); } catch (e) { errors++; firstError = firstError || e.stack; continue; }
    let t = 0;
    for (; t < seconds && !end; t += dt) {
      try { policy(g, t); g.update(dt); } catch (e) { errors++; firstError = firstError || e.stack; break; }
    }
    total += t; const k = end || 'timeout'; out[k] = (out[k] || 0) + 1;
  }
  G.end = oe; G.win = ow; G.level = ol; G.mode = om;
  return {out, avgSeconds: +(total / runs).toFixed(1), errors, firstError};
};
export default true;

// Shared first-person raycaster: renders a tile map with textured walls, floors, ceilings or sky,
// lighting and fog, and depth-sorted billboard sprites into a small pixel buffer.
(() => {
  const rgb = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255];
  const pack = (r, g, b) => (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  const hex = h => { const n = parseInt(h.slice(1), 16); return pack(n >> 16, (n >> 8) & 255, n & 255); };

  function create(w, h) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h);
    return {w, h, canvas, ctx, img, px: new Uint32Array(img.data.buffer), zbuf: new Float32Array(w), col: new Float32Array(w)};
  }

  // light multiplier l (0..1+) then optional fog mix toward the fog colour by f (0..1)
  function shadeFog(c, l, f, fr, fg, fb) {
    if (l > 1) l = 1;
    let r = (c & 255) * l, g = ((c >>> 8) & 255) * l, b = ((c >>> 16) & 255) * l;
    if (f > 0) { r += (fr - r) * f; g += (fg - g) * f; b += (fb - b) * f; }
    return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0;
  }

  // walk the grid from (x, y) along angle a until a solid tile; returns distance and what was hit
  function hit(S, x, y, a, max = 64) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let mx = Math.floor(x), my = Math.floor(y);
    const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy), sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
    let tx = (dx < 0 ? x - mx : mx + 1 - x) * ddx, ty = (dy < 0 ? y - my : my + 1 - y) * ddy, side = 0;
    for (let i = 0; i < 256; i++) {
      if (tx < ty) { tx += ddx; mx += sx; side = 0; } else { ty += ddy; my += sy; side = 1; }
      const t = S.tile(mx, my);
      if (t && !(S.see && S.see(t))) { const d = side ? ty - ddy : tx - ddx; return {d: Math.min(d, max), tile: t, mx, my, side}; }
      if ((side ? ty - ddy : tx - ddx) > max) break;
    }
    return {d: max, tile: 0};
  }
  function los(S, ax, ay, bx, by) { return hit(S, ax, ay, Math.atan2(by - ay, bx - ax), 999).d >= Math.hypot(bx - ax, by - ay) - .05; }

  function render(R, cam, S) {
    const {w: RW, h: RH, px, zbuf, col} = R;
    const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), fov = cam.fov || .66, plX = -dirY * fov, plY = dirX * fov;
    const proj = (RW / 2) / fov, hz = Math.round(RH / 2 + (cam.bob || 0)), light = S.light || (d => 1 / (1 + d * .08));
    const fogC = S.fogColor ? rgb(hex(S.fogColor)) : [0, 0, 0], fogD = S.fogDensity || 0;
    const [fr, fg, fb] = fogC, fogAt = d => fogD ? 1 - Math.exp(-d * fogD) : 0;
    for (let x = 0; x < RW; x++) col[x] = S.beam ? S.beam(2 * x / RW - 1) : 0;
    const extra = S.beamFall || (d => 1 / (1 + d * d * .05));
    // floor and ceiling (or sky) by rows
    const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
    const ftex = S.floorTex, ctex = S.ceilTex, fcol = S.floorColor ? hex(S.floorColor) : 0, ccol = S.ceilColor ? hex(S.ceilColor) : 0;
    for (let y = 0; y < RH; y++) {
      const below = y > hz, p = below ? y - hz : hz - y;
      if (p === 0) { px.fill(fcol || 0xff000000, y * RW, y * RW + RW); continue; }
      const rowD = (proj * .5) / p, sxr = rowD * (rx1 - rx0) / RW, syr = rowD * (ry1 - ry0) / RW;
      let fx = cam.x + rowD * rx0, fy = cam.y + rowD * ry0;
      const base = light(rowD), f = fogAt(rowD), ex = extra(rowD), row = y * RW;
      if (!below && S.sky) { const c = S.sky(y / hz); for (let x = 0; x < RW; x++) px[row + x] = c; continue; }
      const tex = below ? ftex : ctex, flat = below ? fcol : ccol;
      for (let x = 0; x < RW; x++) {
        const l = (base + col[x] * ex) * (below ? 1 : .75);
        let c = flat;
        const tt = below && S.floorAt ? S.floorAt(Math.floor(fx), Math.floor(fy)) || tex : tex;
        if (tt) c = tt.data[(((fy - Math.floor(fy)) * tt.h) | 0) * tt.w + (((fx - Math.floor(fx)) * tt.w) | 0)];
        px[row + x] = shadeFog(c, l, f, fr, fg, fb);
        fx += sxr; fy += syr;
      }
    }
    // walls
    for (let x = 0; x < RW; x++) {
      const camX = 2 * x / RW - 1, rdx = dirX + plX * camX, rdy = dirY + plY * camX;
      let mx = Math.floor(cam.x), my = Math.floor(cam.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy), stx = rdx < 0 ? -1 : 1, sty = rdy < 0 ? -1 : 1;
      let sdx = (rdx < 0 ? cam.x - mx : mx + 1 - cam.x) * ddx, sdy = (rdy < 0 ? cam.y - my : my + 1 - cam.y) * ddy, side = 0, t = 0;
      for (let i = 0; i < 128; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
        t = S.tile(mx, my);
        if (t && !(S.see && S.see(t))) break;
      }
      const perp = Math.max(.05, side ? sdy - ddy : sdx - ddx);
      zbuf[x] = perp;
      const lh = proj / perp, top = hz - lh / 2, y0 = Math.max(0, Math.floor(top)), y1 = Math.min(RH - 1, Math.floor(hz + lh / 2));
      const tex = S.wallTex(t, mx, my, side);
      let wx = side ? cam.x + perp * rdx : cam.y + perp * rdy; wx -= Math.floor(wx);
      if (!tex.data) { for (let y = y0; y <= y1; y++) px[y * RW + x] = tex; continue; } // a flat colour, e.g. a glowing exit
      let tx = (wx * tex.w) | 0; if ((!side && rdx > 0) || (side && rdy < 0)) tx = tex.w - tx - 1;
      const l = (light(perp) + col[x] * extra(perp)) * (side ? .8 : 1), f = fogAt(perp), step = tex.h / lh;
      let tp = (y0 - top) * step;
      for (let y = y0; y <= y1; y++) { px[y * RW + x] = shadeFog(tex.data[((tp | 0) % tex.h) * tex.w + tx], l, f, fr, fg, fb); tp += step; }
    }
    // sprites, far to near
    const sprites = S.sprites || [];
    for (const s of sprites) s._d = (s.x - cam.x) ** 2 + (s.y - cam.y) ** 2;
    sprites.sort((a, b) => b._d - a._d);
    const inv = 1 / (plX * dirY - dirX * plY);
    for (const s of sprites) {
      const tex = s.tex; if (!tex) continue;
      const sx = s.x - cam.x, sy = s.y - cam.y, tX = inv * (dirY * sx - dirX * sy), tY = inv * (-plY * sx + plX * sy);
      if (tY < .12) continue;
      const unit = proj / tY, hgt = unit * (s.scale || 1), wid = hgt * (tex.w / tex.h) * (s.wide || 1);
      const scx = (RW / 2) * (1 + tX / tY), bottom = hz + unit / 2 - (s.lift || 0) * unit;
      const ys = Math.floor(bottom - hgt), xs = Math.floor(scx - wid / 2);
      const l0 = light(tY), f = fogAt(tY), ex = extra(tY);
      const x0 = Math.max(0, xs), x1 = Math.min(RW, xs + wid), y0 = Math.max(0, ys), y1 = Math.min(RH, ys + hgt);
      for (let x = x0; x < x1; x++) {
        if (tY >= zbuf[x]) continue;
        const tx = Math.min(tex.w - 1, ((x - xs) * tex.w / wid) | 0), l = Math.max(s.glow || 0, l0 + col[x] * ex);
        for (let y = y0; y < y1; y++) {
          const c = tex.data[Math.min(tex.h - 1, ((y - ys) * tex.h / hgt) | 0) * tex.w + tx];
          if ((c >>> 24) < 128) continue;
          px[y * RW + x] = S.emissive && S.emissive(c) ? c : shadeFog(c, s.tint ? l * s.tint : l, f, fr, fg, fb);
        }
      }
      s._screen = {x: scx, y: ys, w: wid, h: hgt, d: tY};
    }
    R.ctx.putImageData(R.img, 0, 0);
    return R.canvas;
  }

  // paint a texture once with canvas drawing calls, then keep its pixels
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); fn(g, w, h);
    return {w, h, data: new Uint32Array(g.getImageData(0, 0, w, h).data.buffer)};
  }

  window.Ray = {create, render, hit, los, paint, hex, pack};
})();

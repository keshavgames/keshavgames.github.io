(() => {
  // A drawing studio: brushes, colours, a rainbow brush, stamps, fill bucket, undo. Your picture is kept in this browser.
  const W = 800, H = 560, CX = 110, CY = 20, CW = 670, CH = 470;
  const COLORS = ['#1a1a1a', '#ffffff', '#ff4b4b', '#ff9f43', '#ffd84a', '#5ee66b', '#2ec4b6', '#4aa8ff', '#7a5ae8', '#ff7bd0', '#8a5a32', '#9aa0aa'];
  const TOOLS = ['brush', 'rainbow', 'spray', 'stamp', 'fill', 'eraser'];
  const STAMPS = ['★', '♥', '☀', '✿', '☁', '⚡', '♪', '●'];
  const SAVE = 'gamebox-paint';

  GameBox.register({
    id: 'paint', title: 'Paint Studio', genre: 'Casual', kind: 'Drawing', w: W, h: H, assets: [], thumb: 'jpg', cursor: 'crosshair',
    hint: 'Pick a tool and a colour on the left, then draw! Your picture saves by itself.',
    desc: 'A big canvas and a box of tools: brushes in three sizes, a rainbow brush, a spray can, stamps like stars and hearts, a paint bucket and an eraser. Twelve colours, undo for oops moments, and your picture is kept in this browser for next time.',
    controls: [['Drag on the canvas', 'Draw'], ['Click a tool or colour', 'Pick it'], ['Z', 'Undo'], ['C', 'Clear']],
    info() { return `${this.tool} · size ${this.size}`; },
    init() {
      if (!this.cv) { this.cv = document.createElement('canvas'); this.cv.width = CW; this.cv.height = CH; }
      const x = this.cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, CW, CH);
      try { const s = localStorage.getItem(SAVE); if (s) { const img = new Image(); img.onload = () => x.drawImage(img, 0, 0); img.src = s; } } catch {}
      this.tool = 'brush'; this.color = COLORS[2]; this.size = 10; this.stamp = 0; this.hist = []; this.last = null; this.hue = 0; this.saveT = 0;
    },
    snapshot() { this.hist.push(this.cv.getContext('2d').getImageData(0, 0, CW, CH)); if (this.hist.length > 20) this.hist.shift(); },
    persist() { try { localStorage.setItem(SAVE, this.cv.toDataURL('image/png')); } catch {} },
    paintAt(x, y, from) {
      const c = this.cv.getContext('2d'); c.lineCap = 'round'; c.lineJoin = 'round';
      if (this.tool === 'brush' || this.tool === 'eraser' || this.tool === 'rainbow') {
        if (this.tool === 'rainbow') { this.hue = (this.hue + 4) % 360; c.strokeStyle = `hsl(${this.hue},90%,55%)`; } else c.strokeStyle = this.tool === 'eraser' ? '#fff' : this.color;
        c.lineWidth = this.tool === 'eraser' ? this.size * 2.5 : this.size; c.beginPath(); c.moveTo(from ? from[0] : x, from ? from[1] : y); c.lineTo(x, y); c.stroke();
      }
      if (this.tool === 'spray') { c.fillStyle = this.color; for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * this.size * 2.2; c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 1.6); } }
    },
    fill(x, y) {
      const c = this.cv.getContext('2d'), img = c.getImageData(0, 0, CW, CH), d = new Uint32Array(img.data.buffer), i0 = (y | 0) * CW + (x | 0), from = d[i0];
      const hex = this.color, to = (0xff000000 | (parseInt(hex.slice(5, 7), 16) << 16) | (parseInt(hex.slice(3, 5), 16) << 8) | parseInt(hex.slice(1, 3), 16)) >>> 0;
      if (from === to) return; const st = [i0], near = v => { const a = v & 255, b = from & 255, e = (v >> 8) & 255, f = (from >> 8) & 255, g2 = (v >> 16) & 255, h = (from >> 16) & 255; return Math.abs(a - b) + Math.abs(e - f) + Math.abs(g2 - h) < 60; };
      while (st.length) { const i = st.pop(); if (d[i] === to || !near(d[i])) continue; d[i] = to; const px = i % CW; if (px > 0) st.push(i - 1); if (px < CW - 1) st.push(i + 1); if (i >= CW) st.push(i - CW); if (i < CW * (CH - 1)) st.push(i + CW); }
      c.putImageData(img, 0, 0);
    },
    pointer(type, x, y) {
      const inCanvas = x > CX && x < CX + CW && y > CY && y < CY + CH, lx = x - CX, ly = y - CY;
      if (type === 'down') {
        TOOLS.forEach((t, i) => { if (x > 12 && x < 92 && y > 20 + i * 44 && y < 58 + i * 44) { this.tool = t; G.sfx('select', .4); } });
        COLORS.forEach((c, i) => { const bx = 14 + (i % 2) * 42, by = 300 + Math.floor(i / 2) * 38; if (x > bx && x < bx + 34 && y > by && y < by + 32) { this.color = c; if (this.tool === 'eraser') this.tool = 'brush'; G.sfx('click', .4); } });
        [5, 10, 22].forEach((s, i) => { if (x > CX + i * 60 && x < CX + i * 60 + 50 && y > H - 54 && y < H - 14) this.size = s; });
        STAMPS.forEach((s, i) => { const bx = CX + 200 + i * 40; if (x > bx && x < bx + 34 && y > H - 54 && y < H - 14) { this.stamp = i; this.tool = 'stamp'; } });
        if (x > W - 150 && x < W - 84 && y > H - 54 && y < H - 14) this.undo();
        if (x > W - 76 && x < W - 12 && y > H - 54 && y < H - 14) this.clear();
        if (!inCanvas) return;
        this.snapshot();
        if (this.tool === 'fill') { this.fill(lx, ly); this.persist(); return; }
        if (this.tool === 'stamp') { const c = this.cv.getContext('2d'); c.fillStyle = this.color; c.font = `${this.size * 4 + 20}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(STAMPS[this.stamp], lx, ly); G.sfx('coin', .3); this.persist(); return; }
        this.last = [lx, ly]; this.paintAt(lx, ly);
      }
      if (type === 'move' && G.pointer.down && this.last && inCanvas) { this.paintAt(lx, ly, this.last); this.last = [lx, ly]; }
      if (type === 'up' && this.last) { this.last = null; this.persist(); }
    },
    undo() { const h = this.hist.pop(); if (h) { this.cv.getContext('2d').putImageData(h, 0, 0); this.persist(); G.sfx('click', .4); } },
    clear() { this.snapshot(); const c = this.cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, CW, CH); this.persist(); G.sfx('swing'); },
    key(k) { if (k === 'z') this.undo(); if (k === 'c') this.clear(); },
    update() {},
    draw(ctx) {
      G.clear('#2a2440'); G.rr(CX - 6, CY - 6, CW + 12, CH + 12, 10, '#4a4068'); ctx.drawImage(this.cv, CX, CY);
      const icons = {brush: '🖌', rainbow: '🌈', spray: '💨', stamp: STAMPS[this.stamp], fill: '🪣', eraser: '🧽'};
      TOOLS.forEach((t, i) => { G.rr(12, 20 + i * 44, 80, 38, 10, this.tool === t ? '#ffcf5c' : '#3a3458'); G.text(`${icons[t]} ${t}`, 52, 45 + i * 44, {size: 12, align: 'center', weight: 800, color: this.tool === t ? '#2a2010' : '#fff'}); });
      COLORS.forEach((c, i) => { const bx = 14 + (i % 2) * 42, by = 300 + Math.floor(i / 2) * 38; G.rr(bx, by, 34, 32, 8, c); if (this.color === c) { ctx.strokeStyle = '#ffcf5c'; ctx.lineWidth = 3; ctx.strokeRect(bx - 2, by - 2, 38, 36); } });
      [5, 10, 22].forEach((s, i) => { G.rr(CX + i * 60, H - 54, 50, 40, 10, this.size === s ? '#ffcf5c' : '#3a3458'); G.circle(CX + i * 60 + 25, H - 34, s / 2 + 1, this.size === s ? '#2a2010' : '#fff'); });
      STAMPS.forEach((s, i) => { const bx = CX + 200 + i * 40; G.rr(bx, H - 54, 34, 40, 8, this.tool === 'stamp' && this.stamp === i ? '#ffcf5c' : '#3a3458'); G.text(s, bx + 17, H - 26, {size: 18, align: 'center', color: '#fff'}); });
      G.rr(W - 150, H - 54, 66, 40, 10, '#5a6a9a'); G.text('Undo', W - 117, H - 28, {size: 14, align: 'center', weight: 800, color: '#fff'});
      G.rr(W - 76, H - 54, 64, 40, 10, '#c44a5a'); G.text('Clear', W - 44, H - 28, {size: 14, align: 'center', weight: 800, color: '#fff'});
    }
  });
})();

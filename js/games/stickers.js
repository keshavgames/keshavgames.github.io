(() => {
  // Make scenes with stickers of all the Blender characters and vehicles from the arcade. Saved in this browser.
  const W = 800, H = 540, SAVE = 'gamebox-stickers';
  const PACKS = {
    Monsters: ['mon_emberpup', 'mon_puddlet', 'mon_sproutle', 'mon_pebblor', 'mon_voltle', 'mon_frostling', 'mon_gloomp', 'mon_bloomoth'],
    Rides: ['kart_red', 'kart_blue', 'boat_yellow', 'plane_green', 'plane_red', 'tank_hull_purple', 'rally_orange_c', 'drag_yellow'],
    Friends: ['kid_idle', 'kid_jump', 'bot_helper_idle', 'bot_invader_idle', 'soldier_teal_front_0', 'soldier_pink_front_0', 'doll_still', 'ringmaster_grin'],
    Things: ['basketball', 'bowlball', 'pin', 'baseball', 'lantern_on', 'tree_pine', 'axe', 'puck']
  };
  const SCENES = ['Meadow', 'Space', 'Ocean', 'City'];
  const ASSETS = Object.values(PACKS).flat().map(s => `img/${s}.png`);

  GameBox.register({
    id: 'stickers', title: 'Sticker Scene', genre: 'Casual', kind: 'Sticker book', w: W, h: H, assets: ASSETS, thumb: 'jpg', cursor: 'pointer',
    hint: 'Drag stickers from the tray onto the scene. Scroll or press + and - to resize, R to turn, Delete to remove.',
    desc: 'A sticker book full of the characters and vehicles from around Game Box: monsters, karts, planes, robots, dolls and more. Pick a background, drag stickers onto it, make them bigger or smaller, turn and flip them, and build your own little world. Your scene is saved for next time.',
    controls: [['Drag', 'Place or move a sticker'], ['+ / - / mouse wheel', 'Resize the selected sticker'], ['R / F', 'Turn / flip it'], ['Delete', 'Remove it']],
    info() { return `${this.placed.length} stickers · ${SCENES[this.scene]}`; },
    init() { let s = null; try { s = JSON.parse(localStorage.getItem(SAVE)); } catch {} this.placed = s?.placed || []; this.scene = s?.scene || 0; this.pack = 'Monsters'; this.sel = -1; this.drag = null; this.t = 0; },
    persist() { try { localStorage.setItem(SAVE, JSON.stringify({placed: this.placed, scene: this.scene})); } catch {} },
    pointer(type, x, y) {
      if (type === 'down') {
        Object.keys(PACKS).forEach((p, i) => { if (x > 20 + i * 110 && x < 120 + i * 110 && y > H - 132 && y < H - 104) { this.pack = p; G.sfx('click', .3); } });
        SCENES.forEach((s, i) => { if (x > W - 380 + i * 92 && x < W - 296 + i * 92 && y > H - 132 && y < H - 104) { this.scene = i; this.persist(); G.sfx('click', .3); } });
        PACKS[this.pack].forEach((s, i) => { const bx = 20 + i * 96; if (x > bx && x < bx + 88 && y > H - 96 && y < H - 8) { this.placed.push({s, x: 400, y: 220, size: 120, rot: 0, flip: 1}); this.sel = this.placed.length - 1; this.drag = {dx: 0, dy: 0}; G.sfx('select', .4); } });
        if (y < H - 140) { this.sel = -1; for (let i = this.placed.length - 1; i >= 0; i--) { const p = this.placed[i]; if (Math.abs(x - p.x) < p.size / 2 && Math.abs(y - p.y) < p.size / 2) { this.sel = i; this.drag = {dx: x - p.x, dy: y - p.y}; const [it] = this.placed.splice(i, 1); this.placed.push(it); this.sel = this.placed.length - 1; break; } } }
      }
      if (type === 'move' && this.drag && this.sel >= 0) { const p = this.placed[this.sel]; p.x = Math.max(0, Math.min(W, x - this.drag.dx)); p.y = Math.max(0, Math.min(H - 140, y - this.drag.dy)); }
      if (type === 'up') { if (this.drag) this.persist(); this.drag = null; }
    },
    key(k) {
      const p = this.placed[this.sel]; if (!p) return;
      if (k === '+' || k === '=') p.size = Math.min(320, p.size * 1.12); if (k === '-') p.size = Math.max(30, p.size / 1.12);
      if (k === 'r') p.rot += Math.PI / 8; if (k === 'f') p.flip *= -1;
      if (k === 'Delete' || k === 'Backspace') { this.placed.splice(this.sel, 1); this.sel = -1; G.sfx('swing'); }
      this.persist();
    },
    update(dt) { this.t += dt; },
    scenery(ctx) {
      const s = this.scene, h = H - 140;
      if (s === 0) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8ad0ff'); g.addColorStop(1, '#d8f0ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, h); G.circle(680, 70, 40, '#ffe27a'); ctx.fillStyle = '#7ccd5a'; ctx.beginPath(); ctx.moveTo(0, h); ctx.quadraticCurveTo(200, h - 140, 420, h - 60); ctx.quadraticCurveTo(620, h - 150, W, h - 70); ctx.lineTo(W, h); ctx.fill(); for (let i = 0; i < 20; i++) G.circle((i * 97) % W, h - 20 - (i % 3) * 10, 4, ['#ff7bd0', '#ffe27a', '#fff'][i % 3]); }
      if (s === 1) { ctx.fillStyle = '#0c0a24'; ctx.fillRect(0, 0, W, h); for (let i = 0; i < 80; i++) G.circle((i * 137) % W, (i * 71) % h, 1 + (i % 3) * .6, `rgba(255,255,255,${.4 + .4 * Math.sin(this.t * 2 + i)})`); G.circle(620, 110, 60, '#c86a4a'); G.circle(600, 95, 12, 'rgba(0,0,0,.2)'); G.circle(150, h - 10, 140, '#8a8aa8'); }
      if (s === 2) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2ab0e8'); g.addColorStop(1, '#0a4a8a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, h); for (let i = 0; i < 18; i++) G.circle((i * 113 + this.t * 10) % W, (h - (this.t * 30 + i * 40) % h), 4, 'rgba(255,255,255,.35)'); ctx.fillStyle = '#e8d8a0'; ctx.fillRect(0, h - 40, W, 40); for (let i = 0; i < 6; i++) { ctx.fillStyle = '#3aa85a'; ctx.fillRect(60 + i * 140, h - 120, 10, 80); } }
      if (s === 3) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffb27a'); g.addColorStop(1, '#ffe0b0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, h); for (let i = 0; i < 9; i++) { const bh = 120 + (i * 53) % 160; G.rr(i * 92, h - bh - 40, 80, bh, 6, ['#5a6a8a', '#7a5a8a', '#4a7a8a'][i % 3]); for (let y = h - bh - 30; y < h - 60; y += 22) for (let x = i * 92 + 10; x < i * 92 + 70; x += 20) { ctx.fillStyle = 'rgba(255,240,160,.7)'; ctx.fillRect(x, y, 10, 12); } } ctx.fillStyle = '#4a4a54'; ctx.fillRect(0, h - 40, W, 40); }
    },
    draw(ctx) {
      this.scenery(ctx);
      this.placed.forEach((p, i) => { const img = G.img(`img/${p.s}.png`); if (!img.complete || !img.naturalWidth) return; const k = p.size / Math.max(img.naturalWidth, img.naturalHeight); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.flip, 1); ctx.drawImage(img, -img.naturalWidth * k / 2, -img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); ctx.restore(); if (i === this.sel) { ctx.strokeStyle = '#ffcf5c'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.setLineDash([]); } });
      G.rr(0, H - 140, W, 140, 0, '#2a2440');
      Object.keys(PACKS).forEach((p, i) => { G.rr(20 + i * 110, H - 132, 100, 28, 8, this.pack === p ? '#ffcf5c' : '#3a3458'); G.text(p, 70 + i * 110, H - 113, {size: 13, align: 'center', weight: 800, color: this.pack === p ? '#2a2010' : '#fff'}); });
      SCENES.forEach((s, i) => { G.rr(W - 380 + i * 92, H - 132, 84, 28, 8, this.scene === i ? '#5ee6c1' : '#3a3458'); G.text(s, W - 338 + i * 92, H - 113, {size: 13, align: 'center', weight: 800, color: this.scene === i ? '#1a2a24' : '#fff'}); });
      PACKS[this.pack].forEach((s, i) => { const bx = 20 + i * 96, img = G.img(`img/${s}.png`); G.rr(bx, H - 96, 88, 88, 12, '#3a3458'); if (img.complete && img.naturalWidth) { const k = 76 / Math.max(img.naturalWidth, img.naturalHeight); ctx.drawImage(img, bx + 44 - img.naturalWidth * k / 2, H - 52 - img.naturalHeight * k / 2, img.naturalWidth * k, img.naturalHeight * k); } });
      if (!this.placed.length) G.text('Drag a sticker up into the picture!', W / 2, 60, {size: 22, align: 'center', display: true, color: '#fff', shadow: true});
    }
  });
})();

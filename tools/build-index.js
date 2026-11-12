// Regenerates the game <script> tags in index.html from the files in js/games.
// Featured games come first; everything else follows alphabetically.  Usage: node tools/build-index.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FEATURED = ['strike', 'royale', 'horror', 'shell', 'rpg', 'racer', 'kart', 'platformer', 'stealth', 'tamer', 'dressup', 'minigolf'];
const ids = fs.readdirSync(path.join(root, 'js/games')).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const order = [...FEATURED.filter(id => ids.includes(id)), ...ids.filter(id => !FEATURED.includes(id)).sort()];
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tags = order.map(id => `<script src="js/games/${id}.js"></script>`).join('\n');
html = html.replace(/(<script src="js\/games\/[^"]+"><\/script>\n?)+/, tags + '\n');
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log(`${order.length} games listed`);

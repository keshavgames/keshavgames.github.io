// Online rooms over WebRTC, using PeerJS and its free public broker to introduce the two browsers.
// The host runs the game; friends send their key presses and receive the game state.
(() => {
  const SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let loading = null;
  const load = () => loading ||= new Promise((res, rej) => {
    if (window.Peer) return res();
    const s = document.createElement('script'); s.src = SRC; s.onload = res;
    s.onerror = () => { loading = null; rej(new Error('PeerJS failed to load')); };
    document.head.append(s);
  });
  const newCode = () => Array.from({length: 5}, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  const idFor = (game, code) => `gamebox-${game}-${code}`.toLowerCase();
  const opened = (peer, ms = 12000) => new Promise((res, rej) => {
    peer.on('open', () => res(peer)); peer.on('error', rej); setTimeout(() => rej(new Error('timeout')), ms);
  });

  async function host(game, {onJoin, onLeave, onMessage} = {}) {
    await load();
    let err;
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newCode();
      try {
        const peer = await opened(new window.Peer(idFor(game, code)));
        const net = {
          role: 'host', code, peer, peers: [], inputs: {},
          send(msg, to) { for (const c of net.peers) if ((!to || c.peer === to) && c.open) c.send(msg); },
          close() { try { peer.destroy(); } catch {} }
        };
        peer.on('connection', conn => {
          conn.on('open', () => {
            if (net.peers.length >= 7) { conn.close(); return; }
            net.peers.push(conn); net.inputs[conn.peer] = {keys: {}, pointer: {x: 0, y: 0, down: false}, index: net.peers.length};
            conn.send({t: 'hello', index: net.peers.length});
            onJoin?.(conn.peer);
          });
          conn.on('data', m => {
            const inp = net.inputs[conn.peer];
            if (!inp) return;
            if (m.t === 'key') inp.keys[m.k] = m.down;
            else if (m.t === 'ptr') Object.assign(inp.pointer, m.p);
            else onMessage?.(m, conn.peer);
          });
          conn.on('close', () => { net.peers = net.peers.filter(c => c !== conn); delete net.inputs[conn.peer]; onLeave?.(conn.peer); });
        });
        return net;
      } catch (e) { err = e; }
    }
    throw err;
  }

  async function join(game, code, {onMessage, onLeave} = {}) {
    await load();
    const peer = await opened(new window.Peer());
    const conn = peer.connect(idFor(game, code));
    await new Promise((res, rej) => { conn.on('open', res); conn.on('error', rej); peer.on('error', rej); setTimeout(() => rej(new Error('timeout')), 12000); });
    const net = {
      role: 'client', code, peer, conn, index: 1, peers: [conn],
      send(msg) { if (conn.open) conn.send(msg); },
      close() { try { peer.destroy(); } catch {} }
    };
    conn.on('data', m => { if (m.t === 'hello') net.index = m.index; else onMessage?.(m); });
    conn.on('close', () => onLeave?.());
    return net;
  }

  window.Net = {host, join};
})();

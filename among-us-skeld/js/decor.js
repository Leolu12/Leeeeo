/* Desenho da Skeld: pisos, paredes, cantos chanfrados, portas, móveis, consoles das estações, dutos e a camada animada
   (reator, turbinas, janelas, hologramas, monitores, plantas...). Os móveis seguem a lista de js/props.js: o que é
   desenhado como sólido é o que colide. Estilo: contorno escuro grosso como os bonecos, luz de cima à esquerda,
   objetos em visão 3/4 desenhados dentro da própria área no chão (nada "flutua" sobre quem passa atrás). */
(function () {
  'use strict';
  const AU = window.AU;
  const M = AU.Map;
  const W = M.W, H = M.H;
  const OUT = '#0b0d12';

  const ROOM = {
    cafeteria: { floor: ['#89929f', '#818a98', 'tiles2'], accent: '#7fa2d8' },
    medbay: { floor: ['#5f949a', '#588b91', 'tiles'], accent: '#48d6b0' },
    electrical: { floor: ['#4c493d', '#45423a', 'grate'], accent: '#f0c93a' },
    storage: { floor: ['#6b5f48', '#645842', 'plates2'], accent: '#ee8f3a' },
    reactor: { floor: ['#33405a', '#2f3b53', 'plates'], accent: '#4aa3ff' },
    upperEngine: { floor: ['#4d5568', '#485062', 'plates'], accent: '#ff9a3c' },
    lowerEngine: { floor: ['#4d5568', '#485062', 'plates'], accent: '#ff9a3c' },
    security: { floor: ['#40475a', '#3b4254', 'carpet'], accent: '#4be38b' },
    admin: { floor: ['#3f4f6c', '#3a4965', 'carpet'], accent: '#3ae08a' },
    weapons: { floor: ['#454c66', '#414760', 'plates'], accent: '#ef5350' },
    o2: { floor: ['#4c6f63', '#46675c', 'tiles'], accent: '#78d36a' },
    navigation: { floor: ['#384866', '#344360', 'plates'], accent: '#5fd6ff' },
    shields: { floor: ['#484e6e', '#434968', 'hexes'], accent: '#8fa6ff' },
    comms: { floor: ['#474e63', '#42495d', 'tiles'], accent: '#b07cff' },
  };
  const CORR_FLOOR = ['#3c4353', '#394050'];
  const WALL = '#141925', FACE_TOP = '#5e6b89', FACE_BOT = '#39435c', CAP = '#8a98b8';
  const SHIELD_FX = { x: 98.6, y: 61.2 };
  const LABELS = {
    cafeteria: [69, 23.4], upperEngine: [17.5, 18.4], lowerEngine: [17.5, 52.6], reactor: [10, 31.8],
    security: [27.5, 38.3], medbay: [46.5, 32.6], electrical: [46, 46.9], storage: [63.5, 54.2],
    admin: [80.5, 43.2], o2: [92, 29.8], weapons: [100, 15.6], navigation: [123.5, 42.6],
    shields: [103.8, 63.8], comms: [81.5, 68.6],
  };
  /* posição da câmera de segurança presa na parede (a luz vermelha acende em cima dela) */
  const camPos = (cam) => {
    let y = cam.y;
    while (y > cam.y - 4 && M.isFloor(Math.floor(cam.x), Math.floor(y - 1))) y -= 1;
    return { x: cam.x, y: Math.floor(y) - 0.35 };
  };

  /* elementos animados, montados junto com o mapa */
  const LIVE = [];
  const live = (kind, x, y, o) => LIVE.push(Object.assign({ kind, x, y }, o || {}));

  /* ================= kit de desenho (coordenadas em tiles) ================= */
  function mkDraw(c, P) {
    const D = { c, P };
    const lw = Math.max(1.5, P * 0.065);
    D.lw = lw;
    D.path = (pts, close) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x * P, y * P) : c.moveTo(x * P, y * P)));
      if (close !== false) c.closePath();
    };
    D.rr = (x, y, w, h, r) => {
      c.beginPath();
      if (w < 0) {
        x += w;
        w = -w;
      }
      if (h < 0) {
        y += h;
        h = -h;
      }
      const rad = Math.max(0, Math.min((r == null ? 0.15 : r) * P, (w * P) / 2, (h * P) / 2));
      if (c.roundRect) c.roundRect(x * P, y * P, w * P, h * P, rad);
      else c.rect(x * P, y * P, w * P, h * P);
    };
    D.fs = (fill, stroke, w) => {
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke !== null) {
        c.strokeStyle = stroke || OUT;
        c.lineWidth = w || lw;
        c.lineJoin = 'round';
        c.stroke();
      }
    };
    D.box = (x, y, w, h, fill, stroke, r, w2) => {
      D.rr(x, y, w, h, r);
      D.fs(fill, stroke === undefined ? OUT : stroke, w2);
    };
    D.lin = (x0, y0, x1, y1, stops) => {
      const g = c.createLinearGradient(x0 * P, y0 * P, x1 * P, y1 * P);
      stops.forEach(([o, col]) => g.addColorStop(o, col));
      return g;
    };
    D.rad = (x, y, r0, r1, stops) => {
      const g = c.createRadialGradient(x * P, y * P, r0 * P, x * P, y * P, r1 * P);
      stops.forEach(([o, col]) => g.addColorStop(o, col));
      return g;
    };
    D.circle = (x, y, r, fill, stroke, w) => {
      c.beginPath();
      c.arc(x * P, y * P, r * P, 0, Math.PI * 2);
      D.fs(fill, stroke === undefined ? OUT : stroke, w);
    };
    D.ellipse = (x, y, rx, ry, fill, stroke, w) => {
      c.beginPath();
      c.ellipse(x * P, y * P, rx * P, ry * P, 0, 0, Math.PI * 2);
      D.fs(fill, stroke === undefined ? OUT : stroke, w);
    };
    D.shadow = (x, y, rx, ry, a) => {
      c.fillStyle = `rgba(0,0,0,${a == null ? 0.28 : a})`;
      c.beginPath();
      c.ellipse(x * P, y * P, rx * P, ry * P, 0, 0, Math.PI * 2);
      c.fill();
    };
    D.rshadow = (x, y, w, h, a) => {
      c.fillStyle = `rgba(0,0,0,${a == null ? 0.26 : a})`;
      D.rr(x + 0.12, y + 0.16, w, h, 0.2);
      c.fill();
    };
    D.line = (x1, y1, x2, y2, color, w, cap) => {
      c.strokeStyle = color;
      c.lineWidth = (w || 0.1) * P;
      c.lineCap = cap || 'round';
      c.beginPath();
      c.moveTo(x1 * P, y1 * P);
      c.lineTo(x2 * P, y2 * P);
      c.stroke();
    };
    D.pipe = (pts, color, w) => {
      /* cano com contorno e brilho: largura em tiles */
      for (const [col, ww] of [[OUT, w + 0.1], [color, w], ['rgba(255,255,255,0.22)', w * 0.3]]) {
        c.strokeStyle = col;
        c.lineWidth = ww * P;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.beginPath();
        pts.forEach(([x, y], i) => (i ? c.lineTo(x * P, y * P) : c.moveTo(x * P, y * P)));
        c.stroke();
      }
    };
    D.glow = (x, y, r, color) => {
      c.fillStyle = D.rad(x, y, 0, r, [[0, color], [1, 'rgba(0,0,0,0)']]);
      c.fillRect((x - r) * P, (y - r) * P, 2 * r * P, 2 * r * P);
    };
    D.screen = (x, y, w, h, color, dark) => {
      D.box(x, y, w, h, dark || '#0d1522', OUT, 0.08);
      c.fillStyle = D.lin(x, y, x, y + h, [[0, color], [1, 'rgba(0,0,0,0.25)']]);
      D.rr(x + 0.07, y + 0.07, w - 0.14, h - 0.14, 0.05);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.16)';
      c.fillRect((x + 0.1) * P, (y + 0.1) * P, (w - 0.2) * P, Math.max(1, 0.05 * P));
    };
    D.led = (x, y, color, r) => {
      const [cr, cg, cb] = hexToRgb(color);
      D.glow(x, y, (r || 0.09) * 3, `rgba(${cr},${cg},${cb},0.35)`);
      D.circle(x, y, r || 0.09, color, OUT, Math.max(1, lw * 0.5));
    };
    D.bolt = (x, y) => {
      D.circle(x, y, 0.06, '#9aa6bd', 'rgba(0,0,0,0.5)', 1);
    };
    D.hazard = (x, y, w, h, a) => {
      c.save();
      D.rr(x, y, w, h, 0.05);
      c.clip();
      c.fillStyle = `rgba(242,196,48,${a || 1})`;
      c.fillRect(x * P, y * P, w * P, h * P);
      c.fillStyle = `rgba(20,20,24,${a || 1})`;
      const s = 0.32;
      for (let t = -h; t < w + h; t += s * 2) {
        c.beginPath();
        c.moveTo((x + t) * P, (y + h) * P);
        c.lineTo((x + t + s) * P, (y + h) * P);
        c.lineTo((x + t + s + h) * P, y * P);
        c.lineTo((x + t + h) * P, y * P);
        c.closePath();
        c.fill();
      }
      c.restore();
    };
    /* caixa em visão 3/4 dentro da área (x,y,w,h): tampa em cima, face da frente embaixo */
    D.box3 = (x, y, w, h, top, front, fh, r) => {
      D.rshadow(x, y, w, h);
      D.box(x, y, w, h, front, OUT, r == null ? 0.12 : r);
      D.box(x, y, w, h - fh, top, OUT, r == null ? 0.12 : r);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      D.rr(x + 0.08, y + 0.08, w - 0.16, Math.min(0.12, (h - fh) * 0.3), 0.05);
      c.fill();
    };
    /* cilindro em pé visto de cima em 3/4 (x,y = centro da base) */
    D.cyl = (x, y, r, hgt, side, top, stroke) => {
      D.shadow(x + 0.12, y + 0.1, r * 1.05, r * 0.45);
      c.beginPath();
      c.moveTo((x - r) * P, (y - hgt) * P);
      c.lineTo((x - r) * P, y * P);
      c.ellipse(x * P, y * P, r * P, r * 0.45 * P, 0, Math.PI, 0, true);
      c.lineTo((x + r) * P, (y - hgt) * P);
      c.closePath();
      c.fillStyle = D.lin(x - r, 0, x + r, 0, [[0, side], [0.35, lighten(side, 0.25)], [1, darken(side, 0.35)]]);
      c.fill();
      c.strokeStyle = stroke || OUT;
      c.lineWidth = lw;
      c.stroke();
      D.ellipse(x, y - hgt, r, r * 0.45, top, stroke || OUT);
    };
    D.text = (s, x, y, size, color, align, weight) => {
      c.font = `${weight || 800} ${size * P}px "Chakra Petch", system-ui, sans-serif`;
      c.textAlign = align || 'center';
      c.textBaseline = 'middle';
      c.fillStyle = color;
      c.fillText(s, x * P, y * P);
    };
    D.hex = (x, y, r, fill, stroke, w) => {
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = (x + Math.cos(a) * r) * P, py = (y + Math.sin(a) * r) * P;
        if (k) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
      D.fs(fill, stroke === undefined ? OUT : stroke, w);
    };
    D.stars = (x, y, w, h, n) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.65})`;
        const s = Math.random() < 0.15 ? 2.5 : 1.5;
        c.fillRect((x + Math.random() * w) * P, (y + Math.random() * h) * P, s, s);
      }
    };
    return D;
  }
  const hexToRgb = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const mix = (h, t, k) => {
    const [r, g, b] = hexToRgb(h);
    const f = (v) => Math.round(v + (t - v) * k);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  };
  const lighten = (h, k) => (h[0] === '#' ? mix(h, 255, k) : h);
  const darken = (h, k) => (h[0] === '#' ? mix(h, 0, k) : h);

  /* ================= pisos ================= */
  function floorTile(c, P, x, y, base, alt, kind) {
    const px = x * P, py = y * P;
    c.fillStyle = base;
    c.fillRect(px, py, P, P);
    const n = ((x * 928371 + y * 12377) % 97) / 97;
    if (kind === 'tiles') {
      if ((x + y) % 2) {
        c.fillStyle = alt;
        c.fillRect(px, py, P, P);
      }
      c.fillStyle = 'rgba(255,255,255,0.07)';
      c.fillRect(px + 1, py + 1, P - 2, Math.max(1, P * 0.05));
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.fillRect(px, py + P - 1, P, 1);
      c.fillRect(px + P - 1, py, 1, P);
    } else if (kind === 'tiles2') {
      /* lajotas grandes 2x2 com rejunte e brilho no canto */
      if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) {
        c.fillStyle = alt;
        c.fillRect(px, py, P, P);
      }
      c.fillStyle = 'rgba(0,0,0,0.14)';
      if (x % 2 === 1) c.fillRect(px + P - 1.5, py, 1.5, P);
      if (y % 2 === 1) c.fillRect(px, py + P - 1.5, P, 1.5);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      if (x % 2 === 0) c.fillRect(px, py, 1.5, P);
      if (y % 2 === 0) c.fillRect(px, py, P, 1.5);
    } else if (kind === 'plates' || kind === 'plates2') {
      /* chapas de metal 2x2 com rebites e sujeira */
      c.fillStyle = 'rgba(0,0,0,0.24)';
      if (x % 2 === 0) c.fillRect(px, py, 1.5, P);
      if (y % 2 === 0) c.fillRect(px, py, P, 1.5);
      c.fillStyle = 'rgba(255,255,255,0.07)';
      if (x % 2 === 0) c.fillRect(px + 1.5, py, 1, P);
      if (y % 2 === 0) c.fillRect(px, py + 1.5, P, 1);
      if (x % 2 === 0 && y % 2 === 0) {
        c.fillStyle = 'rgba(255,255,255,0.18)';
        c.fillRect(px + P * 0.18, py + P * 0.18, P * 0.08, P * 0.08);
        c.fillRect(px + P * 1.74, py + P * 0.18, P * 0.08, P * 0.08);
      }
      if (kind === 'plates2' && n < 0.18) {
        c.fillStyle = 'rgba(0,0,0,0.08)';
        c.beginPath();
        c.ellipse(px + P * 0.5, py + P * 0.5, P * 0.4, P * 0.25, n * 6, 0, Math.PI * 2);
        c.fill();
      }
    } else if (kind === 'grate') {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i < 4; i++) c.fillRect(px, py + (i + 0.5) * (P / 4), P, Math.max(1, P * 0.06));
      c.fillStyle = 'rgba(255,255,255,0.06)';
      for (let i = 0; i < 4; i++) c.fillRect(px, py + (i + 0.5) * (P / 4) - 1, P, 1);
      if (x % 2 === 0) {
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(px, py, 2, P);
      }
    } else if (kind === 'carpet') {
      c.fillStyle = 'rgba(255,255,255,0.03)';
      if ((x + y) % 2) c.fillRect(px, py, P, P);
      c.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 3; i++) c.fillRect(px + ((n * 7 + i * 3) % 1) * P, py + i * P * 0.33, P * 0.18, 1);
    } else if (kind === 'hexes') {
      c.strokeStyle = 'rgba(160,180,255,0.1)';
      c.lineWidth = 1;
      const r = P * 0.5;
      const cx = px + P / 2 + (y % 2) * P * 0.5, cy = py + P / 2;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const hx = cx + Math.cos(a) * r, hy = cy + Math.sin(a) * r;
        if (k) c.lineTo(hx, hy);
        else c.moveTo(hx, hy);
      }
      c.closePath();
      c.stroke();
    }
  }

  /* ================= construção do mapa ================= */
  function build(PX) {
    LIVE.length = 0;
    const cv = document.createElement('canvas');
    cv.width = W * PX;
    cv.height = H * PX;
    const c = cv.getContext('2d');
    const P = PX;
    const D = mkDraw(c, P);
    hull(D, c, P);

    /* piso */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      const a = M.AREAS[M.areaIdx[y * W + x]];
      if (a.kind === 'room') {
        const st = ROOM[a.id];
        floorTile(c, P, x, y, st.floor[0], st.floor[1], st.floor[2]);
      } else {
        c.fillStyle = (x + y) % 2 ? CORR_FLOOR[0] : CORR_FLOOR[1];
        c.fillRect(x * P, y * P, P, P);
        c.fillStyle = 'rgba(0,0,0,0.2)';
        if (x % 2 === 0) c.fillRect(x * P, y * P, 1.5, P);
        if (y % 2 === 0) c.fillRect(x * P, y * P, P, 1.5);
      }
    }
    corridorDetail(D, c, P);
    roomFloorDetail(D, c, P);
    /* luz de teto: cada sala mais clara no meio, mais escura perto das paredes */
    for (const r of M.ROOMS) {
      const [x, y, w, h] = r.rect;
      c.save();
      c.beginPath();
      c.rect(x * P, y * P, w * P, h * P);
      c.clip();
      c.fillStyle = D.rad(x + w / 2, y + h / 2, 0, Math.max(w, h) * 0.72, [[0, 'rgba(255,255,255,0.07)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.18)']]);
      c.fillRect(x * P, y * P, w * P, h * P);
      c.restore();
    }
    walls(D, c, P);
    for (const r of M.ROOMS) if (r.cut) drawCuts(D, c, P, r);
    doorFrames(D, c, P);
    wallDecor(D, c, P);
    drawProps(D, c, P);
    drawVents(D, c, P);
    for (const cam of M.CAMS) {
      const q = camPos(cam);
      D.box(q.x - 0.28, q.y - 0.25, 0.56, 0.36, '#2a303d', OUT, 0.08);
      D.box(q.x - 0.14, q.y + 0.05, 0.28, 0.24, '#1a1f29', OUT, 0.06);
      D.circle(q.x, q.y + 0.18, 0.08, '#4b0f14', null);
    }
    /* nomes das salas pintados no chão */
    for (const r of M.ROOMS) {
      const [lx, ly] = LABELS[r.id];
      D.text(r.name.toUpperCase(), lx, ly, 0.62, 'rgba(235,240,255,0.13)');
    }
    return cv;
  }

  /* ---------- corredores ---------- */
  function corridorDetail(D, c, P) {
    for (const cdr of M.CORRIDORS) {
      for (const [x, y, w, h] of cdr.rects) {
        const horiz = w >= h;
        /* faixas de guia amarelas tracejadas no meio */
        c.fillStyle = 'rgba(255,208,70,0.18)';
        if (horiz) for (let t = x + 0.3; t < x + w - 0.5; t += 1.2) c.fillRect(t * P, (y + h / 2 - 0.05) * P, 0.6 * P, 0.1 * P);
        else for (let t = y + 0.3; t < y + h - 0.5; t += 1.2) c.fillRect((x + w / 2 - 0.05) * P, t * P, 0.1 * P, 0.6 * P);
        /* grades de drenagem nas laterais */
        c.fillStyle = 'rgba(0,0,0,0.22)';
        if (horiz) {
          c.fillRect(x * P, (y + 0.08) * P, w * P, 0.22 * P);
          c.fillRect(x * P, (y + h - 0.3) * P, w * P, 0.22 * P);
        } else {
          c.fillRect((x + 0.08) * P, y * P, 0.22 * P, h * P);
          c.fillRect((x + w - 0.3) * P, y * P, 0.22 * P, h * P);
        }
        c.fillStyle = 'rgba(255,255,255,0.05)';
        if (horiz) for (let t = x; t < x + w; t += 0.25) {
          c.fillRect(t * P, (y + 0.1) * P, 1, 0.18 * P);
          c.fillRect(t * P, (y + h - 0.28) * P, 1, 0.18 * P);
        } else for (let t = y; t < y + h; t += 0.25) {
          c.fillRect((x + 0.1) * P, t * P, 0.18 * P, 1);
          c.fillRect((x + w - 0.28) * P, t * P, 0.18 * P, 1);
        }
      }
    }
  }

  /* ---------- detalhes pintados no chão das salas ---------- */
  function roomFloorDetail(D, c, P) {
    /* Cafeteria: anel de lajotas em volta da mesa do botão */
    const E = M.EMERGENCY;
    c.strokeStyle = 'rgba(255,255,255,0.12)';
    c.lineWidth = 0.14 * P;
    c.beginPath();
    c.arc(E.x * P, E.y * P, 3.6 * P, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.12)';
    c.lineWidth = 0.08 * P;
    c.beginPath();
    c.arc(E.x * P, E.y * P, 3.85 * P, 0, Math.PI * 2);
    c.stroke();
    /* Depósito: faixas de perigo marcando as passagens */
    for (const [x, y, w, h] of [[61.4, 44.4, 0.25, 11], [66.35, 44.4, 0.25, 11], [54.4, 55.4, 7, 0.25], [66.6, 55.4, 5.1, 0.25], [54.4, 60.35, 7, 0.25], [66.6, 60.35, 5.1, 0.25]]) D.hazard(x, y, w, h, 0.55);
    /* Reator: linhas de energia no piso até o núcleo */
    c.strokeStyle = 'rgba(80,170,255,0.22)';
    c.lineWidth = 0.08 * P;
    for (const [x2, y2] of [[13.5, 36], [6.4, 26.6], [6.4, 45.4]]) {
      c.beginPath();
      c.moveTo(6.4 * P, 36 * P);
      c.lineTo(x2 * P, y2 * P);
      c.stroke();
    }
    /* Elétrica: cabos grossos correndo pelo chão */
    D.pipe([[36.2, 41.2], [39.4, 41.2], [40.6, 42.4]], '#2c2a24', 0.2);
    D.pipe([[44.4, 44], [47.2, 44], [48.8, 44.6]], '#7a1f1f', 0.14);
    D.pipe([[42.5, 45.2], [42.5, 49.2], [44.2, 49.8]], '#1f3f7a', 0.14);
    /* Segurança/Admin: tapete na frente dos consoles */
    D.box(24, 29.3, 7, 2.3, 'rgba(20,40,30,0.35)', null, 0.3);
    D.box(77.4, 37.4, 6.2, 4.3, 'rgba(10,30,20,0.25)', null, 0.5);
    /* Navegação: faixas apontando para o para-brisa */
    c.strokeStyle = 'rgba(95,214,255,0.18)';
    c.lineWidth = 0.1 * P;
    for (let i = 0; i < 3; i++) {
      D.path([[125.5 + i * 1.6, 35.3], [126.3 + i * 1.6, 36], [125.5 + i * 1.6, 36.7]], false);
      c.stroke();
    }
    /* Escudos: brilho azul em volta do gerador */
    D.glow(SHIELD_FX.x, SHIELD_FX.y, 3.4, 'rgba(110,150,255,0.16)');
    /* MedBay: cruz no chão perto da entrada */
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(45.3 * P, 21.4 * P, 0.4 * P, 1.2 * P);
    c.fillRect(44.9 * P, 21.8 * P, 1.2 * P, 0.4 * P);
    /* O2: folhas caídas */
    for (let i = 0; i < 12; i++) {
      const x = 87.5 + Math.random() * 9, y = 24 + Math.random() * 7;
      c.fillStyle = `rgba(110,200,90,${0.18 + Math.random() * 0.2})`;
      c.beginPath();
      c.ellipse(x * P, y * P, 0.12 * P, 0.06 * P, Math.random() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }

  /* ---------- paredes ---------- */
  function areaOfWall(x, y) {
    /* a sala cujo piso encosta nesta parede (para a cor de destaque) */
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      if (M.isFloor(x + dx, y + dy)) return M.AREAS[M.areaIdx[(y + dy) * W + x + dx]];
    }
    return null;
  }
  /* altura da face da parede de cima: dois tiles quando há espaço acima (dá profundidade de sala), senão um */
  const faceH = (x, y) => (!M.isFloor(x, y - 1) && !M.isFloor(x, y - 2) && !M.isFloor(x - 1, y - 1) && !M.isFloor(x + 1, y - 1) ? 1.75 : 0.9);
  M.faceTop = (x, y) => y + 1 - faceH(Math.floor(x), Math.floor(y));
  /* contorno de uma área (sala com cantos chanfrados ou retângulo de corredor), em tiles */
  function areaPoly(a) {
    const out = [];
    for (const [x, y, w, h] of a.rects) {
      const ct = (a.kind === 'room' && a.cut) || {};
      const tl = ct.tl || 0, tr = ct.tr || 0, bl = ct.bl || 0, br = ct.br || 0;
      out.push([[x + tl, y], [x + w - tr, y], [x + w, y + tr], [x + w, y + h - br], [x + w - br, y + h], [x + bl, y + h], [x, y + h - bl], [x, y + tl]]);
    }
    return out;
  }
  function hull(D, c, P) {
    /* casco da nave: chapas lisas em volta das salas e corredores (as salas não flutuam no espaço) */
    const polys = [];
    for (const a of M.AREAS) polys.push(...areaPoly(a));
    const trace = (pts) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x * P, y * P) : c.moveTo(x * P, y * P)));
      c.closePath();
    };
    c.lineJoin = 'round';
    for (const [w, col] of [[5.6, '#4a5570'], [5.2, '#1c2230'], [3.4, '#262d3c']]) {
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = w * P;
      for (const pts of polys) {
        trace(pts);
        c.stroke();
        c.fill();
      }
    }
    /* linhas das chapas do casco */
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1.5;
    for (let x = 0; x < W; x += 3) {
      c.beginPath();
      c.moveTo(x * P, 0);
      c.lineTo(x * P, H * P);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < H; y += 3) {
      c.beginPath();
      c.moveTo(0, y * P);
      c.lineTo(W * P, y * P);
      c.stroke();
    }
    c.restore();
  }
  function walls(D, c, P) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (M.isFloor(x + dx, y + dy)) near = true;
      if (!near) continue;
      c.fillStyle = WALL;
      c.fillRect(x * P, y * P, P, P);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y) || !M.isFloor(x, y + 1)) continue;
      /* face da parede de cima (visão 3/4) */
      const fh = faceH(x, y), top = y + 1 - fh;
      const a = areaOfWall(x, y);
      const acc = a && a.kind === 'room' ? ROOM[a.id].accent : '#7a869e';
      c.fillStyle = WALL;
      c.fillRect(x * P, (top - 0.12) * P, P, (fh + 0.12) * P);
      c.fillStyle = D.lin(0, top, 0, y + 1, [[0, FACE_TOP], [1, FACE_BOT]]);
      c.fillRect(x * P, top * P, P, fh * P);
      c.fillStyle = CAP;
      c.fillRect(x * P, top * P, P, 0.07 * P);
      /* faixa de destaque da sala e rodapé */
      c.fillStyle = acc;
      c.globalAlpha = 0.8;
      c.fillRect(x * P, (y + 0.42) * P, P, 0.08 * P);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,0.08)';
      c.fillRect(x * P, (y + 0.5) * P, P, 0.03 * P);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(x * P, (y + 0.86) * P, P, 0.14 * P);
      if (fh > 1) {
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(x * P, (top + 0.55) * P, P, 0.05 * P);
      }
      if (x % 2 === 0) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(x * P, (top + 0.08) * P, Math.max(1, 0.05 * P), (fh - 0.22) * P);
        D.bolt(x + 0.18, top + 0.22);
        D.bolt(x + 0.18, y + 0.74);
      }
    }
    /* sombra da parede de cima no piso e contorno entre piso e parede */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      if (!M.isFloor(x, y - 1) && !M.isCutTile(x, y - 1)) {
        c.fillStyle = D.lin(0, y, 0, y + 0.55, [[0, 'rgba(0,0,0,0.32)'], [1, 'rgba(0,0,0,0)']]);
        c.fillRect(x * P, y * P, P, 0.55 * P);
      }
      if (!M.isFloor(x - 1, y) && !M.isCutTile(x - 1, y)) {
        c.fillStyle = D.lin(x, 0, x + 0.3, 0, [[0, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]);
        c.fillRect(x * P, y * P, 0.3 * P, P);
      }
      if (!M.isFloor(x + 1, y) && !M.isCutTile(x + 1, y)) {
        c.fillStyle = D.lin(x + 1, 0, x + 0.7, 0, [[0, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0)']]);
        c.fillRect((x + 0.7) * P, y * P, 0.3 * P, P);
      }
    }
    c.strokeStyle = OUT;
    c.lineWidth = Math.max(2, P * 0.1);
    c.lineCap = 'square';
    const seg = (x1, y1, x2, y2) => {
      c.beginPath();
      c.moveTo(x1 * P, y1 * P);
      c.lineTo(x2 * P, y2 * P);
      c.stroke();
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      if (!M.isFloor(x - 1, y) && !M.isCutTile(x - 1, y)) seg(x, y, x, y + 1);
      if (!M.isFloor(x + 1, y) && !M.isCutTile(x + 1, y)) seg(x + 1, y, x + 1, y + 1);
      if (!M.isFloor(x, y + 1) && !M.isCutTile(x, y + 1)) seg(x, y + 1, x + 1, y + 1);
      if (!M.isFloor(x, y - 1) && !M.isCutTile(x, y - 1)) seg(x, y, x + 1, y);
    }
  }

  /* ---------- cantos chanfrados: parede diagonal lisa (a mesma reta da visão e da colisão) ---------- */
  const WINDOWS = { navigation: true, weapons: true };
  function drawCuts(D, c, P, r) {
    const [x, y, w, h] = r.rect;
    const fl = ROOM[r.id].floor;
    const clipRoom = () => {
      c.beginPath();
      c.rect((x - 1) * P, (y - 1) * P, (w + 2) * P, (h + 2) * P);
      for (let ty = y - 1; ty <= y + h; ty++) for (let tx = x - 1; tx <= x + w; tx++) {
        if (!M.isFloor(tx, ty)) continue;
        const a = M.AREAS[M.areaIdx[ty * W + tx]];
        if (a !== r) c.rect(tx * P, ty * P, P, P);
      }
      c.clip('evenodd');
    };
    for (const key of ['tl', 'tr', 'bl', 'br']) {
      const k = r.cut[key];
      if (!k) continue;
      const right = key[1] === 'r', bottom = key[0] === 'b';
      const X = (du) => (right ? x + w - du : x + du) * P;
      const Y = (dv) => (bottom ? y + h - dv : y + dv) * P;
      const poly = (pts) => {
        c.beginPath();
        pts.forEach(([du, dv], i) => (i ? c.lineTo(X(du), Y(dv)) : c.moveTo(X(du), Y(dv))));
        c.closePath();
      };
      const band = (lo, hi) => poly([[hi + 1, -1], [lo + 1, -1], [-1, lo + 1], [-1, hi + 1]]);
      const a = k + 0.5, b = k - 2.05;
      c.save();
      clipRoom();
      c.save();
      poly([[a, 0], [k + 1.05, 0], [0, k + 1.05], [0, a]]);
      c.clip();
      for (let i = 0; i < k; i++) {
        const j = k - 1 - i;
        const tx = right ? x + w - 1 - i : x + i, ty = bottom ? y + h - 1 - j : y + j;
        floorTile(c, P, tx, ty, fl[0], fl[1], fl[2]);
      }
      c.restore();
      band(b, a);
      c.fillStyle = WALL;
      c.fill();
      if (WINDOWS[r.id]) {
        band(b + 0.3, a - (bottom ? 0.3 : 0.95));
        c.fillStyle = '#040810';
        c.fill();
        c.save();
        c.clip();
        for (let i = 0; i < k * 6; i++) {
          const t = Math.random() * (k + 2) - 1, off = b + 0.4 + Math.random() * 1.4;
          c.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.6})`;
          c.fillRect(X(t) - 1, Y(off - t) - 1, 2, 2);
        }
        c.restore();
        band(b + 0.3, a - (bottom ? 0.3 : 0.95));
        c.strokeStyle = '#5d6f96';
        c.lineWidth = Math.max(2, P * 0.08);
        c.stroke();
      }
      if (!bottom) {
        band(a - 1.6, a);
        c.fillStyle = FACE_BOT;
        c.fill();
        band(a - 1.6, a - 0.9);
        c.fillStyle = FACE_TOP;
        c.fill();
        band(a - 1.6, a - 1.52);
        c.fillStyle = CAP;
        c.fill();
        band(a - 0.44, a - 0.37);
        c.fillStyle = ROOM[r.id].accent;
        c.globalAlpha = 0.75;
        c.fill();
        c.globalAlpha = 1;
        band(a - 0.14, a);
        c.fillStyle = 'rgba(0,0,0,0.35)';
        c.fill();
      }
      c.strokeStyle = OUT;
      c.lineWidth = Math.max(2, P * 0.1);
      c.beginPath();
      c.moveTo(X(a + 1), Y(-1));
      c.lineTo(X(-1), Y(a + 1));
      c.stroke();
      c.restore();
    }
  }

  /* ---------- batentes das portas ---------- */
  function doorFrames(D, c, P) {
    for (const d of M.DOORS) {
      const [x, y, w, h] = d.rect;
      const horiz = w > h;
      /* soleira com faixa de perigo e trilho da porta */
      if (horiz) {
        D.hazard(x, y + 0.3, w, 0.4, 0.8);
        D.box(x - 0.25, y - 0.15, 0.3, h + 0.3, '#59647e', OUT, 0.06);
        D.box(x + w - 0.05, y - 0.15, 0.3, h + 0.3, '#59647e', OUT, 0.06);
      } else {
        D.hazard(x + 0.3, y, 0.4, h, 0.8);
        D.box(x - 0.15, y - 0.25, w + 0.3, 0.3, '#59647e', OUT, 0.06);
        D.box(x - 0.15, y + h - 0.05, w + 0.3, 0.3, '#59647e', OUT, 0.06);
      }
    }
  }

  /* ---------- decoração presa nas paredes (luminárias, canos, placas) ---------- */
  function wallDecor(D, c, P) {
    const taken = [];
    for (const a of Object.values(M.STATION_ART)) taken.push([a.x, a.y]);
    const free = (x, y) => !taken.some(([tx, ty]) => Math.abs(tx - x) < 1.6 && Math.abs(ty - y) < 3);
    /* luminárias na face das paredes de cima, a cada ~5 tiles */
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y) || !M.isFloor(x, y + 1) || M.isCutTile(x, y)) continue;
      if ((x * 7 + y * 3) % 5 !== 0 || !free(x + 0.5, y + 1.5)) continue;
      if (!M.isFloor(x - 1, y + 1) || !M.isFloor(x + 1, y + 1)) continue;
      const ly = faceH(x, y) > 1 ? y - 0.35 : y + 0.2;
      D.box(x + 0.2, ly, 0.6, 0.24, '#e9eef8', OUT, 0.08);
      c.fillStyle = D.rad(x + 0.5, y + 1.05, 0, 1.6, [[0, 'rgba(255,245,210,0.13)'], [1, 'rgba(0,0,0,0)']]);
      c.fillRect((x - 1.1) * P, (y + 0.95) * P, 3.2 * P, 1.8 * P);
      live('lamp', x + 0.5, ly + 0.12, { seed: x * 13 + y });
    }
    /* canos correndo pela parede de cima das salas de máquinas */
    const pipeRooms = { upperEngine: '#8a6a3a', lowerEngine: '#8a6a3a', reactor: '#4a6aa0', electrical: '#6d6a50', storage: '#7a5a3a' };
    for (const [id, col] of Object.entries(pipeRooms)) {
      const [x, y, w] = M.AREA[id].rect;
      const cut = M.AREA[id].cut || {};
      const x0 = x + (cut.tl || 0) + 0.8, x1 = x + w - (cut.tr || 0) - 0.8;
      D.pipe([[x0, y - 0.35], [x1, y - 0.35]], col, 0.14);
      for (let t = x0 + 1; t < x1; t += 2.5) D.box(t - 0.08, y - 0.48, 0.16, 0.26, '#3a3f4c', OUT, 0.03);
    }
    /* placas nas paredes */
    const sign = (x, y, bg, draw) => {
      D.box(x - 0.42, y - 0.62, 0.84, 0.5, bg, OUT, 0.07);
      draw(x, y - 0.37);
    };
    sign(49.3, 20, '#e8eef6', (x, y) => {
      D.box(x - 0.06, y - 0.17, 0.12, 0.34, '#e24b4b', null, 0.02);
      D.box(x - 0.17, y - 0.06, 0.34, 0.12, '#e24b4b', null, 0.02);
    });
    sign(44.3, 38, '#f0c93a', (x, y) => {
      D.path([[x + 0.04, y - 0.18], [x - 0.1, y + 0.02], [x + 0.01, y + 0.02], [x - 0.05, y + 0.19], [x + 0.11, y - 0.03], [x, y - 0.03]]);
      D.fs(OUT, null);
    });
    sign(9.8, 26, '#f0c93a', (x, y) => {
      D.circle(x, y, 0.15, null, OUT, 2);
      D.circle(x, y, 0.04, OUT, null);
    });
    sign(59.7, 44, '#ee8f3a', (x, y) => D.text('B-7', x, y + 0.01, 0.22, OUT));
  }

  /* ================= móveis ================= */
  function drawProps(D, c, P) {
    const byKind = {};
    for (const pr of M.PROPS) (byKind[pr.kind] = byKind[pr.kind] || []).push(pr);
    const each = (k, fn) => (byKind[k] || []).forEach(fn);
    /* primeiro o que fica no chão, por último o que é alto */
    drawScanner(D, c, P);
    each('engine', (pr) => engine(D, c, P, pr));
    each('nozzle', (pr) => nozzle(D, c, P, pr));
    each('fuelPort', (pr) => fuelPort(D, c, P, pr));
    each('barrels', (pr) => barrels(D, pr));
    each('reactorCore', (pr) => reactorCore(D, c, P, pr));
    each('coolant', (pr) => coolant(D, pr));
    each('monitorDesk', (pr) => monitorDesk(D, c, P, pr));
    each('officeChair', (pr) => chair(D, pr.circle[0], pr.circle[1], '#3b4458'));
    each('serverRack', (pr) => serverRack(D, pr));
    each('bed', (pr) => bed(D, c, P, pr));
    each('analyzer', (pr) => analyzer(D, pr));
    each('cabinet', (pr) => medCabinet(D, pr));
    each('plant', (pr) => pottedPlant(D, pr.circle[0], pr.circle[1], pr.circle[2]));
    each('roundTable', (pr) => roundTable(D, c, P, pr));
    each('buttonTable', (pr) => buttonTable(D, c, P, pr));
    each('vending', (pr) => vending(D, pr));
    each('gunConsole', (pr) => gunConsole(D, c, P, pr));
    each('gunChair', (pr) => chair(D, pr.circle[0], pr.circle[1], '#6b3a3a', true));
    each('ammo', (pr) => ammo(D, pr));
    each('planters', (pr) => planters(D, pr));
    each('o2Tank', (pr) => o2Tank(D, pr));
    each('tree', (pr) => tree(D, pr));
    each('chartConsole', (pr) => chartConsole(D, pr));
    each('steerPedestal', (pr) => steerPedestal(D, pr));
    each('starTable', (pr) => starTable(D, pr));
    each('pilotChair', (pr) => chair(D, pr.circle[0], pr.circle[1], '#2f5f7a', true));
    each('shieldGen', (pr) => shieldGen(D, c, P, pr));
    each('shieldConsole', (pr) => shieldConsole(D, pr));
    each('capacitor', (pr) => capacitor(D, pr));
    each('commsDesk', (pr) => commsDesk(D, pr));
    each('dish', (pr) => dish(D, c, P, pr));
    each('crates', (pr) => crates(D, c, P, pr));
    each('drums', (pr) => drums(D, pr));
    each('compactor', (pr) => compactor(D, pr));
    each('fuelRack', (pr) => fuelRack(D, pr));
    each('adminTable', (pr) => adminTable(D, c, P, pr));
    each('filing', (pr) => filing(D, pr));
    each('transformer', (pr) => transformer(D, c, P, pr));
    each('batteries', (pr) => batteries(D, pr));
    each('lockers', (pr) => lockers(D, pr));
    each('cooler', (pr) => cooler(D, pr));
    each('missiles', (pr) => missiles(D, pr));
    each('navPanel', (pr) => navPanel(D, pr));
    each('tapes', (pr) => tapes(D, pr));
    each('bin', (pr) => bin(D, pr));
    each('station', (pr) => stationArt(D, c, P, pr));
    enrich(D, c, P);
    /* cadeiras em volta da mesa do Admin (sem colisão) */
    const A = M.ADMIN_TABLE;
    [[-1.8, -1.85], [0, -1.85], [1.8, -1.85]].forEach(([dx, dy]) => chair(D, A.x + dx, A.y + dy, '#34425c', false, true));
  }

  /* ---- Motores ---- */
  function engine(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    const flip = pr.p && pr.p.flip;
    D.rshadow(x, y, w, h, 0.35);
    /* corpo cilíndrico deitado: faixas de luz e sombra */
    D.rr(x, y, w, h, 1.2);
    c.fillStyle = D.lin(0, y, 0, y + h, [[0, '#aeb8cb'], [0.35, '#8995ab'], [0.75, '#5b667d'], [1, '#434c5f']]);
    c.fill();
    D.fs(null);
    /* anéis do casco */
    for (let i = 0; i < 5; i++) {
      const xx = x + 1.2 + i * 1.5;
      c.fillStyle = 'rgba(0,0,0,0.22)';
      c.fillRect(xx * P, (y + 0.25) * P, 0.18 * P, (h - 0.5) * P);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect((xx + 0.18) * P, (y + 0.25) * P, 0.06 * P, (h - 0.5) * P);
    }
    /* entrada de ar com hélice (a hélice gira na camada animada) */
    const fx = x + w - 1.9, fy = y + h / 2;
    D.circle(fx, fy, 1.55, '#39414f');
    D.circle(fx, fy, 1.3, '#1a1f28');
    live('fan', fx, fy, { r: 1.2 });
    /* faixa de perigo perto do bocal */
    D.hazard(x + 0.15, y + 0.6, 0.55, h - 1.2);
    /* painel de status na frente */
    const py = flip ? y + 0.35 : y + h - 1.15;
    D.box(x + 2.4, py, 2.6, 0.8, '#2a3142', OUT, 0.1);
    for (let i = 0; i < 4; i++) D.led(x + 2.75 + i * 0.6, py + 0.4, ['#4be38b', '#4be38b', '#ffb347', '#e24b4b'][i], 0.1);
    D.pipe([[x + 6.3, flip ? y : y + h], [x + 6.3, flip ? y - 0.3 : y + h + 0.3]], '#6b7385', 0.25);
    /* brilho quente de dentro */
    live('engineGlow', x + 1.2, y + h / 2, { h });
  }
  function nozzle(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    /* bocal cônico ligando o motor à parede */
    D.path([[x + w, y + 0.15], [x + w, y + h - 0.15], [x + 0.2, y + h + 0.35], [x + 0.2, y - 0.35]]);
    c.fillStyle = D.lin(0, y - 0.35, 0, y + h + 0.35, [[0, '#8793a8'], [0.5, '#5e687c'], [1, '#3b4354']]);
    c.fill();
    D.fs(null);
    for (let i = 1; i < 4; i++) {
      const xx = x + w - i * 0.95, s = (i / 4) * 0.5;
      D.line(xx, y + 0.15 - s, xx, y + h - 0.15 + s, 'rgba(0,0,0,0.35)', 0.1, 'butt');
    }
    D.box(x - 0.05, y - 0.45, 0.4, h + 0.9, '#39414f', OUT, 0.1);
    live('exhaust', x + 0.15, y + h / 2, { h: h + 0.6 });
  }
  function fuelPort(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    const down = pr.p && pr.p.down;
    D.box(x + 0.35, y, w - 0.7, h, '#6b7385', OUT, 0.06);
    const cy = down ? y + h - 0.2 : y + 0.2;
    D.ellipse(x + w / 2, cy, 0.55, 0.3, '#f0c93a', OUT);
    D.ellipse(x + w / 2, cy, 0.3, 0.16, '#3a3325', OUT, 1);
  }
  function barrels(D, pr) {
    const [x, y, w, h] = pr.rect;
    const n = 2, r = Math.min(w / (n * 2) - 0.04, 0.5);
    for (let i = 0; i < n; i++) {
      const cx = x + r + 0.05 + i * (r * 2 + 0.08), cy = y + h - 0.25 - (i % 2) * 0.35;
      D.cyl(cx, cy, r, 0.9, '#c9a227', '#e2bf3e');
      D.hazard(cx - r + 0.03, cy - 0.55, r * 2 - 0.06, 0.18);
    }
  }

  /* ---- Reator ---- */
  function reactorCore(D, c, P, pr) {
    const [x, y, r] = pr.circle;
    /* canos do núcleo até os scanners e painéis */
    /* quatro canos grossos com cotovelo: para os leitores de mão e para os tanques */
    for (const [tx, ty] of [[4.5, 29.3], [4.5, 42.7], [11.6, 30.2], [11.6, 41.8]]) {
      const ex = x + Math.sign(tx - x) * 1.6, ey = y + Math.sign(ty - y) * 1.9;
      D.pipe([[ex, ey], [ex, ty + Math.sign(y - ty) * 0.3], [tx, ty + Math.sign(y - ty) * 0.3]], '#43577f', 0.42);
      D.box(ex - 0.3, ey - 0.12, 0.6, 0.24, '#2d3a55', OUT, 0.05);
    }
    D.shadow(x + 0.3, y + 0.4, r * 1.08, r * 0.95, 0.4);
    D.circle(x, y, r, D.rad(x - 0.8, y - 0.8, 0.2, r, [[0, '#5c6b88'], [1, '#262f42']]));
    D.circle(x, y, r - 0.35, '#1a2233');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      D.bolt(x + Math.cos(a) * (r - 0.17), y + Math.sin(a) * (r - 0.17));
    }
    D.circle(x, y, r * 0.66, D.rad(x, y, 0, r * 0.66, [[0, '#9fe0ff'], [0.4, '#3d9cff'], [1, '#12407a']]), OUT);
    /* presilhas do anel */
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cx = x + Math.cos(a) * (r - 0.2), cy = y + Math.sin(a) * (r - 0.2);
      D.box(cx - 0.32, cy - 0.32, 0.64, 0.64, '#6b7a98', OUT, 0.1);
      D.box(cx - 0.18, cy - 0.18, 0.36, 0.36, '#f0c93a', OUT, 0.05);
    }
    live('reactor', x, y, { r });
  }
  function coolant(D, pr) {
    const [x, y, r] = pr.circle;
    D.cyl(x, y + r * 0.6, r * 0.9, 1.3, '#8fa0b8', '#b8c4d6');
    D.box(x - 0.18, y - 0.45, 0.36, 0.7, '#123a6b', OUT, 0.08);
    live('bubbles', x, y - 0.1, { w: 0.24, h: 0.6, col: 'rgba(140,210,255,0.8)' });
  }

  /* ---- Segurança ---- */
  function monitorDesk(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    /* monitores presos na parede, logo acima da mesa */
    for (let i = 0; i < 4; i++) {
      const sx = x + 0.25 + i * ((w - 0.5) / 4);
      D.screen(sx + 0.05, y - 0.9, (w - 0.5) / 4 - 0.1, 0.72, '#1c6b52');
      live('camFeed', sx + 0.05, y - 0.9, { w: (w - 0.5) / 4 - 0.1, h: 0.72, i });
    }
    D.box3(x, y, w, h, '#4a5367', '#2b3140', 0.35, 0.1);
    D.box(x + w / 2 - 1, y + 0.12, 2, 0.35, '#1a1f29', OUT, 0.05);
    for (let i = 0; i < 8; i++) D.box(x + w / 2 - 0.9 + i * 0.23, y + 0.18, 0.16, 0.1, '#5d6780', null, 0.02);
    D.circle(x + 1, y + 0.3, 0.14, '#e8e3d6', OUT, 1.5);
    D.box(x + w - 1.6, y + 0.1, 0.8, 0.45, '#e8eef6', OUT, 0.03);
  }
  function chair(D, x, y, col, back, small) {
    const s = small ? 0.8 : 1;
    D.shadow(x + 0.08, y + 0.18, 0.42 * s, 0.18 * s);
    D.circle(x, y, 0.36 * s, col, OUT);
    D.circle(x - 0.08 * s, y - 0.08 * s, 0.16 * s, 'rgba(255,255,255,0.15)', null);
    if (back) D.box(x - 0.35 * s, y + 0.12 * s, 0.7 * s, 0.26 * s, darken(col, 0.25), OUT, 0.1);
  }
  function serverRack(D, pr) {
    const [x, y, w, h] = pr.rect;
    const n = Math.max(1, Math.round(h / 1.6));
    const hh = h / n;
    for (let i = 0; i < n; i++) {
      const yy = y + i * hh;
      D.box3(x, yy + 0.04, w, hh - 0.08, '#2f3646', '#1e232e', 0.18, 0.06);
      for (let k = 0; k < 4; k++) {
        D.box(x + 0.12, yy + 0.2 + k * 0.28, w - 0.24, 0.16, '#141820', null, 0.02);
        live('leds', x + 0.2, yy + 0.28 + k * 0.28, { w: w - 0.4, seed: i * 7 + k });
      }
    }
  }

  /* ---- MedBay ---- */
  function bed(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    D.rshadow(x, y, w, h);
    D.box(x, y, w, h, '#9aa7ba', OUT, 0.2);
    D.box(x + 0.1, y + 0.1, w - 0.2, h - 0.45, '#f2f5fa', OUT, 0.18);
    D.box(x + 0.2, y + 0.25, 0.85, h - 0.75, '#ffffff', OUT, 0.2);
    D.box(x + 1.25, y + 0.15, w - 1.45, h - 0.55, '#8ec2e8', OUT, 0.15);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect((x + 1.25) * P, (y + 0.25) * P, 0.12 * P, (h - 0.75) * P);
    D.box(x + w - 0.12, y + 0.2, 0.1, h - 0.4, '#6b778c', null, 0.03);
    /* suporte de soro */
    D.line(x + w + 0.1, y + 0.2, x + w + 0.1, y - 0.25, '#b8c2d4', 0.06);
    D.box(x + w - 0.02, y - 0.45, 0.24, 0.3, 'rgba(180,230,255,0.8)', OUT, 0.06);
  }
  function analyzer(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#dfe6f2', '#9aa7ba', 0.5, 0.15);
    D.screen(x + 0.2, y + 0.12, 0.9, 0.55, '#3ae08a');
    ['#e24b4b', '#4aa3ff', '#4be38b', '#ffd23b', '#c56cf0'].forEach((col, i) => {
      const tx = x + 1.3 + i * 0.26;
      D.box(tx, y + 0.1, 0.18, 0.72, 'rgba(255,255,255,0.7)', OUT, 0.08);
      D.box(tx + 0.03, y + 0.45, 0.12, 0.34, col, null, 0.05);
    });
    live('tubes', x + 1.3, y + 0.1);
  }
  function medCabinet(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#eef2f8', '#b9c3d3', 0.3, 0.1);
    D.box(x + 0.12, y + 0.2, w - 0.24, h - 0.65, 'rgba(160,210,240,0.55)', OUT, 0.06);
    for (let i = 0; i < 4; i++) D.box(x + 0.22, y + 0.35 + i * 0.62, w - 0.44, 0.08, '#8a96aa', null, 0.02);
    ['#e24b4b', '#4be38b', '#ffd23b', '#4aa3ff'].forEach((col, i) => D.box(x + 0.25 + (i % 2) * 0.3, y + 0.5 + i * 0.62, 0.18, 0.2, col, OUT, 0.05));
    D.box(x + w / 2 - 0.12, y + h - 0.28, 0.24, 0.08, '#e24b4b', null, 0.02);
  }
  function pottedPlant(D, x, y, r) {
    D.cyl(x, y + r * 0.6, r * 0.75, 0.4, '#8a5a3a', '#6b4028');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      D.ellipse(x + Math.cos(a) * r * 0.55, y - 0.25 + Math.sin(a) * r * 0.35, r * 0.45, r * 0.25, i % 2 ? '#5ab24a' : '#6fc95a', OUT, 1.5);
    }
    D.circle(x, y - 0.25, r * 0.35, '#7fd66a', OUT, 1.5);
  }
  function drawScanner(D, c, P) {
    const s = M.STATIONS.scan;
    D.glow(s.x, s.y, 1.9, 'rgba(90,240,160,0.22)');
    D.ellipse(s.x, s.y + 0.1, 1.2, 0.85, '#2a3b45', OUT);
    D.ellipse(s.x, s.y + 0.02, 1.0, 0.68, '#1d3a35', OUT, 1.5);
    D.ellipse(s.x, s.y + 0.02, 0.7, 0.46, 'rgba(58,224,138,0.35)', '#3ae08a', 2);
    live('scanPad', s.x, s.y);
  }

  /* ---- Cafeteria ---- */
  function stools(D, x, y, r, n, off) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (off || 0.3);
      const sx = x + Math.cos(a) * (r + 0.6), sy = y + Math.sin(a) * (r + 0.5);
      D.shadow(sx + 0.05, sy + 0.12, 0.3, 0.12);
      D.ellipse(sx, sy, 0.3, 0.24, '#6f7a90', OUT, 1.5);
      D.ellipse(sx - 0.06, sy - 0.05, 0.14, 0.09, 'rgba(255,255,255,0.18)', null);
    }
  }
  function roundTable(D, c, P, pr) {
    const [x, y, r] = pr.circle;
    stools(D, x, y, r, 5, 0.3);
    D.shadow(x + 0.18, y + 0.3, r * 1.02, r * 0.9, 0.3);
    D.circle(x, y + 0.14, r, '#8b95a8');
    D.circle(x, y, r, D.rad(x - r * 0.4, y - r * 0.4, 0.1, r * 1.2, [[0, '#ffffff'], [1, '#c7cfdc']]));
    D.circle(x, y, r * 0.78, null, 'rgba(0,0,0,0.12)', 2);
    /* bandejas e copos */
    D.box(x - 0.55, y - 0.45, 0.6, 0.4, '#e8a33d', OUT, 0.06);
    D.circle(x + 0.45, y + 0.2, 0.16, '#6fb7ff', OUT, 1.5);
  }
  function buttonTable(D, c, P, pr) {
    const [x, y, r] = pr.circle;
    stools(D, x, y, r, 6, 0.1);
    D.shadow(x + 0.2, y + 0.35, r * 1.02, r * 0.9, 0.32);
    D.circle(x, y + 0.16, r, '#8b95a8');
    D.circle(x, y, r, D.rad(x - r * 0.4, y - r * 0.4, 0.1, r * 1.2, [[0, '#ffffff'], [1, '#c7cfdc']]));
    /* base do botão com a cúpula de vidro */
    D.circle(x, y, 0.95, '#39414f');
    D.circle(x, y, 0.78, '#20252f');
    D.hazard(x - 0.95, y + 0.55, 1.9, 0.18);
    D.circle(x, y + 0.04, 0.5, '#8a0e16');
    D.circle(x, y - 0.02, 0.46, D.rad(x - 0.15, y - 0.2, 0.05, 0.5, [[0, '#ff6b6b'], [1, '#c3202b']]));
    D.circle(x, y, 0.7, 'rgba(200,230,255,0.18)', 'rgba(220,240,255,0.7)', 2);
    D.ellipse(x - 0.28, y - 0.32, 0.2, 0.1, 'rgba(255,255,255,0.7)', null);
    D.box(x - 0.55, y + 1.05, 1.1, 0.34, '#1a1f29', OUT, 0.05);
    D.text('EMERGÊNCIA', x, y + 1.22, 0.17, '#ff5a5a');
    live('button', x, y);
  }
  function vending(D, pr) {
    const [x, y, w, h] = pr.rect;
    const col = pr.p.c;
    D.box3(x, y, w, h, lighten(col, 0.15), darken(col, 0.3), 0.3, 0.1);
    D.box(x + 0.12, y + 0.12, w - 0.75, h - 0.52, 'rgba(180,220,255,0.35)', OUT, 0.05);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) D.box(x + 0.2 + k * 0.3, y + 0.2 + r * 0.33, 0.2, 0.22, ['#ffd23b', '#e24b4b', '#4be38b', '#ffffff'][(k + r + pr.id) % 4], null, 0.04);
    D.box(x + w - 0.52, y + 0.15, 0.36, 0.6, '#1a1f29', OUT, 0.05);
    D.led(x + w - 0.34, y + 0.3, '#4be38b', 0.07);
    live('vendLight', x + 0.12, y + 0.12, { w: w - 0.75 });
  }

  /* ---- Armas ---- */
  function gunConsole(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    /* canhão visto pela janela da parede de cima */
    const cx = x + w / 2;
    D.box3(x, y, w, h, '#586079', '#343a4c', 0.4, 0.15);
    D.screen(x + 0.2, y + 0.12, w - 0.4, 0.62, '#12303a');
    live('radar', x + 0.2, y + 0.12, { w: w - 0.4, h: 0.62 });
    D.circle(x + 0.25, y + h - 0.2, 0.14, '#e24b4b', OUT, 1.5);
    D.circle(x + w - 0.25, y + h - 0.2, 0.14, '#e24b4b', OUT, 1.5);
    void cx;
  }
  function ammo(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#6b7a46', '#475230', 0.55, 0.08);
    for (let i = 0; i < 5; i++) {
      D.box(x + 0.2 + i * 0.35, y + 0.2, 0.22, 0.75, '#d4a93a', OUT, 0.1);
      D.box(x + 0.2 + i * 0.35, y + 0.2, 0.22, 0.2, '#b8812a', null, 0.1);
    }
    D.text('ARM', x + w / 2, y + h - 0.28, 0.2, '#e8e3c0');
  }

  /* ---- O2 ---- */
  function planters(D, pr) {
    const [x, y, w, h] = pr.rect;
    const n = 3, sw = w / n;
    for (let i = 0; i < n; i++) {
      const px = x + i * sw + 0.08;
      D.box3(px, y + 0.35, sw - 0.16, h - 0.35, '#5a4230', '#3d2c20', 0.35, 0.12);
      D.box(px + 0.1, y + 0.45, sw - 0.36, h - 0.95, '#3b2a1c', null, 0.08);
      for (let k = 0; k < 4; k++) {
        const lx = px + 0.35 + k * (sw - 0.6) / 3;
        D.ellipse(lx, y + 0.35, 0.3, 0.42, k % 2 ? '#4f9e3f' : '#6fc95a', OUT, 1.5);
        D.line(lx, y + 0.1, lx, y + 0.65, 'rgba(0,0,0,0.25)', 0.03);
      }
      live('leaves', px + 0.2, y + 0.1, { w: sw - 0.5, seed: i });
    }
  }
  function o2Tank(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.cyl(x + w / 2, y + h - 0.12, w / 2 - 0.05, h - 0.45, '#dfe8f2', '#f4f8fc');
    D.box(x + 0.2, y + 0.55, w - 0.4, 0.34, '#3aa0e0', OUT, 0.05);
    D.text('O₂', x + w / 2, y + 0.72, 0.2, '#ffffff');
    D.box(x + w / 2 - 0.1, y - 0.02, 0.2, 0.2, '#6b7385', OUT, 0.04);
  }
  function tree(D, pr) {
    const [x, y, r] = pr.circle;
    D.cyl(x, y + r * 0.55, r * 0.9, 0.35, '#7a5a3a', '#5e4128');
    D.line(x, y + 0.2, x, y - 0.6, '#6b4a2a', 0.2);
    const blobs = [[0, -1.05, 0.62], [-0.55, -0.7, 0.5], [0.55, -0.7, 0.5], [-0.3, -1.35, 0.42], [0.35, -1.3, 0.42]];
    for (const [dx, dy, rr] of blobs) D.circle(x + dx, y + dy + 0.3, rr, '#4f9e3f', OUT, 1.5);
    for (const [dx, dy, rr] of blobs) D.circle(x + dx - 0.1, y + dy + 0.2, rr * 0.55, '#78d36a', null);
    live('treeSway', x, y - 0.6);
  }

  /* ---- Navegação ---- */
  function chartConsole(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#4b5a78', '#2d3850', 0.25, 0.15);
    D.screen(x + 0.15, y + 0.2, w - 0.3, h - 0.6, '#0e2a4a');
    live('chart', x + 0.15, y + 0.2, { w: w - 0.3, h: h - 0.6 });
  }
  function steerPedestal(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#4b5a78', '#2d3850', 0.3, 0.2);
    D.circle(x + w / 2, y + 0.42, 0.36, '#0e2a4a');
    live('crosshair', x + w / 2, y + 0.42, { r: 0.3 });
  }
  function starTable(D, pr) {
    const [x, y, r] = pr.circle;
    D.shadow(x + 0.15, y + 0.25, r, r * 0.8);
    D.circle(x, y + 0.12, r, '#2d3850');
    D.circle(x, y, r, '#3b4a66');
    D.circle(x, y, r * 0.75, '#0b1a30');
    live('holoPlanet', x, y, { r: r * 0.7 });
  }

  /* ---- Escudos ---- */
  function shieldGen(D, c, P, pr) {
    const [x, y, r] = pr.circle;
    D.shadow(x + 0.2, y + 0.3, r * 1.05, r * 0.9, 0.35);
    D.circle(x, y, r, D.rad(x - 0.5, y - 0.5, 0.1, r, [[0, '#5e6a8e'], [1, '#2b3150']]));
    D.circle(x, y, r - 0.25, '#1d2238');
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const hx = i === 6 ? x : x + Math.cos(a) * 0.82, hy = i === 6 ? y : y + Math.sin(a) * 0.82;
      D.hex(hx, hy, 0.42, '#3a4478', '#8fa6ff', 2);
    }
    live('shields', x, y);
  }
  function shieldConsole(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#586079', '#343a4c', 0.25, 0.1);
    D.hex(x + w / 2, y + 0.3, 0.2, '#2a3a8a', '#8fa6ff', 1.5);
  }
  function capacitor(D, pr) {
    const [x, y, r] = pr.circle;
    D.cyl(x, y + r * 0.5, r * 0.85, 1.1, '#5e6a8e', '#8fa6ff');
    for (let i = 0; i < 3; i++) D.line(x - r * 0.8, y - 0.35 + i * 0.25, x + r * 0.8, y - 0.35 + i * 0.25, 'rgba(180,200,255,0.55)', 0.05);
    live('coil', x, y - 0.3, { r });
  }

  /* ---- Comunicações ---- */
  function commsDesk(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#4a5367', '#2b3140', 0.6, 0.1);
    for (let i = 0; i < 4; i++) {
      const sx = x + 0.3 + i * 2.15;
      D.screen(sx, y + 0.12, 1.9, 0.95, i % 2 ? '#1f4a78' : '#1d5a44');
      live('terminal', sx, y + 0.12, { w: 1.9, h: 0.95, seed: i });
    }
  }
  function dish(D, c, P, pr) {
    const [x, y, r] = pr.circle;
    D.shadow(x + 0.2, y + 0.35, r, r * 0.8);
    D.box(x - 0.4, y + 0.3, 0.8, 0.8, '#3b4458', OUT, 0.1);
    D.circle(x, y, r, D.rad(x - 0.4, y - 0.4, 0.1, r, [[0, '#e6ecf5'], [1, '#8b97ac']]));
    D.circle(x, y, r * 0.55, null, 'rgba(0,0,0,0.2)', 2);
    live('dish', x, y, { r });
  }

  /* ---- Depósito ---- */
  function crate(D, x, y, w, h, tint) {
    D.box3(x, y, w, h, tint || '#b88f5a', darken(tint || '#b88f5a', 0.3), Math.min(0.55, h * 0.3), 0.08);
    const th = h - Math.min(0.55, h * 0.3);
    D.line(x + 0.15, y + 0.15, x + w - 0.15, y + th - 0.15, 'rgba(0,0,0,0.25)', 0.07);
    D.line(x + w - 0.15, y + 0.15, x + 0.15, y + th - 0.15, 'rgba(0,0,0,0.25)', 0.07);
    D.box(x + 0.1, y + 0.1, w - 0.2, th - 0.2, null, 'rgba(0,0,0,0.3)', 0.05, 1.5);
  }
  function crates(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    const n = (pr.p && pr.p.n) || 1;
    if (n === 1) crate(D, x, y, w, h);
    else if (n === 2) {
      crate(D, x, y, w * 0.55, h);
      crate(D, x + w * 0.58, y + 0.35, w * 0.42, h - 0.35, '#a88455');
    } else if (n === 3) {
      crate(D, x, y + 0.2, w * 0.48, h - 0.2);
      crate(D, x + w * 0.5, y, w * 0.5, h * 0.55, '#a88455');
      crate(D, x + w * 0.5, y + h * 0.58, w * 0.5, h * 0.42, '#c49a62');
    } else {
      crate(D, x, y, w * 0.5, h * 0.5);
      crate(D, x + w * 0.52, y + 0.15, w * 0.48, h * 0.45, '#a88455');
      crate(D, x, y + h * 0.53, w * 0.5, h * 0.47, '#c49a62');
      crate(D, x + w * 0.52, y + h * 0.53, w * 0.48, h * 0.47);
      D.text('FRÁGIL', x + w * 0.25, y + h * 0.18, 0.2, 'rgba(60,30,10,0.7)');
    }
  }
  function drums(D, pr) {
    const [x, y, , h] = pr.rect;
    [[x + 0.55, y + h - 0.3, '#b8452f'], [x + 1.6, y + h - 0.55, '#c9a227'], [x + 1.05, y + h - 1.05, '#b8452f']].forEach(([cx, cy, col]) => {
      D.cyl(cx, cy, 0.5, 0.75, col, lighten(col, 0.2));
      D.ellipse(cx, cy - 0.75, 0.15, 0.07, '#2a2a2a', null);
    });
  }
  function compactor(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box(x, y - 0.9, w, h + 0.9, '#3a4150', OUT, 0.1);
    D.box(x + 0.25, y - 0.7, w - 0.5, 0.95, '#1a1e26', OUT, 0.08);
    for (let i = 0; i < 6; i++) D.line(x + 0.45 + i * 0.5, y - 0.6, x + 0.45 + i * 0.5, y + 0.1, '#2c323e', 0.12);
    D.hazard(x, y + h - 0.25, w, 0.22);
    D.text('LIXO', x + w / 2, y - 0.2, 0.22, 'rgba(240,200,60,0.85)');
    live('compactor', x + 0.25, y - 0.7, { w: w - 0.5, h: 0.95 });
  }
  function fuelRack(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#59647e', '#343c4c', 0.2, 0.08);
    for (let i = 0; i < 3; i++) {
      const cy = y + 0.15 + i * 0.85;
      D.box(x + 0.12, cy, w - 0.24, 0.72, '#d9432f', OUT, 0.12);
      D.box(x + 0.2, cy + 0.1, 0.25, 0.14, '#f0c93a', null, 0.04);
      D.box(x + w - 0.4, cy - 0.05, 0.16, 0.18, '#2a2a2a', OUT, 0.04);
    }
  }

  /* ---- Admin ---- */
  function adminTable(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#2a3a58', '#18223a', 0.45, 0.35);
    D.box(x + 0.25, y + 0.2, w - 0.5, h - 0.85, 'rgba(58,224,138,0.18)', '#3ae08a', 0.25, 2);
    c.strokeStyle = 'rgba(90,240,160,0.75)';
    c.lineWidth = Math.max(1, P * 0.035);
    for (const r of M.ROOMS) {
      const [rx, ry, rw, rh] = r.rect;
      c.strokeRect((x + 0.35 + (rx / W) * (w - 0.7)) * P, (y + 0.28 + (ry / H) * (h - 1.0)) * P, (rw / W) * (w - 0.7) * P, (rh / H) * (h - 1.0) * P);
    }
    live('holoMap', x + 0.25, y + 0.2, { w: w - 0.5, h: h - 0.85 });
  }
  function filing(D, pr) {
    const [x, y, w, h] = pr.rect;
    const n = 3, hh = h / n;
    for (let i = 0; i < n; i++) {
      D.box3(x, y + i * hh + 0.03, w, hh - 0.06, '#7d8aa1', '#566178', 0.15, 0.05);
      D.box(x + 0.2, y + i * hh + 0.35, w - 0.4, 0.1, '#2a3040', null, 0.02);
    }
  }

  /* ---- Elétrica ---- */
  function transformer(D, c, P, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#666352', '#3f3d32', 0.8, 0.1);
    for (let i = 0; i < 3; i++) {
      const cx = x + 0.7 + i * 1.2;
      D.circle(cx, y + 0.85, 0.42, '#8b7a4a');
      for (let k = 0; k < 3; k++) D.circle(cx, y + 0.85, 0.36 - k * 0.1, null, 'rgba(0,0,0,0.35)', 1.5);
    }
    D.hazard(x + 0.2, y + h - 0.65, w - 0.4, 0.3);
    D.box(x + w / 2 - 0.42, y + 1.45, 0.84, 0.6, '#f0c93a', OUT, 0.06);
    D.path([[x + w / 2 + 0.05, y + 1.52], [x + w / 2 - 0.12, y + 1.78], [x + w / 2 + 0.01, y + 1.78], [x + w / 2 - 0.07, y + 1.98], [x + w / 2 + 0.14, y + 1.7], [x + w / 2, y + 1.7]]);
    D.fs(OUT, null);
    live('sparks', x + w / 2, y + 0.9, { w });
  }
  function batteries(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#4a5367', '#2b3140', 0.3, 0.08);
    for (let i = 0; i < 3; i++) {
      D.box(x + 0.2, y + 0.15 + i * 0.6, w - 0.4, 0.45, '#1f2530', OUT, 0.05);
      live('charge', x + 0.28, y + 0.22 + i * 0.6, { w: w - 0.56, seed: i });
    }
  }

  /* ---- extras ---- */
  function lockers(D, pr) {
    const [x, y, w, h] = pr.rect;
    const n = 3, hh = h / n;
    for (let i = 0; i < n; i++) {
      D.box3(x, y + i * hh + 0.03, w, hh - 0.06, '#5b7aa0', '#3c5372', 0.12, 0.06);
      for (let k = 0; k < 3; k++) D.line(x + 0.2 + k * 0.12, y + i * hh + 0.2, x + 0.2 + k * 0.12, y + i * hh + 0.55, 'rgba(0,0,0,0.35)', 0.04);
      D.box(x + w - 0.3, y + i * hh + 0.35, 0.1, 0.25, '#d6dde8', null, 0.02);
    }
  }
  function cooler(D, pr) {
    const [x, y, r] = pr.circle;
    D.cyl(x, y + r * 0.6, r * 0.85, 0.6, '#dfe6f2', '#f4f8fc');
    D.cyl(x, y - 0.1, r * 0.6, 0.45, '#6fb7ff', '#9fd0ff');
    D.box(x - 0.08, y + 0.1, 0.16, 0.1, '#e24b4b', OUT, 0.03);
  }
  function missiles(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box3(x, y, w, h, '#4a5367', '#2b3140', 0.25, 0.08);
    for (let i = 0; i < 4; i++) {
      const my = y + 0.2 + i * ((h - 0.5) / 4);
      D.box(x + 0.15, my, w - 0.3, 0.55, '#c9ced8', OUT, 0.25);
      D.box(x + w - 0.45, my, 0.3, 0.55, '#e24b4b', OUT, 0.2);
      D.box(x + 0.15, my + 0.2, 0.2, 0.15, '#2a3040', null, 0.02);
    }
  }
  function navPanel(D, pr) {
    const [x, y, r] = pr.circle;
    D.shadow(x + 0.08, y + 0.15, r, r * 0.6);
    D.circle(x, y, r, '#3b4a66');
    D.circle(x, y, r * 0.62, '#0e2a4a');
    live('blink', x, y, { col: '#5fd6ff', seed: x * 3 });
  }
  function tapes(D, pr) {
    const [x, y, w, h] = pr.rect;
    D.box(x, y - 1.1, w, h + 1.1, '#3a4254', OUT, 0.1);
    for (let i = 0; i < 2; i++) {
      D.circle(x + 0.6 + i * 1.4, y - 0.45, 0.42, '#1a1f29');
      D.circle(x + 0.6 + i * 1.4, y - 0.45, 0.14, '#8a96aa');
      live('reel', x + 0.6 + i * 1.4, y - 0.45, { r: 0.38, seed: i });
    }
    D.box(x + 0.3, y + 0.15, w - 0.6, 0.35, '#1a1f29', OUT, 0.04);
  }
  function bin(D, pr) {
    const [x, y, r] = pr.circle;
    D.cyl(x, y + r * 0.6, r * 0.85, 0.55, '#5b6476', '#39414f');
    D.ellipse(x, y + r * 0.6 - 0.55, r * 0.55, r * 0.22, '#1a1f29', null);
  }

  /* ---- detalhes nas paredes e no chão de cada sala ---- */
  function enrich(D, c, P) {
    /* placa de parede com texto (na face da parede de cima) */
    const plate = (x, y, w, txt, bg, fg) => {
      D.box(x - w / 2, y - 0.2, w, 0.4, bg, OUT, 0.06);
      D.text(txt, x, y + 0.01, 0.2, fg || OUT);
    };
    /* Cafeteria: letreiro e quadro de avisos */
    D.box(69.8, 0.55, 2.8, 0.95, '#1d2433', OUT, 0.12);
    D.text('SKELD', 71.2, 1.03, 0.5, '#7fa2d8');
    D.box(78, 3.6, 0.1, 0.1, null, null);
    /* Segurança: alarme e placa */
    plate(33.2, 26.9, 1.2, 'SEG', '#4be38b');
    D.circle(22.9, 27.1, 0.18, '#7a1414');
    live('alarm', 22.9, 27.1);
    /* Admin: telão com o status da nave */
    D.screen(77.4, 32.7, 5.2, 1.1, '#123a2a');
    live('statusBoard', 77.4, 32.7, { w: 5.2, h: 1.1 });
    /* Comunicações: antena e mostradores na parede */
    D.screen(79.2, 60.9, 3.6, 0.9, '#2a1f4a');
    live('wave', 79.2, 60.9, { w: 3.6, h: 0.9 });
    /* Elétrica: quadros de disjuntores na parede */
    for (const bx of [40.4, 42.6]) {
      D.box(bx, 36.55, 1.9, 1.3, '#4b4636', OUT, 0.08);
      for (let i = 0; i < 6; i++) D.box(bx + 0.15 + i * 0.28, 36.75, 0.18, 0.4, '#1a1a14', OUT, 0.02);
      live('breakers', bx + 0.15, 36.75, { seed: bx });
      D.hazard(bx + 0.1, 37.55, 1.7, 0.16);
    }
    /* Armas: plataforma do atirador */
    c.strokeStyle = 'rgba(239,83,80,0.35)';
    c.lineWidth = 0.1 * P;
    c.beginPath();
    c.arc(99.5 * P, 9.9 * P, 1.9 * P, 0, Math.PI * 2);
    c.stroke();
    D.hazard(97.6, 12.1, 3.8, 0.18, 0.7);
    /* Navegação: telas de mapa estelar na parede */
    for (const sx of [119.2, 122.6]) {
      D.screen(sx, 26.45, 2.8, 1.05, '#0e2a4a');
      live('starMap', sx, 26.45, { w: 2.8, h: 1.05, seed: sx });
    }
    /* Escudos: dutos de energia azul pela parede */
    D.pipe([[94.6, 50.9], [99.4, 50.9]], '#3a4478', 0.28);
    D.pipe([[104.6, 50.9], [108, 50.9]], '#3a4478', 0.28);
    live('energy', 94.6, 50.9, { w: 4.8 });
    live('energy', 104.6, 50.9, { w: 3.4 });
    D.pipe([[SHIELD_FX.x + 1.4, SHIELD_FX.y - 0.8], [106.5, 58.5], [108.6, 58.5]], '#2a3050', 0.18);
    /* O2: cano dos cilindros até as jardineiras */
    D.pipe([[86.6, 24.9], [86.6, 23.9], [87.1, 23.9]], '#9fb2c9', 0.16);
    /* MedBay: monitores de batimento ao lado das macas */
    for (const by of [21.3, 24.1, 26.9, 29.7]) {
      D.box(42.1, by + 0.1, 0.55, 0.45, '#1a1f29', OUT, 0.06);
      live('heart', 42.15, by + 0.33, { w: 0.45, seed: by });
    }
    /* Reator: aviso de radiação no chão */
    D.circle(10.2, 36, 0.55, 'rgba(240,201,58,0.25)', 'rgba(240,201,58,0.5)', 2);
    /* Depósito: prateleira de caixas na parede */
    for (let i = 0; i < 3; i++) D.box(67.2 + i * 1.3, 42.9, 1.1, 0.7, ['#b88f5a', '#a88455', '#c49a62'][i], OUT, 0.06);
    /* Corredores: placas apontando as salas */
    const arrow = (x, y, txt, dir) => {
      D.box(x - 0.95, y - 0.24, 1.9, 0.48, '#2a3142', OUT, 0.08);
      D.text((dir < 0 ? '◀ ' : '') + txt + (dir > 0 ? ' ▶' : ''), x, y + 0.01, 0.2, '#e8eef6');
    };
    arrow(29.5, 11.2, 'MOTOR', -1);
    arrow(51, 11.2, 'CAFETERIA', 1);
    arrow(86.8, 7.2, 'ARMAS', 1);
    arrow(110, 33.2, 'NAV', 1);
    arrow(30, 55.2, 'MOTOR', -1);
    arrow(48.5, 55.2, 'DEPÓSITO', 1);
    arrow(77.5, 55.2, 'COMMS', 1);
  }

  /* ================= consoles das estações ================= */
  function stationArt(D, c, P, pr) {
    const id = pr.station;
    const a = M.STATION_ART[id];
    if (!a) return;
    const [x, y, w, h] = pr.rect;
    /* face do console na parede: para paredes de cima fica na face (acima do piso) */
    let fx, fy, fw, fh;
    if (a.side === 'top') [fx, fy, fw, fh] = [x, y - 1.3, w, 1.3 + h];
    else if (a.side === 'bottom') [fx, fy, fw, fh] = [x, y - 0.25, w, h + 0.25];
    else if (a.side === 'left') [fx, fy, fw, fh] = [x - 0.7, y, w + 0.7, h];
    else [fx, fy, fw, fh] = [x, y, w + 0.7, h];
    const vert = a.side === 'left' || a.side === 'right';
    const cx = fx + fw / 2;
    const body = (col, dark) => {
      D.rshadow(fx, fy, fw, fh, 0.22);
      D.box(fx, fy, fw, fh, col || '#3a4254', OUT, 0.1);
      if (!vert) {
        c.fillStyle = dark || 'rgba(0,0,0,0.25)';
        c.fillRect((fx + 0.05) * P, (fy + fh - 0.18) * P, (fw - 0.1) * P, 0.13 * P);
      }
    };
    switch (a.kind) {
      case 'wires': {
        body('#c9a227');
        D.box(fx + 0.12, fy + 0.12, fw - 0.24, fh - 0.3, '#2a2a22', OUT, 0.06);
        const cols = ['#e24b4b', '#4aa3ff', '#ffd23b', '#e05ad0'];
        for (let i = 0; i < 4; i++) {
          if (vert) D.line(fx + 0.2, fy + 0.25 + i * (fh - 0.5) / 3, fx + fw - 0.2, fy + 0.25 + ((i + 2) % 4) * (fh - 0.5) / 3, cols[i], 0.07);
          else D.line(fx + 0.25 + i * (fw - 0.5) / 3, fy + 0.2, fx + 0.25 + ((i + 1) % 4) * (fw - 0.5) / 3, fy + fh - 0.35, cols[i], 0.07);
        }
        break;
      }
      case 'download':
      case 'upload': {
        body('#3a4254');
        const sw = vert ? fw - 0.16 : fw - 0.2, sh = vert ? fh - 0.4 : fh - 0.4;
        D.screen(fx + (fw - sw) / 2, fy + 0.1, sw, sh, '#1f5f9a');
        const ax = fx + fw / 2, ay = fy + 0.1 + sh / 2;
        const up = a.kind === 'upload';
        D.path([[ax, ay + (up ? -0.22 : 0.22)], [ax - 0.17, ay + (up ? 0.0 : 0.0)], [ax + 0.17, ay]]);
        D.fs('#dff3ff', null);
        D.box(ax - 0.05, ay + (up ? 0 : -0.2), 0.1, 0.2, '#dff3ff', null, 0.02);
        live('progress', fx + (fw - sw) / 2 + 0.1, fy + 0.1 + sh - 0.14, { w: sw - 0.2, seed: id.length });
        break;
      }
      case 'accept': {
        body('#59647e');
        D.box(cx - 0.28, fy + 0.15, 0.56, 0.42, '#2a3142', OUT, 0.08);
        D.path([[cx + 0.05, fy + 0.2], [cx - 0.1, fy + 0.4], [cx, fy + 0.4], [cx - 0.06, fy + 0.55], [cx + 0.12, fy + 0.34], [cx + 0.02, fy + 0.34]]);
        D.fs('#ffd23b', null);
        live('blink', cx + 0.4 * (vert ? 0 : 1), fy + (vert ? fh - 0.3 : 0.25), { col: '#4be38b', seed: id.length * 3 });
        break;
      }
      case 'divert': {
        body('#4a4636');
        for (let i = 0; i < 6; i++) {
          const sy = fy + 0.15 + i * ((fh - 0.3) / 6);
          D.box(fx + 0.12, sy + 0.05, fw - 0.24, 0.08, '#1a1a14', null, 0.02);
          D.box(fx + 0.12 + ((i * 37) % 10) / 10 * (fw - 0.45), sy, 0.2, 0.18, '#f0c93a', OUT, 0.03);
        }
        break;
      }
      case 'calibrate': {
        body('#4a4636');
        for (let i = 0; i < 3; i++) {
          const dy = fy + 0.3 + i * ((fh - 0.5) / 2.4);
          D.circle(cx, dy, 0.2, '#e8e3d6', OUT, 1.5);
          live('dial', cx, dy, { r: 0.17, seed: i });
        }
        break;
      }
      case 'filter': {
        /* grade do filtro de ar no pé da parede, com folhas presas */
        D.box(fx + 0.05, fy - 0.1, fw - 0.1, fh + 0.1, '#2a3038', OUT, 0.1);
        for (let i = 0; i < 5; i++) D.line(fx + 0.2 + i * ((fw - 0.4) / 4), fy, fx + 0.2 + i * ((fw - 0.4) / 4), fy + fh - 0.1, '#4a5260', 0.06);
        D.ellipse(cx - 0.2, fy + 0.2, 0.12, 0.06, '#6fc95a', null);
        D.ellipse(cx + 0.25, fy + 0.35, 0.1, 0.05, '#5ab24a', null);
        live('filterLeaves', cx, fy + fh / 2);
        break;
      }
      case 'manifolds': {
        body('#3a4254');
        for (let r = 0; r < 2; r++) for (let k = 0; k < 5; k++) {
          const bx = fx + 0.15 + k * ((fw - 0.3) / 5), by = fy + 0.18 + r * 0.35;
          D.box(bx, by, (fw - 0.3) / 5 - 0.05, 0.28, '#6fa8dc', OUT, 0.04);
          D.text(String(r * 5 + k + 1), bx + ((fw - 0.3) / 5 - 0.05) / 2, by + 0.15, 0.14, '#0d1a2a');
        }
        break;
      }
      case 'simon': {
        body('#3a4254');
        for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) D.box(cx - 0.45 + k * 0.32, fy + 0.12 + r * 0.24, 0.26, 0.2, '#1a2a40', OUT, 0.03);
        live('simon', cx - 0.45, fy + 0.12);
        break;
      }
      case 'swipe': {
        body('#3a4254');
        D.box(cx - 0.35, fy + 0.2, 0.7, 0.2, '#111', OUT, 0.03);
        live('blink', cx + 0.45, fy + 0.3, { col: '#e24b4b', seed: 5 });
        D.box(cx - 0.3, fy + 0.5, 0.6, 0.18, '#e8eef6', OUT, 0.03);
        break;
      }
      case 'chute': {
        /* calha do lixo com alavanca */
        D.box(fx + 0.05, fy - 0.2, fw - 0.1, fh + 0.2, '#4b5467', OUT, 0.12);
        D.box(fx + 0.2, fy - 0.05, fw - 0.4, fh - 0.2, '#1a1e26', OUT, 0.08);
        D.line(fx + fw - 0.18, fy + 0.05, fx + fw + 0.08, fy - 0.35, '#8a96aa', 0.08);
        D.circle(fx + fw + 0.08, fy - 0.35, 0.1, '#e24b4b', OUT, 1.5);
        live('chute', fx + 0.2, fy - 0.05, { w: fw - 0.4, id });
        break;
      }
      case 'align': {
        body('#59647e');
        D.screen(fx + 0.12, fy + 0.1, fw - 0.24, fh - 0.4, '#20304a');
        live('alignGauge', fx + 0.12, fy + 0.1, { w: fw - 0.24, h: fh - 0.4 });
        break;
      }
      case 'handScanner': {
        body('#28324a');
        D.box(cx - 0.3, fy + 0.1, 0.6, fh - 0.35, '#3a1216', OUT, 0.1);
        /* mão */
        D.ellipse(cx, fy + 0.45, 0.14, 0.17, 'rgba(255,120,120,0.8)', null);
        for (let i = 0; i < 4; i++) D.box(cx - 0.13 + i * 0.075, fy + 0.18, 0.05, 0.16, 'rgba(255,120,120,0.8)', null, 0.02);
        live('handScan', cx, fy + 0.4, { id });
        break;
      }
      case 'keypad': {
        body('#3a4254');
        D.screen(cx - 0.4, fy + 0.08, 0.8, 0.22, '#0e2a1c');
        for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) D.box(cx - 0.35 + k * 0.25, fy + 0.36 + r * 0.2, 0.2, 0.15, '#9aa6bd', OUT, 0.03);
        live('keypadScreen', cx - 0.4, fy + 0.08, { id });
        break;
      }
      case 'lightsPanel': {
        body('#5a3a2a');
        for (let i = 0; i < 5; i++) {
          const sx = fx + 0.15 + i * ((fw - 0.3) / 5);
          D.box(sx, fy + 0.15, (fw - 0.3) / 5 - 0.06, 0.45, '#e0d6b8', OUT, 0.03);
          D.box(sx + 0.03, fy + 0.18, (fw - 0.3) / 5 - 0.12, 0.18, '#3a3a3a', null, 0.02);
        }
        live('lightsSab', fx, fy, { w: fw });
        break;
      }
      case 'radio': {
        body('#3a4254');
        D.circle(cx, fy + 0.45, 0.28, '#1a1f29');
        live('radio', cx, fy + 0.45);
        D.line(cx, fy + 0.05, cx + 0.3, fy - 0.45, '#8a96aa', 0.05);
        D.circle(cx + 0.3, fy - 0.45, 0.07, '#e24b4b', OUT, 1);
        break;
      }
      default: {
        body('#3a4254');
        D.screen(fx + 0.12, fy + 0.1, fw - 0.24, fh - 0.4, '#1f5f9a');
      }
    }
  }

  /* ================= dutos ================= */
  function drawVents(D, c, P) {
    for (const v of M.VENTS) {
      D.rshadow(v.x - 0.72, v.y - 0.46, 1.44, 0.92, 0.25);
      D.box(v.x - 0.72, v.y - 0.46, 1.44, 0.92, '#5b6476', OUT, 0.14);
      D.box(v.x - 0.6, v.y - 0.36, 1.2, 0.72, '#12151c', OUT, 0.1);
      for (let i = 1; i < 6; i++) D.line(v.x - 0.6 + i * 0.2, v.y - 0.3, v.x - 0.6 + i * 0.2, v.y + 0.3, '#39414f', 0.07);
      for (const [dx, dy] of [[-0.63, -0.39], [0.63, -0.39], [-0.63, 0.39], [0.63, 0.39]]) D.bolt(v.x + dx, v.y + dy);
    }
  }

  /* ================= camada animada (desenhada a cada quadro, só o que está na tela) ================= */
  const rnd = (s) => {
    const x = Math.sin(s * 127.1) * 43758.5453;
    return x - Math.floor(x);
  };
  function drawLive(ctx, S, ppt, t, g, x0, y0, vw, vh) {
    const P = ppt;
    const shieldsOn = g && g.players.some((p) => p.visual && p.visual.type === 'shields');
    const reactorSab = g && g.sab && g.sab.type === 'reactor';
    const lightsSab = g && g.sab && g.sab.type === 'lights';
    const o2Sab = g && g.sab && g.sab.type === 'o2';
    const commsSab = g && g.sab && g.sab.type === 'comms';
    for (const it of LIVE) {
      const ex = (it.r || it.w || 2) + 2;
      if (it.x < x0 - ex || it.x > x0 + vw + ex || it.y < y0 - ex || it.y > y0 + vh + ex) continue;
      const p = S(it.x, it.y);
      switch (it.kind) {
        case 'reactor': {
          const r = it.r;
          const pulse = 0.5 + Math.sin(t * (reactorSab ? 9 : 2.2)) * 0.5;
          const core = reactorSab ? `rgba(255,90,70,${0.35 + pulse * 0.35})` : `rgba(120,200,255,${0.25 + pulse * 0.3})`;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6 * P);
          grd.addColorStop(0, core);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - r * 1.6 * P, p.y - r * 1.6 * P, r * 3.2 * P, r * 3.2 * P);
          ctx.save();
          ctx.translate(p.x, p.y);
          for (let k = 0; k < 3; k++) {
            ctx.rotate(t * (0.6 + k * 0.35) * (k % 2 ? -1 : 1));
            ctx.strokeStyle = reactorSab ? 'rgba(255,160,140,0.8)' : 'rgba(170,230,255,0.75)';
            ctx.lineWidth = Math.max(1.5, P * 0.06);
            ctx.beginPath();
            ctx.arc(0, 0, r * (0.38 + k * 0.1) * P, 0, Math.PI * 1.2);
            ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = reactorSab ? '#ffd0c8' : '#eaf8ff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * (0.16 + pulse * 0.05) * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'fan': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * 7);
          ctx.fillStyle = '#6b7488';
          ctx.strokeStyle = OUT;
          ctx.lineWidth = Math.max(1, P * 0.04);
          for (let k = 0; k < 6; k++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.ellipse(it.r * 0.5 * P, 0, it.r * 0.48 * P, it.r * 0.16 * P, 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.restore();
          ctx.fillStyle = '#9aa6bd';
          ctx.beginPath();
          ctx.arc(p.x, p.y, it.r * 0.22 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'engineGlow': {
          const a = 0.18 + Math.sin(t * 5 + it.y) * 0.05;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, it.h * 0.55 * P);
          grd.addColorStop(0, `rgba(255,170,80,${a})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - it.h * 0.55 * P, p.y - it.h * 0.55 * P, it.h * 1.1 * P, it.h * 1.1 * P);
          break;
        }
        case 'exhaust': {
          /* chama do escape tremendo (vai para fora da nave, por cima da parede) */
          for (let k = 0; k < 3; k++) {
            const len = (0.9 + Math.sin(t * 17 + k * 2) * 0.2 + k * 0.25) * P;
            const hh = (it.h * (0.55 - k * 0.15)) * P;
            ctx.fillStyle = ['rgba(255,120,40,0.55)', 'rgba(255,190,80,0.75)', 'rgba(255,245,200,0.9)'][k];
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - hh / 2);
            ctx.quadraticCurveTo(p.x - len, p.y, p.x, p.y + hh / 2);
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'lamp': {
          const f = lightsSab ? 0.1 : 0.75 + (rnd(it.seed + Math.floor(t * 8)) > 0.985 ? -0.5 : 0);
          ctx.fillStyle = `rgba(255,248,220,${f})`;
          ctx.fillRect(p.x - 0.22 * P, p.y - 0.06 * P, 0.44 * P, 0.1 * P);
          break;
        }
        case 'camFeed': {
          const w = it.w * P, h = it.h * P;
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x + 0.08 * P, p.y + 0.08 * P, w - 0.16 * P, h - 0.16 * P);
          ctx.clip();
          if (commsSab) {
            for (let k = 0; k < 30; k++) {
              ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`;
              ctx.fillRect(p.x + Math.random() * w, p.y + Math.random() * h, 2, 2);
            }
          } else {
            ctx.fillStyle = 'rgba(120,255,190,0.25)';
            ctx.fillRect(p.x, p.y + ((t * 0.6 + it.i * 0.3) % 1) * h, w, 2);
            ctx.fillStyle = 'rgba(160,255,210,0.6)';
            ctx.fillRect(p.x + w * 0.1, p.y + h * 0.55, w * 0.8, 1.5);
            const bx = p.x + w * (0.2 + ((Math.sin(t * 0.7 + it.i * 2) + 1) / 2) * 0.6);
            ctx.beginPath();
            ctx.arc(bx, p.y + h * 0.45, h * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          ctx.fillStyle = Math.sin(t * 3 + it.i) > 0 ? '#ff4040' : '#5a1010';
          ctx.fillRect(p.x + w - 0.2 * P, p.y + 0.12 * P, 0.08 * P, 0.08 * P);
          break;
        }
        case 'leds': {
          for (let k = 0; k < 4; k++) {
            const on = rnd(it.seed * 10 + k + Math.floor(t * (2 + (it.seed % 3)))) > 0.4;
            ctx.fillStyle = on ? ['#4be38b', '#4aa3ff', '#ffd23b', '#4be38b'][k] : 'rgba(40,60,50,0.8)';
            ctx.fillRect(p.x + k * (it.w / 4) * P, p.y - 0.03 * P, 0.08 * P, 0.07 * P);
          }
          break;
        }
        case 'tubes': {
          for (let k = 0; k < 5; k++) {
            const by = p.y + (0.7 - ((t * 0.5 + k * 0.23) % 1) * 0.35) * P;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(p.x + (0.09 + k * 0.26) * P, by, 0.025 * P, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'scanPad': {
          const busy = g && g.players.some((q) => q.visual && q.visual.type === 'scan');
          const k = (t * (busy ? 1.4 : 0.5)) % 1;
          ctx.strokeStyle = `rgba(90,255,170,${(1 - k) * (busy ? 0.9 : 0.45)})`;
          ctx.lineWidth = Math.max(1.5, P * 0.05);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, (0.5 + k * 0.6) * P, (0.33 + k * 0.4) * P, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'button': {
          const a = 0.25 + Math.sin(t * 3) * 0.12;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 1.1 * P);
          grd.addColorStop(0, `rgba(255,60,60,${a})`);
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - 1.1 * P, p.y - 1.1 * P, 2.2 * P, 2.2 * P);
          break;
        }
        case 'vendLight': {
          ctx.fillStyle = `rgba(200,235,255,${0.08 + Math.sin(t * 1.5 + it.x) * 0.05})`;
          ctx.fillRect(p.x, p.y, it.w * P, 0.66 * P);
          break;
        }
        case 'radar': {
          const w = it.w * P, h = it.h * P, cx = p.x + w / 2, cy = p.y + h / 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x + 2, p.y + 2, w - 4, h - 4);
          ctx.clip();
          ctx.strokeStyle = 'rgba(90,255,200,0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(t * 3) * w, cy + Math.sin(t * 3) * w);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(90,255,200,0.35)';
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.3, cy);
          ctx.lineTo(cx + w * 0.3, cy);
          ctx.moveTo(cx, cy - h * 0.4);
          ctx.lineTo(cx, cy + h * 0.4);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'leaves': {
          for (let k = 0; k < 4; k++) {
            const sway = Math.sin(t * 1.6 + k + it.seed) * 0.06 * P;
            ctx.fillStyle = 'rgba(140,230,110,0.55)';
            ctx.beginPath();
            ctx.ellipse(p.x + (k * it.w / 3) * P + sway, p.y + 0.05 * P, 0.1 * P, 0.2 * P, 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'treeSway': {
          const sway = Math.sin(t * 1.2) * 0.05 * P;
          ctx.fillStyle = 'rgba(150,235,120,0.35)';
          ctx.beginPath();
          ctx.arc(p.x + sway, p.y - 0.3 * P, 0.35 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bubbles': {
          for (let k = 0; k < 3; k++) {
            const by = p.y + (it.h - ((t * 0.7 + k * 0.33) % 1) * it.h) * P - it.h * 0.5 * P;
            ctx.fillStyle = it.col;
            ctx.beginPath();
            ctx.arc(p.x + (Math.sin(k * 3 + t) * it.w * 0.4) * P, by, 0.035 * P, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'chart': {
          const w = it.w * P, h = it.h * P;
          ctx.fillStyle = 'rgba(200,230,255,0.8)';
          const pts = [[0.15, 0.8], [0.35, 0.55], [0.55, 0.6], [0.8, 0.25]];
          ctx.strokeStyle = 'rgba(95,214,255,0.8)';
          ctx.setLineDash([3, 3]);
          ctx.lineDashOffset = -t * 8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          pts.forEach(([u, v], i) => (i ? ctx.lineTo(p.x + u * w, p.y + v * h) : ctx.moveTo(p.x + u * w, p.y + v * h)));
          ctx.stroke();
          ctx.setLineDash([]);
          for (const [u, v] of pts) ctx.fillRect(p.x + u * w - 1.5, p.y + v * h - 1.5, 3, 3);
          break;
        }
        case 'crosshair': {
          const r = it.r * P;
          ctx.strokeStyle = 'rgba(95,214,255,0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
          ctx.moveTo(p.x - r, p.y);
          ctx.lineTo(p.x + r, p.y);
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x, p.y + r);
          ctx.stroke();
          ctx.fillStyle = '#ffd23b';
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(t * 1.3) * r * 0.4, p.y + Math.sin(t * 1.9) * r * 0.4, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'holoPlanet': {
          const r = it.r * P;
          const grd = ctx.createRadialGradient(p.x - r * 0.2, p.y - r * 0.2, 0, p.x, p.y, r * 0.7);
          grd.addColorStop(0, 'rgba(160,230,255,0.85)');
          grd.addColorStop(1, 'rgba(40,120,200,0.25)');
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 0.25 * P, r * 0.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(160,230,255,0.7)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y - 0.25 * P, r * 0.85, r * 0.25, Math.sin(t * 0.5) * 0.3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(t) * r * 0.85, p.y - 0.25 * P + Math.sin(t) * r * 0.25, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shields': {
          const a = shieldsOn ? 0.55 + Math.sin(t * 8) * 0.25 : 0.18 + Math.sin(t * 1.5) * 0.06;
          for (let i = 0; i < 7; i++) {
            const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
            const hx = i === 6 ? p.x : p.x + Math.cos(ang) * 0.82 * P, hy = i === 6 ? p.y : p.y + Math.sin(ang) * 0.82 * P;
            ctx.fillStyle = `rgba(130,170,255,${a * (0.7 + 0.3 * Math.sin(t * 2 + i))})`;
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const b = (k / 6) * Math.PI * 2 + Math.PI / 6;
              const px = hx + Math.cos(b) * 0.36 * P, py = hy + Math.sin(b) * 0.36 * P;
              if (k) ctx.lineTo(px, py);
              else ctx.moveTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
        case 'coil': {
          ctx.strokeStyle = `rgba(160,190,255,${0.3 + Math.abs(Math.sin(t * 4 + it.y)) * 0.5})`;
          ctx.lineWidth = Math.max(1, P * 0.04);
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, it.r * 0.7 * P, it.r * 0.3 * P, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'terminal': {
          const w = it.w * P, h = it.h * P;
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x + 3, p.y + 3, w - 6, h - 6);
          ctx.clip();
          ctx.fillStyle = commsSab ? 'rgba(255,90,90,0.6)' : 'rgba(170,240,255,0.55)';
          for (let k = 0; k < 5; k++) {
            const yy = p.y + 4 + ((k * 0.2 + t * 0.15 + it.seed * 0.1) % 1) * (h - 8);
            ctx.fillRect(p.x + 5, yy, (0.3 + rnd(k + it.seed * 5 + Math.floor(t)) * 0.6) * (w - 10), 1.5);
          }
          ctx.restore();
          break;
        }
        case 'dish': {
          const a = t * 0.4;
          ctx.strokeStyle = '#8fa6c9';
          ctx.lineWidth = Math.max(1.5, P * 0.07);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(a) * it.r * 0.9 * P, p.y + Math.sin(a) * it.r * 0.9 * P);
          ctx.stroke();
          ctx.fillStyle = commsSab ? '#ff4040' : '#4be38b';
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * it.r * 0.9 * P, p.y + Math.sin(a) * it.r * 0.9 * P, 0.1 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'compactor': {
          const busy = g && g.players.some((q) => q.visual && q.visual.type === 'garbage');
          if (!busy) break;
          /* alavanca puxada: a tampa abre e o lixo despenca na calha, com a luz de alerta girando */
          const w = it.w * P, h = it.h * P;
          ctx.fillStyle = 'rgba(0,0,0,0.55)';
          ctx.fillRect(p.x, p.y, w, h);
          ctx.save();
          ctx.beginPath();
          ctx.rect(p.x, p.y, w, h);
          ctx.clip();
          const TRASH = ['#3f8f4a', '#c9c9c9', '#e8d44d', '#f2f2ec', '#8a5a2b', '#5fae57', '#b84a3a'];
          for (let k = 0; k < 14; k++) {
            const fall = (t * (1.3 + rnd(k) * 0.6) + rnd(k * 2.3)) % 1;
            const x = p.x + (0.08 + rnd(k * 5.1) * 0.84) * w, y = p.y - 0.2 * P + fall * (h + 0.4 * P);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(t * (2 + rnd(k) * 4) + k);
            ctx.fillStyle = TRASH[k % TRASH.length];
            const kind = k % 4;
            if (kind === 0) ctx.fillRect(-0.07 * P, -0.14 * P, 0.14 * P, 0.28 * P);
            else if (kind === 1) {
              ctx.beginPath();
              ctx.arc(0, 0, 0.1 * P, 0, Math.PI * 2);
              ctx.fill();
            } else if (kind === 2) {
              ctx.beginPath();
              ctx.ellipse(0, 0, 0.16 * P, 0.06 * P, 0.4, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.beginPath();
              ctx.moveTo(-0.12 * P, -0.08 * P);
              ctx.lineTo(0.12 * P, -0.1 * P);
              ctx.lineTo(0.08 * P, 0.1 * P);
              ctx.lineTo(-0.1 * P, 0.08 * P);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }
          ctx.restore();
          const lx = p.x + w + 0.12 * P, ly = p.y - 0.05 * P;
          const grd = ctx.createRadialGradient(lx, ly, 0, lx, ly, 0.9 * P);
          const on = Math.sin(t * 9) > 0;
          grd.addColorStop(0, on ? 'rgba(255,190,40,0.6)' : 'rgba(255,190,40,0.15)');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(lx - 0.9 * P, ly - 0.9 * P, 1.8 * P, 1.8 * P);
          ctx.fillStyle = on ? '#ffc93a' : '#8a6a1a';
          ctx.beginPath();
          ctx.arc(lx, ly, 0.1 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'holoMap': {
          const w = it.w * P, h = it.h * P;
          ctx.fillStyle = `rgba(90,255,170,${0.08 + Math.sin(t * 2) * 0.04})`;
          ctx.fillRect(p.x, p.y, w, h);
          ctx.fillStyle = 'rgba(160,255,200,0.3)';
          ctx.fillRect(p.x, p.y + ((t * 0.4) % 1) * h, w, 2);
          break;
        }
        case 'sparks': {
          const cycle = t % 3.7;
          if (cycle < 0.35) {
            ctx.strokeStyle = 'rgba(255,240,150,0.9)';
            ctx.lineWidth = 1.5;
            for (let k = 0; k < 5; k++) {
              const a = rnd(k + Math.floor(t * 10)) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + Math.cos(a) * 0.5 * P * (0.5 + rnd(k * 3 + Math.floor(t * 10))), p.y + Math.sin(a) * 0.5 * P);
              ctx.stroke();
            }
          }
          break;
        }
        case 'charge': {
          const lvl = (Math.sin(t * 0.8 + it.seed) + 1) / 2;
          ctx.fillStyle = lvl > 0.3 ? '#4be38b' : '#ffb347';
          ctx.fillRect(p.x, p.y, it.w * P * (0.2 + lvl * 0.8), 0.3 * P);
          break;
        }
        case 'progress': {
          const k = (t * 0.25 + it.seed * 0.13) % 1;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(p.x, p.y, it.w * P, 0.06 * P);
          ctx.fillStyle = '#4be38b';
          ctx.fillRect(p.x, p.y, it.w * P * k, 0.06 * P);
          break;
        }
        case 'blink': {
          const on = Math.sin(t * 3 + it.seed) > 0;
          ctx.fillStyle = on ? it.col : 'rgba(40,40,40,0.9)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.07 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'dial': {
          const a = t * (0.8 + it.seed * 0.6) + it.seed;
          ctx.strokeStyle = '#e24b4b';
          ctx.lineWidth = Math.max(1.5, P * 0.04);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(a) * it.r * P, p.y + Math.sin(a) * it.r * P);
          ctx.stroke();
          break;
        }
        case 'filterLeaves': {
          for (let k = 0; k < 3; k++) {
            const u = (t * 0.35 + k / 3) % 1;
            ctx.fillStyle = `rgba(120,210,90,${0.7 * (1 - u)})`;
            ctx.beginPath();
            ctx.ellipse(p.x + Math.sin(u * 6 + k) * 0.35 * P, p.y - u * 0.6 * P, 0.1 * P, 0.05 * P, u * 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'simon': {
          const k = Math.floor(t * 1.5) % 9;
          ctx.fillStyle = reactorSab ? 'rgba(255,90,90,0.9)' : 'rgba(90,200,255,0.9)';
          ctx.fillRect(p.x + (k % 3) * 0.32 * P + 2, p.y + Math.floor(k / 3) * 0.24 * P + 2, 0.26 * P - 4, 0.2 * P - 4);
          break;
        }
        case 'chute': {
          const busy = g && g.players.some((q) => q.visual && q.visual.type === 'garbage' && q.busy && q.busy.station === it.id);
          if (!busy) break;
          ctx.fillStyle = 'rgba(160,140,90,0.9)';
          for (let k = 0; k < 4; k++) ctx.fillRect(p.x + ((k * 0.3 + t) % 1) * it.w * P, p.y + ((t * 2 + k * 0.25) % 1) * 0.5 * P, 0.14 * P, 0.12 * P);
          break;
        }
        case 'alignGauge': {
          const w = it.w * P, h = it.h * P;
          ctx.strokeStyle = 'rgba(255,180,70,0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x + w * 0.15, p.y + h / 2, h * 0.9, -0.6, 0.6);
          ctx.stroke();
          const a = Math.sin(t * 0.9) * 0.5;
          ctx.fillStyle = '#ffd23b';
          ctx.beginPath();
          ctx.arc(p.x + w * 0.15 + Math.cos(a) * h * 0.9, p.y + h / 2 + Math.sin(a) * h * 0.9, 2.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'handScan': {
          if (!reactorSab) break;
          const a = 0.35 + Math.sin(t * 10) * 0.25;
          ctx.fillStyle = `rgba(255,70,70,${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.55 * P, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'keypadScreen': {
          if (!o2Sab) break;
          ctx.fillStyle = Math.sin(t * 8) > 0 ? 'rgba(255,80,80,0.85)' : 'rgba(120,20,20,0.85)';
          ctx.fillRect(p.x + 3, p.y + 3, 0.8 * P - 6, 0.22 * P - 6);
          break;
        }
        case 'lightsSab': {
          if (!lightsSab) break;
          ctx.fillStyle = `rgba(255,80,40,${0.3 + Math.sin(t * 10) * 0.25})`;
          ctx.fillRect(p.x, p.y - 0.1 * P, it.w * P, 0.1 * P);
          break;
        }
        case 'radio': {
          const a = commsSab ? t * 6 : Math.sin(t * 0.8) * 0.8;
          ctx.strokeStyle = commsSab ? '#ff5a5a' : '#4be38b';
          ctx.lineWidth = Math.max(1.5, P * 0.05);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + Math.cos(a) * 0.22 * P, p.y + Math.sin(a) * 0.22 * P);
          ctx.stroke();
          break;
        }
        case 'alarm': {
          const on = (g && (g.sabCritical && g.sabCritical())) ? Math.sin(t * 10) > 0 : Math.sin(t * 1.5) > 0.9;
          if (!on) break;
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 1.2 * P);
          grd.addColorStop(0, 'rgba(255,60,60,0.8)');
          grd.addColorStop(1, 'rgba(255,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(p.x - 1.2 * P, p.y - 1.2 * P, 2.4 * P, 2.4 * P);
          break;
        }
        case 'statusBoard': {
          const w = it.w * P, h = it.h * P;
          ctx.strokeStyle = 'rgba(90,255,170,0.75)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k <= 30; k++) {
            const u = k / 30;
            const v = 0.5 + Math.sin(u * 12 + t * 2) * 0.18 + Math.sin(u * 31 + t * 5) * 0.06;
            if (k) ctx.lineTo(p.x + 4 + u * (w * 0.55), p.y + v * h);
            else ctx.moveTo(p.x + 4, p.y + v * h);
          }
          ctx.stroke();
          for (let k = 0; k < 5; k++) {
            const bh = (0.25 + ((Math.sin(t * 1.3 + k) + 1) / 2) * 0.55) * h;
            ctx.fillStyle = 'rgba(90,255,170,0.55)';
            ctx.fillRect(p.x + w * 0.65 + k * w * 0.065, p.y + h - bh - 3, w * 0.045, bh);
          }
          break;
        }
        case 'wave': {
          const w = it.w * P, h = it.h * P;
          ctx.strokeStyle = commsSab ? 'rgba(255,90,90,0.9)' : 'rgba(190,150,255,0.85)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k <= 40; k++) {
            const u = k / 40;
            const v = commsSab ? 0.5 + (Math.random() - 0.5) * 0.7 : 0.5 + Math.sin(u * 25 + t * 6) * 0.3 * Math.sin(u * 3.1);
            if (k) ctx.lineTo(p.x + 3 + u * (w - 6), p.y + v * h);
            else ctx.moveTo(p.x + 3, p.y + v * h);
          }
          ctx.stroke();
          break;
        }
        case 'breakers': {
          for (let k = 0; k < 6; k++) {
            const up = lightsSab ? k % 2 === 0 : rnd(it.seed + k) > 0.3;
            ctx.fillStyle = up ? '#4be38b' : '#e24b4b';
            ctx.fillRect(p.x + k * 0.28 * P + 1, p.y + (up ? 0.03 : 0.22) * P, 0.18 * P - 2, 0.15 * P);
          }
          break;
        }
        case 'starMap': {
          const w = it.w * P, h = it.h * P;
          for (let k = 0; k < 12; k++) {
            const u = (rnd(k + it.seed) + t * 0.02) % 1, v = rnd(k * 2.3 + it.seed);
            ctx.fillStyle = `rgba(190,230,255,${0.4 + 0.4 * Math.sin(t * 2 + k)})`;
            ctx.fillRect(p.x + 3 + u * (w - 6), p.y + 3 + v * (h - 6), 2, 2);
          }
          ctx.strokeStyle = 'rgba(95,214,255,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x + w * 0.4, p.y + h * 0.25, w * 0.2, h * 0.5);
          break;
        }
        case 'energy': {
          const w = it.w * P;
          for (let k = 0; k < 3; k++) {
            const u = ((t * 0.6 + k / 3) % 1) * w;
            ctx.fillStyle = shieldsOn ? 'rgba(170,200,255,0.95)' : 'rgba(130,160,255,0.6)';
            ctx.beginPath();
            ctx.arc(p.x + u, p.y, 0.08 * P, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'heart': {
          const w = it.w * P;
          ctx.strokeStyle = '#4be38b';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let k = 0; k <= 12; k++) {
            const u = k / 12;
            const ph = (u + t * 0.8 + it.seed) % 1;
            const v = ph > 0.45 && ph < 0.55 ? -0.12 : ph > 0.55 && ph < 0.6 ? 0.08 : 0;
            if (k) ctx.lineTo(p.x + u * w, p.y + v * P);
            else ctx.moveTo(p.x, p.y + v * P);
          }
          ctx.stroke();
          break;
        }
        case 'reel': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(t * (it.seed ? -2 : 2));
          ctx.fillStyle = '#5b6476';
          for (let k = 0; k < 3; k++) {
            ctx.rotate((Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.arc(it.r * 0.55 * P, 0, it.r * 0.22 * P, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        default:
          break;
      }
    }
    /* janelas retas: estrelas correndo (Armas e Navegação) */
    for (const wdw of WINDOW_RECTS) {
      const [wx, wy, ww, wh, speed] = wdw;
      if (wx > x0 + vw || wx + ww < x0 || wy > y0 + vh || wy + wh < y0) continue;
      const q = S(wx, wy);
      ctx.save();
      ctx.beginPath();
      ctx.rect(q.x, q.y, ww * P, wh * P);
      ctx.clip();
      for (let k = 0; k < 14; k++) {
        const u = (rnd(k * 7.1 + wx) + t * speed * (0.3 + rnd(k) * 0.7)) % 1;
        const v = rnd(k * 3.3 + wy);
        ctx.fillStyle = `rgba(255,255,255,${0.4 + rnd(k * 1.7) * 0.6})`;
        const sx = speed > 0 ? q.x + u * ww * P : q.x + v * ww * P;
        const sy = speed > 0 ? q.y + v * wh * P : q.y + u * wh * P;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.restore();
    }
  }
  /* janelas retas desenhadas na face das paredes: [x, y, w, h, velocidade das estrelas] */
  const WINDOW_RECTS = [[95.2, 2.5, 8, 1.25, 0.08], [134.12, 34.3, 0.76, 3.4, -0.25]];
  function windows(D, c, P) {
    for (const [x, y, w, h] of WINDOW_RECTS) {
      D.box(x - 0.1, y - 0.08, w + 0.2, h + 0.16, '#5d6f96', OUT, 0.12);
      D.box(x, y, w, h, '#040810', OUT, 0.08);
      c.save();
      D.rr(x, y, w, h, 0.08);
      c.clip();
      D.stars(x, y, w, h, Math.round(w * h * 6));
      c.fillStyle = 'rgba(120,180,255,0.08)';
      c.fillRect(x * P, y * P, w * P, h * P);
      c.restore();
    }
    /* canhões de Armas vistos pela janela */
    for (const [bx, len] of [[98.2, 2.2], [100.8, 2.2]]) {
      D.box(bx - 0.35, 3.15, 0.7, 0.55, '#6b7488', OUT, 0.08);
      D.box(bx - 0.1, 3.2 - len * 0.35, 0.2, len * 0.35 + 0.05, '#8a94a8', OUT, 0.05);
    }
  }
  const _build = build;
  function buildAll(PX) {
    const cv = _build(PX);
    const c = cv.getContext('2d');
    windows(mkDraw(c, PX), c, PX);
    return cv;
  }

  AU.Decor = { build: buildAll, SHIELD_FX, drawLive, camPos, LIVE };
})();

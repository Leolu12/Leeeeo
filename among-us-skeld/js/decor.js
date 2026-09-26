/* Desenho estático da Skeld: pisos com textura por sala, paredes, cantos chanfrados, móveis e consoles. */
(function () {
  'use strict';
  const AU = window.AU;
  const M = AU.Map;
  const W = M.W, H = M.H;

  const FLOORS = {
    cafeteria: ['#5b6272', '#555c6b', 'tiles2'],
    medbay: ['#2f565d', '#2a4e55', 'tiles'],
    electrical: ['#3a372f', '#312e27', 'grate'],
    storage: ['#4f4739', '#474032', 'planks'],
    reactor: ['#2b3547', '#262f3f', 'plates'],
    upperEngine: ['#3c4352', '#363c4a', 'plates'],
    lowerEngine: ['#3c4352', '#363c4a', 'plates'],
    security: ['#343a49', '#2f3442', 'tiles'],
    admin: ['#394559', '#343f52', 'carpet'],
    weapons: ['#383e54', '#33384d', 'plates'],
    o2: ['#2f4b44', '#29433d', 'tiles'],
    navigation: ['#32405a', '#2d3a52', 'plates'],
    shields: ['#3a3e57', '#343850', 'hexes'],
    comms: ['#373d4f', '#323848', 'tiles'],
  };
  const SHIELD_FX = { x: 101.5, y: 55.6 };
  const LABELS = {
    cafeteria: [69, 23.3], upperEngine: [16, 18.6], lowerEngine: [16, 52.4], reactor: [10.6, 30.6],
    security: [27.5, 38.5], medbay: [45.5, 32.5], electrical: [43, 46.8], storage: [63, 54.2],
    admin: [80, 34.35], o2: [90, 25.2], weapons: [100, 15.6], navigation: [122.9, 42.4],
    shields: [101.5, 63.8], comms: [81, 68.4],
  };
  const WALL = '#141925', FACE = '#3b4560', FACE_HI = '#56627f';

  function build(PX) {
    const cv = document.createElement('canvas');
    cv.width = W * PX;
    cv.height = H * PX;
    const c = cv.getContext('2d');
    const P = PX;
    const D = mkDraw(c, P);

    /* piso */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      const a = M.AREAS[M.areaIdx[y * W + x]];
      if (a.kind === 'room') {
        const [base, alt, kind] = FLOORS[a.id] || [a.floor, a.floor, 'tiles'];
        floorTile(c, P, x, y, base, alt, kind);
      } else {
        c.fillStyle = (x + y) % 2 ? '#2c3241' : '#2a303e';
        c.fillRect(x * P, y * P, P, P);
      }
    }
    /* faixa central dos corredores */
    for (const cdr of M.CORRIDORS) {
      for (const [x, y, w, h] of cdr.rects) {
        c.fillStyle = 'rgba(255,208,70,0.07)';
        if (w >= h) c.fillRect(x * P, (y + h / 2 - 0.08) * P, w * P, 0.16 * P);
        else c.fillRect((x + w / 2 - 0.08) * P, y * P, 0.16 * P, h * P);
        c.fillStyle = 'rgba(0,0,0,0.18)';
        if (w >= h) {
          c.fillRect(x * P, y * P, w * P, 0.18 * P);
          c.fillRect(x * P, (y + h - 0.18) * P, w * P, 0.18 * P);
        } else {
          c.fillRect(x * P, y * P, 0.18 * P, h * P);
          c.fillRect((x + w - 0.18) * P, y * P, 0.18 * P, h * P);
        }
      }
    }
    /* paredes (visão 3/4: a parede de cima mostra a face) */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (M.isFloor(x + dx, y + dy)) near = true;
      if (!near) continue;
      c.fillStyle = WALL;
      c.fillRect(x * P, y * P, P, P);
      if (M.isFloor(x, y + 1)) {
        c.fillStyle = FACE;
        c.fillRect(x * P, y * P + P * 0.2, P, P * 0.8);
        c.fillStyle = FACE_HI;
        c.fillRect(x * P, y * P + P * 0.2, P, P * 0.1);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillRect(x * P, y * P + P * 0.86, P, P * 0.14);
        if (x % 3 === 0) {
          c.fillStyle = 'rgba(0,0,0,0.18)';
          c.fillRect(x * P, y * P + P * 0.3, P * 0.06, P * 0.56);
        }
      }
    }
    /* contorno entre piso e parede (os cantos em diagonal são desenhados depois) */
    c.strokeStyle = '#0a0d15';
    c.lineWidth = 3;
    const seg = (x1, y1, x2, y2) => {
      c.beginPath();
      c.moveTo(x1 * P, y1 * P);
      c.lineTo(x2 * P, y2 * P);
      c.stroke();
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      const a = M.AREAS[M.areaIdx[y * W + x]];
      const diag = (nx, ny) => {
        if (!a || !a.cut) return false;
        const [rx, ry, rw, rh] = a.rect;
        return nx >= rx && ny >= ry && nx < rx + rw && ny < ry + rh && M.inCut(a, nx, ny);
      };
      if (!M.isFloor(x - 1, y) && !diag(x - 1, y)) seg(x, y, x, y + 1);
      if (!M.isFloor(x + 1, y) && !diag(x + 1, y)) seg(x + 1, y, x + 1, y + 1);
      if (!M.isFloor(x, y + 1) && !diag(x, y + 1)) seg(x, y + 1, x + 1, y + 1);
    }
    for (const r of M.ROOMS) if (r.cut) drawCuts(c, P, r);
    drawRooms(D, c, P);
    drawStations(D, c, P);
    drawVents(D);
    /* nomes das salas, em pontos livres de móveis e consoles */
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.font = `800 ${P * 0.74}px "Chakra Petch", system-ui, sans-serif`;
    c.fillStyle = 'rgba(230,236,255,0.17)';
    for (const r of M.ROOMS) {
      const [x, y, w] = r.rect;
      const [lx, ly] = LABELS[r.id] || [x + w / 2, y + 0.35];
      c.fillText(r.name.toUpperCase(), lx * P, ly * P);
    }
    return cv;
  }

  /* Canto chanfrado: a parede segue uma diagonal lisa em vez da escadinha de tiles.
     Coordenadas locais: du = distância à parede lateral, dv = distância à parede de cima/baixo. */
  const WINDOWS = { navigation: true, weapons: true };
  function drawCuts(c, P, r) {
    const [x, y, w, h] = r.rect;
    const fl = FLOORS[r.id] || [r.floor, r.floor, 'tiles'];
    /* recorte: anel da sala, sem invadir o piso de corredores vizinhos */
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
      /* faixa entre as diagonais du+dv = lo e du+dv = hi, limitada ao anel da sala */
      const band = (lo, hi) => poly([[hi + 1, -1], [lo + 1, -1], [-1, lo + 1], [-1, hi + 1]]);
      const a = k + 0.5, b = k - 2.05;
      c.save();
      clipRoom();
      /* 1) meia-lajota de piso do lado de dentro da diagonal */
      c.save();
      poly([[a, 0], [k + 1.05, 0], [0, k + 1.05], [0, a]]);
      c.clip();
      for (let i = 0; i < k; i++) {
        const j = k - 1 - i;
        const tx = right ? x + w - 1 - i : x + i, ty = bottom ? y + h - 1 - j : y + j;
        floorTile(c, P, tx, ty, fl[0], fl[1], fl[2]);
      }
      c.restore();
      /* 2) parede diagonal */
      band(b, a);
      c.fillStyle = WALL;
      c.fill();
      if (WINDOWS[r.id]) {
        band(b + 0.45, a - (bottom ? 0.45 : 1.0));
        c.fillStyle = '#060a14';
        c.fill();
        c.save();
        c.clip();
        for (let i = 0; i < k * 3; i++) {
          const t = Math.random() * (k + 2) - 1, off = b + 0.5 + Math.random() * 1.2;
          c.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.6})`;
          c.fillRect(X(t) - 1, Y(off - t) - 1, 2, 2);
        }
        c.restore();
        band(b + 0.45, a - (bottom ? 0.45 : 1.0));
        c.strokeStyle = '#2d3850';
        c.lineWidth = 2;
        c.stroke();
      }
      /* 3) face da parede (cantos de cima) ou contorno (cantos de baixo) */
      if (!bottom) {
        band(a - 0.8, a);
        c.fillStyle = FACE;
        c.fill();
        band(a - 0.8, a - 0.7);
        c.fillStyle = FACE_HI;
        c.fill();
        band(a - 0.14, a);
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fill();
      } else {
        c.strokeStyle = '#0a0d15';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(X(a + 1), Y(-1));
        c.lineTo(X(-1), Y(a + 1));
        c.stroke();
      }
      c.restore();
    }
  }

  function floorTile(c, P, x, y, base, alt, kind) {
    const px = x * P, py = y * P;
    c.fillStyle = base;
    c.fillRect(px, py, P, P);
    if (kind === 'tiles') {
      if ((x + y) % 2) {
        c.fillStyle = alt;
        c.fillRect(px, py, P, P);
      }
      c.strokeStyle = 'rgba(255,255,255,0.05)';
      c.lineWidth = 1;
      c.strokeRect(px + 0.5, py + 0.5, P - 1, P - 1);
    } else if (kind === 'tiles2') {
      if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) {
        c.fillStyle = alt;
        c.fillRect(px, py, P, P);
      }
      c.fillStyle = 'rgba(255,255,255,0.05)';
      if (x % 2 === 0) c.fillRect(px, py, 1, P);
      if (y % 2 === 0) c.fillRect(px, py, P, 1);
    } else if (kind === 'plates') {
      c.fillStyle = 'rgba(0,0,0,0.22)';
      if (x % 3 === 0) c.fillRect(px, py, 1.5, P);
      if (y % 3 === 0) c.fillRect(px, py, P, 1.5);
      if (x % 3 === 0 && y % 3 === 0) {
        c.fillStyle = 'rgba(255,255,255,0.14)';
        c.fillRect(px + P * 0.15, py + P * 0.15, P * 0.1, P * 0.1);
      }
    } else if (kind === 'grate') {
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.moveTo(px, py + (i + 0.5) * (P / 3));
        c.lineTo(px + P, py + (i + 0.5) * (P / 3));
        c.stroke();
      }
      if (x % 2 === 0) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(px, py, 1.5, P);
      }
    } else if (kind === 'planks') {
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(px, py + P * 0.49, P, 1.5);
      c.fillRect(px, py, P, 1);
      if ((x + (y % 2) * 2) % 4 === 0) c.fillRect(px, py, 1.5, P * 0.5);
      if ((x + 1 + (y % 2) * 2) % 4 === 0) c.fillRect(px, py + P * 0.5, 1.5, P * 0.5);
    } else if (kind === 'carpet') {
      c.fillStyle = 'rgba(255,255,255,0.025)';
      if ((x + y) % 2) c.fillRect(px, py, P, P);
    } else if (kind === 'hexes') {
      if ((x + y) % 3 === 0) {
        c.strokeStyle = 'rgba(140,160,255,0.08)';
        c.lineWidth = 1;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const hx = px + P / 2 + Math.cos(a) * P * 0.42, hy = py + P / 2 + Math.sin(a) * P * 0.42;
          if (k) c.lineTo(hx, hy);
          else c.moveTo(hx, hy);
        }
        c.closePath();
        c.stroke();
      }
    }
  }

  /* Primitivas de desenho em coordenadas de tile. */
  function mkDraw(c, P) {
    const D = {};
    D.rr = (x, y, w, h, r) => {
      c.beginPath();
      if (c.roundRect) c.roundRect(x * P, y * P, w * P, h * P, (r || 0.15) * P);
      else c.rect(x * P, y * P, w * P, h * P);
    };
    D.box = (x, y, w, h, fill, stroke, r) => {
      D.rr(x, y, w, h, r);
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2;
        c.stroke();
      }
    };
    D.circle = (x, y, r, fill, stroke, lw) => {
      c.beginPath();
      c.arc(x * P, y * P, r * P, 0, Math.PI * 2);
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = lw || 2;
        c.stroke();
      }
    };
    D.shadow = (x, y, rx, ry) => {
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.ellipse(x * P, y * P, rx * P, ry * P, 0, 0, Math.PI * 2);
      c.fill();
    };
    D.line = (x1, y1, x2, y2, color, lw) => {
      c.strokeStyle = color;
      c.lineWidth = (lw || 0.1) * P;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x1 * P, y1 * P);
      c.lineTo(x2 * P, y2 * P);
      c.stroke();
    };
    D.glow = (x, y, r, color) => {
      const g = c.createRadialGradient(x * P, y * P, 0, x * P, y * P, r * P);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect((x - r) * P, (y - r) * P, 2 * r * P, 2 * r * P);
    };
    D.screen = (x, y, w, h, color) => {
      D.box(x, y, w, h, '#0c1420', null, 0.06);
      D.box(x + 0.06, y + 0.06, w - 0.12, h - 0.12, color, null, 0.05);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect((x + 0.1) * P, (y + 0.1) * P, (w - 0.2) * P, 0.06 * P);
    };
    D.stars = (x, y, w, h, n) => {
      for (let i = 0; i < n; i++) {
        c.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`;
        const s = Math.random() < 0.15 ? 2.5 : 1.5;
        c.fillRect((x + Math.random() * w) * P, (y + Math.random() * h) * P, s, s);
      }
    };
    D.crate = (x, y, w, h) => {
      D.shadow(x + w / 2 + 0.1, y + h + 0.05, w * 0.55, 0.18);
      D.box(x, y, w, h, '#86704a', '#3d311f', 0.1);
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo((x + 0.15) * P, (y + 0.15) * P);
      c.lineTo((x + w - 0.15) * P, (y + h - 0.15) * P);
      c.moveTo((x + w - 0.15) * P, (y + 0.15) * P);
      c.lineTo((x + 0.15) * P, (y + h - 0.15) * P);
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.strokeRect((x + 0.12) * P, (y + 0.12) * P, (w - 0.24) * P, (h - 0.24) * P);
    };
    D.table = (x, y, r) => {
      D.shadow(x + 0.15, y + 0.25, r * 1.02, r * 0.9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        D.circle(x + Math.cos(a) * (r + 0.7), y + Math.sin(a) * (r + 0.7), 0.38, '#6b7488', '#2a3040');
      }
      D.circle(x, y, r, '#a3acc0', '#2a3040', 3);
      D.circle(x - r * 0.25, y - r * 0.25, r * 0.55, 'rgba(255,255,255,0.12)');
    };
    return D;
  }

  function drawRooms(D, c, P) {
    const S = M.STATIONS, B = M.SAB_STATIONS;
    /* placa pintada na face de uma parede de cima */
    const wallSign = (x, y, draw) => {
      D.box(x - 0.45, y + 0.28, 0.9, 0.56, '#dfe6f2', '#141925', 0.08);
      draw(x, y + 0.56);
    };

    /* Cafeteria: mesas redondas, botão de emergência, máquinas de lanche */
    [[63, 9], [75.5, 9], [63, 19.5], [75.5, 19.5]].forEach(([x, y]) => D.table(x, y, 1.45));
    const E = M.EMERGENCY;
    D.shadow(E.x + 0.2, E.y + 0.35, 2.1, 1.8);
    D.circle(E.x, E.y, 2, '#a3acc0', '#2a3040', 3);
    D.circle(E.x, E.y, 1.05, '#6f7d96', '#2a3040');
    D.glow(E.x, E.y, 1.3, 'rgba(255,60,60,0.35)');
    D.circle(E.x, E.y, 0.78, '#c3202b', '#3a0a0e', 3);
    D.circle(E.x - 0.22, E.y - 0.26, 0.28, 'rgba(255,255,255,0.4)');
    [[61.4, '#3d6fb3'], [63.8, '#b33d3d'], [66.2, '#3db36f']].forEach(([x, col]) => {
      D.box(x, 1.75, 2.1, 1.65, col, '#141925', 0.15);
      D.screen(x + 0.3, 1.95, 1.5, 0.5, 'rgba(255,255,255,0.35)');
      D.box(x + 0.35, 2.75, 1.4, 0.4, 'rgba(0,0,0,0.35)', null, 0.08);
    });
    D.box(S.garbageCaf.x - 0.6, S.garbageCaf.y + 0.3, 1.2, 1, '#4b5467', '#141925', 0.2);
    D.line(S.garbageCaf.x - 0.4, S.garbageCaf.y + 0.55, S.garbageCaf.x + 0.4, S.garbageCaf.y + 0.55, '#11141b', 0.08);

    /* MedBay: macas na parede esquerda, scanner no chão, analisador de amostras */
    [21.4, 24.4, 27.4].forEach((y) => {
      const x = 38.45;
      D.shadow(x + 1.9, y + 2.35, 1.9, 0.25);
      D.box(x, y, 3.6, 2.2, '#dfe7f5', '#57627a', 0.35);
      D.box(x + 0.2, y + 0.3, 0.9, 1.6, '#a9bde0', null, 0.3);
      D.box(x + 1.4, y + 0.15, 2.05, 1.9, 'rgba(90,140,200,0.35)', null, 0.2);
    });
    D.glow(S.scan.x, S.scan.y, 1.8, 'rgba(90,240,160,0.25)');
    D.circle(S.scan.x, S.scan.y, 1.15, '#1f3b37', '#3ae08a', 3);
    D.circle(S.scan.x, S.scan.y, 0.75, 'rgba(58,224,138,0.25)', '#3ae08a', 1.5);
    D.box(51.0, 21.2, 0.95, 2.7, '#3b4760', '#141925', 0.15);
    for (let i = 0; i < 4; i++) D.box(51.12, 21.45 + i * 0.6, 0.7, 0.32, ['#e24b4b', '#4aa3ff', '#4be38b', '#ffd23b'][i], null, 0.08);
    wallSign(49.5, 19, (x, y) => {
      D.line(x, y - 0.18, x, y + 0.18, '#e24b4b', 0.12);
      D.line(x - 0.18, y, x + 0.18, y, '#e24b4b', 0.12);
    });

    /* Motores: turbinas com escape brilhando à esquerda */
    [[9, 16], [56.5, 63.5]].forEach(([y, pipeTo], n) => {
      const x = 13, w = 8.5, h = 7;
      D.shadow(x + w / 2, y + h + 0.3, w * 0.55, 0.5);
      for (const px of [15.2, 19.2]) D.line(px, n ? y + h : y, px, n ? 66 : 6, '#4a5263', 0.4);
      D.box(x, y, w, h, '#667086', '#232838', 1.4);
      D.box(x + 0.5, y + 0.5, w - 1, 2, '#7b869c', null, 0.9);
      for (let i = 0; i < 4; i++) D.line(x + 1.5 + i * 1.85, y + 3, x + 1.5 + i * 1.85, y + h - 0.6, 'rgba(0,0,0,0.25)', 0.12);
      D.glow(x - 0.3, y + h / 2, 2.4, 'rgba(255,150,60,0.5)');
      D.box(x - 1.4, y + 1.7, 1.6, h - 3.4, '#4a5263', '#232838', 0.5);
      D.box(x - 1.75, y + 2.1, 0.55, h - 4.2, '#ffb347', null, 0.25);
      void pipeTo;
    });

    /* Reator: núcleo azul com tubos até os scanners de mão */
    D.glow(7.5, 36, 5.5, 'rgba(80,160,255,0.35)');
    for (const st of [B.reactorA, B.reactorB]) D.line(7.5, 36, st.x - 1.0, st.y, '#3b4a66', 0.45);
    D.line(7.5, 36, S.manifolds.x, S.manifolds.y + 0.6, '#3b4a66', 0.35);
    D.line(7.5, 36, S.reactor.x, S.reactor.y - 0.6, '#3b4a66', 0.35);
    D.circle(7.5, 36, 3.1, '#1b2c4a', '#0e1a2e', 4);
    D.circle(7.5, 36, 2.3, '#2468bd', '#123a6b', 3);
    D.circle(7.5, 36, 1.4, '#58b4ff', '#8fd3ff', 2);
    D.circle(7.5, 36, 0.6, '#e6f6ff');
    for (const st of [B.reactorA, B.reactorB]) {
      D.box(st.x - 1.45, st.y - 0.7, 0.9, 1.4, '#28324a', '#0b0d12', 0.2);
      D.box(st.x - 1.33, st.y - 0.5, 0.66, 1.0, 'rgba(255,90,90,0.55)', null, 0.2);
      for (let i = 0; i < 3; i++) D.line(st.x - 1.25, st.y - 0.3 + i * 0.3, st.x - 0.75, st.y - 0.3 + i * 0.3, 'rgba(255,255,255,0.35)', 0.05);
    }

    /* Segurança: mesa com monitores, cadeiras e servidores */
    D.box(23.2, 28.05, 8.6, 1.3, '#232838', '#11151f', 0.2);
    for (let i = 0; i < 4; i++) D.screen(23.55 + i * 2.05, 28.15, 1.8, 0.95, ['#2e8f6a', '#2e6f8f', '#2e8f6a', '#2e6f8f'][i]);
    [[25.6, 30.7], [29.4, 30.7]].forEach(([x, y]) => {
      D.shadow(x + 0.05, y + 0.5, 0.5, 0.15);
      D.circle(x, y, 0.55, '#3b4458', '#141925');
    });
    for (let i = 0; i < 3; i++) {
      D.box(32.6, 31.5 + i * 2, 1.1, 1.7, '#1c2130', '#0b0d12', 0.1);
      for (let k = 0; k < 4; k++) D.box(32.75, 31.7 + i * 2 + k * 0.35, 0.8, 0.12, k % 2 ? '#3ae08a' : '#2e6f8f', null, 0.02);
    }

    /* Elétrica: quadros de disjuntores, bandeja de cabos */
    for (let i = 0; i < 3; i++) {
      const x = 40.4 + i * 1.6;
      D.box(x, 38.1, 1.3, 1.6, '#4b4636', '#1a180f', 0.1);
      D.box(x + 0.2, 38.3, 0.9, 0.5, '#2a2a22', null, 0.05);
      D.circle(x + 0.35, 39.25, 0.12, i % 2 ? '#ffd23b' : '#e24b4b');
      D.circle(x + 0.8, 39.25, 0.12, '#4be38b');
    }
    D.line(36.35, 45.6, 36.35, 49.65, '#2a2a22', 0.45);
    D.line(36.35, 49.65, 41.4, 49.65, '#2a2a22', 0.45);
    ['#e24b4b', '#ffd23b', '#4aa3ff'].forEach((col, i) => {
      D.line(36.2 + i * 0.15, 45.8, 36.2 + i * 0.15, 49.5, col, 0.07);
      D.line(36.4, 49.5 + i * 0.12 - 0.12, 41.3, 49.5 + i * 0.12 - 0.12, col, 0.07);
    });
    D.box(B.lights.x - 0.9, B.lights.y - 1.4, 1.8, 1.5, '#5a3a2a', '#1a0f08', 0.1);
    for (let i = 0; i < 5; i++) D.box(B.lights.x - 0.75 + i * 0.32, B.lights.y - 1.15, 0.2, 0.55, '#e0d6b8', null, 0.04);
    wallSign(48.6, 37, (x, y) => {
      c.fillStyle = '#ffd23b';
      c.beginPath();
      c.moveTo((x + 0.05) * P, (y - 0.24) * P);
      c.lineTo((x - 0.14) * P, (y + 0.03) * P);
      c.lineTo((x + 0.02) * P, (y + 0.03) * P);
      c.lineTo((x - 0.06) * P, (y + 0.26) * P);
      c.lineTo((x + 0.15) * P, (y - 0.04) * P);
      c.lineTo((x - 0.01) * P, (y - 0.04) * P);
      c.closePath();
      c.fill();
    });

    /* Depósito: pilhas de caixas, barris, galão de combustível, calha do lixo */
    [[57, 50, 3, 3], [60.3, 50.4, 2.2, 2.2], [65.5, 47.5, 4, 3], [58, 57, 3, 2.5], [66, 55, 3, 3], [62.5, 60.5, 2.5, 2.5], [69, 51.5, 2, 2]].forEach(([x, y, w, h]) => D.crate(x, y, w, h));
    [[56.4, 61.5], [57.4, 62.3], [68.2, 59]].forEach(([x, y]) => {
      D.shadow(x + 0.05, y + 0.5, 0.5, 0.15);
      D.circle(x, y, 0.45, '#8a3b2a', '#2b120c');
      D.circle(x, y, 0.3, '#a24c38');
    });
    D.shadow(S.fuelStorage.x + 0.5, S.fuelStorage.y + 0.2, 0.6, 0.18);
    D.box(S.fuelStorage.x + 0.35, S.fuelStorage.y - 1.7, 1.1, 1.8, '#b35a1f', '#40200a', 0.3);
    D.box(S.fuelStorage.x + 0.55, S.fuelStorage.y - 1.5, 0.7, 0.3, '#ffd23b', null, 0.05);
    D.box(S.garbageStorage.x - 1, S.garbageStorage.y + 0.25, 2, 1.1, '#2a2f3b', '#0b0d12', 0.15);
    for (let i = 0; i < 4; i++) D.line(S.garbageStorage.x - 0.75 + i * 0.5, S.garbageStorage.y + 0.4, S.garbageStorage.x - 0.75 + i * 0.5, S.garbageStorage.y + 1.2, '#11141b', 0.1);

    /* Admin: mesa holográfica com o mapa da nave */
    const A = M.ADMIN_TABLE;
    D.shadow(A.x + 0.2, A.y + 1.9, 3, 0.4);
    D.box(A.x - 3, A.y - 1.8, 6, 3.6, '#23304a', '#101828', 0.5);
    D.box(A.x - 2.6, A.y - 1.4, 5.2, 2.8, 'rgba(90,240,160,0.18)', '#3ae08a', 0.35);
    D.glow(A.x, A.y, 3, 'rgba(90,240,160,0.18)');
    c.strokeStyle = 'rgba(90,240,160,0.6)';
    c.lineWidth = 1.5;
    for (const r of M.ROOMS) {
      const [x, y, w, h] = r.rect;
      c.strokeRect((A.x - 2.4 + (x / W) * 4.8) * P, (A.y - 1.2 + (y / H) * 2.4) * P, (w / W) * 4.8 * P, (h / H) * 2.4 * P);
    }
    [[79, 36.9], [82, 36.9], [79, 42.1], [82, 42.1]].forEach(([x, y]) => D.circle(x, y, 0.45, '#3b4458', '#141925'));

    /* O2: jardineiras, cilindros e a árvore no canto */
    [[87, 22.3], [89.5, 22.3], [92, 22.3]].forEach(([x, y]) => {
      D.box(x, y, 2, 1.7, '#3f5a2d', '#1e2c16', 0.3);
      D.circle(x + 0.6, y + 0.7, 0.5, '#6fc95a');
      D.circle(x + 1.3, y + 0.8, 0.45, '#5ab24a');
    });
    [[86.3, 25.5], [86.3, 27.3]].forEach(([x, y]) => {
      D.box(x, y, 0.9, 1.5, '#9fb2c9', '#3a4660', 0.4);
      D.box(x + 0.15, y + 0.2, 0.6, 0.25, '#e24b4b', null, 0.05);
    });
    D.circle(93.5, 27, 1.1, '#2c4a2a', '#1e2c16');
    D.circle(93.5, 27, 0.8, '#4e9a3f');
    D.circle(93.2, 26.7, 0.35, '#6fc95a');
    D.box(S.cleanO2.x - 0.7, S.cleanO2.y + 0.3, 1.4, 1, '#20262f', '#0b0d12', 0.15);
    for (let i = 0; i < 3; i++) D.line(S.cleanO2.x - 0.5, S.cleanO2.y + 0.55 + i * 0.25, S.cleanO2.x + 0.5, S.cleanO2.y + 0.55 + i * 0.25, '#3a4257', 0.06);

    /* Armas: janela para o espaço e a torre de tiro */
    D.box(95.5, 3.1, 8, 1.8, '#0a0f1c', '#050810', 0.6);
    c.save();
    D.rr(95.5, 3.1, 8, 1.8, 0.6);
    c.clip();
    D.stars(95.5, 3.1, 8, 1.8, 26);
    c.restore();
    D.box(95.5, 3.1, 8, 1.8, 'rgba(120,180,255,0.08)', '#2d3850', 0.6);
    const T = S.asteroids;
    D.line(T.x, T.y - 1, T.x, T.y - 4.3, '#5a6680', 0.55);
    D.line(T.x - 0.55, T.y - 1, T.x - 0.55, T.y - 3.9, '#5a6680', 0.3);
    D.line(T.x + 0.55, T.y - 1, T.x + 0.55, T.y - 3.9, '#5a6680', 0.3);
    D.shadow(T.x + 0.2, T.y + 1.4, 1.6, 0.4);
    D.circle(T.x, T.y, 1.4, '#48536d', '#1e2536', 3);
    D.circle(T.x, T.y, 0.8, '#2d3850');

    /* Navegação: janela frontal da cabine, painel de pilotagem */
    D.box(134.12, 34.1, 0.76, 3.8, '#060a14', '#2d3850', 0.2);
    c.save();
    D.rr(134.12, 34.1, 0.76, 3.8, 0.2);
    c.clip();
    D.stars(134.12, 34.1, 0.76, 3.8, 8);
    c.restore();
    D.box(123.3, 34.3, 3.2, 2.9, '#2b3348', '#141925', 0.7);
    D.screen(123.65, 34.7, 2.5, 1.3, 'rgba(90,200,255,0.5)');
    [[124.2, 38.1], [125.8, 38.1]].forEach(([x, y]) => D.circle(x, y, 0.45, '#3b4458', '#141925'));

    /* Escudos: gerador hexagonal */
    const SH = SHIELD_FX;
    D.glow(SH.x, SH.y, 3, 'rgba(90,150,255,0.18)');
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const hx = i === 6 ? SH.x : SH.x + Math.cos(a) * 1.45, hy = i === 6 ? SH.y : SH.y + Math.sin(a) * 1.45;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const b = (k / 6) * Math.PI * 2;
        const px = (hx + Math.cos(b) * 0.78) * P, py = (hy + Math.sin(b) * 0.78) * P;
        if (k) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = '#4a5378';
      c.fill();
      c.strokeStyle = '#8fa6ff';
      c.lineWidth = 1.5;
      c.stroke();
    }

    /* Comunicações: bancada de rádio, antena parabólica */
    D.box(77, 70.8, 9, 2, '#232838', '#11151f', 0.25);
    for (let i = 0; i < 4; i++) D.screen(77.4 + i * 2.15, 71.1, 1.9, 1.1, i % 2 ? 'rgba(90,200,255,0.5)' : 'rgba(90,240,160,0.45)');
    D.shadow(86.9, 66.9, 1.5, 0.35);
    D.circle(86.8, 65.3, 1.5, '#48536d', '#1e2536', 3);
    D.circle(86.8, 65.3, 0.85, '#5a6680');
    D.line(86.8, 65.3, 88, 64.2, '#8fa6c9', 0.14);
    D.box(77.1, 66.4, 2, 1.2, '#3b4458', '#141925', 0.3);
    D.circle(77.6, 67, 0.28, '#22262e');
    D.circle(78.5, 67, 0.28, '#22262e');

    /* câmeras de segurança presas no teto */
    for (const cam of M.CAMS) {
      D.circle(cam.x, cam.y - 1.6, 0.3, '#20252f', '#0b0d12');
      D.circle(cam.x, cam.y - 1.6, 0.12, '#5a1010');
    }
  }

  /* Console de cada estação, encostado na parede mais próxima. */
  function drawStations(D, c, P) {
    const skip = new Set(['scan', 'asteroids', 'fuelStorage', 'garbageStorage', 'garbageCaf', 'cleanO2', 'inspect']);
    const color = (id) => {
      if (/^wires/.test(id)) return '#ffd23b';
      if (/^dl|upload/.test(id)) return '#4be38b';
      if (/^accept|divert/.test(id)) return '#ffb347';
      if (/^fuel/.test(id)) return '#ff8c42';
      if (/^align/.test(id)) return '#ff9a3c';
      return '#4aa3ff';
    };
    const place = (st, col, big) => {
      const x = st.x, y = st.y;
      const f = (dx, dy) => M.isFloor(Math.floor(x + dx), Math.floor(y + dy));
      const w = big ? 1.4 : 1.1;
      if (!f(0, -1.6) || !f(0, -1.2)) {
        D.box(x - w / 2, y - 1.35, w, 0.95, '#262c3a', '#0b0d12', 0.15);
        D.screen(x - w / 2 + 0.12, y - 1.25, w - 0.24, 0.5, col);
        D.box(x - w / 2 - 0.05, y - 0.5, w + 0.1, 0.18, '#3a4257', null, 0.05);
      } else if (!f(-1.6, 0)) {
        D.box(x - 1.3, y - w / 2, 0.8, w, '#262c3a', '#0b0d12', 0.15);
        D.screen(x - 1.2, y - w / 2 + 0.12, 0.45, w - 0.24, col);
      } else if (!f(1.6, 0)) {
        D.box(x + 0.5, y - w / 2, 0.8, w, '#262c3a', '#0b0d12', 0.15);
        D.screen(x + 0.75, y - w / 2 + 0.12, 0.45, w - 0.24, col);
      } else if (!f(0, 1.6)) {
        D.box(x - w / 2, y + 0.45, w, 0.8, '#262c3a', '#0b0d12', 0.15);
        D.screen(x - w / 2 + 0.12, y + 0.55, w - 0.24, 0.4, col);
      } else {
        D.shadow(x + 0.1, y + 0.45, 0.6, 0.18);
        D.box(x - 0.45, y - 0.55, 0.9, 1, '#262c3a', '#0b0d12', 0.2);
        D.screen(x - 0.33, y - 0.45, 0.66, 0.42, col);
      }
    };
    for (const id of Object.keys(M.STATIONS)) if (!skip.has(id)) place(M.STATIONS[id], color(id));
    for (const id of Object.keys(M.SAB_STATIONS)) {
      if (id === 'lights' || id.startsWith('reactor')) continue;
      place(M.SAB_STATIONS[id], 'rgba(255,120,80,0.8)', true);
    }
    void c;
    void P;
  }

  function drawVents(D) {
    for (const v of M.VENTS) {
      D.box(v.x - 0.72, v.y - 0.46, 1.44, 0.92, '#2a2f3b', '#0b0d12', 0.12);
      for (let i = 1; i < 5; i++) D.line(v.x - 0.72 + i * 0.29, v.y - 0.38, v.x - 0.72 + i * 0.29, v.y + 0.38, '#11141b', 0.08);
    }
  }

  AU.Decor = { build, SHIELD_FX };
})();

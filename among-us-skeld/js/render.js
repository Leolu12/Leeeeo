/* Renderização: mapa pré-desenhado, tripulantes, corpos, efeitos, névoa de visão e ícones SVG. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;
  const PX = 24;
  const W = M.W, H = M.H;

  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      return;
    }
    const rad = Array.isArray(r) ? r : [r, r, r, r];
    ctx.beginPath();
    ctx.moveTo(x + rad[0], y);
    ctx.lineTo(x + w - rad[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad[1]);
    ctx.lineTo(x + w, y + h - rad[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad[2], y + h);
    ctx.lineTo(x + rad[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad[3]);
    ctx.lineTo(x, y + rad[0]);
    ctx.quadraticCurveTo(x, y, x + rad[0], y);
  }

  /* ---------- tripulante no canvas ---------- */
  function drawHat(ctx, hat, u) {
    ctx.lineWidth = u * 0.05;
    ctx.strokeStyle = '#0b0d12';
    const top = -0.55 * u;
    switch (hat) {
      case 'cowboy':
        ctx.fillStyle = '#8a5a2b';
        ctx.beginPath();
        ctx.ellipse(0, top + 0.02 * u, 0.46 * u, 0.09 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        rr(ctx, -0.22 * u, top - 0.24 * u, 0.44 * u, 0.26 * u, 0.08 * u);
        ctx.fill();
        ctx.stroke();
        break;
      case 'coroa':
        ctx.fillStyle = '#f2c94c';
        ctx.beginPath();
        ctx.moveTo(-0.24 * u, top + 0.04 * u);
        ctx.lineTo(-0.26 * u, top - 0.2 * u);
        ctx.lineTo(-0.12 * u, top - 0.08 * u);
        ctx.lineTo(0, top - 0.24 * u);
        ctx.lineTo(0.12 * u, top - 0.08 * u);
        ctx.lineTo(0.26 * u, top - 0.2 * u);
        ctx.lineTo(0.24 * u, top + 0.04 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'cogumelo':
        ctx.fillStyle = '#d63a3a';
        ctx.beginPath();
        ctx.ellipse(0, top - 0.02 * u, 0.36 * u, 0.2 * u, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        [[-0.16, -0.1], [0.05, -0.16], [0.2, -0.06]].forEach(([a, b]) => {
          ctx.beginPath();
          ctx.arc(a * u, top + b * u, 0.045 * u, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      case 'festa':
        ctx.fillStyle = '#3aa0ff';
        ctx.beginPath();
        ctx.moveTo(-0.16 * u, top + 0.03 * u);
        ctx.lineTo(0.02 * u, top - 0.42 * u);
        ctx.lineTo(0.18 * u, top + 0.03 * u);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        ctx.arc(0.02 * u, top - 0.42 * u, 0.06 * u, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'obra':
        ctx.fillStyle = '#f5c518';
        ctx.beginPath();
        ctx.ellipse(0, top + 0.04 * u, 0.36 * u, 0.24 * u, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(-0.42 * u, top + 0.02 * u, 0.84 * u, 0.06 * u);
        break;
      case 'bone':
        ctx.fillStyle = '#2d6cdf';
        ctx.beginPath();
        ctx.ellipse(0, top + 0.02 * u, 0.3 * u, 0.18 * u, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0.28 * u, top + 0.02 * u, 0.2 * u, 0.05 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'flor':
        ctx.fillStyle = '#ff8fd1';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * 0.1 * u, top - 0.1 * u + Math.sin(a) * 0.1 * u, 0.07 * u, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        ctx.arc(0, top - 0.1 * u, 0.05 * u, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'antena':
        ctx.beginPath();
        ctx.moveTo(0, top + 0.02 * u);
        ctx.lineTo(0.06 * u, top - 0.26 * u);
        ctx.stroke();
        ctx.fillStyle = '#ff5a5a';
        ctx.beginPath();
        ctx.arc(0.06 * u, top - 0.28 * u, 0.06 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      default:
        break;
    }
  }

  function drawBean(ctx, x, y, u, colorId, o) {
    o = o || {};
    const col = C.COLOR[colorId] || C.COLORS[0];
    const visor = (C.VISORS.find((v) => v.id === o.visor) || C.VISORS[0]).hex;
    ctx.save();
    ctx.translate(x, y);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if ((o.facing || 1) < 0) ctx.scale(-1, 1);
    const line = u * 0.07;
    ctx.lineWidth = line;
    ctx.strokeStyle = '#0b0d12';
    ctx.lineJoin = 'round';
    const bob = o.moving ? Math.abs(Math.sin((o.walk || 0) * 11)) * 0.04 * u : 0;
    ctx.translate(0, -bob);
    if (o.dead) {
      ctx.fillStyle = col.hex;
      rr(ctx, -0.34 * u, -0.05 * u, 0.68 * u, 0.32 * u, [0.02 * u, 0.02 * u, 0.12 * u, 0.12 * u]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col.shade;
      rr(ctx, -0.46 * u, -0.02 * u, 0.16 * u, 0.22 * u, 0.05 * u);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f4f0e6';
      rr(ctx, -0.05 * u, -0.28 * u, 0.1 * u, 0.26 * u, 0.04 * u);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.05 * u, -0.3 * u, 0.06 * u, 0, Math.PI * 2);
      ctx.arc(0.05 * u, -0.3 * u, 0.06 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c51111';
      ctx.beginPath();
      ctx.ellipse(0, 0.3 * u, 0.4 * u, 0.08 * u, 0, 0, Math.PI * 2);
      ctx.globalAlpha *= 0.5;
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = col.shade;
    rr(ctx, -0.5 * u, -0.3 * u, 0.2 * u, 0.44 * u, 0.07 * u);
    ctx.fill();
    ctx.stroke();
    const sw = o.moving ? Math.sin((o.walk || 0) * 11) * 0.07 * u : 0;
    if (!o.ghost) {
      ctx.fillStyle = col.hex;
      rr(ctx, -0.32 * u + sw, 0.12 * u, 0.24 * u, 0.3 * u, 0.08 * u);
      ctx.fill();
      ctx.stroke();
      rr(ctx, 0.06 * u - sw, 0.12 * u, 0.24 * u, 0.3 * u, 0.08 * u);
      ctx.fill();
      ctx.stroke();
    }
    const bodyPath = () => {
      if (o.ghost) {
        ctx.beginPath();
        ctx.moveTo(-0.34 * u, 0.2 * u);
        ctx.lineTo(-0.34 * u, -0.2 * u);
        ctx.arc(0, -0.2 * u, 0.34 * u, Math.PI, 0);
        ctx.lineTo(0.34 * u, 0.2 * u);
        for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(0.34 * u - (i + 0.5) * 0.17 * u, 0.32 * u, 0.34 * u - (i + 1) * 0.17 * u, 0.2 * u);
        ctx.closePath();
      } else rr(ctx, -0.34 * u, -0.55 * u, 0.68 * u, 0.86 * u, [0.34 * u, 0.34 * u, 0.1 * u, 0.1 * u]);
    };
    ctx.fillStyle = col.hex;
    bodyPath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = col.shade;
    ctx.beginPath();
    ctx.ellipse(-0.3 * u, 0.2 * u, 0.36 * u, 0.5 * u, 0.3, 0, Math.PI * 2);
    ctx.globalAlpha *= 0.55;
    ctx.fill();
    ctx.restore();
    bodyPath();
    ctx.stroke();
    ctx.fillStyle = visor;
    ctx.beginPath();
    ctx.ellipse(0.1 * u, -0.26 * u, 0.25 * u, 0.15 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(0.16 * u, -0.31 * u, 0.09 * u, 0.04 * u, 0, 0, Math.PI * 2);
    ctx.fill();
    if (o.hat && o.hat !== 'nenhum') drawHat(ctx, o.hat, u);
    ctx.restore();
  }

  function drawPet(ctx, x, y, u, pet, colorId, facing) {
    if (!pet || pet === 'nenhum') return;
    ctx.save();
    ctx.translate(x, y);
    if (facing < 0) ctx.scale(-1, 1);
    ctx.lineWidth = u * 0.05;
    ctx.strokeStyle = '#0b0d12';
    if (pet === 'mini') {
      ctx.restore();
      drawBean(ctx, x, y + 0.08 * u, u * 0.42, colorId, { facing });
      return;
    }
    if (pet === 'robo') {
      ctx.fillStyle = '#9aa6b8';
      rr(ctx, -0.14 * u, -0.1 * u, 0.28 * u, 0.24 * u, 0.05 * u);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#6ff';
      ctx.fillRect(-0.02 * u, -0.04 * u, 0.12 * u, 0.05 * u);
      ctx.beginPath();
      ctx.moveTo(0, -0.1 * u);
      ctx.lineTo(0, -0.2 * u);
      ctx.stroke();
    } else if (pet === 'slime') {
      ctx.fillStyle = '#7ee06b';
      ctx.beginPath();
      ctx.ellipse(0, 0.06 * u, 0.16 * u, 0.12 * u, 0, Math.PI, 0);
      ctx.lineTo(0.16 * u, 0.12 * u);
      ctx.lineTo(-0.16 * u, 0.12 * u);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0b0d12';
      ctx.fillRect(0.02 * u, 0, 0.03 * u, 0.04 * u);
      ctx.fillRect(0.08 * u, 0, 0.03 * u, 0.04 * u);
    }
    ctx.restore();
  }

  /* ---------- ícone SVG (lobby, reunião, relatório) ---------- */
  function beanSVG(colorId, o) {
    o = o || {};
    const col = C.COLOR[colorId] || C.COLORS[0];
    const visor = (C.VISORS.find((v) => v.id === o.visor) || C.VISORS[0]).hex;
    const s = o.size || 40;
    if (o.dead) {
      return `<svg class="bean" width="${s}" height="${s}" viewBox="-60 -60 120 120" aria-hidden="true"><rect x="-34" y="0" width="68" height="30" rx="10" fill="${col.hex}" stroke="#0b0d12" stroke-width="6"/><rect x="-46" y="4" width="16" height="22" rx="5" fill="${col.shade}" stroke="#0b0d12" stroke-width="6"/><rect x="-5" y="-24" width="10" height="26" rx="4" fill="#f4f0e6" stroke="#0b0d12" stroke-width="5"/><circle cx="-5" cy="-26" r="6" fill="#f4f0e6"/><circle cx="5" cy="-26" r="6" fill="#f4f0e6"/></svg>`;
    }
    const op = o.ghost ? 0.5 : 1;
    return `<svg class="bean" width="${s}" height="${s}" viewBox="-60 -62 120 120" aria-hidden="true" style="opacity:${op}"><rect x="-50" y="-30" width="20" height="44" rx="7" fill="${col.shade}" stroke="#0b0d12" stroke-width="7"/><rect x="-32" y="12" width="24" height="30" rx="8" fill="${col.hex}" stroke="#0b0d12" stroke-width="7"/><rect x="6" y="12" width="24" height="30" rx="8" fill="${col.hex}" stroke="#0b0d12" stroke-width="7"/><path d="M-34 -21 A34 34 0 0 1 34 -21 L34 21 Q34 31 24 31 L-24 31 Q-34 31 -34 21 Z" fill="${col.hex}" stroke="#0b0d12" stroke-width="7"/><ellipse cx="10" cy="-26" rx="25" ry="15" fill="${visor}" stroke="#0b0d12" stroke-width="7"/><ellipse cx="16" cy="-31" rx="9" ry="4" fill="rgba(255,255,255,.75)"/>${o.x ? '<path d="M-26 -40 L26 30 M26 -40 L-26 30" stroke="#ff3b3b" stroke-width="9" stroke-linecap="round"/>' : ''}</svg>`;
  }

  /* ---------- mapa estático ---------- */
  let staticCanvas = null;
  function prerender() {
    const cv = document.createElement('canvas');
    cv.width = W * PX;
    cv.height = H * PX;
    const c = cv.getContext('2d');
    const P = PX;
    for (const a of M.AREAS) {
      for (const [x, y, w, h] of a.rects) {
        c.fillStyle = a.kind === 'room' ? a.floor : '#2b3140';
        c.fillRect(x * P, y * P, w * P, h * P);
      }
    }
    c.strokeStyle = 'rgba(255,255,255,0.045)';
    c.lineWidth = 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      c.strokeRect(x * P + 0.5, y * P + 0.5, P - 1, P - 1);
    }
    for (const cdr of M.CORRIDORS) {
      c.fillStyle = 'rgba(255,208,70,0.05)';
      for (const [x, y, w, h] of cdr.rects) {
        if (w >= h) c.fillRect(x * P, (y + h / 2 - 0.12) * P, w * P, 0.24 * P);
        else c.fillRect((x + w / 2 - 0.12) * P, y * P, 0.24 * P, h * P);
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (M.isFloor(x + dx, y + dy)) near = true;
      if (!near) continue;
      c.fillStyle = '#141925';
      c.fillRect(x * P, y * P, P, P);
      if (M.isFloor(x, y + 1)) {
        c.fillStyle = '#3b4560';
        c.fillRect(x * P, y * P + P * 0.25, P, P * 0.75);
        c.fillStyle = '#56627f';
        c.fillRect(x * P, y * P + P * 0.25, P, P * 0.1);
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(x * P, y * P + P * 0.85, P, P * 0.15);
      }
    }
    c.strokeStyle = '#0a0d15';
    c.lineWidth = 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!M.isFloor(x, y)) continue;
      if (!M.isFloor(x - 1, y)) { c.beginPath(); c.moveTo(x * P, y * P); c.lineTo(x * P, (y + 1) * P); c.stroke(); }
      if (!M.isFloor(x + 1, y)) { c.beginPath(); c.moveTo((x + 1) * P, y * P); c.lineTo((x + 1) * P, (y + 1) * P); c.stroke(); }
      if (!M.isFloor(x, y + 1)) { c.beginPath(); c.moveTo(x * P, (y + 1) * P); c.lineTo((x + 1) * P, (y + 1) * P); c.stroke(); }
    }
    drawProps(c, P);
    c.font = `700 ${P * 0.7}px "Chakra Petch", system-ui, sans-serif`;
    c.fillStyle = 'rgba(230,236,255,0.13)';
    c.textBaseline = 'top';
    for (const r of M.ROOMS) c.fillText(r.name.toUpperCase(), (r.rect[0] + 0.6) * P, (r.rect[1] + 0.5) * P);
    staticCanvas = cv;
    return cv;
  }

  function drawProps(c, P) {
    const circle = (x, y, r, fill, stroke) => {
      c.beginPath();
      c.arc(x * P, y * P, r * P, 0, Math.PI * 2);
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2;
        c.stroke();
      }
    };
    const box = (x, y, w, h, fill, stroke, r) => {
      rr(c, x * P, y * P, w * P, h * P, (r || 0.15) * P);
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2;
        c.stroke();
      }
    };
    [[62, 8], [76, 9], [62, 20], [76, 19]].forEach(([x, y]) => {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        circle(x + Math.cos(a) * 2.1, y + Math.sin(a) * 2.1, 0.35, '#5b6478');
      }
      circle(x, y, 1.5, '#8d97ad', '#2a3040');
    });
    circle(M.EMERGENCY.x, M.EMERGENCY.y, 1.9, '#8d97ad', '#2a3040');
    circle(M.EMERGENCY.x, M.EMERGENCY.y, 0.85, '#b3202a', '#3a0a0e');
    circle(M.EMERGENCY.x - 0.2, M.EMERGENCY.y - 0.25, 0.3, 'rgba(255,255,255,0.35)');
    box(64, 2.2, 3, 1.2, '#39414f', '#20252f');
    box(67.5, 2.2, 3, 1.2, '#39414f', '#20252f');
    [[39, 21], [42.5, 21], [46, 21]].forEach(([x, y]) => {
      box(x, y, 2.6, 4, '#d6e0f0', '#57627a', 0.4);
      box(x + 0.3, y + 0.3, 2, 1, '#9fb2d6', null, 0.3);
    });
    circle(M.STATIONS.scan.x, M.STATIONS.scan.y, 1.1, 'rgba(90,240,160,0.18)', '#3ae08a');
    box(49.3, 21.6, 2.4, 1.6, '#39414f', '#20252f');
    [[12, 8.5], [12, 54.5]].forEach(([x, y]) => {
      box(x, y, 9.5, 8.5, '#5a6275', '#232838', 1.2);
      box(x + 0.6, y + 0.6, 8.3, 2, '#6c768b', null, 0.6);
      box(x + 8.5, y + 3, 2, 2.5, '#ff9a3c', '#6a3b12', 0.4);
    });
    circle(7.5, 36, 3, '#1b2c4a', '#0e1a2e');
    circle(7.5, 36, 2, '#2e7bd6', '#123a6b');
    circle(7.5, 36, 1, '#8fd3ff');
    for (let i = 0; i < 4; i++) box(1.5, 31 + i * 3, 1, 1.4, '#2a3348');
    box(23.5, 28.3, 8, 1.6, '#232838', '#11151f');
    for (let i = 0; i < 4; i++) box(24 + i * 1.9, 28.5, 1.6, 0.9, '#2e8f6a', null, 0.1);
    for (let i = 0; i < 5; i++) box(37 + i * 2.5, 38.2, 1.8, 1.2, '#4b4636', '#2a2619');
    c.strokeStyle = 'rgba(255,200,80,0.35)';
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo((37 + i * 2) * P, 39.5 * P);
      c.bezierCurveTo((38 + i * 2) * P, 42 * P, (36 + i * 2) * P, 44 * P, (38 + i * 2) * P, 47 * P);
      c.stroke();
    }
    [[57, 50, 3, 3], [65, 48, 4, 3], [58, 57, 3, 2.5], [66, 55, 3, 3], [63, 60, 2.5, 2.5]].forEach(([x, y, w, h]) => {
      box(x, y, w, h, '#7a6442', '#3d311f', 0.2);
      c.strokeStyle = 'rgba(0,0,0,0.25)';
      c.beginPath();
      c.moveTo(x * P, y * P);
      c.lineTo((x + w) * P, (y + h) * P);
      c.stroke();
    });
    box(M.ADMIN_TABLE.x - 2.5, M.ADMIN_TABLE.y - 1.6, 5, 3.2, '#23304a', '#101828', 0.4);
    box(M.ADMIN_TABLE.x - 2.1, M.ADMIN_TABLE.y - 1.2, 4.2, 2.4, 'rgba(90,240,160,0.3)', '#3ae08a', 0.3);
    box(77, 66, 4, 2, '#2b3348', '#141a28');
    circle(83, 66.5, 1.6, '#48536d', '#1e2536');
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const hx = 102 + Math.cos(a) * 2.2, hy = 59 + Math.sin(a) * 2.2;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const b = (k / 6) * Math.PI * 2;
        const px = (hx + Math.cos(b) * 0.9) * P, py = (hy + Math.sin(b) * 0.9) * P;
        if (k) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = '#39405c';
      c.fill();
      c.strokeStyle = '#1c2033';
      c.stroke();
    }
    box(131.4, 29, 2.2, 14, '#141a28', '#07090f', 0.8);
    for (let i = 0; i < 18; i++) circle(131.8 + Math.random() * 1.5, 29.5 + Math.random() * 13, 0.05, '#ffffff');
    box(126, 34.5, 3, 3, '#2b3348', '#141a28', 0.6);
    [[87, 23], [89.5, 23], [92, 23]].forEach(([x, y]) => {
      box(x, y, 2, 1.6, '#3f5a2d', '#1e2c16', 0.3);
      circle(x + 1, y + 0.6, 0.5, '#6fc95a');
    });
    box(96.5, 5, 6, 3, '#141a28', '#07090f', 1);
    circle(99.5, 10.5, 1.3, '#48536d', '#1e2536');
    for (const v of M.VENTS) {
      box(v.x - 0.7, v.y - 0.45, 1.4, 0.9, '#2a2f3b', '#0b0d12', 0.1);
      c.strokeStyle = '#11141b';
      c.lineWidth = 2;
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.moveTo((v.x - 0.7 + i * 0.35) * P, (v.y - 0.4) * P);
        c.lineTo((v.x - 0.7 + i * 0.35) * P, (v.y + 0.4) * P);
        c.stroke();
      }
    }
    for (const k of Object.keys(M.STATIONS)) {
      const s = M.STATIONS[k];
      if (k === 'scan' || k === 'upload') continue;
      box(s.x - 0.45, s.y - 0.45, 0.9, 0.9, '#262c3a', '#0b0d12', 0.15);
      box(s.x - 0.3, s.y - 0.3, 0.6, 0.35, '#3b8fd8', null, 0.08);
    }
    box(M.STATIONS.upload.x - 0.6, M.STATIONS.upload.y - 0.45, 1.2, 0.9, '#262c3a', '#0b0d12', 0.15);
    for (const k of Object.keys(M.SAB_STATIONS)) {
      const s = M.SAB_STATIONS[k];
      box(s.x - 0.5, s.y - 0.5, 1, 1, '#3a2a2e', '#0b0d12', 0.15);
      box(s.x - 0.32, s.y - 0.32, 0.64, 0.4, '#d8763b', null, 0.08);
    }
    box(M.SECURITY.x - 0.6, M.SECURITY.y - 0.4, 1.2, 0.8, '#262c3a', '#0b0d12', 0.15);
    for (const cam of M.CAMS) circle(cam.x, cam.y - 1.6, 0.25, '#20252f', '#0b0d12');
  }

  /* ---------- fundo estrelado ---------- */
  const stars = [];
  for (let i = 0; i < 260; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2 });

  /* ---------- renderização principal ---------- */
  const R = {
    PX, drawBean, beanSVG, drawPet, rr,
    canvas: null,
    ctx: null,
    fog: null,
    fogCtx: null,
    ppt: 32,
    cam: { x: 69, y: 14 },
    setup(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.fog = document.createElement('canvas');
      this.fogCtx = this.fog.getContext('2d');
      if (!staticCanvas) prerender();
      this.resize();
    },
    resize() {
      const c = this.canvas;
      if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      this.fog.width = c.width;
      this.fog.height = c.height;
      this.dpr = dpr;
      this.ppt = Math.max(16, Math.min(c.height / 19, c.width / 17));
    },
    toScreen(x, y) {
      const c = this.canvas;
      return { x: (x - this.cam.x) * this.ppt + c.width / 2, y: (y - this.cam.y) * this.ppt + c.height / 2 };
    },
    visibleToHuman(g, x, y) {
      const h = g.human;
      if (!h) return true;
      if (!h.alive) return true;
      const r = g.visionOf(h);
      return U.d2(h.x, h.y, x, y) <= r + 0.3 && Nav.los(h.x, h.y, x, y);
    },
    draw(g, t) {
      const ctx = this.ctx, cv = this.canvas;
      if (!ctx) return;
      const h = g.human;
      if (h) {
        this.cam.x += (h.x - this.cam.x) * 0.25;
        this.cam.y += (h.y - this.cam.y) * 0.25;
      }
      const ppt = this.ppt;
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const s of stars) {
        const sx = ((s.x * cv.width - this.cam.x * ppt * 0.05 * s.z) % cv.width + cv.width) % cv.width;
        const sy = ((s.y * cv.height - this.cam.y * ppt * 0.05 * s.z) % cv.height + cv.height) % cv.height;
        ctx.fillStyle = `rgba(220,230,255,${0.25 + s.z * 0.5})`;
        ctx.fillRect(sx, sy, s.z * 2, s.z * 2);
      }
      const vw = cv.width / ppt, vh = cv.height / ppt;
      const x0 = this.cam.x - vw / 2, y0 = this.cam.y - vh / 2;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(staticCanvas, x0 * PX, y0 * PX, vw * PX, vh * PX, 0, 0, cv.width, cv.height);
      const S = (x, y) => ({ x: (x - x0) * ppt, y: (y - y0) * ppt });

      /* estações de tarefa do jogador */
      if (h && !h.isImp && g.phase === 'play') {
        const pulse = 0.55 + Math.sin(t * 5) * 0.35;
        for (const tk of h.tasks) {
          if (tk.done) continue;
          const st = M.STATIONS[tk.steps[tk.step]];
          const p = S(st.x, st.y);
          ctx.strokeStyle = g.taskAvailable(tk) ? `rgba(255,214,64,${pulse})` : 'rgba(255,214,64,0.25)';
          ctx.lineWidth = Math.max(2, ppt * 0.1);
          rr(ctx, p.x - ppt * 0.6, p.y - ppt * 0.6, ppt * 1.2, ppt * 1.2, ppt * 0.2);
          ctx.stroke();
        }
      }
      if (g.sab) {
        const pulse = 0.5 + Math.sin(t * 7) * 0.4;
        for (const st of g.sabStationsNeeded()) {
          const pos = M.SAB_STATIONS[st];
          const p = S(pos.x, pos.y);
          ctx.strokeStyle = `rgba(255,70,70,${pulse})`;
          ctx.lineWidth = Math.max(2, ppt * 0.12);
          rr(ctx, p.x - ppt * 0.7, p.y - ppt * 0.7, ppt * 1.4, ppt * 1.4, ppt * 0.2);
          ctx.stroke();
        }
      }
      /* portas */
      for (const d of M.DOORS) {
        if (!d.closed) continue;
        const [x, y, w, hh] = d.rect;
        const p = S(x, y);
        ctx.fillStyle = '#7d8699';
        ctx.fillRect(p.x, p.y, w * ppt, hh * ppt);
        ctx.fillStyle = '#b3202a';
        if (w > hh) ctx.fillRect(p.x, p.y + hh * ppt * 0.4, w * ppt, hh * ppt * 0.2);
        else ctx.fillRect(p.x + w * ppt * 0.4, p.y, w * ppt * 0.2, hh * ppt);
      }
      /* câmeras: luz vermelha quando alguém assiste */
      if (g.anyoneOnCams()) {
        for (const cam of M.CAMS) {
          const p = S(cam.x, cam.y - 1.6);
          ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b3b' : '#6a1010';
          ctx.beginPath();
          ctx.arc(p.x, p.y, ppt * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      this.drawVisualFx(g, t, S, ppt);
      /* corpos */
      for (const b of g.bodies) {
        if (b.gone) continue;
        if (!this.visibleToHuman(g, b.x, b.y)) continue;
        const p = S(b.x, b.y);
        const v = g.players[b.pid];
        drawBean(ctx, p.x, p.y, ppt * 1.1, v.color, { dead: true });
      }
      /* jogadores */
      const list = g.players.slice().sort((a, b) => a.y - b.y);
      const hDead = h && !h.alive;
      for (const p of list) {
        if (p.inVent) continue;
        let alpha = 1;
        if (!p.alive) {
          if (!hDead && p !== h) continue;
          alpha = 0.45;
        } else if (p.invisUntil > g.t) {
          if (p === h || (h && h.isImp && p.isImp)) alpha = 0.3;
          else if (hDead) alpha = 0.3;
          else continue;
        }
        if (p !== h && p.alive && !this.visibleToHuman(g, p.x, p.y)) continue;
        const ap = g.appear(p);
        const sp = S(p.x, p.y);
        const pp = S(p.petX, p.petY);
        if (p.alive) drawPet(ctx, pp.x, pp.y, ppt * 1.1, ap.pet, ap.color, p.facing);
        if (p.visual && p.visual.type === 'scan' && p.alive) {
          ctx.fillStyle = 'rgba(80,255,160,0.25)';
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y + ppt * 0.35, ppt * 0.8, ppt * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p.protectedUntil > g.t && (hDead || (h && h.special === 'anjo'))) {
          ctx.strokeStyle = 'rgba(120,200,255,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y - ppt * 0.1, ppt * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawBean(ctx, sp.x, sp.y, ppt * 1.1, ap.color, { facing: p.facing, moving: p.moving, walk: p.walkT, ghost: !p.alive, alpha, hat: ap.hat, visor: ap.visor });
        if (p.visual && p.visual.type === 'scan' && p.alive) {
          const yy = sp.y - ppt * 0.6 + ((t * 1.6) % 1) * ppt * 1.1;
          ctx.fillStyle = 'rgba(80,255,160,0.55)';
          ctx.fillRect(sp.x - ppt * 0.45, yy, ppt * 0.9, ppt * 0.08);
        }
        const partner = h && h.isImp && p.isImp;
        ctx.font = `700 ${Math.max(11, ppt * 0.42)}px "Nunito", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.globalAlpha = alpha;
        ctx.strokeText(ap.name, sp.x, sp.y - ppt * 0.95);
        ctx.fillStyle = partner ? '#ff5a5a' : '#ffffff';
        ctx.fillText(ap.name, sp.x, sp.y - ppt * 0.95);
        ctx.globalAlpha = 1;
      }
      /* efeitos */
      for (const f of g.fx) {
        if (!this.visibleToHuman(g, f.x, f.y) && !(h && (f.type === 'kill' && h.isImp))) continue;
        const k = (g.t - f.t0) / (f.dur || 1);
        const p = S(f.x, f.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (f.type === 'kill') {
          ctx.strokeStyle = '#ff2b2b';
          ctx.lineWidth = ppt * 0.12;
          ctx.beginPath();
          ctx.moveTo(p.x - ppt * (0.8 - k * 0.3), p.y - ppt * 0.8);
          ctx.lineTo(p.x + ppt * 0.8, p.y + ppt * (0.6 - k * 0.3));
          ctx.stroke();
        } else if (f.type === 'vent') {
          ctx.fillStyle = 'rgba(160,170,190,0.6)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, ppt * (0.4 + k), 0, Math.PI * 2);
          ctx.fill();
        } else if (f.type === 'puff') {
          ctx.fillStyle = 'rgba(200,120,255,0.6)';
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * ppt * k, p.y + Math.sin(a) * ppt * k, ppt * 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (f.type === 'shield') {
          ctx.strokeStyle = 'rgba(120,200,255,0.9)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ppt * (0.7 + k * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      /* névoa de visão */
      if (h && h.alive) this.drawFog(g, h, S, ppt);
      /* sabotagem crítica: vinheta vermelha */
      if (g.sabCritical()) {
        const a = 0.18 + Math.sin(t * 6) * 0.12;
        const grd = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.3, cv.width / 2, cv.height / 2, cv.height * 0.8);
        grd.addColorStop(0, 'rgba(255,0,0,0)');
        grd.addColorStop(1, `rgba(255,0,0,${a})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
      this.drawArrows(g, t, S, ppt);
    },
    drawVisualFx(g, t, S, ppt) {
      const ctx = this.ctx;
      for (const p of g.players) {
        if (!p.visual || !p.alive) continue;
        if (p.visual.type === 'asteroids') {
          const o = S(99.5, 10.5);
          if (!this.visibleToHuman(g, 99.5, 8)) continue;
          ctx.strokeStyle = 'rgba(120,255,200,0.8)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 2; i++) {
            const a = -Math.PI / 2 + Math.sin(t * 3 + i * 2) * 0.8;
            ctx.beginPath();
            ctx.moveTo(o.x, o.y);
            ctx.lineTo(o.x + Math.cos(a) * ppt * 5, o.y + Math.sin(a) * ppt * 5);
            ctx.stroke();
          }
        } else if (p.visual.type === 'shields') {
          if (!this.visibleToHuman(g, 102, 59)) continue;
          const o = S(102, 59);
          ctx.fillStyle = `rgba(90,180,255,${0.25 + Math.sin(t * 8) * 0.1})`;
          ctx.beginPath();
          ctx.arc(o.x, o.y, ppt * 3.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.visual.type === 'garbage') {
          if (!this.visibleToHuman(g, 60.5, 64.5)) continue;
          const o = S(60.5, 65.5);
          ctx.fillStyle = 'rgba(160,140,90,0.8)';
          for (let i = 0; i < 6; i++) ctx.fillRect(o.x + Math.sin(t * 5 + i) * ppt, o.y + ((t * 2 + i * 0.3) % 1) * ppt, ppt * 0.2, ppt * 0.2);
        }
      }
    },
    drawFog(g, h, S, ppt) {
      const fc = this.fogCtx, cv = this.canvas;
      const r = g.visionOf(h);
      fc.globalCompositeOperation = 'source-over';
      fc.clearRect(0, 0, cv.width, cv.height);
      fc.fillStyle = 'rgba(3,5,12,0.88)';
      fc.fillRect(0, 0, cv.width, cv.height);
      fc.globalCompositeOperation = 'destination-out';
      const eye = h.inVent ? M.VENT[h.inVent] : h;
      const poly = Nav.visPoly(eye.x, eye.y, r, 240);
      const c0 = S(eye.x, eye.y);
      const grd = fc.createRadialGradient(c0.x, c0.y, r * ppt * 0.6, c0.x, c0.y, r * ppt);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      fc.fillStyle = grd;
      fc.beginPath();
      poly.forEach((pt, i) => {
        const s = S(pt.x, pt.y);
        if (i) fc.lineTo(s.x, s.y);
        else fc.moveTo(s.x, s.y);
      });
      fc.closePath();
      fc.fill();
      this.ctx.drawImage(this.fog, 0, 0);
    },
    drawArrows(g, t, S, ppt) {
      const ctx = this.ctx, cv = this.canvas, h = g.human;
      if (!h) return;
      const arrow = (x, y, color) => {
        const p = S(x, y);
        const cx = cv.width / 2, cy = cv.height / 2;
        const dx = p.x - cx, dy = p.y - cy;
        const margin = 40 * (this.dpr || 1);
        if (Math.abs(dx) < cx - margin && Math.abs(dy) < cy - margin) return;
        const k = Math.min((cx - margin) / Math.abs(dx || 1), (cy - margin) / Math.abs(dy || 1));
        const ax = cx + dx * k, ay = cy + dy * k;
        const a = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      if (g.sab && h.alive) for (const st of g.sabStationsNeeded()) arrow(M.SAB_STATIONS[st].x, M.SAB_STATIONS[st].y, '#ff4747');
      for (const pg of g.pings) if (h.alive) arrow(pg.x, pg.y, '#ffb347');
      if (h.trackTarget != null && h.trackUntil > g.t) {
        const q = g.players[h.trackTarget];
        if (q.alive) arrow(q.x, q.y, '#6fe3ff');
      }
      if (!h.isImp) {
        for (const tk of h.tasks) {
          if (tk.done || tk.step === 0 || !g.taskAvailable(tk)) continue;
          const st = M.STATIONS[tk.steps[tk.step]];
          arrow(st.x, st.y, '#ffd640');
        }
      }
    },
    /* Vista de câmera sem névoa (painel de segurança). */
    drawCam(canvas, g, cam, t) {
      const ctx = canvas.getContext('2d');
      const ppt = canvas.width / 16;
      const x0 = cam.x - 8, y0 = cam.y - (canvas.height / ppt) / 2;
      ctx.fillStyle = '#05070f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticCanvas, x0 * PX, y0 * PX, 16 * PX, (canvas.height / ppt) * PX, 0, 0, canvas.width, canvas.height);
      const S = (x, y) => ({ x: (x - x0) * ppt, y: (y - y0) * ppt });
      for (const b of g.bodies) {
        if (b.gone || U.d2(b.x, b.y, cam.x, cam.y) > M.CAM_R || !Nav.los(cam.x, cam.y, b.x, b.y)) continue;
        const p = S(b.x, b.y);
        drawBean(ctx, p.x, p.y, ppt * 1.1, g.players[b.pid].color, { dead: true });
      }
      for (const p of g.players) {
        if (!p.alive || p.inVent || p.invisUntil > g.t) continue;
        if (U.d2(p.x, p.y, cam.x, cam.y) > M.CAM_R || !Nav.los(cam.x, cam.y, p.x, p.y)) continue;
        const ap = g.appear(p);
        const s = S(p.x, p.y);
        drawBean(ctx, s.x, s.y, ppt * 1.1, ap.color, { facing: p.facing, moving: p.moving, walk: p.walkT, hat: ap.hat, visor: ap.visor });
      }
      ctx.fillStyle = 'rgba(0,255,120,0.05)';
      for (let y = 0; y < canvas.height; y += 3) ctx.fillRect(0, y, canvas.width, 1);
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff3b3b' : 'transparent';
      ctx.beginPath();
      ctx.arc(12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
    },
    staticMap() {
      if (!staticCanvas) prerender();
      return staticCanvas;
    },
  };

  AU.Render = R;
})();

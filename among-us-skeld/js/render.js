/* Renderização: mapa pré-desenhado, tripulantes, corpos, efeitos, névoa de visão e ícones SVG. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;
  /* mapa pré-desenhado em 32 px por tile (nítido); aparelhos com pouca memória ficam com 24 */
  const PX = typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory < 4 ? 24 : 32;

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

  /* saindo do duto: o desenho cresce com um pulinho */
  function popScale(g, p) {
    if (p.popT == null) return 1;
    const k = (g.t - p.popT) / 0.35;
    if (k >= 1 || k < 0) return 1;
    return Math.max(0.05, 1 + Math.sin(k * Math.PI) * 0.25 - (1 - k) * 0.9);
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
      /* corpo como no original: só a metade de baixo, cortada, com o osso para fora */
      ctx.fillStyle = col.shade;
      ctx.globalAlpha *= 0.55;
      ctx.beginPath();
      ctx.ellipse(0.02 * u, 0.33 * u, 0.5 * u, 0.12 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
      /* pernas */
      ctx.fillStyle = col.hex;
      rr(ctx, -0.3 * u, 0.12 * u, 0.24 * u, 0.24 * u, 0.08 * u);
      ctx.fill();
      ctx.stroke();
      rr(ctx, 0.06 * u, 0.12 * u, 0.24 * u, 0.24 * u, 0.08 * u);
      ctx.fill();
      ctx.stroke();
      /* mochila */
      ctx.fillStyle = col.shade;
      rr(ctx, -0.48 * u, -0.1 * u, 0.18 * u, 0.3 * u, 0.06 * u);
      ctx.fill();
      ctx.stroke();
      /* metade de baixo do corpo */
      ctx.fillStyle = col.hex;
      rr(ctx, -0.34 * u, -0.1 * u, 0.68 * u, 0.4 * u, [0.02 * u, 0.02 * u, 0.12 * u, 0.12 * u]);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = col.shade;
      ctx.globalAlpha *= 0.5;
      ctx.beginPath();
      ctx.ellipse(-0.3 * u, 0.25 * u, 0.3 * u, 0.3 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      rr(ctx, -0.34 * u, -0.1 * u, 0.68 * u, 0.4 * u, [0.02 * u, 0.02 * u, 0.12 * u, 0.12 * u]);
      ctx.stroke();
      /* corte (vermelho escuro) */
      ctx.fillStyle = '#7a0f1a';
      ctx.beginPath();
      ctx.ellipse(0, -0.1 * u, 0.34 * u, 0.09 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b3202e';
      ctx.beginPath();
      ctx.ellipse(-0.04 * u, -0.11 * u, 0.22 * u, 0.05 * u, 0, 0, Math.PI * 2);
      ctx.fill();
      /* osso */
      ctx.fillStyle = '#f4f0e6';
      rr(ctx, -0.05 * u, -0.34 * u, 0.1 * u, 0.26 * u, 0.04 * u);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.055 * u, -0.36 * u, 0.065 * u, 0, Math.PI * 2);
      ctx.arc(0.055 * u, -0.36 * u, 0.065 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-0.055 * u, -0.36 * u, 0.06 * u, 0, Math.PI * 2);
      ctx.arc(0.055 * u, -0.36 * u, 0.06 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    /* passada: a perna que vai à frente levanta, a de trás empurra; o corpo inclina um pouco na direção do passo */
    const ph = (o.walk || 0) * 11;
    const sw = o.moving ? Math.sin(ph) * 0.1 * u : 0;
    const liftA = o.moving ? Math.sin(ph) * 0.04 * u : 0, liftB = -liftA;
    if (o.moving && !o.ghost) {
      ctx.translate(0, 0.3 * u);
      ctx.rotate(0.06 + Math.sin(ph * 2) * 0.015);
      ctx.translate(0, -0.3 * u);
    }
    if (o.ghost) ctx.translate(0, Math.sin(performance.now() / 420 + x * 0.01) * 0.04 * u);
    ctx.fillStyle = col.shade;
    rr(ctx, -0.5 * u, -0.3 * u, 0.2 * u, 0.44 * u, 0.07 * u);
    ctx.fill();
    ctx.stroke();
    if (!o.ghost) {
      ctx.fillStyle = col.hex;
      rr(ctx, -0.32 * u - sw, 0.12 * u - liftB, 0.24 * u, 0.3 * u, 0.08 * u);
      ctx.fill();
      ctx.stroke();
      rr(ctx, 0.06 * u + sw, 0.12 * u - liftA, 0.24 * u, 0.3 * u, 0.08 * u);
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

  /* ---------- mapa estático (desenhado em decor.js) ---------- */
  let staticCanvas = null;
  function prerender() {
    staticCanvas = AU.Decor.build(PX);
    return staticCanvas;
  }

  const FOG = 'rgba(3,5,12,0.88)';

  /* ---------- cache de ladrilhos do mapa ----------
     O mapa estático é grande; redimensioná-lo inteiro para a tela a cada quadro custa caro em aparelhos sem placa de
     vídeo. Ele é cortado em ladrilhos já na escala da tela (com 1 px de sobra em volta, para não aparecer costura),
     gerados sob demanda e guardados; a cada quadro só copia os ladrilhos visíveis 1:1. */
  const TILE = 384;
  /* pool: canvas de ladrilhos que saíram do cache, reaproveitados (criar canvas novo a toda hora pesa na memória e
     acaba em pausas de coleta de lixo) */
  const tiles = { ppt: 0, map: new Map(), max: 32, pool: [] };
  const POOL_MAX = 12;
  function drop(c) {
    if (tiles.pool.length < POOL_MAX) tiles.pool.push(c);
  }
  function makeTile(tx, ty, ppt) {
    let c = tiles.pool.pop();
    if (!c) {
      c = document.createElement('canvas');
      c.width = TILE + 2;
      c.height = TILE + 2;
    }
    const cx = c.getContext('2d');
    cx.clearRect(0, 0, c.width, c.height);
    cx.imageSmoothingEnabled = true;
    const k = PX / ppt;
    const sx = (tx * TILE - 1) * k, sy = (ty * TILE - 1) * k, sw = (TILE + 2) * k;
    /* recorta a origem nos limites do mapa (fora dele fica transparente e aparece o fundo estrelado) */
    const cx0 = Math.max(0, sx), cy0 = Math.max(0, sy), cx1 = Math.min(staticCanvas.width, sx + sw), cy1 = Math.min(staticCanvas.height, sy + sw);
    if (cx1 > cx0 && cy1 > cy0) cx.drawImage(staticCanvas, cx0, cy0, cx1 - cx0, cy1 - cy0, (cx0 - sx) / k, (cy0 - sy) / k, (cx1 - cx0) / k, (cy1 - cy0) / k);
    tiles.map.set(tx + ',' + ty, c);
    while (tiles.map.size > tiles.max) {
      const old = tiles.map.keys().next().value;
      drop(tiles.map.get(old));
      tiles.map.delete(old);
    }
    return c;
  }
  function mapTile(tx, ty, ppt) {
    if (tiles.ppt !== ppt) {
      for (const c of tiles.map.values()) drop(c);
      tiles.map.clear();
      tiles.ppt = ppt;
    }
    const key = tx + ',' + ty;
    const c = tiles.map.get(key);
    if (c) {
      tiles.map.delete(key);
      tiles.map.set(key, c);
      return c;
    }
    return makeTile(tx, ty, ppt);
  }
  /* Adianta um ladrilho por quadro da faixa em volta da tela, começando pelo lado para onde a câmera anda. Assim,
     quando a câmera entra num pedaço novo do mapa, ele já está pronto (antes, 4 ou 5 ladrilhos eram gerados no
     mesmo quadro e o jogo dava uma travadinha). */
  const cam0 = { x: 0, y: 0, vx: 0, vy: 0 };
  function prefetch(tx0, ty0, tx1, ty1, ppt) {
    const k = PX / ppt;
    let best = null, bs = -Infinity;
    for (let ty = ty0 - 1; ty <= ty1 + 1; ty++) {
      for (let tx = tx0 - 1; tx <= tx1 + 1; tx++) {
        if (tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1) continue;
        const key = tx + ',' + ty, have = tiles.map.get(key);
        if (have) {
          /* mantém a faixa como "usada agora", para o cache descartar primeiro o que ficou para trás */
          tiles.map.delete(key);
          tiles.map.set(key, have);
          continue;
        }
        /* fora do mapa (só estrelas): não precisa */
        if ((tx + 1) * TILE * k <= 0 || (ty + 1) * TILE * k <= 0 || tx * TILE * k >= staticCanvas.width || ty * TILE * k >= staticCanvas.height) continue;
        const dx = tx - (tx0 + tx1) / 2, dy = ty - (ty0 + ty1) / 2;
        const sc = dx * cam0.vx + dy * cam0.vy - Math.hypot(dx, dy);
        if (sc > bs) {
          bs = sc;
          best = [tx, ty];
        }
      }
    }
    if (best) makeTile(best[0], best[1], ppt);
  }
  function blitMap(ctx, cv, px0, py0, ppt) {
    const tx0 = Math.floor(px0 / TILE), ty0 = Math.floor(py0 / TILE);
    const tx1 = Math.floor((px0 + cv.width - 1) / TILE), ty1 = Math.floor((py0 + cv.height - 1) / TILE);
    /* cabe a tela, a faixa adiantada em volta e um pouco de folga */
    tiles.max = Math.max(24, (tx1 - tx0 + 3) * (ty1 - ty0 + 3) + 6);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) ctx.drawImage(mapTile(tx, ty, ppt), 1, 1, TILE, TILE, tx * TILE - px0, ty * TILE - py0, TILE, TILE);
    }
    /* para onde a câmera anda (média suave, em pixels por quadro) */
    cam0.vx = cam0.vx * 0.9 + (px0 - cam0.x) * 0.1;
    cam0.vy = cam0.vy * 0.9 + (py0 - cam0.y) * 0.1;
    cam0.x = px0;
    cam0.y = py0;
    prefetch(tx0, ty0, tx1, ty1, ppt);
  }

  /* ---------- portas ----------
     Aberta: vão livre, só o trilho no chão (mapa estático) e a ponta de cada folha recolhida no batente.
     Fechada: duas folhas de metal que deslizam das laterais até o meio, com a faixa de perigo por cima e a luz
     vermelha piscando no encontro. (Antes a faixa ficava pintada no chão do vão e a porta aberta parecia fechada.) */
  function hazardBand(ctx, x, y, w, h, horiz, anchor, s) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = '#f0c93a';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#17181d';
    ctx.beginPath();
    /* listras presas à borda de encontro da folha: andam junto com ela */
    const th = horiz ? h : w, from = (horiz ? x : y) - th, to = (horiz ? x + w : y + h) + th;
    for (let u = anchor - Math.ceil((anchor - from) / (2 * s)) * 2 * s; u < to; u += 2 * s) {
      if (horiz) {
        ctx.moveTo(u, y + h);
        ctx.lineTo(u + s, y + h);
        ctx.lineTo(u + s + h, y);
        ctx.lineTo(u + h, y);
      } else {
        ctx.moveTo(x, u);
        ctx.lineTo(x, u + s);
        ctx.lineTo(x + w, u + s + w);
        ctx.lineTo(x + w, u + w);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  function drawDoors(ctx, S, ppt, t, g) {
    const lw = Math.max(1.5, ppt * 0.05);
    for (const d of M.DOORS) {
      const prog = d.animT != null ? Math.min(1, Math.max(0, (g.t - d.animT) / 0.35)) : 1;
      const amt = d.closed ? prog : 1 - prog;
      const [x, y, w, hh] = d.rect;
      const p = S(x, y);
      const horiz = w > hh;
      const L = (horiz ? w : hh) * ppt, T = (horiz ? hh : w) * ppt;
      /* folha recolhida: só a ponta aparece, colada no batente */
      const half = Math.max(ppt * 0.1, (L / 2) * amt);
      const inset = amt <= 0.01 ? T * 0.14 : 0;
      for (const side of [0, 1]) {
        const a0 = side ? L - half : 0;
        const rx = horiz ? p.x + a0 : p.x + inset, ry = horiz ? p.y + inset : p.y + a0;
        const rw = horiz ? half : T - inset * 2, rh = horiz ? T - inset * 2 : half;
        ctx.fillStyle = '#7a8499';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        if (horiz) ctx.fillRect(rx, ry, rw, T * 0.16);
        else ctx.fillRect(rx, ry, T * 0.16, rh);
        const inner = horiz ? (side ? rx : rx + rw) : side ? ry : ry + rh;
        if (amt > 0.01) {
          /* faixa de perigo ao longo da folha: só existe com a porta fechando ou fechada */
          const bt = T * 0.36, off = (T - bt) / 2;
          if (horiz) hazardBand(ctx, rx, ry + off, rw, bt, true, inner, ppt * 0.16);
          else hazardBand(ctx, rx + off, ry, bt, rh, false, inner, ppt * 0.16);
        }
        /* borda de encontro (amarela) */
        ctx.fillStyle = '#f0c93a';
        const ew = Math.min(half, ppt * 0.07);
        if (horiz) ctx.fillRect(side ? rx : rx + rw - ew, ry, ew, rh);
        else ctx.fillRect(rx, side ? ry : ry + rh - ew, rw, ew);
        ctx.strokeStyle = '#0b0d12';
        ctx.lineWidth = lw;
        ctx.strokeRect(rx, ry, rw, rh);
      }
      if (d.closed && amt > 0.95) {
        ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b3b' : '#7a1010';
        const cx = p.x + (horiz ? L / 2 : T / 2), cy = p.y + (horiz ? T / 2 : L / 2);
        ctx.beginPath();
        ctx.arc(cx, cy, ppt * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0b0d12';
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      }
    }
  }

  /* ---------- fundo estrelado ---------- */
  const stars = [];
  for (let i = 0; i < 260; i++) stars.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2 });

  /* ---------- renderização principal ---------- */
  const R = {
    PX, drawBean, beanSVG, drawPet, rr,
    canvas: null,
    ctx: null,
    ppt: 32,
    cam: { x: 69, y: 14 },
    setup(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
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
      /* câmera alinhada ao pixel: mapa e personagens andam juntos, sem tremer */
      const px0 = Math.round((this.cam.x - vw / 2) * ppt), py0 = Math.round((this.cam.y - vh / 2) * ppt);
      const x0 = px0 / ppt, y0 = py0 / ppt;
      ctx.imageSmoothingEnabled = true;
      blitMap(ctx, cv, px0, py0, ppt);
      const S = (x, y) => ({ x: (x - x0) * ppt, y: (y - y0) * ppt });
      /* máquinas, telas, luzes e plantas animadas (só o que está na tela) */
      if (AU.Decor.drawLive) AU.Decor.drawLive(ctx, S, ppt, t, g, x0, y0, vw, vh);

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
      drawDoors(ctx, S, ppt, t, g);
      /* câmeras: luz vermelha quando alguém assiste */
      if (g.anyoneOnCams()) {
        for (const cam of M.CAMS) {
          const cp = AU.Decor.camPos ? AU.Decor.camPos(cam) : { x: cam.x, y: cam.y - 1.6 };
          const p = S(cp.x, cp.y + 0.18);
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
      const fogOn = !!(h && h.alive);
      /* luz do jogador: o nome de quem está na borda escurece junto com o boneco (no apagão, nome claro no escuro
         entregava quem estava ali) */
      const eye = fogOn ? (h.inVent ? M.VENT[h.inVent] : h) : null, Rv = fogOn ? g.visionOf(h) : 0;
      const lit = (x, y) => (eye ? 1 - 0.88 * U.clamp((U.d2(eye.x, eye.y, x, y) - Rv * 0.6) / (Rv * 0.4), 0, 1) : 1);
      const labels = [];
      let mine = null;
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
        if (p.visual && p.visual.type === 'scan' && p.alive) this.scanBack(sp, ppt, t);
        if (p.protectedUntil > g.t && (hDead || (h && h.special === 'anjo'))) {
          ctx.strokeStyle = 'rgba(120,200,255,0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y - ppt * 0.1, ppt * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }
        const bean = { facing: p.facing, moving: p.moving, walk: p.walkT, ghost: !p.alive, alpha, hat: ap.hat, visor: ap.visor };
        /* o próprio personagem é desenhado por cima da névoa: encostado na parede ele não fica meio apagado */
        if (p === h && h.alive && fogOn) mine = { sp, color: ap.color, bean, s: popScale(g, p) };
        else drawBean(ctx, sp.x, sp.y - (1 - popScale(g, p)) * ppt * 0.3, ppt * 1.1 * popScale(g, p), ap.color, bean);
        if (p.visual && p.visual.type === 'scan' && p.alive && !(p === h && mine)) this.scanFront(sp, ppt, t);
        const partner = h && h.isImp && p.isImp;
        /* nomes depois da névoa: o nome fica acima da cabeça e às vezes cai sobre a parede escura */
        labels.push({ name: ap.name, x: sp.x, y: sp.y - ppt * 0.95, alpha: p === h ? alpha : alpha * lit(p.x, p.y), color: partner ? '#ff5a5a' : '#ffffff' });
      }
      /* efeitos */
      for (const f of g.fx) {
        if (!this.visibleToHuman(g, f.x, f.y) && !(h && (f.type === 'kill' && h.isImp))) continue;
        const k = (g.t - f.t0) / (f.dur || 1);
        const p = S(f.x, f.y);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k);
        if (f.type === 'kill') {
          /* golpe rápido e respingo na cor da vítima */
          const col = (C.COLOR[f.color] || C.COLORS[0]);
          if (k < 0.3) {
            ctx.globalAlpha = 1 - k / 0.3;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = ppt * 0.1;
            ctx.beginPath();
            ctx.moveTo(p.x - ppt * 0.9, p.y - ppt * 0.9);
            ctx.lineTo(p.x + ppt * 0.9, p.y + ppt * 0.5);
            ctx.stroke();
          }
          ctx.globalAlpha = Math.max(0, 1 - k * 0.9);
          for (let i = 0; i < 12; i++) {
            const a = ((f.seed + i * 37) % 100) / 100 * Math.PI * 2;
            const d = (0.35 + (((f.seed * 7 + i * 13) % 100) / 100) * 0.9) * Math.min(1, k * 2.5) * ppt;
            const r = ppt * (0.09 - i * 0.004) * (1 - k * 0.5);
            ctx.fillStyle = i % 3 ? col.hex : col.shade;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * d, p.y - ppt * 0.1 + Math.sin(a) * d * 0.6 + k * k * ppt * 0.4, Math.max(1, r), 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (f.type === 'ventIn' || f.type === 'ventOut') {
          /* tampa do duto abre, o personagem pula para dentro (ou sai de dentro) e a tampa fecha */
          ctx.globalAlpha = 1;
          const open = k < 0.2 ? k / 0.2 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
          ctx.fillStyle = '#05070b';
          rr(ctx, p.x - ppt * 0.6, p.y - ppt * 0.36, ppt * 1.2, ppt * 0.72, ppt * 0.1);
          ctx.fill();
          if (f.type === 'ventIn' && k > 0.15 && k < 0.8) {
            const u = (k - 0.15) / 0.65;
            const sc = u < 0.25 ? 1 + u * 0.4 : Math.max(0.05, 1.1 - (u - 0.25) * 1.9);
            ctx.save();
            ctx.beginPath();
            ctx.rect(p.x - ppt, p.y - ppt * 2.2, ppt * 2, ppt * 2.55);
            ctx.clip();
            drawBean(ctx, p.x, p.y - ppt * 0.25 + (u > 0.25 ? (u - 0.25) * ppt * 0.9 : -u * ppt * 0.6), ppt * 1.1 * sc, f.color, { facing: f.facing, hat: f.hat, visor: f.visor });
            ctx.restore();
          }
          /* tampa: grade presa na borda de cima, levantando */
          const lh = ppt * 0.72 * open;
          ctx.fillStyle = '#5b6476';
          ctx.strokeStyle = '#0b0d12';
          ctx.lineWidth = Math.max(1.5, ppt * 0.05);
          rr(ctx, p.x - ppt * 0.6, p.y - ppt * 0.36 - lh, ppt * 1.2, Math.max(2, lh), ppt * 0.08);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          for (let i = 1; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(p.x - ppt * 0.6 + i * ppt * 0.2, p.y - ppt * 0.36 - lh + 2);
            ctx.lineTo(p.x - ppt * 0.6 + i * ppt * 0.2, p.y - ppt * 0.36 - 2);
            ctx.stroke();
          }
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
      if (fogOn) this.drawFog(g, h, S, ppt);
      if (mine) {
        drawBean(ctx, mine.sp.x, mine.sp.y - (1 - mine.s) * ppt * 0.3, ppt * 1.1 * mine.s, mine.color, mine.bean);
        if (h.visual && h.visual.type === 'scan') this.scanFront(mine.sp, ppt, t);
      }
      ctx.font = `700 ${Math.max(11, ppt * 0.42)}px "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      for (const l of labels) {
        ctx.globalAlpha = l.alpha;
        ctx.strokeText(l.name, l.x, l.y);
        ctx.fillStyle = l.color;
        ctx.fillText(l.name, l.x, l.y);
      }
      ctx.globalAlpha = 1;
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
      const hsh = (n) => {
        const x = Math.sin(n * 127.1) * 43758.5453;
        return x - Math.floor(x);
      };
      for (const p of g.players) {
        if (!p.visual || !p.alive) continue;
        if (p.visual.type === 'asteroids') {
          /* pela janela de Armas: a pedra entra, o canhão atira e ela explode */
          if (!this.visibleToHuman(g, 99.5, 4.4)) continue;
          const wx = 95.2, wy = 2.5, ww = 8, wh = 1.25;
          const q = S(wx, wy);
          ctx.save();
          ctx.beginPath();
          ctx.rect(q.x, q.y, ww * ppt, wh * ppt);
          ctx.clip();
          const cyc = 0.8;
          for (let back = 1; back >= 0; back--) {
            const n = Math.floor(t / cyc) - back, k = (t / cyc) - n;
            if (k > 1.6) continue;
            const ax = wx + 0.6 + hsh(n) * (ww - 1.2) - k * 0.5, ay = wy + 0.25 + hsh(n + 0.5) * (wh - 0.5);
            const A = S(ax, ay);
            const cx0 = n % 2 ? 98.2 : 100.8;
            const T = S(cx0, 2.45);
            if (k < 0.35) {
              /* pedra girando */
              ctx.save();
              ctx.translate(A.x, A.y);
              ctx.rotate(t * 2 + n);
              ctx.fillStyle = '#7d7466';
              ctx.strokeStyle = '#2d2922';
              ctx.lineWidth = Math.max(1, ppt * 0.04);
              ctx.beginPath();
              for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2, r = ppt * (0.16 + hsh(n * 7 + i) * 0.08);
                if (i) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              }
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
            if (k > 0.18 && k < 0.36) {
              /* laser do cano até a pedra */
              const f = (k - 0.18) / 0.18;
              ctx.strokeStyle = 'rgba(140,255,210,0.95)';
              ctx.lineWidth = Math.max(2, ppt * 0.08);
              ctx.beginPath();
              ctx.moveTo(T.x + (A.x - T.x) * Math.max(0, f - 0.4), T.y + (A.y - T.y) * Math.max(0, f - 0.4));
              ctx.lineTo(T.x + (A.x - T.x) * f, T.y + (A.y - T.y) * f);
              ctx.stroke();
              ctx.fillStyle = 'rgba(200,255,230,0.9)';
              ctx.beginPath();
              ctx.arc(T.x, T.y, ppt * 0.14 * (1 - f), 0, Math.PI * 2);
              ctx.fill();
            }
            if (k >= 0.35 && k < 1) {
              /* explosão e cacos */
              const e = (k - 0.35) / 0.65;
              ctx.fillStyle = `rgba(255,${Math.round(200 - e * 120)},60,${0.9 * (1 - e)})`;
              ctx.beginPath();
              ctx.arc(A.x, A.y, ppt * (0.15 + e * 0.45), 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = `rgba(125,116,102,${1 - e})`;
              for (let i = 0; i < 6; i++) {
                const a = hsh(n * 3 + i) * Math.PI * 2;
                ctx.fillRect(A.x + Math.cos(a) * e * ppt * 0.8, A.y + Math.sin(a) * e * ppt * 0.8, ppt * 0.08, ppt * 0.08);
              }
            }
          }
          ctx.restore();
        } else if (p.visual.type === 'shields') {
          /* escudos: onda hexagonal saindo do gerador e a colmeia acendendo */
          const F = AU.Decor.SHIELD_FX;
          if (!this.visibleToHuman(g, F.x, F.y)) continue;
          const o = S(F.x, F.y);
          const e = U.clamp(1 - (p.visual.until - g.t) / 2.5, 0, 1);
          const hex = (x, y, r) => {
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const b = (k / 6) * Math.PI * 2 + Math.PI / 6;
              if (k) ctx.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
              else ctx.moveTo(x + Math.cos(b) * r, y + Math.sin(b) * r);
            }
            ctx.closePath();
          };
          for (let ring = 0; ring < 3; ring++) {
            const rr = (e * 1.4 - ring * 0.18);
            if (rr <= 0 || rr > 1) continue;
            ctx.strokeStyle = `rgba(140,200,255,${(1 - rr) * 0.9})`;
            ctx.lineWidth = Math.max(2, ppt * 0.12 * (1 - rr));
            hex(o.x, o.y, ppt * (0.8 + rr * 4));
            ctx.stroke();
          }
          const cellR = ppt * 0.42;
          for (let i = -3; i <= 3; i++) {
            for (let j = -3; j <= 3; j++) {
              const hx = o.x + (i + (j & 1) * 0.5) * cellR * 1.75, hy = o.y + j * cellR * 1.5;
              const dd = Math.hypot(hx - o.x, hy - o.y) / (ppt * 3);
              if (dd > 1) continue;
              const on = U.clamp(e * 2.2 - dd, 0, 1) * (1 - Math.max(0, e - 0.7) / 0.3);
              if (on <= 0) continue;
              ctx.fillStyle = `rgba(120,180,255,${on * 0.28})`;
              hex(hx, hy, cellR * 0.9);
              ctx.fill();
            }
          }
        } else if (p.visual.type === 'scan') {
          /* o scan em si é desenhado junto do personagem (luz atrás e linha na frente) */
        }
      }
    },
    /* scan da MedBay: coluna de luz atrás do personagem e a faixa que sobe e desce na frente */
    scanBack(sp, ppt, t) {
      const ctx = this.ctx;
      const base = sp.y + ppt * 0.38, top = sp.y - ppt * 1.25;
      const grd = ctx.createLinearGradient(0, base, 0, top);
      grd.addColorStop(0, 'rgba(80,255,170,0.55)');
      grd.addColorStop(1, 'rgba(80,255,170,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(sp.x - ppt * 0.62, base);
      ctx.lineTo(sp.x - ppt * 0.5, top);
      ctx.lineTo(sp.x + ppt * 0.5, top);
      ctx.lineTo(sp.x + ppt * 0.62, base);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(120,255,200,${0.6 + Math.sin(t * 10) * 0.3})`;
      ctx.lineWidth = Math.max(1.5, ppt * 0.06);
      ctx.beginPath();
      ctx.ellipse(sp.x, base, ppt * 0.62, ppt * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
    scanFront(sp, ppt, t) {
      const ctx = this.ctx;
      const ph = (t * 0.9) % 2, k = ph < 1 ? ph : 2 - ph;
      const yy = sp.y + ppt * 0.35 - k * ppt * 1.25;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createLinearGradient(0, yy - ppt * 0.2, 0, yy + ppt * 0.2);
      grd.addColorStop(0, 'rgba(60,255,160,0)');
      grd.addColorStop(0.5, 'rgba(90,255,180,0.55)');
      grd.addColorStop(1, 'rgba(60,255,160,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(sp.x - ppt * 0.55, yy - ppt * 0.2, ppt * 1.1, ppt * 0.4);
      ctx.fillStyle = 'rgba(200,255,230,0.9)';
      ctx.fillRect(sp.x - ppt * 0.55, yy - 1, ppt * 1.1, 2);
      /* pontinhos da grade de leitura */
      ctx.fillStyle = 'rgba(160,255,210,0.7)';
      for (let i = 0; i < 6; i++) {
        const dx = (i / 5 - 0.5) * ppt * 0.9;
        ctx.fillRect(sp.x + dx - 1, yy + (i % 2 ? -3 : 3), 2, 2);
      }
      ctx.restore();
    },
    /* névoa de visão desenhada direto na tela: uma pintura escura com um furo no formato do que se vê e, dentro do
       furo, só o degradê da borda (antes era uma tela à parte copiada por cima, com quatro passadas de tela cheia) */
    drawFog(g, h, S, ppt) {
      const ctx = this.ctx, cv = this.canvas;
      const r = g.visionOf(h);
      const eye = h.inVent ? M.VENT[h.inVent] : h;
      const poly = Nav.visPoly(eye.x, eye.y, r, 240);
      const c0 = S(eye.x, eye.y);
      const hole = new Path2D();
      poly.forEach((pt, i) => {
        const s = S(pt.x, pt.y);
        if (i) hole.lineTo(s.x, s.y);
        else hole.moveTo(s.x, s.y);
      });
      hole.closePath();
      const R = r * ppt;
      /* uma área só (tela inteira menos o furo da visão): em faixas separadas, a emenda aparecia como uma linha clara */
      const W = cv.width, H = cv.height;
      ctx.save();
      ctx.fillStyle = FOG;
      const all = new Path2D();
      all.rect(0, 0, W, H);
      all.addPath(hole);
      ctx.fill(all, 'evenodd');
      ctx.clip(hole);
      const grd = ctx.createRadialGradient(c0.x, c0.y, R * 0.6, c0.x, c0.y, R);
      grd.addColorStop(0, 'rgba(3,5,12,0)');
      grd.addColorStop(1, FOG);
      ctx.fillStyle = grd;
      /* o recorte vai 0,12 tile além do raio (para iluminar a face da parede): o degradê cobre o recorte inteiro,
         senão sobrava um anel sem névoa logo fora do círculo */
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
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
      /* portas fechadas também aparecem na câmera */
      drawDoors(ctx, S, ppt, t, g);
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

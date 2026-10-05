/* PAI 2.0 — gfx.js
 * Primitivas de desenho em pixel art para o palco 320x180.
 * Tudo aqui é puro (sem estado de jogo): paleta, retângulos, mapas de
 * pixels em texto, fonte bitmap 3x5, cores e um gerador pseudoaleatório.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  P2.W = 320;
  P2.H = 180;

  // ------------------------------------------------------------------
  // Paleta oficial do jogo. Use os nomes (P2.pal.night) ou os códigos.
  // ------------------------------------------------------------------
  P2.pal = {
    void: '#0d0b14',      // quase preto, roxeado
    ink: '#1a1830',       // contorno / sombra profunda
    navy: '#1b2547',      // noite profunda
    night: '#24305e',     // azul noturno
    night2: '#2f4580',    // azul noturno claro
    blue: '#4166a8',
    sky: '#6a9bd8',
    sky2: '#a8d0f0',
    white: '#f4f1e8',     // branco creme
    paper: '#e8e2d0',     // papel
    gray1: '#c9c3b6',
    gray2: '#8f8a99',
    gray3: '#5b5768',
    gray4: '#3a3646',
    lamp: '#ffd27a',      // luz de abajur
    amber: '#f2a53a',
    amber2: '#c77a2a',
    wood: '#7a4a2a',
    wood2: '#4e2f22',
    coral: '#ff8a5c',     // Faísca (luz)
    orange: '#f26b3a',    // Faísca (corpo)
    orange2: '#c94a2a',   // Faísca (sombra)
    mint: '#7ee0b8',
    mint2: '#3fbf8f',
    green: '#1f7a5e',
    red: '#e94b5a',
    red2: '#a82a3e',
    purple1: '#b48ae8',   // A Dúvida (luz)
    purple: '#7a4ac0',
    purple2: '#4a2a80',
    purple3: '#2c1850',
    skin1: '#f7c9a8',
    skin2: '#d9a07a',
    skin3: '#a8704a',
    skin4: '#6e4630',
    pink: '#ff7a9a',      // bochecha / vergonha
    hair: '#d8d8e0',      // grisalho
    hair2: '#9a98a8',     // grisalho sombra
    yellow: '#ffe066',
    teal: '#3aa8b8',
  };

  const G = (P2.gfx = {});

  // ------------------------------------------------------------------
  // Cores
  // ------------------------------------------------------------------
  function hexToRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return '#' + c(r) + c(g) + c(b);
  }
  G.hexToRgb = hexToRgb;
  G.rgbToHex = rgbToHex;
  /** Mistura duas cores hex (t de 0 a 1). */
  G.mix = function (a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  /** Clareia (amt > 0) ou escurece (amt < 0) uma cor. amt de -1 a 1. */
  G.shade = function (c, amt) {
    return amt >= 0 ? G.mix(c, '#ffffff', amt) : G.mix(c, '#000000', -amt);
  };
  /** Cor com transparência: rgba(...) a partir de hex. */
  G.alpha = function (c, a) {
    const A = hexToRgb(c);
    return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')';
  };

  // ------------------------------------------------------------------
  // Primitivas
  // ------------------------------------------------------------------
  G.rect = function (ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  G.px = function (ctx, x, y, c) {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  };
  /** Contorno de 1px. */
  G.strokeRect = function (ctx, x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  };
  /** Retângulo com cantos "arredondados" de 1px (estilo pixel art). */
  G.roundRect = function (ctx, x, y, w, h, c, r) {
    r = r == null ? 1 : r;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = c;
    for (let i = 0; i < h; i++) {
      let inset = 0;
      if (i < r) inset = r - i;
      else if (i >= h - r) inset = i - (h - r - 1);
      ctx.fillRect(x + inset, y + i, w - inset * 2, 1);
    }
  };
  /** Linha pixelada (Bresenham). */
  G.line = function (ctx, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    ctx.fillStyle = c;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 2000; guard++) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  /** Círculo cheio pixelado. */
  G.circle = function (ctx, cx, cy, r, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    ctx.fillStyle = c;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };
  /** Elipse cheia pixelada. */
  G.ellipse = function (ctx, cx, cy, rx, ry, c) {
    cx = Math.round(cx); cy = Math.round(cy);
    ctx.fillStyle = c;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };
  /** Faixas horizontais (degradê "em degraus" de cima para baixo). */
  G.bands = function (ctx, x, y, w, h, colors) {
    const n = colors.length;
    for (let i = 0; i < n; i++) {
      const y0 = Math.round(y + (h * i) / n);
      const y1 = Math.round(y + (h * (i + 1)) / n);
      ctx.fillStyle = colors[i];
      ctx.fillRect(Math.round(x), y0, Math.round(w), y1 - y0);
    }
  };
  /** Pontilhado (dither) em xadrez: pinta metade dos pixels da área. */
  G.dither = function (ctx, x, y, w, h, c, phase) {
    ctx.fillStyle = c;
    phase = phase || 0;
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) {
      for (let i = (j + phase) & 1; i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
    }
  };
  /** Pontilhado esparso (1 a cada 4 pixels). */
  G.dither4 = function (ctx, x, y, w, h, c, phase) {
    ctx.fillStyle = c;
    phase = phase || 0;
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) {
      const off = ((j >> 0) & 1) ? 2 : 0;
      if ((j + phase) % 2) continue;
      for (let i = off; i < w; i += 4) ctx.fillRect(x + i, y + j, 1, 1);
    }
  };

  // ------------------------------------------------------------------
  // Mapas de pixels em texto (pixel art "escrita")
  //   rows: array de strings do mesmo tamanho; cada caractere é um pixel.
  //   map:  { 'a': '#hex' ou nome da paleta, ... }  ('.' e ' ' = transparente)
  // ------------------------------------------------------------------
  function resolveColor(map, ch) {
    const v = map[ch];
    if (v == null) return null;
    return P2.pal[v] || v;
  }
  /** Desenha o mapa diretamente. x,y = canto superior esquerdo. flip espelha. */
  G.drawMap = function (ctx, rows, x, y, map, flip) {
    x = Math.round(x); y = Math.round(y);
    const w = rows[0] ? rows[0].length : 0;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      let runC = null, runStart = 0;
      for (let i = 0; i <= w; i++) {
        const ch = i < w ? row[i] : '.';
        const c = ch === '.' || ch === ' ' ? null : resolveColor(map, ch);
        if (c !== runC) {
          if (runC) {
            ctx.fillStyle = runC;
            const rx = flip ? x + (w - i) : x + runStart;
            ctx.fillRect(rx, y + j, i - runStart, 1);
          }
          runC = c;
          runStart = i;
        }
      }
    }
  };
  // Cache de sprites em canvas (muito mais rápido para desenhar a cada quadro).
  const spriteCache = new Map();
  /**
   * Converte um mapa de texto em um canvas (com cache).
   * key: string única para o cache (ex.: 'pai_corpo_idle_0_azul').
   */
  G.sprite = function (key, rows, map) {
    let c = spriteCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = rows[0] ? rows[0].length : 1;
    c.height = rows.length || 1;
    G.drawMap(c.getContext('2d'), rows, 0, 0, map, false);
    spriteCache.set(key, c);
    return c;
  };
  /** Desenha um canvas de sprite (de G.sprite) com espelhamento opcional. */
  G.blit = function (ctx, spr, x, y, flip) {
    x = Math.round(x); y = Math.round(y);
    if (!flip) { ctx.drawImage(spr, x, y); return; }
    ctx.save();
    ctx.translate(x + spr.width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(spr, 0, 0);
    ctx.restore();
  };

  // ------------------------------------------------------------------
  // Fonte bitmap 3x5 (maiúsculas, números e pontuação). Use só para
  // detalhes do cenário (relógio, placas, números). Texto importante
  // sempre vai no painel HTML, que é legível em qualquer tela.
  // ------------------------------------------------------------------
  const F = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111',
    4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001',
    8: '111101111101111', 9: '111101111001111',
    ' ': '000000000000000', '.': '000000000000010', ',': '000000000010100', ':': '000010000010000',
    '!': '010010010000010', '?': '110001010000010', '-': '000000111000000', '+': '000010111010000',
    '/': '001001010100100', '%': '101001010100101', '$': '011110010011110', '(': '010100100100010',
    ')': '010001001001010', "'": '010010000000000', '"': '101101000000000', '#': '101111101111101',
    '=': '000111000111000', '>': '100010001010100', '<': '001010100010001', '*': '000101010101000',
    '@': '010101111100011', '&': '010101010101011', '_': '000000000000111', '|': '010010010010010',
  };
  function normChar(ch) {
    const n = ch.normalize ? ch.normalize('NFD').replace(/[̀-ͯ]/g, '') : ch;
    return n.toUpperCase();
  }
  /** Largura em pixels de um texto na fonte 3x5. */
  G.textWidth = function (str, scale) {
    scale = scale || 1;
    return Math.max(0, String(str).length * 4 - 1) * scale;
  };
  /**
   * Escreve texto em pixel (3x5). opts: {align:'left'|'center'|'right', scale, shadow}
   */
  G.text = function (ctx, str, x, y, color, opts) {
    opts = opts || {};
    const s = opts.scale || 1;
    str = String(str);
    const w = G.textWidth(str, s);
    let ox = Math.round(x);
    if (opts.align === 'center') ox = Math.round(x - w / 2);
    else if (opts.align === 'right') ox = Math.round(x - w);
    const oy = Math.round(y);
    const draw = (dx, dy, col) => {
      ctx.fillStyle = col;
      for (let k = 0; k < str.length; k++) {
        const g = F[normChar(str[k])] || F['?'];
        for (let p = 0; p < 15; p++) {
          if (g[p] === '1') ctx.fillRect(ox + dx + (k * 4 + (p % 3)) * s, oy + dy + Math.floor(p / 3) * s, s, s);
        }
      }
    };
    if (opts.shadow) draw(s, s, opts.shadow);
    draw(0, 0, color);
    return w;
  };

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  /** Gerador pseudoaleatório determinístico (para decorar cenários sem "piscar"). */
  G.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  };
  /** Oscilação suave: retorna -1..1 */
  G.wave = function (t, speed, phase) {
    return Math.sin(t * (speed || 1) * Math.PI * 2 + (phase || 0));
  };
  /** Pisca: true/false alternando a cada `period` segundos. */
  G.blinkOn = function (t, period) {
    return Math.floor(t / (period || 0.5)) % 2 === 0;
  };
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    bounce: (t) => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
  };
})();

/* Mapa 3D, base: texturas geradas no próprio jogo (sem arquivos), materiais com aparência física (PBR), montador de
   peças que junta tudo por material (poucas chamadas de desenho) e o remendo de sombreamento que todo material do
   mundo recebe: a névoa de visão (o que o seu personagem não vê fica escuro e sem cor) e a sombra de contato no chão
   perto de paredes e móveis. */
(function () {
  'use strict';
  const AU = window.AU;
  const THREE = window.THREE;
  if (!THREE) return;
  const M = AU.Map;

  /* uniformes compartilhados por todos os materiais do mundo */
  const UNI = {
    uVisTex: { value: null },
    uVisOrigin: { value: new THREE.Vector2(0, 0) },
    uVisSize: { value: new THREE.Vector2(1, 1) },
    uVisOn: { value: 0 },
    uDark: { value: 0.085 },
    uAOTex: { value: null },
    uAOSize: { value: new THREE.Vector2(M.W, M.H) },
    uAOOn: { value: 1 },
    uMacro: { value: null },
    uCutPos: { value: new THREE.Vector2(-999, -999) },
    uCutOn: { value: 0 },
    uTime: { value: 0 },
  };

  const VERT_HEAD = 'varying vec3 vAUW;\n';
  const VERT_BODY = `#include <project_vertex>
    vec4 auP = vec4(transformed, 1.0);
    #ifdef USE_BATCHING
      auP = batchingMatrix * auP;
    #endif
    #ifdef USE_INSTANCING
      auP = instanceMatrix * auP;
    #endif
    vAUW = (modelMatrix * auP).xyz;`;
  const FRAG_HEAD = `varying vec3 vAUW;
uniform sampler2D uVisTex; uniform vec2 uVisOrigin; uniform vec2 uVisSize; uniform float uVisOn; uniform float uDark;
uniform sampler2D uAOTex; uniform vec2 uAOSize; uniform float uAOOn; uniform vec2 uCutPos; uniform float uCutOn; uniform sampler2D uMacro;
float auBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x) + int(q.y) * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}
`;

  /* o — ao: sombra de contato; vis: névoa de visão; cut: parede transparente na frente do jogador */
  function patch(mat, o) {
    o = o || {};
    const ao = o.ao !== false, vis = o.vis !== false, cut = !!o.cut;
    mat.onBeforeCompile = (sh) => {
      for (const k of Object.keys(UNI)) sh.uniforms[k] = UNI[k];
      sh.vertexShader = VERT_HEAD + sh.vertexShader.replace('#include <project_vertex>', VERT_BODY);
      let tail = '';
      if (cut) {
        /* parede entre a câmera e o jogador: some em pontilhado acima da altura do joelho */
        tail += `if (uCutOn > 0.5 && vAUW.y > 0.8) {
          vec2 dd = vAUW.xz - uCutPos;
          float k = (1.0 - smoothstep(1.6, 2.6, abs(dd.x))) * smoothstep(-0.3, 0.4, dd.y) * (1.0 - smoothstep(2.4, 3.4, dd.y));
          if (k * 0.82 > auBayer(gl_FragCoord.xy)) discard;
        }\n`;
      }
      sh.fragmentShader = FRAG_HEAD + sh.fragmentShader.replace('void main() {', 'void main() {\n' + tail);
      let post = '';
      if (ao) post += 'if (uAOOn > 0.5) { float ao = texture2D(uAOTex, vAUW.xz / uAOSize).r; gl_FragColor.rgb *= mix(ao, 1.0, smoothstep(0.02, 0.9, vAUW.y)); }\n';
      /* variação larga de sujeira e tom (quebra a repetição das texturas de piso e parede) */
      if (o.macro) post += 'gl_FragColor.rgb *= mix(0.8, 1.12, texture2D(uMacro, vAUW.xz / 23.0 + vAUW.y * 0.02).r);\n';
      if (vis) {
        post += `if (uVisOn > 0.5) {
          vec2 vu = (vAUW.xz - uVisOrigin) / uVisSize;
          float vv = (vu.x < 0.0 || vu.y < 0.0 || vu.x > 1.0 || vu.y > 1.0) ? 0.0 : texture2D(uVisTex, vu).r;
          vec3 cc = gl_FragColor.rgb;
          float lum = dot(cc, vec3(0.2126, 0.7152, 0.0722));
          gl_FragColor.rgb = mix(mix(vec3(lum), cc, 0.25) * uDark, cc, vv);
        }\n`;
      }
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n' + post);
    };
    mat.customProgramCacheKey = () => 'au' + (ao ? 1 : 0) + (vis ? 1 : 0) + (cut ? 1 : 0) + (o.macro ? 1 : 0);
    return mat;
  }

  /* ---------- texturas geradas ---------- */
  let QUAL = 512;
  let ANISO = 4;
  const rnd = (() => {
    let s = 1234567;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h || w;
    return c;
  }
  /* mapa de normais a partir de um mapa de altura (Sobel) */
  function normalFromHeight(hc, strength) {
    const w = hc.width, h = hc.height;
    const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
    const out = canvas(w, h);
    const oc = out.getContext('2d');
    const img = oc.createImageData(w, h);
    const d = img.data;
    const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
        const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
        let nx = -dx * strength, ny = dy * strength, nz = 1;
        const l = Math.hypot(nx, ny, nz);
        nx /= l;
        ny /= l;
        nz /= l;
        const i = (y * w + x) * 4;
        d[i] = (nx * 0.5 + 0.5) * 255;
        d[i + 1] = (ny * 0.5 + 0.5) * 255;
        d[i + 2] = (nz * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    oc.putImageData(img, 0, 0);
    return out;
  }
  function tex(c, srgb, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  }
  /* desenha albedo, altura e aspereza juntos; draw(a, hgt, r, S) recebe os três contextos e o tamanho */
  function surface(draw, o) {
    o = o || {};
    const S = o.size || QUAL;
    const a = canvas(S), hh = canvas(S), r = canvas(S);
    const ac = a.getContext('2d'), hc = hh.getContext('2d'), rc = r.getContext('2d');
    draw(ac, hc, rc, S);
    return { map: tex(a, true), normalMap: tex(normalFromHeight(hh, o.bump || 2.2), false), roughnessMap: tex(r, false) };
  }
  function grime(ctx, S, n, col, maxR) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * S, y = rnd() * S, rr = (0.2 + rnd()) * maxR;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      /* repete nas bordas para a textura emendar sem costura */
      for (const [ox, oy] of [[S, 0], [-S, 0], [0, S], [0, -S]]) {
        if (x + ox + rr < 0 || x + ox - rr > S || y + oy + rr < 0 || y + oy - rr > S) continue;
        const g2 = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rr);
        g2.addColorStop(0, col);
        g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(x + ox - rr, y + oy - rr, rr * 2, rr * 2);
      }
    }
  }
  function speckle(ctx, S, n, light, dark, size) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rnd() < 0.5 ? light : dark;
      const s = (0.5 + rnd()) * size;
      ctx.fillRect(rnd() * S, rnd() * S, s, s);
    }
  }
  function scratches(ctx, S, n, col, len) {
    ctx.strokeStyle = col;
    for (let i = 0; i < n; i++) {
      const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = (0.3 + rnd()) * len;
      ctx.lineWidth = 0.5 + rnd() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  const gray = (v) => `rgb(${v},${v},${v})`;

  const SURF = {};
  /* chapas de metal do piso: 2 x 2 chapas por textura (cada textura cobre 2 m), com rebites e desgaste */
  SURF.plates = () => surface((a, h, r, S) => {
    const P = S / 2;
    a.fillStyle = gray(150);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(150);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(120);
    r.fillRect(0, 0, S, S);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const v = 140 + Math.floor(rnd() * 26);
      a.fillStyle = gray(v);
      a.fillRect(i * P + 3, j * P + 3, P - 6, P - 6);
      /* placa interna levemente rebaixada */
      a.strokeStyle = 'rgba(0,0,0,0.18)';
      a.lineWidth = 2;
      a.strokeRect(i * P + P * 0.12, j * P + P * 0.12, P * 0.76, P * 0.76);
      h.fillStyle = gray(170);
      h.fillRect(i * P + 3, j * P + 3, P - 6, P - 6);
      h.fillStyle = gray(150);
      h.fillRect(i * P + P * 0.12, j * P + P * 0.12, P * 0.76, P * 0.76);
      for (const [cx, cy] of [[0.07, 0.07], [0.93, 0.07], [0.07, 0.93], [0.93, 0.93]]) {
        const x = i * P + cx * P, y = j * P + cy * P;
        a.fillStyle = gray(190);
        a.beginPath();
        a.arc(x, y, P * 0.022, 0, Math.PI * 2);
        a.fill();
        const g = h.createRadialGradient(x, y, 0, x, y, P * 0.03);
        g.addColorStop(0, gray(255));
        g.addColorStop(1, gray(170));
        h.fillStyle = g;
        h.beginPath();
        h.arc(x, y, P * 0.03, 0, Math.PI * 2);
        h.fill();
      }
    }
    /* frestas entre chapas */
    a.fillStyle = gray(60);
    h.fillStyle = gray(20);
    for (let k = 0; k <= 2; k++) {
      a.fillRect(k * P - 2, 0, 4, S);
      a.fillRect(0, k * P - 2, S, 4);
      h.fillRect(k * P - 2, 0, 4, S);
      h.fillRect(0, k * P - 2, S, 4);
    }
    grime(a, S, 26, 'rgba(40,36,30,0.18)', S * 0.18);
    scratches(a, S, 90, 'rgba(255,255,255,0.10)', S * 0.08);
    scratches(r, S, 90, gray(70), S * 0.08);
    grime(r, S, 20, 'rgba(255,255,255,0.18)', S * 0.2);
    speckle(a, S, 1400, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.07)', 2);
  }, { bump: 3 });

  /* chapa de piso antiderrapante (losangos), para motores e reator */
  SURF.tread = () => surface((a, h, r, S) => {
    a.fillStyle = gray(150);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(110);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(110);
    r.fillRect(0, 0, S, S);
    const n = 16, c = S / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * c + c / 2, y = j * c + c / 2, rot = (i + j) % 2 ? 0.6 : -0.6;
      for (const [ctx, col] of [[a, gray(178)], [h, gray(230)]]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 0, c * 0.36, c * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    a.fillStyle = gray(70);
    h.fillStyle = gray(10);
    a.fillRect(0, 0, S, 3);
    a.fillRect(0, 0, 3, S);
    h.fillRect(0, 0, S, 3);
    h.fillRect(0, 0, 3, S);
    grime(a, S, 30, 'rgba(30,26,20,0.22)', S * 0.2);
    scratches(r, S, 120, gray(60), S * 0.06);
  }, { bump: 2.5 });

  /* azulejos claros (MedBay, O2, Comunicações): 4 x 4 por textura, rejunte e brilho */
  SURF.tiles = () => surface((a, h, r, S) => {
    const n = 4, c = S / n;
    a.fillStyle = gray(90);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(40);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(200);
    r.fillRect(0, 0, S, S);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = 205 + Math.floor(rnd() * 18);
      a.fillStyle = gray(v);
      a.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
      h.fillStyle = gray(200);
      h.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
      r.fillStyle = gray(60 + Math.floor(rnd() * 25));
      r.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
    }
    grime(a, S, 16, 'rgba(60,60,50,0.12)', S * 0.15);
    speckle(a, S, 900, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.05)', 2);
  }, { bump: 1.6 });

  /* lajotas grandes em xadrez de dois tons (Cafeteria) */
  SURF.tiles2 = () => surface((a, h, r, S) => {
    const n = 2, c = S / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = (i + j) % 2 ? 196 : 172;
      a.fillStyle = gray(v + Math.floor(rnd() * 8));
      a.fillRect(i * c, j * c, c, c);
      h.fillStyle = gray(200);
      h.fillRect(i * c, j * c, c, c);
      r.fillStyle = gray(80 + Math.floor(rnd() * 20));
      r.fillRect(i * c, j * c, c, c);
    }
    a.fillStyle = gray(80);
    h.fillStyle = gray(60);
    for (let k = 0; k <= n; k++) {
      a.fillRect(k * c - 1.5, 0, 3, S);
      a.fillRect(0, k * c - 1.5, S, 3);
      h.fillRect(k * c - 1.5, 0, 3, S);
      h.fillRect(0, k * c - 1.5, S, 3);
    }
    grime(a, S, 14, 'rgba(50,45,40,0.12)', S * 0.2);
    scratches(r, S, 60, gray(140), S * 0.1);
  }, { bump: 1.2 });

  /* grade de metal (Elétrica): barras com o vão escuro por baixo */
  SURF.grate = () => surface((a, h, r, S) => {
    a.fillStyle = gray(22);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(0);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(150);
    r.fillRect(0, 0, S, S);
    const n = 20, c = S / n;
    for (let k = 0; k < n; k++) {
      a.fillStyle = gray(150);
      a.fillRect(k * c, 0, c * 0.28, S);
      h.fillStyle = gray(255);
      h.fillRect(k * c, 0, c * 0.28, S);
    }
    for (let k = 0; k < 4; k++) {
      a.fillStyle = gray(165);
      a.fillRect(0, k * (S / 4), S, c * 0.6);
      h.fillStyle = gray(255);
      h.fillRect(0, k * (S / 4), S, c * 0.6);
      r.fillStyle = gray(110);
      r.fillRect(0, k * (S / 4), S, c * 0.6);
    }
    grime(a, S, 20, 'rgba(60,50,20,0.2)', S * 0.2);
  }, { bump: 4 });

  /* carpete (Segurança e Admin): fibra com trama */
  SURF.carpet = () => surface((a, h, r, S) => {
    a.fillStyle = gray(150);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(128);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(245);
    r.fillRect(0, 0, S, S);
    speckle(a, S, S * S * 0.05, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.12)', 1.6);
    speckle(h, S, S * S * 0.05, 'rgba(255,255,255,0.3)', 'rgba(0,0,0,0.3)', 1.6);
    a.strokeStyle = 'rgba(0,0,0,0.10)';
    a.lineWidth = 3;
    for (let k = 0; k < 8; k++) {
      a.beginPath();
      a.moveTo(0, (k + 0.5) * S / 8);
      a.lineTo(S, (k + 0.5) * S / 8);
      a.stroke();
    }
    grime(a, S, 10, 'rgba(0,0,0,0.1)', S * 0.25);
  }, { bump: 1 });

  /* hexágonos (Escudos) */
  SURF.hexes = () => surface((a, h, r, S) => {
    a.fillStyle = gray(70);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(30);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(140);
    r.fillRect(0, 0, S, S);
    /* espaçamentos que fecham a textura sem emenda: 5 colunas e 3 pares de linhas por lado */
    const w = S / 5, R = S / 9;
    const hex = (ctx, x, y, rr) => {
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const t = (k / 6) * Math.PI * 2 + Math.PI / 6;
        if (k) ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
        else ctx.moveTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
      }
      ctx.closePath();
    };
    for (let j = -1; j <= 7; j++) for (let i = -1; i <= 5; i++) {
      const x = i * w + (((j % 2) + 2) % 2 ? w / 2 : 0), y = j * R * 1.5;
      const v = 168 + Math.floor(rnd() * 22);
      hex(a, x, y, R * 0.93);
      a.fillStyle = gray(v);
      a.fill();
      hex(h, x, y, R * 0.93);
      h.fillStyle = gray(200);
      h.fill();
      hex(r, x, y, R * 0.93);
      r.fillStyle = gray(90);
      r.fill();
    }
    grime(a, S, 12, 'rgba(0,0,0,0.12)', S * 0.2);
  }, { bump: 2 });

  /* painéis de parede: placas verticais, faixa e frestas */
  SURF.wall = () => surface((a, h, r, S) => {
    a.fillStyle = gray(178);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(160);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(110);
    r.fillRect(0, 0, S, S);
    const cols = 2, cw = S / cols;
    for (let i = 0; i < cols; i++) {
      for (const [y0, y1, v] of [[0.0, 0.42, 172], [0.42, 0.56, 120], [0.56, 1.0, 186]]) {
        a.fillStyle = gray(v + Math.floor(rnd() * 10));
        a.fillRect(i * cw + 3, y0 * S + 2, cw - 6, (y1 - y0) * S - 4);
        h.fillStyle = gray(y0 === 0.42 ? 130 : 190);
        h.fillRect(i * cw + 3, y0 * S + 2, cw - 6, (y1 - y0) * S - 4);
      }
      /* grelha de ventilação embaixo */
      for (let k = 0; k < 6; k++) {
        a.fillStyle = gray(70);
        a.fillRect(i * cw + cw * 0.3, S * 0.86 + k * 5, cw * 0.4, 2);
        h.fillStyle = gray(60);
        h.fillRect(i * cw + cw * 0.3, S * 0.86 + k * 5, cw * 0.4, 2);
      }
      for (const [x, y] of [[0.08, 0.04], [0.92, 0.04], [0.08, 0.96], [0.92, 0.96]]) {
        a.fillStyle = gray(210);
        a.fillRect(i * cw + x * cw - 2, y * S - 2, 4, 4);
      }
    }
    a.fillStyle = gray(55);
    h.fillStyle = gray(10);
    for (let i = 0; i <= cols; i++) {
      a.fillRect(i * cw - 2, 0, 4, S);
      h.fillRect(i * cw - 2, 0, 4, S);
    }
    grime(a, S, 14, 'rgba(30,30,30,0.14)', S * 0.2);
    scratches(r, S, 40, gray(70), S * 0.05);
  }, { bump: 2.4 });

  /* casco por fora das salas: chapas escuras e canos */
  SURF.hull = () => surface((a, h, r, S) => {
    a.fillStyle = gray(70);
    a.fillRect(0, 0, S, S);
    h.fillStyle = gray(120);
    h.fillRect(0, 0, S, S);
    r.fillStyle = gray(150);
    r.fillRect(0, 0, S, S);
    const n = 3, c = S / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      a.fillStyle = gray(60 + Math.floor(rnd() * 25));
      a.fillRect(i * c + 2, j * c + 2, c - 4, c - 4);
    }
    for (let k = 0; k < 3; k++) {
      const y = rnd() * S, th = 6 + rnd() * 10;
      const g = a.createLinearGradient(0, y - th, 0, y + th);
      g.addColorStop(0, gray(40));
      g.addColorStop(0.5, gray(120));
      g.addColorStop(1, gray(40));
      a.fillStyle = g;
      a.fillRect(0, y - th, S, th * 2);
      const gh = h.createLinearGradient(0, y - th, 0, y + th);
      gh.addColorStop(0, gray(120));
      gh.addColorStop(0.5, gray(255));
      gh.addColorStop(1, gray(120));
      h.fillStyle = gh;
      h.fillRect(0, y - th, S, th * 2);
    }
    grime(a, S, 20, 'rgba(0,0,0,0.25)', S * 0.2);
  }, { bump: 3 });

  /* ruído largo e suave (manchas de uso) para variar pisos e paredes em escala de metros */
  function macroTex() {
    const S = 256, c = canvas(S), x = c.getContext('2d');
    x.fillStyle = gray(150);
    x.fillRect(0, 0, S, S);
    for (const [n, r, a] of [[40, 50, 0.16], [120, 18, 0.12], [400, 6, 0.08]]) {
      for (let i = 0; i < n; i++) {
        const v = rnd() < 0.5 ? 255 : 0;
        grime(x, S, 1, `rgba(${v},${v},${v},${a})`, r);
      }
    }
    const t = tex(c, false);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  /* caixa de madeira: tábuas, moldura e um carimbo */
  function crateTex() {
    return surface((a, h, r, S) => {
      a.fillStyle = '#a37a45';
      a.fillRect(0, 0, S, S);
      h.fillStyle = gray(150);
      h.fillRect(0, 0, S, S);
      r.fillStyle = gray(210);
      r.fillRect(0, 0, S, S);
      const n = 6, p = S / n;
      for (let i = 0; i < n; i++) {
        a.fillStyle = `rgb(${150 + Math.floor(rnd() * 30)},${105 + Math.floor(rnd() * 25)},${58 + Math.floor(rnd() * 18)})`;
        a.fillRect(0, i * p + 2, S, p - 4);
        h.fillStyle = gray(170);
        h.fillRect(0, i * p + 2, S, p - 4);
        a.strokeStyle = 'rgba(70,40,15,0.25)';
        for (let k = 0; k < 6; k++) {
          a.beginPath();
          a.moveTo(0, i * p + 6 + rnd() * (p - 12));
          a.bezierCurveTo(S * 0.3, i * p + rnd() * p, S * 0.6, i * p + rnd() * p, S, i * p + 6 + rnd() * (p - 12));
          a.stroke();
        }
      }
      const b = S * 0.09;
      a.fillStyle = '#7a5530';
      a.fillRect(0, 0, S, b);
      a.fillRect(0, S - b, S, b);
      a.fillRect(0, 0, b, S);
      a.fillRect(S - b, 0, b, S);
      h.fillStyle = gray(230);
      h.fillRect(0, 0, S, b);
      h.fillRect(0, S - b, S, b);
      h.fillRect(0, 0, b, S);
      h.fillRect(S - b, 0, b, S);
      a.save();
      a.translate(S / 2, S / 2);
      a.rotate(-0.08);
      a.fillStyle = 'rgba(40,25,10,0.55)';
      a.font = `bold ${Math.round(S * 0.13)}px monospace`;
      a.textAlign = 'center';
      a.fillText('B-7  SKELD', 0, S * 0.04);
      a.restore();
      grime(a, S, 10, 'rgba(30,20,10,0.18)', S * 0.2);
    }, { bump: 2, size: Math.min(QUAL, 512) });
  }

  /* faixa de perigo amarela e preta */
  function hazardTex() {
    const S = 256, c = canvas(S, S / 4), x = c.getContext('2d');
    x.fillStyle = '#f2c230';
    x.fillRect(0, 0, S, S / 4);
    x.fillStyle = '#16171b';
    for (let k = -2; k < 10; k++) {
      x.beginPath();
      x.moveTo(k * 32, S / 4);
      x.lineTo(k * 32 + 16, S / 4);
      x.lineTo(k * 32 + 16 + S / 4, 0);
      x.lineTo(k * 32 + S / 4, 0);
      x.closePath();
      x.fill();
    }
    return tex(c, true);
  }

  /* céu: estrelas e nebulosa (sem névoa nem sombra) */
  function starsTex() {
    const W = 2048, H = 2048, c = canvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#010208';
    x.fillRect(0, 0, W, H);
    for (const [cx, cy, rr, col] of [[0.25, 0.3, 0.35, 'rgba(70,40,140,0.35)'], [0.7, 0.65, 0.4, 'rgba(30,80,150,0.3)'], [0.55, 0.2, 0.22, 'rgba(150,50,110,0.18)']]) {
      for (const [ox, oy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) {
        const g = x.createRadialGradient(cx * W + ox, cy * H + oy, 0, cx * W + ox, cy * H + oy, rr * W);
        g.addColorStop(0, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g;
        x.fillRect(0, 0, W, H);
      }
    }
    for (let i = 0; i < 5200; i++) {
      const z = rnd();
      const sz = z < 0.97 ? 0.6 + z * 1.2 : 1.8 + rnd() * 1.6;
      const tint = rnd();
      x.fillStyle = tint < 0.15 ? `rgba(255,210,180,${0.4 + z * 0.6})` : tint < 0.3 ? `rgba(180,200,255,${0.4 + z * 0.6})` : `rgba(255,255,255,${0.25 + z * 0.75})`;
      x.beginPath();
      x.arc(rnd() * W, rnd() * H, sz * 0.5, 0, Math.PI * 2);
      x.fill();
    }
    const t = tex(c, true);
    return t;
  }

  /* telas animadas dos consoles: algumas texturas compartilhadas, redesenhadas poucas vezes por segundo */
  const SCREENS = {};
  function screenTex(kind) {
    if (SCREENS[kind]) return SCREENS[kind].t;
    const c = canvas(256, 160);
    const t = tex(c, true);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    SCREENS[kind] = { c, t, k: kind, ph: rnd() * 10 };
    drawScreen(SCREENS[kind], 0);
    return t;
  }
  const SCREEN_COL = { term: '#5dff9a', graph: '#5fc8ff', alert: '#ff5a5a', map: '#3ae08a', warm: '#ffb347', purple: '#c08bff' };
  function drawScreen(s, time) {
    const x = s.c.getContext('2d'), W = s.c.width, H = s.c.height;
    const col = SCREEN_COL[s.k] || '#5fc8ff';
    x.fillStyle = '#04121a';
    x.fillRect(0, 0, W, H);
    x.strokeStyle = col;
    x.fillStyle = col;
    x.globalAlpha = 0.9;
    if (s.k === 'term' || s.k === 'warm' || s.k === 'purple') {
      x.font = '14px monospace';
      const off = Math.floor(time * 6 + s.ph * 10);
      for (let i = 0; i < 10; i++) {
        const n = (off + i) * 2654435761 % 1000;
        const len = 4 + (n % 18);
        x.globalAlpha = 0.45 + ((n >> 3) % 10) / 20;
        x.fillRect(10, 10 + i * 14, len * 8, 6);
      }
    } else if (s.k === 'graph') {
      x.lineWidth = 3;
      for (let l = 0; l < 2; l++) {
        x.globalAlpha = l ? 0.5 : 0.95;
        x.beginPath();
        for (let i = 0; i <= 64; i++) {
          const px = (i / 64) * W;
          const py = H * 0.5 + Math.sin(i * 0.35 + time * (2 + l) + s.ph) * H * (0.22 - l * 0.08) + Math.sin(i * 1.3 + time * 5) * 6;
          if (i) x.lineTo(px, py);
          else x.moveTo(px, py);
        }
        x.stroke();
      }
    } else if (s.k === 'map') {
      x.lineWidth = 2;
      x.globalAlpha = 0.8;
      x.strokeRect(20, 20, W - 40, H - 40);
      for (let i = 0; i < 7; i++) {
        x.globalAlpha = 0.4 + 0.4 * Math.abs(Math.sin(time * 2 + i));
        x.fillRect(30 + ((i * 53) % (W - 70)), 30 + ((i * 37) % (H - 70)), 22, 16);
      }
    } else if (s.k === 'alert') {
      x.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(time * 4));
      x.font = 'bold 44px sans-serif';
      x.textAlign = 'center';
      x.fillText('!', W / 2, H / 2 + 16);
    }
    /* linhas de varredura */
    x.globalAlpha = 0.18;
    x.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
    x.globalAlpha = 1;
    s.t.needsUpdate = true;
  }
  let lastScreen = 0;
  function tickScreens(time) {
    if (time - lastScreen < 0.22) return;
    lastScreen = time;
    for (const s of Object.values(SCREENS)) drawScreen(s, time);
  }

  /* ---------- materiais ---------- */
  const MAT = {};
  function std(o, p) {
    const m = new THREE.MeshStandardMaterial(o);
    return patch(m, p);
  }
  function phys(o, p) {
    const m = new THREE.MeshPhysicalMaterial(o);
    return patch(m, p);
  }
  /* em etapas (yield entre uma textura e outra): dá para montar aos poucos, sem travar a tela */
  function* materialsGen() {
    const T = {};
    for (const k of Object.keys(SURF)) {
      T[k] = SURF[k]();
      yield;
    }
    UNI.uMacro.value = macroTex();
    yield;
    const floor = (style, color, metal, rough) => std(Object.assign({ color, metalness: metal == null ? 0.55 : metal, roughness: rough == null ? 1 : rough }, T[style]), { macro: true });
    MAT.floor = {
      plates: (c) => floor('plates', c, 0.6, 0.95),
      plates2: (c) => floor('plates', c, 0.45, 1),
      tread: (c) => floor('tread', c, 0.7, 0.9),
      tiles: (c) => floor('tiles', c, 0.05, 1),
      tiles2: (c) => floor('tiles2', c, 0.05, 1),
      grate: (c) => floor('grate', c, 0.75, 0.85),
      carpet: (c) => floor('carpet', c, 0, 1),
      hexes: (c) => floor('hexes', c, 0.5, 0.9),
    };
    MAT.wall = std(Object.assign({ color: '#8f9bb5', metalness: 0.35, roughness: 1 }, T.wall), { cut: true, macro: true });
    MAT.crate = std(Object.assign({ color: '#ffffff', metalness: 0.05, roughness: 1 }, crateTex()));
    MAT.wallTop = std({ color: '#465066', metalness: 0.55, roughness: 0.5 }, { cut: true });
    MAT.trim = std({ color: '#c7d0de', metalness: 0.7, roughness: 0.3 }, { cut: true });
    MAT.base = std({ color: '#1d2129', metalness: 0.2, roughness: 0.8 });
    MAT.hull = std(Object.assign({ color: '#59627a', metalness: 0.6, roughness: 1 }, T.hull));
    MAT.hullSide = std({ color: '#2a3040', metalness: 0.65, roughness: 0.5 });
    MAT.hazard = std({ map: hazardTex(), metalness: 0.3, roughness: 0.5 });
    MAT.metalDark = std({ color: '#3a4252', metalness: 0.8, roughness: 0.42 });
    MAT.metalMid = std({ color: '#707b90', metalness: 0.8, roughness: 0.38 });
    MAT.metalLight = std({ color: '#b6bfcd', metalness: 0.75, roughness: 0.32 });
    MAT.chrome = std({ color: '#e4e9f0', metalness: 1, roughness: 0.14 });
    MAT.brass = std({ color: '#c79a4b', metalness: 1, roughness: 0.3 });
    MAT.copper = std({ color: '#c8754a', metalness: 1, roughness: 0.35 });
    MAT.rubber = std({ color: '#17191e', metalness: 0, roughness: 0.92 });
    MAT.white = std({ color: '#cfd5de', metalness: 0.05, roughness: 0.5 });
    MAT.glass = std({ color: '#9fd4ff', metalness: 0.2, roughness: 0.06, transparent: true, opacity: 0.32, depthWrite: false }, { ao: false });
    MAT.wood = std({ color: '#8a6440', metalness: 0, roughness: 0.75 });
    MAT.leaf = std({ color: '#3f9b4a', metalness: 0, roughness: 0.7 });
    MAT.soil = std({ color: '#3b2b1e', metalness: 0, roughness: 1 });
    /* materiais iguais são o mesmo objeto: o montador junta tudo que usa o mesmo material numa malha só */
    const memo = new Map();
    const once = (key, make) => {
      if (!memo.has(key)) memo.set(key, make());
      return memo.get(key);
    };
    MAT.fabric = (c) => once('f' + c, () => std({ color: c, metalness: 0, roughness: 0.9 }));
    MAT.paint = (c, rough) => once('p' + c + rough, () => std({ color: c, metalness: 0.15, roughness: rough == null ? 0.5 : rough }));
    MAT.plastic = (c) => once('l' + c, () => phys({ color: c, metalness: 0, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }));
    MAT.metal = (c, rough) => once('m' + c + rough, () => std({ color: c, metalness: 0.85, roughness: rough == null ? 0.35 : rough }));
    MAT.glow = (c, k) => once('g' + c + k, () => std({ color: '#111', emissive: c, emissiveIntensity: k == null ? 2.2 : k, metalness: 0, roughness: 0.6 }));
    /* material aceso exclusivo (quando o brilho muda sozinho, como a luz da porta) */
    MAT.glowOwn = (c, k) => std({ color: '#111', emissive: c, emissiveIntensity: k == null ? 2.2 : k, metalness: 0, roughness: 0.6 });
    MAT.screen = (kind, k) => once('s' + kind + k, () => std({ color: '#000', emissive: '#ffffff', emissiveMap: screenTex(kind), emissiveIntensity: k == null ? 1.6 : k, metalness: 0.1, roughness: 0.15 }));
    MAT.lamp = std({ color: '#fff', emissive: '#fff3dc', emissiveIntensity: 3.2, roughness: 0.4 });
    MAT.textures = T;
  }
  function makeMaterials() {
    for (const _ of materialsGen()) void _;
  }

  /* ---------- montador: junta as peças por material ---------- */
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  class Kit {
    constructor() {
      this.parts = new Map();
      this.dyn = [];
    }
    add(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz) {
      /* gira primeiro em x e z (inclinação) e depois em y (direção), como se espera de um objeto no chão */
      _e.set(rx || 0, ry || 0, rz || 0, 'YXZ');
      _q.setFromEuler(_e);
      _s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz);
      _p.set(x || 0, y || 0, z || 0);
      _m.compose(_p, _q, _s);
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      g.applyMatrix4(_m);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!this.parts.has(mat)) this.parts.set(mat, []);
      this.parts.get(mat).push(g);
      return g;
    }
    box(w, h, d, mat, x, y, z, ry) {
      return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry || 0, 0);
    }
    /* caixa com cantos arredondados (mais realista que a caixa reta) */
    rbox(w, h, d, r, mat, x, y, z, ry) {
      const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
      return this.add(new THREE.RoundedBoxGeometry(w, h, d, 2, Math.max(0.002, rr)), mat, x, y, z, 0, ry || 0, 0);
    }
    cyl(rt, rb, h, mat, x, y, z, seg, rx, ry, rz) {
      return this.add(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat, x, y, z, rx, ry, rz);
    }
    sphere(r, mat, x, y, z, sx, sy, sz, seg) {
      return this.add(new THREE.SphereGeometry(r, seg || 18, Math.max(8, Math.round((seg || 18) * 0.66))), mat, x, y, z, 0, 0, 0, sx, sy, sz);
    }
    torus(r, t, mat, x, y, z, rx, ry, rz, arc) {
      return this.add(new THREE.TorusGeometry(r, t, 10, 32, arc || Math.PI * 2), mat, x, y, z, rx, ry, rz);
    }
    lathe(pts, mat, x, y, z, seg) {
      return this.add(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg || 28), mat, x, y, z);
    }
    plane(w, h, mat, x, y, z, rx, ry, rz) {
      return this.add(new THREE.PlaneGeometry(w, h), mat, x, y, z, rx, ry, rz);
    }
    /* cano por uma lista de pontos [x, y, z] */
    pipe(pts, r, mat) {
      const v = pts.map((q) => new THREE.Vector3(q[0], q[1], q[2]));
      const path = new THREE.CatmullRomCurve3(v, false, 'catmullrom', 0.05);
      return this.add(new THREE.TubeGeometry(path, Math.max(8, pts.length * 8), r, 10, false), mat, 0, 0, 0);
    }
    /* devolve um grupo com uma malha por material */
    build(o) {
      o = o || {};
      const grp = new THREE.Group();
      for (const [mat, list] of this.parts) {
        const geo = THREE.mergeGeometries(list, false);
        for (const g of list) g.dispose();
        if (!geo) continue;
        geo.computeBoundingSphere();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = o.cast !== false && !mat.transparent;
        mesh.receiveShadow = o.receive !== false;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        grp.add(mesh);
      }
      this.parts.clear();
      return grp;
    }
  }

  AU.R3DKit = {
    UNI, patch, MAT, SURF, Kit, makeMaterials, materialsGen, tickScreens, starsTex, hazardTex, canvas, tex, rnd,
    setQuality(size, aniso) {
      QUAL = size;
      ANISO = aniso;
    },
  };
})();

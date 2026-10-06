/* PAI 2.0 — env-especial.js
 * Ambientes especiais em 3D: arena (sonho / chefão), aula (sala de aula imaginada),
 * titulo (diorama da tela de título) e void (espaço abstrato para cartões).
 *
 * Convenções: metros, Y para cima, chão em y = 0, rot 0 = olhando para +Z.
 *
 * ── arena ──────────────────────────────────────────────────────────
 *  Ilha flutuante com grama e cristais à esquerda (heróis), espaço do chefão à direita
 *  (sobre um vórtice roxo), céu cósmico com estrelas, aurora e espiral de tempestade.
 *  params: calm (0..1 → amanhecer lilás/pêssego depois da vitória: flores brotam, sol nasce
 *          onde estava a espiral; a transição é suave mesmo se o valor pular),
 *          intensity (0..1 → tempestade: relâmpagos com clarão, vórtice mais rápido).
 *  spots:  pai    {x:-2.5,  z:0.35, rot:1.15}   em pé no círculo de runas, virado para o chefão
 *          faisca {x:-1.75, z:0.95, rot:1.0, y:1.25}  flutuando à direita/à frente do pai
 *          boss   {x:2.6,   z:-1.0, rot:-0.55}  a Dúvida (nuvem ~3 m) sobre o vórtice
 *          centro {x:-1.0,  z:0.55, rot:0.6} · heroi2 {x:-3.2, z:-0.35, rot:1.0} (alguém atrás do pai)
 *  shots:  geral, herois, boss, baixo (contra-plongée por trás dos heróis), confronto,
 *          amanhecer (plano aberto do céu), ilha (a ilha vista de baixo)
 *
 * ── aula ───────────────────────────────────────────────────────────
 *  Sala de aula aconchegante "imaginada", à noite, sem teto (céu estrelado acima),
 *  lanternas de papel flutuando. Paredes somem para a câmera girar 360°.
 *  params: lines (array de até 4 frases curtas, escritas a giz no quadro),
 *          tema ('violao' violão no suporte | 'ingles' mapa-múndi + pôster ABC |
 *                'negocios' flip chart com gráfico) — padrão 'violao'.
 *  spots:  quadro {x:1.75,  z:-1.75, rot:-0.45} em pé ao lado do quadro (quem ensina)
 *          faisca {x:1.45,  z:-1.55, rot:-0.5, y:1.55} (flutuando junto ao quadro)
 *          mesa   {x:-1.75, z:-1.7,  rot:0.25}  em pé atrás da mesa do professor
 *          aluno  {x:0.75,  z:1.25,  rot:-2.894} SENTADO na carteira, olhando o quadro
 *                                               (a mesa fica 0,5 m à frente)
 *          aluno2 {x:-1.05, z:1.35,  rot:-2.75}  2ª carteira (sentado)
 *          centro {x:0.1,   z:0.2,   rot:0} · porta {x:-2.1, z:1.85, rot:π}
 *  shots:  geral, quadro (lousa legível), aluno (por cima do ombro), mesa, janela
 *
 * ── titulo ─────────────────────────────────────────────────────────
 *  Diorama em miniatura de uma quadra de São Paulo ao entardecer, flutuando no céu:
 *  a torre do CEO (heliponto, andar dele aceso), a casa da família com piscina, praça
 *  com ipês, lojinhas, carros andando, postes acendendo, janelas acendendo aos poucos,
 *  avião lento, nuvens. O motor gira a câmera em volta de shots.geral.target.
 *  A parte de cima-centro do quadro fica calma (céu) para o logo.
 *  spots:  faisca {x:0.25, z:2.9, rot:0, y:1.75} (flutuando na frente da cidade)
 *          centro {x:0, z:1.4, rot:0} (no meio da avenida — escala de maquete!)
 *  shots:  geral, torre, casa, praca, ceu
 *
 * ── void ───────────────────────────────────────────────────────────
 *  Espaço abstrato elegante (fatos, transições): degradê, piso de luz com anéis,
 *  formas flutuando, partículas. params: color (tinta, padrão '#7c6cff').
 *  spots:  centro {x:0,z:0} · esquerda {x:-1.3, z:0.3, rot:0.35} · direita {x:1.3, z:0.3, rot:-0.35}
 *          faisca {x:0.8, z:0.5, y:1.3}
 *  shots:  geral, close, alto, lado
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  P2.envs = P2.envs || {};

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const col = (c) => new T.Color(c);
  const getCam = () => (P2.core && P2.core.camera) || null;

  // ==================================================================
  // Kit: recursos por ambiente (para liberar no dispose)
  // ==================================================================
  function makeKit() {
    const K = { textures: [], geos: [], mats: [] };
    K.tex = (w, h, draw, opts) => { const t = M.canvasTex(w, h, draw, opts); K.textures.push(t); return t; };
    K.geo = (g) => { K.geos.push(g); return g; };
    K.mat = (m) => { K.mats.push(m); return m; };
    /** Material com cor por vértice (para malhas mescladas). */
    K.vc = (o) => {
      o = o || {};
      const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: o.rough == null ? 0.85 : o.rough, metalness: o.metal || 0, flatShading: !!o.flat });
      if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
      if (o.side === 'double') m.side = T.DoubleSide;
      return K.mat(m);
    };
    K.dispose = (root) => {
      M.dispose(root);
      K.textures.forEach((t) => t.dispose());
      K.geos.forEach((g) => g.dispose());
      K.mats.forEach((m) => m.dispose());
    };
    return K;
  }

  const _q = new T.Quaternion(), _e = new T.Euler(), _up = new T.Vector3(0, 1, 0);
  /** Matriz a partir de posição, rotação (euler ou {dir}) e escala. */
  function mat4(pos, rot, scale) {
    if (rot && rot.dir) _q.setFromUnitVectors(_up, new T.Vector3(rot.dir[0], rot.dir[1], rot.dir[2]).normalize());
    else { _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0); _q.setFromEuler(_e); }
    if (rot && rot.spin) _q.multiply(new T.Quaternion().setFromAxisAngle(_up, rot.spin));
    const s = scale == null ? [1, 1, 1] : Array.isArray(scale) ? scale : [scale, scale, scale];
    return new T.Matrix4().compose(new T.Vector3(pos[0], pos[1], pos[2]), _q.clone(), new T.Vector3(s[0], s[1], s[2]));
  }

  /**
   * Junta várias geometrias numa só (1 draw call) com cor por vértice.
   * parts: [{g, m (Matrix4), c (cor | fn(xLocal,yLocal,zLocal)→Color), flat}]
   */
  function mergeParts(parts) {
    let total = 0;
    const prep = parts.map((p) => {
      const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
      const n = g.attributes.position.count;
      const cs = new Float32Array(n * 3);
      const pa = g.attributes.position;
      if (typeof p.c === 'function') {
        for (let i = 0; i < n; i++) { const c = p.c(pa.getX(i), pa.getY(i), pa.getZ(i)); cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b; }
      } else {
        const c = M.color(p.c || '#ffffff');
        for (let i = 0; i < n; i++) { cs[i * 3] = c.r; cs[i * 3 + 1] = c.g; cs[i * 3 + 2] = c.b; }
      }
      if (p.m) g.applyMatrix4(p.m);
      if (p.flat) g.computeVertexNormals();
      total += n;
      return { g, cs, n };
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), cc = new Float32Array(total * 3);
    let o = 0;
    prep.forEach((q) => {
      pos.set(q.g.attributes.position.array, o * 3);
      nor.set(q.g.attributes.normal.array, o * 3);
      cc.set(q.cs, o * 3);
      o += q.n;
      q.g.dispose();
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('color', new T.BufferAttribute(cc, 3));
    out.computeBoundingSphere();
    return out;
  }

  /**
   * "Assa" um grupo estático: junta as malhas simples (MeshStandard sem textura, opacas, face única)
   * numa malha por tipo de material (cor por vértice) → bem menos draw calls. Animados: não usar.
   */
  function bake(K, group, skip) {
    group.updateMatrixWorld(true);
    const skipped = (o) => { for (let q = o.parent; q && q !== group; q = q.parent) if (skip && skip.indexOf(q) >= 0) return true; return false; };
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map(), kill = [];
    group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.userData.noBake || skipped(o)) return;
      const m = o.material;
      if (!m || Array.isArray(m) || !m.isMeshStandardMaterial || m.map || m.transparent || m.vertexColors || m.side !== T.FrontSide) return;
      const em = m.emissive && m.emissiveIntensity > 0 && m.emissive.r + m.emissive.g + m.emissive.b > 0;
      const key = (em ? M.hex(m.emissive) + m.emissiveIntensity : '') + (m.metalness > 0.3 ? 'm' : '') + (m.flatShading ? 'f' : '');
      if (!buckets.has(key)) buckets.set(key, { parts: [], cast: false, rough: 0, n: 0, m, em });
      const b = buckets.get(key);
      b.parts.push({ g: o.geometry, m: new T.Matrix4().multiplyMatrices(inv, o.matrixWorld), c: m.color });
      b.cast = b.cast || o.castShadow; b.rough += m.roughness; b.n++;
      kill.push(o);
    });
    kill.forEach((o) => o.parent.remove(o));
    buckets.forEach((b) => {
      const mat = K.vc({ rough: b.rough / b.n, metal: b.m.metalness > 0.3 ? b.m.metalness : 0, flat: b.m.flatShading, emissive: b.em ? b.m.emissive : null, ei: b.m.emissiveIntensity });
      const mesh = new T.Mesh(K.geo(mergeParts(b.parts)), mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = true;
      group.add(mesh);
    });
    return group;
  }

  /** Pinta de "musgo" as faces viradas para cima (geometria não indexada, normais planas). */
  function mossify(geo, moss, thresh, amount) {
    const n = geo.attributes.normal, c = geo.attributes.color;
    const m = M.color(moss), tc = new T.Color();
    for (let i = 0; i < n.count; i += 3) {
      const ny = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3;
      const k = sstep(thresh, thresh + 0.25, ny) * (amount == null ? 1 : amount);
      if (k <= 0) continue;
      for (let v = 0; v < 3; v++) { tc.setRGB(c.getX(i + v), c.getY(i + v), c.getZ(i + v)).lerp(m, k); c.setXYZ(i + v, tc.r, tc.g, tc.b); }
    }
    c.needsUpdate = true;
    return geo;
  }

  /**
   * "Cerca" invisível de colisão ao longo de um contorno fechado (lista de [x,z]):
   * retângulos girados por fora de cada segmento. Devolve {colliders, bounds}.
   */
  function fenceColliders(pts, cx, cz, thick) {
    const out = [], b = { minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9 };
    const th = thick || 0.6, n = pts.length;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % n];
      const dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz);
      let ox = dz / len, oz = -dx / len;
      if (((p[0] + q[0]) / 2 - cx) * ox + ((p[1] + q[1]) / 2 - cz) * oz < 0) { ox = -ox; oz = -oz; }
      out.push({ x: (p[0] + q[0]) / 2 + ox * th / 2, z: (p[1] + q[1]) / 2 + oz * th / 2, w: len + th / 2, d: th, rot: Math.atan2(-dz, dx) });
      b.minX = Math.min(b.minX, p[0]); b.maxX = Math.max(b.maxX, p[0]); b.minZ = Math.min(b.minZ, p[1]); b.maxZ = Math.max(b.maxZ, p[1]);
    });
    return { colliders: out, bounds: b };
  }

  /** Pedra low-poly deformada (deslocamento por posição → facetas sem rachaduras). */
  function rockGeo(K, seed, detail, amt, squash) {
    const g = K.geo(new T.IcosahedronGeometry(1, detail == null ? 1 : detail));
    const p = g.attributes.position;
    const r = M.rng(seed * 7 + 3);
    const a = [r() * 6, r() * 6, r() * 6, 1.3 + r() * 1.2, 1.7 + r() * 1.2, 2.1 + r() * 1.2];
    const sq = squash == null ? 0.85 : squash;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * a[3] + a[0]) * Math.sin(y * a[4] + a[1]) * Math.sin(z * a[5] + a[2]) + 0.45 * Math.sin((x + y) * 3.1 + a[0]) * Math.sin((z - y) * 2.7 + a[1]);
      const k = 1 + amt * n;
      p.setXYZ(i, x * k, y * k * sq, z * k);
    }
    g.computeVertexNormals();
    return g;
  }

  /** Cristal hexagonal com ponta (altura 1, raio 0.2). */
  function crystalGeo(K) {
    const pts = [new T.Vector2(0, -0.08), new T.Vector2(0.16, -0.02), new T.Vector2(0.2, 0.1), new T.Vector2(0.2, 0.74), new T.Vector2(0.0, 1.0)];
    return K.geo(new T.LatheGeometry(pts, 6));
  }
  /** Adiciona um aglomerado de cristais à lista de partes. */
  function crystalCluster(parts, cg, o) {
    const r = M.rng(o.seed || 5);
    const n = o.n || 5;
    const base = M.color(o.color), tip = M.color(o.tip || '#ffffff');
    const tmp = new T.Color();
    const cf = (x, y) => tmp.copy(base).lerp(tip, clamp(y, 0, 1) * 0.55);
    const out = o.out || [0, 1, 0];
    for (let i = 0; i < n; i++) {
      const big = i === 0;
      const h = o.size * (big ? 1 : 0.35 + r() * 0.55);
      const w = (big ? 1.25 : 0.7 + r() * 0.6) * (o.width || 1);
      const ang = r() * TAU;
      const rad = big ? 0 : o.size * (0.12 + r() * 0.22);
      const tilt = big ? 0.12 : 0.25 + r() * 0.45;
      const dir = [out[0] + Math.cos(ang) * tilt, out[1], out[2] + Math.sin(ang) * tilt];
      parts.push({ g: cg, m: mat4([o.x + Math.cos(ang) * rad, o.y - 0.05, o.z + Math.sin(ang) * rad], { dir, spin: r() * TAU }, [w * h * 0.55, h, w * h * 0.55]), c: cf, flat: true });
    }
  }

  // ==================================================================
  // Céu em shader (degradê de 3 paradas, sol, lua, estrelas, aurora,
  // nebulosa, espiral de tempestade e clarão de relâmpago)
  // ==================================================================
  const SKY_VS = 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const SKY_FS = [
    'uniform vec3 cTop; uniform vec3 cBand; uniform vec3 cMid; uniform vec3 cHor2; uniform vec3 cBot;',
    'uniform vec3 cSun; uniform vec3 cAur1; uniform vec3 cAur2; uniform vec3 cSwirl; uniform vec3 cNeb;',
    'uniform vec3 sunDir; uniform vec3 swirlDir; uniform vec3 flashDir; uniform vec3 moonDir;',
    'uniform float bandH; uniform float horizonMix; uniform float sunGlow; uniform float sunDisc; uniform float stars;',
    'uniform float aurora; uniform float swirl; uniform float nebula; uniform float flash; uniform float time; uniform float swirlT; uniform float moon;',
    'varying vec3 vDir;',
    'float h31(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }',
    'float vn(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);',
    '  float a = h31(i), b = h31(i + vec3(1.0,0.0,0.0)), c = h31(i + vec3(0.0,1.0,0.0)), d = h31(i + vec3(1.0,1.0,0.0));',
    '  float e = h31(i + vec3(0.0,0.0,1.0)), g = h31(i + vec3(1.0,0.0,1.0)), k = h31(i + vec3(0.0,1.0,1.0)), l = h31(i + vec3(1.0,1.0,1.0));',
    '  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(k, l, f.x), f.y), f.z); }',
    'float fbm(vec3 p){ return vn(p) * 0.55 + vn(p * 2.03 + 5.3) * 0.3 + vn(p * 4.07 + 9.1) * 0.15; }',
    'void main(){',
    '  vec3 d = normalize(vDir);',
    '  float h = d.y;',
    '  vec2 sxz = normalize(sunDir.xz + vec2(0.0001));',
    '  vec2 dxz = normalize(d.xz + vec2(0.0001));',
    '  float side = dot(dxz, sxz) * 0.5 + 0.5;',
    '  vec3 mid = mix(cMid, cHor2, horizonMix * (1.0 - side * side));',
    '  vec3 c;',
    '  if (h > 0.0) {',
    '    float hb = max(bandH, 0.001);',
    '    c = h < hb ? mix(mid, cBand, pow(h / hb, 0.8)) : mix(cBand, cTop, pow(clamp((h - hb) / (1.0 - hb), 0.0, 1.0), 0.65));',
    '  } else { c = mix(mid, cBot, pow(clamp(-h * 1.7, 0.0, 1.0), 0.5)); }',
    '  if (nebula > 0.0) {',
    '    float n = fbm(d * 2.6 + vec3(time * 0.004, 0.0, time * 0.006));',
    '    float n2 = fbm(d * 5.0 - vec3(0.0, time * 0.005, 0.0));',
    '    c += cNeb * nebula * smoothstep(0.42, 0.8, n) * (0.6 + 0.6 * n2) * smoothstep(-0.25, 0.25, h);',
    '  }',
    '  if (swirl > 0.0) {',
    '    vec3 s = normalize(swirlDir);',
    '    vec3 t1 = normalize(cross(s, vec3(0.0, 1.0, 0.0))); vec3 t2 = cross(t1, s);',
    '    vec2 q = vec2(dot(d, t1), dot(d, t2));',
    '    float r = length(q); float a = atan(q.y, q.x);',
    '    float front = smoothstep(0.0, 0.3, dot(d, s));',
    '    float arm = sin(a * 3.0 + log(r + 0.015) * 6.0 + swirlT) * 0.5 + 0.5;',
    '    float n = fbm(vec3(q * 5.0, swirlT * 0.05));',
    '    float k = smoothstep(0.85, 0.05, r) * front;',
    '    c = mix(c, cSwirl * (0.55 + 0.9 * arm * n), k * swirl * (0.35 + 0.65 * arm));',
    '    c += cSwirl * swirl * front * smoothstep(0.2, 0.0, r) * 0.8;',
    '  }',
    '  float sd = max(dot(d, normalize(sunDir)), 0.0);',
    '  c += cSun * (pow(sd, 4.0) * 0.45 + pow(sd, 24.0) * 0.55 + pow(sd, 300.0) * 0.8) * sunGlow;',
    '  c = mix(c, vec3(1.0, 0.96, 0.86), smoothstep(0.9988, 0.9993, sd) * sunDisc);',
    '  if (moon > 0.0) {',
    '    vec3 md = normalize(moonDir);',
    '    float m1 = smoothstep(0.99955, 0.9997, dot(d, md));',
    '    float m2 = smoothstep(0.99955, 0.9997, dot(d, normalize(md + vec3(0.012, 0.009, 0.0))));',
    '    float mg = pow(max(dot(d, md), 0.0), 600.0);',
    '    c += vec3(1.0, 0.95, 0.85) * (max(m1 - m2, 0.0) * 1.1 + mg * 0.12) * moon;',
    '  }',
    '  if (aurora > 0.0) {',
    '    float az = atan(d.z, d.x);',
    '    float band = 0.17 + 0.05 * sin(az * 2.0 + time * 0.05) + 0.03 * sin(az * 5.0 - time * 0.09);',
    '    float e = h - band;',
    '    float lower = smoothstep(-0.03, 0.012, e) * exp(-max(e, 0.0) * 7.0);',
    '    float rays = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(az * 34.0 + sin(az * 6.0 + time * 0.25) * 2.6), 2.0);',
    '    float fade = 0.35 + 0.65 * (0.5 + 0.5 * sin(az * 1.5 + 3.9 + time * 0.03));',
    '    vec3 ac = mix(cAur1, cAur2, clamp(e * 5.5, 0.0, 1.0));',
    '    c += ac * lower * rays * fade * aurora;',
    '  }',
    '  if (stars > 0.0) {',
    '    vec3 p = d * 240.0; vec3 ci = floor(p); vec3 f = fract(p) - 0.5;',
    '    float r = h31(ci);',
    '    float s1 = step(0.972, r) * smoothstep(0.3, 0.0, length(f));',
    '    float tw = 0.6 + 0.4 * sin(time * (1.0 + r * 4.0) + r * 70.0);',
    '    vec3 p2 = d * 80.0; vec3 c2 = floor(p2); vec3 f2 = fract(p2) - 0.5; float r2 = h31(c2 + 17.0);',
    '    float s2 = step(0.986, r2) * (smoothstep(0.2, 0.0, length(f2)) + 0.18 * smoothstep(0.5, 0.0, length(f2)));',
    '    float vis = smoothstep(-0.03, 0.3, h);',
    '    c += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.92, 0.8), r2) * (s1 * tw * 0.85 + s2 * 1.3) * stars * vis;',
    '  }',
    '  c += vec3(0.85, 0.8, 1.0) * flash * (0.18 + 0.82 * pow(max(dot(d, normalize(flashDir)), 0.0), 3.0));',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <encodings_fragment>',
    '  gl_FragColor.rgb += (h31(vec3(gl_FragCoord.xy, 3.0)) - 0.5) / 255.0;',
    '}',
  ].join('\n');

  function makeSky(o) {
    const U = {};
    const cols = { cTop: '#000000', cBand: null, cMid: '#333333', cHor2: null, cBot: null, cSun: '#ffd9a0', cAur1: '#40ffc8', cAur2: '#b05cff', cSwirl: '#7a2fd0', cNeb: '#3a2a9a' };
    Object.keys(cols).forEach((k) => { U[k] = { value: col(o[k] || cols[k] || o.cMid || '#333333') }; });
    if (!o.cBand) U.cBand.value.copy(U.cMid.value).lerp(U.cTop.value, 0.5);
    if (!o.cHor2) U.cHor2.value.copy(U.cMid.value);
    if (!o.cBot) U.cBot.value.copy(U.cMid.value).multiplyScalar(0.5);
    const v3 = (a, def) => { const v = a || def; return new T.Vector3(v[0], v[1], v[2]).normalize(); };
    U.sunDir = { value: v3(o.sunDir, [0.3, 0.1, -1]) };
    U.swirlDir = { value: v3(o.swirlDir, [0.45, 0.32, -0.83]) };
    U.flashDir = { value: new T.Vector3(0, 1, 0) };
    U.moonDir = { value: v3(o.moonDir, [0.5, 0.5, 0.7]) };
    ['bandH', 'horizonMix', 'sunGlow', 'sunDisc', 'stars', 'aurora', 'swirl', 'nebula', 'flash', 'time', 'swirlT', 'moon'].forEach((k) => { U[k] = { value: o[k] || 0 }; });
    if (o.bandH == null) U.bandH.value = 0.28;
    const mat = new T.ShaderMaterial({ uniforms: U, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: T.BackSide, depthWrite: false, fog: false });
    const mesh = new T.Mesh(new T.SphereGeometry(o.radius || 95, 48, 24), mat);
    mesh.renderOrder = -10;
    mesh.frustumCulled = false;
    mesh.castShadow = mesh.receiveShadow = false;
    mesh.userData.U = U;
    return mesh;
  }

  // ==================================================================
  // Texturas desenhadas
  // ==================================================================
  function puffTex(K) {
    return K.tex(512, 256, (ctx, w, h) => {
      const r = M.rng(11);
      const blobs = [[0.5, 0.56, 0.2], [0.33, 0.64, 0.15], [0.67, 0.63, 0.16], [0.42, 0.44, 0.15], [0.58, 0.42, 0.13], [0.2, 0.7, 0.1], [0.8, 0.7, 0.11], [0.5, 0.72, 0.18], [0.27, 0.52, 0.1]];
      blobs.forEach((b) => {
        const x = b[0] * w, y = b[1] * h, rr = b[2] * w;
        const g = ctx.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.72, 'rgba(244,240,252,0.92)');
        g.addColorStop(1, 'rgba(220,214,240,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
      });
      // base levemente mais escura (volume)
      ctx.globalCompositeOperation = 'source-atop';
      const sh = ctx.createLinearGradient(0, h * 0.35, 0, h);
      sh.addColorStop(0, 'rgba(255,255,255,0)');
      sh.addColorStop(1, 'rgba(110,96,150,0.6)');
      ctx.fillStyle = sh; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      r();
    });
  }
  function dotTex(K) {
    return K.tex(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.65)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    });
  }
  function softDisc(K, inner) {
    return K.tex(256, 256, (ctx) => {
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(inner == null ? 0.3 : inner, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    });
  }

  /** Nuvens (sprites) com textura fofa. */
  function cloudSprite(tex, color, w, h, opacity) {
    const m = new T.SpriteMaterial({ map: tex, color: M.color(color), transparent: true, opacity: opacity == null ? 0.9 : opacity, depthWrite: false });
    const s = new T.Sprite(m);
    s.scale.set(w, h, 1);
    return s;
  }

  /** Pontos brilhantes (Points aditivos). */
  function glowPoints(K, n, size, opts) {
    opts = opts || {};
    const g = K.geo(new T.BufferGeometry());
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    if (opts.vertexColors) g.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3));
    const m = K.mat(new T.PointsMaterial({ size, map: opts.tex, color: M.color(opts.color || '#ffffff'), transparent: true, opacity: opts.opacity == null ? 1 : opts.opacity, depthWrite: false, blending: T.AdditiveBlending, vertexColors: !!opts.vertexColors, sizeAttenuation: true }));
    m.toneMapped = false;
    const p = new T.Points(g, m);
    p.frustumCulled = false;
    return p;
  }

  // ==================================================================
  // Ilha flutuante (topo com grama suave + base de rocha facetada)
  // ==================================================================
  function islandGeos(o) {
    const r = M.rng(o.seed || 7);
    const NA = o.NA || 40;
    const ph = [r() * 6, r() * 6, r() * 6];
    const wob = o.wob == null ? 1 : o.wob;
    const R = (a) => 1 + wob * (0.09 * Math.sin(3 * a + ph[0]) + 0.06 * Math.sin(5 * a + ph[1]) + 0.035 * Math.sin(8 * a + ph[2]));
    const loc = (s, a) => [Math.cos(a) * s * R(a) * o.rx, Math.sin(a) * s * R(a) * o.rz];
    const hf = o.h || (() => 0);
    const D = o.depth || 1;
    const lipK = o.lip == null ? 1 : o.lip;
    // ---- topo ----
    const TOPS = [0, 0.2, 0.38, 0.54, 0.68, 0.8, 0.89, 0.95, 0.985, 1.0];
    const LIP = [[1.02, -0.04], [1.032, -0.11], [1.024, -0.19], [0.996, -0.25]];
    const rows = TOPS.length + LIP.length;
    const P = new Float32Array(rows * NA * 3), CC = new Float32Array(rows * NA * 3);
    const gA = col(o.grass[0]), gB = col(o.grass[1]), gE = col(o.grass[2]);
    const tc = new T.Color();
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < NA; j++) {
        const a = (j / NA) * TAU, k = (i * NA + j) * 3;
        let x, z, y, edge;
        if (i < TOPS.length) {
          const q = loc(TOPS[i], a); x = q[0]; z = q[1]; y = hf(x, z);
          edge = sstep(0.82, 1.0, TOPS[i]) * 0.45;
        } else {
          const l = LIP[i - TOPS.length], rim = loc(1, a), q = loc(1 + (l[0] - 1) * lipK, a);
          x = q[0]; z = q[1]; y = hf(rim[0], rim[1]) + l[1] * lipK;
          edge = 0.55 + 0.45 * (i - TOPS.length) / LIP.length;
        }
        P[k] = x; P[k + 1] = y; P[k + 2] = z;
        const n = 0.5 + 0.5 * Math.sin(x * 1.6 + ph[0]) * Math.sin(z * 2.2 + ph[1]) + 0.15 * Math.sin(x * 5.1 + z * 4.3);
        tc.copy(gA).lerp(gB, clamp(n, 0, 1)).lerp(gE, edge);
        CC[k] = tc.r; CC[k + 1] = tc.g; CC[k + 2] = tc.b;
      }
    }
    const idx = [];
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < NA; j++) {
        const a = i * NA + j, b = i * NA + ((j + 1) % NA), c = (i + 1) * NA + j, d = (i + 1) * NA + ((j + 1) % NA);
        idx.push(a, b, c, b, d, c);
      }
    }
    const top = new T.BufferGeometry();
    top.setAttribute('position', new T.BufferAttribute(P, 3));
    top.setAttribute('color', new T.BufferAttribute(CC, 3));
    top.setIndex(idx);
    top.computeVertexNormals();
    // ---- base de rocha ----
    const UND = o.under || [[0.985, -0.29], [0.95, -0.52], [0.88, -0.92], [0.77, -1.5], [0.63, -2.2], [0.47, -2.9], [0.31, -3.55], [0.16, -4.15]];
    const tipY = (o.tip == null ? -4.7 : o.tip) * D;
    const NU = UND.length;
    const UP = new Float32Array((NU * NA + 1) * 3);
    for (let i = 0; i < NU; i++) {
      for (let j = 0; j < NA; j++) {
        const a = ((j + (i % 2) * 0.5) / NA) * TAU;
        const jit = i === 0 ? 0 : (r() - 0.5) * 0.18;
        const q = loc(UND[i][0] * (1 + jit), a);
        const rim = loc(1, a);
        const y = i === 0 ? hf(rim[0], rim[1]) + UND[0][1] : UND[i][1] * D + (r() - 0.5) * 0.16 * D;
        const k = (i * NA + j) * 3;
        UP[k] = q[0]; UP[k + 1] = y; UP[k + 2] = q[1];
      }
    }
    const tipI = NU * NA;
    UP[tipI * 3] = (r() - 0.5) * 0.3 * o.rx; UP[tipI * 3 + 1] = tipY; UP[tipI * 3 + 2] = (r() - 0.5) * 0.3 * o.rz;
    const uidx = [];
    for (let i = 0; i < NU - 1; i++) {
      for (let j = 0; j < NA; j++) {
        const a = i * NA + j, b = i * NA + ((j + 1) % NA), c = (i + 1) * NA + j, d = (i + 1) * NA + ((j + 1) % NA);
        uidx.push(a, b, c, b, d, c);
      }
    }
    for (let j = 0; j < NA; j++) uidx.push((NU - 1) * NA + j, (NU - 1) * NA + ((j + 1) % NA), tipI);
    const ug = new T.BufferGeometry();
    ug.setAttribute('position', new T.BufferAttribute(UP, 3));
    ug.setIndex(uidx);
    const under = ug.toNonIndexed();
    ug.dispose();
    under.computeVertexNormals();
    const pa = under.attributes.position;
    const UC = new Float32Array(pa.count * 3);
    const s0 = col(o.soil[0]), s1 = col(o.soil[1]);
    const r0 = col(o.rock[0]), r1 = col(o.rock[1]), r2 = col(o.rock[2]);
    for (let f = 0; f < pa.count; f += 3) {
      const cy = (pa.getY(f) + pa.getY(f + 1) + pa.getY(f + 2)) / 3;
      const dep = clamp(-cy / Math.abs(tipY), 0, 1);
      if (cy > -0.8 * D) tc.copy(s0).lerp(s1, (Math.floor(-cy / (0.22 * D)) % 2) * 0.7 + hash(f * 0.37) * 0.3);
      else tc.copy(r0).lerp(r1, sstep(0.15, 0.55, dep)).lerp(r2, sstep(0.5, 1.0, dep));
      tc.multiplyScalar(0.86 + 0.28 * hash(f * 1.31 + 0.5));
      for (let v = 0; v < 3; v++) { UC[(f + v) * 3] = tc.r; UC[(f + v) * 3 + 1] = tc.g; UC[(f + v) * 3 + 2] = tc.b; }
    }
    under.setAttribute('color', new T.BufferAttribute(UC, 3));
    return { top, under, loc, R, hf, NA, rings: UND, D };
  }

  /** Monta uma ilha pronta (grupo com topo + base). */
  function buildIsland(K, parent, o) {
    const g = M.group({ parent, pos: o.pos || [0, 0, 0] });
    const ig = islandGeos(o);
    K.geo(ig.top); K.geo(ig.under);
    const topM = o.topMat || K.vc({ rough: 0.95 });
    const undM = o.undMat || K.vc({ rough: 0.9 });
    const top = new T.Mesh(ig.top, topM); top.castShadow = !!o.cast; top.receiveShadow = o.receive !== false; g.add(top);
    const und = new T.Mesh(ig.under, undM); und.castShadow = !!o.cast; und.receiveShadow = false; g.add(und);
    g.userData.ig = ig;
    return g;
  }

  // ==================================================================
  // ARENA — o sonho / a luta contra a Dúvida
  // ==================================================================
  P2.envs.arena = {
    name: 'Arena dos Sonhos',
    build(params) {
      params = params || {};
      const K = makeKit();
      const root = new T.Group();
      root.name = 'env:arena';
      const st = { calm: clamp(+params.calm || 0, 0, 1), inten: clamp(+params.intensity || 0, 0, 1), tc: 0, ti: 0, aC: -1, aI: -1, first: true, t0: null, slot: -1, flashT: -99, pending: false, strikeAt: 0, seed: 0, swirlT: 0 };
      st.tc = st.calm; st.ti = st.inten;

      // ---------------- céu ----------------
      const STORM = {
        cTop: col('#02031a'), cBand: col('#0d1140'), cMid: col('#2b2266'), cBot: col('#0b0820'),
        cAur1: col('#3dffc4'), cAur2: col('#c05cff'), cNeb: col('#26339a'), cSun: col('#ffd2a0'),
        hemiSky: col('#8f86e8'), hemiGround: col('#1a1236'), sun: col('#d2c4ff'), pl1: col('#6fe6ff'), pl2: col('#c04aff'),
        fog: col('#141238'), sea: col('#2e2a6e'), cloud: col('#3c3680'), rune: col('#7fe9ff'), mote: col('#b9a6ff'),
      };
      const DAWN = {
        cTop: col('#4f63b8'), cBand: col('#b49ae0'), cMid: col('#ffc4a2'), cBot: col('#e3a0b6'),
        cAur1: col('#ffd2a0'), cAur2: col('#ff9ad0'), cNeb: col('#ffb3c8'), cSun: col('#ffdfa6'),
        hemiSky: col('#ffe4d4'), hemiGround: col('#8a6a9a'), sun: col('#ffd2a6'), pl1: col('#ffd9a0'), pl2: col('#ffb0d0'),
        fog: col('#e2b8c8'), sea: col('#ffd6cc'), cloud: col('#ffe0d6'), rune: col('#ffd27a'), mote: col('#ffe39a'),
      };
      const sky = makeSky({ cTop: '#02031a', cMid: '#2b2266', swirlDir: [0.32, 0.2, -0.93], sunDir: [0.28, 0.09, -0.96], stars: 1, aurora: 1, swirl: 1, nebula: 0.5 });
      root.add(sky);
      const SU = sky.userData.U;

      // ---------------- luzes ----------------
      const L = M.lighting('sonho', { area: 9 });
      root.add(L.group);
      L.sun.target.position.set(-0.6, 0, -0.4);
      const pl1 = new T.PointLight('#6fe6ff', 1.6, 9, 2);
      pl1.position.set(-4.5, 1.7, -1.3);
      root.add(pl1);
      const pl2 = new T.PointLight('#b04aff', 1.5, 11, 2);
      pl2.position.set(2.6, 0.2, -0.5);
      root.add(pl2);

      // ---------------- ilha principal ----------------
      const ICX = -2.3, ICZ = -0.45;
      const hW = (x, z) => {
        const b1 = Math.max(0, 1 - ((x + 4.75) * (x + 4.75) + (z + 2.35) * (z + 2.35)) / 4.4);
        const b2 = Math.max(0, 1 - ((x + 0.7) * (x + 0.7) + (z + 2.75) * (z + 2.75)) / 1.6);
        const b3 = Math.max(0, 1 - ((x + 5.6) * (x + 5.6) + (z - 0.9) * (z - 0.9)) / 1.4);
        return 0.78 * sstep(0, 1, b1) + 0.28 * sstep(0, 1, b2) + 0.22 * sstep(0, 1, b3);
      };
      const island = buildIsland(K, root, {
        pos: [ICX, 0, ICZ], rx: 3.85, rz: 3.0, seed: 3, NA: 44,
        h: (x, z) => hW(x + ICX, z + ICZ),
        grass: ['#3f8f6a', '#5aa86e', '#2c6655'], soil: ['#6b4a3c', '#54382f'], rock: ['#5b4a7c', '#3e3160', '#231a3d'],
      });
      const ig = island.userData.ig;
      const r = M.rng(77);

      // grama (tufos mesclados)
      const blade = K.geo(new T.CylinderGeometry(0, 0.024, 1, 3, 1, true));
      blade.translate(0, 0.5, 0);
      const gBase = col('#2a6450'), gTip = col('#9be08e'), gTmp = new T.Color();
      const bladeC = (x, y) => gTmp.copy(gBase).lerp(gTip, clamp(y, 0, 1));
      const grassParts = [];
      const RUNE = { x: -2.1, z: 0.62, r: 1.0 };
      const inRune = (x, z) => Math.hypot(x - RUNE.x, z - RUNE.z) < RUNE.r;
      for (let i = 0; i < 190; i++) {
        const s = Math.sqrt(r()) * 0.95, a = r() * TAU;
        const q = ig.loc(s, a);
        const x = ICX + q[0], z = ICZ + q[1];
        if (inRune(x, z) && r() < 0.8) continue;
        const y = hW(x, z);
        const nb = 3 + Math.floor(r() * 3), hh = 0.12 + r() * 0.17 + (s > 0.85 ? 0.08 : 0);
        for (let b = 0; b < nb; b++) {
          grassParts.push({ g: blade, m: mat4([x + (r() - 0.5) * 0.09, y - 0.02, z + (r() - 0.5) * 0.09], [(r() - 0.5) * 0.8, r() * TAU, (r() - 0.5) * 0.8], [1, hh * (0.7 + r() * 0.6), 1]), c: bladeC });
        }
      }
      const grass = new T.Mesh(K.geo(mergeParts(grassParts)), K.vc({ rough: 0.9 }));
      grass.receiveShadow = true;
      root.add(grass);

      // flores (brotam com calm) — instanciadas
      const petal = M.sphereGeo(0.03, 8, 6);
      const fparts = [];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; fparts.push({ g: petal, m: mat4([Math.cos(a) * 0.032, 0, Math.sin(a) * 0.032], [0, -a, 0], [1, 0.4, 0.62]), c: '#ffffff' }); }
      fparts.push({ g: M.sphereGeo(0.019, 8, 6), m: mat4([0, 0.01, 0], null, [1, 0.6, 1]), c: '#ffe08a' });
      const flowerG = K.geo(mergeParts(fparts));
      const FLN = 70;
      const flowers = new T.InstancedMesh(flowerG, K.vc({ rough: 0.6, emissive: '#ffffff', ei: 0.06 }), FLN);
      flowers.castShadow = false;
      const FCOLS = ['#ff8fb8', '#fff2ea', '#ffd36e', '#c9a2ff', '#ffb38a', '#ff9ad0'];
      const flowerData = [];
      for (let i = 0; i < FLN; i++) {
        let x, z, tries = 0;
        do { const s = Math.sqrt(r()) * 0.9, a = r() * TAU; const q = ig.loc(s, a); x = ICX + q[0]; z = ICZ + q[1]; tries++; } while (inRune(x, z) && tries < 8);
        const d = Math.hypot(x - RUNE.x, z - RUNE.z);
        flowerData.push({ x, y: hW(x, z) + 0.1 + r() * 0.06, z, s: 1.1 + r() * 1.0, rot: r() * TAU, tilt: (r() - 0.5) * 0.5, delay: clamp(d / 6, 0, 0.6) * 0.8 + r() * 0.1 });
        flowers.setColorAt(i, M.color(FCOLS[i % FCOLS.length]));
      }
      root.add(flowers);
      const _fm = new T.Matrix4(), _fq = new T.Quaternion(), _fv = new T.Vector3(), _fs = new T.Vector3();
      function bloom(c) {
        flowerData.forEach((f, i) => {
          const k = Math.max(0.0001, M.ease.back(sstep(f.delay, f.delay + 0.3, c)) * f.s);
          _fq.setFromEuler(_e.set(f.tilt, f.rot, 0));
          _fm.compose(_fv.set(f.x, f.y, f.z), _fq, _fs.set(k, k, k));
          flowers.setMatrixAt(i, _fm);
        });
        flowers.instanceMatrix.needsUpdate = true;
      }

      // pedras, pilares e o círculo de runas
      const rockParts = [];
      const rkC = '#6a5c8e';
      [[-3.7, -2.75, 0.95, 1], [1.0, -1.45, 0.55, 2], [-5.65, 1.35, 0.5, 3], [1.25, -0.25, 0.34, 4], [-0.15, 1.75, 0.28, 5], [-4.2, 1.95, 0.32, 6], [-2.75, -3.1, 0.45, 7]].forEach((b) => {
        const g = rockGeo(K, b[3] + 20, 1, 0.22, 0.75);
        rockParts.push({ g, m: mat4([b[0], hW(b[0], b[1]) + b[2] * 0.35, b[1]], [0, r() * TAU, 0], b[2]), c: rkC, flat: true });
      });
      // seixos na borda
      const peb = rockGeo(K, 9, 0, 0.25, 0.6);
      for (let i = 0; i < 26; i++) {
        const a = r() * TAU, q = ig.loc(0.97 + r() * 0.04, a);
        const x = ICX + q[0], z = ICZ + q[1];
        rockParts.push({ g: peb, m: mat4([x, hW(x, z) - 0.03, z], [r(), r() * TAU, r()], 0.07 + r() * 0.12), c: '#7a6c9c', flat: true });
      }
      const rocksG = K.geo(mossify(mergeParts(rockParts), '#4f9a6c', 0.55, 0.85));
      const rocks = new T.Mesh(rocksG, K.vc({ rough: 0.88 }));
      rocks.castShadow = true; rocks.receiveShadow = true;
      root.add(rocks);

      // pilares antigos com runas
      const stoneM = M.mat('#a79fc6', { rough: 0.82 });
      const stoneD = M.mat('#8a82ad', { rough: 0.85 });
      const runeGlowM = K.mat(new T.MeshStandardMaterial({ color: '#2a5f7a', emissive: col('#6fe8ff'), emissiveIntensity: 1.4, roughness: 0.4 }));
      function pillar(x, z, h, broken, rot, seed) {
        const g = M.group({ parent: root, pos: [x, hW(x, z) - 0.04, z], rot: [0, rot, 0] });
        M.rbox(0.8, 0.22, 0.8, 0.05, stoneD, { parent: g, pos: [0, 0.11, 0] });
        M.rbox(0.66, 0.14, 0.66, 0.04, stoneM, { parent: g, pos: [0, 0.29, 0] });
        M.cyl(0.24, 0.28, h, stoneM, { parent: g, pos: [0, 0.36 + h / 2, 0], seg: 10 });
        M.cyl(0.29, 0.29, 0.07, runeGlowM, { parent: g, pos: [0, 0.36 + h * 0.3, 0], seg: 10, cast: false });
        M.cyl(0.29, 0.29, 0.04, runeGlowM, { parent: g, pos: [0, 0.36 + h * 0.3 + 0.13, 0], seg: 10, cast: false });
        if (broken) {
          const cap = new T.Mesh(rockGeo(K, seed, 0, 0.35, 0.7), stoneM);
          cap.position.set(0.02, 0.36 + h + 0.02, 0); cap.scale.set(0.27, 0.22, 0.27); cap.castShadow = true;
          g.add(cap);
        } else {
          M.rbox(0.7, 0.16, 0.7, 0.04, stoneD, { parent: g, pos: [0, 0.36 + h + 0.08, 0] });
          M.rbox(0.56, 0.08, 0.56, 0.03, stoneM, { parent: g, pos: [0, 0.36 + h - 0.02, 0] });
        }
        return g;
      }
      pillar(0.4, -2.25, 2.3, true, 0.3, 31);
      pillar(-4.95, -0.6, 1.25, true, 0.8, 32);
      pillar(-1.75, -3.05, 2.9, false, 0.1, 33);
      // tambor de coluna caído
      const drum = M.cyl(0.25, 0.25, 0.62, stoneM, { parent: root, pos: [-4.1, 0.24, 1.05], rot: [0, 0.6, Math.PI / 2], seg: 10 });
      drum.receiveShadow = true;

      // círculo de runas no chão (sob os heróis)
      const runeTex = K.tex(512, 512, (ctx, w) => {
        const c = w / 2;
        ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(c, c, 238, 0, TAU); ctx.stroke();
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(c, c, 222, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3; ctx.setLineDash([10, 14]); ctx.beginPath(); ctx.arc(c, c, 150, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c, c, 140, 0, TAU); ctx.stroke();
        const rr = M.rng(4);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          ctx.save(); ctx.translate(c + Math.cos(a) * 186, c + Math.sin(a) * 186); ctx.rotate(a + Math.PI / 2);
          ctx.lineWidth = 4; ctx.beginPath();
          const kind = Math.floor(rr() * 4);
          if (kind === 0) { ctx.moveTo(-10, 12); ctx.lineTo(0, -12); ctx.lineTo(10, 12); ctx.moveTo(-6, 4); ctx.lineTo(6, 4); }
          else if (kind === 1) { ctx.moveTo(0, -13); ctx.lineTo(0, 13); ctx.moveTo(-9, -5); ctx.lineTo(9, 5); }
          else if (kind === 2) { ctx.arc(0, 0, 9, 0.4, TAU - 0.4); ctx.moveTo(0, -13); ctx.lineTo(0, 13); }
          else { ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.lineTo(-10, 10); ctx.lineTo(10, 10); }
          ctx.stroke(); ctx.restore();
        }
        // estrela de 6 pontas suave
        ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
        for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = 0; i <= 3; i++) { const a = (i / 3) * TAU + k * Math.PI / 3 - Math.PI / 2; const x = c + Math.cos(a) * 138, y = c + Math.sin(a) * 138; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(c, c, 0, c, c, 240);
        g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(0.6, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
      });
      const runeMat = K.mat(new T.MeshBasicMaterial({ map: runeTex, color: '#7fe9ff', transparent: true, opacity: 0.8, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const rune = new T.Mesh(M.planeGeo(2.6, 2.6), runeMat);
      rune.rotation.x = -Math.PI / 2; rune.position.set(RUNE.x, 0.025, RUNE.z); rune.renderOrder = 2;
      root.add(rune);

      // cristais
      const cg = crystalGeo(K);
      const cyanParts = [], violetParts = [], darkParts = [];
      crystalCluster(cyanParts, cg, { x: -5.55, y: hW(-5.55, -1.55), z: -1.55, n: 7, size: 1.9, color: '#3fc6e8', tip: '#d8fbff', seed: 1, out: [-0.25, 1, -0.1] });
      crystalCluster(violetParts, cg, { x: -0.75, y: hW(-0.75, -3.0), z: -3.0, n: 5, size: 1.05, color: '#8a5ce0', tip: '#f0d8ff', seed: 2, out: [0, 1, -0.2] });
      crystalCluster(cyanParts, cg, { x: 0.95, y: 0, z: 1.15, n: 4, size: 0.62, color: '#3fc6e8', tip: '#d8fbff', seed: 3, out: [0.3, 1, 0.2] });
      crystalCluster(violetParts, cg, { x: -4.3, y: hW(-4.3, 1.85), z: 1.85, n: 4, size: 0.55, color: '#8a5ce0', tip: '#f0d8ff', seed: 4, out: [-0.2, 1, 0.3] });
      crystalCluster(cyanParts, cg, { x: -3.45, y: hW(-3.45, -2.3), z: -2.3, n: 3, size: 0.6, color: '#3fc6e8', tip: '#d8fbff', seed: 6, out: [0, 1, 0] });
      // cristais saindo da base da ilha
      [[0.3, 2], [1.4, 3], [2.5, 2], [3.6, 4], [4.6, 3], [5.5, 2]].forEach((c, i) => {
        const a = c[0], ring = ig.rings[c[1]];
        const q = ig.loc(ring[0] * 0.97, a);
        const x = ICX + q[0], z = ICZ + q[1];
        crystalCluster(i % 2 ? violetParts : cyanParts, cg, { x, y: ring[1] + 0.1, z, n: 3, size: 0.5 + (i % 3) * 0.18, color: i % 2 ? '#7a4cd0' : '#2fa8d0', tip: '#bff4ff', seed: 10 + i, out: [Math.cos(a), -0.7, Math.sin(a)] });
      });
      const cyanM = K.mat(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.1, emissive: col('#2fb8e0'), emissiveIntensity: 0.55 }));
      const violetM = K.mat(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.1, emissive: col('#8a4ce8'), emissiveIntensity: 0.55 }));
      const darkM = K.mat(new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1, emissive: col('#c03aff'), emissiveIntensity: 0.6 }));
      const cyanMesh = new T.Mesh(K.geo(mergeParts(cyanParts)), cyanM); cyanMesh.castShadow = true; root.add(cyanMesh);
      const violetMesh = new T.Mesh(K.geo(mergeParts(violetParts)), violetM); violetMesh.castShadow = true; root.add(violetMesh);
      const glows = [];
      const addGlow = (c, s, x, y, z, op, parent) => { const g = M.glow(c, s, op); g.position.set(x, y, z); (parent || root).add(g); glows.push(g); return g; };
      addGlow('#5fe0ff', 2.6, -5.55, hW(-5.55, -1.55) + 0.9, -1.55, 0.45);
      addGlow('#b48cff', 1.5, -0.75, hW(-0.75, -3.0) + 0.5, -3.0, 0.4);
      addGlow('#5fe0ff', 1.0, 0.95, 0.35, 1.15, 0.4);

      // árvore dos sonhos
      const TX = -4.35, TZ = -2.15, TY = hW(TX, TZ) - 0.05;
      const tree = M.group({ parent: root, pos: [TX, TY, TZ], rot: [0, 0.5, 0] });
      const bark = M.mat('#5a3b52', { rough: 0.9 });
      M.cyl(0.13, 0.22, 1.2, bark, { parent: tree, pos: [0.04, 0.58, 0], rot: [0, 0, -0.08], seg: 8 });
      M.cyl(0.09, 0.13, 1.0, bark, { parent: tree, pos: [-0.04, 1.6, 0.02], rot: [0.05, 0, 0.22], seg: 8 });
      M.cyl(0.04, 0.07, 0.75, bark, { parent: tree, pos: [0.3, 1.75, 0.05], rot: [0, 0, -0.85], seg: 6 });
      M.cyl(0.04, 0.07, 0.7, bark, { parent: tree, pos: [-0.32, 1.95, -0.1], rot: [0.2, 0, 0.9], seg: 6 });
      const canopyParts = [];
      const cLow = col('#7046b0'), cHigh = col('#f2b0ff'), cTmp = new T.Color();
      [[0, 2.45, 0, 0.82], [0.62, 2.2, 0.1, 0.62], [-0.62, 2.3, -0.12, 0.66], [0.15, 2.05, 0.55, 0.55], [-0.2, 2.15, -0.55, 0.58], [0.3, 2.85, -0.2, 0.52], [-0.35, 2.75, 0.3, 0.5], [0.85, 2.0, -0.45, 0.4]].forEach((p, i) => {
        canopyParts.push({ g: rockGeo(K, 40 + i, 1, 0.13, 0.9), m: mat4([p[0], p[1], p[2]], [r(), r(), r()], p[3]), c: (x, y) => cTmp.copy(cLow).lerp(cHigh, sstep(-0.9, 0.9, y)), flat: true });
      });
      const canopy = new T.Mesh(K.geo(mergeParts(canopyParts)), K.vc({ rough: 0.8 }));
      canopy.castShadow = true; canopy.receiveShadow = true;
      tree.add(canopy);
      const fruitM = M.mat('#ffcf7a', { emissive: '#ffb347', emissiveIntensity: 1.6 });
      [[0.45, 1.75, 0.35], [-0.5, 1.85, 0.2], [0.1, 1.68, -0.5], [0.75, 1.95, -0.2], [-0.25, 1.75, 0.6]].forEach((p) => {
        M.cyl(0.004, 0.004, 0.18, '#3a2a3a', { parent: tree, pos: [p[0], p[1] + 0.1, p[2]], cast: false });
        M.sphere(0.055, fruitM, { parent: tree, pos: p, cast: false });
      });
      addGlow('#ffc56a', 1.7, 0.1, 1.8, 0.05, 0.35, tree);

      // ---------------- espaço do chefão ----------------
      const bossTopM = K.vc({ rough: 0.95 }), bossUndM = K.vc({ rough: 0.9 });
      const bossIsle = buildIsland(K, root, {
        pos: [2.75, -0.95, -1.05], rx: 1.5, rz: 1.2, seed: 41, NA: 26, depth: 0.55, wob: 1.6, tip: -4.5, topMat: bossTopM, undMat: bossUndM,
        grass: ['#3f8f6a', '#5aa86e', '#2c6655'], soil: ['#6b4a3c', '#54382f'], rock: ['#5b4a7c', '#3e3160', '#231a3d'],
      });
      // cristais escuros (coordenadas locais da ilha do chefão: acompanham a flutuação dela)
      crystalCluster(darkParts, cg, { x: 1.05, y: 0, z: -0.45, n: 5, size: 1.0, color: '#4a1f7a', tip: '#ff7ae8', seed: 21, out: [0.35, 1, -0.2] });
      crystalCluster(darkParts, cg, { x: -1.1, y: 0, z: 0.6, n: 3, size: 0.6, color: '#4a1f7a', tip: '#ff7ae8', seed: 22, out: [-0.3, 1, 0.3] });
      crystalCluster(darkParts, cg, { x: 0.15, y: 0, z: -1.15, n: 4, size: 0.8, color: '#4a1f7a', tip: '#ff7ae8', seed: 23, out: [0, 1, -0.4] });
      const darkMesh = new T.Mesh(K.geo(mergeParts(darkParts)), darkM); darkMesh.castShadow = true; bossIsle.add(darkMesh);
      // grama que cresce na ilha do chefão depois da vitória (escala com calm)
      const bossGrassParts = [], big = bossIsle.userData.ig;
      for (let i = 0; i < 60; i++) {
        const s = Math.sqrt(r()) * 0.86, a = r() * TAU, q = big.loc(s, a);
        if (Math.hypot(q[0] + 0.15, q[1]) < 0.55) continue; // o centro fica livre (onde a Dúvida pousa)
        const hh = 0.1 + r() * 0.14;
        for (let b = 0; b < 4; b++) bossGrassParts.push({ g: blade, m: mat4([q[0] + (r() - 0.5) * 0.09, -0.02, q[1] + (r() - 0.5) * 0.09], [(r() - 0.5) * 0.8, r() * TAU, (r() - 0.5) * 0.8], [1, hh * (0.7 + r() * 0.6), 1]), c: bladeC });
      }
      const bossGrass = new T.Mesh(K.geo(mergeParts(bossGrassParts)), K.vc({ rough: 0.9 }));
      bossGrass.receiveShadow = true; bossGrass.castShadow = false;
      bossIsle.add(bossGrass);
      bossIsle.userData.base = bossIsle.position.y;
      // vórtice (disco em espiral)
      const spiralTex = K.tex(512, 512, (ctx, w) => {
        const c = w / 2;
        for (let arm = 0; arm < 4; arm++) {
          for (let i = 0; i < 260; i++) {
            const t = i / 260;
            const a = arm * (TAU / 4) + t * 7.5;
            const rr = 20 + t * 225;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.16 * (1 - t) + 0.05).toFixed(3) + ')';
            ctx.beginPath(); ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 6 + t * 26, 0, TAU); ctx.fill();
          }
        }
        const g = ctx.createRadialGradient(c, c, 0, c, c, 250);
        g.addColorStop(0, 'rgba(255,255,255,0.7)'); g.addColorStop(0.25, 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
      });
      const vortexM1 = K.mat(new T.MeshBasicMaterial({ map: spiralTex, color: '#9a4dff', transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      const vortexM2 = K.mat(new T.MeshBasicMaterial({ map: spiralTex, color: '#ff5ad8', transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
      const vortex1 = new T.Mesh(M.planeGeo(6.5, 6.5), vortexM1); vortex1.rotation.x = -Math.PI / 2; vortex1.position.set(2.75, -0.62, -1.05); root.add(vortex1);
      const vortex2 = new T.Mesh(M.planeGeo(3.8, 3.8), vortexM2); vortex2.rotation.x = -Math.PI / 2; vortex2.position.set(2.75, -0.52, -1.05); root.add(vortex2);
      const bossGlow = addGlow('#b04aff', 5.5, 2.7, 1.2, -1.4, 0.35);

      // ---------------- planeta gigante com anéis (céu cósmico) ----------------
      const planetTex = K.tex(512, 256, (ctx, w, h) => {
        const rr = M.rng(61);
        const bands = ['#5a3fa8', '#7a5cc8', '#4a3590', '#9a7ad8', '#6a4ab8', '#b49ae6', '#5a3fa8', '#43307f'];
        let y = 0;
        while (y < h) { const bh = 8 + rr() * 26; ctx.fillStyle = bands[Math.floor(rr() * bands.length)]; ctx.fillRect(0, y, w, bh + 1); y += bh; }
        for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.03 + rr() * 0.06).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(rr() * w, rr() * h, 20 + rr() * 90, 2 + rr() * 6, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,190,240,0.5)'; ctx.beginPath(); ctx.ellipse(w * 0.62, h * 0.58, 26, 13, 0, 0, TAU); ctx.fill();
      });
      planetTex.encoding = T.LinearEncoding; // decodificado à mão no shader
      const planetU = { map: { value: planetTex }, lightDir: { value: new T.Vector3(0.75, 0.35, 0.55).normalize() }, rim: { value: col('#c8a8ff') }, opacity: { value: 1 }, day: { value: 0 } };
      const planetM = K.mat(new T.ShaderMaterial({
        uniforms: planetU, transparent: true, fog: false,
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position, 1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
        fragmentShader: 'uniform sampler2D map; uniform vec3 lightDir; uniform vec3 rim; uniform float opacity; uniform float day; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vec3 n = normalize(vN); vec3 base = texture2D(map, vUv).rgb; base = pow(base, vec3(2.2)); float l = smoothstep(-0.25, 0.6, dot(n, lightDir)); float f = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 2.5); vec3 c = base * (0.12 + 1.05 * l) + rim * f * (0.35 + 0.65 * l) * 0.9; c = mix(c, vec3(1.0, 0.93, 0.95) * (0.55 + 0.45 * l), day); gl_FragColor = vec4(c, opacity * (1.0 - day * 0.55)); \n#include <encodings_fragment>\n}',
      }));
      const planet = new T.Mesh(K.geo(new T.SphereGeometry(7, 48, 32)), planetM);
      planet.position.set(-27, 23, -61); planet.rotation.set(0.35, 0, -0.32);
      planet.castShadow = planet.receiveShadow = false; planet.renderOrder = -5;
      root.add(planet);
      const ringTex = K.tex(512, 512, (ctx, w) => {
        const c = w / 2, rr = M.rng(62);
        for (let rad = c * 0.6; rad < c; rad += 1.5) {
          const k = (rad - c * 0.6) / (c * 0.4);
          const a = (0.25 + 0.6 * rr()) * Math.sin(k * Math.PI) * (k > 0.55 && k < 0.6 ? 0.1 : 1);
          ctx.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(c, c, rad, 0, TAU); ctx.stroke();
        }
      });
      const ringM = K.mat(new T.MeshBasicMaterial({ map: ringTex, color: '#d8c0ff', transparent: true, opacity: 0.75, side: T.DoubleSide, depthWrite: false, fog: false, toneMapped: false }));
      const ring = new T.Mesh(K.geo(new T.RingGeometry(8.6, 15.5, 96, 1)), ringM);
      ring.rotation.set(-1.25, 0.18, 0.1);
      planet.add(ring);
      ring.renderOrder = -4;

      // ---------------- ilhotas flutuantes ----------------
      const minis = [];
      [[-8.3, -1.4, -3.4, 0.95, 51, 'c'], [6.4, 1.9, -4.6, 0.75, 52, 't'], [-6.9, 3.4, -6.6, 0.6, 53, 'c'], [5.6, -2.8, 2.3, 0.85, 54, 'v'], [8.8, 4.6, -9.5, 0.7, 55, 'c']].forEach((d, i) => {
        const g = buildIsland(K, root, { pos: [d[0], d[1], d[2]], rx: d[3], rz: d[3] * 0.85, seed: d[4], NA: 22, depth: d[3] * 0.55, tip: -4.4, lip: 0.6,
          grass: ['#3f8f6a', '#5aa86e', '#2c6655'], soil: ['#6b4a3c', '#54382f'], rock: ['#5b4a7c', '#3e3160', '#231a3d'] });
        const pp = [];
        if (d[5] === 't') {
          M.cyl(0.04, 0.07, 0.6, bark, { parent: g, pos: [0, 0.3, 0] });
          const cp = new T.Mesh(rockGeo(K, 60 + i, 1, 0.14, 0.9), K.vc({ rough: 0.8 }));
          const n = cp.geometry.attributes.position.count, cc = new Float32Array(n * 3);
          for (let v = 0; v < n; v++) { cTmp.copy(cLow).lerp(cHigh, sstep(-0.9, 0.9, cp.geometry.attributes.position.getY(v))); cc[v * 3] = cTmp.r; cc[v * 3 + 1] = cTmp.g; cc[v * 3 + 2] = cTmp.b; }
          cp.geometry.setAttribute('color', new T.BufferAttribute(cc, 3));
          cp.position.set(0, 0.85, 0); cp.scale.setScalar(0.42); g.add(cp);
        } else {
          crystalCluster(pp, cg, { x: 0, y: 0, z: 0, n: 4, size: d[3] * 0.9, color: d[5] === 'v' ? '#8a5ce0' : '#3fc6e8', tip: '#ffffff', seed: 70 + i, out: [0, 1, 0] });
          g.add(new T.Mesh(K.geo(mergeParts(pp)), d[5] === 'v' ? violetM : cyanM));
        }
        minis.push({ g, base: d[1], ph: i * 1.7, amp: 0.12 + (i % 3) * 0.05 });
      });
      // ilhas distantes (silhuetas na névoa)
      [[-24, 1.5, -30, 3.2, 81], [27, -1.5, -33, 4.2, 82], [-36, -4, 6, 3.6, 83], [33, 3, 15, 2.6, 84], [-15, 7.5, -46, 3.0, 85]].forEach((d) => {
        buildIsland(K, root, { pos: [d[0], d[1], d[2]], rx: d[3], rz: d[3] * 0.8, seed: d[4], NA: 18, depth: d[3] * 0.5, tip: -4.2,
          grass: ['#4a8a78', '#5f9a7a', '#3a6a62'], soil: ['#5a4a5a', '#4a3a4a'], rock: ['#4a3f6a', '#3a2f58', '#2a2048'], receive: false });
      });

      // ---------------- destroços (instanciados) ----------------
      const debris = [];
      const DEB = [rockGeo(K, 91, 0, 0.3, 0.8), rockGeo(K, 92, 1, 0.22, 0.75)];
      const debM = K.mat(new T.MeshStandardMaterial({ color: '#4f4a78', roughness: 0.9, flatShading: true }));
      const debMeshes = DEB.map((g) => { const m = new T.InstancedMesh(g, debM, 14); m.castShadow = false; m.receiveShadow = false; root.add(m); return m; });
      for (let i = 0; i < 28; i++) {
        const a = r() * TAU, rad = 6.5 + r() * 9;
        let x = Math.cos(a) * rad, z = Math.sin(a) * rad - 2;
        if (z > 2.5 && Math.abs(x) < 7) z = -z - 4;
        const yy0 = -3.5 + r() * 9.5;
        if (Math.abs(x - 2.5) < 4 && yy0 > 0.5 && z > -9) z -= 7;
        debris.push({ mesh: debMeshes[i % 2], idx: Math.floor(i / 2), x, y: yy0, z, s: 0.12 + r() * r() * 0.75, rx: r() * TAU, ry: r() * TAU, spin: (r() - 0.5) * 0.4, ph: r() * TAU });
      }
      const _dm = new T.Matrix4(), _dq = new T.Quaternion(), _dv = new T.Vector3(), _ds = new T.Vector3();
      function updDebris(t) {
        debris.forEach((d) => {
          _dq.setFromEuler(_e.set(d.rx + t * d.spin * 0.5, d.ry + t * d.spin, 0));
          _dm.compose(_dv.set(d.x, d.y + Math.sin(t * 0.45 + d.ph) * 0.18, d.z), _dq, _ds.set(d.s, d.s, d.s));
          d.mesh.setMatrixAt(d.idx, _dm);
        });
        debMeshes.forEach((m) => (m.instanceMatrix.needsUpdate = true));
      }
      updDebris(0);

      // ---------------- mar de nuvens + nuvens no horizonte ----------------
      const puff = puffTex(K);
      const seaTex = K.tex(1024, 1024, (ctx, w) => {
        const rr = M.rng(19);
        for (let i = 0; i < 360; i++) {
          const a = rr() * TAU, d = Math.sqrt(rr()) * 0.47 * w;
          const x = w / 2 + Math.cos(a) * d, y = w / 2 + Math.sin(a) * d, s = 18 + rr() * 60 * (1 - d / (0.5 * w)) + 10;
          const g = ctx.createRadialGradient(x, y, 0, x, y, s);
          g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
        }
      });
      const seaM = K.mat(new T.MeshBasicMaterial({ map: seaTex, color: '#4a2a86', transparent: true, opacity: 0.9, depthWrite: false }));
      const sea1 = new T.Mesh(M.planeGeo(110, 110), seaM); sea1.rotation.x = -Math.PI / 2; sea1.position.y = -7.5; root.add(sea1);
      const sea2 = new T.Mesh(M.planeGeo(80, 80), seaM); sea2.rotation.x = -Math.PI / 2; sea2.position.y = -9.5; sea2.rotation.z = 1; root.add(sea2);
      const clouds = new T.Group(); root.add(clouds);
      const cloudSprites = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + r() * 0.3, rad = 26 + r() * 14;
        const s = cloudSprite(puff, '#6a4aa8', 14 + r() * 12, 7 + r() * 5, 0.85);
        s.position.set(Math.cos(a) * rad, -5 + r() * 4, Math.sin(a) * rad);
        clouds.add(s); cloudSprites.push(s);
      }

      // ---------------- partículas (faíscas / vagalumes) ----------------
      const motes = glowPoints(K, 150, 0.16, { tex: dotTex(K), color: '#c49bff', opacity: 0.9 });
      root.add(motes);
      const moteData = [];
      for (let i = 0; i < 150; i++) moteData.push({ a: r() * TAU, rad: 0.8 + r() * 8.5, y: -2 + r() * 7, sp: 0.1 + r() * 0.25, ph: r() * TAU });
      const mp = motes.geometry.attributes.position;
      function updMotes(t) {
        moteData.forEach((m, i) => {
          const y = ((m.y + t * m.sp + 2) % 9) - 2;
          const a = m.a + t * 0.03 + Math.sin(t * 0.3 + m.ph) * 0.05;
          mp.setXYZ(i, -1 + Math.cos(a) * m.rad, y, -0.8 + Math.sin(a) * m.rad * 0.7);
        });
        mp.needsUpdate = true;
      }
      updMotes(0);

      // ---------------- relâmpagos ----------------
      const bolts = [0, 1, 2].map((k) => {
        const tex = K.tex(256, 1024, (ctx, w, h) => {
          const rr = M.rng(100 + k);
          const path = (x0, y0, len, spread, width, depth) => {
            let x = x0, y = y0;
            const pts = [[x, y]];
            const steps = 16;
            for (let i = 0; i < steps; i++) { x += (rr() - 0.5) * spread; y += len / steps; pts.push([x, y]); }
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            [[width * 6, 'rgba(190,150,255,0.18)'], [width * 2.6, 'rgba(220,200,255,0.55)'], [width, 'rgba(255,255,255,1)']].forEach((L2) => {
              ctx.lineWidth = L2[0]; ctx.strokeStyle = L2[1]; ctx.beginPath();
              pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
            });
            if (depth < 2) for (let b = 0; b < 2; b++) { const p = pts[3 + Math.floor(rr() * 8)]; path(p[0], p[1], len * (0.25 + rr() * 0.2), spread * 0.8, width * 0.55, depth + 1); }
          };
          path(w / 2, 10, h - 40, 70, 5, 0);
        });
        const m = new T.SpriteMaterial({ map: tex, color: '#e8dcff', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, fog: false });
        const s = new T.Sprite(m);
        s.visible = false;
        root.add(s);
        return s;
      });
      function strike(t, seed) {
        st.flashT = t;
        const cam = getCam();
        const yaw = cam ? Math.atan2(cam.position.x, cam.position.z) : 0;
        const a = yaw + Math.PI + (hash(seed * 3.3) - 0.5) * 1.7;
        const R = 24 + hash(seed * 5.1) * 14;
        bolts.forEach((b) => (b.visible = false));
        const b = bolts[seed % 3];
        b.visible = true;
        b.position.set(Math.sin(a) * R, 3 + hash(seed * 1.1) * 4, Math.cos(a) * R);
        const sc = 1 + hash(seed * 9.7) * 0.5;
        b.scale.set(7 * sc, 26 * sc, 1);
        b.material.rotation = (hash(seed * 4.4) - 0.5) * 0.35;
        SU.flashDir.value.copy(b.position).normalize();
      }

      // ---------------- clima (tempestade ↔ amanhecer) ----------------
      const T1 = new T.Color();
      const lerpC = (target, a, b, k) => target.copy(a).lerp(b, k);
      const sunStorm = new T.Vector3(3, 10, 7), sunDawn = new T.Vector3(6, 5.5, 5);
      function applyCalm(c, I) {
        st.aC = c; st.aI = I;
        const k = sstep(0, 1, c);
        ['cTop', 'cBand', 'cMid', 'cBot', 'cAur1', 'cAur2', 'cNeb', 'cSun'].forEach((n) => lerpC(SU[n].value, STORM[n], DAWN[n], k));
        SU.cHor2.value.copy(SU.cMid.value);
        SU.stars.value = lerp(1, 0.1, sstep(0, 0.8, c));
        SU.aurora.value = lerp(1.0, 0.22, k) * (1 - 0.3 * I);
        SU.swirl.value = (1 - sstep(0, 0.65, c)) * (0.8 + 0.4 * I);
        SU.nebula.value = lerp(0.5, 0.45, k);
        SU.sunGlow.value = sstep(0.15, 1, c);
        SU.sunDisc.value = sstep(0.45, 1, c);
        lerpC(L.hemi.color, STORM.hemiSky, DAWN.hemiSky, k);
        lerpC(L.hemi.groundColor, STORM.hemiGround, DAWN.hemiGround, k);
        L.hemi.intensity = lerp(0.72, 0.85, k) * (1 - 0.3 * I);
        lerpC(L.sun.color, STORM.sun, DAWN.sun, k);
        L.sun.intensity = lerp(1.25, 1.75, k) * (1 - 0.35 * I);
        L.sun.position.copy(sunStorm).lerp(sunDawn, k);
        L.amb.intensity = 0.12;
        lerpC(pl1.color, STORM.pl1, DAWN.pl1, k);
        pl1.intensity = lerp(1.6, 0.9, k);
        lerpC(pl2.color, STORM.pl2, DAWN.pl2, k);
        st.pl2Base = lerp(1.5, 0.15, k) * (1 + 0.4 * I);
        const sc = P2.core && P2.core.scene;
        if (sc && sc.fog) lerpC(sc.fog.color, STORM.fog, DAWN.fog, k).multiplyScalar(1 - 0.25 * I);
        if (sc && sc.background && sc.background.isColor) sc.background.copy(SU.cMid.value);
        lerpC(seaM.color, STORM.sea, DAWN.sea, k);
        planetU.day.value = k * 0.85;
        ringM.opacity = lerp(0.75, 0.3, k);
        lerpC(T1, STORM.cloud, DAWN.cloud, k);
        cloudSprites.forEach((s) => s.material.color.copy(T1));
        lerpC(runeMat.color, STORM.rune, DAWN.rune, k);
        runeMat.opacity = lerp(0.8, 0.55, k);
        lerpC(runeGlowM.emissive, STORM.rune, DAWN.rune, k);
        lerpC(motes.material.color, STORM.mote, DAWN.mote, k);
        vortexM1.opacity = 0.85 * (1 - sstep(0, 0.6, c));
        vortexM2.opacity = 0.5 * (1 - sstep(0, 0.6, c));
        vortex1.visible = vortex2.visible = c < 0.98;
        bossGlow.material.opacity = 0.35 * (1 - k);
        debM.color.copy(col('#4f4a78')).lerp(col('#b9a4d6'), k);
        bossTopM.color.copy(col('#4a3272')).lerp(col('#ffffff'), k);
        bossUndM.color.copy(col('#6a5a92')).lerp(col('#ffffff'), k);
        darkM.emissiveIntensity = lerp(0.65, 0.12, k);
        bossGrass.scale.y = Math.max(0.001, sstep(0.25, 1, c));
        bossGrass.visible = c > 0.02;
        lerpC(darkM.emissive, col('#c03aff'), col('#ffb0e0'), k);
        st.crystalBase = lerp(0.6, 0.35, k);
        bloom(c);
      }
      st.crystalBase = 0.6;
      applyCalm(st.calm, st.inten);

      // ---------------- primeira pessoa: colisões ----------------
      // "cerca" invisível acompanhando a borda da ilha (a 88% do raio) + objetos sólidos + morros
      const fence = [];
      for (let i = 0; i < 28; i++) { const q = ig.loc(0.88, (i / 28) * TAU); fence.push([ICX + q[0], ICZ + q[1]]); }
      const FC = fenceColliders(fence, ICX, ICZ);
      const colliders = FC.colliders, bnd = FC.bounds;
      [[0.4, -2.25, 0.3], [-4.95, -0.6, 0.8], [-1.75, -3.05, 0.1]].forEach((p) => colliders.push({ x: p[0], z: p[1], w: 0.85, d: 0.85, rot: p[2] }));
      colliders.push({ x: -4.1, z: 1.05, w: 0.7, d: 0.55, rot: 0.6 }); // tambor caído
      [[-3.7, -2.75, 0.95], [1.0, -1.45, 0.55], [-5.65, 1.35, 0.5], [1.25, -0.25, 0.34], [-0.15, 1.75, 0.28], [-4.2, 1.95, 0.32], [-2.75, -3.1, 0.45]].forEach((b) => colliders.push({ x: b[0], z: b[1], w: b[2] * 1.9, d: b[2] * 1.9 }));
      [[-5.55, -1.55, 1.1], [-0.75, -3.0, 0.7], [0.95, 1.15, 0.5], [-4.3, 1.85, 0.45], [-3.45, -2.3, 0.45]].forEach((c) => colliders.push({ x: c[0], z: c[1], w: c[2], d: c[2] }));
      colliders.push({ x: -4.35, z: -2.15, w: 0.6, d: 0.6 }); // árvore
      // morros (octógono = 2 quadrados): em primeira pessoa o chão é plano, então não se sobe neles
      colliders.push({ x: -4.75, z: -2.35, w: 3.2, d: 3.2 }, { x: -4.75, z: -2.35, w: 3.2, d: 3.2, rot: Math.PI / 4 });
      colliders.push({ x: -0.7, z: -2.75, w: 1.9, d: 1.9, rot: Math.PI / 4 });
      colliders.push({ x: -5.6, z: 0.9, w: 1.6, d: 1.6, rot: Math.PI / 4 });

      // ---------------- contrato ----------------
      const env = {
        root,
        spots: {
          pai: { x: -2.5, z: 0.35, rot: 1.15 },
          faisca: { x: -2.95, z: 0.9, rot: 1.15, y: 1.25 },
          boss: { x: 2.6, z: -1.0, rot: -0.55 },
          centro: { x: -1.0, z: 0.55, rot: 0.6 },
          heroi2: { x: -3.2, z: -0.35, rot: 1.0 },
          // primeira pessoa
          inicio: { x: -2.5, z: 0.35, rot: 1.8 },            // no lugar do pai (círculo de runas), olhando direto para a Dúvida
          arvore: { x: -3.25, z: -0.45, rot: -2.57 },         // diante da árvore dos sonhos (no morro, frutos de luz)
          cristais: { x: -3.9, z: -0.35, rot: -2.2 },         // diante do grande cristal azul
          borda: { x: 0.35, z: 0.3, rot: 2.0 },               // na beira da ilha, olhando o vórtice/abismo
        },
        colliders,
        bounds: { minX: bnd.minX, maxX: bnd.maxX, minZ: bnd.minZ, maxZ: bnd.maxZ },
        shots: {
          geral: { target: [0.0, 1.45, -0.4], yaw: 0.08, pitch: 0.13, dist: 11.8, fov: 40 },
          herois: { target: [-2.6, 1.3, 0.55], yaw: 0.95, pitch: 0.06, dist: 4.4, fov: 38 },
          boss: { target: [2.6, 2.05, -1.0], yaw: -0.45, pitch: -0.06, dist: 6.6, fov: 42 },
          baixo: { target: [1.8, 1.9, -0.8], yaw: -1.147, pitch: -0.115, dist: 6.85, fov: 46 },
          confronto: { target: [0.1, 1.5, -0.3], yaw: 0.42, pitch: 0.24, dist: 9.6, fov: 40 },
          amanhecer: { target: [-0.5, 1.9, -0.9], yaw: 0.3, pitch: 0.05, dist: 12.5, fov: 44 },
          ilha: { target: [-2.2, -0.9, -0.3], yaw: 0.55, pitch: -0.1, dist: 12.5, fov: 42 },
        },
        defaultShot: 'geral',
        walls: [],
        background: '#140a2a',
        fog: { color: '#141238', near: 22, far: 78 },
        setParams(p) {
          p = p || {};
          st.tc = clamp(+p.calm || 0, 0, 1);
          st.ti = clamp(+p.intensity || 0, 0, 1);
          if (st.first) { st.first = false; st.calm = st.tc; st.inten = st.ti; applyCalm(st.calm, st.inten); }
        },
        update(t, p, dt) {
          dt = dt || 0.016;
          if (st.t0 == null) st.t0 = t;
          const lt = t - st.t0;
          if (P2.skipping) { st.calm = st.tc; st.inten = st.ti; }
          else {
            st.calm += (st.tc - st.calm) * (1 - Math.exp(-dt * 0.85));
            st.inten += (st.ti - st.inten) * (1 - Math.exp(-dt * 2.5));
            if (Math.abs(st.tc - st.calm) < 0.0005) st.calm = st.tc;
          }
          if (Math.abs(st.calm - st.aC) > 0.0006 || Math.abs(st.inten - st.aI) > 0.002) applyCalm(st.calm, st.inten);
          const I = st.inten * (1 - st.calm);
          SU.time.value = lt;
          st.swirlT += dt * (0.35 + 1.4 * I);
          SU.swirlT.value = st.swirlT;
          rune.rotation.z = lt * 0.12;
          vortex1.rotation.z = -st.swirlT * 0.9;
          vortex2.rotation.z = -st.swirlT * 1.6;
          minis.forEach((m) => { m.g.position.y = m.base + Math.sin(lt * 0.5 + m.ph) * m.amp; m.g.rotation.y = Math.sin(lt * 0.1 + m.ph) * 0.2; });
          bossIsle.position.y = bossIsle.userData.base + Math.sin(lt * 0.6) * 0.05;
          updDebris(lt);
          updMotes(lt);
          clouds.rotation.y = lt * 0.006;
          sea1.rotation.z = lt * 0.004; sea2.rotation.z = 1 - lt * 0.006;
          const pulse = 0.85 + 0.15 * Math.sin(lt * 1.6);
          cyanM.emissiveIntensity = st.crystalBase * pulse;
          violetM.emissiveIntensity = st.crystalBase * (0.85 + 0.15 * Math.sin(lt * 1.3 + 1));
          runeGlowM.emissiveIntensity = 1.2 + 0.4 * Math.sin(lt * 2);
          // relâmpagos determinísticos
          if (I > 0.02) {
            const rate = 0.45 + 1.4 * I;
            const slot = Math.floor(t * rate);
            if (slot !== st.slot) {
              st.slot = slot;
              if (hash(slot * 1.7 + 3.1) < 0.3 + 0.6 * I) { st.pending = true; st.strikeAt = (slot + 0.1 + hash(slot * 2.3 + 7.7) * 0.6) / rate; st.seed = slot; }
            }
            if (st.pending && t >= st.strikeAt) { st.pending = false; strike(t, Math.abs(st.seed)); }
          } else st.pending = false;
          const e = t - st.flashT;
          let f = 0;
          if (e >= 0 && e < 1.2) f = e < 0.07 ? 1 : e < 0.12 ? 0.3 : e < 0.2 ? 0.9 : Math.exp(-(e - 0.2) * 6) * 0.9;
          SU.flash.value = f * 0.55;
          bolts.forEach((b) => { if (b.visible) { b.material.opacity = f > 0.15 ? Math.min(1, f * 1.2) : 0; if (e > 1.2) b.visible = false; } });
          pl2.intensity = st.pl2Base + f * 5;
          L.hemi.intensity = lerp(0.72, 0.85, sstep(0, 1, st.calm)) * (1 - 0.3 * I) + f * 0.6;
        },
        dispose() { K.dispose(root); },
      };
      return env;
    },
  };

  // ==================================================================
  // TITULO — São Paulo em miniatura ao entardecer
  // ==================================================================
  /** Material de prédio com janelas que acendem (shader: cada janela tem um sorteio). */
  function windowMat(K, lit, o) {
    o = o || {};
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: o.rough == null ? 0.78 : o.rough, metalness: 0.0 });
    const key = 'pai-win-' + (o.key || 'a');
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uLit = lit;
      sh.uniforms.uGlass = { value: col(o.glass || '#1d2440') };
      sh.uniforms.uWarm = { value: col(o.warm || '#ffb85c') };
      sh.uniforms.uRow = { value: o.row || 0 };
      sh.uniforms.uWin = { value: new T.Vector4(o.win ? o.win[0] : 0.2, o.win ? o.win[1] : 0.8, o.win ? o.win[2] : 0.25, o.win ? o.win[3] : 0.8) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aWin;\nvarying vec3 vWin;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWin = aWin;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLit; uniform float uRow; uniform vec3 uGlass; uniform vec3 uWarm; uniform vec4 uWin; varying vec3 vWin;')
        .replace('#include <emissivemap_fragment>', [
          '#include <emissivemap_fragment>',
          'if (vWin.z > 0.0) {',
          '  vec2 cell = floor(vWin.xy); vec2 f = fract(vWin.xy); float sd = floor(vWin.z + 0.5);',
          '  #if __VERSION__ >= 300',
          '  vec2 fw = fwidth(vWin.xy);',
          '  #else',
          '  vec2 fw = vec2(0.03);',
          '  #endif',
          '  vec2 lo = smoothstep(uWin.xz - fw, uWin.xz + fw, f);',
          '  vec2 hi = 1.0 - smoothstep(uWin.yw - fw, uWin.yw + fw, f);',
          '  float avg = (uWin.y - uWin.x) * (uWin.w - uWin.z);',
          '  float tiny = smoothstep(0.22, 0.55, max(fw.x, fw.y));',
          '  float inside = mix(lo.x * hi.x * lo.y * hi.y, avg, tiny);',
          // semente arredondada: a interpolação do atributo varia ~1e-6 e o hash viraria ruído por pixel
          '  vec3 h3 = fract(vec3(cell.x, cell.y, sd) * vec3(0.1031, 0.1030, 0.0973)); h3 += dot(h3, h3.yzx + 33.33);',
          '  float hw = fract((h3.x + h3.y) * h3.z);',
          '  vec3 r3 = fract(vec3(cell.y, sd, sd * 1.7) * vec3(0.1031, 0.1030, 0.0973)); r3 += dot(r3, r3.yzx + 33.33);',
          '  float hr = fract((r3.x + r3.y) * r3.z);',
          '  float hs = mix(hw, hr, uRow);',
          '  float on = mix(step(hs, uLit) * inside, uLit * avg * 0.9, tiny);',
          '  float sky = clamp(f.y, 0.0, 1.0);',
          '  diffuseColor.rgb = mix(diffuseColor.rgb, uGlass * (0.8 + 0.4 * sky), inside);',
          '  float tint = fract(hs * 13.0);',
          '  totalEmissiveRadiance += mix(uWarm, vec3(1.0, 0.86, 0.6), tint * tint * 0.6) * on * (0.8 + 0.7 * tint);',
          '}',
        ].join('\n'));
    };
    m.customProgramCacheKey = () => key;
    return K.mat(m);
  }

  /** Construtor de prédios em uma única malha (posição, normal, cor, aWin). */
  function cityBuilder() {
    const P = [], N = [], Cc = [], W = [];
    const tc = new T.Color();
    function tri(p, n, c, w) { P.push(p[0], p[1], p[2]); N.push(n[0], n[1], n[2]); Cc.push(c.r, c.g, c.b); W.push(w[0], w[1], w[2]); }
    function quad(a, b, c, d, n, color, wa, wb, wc, wd) {
      tc.copy(M.color(color));
      tri(a, n, tc, wa); tri(b, n, tc, wb); tri(c, n, tc, wc);
      tri(a, n, tc, wa); tri(c, n, tc, wc); tri(d, n, tc, wd);
    }
    /** caixa com janelas nas laterais. o: {seed, cell:[w,h], roof, sides:false} */
    function box(cx, y0, cz, w, h, d, color, o) {
      o = o || {};
      const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y0 + h;
      const s = o.seed || 0;
      const cw = o.cell ? o.cell[0] : 0.13, ch = o.cell ? o.cell[1] : 0.15;
      const nu = (len) => (s ? Math.max(1, Math.round(len / cw)) : 0);
      const nv = s ? Math.max(1, Math.round(h / ch)) : 0;
      const face = (a, b, c2, d2, n, len) => { const u = nu(len); quad(a, b, c2, d2, n, color, [0, 0, s], [u, 0, s], [u, nv, s], [0, nv, s]); };
      face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w);
      face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w);
      face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d);
      face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d);
      const z3 = [0, 0, 0];
      quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], o.roof || color, z3, z3, z3, z3);
    }
    function build() {
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(Cc, 3));
      g.setAttribute('aWin', new T.Float32BufferAttribute(W, 3));
      g.computeBoundingSphere();
      return g;
    }
    return { box, quad, build };
  }

  /** Prédio comum: corpo com janelas + cornija + telhado com caixa d'água/ar-condicionado. */
  function addBuilding(B, r, x, z, w, d, h, color, seed, o) {
    o = o || {};
    B.box(x, 0, z, w, h, d, color, { seed, cell: o.cell, roof: o.roof || '#5d5a6e' });
    const corn = M.mix(color, '#2a2638', 0.35);
    B.box(x, h, z, w + 0.04, 0.05, d + 0.04, corn, { roof: o.roof || '#5d5a6e' });
    if (o.top !== false) {
      // caixa d'água + casinha de máquinas + ar-condicionados
      B.box(x + (r() - 0.5) * w * 0.4, h + 0.05, z + (r() - 0.5) * d * 0.4, 0.22, 0.14, 0.18, '#d8d2c4', { roof: '#bdb5a6' });
      B.box(x + (r() - 0.5) * w * 0.5, h + 0.05, z + (r() - 0.5) * d * 0.5, 0.12, 0.1, 0.12, '#4d6a8a', { roof: '#6f8aa8' });
      for (let i = 0; i < 2; i++) B.box(x + (r() - 0.5) * w * 0.7, h + 0.05, z + (r() - 0.5) * d * 0.7, 0.07, 0.04, 0.05, '#a9a6b4');
    }
  }

  P2.envs.titulo = {
    name: 'Título',
    build(params) {
      params = params || {};
      const K = makeKit();
      const root = new T.Group();
      root.name = 'env:titulo';
      const r = M.rng(2024);
      const R = 5.0;
      const lit = { value: 0.22 };
      const st = { t0: null };

      // ---------------- céu de fim de tarde ----------------
      const SUN = [-0.66, 0.02, 0.75]; // pôr do sol à frente-esquerda da câmera inicial: fachadas douradas, fundo azul-lilás
      const sky = makeSky({ cTop: '#121845', cBand: '#5a4a9a', cMid: '#ffa05a', cHor2: '#c4789f', cBot: '#5a4a86', horizonMix: 1, bandH: 0.22, cSun: '#ffc070', sunDir: SUN, sunGlow: 1.1, stars: 0.75, moon: 1, moonDir: [0.5, 0.36, -0.79], nebula: 0.12, cNeb: '#ff9ac0' });
      root.add(sky);
      const SU = sky.userData.U;

      // ---------------- luzes ----------------
      const L = M.lighting('tarde', { area: 6.6 });
      root.add(L.group);
      L.hemi.color.set('#7f8cf0'); L.hemi.groundColor.set('#4a2e48'); L.hemi.intensity = 0.5;
      L.sun.color.set('#ffa25a'); L.sun.intensity = 2.3; L.sun.position.set(-7.0, 3.5, 6.6);
      L.sun.target.position.set(0, 0, 0);
      L.amb.intensity = 0.12;
      L.sun.shadow.camera.far = 30;
      const porch = new T.PointLight('#ffb867', 0.9, 2.6, 2); porch.position.set(-1.85, 0.55, 3.55); root.add(porch);
      const plaza = new T.PointLight('#ffd08a', 0.8, 2.6, 2); plaza.position.set(-0.7, 0.45, 0.25); root.add(plaza);

      // ---------------- base (plinto flutuante) ----------------
      const ground = K.tex(1024, 1024, (ctx, S) => drawCityGround(ctx, S));
      const gmat = K.mat(new T.MeshStandardMaterial({ map: ground, roughness: 0.92 }));
      const gmesh = new T.Mesh(K.geo(new T.CircleGeometry(R, 96)), gmat);
      gmesh.rotation.x = -Math.PI / 2; gmesh.receiveShadow = true; root.add(gmesh);
      const sideTex = K.tex(1024, 128, (ctx, w, h) => {
        ctx.fillStyle = '#7d7888'; ctx.fillRect(0, 0, w, h * 0.12);
        const bands = [['#5a4038', 0.12, 0.38], ['#6a4a3c', 0.38, 0.62], ['#4e362f', 0.62, 0.85], ['#3e2c28', 0.85, 1]];
        bands.forEach((b) => { ctx.fillStyle = b[0]; ctx.fillRect(0, b[1] * h, w, (b[2] - b[1]) * h); });
        const rr = M.rng(5);
        for (let i = 0; i < 160; i++) { ctx.fillStyle = 'rgba(' + (rr() > 0.5 ? '255,235,210' : '20,10,10') + ',' + (0.08 + rr() * 0.12).toFixed(2) + ')'; ctx.beginPath(); ctx.ellipse(rr() * w, (0.2 + rr() * 0.75) * h, 3 + rr() * 9, 2 + rr() * 4, 0, 0, TAU); ctx.fill(); }
        // cano e túnel do metrô (corte)
        ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.66, h * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd38a'; ctx.fillRect(w * 0.3 - 18, h * 0.62, 36, 10);
        ctx.fillStyle = '#4a6a8a'; ctx.fillRect(0, h * 0.27, w, 5);
      }, { repeat: [3, 1] });
      const plinth = new T.Mesh(M.cylGeo(R, R * 0.985, 0.62, 96, true), K.mat(new T.MeshStandardMaterial({ map: sideTex, roughness: 0.9 })));
      plinth.position.y = -0.31; root.add(plinth);
      const brass = M.mat('#d8a85a', { rough: 0.35, metal: 0.75 });
      M.torus(R * 0.99, 0.035, brass, { parent: root, pos: [0, -0.63, 0], rot: [Math.PI / 2, 0, 0], cast: false });
      const baseM = M.mat('#1d1a33', { rough: 0.5, metal: 0.2 });
      M.cyl(R * 1.035, R * 0.9, 0.3, baseM, { parent: root, pos: [0, -0.8, 0], seg: 96, cast: false });
      M.torus(R * 1.03, 0.025, brass, { parent: root, pos: [0, -0.65, 0], rot: [Math.PI / 2, 0, 0], cast: false });
      const under = M.glow('#ffb070', 13, 0.22); under.position.set(0, -1.6, 0); root.add(under);

      // ---------------- prédios (uma malha) ----------------
      const B = cityBuilder();
      const pal = ['#e7d8c4', '#cfc7d6', '#d9b8a0', '#b9c6cf', '#e2cfa6', '#c7b2c4', '#a9b4c2', '#e0c1b0'];
      const bl = [
        [-2.5, -1.4, 1.1, 1.5, 1.9], [-3.75, -1.0, 0.95, 1.15, 1.3], [-2.6, 0.2, 1.0, 0.8, 0.9], [0.8, -1.75, 0.7, 1.0, 1.65],
        [3.0, -1.6, 1.0, 1.05, 2.1], [3.1, -0.1, 1.05, 0.9, 1.35], [4.2, -0.95, 0.7, 1.2, 1.0],
        [-1.9, -3.85, 0.9, 0.8, 1.55], [-0.4, -4.1, 1.0, 0.7, 1.7], [1.0, -4.0, 0.8, 0.8, 1.2], [2.4, -3.7, 0.7, 0.6, 1.75],
        [-3.5, 2.6, 0.8, 0.8, 0.8], [2.8, 3.35, 0.7, 0.6, 1.0], [-3.65, -2.95, 0.6, 0.5, 0.7],
      ];
      bl.forEach((b, i) => addBuilding(B, r, b[0], b[1], b[2], b[3], b[4], pal[i % pal.length], i + 1));
      // lojinhas (sobrados coloridos) com toldo
      const shops = [[2.72, 2.45, '#5fb8a8', '#e8604a'], [3.36, 2.45, '#f2c45a', '#3f7ac0'], [4.0, 2.4, '#e9846a', '#f0f0e8']];
      shops.forEach((s, i) => {
        B.box(s[0], 0, s[1], 0.58, 0.56, 0.55, s[2], { seed: 40 + i, cell: [0.19, 0.28], roof: '#7a6a6a' });
        B.box(s[0], 0.56, s[1], 0.62, 0.04, 0.59, M.hex(M.mix(s[2], '#000000', 0.25)), { roof: '#6a5a5a' });
      });
      const city = new T.Mesh(K.geo(B.build()), windowMat(K, lit, { key: 'city', glass: '#1d2440', row: 0.35, win: [0.24, 0.76, 0.28, 0.78] }));
      city.castShadow = true; city.receiveShadow = true; root.add(city);
      shops.forEach((s, i) => {
        const aw = M.box(0.6, 0.02, 0.16, s[3], { parent: root, pos: [s[0], 0.24, s[1] - 0.34], rot: [0.35, 0, 0] });
        aw.castShadow = true;
        const win = M.plane(0.46, 0.17, M.basic('#ffd48a'), { parent: root, pos: [s[0], 0.1, s[1] - 0.278], rot: [0, Math.PI, 0], cast: false });
        win.userData.shop = i;
      });

      // ---------------- a torre do CEO ----------------
      const TB = cityBuilder();
      const TX = -0.7, TZ = -1.2;
      TB.box(TX, 0, TZ, 1.6, 0.34, 1.6, '#3b3f55', { seed: 90, cell: [0.2, 0.34], roof: '#5a5f78' });
      const TH = 2.5, TT = 0.34 + TH;
      TB.box(TX, 0.34, TZ, 1.22, TH, 1.22, '#a9bad3', { seed: 91, cell: [0.1, 0.15] });
      TB.box(TX, TT, TZ, 1.28, 0.05, 1.28, '#e8eef8', { roof: '#c8d0dc' });
      TB.box(TX, TT + 0.05, TZ, 0.98, 0.42, 0.98, '#a9bad3', { seed: 92, cell: [0.1, 0.14] });
      TB.box(TX, TT + 0.47, TZ, 1.04, 0.04, 1.04, '#e8eef8', { roof: '#c8d0dc' });
      const tower = new T.Mesh(K.geo(TB.build()), windowMat(K, lit, { key: 'tower', glass: '#28467a', warm: '#ffd08a', win: [0.08, 0.92, 0.14, 0.9], rough: 0.4, row: 0.72 }));
      tower.castShadow = true; tower.receiveShadow = true; root.add(tower);
      // andar do CEO (faixa acesa) + coroa de luz
      const ceoM = M.mat('#ffe2a8', { emissive: '#ffc070', emissiveIntensity: 1.25 });
      [[0, 0.615], [0, -0.615]].forEach((p) => M.box(1.12, 0.1, 0.012, ceoM, { parent: root, pos: [TX + p[0], TT - 0.27, TZ + p[1]], cast: false }));
      [[0.615, 0], [-0.615, 0]].forEach((p) => M.box(0.012, 0.1, 1.12, ceoM, { parent: root, pos: [TX + p[0], TT - 0.27, TZ + p[1]], cast: false }));
      // mullions verticais (vidro com montantes)
      const mull = M.mat('#e0e8f4', { rough: 0.5 });
      [-0.3, 0, 0.3].forEach((dx) => {
        M.box(0.018, TH, 0.018, mull, { parent: root, pos: [TX + dx, 0.34 + TH / 2, TZ + 0.615], cast: false });
        M.box(0.018, TH, 0.018, mull, { parent: root, pos: [TX + 0.615, 0.34 + TH / 2, TZ + dx], cast: false });
        M.box(0.018, TH, 0.018, mull, { parent: root, pos: [TX + dx, 0.34 + TH / 2, TZ - 0.615], cast: false });
        M.box(0.018, TH, 0.018, mull, { parent: root, pos: [TX - 0.615, 0.34 + TH / 2, TZ + dx], cast: false });
      });
      // heliponto
      const heliTex = K.tex(256, 256, (ctx) => {
        ctx.fillStyle = '#3a3f4f'; ctx.beginPath(); ctx.arc(128, 128, 126, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(128, 128, 100, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = '900 120px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 128, 136);
      });
      const heli = new T.Mesh(K.geo(new T.CircleGeometry(0.44, 40)), K.mat(new T.MeshStandardMaterial({ map: heliTex, roughness: 0.8 })));
      heli.rotation.x = -Math.PI / 2; heli.position.set(TX, TT + 0.515, TZ); heli.receiveShadow = true; root.add(heli);
      const antenna = M.cyl(0.012, 0.02, 0.7, '#d0d4de', { parent: root, pos: [TX + 0.42, TT + 0.86, TZ - 0.42] });
      antenna.castShadow = true;
      const beacon = M.glow('#ff3344', 0.35, 0.9); beacon.position.set(TX + 0.42, TT + 1.23, TZ - 0.42); root.add(beacon);
      M.torus(0.5, 0.012, M.basic('#ffe0a0'), { parent: root, pos: [TX, TT + 0.52, TZ], rot: [Math.PI / 2, 0, 0], cast: false });

      // ---------------- casa da família (fundos com piscina) ----------------
      const HX = -1.9, HZ = 2.95;
      const house = M.group({ parent: root, pos: [HX, 0, HZ] });
      const wallW = M.mat('#f3ece0', { rough: 0.85 });
      const wood = M.mat('#9a6a46', { rough: 0.7 });
      const roofM = M.mat('#c25a3a', { rough: 0.8 });
      M.box(1.05, 0.3, 0.72, wallW, { parent: house, pos: [0, 0.15, -0.05] });
      M.box(0.7, 0.26, 0.6, wallW, { parent: house, pos: [-0.12, 0.43, -0.1] });
      M.box(1.12, 0.035, 0.8, '#d8d0c4', { parent: house, pos: [0, 0.315, -0.05] });
      const roof = new T.Mesh(M.cylGeo(0.42, 0.42, 0.84, 3), roofM);
      roof.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0)));
      roof.scale.set(1, 1, 0.55); roof.position.set(-0.12, 0.56 + 0.42 * 0.5 * 0.55, -0.1); roof.castShadow = true;
      house.add(roof);
      // janelas acesas (fundos virados para +Z)
      const warmWin = M.mat('#ffe2a0', { emissive: '#ffb35c', emissiveIntensity: 1.5 });
      M.box(0.5, 0.2, 0.01, warmWin, { parent: house, pos: [0.15, 0.13, 0.315], cast: false });
      M.box(0.22, 0.13, 0.01, warmWin, { parent: house, pos: [-0.3, 0.45, 0.2], cast: false });
      M.box(0.18, 0.13, 0.01, warmWin, { parent: house, pos: [0.08, 0.45, 0.2], cast: false });
      M.box(0.012, 0.13, 0.2, warmWin, { parent: house, pos: [0.535, 0.13, -0.1], cast: false });
      M.box(0.012, 0.2, 0.16, wood, { parent: house, pos: [-0.535, 0.1, 0.0], cast: false });
      [0.05, 0.25].forEach((dx) => M.box(0.012, 0.2, 0.012, '#e8e0d0', { parent: house, pos: [dx, 0.13, 0.322], cast: false }));
      const hGlow = M.glow('#ffb35c', 0.9, 0.35); hGlow.position.set(0.15, 0.15, 0.45); house.add(hGlow);
      // piscina, deck, muro, árvore, carro
      const pool = M.rbox(0.62, 0.03, 0.32, 0.03, M.mat('#3fd6e8', { emissive: '#1fb8d8', emissiveIntensity: 0.9, rough: 0.15 }), { parent: house, pos: [0.15, 0.012, 0.62], cast: false });
      pool.receiveShadow = false;
      const poolGlow = M.glow('#5ff0ff', 0.9, 0.35); poolGlow.position.set(0.15, 0.08, 0.62); house.add(poolGlow);
      M.box(0.75, 0.012, 0.12, '#b88a5e', { parent: house, pos: [0.15, 0.006, 0.4], cast: false });
      const muro = M.mat('#e9e2d6', { rough: 0.9 });
      M.box(2.0, 0.12, 0.04, muro, { parent: root, pos: [HX + 0.0, 0.06, 2.3] });
      M.box(2.0, 0.12, 0.04, muro, { parent: root, pos: [HX, 0.06, 3.9] });
      M.box(0.04, 0.12, 1.6, muro, { parent: root, pos: [HX - 1.0, 0.06, 3.1] });
      M.box(0.04, 0.12, 1.6, muro, { parent: root, pos: [HX + 1.0, 0.06, 3.1] });
      const famCar = carMesh(K, '#2f4a7a');
      famCar.position.set(HX + 0.72, 0, 2.62); famCar.rotation.y = Math.PI / 2; root.add(famCar);

      // fonte da praça da torre
      M.cyl(0.32, 0.34, 0.06, '#cfc8bc', { parent: root, pos: [-0.7, 0.03, 0.28] });
      M.cyl(0.27, 0.27, 0.02, M.mat('#6fd8f0', { emissive: '#2fa8d0', emissiveIntensity: 0.6, rough: 0.1 }), { parent: root, pos: [-0.7, 0.06, 0.28], cast: false });
      M.cyl(0.03, 0.05, 0.16, '#cfc8bc', { parent: root, pos: [-0.7, 0.12, 0.28] });
      const spray = M.glow('#cfefff', 0.4, 0.5); spray.position.set(-0.7, 0.24, 0.28); root.add(spray);

      // ---------------- árvores (instanciadas) ----------------
      const trees = [
        [-4.2, 0.8, 0.22, 0], [-3.0, 0.8, 0.2, 0], [0.55, 0.8, 0.2, 0], [2.7, 0.8, 0.2, 0], [3.85, 0.8, 0.21, 0],
        [-4.0, 2.0, 0.22, 0], [-2.85, 2.05, 0.2, 0], [-0.45, 2.05, 0.21, 0], [4.45, 2.05, 0.2, 0],
        [-0.25, 2.75, 0.3, 1], [0.55, 2.55, 0.26, 0], [1.0, 3.25, 0.28, 2], [0.05, 3.7, 0.27, 0], [0.75, 4.15, 0.24, 1], [-0.45, 4.25, 0.22, 0], [1.05, 2.45, 0.2, 0],
        [-2.6, 3.3, 0.36, 0],
        [-1.55, -0.2, 0.15, 0], [0.15, -0.2, 0.15, 0], [-1.55, 0.6, 0.14, 0], [0.15, 0.6, 0.14, 0],
        [-3.0, -3.45, 0.2, 0], [0.3, -3.45, 0.2, 0], [1.9, -3.45, 0.2, 0], [3.6, -2.9, 0.2, 0], [-4.3, -2.2, 0.2, 0],
        [4.0, 3.2, 0.22, 2], [3.4, 0.62, 0.17, 0],
      ];
      const _ao = new T.Color();
      const aoC = (lo) => (x, y) => _ao.setScalar(lo + (1 - lo) * sstep(-1, 0.75, y)); // base da copa mais escura (volume)
      const canopyG = K.geo(mergeParts([
        { g: rockGeo(K, 7, 2, 0.08, 0.95), m: mat4([0, 0, 0]), c: aoC(0.62) },
        { g: rockGeo(K, 8, 2, 0.08, 0.95), m: mat4([0.42, -0.22, 0.12], null, 0.66), c: aoC(0.55) },
        { g: rockGeo(K, 9, 2, 0.08, 0.95), m: mat4([-0.36, -0.18, -0.2], null, 0.7), c: aoC(0.55) },
        { g: rockGeo(K, 10, 2, 0.08, 0.95), m: mat4([0.05, 0.38, -0.05], null, 0.6), c: aoC(0.8) },
      ]));
      const trunkG = M.cylGeo(0.02, 0.03, 1, 6);
      const canopyM = K.mat(new T.MeshStandardMaterial({ roughness: 0.85, vertexColors: true }));
      const trunkM = M.mat('#6a4a3a', { rough: 0.9 });
      const tCan = new T.InstancedMesh(canopyG, canopyM, trees.length);
      const tTr = new T.InstancedMesh(trunkG, trunkM, trees.length);
      tCan.castShadow = tTr.castShadow = true; tCan.receiveShadow = true;
      const greens = ['#4f8a4a', '#3f7a52', '#679a4a', '#5a8f5e'];
      trees.forEach((t, i) => {
        const s = t[2];
        tTr.setMatrixAt(i, mat4([t[0], s * 0.75, t[1]], null, [1, s * 1.5, 1]));
        tCan.setMatrixAt(i, mat4([t[0], s * 1.55, t[1]], [(r() - 0.5) * 0.3, r() * TAU, (r() - 0.5) * 0.3], [s * 0.86, s * 0.8, s * 0.86]));
        tCan.setColorAt(i, M.color(t[3] === 1 ? '#c86ad4' : t[3] === 2 ? '#f4c430' : greens[i % greens.length]));
      });
      root.add(tCan, tTr);

      // ---------------- postes (instanciados) + brilhos ----------------
      const lamps = [
        [-3.6, 0.78], [-1.2, 0.78], [1.05, 0.78], [3.2, 0.78], [-3.4, 2.02], [-1.0, 2.02], [0.95, 2.02], [3.3, 2.02],
        [1.3, -1.8], [1.3, -0.4], [2.3, -1.2], [2.3, 0.3], [1.3, 3.0], [2.3, 3.6], [1.3, 4.3],
        [0.1, 3.0], [0.6, 3.75], [-2.0, -3.35], [0.0, -2.6], [2.6, -2.6],
      ];
      const poleI = new T.InstancedMesh(M.cylGeo(0.008, 0.012, 1, 6), M.mat('#3a3a48', { rough: 0.6, metal: 0.4 }), lamps.length);
      const headI = new T.InstancedMesh(M.sphereGeo(0.03, 10, 8), M.mat('#fff0c8', { emissive: '#ffcf7a', emissiveIntensity: 1.6 }), lamps.length);
      poleI.castShadow = true;
      lamps.forEach((l, i) => { poleI.setMatrixAt(i, mat4([l[0], 0.17, l[1]], null, [1, 0.34, 1])); headI.setMatrixAt(i, mat4([l[0], 0.35, l[1]], null, [1, 0.8, 1])); });
      root.add(poleI, headI);
      const dtex = dotTex(K);
      const lampGlow = glowPoints(K, lamps.length, 0.75, { tex: dtex, vertexColors: true, opacity: 0.85 });
      lamps.forEach((l, i) => lampGlow.geometry.attributes.position.setXYZ(i, l[0], 0.36, l[1]));
      root.add(lampGlow);
      const lampOn = lamps.map((l, i) => 2.5 + i * 0.55 + hash(i) * 1.5);

      // ---------------- carros (instanciados, andando) ----------------
      const carG = carGeo(K);
      const lanes = [
        { ax: 'x', c: 1.17, dir: 1 }, { ax: 'x', c: 1.17, dir: 1 }, { ax: 'x', c: 1.63, dir: -1 }, { ax: 'x', c: 1.63, dir: -1 }, { ax: 'x', c: 1.17, dir: 1 },
        { ax: 'z', c: 1.63, dir: -1 }, { ax: 'z', c: 1.97, dir: 1 }, { ax: 'z', c: 1.97, dir: 1 },
        { ax: 'x', c: -2.86, dir: 1 }, { ax: 'x', c: -3.1, dir: -1 },
      ];
      const carCols = ['#f4f4f0', '#c9ced8', '#d8343a', '#2a2a32', '#f2c230', '#3a6ab0', '#f4f4f0', '#8a2a4a', '#4a8a6a', '#e8e8ea'];
      const cars = new T.InstancedMesh(carG, K.vc({ rough: 0.35, metal: 0.2 }), lanes.length);
      cars.castShadow = true;
      lanes.forEach((ln, i) => { cars.setColorAt(i, M.color(carCols[i])); ln.sp = 0.32 + hash(i * 3.1) * 0.22; ln.ph = hash(i * 7.7) * 20; ln.chord = Math.sqrt(R * R - ln.c * ln.c) - 0.25; });
      root.add(cars);
      const carLights = glowPoints(K, lanes.length * 2, 0.32, { tex: dtex, vertexColors: true, opacity: 0.95 });
      root.add(carLights);
      const clc = carLights.geometry.attributes.color;
      lanes.forEach((ln, i) => { clc.setXYZ(i * 2, 1, 0.92, 0.7); clc.setXYZ(i * 2 + 1, 1, 0.12, 0.1); });
      const _cm = new T.Matrix4(), _cq = new T.Quaternion(), _cv = new T.Vector3(), _cs = new T.Vector3(1, 1, 1), _cz = new T.Vector3(0.0001, 0.0001, 0.0001);
      function updCars(t) {
        const clp = carLights.geometry.attributes.position;
        lanes.forEach((ln, i) => {
          const Lh = ln.chord * 2 + 3;
          let s = ((ln.ph + t * ln.sp) % Lh) - ln.chord;
          s *= ln.dir;
          const vis = Math.abs(s) < ln.chord;
          const yaw = ln.ax === 'x' ? (ln.dir > 0 ? 0 : Math.PI) : (ln.dir > 0 ? -Math.PI / 2 : Math.PI / 2);
          const x = ln.ax === 'x' ? s : ln.c, z = ln.ax === 'x' ? ln.c : s;
          _cq.setFromAxisAngle(_up, yaw);
          _cm.compose(_cv.set(x, 0, z), _cq, vis ? _cs : _cz);
          cars.setMatrixAt(i, _cm);
          const fx = ln.ax === 'x' ? ln.dir : 0, fz = ln.ax === 'z' ? ln.dir : 0;
          if (vis) { clp.setXYZ(i * 2, x + fx * 0.13, 0.05, z + fz * 0.13); clp.setXYZ(i * 2 + 1, x - fx * 0.13, 0.05, z - fz * 0.13); }
          else { clp.setXYZ(i * 2, 0, -50, 0); clp.setXYZ(i * 2 + 1, 0, -50, 0); }
        });
        cars.instanceMatrix.needsUpdate = true;
        clp.needsUpdate = true;
      }
      updCars(0);

      // ---------------- avião lento ----------------
      const plane = M.group({ parent: root });
      const pBody = M.mat('#f2f2f6', { rough: 0.5 });
      M.capsule(0.05, 0.42, pBody, { parent: plane, rot: [0, 0, Math.PI / 2], cast: false });
      M.box(0.12, 0.01, 0.62, pBody, { parent: plane, pos: [0.0, -0.01, 0], cast: false });
      M.box(0.08, 0.008, 0.22, pBody, { parent: plane, pos: [-0.24, 0.02, 0], cast: false });
      M.box(0.08, 0.1, 0.008, '#d84a4a', { parent: plane, pos: [-0.25, 0.07, 0], cast: false });
      const navR = M.glow('#ff3a3a', 0.28, 0.9); navR.position.set(0, 0, -0.31); plane.add(navR);
      const navG = M.glow('#3aff7a', 0.28, 0.9); navG.position.set(0, 0, 0.31); plane.add(navG);
      const strobe = M.glow('#ffffff', 0.4, 0.0); strobe.position.set(-0.28, 0.1, 0); plane.add(strobe);

      // ---------------- nuvens ----------------
      const puff = puffTex(K);
      const clouds = new T.Group(); root.add(clouds);
      const sunAz = Math.atan2(SUN[2], SUN[0]);
      for (let i = 0; i < 13; i++) {
        const a = (i / 13) * TAU + r() * 0.35, rad = 9.5 + r() * 6;
        const low = i % 3 === 0;
        const near = Math.cos(a - sunAz) * 0.5 + 0.5;
        const c = M.mix('#9f8ac8', '#ffb48a', near * near);
        const s = cloudSprite(puff, c, 5 + r() * 5, 2.4 + r() * 1.6, 0.92);
        s.position.set(Math.cos(a) * rad, low ? -2.2 - r() * 1.5 : 0.6 + r() * 3.2, Math.sin(a) * rad);
        clouds.add(s);
      }

      // mar de nuvens ao pôr do sol (tingido: quente do lado do sol, lilás do outro)
      const seaTex = K.tex(1024, 1024, (ctx, w) => {
        const rr = M.rng(23), c = w / 2;
        const sx = SUN[0], sz = SUN[2], sl = Math.hypot(sx, sz);
        for (let i = 0; i < 420; i++) {
          const a = rr() * TAU, d = Math.sqrt(rr()) * 0.48 * w;
          const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
          const sun = Math.max(0, (Math.cos(a) * sx + Math.sin(a) * sz) / sl) * (d / (0.48 * w));
          const cc = M.mix('#b7a2d8', '#ffc08a', Math.min(1, sun * 1.4));
          const s2 = 14 + rr() * 46 * (1 - d / (0.5 * w)) + 12;
          const g = ctx.createRadialGradient(x, y, 0, x, y, s2);
          const rgb = Math.round(cc.r * 255) + ',' + Math.round(cc.g * 255) + ',' + Math.round(cc.b * 255);
          g.addColorStop(0, 'rgba(' + rgb + ',0.55)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s2, 0, TAU); ctx.fill();
        }
      });
      seaTex.encoding = T.LinearEncoding;
      const seaM = K.mat(new T.MeshBasicMaterial({ map: seaTex, transparent: true, opacity: 0.95, depthWrite: false, fog: true }));
      [[-5.5, 90, 0], [-8, 120, 0.8]].forEach((d) => { const m = new T.Mesh(M.planeGeo(d[1], d[1]), seaM); m.rotation.x = -Math.PI / 2; m.rotation.z = d[2]; m.position.y = d[0]; root.add(m); });

      // ---------------- contrato ----------------
      const env = {
        root,
        spots: {
          faisca: { x: 1.0, z: 3.9, rot: 0.3, y: 1.1 },
          centro: { x: 0, z: 1.4, rot: 0 },
          inicio: { x: 0, z: 1.4, rot: Math.PI },   // (tela de título: não se anda aqui — só por contrato)
        },
        colliders: [{ x: -0.7, z: -1.2, w: 1.7, d: 1.7 }],
        bounds: { minX: -3.4, maxX: 3.4, minZ: -3.4, maxZ: 3.4 },
        shots: {
          geral: { target: [0, 2.3, 0.8], yaw: 0.35, pitch: 0.6, dist: 15.5, fov: 34 },
          torre: { target: [-0.7, 2.7, -1.2], yaw: 0.55, pitch: 0.12, dist: 4.6, fov: 36 },
          casa: { target: [-1.8, 0.25, 3.1], yaw: 0.3, pitch: 0.34, dist: 3.4, fov: 36 },
          praca: { target: [0.35, 0.3, 3.2], yaw: -0.45, pitch: 0.3, dist: 3.4, fov: 36 },
          ceu: { target: [-0.7, 2.9, -1.2], yaw: 0.25, pitch: -0.1, dist: 5.6, fov: 50 },
        },
        defaultShot: 'geral',
        walls: [],
        background: '#1a1f45',
        fog: { color: '#6a4a7a', near: 26, far: 80 },
        setParams() {},
        update(t, p, dt) {
          if (st.t0 == null) st.t0 = t;
          const lt = t - st.t0;
          SU.time.value = lt;
          lit.value = 0.2 + 0.36 * sstep(0, 30, lt) + 0.02 * Math.sin(lt * 0.21);
          const lc = lampGlow.geometry.attributes.color;
          let changed = false;
          lampOn.forEach((on, i) => {
            const k = sstep(on, on + 0.6, lt) * (0.9 + 0.1 * Math.sin(lt * 7 + i));
            if (Math.abs(lc.getX(i) - k) > 0.004) { lc.setXYZ(i, k, k * 0.82, k * 0.55); changed = true; }
          });
          if (changed) lc.needsUpdate = true;
          updCars(lt);
          const pa = lt * 0.075 + 2.2;
          plane.position.set(Math.cos(pa) * 12.5, 5.4 + Math.sin(lt * 0.1) * 0.25, Math.sin(pa) * 12.5);
          plane.rotation.set(0, -pa - Math.PI, 0.12);
          strobe.material.opacity = (lt % 1.4) < 0.08 ? 1 : 0;
          beacon.material.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(lt * 2.4));
          clouds.rotation.y = lt * 0.01;
          spray.scale.setScalar(0.36 + 0.05 * Math.sin(lt * 5));
        },
        dispose() { K.dispose(root); },
      };
      return env;
    },
  };

  /** Geometria de carrinho (corpo + cabine + rodas) com cor por vértice (tingida por instância). */
  function carGeo(K) {
    const parts = [
      { g: M.roundedBoxGeo(0.24, 0.06, 0.11, 0.025), m: mat4([0, 0.045, 0]), c: '#ffffff' },
      { g: M.roundedBoxGeo(0.13, 0.05, 0.1, 0.02), m: mat4([-0.015, 0.09, 0]), c: '#ffffff' },
      { g: M.boxGeo(0.06, 0.035, 0.102), m: mat4([0.035, 0.09, 0]), c: '#2a3550' },
      { g: M.boxGeo(0.045, 0.035, 0.102), m: mat4([-0.065, 0.09, 0]), c: '#2a3550' },
    ];
    [[0.075, 0.05], [-0.075, 0.05], [0.075, -0.05], [-0.075, -0.05]].forEach((w) => parts.push({ g: M.cylGeo(0.022, 0.022, 0.02, 10), m: mat4([w[0], 0.022, w[1]], [Math.PI / 2, 0, 0]), c: '#141418' }));
    return K.geo(mergeParts(parts));
  }
  function carMesh(K, color) {
    const m = new T.Mesh(carGeo(K), K.vc({ rough: 0.35, metal: 0.2 }));
    m.castShadow = true;
    const c = m.geometry.attributes.color, tint = M.color(color);
    for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
    return m;
  }

  /** Pinta o chão da maquete: calçadas, ruas, faixas, praça com pedra portuguesa, parque, quintal. */
  function drawCityGround(ctx, S) {
    const k = S / 10;
    const X = (x) => (x + 5) * k, Z = (z) => (z + 5) * k;
    const rect = (x0, z0, x1, z1, c) => { ctx.fillStyle = c; ctx.fillRect(X(x0), Z(z0), (x1 - x0) * k, (z1 - z0) * k); };
    const rr = M.rng(31);
    // calçada base
    rect(-5, -5, 5, 5, '#a29eaa');
    ctx.strokeStyle = 'rgba(40,30,60,0.08)'; ctx.lineWidth = 1;
    for (let v = -5; v <= 5; v += 0.12) { ctx.beginPath(); ctx.moveTo(X(v), 0); ctx.lineTo(X(v), S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, Z(v)); ctx.lineTo(S, Z(v)); ctx.stroke(); }
    // lotes (um pouco mais escuros)
    [[-5, -2.48, 1.23, 0.73], [2.37, -2.48, 5, 0.73], [-5, 2.07, 1.23, 5], [2.37, 2.07, 5, 5], [-5, -5, 1.23, -3.47], [2.37, -5, 5, -3.47]].forEach((b) => rect(b[0], b[1], b[2], b[3], '#8f8a98'));
    // ruas
    const asph = '#3b3e50';
    rect(-5, 0.95, 5, 1.85, asph);
    rect(1.45, -5, 2.15, 5, asph);
    rect(-5, -3.25, 5, -2.7, asph);
    // meio-fio claro
    ctx.fillStyle = '#c9c4cf';
    [[0.93, 0.95], [1.85, 1.87], [-3.27, -3.25], [-2.7, -2.68]].forEach((zz) => ctx.fillRect(0, Z(zz[0]), S, (zz[1] - zz[0]) * k));
    [[1.43, 1.45], [2.15, 2.17]].forEach((xx) => ctx.fillRect(X(xx[0]), 0, (xx[1] - xx[0]) * k, S));
    // faixas: amarela dupla na avenida, tracejadas brancas
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(0, Z(1.385), S, 0.012 * k); ctx.fillRect(0, Z(1.405), S, 0.012 * k);
    ctx.fillStyle = 'rgba(240,240,235,0.85)';
    for (let x = -5; x < 5; x += 0.36) { if (x > 1.3 && x < 2.3) continue; ctx.fillRect(X(x), Z(1.168), 0.18 * k, 0.014 * k); ctx.fillRect(X(x), Z(1.628), 0.18 * k, 0.014 * k); }
    for (let z = -5; z < 5; z += 0.36) { if ((z > 0.8 && z < 2.0) || (z > -3.4 && z < -2.6)) continue; ctx.fillRect(X(1.795), Z(z), 0.014 * k, 0.18 * k); }
    // faixas de pedestre
    const zebra = (x0, z0, w, h, horiz) => { ctx.fillStyle = 'rgba(245,245,240,0.9)'; for (let i = 0; i < 7; i++) { if (horiz) ctx.fillRect(X(x0 + i * w / 7), Z(z0), (w / 14) * k, h * k); else ctx.fillRect(X(x0), Z(z0 + i * h / 7), w * k, (h / 14) * k); } };
    zebra(1.48, 0.62, 0.64, 0.25, true); zebra(1.48, 1.9, 0.64, 0.25, true);
    zebra(1.12, 0.98, 0.25, 0.84, false); zebra(2.2, 0.98, 0.25, 0.84, false);
    zebra(1.12, -3.22, 0.25, 0.5, false); zebra(2.2, -3.22, 0.25, 0.5, false);
    // praça da torre: pedra portuguesa (ondas preto e branco)
    rect(-1.65, -0.38, 0.25, 0.73, '#f0ece4');
    ctx.save(); ctx.beginPath(); ctx.rect(X(-1.65), Z(-0.38), 1.9 * k, 1.11 * k); ctx.clip();
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 0.05 * k;
    for (let zz = -0.6; zz < 0.9; zz += 0.16) { ctx.beginPath(); for (let x = -1.7; x <= 0.3; x += 0.02) { const y = zz + Math.sin(x * 9) * 0.045; if (x === -1.7) ctx.moveTo(X(x), Z(y)); else ctx.lineTo(X(x), Z(y)); } ctx.stroke(); }
    ctx.restore();
    // canteiros ao redor da torre
    rect(-1.55, -2.1, -1.48, -0.38, '#4f7a4a'); rect(0.08, -2.1, 0.15, -0.38, '#4f7a4a');
    // parque (praça) com caminhos
    ctx.fillStyle = '#4f8248';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X(-0.72), Z(2.28), 1.95 * k, 2.45 * k, 0.25 * k) : ctx.rect(X(-0.72), Z(2.28), 1.95 * k, 2.45 * k); ctx.fill();
    for (let i = 0; i < 260; i++) { ctx.fillStyle = 'rgba(' + (rr() > 0.5 ? '120,170,90' : '40,90,50') + ',0.35)'; ctx.fillRect(X(-0.7 + rr() * 1.9), Z(2.3 + rr() * 2.4), 3, 3); }
    ctx.strokeStyle = '#d6c29a'; ctx.lineWidth = 0.12 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(X(-0.7), Z(2.4)); ctx.bezierCurveTo(X(0.0), Z(3.0), X(0.6), Z(2.6), X(1.2), Z(3.5)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(0.3), Z(2.3)); ctx.bezierCurveTo(X(0.2), Z(3.2), X(0.5), Z(3.8), X(0.25), Z(4.7)); ctx.stroke();
    ctx.fillStyle = '#d6c29a'; ctx.beginPath(); ctx.arc(X(0.33), Z(3.25), 0.26 * k, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a9ac8'; ctx.beginPath(); ctx.ellipse(X(-0.25), Z(4.05), 0.32 * k, 0.2 * k, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(X(-0.3), Z(4.0), 0.12 * k, 0.05 * k, 0.3, 0, TAU); ctx.fill();
    // quintal da casa: grama, piscina (deck), entrada
    rect(-2.9, 2.32, -0.9, 3.88, '#5a8a4e');
    for (let i = 0; i < 160; i++) { ctx.fillStyle = 'rgba(' + (rr() > 0.5 ? '130,180,100' : '50,100,60') + ',0.3)'; ctx.fillRect(X(-2.9 + rr() * 2), Z(2.32 + rr() * 1.56), 3, 3); }
    rect(-1.35, 2.32, -1.0, 2.9, '#b0a9a0');
    rect(-2.0, 3.48, -1.3, 3.74, '#c7a27a');
    // borda do círculo um pouco mais escura
    const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.44, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,30,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }

  // ==================================================================
  // AULA — sala de aula imaginada (noite, aconchegante)
  // ==================================================================
  function drawChalk(ctx, w, h, lines, tema) {
    // lousa verde com manchas de apagador
    ctx.fillStyle = '#2c4a3e'; ctx.fillRect(0, 0, w, h);
    const rr = M.rng(17);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = 'rgba(220,235,225,' + (0.015 + rr() * 0.035).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(rr() * w, rr() * h, 60 + rr() * 160, 18 + rr() * 40, (rr() - 0.5) * 0.6, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 900; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (rr() * 0.05).toFixed(3) + ')'; ctx.fillRect(rr() * w, rr() * h, 2, 2); }
    // texto a giz (em canvas separado para "granular")
    const tc = document.createElement('canvas'); tc.width = w; tc.height = h;
    const t = tc.getContext('2d');
    const L = (lines || []).slice(0, 4).map(String);
    const font = '"Patrick Hand", "Comic Sans MS", "Segoe Print", "Chalkboard SE", "Bradley Hand", cursive';
    t.fillStyle = '#f4f1e6'; t.strokeStyle = '#f4f1e6'; t.textAlign = 'center'; t.textBaseline = 'middle';
    if (L.length) {
      let size = Math.min(78, Math.floor((h * 0.78) / Math.max(1, L.length) / 1.25));
      const area = { x: w * 0.5, y0: h * 0.1, y1: h * 0.9 };
      const lh = size * 1.25;
      const total = L.length * lh;
      L.forEach((ln, i) => {
        let sz = i === 0 && L.length > 1 ? Math.round(size * 1.12) : size;
        t.font = '700 ' + sz + 'px ' + font;
        while (t.measureText(ln).width > w * 0.86 && sz > 20) { sz -= 2; t.font = '700 ' + sz + 'px ' + font; }
        const y = area.y0 + (area.y1 - area.y0) / 2 - total / 2 + lh * (i + 0.5);
        t.save(); t.translate(area.x, y); t.rotate((rr() - 0.5) * 0.02);
        t.fillText(ln, 0, 0);
        if (i === 0 && L.length > 1) { const tw = t.measureText(ln).width; t.lineWidth = 4; t.beginPath(); t.moveTo(-tw / 2, sz * 0.62); t.quadraticCurveTo(0, sz * 0.72, tw / 2, sz * 0.58); t.stroke(); }
        t.restore();
      });
    }
    // rabiscos do tema
    t.lineWidth = 4; t.lineCap = 'round';
    if (tema === 'violao') {
      // diagrama de acorde (C)
      const x0 = w * 0.86, y0 = h * 0.62, cw = 16, fh = 22;
      t.lineWidth = 3;
      for (let i = 0; i < 6; i++) { t.beginPath(); t.moveTo(x0 + i * cw, y0); t.lineTo(x0 + i * cw, y0 + fh * 4); t.stroke(); }
      for (let j = 0; j <= 4; j++) { t.beginPath(); t.moveTo(x0, y0 + j * fh); t.lineTo(x0 + cw * 5, y0 + j * fh); t.stroke(); }
      [[1, 1], [2, 3], [4, 2]].forEach((d) => { t.beginPath(); t.arc(x0 + (5 - d[1]) * cw, y0 + (d[0] - 0.5) * fh, 6, 0, TAU); t.fill(); });
      t.font = '700 34px ' + font; t.fillText('C', x0 + cw * 2.5, y0 - 22);
      // notas musicais
      [[0.08, 0.2], [0.13, 0.32]].forEach((p) => { const x = w * p[0], y = h * p[1]; t.beginPath(); t.ellipse(x, y, 11, 8, -0.4, 0, TAU); t.fill(); t.beginPath(); t.moveTo(x + 10, y); t.lineTo(x + 10, y - 44); t.quadraticCurveTo(x + 28, y - 34, x + 26, y - 20); t.stroke(); });
    } else if (tema === 'ingles') {
      t.font = '700 46px ' + font; t.fillText('A b C', w * 0.11, h * 0.16);
      t.lineWidth = 3; t.beginPath(); t.ellipse(w * 0.88, h * 0.78, 64, 34, 0, 0, TAU); t.stroke();
      t.beginPath(); t.moveTo(w * 0.85, h * 0.85); t.lineTo(w * 0.83, h * 0.95); t.lineTo(w * 0.88, h * 0.86); t.stroke();
      t.font = '700 36px ' + font; t.fillText('Hi!', w * 0.88, h * 0.78);
    } else if (tema === 'negocios') {
      const x0 = w * 0.83, y0 = h * 0.9;
      t.lineWidth = 3; t.beginPath(); t.moveTo(x0, y0 - 120); t.lineTo(x0, y0); t.lineTo(x0 + 140, y0); t.stroke();
      [40, 62, 54, 92].forEach((bh, i) => t.strokeRect(x0 + 14 + i * 30, y0 - bh, 18, bh));
      t.beginPath(); t.moveTo(x0 + 10, y0 - 50); t.lineTo(x0 + 120, y0 - 112); t.stroke();
      t.beginPath(); t.moveTo(x0 + 120, y0 - 112); t.lineTo(x0 + 100, y0 - 110); t.moveTo(x0 + 120, y0 - 112); t.lineTo(x0 + 112, y0 - 94); t.stroke();
    }
    // estrelinha + sublinhado decorativo
    t.lineWidth = 3;
    const sx = w * 0.06, sy = h * 0.82;
    t.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (TAU * 2 / 5); const x = sx + Math.cos(a) * 18, y = sy + Math.sin(a) * 18; if (i) t.lineTo(x, y); else t.moveTo(x, y); } t.closePath(); t.stroke();
    // granulado do giz
    t.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 9000; i++) { t.fillStyle = 'rgba(0,0,0,' + (0.25 + rr() * 0.6).toFixed(2) + ')'; t.fillRect(rr() * w, rr() * h, 1 + rr() * 2, 1 + rr() * 1.5); }
    t.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.95; ctx.drawImage(tc, 0, 0); ctx.globalAlpha = 0.25; ctx.filter = 'blur(2px)'; ctx.drawImage(tc, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1;
  }

  P2.envs.aula = {
    name: 'Aula Imaginada',
    build(params) {
      params = params || {};
      const K = makeKit();
      const root = new T.Group();
      root.name = 'env:aula';
      const r = M.rng(55);
      const W = 3.0, D = 2.5, H = 2.9;
      const st = { t0: null, linesKey: null, tema: null };

      // céu noturno lá fora (sem teto)
      const sky = makeSky({ cTop: '#070a1f', cBand: '#141a44', cMid: '#2a2a5e', cBot: '#0b0c1c', stars: 1, nebula: 0.35, cNeb: '#3a3a9a', moon: 1, moonDir: [-0.7, 0.55, -0.3] });
      root.add(sky);
      const SU = sky.userData.U;

      // luzes: "lanternas" quentes por cima + lua fria
      const L = M.lighting('noite', { area: 5 });
      root.add(L.group);
      L.hemi.color.set('#ffd9b0'); L.hemi.groundColor.set('#3a2a30'); L.hemi.intensity = 0.5;
      L.sun.color.set('#ffd6a8'); L.sun.intensity = 0.9; L.sun.position.set(2.2, 8, 4.5); L.sun.target.position.set(0, 0, -0.3);
      L.amb.intensity = 0.12;
      const lanternL = new T.PointLight('#ffbe78', 1.9, 9, 2); lanternL.position.set(0.0, 2.45, 0.4); root.add(lanternL);
      const deskL = new T.PointLight('#ffcf8a', 0.9, 3.2, 2); deskL.position.set(-1.45, 1.15, -1.05); root.add(deskL);

      // ---------------- piso + base ----------------
      const plank = K.tex(1024, 512, (ctx, w, h) => {
        const rows = 8;
        for (let i = 0; i < rows; i++) {
          let x = -r() * 300;
          while (x < w) {
            const len = 260 + r() * 260;
            const c = M.mix('#9a6440', '#c08454', r());
            ctx.fillStyle = '#' + c.getHexString(); ctx.fillRect(x, i * (h / rows), len, h / rows);
            ctx.strokeStyle = 'rgba(60,30,15,0.18)'; ctx.lineWidth = 1.5;
            for (let g = 0; g < 4; g++) { const y = i * (h / rows) + 6 + r() * (h / rows - 12); ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + len * 0.3, y + 3, x + len * 0.6, y - 3, x + len, y); ctx.stroke(); }
            ctx.fillStyle = 'rgba(40,20,10,0.55)'; ctx.fillRect(x, i * (h / rows), 3, h / rows);
            x += len;
          }
          ctx.fillStyle = 'rgba(40,20,10,0.5)'; ctx.fillRect(0, i * (h / rows), w, 3);
        }
      }, { repeat: [2, 2] });
      const floor = M.box(2 * W + 0.3, 0.12, 2 * D + 0.3, K.mat(new T.MeshStandardMaterial({ map: plank, roughness: 0.75 })), { parent: root, pos: [0, -0.06, 0], cast: false });
      floor.receiveShadow = true;
      M.rbox(2 * W + 0.55, 0.32, 2 * D + 0.55, 0.06, '#3a2a2a', { parent: root, pos: [0, -0.28, 0], cast: false });
      M.rbox(2 * W + 0.7, 0.08, 2 * D + 0.7, 0.03, '#c9a46a', { parent: root, pos: [0, -0.46, 0], cast: false });

      // tapete
      const rugTex = K.tex(512, 384, (ctx, w, h) => {
        ctx.fillStyle = '#b5523b'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#f0d6a0'; ctx.lineWidth = 10; ctx.strokeRect(22, 22, w - 44, h - 44);
        ctx.strokeStyle = '#3a5a6a'; ctx.lineWidth = 6; ctx.strokeRect(44, 44, w - 88, h - 88);
        ctx.fillStyle = '#f0d6a0';
        for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x = 90 + i * 66, y = 90 + j * 66; ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 18, y); ctx.lineTo(x, y + 18); ctx.lineTo(x - 18, y); ctx.closePath(); ctx.fill(); }
      });
      const rug = M.plane(2.6, 1.95, K.mat(new T.MeshStandardMaterial({ map: rugTex, roughness: 0.95 })), { parent: root, pos: [0.1, 0.006, 0.95], rot: [-Math.PI / 2, 0, 0], cast: false });
      rug.receiveShadow = true;

      // ---------------- paredes ----------------
      const walls = [];
      const paintM = M.mat('#efe0c4', { rough: 0.92 });
      const woodP = K.tex(512, 128, (ctx, w, h) => {
        ctx.fillStyle = '#7a4a30'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = '#8a5838'; ctx.fillRect(i * 128 + 12, 14, 104, h - 28); ctx.strokeStyle = 'rgba(30,15,5,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(i * 128 + 12, 14, 104, h - 28); }
      }, { repeat: [3, 1] });
      const wainM = K.mat(new T.MeshStandardMaterial({ map: woodP, roughness: 0.7 }));
      const trimM = M.mat('#5e3622', { rough: 0.65 });
      function wall(name, len, pos, rotY, normal, holes) {
        const g = M.group({ parent: root, pos, rot: [0, rotY, 0], name });
        M.box(len, H, 0.12, paintM, { parent: g, pos: [0, H / 2, -0.06] });
        M.box(len, 0.95, 0.025, wainM, { parent: g, pos: [0, 0.475, 0.012] });
        M.box(len, 0.06, 0.05, trimM, { parent: g, pos: [0, 0.96, 0.02] });
        M.box(len, 0.1, 0.035, trimM, { parent: g, pos: [0, 0.05, 0.02] });
        M.box(len + 0.02, 0.08, 0.16, '#6a4030', { parent: g, pos: [0, H + 0.04, -0.06] });
        M.shadows(g, false, true);
        walls.push({ obj: g, px: pos[0], pz: pos[2], normal });
        return g;
      }
      const back = wall('parede_fundo', 2 * W + 0.24, [0, 0, -D], 0, [0, 0, 1]);
      const left = wall('parede_esq', 2 * D, [-W, 0, 0], Math.PI / 2, [1, 0, 0]);
      const right = wall('parede_dir', 2 * D, [W, 0, 0], -Math.PI / 2, [-1, 0, 0]);
      const front = wall('parede_frente', 2 * W + 0.24, [0, 0, D], Math.PI, [0, 0, -1]);

      // teto de gesso com vigas de madeira e uma claraboia (as estrelas aparecem lá em cima)
      const ceil = M.group({ parent: root, name: 'teto' });
      const ceilM = M.mat('#f3e6cc', { rough: 0.95 });
      const beamM = M.mat('#6a4030', { rough: 0.7 });
      const CY = H + 0.05, SKX = 1.0, SKZ0 = -0.55, SKZ1 = 0.95;
      const slab = (x0, x1, z0, z1) => M.box(x1 - x0, 0.1, z1 - z0, ceilM, { parent: ceil, pos: [(x0 + x1) / 2, CY, (z0 + z1) / 2] });
      slab(-W - 0.12, -SKX, -D - 0.12, D + 0.12); slab(SKX, W + 0.12, -D - 0.12, D + 0.12);
      slab(-SKX, SKX, -D - 0.12, SKZ0); slab(-SKX, SKX, SKZ1, D + 0.12);
      [-2.0, -SKX - 0.07, SKX + 0.07, 2.0].forEach((x) => M.box(0.14, 0.16, 2 * D, beamM, { parent: ceil, pos: [x, H - 0.08, 0] }));
      [SKZ0 - 0.07, SKZ1 + 0.07].forEach((z) => M.box(2 * SKX, 0.16, 0.14, beamM, { parent: ceil, pos: [0, H - 0.08, z] }));
      [-1.75, 1.75].forEach((z) => M.box(2 * W, 0.12, 0.12, beamM, { parent: ceil, pos: [0, H - 0.06, z] }));
      // caixilho da claraboia + vidro
      [-SKX / 3, SKX / 3].forEach((x) => M.box(0.04, 0.05, SKZ1 - SKZ0, beamM, { parent: ceil, pos: [x, CY + 0.02, (SKZ0 + SKZ1) / 2] }));
      M.box(2 * SKX, 0.05, 0.04, beamM, { parent: ceil, pos: [0, CY + 0.02, (SKZ0 + SKZ1) / 2] });
      const skyGlass = M.box(2 * SKX, 0.01, SKZ1 - SKZ0, M.glass('#9fb0ff', 0.1), { parent: ceil, pos: [0, CY + 0.03, (SKZ0 + SKZ1) / 2], cast: false });
      skyGlass.renderOrder = 3;
      // spots embutidos (luz quente)
      const downM = M.mat('#fff4dc', { emissive: '#ffd59a', emissiveIntensity: 1.4 });
      [[-2.5, -1.2], [-2.5, 1.2], [2.5, -1.2], [2.5, 1.2], [0, -1.75], [0, 1.75]].forEach((p) => {
        M.cyl(0.07, 0.07, 0.012, '#d8c8a8', { parent: ceil, pos: [p[0], H - 0.004, p[1]], cast: false });
        M.cyl(0.05, 0.05, 0.014, downM, { parent: ceil, pos: [p[0], H - 0.008, p[1]], cast: false });
      });
      M.shadows(ceil, false, false); // o "sol" de preenchimento continua entrando (o teto não faz sombra)
      walls.push({ obj: ceil, px: 0, py: H, pz: 0, normal: [0, -1, 0] });

      // lousa
      const BX = -0.2;
      M.rbox(3.34, 1.56, 0.07, 0.03, '#6b4428', { parent: back, pos: [BX, 1.62, 0.035] });
      const boardTex = K.tex(1024, 456, () => {});
      const boardM = K.mat(new T.MeshStandardMaterial({ map: boardTex, roughness: 0.95, emissive: col('#ffffff'), emissiveMap: boardTex, emissiveIntensity: 0.16 }));
      const board = M.plane(3.15, 1.4, boardM, { parent: back, pos: [BX, 1.62, 0.072], cast: false });
      board.receiveShadow = true;
      M.box(3.2, 0.035, 0.1, '#6b4428', { parent: back, pos: [BX, 0.86, 0.1] });
      [[-0.9, '#f6f2e8'], [-0.78, '#ffd6e0'], [0.6, '#f6f2e8']].forEach((c) => M.cyl(0.009, 0.009, 0.08, c[1], { parent: back, pos: [BX + c[0], 0.885, 0.11], rot: [0, 0, Math.PI / 2], cast: false }));
      M.rbox(0.16, 0.035, 0.06, 0.01, '#3a3a48', { parent: back, pos: [BX + 1.05, 0.895, 0.11] });
      M.box(0.15, 0.012, 0.05, '#d8c8a8', { parent: back, pos: [BX + 1.05, 0.874, 0.11], cast: false });
      // relógio de parede
      const clockTex = K.tex(256, 256, (ctx) => {
        ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(128, 128, 124, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a2a2a';
        for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; ctx.fillRect(128 + Math.cos(a) * 100 - 4, 128 + Math.sin(a) * 100 - 4, 8, 8); }
        ctx.strokeStyle = '#2a2a2a'; ctx.lineCap = 'round';
        const hand = (a, len, wd) => { ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(a) * len, 128 - Math.cos(a) * len); ctx.stroke(); };
        hand(((21 + 45 / 60) / 12) * TAU, 58, 9); hand((45 / 60) * TAU, 86, 6);
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(128, 128, 8, 0, TAU); ctx.fill();
      });
      M.cyl(0.2, 0.2, 0.05, '#6b4428', { parent: back, pos: [2.15, 2.3, 0.03], rot: [Math.PI / 2, 0, 0] });
      M.plane(0.36, 0.36, K.mat(new T.MeshBasicMaterial({ map: clockTex, transparent: true, toneMapped: false })), { parent: back, pos: [2.15, 2.3, 0.058], cast: false });
      // bandeirinhas
      const flagParts = [];
      const flagG = K.geo(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([-0.09, 0, 0, 0.09, 0, 0, 0, -0.19, 0], 3)));
      flagG.computeVertexNormals();
      const FLC = ['#e8604a', '#f2c45a', '#5fb8a8', '#7a8ae0', '#f08ab0', '#f4f1e6'];
      const sag = (u) => 2.62 - Math.sin(u * Math.PI) * 0.18;
      for (let i = 0; i < 22; i++) { const u = (i + 0.5) / 22; const x = -W + 0.1 + u * (2 * W - 0.2); flagParts.push({ g: flagG, m: mat4([x, sag(u), 0.06], [0.12, 0, (r() - 0.5) * 0.15]), c: FLC[i % FLC.length] }); }
      const flags = new T.Mesh(K.geo(mergeParts(flagParts)), K.vc({ rough: 0.9, side: 'double' }));
      back.add(flags);
      for (let i = 0; i < 6; i++) { const u0 = i / 6, u1 = (i + 1) / 6; const x0 = -W + 0.1 + u0 * (2 * W - 0.2), x1 = -W + 0.1 + u1 * (2 * W - 0.2); const y0 = sag(u0), y1 = sag(u1); const len = Math.hypot(x1 - x0, y1 - y0); M.cyl(0.005, 0.005, len, '#3a2a2a', { parent: back, pos: [(x0 + x1) / 2, (y0 + y1) / 2, 0.06], rot: [0, 0, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2], cast: false }); }

      // janela (parede esquerda) com noite
      const nightTex = K.tex(512, 448, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a0f2e'); g.addColorStop(0.6, '#1f2a62'); g.addColorStop(1, '#3a3a7a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const rr = M.rng(8);
        for (let i = 0; i < 120; i++) { ctx.fillStyle = 'rgba(255,255,240,' + (0.3 + rr() * 0.7).toFixed(2) + ')'; ctx.fillRect(rr() * w, rr() * h * 0.6, 1.5 + rr() * 1.5, 1.5 + rr() * 1.5); }
        ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.24, 34, 0, TAU); ctx.fill();
        ctx.fillStyle = '#0f1640'; ctx.beginPath(); ctx.arc(w * 0.7 + 14, h * 0.24 - 8, 30, 0, TAU); ctx.fill();
        const mg = ctx.createRadialGradient(w * 0.7, h * 0.24, 20, w * 0.7, h * 0.24, 110); mg.addColorStop(0, 'rgba(255,240,200,0.25)'); mg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = mg; ctx.fillRect(0, 0, w, h);
        let x = 0; ctx.fillStyle = '#121633';
        while (x < w) { const bw = 30 + rr() * 60, bh = 40 + rr() * 110; ctx.fillRect(x, h - bh, bw - 3, bh); for (let yy = h - bh + 8; yy < h - 6; yy += 13) for (let xx = x + 5; xx < x + bw - 10; xx += 10) if (rr() > 0.62) { ctx.fillStyle = rr() > 0.5 ? '#ffd27a' : '#ffe9b0'; ctx.fillRect(xx, yy, 4, 6); ctx.fillStyle = '#121633'; } x += bw; }
        ctx.fillStyle = '#0a0d22'; ctx.beginPath(); ctx.moveTo(0, h * 0.15); ctx.quadraticCurveTo(w * 0.25, h * 0.22, w * 0.42, h * 0.1); ctx.lineTo(w * 0.44, h * 0.13); ctx.quadraticCurveTo(w * 0.25, h * 0.27, 0, h * 0.21); ctx.fill();
        [[0.18, 0.18], [0.3, 0.14], [0.08, 0.2]].forEach((p) => { ctx.beginPath(); ctx.ellipse(p[0] * w, p[1] * h, 16, 7, 0.4, 0, TAU); ctx.fill(); });
      });
      const WZ = 0.35;
      M.plane(1.5, 1.3, K.mat(new T.MeshBasicMaterial({ map: nightTex, toneMapped: false })), { parent: left, pos: [WZ, 1.65, 0.004], cast: false });
      const frameM = M.mat('#f4ead8', { rough: 0.6 });
      [[0, 2.33, 1.62, 0.08], [0, 0.97, 1.7, 0.08], [-0.78, 1.65, 0.07, 1.38], [0.78, 1.65, 0.07, 1.38], [0, 1.65, 0.04, 1.3], [0, 1.65, 1.5, 0.04]].forEach((f) => M.box(f[2], f[3], 0.06, frameM, { parent: left, pos: [WZ + f[0], f[1], 0.03], cast: false }));
      M.box(1.8, 0.05, 0.2, frameM, { parent: left, pos: [WZ, 0.94, 0.09], cast: false });
      const winGlow = M.glow('#8fa8ff', 2.2, 0.18); winGlow.position.set(WZ, 1.65, 0.3); left.add(winGlow);
      // cortinas
      const curtG = K.geo(new T.PlaneGeometry(0.42, 1.75, 14, 1));
      const cp = curtG.attributes.position;
      for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin(cp.getX(i) * 38) * 0.035 + 0.04);
      curtG.computeVertexNormals();
      const curtM = M.mat('#c9563c', { rough: 0.95, side: 'double' });
      [-1, 1].forEach((s) => { const c = new T.Mesh(curtG, curtM); c.position.set(WZ + s * 1.0, 1.58, 0.06); c.castShadow = false; c.receiveShadow = true; left.add(c); });
      M.cyl(0.015, 0.015, 2.4, '#5e3622', { parent: left, pos: [WZ, 2.48, 0.1], rot: [0, 0, Math.PI / 2], cast: false });
      // vaso no parapeito
      M.cyl(0.07, 0.055, 0.12, '#c97a52', { parent: left, pos: [WZ + 0.45, 1.03, 0.1] });
      [[0, 0.12, 0, 0.09], [0.04, 0.17, 0.02, 0.06], [-0.04, 0.16, -0.01, 0.06]].forEach((p) => M.sphere(p[3], '#4f8a4a', { parent: left, pos: [WZ + 0.45 + p[0], 1.03 + p[1], 0.1 + p[2]] }));

      // estante (parede direita) com livros mesclados
      const shelfM = M.mat('#7a4a30', { rough: 0.7 });
      const SH = M.group({ parent: right, pos: [-0.95, 0, 0] });
      M.box(1.0, 1.85, 0.05, shelfM, { parent: SH, pos: [0, 0.925, 0.025] });
      [-0.5, 0.5].forEach((x) => M.box(0.04, 1.85, 0.32, shelfM, { parent: SH, pos: [x, 0.925, 0.16] }));
      [0.04, 0.5, 0.95, 1.4, 1.83].forEach((y) => M.box(1.0, 0.035, 0.32, shelfM, { parent: SH, pos: [0, y, 0.16] }));
      const bookParts = [];
      const BC = ['#c0392b', '#2e6da4', '#e6b33a', '#3f8a5a', '#8e5aa8', '#e9e2d0', '#d0643a', '#2a3a5a'];
      [0.06, 0.52, 0.97, 1.42].forEach((y0, s) => {
        let x = -0.46;
        while (x < 0.42) {
          const bw = 0.04 + r() * 0.04, bh = 0.24 + r() * 0.15;
          if (r() < 0.1) { x += 0.06; continue; }
          const tilt = r() < 0.1 ? 0.25 : 0;
          bookParts.push({ g: M.boxGeo(1, 1, 1), m: mat4([x + bw / 2, y0 + bh / 2 + 0.015, 0.17], [0, 0, tilt], [bw, bh, 0.22 + r() * 0.05]), c: BC[Math.floor(r() * BC.length)] });
          x += bw + 0.004 + tilt * 0.1;
        }
        if (s === 2) bookParts.push({ g: M.sphereGeo(0.07, 12, 8), m: mat4([0.33, y0 + 0.08, 0.16]), c: '#e8dcc8' });
      });
      const books = new T.Mesh(K.geo(mergeParts(bookParts)), K.vc({ rough: 0.8 }));
      books.castShadow = true; books.receiveShadow = true; SH.add(books);
      // mural de cortiça
      const cork = M.group({ parent: right, pos: [1.0, 1.6, 0] });
      M.rbox(1.1, 0.75, 0.04, 0.01, '#6b4428', { parent: cork, pos: [0, 0, 0.02] });
      M.box(1.0, 0.65, 0.02, '#c8955a', { parent: cork, pos: [0, 0, 0.04] });
      const noteParts = [];
      [['#fff3a0', -0.3, 0.12], ['#ffc8d8', 0.05, 0.16], ['#bfe8ff', 0.32, 0.05], ['#ffffff', -0.22, -0.17], ['#c8f0c0', 0.18, -0.15]].forEach((n) => noteParts.push({ g: M.boxGeo(0.2, 0.2, 0.006), m: mat4([n[1], n[2], 0.055], [0, 0, (r() - 0.5) * 0.3]), c: n[0] }));
      cork.add(new T.Mesh(K.geo(mergeParts(noteParts)), K.vc({ rough: 0.9 })));

      // porta (parede da frente)
      M.box(0.9, 2.05, 0.05, '#8a5a3a', { parent: front, pos: [2.1, 1.025, 0.03] });
      M.box(1.0, 0.07, 0.07, trimM, { parent: front, pos: [2.1, 2.08, 0.04] });
      M.sphere(0.035, '#d8b060', { parent: front, pos: [1.75, 1.0, 0.08] });
      M.rbox(0.5, 0.7, 0.02, 0.01, '#f4ead8', { parent: front, pos: [-1.2, 1.6, 0.02] });

      // ---------------- mesa do professor ----------------
      const deskM = M.mat('#8a5434', { rough: 0.6 });
      const TD = M.group({ parent: root, pos: [-1.75, 0, -1.05], rot: [0, 0.25, 0] });
      M.rbox(1.45, 0.06, 0.72, 0.02, deskM, { parent: TD, pos: [0, 0.75, 0] });
      M.box(1.36, 0.62, 0.04, '#6e4026', { parent: TD, pos: [0, 0.42, 0.32] });
      [-1, 1].forEach((s) => M.box(0.05, 0.72, 0.66, '#6e4026', { parent: TD, pos: [s * 0.68, 0.36, 0] }));
      // globo
      const globeTex = K.tex(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#3d7fb8'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#7fbf6a';
        const blob = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * w, p[1] * h) : ctx.moveTo(p[0] * w, p[1] * h))); ctx.closePath(); ctx.fill(); };
        blob([[0.27, 0.48], [0.33, 0.5], [0.37, 0.56], [0.35, 0.66], [0.31, 0.78], [0.29, 0.86], [0.28, 0.74], [0.26, 0.6]]);
        blob([[0.12, 0.2], [0.26, 0.16], [0.3, 0.24], [0.24, 0.36], [0.22, 0.46], [0.18, 0.4], [0.1, 0.32]]);
        blob([[0.47, 0.42], [0.56, 0.4], [0.6, 0.5], [0.57, 0.66], [0.53, 0.74], [0.5, 0.6], [0.46, 0.5]]);
        blob([[0.47, 0.18], [0.6, 0.14], [0.8, 0.16], [0.86, 0.26], [0.75, 0.38], [0.64, 0.4], [0.55, 0.32], [0.48, 0.3]]);
        blob([[0.8, 0.62], [0.9, 0.6], [0.92, 0.7], [0.84, 0.74]]);
        ctx.fillStyle = '#f0f4f8'; ctx.fillRect(0, 0, w, h * 0.05); ctx.fillRect(0, h * 0.94, w, h * 0.06);
        ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(0.33 * w, 0.62 * h, 4, 0, TAU); ctx.fill();
      });
      const globeG = M.group({ parent: TD, pos: [0.48, 0.78, -0.05] });
      M.cyl(0.07, 0.09, 0.03, '#3a2a20', { parent: globeG, pos: [0, 0.015, 0] });
      M.cyl(0.012, 0.012, 0.12, '#c9a46a', { parent: globeG, pos: [0, 0.08, 0] });
      const globeTilt = M.group({ parent: globeG, pos: [0, 0.27, 0], rot: [0, 0, 0.41] });
      const globe = new T.Mesh(M.sphereGeo(0.15, 32, 20), K.mat(new T.MeshStandardMaterial({ map: globeTex, roughness: 0.45 })));
      globe.castShadow = true; globeTilt.add(globe);
      M.torus(0.17, 0.008, '#c9a46a', { parent: globeTilt, rot: [0, Math.PI / 2, 0], arc: Math.PI * 1.2 });
      // luminária de banqueiro
      const lampG = M.group({ parent: TD, pos: [-0.38, 0.78, -0.12] });
      M.cyl(0.07, 0.08, 0.025, '#c9a46a', { parent: lampG, pos: [0, 0.012, 0], metal: 0.6 });
      M.cyl(0.01, 0.01, 0.3, '#c9a46a', { parent: lampG, pos: [0, 0.16, 0] });
      const shade = new T.Mesh(K.geo(new T.CylinderGeometry(0.1, 0.1, 0.28, 16, 1, true, -Math.PI / 2, Math.PI)), M.mat('#2f7a52', { rough: 0.3, side: 'double' }));
      shade.position.set(0, 0.33, 0.04); shade.rotation.set(0, 0, Math.PI / 2); shade.castShadow = true; lampG.add(shade);
      M.cyl(0.03, 0.03, 0.2, M.mat('#fff2c8', { emissive: '#ffd27a', emissiveIntensity: 2 }), { parent: lampG, pos: [0, 0.3, 0.04], rot: [0, 0, Math.PI / 2], cast: false });
      const lampGlow = M.glow('#ffcf7a', 0.9, 0.45); lampGlow.position.set(0, 0.25, 0.06); lampG.add(lampGlow);
      // livros, maçã, caneca
      [['#2e6da4', 0.03], ['#c0392b', 0.075], ['#e6b33a', 0.115]].forEach((b, i) => M.rbox(0.3 - i * 0.03, 0.04, 0.22, 0.008, b[0], { parent: TD, pos: [0.05, 0.78 + b[1] - 0.01, 0.08], rot: [0, i * 0.15, 0] }));
      M.sphere(0.045, M.mat('#d8342c', { rough: 0.35 }), { parent: TD, pos: [0.06, 0.94, 0.08], scale: [1, 0.9, 1] });
      M.cyl(0.004, 0.004, 0.03, '#4a3020', { parent: TD, pos: [0.06, 0.99, 0.08] });
      M.sphere(0.018, '#4f8a4a', { parent: TD, pos: [0.075, 0.99, 0.08], scale: [1.4, 0.4, 0.8] });
      M.cyl(0.04, 0.035, 0.1, '#f4f1e6', { parent: TD, pos: [-0.12, 0.83, 0.18] });
      [0, 1, 2].forEach((i) => M.cyl(0.004, 0.004, 0.14, ['#e6b33a', '#c0392b', '#2e6da4'][i], { parent: TD, pos: [-0.12 + (i - 1) * 0.012, 0.9, 0.18 + (i % 2) * 0.01], rot: [(i - 1) * 0.15, 0, (i - 1) * 0.15] }));
      // cadeira do professor
      chair(M, TD, [-0.52, 0, -0.74], Math.PI - 0.55, '#5a3a2a'); // afastada: o ponto 'mesa' fica livre

      // ---------------- carteiras ----------------
      const desk = (x, z, rot, withProps) => {
        const g = M.group({ parent: root, pos: [x, 0, z], rot: [0, rot, 0] });
        // a cadeira fica na origem; a mesa 0,5 m à frente (+Z local)
        chair(M, g, [0, 0, 0], 0, '#3f6a8a');
        const dg = M.group({ parent: g, pos: [0, 0, 0.52] });
        M.rbox(0.82, 0.04, 0.5, 0.015, '#c8955a', { parent: dg, pos: [0, 0.74, 0] });
        M.box(0.78, 0.015, 0.44, '#3f6a8a', { parent: dg, pos: [0, 0.61, 0] });
        [[-0.37, -0.21], [0.37, -0.21], [-0.37, 0.21], [0.37, 0.21]].forEach((p) => M.cyl(0.014, 0.014, 0.72, '#3a3a48', { parent: dg, pos: [p[0], 0.36, p[1]], metal: 0.5 }));
        return { g, dg };
      };
      const d1 = desk(0.75, 1.25, -2.894, true);
      // caderno aberto + lápis + chá (fumacinha)
      const nbTex = K.tex(256, 160, (ctx, w, h) => {
        ctx.fillStyle = '#fbf8f0'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#a8c8e8'; ctx.lineWidth = 1.5; for (let y = 22; y < h; y += 14) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(w - 6, y); ctx.stroke(); }
        ctx.strokeStyle = '#e8a0a0'; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
        ctx.strokeStyle = '#3a4a7a'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const y = 26 + i * 14; ctx.beginPath(); ctx.moveTo(14, y); for (let x = 14; x < 100 - (i % 3) * 18; x += 6) ctx.lineTo(x, y - 3 + Math.sin(x * 0.7 + i) * 2); ctx.stroke(); }
      });
      const nb = M.plane(0.36, 0.23, K.mat(new T.MeshStandardMaterial({ map: nbTex, roughness: 0.9 })), { parent: d1.dg, pos: [-0.05, 0.763, 0.0], rot: [-Math.PI / 2, 0, 0], cast: false });
      nb.receiveShadow = true;
      M.cyl(0.004, 0.004, 0.16, '#e6b33a', { parent: d1.dg, pos: [0.2, 0.766, -0.02], rot: [Math.PI / 2, 0, 0.6], cast: false });
      M.cyl(0.038, 0.032, 0.085, '#e9846a', { parent: d1.dg, pos: [0.3, 0.805, 0.14] });
      M.cyl(0.033, 0.033, 0.005, '#7a4a2a', { parent: d1.dg, pos: [0.3, 0.845, 0.14], cast: false });
      M.torus(0.022, 0.006, '#e9846a', { parent: d1.dg, pos: [0.338, 0.805, 0.14], rot: [0, 0, 0], cast: false });
      const steam = [0, 1, 2].map((i) => { const s = M.glow('#ffffff', 0.08, 0.25); s.position.set(0.3, 0.88 + i * 0.06, 0.14); d1.dg.add(s); return s; });
      const d2 = desk(-1.05, 1.35, -2.75, false);
      // mochila + livros na 2ª carteira
      M.rbox(0.26, 0.32, 0.14, 0.05, '#4a7ab0', { parent: d2.g, pos: [0.0, 0.62, -0.02] });
      M.rbox(0.18, 0.12, 0.05, 0.03, '#3a5a8a', { parent: d2.g, pos: [0.0, 0.58, -0.1] });
      [['#c0392b', 0], ['#3f8a5a', 0.04]].forEach((b, i) => M.rbox(0.26, 0.035, 0.2, 0.008, b[0], { parent: d2.dg, pos: [0.15, 0.78 + b[1], 0], rot: [0, i * 0.3, 0] }));

      // ---------------- lanternas de papel flutuando ----------------
      const lanternM = M.mat('#ffe2b0', { emissive: '#ffb35c', emissiveIntensity: 1.25, rough: 0.9 });
      const capM = M.mat('#5e3622', { rough: 0.8 });
      // (nas laterais: nunca na frente da lousa vista pelos planos geral/quadro/aluno)
      const lanterns = [[-2.3, 2.45, 1.35, 0.17], [2.35, 2.5, 0.5, 0.18], [-2.4, 2.55, -1.3, 0.15], [-1.0, 2.5, 2.1, 0.14]].map((p, i) => {
        const g = M.group({ parent: root, pos: [p[0], p[1], p[2]] });
        M.sphere(p[3], lanternM, { parent: g, scale: [1, 1.15, 1], cast: false });
        M.cyl(p[3] * 0.45, p[3] * 0.45, 0.04, capM, { parent: g, pos: [0, p[3] * 1.12, 0], cast: false });
        M.cyl(p[3] * 0.4, p[3] * 0.4, 0.03, capM, { parent: g, pos: [0, -p[3] * 1.12, 0], cast: false });
        const gl = M.glow('#ffc070', p[3] * 7, 0.38); g.add(gl);
        return { g, base: p[1], ph: i * 1.9 };
      });

      // ---------------- adereços do tema ----------------
      const themeG = { violao: M.group({ parent: root }), ingles: M.group({ parent: right }), negocios: M.group({ parent: root }) };
      // violão no suporte (canto direito, junto ao quadro)
      (function () {
        const g = M.group({ parent: themeG.violao, pos: [2.45, 0, -1.95], rot: [0, -0.55, 0] });
        const stand = '#2a2a30';
        M.cyl(0.012, 0.012, 0.5, stand, { parent: g, pos: [-0.12, 0.22, 0.06], rot: [0.25, 0, 0.3] });
        M.cyl(0.012, 0.012, 0.5, stand, { parent: g, pos: [0.12, 0.22, 0.06], rot: [0.25, 0, -0.3] });
        M.cyl(0.012, 0.012, 0.55, stand, { parent: g, pos: [0, 0.26, -0.1], rot: [-0.45, 0, 0] });
        M.box(0.32, 0.03, 0.06, stand, { parent: g, pos: [0, 0.14, 0.12] });
        const gt = M.group({ parent: g, pos: [0, 0.14, 0.06], rot: [-0.22, 0, 0] });
        const woodG = M.mat('#d08a46', { rough: 0.35 });
        const sideM = M.mat('#7a4424', { rough: 0.5 });
        M.cyl(0.2, 0.2, 0.09, sideM, { parent: gt, pos: [0, 0.22, 0], rot: [Math.PI / 2, 0, 0], seg: 28 });
        M.cyl(0.155, 0.155, 0.09, sideM, { parent: gt, pos: [0, 0.48, 0], rot: [Math.PI / 2, 0, 0], seg: 28 });
        M.cyl(0.2, 0.2, 0.004, woodG, { parent: gt, pos: [0, 0.22, 0.046], rot: [Math.PI / 2, 0, 0], seg: 28, cast: false });
        M.cyl(0.155, 0.155, 0.004, woodG, { parent: gt, pos: [0, 0.48, 0.046], rot: [Math.PI / 2, 0, 0], seg: 28, cast: false });
        M.box(0.18, 0.18, 0.09, sideM, { parent: gt, pos: [0, 0.35, 0] });
        M.box(0.2, 0.2, 0.004, woodG, { parent: gt, pos: [0, 0.35, 0.046], cast: false });
        M.cyl(0.05, 0.05, 0.006, '#1a1010', { parent: gt, pos: [0, 0.4, 0.05], rot: [Math.PI / 2, 0, 0], cast: false });
        M.torus(0.056, 0.006, '#e8c890', { parent: gt, pos: [0, 0.4, 0.05], cast: false });
        M.box(0.11, 0.025, 0.02, '#3a2018', { parent: gt, pos: [0, 0.16, 0.055], cast: false });
        M.box(0.055, 0.5, 0.03, '#5a3018', { parent: gt, pos: [0, 0.8, 0.0] });
        M.box(0.05, 0.5, 0.006, '#2a1810', { parent: gt, pos: [0, 0.8, 0.018], cast: false });
        M.rbox(0.075, 0.15, 0.025, 0.01, '#3a2010', { parent: gt, pos: [0, 1.1, -0.01], rot: [0.15, 0, 0] });
        for (let i = 0; i < 6; i++) M.box(0.0025, 0.9, 0.0025, '#f0e8d8', { parent: gt, pos: [-0.019 + i * 0.0076, 0.62, 0.052], cast: false });
        // estante de partitura
        const ms = M.group({ parent: themeG.violao, pos: [2.0, 0, -1.25], rot: [0, -0.9, 0] });
        M.cyl(0.01, 0.01, 1.05, stand, { parent: ms, pos: [0, 0.52, 0] });
        [0, 2.1, 4.2].forEach((a) => M.cyl(0.008, 0.008, 0.3, stand, { parent: ms, pos: [Math.cos(a) * 0.1, 0.06, Math.sin(a) * 0.1], rot: [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2] }));
        M.box(0.42, 0.3, 0.015, stand, { parent: ms, pos: [0, 1.12, 0], rot: [-0.35, 0, 0] });
        const sheet = K.tex(256, 180, (ctx, w, h) => { ctx.fillStyle = '#fbf6e8'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; for (let s = 0; s < 3; s++) for (let l = 0; l < 5; l++) { const y = 26 + s * 50 + l * 6; ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke(); } ctx.fillStyle = '#222'; for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.ellipse(24 + (i % 8) * 28, 30 + Math.floor(i / 8) * 50 + ((i * 7) % 5) * 3, 4, 3, -0.4, 0, TAU); ctx.fill(); } });
        M.plane(0.38, 0.27, K.mat(new T.MeshStandardMaterial({ map: sheet, roughness: 0.9 })), { parent: ms, pos: [0, 1.125, 0.012], rot: [-0.35, 0, 0], cast: false });
      })();
      // inglês: mapa-múndi + pôster ABC (parede direita)
      (function () {
        const mapTex = K.tex(768, 448, (ctx, w, h) => {
          ctx.fillStyle = '#f4ead2'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#9fd0e8'; ctx.fillRect(20, 20, w - 40, h - 40);
          ctx.fillStyle = '#e8c87a';
          const blob = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(20 + p[0] * (w - 40), 20 + p[1] * (h - 40)) : ctx.moveTo(20 + p[0] * (w - 40), 20 + p[1] * (h - 40)))); ctx.closePath(); ctx.fill(); };
          blob([[0.27, 0.5], [0.34, 0.52], [0.38, 0.58], [0.35, 0.7], [0.31, 0.84], [0.29, 0.9], [0.28, 0.76], [0.25, 0.6]]);
          blob([[0.08, 0.16], [0.26, 0.12], [0.31, 0.22], [0.25, 0.36], [0.22, 0.46], [0.17, 0.4], [0.06, 0.3]]);
          ctx.fillStyle = '#a8d08a';
          blob([[0.46, 0.42], [0.56, 0.4], [0.61, 0.5], [0.57, 0.68], [0.53, 0.76], [0.5, 0.62], [0.45, 0.5]]);
          ctx.fillStyle = '#f0a8a0';
          blob([[0.46, 0.16], [0.6, 0.12], [0.82, 0.14], [0.88, 0.26], [0.76, 0.38], [0.64, 0.4], [0.55, 0.32], [0.47, 0.3]]);
          ctx.fillStyle = '#c8a8e0'; blob([[0.8, 0.64], [0.9, 0.62], [0.93, 0.72], [0.84, 0.76]]);
          ctx.strokeStyle = 'rgba(40,80,120,0.25)'; ctx.lineWidth = 1; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(20 + i * (w - 40) / 8, 20); ctx.lineTo(20 + i * (w - 40) / 8, h - 20); ctx.stroke(); } for (let j = 1; j < 5; j++) { ctx.beginPath(); ctx.moveTo(20, 20 + j * (h - 40) / 5); ctx.lineTo(w - 20, 20 + j * (h - 40) / 5); ctx.stroke(); }
          ctx.fillStyle = '#d8342c'; ctx.beginPath(); ctx.arc(20 + 0.34 * (w - 40), 20 + 0.66 * (h - 40), 7, 0, TAU); ctx.fill();
        });
        M.rbox(1.3, 0.78, 0.03, 0.01, '#6b4428', { parent: themeG.ingles, pos: [0.95, 1.62, 0.015] });
        M.plane(1.22, 0.7, K.mat(new T.MeshStandardMaterial({ map: mapTex, roughness: 0.9 })), { parent: themeG.ingles, pos: [0.95, 1.62, 0.032], cast: false });
        const abc = K.tex(256, 340, (ctx, w, h) => {
          ctx.fillStyle = '#fff8e8'; ctx.fillRect(0, 0, w, h);
          const L3 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
          const cs = ['#e8604a', '#3f7ac0', '#f2b33a', '#5fb8a8', '#8e5aa8', '#e8604a', '#3f7ac0', '#f2b33a', '#5fb8a8'];
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '900 64px Arial, sans-serif';
          L3.forEach((l, i) => { ctx.fillStyle = cs[i]; ctx.fillText(l, 50 + (i % 3) * 78, 60 + Math.floor(i / 3) * 96); });
          ctx.fillStyle = '#3a3a48'; ctx.font = '700 28px Arial, sans-serif'; ctx.fillText('hello!', w / 2, h - 28);
        });
        M.plane(0.42, 0.56, K.mat(new T.MeshStandardMaterial({ map: abc, roughness: 0.9 })), { parent: themeG.ingles, pos: [-1.65, 1.55, 0.02], cast: false });
      })();
      // negócios: flip chart com gráfico subindo
      (function () {
        const g = M.group({ parent: themeG.negocios, pos: [2.3, 0, -1.75], rot: [0, -0.6, 0] });
        const leg = '#3a3a48';
        M.cyl(0.015, 0.015, 1.6, leg, { parent: g, pos: [-0.3, 0.78, 0.08], rot: [0.08, 0, 0.06] });
        M.cyl(0.015, 0.015, 1.6, leg, { parent: g, pos: [0.3, 0.78, 0.08], rot: [0.08, 0, -0.06] });
        M.cyl(0.015, 0.015, 1.6, leg, { parent: g, pos: [0, 0.76, -0.18], rot: [-0.22, 0, 0] });
        M.box(0.72, 0.9, 0.03, '#f4f1ea', { parent: g, pos: [0, 1.25, 0.06], rot: [-0.08, 0, 0] });
        const fc = K.tex(320, 400, (ctx, w, h) => {
          ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#2a3a5a'; ctx.font = '800 38px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('META 2026', w / 2, 52);
          ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(40, 330); ctx.lineTo(290, 330); ctx.stroke();
          [[70, 80, '#5fb8a8'], [120, 130, '#3f7ac0'], [170, 110, '#f2b33a'], [220, 190, '#e8604a']].forEach((b) => { ctx.fillStyle = b[2]; ctx.fillRect(b[0], 330 - b[1], 36, b[1]); });
          ctx.strokeStyle = '#e8604a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(60, 270); ctx.lineTo(140, 220); ctx.lineTo(190, 240); ctx.lineTo(270, 120); ctx.stroke();
          ctx.fillStyle = '#e8604a'; ctx.beginPath(); ctx.moveTo(282, 100); ctx.lineTo(256, 112); ctx.lineTo(276, 132); ctx.fill();
          ctx.fillStyle = '#2a3a5a'; ctx.font = '700 22px Arial, sans-serif'; ctx.fillText('foco no que importa', w / 2, 375);
        });
        M.plane(0.66, 0.84, K.mat(new T.MeshStandardMaterial({ map: fc, roughness: 0.9 })), { parent: g, pos: [0, 1.25, 0.077], rot: [-0.08, 0, 0], cast: false });
        M.box(0.76, 0.06, 0.06, leg, { parent: g, pos: [0, 1.72, 0.04] });
        M.rbox(0.3, 0.08, 0.22, 0.01, '#3f7ac0', { parent: g, pos: [0.45, 0.04, 0.2], rot: [0, 0.4, 0] });
        M.rbox(0.3, 0.06, 0.22, 0.01, '#e6b33a', { parent: g, pos: [0.45, 0.11, 0.2], rot: [0, 0.2, 0] });
      })();
      // cantinho de leitura (frente-direita): poltrona, abajur de pé e mesinha com livros
      const readingCorner = (function () {
        const fab = M.mat('#c8862f', { rough: 0.95 }), fab2 = M.mat('#e0a548', { rough: 0.95 });
        const ch = M.group({ parent: root, pos: [2.2, 0, 1.8], rot: [0, -2.5, 0] });
        M.rbox(0.84, 0.3, 0.76, 0.08, fab, { parent: ch, pos: [0, 0.21, 0] });
        M.rbox(0.62, 0.12, 0.6, 0.05, fab2, { parent: ch, pos: [0, 0.41, 0.05] });
        M.rbox(0.84, 0.62, 0.2, 0.08, fab, { parent: ch, pos: [0, 0.62, -0.29], rot: [-0.12, 0, 0] });
        [-1, 1].forEach((sx) => M.rbox(0.14, 0.24, 0.74, 0.06, fab, { parent: ch, pos: [sx * 0.36, 0.48, 0.01] }));
        [[-0.33, -0.28], [0.33, -0.28], [-0.33, 0.28], [0.33, 0.28]].forEach((q) => M.cyl(0.025, 0.02, 0.07, '#4a2c1c', { parent: ch, pos: [q[0], 0.035, q[1]], seg: 8 }));
        M.rbox(0.32, 0.28, 0.1, 0.05, '#e8604a', { parent: ch, pos: [0.16, 0.6, -0.14], rot: [-0.2, -0.3, 0.15] });
        M.rbox(0.36, 0.03, 0.5, 0.02, '#3f6a8a', { parent: ch, pos: [-0.38, 0.62, 0.05], rot: [0, 0, -0.08] }); // manta no braço
        // abajur de pé
        const fl = M.group({ parent: root, pos: [2.68, 0, 2.22] });
        M.cyl(0.14, 0.15, 0.03, '#3a2a20', { parent: fl, pos: [0, 0.015, 0], metal: 0.3 });
        M.cyl(0.012, 0.012, 1.42, '#c9a46a', { parent: fl, pos: [0, 0.72, 0], metal: 0.6 });
        const shadeM = M.mat('#fff0d4', { emissive: '#ffbf70', emissiveIntensity: 0.9, rough: 0.9, side: 'double' });
        const fshade = new T.Mesh(K.geo(new T.CylinderGeometry(0.15, 0.22, 0.28, 24, 1, true)), shadeM);
        fshade.position.set(0, 1.5, 0); fl.add(fshade);
        const flGlow = M.glow('#ffc070', 1.1, 0.42); flGlow.position.set(0, 1.42, 0); fl.add(flGlow);
        const pool = M.glow('#ffb860', 1.6, 0.16); pool.position.set(-0.25, 0.05, -0.25); fl.add(pool);
        // mesinha redonda
        const st2 = M.group({ parent: root, pos: [1.52, 0, 2.18] });
        M.cyl(0.24, 0.24, 0.035, '#8a5434', { parent: st2, pos: [0, 0.55, 0], seg: 28 });
        M.cyl(0.025, 0.03, 0.53, '#6e4026', { parent: st2, pos: [0, 0.27, 0], seg: 10 });
        M.cyl(0.16, 0.18, 0.025, '#6e4026', { parent: st2, pos: [0, 0.012, 0], seg: 20 });
        [['#2e6da4', 0], ['#e6b33a', 0.04], ['#3f8a5a', 0.075]].forEach((b, i) => M.rbox(0.22 - i * 0.02, 0.035, 0.16, 0.008, b[0], { parent: st2, pos: [-0.04, 0.585 + b[1], 0.02], rot: [0, 0.3 - i * 0.25, 0] }));
        M.cyl(0.035, 0.03, 0.08, '#f4f1e6', { parent: st2, pos: [0.12, 0.607, -0.08] });
        M.torus(0.02, 0.005, '#f4f1e6', { parent: st2, pos: [0.155, 0.607, -0.08], cast: false });
        return [ch, fl, st2];
      })();

      // vaso de planta no canto esquerdo do fundo
      const potG = M.group({ parent: root, pos: [-2.6, 0, -2.1] });
      M.cyl(0.18, 0.14, 0.34, '#c97a52', { parent: potG, pos: [0, 0.17, 0] });
      // espada-de-são-jorge: folhas altas e listradas (lê bem de perto e de longe)
      M.torus(0.18, 0.022, '#b8643e', { parent: potG, pos: [0, 0.34, 0], rot: [Math.PI / 2, 0, 0] });
      M.cyl(0.165, 0.165, 0.02, '#3a2a20', { parent: potG, pos: [0, 0.32, 0], cast: false });
      const leafG = K.geo(new T.ConeGeometry(0.5, 1, 5, 6)); leafG.translate(0, 0.5, 0);
      const lA = col('#2c5e34'), lB = col('#78b060'), lT = new T.Color();
      const leafC = (x, y) => lT.copy(lA).lerp(lB, 0.25 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(y * 26), 3) + 0.3 * y);
      const leafParts = [];
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU + r() * 0.4, rad = 0.03 + r() * 0.09, h = 0.55 + r() * 0.5;
        leafParts.push({ g: leafG, m: mat4([Math.cos(a) * rad, 0.3, Math.sin(a) * rad], { dir: [Math.cos(a) * (0.12 + r() * 0.18), 1, Math.sin(a) * (0.12 + r() * 0.18)], spin: -a - Math.PI / 2 + (r() - 0.5) * 0.8 }, [0.075, h, 0.016]), c: leafC });
      }
      const leaves = new T.Mesh(K.geo(mergeParts(leafParts)), K.vc({ rough: 0.55 }));
      leaves.castShadow = true; leaves.receiveShadow = true; potG.add(leaves);

      // poeira de giz flutuando
      const motes = glowPoints(K, 70, 0.07, { tex: dotTex(K), color: '#ffe6b8', opacity: 0.7 });
      root.add(motes);
      const md = [];
      for (let i = 0; i < 70; i++) md.push({ x: (r() - 0.5) * 5.5, y: 0.3 + r() * 2.4, z: (r() - 0.5) * 4.5, ph: r() * TAU, sp: 0.03 + r() * 0.05 });

      // menos draw calls: junta as peças estáticas (cada parede/teto continua num grupo próprio)
      [back, left, front, ceil, TD, d1.g, d2.g, potG, SH, cork, themeG.violao, themeG.ingles, themeG.negocios].forEach((g) => bake(K, g));
      bake(K, right, [cork, themeG.ingles]);
      readingCorner.forEach((g) => bake(K, g));

      function drawBoard(p) {
        const lines = Array.isArray(p.lines) ? p.lines : p.lines ? [String(p.lines)] : [];
        const tema = p.tema || 'violao';
        const key = JSON.stringify(lines) + '|' + tema;
        if (key === st.linesKey) return;
        st.linesKey = key;
        boardTex.userData.redraw((ctx, w, h) => drawChalk(ctx, w, h, lines, tema));
      }
      // primeira pessoa: colisões (paredes = bounds; móveis = colliders; os adereços do tema trocam junto)
      const baseCols = [
        { x: -1.75, z: -1.05, w: 1.47, d: 0.74, rot: 0.25 },    // mesa do professor
        { x: -2.41, z: -1.62, w: 0.46, d: 0.46, rot: 0.25 },    // cadeira do professor
        { x: 0.6235, z: 0.7456, w: 0.84, d: 0.52, rot: -2.894 }, // carteira do aluno (a cadeira é ponto de sentar)
        { x: -1.248, z: 0.869, w: 0.84, d: 0.52, rot: -2.75 },   // 2ª carteira
        { x: 2.8, z: -0.95, w: 0.4, d: 1.06 },                   // estante
        { x: -2.6, z: -2.1, w: 0.42, d: 0.42 },                  // vaso
        { x: -2.88, z: -0.35, w: 0.24, d: 1.8 },                 // parapeito da janela
        { x: 2.2, z: 1.8, w: 0.86, d: 0.8, rot: -2.5 },          // poltrona
        { x: 2.68, z: 2.22, w: 0.32, d: 0.32 },                  // abajur de pé
        { x: 1.52, z: 2.18, w: 0.5, d: 0.5 },                    // mesinha
      ];
      const temaCols = {
        violao: [{ x: 2.45, z: -1.95, w: 0.5, d: 0.45, rot: -0.55 }, { x: 2.0, z: -1.25, w: 0.34, d: 0.34 }],
        ingles: [],
        negocios: [{ x: 2.3, z: -1.75, w: 0.8, d: 0.5, rot: -0.6 }],
      };
      let envRef = null;
      function setTema(tema) {
        tema = themeG[tema] ? tema : 'violao';
        Object.keys(themeG).forEach((k) => (themeG[k].visible = k === tema));
        cork.visible = tema !== 'ingles';
        if (envRef) envRef.colliders = baseCols.concat(temaCols[tema]);
      }

      const env = {
        root,
        spots: {
          quadro: { x: 1.75, z: -1.75, rot: -0.45 },
          faisca: { x: 1.45, z: -1.55, rot: -0.5, y: 1.55 },
          mesa: { x: -1.75, z: -1.7, rot: 0.25 },
          aluno: { x: 0.75, z: 1.25, rot: -2.894 },
          aluno2: { x: -1.05, z: 1.35, rot: -2.75 },
          centro: { x: 0.1, z: 0.2, rot: 0 },
          porta: { x: -2.1, z: 1.85, rot: Math.PI },
          // primeira pessoa
          inicio: { x: -2.0, z: 1.75, rot: 2.72 },      // junto à porta, olhando a lousa
          lousa: { x: -0.2, z: -1.3, rot: Math.PI },     // diante da lousa (ler o que está escrito)
          janela: { x: -2.3, z: -0.35, rot: -Math.PI / 2 }, // diante da janela (lua e cidade)
          estante: { x: 2.15, z: -0.7, rot: Math.PI / 2 },  // diante da estante de livros
          mural: { x: 2.2, z: 1.0, rot: Math.PI / 2 },      // diante do mural de recados (ou do mapa, tema 'ingles')
        },
        colliders: baseCols.concat(temaCols[params.tema && temaCols[params.tema] ? params.tema : 'violao']),
        bounds: { minX: -W + 0.05, maxX: W - 0.05, minZ: -D + 0.05, maxZ: D - 0.05 },
        shots: {
          geral: { target: [0.0, 1.2, -0.35], yaw: 0.28, pitch: 0.3, dist: 8.2, fov: 40 },
          quadro: { target: [-0.2, 1.62, -2.45], yaw: 0, pitch: 0.04, dist: 3.5, fov: 40 },
          aluno: { target: [0.1, 1.3, -1.2], yaw: 0.3, pitch: 0.14, dist: 4.3, fov: 40 },
          mesa: { target: [-1.7, 1.05, -1.25], yaw: 0.55, pitch: 0.16, dist: 3.3, fov: 38 },
          janela: { target: [-2.4, 1.55, -0.35], yaw: 1.25, pitch: 0.08, dist: 3.4, fov: 40 },
        },
        defaultShot: 'geral',
        walls,
        background: '#0b0e24',
        fog: null,
        setParams(p) {
          p = p || {};
          drawBoard(p);
          setTema(p.tema || 'violao');
        },
        update(t, p, dt) {
          if (st.t0 == null) st.t0 = t;
          const lt = t - st.t0;
          SU.time.value = lt;
          lanterns.forEach((l) => { l.g.position.y = l.base + Math.sin(lt * 0.8 + l.ph) * 0.05; l.g.rotation.y = lt * 0.2 + l.ph; });
          lanternL.intensity = 1.9 + Math.sin(lt * 2.3) * 0.06;
          globe.rotation.y = lt * 0.25;
          steam.forEach((s, i) => { const k = ((lt * 0.35 + i / 3) % 1); s.position.y = 0.86 + k * 0.2; s.material.opacity = 0.3 * Math.sin(k * Math.PI); s.scale.setScalar(0.06 + k * 0.08); });
          const pa = motes.geometry.attributes.position;
          md.forEach((m, i) => pa.setXYZ(i, m.x + Math.sin(lt * 0.2 + m.ph) * 0.2, m.y + Math.sin(lt * m.sp * 6 + m.ph) * 0.15, m.z + Math.cos(lt * 0.17 + m.ph) * 0.2));
          pa.needsUpdate = true;
        },
        dispose() { K.dispose(root); },
      };
      envRef = env;
      drawBoard(params);
      setTema(params.tema || 'violao');
      return env;
    },
  };

  /** Cadeira simples (assento a 0,46 m) — o ponto da cadeira é o centro do assento. */
  function chair(M2, parent, pos, rot, color) {
    const g = M2.group({ parent, pos, rot: [0, rot, 0] });
    M2.rbox(0.42, 0.04, 0.4, 0.015, color, { parent: g, pos: [0, 0.44, 0] });
    M2.rbox(0.4, 0.3, 0.03, 0.012, color, { parent: g, pos: [0, 0.7, -0.19], rot: [-0.08, 0, 0] });
    [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach((p) => M2.cyl(0.013, 0.013, 0.44, '#3a3a48', { parent: g, pos: [p[0], 0.22, p[1]], metal: 0.5 }));
    [-0.18, 0.18].forEach((x) => M2.cyl(0.011, 0.011, 0.3, '#3a3a48', { parent: g, pos: [x, 0.6, -0.185], metal: 0.5 }));
    return g;
  }

  // ==================================================================
  // VOID — espaço abstrato elegante
  // ==================================================================
  P2.envs.void = {
    name: 'Vazio',
    build(params) {
      params = params || {};
      const K = makeKit();
      const root = new T.Group();
      root.name = 'env:void';
      const r = M.rng(12);
      const st = { t0: null, color: null };
      const sky = makeSky({ cTop: '#04050d', cMid: '#1b1640', cBot: '#04050a', stars: 0.4, nebula: 0.8, cNeb: '#7c6cff', bandH: 0.35 });
      root.add(sky);
      const SU = sky.userData.U;
      const L = M.lighting('noite', { area: 5 });
      root.add(L.group);
      L.hemi.color.set('#d8d0ff'); L.hemi.groundColor.set('#1a1530'); L.hemi.intensity = 0.75;
      L.sun.color.set('#ffffff'); L.sun.intensity = 1.0; L.sun.position.set(3, 8, 6);
      L.amb.intensity = 0.15;
      const rim = new T.PointLight('#7c6cff', 1.4, 9, 2); rim.position.set(0, 2.6, -2.5); root.add(rim);

      // piso de luz + sombra de contato
      const disc = softDisc(K, 0.25);
      const floorM = K.mat(new T.MeshBasicMaterial({ map: disc, color: '#7c6cff', transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const fl = new T.Mesh(M.planeGeo(7, 7), floorM); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.004; fl.renderOrder = 1; root.add(fl);
      const stageM = K.mat(new T.MeshStandardMaterial({ color: '#15132c', roughness: 0.55, metalness: 0.2 }));
      const stage = new T.Mesh(M.cylGeo(3.3, 3.45, 0.12, 96), stageM); stage.position.y = -0.06; stage.receiveShadow = true; root.add(stage);
      const rimM = K.mat(new T.MeshBasicMaterial({ color: '#b8b0ff', toneMapped: false }));
      const rimRing = new T.Mesh(M.torusGeo(3.32, 0.018, 6, 128), rimM); rimRing.rotation.x = -Math.PI / 2; rimRing.position.y = 0.0; root.add(rimRing);
      const ringM = K.mat(new T.MeshBasicMaterial({ color: '#b8b0ff', transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const rings = [[1.35, 0.012, 1.7, 0.25], [2.1, 0.008, 4.6, -0.14], [2.9, 0.01, 2.4, 0.09], [3.8, 0.006, 5.6, -0.05]].map((d) => {
        const m = new T.Mesh(M.torusGeo(d[0], d[1], 4, 96, d[2]), ringM);
        m.rotation.x = -Math.PI / 2; m.position.y = 0.01; root.add(m);
        return { m, sp: d[3] };
      });

      // portal: anéis verticais finos atrás do palco (moldura elegante para quem está no centro)
      const portalM = K.mat(new T.MeshBasicMaterial({ color: '#c8c0ff', transparent: true, opacity: 0.7, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const portal = M.group({ parent: root, pos: [0, 1.75, -3.4] });
      const pr1 = new T.Mesh(M.torusGeo(2.35, 0.014, 6, 160), portalM); portal.add(pr1);
      const pr2 = new T.Mesh(M.torusGeo(2.6, 0.007, 4, 160, 4.4), portalM); pr2.rotation.z = 0.8; portal.add(pr2);
      const pr3 = new T.Mesh(M.torusGeo(2.12, 0.006, 4, 160, 2.2), portalM); pr3.rotation.z = 3.6; portal.add(pr3);
      const portalGlow = M.glow('#7c6cff', 6.5, 0.28); portal.add(portalGlow);
      [pr1, pr2, pr3].forEach((m) => { m.castShadow = m.receiveShadow = false; });

      // formas flutuando
      const pearlM = K.mat(new T.MeshStandardMaterial({ color: '#d8d2ff', roughness: 0.22, metalness: 0.15, emissive: col('#7c6cff'), emissiveIntensity: 0.18 }));
      const glassM = K.mat(new T.MeshStandardMaterial({ color: '#b8b0ff', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35, emissive: col('#7c6cff'), emissiveIntensity: 0.25, depthWrite: false }));
      const lineM = K.mat(new T.LineBasicMaterial({ color: '#c8c0ff', transparent: true, opacity: 0.55 }));
      const geos = [
        K.geo(new T.IcosahedronGeometry(0.5, 0)), K.geo(new T.OctahedronGeometry(0.45, 0)), M.torusGeo(0.38, 0.12, 16, 40),
        M.roundedBoxGeo(0.6, 0.6, 0.6, 0.12), M.sphereGeo(0.35, 32, 20), K.geo(new T.TetrahedronGeometry(0.5, 0)), K.geo(new T.DodecahedronGeometry(0.42, 0)),
      ];
      const shapes = [];
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (i / 14 - 0.5) * 4.2 + (r() - 0.5) * 0.3, rad = 5.0 + r() * 5.0;
        const x = Math.cos(a) * rad * 1.25, z = Math.sin(a) * rad;
        const y = 0.5 + r() * 2.6;
        const g = geos[i % geos.length];
        const kind = i % 3;
        let obj;
        if (kind === 2 && /Icosa|Octa|Tetra|Dodeca/.test(g.type)) obj = new T.LineSegments(K.geo(new T.EdgesGeometry(g)), lineM);
        else obj = new T.Mesh(g, kind === 1 ? glassM : pearlM);
        obj.position.set(x, y, z);
        obj.scale.setScalar(0.55 + r() * 0.65);
        obj.rotation.set(r() * TAU, r() * TAU, 0);
        obj.castShadow = false;
        root.add(obj);
        shapes.push({ o: obj, y, ph: r() * TAU, sx: (r() - 0.5) * 0.4, sy: (r() - 0.5) * 0.5 });
      }
      const halo = M.glow('#7c6cff', 9, 0.22); halo.position.set(0, 1.6, -7); root.add(halo);
      const VF = fenceColliders(Array.from({ length: 20 }, (_, i) => [Math.cos((i / 20) * TAU) * 3.05, Math.sin((i / 20) * TAU) * 3.05]), 0, 0);
      // partículas
      const pts = glowPoints(K, 260, 0.09, { tex: dotTex(K), color: '#d8d0ff', opacity: 0.85 });
      root.add(pts);
      const pd = [];
      for (let i = 0; i < 260; i++) { const a = r() * TAU, d = 1.2 + Math.sqrt(r()) * 9; pd.push({ x: Math.cos(a) * d, z: Math.sin(a) * d - 1, y: r() * 7, sp: 0.08 + r() * 0.2, ph: r() * TAU }); }

      function tint(c) {
        const key = M.hex(c);
        if (key === st.color) return;
        st.color = key;
        const tc = M.color(c);
        SU.cTop.value.copy(tc).multiplyScalar(0.04).add(col('#020309'));
        SU.cMid.value.copy(col('#0d0f24')).lerp(tc, 0.32);
        SU.cBand.value.copy(SU.cMid.value).lerp(SU.cTop.value, 0.55);
        SU.cHor2.value.copy(SU.cMid.value);
        SU.cBot.value.copy(tc).multiplyScalar(0.03).add(col('#020206'));
        SU.cNeb.value.copy(tc).multiplyScalar(0.55);
        floorM.color.copy(tc);
        rimM.color.copy(tc).lerp(col('#ffffff'), 0.35);
        stageM.color.copy(col('#100e22')).lerp(tc, 0.12);
        ringM.color.copy(tc).lerp(col('#ffffff'), 0.45);
        pearlM.color.copy(tc).lerp(col('#ffffff'), 0.62);
        pearlM.emissive.copy(tc);
        glassM.color.copy(tc).lerp(col('#ffffff'), 0.4);
        glassM.emissive.copy(tc);
        lineM.color.copy(tc).lerp(col('#ffffff'), 0.5);
        pts.material.color.copy(tc).lerp(col('#ffffff'), 0.55);
        rim.color.copy(tc);
        halo.material.color.copy(tc);
        portalM.color.copy(tc).lerp(col('#ffffff'), 0.5);
        portalGlow.material.color.copy(tc);
        L.hemi.color.copy(tc).lerp(col('#ffffff'), 0.7);
        const sc = P2.core && P2.core.scene;
        if (sc && sc.background && sc.background.isColor) sc.background.copy(SU.cMid.value);
      }

      const env = {
        root,
        spots: {
          centro: { x: 0, z: 0, rot: 0 },
          esquerda: { x: -1.3, z: 0.3, rot: 0.35 },
          direita: { x: 1.3, z: 0.3, rot: -0.35 },
          faisca: { x: 0.8, z: 0.5, rot: -0.2, y: 1.3 },
          inicio: { x: 0, z: 2.0, rot: Math.PI },   // primeira pessoa: na borda do palco, olhando o centro
        },
        colliders: VF.colliders,                    // borda circular do palco (não se cai no vazio)
        bounds: VF.bounds,
        shots: {
          geral: { target: [0, 1.1, 0], yaw: 0, pitch: 0.12, dist: 6.5, fov: 38 },
          close: { target: [0, 1.45, 0], yaw: 0.25, pitch: 0.06, dist: 2.6, fov: 36 },
          alto: { target: [0, 0.8, 0], yaw: 0.6, pitch: 0.55, dist: 9, fov: 40 },
          lado: { target: [0, 1.1, 0], yaw: 1.1, pitch: 0.15, dist: 6.0, fov: 40 },
        },
        defaultShot: 'geral',
        walls: [],
        background: '#0d0f24',
        fog: null,
        setParams(p) { tint((p && p.color) || '#7c6cff'); },
        update(t, p, dt) {
          if (st.t0 == null) st.t0 = t;
          const lt = t - st.t0;
          SU.time.value = lt * 3;
          rings.forEach((rg) => (rg.m.rotation.z = lt * rg.sp));
          pr2.rotation.z = 0.8 + lt * 0.07; pr3.rotation.z = 3.6 - lt * 0.11;
          portal.position.y = 1.75 + Math.sin(lt * 0.4) * 0.04;
          shapes.forEach((s) => { s.o.position.y = s.y + Math.sin(lt * 0.5 + s.ph) * 0.18; s.o.rotation.x += s.sx * (dt || 0.016); s.o.rotation.y += s.sy * (dt || 0.016); });
          const pa = pts.geometry.attributes.position;
          pd.forEach((d, i) => pa.setXYZ(i, d.x + Math.sin(lt * 0.3 + d.ph) * 0.15, (d.y + lt * d.sp) % 7, d.z));
          pa.needsUpdate = true;
        },
        dispose() { K.dispose(root); },
      };
      tint(params.color || '#7c6cff');
      return env;
    },
  };
})();

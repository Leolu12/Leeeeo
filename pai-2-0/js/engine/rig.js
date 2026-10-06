/* PAI 2.0 — rig.js (v2)
 * Personagens humanos 3D feitos em código, estilo "brinquedo premium":
 *  - corpo inteiro numa única SkinnedMesh (pele + roupa + sapatos) com pesos
 *    suaves nas juntas: cotovelo, joelho e ombro dobram sem buracos;
 *  - cabeça esculpida (crânio, mandíbula, bochechas, nariz, orelhas);
 *  - cabelo em "casca" com linha de cabelo esfumada, mechas e penteado;
 *  - rosto dinâmico: olhos que olham, pálpebras que piscam, sobrancelhas e
 *    boca geradas por parâmetros (transição suave entre expressões e fala);
 *  - mãos com dedos (relaxada, punho, apontar, pegar, aberta, joinha);
 *  - poses procedurais com IK de braço (a mão chega no teclado, na orelha,
 *    no queixo...) e misturas suaves por quatérnios.
 * Poucas chamadas de desenho: ~8 por personagem (+ sombras).
 *
 * Convenções: personagem olha para +Z; Y para cima; o lado DIREITO do
 * personagem fica em -X. Unidades em metros. Pés na origem.
 * Rotações: braço/perna para FRENTE = rotation.x negativo; joelho dobrando
 * = x positivo; cabeça olhando para baixo = x positivo.
 *
 * API (mantida): P2.rig.human(spec) → controlador {root, height, headY, kind:'human',
 *   joints, face, props, mats, update(dt, actor), dispose()}; P2.rig.POSES; P2.rig.EXPRS;
 *   P2.rig.SKINS; P2.rig.makeController.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  const R = (P2.rig = {});
  const V3 = T.Vector3;
  const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const col = (c) => new T.Color(c);
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  const SKINS = {
    claro: { base: '#f0c6a2', dark: '#d9a582', lip: '#c4716a', cheek: '#f29a8a' },
    medio: { base: '#d59c70', dark: '#b07b52', lip: '#a95a4c', cheek: '#e0806c' },
    escuro: { base: '#8a5a3c', dark: '#6b4229', lip: '#6a3428', cheek: '#a2583f' },
  };
  R.SKINS = SKINS;

  // ------------------------------------------------------------------
  // Expressões faciais
  //   brow: [altura, inclinação] (inclinação + = parte de dentro sobe → preocupado)
  //   eye: abertura 0..1.3 · low: pálpebra de baixo sobe (olhos sorrindo) ·
  //   mouth: forma · mw: largura · head/chest: atitude do corpo (somada à pose)
  //   blush/sweat/tear/bags/red: extras
  // ------------------------------------------------------------------
  const EX = {
    neutro: { brow: [0, 0], eye: 1, low: 0.05, mouth: 'line', mw: 1 },
    feliz: { brow: [0.006, 0.05], eye: 0.92, low: 0.4, mouth: 'smile', mw: 1.1, head: [-0.03, 0, 0.03] },
    rindo: { brow: [0.01, 0.1], eye: 0.3, low: 0.75, mouth: 'grin', mw: 1.2, head: [-0.14, 0, 0.05], chest: [-0.05, 0, 0] },
    orgulhoso: { brow: [0.004, -0.05], eye: 0.72, low: 0.35, mouth: 'smirk', mw: 1, head: [-0.12, 0, 0], chest: [-0.07, 0, 0] },
    cansado: { brow: [-0.004, 0.14], eye: 0.45, low: 0.1, mouth: 'line', mw: 0.8, bags: true, head: [0.1, 0, 0.04], chest: [0.07, 0, 0] },
    preocupado: { brow: [0.008, 0.34], eye: 1.05, low: 0, mouth: 'frown', mw: 0.8, sweat: true, head: [0.05, 0, 0] },
    bravo: { brow: [-0.012, -0.4], eye: 0.78, low: 0.25, mouth: 'clench', mw: 1, red: true, head: [0.07, 0, 0] },
    surpreso: { brow: [0.02, 0.1], eye: 1.25, low: 0, mouth: 'o', mw: 1, head: [-0.06, 0, 0] },
    assustado: { brow: [0.022, 0.32], eye: 1.32, low: 0, mouth: 'open', mw: 0.9, sweat: true, head: [-0.07, 0, 0], chest: [-0.05, 0, 0] },
    triste: { brow: [0.004, 0.38], eye: 0.72, low: 0.05, mouth: 'frown', mw: 0.9, tear: true, head: [0.16, 0, 0.05], chest: [0.06, 0, 0] },
    pensativo: { brow: [0.006, -0.12], browAsym: 'think', eye: 0.8, low: 0.15, mouth: 'pursed', mw: 0.7, look: [0.3, 0.6], head: [-0.08, 0.1, 0.06] },
    desconfiado: { brow: [0, 0], browAsym: true, eye: 0.62, low: 0.3, mouth: 'smirkdown', mw: 0.85, squint: true, look: [-0.3, 0], head: [0.05, -0.12, -0.07] },
    sem_graca: { brow: [0.004, 0.22], eye: 0.85, low: 0.3, mouth: 'wavy', mw: 0.8, blush: true, look: [-0.5, -0.2], head: [0.08, -0.12, 0.08] },
    empolgado: { brow: [0.018, 0.08], eye: 1.15, low: 0.2, mouth: 'grin', mw: 1.25, head: [-0.07, 0, 0], chest: [-0.03, 0, 0] },
    impaciente: { brow: [-0.006, -0.2], eye: 0.7, low: 0.15, mouth: 'tight', mw: 1, head: [0, 0, -0.06] },
    amigavel: { brow: [0.006, 0.08], eye: 0.95, low: 0.3, mouth: 'smile', mw: 1, head: [0, 0, 0.04] },
    determinado: { brow: [-0.006, -0.22], eye: 0.88, low: 0.2, mouth: 'tight', mw: 0.9, head: [0.03, 0, 0], chest: [-0.04, 0, 0] },
    // novas
    confuso: { brow: [0.004, 0.1], browAsym: 'confuso', eye: 0.95, low: 0.05, mouth: 'wavy', mw: 0.85, look: [0.4, 0.3], head: [0, 0.06, 0.14] },
    aliviado: { brow: [0.004, 0.2], eye: 0.5, low: 0.35, mouth: 'smile', mw: 1, head: [-0.06, 0, 0], chest: [-0.03, 0, 0] },
    serio: { brow: [-0.004, -0.08], eye: 0.9, low: 0.12, mouth: 'tight', mw: 0.9 },
    emocionado: { brow: [0.01, 0.32], eye: 0.68, low: 0.45, mouth: 'smile', mw: 1, tear: true, blush: true, head: [0.04, 0, 0.06] },
  };
  R.EXPRS = EX;
  // Formas de boca: w largura · open abertura · curve cantos (+ sorriso) · round "o" · teeth dentes · asym · wavy
  const MOUTHS = {
    line: { w: 1, open: 0, curve: 0.05 },
    smile: { w: 1.08, open: 0.06, curve: 0.75, teeth: 0.4 },
    grin: { w: 1.18, open: 0.9, curve: 0.8, teeth: 1 },
    frown: { w: 0.92, open: 0, curve: -0.7 },
    open: { w: 0.85, open: 0.75, curve: -0.1, teeth: 0.5 },
    o: { w: 0.55, open: 0.7, curve: 0, round: 1 },
    smirk: { w: 1, open: 0, curve: 0.35, asym: 0.7 },
    smirkdown: { w: 0.95, open: 0, curve: -0.2, asym: 0.55 },
    tight: { w: 0.85, open: 0, curve: -0.12, press: 1 },
    pursed: { w: 0.6, open: 0.04, curve: -0.05, round: 0.4 },
    wavy: { w: 0.9, open: 0, curve: 0.05, wavy: 1 },
    clench: { w: 1.05, open: 0.42, curve: -0.45, teeth: 1, lowTeeth: 1 },
  };
  R.MOUTHS = MOUTHS;

  // ------------------------------------------------------------------
  // Materiais: um material "corpo" por personagem com cores por vértice e
  // regiões (aspereza/metal/emissão vindas de uma textura 16×1 via UV).
  // ------------------------------------------------------------------
  const REG = { cloth: 0, knit: 1, leather: 2, metal: 3, skin: 4, hair: 5, eye: 6, emit: 7, mouth: 8, teeth: 9, rubber: 10, satin: 11, denim: 12, emitRed: 13, plastic: 14, gold: 15 };
  R.REG = REG;
  const NREG = 16;
  const REG_RM = [[0.86, 0], [0.96, 0], [0.36, 0], [0.3, 0.85], [0.58, 0], [0.52, 0], [0.12, 0], [1, 0], [0.45, 0], [0.22, 0], [0.75, 0], [0.38, 0.05], [0.93, 0], [1, 0], [0.28, 0.1], [0.24, 1]];
  let regTex = null, emiTex = null;
  function regionTextures() {
    if (regTex) return;
    const d = new Uint8Array(NREG * 4), e = new Uint8Array(NREG * 4);
    for (let i = 0; i < NREG; i++) {
      d[i * 4] = 255; d[i * 4 + 1] = Math.round(REG_RM[i][0] * 255); d[i * 4 + 2] = Math.round(REG_RM[i][1] * 255); d[i * 4 + 3] = 255;
      e[i * 4 + 3] = 255;
    }
    e.set([255, 255, 255], REG.emit * 4);
    e.set([255, 30, 44], REG.emitRed * 4);
    regTex = new T.DataTexture(d, NREG, 1); regTex.needsUpdate = true;
    emiTex = new T.DataTexture(e, NREG, 1); emiTex.needsUpdate = true;
  }
  const regU = (r) => (r + 0.5) / NREG;
  // Luz de contorno (rim) compartilhada — dá acabamento de "personagem de jogo".
  const RIM = { color: { value: new T.Color('#fff2e2') }, strength: { value: 0.22 }, power: { value: 2.8 } };
  R.RIM = RIM;
  function addRim(m, k) {
    const local = { value: k == null ? 1 : k };
    m.userData.rimK = local;
    m.onBeforeCompile = function (sh) {
      sh.uniforms.rimColor = RIM.color; sh.uniforms.rimStrength = RIM.strength; sh.uniforms.rimPower = RIM.power; sh.uniforms.rimK = local;
      sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimStrength;\nuniform float rimPower;\nuniform float rimK;\n' +
        sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), rimPower); totalEmissiveRadiance += rimColor * (0.35 + diffuseColor.rgb) * fr * rimStrength * rimK; }');
    };
    m.customProgramCacheKey = () => 'p2rim1';
    return m;
  }
  R.addRim = addRim;
  function bodyMaterial(o) {
    regionTextures();
    o = o || {};
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, roughnessMap: regTex, metalnessMap: regTex, emissive: new T.Color(1, 1, 1), emissiveMap: emiTex });
    if (o.side === 'double') m.side = T.DoubleSide;
    addRim(m, o.rim);
    return m;
  }
  R.bodyMaterial = bodyMaterial;

  // ------------------------------------------------------------------
  // Balde de geometria: junta peças (com cor/região/pesos) numa só malha
  // ------------------------------------------------------------------
  const IDM = new T.Matrix4();
  const _v = new V3(), _n = new V3(), _l = new V3();
  const _nm = new T.Matrix3();
  function Bucket() { this.p = []; this.n = []; this.c = []; this.uv = []; this.si = []; this.sw = []; this.idx = []; this.count = 0; }
  /**
   * geo: BufferGeometry (com normal) · o: {m: Matrix4, color: Color|fn(p,n,local,i), region, bone, weight: fn(p)→[[osso,peso],...], uvFn}
   */
  Bucket.prototype.add = function (geo, o) {
    o = o || {};
    const pos = geo.attributes.position, nor = geo.attributes.normal;
    const m = o.m || IDM;
    _nm.getNormalMatrix(m);
    const base = this.count;
    const u = regU(o.region == null ? REG.cloth : o.region);
    const fixed = typeof o.color === 'function' ? null : (o.color || col('#ff00ff'));
    for (let i = 0; i < pos.count; i++) {
      _l.fromBufferAttribute(pos, i);
      _v.copy(_l).applyMatrix4(m);
      _n.fromBufferAttribute(nor, i).applyMatrix3(_nm).normalize();
      this.p.push(_v.x, _v.y, _v.z); this.n.push(_n.x, _n.y, _n.z);
      const c = fixed || o.color(_v, _n, _l, i);
      this.c.push(c.r, c.g, c.b);
      if (o.uvFn) { const uv = o.uvFn(_v, _n, _l); this.uv.push(uv[0], uv[1]); } else this.uv.push(typeof o.regionFn === 'function' ? regU(o.regionFn(_v, _n, _l, i)) : u, 0.5);
      let w = o.weight ? o.weight(_v, _l) : [[o.bone || 0, 1]];
      if (w.length > 4) w = w.slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
      let tot = 0; w.forEach((x) => (tot += x[1]));
      for (let k = 0; k < 4; k++) { const x = w[k]; this.si.push(x ? x[0] : 0); this.sw.push(x ? x[1] / (tot || 1) : 0); }
      this.count++;
    }
    if (geo.index) { const ix = geo.index.array; for (let i = 0; i < ix.length; i++) this.idx.push(base + ix[i]); }
    else for (let i = 0; i < pos.count; i++) this.idx.push(base + i);
    return this;
  };
  Bucket.prototype.geometry = function (skinned) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
    if (skinned) {
      g.setAttribute('skinIndex', new T.Uint16BufferAttribute(this.si, 4));
      g.setAttribute('skinWeight', new T.Float32BufferAttribute(this.sw, 4));
    }
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  };
  R.Bucket = Bucket;

  // ------------------------------------------------------------------
  // Tubo genérico: seções superelípticas ao longo de um caminho.
  // st: [{p:V3, rx, ry, n?, fz?, bz?, up?:V3}] · o: {segs, up, close0, close1, cut(i,k,a)}
  // fz/bz: volume extra só na frente/atrás (barriga, peito).
  // ------------------------------------------------------------------
  function tubeGeo(st, o) {
    o = o || {};
    const segs = o.segs || 16, N = st.length;
    const open = st.some((x) => x.gap > 0);
    const RS = open ? segs + 1 : segs; // pontos por anel
    const pos = new Float32Array((N * RS + 2) * 3);
    const idx = [];
    const upG = o.up || new V3(0, 0, 1);
    const tg = new V3(), A = new V3(), B = new V3(), tmp = new V3();
    for (let i = 0; i < N; i++) {
      const s = st[i];
      const a = st[Math.max(0, i - 1)].p, b = st[Math.min(N - 1, i + 1)].p;
      tg.subVectors(b, a).normalize();
      const up = s.up || upG;
      B.copy(up).addScaledVector(tg, -up.dot(tg));
      if (B.lengthSq() < 1e-9) B.set(1, 0, 0).addScaledVector(tg, -tg.x);
      B.normalize();
      A.crossVectors(tg, B).normalize();
      const ex = 2 / (s.n || 2);
      const g = s.gap || 0;
      for (let k = 0; k < RS; k++) {
        const ang = open ? PI / 2 + g + (PI * 2 - 2 * g) * (k / segs) : (k / segs) * PI * 2 + (o.phase || 0);
        const c = cos(ang), sn = sin(ang);
        const lx = Math.sign(c) * Math.pow(abs(c), ex) * s.rx;
        const ext = sn > 0 ? (s.fz || 0) * sn * sn : (s.bz || 0) * sn * sn;
        const ly = Math.sign(sn) * Math.pow(abs(sn), ex) * (s.ry + ext);
        tmp.copy(s.p).addScaledVector(A, lx + (s.ox || 0)).addScaledVector(B, ly + (s.oy || 0));
        pos[(i * RS + k) * 3] = tmp.x; pos[(i * RS + k) * 3 + 1] = tmp.y; pos[(i * RS + k) * 3 + 2] = tmp.z;
      }
    }
    for (let i = 0; i < N - 1; i++) {
      for (let k = 0; k < segs; k++) {
        if (o.cut && o.cut(i, k, ((k + 0.5) / segs) * PI * 2 + (o.phase || 0))) continue;
        const k2 = open ? k + 1 : (k + 1) % segs;
        const a = i * RS + k, b = i * RS + k2, c = (i + 1) * RS + k, d = (i + 1) * RS + k2;
        idx.push(a, c, b, b, c, d);
      }
    }
    let vc = N * RS;
    if (o.close0 && !open) {
      const ci = vc++;
      pos[ci * 3] = st[0].p.x; pos[ci * 3 + 1] = st[0].p.y; pos[ci * 3 + 2] = st[0].p.z;
      for (let k = 0; k < segs; k++) idx.push(ci, k, (k + 1) % segs);
    }
    if (o.close1 && !open) {
      const ci = vc++;
      const L = st[N - 1].p;
      pos[ci * 3] = L.x; pos[ci * 3 + 1] = L.y; pos[ci * 3 + 2] = L.z;
      const b0 = (N - 1) * RS;
      for (let k = 0; k < segs; k++) idx.push(ci, b0 + ((k + 1) % segs), b0 + k);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(vc * 3 === pos.length ? pos : pos.slice(0, vc * 3), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  /** Meia-largura x → ângulo de abertura frontal de um anel superelíptico. */
  function gapFor(hw, rx, n) { if (hw <= 0) return 0; const c = Math.min(1, Math.pow(hw / rx, (n || 2) / 2)); return PI / 2 - Math.acos(c); }
  R.tubeGeo = tubeGeo;
  /** Arredonda uma ponta do tubo (acrescenta estações em quarto de círculo). */
  function roundEnd(st, end, steps, k) {
    steps = steps || 4; k = k == null ? 1 : k;
    const i0 = end ? st.length - 1 : 0, i1 = end ? st.length - 2 : 1;
    const s0 = st[i0];
    const dir = s0.p.clone().sub(st[i1].p).normalize();
    const r = Math.max(s0.rx, s0.ry) * k;
    const add = [];
    for (let j = 1; j <= steps; j++) {
      const f = (j / (steps + 0.35)) * PI * 0.5;
      add.push(Object.assign({}, s0, { p: s0.p.clone().addScaledVector(dir, r * sin(f)), rx: s0.rx * cos(f), ry: s0.ry * cos(f), fz: (s0.fz || 0) * cos(f), bz: (s0.bz || 0) * cos(f) }));
    }
    if (end) st.push(...add); else st.unshift(...add.reverse());
    return st;
  }
  R.roundEnd = roundEnd;
  /** Esfera achatada pronta para o balde. */
  function ballGeo(rx, ry, rz, ws, hs) {
    const g = new T.SphereGeometry(1, ws || 14, hs || 10);
    g.scale(rx, ry, rz);
    g.computeVertexNormals();
    return g;
  }
  const mat4 = (pos, rot, scl) => {
    const m = new T.Matrix4();
    const q = new T.Quaternion().setFromEuler(new T.Euler(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0));
    m.compose(new V3(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0), q, scl ? new V3(scl[0], scl[1], scl[2]) : new V3(1, 1, 1));
    return m;
  };
  R.mat4 = mat4;
  // curva de Bézier quadrática/cúbica → pontos
  function bez(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), u = 1 - t;
      if (p3) out.push(new V3().addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * t).addScaledVector(p2, 3 * u * t * t).addScaledVector(p3, t * t * t));
      else out.push(new V3().addScaledVector(p0, u * u).addScaledVector(p1, 2 * u * t).addScaledVector(p2, t * t));
    }
    return out;
  }
  R.bez = bez;
  /** Mecha/forma afilada ao longo de pontos: largura w, espessura th, perfil (0 base → 1 ponta). */
  function lockGeo(pts, w, th, o) {
    o = o || {};
    const st = pts.map((p, i) => {
      const t = i / (pts.length - 1);
      const prof = o.profile ? o.profile(t) : Math.pow(sin(Math.min(1, t * 0.85 + 0.15) * PI), 0.7) * (1 - t * 0.15);
      return { p, rx: Math.max(0.0004, w * prof), ry: Math.max(0.0003, th * prof), n: o.n || 2, up: o.ups ? o.ups[i] : null };
    });
    return tubeGeo(st, { segs: o.segs || 8, up: o.up, close0: true, close1: true });
  }
  R.lockGeo = lockGeo;

  // ------------------------------------------------------------------
  // Cabeça esculpida: esfera deformada (crânio, mandíbula, queixo, bochechas)
  // ------------------------------------------------------------------
  function headShape(spec) {
    const fem = !!spec.female;
    const f = spec.face || {};
    return {
      r: 0.172 * (spec.headScale || 1),
      w: f.w || (fem ? 0.97 : 1),
      jaw: f.jaw == null ? (fem ? 0.2 : 0.13) : f.jaw,
      chin: f.chin == null ? (fem ? 0.35 : 0.55) : f.chin,
      jawLen: f.jawLen == null ? (fem ? 0.35 : 0.55) : f.jawLen,
      cheek: f.cheek == null ? 1 : f.cheek,
      fem: fem ? 1 : 0,
    };
  }
  const JAW_M = keys0([[-1, 0.5], [-0.86, 0.66], [-0.62, 0.84], [-0.35, 0.92], [0, 0.96], [0.45, 0.97], [1, 0.92]]);
  const JAW_F = keys0([[-1, 0.42], [-0.86, 0.58], [-0.62, 0.76], [-0.35, 0.88], [0, 0.95], [0.45, 0.97], [1, 0.92]]);
  function keys0(pts) {
    return function (x) {
      if (x <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const a = pts[i - 1], b = pts[i], t = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t); }
      return pts[pts.length - 1][1];
    };
  }
  function headPoint(d, hs, out) {
    const x0 = d.x, y0 = d.y, z0 = d.z;
    const front = Math.max(0, z0);
    // perfil de largura: mandíbula (mais quadrada no homem), queixo afinando
    const wy = (hs.fem ? JAW_F(y0) : JAW_M(y0));
    const fw = lerp(1, wy, 0.35 + 0.65 * smooth(-0.6, 0.6, z0)); // atrás da cabeça não afina tanto
    let x = x0 * hs.w * fw;
    let y = y0 * 1.07;
    let z = z0;
    const low = smooth(0.05, -0.95, y0);
    y -= hs.jawLen * low * 0.07;
    // queixo para frente e levemente quadrado
    z += hs.chin * smooth(-0.45, -0.92, y0) * front * front * 0.13;
    // plano do rosto (mais achatado na frente) e laterais do crânio
    z *= 1 - 0.07 * smooth(0.55, 1, z0) * smooth(-0.6, 0.5, y0);
    x *= 1 - 0.05 * smooth(0.45, 0.95, abs(x0)) * smooth(-0.2, 0.6, y0);
    // arco das sobrancelhas
    z += 0.018 * Math.exp(-((y0 - 0.2) ** 2) / 0.012) * smooth(0.75, 0.98, z0);
    // maçãs do rosto
    const cx = abs(x0) - 0.58, cy = y0 + 0.16, cz = z0 - 0.74;
    const ch = Math.exp(-(cx * cx + cy * cy + cz * cz) / 0.05) * hs.cheek;
    // nuca/occipital mais cheio
    z -= 0.07 * smooth(0.1, -0.9, z0) * smooth(-0.45, 0.45, y0);
    y += 0.02 * smooth(0.2, -0.9, z0) * smooth(0.3, 1, y0);
    const s = 1 + ch * 0.045;
    out.set(x * s * hs.r, y * s * hs.r, z * s * hs.r);
    return out;
  }
  function headNormal(d, hs, out) {
    const e = 0.01, p = new V3(), p1 = new V3(), p2 = new V3(), t1 = new V3(), t2 = new V3(), dd = new V3();
    headPoint(d, hs, p);
    t1.set(0, 1, 0).cross(d); if (t1.lengthSq() < 1e-6) t1.set(1, 0, 0); t1.normalize();
    t2.crossVectors(d, t1).normalize();
    headPoint(dd.copy(d).addScaledVector(t1, e).normalize(), hs, p1);
    headPoint(dd.copy(d).addScaledVector(t2, e).normalize(), hs, p2);
    out.crossVectors(p1.sub(p), p2.sub(p)).normalize();
    if (out.dot(d) < 0) out.negate();
    return out;
  }
  const headCache = {};
  function headGeo(hs) {
    const key = JSON.stringify(hs);
    if (headCache[key]) return headCache[key];
    const g = new T.SphereGeometry(1, 48, 36);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const d = new V3(), p = new V3(), n = new V3();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      headPoint(d, hs, p); headNormal(d, hs, n);
      pos.setXYZ(i, p.x, p.y, p.z); nor.setXYZ(i, n.x, n.y, n.z);
    }
    headCache[key] = g;
    return g;
  }
  /** Superfície frontal do rosto: dado (x,y) devolve ponto e normal (tabela pré-calculada). */
  const surfCache = {};
  function faceSurf(hs) {
    const key = JSON.stringify(hs);
    if (surfCache[key]) return surfCache[key];
    const X0 = -0.17, X1 = 0.17, Y0 = -0.21, Y1 = 0.19, NX = 35, NY = 41;
    const P = new Float32Array(NX * NY * 3), Nn = new Float32Array(NX * NY * 3);
    const d = new V3(), p = new V3(), n = new V3();
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const x = X0 + (X1 - X0) * i / (NX - 1), y = Y0 + (Y1 - Y0) * j / (NY - 1);
      d.set(x / hs.r, y / hs.r, 0);
      d.z = Math.sqrt(Math.max(0.03, 1 - d.x * d.x - d.y * d.y)); d.normalize();
      for (let it = 0; it < 10; it++) {
        headPoint(d, hs, p);
        d.x += ((x - p.x) / hs.r) * 0.85; d.y += ((y - p.y) / hs.r) * 0.85;
        d.z = Math.sqrt(Math.max(0.03, 1 - d.x * d.x - d.y * d.y)); d.normalize();
      }
      headPoint(d, hs, p); headNormal(d, hs, n);
      const o = (j * NX + i) * 3;
      P[o] = p.x; P[o + 1] = p.y; P[o + 2] = p.z; Nn[o] = n.x; Nn[o + 1] = n.y; Nn[o + 2] = n.z;
    }
    const f = function (x, y, outP, outN) {
      const fx = clamp((x - X0) / (X1 - X0) * (NX - 1), 0, NX - 1.001), fy = clamp((y - Y0) / (Y1 - Y0) * (NY - 1), 0, NY - 1.001);
      const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
      const o00 = (j * NX + i) * 3, o10 = o00 + 3, o01 = o00 + NX * 3, o11 = o01 + 3;
      const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
      outP.set(x, y, P[o00 + 2] * w00 + P[o10 + 2] * w10 + P[o01 + 2] * w01 + P[o11 + 2] * w11);
      if (outN) outN.set(Nn[o00] * w00 + Nn[o10] * w10 + Nn[o01] * w01 + Nn[o11] * w11, Nn[o00 + 1] * w00 + Nn[o10 + 1] * w10 + Nn[o01 + 1] * w01 + Nn[o11 + 1] * w11, Nn[o00 + 2] * w00 + Nn[o10 + 2] * w10 + Nn[o01 + 2] * w01 + Nn[o11 + 2] * w11).normalize();
      return outP;
    };
    surfCache[key] = f;
    return f;
  }
  R.headPoint = headPoint;

  // ------------------------------------------------------------------
  // Cabelos: "casca" sobre o crânio com linha de cabelo esfumada (sem
  // cara de capacete) + mechas. Tudo no espaço do crânio.
  // ------------------------------------------------------------------
  /** Interpolação suave por pontos-chave [[x,y],...] (x crescente). */
  function keys(pts) {
    return function (x) {
      if (x <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        if (x <= pts[i][0]) {
          const a = pts[i - 1], b = pts[i];
          const t = (x - a[0]) / (b[0] - a[0]);
          return a[1] + (b[1] - a[1]) * t * t * (3 - 2 * t);
        }
      }
      return pts[pts.length - 1][1];
    };
  }
  // ruído suave barato (soma de senos)
  function snoise(x, y, z) {
    return (sin(x * 1.7 + y * 2.3 + 1.1) * sin(y * 1.9 - z * 2.1 + 0.4) + sin(z * 2.7 + x * 1.3 + 2.2) * 0.6 + sin((x - z) * 3.1 + y * 0.7) * 0.4) / 2;
  }
  /**
   * def: {lo(phi)→elev mín, hi?(phi)→elev máx, feather, thick(e,phi,d), comb(d)→coord. de fios, freq, groove,
   *       base, dark, light, skin, lump, edgeSkin}
   * phi: 0 = frente, + = lado esquerdo (+X). e: elevação (rad).
   */
  function hairShell(hs, def, bucket) {
    const NT = def.nt || 46, NP = def.np || 120, thMax = def.thetaMax || 2.25;
    const verts = [], qs = [];
    const d = new V3(), S = new V3(), Nn = new V3();
    const cBase = col(def.base), cDark = col(def.dark || def.base), cLight = col(def.light || def.base), cSkin = col(def.skin || '#d59c70');
    const colors = [];
    const freq = def.freq || 20, gA = def.groove == null ? 0.22 : def.groove;
    const ramp = def.ramp || 0.016, wv = def.warp == null ? 0.35 : def.warp, fineK = def.fineK == null ? 0.07 : def.fineK;
    const occ = def.occ == null ? 1 : def.occ;
    for (let i = 0; i <= NT; i++) {
      const th = (i / NT) * thMax;
      for (let j = 0; j < NP; j++) {
        const ph = (j / NP) * PI * 2 - PI;
        d.set(sin(th) * sin(ph), cos(th), sin(th) * cos(ph));
        const e = PI / 2 - th;
        const fe = def.feather || 0.12;
        // distância "com sinal" até a linha do cabelo (em unidades de esfumado): contínua dos dois lados
        let q;
        if (def.qfn) q = def.qfn(d, e, ph);
        else {
          q = (e - def.lo(ph, e)) / fe;
          if (def.hi) q = Math.min(q, (def.hi(ph, e) - e) / fe);
        }
        const m = smooth(0, 1, q);
        headPoint(d, hs, S); headNormal(d, hs, Nn);
        const cm = def.comb ? def.comb(d, e, ph) : Math.atan2(d.y, d.x);
        // mechas largas (topo cheio, vale estreito) + fios finos só na cor
        const u = cm * freq + snoise(d.x * 2.6 + 1.7, d.y * 2.6, d.z * 2.6) * wv * 2;
        const cl = abs(sin(u * 0.5));
        const clump = 1 - Math.pow(1 - cl, 2.6);
        const fine = sin(u * 1.6 + 1.3) * 0.6 + sin(u * 0.73 + 0.7) * 0.4;
        const lump = def.lump ? snoise(d.x * 3.2, d.y * 3.2, d.z * 3.2) * def.lump + (def.curl ? (snoise(d.x * 9, d.y * 9, d.z * 9) * 0.6 + snoise(d.x * 17 + 3, d.y * 17, d.z * 17) * 0.4) * def.curl : 0) : 0;
        const t = Math.max(0, def.thick(e, ph, d) * (0.45 + 0.55 * m) * (1 + gA * (clump - 0.85) * 1.4 + lump));
        const off = Math.min(q * ramp, t + 0.0018);
        verts.push(S.x + Nn.x * off, S.y + Nn.y * off, S.z + Nn.z * off);
        qs.push(q);
        // cor: vales escuros estreitos, fios finos, mechas claras, sombra embaixo, esfumado TOTAL para a pele na borda
        const c = cBase.clone().lerp(cDark, (1 - clump) * 0.55);
        c.multiplyScalar(1 + fineK * fine);
        const st = 0.5 + 0.5 * sin(u * 0.29 + sin(u * 0.11) * 2.1 + (def.seed || 0));
        c.lerp(cLight, smooth(0.5, 1, st) * 0.42 * clump);
        c.lerp(cDark, 0.32 * occ * smooth(0.35, -0.55, d.y));
        if (def.curl) c.multiplyScalar(1 + lump * 0.9);
        if (def.tint) def.tint(c, d, e, ph, m);
        c.lerp(cSkin, 1 - smooth(0.0, def.edgeSkin == null ? 0.9 : def.edgeSkin, q));
        colors.push(c);
      }
    }
    const idx = [];
    for (let i = 0; i < NT; i++) {
      for (let j = 0; j < NP; j++) {
        const a = i * NP + j, b = i * NP + ((j + 1) % NP), c = (i + 1) * NP + j, dd = (i + 1) * NP + ((j + 1) % NP);
        if (Math.max(qs[a], qs[b], qs[c], qs[dd]) < -0.4) continue;
        idx.push(a, c, b, b, c, dd);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    bucket.add(g, { color: (p, n, l, i) => colors[i], region: REG.hair });
  }
  /** Ponto na casca do cabelo numa direção (para prender mechas). */
  function onHead(hs, ph, e, lift, out) {
    const d = new V3(cos(e) * sin(ph), sin(e), cos(e) * cos(ph));
    const p = headPoint(d, hs, out || new V3());
    const n = headNormal(d, hs, new V3());
    p.addScaledVector(n, lift || 0);
    return { p, n, d };
  }
  /** Cor de mecha (tubo achatado): face de fora mais clara, bordas e lado de dentro mais escuros, fios ao longo. */
  function lockColor(colr, segs, o) {
    o = o || {};
    const cc = col(colr), cd = M.mix(colr, '#000', o.dark == null ? 0.38 : o.dark), cl = M.mix(colr, o.lightTo || '#ffffff', o.light == null ? 0.16 : o.light);
    return (p, n, l, i) => {
      const k = i % segs, a = (k / segs) * PI * 2;
      const out = sin(a), side = abs(cos(a));
      const c = cc.clone().lerp(cd, smooth(0.2, -0.8, out) * 0.8 + side * 0.25);
      if (out > 0) c.lerp(cl, smooth(0.3, 0.95, out) * 0.5 * (0.6 + 0.4 * sin(k * 2.1 + Math.floor(i / segs) * 0.35)));
      return c;
    };
  }
  /** Mecha: começa em (ph,e) e vai na direção dada (vetor no espaço do crânio). */
  function addLock(bucket, hs, o, colr) {
    const a = onHead(hs, o.ph, o.e, o.lift == null ? 0.01 : o.lift);
    const dir = new V3(o.dir[0], o.dir[1], o.dir[2]).normalize();
    const L = o.len;
    const p0 = a.p.clone().addScaledVector(dir, -L * 0.15);
    const p1 = a.p.clone().addScaledVector(dir, L * 0.35).addScaledVector(a.n, (o.arc || 0.4) * L * 0.25);
    const g = new V3(0, -1, 0);
    const p2 = a.p.clone().addScaledVector(dir, L * 0.8).addScaledVector(g, (o.droop || 0) * L).addScaledVector(a.n, (o.arc || 0.4) * L * 0.1);
    const p3 = a.p.clone().addScaledVector(dir, L).addScaledVector(g, (o.droop || 0) * L * 1.6).addScaledVector(a.n, (o.tipOut || 0) * L);
    let pts = bez(p0, p1, p2, p3, o.n || 10);
    let ups = null;
    if (o.follow) {
      // gruda na cabeça: projeta cada ponto na superfície + altura que diminui até a ponta
      const dd = new V3(), sp = new V3(), nn = new V3();
      ups = [];
      pts = pts.map((p, i) => {
        const t = i / (pts.length - 1);
        dd.copy(p).normalize();
        headPoint(dd, hs, sp); headNormal(dd, hs, nn);
        ups.push(nn.clone());
        return sp.clone().addScaledVector(nn, (o.lift || 0.01) * (1 - t * 0.55) + (o.tipOut || 0) * L * t * t);
      });
    }
    const geo = lockGeo(pts, o.w, o.th || o.w * 0.45, { up: a.n, ups, segs: 8, profile: o.profile });
    bucket.add(geo, { color: lockColor(colr || '#333', 8, o.shade), region: REG.hair });
  }
  /**
   * "Saia" de cabelo comprido/chanel: superfície contínua com espessura que nasce
   * por baixo da casca, desce colada no crânio até a parte mais larga e cai na
   * vertical (abrindo sobre os ombros), com sulcos de mechas e pontas irregulares.
   * o: {a0, a1 (ângulos: 0 = frente; o arco passa por trás), eTop, y1(ph), lift, th, flare(ph,t), fwd(ph,t), inK, tipK, freq, seed}
   */
  function hairSkirt(hs, hb, c, o) {
    const NA = o.na || 56, NH = o.nh || 7, NV = 12, NR = NH + NV + 1;
    const a0 = o.a0, a1 = o.a1; // a0 < a1, ex.: 1.15 → 2π-1.15 (passando por π = atrás)
    const cc = col(c), cd = M.mix(c, '#000', 0.36), cl = M.mix(c, o.lightTo || '#c08a5a', o.light == null ? 0.3 : o.light);
    const outer = [], inner = [], colsO = [], colsI = [];
    const d = new V3(), S = new V3(), N = new V3();
    const r = M.rng(o.seed || 3);
    const tipJ = [];
    for (let j = 0; j <= NA; j++) tipJ.push(r());
    for (let j = 0; j <= NA; j++) {
      const ph = lerp(a0, a1, j / NA);
      const u = (j / NA) * (o.freq || 16) * PI * 2;
      const clump = 1 - Math.pow(1 - abs(sin(u * 0.5)), 2.2);
      const edge = Math.min(j, NA - j) / NA; // 0 nas pontas do arco
      const side = abs(sin(ph));
      const yEnd = o.y1(ph) - (o.tipK == null ? 0.035 : o.tipK) * (clump * 0.7 + tipJ[j] * 0.3) * smooth(0, 0.08, edge);
      let last = null;
      for (let i = 0; i < NR; i++) {
        let P, nrm;
        if (i <= NH) {
          const e = lerp(o.eTop == null ? 0.42 : o.eTop, o.eMid == null ? -0.04 : o.eMid, Math.pow(i / NH, 0.8));
          d.set(cos(e) * sin(ph), sin(e), cos(e) * cos(ph));
          headPoint(d, hs, S); headNormal(d, hs, N);
          const lift = i === 0 ? 0.003 : (o.lift || 0.02) * (0.8 + 0.2 * i / NH) + 0.004 * clump;
          P = S.clone().addScaledVector(N, lift); nrm = N.clone();
          last = P.clone();
        } else {
          const t = (i - NH) / NV;
          const y = lerp(last.y, yEnd, t);
          const out = new V3(sin(ph), 0, cos(ph));
          const fl = (o.flare ? o.flare(ph, t) : 0.02 * t) + 0.004 * clump - (o.inK || 0) * Math.pow(t, 3);
          P = new V3(last.x + out.x * fl, y, last.z + out.z * fl + (o.fwd ? o.fwd(ph, t) : 0));
          nrm = out;
        }
        outer.push(P);
        const th = (o.th || 0.014) * (0.35 + 0.65 * smooth(0, 0.06, edge)) * (i === NR - 1 ? 0.3 : 1);
        inner.push(P.clone().addScaledVector(nrm, -th));
        const v = i / (NR - 1);
        const k = cc.clone().lerp(cd, (1 - clump) * 0.5 + 0.18 * smooth(0.3, 1, v));
        k.lerp(cl, clump * (0.3 * Math.exp(-((v - 0.2) ** 2) / 0.03) + 0.12));
        colsO.push(k);
        colsI.push(cd.clone().multiplyScalar(0.85));
      }
    }
    const pos = [], idx = [], cols = [];
    outer.forEach((p, i) => { pos.push(p.x, p.y, p.z); cols.push(colsO[i]); });
    inner.forEach((p, i) => { pos.push(p.x, p.y, p.z); cols.push(colsI[i]); });
    const off = outer.length;
    const at = (j, i) => j * NR + i;
    for (let j = 0; j < NA; j++) for (let i = 0; i < NR - 1; i++) {
      const A = at(j, i), B2 = at(j + 1, i), C = at(j, i + 1), D2 = at(j + 1, i + 1);
      idx.push(A, C, B2, B2, C, D2);
      idx.push(off + A, off + B2, off + C, off + B2, off + D2, off + C);
    }
    for (let j = 0; j < NA; j++) { const A = at(j, NR - 1), B2 = at(j + 1, NR - 1); idx.push(A, off + A, B2, B2, off + A, off + B2); }
    [0, NA].forEach((j) => { for (let i = 0; i < NR - 1; i++) { const A = at(j, i), C = at(j, i + 1); if (j === 0) idx.push(A, off + A, C, C, off + A, off + C); else idx.push(A, C, off + A, C, off + C, off + A); } });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    hb.add(g, { color: (p, n, l, i) => cols[i], region: REG.hair });
  }
  const lum = (c) => { const k = col(c); return 0.3 * k.r + 0.59 * k.g + 0.11 * k.b; };
  const HAIR = {};
  HAIR.grisalho = (hs, hb, c, sk) => {
    // entradas fundas em "M", topo ralo (pele aparecendo) penteado para trás, laterais curtas e cheias
    const lo = keys([[0, 0.84], [0.16, 0.87], [0.34, 1.04], [0.5, 1.03], [0.66, 0.74], [0.82, 0.46], [0.98, 0.18], [1.08, -0.08], [1.18, -0.12], [1.3, 0.16], [1.6, 0.24], [1.86, 0.1], [2.15, -0.26], [2.6, -0.44], [PI, -0.5]]);
    const sk2 = col(sk);
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.17,
      thick: (e, ph, d) => {
        const side = smooth(0.35, 0.85, abs(d.x));
        const top = smooth(0.78, 0.97, d.y);
        return lerp(0.0075, 0.0135, side) * (1 - top * 0.45) + 0.0035 * smooth(0.55, 0.85, d.y) * smooth(0.0, 0.6, d.z);
      },
      comb: (d) => Math.atan2(d.x, d.y + 1.3), freq: 58, groove: 0.16, lump: 0.02, seed: 1.3, warp: 0.25, fineK: 0.09,
      base: c, dark: M.mix(c, '#4c4954', 0.55), light: M.mix(c, '#ffffff', 0.28), skin: sk,
      tint: (cc, d) => {
        cc.lerp(sk2, 0.2 * smooth(0.82, 0.97, d.y) * smooth(-0.45, 0.3, d.z)); // ralo no topo
        cc.lerp(col('#6f6b76'), 0.22 * smooth(0.15, -0.35, d.y)); // grisalho mais escuro embaixo (sal e pimenta)
      },
    }, hb);
  };
  HAIR.curto = (hs, hb, c, sk) => {
    const lo = keys([[0, 0.86], [0.35, 0.9], [0.62, 0.9], [0.86, 0.6], [1.05, 0.16], [1.16, -0.18], [1.28, 0.08], [1.6, 0.2], [1.85, 0.06], [2.3, -0.35], [PI, -0.46]]);
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.11,
      thick: (e, ph, d) => lerp(0.01, 0.024, smooth(0.25, 0.85, d.y)) + 0.007 * smooth(0.55, 0.8, d.y) * smooth(0.2, 0.75, d.z) * smooth(0.45, -0.2, d.x),
      comb: (d) => Math.atan2(d.x + 0.25, d.y + 1.4) * 1.0 + d.z * 0.15, freq: 52, groove: 0.22, lump: 0.04, warp: 0.4,
      base: c, dark: M.mix(c, '#000', 0.4), light: M.mix(c, lum(c) > 0.5 ? '#ffffff' : '#c89a6a', 0.25), skin: sk,
    }, hb);
  };
  HAIR.raspado = (hs, hb, c, sk) => {
    const lo = keys([[0, 0.88], [0.6, 0.9], [0.86, 0.6], [1.05, 0.16], [1.16, -0.1], [1.28, 0.1], [1.6, 0.2], [1.85, 0.06], [2.3, -0.3], [PI, -0.42]]);
    hairShell(hs, { lo: (ph) => lo(abs(ph)), feather: 0.09, thick: () => 0.0042, comb: (d) => Math.atan2(d.x, d.y + 1.3), freq: 140, groove: 0.05, warp: 0.8, fineK: 0.12, occ: 0.4, base: c, dark: M.mix(c, '#000', 0.25), light: M.mix(c, '#ffffff', 0.08), skin: sk, edgeSkin: 0.8, tint: (cc) => cc.lerp(col(sk), 0.18) }, hb);
  };
  HAIR.baguncado = (hs, hb, c, sk) => {
    const lo = keys([[0, 0.62], [0.4, 0.66], [0.8, 0.56], [1.04, 0.2], [1.16, -0.16], [1.29, 0.1], [1.6, 0.21], [1.9, 0.04], [2.3, -0.38], [PI, -0.48]]);
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.1,
      thick: (e, ph, d) => lerp(0.02, 0.032, smooth(0.15, 0.85, d.y)),
      comb: (d) => Math.atan2(d.x, d.z + 0.6), freq: 16, groove: 0.3, lump: 0.14, seed: 3,
      base: c, dark: M.mix(c, '#000', 0.35), light: M.mix(c, '#8a5a3a', 0.35), skin: sk,
    }, hb);
    // franja e mechas espetadas (bagunçado mas com estilo)
    const L = [
      { ph: -0.42, e: 0.98, dir: [-0.35, -0.55, 1], len: 0.075, w: 0.026, droop: 0.3, arc: 0.55 },
      { ph: -0.08, e: 1.04, dir: [0.05, -0.5, 1], len: 0.085, w: 0.03, droop: 0.32, arc: 0.55 },
      { ph: 0.3, e: 1.0, dir: [0.4, -0.55, 1], len: 0.075, w: 0.026, droop: 0.28, arc: 0.55 },
      { ph: 0.66, e: 0.86, dir: [0.75, -0.7, 0.5], len: 0.06, w: 0.022, droop: 0.2, arc: 0.45 },
      { ph: -0.72, e: 0.86, dir: [-0.75, -0.7, 0.5], len: 0.06, w: 0.022, droop: 0.2, arc: 0.45 },
      { ph: -0.25, e: 1.32, dir: [-0.3, 0.45, 0.8], len: 0.07, w: 0.03, tipOut: 0.12, arc: 0.4 },
      { ph: 0.45, e: 1.28, dir: [0.55, 0.45, 0.4], len: 0.065, w: 0.028, tipOut: 0.12, arc: 0.4 },
      { ph: -0.95, e: 1.2, dir: [-0.7, 0.35, 0.1], len: 0.06, w: 0.026, tipOut: 0.1, arc: 0.35 },
      { ph: 2.7, e: 1.18, dir: [0.25, 0.5, -0.8], len: 0.06, w: 0.026, tipOut: 0.12, arc: 0.35 },
      { ph: 1.5, e: 1.05, dir: [0.7, 0.2, -0.6], len: 0.055, w: 0.024, tipOut: 0.08, arc: 0.3 },
      { ph: -1.5, e: 1.05, dir: [-0.7, 0.2, -0.6], len: 0.055, w: 0.024, tipOut: 0.08, arc: 0.3 },
    ];
    L.forEach((o) => addLock(hb, hs, Object.assign({ lift: 0.012 }, o), M.hex(M.mix(c, '#5a3a2a', 0.12))));
  };
  HAIR.cacheado = (hs, hb, c, sk) => {
    // volume crespo/cacheado: casca grossa e "fofa" (ruído de cachos) + cachinhos soltos na silhueta
    const lo = keys([[0, 0.72], [0.5, 0.72], [0.9, 0.42], [1.1, 0.0], [1.3, 0.08], [1.6, 0.12], [1.9, -0.05], [2.3, -0.4], [PI, -0.5]]);
    const base = lum(c) < 0.12 ? M.hex(M.mix(c, '#5a4030', 0.25)) : c;
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.1, thick: (e, ph, d) => 0.03 + 0.012 * smooth(0.0, 0.8, d.y), comb: (d) => Math.atan2(d.x, d.z), freq: 10, groove: 0.05, lump: 0.08, curl: 0.42, warp: 1.2, fineK: 0.03, occ: 0.6,
      base, dark: M.mix(base, '#000', 0.45), light: M.mix(base, '#c09a7a', 0.3), skin: sk,
    }, hb);
    const r = M.rng(77);
    const cc = col(base);
    const g = ballGeo(1, 0.85, 0.85, 9, 7);
    for (let i = 0; i < 46; i++) {
      const y = 1 - (i + 0.5) / 46 * 1.4, rad = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
      const e = Math.asin(clamp(y, -1, 1)), ph = Math.atan2(rad * sin(a), rad * cos(a));
      if (e < lo(abs(ph)) + 0.16) continue;
      const q = onHead(hs, ph, e, 0.03 + 0.008 * smooth(0, 0.8, y));
      const s = 0.02 + r() * 0.009;
      const qq = new T.Quaternion().setFromUnitVectors(new V3(0, 1, 0), q.n);
      const kk = 0.95 + r() * 0.3;
      hb.add(g, { m: new T.Matrix4().compose(q.p, qq, new V3(s, s * 0.7, s)), color: (p, n) => cc.clone().multiplyScalar(kk * (0.8 + 0.35 * smooth(-0.4, 0.9, n.dot(q.n)))), region: REG.hair });
    }
  };
  HAIR.careca = (hs, hb, c, sk) => {
    const lo = keys([[0.6, 1.2], [0.92, 0.32], [1.04, -0.02], [1.13, -0.14], [1.26, -0.02], [1.42, 0.18], [1.65, 0.2], [1.9, 0.05], [2.3, -0.32], [PI, -0.42]]);
    const hi = keys([[0.6, 0.3], [0.95, 0.36], [1.1, 0.48], [1.5, 0.58], [2.2, 0.66], [PI, 0.7]]);
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), hi: (ph) => hi(abs(ph)), feather: 0.18, np: 140,
      thick: () => 0.0085, comb: (d) => Math.atan2(d.x, d.z) + d.y * 0.6, freq: 30, groove: 0.16, lump: 0.04, warp: 0.4, occ: 0.5,
      base: M.hex(M.mix(c, sk, 0.12)), dark: M.mix(c, '#000', 0.2), light: M.mix(c, '#b8b0a8', 0.4), skin: sk,
    }, hb);
  };
  HAIR.coque = (hs, hb, c, sk) => {
    const lo = keys([[0, 0.84], [0.5, 0.8], [0.88, 0.5], [1.08, 0.08], [1.18, -0.1], [1.32, 0.14], [1.6, 0.2], [1.9, 0.02], [2.4, -0.4], [PI, -0.48]]);
    const bunD = new V3(0, 0.5, -0.86).normalize();
    const light = lum(c) > 0.45;
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.1,
      thick: (e, ph, d) => lerp(0.009, 0.015, smooth(-0.1, 0.9, d.y)),
      comb: (d) => { const a = new V3().crossVectors(bunD, d); return Math.atan2(a.y, a.x); }, freq: 24, groove: 0.2, warp: 0.2,
      base: c, dark: M.mix(c, light ? '#5a525c' : '#2a2026', 0.45), light: M.mix(c, light ? '#ffffff' : '#b08a6a', light ? 0.5 : 0.2), skin: sk,
    }, hb);
    // coque com espiral
    const bp = bunD.clone().multiplyScalar(hs.r * 1.12);
    const cc = col(c), cd = M.mix(c, light ? '#6a626c' : '#3a3036', 0.35);
    const g = new T.SphereGeometry(0.068, 22, 16);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
      const a = Math.atan2(y, x), rr = Math.hypot(x, y);
      const s = 1 + 0.06 * cos(a * 3 + rr * 70);
      pp.setXYZ(i, x * s, y * s, z * 0.82);
    }
    g.computeVertexNormals();
    const q = new T.Quaternion().setFromUnitVectors(new V3(0, 0, 1), bunD);
    const m = new T.Matrix4().compose(bp, q, new V3(1, 1, 1));
    hb.add(g, { m, color: (p, n, l) => { const k = cos(Math.atan2(l.y, l.x) * 3 + Math.hypot(l.x, l.y) * 70); return cc.clone().lerp(cd, smooth(-0.2, 0.9, k) * 0.8); }, region: REG.hair });
    // prendedor
    const tg = new T.TorusGeometry(0.05, 0.007, 8, 24);
    hb.add(tg, { m: new T.Matrix4().compose(bp.clone().addScaledVector(bunD, -0.035), q, new V3(1, 1, 1)), color: col('#4a3a40'), region: REG.satin });
  };
  HAIR.rabo = (hs, hb, c, sk) => {
    HAIR.coque_base(hs, hb, c, sk);
    const a = onHead(hs, PI, 0.5, 0.012);
    const p0 = a.p.clone().add(new V3(0, 0.0, 0.0));
    // rabo de cavalo cheio (uma mecha grossa com sulcos) + mechinha por cima
    const pts = bez(p0.clone(), p0.clone().add(new V3(0, 0.035, -0.07)), p0.clone().add(new V3(0.005, -0.1, -0.095)), p0.clone().add(new V3(0.01, -0.25, -0.05)), 14);
    const tail = lockGeo(pts, 0.04, 0.034, { up: new V3(0, 0, -1), segs: 14, profile: (t) => Math.pow(sin(Math.min(1, t * 0.8 + 0.2) * PI), 0.6) * (1 + 0.15 * sin(t * PI)) });
    const cT = col(c), cTd = M.mix(c, '#000', 0.3), cTl = M.mix(c, lum(c) > 0.45 ? '#ffffff' : '#c08a5a', 0.25);
    hb.add(tail, { color: (p, n, l, i) => { const k = i % 14; const g2 = abs(sin(k * PI * 3 / 14)); return cT.clone().lerp(cTd, (1 - g2) * 0.5).lerp(cTl, g2 * 0.3); }, region: REG.hair });
    const tg = new T.TorusGeometry(0.02, 0.008, 8, 18);
    hb.add(tg, { m: mat4([p0.x, p0.y + 0.004, p0.z - 0.016], [0.5, 0, 0]), color: col('#c0394a'), region: REG.satin });
  };
  HAIR.coque_base = (hs, hb, c, sk) => {
    const lo = keys([[0, 0.84], [0.5, 0.8], [0.88, 0.5], [1.08, 0.08], [1.18, -0.1], [1.32, 0.14], [1.6, 0.2], [1.9, 0.02], [2.4, -0.4], [PI, -0.48]]);
    const tie = new V3(0, 0.48, -0.88).normalize();
    const light = lum(c) > 0.45;
    hairShell(hs, { lo: (ph) => lo(abs(ph)), feather: 0.1, thick: (e, ph, d) => lerp(0.01, 0.017, smooth(-0.1, 0.9, d.y)), comb: (d) => { const a = new V3().crossVectors(tie, d); return Math.atan2(a.y, a.x); }, freq: 24, groove: 0.2, warp: 0.2, base: c, dark: M.mix(c, light ? '#5a525c' : '#000', 0.4), light: M.mix(c, light ? '#ffffff' : '#b08a6a', light ? 0.5 : 0.2), skin: sk }, hb);
  };
  HAIR.longo = (hs, hb, c, sk) => {
    // risca lateral, volume no topo, cortina de mechas até os ombros e duas mechas emoldurando o rosto
    const lo = keys([[-PI, -0.62], [-2.2, -0.55], [-1.6, -0.42], [-1.25, -0.3], [-1.05, 0.12], [-0.8, 0.42], [-0.4, 0.66], [0, 0.78], [0.3, 0.8], [0.6, 0.66], [0.9, 0.36], [1.1, 0.06], [1.25, -0.3], [1.6, -0.42], [2.2, -0.55], [PI, -0.62]]);
    const part = new V3(0.32, 0.95, 0.12).normalize();
    hairShell(hs, {
      lo: (ph) => lo(ph), feather: 0.1, thetaMax: 2.3,
      thick: (e, ph, d) => 0.019 + 0.009 * smooth(0.0, 0.85, d.y) + 0.004 * smooth(0.5, -0.4, d.y),
      comb: (d) => { const a = new V3().crossVectors(part, d); return Math.atan2(a.y, a.x); }, freq: 22, groove: 0.05, lump: 0.01, warp: 0.25,
      base: c, dark: M.mix(c, '#000', 0.35), light: M.mix(c, '#c08a5a', 0.3), skin: sk,
    }, hb);
    hairSkirt(hs, hb, c, {
      a0: 1.12, a1: 2 * PI - 1.12, eTop: 1.08, eMid: -0.05, lift: 0.031, th: 0.016, freq: 15, seed: 21,
      y1: (ph) => -0.34 + 0.06 * Math.pow(abs(sin(ph)), 4),
      flare: (ph, t) => 0.012 * t + 0.05 * Math.pow(abs(sin(ph)), 3) * smooth(0.25, 0.7, t),
      fwd: (ph, t) => 0.025 * smooth(1.75, 1.2, abs(ph > PI ? 2 * PI - ph : ph)) * t * t,
    });
  };
  HAIR.chanel = (hs, hb, c, sk) => {
    // chanel com franja: franja cobre a testa até as sobrancelhas; mechas até o queixo, pontas para dentro
    const lo = keys([[0, 0.5], [0.4, 0.52], [0.7, 0.5], [0.95, 0.3], [1.1, -0.02], [1.24, -0.3], [1.6, -0.4], [PI, -0.55]]);
    hairShell(hs, {
      lo: (ph) => lo(abs(ph)), feather: 0.07, thetaMax: 2.35,
      thick: (e, ph, d) => 0.021 + 0.007 * smooth(0.1, 0.85, d.y) + 0.004 * smooth(0.5, 0.9, d.z) * smooth(0.75, 0.45, d.y),
      comb: (d) => Math.atan2(d.x, d.z + 0.15), freq: 30, groove: 0.06, warp: 0.25,
      base: c, dark: M.mix(c, '#000', 0.35), light: M.mix(c, '#ffffff', 0.2), skin: sk, edgeSkin: 0.5,
    }, hb);
    hairSkirt(hs, hb, c, {
      a0: 1.0, a1: 2 * PI - 1.0, eTop: 1.05, eMid: -0.02, lift: 0.032, th: 0.018, freq: 17, seed: 9, tipK: 0.014, lightTo: '#ffffff', light: 0.2,
      y1: () => -0.165, flare: (ph, t) => 0.01 * t, inK: 0.03,
    });
  };
  HAIR.nenhum = () => {};
  R.HAIR = HAIR;

  // ------------------------------------------------------------------
  // Olhos (globo com íris), pálpebras/sobrancelhas/boca dinâmicas
  // ------------------------------------------------------------------
  const eyeCache = {};
  function eyeGeo(re, iris) {
    const key = re.toFixed(4) + iris;
    if (eyeCache[key]) return eyeCache[key];
    const A = [PI, 2.6, 2.1, 1.6, 1.2, 0.95, 0.76, 0.705, 0.675, 0.64, 0.53, 0.42, 0.33, 0.315, 0.22, 0.12, 0.04];
    const st = A.map((a) => ({ p: new V3(0, 0, re * cos(a)), rx: Math.max(0.0002, re * sin(a)), ry: Math.max(0.0002, re * sin(a)) }));
    const g = tubeGeo(st, { segs: 26, up: new V3(0, 1, 0), close0: true, close1: true });
    // normais = radiais (esfera perfeita)
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) { _v.fromBufferAttribute(pos, i).normalize(); nor.setXYZ(i, _v.x, _v.y, _v.z); }
    const ci = col(iris), cl = M.mix(iris, '#ffffff', 0.3), cd = M.mix(iris, '#000000', 0.55);
    const scl = col('#f4efe9'), sclB = col('#d9cfc4'), pup = col('#0e0a0c'), limb = M.mix(iris, '#000', 0.75);
    const b = new Bucket();
    b.add(g, {
      region: REG.eye,
      color: (p, n, l) => {
        const a = Math.acos(clamp(l.z / re, -1, 1));
        if (a < 0.322) return pup;
        if (a < 0.66) { const t = (a - 0.322) / 0.338; return t < 0.45 ? cl.clone().lerp(ci, t / 0.45) : ci.clone().lerp(cd, (t - 0.45) / 0.55); }
        if (a < 0.69) return limb;
        return scl.clone().lerp(sclB, smooth(0.9, 2.2, a));
      },
    });
    const out = b.geometry(false);
    eyeCache[key] = out;
    return out;
  }

  /**
   * Rosto dinâmico: pálpebras (4), sobrancelhas (2) e boca numa só malha,
   * regenerada só quando os parâmetros mudam.
   */
  function makeFaceDyn(o) {
    const surf = o.surf;
    const NR = 6, NC = 13; // pálpebra: linhas × colunas
    const LIDV = (NR + 2) * NC;
    const BS = 9, BSEG = 6; // sobrancelha: estações × lados
    const BROWV = BS * BSEG + 2;
    const MS = 13, LSEG = 6; // boca: amostras, lados dos lábios
    const MOUTHV = MS * 2 * 3 + MS * LSEG * 2 + 4;
    const total = LIDV * 4 + BROWV * 2 + MOUTHV;
    const pos = new Float32Array(total * 3), colr = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const idx = [];
    let vi = 0;
    const setCol = (i, c, reg) => { colr[i * 3] = c.r; colr[i * 3 + 1] = c.g; colr[i * 3 + 2] = c.b; uv[i * 2] = regU(reg); uv[i * 2 + 1] = 0.5; };
    // --- pálpebras
    const lidBase = [];
    const skinLid = o.lidColor, lash = o.lashColor;
    for (let L = 0; L < 4; L++) {
      const b0 = vi; lidBase.push(b0);
      for (let r = 0; r < NR + 2; r++) for (let c = 0; c < NC; c++) {
        const isLash = r <= (o.fem ? 2 : 1);
        setCol(vi++, isLash ? lash : skinLid, isLash ? REG.hair : REG.skin);
      }
      const upper = L % 2 === 0;
      for (let r = 0; r < NR + 1; r++) for (let c = 0; c < NC - 1; c++) {
        const a = b0 + r * NC + c, b = a + 1, cc = a + NC, d = cc + 1;
        if (upper) idx.push(a, b, cc, b, d, cc); else idx.push(a, cc, b, b, cc, d);
      }
    }
    // --- sobrancelhas
    const browBase = [];
    for (let s = 0; s < 2; s++) {
      const b0 = vi; browBase.push(b0);
      for (let i = 0; i < BS * BSEG + 2; i++) setCol(vi++, o.browColor, REG.hair);
      for (let i = 0; i < BS - 1; i++) for (let k = 0; k < BSEG; k++) {
        const a = b0 + i * BSEG + k, b = b0 + i * BSEG + ((k + 1) % BSEG), c = a + BSEG, d = b + BSEG;
        idx.push(a, c, b, b, c, d);
      }
      const c0 = b0 + BS * BSEG, c1 = c0 + 1;
      for (let k = 0; k < BSEG; k++) { idx.push(c0, b0 + k, b0 + ((k + 1) % BSEG)); idx.push(c1, b0 + (BS - 1) * BSEG + ((k + 1) % BSEG), b0 + (BS - 1) * BSEG + k); }
    }
    // --- boca: interior (escuro), dentes de cima, dentes de baixo, lábio de cima, lábio de baixo
    const mb = vi;
    const cIn = col('#4a1418'), cIn2 = col('#7a2a2e'), cT = col('#f7f3ea');
    for (let i = 0; i < MS; i++) { setCol(vi++, cIn, REG.mouth); setCol(vi++, cIn2, REG.mouth); }
    const tb = vi;
    for (let i = 0; i < MS * 2; i++) setCol(vi++, cT, REG.teeth);
    const tb2 = vi;
    for (let i = 0; i < MS * 2; i++) setCol(vi++, cT, REG.teeth);
    const lu = vi;
    const cLine = o.lipLine || o.lipTop.clone().lerp(col('#2a0c10'), 0.55);
    const lipC = (base, k, upper) => { const c2 = cos((k / LSEG) * PI * 2) * (upper ? 1 : -1); return base.clone().lerp(cLine, smooth(0.2, 0.95, c2) * 0.85); };
    for (let i = 0; i < MS * LSEG; i++) setCol(vi++, lipC(o.lipTop, i % LSEG, true), REG.mouth);
    const ll = vi;
    for (let i = 0; i < MS * LSEG; i++) setCol(vi++, lipC(o.lipBot, i % LSEG, false), REG.mouth);
    const lc = vi; // tampas dos lábios
    for (let i = 0; i < 4; i++) setCol(vi++, o.lipTop, REG.mouth);
    const strip = (b) => { for (let i = 0; i < MS - 1; i++) { const a = b + i * 2, c = a + 2; idx.push(a, a + 1, c, c, a + 1, c + 1); } };
    strip(mb); strip(tb); strip(tb2);
    const tube = (b) => { for (let i = 0; i < MS - 1; i++) for (let k = 0; k < LSEG; k++) { const a = b + i * LSEG + k, bb = b + i * LSEG + ((k + 1) % LSEG), c = a + LSEG, d = bb + LSEG; idx.push(a, c, bb, bb, c, d); } };
    tube(lu); tube(ll);
    [[lu, lc], [ll, lc + 2]].forEach(([b, c]) => { for (let k = 0; k < LSEG; k++) { idx.push(c, b + k, b + ((k + 1) % LSEG)); idx.push(c + 1, b + (MS - 1) * LSEG + ((k + 1) % LSEG), b + (MS - 1) * LSEG + k); } });
    const geo = new T.BufferGeometry();
    const pA = new T.BufferAttribute(pos, 3); pA.setUsage(T.DynamicDrawUsage);
    geo.setAttribute('position', pA);
    geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(total * 3), 3));
    geo.setAttribute('color', new T.BufferAttribute(colr, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const mesh = new T.Mesh(geo, o.mat);
    mesh.castShadow = false; mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.name = 'faceDyn';
    // ---------- geradores
    const P = new V3(), N = new V3(), Q = new V3(), tmp = new V3();
    const put = (i, v) => { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; };
    function lid(L, eye, edge, arch, slope, upper) {
      // eye: {c, X, Y, F, rl, re, side}
      const b0 = lidBase[L];
      for (let c = 0; c < NC; c++) {
        const beta = -1.85 + (3.7 * c) / (NC - 1);
        const inner = -sin(beta) * eye.side;
        const eE = edge + arch * cos(beta * 0.85) * (upper ? 1 : -1) + slope * inner;
        for (let r = 0; r < NR + 2; r++) {
          let e, rad;
          if (r === 0) { e = eE + (upper ? -0.04 : 0.04); rad = eye.re * 1.0; }
          else { const f = (r - 1) / NR; e = upper ? lerp(eE, PI / 2 - 0.02, f * f * 0.9 + f * 0.1) : lerp(eE, -PI / 2 + 0.02, f * f * 0.9 + f * 0.1); rad = eye.rl; }
          const ce = cos(e);
          Q.set(0, 0, 0).addScaledVector(eye.X, ce * sin(beta) * rad).addScaledVector(eye.Y, sin(e) * rad).addScaledVector(eye.F, ce * cos(beta) * rad).add(eye.c);
          put(b0 + r * NC + c, Q);
        }
      }
    }
    function brow(s, eye, prm) {
      const b0 = browBase[s];
      const side = eye.side;
      const pts = [], ups = [];
      for (let i = 0; i < BS; i++) {
        const t = i / (BS - 1);
        const x = side * lerp(o.browIn - prm.furrow, o.browOut, t);
        const y = o.browY + lerp(prm.inner, prm.outer, t) + prm.arch * sin(PI * Math.pow(t, 0.75)) + (t < 0.15 ? -0.002 * (0.15 - t) / 0.15 : 0);
        surf(x, y, P, N);
        pts.push(P.clone().addScaledVector(N, 0.0032));
        ups.push(N.clone());
      }
      const TG = new V3(), A = new V3();
      for (let i = 0; i < BS; i++) {
        const t = i / (BS - 1);
        TG.subVectors(pts[Math.min(BS - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
        const B = ups[i];
        A.crossVectors(TG, B).normalize();
        const h = o.browH * lerp(1, o.browTaper, Math.pow(t, 1.2)) * (t < 0.08 ? 0.8 : 1), d = 0.0028;
        for (let k = 0; k < BSEG; k++) {
          const ang = (k / BSEG) * PI * 2;
          Q.copy(pts[i]).addScaledVector(A, cos(ang) * h * 0.5).addScaledVector(B, sin(ang) * d);
          put(b0 + i * BSEG + k, Q);
        }
      }
      put(b0 + BS * BSEG, pts[0]); put(b0 + BS * BSEG + 1, pts[BS - 1]);
    }
    const U = new Float32Array(MS), Lo = new Float32Array(MS), Xs = new Float32Array(MS);
    function mouth(m) {
      const w = o.mouthW * m.w;
      for (let i = 0; i < MS; i++) {
        const s = -1 + (2 * i) / (MS - 1);
        const ss = s * s;
        const corner = m.curve * (0.0135 * ss - 0.0042) + m.asym * 0.0075 * s + (m.wavy ? 0.0028 * sin(s * PI * 2.2) : 0);
        let up, lo;
        if (m.round > 0.01) {
          const rr = Math.sqrt(Math.max(0, 1 - ss));
          up = lerp(m.open * 0.009 * Math.pow(1 - ss, 0.6), m.open * 0.012 * rr, m.round);
          lo = lerp(m.open * 0.02 * Math.pow(1 - ss, 0.55), m.open * 0.014 * rr, m.round);
        } else {
          up = m.open * (0.007 + 0.005 * (1 - m.curve * 0.5)) * Math.pow(1 - ss, 0.45);
          lo = m.open * 0.026 * Math.pow(1 - ss, 0.6 + 0.3 * m.curve);
        }
        Xs[i] = s * w * (1 - 0.06 * m.press);
        U[i] = corner + up + m.press * 0.0008;
        Lo[i] = corner - lo - m.press * 0.0008;
      }
      const z0 = 0.0021, my = o.mouthY;
      // interior
      for (let i = 0; i < MS; i++) {
        const shrink = 0.92;
        surf(Xs[i] * shrink, my + U[i] - 0.0005, P, N); put(mb + i * 2, P.addScaledVector(N, z0));
        surf(Xs[i] * shrink, my + Lo[i] + 0.0005, P, N); put(mb + i * 2 + 1, P.addScaledVector(N, z0));
      }
      // dentes de cima / de baixo
      const th = Math.min(0.0075, m.teeth * 0.0085);
      for (let i = 0; i < MS; i++) {
        const s = -1 + (2 * i) / (MS - 1);
        const k = Math.pow(Math.max(0, 1 - Math.pow(abs(s) / 0.9, 6)), 0.5);
        const top = U[i] - 0.0006, bot = Math.max(Lo[i] + 0.0006, top - th * k);
        surf(Xs[i] * 0.86, my + top, P, N); put(tb + i * 2, P.addScaledVector(N, z0 + 0.0005));
        surf(Xs[i] * 0.86, my + bot, P, N); put(tb + i * 2 + 1, P.addScaledVector(N, z0 + 0.0005));
        const lt = Math.min(0.0045, (m.lowTeeth || 0) * 0.005) * k;
        const lb = Lo[i] + 0.0006, ltop = Math.min(top, lb + lt);
        surf(Xs[i] * 0.8, my + ltop, P, N); put(tb2 + i * 2, P.addScaledVector(N, z0 + 0.0004));
        surf(Xs[i] * 0.8, my + lb, P, N); put(tb2 + i * 2 + 1, P.addScaledVector(N, z0 + 0.0004));
      }
      // lábios (tubos achatados)
      const lipTube = (b, Y, hTop, cap) => {
        const pts = [], ns = [];
        for (let i = 0; i < MS; i++) { surf(Xs[i], my + Y[i], P, N); pts.push(P.clone().addScaledVector(N, z0 + 0.0016)); ns.push(N.clone()); }
        const TG = new V3(), A = new V3();
        for (let i = 0; i < MS; i++) {
          TG.subVectors(pts[Math.min(MS - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
          A.crossVectors(TG, ns[i]).normalize();
          const s = -1 + (2 * i) / (MS - 1);
          const taper = 0.45 + 0.55 * Math.pow(1 - s * s, 0.5);
          const h = hTop * taper, dd = 0.0022 * taper;
          for (let k = 0; k < LSEG; k++) {
            const ang = (k / LSEG) * PI * 2;
            tmp.copy(pts[i]).addScaledVector(A, cos(ang) * h).addScaledVector(ns[i], sin(ang) * dd);
            put(b + i * LSEG + k, tmp);
          }
        }
        put(cap, pts[0]); put(cap + 1, pts[MS - 1]);
      };
      lipTube(lu, U, o.lipUp, lc);
      lipTube(ll, Lo, o.lipLow * (1 + m.open * 0.2), lc + 2);
    }
    let lastKey = '';
    const api = {
      mesh,
      update(F) {
        const key = [F.lids.map((x) => x.toFixed(3)).join(','), F.brows.map((b) => b.inner.toFixed(4) + b.outer.toFixed(4) + b.arch.toFixed(4) + b.furrow.toFixed(4)).join(','), F.mouth.w.toFixed(3), F.mouth.open.toFixed(3), F.mouth.curve.toFixed(3), F.mouth.round.toFixed(3), F.mouth.teeth.toFixed(2), F.mouth.asym.toFixed(3), F.mouth.wavy.toFixed(2), F.mouth.press.toFixed(2), F.mouth.lowTeeth.toFixed(2), F.bags ? 1 : 0].join('|');
        if (key === lastKey) return false;
        lastKey = key;
        const E = o.eyes;
        // F.lids = [upR, lowR, upL, lowL, archUp, archLow, slopeR, slopeL]
        lid(0, E[0], F.lids[0], F.lids[4], F.lids[6], true);
        lid(1, E[0], F.lids[1], F.lids[5], 0, false);
        lid(2, E[1], F.lids[2], F.lids[4], F.lids[7], true);
        lid(3, E[1], F.lids[3], F.lids[5], 0, false);
        brow(0, E[0], F.brows[0]);
        brow(1, E[1], F.brows[1]);
        mouth(F.mouth);
        // olheiras (cansado): escurece as pálpebras de baixo
        const bc = F.bags ? o.bagColor : skinLid;
        [1, 3].forEach((L) => { for (let r = 2; r < NR + 2; r++) for (let c = 0; c < NC; c++) { const i = lidBase[L] + r * NC + c; const k = F.bags && r < 5 ? 1 : 0; const cc = k ? bc : skinLid; colr[i * 3] = cc.r; colr[i * 3 + 1] = cc.g; colr[i * 3 + 2] = cc.b; } });
        geo.attributes.color.needsUpdate = true;
        pA.needsUpdate = true;
        geo.computeVertexNormals();
        return true;
      },
    };
    return api;
  }

  // ------------------------------------------------------------------
  // Mãos com dedos (variações de pose), em espaço do osso da mão.
  // Mão direita: palma para +X (para o corpo), dedos para -Y, polegar para +Z.
  // ------------------------------------------------------------------
  const HAND_SHAPES = {
    relax: { f: [[0.28, 0.32], [0.36, 0.42], [0.42, 0.48], [0.5, 0.55]], spread: 0.04, thumb: { d: [0.35, -0.6, 0.7], curl: 0.25 } },
    fist: { f: [[1.5, 1.75], [1.55, 1.75], [1.55, 1.75], [1.5, 1.7]], spread: 0, thumb: { d: [0.8, -0.55, -0.05], curl: 0.35, at: [0.016, -0.03, 0.026] } },
    point: { f: [[0.02, 0.02], [1.5, 1.75], [1.55, 1.75], [1.5, 1.7]], spread: 0, thumb: { d: [0.8, -0.6, 0.05], curl: 0.3, at: [0.016, -0.032, 0.022] } },
    open: { f: [[0.04, 0.05], [0.02, 0.04], [0.04, 0.05], [0.06, 0.08]], spread: 0.11, thumb: { d: [0.1, -0.4, 1], curl: 0.05 } },
    grip: { f: [[0.85, 0.95], [0.95, 1.0], [1.0, 1.05], [1.05, 1.1]], spread: 0.02, thumb: { d: [0.55, -0.55, 0.55], curl: 0.3 } },
    pinch: { f: [[0.55, 0.6], [0.75, 0.8], [0.95, 1.0], [1.1, 1.2]], spread: 0.02, thumb: { d: [0.5, -0.75, 0.4], curl: 0.25 } },
    thumb: { f: [[1.5, 1.75], [1.55, 1.75], [1.55, 1.75], [1.5, 1.7]], spread: 0, thumb: { d: [0.12, -0.12, 1], curl: -0.05 } },
    flat: { f: [[0.06, 0.06], [0.05, 0.05], [0.06, 0.06], [0.08, 0.08]], spread: 0.02, thumb: { d: [0.15, -0.6, 0.75], curl: 0.02 } },
  };
  R.HAND_SHAPES = HAND_SHAPES;
  const handCache = {};
  function handGeo(side, shape, size, skin, long) {
    const key = side + shape + size.toFixed(3) + skin + (long ? 'L' : '');
    if (handCache[key]) return handCache[key];
    const sx = side === 'R' ? -1 : 1; // lado do corpo
    const pn = new V3(-sx, 0, 0); // normal da palma (para o corpo)
    const S = HAND_SHAPES[shape] || HAND_SHAPES.relax;
    const b = new Bucket();
    const cs = col(skin), cd = M.mix(skin, '#7a4a3a', 0.12), cn = M.mix(skin, '#ffffff', 0.22);
    const k = size;
    // palma
    const pst = [[0.004, 0.021, 0.015], [-0.018, 0.029, 0.017], [-0.045, 0.035, 0.0165], [-0.07, 0.036, 0.014], [-0.082, 0.032, 0.012]].map(([y, rx, ry]) => ({ p: new V3(-sx * 0.002 * k, y * k, 0.002 * k), rx: rx * k, ry: ry * k, n: 2.4 }));
    roundEnd(pst, false, 3, 0.6); roundEnd(pst, true, 3, 0.8);
    b.add(tubeGeo(pst, { segs: 14, up: pn, close0: true, close1: true }), { color: (p, n) => (n.dot(pn) > 0.5 ? cd : cs), region: REG.skin });
    // dedos
    const FZ = [0.024, 0.008, -0.008, -0.023], FL = [0.05, 0.056, 0.052, 0.042].map((x) => x * (long ? 1.55 : 1)), FR = [0.0093, 0.0096, 0.0091, 0.0081].map((x) => x * (long ? 0.72 : 1)), FY = [-0.078, -0.082, -0.08, -0.074];
    const axis = new V3(0, -1, 0).cross(pn).normalize(); // eixo de dobra (dedos → palma)
    for (let f = 0; f < 4; f++) {
      const [c1, c2] = S.f[f];
      const spread = (f - 1.5) * S.spread;
      let dir = new V3(0, -1, 0).applyAxisAngle(new V3(-sx, 0, 0), -spread * sx);
      let p = new V3(-sx * 0.001 * k, FY[f] * k, FZ[f] * k);
      const st = [];
      const N = 8, L = FL[f] * k;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const r = FR[f] * k * (1 - 0.18 * t);
        st.push({ p: p.clone(), rx: r, ry: r * 0.92 });
        const bendNow = t < 0.5 ? c1 / (N / 2) : c2 / (N / 2);
        dir = dir.clone().applyAxisAngle(axis, bendNow);
        p = p.clone().addScaledVector(dir, L / N);
      }
      roundEnd(st, true, 3, 0.9);
      b.add(tubeGeo(st, { segs: 8, up: pn, close0: true, close1: true }), { color: (pp, nn, l, i) => (i >= (N - 1) * 8 && nn.dot(pn) < -0.3 ? cn : cs), region: REG.skin });
    }
    // polegar
    const th = S.thumb;
    let tdir = new V3(pn.x * th.d[0], th.d[1], th.d[2]).normalize();
    const ta = th.at || [0.012, -0.02, 0.026];
    let tp = new V3(pn.x * ta[0] * k, ta[1] * k, ta[2] * k);
    const tst = [];
    const TL = 0.05 * k;
    for (let i = 0; i <= 7; i++) {
      const t = i / 7;
      const r = 0.0118 * k * (1 - 0.25 * t);
      tst.push({ p: tp.clone(), rx: r, ry: r * 0.9 });
      tdir = tdir.clone().lerp(pn, th.curl * 0.12).normalize();
      tp = tp.clone().addScaledVector(tdir, TL / 7);
    }
    roundEnd(tst, true, 3, 0.9);
    b.add(tubeGeo(tst, { segs: 8, up: pn, close0: true, close1: true }), { color: cs, region: REG.skin });
    const g = b.geometry(false);
    handCache[key] = g;
    return g;
  }
  R.handGeo = handGeo;

  // ------------------------------------------------------------------
  // Corpo + roupas (SkinnedMesh única)
  // ------------------------------------------------------------------
  const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'shR', 'elR', 'haR', 'shL', 'elL', 'haL', 'thR', 'knR', 'ftR', 'thL', 'knL', 'ftL'];
  const BI = {};
  BONES.forEach((b, i) => (BI[b] = i));

  function makeDims(spec) {
    const H = spec.height || 1;
    const fem = !!spec.female;
    const sw = (fem ? 0.88 : 1) * (spec.shoulders || 1);
    return {
      H, fem, sw,
      hipY: 0.83 * H, thigh: 0.395 * H, shin: 0.385 * H, spine: 0.23 * H, chest: 0.27 * H, neck: 0.045 * H,
      headR: 0.172 * (spec.headScale || 1), upArm: 0.29 * H, foreArm: 0.26 * H,
      shX: 0.205 * sw, hipX: fem ? 0.088 : 0.092, hipUp: 0.06 * H,
    };
  }
  R.makeDims = makeDims;

  /** Anéis do tronco: [yRel, largura, profundidade, frente+, trás+] (relativos ao quadril, ×H). */
  function torsoRings(spec, D, kind) {
    const b = spec.belly || 0, fem = D.fem, sw = D.sw, bw = 1 + (spec.build || 0) * 0.08;
    const hipK = fem ? 1.05 : 1, waistK = fem ? 0.88 : 1;
    const up = [
      [0.08, 0.31 * waistK, 0.2, 0.01 * b],
      [0.15, (0.32 + 0.03 * b) * waistK, 0.212, 0.035 * b],
      [0.24, (0.33 + 0.05 * b) * (fem ? 0.9 : 1), 0.222, 0.075 * b, 0],
      [0.33, (0.356 + 0.025 * b) * lerp(1, sw, 0.5), 0.232, 0.045 * b + (fem ? 0.03 : 0.004)],
      [0.405, 0.378 * sw, 0.235, fem ? 0.04 : 0.012],
      [0.465, 0.398 * sw, 0.222, fem ? 0.01 : 0.004],
      [0.5, 0.39 * sw, 0.198],
      [0.522, 0.345 * sw, 0.172],
      [0.541, 0.25 * sw, 0.14],
      [0.556, 0.165, 0.118],
      [0.566, 0.13, 0.104],
    ].map((r) => [r[0], r[1] * bw, r[2] * (1 + (bw - 1) * 0.6), r[3] || 0, r[4] || 0]);
    const pel = [
      [-0.12, 0.23 * hipK, 0.165, 0, 0.005],
      [-0.085, 0.305 * hipK, 0.205, 0, 0.012],
      [-0.035, 0.346 * hipK, 0.226, 0.004, 0.02],
      [0.035, 0.342 * hipK, 0.222, 0.01 * b, 0.012],
      [0.1, (0.326 + 0.02 * b) * (fem ? 0.93 : 1), 0.214, 0.03 * b],
      [0.14, (0.322 + 0.025 * b) * (fem ? 0.92 : 1), 0.212, 0.035 * b],
    ].map((r) => [r[0], r[1] * bw, r[2] * (1 + (bw - 1) * 0.6), r[3] || 0, r[4] || 0]);
    void kind;
    return { up, pel };
  }
  // interpola anel numa altura relativa
  function ringAt(rings, y) {
    if (y <= rings[0][0]) return rings[0];
    for (let i = 1; i < rings.length; i++) {
      if (y <= rings[i][0]) { const a = rings[i - 1], b = rings[i], t = (y - a[0]) / (b[0] - a[0]); return a.map((v, k) => lerp(v, b[k], t)); }
    }
    return rings[rings.length - 1];
  }
  /** z da frente de um anel (superelipse n) num x. */
  function ringFrontZ(r, x, n, grow) {
    const rx = r[1] / 2 + (grow || 0), ry = r[2] / 2 + (grow || 0);
    const c = Math.min(1, abs(x) / rx);
    const cc = Math.pow(c, n / 2);
    const s = Math.sqrt(Math.max(0, 1 - cc * cc));
    return Math.pow(s, 2 / n) * (ry + r[3] * s * s);
  }

  function buildBody(spec, D, skin) {
    const H = D.H, fem = D.fem;
    const yHip = D.hipY, ySp = yHip + D.hipUp, yCh = ySp + D.spine, yNk = yCh + D.chest, yHd = yNk + D.neck, ySh = yNk - 0.05;
    const top = spec.top || { kind: 'shirt', color: '#4a7bd1' };
    const kind = top.kind || 'shirt';
    const ghost = !!spec.ghost;
    const b = new Bucket(), pat = top.pattern ? new Bucket() : null;
    const cSkin = col(ghost ? '#07040b' : skin.base);
    const cTop = col(top.color || '#4a7bd1'), cTopD = M.mix(top.color || '#4a7bd1', '#000', 0.28), cTopL = M.mix(top.color || '#4a7bd1', '#fff', 0.12);
    const cShirt = col(top.shirt || '#eef3f8');
    const cPants = col(spec.pants || '#33384a'), cPantsD = M.mix(spec.pants || '#33384a', '#000', 0.25);
    const jeans = !!spec.jeans;
    const knit = kind === 'hoodie' || kind === 'sweater';
    const topReg = knit ? REG.knit : REG.cloth;
    const pantsReg = jeans ? REG.denim : REG.cloth;
    const N2 = 2.5;
    // pesos
    const wTorso = (p) => {
      const a = smooth(ySp - 0.03, ySp + 0.05, p.y), c = smooth(yCh - 0.05, yCh + 0.05, p.y), d = smooth(yNk - 0.025, yNk + 0.03, p.y) * 0.45;
      return [[BI.hips, 1 - a], [BI.spine, a * (1 - c)], [BI.chest, a * c * (1 - d)], [BI.neck, a * c * d]];
    };
    const wPelvis = (p) => {
      const base = wTorso(p);
      const k = smooth(yHip - 0.0, yHip - 0.1, p.y) * 0.62;
      if (k <= 0) return base;
      const fR = smooth(0.035, -0.035, p.x);
      base.forEach((w) => (w[1] *= 1 - k));
      return base.concat([[BI.thR, k * fR], [BI.thL, k * (1 - fR)]]);
    };
    const wSkirt = (k0) => (p) => {
      const base = wTorso(p);
      const k = smooth(yHip + 0.04, yHip - 0.16, p.y) * k0 * smooth(-0.05, 0.08, p.z);
      if (k <= 0) return base;
      const fR = smooth(0.05, -0.05, p.x);
      base.forEach((w) => (w[1] *= 1 - k));
      return base.concat([[BI.thR, k * fR], [BI.thL, k * (1 - fR)]]);
    };
    const R2 = (rings) => rings.map((r) => ({ p: new V3(0, yHip + r[0] * H, 0), rx: r[1] / 2, ry: r[2] / 2, fz: r[3], bz: r[4], n: N2 }));
    const { up, pel } = torsoRings(spec, D, kind);
    // sombreamento leve das roupas (oclusão fake: mais escuro em baixo/nas dobras)
    const shade = (c, p, n, k) => c.clone().multiplyScalar(1 - (k || 0.12) * smooth(0.2, -0.9, n.y));

    // ---------- calça / pelve
    if (!ghost) {
      const pst = R2(pel);
      roundEnd(pst, false, 3, 0.5);
      b.add(tubeGeo(pst, { segs: 24, close0: true, close1: true }), { color: (p, n) => shade(cPants, p, n), region: pantsReg, weight: wPelvis });
      // cinto
      if (spec.belt !== false && kind !== 'hoodie' && kind !== 'cloak' && !spec.skirt) {
        const r = ringAt(pel, 0.118);
        const bst = [-0.016, 0.016].map((dy) => ({ p: new V3(0, yHip + (0.118 + dy) * H, 0), rx: r[1] / 2 + 0.004, ry: r[2] / 2 + 0.004, fz: r[3], bz: r[4], n: N2 }));
        b.add(tubeGeo(bst, { segs: 24 }), { color: col(spec.beltColor || '#2a1d17'), region: REG.leather, weight: wTorso });
        const fz = ringFrontZ(r, 0, N2, 0.006);
        b.add(new T.BoxGeometry(0.046, 0.034, 0.008).toNonIndexed(), { m: mat4([0, yHip + 0.118 * H, fz + 0.002]), color: col('#c9c2b0'), region: REG.metal, bone: BI.hips });
      }
    }

    // ---------- tronco (camisa/blusa por baixo + peça de cima)
    const shirtCol = (kind === 'blazer' || kind === 'coat') ? cShirt : cTop;
    const tucked = !(kind === 'hoodie' || kind === 'cloak' || kind === 'coat' || top.untucked || top.pattern || kind === 'tshirt' && !top.tucked || kind === 'polo' && !top.tucked);
    const vTop = 0.2, vNeck = 0.548; // decote em V do blazer: botão em 0.2
    if (kind === 'cloak') {
      // manto longo do golpista (até o chão)
      const rings = [[0.566, 0.15, 0.12], [0.55, 0.25, 0.155], [0.525, 0.345, 0.19], [0.495, 0.41, 0.22], [0.44, 0.445, 0.245], [0.25, 0.42, 0.26], [0.05, 0.44, 0.3], [-0.2, 0.5, 0.36], [-0.5, 0.58, 0.44], [-0.79, 0.66, 0.52]].reverse();
      const st = rings.map((r) => ({ p: new V3(0, yHip + r[0] * H, -0.02), rx: r[1] / 2, ry: r[2] / 2, n: 2.2 }));
      const cc = col(top.color || '#140b22');
      b.add(tubeGeo(st, { segs: 28, close1: true }), { color: (p, n) => cc.clone().multiplyScalar(0.55 + 0.45 * smooth(0.0, 1.1, p.y)), region: REG.knit, weight: (p) => (p.y > yHip ? wTorso(p) : [[BI.hips, 1]]) });
    } else {
      let ringsU = up;
      if (!tucked) {
        const hemY = kind === 'hoodie' ? -0.085 : -0.07;
        ringsU = [hemY, -0.035, 0.035, 0.1].map((y) => { const pr = ringAt(pel, y), ur = ringAt(up, Math.max(y, 0.08)); return [y, Math.max(pr[1] + 0.022, ur[1]) + (y < -0.05 ? -0.006 : 0), Math.max(pr[2] + 0.02, ur[2]), Math.max(pr[3], ur[3]) + 0.004, Math.max(pr[4], ur[4]) + 0.004]; }).concat(up.filter((r) => r[0] > 0.12));
      }
      const stU = R2(ringsU);
      roundEnd(stU, true, 2, 0.35);
      const w = tucked ? wTorso : (p) => (p.y < yHip + 0.04 ? wSkirt(0.25)(p) : wTorso(p));
      const reg = (kind === 'blazer' || kind === 'coat') ? REG.cloth : topReg;
      const target = pat && !(kind === 'blazer' || kind === 'coat') ? pat : b;
      target.add(tubeGeo(stU, { segs: 26, close0: true, close1: true }), {
        color: (p, n) => {
          let c = shade(shirtCol, p, n);
          if ((kind === 'hoodie' || kind === 'sweater') && p.y < yHip + (-0.085 + 0.04) * H) c = c.multiplyScalar(0.84); // barra canelada
          return c;
        },
        region: reg, weight: w,
        uvFn: target === pat ? (p) => [p.x * 3.2 + p.z * 1.4, p.y * 3.2] : null,
      });
    }

    // ---------- detalhes por tipo de roupa
    const frontAt = (yRel, x, grow) => ringFrontZ(ringAt(up, yRel), x, N2, grow || 0);
    /** Remendo plano (forma 2D em x,yRel) projetado na frente do tronco, com espessura. */
    const patch = (shape, o) => {
      const g = new T.ExtrudeGeometry(shape, { depth: o.th || 0.004, bevelEnabled: false, curveSegments: 6 });
      const pp = g.attributes.position;
      for (let i = 0; i < pp.count; i++) {
        const x = pp.getX(i), yr = pp.getY(i), z = pp.getZ(i);
        const rings = o.rings || up;
        const fz = ringFrontZ(ringAt(rings, yr), x, N2, o.grow || 0);
        pp.setXYZ(i, x, yHip + yr * H, fz + z - (o.th || 0.004) * 0.3 + (o.lift || 0));
      }
      g.computeVertexNormals();
      b.add(g, { color: o.color, region: o.region == null ? REG.cloth : o.region, weight: o.weight || wTorso });
    };
    const poly = (pts) => { const s = new T.Shape(); pts.forEach((q, i) => (i ? s.lineTo(q[0], q[1]) : s.moveTo(q[0], q[1]))); s.closePath(); return s; };

    if (kind === 'blazer' || kind === 'coat') {
      const long = kind === 'coat';
      const hem = long ? -0.46 : -0.175;
      const br = [[hem, 0.372 + (long ? 0.07 : 0), 0.252, 0, 0.012]].concat(long ? [[-0.25, 0.395, 0.252, 0.0, 0.012]] : []).concat([[-0.06, 0.374, 0.248, 0.006, 0.022], [0.04, 0.362, 0.236, 0.012 * (spec.belly || 0), 0.012]]).concat(up.filter((r) => r[0] >= 0.15));
      const g0 = 0.011;
      const lowTop = long ? 0.07 : 0.055;
      const vHW = (y) => (y > vTop ? 0.004 + ((y - vTop) / (vNeck - vTop)) * 0.066 : 0);
      const lowHW = (y) => (y < lowTop ? (lowTop - y) * (long ? 0.1 : 0.38) + 0.003 : 0);
      const ys = [];
      for (let y = hem; y < 0.556; y += 0.025) ys.push(y);
      ys.push(vTop, lowTop, 0.556, 0.15, 0.24, 0.33, 0.405, 0.465, 0.51, 0.54);
      const yu = Array.from(new Set(ys.map((y) => +y.toFixed(4)))).sort((p1, p2) => p1 - p2);
      const mkSt = (grow) => yu.map((y) => {
        const r = ringAt(br, y);
        const rx = r[1] / 2 + grow;
        const hw = Math.max(vHW(y), lowHW(y));
        return { p: new V3(0, yHip + y * H, 0), rx, ry: r[2] / 2 + grow, fz: r[3], bz: r[4], n: N2, gap: gapFor(hw, rx, N2) };
      });
      const wB = wSkirt(long ? 0.85 : 0.7);
      b.add(tubeGeo(mkSt(g0), { segs: 40 }), { color: (p, n) => shade(cTop, p, n, 0.16), region: REG.cloth, weight: wB });
      const lin = tubeGeo(mkSt(g0 - 0.004), { segs: 40 });
      { const ix = lin.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } lin.computeVertexNormals(); }
      b.add(lin, { color: cTopD.clone().multiplyScalar(0.8), region: REG.satin, weight: wB });
      // camisa: gola (pontas) por baixo das lapelas
      [-1, 1].forEach((s) => patch(poly([[s * 0.008, 0.536], [s * 0.074, 0.552], [s * 0.066, 0.5], [s * 0.034, 0.47]]), { color: cShirt.clone().multiplyScalar(0.97), th: 0.004, grow: 0.005 }));
      // lapelas com entalhe, borda interna exatamente no V
      [-1, 1].forEach((s) => {
        const pts = [];
        for (let k = 0; k <= 8; k++) { const y = lerp(vTop + 0.004, vNeck, k / 8); pts.push([s * (vHW(y) - 0.002), y]); }
        pts.push([s * 0.098, vNeck + 0.006], [s * 0.106, 0.476], [s * 0.088, 0.458], [s * 0.126, 0.446], [s * 0.1, 0.38], [s * 0.06, 0.29], [s * 0.026, vTop + 0.01]);
        patch(poly(pts), { rings: br, color: (p, n) => shade(cTop, p, n, 0.1).multiplyScalar(1.06), region: REG.cloth, th: 0.007, grow: g0 + 0.002, weight: wTorso });
      });
      // gola por trás do pescoço
      const cpts = [];
      for (let k = 0; k <= 14; k++) { const a = lerp(-2.2, 2.2, k / 14) + PI; cpts.push(new V3(sin(a) * (fem ? 0.08 : 0.086), yHip + (0.553 + 0.008 * -cos(a)) * H, cos(a) * (fem ? 0.072 : 0.078) - 0.008)); }
      b.add(lockGeo(cpts, 0.018, 0.009, { up: new V3(0, 1, 0), profile: (t) => 0.7 + 0.3 * sin(t * PI) }), { color: (p, n) => shade(cTop, p, n, 0.1), region: REG.cloth, weight: wTorso });
      // bolsos com aba + bolso do peito com lenço
      [-1, 1].forEach((s) => patch(poly([[s * 0.075, -0.012], [s * 0.168, -0.012], [s * 0.168, -0.048], [s * 0.075, -0.048]]), { rings: br, grow: g0, color: (p, n) => shade(cTop, p, n, 0.3).multiplyScalar(0.9), th: 0.006, weight: wB }));
      patch(poly([[0.072, 0.366], [0.072, 0.378], [0.136, 0.386], [0.136, 0.374]]), { rings: br, color: cTopD, th: 0.004, grow: g0 });
      if (top.pocketSquare !== false) patch(poly([[0.08, 0.38], [0.09, 0.404], [0.102, 0.39], [0.113, 0.41], [0.128, 0.386]]), { rings: br, color: col(top.pocketSquare || '#f4f1ea'), th: 0.005, grow: g0 + 0.001 });
      // botões
      [0.165, lowTop + 0.028].forEach((yb) => {
        const z = ringFrontZ(ringAt(br, yb), 0, N2, g0) + 0.002;
        b.add(new T.CylinderGeometry(0.0085, 0.0085, 0.004, 12).rotateX(PI / 2), { m: mat4([0, yHip + yb * H, z]), color: col('#1c1a20'), region: REG.plastic, bone: BI.spine });
      });
      if (top.tie) {
        const ct = col(top.tie);
        patch(poly([[-0.015, 0.528], [0.015, 0.528], [0.011, 0.505], [-0.011, 0.505]]), { color: ct, th: 0.01, grow: 0.003, region: REG.satin });
        patch(poly([[-0.009, 0.506], [0.009, 0.506], [0.026, 0.24], [0, 0.212], [-0.026, 0.24]]), { color: ct, th: 0.004, grow: 0.0025, region: REG.satin });
      } else {
        patch(poly([[-0.0035, 0.43], [0.0035, 0.43], [0.0035, 0.437], [-0.0035, 0.437]]), { color: M.mix(top.shirt || '#eef3f8', '#000', 0.25), th: 0.003, grow: 0.002 });
        patch(poly([[-0.0035, 0.35], [0.0035, 0.35], [0.0035, 0.357], [-0.0035, 0.357]]), { color: M.mix(top.shirt || '#eef3f8', '#000', 0.25), th: 0.003, grow: 0.002 });
      }
      // colarinho em volta do pescoço
      const nr = (fem ? 0.056 : 0.062);
      const cst = [0.536, 0.571].map((yy, i) => ({ p: new V3(0, yHip + yy * H, 0.002), rx: nr + 0.003 * (1 - i), ry: nr * 0.92 + 0.003 * (1 - i), n: 2 }));
      b.add(tubeGeo(cst, { segs: 24, cut: top.tie ? null : (i, k, a) => sin(a) > 0.93 }), { color: (p, n) => cShirt.clone().multiplyScalar(0.96 + 0.04 * n.y), region: REG.cloth, weight: () => [[BI.chest, 0.6], [BI.neck, 0.4]] });
    } else if (kind === 'hoodie') {
      // capuz embolado atrás do pescoço
      const hp = [];
      for (let k = 0; k <= 12; k++) {
        const a = lerp(-2.35, 2.35, k / 12) + PI;
        const back = smooth(0.6, 1, -cos(a));
        hp.push(new V3(sin(a) * (0.1 + 0.02 * back), yHip + (0.535 + 0.035 * back - 0.03 * (1 - back) * smooth(0.3, 1, cos(a) + 0.2)) * H, cos(a) * (0.085 + 0.03 * back) - 0.01));
      }
      b.add(lockGeo(hp, 0.042, 0.03, { up: new V3(0, 1, 0), profile: (t) => 0.7 + 0.3 * sin(t * PI) }), { color: (p, n) => shade(cTop, p, n, 0.2), region: REG.knit, weight: (p) => [[BI.chest, 0.85], [BI.neck, 0.15]] });
      b.add(ballGeo(0.12, 0.095, 0.05, 16, 12), { m: mat4([0, yHip + 0.49 * H, -0.135], [0.25, 0, 0]), color: (p, n) => shade(cTopD, p, n), region: REG.knit, bone: BI.chest });
      // bolso canguru
      patch(poly([[-0.1, 0.17], [0.1, 0.17], [0.13, 0.015], [-0.13, 0.015]]), { color: cTopD.clone().lerp(cTop, 0.6), region: REG.knit, th: 0.006, grow: 0.002 });
      patch(poly([[-0.1, 0.17], [-0.085, 0.17], [-0.115, 0.03], [-0.13, 0.03]]), { color: cTopD, region: REG.knit, th: 0.0075, grow: 0.002 });
      patch(poly([[0.085, 0.17], [0.1, 0.17], [0.13, 0.03], [0.115, 0.03]]), { color: cTopD, region: REG.knit, th: 0.0075, grow: 0.002 });
      // cordões
      [-1, 1].forEach((s) => {
        const z0 = frontAt(0.5, s * 0.03, 0.006), z1 = frontAt(0.36, s * 0.036, 0.008);
        const pts = bez(new V3(s * 0.03, yHip + 0.515 * H, z0 + 0.004), new V3(s * 0.034, yHip + 0.45 * H, z0 + 0.01), new V3(s * 0.036, yHip + 0.37 * H, z1 + 0.006), null, 8);
        b.add(lockGeo(pts, 0.0045, 0.0045, { profile: () => 1 }), { color: col('#f4f1e8'), region: REG.cloth, weight: wTorso });
        const e = pts[pts.length - 1];
        b.add(new T.CylinderGeometry(0.006, 0.0055, 0.018, 8), { m: mat4([e.x, e.y - 0.006, e.z]), color: col('#d8d4c8'), region: REG.metal, bone: BI.chest });
      });
    } else if (kind === 'sweater' || kind === 'tshirt' || kind === 'blouse') {
      const nr = kind === 'blouse' ? 0.075 : 0.066;
      const cst = [0.535, 0.56].map((yy, i) => ({ p: new V3(0, yHip + yy * H, 0.006), rx: nr + 0.004 * (1 - i), ry: nr * 0.85 + 0.004 * (1 - i), n: 2 }));
      b.add(tubeGeo(cst, { segs: 20 }), { color: kind === 'tshirt' ? cTopD.clone().lerp(cTop, 0.5) : cTopD, region: knit ? REG.knit : REG.cloth, weight: (p) => [[BI.chest, 0.8], [BI.neck, 0.2]] });
      if (kind === 'sweater') [-1, 1].forEach((s) => patch(poly(s < 0 ? [[-0.012, 0.52], [-0.06, 0.552], [-0.062, 0.53], [-0.03, 0.505]] : [[0.03, 0.505], [0.062, 0.53], [0.06, 0.552], [0.012, 0.52]]), { color: cShirt, th: 0.004, grow: 0.007 }));
      if (top.necklace) {
        const pc = col(top.necklace === true ? '#f6f0e6' : top.necklace);
        for (let k = 0; k < 15; k++) {
          const a = lerp(-1.25, 1.25, k / 14);
          const yy = 0.515 - 0.03 * cos(a * 0.9);
          const x = sin(a) * 0.075;
          b.add(ballGeo(0.0065, 0.0065, 0.0065, 8, 6), { m: mat4([x, yHip + yy * H, frontAt(yy, x, 0.006) + 0.002]), color: pc, region: REG.teeth, bone: BI.chest });
        }
      }
    } else if (kind === 'shirt' || kind === 'polo') {
      // colarinho + carcela com botões
      const polo = kind === 'polo';
      const cCol = polo ? cTopD.clone().lerp(cTop, 0.4) : cTop.clone().multiplyScalar(0.97);
      [-1, 1].forEach((s) => patch(poly([[s * 0.008, 0.5], [s * 0.07, 0.556], [s * 0.085, 0.522], [s * 0.04, 0.488]]), { color: cCol, th: 0.005, grow: 0.004, region: polo ? REG.knit : REG.cloth }));
      const cb = [0.53, 0.565].map((yy) => ({ p: new V3(0, yHip + yy * H, 0.0), rx: 0.068, ry: 0.06, n: 2 }));
      b.add(tubeGeo(cb, { segs: 18, cut: (i, k, a) => sin(a) > 0.75 }), { color: cCol, region: REG.cloth, weight: (p) => [[BI.chest, 0.7], [BI.neck, 0.3]] });
      const yEnd = polo ? 0.4 : (tucked ? 0.1 : -0.06);
      patch(poly([[-0.011, 0.495], [0.011, 0.495], [0.011, Math.max(0.08, yEnd)], [-0.011, Math.max(0.08, yEnd)]]), { color: M.mix(top.color || '#4a7bd1', '#000', 0.08), th: 0.003, grow: 0.002 });
      const bc = col(top.buttons || (polo ? M.hex(cTopD) : '#f2efe6'));
      for (let yb = 0.46; yb > Math.max(0.09, yEnd); yb -= 0.075) {
        b.add(ballGeo(0.0055, 0.0055, 0.0025, 8, 6), { m: mat4([0, yHip + yb * H, frontAt(yb, 0, 0.005) + 0.001]), color: bc, region: REG.plastic, weight: wTorso });
        if (polo && yb < 0.42) break;
      }
      if (!polo && top.pocket !== false && !top.pattern) patch(poly([[0.06, 0.39], [0.125, 0.39], [0.125, 0.335], [0.0925, 0.325], [0.06, 0.335]]), { color: M.mix(top.color || '#4a7bd1', '#000', 0.06), th: 0.003, grow: 0.002 });
    }

    // ---------- braços
    const short = top.sleeves === 'short' || kind === 'tshirt' || kind === 'polo';
    const sleeveCol = cTop;
    const aK = (fem ? 0.86 : 1) * (1 + (spec.build || 0) * 0.08) * (spec.arms || 1);
    ['R', 'L'].forEach((side) => {
      const sx = side === 'R' ? -1 : 1;
      const S = new V3(sx * D.shX, ySh, 0);
      const m = mat4([S.x, S.y, S.z]);
      const ua = D.upArm, fa = D.foreArm;
      const wArm = (p, l) => {
        const e = smooth(-ua + 0.045, -ua - 0.045, l.y);
        const wc = smooth(-0.02, 0.06, l.y) * 0.3;
        return [[BI['sh' + side], (1 - e) * (1 - wc)], [BI['el' + side], e], [BI.chest, (1 - e) * wc]];
      };
      const tube = (pts, c, reg, o) => {
        const st = pts.map(([y, r]) => ({ p: new V3(0, y, 0), rx: r * aK, ry: r * aK * 0.96, n: 2 }));
        if (o && o.capTop) roundEnd(st, false, 4, 0.7);
        const tgt = o && o.pat && pat ? pat : b;
        tgt.add(tubeGeo(st, { segs: 16, up: new V3(0, 0, 1), close0: true, close1: true }), { m, color: (p, n, l) => (typeof c === 'function' ? c(p, n, l) : shade(c, p, n, 0.08)), region: reg, weight: wArm, uvFn: tgt === pat ? (p) => [p.x * 3.2 + p.z * 1.4, p.y * 3.2] : null });
      };
      if (kind === 'cloak') {
        tube([[0.02, 0.05], [-0.05, 0.052], [-ua, 0.05], [-ua - fa * 0.6, 0.06], [-ua - fa + 0.02, 0.078], [-ua - fa + 0.012, 0.074]], (p, n, l) => (l.y < -ua - fa + 0.016 ? col('#030205') : cTop.clone().multiplyScalar(0.8 + 0.2 * smooth(-0.6, 0.6, n.y))), REG.knit, { capTop: true });
      } else if (short) {
        tube([[0.0, 0.054], [-0.04, 0.058], [-0.1, 0.058], [-0.155, 0.061]], sleeveCol, topReg, { capTop: true, pat: true });
        tube([[-0.09, 0.047], [-ua + 0.02, 0.042], [-ua - 0.04, 0.043], [-ua - fa * 0.55, 0.039], [-ua - fa + 0.02, 0.033], [-ua - fa + 0.004, 0.032]], cSkin, REG.skin);
      } else {
        const cuffY = -ua - fa + (kind === 'blazer' || kind === 'coat' ? 0.045 : 0.022) + (side === 'L' && spec.watch ? 0.012 : 0);
        tube([[0.0, 0.051], [-0.035, 0.0535], [-0.1, 0.052], [-ua * 0.7, 0.05], [-ua, 0.049], [-ua - 0.07, 0.049], [-ua - fa * 0.6, 0.047], [cuffY + 0.01, 0.046], [cuffY, 0.048]], (p, n, l) => {
          let c = shade(sleeveCol, p, n, 0.1);
          if (knit && l.y < cuffY + 0.04) c = c.multiplyScalar(0.82);
          if (l.y < cuffY + 0.002) c = cTopD.clone().multiplyScalar(0.5);
          return c;
        }, topReg, { capTop: true });
        if (kind === 'blazer' || kind === 'coat') tube([[cuffY + 0.01, 0.042], [cuffY - 0.016, 0.042], [cuffY - 0.018, 0.04]], cShirt, REG.cloth);
        if (kind === 'blazer') [0, 1, 2].forEach((k) => b.add(ballGeo(0.004, 0.004, 0.002, 6, 4), { m: mat4([S.x + sx * 0.0, S.y + cuffY + 0.02 + k * 0.012, -0.046 * aK]), color: col('#1c1a20'), region: REG.plastic, weight: () => [[BI['el' + side], 1]] }));
        // pulso de pele (aparece com a manga recuada)
        tube([[cuffY + 0.02, 0.034], [-ua - fa + 0.004, 0.032]], cSkin, REG.skin);
        if (side === 'L' && spec.watch) {
          const wy = -ua - fa + 0.026;
          const ws = [wy + 0.009, wy - 0.009].map((y) => ({ p: new V3(0, y, 0), rx: 0.036 * aK, ry: 0.035 * aK, n: 2 }));
          b.add(tubeGeo(ws, { segs: 14 }), { m, color: col(spec.watchBand || '#2a1d17'), region: REG.leather, weight: () => [[BI.elL, 1]] });
          b.add(new T.CylinderGeometry(0.015, 0.015, 0.008, 16), { m: mat4([S.x + 0.036 * aK, S.y + wy, 0], [0, 0, PI / 2]), color: col(spec.watch === true ? '#d9c38a' : spec.watch), region: REG.gold, weight: () => [[BI.elL, 1]] });
          b.add(new T.CylinderGeometry(0.0115, 0.0115, 0.002, 16), { m: mat4([S.x + 0.0405 * aK, S.y + wy, 0], [0, 0, PI / 2]), color: col('#f6f1e4'), region: REG.plastic, weight: () => [[BI.elL, 1]] });
        }
      }
      // deltoide
      const dB = short && pat ? pat : b;
      dB.add(ballGeo((kind === 'cloak' ? 0.05 : 0.047) * aK, 0.047 * aK, 0.05 * aK, 16, 12), { m: mat4([S.x - sx * 0.02, S.y - 0.012, 0]), color: kind === 'cloak' ? cTop : sleeveCol, region: kind === 'cloak' ? REG.knit : topReg, weight: (p) => [[BI['sh' + side], 0.75], [BI.chest, 0.25]], uvFn: dB === pat ? (p) => [p.x * 3.2 + p.z * 1.4, p.y * 3.2] : null });
    });

    // ---------- pernas e sapatos
    if (!ghost) {
      ['R', 'L'].forEach((side) => {
        const sx = side === 'R' ? -1 : 1;
        const Hj = new V3(sx * D.hipX, yHip, 0);
        const m = mat4([Hj.x, Hj.y, Hj.z]);
        const th = D.thigh, sh = D.shin;
        const lk = (fem ? 0.9 : 1) * (1 + (spec.build || 0) * 0.08);
        const wLeg = (p, l) => {
          const e = smooth(-th + 0.055, -th - 0.055, l.y);
          const h = smooth(-0.05, 0.04, l.y) * 0.35;
          return [[BI['th' + side], (1 - e) * (1 - h)], [BI['kn' + side], e], [BI.hips, (1 - e) * h]];
        };
        const slim = jeans && fem;
        const pts = slim
          ? [[0.04, 0.078], [0.0, 0.084], [-0.09, 0.08], [-0.22, 0.072], [-th, 0.057], [-th - 0.08, 0.056], [-th - sh * 0.55, 0.052], [-th - sh + 0.03, 0.046], [-th - sh - 0.008, 0.048]]
          : [[0.04, 0.08], [0.0, 0.088], [-0.08, 0.086], [-0.2, 0.08], [-th * 0.85, 0.07], [-th, 0.067], [-th - 0.08, 0.065], [-th - sh * 0.6, 0.062], [-th - sh + 0.03, 0.062], [-th - sh - 0.012, 0.065]];
        const st = pts.map(([y, r]) => ({ p: new V3(0, y, 0), rx: r * lk, ry: r * lk * 1.03, n: 2 }));
        roundEnd(st, false, 4, 1);
        const crease = !jeans && !spec.skirt;
        b.add(tubeGeo(st, { segs: 18, up: new V3(0, 0, 1), close0: true, close1: true }), {
          m, region: pantsReg, weight: wLeg,
          color: (p, n, l) => {
            let c = shade(cPants, p, n, 0.1);
            if (crease && n.z > 0.97 && l.y < -0.1) c = c.multiplyScalar(1.12);
            if (jeans && abs(n.x) > 0.97) c = c.lerp(col('#c9a04a'), 0.12);
            if (l.y < -th - sh - 0.006) c = cPantsD.clone().multiplyScalar(0.6);
            return c;
          },
        });
        // sapato
        const A = new V3(sx * D.hipX, yHip - th - sh, 0);
        const sneaker = (spec.shoeStyle || '') === 'tenis';
        const cS = col(spec.shoes || '#2a1d18');
        const sp = sneaker
          ? [[-0.062, 0.078, 0.07], [-0.045, 0.092, 0.078], [0.0, 0.102, 0.072], [0.05, 0.108, 0.058], [0.1, 0.106, 0.046], [0.145, 0.098, 0.04], [0.18, 0.082, 0.034], [0.2, 0.05, 0.026]]
          : [[-0.06, 0.07, 0.054], [-0.045, 0.085, 0.064], [0.0, 0.092, 0.064], [0.05, 0.098, 0.046], [0.1, 0.098, 0.034], [0.145, 0.09, 0.027], [0.18, 0.072, 0.022], [0.2, 0.042, 0.016]];
        const fk = fem ? 0.9 : 1;
        const sst = sp.map(([z, w, h]) => ({ p: new V3(0, -0.05 + (sneaker ? 0.016 : 0.009) + h / 2, z * fk), rx: (w / 2) * fk, ry: h / 2, n: sneaker ? 2.6 : 3 }));
        roundEnd(sst, false, 3, 0.4); roundEnd(sst, true, 3, 0.5);
        const ms = mat4([A.x, A.y, A.z]);
        const cAcc = col(spec.shoeAccent || '#2fae86');
        b.add(tubeGeo(sst, { segs: 18, up: new V3(0, 1, 0), close0: true, close1: true }), {
          m: ms, bone: BI['ft' + side], region: sneaker ? REG.cloth : REG.leather,
          color: (p, n, l) => {
            if (sneaker) { if (abs(n.x) > 0.75 && l.y < -0.02 && l.y > -0.03 && l.z > -0.03 && l.z < 0.12) return cAcc; return cS.clone().multiplyScalar(n.y > 0.85 && l.z < 0.02 ? 0.85 : 1); }
            return cS.clone().multiplyScalar(n.y > 0.8 && l.z > 0.0 && l.z < 0.09 ? 0.82 : 1);
          },
        });
        // sola
        const sole = [[-0.064, 0.074], [-0.03, 0.09], [0.05, 0.104], [0.15, 0.096], [0.2, 0.06], [0.212, 0.03]].map(([z, w]) => ({ p: new V3(0, -0.05 + (sneaker ? 0.009 : 0.005), z * fk), rx: (w / 2 + (sneaker ? 0.006 : 0.003)) * fk, ry: sneaker ? 0.009 : 0.0055, n: 4 }));
        b.add(tubeGeo(sole, { segs: 16, up: new V3(0, 1, 0), close0: true, close1: true }), { m: ms, bone: BI['ft' + side], color: sneaker ? col(spec.soleColor || '#f4f2ec') : M.mix(spec.shoes || '#2a1d18', '#000', 0.45), region: sneaker ? REG.rubber : REG.leather });
        // meia/tornozelo
        b.add(new T.CylinderGeometry(0.036, 0.038, 0.06, 12, 1, true), { m: mat4([A.x, A.y + 0.02, A.z]), color: col(spec.socks || '#2a2a30'), region: REG.knit, weight: () => [[BI['kn' + side], 1]] });
      });
    }

    // ---------- pescoço
    {
      const nr = (fem ? 0.047 : 0.057) * (1 + (spec.build || 0) * 0.06);
      const st = [[yNk - 0.05, nr * 1.15], [yNk - 0.01, nr], [yHd, nr * 0.98], [yHd + 0.06, nr * 0.95], [yHd + 0.1, nr * 0.85]].map(([y, r]) => ({ p: new V3(0, y, -0.008), rx: r, ry: r * 0.95, n: 2 }));
      b.add(tubeGeo(st, { segs: 16, close0: true, close1: true }), {
        color: (p, n) => cSkin.clone().multiplyScalar(0.9 + 0.1 * smooth(yNk - 0.03, yHd + 0.05, p.y)), region: REG.skin,
        weight: (p) => { const a = smooth(yNk - 0.04, yNk + 0.0, p.y), c = smooth(yHd - 0.005, yHd + 0.03, p.y); return [[BI.chest, 1 - a], [BI.neck, a * (1 - c)], [BI.head, a * c]]; },
      });
    }
    return { body: b.geometry(true), pattern: pat ? pat.geometry(true) : null };
  }

  // ------------------------------------------------------------------
  // Cabeça estática (crânio + nariz + orelhas + cabelo + bigode + armação
  // dos óculos + brilho dos olhos) — uma malha no osso da cabeça.
  // ------------------------------------------------------------------
  // espessura do cabelo na têmpora (as hastes dos óculos passam por cima; no cabelo comprido, por baixo)
  const SIDE_HAIR = { grisalho: 0.016, curto: 0.017, baguncado: 0.03, coque: 0.015, rabo: 0.017, coque_base: 0.017, cacheado: 0.045, careca: 0.011, raspado: 0.006, longo: 0.0, chanel: 0.0, nenhum: 0 };
  function buildHead(spec, D, hs, skin, E) {
    const hb = new Bucket();
    const fem = D.fem, ghost = !!spec.ghost;
    const surf = faceSurf(hs);
    const cS = col(skin.base), cCheek = col(skin.cheek || skin.lip), cNose = M.mix(skin.base, skin.cheek || skin.lip, 0.25);
    const stub = !fem && spec.stubble !== false && !ghost ? (spec.stubble || 0.1) : 0;
    const cStub = M.mix(skin.dark, '#56606e', 0.55);
    const dd = new V3();
    hb.add(headGeo(hs), {
      region: REG.skin,
      color: (p, n, l) => {
        if (ghost) return col('#07040b');
        dd.copy(l).normalize();
        const c = cS.clone();
        const cx = abs(dd.x) - 0.55, cy = dd.y + 0.3, cz = dd.z - 0.75;
        c.lerp(cCheek, Math.exp(-(cx * cx + cy * cy + cz * cz) / 0.035) * (fem ? 0.45 : 0.3));
        c.multiplyScalar(1 - 0.16 * smooth(-0.45, -0.95, dd.y));
        if (stub) {
          const jaw = smooth(-0.22, -0.5, dd.y) * smooth(-0.35, 0.2, dd.z) * (1 - smooth(-0.95, -0.75, dd.y) * 0.4);
          const lipz = Math.exp(-((dd.y + 0.38) ** 2) / 0.006 - (dd.x * dd.x) / 0.04) * smooth(0.7, 0.9, dd.z);
          c.lerp(cStub, Math.min(1, jaw + lipz) * stub);
        }
        if (spec.age) c.multiplyScalar(1 - 0.05 * spec.age * Math.exp(-((dd.y - 0.62) ** 2) / 0.004) * smooth(0.6, 0.9, dd.z));
        // careca brilhante: brilho pintado (sem trocar de região no meio do triângulo → sem riscos)
        if (spec.shinyScalp) { const hx = dd.x + 0.18, hy = dd.y - 0.86, hz = dd.z - 0.42; c.lerp(col('#fff6ec'), 0.32 * Math.exp(-(hx * hx + hy * hy + hz * hz) / 0.06)); }
        return c;
      },
    });
    if (!ghost) {
      // orelhas
      [-1, 1].forEach((sx) => {
        const p = headPoint(new V3(sx, -0.06, -0.08).normalize(), hs, new V3());
        const q = [0, sx * 0.32, -sx * 0.1];
        const eg = ballGeo(0.012, 0.034, 0.024, 16, 12);
        { const pp = eg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i); const r = Math.hypot(y / 0.034, z / 0.024); if (x > 0) pp.setX(i, x * (r < 0.72 ? 0.25 + 0.75 * smooth(0.35, 0.72, r) : 1)); } eg.computeVertexNormals(); }
        const cIn = M.mix(skin.base, skin.dark, 0.55).lerp(col(skin.cheek || skin.lip), 0.15);
        hb.add(eg, { m: mat4([p.x + sx * 0.0035, p.y, p.z], [0, sx * 0.32 + (sx < 0 ? PI : 0), -sx * 0.1]), color: (pp, n, l) => (l.x > 0 && Math.hypot(l.y / 0.034, l.z / 0.024) < 0.7 ? cIn : cS), region: REG.skin });
        if (spec.earrings) hb.add(ballGeo(0.0065, 0.0065, 0.0065, 8, 6), { m: mat4([p.x + sx * 0.008, p.y - 0.034, p.z + 0.004]), color: col(spec.earrings === true ? '#f6f0e6' : spec.earrings), region: REG.teeth });
      });
      // nariz: ponte + ponta + asas
      const ns = spec.nose || (fem ? 0.82 : 1);
      const P = new V3(), N = new V3();
      surf(0, 0.012, P, N); const p0 = P.clone().addScaledVector(N, 0.0);
      surf(0, -0.03, P, N); const ntip = P.clone().addScaledVector(N, 0.019 * ns), nN = N.clone();
      const pmid = p0.clone().lerp(ntip, 0.5).addScaledVector(nN, 0.004 * ns);
      hb.add(lockGeo(bez(p0.clone().addScaledVector(nN, -0.004), pmid, ntip, null, 7), 0.0085 * ns, 0.008 * ns, { up: new V3(0, 0, 1), profile: (t) => 0.6 + 0.5 * t }), { color: cNose, region: REG.skin });
      hb.add(ballGeo(0.0128 * ns, 0.0118 * ns, 0.012 * ns, 14, 10), { m: mat4([ntip.x, ntip.y - 0.002, ntip.z - 0.004]), color: cNose, region: REG.skin });
      [-1, 1].forEach((sx) => {
        surf(sx * 0.0125 * ns, -0.0345, P, N);
        hb.add(ballGeo(0.0064 * ns, 0.0054 * ns, 0.006 * ns, 10, 8), { m: mat4([P.x - sx * 0.0008, P.y + 0.0005, P.z - 0.0018], [0, sx * 0.4, 0]), color: cNose.clone().multiplyScalar(0.98), region: REG.skin });
      });
      // brilho dos olhos (fixo na cabeça — some quando a pálpebra fecha)
      E.forEach((e) => {
        [[-0.4, 0.42, 0.81, 0.0062], [0.34, -0.36, 0.87, 0.0028]].forEach(([x, y, z, r]) => {
          const d = new V3(0, 0, 0).addScaledVector(e.X, x).addScaledVector(e.Y, y).addScaledVector(e.F, z).normalize();
          const p = e.c.clone().addScaledVector(d, e.re * 1.012);
          const q = new T.Quaternion().setFromUnitVectors(new V3(0, 0, 1), d);
          const m = new T.Matrix4().compose(p, q, new V3(1, 1, 1));
          hb.add(ballGeo(r * 1.15, r, 0.0012, 8, 6), { m, color: col('#ffffff'), region: REG.emit });
        });
      });
      // bigode
      if (spec.mustache) {
        const mc = col(spec.mustache), md = M.mix(spec.mustache, '#000', 0.25), ml = M.mix(spec.mustache, '#fff', 0.25);
        [-1, 1].forEach((sx) => {
          const pts = [], ups = [];
          [[-0.006, -0.0565], [0.012, -0.058], [0.029, -0.0625], [0.039, -0.069], [0.046, -0.078], [0.049, -0.086]].forEach(([x, y]) => {
            surf(sx * x, y, P, N); pts.push(P.clone().addScaledVector(N, 0.008)); ups.push(N.clone());
          });
          const sm = bez(pts[0], pts[2], pts[4], pts[5], 9);
          const g = lockGeo(sm, 0.0122, 0.0082, { ups: sm.map((q, i) => ups[Math.min(5, Math.round(i * 5 / 8))]), profile: (t) => (1 - Math.pow(t, 2.2) * 0.75) * (0.85 + 0.15 * sin(t * PI)), segs: 10 });
          hb.add(g, { color: (p, n, l, i) => { const k = hash(i * 0.37); return k < 0.3 ? md : k > 0.8 ? ml : mc; }, region: REG.hair });
        });
      }
      // barba curta
      if (spec.beard) {
        hairShell(hs, {
          nt: 40, np: 96, thetaMax: 2.9, feather: 1, ramp: 0.007,
          qfn: (d) => Math.min((-0.12 + 0.13 * smooth(0.25, -0.25, d.z) - d.y) / 0.14, (d.z + 0.27) / 0.2, (Math.hypot((d.y + 0.52) / 0.09, d.x / 0.3) - 1) * 2 + (1 - smooth(0.6, 0.85, d.z)) * 3),
          thick: (e, ph, d) => 0.0075 + 0.005 * smooth(-0.55, -0.85, d.y), comb: (d) => Math.atan2(d.x, d.z + 0.2), freq: 30, groove: 0.1, fineK: 0.1, warp: 0.6, occ: 0.3,
          base: spec.beard, dark: M.mix(spec.beard, '#000', 0.3), light: M.mix(spec.beard, '#fff', 0.2), skin: skin.base, edgeSkin: 1.5,
        }, hb);
      }
      // armação dos óculos
      if (spec.glasses) {
        const gc = col(spec.glasses.color || '#2a2a32');
        const reg = spec.glasses.metal ? REG.metal : REG.plastic;
        const gw = spec.glasses.w || 0.03, gh = spec.glasses.h || 0.0225, gn = spec.glasses.n || 3.2, gt = spec.glasses.thick || 0.0026;
        E.forEach((e) => {
          const ctr = new V3(e.c.x, e.c.y + 0.002, e.c.z + e.re + 0.013);
          const rot = new T.Quaternion().setFromEuler(new T.Euler(0, e.side * 0.14, 0));
          const ring = [];
          for (let k = 0; k <= 28; k++) {
            const a = (k / 28) * PI * 2;
            const c = cos(a), s = sin(a);
            const lx = Math.sign(c) * Math.pow(abs(c), 2 / gn) * gw, ly = Math.sign(s) * Math.pow(abs(s), 2 / gn) * gh * (spec.glasses.cat && s > 0 ? 1 + 0.25 * c * e.side * -1 : 1);
            ring.push(new V3(lx, ly, 0).applyQuaternion(rot).add(ctr));
          }
          hb.add(tubeGeo(ring.map((p) => ({ p, rx: gt, ry: gt * 0.8 })), { segs: 6, up: new V3(0, 0, 1) }), { color: gc, region: reg });
          e.lens = { ctr, rot, gw, gh, gn };
          // haste até a orelha
          const outer = new V3(gw, gh * 0.55, 0).applyQuaternion(rot).add(ctr);
          if (e.side < 0) outer.copy(new V3(-gw, gh * 0.55, 0).applyQuaternion(rot).add(ctr));
          const hsT = SIDE_HAIR[(spec.hair && spec.hair.style) || 'curto'];
          const ho = hsT == null ? 0.012 : hsT;
          const ear = headPoint(new V3(e.side, 0.15, -0.2).normalize(), hs, new V3()).add(new V3(e.side * (0.008 + ho), 0, 0));
          const back = headPoint(new V3(e.side, 0.0, -0.4).normalize(), hs, new V3()).add(new V3(e.side * (0.004 + ho * 0.6), 0, 0));
          const mid = headPoint(new V3(e.side, 0.12, 0.45).normalize(), hs, new V3()).add(new V3(e.side * (0.009 + ho * 0.55), 0, 0));
          hb.add(lockGeo(bez(outer, mid, ear, back, 10), gt * 0.9, gt * 0.7, { profile: () => 1, up: new V3(0, 1, 0) }), { color: gc, region: reg });
        });
        const a = E[0].lens, b2 = E[1].lens;
        const pa = new V3(-a.gw * 0.0, 0, 0).add(a.ctr).add(new V3(a.gw * 0.98, a.gh * 0.25, 0).applyQuaternion(a.rot));
        const pb = new V3(0, 0, 0).add(b2.ctr).add(new V3(-b2.gw * 0.98, b2.gh * 0.25, 0).applyQuaternion(b2.rot));
        const top2 = pa.clone().lerp(pb, 0.5).add(new V3(0, 0.006, 0.002));
        hb.add(lockGeo(bez(pa, top2, pb, null, 7), gt, gt * 0.8, { profile: () => 1 }), { color: gc, region: reg });
      }
    }
    // cabelo
    const st = (spec.hair && spec.hair.style) || 'curto';
    if (!ghost && HAIR[st]) HAIR[st](hs, hb, (spec.hair && spec.hair.color) || '#3a2a22', skin.base);
    if (ghost) {
      // capuz pontudo com abertura no rosto (vazio escuro) e borda marcada
      const hc = col((spec.top && spec.top.color) || '#170c26');
      const R0 = hs.r;
      const S0 = [[-1.85, 1.2, 1.0, 0.1, 0], [-1.45, 1.12, 1.02, 0.08, 0], [-1.1, 1.08, 1.06, 0.05, 0.42], [-0.6, 1.16, 1.14, 0.02, 0.62], [0.0, 1.22, 1.2, 0.0, 0.7], [0.5, 1.17, 1.18, -0.04, 0.6], [0.95, 0.98, 1.08, -0.12, 0.3], [1.25, 0.72, 0.86, -0.24, 0], [1.5, 0.4, 0.55, -0.4, 0], [1.68, 0.12, 0.2, -0.62, 0]];
      // estações densas (Catmull-Rom) → abertura do rosto e ponta do capuz lisas
      const cr = (a, b2, c, d2, t) => 0.5 * (2 * b2 + (-a + c) * t + (2 * a - 5 * b2 + 4 * c - d2) * t * t + (-a + 3 * b2 - 3 * c + d2) * t * t * t);
      const S = [];
      const NS = 30;
      for (let i = 0; i < NS; i++) {
        const f = (i / (NS - 1)) * (S0.length - 1), k = Math.min(S0.length - 2, Math.floor(f)), t = f - k;
        const g = (j) => S0[clamp(j, 0, S0.length - 1)];
        S.push([0, 1, 2, 3, 4].map((c) => cr(g(k - 1)[c], g(k)[c], g(k + 1)[c], g(k + 2)[c], t)).map((v, c) => (c === 4 ? Math.max(0, v) : v)));
      }
      const mk = (k) => S.map(([y, rx, rz, zc, gp]) => ({ p: new V3(0, y * R0, zc * R0), rx: rx * R0 * k, ry: rz * R0 * k, n: 2.2, gap: gp > 0.04 ? gp : 0 }));
      const outer = tubeGeo(mk(1), { segs: 40 });
      hb.add(outer, { color: (p, n, l) => hc.clone().multiplyScalar(0.5 + 0.5 * smooth(-0.3, 0.25, l.y / R0)), region: REG.knit });
      const inner = tubeGeo(mk(0.95), { segs: 40 });
      { const ix = inner.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } inner.computeVertexNormals(); }
      const cIn = col('#020104'), cGlow = col('#3a0612');
      hb.add(inner, { color: (p, n, l) => cIn.clone().lerp(cGlow, 0.85 * Math.exp(-((l.y - 0.012) ** 2) / 0.0035 - (l.x * l.x) / 0.012)), region: REG.knit });
      // borda da abertura
      const edge = [];
      const st = mk(0.985);
      const ptAt = (sx, i) => { const s0 = st[i], a0 = PI / 2 + sx * s0.gap; const c = cos(a0), sn = sin(a0); return new V3(Math.sign(c) * Math.pow(abs(c), 2 / 2.2) * s0.rx, s0.p.y, s0.p.z + Math.sign(sn) * Math.pow(abs(sn), 2 / 2.2) * s0.ry); };
      const open = []; st.forEach((x, i) => { if (x.gap > 0) open.push(i); });
      const i0 = open[0], i1 = open[open.length - 1];
      for (let i = i0; i <= i1; i++) edge.push(ptAt(-1, i));
      for (let i = i1; i >= i0; i--) edge.push(ptAt(1, i));
      hb.add(lockGeo(edge, 0.014, 0.009, { profile: (t) => 0.55 + 0.45 * sin(t * PI), up: new V3(0, 0, 1), segs: 8 }), { color: hc.clone().multiplyScalar(1.45), region: REG.knit });
    }
    return hb.geometry(false);
  }

  // ------------------------------------------------------------------
  // Biblioteca de poses (funções de tempo). Cada pose devolve rotações
  // [x, y, z] por articulação, deslocamento da raiz {rootY, rootRX},
  // mãos {R, L} e acessórios automáticos {props}. IK de braço: alvos em
  // metros no espaço do personagem (pés na origem, +Z à frente).
  // ------------------------------------------------------------------
  const Z = [0, 0, 0];
  const DEF = { dims: makeDims({}), belly: 0 };
  const _m1 = new T.Matrix4(), _q1 = new T.Quaternion(), _eu = new T.Euler(), _p1 = new V3(), _s1 = new V3(1, 1, 1);
  function chainMatrix(p, D, upTo) {
    const m = new T.Matrix4();
    _eu.set(p.rootRX || 0, 0, 0); _q1.setFromEuler(_eu);
    m.compose(_p1.set(0, p.rootY || 0, 0), _q1, _s1);
    const steps = [['hips', D.hipY], ['spine', D.hipUp], ['chest', D.spine], ['neck', D.chest], ['head', D.neck]];
    for (let i = 0; i < steps.length; i++) {
      const j = steps[i][0], r = p[j] || Z;
      _eu.set(r[0], r[1], r[2]); _q1.setFromEuler(_eu);
      _m1.compose(_p1.set(0, steps[i][1], 0), _q1, _s1);
      m.multiply(_m1);
      if (j === upTo) break;
    }
    return m;
  }
  /** Ponto no espaço do personagem a partir de uma junta da coluna (hips/spine/chest/neck/head). */
  function fk(p, info, joint, local) {
    const D = (info || DEF).dims;
    const m = chainMatrix(p, D, joint);
    const v = new V3(local[0], local[1], local[2]);
    if (joint === 'head') v.y += D.headR * 0.95;
    return v.applyMatrix4(m);
  }
  /** IK de 2 ossos para o braço. target: [x,y,z] ou V3. o: {pole, hand}. */
  function ik(p, side, target, info, o) {
    o = o || {};
    const D = (info || DEF).dims;
    const sx = side === 'R' ? -1 : 1;
    const mc = chainMatrix(p, D, 'chest');
    const S = new V3(sx * D.shX, D.chest - 0.05 + (p.shUp || 0), 0).applyMatrix4(mc);
    const qc = new T.Quaternion().setFromRotationMatrix(mc);
    const P = target.isVector3 ? target.clone() : new V3(target[0], target[1], target[2]);
    const a = D.upArm, b = D.foreArm;
    const Dv = P.clone().sub(S);
    const dir = Dv.clone().normalize();
    const d = clamp(Dv.length(), abs(a - b) + 0.03, a + b - 0.003);
    const pl = o.pole || [sx * 0.35, -0.55, -0.6];
    const pole = new V3(pl[0], pl[1], pl[2]).normalize();
    let pp = pole.clone().addScaledVector(dir, -pole.dot(dir));
    if (pp.lengthSq() < 1e-6) pp = new V3(0, 0, -1).addScaledVector(dir, -dir.z);
    pp.normalize();
    const al = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const u = dir.clone().multiplyScalar(cos(al)).addScaledVector(pp, sin(al)).normalize();
    const Ev = S.clone().addScaledVector(u, a);
    const f = S.clone().addScaledVector(dir, d).sub(Ev).normalize();
    let w = f.clone().addScaledVector(u, -f.dot(u));
    if (w.lengthSq() < 1e-6) w = pp.clone().negate(); else w.normalize();
    const bend = Math.acos(clamp(u.dot(f), -1, 1));
    const Y = u.clone().negate(), X = new V3().crossVectors(Y, w);
    const qw = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(X, Y, w));
    const ql = qc.clone().invert().multiply(qw);
    _eu.setFromQuaternion(ql, 'XYZ');
    p['sh' + side] = [_eu.x, _eu.y, _eu.z];
    p['el' + side] = [-bend, 0, 0];
    if (o.palm || o.fingers) {
      // mão orientada por direção da palma e dos dedos (no espaço do corpo)
      const fg = o.fingers || [0, -1, 0], pm = o.palm || [-sx, 0, 0];
      const Yh = new V3(-fg[0], -fg[1], -fg[2]).normalize();
      const Xh = new V3(pm[0], pm[1], pm[2]).multiplyScalar(side === 'R' ? 1 : -1);
      Xh.addScaledVector(Yh, -Xh.dot(Yh)).normalize();
      const Zh = new V3().crossVectors(Xh, Yh);
      const qh = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Xh, Yh, Zh));
      const qf = qw.clone().multiply(new T.Quaternion().setFromAxisAngle(new V3(1, 0, 0), -bend));
      _eu.setFromQuaternion(qf.invert().multiply(qh), 'XYZ');
      p['ha' + side] = [_eu.x, _eu.y, _eu.z];
    } else if (o.hand) p['ha' + side] = o.hand;
    return { elbow: Ev, shoulder: S };
  }
  R.ik = ik;
  R.fk = fk;

  const add3 = (a, b, k) => [a[0] + b[0] * (k == null ? 1 : k), a[1] + b[1] * (k == null ? 1 : k), a[2] + b[2] * (k == null ? 1 : k)];
  function base(info) {
    const at = info && info.att;
    return {
      hips: [0, 0, 0], spine: [0, 0, 0], chest: at ? at.chest.slice() : [0, 0, 0], neck: [0, 0, 0], head: at ? at.head.slice() : [0, 0, 0],
      shR: [0.06, 0, -0.1], shL: [0.06, 0, 0.1], elR: [-0.22, 0, 0], elL: [-0.22, 0, 0], haR: [0.05, 0.2, -0.05], haL: [0.05, -0.2, 0.05],
      thR: [0, 0, 0.02], thL: [0, 0, -0.02], knR: Z, knL: Z, ftR: Z, ftL: Z,
      rootY: 0, rootRX: 0, shUp: 0, hands: null, props: null,
    };
  }
  function breathe(p, t, k) {
    k = k == null ? 1 : k;
    const b = sin(t * 1.6);
    p.chest = add3(p.chest, [-0.016 * b * k, 0, 0]);
    p.shR = add3(p.shR, [0, 0, -0.015 * b * k]);
    p.shL = add3(p.shL, [0, 0, 0.015 * b * k]);
    p.head = add3(p.head, [0.012 * sin(t * 0.8) * k + 0.008 * b * k, 0.05 * sin(t * 0.33) * k, 0.012 * sin(t * 0.27) * k]);
    p.shUp = (p.shUp || 0) + 0.004 * b * k;
    return p;
  }
  const B = (info) => (info && info.belly) || 0;
  const HY = (info) => (info || DEF).dims.H;
  function seated(p, info) {
    const D = (info || DEF).dims;
    const seatHip = 0.5;
    p.rootY = seatHip - D.hipY;
    const al = Math.asin(clamp((seatHip - 0.05 * D.H - D.shin) / D.thigh, -0.3, 0.6));
    const tx = -(PI / 2 - al);
    p.thR = [tx, 0.09, 0.03]; p.thL = [tx, -0.09, -0.03];
    p.knR = [-tx - 0.06, 0, 0]; p.knL = [-tx - 0.06, 0, 0];
    p.ftR = [0.06, -0.08, 0]; p.ftL = [0.06, 0.08, 0];
    p.spine = add3(p.spine, [0.02, 0, 0]);
    p.seated = true;
    return p;
  }
  // mesa padrão: tampo 0.75 m, borda ~0.48 m à frente do assento
  const DESK = 0.79;
  // orientações de mão prontas (espaço do corpo): {palm, fingers}
  const HP = {
    down: (sg) => ({ palm: [0, -1, 0.1], fingers: [0.15 * sg, -0.25, 1] }),
    thigh: (sg) => ({ palm: [0.1 * sg, -1, 0], fingers: [0.1 * sg, -0.35, 1] }),
    up: (sg) => ({ palm: [0.2 * sg, 1, 0], fingers: [-0.55 * sg, 0.1, 0.85] }),
    fwd: () => ({ palm: [0, 0.1, 1], fingers: [0, 1, 0.1] }),
    inward: (sg) => ({ palm: [sg, 0, 0], fingers: [0, 0, 1] }),
  };
  const POSES = {
    idle(t, a, info) {
      const p = breathe(base(info), t);
      const w = sin(t * 0.42) * 0.8 + sin(t * 0.17) * 0.2;
      p.hips = [0, 0.04 * w, 0.03 * w];
      p.thR = add3(p.thR, [0, 0, -0.03 * w]); p.thL = add3(p.thL, [0, 0, -0.03 * w]);
      p.knR = [0.03 + 0.04 * Math.max(0, -w), 0, 0]; p.knL = [0.03 + 0.04 * Math.max(0, w), 0, 0];
      p.ftR = [0, 0, 0.03 * w]; p.ftL = [0, 0, 0.03 * w];
      p.spine = add3(p.spine, [0, -0.02 * w, -0.025 * w]);
      p.chest = add3(p.chest, [0, -0.02 * w, -0.01 * w]);
      p.head = add3(p.head, [0, 0, 0.03 * w]);
      p.shR = add3(p.shR, [0.02 * sin(t * 0.9), 0, 0]); p.shL = add3(p.shL, [0.02 * sin(t * 0.9 + 1), 0, 0]);
      return p;
    },
    talk(t, a, info) {
      const p = POSES.idle(t * 0.8, a, info);
      const g = sin(t * 2.6) * 0.6 + sin(t * 4.1 + 1) * 0.4, g2 = sin(t * 3.3 + 2) * 0.6 + sin(t * 1.7) * 0.4;
      const beat = Math.pow(Math.max(0, sin(t * 2.2)), 3);
      const bz = B(info) * 0.05;
      ik(p, 'R', [-0.2 + 0.04 * g2, 1.0 * HY(info) + 0.06 * g + 0.04 * beat, 0.22 + bz + 0.05 * g], info, { palm: [0.35, 0.75, 0.3 + 0.3 * g], fingers: [-0.35, 0.15, 1], pole: [-0.7, -0.7, -0.2] });
      ik(p, 'L', [0.2 - 0.02 * g, 0.94 * HY(info) + 0.04 * g2, 0.16 + bz + 0.03 * g2], info, { palm: [-0.4, 0.5, 0.2], fingers: [0.3, 0, 1], pole: [0.7, -0.7, -0.2] });
      p.head = add3(p.head, [0.04 * sin(t * 3.1) - 0.03 * beat, 0.06 * g, 0.03 * g2]);
      p.chest = add3(p.chest, [0, 0.05 * g, 0]);
      p.hands = { R: 'open', L: 'relax' };
      return p;
    },
    walk(t, a, info) {
      const p = base(info);
      const ph = (a && a.walkT != null ? a.walkT : t) * 7.2;
      const s = sin(ph), c = cos(ph);
      const leg = (sg) => {
        const sp = sin(ph + (sg > 0 ? 0 : PI)), cp = cos(ph + (sg > 0 ? 0 : PI));
        const th = -0.4 * sp;
        const kn = 0.07 + 0.85 * Math.pow(Math.max(0, cp), 1.6) * smooth(-0.6, 0.2, -sp + 0.3) + 0.1 * Math.max(0, -cp);
        const ft = -(th + kn) * 0.55 + 0.25 * Math.max(0, sp) * Math.max(0, -cp);
        return [th, kn, ft];
      };
      const r = leg(1), l = leg(-1);
      p.thR = [r[0], 0, 0.02]; p.knR = [r[1], 0, 0]; p.ftR = [r[2], 0, 0];
      p.thL = [l[0], 0, -0.02]; p.knL = [l[1], 0, 0]; p.ftL = [l[2], 0, 0];
      p.hips = [0, 0.09 * s, 0.03 * c];
      p.spine = add3(p.spine, [0.02, -0.05 * s, -0.02 * c]);
      p.chest = add3(p.chest, [0.02, -0.08 * s, 0]);
      p.head = add3(p.head, [0.0, 0.1 * s, 0.015 * c]);
      p.shR = [0.36 * s, 0, -0.1]; p.shL = [-0.36 * s, 0, 0.1];
      p.elR = [-0.3 - 0.3 * Math.max(0, -s), 0, 0]; p.elL = [-0.3 - 0.3 * Math.max(0, s), 0, 0];
      p.rootY = 0.022 * abs(c) - 0.02;
      return p;
    },
    sit(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      ik(p, 'R', [-0.13, 0.565, 0.26], info, Object.assign({ pole: [-0.4, -0.3, -0.8] }, HP.thigh(-1)));
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      return p;
    },
    sittalk(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      const g = sin(t * 2.6) * 0.6 + sin(t * 4.1 + 1) * 0.4, g2 = sin(t * 3.3 + 2);
      ik(p, 'R', [-0.17 + 0.03 * g2, 0.86 + 0.06 * g, 0.3 + 0.04 * g], info, { palm: [0.35, 0.75, 0.3 + 0.3 * g], fingers: [-0.35, 0.15, 1], pole: [-0.7, -0.7, -0.2] });
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      p.head = add3(p.head, [0.03 * sin(t * 3.1), 0.06 * g, 0.02 * g2]);
      p.hands = { R: 'open' };
      return p;
    },
    type(t, a, info) {
      const p = seated(breathe(base(info), t, 0.4), info);
      p.chest = add3(p.chest, [0.1, 0, 0]);
      p.head = add3(p.head, [0.1, 0, 0]);
      const k = sin(t * 17), k2 = sin(t * 14 + 1), k3 = sin(t * 9.3);
      ik(p, 'R', [-0.11 + 0.012 * k3, DESK + 0.01 * Math.max(0, k), 0.43], info, { palm: [0.15, -1, 0.1 - 0.25 * Math.max(0, k)], fingers: [0.2, -0.3, 1], pole: [-0.5, -0.8, -0.2] });
      ik(p, 'L', [0.11 - 0.012 * k3, DESK + 0.01 * Math.max(0, k2), 0.43], info, { palm: [-0.15, -1, 0.1 - 0.25 * Math.max(0, k2)], fingers: [-0.2, -0.3, 1], pole: [0.5, -0.8, -0.2] });
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    phone(t, a, info) {
      const p = breathe(base(info), t);
      p.head = add3(p.head, [0.04, -0.12, 0.1]);
      const ear = fk(p, info, 'head', [-0.215, -0.095, 0.045]);
      const r = ik(p, 'R', ear, info, { palm: [1, 0, -0.1], fingers: [0.15, 1, 0.25], pole: [-0.25, -1, 0.5] });
      ik(p, 'L', [r.elbow.x + 0.08, r.elbow.y - 0.035, r.elbow.z + 0.06 + B(info) * 0.04], info, { palm: [0, 1, 0], fingers: [-1, 0.1, 0.1], pole: [0.8, -0.6, -0.2] });
      p.hands = { R: 'grip', L: 'grip' };
      p.props = { phone: true };
      return p;
    },
    sitphone(t, a, info) {
      const p = seated(breathe(base(info), t, 0.5), info);
      p.head = add3(p.head, [0.04, -0.12, 0.1]);
      const ear = fk(p, info, 'head', [-0.215, -0.095, 0.045]);
      ik(p, 'R', ear, info, { palm: [1, 0, -0.1], fingers: [0.15, 1, 0.25], pole: [-0.25, -1, 0.5] });
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      p.hands = { R: 'grip' };
      p.props = { phone: true };
      return p;
    },
    lookphone(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      p.head = add3(p.head, [0.4, 0, 0]);
      p.chest = add3(p.chest, [0.06, 0, 0]);
      const y = 1.1 * HY(info), z = 0.27 + B(info) * 0.05;
      const tap = Math.max(0, sin(t * 5)) * 0.01;
      ik(p, 'R', [-0.06, y, z], info, { palm: [0.15, 1, -0.55], fingers: [0.35, 0.25, 1], pole: [-0.6, -0.8, -0.1] });
      ik(p, 'L', [0.075, y + 0.015 + tap, z - 0.005], info, { palm: [-0.2, -0.4, -1], fingers: [-0.5, 0.3, 0.8], pole: [0.6, -0.8, -0.1] });
      p.hands = { R: 'grip', L: 'point' };
      p.props = { phone: true };
      return p;
    },
    sitlookphone(t, a, info) {
      const p = seated(breathe(base(info), t, 0.5), info);
      p.head = add3(p.head, [0.38, 0, 0]);
      p.chest = add3(p.chest, [0.1, 0, 0]);
      const tap = Math.max(0, sin(t * 5)) * 0.01;
      ik(p, 'R', [-0.06, 0.82, 0.3], info, { palm: [0.15, 1, -0.55], fingers: [0.35, 0.25, 1], pole: [-0.6, -0.8, -0.1] });
      ik(p, 'L', [0.075, 0.835 + tap, 0.295], info, { palm: [-0.2, -0.4, -1], fingers: [-0.5, 0.3, 0.8], pole: [0.6, -0.8, -0.1] });
      p.hands = { R: 'grip', L: 'point' };
      p.props = { phone: true };
      return p;
    },
    showphone(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      ik(p, 'R', [-0.1, 1.2 * HY(info), 0.42], info, { palm: [0, 0.15, 1], fingers: [0.1, 1, -0.1], pole: [-0.7, -0.7, 0] });
      p.head = add3(p.head, [0.05, -0.08, 0]);
      p.hands = { R: 'grip' };
      p.props = { phone: true };
      return p;
    },
    think(t, a, info) {
      const p = breathe(base(info), t);
      p.head = add3(p.head, [-0.05, 0.12 + 0.05 * sin(t * 0.7), 0.1]);
      const chin = fk(p, info, 'head', [-0.01, -0.17, 0.1]);
      const r = ik(p, 'R', [chin.x - 0.005, chin.y - 0.085, chin.z - 0.01], info, { palm: [0.25, -0.25, -1], fingers: [0.35, 1, 0.3], pole: [-0.2, -1, 0.5] });
      ik(p, 'L', [r.elbow.x + 0.085, r.elbow.y - 0.04, r.elbow.z + 0.05 + B(info) * 0.04], info, { palm: [0, 1, 0], fingers: [-1, 0.1, 0.1], pole: [0.8, -0.6, -0.2] });
      p.hands = { R: 'pinch', L: 'grip' };
      return p;
    },
    sitthink(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      p.head = add3(p.head, [-0.05, 0.12 + 0.05 * sin(t * 0.7), 0.1]);
      const chin = fk(p, info, 'head', [-0.01, -0.17, 0.1]);
      const r = ik(p, 'R', [chin.x - 0.005, chin.y - 0.085, chin.z - 0.01], info, { palm: [0.25, -0.25, -1], fingers: [0.35, 1, 0.3], pole: [-0.2, -1, 0.5] });
      ik(p, 'L', [r.elbow.x + 0.085, r.elbow.y - 0.04, r.elbow.z + 0.07], info, { palm: [0, 1, 0], fingers: [-1, 0.1, 0.1], pole: [0.8, -0.6, -0.2] });
      p.hands = { R: 'pinch', L: 'grip' };
      return p;
    },
    cheer(t, a, info) {
      const p = breathe(base(info), t);
      const b = sin(t * 9);
      ik(p, 'R', [-0.26, 1.95 * HY(info) + 0.04 * b, 0.08], info, { palm: [0.2, 0, 1], fingers: [0, 1, 0], pole: [-1, 0.2, -0.3] });
      ik(p, 'L', [0.3, 1.02 * HY(info) - 0.03 * b, 0.22], info, { palm: [-1, 0, 0], fingers: [0, 0.2, 1], pole: [0.8, -0.6, -0.3] });
      p.head = add3(p.head, [-0.15, 0, 0.05]);
      p.chest = add3(p.chest, [-0.06, 0, 0.04]);
      p.rootY = Math.max(0, b) * 0.03;
      p.hands = { R: 'fist', L: 'fist' };
      return p;
    },
    victory(t, a, info) {
      const p = breathe(base(info), t);
      const b = sin(t * 8);
      ik(p, 'R', [-0.3, 1.97 * HY(info) + 0.03 * b, 0.05], info, { palm: [0.3, 0, 1], fingers: [0, 1, 0], pole: [-1, 0.2, -0.3] });
      ik(p, 'L', [0.3, 1.97 * HY(info) + 0.03 * b, 0.05], info, { palm: [-0.3, 0, 1], fingers: [0, 1, 0], pole: [1, 0.2, -0.3] });
      p.head = add3(p.head, [-0.2, 0, 0]);
      p.chest = add3(p.chest, [-0.08, 0, 0]);
      p.rootY = Math.max(0, b) * 0.04;
      p.hands = { R: 'fist', L: 'fist' };
      return p;
    },
    clap(t, a, info) {
      const p = breathe(base(info), t);
      const c = Math.max(0, sin(t * 12));
      const y = 1.17 * HY(info), z = 0.3 + B(info) * 0.05;
      ik(p, 'R', [-0.05 - 0.07 * c, y, z], info, { palm: [1, 0, 0.1], fingers: [0.25, 0.5, 1], pole: [-0.8, -0.6, 0] });
      ik(p, 'L', [0.05 + 0.07 * c, y, z], info, { palm: [-1, 0, 0.1], fingers: [-0.25, 0.5, 1], pole: [0.8, -0.6, 0] });
      p.hands = { R: 'flat', L: 'flat' };
      return p;
    },
    sleep(t, a, info) {
      const p = base(info);
      p.chest = [0, 0, 0]; p.head = [-0.12, 0.25, 0];
      p.rootRX = -PI / 2;
      p.rootY = 0.62;
      p.shR = [0.02, 0, -0.1]; p.shL = [0.02, 0, 0.1]; p.elR = [-0.25, 0, 0]; p.elL = [-0.25, 0, 0];
      p.haR = [0, 0.4, 0]; p.haL = [0, -0.4, 0];
      p.chest = add3(p.chest, [-0.03 * sin(t * 1.1), 0, 0]);
      p.thR = [0, 0.05, 0.03]; p.thL = [0, -0.05, -0.03];
      p.ftR = [0.3, -0.15, 0]; p.ftL = [0.3, 0.15, 0];
      return p;
    },
    coffee(t, a, info) {
      const p = breathe(base(info), t);
      const sip = smooth(0.35, 0.85, Math.max(0, sin(t * 0.9)));
      p.head = add3(p.head, [0.06 - 0.16 * sip, 0, 0]);
      const mouth = fk(p, info, 'head', [-0.02, -0.11, 0.19]);
      const low = new V3(-0.15, 1.1 * HY(info), 0.25 + B(info) * 0.05);
      const tg = low.lerp(new V3(mouth.x - 0.075, mouth.y - 0.045, mouth.z - 0.02), sip);
      ik(p, 'R', tg, info, { palm: [1, 0, 0.2 * sip], fingers: [0.1, 0.1 * sip, 1], pole: [-0.8, -0.6, -0.1] });
      p.hands = { R: 'grip' };
      p.props = { mug: true };
      return p;
    },
    sitcoffee(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      const sip = smooth(0.35, 0.85, Math.max(0, sin(t * 0.9)));
      p.head = add3(p.head, [0.06 - 0.16 * sip, 0, 0]);
      const mouth = fk(p, info, 'head', [-0.02, -0.11, 0.19]);
      const low = new V3(-0.14, 0.84, 0.32);
      ik(p, 'R', low.lerp(new V3(mouth.x - 0.075, mouth.y - 0.045, mouth.z - 0.02), sip), info, { palm: [1, 0, 0.2 * sip], fingers: [0.1, 0.1 * sip, 1], pole: [-0.8, -0.6, -0.1] });
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      p.hands = { R: 'grip' };
      p.props = { mug: true };
      return p;
    },
    point(t, a, info) {
      const p = breathe(base(info), t);
      ik(p, 'R', [-0.2, 1.33 * HY(info), 0.62], info, { palm: [1, 0, 0], fingers: [-0.1, 0, 1], pole: [-0.6, -0.8, 0] });
      p.head = add3(p.head, [0, -0.1, 0]);
      p.chest = add3(p.chest, [0, -0.1, 0]);
      p.hands = { R: 'point' };
      return p;
    },
    sitpoint(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      ik(p, 'R', [-0.18, 0.98, 0.62], info, { palm: [1, 0, 0], fingers: [-0.1, 0, 1], pole: [-0.6, -0.8, 0] });
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      p.hands = { R: 'point' };
      return p;
    },
    shrug(t, a, info) {
      const p = breathe(base(info), t);
      p.shUp = 0.035;
      ik(p, 'R', [-0.34, 1.06 * HY(info), 0.22], info, Object.assign({ pole: [-0.3, -1, -0.3] }, HP.up(-1)));
      ik(p, 'L', [0.34, 1.06 * HY(info), 0.22], info, Object.assign({ pole: [0.3, -1, -0.3] }, HP.up(1)));
      p.head = add3(p.head, [0.02, 0, 0.16]);
      p.hands = { R: 'open', L: 'open' };
      return p;
    },
    facepalm(t, a, info) {
      const p = breathe(base(info), t);
      p.head = add3(p.head, [0.38, 0, 0.05]);
      p.chest = add3(p.chest, [0.12, 0, 0]);
      const face = fk(p, info, 'head', [-0.01, 0.0, 0.21]);
      ik(p, 'R', [face.x - 0.01, face.y - 0.1, face.z + 0.02], info, { palm: [0, -0.2, -1], fingers: [0.15, 1, 0.1], pole: [-0.4, -0.9, 0.2] });
      p.hands = { R: 'flat' };
      return p;
    },
    stretch(t, a, info) {
      const p = breathe(base(info), t);
      const w = sin(t * 0.8) * 0.03;
      ik(p, 'R', [-0.13, 2.08 * HY(info) + w, -0.02], info, { palm: [1, 0, 0.3], fingers: [0, 1, 0], pole: [-1, 0.2, 0] });
      ik(p, 'L', [0.13, 2.08 * HY(info) + w, -0.02], info, { palm: [-1, 0, 0.3], fingers: [0, 1, 0], pole: [1, 0.2, 0] });
      p.head = add3(p.head, [-0.3, 0, 0]);
      p.chest = add3(p.chest, [-0.12, 0, 0]);
      p.hands = { R: 'open', L: 'open' };
      return p;
    },
    wave(t, a, info) {
      const p = breathe(base(info), t);
      const w = sin(t * 9);
      ik(p, 'R', [-0.38 - 0.04 * w, 1.6 * HY(info), 0.14], info, { palm: [0.1 + 0.3 * w, 0, 1], fingers: [-0.3 * w, 1, 0], pole: [-0.6, -0.8, 0] });
      p.head = add3(p.head, [0, 0, 0.08]);
      p.hands = { R: 'open' };
      return p;
    },
    arms(t, a, info) {
      const p = breathe(base(info), t);
      const z = 0.17 + B(info) * 0.08, y = 1.13 * HY(info);
      ik(p, 'R', [0.15, y + 0.01, z + 0.03], info, { palm: [0, 0, -1], fingers: [0.5, -0.1, -0.85], pole: [-0.8, -0.6, 0.35] });
      ik(p, 'L', [-0.15, y - 0.02, z - 0.0], info, { palm: [0, 0, -1], fingers: [-0.5, -0.1, -0.85], pole: [0.8, -0.6, 0.35] });
      p.chest = add3(p.chest, [-0.03, 0, 0]);
      p.head = add3(p.head, [-0.04, 0, 0]);
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    sitarms(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      const z = 0.19 + B(info) * 0.08, y = 0.82;
      ik(p, 'R', [0.15, y + 0.01, z + 0.03], info, { palm: [0, 0, -1], fingers: [0.5, -0.1, -0.85], pole: [-0.8, -0.6, 0.35] });
      ik(p, 'L', [-0.15, y - 0.02, z], info, { palm: [0, 0, -1], fingers: [-0.5, -0.1, -0.85], pole: [0.8, -0.6, 0.35] });
      p.chest = add3(p.chest, [-0.06, 0, 0]);
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    laugh(t, a, info) {
      const p = breathe(base(info), t);
      const b = sin(t * 14) * 0.05;
      p.chest = add3(p.chest, [-0.14 + b, 0, 0]); p.head = add3(p.head, [-0.2 + b, 0, 0]);
      ik(p, 'L', [0.07, 0.98 * HY(info), 0.2 + B(info) * 0.08], info, { palm: [0, 0, -1], fingers: [-1, -0.2, 0.1], pole: [0.6, -0.7, -0.3] });
      ik(p, 'R', [-0.26, 0.86 * HY(info) + Math.max(0, sin(t * 7)) * 0.04, 0.1], info, { palm: [1, -0.2, 0], fingers: [0, -0.6, 1], pole: [-0.6, -0.6, -0.4] });
      p.hands = { R: 'flat', L: 'flat' };
      return p;
    },
    sad(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      p.head = add3(p.head, [0.32, 0, 0]); p.chest = add3(p.chest, [0.14, 0, 0]);
      p.spine = add3(p.spine, [0.05, 0, 0]);
      p.shR = [0.16, 0, -0.04]; p.shL = [0.16, 0, 0.04]; p.elR = [-0.12, 0, 0]; p.elL = [-0.12, 0, 0];
      p.shUp = -0.015;
      return p;
    },
    scared(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      const j = sin(t * 30) * 0.012;
      p.chest = add3(p.chest, [-0.12 + j, 0, 0]); p.head = add3(p.head, [-0.08, 0, 0]);
      p.shUp = 0.03;
      ik(p, 'R', [-0.14, 1.36 * HY(info) + j, 0.3], info, { palm: [0.2, 0, 1], fingers: [-0.2, 1, 0], pole: [-0.8, -0.6, 0] });
      ik(p, 'L', [0.14, 1.3 * HY(info) - j, 0.32], info, { palm: [-0.2, 0, 1], fingers: [0.2, 1, 0], pole: [0.8, -0.6, 0] });
      p.knR = [0.12, 0, 0]; p.knL = [0.12, 0, 0]; p.thR = [-0.08, 0, 0.04]; p.thL = [-0.08, 0, -0.04]; p.rootY = -0.012;
      p.hands = { R: 'open', L: 'open' };
      return p;
    },
    lie(t, a, info) { return POSES.sleep(t, a, info); },
    stand(t, a, info) { return POSES.idle(t, a, info); },
    // ---- novas (reuniões, documentos, celular, gestos)
    nod(t, a, info) { const p = POSES.idle(t, a, info); p.head = add3(p.head, [0.13 * Math.pow(Math.max(0, sin(t * 4.5)), 2) - 0.02, 0, 0]); return p; },
    headshake(t, a, info) { const p = POSES.idle(t, a, info); p.head = add3(p.head, [0.04, 0.28 * sin(t * 6.5), 0]); return p; },
    listen(t, a, info) {
      const p = POSES.idle(t, a, info);
      const z = 0.16 + B(info) * 0.07;
      ik(p, 'R', [-0.045, 0.94 * HY(info), z + 0.01], info, { palm: [0.3, 0, -1], fingers: [0.8, -0.55, 0], pole: [-0.5, -0.8, -0.2] });
      ik(p, 'L', [0.05, 0.92 * HY(info), z], info, { palm: [-0.3, 0, -1], fingers: [-0.8, -0.55, 0], pole: [0.5, -0.8, -0.2] });
      p.head = add3(p.head, [0.05 + 0.05 * Math.pow(Math.max(0, sin(t * 1.3)), 6), 0, 0.06]);
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    read(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      p.head = add3(p.head, [0.36, 0.04 * sin(t * 0.5), 0]);
      p.chest = add3(p.chest, [0.05, 0, 0]);
      const y = 1.12 * HY(info), z = 0.3 + B(info) * 0.05;
      ik(p, 'L', [0.11, y, z], info, { palm: [-1, 0, -0.35], fingers: [0, 0.8, 0.6], pole: [0.6, -0.8, -0.1] });
      ik(p, 'R', [-0.11, y, z], info, { palm: [1, 0, -0.35], fingers: [0, 0.8, 0.6], pole: [-0.6, -0.8, -0.1] });
      p.hands = { R: 'pinch', L: 'pinch' };
      p.props = { papers: true };
      return p;
    },
    sitread(t, a, info) {
      const p = seated(breathe(base(info), t, 0.5), info);
      p.head = add3(p.head, [0.36, 0.04 * sin(t * 0.5), 0]);
      p.chest = add3(p.chest, [0.08, 0, 0]);
      ik(p, 'L', [0.11, 0.86, 0.33], info, { palm: [-1, 0, -0.35], fingers: [0, 0.8, 0.6], pole: [0.6, -0.8, -0.1] });
      ik(p, 'R', [-0.11, 0.86, 0.33], info, { palm: [1, 0, -0.35], fingers: [0, 0.8, 0.6], pole: [-0.6, -0.8, -0.1] });
      p.hands = { R: 'pinch', L: 'pinch' };
      p.props = { papers: true };
      return p;
    },
    sitlisten(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      p.chest = add3(p.chest, [0.06, 0, 0]);
      ik(p, 'R', [-0.07, DESK, 0.42], info, { palm: [0.4, -1, 0], fingers: [0.75, -0.2, 0.65], pole: [-0.6, -0.7, -0.2] });
      ik(p, 'L', [0.07, DESK, 0.41], info, { palm: [-0.4, -1, 0], fingers: [-0.75, -0.2, 0.65], pole: [0.6, -0.7, -0.2] });
      p.head = add3(p.head, [0.04 + 0.06 * Math.pow(Math.max(0, sin(t * 1.4)), 6), 0, 0.05]);
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    sitwrite(t, a, info) {
      const p = seated(breathe(base(info), t, 0.4), info);
      p.chest = add3(p.chest, [0.14, 0, 0]);
      p.head = add3(p.head, [0.3, 0.05, 0]);
      const w = sin(t * 9) * 0.012, w2 = cos(t * 4.5) * 0.02;
      ik(p, 'R', [-0.1 + w2, DESK + 0.005 + Math.max(0, w) * 0.3, 0.43 + w], info, { palm: [0.6, -0.8, 0], fingers: [0.3, -0.5, 1], pole: [-0.6, -0.7, -0.2] });
      ik(p, 'L', [0.14, DESK - 0.01, 0.42], info, { palm: [0, -1, 0], fingers: [-0.5, -0.1, 0.85], pole: [0.6, -0.7, -0.2] });
      p.hands = { R: 'pinch', L: 'flat' };
      p.props = { pen: true };
      return p;
    },
    sitmouse(t, a, info) {
      const p = seated(breathe(base(info), t, 0.4), info);
      p.chest = add3(p.chest, [0.06, 0, 0]);
      const m = sin(t * 0.7) * 0.02;
      ik(p, 'R', [-0.27 + m, DESK, 0.44 + m * 0.5], info, Object.assign({ pole: [-0.6, -0.8, -0.1] }, HP.down(-1)));
      ik(p, 'L', [0.11, DESK - 0.005, 0.41], info, Object.assign({ pole: [0.6, -0.8, -0.1] }, HP.down(1)));
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    sitrelax(t, a, info) {
      const p = seated(breathe(base(info), t, 0.6), info);
      p.spine = add3(p.spine, [-0.12, 0, 0]); p.chest = add3(p.chest, [-0.08, 0, 0]);
      p.head = add3(p.head, [-0.05, 0, 0]);
      const back = fk(p, info, 'head', [0, 0.02, -0.18]);
      ik(p, 'R', [back.x - 0.075, back.y - 0.02, back.z - 0.02], info, { palm: [0.2, 0, 1], fingers: [1, 0.6, 0], pole: [-1, 0.6, 0.2] });
      ik(p, 'L', [back.x + 0.075, back.y - 0.02, back.z - 0.02], info, { palm: [-0.2, 0, 1], fingers: [-1, 0.6, 0], pole: [1, 0.6, 0.2] });
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    present(t, a, info) {
      const p = breathe(base(info), t);
      const g = sin(t * 1.6);
      p.chest = add3(p.chest, [0, 0.2, 0]); p.hips = [0, 0.08, 0];
      p.head = add3(p.head, [0, -0.1 + 0.25 * smooth(-0.2, 0.6, sin(t * 0.6)), 0]);
      ik(p, 'L', [0.44, 1.2 * HY(info) + 0.03 * g, 0.34], info, { palm: [0.1, 1, 0.35], fingers: [1, 0.1, 0.35], pole: [0.5, -0.9, -0.3] });
      ik(p, 'R', [-0.17, 0.98 * HY(info), 0.2 + B(info) * 0.05], info, { palm: [1, 0, 0], fingers: [0, -0.2, 1], pole: [-0.6, -0.7, -0.3] });
      p.hands = { R: 'grip', L: 'open' };
      p.props = { clicker: true };
      return p;
    },
    handshake(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      const s2 = sin(t * 7) * 0.02;
      ik(p, 'R', [-0.1, 0.98 * HY(info) + s2, 0.42], info, { palm: [1, 0, 0], fingers: [0.15, -0.1, 1], pole: [-0.7, -0.7, 0] });
      p.chest = add3(p.chest, [0.06, 0, 0]);
      p.hands = { R: 'flat' };
      return p;
    },
    dictate(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      p.head = add3(p.head, [0.18, 0, 0]);
      const mouth = fk(p, info, 'head', [0, -0.13, 0.17]);
      ik(p, 'R', [mouth.x - 0.07, mouth.y - 0.04, mouth.z + 0.02], info, { palm: [0.3, 1, -0.45], fingers: [0.7, 0.35, 0.6], pole: [-0.7, -0.7, 0] });
      ik(p, 'L', [0.2, 0.92 * HY(info), 0.12], info, { pole: [0.6, -0.7, -0.3] });
      p.hands = { R: 'grip' };
      p.props = { phone: true };
      return p;
    },
    sitdictate(t, a, info) {
      const p = seated(breathe(base(info), t, 0.5), info);
      p.head = add3(p.head, [0.18, 0, 0]);
      const mouth = fk(p, info, 'head', [0, -0.13, 0.17]);
      ik(p, 'R', [mouth.x - 0.07, mouth.y - 0.04, mouth.z + 0.02], info, { palm: [0.3, 1, -0.45], fingers: [0.7, 0.35, 0.6], pole: [-0.7, -0.7, 0] });
      ik(p, 'L', [0.13, 0.565, 0.27], info, Object.assign({ pole: [0.4, -0.3, -0.8] }, HP.thigh(1)));
      p.hands = { R: 'grip' };
      p.props = { phone: true };
      return p;
    },
    pocket(t, a, info) {
      const p = POSES.idle(t, a, info);
      const y = 0.88 * HY(info);
      ik(p, 'R', [-0.16, y + 0.02, 0.085], info, { palm: [1, 0, 0.1], fingers: [0.25, -1, -0.35], pole: [-0.6, -0.4, -0.8] });
      ik(p, 'L', [0.16, y + 0.02, 0.085], info, { palm: [-1, 0, 0.1], fingers: [-0.25, -1, -0.35], pole: [0.6, -0.4, -0.8] });
      p.hands = { R: 'flat', L: 'flat' };
      return p;
    },
    thumbsup(t, a, info) {
      const p = breathe(base(info), t);
      ik(p, 'R', [-0.18, 1.16 * HY(info), 0.3 + B(info) * 0.04], info, { palm: [1, 0, 0], fingers: [0, 0, 1], pole: [-0.7, -0.7, -0.2] });
      p.head = add3(p.head, [-0.04, 0, 0.06]);
      p.hands = { R: 'thumb' };
      return p;
    },
    idea(t, a, info) {
      const p = breathe(base(info), t);
      const head = fk(p, info, 'head', [-0.14, 0.02, 0.1]);
      ik(p, 'R', [head.x - 0.06, head.y - 0.06, head.z + 0.04], info, { palm: [0.2, 0, 1], fingers: [0, 1, 0], pole: [-0.7, -0.7, 0] });
      p.head = add3(p.head, [-0.1, 0, 0]);
      p.hands = { R: 'point' };
      return p;
    },
    nervous(t, a, info) {
      const p = breathe(base(info), t);
      const r = sin(t * 5) * 0.015;
      const nape = fk(p, info, 'head', [-0.04, -0.12, -0.13]);
      ik(p, 'R', [nape.x - 0.04, nape.y - 0.05 + r, nape.z - 0.02], info, { palm: [0.2, 0, 1], fingers: [1, 0.4, 0], pole: [-0.8, 0.3, 0.4] });
      p.head = add3(p.head, [0.12, -0.12, 0.1]);
      p.hands = { R: 'relax' };
      return p;
    },
    hug(t, a, info) {
      const p = breathe(base(info), t, 0.5);
      ik(p, 'R', [-0.2, 1.22 * HY(info), 0.4], info, { palm: [0.8, 0, -0.4], fingers: [0.5, 0, 0.85], pole: [-1, -0.1, -0.1] });
      ik(p, 'L', [0.2, 1.2 * HY(info), 0.38], info, { palm: [-0.8, 0, -0.4], fingers: [-0.5, 0, 0.85], pole: [1, -0.1, -0.1] });
      p.head = add3(p.head, [0.1, 0.3, 0.1]);
      p.chest = add3(p.chest, [0.05, 0, 0]);
      p.hands = { R: 'flat', L: 'flat' };
      return p;
    },
    lurk(t, a, info) {
      const p = breathe(base(info), t, 0.7);
      p.spine = add3(p.spine, [0.15, 0, 0]); p.chest = add3(p.chest, [0.2, 0.1 * sin(t * 0.5), 0]); p.head = add3(p.head, [-0.15, 0, 0.12 * sin(t * 0.7)]);
      ik(p, 'R', [-0.26, 0.85, 0.32], info, { palm: [0.6, -0.6, 0], fingers: [0, -0.7, 1], pole: [-0.7, -0.4, -0.5] });
      ik(p, 'L', [0.26, 0.9, 0.32], info, { palm: [-0.6, -0.6, 0], fingers: [0, -0.7, 1], pole: [0.7, -0.4, -0.5] });
      p.hands = { R: 'relax', L: 'relax' };
      return p;
    },
    appear(t, a, info) { return POSES.idle(t, a, info); },
    vanish(t, a, info) { return POSES.idle(t, a, info); },
  };
  R.POSES = POSES;

  // ------------------------------------------------------------------
  // Acessórios de mão (no espaço do osso da mão; palma = pn)
  // ------------------------------------------------------------------
  function buildProps(J, sxR, mat) {
    const props = {};
    const mk = (name, hand, build, pos, rot) => {
      const g = new T.Group();
      g.name = 'prop:' + name;
      g.position.set(pos[0], pos[1], pos[2]);
      if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
      build(g);
      J[hand].add(g);
      g.visible = false;
      g.userData.hand = hand === 'haR' ? 'R' : 'L';
      props[name] = g;
      return g;
    };
    const B2 = (geoFn, color, reg) => { const b = new Bucket(); geoFn(b, col(color), reg); const m = new T.Mesh(b.geometry(false), mat); m.castShadow = true; return m; };
    // celular (tela para o lado da palma: +X na mão direita)
    mk('phone', 'haR', (g) => {
      g.add(B2((b, c) => { const t = new T.BoxGeometry(0.009, 0.15, 0.073); b.add(M.roundedBoxGeo(0.009, 0.15, 0.073, 0.004, 2), { color: col('#1e2028'), region: REG.plastic }); void t; }, '#1e2028'));
      const scr = new T.Mesh(M.planeGeo(0.136, 0.064), new T.MeshBasicMaterial({ color: '#9adfff', toneMapped: false }));
      scr.rotation.set(0, PI / 2, PI / 2);
      scr.position.set(0.0047, 0, 0);
      g.add(scr);
      g.userData.screen = scr;
    }, [0.026, -0.072, 0.004], [0, 0, 0]);
    props.phone.userData.screen = props.phone.children[1];
    // caneca (eixo ao longo de +Z da mão: polegar em cima)
    mk('mug', 'haR', (g) => {
      g.add(B2((b) => {
        const body = new T.CylinderGeometry(0.041, 0.037, 0.095, 20, 1, false);
        b.add(body, { color: col('#f4efe6'), region: REG.teeth });
        b.add(new T.CylinderGeometry(0.035, 0.035, 0.004, 20), { m: mat4([0, 0.043, 0]), color: col('#4a2a18'), region: REG.mouth });
        b.add(new T.TorusGeometry(0.022, 0.0075, 8, 16, PI * 1.2), { m: mat4([0.044, 0.0, 0], [0, 0, -PI * 0.6]), color: col('#f4efe6'), region: REG.teeth });
        b.add(new T.CylinderGeometry(0.0415, 0.0415, 0.018, 20, 1, true), { m: mat4([0, -0.012, 0]), color: col('#ff7a45'), region: REG.teeth });
      }, '#fff'));
    }, [0.052, -0.06, 0.012], [PI / 2, 0, 0]);
    // papéis (mão esquerda): folha no plano XY da mão, estendendo-se para o lado da palma
    mk('papers', 'haL', (g) => {
      g.add(B2((b) => {
        b.add(new T.BoxGeometry(0.21, 0.29, 0.0025), { color: col('#fbfaf5'), region: REG.cloth });
        b.add(new T.BoxGeometry(0.21, 0.29, 0.0025), { m: mat4([-0.004, 0.004, -0.003], [0, 0, 0.04]), color: col('#eeebe2'), region: REG.cloth });
        for (let i = 0; i < 10; i++) b.add(new T.BoxGeometry(i % 4 === 3 ? 0.09 : 0.15, 0.0055, 0.0008), { m: mat4([i % 4 === 3 ? 0.02 : 0, 0.11 - i * 0.022, 0.0017]), color: col(i === 0 ? '#2a3a5a' : i === 5 ? '#d9534f' : '#9aa0aa'), region: REG.cloth });
      }, '#fff'));
    }, [-0.115, -0.045, 0.01], [0, 0, 0]);
    // tablet
    mk('tablet', 'haL', (g) => {
      g.add(B2((b) => {
        b.add(M.roundedBoxGeo(0.19, 0.26, 0.009, 0.008, 2), { color: col('#22252e'), region: REG.plastic });
        b.add(new T.BoxGeometry(0.17, 0.235, 0.001), { m: mat4([0, 0, 0.005]), color: col('#7fc4ef'), region: REG.emit });
      }, '#fff'));
    }, [-0.105, -0.05, 0.012], [0, 0, 0]);
    // caneta
    mk('pen', 'haR', (g) => {
      g.add(B2((b) => {
        b.add(new T.CylinderGeometry(0.0045, 0.0045, 0.13, 8), { color: col('#1d2a4a'), region: REG.plastic });
        b.add(new T.ConeGeometry(0.0045, 0.012, 8), { m: mat4([0, -0.071, 0], [PI, 0, 0]), color: col('#c9c2b0'), region: REG.metal });
      }, '#fff'));
    }, [0.012, -0.075, 0.03], [1.1, 0, 0]);
    // pasta de documentos
    mk('folder', 'haL', (g) => {
      g.add(B2((b) => {
        b.add(M.roundedBoxGeo(0.24, 0.32, 0.016, 0.004, 1), { color: col('#2a4a7a'), region: REG.leather });
        b.add(new T.BoxGeometry(0.22, 0.3, 0.004), { m: mat4([0.006, 0, 0.008]), color: col('#f6f3ea'), region: REG.cloth });
      }, '#fff'));
    }, [-0.12, -0.05, 0.012], [0, 0, 0]);
    // maleta (pendurada)
    mk('briefcase', 'haR', (g) => {
      g.add(B2((b) => {
        b.add(M.roundedBoxGeo(0.1, 0.3, 0.42, 0.02, 2), { m: mat4([0, -0.19, 0]), color: col('#3a2418'), region: REG.leather });
        b.add(new T.TorusGeometry(0.035, 0.009, 8, 14, PI), { m: mat4([0, -0.035, 0], [0, PI / 2, 0]), color: col('#2a1a10'), region: REG.leather });
        [-1, 1].forEach((s) => b.add(new T.BoxGeometry(0.104, 0.02, 0.03), { m: mat4([0, -0.07, s * 0.12]), color: col('#c9b27a'), region: REG.gold }));
      }, '#fff'));
    }, [0.02, -0.06, 0], [0, 0, 0]);
    // passador de slides
    mk('clicker', 'haR', (g) => {
      g.add(B2((b) => {
        b.add(M.roundedBoxGeo(0.022, 0.1, 0.03, 0.008, 2), { color: col('#2a2c34'), region: REG.plastic });
        b.add(new T.CylinderGeometry(0.004, 0.004, 0.004, 8), { m: mat4([0.012, -0.03, 0], [0, 0, PI / 2]), color: col('#ff3a3a'), region: REG.emitRed });
      }, '#fff'));
    }, [0.02, -0.07, 0.01]);
    void sxR;
    return props;
  }

  // ------------------------------------------------------------------
  // Construção do personagem humano
  // ------------------------------------------------------------------
  /**
   * spec: {
   *   skin: 'claro'|'medio'|'escuro' | {base, dark, lip, cheek},
   *   height: 1 (escala), belly: 0..1, build: -1..1 (magro/forte), shoulders: 1, female: false,
   *   hair: {style:'curto'|'grisalho'|'baguncado'|'longo'|'coque'|'cacheado'|'careca'|'raspado'|'rabo'|'chanel'|'nenhum', color},
   *   mustache: cor|null, beard: cor|null, stubble: 0..0.3, glasses: true|{color, metal, w, h, n, cat},
   *   top: {kind:'blazer'|'coat'|'shirt'|'polo'|'tshirt'|'hoodie'|'sweater'|'blouse'|'cloak', color, shirt, tie, pattern, sleeves, untucked, necklace, pocketSquare},
   *   pants: cor, jeans: bool, shoes: cor, shoeStyle: 'social'|'tenis', shoeAccent, soleColor, socks,
   *   eyes: cor da íris, eyeSize, browColor, watch, earrings, nose, face:{w,jaw,chin,jawLen,cheek}, age, shinyScalp,
   *   ghost: false (golpista)
   * }
   */
  const geoCache = {};
  R.human = function (spec) {
    spec = Object.assign({ height: 1, belly: 0, shoulders: 1, hair: { style: 'curto', color: '#3a2a22' }, top: { kind: 'shirt', color: '#4a7bd1' }, pants: '#33384a', shoes: '#2a1d18', eyes: '#3a2416' }, spec || {});
    if (spec.glasses === true) spec.glasses = { color: '#2a2a32' };
    const skin = typeof spec.skin === 'object' ? spec.skin : SKINS[spec.skin || 'medio'] || SKINS.medio;
    const ghost = !!spec.ghost;
    const D = makeDims(spec);
    const fem = D.fem;
    const hs = headShape(spec);
    const surf = faceSurf(hs);

    // --- esqueleto
    const root = new T.Group(); root.name = 'root';
    const pivot = M.group({ parent: root, name: 'pivot' });
    const J = { root, pivot };
    const mk = (name, parent, x, y, z) => { const b = new T.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); J[name] = b; return b; };
    mk('hips', pivot, 0, D.hipY, 0);
    mk('spine', J.hips, 0, D.hipUp, 0);
    mk('chest', J.spine, 0, D.spine, 0);
    mk('neck', J.chest, 0, D.chest, 0);
    mk('head', J.neck, 0, D.neck, 0);
    mk('shR', J.chest, -D.shX, D.chest - 0.05, 0); mk('elR', J.shR, 0, -D.upArm, 0); mk('haR', J.elR, 0, -D.foreArm, 0);
    mk('shL', J.chest, D.shX, D.chest - 0.05, 0); mk('elL', J.shL, 0, -D.upArm, 0); mk('haL', J.elL, 0, -D.foreArm, 0);
    mk('thR', J.hips, -D.hipX, 0, 0); mk('knR', J.thR, 0, -D.thigh, 0); mk('ftR', J.knR, 0, -D.shin, 0);
    mk('thL', J.hips, D.hipX, 0, 0); mk('knL', J.thL, 0, -D.thigh, 0); mk('ftL', J.knL, 0, -D.shin, 0);
    const skull = M.group({ parent: J.head, pos: [0, hs.r * 0.95, 0], name: 'skull' });
    J.skull = skull;
    root.updateMatrixWorld(true);
    const skeleton = new T.Skeleton(BONES.map((n) => J[n]));

    // --- olhos (posições no espaço do crânio)
    const re = (fem ? 0.0345 : 0.032) * (spec.eyeSize || 1);
    const ex = fem ? 0.063 : 0.064, ey = 0.002;
    const E = [-1, 1].map((sx) => {
      const P = new V3(), N = new V3();
      surf(sx * ex, ey, P, N);
      const F = N.clone().lerp(new V3(0, 0, 1), 0.7).add(new V3(sx * 0.05, 0, 0)).normalize();
      const X = new V3(0, 1, 0).cross(F).normalize(), Y = new V3().crossVectors(F, X);
      return { side: sx, c: P.clone().addScaledVector(N, -re * 0.48), F, X, Y, re, rl: re * 1.085, rl2: re * 1.065 };
    });

    // --- geometria (cache por especificação)
    const key = JSON.stringify(spec);
    let G = geoCache[key];
    if (!G) {
      const bodyG = buildBody(spec, D, skin);
      G = { body: bodyG.body, pattern: bodyG.pattern, head: buildHead(spec, D, hs, skin, E.map((e) => Object.assign({}, e))), lenses: null };
      if (spec.glasses && !ghost) {
        const lb = new Bucket();
        E.forEach((e) => {
          const ctr = new V3(e.c.x, e.c.y + 0.002, e.c.z + e.re + 0.0125);
          const rot = new T.Quaternion().setFromEuler(new T.Euler(0, e.side * 0.14, 0));
          const gw = (spec.glasses.w || 0.03) * 0.97, gh = (spec.glasses.h || 0.0225) * 0.96, gn = spec.glasses.n || 3.2;
          const shape = new T.Shape();
          for (let k = 0; k <= 28; k++) { const a = (k / 28) * PI * 2, c = cos(a), s = sin(a); const x = Math.sign(c) * Math.pow(abs(c), 2 / gn) * gw, y = Math.sign(s) * Math.pow(abs(s), 2 / gn) * gh; if (k) shape.lineTo(x, y); else shape.moveTo(x, y); }
          const g = new T.ShapeGeometry(shape);
          lb.add(g, { m: new T.Matrix4().compose(ctr, rot, new V3(1, 1, 1)), color: col('#ffffff'), region: REG.eye });
        });
        G.lenses = lb.geometry(false);
      }
      geoCache[key] = G;
    }

    // --- materiais e malhas
    const bodyMat = bodyMaterial({ rim: ghost ? 1.6 : 1 });
    if (ghost) { bodyMat.userData.rimK.value = 2.2; }
    const mats = [bodyMat];
    const body = new T.SkinnedMesh(G.body, bodyMat);
    body.name = 'body'; body.frustumCulled = false; body.castShadow = true; body.receiveShadow = true;
    root.add(body);
    body.bind(skeleton);
    if (G.pattern) {
      const pm = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, map: patternTex(spec.top.pattern, spec.top.color) });
      addRim(pm);
      const pmesh = new T.SkinnedMesh(G.pattern, pm);
      pmesh.frustumCulled = false; pmesh.castShadow = true; pmesh.receiveShadow = true;
      root.add(pmesh); pmesh.bind(skeleton);
      mats.push(pm);
    }
    const headMesh = new T.Mesh(G.head, bodyMat);
    headMesh.name = 'headStatic'; headMesh.castShadow = true; headMesh.receiveShadow = true;
    skull.add(headMesh);
    let lensMesh = null;
    if (G.lenses) {
      const lm = new T.MeshStandardMaterial({ color: '#e8f3ff', roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.09, depthWrite: false });
      lensMesh = new T.Mesh(G.lenses, lm);
      lensMesh.renderOrder = 2;
      skull.add(lensMesh);
      mats.push(lm);
    }
    // mãos
    const handSize = (fem ? 0.9 : 1) * D.H * (1 + (spec.build || 0) * 0.05);
    const handCol = ghost ? '#0c0812' : skin.base;
    const hands = {};
    ['R', 'L'].forEach((s) => {
      const m = new T.Mesh(handGeo(s, 'relax', handSize, handCol, ghost), bodyMat);
      m.castShadow = true; m.receiveShadow = true; m.name = 'hand' + s;
      J['ha' + s].add(m);
      hands[s] = { mesh: m, shape: 'relax' };
    });

    // --- rosto
    const face = { eyes: [], brows: [], mouth: {}, extras: {} };
    let faceDyn = null;
    const eyeGroups = [];
    if (!ghost) {
      const eg = eyeGeo(re, spec.eyes || '#3a2416');
      E.forEach((e) => {
        const g = new T.Group();
        g.position.copy(e.c);
        g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(e.X, e.Y, e.F));
        const ball = new T.Mesh(eg, bodyMat);
        ball.castShadow = false; ball.receiveShadow = true;
        g.add(ball);
        skull.add(g);
        eyeGroups.push({ g, ball });
        face.eyes.push({ g, pupil: ball, base: new V3() });
      });
      const lidC = M.mix(skin.base, skin.dark, 0.18).lerp(col(skin.cheek || skin.lip), 0.08);
      faceDyn = makeFaceDyn({
        surf, mat: bodyMat, eyes: E, fem,
        lidColor: lidC, lashColor: col(fem ? '#1a1210' : M.hex(M.mix(spec.browColor || (spec.hair && spec.hair.color) || '#3a2a22', '#000', 0.5))),
        bagColor: M.mix(skin.base, '#5a3a5a', 0.22),
        browColor: col(spec.browColor || M.hex(M.mix((spec.hair && spec.hair.color) || '#3a2a22', '#000', 0.2))),
        browIn: 0.02, browOut: fem ? 0.088 : 0.094, browY: ey + (fem ? 0.062 : 0.058), browH: fem ? 0.0088 : (spec.browH || 0.0118), browTaper: fem ? 0.45 : 0.6,
        mouthY: spec.mouthY || (spec.mustache ? -0.1 : -0.093), mouthW: (fem ? 0.0275 : 0.0305) * (spec.mouthSize || 1),
        lipTop: M.mix(skin.lip, skin.dark, 0.3), lipBot: col(skin.lip), lipUp: fem ? 0.0036 : 0.003, lipLow: fem ? 0.0052 : 0.0042,
      });
      skull.add(faceDyn.mesh);
      // extras: suor, lágrima, vergonha, raiva
      const sweatM = new T.MeshStandardMaterial({ color: '#9ad8ff', roughness: 0.05, transparent: true, opacity: 0.85 });
      mats.push(sweatM);
      const sw = new T.Group();
      const P = new V3(), N = new V3();
      surf(0.115, 0.075, P, N);
      sw.position.copy(P).addScaledVector(N, 0.006);
      sw.add(new T.Mesh(M.sphereGeo(0.012, 12, 10), sweatM)); sw.children[0].scale.set(1, 1.25, 0.7);
      const cone = new T.Mesh(M.coneGeo(0.0105, 0.018, 12), sweatM); cone.position.y = 0.017; sw.add(cone);
      sw.visible = false; skull.add(sw);
      face.extras.sweat = sw; face.extras.sweatBase = sw.position.clone();
      const tear = new T.Mesh(M.sphereGeo(0.008, 10, 8), sweatM);
      tear.scale.set(1, 1.4, 0.7);
      surf(-ex + 0.004, ey - 0.032, P, N); tear.position.copy(P).addScaledVector(N, 0.004);
      tear.visible = false; skull.add(tear);
      face.extras.tear = tear; face.extras.tearBase = tear.position.clone();
      const ov = (cx, cy, rr, color, alpha) => {
        const g = new T.RingGeometry(0.0001, 1, 24, 8);
        const pos = g.attributes.position, cols = new Float32Array(pos.count * 4);
        const cc = col(color);
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), y = pos.getY(i);
          surf(cx + x * rr, cy + y * rr * 0.75, P, N);
          P.addScaledVector(N, 0.0012);
          pos.setXYZ(i, P.x, P.y, P.z);
          const r = Math.hypot(x, y);
          cols.set([cc.r, cc.g, cc.b, alpha * (1 - smooth(0.1, 1, r))], i * 4);
        }
        g.setAttribute('color', new T.BufferAttribute(cols, 4));
        g.computeVertexNormals();
        return g;
      };
      const ovM = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: true });
      const blushB = new T.Group();
      [-1, 1].forEach((sx) => blushB.add(new T.Mesh(ov(sx * 0.085, -0.045, 0.032, '#ff6f86', 0.6), ovM)));
      blushB.visible = false; skull.add(blushB);
      face.extras.blush = [blushB];
      const redM = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, opacity: 0 });
      const red = new T.Mesh(ov(0, 0.05, 0.13, '#ff2a1a', 0.42), redM);
      red.visible = false; skull.add(red);
      face.extras.red = red;
      face.extras.bags = [];
      mats.push(ovM);
      ovM.userData.keepTransparent = true;
    } else {
      // olhos vermelhos do golpista
      const em = new Bucket();
      [-1, 1].forEach((sx) => em.add(ballGeo(0.019, 0.0085, 0.006, 14, 8), { m: mat4([sx * 0.047, 0.012, hs.r * 0.9], [0, 0, sx * -0.18]), color: col('#ff2a3a'), region: REG.emitRed }));
      const gEyes = new T.Mesh(em.geometry(false), bodyMat);
      skull.add(gEyes);
      face.ghostEyes = gEyes;
      [-1, 1].forEach((sx) => { const gl = M.glow('#ff2030', 0.1, 0.75); gl.position.set(sx * 0.047, 0.012, hs.r * 0.95); skull.add(gl); mats.push(gl.material); gl.material.userData.keepTransparent = true; });
    }

    // --- acessórios
    const props = buildProps(J, -1, bodyMat);

    const baseHeight = D.hipY + D.hipUp + D.spine + D.chest + D.neck + hs.r * 0.95 + hs.r * 1.08 + 0.02;
    const headY = D.hipY + D.hipUp + D.spine + D.chest + D.neck + hs.r * 0.95;
    const info = { dims: D, belly: spec.belly || 0, baseHeight, headY, ghost, fem, hands, handSize, handCol, faceDyn, eyeGroups, E, skeleton, body };
    return makeController(root, J, face, props, mats, info);
  };

  // estampa tropical (camisa do Jorge)
  const patCache = {};
  function patternTex(colors, baseC) {
    const key = JSON.stringify([colors, baseC]);
    if (patCache[key]) return patCache[key];
    const t = M.canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = baseC || '#f0a43a'; ctx.fillRect(0, 0, w, h);
      const r = M.rng(5);
      const leaf = (x, y, s, a, c) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.55, 0, 0, s); ctx.quadraticCurveTo(-s * 0.55, 0, 0, -s); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.lineTo(0, s * 0.9); ctx.stroke(); ctx.restore(); };
      const flower = (x, y, s, c) => { ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2; ctx.beginPath(); ctx.ellipse(x + cos(a) * s * 0.55, y + sin(a) * s * 0.55, s * 0.5, s * 0.32, a, 0, PI * 2); ctx.fill(); } ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(x, y, s * 0.22, 0, PI * 2); ctx.fill(); };
      for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h; for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) leaf(x + dx, y + dy, 18 + r() * 14, r() * PI * 2, colors[0] || '#2f9f78'); }
      for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h, cc = colors[1 + (i % Math.max(1, colors.length - 1))] || '#ff6b6b'; for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) flower(x + dx, y + dy, 14 + r() * 8, cc); }
    }, { repeat: [1, 1] });
    t.wrapS = t.wrapT = T.RepeatWrapping;
    patCache[key] = t;
    return t;
  }

  // ------------------------------------------------------------------
  // Controlador: aplica pose (mistura por quatérnios), rosto e acessórios
  // ------------------------------------------------------------------
  function makeController(root, J, face, props, mats, info) {
    info = info || {};
    const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shR', 'shL', 'elR', 'elL', 'haR', 'haL', 'thR', 'thL', 'knR', 'knL', 'ftR', 'ftL'];
    const cur = {};
    JOINTS.forEach((j) => (cur[j] = new T.Quaternion()));
    const tq = new T.Quaternion(), te = new T.Euler();
    let rootY = 0, rootRX = 0, shUp = 0, first = true, opacityNow = 1;
    const shBase = { R: J.shR.position.y, L: J.shL.position.y };
    const st = { browY: 0, browT: 0, asymL: 0, asymR: 0, eye: 1, low: 0.05, lx: 0, ly: 0, sacT: 0, sx: 0, sy: 0, red: 0 };
    const mo = { w: 1, open: 0, curve: 0, round: 0, teeth: 0, asym: 0, wavy: 0, press: 0, lowTeeth: 0 };
    const att = { head: [0, 0, 0], chest: [0, 0, 0] };
    info.att = att;
    const handFor = { phone: 'grip', mug: 'grip', briefcase: 'grip', clicker: 'grip', pen: 'pinch', papers: 'pinch', tablet: 'grip', folder: 'grip' };
    const ctl = {
      root, joints: J, face, props, mats,
      height: info.baseHeight || 1.8,
      headY: info.headY || 1.6,
      kind: 'human',
      update(dt, a) {
        const anim = a.anim || 'idle';
        let fn = POSES[anim] || POSES.idle;
        if (a.talking && (anim === 'idle' || anim === 'stand')) fn = POSES.talk;
        if (a.talking && anim === 'sit') fn = POSES.sittalk;
        const ex = EX[a.expr] || EX.neutro;
        const ka = first ? 1 : 1 - Math.exp(-dt * 6);
        const exH = ex.head || Z, exC = ex.chest || Z;
        const attK = anim === 'sleep' || anim === 'lie' ? 0 : 1;
        for (let i = 0; i < 3; i++) { att.head[i] += (exH[i] * attK - att.head[i]) * ka; att.chest[i] += (exC[i] * attK - att.chest[i]) * ka; }
        const t = a.animT != null ? a.animT : a.t || 0;
        const pose = fn(t, a, info);
        if (a.lookYaw) { pose.neck = add3(pose.neck || Z, [0, a.lookYaw * 0.4, 0]); pose.head = add3(pose.head || Z, [0, a.lookYaw * 0.6, 0]); }
        const k = first ? 1 : 1 - Math.exp(-dt * (anim === 'walk' ? 14 : 9));
        JOINTS.forEach((j) => {
          const r = pose[j] || Z;
          te.set(r[0], r[1], r[2]); tq.setFromEuler(te);
          cur[j].slerp(tq, k);
          J[j].quaternion.copy(cur[j]);
        });
        rootY += ((pose.rootY || 0) - rootY) * k;
        rootRX += ((pose.rootRX || 0) - rootRX) * k;
        shUp += ((pose.shUp || 0) - shUp) * k;
        J.pivot.position.y = rootY;
        J.pivot.rotation.x = rootRX;
        J.shR.position.y = shBase.R + shUp; J.shL.position.y = shBase.L + shUp;
        // acessórios
        const pr = a.props || {};
        const auto = pose.props || {};
        Object.keys(props).forEach((p) => (props[p].visible = !!pr[p] || (!!auto[p] && pr[p] !== false)));
        if (anim === 'coffee' || anim === 'sitcoffee') props.mug.visible = pr.mug !== false;
        if (props.phone.visible && props.phone.userData.screen) props.phone.userData.screen.material.color.set(pr.phoneColor || '#9adfff');
        // mãos
        if (info.hands) {
          ['R', 'L'].forEach((s) => {
            let shape = pose.hands && pose.hands[s];
            if (!shape) { Object.keys(props).forEach((p) => { if (props[p].visible && props[p].userData.hand === s) shape = handFor[p] || 'grip'; }); }
            shape = shape || 'relax';
            const h = info.hands[s];
            if (h.shape !== shape) { h.shape = shape; h.mesh.geometry = handGeo(s, shape, info.handSize, info.handCol, info.ghost); }
          });
        }
        // rosto
        if (info.faceDyn) updateFace(dt, a, ex, anim, first);
        else if (face.ghostEyes) {
          const sq = anim === 'laugh' ? 0.45 + 0.2 * abs(sin(a.t * 14)) : 1;
          face.ghostEyes.scale.set(1, sq * (0.85 + 0.15 * sin(a.t * 2.3)), 1);
        }
        first = false;
        // opacidade
        const op = a.alpha == null ? 1 : a.alpha;
        if (op !== opacityNow) {
          opacityNow = op;
          mats.forEach((m) => {
            if (m.userData.baseOpacity == null) { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; m.userData.baseDepthWrite = m.depthWrite; }
            m.transparent = op < 1 || m.userData.baseTransparent;
            m.opacity = m.userData.baseOpacity * op;
            m.depthWrite = op >= 1 ? m.userData.baseDepthWrite : false;
          });
        }
      },
      dispose() {
        root.traverse((o) => {
          if (o.material && o.material.dispose && mats.indexOf(o.material) >= 0) o.material.dispose();
          if (o.geometry && o.name === 'faceDyn') o.geometry.dispose();
        });
      },
    };
    const lerpTo = (cur0, tgt, k) => cur0 + (tgt - cur0) * k;
    const eUp = (v) => (v <= 1 ? lerp(-0.56, 0.31, v) : 0.31 + (v - 1) * 1.2);
    function updateFace(dt, a, ex, anim, snap) {
      const kk = snap ? 1 : 1 - Math.exp(-dt * 12);
      const km = snap ? 1 : 1 - Math.exp(-dt * 20);
      const sleeping = anim === 'sleep' || anim === 'lie';
      // pálpebras
      st.eye = lerpTo(st.eye, sleeping ? 0 : ex.eye, kk);
      st.low = lerpTo(st.low, ex.low || 0.05, kk);
      const v = a.blink && !sleeping ? 0 : st.eye;
      const lowE = -0.5 + st.low * 0.46;
      const archUp = 0.03 + 0.17 * clamp(v, 0, 1), archLow = 0.1;
      st.browY = lerpTo(st.browY, ex.brow[0], kk);
      st.browT = lerpTo(st.browT, ex.brow[1], kk);
      const slope = st.browT * 0.5;
      let upR = eUp(v), upL = eUp(v);
      if (ex.squint) { upR = eUp(v * 0.62); upL = eUp(Math.min(1.05, v * 1.25)); }
      const lids = [upR, lowE, upL, lowE, archUp, archLow, slope, slope];
      // sobrancelhas
      const talkBob = a.talking ? 0.0025 * Math.max(0, sin(a.t * 3.3) + sin(a.t * 1.7) * 0.5) : 0;
      const mkB = (side) => {
        let y = st.browY + talkBob, tl = st.browT;
        if (ex.browAsym === true) { if (side > 0) { y = 0.02; tl = -0.08; } else { y = -0.007; tl = -0.32; } }
        else if (ex.browAsym === 'think') { if (side > 0) { y += 0.008; } }
        else if (ex.browAsym === 'confuso') { if (side > 0) { y = 0.016; tl = 0.25; } else { y = -0.004; tl = -0.2; } }
        return { inner: y * 1.2 + tl * 0.036, outer: y * 1.15 - tl * 0.014 - (info.fem ? 0.002 : 0.003), arch: info.fem ? 0.0065 : 0.0045, furrow: Math.max(0, -tl) * 0.013 };
      };
      const bR = mkB(-1), bL = mkB(1);
      st.asymR = lerpTo(st.asymR, bR.inner, kk); st.asymL = lerpTo(st.asymL, bL.inner, kk);
      const brows = [bR, bL];
      // boca
      const base0 = MOUTHS[ex.mouth] || MOUTHS.line;
      const tg = { w: (base0.w || 1) * (ex.mw || 1), open: base0.open || 0, curve: base0.curve || 0, round: base0.round || 0, teeth: base0.teeth || 0, asym: base0.asym || 0, wavy: base0.wavy || 0, press: base0.press || 0, lowTeeth: base0.lowTeeth || 0 };
      if (a.talking) {
        const s = sin(a.t * 13.1) * 0.5 + sin(a.t * 8.3 + 1.3) * 0.35 + sin(a.t * 21.7) * 0.15;
        const op = clamp(s * 0.95 + 0.38, 0, 1);
        tg.open = Math.max(tg.open * 0.5, 0.12 + 0.68 * op);
        tg.round = Math.max(tg.round * 0.6, 0.55 * Math.max(0, sin(a.t * 5.3)) * (1 - op * 0.5));
        tg.teeth = Math.max(tg.teeth, 0.55);
        tg.w *= 1 - tg.round * 0.25;
        tg.curve *= 0.7; tg.press = 0; tg.wavy *= 0.3;
      } else if (anim === 'stretch') { tg.open = 1; tg.round = 0.7; tg.teeth = 0.3; tg.w = 0.8; }
      else if (anim === 'laugh') { tg.open = 0.7 + 0.25 * abs(sin(a.t * 14)); tg.curve = 0.85; tg.teeth = 1; tg.w = 1.2; }
      else if (anim === 'scared' && !ex.mouth) { tg.open = 0.6; }
      Object.keys(mo).forEach((k2) => (mo[k2] = lerpTo(mo[k2], tg[k2], km)));
      info.faceDyn.update({ lids, brows, mouth: mo, bags: !!ex.bags });
      // olhar (+ microssacadas)
      st.sacT -= dt;
      if (st.sacT <= 0) { const h = hash(Math.floor(a.t * 3.7) + (info.fem ? 7 : 3)); st.sacT = 0.6 + h * 1.6; st.sx = (hash(h * 91) - 0.5) * 0.35; st.sy = (hash(h * 37) - 0.5) * 0.2; }
      const look = ex.look || a.look || [0, 0];
      const lx = clamp(look[0], -1, 1) + st.sx, ly = clamp(look[1], -1, 1) + st.sy;
      st.lx = lerpTo(st.lx, lx, snap ? 1 : 1 - Math.exp(-dt * 25)); st.ly = lerpTo(st.ly, ly, snap ? 1 : 1 - Math.exp(-dt * 25));
      info.eyeGroups.forEach((e) => e.ball.rotation.set(-st.ly * 0.32, st.lx * 0.38, 0));
      // extras
      const X = face.extras;
      X.sweat.visible = !!ex.sweat;
      if (ex.sweat) X.sweat.position.y = X.sweatBase.y - ((a.t * 0.04) % 0.035);
      X.tear.visible = !!ex.tear;
      if (ex.tear) X.tear.position.y = X.tearBase.y - ((a.t * 0.05) % 0.06);
      X.blush.forEach((m) => (m.visible = !!ex.blush));
      st.red = lerpTo(st.red, ex.red ? 1 : 0, kk);
      X.red.visible = st.red > 0.02;
      if (X.red.visible) X.red.material.opacity = st.red * (a.alpha == null ? 1 : a.alpha);
    }
    return ctl;
  }
  R.makeController = makeController;
})();

/* PAI 2.0 — rig.js
 * Personagens humanos 3D feitos em código: esqueleto articulado, roupas,
 * cabelos, rosto expressivo (sobrancelhas, olhos que piscam, boca que fala),
 * acessórios (óculos, bigode, celular, caneca) e uma biblioteca de poses
 * procedurais (parado, andar, sentar, digitar, telefone, pensar...).
 *
 * Convenções: personagem olha para +Z; Y para cima; o lado DIREITO do
 * personagem fica em -X. Unidades em metros. Pés na origem.
 * Rotações: braço/perna para FRENTE = rotation.x negativo; joelho dobrando
 * = x positivo; cabeça olhando para baixo = x positivo.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  const R = (P2.rig = {});

  const SKINS = {
    claro: { base: '#f2c9a6', dark: '#d9a582', lip: '#b8695a' },
    medio: { base: '#d39a6e', dark: '#b07b52', lip: '#8f4c3c' },
    escuro: { base: '#8a5a3c', dark: '#6b4229', lip: '#5a2f24' },
  };
  R.SKINS = SKINS;

  // ------------------------------------------------------------------
  // Expressões faciais
  //   brow: [altura, inclinação] (inclinação + = parte de dentro sobe → preocupado)
  //   eye: abertura 0..1.2 · mouth: forma · blush/sweat/tear: extras
  // ------------------------------------------------------------------
  const EX = {
    neutro: { brow: [0, 0], eye: 1, mouth: 'line', mw: 1 },
    feliz: { brow: [0.006, 0.05], eye: 0.9, mouth: 'smile', mw: 1.1 },
    rindo: { brow: [0.01, 0.08], eye: 0.35, mouth: 'grin', mw: 1.2 },
    orgulhoso: { brow: [0.004, -0.05], eye: 0.75, mouth: 'smile', mw: 0.95 },
    cansado: { brow: [-0.004, 0.12], eye: 0.5, mouth: 'line', mw: 0.8, bags: true },
    preocupado: { brow: [0.008, 0.32], eye: 1, mouth: 'frown', mw: 0.8, sweat: true },
    bravo: { brow: [-0.012, -0.38], eye: 0.8, mouth: 'frown', mw: 1, red: true },
    surpreso: { brow: [0.02, 0.1], eye: 1.25, mouth: 'o', mw: 1 },
    assustado: { brow: [0.02, 0.3], eye: 1.3, mouth: 'open', mw: 0.9, sweat: true },
    triste: { brow: [0.004, 0.36], eye: 0.75, mouth: 'frown', mw: 0.9, tear: true },
    pensativo: { brow: [0.006, -0.12], eye: 0.8, mouth: 'line', mw: 0.7, look: [0.3, 0.6] },
    desconfiado: { brow: [0, 0], browAsym: true, eye: 0.62, mouth: 'line', mw: 0.85, squint: true },
    sem_graca: { brow: [0.004, 0.22], eye: 0.85, mouth: 'smile', mw: 0.7, blush: true, look: [-0.5, -0.2] },
    empolgado: { brow: [0.018, 0.08], eye: 1.15, mouth: 'grin', mw: 1.25 },
    impaciente: { brow: [-0.006, -0.2], eye: 0.7, mouth: 'line', mw: 1 },
    amigavel: { brow: [0.006, 0.08], eye: 0.95, mouth: 'smile', mw: 1 },
    determinado: { brow: [-0.006, -0.2], eye: 0.9, mouth: 'line', mw: 0.9 },
  };
  R.EXPRS = EX;

  // ------------------------------------------------------------------
  // Construção do esqueleto + corpo
  // ------------------------------------------------------------------
  /**
   * spec: {
   *   skin: 'claro'|'medio'|'escuro' | {base, dark, lip},
   *   height: 1 (escala), belly: 0..1, shoulders: 1, female: false,
   *   hair: {style, color}, mustache: color|null, beard: color|null, glasses: true|{color},
   *   top: {kind:'blazer'|'shirt'|'hoodie'|'tshirt'|'coat'|'polo', color, shirt, tie, pattern, sleeves:'long'|'short'},
   *   pants: color, shoes: color, eyes: color, ghost: false (golpista)
   * }
   */
  R.human = function (spec) {
    spec = Object.assign({ height: 1, belly: 0, shoulders: 1, hair: { style: 'curto', color: '#3a2a22' }, top: { kind: 'shirt', color: '#4a7bd1' }, pants: '#33384a', shoes: '#2a1d18', eyes: '#2a2018' }, spec || {});
    const skin = typeof spec.skin === 'object' ? spec.skin : SKINS[spec.skin || 'medio'];
    const ghost = !!spec.ghost;
    const mats = {
      skin: ghost ? M.mat('#120a1e', { rough: 1, unique: true }) : M.mat(skin.base, { rough: 0.62, unique: true }),
      skinDark: ghost ? M.mat('#0b0614', { unique: true }) : M.mat(skin.dark, { rough: 0.7, unique: true }),
      lip: M.mat(skin.lip, { rough: 0.6, unique: true }),
      hair: M.mat(spec.hair.color || '#3a2a22', { rough: 0.85, unique: true }),
      top: M.mat(spec.top.color || '#4a7bd1', { rough: 0.8, unique: true }),
      top2: M.mat(spec.top.shirt || '#eef3f8', { rough: 0.75, unique: true }),
      topDark: M.mat(M.mix(spec.top.color || '#4a7bd1', '#000', 0.25), { rough: 0.8, unique: true }),
      pants: M.mat(spec.pants, { rough: 0.85, unique: true }),
      shoes: M.mat(spec.shoes, { rough: 0.45, unique: true }),
      white: M.mat('#ffffff', { rough: 0.3, unique: true }),
      pupil: M.mat(spec.eyes || '#2a2018', { rough: 0.2, unique: true }),
      dark: M.mat('#3a1c1c', { rough: 0.6, unique: true }),
      brow: M.mat(spec.browColor || M.mix(spec.hair.color || '#3a2a22', '#000', 0.25), { rough: 0.9, unique: true }),
      blush: M.mat('#ff7a8a', { rough: 0.8, opacity: 0.55, transparent: true, unique: true }),
      sweat: M.mat('#8fd0ff', { rough: 0.1, opacity: 0.85, transparent: true, unique: true }),
      glass: M.mat(spec.glasses && spec.glasses.color ? spec.glasses.color : '#2a2a32', { rough: 0.35, metal: 0.4, unique: true }),
      lens: M.mat('#d8ecff', { rough: 0.05, opacity: 0.18, transparent: true, unique: true }),
      tie: M.mat((spec.top && spec.top.tie) || '#8a2a3a', { rough: 0.6, unique: true }),
      prop: M.mat('#22252e', { rough: 0.4, unique: true }),
    };
    if (ghost) {
      ['top', 'top2', 'topDark', 'pants', 'shoes', 'hair', 'brow'].forEach((k) => { mats[k] = M.mat('#140b22', { rough: 1, unique: true }); });
    }
    const allMats = Object.values(mats);

    const H = spec.height;
    const fem = !!spec.female;
    const sw = (fem ? 0.88 : 1) * spec.shoulders;
    const dims = {
      hipY: 0.83 * H,
      thigh: 0.395 * H,
      shin: 0.385 * H,
      spine: 0.23 * H,
      chest: 0.27 * H,
      neck: 0.045 * H,
      headR: 0.172,
      upArm: 0.29 * H,
      foreArm: 0.26 * H,
      shX: 0.205 * sw,
      hipX: 0.092,
    };
    const J = {};
    const root = new T.Group();
    root.name = 'root';
    const pivot = M.group({ parent: root, name: 'pivot' }); // inclinação do corpo (deitar)
    J.root = root;
    J.pivot = pivot;
    J.hips = M.group({ parent: pivot, pos: [0, dims.hipY, 0], name: 'hips' });
    J.spine = M.group({ parent: J.hips, pos: [0, 0.06, 0], name: 'spine' });
    J.chest = M.group({ parent: J.spine, pos: [0, dims.spine, 0], name: 'chest' });
    J.neck = M.group({ parent: J.chest, pos: [0, dims.chest, 0], name: 'neck' });
    J.head = M.group({ parent: J.neck, pos: [0, dims.neck, 0], name: 'head' });
    J.shR = M.group({ parent: J.chest, pos: [-dims.shX, dims.chest - 0.05, 0], name: 'shR' });
    J.shL = M.group({ parent: J.chest, pos: [dims.shX, dims.chest - 0.05, 0], name: 'shL' });
    J.elR = M.group({ parent: J.shR, pos: [0, -dims.upArm, 0], name: 'elR' });
    J.elL = M.group({ parent: J.shL, pos: [0, -dims.upArm, 0], name: 'elL' });
    J.haR = M.group({ parent: J.elR, pos: [0, -dims.foreArm, 0], name: 'haR' });
    J.haL = M.group({ parent: J.elL, pos: [0, -dims.foreArm, 0], name: 'haL' });
    J.thR = M.group({ parent: J.hips, pos: [-dims.hipX, 0, 0], name: 'thR' });
    J.thL = M.group({ parent: J.hips, pos: [dims.hipX, 0, 0], name: 'thL' });
    J.knR = M.group({ parent: J.thR, pos: [0, -dims.thigh, 0], name: 'knR' });
    J.knL = M.group({ parent: J.thL, pos: [0, -dims.thigh, 0], name: 'knL' });
    J.ftR = M.group({ parent: J.knR, pos: [0, -dims.shin, 0], name: 'ftR' });
    J.ftL = M.group({ parent: J.knL, pos: [0, -dims.shin, 0], name: 'ftL' });

    const top = spec.top;
    const shortSleeve = top.sleeves === 'short' || top.kind === 'tshirt' || top.kind === 'polo';
    const belly = spec.belly || 0;

    // --- Quadril e pernas
    M.rbox(0.33 * sw + 0.04, 0.17, 0.22, 0.07, mats.pants, { parent: J.hips, pos: [0, 0.02, 0] });
    if (top.kind !== 'coat') M.rbox(0.335 * sw + 0.04, 0.035, 0.225, 0.015, M.mat('#2a2220', { rough: 0.5 }), { parent: J.hips, pos: [0, 0.1, 0] }); // cinto
    [['R', -1], ['L', 1]].forEach(([s]) => {
      M.capsule(0.074, dims.thigh - 0.1, mats.pants, { parent: J['th' + s], pos: [0, -dims.thigh / 2, 0] });
      M.capsule(0.062, dims.shin - 0.09, mats.pants, { parent: J['kn' + s], pos: [0, -dims.shin / 2, 0] });
      M.rbox(0.105, 0.075, 0.25, 0.035, mats.shoes, { parent: J['ft' + s], pos: [0, -0.02, 0.05] });
    });

    // --- Tronco
    const torsoW = 0.37 * sw + 0.03, torsoD = 0.22 + belly * 0.04;
    const coatLen = top.kind === 'coat' ? 0.3 : 0;
    M.rbox(torsoW, dims.spine + dims.chest + 0.02 + coatLen, torsoD, 0.085, mats.top, { parent: J.spine, pos: [0, (dims.spine + dims.chest) / 2 - coatLen / 2, 0] });
    if (belly > 0) M.sphere(0.165, mats.top, { parent: J.spine, pos: [0, 0.15, 0.02 + belly * 0.035], scale: [1.12, 1, 0.5 + belly * 0.3] });
    if (fem) M.sphere(0.08, mats.top, { parent: J.chest, pos: [0, 0.12, 0.07], scale: [1.6, 0.8, 0.6] });
    // frente da roupa
    if (top.kind === 'blazer' || top.kind === 'coat') {
      // camisa em V + lapelas
      const v = M.group({ parent: J.chest, pos: [0, dims.chest - 0.07, torsoD / 2 - 0.01] });
      const shirt = M.box(0.11, 0.26, 0.02, mats.top2, { parent: v, pos: [0, -0.1, 0.005] });
      shirt.castShadow = false;
      M.box(0.06, 0.27, 0.025, mats.topDark, { parent: v, pos: [-0.075, -0.1, 0.01], rot: [0, 0, -0.32] });
      M.box(0.06, 0.27, 0.025, mats.topDark, { parent: v, pos: [0.075, -0.1, 0.01], rot: [0, 0, 0.32] });
      // gola da camisa
      M.box(0.05, 0.035, 0.03, mats.top2, { parent: v, pos: [-0.035, 0.03, 0.0], rot: [0, 0, 0.5] });
      M.box(0.05, 0.035, 0.03, mats.top2, { parent: v, pos: [0.035, 0.03, 0.0], rot: [0, 0, -0.5] });
      if (top.tie) M.box(0.035, 0.2, 0.02, mats.tie, { parent: v, pos: [0, -0.1, 0.016] });
      // botões
      M.sphere(0.012, mats.topDark, { parent: J.spine, pos: [0, dims.spine * 0.55, torsoD / 2 + 0.005] });
    } else if (top.kind === 'hoodie') {
      M.torus(0.1, 0.035, mats.topDark, { parent: J.chest, pos: [0, dims.chest - 0.01, -0.03], rot: [Math.PI / 2 - 0.2, 0, 0] }); // capuz
      M.rbox(0.2, 0.08, 0.03, 0.02, mats.topDark, { parent: J.spine, pos: [0, 0.12, torsoD / 2] }); // bolso
      M.cyl(0.006, 0.006, 0.12, M.mat('#f4f1e8'), { parent: J.chest, pos: [-0.035, dims.chest - 0.12, torsoD / 2 + 0.005] });
      M.cyl(0.006, 0.006, 0.12, M.mat('#f4f1e8'), { parent: J.chest, pos: [0.035, dims.chest - 0.12, torsoD / 2 + 0.005] });
    } else {
      // gola de camisa/polo
      M.box(0.06, 0.04, 0.03, mats.topDark, { parent: J.chest, pos: [-0.04, dims.chest - 0.01, torsoD / 2 - 0.03], rot: [0.3, 0, 0.4] });
      M.box(0.06, 0.04, 0.03, mats.topDark, { parent: J.chest, pos: [0.04, dims.chest - 0.01, torsoD / 2 - 0.03], rot: [0.3, 0, -0.4] });
      if (top.pattern) {
        // estampa (camisa florida do Jorge): bolinhas coloridas
        const rr = M.rng(9);
        for (let i = 0; i < 14; i++) {
          const x = (rr() - 0.5) * torsoW * 0.9, y = 0.02 + rr() * (dims.spine + dims.chest - 0.1);
          M.sphere(0.022, M.mat(top.pattern[i % top.pattern.length], { rough: 0.8 }), { parent: J.spine, pos: [x, y, torsoD / 2 - 0.004 + belly * 0.04 * (y < 0.25 ? 1 : 0)], scale: [1, 1, 0.3], cast: false });
        }
      }
    }
    // --- Braços
    [['R', -1], ['L', 1]].forEach(([s, sx]) => {
      M.sphere(0.06, mats.top, { parent: J['sh' + s], pos: [0, -0.02, 0] });
      M.capsule(0.06, dims.upArm - 0.08, shortSleeve ? mats.top : mats.top, { parent: J['sh' + s], pos: [0, -dims.upArm / 2, 0] });
      M.capsule(0.052, dims.foreArm - 0.08, shortSleeve ? mats.skin : mats.top, { parent: J['el' + s], pos: [0, -dims.foreArm / 2, 0] });
      if (!shortSleeve && (top.kind === 'blazer' || top.kind === 'coat')) M.cyl(0.054, 0.054, 0.035, mats.top2, { parent: J['el' + s], pos: [0, -dims.foreArm + 0.04, 0] });
      // mão (palma + polegar)
      const hand = M.group({ parent: J['ha' + s] });
      M.sphere(0.052, mats.skin, { parent: hand, pos: [0, -0.035, 0], scale: [0.9, 1.15, 0.7] });
      M.sphere(0.02, mats.skin, { parent: hand, pos: [-sx * 0.035, -0.025, 0.025], scale: [1, 1.5, 1] });
    });

    // --- Pescoço e cabeça
    M.cyl(0.052, 0.058, dims.neck + 0.04, mats.skin, { parent: J.neck, pos: [0, dims.neck / 2, 0] });
    const head = J.head;
    const hr = dims.headR;
    const skull = M.group({ parent: head, pos: [0, hr * 0.95, 0], name: 'skull' });
    J.skull = skull;
    M.sphere(hr, mats.skin, { parent: skull, scale: [1, 1.07, 1] });
    M.sphere(hr * 0.72, mats.skin, { parent: skull, pos: [0, -hr * 0.42, hr * 0.12], scale: [1.05, 0.8, 1] }); // queixo/bochechas
    // orelhas
    M.sphere(0.034, mats.skin, { parent: skull, pos: [-hr * 0.98, -0.005, -0.01], scale: [0.6, 1, 0.9] });
    M.sphere(0.034, mats.skin, { parent: skull, pos: [hr * 0.98, -0.005, -0.01], scale: [0.6, 1, 0.9] });
    // nariz
    M.sphere(0.028, mats.skinDark, { parent: skull, pos: [0, -0.02, hr * 0.98], scale: [0.9, 1.1, 1.1] });

    // Olhos
    const face = { eyes: [], brows: [], mouth: {}, extras: {} };
    [['R', -1], ['L', 1]].forEach(([s, sx]) => {
      const eg = M.group({ parent: skull, pos: [sx * 0.056, 0.022, hr * 0.86] });
      const white = M.sphere(0.034, mats.white, { parent: eg, scale: [1, 1.18, 0.55], cast: false });
      const pupil = M.sphere(0.02, mats.pupil, { parent: eg, pos: [0, -0.002, 0.013], scale: [1, 1.15, 0.5], cast: false });
      const shine = M.sphere(0.005, M.basic('#ffffff'), { parent: pupil, pos: [0.006, 0.007, 0.012], cast: false });
      void white; void shine;
      face.eyes.push({ g: eg, pupil, base: pupil.position.clone() });
      const bw = M.group({ parent: skull, pos: [sx * 0.058, 0.077, hr * 0.9] });
      M.capsule(0.011, 0.04, mats.brow, { parent: bw, rot: [0, 0, Math.PI / 2], cast: false });
      face.brows.push({ g: bw, side: sx, baseY: 0.077 });
      // olheiras (cansado)
      const bag = M.sphere(0.022, mats.skinDark, { parent: skull, pos: [sx * 0.056, -0.012, hr * 0.84], scale: [1.2, 0.4, 0.4], cast: false });
      bag.visible = false;
      (face.extras.bags = face.extras.bags || []).push(bag);
      const bl = M.sphere(0.028, mats.blush, { parent: skull, pos: [sx * 0.085, -0.04, hr * 0.8], scale: [1.2, 0.6, 0.3], cast: false });
      bl.visible = false;
      (face.extras.blush = face.extras.blush || []).push(bl);
    });
    // Boca (várias formas; uma visível por vez)
    const mouthG = M.group({ parent: skull, pos: [0, -0.072, hr * 0.92], name: 'mouth' });
    face.mouth.g = mouthG;
    face.mouth.line = M.capsule(0.007, 0.035, mats.lip, { parent: mouthG, rot: [0, 0, Math.PI / 2], cast: false });
    face.mouth.smile = M.torus(0.026, 0.0075, mats.lip, { parent: mouthG, pos: [0, 0.012, 0], rot: [0, 0, Math.PI], arc: Math.PI, cast: false });
    face.mouth.frown = M.torus(0.022, 0.0075, mats.lip, { parent: mouthG, pos: [0, -0.016, 0], arc: Math.PI, cast: false });
    face.mouth.open = M.sphere(0.024, mats.dark, { parent: mouthG, scale: [1.15, 0.75, 0.45], cast: false });
    face.mouth.o = M.torus(0.013, 0.006, mats.lip, { parent: mouthG, cast: false });
    face.mouth.grin = M.group({ parent: mouthG });
    M.sphere(0.03, mats.dark, { parent: face.mouth.grin, scale: [1.2, 0.55, 0.4], pos: [0, -0.004, 0], cast: false });
    M.box(0.045, 0.008, 0.01, M.mat('#ffffff'), { parent: face.mouth.grin, pos: [0, 0.006, 0.008], cast: false });
    ['line', 'smile', 'frown', 'open', 'o', 'grin'].forEach((k) => (face.mouth[k].visible = false));
    // gota de suor e lágrima
    const sweat = M.group({ parent: skull, pos: [hr * 0.78, 0.07, hr * 0.45] });
    M.sphere(0.018, mats.sweat, { parent: sweat, scale: [1, 1.3, 1], cast: false });
    M.cone(0.012, 0.02, mats.sweat, { parent: sweat, pos: [0, 0.025, 0], cast: false });
    sweat.visible = false;
    face.extras.sweat = sweat;
    const tear = M.sphere(0.012, mats.sweat, { parent: skull, pos: [-0.06, -0.01, hr * 0.9], scale: [1, 1.4, 0.6], cast: false });
    tear.visible = false;
    face.extras.tear = tear;

    // Cabelo
    buildHair(skull, hr, spec.hair.style, mats.hair, fem);
    // Bigode
    if (spec.mustache) {
      const mm = M.mat(spec.mustache, { rough: 0.9, unique: true });
      allMats.push(mm);
      const mg = M.group({ parent: skull, pos: [0, -0.05, hr * 0.97], name: 'mustache' });
      M.capsule(0.017, 0.035, mm, { parent: mg, pos: [-0.025, 0, 0], rot: [0, 0, Math.PI / 2 + 0.25], cast: false });
      M.capsule(0.017, 0.035, mm, { parent: mg, pos: [0.025, 0, 0], rot: [0, 0, Math.PI / 2 - 0.25], cast: false });
      M.sphere(0.018, mm, { parent: mg, pos: [0, 0.006, 0.003], cast: false });
      face.mustache = mg;
    }
    if (spec.beard) {
      const bm = M.mat(spec.beard, { rough: 0.95, unique: true });
      allMats.push(bm);
      M.sphere(hr * 0.75, bm, { parent: skull, pos: [0, -hr * 0.5, hr * 0.12], scale: [1.08, 0.75, 1.02] });
    }
    // Óculos
    if (spec.glasses) {
      const gg = M.group({ parent: skull, pos: [0, 0.025, hr * 0.98], name: 'glasses' });
      [-1, 1].forEach((sx) => {
        M.torus(0.036, 0.0055, mats.glass, { parent: gg, pos: [sx * 0.057, 0, 0], cast: false }).scale.set(1, 0.85, 1);
        const lens = new T.Mesh(new T.CircleGeometry(0.034, 20), mats.lens);
        lens.position.set(sx * 0.057, 0, -0.002);
        lens.scale.set(1, 0.85, 1);
        gg.add(lens);
        M.box(0.006, 0.006, 0.13, mats.glass, { parent: gg, pos: [sx * 0.095, 0.005, -0.065], cast: false });
      });
      M.box(0.03, 0.006, 0.006, mats.glass, { parent: gg, pos: [0, 0.006, 0], cast: false });
    }
    if (ghost) {
      // capuz e olhos vermelhos brilhantes
      const hood = M.sphere(hr * 1.25, mats.top, { parent: skull, pos: [0, 0.02, -0.02], scale: [1, 1.1, 1.05] });
      hood.material = M.mat('#0e0818', { rough: 1, unique: true });
      face.eyes.forEach((e) => { e.g.visible = false; });
      face.brows.forEach((b) => (b.g.visible = false));
      mouthG.visible = false;
      const red = M.mat('#ff2a3a', { emissive: '#ff2a3a', emissiveIntensity: 2.2, unique: true });
      [-1, 1].forEach((sx) => {
        const e = M.sphere(0.02, red, { parent: skull, pos: [sx * 0.05, 0.02, hr * 1.12], scale: [1.4, 0.6, 0.5], cast: false });
        const gl = M.glow('#ff3344', 0.16, 0.9);
        e.add(gl);
      });
    }

    // Acessórios (aparecem com actor.props)
    const props = {};
    props.phone = M.rbox(0.07, 0.14, 0.012, 0.01, mats.prop, { parent: J.haR, pos: [0, -0.07, 0.04], rot: [0.1, 0, 0] });
    const scr = M.plane(0.058, 0.118, M.basic('#7fd6ff'), { parent: props.phone, pos: [0, 0, 0.0065], cast: false });
    scr.material = M.basic('#9adfff', { unique: true });
    props.phone.userData.screen = scr;
    props.mug = M.group({ parent: J.haR, pos: [0, -0.07, 0.05] });
    M.cyl(0.04, 0.036, 0.09, M.mat('#f4f1e8', { rough: 0.4 }), { parent: props.mug });
    M.torus(0.022, 0.007, M.mat('#f4f1e8', { rough: 0.4 }), { parent: props.mug, pos: [0.045, 0, 0], rot: [0, 0, 0] });
    M.cyl(0.035, 0.035, 0.005, M.mat('#4a2a18'), { parent: props.mug, pos: [0, 0.043, 0] });
    props.papers = M.group({ parent: J.haL, pos: [0, -0.06, 0.05], rot: [0.3, 0, 0] });
    M.box(0.17, 0.004, 0.23, M.mat('#fbfaf5', { rough: 0.9 }), { parent: props.papers });
    M.box(0.17, 0.004, 0.23, M.mat('#f1efe6', { rough: 0.9 }), { parent: props.papers, pos: [0.006, 0.005, 0.004], rot: [0, 0.05, 0] });
    props.tablet = M.rbox(0.2, 0.012, 0.27, 0.012, mats.prop, { parent: J.haL, pos: [0, -0.07, 0.07], rot: [0.5, 0, 0] });
    props.pen = M.cyl(0.006, 0.006, 0.13, M.mat('#1d2a4a', { metal: 0.5, rough: 0.3 }), { parent: J.haR, pos: [0, -0.07, 0.03], rot: [1.2, 0, 0] });
    Object.values(props).forEach((p) => (p.visible = false));

    // sombras + materiais próprios (para poder fazer o personagem sumir/aparecer)
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (allMats.indexOf(o.material) < 0) { o.material = o.material.clone(); allMats.push(o.material); }
    });

    const baseHeight = dims.hipY + 0.06 + dims.spine + dims.chest + dims.neck + hr * 2.1;
    return makeController(root, J, face, props, allMats, { dims, baseHeight, headY: dims.hipY + 0.06 + dims.spine + dims.chest + dims.neck + hr, ghost });
  };

  function buildHair(skull, hr, style, mat, fem) {
    const r = hr * 1.06;
    const cap = (phiStart, phiLen, thetaStart, thetaLen, o) => {
      const g = new T.SphereGeometry(r, 28, 18, phiStart, phiLen, thetaStart, thetaLen);
      const m = new T.Mesh(g, mat);
      m.castShadow = true;
      if (o && o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
      if (o && o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
      skull.add(m);
      return m;
    };
    const front = Math.PI / 2; // phi apontando para +Z
    switch (style) {
      case 'grisalho': // entradas: costas, lados (acima das orelhas) e topo de trás
        cap(front + 1.15, Math.PI * 2 - 2.3, 0.2, 1.3, { scale: [1, 1.07, 1] });
        cap(front + 1.9, Math.PI * 2 - 3.8, 1.2, 0.65, { scale: [1.0, 1.05, 1.0] });
        M.sphere(hr * 0.55, mat, { parent: skull, pos: [0, hr * 0.82, -hr * 0.22], scale: [1.35, 0.45, 1.2] });
        break;
      case 'baguncado':
        cap(0, Math.PI * 2, 0, 1.25, { scale: [1.02, 1.1, 1.04] });
        cap(front + 0.55, Math.PI * 2 - 1.1, 0.9, 0.9, { scale: [1.01, 1.07, 1.01] });
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          M.sphere(hr * 0.33, mat, { parent: skull, pos: [Math.cos(a) * hr * 0.55, hr * 0.92 + (i % 2) * 0.02, Math.sin(a) * hr * 0.55 + 0.02], scale: [1, 0.7, 1] });
        }
        M.sphere(hr * 0.35, mat, { parent: skull, pos: [hr * 0.25, hr * 0.75, hr * 0.62], scale: [1.4, 0.55, 0.8], rot: [0, 0, 0.3] });
        break;
      case 'longo':
        cap(0, Math.PI * 2, 0, 1.3, { scale: [1.03, 1.1, 1.05] });
        cap(front + 0.5, Math.PI * 2 - 1.0, 0.9, 1.2, { scale: [1.04, 1.07, 1.04] });
        M.rbox(hr * 1.9, hr * 2.4, hr * 0.7, 0.08, mat, { parent: skull, pos: [0, -hr * 0.7, -hr * 0.62] });
        M.capsule(hr * 0.22, hr * 1.4, mat, { parent: skull, pos: [-hr * 0.92, -hr * 0.55, hr * 0.15] });
        M.capsule(hr * 0.22, hr * 1.4, mat, { parent: skull, pos: [hr * 0.92, -hr * 0.55, hr * 0.15] });
        M.sphere(hr * 0.45, mat, { parent: skull, pos: [-hr * 0.35, hr * 0.78, hr * 0.55], scale: [1.4, 0.5, 0.7], rot: [0, 0, 0.4] });
        break;
      case 'coque':
        cap(0, Math.PI * 2, 0, 1.25, { scale: [1.02, 1.08, 1.03] });
        cap(front + 0.6, Math.PI * 2 - 1.2, 0.9, 0.85, { scale: [1.02, 1.06, 1.02] });
        M.sphere(hr * 0.45, mat, { parent: skull, pos: [0, hr * 0.75, -hr * 0.85] });
        break;
      case 'cacheado':
        for (let i = 0; i < 22; i++) {
          const a = (i / 22) * Math.PI * 2, y = (i % 3) * 0.04;
          if (Math.sin(a) > 0.55 && y < 0.05) continue;
          M.sphere(hr * 0.36, mat, { parent: skull, pos: [Math.cos(a) * hr * 0.9, hr * 0.35 + y, Math.sin(a) * hr * 0.85] });
        }
        M.sphere(hr * 1.05, mat, { parent: skull, pos: [0, hr * 0.3, -hr * 0.1], scale: [1, 0.85, 1] });
        break;
      case 'careca': // careca em cima, cabelo dos lados
        cap(front + 1.25, Math.PI * 2 - 2.5, 1.0, 0.65, { scale: [1.02, 1.05, 1.02] });
        break;
      case 'nenhum':
        break;
      default: // curto
        cap(0, Math.PI * 2, 0, 1.1, { scale: [1.01, 1.08, 1.02] });
        cap(front + 0.6, Math.PI * 2 - 1.2, 0.8, 0.95, { scale: [1.01, 1.06, 1.01] });
    }
    void fem;
  }

  // ------------------------------------------------------------------
  // Biblioteca de poses (funções de tempo). Cada pose devolve rotações
  // [x, y, z] por articulação e um deslocamento da raiz {y, rx}.
  // ------------------------------------------------------------------
  const Z = [0, 0, 0];
  function base() {
    return {
      hips: [0, 0, 0], spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0],
      shR: [0.04, 0, -0.1], shL: [0.04, 0, 0.1], elR: [-0.18, 0, 0], elL: [-0.18, 0, 0], haR: Z, haL: Z,
      thR: [0, 0, 0.02], thL: [0, 0, -0.02], knR: Z, knL: Z, ftR: Z, ftL: Z,
      rootY: 0, rootRX: 0,
    };
  }
  const sin = Math.sin, cos = Math.cos, PI = Math.PI;
  function breathe(p, t, k) {
    k = k == null ? 1 : k;
    const b = sin(t * 1.6);
    p.chest = [p.chest[0] - 0.018 * b * k, p.chest[1], p.chest[2]];
    p.shR = [p.shR[0], p.shR[1], p.shR[2] - 0.02 * b * k];
    p.shL = [p.shL[0], p.shL[1], p.shL[2] + 0.02 * b * k];
    p.head = [p.head[0] + 0.012 * sin(t * 0.8) * k, p.head[1] + 0.06 * sin(t * 0.33) * k, p.head[2]];
    return p;
  }
  function seated(p) {
    p.rootY = -0.4;
    p.thR = [-1.5, 0.06, 0.02]; p.thL = [-1.5, -0.06, -0.02];
    p.knR = [1.48, 0, 0]; p.knL = [1.48, 0, 0];
    p.spine = [0.04, 0, 0];
    return p;
  }
  const POSES = {
    idle(t) { return breathe(base(), t); },
    talk(t) {
      const p = breathe(base(), t);
      const g = sin(t * 2.6), g2 = sin(t * 3.7 + 1);
      p.shR = [-0.25 - 0.12 * g, 0, -0.18]; p.elR = [-1.0 - 0.25 * g2, 0, 0.2];
      p.shL = [-0.1 - 0.06 * g2, 0, 0.14]; p.elL = [-0.6 - 0.15 * g, 0, -0.1];
      p.head[1] += 0.06 * g;
      return p;
    },
    walk(t, a) {
      const p = base();
      const ph = (a ? a.walkT : t) * 7.2;
      const s = sin(ph);
      p.thR = [-0.5 * s, 0, 0.02]; p.thL = [0.5 * s, 0, -0.02];
      p.knR = [Math.max(0, sin(ph + 1.4)) * 0.85 + 0.05, 0, 0];
      p.knL = [Math.max(0, sin(ph + 1.4 + PI)) * 0.85 + 0.05, 0, 0];
      p.ftR = [Math.max(0, -sin(ph)) * 0.25, 0, 0];
      p.ftL = [Math.max(0, sin(ph)) * 0.25, 0, 0];
      p.shR = [0.42 * s, 0, -0.09]; p.shL = [-0.42 * s, 0, 0.09];
      p.elR = [-0.35 - 0.2 * Math.max(0, -s), 0, 0]; p.elL = [-0.35 - 0.2 * Math.max(0, s), 0, 0];
      p.chest = [-0.03, -0.1 * s, 0];
      p.hips = [0, 0.08 * s, 0];
      p.rootY = Math.abs(cos(ph)) * 0.04 - 0.02;
      return p;
    },
    sit(t) {
      const p = seated(breathe(base(), t, 0.6));
      p.shR = [-0.35, 0, -0.12]; p.elR = [-0.95, 0, 0.1];
      p.shL = [-0.35, 0, 0.12]; p.elL = [-0.95, 0, -0.1];
      return p;
    },
    sittalk(t) {
      const p = seated(breathe(base(), t, 0.6));
      const g = sin(t * 2.6);
      p.shR = [-0.5 - 0.1 * g, 0, -0.15]; p.elR = [-1.2 - 0.2 * sin(t * 3.3), 0, 0.2];
      p.shL = [-0.35, 0, 0.12]; p.elL = [-0.95, 0, -0.1];
      return p;
    },
    type(t) {
      const p = seated(breathe(base(), t, 0.4));
      const k = sin(t * 18), k2 = sin(t * 15 + 1);
      p.shR = [-0.7, 0.1, -0.12]; p.elR = [-0.95 + 0.04 * k, 0, 0.25];
      p.shL = [-0.7, -0.1, 0.12]; p.elL = [-0.95 + 0.04 * k2, 0, -0.25];
      p.haR = [0.3 + 0.08 * k, 0, 0]; p.haL = [0.3 + 0.08 * k2, 0, 0];
      p.head = [0.18, 0, 0];
      p.chest = [0.06, 0, 0];
      return p;
    },
    phone(t) {
      const p = breathe(base(), t);
      p.shR = [-0.55, 0, -0.55]; p.elR = [-2.25, 0.2, 0]; p.haR = [0.2, 0.4, 0.3];
      p.head = [0.04, -0.15, -0.12];
      p.shL = [0.08, 0, 0.12]; p.elL = [-0.3, 0, 0];
      return p;
    },
    sitphone(t) { const p = POSES.phone(t); return seated(p); },
    lookphone(t) {
      const p = breathe(base(), t, 0.5);
      p.shR = [-0.55, 0.2, -0.15]; p.elR = [-1.3, 0, 0.35];
      p.shL = [-0.45, -0.2, 0.15]; p.elL = [-1.2, 0, -0.3];
      p.head = [0.42, 0, 0];
      return p;
    },
    showphone(t) {
      const p = breathe(base(), t, 0.5);
      p.shR = [-1.35, 0, -0.1]; p.elR = [-0.25, 0, 0]; p.haR = [-0.6, 0, 0];
      p.head = [0.05, 0, 0];
      return p;
    },
    think(t) {
      const p = breathe(base(), t);
      p.shR = [-0.55, 0, -0.32]; p.elR = [-2.15, 0.3, 0]; p.haR = [0.25, 0, 0];
      p.shL = [-0.45, 0, 0.22]; p.elL = [-1.55, -0.4, 0];
      p.head = [0.06, 0.12 + 0.05 * sin(t * 0.7), 0.1];
      return p;
    },
    sitthink(t) { return seated(POSES.think(t)); },
    cheer(t) {
      const p = breathe(base(), t);
      const b = sin(t * 9) * 0.12;
      p.shR = [-0.2, 0, -2.75 + b]; p.elR = [-0.4, 0, 0];
      p.shL = [-0.2, 0, 0.55]; p.elL = [-1.2, 0, 0];
      p.head = [-0.15, 0, 0];
      p.rootY = Math.max(0, sin(t * 9)) * 0.03;
      return p;
    },
    clap(t) {
      const p = breathe(base(), t);
      const c = sin(t * 12) * 0.18;
      p.shR = [-0.95, 0.45 + c, -0.1]; p.elR = [-1.1, 0, 0.35];
      p.shL = [-0.95, -0.45 - c, 0.1]; p.elL = [-1.1, 0, -0.35];
      return p;
    },
    sleep(t) {
      const p = base();
      p.rootRX = -PI / 2;
      p.rootY = 0.62;
      p.shR = [0, 0, -0.08]; p.shL = [0, 0, 0.08]; p.elR = [-0.15, 0, 0]; p.elL = [-0.15, 0, 0];
      p.chest = [-0.03 * sin(t * 1.1), 0, 0];
      p.head = [-0.15, 0.2, 0];
      return p;
    },
    coffee(t) {
      const p = breathe(base(), t);
      const sip = Math.max(0, sin(t * 0.9)) ;
      p.shR = [-0.55 - 0.35 * sip, 0, -0.18]; p.elR = [-1.6 - 0.35 * sip, 0, 0.25];
      p.head = [0.05 - 0.12 * sip, 0, 0];
      return p;
    },
    point(t) {
      const p = breathe(base(), t);
      p.shR = [-1.45, 0.15, -0.05]; p.elR = [-0.1, 0, 0]; p.haR = [-0.2, 0, 0];
      p.head = [0, -0.12, 0];
      return p;
    },
    shrug(t) {
      const p = breathe(base(), t);
      p.shR = [-0.35, 0, -0.55]; p.elR = [-1.3, 0, 0.6]; p.haR = [0, 0, 0.5];
      p.shL = [-0.35, 0, 0.55]; p.elL = [-1.3, 0, -0.6]; p.haL = [0, 0, -0.5];
      p.head = [0, 0, 0.18];
      p.chest = [0, 0, 0];
      return p;
    },
    facepalm(t) {
      const p = breathe(base(), t);
      p.shR = [-0.95, 0, -0.32]; p.elR = [-2.35, 0.4, 0]; p.haR = [0.5, 0, 0];
      p.head = [0.42, 0, 0];
      p.chest = [0.12, 0, 0];
      return p;
    },
    stretch(t) {
      const p = breathe(base(), t);
      p.shR = [-0.25, 0, -2.8]; p.elR = [-0.35, 0, 0];
      p.shL = [-0.25, 0, 2.8]; p.elL = [-0.35, 0, 0];
      p.head = [-0.3, 0, 0];
      p.chest = [-0.12, 0, 0];
      return p;
    },
    wave(t) {
      const p = breathe(base(), t);
      p.shR = [-0.2, 0, -2.5]; p.elR = [0, 0, -0.35 + 0.45 * sin(t * 9)];
      p.head = [0, 0, 0.08];
      return p;
    },
    arms(t) {
      const p = breathe(base(), t);
      p.shR = [-0.6, 0.5, -0.15]; p.elR = [-1.75, 0, 0.6];
      p.shL = [-0.6, -0.5, 0.15]; p.elL = [-1.75, 0, -0.6];
      return p;
    },
    laugh(t) {
      const p = breathe(base(), t);
      const b = sin(t * 14) * 0.06;
      p.chest = [-0.12 + b, 0, 0]; p.head = [-0.25 + b, 0, 0];
      p.shR = [-0.4, 0, -0.35]; p.elR = [-1.6, 0, 0.3];
      p.shL = [-0.4, 0, 0.35]; p.elL = [-1.6, 0, -0.3];
      return p;
    },
    sad(t) {
      const p = breathe(base(), t, 0.5);
      p.head = [0.35, 0, 0]; p.chest = [0.12, 0, 0];
      p.shR = [0.1, 0, -0.05]; p.shL = [0.1, 0, 0.05];
      return p;
    },
    scared(t) {
      const p = breathe(base(), t, 0.5);
      const j = sin(t * 30) * 0.02;
      p.shR = [-0.8, 0, -0.4]; p.elR = [-1.6, 0, 0.3]; p.shL = [-0.8, 0, 0.4]; p.elL = [-1.6, 0, -0.3];
      p.chest = [-0.1 + j, 0, 0]; p.head = [-0.08, 0, 0];
      return p;
    },
    lie(t) { return POSES.sleep(t); },
    stand(t) { return POSES.idle(t); },
  };
  R.POSES = POSES;

  // ------------------------------------------------------------------
  // Controlador: aplica pose (com mistura suave), rosto e acessórios
  // ------------------------------------------------------------------
  function makeController(root, J, face, props, mats, info) {
    const cur = {};
    const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shR', 'shL', 'elR', 'elL', 'haR', 'haL', 'thR', 'thL', 'knR', 'knL', 'ftR', 'ftL'];
    JOINTS.forEach((k) => (cur[k] = [0, 0, 0]));
    cur.rootY = 0; cur.rootRX = 0;
    let exprCur = { browY: 0, browT: 0, eye: 1 };
    let mouthShape = 'line';
    let first = true;
    let opacityNow = 1;
    const ctl = {
      root, joints: J, face, props, mats,
      height: info.baseHeight,
      headY: info.headY,
      kind: 'human',
      /** a: estado do ator (anim, animT, t, talking, blink, expr, walkT, look) */
      update(dt, a) {
        const anim = a.anim === 'walk' ? 'walk' : a.anim;
        let fn = POSES[anim] || POSES.idle;
        if (a.talking && (anim === 'idle' || anim === 'stand')) fn = POSES.talk;
        if (a.talking && anim === 'sit') fn = POSES.sittalk;
        const pose = fn(a.animT || a.t || 0, a);
        const k = first ? 1 : 1 - Math.exp(-dt * (anim === 'walk' ? 16 : 10));
        first = false;
        JOINTS.forEach((j) => {
          const tg = pose[j] || Z, c = cur[j];
          c[0] += (tg[0] - c[0]) * k; c[1] += (tg[1] - c[1]) * k; c[2] += (tg[2] - c[2]) * k;
          J[j].rotation.set(c[0], c[1], c[2]);
        });
        cur.rootY += ((pose.rootY || 0) - cur.rootY) * k;
        cur.rootRX += ((pose.rootRX || 0) - cur.rootRX) * k;
        J.pivot.position.y = cur.rootY;
        J.pivot.rotation.x = cur.rootRX;
        // olhar (cabeça vira levemente para um alvo)
        if (a.lookYaw) J.head.rotation.y += a.lookYaw;
        // Rosto
        const ex = EX[a.expr] || EX.neutro;
        const kk = 1 - Math.exp(-dt * 12);
        exprCur.browY += (ex.brow[0] - exprCur.browY) * kk;
        exprCur.browT += (ex.brow[1] - exprCur.browT) * kk;
        let eyeOpen = ex.eye;
        if (a.blink || anim === 'sleep') eyeOpen = 0.08;
        exprCur.eye += (eyeOpen - exprCur.eye) * (a.blink ? 1 : kk);
        face.brows.forEach((b) => {
          let tilt = exprCur.browT;
          let y = exprCur.browY;
          if (ex.browAsym) { if (b.side > 0) { y = 0.016; tilt = -0.15; } else { y = -0.006; tilt = -0.22; } }
          b.g.position.y = b.baseY + y;
          b.g.rotation.z = -b.side * tilt;
        });
        face.eyes.forEach((e, i) => {
          e.g.scale.y = Math.max(0.06, exprCur.eye);
          const look = ex.look || a.look;
          if (look) { e.pupil.position.x = e.base.x + look[0] * 0.008; e.pupil.position.y = e.base.y + look[1] * 0.006; }
          else { e.pupil.position.x = e.base.x; e.pupil.position.y = e.base.y; }
          if (ex.squint && i === 0) e.g.scale.y *= 0.8;
        });
        face.extras.bags.forEach((m) => (m.visible = !!ex.bags));
        face.extras.blush.forEach((m) => (m.visible = !!ex.blush));
        face.extras.sweat.visible = !!ex.sweat;
        if (ex.sweat) face.extras.sweat.position.y = 0.07 - ((a.t * 0.05) % 0.04);
        face.extras.tear.visible = !!ex.tear;
        if (ex.tear) face.extras.tear.position.y = -0.01 - ((a.t * 0.06) % 0.07);
        // boca
        let shape = ex.mouth;
        if (a.talking) {
          const ph = Math.sin(a.t * 17) + Math.sin(a.t * 11.3) * 0.6;
          shape = ph > 0.2 ? 'open' : ph > -0.5 ? (ex.mouth === 'frown' ? 'frown' : 'o') : ex.mouth;
          if (shape === 'open') face.mouth.open.scale.set(1.1 * (ex.mw || 1), 0.55 + 0.35 * Math.max(0, ph) / 1.6, 0.45);
        } else if (anim === 'stretch') shape = 'open';
        else face.mouth.open.scale.set(1.15, 0.75, 0.45);
        if (shape !== mouthShape) {
          if (face.mouth[mouthShape]) face.mouth[mouthShape].visible = false;
          mouthShape = shape;
        }
        if (face.mouth[shape]) {
          face.mouth[shape].visible = true;
          if (shape !== 'open') face.mouth[shape].scale.x = ex.mw || 1;
        }
        if (face.mustache) face.mustache.position.y = -0.05 + (a.talking && shape === 'open' ? -0.004 : 0);
        // acessórios
        const pr = a.props || {};
        Object.keys(props).forEach((k) => (props[k].visible = !!pr[k]));
        if (anim === 'phone' || anim === 'lookphone' || anim === 'showphone' || anim === 'sitphone') props.phone.visible = pr.phone !== false;
        if (anim === 'coffee') props.mug.visible = pr.mug !== false;
        if (props.phone.visible) props.phone.userData.screen.material.color.set(pr.phoneColor || '#9adfff');
        // opacidade
        const op = a.alpha == null ? 1 : a.alpha;
        if (op !== opacityNow) {
          opacityNow = op;
          mats.forEach((m) => {
            if (m.userData.baseOpacity == null) { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; }
            m.transparent = op < 1 || m.userData.baseTransparent;
            m.opacity = m.userData.baseOpacity * op;
            m.depthWrite = op >= 1;
          });
        }
      },
      dispose() { M.dispose(root); },
    };
    return ctl;
  }
  R.makeController = makeController;
})();

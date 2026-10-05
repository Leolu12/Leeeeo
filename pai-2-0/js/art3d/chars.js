/* PAI 2.0 — chars.js
 * Elenco 3D: Pai (CEO), Filho/Filha, Conselheira (chefe), Jorge,
 * Golpista, figurantes (npc), Faísca (a assistente) e A Dúvida (chefão).
 * Humanos usam P2.rig.human; Faísca e Dúvida têm montagem própria.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  const R = P2.rig;
  const C = (P2.chars = P2.chars || {});

  // ------------------------------------------------------------------
  // Humanos
  // ------------------------------------------------------------------
  C.pai = {
    name: 'Pai',
    build(o) {
      return R.human({
        skin: o.skin || 'medio',
        belly: 0.55,
        hair: { style: 'grisalho', color: '#c8c8d0' },
        browColor: '#8e8a94',
        mustache: '#9a96a0',
        glasses: { color: '#2a2a32' },
        top: { kind: 'blazer', color: o.jacket || '#24324f', shirt: '#d7e6f7', tie: o.tie ? '#7a2434' : null },
        pants: '#3a3f4c',
        shoes: '#2b1d17',
      });
    },
  };
  C.filho = {
    name: 'Filho',
    build(o) {
      const fem = o.genero === 'filha';
      return R.human({
        skin: o.skin || 'medio',
        height: fem ? 0.97 : 1.03,
        female: fem,
        hair: { style: fem ? 'longo' : 'baguncado', color: '#2c1f1a' },
        top: { kind: 'hoodie', color: '#2fae86' },
        pants: '#3b5b8a',
        shoes: '#f1f1f1',
        eyes: '#3a2516',
      });
    },
  };
  C.chefe = {
    name: 'Conselheira',
    build(o) {
      return R.human({
        skin: o.skin || 'claro',
        female: true,
        height: 0.98,
        hair: { style: 'coque', color: '#b9b2ad' },
        glasses: { color: '#6a2a3a' },
        top: { kind: 'blazer', color: '#6a2c3e', shirt: '#f3ece0' },
        pants: '#2e2a34',
        shoes: '#1d1416',
      });
    },
  };
  C.jorge = {
    name: 'Jorge',
    build(o) {
      return R.human({
        skin: o.skin || 'claro',
        belly: 0.9,
        hair: { style: 'careca', color: '#4a382c' },
        top: { kind: 'shirt', color: '#f0a43a', sleeves: 'short', pattern: ['#2f9f78', '#ff6b6b', '#ffe066', '#3a6ad8'] },
        pants: '#5a5246',
        shoes: '#4a3020',
      });
    },
  };
  C.golpista = {
    name: 'Golpista',
    build() {
      const ctl = R.human({ ghost: true, hair: { style: 'nenhum', color: '#000' }, top: { kind: 'hoodie', color: '#140b22' } });
      // fumaça escura em volta
      const wisps = [];
      for (let i = 0; i < 8; i++) {
        const s = M.glow('#2a0f3a', 0.7 + (i % 3) * 0.2, 0.55);
        s.material = s.material.clone();
        s.material.blending = T.NormalBlending;
        s.material.color.set('#1a0a26');
        ctl.root.add(s);
        wisps.push(s);
      }
      const base = ctl.update;
      ctl.update = function (dt, a) {
        base(dt, a);
        const t = a.t;
        wisps.forEach((w, i) => {
          const ang = t * 0.6 + i;
          w.position.set(Math.cos(ang) * 0.25, 0.3 + ((t * 0.3 + i * 0.21) % 1.6), Math.sin(ang) * 0.2);
          w.material.opacity = 0.35 * (a.alpha == null ? 1 : a.alpha);
        });
      };
      return ctl;
    },
  };
  // Figurantes de reunião (variam pela semente)
  const NPC_HAIR = ['curto', 'coque', 'longo', 'cacheado', 'careca', 'baguncado'];
  const NPC_HAIRC = ['#2c1f1a', '#5a3a28', '#1a1a1a', '#8a6a4a', '#c9c3bd'];
  const NPC_TOP = ['#3a5a8a', '#6a4a8a', '#2f8f6a', '#8a3a3a', '#4a4a5a', '#b07a3a'];
  const NPC_SKIN = ['claro', 'medio', 'escuro'];
  C.npc = {
    name: 'Figurante',
    build(o) {
      const r = M.rng((o.seed || 1) * 977);
      const fem = o.female != null ? o.female : r() > 0.5;
      let hair = NPC_HAIR[Math.floor(r() * NPC_HAIR.length)];
      if (!fem && (hair === 'coque' || hair === 'longo')) hair = 'curto';
      return R.human({
        skin: o.skin || NPC_SKIN[Math.floor(r() * 3)],
        female: fem,
        height: 0.95 + r() * 0.08,
        belly: r() > 0.7 ? 0.4 : 0,
        hair: { style: o.hair || hair, color: o.hairColor || NPC_HAIRC[Math.floor(r() * NPC_HAIRC.length)] },
        glasses: r() > 0.65 ? { color: '#2a2a32' } : null,
        top: { kind: r() > 0.45 ? 'blazer' : 'shirt', color: o.color || NPC_TOP[Math.floor(r() * NPC_TOP.length)], shirt: '#eef2f6' },
        pants: '#30343e',
        shoes: '#221a16',
      });
    },
  };

  // ------------------------------------------------------------------
  // FAÍSCA — a assistente: cubinho coral, olhos grandes, orelhinhas,
  // perninhas, flutua ao lado do pai. Boca só aparece quando fala.
  // ------------------------------------------------------------------
  C.faisca = {
    name: 'Faísca',
    build() {
      const root = new T.Group();
      const body = M.group({ parent: root, name: 'faiscaBody' });
      const bodyMat = M.mat('#ff7a45', { rough: 0.38, emissive: '#ff4a10', emissiveIntensity: 0.12, unique: true });
      const shadeMat = M.mat('#e85a2a', { rough: 0.45, unique: true });
      const white = M.mat('#ffffff', { rough: 0.15, emissive: '#ffffff', emissiveIntensity: 0.25, unique: true });
      const pupilM = M.mat('#1d1830', { rough: 0.15, unique: true });
      const pinkM = M.mat('#ff7a9a', { rough: 0.6, opacity: 0.6, transparent: true, unique: true });
      const dark = M.mat('#3a1210', { rough: 0.5, unique: true });
      const spark = M.mat('#ffe58a', { emissive: '#ffd24a', emissiveIntensity: 2, rough: 0.3, unique: true });
      const mats = [bodyMat, shadeMat, white, pupilM, pinkM, dark, spark];
      const S = 0.3; // tamanho do corpo
      const core = M.rbox(S, S * 0.9, S * 0.8, 0.075, bodyMat, { parent: body });
      void core;
      M.rbox(S * 0.82, S * 0.12, S * 0.7, 0.03, shadeMat, { parent: body, pos: [0, -S * 0.42, 0] });
      // orelhinhas
      const ears = [];
      [-1, 1].forEach((sx) => {
        const eg = M.group({ parent: body, pos: [sx * S * 0.3, S * 0.43, 0] });
        M.capsule(0.03, 0.06, bodyMat, { parent: eg, pos: [0, 0.05, 0], rot: [0, 0, -sx * 0.25] });
        M.sphere(0.018, M.mat('#ffb08a', { rough: 0.5 }), { parent: eg, pos: [sx * -0.004, 0.07, 0.02] });
        ears.push({ g: eg, sx });
      });
      // faísca no topo
      const sparkG = M.group({ parent: body, pos: [0, S * 0.58, 0] });
      M.sphere(0.022, spark, { parent: sparkG, cast: false });
      const glow = M.glow('#ffd27a', 0.22, 0.85);
      sparkG.add(glow);
      // olhos
      const eyes = [];
      [-1, 1].forEach((sx) => {
        const g = M.group({ parent: body, pos: [sx * 0.068, 0.02, S * 0.41] });
        M.sphere(0.052, white, { parent: g, scale: [1, 1.18, 0.45], cast: false });
        const pupil = M.sphere(0.032, pupilM, { parent: g, pos: [0, -0.004, 0.018], scale: [1, 1.15, 0.45], cast: false });
        M.sphere(0.011, M.basic('#ffffff'), { parent: pupil, pos: [0.012, 0.014, 0.02], cast: false });
        M.sphere(0.006, M.basic('#ffffff'), { parent: pupil, pos: [-0.01, -0.012, 0.02], cast: false });
        eyes.push({ g, pupil, base: pupil.position.clone() });
      });
      // bochechas (vergonha) e boca (só falando)
      const blush = [-1, 1].map((sx) => { const b = M.sphere(0.03, pinkM, { parent: body, pos: [sx * 0.1, -0.045, S * 0.4], scale: [1.3, 0.6, 0.3], cast: false }); b.visible = false; return b; });
      const mouth = M.sphere(0.022, dark, { parent: body, pos: [0, -0.06, S * 0.41], scale: [1.2, 0.8, 0.4], cast: false });
      mouth.visible = false;
      const smile = M.torus(0.022, 0.006, dark, { parent: body, pos: [0, -0.05, S * 0.405], rot: [0, 0, Math.PI], arc: Math.PI, cast: false });
      smile.visible = false;
      // bracinhos e perninhas
      const arms = [-1, 1].map((sx) => {
        const g = M.group({ parent: body, pos: [sx * S * 0.52, -0.02, 0.01] });
        M.sphere(0.04, bodyMat, { parent: g, scale: [0.85, 1, 0.85] });
        return { g, sx };
      });
      const legs = [-1, 1].map((sx) => {
        const g = M.group({ parent: body, pos: [sx * 0.065, -S * 0.46, 0] });
        M.capsule(0.03, 0.045, shadeMat, { parent: g, pos: [0, -0.04, 0] });
        M.sphere(0.034, shadeMat, { parent: g, pos: [0, -0.085, 0.012], scale: [1, 0.6, 1.3] });
        return g;
      });
      // acessórios: óculos de professora, varinha, tecladinho holográfico, ondas de som, Zzz
      const prof = M.group({ parent: body, pos: [0, 0.03, S * 0.44] });
      [-1, 1].forEach((sx) => M.torus(0.045, 0.006, M.mat('#2a2a32'), { parent: prof, pos: [sx * 0.068, 0, 0], cast: false }));
      M.box(0.04, 0.006, 0.006, M.mat('#2a2a32'), { parent: prof, pos: [0, 0.01, 0], cast: false });
      prof.visible = false;
      const pointer = M.cyl(0.006, 0.006, 0.3, M.mat('#8a5a3a'), { parent: arms[0].g, pos: [0, 0.12, 0.06], rot: [0.5, 0, 0.2] });
      pointer.visible = false;
      const kb = M.group({ parent: root, pos: [0, -0.24, 0.24] });
      const kbMat = M.basic('#7fe6ff', { transparent: true, opacity: 0.55, unique: true });
      M.box(0.32, 0.01, 0.14, kbMat, { parent: kb, cast: false });
      for (let i = 0; i < 12; i++) M.box(0.04, 0.012, 0.03, M.basic('#c8f6ff', { transparent: true, opacity: 0.7 }), { parent: kb, pos: [-0.13 + (i % 6) * 0.052, 0.008, -0.03 + Math.floor(i / 6) * 0.05], cast: false });
      kb.visible = false;
      const waves = [];
      for (let i = 0; i < 3; i++) {
        const w = M.torus(0.1, 0.006, M.basic('#7ee0b8', { transparent: true, opacity: 0.8, unique: true }), { parent: root, pos: [S * 0.7, 0.04, 0], rot: [0, Math.PI / 2, 0], arc: Math.PI * 0.7, cast: false });
        w.visible = false;
        waves.push(w);
      }
      const zz = M.textPanel(0.25, 0.12, { text: ['Z z'], color: '#9ab8ff', transparent: true, size: 54 });
      zz.position.set(0.18, 0.32, 0);
      root.add(zz);
      zz.visible = false;
      // brilho embaixo (flutua)
      const hover = M.glow('#ffb07a', 0.45, 0.35);
      hover.position.set(0, -0.28, 0);
      root.add(hover);

      let blinkK = 1;
      const ctl = {
        root, kind: 'floater', height: 0.42, headY: 0.18, topY: null, mats,
        update(dt, a) {
          const t = a.t, at = a.animT || 0;
          let y = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, earDrop = 0, earUp = 0, lookX = 0, lookY = 0, eyeOpen = 1;
          const anim = a.anim;
          y = Math.sin(t * 2.4) * 0.025; // flutuar
          kb.visible = anim === 'type';
          prof.visible = anim === 'teach';
          pointer.visible = anim === 'teach';
          waves.forEach((w) => (w.visible = anim === 'listen'));
          zz.visible = anim === 'sleep';
          blush.forEach((b) => (b.visible = anim === 'ashamed'));
          let armL = 0, armR = 0;
          switch (anim) {
            case 'walk': y += Math.abs(Math.sin(a.walkT * 9)) * 0.05; rz = Math.sin(a.walkT * 9) * 0.08; break;
            case 'jump': { const k = (at % 0.9) / 0.9; y += Math.sin(k * Math.PI) * 0.22; sy = 1 + Math.sin(k * Math.PI * 2) * 0.1; sx = 2 - sy; armL = armR = 1.2; break; }
            case 'spin': ry = (at * Math.PI * 2.6) % (Math.PI * 2); y += 0.04; break;
            case 'type': rx = 0.18; armL = 0.6 + Math.sin(t * 22) * 0.4; armR = 0.6 + Math.sin(t * 19 + 1) * 0.4; lookY = -0.6; break;
            case 'doubt': rz = 0.28; lookX = 0.5; lookY = 0.4; earDrop = 0.2; break;
            case 'scared': y += 0.05; rx = -0.2; sx = sy = 1 + Math.sin(t * 40) * 0.03; eyeOpen = 1.25; earUp = 0.4; armL = armR = 1.5; break;
            case 'sad': y -= 0.06; rx = 0.25; earDrop = 1.1; lookY = -0.8; eyeOpen = 0.75; break;
            case 'ashamed': rz = -0.15; ry = 0.35; lookX = -0.8; lookY = -0.3; earDrop = 0.5; eyeOpen = 0.85; break;
            case 'sleep': y = -0.04 + Math.sin(t * 1.2) * 0.015; eyeOpen = 0.08; earDrop = 0.6; rx = 0.12; break;
            case 'celebrate': y += Math.abs(Math.sin(at * 8)) * 0.14; ry = Math.sin(at * 4) * 0.5; armL = armR = 2.4 + Math.sin(t * 16) * 0.3; earUp = 0.4; break;
            case 'enter': { const k = Math.min(1, at / 1.1); sx = sy = M.ease.back(k); ry = (1 - k) * 6; break; }
            case 'teach': armR = 1.6 + Math.sin(t * 3) * 0.2; rz = Math.sin(t * 1.5) * 0.06; break;
            case 'listen': earUp = 0.6; lookX = 0.4; rz = -0.1; waves.forEach((w, i) => { const k = ((t * 0.9 + i / 3) % 1); w.scale.setScalar(0.6 + k * 1.2); w.material.opacity = 0.8 * (1 - k); }); break;
            case 'wave': armR = 2.6 + Math.sin(t * 12) * 0.5; break;
            case 'point': armR = 1.6; ry = 0.3; break;
            case 'think': armR = 1.2; lookX = 0.6; lookY = 0.7; rz = 0.08; break;
            default: break;
          }
          if (a.talking) { armR = Math.max(armR, 0.4 + Math.sin(t * 7) * 0.4); }
          body.position.y = y + (a._jy || 0);
          body.rotation.set(rx, ry, rz);
          body.scale.set(sx, sy, sx);
          ears.forEach((e) => { e.g.rotation.z = e.sx * (earDrop * 0.9 - earUp * 0.3) + Math.sin(t * 3 + e.sx) * 0.04; e.g.rotation.x = earDrop * 0.4; });
          arms[0].g.rotation.z = -armR * 0.8 * arms[0].sx * -1;
          arms[1].g.rotation.z = armL * 0.8 * -1 * -1;
          arms[0].g.position.y = -0.02 + armR * 0.03;
          arms[1].g.position.y = -0.02 + armL * 0.03;
          legs.forEach((l, i) => { l.rotation.x = anim === 'walk' ? Math.sin(a.walkT * 9 + i * Math.PI) * 0.5 : Math.sin(t * 2.4 + i) * 0.08; });
          // olhos
          const want = a.blink ? 0.08 : eyeOpen;
          blinkK += (want - blinkK) * (a.blink ? 1 : Math.min(1, dt * 14));
          eyes.forEach((e) => {
            e.g.scale.y = Math.max(0.06, blinkK);
            e.pupil.position.x = e.base.x + (lookX + (a.look ? a.look[0] : 0)) * 0.012;
            e.pupil.position.y = e.base.y + (lookY + (a.look ? a.look[1] : 0)) * 0.012;
          });
          // boca só ao falar; sorriso em comemoração
          mouth.visible = !!a.talking;
          if (a.talking) mouth.scale.y = 0.4 + Math.abs(Math.sin(t * 16)) * 0.8;
          smile.visible = !a.talking && (anim === 'celebrate' || anim === 'jump' || a.expr === 'feliz');
          // brilho da faísca
          glow.material.opacity = 0.6 + Math.sin(t * 5) * 0.25;
          hover.material.opacity = 0.25 + Math.sin(t * 2.4) * 0.08;
          zz.position.y = 0.32 + ((t * 0.25) % 0.2);
          const op = a.alpha == null ? 1 : a.alpha;
          mats.forEach((m) => { m.transparent = op < 1 || m === pinkM; m.opacity = (m === pinkM ? 0.6 : 1) * op; });
        },
        dispose() { M.dispose(root); },
      };
      return ctl;
    },
  };

  // ------------------------------------------------------------------
  // A DÚVIDA — nuvem roxa gigante feita das preocupações do pai
  // ------------------------------------------------------------------
  C.duvida = {
    name: 'A Dúvida',
    build() {
      const root = new T.Group();
      const big = M.group({ parent: root });
      const cloudM = M.mat('#6a3fb0', { rough: 0.95, emissive: '#2a1060', emissiveIntensity: 0.35, unique: true });
      const coreM = M.mat('#3c1f72', { rough: 1, unique: true });
      const white = M.mat('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.3, unique: true });
      const pupilM = M.mat('#1a0c2c', { unique: true });
      const browM = M.mat('#2a1450', { unique: true });
      const mouthM = M.mat('#1a0820', { unique: true });
      const mats = [cloudM, coreM, white, pupilM, browM, mouthM];
      const puffs = [];
      const rr = M.rng(31);
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const ring = i % 2 ? 0.95 : 0.65;
        const r = 0.45 + rr() * 0.35;
        const p = M.sphere(r, i % 5 === 0 ? coreM : cloudM, { parent: big, pos: [Math.cos(a) * ring * 1.15, 1.9 + Math.sin(a) * ring * 0.75, (rr() - 0.5) * 0.5] });
        puffs.push({ m: p, base: p.position.clone(), ph: rr() * 6 });
      }
      M.sphere(1.05, cloudM, { parent: big, pos: [0, 1.9, 0.1], scale: [1.35, 1, 0.9] });
      // rosto
      const faceG = M.group({ parent: big, pos: [0, 2.0, 0.95] });
      const eyes = [];
      [-1, 1].forEach((sx) => {
        const g = M.group({ parent: faceG, pos: [sx * 0.33, 0.12, 0] });
        M.sphere(0.2, white, { parent: g, scale: [1, 1.15, 0.5], cast: false });
        const pu = M.sphere(0.1, pupilM, { parent: g, pos: [0, -0.03, 0.08], scale: [1, 1, 0.5], cast: false });
        M.sphere(0.03, M.basic('#ffffff'), { parent: pu, pos: [0.035, 0.04, 0.05], cast: false });
        const brow = M.capsule(0.035, 0.26, browM, { parent: faceG, pos: [sx * 0.33, 0.42, 0.02], rot: [0, 0, Math.PI / 2 - sx * 0.35], cast: false });
        eyes.push({ g, pu, brow, sx });
      });
      const mouthG = M.group({ parent: faceG, pos: [0, -0.32, 0.02] });
      const mouth = M.sphere(0.3, mouthM, { parent: mouthG, scale: [1.3, 0.35, 0.3], cast: false });
      const teeth = [];
      for (let i = 0; i < 6; i++) teeth.push(M.cone(0.04, 0.08, M.mat('#f4f1e8'), { parent: mouthG, pos: [-0.25 + i * 0.1, 0.07, 0.07], rot: [Math.PI, 0, 0], cast: false }));
      // palavras de preocupação orbitando
      const WORDS = ['E SE?', 'CARO?', 'VAZOU?', 'VELHO?', 'MENTIRA?', 'MODINHA?', 'EMPREGO?', 'CONTROLE?'];
      const words = WORDS.map((w, i) => {
        const pnl = M.textPanel(0.9, 0.28, { text: [w], color: '#e9dcff', transparent: true, size: 92, font: '"Plus Jakarta Sans", Arial, sans-serif' });
        pnl.material.depthWrite = false;
        big.add(pnl);
        return { m: pnl, ph: (i / WORDS.length) * Math.PI * 2 };
      });
      // raios
      const boltMat = new T.LineBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.95 });
      const bolts = [];
      for (let b = 0; b < 3; b++) {
        const pts = [];
        for (let i = 0; i < 8; i++) pts.push(new T.Vector3(0, 0, 0));
        const g = new T.BufferGeometry().setFromPoints(pts);
        const line = new T.Line(g, boltMat);
        line.visible = false;
        root.add(line);
        bolts.push(line);
      }
      // versão pequena: dúvida saudável
      const small = M.group({ parent: root });
      const smallM = M.mat('#c9b3f2', { rough: 0.85, emissive: '#7a5ab0', emissiveIntensity: 0.25, unique: true });
      mats.push(smallM);
      [[0, 0, 0, 0.12], [-0.11, -0.02, 0, 0.09], [0.11, -0.02, 0, 0.09], [0, 0.07, -0.02, 0.09], [-0.05, 0.06, 0.03, 0.07]].forEach((d) => M.sphere(d[3], smallM, { parent: small, pos: [d[0], d[1], d[2]] }));
      [-1, 1].forEach((sx) => {
        M.sphere(0.022, white, { parent: small, pos: [sx * 0.045, 0.01, 0.11], scale: [1, 1.2, 0.5], cast: false });
        M.sphere(0.012, pupilM, { parent: small, pos: [sx * 0.045, 0.006, 0.122], cast: false });
      });
      M.torus(0.022, 0.005, mouthM, { parent: small, pos: [0, -0.035, 0.115], rot: [0, 0, Math.PI], arc: Math.PI, cast: false });
      const q = M.textPanel(0.14, 0.14, { text: ['?'], color: '#ffffff', transparent: true, size: 110 });
      q.position.set(0, 0.2, 0);
      small.add(q);
      small.visible = false;

      let flashK = 0, lastAnim = '';
      const ctl = {
        root, kind: 'boss', height: 3, headY: 2.1, mats, small,
        update(dt, a) {
          const t = a.t, at = a.animT || 0, anim = a.anim;
          const isSmall = anim === 'small';
          big.visible = !isSmall;
          small.visible = isSmall;
          if (isSmall) {
            small.position.y = 1.35 + Math.sin(t * 2) * 0.04;
            small.rotation.z = Math.sin(t * 1.3) * 0.08;
            q.position.y = 0.2 + Math.sin(t * 3) * 0.015;
            return;
          }
          if (anim !== lastAnim) { lastAnim = anim; if (anim === 'hurt') flashK = 1; }
          puffs.forEach((p) => {
            const w = anim === 'heal' ? 1.15 : anim === 'defeated' ? 0.8 : 1;
            p.m.position.set(p.base.x * w + Math.sin(t * 1.3 + p.ph) * 0.05, p.base.y + Math.sin(t * 1.7 + p.ph) * 0.06, p.base.z);
            p.m.scale.setScalar(1 + Math.sin(t * 2 + p.ph) * 0.04);
          });
          let lunge = 0, recoil = 0, droop = 0;
          if (anim === 'attack') lunge = Math.sin(Math.min(1, at / 0.6) * Math.PI) * 0.8;
          if (anim === 'hurt') recoil = Math.sin(Math.min(1, at / 0.5) * Math.PI) * 0.5;
          if (anim === 'defeated') droop = Math.min(1, at / 1.5);
          big.position.z = lunge - recoil;
          big.position.y = Math.sin(t * 1.1) * 0.08 - droop * 0.6;
          big.rotation.z = Math.sin(t * 0.7) * 0.04 + recoil * 0.2;
          // rosto
          const angry = a.expr === 'bravo' || anim === 'attack';
          const laugh = a.expr === 'rindo';
          eyes.forEach((e) => {
            e.brow.rotation.z = Math.PI / 2 - e.sx * (angry ? 0.45 : a.expr === 'amigavel' ? -0.2 : laugh ? 0.1 : 0.25);
            e.g.scale.y = a.blink ? 0.1 : laugh ? 0.45 : a.expr === 'surpreso' ? 1.25 : 1;
            e.pu.position.x = Math.sin(t * 0.8) * 0.03;
          });
          const open = a.talking ? 0.35 + Math.abs(Math.sin(t * 9)) * 0.9 : laugh ? 1 : anim === 'attack' ? 1.2 : 0.4;
          mouth.scale.y = 0.35 * open;
          teeth.forEach((th) => (th.visible = open > 0.6));
          // palavras
          words.forEach((w, i) => {
            const ang = w.ph + t * 0.35;
            const rad = 1.9 + Math.sin(t + i) * 0.1;
            w.m.position.set(Math.cos(ang) * rad, 2 + Math.sin(ang * 2) * 0.55 - droop * (1 + i * 0.3), Math.sin(ang) * rad * 0.6 + 0.3);
            w.m.quaternion.copy(P2.core.camera ? P2.core.camera.quaternion : w.m.quaternion);
            w.m.material.opacity = 1 - droop;
            w.m.material.transparent = true;
          });
          // raios no ataque
          bolts.forEach((b, i) => {
            b.visible = anim === 'attack' && at < 0.9 && Math.sin(t * 40 + i * 2) > -0.2;
            if (b.visible) {
              const pos = b.geometry.attributes.position;
              let x = (i - 1) * 0.6, y = 1.2, z = 1;
              for (let k = 0; k < pos.count; k++) {
                pos.setXYZ(k, x, y, z);
                x += (Math.sin(t * 50 + k * 3 + i) * 0.25);
                y -= 0.22;
                z += 0.35;
              }
              pos.needsUpdate = true;
            }
          });
          // cor: brilho branco ao apanhar, roxo vivo ao curar
          flashK = Math.max(0, flashK - dt * 2.5);
          const heal = anim === 'heal' ? 0.6 + Math.sin(t * 8) * 0.3 : 0;
          cloudM.emissive.setRGB(0.16 + flashK * 0.9 + heal * 0.3, 0.06 + flashK * 0.9, 0.38 + flashK * 0.9 + heal * 0.4);
          const op = a.alpha == null ? 1 : a.alpha;
          mats.forEach((m) => { m.transparent = op < 1; m.opacity = op; });
        },
        dispose() { M.dispose(root); },
      };
      return ctl;
    },
  };
})();

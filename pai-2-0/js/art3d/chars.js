/* PAI 2.0 — chars.js
 * Elenco 3D: Pai (CEO), Filho/Filha, Conselheira (chefe), Jorge,
 * Golpista, figurantes (npc), Faísca (a assistente) e A Dúvida (chefão).
 * Humanos usam P2.rig.human (js/engine/rig.js); Faísca e Dúvida têm montagem própria.
 *
 * IDS (P2.chars.<id> = { name, build(opts) → controlador }):
 *   pai       — CEO ~1,80 m: blazer marinho, camisa azul-clara, grisalho com entradas ("grisalho"
 *               degradê na nuca), bigode, óculos, barriguinha, relógio. opts: {skin, jacket, tie,
 *               roupa: 'pijama' (p/ cenas na cama: G.pai.rebuild({roupa:'pijama'})) | 'casa' (polo + calça cáqui)}
 *   filho     — opts.genero === 'filha' (ou opts.variant === 'filha') → filha (cabelo "longo",
 *               brincos); senão filho (cabelo "baguncado"). Moletom verde, jeans, tênis. opts: {skin}
 *   chefe     — Conselheira "Dona Marta": blazer vinho, coque grisalho, óculos gatinho, colar. opts: {skin}
 *   jorge     — diretor comercial: calvo ("careca" em ferradura), camisa estampada amarela, barriga. opts: {skin}
 *   golpista  — sombra encapuzada: capuz pontudo com capinha nos ombros, rosto vazio fosco, olhos
 *               vermelhos, manto com dobras, mangas em sino, fumaça.
 *               anims extras: 'appear' / 'vanish' (dissolve na fumaça, use animT), 'phone' (celular vermelho),
 *               'lurk'; demais poses humanas funcionam.
 *   npc       — figurante por semente: opts {seed (1..∞), female, hair, hairColor, kind, color, skin}.
 *               A semente define gênero, cabelo, cor, roupa (blazer/camisa/polo/suéter/blusa), óculos,
 *               barba (fechada curta + bigode), gravata, joias e proporções do rosto (olhos, nariz, boca,
 *               cabeça). Diretores nomeados (P2.CEO.diretores): bia {seed:3, female:true} (óculos),
 *               rafael {seed:5}, luana {seed:8, female:true}, tadeu {seed:2} (barba grisalha).
 *   faisca    — mascote flutuante (kind 'floater', height 0.42, headY 0.18). anims: idle, walk, jump,
 *               spin, type (teclado holográfico), doubt (?), scared (!), sad, ashamed (bracinhos juntos,
 *               boca ondulada), sleep (Zz), celebrate (confete), enter (giro + brilho; use animT 0..1.1),
 *               teach (óculos + varinha), listen (ondas), wave, point, think (balões).
 *               exprs: felizes (feliz/rindo/empolgado/orgulhoso/amigavel/aliviado/emocionado → olhos ^ ^),
 *               triste/preocupado, bravo/determinado, surpreso/assustado, sem_graca, pensativo,
 *               desconfiado, cansado, confuso (?). talking → boquinha.
 *   duvida    — chefão (kind 'boss', height 3, headY 2.1): nuvem roxa com palavras de preocupação
 *               orbitando. anims: idle, attack (avança + raios), hurt (recua + clarão), heal (incha e
 *               brilha), defeated (murcha, palavras caem), small (forma pequena e fofa, "dúvida saudável").
 *               exprs: bravo (padrão), rindo, amigavel, surpreso. talking → boca mexe. Raios do ataque:
 *               núcleo branco + halo aditivo + galho, cintilando. A malha da nuvem fica em cache
 *               (reconstruir a Dúvida numa troca de cena é instantâneo).
 *   textSprite(text, o) — utilitário (sprite de texto) usado pela Dúvida/Faísca.
 *
 * CONTROLADOR (contrato com stage3d): {root, height, headY, kind:'human'|'floater'|'boss',
 *   update(dt, actor), dispose()} — actor: {anim, animT, t, expr, talking, blink, walkT, props,
 *   alpha, look, lookYaw}. Humanos também expõem joints, face, props, mats.
 *   Poses humanas: P2.rig.POSES · expressões: P2.rig.EXPRS (lista completa no topo de rig.js).
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
        belly: 0.55, age: 1, stubble: 0.12,
        face: { jaw: 0.1, chin: 0.6 },
        hair: { style: 'grisalho', color: '#9a98a2' },
        browColor: '#5c5862', browH: 0.0142,
        mustache: '#86828d',
        glasses: { color: '#2a2a32', w: 0.031, h: 0.0215, n: 3.6 },
        eyes: '#4a2e1c',
        // opts.roupa: 'pijama' (cama/noite) | 'casa' (camisa polo, fim de semana) | padrão: terno
        top: o.roupa === 'pijama' ? { kind: 'shirt', color: '#7f98bf', untucked: true, pocketSquare: false }
          : o.roupa === 'casa' ? { kind: 'polo', color: '#4f7a6a' }
          : { kind: 'blazer', color: o.jacket || '#24324f', shirt: '#c3d7ef', tie: o.tie ? '#7a2434' : null },
        pants: o.roupa === 'pijama' ? '#6d86ad' : o.roupa === 'casa' ? '#c9b89a' : '#3a3f4c',
        shoes: o.roupa === 'pijama' ? '#4a3a36' : '#3a2418', watch: o.roupa === 'pijama' ? null : '#d9c38a',
      });
    },
  };
  C.filho = {
    name: 'Filho',
    build(o) {
      const fem = o.genero === 'filha' || o.variant === 'filha';
      return R.human({
        skin: o.skin || 'medio',
        height: fem ? 0.97 : 1.03,
        female: fem,
        stubble: fem ? 0 : 0.05,
        hair: { style: fem ? 'longo' : 'baguncado', color: '#2c1f1a' },
        eyes: '#3a2516',
        top: { kind: 'hoodie', color: '#2fae86' },
        pants: '#3b5b8a', jeans: true,
        shoes: '#f4f3ef', shoeStyle: 'tenis', shoeAccent: '#e8643a', soleColor: '#f7f6f2',
        earrings: fem ? '#e9d7a8' : null,
      });
    },
  };
  C.chefe = {
    name: 'Conselheira',
    build(o) {
      return R.human({
        skin: o.skin || 'claro',
        female: true, age: 1,
        height: 0.98,
        hair: { style: 'coque', color: '#b4ada8' },
        glasses: { color: '#6a2a3a', cat: true, w: 0.031, h: 0.02, n: 3 },
        eyes: '#3e5a6a',
        top: { kind: 'blazer', color: '#6a2c3e', shirt: '#f3ece0', necklace: true, pocketSquare: false },
        pants: '#2e2a34',
        shoes: '#1d1416',
        earrings: true,
      });
    },
  };
  C.jorge = {
    name: 'Jorge',
    build(o) {
      return R.human({
        skin: o.skin || 'claro',
        belly: 0.9, build: 0.3, stubble: 0.16,
        face: { jaw: 0.06, chin: 0.45, cheek: 1.6 },
        hair: { style: 'careca', color: '#4a382c' }, shinyScalp: true,
        eyes: '#3a2a1a',
        top: { kind: 'shirt', color: '#f2b13c', sleeves: 'short', pattern: ['#2f9f78', '#ff6b6b', '#ff8a3a', '#3a6ad8'] },
        pants: '#7a6a52',
        shoes: '#4a3020',
        watch: '#c8c8cc', watchBand: '#c8c8cc',
      });
    },
  };
  C.golpista = {
    name: 'Golpista',
    build() {
      const ctl = R.human({ ghost: true, height: 1.04, hair: { style: 'nenhum', color: '#000' }, top: { kind: 'cloak', color: '#170c26' } });
      // fumaça escura em volta (mais densa embaixo)
      const wisps = [];
      for (let i = 0; i < 10; i++) {
        const s = M.glow('#2a0f3a', 0.6 + (i % 3) * 0.25, 0.55);
        s.material = s.material.clone();
        s.material.blending = T.NormalBlending;
        s.material.color.set(i % 2 ? '#120820' : '#1d0c2c');
        ctl.root.add(s);
        wisps.push(s);
        ctl.mats.push(s.material);
      }
      const base = ctl.update;
      ctl.update = function (dt, a) {
        const anim = a.anim;
        // aparecer/sumir: dissolve na fumaça
        let al = a.alpha == null ? 1 : a.alpha;
        if (anim === 'appear') al *= Math.min(1, (a.animT || 0) / 0.9);
        if (anim === 'vanish') al *= Math.max(0, 1 - (a.animT || 0) / 0.9);
        const props = anim === 'phone' ? Object.assign({ phone: true, phoneColor: '#ff3b3b' }, a.props || {}) : a.props;
        base(dt, Object.assign({}, a, { alpha: al, anim: anim === 'phone' ? 'showphone' : anim, props }));
        ctl.root.position.y = 0.05 + Math.sin(a.t * 1.3) * 0.03;
        const t = a.t;
        // fumaça: nasce na barra do manto, se espalha rente ao chão e sobe dissolvendo
        wisps.forEach((w, i) => {
          const ang = t * 0.4 + i * 0.63;
          const k = ((t * 0.18 + i * 0.137) % 1);
          const rad = 0.2 + k * 0.32;
          w.position.set(Math.cos(ang) * rad, -0.02 + k * k * 0.75, Math.sin(ang) * rad * 0.8 - 0.03);
          w.scale.setScalar(0.45 + k * 0.6);
          w.material.opacity = 0.75 * Math.sin(Math.min(1, k * 1.15) * Math.PI) * al;
        });
      };
      return ctl;
    },
  };
  // Figurantes de reunião (variam pela semente)
  const NPC_HAIR_M = ['curto', 'curto', 'raspado', 'careca', 'baguncado', 'cacheado', 'grisalho'];
  const NPC_HAIR_F = ['longo', 'coque', 'chanel', 'rabo', 'cacheado', 'longo'];
  const NPC_HAIRC = ['#2c1f1a', '#5a3a28', '#1a1a1a', '#8a6a4a', '#b8b2ac', '#3a2a22', '#a4682f'];
  const NPC_TOP = ['#3a5a8a', '#6a4a8a', '#2f8f6a', '#8a3a3a', '#4a4a5a', '#b07a3a', '#2a3a4a', '#7a8a9a', '#c0566a'];
  const NPC_PANTS = ['#30343e', '#2a2a30', '#4a4038', '#3b4a6a', '#5a5048'];
  const NPC_SKIN = ['claro', 'medio', 'escuro', 'medio'];
  C.npc = {
    name: 'Figurante',
    build(o) {
      const r = M.rng((o.seed || 1) * 977 + 13);
      r(); r();
      const fem = o.female != null ? o.female : r() > 0.5;
      const hair = o.hair || (fem ? NPC_HAIR_F : NPC_HAIR_M)[Math.floor(r() * (fem ? NPC_HAIR_F.length : NPC_HAIR_M.length))];
      let hairColor = o.hairColor || NPC_HAIRC[Math.floor(r() * NPC_HAIRC.length)];
      if (hair === 'grisalho') hairColor = '#b0aeb4';
      const kinds = fem ? ['blazer', 'blouse', 'sweater', 'blazer', 'shirt'] : ['blazer', 'shirt', 'polo', 'sweater', 'blazer', 'shirt'];
      const kind = o.kind || kinds[Math.floor(r() * kinds.length)];
      const topC = o.color || NPC_TOP[Math.floor(r() * NPC_TOP.length)];
      const shirtC = ['#eef2f6', '#dfe9f5', '#f6efe4', '#e9e4f2'][Math.floor(r() * 4)];
      const glasses = r() > 0.62 ? { color: ['#2a2a32', '#5a3a2a', '#8a8a92', '#3a2a4a'][Math.floor(r() * 4)], w: 0.029 + r() * 0.004, h: 0.019 + r() * 0.005, n: 2.4 + r() * 1.6, metal: r() > 0.6 } : null;
      const beard = !fem && r() > 0.72 ? hairColor : null;
      const skin = o.skin || NPC_SKIN[Math.floor(r() * NPC_SKIN.length)];
      const spec = {
        skin,
        female: fem,
        height: fem ? 0.95 + r() * 0.05 : 0.98 + r() * 0.06,
        belly: !fem && r() > 0.65 ? 0.25 + r() * 0.45 : 0,
        build: (r() - 0.5) * 0.6,
        face: { jaw: fem ? 0.2 : 0.06 + r() * 0.1, chin: 0.35 + r() * 0.35, cheek: 0.7 + r() * 0.8 },
        hair: { style: hair, color: hairColor },
        beard, mustache: beard ? M.hex(M.mix(beard, '#000', 0.08)) : null, stubble: fem ? 0 : r() * 0.18,
        glasses,
        eyes: ['#3a2416', '#2a1a10', '#4a6a3a', '#3e5a7a'][Math.floor(r() * 4)],
        top: { kind, color: topC, shirt: shirtC, tie: kind === 'blazer' && !fem && r() > 0.55 ? ['#7a2434', '#2a3a6a', '#3a5a3a'][Math.floor(r() * 3)] : null, necklace: fem && r() > 0.5 ? true : null, sleeves: kind === 'shirt' && r() > 0.7 ? 'short' : null, pocketSquare: r() > 0.5 ? undefined : false },
        pants: NPC_PANTS[Math.floor(r() * NPC_PANTS.length)], jeans: r() > 0.8,
        shoes: ['#221a16', '#3a2418', '#1a1a1e'][Math.floor(r() * 3)],
        earrings: fem && r() > 0.4 ? true : null,
        watch: !fem && r() > 0.6 ? '#c8c8cc' : null,
      };
      // variedade de rosto (sorteios NO FIM → as sementes antigas mantêm roupa/cabelo)
      spec.eyeSize = 0.92 + r() * 0.16;
      spec.nose = (fem ? 0.74 : 0.9) + r() * (fem ? 0.2 : 0.3);
      spec.mouthSize = 0.9 + r() * 0.22;
      spec.headScale = 0.97 + r() * 0.06;
      return R.human(spec);
    },
  };

  // ------------------------------------------------------------------
  // utilitários: sprite de texto/ícone (sempre de frente para a câmera)
  // ------------------------------------------------------------------
  const spriteCache = {};
  function textSprite(text, o) {
    o = o || {};
    const key = JSON.stringify([text, o]);
    let tex = spriteCache[key];
    if (!tex) {
      const W = o.w || 256, H = o.h || 128;
      tex = M.canvasTex(W, H, (ctx) => {
        ctx.clearRect(0, 0, W, H);
        ctx.font = (o.weight || '800') + ' ' + (o.size || 72) + 'px "Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 18; }
        if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeW || 12; ctx.strokeStyle = o.stroke; ctx.strokeText(text, W / 2, H / 2 + 4); }
        ctx.shadowBlur = 0;
        ctx.fillStyle = o.color || '#fff';
        ctx.fillText(text, W / 2, H / 2 + 4);
      });
      spriteCache[key] = tex;
    }
    const mat = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
    const sp = new T.Sprite(mat);
    sp.scale.set(o.sx || 0.3, o.sy || 0.15, 1);
    return sp;
  }
  C.textSprite = textSprite;
  function withColors(geo, fn) {
    const g = geo.clone();
    const pos = g.attributes.position, nor = g.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    const v = new T.Vector3(), n = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); n.fromBufferAttribute(nor, i); const c = fn(v, n); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    return g;
  }
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

  // ------------------------------------------------------------------
  // FAÍSCA — a assistente: cubinho coral macio, olhos grandes e brilhantes,
  // tufinhos de orelha, antena com faísca, bracinhos e perninhas; flutua.
  // Boca só aparece quando fala (ou sorri quando feliz).
  // ------------------------------------------------------------------
  C.faisca = {
    name: 'Faísca',
    build() {
      const root = new T.Group();
      const body = M.group({ parent: root, name: 'faiscaBody' });
      const S = 0.3, D = S * 0.84, Hh = S * 0.92;
      const cTop = new T.Color('#ffae7c'), cMid = new T.Color('#ff7a45'), cBot = new T.Color('#e4552a'), cFace = new T.Color('#ffc9a4');
      const bodyMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0, emissive: new T.Color('#ff5a20'), emissiveIntensity: 0.1 });
      R.addRim(bodyMat, 1.6);
      const shadeMat = new T.MeshStandardMaterial({ color: '#e4552a', roughness: 0.5 });
      const eyeMat = new T.MeshStandardMaterial({ color: '#231a3a', roughness: 0.12, metalness: 0.1 });
      const white = new T.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
      const pinkM = new T.MeshBasicMaterial({ color: '#ff6f8f', transparent: true, opacity: 0.45, depthWrite: false });
      const dark = new T.MeshStandardMaterial({ color: '#4a1420', roughness: 0.5 });
      const tongueM = new T.MeshStandardMaterial({ color: '#ff8a9a', roughness: 0.5 });
      const spark = new T.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb020', emissiveIntensity: 0.9, roughness: 0.35 });
      const sweatM = new T.MeshStandardMaterial({ color: '#9ad8ff', roughness: 0.05, transparent: true, opacity: 0.85 });
      const mats = [bodyMat, shadeMat, eyeMat, white, pinkM, dark, tongueM, spark, sweatM];
      // corpo: cubo arredondado com degradê e "rostinho" mais claro
      const coreGeo = withColors(M.roundedBoxGeo(S, Hh, D, 0.1, 5), (v, n) => {
        const c = cMid.clone();
        if (v.y > 0) c.lerp(cTop, smooth(0, Hh / 2, v.y) * 0.8); else c.lerp(cBot, smooth(0, -Hh / 2, v.y) * 0.85);
        const fx = v.x / (S * 0.36), fy = (v.y + Hh * 0.08) / (Hh * 0.3);
        if (n.z > 0.5) c.lerp(cFace, Math.max(0, 1 - Math.hypot(fx, fy)) * 0.55);
        return c;
      });
      const core = new T.Mesh(coreGeo, bodyMat); core.castShadow = true; core.receiveShadow = true; body.add(core);
      // tufinhos (orelhas)
      const ears = [];
      [-1, 1].forEach((sx) => {
        const eg = M.group({ parent: body, pos: [sx * S * 0.28, Hh * 0.46, -0.01] });
        const pts = R.bez(new T.Vector3(0, -0.02, 0), new T.Vector3(sx * 0.01, 0.04, 0), new T.Vector3(sx * 0.035, 0.075, -0.005), null, 9);
        const g = withColors(R.lockGeo(pts, 0.032, 0.026, { profile: (t) => Math.pow(Math.sin(Math.min(1, t * 0.85 + 0.15) * Math.PI), 0.55) }), (v) => cMid.clone().lerp(new T.Color('#ffd0a8'), smooth(0.02, 0.08, v.y)));
        const m = new T.Mesh(g, bodyMat); m.castShadow = true; eg.add(m);
        ears.push({ g: eg, sx });
      });
      // antena com faísca (estrelinha)
      const ant = M.group({ parent: body, pos: [0, Hh * 0.5, 0] });
      const stem = new T.Mesh(R.lockGeo(R.bez(new T.Vector3(0, -0.01, 0), new T.Vector3(0.006, 0.045, 0), new T.Vector3(0.028, 0.075, 0), null, 8), 0.011, 0.011, { profile: (t) => 1 - t * 0.35 }), shadeMat); stem.castShadow = true;
      ant.add(stem);
      const star = new T.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.012 : 0.03, a = (i / 10) * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) star.lineTo(x, y); else star.moveTo(x, y); }
      const starG = new T.ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
      starG.translate(0, 0, -0.006);
      const sparkG = M.group({ parent: ant, pos: [0.03, 0.085, 0] });
      sparkG.add(new T.Mesh(starG, spark));
      const glow = M.glow('#ffc04a', 0.16, 0.6); sparkG.add(glow); mats.push(glow.material);
      // olhos grandes e brilhantes + pálpebras (cor do corpo) + olhos felizes (^ ^)
      const eyes = [];
      const lidMat = new T.MeshStandardMaterial({ color: '#ff8550', roughness: 0.45 });
      mats.push(lidMat);
      [-1, 1].forEach((sx) => {
        const g = M.group({ parent: body, pos: [sx * 0.07, 0.022, D / 2 - 0.002] });
        const ball = M.group({ parent: g });
        const e = new T.Mesh(M.sphereGeo(1, 24, 16), eyeMat); e.scale.set(0.046, 0.058, 0.022); ball.add(e);
        const h1 = new T.Mesh(M.sphereGeo(1, 12, 8), white); h1.scale.set(0.015, 0.017, 0.006); h1.position.set(-0.014, 0.022, 0.018); ball.add(h1);
        const h2 = new T.Mesh(M.sphereGeo(1, 10, 8), white); h2.scale.set(0.007, 0.007, 0.004); h2.position.set(0.016, -0.02, 0.018); ball.add(h2);
        const ring = new T.Mesh(M.torusGeo(0.04, 0.0025, 6, 28), new T.MeshBasicMaterial({ color: '#5a6aff', transparent: true, opacity: 0.35, toneMapped: false })); ring.scale.set(1, 1.25, 1); ring.position.z = 0.016; ball.add(ring); mats.push(ring.material);
        // pálpebra (meia esfera) — inclina para triste/bravo
        const lidG = M.group({ parent: g, pos: [0, 0, 0.002] });
        const lid = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidMat); lid.scale.set(0.052, 0.064, 0.027); lid.rotation.x = 0; lidG.add(lid);
        lidG.visible = false;
        // olho feliz ^
        const happy = new T.Mesh(M.torusGeo(0.032, 0.0085, 8, 20, Math.PI), eyeMat); happy.position.set(0, -0.012, 0.012); happy.visible = false; g.add(happy);
        eyes.push({ g, ball, lidG, happy, sx, h1, h2 });
      });
      // bochechas
      const blush = [-1, 1].map((sx) => { const b = new T.Mesh(M.sphereGeo(1, 14, 10), pinkM); b.scale.set(0.026, 0.015, 0.006); b.position.set(sx * 0.105, -0.035, D / 2 + 0.002); body.add(b); return b; });
      // boca (só falando) / sorriso / "o"
      const mouthG = M.group({ parent: body, pos: [0, -0.06, D / 2 + 0.002] });
      const mouth = new T.Mesh(M.sphereGeo(1, 16, 10), dark); mouth.scale.set(0.024, 0.016, 0.008); mouthG.add(mouth);
      const tongue = new T.Mesh(M.sphereGeo(1, 12, 8), tongueM); tongue.scale.set(0.014, 0.007, 0.006); tongue.position.set(0, -0.007, 0.003); mouthG.add(tongue);
      const smile = new T.Mesh(M.torusGeo(0.02, 0.0055, 8, 18, Math.PI), dark); smile.rotation.z = Math.PI; smile.position.set(0, -0.052, D / 2 + 0.003); body.add(smile);
      const frown = new T.Mesh(M.torusGeo(0.016, 0.0045, 8, 18, Math.PI), dark); frown.position.set(0, -0.07, D / 2 + 0.003); body.add(frown);
      // boquinha ondulada (vergonha / sem graça)
      const wpts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; wpts.push(new T.Vector3((u - 0.5) * 0.05, Math.sin(u * Math.PI * 3) * 0.0045, 0)); }
      const wavy = new T.Mesh(R.lockGeo(wpts, 0.0042, 0.0035, { profile: () => 1, segs: 6, up: new T.Vector3(0, 0, 1) }), dark); wavy.position.set(0, -0.062, D / 2 + 0.003); body.add(wavy); wavy.visible = false;
      // bracinhos e perninhas
      const arms = [-1, 1].map((sx) => {
        const g = M.group({ parent: body, pos: [sx * S * 0.5, -0.01, 0.0] });
        const m = new T.Mesh(M.capsuleGeo(0.026, 0.04, 6, 12), bodyMat.clone()); m.material = shadeMat; m.position.set(sx * 0.018, -0.03, 0); m.rotation.z = sx * 0.35; m.castShadow = true; g.add(m);
        return { g, sx };
      });
      const legs = [-1, 1].map((sx) => {
        const g = M.group({ parent: body, pos: [sx * 0.068, -Hh * 0.45, 0] });
        const l = new T.Mesh(M.capsuleGeo(0.026, 0.035, 6, 12), shadeMat); l.position.y = -0.035; l.castShadow = true; g.add(l);
        const f = new T.Mesh(M.sphereGeo(1, 14, 10), shadeMat); f.scale.set(0.034, 0.022, 0.044); f.position.set(0, -0.075, 0.012); f.castShadow = true; g.add(f);
        return g;
      });
      // acessórios
      const prof = M.group({ parent: body, pos: [0, 0.024, D / 2 + 0.03] });
      const frameM = new T.MeshStandardMaterial({ color: '#2a2a32', roughness: 0.3, metalness: 0.5 }); mats.push(frameM);
      [-1, 1].forEach((sx) => { const r = new T.Mesh(M.torusGeo(0.05, 0.0055, 8, 28), frameM); r.position.x = sx * 0.07; prof.add(r); });
      const br = new T.Mesh(M.boxGeo(0.04, 0.006, 0.006), frameM); br.position.y = 0.012; prof.add(br);
      prof.visible = false;
      const pointerM = new T.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.6 }); mats.push(pointerM);
      // varinha: sai da mãozinha (ponta do braço) e continua na direção do braço, um pouco para cima
      const pointer = new T.Mesh(M.cylGeo(0.0045, 0.006, 0.24, 8), pointerM); pointer.position.set(-0.11, -0.12, 0.03); pointer.rotation.set(0.15, 0, -1.01);
      const ptip = new T.Mesh(M.sphereGeo(0.011, 10, 8), spark); ptip.position.y = -0.125; pointer.add(ptip);
      const pglow = M.glow('#ffd27a', 0.07, 0.8); pglow.position.y = -0.125; pointer.add(pglow); mats.push(pglow.material);
      arms[0].g.add(pointer); pointer.visible = false;
      // teclado holográfico + faíscas de "pensamento"
      const kb = M.group({ parent: root, pos: [0, -0.2, 0.2] });
      const kbMat = new T.MeshBasicMaterial({ color: '#7fe6ff', transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, side: T.DoubleSide }); mats.push(kbMat);
      const keyMat = new T.MeshBasicMaterial({ color: '#c8f6ff', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }); mats.push(keyMat);
      const kbBase = new T.Mesh(M.planeGeo(0.34, 0.15), kbMat); kbBase.rotation.x = -Math.PI / 2 + 0.25; kb.add(kbBase);
      const keys = [];
      for (let i = 0; i < 15; i++) { const k = new T.Mesh(M.boxGeo(0.036, 0.008, 0.026), keyMat); k.position.set(-0.13 + (i % 5) * 0.065, 0.008 + Math.floor(i / 5) * 0.01, -0.045 + Math.floor(i / 5) * 0.042); kb.add(k); keys.push(k); }
      kb.visible = false;
      const bits = [];
      for (let i = 0; i < 6; i++) { const b = M.glow(i % 2 ? '#7fe6ff' : '#ffd27a', 0.06, 0.9); root.add(b); bits.push(b); mats.push(b.material); b.visible = false; }
      // ondas de som (ouvir)
      const waves = [];
      const waveM = []; 
      for (let i = 0; i < 6; i++) {
        const wm = new T.MeshBasicMaterial({ color: '#7ee0b8', transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, side: T.DoubleSide }); mats.push(wm); waveM.push(wm);
        const w = new T.Mesh(M.torusGeo(0.08, 0.006, 6, 24, Math.PI * 0.6), wm);
        const sx = i < 3 ? 1 : -1;
        w.position.set(sx * 0.22, 0.05, 0); w.rotation.set(0, 0, sx > 0 ? -Math.PI * 0.3 : Math.PI * 0.7);
        root.add(w); w.visible = false; waves.push({ m: w, k: i % 3, sx });
      }
      // ícones flutuantes
      const zz = textSprite('Zz', { color: '#b9c8ff', stroke: '#2a2f5a', strokeW: 10, size: 80 }); zz.scale.set(0.2, 0.1, 1); root.add(zz); zz.visible = false;
      const qm = textSprite('?', { color: '#ffffff', stroke: '#4166a8', strokeW: 14, size: 110, w: 128, h: 128 }); qm.scale.set(0.12, 0.12, 1); root.add(qm); qm.visible = false;
      const ex = textSprite('!', { color: '#ffffff', stroke: '#e94b5a', strokeW: 14, size: 110, w: 128, h: 128 }); ex.scale.set(0.12, 0.12, 1); root.add(ex); ex.visible = false;
      [zz, qm, ex].forEach((sp) => mats.push(sp.material));
      const sweat = new T.Mesh(M.sphereGeo(1, 12, 10), sweatM); sweat.scale.set(0.013, 0.018, 0.009); sweat.position.set(0.13, 0.08, D / 2 - 0.01); body.add(sweat); sweat.visible = false;
      const think = [0, 1, 2].map((i) => { const m = new T.Mesh(M.sphereGeo(1, 12, 8), white); m.scale.setScalar(0.012 + i * 0.008); root.add(m); m.visible = false; return m; });
      // confete (comemorar) e brilho de entrada
      const CONF = ['#ff6b6b', '#ffe066', '#3ad1a0', '#5a8dff', '#ff9a3a', '#c86bff'];
      const confetti = [];
      for (let i = 0; i < 18; i++) {
        const cm = new T.MeshBasicMaterial({ color: CONF[i % CONF.length], side: T.DoubleSide, transparent: true, toneMapped: false }); mats.push(cm);
        const c = new T.Mesh(M.planeGeo(0.022, 0.012), cm); root.add(c); c.visible = false; confetti.push(c);
      }
      const burst = [];
      for (let i = 0; i < 10; i++) { const b = M.glow(i % 2 ? '#ffe58a' : '#ffffff', 0.09, 1); root.add(b); b.visible = false; burst.push(b); mats.push(b.material); }
      const flash = M.glow('#fff2c0', 0.9, 0); root.add(flash); mats.push(flash.material);
      // brilho embaixo (flutua)
      const hover = M.glow('#ffb07a', 0.3, 0.2); hover.position.set(0, -0.26, 0); root.add(hover); mats.push(hover.material);
      mats.forEach((m) => { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; });

      let blinkK = 1, lastAnim = '';
      const HAPPY = { feliz: 1, rindo: 1, empolgado: 1, orgulhoso: 1, amigavel: 1, aliviado: 1, emocionado: 1 };
      const ctl = {
        root, kind: 'floater', height: 0.42, headY: 0.18, topY: null, mats,
        update(dt, a) {
          const t = a.t, at = a.animT || 0, anim = a.anim;
          if (anim !== lastAnim) lastAnim = anim;
          let y = Math.sin(t * 2.4) * 0.025, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, earDrop = 0, earUp = 0, lookX = 0, lookY = 0, eyeOpen = 1, eyeScale = 1;
          let lidTilt = 0, lidDown = -1, happyEyes = !!HAPPY[a.expr], mouthMode = 'none', blushK = 0.35;
          let armL = 0, armR = 0, armFwdR = 0, armIn = 0, earBack = 0;
          const expr = a.expr;
          if (expr === 'triste' || expr === 'preocupado') { lidTilt = 0.45; lidDown = 0.25; mouthMode = 'frown'; earDrop = 0.6; }
          if (expr === 'bravo' || expr === 'determinado') { lidTilt = -0.5; lidDown = 0.3; }
          if (expr === 'surpreso' || expr === 'assustado') { eyeScale = 1.15; mouthMode = 'o'; earUp = 0.4; }
          if (expr === 'sem_graca') { blushK = 0.85; lookX = -0.8; mouthMode = 'wavy'; }
          if (expr === 'pensativo') { lookX = 0.6; lookY = 0.7; }
          if (expr === 'desconfiado') { lidTilt = -0.2; lidDown = 0.45; lookX = -0.5; }
          if (expr === 'cansado') { lidDown = 0.5; earDrop = 0.4; }
          if (happyEyes) { mouthMode = 'smile'; blushK = 0.6; }
          switch (anim) {
            case 'walk': y += Math.abs(Math.sin(a.walkT * 9)) * 0.05; rz = Math.sin(a.walkT * 9) * 0.08; armL = 0.3 + Math.sin(a.walkT * 9) * 0.4; armR = 0.3 - Math.sin(a.walkT * 9) * 0.4; break;
            case 'jump': { const k = (at % 0.9) / 0.9; y += Math.sin(k * Math.PI) * 0.22; sy = 1 + Math.sin(k * Math.PI * 2) * 0.12; sx = 2 - sy; armL = armR = 1.2 + Math.sin(k * Math.PI) * 0.8; happyEyes = true; mouthMode = 'smile'; earUp = 0.5; break; }
            case 'spin': ry = (at * Math.PI * 2.6) % (Math.PI * 2); y += 0.04; armL = armR = 1.0; happyEyes = true; break;
            case 'type': rx = 0.16; armL = 0.7 + Math.sin(t * 22) * 0.35; armR = 0.7 + Math.sin(t * 19 + 1) * 0.35; armFwdR = 0.6; lookY = -0.7; break;
            case 'doubt': rz = 0.28; lookX = 0.5; lookY = 0.45; earDrop = 0.25; armR = 1.3; break;
            case 'scared': y += 0.05 + Math.max(0, 1 - at * 3) * 0.08; rx = -0.2; sx = sy = 1 + Math.sin(t * 40) * 0.03; eyeScale = 1.2; earUp = 0.6; armL = armR = 1.8; mouthMode = 'o'; happyEyes = false; break;
            case 'sad': y -= 0.06; rx = 0.25; earDrop = 1.1; lookY = -0.8; lidTilt = 0.45; lidDown = 0.3; mouthMode = 'frown'; happyEyes = false; break;
            case 'ashamed': y -= 0.02; rx = 0.12; rz = -0.1; ry = 0.3 + Math.sin(t * 1.6) * 0.05; lookX = -0.7; lookY = -0.6; earBack = 0.9; blushK = 1; lidDown = 0.18; armL = armR = 0.35; armIn = 0.9 + Math.sin(t * 5) * 0.12; happyEyes = false; mouthMode = 'wavy'; break;
            case 'sleep': y = -0.04 + Math.sin(t * 1.2) * 0.015; eyeOpen = 0.06; earDrop = 0.6; rx = 0.14; happyEyes = false; break;
            case 'celebrate': y += Math.abs(Math.sin(at * 8)) * 0.14; ry = Math.sin(at * 4) * 0.5; armL = armR = 2.6 + Math.sin(t * 16) * 0.3; earUp = 0.6; happyEyes = true; mouthMode = 'smile'; blushK = 0.7; break;
            case 'enter': { const k = Math.min(1, at / 1.1); sx = sy = M.ease.back(k); ry = (1 - k) * 6; armL = armR = 1.5 * k; happyEyes = k > 0.7; break; }
            case 'teach': armR = 1.7 + Math.sin(t * 3) * 0.2; rz = Math.sin(t * 1.5) * 0.06; break;
            case 'listen': earUp = 0.7; lookX = 0.4; rz = -0.1; break;
            case 'wave': armR = 2.7 + Math.sin(t * 12) * 0.45; happyEyes = happyEyes || true; mouthMode = 'smile'; break;
            case 'point': armR = 1.6; armFwdR = 0.8; ry = 0.3; lookX = -0.4; break;
            case 'think': armR = 1.2; lookX = 0.6; lookY = 0.75; rz = 0.08; break;
            default: break;
          }
          if (a.talking) { armR = Math.max(armR, 0.45 + Math.sin(t * 7) * 0.4); mouthMode = 'talk'; }
          if (eyeOpen < 0.5 || mouthMode === 'o') happyEyes = happyEyes && false;
          body.position.y = y + (a._jy || 0);
          body.rotation.set(rx, ry, rz);
          body.scale.set(sx, sy, sx);
          ears.forEach((e) => { e.g.rotation.z = e.sx * (earDrop * 0.9 + earBack * 0.5 - earUp * 0.35) + Math.sin(t * 3 + e.sx) * 0.05; e.g.rotation.x = earDrop * 0.35 - earBack * 0.75 - earUp * 0.2; });
          // armIn: bracinhos juntos na frente (mexendo os "dedinhos" de vergonha)
          arms[0].g.rotation.set(-armFwdR - armIn * 0.9, -armIn * 0.5, -armR * 0.85 + armIn * 0.35);
          arms[1].g.rotation.set(-armIn * 0.9, armIn * 0.5, armL * 0.85 - armIn * 0.35);
          legs.forEach((l, i) => { l.rotation.x = anim === 'walk' ? Math.sin(a.walkT * 9 + i * Math.PI) * 0.5 : Math.sin(t * 2.4 + i) * 0.08; });
          // olhos
          const want = a.blink ? 0.08 : eyeOpen;
          blinkK += (want - blinkK) * (a.blink ? 1 : Math.min(1, dt * 14));
          eyes.forEach((e) => {
            e.ball.visible = !happyEyes;
            e.happy.visible = happyEyes;
            e.ball.scale.set(eyeScale, Math.max(0.06, blinkK) * eyeScale, 1);
            const lx = (lookX + (a.look ? a.look[0] : 0)) * 0.012, ly = (lookY + (a.look ? a.look[1] : 0)) * 0.012;
            e.ball.position.set(lx, ly, 0);
            e.h1.position.x = -0.014 - lx * 0.3; e.h2.position.x = 0.016 - lx * 0.3;
            e.lidG.visible = !happyEyes && lidDown > 0;
            if (e.lidG.visible) { e.lidG.position.y = 0.06 - lidDown * 0.07; e.lidG.rotation.z = -e.sx * lidTilt; } // espelhado: triste = cantos de fora caem; bravo = cantos de dentro
          });
          // boca
          mouthG.visible = mouthMode === 'talk' || mouthMode === 'o';
          if (mouthMode === 'talk') { const o2 = 0.35 + Math.abs(Math.sin(t * 15)) * 0.9; mouth.scale.set(0.024, 0.016 * o2, 0.008); tongue.visible = o2 > 0.7; }
          else if (mouthMode === 'o') { mouth.scale.set(0.014, 0.017, 0.008); tongue.visible = false; }
          smile.visible = mouthMode === 'smile';
          frown.visible = mouthMode === 'frown';
          wavy.visible = mouthMode === 'wavy';
          blush.forEach((b) => (b.material.opacity = blushK * (pinkM.userData.op == null ? 1 : pinkM.userData.op)));
          // acessórios
          prof.visible = anim === 'teach';
          pointer.visible = anim === 'teach';
          kb.visible = anim === 'type';
          if (kb.visible) keys.forEach((k, i) => (k.position.y = 0.008 + Math.floor(i / 5) * 0.01 - (Math.sin(t * 23 + i * 1.7) > 0.6 ? 0.005 : 0)));
          bits.forEach((b, i) => {
            b.visible = anim === 'type';
            if (b.visible) { const k = (t * 0.9 + i / 6) % 1; b.position.set(Math.sin(i * 2.3) * 0.12, 0.2 + k * 0.25, Math.cos(i * 1.7) * 0.06); b.material.opacity = 0.9 * (1 - k); }
          });
          waves.forEach((w) => {
            w.m.visible = anim === 'listen';
            if (w.m.visible) { const k = (t * 0.9 + w.k / 3) % 1; w.m.scale.setScalar(0.6 + k * 1.1); w.m.material.opacity = 0.85 * (1 - k); w.m.position.x = w.sx * (0.2 + k * 0.08); }
          });
          zz.visible = anim === 'sleep';
          if (zz.visible) { const k = (t * 0.35) % 1; zz.position.set(0.16 + k * 0.06, 0.28 + k * 0.18, 0); zz.material.opacity = 1 - k * 0.8; }
          qm.visible = anim === 'doubt' || (a.expr === 'confuso');
          if (qm.visible) qm.position.set(0.17, 0.3 + Math.sin(t * 3) * 0.015, 0);
          ex.visible = anim === 'scared';
          if (ex.visible) ex.position.set(0.17, 0.3 + Math.abs(Math.sin(t * 9)) * 0.03, 0);
          sweat.visible = anim === 'ashamed' || a.expr === 'sem_graca' || a.expr === 'preocupado';
          if (sweat.visible) sweat.position.y = 0.09 - ((t * 0.05) % 0.04);
          think.forEach((m, i) => { m.visible = anim === 'think'; if (m.visible) { m.position.set(0.12 + i * 0.05, 0.22 + i * 0.07 + Math.sin(t * 2 + i) * 0.01, 0); } });
          confetti.forEach((c, i) => {
            c.visible = anim === 'celebrate';
            if (!c.visible) return;
            const k = ((at * 0.55 + i / confetti.length) % 1);
            const ang = i * 2.39 + at * 0.8;
            c.position.set(Math.cos(ang) * (0.15 + k * 0.25), 0.45 - k * 0.75, Math.sin(ang) * (0.1 + k * 0.2));
            c.rotation.set(at * 6 + i, at * 4 + i * 2, i);
            c.material.opacity = k < 0.85 ? 1 : (1 - k) / 0.15;
          });
          burst.forEach((b, i) => {
            b.visible = anim === 'enter' && at < 1.4;
            if (!b.visible) return;
            const k = Math.min(1, at / 1.1);
            const ang = (i / burst.length) * Math.PI * 2 + at;
            b.position.set(Math.cos(ang) * k * 0.35, Math.sin(ang) * k * 0.35, 0.05);
            b.material.opacity = (1 - k) * 1.1;
          });
          flash.material.opacity = anim === 'enter' ? Math.max(0, 0.9 - at * 1.4) : 0;
          flash.scale.setScalar(0.4 + Math.min(1, at) * 0.8);
          // brilho da faísca
          glow.material.opacity = (0.45 + Math.sin(t * 5) * 0.2) * (a.alpha == null ? 1 : a.alpha);
          sparkG.rotation.z = Math.sin(t * 2) * 0.3;
          sparkG.rotation.y = t * 1.5;
          hover.material.opacity = (0.16 + Math.sin(t * 2.4) * 0.05) * (a.alpha == null ? 1 : a.alpha);
          // opacidade geral
          const op = a.alpha == null ? 1 : a.alpha;
          mats.forEach((m) => {
            const bo = m.userData.baseOpacity == null ? 1 : m.userData.baseOpacity;
            if (m === pinkM) { pinkM.userData.op = op; return; }
            if (m.isSpriteMaterial || waveM.indexOf(m) >= 0 || m === kbMat || m === keyMat) { if (op < 1) m.opacity = Math.min(m.opacity, op); return; }
            const tr = op < 1 || !!m.userData.baseTransparent;
            if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
            m.opacity = bo * op;
            m.depthWrite = op >= 1 && !m.userData.baseTransparent;
          });
        },
        dispose() { M.dispose(root); },
      };
      return ctl;
    },
  };

  // ------------------------------------------------------------------
  // A DÚVIDA — nuvem roxa gigante feita das preocupações do pai.
  // Imponente e um pouco ameaçadora (sem ser assustadora): nuvem que respira,
  // contorno luminoso, olhos acesos, boca serrilhada e palavras orbitando.
  // ------------------------------------------------------------------
  /**
   * Nuvem "fofa" de verdade: união suave (metaball) das bolhas → uma superfície
   * só, com dobras macias. Malha esférica projetada a partir do centro.
   * colorFn(x, y, z, nx, ny, nz, crease, puff) → Color.
   */
  const blobCache = {};
  function blobCloud(list, ctr, k, ws, hs, colorFn, cacheKey) {
    // cache: a nuvem é determinística → reconstruir a Dúvida (troca de cena) não recalcula a malha
    if (cacheKey && blobCache[cacheKey]) return blobCache[cacheKey];
    const g = new T.SphereGeometry(1, ws, hs);
    const P = g.attributes.position;
    const n = P.count, L = list.length;
    const ik = 1 / k;
    const field = (x, y, z) => {
      let sum = 0;
      for (let i = 0; i < L; i++) { const p = list[i], dx = x - p.x, dy = y - p.y, dz = z - p.z; sum += Math.exp((p.r - Math.sqrt(dx * dx + dy * dy + dz * dz)) * ik); } // sqrt: Math.hypot é ~10× mais lento
      return -k * Math.log(sum);
    };
    let tMax = 0;
    list.forEach((p) => (tMax = Math.max(tMax, Math.hypot(p.x - ctr[0], p.y - ctr[1], p.z - ctr[2]) + p.r)));
    tMax += 0.25;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), ph = new Float32Array(n);
    const dir = new T.Vector3();
    const step = tMax / 46, marg = k * (Math.log(L) + 0.6); // além disso a união suave já é > 0 (fora)
    for (let i = 0; i < n; i++) {
      dir.fromBufferAttribute(P, i).normalize();
      // começa logo depois da bolha mais distante que o raio atravessa (em vez de marchar de longe)
      let t0 = 0;
      for (let j = 0; j < L; j++) {
        const p = list[j], ox = p.x - ctr[0], oy = p.y - ctr[1], oz = p.z - ctr[2];
        const b = ox * dir.x + oy * dir.y + oz * dir.z, c = ox * ox + oy * oy + oz * oz - (p.r + marg) * (p.r + marg);
        const disc = b * b - c;
        if (disc >= 0) t0 = Math.max(t0, b + Math.sqrt(disc));
      }
      let t = Math.min(tMax, t0 > 0 ? t0 + step : tMax), prev = t;
      while (t > 0 && field(ctr[0] + dir.x * t, ctr[1] + dir.y * t, ctr[2] + dir.z * t) > 0) { prev = t; t -= step; }
      let lo = Math.max(0, t), hi = prev;
      for (let it = 0; it < 9; it++) { const m = (lo + hi) / 2; if (field(ctr[0] + dir.x * m, ctr[1] + dir.y * m, ctr[2] + dir.z * m) > 0) hi = m; else lo = m; }
      const tt = (lo + hi) / 2;
      const x = ctr[0] + dir.x * tt, y = ctr[1] + dir.y * tt, z = ctr[2] + dir.z * tt;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      // normal analítica (gradiente da união suave) + bolha mais próxima, numa passada só
      let gx = 0, gy = 0, gz = 0, ws2 = 0, mn = 1e9, mi = 0;
      for (let j = 0; j < L; j++) {
        const p = list[j], dx = x - p.x, dy = y - p.y, dz = z - p.z, dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, d = dl - p.r;
        const w = Math.exp(-d / k); ws2 += w; gx += (w * dx) / dl; gy += (w * dy) / dl; gz += (w * dz) / dl;
        if (d < mn) { mn = d; mi = j; }
      }
      const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
      void ws2;
      nor[i * 3] = gx; nor[i * 3 + 1] = gy; nor[i * 3 + 2] = gz;
      // dobra: perto de duas bolhas ao mesmo tempo (fora de todas por um tiquinho)
      const c = colorFn(x, y, z, gx, gy, gz, smooth(0.0, k * 0.7, mn), list[mi]);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      ph[i] = mi * 1.37;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setAttribute('phase', new T.BufferAttribute(ph, 1));
    geo.setIndex(g.index);
    geo.computeBoundingSphere();
    g.dispose();
    if (cacheKey) blobCache[cacheKey] = geo;
    return geo;
  }
  function puffCloud(list, colorFn, segs) {
    // junta várias esferas numa geometria só, com fase por esfera (para ondular no shader)
    const pos = [], nor = [], col = [], ph = [], idx = [];
    let base = 0;
    list.forEach((p, k) => {
      const g = new T.SphereGeometry(p.r, segs || 18, Math.max(8, Math.round((segs || 18) * 0.66)));
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i) + p.x, y = P.getY(i) + p.y, z = P.getZ(i) + p.z;
        pos.push(x, y, z); nor.push(N.getX(i), N.getY(i), N.getZ(i));
        const c = colorFn(x, y, z, N.getY(i), p, N.getX(i), N.getZ(i)); col.push(c.r, c.g, c.b);
        ph.push(p.ph == null ? k * 1.37 : p.ph);
      }
      const ix = g.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(base + ix[i]);
      base += P.count;
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.setAttribute('phase', new T.Float32BufferAttribute(ph, 1));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }
  function cloudMaterial(rimColor, rimK) {
    const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, emissive: new T.Color('#000000') });
    const U = { uTime: { value: 0 }, uAmp: { value: 0.035 }, uRim: { value: new T.Color(rimColor) }, uRimK: { value: rimK == null ? 0.9 : rimK }, uFlash: { value: 0 } };
    m.userData.U = U;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'uniform float uTime;\nuniform float uAmp;\nattribute float phase;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normal * (sin(uTime * 1.6 + phase) * 0.6 + sin(uTime * 2.7 + phase * 1.7) * 0.4) * uAmp;');
      sh.fragmentShader = 'uniform vec3 uRim;\nuniform float uRimK;\nuniform float uFlash;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2); totalEmissiveRadiance += uRim * fr * uRimK + vec3(uFlash); }');
    };
    m.customProgramCacheKey = () => 'p2cloud';
    return m;
  }
  C.duvida = {
    name: 'A Dúvida',
    build() {
      const root = new T.Group();
      const big = M.group({ parent: root, name: 'duvidaBig' });
      const mats = [];
      const rr = M.rng(31);
      const cTop = new T.Color('#9a6ae0'), cMid = new T.Color('#6a3fb0'), cBot = new T.Color('#2e1858'), cCore = new T.Color('#4a2890');
      // nuvem principal (corpo) + cauda que afina até perto do chão
      const puffs = [];
      // cúmulo com hierarquia de tamanhos (massa central, coroa de bolhas grandes,
      // bolhas médias no contorno, bolhinhas quebrando a silhueta) + cauda em redemoinho
      puffs.push({ x: 0, y: 2.0, z: 0, r: 1.0 });
      [[-0.98, 2.42, -0.12, 0.62], [-0.42, 2.86, -0.16, 0.6], [0.26, 2.98, -0.2, 0.66], [0.9, 2.62, -0.1, 0.6], [1.32, 2.12, -0.16, 0.52], [-1.38, 2.0, -0.12, 0.5],
        [-1.16, 1.58, 0.02, 0.44], [1.18, 1.6, 0.0, 0.46], [-0.62, 1.24, 0.12, 0.44], [0.58, 1.22, 0.1, 0.46], [0.0, 1.12, 0.14, 0.42],
        [-0.5, 2.3, -0.58, 0.62], [0.52, 2.2, -0.62, 0.64], [0.0, 2.72, -0.52, 0.52], [-0.82, 1.82, 0.52, 0.38], [0.82, 1.84, 0.5, 0.38]].forEach(([x, y, z, r]) => puffs.push({ x, y, z, r }));
      // contorno: menos bolhas e maiores (cúmulo de tempestade, não "couve-flor")
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2 + 0.2 + (rr() - 0.5) * 0.25;
        const rad = 1.36 + rr() * 0.14;
        const yk = Math.sin(a) > 0 ? 0.95 : 0.7;
        puffs.push({ x: Math.cos(a) * rad * 1.08, y: 2.04 + Math.sin(a) * rad * yk, z: (rr() - 0.5) * 0.45 - 0.05, r: 0.24 + rr() * 0.12 });
      }
      for (let i = 0; i < 7; i++) { const k = i / 6; puffs.push({ x: Math.sin(k * 3.4 + 0.3) * 0.34 * (1 - k * 0.45), y: 1.02 - k * 0.78, z: -0.04 + Math.cos(k * 3.4) * 0.14, r: 0.34 * (1 - k * 0.72) }); }
      const geo = blobCloud(puffs, [0, 2.05, 0], 0.07, 104, 72, (x, y, z, nx, ny, nz, crease) => {
        const c = cMid.clone();
        if (y > 2.0) c.lerp(cTop, smooth(2.0, 3.1, y) * 0.85); else c.lerp(cBot, smooth(2.0, 0.5, y) * 0.9);
        if (ny < -0.3) c.lerp(cBot, 0.3 * smooth(-0.3, -0.9, ny));
        c.lerp(cBot, crease * 0.55); // dobras escuras entre as bolhas
        c.lerp(cTop, 0.25 * smooth(0.4, 0.95, ny) * (1 - crease)); // topo das bolhas iluminado
        return c;
      }, 'duvidaBig');
      const cloudM = cloudMaterial('#c890ff', 0.85);
      mats.push(cloudM);
      const cloud = new T.Mesh(geo, cloudM); cloud.castShadow = true; cloud.receiveShadow = true; big.add(cloud);
      // nuvenzinhas satélites orbitando devagar (escala e ameaça; viram "pedaços" ao ser derrotada)
      const satGeo = blobCloud([{ x: 0, y: 0, z: 0, r: 0.2 }, { x: -0.19, y: -0.05, z: 0.02, r: 0.14 }, { x: 0.2, y: -0.04, z: -0.02, r: 0.15 }, { x: 0.05, y: 0.13, z: -0.03, r: 0.13 }], [0, 0, 0], 0.03, 40, 28, (x, y, z, nx, ny, nz, crease) => cMid.clone().lerp(cTop, 0.35 * Math.max(0, ny)).lerp(cBot, 0.35 * Math.max(0, -ny) + crease * 0.4), 'duvidaSat');
      const sats = [0, 1, 2, 3].map((i) => { const m = new T.Mesh(satGeo, cloudM); m.castShadow = true; big.add(m); return { m, ph: i * 1.7 + 0.4, r: 2.35 + (i % 2) * 0.4, h: [1.05, 3.0, 0.8, 3.35][i], s: [1.25, 0.85, 1.0, 0.7][i] }; });
      // brilho interno e relâmpagos dentro da nuvem
      const inner = M.glow('#8a4aff', 3.2, 0.35); inner.position.set(0, 2.0, 0.2); big.add(inner); mats.push(inner.material);
      const zap = M.glow('#fff3c0', 1.6, 0); zap.position.set(0.6, 2.4, 0.4); big.add(zap); mats.push(zap.material);
      // rosto
      const faceG = M.group({ parent: big, pos: [0, 2.02, 0.98] });
      const eyeW = new T.MeshStandardMaterial({ color: '#fff7d6', emissive: '#ffe9a0', emissiveIntensity: 0.55, roughness: 0.3 });
      const pupilM = new T.MeshStandardMaterial({ color: '#1a0c2c', roughness: 0.2 });
      const browM = new T.MeshStandardMaterial({ color: '#24103f', roughness: 0.7 });
      const mouthM = new T.MeshStandardMaterial({ color: '#160820', roughness: 0.6 });
      const toothM = new T.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.35 });
      const lidM = new T.MeshStandardMaterial({ color: '#6a3fb0', roughness: 0.9 });
      mats.push(eyeW, pupilM, browM, mouthM, toothM, lidM);
      const eyes = [];
      [-1, 1].forEach((sx) => {
        const g = M.group({ parent: faceG, pos: [sx * 0.36, 0.12, 0] });
        const w = new T.Mesh(M.sphereGeo(1, 24, 16), eyeW); w.scale.set(0.2, 0.22, 0.09); g.add(w);
        const pu = new T.Mesh(M.sphereGeo(1, 16, 12), pupilM); pu.scale.set(0.085, 0.1, 0.04); pu.position.set(0, -0.02, 0.07); g.add(pu);
        const hl = new T.Mesh(M.sphereGeo(1, 10, 8), new T.MeshBasicMaterial({ color: '#ffffff' })); hl.scale.set(0.025, 0.028, 0.01); hl.position.set(-0.03, 0.035, 0.035); pu.add(hl); hl.scale.set(0.3, 0.3, 0.3); mats.push(hl.material);
        // pálpebra (meia esfera) que corta o olho na diagonal → cara de bravo
        const lidG = M.group({ parent: g, pos: [0, 0, 0.01] });
        const lid = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidM); lid.scale.set(0.225, 0.25, 0.11); lidG.add(lid);
        const brow = new T.Mesh(M.capsuleGeo(0.05, 0.3, 6, 12), browM); brow.position.set(sx * 0.0, 0.3, 0.08); brow.rotation.z = Math.PI / 2; g.add(brow);
        eyes.push({ g, pu, lidG, brow, sx });
      });
      const mouthG = M.group({ parent: faceG, pos: [0, -0.34, 0.02] });
      const mouthShape = new T.Shape();
      mouthShape.moveTo(-0.42, 0.06); mouthShape.quadraticCurveTo(0, -0.05, 0.42, 0.06); mouthShape.quadraticCurveTo(0.2, -0.3, 0, -0.32); mouthShape.quadraticCurveTo(-0.2, -0.3, -0.42, 0.06);
      const mouthMesh = new T.Mesh(new T.ExtrudeGeometry(mouthShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }), mouthM);
      mouthG.add(mouthMesh);
      const teeth = [];
      for (let i = 0; i < 7; i++) { const x = -0.3 + i * 0.1; const th = new T.Mesh(M.coneGeo(0.042, 0.1, 4), toothM); th.position.set(x, 0.02 - Math.abs(x) * 0.05 - 0.04 + 0.012 * (1 - Math.abs(x) / 0.4), 0.08); th.rotation.set(Math.PI, 0, 0); mouthG.add(th); teeth.push(th); }
      for (let i = 0; i < 4; i++) { const x = -0.18 + i * 0.12; const th = new T.Mesh(M.coneGeo(0.035, 0.08, 4), toothM); th.position.set(x, -0.25 + Math.abs(x) * 0.3, 0.08); mouthG.add(th); teeth.push(th); }
      // palavras de preocupação orbitando (legíveis: contorno escuro + brilho)
      const WORDS = ['E SE?', 'CARO?', 'VAZOU?', 'VELHO?', 'MENTIRA?', 'MODINHA?', 'EMPREGO?', 'CONTROLE?'];
      const words = WORDS.map((w, i) => {
        const sp = textSprite(w, { color: '#fbf6ff', stroke: '#2a1450', strokeW: 16, size: 84, w: 512, h: 128, glow: '#c08cff', blur: 26, weight: '900' });
        sp.scale.set(1.3, 0.325, 1);
        big.add(sp);
        mats.push(sp.material);
        return { m: sp, ph: (i / WORDS.length) * Math.PI * 2, tilt: (i % 3) * 0.35 - 0.35 };
      });
      // raios (fitas luminosas)
      // raio = núcleo branco quente + halo aditivo amarelo-lilás (lê como eletricidade, não como fita)
      const boltMat = new T.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 1, depthWrite: false, toneMapped: false, side: T.DoubleSide });
      const boltGlowMat = new T.MeshBasicMaterial({ color: '#ffd23a', transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false, side: T.DoubleSide, blending: T.AdditiveBlending });
      mats.push(boltMat, boltGlowMat);
      const ribbon = (N, mat) => {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 2 * 3), 3));
        const ix = []; for (let i = 0; i < N - 1; i++) ix.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        g.setIndex(ix);
        const m = new T.Mesh(g, mat); m.frustumCulled = false; m.visible = false; m.renderOrder = 3; root.add(m);
        return m;
      };
      const bolts = [];
      for (let b = 0; b < 3; b++) {
        const N = 11;
        const line = ribbon(N, boltMat), halo = ribbon(N, boltGlowMat), fork = ribbon(5, boltMat);
        const gl = M.glow('#ffe066', 0.9, 0.9); gl.visible = false; root.add(gl); mats.push(gl.material);
        bolts.push({ line, halo, fork, N, gl });
      }
      // versão pequena: a "dúvida saudável" (fofa)
      const small = M.group({ parent: root, name: 'duvidaSmall' });
      const smallGeo = blobCloud([{ x: 0, y: 0, z: 0, r: 0.12 }, { x: -0.11, y: -0.025, z: 0, r: 0.088 }, { x: 0.11, y: -0.025, z: 0, r: 0.088 }, { x: 0.035, y: 0.075, z: -0.02, r: 0.09 }, { x: -0.055, y: 0.06, z: 0.0, r: 0.075 }, { x: 0, y: -0.06, z: 0.02, r: 0.085 }], [0, 0, 0], 0.012, 48, 32, (x, y, z, nx, ny, nz, crease) => new T.Color('#c9b3f2').lerp(new T.Color('#f2eaff'), smooth(-0.05, 0.15, y) * 0.65).lerp(new T.Color('#a58ad8'), crease * 0.4), 'duvidaSmall');
      const smallM = cloudMaterial('#ffffff', 0.45);
      smallM.userData.U.uAmp.value = 0.006;
      mats.push(smallM);
      const sm = new T.Mesh(smallGeo, smallM); sm.castShadow = true; small.add(sm);
      const sEye = new T.MeshStandardMaterial({ color: '#2a1a4a', roughness: 0.15 });
      const sWhite = new T.MeshBasicMaterial({ color: '#ffffff' });
      const sPink = new T.MeshBasicMaterial({ color: '#ff8fb0', transparent: true, opacity: 0.6, depthWrite: false });
      const sMouth = new T.MeshStandardMaterial({ color: '#5a2a5a', roughness: 0.5 });
      mats.push(sEye, sWhite, sPink, sMouth);
      const sEyes = [];
      [-1, 1].forEach((sx) => {
        const e = new T.Mesh(M.sphereGeo(1, 16, 12), sEye); e.scale.set(0.02, 0.026, 0.01); e.position.set(sx * 0.045, 0.012, 0.118); small.add(e);
        const h = new T.Mesh(M.sphereGeo(1, 8, 6), sWhite); h.scale.set(0.007, 0.008, 0.004); h.position.set(sx * 0.045 - 0.006, 0.022, 0.127); small.add(h);
        const b = new T.Mesh(M.sphereGeo(1, 10, 8), sPink); b.scale.set(0.018, 0.01, 0.004); b.position.set(sx * 0.085, -0.02, 0.105); small.add(b);
        sEyes.push(e);
      });
      const sSmile = new T.Mesh(M.torusGeo(0.02, 0.005, 8, 18, Math.PI), sMouth); sSmile.rotation.z = Math.PI; sSmile.position.set(0, -0.018, 0.122); small.add(sSmile);
      const q = textSprite('?', { color: '#ffffff', stroke: '#7a5ab0', strokeW: 16, size: 110, w: 128, h: 128 });
      q.scale.set(0.11, 0.11, 1); q.position.set(0, 0.2, 0); small.add(q); mats.push(q.material);
      small.visible = false;
      mats.forEach((m) => { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; });

      let flashK = 0, lastAnim = '';
      const tmpV = new T.Vector3();
      const ctl = {
        root, kind: 'boss', height: 3, headY: 2.1, mats, small,
        update(dt, a) {
          const t = a.t, at = a.animT || 0, anim = a.anim;
          const isSmall = anim === 'small';
          big.visible = !isSmall;
          small.visible = isSmall;
          const op = a.alpha == null ? 1 : a.alpha;
          mats.forEach((m) => { const bo = m.userData.baseOpacity == null ? 1 : m.userData.baseOpacity; const tr = op < 1 || !!m.userData.baseTransparent; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = bo * op; if (!m.userData.baseTransparent) m.depthWrite = op >= 1; });
          if (isSmall) {
            small.position.y = 1.35 + Math.sin(t * 2) * 0.04;
            small.rotation.z = Math.sin(t * 1.3) * 0.08;
            small.rotation.y = Math.sin(t * 0.7) * 0.25;
            smallM.userData.U.uTime.value = t;
            sEyes.forEach((e) => (e.scale.y = a.blink ? 0.003 : 0.026));
            q.position.y = 0.2 + Math.sin(t * 3) * 0.015;
            return;
          }
          if (anim !== lastAnim) { lastAnim = anim; if (anim === 'hurt') flashK = 1; }
          let lunge = 0, recoil = 0, droop = 0, swell = 1;
          if (anim === 'attack') lunge = Math.sin(Math.min(1, at / 0.6) * Math.PI) * 0.8;
          if (anim === 'hurt') recoil = Math.sin(Math.min(1, at / 0.5) * Math.PI) * 0.5;
          if (anim === 'defeated') droop = Math.min(1, at / 1.5);
          if (anim === 'heal') swell = 1.08 + Math.sin(t * 6) * 0.02;
          const breath = 1 + Math.sin(t * 1.2) * 0.025;
          big.position.z = lunge - recoil;
          big.position.y = Math.sin(t * 1.1) * 0.08 - droop * 0.5;
          big.rotation.z = Math.sin(t * 0.7) * 0.04 + recoil * 0.2;
          big.scale.set(breath * swell * (1 - droop * 0.35), (2 - breath) * swell * (1 - droop * 0.4), swell * (1 - droop * 0.3));
          const U = cloudM.userData.U;
          U.uTime.value = t;
          U.uAmp.value = anim === 'attack' ? 0.08 : 0.04;
          flashK = Math.max(0, flashK - dt * 2.5);
          const heal = anim === 'heal' ? 0.5 + Math.sin(t * 8) * 0.3 : 0;
          U.uFlash.value = flashK * 0.9;
          U.uRim.value.setRGB(0.78 + heal * 0.2, 0.56 + heal * 0.3, 1.0);
          U.uRimK.value = 0.85 + heal * 0.8 + (anim === 'attack' ? 0.4 : 0);
          inner.material.opacity = (0.3 + 0.12 * Math.sin(t * 2.3) + heal * 0.3) * op;
          // relâmpago interno ocasional
          const zt = (t * 0.7) % 3.1;
          zap.material.opacity = (zt < 0.12 || (zt > 0.2 && zt < 0.27) ? 0.75 : 0) * op * (1 - droop);
          zap.position.set(Math.sin(Math.floor(t * 0.7 / 3.1) * 2.1) * 0.8, 2.3, 0.3);
          // rosto
          const ex = a.expr || 'bravo';
          const angry = ex === 'bravo' || anim === 'attack';
          const laugh = ex === 'rindo';
          const friendly = ex === 'amigavel';
          const surprised = ex === 'surpreso' || anim === 'hurt';
          eyes.forEach((e) => {
            e.lidG.visible = !surprised && !friendly;
            e.lidG.rotation.z = e.sx * (angry ? 0.42 : laugh ? -0.1 : friendly ? -0.35 : 0.22);
            e.lidG.position.y = angry ? 0.07 : laugh ? 0.0 : friendly ? 0.12 : 0.09;
            e.brow.rotation.z = Math.PI / 2 - e.sx * (angry ? 0.45 : friendly ? -0.25 : laugh ? 0.1 : 0.25);
            e.brow.position.y = angry ? 0.24 : surprised || friendly ? 0.38 : 0.3;
            e.g.scale.y = a.blink ? 0.12 : laugh ? 0.5 : surprised ? 1.2 : 1;
            e.pu.position.x = Math.sin(t * 0.8) * 0.035 + (a.look ? a.look[0] * 0.04 : 0);
            e.pu.scale.set(surprised ? 0.06 : 0.085, surprised ? 0.07 : 0.1, 0.04);
          });
          const open = a.talking ? 0.45 + Math.abs(Math.sin(t * 9)) * 0.75 : laugh ? 1.15 : anim === 'attack' ? 1.3 : surprised ? 0.9 : friendly ? 0.35 : 0.55;
          mouthG.scale.set(friendly ? 0.7 : 1, friendly ? 0.55 : open, 1);
          mouthG.rotation.z = 0;
          mouthG.position.y = friendly ? -0.3 : -0.34;
          teeth.forEach((th) => (th.visible = !friendly));
          sats.forEach((sv, i) => {
            const ang = sv.ph - t * (0.16 + i * 0.03);
            sv.m.position.set(Math.cos(ang) * sv.r * 1.15, sv.h + Math.sin(t * 0.9 + i) * 0.12 - droop * (0.8 + i * 0.25), Math.sin(ang) * sv.r * 0.55 - 0.35);
            sv.m.scale.setScalar(sv.s * (1 - droop * 0.5) * (anim === 'heal' ? 1.15 : 1));
            sv.m.rotation.y = -ang;
          });
          // palavras orbitando
          words.forEach((w, i) => {
            // órbita inclinada: dos lados na altura do rosto, pela frente passa ACIMA da cabeça (nunca cobre o rosto)
            const ang = w.ph + t * 0.28;
            const rad = 2.15 + Math.sin(t * 0.7 + i) * 0.1 + (i % 2) * 0.22;
            const fz = Math.sin(ang);
            w.m.position.set(Math.cos(ang) * rad, 2.15 + fz * 0.85 + w.tilt * 0.4 - droop * (1 + i * 0.3), fz * rad * 0.7 + 0.2);
            w.m.material.opacity = (1 - droop) * op;
            const s = 1 + Math.sin(t * 2 + i) * 0.04;
            w.m.scale.set(1.3 * s, 0.325 * s, 1);
          });
          // raios no ataque
          bolts.forEach((b, i) => {
            const on = anim === 'attack' && at < 0.95 && Math.sin(t * 38 + i * 2) > -0.3;
            b.line.visible = b.halo.visible = b.fork.visible = b.gl.visible = on;
            if (!on) return;
            const pos = b.line.geometry.attributes.position, hp = b.halo.geometry.attributes.position, fp = b.fork.geometry.attributes.position;
            let x = (i - 1) * 0.7, y = 1.5, z = 1.0 + lunge;
            const seed = Math.floor(t * 14) + i * 7; // muda o desenho do raio ~14×/s (cintila)
            let fx = 0, fy = 0, fz = 0;
            for (let k = 0; k < b.N; k++) {
              const w = 0.026 * (1 - k / b.N) + 0.008;
              pos.setXYZ(k * 2, x - w, y, z); pos.setXYZ(k * 2 + 1, x + w, y, z);
              hp.setXYZ(k * 2, x - w * 5, y, z); hp.setXYZ(k * 2 + 1, x + w * 5, y, z);
              if (k === 4) { fx = x; fy = y; fz = z; }
              x += Math.sin(seed * 1.7 + k * 3.1 + i * 7) * 0.2;
              y -= 0.16; z += 0.26;
            }
            // galhinho que sai do meio do raio
            for (let k = 0; k < 5; k++) { const w = 0.012 * (1 - k / 5) + 0.004; fp.setXYZ(k * 2, fx - w, fy, fz); fp.setXYZ(k * 2 + 1, fx + w, fy, fz); fx += (i - 1 || 1) * 0.11 + Math.sin(seed + k * 2.3) * 0.06; fy -= 0.1; fz += 0.12; }
            pos.needsUpdate = hp.needsUpdate = fp.needsUpdate = true;
            b.gl.position.set(x, y + 0.16, z - 0.26);
          });
          // clarão na nuvem durante o ataque (sincronizado com os raios)
          if (anim === 'attack' && at < 0.95) U.uFlash.value = Math.max(U.uFlash.value, Math.sin(t * 38) > 0.6 ? 0.18 : 0.04);
        },
        dispose() { M.dispose(root); },
      };
      void tmpV;
      return ctl;
    },
  };
})();

/* PAI 2.0 — env-casa.js
 * Ambientes 3D da casa do CEO (dioramas com paredes e forro que somem para a câmera girar 360°,
 * e que também funcionam em PRIMEIRA PESSOA: forro com spots, colliders, bounds e ponto 'inicio'):
 *   quarto · cozinha · sala · mesa_cafe
 *
 * Convenções: metros, Y para cima, chão em y = 0, rot 0 = olhando para +Z (rot = atan2(dx, dz)).
 * Spots abaixo no formato {x, z, rot[, y]}. Assentos: o ponto é o centro do assento (~0,45 m);
 * a mesa fica ~0,5 m à frente (+Z local do ator). Pontos de sentar/deitar podem ficar dentro de um
 * collider (o jogador chega perto — raio do hotspot 1,6 m — e a cena o coloca no lugar com .at()).
 * walls: 'wall:back' | 'wall:left' | 'wall:right' | 'wall:front' | 'ceiling' (normal [0,-1,0], py = forro).
 * bounds = piso interno inteiro de cada cômodo (quarto ±2,6 × ±2,2 · cozinha ±2,8 × ±2,3 · sala ±3,0 × ±2,4 ·
 * mesa_cafe x −2,94…2,96, z −2,3…2,26). A vista lá fora (céu + cidade 3D) só aparece com a câmera dentro.
 * Primeiro plano: a cômoda (quarto), o aparador (cozinha) e o rack (sala) ficam no chão junto à parede da
 * frente (primeiro plano do plano geral) e SOMEM sozinhos quando a câmera de cinema entra neles ou fica logo
 * atrás deles (planos médios/baixos como quarto 'dramatico', cozinha 'mesa', sala 'porta'); em 1ª pessoa nunca.
 *
 * ── quarto (5,2 × 4,4 m, pé-direito 2,7) ─────────────────────────────
 *  params: clock ('06:47' padrão) · alarm (bool: dígitos piscam em vermelho, luz vermelha no criado-mudo e
 *          reflexo vermelho pulsando no forro) · phoneLit (bool: celular acende, reflexo azulado no forro)
 *          lamp (bool, padrão true: abajur esquerdo) · time ('amanhecer' padrão | 'noite')
 *          coberta (true/false força o edredom "com corpo"; padrão automático: cobre quando há um ator com anim
 *          'sleep'/'lie' no ponto cama — edredom moldado medido na pose 'sleep', nada atravessa).
 *  spots:  cama        {x:-0.38, z:-0.12, rot:0}   deitado (anim 'sleep'): os PÉS ficam no ponto e a
 *                                                  cabeça vai para o travesseiro em z≈-1.62; em 1ª pessoa
 *                                                  deitado a visão olha para o ventilador de teto (pitch ~1)
 *          beira_cama  {x:-0.62, z:-0.55, rot:-π/2} sentado na beirada (anim 'sit'), virado p/ o criado-mudo
 *          banco       {x:-0.3,  z:0.3,   rot:0}    sentado na calçadeira ao pé da cama
 *          lado_cama   {x:-1.2,  z:-0.8,  rot:0.5}  em pé ao lado da cama (chinelos)
 *          janela      {x:-1.85, z:-0.35, rot:-π/2} · porta {x:2.0, z:1.35, rot:-π/2} · centro {x:0.4, z:1.2, rot:0}
 *          faisca      {x:-0.9,  z:-1.2,  rot:0.4, y:1.0} (flutuando perto do criado-mudo)
 *          inicio      {x:1.75,  z:1.25,  rot:-2.2} (entrada do jogador, olhando a cama)
 *          interação:  despertador {x:-1.2, z:-1.2, rot:π} · foto {x:1.2, z:-1.25, rot:π} (porta-retrato do
 *                      criado-mudo direito) · guarda_roupa {x:1.55, z:-0.9, rot:π/2} (porta-espelho)
 *                      tv {x:-0.2, z:1.15, rot:0} · paleto {x:-1.45, z:0.62, rot:-0.8} (paletó na poltrona)
 *          (a "foto da formatura" fica no porta-retrato sobre a cômoda, em x≈-0.3, y≈1.1, z≈1.95)
 *  shots:  geral, cama, despertador, celular, janela, porta, dramatico (baixo, rente à parede da frente)
 *  colliders: cama + pé da cama, 2 criados-mudos, guarda-roupa, cômoda, poltrona, planta, pasta, calçadeira, puff.
 *
 * ── cozinha (5,6 × 4,6 m) ──────────────────────────────────────────
 *  params: time ('manha' padrão | 'noite': pendentes acesos (cúpulas brilham), LED sob a prateleira)
 *          steam (bool, padrão true: vapor da cafeteira; à noite também da panela)
 *  spots:  mesa1 {x:0.15, z:-0.45, rot:0} · mesa3 {x:0.95, z:-0.45, rot:0} (sentados no lado do fundo,
 *          de frente p/ câmera) · mesa2 {x:1.8, z:0.5, rot:-π/2} (cabeceira direita) · mesa4 {x:-0.7, z:0.5, rot:π/2}
 *          (cabeceira esquerda; mesa2 e mesa4 ficam frente a frente, com a linha de visão livre)
 *          cafe {x:-0.9, z:-1.3, rot:2.9} (em pé na cafeteira) · geladeira {x:1.6, z:-1.1, rot:π}
 *          pia {x:-1.84, z:-0.85, rot:-π/2} · janela {x:-1.84, z:-0.85, rot:-π/2} · porta {x:2.25, z:1.35, rot:-π/2}
 *          centro {x:-0.55, z:1.45, rot:0} · faisca {x:0.55, z:0.5, rot:0, y:1.08} (sobre a mesa)
 *          inicio {x:2.2, z:1.55, rot:-1.75}
 *          interação: fogao {x:0.2, z:-1.3, rot:π} · filtro {x:2.42, z:-1.4, rot:π} · mural {x:2.2, z:-1.3, rot:π/2}
 *                     (cortiça com recados legíveis, foto e ingresso de show) · relogio {x:2.1, z:-0.55, rot:π/2}
 *                     aparador {x:1.0, z:1.55, rot:0}
 *  shots:  geral, mesa, dupla, cafe, geladeira, janela, porta
 *  colliders: bancada do fundo, bancada da pia, geladeira, filtro, mesa, aparador, planta.
 *
 * ── sala (6,0 × 4,8 m) ─────────────────────────────────────────────
 *  params: tv ('off' padrão | 'on' (futebol) | 'jornal' (golpe da voz clonada)) · alert (bool: vermelho
 *          pulsante — ligação do golpe) · lamp (bool, padrão true: abajur de chão âmbar)
 *  spots:  sofa1 {x:-0.6, z:-1.72, rot:0} · sofa2 {x:0.5, z:-1.72, rot:0} (sentados, de frente p/ a TV em +Z)
 *          poltrona {x:2.0, z:-0.85, rot:-1.2} (sentado) · tv {x:0.0, z:1.45, rot:0} (em pé, de frente p/ a TV)
 *          abajur {x:-1.75, z:-1.05, rot:0.5} · janela {x:2.3, z:0.4, rot:π/2} · porta {x:-2.4, z:1.55, rot:π/2}
 *          centro {x:0.0, z:0.55, rot:0} · faisca {x:0.0, z:-0.6, rot:0, y:0.98} (sobre a mesa de centro)
 *          inicio {x:-2.3, z:1.55, rot:2.0}
 *          interação: foto {x:-0.2, z:-1.15, rot:π} · quadro {x:0.4, z:-1.15, rot:π} (galeria sobre o sofá)
 *                     estante {x:-2.2, z:-0.45, rot:-π/2} · vitrola {x:-2.25, z:-0.25, rot:-π/2} (a vitrola fica na
 *                     prateleira alta da estante, x≈-2.8, y≈1.85) · celular {x:0.35, z:0.06, rot:π} (na mesa de centro)
 *  shots:  geral, sofa, tv, abajur, janela, porta, alerta
 *  colliders: sofá (encosto + braços; assento livre), mesa de centro, abajur, mesinha, planta, estante,
 *             rack, aparador, palmeira, poltrona.
 *
 * ── mesa_cafe (varanda 6,0 × 4,6 m; manhã dourada, cobogó, cidade) ─────
 *  params: steam (bool, padrão true: vapor da xícara do pai e da caneca do filho)
 *  spots:  pai {x:0.0, z:-0.9, rot:0} (sentado, de frente p/ câmera) · filho {x:1.15, z:0.0, rot:-π/2}
 *          (sentado na cabeceira) · faisca {x:-1.15, z:0.0, rot:π/2, y:1.0} (flutua sobre a 3ª cadeira)
 *          duvida {x:-0.45, z:0.15, rot:0.3, y:0.8} (pequena, sobre a mesa) · grade {x:2.15, z:0.4, rot:π/2}
 *          porta {x:-0.85, z:-1.75, rot:0} · churrasqueira {x:1.75, z:-1.38, rot:π} · centro {x:0.3, z:1.25, rot:0}
 *          inicio {x:-0.85, z:-1.55, rot:0.35} · cidade {x:2.15, z:-0.9, rot:π/2} · cobogo {x:-2.35, z:0.6, rot:-π/2}
 *          mesa {x:0.0, z:-0.75, rot:0}
 *  shots:  geral, mesa, pai, filho, cidade, cobogo
 *  colliders: mesa, churrasqueira, floreira, palmeira, costela-de-adão, espada-de-são-jorge, espreguiçadeira.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  const ENVS = (P2.envs = P2.envs || {});
  const PI = Math.PI;

  // ------------------------------------------------------------------
  // Utilitários de montagem
  // ------------------------------------------------------------------
  const toMat = (c) => (c && c.isMaterial ? c : M.mat(c));
  const rb = (w, h, d, r, c, o, seg) => M.mesh(M.roundedBoxGeo(w, h, d, r, seg == null ? 2 : seg), toMat(c), o);
  const bx = (w, h, d, c, o) => M.mesh(M.boxGeo(w, h, d), toMat(c), o);
  const cy = (rt, rbt, h, c, o, seg) => M.mesh(M.cylGeo(rt, rbt, h, seg || 16), toMat(c), o);
  const sp = (r, c, o, ws, hs) => M.mesh(M.sphereGeo(r, ws || 14, hs || 10), toMat(c), o);
  const tor = (r, tube, c, o, arc) => M.mesh(M.torusGeo(r, tube, 6, 18, arc), toMat(c), o);
  const pl = (w, h, c, o) => M.mesh(M.planeGeo(w, h), toMat(c), o);
  const cn = (r, h, c, o, seg) => M.mesh(M.coneGeo(r, h, seg || 12), toMat(c), o);
  const grp = (o) => M.group(o);
  const hex = (c) => M.hex(c);
  const mix = (a, b, t) => M.hex(M.mix(a, b, t));
  const NOC = { cast: false };

  /** Kit por montagem: guarda texturas/materiais próprios para liberar no dispose. */
  function kit() {
    const own = { tex: [], mat: [] };
    return {
      own,
      tex(w, h, draw, opts) { const t = M.canvasTex(w, h, draw, opts); own.tex.push(t); return t; },
      tmat(map, o) {
        o = o || {};
        const m = new T.MeshStandardMaterial({
          map: map || null, color: M.color(o.color || '#ffffff'), roughness: o.rough == null ? 0.8 : o.rough, metalness: o.metal || 0,
          transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity, alphaTest: o.alphaTest || 0,
          side: o.side === 'double' ? T.DoubleSide : T.FrontSide,
        });
        if (o.emissiveMap) { m.emissiveMap = o.emissiveMap; m.emissive = M.color(o.emissive || '#ffffff'); m.emissiveIntensity = o.emissiveIntensity == null ? 1 : o.emissiveIntensity; }
        else if (o.emissive) { m.emissive = M.color(o.emissive); m.emissiveIntensity = o.emissiveIntensity == null ? 1 : o.emissiveIntensity; }
        if (o.depthWrite === false) m.depthWrite = false;
        own.mat.push(m);
        return m;
      },
      bmat(map, o) {
        o = o || {};
        const m = new T.MeshBasicMaterial({ map: map || null, color: M.color(o.color || '#ffffff'), transparent: !!o.transparent, opacity: o.opacity == null ? 1 : o.opacity, side: o.side === 'double' ? T.DoubleSide : T.FrontSide });
        if (o.add) { m.blending = T.AdditiveBlending; m.depthWrite = false; m.transparent = true; }
        if (o.depthWrite === false) m.depthWrite = false;
        if (o.fog === false) m.fog = false;
        if (o.toneMapped === false) m.toneMapped = false;
        own.mat.push(m);
        return m;
      },
      umat(color, o) { const m = M.mat(color, Object.assign({ unique: true }, o || {})); own.mat.push(m); return m; },
      /** registra material/textura de uma malha criada fora do kit (ex.: M.textPanel) */
      track(mesh) { if (mesh.material) { own.mat.push(mesh.material); if (mesh.material.map) own.tex.push(mesh.material.map); } return mesh; },
      dispose(root) {
        root.traverse((o) => { if (o.geometry && o.geometry.userData && o.geometry.userData.baked) o.geometry.dispose(); });
        root.traverse((o) => { if (o.isSprite && o.material) o.material.dispose(); });
        own.mat.forEach((m) => m.dispose());
        own.tex.forEach((t) => t.dispose());
      },
    };
  }

  /**
   * Tira um móvel do grupo da parede e o põe na decoração do chão (mantendo a posição no mundo):
   * móveis baixos encostados na parede da frente continuam visíveis quando a parede some,
   * dando um primeiro plano ao plano geral em vez de um chão vazio.
   */
  function keepOnFloor(root, deco, obj) {
    root.updateMatrixWorld(true);
    deco.attach(obj);
    return obj;
  }
  /**
   * Esses móveis de primeiro plano somem quando a câmera de cinema entra neles (plano baixo rente à parede)
   * ou chega perto por trás deles, do lado de fora da parede da frente (planos médios): assim nenhum plano
   * começa com um tampo gigante tapando a cena, e o plano geral (câmera longe) continua com o primeiro plano.
   * Em primeira pessoa a câmera fica sempre dentro do cômodo e longe deles (colliders): nada some.
   * items: [{obj, x, z, w, d, top, wallZ, near}] — wallZ = z da face interna da parede da frente.
   */
  function fgHider(items) {
    items.forEach((it) => { if (it.obj.parent) { bake(it.obj); it.obj.userData.live = true; } });
    return function () {
      const cam = P2.core && P2.core.camera;
      if (!cam) return;
      const p = cam.position;
      items.forEach((it) => {
        const gx = Math.max(0, Math.abs(p.x - it.x) - it.w / 2), gz = Math.max(0, Math.abs(p.z - it.z) - it.d / 2);
        const gap = Math.hypot(gx, gz);
        const inside = gap < 0.03 && p.y < it.top + 0.45;
        const behind = p.z > it.wallZ && gap < (it.near || 1.5) && p.y < 2.4;
        const vis = !(inside || behind);
        if (it.obj.visible !== vis) it.obj.visible = vis;
      });
    };
  }
  /**
   * Lençol/edredom moldado: plano subdividido cujos vértices seguem h(x, z) (coordenadas locais do grupo).
   * Usado no edredom "com corpo" do quarto para cobrir quem dorme com um volume macio e contínuo.
   */
  function sheetGeo(x0, x1, z0, z1, nx, nz, h) {
    const g = new T.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
    g.rotateX(-PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (x0 + x1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
      p.setXYZ(i, x, h(x, z), z);
    }
    g.computeVertexNormals();
    g.userData.baked = true; // geometria própria: liberada no dispose
    return g;
  }
  /** Interpolação suave por chaves [[t, v], ...] (smoothstep entre chaves vizinhas). */
  function keyed(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i], u = (t - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * u * u * (3 - 2 * u);
      }
    }
    return keys[keys.length - 1][1];
  }

  /**
   * "Assa" a decoração estática de um grupo: junta todas as malhas com o mesmo material numa só
   * (mesmo sombreamento), derrubando o número de draw calls. Objetos com userData.live são ignorados.
   */
  function bake(group) {
    group.updateMatrixWorld(true);
    const inv = new T.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
    const victims = [];
    (function walk(o) {
      o.children.forEach((c) => {
        if (c.userData.live) return;
        if (c.isMesh && !Array.isArray(c.material) && !c.material.isShaderMaterial && c.children.length === 0) {
          const key = c.material.uuid + (c.castShadow ? 'C' : 'c') + (c.receiveShadow ? 'R' : 'r') + '|' + (c.renderOrder || 0);
          let b = buckets.get(key);
          if (!b) buckets.set(key, (b = { mat: c.material, cast: c.castShadow, rec: c.receiveShadow, ro: c.renderOrder || 0, list: [] }));
          b.list.push(c);
          victims.push(c);
        } else walk(c);
      });
    })(group);
    const mtx = new T.Matrix4();
    buckets.forEach((b) => {
      if (b.list.length < 2) return;
      let n = 0;
      const parts = b.list.map((m) => {
        mtx.multiplyMatrices(inv, m.matrixWorld);
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        g.applyMatrix4(mtx);
        if (mtx.determinant() < 0) flipWinding(g);
        n += g.attributes.position.count;
        return g;
      });
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let off = 0;
      parts.forEach((g) => {
        const c = g.attributes.position.count;
        pos.set(g.attributes.position.array, off * 3);
        if (g.attributes.normal) nor.set(g.attributes.normal.array, off * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, off * 2);
        off += c;
        g.dispose();
      });
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      geo.userData.baked = true;
      const mesh = new T.Mesh(geo, b.mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.rec; mesh.renderOrder = b.ro;
      mesh.matrixAutoUpdate = false;
      // geometrias próprias (não vêm do cache do M) dos objetos fundidos: liberar já, ninguém mais as usa
      b.list.forEach((m) => { m.parent.remove(m); if (m.geometry.userData && m.geometry.userData.baked) m.geometry.dispose(); });
      group.add(mesh);
    });
    return group;
  }
  function flipWinding(g) {
    Object.keys(g.attributes).forEach((k) => {
      const a = g.attributes[k], s = a.itemSize, arr = a.array;
      for (let i = 0; i < a.count; i += 3) {
        for (let j = 0; j < s; j++) { const t = arr[(i + 1) * s + j]; arr[(i + 1) * s + j] = arr[(i + 2) * s + j]; arr[(i + 2) * s + j] = t; }
      }
    });
  }

  // Geometrias próprias (cache local)
  const gcache = new Map();
  function gcached(key, make) { if (!gcache.has(key)) gcache.set(key, make()); return gcache.get(key); }
  /** Cortina com pregas (plano ondulado). */
  function curtainGeo(w, h, folds, depth) {
    return gcached(['cur', w, h, folds, depth].join('|'), () => {
      const g = new T.PlaneGeometry(w, h, folds * 8, 6);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const k = (x / w + 0.5) * folds * PI * 2;
        const flare = 1 + (0.5 - y / h) * 0.35; // abre um pouco embaixo
        p.setZ(i, Math.sin(k) * depth * flare);
        p.setX(i, x * (1 + (0.5 - y / h) * 0.06));
      }
      g.computeVertexNormals();
      return g;
    });
  }
  /** Folha (gota achatada) para plantas. */
  function leafGeo(len, wid) {
    return gcached(['leaf', len, wid].join('|'), () => {
      const s = new T.Shape();
      s.moveTo(0, 0);
      s.bezierCurveTo(wid * 0.7, len * 0.15, wid * 0.62, len * 0.75, 0, len);
      s.bezierCurveTo(-wid * 0.62, len * 0.75, -wid * 0.7, len * 0.15, 0, 0);
      const g = new T.ShapeGeometry(s, 6);
      // dobra suave no meio (nervura) e curva para trás
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        p.setZ(i, -Math.abs(x) * 0.35 + Math.pow(y / len, 2) * len * 0.22);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  /** Torno simples (vaso, xícara, garrafa) a partir de pontos [r, y]. */
  function latheGeo(key, pts, seg) {
    return gcached('lathe|' + key, () => new T.LatheGeometry(pts.map((p) => new T.Vector2(p[0], p[1])), seg || 20));
  }
  const lathe = (key, pts, c, o, seg) => M.mesh(latheGeo(key, pts, seg), toMat(c), o);

  // ------------------------------------------------------------------
  // Texturas desenhadas
  // ------------------------------------------------------------------
  function woodFloorTex(k, base, o) {
    o = o || {};
    const r = M.rng(o.seed || 11);
    return k.tex(512, 512, (ctx, w, h) => {
      const rows = o.rows || 6, ph = h / rows;
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < rows; i++) {
        let x = -r() * w;
        while (x < w) {
          const len = w * (0.42 + r() * 0.5);
          const col = mix(base, r() > 0.5 ? (o.dark || '#5a3a22') : (o.light || '#e8c8a0'), 0.06 + r() * 0.16);
          [x, x + w].forEach((xx) => {
            ctx.fillStyle = col; ctx.fillRect(xx, i * ph, len, ph);
            ctx.strokeStyle = 'rgba(60,35,20,0.10)'; ctx.lineWidth = 1.2;
            for (let g = 0; g < 4; g++) {
              const gy = i * ph + ph * (0.15 + 0.7 * r());
              ctx.beginPath(); ctx.moveTo(xx + 4, gy);
              ctx.bezierCurveTo(xx + len * 0.3, gy + (r() - 0.5) * 6, xx + len * 0.6, gy + (r() - 0.5) * 6, xx + len - 4, gy + (r() - 0.5) * 4);
              ctx.stroke();
            }
            ctx.fillStyle = 'rgba(40,22,10,0.35)'; ctx.fillRect(xx, i * ph, 2, ph);
          });
          x += len;
        }
        ctx.fillStyle = 'rgba(40,22,10,0.38)'; ctx.fillRect(0, i * ph, w, 2);
      }
    }, { repeat: o.repeat || [2, 2] });
  }
  function tileTex(k, base, grout, o) {
    o = o || {};
    const r = M.rng(o.seed || 5);
    return k.tex(256, 256, (ctx, w, h) => {
      const n = o.n || 2, s = w / n;
      ctx.fillStyle = grout; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        ctx.fillStyle = mix(base, o.vary || '#ffffff', r() * 0.12);
        ctx.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        if (o.draw) o.draw(ctx, i * s + 2, j * s + 2, s - 4, r);
      }
    }, { repeat: o.repeat || [2, 2] });
  }
  /** Ladrilho hidráulico (padrão de 4 pétalas). */
  function ladrilhoTex(k, cols, o) {
    o = o || {};
    return k.tex(256, 256, (ctx, w, h) => {
      const s = w / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const x = i * s, y = j * s;
        ctx.save(); ctx.translate(x + s / 2, y + s / 2);
        ctx.fillStyle = cols.bg; ctx.fillRect(-s / 2, -s / 2, s, s);
        // quartos de círculo nos cantos (formam círculos ao repetir)
        ctx.fillStyle = cols.a;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx * s / 2, sy * s / 2, s * 0.22, 0, PI * 2); ctx.fill(); });
        ctx.fillStyle = cols.bg;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.arc(sx * s / 2, sy * s / 2, s * 0.12, 0, PI * 2); ctx.fill(); });
        // pétalas
        ctx.fillStyle = cols.b;
        for (let p = 0; p < 4; p++) {
          ctx.save(); ctx.rotate(p * PI / 2);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.2, -s * 0.18, 0, -s * 0.36); ctx.quadraticCurveTo(-s * 0.2, -s * 0.18, 0, 0); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = cols.c; ctx.beginPath(); ctx.arc(0, 0, s * 0.07, 0, PI * 2); ctx.fill();
        ctx.strokeStyle = cols.line || 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; ctx.strokeRect(-s / 2 + 1, -s / 2 + 1, s - 2, s - 2);
        ctx.restore();
      }
    }, { repeat: o.repeat || [1, 1] });
  }
  /** Tapete com bordas e motivos. */
  function rugTex(k, o) {
    return k.tex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h);
      // trama
      ctx.globalAlpha = 0.08; ctx.fillStyle = '#000';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
      ctx.globalAlpha = 1;
      const b = o.border || 34;
      ctx.strokeStyle = o.c1; ctx.lineWidth = 10; ctx.strokeRect(b, b, w - 2 * b, h - 2 * b);
      ctx.strokeStyle = o.c2; ctx.lineWidth = 4; ctx.strokeRect(b + 18, b + 18, w - 2 * b - 36, h - 2 * b - 36);
      if (o.motif === 'losango') {
        ctx.fillStyle = o.c1;
        const n = 4, cw = (w - 2 * b - 60) / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const cx = b + 30 + cw * (i + 0.5), cyy = b + 30 + cw * (j + 0.5);
          ctx.globalAlpha = (i + j) % 2 ? 0.85 : 0.35;
          ctx.fillStyle = (i + j) % 2 ? o.c1 : o.c2;
          ctx.beginPath(); ctx.moveTo(cx, cyy - cw * 0.36); ctx.lineTo(cx + cw * 0.3, cyy); ctx.lineTo(cx, cyy + cw * 0.36); ctx.lineTo(cx - cw * 0.3, cyy); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (o.motif === 'linhas') {
        ctx.strokeStyle = o.c2; ctx.lineWidth = 3;
        for (let i = 1; i < 6; i++) { const y = b + 30 + (h - 2 * b - 60) * i / 6; ctx.beginPath(); for (let x = b + 30; x <= w - b - 30; x += 24) ctx.lineTo(x, y + ((x / 24) % 2 ? -8 : 8)); ctx.stroke(); }
      } else if (o.motif === 'circulos') {
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = i % 2 ? o.c2 : o.c1; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(w / 2, h / 2, 60 + i * 50, 0, PI * 2); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      // franjas
      if (o.fringe) { ctx.fillStyle = o.fringe; for (let x = 0; x < w; x += 6) { ctx.fillRect(x, 0, 3, 10); ctx.fillRect(x, h - 10, 3, 10); } }
    });
  }
  /** Foto de família estilizada. */
  function photoTex(k, seed, o) {
    o = o || {};
    const r = M.rng(seed);
    return k.tex(320, 256, (ctx) => {
      ctx.scale(2, 2);
      const w = 160, h = 128;
      const skies = [['#8fc6ea', '#f6e7c8'], ['#f3b27a', '#ffe2b8'], ['#9ad0b8', '#e9f3d8'], ['#c9b3e6', '#f7d9cf']];
      const s = skies[seed % skies.length];
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, s[0]); g.addColorStop(1, s[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (seed % 2 === 0) { ctx.fillStyle = '#4a9fd0'; ctx.fillRect(0, h * 0.62, w, h * 0.1); ctx.fillStyle = '#f2dcb0'; ctx.fillRect(0, h * 0.72, w, h); }
      else { ctx.fillStyle = '#6aa860'; ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.85, w * 0.6, h * 0.3, 0, 0, PI * 2); ctx.fill(); }
      const people = o.people || (2 + (seed % 2));
      const shirts = ['#24324f', '#2fae86', '#e0a33a', '#c8653f', '#7a5ac8'];
      for (let i = 0; i < people; i++) {
        const px = w * (0.5 + (i - (people - 1) / 2) * 0.24), sc = i === 0 ? 1.05 : 0.9 - (i === 2 ? 0.2 : 0);
        ctx.fillStyle = shirts[(seed + i) % shirts.length];
        ctx.beginPath(); ctx.ellipse(px, h * 0.92, 18 * sc, 30 * sc, 0, 0, PI * 2); ctx.fill();
        ctx.fillStyle = ['#d9a27c', '#c58b63', '#e2b896'][(seed + i) % 3];
        ctx.beginPath(); ctx.arc(px, h * 0.58 - (sc - 0.9) * 20, 12 * sc, 0, PI * 2); ctx.fill();
        ctx.fillStyle = i === 0 ? '#c9c9cf' : '#3a2a20';
        ctx.beginPath(); ctx.arc(px, h * 0.55 - (sc - 0.9) * 20, 12 * sc, PI, 0); ctx.fill();
        ctx.fillStyle = '#3a2a20'; ctx.fillRect(px - 5 * sc, h * 0.6, 3, 2); ctx.fillRect(px + 2 * sc, h * 0.6, 3, 2);
        ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, h * 0.62, 4 * sc, 0.2, PI - 0.2); ctx.stroke();
      }
      void r;
    });
  }
  /** Quadro abstrato (arte de parede). */
  function artTex(k, cols, kind) {
    return k.tex(512, 640, (ctx) => {
      ctx.scale(2, 2);
      const w = 256, h = 320;
      ctx.fillStyle = cols[0]; ctx.fillRect(0, 0, w, h);
      if (kind === 'sol') {
        ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.42, w * 0.26, 0, PI * 2); ctx.fill();
        ctx.fillStyle = cols[2]; ctx.fillRect(0, h * 0.62, w, h * 0.38);
        ctx.fillStyle = cols[3]; ctx.beginPath(); ctx.moveTo(0, h * 0.75); ctx.quadraticCurveTo(w * 0.5, h * 0.55, w, h * 0.78); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      } else if (kind === 'folhas') {
        for (let i = 0; i < 7; i++) {
          ctx.save(); ctx.translate(w * 0.5, h * 0.95); ctx.rotate(-1.1 + i * 0.36);
          ctx.fillStyle = cols[1 + (i % 3)];
          ctx.beginPath(); ctx.ellipse(0, -h * 0.38, w * 0.07, h * 0.3, 0, 0, PI * 2); ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.arc(w * 0.32, h * 0.35, w * 0.22, 0, PI * 2); ctx.fill();
        ctx.fillStyle = cols[2]; ctx.fillRect(w * 0.45, h * 0.45, w * 0.4, h * 0.38);
        ctx.fillStyle = cols[3]; ctx.beginPath(); ctx.moveTo(w * 0.1, h * 0.9); ctx.lineTo(w * 0.5, h * 0.55); ctx.lineTo(w * 0.62, h * 0.9); ctx.fill();
      }
    });
  }
  /** Céu + cidade para janelas. o: {sky:[...], sun:[x,y,color,r], night, seed, haze, stars, trees} */
  function viewTex(k, o) {
    const r = M.rng(o.seed || 7);
    return k.tex(1024, 640, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      o.sky.forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      if (o.stars) { for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + r() * 0.6) + ')'; const s = r() > 0.9 ? 2.4 : 1.3; ctx.fillRect(r() * w, r() * h * 0.45, s, s); } }
      if (o.moon) { ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(o.moon[0] * w, o.moon[1] * h, 22, 0, PI * 2); ctx.fill(); ctx.fillStyle = o.sky[0]; ctx.beginPath(); ctx.arc(o.moon[0] * w + 10, o.moon[1] * h - 6, 20, 0, PI * 2); ctx.fill(); }
      if (o.sun) {
        const sg = ctx.createRadialGradient(o.sun[0] * w, o.sun[1] * h, 2, o.sun[0] * w, o.sun[1] * h, o.sun[3] || 260);
        sg.addColorStop(0, o.sun[2]); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
      }
      if (o.clouds) {
        ctx.fillStyle = o.clouds;
        for (let i = 0; i < 6; i++) { const cx = r() * w, cyy = h * (0.1 + r() * 0.3), s = 30 + r() * 40; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(cx + j * s * 0.7, cyy + (j % 2) * 6, s, s * 0.45, 0, 0, PI * 2); ctx.fill(); } }
      }
      // prédios (3 camadas)
      const layers = o.layers || [['#3a3f6a', 0.5, 0.36], ['#2a2d52', 0.6, 0.3], ['#1c1e3a', 0.72, 0.22]];
      layers.forEach(([col, base, var_], li) => {
        let x = -20;
        while (x < w) {
          const bw = 50 + r() * 110;
          const bh = h * (0.12 + r() * var_);
          const top = h * base - bh + h * 0.12;
          ctx.fillStyle = col; ctx.fillRect(x, top, bw - 6, h - top);
          if (r() > 0.6) ctx.fillRect(x + bw * 0.3, top - 18, 6, 18); // antena
          if (o.windows) {
            for (let yy = top + 10; yy < h - 6; yy += 16) for (let xx = x + 8; xx < x + bw - 16; xx += 14) {
              const v = r();
              if (v > o.windows) { ctx.fillStyle = o.winColor ? o.winColor(v) : 'rgba(255,220,150,0.8)'; ctx.fillRect(xx, yy, 6, 8); }
            }
          }
          x += bw;
        }
        if (o.haze && li < layers.length - 1) { ctx.fillStyle = o.haze; ctx.fillRect(0, 0, w, h); }
      });
      if (o.trees) {
        for (let i = 0; i < 26; i++) { ctx.fillStyle = r() > 0.5 ? o.trees[0] : o.trees[1]; ctx.beginPath(); ctx.arc(r() * w, h * (0.9 + r() * 0.1), 30 + r() * 40, 0, PI * 2); ctx.fill(); }
      }
    });
  }
  /** Textura de feixe de luz (gradiente vertical, bordas suaves). */
  let shaftTexShared = null;
  function shaftTex() {
    if (!shaftTexShared) {
      shaftTexShared = M.canvasTex(64, 128, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.12, 'rgba(255,255,255,0.8)'); g.addColorStop(0.5, 'rgba(255,255,255,0.32)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const e = ctx.createLinearGradient(0, 0, w, 0);
        e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(0.2, 'rgba(0,0,0,0)'); e.addColorStop(0.8, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = e; ctx.fillRect(0, 0, w, h);
      });
    }
    return shaftTexShared;
  }
  /** Mancha de luz de janela no chão (vidraças com borda suave). */
  function patchTex(k, cols, rows) {
    return k.tex(256, 256, (ctx, w, h) => {
      ctx.filter = 'blur(6px)';
      ctx.fillStyle = '#ffffff';
      const m = 18, gx = 10;
      const cw = (w - 2 * m - (cols - 1) * gx) / cols, ch = (h - 2 * m - (rows - 1) * gx) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) ctx.fillRect(m + i * (cw + gx), m + j * (ch + gx), cw, ch);
      ctx.filter = 'none';
    });
  }
  /** Fumaça/vapor (sprite macio). */
  let puffTex = null;
  function steamPuffs(parent, n, o) {
    if (!puffTex) {
      puffTex = M.canvasTex(64, 64, (ctx) => {
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(0.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      });
    }
    o = o || {};
    const g = grp({ parent, pos: o.pos });
    g.userData.live = true;
    const list = [];
    for (let i = 0; i < n; i++) {
      const m = new T.SpriteMaterial({ map: puffTex, color: M.color(o.color || '#ffffff'), transparent: true, opacity: 0, depthWrite: false });
      const s = new T.Sprite(m);
      g.add(s);
      list.push({ s, ph: i / n });
    }
    g.userData.puffs = list;
    g.userData.opts = o;
    return g;
  }
  function updatePuffs(g, t, on) {
    if (!g) return;
    g.visible = !!on;
    if (!on) return;
    const o = g.userData.opts, H = o.h || 0.35, S = o.size || 0.12;
    g.userData.puffs.forEach((p, i) => {
      const k = (t * (o.speed || 0.35) + p.ph) % 1;
      p.s.position.set(Math.sin(k * 5 + i) * 0.025 * (1 + k * 2), k * H, Math.cos(k * 4 + i * 2) * 0.015);
      p.s.scale.setScalar(S * (0.5 + k * 1.4));
      p.s.material.opacity = Math.sin(k * PI) * (o.opacity || 0.5);
    });
  }


  /** Feixe de luz falso (plano aditivo) da janela até o chão. from/to = [x,y,z]; width ao longo de wdir. */
  function beam(parent, mat, from, to, width, wdir) {
    const a = new T.Vector3().fromArray(from), b = new T.Vector3().fromArray(to);
    const up = a.clone().sub(b);
    const len = up.length();
    up.normalize();
    const xv = new T.Vector3().fromArray(wdir || [0, 0, 1]).normalize();
    const n = new T.Vector3().crossVectors(xv, up).normalize();
    xv.crossVectors(up, n).normalize();
    const m = new T.Mesh(M.planeGeo(width, len), mat);
    m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(xv, up, n));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.castShadow = false; m.receiveShadow = false;
    m.renderOrder = 5;
    parent.add(m);
    return m;
  }
  /** Parquet em espinha (chevron). */
  function chevronTex(k, base, o) {
    o = o || {};
    const r = M.rng(o.seed || 17);
    return k.tex(512, 512, (ctx, w, h) => {
      const cols = 4, cw = w / cols, ph = 32;
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      const hw = cw / 2;
      for (let c = 0; c < cols; c++) for (let y = -cw; y < h + cw; y += ph) {
        [0, 1].forEach((side) => {
          const col = mix(base, r() > 0.5 ? (o.dark || '#4a2c18') : (o.light || '#e6c296'), 0.05 + r() * 0.18);
          ctx.fillStyle = col;
          ctx.beginPath();
          if (side === 0) { const x0 = c * cw; ctx.moveTo(x0, y); ctx.lineTo(x0 + hw, y - hw); ctx.lineTo(x0 + hw, y - hw + ph); ctx.lineTo(x0, y + ph); }
          else { const x1 = c * cw + hw; ctx.moveTo(x1, y - hw); ctx.lineTo(x1 + hw, y); ctx.lineTo(x1 + hw, y + ph); ctx.lineTo(x1, y - hw + ph); }
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(40,20,8,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        });
      }
    }, { repeat: [2, 2] });
  }

  // ------------------------------------------------------------------
  // Casco do diorama: piso, base, paredes que somem
  // ------------------------------------------------------------------
  /**
   * o: {w, d, h, t, floorMat, wallMat|wallMats{back,left,right,front}, base, trim, openings{back:[...],...}, skirting}
   * opening: {x (centro ao longo da parede, coordenada local), w, y0, h}
   * Paredes: grupo local com x ao longo da parede, +z para DENTRO do cômodo, face interna em z = 0.
   */
  function shell(k, root, o) {
    const W = o.w, D = o.d, H = o.h || 2.7, th = o.t || 0.14, ext = o.ext == null ? 0.32 : o.ext;
    const S = { W, D, H, th, walls: [], wallGroups: {} };
    // piso
    const fw = W + 2 * th + 2 * ext, fd = D + 2 * th + 2 * ext;
    const base = grp({ parent: root, name: 'base' });
    S.base = base;
    const floor = pl(fw, fd, o.floorMat, { rot: [-PI / 2, 0, 0], cast: false, parent: base });
    floor.receiveShadow = true;
    if (o.floorMat.map) o.floorMat.map.repeat.set(fw / (o.floorTile || 1.6), fd / (o.floorTile || 1.6));
    // base do diorama (laje + rodapé escuro)
    rb(fw, 0.14, fd, 0.02, o.slab || '#d9cbb8', { pos: [0, -0.07 - 0.002, 0], cast: false, parent: base }, 1);
    rb(fw - 0.12, 0.32, fd - 0.12, 0.04, o.base || '#2c2a33', { pos: [0, -0.3, 0], cast: false, parent: base }, 1);
    rb(fw + 0.04, 0.025, fd + 0.04, 0.012, o.trim || '#b89a6a', { pos: [0, -0.15, 0], cast: false, parent: base }, 1);
    const defs = {
      back: { pos: [0, 0, -D / 2], ry: 0, len: W + 2 * th, n: [0, 0, 1] },
      front: { pos: [0, 0, D / 2], ry: PI, len: W + 2 * th, n: [0, 0, -1] },
      left: { pos: [-W / 2, 0, 0], ry: PI / 2, len: D, n: [1, 0, 0] },
      right: { pos: [W / 2, 0, 0], ry: -PI / 2, len: D, n: [-1, 0, 0] },
    };
    (o.sides || ['back', 'left', 'right', 'front']).forEach((side) => {
      const d = defs[side];
      const g = grp({ parent: root, pos: d.pos, rot: [0, d.ry, 0], name: 'wall:' + side });
      const wm = (o.wallMats && o.wallMats[side]) || o.wallMat;
      const ops = ((o.openings && o.openings[side]) || []).slice().sort((a, b) => a.x - b.x);
      const L = d.len;
      let x0 = -L / 2;
      const seg = (a, b, y0, y1) => { if (b - a > 0.001 && y1 - y0 > 0.001) bx(b - a, y1 - y0, th, wm, { parent: g, pos: [(a + b) / 2, (y0 + y1) / 2, -th / 2], cast: false }); };
      ops.forEach((op) => {
        const a = op.x - op.w / 2, b = op.x + op.w / 2;
        seg(x0, a, 0, H);
        seg(a, b, 0, op.y0);
        seg(a, b, op.y0 + op.h, H);
        x0 = b;
      });
      seg(x0, L / 2, 0, H);
      // topo cortado (seção) e rodapé
      bx(L, 0.03, th + 0.01, o.cap || '#3a3440', { parent: g, pos: [0, H + 0.015, -th / 2], cast: false });
      if (o.skirting !== false) {
        let s0 = -L / 2 + (side === 'left' || side === 'right' ? 0 : th);
        const sEnd = L / 2 - (side === 'left' || side === 'right' ? 0 : th);
        const doors = ops.filter((op) => op.y0 < 0.05);
        doors.forEach((op) => { const a = op.x - op.w / 2 - 0.06; if (a > s0) bx(a - s0, 0.09, 0.018, o.skirtColor || '#f3eee6', { parent: g, pos: [(s0 + a) / 2, 0.045, 0.009], cast: false }); s0 = op.x + op.w / 2 + 0.06; });
        if (sEnd > s0) bx(sEnd - s0, 0.09, 0.018, o.skirtColor || '#f3eee6', { parent: g, pos: [(s0 + sEnd) / 2, 0.045, 0.009], cast: false });
      }
      const wp = new T.Vector3(d.pos[0], 0, d.pos[2]);
      S.walls.push({ obj: g, px: wp.x, pz: wp.z, normal: d.n });
      S.wallGroups[side] = g;
    });
    S.bounds = { minX: -W / 2, maxX: W / 2, minZ: -D / 2, maxZ: D / 2 };
    if (o.ceiling) S.ceiling = ceiling(k, root, W, D, H, o.ceiling, S);
    return S;
  }

  /**
   * Teto (visto em primeira pessoa): forro + sanca de gesso com LED indireto + spots embutidos.
   * Entra em walls com normal [0,-1,0] para sumir quando a câmera está acima.
   */
  function ceiling(k, root, W, D, H, o, S) {
    const g = grp({ parent: root, name: 'ceiling' });
    // forro com leve emissão própria (luz rebatida): o hemisférico sozinho deixa o teto cinza-escuro
    const cm = k.umat(o.color || '#f3eee6', { rough: 0.95, emissive: o.color || '#f3eee6', emissiveIntensity: o.glow || 0 });
    g.userData.mat = cm;
    const flat = (w, d, x, z, y, mat) => { const m = pl(w, d, mat || cm, { parent: g, pos: [x, y, z], rot: [PI / 2, 0, 0], cast: false }); m.receiveShadow = false; return m; };
    const band = o.sanca == null ? 0.45 : o.sanca;
    if (band > 0) {
      const drop = 0.12, y = H - drop;
      // faixa rebaixada em volta (sanca) + face vertical interna + forro central mais alto
      flat(W, band, 0, -D / 2 + band / 2, y); flat(W, band, 0, D / 2 - band / 2, y);
      flat(band, D - 2 * band, -W / 2 + band / 2, 0, y); flat(band, D - 2 * band, W / 2 - band / 2, 0, y);
      const vm = k.umat(o.color || '#f3eee6', { rough: 0.95, side: 'double', emissive: o.color || '#f3eee6', emissiveIntensity: o.glow || 0 });
      g.userData.vmat = vm;
      [[0, -D / 2 + band, W - 2 * band, 0], [0, D / 2 - band, W - 2 * band, 0], [-W / 2 + band, 0, D - 2 * band, PI / 2], [W / 2 - band, 0, D - 2 * band, PI / 2]].forEach(([x, z, len, ry]) => {
        const m = pl(len, drop, vm, { parent: g, pos: [x, H - drop / 2, z], rot: [0, ry, 0], cast: false }); m.receiveShadow = false;
      });
      flat(W - 2 * band, D - 2 * band, 0, 0, H);
      // fita de LED escondida (brilha no forro central)
      const led = k.umat('#fff4e0', { emissive: o.led || '#ffcf8a', emissiveIntensity: 0 });
      [[0, -D / 2 + band + 0.03, W - 2 * band, 0.05], [0, D / 2 - band - 0.03, W - 2 * band, 0.05], [-W / 2 + band + 0.03, 0, 0.05, D - 2 * band], [W / 2 - band - 0.03, 0, 0.05, D - 2 * band]].forEach(([x, z, w, d]) => flat(w, d, x, z, H - 0.002, led));
      g.userData.led = led;
    } else flat(W, D, 0, 0, H);
    // spots embutidos
    const ring = M.mat('#d9d4cc', { rough: 0.4, metal: 0.4 });
    const spotMat = k.umat('#fffaf0', { emissive: '#fff1d6', emissiveIntensity: 0.2 });
    (o.spots || []).forEach(([x, z]) => {
      const y = band > 0 && (Math.abs(x) > W / 2 - band || Math.abs(z) > D / 2 - band) ? H - 0.12 : H;
      M.mesh(M.cylGeo(0.055, 0.055, 0.012, 16), ring, { parent: g, pos: [x, y - 0.006, z], cast: false });
      M.mesh(M.cylGeo(0.04, 0.04, 0.004, 14), spotMat, { parent: g, pos: [x, y - 0.013, z], cast: false });
    });
    g.userData.spotMat = spotMat;
    /** brilho do forro (luz rebatida) — muda com o humor da cena */
    g.userData.setGlow = (v, color) => {
      [cm, g.userData.vmat].forEach((m) => { if (!m) return; m.emissiveIntensity = v; if (color) m.emissive.set(color); });
    };
    S.walls.push({ obj: g, px: 0, py: H - 0.12, pz: 0, normal: [0, -1, 0] });
    return g;
  }

  /**
   * Vista exterior em volta do cômodo (domo de céu + anel de prédios), só visível quando a câmera
   * está DENTRO do cômodo (primeira pessoa / planos baixos) — de fora, as janelas usam o plano raso.
   */
  function outside(k, root, o) {
    const g = grp({ parent: root, name: 'outside' });
    g.userData.live = true;
    g.visible = false;
    const dome = M.skyDome(o.sky[0], o.sky[1], o.sky[2], 85);
    g.add(dome);
    const ringMat = k.bmat(null, { transparent: true, side: 'double', fog: false });
    ringMat.depthWrite = false;
    const ring = new T.Mesh(new T.CylinderGeometry(o.r || 62, o.r || 62, o.h || 36, 64, 1, true), ringMat);
    ring.geometry.userData.baked = true;
    ring.position.y = o.y == null ? -8 : o.y;
    ring.renderOrder = -6;
    g.add(ring);
    const sun = M.glow(o.sunColor || '#ffe2b0', o.sunSize || 6, 0.8);
    sun.material.fog = false;
    sun.position.fromArray(o.sunPos || [-20, 8, -10]);
    g.add(sun);
    const city = o.city === false ? null : cityscape(k, g, Object.assign({ seed: o.seed || 7 }, o.city || {}));
    const api = {
      group: g, dome, ring, sun, city,
      set(sky, tex, sunColor, sunOp, mood) {
        dome.userData.setColors(sky[0], sky[1], sky[2]);
        ringMat.map = tex; ringMat.needsUpdate = true;
        if (sunColor) sun.material.color.set(sunColor);
        sun.material.opacity = sunOp == null ? 0.8 : sunOp;
        if (city && mood) city.set(mood);
        setFog(sky[1]);
      },
      /** visível só com a câmera dentro do cômodo */
      check(W, D, H, nearViews) {
        const cam = P2.core && P2.core.camera;
        if (!cam) return;
        const p = cam.position;
        const inside = Math.abs(p.x) < W / 2 + 0.02 && Math.abs(p.z) < D / 2 + 0.02 && p.y < H;
        g.visible = inside;
        if (nearViews) nearViews.forEach((v) => (v.visible = !inside));
        api.inside = inside;
        return inside;
      },
    };
    return api;
  }
  /** Caixa com UV em metros (janelas na escala certa em qualquer tamanho de prédio). */
  function meterBox(w, h, d, S) {
    const g = new T.BoxGeometry(w, h, d);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
      if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, z / S, y / S);
      else if (Math.abs(n.getZ(i)) > 0.5) uv.setXY(i, x / S, y / S);
      else uv.setXY(i, x / S, z / S);
    }
    return g;
  }
  /**
   * Cidade em 3D em volta (prédios em caixa + chão de quarteirões + horizonte), para janelas e varanda.
   * mood: 'dia' | 'dourado' | 'amanhecer' | 'noite'. Devolve {group, set(mood)}.
   */
  function cityscape(k, parent, o) {
    o = o || {};
    const g = grp({ parent, name: 'cidade' });
    const r = M.rng(o.seed || 99);
    const GY = o.groundY == null ? -26 : o.groundY;
    const facade = (night, wall, win, lit) => k.tex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = wall; ctx.fillRect(0, 0, w, h);
      const rr = M.rng(night ? 5 : 3);
      const cw = w / 8, ch = h / 4;
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = night ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.07)'; ctx.fillRect(0, j * ch + ch - 6, w, 6);
        for (let i = 0; i < 8; i++) {
          const v = rr();
          ctx.fillStyle = night ? (v > 0.6 ? (v > 0.9 ? '#ffd27a' : lit) : win) : (v > 0.8 ? '#9fb6cc' : win);
          ctx.fillRect(i * cw + cw * 0.18, j * ch + ch * 0.22, cw * 0.64, ch * 0.5);
          if (!night) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(i * cw + cw * 0.18, j * ch + ch * 0.22, cw * 0.64, ch * 0.08); }
        }
      }
    }, { repeat: [1, 1] });
    const dayTex = facade(false, '#ffffff', '#6f8aa6', null);
    const nightTex = facade(true, '#1a2040', '#141a34', 'rgba(255,220,160,0.9)');
    const dayCols = o.dayCols || ['#f2e6d4', '#e8b896', '#c2ccd8', '#ddd4c6'];
    const dayMats = dayCols.map((c) => k.tmat(dayTex, { color: c, rough: 0.85 }));
    const nightMat = k.bmat(nightTex, {});
    const roofMat = k.umat('#8a8a90', { rough: 0.9 });
    const blocks = grp({ parent: g });
    const n = o.n || 34;
    const skip = o.skip || null; // função (ang) → true para não pôr prédio nessa direção
    for (let i = 0; i < n; i++) {
      const ang = r() * PI * 2;
      if (skip && skip(ang)) continue;
      const rad = (o.rMin || 14) + r() * ((o.rMax || 46) - (o.rMin || 14));
      const near = Math.max(0, Math.min(1, (rad - 14) / 24));
      const bw = 5 + r() * 7, bd = 5 + r() * 7, bh = 8 + r() * (14 + near * (o.maxH || 22));
      const ci = i % dayMats.length;
      const m = M.mesh(meterBox(bw, bh, bd, 12), dayMats[ci], { parent: blocks, pos: [Math.cos(ang) * rad, GY + bh / 2, Math.sin(ang) * rad], rot: [0, r() * PI, 0], cast: false });
      m.receiveShadow = false;
      m.geometry.userData.baked = true;
      bx(bw * 0.4, 1.2, bd * 0.4, roofMat, { parent: blocks, pos: [Math.cos(ang) * rad, GY + bh + 0.6, Math.sin(ang) * rad], cast: false }).receiveShadow = false;
    }
    bake(blocks);
    // chão de quarteirões lá embaixo
    const groundTex = (night) => k.tex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = night ? '#0c1020' : '#9a9a8c'; ctx.fillRect(0, 0, w, h);
      const rr = M.rng(night ? 8 : 7);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const x = i * 128 + 10, y = j * 128 + 10;
        ctx.fillStyle = night ? '#141a30' : mix('#c8b8a0', '#8aa070', rr() * 0.6); ctx.fillRect(x, y, 108, 108);
        for (let t2 = 0; t2 < 5; t2++) { ctx.fillStyle = night ? '#0e1426' : (rr() > 0.5 ? '#5f8a4e' : '#6f9a5a'); ctx.beginPath(); ctx.arc(x + rr() * 108, y + rr() * 108, 8 + rr() * 10, 0, PI * 2); ctx.fill(); }
        if (night) for (let t2 = 0; t2 < 12; t2++) { ctx.fillStyle = rr() > 0.5 ? '#ffd27a' : '#ffe8b0'; ctx.fillRect(x - 6 + rr() * 120, y - 6, 2, 2); ctx.fillRect(x - 6, y - 6 + rr() * 120, 2, 2); }
      }
    }, { repeat: [14, 14] });
    const gDay = groundTex(false), gNight = groundTex(true);
    const groundMat = k.bmat(gDay, {});
    const ground = new T.Mesh(new T.CircleGeometry(o.groundR || 90, 40), groundMat);
    ground.geometry.userData.baked = true;
    ground.rotation.x = -PI / 2; ground.position.y = GY;
    g.add(ground);
    const api = {
      group: g,
      set(mood) {
        const night = mood === 'noite' || mood === 'amanhecer';
        blocks.children.forEach((m) => {
          if (!m.isMesh || m.material === roofMat) return;
          if (!m.userData.dayMat) m.userData.dayMat = m.material;
          m.material = night ? nightMat : m.userData.dayMat;
        });
        groundMat.map = night ? gNight : gDay; groundMat.needsUpdate = true;
        nightMat.color.set(mood === 'amanhecer' ? '#b8a8d8' : '#ffffff');
        groundMat.color.set(mood === 'amanhecer' ? '#8a80b0' : mood === 'dourado' ? '#ffe2c0' : '#ffffff');
        roofMat.color.set(night ? '#1a1e30' : '#8a8a90');
      },
    };
    return api;
  }
  /** Textura de prédios para o anel (fundo transparente). mood: amanhecer | noite | manha | dourado */
  function ringTex(k, mood, seed) {
    const r = M.rng(seed || 41);
    const P = {
      amanhecer: { layers: [['#4a4880', '#5a5490'], ['#2e2c5a', '#3a3668'], ['#1c1a3c', '#24224a']], win: 0.82, wc: (v) => (v > 0.95 ? '#ffd27a' : 'rgba(255,214,150,0.8)'), trees: ['#141a2e', '#101626'] },
      noite: { layers: [['#1e2650', '#232c5c'], ['#151b3e', '#18204a'], ['#0c1128', '#0f1530']], win: 0.6, wc: (v) => (v > 0.93 ? '#ffd27a' : v > 0.8 ? 'rgba(255,226,170,0.85)' : 'rgba(170,200,255,0.55)'), trees: ['#0a1018', '#081014'] },
      manha: { layers: [['#c4d0dc', '#e6e0d4'], ['#a8b8c8', '#ece2d0'], ['#8ea4b8', '#f0dcc0']], win: 0.7, wc: () => 'rgba(255,255,255,0.45)', trees: ['#6f9a5a', '#5d8a4e'] },
      dourado: { layers: [['#cdb9c8', '#ecd2c0'], ['#ac9cb6', '#f0c8a4'], ['#8c809e', '#e8b088']], win: 0.62, wc: () => 'rgba(255,236,200,0.5)', trees: ['#6f8f62', '#5d7f55'] },
    }[mood];
    const t = k.tex(2048, 512, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      P.layers.forEach(([col, lit], li) => {
        let x = 0;
        const base = [0.58, 0.72, 0.88][li], maxH = [0.42, 0.36, 0.3][li];
        while (x < w) {
          const bw = 34 + li * 14 + r() * (70 + li * 40), bh = h * (0.1 + r() * maxH);
          const top = h * base - bh;
          ctx.fillStyle = col; ctx.fillRect(x, top, bw - 3, h - top);
          ctx.fillStyle = lit; ctx.globalAlpha = mood === 'noite' ? 0.15 : 0.55; ctx.fillRect(x, top, (bw - 3) * 0.32, h - top); ctx.globalAlpha = 1;
          if (r() > 0.6) { ctx.fillStyle = col; ctx.fillRect(x + bw * 0.4, top - 16, 4, 16); if (mood === 'noite' || mood === 'amanhecer') { ctx.fillStyle = '#ff4040'; ctx.fillRect(x + bw * 0.4 - 1, top - 18, 6, 4); } }
          for (let yy = top + 8; yy < h - 4; yy += 12) for (let xx = x + 5; xx < x + bw - 10; xx += 10) { const v = r(); if (v > P.win) { ctx.fillStyle = P.wc(v); ctx.fillRect(xx, yy, 4, 6); } }
          x += bw;
        }
      });
      for (let i = 0; i < 110; i++) { ctx.fillStyle = r() > 0.5 ? P.trees[0] : P.trees[1]; ctx.beginPath(); ctx.arc(r() * w, h * (0.95 + r() * 0.05), 12 + r() * 24, 0, PI * 2); ctx.fill(); }
    });
    t.wrapS = T.RepeatWrapping; t.repeat.set(2, 1);
    return t;
  }

  /** Janela com moldura, peitoril, vidro e vista lá fora (dentro do grupo da parede). */
  function windowUnit(k, wall, o) {
    // o: {x, y0, w, h, th, frame, viewMat, mullions, sill}
    const g = grp({ parent: wall, pos: [o.x, o.y0, 0] });
    const fc = o.frame || '#f4f0e8', fw = 0.06, th = o.th || 0.14;
    // marco (contorno dentro do vão)
    bx(o.w, fw, th + 0.02, fc, { parent: g, pos: [0, fw / 2, -th / 2], cast: false });
    bx(o.w, fw, th + 0.02, fc, { parent: g, pos: [0, o.h - fw / 2, -th / 2], cast: false });
    bx(fw, o.h, th + 0.02, fc, { parent: g, pos: [-o.w / 2 + fw / 2, o.h / 2, -th / 2], cast: false });
    bx(fw, o.h, th + 0.02, fc, { parent: g, pos: [o.w / 2 - fw / 2, o.h / 2, -th / 2], cast: false });
    // folhas/caixilhos
    const mul = o.mullions == null ? 1 : o.mullions;
    for (let i = 1; i <= mul; i++) bx(0.04, o.h - 2 * fw, 0.05, fc, { parent: g, pos: [-o.w / 2 + (o.w * i) / (mul + 1), o.h / 2, -th * 0.55], cast: false });
    if (o.transom) bx(o.w - 2 * fw, 0.04, 0.05, fc, { parent: g, pos: [0, o.h * o.transom, -th * 0.55], cast: false });
    // peitoril
    if (o.sill !== false) rb(o.w + 0.16, 0.04, 0.2, 0.01, o.sillColor || '#ece6dc', { parent: g, pos: [0, -0.02, 0.04], cast: false }, 1);
    // vidro
    const glass = pl(o.w - 2 * fw, o.h - 2 * fw, M.glass('#cfe6ff', 0.12), { parent: g, pos: [0, o.h / 2, -th * 0.6], cast: false });
    glass.receiveShadow = false;
    glass.renderOrder = 2;
    // vista
    if (o.viewMat) {
      const vw = o.w + 0.16, vh = o.h + 0.16;
      const v = pl(vw, vh, o.viewMat, { parent: g, pos: [0, o.h / 2, -th - 0.015], cast: false });
      v.receiveShadow = false;
      v.userData.live = true;
      g.userData.view = v;
    }
    return g;
  }
  /** Par de cortinas (+ voil opcional) e varão. */
  function curtains(wall, o) {
    // o: {x, w (vão), top, h, color, sheer, open(0..1), rod}
    const g = grp({ parent: wall, pos: [o.x, 0, 0.12] });
    const cw = o.panelW || 0.55;
    const mat = M.mat(o.color, { rough: 0.95, side: 'double' });
    const geo = curtainGeo(cw, o.h, 4, 0.035);
    const spread = o.w / 2 + (o.out || 0.12);
    [-1, 1].forEach((s) => {
      const m = M.mesh(geo, mat, { parent: g, pos: [s * (spread - cw / 2 + 0.05), o.top - o.h / 2, 0.02], cast: false });
      m.receiveShadow = true;
    });
    if (o.sheer) {
      const sm = M.mat(o.sheer, { rough: 1, opacity: 0.55, transparent: true, side: 'double' });
      const sg = curtainGeo(o.w + 0.1, o.h - 0.05, 7, 0.02);
      const s = M.mesh(sg, sm, { parent: g, pos: [0, o.top - (o.h - 0.05) / 2, -0.03], cast: false });
      s.receiveShadow = false;
      s.renderOrder = 3;
    }
    cy(0.012, 0.012, o.w + 0.5, o.rod || '#3a3430', { parent: g, pos: [0, o.top + 0.04, 0.0], rot: [0, 0, PI / 2], cast: false }, 8);
    [-1, 1].forEach((s) => sp(0.025, o.rod || '#3a3430', { parent: g, pos: [s * (o.w / 2 + 0.25), o.top + 0.04, 0], cast: false }, 8, 6));
    return g;
  }
  /** Porta com batente e maçaneta (no grupo da parede). */
  function doorUnit(wall, o) {
    const g = grp({ parent: wall, pos: [o.x, 0, 0] });
    const th = o.th || 0.14, w = o.w || 0.84, h = o.h || 2.1;
    const fc = o.frame || '#f2ede4';
    bx(0.07, h + 0.07, 0.03, fc, { parent: g, pos: [-w / 2 - 0.035, (h + 0.07) / 2, 0.015], cast: false });
    bx(0.07, h + 0.07, 0.03, fc, { parent: g, pos: [w / 2 + 0.035, (h + 0.07) / 2, 0.015], cast: false });
    bx(w + 0.14, 0.07, 0.03, fc, { parent: g, pos: [0, h + 0.035, 0.015], cast: false });
    bx(w, h, th, M.mat('#2e2b30', { rough: 1 }), { parent: g, pos: [0, h / 2, -th / 2 - 0.02], cast: false }); // fundo do vão
    const leaf = rb(w - 0.02, h - 0.01, 0.045, 0.01, o.color || '#a0714c', { parent: g, pos: [0, h / 2, -0.03], cast: false }, 1);
    leaf.receiveShadow = true;
    if (o.panels !== false) {
      const pc = o.panelColor || mix(o.color || '#a0714c', '#000000', 0.08);
      rb(w - 0.2, h * 0.36, 0.012, 0.005, pc, { parent: g, pos: [0, h * 0.73, -0.004], cast: false }, 1);
      rb(w - 0.2, h * 0.36, 0.012, 0.005, pc, { parent: g, pos: [0, h * 0.3, -0.004], cast: false }, 1);
    }
    const hx = (o.hinge === 'left' ? 1 : -1) * (w / 2 - 0.08);
    rb(0.03, 0.12, 0.02, 0.008, '#c9a25a', { parent: g, pos: [hx, 1.02, 0.0], cast: false }, 1);
    rb(0.12, 0.022, 0.022, 0.01, M.mat('#d8b46a', { rough: 0.3, metal: 0.7 }), { parent: g, pos: [hx - Math.sign(hx) * 0.05, 1.02, 0.03], cast: false }, 1);
    return g;
  }
  /** Quadro com moldura e passe-partout. */
  function picture(parent, o) {
    // o: {pos, rot, w, h, map(mat), frame, mat(passe), depth}
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    const fw = o.fw || 0.03, d = o.depth || 0.03;
    rb(o.w, o.h, d, 0.006, o.frame || '#2b2522', { parent: g, pos: [0, 0, d / 2], cast: false }, 1);
    if (o.passe !== false) pl(o.w - fw * 2, o.h - fw * 2, o.passe || '#f6f1e7', { parent: g, pos: [0, 0, d + 0.001], cast: false });
    const inset = o.passe !== false ? (o.inset || 0.05) : fw;
    pl(o.w - 2 * inset - (o.passe !== false ? fw : 0), o.h - 2 * inset - (o.passe !== false ? fw : 0), o.img, { parent: g, pos: [0, 0, d + 0.002], cast: false });
    if (o.stand) { // porta-retrato de mesa: inclina e põe apoio
      g.rotation.x = -0.12;
      bx(0.02, o.h * 0.8, 0.02, o.frame || '#2b2522', { parent: g, pos: [0, -o.h * 0.1, -0.06], rot: [0.45, 0, 0], cast: false });
    }
    return g;
  }
  /** Fileira de livros ao longo de x local. */
  const BOOK_COLS = ['#7a2e2e', '#24324f', '#d9c7a1', '#2f6b5a', '#c8653f', '#e0a33a', '#5a4a7a', '#efe7da', '#3b3b44'];
  function books(parent, o) {
    // o: {pos, rot, len, h, d, seed, lean, cols}
    const r = M.rng(o.seed || 3);
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    let x = -o.len / 2;
    const cols = o.cols || BOOK_COLS;
    while (x < o.len / 2 - 0.02) {
      const bw = 0.022 + r() * 0.03, bh = (o.h || 0.24) * (0.72 + r() * 0.28), bd = (o.d || 0.17) * (0.85 + r() * 0.15);
      if (x + bw > o.len / 2) break;
      const lean = r() > 0.93 && o.lean !== false ? 0.18 : 0;
      bx(bw, bh, bd, M.mat(cols[Math.floor(r() * cols.length)], { rough: 0.8 }), { parent: g, pos: [x + bw / 2 + lean * bh * 0.5, bh / 2, 0], rot: [0, 0, -lean], cast: false });
      x += bw + (lean ? 0.03 : 0.002);
      if (r() > 0.88) x += 0.04 + r() * 0.06;
    }
    return g;
  }
  /** Pilha de livros deitados. */
  function bookStack(parent, o) {
    const r = M.rng(o.seed || 9);
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    let y = 0;
    for (let i = 0; i < (o.n || 3); i++) {
      const h = 0.025 + r() * 0.025, w = (o.w || 0.22) * (0.8 + r() * 0.2), d = (o.d || 0.16) * (0.85 + r() * 0.15);
      rb(w, h, d, 0.004, BOOK_COLS[Math.floor(r() * BOOK_COLS.length)], { parent: g, pos: [(r() - 0.5) * 0.02, y + h / 2, 0], rot: [0, (r() - 0.5) * 0.3, 0], cast: false }, 1);
      bx(w - 0.01, h * 0.8, d * 0.96, '#f4ecdc', { parent: g, pos: [0.006, y + h / 2, 0], rot: [0, 0, 0], cast: false });
      y += h;
    }
    g.userData.h = y;
    return g;
  }
  /** Plantas estilizadas. kind: costela (monstera) | espada | samambaia | ervas | palmeira | flor */
  function plant(parent, kind, o) {
    o = o || {};
    const r = M.rng(o.seed || 21);
    const g = grp({ parent, pos: o.pos, scale: o.scale });
    const potC = o.pot || '#c06a46';
    const ph = o.potH == null ? 0.32 : o.potH, pr = o.potR || 0.17;
    if (ph > 0) {
      if (o.potKind === 'cesto') {
        cy(pr, pr * 0.85, ph, '#c9a878', { parent: g, pos: [0, ph / 2, 0], cast: true }, 18);
        for (let i = 0; i < 3; i++) tor(pr * (0.88 + i * 0.03), 0.008, '#a8865a', { parent: g, pos: [0, ph * (0.25 + i * 0.27), 0], rot: [PI / 2, 0, 0], cast: false });
      } else {
        lathe('pot' + pr + ph, [[0.001, 0], [pr * 0.78, 0], [pr * 0.92, ph * 0.5], [pr, ph * 0.92], [pr * 1.06, ph * 0.95], [pr * 1.06, ph], [pr * 0.9, ph], [pr * 0.9, ph * 0.9]], potC, { parent: g, cast: true }, 18);
      }
      cy(pr * 0.88, pr * 0.88, 0.01, '#4a3426', { parent: g, pos: [0, ph * 0.9, 0], cast: false }, 14);
    }
    const leafM = M.mat(o.leaf || '#3f8a4f', { rough: 0.7, side: 'double' });
    const leafM2 = M.mat(o.leaf2 || '#2f7342', { rough: 0.7, side: 'double' });
    const stemM = M.mat(o.stem || '#4c7a3a');
    const top = ph * 0.9;
    if (kind === 'costela') {
      const n = o.n || 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2 + r() * 0.5, tilt = 0.5 + r() * 0.6, len = (o.size || 0.55) * (0.7 + r() * 0.5);
        const lg = grp({ parent: g, pos: [0, top, 0], rot: [0, a, 0] });
        cy(0.006, 0.008, len, stemM, { parent: lg, pos: [0, len / 2 * Math.cos(tilt * 0.6), len / 2 * Math.sin(tilt * 0.6)], rot: [tilt * 0.6, 0, 0], cast: false }, 5);
        const leaf = M.mesh(leafGeo(len * 0.62, len * 0.55), i % 2 ? leafM : leafM2, { parent: lg, pos: [0, len * Math.cos(tilt * 0.6), len * Math.sin(tilt * 0.6)], rot: [tilt + 0.5 - PI / 2, 0, 0] });
        leaf.castShadow = true;
      }
    } else if (kind === 'espada') {
      const n = o.n || 9;
      for (let i = 0; i < n; i++) {
        const a = r() * PI * 2, hgt = (o.size || 0.7) * (0.6 + r() * 0.5), d = r() * pr * 0.5;
        const leaf = M.mesh(leafGeo(hgt, 0.09), i % 3 ? leafM : M.mat(o.leaf3 || '#8aa84a', { rough: 0.7, side: 'double' }), { parent: g, pos: [Math.cos(a) * d, top, Math.sin(a) * d], rot: [(r() - 0.5) * 0.25, a, (r() - 0.5) * 0.25] });
        leaf.castShadow = true;
      }
    } else if (kind === 'samambaia') {
      const n = o.n || 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * PI * 2 + r() * 0.3, len = (o.size || 0.45) * (0.7 + r() * 0.4);
        const lg = grp({ parent: g, pos: [0, top, 0], rot: [0, a, 0] });
        M.mesh(leafGeo(len, 0.1), i % 2 ? leafM : leafM2, { parent: lg, pos: [0, 0.02, 0], rot: [0.7 + r() * 0.7 - PI / 2 + 1.2, 0, 0], cast: false });
      }
    } else if (kind === 'ervas') {
      for (let i = 0; i < (o.n || 7); i++) sp(0.045 + r() * 0.03, i % 2 ? leafM : leafM2, { parent: g, pos: [(r() - 0.5) * pr * 1.3, top + 0.04 + r() * 0.08, (r() - 0.5) * pr * 1.3], scale: [1, 0.8, 1], cast: false }, 8, 6);
    } else if (kind === 'palmeira') {
      const hgt = o.size || 1.3;
      cy(0.025, 0.035, hgt, '#7a6a4a', { parent: g, pos: [0, top + hgt / 2, 0] }, 7);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * PI * 2 + r() * 0.3;
        const lg = grp({ parent: g, pos: [0, top + hgt, 0], rot: [0, a, 0] });
        M.mesh(leafGeo(0.75, 0.16), i % 2 ? leafM : leafM2, { parent: lg, rot: [0.25 + r() * 0.4, 0, 0] }).castShadow = true;
      }
    } else if (kind === 'flor') {
      for (let i = 0; i < (o.n || 6); i++) {
        const a = r() * PI * 2, d = r() * 0.03, hgt = 0.18 + r() * 0.12;
        cy(0.003, 0.003, hgt, stemM, { parent: g, pos: [Math.cos(a) * d, top + hgt / 2, Math.sin(a) * d], rot: [(r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4], cast: false }, 4);
        sp(0.028, (o.flowers || ['#f2c94c', '#ff8a65', '#ffffff'])[i % 3], { parent: g, pos: [Math.cos(a) * (d + 0.03), top + hgt, Math.sin(a) * (d + 0.03)], scale: [1, 0.7, 1], cast: false }, 8, 6);
      }
      for (let i = 0; i < 4; i++) M.mesh(leafGeo(0.12, 0.05), leafM, { parent: g, pos: [0, top + 0.03, 0], rot: [-0.9, i * 1.6, 0], cast: false });
    }
    return g;
  }
  /** Cadeira de jantar (madeira + assento estofado). spot = centro do assento. */
  function chair(parent, o) {
    const g = grp({ parent, pos: [o.x, 0, o.z], rot: [0, o.rot || 0, 0] });
    const wood = o.wood || '#8a5a3a', seat = o.seat || '#d9c3a0';
    const sh = 0.45;
    [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]].forEach(([x, z]) => cy(0.018, 0.014, sh - 0.03, wood, { parent: g, pos: [x, (sh - 0.03) / 2, z] }, 8));
    rb(0.44, 0.04, 0.42, 0.012, wood, { parent: g, pos: [0, sh - 0.04, 0] }, 1);
    rb(0.42, 0.05, 0.4, 0.02, seat, { parent: g, pos: [0, sh, 0.005] }, 2);
    // encosto (atrás = -z local)
    [-0.19, 0.19].forEach((x) => cy(0.016, 0.016, 0.48, wood, { parent: g, pos: [x, sh + 0.22, -0.19], rot: [-0.08, 0, 0] }, 8));
    if (o.back === 'palha') {
      rb(0.4, 0.2, 0.025, 0.01, wood, { parent: g, pos: [0, sh + 0.33, -0.21], rot: [-0.08, 0, 0] }, 1);
      rb(0.34, 0.15, 0.03, 0.004, o.cane || '#e2c98f', { parent: g, pos: [0, sh + 0.33, -0.21], rot: [-0.08, 0, 0] }, 1);
    } else {
      rb(0.42, 0.12, 0.03, 0.012, wood, { parent: g, pos: [0, sh + 0.4, -0.215], rot: [-0.08, 0, 0] }, 1);
      rb(0.38, 0.03, 0.025, 0.008, wood, { parent: g, pos: [0, sh + 0.2, -0.2], rot: [-0.08, 0, 0] }, 1);
    }
    return g;
  }
  /** Xícara com pires. */
  function cup(parent, o) {
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    const c = o.color || '#f6f1e8';
    if (o.saucer !== false) cy(0.065, 0.05, 0.012, c, { parent: g, pos: [0, 0.006, 0], cast: false }, 16);
    lathe('cup', [[0.001, 0], [0.03, 0], [0.04, 0.02], [0.044, 0.065], [0.04, 0.065], [0.036, 0.022], [0.001, 0.02]], c, { parent: g, pos: [0, 0.012, 0], cast: false }, 16);
    tor(0.017, 0.005, c, { parent: g, pos: [0.046, 0.05, 0], rot: [0, 0, 0], cast: false });
    if (o.coffee !== false) cy(0.037, 0.037, 0.004, '#4a2a18', { parent: g, pos: [0, 0.067, 0], cast: false }, 14);
    if (o.band) cy(0.0445, 0.0435, 0.012, o.band, { parent: g, pos: [0, 0.06, 0], cast: false }, 16);
    return g;
  }
  function mug(parent, o) {
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    cy(0.042, 0.04, 0.1, o.color || '#2f6b5a', { parent: g, pos: [0, 0.05, 0], cast: false }, 16);
    cy(0.036, 0.036, 0.004, '#4a2a18', { parent: g, pos: [0, 0.092, 0], cast: false }, 12);
    tor(0.025, 0.007, o.color || '#2f6b5a', { parent: g, pos: [0.045, 0.05, 0], cast: false });
    return g;
  }
  /** Garrafa térmica clássica (de pressão, com alça). */
  function garrafaTermica(parent, o) {
    const g = grp({ parent, pos: o.pos, rot: o.rot });
    const c = o.color || '#c8453a';
    lathe('garrafa', [[0.001, 0], [0.068, 0], [0.072, 0.02], [0.072, 0.22], [0.066, 0.25], [0.05, 0.27], [0.001, 0.27]], c, { parent: g }, 18);
    cy(0.073, 0.073, 0.02, '#e8e2d8', { parent: g, pos: [0, 0.03, 0], cast: false }, 18);
    cy(0.052, 0.058, 0.06, '#efe9df', { parent: g, pos: [0, 0.295, 0], cast: false }, 16);
    rb(0.05, 0.035, 0.045, 0.01, '#efe9df', { parent: g, pos: [0, 0.335, 0], cast: false }, 1);
    cy(0.012, 0.016, 0.06, '#efe9df', { parent: g, pos: [0.06, 0.29, 0], rot: [0, 0, -1.0], cast: false }, 8);
    tor(0.07, 0.011, '#efe9df', { parent: g, pos: [-0.07, 0.16, 0], rot: [0, 0, PI / 2], cast: false }, PI);
    return g;
  }
  /** Fruteira com frutas. */
  function fruitBowl(parent, o) {
    const g = grp({ parent, pos: o.pos });
    const r = M.rng(o.seed || 4);
    lathe('fruteira', [[0.001, 0], [0.06, 0], [0.07, 0.015], [0.16, 0.06], [0.175, 0.085], [0.165, 0.085], [0.15, 0.065], [0.06, 0.028], [0.001, 0.028]], o.color || '#d8c9a8', { parent: g }, 22);
    const fruits = [['#f28c28', 0.042], ['#f2a53a', 0.04], ['#e04a3a', 0.038], ['#9ac04a', 0.036], ['#f28c28', 0.042], ['#ffd34d', 0.035]];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + r() * 0.4, d = i < 5 ? 0.075 : 0;
      const f = fruits[i];
      sp(f[1], M.mat(f[0], { rough: 0.5 }), { parent: g, pos: [Math.cos(a) * d, 0.07 + (i < 5 ? 0 : 0.05), Math.sin(a) * d], cast: false }, 12, 8);
    }
    // cacho de bananas
    const bg = grp({ parent: g, pos: [0.02, 0.135, 0.02], rot: [0.2, 0.6, 0.15] });
    for (let i = 0; i < 4; i++) M.mesh(M.torusGeo(0.07, 0.016, 6, 10, 1.6), M.mat('#f5d046', { rough: 0.55 }), { parent: bg, pos: [0, 0, (i - 1.5) * 0.026], rot: [0, 0, 0.8 + i * 0.05], cast: false });
    return g;
  }
  /** Abajur de mesa (base cerâmica + cúpula). Devolve {g, shade, bulbPos}. */
  function tableLamp(k, parent, o) {
    const g = grp({ parent, pos: o.pos });
    // base de cerâmica em gota (perfil denso: com a lâmpada logo acima, um perfil grosso mostrava facetas escuras)
    lathe('lampbase2', [[0.001, 0], [0.058, 0], [0.072, 0.008], [0.083, 0.03], [0.09, 0.06], [0.092, 0.09], [0.088, 0.118], [0.077, 0.145], [0.06, 0.172], [0.042, 0.196], [0.028, 0.216], [0.022, 0.232], [0.024, 0.244], [0.001, 0.246]], o.base || '#cf8a5a', { parent: g }, 30);
    cy(0.006, 0.006, 0.14, '#c9a25a', { parent: g, pos: [0, 0.31, 0], cast: false }, 6);
    const shadeMat = k.umat(o.shade || '#f3e6cc', { rough: 0.9, side: 'double', emissive: o.glow || '#ffb45e', emissiveIntensity: 0 });
    const shade = M.mesh(M.cylGeo(0.11, 0.16, 0.19, 22, true), shadeMat, { parent: g, pos: [0, 0.4, 0] });
    shade.castShadow = false;
    shade.userData.live = true;
    return { g, shade, mat: shadeMat, bulb: new T.Vector3(o.pos[0], o.pos[1] + 0.43, o.pos[2]) };
  }

  /** Ventilador de teto (corpo claro + pás de madeira + cúpula leitosa). As pás ficam num grupo vivo que gira no update. */
  function ceilingFan(parent, o) {
    o = o || {};
    const g = grp({ parent, pos: o.pos, name: 'ventilador' });
    g.userData.live = true;
    const body = M.mat(o.body || '#efe9df', { rough: 0.45 });
    const metal = M.mat(o.metal || '#c9a25a', { rough: 0.35, metal: 0.7 });
    const drop = o.drop || 0.3;
    cy(0.075, 0.06, 0.05, body, { parent: g, pos: [0, -0.025, 0], cast: false }, 18); // canopla
    cy(0.012, 0.012, drop, metal, { parent: g, pos: [0, -drop / 2, 0], cast: false }, 8); // haste
    lathe('fanmotor', [[0.001, -0.06], [0.06, -0.06], [0.11, -0.04], [0.125, 0], [0.11, 0.045], [0.06, 0.07], [0.001, 0.07]], body, { parent: g, pos: [0, -drop - 0.04, 0], cast: false }, 20);
    tor(0.12, 0.008, metal, { parent: g, pos: [0, -drop - 0.04, 0], rot: [PI / 2, 0, 0], cast: false });
    const blades = grp({ parent: g, pos: [0, -drop - 0.035, 0] });
    blades.userData.live = true;
    const wood = M.mat(o.wood || '#a8744c', { rough: 0.6 });
    const n = o.n || 4;
    for (let i = 0; i < n; i++) {
      const arm = grp({ parent: blades, rot: [0, (i / n) * PI * 2, 0] });
      rb(0.16, 0.014, 0.04, 0.006, metal, { parent: arm, pos: [0.17, -0.004, 0], cast: false }, 1);
      rb(0.56, 0.012, 0.135, 0.01, wood, { parent: arm, pos: [0.5, 0, 0], rot: [0.1, 0, 0], cast: false }, 1);
    }
    const dome = M.mesh(M.sphereGeo(0.095, 18, 10), o.lightMat || M.mat('#f6efe2', { rough: 0.3 }), { parent: g, pos: [0, -drop - 0.1, 0], scale: [1, 0.62, 1], cast: false });
    dome.userData.live = !!o.lightMat;
    bake(blades);
    bake(g);
    return { g, blades };
  }

  // ------------------------------------------------------------------
  // Luz: pacote com presets por humor
  // ------------------------------------------------------------------
  function lights(root, preset, area) {
    const L = M.lighting(preset, { area: area || 4.6 });
    root.add(L.group);
    L.sun.shadow.camera.near = 1;
    L.sun.shadow.camera.far = 30;
    L.sun.shadow.camera.updateProjectionMatrix();
    return L;
  }
  function lerpPreset(a, b, t) {
    const o = {};
    ['sky', 'ground', 'sun'].forEach((key) => (o[key] = M.mix(a[key], b[key], t)));
    ['hemi', 'sunI', 'amb'].forEach((key) => (o[key] = a[key] + (b[key] - a[key]) * t));
    o.sunPos = a.sunPos.map((v, i) => v + (b.sunPos[i] - v) * t);
    return o;
  }
  function setBg(color) {
    const sc = P2.core && P2.core.scene;
    if (sc && sc.background && sc.background.isColor) sc.background.set(color);
  }
  function setFog(color) {
    const sc = P2.core && P2.core.scene;
    if (sc && sc.fog && sc.fog.color) sc.fog.color.set(color);
  }

  // ==================================================================
  // QUARTO — 6h47, madrugada azul com abajur quente
  // ==================================================================
  ENVS.quarto = {
    name: 'Quarto',
    build(params) {
      const k = kit();
      const root = grp({ name: 'env:quarto' });
      const W = 5.2, D = 4.4, H = 2.7;
      const floorMat = k.tmat(woodFloorTex(k, '#b88a5e', { seed: 3, dark: '#6a4428', light: '#e2c093' }), { rough: 0.62 });
      const wallMat = M.mat('#cfc6ba', { rough: 0.95 });
      const S = shell(k, root, {
        w: W, d: D, h: H, floorMat, wallMat, floorTile: 1.8,
        wallMats: { back: M.mat('#c9c0b4', { rough: 0.95 }) },
        openings: { left: [{ x: 0.35, w: 1.5, y0: 0.85, h: 1.45 }], right: [{ x: 1.35, w: 0.86, y0: 0, h: 2.12 }] },
        base: '#26243a', slab: '#cbbba5', trim: '#a88a5a',
        ceiling: { color: '#efe9e0', sanca: 0.42, led: '#ffc98a', spots: [[-1.25, -1.2], [1.25, -1.2], [-1.25, 1.1], [1.25, 1.1]] },
      });
      const WB = S.wallGroups;
      const deco = grp({ parent: root, name: 'decor' });
      const live = grp({ parent: root, name: 'live' });
      live.userData.live = true;
      // ventilador de teto (some junto com o forro nas vistas de cima; é o que se vê deitado na cama)
      const fan = ceilingFan(S.ceiling, { pos: [-0.2, H, -0.5], drop: 0.26, wood: '#93633f' });

      // --- Parede do fundo: painel ripado + cabeceira estofada
      const slatMat = M.mat('#7a4e33', { rough: 0.7 });
      bx(3.3, H - 0.02, 0.02, '#4a3022', { parent: WB.back, pos: [0, H / 2, 0.01], cast: false });
      for (let i = 0; i < 34; i++) bx(0.055, H - 0.04, 0.035, slatMat, { parent: WB.back, pos: [-1.62 + i * 0.098, H / 2, 0.035], cast: false });
      // arandelas (luz indireta sobre o painel)
      // cabeceira (capitonê em gomos verticais)
      const velvet = M.mat('#365a6e', { rough: 0.85 });
      rb(1.95, 0.72, 0.08, 0.03, '#2d4a5a', { parent: deco, pos: [0, 0.86, -2.09] }, 2);
      for (let i = 0; i < 7; i++) rb(0.27, 0.66, 0.1, 0.05, velvet, { parent: deco, pos: [-0.83 + i * 0.277, 0.87, -2.04] }, 3);
      // costas acabadas da cabeceira (chapa de madeira + 2 pés): nas órbitas por trás, com a parede do fundo
      // escondida, ela aparecia como uma laje preta flutuando atrás da cama
      rb(1.9, 0.68, 0.012, 0.004, '#a07a56', { parent: deco, pos: [0, 0.86, -2.136], cast: false }, 1);
      [-0.9, 0.9].forEach((x) => bx(0.05, 0.52, 0.04, '#6e4a32', { parent: deco, pos: [x, 0.26, -2.11], cast: false }));

      // --- Cama box com saia + colchão + roupa de cama
      const bed = grp({ parent: deco, pos: [0, 0, -1.02] });
      rb(1.66, 0.3, 2.06, 0.03, '#d9cfc0', { parent: bed, pos: [0, 0.2, 0] }, 2);              // box
      bx(1.7, 0.05, 2.1, '#8c8478', { parent: bed, pos: [0, 0.025, 0], cast: false });           // rodapé da box
      rb(1.62, 0.18, 2.02, 0.06, '#f4f1ea', { parent: bed, pos: [0, 0.43, 0] }, 3);             // colchão + lençol
      // travesseiros
      rb(0.66, 0.16, 0.4, 0.07, '#f7f4ee', { parent: bed, pos: [0.38, 0.58, -0.78], rot: [-0.25, 0.02, 0] }, 3);
      rb(0.44, 0.38, 0.12, 0.06, '#c8653f', { parent: bed, pos: [0.52, 0.73, -0.86], rot: [-0.2, -0.12, 0] }, 3);
      rb(0.4, 0.34, 0.12, 0.06, '#e0a33a', { parent: bed, pos: [0.18, 0.7, -0.78], rot: [-0.15, 0.1, 0.05] }, 3);
      // edredom: versão lisa e versão "com alguém dormindo"
      const duvetMat = M.mat('#dfe5ea', { rough: 0.9 });
      const foldMat = M.mat('#f7f4ee', { rough: 0.9 });
      const duvetFlat = grp({ parent: bed, name: 'duvetFlat' });
      duvetFlat.userData.live = true;
      rb(1.74, 0.34, 1.42, 0.07, duvetMat, { parent: duvetFlat, pos: [0, 0.42, 0.33] }, 3);
      rb(1.75, 0.09, 0.3, 0.04, foldMat, { parent: duvetFlat, pos: [0, 0.6, -0.36] }, 2);
      rb(0.66, 0.16, 0.4, 0.07, '#f7f4ee', { parent: duvetFlat, pos: [-0.38, 0.58, -0.78], rot: [-0.25, 0, 0] }, 3);
      const duvetBody = grp({ parent: bed, name: 'duvetBody' });
      duvetBody.userData.live = true;
      rb(1.74, 0.34, 1.42, 0.07, duvetMat, { parent: duvetBody, pos: [0, 0.42, 0.33] }, 3);
      // volume do corpo sob o edredom: UM lençol moldado e contínuo (peito → pés), em vez de bolhas.
      // Medido na pose 'sleep' (malha com skinning; pés no ponto 'cama', corpo no eixo x = -0.38, z local da cama):
      // peito 0,79 m · barriga 0,76 · mãos ao lado do quadril 0,73 · pernas 0,69 · sapatos 0,81 (z 0,90–0,97).
      // O edredom passa ~3,5 cm acima, abre em "tenda" larga e cai na ponta dos pés; na cabeceira abraça os ombros.
      const BX = -0.38;
      const lift = (z) => keyed([[-0.42, 0.19], [-0.3, 0.205], [-0.2, 0.226], [-0.1, 0.212], [0.1, 0.206], [0.25, 0.196], [0.4, 0.138], [0.55, 0.13], [0.7, 0.126], [0.8, 0.14], [0.85, 0.172], [0.9, 0.238], [0.95, 0.252], [0.99, 0.205], [1.045, 0.05]], z);
      const wAt = (z) => keyed([[-0.42, 0.3], [-0.25, 0.44]], z); // largura da "tenda": estreita no peito (abraça os ombros)
      const across = (x, z) => 1 / (1 + Math.pow(Math.abs(x - BX) / wAt(z), 6));
      // topo do edredom liso (com as quinas arredondadas do bloco de baixo) + o volume do corpo por cima;
      // na cabeceira o bloco arredonda só nas laterais — sobre o peito o edredom continua alto
      const slabTop = (x, z, head) => {
        const ex = Math.max(0, Math.abs(x) - 0.8), ez = z < 0.33 ? (head ? Math.max(0, -0.31 - z) : 0) : Math.max(0, z - 0.97);
        const e = Math.min(0.07, Math.hypot(ex, ez));
        return 0.52 + Math.sqrt(Math.max(0, 0.0049 - e * e)) + 0.004;
      };
      const edgeFade = (x) => 1 - keyed([[0.74, 0], [0.86, 1]], Math.abs(x));
      const duvetH = (x, z) => {
        const a = across(x, z), s0 = slabTop(x, z, true);
        return s0 + (slabTop(x, z, false) - s0) * a + lift(z) * a * edgeFade(x);
      };
      M.mesh(sheetGeo(-0.87, 0.87, -0.4, 1.04, 36, 40, duvetH), duvetMat, { parent: duvetBody });
      // barra do lençol dobrada sobre o peito (faixa macia que acompanha o volume e se encaixa nas bordas)
      const foldH = (x, z) => duvetH(x, z) + Math.sin(Math.max(0, Math.min(1, (z + 0.42) / 0.26)) * PI) * 0.03 * edgeFade(x) - 0.002;
      M.mesh(sheetGeo(-0.87, 0.87, -0.42, -0.16, 36, 8, foldH), foldMat, { parent: duvetBody });
      // espessura da dobra na borda do peito: fecha a "tenda" para não se ver por baixo do edredom
      {
        const n = 36, pos = [], idx = [];
        for (let i = 0; i <= n; i++) { const x = -0.87 + (1.74 * i) / n; pos.push(x, foldH(x, -0.42), -0.42, x, 0.522, -0.42); }
        for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        g.userData.baked = true;
        M.mesh(g, M.mat('#f7f4ee', { rough: 0.9, side: 'double' }), { parent: duvetBody, cast: false });
      }
      // travesseiro afundado sob a cabeça
      rb(0.66, 0.08, 0.42, 0.04, '#f7f4ee', { parent: duvetBody, pos: [-0.38, 0.535, -0.78] }, 3);
      // manta mostarda nos pés: lisa (cama vazia) ou moldada sobre a tenda dos pés
      rb(1.8, 0.035, 0.5, 0.015, '#d9952f', { parent: duvetFlat, pos: [0, 0.6, 0.68] }, 1);
      M.mesh(sheetGeo(-0.9, 0.9, 0.43, 0.93, 36, 14, (x, z) => Math.max(duvetH(x, z), 0.6) + 0.017), M.mat('#d9952f', { rough: 0.9, side: 'double' }), { parent: duvetBody });
      rb(0.035, 0.3, 0.5, 0.015, '#d9952f', { parent: bed, pos: [-0.9, 0.46, 0.68] }, 1);
      rb(0.035, 0.3, 0.5, 0.015, '#d9952f', { parent: bed, pos: [0.9, 0.46, 0.68] }, 1);

      // --- Criados-mudos (pés palito)
      function nightstand(x) {
        const g = grp({ parent: deco, pos: [x, 0, -1.86] });
        rb(0.52, 0.34, 0.4, 0.02, '#a8744c', { parent: g, pos: [0, 0.4, 0] }, 2);
        rb(0.46, 0.12, 0.012, 0.004, '#93633f', { parent: g, pos: [0, 0.47, 0.2] }, 1);
        rb(0.46, 0.12, 0.012, 0.004, '#93633f', { parent: g, pos: [0, 0.33, 0.2] }, 1);
        [0.47, 0.33].forEach((y) => rb(0.1, 0.014, 0.014, 0.006, '#c9a25a', { parent: g, pos: [0, y, 0.21], cast: false }, 1));
        [[-0.21, -0.15], [0.21, -0.15], [-0.21, 0.15], [0.21, 0.15]].forEach(([a, b]) => cy(0.014, 0.01, 0.24, '#5a3a26', { parent: g, pos: [a, 0.12, b], rot: [b * 0.6, 0, -a * 0.5] }, 6));
        return g;
      }
      nightstand(-1.26);
      nightstand(1.26);
      const lampL = tableLamp(k, deco, { pos: [-1.38, 0.57, -1.95], base: '#d27f55', shade: '#f2e3c6' });
      const lampR = tableLamp(k, deco, { pos: [1.38, 0.57, -1.95], base: '#d27f55', shade: '#f2e3c6' });
      // livros, óculos e água (esquerdo)
      bookStack(deco, { pos: [-1.33, 0.57, -1.74], n: 2, seed: 4, w: 0.18, d: 0.13 });
      const glassW = M.mat('#d6ecff', { rough: 0.05, opacity: 0.45, transparent: true });
      cy(0.032, 0.028, 0.11, glassW, { parent: deco, pos: [-1.47, 0.625, -1.72], cast: false }, 12);
      // óculos de leitura (dobrado) sobre os livros
      const gl = grp({ parent: deco, pos: [-1.32, 0.64, -1.73], rot: [0, 0.4, 0] });
      tor(0.022, 0.003, '#2a2a32', { parent: gl, pos: [-0.028, 0, 0], rot: [PI / 2, 0, 0], cast: false });
      tor(0.022, 0.003, '#2a2a32', { parent: gl, pos: [0.028, 0, 0], rot: [PI / 2, 0, 0], cast: false });
      // direito: porta-retrato + planta pequena + livro
      picture(deco, { pos: [1.2, 0.57 + 0.09, -1.98], rot: [0, -0.35, 0], w: 0.16, h: 0.2, img: k.tmat(photoTex(k, 2), { rough: 0.5 }), frame: '#c9a25a', stand: true, inset: 0.025 });
      plant(deco, 'ervas', { pos: [1.47, 0.57, -1.74], potR: 0.06, potH: 0.08, seed: 8, pot: '#e8e0d4', n: 6, scale: 1 });
      bookStack(deco, { pos: [1.22, 0.57, -1.72], n: 1, seed: 12, w: 0.2, d: 0.14 });

      // --- Despertador digital (tela em canvas) e celular
      const clockG = grp({ parent: deco, pos: [-1.12, 0.57, -1.84], rot: [0, 0.45, 0] });
      clockG.userData.live = true;
      rb(0.2, 0.085, 0.08, 0.025, '#2a2830', { parent: clockG, pos: [0, 0.043, 0] }, 2);
      const clockTex = k.tex(512, 192, () => {});
      const clockFace = pl(0.17, 0.064, k.bmat(clockTex, { toneMapped: false }), { parent: clockG, pos: [0, 0.045, 0.0405], cast: false });
      clockFace.userData.live = true;
      const clockGlow = M.glow('#ff3b3b', 0.42, 0.0);
      clockGlow.position.set(-1.12 + 0.03, 0.66, -1.78);
      live.add(clockGlow);
      const phoneG = grp({ parent: deco, pos: [-1.17, 0.572, -1.67], rot: [0, -0.3, 0] });
      rb(0.075, 0.009, 0.155, 0.008, '#1d1d24', { parent: phoneG, pos: [0, 0.0045, 0] }, 2);
      const phoneTex = k.tex(256, 512, () => {});
      const phoneScreen = pl(0.066, 0.142, k.bmat(phoneTex, { toneMapped: false }), { parent: phoneG, pos: [0, 0.0095, 0], rot: [-PI / 2, 0, 0], cast: false });
      phoneScreen.userData.live = true;
      const phoneGlow = M.glow('#bcd8ff', 0.5, 0);
      phoneGlow.position.set(-1.17, 0.64, -1.67);
      live.add(phoneGlow);

      // --- Calçadeira aos pés da cama
      const bench = grp({ parent: deco, pos: [0, 0, 0.32] });
      rb(1.3, 0.12, 0.42, 0.05, '#7f8f6a', { parent: bench, pos: [0, 0.4, 0] }, 3);
      [[-0.58, -0.16], [0.58, -0.16], [-0.58, 0.16], [0.58, 0.16]].forEach(([a, b]) => cy(0.018, 0.012, 0.34, '#5a3a26', { parent: bench, pos: [a, 0.17, b] }, 6));
      rb(0.36, 0.08, 0.3, 0.03, '#efe7da', { parent: bench, pos: [0.38, 0.5, 0.0], rot: [0, 0.15, 0] }, 2);
      rb(0.34, 0.06, 0.28, 0.025, '#d6c8b2', { parent: bench, pos: [0.38, 0.565, 0.0], rot: [0, 0.05, 0] }, 2);

      // --- Puff de tricô (canto da frente, ao lado da cômoda) com o pijama dobrado
      const pouf = grp({ parent: deco, pos: [1.28, 0, 1.78] });
      cy(0.25, 0.24, 0.36, M.mat('#d9952f', { rough: 1 }), { parent: pouf, pos: [0, 0.18, 0] }, 24);
      for (let i = 0; i < 4; i++) tor(0.248, 0.018, M.mat('#c9852a', { rough: 1 }), { parent: pouf, pos: [0, 0.06 + i * 0.08, 0], rot: [PI / 2, 0, 0], cast: false });
      sp(0.25, M.mat('#d9952f', { rough: 1 }), { parent: pouf, pos: [0, 0.36, 0], scale: [1, 0.16, 1], cast: false }, 24, 8);
      rb(0.3, 0.05, 0.24, 0.02, '#8fa3b8', { parent: pouf, pos: [0.02, 0.41, 0.0], rot: [0, 0.35, 0] }, 2);

      // --- Tapete
      const rugMat = k.tmat(rugTex(k, { bg: '#e9dfcd', c1: '#c8653f', c2: '#2d4a5a', motif: 'linhas', fringe: '#f2ead9' }), { rough: 1 });
      pl(2.9, 2.2, rugMat, { parent: deco, pos: [0, 0.006, -0.45], rot: [-PI / 2, 0, 0], cast: false });
      // chinelos (pantufas)
      [[-1.0, -0.45, 0.25], [-0.86, -0.38, 0.05]].forEach(([x, z, a]) => {
        const s = grp({ parent: deco, pos: [x, 0.006, z], rot: [0, a, 0] });
        rb(0.1, 0.03, 0.27, 0.014, '#e8dfd2', { parent: s, pos: [0, 0.015, 0] }, 1);
        rb(0.1, 0.06, 0.11, 0.04, '#24324f', { parent: s, pos: [0, 0.045, 0.06] }, 2);
      });

      // --- Parede esquerda: janela de madrugada + cortinas + poltrona com o paletó
      const dawnSky = viewTex(k, { seed: 5, sky: ['#141b3f', '#2c2f68', '#5d4a8a', '#c0708a', '#f6b483'], stars: true, windows: 0.86, winColor: (v) => (v > 0.95 ? '#ffd27a' : 'rgba(255,214,150,0.75)'), layers: [['#3a3566', 0.62, 0.3], ['#28264c', 0.7, 0.26], ['#191935', 0.82, 0.2]] });
      const nightSky = viewTex(k, { seed: 6, sky: ['#070b1c', '#101a3a', '#1d2b55', '#2b3566'], stars: true, moon: [0.7, 0.18], windows: 0.8, layers: [['#1a2142', 0.62, 0.3], ['#121834', 0.7, 0.26], ['#0b1026', 0.82, 0.2]] });
      const viewMat = k.bmat(dawnSky, { fog: false });
      const win = windowUnit(k, WB.left, { x: 0.35, y0: 0.85, w: 1.5, h: 1.45, viewMat, mullions: 1, frame: '#efe9df' });
      curtains(WB.left, { x: 0.35, w: 1.5, top: 2.48, h: 2.4, color: '#5b6f86', sheer: '#f4efe6', out: 0.18, panelW: 0.5 });
      // ar-condicionado split (parede da frente, alto)
      // poltrona de leitura
      const arm = grp({ parent: deco, pos: [-1.95, 0, 1.15], rot: [0, 0.75, 0] });
      rb(0.78, 0.22, 0.74, 0.08, '#c7b39a', { parent: arm, pos: [0, 0.3, 0] }, 2);
      rb(0.66, 0.12, 0.6, 0.06, '#d8c6ad', { parent: arm, pos: [0, 0.44, 0.04] }, 3);
      rb(0.78, 0.5, 0.16, 0.07, '#c7b39a', { parent: arm, pos: [0, 0.62, -0.3], rot: [-0.12, 0, 0] }, 3);
      [-1, 1].forEach((s) => rb(0.12, 0.26, 0.7, 0.05, '#c7b39a', { parent: arm, pos: [s * 0.36, 0.5, 0] }, 2));
      [[-0.32, -0.28], [0.32, -0.28], [-0.32, 0.28], [0.32, 0.28]].forEach(([a, b]) => cy(0.016, 0.012, 0.2, '#5a3a26', { parent: arm, pos: [a, 0.1, b] }, 6));
      // paletó azul-marinho jogado no encosto + gravata
      rb(0.56, 0.5, 0.06, 0.03, '#24324f', { parent: arm, pos: [0.02, 0.72, -0.4], rot: [-0.35, 0.05, 0.04] }, 2);
      rb(0.5, 0.08, 0.3, 0.03, '#24324f', { parent: arm, pos: [0.02, 0.92, -0.31], rot: [0.35, 0.05, 0] }, 2);
      rb(0.06, 0.3, 0.012, 0.005, '#7a2434', { parent: arm, pos: [0.15, 0.52, 0.0], rot: [-1.35, 0.3, 0] }, 1);
      // pasta executiva ao lado
      const brief = grp({ parent: deco, pos: [-1.5, 0, 1.65], rot: [0, 0.3, 0] });
      rb(0.44, 0.32, 0.11, 0.025, '#5a3424', { parent: brief, pos: [0, 0.16, 0] }, 2);
      tor(0.05, 0.01, '#3a2218', { parent: brief, pos: [0, 0.34, 0], arc: PI });
      // espada-de-são-jorge no canto
      plant(deco, 'espada', { pos: [-2.25, 0, -1.92], potR: 0.17, potH: 0.36, seed: 3, pot: '#e8e0d4', size: 0.75 });

      // --- Parede direita: guarda-roupa embutido + porta
      // portas de carvalho claro (veio vertical) + uma porta-espelho com reflexo pintado
      const oakMat = k.tmat(k.tex(256, 512, (ctx, w, h) => {
        const r = M.rng(19);
        ctx.fillStyle = '#cfae84'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 46; i++) { ctx.strokeStyle = 'rgba(' + (120 + r() * 40 | 0) + ',80,40,' + (0.08 + r() * 0.12) + ')'; ctx.lineWidth = 1 + r() * 2; const x = r() * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + (r() - 0.5) * 20, h * 0.3, x + (r() - 0.5) * 20, h * 0.7, x + (r() - 0.5) * 12, h); ctx.stroke(); }
      }), { rough: 0.55 });
      // espelho: reflexo pintado do quarto em frente (forro, a janela da madrugada entre as cortinas, a cama e o piso),
      // levemente desfocado — de perto lê como espelho, não como um vão escuro
      const mirrorMat = k.tmat(k.tex(256, 1024, (ctx, w, h) => {
        ctx.filter = 'blur(3px)';
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#b7b9d6'); g.addColorStop(0.08, '#9ea2c4'); g.addColorStop(0.1, '#8c90b4'); g.addColorStop(0.62, '#7a7896'); g.addColorStop(0.64, '#8a6650'); g.addColorStop(1, '#6e4e3a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // janela da madrugada (rosa → lilás) com montante central e cortinas azul-marinho dos lados
        const wx = w * 0.12, ww = w * 0.62, wy = h * 0.27, wh = h * 0.27;
        const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, '#5d5a9a'); sg.addColorStop(0.6, '#c07a92'); sg.addColorStop(1, '#f2b089');
        ctx.fillStyle = sg; ctx.fillRect(wx, wy, ww, wh);
        ctx.fillStyle = 'rgba(60,50,90,0.75)'; for (let i = 0; i < 7; i++) ctx.fillRect(wx + i * ww / 7, wy + wh * (0.55 - (i % 3) * 0.08), ww / 7 - 4, wh);
        ctx.fillStyle = '#efe9df'; ctx.fillRect(wx + ww / 2 - 4, wy, 8, wh); ctx.fillRect(wx - 6, wy + wh, ww + 12, 10);
        ctx.fillStyle = '#2e3a52'; ctx.fillRect(wx - 34, wy - 40, 30, h * 0.36); ctx.fillRect(wx + ww + 4, wy - 40, 30, h * 0.36);
        // cama e manta mostarda (embaixo), abajur aceso ao fundo
        ctx.fillStyle = '#e6e3ec'; ctx.fillRect(0, h * 0.66, w * 0.85, h * 0.07);
        ctx.fillStyle = '#c98a3a'; ctx.fillRect(0, h * 0.7, w * 0.55, h * 0.03);
        const lg = ctx.createRadialGradient(w * 0.88, h * 0.6, 2, w * 0.88, h * 0.6, 70); lg.addColorStop(0, 'rgba(255,200,130,0.95)'); lg.addColorStop(1, 'rgba(255,200,130,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
        ctx.filter = 'none';
        // brilho do vidro (faixas diagonais suaves) + bisotê
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        [[0.05, 0.2], [0.4, 0.07]].forEach(([x0, bw]) => { ctx.beginPath(); ctx.moveTo(w * x0, 0); ctx.lineTo(w * (x0 + bw), 0); ctx.lineTo(w * (x0 + bw - 0.6), h); ctx.lineTo(w * (x0 - 0.6), h); ctx.closePath(); ctx.fill(); });
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 5; ctx.strokeRect(3, 3, w - 6, h - 6);
      }), { rough: 0.22, metal: 0.1 });
      const wr = grp({ parent: WB.right, pos: [-0.9, 0, 0] }); // local x: -2.2..0.4 (mundo z)
      const wW = 2.6;
      rb(wW, 2.44, 0.6, 0.015, '#e7ded1', { parent: wr, pos: [0, 1.22 + 0.04, 0.3], cast: false }, 1);
      bx(wW, 0.06, 0.56, '#5a4a3e', { parent: wr, pos: [0, 0.03, 0.28], cast: false });
      for (let i = 0; i < 4; i++) {
        const dx = -wW / 2 + 0.325 + i * 0.65;
        const mirror = i === 1;
        rb(0.63, 2.36, 0.025, 0.006, mirror ? mirrorMat : oakMat, { parent: wr, pos: [dx, 1.26, 0.61], cast: false }, 1);
        if (!mirror) for (let j = 0; j < 7; j++) bx(0.6, 0.006, 0.01, '#a8865e', { parent: wr, pos: [dx, 0.4 + j * 0.3, 0.625], cast: false });
        bx(0.016, 0.5, 0.02, '#3a3430', { parent: wr, pos: [dx + (i % 2 ? -0.28 : 0.28), 1.2, 0.635], cast: false });
      }
      doorUnit(WB.right, { x: 1.35, w: 0.84, color: '#efe9df', panelColor: '#e2dbd0' });
      // interruptor
      rb(0.08, 0.12, 0.012, 0.005, '#f7f4ee', { parent: WB.right, pos: [0.82, 1.15, 0.006], cast: false }, 1);

      // --- Parede da frente: cômoda + TV + ar-condicionado + quadros
      const F = WB.front; // local x = -mundo x
      const dresser = grp({ parent: F, pos: [0.2, 0, 0] });
      rb(1.5, 0.78, 0.48, 0.02, '#a8744c', { parent: dresser, pos: [0, 0.47, 0.24] }, 2);
      for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 2; c2++) {
        rb(0.7, 0.22, 0.015, 0.005, '#93633f', { parent: dresser, pos: [-0.36 + c2 * 0.72, 0.24 + r2 * 0.245, 0.485] }, 1);
        rb(0.14, 0.014, 0.016, 0.006, '#c9a25a', { parent: dresser, pos: [-0.36 + c2 * 0.72, 0.31 + r2 * 0.245, 0.495], cast: false }, 1);
      }
      [[-0.68, 0.06], [0.68, 0.06], [-0.68, 0.42], [0.68, 0.42]].forEach(([a, b]) => cy(0.016, 0.012, 0.1, '#5a3a26', { parent: dresser, pos: [a, 0.05, b] }, 6));
      // costas acabadas (aparecem no plano geral, com a parede da frente escondida): quadro + 2 almofadas de madeira
      rb(1.42, 0.68, 0.012, 0.004, '#8a5a3a', { parent: dresser, pos: [0, 0.47, -0.004], cast: false }, 1);
      [-0.355, 0.355].forEach((x) => rb(0.64, 0.58, 0.012, 0.004, '#a06c48', { parent: dresser, pos: [x, 0.47, -0.009], cast: false }, 1));
      bx(1.5, 0.025, 0.014, '#6e4630', { parent: dresser, pos: [0, 0.845, -0.006], cast: false });
      const tvB = rb(1.1, 0.64, 0.04, 0.01, '#16161b', { parent: F, pos: [0.2, 1.62, 0.03], cast: false }, 1);
      void tvB;
      // tela desligada: vidro escuro com o reflexo fraco da janela e um brilho diagonal (é o que se vê da cama)
      const tvOff = k.tex(512, 288, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a3046'); g.addColorStop(0.5, '#141826'); g.addColorStop(1, '#1b1e2c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.filter = 'blur(6px)';
        ctx.fillStyle = 'rgba(150,130,190,0.16)'; ctx.fillRect(w * 0.62, h * 0.18, w * 0.22, h * 0.5);
        ctx.fillStyle = 'rgba(230,226,236,0.07)'; ctx.fillRect(w * 0.05, h * 0.72, w * 0.5, h * 0.2);
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(w * 0.1, 0); ctx.lineTo(w * 0.36, 0); ctx.lineTo(w * 0.12, h); ctx.lineTo(-w * 0.14, h); ctx.closePath(); ctx.fill();
      });
      pl(1.06, 0.6, k.tmat(tvOff, { rough: 0.25, metal: 0.2 }), { parent: F, pos: [0.2, 1.62, 0.051], cast: false });
      sp(0.006, M.basic('#ff4a3a'), { parent: F, pos: [0.2 + 0.5, 1.315, 0.05], cast: false }, 6, 4); // led de standby
      // perfumes + porta-joias + foto
      cy(0.03, 0.03, 0.12, M.mat('#e8c68a', { rough: 0.1, opacity: 0.8, transparent: true }), { parent: dresser, pos: [-0.5, 0.92, 0.2], cast: false }, 12);
      cy(0.035, 0.035, 0.1, M.mat('#9ec0d8', { rough: 0.1, opacity: 0.8, transparent: true }), { parent: dresser, pos: [-0.42, 0.91, 0.28], cast: false }, 12);
      rb(0.2, 0.08, 0.14, 0.02, '#6a2c3e', { parent: dresser, pos: [0.45, 0.9, 0.24] }, 1);
      picture(dresser, { pos: [0.1, 0.86 + 0.11, 0.2], rot: [0, 0.2, 0], w: 0.2, h: 0.24, img: k.tmat(photoTex(k, 1, { people: 3 }), { rough: 0.5 }), frame: '#2b2522', stand: true, inset: 0.03 });
      // ar-condicionado split
      const ac = grp({ parent: F, pos: [-1.3, 2.32, 0] });
      rb(0.9, 0.28, 0.2, 0.05, '#f4f2ee', { parent: ac, pos: [0, 0, 0.1], cast: false }, 2);
      bx(0.8, 0.02, 0.05, '#d8d6d0', { parent: ac, pos: [0, -0.12, 0.18], cast: false });
      const acLed = sp(0.008, M.basic('#6dff9a'), { parent: ac, pos: [0.36, -0.06, 0.205], cast: false }, 6, 4);
      void acLed;
      picture(F, { pos: [1.65, 1.5, 0], w: 0.5, h: 0.62, img: k.tmat(artTex(k, ['#e9dcc6', '#d9952f', '#365a6e', '#c8653f'], 'sol'), { rough: 0.8 }), frame: '#2b2522' });

      // --- Feixe de luz fria da janela (falso volumétrico) + mancha no chão
      const shaftMat = k.bmat(shaftTex(), { add: true, color: '#7f8fd8', opacity: 0.22, side: 'double', fog: false, toneMapped: false });
      const shaft = pl(1.4, 2.1, shaftMat, { parent: live, pos: [-1.95, 1.05, -0.25], rot: [0, PI / 2, 0.62], cast: false });
      shaft.receiveShadow = false;
      const patchMat = k.bmat(patchTex(k, 2, 2), { add: true, color: '#5466b8', opacity: 0.35, fog: false, toneMapped: false });
      const patch = pl(1.25, 1.35, patchMat, { parent: live, pos: [-1.35, 0.012, -0.25], rot: [-PI / 2, 0, 0], cast: false });
      patch.receiveShadow = false;

      // lavado frio da janela no forro: a madrugada clareando o teto (é o que se vê deitado)
      const washTex = k.tex(256, 256, (ctx, w, h) => {
        ctx.filter = 'blur(10px)';
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(14, h * 0.3); ctx.lineTo(w - 10, h * 0.06); ctx.lineTo(w - 10, h * 0.94); ctx.lineTo(14, h * 0.7); ctx.closePath(); ctx.fill();
        // montante central da janela (faixa mais escura)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.moveTo(14, h * 0.49); ctx.lineTo(w, h * 0.46); ctx.lineTo(w, h * 0.56); ctx.lineTo(14, h * 0.51); ctx.closePath(); ctx.fill();
        ctx.filter = 'none';
      });
      const washMat = k.bmat(washTex, { add: true, color: '#8a96e8', opacity: 0.3, fog: false, toneMapped: false });
      const wash = pl(1.9, 2.8, washMat, { parent: live, pos: [-2.6 + 0.42 + 0.95, H - 0.004, -0.35], rot: [PI / 2, 0, 0], cast: false });
      wash.receiveShadow = false;
      wash.renderOrder = 4;
      // reflexo do despertador (vermelho, pisca com o alarme) e do celular (azulado) no forro sobre o criado-mudo:
      // é o que o pai vê deitado olhando para cima às 6h47
      const devWashTex = k.tex(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
      const devWashMat = k.bmat(devWashTex, { transparent: true, color: '#ff3030', opacity: 0, fog: false, toneMapped: false });
      devWashMat.depthWrite = false;
      // duas partes: a sanca rebaixada junto à parede do fundo (onde fica o criado-mudo) e o forro central;
      // UV calculado pela posição → um só brilho redondo centrado no despertador
      const washPart = (x0, x1, z0, z1, y) => {
        const g = new T.PlaneGeometry(x1 - x0, z1 - z0);
        g.rotateX(PI / 2); // virado para baixo
        g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
        const pa = g.attributes.position, uv = g.attributes.uv, cx = -1.12, cz = -1.84, R = 1.15;
        for (let i = 0; i < pa.count; i++) uv.setXY(i, 0.5 + (pa.getX(i) - cx) / (2 * R), 0.5 + (pa.getZ(i) - cz) / (2 * R));
        g.userData.baked = true;
        const m = M.mesh(g, devWashMat, { parent: live, cast: false });
        m.receiveShadow = false; m.renderOrder = 4;
        return m;
      };
      washPart(-2.18, -0.02, -D / 2, -D / 2 + 0.42, H - 0.125);
      washPart(-2.18, -0.02, -D / 2 + 0.42, -0.7, H - 0.003);

      // --- Luzes
      const L = lights(root, 'noite', 4.2);
      const lampLight = M.lampLight('#ffb05a', 3.0, 4.5);
      lampLight.position.copy(lampL.bulb);
      root.add(lampLight);
      const devLight = new T.PointLight('#ff3030', 0, 3.1, 2);
      devLight.position.set(-1.1, 0.85, -1.55);
      root.add(devLight);
      const lampGlow = M.glow('#ffc477', 0.9, 0.55);
      lampGlow.position.copy(lampL.bulb);
      live.add(lampGlow);

      // vista lá fora (primeira pessoa)
      const ringDawn = ringTex(k, 'amanhecer', 41), ringNight = ringTex(k, 'noite', 42);
      const out = outside(k, root, { sky: ['#1a2050', '#c27a8a', '#2a2448'], sunPos: [-60, 3, -8], sunColor: '#ffb48a', sunSize: 24, seed: 3 });
      const nearViews = [win.userData.view];

      // cômoda fica no chão (primeiro plano do plano geral; a TV continua na parede) e some quando a câmera
      // de cinema entra nela (plano 'dramatico', rente à parede da frente) ou chega perto por trás
      keepOnFloor(root, deco, dresser);
      // o puff do canto também some nos planos baixos de fora da parede da frente (no plano 'porta' ele ficava
      // na frente das pernas de quem está na porta, como se a pessoa estivesse em cima dele)
      const fgCheck = fgHider([
        { obj: dresser, x: -0.2, z: D / 2 - 0.24, w: 1.52, d: 0.5, top: 0.95, wallZ: D / 2 },
        { obj: pouf, x: 1.28, z: 1.78, w: 0.52, d: 0.52, top: 0.45, wallZ: D / 2, near: 3.2 },
      ]);
      // assar decoração estática (menos draw calls)
      bake(deco);
      S.walls.forEach((w) => bake(w.obj));

      const PRESETS = {
        amanhecer: { sky: '#5a6cc0', ground: '#1e1a30', hemi: 0.46, sun: '#9aaeff', sunI: 0.42, sunPos: [-6, 6.5, 3.5], amb: 0.06 },
        noite: { sky: '#3a4a94', ground: '#141a30', hemi: 0.42, sun: '#8ea2ff', sunI: 0.34, sunPos: [-6, 7, 3], amb: 0.06 },
      };
      const state = { clock: null, alarmOn: null, phoneLit: null, time: null };
      function drawClock(txt, on, alarm) {
        clockTex.userData.redraw((ctx, w, h) => {
          ctx.fillStyle = '#0c0a0e'; ctx.fillRect(0, 0, w, h);
          ctx.font = '700 148px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(255,60,60,0.08)'; ctx.fillText('88:88', w / 2, h / 2 + 8);
          if (on) { ctx.fillStyle = alarm ? '#ff3838' : '#ff5a4a'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 26; ctx.fillText(txt, w / 2, h / 2 + 8); ctx.shadowBlur = 0; }
          ctx.font = '700 22px Arial'; ctx.textAlign = 'left';
          ctx.fillStyle = alarm && on ? '#ff3838' : 'rgba(255,80,80,0.35)'; ctx.fillText('ALARME', 18, 30);
          ctx.fillStyle = 'rgba(255,80,80,0.35)'; ctx.fillText('TER', w - 64, 30);
        });
      }
      function drawPhone(lit, txt) {
        phoneTex.userData.redraw((ctx) => {
          ctx.setTransform(2, 0, 0, 2, 0, 0);
          const w = 128, h = 256;
          if (!lit) { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#20232c'); g.addColorStop(0.5, '#0e1015'); g.addColorStop(1, '#1a1c24'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return; }
          const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3b5bd6'); g.addColorStop(1, '#a35bd6');
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 34px Arial'; ctx.fillText(txt, w / 2, 52);
          for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(10, 92 + i * 38, w - 20, 30); ctx.fillStyle = ['#e94b5a', '#4166a8', '#2f9f78', '#f2a53a'][i]; ctx.fillRect(16, 99 + i * 38, 16, 16); ctx.fillStyle = '#555'; ctx.fillRect(38, 100 + i * 38, w - 60, 5); ctx.fillRect(38, 110 + i * 38, w - 80, 4); }
        });
      }

      const env = {
        root,
        background: '#0c1024',
        fog: { color: '#d0808a', near: 24, far: 120 },
        walls: S.walls,
        defaultShot: 'geral',
        spots: {
          cama: { x: -0.38, z: -0.12, rot: 0 },
          beira_cama: { x: -0.62, z: -0.55, rot: -PI / 2 },
          banco: { x: -0.3, z: 0.3, rot: 0 },
          lado_cama: { x: -1.2, z: -0.8, rot: 0.5 },
          janela: { x: -1.85, z: -0.35, rot: -PI / 2 },
          porta: { x: 2.0, z: 1.35, rot: -PI / 2 },
          centro: { x: 0.4, z: 1.2, rot: 0 },
          faisca: { x: -0.9, z: -1.2, rot: 0.4, y: 1.0 },
          inicio: { x: 1.75, z: 1.25, rot: -2.2 },
          despertador: { x: -1.2, z: -1.2, rot: PI },
          foto: { x: 1.2, z: -1.25, rot: PI },
          guarda_roupa: { x: 1.55, z: -0.9, rot: PI / 2 },
          tv: { x: -0.2, z: 1.15, rot: 0 },
          paleto: { x: -1.45, z: 0.62, rot: -0.8 },
        },
        bounds: S.bounds,
        colliders: [
          { x: 0, z: -1.15, w: 1.62, d: 1.9 },                 // cama
          { x: 0, z: -0.1, w: 1.66, d: 0.24 },                 // pé da cama (o ponto 'cama' fica dentro: deitar é por cena)
          { x: -1.26, z: -1.86, w: 0.56, d: 0.44 },            // criado-mudo esq.
          { x: 1.26, z: -1.86, w: 0.56, d: 0.44 },             // criado-mudo dir.
          { x: 2.3, z: -0.9, w: 0.62, d: 2.62 },               // guarda-roupa
          { x: -0.2, z: 1.96, w: 1.52, d: 0.5 },               // cômoda
          { x: -1.95, z: 1.15, w: 0.8, d: 0.78, rot: 0.75 },   // poltrona
          { x: -2.25, z: -1.92, w: 0.38, d: 0.38 },            // planta
          { x: -1.5, z: 1.65, w: 0.46, d: 0.14, rot: 0.3 },    // pasta
          { x: 0, z: 0.32, w: 1.3, d: 0.3 },                   // calçadeira (ponto 'banco' é de sentar)
          { x: 1.28, z: 1.78, w: 0.5, d: 0.5 },                // puff
        ],
        shots: {
          geral: { target: [-0.15, 0.8, -0.55], yaw: 0.5, pitch: 0.44, dist: 7.6, fov: 38 },
          cama: { target: [-0.55, 0.66, -1.55], yaw: -0.78, pitch: 0.5, dist: 2.1, fov: 40 },
          despertador: { target: [-1.12, 0.63, -1.8], yaw: 0.3, pitch: 0.32, dist: 0.95, fov: 32 },
          celular: { target: [-1.17, 0.6, -1.67], yaw: 0.25, pitch: 1.0, dist: 0.7, fov: 34 },
          janela: { target: [-2.2, 1.35, -0.2], yaw: 1.25, pitch: 0.12, dist: 3.6, fov: 40 },
          porta: { target: [2.0, 1.1, 1.2], yaw: -1.05, pitch: 0.16, dist: 4.2, fov: 38 },
          dramatico: { target: [-0.4, 0.75, -1.2], yaw: 0.15, pitch: 0.05, dist: 3.4, fov: 40 },
        },
        setParams(p) {
          p = p || {};
          const clock = p.clock || '06:47';
          const time = p.time === 'noite' ? 'noite' : 'amanhecer';
          if (time !== state.time) {
            state.time = time;
            L.set(PRESETS[time]);
            viewMat.map = time === 'noite' ? nightSky : dawnSky;
            viewMat.needsUpdate = true;
            if (time === 'noite') out.set(['#060a1c', '#1d2b55', '#0c1022'], ringNight, '#fff6dc', 0.5, 'noite');
            else out.set(['#141a44', '#d0808a', '#2a2448'], ringDawn, '#ffb48a', 0.75, 'amanhecer');
            out.sun.position.set(time === 'noite' ? -50 : -60, time === 'noite' ? 24 : 3, time === 'noite' ? 16 : -8);
            out.sun.scale.setScalar(time === 'noite' ? 5 : 24);
            if (S.ceiling) {
              S.ceiling.userData.led.emissiveIntensity = 0;
              // forro frio (luz azul da madrugada rebatida); o abajur esquenta só o canto dele
              S.ceiling.userData.setGlow(time === 'noite' ? 0.07 : 0.13, time === 'noite' ? '#4a5698' : '#7f8ad0');
            }
            shaftMat.color.set(time === 'noite' ? '#4a5aa8' : '#8a92e0');
            washMat.color.set(time === 'noite' ? '#3a4a98' : '#8a96e8');
            patchMat.color.set(time === 'noite' ? '#2c3a80' : '#5a62b8');
          }
          const lampOn = p.lamp !== false;
          lampLight.userData.light.intensity = lampOn ? 3.0 : 0;
          lampGlow.visible = lampOn;
          lampL.mat.emissiveIntensity = lampOn ? 0.9 : 0;
          lampR.mat.emissiveIntensity = 0;
          if (state.clock !== clock) { state.clock = clock; state.alarmOn = null; }
          state.alarm = !!p.alarm;
          if (state.phoneLit !== !!p.phoneLit) { state.phoneLit = !!p.phoneLit; drawPhone(state.phoneLit, clock); }
          phoneGlow.material.opacity = state.phoneLit ? 0.55 : 0;
          if (!state.alarm) { if (state.alarmOn !== 'steady') { state.alarmOn = 'steady'; drawClock(clock, true, false); } clockGlow.material.opacity = 0.18; }
          state.coberta = p.coberta;
        },
        update(t, p) {
          fan.blades.rotation.y = t * 1.5;
          // despertador piscando
          if (state.alarm) {
            const on = Math.floor(t * 2.4) % 2 === 0;
            if (state.alarmOn !== on) { state.alarmOn = on; drawClock(state.clock, on, true); }
            clockGlow.material.opacity = on ? 0.8 : 0.15;
            clockG.position.x = -1.12 + (on ? Math.sin(t * 90) * 0.003 : 0);
            devLight.color.set('#ff2a2a');
            devLight.intensity = on ? 1.4 : 0.1;
            devWashMat.color.set('#ff2a2a');
            devWashMat.opacity = on ? 0.45 : 0.07;
          } else if (state.phoneLit) {
            devLight.color.set('#9fc0ff');
            devLight.intensity = 0.9 + Math.sin(t * 3) * 0.08;
            devWashMat.color.set('#8fb0ff');
            devWashMat.opacity = 0.14;
          } else { devLight.intensity = 0; devWashMat.opacity = 0; }
          // edredom automático
          let cover = state.coberta;
          if (cover == null) {
            cover = false;
            const W2 = P2.core && P2.core.world;
            if (W2 && W2.actors) W2.actors.forEach((a) => { if ((a.anim === 'sleep' || a.anim === 'lie') && a.visible && Math.abs(a.x + 0.38) < 0.5 && Math.abs(a.z + 0.12) < 0.7) cover = true; });
          }
          duvetBody.visible = !!cover;
          duvetFlat.visible = !cover;
          const inside = out.check(W, D, H, nearViews);
          shaftMat.opacity = (0.2 + Math.sin(t * 0.4) * 0.03) * (inside ? 0.45 : 1);
          fgCheck();
          void p;
        },
        dispose() { k.dispose(root); },
      };
      void win;
      return env;
    },
  };
  // ==================================================================
  // COZINHA — cozinha brasileira moderna (manhã ensolarada | noite)
  // ==================================================================
  ENVS.cozinha = {
    name: 'Cozinha',
    build(params) {
      const k = kit();
      const root = grp({ name: 'env:cozinha' });
      const W = 5.6, D = 4.6, H = 2.7;
      // piso de lajota terracota com rejunte claro (dá contraste com as paredes creme e os armários verdes)
      const floorMat = k.tmat(tileTex(k, '#a86a50', '#cdb79c', { n: 2, seed: 4, vary: '#7e4632' }), { rough: 0.5 });
      const wallMat = M.mat('#efe3cf', { rough: 0.95 });
      const S = shell(k, root, {
        w: W, d: D, h: H, floorMat, wallMat, floorTile: 0.9,
        openings: {
          left: [{ x: 0.85, w: 1.25, y0: 1.08, h: 1.12 }],
          right: [{ x: 1.35, w: 0.86, y0: 0, h: 2.12 }],
          front: [{ x: 1.3, w: 1.1, y0: 0, h: 2.25 }],
        },
        base: '#2e2a26', slab: '#d8c8b0', trim: '#b08a5a',
        ceiling: { color: '#f4efe6', sanca: 0, spots: [[-1.6, -1.6], [-0.4, -1.6], [0.8, -1.6], [-2.0, -0.4], [-2.0, 0.8], [1.8, 0.9], [-0.9, 1.6], [1.8, -0.5]] },
      });
      const WB = S.wallGroups;
      const deco = grp({ parent: root, name: 'decor' });
      const live = grp({ parent: root, name: 'live' });
      live.userData.live = true;

      const cabMat = M.mat('#7d9a78', { rough: 0.55 });
      const cabEdge = M.mat('#6c8868', { rough: 0.55 });
      const topMat = M.mat('#f3eee6', { rough: 0.22 });
      const brass = M.mat('#d4ae64', { rough: 0.3, metal: 0.8 });
      const steel = M.mat('#c5c9ce', { rough: 0.25, metal: 0.85 });
      const woodShelf = M.mat('#b07a4f', { rough: 0.6 });
      const ladMat = k.tmat(ladrilhoTex(k, { bg: '#f1e6d2', a: '#2f6f8a', b: '#d9774a', c: '#f2b440', line: 'rgba(60,40,20,0.15)' }), { rough: 0.35 });

      /** bancada ao longo de x (mundo), de x0 a x1, encostada em z = zBack, profundidade 0.62 */
      function counterX(x0, x1, zBack, doors) {
        const len = x1 - x0, cx = (x0 + x1) / 2, cz = zBack + 0.31;
        bx(len, 0.1, 0.55, '#3b342e', { parent: deco, pos: [cx, 0.05, cz - 0.03], cast: false });
        rb(len, 0.76, 0.6, 0.012, cabMat, { parent: deco, pos: [cx, 0.48, cz] }, 1);
        const n = doors || Math.max(1, Math.round(len / 0.5));
        const dw = len / n;
        for (let i = 0; i < n; i++) {
          const dx = x0 + dw * (i + 0.5);
          rb(dw - 0.02, 0.72, 0.02, 0.008, cabEdge, { parent: deco, pos: [dx, 0.48, cz + 0.305], cast: false }, 1);
          rb(dw - 0.1, 0.62, 0.02, 0.006, cabMat, { parent: deco, pos: [dx, 0.48, cz + 0.315], cast: false }, 1);
          rb(0.14, 0.016, 0.02, 0.007, brass, { parent: deco, pos: [dx, 0.78, cz + 0.33], cast: false }, 1);
        }
        rb(len + 0.03, 0.04, 0.65, 0.008, topMat, { parent: deco, pos: [cx, 0.9, cz + 0.01] }, 1);
      }
      /** bancada ao longo de z (parede esquerda), de z0 a z1, encostada em x = xBack */
      function counterZ(z0, z1, xBack) {
        const len = z1 - z0, cz = (z0 + z1) / 2, cx = xBack + 0.31;
        bx(0.55, 0.1, len, '#3b342e', { parent: deco, pos: [cx - 0.03, 0.05, cz], cast: false });
        rb(0.6, 0.76, len, 0.012, cabMat, { parent: deco, pos: [cx, 0.48, cz] }, 1);
        const n = Math.max(1, Math.round(len / 0.5)), dw = len / n;
        for (let i = 0; i < n; i++) {
          const dz = z0 + dw * (i + 0.5);
          rb(0.02, 0.72, dw - 0.02, 0.008, cabEdge, { parent: deco, pos: [cx + 0.305, 0.48, dz], cast: false }, 1);
          rb(0.02, 0.62, dw - 0.1, 0.006, cabMat, { parent: deco, pos: [cx + 0.315, 0.48, dz], cast: false }, 1);
          rb(0.02, 0.016, 0.14, 0.007, brass, { parent: deco, pos: [cx + 0.33, 0.78, dz], cast: false }, 1);
        }
        rb(0.65, 0.04, len, 0.008, topMat, { parent: deco, pos: [cx + 0.01, 0.9, cz] }, 1);
      }
      counterX(-2.8, 1.12, -2.3, 8);
      counterZ(-1.68, -0.08, -2.8);

      // --- Revestimento de ladrilho hidráulico
      const ladBack = pl(3.92, 0.62, ladMat, { parent: WB.back, pos: [-0.86, 1.23, 0.004], cast: false });
      ladMat.map.repeat.set(3.92 / 0.6, 0.62 / 0.6);
      void ladBack;
      const ladMatL = k.tmat(ladMat.map.clone(), { rough: 0.35 });
      ladMatL.map.repeat.set(2.2 / 0.6, 0.18 / 0.6); ladMatL.map.needsUpdate = true;
      k.own.tex.push(ladMatL.map);
      pl(2.2, 0.18, ladMatL, { parent: WB.left, pos: [1.2, 1.0, 0.004], cast: false });

      // --- Prateleiras abertas + coifa + armário alto (parede do fundo)
      const shelfG = grp({ parent: WB.back, pos: [-1.25, 0, 0] });
      [1.6, 2.02].forEach((y) => {
        rb(1.6, 0.04, 0.26, 0.01, woodShelf, { parent: shelfG, pos: [0, y, 0.13] }, 1);
        [-0.7, 0.7].forEach((x) => { bx(0.012, 0.012, 0.2, '#2b2522', { parent: shelfG, pos: [x, y - 0.026, 0.11], cast: false }); bx(0.012, 0.12, 0.012, '#2b2522', { parent: shelfG, pos: [x, y - 0.08, 0.012], cast: false }); });
      });
      // potes de mantimentos
      const jarGlass = M.mat('#e8f2f4', { rough: 0.08, opacity: 0.5, transparent: true });
      [['#e9d9a8', -0.62], ['#5a3a26', -0.48], ['#f2c14e', -0.34]].forEach(([c, x], i) => {
        const hgt = 0.2 - i * 0.03;
        cy(0.055, 0.055, hgt * 0.75, c, { parent: shelfG, pos: [x, 1.62 + hgt * 0.375, 0.13], cast: false }, 12);
        cy(0.06, 0.06, hgt, jarGlass, { parent: shelfG, pos: [x, 1.62 + hgt / 2, 0.13], cast: false }, 12);
        cy(0.062, 0.062, 0.025, woodShelf, { parent: shelfG, pos: [x, 1.62 + hgt + 0.012, 0.13], cast: false }, 12);
      });
      // pratos empilhados e tigelas
      for (let i = 0; i < 5; i++) cy(0.11, 0.09, 0.018, '#f6f1e8', { parent: shelfG, pos: [0.05, 1.63 + i * 0.02, 0.13], cast: false }, 18);
      lathe('bowl', [[0.001, 0], [0.04, 0], [0.08, 0.05], [0.085, 0.06], [0.075, 0.06], [0.035, 0.012], [0.001, 0.012]], '#2f6f8a', { parent: shelfG, pos: [0.32, 1.62, 0.13], cast: false });
      lathe('bowl', [[0.001, 0], [0.04, 0], [0.08, 0.05], [0.085, 0.06], [0.075, 0.06], [0.035, 0.012], [0.001, 0.012]], '#d9774a', { parent: shelfG, pos: [0.32, 1.68, 0.13], cast: false });
      books(shelfG, { pos: [-0.35, 2.04, 0.13], len: 0.42, h: 0.24, d: 0.18, seed: 6 });
      plant(shelfG, 'samambaia', { pos: [0.45, 2.04, 0.13], potR: 0.08, potH: 0.12, pot: '#f2ede4', size: 0.32, seed: 4 });
      mug(shelfG, { pos: [0.6, 1.62, 0.12], color: '#e0a33a' });
      mug(shelfG, { pos: [0.6, 1.62 + 0.0, 0.22], color: '#f6f1e8' });
      // fita de LED sob a prateleira (acende à noite)
      const ledMat = k.umat('#fff1d6', { emissive: '#ffcf8a', emissiveIntensity: 0 });
      bx(1.5, 0.01, 0.02, ledMat, { parent: shelfG, pos: [0, 1.575, 0.2], cast: false });
      // coifa
      const hood = grp({ parent: WB.back, pos: [0.2, 0, 0] });
      bx(0.3, 0.86, 0.26, steel, { parent: hood, pos: [0, 2.27, 0.15], cast: false });
      M.mesh(M.cylGeo(0.2, 0.42, 0.26, 4, false), steel, { parent: hood, pos: [0, 1.73, 0.27], rot: [0, PI / 4, 0], scale: [1, 1, 0.75], cast: false });
      bx(0.62, 0.04, 0.46, steel, { parent: hood, pos: [0, 1.58, 0.27], cast: false });
      // armário alto à direita da coifa
      rb(0.5, 0.72, 0.34, 0.01, cabMat, { parent: WB.back, pos: [0.82, 1.92, 0.17], cast: false }, 1);
      rb(0.46, 0.68, 0.02, 0.008, cabEdge, { parent: WB.back, pos: [0.82, 1.92, 0.345], cast: false }, 1);
      rb(0.016, 0.14, 0.02, 0.007, brass, { parent: WB.back, pos: [0.62, 1.68, 0.36], cast: false }, 1);

      // --- Cooktop + panela
      rb(0.6, 0.012, 0.48, 0.006, '#17171b', { parent: deco, pos: [0.2, 0.926, -1.98], cast: false }, 1);
      [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.12], [0.14, 0.12]].forEach(([a, b]) => tor(0.055, 0.004, '#3a3a40', { parent: deco, pos: [0.2 + a, 0.934, -1.98 + b], rot: [PI / 2, 0, 0], cast: false }));
      const pan = grp({ parent: deco, pos: [0.06, 0.935, -1.88] });
      cy(0.12, 0.11, 0.13, '#e05a3a', { parent: pan, pos: [0, 0.065, 0] }, 20);
      cy(0.125, 0.125, 0.015, '#d04a2c', { parent: pan, pos: [0, 0.135, 0] }, 20);
      sp(0.018, '#2a2a30', { parent: pan, pos: [0, 0.15, 0], cast: false }, 8, 6);
      cy(0.012, 0.012, 0.14, '#2a2a30', { parent: pan, pos: [0.17, 0.1, 0], rot: [0, 0, PI / 2], cast: false }, 6);

      // --- Cafeteira espresso (vermelha retrô) + moedor + garrafa térmica + pote de café
      const cm = grp({ parent: deco, pos: [-1.0, 0.92, -2.05] });
      rb(0.3, 0.36, 0.3, 0.05, '#c8453a', { parent: cm, pos: [0, 0.2, 0] }, 2);
      rb(0.32, 0.03, 0.32, 0.01, steel, { parent: cm, pos: [0, 0.39, 0] }, 1);
      rb(0.3, 0.03, 0.14, 0.01, steel, { parent: cm, pos: [0, 0.015, 0.2] }, 1);
      cy(0.04, 0.04, 0.05, steel, { parent: cm, pos: [0, 0.27, 0.17] }, 14);
      cy(0.042, 0.038, 0.03, steel, { parent: cm, pos: [0, 0.235, 0.17] }, 14);
      rb(0.03, 0.024, 0.13, 0.01, '#1d1d22', { parent: cm, pos: [0.075, 0.232, 0.215], rot: [0, -0.9, 0] }, 1);
      cy(0.04, 0.04, 0.012, steel, { parent: cm, pos: [-0.085, 0.31, 0.152], rot: [PI / 2, 0, 0], cast: false }, 16);
      cy(0.032, 0.032, 0.004, '#f6f1e8', { parent: cm, pos: [-0.085, 0.31, 0.159], rot: [PI / 2, 0, 0], cast: false }, 16);
      bx(0.002, 0.024, 0.002, '#c8453a', { parent: cm, pos: [-0.08, 0.316, 0.162], rot: [0, 0, -0.6], cast: false });
      [-0.08, 0.06].forEach((x) => rb(0.024, 0.024, 0.012, 0.006, '#f2c14e', { parent: cm, pos: [x + 0.11, 0.33, 0.152], cast: false }, 1));
      for (let i = 0; i < 6; i++) bx(0.24, 0.003, 0.006, '#9aa0a6', { parent: cm, pos: [0, 0.032, 0.15 + i * 0.018], cast: false });
      cup(cm, { pos: [-0.07, 0.405, -0.02], saucer: false, coffee: false, color: '#f6f1e8' });
      cup(cm, { pos: [0.07, 0.405, 0.02], saucer: false, coffee: false, color: '#2f6f8a' });
      cy(0.006, 0.006, 0.16, steel, { parent: cm, pos: [0.17, 0.25, 0.08], rot: [0.2, 0, -0.15], cast: false }, 6);
      cup(cm, { pos: [0, 0.03, 0.17], saucer: false, color: '#f6f1e8' });
      // moedor
      const gr = grp({ parent: deco, pos: [-1.38, 0.92, -2.08] });
      rb(0.13, 0.2, 0.15, 0.03, '#2a2a30', { parent: gr, pos: [0, 0.1, 0] }, 1);
      cn(0.07, 0.14, M.mat('#6a4a30', { rough: 0.2, opacity: 0.85, transparent: true }), { parent: gr, pos: [0, 0.27, 0], rot: [PI, 0, 0], cast: false });
      garrafaTermica(deco, { pos: [-0.68, 0.92, -2.02], color: '#c8453a', rot: [0, -0.5, 0] });
      const can = grp({ parent: deco, pos: [-1.65, 0.92, -2.06] });
      cy(0.07, 0.07, 0.18, '#e9dcc0', { parent: can, pos: [0, 0.09, 0] }, 16);
      cy(0.072, 0.072, 0.03, '#5a3a26', { parent: can, pos: [0, 0.195, 0] }, 16);
      const canLbl = k.track(M.textPanel(0.1, 0.05, { text: ['CAFÉ'], color: '#5a3a26', bg: '#e9dcc0', size: 150, px: 256 }));
      canLbl.position.set(0, 0.1, 0.071);
      can.add(canLbl);
      // vapor saindo da xícara
      const steamA = steamPuffs(live, 5, { pos: [-1.0, 1.04, -1.88], h: 0.38, size: 0.1, opacity: 0.45, speed: 0.32 });
      const steamB = steamPuffs(live, 4, { pos: [0.06, 1.08, -1.88], h: 0.45, size: 0.14, opacity: 0.32, speed: 0.25 });
      // tábua com pão e faca
      const board = grp({ parent: deco, pos: [-0.25, 0.92, -1.98], rot: [0, 0.25, 0] });
      rb(0.42, 0.025, 0.26, 0.01, '#c89a64', { parent: board, pos: [0, 0.0125, 0] }, 1);
      [[-0.08, 0], [0.06, 0.03]].forEach(([a, b], i) => sp(0.06, '#d9a05a', { parent: board, pos: [a, 0.05, b], scale: [1.5, 0.75, 0.95], rot: [0, i * 0.5, 0] }, 12, 8));

      // --- Pia com janela (parede esquerda)
      rb(0.4, 0.012, 0.56, 0.01, steel, { parent: deco, pos: [-2.47, 0.925, -0.86], cast: false }, 1);
      bx(0.34, 0.01, 0.48, '#7e848b', { parent: deco, pos: [-2.47, 0.93, -0.86], cast: false });
      const fau = grp({ parent: deco, pos: [-2.72, 0.92, -0.86] });
      cy(0.018, 0.022, 0.32, steel, { parent: fau, pos: [0, 0.16, 0] }, 10);
      M.mesh(M.torusGeo(0.09, 0.014, 6, 14, PI), steel, { parent: fau, pos: [0.09, 0.32, 0], rot: [0, 0, 0] });
      cy(0.014, 0.012, 0.06, steel, { parent: fau, pos: [0.18, 0.29, 0] }, 8);
      // escorredor com pratos
      const rack = grp({ parent: deco, pos: [-2.5, 0.92, -0.25] });
      rb(0.32, 0.06, 0.4, 0.01, '#e8e4dc', { parent: rack, pos: [0, 0.03, 0] }, 1);
      for (let i = 0; i < 4; i++) cy(0.1, 0.1, 0.012, ['#f6f1e8', '#2f6f8a', '#f6f1e8', '#d9774a'][i], { parent: rack, pos: [0, 0.14, -0.12 + i * 0.07], rot: [PI / 2, 0, 0], cast: false }, 18);
      // janela + ervas no peitoril
      const viewManha = viewTex(k, { seed: 9, sky: ['#6fb0e8', '#a9d4f2', '#f5e6c4'], sun: [0.22, 0.25, 'rgba(255,240,200,0.95)', 300], clouds: 'rgba(255,255,255,0.75)', layers: [['#b8c8d6', 0.55, 0.3], ['#9fb4c6', 0.66, 0.24], ['#7f9fb4', 0.78, 0.16]], haze: 'rgba(255,240,220,0.18)', trees: ['#5f9a4f', '#4f8a44'] });
      const viewNoite = viewTex(k, { seed: 10, sky: ['#070b1c', '#13204a', '#2a3a6e'], stars: true, moon: [0.75, 0.2], windows: 0.62, layers: [['#1c2448', 0.55, 0.3], ['#141a38', 0.66, 0.24], ['#0c1128', 0.78, 0.16]], trees: ['#0e1a20', '#0b151a'] });
      const viewMat = k.bmat(viewManha, { fog: false });
      windowUnit(k, WB.left, { x: 0.85, y0: 1.08, w: 1.25, h: 1.12, viewMat, mullions: 1, frame: '#f4f0e8' });
      [[0.55, 'ervas', 1], [0.85, 'ervas', 2], [1.15, 'flor', 3]].forEach(([x, kind, sd]) => plant(WB.left, kind, { pos: [x, 1.08, 0.08], potR: 0.06, potH: 0.1, seed: sd, pot: '#c06a46', n: 5 }));
      // cortina de café (bandô curto, xadrez)
      const cafeCurt = k.tmat(k.tex(64, 64, (ctx, w, h) => { ctx.fillStyle = '#f6efe2'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(200,69,58,0.55)'; for (let i = 0; i < 4; i++) { ctx.fillRect(i * 16, 0, 8, h); ctx.fillRect(0, i * 16, w, 8); } }, { repeat: [6, 1] }), { rough: 0.95, side: 'double' });
      M.mesh(curtainGeo(1.45, 0.3, 9, 0.02), cafeCurt, { parent: WB.left, pos: [0.85, 2.12, 0.1], cast: false });
      cy(0.01, 0.01, 1.55, '#3a3430', { parent: WB.left, pos: [0.85, 2.28, 0.1], rot: [0, 0, PI / 2], cast: false }, 6);

      // parede esquerda (parte da frente): quadro + prateleirinha de temperos
      picture(WB.left, { pos: [-1.05, 1.6, 0], w: 0.48, h: 0.6, img: k.tmat(artTex(k, ['#f4ead6', '#e0a33a', '#7d9a78', '#d9774a'], 'folhas'), { rough: 0.8 }), frame: '#b07a4f' });
      const spice = grp({ parent: WB.left, pos: [-1.95, 1.35, 0] });
      rb(0.6, 0.03, 0.14, 0.008, woodShelf, { parent: spice, pos: [0, 0, 0.07] }, 1);
      bx(0.6, 0.02, 0.012, woodShelf, { parent: spice, pos: [0, 0.05, 0.135], cast: false });
      ['#c8453a', '#e0a33a', '#6a8a3a', '#8a5a36', '#d9774a', '#f2e6c8'].forEach((c, i) => {
        cy(0.022, 0.022, 0.09, jarGlass, { parent: spice, pos: [-0.25 + i * 0.1, 0.06, 0.07], cast: false }, 10);
        cy(0.02, 0.02, 0.05, c, { parent: spice, pos: [-0.25 + i * 0.1, 0.04, 0.07], cast: false }, 10);
        cy(0.024, 0.024, 0.02, '#2b2522', { parent: spice, pos: [-0.25 + i * 0.1, 0.115, 0.07], cast: false }, 10);
      });

      // --- Geladeira retrô com ímãs + desenho (no grupo da parede do fundo)
      const fr = grp({ parent: WB.back, pos: [1.62, 0, 0.36] });
      const frMat = M.mat('#ece2c8', { rough: 0.35 });
      rb(0.8, 1.84, 0.7, 0.07, frMat, { parent: fr, pos: [0, 0.94, 0] }, 3);
      bx(0.78, 0.012, 0.02, '#8a8478', { parent: fr, pos: [0, 1.32, 0.35], cast: false });
      rb(0.035, 0.32, 0.05, 0.015, steel, { parent: fr, pos: [-0.32, 1.55, 0.37] }, 1);
      rb(0.035, 0.55, 0.05, 0.015, steel, { parent: fr, pos: [-0.32, 0.95, 0.37] }, 1);
      bx(0.7, 0.06, 0.6, '#2b2723', { parent: fr, pos: [0, 0.03, 0], cast: false });
      const drawing = k.tmat(k.tex(256, 320, (ctx) => {
        ctx.scale(2, 2);
        const w = 128, h = 160;
        ctx.fillStyle = '#fbf8f0'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2c14e'; ctx.beginPath(); ctx.arc(100, 26, 16, 0, PI * 2); ctx.fill();
        ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * PI / 4; ctx.beginPath(); ctx.moveTo(100 + Math.cos(a) * 20, 26 + Math.sin(a) * 20); ctx.lineTo(100 + Math.cos(a) * 28, 26 + Math.sin(a) * 28); ctx.stroke(); }
        ctx.fillStyle = '#d9774a'; ctx.fillRect(20, 70, 50, 40); ctx.fillStyle = '#c8453a'; ctx.beginPath(); ctx.moveTo(14, 72); ctx.lineTo(45, 46); ctx.lineTo(76, 72); ctx.fill();
        ctx.strokeStyle = '#24324f'; ctx.lineWidth = 3;
        [[88, 95], [108, 102]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y - 18, 7, 0, PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 10); ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y); ctx.moveTo(x, y + 10); ctx.lineTo(x - 7, y + 22); ctx.moveTo(x, y + 10); ctx.lineTo(x + 7, y + 22); ctx.stroke(); });
        ctx.fillStyle = '#2f9f78'; ctx.fillRect(0, 128, w, 32);
        ctx.fillStyle = '#24324f'; ctx.font = '700 18px Arial'; ctx.fillText('PAI ♥', 10, 150);
      }), { rough: 0.9 });
      pl(0.22, 0.28, drawing, { parent: fr, pos: [0.08, 1.06, 0.352], rot: [0, 0, 0.05], cast: false });
      pl(0.13, 0.1, k.tmat(photoTex(k, 3), { rough: 0.5 }), { parent: fr, pos: [0.12, 1.55, 0.352], rot: [0, 0, -0.08], cast: false });
      const note = k.track(M.textPanel(0.14, 0.12, { text: ['Comprar', 'café!'], color: '#3a3a44', bg: '#ffe680', size: 80, px: 256, font: '"Comic Sans MS", "Segoe Print", cursive' }));
      note.position.set(-0.1, 1.62, 0.352); note.rotation.z = 0.06; fr.add(note);
      [['#e94b5a', [-0.03, 1.2]], ['#2f9f78', [0.2, 1.22]], ['#4166a8', [0.12, 1.62]], ['#f2a53a', [-0.12, 1.69]], ['#7a5ac8', [0.25, 0.9]], ['#e94b5a', [0.0, 0.8]]].forEach(([c, [x, y]]) => cy(0.02, 0.02, 0.012, c, { parent: fr, pos: [x, y, 0.358], rot: [PI / 2, 0, 0], cast: false }, 10));

      // --- Filtro de barro sobre banquinho (canto direito)
      const fb = grp({ parent: deco, pos: [2.42, 0, -1.98] });
      rb(0.42, 0.04, 0.4, 0.01, '#a8744c', { parent: fb, pos: [0, 0.7, 0] }, 1);
      [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].forEach(([a, b]) => cy(0.018, 0.018, 0.68, '#8a5a3a', { parent: fb, pos: [a, 0.34, b] }, 6));
      rb(0.38, 0.03, 0.36, 0.01, '#a8744c', { parent: fb, pos: [0, 0.25, 0] }, 1);
      const clay = M.mat('#c46a44', { rough: 0.85 });
      lathe('filtroA', [[0.001, 0], [0.13, 0], [0.15, 0.06], [0.155, 0.24], [0.14, 0.27], [0.001, 0.27]], clay, { parent: fb, pos: [0, 0.72, 0] });
      lathe('filtroB', [[0.001, 0], [0.13, 0], [0.145, 0.04], [0.15, 0.2], [0.13, 0.23], [0.001, 0.23]], clay, { parent: fb, pos: [0, 0.99, 0] });
      sp(0.13, clay, { parent: fb, pos: [0, 1.21, 0], scale: [1, 0.4, 1] });
      sp(0.025, '#a85a38', { parent: fb, pos: [0, 1.27, 0], cast: false }, 8, 6);
      tor(0.15, 0.008, '#a85a38', { parent: fb, pos: [0, 0.99, 0], rot: [PI / 2, 0, 0], cast: false });
      cy(0.012, 0.012, 0.06, steel, { parent: fb, pos: [0, 0.79, 0.17], rot: [PI / 2, 0, 0], cast: false }, 8);
      cy(0.008, 0.008, 0.03, steel, { parent: fb, pos: [0, 0.775, 0.2], cast: false }, 6);
      cy(0.035, 0.03, 0.09, M.mat('#d6ecff', { rough: 0.05, opacity: 0.45, transparent: true }), { parent: fb, pos: [0.0, 0.29 + 0.03, 0.06], cast: false }, 10);

      // --- Parede direita: porta, relógio, mural de recados
      doorUnit(WB.right, { x: 1.35, w: 0.84, color: '#b5835a' });
      const clk = grp({ parent: WB.right, pos: [-0.55, 2.02, 0.02] });
      cy(0.2, 0.2, 0.04, '#2b2522', { parent: clk, rot: [PI / 2, 0, 0], cast: false }, 28);
      const clkFace = k.tex(512, 512, (ctx) => {
        ctx.scale(4, 4);
        ctx.fillStyle = '#f6f1e8'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#2b2522'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 13px Georgia, serif';
        for (let i = 1; i <= 12; i++) { const a = i * PI / 6 - PI / 2; ctx.fillText(String(i), 64 + Math.cos(a) * 47, 64 + Math.sin(a) * 47); }
        for (let i = 0; i < 60; i++) { const a = i * PI / 30; ctx.fillRect(64 + Math.cos(a) * 58 - 0.5, 64 + Math.sin(a) * 58 - 0.5, 1, 1); }
        ctx.font = '600 6px Arial'; ctx.fillText('CASA', 64, 84);
      });
      M.mesh(M.planeGeo(0.36, 0.36), k.tmat(clkFace, { rough: 0.6, transparent: true }), { parent: clk, pos: [0, 0, 0.021], cast: false });
      const hourHand = bx(0.012, 0.09, 0.004, '#2b2522', { parent: clk, pos: [0, 0, 0.026], cast: false });
      const minHand = bx(0.008, 0.14, 0.004, '#2b2522', { parent: clk, pos: [0, 0, 0.03], cast: false });
      clk.userData.live = true;
      // mural de cortiça (ponto 'mural'): uma textura só, com recados escritos à mão, alfinetes, foto e o
      // ingresso do show — de perto (1ª pessoa) os recados se leem, em vez de quadradinhos coloridos vazios
      const cork = grp({ parent: WB.right, pos: [-1.45, 1.45, 0.01] });
      rb(0.7, 0.5, 0.025, 0.01, '#b5835a', { parent: cork, pos: [0, 0, 0.012] }, 1);
      const corkPhoto = photoTex(k, 4);
      const corkTex = k.tex(640, 440, (ctx, w, h) => {
        const r = M.rng(23);
        ctx.fillStyle = '#c9a074'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(120,80,40,0.22)' : 'rgba(240,210,160,0.25)'; ctx.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
        const hand = '"Segoe Print", "Comic Sans MS", "Bradley Hand", cursive';
        const note = (x, y, nw, nh, rot, col, lines, pin) => {
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
          ctx.fillStyle = 'rgba(60,35,15,0.22)'; ctx.fillRect(-nw / 2 + 4, -nh / 2 + 5, nw, nh);
          ctx.fillStyle = col; ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
          ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(-nw / 2, -nh / 2, nw, nh * 0.16);
          ctx.fillStyle = '#2b2a3a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          lines.forEach((ln, i) => { ctx.font = (i === 0 ? '700 ' : '400 ') + (i === 0 ? 25 : 21) + 'px ' + hand; ctx.fillText(ln, 0, -nh / 2 + 36 + i * 28); });
          ctx.fillStyle = pin; ctx.beginPath(); ctx.arc(0, -nh / 2 + 9, 8, 0, PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-2.5, -nh / 2 + 6.5, 2.6, 0, PI * 2); ctx.fill();
          ctx.restore();
        };
        note(118, 120, 150, 140, 0.08, '#ffe680', ['Pagar a luz', 'até quinta!'], '#e94b5a');
        note(300, 112, 150, 140, -0.07, '#ff9fb0', ['Dentista', 'sáb · 10h'], '#4166a8');
        note(522, 150, 150, 140, 0.1, '#9fe0c8', ['Niver da vó', '12/10 · bolo!'], '#f2a53a');
        note(170, 318, 160, 140, -0.05, '#9fc0ff', ['Ligar p/ o', 'encanador', '(pia pinga)'], '#2f9f78');
        // foto da família presa com alfinete
        ctx.save(); ctx.translate(372, 316); ctx.rotate(0.06);
        ctx.fillStyle = 'rgba(60,35,15,0.25)'; ctx.fillRect(-72, -58, 150, 124);
        ctx.fillStyle = '#fbf8f0'; ctx.fillRect(-76, -62, 150, 124);
        ctx.drawImage(corkPhoto.userData.canvas, -68, -54, 134, 96);
        ctx.fillStyle = '#7a5ac8'; ctx.beginPath(); ctx.arc(0, -54, 7, 0, PI * 2); ctx.fill();
        ctx.restore();
        // ingresso de show (anos 80) — gancho do capítulo do presente
        ctx.save(); ctx.translate(540, 334); ctx.rotate(-0.12);
        ctx.fillStyle = '#f6efe2'; ctx.fillRect(-62, -34, 124, 68);
        ctx.fillStyle = '#c8453a'; ctx.fillRect(-62, -34, 124, 18);
        ctx.fillStyle = '#ffffff'; ctx.font = '800 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('INGRESSO', 0, -21);
        ctx.fillStyle = '#2b2a3a'; ctx.font = '700 15px Arial'; ctx.fillText('Rock dos anos 80', 0, 6); ctx.font = '400 12px Arial'; ctx.fillText('setor B · fila 12', 0, 24);
        ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.moveTo(34, -34); ctx.lineTo(34, 34); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
      });
      pl(0.64, 0.44, k.tmat(corkTex, { rough: 0.85 }), { parent: cork, pos: [0, 0, 0.026], cast: false });
      rb(0.08, 0.12, 0.012, 0.005, '#f7f4ee', { parent: WB.right, pos: [0.8, 1.15, 0.006], cast: false }, 1);

      // --- Parede da frente: passagem para a sala + aparador
      const pas = grp({ parent: WB.front, pos: [1.3, 0, 0] });
      [-1, 1].forEach((sd) => bx(0.07, 2.32, 0.03, '#f2ede4', { parent: pas, pos: [sd * 0.585, 1.16, 0.015], cast: false }));
      bx(1.24, 0.07, 0.03, '#f2ede4', { parent: pas, pos: [0, 2.285, 0.015], cast: false });
      // vão da passagem: "pintura" do corredor que leva à sala (não fica um buraco escuro de perto)
      const hallTex = k.tex(512, 1024, (ctx, w, h) => {
        const bx0 = w * 0.24, bx1 = w * 0.76, by0 = h * 0.22, by1 = h * 0.7; // parede do fundo
        const quad = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill(); };
        quad([[0, 0], [w, 0], [bx1, by0], [bx0, by0]], '#ece4d6');                       // teto
        quad([[0, 0], [bx0, by0], [bx0, by1], [0, h]], '#d2c3ae');                       // parede esq.
        quad([[w, 0], [bx1, by0], [bx1, by1], [w, h]], '#dccdb8');                       // parede dir.
        quad([[0, h], [bx0, by1], [bx1, by1], [w, h]], '#8a5a3a');                       // piso
        ctx.strokeStyle = 'rgba(40,20,8,0.35)'; ctx.lineWidth = 2;
        for (let i = 1; i < 9; i++) { const t = i / 9, y = by1 + (h - by1) * t * t; ctx.beginPath(); ctx.moveTo(bx0 - (bx0) * t * t, y); ctx.lineTo(bx1 + (w - bx1) * t * t, y); ctx.stroke(); }
        ctx.fillStyle = '#b9654a'; ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);        // parede terracota da sala
        const lg = ctx.createRadialGradient(bx0 + 40, by1 - 120, 4, bx0 + 40, by1 - 120, 200);
        lg.addColorStop(0, 'rgba(255,214,150,0.9)'); lg.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2b2522'; ctx.fillRect(w * 0.44, by0 + 70, 120, 150);           // quadro
        ctx.fillStyle = '#efe2c8'; ctx.fillRect(w * 0.44 + 10, by0 + 80, 100, 130);
        ctx.fillStyle = '#e0a33a'; ctx.beginPath(); ctx.arc(w * 0.44 + 60, by0 + 130, 26, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#3e6250'; ctx.fillRect(w * 0.44 + 10, by0 + 165, 100, 45);
        ctx.fillStyle = '#3e6250'; ctx.fillRect(bx1 - 150, by1 - 90, 130, 70);            // sofá ao longe
        ctx.fillStyle = '#e0a33a'; ctx.fillRect(bx1 - 140, by1 - 110, 34, 30);
        const v = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.2, w / 2, h * 0.5, h * 0.75);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,5,0.55)');
        ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
      });
      const hallMat = k.bmat(hallTex, { fog: false });
      pl(1.1, 2.25, hallMat, { parent: pas, pos: [0, 1.125, -0.12], cast: false }).userData.live = true;
      const ap = grp({ parent: WB.front, pos: [-1.0, 0, 0] });
      rb(1.4, 0.7, 0.42, 0.015, '#a8744c', { parent: ap, pos: [0, 0.45, 0.21] }, 1);
      [[-0.64, 0.05], [0.64, 0.05], [-0.64, 0.37], [0.64, 0.37]].forEach(([a, b]) => cy(0.016, 0.012, 0.12, '#5a3a26', { parent: ap, pos: [a, 0.06, b] }, 6));
      [-0.35, 0.35].forEach((x) => { rb(0.66, 0.6, 0.015, 0.006, '#93633f', { parent: ap, pos: [x, 0.45, 0.425] }, 1); });
      // costas acabadas (vistas no plano geral com a parede da frente escondida)
      rb(1.32, 0.6, 0.012, 0.004, '#8a5a3a', { parent: ap, pos: [0, 0.45, -0.004], cast: false }, 1);
      [-0.33, 0.33].forEach((x) => rb(0.6, 0.5, 0.012, 0.004, '#a06c48', { parent: ap, pos: [x, 0.45, -0.009], cast: false }, 1));
      bx(1.4, 0.025, 0.014, '#6e4630', { parent: ap, pos: [0, 0.785, -0.006], cast: false });
      const radio = grp({ parent: ap, pos: [-0.4, 0.8, 0.2] });
      rb(0.32, 0.18, 0.13, 0.04, '#2f6f8a', { parent: radio, pos: [0, 0.09, 0] }, 2);
      cy(0.05, 0.05, 0.01, '#e9dcc0', { parent: radio, pos: [-0.07, 0.09, 0.066], rot: [PI / 2, 0, 0], cast: false }, 14);
      rb(0.1, 0.05, 0.01, 0.005, '#f2c14e', { parent: radio, pos: [0.08, 0.1, 0.066], cast: false }, 1);
      fruitBowl(ap, { pos: [0.3, 0.8, 0.2], seed: 2 });
      picture(WB.front, { pos: [-1.0, 1.65, 0], w: 0.7, h: 0.5, img: k.tmat(artTex(k, ['#f3e2c4', '#d9774a', '#2f6f8a', '#7d9a78'], 'sol'), { rough: 0.8 }), frame: '#b07a4f' });

      // --- Mesa de jantar + 4 cadeiras
      const TX = 0.55, TZ = 0.5;
      const table = grp({ parent: deco, pos: [TX, 0, TZ] });
      rb(1.5, 0.05, 0.9, 0.015, '#a0693f', { parent: table, pos: [0, 0.735, 0] }, 2);
      rb(1.36, 0.06, 0.76, 0.01, '#8a5a36', { parent: table, pos: [0, 0.69, 0] }, 1);
      [[-0.66, -0.36], [0.66, -0.36], [-0.66, 0.36], [0.66, 0.36]].forEach(([a, b]) => cy(0.03, 0.022, 0.68, '#7a4b2f', { parent: table, pos: [a, 0.34, b] }, 8));
      // trilho de mesa (linho)
      rb(1.56, 0.006, 0.34, 0.002, '#e8dcc6', { parent: table, pos: [0, 0.763, 0], cast: false }, 1);
      // fruteira fora do centro: o ponto 'faisca' (sobre a mesa) fica no meio, e a Faísca sentava dentro das frutas
      fruitBowl(table, { pos: [0.34, 0.765, 0.12], seed: 7 });
      // vasinho de flores fora da linha de visão entre as cabeceiras (mesa4 ↔ mesa2: o rosto de quem está em frente)
      plant(table, 'flor', { pos: [-0.24, 0.765, 0.3], potR: 0.045, potH: 0.12, pot: '#2f6f8a', seed: 5, n: 5 });
      mug(table, { pos: [-0.38, 0.765, -0.28], color: '#24324f' });
      cup(table, { pos: [0.42, 0.765, -0.26], band: '#2f6f8a' });
      // celular do pai na mesa
      rb(0.075, 0.009, 0.155, 0.008, '#1d1d24', { parent: table, pos: [-0.2, 0.77, -0.3], rot: [0, 0.3, 0] }, 1);
      // jornal dobrado ao lado do lugar do pai (cabeceira mesa4)
      const jornal = grp({ parent: table, pos: [-0.5, 0.77, 0.2], rot: [0, -1.27, 0] }); // manchete virada para quem senta na mesa4
      rb(0.3, 0.012, 0.22, 0.003, '#e9e4d8', { parent: jornal, cast: false }, 1);
      const jornalTex = k.tex(384, 288, (ctx, w, h) => {
        ctx.fillStyle = '#efebe1'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1e1e24'; ctx.textAlign = 'center'; ctx.font = '700 40px Georgia, "Times New Roman", serif'; ctx.fillText('O DIÁRIO', w / 2, 44);
        ctx.fillRect(14, 54, w - 28, 3); ctx.fillRect(14, 60, w - 28, 1);
        ctx.font = '700 25px Georgia, serif'; ctx.textAlign = 'left'; ctx.fillText('IA chega ao escritório:', 16, 92); ctx.fillText('o que muda no trabalho', 16, 120);
        ctx.fillStyle = '#9a9890'; ctx.fillRect(16, 134, 150, 104);
        ctx.fillStyle = '#c4c2b8'; ctx.beginPath(); ctx.arc(90, 186, 26, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#8a887f';
        for (let i = 0; i < 11; i++) { ctx.fillRect(180, 138 + i * 13, (i % 4 === 3 ? 120 : 186), 5); }
        for (let i = 0; i < 4; i++) ctx.fillRect(16, 248 + i * 11, w - 32 - (i === 3 ? 140 : 0), 4);
      });
      pl(0.29, 0.21, k.tmat(jornalTex, { rough: 0.9 }), { parent: jornal, pos: [0, 0.0066, 0], rot: [-PI / 2, 0, 0], cast: false });
      const chairs = { mesa1: [TX - 0.4, TZ - 0.95, 0], mesa3: [TX + 0.4, TZ - 0.95, 0], mesa2: [TX + 1.25, TZ, -PI / 2], mesa4: [TX - 1.25, TZ, PI / 2] };
      Object.keys(chairs).forEach((n) => { const c = chairs[n]; chair(deco, { x: c[0], z: c[1], rot: c[2], wood: '#7a4b2f', seat: '#e0a33a', back: 'palha' }); });
      // pendentes
      // pendentes de alumínio esmaltado terracota (altos o bastante para não tapar a visão de quem está em pé)
      // (materiais próprios: à noite o esmalte ganha um brilho quente e o interior da cúpula acende)
      const pendMat = k.umat('#c8653f', { rough: 0.45, side: 'double', emissive: '#ff8a4a', emissiveIntensity: 0 });
      const pendIn = k.umat('#f6efe2', { rough: 0.6, side: 'back', emissive: '#ffd9a0', emissiveIntensity: 0 });
      const bulbMat = k.umat('#fff4dc', { emissive: '#ffcf8a', emissiveIntensity: 0.4 });
      const PY = 1.66;
      [TX - 0.38, TX + 0.38].forEach((x) => {
        const pg = grp({ parent: deco, pos: [x, 0, TZ] });
        cy(0.004, 0.004, 2.7 - PY - 0.2, '#1d1d22', { parent: pg, pos: [0, (2.7 + PY + 0.2) / 2, 0], cast: false }, 4);
        cy(0.035, 0.035, 0.02, '#e9e2d6', { parent: deco, pos: [x, 2.69, TZ], cast: false }, 12);
        const pts = [[0.02, 0.22], [0.04, 0.2], [0.11, 0.09], [0.15, 0.0], [0.148, -0.005]];
        lathe('pend2', pts, pendMat, { parent: pg, pos: [0, PY, 0], cast: false }, 22);
        lathe('pend2', pts, pendIn, { parent: pg, pos: [0, PY, 0], scale: [0.985, 0.985, 0.985], cast: false }, 22);
        sp(0.04, bulbMat, { parent: pg, pos: [0, PY + 0.05, 0], cast: false }, 10, 8);
      });
      // tapete passadeira diante da pia
      const runner = k.tmat(rugTex(k, { bg: '#e8dcc6', c1: '#2f6f8a', c2: '#d9774a', motif: 'linhas', border: 22, fringe: '#f2ead9' }), { rough: 1 });
      pl(0.62, 1.5, runner, { parent: deco, pos: [-1.88, 0.006, -0.9], rot: [-PI / 2, 0, 0], cast: false });
      // planta grande no canto
      plant(deco, 'costela', { pos: [-2.35, 0, 1.8], potR: 0.2, potH: 0.4, seed: 12, pot: '#e8e0d4', size: 0.62, n: 9 });

      // --- Luz do sol entrando pela janela
      const shaftMat = k.bmat(shaftTex(), { add: true, color: '#ffd9a0', opacity: 0.2, side: 'double', fog: false, toneMapped: false });
      beam(live, shaftMat, [-2.8, 1.65, -0.85], [-1.15, 0.0, -0.75], 1.2, [0, 0, 1]);
      const patchMat = k.bmat(patchTex(k, 2, 1), { add: true, color: '#ffcf8a', opacity: 0.38, fog: false, toneMapped: false });
      pl(1.0, 1.2, patchMat, { parent: live, pos: [-1.15, 0.012, -0.78], rot: [-PI / 2, 0, 0], cast: false });

      const L = lights(root, 'manha', 4.6);
      const pend = M.lampLight('#ffc477', 0, 4.2);
      pend.position.set(TX, PY - 0.05, TZ);
      root.add(pend);
      const pendGlows = [TX - 0.38, TX + 0.38].map((x) => { const g = M.glow('#ffc477', 0.5, 0); g.position.set(x, PY + 0.02, TZ); live.add(g); return g; });

      const ringManha = ringTex(k, 'manha', 51), ringNoite = ringTex(k, 'noite', 52);
      const out = outside(k, root, { sky: ['#5aa0e0', '#f4e4c8', '#e8dcc8'], sunPos: [-64, 22, -10], sunColor: '#fff0c8', sunSize: 22, seed: 5 });
      const nearViews = [WB.left.children.find((c) => c.userData.view).userData.view];

      keepOnFloor(root, deco, ap); // aparador com rádio e fruteira fica no chão (primeiro plano)
      // ...e some nos planos médios com a câmera logo atrás dele (ex.: 'mesa'), onde o rádio tapava a cena
      const fgCheck = fgHider([{ obj: ap, x: 1.0, z: D / 2 - 0.21, w: 1.42, d: 0.44, top: 1.0, wallZ: D / 2 }]);
      bake(deco);
      S.walls.forEach((w) => bake(w.obj));

      const PRESETS = {
        manha: { sky: '#ffeccc', ground: '#8a7660', hemi: 0.6, sun: '#ffcf90', sunI: 1.25, sunPos: [-7, 6, 1.5], amb: 0.08 },
        noite: { sky: '#2c3670', ground: '#100f18', hemi: 0.17, sun: '#8ea2ff', sunI: 0.16, sunPos: [-6, 7, 2], amb: 0.04 },
      };
      const state = { time: null, steam: true };
      return {
        root,
        background: '#1c1a24',
        fog: { color: '#f6e6c6', near: 24, far: 120 },
        walls: S.walls,
        defaultShot: 'geral',
        spots: {
          mesa1: { x: TX - 0.4, z: TZ - 0.95, rot: 0 },
          mesa3: { x: TX + 0.4, z: TZ - 0.95, rot: 0 },
          mesa2: { x: TX + 1.25, z: TZ, rot: -PI / 2 },
          mesa4: { x: TX - 1.25, z: TZ, rot: PI / 2 },
          cafe: { x: -0.9, z: -1.3, rot: 2.9 },
          geladeira: { x: 1.6, z: -1.1, rot: PI },
          pia: { x: -1.84, z: -0.85, rot: -PI / 2 },
          porta: { x: 2.25, z: 1.35, rot: -PI / 2 },
          centro: { x: -0.55, z: 1.45, rot: 0 },
          faisca: { x: TX, z: TZ, rot: 0, y: 1.08 },
          inicio: { x: 2.2, z: 1.55, rot: -1.75 },
          janela: { x: -1.84, z: -0.85, rot: -PI / 2 },
          fogao: { x: 0.2, z: -1.3, rot: PI },
          filtro: { x: 2.42, z: -1.4, rot: PI },
          mural: { x: 2.2, z: -1.3, rot: PI / 2 },
          relogio: { x: 2.1, z: -0.55, rot: PI / 2 },
          aparador: { x: 1.0, z: 1.55, rot: 0 },
        },
        bounds: S.bounds,
        colliders: [
          { x: -0.84, z: -1.98, w: 3.94, d: 0.66 },   // bancada do fundo
          { x: -2.48, z: -0.88, w: 0.66, d: 1.62 },   // bancada da pia
          { x: 1.62, z: -1.94, w: 0.82, d: 0.74 },    // geladeira
          { x: 2.42, z: -1.98, w: 0.44, d: 0.42 },    // filtro de barro
          { x: TX, z: TZ, w: 1.5, d: 0.9 },           // mesa
          { x: 1.0, z: 2.08, w: 1.42, d: 0.44 },      // aparador
          { x: -2.35, z: 1.8, w: 0.46, d: 0.46 },     // planta
        ],
        shots: {
          geral: { target: [-0.15, 0.85, -0.45], yaw: 0.52, pitch: 0.4, dist: 7.8, fov: 38 },
          mesa: { target: [TX, 0.85, TZ - 0.4], yaw: 0.25, pitch: 0.22, dist: 3.6, fov: 38 },
          dupla: { target: [TX + 0.6, 0.85, TZ - 0.3], yaw: 0.75, pitch: 0.18, dist: 3.2, fov: 38 },
          cafe: { target: [-0.95, 1.15, -1.75], yaw: 0.55, pitch: 0.18, dist: 2.4, fov: 38 },
          geladeira: { target: [1.6, 1.15, -1.6], yaw: 0.35, pitch: 0.12, dist: 3.0, fov: 38 },
          janela: { target: [-2.5, 1.3, -0.85], yaw: 1.3, pitch: 0.12, dist: 3.0, fov: 40 },
          porta: { target: [2.2, 1.1, 1.3], yaw: -1.1, pitch: 0.15, dist: 4.0, fov: 38 },
        },
        setParams(p) {
          p = p || {};
          const time = p.time === 'noite' ? 'noite' : 'manha';
          state.steam = p.steam !== false;
          if (time !== state.time) {
            state.time = time;
            const night = time === 'noite';
            L.set(PRESETS[time]);
            viewMat.map = night ? viewNoite : viewManha; viewMat.needsUpdate = true;
            if (night) out.set(['#060a1c', '#1d2b55', '#0c1022'], ringNoite, '#fff6dc', 0.45, 'noite');
            else out.set(['#4c96dc', '#f6e6c6', '#e8dcc8'], ringManha, '#fff0c8', 0.85, 'dia');
            out.sun.scale.setScalar(night ? 5 : 22);
            out.sun.position.set(night ? -50 : -64, night ? 24 : 22, night ? 16 : -10);
            shaftMat.visible = patchMat.visible = !night;
            pend.userData.light.intensity = night ? 2.8 : 0;
            S.ceiling.userData.setGlow(night ? 0.04 : 0.34, night ? '#ffd9a8' : '#fff1dc');
            hallMat.color.set(night ? '#a89484' : '#ffffff');
            pendGlows.forEach((g) => (g.material.opacity = night ? 0.6 : 0));
            bulbMat.emissiveIntensity = night ? 2.2 : 0.3;
            pendMat.emissiveIntensity = night ? 0.16 : 0;
            pendIn.emissiveIntensity = night ? 0.9 : 0;
            ledMat.emissiveIntensity = night ? 2.0 : 0;
            hourHand.rotation.z = -(night ? 20.25 : 7.25) / 12 * PI * 2;
            minHand.rotation.z = -(night ? 0.25 : 0.25) * PI * 2;
            hourHand.position.set(Math.sin(-hourHand.rotation.z) * 0.035, Math.cos(hourHand.rotation.z) * 0.035, 0.026);
            minHand.position.set(Math.sin(-minHand.rotation.z) * 0.06, Math.cos(minHand.rotation.z) * 0.06, 0.03);
          }
        },
        update(t) {
          updatePuffs(steamA, t, state.steam);
          updatePuffs(steamB, t + 0.5, state.steam && state.time === 'noite');
          const inside = out.check(W, D, H, nearViews);
          if (state.time === 'manha') shaftMat.opacity = (0.2 + Math.sin(t * 0.5) * 0.025) * (inside ? 0.5 : 1);
          fgCheck();
        },
        dispose() { k.dispose(root); },
      };
    },
  };

  // ==================================================================
  // SALA — noite, abajur âmbar, TV, alerta vermelho (golpe)
  // ==================================================================
  ENVS.sala = {
    name: 'Sala',
    build(params) {
      const k = kit();
      const root = grp({ name: 'env:sala' });
      const W = 6.0, D = 4.8, H = 2.7;
      const floorMat = k.tmat(chevronTex(k, '#9e6c44', { seed: 8, dark: '#6a4428', light: '#c89a6a' }), { rough: 0.55 });
      const wallMat = M.mat('#e9dfd0', { rough: 0.95 });
      const S = shell(k, root, {
        w: W, d: D, h: H, floorMat, wallMat, floorTile: 1.7,
        wallMats: { back: M.mat('#b9654a', { rough: 0.95 }) },
        openings: {
          right: [{ x: -0.35, w: 1.9, y0: 0.55, h: 1.85 }],
          left: [{ x: -1.55, w: 0.86, y0: 0, h: 2.12 }],
        },
        base: '#1f1d2a', slab: '#c9b59a', trim: '#a88a5a',
        ceiling: { color: '#f1ebe2', sanca: 0.5, led: '#ffb866', spots: [[-1.6, -1.2], [1.6, -1.2], [0, 1.4], [-1.9, 1.2], [1.9, 1.2]] },
      });
      const WB = S.wallGroups;
      const deco = grp({ parent: root, name: 'decor' });
      const live = grp({ parent: root, name: 'live' });
      live.userData.live = true;

      // --- Sofá de veludo verde (encostado na parede do fundo, de frente p/ câmera)
      const sofaC = M.mat('#3e6250', { rough: 0.85 });
      const sofaD = M.mat('#345545', { rough: 0.85 });
      const sofa = grp({ parent: deco, pos: [-0.05, 0, -1.88] });
      rb(2.4, 0.26, 0.95, 0.06, sofaD, { parent: sofa, pos: [0, 0.2, 0] }, 2);
      [-0.55, 0.55].forEach((x) => rb(1.08, 0.16, 0.66, 0.07, sofaC, { parent: sofa, pos: [x, 0.39, 0.12] }, 3));
      rb(2.3, 0.5, 0.26, 0.09, sofaC, { parent: sofa, pos: [0, 0.62, -0.33], rot: [-0.08, 0, 0] }, 3);
      [-1, 1].forEach((sd) => rb(0.2, 0.42, 0.92, 0.08, sofaC, { parent: sofa, pos: [sd * 1.15, 0.43, 0] }, 3));
      [[-1.05, -0.38], [1.05, -0.38], [-1.05, 0.38], [1.05, 0.38]].forEach(([a, b]) => cy(0.022, 0.016, 0.07, '#3a2a20', { parent: sofa, pos: [a, 0.035, b] }, 6));
      // almofadas
      [[-0.85, '#e0a33a', 0.25], [-0.45, '#efe4d0', -0.1], [0.62, '#c8653f', -0.2], [0.95, '#efe4d0', 0.15]].forEach(([x, c, r]) => rb(0.4, 0.38, 0.13, 0.06, c, { parent: sofa, pos: [x, 0.66, -0.17], rot: [-0.25, r, 0] }, 3));
      // manta de crochê no braço
      const croche = k.tmat(k.tex(128, 128, (ctx, w, h) => { ctx.fillStyle = '#f2e6d0'; ctx.fillRect(0, 0, w, h); const cs = ['#e0a33a', '#c8653f', '#2f6f8a', '#7d9a78']; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = cs[(i + j) % 4]; ctx.beginPath(); ctx.arc(16 + i * 32, 16 + j * 32, 10, 0, PI * 2); ctx.fill(); ctx.fillStyle = '#f2e6d0'; ctx.beginPath(); ctx.arc(16 + i * 32, 16 + j * 32, 4, 0, PI * 2); ctx.fill(); } }), { rough: 1 });
      rb(0.5, 0.03, 0.95, 0.012, croche, { parent: sofa, pos: [1.15, 0.655, 0.02] }, 1);
      rb(0.03, 0.5, 0.95, 0.012, croche, { parent: sofa, pos: [1.265, 0.42, 0.02] }, 1);

      // --- Galeria de quadros sobre o sofá (parede do fundo)
      const gal = [
        { x: -0.75, y: 1.62, w: 0.5, h: 0.62, img: k.tmat(artTex(k, ['#efe2c8', '#e0a33a', '#2f6f8a', '#c8653f'], 'sol'), { rough: 0.8 }) },
        { x: -0.2, y: 1.78, w: 0.36, h: 0.3, img: k.tmat(photoTex(k, 0, { people: 3 }), { rough: 0.6 }) },
        { x: -0.2, y: 1.38, w: 0.36, h: 0.3, img: k.tmat(photoTex(k, 1, { people: 2 }), { rough: 0.6 }) },
        { x: 0.38, y: 1.62, w: 0.56, h: 0.68, img: k.tmat(artTex(k, ['#f2e9da', '#3e6250', '#7d9a78', '#2b5a44'], 'folhas'), { rough: 0.8 }) },
        { x: 0.95, y: 1.72, w: 0.3, h: 0.36, img: k.tmat(photoTex(k, 2, { people: 2 }), { rough: 0.6 }) },
      ];
      gal.forEach((q, i) => picture(WB.back, { pos: [q.x, q.y, 0], w: q.w, h: q.h, img: q.img, frame: i % 2 ? '#c9a25a' : '#2b2522', inset: q.w > 0.4 ? 0.06 : 0.035 }));

      // --- Abajur de chão (tripé + cúpula de linho) à esquerda do sofá
      const fl = grp({ parent: deco, pos: [-1.72, 0, -1.95] });
      [0, 2.1, 4.2].forEach((a) => cy(0.012, 0.012, 1.42, '#6a4a30', { parent: fl, pos: [Math.sin(a) * 0.12, 0.69, Math.cos(a) * 0.12], rot: [-Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09] }, 6));
      cy(0.01, 0.01, 0.12, '#c9a25a', { parent: fl, pos: [0, 1.42, 0], cast: false }, 6);
      const lampShadeMat = k.umat('#f3e3c3', { rough: 0.9, side: 'double', emissive: '#ffb45e', emissiveIntensity: 1.0 });
      const shadeM = M.mesh(M.cylGeo(0.2, 0.26, 0.32, 24, true), lampShadeMat, { parent: fl, pos: [0, 1.52, 0], cast: false });
      shadeM.userData.live = true;
      // mesinha lateral com livro e chá
      const st = grp({ parent: deco, pos: [1.52, 0, -2.0] });
      cy(0.2, 0.2, 0.03, '#a8744c', { parent: st, pos: [0, 0.52, 0] }, 20);
      cy(0.02, 0.02, 0.5, '#2b2522', { parent: st, pos: [0, 0.26, 0] }, 8);
      cy(0.15, 0.15, 0.02, '#2b2522', { parent: st, pos: [0, 0.01, 0] }, 16);
      bookStack(st, { pos: [0, 0.535, 0], n: 2, seed: 3, w: 0.18, d: 0.13 });
      mug(st, { pos: [0.1, 0.535, 0.08], color: '#efe4d0' });
      // costela-de-adão no cesto
      plant(deco, 'costela', { pos: [2.05, 0, -1.95], potR: 0.22, potH: 0.38, potKind: 'cesto', seed: 4, size: 0.75, n: 10 });

      // --- Mesa de centro com livros, vela, celular
      const ct = grp({ parent: deco, pos: [0, 0, -0.55] });
      rb(1.15, 0.05, 0.62, 0.02, '#8a5a36', { parent: ct, pos: [0, 0.4, 0] }, 2);
      rb(1.05, 0.03, 0.52, 0.01, '#7a4b2f', { parent: ct, pos: [0, 0.12, 0] }, 1);
      [[-0.5, -0.24], [0.5, -0.24], [-0.5, 0.24], [0.5, 0.24]].forEach(([a, b]) => cy(0.022, 0.018, 0.4, '#5a3a26', { parent: ct, pos: [a, 0.2, b] }, 6));
      bookStack(ct, { pos: [-0.3, 0.425, -0.05], n: 3, seed: 7, w: 0.28, d: 0.2 });
      bookStack(ct, { pos: [-0.25, 0.135, 0.02], n: 2, seed: 2, w: 0.3, d: 0.22 });
      lathe('bowl2', [[0.001, 0], [0.05, 0], [0.12, 0.05], [0.13, 0.065], [0.12, 0.065], [0.045, 0.012], [0.001, 0.012]], '#2f6f8a', { parent: ct, pos: [0.25, 0.425, -0.08] });
      cy(0.035, 0.035, 0.08, '#f6efe2', { parent: ct, pos: [0.42, 0.465, 0.12] }, 14);
      rb(0.05, 0.012, 0.16, 0.006, '#1d1d22', { parent: ct, pos: [0.05, 0.43, 0.15], rot: [0, 0.4, 0] }, 1);
      const phoneG = grp({ parent: deco, pos: [0.12, 0.425, -0.42], rot: [0, -0.5, 0] });
      phoneG.userData.live = true;
      rb(0.075, 0.009, 0.155, 0.008, '#1d1d24', { parent: phoneG, pos: [0, 0.0045, 0] }, 2);
      const phoneTex = k.tex(256, 512, () => {});
      const phoneScreen = pl(0.066, 0.142, k.bmat(phoneTex, { toneMapped: false }), { parent: phoneG, pos: [0, 0.0095, 0], rot: [-PI / 2, 0, 0], cast: false });
      void phoneScreen;
      const candleFlame = M.glow('#ffb45e', 0.12, 0.7);
      candleFlame.position.set(0.42, 0.53, -0.43);
      live.add(candleFlame);

      // --- Tapete grande
      const rugMat = k.tmat(rugTex(k, { bg: '#e7d8bf', c1: '#c8653f', c2: '#3e6250', motif: 'losango', border: 30, fringe: '#efe6d6' }), { rough: 1 });
      pl(3.3, 2.5, rugMat, { parent: deco, pos: [0, 0.006, -1.05], rot: [-PI / 2, 0, 0], cast: false });

      // --- Parede esquerda: estante com livros e objetos + porta
      const shelfMat = M.mat('#9a6a44', { rough: 0.6 });
      const est = grp({ parent: WB.left, pos: [0.45, 0, 0] });
      bx(1.9, 2.22, 0.02, '#5a3a26', { parent: est, pos: [0, 1.11, 0.02], cast: false });
      [-0.94, 0.94].forEach((x) => rb(0.04, 2.22, 0.37, 0.008, shelfMat, { parent: est, pos: [x, 1.11, 0.19] }, 1));
      rb(1.92, 0.04, 0.37, 0.008, shelfMat, { parent: est, pos: [0, 2.2, 0.19] }, 1);
      bx(1.86, 0.07, 0.02, '#5a3a26', { parent: est, pos: [0, 0.035, 0.36], cast: false });
      [0.08, 0.5, 0.92, 1.34, 1.76, 2.18].forEach((y) => bx(1.86, 0.03, 0.34, shelfMat, { parent: est, pos: [0, y, 0.2], cast: false }));
      [-0.62, 0.31].forEach((x) => bx(0.03, 2.1, 0.34, shelfMat, { parent: est, pos: [x, 1.13, 0.2], cast: false }));
      // a estante é aberta na frente: "esvazia" o volume com prateleiras
      books(est, { pos: [-0.3, 0.095, 0.2], len: 0.55, h: 0.36, d: 0.24, seed: 2 });
      books(est, { pos: [0.6, 0.515, 0.2], len: 0.5, h: 0.3, d: 0.22, seed: 3 });
      books(est, { pos: [-0.78, 0.935, 0.2], len: 0.28, h: 0.3, seed: 4 });
      books(est, { pos: [-0.15, 1.355, 0.2], len: 0.8, h: 0.28, seed: 5 });
      books(est, { pos: [0.65, 1.775, 0.2], len: 0.45, h: 0.3, seed: 9 });
      lathe('vaseA', [[0.001, 0], [0.06, 0], [0.09, 0.08], [0.06, 0.2], [0.035, 0.24], [0.04, 0.26], [0.001, 0.26]], '#c8653f', { parent: est, pos: [-0.2, 0.935, 0.2] });
      lathe('vaseB', [[0.001, 0], [0.05, 0], [0.07, 0.05], [0.07, 0.12], [0.03, 0.17], [0.001, 0.17]], '#efe4d0', { parent: est, pos: [0.0, 0.935, 0.2] });
      plant(est, 'samambaia', { pos: [0.65, 0.935, 0.2], potR: 0.09, potH: 0.14, pot: '#f2ede4', seed: 6, size: 0.36 });
      picture(est, { pos: [-0.85, 0.535 + 0.12, 0.2], rot: [0, 0.1, 0], w: 0.2, h: 0.25, img: k.tmat(photoTex(k, 5, { people: 2 }), { rough: 0.6 }), frame: '#c9a25a', stand: true, inset: 0.03 });
      bookStack(est, { pos: [-0.25, 0.53, 0.2], n: 3, seed: 11, w: 0.24, d: 0.18 });
      sp(0.06, '#2f6f8a', { parent: est, pos: [0.05, 0.58, 0.2], cast: false }, 12, 8);
      // vitrola
      const vit = grp({ parent: est, pos: [-0.2, 1.795, 0.2] });
      rb(0.42, 0.1, 0.32, 0.015, '#6a4430', { parent: vit, pos: [0, 0.05, 0] }, 1);
      cy(0.13, 0.13, 0.008, '#18181c', { parent: vit, pos: [-0.04, 0.105, 0], cast: false }, 24);
      cy(0.04, 0.04, 0.01, '#c8453a', { parent: vit, pos: [-0.04, 0.11, 0], cast: false }, 12);
      bx(0.015, 0.01, 0.2, '#c5c9ce', { parent: vit, pos: [0.15, 0.12, 0.02], rot: [0, 0.4, 0], cast: false });
      plant(est, 'espada', { pos: [0.6, 2.195, 0.18], potR: 0.07, potH: 0.12, pot: '#2b2522', seed: 9, size: 0.28, n: 6 });
      doorUnit(WB.left, { x: -1.55, w: 0.84, color: '#9a6a44', panelColor: '#8a5c3a' });

      // --- Parede direita: janela com a cidade à noite + poltrona
      const cityNight = viewTex(k, { seed: 13, sky: ['#060a1a', '#0f1a3e', '#1f2c5c', '#3a3a6e'], stars: true, moon: [0.25, 0.16], windows: 0.58, winColor: (v) => (v > 0.93 ? '#ffd27a' : v > 0.8 ? 'rgba(255,226,170,0.85)' : 'rgba(170,200,255,0.55)'), layers: [['#202850', 0.48, 0.34], ['#161c3c', 0.6, 0.28], ['#0d1228', 0.74, 0.2]] });
      const viewMat = k.bmat(cityNight, { fog: false });
      windowUnit(k, WB.right, { x: -0.35, y0: 0.55, w: 1.9, h: 1.85, viewMat, mullions: 2, frame: '#2b2522', transom: 0.78 });
      curtains(WB.right, { x: -0.35, w: 1.9, top: 2.52, h: 2.45, color: '#d8c7a8', sheer: '#f2ece2', out: 0.25, panelW: 0.55 });
      const arm = grp({ parent: deco, pos: [2.0, 0, -0.85], rot: [0, -1.2, 0] });
      rb(0.82, 0.24, 0.78, 0.08, '#c8653f', { parent: arm, pos: [0, 0.3, 0] }, 2);
      rb(0.66, 0.12, 0.62, 0.06, '#d4744d', { parent: arm, pos: [0, 0.45, 0.05] }, 3);
      rb(0.8, 0.55, 0.18, 0.08, '#c8653f', { parent: arm, pos: [0, 0.68, -0.32], rot: [-0.15, 0, 0] }, 3);
      [-1, 1].forEach((sd) => rb(0.13, 0.28, 0.72, 0.06, '#c8653f', { parent: arm, pos: [sd * 0.36, 0.5, 0] }, 2));
      [[-0.33, -0.3], [0.33, -0.3], [-0.33, 0.3], [0.33, 0.3]].forEach(([a, b]) => cy(0.016, 0.012, 0.2, '#3a2a20', { parent: arm, pos: [a, 0.1, b] }, 6));
      rb(0.36, 0.34, 0.12, 0.05, '#efe4d0', { parent: arm, pos: [0.0, 0.66, -0.2], rot: [-0.2, 0.1, 0] }, 3);

      // --- Parede direita (parte da frente): aparador + quadro grande + luminária
      const apd = grp({ parent: WB.right, pos: [1.45, 0, 0] });
      rb(1.2, 0.72, 0.4, 0.015, '#b5835a', { parent: apd, pos: [0, 0.42, 0.2] }, 1);
      [[-0.55, 0.04], [0.55, 0.04], [-0.55, 0.36], [0.55, 0.36]].forEach(([a, b]) => cy(0.016, 0.012, 0.08, '#2b2522', { parent: apd, pos: [a, 0.04, b] }, 6));
      [-0.3, 0.3].forEach((x) => { rb(0.56, 0.6, 0.012, 0.005, '#a2734c', { parent: apd, pos: [x, 0.42, 0.405] }, 1); rb(0.012, 0.16, 0.02, 0.005, '#c9a25a', { parent: apd, pos: [x + (x < 0 ? 0.24 : -0.24), 0.5, 0.42], cast: false }, 1); });
      lathe('vaseD', [[0.001, 0], [0.08, 0], [0.11, 0.12], [0.07, 0.3], [0.05, 0.36], [0.06, 0.38], [0.001, 0.38]], '#e9dfcf', { parent: apd, pos: [-0.38, 0.78, 0.2] });
      plant(apd, 'flor', { pos: [-0.38, 0.88, 0.2], potH: 0, seed: 14, n: 7, flowers: ['#f2e6d0', '#e0a33a', '#c8653f'] });
      bookStack(apd, { pos: [0.25, 0.78, 0.2], n: 3, seed: 19, w: 0.3, d: 0.22 });
      picture(WB.right, { pos: [1.45, 1.62, 0], w: 0.95, h: 0.68, img: k.tmat(artTex(k, ['#2a3a5a', '#e0a33a', '#c8653f', '#3e6250'], 'abstrato'), { rough: 0.8 }), frame: '#c9a25a', inset: 0.07 });
      // --- Parede da frente: painel ripado + TV + rack
      const F = WB.front;
      picture(F, { pos: [-2.05, 1.55, 0], w: 0.5, h: 0.64, img: k.tmat(artTex(k, ['#efe2c8', '#3e6250', '#c8653f', '#e0a33a'], 'folhas'), { rough: 0.8 }), frame: '#2b2522' });
      picture(F, { pos: [2.05, 1.62, 0], w: 0.44, h: 0.56, img: k.tmat(photoTex(k, 6, { people: 3 }), { rough: 0.6 }), frame: '#c9a25a', inset: 0.05 });
      plant(F, 'palmeira', { pos: [-2.3, 0, 0.32], potR: 0.2, potH: 0.42, pot: '#2b2522', size: 0.95, seed: 8 });
      const slat = M.mat('#7a4e33', { rough: 0.7 });
      bx(2.6, 2.5, 0.02, '#3e2a1e', { parent: F, pos: [0, 1.25, 0.01], cast: false });
      // ripas: atrás da TV (x ±0,73, y 0,9–1,74) ficam só os trechos de cima e de baixo — ripa escondida atrás da
      // TV "vazava" em riscos escuros finos sobre a tela vista de longe
      for (let i = 0; i < 26; i++) {
        const x = -1.27 + i * 0.1016;
        if (Math.abs(x) < 0.76) {
          bx(0.055, 0.93, 0.03, slat, { parent: F, pos: [x, 0.01 + 0.465, 0.035], cast: false });
          bx(0.055, 0.77, 0.03, slat, { parent: F, pos: [x, 1.71 + 0.385, 0.035], cast: false });
        } else bx(0.055, 2.48, 0.03, slat, { parent: F, pos: [x, 1.25, 0.035], cast: false });
      }
      // luz de fundo âmbar atrás da TV (LED "bias light"): halo quente nas ripas em volta da tela — é o que dá
      // aconchego à parede da TV vista do sofá (sem custo de luz: plano aditivo)
      const haloTex = k.tex(256, 160, (ctx, w, h) => {
        ctx.filter = 'blur(14px)';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillRect(w * 0.2, h * 0.24, w * 0.6, h * 0.52);
        ctx.filter = 'none';
      });
      const haloMat = k.bmat(haloTex, { add: true, color: '#ffb066', opacity: 0.5, fog: false, toneMapped: false });
      const halo = pl(2.3, 1.45, haloMat, { parent: F, pos: [0, 1.32, 0.06], cast: false });
      halo.userData.live = true; halo.renderOrder = 3;
      // arandelas de latão dos dois lados do ripado: dois pontos quentes na parede fria da noite
      const brassS = M.mat('#c9a25a', { rough: 0.35, metal: 0.7 });
      const sconceIn = k.umat('#fff1d6', { side: 'double', emissive: '#ffbf6e', emissiveIntensity: 1.2 });
      const washTexS = k.tex(128, 256, (ctx, w, h) => {
        const up = ctx.createLinearGradient(0, h * 0.5, 0, 0); up.addColorStop(0, 'rgba(255,255,255,0.95)'); up.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = up; ctx.beginPath(); ctx.moveTo(w * 0.4, h * 0.5); ctx.lineTo(w * 0.6, h * 0.5); ctx.lineTo(w * 0.98, 0); ctx.lineTo(w * 0.02, 0); ctx.closePath(); ctx.fill();
        const dn = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.8); dn.addColorStop(0, 'rgba(255,255,255,0.6)'); dn.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = dn; ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.5); ctx.lineTo(w * 0.58, h * 0.5); ctx.lineTo(w * 0.72, h * 0.8); ctx.lineTo(w * 0.28, h * 0.8); ctx.closePath(); ctx.fill();
        const c = ctx.createRadialGradient(w / 2, h * 0.5, 0, w / 2, h * 0.5, w * 0.5); c.addColorStop(0, 'rgba(255,255,255,0.7)'); c.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = c; ctx.fillRect(0, 0, w, h);
      });
      const sconceWash = k.bmat(washTexS, { add: true, color: '#ffae5a', opacity: 0.42, fog: false, toneMapped: false });
      [-1.55, 1.55].forEach((sx) => {
        cy(0.045, 0.045, 0.02, brassS, { parent: F, pos: [sx, 1.78, 0.01], rot: [PI / 2, 0, 0], cast: false }, 16);
        cy(0.008, 0.008, 0.11, brassS, { parent: F, pos: [sx, 1.78, 0.07], rot: [PI / 2, 0, 0], cast: false }, 6);
        M.mesh(M.cylGeo(0.085, 0.045, 0.13, 20, true), sconceIn, { parent: F, pos: [sx, 1.8, 0.13], cast: false });
        cy(0.047, 0.047, 0.01, brassS, { parent: F, pos: [sx, 1.735, 0.13], cast: false }, 16);
        const wsh = pl(0.95, 1.9, sconceWash, { parent: F, pos: [sx, 1.8, 0.012], cast: false });
        wsh.userData.live = true; wsh.renderOrder = 3;
      });
      // brilho do LED sob o rack suspenso, no piso
      const rackGlowTex = k.tex(256, 96, (ctx, w, h) => { ctx.filter = 'blur(12px)'; ctx.fillStyle = '#fff'; ctx.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.45); ctx.filter = 'none'; });
      const rackGlowMat = k.bmat(rackGlowTex, { add: true, color: '#ffa04a', opacity: 0.3, fog: false, toneMapped: false });
      const rackGlow = pl(2.3, 0.8, rackGlowMat, { parent: live, pos: [0, 0.013, D / 2 - 0.42], rot: [-PI / 2, 0, 0], cast: false });
      rackGlow.renderOrder = 3;
      const rack = grp({ parent: F, pos: [0, 0, 0] });
      rb(2.1, 0.42, 0.44, 0.015, '#efe6d6', { parent: rack, pos: [0, 0.33, 0.27] }, 1);
      [-0.7, 0, 0.7].forEach((x) => rb(0.68, 0.36, 0.015, 0.006, '#e2d6c2', { parent: rack, pos: [x, 0.33, 0.495] }, 1));
      [[-0.98, 0.1], [0.98, 0.1], [-0.98, 0.44], [0.98, 0.44]].forEach(([a, b]) => cy(0.016, 0.012, 0.12, '#3a2a20', { parent: rack, pos: [a, 0.06, b] }, 6));
      // costas acabadas (o rack fica no chão e aparece de costas no plano geral)
      [-0.7, 0, 0.7].forEach((x) => rb(0.64, 0.32, 0.012, 0.004, '#e2d6c2', { parent: rack, pos: [x, 0.33, 0.044], cast: false }, 1));
      bx(2.1, 0.02, 0.014, '#cbbca4', { parent: rack, pos: [0, 0.53, 0.044], cast: false });
      rb(0.9, 0.07, 0.09, 0.03, '#1d1d22', { parent: rack, pos: [0, 0.58, 0.32] }, 2);
      bookStack(rack, { pos: [-0.75, 0.54, 0.27], n: 3, seed: 21, w: 0.26, d: 0.2 });
      lathe('vaseC', [[0.001, 0], [0.07, 0], [0.1, 0.1], [0.05, 0.28], [0.06, 0.3], [0.001, 0.3]], '#2f6f8a', { parent: rack, pos: [0.78, 0.54, 0.27] });
      plant(rack, 'ervas', { pos: [-0.5, 0.54, 0.3], potR: 0.06, potH: 0.09, seed: 3, pot: '#c8653f', n: 6 });
      const tvG = grp({ parent: F, pos: [0, 1.32, 0.05] });
      rb(1.46, 0.84, 0.05, 0.012, '#141418', { parent: tvG, pos: [0, 0, 0.025], cast: false }, 1);
      const tvTex = k.tex(768, 432, () => {});
      const tvMat = k.bmat(tvTex, { toneMapped: false });
      const tvScreen = pl(1.4, 0.785, tvMat, { parent: tvG, pos: [0, 0, 0.052], cast: false });
      tvScreen.userData.live = true;
      const tvGlow = M.glow('#7fb0ff', 2.4, 0);
      tvGlow.position.set(0, 1.32, 0.35);
      F.add(tvGlow);
      const phoneGlow = M.glow('#ff3a4a', 1.6, 0);
      phoneGlow.position.set(0.12, 0.6, -0.42);
      live.add(phoneGlow);

      // --- Luzes
      const L = lights(root, 'noite', 4.8);
      const lamp = M.lampLight('#ffb05a', 2.6, 6.0);
      lamp.position.set(-1.72, 1.45, -1.95);
      root.add(lamp);
      const lampGlow = M.glow('#ffc477', 1.3, 0.6);
      lampGlow.position.set(-1.72, 1.5, -1.95);
      live.add(lampGlow);
      const tvLight = new T.PointLight('#7fb0ff', 0, 5.5, 2);
      tvLight.castShadow = false;
      tvLight.position.set(0, 1.25, 1.6);
      root.add(tvLight);
      // brilho quente no chão sob o abajur
      const poolMat = k.bmat(patchTex(k, 1, 1), { add: true, color: '#ff9a3a', opacity: 0.0, fog: false, toneMapped: false });
      void poolMat;

      const ringNoite = ringTex(k, 'noite', 61);
      const out = outside(k, root, { sky: ['#050918', '#1e2c5a', '#0c1022'], sunPos: [55, 22, -20], sunColor: '#fff6dc', sunSize: 5, seed: 9 });
      out.set(['#050918', '#1e2c5a', '#0c1022'], ringNoite, '#fff6dc', 0.5, 'noite');
      const nearViews = [WB.right.children.find((c) => c.userData.view).userData.view];

      keepOnFloor(root, deco, rack); // rack baixo fica no chão (primeiro plano); TV e ripado ficam na parede
      // ...e some com a câmera logo atrás dele (ex.: plano 'porta', onde o vaso azul virava um borrão na frente)
      const fgCheck = fgHider([{ obj: rack, x: 0, z: D / 2 - 0.27, w: 2.12, d: 0.46, top: 0.9, wallZ: D / 2 }]);
      bake(deco);
      S.walls.forEach((w) => bake(w.obj));

      const PRE = {
        noite: { sky: '#3e4c8c', ground: '#1a1626', hemi: 0.4, sun: '#8ea2ff', sunI: 0.36, sunPos: [6, 6.5, 3], amb: 0.06 },
        alerta: { sky: '#3a1030', ground: '#08040a', hemi: 0.24, sun: '#6a78ff', sunI: 0.42, sunPos: [6, 6.5, 3], amb: 0.03 },
      };
      const st8 = { tv: null, alert: null, lamp: true, tvT: -1 };
      function drawPhone(alert) {
        phoneTex.userData.redraw((ctx) => {
          ctx.setTransform(2, 0, 0, 2, 0, 0);
          const w = 128, h = 256;
          if (!alert) { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#20232c'); g.addColorStop(0.5, '#0e1015'); g.addColorStop(1, '#1a1c24'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return; }
          ctx.fillStyle = '#2a0a12'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = '700 15px Arial'; ctx.fillText('Número', w / 2, 60); ctx.fillText('desconhecido', w / 2, 80);
          ctx.fillStyle = '#5a5a66'; ctx.beginPath(); ctx.arc(w / 2, 130, 24, 0, PI * 2); ctx.fill();
          ctx.fillStyle = '#e94b5a'; ctx.beginPath(); ctx.arc(34, 215, 16, 0, PI * 2); ctx.fill();
          ctx.fillStyle = '#2fbf6f'; ctx.beginPath(); ctx.arc(94, 215, 16, 0, PI * 2); ctx.fill();
        });
      }
      function drawTV(mode, t) {
        tvTex.userData.redraw((ctx) => {
          ctx.setTransform(1.5, 0, 0, 1.5, 0, 0);
          const w = 512, h = 288;
          if (mode === 'off') {
            const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1c2030'); g.addColorStop(0.45, '#0b0c12'); g.addColorStop(0.55, '#14161f'); g.addColorStop(1, '#08090d');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); return;
          }
          if (mode === 'jornal') {
            const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0f2a5a'); g.addColorStop(1, '#1e4f9a');
            ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
            for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(w * 0.75, h * 0.4, 30 + i * 22, 0, PI * 2); ctx.stroke(); }
            // apresentadora
            ctx.fillStyle = '#2b2b3a'; ctx.beginPath(); ctx.ellipse(w * 0.3, h * 0.86, 70, 60, 0, PI, 0); ctx.fill();
            ctx.fillStyle = '#f3ece0'; ctx.beginPath(); ctx.moveTo(w * 0.3 - 14, h * 0.62); ctx.lineTo(w * 0.3 + 14, h * 0.62); ctx.lineTo(w * 0.3, h * 0.74); ctx.fill();
            ctx.fillStyle = '#c58b63'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.47, 26, 0, PI * 2); ctx.fill();
            ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.44, 28, PI * 0.95, PI * 0.05); ctx.fill();
            ctx.fillRect(w * 0.3 - 28, h * 0.44, 10, 40); ctx.fillRect(w * 0.3 + 18, h * 0.44, 10, 40);
            const talk = Math.sin(t * 14) > 0 ? 4 : 1.5;
            ctx.fillStyle = '#7a3a2a'; ctx.fillRect(w * 0.3 - 6, h * 0.53, 12, talk);
            // quadro ao lado
            ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(w * 0.56, h * 0.16, w * 0.36, h * 0.44);
            ctx.fillStyle = '#e94b5a'; ctx.beginPath(); ctx.moveTo(w * 0.74, h * 0.2); ctx.lineTo(w * 0.81, h * 0.36); ctx.lineTo(w * 0.67, h * 0.36); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = '900 30px Arial'; ctx.textAlign = 'center'; ctx.fillText('!', w * 0.74, h * 0.34);
            ctx.fillStyle = '#1e2a44'; ctx.font = '800 20px Arial'; ctx.fillText('GOLPE DA VOZ', w * 0.74, h * 0.47);
            ctx.font = '600 15px Arial'; ctx.fillText('clonada por IA', w * 0.74, h * 0.55);
            // tarja + letreiro
            ctx.fillStyle = '#c8202a'; ctx.fillRect(0, h * 0.72, w * 0.62, 34);
            ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = '800 20px Arial'; ctx.fillText('JORNAL DA NOITE', 14, h * 0.72 + 24);
            ctx.fillStyle = '#f2f2f2'; ctx.fillRect(0, h - 34, w, 34);
            ctx.fillStyle = '#c8202a'; ctx.fillRect(0, h - 34, 86, 34);
            ctx.fillStyle = '#fff'; ctx.font = '800 15px Arial'; ctx.fillText('AO VIVO', 10, h - 12);
            ctx.save(); ctx.beginPath(); ctx.rect(90, h - 34, w - 90, 34); ctx.clip();
            ctx.fillStyle = '#1e2a44'; ctx.font = '700 16px Arial';
            const msg = 'Polícia alerta: golpistas usam voz clonada para pedir Pix urgente  •  Desconfie e ligue de volta no número salvo  •  ';
            const mw = ctx.measureText(msg).width;
            const off = (t * 70) % mw;
            ctx.fillText(msg, 96 - off, h - 11); ctx.fillText(msg, 96 - off + mw, h - 11);
            ctx.restore();
            return;
          }
          // 'on' → futebol
          for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#2f8f3a' : '#37a044'; ctx.fillRect(i * w / 8, 0, w / 8, h); }
          ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
          ctx.strokeRect(20, 30, w - 40, h - 50);
          ctx.beginPath(); ctx.moveTo(w / 2, 30); ctx.lineTo(w / 2, h - 20); ctx.stroke();
          ctx.beginPath(); ctx.arc(w / 2, h / 2 + 5, 40, 0, PI * 2); ctx.stroke();
          ctx.strokeRect(20, h / 2 - 50, 60, 110); ctx.strokeRect(w - 80, h / 2 - 50, 60, 110);
          const bxp = w / 2 + Math.sin(t * 0.9) * 150, byp = h / 2 + Math.sin(t * 1.7) * 60;
          for (let i = 0; i < 9; i++) {
            const team = i % 2;
            const px = bxp + Math.sin(i * 2.1 + t * (0.6 + i * 0.05)) * (60 + i * 12), py = byp + Math.cos(i * 1.3 + t * 0.8) * (30 + i * 6);
            ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px + 3, py + 9, 7, 3, 0, 0, PI * 2); ctx.fill();
            ctx.fillStyle = team ? '#f7d117' : '#3a6ad8'; ctx.fillRect(px - 5, py - 10, 10, 16);
            ctx.fillStyle = '#e8c09a'; ctx.beginPath(); ctx.arc(px, py - 14, 4, 0, PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bxp, byp, 4, 0, PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(10,20,40,0.85)'; ctx.fillRect(16, 10, 170, 30);
          ctx.fillStyle = '#fff'; ctx.font = '800 17px Arial'; ctx.textAlign = 'left'; ctx.fillText('BRA  2  x  1  ARG', 26, 31);
          ctx.fillStyle = '#f7d117'; ctx.fillRect(190, 10, 44, 30); ctx.fillStyle = '#10204a'; ctx.fillText("67'", 198, 31);
        });
      }
      return {
        root,
        background: '#0e0f1e',
        fog: { color: '#1e2c5a', near: 24, far: 120 },
        walls: S.walls,
        defaultShot: 'geral',
        spots: {
          sofa1: { x: -0.6, z: -1.72, rot: 0 },
          sofa2: { x: 0.5, z: -1.72, rot: 0 },
          poltrona: { x: 2.0, z: -0.85, rot: -1.2 },
          tv: { x: 0.0, z: 1.45, rot: 0 },
          abajur: { x: -1.75, z: -1.05, rot: 0.5 },
          janela: { x: 2.3, z: 0.4, rot: PI / 2 },
          porta: { x: -2.4, z: 1.55, rot: PI / 2 },
          centro: { x: 0.0, z: 0.55, rot: 0 },
          faisca: { x: 0.0, z: -0.6, rot: 0, y: 0.98 },
          inicio: { x: -2.3, z: 1.55, rot: 2.0 },
          foto: { x: -0.2, z: -1.15, rot: PI },
          quadro: { x: 0.4, z: -1.15, rot: PI },
          estante: { x: -2.2, z: -0.45, rot: -PI / 2 },
          vitrola: { x: -2.25, z: -0.25, rot: -PI / 2 },
          celular: { x: 0.35, z: 0.06, rot: PI },
        },
        bounds: S.bounds,
        colliders: [
          { x: -0.05, z: -2.15, w: 2.42, d: 0.5 },    // sofá (encosto; assento livre p/ sentar)
          { x: -1.2, z: -1.88, w: 0.22, d: 0.95 },    // braço esq.
          { x: 1.1, z: -1.88, w: 0.22, d: 0.95 },     // braço dir.
          { x: 0, z: -0.55, w: 1.17, d: 0.64 },       // mesa de centro
          { x: -1.72, z: -1.95, w: 0.36, d: 0.36 },   // abajur
          { x: 1.52, z: -2.0, w: 0.42, d: 0.42 },     // mesinha
          { x: 2.05, z: -1.95, w: 0.5, d: 0.5 },      // costela-de-adão
          { x: -2.8, z: -0.45, w: 0.4, d: 1.92 },     // estante
          { x: 0, z: 2.16, w: 2.12, d: 0.5 },         // rack da TV
          { x: 2.78, z: 1.45, w: 0.44, d: 1.22 },     // aparador
          { x: 2.3, z: 2.08, w: 0.46, d: 0.46 },      // palmeira
          { x: 2.0, z: -0.85, w: 0.7, d: 0.6, rot: -1.2 }, // poltrona (encosto)
        ],
        shots: {
          geral: { target: [0.15, 0.85, -0.75], yaw: -0.5, pitch: 0.4, dist: 7.9, fov: 38 },
          sofa: { target: [-0.05, 0.85, -1.6], yaw: 0.08, pitch: 0.12, dist: 3.6, fov: 38 },
          tv: { target: [-0.05, 1.05, 1.6], yaw: PI, pitch: 0.12, dist: 3.85, fov: 42 },
          abajur: { target: [-1.3, 1.0, -1.6], yaw: 0.35, pitch: 0.14, dist: 2.8, fov: 38 },
          janela: { target: [2.9, 1.4, -0.35], yaw: -1.45, pitch: 0.1, dist: 3.4, fov: 40 },
          porta: { target: [-2.6, 1.1, 1.5], yaw: 1.2, pitch: 0.15, dist: 3.8, fov: 38 },
          alerta: { target: [0, 0.75, -1.5], yaw: 0.3, pitch: -0.04, dist: 3.0, fov: 42 },
        },
        setParams(p) {
          p = p || {};
          const tv = p.tv === 'on' || p.tv === 'jornal' ? p.tv : 'off';
          const alert = !!p.alert;
          st8.lamp = p.lamp !== false;
          if (tv !== st8.tv) { st8.tv = tv; st8.tvT = -1; drawTV(tv, 0); }
          if (alert !== st8.alert) {
            st8.alert = alert;
            L.set(alert ? PRE.alerta : PRE.noite);
            drawPhone(alert);
            if (!alert) setBg('#0e0f1e');
            out.dome.userData.setColors(alert ? '#0a0410' : '#050918', alert ? '#2a0c22' : '#1e2c5a', alert ? '#06020a' : '#0c1022');
          }
          lamp.userData.light.color.set(alert ? '#ff6a3a' : '#ffb05a');
          lampGlow.material.color.set(alert ? '#ff7a4a' : '#ffc477');
          lamp.userData.light.intensity = st8.lamp ? (alert ? 0.9 : 2.6) : 0;
          lampGlow.visible = st8.lamp;
          lampShadeMat.emissiveIntensity = st8.lamp ? (alert ? 0.45 : 1.0) : 0;
          // LED atrás da TV + arandelas: âmbar aconchegante; no alerta viram brasas vermelhas fracas
          haloMat.color.set(alert ? '#ff3a30' : '#ffb066');
          haloMat.opacity = alert ? 0.22 : tv !== 'off' ? 0.5 : 0.34;
          sconceWash.color.set(alert ? '#ff4a30' : '#ffae5a');
          sconceWash.opacity = alert ? 0.12 : 0.42;
          sconceIn.emissive.set(alert ? '#ff4a30' : '#ffbf6e');
          sconceIn.emissiveIntensity = alert ? 0.4 : 1.2;
          rackGlowMat.color.set(alert ? '#ff3020' : '#ffa04a');
          rackGlowMat.opacity = alert ? 0.12 : 0.3;
          if (S.ceiling) { S.ceiling.userData.led.emissiveIntensity = alert ? 0 : 1.1; S.ceiling.userData.setGlow(alert ? 0 : 0.06, '#ffd9a8'); }
        },
        update(t) {
          // TV animada (redesenha ~12 fps)
          if (st8.tv !== 'off' && t - st8.tvT > 0.083) { st8.tvT = t; drawTV(st8.tv, t); }
          let tvI = 0, tvCol = '#7fb0ff';
          if (st8.tv === 'on') { tvI = 0.75 + Math.sin(t * 7) * 0.1 + Math.sin(t * 2.3) * 0.12; tvCol = '#b4e6bc'; }
          else if (st8.tv === 'jornal') { tvI = 1.2 + Math.sin(t * 5) * 0.1; tvCol = '#8fb4ff'; }
          if (st8.alert) {
            const pulse = Math.pow(0.5 + 0.5 * Math.sin(t * 3.4), 2);
            L.hemi.intensity = 0.1 + pulse * 0.16;
            tvLight.color.set('#ff2a3a');
            tvLight.intensity = 0.25 + pulse * 2.1;
            tvGlow.material.opacity = 0;
            phoneGlow.material.opacity = 0.2 + pulse * 0.45;
            phoneGlow.scale.setScalar(0.9 + pulse * 0.9);
            haloMat.opacity = 0.08 + pulse * 0.3;
            tvLight.position.set(0.12, 0.9, -0.42);
            tvLight.distance = 3.6;
            setBg(M.mix('#0a0206', '#2a050c', pulse));
          } else {
            tvLight.color.set(tvCol);
            tvLight.intensity = tvI;
            tvLight.position.set(0, 1.25, 1.6);
            tvLight.distance = 5.5;
            tvGlow.material.color.set(tvCol);
            tvGlow.material.opacity = tvI > 0 ? 0.14 : 0;
            phoneGlow.material.opacity = 0;
          }
          candleFlame.scale.setScalar(0.11 + Math.sin(t * 13) * 0.01 + Math.sin(t * 7.7) * 0.008);
          if (st8.lamp && !st8.alert) lamp.userData.light.intensity = 2.6 + Math.sin(t * 1.3) * 0.04;
          out.check(W, D, H, nearViews);
          fgCheck();
        },
        dispose() { k.dispose(root); },
      };
    },
  };

  // ==================================================================
  // MESA_CAFE — café da manhã na varanda gourmet, sol dourado, cobogó e cidade
  // ==================================================================
  ENVS.mesa_cafe = {
    name: 'Café na varanda',
    build(params) {
      const k = kit();
      const root = grp({ name: 'env:mesa_cafe' });
      const W = 6.0, D = 4.6, H = 2.7;
      const floorMat = k.tmat(tileTex(k, '#d39470', '#b07656', { n: 2, seed: 9, vary: '#e8b08a' }), { rough: 0.7 });
      const S = shell(k, root, {
        w: W, d: D, h: H, floorMat, wallMat: M.mat('#efe3d1', { rough: 0.95 }), floorTile: 0.8,
        sides: ['back'],
        openings: { back: [{ x: -0.85, w: 2.1, y0: 0, h: 2.3 }] },
        base: '#3a3640', slab: '#d8ccb8', trim: '#b09a78',
      });
      const WB = S.wallGroups;
      const deco = grp({ parent: root, name: 'decor' });
      const live = grp({ parent: root, name: 'live' });
      live.userData.live = true;
      const far = grp({ parent: root, name: 'far' });
      far.userData.live = true;

      // --- Céu e cidade em volta (panorama)
      const sky = M.skyDome('#5aa6ea', '#fde2bc', '#efe2d2', 90);
      far.add(sky);
      const skyline = k.tex(2048, 512, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const r = M.rng(31);
        const layer = (col, lit, base, maxH, minW, maxW, win) => {
          let x = 0;
          while (x < w) {
            const bw = minW + r() * (maxW - minW), bh = h * (0.12 + r() * maxH);
            const top = h * base - bh;
            ctx.fillStyle = col; ctx.fillRect(x, top, bw - 3, h - top);
            ctx.fillStyle = lit; ctx.fillRect(x, top, (bw - 3) * 0.35, h - top);
            if (r() > 0.55) { ctx.fillStyle = col; ctx.fillRect(x + bw * 0.4, top - 14, 4, 14); }
            if (win) for (let yy = top + 8; yy < h - 4; yy += 12) for (let xx = x + 5; xx < x + bw - 10; xx += 10) { if (r() > 0.55) { ctx.fillStyle = win; ctx.fillRect(xx, yy, 4, 6); } }
            x += bw;
          }
        };
        layer('#c9b7c9', '#e3cdc4', 0.66, 0.42, 30, 90, null);
        layer('#a99bb5', '#e9c3a6', 0.8, 0.36, 40, 110, 'rgba(255,240,220,0.35)');
        layer('#8a7f9e', '#e0ad86', 0.95, 0.3, 50, 140, 'rgba(255,230,190,0.45)');
        // copas de árvores na base
        for (let i = 0; i < 90; i++) { ctx.fillStyle = r() > 0.5 ? '#6f8f62' : '#5d7f55'; ctx.beginPath(); ctx.arc(r() * w, h * (0.94 + r() * 0.06), 14 + r() * 26, 0, PI * 2); ctx.fill(); }
      });
      skyline.wrapS = T.RepeatWrapping; skyline.repeat.set(2, 1);
      const ringMat = k.bmat(skyline, { transparent: true, side: 'double', fog: false });
      ringMat.depthWrite = false;
      const ring = new T.Mesh(new T.CylinderGeometry(62, 62, 36, 64, 1, true), ringMat);
      ring.geometry.userData.baked = true;
      ring.position.y = -8;
      ring.renderOrder = -5;
      far.add(ring);
      const sunGlow = M.glow('#ffd9a0', 40, 0.75);
      sunGlow.material.fog = false;
      sunGlow.position.set(-56, 38, 16);
      far.add(sunGlow);
      const city = cityscape(k, far, { seed: 12, groundY: -26, rMin: 14, rMax: 50, n: 44, skip: (a) => Math.sin(a) < -0.55 });
      city.set('dourado');
      const nearSky = [city.group, ring];

      // --- Parede do fundo (fachada): porta de vidro de correr + churrasqueira
      const B = WB.back;
      const alu = M.mat('#2a2a30', { rough: 0.4, metal: 0.5 });
      const door = grp({ parent: B, pos: [-0.85, 0, 0] });
      [[-1.02, 1.15, 0.06, 2.3], [1.02, 1.15, 0.06, 2.3], [0, 1.15, 0.05, 2.3]].forEach(([x, y, w, hh]) => bx(w, hh, 0.12, alu, { parent: door, pos: [x, y, -0.07], cast: false }));
      bx(2.1, 0.06, 0.12, alu, { parent: door, pos: [0, 2.27, -0.07], cast: false });
      bx(2.1, 0.04, 0.16, alu, { parent: door, pos: [0, 0.02, -0.05], cast: false });
      // interior visto pela porta de vidro: a sala de estar tranquila e quente da manhã (parede creme, quadro,
      // sofá verde, luminária, planta, piso de madeira) com voil na folha da direita e o reflexo do céu no vidro.
      // Tons calmos e sem pontos claros no meio da altura: fica logo atrás da cabeça do pai no plano 'pai'.
      const inside = k.bmat(k.tex(512, 576, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#b89e84'); g.addColorStop(0.55, '#c9b092'); g.addColorStop(1, '#a88a6c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        // luz da manhã entrando de lado na sala
        const lg = ctx.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, 'rgba(255,214,160,0.35)'); lg.addColorStop(0.5, 'rgba(255,214,160,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, w, h);
        // piso de madeira em perspectiva + tapete
        ctx.fillStyle = '#8a6448'; ctx.fillRect(0, h * 0.8, w, h * 0.2);
        ctx.strokeStyle = 'rgba(60,35,20,0.25)'; ctx.lineWidth = 2; for (let i = 1; i < 6; i++) { const y = h * 0.8 + h * 0.2 * (i / 6) * (i / 6) * 1.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        ctx.fillStyle = '#e6d6bc'; ctx.fillRect(w * 0.06, h * 0.86, w * 0.52, h * 0.07);
        // quadro (alto, acima da cabeça de quem senta lá fora) e sofá verde baixo com almofadas
        ctx.fillStyle = '#3a2c24'; ctx.fillRect(w * 0.14, h * 0.12, w * 0.3, h * 0.2);
        ctx.fillStyle = '#efe2c8'; ctx.fillRect(w * 0.15 + 2, h * 0.12 + 4, w * 0.3 - 8, h * 0.2 - 8);
        ctx.fillStyle = '#7d9a78'; ctx.fillRect(w * 0.15 + 2, h * 0.24, w * 0.3 - 8, h * 0.08 - 4);
        ctx.fillStyle = '#e0a33a'; ctx.beginPath(); ctx.arc(w * 0.29, h * 0.2, 13, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#4e7262'; ctx.fillRect(w * 0.05, h * 0.66, w * 0.5, h * 0.14);
        ctx.fillStyle = '#5c8070'; ctx.fillRect(w * 0.05, h * 0.6, w * 0.5, h * 0.08);
        ctx.fillStyle = '#e0a33a'; ctx.fillRect(w * 0.09, h * 0.585, w * 0.08, h * 0.07);
        ctx.fillStyle = '#c8653f'; ctx.fillRect(w * 0.42, h * 0.59, w * 0.08, h * 0.065);
        // luminária de piso apagada (dia) e planta no canto
        ctx.fillStyle = '#3a2c24'; ctx.fillRect(w * 0.585, h * 0.36, 4, h * 0.44);
        ctx.fillStyle = '#efe4d0'; ctx.beginPath(); ctx.moveTo(w * 0.555, h * 0.36); ctx.lineTo(w * 0.625, h * 0.36); ctx.lineTo(w * 0.64, h * 0.3); ctx.lineTo(w * 0.54, h * 0.3); ctx.fill();
        ctx.fillStyle = '#c06a46'; ctx.fillRect(w * 0.67, h * 0.72, w * 0.08, h * 0.08);
        ctx.fillStyle = '#4f7f52'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(w * 0.71 + Math.sin(i * 1.7) * 26, h * 0.62 - i * 9, 22, 10, i * 0.7, 0, PI * 2); ctx.fill(); }
        // voil na folha da direita
        ctx.fillStyle = 'rgba(246,240,228,0.82)'; ctx.fillRect(w * 0.6, 0, w * 0.4, h);
        ctx.strokeStyle = 'rgba(200,184,160,0.55)'; ctx.lineWidth = 3; for (let x = w * 0.62; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 5, h); ctx.stroke(); }
        // reflexo do céu dourado no vidro (faixas diagonais)
        const rg = ctx.createLinearGradient(0, 0, 0, h); rg.addColorStop(0, 'rgba(160,200,240,0.22)'); rg.addColorStop(0.5, 'rgba(255,226,190,0.12)'); rg.addColorStop(1, 'rgba(255,226,190,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        [[0.18, 0.1], [0.34, 0.04], [0.7, 0.08]].forEach(([x0, bw]) => { ctx.beginPath(); ctx.moveTo(w * x0, 0); ctx.lineTo(w * (x0 + bw), 0); ctx.lineTo(w * (x0 + bw - 0.25), h); ctx.lineTo(w * (x0 - 0.25), h); ctx.closePath(); ctx.fill(); });
      }), { fog: false });
      pl(2.0, 2.26, inside, { parent: door, pos: [0, 1.13, -0.3], cast: false });
      pl(2.0, 2.26, M.glass('#d8ecff', 0.18), { parent: door, pos: [0, 1.13, -0.06], cast: false }).renderOrder = 2;
      rb(0.03, 0.4, 0.04, 0.01, '#c5c9ce', { parent: door, pos: [-0.12, 1.05, -0.02], cast: false }, 1);
      // tijolinhos
      const brickTex = k.tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e6d6c0'; ctx.fillRect(0, 0, w, h);
        const r = M.rng(4);
        const bh = 32, bw = 64;
        for (let row = 0; row < h / bh; row++) for (let c = -1; c < w / bw + 1; c++) {
          const x = c * bw + (row % 2 ? bw / 2 : 0);
          ctx.fillStyle = mix('#b85c3c', r() > 0.5 ? '#7a3a24' : '#d9825a', r() * 0.35);
          ctx.fillRect(x + 3, row * bh + 3, bw - 6, bh - 6);
        }
      }, { repeat: [1, 1] });
      // tijolinho na escala certa em toda face (UV em metros: 1 ladrilho da textura = 0,8 m → tijolo 20 × 10 cm)
      brickTex.wrapS = brickTex.wrapT = T.RepeatWrapping;
      const brickMat = k.tmat(brickTex, { rough: 0.9 });
      const hoodTex = brickTex.clone(); hoodTex.repeat.set(4.2, 0.6); hoodTex.needsUpdate = true; k.own.tex.push(hoodTex);
      const hoodMat = k.tmat(hoodTex, { rough: 0.9 });
      const ch = grp({ parent: B, pos: [1.75, 0, 0] });
      const brickBox = (w, hh, d, x, y, z) => { const g = meterBox(w, hh, d, 0.8); g.userData.baked = true; const m = M.mesh(g, brickMat, { parent: ch, pos: [x, y, z] }); m.castShadow = true; return m; };
      brickBox(1.2, 0.9, 0.62, 0, 0.45, 0.31);
      rb(1.26, 0.05, 0.66, 0.01, '#3a3638', { parent: ch, pos: [0, 0.925, 0.33] }, 1);
      brickBox(0.16, 0.75, 0.62, -0.52, 1.32, 0.31);
      brickBox(0.16, 0.75, 0.62, 0.52, 1.32, 0.31);
      bx(0.88, 0.75, 0.02, '#1f1b1a', { parent: ch, pos: [0, 1.32, 0.02], cast: false });
      for (let i = 0; i < 7; i++) bx(0.86, 0.008, 0.008, '#5a5a60', { parent: ch, pos: [0, 1.12, 0.08 + i * 0.07], cast: false });
      M.mesh(M.cylGeo(0.3, 0.52, 0.42, 4, false), hoodMat, { parent: ch, pos: [0, 1.9, 0.28], rot: [0, PI / 4, 0], scale: [1.15, 1, 0.82] });
      brickBox(0.46, 0.6, 0.36, 0, 2.4, 0.18);
      // utensílios
      const tabua = grp({ parent: ch, pos: [-0.25, 0.95, 0.35], rot: [0, 0.3, 0] });
      rb(0.4, 0.03, 0.25, 0.01, '#b5835a', { parent: tabua, pos: [0, 0.015, 0] }, 1);
      plant(ch, 'ervas', { pos: [0.35, 0.95, 0.38], potR: 0.07, potH: 0.12, seed: 4, pot: '#e8e0d4' });
      // vasos de parede (jardim vertical) à esquerda da porta
      [[-2.45, 1.55], [-2.15, 1.85], [-2.45, 2.15]].forEach(([x, y], i) => {
        rb(0.2, 0.16, 0.16, 0.03, '#efe6d6', { parent: B, pos: [x, y, 0.1] }, 1);
        plant(B, i === 1 ? 'samambaia' : 'ervas', { pos: [x, y + 0.04, 0.1], potH: 0, seed: 7 + i, size: 0.28, n: 9 });
      });
      // varal de luzes (desligado de dia)
      const bulbMat = k.umat('#fff4dc', { emissive: '#ffcf8a', emissiveIntensity: 0.15 });
      const wireMat = M.mat('#2b2522', { rough: 0.6 });
      let prev = null;
      for (let i = 0; i <= 14; i++) {
        const x = -2.9 + i * 0.3, sag = Math.sin((i % 7) / 7 * PI) * 0.12, y = 2.45 - sag;
        sp(0.022, bulbMat, { parent: B, pos: [x, y, 0.12], cast: false }, 8, 6);
        cy(0.012, 0.012, 0.025, wireMat, { parent: B, pos: [x, y + 0.028, 0.12], cast: false }, 6); // soquete
        // fio passando pelos soquetes (sem ele as lâmpadas pareciam flutuar na fachada)
        if (prev) {
          const dx = x - prev[0], dy = y - prev[1], len = Math.hypot(dx, dy);
          cy(0.004, 0.004, len, wireMat, { parent: B, pos: [(x + prev[0]) / 2, (y + prev[1]) / 2 + 0.04, 0.12], rot: [0, 0, Math.atan2(dy, dx) - PI / 2], cast: false }, 4);
        }
        if (i % 7 === 0) cy(0.006, 0.006, 0.12, wireMat, { parent: B, pos: [x, y + 0.04, 0.06], rot: [PI / 2, 0, 0], cast: false }, 4); // gancho na parede
        prev = [x, y];
      }

      // --- Parede esquerda: cobogó (com sombra rendada que nunca some)
      const cobTex = k.tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f3ede2'; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        const s = w / 2;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const cx = i * s + s / 2, cyy = j * s + s / 2;
          [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => {
            ctx.save(); ctx.translate(cx + a * s * 0.2, cyy + b * s * 0.2); ctx.rotate(Math.atan2(b, a));
            ctx.beginPath(); ctx.ellipse(0, 0, s * 0.2, s * 0.1, 0, 0, PI * 2); ctx.fill(); ctx.restore();
          });
          ctx.beginPath(); ctx.arc(cx, cyy, s * 0.07, 0, PI * 2); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#e2dacb'; ctx.lineWidth = 4;
        for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke(); }
      });
      cobTex.wrapS = cobTex.wrapT = T.RepeatWrapping;
      cobTex.repeat.set(D / 0.6, H / 0.6);
      const cobMat = k.tmat(cobTex, { rough: 0.9, alphaTest: 0.5, side: 'double' });
      const LG = grp({ parent: root, pos: [-W / 2, 0, 0], rot: [0, PI / 2, 0], name: 'wall:left' });
      [0.0, 0.1].forEach((z) => { const m = pl(D, H, cobMat, { parent: LG, pos: [0, H / 2, z - 0.1], cast: false }); m.receiveShadow = true; });
      const frameM = M.mat('#efe7da', { rough: 0.9 });
      bx(D, 0.12, 0.14, frameM, { parent: LG, pos: [0, H - 0.06, -0.05], cast: false });
      bx(D, 0.1, 0.14, frameM, { parent: LG, pos: [0, 0.05, -0.05], cast: false });
      bx(0.12, H, 0.14, frameM, { parent: LG, pos: [D / 2 - 0.06, H / 2, -0.05], cast: false });
      bx(D, 0.03, 0.16, '#3a3440', { parent: LG, pos: [0, H + 0.015, -0.05], cast: false });
      const proxyMat = k.tmat(cobTex, { alphaTest: 0.5, side: 'double' });
      proxyMat.colorWrite = false; proxyMat.depthWrite = false;
      const proxy = pl(D, H, proxyMat, { parent: live, pos: [-W / 2 + 0.05, H / 2, 0], rot: [0, PI / 2, 0] });
      proxy.castShadow = true; proxy.receiveShadow = false;
      S.walls.push({ obj: LG, px: -W / 2, pz: 0, normal: [1, 0, 0] });

      // --- Guarda-corpo de vidro (frente e direita) com corrimão de madeira
      function railing(name, pos, ry, len, n) {
        const g = grp({ parent: root, pos, rot: [0, ry, 0], name: 'wall:' + name });
        pl(len, 1.0, M.glass('#d6efff', 0.16), { parent: g, pos: [0, 0.55, 0.0], cast: false }).renderOrder = 2;
        rb(len + 0.06, 0.06, 0.09, 0.02, '#a8744c', { parent: g, pos: [0, 1.08, 0] }, 1);
        bx(len, 0.05, 0.06, '#2a2a30', { parent: g, pos: [0, 0.04, 0], cast: false });
        for (let i = 0; i <= n; i++) bx(0.04, 1.05, 0.05, '#2a2a30', { parent: g, pos: [-len / 2 + (len * i) / n, 0.53, 0] });
        bake(g);
        S.walls.push({ obj: g, px: pos[0], pz: pos[2], normal: [Math.sin(ry), 0, Math.cos(ry)] });
        return g;
      }
      railing('front', [0, 0, D / 2], PI, W, 4);
      railing('right', [W / 2, 0, 0], -PI / 2, D, 3);

      // --- Forro de madeira ripado (visto em primeira pessoa) + viga de borda
      const CG = grp({ parent: root, name: 'ceiling' });
      const slatTex = k.tex(512, 512, (ctx, w, h) => {
        // ripado de cumaru claro (mel): de manhã o forro rebate a luz dourada — escuro demais pesava em 1ª pessoa
        ctx.fillStyle = '#8a6040'; ctx.fillRect(0, 0, w, h);
        const r = M.rng(77);
        for (let i = 0; i < 16; i++) { ctx.fillStyle = mix('#d6a878', r() > 0.5 ? '#b88458' : '#ecc79a', r() * 0.45); ctx.fillRect(i * 32 + 3, 0, 26, h); ctx.fillStyle = 'rgba(110,60,25,0.1)'; for (let g = 0; g < 5; g++) ctx.fillRect(i * 32 + 6 + r() * 20, 0, 1.5, h); }
      }, { repeat: [W / 1.4, D / 1.4] });
      const slatMat = k.tmat(slatTex, { rough: 0.7, emissive: '#ffe2bc', emissiveIntensity: 0.06 });
      const ceil = pl(W, D, slatMat, { parent: CG, pos: [0, H, 0], rot: [PI / 2, 0, 0], cast: false });
      ceil.receiveShadow = false;
      [[0, D / 2 - 0.08, W, 0.16], [W / 2 - 0.08, 0, 0.16, D]].forEach(([x, z, w, d]) => bx(w, 0.22, d, '#efe3d1', { parent: CG, pos: [x, H - 0.11, z], cast: false }));
      [[-1.5, 0.4], [1.2, 0.4], [-0.1, -1.2]].forEach(([x, z]) => {
        cy(0.06, 0.06, 0.02, '#d9d4cc', { parent: CG, pos: [x, H - 0.01, z], cast: false }, 14);
        cy(0.045, 0.045, 0.006, M.mat('#fffaf0', { emissive: '#fff1d6', emissiveIntensity: 0.2 }), { parent: CG, pos: [x, H - 0.022, z], cast: false }, 12);
      });
      // ventilador de teto (gira devagar)
      const fan = grp({ parent: CG, pos: [0, H, 0] });
      fan.userData.live = true;
      cy(0.012, 0.012, 0.3, '#2b2522', { parent: fan, pos: [0, -0.15, 0], cast: false }, 6);
      cy(0.09, 0.1, 0.09, '#2b2522', { parent: fan, pos: [0, -0.34, 0], cast: false }, 16);
      const blades = grp({ parent: fan, pos: [0, -0.36, 0] });
      for (let i = 0; i < 4; i++) rb(0.55, 0.012, 0.11, 0.01, '#a8744c', { parent: blades, pos: [Math.cos(i * PI / 2) * 0.34, 0, Math.sin(i * PI / 2) * 0.34], rot: [0.12, -i * PI / 2, 0], cast: false }, 1);
      bake(CG);
      S.walls.push({ obj: CG, px: 0, py: H - 0.15, pz: 0, normal: [0, -1, 0] });

      // --- Floreira ao longo do guarda-corpo direito
      const fl = grp({ parent: deco, pos: [2.68, 0, -0.2] });
      rb(0.36, 0.42, 2.8, 0.02, '#a8744c', { parent: fl, pos: [0, 0.21, 0] }, 1);
      for (let i = 0; i < 12; i++) bx(0.37, 0.006, 2.81, '#93633f', { parent: fl, pos: [0, 0.035 * i + 0.02, 0], cast: false });
      bx(0.3, 0.02, 2.74, '#4a3426', { parent: fl, pos: [0, 0.41, 0], cast: false });
      for (let i = 0; i < 7; i++) plant(fl, i % 3 === 1 ? 'flor' : 'ervas', { pos: [0, 0.4, -1.2 + i * 0.4], potH: 0, seed: 20 + i, n: 7, flowers: ['#ff8a65', '#f2c94c', '#e94b8a'] });

      // --- Plantas grandes
      plant(deco, 'palmeira', { pos: [-2.45, 0, 1.75], potR: 0.24, potH: 0.5, pot: '#e8e0d4', size: 1.1, seed: 5 });
      plant(deco, 'costela', { pos: [-2.4, 0, -1.85], potR: 0.22, potH: 0.42, pot: '#c06a46', size: 0.7, seed: 9, n: 10 });
      plant(deco, 'espada', { pos: [0.55, 0, -1.95], potR: 0.15, potH: 0.34, pot: '#2b2522', size: 0.7, seed: 2 });

      // --- Mesa com toalha xadrez + 3 cadeiras
      const table = grp({ parent: deco, pos: [0, 0, 0] });
      [[-0.58, -0.33], [0.58, -0.33], [-0.58, 0.33], [0.58, 0.33]].forEach(([a, b]) => cy(0.03, 0.024, 0.74, '#9a6a44', { parent: table, pos: [a, 0.37, b] }, 8));
      rb(1.3, 0.04, 0.8, 0.012, '#a8744c', { parent: table, pos: [0, 0.735, 0] }, 1);
      const gingham = k.tmat(k.tex(64, 64, (ctx, w, h) => { ctx.fillStyle = '#fbf8f2'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(52,98,176,0.5)'; ctx.fillRect(0, 0, 32, h); ctx.fillRect(0, 0, w, 32); }, { repeat: [24, 15] }), { rough: 0.95 });
      rb(1.44, 0.012, 0.94, 0.004, gingham, { parent: table, pos: [0, 0.762, 0] }, 1);
      const gSide = k.tmat(gingham.map.clone(), { rough: 0.95 }); gSide.map.repeat.set(24, 3.2); gSide.map.needsUpdate = true; k.own.tex.push(gSide.map);
      [[0, 0.47, 1.44, 0.006], [0, -0.47, 1.44, 0.006]].forEach(([x, z, w, d]) => bx(w, 0.2, d, gSide, { parent: table, pos: [x, 0.665, z] }));
      [[0.72, 0], [-0.72, 0]].forEach(([x, z]) => bx(0.006, 0.2, 0.94, gSide, { parent: table, pos: [x, 0.665, z] }));
      const T0 = 0.768;
      // pai
      cy(0.11, 0.09, 0.015, '#f6f1e8', { parent: table, pos: [0, T0 + 0.008, -0.2] }, 20);
      cup(table, { pos: [0.2, T0, -0.25], band: '#2f6f8a' });
      sp(0.05, '#d9a05a', { parent: table, pos: [0, T0 + 0.04, -0.2], scale: [1.4, 0.7, 0.9] }, 12, 8);
      // filho
      cy(0.11, 0.09, 0.015, '#f6f1e8', { parent: table, pos: [0.45, T0 + 0.008, 0.05] }, 20);
      mug(table, { pos: [0.48, T0, -0.2], color: '#2fae86' });
      rb(0.075, 0.009, 0.155, 0.008, '#1d1d24', { parent: table, pos: [0.52, T0 + 0.005, 0.28], rot: [0, -0.5, 0] }, 1);
      // centro: cesta de pão francês
      const basket = grp({ parent: table, pos: [-0.04, T0, 0.12] });
      lathe('cesta', [[0.001, 0], [0.12, 0], [0.16, 0.08], [0.17, 0.09], [0.16, 0.09], [0.11, 0.012], [0.001, 0.012]], '#c9a070', { parent: basket }, 18);
      [[-0.05, 0.03, 0.3], [0.05, -0.02, -0.4], [0.0, 0.07, 1.2], [0.07, 0.06, 0.6]].forEach(([x, z, r2], i) => {
        const b2 = sp(0.055, '#d99a52', { parent: basket, pos: [x, 0.08 + (i > 1 ? 0.03 : 0), z], rot: [0, r2, 0.15], scale: [1.5, 0.75, 0.95] }, 12, 8);
        void b2;
        bx(0.08, 0.008, 0.012, '#f0c890', { parent: basket, pos: [x, 0.12 + (i > 1 ? 0.03 : 0), z], rot: [0, r2, 0.15], cast: false });
      });
      // mamão aberto
      const pap = grp({ parent: table, pos: [0.24, T0, 0.24] });
      cy(0.13, 0.11, 0.015, '#f6f1e8', { parent: pap, pos: [0, 0.008, 0] }, 20);
      [[-0.05, 0.4], [0.06, -0.3]].forEach(([x, r2]) => {
        const half = grp({ parent: pap, pos: [x, 0.016, 0], rot: [0, r2, 0] });
        M.mesh(M.sphereGeo(0.06, 14, 8), M.mat('#f2913a', { rough: 0.6 }), { parent: half, scale: [0.95, 0.55, 1.5] });
        M.mesh(M.sphereGeo(0.045, 12, 6), M.mat('#2a2622', { rough: 0.5 }), { parent: half, pos: [0, 0.018, 0], scale: [0.6, 0.4, 1.2] });
      });
      // queijo minas + manteiga
      const board = grp({ parent: table, pos: [0.42, T0, -0.02], rot: [0, 0.3, 0] });
      rb(0.24, 0.02, 0.16, 0.006, '#c89a64', { parent: board, pos: [0, 0.01, 0] }, 1);
      cy(0.06, 0.06, 0.05, '#f7f2e2', { parent: board, pos: [-0.03, 0.045, 0] }, 18);
      rb(0.07, 0.035, 0.05, 0.008, '#f7e08a', { parent: board, pos: [0.07, 0.038, 0.02] }, 1);
      // garrafa térmica, jarra de suco e copos
      garrafaTermica(table, { pos: [-0.3, T0, -0.24], color: '#c8453a', rot: [0, 0.6, 0] });
      const jug = grp({ parent: table, pos: [-0.24, T0, 0.27] });
      lathe('jarra', [[0.001, 0], [0.06, 0], [0.065, 0.16], [0.058, 0.2], [0.065, 0.215], [0.001, 0.215]], M.mat('#e8f4ff', { rough: 0.05, opacity: 0.4, transparent: true }), { parent: jug, cast: false });
      // suco opaco por dentro do vidro (vidro transparente escreve profundidade e escondia o suco)
      cy(0.056, 0.058, 0.14, M.mat('#ffa21f', { rough: 0.3 }), { parent: jug, pos: [0, 0.075, 0], cast: false }, 14);
      tor(0.04, 0.008, M.mat('#e8f4ff', { rough: 0.05, opacity: 0.4, transparent: true }), { parent: jug, pos: [-0.07, 0.11, 0], rot: [0, 0, PI / 2], cast: false }, PI);
      [[-0.06, 0.09], [0.3, -0.28]].forEach(([x, z]) => {
        cy(0.032, 0.028, 0.1, M.mat('#e8f4ff', { rough: 0.05, opacity: 0.4, transparent: true }), { parent: table, pos: [x, T0 + 0.05, z], cast: false }, 12);
        cy(0.028, 0.026, 0.06, M.mat('#ffa21f', { rough: 0.3 }), { parent: table, pos: [x, T0 + 0.032, z], cast: false }, 12);
      });
      // vasinho de flores
      plant(table, 'flor', { pos: [-0.5, T0, -0.15], potR: 0.04, potH: 0.11, pot: '#2f6f8a', seed: 11, n: 6, flowers: ['#f2c94c', '#ffffff', '#ff8a65'] });
      // cadeiras: pai, filho, Faísca
      chair(deco, { x: 0, z: -0.9, rot: 0, wood: '#9a6a44', seat: '#f2e6d0', back: 'palha' });
      chair(deco, { x: 1.15, z: 0, rot: -PI / 2, wood: '#9a6a44', seat: '#f2e6d0', back: 'palha' });
      chair(deco, { x: -1.15, z: 0, rot: PI / 2, wood: '#9a6a44', seat: '#f26b3a', back: 'palha' });
      // tapete externo sob a mesa
      const rugMat = k.tmat(rugTex(k, { bg: '#efe5d2', c1: '#2f6f8a', c2: '#d9774a', motif: 'circulos', border: 26 }), { rough: 1 });
      pl(2.8, 2.2, rugMat, { parent: deco, pos: [0, 0.006, -0.1], rot: [-PI / 2, 0, 0], cast: false });
      // espreguiçadeira de canto (frente direita)
      const lounge = grp({ parent: deco, pos: [1.9, 0, 1.55], rot: [0, -0.6, 0] });
      rb(0.66, 0.1, 1.5, 0.04, '#a8744c', { parent: lounge, pos: [0, 0.3, 0] }, 1);
      rb(0.6, 0.08, 1.0, 0.04, '#f2e6d0', { parent: lounge, pos: [0, 0.39, 0.22] }, 2);
      rb(0.6, 0.08, 0.6, 0.04, '#f2e6d0', { parent: lounge, pos: [0, 0.56, -0.48], rot: [0.6, 0, 0] }, 2);
      rb(0.38, 0.3, 0.12, 0.05, '#2f6f8a', { parent: lounge, pos: [0, 0.66, -0.55], rot: [0.6, 0, 0] }, 2);
      [[-0.28, -0.65], [0.28, -0.65], [-0.28, 0.65], [0.28, 0.65]].forEach(([a, b]) => bx(0.05, 0.26, 0.05, '#93633f', { parent: lounge, pos: [a, 0.13, b] }));

      // vapor do café (garrafa e xícaras)
      const steamA = steamPuffs(live, 4, { pos: [0.2, T0 + 0.07, -0.25], h: 0.32, size: 0.08, opacity: 0.4, speed: 0.3 });
      const steamB = steamPuffs(live, 4, { pos: [0.48, T0 + 0.1, -0.2], h: 0.32, size: 0.08, opacity: 0.4, speed: 0.27 });

      // --- Luz: sol dourado baixo atravessando o cobogó
      const L = lights(root, 'manha', 5.2);
      L.set({ sky: '#ffeccc', ground: '#b08868', hemi: 0.72, sun: '#ffc98a', sunI: 1.75, sunPos: [-7.5, 5.2, 2.2], amb: 0.12 });
      L.sun.shadow.radius = 2;

      bake(deco);
      S.walls.forEach((w) => { if (w.obj.name !== 'wall:front' && w.obj.name !== 'wall:right') bake(w.obj); });

      const state = { steam: true };
      return {
        root,
        background: '#f2d2a8',
        fog: { color: '#f6dcc0', near: 22, far: 115 },
        walls: S.walls,
        defaultShot: 'geral',
        spots: {
          pai: { x: 0, z: -0.9, rot: 0 },
          filho: { x: 1.15, z: 0, rot: -PI / 2 },
          faisca: { x: -1.15, z: 0, rot: PI / 2, y: 1.0 },
          duvida: { x: -0.45, z: 0.15, rot: 0.3, y: 0.8 },
          grade: { x: 2.15, z: 0.4, rot: PI / 2 },
          porta: { x: -0.85, z: -1.75, rot: 0 },
          churrasqueira: { x: 1.75, z: -1.38, rot: PI },
          centro: { x: 0.3, z: 1.25, rot: 0 },
          inicio: { x: -0.85, z: -1.55, rot: 0.35 },
          cidade: { x: 2.15, z: -0.9, rot: PI / 2 },
          cobogo: { x: -2.35, z: 0.6, rot: -PI / 2 },
          mesa: { x: 0.0, z: -0.75, rot: 0 },
        },
        bounds: { minX: -W / 2 + 0.06, maxX: W / 2 - 0.04, minZ: -D / 2, maxZ: D / 2 - 0.04 },
        colliders: [
          { x: 0, z: 0, w: 1.46, d: 0.96 },                    // mesa
          { x: 1.75, z: -1.99, w: 1.28, d: 0.66 },             // churrasqueira
          { x: 2.68, z: -0.2, w: 0.38, d: 2.82 },              // floreira
          { x: -2.45, z: 1.75, w: 0.5, d: 0.5 },               // palmeira
          { x: -2.4, z: -1.85, w: 0.48, d: 0.48 },             // costela-de-adão
          { x: 0.55, z: -1.95, w: 0.34, d: 0.34 },             // espada-de-são-jorge
          { x: 1.9, z: 1.55, w: 0.68, d: 1.52, rot: -0.6 },    // espreguiçadeira
        ],
        shots: {
          geral: { target: [0.05, 0.8, -0.3], yaw: 0.55, pitch: 0.38, dist: 7.8, fov: 38 },
          mesa: { target: [0.1, 0.95, -0.15], yaw: 0.35, pitch: 0.3, dist: 3.4, fov: 38 },
          pai: { target: [0, 1.05, -0.9], yaw: 0.3, pitch: 0.08, dist: 2.1, fov: 36 },
          filho: { target: [1.15, 1.05, 0], yaw: -1.25, pitch: 0.08, dist: 2.1, fov: 36 },
          cidade: { target: [3.2, 1.4, 0.8], yaw: -2.1, pitch: 0.04, dist: 5.2, fov: 42 },
          cobogo: { target: [-2.6, 1.15, 0.0], yaw: 1.35, pitch: 0.16, dist: 4.4, fov: 40 },
        },
        setParams(p) { p = p || {}; state.steam = p.steam !== false; },
        update(t, p, dt) {
          updatePuffs(steamA, t, state.steam);
          updatePuffs(steamB, t + 0.4, state.steam);
          sunGlow.material.opacity = 0.7 + Math.sin(t * 0.3) * 0.05;
          blades.rotation.y += (dt || 0.016) * 2.2;
          // cidade 3D só aparece com a câmera na varanda (primeira pessoa / planos baixos)
          const cam = P2.core && P2.core.camera;
          if (cam) {
            const q = cam.position;
            const on = Math.abs(q.x) < W / 2 + 0.6 && Math.abs(q.z) < D / 2 + 0.6 && q.y < H + 0.4;
            nearSky.forEach((o2) => (o2.visible = on));
          }
        },
        dispose() { k.dispose(root); },
      };
    },
  };

})();

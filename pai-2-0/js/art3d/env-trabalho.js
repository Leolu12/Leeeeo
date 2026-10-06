/* PAI 2.0 — env-trabalho.js
 * Ambientes 3D do mundo do CEO: escritorio, sala_reuniao, carro.
 * Tudo procedural (canvas + geometria), sem arquivos externos. Unidades em metros, Y para cima,
 * rot 0 = olhando para +Z. Primeira pessoa: os três têm `colliders` (retângulos no chão), `bounds`
 * (piso andável) e `spots.inicio`; escritorio e sala_reuniao têm teto com luminárias (grupo em `walls`,
 * normal [0,−1,0], py = 3,1); o carro controla o próprio teto/estufa em update().
 *
 * ── escritorio — sala da presidência num arranha-céu de São Paulo (sala 8,4 × 6,3 m, pé-direito 3,1 m)
 *   Vidro do piso ao teto ao fundo (−Z) com a cidade; parede esq. (−X) ripada com TV + aparador;
 *   parede dir. (+X) com estante embutida, prêmios, diplomas e a porta (z = 1,8); parede da frente (+Z)
 *   com quadro + bar. Mesa de nogueira no centro (DX 0,3 · DZ −1,25), teto com painel ripado sobre a mesa,
 *   piso de carvalho em espinha, tapete marinho sob a mesa e tapete claro de lã no canto do sofá.
 *   params:
 *     time    'dia' | 'tarde' (pôr do sol) | 'noite'            (padrão 'dia')
 *     screen  monitor: 'off' | 'on' | 'chat' | 'doc' | 'planilha' (padrão 'on')
 *     laptop  opcional: 'off'|'on'|'chat'|'doc'|'planilha'|'email'|'agenda'
 *             (padrão: complementa o monitor — chat→email, doc/planilha→chat, on→agenda, off→off)
 *     chat    opcional: [['eu','texto'], ['ia','texto'], ...] — conversa nas telas de chat
 *     typing  opcional: false desliga o "Faísca digitando…" (padrão true)
 *     papers  0..1 altura da pilha de papéis na mesa (1 = pilha cômica, 0 = mesa limpa; padrão 0.6)
 *     tv      TV da parede: falsy = desligada · true | 'painel' = painel de indicadores ·
 *             'Título' | ['Título','linha',...] | {title, lines:[...]} = slide
 *   spots (x, z, rot):
 *     mesa (0.3, −2.22, 0) cadeira do CEO, sentado · notebook (= mesa) · visita1 (−0.25, −0.3, π) ·
 *     visita2 (0.85, −0.3, π) poltronas de visita, sentado · sofa (−3.58, 1.3, π/2) · sofa2 (−3.58, 2.2, π/2)
 *     sentado · porta (3.6, 1.8, −π/2) · janela (−2.3, −2.7, π) olhando a cidade · tv (−3.35, 0.25, 1.75)
 *     apresentador ao lado da TV · pe1 (−1.2, 0.9, 0.25) · pe2 (1.7, 0.9, −0.3) · pe3 (0.35, 1.5, 0) ·
 *     centro (0.35, 0.9, 0) — pe1/pe2/pe3/centro: pessoas em pé no meio da sala
 *     primeira pessoa / interação (rot = olhando para o objeto):
 *     inicio (3.45, 1.65, −2.25) logo após a porta, vendo mesa + janela · foto (−0.25, −2.12, 0.2) porta-retrato
 *     (na mesa em (0.02, 0.84, −0.95), virado para o CEO: o filho/a filha de beca) · estante = premios
 *     (3.05, −1.55, π/2) troféus em x≈3.9, z −2.0…−1.0 · cafe (0.5, 2.12, 0) bar em (0.5, 0.8, 2.7) ·
 *     quadro (0.5, 1.7, 0) quadro em (0.5, 1.78, 2.9) · ver_tv (−2.35, −1.1, −π/2) · vista (2.4, −2.6, π+0.25)
 *   objetos citados pelos capítulos: pilha principal (1.27, ~1.0, −1.12) · troféus (3.75, 1.45, −1.6)
 *   shots: geral · mesa (por trás das visitas) · tela (sobre o ombro, monitor) · tv · janela · sofa · porta ·
 *          poder (contra-plongée baixo entre as poltronas de visita)
 *   bounds: x −4.2…4.2, z −2.98…3.0 · colliders: mesa, aparador do vidro, 2 poltronas, aparador da TV,
 *          sofá, mesa de centro, luminária, 2 plantas, estante, bar
 *
 * ── sala_reuniao — sala do conselho (8,6 × 6,2 m + corredor de 1,35 m atrás do vidro da frente)
 *   Vidro ao fundo (−Z) com a cidade; telão na parede esq. (−X); parede dir. (+X) com painel acústico,
 *   aparador do café e relógio; vidro para o corredor (+Z, 7 vãos, faixa jateada com o logotipo vazado,
 *   porta em x≈3,35) com elevador e gravura no fundo do corredor. Piso de porcelanato cor de travertino +
 *   tapete grafite.
 *   params:
 *     slide   {title, lines:[...]} | ['Título','linha',...] | 'Título'  (padrão: pauta do conselho)
 *     clock   'HH:MM' (padrão '14:00') — relógio de parede analógico (ponteiros giram até a hora nova)
 *     chaos   0..1 — xícaras de café, copos de viagem, papéis (mesa e chão), post-its (mesa, telão, vidro),
 *             bolinhas de papel, garrafa térmica (≥0,4) e pizza (≥0,82) (reunião que não acaba)
 *     time    opcional 'dia'|'tarde'|'noite' — se ausente, deduzido do relógio (≥17h30 tarde, ≥19h noite)
 *   spots (x, z, rot):
 *     c1..c4 (−1.7 | −0.57 | 0.57 | 1.7, −1.12, 0) lado do fundo, sentado, de frente p/ a câmera geral
 *     c5..c8 (−1.7 | −0.57 | 0.57 | 1.7, 1.12, π) lado da frente, sentado, de costas
 *     cabeceira (2.85, 0, −π/2) sentado na ponta, olhando o telão · tela (−3.45, 1.75, 1.35) apresentador
 *     porta (3.35, 2.55, π) · janela (0.4, −2.55, π) · pe1 (−2.6, 2.2) · pe2 (1.4, 2.25) · centro (0, 2.2)
 *     primeira pessoa / interação: inicio (3.3, 2.45, −1.95) logo após a porta · relogio (3.25, −0.3, π/2)
 *     relógio em (4.21, 2.15, −0.3) · cafe (3.25, −0.85, π/2) aparador do café · ver_tela (−1.6, 2.15, −2.2)
 *     corredor (1.2, 2.75, 0) olhando o corredor pelo vidro
 *   shots: geral · mesa · tela · cabeceira · relogio · janela · lateral
 *   bounds: x −4.3…4.3, z −2.8…3.06 · colliders: mesa, 2 fileiras de cadeiras (c1–c4, c5–c8), console do
 *          telão, aparador do café, 2 plantas (a cadeira da cabeceira fica livre para o pai sentar)
 *
 * ── carro — banco de trás de um sedã executivo preto rodando por São Paulo (frente do carro = −X)
 *   Rua animada rolando em update() (3 cópias de 72 m por lado, nunca "acaba" na névoa): térreo com lojas
 *   de vitrine de verdade (padaria, farmácia, café, banca, lanches, ótica, banco, flores — interior aceso,
 *   prateleiras, balcão, caixas eletrônicos…), andares com janelas emolduradas, peitoris, ar-condicionado e
 *   varandas, prédios de pele de vidro; calçada com ipês/tipuanas, postes, frades, lixeiras laranja, ponto
 *   de ônibus e banca de jornal; trânsito (ônibus, carros, motoboy) e torres ao longe. À noite: vitrines
 *   e janelas acesas, poças de luz dos postes e facho dos faróis no asfalto. Interior em couro capitonê
 *   (losangos), vidros com insulfilm. Casco e interior sempre visíveis; vidros laterais/colunas/teto/vidro
 *   traseiro somem conforme a câmera ("corte conversível" visto de fora e de cima; por dentro, tudo
 *   fechado). Motorista de quepe (rig) no banco esquerdo.
 *   params:
 *     time    'dia' | 'tarde' | 'noite'                          (padrão 'dia')
 *     phone   tela do celular no suporte (encosto do passageiro): 'chat' | 'off' | 'mapa' | 'call' (padrão 'chat')
 *     chat    opcional: [['eu','texto'], ['ia','texto'], ...] (no celular) · typing: false desliga "digitando…"
 *     speed   0..1.5 velocidade da rua (padrão 1; 0 = parado no trânsito)
 *   spots (x, z, rot):
 *     banco (0.55, −0.37, −π/2) pai, traseiro direito, sentado, olhando para a frente do carro
 *     banco2 (0.55, 0.37, −π/2) traseiro esquerdo, sentado · centro (0.62, 0, −π/2, y 0.95) Faísca entre os bancos
 *     motorista (−0.72, 0.38, −π/2) só referência · inicio (= banco) · celular (= banco; celular em
 *     (−0.19, 0.99, −0.38)) · janela (0.55, −0.37, π) olhando pela janela direita
 *   shots: geral · banco · frente · janela · celular · alto
 *   bounds: x 0.3…0.8, z −0.5…0.5 (o pai fica sentado) · colliders: nenhum
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  P2.envs = P2.envs || {};
  if (!T || !M) return;
  const PI = Math.PI, HP = Math.PI / 2;
  const FONT = '"Plus Jakarta Sans","Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  // ====================================================================
  // Utilidades
  // ====================================================================
  const col = (c) => new T.Color(c);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Recursos criados por um build (para dispose). */
  function Owner() { this.list = []; }
  Owner.prototype.add = function (x) { if (x) this.list.push(x); return x; };
  Owner.prototype.dispose = function () { this.list.forEach((x) => { try { x.dispose(); } catch (e) { /* nada */ } }); this.list.length = 0; };

  // --- texturas em cache de módulo (nunca descartadas: são poucas e reaproveitadas)
  const TEX = {};
  function ctex(key, w, h, draw, wrap) {
    if (TEX[key]) return TEX[key];
    const t = M.canvasTex(w, h, draw);
    if (wrap !== false) { t.wrapS = t.wrapT = T.RepeatWrapping; }
    TEX[key] = t;
    return t;
  }
  function texRepeat(base, key, rx, ry) {
    const k = key + '|' + rx + '|' + ry;
    if (TEX[k]) return TEX[k];
    const t = base.clone();
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    TEX[k] = t;
    return t;
  }
  // --- materiais em cache de módulo
  const MAT = {};
  function smat(key, make) { return MAT[key] || (MAT[key] = make()); }
  function stdMat(key, o) {
    return smat(key, () => {
      const m = new T.MeshStandardMaterial({ color: col(o.color || '#ffffff'), roughness: o.rough == null ? 0.7 : o.rough, metalness: o.metal || 0, vertexColors: !!o.vc });
      if (o.map) m.map = o.map;
      if (o.emissive) { m.emissive = col(o.emissive); m.emissiveIntensity = o.ei == null ? 1 : o.ei; }
      if (o.emissiveMap) m.emissiveMap = o.emissiveMap;
      if (o.opacity != null && o.opacity < 1) { m.transparent = true; m.opacity = o.opacity; if (o.depthWrite === false) m.depthWrite = false; }
      if (o.side === 'double') m.side = T.DoubleSide;
      if (o.env) m.userData.wantsEnv = o.env;
      return m;
    });
  }
  const vc = (rough, metal, key) => stdMat('vc|' + rough + '|' + (metal || 0) + '|' + (key || ''), { vc: true, rough, metal, env: metal > 0.3 ? 1 : 0 });

  // --- mapa de ambiente (reflexos em metal/vidro) gerado por PMREM, em cache por paleta
  const ENVMAPS = {};
  function envMap(kind, pal) {
    if (ENVMAPS[kind] !== undefined) return ENVMAPS[kind];
    ENVMAPS[kind] = null;
    try {
      const r = P2.core && P2.core.renderer;
      if (!r || !T.PMREMGenerator) return null;
      const sc = new T.Scene();
      const sky = new T.Mesh(new T.SphereGeometry(10, 24, 12), new T.ShaderMaterial({
        side: T.BackSide,
        uniforms: { a: { value: col(pal[0]) }, b: { value: col(pal[1]) }, c: { value: col(pal[2]) } },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 a; uniform vec3 b; uniform vec3 c; varying vec3 vP; void main(){ float h=vP.y; vec3 k = h>0.0 ? mix(b,a,pow(h,0.7)) : mix(b,c,pow(-h,0.5)); gl_FragColor=vec4(k,1.0); }',
      }));
      sc.add(sky);
      // "janelas" brilhantes para dar brilho especular
      (pal[3] || []).forEach((p) => {
        const q = new T.Mesh(new T.PlaneGeometry(p[3], p[4]), new T.MeshBasicMaterial({ color: col(p[5]), side: T.DoubleSide }));
        q.position.set(p[0], p[1], p[2]);
        q.lookAt(0, 0, 0);
        sc.add(q);
      });
      const pm = new T.PMREMGenerator(r);
      const rt = pm.fromScene(sc, 0.035);
      pm.dispose();
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      ENVMAPS[kind] = rt.texture;
    } catch (e) { ENVMAPS[kind] = null; }
    return ENVMAPS[kind];
  }
  function applyEnv(root, tex, intensity) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => {
        if (m && m.userData && m.userData.wantsEnv && m.isMeshStandardMaterial) {
          if (m.envMap !== tex) { m.envMap = tex; m.needsUpdate = true; }
          m.envMapIntensity = (intensity == null ? 1 : intensity) * m.userData.wantsEnv;
        }
      });
    });
  }

  // ====================================================================
  // Mesclador de geometria (muitos detalhes = 1 draw call)
  // ====================================================================
  const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _eu = new T.Euler(), _p3 = new T.Vector3(), _s3 = new T.Vector3();
  const _Y = new T.Vector3(0, 1, 0);
  function Merger() { this.parts = []; this.frame = null; }
  Merger.prototype.add = function (geo, color, pos, rot, scale, uvRect) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (uvRect && g.attributes.uv) {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uvRect[0] + uv.getX(i) * (uvRect[2] - uvRect[0]), uvRect[1] + uv.getY(i) * (uvRect[3] - uvRect[1]));
    }
    _eu.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, (rot && rot[3]) || 'XYZ');
    _q.setFromEuler(_eu);
    if (scale == null) _s3.set(1, 1, 1);
    else if (typeof scale === 'number') _s3.set(scale, scale, scale);
    else _s3.set(scale[0], scale[1], scale[2]);
    _p3.set(pos ? pos[0] : 0, pos ? pos[1] : 0, pos ? pos[2] : 0);
    _m4.compose(_p3, _q, _s3);
    g.applyMatrix4(_m4);
    if (this.frame) g.applyMatrix4(this.frame);
    const n = g.attributes.position.count;
    const c = col(color || '#ffffff');
    const ca = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(ca, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(n * 2), 2));
    this.parts.push(g);
    return this;
  };
  Merger.prototype.box = function (w, h, d, c, pos, rot) { return this.add(M.boxGeo(w, h, d), c, pos, rot); };
  Merger.prototype.rbox = function (w, h, d, r, c, pos, rot, seg) { return this.add(M.roundedBoxGeo(w, h, d, r, seg == null ? 2 : seg), c, pos, rot); };
  Merger.prototype.cyl = function (rt, rb, h, c, pos, rot, seg) { return this.add(M.cylGeo(rt, rb, h, seg || 16), c, pos, rot); };
  Merger.prototype.sph = function (r, c, pos, scale, seg, rot) { return this.add(M.sphereGeo(r, seg || 14, seg ? Math.max(6, Math.ceil(seg * 0.6)) : 10), c, pos, rot, scale); };
  Merger.prototype.tor = function (r, t, c, pos, rot, arc) { return this.add(M.torusGeo(r, t, 8, 24, arc), c, pos, rot); };
  Merger.prototype.cone = function (r, h, c, pos, rot, seg) { return this.add(M.coneGeo(r, h, seg || 12), c, pos, rot); };
  /** Executa fn com um referencial local (posição + giro em Y + escala opcional). */
  Merger.prototype.at = function (pos, rotY, fn, scale) {
    const prev = this.frame;
    const f = new T.Matrix4().compose(new T.Vector3(pos[0], pos[1], pos[2]), new T.Quaternion().setFromAxisAngle(_Y, rotY || 0), new T.Vector3(scale || 1, scale || 1, scale || 1));
    this.frame = prev ? prev.clone().multiply(f) : f;
    fn(this);
    this.frame = prev;
    return this;
  };
  Merger.prototype.build = function (mat, own, o) {
    o = o || {};
    let n = 0;
    this.parts.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), cc = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let k = 0;
    this.parts.forEach((g) => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, k * 3);
      nor.set(g.attributes.normal.array, k * 3);
      cc.set(g.attributes.color.array, k * 3);
      uv.set(g.attributes.uv.array, k * 2);
      k += c;
      g.dispose();
    });
    this.parts.length = 0;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(cc, 3));
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    if (own) own.add(geo);
    const mesh = new T.Mesh(geo, mat);
    mesh.castShadow = o.cast !== false;
    mesh.receiveShadow = o.receive !== false;
    if (o.parent) o.parent.add(mesh);
    if (o.name) mesh.name = o.name;
    return mesh;
  };
  Merger.prototype.empty = function () { return this.parts.length === 0; };
  /** Só a geometria mesclada (para InstancedMesh). */
  Merger.prototype.geometry = function (own) {
    const mesh = this.build(null, own);
    return mesh.geometry;
  };

  // ====================================================================
  // Texturas procedurais
  // ====================================================================
  function noise(ctx, w, h, amt, seed, dark) {
    const r = M.rng(seed || 3);
    const n = Math.floor(w * h * amt);
    for (let i = 0; i < n; i++) {
      const v = r();
      ctx.fillStyle = (dark || v < 0.5) ? 'rgba(0,0,0,' + (0.02 + r() * 0.05) + ')' : 'rgba(255,255,255,' + (0.02 + r() * 0.05) + ')';
      ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  }
  /** Madeira (nogueira) — veios horizontais. */
  function woodTex(key, base, dark, seed) {
    return ctex('wood|' + key, 512, 512, (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      const r = M.rng(seed || 11);
      for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (0.03 + r() * 0.06) + ')'; ctx.fillRect(0, r() * h, w, 8 + r() * 40); }
      for (let i = 0; i < 10; i++) { ctx.fillStyle = 'rgba(255,220,180,' + (0.02 + r() * 0.04) + ')'; ctx.fillRect(0, r() * h, w, 6 + r() * 30); }
      ctx.strokeStyle = dark;
      for (let i = 0; i < 110; i++) {
        const y0 = r() * h, amp = 1.5 + r() * 7, fq = 0.004 + r() * 0.012, ph = r() * 6;
        ctx.globalAlpha = 0.06 + r() * 0.22; ctx.lineWidth = 0.6 + r() * 1.8;
        ctx.beginPath();
        for (let x = -4; x <= w + 4; x += 8) {
          const y = y0 + Math.sin(x * fq + ph) * amp + Math.sin(x * fq * 3.3 + ph * 2) * amp * 0.25;
          if (x < 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // "catedrais" do veio
      for (let i = 0; i < 5; i++) {
        const cx = r() * w, cy = r() * h, s = 30 + r() * 60;
        ctx.globalAlpha = 0.12;
        for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(cx, cy, s * 2.6 - k * 12, s * 0.5 - k * 2.5, 0, PI * 1.05, PI * 1.95); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      noise(ctx, w, h, 0.02, seed + 1);
    });
  }
  /** Piso de madeira em espinha de peixe (chevron), contínuo. */
  function chevronTex() {
    return ctex('chevron', 512, 512, (ctx, w, h) => {
      const cw = w / 2, bh = 64;
      const r = M.rng(77);
      ctx.fillStyle = '#8e6c4b'; ctx.fillRect(0, 0, w, h);
      const tones = ['#ad885f', '#a58058', '#9d7953', '#b38f67', '#a37d57', '#97734f', '#a9845d'];
      for (let c = 0; c < 2; c++) {
        for (let k = -2; k < h / bh + 3; k++) {
          const x0 = c * cw, x1 = x0 + cw;
          const yA = k * bh;
          ctx.save();
          ctx.beginPath();
          if (c === 0) { ctx.moveTo(x0, yA); ctx.lineTo(x1, yA - cw * 0.5); ctx.lineTo(x1, yA - cw * 0.5 + bh); ctx.lineTo(x0, yA + bh); }
          else { ctx.moveTo(x0, yA - cw * 0.5); ctx.lineTo(x1, yA); ctx.lineTo(x1, yA + bh); ctx.lineTo(x0, yA - cw * 0.5 + bh); }
          ctx.closePath();
          ctx.fillStyle = tones[Math.floor(r() * tones.length)];
          ctx.fill();
          ctx.clip();
          // veios na direção da tábua
          const ang = c === 0 ? -Math.atan2(cw * 0.5, cw) : Math.atan2(cw * 0.5, cw);
          ctx.translate(x0 + cw / 2, yA + bh / 2 - cw * 0.25);
          ctx.rotate(ang);
          for (let g = 0; g < 14; g++) {
            ctx.strokeStyle = 'rgba(70,45,25,' + (0.04 + r() * 0.08) + ')';
            ctx.lineWidth = 0.7 + r();
            const yy = -bh + r() * bh * 2;
            ctx.beginPath(); ctx.moveTo(-cw, yy); ctx.bezierCurveTo(-cw / 3, yy + (r() - 0.5) * 6, cw / 3, yy + (r() - 0.5) * 6, cw, yy + (r() - 0.5) * 4); ctx.stroke();
          }
          ctx.restore();
          // juntas
          ctx.strokeStyle = 'rgba(50,32,18,0.45)'; ctx.lineWidth = 1.4;
          ctx.beginPath();
          if (c === 0) { ctx.moveTo(x0, yA); ctx.lineTo(x1, yA - cw * 0.5); }
          else { ctx.moveTo(x0, yA - cw * 0.5); ctx.lineTo(x1, yA); }
          ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(40,24,12,0.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(cw, 0); ctx.lineTo(cw, h); ctx.moveTo(0.5, 0); ctx.lineTo(0.5, h); ctx.stroke();
      noise(ctx, w, h, 0.015, 5);
    });
  }
  /** Painel ripado (ripas verticais de madeira). */
  function slatTex() {
    return ctex('slats', 256, 512, (ctx, w, h) => {
      const r = M.rng(21);
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, w, h);
      const n = 4, sw = w / n;
      for (let i = 0; i < n; i++) {
        const x = i * sw;
        const g = ctx.createLinearGradient(x, 0, x + sw, 0);
        const base = ['#7a4f31', '#734a2e', '#80543a', '#6f472b'][i];
        g.addColorStop(0, base); g.addColorStop(0.5, M.hex(M.mix(base, '#ffffff', 0.08))); g.addColorStop(0.85, base); g.addColorStop(1, M.hex(M.mix(base, '#000', 0.35)));
        ctx.fillStyle = g; ctx.fillRect(x + 6, 0, sw - 12, h);
        for (let k = 0; k < 14; k++) { ctx.strokeStyle = 'rgba(40,20,8,' + (0.08 + r() * 0.15) + ')'; ctx.lineWidth = 0.8; const xx = x + 8 + r() * (sw - 16); ctx.beginPath(); ctx.moveTo(xx, 0); ctx.bezierCurveTo(xx + (r() - 0.5) * 6, h / 3, xx + (r() - 0.5) * 6, h * 0.66, xx + (r() - 0.5) * 3, h); ctx.stroke(); }
      }
    });
  }
  /** Tapete com borda. */
  function rugTex(key, field, border, accent) {
    return ctex('rug|' + key, 512, 512, (ctx, w, h) => {
      ctx.fillStyle = border; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = field; ctx.fillRect(34, 34, w - 68, h - 68);
      ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.lineWidth = 1.5; ctx.strokeRect(46, 46, w - 92, h - 92);
      // padrão sutil
      ctx.globalAlpha = 0.07; ctx.strokeStyle = accent; ctx.lineWidth = 2;
      for (let i = -h; i < w; i += 36) { ctx.beginPath(); ctx.moveTo(i, 46); ctx.lineTo(i + h, h + 46); ctx.stroke(); }
      ctx.globalAlpha = 1;
      noise(ctx, w, h, 0.18, 9);
    }, false);
  }
  function concreteTex() {
    return ctex('concrete', 256, 256, (ctx, w, h) => { ctx.fillStyle = '#c9c2b7'; ctx.fillRect(0, 0, w, h); noise(ctx, w, h, 0.25, 14); });
  }
  /** Porcelanato grande (placas 1,2 x 0,6 m) em tom de travertino (bege-acinzentado quente, com veios). */
  function tileTex() {
    return ctex('tile2', 512, 512, (ctx, w, h) => {
      const r = M.rng(55);
      ctx.fillStyle = '#6a6258'; ctx.fillRect(0, 0, w, h);
      const tw = w / 2, th = h / 4;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 2; x++) {
        const off = (y % 2) * tw / 2;
        const base = 150 + Math.floor(r() * 14);
        const fill = 'rgb(' + (base + 10) + ',' + base + ',' + (base - 16) + ')';
        const seed = r();
        for (let k = -1; k < 1; k++) {
          const xx = x * tw + off + k * w;
          ctx.save();
          ctx.beginPath(); ctx.rect(xx + 1.5, y * th + 1.5, tw - 3, th - 3); ctx.clip();
          ctx.fillStyle = fill; ctx.fillRect(xx, y * th, tw, th);
          // veios horizontais suaves (travertino)
          const rv = M.rng(Math.floor(seed * 1000) + 3);
          for (let v = 0; v < 7; v++) {
            const vy = y * th + rv() * th;
            ctx.strokeStyle = rv() > 0.5 ? 'rgba(255,248,235,0.10)' : 'rgba(90,72,52,0.09)';
            ctx.lineWidth = 1 + rv() * 3;
            ctx.beginPath(); ctx.moveTo(xx, vy); ctx.bezierCurveTo(xx + tw * 0.3, vy + (rv() - 0.5) * 8, xx + tw * 0.7, vy + (rv() - 0.5) * 8, xx + tw, vy + (rv() - 0.5) * 6); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(xx, y * th, tw, th * 0.4);
          ctx.restore();
        }
      }
      noise(ctx, w, h, 0.06, 8);
    });
  }
  /** Fachada de prédio: 8 colunas x 8 andares (12 m x 24 m). type 'vidro' | 'concreto' | 'escuro'. lit = máscara de luzes acesas. */
  function facadeTex(type, lit) {
    return ctex('fac|' + type + '|' + (lit ? 1 : 0), 256, 512, (ctx, w, h) => {
      const r = M.rng(type.length * 31 + (lit ? 7 : 0));
      const nc = 8, nf = 8, fw = w / nc, fh = h / nf;
      if (lit) {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        for (let f = 0; f < nf; f++) {
          const floorOn = r() > 0.75;
          for (let c = 0; c < nc; c++) {
            const v = r();
            if (floorOn ? v > 0.15 : v > 0.72) {
              const warm = r() > 0.4;
              ctx.fillStyle = warm ? 'rgba(255,210,140,' + (0.45 + r() * 0.5) + ')' : 'rgba(215,230,255,' + (0.35 + r() * 0.45) + ')';
              if (type === 'concreto') ctx.fillRect(c * fw + fw * 0.2, f * fh + fh * 0.28, fw * 0.6, fh * 0.46);
              else ctx.fillRect(c * fw + 2, f * fh + fh * 0.12, fw - 4, fh * 0.72);
            }
          }
        }
        return;
      }
      if (type === 'concreto') {
        ctx.fillStyle = '#d6cbb9'; ctx.fillRect(0, 0, w, h);
        noise(ctx, w, h, 0.08, 4);
        for (let f = 0; f < nf; f++) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, f * fh + fh - 4, w, 4);
          for (let c = 0; c < nc; c++) {
            const x = c * fw + fw * 0.2, y = f * fh + fh * 0.28;
            const g = ctx.createLinearGradient(x, y, x, y + fh * 0.46);
            g.addColorStop(0, '#53657a'); g.addColorStop(1, '#8b9cae');
            ctx.fillStyle = g; ctx.fillRect(x, y, fw * 0.6, fh * 0.46);
            ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x - 1, y + fh * 0.46, fw * 0.6 + 2, 3);
          }
        }
      } else {
        const dark = type === 'escuro';
        for (let f = 0; f < nf; f++) {
          const g = ctx.createLinearGradient(0, f * fh, 0, f * fh + fh);
          g.addColorStop(0, dark ? '#4a5a6e' : '#a9c4dc'); g.addColorStop(1, dark ? '#2f3a48' : '#7896b2');
          ctx.fillStyle = g; ctx.fillRect(0, f * fh, w, fh);
          for (let c = 0; c < nc; c++) { ctx.fillStyle = 'rgba(255,255,255,' + (r() * 0.07) + ')'; ctx.fillRect(c * fw, f * fh, fw, fh); }
        }
        ctx.fillStyle = dark ? '#1f262f' : '#4f6274';
        for (let f = 0; f < nf; f++) ctx.fillRect(0, f * fh + fh - 9, w, 9);
        ctx.fillStyle = dark ? '#5a6878' : '#e6edf3';
        for (let c = 0; c < nc; c++) ctx.fillRect(c * fw, 0, 2, h);
      }
    });
  }
  /** Linhas da borda de papel (para pilhas). */
  function paperEdgeTex() {
    return ctex('paperedge', 64, 128, (ctx, w, h) => {
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, w, h);
      const r = M.rng(8);
      for (let y = 0; y < h; y += 2) { ctx.fillStyle = 'rgba(120,110,95,' + (0.08 + r() * 0.2) + ')'; ctx.fillRect(0, y, w, 1); }
    });
  }
  function paperTopTex() {
    return ctex('papertop', 128, 180, (ctx, w, h) => {
      ctx.fillStyle = '#fbfaf6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2b3a55'; ctx.fillRect(14, 16, 60, 7);
      ctx.fillStyle = 'rgba(60,60,70,0.35)';
      for (let y = 34; y < h - 16; y += 9) ctx.fillRect(14, y, 70 + ((y * 7) % 30), 3);
    }, false);
  }

  // ====================================================================
  // Telas (canvas) — UIs de chat, documento, planilha, e-mail, agenda
  // ====================================================================
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function font(ctx, px, weight) { ctx.font = (weight || 500) + ' ' + Math.round(px) + 'px ' + FONT; }
  function wrap(ctx, text, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function sparkDot(ctx, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffb38a'); g.addColorStop(0.6, '#ff7a45'); g.addColorStop(1, '#e8551f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.08, r * 0.17, 0, PI * 2); ctx.arc(x + r * 0.28, y - r * 0.08, r * 0.17, 0, PI * 2); ctx.fill();
  }
  function glare(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.35, 'rgba(255,255,255,0.03)'); g.addColorStop(0.36, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  const DEFAULT_CHAT = [
    ['eu', 'Resuma o relatório do trimestre em 5 pontos.'],
    ['ia', 'Pronto! Receita acima da meta, margem menor em SP, dois contratos vencem em março, frete subiu e o time comercial bateu recorde.'],
    ['eu', 'Agora prepare a pauta do conselho e 3 perguntas difíceis que podem me fazer.'],
  ];
  function drawOff(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#15171c'); g.addColorStop(0.45, '#0b0c10'); g.addColorStop(1, '#050608');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.moveTo(w * 0.1, 0); ctx.lineTo(w * 0.42, 0); ctx.lineTo(w * 0.18, h); ctx.lineTo(-w * 0.14, h); ctx.fill();
  }
  function wallpaper(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#1b2a4a'); g.addColorStop(0.55, '#3b3f6e'); g.addColorStop(1, '#e0805a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 ? '#ffb38a' : '#9ab8ff'; ctx.lineWidth = h * 0.012;
      ctx.beginPath(); ctx.moveTo(0, h * (0.55 + i * 0.08));
      ctx.bezierCurveTo(w * 0.3, h * (0.35 + i * 0.07), w * 0.6, h * (0.85 + i * 0.03), w, h * (0.5 + i * 0.09)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function topbar(ctx, w, h, title) {
    ctx.fillStyle = 'rgba(15,18,28,0.85)'; ctx.fillRect(0, 0, w, h * 0.045);
    font(ctx, h * 0.026, 600); ctx.fillStyle = '#e8ecf5'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(title || '', w * 0.015, h * 0.024);
    ctx.textAlign = 'right'; ctx.fillText('9:41', w * 0.985, h * 0.024);
  }
  function drawDesktop(ctx, w, h) {
    wallpaper(ctx, w, h);
    topbar(ctx, w, h, 'Arquivo   Editar   Ver');
    // widget agenda
    const x = w * 0.62, y = h * 0.1, ww = w * 0.34, hh = h * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.88)'; rr(ctx, x, y, ww, hh, h * 0.03); ctx.fill();
    font(ctx, h * 0.04, 800); ctx.fillStyle = '#1b2233'; ctx.textAlign = 'left'; ctx.fillText('Hoje', x + ww * 0.08, y + hh * 0.12);
    const items = [['09:00', 'Diretoria', '#4a7bd1'], ['11:00', 'Cliente — contrato', '#2f9e74'], ['14:00', 'Conselho', '#e8551f'], ['17:30', 'Fechamento do mês', '#8a5ad1']];
    items.forEach((it, i) => {
      const yy = y + hh * (0.27 + i * 0.18);
      ctx.fillStyle = it[2]; rr(ctx, x + ww * 0.08, yy - hh * 0.06, ww * 0.03, hh * 0.12, 3); ctx.fill();
      font(ctx, h * 0.026, 700); ctx.fillStyle = '#5b6170'; ctx.fillText(it[0], x + ww * 0.16, yy - hh * 0.025);
      font(ctx, h * 0.03, 700); ctx.fillStyle = '#1b2233'; ctx.fillText(it[1], x + ww * 0.16, yy + hh * 0.035);
    });
    // dock
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; rr(ctx, w * 0.3, h * 0.88, w * 0.4, h * 0.09, h * 0.025); ctx.fill();
    ['#4a7bd1', '#2f9e74', '#ff7a45', '#f2c94c', '#8a5ad1', '#e94b5a'].forEach((c, i) => {
      const cx = w * 0.34 + i * w * 0.064;
      if (c === '#ff7a45') sparkDot(ctx, cx, h * 0.925, h * 0.03);
      else { ctx.fillStyle = c; rr(ctx, cx - h * 0.03, h * 0.895, h * 0.06, h * 0.06, h * 0.014); ctx.fill(); }
    });
    glare(ctx, w, h);
  }
  function drawChat(ctx, w, h, st) {
    const lines = (st && st.chat) || DEFAULT_CHAT;
    const compact = w < 700;
    ctx.fillStyle = '#f6f3ee'; ctx.fillRect(0, 0, w, h);
    const sw = compact ? 0 : w * 0.24;
    if (sw) {
      ctx.fillStyle = '#18202f'; ctx.fillRect(0, 0, sw, h);
      sparkDot(ctx, sw * 0.15, h * 0.075, h * 0.03);
      font(ctx, h * 0.036, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Faísca', sw * 0.28, h * 0.077);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; rr(ctx, sw * 0.08, h * 0.13, sw * 0.84, h * 0.06, h * 0.015); ctx.stroke();
      font(ctx, h * 0.024, 600); ctx.fillStyle = '#cfd6e6'; ctx.fillText('+  Nova conversa', sw * 0.14, h * 0.16);
      ['Resumo do trimestre', 'Pauta do conselho', 'Contrato fornecedor', 'E-mail aos acionistas', 'Plano de viagem'].forEach((t, i) => {
        const y = h * (0.25 + i * 0.065);
        if (i === 0) { ctx.fillStyle = '#2b3550'; rr(ctx, sw * 0.06, y - h * 0.026, sw * 0.88, h * 0.052, h * 0.012); ctx.fill(); }
        font(ctx, h * 0.024, i === 0 ? 700 : 500); ctx.fillStyle = i === 0 ? '#fff' : '#9aa5bd'; ctx.fillText(t, sw * 0.12, y);
      });
    }
    const mx = sw, mw = w - sw;
    // cabeçalho
    ctx.fillStyle = '#ffffff'; ctx.fillRect(mx, 0, mw, h * 0.11);
    ctx.fillStyle = '#e7e1d8'; ctx.fillRect(mx, h * 0.11, mw, 2);
    sparkDot(ctx, mx + h * 0.065, h * 0.055, h * 0.032);
    font(ctx, h * 0.034, 800); ctx.fillStyle = '#1b2233'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Faísca', mx + h * 0.115, h * 0.042);
    font(ctx, h * 0.022, 500); ctx.fillStyle = '#2f9e74'; ctx.fillText('● assistente de IA', mx + h * 0.115, h * 0.077);
    // mensagens
    let y = h * 0.15;
    const pad = h * 0.022, fs = compact ? h * 0.042 : h * 0.03;
    font(ctx, fs, 500);
    const maxW = mw * (compact ? 0.7 : 0.62);
    lines.slice(-4).forEach((ln) => {
      const me = ln[0] === 'eu';
      font(ctx, fs, 500);
      const ls = wrap(ctx, ln[1], maxW - pad * 2).slice(0, compact ? 3 : 4);
      const bw = Math.min(maxW, Math.max.apply(null, ls.map((s) => ctx.measureText(s).width)) + pad * 2);
      const bh = ls.length * fs * 1.3 + pad * 1.4;
      if (y + bh > h * 0.84) return;
      const bx = me ? mx + mw - bw - h * 0.04 : mx + h * 0.1;
      if (!me) sparkDot(ctx, mx + h * 0.055, y + h * 0.028, h * 0.024);
      ctx.fillStyle = me ? '#24324f' : '#ffffff';
      rr(ctx, bx, y, bw, bh, h * 0.022); ctx.fill();
      if (!me) { ctx.strokeStyle = '#e4ddd2'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = me ? '#ffffff' : '#283044';
      ls.forEach((s, i) => ctx.fillText(s, bx + pad, y + pad * 0.7 + fs * 0.65 + i * fs * 1.3));
      y += bh + h * 0.03;
    });
    // digitando…
    if (st && st.typing !== false && y < h * 0.8) {
      sparkDot(ctx, mx + h * 0.055, y + h * 0.028, h * 0.024);
      ctx.fillStyle = '#ffffff'; rr(ctx, mx + h * 0.1, y, h * 0.13, h * 0.06, h * 0.03); ctx.fill();
      ctx.strokeStyle = '#e4ddd2'; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const ph = ((st.phase || 0) + i * 0.33) % 1;
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(ph * PI));
        ctx.fillStyle = 'rgba(255,122,69,' + a + ')';
        ctx.beginPath(); ctx.arc(mx + h * 0.135 + i * h * 0.03, y + h * 0.03 - a * h * 0.006, h * 0.009, 0, PI * 2); ctx.fill();
      }
    }
    // caixa de texto
    ctx.fillStyle = '#ffffff'; rr(ctx, mx + mw * 0.05, h * 0.87, mw * 0.9, h * 0.085, h * 0.04); ctx.fill();
    ctx.strokeStyle = '#ddd5c9'; ctx.lineWidth = 2; ctx.stroke();
    font(ctx, h * 0.028, 500); ctx.fillStyle = '#9a9488'; ctx.fillText('Pergunte à Faísca…', mx + mw * 0.08, h * 0.913);
    ctx.fillStyle = '#ff7a45'; ctx.beginPath(); ctx.arc(mx + mw * 0.91, h * 0.912, h * 0.028, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx + mw * 0.91, h * 0.928); ctx.lineTo(mx + mw * 0.91, h * 0.897); ctx.moveTo(mx + mw * 0.91 - h * 0.012, h * 0.909); ctx.lineTo(mx + mw * 0.91, h * 0.897); ctx.lineTo(mx + mw * 0.91 + h * 0.012, h * 0.909); ctx.stroke();
    glare(ctx, w, h);
  }
  function drawDoc(ctx, w, h) {
    ctx.fillStyle = '#e9e6e1'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2b3550'; ctx.fillRect(0, 0, w, h * 0.06);
    font(ctx, h * 0.028, 600); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Contrato_Fornecedor_v3.pdf', w * 0.02, h * 0.031);
    // página
    const px = w * 0.05, py = h * 0.1, pw = w * 0.52, ph = h * 0.95;
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(px + 6, py + 6, pw, ph);
    ctx.fillStyle = '#fff'; ctx.fillRect(px, py, pw, ph);
    font(ctx, h * 0.034, 800); ctx.fillStyle = '#1b2233'; ctx.fillText('CONTRATO DE FORNECIMENTO', px + pw * 0.08, py + h * 0.06);
    let y = py + h * 0.11;
    const r = M.rng(5);
    for (let i = 0; i < 20; i++) {
      const head = i === 4 || i === 12;
      const hl = i === 6 || i === 7 || i === 15;
      const lw = pw * (head ? 0.5 : 0.7 + r() * 0.14);
      if (hl) { ctx.fillStyle = 'rgba(255,214,90,0.7)'; ctx.fillRect(px + pw * 0.07, y - h * 0.012, lw + 8, h * 0.026); }
      ctx.fillStyle = head ? '#1b2233' : 'rgba(40,45,60,0.45)';
      if (head) { font(ctx, h * 0.024, 800); ctx.fillText(i === 4 ? 'Cláusula 7 — Multa rescisória' : 'Cláusula 12 — Reajuste', px + pw * 0.08, y); }
      else ctx.fillRect(px + pw * 0.08, y - 3, lw, 6);
      y += head ? h * 0.042 : h * 0.032;
    }
    // painel da Faísca
    const ax = w * 0.61, aw = w * 0.36;
    ctx.fillStyle = '#ffffff'; rr(ctx, ax, py, aw, h * 0.84, h * 0.025); ctx.fill();
    sparkDot(ctx, ax + h * 0.05, py + h * 0.055, h * 0.028);
    font(ctx, h * 0.03, 800); ctx.fillStyle = '#1b2233'; ctx.fillText('Análise da Faísca', ax + h * 0.095, py + h * 0.057);
    const tags = [['#e94b5a', 'Multa de 30% — acima do usual'], ['#e8a33a', 'Reajuste automático anual'], ['#e8a33a', 'Exclusividade de 5 anos'], ['#2f9e74', 'Prazos de entrega claros']];
    tags.forEach((tg, i) => {
      const yy = py + h * (0.15 + i * 0.105);
      ctx.fillStyle = tg[0]; rr(ctx, ax + aw * 0.06, yy - h * 0.03, aw * 0.88, h * 0.075, h * 0.015); ctx.globalAlpha = 0.13; ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = tg[0]; ctx.beginPath(); ctx.arc(ax + aw * 0.12, yy + h * 0.007, h * 0.012, 0, PI * 2); ctx.fill();
      font(ctx, h * 0.023, 700); ctx.fillStyle = '#283044';
      wrap(ctx, tg[1], aw * 0.68).slice(0, 2).forEach((s, k) => ctx.fillText(s, ax + aw * 0.19, yy + k * h * 0.03 - (tg[1].length > 26 ? h * 0.008 : -h * 0.006)));
    });
    font(ctx, h * 0.022, 600); ctx.fillStyle = '#6b6f7a';
    wrap(ctx, 'Sugestão: revise a cláusula 7 com o jurídico antes de assinar.', aw * 0.84).forEach((s, k) => ctx.fillText(s, ax + aw * 0.08, py + h * (0.62 + k * 0.035)));
    ctx.fillStyle = '#ff7a45'; rr(ctx, ax + aw * 0.08, py + h * 0.72, aw * 0.84, h * 0.07, h * 0.035); ctx.fill();
    font(ctx, h * 0.025, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('Gerar resumo para o conselho', ax + aw * 0.5, py + h * 0.756);
    ctx.textAlign = 'left';
    glare(ctx, w, h);
  }
  function drawSheet(ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1f7a4d'; ctx.fillRect(0, 0, w, h * 0.06);
    font(ctx, h * 0.028, 600); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Orçamento_2027.xlsx', w * 0.02, h * 0.031);
    ctx.fillStyle = '#f1f3f2'; ctx.fillRect(0, h * 0.06, w, h * 0.06);
    font(ctx, h * 0.024, 600); ctx.fillStyle = '#3a4a42'; ctx.fillText('fx   =SOMA(C3:C9)', w * 0.02, h * 0.09);
    const cols = ['', 'Área', 'Previsto', 'Realizado', 'Var.'];
    const cw = [0.05, 0.22, 0.16, 0.16, 0.1];
    const rows = [['Comercial', '12,4', '12,9', '+4%'], ['Operações', '18,1', '17,6', '−3%'], ['Marketing', '6,2', '6,0', '−3%'], ['TI', '9,8', '10,1', '+3%'], ['RH', '4,5', '4,4', '−2%'], ['Logística', '7,3', '8,6', '+18%'], ['Total', '58,3', '59,6', '+2%']];
    const top = h * 0.14, rh = h * 0.075;
    let x = 0;
    ctx.fillStyle = '#f1f3f2'; ctx.fillRect(0, top, w * 0.69, rh);
    for (let c = 0; c < cols.length; c++) {
      font(ctx, h * 0.025, 800); ctx.fillStyle = '#3a4a42'; ctx.fillText(cols[c], x * w + w * 0.012, top + rh / 2);
      x += cw[c];
    }
    rows.forEach((row, i) => {
      const y = top + rh * (i + 1);
      if (i === 5) { ctx.fillStyle = 'rgba(233,75,90,0.12)'; ctx.fillRect(0, y, w * 0.69, rh); }
      if (i === 6) { ctx.fillStyle = '#eef6f1'; ctx.fillRect(0, y, w * 0.69, rh); }
      ctx.fillStyle = '#8a958f'; font(ctx, h * 0.022, 600); ctx.fillText(String(i + 3), w * 0.012, y + rh / 2);
      let xx = cw[0];
      row.forEach((v, c) => {
        font(ctx, h * 0.027, c === 0 || i === 6 ? 800 : 500);
        ctx.fillStyle = c === 3 ? (v.indexOf('+1') === 0 ? '#d0343f' : v[0] === '+' ? '#1f7a4d' : '#b06a1e') : '#1e2a24';
        ctx.fillText(v, xx * w + w * 0.012, y + rh / 2);
        xx += cw[c + 1];
      });
    });
    ctx.strokeStyle = '#dfe5e1'; ctx.lineWidth = 1.5;
    for (let i = 0; i <= rows.length + 1; i++) { ctx.beginPath(); ctx.moveTo(0, top + rh * i); ctx.lineTo(w * 0.69, top + rh * i); ctx.stroke(); }
    x = 0; for (let c = 0; c <= cols.length; c++) { ctx.beginPath(); ctx.moveTo(x * w, top); ctx.lineTo(x * w, top + rh * (rows.length + 1)); ctx.stroke(); x += cw[c] || 0; }
    ctx.strokeStyle = '#1f7a4d'; ctx.lineWidth = 4; ctx.strokeRect(w * 0.43, top + rh * 6, w * 0.16, rh);
    // gráfico
    const gx = w * 0.72, gy = h * 0.14, gw = w * 0.25, gh = h * 0.36;
    ctx.fillStyle = '#f7f8f7'; rr(ctx, gx, gy, gw, gh, 10); ctx.fill();
    [0.55, 0.8, 0.35, 0.6, 0.28, 0.92].forEach((v, i) => {
      ctx.fillStyle = i === 5 ? '#e94b5a' : '#3f9a6c';
      ctx.fillRect(gx + gw * (0.1 + i * 0.14), gy + gh * (0.9 - v * 0.75), gw * 0.09, gh * v * 0.75);
    });
    // dica da Faísca
    const bx = w * 0.72, by = h * 0.55, bw = w * 0.25, bh = h * 0.36;
    ctx.fillStyle = '#fff4ee'; rr(ctx, bx, by, bw, bh, 14); ctx.fill();
    ctx.strokeStyle = '#ffb38a'; ctx.lineWidth = 2; ctx.stroke();
    sparkDot(ctx, bx + h * 0.045, by + h * 0.05, h * 0.026);
    font(ctx, h * 0.025, 800); ctx.fillStyle = '#c2451a'; ctx.fillText('Faísca', bx + h * 0.085, by + h * 0.052);
    font(ctx, h * 0.023, 600); ctx.fillStyle = '#3a2a22';
    wrap(ctx, 'Logística 18% acima do previsto: o frete subiu em out/nov. Quer comparar fornecedores?', bw * 0.86).slice(0, 5).forEach((s, k) => ctx.fillText(s, bx + bw * 0.07, by + h * (0.11 + k * 0.042)));
    glare(ctx, w, h);
  }
  function drawEmail(ctx, w, h) {
    ctx.fillStyle = '#f7f7f9'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#24324f'; ctx.fillRect(0, 0, w, h * 0.12);
    font(ctx, h * 0.05, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Caixa de entrada', w * 0.04, h * 0.062);
    ctx.fillStyle = '#ff7a45'; rr(ctx, w * 0.66, h * 0.025, w * 0.3, h * 0.07, h * 0.035); ctx.fill();
    font(ctx, h * 0.034, 800); ctx.fillStyle = '#fff'; ctx.fillText('✦ Resumir 47', w * 0.69, h * 0.062);
    const mails = [['Conselho', 'Pauta de amanhã — urgente'], ['Jurídico', 'Minuta do contrato v3'], ['Financeiro', 'Fechamento de setembro'], ['RH', 'Plano de sucessão'], ['Cliente Alfa', 'Proposta revisada'], ['Marketing', 'Campanha Q4']];
    mails.forEach((m, i) => {
      const y = h * (0.17 + i * 0.135);
      ctx.fillStyle = i < 2 ? '#ffffff' : '#f7f7f9'; ctx.fillRect(0, y - h * 0.05, w, h * 0.125);
      ctx.fillStyle = '#e6e6ec'; ctx.fillRect(0, y + h * 0.073, w, 2);
      if (i < 3) { ctx.fillStyle = '#4a7bd1'; ctx.beginPath(); ctx.arc(w * 0.035, y + h * 0.01, h * 0.012, 0, PI * 2); ctx.fill(); }
      font(ctx, h * 0.04, i < 3 ? 800 : 600); ctx.fillStyle = '#1b2233'; ctx.fillText(m[0], w * 0.07, y - h * 0.008);
      font(ctx, h * 0.034, 500); ctx.fillStyle = '#5b6170'; ctx.fillText(m[1], w * 0.07, y + h * 0.04);
    });
    glare(ctx, w, h);
  }
  function drawAgenda(ctx, w, h) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    font(ctx, h * 0.06, 800); ctx.fillStyle = '#1b2233'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Terça, 14', w * 0.05, h * 0.08);
    for (let i = 0; i < 9; i++) {
      const y = h * (0.17 + i * 0.09);
      font(ctx, h * 0.03, 600); ctx.fillStyle = '#9aa0ab'; ctx.fillText((8 + i) + 'h', w * 0.04, y);
      ctx.fillStyle = '#eceef2'; ctx.fillRect(w * 0.13, y, w * 0.84, 2);
    }
    [[1, 1.0, '#4a7bd1', 'Diretoria'], [3, 0.8, '#2f9e74', 'Cliente — contrato'], [6, 1.6, '#e8551f', 'Conselho'], [5, 0.5, '#8a5ad1', 'Almoço']].forEach((e) => {
      const y = h * (0.17 + e[0] * 0.09);
      ctx.fillStyle = e[2]; ctx.globalAlpha = 0.16; rr(ctx, w * 0.15, y + 3, w * 0.8, h * 0.09 * e[1] - 6, 8); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = e[2]; ctx.fillRect(w * 0.15, y + 3, 6, h * 0.09 * e[1] - 6);
      font(ctx, h * 0.036, 700); ctx.fillStyle = '#1b2233'; ctx.fillText(e[3], w * 0.18, y + h * 0.045);
    });
    glare(ctx, w, h);
  }
  function drawScreen(mode, ctx, w, h, st) {
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (mode === 'chat') drawChat(ctx, w, h, st);
    else if (mode === 'doc') drawDoc(ctx, w, h);
    else if (mode === 'planilha') drawSheet(ctx, w, h);
    else if (mode === 'email') drawEmail(ctx, w, h);
    else if (mode === 'agenda') drawAgenda(ctx, w, h);
    else if (mode === 'on') drawDesktop(ctx, w, h);
    else drawOff(ctx, w, h);
    ctx.restore();
  }
  /** Slide (TV / telão): navy com faixa laranja; lines[0] = título. */
  function drawSlide(ctx, w, h, data, opts) {
    opts = opts || {};
    let title = '', lines = [];
    if (Array.isArray(data)) { title = data[0] || ''; lines = data.slice(1); }
    else if (data && typeof data === 'object') { title = data.title || ''; lines = data.lines || []; }
    else if (typeof data === 'string') title = data;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#16223d'); g.addColorStop(1, '#0e1628');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff7a45'; ctx.fillRect(w * 0.06, h * 0.12, w * 0.012, h * 0.16);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    font(ctx, h * 0.085, 800); ctx.fillStyle = '#ffffff';
    const tl = wrap(ctx, title, w * 0.84).slice(0, 2);
    tl.forEach((s, i) => ctx.fillText(s, w * 0.095, h * (0.2 + i * 0.1) - (tl.length > 1 ? h * 0.04 : 0)));
    const chart = opts.chart && lines.length <= 3;
    const lw = chart ? w * 0.48 : w * 0.82;
    let y = h * 0.42;
    lines.slice(0, 5).forEach((ln) => {
      font(ctx, h * 0.055, 600);
      const ls = wrap(ctx, ln, lw).slice(0, 2);
      ctx.fillStyle = '#ff7a45'; ctx.beginPath(); ctx.arc(w * 0.105, y, h * 0.014, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#d9e2f2';
      ls.forEach((s, k) => ctx.fillText(s, w * 0.135, y + k * h * 0.068));
      y += h * 0.068 * ls.length + h * 0.045;
    });
    if (chart) {
      const cx = w * 0.62, cy = h * 0.4, cw2 = w * 0.32, ch = h * 0.42;
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(cx, cy + ch * i / 3); ctx.lineTo(cx + cw2, cy + ch * i / 3); ctx.stroke(); }
      [0.45, 0.58, 0.52, 0.7, 0.86].forEach((v, i) => {
        ctx.fillStyle = i === 4 ? '#ff7a45' : '#5b7fc7';
        rr(ctx, cx + cw2 * (0.06 + i * 0.19), cy + ch * (1 - v), cw2 * 0.12, ch * v, 6); ctx.fill();
      });
    }
    font(ctx, h * 0.035, 600); ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(opts.footer || 'Diretoria Executiva', w * 0.06, h * 0.92);
    ctx.textAlign = 'right'; ctx.fillText(opts.page || '3 / 12', w * 0.94, h * 0.92);
    glare(ctx, w, h);
  }
  function drawPainel(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#121b30'); g.addColorStop(1, '#0b1120');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    font(ctx, h * 0.06, 800); ctx.fillStyle = '#fff'; ctx.fillText('Painel do dia', w * 0.05, h * 0.1);
    const k = [['Receita mês', 'R$ 19,8 mi', '+6%', '#3fbf8f'], ['Margem', '14,2%', '−1,1 p.p.', '#e8a33a'], ['NPS', '71', '+4', '#3fbf8f']];
    k.forEach((it, i) => {
      const x = w * (0.05 + i * 0.31);
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x, h * 0.2, w * 0.28, h * 0.25, 12); ctx.fill();
      font(ctx, h * 0.04, 600); ctx.fillStyle = '#9aa8c4'; ctx.fillText(it[0], x + w * 0.02, h * 0.26);
      font(ctx, h * 0.075, 800); ctx.fillStyle = '#fff'; ctx.fillText(it[1], x + w * 0.02, h * 0.34);
      font(ctx, h * 0.04, 700); ctx.fillStyle = it[3]; ctx.fillText(it[2], x + w * 0.02, h * 0.41);
    });
    ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 5; ctx.beginPath();
    for (let i = 0; i <= 20; i++) { const x = w * (0.05 + i * 0.045), y = h * (0.82 - 0.22 * (i / 20) - 0.05 * Math.sin(i * 1.3)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    glare(ctx, w, h);
  }

  /** Foto de formatura do jardim de infância (criança de beca e capelo, sorrindo). */
  function drawPhotoBeca(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d9c6a4'); g.addColorStop(1, '#a88a62');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // varal de bandeirinhas / fundo de palco
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, h * 0.06, w, h * 0.05);
    ['#e05a47', '#f2c14e', '#4f8fd6', '#58b37a', '#e05a47', '#f2c14e', '#4f8fd6'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); const x = w * (0.04 + i * 0.145); ctx.moveTo(x, h * 0.11); ctx.lineTo(x + w * 0.07, h * 0.11); ctx.lineTo(x + w * 0.035, h * 0.2); ctx.closePath(); ctx.fill(); });
    // beca (azul-marinho)
    const cx = w * 0.5;
    ctx.fillStyle = '#1f2f5a';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.2, h); ctx.quadraticCurveTo(cx - w * 0.2, h * 0.6, cx - w * 0.08, h * 0.56); ctx.lineTo(cx + w * 0.08, h * 0.56); ctx.quadraticCurveTo(cx + w * 0.2, h * 0.6, cx + w * 0.2, h); ctx.closePath(); ctx.fill();
    // faixa dourada
    ctx.fillStyle = '#e1b84f'; ctx.beginPath(); ctx.moveTo(cx - w * 0.07, h * 0.57); ctx.lineTo(cx, h * 0.72); ctx.lineTo(cx + w * 0.07, h * 0.57); ctx.lineTo(cx + w * 0.045, h * 0.57); ctx.lineTo(cx, h * 0.66); ctx.lineTo(cx - w * 0.045, h * 0.57); ctx.closePath(); ctx.fill();
    // diploma enrolado
    ctx.fillStyle = '#f6efe0'; ctx.save(); ctx.translate(cx + w * 0.13, h * 0.8); ctx.rotate(-0.5); ctx.fillRect(-w * 0.09, -h * 0.025, w * 0.18, h * 0.05); ctx.fillStyle = '#c0392b'; ctx.fillRect(-w * 0.01, -h * 0.03, w * 0.02, h * 0.06); ctx.restore();
    // rosto
    ctx.fillStyle = '#c98f66'; ctx.beginPath(); ctx.arc(cx, h * 0.42, h * 0.14, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.arc(cx, h * 0.37, h * 0.14, PI * 1.05, PI * 1.95); ctx.fill();
    ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.arc(cx - w * 0.035, h * 0.42, h * 0.014, 0, PI * 2); ctx.arc(cx + w * 0.035, h * 0.42, h * 0.014, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, h * 0.45, h * 0.055, 0.15 * PI, 0.85 * PI); ctx.stroke();
    ctx.fillStyle = 'rgba(230,110,90,0.35)'; ctx.beginPath(); ctx.arc(cx - w * 0.06, h * 0.47, h * 0.025, 0, PI * 2); ctx.arc(cx + w * 0.06, h * 0.47, h * 0.025, 0, PI * 2); ctx.fill();
    // capelo
    ctx.fillStyle = '#141a2e';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.17, h * 0.27); ctx.lineTo(cx, h * 0.2); ctx.lineTo(cx + w * 0.17, h * 0.27); ctx.lineTo(cx, h * 0.33); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - w * 0.07, h * 0.28, w * 0.14, h * 0.06);
    ctx.strokeStyle = '#e1b84f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, h * 0.27); ctx.lineTo(cx + w * 0.13, h * 0.3); ctx.lineTo(cx + w * 0.13, h * 0.4); ctx.stroke();
    // vinheta + leve desbotado de foto antiga
    const v = ctx.createRadialGradient(cx, h / 2, h * 0.3, cx, h / 2, w * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,240,210,0.08)'; ctx.fillRect(0, 0, w, h);
  }

  /** Atlas com 3 diplomas/certificados (512×396 cada): graduação, MBA, prêmio. */
  function drawDiplomas(ctx, W, H) {
    const SER = 'Georgia,"Times New Roman",serif';
    const docs = [
      { kind: 'Faculdade de Engenharia', title: 'DIPLOMA', sub: 'Bacharel em Engenharia de Produção', year: 'São Paulo, dezembro de 1989', seal: '#b2302a', ink: '#1f2c4a' },
      { kind: 'Escola de Negócios', title: 'MBA Executivo', sub: 'Gestão Empresarial Internacional', year: 'São Paulo, junho de 2004', seal: '#c9a25e', ink: '#3a2414' },
      { kind: 'Associação Comercial', title: 'Empresário do Ano', sub: 'Reconhecimento pela liderança e inovação', year: 'São Paulo, 2019', seal: '#c9a25e', ink: '#1f2c4a' },
    ];
    docs.forEach((d, i) => {
      const x0 = i * 512, w = 512, h = H;
      ctx.save(); ctx.translate(x0, 0);
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, i === 2 ? '#f3ead6' : '#f8f3e6'); g.addColorStop(1, i === 2 ? '#e9dcc0' : '#efe6d2');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // guilhoché (fundo de segurança) bem suave
      ctx.strokeStyle = 'rgba(120,100,60,0.07)'; ctx.lineWidth = 1;
      for (let k = 0; k < 22; k++) { ctx.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * 0.5 + Math.sin(x * 0.035 + k * 0.6) * (40 + k * 6); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      // bordas: filete duplo
      ctx.strokeStyle = d.ink; ctx.lineWidth = 5; ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.strokeStyle = '#b8935a'; ctx.lineWidth = 2; ctx.strokeRect(24, 24, w - 48, h - 48);
      [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]].forEach((c) => { ctx.fillStyle = '#b8935a'; ctx.beginPath(); ctx.arc(c[0], c[1], 6, 0, PI * 2); ctx.fill(); });
      // brasão
      ctx.fillStyle = d.ink; ctx.beginPath(); ctx.arc(w / 2, 66, 22, 0, PI * 2); ctx.fill();
      ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w / 2, 66, 16, 0, PI * 2); ctx.stroke();
      ctx.fillStyle = '#d8b878'; ctx.beginPath(); ctx.moveTo(w / 2, 54); ctx.lineTo(w / 2 + 8, 70); ctx.lineTo(w / 2 - 8, 70); ctx.closePath(); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#5a4a3a'; ctx.font = '600 15px ' + SER; ctx.fillText(d.kind.toUpperCase(), w / 2, 104);
      ctx.fillStyle = d.ink; ctx.font = (i === 0 ? 'bold 44px ' : 'italic bold 38px ') + SER; ctx.fillText(d.title, w / 2, 148);
      ctx.fillStyle = '#4a3f33'; ctx.font = 'italic 16px ' + SER; ctx.fillText('confere a', w / 2, 186);
      // "nome" manuscrito (rabisco caligráfico)
      ctx.strokeStyle = d.ink; ctx.lineWidth = 2.6; ctx.beginPath();
      const rr3 = M.rng(90 + i);
      let x = w * 0.27; ctx.moveTo(x, 214);
      while (x < w * 0.73) { const nx = x + 10 + rr3() * 14; ctx.bezierCurveTo(x + 4, 196 + rr3() * 6, nx - 4, 232 - rr3() * 6, nx, 214 + (rr3() - 0.5) * 8); x = nx; }
      ctx.stroke();
      ctx.fillStyle = '#4a3f33'; ctx.font = '15px ' + SER; ctx.fillText(d.sub, w / 2, 250);
      // linhas de texto corrido
      ctx.fillStyle = 'rgba(70,60,48,0.45)';
      [272, 286].forEach((y, k) => ctx.fillRect(w * (0.2 + k * 0.06), y, w * (0.6 - k * 0.12), 3));
      ctx.fillStyle = '#5a4a3a'; ctx.font = 'italic 13px ' + SER; ctx.fillText(d.year, w / 2, 310);
      // assinaturas
      [w * 0.27, w * 0.73].forEach((sx, k) => {
        ctx.strokeStyle = 'rgba(40,40,60,0.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx - 56, 342);
        ctx.bezierCurveTo(sx - 30, 318 - k * 6, sx - 10, 352, sx + 8, 330); ctx.bezierCurveTo(sx + 24, 316, sx + 34, 350, sx + 56, 334); ctx.stroke();
        ctx.fillStyle = 'rgba(70,60,48,0.6)'; ctx.fillRect(sx - 62, 352, 124, 1.5);
      });
      // selo
      const sx = w * 0.5, sy = 344;
      ctx.fillStyle = d.seal; ctx.beginPath();
      for (let k = 0; k < 24; k++) { const a = k / 24 * PI * 2, r = k % 2 ? 24 : 28; k ? ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r) : ctx.moveTo(sx + r, sy); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 17, 0, PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(sx - 6, sy - 6, 6, 0, PI * 2); ctx.fill();
      ctx.restore();
    });
    noise(ctx, W, H, 0.02, 93);
  }

  /** Tela em canvas como malha. */
  function makeScreen(own, w, h, pxW, pxH) {
    const c = document.createElement('canvas');
    c.width = pxW; c.height = pxH;
    const ctx = c.getContext('2d');
    const tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false, color: col('#eeeeee') });
    const mesh = new T.Mesh(M.planeGeo(w, h), mat);
    mesh.castShadow = false; mesh.receiveShadow = false;
    own.add(tex); own.add(mat);
    return {
      mesh, tex, ctx, w: pxW, h: pxH, key: null,
      draw(key, fn) { if (key != null && key === this.key) return; this.key = key; fn(ctx, pxW, pxH); tex.needsUpdate = true; },
    };
  }

  // ====================================================================
  // Peças de cenário reaproveitáveis
  // ====================================================================
  const WOOD = () => stdMat('wood-walnut', { map: woodTex('walnut', '#6e4529', '#2e1a0e', 11), rough: 0.42, vc: true, env: 0.25 });
  const WOODL = () => stdMat('wood-light', { map: woodTex('oak', '#b48a62', '#5a3a20', 23), rough: 0.5, vc: true, env: 0.2 });
  const MATTE = () => vc(0.82, 0);
  const SATIN = () => vc(0.45, 0);
  const GLOSS = () => stdMat('vc-gloss', { vc: true, rough: 0.22, env: 0.6 });
  const METAL = () => stdMat('vc-metal', { vc: true, rough: 0.3, metal: 0.9, env: 1 });
  const LEATHER = () => stdMat('vc-leather', { vc: true, rough: 0.5, env: 0.25 });
  const FABRIC = () => stdMat('vc-fabric', { vc: true, rough: 0.95 });
  const GLASS = () => stdMat('glass', { color: '#d8ecf7', rough: 0.05, metal: 0.1, opacity: 0.16, env: 1.4, depthWrite: false });
  const CRYSTAL = () => stdMat('crystal', { color: '#e9f6ff', rough: 0.03, metal: 0.2, opacity: 0.45, env: 1.6 });
  const BRASS = '#c9a25e', CHROME = '#d4d8de', BLACKM = '#26272b';

  /** Planta de vaso (folhas elipsoides). kind: 'figueira' | 'espada' | 'palmeira' | 'bonsai' */
  function plant(mg, kind, pos, h, potColor, seed) {
    const r = M.rng(seed || 5);
    const greens = ['#2f6b3a', '#3b7d45', '#28583a', '#4a8a4c', '#356f3c'];
    mg.at(pos, r() * PI, (m) => {
      if (kind === 'bonsai') {
        m.rbox(0.26, 0.06, 0.16, 0.02, potColor || '#2d2f33', [0, 0.03, 0]);
        m.cyl(0.012, 0.022, 0.16, '#5a4030', [0, 0.13, 0], [0, 0, 0.3]);
        for (let i = 0; i < 4; i++) m.sph(0.07, greens[i % 5], [(r() - 0.5) * 0.16, 0.2 + r() * 0.06, (r() - 0.5) * 0.1], [1, 0.55, 0.8]);
        return;
      }
      const ph = kind === 'espada' ? 0.42 : 0.5;
      m.cyl(0.2, 0.16, ph, potColor || '#2d2f33', [0, ph / 2, 0], null, 18);
      m.cyl(0.185, 0.185, 0.02, '#3a2a1e', [0, ph - 0.005, 0], null, 18);
      if (kind === 'espada') {
        for (let i = 0; i < 13; i++) {
          const a = (i / 13) * PI * 2 + r() * 0.4, rad = 0.03 + r() * 0.07, hh = h * (0.55 + r() * 0.45);
          m.add(M.sphereGeo(0.5, 10, 8), greens[i % 5], [Math.cos(a) * rad, ph + hh * 0.48, Math.sin(a) * rad], [(r() - 0.5) * 0.25, a, (r() - 0.5) * 0.3], [0.07, hh, 0.018]);
        }
      } else if (kind === 'palmeira') {
        m.cyl(0.02, 0.025, h * 0.6, '#6a5a3a', [0, ph + h * 0.3, 0]);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * PI * 2, ln = 0.5 + r() * 0.3;
          m.add(M.sphereGeo(0.5, 10, 6), greens[i % 5], [Math.cos(a) * ln * 0.45, ph + h * 0.62 + r() * 0.15, Math.sin(a) * ln * 0.45], [0, -a, 0.5], [ln, 0.03, 0.16]);
        }
      } else {
        // figueira-lira: tronco + folhas grandes
        m.cyl(0.022, 0.03, h * 0.75, '#6b5038', [0, ph + h * 0.37, 0]);
        m.cyl(0.014, 0.018, h * 0.35, '#6b5038', [0.08, ph + h * 0.55, 0], [0, 0, -0.45]);
        for (let i = 0; i < 26; i++) {
          const t = i / 26, a = i * 2.4 + r() * 0.5;
          const yy = ph + h * (0.32 + t * 0.68), rad = 0.12 + (1 - Math.abs(t - 0.55)) * 0.2 + r() * 0.06;
          const s = 0.12 + r() * 0.05;
          m.add(M.sphereGeo(0.5, 10, 8), greens[Math.floor(r() * 5)], [Math.cos(a) * rad, yy, Math.sin(a) * rad], [0.5 + r() * 0.5, -a, 0.3], [s * 1.25, s * 0.16, s * 2.2]);
        }
      }
    });
  }
  /** Fileira de livros ao longo de X a partir de x0 (em pé), largura total ~len. */
  function books(mg, x0, y, z, len, depth, seed, rotY) {
    const r = M.rng(seed);
    const pal = ['#2b3a55', '#7a2f35', '#2f5a45', '#d8cdb6', '#a8763e', '#1f1f24', '#5a4a7a', '#c9b27c', '#8a3f26', '#3d6a7a'];
    mg.at([x0, y, z], rotY || 0, (m) => {
      let x = 0;
      while (x < len - 0.03) {
        if (r() > 0.85 && x < len - 0.3) {
          // pilha deitada
          let yy = 0;
          for (let k = 0; k < 3 + Math.floor(r() * 3); k++) { const th = 0.03 + r() * 0.02; m.box(0.2 + r() * 0.05, th, depth * (0.75 + r() * 0.2), pal[Math.floor(r() * pal.length)], [x + 0.12, yy + th / 2, 0]); yy += th; }
          x += 0.27;
          continue;
        }
        const t = 0.025 + r() * 0.035, hh = 0.19 + r() * 0.1;
        const c = pal[Math.floor(r() * pal.length)];
        const lean = r() > 0.92 ? 0.18 : 0;
        m.box(t, hh, depth * (0.8 + r() * 0.18), c, [x + t / 2 + (lean ? hh * 0.09 : 0), hh / 2, 0], [0, 0, -lean]);
        if (r() > 0.6) m.box(t * 1.02, 0.012, depth * 0.82, M.hex(M.mix(c, '#e8d9a8', 0.6)), [x + t / 2, hh * 0.78, 0.001]);
        x += t + 0.002;
      }
    });
  }

  // ====================================================================
  // Cidade (céu + skyline em anel + torres 3D + detalhes) — compartilhada
  // ====================================================================
  const CITY_PAL = {
    dia: { top: '#2a6bd2', mid: '#b2d2f0', bot: '#97aec4', haze: '#bdd3ea', fog: '#bcd2e8', fogN: 32, fogF: 170, far: '#8aa5c0', near: '#728fac', lit: 0, facade: '#ffffff', clouds: 1, sun: null },
    tarde: { top: '#2b2f6a', mid: '#ff9b5e', bot: '#3a2848', haze: '#e3896d', fog: '#d9826e', fogN: 20, fogF: 96, far: '#9a6282', near: '#6d4870', lit: 0.35, facade: '#e0a8a0', clouds: 0.9, sun: '#ffb070' },
    noite: { top: '#060b1f', mid: '#353670', bot: '#0b0e22', haze: '#2a2d60', fog: '#1d2250', fogN: 24, fogF: 115, far: '#1a1f46', near: '#12163a', lit: 1, facade: '#3b4466', clouds: 0, sun: null },
  };

  function ringTex(time) {
    const P = CITY_PAL[time];
    return ctex('ring|' + time, 2048, 1024, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const hy = h * 0.42;
      const r = M.rng(91);
      // brilho do horizonte (pôr do sol / luz da cidade)
      const hg = ctx.createLinearGradient(0, h * 0.12, 0, hy);
      hg.addColorStop(0, 'rgba(0,0,0,0)');
      hg.addColorStop(1, time === 'noite' ? 'rgba(90,70,140,0.55)' : time === 'tarde' ? 'rgba(255,170,110,0.5)' : 'rgba(255,255,255,0.25)');
      ctx.fillStyle = hg; ctx.fillRect(0, h * 0.12, w, hy - h * 0.12);
      const layer = (color, minH, maxH, dens, winA, seed) => {
        const rr2 = M.rng(seed);
        let x = -20;
        while (x < w + 20) {
          const bw = 18 + rr2() * 60 * dens;
          const bh = minH + rr2() * rr2() * (maxH - minH);
          const top = hy - bh;
          ctx.fillStyle = color;
          ctx.fillRect(x, top, bw, h - top);
          // coroamentos: antenas, heliponto
          const k = rr2();
          if (k > 0.86) { ctx.fillRect(x + bw * 0.45, top - 26, 2, 26); if (time === 'noite' || time === 'tarde') { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(x + bw * 0.45 - 1, top - 28, 4, 4); ctx.fillStyle = color; } }
          else if (k > 0.72) ctx.fillRect(x + bw * 0.2, top - 6, bw * 0.6, 6);
          // janelas
          if (winA > 0) {
            for (let yy = top + 6; yy < hy - 4; yy += 7) for (let xx = x + 3; xx < x + bw - 4; xx += 6) {
              const v = rr2();
              if (time === 'noite' ? v > 0.6 : time === 'tarde' ? v > 0.9 : v > 0.82) {
                ctx.fillStyle = time === 'dia' ? 'rgba(255,255,255,' + winA + ')' : (v > 0.93 ? 'rgba(255,240,210,' + winA + ')' : 'rgba(255,200,120,' + winA + ')');
                ctx.fillRect(xx, yy, 3, 4);
              }
            }
            ctx.fillStyle = color;
          }
          x += bw + (rr2() > 0.7 ? rr2() * 14 : 0);
        }
      };
      layer(P.far, 30, 210, 1, time === 'dia' ? 0.12 : time === 'noite' ? 0.55 : 0.25, 5);
      layer(P.near, 14, 140, 1.4, time === 'dia' ? 0.18 : time === 'noite' ? 0.8 : 0.4, 9);
      // névoa sobre os prédios perto do horizonte
      ctx.globalCompositeOperation = 'source-atop';
      const fg = ctx.createLinearGradient(0, h * 0.15, 0, hy);
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(1, P.haze);
      ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      // base em névoa (opaca)
      const bg = ctx.createLinearGradient(0, hy - 2, 0, h);
      bg.addColorStop(0, P.haze); bg.addColorStop(0.5, P.fog); bg.addColorStop(1, P.bot);
      ctx.fillStyle = bg; ctx.fillRect(0, hy - 2, w, h - hy + 2);
      // luzes da cidade lá embaixo (noite)
      if (time !== 'dia') {
        for (let i = 0; i < (time === 'noite' ? 900 : 250); i++) {
          const yy = hy + Math.pow(r(), 2.2) * (h - hy) * 0.7;
          ctx.fillStyle = r() > 0.5 ? 'rgba(255,200,120,' + (0.3 + r() * 0.6) + ')' : 'rgba(255,240,220,' + (0.2 + r() * 0.5) + ')';
          ctx.fillRect(r() * w, yy, 2, 2);
        }
      }
    });
  }
  function cloudTex() {
    return ctex('cloud', 256, 128, (ctx, w, h) => {
      const r = M.rng(4);
      for (let i = 0; i < 14; i++) {
        const x = w * (0.2 + r() * 0.6), y = h * (0.45 + r() * 0.25), rad = h * (0.15 + r() * 0.22);
        const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }, false);
  }

  /**
   * Cidade ao redor. opts: {seed, towers:[[ang, dist, w, d, topY, type]], body:{w,d,top}}.
   * Retorna {group, setTime(time), update(t,dt), fog}.
   */
  function buildCity(root, own, opts) {
    opts = opts || {};
    const g = M.group({ parent: root, name: 'cidade' });
    // céu
    const dome = M.skyDome('#3f7fd3', '#c4def2', '#9fb2c4', 150);
    own.add(dome.geometry); own.add(dome.material);
    g.add(dome);
    const setSky = (a, b, c) => {
      const u = dome.material.uniforms;
      u.top.value.set(a).convertLinearToSRGB(); u.mid.value.set(b).convertLinearToSRGB(); u.bot.value.set(c).convertLinearToSRGB();
    };
    // anel de skyline
    const R = 95, H = 120, HF = 0.42;
    const ringGeo = new T.CylinderGeometry(R, R, H, 96, 1, true);
    own.add(ringGeo);
    const ringMat = new T.MeshBasicMaterial({ transparent: true, side: T.BackSide, fog: false, toneMapped: false, depthWrite: false });
    own.add(ringMat);
    const ring = new T.Mesh(ringGeo, ringMat);
    ring.position.y = (opts.horizonY == null ? -6 : opts.horizonY) + HF * H - H / 2;
    ring.renderOrder = -5;
    g.add(ring);
    // torres 3D (meio-campo, com névoa) — mescladas por tipo de fachada: 2 draw calls por tipo
    const facMats = {};
    ['vidro', 'concreto', 'escuro', 'corpo'].forEach((tp) => {
      const tt = tp === 'corpo' ? 'escuro' : tp;
      const m = new T.MeshStandardMaterial({ map: facadeTex(tt, false), emissiveMap: facadeTex(tt, true), emissive: col('#ffd59a'), emissiveIntensity: 0, roughness: tt === 'concreto' ? 0.85 : 0.4, metalness: tt === 'concreto' ? 0 : 0.1 });
      own.add(m);
      facMats[tp] = m;
    });
    const roofMat = new T.MeshStandardMaterial({ color: col('#7a7e86'), roughness: 0.9 });
    own.add(roofMat);
    const sets = {};
    const tops = new Merger();
    const redLights = [];
    const r = M.rng(opts.seed || 33);
    const _mt = new T.Matrix4(), _nm = new T.Matrix3(), _v = new T.Vector3();
    const addBox = (type, x, z, rotY, w, d, top, bottom) => {
      const hgt = top - bottom;
      const geo = new T.BoxGeometry(w, hgt, d).toNonIndexed();
      const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
      _mt.makeRotationY(rotY).setPosition(x, bottom + hgt / 2, z);
      _nm.getNormalMatrix(_mt);
      const S = sets[type] || (sets[type] = { side: { p: [], n: [], u: [] }, top: { p: [], n: [], u: [] } });
      for (let i = 0; i < pos.count; i += 3) {
        const ny = nrm.getY(i);
        if (ny < -0.5) continue;
        const dst = ny > 0.5 ? S.top : S.side;
        for (let k = 0; k < 3; k++) {
          const j = i + k;
          _v.set(pos.getX(j), pos.getY(j), pos.getZ(j)).applyMatrix4(_mt);
          dst.p.push(_v.x, _v.y, _v.z);
          _v.set(nrm.getX(j), nrm.getY(j), nrm.getZ(j)).applyMatrix3(_nm).normalize();
          dst.n.push(_v.x, _v.y, _v.z);
          if (ny > 0.5) dst.u.push(0, 0);
          else { const span = Math.abs(nrm.getX(j)) > 0.5 ? d : w; dst.u.push(uv.getX(j) * span / 12, uv.getY(j) * hgt / 24 + (bottom % 24) / 24); }
        }
      }
      geo.dispose();
    };
    const makeTower = (ang, dist, w, d, topY, type, bottom) => {
      const x = Math.sin(ang) * dist, z = Math.cos(ang) * dist, rotY = ang + (r() - 0.5) * 0.3;
      addBox(type, x, z, rotY, w, d, topY, bottom);
      // telhado: casa de máquinas, heliponto, caixa d'água, antena
      tops.at([x, topY, z], rotY, (m) => {
        m.box(w * 0.94, 0.4, d * 0.94, '#62666e', [0, 0.2, 0]);
        m.box(w, 0.6, 0.25, '#55595f', [0, 0.3, d / 2 - 0.12]);
        m.box(w, 0.6, 0.25, '#55595f', [0, 0.3, -d / 2 + 0.12]);
        const k = r();
        if (k > 0.55) {
          m.cyl(Math.min(w, d) * 0.3, Math.min(w, d) * 0.3, 0.12, '#45494f', [0, 0.46, 0], null, 24);
          m.tor(Math.min(w, d) * 0.22, 0.06, '#e8e2d0', [0, 0.53, 0], [HP, 0, 0]);
          m.box(Math.min(w, d) * 0.07, 0.02, Math.min(w, d) * 0.28, '#e8e2d0', [-Math.min(w, d) * 0.08, 0.53, 0]);
          m.box(Math.min(w, d) * 0.07, 0.02, Math.min(w, d) * 0.28, '#e8e2d0', [Math.min(w, d) * 0.08, 0.53, 0]);
          m.box(Math.min(w, d) * 0.16, 0.02, Math.min(w, d) * 0.06, '#e8e2d0', [0, 0.53, 0]);
        } else {
          m.box(w * 0.4, 2.2, d * 0.35, '#8a8e96', [w * 0.18, 1.5, -d * 0.2]);
          m.cyl(1.1, 1.1, 1.8, '#9aa0a8', [-w * 0.22, 1.3, d * 0.18], null, 14);
        }
        for (let i = 0; i < 3; i++) m.box(0.9, 0.5, 0.9, '#a3a7ad', [(r() - 0.5) * w * 0.6, 0.65, (r() - 0.5) * d * 0.5]);
        if (k > 0.25 && k < 0.75) {
          const ah = 4 + r() * 7;
          m.cyl(0.08, 0.14, ah, '#b9bec6', [-w * 0.3, 0.4 + ah / 2, d * 0.28]);
          const c = Math.cos(rotY), sn = Math.sin(rotY);
          redLights.push([x + (-w * 0.3) * c + (d * 0.28) * sn, topY + 0.4 + ah, z - (-w * 0.3) * sn + (d * 0.28) * c]);
        }
      });
    };
    (opts.towers || []).forEach((t) => makeTower(t[0], t[1], t[2], t[3], t[4], t[5] || 'vidro', -90));
    if (opts.body) addBox('corpo', opts.body.x || 0, opts.body.z || 0, 0, opts.body.w, opts.body.d, opts.body.top, -90);
    Object.keys(sets).forEach((tp) => {
      const S = sets[tp];
      const geo = new T.BufferGeometry();
      const P = S.side.p.concat(S.top.p), N = S.side.n.concat(S.top.n), U = S.side.u.concat(S.top.u);
      geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
      geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
      geo.addGroup(0, S.side.p.length / 3, 0);
      geo.addGroup(S.side.p.length / 3, S.top.p.length / 3, 1);
      geo.computeBoundingSphere();
      own.add(geo);
      const mesh = new T.Mesh(geo, [facMats[tp], roofMat]);
      mesh.castShadow = false; mesh.receiveShadow = tp === 'corpo';
      g.add(mesh);
    });
    let tmesh = null;
    if (!tops.empty()) { tmesh = tops.build(MATTE(), own, { parent: g, cast: false, receive: false }); }
    // luzes vermelhas de aviação (piscam)
    const reds = redLights.map((p) => {
      const sp = M.glow('#ff3030', 2.2, 0.9);
      sp.position.set(p[0], p[1], p[2]);
      own.add(sp.material);
      g.add(sp);
      return sp;
    });
    // nuvens
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, fog: false, opacity: 0.8 });
      own.add(m);
      const s = new T.Sprite(m);
      const a = r() * PI * 2, d = 110 + r() * 20;
      s.userData.a = a; s.userData.d = d; s.userData.y = 16 + r() * 22; s.userData.sp = 0.002 + r() * 0.002;
      s.scale.set(40 + r() * 30, 14 + r() * 8, 1);
      s.renderOrder = -4;
      g.add(s);
      clouds.push(s);
    }
    // sol (pôr do sol)
    const sun = M.glow('#ffb36b', 60, 0.9); own.add(sun.material); sun.material.fog = false; sun.renderOrder = -4; g.add(sun);
    const sunCore = M.glow('#fff1d0', 14, 1); own.add(sunCore.material); sunCore.material.fog = false; sunCore.renderOrder = -4; g.add(sunCore);
    // helicóptero (luz piscando cruzando o céu)
    const heli = M.glow('#ff4040', 1.4, 1); own.add(heli.material); g.add(heli);
    const heliW = M.glow('#ffffff', 1.0, 1); own.add(heliW.material); g.add(heliW);
    let time = null;
    const api = {
      group: g,
      sunDir: opts.sunDir || [-0.55, 0.12, -1],
      setTime(tm) {
        if (!CITY_PAL[tm]) tm = 'dia';
        if (tm === time) return;
        time = tm;
        const P = CITY_PAL[tm];
        setSky(P.top, P.mid, P.bot);
        ringMat.map = ringTex(tm); ringMat.needsUpdate = true;
        ringTex(tm).repeat.set(3, 1);
        Object.keys(facMats).forEach((k) => {
          const m = facMats[k];
          m.color.set(P.facade);
          m.emissiveIntensity = P.lit * (k === 'concreto' ? 0.9 : k === 'corpo' ? 0 : 1.1);
        });
        roofMat.color.set(tm === 'noite' ? '#2a2e40' : tm === 'tarde' ? '#7a5a66' : '#6e727a');
        if (tmesh) tmesh.material = tm === 'noite' ? stdMat('vc-nightroof', { vc: true, rough: 0.9, color: '#3a4060' }) : tm === 'tarde' ? stdMat('vc-sunsetroof', { vc: true, rough: 0.9, color: '#c9a0a8' }) : MATTE();
        reds.forEach((s) => (s.visible = tm !== 'dia'));
        clouds.forEach((s) => { s.visible = P.clouds > 0; s.material.opacity = 0.75 * P.clouds; s.material.color.set(tm === 'tarde' ? '#ffc0a0' : '#ffffff'); });
        const sd = new T.Vector3().fromArray(api.sunDir).normalize();
        sun.visible = sunCore.visible = !!P.sun;
        if (P.sun) { sun.position.copy(sd).multiplyScalar(130); sunCore.position.copy(sd).multiplyScalar(128); }
        heli.visible = heliW.visible = tm !== 'dia';
        api.applyFog();
      },
      applyFog() {
        const P = CITY_PAL[time || 'dia'];
        const f = P2.core && P2.core.scene && P2.core.scene.fog;
        if (f) { f.color.set(P.fog); f.near = P.fogN * (opts.fogScale || 1); f.far = P.fogF * (opts.fogScale || 1); }
      },
      update(t) {
        if (time !== 'dia') {
          const on = (t % 1.6) < 0.8;
          reds.forEach((s, i) => (s.material.opacity = ((t + i * 0.37) % 1.6) < 0.9 ? 0.95 : 0.15));
          const a = -0.9 + ((t * 0.012) % 1.8);
          const hx = Math.sin(a) * 60, hz = -Math.cos(a) * 60;
          heli.position.set(hx, 14 + Math.sin(t * 0.2) * 1.5, hz);
          heliW.position.set(hx + 0.6, heli.position.y, hz);
          heli.material.opacity = on ? 1 : 0.1;
          heliW.material.opacity = ((t * 1.7) % 1) < 0.12 ? 1 : 0;
        }
        clouds.forEach((s) => {
          const a = s.userData.a + t * s.userData.sp * 0.1;
          s.position.set(Math.sin(a) * s.userData.d, s.userData.y, Math.cos(a) * s.userData.d);
        });
      },
    };
    return api;
  }

  // ====================================================================
  // Parede de vidro (pele de vidro do chão ao teto) — grupo próprio
  // ====================================================================
  function curtainWall(own, o) {
    // o: {len, h, x, z, rotY, panes, shades:[[i, frac]], parent}
    const g = M.group({ parent: o.parent, pos: [o.x || 0, 0, o.z || 0], rot: [0, o.rotY || 0, 0] });
    const mg = new Merger();
    const n = o.panes || 6;
    const pw = o.len / n;
    const fc = o.frame || '#2b2a2e';
    mg.box(o.len + 0.1, 0.1, 0.18, fc, [0, 0.05, 0]);
    mg.box(o.len + 0.1, 0.14, 0.2, fc, [0, o.h - 0.07, 0]);
    for (let i = 0; i <= n; i++) mg.box(0.06, o.h, 0.16, fc, [-o.len / 2 + i * pw, o.h / 2, 0]);
    // transom (travessa) a 0.1m e 2.6m
    mg.box(o.len, 0.04, 0.1, fc, [0, o.h * 0.86, 0.02]);
    // convector no rodapé (lado interno)
    if (o.convector !== false) mg.box(o.len - 0.1, 0.16, 0.22, '#3a3b40', [0, 0.08, 0.2]);
    mg.build(stdMat('vc-frame', { vc: true, rough: 0.35, metal: 0.6, env: 1 }), own, { parent: g, receive: true });
    const glass = new T.Mesh(M.planeGeo(o.len, o.h - 0.2), GLASS());
    glass.position.set(0, o.h / 2, 0);
    glass.castShadow = false; glass.receiveShadow = false;
    glass.renderOrder = 2;
    g.add(glass);
    // persianas de rolo
    if (o.shades && o.shades.length) {
      const sm = new Merger();
      o.shades.forEach((s) => {
        const hh = (o.h - 0.25) * s[1];
        const x = -o.len / 2 + (s[0] + 0.5) * pw;
        sm.box(pw - 0.1, hh, 0.012, '#e9e3d7', [x, o.h - 0.16 - hh / 2, 0.14]);
        sm.box(pw - 0.08, 0.03, 0.03, '#b8b0a2', [x, o.h - 0.16 - hh, 0.14]);
        sm.box(pw - 0.06, 0.07, 0.08, '#d6d0c4', [x, o.h - 0.17, 0.14]);
      });
      sm.build(stdMat('vc-shade', { vc: true, rough: 0.95 }), own, { parent: g });
    }
    return g;
  }

  /** Parede maciça com rodapé e "corte" escuro no topo (estilo maquete). */
  function solidWall(own, o) {
    // o: {len, h, t, pos:[x,z], rotY, color, parent, holes:[{a,b,top}] (aberturas ao longo do comprimento)}
    const g = M.group({ parent: o.parent, pos: [o.pos[0], 0, o.pos[1]], rot: [0, o.rotY || 0, 0] });
    const mg = new Merger();
    const t = o.t || 0.14, L = o.len, H = o.h;
    const segs = [];
    let x = -L / 2;
    (o.holes || []).slice().sort((a, b) => a.a - b.a).forEach((hl) => { segs.push([x, hl.a, 0, H]); segs.push([hl.a, hl.b, hl.top, H]); x = hl.b; });
    segs.push([x, L / 2, 0, H]);
    segs.forEach((s) => {
      const w = s[1] - s[0], hh = s[3] - s[2];
      if (w <= 0.001 || hh <= 0.001) return;
      mg.box(w, hh, t, o.color || '#e4dccf', [(s[0] + s[1]) / 2, s[2] + hh / 2, 0]);
      if (s[2] === 0) mg.box(w, 0.09, 0.02, o.base || '#f3eee6', [(s[0] + s[1]) / 2, 0.045, t / 2 + 0.01]);
    });
    mg.box(L + 0.002, 0.025, t + 0.006, '#2a2a2e', [0, H + 0.0125, 0]);
    mg.build(stdMat('vc-wall', { vc: true, rough: 0.92 }), own, { parent: g });
    return g;
  }

  /** Chão de piso + laje + base de maquete. */
  function floorSlab(own, root, o) {
    // o: {x0,x1,z0,z1, tex, rx, ry}
    const w = o.x1 - o.x0, d = o.z1 - o.z0, cx = (o.x0 + o.x1) / 2, cz = (o.z0 + o.z1) / 2;
    const fm = new T.MeshStandardMaterial({ map: texRepeat(o.tex, o.key, w / (o.tile || 1.6), d / (o.tile || 1.6)), roughness: o.rough || 0.5, metalness: 0 });
    fm.userData.wantsEnv = 0.35;
    own.add(fm);
    const floor = new T.Mesh(M.planeGeo(w, d), fm);
    floor.rotation.x = -HP;
    floor.position.set(cx, 0.001, cz);
    floor.receiveShadow = true; floor.castShadow = false;
    root.add(floor);
    const mg = new Merger();
    const m = o.margin || 0.18;
    mg.box(w + m * 2, 0.3, d + m * 2, o.rim || '#a39c92', [cx, -0.15, cz]);
    mg.box(w + m * 2 + 0.01, 0.03, d + m * 2 + 0.01, '#6d5d48', [cx, -0.015, cz]);
    mg.build(stdMat('vc-slab', { vc: true, rough: 0.9 }), own, { parent: root, cast: false });
    return floor;
  }

  /**
   * Teto visível (primeira pessoa): forro de gesso + luminárias embutidas + rasgo de ar-condicionado
   * + (opcional) painel ripado de madeira suspenso e sanca com LED. Vai num grupo próprio que entra em
   * `walls` com normal [0,−1,0] (some quando a câmera sobe acima do teto).
   * o: {x0,x1,z0,z1,h, lights:[[x,z]], raft:{x0,x1,z0,z1,drop}, soffit:{x0,x1,z0,z1,band,drop}, slots:[[x0,z,x1]], color}
   */
  function buildCeiling(own, root, o) {
    const g = M.group({ parent: root, name: 'teto' });
    const H = o.h, w = o.x1 - o.x0, d = o.z1 - o.z0;
    const plMat = stdMat('ceil-plaster|' + (o.color || '#f1ede6'), { color: o.color || '#f1ede6', rough: 0.95, emissive: '#fff4e6', ei: 0.06 });
    const pl = new T.Mesh(M.planeGeo(w, d), plMat);
    pl.rotation.x = HP; pl.position.set((o.x0 + o.x1) / 2, H - 0.002, (o.z0 + o.z1) / 2);
    pl.castShadow = false; pl.receiveShadow = false;
    g.add(pl);
    const trim = new Merger();
    const lamps = new Merger();
    const glowPos = [];
    // luminárias embutidas: aro + lente
    (o.lights || []).forEach((p) => {
      const y = p[2] != null ? p[2] : H;
      trim.add(M.torusGeo(0.062, 0.012, 6, 20), '#e9e6e0', [p[0], y - 0.008, p[1]], [HP, 0, 0]);
      trim.cyl(0.052, 0.052, 0.012, '#3a3836', [p[0], y - 0.002, p[1]], null, 18);
      lamps.cyl(0.04, 0.04, 0.004, '#ffffff', [p[0], y - 0.01, p[1]], null, 16);
      glowPos.push([p[0], y - 0.03, p[1]]);
    });
    // rasgos lineares (ar-condicionado): faixa escura + aletas
    (o.slots || []).forEach((s) => {
      const len = Math.abs(s[2] - s[0]) || 0.1;
      trim.box(len, 0.012, 0.09, '#2a2a2c', [(s[0] + s[2]) / 2, H - 0.006, s[1]]);
      trim.box(len, 0.004, 0.012, '#8a8884', [(s[0] + s[2]) / 2, H - 0.014, s[1] - 0.025]);
      trim.box(len, 0.004, 0.012, '#8a8884', [(s[0] + s[2]) / 2, H - 0.014, s[1] + 0.025]);
    });
    // sanca (rebaixo em volta de um "caixão" central) com fita de LED na borda interna
    const coveGlow = new Merger();
    if (o.soffit) {
      const S = o.soffit, b = S.band || 0.6, dr = S.drop || 0.14;
      const sw = S.x1 - S.x0, sd = S.z1 - S.z0, cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
      trim.box(sw, dr, b, o.color || '#f1ede6', [cx, H - dr / 2, S.z0 + b / 2]);
      trim.box(sw, dr, b, o.color || '#f1ede6', [cx, H - dr / 2, S.z1 - b / 2]);
      trim.box(b, dr, sd - b * 2, o.color || '#f1ede6', [S.x0 + b / 2, H - dr / 2, cz]);
      trim.box(b, dr, sd - b * 2, o.color || '#f1ede6', [S.x1 - b / 2, H - dr / 2, cz]);
      const iw = sw - b * 2, id = sd - b * 2;
      coveGlow.box(iw, 0.02, 0.012, '#ffffff', [cx, H - dr + 0.03, S.z0 + b + 0.006]);
      coveGlow.box(iw, 0.02, 0.012, '#ffffff', [cx, H - dr + 0.03, S.z1 - b - 0.006]);
      coveGlow.box(0.012, 0.02, id, '#ffffff', [S.x0 + b + 0.006, H - dr + 0.03, cz]);
      coveGlow.box(0.012, 0.02, id, '#ffffff', [S.x1 - b - 0.006, H - dr + 0.03, cz]);
    }
    trim.build(SATIN(), own, { parent: g, cast: false, receive: false });
    // painel ripado suspenso (madeira)
    if (o.raft) {
      const R = o.raft, dr = R.drop || 0.1;
      const rw = R.x1 - R.x0, rd = R.z1 - R.z0;
      const sl = new Merger();
      const n = Math.max(4, Math.round(rw / 0.085));
      for (let i = 0; i < n; i++) sl.box(0.042, 0.06, rd, '#ffffff', [R.x0 + (i + 0.5) * (rw / n), H - dr + 0.03, (R.z0 + R.z1) / 2]);
      sl.box(rw + 0.04, 0.07, 0.03, '#ffffff', [(R.x0 + R.x1) / 2, H - dr + 0.035, R.z0 - 0.015]);
      sl.box(rw + 0.04, 0.07, 0.03, '#ffffff', [(R.x0 + R.x1) / 2, H - dr + 0.035, R.z1 + 0.015]);
      sl.build(WOOD(), own, { parent: g, cast: false, receive: false });
      // fundo escuro acima das ripas (dá profundidade)
      const bk = new T.Mesh(M.planeGeo(rw, rd), stdMat('raft-back', { color: '#1c1714', rough: 1 }));
      bk.rotation.x = HP; bk.position.set((R.x0 + R.x1) / 2, H - 0.006, (R.z0 + R.z1) / 2);
      g.add(bk);
    }
    const lampMat = new T.MeshBasicMaterial({ color: col('#fff3dc'), toneMapped: false });
    own.add(lampMat);
    const lampMesh = lamps.empty() ? null : lamps.build(lampMat, own, { parent: g, cast: false, receive: false });
    const coveMat = new T.MeshBasicMaterial({ color: col('#ffd9a0'), toneMapped: false });
    own.add(coveMat);
    const coveMesh = coveGlow.empty() ? null : coveGlow.build(coveMat, own, { parent: g, cast: false, receive: false });
    void lampMesh; void coveMesh;
    // halos (sprites) só nas luminárias — mais visíveis à noite
    const halos = glowPos.map((p) => { const s = M.glow('#ffe4b8', 0.32, 0); own.add(s.material); s.position.set(p[0], p[1], p[2]); g.add(s); return s; });
    return {
      group: g,
      set(k) {
        lampMat.color.set(M.mix('#c9c3b8', '#fff3dc', clamp(k, 0, 1)));
        coveMat.color.set(M.mix('#d8d0c4', '#ffd29a', clamp(k, 0, 1)));
        halos.forEach((s) => { s.material.opacity = 0.5 * clamp(k - 0.2, 0, 1); s.visible = s.material.opacity > 0.01; });
      },
    };
  }

  /** Cadeira executiva (alta) — local: pessoa olha +Z, encosto em −Z. */
  function execChair(own, parent, pos, rotY, leather) {
    const g = M.group({ parent, pos: [pos[0], 0, pos[1]], rot: [0, rotY || 0, 0] });
    const lm = new Merger();
    const lc = leather || '#2c2522';
    lm.rbox(0.56, 0.11, 0.54, 0.05, lc, [0, 0.405, 0.03]);
    lm.rbox(0.54, 0.74, 0.12, 0.05, lc, [0, 0.9, -0.27], [-0.12, 0, 0]);
    lm.rbox(0.36, 0.2, 0.11, 0.05, lc, [0, 1.38, -0.33], [-0.12, 0, 0]);
    for (let i = 0; i < 4; i++) lm.box(0.5, 0.008, 0.01, M.hex(M.mix(lc, '#000', 0.4)), [0, 0.68 + i * 0.13, -0.205 - i * 0.016], [-0.12, 0, 0]);
    [-1, 1].forEach((s) => lm.rbox(0.07, 0.045, 0.34, 0.02, lc, [s * 0.31, 0.66, 0.0]));
    lm.build(LEATHER(), own, { parent: g });
    const mm = new Merger();
    [-1, 1].forEach((s) => { mm.box(0.025, 0.2, 0.04, CHROME, [s * 0.31, 0.54, -0.04]); mm.box(0.025, 0.025, 0.2, CHROME, [s * 0.31, 0.45, 0.02]); });
    mm.cyl(0.028, 0.028, 0.26, CHROME, [0, 0.22, 0]);
    mm.cyl(0.05, 0.06, 0.06, BLACKM, [0, 0.33, 0]);
    for (let i = 0; i < 5; i++) {
      const a = i * PI * 2 / 5;
      mm.box(0.04, 0.03, 0.3, CHROME, [Math.sin(a) * 0.15, 0.08, Math.cos(a) * 0.15], [0, a, 0]);
      mm.sph(0.03, BLACKM, [Math.sin(a) * 0.29, 0.032, Math.cos(a) * 0.29]);
    }
    mm.build(METAL(), own, { parent: g });
    return g;
  }
  /** Poltrona de visita (couro conhaque, pés de metal). */
  function guestChair(own, parent, pos, rotY, leather) {
    const g = M.group({ parent, pos: [pos[0], 0, pos[1]], rot: [0, rotY || 0, 0] });
    const lm = new Merger();
    const lc = leather || '#8a4a2b';
    lm.rbox(0.58, 0.12, 0.52, 0.05, lc, [0, 0.4, 0.02]);
    lm.rbox(0.58, 0.42, 0.1, 0.05, lc, [0, 0.68, -0.24], [-0.14, 0, 0]);
    [-1, 1].forEach((s) => lm.rbox(0.08, 0.26, 0.5, 0.04, lc, [s * 0.31, 0.53, -0.01]));
    lm.build(LEATHER(), own, { parent: g });
    const mm = new Merger();
    [-1, 1].forEach((s) => {
      mm.box(0.025, 0.36, 0.025, BLACKM, [s * 0.25, 0.17, 0.2]);
      mm.box(0.025, 0.36, 0.025, BLACKM, [s * 0.25, 0.17, -0.2]);
    });
    mm.build(METAL(), own, { parent: g });
    return g;
  }

  /** Luminária de piso (cúpula de linho) com luz pontual opcional. */
  function floorLamp(own, parent, pos, light) {
    const g = M.group({ parent, pos: [pos[0], 0, pos[1]] });
    const mm = new Merger();
    mm.cyl(0.16, 0.18, 0.03, BLACKM, [0, 0.015, 0], null, 24);
    mm.cyl(0.012, 0.012, 1.5, BRASS, [0, 0.78, 0]);
    mm.build(METAL(), own, { parent: g });
    const shadeMat = new T.MeshStandardMaterial({ color: col('#f1e6d2'), roughness: 0.9, emissive: col('#ffcf8a'), emissiveIntensity: 0, side: T.DoubleSide });
    own.add(shadeMat);
    const shade = new T.Mesh(M.cylGeo(0.2, 0.24, 0.32, 28, true), shadeMat);
    shade.position.y = 1.58; shade.castShadow = true;
    g.add(shade);
    const glow = M.glow('#ffcf8a', 1.1, 0); own.add(glow.material); glow.position.y = 1.52; g.add(glow);
    let pl = null;
    if (light) { pl = new T.PointLight('#ffc27a', 0, 5.5, 2); pl.position.set(0, 1.5, 0); g.add(pl); }
    return { group: g, set(k) { shadeMat.emissiveIntensity = 0.9 * k; glow.material.opacity = 0.55 * k; if (pl) pl.intensity = light * k; } };
  }

  // ====================================================================
  // ESCRITÓRIO
  // ====================================================================
  const OFFICE_LIGHT = {
    dia: { sky: '#dfeaff', ground: '#a8865f', hemi: 0.72, sun: '#ffeccc', sunI: 2.6, sunPos: [-6, 9.5, -9], amb: 0.1, lamps: 0, shelf: 0.25, exp: 1 },
    tarde: { sky: '#ffcfaa', ground: '#6a4652', hemi: 0.62, sun: '#ff9446', sunI: 3.0, sunPos: [9, 2.9, -10], amb: 0.1, lamps: 0.75, shelf: 0.8, exp: 1 },
    noite: { sky: '#4a5aa0', ground: '#2a2230', hemi: 0.34, sun: '#93a6ff', sunI: 0.35, sunPos: [-5, 9, -8], amb: 0.09, lamps: 1.25, shelf: 1.2, exp: 1 },
  };
  const OFFICE_ENV = {
    dia: ['#f4f1ec', '#d8cbb8', '#6a4a32', [[0, 2, -8, 10, 4, '#ffffff'], [6, 3, 4, 4, 2, '#fff2dc']]],
    tarde: ['#f0c9a8', '#d49a72', '#4a2e22', [[6, 1, -8, 10, 3, '#ffb070'], [-6, 3, 4, 3, 2, '#ffe0b8']]],
    noite: ['#2a3050', '#5a4a52', '#2a1c16', [[0, 2, -8, 10, 3, '#4a5a9a'], [-3, 2, 5, 2, 2, '#ffcf8a']]],
  };

  // [ângulo (0 = +Z), distância, largura, profundidade, topo (y), fachada] — topos quase todos abaixo do nosso andar
  const OFFICE_TOWERS = [
    // atrás (vista pelas janelas)
    [PI + 0.12, 42, 12, 12, -24, 'concreto'], [PI - 0.42, 46, 13, 12, -20, 'vidro'],
    [PI - 0.08, 60, 14, 14, -8, 'vidro'], [PI + 0.45, 58, 12, 14, -12, 'escuro'], [PI - 0.75, 62, 12, 10, -6, 'concreto'], [PI + 0.85, 66, 11, 11, -2, 'vidro'],
    [PI + 0.25, 84, 14, 14, 16, 'escuro'], [PI - 0.3, 86, 16, 14, 10, 'vidro'], [PI - 0.6, 80, 12, 12, 4, 'concreto'], [PI + 0.6, 84, 12, 12, 7, 'vidro'],
    [PI - 1.05, 80, 14, 12, 12, 'escuro'], [PI + 1.1, 82, 12, 12, 2, 'concreto'],
    // laterais e frente (longe: só silhuetas na névoa)
    [HP + 0.35, 78, 12, 12, -10, 'vidro'], [HP + 0.85, 84, 14, 12, 8, 'concreto'], [HP - 0.25, 82, 12, 12, 2, 'escuro'],
    [-HP - 0.35, 78, 12, 14, -8, 'escuro'], [-HP - 0.9, 84, 12, 12, 10, 'vidro'], [-HP + 0.3, 80, 12, 12, -2, 'concreto'],
    [0.15, 80, 14, 12, -6, 'concreto'], [-0.55, 84, 12, 12, 6, 'vidro'], [0.75, 86, 12, 14, 12, 'escuro'],
  ];


  P2.envs.escritorio = {
    name: 'Escritório da presidência',
    build(params0) {
      const own = new Owner();
      const root = new T.Group();
      root.name = 'env:escritorio';
      const X0 = -4.2, X1 = 4.2, Z0 = -3.3, Z1 = 3.0, H = 3.1;
      const L = M.lighting('dia', { area: 7.5 });
      root.add(L.group);
      L.sun.shadow.camera.far = 50;

      // --- cidade
      const city = buildCity(root, own, {
        seed: 41,
        sunDir: [0.62, 0.14, -1],
        horizonY: -7,
        body: { w: 8.9, d: 6.8, top: -0.33, z: -0.15, type: 'escuro' },
        towers: OFFICE_TOWERS,
      });
      // teto "invisível" que só projeta sombra (luz entra só pelas janelas)
      const ceilMat = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: T.DoubleSide });
      own.add(ceilMat);
      const ceil = new T.Mesh(M.planeGeo(X1 - X0 + 0.3, Z1 - Z0 + 0.3), ceilMat);
      ceil.rotation.x = HP; ceil.position.set(0, H + 0.02, (Z0 + Z1) / 2);
      ceil.castShadow = true; ceil.receiveShadow = false;
      root.add(ceil);

      // --- piso
      floorSlab(own, root, { x0: X0 - 0.07, x1: X1 + 0.07, z0: Z0 - 0.08, z1: Z1 + 0.07, tex: chevronTex(), key: 'chev-off', tile: 1.0, rough: 0.48, margin: 0.12 });
      // tapete principal
      const rugM = new T.MeshStandardMaterial({ map: rugTex('office', '#3a4152', '#2b303c', '#b89a6a'), roughness: 0.95 });
      own.add(rugM);
      const rug = new T.Mesh(M.boxGeo(3.9, 0.012, 3.1), rugM);
      rug.position.set(0.3, 0.007, -1.05); rug.receiveShadow = true; rug.castShadow = false;
      root.add(rug);
      // tapete claro de lã no canto de estar (ancora sofá + mesa de centro)
      const rug2M = new T.MeshStandardMaterial({ map: rugTex('lounge', '#cdbd9f', '#b19a74', '#7a5a3a'), roughness: 0.97 });
      own.add(rug2M);
      const rug2 = new T.Mesh(M.boxGeo(2.1, 0.012, 2.1), rug2M);
      rug2.position.set(X0 + 1.3, 0.007, 1.8); rug2.receiveShadow = true; rug2.castShadow = false;
      root.add(rug2);

      const walls = [];
      // --- parede de vidro (fundo)
      const back = curtainWall(own, { parent: root, len: X1 - X0, h: H, z: Z0, panes: 6, shades: [[0, 0.32], [1, 0.32], [5, 0.18]] });
      walls.push({ obj: back, px: 0, pz: Z0, normal: [0, 0, 1] });
      // --- teto (forro + painel ripado sobre a mesa + embutidos)
      const ceiling = buildCeiling(own, root, {
        x0: X0, x1: X1, z0: Z0, z1: Z1, h: H,
        raft: { x0: -1.25, x1: 1.85, z0: -2.75, z1: 0.05, drop: 0.12 },
        lights: [[-3.3, 0.95], [-3.3, 2.35], [-1.9, 1.65], [-0.6, 2.35], [1.6, 2.35], [2.9, 1.0], [3.35, -2.55], [3.35, -1.2], [-3.45, -2.1], [-3.45, -0.25], [-1.95, -1.2]],
        slots: [[X0 + 0.4, Z0 + 0.45, X1 - 0.4]],
      });
      walls.push({ obj: ceiling.group, px: 0, py: H, pz: 0, normal: [0, -1, 0] });

      // --- parede esquerda: painel ripado + TV + aparador
      const left = solidWall(own, { parent: root, len: Z1 - Z0 + 0.14, h: H, pos: [X0 - 0.07, (Z0 + Z1) / 2], rotY: HP });
      walls.push({ obj: left, px: X0, pz: 0, normal: [1, 0, 0] });
      // tudo que fica preso na parede vai num grupo em coordenadas de mundo que some junto com ela
      const leftG = M.group({ parent: root, name: 'parede-esq' });
      walls.push({ obj: leftG, px: X0, pz: 0, normal: [1, 0, 0] });
      const slatM = new T.MeshStandardMaterial({ map: texRepeat(slatTex(), 'slat-off', 3.8 / 0.48, 1), roughness: 0.6 });
      own.add(slatM);
      const slat = new T.Mesh(M.planeGeo(3.8, H - 0.02), slatM);
      slat.rotation.y = HP; slat.position.set(X0 + 0.005, H / 2, -1.1);
      slat.receiveShadow = true;
      leftG.add(slat);
      const tvM = new Merger();
      tvM.rbox(1.72, 0.99, 0.045, 0.012, '#141518', [0, 1.62, 0]);
      tvM.build(GLOSS(), own, { parent: M.group({ parent: leftG, pos: [X0 + 0.05, 0, -1.1], rot: [0, HP, 0] }) });
      const tv = makeScreen(own, 1.66, 0.935, 1024, 576);
      tv.mesh.position.set(X0 + 0.075, 1.62, -1.1); tv.mesh.rotation.y = HP;
      leftG.add(tv.mesh);
      // aparador flutuante sob a TV
      const cred = new Merger();
      cred.at([X0 + 0.3, 0, -1.1], HP, (m) => {
        m.rbox(2.2, 0.42, 0.44, 0.015, '#ffffff', [0, 0.47, 0]);
        for (let i = 0; i < 4; i++) m.box(0.004, 0.36, 0.005, '#2a170c', [-0.825 + i * 0.55, 0.47, 0.222]);
      });
      cred.build(WOOD(), own, { parent: leftG });
      const credM = new Merger();
      credM.at([X0 + 0.3, 0, -1.1], HP, (m) => {
        m.box(2.16, 0.012, 0.01, BRASS, [0, 0.27, 0.215]);
        [-1, 1].forEach((s) => { m.box(0.02, 0.26, 0.02, BRASS, [s * 1.0, 0.13, 0.15]); m.box(0.02, 0.26, 0.02, BRASS, [s * 1.0, 0.13, -0.15]); });
        // escultura (anel) + base
        m.box(0.1, 0.03, 0.1, '#1f1f22', [0.75, 0.695, 0]);
        m.tor(0.11, 0.022, '#b08850', [0.75, 0.83, 0], [0, 0.4, 0]);
      });
      credM.build(METAL(), own, { parent: leftG });
      const credD = new Merger();
      credD.at([X0 + 0.3, 0, -1.1], HP, (m) => {
        // vaso branco com galhos
        m.cyl(0.07, 0.09, 0.32, '#efece6', [-0.75, 0.84, 0], null, 18);
        m.sph(0.09, '#efece6', [-0.75, 0.7, 0], [1, 0.6, 1]);
        for (let i = 0; i < 5; i++) m.cyl(0.004, 0.006, 0.6 + i * 0.05, '#5a4030', [-0.75 + (i - 2) * 0.03, 1.2 + i * 0.02, (i % 2) * 0.02], [0, 0, (i - 2) * 0.18]);
        // livros de mesa
        m.box(0.32, 0.04, 0.24, '#24324f', [0.05, 0.705, 0]);
        m.box(0.3, 0.035, 0.22, '#c9b27c', [0.06, 0.742, 0], [0, 0.12, 0]);
        m.box(0.26, 0.03, 0.2, '#7a2f35', [0.05, 0.775, 0], [0, -0.08, 0]);
      });
      credD.build(SATIN(), own, { parent: leftG });

      // --- parede direita: estante embutida + porta + diplomas
      // (parede girada −90°: x local = z do mundo − centro)
      const zc = (Z0 + Z1) / 2;
      const right = solidWall(own, { parent: root, len: Z1 - Z0 + 0.14, h: H, pos: [X1 + 0.07, zc], rotY: -HP, holes: [{ a: 1.8 - 0.52 - zc, b: 1.8 + 0.52 - zc, top: 2.32 }] });
      walls.push({ obj: right, px: X1, pz: 0, normal: [-1, 0, 0] });
      const rg = M.group({ parent: root, name: 'parede-dir' });
      walls.push({ obj: rg, px: X1, pz: 0, normal: [-1, 0, 0] });
      const shelfX = X1 - 0.07 - 0.19, sz0 = -3.0, sz1 = -0.35;
      const sm = new Merger();
      sm.box(0.38, 2.75, 0.04, '#ffffff', [shelfX, 1.375, sz0]);
      sm.box(0.38, 2.75, 0.04, '#ffffff', [shelfX, 1.375, sz1]);
      sm.box(0.38, 2.75, 0.04, '#ffffff', [shelfX, 1.375, (sz0 + sz1) / 2]);
      sm.box(0.38, 0.04, sz1 - sz0, '#ffffff', [shelfX, 2.75, (sz0 + sz1) / 2]);
      // armário inferior fechado
      sm.box(0.4, 0.78, sz1 - sz0, '#ffffff', [shelfX + 0.01, 0.39, (sz0 + sz1) / 2]);
      const shelfYs = [1.2, 1.65, 2.1];
      shelfYs.forEach((y) => sm.box(0.36, 0.035, sz1 - sz0 - 0.04, '#ffffff', [shelfX, y, (sz0 + sz1) / 2]));
      sm.box(0.36, 0.035, sz1 - sz0 - 0.04, '#ffffff', [shelfX, 0.78, (sz0 + sz1) / 2]);
      // enchimento até a parede (estante embutida: sem fresta entre o móvel e a alvenaria)
      sm.box(0.072, 2.77, sz1 - sz0 + 0.04, '#5a3a24', [X1 - 0.036, 1.385, (sz0 + sz1) / 2]);
      sm.build(WOOD(), own, { parent: rg });
      const backPanel = new T.Mesh(M.planeGeo(sz1 - sz0, 2.75), stdMat('shelf-back', { color: '#3a2a20', rough: 0.8 }));
      backPanel.rotation.y = -HP; backPanel.position.set(X1 - 0.075, 1.375, (sz0 + sz1) / 2);
      backPanel.receiveShadow = true;
      rg.add(backPanel);
      // portas do armário (frisos) + puxadores
      const dm = new Merger();
      for (let i = 0; i < 6; i++) {
        const zz = sz0 + 0.02 + (i + 0.5) * ((sz1 - sz0 - 0.04) / 6);
        dm.box(0.006, 0.7, 0.004, '#1a0f08', [shelfX - 0.205, 0.39, zz + (sz1 - sz0 - 0.04) / 12]);
        dm.box(0.015, 0.012, 0.12, BRASS, [shelfX - 0.215, 0.68, zz]);
      }
      // LED sob as prateleiras
      dm.build(METAL(), own, { parent: rg });
      const ledMat = new T.MeshBasicMaterial({ color: col('#ffd59a'), toneMapped: false });
      own.add(ledMat);
      const led = new Merger();
      shelfYs.concat([2.73]).forEach((y) => { led.box(0.02, 0.008, (sz1 - sz0) / 2 - 0.1, '#ffffff', [shelfX - 0.12, y - 0.022, sz0 + (sz1 - sz0) * 0.25]); led.box(0.02, 0.008, (sz1 - sz0) / 2 - 0.1, '#ffffff', [shelfX - 0.12, y - 0.022, sz0 + (sz1 - sz0) * 0.75]); });
      const ledMesh = led.build(stdMat('vc-led', { vc: true, rough: 1, emissive: '#ffd59a', ei: 1 }), own, { parent: rg, cast: false });
      // livros e objetos
      const bayL = (sz1 - sz0 - 0.08) / 2;
      const bm2 = new Merger();
      [0.8, 1.22, 1.67, 2.12].forEach((y, row) => {
        [0, 1].forEach((bay) => {
          const z0 = sz0 + 0.04 + bay * (bayL + 0.02);
          const seg = row * 2 + bay;
          const len = seg === 2 || seg === 5 ? bayL * 0.45 : seg === 3 || seg === 6 ? 0 : bayL - 0.08;
          if (len > 0) bm2.at([shelfX - 0.02, y + 0.018, z0 + 0.02], -HP, (m) => books(m, 0, 0, 0, len, 0.24, 30 + seg, 0));
        });
      });
      bm2.build(MATTE(), own, { parent: rg });
      // prêmios (dourado) + cristal
      const aw = new Merger();
      const aw2 = new Merger();
      const zA = sz0 + 0.04 + bayL * 0.75, zB = sz0 + 0.06 + bayL * 1.5;
      aw.at([shelfX - 0.02, 1.235, zA], -HP, (m) => {
        // troféu taça
        m.cyl(0.05, 0.06, 0.05, '#1f1f22', [0, 0.025, 0]);
        m.cyl(0.012, 0.02, 0.12, BRASS, [0, 0.11, 0]);
        m.cyl(0.075, 0.035, 0.11, BRASS, [0, 0.22, 0], null, 18);
        m.tor(0.05, 0.01, BRASS, [0.08, 0.22, 0], [0, 0, HP]);
        m.tor(0.05, 0.01, BRASS, [-0.08, 0.22, 0], [0, 0, HP]);
      });
      aw.at([shelfX - 0.02, 1.685, zB - 0.25], -HP, (m) => {
        // placa (madeira escura + plaqueta dourada)
        m.box(0.24, 0.3, 0.02, '#2a1a10', [0, 0.15, -0.06], [-0.12, 0, 0]);
        m.box(0.18, 0.2, 0.004, BRASS, [0, 0.16, -0.047], [-0.12, 0, 0]);
      });
      aw.at([shelfX - 0.02, 2.135, zA + 0.1], -HP, (m) => {
        // estatueta + esfera
        m.box(0.08, 0.05, 0.08, '#1f1f22', [0, 0.025, 0]);
        m.sph(0.06, BRASS, [0, 0.11, 0]);
      });
      aw.at([shelfX - 0.02, 2.135, zB], -HP, (m) => { m.cyl(0.08, 0.06, 0.06, '#d9d4c8', [0.2, 0.03, 0], null, 18); });
      aw.build(METAL(), own, { parent: rg });
      aw2.at([shelfX - 0.02, 1.685, zA + 0.05], -HP, (m) => {
        m.box(0.09, 0.03, 0.09, '#1a1a1d', [0, 0.015, 0]);
        m.add(M.coneGeo(0.05, 0.26, 4), '#ffffff', [0, 0.16, 0], [0, PI / 4, 0]);
      });
      aw2.at([shelfX - 0.02, 1.235, zB], -HP, (m) => { m.box(0.16, 0.22, 0.03, '#ffffff', [0, 0.14, 0]); });
      aw2.build(CRYSTAL(), own, { parent: rg, cast: false });
      // objetos decorativos foscos (vasos, porta-retratos)
      const dec = new Merger();
      dec.at([shelfX - 0.02, 2.135, zA - 0.25], -HP, (m) => { m.cyl(0.06, 0.08, 0.24, '#2f5d62', [0, 0.12, 0], null, 18); m.sph(0.075, '#2f5d62', [0, 0.04, 0], [1, 0.5, 1]); });
      dec.at([shelfX - 0.02, 0.818, zB - 0.1], -HP, (m) => { m.cyl(0.12, 0.08, 0.1, '#e9e3d7', [0, 0.05, 0], null, 20); });
      dec.at([shelfX - 0.06, 1.685, zB + 0.18], -HP, (m) => { m.box(0.2, 0.15, 0.015, '#1b1b1e', [0, 0.08, 0], [-0.15, 0, 0]); m.box(0.17, 0.12, 0.004, '#c7b49a', [0, 0.082, 0.008], [-0.15, 0, 0]); });
      plant(dec, 'bonsai', [shelfX - 0.02, 0.818, zA - 0.12], 0.3, '#2d2f33', 8);
      dec.build(SATIN(), own, { parent: rg });
      // porta
      const doorZ = 1.8;
      const dr = new Merger();
      dr.box(0.06, 2.4, 0.08, '#ffffff', [X1 - 0.05, 1.2, doorZ - 0.54]);
      dr.box(0.06, 2.4, 0.08, '#ffffff', [X1 - 0.05, 1.2, doorZ + 0.54]);
      dr.box(0.06, 0.08, 1.16, '#ffffff', [X1 - 0.05, 2.36, doorZ]);
      dr.box(0.045, 2.3, 1.0, '#ffffff', [X1 - 0.02, 1.15, doorZ]);
      // frisos da porta (almofadas) — vincos escuros na face interna
      [0.2, 2.12].forEach((y) => dr.box(0.006, 0.012, 0.78, '#3a2414', [X1 - 0.044, y, doorZ]));
      [-0.39, 0.39].forEach((dz) => dr.box(0.006, 1.92, 0.012, '#3a2414', [X1 - 0.044, 1.16, doorZ + dz]));
      dr.box(0.006, 0.012, 0.78, '#3a2414', [X1 - 0.044, 1.3, doorZ]);
      dr.build(WOOD(), own, { parent: rg });
      const dh = new Merger();
      dh.box(0.04, 0.02, 0.02, BRASS, [X1 - 0.06, 1.05, doorZ - 0.38]);
      dh.box(0.015, 0.02, 0.14, BRASS, [X1 - 0.08, 1.05, doorZ - 0.33]);
      dh.cyl(0.03, 0.03, 0.008, BRASS, [X1 - 0.047, 1.05, doorZ - 0.38], [0, 0, HP]);
      dh.build(METAL(), own, { parent: rg });
      // diplomas: moldura fina + passe-partout + certificado em canvas (atlas com 3 documentos, legível de perto)
      const dipTex = ctex('diplomas3', 1536, 396, drawDiplomas, false);
      const dipFr = new Merger(), dipP = new Merger();
      [[0.15, 1.75, 0], [0.68, 1.75, 1], [0.415, 1.3, 2]].forEach((p) => {
        // (encostados na parede: face interna em x = X1)
        const fc = p[2] === 2 ? '#2a1a10' : '#16161a';
        dipFr.box(0.022, 0.37, 0.025, fc, [X1 - 0.013, p[1], p[0] - 0.2375]);
        dipFr.box(0.022, 0.37, 0.025, fc, [X1 - 0.013, p[1], p[0] + 0.2375]);
        dipFr.box(0.022, 0.025, 0.5, fc, [X1 - 0.013, p[1] + 0.1725, p[0]]);
        dipFr.box(0.022, 0.025, 0.5, fc, [X1 - 0.013, p[1] - 0.1725, p[0]]);
        dipFr.box(0.006, 0.32, 0.45, '#f4f0e6', [X1 - 0.006, p[1], p[0]]);                     // passe-partout
        dipFr.box(0.005, 0.275, 0.365, '#d9d2c2', [X1 - 0.009, p[1], p[0]]);                     // chanfro do passe-partout
        dipP.add(M.planeGeo(0.35, 0.262), '#ffffff', [X1 - 0.0135, p[1], p[0]], [0, -HP, 0], null, [p[2] / 3, 0, (p[2] + 1) / 3, 1]);
      });
      dipFr.build(SATIN(), own, { parent: rg });
      dipP.build(stdMat('diplomas', { map: dipTex, vc: true, rough: 0.6, env: 0.15 }), own, { parent: rg, cast: false });

      // --- parede da frente (quadro + bar)
      const front = solidWall(own, { parent: root, len: X1 - X0 + 0.28, h: H, pos: [0, Z1 + 0.07], rotY: PI });
      walls.push({ obj: front, px: 0, pz: Z1, normal: [0, 0, -1] });
      const fgw = M.group({ parent: root, name: 'parede-frente' });
      walls.push({ obj: fgw, px: 0, pz: Z1, normal: [0, 0, -1] });
      const artTex = ctex('art-office2', 1024, 640, (ctx, w, h) => {
        ctx.fillStyle = '#efe7da'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1f2c4a'; ctx.beginPath(); ctx.arc(w * 0.34, h * 0.55, h * 0.36, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#e0773f'; ctx.beginPath(); ctx.arc(w * 0.58, h * 0.42, h * 0.24, 0, PI * 2); ctx.fill();
        ctx.fillStyle = '#c9a25e'; ctx.fillRect(w * 0.1, h * 0.8, w * 0.8, 4);
        ctx.strokeStyle = '#2b2b2e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(w * 0.7, h * 0.12); ctx.bezierCurveTo(w * 0.9, h * 0.3, w * 0.6, h * 0.6, w * 0.85, h * 0.85); ctx.stroke();
        ctx.fillStyle = '#8fa89a'; ctx.fillRect(w * 0.72, h * 0.18, w * 0.12, h * 0.5);
        // pinceladas e trama da tela
        const ra = M.rng(44);
        for (let i = 0; i < 260; i++) { ctx.strokeStyle = 'rgba(' + (ra() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.03 + ra() * 0.05) + ')'; ctx.lineWidth = 2 + ra() * 6; const x = ra() * w, y = ra() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20 + ra() * 40, y + (ra() - 0.5) * 30, x + 40 + ra() * 80, y + (ra() - 0.5) * 20); ctx.stroke(); }
        ctx.fillStyle = 'rgba(0,0,0,0.035)'; for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1); for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
        noise(ctx, w, h, 0.02, 2);
      }, false);
      const art = new Merger();
      art.rbox(2.04, 1.28, 0.05, 0.01, '#1b1b1e', [0.5, 1.78, Z1 - 0.03]);
      art.build(SATIN(), own, { parent: fgw });
      const artP = new T.Mesh(M.planeGeo(1.96, 1.2), stdMat('art-office', { map: artTex, rough: 0.9 }));
      artP.rotation.y = PI; artP.position.set(0.5, 1.78, Z1 - 0.057);
      fgw.add(artP);
      // luminária de quadro (latão) — acende com as luzes da sala (tarde/noite)
      const picL = new Merger();
      picL.box(0.7, 0.035, 0.05, BRASS, [0.5, 2.5, Z1 - 0.16]);
      picL.box(0.03, 0.03, 0.13, BRASS, [0.5, 2.5, Z1 - 0.075]);
      picL.box(0.05, 0.09, 0.012, BRASS, [0.5, 2.5, Z1 - 0.006]);
      picL.build(METAL(), own, { parent: fgw });
      const picGlow = M.glow('#ffd9a0', 1.9, 0); own.add(picGlow.material); picGlow.position.set(0.5, 2.15, Z1 - 0.25); picGlow.scale.set(2.3, 1.1, 1); fgw.add(picGlow);
      const bar = new Merger();
      bar.rbox(1.8, 0.62, 0.45, 0.015, '#ffffff', [0.5, 0.48, Z1 - 0.3]);
      bar.build(WOOD(), own, { parent: fgw });
      const barM = new Merger();
      barM.box(1.6, 0.015, 0.3, BRASS, [0.5, 0.8, Z1 - 0.3]);
      [-1, 1].forEach((s) => { barM.box(0.02, 0.17, 0.02, BRASS, [0.5 + s * 0.85, 0.085, Z1 - 0.15]); barM.box(0.02, 0.17, 0.02, BRASS, [0.5 + s * 0.85, 0.085, Z1 - 0.45]); });
      barM.cyl(0.07, 0.06, 0.14, CHROME, [0.95, 0.865, Z1 - 0.3]);
      barM.build(METAL(), own, { parent: fgw });
      const barG = new Merger();
      barG.cyl(0.07, 0.08, 0.2, '#ffffff', [0.3, 0.91, Z1 - 0.3], null, 18);
      barG.sph(0.035, '#ffffff', [0.3, 1.05, Z1 - 0.3]);
      barG.cyl(0.035, 0.03, 0.08, '#ffffff', [0.5, 0.85, Z1 - 0.28]);
      barG.cyl(0.035, 0.03, 0.08, '#ffffff', [0.6, 0.85, Z1 - 0.34]);
      barG.build(CRYSTAL(), own, { parent: fgw, cast: false });
      const whisky = new Merger();
      whisky.cyl(0.062, 0.072, 0.1, '#b0601c', [0.3, 0.86, Z1 - 0.3], null, 18);
      whisky.build(stdMat('whisky', { color: '#ffffff', vc: true, rough: 0.15, opacity: 0.85 }), own, { parent: fgw, cast: false });

      // --- MESA DO CEO
      const DX = 0.3, DZ = -1.25;
      const desk = new Merger();
      desk.rbox(2.3, 0.065, 0.95, 0.02, '#ffffff', [DX, 0.7175, DZ], null, 3);
      // pedestal de gavetas (lado direito do CEO = −X)
      desk.rbox(0.5, 0.685, 0.86, 0.012, '#ffffff', [DX - 0.84, 0.3425, DZ]);
      // lateral "cascata" (lado esquerdo do CEO = +X)
      desk.rbox(0.06, 0.685, 0.95, 0.012, '#ffffff', [DX + 1.12, 0.3425, DZ]);
      // painel frontal (lado das visitas)
      desk.box(1.66, 0.5, 0.03, '#ffffff', [DX + 0.25, 0.43, DZ + 0.36]);
      desk.build(WOOD(), own, { parent: root });
      const deskM = new Merger();
      deskM.box(2.31, 0.008, 0.008, BRASS, [DX, 0.69, DZ + 0.476]);
      for (let i = 0; i < 3; i++) deskM.box(0.16, 0.012, 0.02, BRASS, [DX - 0.84, 0.18 + i * 0.22, DZ - 0.44]);
      for (let i = 0; i < 3; i++) deskM.box(0.48, 0.004, 0.004, '#1a0f08', [DX - 0.84, 0.29 + i * 0.22, DZ - 0.432]);
      // monitor (alumínio)
      const MX = DX + 0.62, MZ = DZ - 0.05;
      deskM.at([MX, 0.75, MZ], PI + 0.12, (m) => {
        m.box(0.22, 0.012, 0.16, '#b9bcc2', [0, 0.006, 0.02]);
        m.box(0.05, 0.3, 0.02, '#b9bcc2', [0, 0.16, -0.03]);
        m.rbox(0.64, 0.4, 0.03, 0.01, '#9a9da3', [0, 0.36, 0]);
        m.rbox(0.4, 0.26, 0.022, 0.01, '#8a8d93', [0, 0.35, -0.02]);              // carcaça traseira
        m.cyl(0.022, 0.022, 0.004, '#d6d9de', [0, 0.4, -0.032], [HP, 0, 0], 18);    // logotipo
        for (let i = 0; i < 5; i++) m.box(0.2, 0.005, 0.004, '#6f7277', [0, 0.27 + i * 0.012, -0.031]); // grade de ventilação
      });
      // teclado + mouse
      deskM.at([MX - 0.2, 0.75, DZ - 0.3], 0.05, (m) => {
        m.rbox(0.42, 0.014, 0.13, 0.005, '#c9ccd1', [0, 0.007, 0]);
        m.rbox(0.06, 0.02, 0.1, 0.01, '#c9ccd1', [0.3, 0.01, 0]);
      });
      // laptop (base)
      // laptop do CEO (aberto para a cadeira dele: o usuário fica no +Z local, então gira ~π)
      const LX = DX - 0.36, LZ = DZ - 0.2, LROT = PI - 0.38;
      deskM.at([LX, 0.75, LZ], LROT, (m) => {
        m.rbox(0.34, 0.014, 0.23, 0.006, '#a7aab0', [0, 0.007, 0]);
        m.box(0.3, 0.002, 0.12, '#2b2c30', [0, 0.0145, 0.02]);
      });
      // luminária de banqueiro (base + haste)
      deskM.at([DX - 0.9, 0.75, DZ + 0.22], 0.3, (m) => {
        m.rbox(0.22, 0.03, 0.12, 0.01, BRASS, [0, 0.015, 0]);
        m.cyl(0.008, 0.008, 0.32, BRASS, [0, 0.19, 0]);
        m.cyl(0.006, 0.006, 0.28, BRASS, [0, 0.35, 0], [0, 0, HP]);
      });
      deskM.build(METAL(), own, { parent: root });
      // cúpula verde da luminária (emissiva à noite)
      const bankShade = new T.MeshStandardMaterial({ color: col('#1f6a4a'), roughness: 0.25, metalness: 0.1, emissive: col('#46c28a'), emissiveIntensity: 0, side: T.DoubleSide });
      own.add(bankShade);
      const shadeG = M.group({ parent: root, pos: [DX - 0.9, 0.75, DZ + 0.22], rot: [0, 0.3, 0] });
      const bs = new T.Mesh(M.cylGeo(0.075, 0.075, 0.3, 20, true), bankShade);
      bs.rotation.z = HP; bs.scale.set(1, 1, 0.75); bs.position.set(0, 0.36, 0.02); bs.castShadow = true;
      shadeG.add(bs);
      const deskLight = new T.PointLight('#ffd08a', 0, 3.6, 2);
      deskLight.position.set(DX - 0.85, 1.05, DZ + 0.1);
      root.add(deskLight);
      const deskGlow = M.glow('#ffe2a8', 0.5, 0); own.add(deskGlow.material); deskGlow.position.set(DX - 0.9, 1.05, DZ + 0.2); root.add(deskGlow);
      // pequenos objetos (caneca, porta-canetas, celular, porta-retrato, placa)
      const sm2 = new Merger();
      sm2.cyl(0.042, 0.04, 0.1, '#f4f1ea', [DX + 0.1, 0.8, DZ - 0.32], null, 18);
      sm2.cyl(0.036, 0.036, 0.004, '#3a2014', [DX + 0.1, 0.848, DZ - 0.32], null, 18);
      sm2.tor(0.03, 0.008, '#f4f1ea', [DX + 0.15, 0.8, DZ - 0.32], [0, 0, 0]);
      sm2.cyl(0.035, 0.035, 0.1, '#1d1d20', [DX - 0.62, 0.8, DZ - 0.32], null, 14);
      for (let i = 0; i < 4; i++) sm2.cyl(0.004, 0.004, 0.14, ['#1b2233', '#c9a25e', '#7a2f35', '#1b2233'][i], [DX - 0.62 + (i - 1.5) * 0.012, 0.88, DZ - 0.32 + (i % 2) * 0.01], [0.1 * (i - 1.5), 0, 0.12 * (i - 1.5)]);
      sm2.rbox(0.075, 0.008, 0.15, 0.004, '#141416', [DX - 0.05, 0.754, DZ - 0.05], [0, 0.4, 0]);
      sm2.at([DX - 0.28, 0.75, DZ + 0.3], PI - 0.35, (m) => { m.box(0.23, 0.175, 0.014, '#3b2618', [0, 0.092, 0], [-0.18, 0, 0]); m.box(0.03, 0.15, 0.012, '#3b2618', [0, 0.072, -0.05], [0.4, 0, 0]); m.box(0.205, 0.15, 0.002, '#efe8da', [0, 0.092, 0.0078], [-0.18, 0, 0]); m.box(0.17, 0.12, 0.002, '#5a3c26', [0, 0.092, -0.0078], [-0.18, 0, 0]); });
      sm2.at([DX + 0.25, 0.75, DZ + 0.42], 0, (m) => { m.add(M.boxGeo(0.34, 0.06, 0.05), '#2a1a10', [0, 0.03, 0], [-0.35, 0, 0]); });
      sm2.build(SATIN(), own, { parent: root });
      // foto do porta-retrato (o filho/a filha aos 8 anos, de beca, na formatura do jardim)
      const photoTex = ctex('photo-beca', 320, 240, drawPhotoBeca, false);
      const photoM = new T.Mesh(M.planeGeo(0.172, 0.125), stdMat('photo-beca', { map: photoTex, rough: 0.35, env: 0.4 }));
      const photoG = M.group({ parent: root, pos: [DX - 0.28, 0.75, DZ + 0.3], rot: [0, PI - 0.35, 0] });
      const photoT = M.group({ parent: photoG, pos: [0, 0.092, 0.0108], rot: [-0.18, 0, 0] });
      photoT.add(photoM);
      const namePlate = M.textPanel(0.3, 0.04, { text: ['DIRETOR-PRESIDENTE'], color: '#e8cf98', bg: '#2a1a10', px: 64, weight: '800' });
      namePlate.material.toneMapped = true;
      namePlate.position.set(DX + 0.25, 0.783, DZ + 0.442); namePlate.rotation.x = -0.35;
      own.add(namePlate.material); own.add(namePlate.material.map);
      root.add(namePlate);
      // vapor do café
      const steamTex = ctex('steam', 64, 64, (ctx) => { const g2 = ctx.createRadialGradient(32, 32, 2, 32, 32, 30); g2.addColorStop(0, 'rgba(255,255,255,0.55)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, 64, 64); }, false);
      const steam = [];
      for (let i = 0; i < 3; i++) {
        const sMat = new T.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0.3 });
        own.add(sMat);
        const s = new T.Sprite(sMat); s.scale.setScalar(0.06); root.add(s); steam.push(s);
      }
      // telas do monitor e do laptop
      const mon = makeScreen(own, 0.615, 0.375, 1024, 624);
      const monG = M.group({ parent: root, pos: [MX, 0.75, MZ], rot: [0, PI + 0.12, 0] });
      mon.mesh.position.set(0, 0.36, 0.0165);
      monG.add(mon.mesh);
      const lap = makeScreen(own, 0.31, 0.2, 640, 412);
      const lapG = M.group({ parent: root, pos: [LX, 0.75, LZ], rot: [0, LROT, 0] });
      const lid = M.group({ parent: lapG, pos: [0, 0.014, -0.115], rot: [-0.32, 0, 0] });
      const lm2 = new Merger();
      lm2.rbox(0.34, 0.225, 0.008, 0.006, '#a7aab0', [0, 0.1125, -0.004]);
      lm2.build(METAL(), own, { parent: lid });
      lap.mesh.position.set(0, 0.114, 0.0015);
      lid.add(lap.mesh);
      // brilho das telas sobre o rosto (fake)
      const screenGlow = M.glow('#bcd4ff', 0.9, 0); own.add(screenGlow.material); screenGlow.position.set(MX - 0.1, 1.1, MZ - 0.25); root.add(screenGlow);

      // --- PILHA DE PAPÉIS (instanciada)
      const pEdge = stdMat('paper-edge', { map: paperEdgeTex(), rough: 0.9 });
      const pTop = stdMat('paper-top', { map: paperTopTex(), rough: 0.85 });
      // [x, z, nº de maços, inclinação, giro base]
      const PILES = [[DX + 0.97, DZ + 0.13, 44, 0.05, 0.12], [DX + 0.98, DZ - 0.26, 24, 0.035, -0.2], [DX - 0.68, DZ + 0.16, 10, 0.02, 0.5], [DX + 0.62, DZ + 0.3, 7, 0.01, -0.6]];
      const pileItems = [];
      const pr = M.rng(17);
      PILES.forEach((p, pi) => {
        let y = 0.75, dx = 0, dz = 0, lean = 0;
        for (let i = 0; i < p[2]; i++) {
          const folder = pr() > 0.84;
          const th = folder ? 0.012 : 0.014 + pr() * 0.012;
          lean += (pr() - 0.42) * p[3] * 0.25;
          dx += (pr() - 0.5) * 0.012 + lean * 0.035; dz += (pr() - 0.5) * 0.012;
          pileItems.push({ pile: pi, idx: i, n: p[2], x: p[0] + dx, z: p[1] + dz, y: y + th / 2, th, rot: p[4] + (pr() - 0.5) * 0.3, tilt: lean * 0.08, color: folder ? ['#d9b66e', '#5a7fb5', '#b5483e', '#5a8a5a', '#e8e1cf'][Math.floor(pr() * 5)] : (pr() > 0.5 ? '#ffffff' : '#f2eee4') });
          y += th;
        }
      });
      const paperGeo = M.boxGeo(0.215, 1, 0.3);
      const papers = new T.InstancedMesh(paperGeo, [pEdge, pEdge, pTop, pEdge, pEdge, pEdge], pileItems.length);
      papers.castShadow = true; papers.receiveShadow = true;
      own.add(papers);
      root.add(papers);
      const _o = new T.Object3D();
      pileItems.forEach((it, i) => {
        _o.position.set(it.x, it.y, it.z); _o.rotation.set(0, it.rot, it.tilt); _o.scale.set(1, it.th, 1); _o.updateMatrix();
        papers.setMatrixAt(i, _o.matrix);
        papers.setColorAt(i, col(it.color));
      });
      // ordena por pilha e altura para "count"
      const setPapers = (v) => {
        v = clamp(v == null ? 0.6 : +v || 0, 0, 1);
        let k = 0;
        pileItems.forEach((it) => {
          const vis = it.idx < Math.round(it.n * v);
          _o.position.set(it.x, vis ? it.y : -5, it.z); _o.rotation.set(0, it.rot, it.tilt); _o.scale.set(1, vis ? it.th : 0.0001, 1); _o.updateMatrix();
          papers.setMatrixAt(k++, _o.matrix);
        });
        papers.instanceMatrix.needsUpdate = true;
      };

      // --- cadeiras
      execChair(own, root, [DX, -2.22], 0, '#2c2522');
      guestChair(own, root, [-0.25, -0.3], PI);
      guestChair(own, root, [0.85, -0.3], PI);

      // --- aparador atrás do CEO (junto ao vidro)
      const cb = new Merger();
      cb.rbox(2.4, 0.52, 0.42, 0.015, '#ffffff', [DX, 0.3, -2.98]);
      cb.build(WOOD(), own, { parent: root });
      const cbD = new Merger();
      cbD.box(2.3, 0.03, 0.4, '#1d1d20', [DX, 0.025, -2.98]);
      cbD.at([DX - 0.6, 0.56, -2.98], 0.15, (m) => { m.box(0.26, 0.2, 0.015, '#1b1b1e', [0, 0.1, 0], [-0.12, 0, 0]); m.box(0.22, 0.16, 0.004, '#d8c7a8', [0, 0.1, 0.009], [-0.12, 0, 0]); });
      cbD.at([DX + 0.75, 0.56, -2.98], -0.2, (m) => { m.box(0.3, 0.05, 0.22, '#24324f'); m.box(0.28, 0.04, 0.2, '#e8e0cf', [0, 0.045, 0]); });
      plant(cbD, 'bonsai', [DX + 0.15, 0.56, -2.98], 0.3, '#3a3d42', 4);
      cbD.build(SATIN(), own, { parent: root });

      // --- canto do sofá
      const sofaX = X0 + 0.5, sofaZ = 1.75;
      const so = new Merger();
      so.at([sofaX, 0, sofaZ], HP, (m) => {
        m.rbox(2.0, 0.22, 0.86, 0.06, '#2f5d62', [0, 0.22, 0]);
        m.rbox(0.96, 0.14, 0.62, 0.06, '#356a6f', [-0.49, 0.38, 0.1]);
        m.rbox(0.96, 0.14, 0.62, 0.06, '#356a6f', [0.49, 0.38, 0.1]);
        m.rbox(1.94, 0.46, 0.2, 0.08, '#2f5d62', [0, 0.56, -0.33], [-0.1, 0, 0]);
        m.rbox(0.92, 0.36, 0.16, 0.08, '#3a7378', [-0.48, 0.6, -0.2], [-0.15, 0, 0]);
        m.rbox(0.92, 0.36, 0.16, 0.08, '#3a7378', [0.48, 0.6, -0.2], [-0.15, 0, 0]);
        m.rbox(0.16, 0.5, 0.86, 0.07, '#2f5d62', [-1.04, 0.36, 0]);
        m.rbox(0.16, 0.5, 0.86, 0.07, '#2f5d62', [1.04, 0.36, 0]);
        m.rbox(0.36, 0.34, 0.12, 0.06, '#e0a35a', [0.7, 0.58, -0.12], [-0.2, 0.25, 0.1]);
      });
      so.build(FABRIC(), own, { parent: root });
      const soL = new Merger();
      soL.at([sofaX, 0, sofaZ], HP, (m) => { [[-0.95, 0.35], [0.95, 0.35], [-0.95, -0.35], [0.95, -0.35]].forEach((p) => m.cyl(0.02, 0.015, 0.12, BRASS, [p[0], 0.06, p[1]])); });
      // mesa de centro (base dourada)
      soL.cyl(0.05, 0.12, 0.36, BRASS, [X0 + 1.55, 0.18, sofaZ], null, 20);
      soL.build(METAL(), own, { parent: root });
      const ct = new Merger();
      ct.cyl(0.46, 0.46, 0.04, '#ece7df', [X0 + 1.55, 0.4, sofaZ], null, 32);
      ct.build(GLOSS(), own, { parent: root });
      const ctd = new Merger();
      ctd.box(0.3, 0.04, 0.22, '#24324f', [X0 + 1.45, 0.44, sofaZ + 0.1], [0, 0.3, 0]);
      ctd.box(0.28, 0.035, 0.2, '#c9b27c', [X0 + 1.46, 0.477, sofaZ + 0.1], [0, 0.1, 0]);
      ctd.cyl(0.06, 0.05, 0.12, '#e0773f', [X0 + 1.7, 0.48, sofaZ - 0.12], null, 16);
      plant(ctd, 'bonsai', [X0 + 1.7, 0.42, sofaZ - 0.12], 0.2, '#e0773f', 12);
      plant(ctd, 'figueira', [X0 + 0.42, 0, -2.88], 1.55, '#2d2f33', 3);
      plant(ctd, 'espada', [X1 - 0.38, 0, 0.95], 0.8, '#d8d2c6', 6);
      ctd.build(SATIN(), own, { parent: root });
      const lamp = floorLamp(own, root, [X0 + 0.42, 0.45], 1.1);

      // ================= parâmetros
      let curTime = null, curScreen = null, curLaptop = null, curTv = null, chatState = { phase: 0 };
      function laptopModeFor(p) {
        if (p.laptop) return p.laptop;
        const s = p.screen || 'on';
        if (s === 'off') return 'off';
        if (s === 'chat') return 'email';
        if (s === 'doc' || s === 'planilha') return 'chat';
        return 'agenda';
      }
      function setTime(tm) {
        if (!OFFICE_LIGHT[tm]) tm = 'dia';
        if (tm === curTime) return;
        curTime = tm;
        const P = OFFICE_LIGHT[tm];
        L.set(P);
        city.setTime(tm);
        const k = P.lamps;
        lamp.set(k);
        ceiling.set(tm === 'noite' ? 1 : tm === 'tarde' ? 0.75 : 0.3);
        deskLight.intensity = 1.1 * k;
        bankShade.emissiveIntensity = 0.55 * k;
        deskGlow.material.opacity = 0.45 * k;
        picGlow.material.opacity = 0.22 * k;
        ledMesh.material = stdMat('vc-led-' + tm, { vc: true, rough: 1, emissive: '#ffd59a', ei: P.shelf });
        const e = envMap('office-' + tm, OFFICE_ENV[tm]);
        if (e) applyEnv(root, e, tm === 'noite' ? 0.6 : 1);
        screenGlow.material.opacity = tm === 'noite' ? 0.35 : tm === 'tarde' ? 0.15 : 0;
      }
      function setScreens(p) {
        const s = p.screen || 'on';
        const chatKey = JSON.stringify(p.chat || null) + (p.typing === false ? 'nt' : '');
        mon.draw(s + '|' + chatKey, (ctx, w, h) => drawScreen(s, ctx, w, h, { chat: p.chat, typing: p.typing, phase: chatState.phase }));
        curScreen = s;
        const lm = laptopModeFor(p);
        lap.draw(lm + '|' + chatKey, (ctx, w, h) => drawScreen(lm, ctx, w, h, { chat: p.chat, typing: p.typing, phase: chatState.phase }));
        curLaptop = lm;
        const tvv = p.tv;
        const tk = JSON.stringify(tvv == null ? null : tvv);
        tv.draw(tk, (ctx, w, h) => {
          if (!tvv) drawOff(ctx, w, h);
          else if (tvv === true || tvv === 'painel') drawPainel(ctx, w, h);
          else drawSlide(ctx, w, h, tvv, { chart: true });
        });
        curTv = tvv;
      }
      let lastParams = params0 || {};
      const env = {
        root,
        background: '#9fb2c4',
        fog: { color: '#c3d6e6', near: 24, far: 115 },
        walls,
        spots: {
          mesa: { x: DX, z: -2.22, rot: 0 },
          visita1: { x: -0.25, z: -0.3, rot: PI },
          visita2: { x: 0.85, z: -0.3, rot: PI },
          sofa: { x: X0 + 0.62, z: sofaZ - 0.45, rot: HP },
          sofa2: { x: X0 + 0.62, z: sofaZ + 0.45, rot: HP },
          porta: { x: X1 - 0.6, z: doorZ, rot: -HP },
          janela: { x: -2.3, z: -2.7, rot: PI },
          tv: { x: X0 + 0.85, z: 0.25, rot: 1.75 },
          pe1: { x: -1.2, z: 0.9, rot: 0.25 },
          pe2: { x: 1.7, z: 0.9, rot: -0.3 },
          pe3: { x: 0.35, z: 1.5, rot: 0 },
          centro: { x: 0.35, z: 0.9, rot: 0 },
          // primeira pessoa: início + pontos de interação (rot = olhando para o objeto)
          inicio: { x: 3.45, z: 1.65, rot: -2.25 },
          notebook: { x: DX, z: -2.22, rot: 0 },
          foto: { x: -0.25, z: -2.12, rot: 0.2 },
          estante: { x: 3.05, z: -1.55, rot: HP },
          premios: { x: 3.05, z: -1.55, rot: HP },
          cafe: { x: 0.5, z: 2.12, rot: 0 },
          quadro: { x: 0.5, z: 1.7, rot: 0 },
          ver_tv: { x: -2.35, z: -1.1, rot: -HP },
          vista: { x: 2.4, z: -2.6, rot: PI + 0.25 },
        },
        // colisão (primeira pessoa): retângulos no chão + limites do piso andável
        bounds: { minX: X0, maxX: X1, minZ: Z0 + 0.32, maxZ: Z1 },
        colliders: [
          { x: DX, z: DZ, w: 2.32, d: 0.97 },                 // mesa do CEO
          { x: DX, z: -2.98, w: 2.42, d: 0.46 },              // aparador atrás do CEO (junto ao vidro)
          { x: -0.25, z: -0.3, w: 0.64, d: 0.6 },             // poltrona de visita 1
          { x: 0.85, z: -0.3, w: 0.64, d: 0.6 },              // poltrona de visita 2
          { x: X0 + 0.3, z: -1.1, w: 0.52, d: 2.24 },         // aparador sob a TV
          { x: sofaX, z: sofaZ, w: 0.92, d: 2.12 },           // sofá
          { x: X0 + 1.55, z: sofaZ, w: 0.94, d: 0.94 },       // mesa de centro
          { x: X0 + 0.42, z: 0.45, w: 0.4, d: 0.4 },          // luminária de piso
          { x: X0 + 0.42, z: -2.88, w: 0.52, d: 0.52 },       // figueira (canto)
          { x: X1 - 0.38, z: 0.95, w: 0.46, d: 0.46 },        // espada-de-são-jorge
          { x: X1 - 0.27, z: -1.675, w: 0.54, d: 2.72 },      // estante embutida
          { x: 0.5, z: Z1 - 0.28, w: 1.86, d: 0.56 },         // bar / aparador da frente
        ],
        shots: {
          geral: { target: [0.1, 1.0, -0.5], yaw: 0.32, pitch: 0.3, dist: 11.2, fov: 40 },
          mesa: { target: [DX, 1.02, -1.75], yaw: 0.12, pitch: 0.1, dist: 3.9, fov: 36 },
          tela: { target: [MX - 0.02, 1.05, MZ], yaw: -2.85, pitch: 0.36, dist: 1.45, fov: 40 },
          tv: { target: [X0 + 0.2, 1.5, -1.0], yaw: 1.3, pitch: 0.08, dist: 4.2, fov: 38 },
          janela: { target: [-2.0, 1.45, -3.0], yaw: 0.35, pitch: 0.06, dist: 4.4, fov: 40 },
          sofa: { target: [X0 + 0.9, 0.9, sofaZ], yaw: 1.15, pitch: 0.16, dist: 3.8, fov: 38 },
          porta: { target: [X1 - 0.6, 1.2, doorZ], yaw: -1.05, pitch: 0.1, dist: 4.4, fov: 38 },
          poder: { target: [DX, 1.22, -2.12], yaw: 0, pitch: -0.2, dist: 1.95, fov: 36 },
        },
        defaultShot: 'geral',
        setParams(p) {
          p = p || {};
          lastParams = p;
          setTime(p.time || 'dia');
          city.applyFog();
          setScreens(p);
          setPapers(p.papers);
        },
        update(t, p, dt) {
          city.update(t);
          // vapor
          steam.forEach((s, i) => {
            const k = ((t * 0.35 + i / 3) % 1);
            s.position.set(DX + 0.1 + Math.sin(t * 1.3 + i * 2) * 0.012 * k, 0.86 + k * 0.22, DZ - 0.32);
            s.material.opacity = 0.32 * Math.sin(k * PI) * (curTime === 'noite' ? 0.6 : 1);
            s.scale.setScalar(0.04 + k * 0.08);
          });
          // "digitando…" anima a ~5 quadros/s
          const pp = p || lastParams;
          if ((curScreen === 'chat' || curLaptop === 'chat') && pp.typing !== false) {
            const ph = Math.floor(t * 5) / 5;
            if (ph !== chatState.phase) {
              chatState.phase = ph % 1;
              const st = { chat: pp.chat, typing: pp.typing, phase: chatState.phase };
              if (curScreen === 'chat') mon.draw(null, (ctx, w, h) => drawScreen('chat', ctx, w, h, st));
              if (curLaptop === 'chat') lap.draw(null, (ctx, w, h) => drawScreen('chat', ctx, w, h, st));
              mon.key = null; lap.key = null;
            }
          }
          if (curTime === 'noite') lamp.set(OFFICE_LIGHT.noite.lamps * (0.97 + 0.03 * Math.sin(t * 7.1)));
        },
        dispose() { own.dispose(); },
      };
      void curTv;
      env.setParams(params0 || {});
      return env;
    },
  };

  // ====================================================================
  // SALA DE REUNIÃO (conselho)
  // ====================================================================
  const BOARD_LIGHT = {
    dia: { sky: '#e2ecff', ground: '#8f7a66', hemi: 0.78, sun: '#ffefd6', sunI: 2.3, sunPos: [-5, 9.5, -9], amb: 0.12, lamps: 0.35 },
    tarde: { sky: '#ffcfaa', ground: '#6a4652', hemi: 0.6, sun: '#ff9446', sunI: 2.9, sunPos: [9, 2.9, -10], amb: 0.1, lamps: 0.8 },
    noite: { sky: '#4a5aa0', ground: '#2a2230', hemi: 0.32, sun: '#93a6ff', sunI: 0.3, sunPos: [-5, 9, -8], amb: 0.08, lamps: 1.25 },
  };
  const BOARD_TOWERS = [
    [PI + 0.2, 44, 12, 12, -22, 'vidro'], [PI - 0.35, 48, 13, 12, -18, 'concreto'],
    [PI + 0.05, 62, 14, 14, -6, 'escuro'], [PI + 0.55, 60, 12, 14, -10, 'concreto'], [PI - 0.7, 60, 12, 10, -4, 'vidro'], [PI + 0.95, 68, 11, 11, 0, 'escuro'],
    [PI - 0.15, 84, 14, 14, 14, 'vidro'], [PI + 0.35, 86, 16, 14, 9, 'concreto'], [PI - 0.5, 82, 12, 12, 6, 'escuro'], [PI + 0.75, 84, 12, 12, 11, 'vidro'],
    [PI - 1.0, 80, 14, 12, 8, 'concreto'], [HP + 0.4, 78, 12, 12, -8, 'escuro'], [HP + 0.9, 84, 14, 12, 9, 'vidro'],
    [-HP - 0.4, 80, 12, 14, -6, 'vidro'], [-HP - 0.95, 84, 12, 12, 12, 'concreto'], [0.1, 80, 14, 12, -4, 'escuro'], [-0.6, 84, 12, 12, 7, 'concreto'], [0.7, 86, 12, 14, 10, 'vidro'],
  ];
  function parseClock(c) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(c || '14:00'));
    if (!m) return 14 * 60;
    return (+m[1]) * 60 + (+m[2]);
  }
  /** Cadeira de reunião (encosto médio, couro, base estrela). */
  function meetChair(mgL, mgM, pos, rotY, high) {
    mgL.at([pos[0], 0, pos[1]], rotY, (m) => {
      m.rbox(0.52, 0.1, 0.5, 0.045, '#25262b', [0, 0.41, 0.02]);
      m.rbox(0.5, high ? 0.78 : 0.56, 0.1, 0.045, '#25262b', [0, high ? 0.93 : 0.8, -0.25], [-0.12, 0, 0]);
      for (let i = 0; i < 3; i++) m.box(0.46, 0.006, 0.008, '#121316', [0, 0.66 + i * 0.12, -0.192 - i * 0.015], [-0.12, 0, 0]);
      [-1, 1].forEach((s) => m.rbox(0.05, 0.035, 0.3, 0.015, '#25262b', [s * 0.28, 0.63, -0.01]));
    });
    mgM.at([pos[0], 0, pos[1]], rotY, (m) => {
      [-1, 1].forEach((s) => m.box(0.022, 0.19, 0.03, CHROME, [s * 0.28, 0.52, -0.06]));
      m.cyl(0.024, 0.024, 0.26, CHROME, [0, 0.22, 0]);
      for (let i = 0; i < 5; i++) {
        const a = i * PI * 2 / 5 + 0.3;
        m.box(0.035, 0.025, 0.28, CHROME, [Math.sin(a) * 0.14, 0.07, Math.cos(a) * 0.14], [0, a, 0]);
        m.sph(0.026, BLACKM, [Math.sin(a) * 0.27, 0.028, Math.cos(a) * 0.27]);
      }
    });
  }
  function drawClockFace(ctx, w, h) {
    ctx.fillStyle = '#f7f4ee'; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#1d1e22';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * PI * 2, big = i % 5 === 0;
      ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(a);
      ctx.fillRect(-(big ? 4 : 1.5), -w * 0.46, big ? 8 : 3, big ? w * 0.08 : w * 0.03);
      ctx.restore();
    }
    font(ctx, w * 0.11, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    [['12', 0], ['3', 3], ['6', 6], ['9', 9]].forEach((n) => { const a = n[1] / 12 * PI * 2; ctx.fillText(n[0], w / 2 + Math.sin(a) * w * 0.3, h / 2 - Math.cos(a) * w * 0.3); });
    font(ctx, w * 0.04, 700); ctx.fillStyle = '#9a9690'; ctx.fillText('SÃO PAULO', w / 2, h * 0.66);
  }

  P2.envs.sala_reuniao = {
    name: 'Sala do conselho',
    build(params0) {
      const own = new Owner();
      const root = new T.Group();
      root.name = 'env:sala_reuniao';
      const X0 = -4.3, X1 = 4.3, Z0 = -3.1, Z1 = 3.1, H = 3.1;
      const L = M.lighting('dia', { area: 7.5 });
      root.add(L.group);
      L.sun.shadow.camera.far = 50;
      const city = buildCity(root, own, { seed: 57, sunDir: [0.62, 0.14, -1], horizonY: -7, body: { w: 9.1, d: 8.0, top: -0.33, z: 0.45 }, towers: BOARD_TOWERS });
      const ceilMat = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: T.DoubleSide });
      own.add(ceilMat);
      const ceil = new T.Mesh(M.planeGeo(X1 - X0 + 0.3, Z1 - Z0 + 0.3), ceilMat);
      ceil.rotation.x = HP; ceil.position.set(0, H + 0.02, 0);
      ceil.castShadow = true;
      root.add(ceil);
      // piso (porcelanato) + corredor
      floorSlab(own, root, { x0: X0 - 0.07, x1: X1 + 0.07, z0: Z0 - 0.08, z1: Z1 + 1.35, tex: tileTex(), key: 'tile-board', tile: 2.4, rough: 0.35, margin: 0.12 });
      const rugM = new T.MeshStandardMaterial({ map: rugTex('board', '#2e3440', '#252a34', '#8c7a5c'), roughness: 0.95 });
      own.add(rugM);
      const rug = new T.Mesh(M.boxGeo(6.4, 0.012, 3.7), rugM);
      rug.position.set(0, 0.007, 0); rug.receiveShadow = true; rug.castShadow = false;
      root.add(rug);
      const walls = [];
      // vidro do fundo (cidade)
      const back = curtainWall(own, { parent: root, len: X1 - X0, h: H, z: Z0, panes: 6, shades: [[4, 0.22], [5, 0.22]] });
      walls.push({ obj: back, px: 0, pz: Z0, normal: [0, 0, 1] });
      // teto: forro com sanca (caixão sobre a mesa) + embutidos; continua sobre o corredor
      const CZ1 = Z1 + 1.35;
      const ceiling = buildCeiling(own, root, {
        x0: X0, x1: X1, z0: Z0, z1: CZ1, h: H,
        soffit: { x0: -3.05, x1: 3.05, z0: -1.75, z1: 1.75, band: 0.42, drop: 0.16 },
        lights: [[-2.8, -1.53, H - 0.16], [-1.4, -1.53, H - 0.16], [0, -1.53, H - 0.16], [1.4, -1.53, H - 0.16], [2.8, -1.53, H - 0.16],
          [-2.8, 1.53, H - 0.16], [-1.4, 1.53, H - 0.16], [0, 1.53, H - 0.16], [1.4, 1.53, H - 0.16], [2.8, 1.53, H - 0.16],
          [-3.75, -1.0], [-3.75, 1.0], [3.75, -0.3], [-2.4, Z1 + 0.7], [0, Z1 + 0.7], [2.4, Z1 + 0.7]],
        slots: [[X0 + 0.5, Z0 + 0.45, X1 - 0.5]],
      });
      walls.push({ obj: ceiling.group, px: 0, py: H, pz: 0, normal: [0, -1, 0] });
      // parede do fundo do corredor (painel de madeira + quadro + porta do elevador)
      const corW = solidWall(own, { parent: root, len: X1 - X0 + 0.28, h: H, pos: [0, CZ1 + 0.07], rotY: PI, color: '#e6ded1' });
      walls.push({ obj: corW, px: 0, pz: CZ1, normal: [0, 0, -1] });
      const corG = M.group({ parent: root, name: 'corredor' });
      walls.push({ obj: corG, px: 0, pz: CZ1, normal: [0, 0, -1] });
      const corSlat = new T.Mesh(M.planeGeo(3.2, H - 0.02), new T.MeshStandardMaterial({ map: texRepeat(slatTex(), 'slat-cor', 3.2 / 0.48, 1), roughness: 0.6 }));
      own.add(corSlat.material);
      corSlat.rotation.y = PI; corSlat.position.set(-1.6, H / 2, CZ1 - 0.005); corSlat.receiveShadow = true;
      corG.add(corSlat);
      const corA = new Merger();
      // logotipo da empresa em latão sobre o ripado
      corA.box(0.62, 0.018, 0.02, BRASS, [-1.6, 1.8, CZ1 - 0.03]);
      corA.tor(0.17, 0.011, BRASS, [-1.6, 2.06, CZ1 - 0.03]);
      corA.cyl(0.075, 0.075, 0.02, BRASS, [-1.555, 2.1, CZ1 - 0.03], [HP, 0, 0], 28);
      corA.box(0.34, 0.012, 0.02, BRASS, [-1.6, 1.97, CZ1 - 0.03]);
      // porta dupla de elevador (inox) + batente
      corA.box(1.3, 2.3, 0.04, '#9aa0a8', [2.3, 1.15, CZ1 - 0.02]);
      corA.box(0.008, 2.28, 0.045, '#5a5e66', [2.3, 1.14, CZ1 - 0.025]);
      corA.box(1.46, 0.08, 0.06, '#3a3b40', [2.3, 2.34, CZ1 - 0.03]);
      corA.box(0.08, 2.38, 0.06, '#3a3b40', [1.58, 1.19, CZ1 - 0.03]);
      corA.box(0.08, 2.38, 0.06, '#3a3b40', [3.02, 1.19, CZ1 - 0.03]);
      corA.box(0.08, 0.16, 0.02, '#2a2b30', [3.3, 1.15, CZ1 - 0.015]);
      corA.build(METAL(), own, { parent: corG });
      // gravura abstrata (pôr do sol sobre a cidade) entre o ripado e o elevador — é o que se vê do ponto 'corredor'
      const corArtTex = ctex('art-board', 768, 512, (ctx, w, h) => {
        const g2 = ctx.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, '#f2e6d4'); g2.addColorStop(0.55, '#f0c9a0'); g2.addColorStop(1, '#e0896a');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e8763f'; ctx.beginPath(); ctx.arc(w * 0.68, h * 0.5, h * 0.17, 0, PI * 2); ctx.fill();
        const rA = M.rng(77);
        [['#2b3a55', 0.62], ['#3d4d6a', 0.7], ['#1f2a40', 0.8]].forEach((ly) => {
          ctx.fillStyle = ly[0]; let x = 0;
          while (x < w) { const bw = 30 + rA() * 70, bh = h * (0.12 + rA() * 0.3); ctx.fillRect(x, h * ly[1] - bh + h * 0.2, bw, h); x += bw + rA() * 8; }
        });
        ctx.fillStyle = 'rgba(0,0,0,0.04)'; for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
        noise(ctx, w, h, 0.02, 78);
      }, false);
      const corArt = new Merger();
      corArt.box(1.16, 0.8, 0.04, '#1b1b1e', [0.78, 1.66, CZ1 - 0.025]);
      corArt.box(0.5, 0.025, 0.06, BRASS, [0.78, 2.12, CZ1 - 0.05]);
      corArt.build(SATIN(), own, { parent: corG });
      const corArtP = new T.Mesh(M.planeGeo(1.06, 0.7), stdMat('art-board', { map: corArtTex, rough: 0.85 }));
      corArtP.rotation.y = PI; corArtP.position.set(0.78, 1.66, CZ1 - 0.047);
      corG.add(corArtP);
      const callBtn = M.sphere(0.012, M.basic('#ffcf8a'), { parent: corG, pos: [3.3, 1.18, CZ1 - 0.03], cast: false });
      void callBtn;
      // vidro da frente (corredor) com faixa jateada e porta
      // 7 vãos: nenhum montante fica bem na frente do ponto 'corredor' (x 1,2) nem da porta (x≈3,35)
      const frontG = curtainWall(own, { parent: root, len: X1 - X0, h: H, z: Z1, rotY: PI, panes: 7, convector: false, frame: '#3a3a3e' });
      walls.push({ obj: frontG, px: 0, pz: Z1, normal: [0, 0, -1] });
      // faixa jateada (película de segurança): fosca, com dois filetes transparentes e o logotipo vazado
      const frostTex = ctex('frost2', 1024, 128, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, h * 0.1, w, 3); ctx.fillRect(0, h * 0.88, w, 3);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(w / 2, h * 0.49, h * 0.22, 0, PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(w / 2 + h * 0.03, h * 0.47, h * 0.09, 0, PI * 2); ctx.fill();
        ctx.fillRect(w / 2 + h * 0.36, h * 0.44, w * 0.12, 6);
        ctx.fillRect(w / 2 - h * 0.36 - w * 0.12, h * 0.44, w * 0.12, 6);
        ctx.globalCompositeOperation = 'source-over';
      });
      const frost = new T.Mesh(M.planeGeo(X1 - X0 - 0.1, 0.42), stdMat('frost2', { map: texRepeat(frostTex, 'frost-c7', 7, 1), rough: 0.6, opacity: 0.8, depthWrite: false }));
      frost.position.set(0, 1.35, -0.01); frost.rotation.y = 0;
      frost.renderOrder = 3;
      frontG.add(frost);
      const doorH = new Merger();
      doorH.box(0.03, 1.2, 0.03, BRASS, [-(X1 - 0.95), 1.1, -0.05]);
      doorH.box(0.03, 0.03, 0.06, BRASS, [-(X1 - 0.95), 1.62, -0.03]);
      doorH.box(0.03, 0.03, 0.06, BRASS, [-(X1 - 0.95), 0.58, -0.03]);
      doorH.build(METAL(), own, { parent: frontG });
      // parede da tela (esquerda): ripado + telão + console
      const left = solidWall(own, { parent: root, len: CZ1 - Z0 + 0.14, h: H, pos: [X0 - 0.07, (Z0 + CZ1) / 2], rotY: HP });
      walls.push({ obj: left, px: X0, pz: 0, normal: [1, 0, 0] });
      const lg = M.group({ parent: root, name: 'parede-tela' });
      walls.push({ obj: lg, px: X0, pz: 0, normal: [1, 0, 0] });
      const slatM = new T.MeshStandardMaterial({ map: texRepeat(slatTex(), 'slat-board', 6.2 / 0.48, 1), roughness: 0.6 });
      own.add(slatM);
      const slat = new T.Mesh(M.planeGeo(6.2, H - 0.02), slatM);
      slat.rotation.y = HP; slat.position.set(X0 + 0.005, H / 2, 0); slat.receiveShadow = true;
      lg.add(slat);
      const scr = new Merger();
      scr.at([X0 + 0.06, 0, 0], HP, (m) => {
        m.rbox(2.72, 1.56, 0.06, 0.015, '#111215', [0, 1.6, 0]);
        m.rbox(1.1, 0.07, 0.08, 0.02, '#1b1c20', [0, 0.73, 0.02]);
        m.rbox(0.22, 0.05, 0.06, 0.02, '#1b1c20', [0, 2.415, 0.01]);
      });
      scr.build(GLOSS(), own, { parent: lg });
      const camLens = M.sphere(0.012, M.mat('#3a5a9a', { rough: 0.1, emissive: '#2a4a8a', emissiveIntensity: 0.5 }), { parent: lg, pos: [X0 + 0.1, 2.415, 0], cast: false });
      void camLens;
      const screen = makeScreen(own, 2.64, 1.485, 1280, 720);
      screen.mesh.position.set(X0 + 0.095, 1.6, 0); screen.mesh.rotation.y = HP;
      lg.add(screen.mesh);
      const scGlow = M.glow('#9fb8ff', 3.2, 0.0); own.add(scGlow.material); scGlow.position.set(X0 + 0.5, 1.6, 0); lg.add(scGlow);
      const cons = new Merger();
      cons.at([X0 + 0.3, 0, 0], HP, (m) => { m.rbox(2.8, 0.5, 0.42, 0.015, '#ffffff', [0, 0.25, 0]); });
      cons.build(WOOD(), own, { parent: lg });
      const consD = new Merger();
      plant(consD, 'bonsai', [X0 + 0.3, 0.5, -1.0], 0.3, '#e9e3d7', 21);
      consD.cyl(0.13, 0.08, 0.07, '#1f2328', [X0 + 0.3, 0.535, 0.45], null, 22);          // fruteira baixa
      [0, 1, 2].forEach((i) => consD.sph(0.035, ['#e0773f', '#c9a25e', '#7a9a4a'][i], [X0 + 0.3 + (i - 1) * 0.04, 0.585, 0.45 + (i % 2) * 0.03]));
      consD.at([X0 + 0.3, 0.5, 0.9], HP, (m) => { m.box(0.3, 0.04, 0.22, '#7a2f35'); m.box(0.28, 0.035, 0.2, '#d8cdb6', [0, 0.037, 0], [0, 0.1, 0]); });
      consD.build(SATIN(), own, { parent: lg });
      // parede do relógio (direita): aparador com café + relógio + quadros
      const right = solidWall(own, { parent: root, len: CZ1 - Z0 + 0.14, h: H, pos: [X1 + 0.07, (Z0 + CZ1) / 2], rotY: -HP, color: '#e2d9cb' });
      walls.push({ obj: right, px: X1, pz: 0, normal: [-1, 0, 0] });
      const rg = M.group({ parent: root, name: 'parede-relogio' });
      walls.push({ obj: rg, px: X1, pz: 0, normal: [-1, 0, 0] });
      const sb = new Merger();
      sb.at([X1 - 0.29, 0, -0.3], -HP, (m) => { m.rbox(2.2, 0.72, 0.44, 0.015, '#ffffff', [0, 0.46, 0]); });
      sb.build(WOOD(), own, { parent: rg });
      const sbM = new Merger();
      sbM.at([X1 - 0.29, 0, -0.3], -HP, (m) => {
        [-1, 1].forEach((s) => { m.box(0.02, 0.1, 0.02, BRASS, [s * 1.02, 0.05, 0.16]); m.box(0.02, 0.1, 0.02, BRASS, [s * 1.02, 0.05, -0.16]); });
        // garrafas térmicas
        m.cyl(0.06, 0.065, 0.3, '#c9ccd1', [-0.75, 0.97, 0]); m.cyl(0.03, 0.03, 0.04, BLACKM, [-0.75, 1.14, 0]);
        m.cyl(0.06, 0.065, 0.3, '#2a2b30', [-0.6, 0.97, 0.04]); m.cyl(0.03, 0.03, 0.04, BLACKM, [-0.6, 1.14, 0.04]);
        m.box(0.5, 0.012, 0.3, BRASS, [0.35, 0.826, 0]);
      });
      sbM.build(METAL(), own, { parent: rg });
      const sbD = new Merger();
      sbD.at([X1 - 0.29, 0, -0.3], -HP, (m) => {
        for (let i = 0; i < 6; i++) m.cyl(0.035, 0.03, 0.07, '#f4f1ea', [-0.25 + (i % 3) * 0.085, 0.855 + Math.floor(i / 3) * 0.072, 0.05], null, 14);
        for (let i = 0; i < 4; i++) m.cyl(0.03, 0.03, 0.22, '#9fd0e8', [0.85 - i * 0.07, 0.93, -0.05], null, 12);
        for (let i = 0; i < 7; i++) m.cyl(0.03, 0.03, 0.012, '#c98a4a', [0.25 + (i % 4) * 0.075, 0.84, -0.06 + Math.floor(i / 4) * 0.08], null, 12);
      });
      plant(sbD, 'figueira', [X1 - 0.45, 0, -2.75], 1.5, '#2d2f33', 13);
      plant(sbD, 'palmeira', [X1 - 0.45, 0, 2.7], 1.2, '#e9e3d7', 19);
      // painel acústico de tecido (azul-petróleo) com frisos de latão atrás do aparador e do relógio
      const fabTex = ctex('fabric-panel', 256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#2b3f48'; ctx.fillRect(0, 0, w, h);
        const r3 = M.rng(61);
        for (let y = 0; y < h; y += 2) { ctx.fillStyle = 'rgba(255,255,255,' + (0.015 + r3() * 0.03) + ')'; ctx.fillRect(0, y, w, 1); }
        for (let x = 0; x < w; x += 3) { ctx.fillStyle = 'rgba(0,0,0,' + (0.02 + r3() * 0.04) + ')'; ctx.fillRect(x, 0, 1, h); }
        noise(ctx, w, h, 0.12, 62);
      });
      const fabM = new T.MeshStandardMaterial({ map: texRepeat(fabTex, 'fabric-r', 3, 3), roughness: 0.96 });
      own.add(fabM);
      const fab = new T.Mesh(M.planeGeo(3.3, 2.78), fabM);
      fab.rotation.y = -HP; fab.position.set(X1 - 0.075, 1.4, -0.3); fab.receiveShadow = true;
      rg.add(fab);
      const fr = new Merger();
      for (let i = 0; i <= 5; i++) fr.box(0.012, 2.78, 0.012, BRASS, [X1 - 0.08, 1.4, -0.3 - 1.65 + i * 0.66]);
      fr.box(0.03, 0.04, 3.36, '#2a1a10', [X1 - 0.09, 2.81, -0.3]);
      fr.build(METAL(), own, { parent: rg });
      // quadros pequenos (gravuras)
      [[-1.55, '#2b3a55'], [0.95, '#7a4a2a']].forEach((q) => {
        sbD.box(0.03, 0.62, 0.5, '#1b1b1e', [X1 - 0.085, 1.7, q[0]]);
        sbD.box(0.006, 0.54, 0.42, '#efe9de', [X1 - 0.1, 1.7, q[0]]);
        sbD.box(0.004, 0.26, 0.2, q[1], [X1 - 0.104, 1.74, q[0]]);
      });
      sbD.build(SATIN(), own, { parent: rg });
      // relógio de parede
      const clockG = M.group({ parent: rg, pos: [X1 - 0.09, 2.15, -0.3], rot: [0, -HP, 0] });
      const ck = new Merger();
      ck.cyl(0.24, 0.24, 0.05, '#1d1e22', [0, 0, -0.01], [HP, 0, 0], 40);
      ck.tor(0.235, 0.018, '#c9a25e', [0, 0, 0.018], null);
      ck.build(METAL(), own, { parent: clockG });
      const faceTex = ctex('clockface', 256, 256, drawClockFace, false);
      const face = new T.Mesh(new T.CircleGeometry(0.225, 48), stdMat('clockface', { map: faceTex, rough: 0.5 }));
      own.add(face.geometry);
      face.position.z = 0.017;
      clockG.add(face);
      const hand = (len, wid, colr, z) => {
        const gH = M.group({ parent: clockG, pos: [0, 0, z] });
        M.box(wid, len, 0.006, M.mat(colr, { rough: 0.4, metal: 0.3 }), { parent: gH, pos: [0, len / 2 - 0.025, 0], cast: false });
        return gH;
      };
      const hHour = hand(0.13, 0.016, '#1d1e22', 0.024);
      const hMin = hand(0.19, 0.011, '#1d1e22', 0.03);
      const hSec = hand(0.2, 0.004, '#d0343f', 0.036);
      M.cyl(0.012, 0.012, 0.012, M.mat('#c9a25e', { metal: 0.8, rough: 0.3 }), { parent: clockG, pos: [0, 0, 0.04], rot: [HP, 0, 0], cast: false });

      // --- mesa longa
      const TL = 4.7, TW = 1.3;
      const tb = new Merger();
      tb.rbox(TL, 0.06, TW, 0.03, '#ffffff', [0, 0.72, 0], null, 3);
      tb.rbox(0.7, 0.66, 0.5, 0.03, '#ffffff', [-1.3, 0.36, 0]);
      tb.rbox(0.7, 0.66, 0.5, 0.03, '#ffffff', [1.3, 0.36, 0]);
      tb.build(WOOD(), own, { parent: root });
      const tbM = new Merger();
      tbM.box(TL - 0.6, 0.004, 0.16, '#1f2024', [0, 0.752, 0]);
      tbM.box(TL - 0.6, 0.006, 0.006, BRASS, [0, 0.753, 0.08]);
      tbM.box(TL - 0.6, 0.006, 0.006, BRASS, [0, 0.753, -0.08]);
      [-1.3, 1.3].forEach((x) => { tbM.box(0.74, 0.03, 0.54, BRASS, [x, 0.015, 0]); });
      // viva-voz (aranha) no centro
      tbM.cyl(0.12, 0.15, 0.035, '#2a2b30', [0, 0.77, 0], null, 3);
      tbM.cyl(0.03, 0.03, 0.006, '#3a7a5a', [0, 0.79, 0], null, 12);
      tbM.build(METAL(), own, { parent: root });
      // itens arrumados: bloco + caneta + copo d'água por lugar
      const SEATS = [];
      [-1.7, -0.57, 0.57, 1.7].forEach((x) => SEATS.push([x, -1.12, 0]));
      [-1.7, -0.57, 0.57, 1.7].forEach((x) => SEATS.push([x, 1.12, PI]));
      const CAB = [2.85, 0, -HP];
      const td = new Merger();
      const tg = new Merger();
      SEATS.concat([CAB]).forEach((st, i) => {
        const dir = st[2] === 0 ? 1 : st[2] === PI ? -1 : 0;
        const px = dir === 0 ? TL / 2 - 0.3 : st[0], pz = dir === 0 ? 0 : st[1] * 0.4;
        const rot = dir === 0 ? -HP : st[2];
        td.at([px, 0.75, pz], rot, (m) => {
          m.box(0.16, 0.008, 0.22, '#f6f3ea', [-0.04, 0.004, 0]);
          m.box(0.16, 0.004, 0.02, '#24324f', [-0.04, 0.009, -0.1]);
          m.cyl(0.004, 0.004, 0.14, i % 2 ? '#1b2233' : BRASS, [0.08, 0.006, 0.02], [HP, 0, 0.2]);
        });
        tg.at([px, 0.75, pz], rot, (m) => { m.cyl(0.032, 0.028, 0.1, '#ffffff', [0.17, 0.05, -0.05], null, 14); });
      });
      // laptop da cabeceira (base)
      td.at([TL / 2 - 0.45, 0.75, 0.32], -HP + 0.3, (m) => { m.rbox(0.32, 0.012, 0.22, 0.005, '#a7aab0', [0, 0.006, 0]); });
      td.build(SATIN(), own, { parent: root });
      tg.build(CRYSTAL(), own, { parent: root, cast: false });
      // cadeiras
      const chL = new Merger(), chM = new Merger();
      SEATS.forEach((st) => meetChair(chL, chM, [st[0], st[1]], st[2], false));
      meetChair(chL, chM, [CAB[0], CAB[1]], CAB[2], true);
      chL.build(LEATHER(), own, { parent: root });
      chM.build(METAL(), own, { parent: root });
      // luminária linear suspensa
      const pend = new Merger();
      pend.rbox(3.8, 0.05, 0.12, 0.02, '#2a2b2f', [0, 2.38, 0]);
      [-1.6, 1.6].forEach((x) => pend.cyl(0.003, 0.003, 0.7, '#aaaaaa', [x, 2.75, 0]));
      pend.build(METAL(), own, { parent: root, cast: false });
      const pendMat = new T.MeshBasicMaterial({ color: col('#fff1d6'), toneMapped: false });
      own.add(pendMat);
      const strip = new T.Mesh(M.boxGeo(3.7, 0.006, 0.07), pendMat);
      strip.position.set(0, 2.352, 0); root.add(strip);
      const pendLight = new T.PointLight('#ffe2b8', 0, 7, 2);
      pendLight.position.set(0, 2.2, 0); root.add(pendLight);
      // corredor: banco + planta
      const cor = new Merger();
      cor.rbox(1.4, 0.08, 0.4, 0.02, '#ffffff', [-2.2, 0.44, Z1 + 0.85]);
      cor.build(WOOD(), own, { parent: root });
      const corM = new Merger();
      [-1, 1].forEach((s) => corM.box(0.04, 0.4, 0.34, BLACKM, [-2.2 + s * 0.6, 0.2, Z1 + 0.85]));
      corM.build(METAL(), own, { parent: root });
      const corP = new Merger();
      plant(corP, 'espada', [1.2, 0, Z1 + 0.85], 0.75, '#2d2f33', 31);
      plant(corP, 'figueira', [-3.85, 0, Z1 + 0.85], 1.35, '#e9e3d7', 37);
      // passadeira no corredor
      const runM = new T.MeshStandardMaterial({ map: rugTex('runner', '#4a3a30', '#2e241e', '#a88a5c'), roughness: 0.95 });
      own.add(runM);
      const runner = new T.Mesh(M.boxGeo(6.2, 0.01, 0.78), runM);
      runner.position.set(-0.4, 0.006, Z1 + 0.62); runner.receiveShadow = true; runner.castShadow = false;
      root.add(runner);
      corP.build(SATIN(), own, { parent: root });

      // --- CAOS (instanciado; cada item tem um limiar 0..1)
      const cr = M.rng(71);
      const cupM = new Merger();
      cupM.cyl(0.04, 0.034, 0.085, '#f6f3ee', [0, 0.0425, 0], null, 14);
      cupM.cyl(0.035, 0.035, 0.004, '#3b2214', [0, 0.08, 0], null, 14);
      cupM.tor(0.026, 0.007, '#f6f3ee', [0.045, 0.045, 0], null);
      cupM.cyl(0.07, 0.06, 0.008, '#f6f3ee', [0, 0.004, 0], null, 18);
      const cupGeo = cupM.geometry(own);
      const toGo = new Merger();
      toGo.cyl(0.042, 0.032, 0.12, '#f3efe6', [0, 0.06, 0], null, 14);
      toGo.cyl(0.043, 0.04, 0.045, '#8a5a32', [0, 0.065, 0], null, 14);
      toGo.cyl(0.046, 0.046, 0.014, '#ffffff', [0, 0.127, 0], null, 14);
      const toGoGeo = toGo.geometry(own);
      const items = { cup: [], togo: [], paper: [], note: [], ball: [] };
      SEATS.concat([CAB]).forEach((st, i) => {
        const dir = st[2] === 0 ? 1 : st[2] === PI ? -1 : 0;
        const px = dir === 0 ? TL / 2 - 0.32 : st[0], pz = dir === 0 ? 0 : st[1] * 0.42;
        items.cup.push({ th: 0.05 + i * 0.045, p: [px + (dir === 0 ? 0 : 0.2), 0.75, pz + (dir === 0 ? -0.22 : 0)], r: cr() * 6 });
        items.togo.push({ th: 0.45 + cr() * 0.5, p: [px - 0.22 + cr() * 0.1, 0.75, pz + (cr() - 0.5) * 0.15], r: cr() * 6 });
      });
      for (let i = 0; i < 6; i++) items.cup.push({ th: 0.6 + i * 0.07, p: [-2 + i * 0.75 + cr() * 0.2, 0.75, (cr() - 0.5) * 0.4], r: cr() * 6 });
      for (let i = 0; i < 34; i++) {
        const onFloor = i > 26;
        items.paper.push({ th: 0.03 + i * 0.028, p: onFloor ? [(cr() - 0.5) * 5, 0.013, (cr() > 0.5 ? 1 : -1) * (1.5 + cr() * 0.8)] : [(cr() - 0.5) * (TL - 0.4), 0.752 + i * 0.0006, (cr() - 0.5) * (TW - 0.25)], r: cr() * 6 });
      }
      // post-its: mesa, borda do telão, vidro do corredor
      for (let i = 0; i < 26; i++) {
        let p, rot;
        const k = i % 3;
        if (k === 0) { p = [(cr() - 0.5) * (TL - 0.5), 0.754 + i * 0.0004, (cr() - 0.5) * (TW - 0.3)]; rot = [0, cr() * 6, 0]; }
        else if (k === 1) { const zz = (cr() > 0.5 ? 1 : -1) * (1.22 + cr() * 0.1); p = [X0 + 0.1, 0.95 + cr() * 1.25, zz]; rot = [0, (cr() - 0.5) * 0.5, HP, 'ZYX']; }
        else { p = [(cr() - 0.5) * 6, 1.1 + cr() * 0.9, Z1 - 0.07]; rot = [HP, (cr() - 0.5) * 0.5, 0, 'XYZ']; }
        items.note.push({ th: 0.12 + (i / 26) * 0.86, p, rot, c: ['#ffe066', '#ff9ec4', '#9be8c4', '#9fd0ff', '#ffb36b'][i % 5] });
      }
      for (let i = 0; i < 9; i++) items.ball.push({ th: 0.45 + i * 0.06, p: i < 5 ? [(cr() - 0.5) * 4, 0.785, (cr() - 0.5) * 0.9] : [(cr() - 0.5) * 6, 0.035, (cr() > 0.5 ? 1 : -1) * (1.6 + cr())], r: cr() * 6 });
      Object.keys(items).forEach((k) => items[k].sort((a, b) => a.th - b.th));
      const _ob = new T.Object3D();
      const inst = (geo, mat, list, setup) => {
        const im = new T.InstancedMesh(geo, mat, list.length);
        list.forEach((it, i) => { _ob.position.set(it.p[0], it.p[1], it.p[2]); _ob.rotation.set(0, 0, 0, 'XYZ'); _ob.scale.set(1, 1, 1); setup(it, _ob); _ob.updateMatrix(); im.setMatrixAt(i, _ob.matrix); if (it.c) im.setColorAt(i, col(it.c)); });
        im.castShadow = true; im.receiveShadow = true;
        own.add(im);
        root.add(im);
        return im;
      };
      const imCup = inst(cupGeo, SATIN(), items.cup, (it, o) => { o.rotation.y = it.r; });
      const imToGo = inst(toGoGeo, SATIN(), items.togo, (it, o) => { o.rotation.y = it.r; });
      const sheetMat = stdMat('sheet', { map: paperTopTex(), rough: 0.85 });
      const imPaper = inst(M.boxGeo(0.21, 0.0015, 0.297), sheetMat, items.paper, (it, o) => { o.rotation.y = it.r; });
      imPaper.castShadow = false;
      const noteMat = stdMat('note', { color: '#ffffff', rough: 0.9 });
      const imNote = inst(M.boxGeo(0.076, 0.002, 0.076), noteMat, items.note, (it, o) => { o.rotation.set(it.rot[0], it.rot[1], it.rot[2], it.rot[3] || 'XYZ'); });
      imNote.castShadow = false;
      const ballGeo = new T.IcosahedronGeometry(0.034, 0); own.add(ballGeo);
      const imBall = inst(ballGeo, stdMat('ball', { color: '#f2efe8', rough: 0.95 }), items.ball, (it, o) => { o.rotation.set(it.r, it.r * 2, 0); });
      // caixa de pizza (aberta) e garrafas extras
      const pz = new Merger();
      pz.box(0.42, 0.04, 0.42, '#c9a06a', [0, 0.02, 0]);
      pz.box(0.42, 0.01, 0.42, '#c9a06a', [0, 0.21, -0.2], [-1.35, 0, 0]);
      pz.cyl(0.18, 0.18, 0.012, '#e8b04a', [0, 0.045, 0], null, 24);
      pz.box(0.1, 0.006, 0.08, '#c0392b', [0.06, 0.053, 0.03]);
      pz.box(0.07, 0.006, 0.06, '#c0392b', [-0.07, 0.053, -0.05]);
      pz.box(0.07, 0.006, 0.06, '#2f7a3a', [-0.02, 0.053, 0.08]);
      const pizza = pz.build(SATIN(), own, { parent: root });
      pizza.position.set(-0.9, 0.75, 0.1); pizza.rotation.y = 0.3;
      const th2 = new Merger();
      th2.cyl(0.06, 0.065, 0.3, '#c9ccd1', [0.6, 0.9, 0.18]); th2.cyl(0.03, 0.03, 0.04, BLACKM, [0.6, 1.07, 0.18]);
      const thermos = th2.build(METAL(), own, { parent: root });
      const setChaos = (v) => {
        v = clamp(+v || 0, 0, 1);
        const cnt = (list) => list.filter((it) => it.th <= v + 1e-6).length;
        imCup.count = cnt(items.cup); imToGo.count = cnt(items.togo); imPaper.count = cnt(items.paper);
        imNote.count = cnt(items.note); imBall.count = cnt(items.ball);
        pizza.visible = v >= 0.82;
        thermos.visible = v >= 0.4;
      };

      // ================= parâmetros
      let curTime = null, clockCur = null, clockTarget = 14 * 60;
      const timeFromClock = (mins) => (mins >= 19 * 60 ? 'noite' : mins >= 17 * 60 + 30 ? 'tarde' : 'dia');
      function setTime(tm) {
        if (!BOARD_LIGHT[tm]) tm = 'dia';
        if (tm === curTime) return;
        curTime = tm;
        const P = BOARD_LIGHT[tm];
        L.set(P);
        city.setTime(tm);
        pendLight.intensity = 1.1 * P.lamps;
        ceiling.set(tm === 'noite' ? 1 : tm === 'tarde' ? 0.8 : 0.45);
        pendMat.color.set(tm === 'dia' ? '#d8d2c8' : '#fff1d6');
        scGlow.material.opacity = tm === 'noite' ? 0.25 : tm === 'tarde' ? 0.1 : 0;
        const e = envMap('office-' + tm, OFFICE_ENV[tm]);
        if (e) applyEnv(root, e, tm === 'noite' ? 0.6 : 1);
      }
      const setHands = (mins) => {
        hHour.rotation.z = -(mins / 720) * PI * 2;
        hMin.rotation.z = -(mins / 60) * PI * 2;
      };
      const env = {
        root,
        background: '#9fb2c4',
        fog: { color: '#c3d6e6', near: 20, far: 100 },
        walls,
        spots: {
          c1: { x: -1.7, z: -1.12, rot: 0 }, c2: { x: -0.57, z: -1.12, rot: 0 }, c3: { x: 0.57, z: -1.12, rot: 0 }, c4: { x: 1.7, z: -1.12, rot: 0 },
          c5: { x: -1.7, z: 1.12, rot: PI }, c6: { x: -0.57, z: 1.12, rot: PI }, c7: { x: 0.57, z: 1.12, rot: PI }, c8: { x: 1.7, z: 1.12, rot: PI },
          cabeceira: { x: 2.85, z: 0, rot: -HP },
          tela: { x: X0 + 0.85, z: 1.75, rot: 1.35 },
          porta: { x: X1 - 0.95, z: Z1 - 0.55, rot: PI },
          janela: { x: 0.4, z: -2.55, rot: PI },
          pe1: { x: -2.6, z: 2.2, rot: 0.4 },
          pe2: { x: 1.4, z: 2.25, rot: -0.2 },
          centro: { x: 0, z: 2.2, rot: 0 },
          // primeira pessoa: início + pontos de interação (rot = olhando para o objeto)
          inicio: { x: 3.3, z: 2.45, rot: -1.95 },
          relogio: { x: 3.25, z: -0.3, rot: HP },
          cafe: { x: 3.25, z: -0.85, rot: HP },
          ver_tela: { x: -1.6, z: 2.15, rot: -2.2 },
          corredor: { x: 1.2, z: 2.75, rot: 0 },
        },
        // colisão (primeira pessoa)
        bounds: { minX: X0, maxX: X1, minZ: Z0 + 0.3, maxZ: Z1 - 0.04 },
        colliders: [
          { x: 0, z: 0, w: TL + 0.02, d: TW + 0.02 },          // mesa
          { x: 0, z: -1.12, w: 4.05, d: 0.62 },               // cadeiras c1..c4
          { x: 0, z: 1.12, w: 4.05, d: 0.62 },                // cadeiras c5..c8
          { x: X0 + 0.3, z: 0, w: 0.52, d: 2.84 },            // console sob o telão
          { x: X1 - 0.29, z: -0.3, w: 0.5, d: 2.24 },         // aparador do café
          { x: X1 - 0.45, z: -2.75, w: 0.52, d: 0.52 },       // figueira
          { x: X1 - 0.45, z: 2.7, w: 0.52, d: 0.52 },         // palmeira
        ],
        shots: {
          geral: { target: [0, 0.9, 0], yaw: 0.22, pitch: 0.4, dist: 11.8, fov: 40 },
          mesa: { target: [-0.6, 1.0, 0], yaw: HP, pitch: 0.2, dist: 5.6, fov: 40 },
          tela: { target: [X0 + 0.1, 1.55, 0], yaw: HP - 0.12, pitch: 0.04, dist: 4.4, fov: 38 },
          cabeceira: { target: [2.85, 1.05, 0], yaw: -1.25, pitch: 0.08, dist: 2.5, fov: 36 },
          relogio: { target: [X1 - 0.1, 2.12, -0.3], yaw: -HP + 0.1, pitch: -0.04, dist: 2.2, fov: 36 },
          janela: { target: [0, 1.4, -3.1], yaw: 0.3, pitch: 0.06, dist: 5.2, fov: 40 },
          lateral: { target: [0, 1.0, 0], yaw: 0.05, pitch: 0.1, dist: 4.8, fov: 40 },
        },
        defaultShot: 'geral',
        setParams(p) {
          p = p || {};
          clockTarget = parseClock(p.clock);
          if (clockCur == null) { clockCur = clockTarget; setHands(clockCur); }
          setTime(p.time || timeFromClock(clockTarget));
          city.applyFog();
          const sl = p.slide || { title: 'Reunião do Conselho', lines: ['Resultados do 3º trimestre', 'Plano de IA: pilotos e regras', 'Riscos e próximos passos'] };
          screen.draw(JSON.stringify(sl), (ctx, w, h) => drawSlide(ctx, w, h, sl, { chart: true, footer: 'Conselho de Administração', page: '2 / 18' }));
          setChaos(p.chaos);
        },
        update(t, p, dt) {
          city.update(t);
          if (clockCur !== clockTarget) {
            const d = clockTarget - clockCur;
            if (Math.abs(d) < 0.05) clockCur = clockTarget;
            else clockCur += d * (1 - Math.exp(-(dt || 0.016) * 2.2));
            setHands(clockCur);
          }
          hSec.rotation.z = -(Math.floor(t) % 60) / 60 * PI * 2;
        },
        dispose() { own.dispose(); },
      };
      env.setParams(params0 || {});
      return env;
    },
  };

  // ====================================================================
  // CARRO (banco de trás, rodando por São Paulo)
  // ====================================================================
  const CAR_LIGHT = {
    dia: { sky: '#e6f0ff', ground: '#6a6460', hemi: 0.85, sun: '#fff3e2', sunI: 2.2, sunPos: [3, 9, 6], amb: 0.14, inner: 0.25 },
    tarde: { sky: '#ffcfa8', ground: '#5a4250', hemi: 0.6, sun: '#ff9a50', sunI: 2.8, sunPos: [-8, 2.6, 6], amb: 0.1, inner: 0.4 },
    noite: { sky: '#6a7ac0', ground: '#3a3046', hemi: 0.62, sun: '#8fa0ff', sunI: 0.4, sunPos: [4, 9, 5], amb: 0.12, inner: 1.1 },
  };
  const CAR_ENV = {
    dia: ['#bcd6f0', '#e8e2d8', '#4a4642', [[0, 4, 0, 8, 3, '#ffffff'], [6, 2, 5, 4, 2, '#fff2dc']]],
    tarde: ['#7a6aa0', '#ffb07a', '#3a2a2a', [[-6, 1, 3, 8, 2, '#ffb070'], [0, 4, 0, 6, 2, '#ffe0c0']]],
    noite: ['#1a2040', '#3a3060', '#141018', [[0, 3, 0, 6, 1, '#ffd08a'], [5, 1, -4, 3, 1, '#7aa0ff']]],
  };
  function asphaltTex() {
    return ctex('asphalt', 512, 1024, (ctx, w, h) => {
      // 8 m (x) por 18 m (z): u ao longo da rua
      ctx.fillStyle = '#3c3d42'; ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 0.5, 31);
      const zToY = (z) => (z + 9) / 18 * h;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      [0, 3.5, -3.5].forEach((z) => ctx.fillRect(0, zToY(z) - 26, w, 52));
      ctx.fillStyle = '#e8e6df';
      [1.75, -1.75, 5.25].forEach((z) => { for (let x = 0; x < w; x += w / 2) ctx.fillRect(x + w * 0.05, zToY(z) - 4, w * 0.22, 8); });
      ctx.fillRect(0, zToY(-5.3) - 5, w, 10);
      ctx.fillStyle = '#e8c547';
      ctx.fillRect(0, zToY(5.55) - 4, w, 8);
      // remendos
      ctx.fillStyle = 'rgba(20,20,24,0.25)'; ctx.fillRect(w * 0.6, zToY(-2.6), w * 0.25, 60); ctx.fillRect(w * 0.1, zToY(2.4), w * 0.15, 40);
    });
  }
  function sidewalkTex() {
    return ctex('sidewalk', 256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#a7a39b'; ctx.fillRect(0, 0, w, h);
      noise(ctx, w, h, 0.2, 12);
      ctx.strokeStyle = 'rgba(60,58,54,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); }
      // faixa preta e branca (calçada paulistana)
      ctx.fillStyle = '#2b2b2e';
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, h * 0.8); ctx.lineTo(i * 32 + 16, h * 0.72); ctx.lineTo(i * 32 + 32, h * 0.8); ctx.lineTo(i * 32 + 16, h * 0.88); ctx.closePath(); ctx.fill(); }
    });
  }
  function signAtlas() {
    return ctex('signs', 512, 256, (ctx, w, h) => {
      const signs = [['PADARIA', '#c0392b', '#fff4e0'], ['FARMÁCIA', '#1f8a5a', '#ffffff'], ['CAFÉ', '#3a2a22', '#f3c98b'], ['BANCA', '#2b4aa8', '#ffe066'], ['LANCHES', '#e8a020', '#2a1a10'], ['ÓTICA', '#5a2a7a', '#ffffff'], ['BANCO', '#24324f', '#ffffff'], ['FLORES', '#d0607a', '#ffffff']];
      signs.forEach((sg, i) => {
        const x = (i % 2) * w / 2, y = Math.floor(i / 2) * h / 4;
        ctx.fillStyle = sg[1]; ctx.fillRect(x, y, w / 2, h / 4);
        ctx.fillStyle = sg[2]; font(ctx, h * 0.13, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sg[0], x + w / 4, y + h / 8);
      });
    }, false);
  }
  function drawNav(ctx, w, h) {
    ctx.fillStyle = '#1c2230'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#2c3446'; ctx.lineWidth = 10;
    for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 80, 0); ctx.lineTo(i * 80 + 160, h); ctx.stroke(); }
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, i * 60 + 20); ctx.lineTo(w, i * 60 - 30); ctx.stroke(); }
    ctx.fillStyle = '#20402e'; ctx.beginPath(); ctx.ellipse(w * 0.75, h * 0.3, 70, 40, 0.3, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff7a45'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.3, h * 0.95); ctx.lineTo(w * 0.42, h * 0.55); ctx.lineTo(w * 0.7, h * 0.42); ctx.lineTo(w * 0.85, h * 0.1); ctx.stroke();
    ctx.fillStyle = '#4a9fff'; ctx.beginPath(); ctx.arc(w * 0.33, h * 0.86, 10, 0, PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(10,14,22,0.85)'; ctx.fillRect(0, 0, w, h * 0.2);
    font(ctx, h * 0.1, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Av. Faria Lima', w * 0.04, h * 0.1);
    font(ctx, h * 0.08, 700); ctx.fillStyle = '#7fe0a8'; ctx.textAlign = 'right'; ctx.fillText('18 min', w * 0.96, h * 0.1);
  }
  function drawPhone(mode, ctx, w, h, st) {
    if (mode === 'off') { drawOff(ctx, w, h); return; }
    if (mode === 'mapa') { drawNav(ctx, w, h); return; }
    if (mode === 'call') {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#24324f'); g.addColorStop(1, '#0e1628');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#c9d4ea'; ctx.beginPath(); ctx.arc(w / 2, h * 0.3, w * 0.18, 0, PI * 2); ctx.fill();
      font(ctx, w * 0.09, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Chamada', w / 2, h * 0.5);
      ctx.fillStyle = '#e94b5a'; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.82, w * 0.09, 0, PI * 2); ctx.fill();
      ctx.fillStyle = '#2f9e74'; ctx.beginPath(); ctx.arc(w * 0.7, h * 0.82, w * 0.09, 0, PI * 2); ctx.fill();
      return;
    }
    // chat compacto (retrato)
    ctx.fillStyle = '#f6f3ee'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#18202f'; ctx.fillRect(0, 0, w, h * 0.11);
    sparkDot(ctx, w * 0.12, h * 0.055, w * 0.055);
    font(ctx, w * 0.075, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Faísca', w * 0.22, h * 0.057);
    const lines = (st && st.chat) || [['eu', 'Resuma a pauta das 14h em 3 linhas.'], ['ia', 'Resultados do trimestre, plano de IA e riscos. Sugiro começar pelos números.'], ['eu', 'Que perguntas o conselho pode fazer?']];
    let y = h * 0.15;
    const fs = w * 0.062;
    lines.slice(-3).forEach((ln) => {
      const me = ln[0] === 'eu';
      font(ctx, fs, 500);
      const ls = wrap(ctx, ln[1], w * 0.66).slice(0, 4);
      const bw = Math.min(w * 0.78, Math.max.apply(null, ls.map((q) => ctx.measureText(q).width)) + w * 0.08);
      const bh = ls.length * fs * 1.3 + w * 0.06;
      const bx = me ? w - bw - w * 0.05 : w * 0.14;
      if (!me) sparkDot(ctx, w * 0.07, y + w * 0.05, w * 0.035);
      ctx.fillStyle = me ? '#24324f' : '#fff'; rr(ctx, bx, y, bw, bh, w * 0.04); ctx.fill();
      ctx.fillStyle = me ? '#fff' : '#283044';
      ls.forEach((q, i) => ctx.fillText(q, bx + w * 0.04, y + w * 0.03 + fs * 0.65 + i * fs * 1.3));
      y += bh + h * 0.025;
    });
    if (st && st.typing !== false && y < h * 0.82) {
      sparkDot(ctx, w * 0.07, y + w * 0.05, w * 0.035);
      ctx.fillStyle = '#fff'; rr(ctx, w * 0.14, y, w * 0.22, w * 0.1, w * 0.05); ctx.fill();
      for (let i = 0; i < 3; i++) { const ph = ((st.phase || 0) + i * 0.33) % 1; ctx.fillStyle = 'rgba(255,122,69,' + (0.35 + 0.65 * Math.sin(ph * PI)) + ')'; ctx.beginPath(); ctx.arc(w * 0.19 + i * w * 0.055, y + w * 0.05, w * 0.016, 0, PI * 2); ctx.fill(); }
    }
    ctx.fillStyle = '#fff'; rr(ctx, w * 0.05, h * 0.9, w * 0.9, h * 0.065, h * 0.03); ctx.fill();
    ctx.fillStyle = '#ff7a45'; ctx.beginPath(); ctx.arc(w * 0.87, h * 0.932, h * 0.022, 0, PI * 2); ctx.fill();
    glare(ctx, w, h);
  }

  // lojas do térreo: [fundo, prateleira/balcão, cores de produtos, toldo] — mesma ordem do atlas de letreiros
  const SHOPS = [
    ['#f3dfb8', '#8a5a32', ['#e8b04a', '#c0392b', '#f6efe0', '#d9a066'], '#b8332a'],   // padaria
    ['#eef6f2', '#c9d4d0', ['#1f8a5a', '#4a90d0', '#ffffff', '#e94b5a'], '#1f8a5a'],   // farmácia
    ['#f0dcc0', '#5a3a26', ['#3a2a22', '#c98a4a', '#f3c98b', '#7a4a2a'], '#3a2a22'],   // café
    ['#e8e4d8', '#3a4a6a', ['#2b4aa8', '#ffe066', '#e05a47', '#ffffff'], '#2b4aa8'],   // banca
    ['#f6e2c0', '#7a4a20', ['#e8a020', '#c0392b', '#2f7a3a', '#f6efe0'], '#d08a20'],   // lanches
    ['#ece6f2', '#d8d0e0', ['#5a2a7a', '#26272b', '#c9a25e', '#9fd0e8'], '#5a2a7a'],   // ótica
    ['#e9edf2', '#9aa4b4', ['#24324f', '#ffffff', '#c9a25e', '#8a95a8'], '#24324f'],   // banco
    ['#f6e6ea', '#6a8a4a', ['#d0607a', '#f2c230', '#ffffff', '#e88ab8'], '#c0506a'],   // flores
  ];
  /**
   * Uma "fileira" da rua (um lado), em [-L/2, L/2]. Retorna geometrias (sem pai). side: +1 (z>0) ou −1.
   * Térreo recuado 0,9 m com vitrine de verdade (vidro + caixilhos + interior iluminado com prateleiras e
   * balcão), andares com janelas emolduradas, peitoris, aparelhos de ar-condicionado e varandas; na calçada:
   * árvores (ipês/tipuanas), postes, frades, lixeiras laranja, ponto de ônibus e banca de jornal.
   */
  function streetRow(own, side, L, seed) {
    const r = M.rng(seed);
    const fac = new Merger(), win = new Merger(), lit = new Merger(), sign = new Merger(), tree = new Merger(), pole = new Merger(), glowM = new Merger(), pool = new Merger();
    const shop = new Merger(), pane = new Merger();
    const z0 = side * 9.6, SW = 0.16;                 // plano da fachada · altura da calçada
    const out = (d) => z0 - side * d;                 // d m à frente da fachada (para a rua)
    const inn = (d) => z0 + side * d;                 // d m para dentro do prédio
    const facCols = ['#d8cfc0', '#c9b9a3', '#e2dccf', '#b9c3c9', '#cfc4b2', '#a8b4bb', '#d9c9b2', '#c4b29b', '#e6e0d4', '#9fa8ae', '#c98f72', '#8fa596'];
    const G = 4.4, RS = 0.9;                          // altura do térreo · recuo da vitrine
    let x = -L / 2, bi = 0;
    while (x < L / 2 - 4) {
      const bw = Math.min(L / 2 - x, 7 + r() * 10);
      if (bw < 4) break;
      const bh = 9 + r() * r() * 42, bd = 9 + r() * 6;
      const cx = x + bw / 2, cz = z0 + side * bd / 2;
      const c = facCols[Math.floor(r() * facCols.length)];
      const dk = M.hex(M.mix(c, '#000', 0.22)), lt = M.hex(M.mix(c, '#ffffff', 0.45));
      const curtain = r() < 0.28 && bh > 18;          // prédio de vidro (pele de vidro)
      const BW = bw - 0.3;
      // corpo dos andares + fundo do térreo (recuado)
      fac.box(BW, bh - G, bd, c, [cx, G + (bh - G) / 2, cz]);
      fac.box(BW, G, bd - RS, '#4a4642', [cx, G / 2, inn(RS + (bd - RS) / 2)]);
      // pilares das pontas + viga do letreiro + soleira de granito
      [-1, 1].forEach((s) => fac.box(0.36, G, RS + 0.02, dk, [cx + s * (BW / 2 - 0.18), G / 2, inn(RS / 2)]));
      fac.box(BW, G - 3.15, RS + 0.02, c, [cx, 3.15 + (G - 3.15) / 2, inn(RS / 2)]);
      fac.box(BW + 0.02, 0.1, 0.12, dk, [cx, G, out(0.04)]);
      // coroamento + casa de máquinas
      fac.box(bw - 0.1, 0.35, bd + 0.1, dk, [cx, bh + 0.17, cz]);
      if (r() > 0.5) fac.box(bw * 0.3, 2.2, bd * 0.3, '#8e9196', [cx + (r() - 0.5) * bw * 0.4, bh + 1.1, cz]);
      // ---- loja (interior iluminado visto pela vitrine)
      const si = (bi * 3 + Math.floor(r() * 8)) % 8;
      const S = SHOPS[si];
      const IW = BW - 0.72;
      shop.box(IW, 3.0, 0.03, S[0], [cx, SW + 1.5, inn(RS - 0.02)]);                       // parede do fundo
      shop.box(IW, 0.02, RS, M.hex(M.mix(S[0], '#7a6a5a', 0.45)), [cx, SW + 0.01, inn(RS / 2)]); // piso
      shop.box(IW, 0.02, RS, '#fffaf0', [cx, 3.13, inn(RS / 2)]);                           // forro claro
      const faceRoad = side > 0 ? PI : 0;
      const shelves = (rows, y0, dy, dens) => {
        for (let k = 0; k < rows; k++) {
          const sy = SW + y0 + k * dy;
          shop.box(IW - 0.3, 0.035, 0.26, S[1], [cx, sy, inn(RS - 0.15)]);
          let px = cx - IW / 2 + 0.25;
          while (px < cx + IW / 2 - 0.3) {
            const pw = 0.08 + r() * 0.16, ph = 0.12 + r() * 0.26;
            if (r() < dens) shop.add(M.planeGeo(pw, ph), S[2][Math.floor(r() * 4)], [px + pw / 2, sy + 0.018 + ph / 2, inn(RS - 0.24)], [0, faceRoad, 0]); // só a frente (é visto da rua)
            px += pw + 0.02 + (r() > 0.85 ? 0.25 : 0);
          }
        }
      };
      if (si === 6) {
        // banco: caixas eletrônicos + painel com a marca
        for (let ax = cx - IW / 2 + 0.7; ax < cx + IW / 2 - 0.5; ax += 1.1) {
          shop.box(0.7, 1.55, 0.35, '#c9ced6', [ax, SW + 0.775, inn(RS - 0.2)]);
          shop.box(0.4, 0.3, 0.02, '#3a7ad0', [ax, SW + 1.25, inn(RS - 0.385)]);
          shop.box(0.3, 0.1, 0.06, '#8a95a8', [ax, SW + 0.95, inn(RS - 0.4)]);
        }
        shop.box(Math.min(2.4, IW - 0.6), 0.5, 0.02, '#24324f', [cx, SW + 2.35, inn(RS - 0.04)]);
      } else if (si === 2 || si === 4) {
        // café / lanchonete: quadro de cardápio, prateleira alta com xícaras, balcão comprido e banquetas
        const mw = Math.min(2.6, IW * 0.5);
        shop.box(mw, 0.75, 0.02, '#2a2622', [cx, SW + 2.2, inn(RS - 0.04)]);
        for (let k = 0; k < 4; k++) shop.box(mw * (0.5 + r() * 0.35), 0.03, 0.01, '#f3e6c8', [cx - mw * 0.05, SW + 2.43 - k * 0.15, inn(RS - 0.055)]);
        shelves(1, 1.55, 0, 0.8);
        shop.box(IW * 0.7, 0.95, 0.36, S[1], [cx, SW + 0.475, inn(RS - 0.28)]);
        for (let k = 0; k < 3; k++) { const bx2 = cx - IW * 0.25 + k * IW * 0.25; shop.box(0.28, 0.05, 0.28, '#2a2622', [bx2, SW + 0.72, inn(0.27)]); shop.box(0.05, 0.7, 0.05, '#2a2622', [bx2, SW + 0.35, inn(0.27)]); }
      } else if (si === 7) {
        // floricultura: degraus com baldes de flores
        for (let k = 0; k < 3; k++) {
          shop.box(IW - 0.4, 0.3 + k * 0.35, 0.22, '#8a6a4a', [cx, SW + (0.3 + k * 0.35) / 2, inn(RS - 0.12 - k * 0.2)]);
          for (let fx = cx - IW / 2 + 0.4; fx < cx + IW / 2 - 0.3; fx += 0.32) shop.add(M.planeGeo(0.22, 0.24), S[2][Math.floor(r() * 4)], [fx, SW + 0.3 + k * 0.35 + 0.12, inn(RS - 0.24 - k * 0.2)], [0, faceRoad, 0]);
        }
      } else {
        shelves(3, 0.75, 0.62, 1);
        const ctrX = cx + (r() - 0.5) * Math.max(0, IW - 2.2);
        shop.box(1.5, 0.95, 0.45, S[1], [ctrX, SW + 0.475, inn(0.42)]);                       // balcão
        shop.box(1.56, 0.04, 0.5, M.hex(M.mix(S[1], '#ffffff', 0.5)), [ctrX, SW + 0.97, inn(0.42)]);
      }
      shop.box(IW - 0.6, 0.03, 0.07, '#ffffff', [cx, 3.1, inn(0.3)]);                       // fita de luz
      // ---- vitrine: vidro + caixilhos + porta + mureta
      const zf = inn(0.08);
      pane.box(IW, 2.62, 0.01, '#ffffff', [cx, SW + 0.36 + 1.31, zf]);
      pole.box(IW, 0.36, 0.1, '#2a2b2e', [cx, SW + 0.18, zf]);
      pole.box(IW, 0.07, 0.1, '#2a2b2e', [cx, SW + 2.98, zf]);
      const nb = Math.max(2, Math.round(IW / 1.5));
      for (let k = 0; k <= nb; k++) pole.box(0.06, 2.62, 0.1, '#2a2b2e', [cx - IW / 2 + k * (IW / nb), SW + 0.36 + 1.31, zf]);
      const db = Math.floor(r() * nb);
      pole.box(0.025, 0.7, 0.04, '#c4c8ce', [cx - IW / 2 + (db + 0.5) * (IW / nb) + 0.25, SW + 1.1, out(-0.02)]); // puxador
      // toldo + letreiro (na viga)
      fac.box(bw - 0.9, 0.08, 1.15, S[3], [cx, 3.32, out(0.52)], [side * 0.2, 0, 0]);
      fac.box(bw - 0.9, 0.22, 0.03, S[3], [cx, 3.13, out(1.08)]);
      sign.add(M.boxGeo(Math.min(3.2, bw - 1.4), 0.6, 0.08), '#ffffff', [cx, 3.8, out(0.06)], [0, side > 0 ? 0 : PI, 0], null, [(si % 2) * 0.5, 1 - (Math.floor(si / 2) + 1) * 0.25, (si % 2) * 0.5 + 0.5, 1 - Math.floor(si / 2) * 0.25]);
      // ---- andares
      const floors = Math.floor((bh - G - 0.3) / 3.1);
      const cols = Math.max(2, Math.floor(bw / 2.2));
      const balc = !curtain && r() > 0.55;
      if (curtain) {
        // pele de vidro: um plano espelhado + montantes + faixas de laje
        win.box(BW - 0.2, bh - G - 0.5, 0.05, '#55708a', [cx, G + (bh - G - 0.5) / 2 + 0.25, out(0.025)]);
        const nm = Math.max(3, Math.round(BW / 1.5));
        for (let k = 0; k <= nm; k++) pole.box(0.05, bh - G - 0.5, 0.09, '#3a3f46', [cx - (BW - 0.2) / 2 + k * ((BW - 0.2) / nm), G + (bh - G - 0.5) / 2 + 0.25, out(0.05)]);
        for (let f = 0; f <= floors; f++) fac.box(BW - 0.2, 0.22, 0.08, '#2c333c', [cx, G + 0.25 + f * 3.1, out(0.05)]);
        for (let f = 0; f < floors; f++) for (let k = 0; k < nm; k++) if (r() > 0.62) lit.box((BW - 0.2) / nm - 0.1, 2.5, 0.02, r() > 0.3 ? '#ffd28a' : '#dfe8ff', [cx - (BW - 0.2) / 2 + (k + 0.5) * ((BW - 0.2) / nm), G + 1.65 + f * 3.1, out(0.06)]);
      } else {
        for (let f = 0; f <= floors; f++) fac.box(BW, 0.16, 0.07, dk, [cx, G + 0.05 + f * 3.1, out(0.035)]);   // frisos de laje
        for (let f = 0; f < floors; f++) {
          const wy = G + 1.6 + f * 3.1;
          if (balc && f < 7) {
            // varanda corrida: laje + guarda-corpo (vidro escuro + corrimão + montantes)
            const bl = BW - 1.0;
            fac.box(bl, 0.12, 0.85, lt, [cx, wy - 1.0, out(0.42)]);
            win.box(bl, 0.8, 0.02, '#4a5c6c', [cx, wy - 0.52, out(0.83)]);
            pole.box(bl, 0.04, 0.05, '#3a3b40', [cx, wy - 0.1, out(0.84)]);
            for (let k = 0; k <= 4; k++) pole.box(0.035, 0.9, 0.035, '#3a3b40', [cx - bl / 2 + k * (bl / 4), wy - 0.52, out(0.84)]);
          }
          for (let k = 0; k < cols; k++) {
            const wx = x + 0.6 + (k + 0.5) * ((bw - 1.2) / cols);
            fac.box(1.38, 1.8, 0.04, lt, [wx, wy, out(0.02)]);                       // moldura
            win.box(1.2, 1.62, 0.06, '#40566a', [wx, wy, out(0.03)]);                // vidro
            pole.box(0.03, 1.62, 0.07, '#e8e6e0', [wx, wy, out(0.035)]);             // montante central
            fac.box(1.5, 0.07, 0.2, lt, [wx, wy - 0.88, out(0.1)]);                  // peitoril
            if (r() > 0.5) lit.box(1.1, 1.5, 0.02, r() > 0.3 ? '#ffd28a' : '#dfe8ff', [wx, wy, out(0.07)]);
            if (!balc && f < 6 && r() > 0.72) {
              // ar-condicionado de janela (bem paulistano)
              const ax = wx + (r() > 0.5 ? 0.42 : -0.42);
              fac.box(0.62, 0.4, 0.34, '#e4e3df', [ax, wy - 1.16, out(0.19)]);
              fac.box(0.38, 0.28, 0.01, '#8d8c88', [ax, wy - 1.16, out(0.365)]);
            }
          }
        }
      }
      x += bw; bi++;
    }
    // ---- calçada: frades no meio-fio, lixeiras, ponto de ônibus, banca de jornal
    for (let bx = -L / 2 + 1.5; bx < L / 2; bx += 3.2) pole.cyl(0.07, 0.08, 0.75, '#3a3b40', [bx, SW + 0.375, side * 5.98], null, 10);
    for (let i = 0; i < 3; i++) {
      const lx = -L / 2 + (i + 0.3) * (L / 3);
      pole.cyl(0.035, 0.035, 0.9, '#5a5e66', [lx, SW + 0.45, side * 6.15], null, 8);
      fac.cyl(0.2, 0.17, 0.5, '#e8761a', [lx, SW + 0.75, side * 6.15 + side * 0.22], null, 14);
    }
    const busX = -L / 4 + (r() - 0.5) * 4, kioskX = L / 4 + (r() - 0.5) * 4;
    {
      const bx = busX, bz = side * 7.0;
      fac.box(3.6, 0.08, 1.5, '#e9e9e6', [bx, SW + 2.62, bz]);                           // cobertura
      pane.box(3.4, 1.9, 0.02, '#ffffff', [bx, SW + 1.4, bz + side * 0.62]);              // vidro do fundo
      [-1.7, 1.7].forEach((dx) => { pole.box(0.06, 2.6, 0.06, '#5a5e66', [bx + dx, SW + 1.3, bz + side * 0.62]); pole.box(0.06, 2.6, 0.06, '#5a5e66', [bx + dx, SW + 1.3, bz - side * 0.5]); });
      fac.box(2.6, 0.06, 0.4, '#8a6a4a', [bx, SW + 0.46, bz + side * 0.38]);              // banco
      shop.box(1.1, 1.7, 0.08, '#ff9a5a', [bx + 1.15, SW + 1.4, bz + side * 0.6]);        // painel publicitário (iluminado)
      shop.box(0.9, 1.4, 0.09, '#24324f', [bx + 1.15, SW + 1.42, bz + side * 0.6]);
    }
    {
      const kx = kioskX, kz = side * 8.2;
      fac.box(2.4, 2.3, 1.5, '#2f6a4a', [kx, SW + 1.15, kz]);                             // banca de jornal
      fac.box(2.8, 0.1, 1.9, '#24503a', [kx, SW + 2.35, kz - side * 0.1]);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 7; j++) shop.box(0.26, 0.34, 0.02, ['#e05a47', '#ffe066', '#ffffff', '#4a90d0', '#2f9e74', '#e88ab8'][(k * 7 + j) % 6], [kx - 1.02 + j * 0.34, SW + 0.75 + k * 0.38, kz - side * 0.77]);
    }
    // árvores (ipês e tipuanas) — longe do ponto de ônibus e da banca
    for (let i = 0; i < 6; i++) {
      let tx = -L / 2 + (i + 0.3 + r() * 0.4) * (L / 6);
      [busX, kioskX].forEach((ax) => { if (Math.abs(tx - ax) < 2.8) tx = ax + (tx < ax ? -2.8 : 2.8); });
      const tz = side * 7.2;
      const kind = r();
      const canopy = kind > 0.66 ? ['#e88ab8', '#d870a8', '#f0a0c8'] : kind > 0.4 ? ['#f2c230', '#e8b020', '#f8d050'] : ['#4a7a3a', '#3a6a32', '#5a8a44'];
      tree.cyl(0.13, 0.18, 3.6, '#5a4636', [tx, 1.8, tz]);
      tree.cyl(0.08, 0.1, 1.6, '#5a4636', [tx + 0.5, 3.6, tz], [0, 0, -0.6]);
      for (let k = 0; k < 7; k++) tree.sph(0.95 + r() * 0.4, canopy[k % 3], [tx + (r() - 0.5) * 2.6, 4.45 + r() * 1.3, tz + (r() - 0.5) * 1.2], [1, 0.75, 1], 10);
      tree.cyl(0.55, 0.55, 0.03, '#3e3226', [tx, SW + 0.012, tz], null, 14);
    }
    for (let i = 0; i < 4; i++) {
      const lx = -L / 2 + (i + 0.5) * (L / 4), lz = side * 6.3;
      pole.cyl(0.08, 0.11, 7.5, '#5a5e66', [lx, 3.75, lz]);
      pole.box(0.12, 0.12, 2.2, '#5a5e66', [lx, 7.4, lz - side * 1.1]);
      pole.box(0.5, 0.14, 0.7, '#4a4e56', [lx, 7.3, lz - side * 2.1]);
      glowM.box(0.42, 0.04, 0.6, '#ffd9a0', [lx, 7.22, lz - side * 2.1]);
      pool.add(M.planeGeo(6.5, 6.5), '#ffffff', [lx, 0.012, lz - side * 2.6], [-HP, 0, 0]);
    }
    return {
      fac: fac.geometry(own), win: win.geometry(own), lit: lit.geometry(own), sign: sign.geometry(own),
      tree: tree.geometry(own), pole: pole.geometry(own), glow: glowM.geometry(own), pool: pool.geometry(own),
      shop: shop.geometry(own), pane: pane.geometry(own),
    };
  }

  /** Veículo simples (local: frente para −X). kind: 'onibus' | 'carro' | 'moto'. */
  function vehicle(mg, gm, kind, colr) {
    if (kind === 'onibus') {
      mg.rbox(11, 2.6, 2.5, 0.25, colr, [0, 1.75, 0]);
      mg.rbox(11.02, 0.5, 2.52, 0.2, '#e8e8e8', [0, 0.65, 0]);
      gm.box(10.2, 1.0, 2.54, '#22303c', [0.2, 2.25, 0]);
      gm.box(0.05, 1.7, 2.2, '#22303c', [-5.5, 2.0, 0]);
      [-3.6, 3.6].forEach((x) => [-1.15, 1.15].forEach((z) => mg.cyl(0.5, 0.5, 0.3, '#1a1a1c', [x, 0.5, z], [HP, 0, 0], 16)));
    } else if (kind === 'moto') {
      // motoboy: moto + baú + piloto inclinado (tronco, braços no guidão, pernas, capacete com viseira)
      mg.box(1.3, 0.28, 0.26, colr, [0, 0.74, 0]);
      mg.box(0.5, 0.12, 0.3, '#1f1f24', [0.25, 0.92, 0]);                                  // banco
      [-0.72, 0.72].forEach((wx) => { mg.cyl(0.32, 0.32, 0.1, '#1a1a1c', [wx, 0.32, 0], [HP, 0, 0], 16); mg.cyl(0.13, 0.13, 0.11, '#8a8e96', [wx, 0.32, 0], [HP, 0, 0], 12); });
      mg.box(0.04, 0.55, 0.05, '#3a3b40', [-0.6, 0.6, 0], [0, 0, 0.35]);                   // garfo
      mg.box(0.04, 0.04, 0.62, '#26272b', [-0.5, 1.05, 0]);                                // guidão
      mg.box(0.5, 0.42, 0.44, '#e84a2a', [0.66, 1.16, 0]);                                 // baú
      mg.box(0.52, 0.05, 0.46, '#b83a20', [0.66, 1.39, 0]);
      mg.add(M.capsuleGeo(0.15, 0.3), '#2a3550', [0.0, 1.25, 0], [0, 0, 0.5]);            // tronco
      [-1, 1].forEach((sd) => {
        mg.add(M.capsuleGeo(0.055, 0.32), '#2a3550', [-0.27, 1.2, sd * 0.2], [0, 0, 1.05]); // braço
        mg.add(M.capsuleGeo(0.07, 0.32), '#1f2633', [-0.08, 0.95, sd * 0.15], [0, 0, 1.35]); // coxa
        mg.add(M.capsuleGeo(0.06, 0.3), '#1f2633', [-0.3, 0.68, sd * 0.17], [0, 0, -0.25]); // canela
      });
      mg.sph(0.15, '#26272b', [-0.17, 1.6, 0]);                                            // capacete
      gm.box(0.06, 0.09, 0.2, '#22303c', [-0.3, 1.58, 0]);                                 // viseira
      gm.box(0.05, 0.1, 0.16, '#fff6dc', [-0.84, 0.86, 0]);                                // farol
    } else {
      mg.rbox(4.4, 0.75, 1.8, 0.25, colr, [0, 0.62, 0]);
      mg.rbox(2.4, 0.62, 1.66, 0.25, colr, [0.25, 1.22, 0]);
      gm.rbox(2.3, 0.5, 1.7, 0.2, '#22303c', [0.25, 1.24, 0]);
      [-1.4, 1.4].forEach((x) => [-0.82, 0.82].forEach((z) => mg.cyl(0.33, 0.33, 0.24, '#1a1a1c', [x, 0.33, z], [HP, 0, 0], 16)));
      gm.box(0.05, 0.12, 0.4, '#fff6dc', [-2.2, 0.75, 0.6]); gm.box(0.05, 0.12, 0.4, '#fff6dc', [-2.2, 0.75, -0.6]);
      gm.box(0.05, 0.12, 0.35, '#ff3030', [2.2, 0.8, 0.62]); gm.box(0.05, 0.12, 0.35, '#ff3030', [2.2, 0.8, -0.62]);
    }
  }

  P2.envs.carro = {
    name: 'Carro executivo',
    build(params0) {
      const own = new Owner();
      const root = new T.Group();
      root.name = 'env:carro';
      const L = M.lighting('dia', { area: 8 });
      root.add(L.group);
      L.sun.shadow.camera.far = 50;
      const ROAD = -0.42;
      // torres ao longe (paradas: o paralaxe lento delas contra a rua rolando dá profundidade)
      const CAR_TOWERS = [
        [0.05, 44, 14, 14, 34, 'vidro'], [0.5, 52, 12, 12, 52, 'concreto'], [-0.42, 50, 13, 13, 30, 'escuro'], [0.85, 62, 14, 12, 60, 'vidro'], [-0.8, 60, 12, 12, 44, 'concreto'],
        [PI + 0.1, 46, 14, 12, 40, 'concreto'], [PI + 0.48, 52, 12, 12, 28, 'vidro'], [PI - 0.4, 50, 13, 13, 56, 'escuro'], [PI + 0.85, 62, 14, 12, 48, 'vidro'], [PI - 0.82, 60, 12, 12, 36, 'concreto'],
      ];
      const city = buildCity(root, own, { seed: 63, horizonY: ROAD, towers: CAR_TOWERS, sunDir: [-0.8, 0.18, 0.55] });
      // ---------- rua (rola em +X)
      const street = M.group({ parent: root, name: 'rua', pos: [0, ROAD, 0] });
      const roadTex = texRepeat(asphaltTex(), 'asphalt-run', 10, 1);
      const roadMat = new T.MeshStandardMaterial({ map: roadTex, roughness: 0.92 });
      roadMat.map = roadTex.clone(); roadMat.map.needsUpdate = true; roadMat.map.repeat.set(10, 1);
      own.add(roadMat); own.add(roadMat.map);
      const road = new T.Mesh(M.planeGeo(80, 18), roadMat);
      road.rotation.x = -HP; road.receiveShadow = true;
      street.add(road);
      const swMat = new T.MeshStandardMaterial({ roughness: 0.9 });
      swMat.map = sidewalkTex().clone(); swMat.map.needsUpdate = true; swMat.map.wrapS = swMat.map.wrapT = T.RepeatWrapping; swMat.map.repeat.set(40, 2);
      own.add(swMat); own.add(swMat.map);
      [-1, 1].forEach((sd) => {
        const sw = new T.Mesh(M.planeGeo(80, 4), swMat);
        sw.rotation.x = -HP; sw.position.set(0, 0.16, sd * 7.6); sw.receiveShadow = true;
        street.add(sw);
        const curb = M.box(80, 0.18, 0.25, M.mat('#b9b5ad', { rough: 0.9 }), { parent: street, pos: [0, 0.08, sd * 5.65], cast: false });
        void curb;
      });
      // ilha ao fundo (chão "infinito")
      const ground = M.plane(240, 240, M.mat('#5a5850', { rough: 1 }), { parent: street, rot: [-HP, 0, 0], pos: [0, -0.05, 0], cast: false });
      void ground;
      // fileiras de prédios: geometria × 2 cópias para rolar sem emenda
      const LEN = 72;
      const atlas = signAtlas();
      const rows = [];
      const litMat = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); own.add(litMat);
      const signMat = new T.MeshBasicMaterial({ map: atlas, toneMapped: false, color: col('#dddddd') }); own.add(signMat);
      const glowMat = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); own.add(glowMat);
      const poolTex = ctex('pool', 128, 128, (ctx) => { const g2 = ctx.createRadialGradient(64, 64, 2, 64, 64, 62); g2.addColorStop(0, 'rgba(255,210,150,0.55)'); g2.addColorStop(1, 'rgba(255,210,150,0)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, 128, 128); }, false);
      const poolMat = new T.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true }); own.add(poolMat);
      // interior das lojas: sem iluminação de cena (parece aceso); a cor multiplica conforme a hora
      const shopMat = new T.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: col('#a39d93') }); own.add(shopMat);
      const paneMat = stdMat('car-shopglass', { color: '#d6e6f0', rough: 0.04, metal: 0.1, opacity: 0.2, env: 1.3, depthWrite: false });
      [-1, 1].forEach((sd, si) => {
        const gset = streetRow(own, sd, LEN, 101 + si * 17);
        const flat = [litMat, signMat, glowMat, poolMat, shopMat, paneMat];
        const pieces = [[gset.fac, vc(0.85, 0), true], [gset.win, GLOSS(), false], [gset.lit, litMat, false], [gset.sign, signMat, false], [gset.tree, vc(0.9, 0, 'tree'), true], [gset.pole, METAL(), true], [gset.glow, glowMat, false], [gset.pool, poolMat, false], [gset.shop, shopMat, false], [gset.pane, paneMat, false]];
        // 3 cópias (atrás, aqui, à frente): a rua nunca "acaba" dentro do alcance da névoa
        for (let copy = -1; copy < 2; copy++) {
          const g = M.group({ parent: street });
          pieces.forEach((pc) => {
            const m = new T.Mesh(pc[0], pc[1]);
            m.castShadow = pc[2]; m.receiveShadow = flat.indexOf(pc[1]) < 0;
            m.userData.piece = pc[1] === litMat ? 'lit' : pc[1] === glowMat ? 'glow' : pc[1] === poolMat ? 'pool' : '';
            if (pc[1] === paneMat) m.renderOrder = 2;
            g.add(m);
          });
          rows.push({ g, copy });
        }
      });
      // outros veículos
      const traffic = [];
      [['onibus', '#2f7fbf', -3.5, 1.8, 20], ['carro', '#f2f2ee', 3.5, -2.2, -6], ['moto', '#c0392b', 1.75, -5.5, 8], ['carro', '#8a1f2a', -3.5, 1.2, -24]].forEach((v) => {
        const mg = new Merger(), gm = new Merger();
        vehicle(mg, gm, v[0], v[1]);
        const g = M.group({ parent: street, pos: [v[4], 0, v[2]] });
        mg.build(stdMat('vc-paint', { vc: true, rough: 0.35, metal: 0.3, env: 0.8 }), own, { parent: g });
        if (!gm.empty()) gm.build(GLOSS(), own, { parent: g });
        traffic.push({ g, vrel: v[3], x0: v[4] });
      });

      // ---------- O CARRO (frente para −X) — sedã executivo preto
      // Casco + interior sempre visíveis; "estufa" (colunas B/C, vidros laterais, teto, vidro traseiro)
      // aparece só quando faz sentido (ver update): de fora e de cima vira um corte "conversível".
      const car = M.group({ parent: root, name: 'carro' });
      const PAINT = stdMat('car-paint', { color: '#101217', rough: 0.2, metal: 0.55, env: 1.3 });
      const TRIM = stdMat('car-trim', { color: '#2a2b30', rough: 0.6 });
      const LTH = '#c9a47c', LTH2 = '#a9835c';
      const ROOFY = 1.42;
      const tub = new T.Group(); tub.name = 'casco'; car.add(tub);
      const tb = new Merger();
      tb.rbox(5.0, 0.36, 1.84, 0.13, '#ffffff', [-0.06, -0.15, 0]);                 // assoalho / soleira
      tb.rbox(1.25, 0.5, 1.84, 0.18, '#ffffff', [-2.0, 0.3, 0], [0, 0, 0.07]);       // capô
      tb.rbox(0.3, 0.42, 1.8, 0.14, '#ffffff', [-2.5, 0.1, 0]);                      // para-choque dianteiro
      tb.rbox(1.0, 0.56, 1.84, 0.18, '#ffffff', [2.0, 0.38, 0], [0, 0, -0.04]);      // porta-malas
      tb.rbox(0.28, 0.42, 1.8, 0.14, '#ffffff', [2.4, 0.1, 0]);                      // para-choque traseiro
      [-1, 1].forEach((sd) => tb.rbox(3.35, 0.8, 0.12, 0.05, '#ffffff', [0.075, 0.3, sd * 0.86])); // portas (casca)
      tb.rbox(1.8, 0.28, 0.5, 0.1, '#ffffff', [-1.95, 0.05, 0]);                     // queixo
      tb.build(PAINT, own, { parent: tub });
      const tbT = new Merger();
      tbT.box(3.1, 0.04, 1.6, '#262220', [0.02, 0.005, 0]);                          // piso (carpete)
      tbT.box(0.3, 0.1, 1.66, '#1a1b1e', [-1.6, 0.62, 0]);                           // grade do capô (cowl)
      tbT.rbox(0.06, 0.24, 0.86, 0.03, '#0d0e10', [-2.66, 0.32, 0]);                 // grade
      tbT.rbox(0.05, 0.08, 1.5, 0.03, '#0d0e10', [-2.66, 0.02, 0]);                  // entrada de ar
      tbT.rbox(0.05, 0.08, 1.5, 0.03, '#0d0e10', [2.56, 0.02, 0]);                   // difusor
      // caixas de roda (meio-disco escuro atrás de cada pneu)
      const archGeo = new T.CylinderGeometry(0.42, 0.42, 0.02, 22, 1, false, HP, PI);
      own.add(archGeo);
      [[-1.65, 1], [-1.65, -1], [1.5, 1], [1.5, -1]].forEach((wp) => tbT.add(archGeo, '#08080a', [wp[0], -0.08, wp[1] * 0.928], [HP * wp[1], 0, 0]));
      // frisos das portas
      [-1, 1].forEach((sd) => {
        [-1.36, -0.12, 1.18].forEach((x) => tbT.box(0.006, 0.66, 0.004, '#050506', [x, 0.33, sd * 0.922]));
      });
      tbT.build(TRIM, own, { parent: tub });
      const tbC = new Merger();
      [-1, 1].forEach((sd) => {
        tbC.box(3.3, 0.022, 0.03, '#d9dde3', [0.08, 0.705, sd * 0.86]);               // friso cromado da cintura
        tbC.box(3.1, 0.02, 0.008, '#c4c8ce', [0.05, 0.0, sd * 0.925]);                // friso da soleira
        [-0.62, 0.58].forEach((x) => tbC.rbox(0.17, 0.028, 0.03, 0.01, '#d9dde3', [x, 0.56, sd * 0.93])); // maçanetas
      });
      for (let i = 0; i < 7; i++) tbC.box(0.02, 0.2, 0.012, '#c4c8ce', [-2.69, 0.32, -0.36 + i * 0.12]); // barras da grade
      tbC.box(0.02, 0.012, 0.86, '#d9dde3', [-2.69, 0.44, 0]);
      tbC.box(0.02, 0.012, 0.86, '#d9dde3', [-2.69, 0.2, 0]);
      tbC.box(0.012, 0.03, 1.5, '#d9dde3', [2.555, 0.3, 0]);                         // friso do porta-malas
      tbC.build(METAL(), own, { parent: tub });
      // placa Mercosul
      const plateTex = ctex('plate', 256, 80, (ctx, w, h) => {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1f3f9a'; ctx.fillRect(0, 0, w, h * 0.24);
        font(ctx, h * 0.16, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BRASIL', w / 2, h * 0.12);
        font(ctx, h * 0.55, 800); ctx.fillStyle = '#111'; ctx.fillText('PAI2A26', w / 2, h * 0.62);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, w - 4, h - 4);
      }, false);
      [[-2.67, -HP, 0.1], [2.56, HP, 0.16]].forEach((pp) => { const pl = new T.Mesh(M.planeGeo(0.4, 0.13), stdMat('plate', { map: plateTex, rough: 0.5 })); pl.position.set(pp[0], pp[2], 0); pl.rotation.y = pp[1]; tub.add(pl); });
      // faróis (LED) e lanterna em faixa
      const headMat = new T.MeshStandardMaterial({ color: col('#e8eef5'), emissive: col('#fff6dc'), emissiveIntensity: 0.25, roughness: 0.15 });
      const tailMat = new T.MeshStandardMaterial({ color: col('#7a1218'), emissive: col('#ff2020'), emissiveIntensity: 0.35, roughness: 0.2 });
      own.add(headMat); own.add(tailMat);
      const hl = new Merger();
      [-1, 1].forEach((sd) => { hl.rbox(0.08, 0.09, 0.4, 0.03, '#ffffff', [-2.6, 0.42, sd * 0.64]); hl.box(0.05, 0.015, 0.36, '#ffffff', [-2.635, 0.36, sd * 0.64]); });
      hl.build(headMat, own, { parent: tub, cast: false });
      const tl = new Merger();
      tl.rbox(0.05, 0.06, 1.66, 0.02, '#ffffff', [2.5, 0.52, 0]);
      [-1, 1].forEach((sd) => tl.rbox(0.06, 0.1, 0.32, 0.03, '#ffffff', [2.48, 0.5, sd * 0.7]));
      tl.build(tailMat, own, { parent: tub, cast: false });
      // facho dos faróis no asfalto (só à noite)
      const beamTex = ctex('beam', 128, 256, (ctx, w, h) => {
        const g2 = ctx.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, 'rgba(255,236,200,0)'); g2.addColorStop(0.5, 'rgba(255,236,200,0.28)'); g2.addColorStop(1, 'rgba(255,240,215,0.7)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(w * 0.28, h); ctx.lineTo(w * 0.72, h); ctx.lineTo(w, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
      }, false);
      const beamMat = new T.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, opacity: 0.85 });
      own.add(beamMat);
      const beam = new T.Mesh(M.planeGeo(4.2, 9), beamMat);
      beam.rotation.set(-HP, 0, HP); beam.position.set(-7.1, ROAD + 0.025, 0); beam.renderOrder = 1;
      beam.castShadow = false; beam.receiveShadow = false;
      car.add(beam);
      // rodas (aro de liga, 5 raios)
      const wheels = [];
      [[-1.65, 1], [-1.65, -1], [1.5, 1], [1.5, -1]].forEach((wp) => {
        const wg = M.group({ parent: car, pos: [wp[0], -0.08, wp[1] * 0.83] });
        const wm = new Merger();
        wm.cyl(0.34, 0.34, 0.24, '#151517', [0, 0, 0], [HP, 0, 0], 24);
        wm.cyl(0.24, 0.24, 0.245, '#8a8e96', [0, 0, 0], [HP, 0, 0], 22);
        for (let k = 0; k < 5; k++) wm.box(0.045, 0.42, 0.03, '#c4c8ce', [0, 0, wp[1] * 0.11], [0, 0, k * PI * 2 / 5]);
        wm.cyl(0.055, 0.055, 0.25, '#2a2b30', [0, 0, 0], [HP, 0, 0], 12);
        wm.build(METAL(), own, { parent: wg });
        wheels.push(wg);
      });
      // ---------- interior
      const qTex = ctex('quilt3', 256, 256, (ctx, w, h) => {
        // couro capitonê em losangos: vincos macios + pesponto claro + leve granulado (lê como couro, não madeira)
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
        const n = 4, s3 = w / n;
        // volume de cada gomo (losango): luz em cima, sombra embaixo
        for (let i = -1; i <= n; i++) for (let j = -1; j <= n * 2; j++) {
          const cx = i * s3 + (j % 2 ? 0 : s3 / 2), cy = j * s3 / 2;
          const g = ctx.createRadialGradient(cx, cy - s3 * 0.12, 2, cx, cy, s3 * 0.62);
          g.addColorStop(0, 'rgba(255,250,240,0.24)'); g.addColorStop(0.65, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(70,40,20,0.18)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy - s3 / 2); ctx.lineTo(cx + s3 / 2, cy); ctx.lineTo(cx, cy + s3 / 2); ctx.lineTo(cx - s3 / 2, cy); ctx.closePath(); ctx.fill();
        }
        // vincos (diagonais) + pesponto
        const diag = (k, dir) => { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + dir * h, h); ctx.stroke(); };
        for (let k = -w; k <= w * 2; k += s3) {
          ctx.strokeStyle = 'rgba(60,34,16,0.30)'; ctx.lineWidth = 3; diag(k, 1); diag(k, -1);
          ctx.strokeStyle = 'rgba(255,240,215,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.save(); ctx.translate(2.5, 0); diag(k, 1); diag(k, -1); ctx.restore(); ctx.setLineDash([]);
        }
        // botões nos cruzamentos
        for (let i = 0; i <= n; i++) for (let j = 0; j <= n * 2; j++) {
          const cx = i * s3 + (j % 2 ? s3 / 2 : 0), cy = j * s3 / 2;
          ctx.fillStyle = 'rgba(50,28,12,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, PI * 2); ctx.fill();
        }
        noise(ctx, w, h, 0.08, 19);
      });
      // nas caixas arredondadas a face plana usa só o miolo da UV (0,4…0,6): repetir 4× dá ~3 gomos por face
      const QUILT = stdMat('vc-quilt', { vc: true, map: texRepeat(qTex, 'quilt3r', 4, 4), rough: 0.48, env: 0.3 });
      const inQ = new Merger();
      const inL = new Merger();
      // banco traseiro (2 lugares + apoio central)
      // (encostos reclinados para trás = giro negativo em Z, já que a frente do carro é −X)
      [-1, 1].forEach((sd) => {
        const z = sd * 0.37;
        inQ.rbox(0.62, 0.15, 0.5, 0.07, LTH, [0.55, 0.385, z]);
        inQ.rbox(0.17, 0.66, 0.46, 0.06, LTH, [0.93, 0.8, z], [0, 0, -0.2]);
        [-1, 1].forEach((b) => inL.rbox(0.13, 0.62, 0.075, 0.035, LTH2, [0.895, 0.8, z + b * 0.235], [0, 0, -0.2])); // abas laterais
        inL.rbox(0.1, 0.21, 0.27, 0.035, LTH2, [1.035, 1.255, z], [0, 0, -0.2]);      // encosto de cabeça
        inL.rbox(0.62, 0.06, 0.04, 0.02, LTH2, [0.55, 0.39, z + sd * 0.25]);          // vivo lateral
        inL.rbox(0.5, 0.035, 0.012, 0.006, LTH2, [0.56, 0.462, z], null);             // costura do assento
      });
      inL.rbox(0.66, 0.22, 1.16, 0.06, LTH2, [0.58, 0.2, 0]);                          // base do banco
      inL.rbox(0.5, 0.1, 0.22, 0.05, LTH2, [0.62, 0.56, 0]);                           // apoio de braço central
      // bancos dianteiros: assento, encosto esculpido, encosto de cabeça com hastes
      [-1, 1].forEach((sd) => {
        const z = sd * 0.38;
        inQ.rbox(0.52, 0.13, 0.48, 0.06, LTH, [-0.76, 0.41, z]);
        inL.rbox(0.42, 0.28, 0.42, 0.05, '#2a2622', [-0.76, 0.18, z]);
        inL.rbox(0.15, 0.6, 0.48, 0.05, LTH, [-0.43, 0.76, z], [0, 0, -0.14]);
        inL.rbox(0.014, 0.48, 0.38, 0.006, LTH2, [-0.352, 0.77, z], [0, 0, -0.14]);       // painel de couro das costas
        inL.rbox(0.13, 0.11, 0.44, 0.04, LTH2, [-0.385, 1.1, z], [0, 0, -0.14]);          // ombro
        [-1, 1].forEach((b) => inL.rbox(0.17, 0.5, 0.06, 0.03, LTH2, [-0.445, 0.76, z + b * 0.235], [0, 0, -0.14])); // abas
        inL.rbox(0.1, 0.19, 0.27, 0.035, LTH2, [-0.37, 1.32, z], [0, 0, -0.1]);            // encosto de cabeça
        inL.rbox(0.02, 0.05, 0.42, 0.01, '#7a5638', [-0.373, 0.62, z], [0, 0, -0.14]); // bolso do encosto
      });
      inQ.build(QUILT, own, { parent: car });
      inL.build(LEATHER(), own, { parent: car });
      const inD = new Merger();
      // painel (mais baixo à frente, para não atravessar o para-brisa)
      inD.rbox(0.34, 0.28, 1.58, 0.07, '#24252a', [-1.27, 0.72, 0]);
      inD.rbox(0.34, 0.05, 1.56, 0.025, '#2e2f35', [-1.25, 0.87, 0], [0, 0, -0.12]);
      [-0.55, -0.2, 0.2, 0.55].forEach((z) => inD.rbox(0.02, 0.05, 0.16, 0.01, '#0d0e10', [-1.095, 0.8, z])); // saídas de ar
      // console central
      inD.rbox(0.7, 0.42, 0.24, 0.05, '#24252a', [-0.82, 0.21, 0]);
      inD.rbox(0.36, 0.07, 0.24, 0.03, LTH2, [-0.6, 0.45, 0]);
      inD.box(0.08, 0.06, 0.04, '#bfc3c9', [-0.95, 0.45, 0]);
      inD.cyl(0.035, 0.035, 0.32, '#24252a', [-1.2, 0.86, 0.38], [0, 0, 1.1]);         // coluna de direção
      inD.box(0.5, 0.012, 0.42, '#1a1a1c', [0.1, 0.03, -0.37]);                         // tapetes
      inD.box(0.5, 0.012, 0.42, '#1a1a1c', [0.1, 0.03, 0.37]);
      // forros das portas (sempre visíveis, por dentro da casca)
      [-1, 1].forEach((sd) => {
        inD.rbox(3.0, 0.52, 0.05, 0.03, '#2a2622', [0.05, 0.38, sd * 0.785]);
        inD.rbox(0.2, 0.12, 0.05, 0.03, '#141416', [-0.9, 0.27, sd * 0.762]);         // alto-falante
        inD.rbox(0.2, 0.12, 0.05, 0.03, '#141416', [0.4, 0.27, sd * 0.762]);
      });
      inD.build(TRIM, own, { parent: car });
      const inDL = new Merger();
      [-1, 1].forEach((sd) => {
        inDL.rbox(2.6, 0.08, 0.07, 0.025, LTH, [0.05, 0.57, sd * 0.76]);               // apoio de braço da porta
        inDL.rbox(0.9, 0.24, 0.02, 0.02, LTH2, [0.5, 0.4, sd * 0.758]);                 // painel de couro
        inDL.rbox(0.8, 0.24, 0.02, 0.02, LTH2, [-0.75, 0.4, sd * 0.758]);
      });
      inDL.build(LEATHER(), own, { parent: car });
      const inW = new Merger();
      inW.box(0.02, 0.05, 1.5, '#ffffff', [-1.09, 0.73, 0]);                            // faixa de madeira no painel
      inW.box(0.3, 0.012, 0.2, '#ffffff', [-0.85, 0.425, 0]);
      [-1, 1].forEach((sd) => inW.box(2.7, 0.035, 0.012, '#ffffff', [0.05, 0.64, sd * 0.752])); // filete de madeira nas portas
      inW.build(WOOD(), own, { parent: car });
      const inM = new Merger();
      inM.tor(0.17, 0.022, '#1c1d21', [-1.08, 0.94, 0.38], [0, HP, 0.45, 'YXZ']);      // volante
      inM.cyl(0.05, 0.05, 0.04, '#3a3b40', [-1.09, 0.935, 0.38], [0, 0, 1.12]);
      [-1, 1].forEach((sd) => {
        // hastes cromadas dos encostos de cabeça
        inM.cyl(0.007, 0.007, 0.12, '#c4c8ce', [-0.38, 1.2, sd * 0.38 - 0.07], [0, 0, -0.1]);
        inM.cyl(0.007, 0.007, 0.12, '#c4c8ce', [-0.38, 1.2, sd * 0.38 + 0.07], [0, 0, -0.1]);
        inM.rbox(0.1, 0.02, 0.03, 0.008, '#c4c8ce', [0.1, 0.58, sd * 0.725]);           // puxador interno
      });
      // suporte do celular preso às hastes do encosto do passageiro (de frente para o banco de trás)
      inM.box(0.022, 0.026, 0.2, '#1c1d21', [-0.372, 1.2, -0.38]);                          // barra presa às hastes
      inM.box(0.018, 0.216, 0.018, '#1c1d21', [-0.2875, 1.11, -0.38], [0, 0, -2.406]);     // braço
      inM.rbox(0.012, 0.18, 0.095, 0.005, '#1c1d21', [-0.204, 0.99, -0.38]);               // berço
      [-1, 1].forEach((k) => inM.box(0.026, 0.012, 0.05, '#1c1d21', [-0.193, 0.99 + k * 0.086, -0.38])); // garras
      inM.build(METAL(), own, { parent: car });
      // celular no suporte
      const phoneG = M.group({ parent: car, pos: [-0.19, 0.99, -0.38], rot: [0, HP, 0] });
      const pb = new Merger();
      pb.rbox(0.08, 0.16, 0.01, 0.008, '#1a1b1f', [0, 0, 0]);
      pb.build(GLOSS(), own, { parent: phoneG });
      const phone = makeScreen(own, 0.072, 0.15, 288, 600);
      phone.mesh.position.set(0, 0, 0.0055);
      phoneG.add(phone.mesh);
      phoneG.rotation.set(-0.12, HP, 0, 'YXZ');
      const phoneGlow = M.glow('#bcd4ff', 0.35, 0); own.add(phoneGlow.material); phoneGlow.position.set(-0.17, 0.99, -0.38); car.add(phoneGlow);
      // tela do painel (navegação) e quadro de instrumentos
      const nav = makeScreen(own, 0.3, 0.17, 320, 180);
      nav.mesh.position.set(-1.12, 0.98, 0); nav.mesh.rotation.set(0, HP, 0);
      nav.draw('nav', drawNav);
      car.add(nav.mesh);
      const navB = new Merger();
      navB.rbox(0.03, 0.19, 0.33, 0.01, '#141416', [-1.137, 0.98, 0]);
      navB.build(GLOSS(), own, { parent: car });
      const cluster = makeScreen(own, 0.26, 0.09, 260, 90);
      cluster.mesh.position.set(-1.16, 0.92, 0.38); cluster.mesh.rotation.set(0, HP, 0);
      cluster.draw('cl', (ctx, w, h) => { ctx.fillStyle = '#0c0f16'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#4ac0ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w * 0.25, h * 0.6, h * 0.38, PI, PI * 1.8); ctx.stroke(); ctx.beginPath(); ctx.arc(w * 0.75, h * 0.6, h * 0.38, PI * 1.2, PI * 2); ctx.stroke(); font(ctx, h * 0.3, 800); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('48', w * 0.5, h * 0.55); });
      car.add(cluster.mesh);
      // ---------- estufa (vidros com reflexo rolando + colunas + teto)
      const streakTex = ctex('streak2', 512, 128, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.62)'; ctx.fillRect(0, 0, w, h);
        const rr2 = M.rng(5);
        for (let i = 0; i < 26; i++) {
          const x = rr2() * w, ww = 10 + rr2() * 80;
          const g = ctx.createLinearGradient(x, 0, x + ww, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.12 + rr2() * 0.3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(x, 0, ww, h);
        }
      });
      const glassMat = new T.MeshStandardMaterial({ color: col('#3e4a56'), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.34, depthWrite: false, map: streakTex.clone(), side: T.DoubleSide });
      glassMat.map.needsUpdate = true; glassMat.map.wrapS = T.RepeatWrapping; glassMat.map.repeat.set(0.5, 1);
      glassMat.userData.wantsEnv = 1.4;
      own.add(glassMat); own.add(glassMat.map);
      // para-brisa + colunas A (sempre visíveis)
      const frontG = M.group({ parent: car, name: 'para-brisa' });
      const aLen = Math.hypot(0.77, 0.76), aAng = Math.atan2(0.77, 0.76);
      const fa = new Merger();
      [-1, 1].forEach((sd) => fa.rbox(0.07, aLen, 0.07, 0.02, '#ffffff', [-1.235, 1.04, sd * 0.8], [0, 0, -aAng]));
      fa.rbox(0.09, 0.06, 1.66, 0.025, '#ffffff', [-0.86, 1.425, 0]);                  // travessa do para-brisa
      fa.build(PAINT, own, { parent: frontG });
      const ws = new T.Mesh(M.planeGeo(1.56, aLen), glassMat);
      ws.position.set(-1.235, 1.04, 0); ws.rotation.set(0, -HP, 0); ws.rotateX(-aAng); ws.renderOrder = 3; ws.castShadow = false;
      frontG.add(ws);
      const rv = new Merger();
      rv.rbox(0.05, 0.06, 0.24, 0.02, '#1c1d21', [-0.9, 1.33, 0]);                    // retrovisor interno
      rv.box(0.012, 0.08, 0.012, '#1c1d21', [-0.88, 1.38, 0]);
      [-1, 1].forEach((sd) => rv.rbox(0.2, 0.12, 0.16, 0.04, '#101217', [-1.45, 0.8, sd * 0.99])); // retrovisores externos
      rv.build(SATIN(), own, { parent: frontG });
      // laterais de cima (colunas B/C, vidros, frisos) — uma por lado
      const sides = [];
      const dlo = (sd) => {
        const s2 = new T.Shape();
        const P = [[-1.55, 0.72], [1.66, 0.72], [1.02, 1.385], [-0.87, 1.385]];
        P.forEach((p, i) => (i ? s2.lineTo(p[0] * sd, p[1]) : s2.moveTo(p[0] * sd, p[1])));
        const g2 = new T.ShapeGeometry(s2);
        // UV ao longo do comprimento (para o reflexo rolar)
        const pa = g2.attributes.position, uv = g2.attributes.uv;
        for (let i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) * sd + 1.6) / 3.3, (pa.getY(i) - 0.72) / 0.67);
        own.add(g2);
        return g2;
      };
      [-1, 1].forEach((sd) => {
        const g = M.group({ parent: car, name: sd > 0 ? 'lado-esq' : 'lado-dir' });
        const sm = new Merger();
        const cLen = Math.hypot(0.7, 0.72), cAng = Math.atan2(0.7, 0.72);
        sm.box(0.1, 0.7, 0.07, '#ffffff', [-0.12, 1.05, sd * 0.8]);                    // coluna B
        sm.box(0.3, cLen, 0.07, '#ffffff', [1.38, 1.06, sd * 0.8], [0, 0, cAng]);       // coluna C (larga: privacidade)
        sm.build(PAINT, own, { parent: g });
        const ch = new Merger();
        ch.box(1.9, 0.02, 0.02, '#d9dde3', [0.075, 1.395, sd * 0.815]);                 // friso cromado do teto
        ch.build(METAL(), own, { parent: g });
        const gl = new T.Mesh(sd > 0 ? dlo(1) : dlo(-1), glassMat);
        gl.position.z = sd * 0.81; if (sd < 0) gl.rotation.y = PI;
        gl.renderOrder = 3; gl.castShadow = false;
        g.add(gl);
        sides.push({ g, sd });
      });
      // vidro traseiro
      const rearG = M.group({ parent: car, name: 'vidro-traseiro' });
      const rLen = Math.hypot(0.7, 0.72), rAng = Math.atan2(0.7, 0.72);
      const rw = new T.Mesh(M.planeGeo(1.5, rLen), glassMat);
      rw.position.set(1.35, 1.06, 0); rw.rotation.set(0, HP, 0); rw.rotateX(-rAng); rw.renderOrder = 3; rw.castShadow = false;
      rearG.add(rw);
      // teto + forro + luz de cortesia
      const roofG = M.group({ parent: car, name: 'teto' });
      const rf = new Merger();
      rf.rbox(1.95, 0.07, 1.66, 0.035, '#ffffff', [0.075, 1.445, 0]);
      rf.build(PAINT, own, { parent: roofG });
      const hlin = new Merger();
      hlin.box(1.88, 0.02, 1.56, '#d8d2c6', [0.075, 1.4, 0]);
      hlin.box(0.12, 0.02, 0.2, '#f6f0e2', [0.3, 1.385, 0]);
      [-1, 1].forEach((sd) => hlin.rbox(0.3, 0.03, 0.06, 0.012, '#cfc8bb', [0.55, 1.375, sd * 0.66])); // alças
      hlin.build(FABRIC(), own, { parent: roofG });
      const domeLight = new T.PointLight('#ffe6c4', 0, 2.6, 2);
      domeLight.position.set(0.25, 1.25, 0); car.add(domeLight);
      // motorista (silhueta com o rig, se disponível)
      let driver = null;
      try {
        if (P2.rig && P2.rig.human) {
          driver = P2.rig.human({ skin: 'medio', height: 1, hair: { style: 'curto', color: '#1c1a1a' }, top: { kind: 'blazer', color: '#1a1e28', shirt: '#eef1f5', tie: '#1a1e28' }, pants: '#1a1e28', shoes: '#111' });
          const fake = { anim: 'sit', animT: 0.5, t: 0.5, expr: 'neutro', talking: false, blink: false, walkT: 0, props: {}, alpha: 1, look: null, lookYaw: 0 };
          driver.update(0, fake);
          const J = driver.joints;
          if (J) {
            ['shR', 'shL'].forEach((k, i) => J[k] && J[k].rotation.set(-1.25, 0, i ? 0.18 : -0.18));
            ['elR', 'elL'].forEach((k, i) => J[k] && J[k].rotation.set(-0.35, 0, i ? -0.1 : 0.1));
          }
          driver.root.position.set(-0.72, 0, 0.38);
          driver.root.rotation.y = -HP;
          car.add(driver.root);
          // quepe
          if (J && J.head) {
            const cap = new Merger();
            const hr = 0.172;
            cap.cyl(hr * 1.02, hr * 1.06, 0.1, '#141820', [0, hr * 1.72, -0.01], [-0.12, 0, 0], 24);
            cap.cyl(hr * 1.1, hr * 1.02, 0.03, '#141820', [0, hr * 2.02, -0.03], [-0.12, 0, 0], 24);
            cap.cyl(hr * 0.75, hr * 0.75, 0.012, '#0c0e14', [0, hr * 1.5, hr * 0.85], [0.18, 0, 0], 20);
            cap.tor(hr * 1.04, 0.008, '#c9a25e', [0, hr * 1.58, -0.005], [HP - 0.12, 0, 0]);
            cap.build(SATIN(), own, { parent: J.head });
          }
        }
      } catch (e) { driver = null; }
      if (!driver) {
        const dm = new Merger();
        dm.add(M.capsuleGeo(0.2, 0.42), '#1a1e28', [-0.72, 0.85, 0.38]);
        dm.sph(0.12, '#2a2020', [-0.72, 1.28, 0.38]);
        dm.build(SATIN(), own, { parent: car });
      }

      // a visibilidade da estufa é controlada em update() (não pelo motor): ver comentário lá
      const walls = [];
      const _cp = new T.Vector3();
      function cutaway(cam) {
        if (!cam) return;
        _cp.copy(cam.position); car.worldToLocal(_cp);
        const inside = _cp.x > -1.6 && _cp.x < 1.75 && Math.abs(_cp.z) < 0.84 && _cp.y < ROOFY;
        const below = _cp.y < ROOFY - 0.02;
        roofG.visible = below;
        sides.forEach((s2) => { s2.g.visible = inside || (below && _cp.z * s2.sd < 0.8); });
        rearG.visible = inside || (below && _cp.x < 1.3);
      }

      // ================= parâmetros
      let curTime = null, curPhone = null, off = 0, speedK = 1, chatPhase = 0, lastP = params0 || {};
      function setTime(tm) {
        if (!CAR_LIGHT[tm]) tm = 'dia';
        if (tm === curTime) return;
        curTime = tm;
        const P = CAR_LIGHT[tm];
        L.set(P);
        city.setTime(tm);
        const night = tm === 'noite', dusk = tm === 'tarde';
        rows.forEach((rw2) => rw2.g.children.forEach((m) => {
          if (m.userData.piece === 'lit') m.visible = night || dusk;
          if (m.userData.piece === 'glow' || m.userData.piece === 'pool') m.visible = night || dusk;
        }));
        litMat.color.set(night ? '#ffffff' : '#9a8a70');
        poolMat.opacity = night ? 1 : 0.4;
        signMat.color.set(night ? '#ffffff' : '#d8d8d8');
        shopMat.color.set(night ? '#ffffff' : dusk ? '#c9bfb2' : '#a39d93');
        headMat.emissiveIntensity = night ? 1.6 : 0.2;
        beam.visible = night;
        tailMat.emissiveIntensity = night ? 1.4 : 0.3;
        domeLight.intensity = P.inner;
        roadMat.color.set(night ? '#8a8a9a' : '#ffffff');
        const e = envMap('car-' + tm, CAR_ENV[tm]);
        if (e) applyEnv(root, e, night ? 0.7 : 1);
      }
      const env = {
        root,
        background: '#9fb2c4',
        fog: { color: '#c3d6e6', near: 20, far: 100 },
        walls,
        spots: {
          banco: { x: 0.55, z: -0.37, rot: -HP },
          banco2: { x: 0.55, z: 0.37, rot: -HP },
          centro: { x: 0.62, z: 0, rot: -HP, y: 0.95 },
          motorista: { x: -0.72, z: 0.38, rot: -HP },
          // primeira pessoa: o pai já começa sentado no banco (não há onde andar)
          inicio: { x: 0.55, z: -0.37, rot: -HP },
          celular: { x: 0.55, z: -0.37, rot: -HP },
          janela: { x: 0.55, z: -0.37, rot: PI },
        },
        bounds: { minX: 0.3, maxX: 0.8, minZ: -0.5, maxZ: 0.5 },
        colliders: [],
        shots: {
          geral: { target: [0.05, 0.85, 0], yaw: 0.32, pitch: 0.2, dist: 5.4, fov: 40 },
          banco: { target: [0.52, 1.02, -0.37], yaw: -0.3, pitch: 0.06, dist: 1.95, fov: 38 },
          frente: { target: [0.1, 0.95, 0], yaw: -HP + 0.18, pitch: 0.1, dist: 4.2, fov: 38 },
          janela: { target: [0.4, 1.05, -0.9], yaw: 0.25, pitch: 0.22, dist: 1.5, fov: 44 },
          celular: { target: [-0.19, 1.0, -0.38], yaw: HP - 0.1, pitch: 0.12, dist: 0.75, fov: 36 },
          alto: { target: [0, 0.6, 0], yaw: 0.5, pitch: 1.0, dist: 6.2, fov: 40 },
        },
        defaultShot: 'geral',
        setParams(p) {
          p = p || {};
          lastP = p;
          setTime(p.time || 'dia');
          city.applyFog();
          speedK = p.speed == null ? 1 : clamp(+p.speed, 0, 1.5);
          const pm = p.phone || 'chat';
          phone.draw(pm + JSON.stringify(p.chat || null), (ctx, w, h) => drawPhone(pm, ctx, w, h, { chat: p.chat, typing: p.typing, phase: chatPhase }));
          curPhone = pm;
          const f = P2.core && P2.core.scene && P2.core.scene.fog;
          if (f) { f.near = 16; f.far = curTime === 'noite' ? 80 : 90; }
        },
        update(t, p, dt) {
          dt = dt || 0;
          city.update(t);
          const v = 9 * speedK;
          off = (off + v * dt) % LEN;
          rows.forEach((rw2) => (rw2.g.position.x = off - rw2.copy * LEN - LEN / 2));
          roadMat.map.offset.x = -(off / 8) % 1;
          swMat.map.offset.x = -(off / 2) % 1;
          wheels.forEach((w) => (w.rotation.z += (v * dt) / 0.34));
          traffic.forEach((tr) => {
            tr.x0 += (tr.vrel * speedK + (speedK === 0 ? 0 : 0)) * dt;
            if (tr.x0 > 40) tr.x0 -= 80; if (tr.x0 < -40) tr.x0 += 80;
            tr.g.position.x = tr.x0;
          });
          glassMat.map.offset.x = (glassMat.map.offset.x + v * dt * 0.02) % 1;
          // leve vibração da carroceria
          car.position.y = Math.sin(t * 13) * 0.003 * speedK + Math.sin(t * 2.1) * 0.002 * speedK;
          // corte "casa de bonecas" do carro: por dentro tudo aparece; de fora some o lado de cá
          // (vidro + colunas); de cima some também o teto e o resto da estufa (corte conversível)
          cutaway(P2.core && P2.core.camera);
          // celular: "digitando…"
          if (curPhone === 'chat' && (p || lastP).typing !== false) {
            const ph = Math.floor(t * 5) / 5 % 1;
            if (ph !== chatPhase) { chatPhase = ph; const pp = p || lastP; phone.draw(null, (ctx, w, h) => drawPhone('chat', ctx, w, h, { chat: pp.chat, typing: pp.typing, phase: chatPhase })); phone.key = null; }
          }
        },
        dispose() { own.dispose(); if (driver && driver.dispose) driver.dispose(); },
      };
      env.setParams(params0 || {});
      return env;
    },
  };
})();

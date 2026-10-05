/* PAI 2.0 — m3d.js
 * Ferramentas 3D sobre o Three.js: materiais com cache, caixa arredondada,
 * céu em degradê, texturas desenhadas em canvas, placas de texto, luzes
 * prontas por hora do dia e utilitários de montagem de cenário.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = (P2.m3d = {});

  // ------------------------------------------------------------------
  // Cores
  // ------------------------------------------------------------------
  M.color = (c) => (c instanceof T.Color ? c : new T.Color(c));
  M.mix = (a, b, t) => M.color(a).clone().lerp(M.color(b), t);
  M.hex = (c) => '#' + M.color(c).getHexString();

  // ------------------------------------------------------------------
  // Materiais (com cache — compartilhar material é muito mais leve)
  // ------------------------------------------------------------------
  const matCache = new Map();
  /**
   * Material padrão "massinha" (fosco e suave).
   * opts: {rough, metal, emissive, emissiveIntensity, transparent, opacity, side, flat, unique}
   */
  M.mat = function (color, opts) {
    opts = opts || {};
    const key = opts.unique ? null : JSON.stringify([M.hex(color), opts.rough, opts.metal, opts.emissive && M.hex(opts.emissive), opts.emissiveIntensity, opts.transparent, opts.opacity, opts.side, opts.flat]);
    if (key && matCache.has(key)) return matCache.get(key);
    const m = new T.MeshStandardMaterial({
      color: M.color(color),
      roughness: opts.rough == null ? 0.72 : opts.rough,
      metalness: opts.metal == null ? 0.0 : opts.metal,
      flatShading: !!opts.flat,
    });
    if (opts.emissive) { m.emissive = M.color(opts.emissive); m.emissiveIntensity = opts.emissiveIntensity == null ? 1 : opts.emissiveIntensity; }
    if (opts.transparent || (opts.opacity != null && opts.opacity < 1)) { m.transparent = true; m.opacity = opts.opacity == null ? 1 : opts.opacity; }
    if (opts.side === 'double') m.side = T.DoubleSide;
    if (opts.side === 'back') m.side = T.BackSide;
    if (key) matCache.set(key, m);
    return m;
  };
  /** Material sem luz (telas, céus, brilhos). */
  M.basic = function (color, opts) {
    opts = opts || {};
    const key = 'b' + JSON.stringify([M.hex(color), opts.transparent, opts.opacity, opts.side, opts.fog]);
    if (!opts.unique && matCache.has(key)) return matCache.get(key);
    const m = new T.MeshBasicMaterial({ color: M.color(color) });
    if (opts.transparent || (opts.opacity != null && opts.opacity < 1)) { m.transparent = true; m.opacity = opts.opacity == null ? 1 : opts.opacity; m.depthWrite = false; }
    if (opts.side === 'double') m.side = T.DoubleSide;
    if (opts.fog === false) m.fog = false;
    if (!opts.unique) matCache.set(key, m);
    return m;
  };
  /** Vidro simples. */
  M.glass = (tint, opacity) => M.mat(tint || '#bfe3ff', { rough: 0.08, metal: 0.1, opacity: opacity == null ? 0.25 : opacity, transparent: true });

  // ------------------------------------------------------------------
  // Geometrias
  // ------------------------------------------------------------------
  const geoCache = new Map();
  function cached(key, make) {
    if (geoCache.has(key)) return geoCache.get(key);
    const g = make();
    geoCache.set(key, g);
    return g;
  }
  /** Caixa com cantos arredondados (algoritmo do RoundedBoxGeometry do three.js). */
  M.roundedBoxGeo = function (w, h, d, r, segments) {
    segments = segments == null ? 3 : segments;
    r = Math.min(w / 2, h / 2, d / 2, r == null ? 0.05 : r);
    const key = ['rb', w, h, d, r, segments].map((v) => (typeof v === 'number' ? v.toFixed(4) : v)).join('|');
    return cached(key, () => {
      const seg = segments * 2 + 1;
      const box = new T.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
      const pos = box.attributes.position.array;
      const nor = box.attributes.normal.array;
      const half = new T.Vector3(w, h, d).divideScalar(2).subScalar(r);
      const p = new T.Vector3(), n = new T.Vector3();
      const hs = 0.5 / seg;
      for (let i = 0; i < pos.length; i += 3) {
        p.fromArray(pos, i);
        n.copy(p);
        n.x -= Math.sign(n.x) * hs;
        n.y -= Math.sign(n.y) * hs;
        n.z -= Math.sign(n.z) * hs;
        n.normalize();
        pos[i] = half.x * Math.sign(p.x) + n.x * r;
        pos[i + 1] = half.y * Math.sign(p.y) + n.y * r;
        pos[i + 2] = half.z * Math.sign(p.z) + n.z * r;
        nor[i] = n.x; nor[i + 1] = n.y; nor[i + 2] = n.z;
      }
      box.attributes.position.needsUpdate = true;
      box.attributes.normal.needsUpdate = true;
      return box;
    });
  };
  M.boxGeo = (w, h, d) => cached(['b', w, h, d].join('|'), () => new T.BoxGeometry(w, h, d));
  M.sphereGeo = (r, ws, hs) => cached(['s', r, ws, hs].join('|'), () => new T.SphereGeometry(r, ws || 24, hs || 16));
  M.capsuleGeo = (r, len, cs, rs) => cached(['c', r, len, cs, rs].join('|'), () => new T.CapsuleGeometry(r, len, cs || 6, rs || 14));
  M.cylGeo = (rt, rb, h, seg, open) => cached(['y', rt, rb, h, seg, open].join('|'), () => new T.CylinderGeometry(rt, rb, h, seg || 20, 1, !!open));
  M.torusGeo = (r, tube, rs, ts, arc) => cached(['t', r, tube, rs, ts, arc].join('|'), () => new T.TorusGeometry(r, tube, rs || 8, ts || 24, arc == null ? Math.PI * 2 : arc));
  M.planeGeo = (w, h) => cached(['p', w, h].join('|'), () => new T.PlaneGeometry(w, h));
  M.coneGeo = (r, h, seg) => cached(['k', r, h, seg].join('|'), () => new T.ConeGeometry(r, h, seg || 16));

  // ------------------------------------------------------------------
  // Construtores de malhas (com sombra ligada por padrão)
  // ------------------------------------------------------------------
  function mesh(geo, mat, o) {
    const m = new T.Mesh(geo, mat);
    o = o || {};
    m.castShadow = o.cast !== false;
    m.receiveShadow = o.receive !== false;
    if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.scale) { if (Array.isArray(o.scale)) m.scale.set(o.scale[0], o.scale[1], o.scale[2]); else m.scale.setScalar(o.scale); }
    if (o.parent) o.parent.add(m);
    if (o.name) m.name = o.name;
    return m;
  }
  M.mesh = mesh;
  /** Caixa arredondada pronta. color pode ser material. */
  M.rbox = (w, h, d, r, color, o) => mesh(M.roundedBoxGeo(w, h, d, r), color && color.isMaterial ? color : M.mat(color), o);
  M.box = (w, h, d, color, o) => mesh(M.boxGeo(w, h, d), color && color.isMaterial ? color : M.mat(color), o);
  M.sphere = (r, color, o) => mesh(M.sphereGeo(r), color && color.isMaterial ? color : M.mat(color), o);
  M.capsule = (r, len, color, o) => mesh(M.capsuleGeo(r, len), color && color.isMaterial ? color : M.mat(color), o);
  M.cyl = (rt, rb, h, color, o) => mesh(M.cylGeo(rt, rb, h, o && o.seg, o && o.open), color && color.isMaterial ? color : M.mat(color), o);
  M.torus = (r, tube, color, o) => mesh(M.torusGeo(r, tube, 8, 28, o && o.arc), color && color.isMaterial ? color : M.mat(color), o);
  M.plane = (w, h, color, o) => mesh(M.planeGeo(w, h), color && color.isMaterial ? color : M.mat(color), o);
  M.cone = (r, h, color, o) => mesh(M.coneGeo(r, h), color && color.isMaterial ? color : M.mat(color), o);
  M.group = function (o) {
    const g = new T.Group();
    o = o || {};
    if (o.pos) g.position.set(o.pos[0], o.pos[1], o.pos[2]);
    if (o.rot) g.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
    if (o.scale) { if (Array.isArray(o.scale)) g.scale.set(o.scale[0], o.scale[1], o.scale[2]); else g.scale.setScalar(o.scale); }
    if (o.parent) o.parent.add(g);
    if (o.name) g.name = o.name;
    return g;
  };
  M.shadows = function (obj, cast, receive) {
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
    return obj;
  };

  // ------------------------------------------------------------------
  // Texturas em canvas
  // ------------------------------------------------------------------
  /** Cria textura desenhando num canvas 2D. draw(ctx, w, h). */
  M.canvasTex = function (w, h, draw, opts) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new T.CanvasTexture(c);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    if (opts && opts.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
    t.userData.canvas = c;
    t.userData.redraw = (fn) => { fn(ctx, w, h); t.needsUpdate = true; };
    return t;
  };
  /** Placa com texto (para telas, quadros, letreiros). */
  M.textPanel = function (w, h, opts) {
    opts = opts || {};
    const px = opts.px || 256;
    const cw = Math.round(px * (w / h)), ch = px;
    const tex = M.canvasTex(cw, ch, (ctx) => drawText(ctx, cw, ch, opts));
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: !!opts.transparent, toneMapped: false });
    const m = new T.Mesh(M.planeGeo(w, h), mat);
    m.userData.setText = (o2) => { Object.assign(opts, o2); tex.userData.redraw((ctx) => drawText(ctx, cw, ch, opts)); };
    return m;
  };
  function drawText(ctx, w, h, o) {
    ctx.clearRect(0, 0, w, h);
    if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h); }
    if (o.draw) o.draw(ctx, w, h);
    const lines = [].concat(o.text || []);
    const size = o.size || Math.round(h / Math.max(3, lines.length + 1.5));
    ctx.fillStyle = o.color || '#fff';
    ctx.font = (o.weight || '700') + ' ' + size + 'px ' + (o.font || '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif');
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    const x = o.align === 'left' ? w * 0.08 : o.align === 'right' ? w * 0.92 : w / 2;
    const total = lines.length * size * 1.25;
    lines.forEach((ln, i) => ctx.fillText(ln, x, h / 2 - total / 2 + size * 0.62 + i * size * 1.25));
  }

  // ------------------------------------------------------------------
  // Céu em degradê (domo)
  // ------------------------------------------------------------------
  M.skyDome = function (top, horizon, bottom, radius) {
    const geo = new T.SphereGeometry(radius || 60, 32, 16);
    const mat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: M.color(top) },
        mid: { value: M.color(horizon) },
        bot: { value: M.color(bottom || horizon) },
      },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }',
    });
    const m = new T.Mesh(geo, mat);
    m.renderOrder = -10;
    m.userData.setColors = (a, b, c) => { mat.uniforms.top.value.set(a); mat.uniforms.mid.value.set(b); mat.uniforms.bot.value.set(c || b); };
    return m;
  };

  /** Textura de skyline (vista da janela). */
  M.skylineTex = function (o) {
    o = o || {};
    const night = o.night;
    return M.canvasTex(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      (o.sky || (night ? ['#0b1430', '#1d2b55', '#3b3f7a'] : ['#7fb4ea', '#b9dcf5', '#f3e7cf'])).forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (o.sun) {
        const sg = ctx.createRadialGradient(o.sun[0] * w, o.sun[1] * h, 4, o.sun[0] * w, o.sun[1] * h, 140);
        sg.addColorStop(0, o.sunColor || 'rgba(255,240,200,1)');
        sg.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(0, 0, w, h);
      }
      // prédios em 2 camadas
      let seed = o.seed || 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
      [[0.55, night ? '#18213f' : '#9eb3c9'], [0.68, night ? '#0e152c' : '#7891ab']].forEach(([base, col], layer) => {
        let x = 0;
        while (x < w) {
          const bw = 40 + rnd() * 90;
          const bh = h * (0.18 + rnd() * (layer ? 0.3 : 0.38));
          const top = h * base - bh * (layer ? 0.6 : 1) + (layer ? h * 0.1 : 0);
          ctx.fillStyle = col;
          ctx.fillRect(x, top, bw - 4, h - top);
          // janelinhas
          for (let yy = top + 8; yy < h - 8; yy += 14) {
            for (let xx = x + 6; xx < x + bw - 12; xx += 12) {
              const lit = rnd();
              if (night ? lit > 0.55 : lit > 0.8) {
                ctx.fillStyle = night ? (lit > 0.85 ? '#ffd27a' : '#ffe6a8') : 'rgba(255,255,255,0.35)';
                ctx.fillRect(xx, yy, 5, 7);
              }
            }
          }
          x += bw;
        }
      });
    });
  };

  // ------------------------------------------------------------------
  // Luzes por clima/hora
  // ------------------------------------------------------------------
  const LIGHT_PRESETS = {
    manha: { sky: '#fff1d6', ground: '#8a7a68', hemi: 0.75, sun: '#ffd9a0', sunI: 1.35, sunPos: [-6, 7, 5], amb: 0.12, fog: '#f3e6cf' },
    dia: { sky: '#eef6ff', ground: '#7d7a72', hemi: 0.8, sun: '#fff6e8', sunI: 1.2, sunPos: [5, 9, 6], amb: 0.15, fog: '#e9eef5' },
    tarde: { sky: '#ffc58a', ground: '#5a4060', hemi: 0.6, sun: '#ff9a52', sunI: 1.5, sunPos: [-8, 4, 3], amb: 0.1, fog: '#f0b48a' },
    noite: { sky: '#3a4a8a', ground: '#141a30', hemi: 0.45, sun: '#9fb4ff', sunI: 0.35, sunPos: [4, 8, -4], amb: 0.08, fog: '#141a30' },
    sonho: { sky: '#b48ae8', ground: '#2c1850', hemi: 0.6, sun: '#ffd0ff', sunI: 0.8, sunPos: [3, 8, 4], amb: 0.12, fog: '#2c1850' },
    alerta: { sky: '#ff6b6b', ground: '#2a0a12', hemi: 0.35, sun: '#ff5a5a', sunI: 0.5, sunPos: [3, 6, 4], amb: 0.06, fog: '#2a0a12' },
  };
  M.LIGHT_PRESETS = LIGHT_PRESETS;
  /**
   * Monta luzes num grupo. Retorna {group, hemi, sun, amb, set(preset)}.
   * opts: {shadowSize, area} area = metade do tamanho da sombra (m).
   */
  M.lighting = function (preset, opts) {
    opts = opts || {};
    const g = new T.Group();
    const hemi = new T.HemisphereLight('#ffffff', '#444444', 0.7);
    const amb = new T.AmbientLight('#ffffff', 0.1);
    const sun = new T.DirectionalLight('#ffffff', 1);
    sun.castShadow = true;
    const ss = opts.shadowSize || (P2.lowPower ? 1024 : 2048);
    sun.shadow.mapSize.set(ss, ss);
    const A = opts.area || 7;
    sun.shadow.camera.left = -A; sun.shadow.camera.right = A; sun.shadow.camera.top = A; sun.shadow.camera.bottom = -A;
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    sun.shadow.radius = 3;
    g.add(hemi, amb, sun, sun.target);
    const api = {
      group: g, hemi, sun, amb,
      set(name, target) {
        const p = typeof name === 'string' ? LIGHT_PRESETS[name] || LIGHT_PRESETS.dia : name;
        hemi.color.set(p.sky); hemi.groundColor.set(p.ground); hemi.intensity = p.hemi;
        sun.color.set(p.sun); sun.intensity = p.sunI;
        sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
        if (target) sun.target.position.copy(target);
        amb.intensity = p.amb;
        api.preset = p;
        return api;
      },
    };
    api.set(preset || 'dia');
    return api;
  };

  /** Luz quente de abajur/luminária com brilho visível. */
  M.lampLight = function (color, intensity, dist) {
    const g = new T.Group();
    const l = new T.PointLight(color || '#ffcf8a', intensity == null ? 1.2 : intensity, dist || 6, 2);
    l.castShadow = false;
    g.add(l);
    g.userData.light = l;
    return g;
  };

  /** Brilho falso (sprite aditivo) — para lâmpadas, telas, estrelas. */
  let glowTex = null;
  M.glow = function (color, size, opacity) {
    if (!glowTex) {
      glowTex = M.canvasTex(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      });
    }
    const m = new T.SpriteMaterial({ map: glowTex, color: M.color(color || '#ffd27a'), transparent: true, opacity: opacity == null ? 0.8 : opacity, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
    const s = new T.Sprite(m);
    s.scale.setScalar(size || 0.6);
    return s;
  };

  /** Libera recursos de um objeto (geometria/material não compartilhados). */
  M.dispose = function (obj) {
    if (!obj) return;
    obj.traverse((o) => {
      if (o.geometry && !geoCacheHas(o.geometry)) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => {
          if (!matCacheHas(m)) { if (m.map) m.map.dispose(); m.dispose(); }
        });
      }
    });
  };
  function geoCacheHas(g) { for (const v of geoCache.values()) if (v === g) return true; return false; }
  function matCacheHas(m) { for (const v of matCache.values()) if (v === m) return true; return false; }

  /** Gerador pseudoaleatório determinístico. */
  M.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  };
  M.ease = {
    linear: (t) => t,
    inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    smooth: (t) => t * t * (3 - 2 * t),
  };
})();

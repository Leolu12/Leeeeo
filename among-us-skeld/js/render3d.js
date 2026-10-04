/* Mapa 3D: câmera em perspectiva que segue o jogador, luzes das salas (um conjunto fixo de luzes que vai para as
   luminárias mais perto), sombras, névoa de visão (o que o seu personagem não vê fica escuro), brilho das lâmpadas e
   telas, cor de cinema, efeitos (abate, duto, transformação, escudo, scan, asteroides) e marcadores das tarefas.
   O 2D continua existindo: se o aparelho não tem WebGL ou a pessoa escolhe 2D, o desenho é o de render.js. */
(function () {
  'use strict';
  const AU = window.AU;
  const THREE = window.THREE;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;

  const LEVELS = {
    baixa: { pr: 0.75, shadow: 0, bloom: false, lights: 4, tex: 256, aniso: 2, msaa: 0, gtao: false },
    media: { pr: 1, shadow: 1024, bloom: true, lights: 6, tex: 512, aniso: 4, msaa: 0, gtao: false },
    alta: { pr: 1.5, shadow: 2048, bloom: true, lights: 8, tex: 512, aniso: 8, msaa: 4, gtao: false },
    ultra: { pr: 2, shadow: 4096, bloom: true, lights: 10, tex: 1024, aniso: 8, msaa: 4, gtao: true },
  };
  const coarse = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function autoLevel() {
    if (slowGPU()) return 'baixa';
    const mem = (navigator && navigator.deviceMemory) || 8;
    if (coarse) return mem < 4 ? 'baixa' : 'media';
    return mem < 4 ? 'media' : 'alta';
  }

  /* WebGL 2 disponível? (sem ele, fica no 2D). slow: o navegador desenha sem placa de vídeo (no processador) */
  let SUPPORT = null, SLOW = false;
  function supported() {
    if (SUPPORT != null) return SUPPORT;
    try {
      const c = document.createElement('canvas');
      SUPPORT = !!(THREE && c.getContext('webgl2'));
      if (SUPPORT) {
        const c2 = document.createElement('canvas');
        const gl = c2.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
        SLOW = !gl;
        /* nome do renderizador: os de software se entregam (SwiftShader, llvmpipe, "Basic Render Driver"...) */
        if (gl && !SLOW) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          const name = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
          SLOW = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
        }
        const lose = gl && gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      }
      const lose = SUPPORT && c.getContext('webgl2').getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e) {
      SUPPORT = false;
    }
    return SUPPORT;
  }
  function slowGPU() {
    supported();
    return SLOW;
  }

  const R3 = {
    active: false,
    failed: false,
    level: null,
    supported,
    slowGPU,
    LEVELS,
    autoLevel,
    cam: { x: 69, y: 14 },

    /* já montado (ou montando) para esta tela e qualidade? */
    ready(canvas, levelName) {
      const lvName = levelName && LEVELS[levelName] ? levelName : autoLevel();
      return !!(this.renderer && !this.job && this.canvas === canvas && this.levelName === lvName);
    },
    /* monta aos poucos, sem travar a tela (uma etapa por folga do navegador); devolve uma promessa (true = pronto).
       Chamar de novo com a mesma qualidade devolve a mesma montagem; com outra, cancela a anterior. */
    prepare(canvas, overlay, levelName) {
      if (!supported() || this.failed) return Promise.resolve(false);
      const lvName = levelName && LEVELS[levelName] ? levelName : autoLevel();
      if (this.ready(canvas, lvName)) return Promise.resolve(true);
      if (this.job && this.job.lv === lvName && this.job.canvas === canvas) return this.job.p;
      if (this.job) this.job.cancel = true;
      canvas = this.release(canvas);
      const job = { lv: lvName, canvas, cancel: false, it: this.buildGen(canvas, overlay, lvName) };
      this.job = job;
      const pause = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 60 }) : setTimeout(r, 0)));
      job.p = (async () => {
        try {
          for (;;) {
            if (job.done) return true;
            if (job.cancel) return false;
            const r = job.it.next();
            if (r.done) break;
            if (r.value && typeof r.value.then === 'function') await Promise.resolve(r.value).catch(() => {});
            await pause();
          }
        } catch (e) {
          if (job.cancel) return false;
          if (window.console) console.warn('3D indisponível, usando 2D', e);
          this.failed = true;
          this.active = false;
          this.job = null;
          try {
            this.dispose();
          } catch (e2) {
            /* nada */
          }
          return false;
        }
        if (job.done) return true;
        if (job.cancel) return false;
        this.job = null;
        return true;
      })();
      return job.p;
    },
    /* prepara de uma vez (uma vez por sessão; a nave fica pronta para as próximas partidas) */
    setup(canvas, overlay, levelName) {
      if (!supported() || this.failed) return false;
      const lvName = levelName && LEVELS[levelName] ? levelName : autoLevel();
      /* montagem em andamento com esta qualidade: termina agora, de uma vez */
      if (this.job && this.job.lv === lvName && this.job.canvas === canvas) {
        const job = this.job;
        try {
          for (;;) {
            const r = job.it.next();
            if (r.done) break;
          }
        } catch (e) {
          job.cancel = true;
          this.job = null;
          if (window.console) console.warn('3D indisponível, usando 2D', e);
          this.failed = true;
          this.active = false;
          return false;
        }
        job.done = true; /* o laço da promessa para e responde "pronto" */
        this.job = null;
      }
      if (this.renderer && !this.job && this.canvas === canvas && this.levelName === lvName) {
        this.overlay = overlay;
        this.active = true;
        this.resize();
        return true;
      }
      if (this.job) {
        this.job.cancel = true;
        this.job = null;
      }
      canvas = this.release(canvas);
      try {
        this.build(canvas, overlay, lvName);
      } catch (e) {
        if (window.console) console.warn('3D indisponível, usando 2D', e);
        this.failed = true;
        this.active = false;
        try {
          this.dispose();
        } catch (e2) {
          /* nada */
        }
        return false;
      }
      this.active = true;
      return true;
    },
    /* monta tudo de uma vez (trava a tela enquanto monta) */
    build(canvas, overlay, lvName) {
      for (const _ of this.buildGen(canvas, overlay, lvName)) void _;
    },
    /* a montagem em etapas: cada yield é uma pausa em que a tela pode respirar (ver prepare) */
    *buildGen(canvas, overlay, lvName) {
      const KIT = AU.R3DKit;
      const T0 = performance.now(), tm = {};
      const mark = (k) => (tm[k] = Math.round(performance.now() - T0));
      this.timings = tm;
      const lv = LEVELS[lvName];
      this.lv = lv;
      this.levelName = lvName;
      this.canvas = canvas;
      this.overlay = overlay;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
      this.renderer = renderer;
      renderer.info.autoReset = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.92;
      renderer.shadowMap.enabled = lv.shadow > 0;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = true;
      mark('renderer');
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        /* perda de verdade (não a do descarte, que troca a tela por outra) */
        if (canvas !== this.canvas || !this.renderer) return;
        this.failed = true;
        this.active = false;
      });
      KIT.setQuality(lv.tex, Math.min(lv.aniso, renderer.capabilities.getMaxAnisotropy()));
      yield;
      if (!KIT.MAT.wall) yield* KIT.materialsGen();
      mark('materiais');
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#010208');
      this.scene = scene;
      /* reflexos: ambiente gerado (sala com luzes) para metal e vidro */
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.42;
      pm.dispose();
      yield;
      const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
      this.camera = camera;
      /* espaço lá embaixo: estrelas em duas camadas (paralaxe) */
      const stars = KIT.starsTex();
      stars.repeat.set(5, 5);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: stars, color: '#9aa6c8' }));
      sky.rotation.x = -Math.PI / 2;
      sky.position.set(68, -70, 38);
      scene.add(sky);
      const stars2 = KIT.starsTex();
      stars2.repeat.set(3, 3);
      const sky2 = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ map: stars2, color: '#ffffff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      sky2.rotation.x = -Math.PI / 2;
      sky2.position.set(68, -30, 38);
      scene.add(sky2);
      this.sky = [sky, sky2];
      /* a nave */
      mark('ambiente');
      yield;
      this.world = yield* AU.R3DWorld.buildGen(scene);
      mark('nave');
      yield;
      this.actors = new AU.R3DActors.Actors(scene);
      /* luzes */
      const hemi = new THREE.HemisphereLight('#b8c8ff', '#2a2420', 0.4);
      scene.add(hemi);
      this.hemi = hemi;
      const key = new THREE.DirectionalLight('#eef2ff', 0.95);
      key.castShadow = lv.shadow > 0;
      if (key.castShadow) {
        key.shadow.mapSize.set(lv.shadow, lv.shadow);
        const sc = key.shadow.camera;
        sc.left = -22;
        sc.right = 22;
        sc.top = 22;
        sc.bottom = -22;
        sc.near = 1;
        sc.far = 80;
        key.shadow.bias = -0.0006;
        key.shadow.normalBias = 0.03;
        key.shadow.radius = 3;
      }
      scene.add(key, key.target);
      this.key = key;
      this.pool = [];
      for (let i = 0; i < lv.lights; i++) {
        const l = new THREE.PointLight('#ffffff', 0, 10, 2);
        scene.add(l);
        this.pool.push({ l, cand: null, cur: 0 });
      }
      this.flash = new THREE.PointLight('#ff2a2a', 0, 7, 2);
      this.alarm = new THREE.PointLight('#ff1a1a', 0, 16, 1.6);
      scene.add(this.flash, this.alarm);
      /* névoa de visão: o polígono do que se vê, pintado numa textura e lido por todos os materiais */
      this.setupVision();
      this.setupAO();
      mark('sombra');
      yield;
      this.setupFx();
      this.setupPost();
      mark('pronto');
      this.resize();
      this.last = performance.now();
      this.fpsT = 0;
      this.fpsN = 0;
      this.scale = 1;
      this.dynPR = lv.pr;
      /* aquecimento: compila os programas de sombreamento antes da partida (com personagens de mentira em cena,
         para os materiais deles também), em vez de travar no primeiro quadro */
      const A = AU.R3DActors, dummy = [];
      try {
        const c = A.makeCrew('red', 'nenhum', 'classico');
        dummy.push(c.group, A.makeGhost('blue'), A.makeBody('green'));
      } catch (e) {
        /* sem personagens de mentira: compilam no primeiro quadro */
      }
      for (const d of dummy) {
        d.position.set(this.cam.x, 0, this.cam.y);
        scene.add(d);
      }
      camera.position.set(this.cam.x, 14, this.cam.y + 9);
      camera.lookAt(this.cam.x, 0.5, this.cam.y);
      /* o navegador só termina de preparar um programa quando ele é usado: "usa" cada programa novo na hora
         (lendo os uniformes), um por etapa, em vez de pagar tudo no primeiro quadro */
      /* texturas para a placa de vídeo, poucas por etapa (senão sobem todas no primeiro quadro em que aparecem) */
      const texs = new Set();
      scene.traverse((o) => {
        const ms = !o.material ? [] : Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap', 'alphaMap']) if (m[k] && m[k].isTexture) texs.add(m[k]);
      });
      let nt = 0;
      for (const t of texs) {
        renderer.initTexture(t);
        if (++nt % 4 === 0) yield;
      }
      /* compila como a cena é desenhada de verdade: dentro de uma imagem intermediária (o pós-processamento faz
         o tom e a cor no fim), senão os programas saem diferentes e compilam de novo no primeiro quadro */
      const rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType });
      renderer.setRenderTarget(rt);
      const progs = () => renderer.info.programs || [];
      let seen = progs().length;
      const settle = () => {
        const list = progs();
        for (let i = seen; i < list.length; i++) list[i].getUniforms();
        const changed = list.length !== seen;
        seen = list.length;
        return changed;
      };
      if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) {
        yield renderer.compileAsync(scene, camera);
        renderer.setRenderTarget(rt);
        settle();
      } else {
        const objs = [];
        scene.traverse((o) => {
          if (o.isMesh || o.isPoints || o.isSprite || o.isLine) objs.push(o);
        });
        let n = 0;
        for (const o of objs) {
          renderer.setRenderTarget(rt);
          renderer.compile(o, camera, scene);
          if (settle() || ++n % 40 === 0) yield;
        }
      }
      /* efeitos de tela (brilho, cor, saída): cada material num quadradinho, compilado e usado */
      const post = new Set();
      const take = (v) => {
        if (v && v.isMaterial) post.add(v);
        else if (Array.isArray(v)) v.forEach(take);
      };
      for (const pass of this.composer.passes) {
        for (const v of Object.values(pass)) take(v);
        if (pass.fsQuad) take(pass.fsQuad.material);
      }
      const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), quad = new THREE.PlaneGeometry(2, 2);
      for (const m of post) {
        try {
          renderer.setRenderTarget(rt);
          renderer.compile(new THREE.Mesh(quad, m), ortho);
        } catch (e) {
          /* compila no primeiro quadro */
        }
        if (settle()) yield;
      }
      quad.dispose();
      /* um quadro de verdade, pequeno (sombras e o que faltou) */
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      rt.dispose();
      settle();
      yield;
      this.composer.render(0);
      for (const d of dummy) scene.remove(d);
      mark('aquecido');
    },

    setupVision() {
      const N = 240;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3 * 3), world = new Float32Array(N * 3 * 2);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('world', new THREE.BufferAttribute(world, 2));
      const mat = new THREE.ShaderMaterial({
        uniforms: { uEye: { value: new THREE.Vector2() }, uR: { value: 7 } },
        vertexShader: 'attribute vec2 world; varying vec2 vW; void main(){ vW = world; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: 'uniform vec2 uEye; uniform float uR; varying vec2 vW; void main(){ float d = distance(vW, uEye); float v = 1.0 - smoothstep(uR * 0.6, uR, d); gl_FragColor = vec4(v, v, v, 1.0); }',
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.vis = { N, geo, mat, mesh, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), rt: new THREE.WebGLRenderTarget(512, 512, { depthBuffer: false }) };
      this.vis.scene.add(mesh);
      this.vis.rt.texture.minFilter = THREE.LinearFilter;
      this.vis.rt.texture.magFilter = THREE.LinearFilter;
      AU.R3DKit.UNI.uVisTex.value = this.vis.rt.texture;
    },
    updateVision(eye, r) {
      const v = this.vis, S = r + 1.6;
      const ox = eye.x - S, oz = eye.y - S, size = S * 2;
      const poly = Nav.visPoly(eye.x, eye.y, r, v.N);
      const pos = v.geo.attributes.position.array, wd = v.geo.attributes.world.array;
      const nx = (x) => ((x - ox) / size) * 2 - 1, nz = (z) => ((z - oz) / size) * 2 - 1;
      for (let i = 0; i < v.N; i++) {
        const a = poly[i], b = poly[(i + 1) % v.N];
        const k = i * 9, w = i * 6;
        pos[k] = nx(eye.x); pos[k + 1] = nz(eye.y); pos[k + 2] = 0;
        pos[k + 3] = nx(a.x); pos[k + 4] = nz(a.y); pos[k + 5] = 0;
        pos[k + 6] = nx(b.x); pos[k + 7] = nz(b.y); pos[k + 8] = 0;
        wd[w] = eye.x; wd[w + 1] = eye.y;
        wd[w + 2] = a.x; wd[w + 3] = a.y;
        wd[w + 4] = b.x; wd[w + 5] = b.y;
      }
      v.geo.attributes.position.needsUpdate = true;
      v.geo.attributes.world.needsUpdate = true;
      v.mat.uniforms.uEye.value.set(eye.x, eye.y);
      v.mat.uniforms.uR.value = r;
      const rd = this.renderer;
      rd.setRenderTarget(v.rt);
      rd.setClearColor(0x000000, 1);
      rd.clear(true, false, false);
      rd.render(v.scene, v.cam);
      rd.setRenderTarget(null);
      const UNI = AU.R3DKit.UNI;
      UNI.uVisOrigin.value.set(ox, oz);
      UNI.uVisSize.value.set(size, size);
    },

    /* sombra de contato: escurece o chão perto de paredes e móveis (calculada uma vez) */
    setupAO() {
      if (AU.R3DKit.UNI.uAOTex.value) return;
      const P = 6, w = M.W * P, h = M.H * P;
      const occ = new Float32Array(w * h);
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const x = (i + 0.5) / P, z = (j + 0.5) / P;
          const tx = Math.floor(x), tz = Math.floor(z);
          const fl = (M.isFloor(tx, tz) || M.isCutTile(tx, tz)) && M.chamferGap(x, z) >= 0;
          occ[j * w + i] = !fl ? 1 : M.propGap(x, z) < 0 ? 0.8 : 0;
        }
      }
      const blur = (src, rad) => {
        const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
        for (let j = 0; j < h; j++) {
          let acc = 0;
          for (let i = -rad; i <= rad; i++) acc += src[j * w + Math.min(w - 1, Math.max(0, i))];
          for (let i = 0; i < w; i++) {
            tmp[j * w + i] = acc / (rad * 2 + 1);
            acc += src[j * w + Math.min(w - 1, i + rad + 1)] - src[j * w + Math.max(0, i - rad)];
          }
        }
        for (let i = 0; i < w; i++) {
          let acc = 0;
          for (let j = -rad; j <= rad; j++) acc += tmp[Math.min(h - 1, Math.max(0, j)) * w + i];
          for (let j = 0; j < h; j++) {
            out[j * w + i] = acc / (rad * 2 + 1);
            acc += tmp[Math.min(h - 1, j + rad + 1) * w + i] - tmp[Math.max(0, j - rad) * w + i];
          }
        }
        return out;
      };
      const b1 = blur(blur(occ, 3), 3);
      const data = new Uint8Array(w * h);
      for (let k = 0; k < w * h; k++) data[k] = Math.round(255 * U.clamp(1 - 0.62 * Math.min(1, b1[k] * 1.4), 0.2, 1));
      const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      AU.R3DKit.UNI.uAOTex.value = t;
    },

    /* ---------- pós-processamento: brilho, cor de cinema, vinheta, granulação ---------- */
    setupPost() {
      const rd = this.renderer, lv = this.lv;
      const size = new THREE.Vector2();
      rd.getDrawingBufferSize(size);
      const rt = new THREE.WebGLRenderTarget(Math.max(2, size.x), Math.max(2, size.y), { type: THREE.HalfFloatType, samples: lv.msaa });
      const comp = new THREE.EffectComposer(rd, rt);
      comp.addPass(new THREE.RenderPass(this.scene, this.camera));
      if (lv.gtao) {
        const ao = new THREE.GTAOPass(this.scene, this.camera, size.x, size.y);
        ao.blendIntensity = 0.85;
        comp.addPass(ao);
        this.gtao = ao;
      }
      if (lv.bloom) {
        const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.42, 0.45, 1.05);
        comp.addPass(bloom);
        this.bloom = bloom;
      }
      comp.addPass(new THREE.OutputPass());
      const grade = new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRed: { value: 0 }, uGrain: { value: 0.035 }, uCA: { value: 0.006 }, uGhost: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uRed; uniform float uGrain; uniform float uCA; uniform float uGhost; varying vec2 vUv;
          void main(){
            vec2 d = vUv - 0.5; float r2 = dot(d, d);
            vec3 col;
            col.r = texture2D(tDiffuse, vUv + d * uCA * r2 * 4.0).r;
            col.g = texture2D(tDiffuse, vUv).g;
            col.b = texture2D(tDiffuse, vUv - d * uCA * r2 * 4.0).b;
            float vig = smoothstep(0.62, 0.12, r2);
            col *= mix(0.58, 1.0, vig);
            float edge = 1.0 - vig;
            col = mix(col, col * vec3(1.0, 0.45, 0.4) + vec3(0.32, 0.0, 0.0), uRed * edge);
            float l = dot(col, vec3(0.299, 0.587, 0.114));
            col = mix(col, vec3(l) * vec3(0.85, 0.95, 1.1), uGhost * 0.55);
            float n = fract(sin(dot(vUv * vec2(12.9898, 78.233) + uTime, vec2(1.0, 1.0))) * 43758.5453);
            col += (n - 0.5) * uGrain;
            gl_FragColor = vec4(col, 1.0);
          }`,
      });
      comp.addPass(grade);
      this.grade = grade;
      this.composer = comp;
    },

    /* ---------- efeitos ---------- */
    setupFx() {
      const KIT = AU.R3DKit;
      const scene = this.scene;
      /* partículas (gotas do abate, cacos): esferas instanciadas */
      const NP = 160;
      const pm = KIT.patch(new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 }), { ao: false });
      const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), pm, NP);
      parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parts.count = 0;
      parts.frustumCulled = false;
      scene.add(parts);
      this.parts = { mesh: parts, list: [], max: NP };
      /* fumaça (duto, transformação): sprites com borda suave */
      const c = KIT.canvas(64, 64), x = c.getContext('2d');
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      this.smokeTex = KIT.tex(c, true);
      this.smoke = [];
      for (let i = 0; i < 40; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
        s.visible = false;
        scene.add(s);
        this.smoke.push({ s, life: 0, max: 1 });
      }
      /* escudo do anjo */
      this.bubbles = [];
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 16), new THREE.MeshBasicMaterial({ color: '#7cc8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        b.visible = false;
        scene.add(b);
        this.bubbles.push(b);
      }
      /* scan da MedBay: coluna de luz e o anel que sobe e desce */
      const scanMat = new THREE.MeshBasicMaterial({ color: '#5dffaa', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 1.5, 32, 1, true), scanMat);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 8, 40), new THREE.MeshBasicMaterial({ color: '#b8ffd8', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      this.scans = [];
      for (let i = 0; i < 3; i++) {
        const gr = new THREE.Group();
        gr.add(col.clone(), ring.clone());
        gr.children[0].position.y = 0.75;
        gr.visible = false;
        scene.add(gr);
        this.scans.push(gr);
      }
      /* onda hexagonal dos escudos */
      const hexMat = new THREE.MeshBasicMaterial({ color: '#8cc0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      this.hexWaves = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 6, 1), hexMat.clone());
        m.rotation.x = -Math.PI / 2;
        m.visible = false;
        scene.add(m);
        this.hexWaves.push(m);
      }
      /* asteroides vistos pela janela de Armas: textura desenhada enquanto alguém faz a tarefa */
      const ac = KIT.canvas(512, 80);
      this.astro = { c: ac, t: KIT.tex(ac, true) };
      this.astro.t.wrapS = this.astro.t.wrapT = THREE.ClampToEdgeWrapping;
      const win = this.world.windows.find((w) => w.kind === 'weapons');
      if (win) {
        const am = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0, win.y1 - win.y0), new THREE.MeshBasicMaterial({ map: this.astro.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        am.position.set((win.x0 + win.x1) / 2, (win.y0 + win.y1) / 2, win.z + 0.02);
        am.visible = false;
        scene.add(am);
        this.astro.mesh = am;
        this.astro.win = win;
      }
      /* marcadores: anel no chão e losango flutuando sobre o console */
      const ringGeo = new THREE.RingGeometry(0.45, 0.6, 40);
      ringGeo.rotateX(-Math.PI / 2);
      const gem = new THREE.OctahedronGeometry(0.13, 0);
      gem.scale(1, 1.6, 1);
      this.marks = [];
      for (let i = 0; i < 24; i++) {
        const mm = new THREE.MeshBasicMaterial({ color: '#ffd640', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const r = new THREE.Mesh(ringGeo, mm);
        const d = new THREE.Mesh(gem, mm);
        r.visible = d.visible = false;
        scene.add(r, d);
        this.marks.push({ r, d, m: mm });
      }
      /* duto: personagem temporário pulando para dentro ou para fora */
      this.ventGuys = [];
      this.seenFx = new WeakSet();
    },
    spawnParticles(x, z, colorHex, n, seed) {
      const P = this.parts;
      const col = new THREE.Color(colorHex);
      for (let i = 0; i < n; i++) {
        if (P.list.length >= P.max) P.list.shift();
        const a = ((seed + i * 37) % 100) / 100 * Math.PI * 2;
        const sp = 1.2 + (((seed * 7 + i * 13) % 100) / 100) * 2.2;
        P.list.push({ x, y: 0.7, z, vx: Math.cos(a) * sp, vy: 1.5 + ((i * 29) % 10) / 4, vz: Math.sin(a) * sp, life: 0, max: 0.9 + ((i * 17) % 10) / 20, s: 0.05 + ((i * 11) % 6) / 100, col: i % 3 ? col : new THREE.Color('#7a0f1a') });
      }
    },
    puff(x, y, z, color, n, spread, life) {
      let k = 0;
      for (const p of this.smoke) {
        if (p.life > 0) continue;
        const a = (k / n) * Math.PI * 2;
        p.s.visible = true;
        p.s.material.color.set(color);
        p.s.position.set(x + Math.cos(a) * 0.15, y, z + Math.sin(a) * 0.15);
        p.vx = Math.cos(a) * spread;
        p.vz = Math.sin(a) * spread;
        p.vy = 0.4 + (k % 3) * 0.2;
        p.life = life;
        p.max = life;
        if (++k >= n) break;
      }
    },
    updateFx(g, dt, t, h) {
      /* efeitos novos do jogo */
      for (const f of g.fx) {
        if (this.seenFx.has(f)) continue;
        this.seenFx.add(f);
        const shown = this.visible(g, f.x, f.y) || (h && f.type === 'kill' && h.isImp);
        if (!shown) continue;
        if (f.type === 'kill') {
          this.spawnParticles(f.x, f.y, (C.COLOR[f.color] || C.COLORS[0]).hex, 26, f.seed || 1);
          this.flashT = 0.35;
          this.flash.position.set(f.x, 1.2, f.y);
        } else if (f.type === 'puff') this.puff(f.x, 0.6, f.y, '#c08bff', 10, 1.2, 0.9);
        else if (f.type === 'vent') this.puff(f.x, 0.3, f.y, '#9aa4b6', 6, 0.8, 0.8);
        else if (f.type === 'ventIn' || f.type === 'ventOut') this.ventGuy(f);
      }
      /* partículas */
      const P = this.parts, m4 = new THREE.Matrix4();
      let n = 0;
      for (let i = P.list.length - 1; i >= 0; i--) {
        const p = P.list[i];
        p.life += dt;
        if (p.life >= p.max) {
          P.list.splice(i, 1);
          continue;
        }
        p.vy -= 9 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.y < 0.02) {
          p.y = 0.02;
          p.vy = 0;
          p.vx *= 0.6;
          p.vz *= 0.6;
        }
      }
      for (const p of P.list) {
        const s = p.s * (1 - (p.life / p.max) * 0.4);
        m4.makeScale(s, s * (p.y <= 0.03 ? 0.25 : 1), s);
        m4.setPosition(p.x, p.y, p.z);
        P.mesh.setMatrixAt(n, m4);
        P.mesh.setColorAt(n, p.col);
        n++;
      }
      P.mesh.count = n;
      P.mesh.instanceMatrix.needsUpdate = true;
      if (P.mesh.instanceColor) P.mesh.instanceColor.needsUpdate = true;
      /* fumaça */
      for (const p of this.smoke) {
        if (p.life <= 0) continue;
        p.life -= dt;
        const k = 1 - p.life / p.max;
        p.s.position.x += p.vx * dt;
        p.s.position.y += p.vy * dt;
        p.s.position.z += p.vz * dt;
        p.s.scale.setScalar(0.4 + k * 1.4);
        p.s.material.opacity = (1 - k) * 0.7;
        if (p.life <= 0) p.s.visible = false;
      }
      /* luz do abate */
      this.flashT = Math.max(0, (this.flashT || 0) - dt);
      this.flash.intensity = this.flashT > 0 ? 60 * (this.flashT / 0.35) : 0;
      /* escudos do anjo */
      let bi = 0;
      for (const p of g.players) {
        if (bi >= this.bubbles.length) break;
        if (!(p.protectedUntil > g.t) || !p.alive) continue;
        const hDead = h && !h.alive;
        if (!(hDead || (h && h.special === 'anjo'))) continue;
        if (!this.visible(g, p.x, p.y) && !hDead) continue;
        const b = this.bubbles[bi++];
        b.visible = true;
        b.position.set(p.x, 0.6, p.y);
        b.material.opacity = 0.16 + Math.sin(t * 4) * 0.05;
      }
      for (; bi < this.bubbles.length; bi++) this.bubbles[bi].visible = false;
      /* visuais das tarefas: scan, escudos, asteroides */
      let si = 0, astroOn = false, hexOn = null;
      for (const p of g.players) {
        if (!p.visual || !p.alive) continue;
        if (p.visual.type === 'scan' && si < this.scans.length && this.visible(g, p.x, p.y)) {
          const s = this.scans[si++];
          s.visible = true;
          s.position.set(p.x, 0, p.y);
          const ph = (t * 0.9) % 2, k = ph < 1 ? ph : 2 - ph;
          s.children[1].position.y = 0.1 + k * 1.3;
        } else if (p.visual.type === 'asteroids') astroOn = this.visible(g, 99.5, 4.6);
        else if (p.visual.type === 'shields') {
          const F = AU.Decor.SHIELD_FX;
          if (this.visible(g, F.x, F.y)) hexOn = U.clamp(1 - (p.visual.until - g.t) / 2.5, 0, 1);
        }
      }
      for (; si < this.scans.length; si++) this.scans[si].visible = false;
      const F = AU.Decor.SHIELD_FX;
      this.hexWaves.forEach((m, i) => {
        const rr = hexOn == null ? -1 : hexOn * 1.4 - i * 0.18;
        m.visible = rr > 0 && rr < 1;
        if (!m.visible) return;
        m.position.set(F.x, 0.08 + i * 0.01, F.y);
        m.scale.setScalar(0.8 + rr * 4);
        m.material.opacity = (1 - rr) * 0.8;
      });
      if (this.astro.mesh) {
        this.astro.mesh.visible = astroOn;
        if (astroOn) this.drawAsteroids(t);
      }
      /* personagens pulando no duto */
      for (let i = this.ventGuys.length - 1; i >= 0; i--) {
        const vg = this.ventGuys[i];
        const k = (g.t - vg.t0) / vg.dur;
        if (k >= 1 || k < 0) {
          this.scene.remove(vg.a.group);
          this.ventGuys.splice(i, 1);
          continue;
        }
        const u = vg.out ? 1 - k : k;
        const y = u < 0.25 ? u * 1.2 : 0.3 - (u - 0.25) * 2.4;
        vg.a.group.position.set(vg.x, y, vg.z);
        vg.a.group.scale.setScalar(Math.max(0.05, 1 - Math.max(0, u - 0.5) * 1.6));
      }
    },
    ventGuy(f) {
      const a = AU.R3DActors.makeCrew(f.color, f.hat || 'nenhum', f.visor || 'azul');
      a.group.rotation.y = (f.facing || 1) > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(a.group);
      this.ventGuys.push({ a, x: f.x, z: f.y, t0: f.t0, dur: f.dur || 0.8, out: f.type === 'ventOut' });
    },
    drawAsteroids(t) {
      const c = this.astro.c, x = c.getContext('2d'), W = c.width, Hh = c.height;
      x.clearRect(0, 0, W, Hh);
      const hsh = (n) => {
        const v = Math.sin(n * 127.1) * 43758.5453;
        return v - Math.floor(v);
      };
      const cyc = 0.8;
      for (let back = 1; back >= 0; back--) {
        const n = Math.floor(t / cyc) - back, k = t / cyc - n;
        if (k > 1.6) continue;
        const ax = (0.08 + hsh(n) * 0.84 - k * 0.06) * W, ay = (0.2 + hsh(n + 0.5) * 0.6) * Hh;
        const gx = (n % 2 ? 0.375 : 0.7) * W, gy = Hh;
        if (k < 0.35) {
          x.fillStyle = '#8a8072';
          x.beginPath();
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + t * 2, r = 9 + hsh(n * 7 + i) * 6;
            if (i) x.lineTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r);
            else x.moveTo(ax + Math.cos(a) * r, ay + Math.sin(a) * r);
          }
          x.closePath();
          x.fill();
        }
        if (k > 0.18 && k < 0.36) {
          const f = (k - 0.18) / 0.18;
          x.strokeStyle = 'rgba(140,255,210,0.95)';
          x.lineWidth = 4;
          x.beginPath();
          x.moveTo(gx + (ax - gx) * Math.max(0, f - 0.4), gy + (ay - gy) * Math.max(0, f - 0.4));
          x.lineTo(gx + (ax - gx) * f, gy + (ay - gy) * f);
          x.stroke();
        }
        if (k >= 0.35 && k < 1) {
          const e = (k - 0.35) / 0.65;
          x.fillStyle = `rgba(255,${Math.round(200 - e * 120)},60,${0.9 * (1 - e)})`;
          x.beginPath();
          x.arc(ax, ay, 6 + e * 22, 0, Math.PI * 2);
          x.fill();
        }
      }
      this.astro.t.needsUpdate = true;
    },

    /* o jogador vê este ponto? (mesma regra do 2D) */
    visible(g, x, y) {
      const h = g.human;
      if (!h || !h.alive) return true;
      const eye = h.inVent ? M.VENT[h.inVent] : h;
      const r = g.visionOf(h);
      return U.d2(eye.x, eye.y, x, y) <= r + 0.3 && Nav.los(eye.x, eye.y, x, y);
    },

    resize() {
      if (!this.renderer) return;
      const c = this.canvas;
      const w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
      const pr = Math.min(window.devicePixelRatio || 1, this.dynPR || (this.lv && this.lv.pr) || 1);
      this.renderer.setPixelRatio(pr);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      if (this.composer) {
        this.composer.setPixelRatio(pr);
        this.composer.setSize(w, h);
      }
      const o = this.overlay;
      if (o) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        o.width = Math.round(w * dpr);
        o.height = Math.round(h * dpr);
        this.odpr = dpr;
      }
      this.vw = w;
      this.vh = h;
    },

    /* ---------- quadro ---------- */
    draw(g, t) {
      if (!this.active || !this.renderer) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
      this.last = now;
      const h = g.human;
      const UNI = AU.R3DKit.UNI;
      UNI.uTime.value = t;
      /* câmera */
      const tgt = h ? (h.inVent ? M.VENT[h.inVent] : h) : this.cam;
      const k = 1 - Math.pow(0.0005, dt);
      if (this.snap) {
        this.cam.x = tgt.x;
        this.cam.y = tgt.y;
        this.snap = false;
      } else {
        this.cam.x += (tgt.x - this.cam.x) * k;
        this.cam.y += (tgt.y - this.cam.y) * k;
      }
      const cam = this.camera, fov = (cam.fov * Math.PI) / 180;
      const tanH = Math.tan(fov / 2);
      const dist = Math.max(14.5 / (2 * tanH), 13 / (2 * tanH * cam.aspect));
      const pitch = (56 * Math.PI) / 180;
      cam.position.set(this.cam.x, Math.sin(pitch) * dist, this.cam.y + Math.cos(pitch) * dist);
      cam.lookAt(this.cam.x, 0.5, this.cam.y);
      /* luz principal (sombras) acompanha a câmera */
      this.key.position.set(this.cam.x - 7, 24, this.cam.y - 9);
      this.key.target.position.set(this.cam.x, 0, this.cam.y);
      this.key.target.updateMatrixWorld();
      /* névoa de visão */
      const fog = !!(h && h.alive);
      UNI.uVisOn.value = fog ? 1 : 0;
      if (fog) this.updateVision(h.inVent ? M.VENT[h.inVent] : h, g.visionOf(h));
      UNI.uCutOn.value = h && !h.inVent ? 1 : 0;
      if (h) UNI.uCutPos.value.set(h.x, h.y);
      /* apagão: as luminárias apagam junto com a visão */
      const lk = g.lightLevel == null ? 1 : g.lightLevel;
      this.hemi.intensity = 0.12 + 0.28 * lk;
      this.key.intensity = 0.2 + 0.75 * lk;
      this.updateLights(g, dt, t, lk);
      /* alarme da sabotagem crítica */
      const crit = g.sabCritical && g.sabCritical();
      this.alarm.position.set(this.cam.x, 4, this.cam.y);
      this.alarm.intensity = crit ? 40 + Math.sin(t * 6) * 30 : 0;
      this.grade.uniforms.uRed.value = crit ? 0.35 + Math.sin(t * 6) * 0.25 : 0;
      this.grade.uniforms.uTime.value = t % 10;
      this.grade.uniforms.uGhost.value = h && !h.alive ? 1 : 0;
      /* portas, dutos, câmeras, objetos animados, telas */
      this.updateDoors(g, t);
      this.updateVents(g);
      const on = g.anyoneOnCams && g.anyoneOnCams();
      for (const c of this.world.cams) c.led.material.emissiveIntensity = on && Math.sin(t * 6) > 0 ? 4 : 0;
      for (const d of this.world.dyn) {
        if (d.spin) d.obj.rotation[d.spin.axis] += d.spin.speed * dt;
        if (d.bob) d.obj.position.y = d.bob.base + Math.sin(t * d.bob.speed) * d.bob.amp;
        if (d.pulse) d.pulse.mat.emissiveIntensity = d.pulse.base + Math.sin(t * d.pulse.speed) * d.pulse.amp;
      }
      AU.R3DKit.tickScreens(t);
      /* personagens */
      const hDead = h && !h.alive;
      this.actors.update(g, dt, t, (p) => {
        if (p.body) return { show: this.visible(g, p.body.x, p.body.y) };
        if (p.inVent) return { show: false };
        if (!p.alive) return { show: hDead || p === h, alpha: 0.45 };
        if (p.invisUntil > g.t) {
          if (p === h || (h && h.isImp && p.isImp) || hDead) return { show: true, alpha: 0.3 };
          return { show: false };
        }
        if (p !== h && !this.visible(g, p.x, p.y)) return { show: false };
        return { show: true };
      });
      this.updateFx(g, dt, t, h);
      this.updateMarks(g, t, h);
      /* desenha */
      this.renderer.info.reset();
      this.composer.render(dt);
      this.stats = { calls: this.renderer.info.render.calls, tris: this.renderer.info.render.triangles };
      this.drawOverlay(g, t);
      this.adapt(dt);
    },

    updateLights(g, dt, t, lk) {
      const cands = this.world.lights;
      const cx = this.cam.x, cz = this.cam.y;
      for (const c of cands) c.d2 = (c.x - cx) * (c.x - cx) + (c.z - cz) * (c.z - cz);
      const sorted = cands.slice().sort((a, b) => a.d2 - b.d2);
      const want = sorted.slice(0, this.pool.length);
      const keep = new Set(sorted.slice(0, this.pool.length + 2));
      /* quem já está aceso e continua perto fica no mesmo lugar (sem piscar) */
      const used = new Set();
      for (const s of this.pool) if (s.cand && keep.has(s.cand)) used.add(s.cand);
      const free = want.filter((c) => !used.has(c));
      for (const s of this.pool) {
        if (s.cand && keep.has(s.cand)) continue;
        s.cand = free.shift() || null;
        s.cur = 0;
        if (s.cand) {
          s.l.position.set(s.cand.x, s.cand.y, s.cand.z);
          s.l.color.setHex(s.cand.color);
          s.l.distance = s.cand.dist;
        }
      }
      for (const s of this.pool) {
        if (!s.cand) {
          s.l.intensity = 0;
          continue;
        }
        const c = s.cand;
        const fl = c.kind === 'lamp' ? 0.12 + 0.88 * lk : 1;
        const flick = c.kind === 'lamp' && lk < 0.95 ? 0.85 + 0.15 * Math.sin(t * 23 + c.x) : 1;
        s.cur = Math.min(1, s.cur + dt * 3);
        s.l.intensity = c.power * fl * flick * s.cur;
      }
      /* lâmpadas das luminárias também apagam */
      AU.R3DKit.MAT.lamp.emissiveIntensity = 0.3 + 2.9 * lk;
    },

    updateDoors(g, t) {
      for (const D of this.world.doors) {
        const d = D.d;
        const prog = d.animT != null ? Math.min(1, Math.max(0, (g.t - d.animT) / 0.35)) : 1;
        const amt = d.closed ? prog : 1 - prog;
        for (const lf of D.leaves) lf.g.position.x = lf.s * (D.L / 4 + (1 - amt) * (D.L / 2 - 0.02));
        const red = d.closed;
        D.lampMat.emissive.set(red ? '#ff2a2a' : '#3aff7a');
        D.lampMat.emissiveIntensity = red ? (Math.sin(t * 6) > 0 ? 4 : 0.6) : 2;
      }
    },
    updateVents(g) {
      const open = {};
      for (const f of g.fx) {
        if (f.type !== 'ventIn' && f.type !== 'ventOut') continue;
        const k = (g.t - f.t0) / (f.dur || 0.8);
        const o = k < 0.2 ? k / 0.2 : k > 0.75 ? Math.max(0, (1 - k) / 0.25) : 1;
        const v = M.VENTS.reduce((b, q) => (U.d2(q.x, q.y, f.x, f.y) < U.d2(b.x, b.y, f.x, f.y) ? q : b));
        open[v.id] = Math.max(open[v.id] || 0, o);
      }
      for (const [id, V] of Object.entries(this.world.vents)) {
        const o = open[id] || 0;
        V.lid.rotation.x = -o * 1.2;
      }
    },
    updateMarks(g, t, h) {
      let i = 0;
      const put = (x, z, sx, color, a) => {
        if (i >= this.marks.length) return;
        const mk = this.marks[i++];
        mk.r.visible = mk.d.visible = true;
        mk.m.color.set(color);
        mk.m.opacity = a;
        mk.r.position.set(x, 0.03, z);
        mk.d.position.set(sx.x, sx.y + 0.45 + Math.sin(t * 3 + i) * 0.08, sx.z);
        mk.d.rotation.y = t * 1.6;
      };
      if (h && g.phase === 'play') {
        if (!h.isImp) {
          const pulse = 0.55 + Math.sin(t * 5) * 0.35;
          for (const tk of h.tasks) {
            if (tk.done) continue;
            const id = tk.steps[tk.step], st = M.STATIONS[id];
            const s3 = this.world.stations[id] || { x: st.x, y: 1.1, z: st.y };
            put(st.x, st.y, s3, '#ffd640', g.taskAvailable(tk) ? pulse : 0.2);
          }
        }
        if (g.sab && h.alive) {
          const pulse = 0.5 + Math.sin(t * 7) * 0.4;
          for (const id of g.sabStationsNeeded()) {
            const pos = M.SAB_STATIONS[id];
            const s3 = this.world.stations[id] || { x: pos.x, y: 1.1, z: pos.y };
            put(pos.x, pos.y, s3, '#ff4747', pulse);
          }
        }
      }
      for (; i < this.marks.length; i++) this.marks[i].r.visible = this.marks[i].d.visible = false;
    },

    /* nomes, setas na borda da tela */
    project(x, y, z) {
      const v = new THREE.Vector3(x, y, z).project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * this.overlay.width, y: (-v.y * 0.5 + 0.5) * this.overlay.height, behind: v.z > 1 };
    },
    drawOverlay(g, t) {
      const o = this.overlay;
      if (!o) return;
      const ctx = o.getContext('2d'), h = g.human;
      ctx.clearRect(0, 0, o.width, o.height);
      const dpr = this.odpr || 1;
      ctx.font = `700 ${Math.round(15 * dpr)}px "Nunito", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      const hDead = h && !h.alive;
      const eye = h && h.alive ? (h.inVent ? M.VENT[h.inVent] : h) : null;
      const Rv = eye ? g.visionOf(h) : 0;
      for (const p of g.players) {
        const a = this.actors.list.get(p.id);
        let shown = false, alpha = 1;
        if (!p.alive) {
          const gh = this.actors.ghosts.get(p.id);
          shown = !!(gh && gh.visible);
          alpha = 0.6;
        } else shown = !!(a && a.group.visible);
        if (!shown) continue;
        const ap = g.appear(p);
        const s = this.project(p.x, p.alive ? 1.85 : 2.1, p.y);
        if (s.behind) continue;
        if (eye && p !== h) alpha *= 1 - 0.88 * U.clamp((U.d2(eye.x, eye.y, p.x, p.y) - Rv * 0.6) / (Rv * 0.4), 0, 1);
        if (p.invisUntil > g.t) alpha *= 0.4;
        ctx.globalAlpha = alpha;
        ctx.strokeText(ap.name, s.x, s.y);
        ctx.fillStyle = h && h.isImp && p.isImp ? '#ff5a5a' : '#ffffff';
        ctx.fillText(ap.name, s.x, s.y);
      }
      ctx.globalAlpha = 1;
      if (!h) return;
      const cx = o.width / 2, cy = o.height / 2;
      const arrow = (x, y, color) => {
        const p = this.project(x, 0.5, y);
        let dx = p.x - cx, dy = p.y - cy;
        if (p.behind) {
          dx = -dx;
          dy = -dy;
        }
        const margin = 40 * dpr;
        if (!p.behind && Math.abs(dx) < cx - margin && Math.abs(dy) < cy - margin) return;
        const kk = Math.min((cx - margin) / Math.abs(dx || 1), (cy - margin) / Math.abs(dy || 1));
        const ax = cx + dx * kk, ay = cy + dy * kk, ang = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(ang);
        ctx.scale(dpr, dpr);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
      if (g.sab && h.alive) for (const st of g.sabStationsNeeded()) arrow(M.SAB_STATIONS[st].x, M.SAB_STATIONS[st].y, '#ff4747');
      for (const pg of g.pings) if (h.alive) arrow(pg.x, pg.y, '#ffb347');
      if (h.trackTarget != null && h.trackUntil > g.t) {
        const q = g.players[h.trackTarget];
        if (q.alive) arrow(q.x, q.y, '#6fe3ff');
      }
      if (!h.isImp) {
        for (const tk of h.tasks) {
          if (tk.done || tk.step === 0 || !g.taskAvailable(tk)) continue;
          const st = M.STATIONS[tk.steps[tk.step]];
          arrow(st.x, st.y, '#ffd640');
        }
      }
      void hDead;
    },

    /* resolução dinâmica: se os quadros caem, baixa a resolução interna (e sobe de novo quando sobra fôlego) */
    adapt(dt) {
      this.fpsT += dt;
      this.fpsN++;
      if (this.fpsT < 2) return;
      const fps = this.fpsN / this.fpsT;
      this.fpsT = 0;
      this.fpsN = 0;
      this.fps = fps;
      const max = this.lv.pr, min = Math.min(0.6, max);
      let pr = this.dynPR;
      if (fps < 42) pr = Math.max(min, pr * 0.85);
      else if (fps > 57 && pr < max) pr = Math.min(max, pr * 1.08);
      if (Math.abs(pr - this.dynPR) > 0.02) {
        this.dynPR = pr;
        this.resize();
      }
    },

    /* vista de uma câmera de segurança (painel da Segurança): renderiza o 3D daquele ponto, sem névoa */
    drawCam(canvas, g, cam, t) {
      if (!this.renderer) return;
      if (!this.camRT) {
        this.camRT = new THREE.WebGLRenderTarget(320, 200);
        this.camCam = new THREE.PerspectiveCamera(70, 320 / 200, 0.1, 60);
        this.camBuf = new Uint8Array(320 * 200 * 4);
      }
      const c3 = this.world.cams.find((c) => c.cam === cam);
      const cc = this.camCam;
      if (c3) {
        /* um pouco à frente da lente, olhando para o meio do corredor (a própria câmera fica escondida) */
        const wp = new THREE.Vector3();
        c3.g.getWorldPosition(wp);
        const dx = c3.look.x - wp.x, dz = c3.look.z - wp.z, L = Math.hypot(dx, dz) || 1;
        cc.position.set(wp.x + (dx / L) * 0.8, 2.3, wp.z + (dz / L) * 0.8);
        cc.lookAt(c3.look.x, 0.2, c3.look.z);
        c3.g.visible = false;
      } else {
        cc.position.set(cam.x, 3, cam.y);
        cc.lookAt(cam.x, 0, cam.y + 0.001);
      }
      const UNI = AU.R3DKit.UNI;
      const vOn = UNI.uVisOn.value, cOn = UNI.uCutOn.value;
      UNI.uVisOn.value = 0;
      UNI.uCutOn.value = 0;
      /* quem aparece na câmera: vivos no alcance e com linha de visão até ela */
      const saved = [];
      for (const p of g.players) {
        const a = this.actors.list.get(p.id);
        if (!a) continue;
        saved.push([a.group, a.group.visible]);
        a.group.visible = p.alive && !p.inVent && !(p.invisUntil > g.t) && U.d2(p.x, p.y, cam.x, cam.y) <= M.CAM_R && Nav.los(cam.x, cam.y, p.x, p.y);
      }
      for (const [, m] of this.actors.ghosts) {
        saved.push([m, m.visible]);
        m.visible = false;
      }
      const rd = this.renderer;
      rd.setRenderTarget(this.camRT);
      rd.render(this.scene, cc);
      rd.readRenderTargetPixels(this.camRT, 0, 0, 320, 200, this.camBuf);
      rd.setRenderTarget(null);
      for (const [o, v] of saved) o.visible = v;
      if (c3) c3.g.visible = true;
      UNI.uVisOn.value = vOn;
      UNI.uCutOn.value = cOn;
      const ctx = canvas.getContext('2d');
      const img = ctx.createImageData(320, 200);
      /* a imagem sai em luz linear, sem a correção de tela: aplica exposição, curva de filme e gama por tabela,
         com o tom esverdeado de circuito fechado */
      if (!this.camLut) {
        const lut = new Uint8Array(256 * 3);
        for (let i = 0; i < 256; i++) {
          const v = (i / 255) * 2.2;
          const a = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14);
          const s = Math.pow(Math.min(1, Math.max(0, a)), 1 / 2.2);
          lut[i * 3] = Math.round(s * 235);
          lut[i * 3 + 1] = Math.round(Math.min(255, s * 262));
          lut[i * 3 + 2] = Math.round(s * 238);
        }
        this.camLut = lut;
      }
      const lut = this.camLut, buf = this.camBuf, d = img.data;
      for (let y = 0; y < 200; y++) {
        const src = (199 - y) * 320 * 4, dst = y * 320 * 4;
        for (let x = 0; x < 320 * 4; x += 4) {
          d[dst + x] = lut[buf[src + x] * 3];
          d[dst + x + 1] = lut[buf[src + x + 1] * 3 + 1];
          d[dst + x + 2] = lut[buf[src + x + 2] * 3 + 2];
          d[dst + x + 3] = 255;
        }
      }
      const tmp = this.camTmp || (this.camTmp = document.createElement('canvas'));
      tmp.width = 320;
      tmp.height = 200;
      tmp.getContext('2d').putImageData(img, 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,255,120,0.05)';
      for (let y = 0; y < canvas.height; y += 3) ctx.fillRect(0, y, canvas.width, 1);
      ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff3b3b' : 'transparent';
      ctx.beginPath();
      ctx.arc(12, 12, 5, 0, Math.PI * 2);
      ctx.fill();
    },

    /* nova partida: tira os personagens da anterior e centraliza a câmera */
    reset(g) {
      if (this.actors) this.actors.dispose();
      if (g && g.human) {
        this.cam.x = g.human.x;
        this.cam.y = g.human.y;
      }
      this.snap = true;
      if (this.parts) this.parts.list.length = 0;
      for (const vg of this.ventGuys || []) this.scene.remove(vg.a.group);
      if (this.ventGuys) this.ventGuys.length = 0;
      this.seenFx = new WeakSet();
    },
    hide() {
      this.active = false;
    },
    /* descarta a montagem atual; devolve a tela a usar (a nova, se a pedida era a que foi trocada) */
    release(canvas) {
      if (!this.renderer) return canvas;
      const was = this.canvas;
      this.dispose();
      return canvas === was ? this.canvas : canvas;
    },
    dispose() {
      if (this.job) {
        this.job.cancel = true;
        this.job = null;
      }
      const r = this.renderer;
      this.renderer = null;
      this.composer = null;
      this.active = false;
      if (r) {
        r.dispose();
        if (r.forceContextLoss) r.forceContextLoss();
        /* a tela de desenho fica presa ao contexto perdido: põe uma nova no lugar (mesmo id) para a próxima montagem */
        const old = this.canvas;
        if (old && old.parentNode) {
          const fresh = old.cloneNode(false);
          old.parentNode.replaceChild(fresh, old);
          this.canvas = fresh;
        }
      }
    },
  };

  AU.R3D = R3;
})();

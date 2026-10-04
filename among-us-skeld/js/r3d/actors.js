/* Mapa 3D, os personagens: tripulante com traje de borracha, viseira de vidro que reflete o ambiente, mochila e pernas
   que andam de verdade; chapéus e mascotes; fantasma translúcido flutuando; o corpo partido com o osso para fora.
   Cada jogador tem um "ator" que segue a posição do jogo a cada quadro e vira para onde anda. */
(function () {
  'use strict';
  const AU = window.AU;
  const THREE = window.THREE;
  if (!THREE) return;
  const C = AU.C;
  const KIT = AU.R3DKit;

  const SCALE = 1.3;
  /* ---------- geometrias compartilhadas ---------- */
  let G = null;
  function geos() {
    if (G) return G;
    const V = (a, b) => new THREE.Vector2(a, b);
    /* perfil do corpo (feijão): base nas pernas, cúpula em cima */
    const prof = [V(0, 0.2), V(0.27, 0.2), V(0.33, 0.25), V(0.355, 0.36), V(0.36, 0.55), V(0.355, 0.74), V(0.335, 0.86), V(0.29, 0.97), V(0.21, 1.04), V(0.11, 1.08), V(0, 1.09)];
    const body = new THREE.LatheGeometry(prof, 40);
    body.scale(1, 1, 0.92);
    const ghostProf = [V(0, 0.32), V(0.3, 0.3), V(0.36, 0.42), V(0.36, 0.55), V(0.355, 0.74), V(0.335, 0.86), V(0.29, 0.97), V(0.21, 1.04), V(0.11, 1.08), V(0, 1.09)];
    const ghost = new THREE.LatheGeometry(ghostProf, 32);
    ghost.scale(1, 1, 0.92);
    /* metade de baixo (corpo partido) */
    const halfProf = [V(0, 0.2), V(0.27, 0.2), V(0.33, 0.25), V(0.355, 0.36), V(0.36, 0.5), V(0.355, 0.52)];
    const half = new THREE.LatheGeometry(halfProf, 32);
    half.scale(1, 1, 0.92);
    const leg = new THREE.CapsuleGeometry(0.105, 0.13, 6, 14);
    leg.translate(0, -0.1, 0);
    const pack = new THREE.RoundedBoxGeometry(0.44, 0.5, 0.2, 3, 0.07);
    const visor = new THREE.SphereGeometry(1, 32, 18);
    visor.scale(0.235, 0.14, 0.13);
    const shine = new THREE.SphereGeometry(1, 12, 8);
    shine.scale(0.07, 0.03, 0.02);
    const shadow = new THREE.CircleGeometry(0.5, 28);
    shadow.rotateX(-Math.PI / 2);
    G = { body, ghost, half, leg, pack, visor, shine, shadow };
    return G;
  }

  /* ---------- materiais por cor (guardados) ---------- */
  const SUIT = {}, VIS = {}, GHOST = {};
  function suit(colorId) {
    if (SUIT[colorId]) return SUIT[colorId];
    const col = (C.COLOR[colorId] || C.COLORS[0]).hex;
    const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.48, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.35) });
    KIT.patch(m, { ao: false });
    SUIT[colorId] = m;
    return m;
  }
  function visorMat(visorId) {
    if (VIS[visorId]) return VIS[visorId];
    const hex = (C.VISORS.find((v) => v.id === visorId) || C.VISORS[0]).hex;
    const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.04, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.8, emissive: new THREE.Color(hex).multiplyScalar(0.12) });
    KIT.patch(m, { ao: false });
    VIS[visorId] = m;
    return m;
  }
  function ghostMat(colorId) {
    if (GHOST[colorId]) return GHOST[colorId];
    const col = (C.COLOR[colorId] || C.COLORS[0]).hex;
    const m = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.3, transparent: true, opacity: 0.42, depthWrite: false, emissive: col, emissiveIntensity: 0.25 });
    GHOST[colorId] = m;
    return m;
  }
  let SHINE = null, SHADOW = null, FLESH = null, BONE = null;
  function shared() {
    if (SHINE) return;
    SHINE = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 });
    const c = KIT.canvas(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    SHADOW = KIT.patch(new THREE.MeshBasicMaterial({ map: KIT.tex(c, true), transparent: true, depthWrite: false }), { ao: false });
    FLESH = KIT.patch(new THREE.MeshStandardMaterial({ color: '#7a0f1a', roughness: 0.35, metalness: 0, emissive: '#2a0006' }), { ao: false });
    BONE = KIT.patch(new THREE.MeshStandardMaterial({ color: '#f1ece0', roughness: 0.55 }), { ao: false });
  }

  /* ---------- chapéus em 3D ---------- */
  const HATS = {};
  function hatMesh(hat) {
    if (!hat || hat === 'nenhum') return null;
    if (!HATS[hat]) {
      const k = new KIT.Kit();
      const P = (c, r) => KIT.patch(new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.5 : r, metalness: 0 }), { ao: false });
      const top = 1.06;
      switch (hat) {
        case 'cowboy':
          k.cyl(0.42, 0.42, 0.03, P('#8a5a2b'), 0, top + 0.02, 0, 32);
          k.cyl(0.19, 0.22, 0.24, P('#8a5a2b'), 0, top + 0.15, 0, 24);
          k.cyl(0.225, 0.225, 0.05, P('#4a2e14'), 0, top + 0.07, 0, 24);
          break;
        case 'coroa': {
          const gold = KIT.patch(new THREE.MeshStandardMaterial({ color: '#f2c94c', metalness: 1, roughness: 0.25 }), { ao: false });
          k.cyl(0.2, 0.22, 0.12, gold, 0, top + 0.03, 0, 24);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            k.add(new THREE.ConeGeometry(0.05, 0.14, 8), gold, Math.cos(a) * 0.19, top + 0.15, Math.sin(a) * 0.19);
            k.sphere(0.025, P('#e04848', 0.2), Math.cos(a) * 0.2, top + 0.05, Math.sin(a) * 0.2);
          }
          break;
        }
        case 'cogumelo':
          k.sphere(0.34, P('#d63a3a', 0.4), 0, top + 0.02, 0, 1, 0.55, 1, 24);
          for (const [a, b] of [[0.15, 0.1], [-0.12, 0.14], [0.02, -0.18], [-0.2, -0.05]]) k.sphere(0.05, P('#ffffff'), a, top + 0.15, b);
          break;
        case 'festa':
          k.add(new THREE.ConeGeometry(0.16, 0.42, 20), P('#3aa0ff', 0.35), 0.03, top + 0.2, 0);
          k.sphere(0.06, P('#ffd84d'), 0.03, top + 0.42, 0);
          break;
        case 'obra':
          k.sphere(0.32, P('#f5c518', 0.3), 0, top - 0.02, 0, 1, 0.6, 1, 24);
          k.cyl(0.4, 0.4, 0.025, P('#f5c518', 0.3), 0, top - 0.02, 0.04, 28);
          break;
        case 'bone':
          k.sphere(0.3, P('#2d6cdf'), 0, top - 0.02, 0, 1, 0.5, 1, 24);
          k.add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), P('#2d6cdf'), 0, top - 0.02, 0.18);
          break;
        case 'flor':
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            k.sphere(0.07, P('#ff8fd1'), Math.cos(a) * 0.09, top + 0.06, Math.sin(a) * 0.09 + 0.05);
          }
          k.sphere(0.05, P('#ffd84d'), 0, top + 0.08, 0.05);
          break;
        case 'antena':
          k.cyl(0.015, 0.015, 0.3, P('#30343c'), 0.06, top + 0.12, 0, 8);
          k.sphere(0.06, KIT.MAT.glow('#ff5a5a', 1.8), 0.06, top + 0.28, 0);
          break;
        default:
          return null;
      }
      HATS[hat] = k.build({ receive: false });
    }
    return HATS[hat].clone();
  }

  /* ---------- mascotes ---------- */
  function petMesh(pet, colorId) {
    if (!pet || pet === 'nenhum') return null;
    const g = new THREE.Group();
    if (pet === 'mini') {
      const a = makeCrew(colorId, 'nenhum', 'azul');
      a.group.scale.setScalar(0.42);
      g.add(a.group);
      g.userData.mini = a;
    } else if (pet === 'robo') {
      const k = new KIT.Kit();
      k.rbox(0.28, 0.24, 0.24, 0.05, KIT.MAT.metalLight, 0, 0.2, 0);
      k.box(0.14, 0.05, 0.02, KIT.MAT.glow('#66ffff', 2), 0, 0.22, 0.125);
      k.cyl(0.01, 0.01, 0.14, KIT.MAT.metalDark, 0, 0.38, 0, 6);
      k.sphere(0.03, KIT.MAT.glow('#ff5a5a', 2), 0, 0.46, 0);
      g.add(k.build({ receive: false }));
    } else if (pet === 'slime') {
      const m = new THREE.MeshPhysicalMaterial({ color: '#7ee06b', roughness: 0.1, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1 });
      KIT.patch(m, { ao: false });
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), m);
      s.scale.set(1, 0.7, 1);
      s.position.y = 0.12;
      s.castShadow = true;
      g.add(s);
    }
    return g;
  }

  /* ---------- tripulante ---------- */
  function makeCrew(colorId, hat, visor) {
    geos();
    shared();
    const group = new THREE.Group();
    const inner = new THREE.Group();
    /* um pouco maior que o tamanho real: de cima, o personagem precisa ser lido de longe como no jogo */
    inner.scale.setScalar(SCALE);
    group.add(inner);
    const sm = suit(colorId);
    const body = new THREE.Mesh(G.body, sm);
    const pack = new THREE.Mesh(G.pack, sm);
    pack.position.set(0, 0.62, -0.32);
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(s * 0.14, 0.27, 0.02);
      const l = new THREE.Mesh(G.leg, sm);
      hip.add(l);
      inner.add(hip);
      legs.push(hip);
      l.castShadow = true;
    }
    const vis = new THREE.Mesh(G.visor, visorMat(visor));
    vis.position.set(0, 0.79, 0.255);
    const shine = new THREE.Mesh(G.shine, SHINE);
    shine.position.set(0.08, 0.84, 0.375);
    inner.add(body, pack, vis, shine);
    for (const m of [body, pack, vis]) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    const shadow = new THREE.Mesh(G.shadow, SHADOW);
    shadow.position.y = 0.015;
    shadow.scale.setScalar(SCALE);
    shadow.renderOrder = 1;
    group.add(shadow);
    const hm = hatMesh(hat);
    if (hm) inner.add(hm);
    return { group, inner, body, pack, legs, vis, shine, shadow, hat: hm, hatId: hat, colorId, visorId: visor };
  }
  function restyle(a, colorId, hat, visor) {
    if (a.colorId !== colorId) {
      const sm = suit(colorId);
      a.body.material = sm;
      a.pack.material = sm;
      for (const hip of a.legs) hip.children[0].material = sm;
      a.colorId = colorId;
    }
    if (a.visorId !== visor) {
      a.vis.material = visorMat(visor);
      a.visorId = visor;
    }
    if (a.hatId !== hat) {
      if (a.hat) a.inner.remove(a.hat);
      a.hat = hatMesh(hat);
      if (a.hat) a.inner.add(a.hat);
      a.hatId = hat;
    }
  }

  function makeGhost(colorId) {
    geos();
    const g = new THREE.Group();
    g.scale.setScalar(SCALE);
    const m = ghostMat(colorId);
    const b = new THREE.Mesh(G.ghost, m);
    const p = new THREE.Mesh(G.pack, m);
    p.position.set(0, 0.62, -0.32);
    const v = new THREE.Mesh(G.visor, m);
    v.position.set(0, 0.79, 0.255);
    g.add(b, p, v);
    return g;
  }

  function makeBody(colorId) {
    geos();
    shared();
    const g = new THREE.Group();
    const sm = suit(colorId);
    const half = new THREE.Mesh(G.half, sm);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.355, 32), FLESH);
    cap.rotation.x = -Math.PI / 2;
    cap.scale.set(1, 0.92, 1);
    cap.position.y = 0.515;
    const pack = new THREE.Mesh(G.pack, sm);
    pack.scale.set(1, 0.6, 1);
    pack.position.set(0, 0.36, -0.32);
    const bone = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.32, 12), BONE);
    shaft.position.y = 0.66;
    const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), BONE);
    k1.position.set(-0.05, 0.84, 0);
    const k2 = k1.clone();
    k2.position.x = 0.05;
    bone.add(shaft, k1, k2);
    g.add(half, cap, pack, bone);
    for (const s of [-1, 1]) {
      const l = new THREE.Mesh(G.leg, sm);
      l.position.set(s * 0.14, 0.27, 0.02);
      g.add(l);
    }
    /* poça escura no chão */
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), KIT.patch(new THREE.MeshStandardMaterial({ color: '#3a0008', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85, depthWrite: false }), { ao: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(0.12, 0.012, 0.15);
    pool.scale.set(1.2, 0.8, 1);
    g.add(pool);
    g.traverse((o) => {
      if (o.isMesh && o !== pool) o.castShadow = true;
    });
    /* caído de lado, como no original */
    g.rotation.y = 0.5;
    g.scale.setScalar(SCALE);
    return g;
  }

  /* ---------- gerenciador ---------- */
  class Actors {
    constructor(scene) {
      this.scene = scene;
      this.list = new Map();
      this.bodies = new Map();
      this.ghosts = new Map();
    }
    actor(p) {
      let a = this.list.get(p.id);
      if (!a) {
        const ap = p;
        a = makeCrew(ap.color, ap.hat, ap.visor);
        a.yaw = 0;
        a.px = p.x;
        a.pz = p.y;
        a.pet = null;
        a.petId = null;
        this.scene.add(a.group);
        this.list.set(p.id, a);
      }
      return a;
    }
    /* vis(p) -> { show, alpha }; chamado a cada quadro */
    update(g, dt, t, vis) {
      const seen = new Set();
      for (const p of g.players) {
        const a = this.actor(p);
        const v = vis(p);
        seen.add(p.id);
        const ap = g.appear(p);
        restyle(a, ap.color, ap.hat, ap.visor);
        /* fantasma (morto) é outro corpo */
        if (!p.alive) {
          a.group.visible = false;
          let gh = this.ghosts.get(p.id);
          if (v.show) {
            if (!gh) {
              gh = makeGhost(p.color);
              this.scene.add(gh);
              this.ghosts.set(p.id, gh);
            }
            gh.visible = true;
            gh.position.set(p.x, 0.25 + Math.sin(t * 2.4 + p.id) * 0.08, p.y);
            const mv = Math.hypot(p.x - (gh.userData.px || p.x), p.y - (gh.userData.pz || p.y));
            if (mv > 0.002) gh.rotation.y = Math.atan2(p.x - gh.userData.px, p.y - gh.userData.pz);
            gh.userData.px = p.x;
            gh.userData.pz = p.y;
          } else if (gh) gh.visible = false;
          if (a.pet) a.pet.visible = false;
          continue;
        }
        const gh = this.ghosts.get(p.id);
        if (gh) gh.visible = false;
        a.group.visible = !!v.show;
        if (!v.show) {
          if (a.pet) a.pet.visible = false;
          a.px = p.x;
          a.pz = p.y;
          continue;
        }
        /* direção: para onde anda (suave) */
        const dx = p.x - a.px, dz = p.y - a.pz;
        const moving = p.moving || Math.hypot(dx, dz) > 0.004;
        if (Math.hypot(dx, dz) > 0.004) {
          const want = Math.atan2(dx, dz);
          let d = want - a.yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          a.yaw += d * Math.min(1, dt * 14);
        }
        a.px = p.x;
        a.pz = p.y;
        /* saindo do duto: cresce com um pulinho */
        let sc = 1, hop = 0;
        if (p.popT != null) {
          const k = (g.t - p.popT) / 0.35;
          if (k >= 0 && k < 1) {
            sc = Math.max(0.05, 1 + Math.sin(k * Math.PI) * 0.25 - (1 - k) * 0.9);
            hop = Math.sin(k * Math.PI) * 0.35;
          }
        }
        /* metamorfo trocando: o corpo treme */
        let wob = 0;
        if (p.morph) {
          const k = (g.t - p.morph.t0) / 0.6;
          if (k >= 0 && k < 1) wob = Math.sin(k * Math.PI * 7) * (1 - k);
        }
        const ph = (p.walkT || 0) * 11;
        const bob = moving ? Math.abs(Math.sin(ph)) * 0.045 : Math.sin(t * 2 + p.id) * 0.006;
        a.group.position.set(p.x + wob * 0.05, hop, p.y);
        a.group.rotation.y = a.yaw;
        a.group.scale.setScalar(sc * (1 + Math.abs(wob) * 0.08));
        a.inner.position.y = bob * SCALE;
        a.inner.rotation.x = moving ? 0.08 + Math.sin(ph * 2) * 0.015 : 0;
        a.inner.rotation.z = moving ? Math.sin(ph) * 0.03 : 0;
        a.legs[0].rotation.x = moving ? Math.sin(ph) * 0.55 : 0;
        a.legs[1].rotation.x = moving ? -Math.sin(ph) * 0.55 : 0;
        /* transparência (invisível para quem pode ver) */
        const alpha = v.alpha == null ? 1 : v.alpha;
        setAlpha(a, alpha);
        /* mascote */
        if (a.petId !== ap.pet || a.petColor !== ap.color) {
          if (a.pet) this.scene.remove(a.pet);
          a.pet = petMesh(ap.pet, ap.color);
          a.petId = ap.pet;
          a.petColor = ap.color;
          if (a.pet) this.scene.add(a.pet);
        }
        if (a.pet) {
          a.pet.visible = true;
          a.pet.position.set(p.petX, Math.abs(Math.sin(t * 6 + p.id)) * (moving ? 0.06 : 0.01), p.petY);
          a.pet.rotation.y = a.yaw;
        }
      }
      for (const [id, a] of this.list) if (!seen.has(id)) a.group.visible = false;
      /* corpos */
      const live = new Set();
      for (const b of g.bodies) {
        if (b.gone) continue;
        live.add(b.id);
        let m = this.bodies.get(b.id);
        if (!m) {
          m = makeBody(g.players[b.pid].color);
          m.position.set(b.x, 0, b.y);
          this.scene.add(m);
          this.bodies.set(b.id, m);
        }
        m.visible = vis({ body: b }).show;
      }
      for (const [id, m] of this.bodies) {
        if (live.has(id)) continue;
        this.scene.remove(m);
        this.bodies.delete(id);
      }
    }
    dispose() {
      for (const a of this.list.values()) {
        this.scene.remove(a.group);
        if (a.pet) this.scene.remove(a.pet);
      }
      for (const m of this.bodies.values()) this.scene.remove(m);
      for (const m of this.ghosts.values()) this.scene.remove(m);
      this.list.clear();
      this.bodies.clear();
      this.ghosts.clear();
    }
  }
  /* alfa por ator: materiais clonados só quando precisa (invisível), para não mexer na cor dos outros */
  function setAlpha(a, alpha) {
    const want = alpha < 0.99;
    if (want === !!a.faded && (!want || a.fadeA === alpha)) return;
    a.faded = want;
    a.fadeA = alpha;
    a.inner.traverse((o) => {
      if (!o.isMesh) return;
      if (want) {
        if (!o.userData.base) o.userData.base = o.material;
        const m = o.userData.base.clone();
        m.transparent = true;
        m.opacity = alpha;
        m.depthWrite = false;
        o.material = m;
      } else if (o.userData.base) {
        o.material = o.userData.base;
        o.userData.base = null;
      }
    });
  }

  AU.R3DActors = { Actors, makeCrew, makeBody, makeGhost };
})();

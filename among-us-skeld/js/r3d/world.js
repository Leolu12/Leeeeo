/* Mapa 3D, a nave: piso, paredes, casco, portas, dutos, luminárias, janelas, câmeras e os móveis de cada sala, todos
   montados a partir dos mesmos dados do mapa 2D (salas, paredes, objetos sólidos), então o que é sólido no jogo é
   sólido no 3D. 1 tile = 1 metro; x do mapa = x do mundo, y do mapa = z do mundo, altura = y.
   As paredes do fundo das salas são altas e as da frente (do lado da câmera) baixas, como numa maquete aberta: a
   parede nunca esconde quem está dentro da sala. */
(function () {
  'use strict';
  const AU = window.AU;
  const THREE = window.THREE;
  if (!THREE) return;
  const M = AU.Map, W = M.W, H = M.H;
  const KIT = AU.R3DKit;

  const HIGH = 2.5, LOW = 0.62, HULL_Y = -0.55, HULL_DEEP = -3.2;
  const STYLE = {
    cafeteria: ['tiles2', '#c3c9d3'], medbay: ['tiles', '#b4e2e4'], electrical: ['grate', '#c2b994'], storage: ['plates2', '#b8a27c'],
    reactor: ['tread', '#8a9ec4'], upperEngine: ['tread', '#a3acbf'], lowerEngine: ['tread', '#a3acbf'], security: ['carpet', '#6d7690'],
    admin: ['carpet', '#677ba3'], weapons: ['plates', '#959bb8'], o2: ['tiles', '#b0d9c9'], navigation: ['plates', '#8a9dc0'],
    shields: ['hexes', '#a4aed8'], comms: ['tiles', '#adb3c6'],
  };
  const HALL_STYLE = ['plates', '#959eb1'];
  const ACCENT = {
    cafeteria: '#9fc2ff', medbay: '#48d6b0', electrical: '#f0c93a', storage: '#ee8f3a', reactor: '#4aa3ff', upperEngine: '#ff9a3c',
    lowerEngine: '#ff9a3c', security: '#4be38b', admin: '#3ae08a', weapons: '#ef5350', o2: '#78d36a', navigation: '#5fd6ff', shields: '#8fa6ff', comms: '#b07cff',
  };

  /* o ponto está no piso? (cantos em diagonal pela reta de verdade) */
  const pointFloor = (px, pz) => {
    const tx = Math.floor(px), tz = Math.floor(pz);
    if (!(M.isFloor(tx, tz) || M.isCutTile(tx, tz))) return false;
    return M.chamferGap(px, pz) >= 0;
  };
  const tileHasFloor = (tx, tz) => M.isFloor(tx, tz) || (M.isCutTile(tx, tz) && (pointFloor(tx + 0.2, tz + 0.2) || pointFloor(tx + 0.8, tz + 0.2) || pointFloor(tx + 0.2, tz + 0.8) || pointFloor(tx + 0.8, tz + 0.8)));
  /* canto em diagonal que corta este tile (algum vértice do tile fica do lado da parede) */
  const chamferOf = (tx, tz) => M.CHAMFERS.find((c) => {
    if (tx < c.rect[0] || tz < c.rect[1] || tx >= c.rect[0] + c.rect[2] || tz >= c.rect[1] + c.rect[3]) return false;
    for (const [px, pz] of [[tx, tz], [tx + 1, tz], [tx, tz + 1], [tx + 1, tz + 1]]) if (c.sx * (px - c.ox) + c.sy * (pz - c.oy) - c.a < -1e-6) return true;
    return false;
  }) || null;
  const polyArea = (p) => {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      a += p[i][0] * q[1] - q[0] * p[i][1];
    }
    return Math.abs(a) / 2;
  };

  /* recorte de um polígono convexo por um semiplano a*x + b*z + c >= 0 */
  function clip(poly, a, b, c) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const P = poly[i], Q = poly[(i + 1) % poly.length];
      const fp = a * P[0] + b * P[1] + c, fq = a * Q[0] + b * Q[1] + c;
      if (fp >= 0) out.push(P);
      if ((fp >= 0) !== (fq >= 0)) {
        const t = fp / (fp - fq);
        out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]);
      }
    }
    return out;
  }
  const square = (x, z) => [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
  /* geometria de um polígono horizontal (em leque) com uv em metros/escala */
  function flatGeo(poly, y, uvs, up) {
    const pos = [], nor = [], uv = [];
    const ny = up === false ? -1 : 1;
    for (let i = 1; i < poly.length - 1; i++) {
      /* polígonos vêm no sentido horário do mapa: para a face olhar para cima a ordem precisa ser invertida */
      const tri = up === false ? [poly[0], poly[i], poly[i + 1]] : [poly[0], poly[i + 1], poly[i]];
      for (const p of tri) {
        pos.push(p[0], y, p[1]);
        nor.push(0, ny, 0);
        uv.push(p[0] / uvs, p[1] / uvs);
      }
    }
    /* a ordem dos vértices define a frente: no plano xz com y para cima, o leque precisa girar no sentido certo */
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }
  /* face vertical de (x0,z0) a (x1,z1), de y0 a y1, virada para o lado da normal dada */
  function sideGeo(x0, z0, x1, z1, y0, y1, nx, nz, uS, vS) {
    const L = Math.hypot(x1 - x0, z1 - z0);
    /* lado: a frente precisa apontar para (nx, nz) */
    const cross = (x1 - x0) * nz - (z1 - z0) * nx;
    if (cross < 0) {
      [x0, x1] = [x1, x0];
      [z0, z1] = [z1, z0];
    }
    const u0 = 0, u1 = L / uS;
    const base = Math.abs(nx) > Math.abs(nz) ? Math.min(z0, z1) : Math.min(x0, x1);
    const a = [x0, y0, z0], b = [x1, y0, z1], c = [x1, y1, z1], d = [x0, y1, z0];
    const pos = [...a, ...b, ...c, ...a, ...c, ...d];
    const nor = [];
    for (let i = 0; i < 6; i++) nor.push(nx, 0, nz);
    const o = base / uS;
    const uv = [o + u0, y0 / vS, o + u1, y0 / vS, o + u1, y1 / vS, o + u0, y0 / vS, o + u1, y1 / vS, o + u0, y1 / vS];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  }

  /* ---------- paredes: altura por tile ---------- */
  const wallH = new Float32Array(W * H);
  const isWallTile = new Uint8Array(W * H);
  const wallPoly = new Array(W * H);
  function classify() {
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x;
      const ch = chamferOf(x, z);
      const isF = M.isFloor(x, z), cut = M.isCutTile(x, z);
      if (isF && !ch) continue;
      let poly = square(x, z);
      if (ch) {
        /* parte do tile que é parede: f <= 0 (o resto é piso) */
        const k = Math.SQRT1_2;
        poly = clip(poly, -ch.sx * k, -ch.sy * k, (ch.sx * ch.ox + ch.sy * ch.oy + ch.a) * k);
        if (poly.length < 3 || polyArea(poly) < 1e-3) continue;
      } else {
        let near = false;
        for (let dz = -1; dz <= 1 && !near; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && tileHasFloor(x + dx, z + dz)) near = true;
        if (!near && !cut) continue;
      }
      isWallTile[i] = 1;
      wallPoly[i] = poly;
      let h = HIGH;
      if (ch) {
        h = ch.sy < 0 ? LOW : HIGH;
      } else {
        const N = tileHasFloor(x, z - 1), S = tileHasFloor(x, z + 1), E = tileHasFloor(x + 1, z), Wt = tileHasFloor(x - 1, z);
        const NE = tileHasFloor(x + 1, z - 1), NW = tileHasFloor(x - 1, z - 1);
        if (N || ((NE || NW) && !S && !E && !Wt)) h = LOW;
      }
      wallH[i] = h;
    }
  }
  const heightAt = (px, pz) => {
    const tx = Math.floor(px), tz = Math.floor(pz);
    if (tx < 0 || tz < 0 || tx >= W || tz >= H) return HULL_DEEP;
    if (pointFloor(px, pz)) return 0;
    const i = tz * W + tx;
    if (isWallTile[i]) return wallH[i];
    return hullAt(tx, tz) ? HULL_Y : HULL_DEEP;
  };
  let hullMask = null;
  function hullAt(tx, tz) {
    if (tx < 0 || tz < 0 || tx >= W || tz >= H) return false;
    return hullMask[tz * W + tx] === 1;
  }
  function buildHullMask() {
    hullMask = new Uint8Array(W * H);
    const R = 3;
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, z) || isWallTile[z * W + x]) continue;
      let ok = false;
      for (let dz = -R; dz <= R && !ok; dz++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dz * dz > R * R + 1) continue;
        if (M.isFloor(x + dx, z + dz)) {
          ok = true;
          break;
        }
      }
      if (ok) hullMask[z * W + x] = 1;
    }
  }

  /* ---------- montagem do mundo ---------- */
  /* em etapas (yield entre as partes), para montar aos poucos sem travar a tela; build() faz tudo de uma vez */
  function* buildGen(scene) {
    const MAT = KIT.MAT;
    classify();
    buildHullMask();
    const out = { lights: [], doors: [], vents: {}, dyn: [], cams: [], windows: [], groups: [], stations: {} };
    const root = new THREE.Group();
    scene.add(root);

    /* piso, por área (cada sala com o seu material) */
    const floorKits = new Map();
    const kitFor = (key) => {
      if (!floorKits.has(key)) floorKits.set(key, new KIT.Kit());
      return floorKits.get(key);
    };
    const mats = {};
    const floorMat = (aid) => {
      if (mats[aid]) return mats[aid];
      const st = STYLE[aid] || HALL_STYLE;
      mats[aid] = MAT.floor[st[0]](st[1]);
      return mats[aid];
    };
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const isF = M.isFloor(x, z), cut = M.isCutTile(x, z);
      if (!isF && !cut) continue;
      let poly = square(x, z);
      for (const c of M.CHAMFERS) {
        if (x < c.rect[0] - 1 || z < c.rect[1] - 1 || x > c.rect[0] + c.rect[2] || z > c.rect[1] + c.rect[3]) continue;
        const k = Math.SQRT1_2;
        poly = clip(poly, c.sx * k, c.sy * k, -(c.sx * c.ox + c.sy * c.oy + c.a) * k);
      }
      if (poly.length < 3) continue;
      let a = M.AREAS[M.areaIdx[z * W + x]];
      if (!a) a = M.areaAt(x + 0.5, z + 0.5);
      const aid = a ? a.id : 'hall';
      kitFor(aid).add(flatGeo(poly, 0, 2), floorMat(a && a.kind === 'room' ? aid : 'hall'), 0, 0, 0);
    }
    for (const [aid, kit] of floorKits) {
      const g = kit.build({ cast: false });
      g.name = 'floor:' + aid;
      root.add(g);
    }
    yield;

    /* paredes e casco */
    const wk = new KIT.Kit(), hk = new KIT.Kit(), tk = new KIT.Kit();
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      const i = z * W + x;
      if (!isWallTile[i]) continue;
      const poly = wallPoly[i], h = wallH[i];
      wk.add(flatGeo(poly, h, 2), MAT.wallTop, 0, 0, 0);
      for (let e = 0; e < poly.length; e++) {
        const P = poly[e], Q = poly[(e + 1) % poly.length];
        const ex = Q[0] - P[0], ez = Q[1] - P[1], L = Math.hypot(ex, ez);
        if (L < 1e-4) continue;
        /* normal para fora do polígono (o polígono gira no sentido horário em xz) */
        let nx = ez / L, nz = -ex / L;
        const mx = (P[0] + Q[0]) / 2, mz = (P[1] + Q[1]) / 2;
        const tx0 = mx + nx * 0.05, tz0 = mz + nz * 0.05;
        if (pointInPoly(poly, tx0, tz0)) {
          nx = -nx;
          nz = -nz;
        }
        const nh = heightAt(mx + nx * 0.05, mz + nz * 0.05);
        if (nh >= h - 1e-3) continue;
        const floorSide = nh === 0;
        wk.add(sideGeo(P[0], P[1], Q[0], Q[1], Math.max(nh, HULL_DEEP), h, nx, nz, 2.5, 2.5), floorSide || nh > 0 ? MAT.wall : MAT.hullSide, 0, 0, 0);
        if (floorSide) {
          /* rodapé escuro e o friso de cima, na face que dá para o piso (finos, colados na parede) */
          const o1 = 0.015, o2 = 0.025;
          tk.add(sideGeo(P[0] + nx * o1, P[1] + nz * o1, Q[0] + nx * o1, Q[1] + nz * o1, 0, 0.13, nx, nz, 2.5, 2.5), MAT.base, 0, 0, 0);
          tk.add(sideGeo(P[0] + nx * o2, P[1] + nz * o2, Q[0] + nx * o2, Q[1] + nz * o2, h - 0.09, h, nx, nz, 2.5, 2.5), MAT.trim, 0, 0, 0);
          if (h === HIGH) tk.add(sideGeo(P[0] + nx * o1, P[1] + nz * o1, Q[0] + nx * o1, Q[1] + nz * o1, 1.08, 1.14, nx, nz, 2.5, 2.5), MAT.trim, 0, 0, 0);
        }
      }
    }
    for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
      if (!hullAt(x, z)) continue;
      hk.add(flatGeo(square(x, z), HULL_Y, 3), MAT.hull, 0, 0, 0);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz;
        if (hullAt(nx, nz) || isWallTile[nz * W + nx] || M.isFloor(nx, nz)) continue;
        const x0 = dx === 1 ? x + 1 : dx === -1 ? x : x, x1 = dx === 1 ? x + 1 : dx === -1 ? x : x + 1;
        const z0 = dz === 1 ? z + 1 : dz === -1 ? z : z, z1 = dz === 1 ? z + 1 : dz === -1 ? z : z + 1;
        hk.add(sideGeo(x0, z0, x1, z1, HULL_DEEP, HULL_Y, dx, dz, 3, 3), MAT.hullSide, 0, 0, 0);
      }
    }
    yield;
    const walls = wk.build();
    walls.name = 'walls';
    root.add(walls);
    const hull = hk.build({ cast: false });
    hull.name = 'hull';
    root.add(hull);
    const trims = tk.build({ cast: false });
    root.add(trims);

    /* detalhes por sala (móveis, consoles, luminárias, canos, placas) — um grupo por sala para o recorte da câmera */
    const roomKits = {};
    const RK = (aid) => (roomKits[aid] = roomKits[aid] || new KIT.Kit());
    const kitOf = (x, z) => {
      const a = M.areaAt(x, z);
      return RK(a ? a.id : 'misc');
    };
    const ctx = { MAT, out, RK, kitOf, heightAt, HIGH, LOW };
    yield;
    lamps(ctx);
    doors(ctx, root);
    vents(ctx, root);
    yield;
    cameras(ctx, root);
    windows(ctx, root);
    wallDecor(ctx);
    yield;
    let n = 0;
    for (const pr of M.PROPS) {
      const fn = PROP[pr.kind];
      if (!fn) continue;
      try {
        fn(RK(pr.room), pr, ctx);
      } catch (e) {
        if (window.console) console.warn('objeto 3D falhou', pr.kind, e);
      }
      if (++n % 8 === 0) yield;
    }
    floorDecor(ctx);
    for (const o of out.extra || []) root.add(o);
    yield;
    n = 0;
    for (const [aid, kit] of Object.entries(roomKits)) {
      const g = kit.build();
      g.name = 'room:' + aid;
      root.add(g);
      if (++n % 3 === 0) yield;
    }
    out.root = root;
    return out;
  }
  function build(scene) {
    const it = buildGen(scene);
    for (;;) {
      const r = it.next();
      if (r.done) return r.value;
    }
  }
  function pointInPoly(poly, x, z) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ---------- luminárias na parede do fundo das salas e corredores (fonte de luz de verdade) ---------- */
  function lamps(ctx) {
    const { MAT, out, kitOf } = ctx;
    const taken = [];
    for (const a of Object.values(M.STATION_ART)) taken.push([a.x, a.y]);
    for (const cam of M.CAMS) taken.push([cam.x, cam.y]);
    const free = (x, y) => !taken.some(([tx, ty]) => Math.abs(tx - x) < 1.6 && Math.abs(ty - y) < 3);
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      if (M.isFloor(x, y) || !M.isFloor(x, y + 1) || M.isCutTile(x, y)) continue;
      if (wallH[y * W + x] !== HIGH) continue;
      if ((x * 7 + y * 3) % 5 !== 0 || !free(x + 0.5, y + 1.5)) continue;
      if (!M.isFloor(x - 1, y + 1) || !M.isFloor(x + 1, y + 1)) continue;
      const k = kitOf(x + 0.5, y + 1.5);
      const zf = y + 1;
      k.rbox(0.7, 0.16, 0.12, 0.03, MAT.metalDark, x + 0.5, 2.06, zf + 0.06);
      k.rbox(0.6, 0.09, 0.06, 0.03, MAT.lamp, x + 0.5, 2.03, zf + 0.12);
      out.lights.push({ x: x + 0.5, y: 2.0, z: zf + 0.5, color: 0xfff1d6, power: 8, dist: 9, kind: 'lamp' });
    }
    /* luz de cada sala (máquinas, telas) */
    const L = (x, y, z, c, p, d) => out.lights.push({ x, y, z, color: new THREE.Color(c).getHex(), power: p * 0.4, dist: d || 10, kind: 'accent' });
    L(6.4, 1.6, 36, '#3d8bff', 40, 12);
    L(16.2, 1.8, 12.5, '#ff8a2a', 26, 10);
    L(16.2, 1.8, 59.5, '#ff8a2a', 26, 10);
    L(42.5, 1.6, 43.6, '#ffd24a', 18, 8);
    L(98.6, 1.8, 61.2, '#7f9bff', 26, 10);
    L(80.5, 1.4, 39.5, '#3ae08a', 18, 8);
    L(43.5, 1.6, 29.5, '#48d6b0', 14, 7);
    L(123.4, 1.5, 36, '#5fd6ff', 22, 10);
    L(27.5, 1.4, 29.2, '#4be38b', 14, 7);
    L(81.5, 1.4, 72.4, '#b07cff', 16, 8);
    L(92.2, 1.8, 27, '#9bff8a', 12, 7);
    L(99.5, 1.6, 9.5, '#ff6a5a', 14, 8);
    L(63, 1.8, 55, '#ffb070', 16, 10);
    L(63, 3.6, 14, '#eaf0ff', 22, 13);
    L(75, 3.6, 14, '#eaf0ff', 22, 13);
  }

  /* ---------- portas ---------- */
  function doors(ctx, root) {
    const { MAT, out } = ctx;
    /* folhas da porta: fechada, ela fica dentro do tile da porta, fora do polígono de visão, e a névoa comum a apagaria
       mesmo vista de frente. Cada porta tem o próprio material, e o jogo escurece a porta que você não enxerga de
       nenhum dos lados (como a névoa faz com o resto) */
    for (const d of M.DOORS) {
      const leafMat = KIT.patch(new THREE.MeshStandardMaterial({ color: '#8994aa', metalness: 0.85, roughness: 0.36 }), { vis: false });
      const hazLeaf = KIT.patch(new THREE.MeshStandardMaterial({ map: MAT.hazard.map, metalness: 0.3, roughness: 0.5 }), { vis: false });
      const edgeMat = KIT.patch(new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffb020', emissiveIntensity: 0.4, metalness: 0, roughness: 0.6 }), { vis: false });
      const [x, y, w, h] = d.rect;
      const horiz = w > h;
      const L = horiz ? w : h;
      const fa = horiz ? wallH[y * W + (x - 1)] : wallH[(y - 1) * W + x];
      const fb = horiz ? wallH[y * W + (x + w)] : wallH[(y + h) * W + x];
      const dh = Math.max(LOW, Math.min(fa || HIGH, fb || HIGH, 2.15));
      const grp = new THREE.Group();
      const cx = x + w / 2, cz = y + h / 2;
      grp.position.set(cx, 0, cz);
      if (!horiz) grp.rotation.y = Math.PI / 2;
      /* trilho no chão, batentes e verga (na parede alta, a parede continua acima da porta) */
      const k = new KIT.Kit();
      k.box(L, 0.02, 0.32, MAT.rubber, 0, 0.01, 0);
      k.box(L, 0.025, 0.06, MAT.hazard, 0, 0.012, 0.2);
      k.box(L, 0.025, 0.06, MAT.hazard, 0, 0.012, -0.2);
      for (const s of [-1, 1]) k.rbox(0.18, dh + 0.1, 0.5, 0.03, MAT.metalLight, s * (L / 2 + 0.05), (dh + 0.1) / 2, 0);
      const top = Math.max(fa || 0, fb || 0);
      if (top > dh + 0.2) k.box(L + 0.3, top - dh, 0.9, MAT.wallTop, 0, dh + (top - dh) / 2, 0);
      k.rbox(L + 0.36, 0.14, 0.5, 0.03, MAT.metalLight, 0, dh + 0.07, 0);
      const frame = k.build();
      grp.add(frame);
      const leaves = [];
      for (const s of [-1, 1]) {
        const lk = new KIT.Kit();
        lk.rbox(L / 2, dh - 0.04, 0.2, 0.03, leafMat, 0, (dh - 0.04) / 2, 0);
        /* faixa de perigo e a borda de encontro */
        lk.box(L / 2 - 0.1, 0.18, 0.21, hazLeaf, 0, dh * 0.55, 0);
        lk.box(0.05, dh - 0.1, 0.22, edgeMat, -s * (L / 4 - 0.03), (dh - 0.04) / 2, 0);
        const leaf = lk.build();
        leaf.position.x = s * (L / 4);
        grp.add(leaf);
        leaves.push({ g: leaf, s });
      }
      /* luz de status: verde aberta, vermelha piscando fechada */
      const lampMat = MAT.glowOwn('#3aff7a', 2.5);
      lampMat.userData.door = true;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), lampMat);
      lamp.position.set(0, dh + 0.16, 0.26);
      grp.add(lamp);
      root.add(grp);
      /* pontos dos dois lados da porta (para saber se você a enxerga) */
      const sides = horiz ? [[cx, y - 0.6], [cx, y + h + 0.6]] : [[x - 0.6, cz], [x + w + 0.6, cz]];
      out.doors.push({ d, grp, leaves, L, lamp, lampMat, mats: [leafMat, hazLeaf, edgeMat], sides, seen: 1 });
    }
  }

  /* ---------- dutos: moldura no chão, buraco escuro e a tampa de grade que abre ---------- */
  function vents(ctx, root) {
    const { MAT, out } = ctx;
    const hole = MAT.paint('#030406', 1);
    const grateMat = MAT.metal('#7c869a', 0.45);
    for (const v of M.VENTS) {
      const k = ctx.kitOf(v.x, v.y);
      k.rbox(1.24, 0.05, 0.84, 0.02, MAT.metalDark, v.x, 0.025, v.y);
      k.box(1.08, 0.02, 0.68, hole, v.x, 0.045, v.y);
      const lid = new THREE.Group();
      lid.position.set(v.x, 0.06, v.y - 0.34);
      const lk = new KIT.Kit();
      lk.rbox(1.08, 0.04, 0.68, 0.015, grateMat, 0, 0, 0.34);
      for (let i = -4; i <= 4; i++) lk.box(0.04, 0.03, 0.6, MAT.metalDark, i * 0.11, 0.02, 0.34);
      lid.add(lk.build());
      root.add(lid);
      out.vents[v.id] = { v, lid, open: 0 };
    }
  }

  /* ---------- câmeras de segurança presas na parede ---------- */
  function cameras(ctx, root) {
    const { MAT, out } = ctx;
    for (const cam of M.CAMS) {
      const q = AU.Decor.camPos(cam);
      const g = new THREE.Group();
      const k = new KIT.Kit();
      k.rbox(0.42, 0.26, 0.08, 0.03, MAT.metalDark, 0, 0, 0.04);
      k.cyl(0.04, 0.04, 0.3, MAT.metalMid, 0, -0.05, 0.2, 10, Math.PI / 2, 0, 0);
      k.rbox(0.62, 0.3, 0.36, 0.08, MAT.white, 0, -0.12, 0.42);
      k.cyl(0.11, 0.13, 0.12, MAT.rubber, 0, -0.16, 0.64, 18, Math.PI / 2, 0, 0);
      k.sphere(0.08, MAT.glass, 0, -0.16, 0.7);
      g.add(k.build());
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 6), MAT.glowOwn('#ff2a2a', 0));
      led.position.set(0.18, -0.02, 0.6);
      g.add(led);
      if (q.dir === 'down') {
        g.position.set(cam.x, 2.15, q.y);
        g.rotation.x = 0.35;
      } else {
        g.position.set(q.x, 2.15, cam.y);
        g.rotation.y = q.dir === 'right' ? Math.PI / 2 : -Math.PI / 2;
        g.rotation.order = 'YXZ';
        g.rotation.x = 0.35;
      }
      root.add(g);
      /* para onde a câmera olha: o meio do corredor à frente dela */
      const look = q.dir === 'down' ? { x: cam.x, z: q.y + 3.2 } : { x: q.x + (q.dir === 'right' ? 3.2 : -3.2), z: cam.y };
      out.cams.push({ cam, g, led, look });
    }
  }

  /* ---------- janelas para o espaço (Armas e Navegação) ---------- */
  function windows(ctx, root) {
    const { MAT, out } = ctx;
    const stars = KIT.starsTex();
    stars.repeat.set(0.18, 0.06);
    const spaceMat = KIT.patch(new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: stars, emissiveIntensity: 1.25, roughness: 0.1, metalness: 0 }), { ao: false });
    out.windowMat = spaceMat;
    /* Armas: janela larga na parede do fundo */
    const wz = 4;
    const k = ctx.RK('weapons');
    k.plane(8, 1.25, spaceMat, 99.2, 1.55, wz + 0.04, 0, 0, 0);
    k.plane(8, 1.25, MAT.glass, 99.2, 1.55, wz + 0.08, 0, 0, 0);
    k.rbox(8.3, 0.14, 0.18, 0.04, MAT.metalLight, 99.2, 2.24, wz + 0.08);
    k.rbox(8.3, 0.14, 0.18, 0.04, MAT.metalLight, 99.2, 0.86, wz + 0.08);
    for (let i = 0; i <= 4; i++) k.rbox(0.12, 1.5, 0.16, 0.03, MAT.metalLight, 95.2 + i * 2, 1.55, wz + 0.08);
    out.windows.push({ kind: 'weapons', x0: 95.2, x1: 103.2, y0: 0.93, y1: 2.18, z: wz + 0.05 });
    /* Navegação: para-brisa na parede da ponta e nos dois cantos em diagonal */
    const kn = ctx.RK('navigation');
    kn.plane(3.4, 1.4, spaceMat, 134 - 0.04, 1.5, 36, 0, -Math.PI / 2, 0);
    kn.plane(3.4, 1.4, MAT.glass, 134 - 0.08, 1.5, 36, 0, -Math.PI / 2, 0);
    for (const c of M.CHAMFERS) {
      if (c.room.id !== 'navigation') continue;
      const mx = (c.x1 + c.x2) / 2, mz = (c.y1 + c.y2) / 2;
      const len = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
      const ang = Math.atan2(c.y2 - c.y1, c.x2 - c.x1);
      const nx = c.sx * Math.SQRT1_2, nz = c.sy * Math.SQRT1_2;
      kn.plane(len * 0.8, 1.4, spaceMat, mx + nx * 0.04, 1.5, mz + nz * 0.04, 0, Math.atan2(c.sx, c.sy), 0);
      void ang;
    }
  }

  /* ---------- canos, placas e grades nas paredes ---------- */
  function wallDecor(ctx) {
    const { MAT, RK } = ctx;
    const pipeRooms = { upperEngine: '#9a7a46', lowerEngine: '#9a7a46', reactor: '#5a7ab0', electrical: '#7d7a58', storage: '#8a6a44' };
    for (const [id, col] of Object.entries(pipeRooms)) {
      const [x, y, w] = M.AREA[id].rect;
      const cut = M.AREA[id].cut || {};
      const x0 = x + (cut.tl || 0) + 0.8, x1 = x + w - (cut.tr || 0) - 0.8;
      const k = RK(id);
      const pm = MAT.metal(col, 0.4);
      k.cyl(0.09, 0.09, x1 - x0, pm, (x0 + x1) / 2, 2.22, y + 0.14, 14, 0, 0, Math.PI / 2);
      k.cyl(0.06, 0.06, x1 - x0, MAT.metalMid, (x0 + x1) / 2, 1.98, y + 0.12, 12, 0, 0, Math.PI / 2);
      for (let t = x0 + 1; t < x1; t += 2.5) k.rbox(0.16, 0.42, 0.2, 0.03, MAT.metalDark, t, 2.1, y + 0.1);
    }
    const sign = (aid, x, z, bg, draw) => {
      const k = RK(aid);
      k.rbox(0.84, 0.5, 0.05, 0.05, MAT.paint(bg, 0.4), x, 1.75, z + 0.03);
      draw(k, x, 1.75, z + 0.06);
    };
    sign('medbay', 49.3, 20, '#e8eef6', (k, x, y, z) => {
      const red = MAT.glow('#ff3b3b', 0.6);
      k.box(0.1, 0.32, 0.02, red, x, y, z);
      k.box(0.32, 0.1, 0.02, red, x, y, z);
    });
    sign('electrical', 44.3, 38, '#f0c93a', (k, x, y, z) => {
      k.add(new THREE.BoxGeometry(0.07, 0.3, 0.02), MAT.rubber, x, y, z, 0, 0, 0.35);
    });
    sign('reactor', 9.8, 26, '#f0c93a', (k, x, y, z) => {
      k.torus(0.13, 0.025, MAT.rubber, x, y, z);
      k.cyl(0.04, 0.04, 0.02, MAT.rubber, x, y, z, 10, Math.PI / 2, 0, 0);
    });
    sign('storage', 59.7, 44, '#ee8f3a', (k, x, y, z) => {
      k.box(0.5, 0.12, 0.02, MAT.rubber, x, y, z);
    });
  }

  /* ---------- chão: faixas de perigo nas portas, grade do O2 e marcas ---------- */
  function floorDecor(ctx) {
    const { MAT, RK } = ctx;
    /* scanner da MedBay: plataforma redonda com anel aceso e o arco do leitor */
    {
      const st = M.STATIONS.scan, km = RK('medbay');
      km.cyl(0.75, 0.82, 0.12, MAT.metalLight, st.x, 0.06, st.y, 40);
      km.cyl(0.62, 0.62, 0.02, MAT.glow('#3affb0', 0.9), st.x, 0.125, st.y, 40);
      km.torus(0.7, 0.04, MAT.chrome, st.x, 0.13, st.y, Math.PI / 2, 0, 0);
      km.torus(0.72, 0.06, MAT.metalMid, st.x, 0.12, st.y, 0, 0, 0, Math.PI);
      km.rbox(0.5, 0.9, 0.3, 0.05, MAT.white, st.x, 0.45, st.y - 0.95);
      km.box(0.36, 0.22, 0.02, MAT.screen('graph', 1.2), st.x, 0.7, st.y - 0.79);
    }
    /* tapete de borracha embaixo da mesa do botão */
    const k = RK('cafeteria');
    k.cyl(3.0, 3.0, 0.02, MAT.fabric('#2c3a58'), 69, 0.012, 14, 48);
    k.torus(3.0, 0.03, MAT.metalLight, 69, 0.02, 14, Math.PI / 2, 0, 0);
  }

  /* =================================================================================================== */
  /* móveis: uma função por tipo. pr.rect = [x, z, w, d] ou pr.circle = [cx, cz, r] */
  const RC = (pr) => {
    if (pr.rect) {
      const [x, z, w, d] = pr.rect;
      return { x, z, w, d, cx: x + w / 2, cz: z + d / 2 };
    }
    const [cx, cz, r] = pr.circle;
    return { x: cx - r, z: cz - r, w: r * 2, d: r * 2, cx, cz, r };
  };
  const PROP = {};

  PROP.engine = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr);
    const R = Math.min(b.d / 2 - 0.2, 1.35), yc = R + 0.25;
    const body = MAT.metal('#c3cad6', 0.3), band = MAT.paint('#e07b2a', 0.4);
    /* apoios */
    for (const fx of [0.2, 0.5, 0.8]) k.rbox(0.5, yc, b.d * 0.7, 0.05, MAT.metalDark, b.x + b.w * fx, yc / 2, b.cz);
    /* corpo da turbina deitado no eixo x, com anéis */
    k.cyl(R, R, b.w * 0.72, body, b.cx + b.w * 0.06, yc, b.cz, 40, 0, 0, Math.PI / 2);
    for (const fx of [-0.28, -0.1, 0.1, 0.28]) k.cyl(R + 0.06, R + 0.06, 0.16, MAT.metalMid, b.cx + b.w * fx, yc, b.cz, 40, 0, 0, Math.PI / 2);
    k.cyl(R + 0.03, R + 0.03, 0.4, band, b.cx + b.w * 0.36, yc, b.cz, 40, 0, 0, Math.PI / 2);
    /* boca de entrada (lado direito) com o anel aceso */
    k.cyl(R * 1.08, R, 0.5, MAT.metalLight, b.x + b.w - 0.25, yc, b.cz, 40, 0, 0, Math.PI / 2);
    k.torus(R * 0.98, 0.07, MAT.glow('#ff8a2a', 3), b.x + b.w + 0.01, yc, b.cz, 0, Math.PI / 2, 0);
    /* escape (lado esquerdo) indo para o bocal */
    k.cyl(R * 0.7, R * 0.95, 1.2, MAT.metalMid, b.x + 0.4, yc, b.cz, 32, 0, 0, Math.PI / 2);
    /* cano de combustível */
    k.pipe([[b.cx, yc + R * 0.7, b.cz + R * 0.6], [b.cx + 1.5, yc + R * 1.05, b.cz + R * 0.2], [b.x + b.w * 0.9, yc + R * 0.6, b.cz - R * 0.4]], 0.07, MAT.copper);
    /* hélice girando na boca */
    const fan = new THREE.Group();
    fan.position.set(b.x + b.w + 0.03, yc, b.cz);
    const fk = new KIT.Kit();
    fk.cyl(0.25, 0.25, 0.2, MAT.metalDark, 0, 0, 0, 20, 0, 0, Math.PI / 2);
    for (let i = 0; i < 9; i++) fk.add(new THREE.BoxGeometry(0.05, R * 0.82, 0.22), MAT.metalLight, 0, Math.cos((i / 9) * Math.PI * 2) * R * 0.45, Math.sin((i / 9) * Math.PI * 2) * R * 0.45, (i / 9) * Math.PI * 2, 0, 0.3);
    fan.add(fk.build());
    out.dyn.push({ obj: fan, spin: { axis: 'x', speed: 9 } });
    out.extra = out.extra || [];
    out.extra.push(fan);
  };
  PROP.nozzle = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const yc = Math.min(1.5, b.d / 2 + 0.2);
    k.cyl(b.d * 0.42, b.d * 0.3, b.w, MAT.metal('#8a93a6', 0.4), b.cx, yc, b.cz, 32, 0, 0, Math.PI / 2);
    k.torus(b.d * 0.42, 0.05, MAT.metalDark, b.x + 0.05, yc, b.cz, 0, Math.PI / 2, 0);
    k.cyl(b.d * 0.36, b.d * 0.36, 0.05, MAT.glow('#ff6a1a', 1.2), b.x + 0.02, yc, b.cz, 32, 0, 0, Math.PI / 2);
  };
  PROP.fuelPort = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.9, b.d, 0.06, MAT.paint('#3c4458'), b.cx, 0.45, b.cz);
    k.cyl(0.16, 0.16, 0.2, MAT.paint('#e6b23a'), b.cx, 0.95, b.cz, 18);
    k.box(b.w * 0.6, 0.15, 0.05, MAT.glow('#ffb347', 1.5), b.cx, 0.6, b.cz + (pr.p && pr.p.down ? b.d / 2 + 0.01 : -b.d / 2 - 0.01));
  };
  PROP.barrels = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const cols = ['#c8572e', '#3b6fb8', '#d7a52c'];
    let i = 0;
    for (const fx of [0.27, 0.73]) for (const fz of [0.3, 0.72]) {
      if (i > 2) break;
      const m = MAT.paint(cols[i++ % 3], 0.45);
      const x = b.x + b.w * fx, z = b.z + b.d * fz;
      k.cyl(0.42, 0.42, 1.0, m, x, 0.5, z, 24);
      for (const y of [0.15, 0.85]) k.torus(0.42, 0.025, MAT.metalDark, x, y, z, Math.PI / 2, 0, 0);
      k.cyl(0.08, 0.08, 0.04, MAT.metalLight, x + 0.18, 1.02, z, 10);
    }
  };
  PROP.reactorCore = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr), r = b.r;
    k.cyl(r, r * 1.08, 0.5, MAT.metalDark, b.cx, 0.25, b.cz, 48);
    k.cyl(r * 0.92, r * 0.92, 0.12, MAT.metalLight, b.cx, 0.56, b.cz, 48);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.rbox(0.36, 2.4, 0.36, 0.06, MAT.metal('#7c879c', 0.35), b.cx + Math.cos(a) * r * 0.82, 1.6, b.cz + Math.sin(a) * r * 0.82, -a);
    }
    /* tampa vazada: o núcleo aceso aparece de cima */
    k.torus(r * 0.78, 0.12, MAT.metalLight, b.cx, 2.86, b.cz, Math.PI / 2, 0, 0);
    for (let i = 0; i < 4; i++) k.box(r * 1.5, 0.08, 0.12, MAT.metalMid, b.cx, 2.86, b.cz, (i / 4) * Math.PI);
    /* núcleo de energia (vidro com luz azul pulsando) */
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 2.2, 40), KIT.patch(new THREE.MeshStandardMaterial({ color: '#0a1a33', emissive: '#3d8bff', emissiveIntensity: 2.4, roughness: 0.2, transparent: true, opacity: 0.88 }), { ao: false }));
    core.position.set(b.cx, 1.65, b.cz);
    out.extra = out.extra || [];
    out.extra.push(core);
    out.dyn.push({ obj: core, pulse: { mat: core.material, base: 2.4, amp: 1.2, speed: 2.2 } });
    for (const y of [0.9, 1.65, 2.4]) k.torus(r * 0.5, 0.06, MAT.chrome, b.cx, y, b.cz, Math.PI / 2, 0, 0);
  };
  PROP.coolant = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.cyl(b.r, b.r, 1.7, MAT.metal('#9fb0c8', 0.3), b.cx, 0.85, b.cz, 28);
    k.sphere(b.r, MAT.metal('#9fb0c8', 0.3), b.cx, 1.7, b.cz, 1, 0.5, 1);
    k.cyl(b.r * 0.4, b.r * 0.4, 1.2, MAT.glow('#5fb8ff', 1.4), b.cx, 0.95, b.cz + b.r * 0.7, 16);
  };
  PROP.monitorDesk = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.08, b.d, 0.03, MAT.metalLight, b.cx, 0.78, b.cz);
    k.rbox(b.w, 0.74, b.d * 0.5, 0.03, MAT.metalDark, b.cx, 0.37, b.z + b.d * 0.25);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x = b.x + b.w * ((i + 0.5) / n);
      k.rbox(b.w / n - 0.12, 0.62, 0.08, 0.03, MAT.rubber, x, 1.24, b.z + 0.12);
      k.plane(b.w / n - 0.22, 0.52, MAT.screen(i % 2 ? 'graph' : 'term', 1.2), x, 1.24, b.z + 0.165, -0.08, 0, 0);
    }
    k.rbox(0.9, 0.04, 0.32, 0.02, MAT.rubber, b.cx, 0.83, b.cz + 0.05);
  };
  PROP.officeChair = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const seat = MAT.fabric('#2f3546');
    k.cyl(0.04, 0.04, 0.4, MAT.chrome, b.cx, 0.22, b.cz, 10);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      k.box(0.36, 0.04, 0.05, MAT.chrome, b.cx + Math.cos(a) * 0.16, 0.04, b.cz + Math.sin(a) * 0.16, -a);
    }
    k.rbox(0.62, 0.12, 0.6, 0.05, seat, b.cx, 0.48, b.cz);
    k.rbox(0.58, 0.6, 0.1, 0.05, seat, b.cx, 0.82, b.cz + 0.28);
  };
  PROP.serverRack = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const tall = 2.1;
    k.rbox(b.w, tall, b.d, 0.04, MAT.metal('#2c3240', 0.4), b.cx, tall / 2, b.cz);
    const along = b.d > b.w;
    const n = Math.max(3, Math.floor((along ? b.d : b.w) / 0.5));
    const face = along ? (b.cx < 60 ? -1 : 1) : 1;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      for (let j = 0; j < 6; j++) {
        const col = (i * 7 + j * 3) % 5 === 0 ? '#ff5a5a' : (i + j) % 3 ? '#5dff9a' : '#5fc8ff';
        const gm = MAT.glow(col, 1.6);
        if (along) k.box(0.02, 0.04, 0.12, gm, b.cx + face * (b.w / 2 + 0.005), 0.4 + j * 0.27, b.z + b.d * t);
        else k.box(0.12, 0.04, 0.02, gm, b.x + b.w * t, 0.4 + j * 0.27, b.z + b.d + 0.005);
      }
    }
  };
  PROP.lockers = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const z = b.z + b.d * ((i + 0.5) / n);
      k.rbox(b.w, 2.0, b.d / n - 0.04, 0.03, MAT.paint('#5c6a86', 0.45), b.cx, 1.0, z);
      k.box(0.02, 0.3, 0.05, MAT.chrome, b.x + b.w + 0.01, 1.1, z);
    }
  };
  PROP.cooler = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(0.62, 1.0, 0.62, 0.06, MAT.white, b.cx, 0.5, b.cz);
    k.cyl(0.22, 0.22, 0.5, MAT.glass, b.cx, 1.25, b.cz, 18);
    k.sphere(0.22, MAT.glass, b.cx, 1.5, b.cz, 1, 0.6, 1);
  };
  PROP.bed = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.12, b.d, 0.04, MAT.metalLight, b.cx, 0.5, b.cz);
    for (const fx of [0.08, 0.92]) for (const fz of [0.12, 0.88]) k.cyl(0.05, 0.05, 0.46, MAT.chrome, b.x + b.w * fx, 0.23, b.z + b.d * fz, 10);
    k.rbox(b.w * 0.96, 0.16, b.d * 0.9, 0.07, MAT.fabric('#dfe8f0'), b.cx, 0.63, b.cz);
    k.rbox(0.6, 0.14, b.d * 0.7, 0.07, MAT.white, b.x + 0.4, 0.75, b.cz);
    k.rbox(b.w * 0.55, 0.06, b.d * 0.92, 0.03, MAT.fabric('#5fb7c2'), b.x + b.w * 0.66, 0.73, b.cz);
    k.rbox(0.08, 0.5, b.d * 0.9, 0.03, MAT.metalLight, b.x + 0.04, 0.8, b.cz);
  };
  PROP.analyzer = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.95, b.d, 0.06, MAT.white, b.cx, 0.48, b.cz);
    k.plane(b.w * 0.7, 0.5, MAT.screen('graph', 1.3), b.cx, 1.0, b.z + b.d + 0.01, -0.6, 0, 0);
    for (let i = 0; i < 5; i++) {
      const x = b.x + 0.4 + i * ((b.w - 0.8) / 4);
      k.cyl(0.07, 0.07, 0.3, MAT.glass, x, 1.1, b.cz - 0.15, 12);
      k.cyl(0.06, 0.06, 0.16, MAT.glow(['#ff5a5a', '#5fc8ff', '#5dff9a', '#ffd24a', '#c08bff'][i], 1.1), x, 1.03, b.cz - 0.15, 12);
    }
  };
  PROP.cabinet = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.9, b.d, 0.04, MAT.white, b.cx, 0.95, b.cz);
    k.box(0.02, 1.6, b.d * 0.85, MAT.glass, b.x - 0.01, 1.05, b.cz);
    for (const y of [0.6, 1.1, 1.6]) k.box(b.w * 0.8, 0.03, b.d * 0.85, MAT.metalLight, b.cx, y, b.cz);
    k.box(0.04, 0.24, 0.24, MAT.glow('#ff4a4a', 0.8), b.x - 0.02, 1.75, b.cz);
  };
  PROP.plant = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.lathe([[0, 0], [b.r * 0.85, 0], [b.r, 0.5], [b.r * 0.9, 0.52], [0, 0.5]], MAT.paint('#d9dee6', 0.4), b.cx, 0, b.cz);
    k.cyl(b.r * 0.85, b.r * 0.85, 0.02, MAT.soil, b.cx, 0.5, b.cz, 18);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, h = 0.5 + (i % 3) * 0.12;
      k.sphere(0.2, MAT.leaf, b.cx + Math.cos(a) * 0.14, 0.55 + h * 0.5, b.cz + Math.sin(a) * 0.14, 0.6, 1.4, 0.4, 10);
    }
  };
  PROP.buttonTable = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr), r = b.r;
    k.cyl(r, r, 0.1, MAT.metalLight, b.cx, 0.82, b.cz, 56);
    k.torus(r, 0.05, MAT.chrome, b.cx, 0.87, b.cz, Math.PI / 2, 0, 0);
    k.cyl(0.5, 0.7, 0.8, MAT.metalDark, b.cx, 0.4, b.cz, 24);
    /* botão de emergência: base, cúpula de vidro e o botão vermelho */
    k.cyl(0.5, 0.55, 0.12, MAT.metalDark, b.cx, 0.93, b.cz, 32);
    k.cyl(0.32, 0.36, 0.14, MAT.glow('#ff1f2e', 0.9), b.cx, 1.05, b.cz, 32);
    k.sphere(0.45, MAT.glass, b.cx, 0.99, b.cz, 1, 0.75, 1, 28);
    /* bancos em volta */
    stools(k, ctx, b.cx, b.cz, r + 0.65, 8, 0.2);
    out.button = { x: b.cx, z: b.cz };
  };
  function stools(k, ctx, x, z, R, n, off) {
    const { MAT } = ctx;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off;
      const sx = x + Math.cos(a) * R, sz = z + Math.sin(a) * R;
      k.cyl(0.04, 0.05, 0.42, MAT.chrome, sx, 0.21, sz, 10);
      k.cyl(0.26, 0.26, 0.08, MAT.fabric('#3a4a6c'), sx, 0.46, sz, 18);
    }
  }
  PROP.roundTable = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr), r = b.r;
    k.cyl(r, r, 0.08, MAT.white, b.cx, 0.76, b.cz, 48);
    k.torus(r, 0.04, MAT.metalLight, b.cx, 0.76, b.cz, Math.PI / 2, 0, 0);
    k.cyl(0.1, 0.12, 0.72, MAT.chrome, b.cx, 0.36, b.cz, 14);
    k.cyl(0.45, 0.5, 0.04, MAT.metalDark, b.cx, 0.02, b.cz, 24);
    stools(k, ctx, b.cx, b.cz, r + 0.55, 6, 0.5);
  };
  PROP.vending = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const c = (pr.p && pr.p.c) || '#3d6fb3';
    k.rbox(b.w, 2.0, b.d, 0.06, MAT.plastic(c), b.cx, 1.0, b.cz);
    k.plane(b.w * 0.62, 1.3, MAT.glass, b.cx - b.w * 0.12, 1.2, b.z + b.d + 0.01, 0, 0, 0);
    k.plane(b.w * 0.6, 1.26, MAT.glow('#fff4d6', 0.45), b.cx - b.w * 0.12, 1.2, b.z + b.d - 0.02, 0, 0, 0);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) k.box(0.18, 0.2, 0.1, MAT.paint(['#e04848', '#f2c94c', '#4ab3f2', '#5bd16f'][(i + j) % 4], 0.5), b.cx - b.w * 0.36 + i * 0.27, 0.72 + j * 0.3, b.z + b.d - 0.12);
    k.rbox(0.22, 0.6, 0.04, 0.02, MAT.metalDark, b.x + b.w - 0.25, 1.3, b.z + b.d + 0.01);
    k.box(b.w * 0.55, 0.18, 0.05, MAT.rubber, b.cx - b.w * 0.12, 0.3, b.z + b.d + 0.01);
  };
  PROP.bin = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.cyl(b.r, b.r * 0.85, 0.7, MAT.metal('#7b8496', 0.4), b.cx, 0.35, b.cz, 20);
    k.cyl(b.r * 1.02, b.r * 1.02, 0.05, MAT.metalDark, b.cx, 0.71, b.cz, 20);
  };
  PROP.gunConsole = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.95, b.d, 0.06, MAT.metalDark, b.cx, 0.48, b.cz);
    k.plane(b.w * 0.8, 0.6, MAT.screen('alert', 1.3), b.cx, 1.05, b.z + b.d * 0.62, -0.75, 0, 0);
    for (const s of [-1, 1]) k.cyl(0.06, 0.06, 0.35, MAT.rubber, b.cx + s * 0.6, 1.08, b.z + b.d - 0.1, 10);
  };
  PROP.gunChair = (k, pr, ctx) => PROP.officeChair(k, pr, ctx);
  PROP.ammo = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    for (let i = 0; i < 2; i++) {
      const z = b.z + b.d * (0.27 + i * 0.46);
      k.rbox(b.w, 0.55, b.d * 0.44, 0.04, MAT.paint('#5d6b3a', 0.6), b.cx, 0.28, z);
      k.box(b.w * 0.8, 0.04, 0.02, MAT.paint('#f2c94c'), b.cx, 0.4, z + b.d * 0.22 + 0.005);
    }
    k.rbox(b.w * 0.9, 0.5, b.d * 0.44, 0.04, MAT.paint('#55623a', 0.6), b.cx, 0.82, b.z + b.d * 0.5);
  };
  PROP.missiles = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.2, b.d, 0.04, MAT.metalDark, b.cx, 0.1, b.cz);
    for (let i = 0; i < 3; i++) {
      const z = b.z + b.d * ((i + 0.5) / 3);
      k.cyl(0.2, 0.2, 1.4, MAT.white, b.cx, 0.95, z, 18);
      k.cyl(0, 0.2, 0.35, MAT.paint('#e04848'), b.cx, 1.82, z, 18);
      k.box(0.5, 0.25, 0.04, MAT.paint('#e04848'), b.cx, 0.35, z);
    }
  };
  PROP.planters = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.55, b.d, 0.06, MAT.paint('#6d7a6e', 0.6), b.cx, 0.28, b.cz);
    k.box(b.w - 0.16, 0.02, b.d - 0.16, MAT.soil, b.cx, 0.56, b.cz);
    for (let i = 0; i < 16; i++) {
      const x = b.x + 0.3 + (i / 15) * (b.w - 0.6), z = b.cz + ((i * 37) % 7) / 14 - 0.25;
      k.sphere(0.18 + (i % 3) * 0.05, MAT.leaf, x, 0.72 + (i % 2) * 0.08, z, 1, 1.3, 1, 10);
    }
  };
  PROP.o2Tank = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    const r = Math.min(b.w, b.d) / 2 - 0.02;
    k.cyl(r, r, 1.6, MAT.paint('#3a8f62', 0.35), b.cx, 0.8, b.cz, 22);
    k.sphere(r, MAT.paint('#3a8f62', 0.35), b.cx, 1.6, b.cz, 1, 0.6, 1);
    k.cyl(0.06, 0.06, 0.25, MAT.chrome, b.cx, 1.9, b.cz, 10);
    k.box(r * 1.6, 0.3, 0.02, MAT.white, b.cx, 1.0, b.cz + r);
  };
  PROP.tree = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.cyl(b.r, b.r * 1.05, 0.55, MAT.paint('#8a929e', 0.5), b.cx, 0.28, b.cz, 28);
    k.cyl(0.1, 0.16, 1.5, MAT.wood, b.cx, 1.2, b.cz, 10);
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4, rr = 0.2 + (i % 4) * 0.12;
      k.sphere(0.48 - (i % 3) * 0.08, MAT.leaf, b.cx + Math.cos(a) * rr, 1.8 + (i % 3) * 0.22, b.cz + Math.sin(a) * rr, 1, 0.8, 1, 12);
    }
  };
  PROP.chartConsole = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.0, b.d, 0.06, MAT.metalDark, b.cx, 0.5, b.cz);
    k.plane(b.d * 0.85, 0.7, MAT.screen('map', 1.3), b.x - 0.01, 1.15, b.cz, 0, -Math.PI / 2, 0);
  };
  PROP.steerPedestal = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.cyl(0.3, 0.42, 0.9, MAT.metalDark, b.cx, 0.45, b.cz, 18);
    k.torus(0.32, 0.05, MAT.chrome, b.cx, 1.05, b.cz, -0.6, 0, 0);
    k.cyl(0.25, 0.25, 0.04, MAT.screen('graph', 1.1), b.cx, 0.93, b.cz, 18);
  };
  PROP.starTable = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr);
    k.cyl(b.r, b.r * 1.05, 0.8, MAT.metalDark, b.cx, 0.4, b.cz, 40);
    k.cyl(b.r * 0.92, b.r * 0.92, 0.03, MAT.glow('#123a5a', 1), b.cx, 0.81, b.cz, 40);
    /* holograma da rota acima da mesa */
    const holo = new THREE.Mesh(new THREE.SphereGeometry(b.r * 0.55, 16, 10), KIT.patch(new THREE.MeshBasicMaterial({ color: '#5fd6ff', wireframe: true, transparent: true, opacity: 0.35, depthWrite: false }), { ao: false }));
    holo.position.set(b.cx, 1.35, b.cz);
    out.extra = out.extra || [];
    out.extra.push(holo);
    out.dyn.push({ obj: holo, spin: { axis: 'y', speed: 0.6 } });
  };
  PROP.pilotChair = (k, pr, ctx) => PROP.officeChair(k, pr, ctx);
  PROP.navPanel = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(0.7, 0.9, 0.5, 0.05, MAT.metalDark, b.cx, 0.45, b.cz, pr.p && pr.p.diag === 'tr' ? Math.PI / 4 : -Math.PI / 4);
    k.box(0.5, 0.04, 0.36, MAT.screen('graph', 1), b.cx, 0.92, b.cz, pr.p && pr.p.diag === 'tr' ? Math.PI / 4 : -Math.PI / 4);
  };
  PROP.shieldGen = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr), r = b.r;
    k.cyl(r, r, 0.3, MAT.metalDark, b.cx, 0.15, b.cz, 6);
    k.cyl(r * 0.8, r * 0.9, 1.0, MAT.metal('#7987a8', 0.3), b.cx, 0.8, b.cz, 6);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(r * 0.45, 0), KIT.patch(new THREE.MeshStandardMaterial({ color: '#0b1430', emissive: '#4f6bff', emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.3 }), { ao: false }));
    gem.position.set(b.cx, 1.9, b.cz);
    out.extra = out.extra || [];
    out.extra.push(gem);
    out.dyn.push({ obj: gem, spin: { axis: 'y', speed: 0.9 }, bob: { amp: 0.08, speed: 1.6, base: 1.9 } });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      k.rbox(0.18, 1.6, 0.18, 0.04, MAT.chrome, b.cx + Math.cos(a) * r * 0.85, 1.1, b.cz + Math.sin(a) * r * 0.85, -a);
    }
  };
  PROP.shieldConsole = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.0, b.d, 0.05, MAT.metalDark, b.cx, 0.5, b.cz);
    k.box(b.w * 0.8, 0.03, b.d * 0.7, MAT.screen('graph', 1.1), b.cx, 1.01, b.cz);
  };
  PROP.capacitor = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.cyl(b.r * 0.8, b.r * 0.85, 1.4, MAT.metal('#5d6888', 0.35), b.cx, 0.7, b.cz, 20);
    for (const y of [0.3, 0.7, 1.1]) k.torus(b.r * 0.82, 0.04, MAT.glow('#8fa6ff', 1.5), b.cx, y, b.cz, Math.PI / 2, 0, 0);
  };
  PROP.commsDesk = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.08, b.d, 0.03, MAT.metalLight, b.cx, 0.78, b.cz);
    k.rbox(b.w, 0.74, b.d * 0.4, 0.03, MAT.metalDark, b.cx, 0.37, b.z + b.d * 0.8);
    for (let i = 0; i < 5; i++) {
      const x = b.x + b.w * ((i + 0.5) / 5);
      k.rbox(b.w / 5 - 0.12, 0.55, 0.08, 0.03, MAT.rubber, x, 1.18, b.z + b.d - 0.16);
      k.plane(b.w / 5 - 0.22, 0.45, MAT.screen(i % 2 ? 'purple' : 'graph', 1.2), x, 1.18, b.z + b.d - 0.21, -0.3, Math.PI, 0);
    }
  };
  PROP.dish = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr);
    k.cyl(0.3, 0.45, 0.5, MAT.metalDark, b.cx, 0.25, b.cz, 18);
    const d = new THREE.Group();
    d.position.set(b.cx, 1.0, b.cz);
    const dk = new KIT.Kit();
    dk.cyl(0.08, 0.08, 0.6, MAT.metalMid, 0, -0.2, 0, 10);
    dk.lathe([[0, 0], [0.4, 0.04], [0.8, 0.14], [b.r * 0.95, 0.3], [b.r * 0.92, 0.32], [0, 0.06]], MAT.white, 0, 0.05, 0, 40);
    dk.cyl(0.03, 0.03, 0.6, MAT.metalMid, 0, 0.35, 0, 8);
    dk.sphere(0.07, MAT.glow('#ff5a5a', 2), 0, 0.68, 0);
    const dm = dk.build();
    dm.rotation.x = -0.5;
    d.add(dm);
    out.extra = out.extra || [];
    out.extra.push(d);
    out.dyn.push({ obj: d, spin: { axis: 'y', speed: 0.25 } });
  };
  PROP.tapes = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.4, b.d, 0.04, MAT.metalDark, b.cx, 0.7, b.cz);
    for (let i = 0; i < 3; i++) for (const y of [0.5, 1.05]) k.cyl(0.18, 0.18, 0.04, MAT.rubber, b.x + 0.45 + i * 0.85, y, b.z + b.d + 0.02, 20, Math.PI / 2, 0, 0);
  };
  function crate(k, ctx, x, z, w, d, h, tint, y0) {
    const { MAT } = ctx;
    const m = MAT.crate;
    void tint;
    const b = y0 || 0;
    k.rbox(w, h, d, 0.04, m, x, b + h / 2, z);
    k.box(w + 0.02, 0.08, d + 0.02, MAT.metalDark, x, b + h * 0.15, z);
    k.box(w + 0.02, 0.08, d + 0.02, MAT.metalDark, x, b + h * 0.85, z);
  }
  PROP.crates = (k, pr, ctx) => {
    const b = RC(pr);
    const n = (pr.p && pr.p.n) || 1;
    const tints = ['#b58a4a', '#8d6b3a', '#a77b44', '#c19554'];
    if (n === 1) return crate(k, ctx, b.cx, b.cz, b.w * 0.95, b.d * 0.95, 1.1, tints[0]);
    const cols = n >= 3 ? 2 : n, rows = Math.ceil(n / cols);
    let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (i >= n) break;
      const w = b.w / cols, d = b.d / rows;
      const h = 0.9 + ((i * 37) % 5) * 0.12;
      crate(k, ctx, b.x + w * (c + 0.5), b.z + d * (r + 0.5), w * 0.94, d * 0.94, h, tints[i % 4]);
      /* uma caixa menor empilhada em cima da primeira */
      if (i === 0 && n >= 3) crate(k, ctx, b.x + w * 0.5, b.z + d * 0.5, w * 0.62, d * 0.62, 0.62, tints[3], h);
      i++;
    }
  };
  PROP.drums = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    for (const [fx, fz, c] of [[0.27, 0.3, '#3b6fb8'], [0.73, 0.3, '#3b6fb8'], [0.5, 0.74, '#c8572e']]) {
      const x = b.x + b.w * fx, z = b.z + b.d * fz;
      k.cyl(0.42, 0.42, 1.0, MAT.paint(c, 0.45), x, 0.5, z, 24);
      for (const y of [0.18, 0.82]) k.torus(0.42, 0.025, MAT.metalDark, x, y, z, Math.PI / 2, 0, 0);
    }
  };
  PROP.compactor = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.5, b.d, 0.05, MAT.metal('#596274', 0.4), b.cx, 0.75, b.cz);
    k.box(b.w * 0.8, 0.12, 0.02, MAT.hazard, b.cx, 1.35, b.z - 0.01);
    k.box(b.w * 0.6, 0.6, 0.03, MAT.metalDark, b.cx, 0.7, b.z - 0.01);
    out.compactor = { x: b.cx, z: b.cz };
  };
  PROP.fuelRack = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.1, b.d, 0.02, MAT.metalDark, b.cx, 0.05, b.cz);
    for (let i = 0; i < 3; i++) {
      const z = b.z + b.d * ((i + 0.5) / 3);
      k.rbox(b.w * 0.8, 0.8, b.d / 3 - 0.12, 0.08, MAT.paint('#d63a3a', 0.4), b.cx, 0.5, z);
      k.cyl(0.06, 0.06, 0.14, MAT.metalDark, b.cx, 0.97, z, 10);
    }
  };
  PROP.adminTable = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 0.85, b.d, 0.08, MAT.metalDark, b.cx, 0.43, b.cz);
    k.rbox(b.w - 0.2, 0.04, b.d - 0.2, 0.02, MAT.glow('#0c3a28', 1), b.cx, 0.87, b.cz);
    /* mapa holográfico da nave flutuando */
    const small = KIT.canvas(512, 288);
    small.getContext('2d').drawImage(AU.Render.staticMap(), 0, 0, 512, 288);
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.8, b.d * 0.7), KIT.patch(new THREE.MeshBasicMaterial({ color: '#3ae08a', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, map: KIT.tex(small, true) }), { ao: false }));
    holo.rotation.x = -Math.PI / 2;
    holo.position.set(b.cx, 1.15, b.cz);
    out.extra = out.extra || [];
    out.extra.push(holo);
    out.dyn.push({ obj: holo, bob: { amp: 0.04, speed: 1.2, base: 1.15 } });
  };
  PROP.filing = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.3, b.d, 0.04, MAT.paint('#7a869e', 0.45), b.cx, 0.65, b.cz);
    for (let i = 0; i < 4; i++) k.box(0.02, 0.24, b.d * 0.8, MAT.metalDark, b.x - 0.01, 0.25 + i * 0.3, b.cz);
  };
  PROP.transformer = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.6, b.d, 0.08, MAT.metal('#5b5f52', 0.45), b.cx, 0.8, b.cz);
    for (let i = 0; i < 6; i++) k.box(b.w + 0.04, 0.06, 0.08, MAT.metalDark, b.cx, 0.25 + i * 0.24, b.z - 0.02);
    for (const fx of [0.25, 0.5, 0.75]) {
      const x = b.x + b.w * fx;
      k.cyl(0.14, 0.14, 0.5, MAT.white, x, 1.85, b.cz, 14);
      for (let j = 0; j < 4; j++) k.cyl(0.2, 0.2, 0.04, MAT.white, x, 1.7 + j * 0.1, b.cz, 14);
    }
    k.box(0.6, 0.6, 0.02, MAT.hazard, b.cx, 1.0, b.z + b.d + 0.01);
  };
  PROP.batteries = (k, pr, ctx) => {
    const { MAT } = ctx;
    const b = RC(pr);
    k.rbox(b.w, 1.2, b.d, 0.04, MAT.metalDark, b.cx, 0.6, b.cz);
    for (let i = 0; i < 4; i++) k.box(0.02, 0.2, b.d * 0.7, MAT.glow(i < 3 ? '#5dff9a' : '#ffd24a', 1.3), b.x + b.w + 0.01, 0.3 + i * 0.24, b.cz);
  };

  /* ---------- consoles das tarefas e sabotagens, presos na parede ---------- */
  const SCREEN_OF = { download: 'term', upload: 'term', align: 'graph', simon: 'graph', manifolds: 'term', keypad: 'alert', handScanner: 'graph', radio: 'purple', swipe: 'term', divert: 'warm', calibrate: 'graph', terminal: 'term', accept: 'warm', lightsPanel: 'warm', wires: 'term' };
  PROP.station = (k, pr, ctx) => {
    const { MAT, out } = ctx;
    const art = M.STATION_ART[pr.station];
    if (!art) return;
    const face = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] }[art.side];
    const ry = Math.atan2(face[0], face[1]);
    /* referência: ponto da parede onde o console encosta */
    const wx = art.side === 'left' || art.side === 'right' ? art.edge : art.x;
    const wz = art.side === 'top' || art.side === 'bottom' ? art.edge : art.y;
    const wallTall = art.side !== 'bottom';
    const P = (lx, ly, lz) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      return [wx + lx * c + lz * s, ly, wz - lx * s + lz * c];
    };
    const box = (w, h, d, mat, lx, ly, lz, r) => {
      const [x, y, z] = P(lx, ly, lz);
      if (r) k.rbox(w, h, d, r, mat, x, y, z, ry);
      else k.box(w, h, d, mat, x, y, z, ry);
    };
    const kind = art.kind;
    const W_ = art.wide, D = Math.max(0.22, art.depth);
    if (kind === 'filter') {
      const [x, , z] = P(0, 0, 0.6);
      k.rbox(1.1, 0.04, 0.8, 0.02, MAT.metalDark, x, 0.02, z, ry);
      k.box(0.9, 0.02, 0.6, MAT.glow('#3f5a40', 0.4), x, 0.04, z, ry);
      out.stations[pr.station] = { x, y: 0.1, z };
      return;
    }
    if (kind === 'chute') {
      box(1.1, 1.6, D + 0.1, MAT.metal('#5e6879', 0.4), 0, 0.8, (D + 0.1) / 2, 0.05);
      box(0.8, 0.6, 0.04, MAT.metalDark, 0, 1.05, D + 0.12, 0.02);
      box(0.5, 0.06, 0.06, MAT.chrome, 0, 0.62, D + 0.15);
      box(0.9, 0.1, 0.03, MAT.hazard, 0, 1.45, D + 0.12);
      const [x, y, z] = P(0, 1.0, D + 0.2);
      out.stations[pr.station] = { x, y, z };
      return;
    }
    const scr = MAT.screen(SCREEN_OF[kind] || 'term', 1.4);
    if (wallTall) {
      /* painel na parede, na altura do peito */
      box(W_, 0.95, D, MAT.metal('#4a5366', 0.4), 0, 1.15, D / 2, 0.04);
      box(W_ - 0.14, 0.5, 0.02, scr, 0, 1.28, D + 0.011);
      box(W_ + 0.06, 0.06, D + 0.04, MAT.metalLight, 0, 1.64, D / 2);
    } else {
      /* console em pé, com a tela inclinada para cima */
      box(W_, 0.95, D + 0.2, MAT.metal('#4a5366', 0.4), 0, 0.48, (D + 0.2) / 2, 0.04);
      const [x, y, z] = P(0, 1.0, (D + 0.2) * 0.55);
      k.add(new THREE.BoxGeometry(W_ - 0.12, 0.02, (D + 0.2) * 0.75), scr, x, y, z, 0.45 * (art.side === 'bottom' ? -1 : 1), ry, 0);
    }
    const yb = wallTall ? 0.86 : 0.7, zb = wallTall ? D + 0.02 : D + 0.21;
    /* detalhes por tipo */
    if (kind === 'wires') {
      const cols = ['#e04848', '#4a7df2', '#f2c94c', '#d653d6'];
      for (let i = 0; i < 4; i++) box(0.05, 0.05, 0.05, MAT.glow(cols[i], 1.2), -W_ / 2 + 0.18 + i * ((W_ - 0.36) / 3), yb, zb + 0.02);
    } else if (kind === 'divert' || kind === 'accept' || kind === 'lightsPanel') {
      const n = kind === 'lightsPanel' ? 5 : kind === 'divert' ? 6 : 1;
      for (let i = 0; i < n; i++) box(0.06, 0.18, 0.08, MAT.chrome, -W_ / 2 + 0.16 + i * ((W_ - 0.32) / Math.max(1, n - 1)) * (n > 1 ? 1 : 0) + (n === 1 ? W_ / 2 - 0.16 : 0), yb, zb + 0.04);
    } else if (kind === 'keypad' || kind === 'manifolds' || kind === 'simon') {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) box(0.09, 0.07, 0.03, MAT.glow(kind === 'simon' ? '#4ab3f2' : '#9aa6b8', 0.5), -0.14 + i * 0.14, yb + j * 0.1 - 0.05, zb + 0.015);
    } else if (kind === 'handScanner') {
      box(0.36, 0.42, 0.03, MAT.glow('#3ae0c8', 1.6), 0, wallTall ? 1.28 : 0.8, zb + 0.015);
    } else if (kind === 'calibrate' || kind === 'align') {
      for (let i = 0; i < 3; i++) {
        const [x, y, z] = P(-0.3 + i * 0.3, yb, zb + 0.03);
        k.cyl(0.07, 0.07, 0.05, MAT.chrome, x, y, z, 14, Math.PI / 2, ry, 0);
      }
    } else if (kind === 'swipe') {
      box(0.18, 0.28, 0.06, MAT.rubber, W_ / 2 - 0.2, yb + 0.05, zb + 0.03);
    } else if (kind === 'radio') {
      for (let i = 0; i < 4; i++) box(0.04, 0.12, 0.05, MAT.glow('#c08bff', 1), -0.3 + i * 0.2, yb, zb + 0.03);
    }
    const [sx, sy, sz] = P(0, wallTall ? 1.3 : 1.0, D + 0.25);
    out.stations[pr.station] = { x: sx, y: sy, z: sz };
  };

  AU.R3DWorld = { build, buildGen, HIGH, LOW, HULL_Y, wallHAt: (tx, tz) => wallH[tz * W + tx], heightAt: (x, z) => heightAt(x, z), STYLE, ACCENT };
})();

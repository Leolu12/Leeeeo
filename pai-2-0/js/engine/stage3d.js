/* PAI 2.0 — stage3d.js  (P2.core)
 * O palco 3D: renderizador Three.js, ambientes (P2.envs), atores 3D
 * (P2.chars), câmera de cinema com arrastar-para-girar 360°, balões de
 * emoção, partículas e efeitos de tela. Tudo que espera tempo (wait, tween,
 * walk) respeita a pausa do menu e o "pular cena" (resolve na hora).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const T = window.THREE;
  const M = P2.m3d;
  const core = (P2.core = {});
  P2.envs = P2.envs || {};
  P2.chars = P2.chars || {};
  P2.time = 0;
  P2.realTime = 0;
  P2.paused = false;
  P2.skipping = false;
  P2.lowPower = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4;
  // ?q=low: qualidade mínima fixa (testes automáticos e máquinas muito fracas).
  P2.lowQuality = /[?&]q=low\b/.test(location.search);

  // ------------------------------------------------------------------
  // Promessas rastreadas (para cancelar ao sair de um capítulo)
  // ------------------------------------------------------------------
  P2.ABORT = { abort: true, toString: () => 'P2.ABORT' };
  P2.runToken = 0;
  const pending = new Set();
  core.track = function (factory) {
    let entry;
    return new Promise((resolve, reject) => {
      entry = { reject };
      pending.add(entry);
      factory((v) => { pending.delete(entry); resolve(v); }, (e) => { pending.delete(entry); reject(e); });
    });
  };
  core.abortAll = function () {
    P2.runToken++;
    const list = Array.from(pending);
    pending.clear();
    timers.length = 0;
    tweens.length = 0;
    list.forEach((e) => { try { e.reject(P2.ABORT); } catch (_) { /* nada */ } });
  };

  // ------------------------------------------------------------------
  // Timers e tweens
  // ------------------------------------------------------------------
  const timers = [];
  const tweens = [];
  const EASE = M.ease;
  core.wait = function (s) {
    if (P2.skipping || !(s > 0)) return Promise.resolve();
    return core.track((res) => timers.push({ at: P2.time + s, res }));
  };
  core.tween = function (obj, props, dur, ease) {
    ease = typeof ease === 'function' ? ease : EASE[ease] || EASE.inOut;
    if (P2.skipping || !(dur > 0)) { Object.assign(obj, props); return Promise.resolve(); }
    for (let i = tweens.length - 1; i >= 0; i--) { if (tweens[i].obj === obj) Object.keys(props).forEach((k) => delete tweens[i].to[k]); }
    const from = {};
    Object.keys(props).forEach((k) => (from[k] = obj[k] == null ? 0 : obj[k]));
    return core.track((res) => tweens.push({ obj, from, to: Object.assign({}, props), t: 0, dur, ease, res }));
  };
  function flushTimers() { timers.splice(0).forEach((t) => t.res()); }
  function flushTweens() { tweens.splice(0).forEach((tw) => { Object.assign(tw.obj, tw.to); tw.res(); }); }
  core.setSkipping = function (on) {
    P2.skipping = !!on;
    if (on) {
      flushTimers();
      flushTweens();
      world.actors.forEach((a) => a._finishWalk());
      cam.finish();
    }
  };

  // ------------------------------------------------------------------
  // Mundo
  // ------------------------------------------------------------------
  const world = (core.world = {
    env: null, envId: null, params: {},
    actors: new Map(),
    particles: [],
    emotes: [],
    fade: { a: 0, color: '#000' },
    flash: { a: 0 },
    tint: { color: null, a: 0 },
    letterbox: 0,
    rewind: { on: false, t: 0 },
  });
  let renderer = null, scene = null, camera = null, container = null, dom = {};
  let envRoot = null;

  // ------------------------------------------------------------------
  // Câmera: plano do diretor + deslocamento do jogador (arrastar 360°)
  // ------------------------------------------------------------------
  const V = (x, y, z) => new T.Vector3(x || 0, y || 0, z || 0);
  const cam = (core.cam = {
    cur: { tx: 0, ty: 1.2, tz: 0, yaw: 0, pitch: 0.18, dist: 6, fov: 38 },
    from: null, to: null, t: 0, dur: 0, res: null,
    user: { yaw: 0, pitch: 0, zoom: 1 },
    userTarget: { yaw: 0, pitch: 0, zoom: 1 },
    lastUserAt: -999,
    auto: true,
    shake: { mag: 0, t: 0, dur: 0 },
    handheld: 0.6,
    screenShift: 0,
    shiftCur: 0,
  });
  function shotFrom(s) {
    if (!s) return null;
    if (typeof s === 'string') {
      const env = world.env;
      const sh = env && env.shots && env.shots[s];
      if (!sh) return null;
      s = sh;
    }
    const tg = s.target || [0, 1.2, 0];
    return { tx: tg[0], ty: tg[1], tz: tg[2], yaw: s.yaw || 0, pitch: s.pitch == null ? 0.15 : s.pitch, dist: s.dist || 5, fov: s.fov || 38 };
  }
  /** Move a câmera para um plano (nome do ambiente ou {target,yaw,pitch,dist,fov}). dur 0 = corte seco. */
  cam.shot = function (s, dur, ease) {
    const to = shotFrom(s);
    if (!to) return Promise.resolve();
    if (cam.res) { const r = cam.res; cam.res = null; r(); }
    cam.userTarget.yaw = 0; cam.userTarget.pitch = 0; cam.userTarget.zoom = 1;
    if (P2.skipping || !(dur > 0)) {
      Object.assign(cam.cur, to);
      cam.from = cam.to = null;
      cam.user.yaw = cam.user.pitch = 0; cam.user.zoom = 1;
      return Promise.resolve();
    }
    // menor caminho no ângulo
    const c = cam.cur;
    let dy = to.yaw - c.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    to.yaw = c.yaw + dy;
    cam.from = Object.assign({}, c);
    cam.to = to;
    cam.t = 0;
    cam.dur = dur;
    cam.ease = EASE[ease] || EASE.inOut;
    return core.track((res) => (cam.res = res));
  };
  cam.finish = function () {
    if (cam.to) { Object.assign(cam.cur, cam.to); cam.from = cam.to = null; }
    if (cam.res) { const r = cam.res; cam.res = null; r(); }
  };
  /** Enquadra um ator. kind: 'close' | 'medio' | 'plano' | 'geral'. side: -1/1 (lado do 3/4). */
  cam.focus = function (actor, kind, opts) {
    opts = opts || {};
    if (typeof actor === 'string') actor = world.actors.get(actor);
    if (!actor) return Promise.resolve();
    const h = actor.headWorldY();
    const dist = { close: 1.2, medio: 2.25, plano: 3.5, geral: 5.6 }[kind || 'medio'] || 2.2;
    const ty = kind === 'plano' || kind === 'geral' ? Math.max(0.8, h - 0.45) : kind === 'close' ? h - 0.04 : h - 0.14;
    const side = opts.side == null ? 1 : opts.side;
    return cam.shot({ target: [actor.x, ty, actor.z], yaw: opts.yaw != null ? opts.yaw : actor.rot + side * (opts.angle == null ? 0.5 : opts.angle), pitch: opts.pitch == null ? 0.1 : opts.pitch, dist: dist * (opts.zoom || 1), fov: opts.fov || 36 }, opts.dur == null ? 0.9 : opts.dur);
  };
  /** Enquadra dois atores juntos. */
  cam.two = function (a, b, opts) {
    opts = opts || {};
    if (typeof a === 'string') a = world.actors.get(a);
    if (typeof b === 'string') b = world.actors.get(b);
    if (!a || !b) return Promise.resolve();
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const dx = b.x - a.x, dz = b.z - a.z;
    const sep = Math.max(0.6, Math.hypot(dx, dz));
    let yaw = Math.atan2(-dz, dx) ; // perpendicular à linha entre os dois
    // escolhe o lado mais próximo da câmera atual
    const alt = yaw + Math.PI;
    const d1 = Math.abs(Math.atan2(Math.sin(yaw - cam.cur.yaw), Math.cos(yaw - cam.cur.yaw)));
    const d2 = Math.abs(Math.atan2(Math.sin(alt - cam.cur.yaw), Math.cos(alt - cam.cur.yaw)));
    if (d2 < d1) yaw = alt;
    yaw += opts.angle || 0;
    const ty = Math.min(a.headWorldY(), b.headWorldY()) - 0.25;
    return cam.shot({ target: [mx, ty, mz], yaw, pitch: opts.pitch == null ? 0.12 : opts.pitch, dist: (1.6 + sep * 1.25) * (opts.zoom || 1), fov: 38 }, opts.dur == null ? 1 : opts.dur);
  };
  cam.reset = function () { cam.userTarget.yaw = 0; cam.userTarget.pitch = 0; cam.userTarget.zoom = 1; };
  cam.userMoved = function () { return Math.abs(cam.user.yaw) > 0.05 || Math.abs(cam.user.pitch) > 0.05 || Math.abs(cam.user.zoom - 1) > 0.05; };
  // ------------------------------------------------------------------
  // JOGADOR EM PRIMEIRA PESSOA (o jogador é o pai)
  //   player.mode 'fp' (olhos do pai) | 'cine' (planos de cinema)
  //   player.canMove: liberado durante a exploração (G.explore)
  //   Teclado: WASD/setas · arrastar: olhar · clique no chão: andar até lá
  //   Celular: joystick na tela + arrastar para olhar
  // ------------------------------------------------------------------
  const SIT_RE = /^(sit|type|sittalk|sitthink|sitphone)/;
  const player = (core.player = {
    mode: 'cine',
    canMove: false,
    yaw: 0, pitch: -0.08,
    eyeH: 1.6,
    fov: 68,
    bobY: 0, bobT: 0,
    keys: {},
    joy: { x: 0, y: 0, on: false },
    moveTarget: null,
    lookTarget: null,
    lastLookAt: -99,
    speed: 1.65,
    radius: 0.26,
    onArrive: null,
  });
  player.body = () => world.actors.get('pai') || null;
  player.setMode = function (m) {
    player.mode = m === 'fp' ? 'fp' : 'cine';
    const b = player.body();
    if (b) { b.syncTransform(); if (player.mode === 'fp') { player.yaw = b.rot; } }
    if (dom.joy) dom.joy.hidden = !(player.mode === 'fp' && player.canMove && isTouch());
  };
  player.setMove = function (on) {
    player.canMove = !!on;
    if (!on) { player.moveTarget = null; player.keys = {}; player.joy.x = player.joy.y = 0; }
    const b = player.body();
    if (b && !on && b.anim === 'walk' && !b._walk) { b.anim = b.baseAnim; b.animT = 0; }
    if (dom.joy) dom.joy.hidden = !(player.mode === 'fp' && on && isTouch());
    if (dom.hint && on) { dom.hint.innerHTML = isTouch() ? '<span>🕹️</span> use o controle para andar · arraste para olhar' : '<span>⌨️</span> W A S D para andar · arraste para olhar · E para interagir'; core.showHint(true, 9); }
  };
  /** Vira a cabeça (visão) para um ator ou ponto, com suavidade. */
  player.lookAt = function (target) { player.lookTarget = target || null; };
  /** Anda sozinho até um ponto {x,z} (desviando de obstáculos simples). */
  player.goTo = function (pt, onArrive) {
    player.moveTarget = pt ? { x: pt.x, z: pt.z, stuck: 0, lastD: 1e9 } : null;
    player.onArrive = onArrive || null;
  };
  function isTouch() { return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0; }
  core.isTouch = isTouch;
  function angTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }
  /** Colisão do jogador com retângulos (colliders) e limites do ambiente. */
  function collide(x, z, r) {
    const env = world.env;
    if (!env) return { x, z };
    const b = env.bounds;
    if (b) { x = Math.max(b.minX + r, Math.min(b.maxX - r, x)); z = Math.max(b.minZ + r, Math.min(b.maxZ - r, z)); }
    const cs = env.colliders || [];
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      const th = c.rot || 0, co = Math.cos(th), si = Math.sin(th);
      const dx = x - c.x, dz = z - c.z;
      let lx = dx * co - dz * si, lz = dx * si + dz * co;
      const hw = c.w / 2, hd = c.d / 2;
      const px = Math.max(-hw, Math.min(hw, lx)), pz = Math.max(-hd, Math.min(hd, lz));
      const ex = lx - px, ez = lz - pz;
      const d2 = ex * ex + ez * ez;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); lx = px + (ex / d) * r; lz = pz + (ez / d) * r; }
      else { const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz); if (ox < oz) lx = Math.sign(lx || 1) * (hw + r); else lz = Math.sign(lz || 1) * (hd + r); }
      x = c.x + lx * co + lz * si;
      z = c.z - lx * si + lz * co;
    }
    return { x, z };
  }
  core.collide = collide;
  function updatePlayer(dt) {
    const b = player.body();
    if (!b) return;
    // olhar automático para quem fala (se o jogador não mexeu na visão há pouco)
    if (player.lookTarget && P2.realTime - player.lastLookAt > 2.5) {
      const tg = typeof player.lookTarget === 'string' ? world.actors.get(player.lookTarget) : player.lookTarget;
      if (tg) {
        const tx = tg.x, tz = tg.z;
        const ty = tg.headWorldY ? tg.headWorldY() - 0.05 : (tg.y == null ? 1.4 : tg.y);
        const sitting = SIT_RE.test(b.anim);
        const ey = b.y + (sitting ? 1.17 : player.eyeH);
        const want = angTo(b.x, b.z, tx, tz);
        const dist = Math.max(0.3, Math.hypot(tx - b.x, tz - b.z));
        const wantP = Math.atan2(ty - ey, dist);
        const k = 1 - Math.exp(-dt * 4);
        player.yaw += Math.atan2(Math.sin(want - player.yaw), Math.cos(want - player.yaw)) * k;
        player.pitch += (Math.max(-0.9, Math.min(0.9, wantP)) - player.pitch) * k;
      }
    }
    // caminhada roteirizada (pai.walk): a visão acompanha
    if (b._walk && P2.realTime - player.lastLookAt > 1) {
      player.yaw += Math.atan2(Math.sin(b.rot - player.yaw), Math.cos(b.rot - player.yaw)) * Math.min(1, dt * 5);
      player.pitch += (-0.06 - player.pitch) * Math.min(1, dt * 3);
    }
    // movimento
    let mx = 0, mz = 0;
    if (player.canMove && !P2.paused) {
      const K = player.keys;
      if (K.w || K.arrowup) mz += 1;
      if (K.s || K.arrowdown) mz -= 1;
      if (K.a || K.arrowleft) mx -= 1;
      if (K.d || K.arrowright) mx += 1;
      if (player.joy.on) { mx += player.joy.x; mz += -player.joy.y; }
    }
    const manual = Math.hypot(mx, mz) > 0.15;
    if (manual) { player.moveTarget = null; player.lookTarget = null; }
    let moved = false;
    if (manual) {
      const len = Math.min(1, Math.hypot(mx, mz));
      const nx = mx / (Math.hypot(mx, mz) || 1), nz = mz / (Math.hypot(mx, mz) || 1);
      const fy = player.yaw;
      // frente = (sin, cos); direita do jogador = (-cos, sin)
      const vx = Math.sin(fy) * nz + -Math.cos(fy) * nx;
      const vz = Math.cos(fy) * nz + Math.sin(fy) * nx;
      const step = player.speed * len * dt;
      const p = collide(b.x + vx * step, b.z + vz * step, player.radius);
      moved = Math.hypot(p.x - b.x, p.z - b.z) > step * 0.15;
      b.x = p.x; b.z = p.z;
      if (Math.abs(nz) > 0.2) b.rot = player.yaw;
    } else if (player.moveTarget && !P2.paused) {
      const t = player.moveTarget;
      const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz);
      if (d < 0.12) {
        player.moveTarget = null;
        const cb = player.onArrive; player.onArrive = null;
        if (cb) cb();
      } else {
        const want = Math.atan2(dx, dz);
        if (P2.realTime - player.lastLookAt > 0.8) player.yaw += Math.atan2(Math.sin(want - player.yaw), Math.cos(want - player.yaw)) * Math.min(1, dt * 6);
        const step = Math.min(d, player.speed * dt);
        const p = collide(b.x + (dx / d) * step, b.z + (dz / d) * step, player.radius);
        const prog = Math.hypot(p.x - b.x, p.z - b.z);
        b.x = p.x; b.z = p.z; b.rot = want;
        moved = prog > step * 0.15;
        t.stuck = moved ? 0 : (t.stuck || 0) + dt;
        if (t.stuck > 0.5) { player.moveTarget = null; const cb = player.onArrive; player.onArrive = null; if (cb) cb(); }
      }
    }
    if (moved) {
      b.walkT += dt;
      player.bobT += dt * 9;
      player.bobY = (P2.settings && P2.settings.reduceMotion) ? 0 : Math.sin(player.bobT) * 0.018;
      if (b.anim !== 'walk') { b.anim = 'walk'; b.animT = 0; }
    } else {
      player.bobY *= 0.85;
      if (b.anim === 'walk' && !b._walk) { b.anim = b.baseAnim; b.animT = 0; }
    }
    b.syncTransform();
  }
  // teclado
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const k = e.key.toLowerCase();
    if (player.canMove && player.mode === 'fp' && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      player.keys[k] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => { player.keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { player.keys = {}; });

  // ------------------------------------------------------------------
  // PONTOS DE INTERAÇÃO (hotspots): rótulos na tela sobre objetos/pessoas
  // ------------------------------------------------------------------
  const hs = (core.hotspots = { list: [], onPick: null, layer: null, suspended: false });
  hs.set = function (list, onPick) {
    hs.clear();
    hs.list = (list || []).map((h) => Object.assign({ radius: 1.6 }, h));
    hs.onPick = onPick || null;
    hs.list.forEach((h) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hs' + (h.optional ? ' opt' : '');
      b.innerHTML = '<span class="hs-ic"></span><span class="hs-tx"></span><span class="hs-key">E</span>';
      b.querySelector('.hs-ic').textContent = h.icon || (h.actor ? '💬' : '👆');
      b.querySelector('.hs-tx').textContent = h.label || '';
      b.addEventListener('click', (e) => { e.stopPropagation(); hs.pick(h, true); });
      hs.layer.appendChild(b);
      h.el = b;
    });
  };
  hs.clear = function () {
    hs.list.forEach((h) => h.el && h.el.remove());
    hs.list = [];
    hs.onPick = null;
  };
  hs.remove = function (id) {
    const i = hs.list.findIndex((h) => h.id === id);
    if (i >= 0) { if (hs.list[i].el) hs.list[i].el.remove(); hs.list.splice(i, 1); }
  };
  function hsPos(h) {
    if (h.actor) {
      const a = typeof h.actor === 'string' ? world.actors.get(h.actor) : h.actor;
      if (a) return { x: a.x, y: a.headWorldY() + 0.32, z: a.z };
    }
    if (h.at) { const s = core.spot(h.at); return { x: s.x, y: h.y == null ? 1.3 : h.y, z: s.z }; }
    return h.pos || { x: 0, y: 1.2, z: 0 };
  }
  hs.posOf = hsPos;
  /** Escolhe um ponto: se longe, anda até perto dele e depois interage. */
  hs.pick = function (h, walk) {
    if (hs.suspended || !hs.onPick || P2.paused) return;
    const b = player.body();
    const p = hsPos(h);
    if (b && walk) {
      const d = Math.hypot(p.x - b.x, p.z - b.z);
      if (d > (h.reach || 1.25)) {
        const k = Math.max(0, (d - (h.reach || 1.1) * 0.85) / d);
        const dest = h.at ? core.spot(h.at) : { x: b.x + (p.x - b.x) * k, z: b.z + (p.z - b.z) * k };
        player.lookAt({ x: p.x, y: p.y - 0.25, z: p.z });
        player.goTo(dest, () => { player.lookAt({ x: p.x, y: p.y - 0.25, z: p.z }); hs.onPick && hs.onPick(h); });
        return;
      }
    }
    if (b) player.lookAt({ x: p.x, y: p.y - 0.25, z: p.z });
    hs.onPick(h);
  };
  hs.nearest = null;
  function updateHotspots() {
    const layer = hs.layer;
    if (!layer || !camera) return;
    const W = container.clientWidth, H = container.clientHeight;
    const b = player.body();
    let best = null, bestD = 1e9;
    const v = new T.Vector3();
    hs.list.forEach((h) => {
      if (!h.el) return;
      const p = hsPos(h);
      v.set(p.x, p.y, p.z).project(camera);
      const behind = v.z > 1 || v.z < -1;
      const sx = (v.x * 0.5 + 0.5) * W, sy = (-v.y * 0.5 + 0.5) * H;
      const show = !behind && !hs.suspended && sx > -40 && sx < W + 40 && sy > -40 && sy < H + 40;
      h.el.style.display = show ? '' : 'none';
      if (!show) return;
      // o rótulo nunca sai pela borda da tela (no celular em pé a tela é estreita)
      const hw = (h.el.offsetWidth || 0) / 2, hh = h.el.offsetHeight || 0, m = 8;
      const cx = W > 2 * (hw + m) ? Math.min(W - hw - m, Math.max(hw + m, sx)) : W / 2;
      const cy = Math.min(H - m, Math.max(hh + m, sy));
      h.el.style.transform = 'translate(-50%, -100%) translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px)';
      const d = b ? Math.hypot(p.x - b.x, p.z - b.z) : 99;
      const inFront = Math.abs(v.x) < 0.6 && Math.abs(v.y) < 0.8;
      const near = d < (h.radius || 1.6) && inFront;
      h.el.classList.toggle('near', near);
      h.el.classList.toggle('far', d > 6);
      if (near && d < bestD) { best = h; bestD = d; }
    });
    hs.nearest = best;
  }
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'e' || e.key === 'E') && hs.nearest && !P2.paused && !hs.suspended) { e.preventDefault(); hs.pick(hs.nearest, false); }
  });

  /** Tela estreita (celular em pé): abre o FOV vertical para garantir um mínimo de visão na horizontal. */
  function fitFov(vfov, minH, cap) {
    const a = camera ? camera.aspect : 1.78;
    if (!(a > 0)) return vfov;
    const need = (2 * Math.atan(Math.tan((minH * Math.PI) / 360) / a) * 180) / Math.PI;
    return Math.min(Math.max(vfov, need), Math.max(vfov, cap));
  }
  function updateCamera(dt) {
    if (cam.to) {
      cam.t += dt;
      const k = Math.min(1, cam.t / cam.dur);
      const e = cam.ease(k);
      Object.keys(cam.to).forEach((p) => { cam.cur[p] = cam.from[p] + (cam.to[p] - cam.from[p]) * e; });
      if (k >= 1) cam.finish();
    }
    // deslocamento do jogador (suave)
    const ku = 1 - Math.exp(-dt * 10);
    cam.user.yaw += (cam.userTarget.yaw - cam.user.yaw) * ku;
    cam.user.pitch += (cam.userTarget.pitch - cam.user.pitch) * ku;
    cam.user.zoom += (cam.userTarget.zoom - cam.user.zoom) * ku;
    const c = cam.cur;
    const yaw = c.yaw + cam.user.yaw;
    const pitch = Math.max(-0.12, Math.min(1.25, c.pitch + cam.user.pitch));
    const dist = c.dist * cam.user.zoom;
    let px = c.tx + Math.sin(yaw) * Math.cos(pitch) * dist;
    let py = c.ty + Math.sin(pitch) * dist;
    let pz = c.tz + Math.cos(yaw) * Math.cos(pitch) * dist;
    // câmera na mão (leve respiração) + tremor
    const hh = (P2.settings && P2.settings.reduceMotion) ? 0 : cam.handheld;
    const t = P2.realTime;
    let ox = Math.sin(t * 0.7) * 0.012 * hh, oy = Math.sin(t * 0.9 + 1) * 0.01 * hh;
    if (cam.shake.t > 0) {
      cam.shake.t -= dt;
      const m = cam.shake.mag * (cam.shake.t / cam.shake.dur) * 0.03;
      ox += Math.sin(t * 61) * m; oy += Math.cos(t * 47) * m;
    }
    const fp = player.mode === 'fp' && player.body();
    if (fp) {
      updatePlayer(dt);
      const b = player.body();
      const sitting = SIT_RE.test(b.anim);
      const lying = b.anim === 'sleep';
      if (lying) {
        // deitado: olhos no travesseiro (o corpo se estende para trás a partir dos pés)
        const bx = -Math.sin(b.rot), bz = -Math.cos(b.rot);
        camera.position.set(b.x + bx * 1.5 + ox, b.y + 0.84 + oy, b.z + bz * 1.5);
      } else {
        const eyeY = b.y + (sitting ? 1.17 : player.eyeH) * b.scale + player.bobY;
        const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
        camera.position.set(b.x + fx * 0.06 + ox, eyeY + oy, b.z + fz * 0.06);
      }
      camera.rotation.order = 'YXZ';
      camera.rotation.set(player.pitch, player.yaw + Math.PI, 0);
      const fpFov = fitFov(player.fov, 56, 92);
      if (Math.abs(camera.fov - fpFov) > 0.01) { camera.fov = fpFov; camera.updateProjectionMatrix(); }
    } else {
      camera.position.set(px + ox, Math.max(0.15, py + oy), pz);
      camera.lookAt(c.tx + ox * 0.5, c.ty + oy * 0.5, c.tz);
      const cFov = fitFov(c.fov, 40, 80);
      if (Math.abs(camera.fov - cFov) > 0.01) { camera.fov = cFov; camera.updateProjectionMatrix(); }
    }
    // desloca o enquadramento para cima quando o painel cobre a parte de baixo
    cam.shiftCur += ((cam.screenShift || 0) - cam.shiftCur) * Math.min(1, dt * 6 || 1);
    const W = container ? container.clientWidth : 0, Hh = container ? container.clientHeight : 0;
    if (Math.abs(cam.shiftCur) > 0.002 && W && Hh) camera.setViewOffset(W, Hh, 0, Hh * cam.shiftCur, W, Hh);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    // paredes entre a câmera e a cena somem (efeito "casa de bonecas")
    const env = world.env;
    if (env && env.walls) {
      env.walls.forEach((w) => {
        const n = w.normal; // normal apontando para DENTRO do cômodo
        const d = (camera.position.x - (w.px || 0)) * n[0] + (camera.position.y - (w.py == null ? 1.4 : w.py)) * (n[1] || 0) + (camera.position.z - (w.pz || 0)) * n[2];
        const visible = d > -0.05;
        if (w.obj.visible !== visible) w.obj.visible = visible;
      });
    }
  }

  // Arrastar para girar / pinça ou roda para aproximar
  let drag = null;
  core.wasDrag = false;
  function setupInput(el) {
    el.style.touchAction = 'none';
    const pts = new Map();
    el.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false, yaw: cam.userTarget.yaw, pitch: cam.userTarget.pitch, pyaw: player.yaw, ppitch: player.pitch };
      if (pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.userTarget.zoom, moved: true };
      }
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!drag) return;
      if (drag.pinch && pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        cam.userTarget.zoom = Math.max(0.55, Math.min(1.8, drag.zoom * (drag.pinch / Math.max(20, d))));
        cam.lastUserAt = P2.realTime;
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 7) drag.moved = true;
      if (drag.moved && player.mode === 'fp' && player.body()) {
        const w = el.clientWidth || 600;
        player.yaw = drag.pyaw - (dx / w) * Math.PI * 1.3;
        player.pitch = Math.max(-1.1, Math.min(1.1, drag.ppitch - (dy / w) * Math.PI * 0.9));
        player.lastLookAt = P2.realTime;
        cam.lastUserAt = P2.realTime;
        if (dom.hint) dom.hint.classList.add('gone');
      } else if (drag.moved) {
        const w = el.clientWidth || 600;
        cam.userTarget.yaw = drag.yaw - (dx / w) * Math.PI * 1.6;
        cam.userTarget.pitch = Math.max(-0.5, Math.min(1.0, drag.pitch + (dy / w) * Math.PI * 0.8));
        cam.lastUserAt = P2.realTime;
        if (dom.camBtn) dom.camBtn.hidden = false;
        if (dom.hint) dom.hint.classList.add('gone');
      }
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (drag && drag.moved) { core.wasDrag = true; setTimeout(() => (core.wasDrag = false), 60); }
      if (pts.size === 0) drag = null;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      cam.userTarget.zoom = Math.max(0.55, Math.min(1.8, cam.userTarget.zoom * (e.deltaY > 0 ? 1.08 : 0.93)));
      cam.lastUserAt = P2.realTime;
      if (dom.camBtn) dom.camBtn.hidden = false;
    }, { passive: false });
    // clique depois de arrastar não conta como "avançar"; explorando, clique no chão = andar até lá
    el.addEventListener('click', (e) => {
      if (core.wasDrag) { e.stopPropagation(); e.preventDefault(); return; }
      if (player.mode === 'fp' && player.canMove && !P2.paused) {
        const r = el.getBoundingClientRect();
        const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = -((e.clientY - r.top) / r.height) * 2 + 1;
        const ray = new T.Raycaster();
        ray.setFromCamera({ x: nx, y: ny }, camera);
        const hit = new T.Vector3();
        if (ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), hit)) {
          const b = player.body();
          if (b && Math.hypot(hit.x - b.x, hit.z - b.z) < 14) player.goTo({ x: hit.x, z: hit.z });
        }
        e.stopPropagation();
      }
    }, true);
  }

  // ------------------------------------------------------------------
  // Ambientes
  // ------------------------------------------------------------------
  core.setScene = function (id, params) {
    params = Object.assign({}, params || {});
    if (world.envId === id && world.env) {
      world.params = params;
      if (world.env.setParams) world.env.setParams(params);
      return;
    }
    if (envRoot) { scene.remove(envRoot); if (world.env && world.env.dispose) world.env.dispose(); else M.dispose(envRoot); }
    world.envId = id;
    world.params = params;
    const def = P2.envs[id];
    let env;
    try {
      env = def ? def.build(params) : fallbackEnv(id);
    } catch (e) {
      console.error('Erro ao montar ambiente', id, e);
      env = fallbackEnv(id);
    }
    world.env = env;
    envRoot = env.root;
    scene.add(envRoot);
    scene.background = M.color(env.background || '#0e1222');
    scene.fog = env.fog ? new T.Fog(env.fog.color, env.fog.near, env.fog.far) : null;
    if (env.setParams) env.setParams(params);
    cam.shot(env.defaultShot || 'geral', 0);
    // reposiciona atores existentes no chão do novo ambiente
    world.actors.forEach((a) => a.syncTransform());
  };
  core.sceneParams = function (partial) {
    Object.assign(world.params, partial || {});
    if (world.env && world.env.setParams) world.env.setParams(world.params);
  };
  core.spot = function (name) {
    if (name && typeof name === 'object') return { x: name.x || 0, z: name.z || 0, rot: name.rot, y: name.y };
    if (typeof name === 'number') return { x: name, z: 0 };
    const env = world.env;
    const s = env && env.spots && env.spots[name];
    if (s) return s;
    if (name) console.warn('Ponto não encontrado no ambiente', world.envId, name);
    return { x: 0, z: 0 };
  };
  core.spotX = (n) => core.spot(n).x;
  function fallbackEnv(id) {
    const root = new T.Group();
    const floor = M.plane(14, 14, M.mat('#5b6070'), { rot: [-Math.PI / 2, 0, 0], parent: root });
    floor.castShadow = false;
    const light = M.lighting('dia');
    root.add(light.group);
    const label = M.textPanel(3, 0.6, { text: ['cenário: ' + id], bg: 'rgba(0,0,0,0.4)' });
    label.position.set(0, 2.5, -3);
    root.add(label);
    return { root, spots: { centro: { x: 0, z: 0, rot: 0 }, esquerda: { x: -1.5, z: 0, rot: 0.3 }, direita: { x: 1.5, z: 0, rot: -0.3 } }, shots: { geral: { target: [0, 1.1, 0], yaw: 0, pitch: 0.18, dist: 6 } }, defaultShot: 'geral', background: '#1a1f33' };
  }

  // ------------------------------------------------------------------
  // Atores 3D
  // ------------------------------------------------------------------
  let blinkSeed = 1;
  const ACTOR_TYPES = {}; // id → tipo de personagem (ex.: npc1 → npc)
  class Actor {
    constructor(id, opts) {
      opts = opts || {};
      this.id = id;
      this.type = opts.type || ACTOR_TYPES[id] || id;
      this.x = 0; this.z = 0; this.y = 0; this.rot = 0;
      this.anim = 'idle'; this.baseAnim = 'idle'; this.animT = 0; this.t = 0;
      this.expr = 'neutro'; this.talking = false; this.blink = false; this.moving = false; this.walkT = 0;
      this.props = {}; this.scale = 1; this.alpha = 1; this.visible = true;
      this.look = null; this.lookYaw = 0;
      this.buildOpts = Object.assign({}, opts.build || {});
      this._walk = null; this._follow = null; this._playTok = null; this._turn = null;
      this._blinkNext = 1.2 + ((blinkSeed++ * 1.37) % 3);
      this._blinkEnd = 0;
      this.ctl = null;
      this.group = new T.Group();
      this.group.name = 'actor:' + id;
      scene.add(this.group);
      this.rebuild();
    }
    rebuild(extra) {
      if (extra) Object.assign(this.buildOpts, extra);
      if (this.ctl) { this.group.remove(this.ctl.root); if (this.ctl.dispose) this.ctl.dispose(); }
      const def = P2.chars[this.type];
      try {
        this.ctl = def ? def.build(Object.assign({ id: this.id }, this.buildOpts)) : placeholder(this.type);
      } catch (e) {
        console.error('Erro ao montar personagem', this.type, e);
        this.ctl = placeholder(this.type);
      }
      this.group.add(this.ctl.root);
      this.syncTransform();
      return this;
    }
    get height() { return (this.ctl && this.ctl.height) || 1.7; }
    headWorldY() {
      const base = this.y + (this.ctl && this.ctl.headY ? this.ctl.headY : this.height * 0.9);
      const seated = /^sit|type|sittalk|sitthink|sitphone/.test(this.anim) ? -0.4 : 0;
      return (base + seated) * this.scale;
    }
    set(o) {
      o = o || {};
      if (o.x != null || o.z != null || o.spot) this.at(o.spot || { x: o.x == null ? this.x : o.x, z: o.z == null ? this.z : o.z });
      if (o.y != null) this.y = o.y;
      if (o.rot != null) this.rot = o.rot;
      if (o.dir != null) this.face(o.dir);
      if (o.anim) this.setAnim(o.anim);
      ['expr', 'scale', 'alpha', 'visible'].forEach((k) => { if (o[k] !== undefined) this[k] = o[k]; });
      if (o.props) this.props = Object.assign({}, this.props, o.props);
      if (o.look !== undefined) this.look = o.look;
      this.syncTransform();
      return this;
    }
    at(spot, y) {
      const s = core.spot(spot);
      this.x = s.x; this.z = s.z;
      this.y = y != null ? y : s.y || 0;
      if (s.rot != null) this.rot = s.rot;
      this._finishWalk();
      this.syncTransform();
      if (this.id === 'pai') { player.yaw = this.rot; player.pitch = -0.08; player.moveTarget = null; }
      return this;
    }
    /** Vira para: 'camera', ator, nome de ponto, {x,z}, ou ângulo (rad). */
    face(d, instant) {
      let target = null;
      if (d === 'camera') target = Math.atan2(camera.position.x - this.x, camera.position.z - this.z);
      else if (d === 'left' || d === 'esquerda') target = -Math.PI / 2;
      else if (d === 'right' || d === 'direita') target = Math.PI / 2;
      else if (typeof d === 'number') target = d;
      else if (d && typeof d === 'object' && d.x != null) target = Math.atan2(d.x - this.x, (d.z || 0) - this.z);
      else if (typeof d === 'string') { const s = core.spot(d); target = Math.atan2(s.x - this.x, s.z - this.z); }
      if (target == null) return this;
      if (instant || P2.skipping) { this.rot = target; this._turn = null; }
      else this._turn = target;
      return this;
    }
    setAnim(name) { this._playTok = null; this.baseAnim = name; if (this.anim !== name) { this.anim = name; this.animT = 0; } return this; }
    setExpr(e) { this.expr = e; return this; }
    show() { this.visible = true; return this; }
    hide() { this.visible = false; return this; }
    remove() { scene.remove(this.group); if (this.ctl && this.ctl.dispose) this.ctl.dispose(); world.actors.delete(this.id); world.emotes = world.emotes.filter((e) => e.actor !== this); return this; }
    walk(spot, speed) {
      const s = core.spot(spot);
      speed = speed || (this.type === 'faisca' ? 1.6 : 1.25);
      if (P2.skipping || Math.hypot(s.x - this.x, s.z - this.z) < 0.02) {
        this.x = s.x; this.z = s.z; if (s.rot != null) this.rot = s.rot;
        this.syncTransform();
        return Promise.resolve();
      }
      this._finishWalk();
      return core.track((res) => {
        this._walk = { tx: s.x, tz: s.z, endRot: s.rot, speed, res };
        this.moving = true;
        if (this.anim !== 'walk') { this.anim = 'walk'; this.animT = 0; }
      });
    }
    _finishWalk() {
      if (!this._walk) return;
      const w = this._walk;
      this._walk = null;
      this.x = w.tx; this.z = w.tz;
      if (w.endRot != null) this.rot = w.endRot;
      this.moving = false;
      this.anim = this.baseAnim; this.animT = 0;
      this.syncTransform();
      w.res();
    }
    jump(h, dur) {
      h = h || 0.3; dur = dur || 0.45;
      if (P2.skipping) return Promise.resolve();
      if (P2.audio) P2.audio.sfx('jump');
      const start = P2.time, self = this, y0 = this.y;
      return new Promise((res) => {
        const step = () => {
          const k = Math.min(1, (P2.time - start) / dur);
          self._jy = Math.sin(k * Math.PI) * h;
          if (k >= 1 || P2.skipping) { self._jy = 0; self.y = y0; res(); return; }
          core.onNextFrame(step);
        };
        core.onNextFrame(step);
      });
    }
    play(name, secs) {
      secs = secs == null ? 1.2 : secs;
      this.anim = name; this.animT = 0;
      const tok = {};
      this._playTok = tok;
      return core.wait(secs).then(() => {
        if (this._playTok === tok) { this._playTok = null; this.anim = this.moving ? 'walk' : this.baseAnim; this.animT = 0; }
      });
    }
    emote(type, secs) {
      if (P2.skipping) return this;
      world.emotes = world.emotes.filter((e) => { if (e.actor === this) { scene.remove(e.sprite); return false; } return true; });
      const sprite = makeEmoteSprite(type);
      scene.add(sprite);
      world.emotes.push({ actor: this, sprite, t: 0, dur: secs || 1.8 });
      return this;
    }
    follow(target, opts) {
      if (typeof opts === 'number') opts = { gap: opts };
      this._follow = target ? Object.assign({ side: 1, up: null, gap: 0.45 }, opts || {}, { target }) : null;
      return this;
    }
    unfollow() { this._follow = null; return this; }
    tween(props, secs, ease) {
      const p = Object.assign({}, props);
      if (p.spot) { const s = core.spot(p.spot); p.x = s.x; p.z = s.z; delete p.spot; }
      return core.tween(this, p, secs, ease);
    }
    fadeIn(d) { this.visible = true; this.alpha = 0; return core.tween(this, { alpha: 1 }, d || 0.5); }
    fadeOut(d) { return core.tween(this, { alpha: 0 }, d || 0.5).then(() => { this.visible = false; this.alpha = 1; }); }
    lookAt(target) {
      if (!target) { this.look = null; this._lookAt = null; return this; }
      this._lookAt = target;
      return this;
    }
    syncTransform() {
      this.group.position.set(this.x, this.y + (this._jy || 0), this.z);
      this.group.rotation.y = this.rot;
      this.group.scale.setScalar(this.scale);
      this.group.visible = this.visible && this.alpha > 0.01 && !(this.id === 'pai' && player.mode === 'fp');
    }
    update(dt) {
      this.t = P2.time;
      this.animT += dt;
      if (this.t >= this._blinkNext) {
        this._blinkEnd = this.t + 0.12;
        this._blinkNext = this.t + 2.2 + ((this.t * 7.13 + blinkSeed) % 3.4);
      }
      this.blink = this.t < this._blinkEnd;
      if (this._walk) {
        const w = this._walk;
        const dx = w.tx - this.x, dz = w.tz - this.z;
        const d = Math.hypot(dx, dz);
        const step = w.speed * dt;
        this.walkT += dt * (w.speed / 1.25);
        const want = Math.atan2(dx, dz);
        this.rot = turnToward(this.rot, want, dt * 9);
        if (d <= step) this._finishWalk();
        else { this.x += (dx / d) * step; this.z += (dz / d) * step; }
      } else if (this._follow) {
        this.updateFollow(dt);
      }
      if (this._turn != null) {
        this.rot = turnToward(this.rot, this._turn, dt * 7);
        if (Math.abs(angDiff(this.rot, this._turn)) < 0.01) { this.rot = this._turn; this._turn = null; }
      }
      // cabeça olha para alguém
      if (this._lookAt) {
        const tg = typeof this._lookAt === 'string' ? world.actors.get(this._lookAt) : this._lookAt;
        if (tg && tg.x != null) {
          const want = Math.atan2(tg.x - this.x, tg.z - this.z);
          this.lookYaw = Math.max(-0.9, Math.min(0.9, angDiff(this.rot, want)));
        }
      } else this.lookYaw *= 0.9;
      this.syncTransform();
      if (this.ctl && (this.group.visible || this.id === 'pai')) this.ctl.update(dt, this);
      else if (this.ctl && this.alpha <= 0.01) this.ctl.update(0, this);
    }
    updateFollow(dt) {
      const f = this._follow;
      const L = f.target;
      if (!L || !world.actors.has(L.id) || !L.visible) return;
      const seated = /^sit|type|sittalk|sitthink|sitphone/.test(L.anim);
      const fpLead = L.id === 'pai' && player.mode === 'fp';
      const lrot = fpLead ? player.yaw : L.rot;
      const right = { x: -Math.cos(lrot), z: Math.sin(lrot) }; // direita do líder
      const fwd = { x: Math.sin(lrot), z: Math.cos(lrot) };
      const side = f.side || 1;
      const ahead = fpLead ? 1.0 : 0.12;
      const gap = fpLead ? 0.62 : f.gap;
      const tx = L.x + right.x * gap * side + fwd.x * ahead;
      const tz = L.z + right.z * gap * side + fwd.z * ahead;
      const ty = f.up != null ? f.up : (this.ctl && this.ctl.kind === 'floater' ? (seated ? 0.95 : fpLead ? 1.2 : 1.32) : 0);
      if (fpLead) f.faceCamera = true;
      const k = 1 - Math.exp(-dt * 3.2);
      const dist = Math.hypot(tx - this.x, tz - this.z);
      this.x += (tx - this.x) * k;
      this.z += (tz - this.z) * k;
      this.y += (ty - this.y) * k;
      this.moving = dist > 0.08;
      if (this.moving) this.walkT += dt;
      const want = dist > 0.25 ? Math.atan2(tx - this.x, tz - this.z) : (f.faceCamera ? Math.atan2(camera.position.x - this.x, camera.position.z - this.z) : L.rot);
      if (this._turn == null) this.rot = turnToward(this.rot, want, dt * 5);
    }
  }
  function angDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
  function turnToward(cur, want, k) { const d = angDiff(cur, want); return cur + d * Math.min(1, k); }
  core.Actor = Actor;

  function placeholder(type) {
    const root = new T.Group();
    const col = { pai: '#4a7bd1', filho: '#3fbf8f', faisca: '#f26b3a', jorge: '#e0a030', golpista: '#2a1a3a', duvida: '#7a4ac0' }[type] || '#8a8aa0';
    M.capsule(0.22, 1.1, col, { parent: root, pos: [0, 0.78, 0] });
    M.sphere(0.06, '#ffffff', { parent: root, pos: [0.07, 1.35, 0.2] });
    M.sphere(0.06, '#ffffff', { parent: root, pos: [-0.07, 1.35, 0.2] });
    return { root, height: 1.6, headY: 1.35, update() {} };
  }

  core.registerActorType = function (id, type) { ACTOR_TYPES[id] = type; };
  core.actor = function (id, opts) {
    let a = world.actors.get(id);
    if (!a) {
      const o = opts || {};
      a = new Actor(id, { type: o.type, build: Object.assign({}, core.defaultBuild ? core.defaultBuild(id, o.type) : {}, o.build || {}) });
      world.actors.set(id, a);
      if (core.onActorCreated) core.onActorCreated(a);
    }
    if (opts) {
      const o = Object.assign({}, opts);
      delete o.type; delete o.build;
      a.set(o);
    }
    return a;
  };
  core.getActor = (id) => world.actors.get(id) || null;
  core.clearFx = function () {
    world.particles.forEach((p) => { scene.remove(p.obj); if (p.obj.material) p.obj.material.dispose(); });
    world.particles.length = 0;
    world.emotes.forEach((e) => scene.remove(e.sprite));
    world.emotes.length = 0;
  };
  core.clearActors = function () {
    world.actors.forEach((a) => { a._finishWalk(); scene.remove(a.group); if (a.ctl && a.ctl.dispose) a.ctl.dispose(); });
    world.actors.clear();
    world.emotes.forEach((e) => scene.remove(e.sprite));
    world.emotes.length = 0;
  };

  // ------------------------------------------------------------------
  // Balões de emoção (sprites)
  // ------------------------------------------------------------------
  const emoteTex = {};
  const EMO = {
    '!': { g: '!', c: '#e94b5a' }, '?': { g: '?', c: '#4166a8' }, '...': { g: '…', c: '#5b5768' },
    heart: { g: '♥', c: '#ff5a7a' }, sweat: { g: 'drop', c: '#4aa8ff' }, angry: { g: 'vein', c: '#e94b5a' },
    idea: { g: 'bulb', c: '#f2a53a' }, zzz: { g: 'Zz', c: '#4166a8' }, note: { g: '♪', c: '#2f9f78' },
    star: { g: '★', c: '#f2a53a' }, check: { g: '✓', c: '#1f9a6e' }, x: { g: '✕', c: '#e94b5a' },
  };
  function makeEmoteSprite(type) {
    const def = EMO[type] || EMO['!'];
    if (!emoteTex[type]) {
      emoteTex[type] = M.canvasTex(128, 128, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(ctx, 14, 16, 104, 92, 30); ctx.fill();
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, 10, 10, 104, 92, 30); ctx.fill();
        ctx.beginPath(); ctx.moveTo(50, 98); ctx.lineTo(62, 122); ctx.lineTo(74, 98); ctx.closePath(); ctx.fill();
        ctx.fillStyle = def.c;
        ctx.strokeStyle = def.c;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (def.g === 'drop') {
          ctx.beginPath(); ctx.moveTo(62, 26); ctx.quadraticCurveTo(90, 66, 62, 86); ctx.quadraticCurveTo(34, 66, 62, 26); ctx.fill();
        } else if (def.g === 'vein') {
          ctx.lineWidth = 9; ctx.lineCap = 'round';
          [[40, 40, 52, 52], [84, 40, 72, 52], [40, 76, 52, 64], [84, 76, 72, 64]].forEach((l) => { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); });
        } else if (def.g === 'bulb') {
          ctx.beginPath(); ctx.arc(62, 50, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(52, 70, 20, 14); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(52, 80, 20, 8);
        } else {
          ctx.font = '900 ' + (def.g.length > 1 ? 50 : 70) + 'px "Plus Jakarta Sans", Arial, sans-serif';
          ctx.fillText(def.g, 62, 58);
        }
      });
    }
    const mat = new T.SpriteMaterial({ map: emoteTex[type], transparent: true, depthWrite: false, toneMapped: false });
    const s = new T.Sprite(mat);
    s.scale.setScalar(0.001);
    s.renderOrder = 10;
    return s;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  core.roundRect = roundRect;
  function updateEmotes(dt) {
    for (let i = world.emotes.length - 1; i >= 0; i--) {
      const e = world.emotes[i];
      e.t += dt;
      if (e.t >= e.dur || !world.actors.has(e.actor.id)) { scene.remove(e.sprite); e.sprite.material.dispose(); world.emotes.splice(i, 1); continue; }
      const a = e.actor;
      const pop = e.t < 0.22 ? M.ease.back(e.t / 0.22) : 1;
      const fade = e.t > e.dur - 0.25 ? (e.dur - e.t) / 0.25 : 1;
      const size = (a.ctl && a.ctl.kind === 'floater' ? 0.22 : 0.3) * pop;
      e.sprite.scale.setScalar(Math.max(0.001, size));
      e.sprite.material.opacity = fade;
      const top = (a.ctl && a.ctl.topY ? a.ctl.topY : a.headWorldY() + 0.32) ;
      e.sprite.position.set(a.x + Math.cos(a.rot) * 0.12, a.y * (a.ctl && a.ctl.kind === 'floater' ? 1 : 0) + top + 0.08 + Math.sin(e.t * 4) * 0.015, a.z);
      e.sprite.visible = a.visible;
    }
  }

  // ------------------------------------------------------------------
  // Partículas
  // ------------------------------------------------------------------
  const CONF = ['#ff6b3d', '#ffd27a', '#7ee0b8', '#6a9bd8', '#ff7a9a', '#b48ae8', '#ffe066'];
  let confGeo = null;
  const spriteTexCache = {};
  function particleSprite(kind, color, text) {
    const key = kind + (text || '');
    if (!spriteTexCache[key]) {
      spriteTexCache[key] = M.canvasTex(kind === 'text' ? 256 : 64, 64, (ctx, w, h) => {
        ctx.fillStyle = '#ffffff';
        if (kind === 'star') {
          ctx.translate(32, 32);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const r = i % 2 ? 6 : 28; const a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
          ctx.closePath(); ctx.fill();
        } else if (kind === 'heart') {
          ctx.font = '900 54px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', 32, 36);
        } else if (kind === 'text') {
          ctx.font = '900 40px "Plus Jakarta Sans", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(10,12,30,0.85)'; ctx.strokeText(text, w / 2, h / 2); ctx.fillText(text, w / 2, h / 2);
        } else if (kind === 'puff') {
          const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
        } else {
          ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.fill();
        }
      });
    }
    const mat = new T.SpriteMaterial({ map: spriteTexCache[key], color: M.color(color || '#fff'), transparent: true, depthWrite: false, toneMapped: false, blending: kind === 'star' ? T.AdditiveBlending : T.NormalBlending });
    return new T.Sprite(mat);
  }
  const fx = (core.fx = {});
  function addParticle(p) {
    if (P2.skipping) return;
    world.particles.push(p);
    scene.add(p.obj);
    if (world.particles.length > 260) { const old = world.particles.shift(); scene.remove(old.obj); }
  }
  let fxSeed = 11;
  const rnd = () => { fxSeed = (fxSeed * 16807) % 2147483647; return (fxSeed % 10000) / 10000; };
  function toPos(x, y, z) {
    if (x && typeof x === 'object' && x.headWorldY) return { x: x.x, y: x.headWorldY() + 0.2, z: x.z };
    if (typeof x === 'string') { const a = world.actors.get(x); if (a) return { x: a.x, y: a.headWorldY() + 0.2, z: a.z }; const s = core.spot(x); return { x: s.x, y: 1.4, z: s.z }; }
    return { x: x || 0, y: y == null ? 1.4 : y, z: z || 0 };
  }
  /** fx.confetti(alvo|x, y, z, n) — alvo pode ser um ator ou nome de ator. */
  fx.confetti = function (x, y, z, n) {
    if (P2.skipping) return;
    const p = toPos(x, y, z);
    n = n || 60;
    if (!confGeo) confGeo = new T.PlaneGeometry(0.035, 0.06);
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(confGeo, new T.MeshBasicMaterial({ color: M.color(CONF[i % CONF.length]), side: T.DoubleSide, transparent: true }));
      m.position.set(p.x, p.y, p.z);
      const ang = rnd() * Math.PI * 2, up = 2.2 + rnd() * 2.2, sp = 0.6 + rnd() * 1.6;
      addParticle({ obj: m, vx: Math.cos(ang) * sp, vy: up, vz: Math.sin(ang) * sp, ay: -4.5, drag: 1.4, life: 2 + rnd(), t: 0, spin: [rnd() * 10, rnd() * 10] });
    }
    if (P2.audio) P2.audio.sfx('confetti');
  };
  fx.sparkles = function (x, y, z, n, color) {
    const p = toPos(x, y, z);
    n = n || 16;
    for (let i = 0; i < n; i++) {
      const s = particleSprite('star', color || (i % 2 ? '#ffd27a' : '#ffffff'));
      s.scale.setScalar(0.05 + rnd() * 0.06);
      s.position.set(p.x, p.y, p.z);
      const a = rnd() * Math.PI * 2, b = rnd() * Math.PI - Math.PI / 2, sp = 0.4 + rnd() * 0.9;
      addParticle({ obj: s, vx: Math.cos(a) * Math.cos(b) * sp, vy: Math.sin(b) * sp + 0.3, vz: Math.sin(a) * Math.cos(b) * sp, ay: 0, drag: 2.2, life: 0.7 + rnd() * 0.6, t: 0, twinkle: true });
    }
  };
  fx.hearts = function (x, y, z, n) {
    const p = toPos(x, y, z);
    n = n || 5;
    for (let i = 0; i < n; i++) {
      const s = particleSprite('heart', '#ff5a7a');
      s.scale.setScalar(0.1);
      s.position.set(p.x + (rnd() - 0.5) * 0.3, p.y, p.z + (rnd() - 0.5) * 0.2);
      addParticle({ obj: s, vx: (rnd() - 0.5) * 0.2, vy: 0.5 + rnd() * 0.3, vz: 0, ay: 0, drag: 0.3, life: 1.4 + rnd() * 0.5, t: 0 });
    }
  };
  fx.burst = function (x, y, z, color, n) {
    const p = toPos(x, y, z);
    n = n || 18;
    for (let i = 0; i < n; i++) {
      const s = particleSprite('dot', color || '#ffffff');
      s.scale.setScalar(0.04 + rnd() * 0.03);
      s.position.set(p.x, p.y, p.z);
      const a = (i / n) * Math.PI * 2, sp = 1 + rnd() * 0.8;
      addParticle({ obj: s, vx: Math.cos(a) * sp, vy: (rnd() - 0.3) * sp, vz: Math.sin(a) * sp, ay: 0, drag: 3, life: 0.6 + rnd() * 0.3, t: 0 });
    }
  };
  fx.float = function (x, y, z, text, color) {
    if (typeof y === 'string' && text == null) { text = y; color = z; y = null; z = null; }
    const p = toPos(x, y, z);
    const s = particleSprite('text', color || '#ffe066', String(text));
    s.scale.set(0.9, 0.225, 1);
    s.position.set(p.x, p.y + 0.15, p.z);
    addParticle({ obj: s, vx: 0, vy: 0.35, vz: 0, ay: 0, drag: 0.6, life: 1.8, t: 0, noFadeUntil: 1 });
  };
  fx.smoke = function (x, y, z, n, color) {
    const p = toPos(x, y, z);
    n = n || 10;
    for (let i = 0; i < n; i++) {
      const s = particleSprite('puff', color || '#2a1a3a');
      s.scale.setScalar(0.2 + rnd() * 0.25);
      s.position.set(p.x + (rnd() - 0.5) * 0.4, p.y - 0.5 + rnd() * 0.8, p.z + (rnd() - 0.5) * 0.3);
      addParticle({ obj: s, vx: (rnd() - 0.5) * 0.3, vy: 0.2 + rnd() * 0.3, vz: (rnd() - 0.5) * 0.2, ay: 0, drag: 0.8, life: 1.2 + rnd() * 0.8, t: 0, grow: 0.4 });
    }
  };
  function updateParticles(dt) {
    const ps = world.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      if (p.t >= p.life) { scene.remove(p.obj); if (p.obj.material) p.obj.material.dispose(); ps.splice(i, 1); continue; }
      p.vy += (p.ay || 0) * dt;
      const k = Math.max(0, 1 - (p.drag || 0) * dt);
      p.vx *= k; p.vy *= k; p.vz *= k;
      p.obj.position.x += p.vx * dt; p.obj.position.y += p.vy * dt; p.obj.position.z += p.vz * dt;
      if (p.spin) { p.obj.rotation.x += p.spin[0] * dt; p.obj.rotation.y += p.spin[1] * dt; }
      if (p.grow) p.obj.scale.multiplyScalar(1 + p.grow * dt);
      const life = p.t / p.life;
      const op = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      if (p.obj.material) p.obj.material.opacity = p.twinkle ? op * (0.6 + 0.4 * Math.sin(p.t * 40)) : op;
    }
  }

  // ------------------------------------------------------------------
  // Efeitos de tela (camadas HTML sobre o canvas)
  // ------------------------------------------------------------------
  core.fadeOut = function (d, color) {
    world.fade.color = color || '#000';
    return core.tween(world.fade, { a: 1 }, d == null ? 0.6 : d, 'inOut');
  };
  core.fadeIn = function (d) { return core.tween(world.fade, { a: 0 }, d == null ? 0.6 : d, 'inOut'); };
  core.setFade = function (a, color) { world.fade.a = a; if (color) world.fade.color = color; };
  core.flash = function (color, d) {
    if (P2.skipping) return;
    world.flash.a = (P2.settings && P2.settings.reduceMotion) ? 0.35 : 0.95;
    world.flash.color = color || '#ffffff';
    world.flash.dur = d || 0.3;
  };
  core.shake = function (mag, d) {
    if (P2.skipping) return;
    if (P2.settings && P2.settings.reduceMotion) mag = Math.min(1, mag || 3);
    cam.shake.mag = mag == null ? 3 : mag;
    cam.shake.dur = d || 0.45;
    cam.shake.t = cam.shake.dur;
  };
  core.zoom = function (scale, d) {
    const fov = 38 / (scale || 1);
    return cam.shot(Object.assign({}, curShot(), { fov }), d == null ? 0.8 : d);
  };
  function curShot() { const c = cam.cur; return { target: [c.tx, c.ty, c.tz], yaw: c.yaw, pitch: c.pitch, dist: c.dist, fov: c.fov }; }
  core.tint = function (color, a) { world.tint.color = color || null; world.tint.a = color ? (a == null ? 0.3 : a) : 0; };
  core.letterbox = function (on, d) { return core.tween(world, { letterbox: on ? 1 : 0 }, d == null ? 0.5 : d); };
  core.rewind = function (d) {
    d = d || 2.4;
    if (P2.audio) P2.audio.sfx('rewind');
    world.rewind.on = true;
    world.rewind.t = 0;
    return core.wait(d).then(() => { world.rewind.on = false; });
  };
  core.resetCamera = function () { cam.reset(); };

  function applyOverlays() {
    const f = world.fade;
    dom.fade.style.opacity = f.a > 0.001 ? Math.min(1, f.a) : 0;
    dom.fade.style.background = f.color;
    dom.fade.style.display = f.a > 0.001 ? 'block' : 'none';
    dom.flash.style.opacity = world.flash.a;
    dom.flash.style.display = world.flash.a > 0.01 ? 'block' : 'none';
    if (world.flash.color) dom.flash.style.background = world.flash.color;
    const tt = world.tint;
    dom.tint.style.display = tt.color ? 'block' : 'none';
    if (tt.color) { dom.tint.style.background = tt.color; dom.tint.style.opacity = tt.a; }
    const lb = world.letterbox;
    dom.lbTop.style.height = dom.lbBot.style.height = (lb * 9) + '%';
    dom.rewind.style.display = world.rewind.on ? 'block' : 'none';
    if (renderer) renderer.domElement.style.filter = world.rewind.on ? 'hue-rotate(' + Math.round(world.rewind.t * 400) + 'deg) saturate(1.6) contrast(1.2)' : '';
  }

  // ------------------------------------------------------------------
  // Laço principal
  // ------------------------------------------------------------------
  let last = 0, running = false;
  const frameHooks = new Set();
  const nextFrame = [];
  core.onFrame = function (fn) { frameHooks.add(fn); return () => frameHooks.delete(fn); };
  core.onNextFrame = function (fn) { nextFrame.push(fn); };

  core.init = function (wrap) {
    container = wrap;
    THREE.ColorManagement && (THREE.ColorManagement.legacyMode = false);
    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !P2.lowQuality;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setPixelRatio(P2.lowQuality ? 0.5 : Math.min(window.devicePixelRatio || 1, P2.lowPower ? 1.5 : 2));
    const old = wrap.querySelector('canvas#stage');
    renderer.domElement.id = 'stage';
    renderer.domElement.setAttribute('aria-label', 'Cena do jogo em 3D. Arraste para olhar em volta.');
    if (old) old.replaceWith(renderer.domElement);
    else wrap.prepend(renderer.domElement);
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(38, 16 / 9, 0.05, 220);
    core.scene = scene;
    core.camera = camera;
    core.renderer = renderer;
    // camadas de efeito
    const mk = (cls) => { const d = document.createElement('div'); d.className = 'fx-layer ' + cls; wrap.appendChild(d); return d; };
    dom.vignette = mk('fx-vignette');
    dom.tint = mk('fx-tint');
    dom.flash = mk('fx-flash');
    dom.lbTop = mk('fx-lb fx-lb-top');
    dom.lbBot = mk('fx-lb fx-lb-bot');
    dom.rewind = mk('fx-rewind');
    dom.rewind.innerHTML = '<span>◀◀ REBOBINANDO</span>';
    dom.fade = mk('fx-fade');
    dom.camBtn = document.createElement('button');
    dom.camBtn.className = 'cam-btn';
    dom.camBtn.type = 'button';
    dom.camBtn.hidden = true;
    dom.camBtn.title = 'Voltar a câmera para a cena';
    dom.camBtn.textContent = '🎥 Centralizar';
    dom.camBtn.addEventListener('click', (e) => { e.stopPropagation(); cam.reset(); dom.camBtn.hidden = true; });
    wrap.appendChild(dom.camBtn);
    hs.layer = document.createElement('div');
    hs.layer.className = 'hs-layer';
    wrap.appendChild(hs.layer);
    // joystick (celular)
    dom.joy = document.createElement('div');
    dom.joy.className = 'joy';
    dom.joy.hidden = true;
    dom.joy.innerHTML = '<div class="joy-knob"></div>';
    wrap.appendChild(dom.joy);
    (function () {
      const knob = dom.joy.firstChild;
      let id = null, cx = 0, cy = 0;
      const R = 46;
      const move = (e) => {
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const d = Math.hypot(dx, dy), k = d > R ? R / d : 1;
        knob.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
        player.joy.x = (dx * k) / R; player.joy.y = (dy * k) / R; player.joy.on = true;
      };
      dom.joy.addEventListener('pointerdown', (e) => {
        e.stopPropagation(); e.preventDefault();
        id = e.pointerId;
        const r = dom.joy.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        try { dom.joy.setPointerCapture(id); } catch (_) { /* nada */ }
        move(e);
      });
      dom.joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.stopPropagation(); move(e); } });
      const up = (e) => { if (e.pointerId !== id) return; id = null; player.joy.on = false; player.joy.x = player.joy.y = 0; knob.style.transform = ''; };
      dom.joy.addEventListener('pointerup', up);
      dom.joy.addEventListener('pointercancel', up);
      dom.joy.addEventListener('click', (e) => e.stopPropagation());
    })();
    dom.hint = document.createElement('div');
    dom.hint.className = 'drag-hint gone'; // aparece quando ele pode andar (setMove)
    dom.hint.innerHTML = '<span>↔</span> arraste para olhar em volta';
    wrap.appendChild(dom.hint);
    setupInput(renderer.domElement);
    const resize = () => {
      const w = Math.max(10, wrap.clientWidth), h = Math.max(10, wrap.clientHeight);
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // setSize limpa o quadro: desenha de novo na hora para não piscar preto (ex.: ao fechar um minijogo no celular)
      try { if (scene && camera) renderer.render(scene, camera); } catch (e) { /* o próximo quadro desenha */ }
    };
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
    window.addEventListener('resize', resize);
    core.resize = resize;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  };
  core.showHint = function (on, secs) {
    if (!dom.hint) return;
    dom.hint.classList.toggle('gone', !on);
    clearTimeout(core._hintT);
    if (on) core._hintT = setTimeout(() => dom.hint.classList.add('gone'), (secs || 7) * 1000);
  };

  function update(dt) {
    P2.time += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= P2.time) timers.splice(i, 1)[0].res();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      Object.keys(tw.to).forEach((p) => { tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e; });
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    world.actors.forEach((a) => a.update(dt));
    if (world.env && world.env.update) { try { world.env.update(P2.time, world.params, dt); } catch (e) { if (!world.env._warned) { world.env._warned = true; console.warn(e); } } }
    updateParticles(dt);
    updateEmotes(dt);
    if (world.flash.a > 0) world.flash.a = Math.max(0, world.flash.a - dt / (world.flash.dur || 0.3));
    if (world.rewind.on) world.rewind.t += dt;
  }
  // Qualidade adaptativa: se a máquina não aguenta, baixa a resolução aos poucos (nunca sobe de novo,
  // para não ficar oscilando). Só mexe no pixel ratio, que é seguro em tempo real.
  const perf = { acc: 0, frames: 0, low: 0, steps: [1.5, 1, 0.75, 0.6] };
  function adaptQuality(raw) {
    if (P2.lowQuality || document.hidden || !renderer) return;
    if (raw > 0.5) return; // aba voltou do segundo plano, carregamento etc.
    perf.acc += raw; perf.frames++;
    if (perf.acc < 2.5) return;
    const fps = perf.frames / perf.acc;
    perf.acc = 0; perf.frames = 0;
    // duas janelas seguidas abaixo de 26 fps (a primeira pode ser só compilação de shaders)
    if (fps >= 26) { perf.low = 0; return; }
    if (++perf.low < 2) return;
    perf.low = 0;
    const cur = renderer.getPixelRatio();
    const next = perf.steps.find((v) => v < cur - 0.01);
    if (next == null) return;
    renderer.setPixelRatio(next);
    if (core.resize) core.resize();
  }
  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    adaptQuality(dt);
    // no modo de teste (q=low) o tempo segue o relógio mesmo com poucos quadros por segundo
    if (dt > (P2.lowQuality ? 0.5 : 0.1)) dt = P2.lowQuality ? 0.5 : 0.1;
    P2.realTime += dt;
    if (!P2.paused) {
      // passos de no máximo 0,1 s (colisões e animações estáveis mesmo quando o quadro demora)
      const n = Math.max(1, Math.ceil(dt / 0.1 - 1e-6));
      for (let k = 0; k < n; k++) update(dt / n);
    }
    nextFrame.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    try {
      updateCamera(P2.paused ? 0 : dt);
      updateHotspots();
      applyOverlays();
      if (renderer && scene && camera) renderer.render(scene, camera);
    } catch (e) { console.error(e); }
    frameHooks.forEach((fn) => { try { fn(dt); } catch (e) { console.error(e); } });
    requestAnimationFrame(loop);
  }
})();

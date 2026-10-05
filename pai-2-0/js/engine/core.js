/* PAI 2.0 — core.js
 * O "palco": laço de animação, cenário, atores, partículas, balões de
 * emoção, câmera e efeitos de tela (fade, flash, tremor, tinta, rebobinar).
 * Tudo que espera tempo (wait, tween, walk) respeita a pausa do menu e o
 * modo "pular cena" (que resolve tudo instantaneamente).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const W = P2.W, H = P2.H;
  const gfx = P2.gfx;
  P2.sprites = P2.sprites || {};
  P2.bgs = P2.bgs || {};

  const core = (P2.core = {});
  P2.time = 0;          // tempo do mundo (pausa com o menu)
  P2.realTime = 0;      // tempo real desde o início
  P2.paused = false;
  P2.skipping = false;

  // ------------------------------------------------------------------
  // Cancelamento: quando o jogador sai de um capítulo no meio, todas as
  // promessas pendentes são rejeitadas com P2.ABORT.
  // ------------------------------------------------------------------
  P2.ABORT = { abort: true, toString: () => 'P2.ABORT' };
  P2.runToken = 0;
  const pending = new Set(); // {reject}
  core.track = function (promiseFactory) {
    let entry;
    const p = new Promise((resolve, reject) => {
      entry = { reject };
      pending.add(entry);
      promiseFactory(
        (v) => { pending.delete(entry); resolve(v); },
        (e) => { pending.delete(entry); reject(e); }
      );
    });
    return p;
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
  // Mundo
  // ------------------------------------------------------------------
  const world = (core.world = {
    bg: null,
    params: {},
    actors: new Map(),
    particles: [],
    emotes: [],
    cam: { zoom: 1, cx: W / 2, cy: H / 2 },
    shake: { mag: 0, t: 0, dur: 0 },
    fade: { a: 0, color: '#000' },
    flash: { a: 0, color: '#fff', dur: 0.2 },
    tint: { color: null, a: 0 },
    rewind: { on: false, t: 0 },
    letterbox: 0,
  });

  core.bg = function () {
    return P2.bgs[world.bg] || null;
  };
  core.floorY = function () {
    const b = core.bg();
    return b && typeof b.floorY === 'number' ? b.floorY : 154;
  };
  /** Converte nome de ponto do cenário (ex.: 'mesa') em x. */
  core.spotX = function (v) {
    if (typeof v === 'number') return v;
    const b = core.bg();
    if (b && b.spots && typeof b.spots[v] === 'number') return b.spots[v];
    if (v === 'esquerda') return 70;
    if (v === 'direita') return 250;
    if (v === 'fora_esq') return -30;
    if (v === 'fora_dir') return W + 30;
    return W / 2;
  };
  core.setScene = function (id, params) {
    world.bg = id;
    world.params = Object.assign({}, params || {});
  };
  core.sceneParams = function (partial) {
    Object.assign(world.params, partial || {});
  };

  // ------------------------------------------------------------------
  // Timers e tweens
  // ------------------------------------------------------------------
  const timers = [];
  const tweens = [];
  core.wait = function (s) {
    if (P2.skipping || !(s > 0)) return Promise.resolve();
    return core.track((res) => timers.push({ at: P2.time + s, res }));
  };
  function flushTimers() {
    const list = timers.splice(0);
    list.forEach((t) => t.res());
  }
  /** Interpola propriedades numéricas de obj. Retorna Promise. */
  core.tween = function (obj, props, dur, ease) {
    ease = typeof ease === 'function' ? ease : gfx.ease[ease] || gfx.ease.inOut;
    if (P2.skipping || !(dur > 0)) {
      Object.assign(obj, props);
      return Promise.resolve();
    }
    // Cancela tweens anteriores nas mesmas propriedades do mesmo objeto
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (tw.obj !== obj) continue;
      Object.keys(props).forEach((k) => delete tw.to[k]);
    }
    const from = {};
    Object.keys(props).forEach((k) => (from[k] = obj[k] == null ? 0 : obj[k]));
    return core.track((res) => tweens.push({ obj, from, to: Object.assign({}, props), t: 0, dur, ease, res }));
  };
  function flushTweens() {
    const list = tweens.splice(0);
    list.forEach((tw) => { Object.assign(tw.obj, tw.to); tw.res(); });
  }
  core.setSkipping = function (on) {
    P2.skipping = !!on;
    if (on) {
      flushTimers();
      flushTweens();
      world.actors.forEach((a) => a._finishWalk());
    }
  };

  // ------------------------------------------------------------------
  // Atores
  // ------------------------------------------------------------------
  let blinkSeed = 1;
  class Actor {
    constructor(id, opts) {
      this.id = id;
      this.x = W / 2;
      this.y = core.floorY();
      this.dir = 1;
      this.anim = 'idle';
      this.baseAnim = 'idle';
      this.animT = 0;
      this.expr = 'neutro';
      this.talking = false;
      this.blink = false;
      this.moving = false;
      this.walkT = 0;
      this.color = null;
      this.skin = 'medio';
      this.variant = null;
      this.props = {};
      this.scale = 1;
      this.alpha = 1;
      this.visible = true;
      this.z = 0;
      this.jy = 0;
      this.t = 0;
      this._walk = null;
      this._follow = null;
      this._playTimer = null;
      this._blinkNext = 1.5 + ((blinkSeed++ * 1.37) % 3);
      this._blinkEnd = 0;
      if (opts) this.set(opts);
    }
    get sprite() {
      return P2.sprites[this.id] || P2.sprites[this.spriteId] || null;
    }
    set(o) {
      o = o || {};
      if (o.x != null) this.x = core.spotX(o.x);
      if (o.y != null) this.y = o.y;
      if (o.dir != null) this.face(o.dir);
      if (o.anim) this.setAnim(o.anim);
      ['expr', 'color', 'skin', 'variant', 'scale', 'alpha', 'visible', 'z', 'spriteId'].forEach((k) => {
        if (o[k] !== undefined) this[k] = o[k];
      });
      if (o.props) this.props = Object.assign({}, this.props, o.props);
      return this;
    }
    at(x, y) {
      this.x = core.spotX(x);
      if (y != null) this.y = y;
      else this.y = core.floorY();
      return this;
    }
    face(d) {
      if (d === 'left' || d === 'esquerda') this.dir = -1;
      else if (d === 'right' || d === 'direita') this.dir = 1;
      else if (d && typeof d === 'object' && typeof d.x === 'number') this.dir = d.x < this.x ? -1 : 1;
      else if (typeof d === 'number') this.dir = d < 0 ? -1 : 1;
      return this;
    }
    setAnim(name) {
      if (this._playTimer) { this._playTimer = null; }
      this.baseAnim = name;
      if (this.anim !== name) { this.anim = name; this.animT = 0; }
      return this;
    }
    // Atalhos legíveis
    exprSet(e) { this.expr = e; return this; }
    show() { this.visible = true; return this; }
    hide() { this.visible = false; return this; }
    remove() { world.actors.delete(this.id); return this; }

    /** Anda até x (número ou nome de ponto). */
    walk(x, speed) {
      const tx = core.spotX(x);
      speed = speed || (this.id === 'faisca' ? 55 : 45);
      if (P2.skipping || Math.abs(tx - this.x) < 0.5) {
        this.x = tx;
        return Promise.resolve();
      }
      this._finishWalk();
      this.dir = tx < this.x ? -1 : 1;
      return core.track((res) => {
        this._walk = { tx, speed, res };
        this.moving = true;
        if (this.anim !== 'walk') { this.anim = 'walk'; this.animT = 0; }
      });
    }
    _finishWalk() {
      if (!this._walk) return;
      const w = this._walk;
      this._walk = null;
      this.x = w.tx;
      this.moving = false;
      this.anim = this.baseAnim;
      this.animT = 0;
      w.res();
    }
    /** Pulo simples (deslocamento vertical). */
    jump(h, dur) {
      h = h || 10;
      dur = dur || 0.45;
      if (P2.skipping) return Promise.resolve();
      const self = this;
      const obj = { k: 0 };
      if (P2.audio) P2.audio.sfx('jump');
      return new Promise((res) => {
        const start = P2.time;
        const step = () => {
          const k = Math.min(1, (P2.time - start) / dur);
          self.jy = Math.sin(k * Math.PI) * h;
          if (k >= 1 || P2.skipping) { self.jy = 0; res(); return; }
          core.onNextFrame(step);
        };
        core.onNextFrame(step);
        void obj;
      });
    }
    /** Toca uma animação temporária e volta para a animação base. */
    play(name, secs) {
      secs = secs == null ? 1.2 : secs;
      this.anim = name;
      this.animT = 0;
      const token = {};
      this._playTimer = token;
      return core.wait(secs).then(() => {
        if (this._playTimer === token) {
          this._playTimer = null;
          this.anim = this.moving ? 'walk' : this.baseAnim;
          this.animT = 0;
        }
      });
    }
    emote(type, secs) {
      if (P2.skipping) return this;
      world.emotes = world.emotes.filter((e) => e.actor !== this);
      world.emotes.push({ actor: this, type, t: 0, dur: secs || 1.6 });
      return this;
    }
    follow(target, gap) {
      this._follow = target ? { target, gap: gap == null ? 22 : gap } : null;
      return this;
    }
    unfollow() { this._follow = null; return this; }
    tween(props, secs, ease) {
      const p = Object.assign({}, props);
      if (p.x != null) p.x = core.spotX(p.x);
      return core.tween(this, p, secs, ease);
    }
    fadeIn(d) { this.visible = true; this.alpha = 0; return core.tween(this, { alpha: 1 }, d || 0.5); }
    fadeOut(d) { return core.tween(this, { alpha: 0 }, d || 0.5).then(() => { this.visible = false; this.alpha = 1; }); }

    update(dt) {
      this.t = P2.time;
      this.animT += dt;
      // Piscar
      if (this.t >= this._blinkNext) {
        this._blinkEnd = this.t + 0.13;
        this._blinkNext = this.t + 2.2 + ((this.t * 7.13 + blinkSeed) % 3.2);
      }
      this.blink = this.t < this._blinkEnd;
      // Andar
      if (this._walk) {
        const w = this._walk;
        const d = w.tx - this.x;
        const stepX = w.speed * dt;
        this.walkT += dt;
        if (Math.abs(d) <= stepX) this._finishWalk();
        else this.x += Math.sign(d) * stepX;
      } else if (this._follow) {
        const f = this._follow;
        const tgt = f.target;
        if (!world.actors.has(tgt.id) || !tgt.visible) { /* parado */ } else {
          const desired = tgt.x - tgt.dir * f.gap;
          const d = desired - this.x;
          const speed = Math.max(55, tgt._walk ? tgt._walk.speed + 12 : 55);
          if (Math.abs(d) > 7 || (this.moving && Math.abs(d) > 1)) {
            this.moving = true;
            this.walkT += dt;
            this.dir = d < 0 ? -1 : 1;
            const s = Math.min(Math.abs(d), speed * dt);
            this.x += Math.sign(d) * s;
            if (this.baseAnim === 'idle' && this.anim !== 'walk' && !this._playTimer) { this.anim = 'walk'; this.animT = 0; }
          } else if (this.moving) {
            this.moving = false;
            this.dir = tgt.dir;
            if (this.anim === 'walk') { this.anim = this.baseAnim; this.animT = 0; }
          }
          this.y = tgt.y;
        }
      }
    }
    draw(ctx) {
      if (!this.visible || this.alpha <= 0) return;
      const spr = this.sprite;
      ctx.save();
      if (this.alpha < 1) ctx.globalAlpha = Math.max(0, this.alpha);
      const ox = this.x, oy = this.y;
      if (this.scale !== 1) {
        ctx.translate(Math.round(ox), Math.round(oy));
        ctx.scale(this.scale, this.scale);
        ctx.translate(-Math.round(ox), -Math.round(oy));
      }
      this.y = oy - this.jy;
      try {
        if (spr) spr.draw(ctx, this);
        else drawPlaceholder(ctx, this);
      } catch (e) {
        drawPlaceholder(ctx, this);
        if (!this._warned) { this._warned = true; console.warn('Erro ao desenhar', this.id, e); }
      }
      this.y = oy;
      ctx.restore();
    }
    get height() {
      const spr = this.sprite;
      return (spr && spr.height) || 44;
    }
  }
  // Compatibilidade: actor.expr('feliz') como método e como campo.
  // O campo "expr" é string; usamos setExpr como método.
  Actor.prototype.setExpr = function (e) { this.expr = e; return this; };
  core.Actor = Actor;

  function drawPlaceholder(ctx, a) {
    const h = a.id === 'faisca' ? 18 : a.id === 'duvida' ? 70 : 44;
    const w = a.id === 'duvida' ? 90 : a.id === 'faisca' ? 16 : 18;
    const colors = { pai: '#4a7bd1', filho: '#3fbf8f', faisca: '#f26b3a', chefe: '#8f8a99', jorge: '#e0a030', golpista: '#2a1a3a', duvida: '#7a4ac0' };
    gfx.rect(ctx, a.x - w / 2, a.y - h, w, h, colors[a.id] || '#888');
    gfx.strokeRect(ctx, a.x - w / 2, a.y - h, w, h, '#1a1830');
    gfx.text(ctx, String(a.id).slice(0, 3), a.x, a.y - h + 3, '#fff', { align: 'center' });
  }

  core.actor = function (id, opts) {
    let a = world.actors.get(id);
    if (!a) {
      a = new Actor(id);
      world.actors.set(id, a);
      if (core.onActorCreated) core.onActorCreated(a);
    }
    if (opts) a.set(opts);
    return a;
  };
  core.getActor = (id) => world.actors.get(id) || null;
  core.clearActors = function () {
    world.actors.forEach((a) => a._finishWalk());
    world.actors.clear();
    world.emotes.length = 0;
  };

  // ------------------------------------------------------------------
  // Partículas
  // ------------------------------------------------------------------
  const CONF = ['#f26b3a', '#ffd27a', '#7ee0b8', '#6a9bd8', '#ff7a9a', '#b48ae8', '#ffe066'];
  const fx = (core.fx = {});
  fx.spawn = function (p) {
    if (P2.skipping) return;
    world.particles.push(Object.assign({ vx: 0, vy: 0, ay: 0, drag: 0, life: 1, t: 0, color: '#fff', size: 1, kind: 'sq' }, p));
    if (world.particles.length > 400) world.particles.splice(0, world.particles.length - 400);
  };
  let fxSeed = 7;
  function rnd() {
    fxSeed = (fxSeed * 16807) % 2147483647;
    return (fxSeed % 10000) / 10000;
  }
  fx.confetti = function (x, y, n) {
    n = n || 40;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (rnd() - 0.5) * 2.2;
      const sp = 50 + rnd() * 90;
      fx.spawn({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ay: 140, drag: 1.6, life: 1.4 + rnd() * 1.2, color: CONF[i % CONF.length], kind: 'confetti', size: 1 });
    }
    if (P2.audio) P2.audio.sfx('confetti');
  };
  fx.sparkles = function (x, y, n, color) {
    n = n || 12;
    for (let i = 0; i < n; i++) {
      const ang = rnd() * Math.PI * 2;
      const sp = 15 + rnd() * 40;
      fx.spawn({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 10, ay: 10, drag: 2, life: 0.6 + rnd() * 0.6, color: color || (i % 2 ? '#ffd27a' : '#ffffff'), kind: 'star' });
    }
  };
  fx.hearts = function (x, y, n) {
    n = n || 5;
    for (let i = 0; i < n; i++) {
      fx.spawn({ x: x + (rnd() - 0.5) * 16, y, vx: (rnd() - 0.5) * 12, vy: -18 - rnd() * 16, life: 1.2 + rnd() * 0.6, color: '#ff7a9a', kind: 'heart' });
    }
  };
  fx.burst = function (x, y, color, n) {
    n = n || 16;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const sp = 40 + rnd() * 30;
      fx.spawn({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, drag: 3, life: 0.5 + rnd() * 0.3, color: color || '#fff', kind: 'sq', size: rnd() > 0.6 ? 2 : 1 });
    }
  };
  fx.float = function (x, y, text, color) {
    fx.spawn({ x, y, vy: -14, drag: 0.6, life: 1.6, color: color || '#ffe066', kind: 'text', text: String(text) });
  };
  fx.smoke = function (x, y, n, color) {
    n = n || 8;
    for (let i = 0; i < n; i++) {
      fx.spawn({ x: x + (rnd() - 0.5) * 10, y: y + (rnd() - 0.5) * 4, vx: (rnd() - 0.5) * 20, vy: -8 - rnd() * 10, drag: 1, life: 0.8 + rnd() * 0.6, color: color || '#c9c3b6', kind: 'puff', size: 2 + Math.floor(rnd() * 2) });
    }
  };
  function updateParticles(dt) {
    const ps = world.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.t += dt;
      if (p.t >= p.life) { ps.splice(i, 1); continue; }
      p.vy += p.ay * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  const HEART = ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'];
  function drawParticles(ctx) {
    world.particles.forEach((p) => {
      const k = 1 - p.t / p.life;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === 'confetti') {
        const flip = Math.floor(p.t * 10 + p.x) % 2;
        gfx.rect(ctx, x, y, flip ? 2 : 1, flip ? 1 : 2, p.color);
      } else if (p.kind === 'star') {
        if (k < 0.25 && Math.floor(p.t * 20) % 2) return;
        gfx.px(ctx, x, y, p.color);
        if (k > 0.5) { gfx.px(ctx, x - 1, y, p.color); gfx.px(ctx, x + 1, y, p.color); gfx.px(ctx, x, y - 1, p.color); gfx.px(ctx, x, y + 1, p.color); }
      } else if (p.kind === 'heart') {
        ctx.globalAlpha = Math.min(1, k * 2);
        gfx.drawMap(ctx, HEART, x - 2, y - 2, { x: p.color }, false);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'text') {
        ctx.globalAlpha = Math.min(1, k * 2.5);
        gfx.text(ctx, p.text, x, y, p.color, { align: 'center', shadow: '#1a1830' });
        ctx.globalAlpha = 1;
      } else if (p.kind === 'puff') {
        ctx.globalAlpha = k * 0.7;
        gfx.rect(ctx, x, y, p.size, p.size, p.color);
        ctx.globalAlpha = 1;
      } else {
        gfx.rect(ctx, x, y, p.size, p.size, p.color);
      }
    });
  }

  // ------------------------------------------------------------------
  // Balões de emoção
  // ------------------------------------------------------------------
  const EMO = {
    '!': { c: '#e94b5a', m: ['..x..', '..x..', '..x..', '.....', '..x..'] },
    '?': { c: '#4166a8', m: ['.xxx.', '...x.', '..x..', '.....', '..x..'] },
    '...': { c: '#5b5768', m: ['.....', '.....', '.....', '.....', 'x.x.x'] },
    heart: { c: '#ff7a9a', m: ['.x.x.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'] },
    sweat: { c: '#6a9bd8', m: ['..x..', '.xx..', 'xxxx.', 'xxxx.', '.xx..'] },
    angry: { c: '#e94b5a', m: ['x.x.x', '.x.x.', '.....', '.x.x.', 'x.x.x'] },
    idea: { c: '#f2a53a', m: ['.xxx.', 'xxxxx', 'xxxxx', '.xxx.', '..x..'] },
    zzz: { c: '#4166a8', m: ['xxxx.', '..x..', '.x...', 'xxxx.', '.....'] },
    note: { c: '#3fbf8f', m: ['..xxx', '..x.x', '..x..', 'xxx..', 'xx...'] },
    star: { c: '#f2a53a', m: ['..x..', 'xxxxx', '.xxx.', '.x.x.', 'x...x'] },
    check: { c: '#1f7a5e', m: ['....x', '...xx', 'x.xx.', 'xxx..', '.x...'] },
    x: { c: '#e94b5a', m: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'] },
  };
  function drawEmotes(ctx, dt) {
    for (let i = world.emotes.length - 1; i >= 0; i--) {
      const e = world.emotes[i];
      e.t += dt;
      if (e.t >= e.dur || !world.actors.has(e.actor.id)) { world.emotes.splice(i, 1); continue; }
      const a = e.actor;
      if (!a.visible) continue;
      const def = EMO[e.type] || EMO['!'];
      const pop = e.t < 0.18 ? gfx.ease.back(e.t / 0.18) : 1;
      const fade = e.t > e.dur - 0.2 ? (e.dur - e.t) / 0.2 : 1;
      const hx = Math.round(a.x + a.dir * 4);
      const hy = Math.round(a.y - a.jy - a.height * a.scale - 6 - Math.sin(e.t * 4) * 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      const bw = 11, bh = Math.max(3, Math.round(10 * pop));
      const bx = hx - 5, by = hy - bh;
      gfx.roundRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, '#1a1830', 1);
      gfx.roundRect(ctx, bx, by, bw, bh, '#f4f1e8', 1);
      gfx.px(ctx, hx - 1, hy + 1, '#1a1830');
      gfx.px(ctx, hx, hy + 1, '#1a1830');
      gfx.px(ctx, hx - 1, hy, '#f4f1e8');
      gfx.px(ctx, hx, hy, '#f4f1e8');
      gfx.px(ctx, hx - 1, hy + 2, '#1a1830');
      if (pop > 0.8) gfx.drawMap(ctx, def.m, bx + 3, by + 2, { x: def.c }, false);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------
  // Efeitos de tela
  // ------------------------------------------------------------------
  core.fadeOut = function (d, color) {
    world.fade.color = color || '#000';
    return core.tween(world.fade, { a: 1 }, d == null ? 0.6 : d, 'inOut');
  };
  core.fadeIn = function (d) {
    return core.tween(world.fade, { a: 0 }, d == null ? 0.6 : d, 'inOut');
  };
  core.setFade = function (a, color) {
    world.fade.a = a;
    if (color) world.fade.color = color;
  };
  core.flash = function (color, d) {
    if (P2.skipping) return;
    if (P2.settings && P2.settings.reduceMotion) { world.flash.a = 0.35; } else world.flash.a = 1;
    world.flash.color = color || '#ffffff';
    world.flash.dur = d || 0.25;
  };
  core.shake = function (mag, d) {
    if (P2.skipping) return;
    if (P2.settings && P2.settings.reduceMotion) mag = Math.min(1, mag || 3);
    world.shake.mag = mag == null ? 3 : mag;
    world.shake.dur = d || 0.4;
    world.shake.t = world.shake.dur;
  };
  core.zoom = function (scale, cx, cy, d) {
    const c = world.cam;
    return core.tween(c, { zoom: scale || 1, cx: cx == null ? W / 2 : cx, cy: cy == null ? H / 2 : cy }, d == null ? 0.8 : d, 'inOut');
  };
  core.resetCamera = function () {
    world.cam.zoom = 1; world.cam.cx = W / 2; world.cam.cy = H / 2;
  };
  core.tint = function (color, a) {
    world.tint.color = color || null;
    world.tint.a = color ? (a == null ? 0.3 : a) : 0;
  };
  core.letterbox = function (on, d) {
    return core.tween(world, { letterbox: on ? 1 : 0 }, d == null ? 0.5 : d);
  };
  core.rewind = function (d) {
    d = d || 2.2;
    if (P2.audio) P2.audio.sfx('rewind');
    world.rewind.on = true;
    world.rewind.t = 0;
    return core.wait(d).then(() => { world.rewind.on = false; });
  };

  // ------------------------------------------------------------------
  // Laço principal
  // ------------------------------------------------------------------
  let canvas = null, ctx = null, last = 0, running = false;
  const frameHooks = new Set();
  const nextFrame = [];
  core.onFrame = function (fn) { frameHooks.add(fn); return () => frameHooks.delete(fn); };
  core.onNextFrame = function (fn) { nextFrame.push(fn); };

  core.init = function (cnv) {
    canvas = cnv;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    core.canvas = canvas;
    core.ctx = ctx;
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  };

  function update(dt) {
    P2.time += dt;
    // timers
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= P2.time) { const t = timers.splice(i, 1)[0]; t.res(); }
    }
    // tweens
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = tw.ease(k);
      Object.keys(tw.to).forEach((p) => { tw.obj[p] = tw.from[p] + (tw.to[p] - tw.from[p]) * e; });
      if (k >= 1) { tweens.splice(i, 1); tw.res(); }
    }
    world.actors.forEach((a) => a.update(dt));
    updateParticles(dt);
    if (world.shake.t > 0) world.shake.t -= dt;
    if (world.flash.a > 0) world.flash.a = Math.max(0, world.flash.a - dt / world.flash.dur);
    if (world.rewind.on) world.rewind.t += dt;
  }

  function render(dt) {
    const c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.fillStyle = '#0d0b14';
    c.fillRect(0, 0, W, H);
    // câmera + tremor
    let sx = 0, sy = 0;
    if (world.shake.t > 0) {
      const m = world.shake.mag * (world.shake.t / world.shake.dur);
      sx = Math.round(Math.sin(P2.realTime * 71) * m);
      sy = Math.round(Math.cos(P2.realTime * 53) * m);
    }
    const cam = world.cam;
    const z = cam.zoom;
    c.setTransform(z, 0, 0, z, Math.round(W / 2 - cam.cx * z + sx), Math.round(H / 2 - cam.cy * z + sy));
    const bg = core.bg();
    const t = P2.time;
    if (bg) {
      try { bg.draw(c, t, world.params); } catch (e) { fallbackBg(c); if (!bg._warned) { bg._warned = true; console.warn('Erro no cenário', world.bg, e); } }
    } else if (world.bg) fallbackBg(c);
    // atores ordenados por y
    const list = Array.from(world.actors.values()).sort((a, b) => (a.y + a.z * 1000) - (b.y + b.z * 1000));
    list.forEach((a) => { if (a.z < 10) a.draw(c); });
    if (bg && bg.front) {
      try { bg.front(c, t, world.params); } catch (e) { /* ignora */ }
    }
    // atores marcados para ficar na frente do cenário (z >= 10)
    list.forEach((a) => { if (a.z >= 10) a.draw(c); });
    drawParticles(c);
    drawEmotes(c, dt);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // efeitos de tela
    if (world.rewind.on) drawRewind(c);
    if (world.tint.color && world.tint.a > 0) {
      c.globalAlpha = world.tint.a;
      c.fillStyle = world.tint.color;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }
    if (world.letterbox > 0) {
      const h = Math.round(16 * world.letterbox);
      c.fillStyle = '#0d0b14';
      c.fillRect(0, 0, W, h);
      c.fillRect(0, H - h, W, h);
    }
    if (world.flash.a > 0) {
      c.globalAlpha = Math.min(1, world.flash.a);
      c.fillStyle = world.flash.color;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }
    if (world.fade.a > 0) {
      c.globalAlpha = Math.min(1, world.fade.a);
      c.fillStyle = world.fade.color;
      c.fillRect(0, 0, W, H);
      c.globalAlpha = 1;
    }
  }

  function fallbackBg(c) {
    gfx.bands(c, 0, 0, W, H, ['#24305e', '#2f4580', '#4166a8', '#3a3646']);
    gfx.rect(c, 0, 156, W, 24, '#3a3646');
  }

  function drawRewind(c) {
    const t = world.rewind.t;
    // faixas deslocadas (efeito VHS)
    for (let i = 0; i < 9; i++) {
      const y = Math.floor(((i * 23 + t * 140) % H));
      const h = 3 + (i % 3) * 2;
      const off = Math.round(Math.sin(t * 30 + i) * 6);
      try { c.drawImage(canvas, 0, y, W, h, off, y, W, h); } catch (e) { /* nada */ }
    }
    c.globalAlpha = 0.18;
    c.fillStyle = '#a8d0f0';
    for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1);
    c.globalAlpha = 0.25;
    c.fillStyle = '#6a3fa8';
    c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
    if (Math.floor(t * 3) % 2 === 0) {
      gfx.text(c, '<< REBOBINANDO', 10, 10, '#f4f1e8', { scale: 2, shadow: '#1a1830' });
    }
  }

  function loop(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    P2.realTime += dt;
    if (!P2.paused) update(dt);
    const fns = nextFrame.splice(0);
    fns.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    try { render(P2.paused ? 0 : dt); } catch (e) { console.error(e); }
    frameHooks.forEach((fn) => { try { fn(dt); } catch (e) { console.error(e); } });
    requestAnimationFrame(loop);
  }

  /** Desenha um ator (ou estado avulso) num canvas pequeno, para o retrato do diálogo. */
  const portraitDummies = {};
  const PORTRAIT_ANIMS = new Set(['idle', 'think', 'facepalm', 'cheer', 'phone', 'lookphone', 'coffee', 'point', 'shrug',
    'wave', 'talk', 'arms', 'laugh', 'showphone', 'clap', 'doubt', 'sad', 'ashamed', 'scared', 'teach', 'listen', 'small',
    'hurt', 'heal', 'attack', 'defeated', 'lurk']);
  core.drawPortrait = function (pctx, size, id, state) {
    const spr = P2.sprites[id];
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, size, size);
    let a = world.actors.get(id);
    if (!a) {
      if (!portraitDummies[id]) {
        portraitDummies[id] = new Actor(id);
        if (core.onActorCreated) core.onActorCreated(portraitDummies[id]);
      }
      a = portraitDummies[id];
      if (core.onActorCreated) core.onActorCreated(a);
      a.t = P2.time;
      a.update(0);
    }
    const pr = (spr && spr.portrait) || { y: -34, size: 24 };
    const crop = pr.size || 24;
    const k = size / crop;
    // salva campos temporários
    const save = { x: a.x, y: a.y, dir: a.dir, talking: a.talking, expr: a.expr, scale: a.scale, alpha: a.alpha, jy: a.jy, visible: a.visible, anim: a.anim };
    a.x = 0; a.y = 0; a.jy = 0; a.scale = 1; a.alpha = 1; a.visible = true;
    if (state) Object.assign(a, state);
    if (!PORTRAIT_ANIMS.has(a.anim)) a.anim = 'idle';
    pctx.imageSmoothingEnabled = false;
    pctx.setTransform(k, 0, 0, k, Math.round(size / 2), Math.round(size / 2 - pr.y * k));
    try {
      if (spr) spr.draw(pctx, a);
      else drawPlaceholder(pctx, a);
    } catch (e) { /* ignora */ }
    Object.assign(a, save);
    pctx.setTransform(1, 0, 0, 1, 0, 0);
  };
})();

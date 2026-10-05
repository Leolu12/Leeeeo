/* PAI 2.0 — director.js
 * O "diretor": registra capítulos, roda as partes com checkpoint, e monta
 * o objeto G (a API que os capítulos usam para contar a história).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const core = P2.core;
  const ui = P2.ui;

  P2.chapters = P2.chapters || {};
  P2.CHAPTER_ORDER = ['prologo', 'cap1', 'cap2', 'cap3', 'cap4', 'cap5', 'cap6', 'cap7', 'cap8', 'cap9', 'cap10', 'cap11', 'epilogo'];
  P2.chapter = function (def) {
    if (!def || !def.id) return;
    P2.chapters[def.id] = def;
  };

  const D = (P2.director = {});
  let cutsceneDepth = 0;
  let running = null;
  D.inCutscene = () => cutsceneDepth > 0;
  D.running = () => running;

  // ------------------------------------------------------------------
  // Perfil, profissão e tokens de texto
  // ------------------------------------------------------------------
  const DEFAULT_PROFILE = { pai: 'Carlos', apelido: 'Pai', filho: 'Lucas', genero: 'filho', skin: 'medio', empresa: '', setor: '', recado: '' };
  function cap1st(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  D.profile = function () {
    const p = (P2.save && P2.save.data.profile) || {};
    return Object.assign({}, DEFAULT_PROFILE, p, {
      pai: cap1st(p.pai) || DEFAULT_PROFILE.pai,
      apelido: cap1st(p.apelido) || 'Pai',
      filho: cap1st(p.filho) || (p.genero === 'filha' ? 'Júlia' : DEFAULT_PROFILE.filho),
      empresa: String(p.empresa || '').trim(),
      setor: String(p.setor || '').trim(),
    });
  };
  /** Dados do mundo do CEO (P2.CEO em content/ceo.js). Mantém o nome "prof" por compatibilidade. */
  D.prof = function () {
    return P2.CEO || { id: 'ceo', label: 'CEO', local: 'escritório', noLocal: 'no escritório', doLocal: 'do escritório', chefe: { nome: 'Dona Marta', titulo: 'presidente do conselho', ele: 'ela', artigo: 'a' }, jorge: { papel: 'diretor comercial' } };
  };
  D.tokens = function () {
    const pr = D.profile();
    const P = D.prof();
    const fem = pr.genero === 'filha';
    const ch = P.chefe || {};
    return {
      pai: pr.pai,
      apelido: pr.apelido,
      filho: pr.filho,
      empresa: pr.empresa || 'a empresa',
      Empresa: pr.empresa || 'A empresa',
      empresaNome: pr.empresa || 'Sua Empresa',
      setor: pr.setor || 'o seu ramo',
      setorPrompt: pr.setor || '[ramo da empresa]',
      empresaPrompt: pr.empresa || '[nome da empresa]',
      prof: P.label,
      local: P.local,
      noLocal: P.noLocal,
      doLocal: P.doLocal,
      chefe: ch.nome,
      chefeTitulo: ch.titulo,
      chefeEle: ch.ele || 'ela',
      chefeO: ch.artigo || 'a',
      jorgePapel: (P.jorge && P.jorge.papel) || 'diretor comercial',
      filhoa: fem ? 'filha' : 'filho',
      Filhoa: fem ? 'Filha' : 'Filho',
      oa: fem ? 'a' : 'o',
      OA: fem ? 'A' : 'O',
      seusua: fem ? 'sua' : 'seu',
      Seusua: fem ? 'Sua' : 'Seu',
      eleela: fem ? 'ela' : 'ele',
      Eleela: fem ? 'Ela' : 'Ele',
      deledela: fem ? 'dela' : 'dele',
      doda: fem ? 'da' : 'do',
      aoa: fem ? 'à' : 'ao',
      numnuma: fem ? 'numa' : 'num',
      umuma: fem ? 'uma' : 'um',
    };
  };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /** Substitui {tokens}. html=true escapa os valores (para cartões com HTML). */
  D.t = function (str, html) {
    if (str == null) return '';
    const tk = D.tokens();
    return String(str).replace(/\{(\w+)\}/g, (m, k) => (tk[k] != null ? (html ? esc(tk[k]) : tk[k]) : m));
  };

  // Opções de montagem dos personagens conforme o perfil (tom de pele, filho/filha)
  core.defaultBuild = function (id) {
    const pr = D.profile();
    if (id === 'pai') return { skin: pr.skin || 'medio' };
    if (id === 'filho') return { skin: pr.skin || 'medio', genero: pr.genero };
    const d = D.diretor(id);
    if (d) return { seed: d.seed, female: d.female };
    return {};
  };
  /** Diretores da empresa (figurantes com nome): bia, rafael, luana, tadeu. */
  D.diretor = function (id) {
    const list = (P2.CEO && P2.CEO.diretores) || [];
    return list.find((d) => d.id === id) || null;
  };
  ((P2.CEO && P2.CEO.diretores) || []).forEach((d) => core.registerActorType(d.id, 'npc'));
  core.onActorCreated = function () {};

  // ------------------------------------------------------------------
  // Falantes
  // ------------------------------------------------------------------
  D.speaker = function (who, opts) {
    opts = opts || {};
    if (who && typeof who === 'object') {
      return { id: who.actor || null, name: D.t(who.name || ''), color: who.color || '#5b5768', voice: who.voice || 'narrador', portrait: who.portrait || null, expr: opts.expr || who.expr, style: who.style || 'say' };
    }
    const pr = D.profile();
    const P = D.prof();
    const base = {
      pai: { name: pr.pai, color: P.cor || '#4a7bd1', voice: 'pai', portrait: 'pai' },
      filho: { name: pr.filho, color: '#2a9d78', voice: 'filho', portrait: 'filho' },
      faisca: { name: 'Faísca', color: '#f26b3a', voice: 'faisca', portrait: 'faisca' },
      chefe: { name: (P.chefe && P.chefe.nome) || 'Chefe', color: '#5b5768', voice: 'chefe', portrait: 'chefe' },
      jorge: { name: 'Jorge', color: '#e0a030', voice: 'jorge', portrait: 'jorge' },
      golpista: { name: 'Desconhecido', color: '#a82a3e', voice: 'golpista', portrait: 'golpista' },
      duvida: { name: 'A Dúvida', color: '#7a4ac0', voice: 'duvida', portrait: 'duvida' },
    }[who];
    const dir = D.diretor(who);
    if (!base && dir) return { id: who, name: dir.nome, color: '#4a5a7a', voice: dir.female ? 'filho' : 'chefe', portrait: null, expr: opts.expr, style: 'say' };
    if (!base) return { id: null, name: '', color: null, voice: 'narrador', portrait: null, style: 'narrate' };
    return Object.assign({ id: who, expr: opts.expr, style: 'say' }, base);
  };

  // ------------------------------------------------------------------
  // Conquistas, estatísticas e flags
  // ------------------------------------------------------------------
  /** Selo de transparência da fonte: quem disse e com qual amostra. */
  const SELOS = { independente: ['🎓', 'Pesquisa independente'], governo: ['🏛️', 'Governo / regulador / Justiça'], imprensa: ['📰', 'Reportagem'], consultoria: ['📊', 'Consultoria (vende serviços de IA)'], fornecedor: ['🏷️', 'Empresa que vende IA'], empresa: ['🏢', 'A própria empresa contando'] };
  D.selo = function (f) {
    if (!f || (!f.selo && !f.amostra)) return null;
    const s = SELOS[f.selo];
    const row = ui.el('div', 'fact-seal');
    if (s) row.appendChild(ui.el('span', 'seal seal-' + f.selo, s[0] + ' ' + s[1]));
    if (f.amostra) row.appendChild(ui.el('span', 'seal-amostra', 'Base: ' + f.amostra));
    return row;
  };
  D.achieve = function (id) {
    const data = P2.save.data;
    if (data.achievements[id]) return false;
    const def = (P2.ACH_BY_ID && P2.ACH_BY_ID[id]) || { id, titulo: id, desc: '', icon: '🏆' };
    data.achievements[id] = Date.now();
    P2.save.write();
    ui.achToast(def);
    return true;
  };

  // ------------------------------------------------------------------
  // Construção do G
  // ------------------------------------------------------------------
  const ACTOR_IDS = ['pai', 'filho', 'faisca', 'chefe', 'jorge', 'golpista', 'duvida'];

  // Câmera automática de diálogo (plano e contraplano)
  const talkCam = (D.talkCam = { on: true, last: null });
  function autoFrame(actor) {
    if (!talkCam.on || !actor || P2.skipping || !actor.visible) return;
    if (core.player.mode === 'fp' && core.player.body()) {
      if (actor.id !== 'pai') core.player.lookAt(actor);
      return;
    }
    if (P2.realTime - core.cam.lastUserAt < 8) return; // respeita quem está olhando em volta
    if (talkCam.last === actor.id) return;
    const other = talkCam.last ? core.getActor(talkCam.last) : null;
    talkCam.last = actor.id;
    const kind = actor.ctl && actor.ctl.kind;
    if (kind === 'boss') { core.cam.focus(actor, 'geral', { dur: 0.9, pitch: 0.12 }).catch(() => {}); return; }
    const k = kind === 'floater' ? 'close' : 'medio';
    if (other && other !== actor && other.visible && Math.hypot(other.x - actor.x, other.z - actor.z) < 6) {
      const base = Math.atan2(other.x - actor.x, other.z - actor.z);
      core.cam.focus(actor, k, { yaw: base + 0.45, dur: 0.8 }).catch(() => {});
    } else {
      core.cam.focus(actor, k, { dur: 0.8 }).catch(() => {});
    }
  }
  D.autoFrame = autoFrame;

  function ensureVisible() {
    if (core.world.fade.a > 0.98 && !P2.skipping) return core.fadeIn(0.45);
    return Promise.resolve();
  }
  D.ensureVisible = ensureVisible;

  function makeG(def) {
    const tok = P2.runToken;
    const guard = () => { if (P2.runToken !== tok) throw P2.ABORT; };
    const data = P2.save.data;
    const G = {
      def,
      core,
      ui,
      get profile() { return D.profile(); },
      get P() { return D.prof(); },
      get isFilha() { return D.profile().genero === 'filha'; },
      get v() {
        const vars = data.progress.vars;
        return vars[def.id] || (vars[def.id] = {});
      },
      get skipping() { return P2.skipping; },
      t: (s) => D.t(s),
      th: (s) => D.t(s, true),

      // ---------------- Diálogo
      async say(who, text, opts) {
        guard();
        opts = opts || {};
        const sp = D.speaker(who, opts);
        const txt = D.t(text);
        const actorId = typeof who === 'string' ? who : who && who.actor;
        const actor = actorId ? core.getActor(actorId) : null;
        if (actor) {
          if (opts.expr) actor.expr = opts.expr;
          if (opts.anim) actor.setAnim(opts.anim);
          if (opts.emote) actor.emote(opts.emote);
        }
        ui.log(sp.name, txt, sp.color);
        if (P2.skipping) return;
        if (opts.cam !== false) autoFrame(actor);
        await ensureVisible();
        guard();
        await ui.dialog(sp, txt, { actor, auto: opts.auto });
        guard();
      },
      async narrate(text, opts) {
        return G.say('narrador', text, opts);
      },
      async think(who, text, opts) {
        guard();
        opts = opts || {};
        const sp = D.speaker(who, opts);
        sp.style = 'think';
        sp.name = sp.name ? sp.name + ' (pensando)' : '';
        const txt = D.t(text);
        ui.log(sp.name, txt, sp.color);
        if (P2.skipping) return;
        await ensureVisible();
        const actor = typeof who === 'string' ? core.getActor(who) : null;
        if (actor && opts.expr) actor.expr = opts.expr;
        await ui.dialog(sp, txt, { actor: null, auto: opts.auto });
        guard();
      },
      async choose(options, opts) {
        guard();
        opts = Object.assign({}, opts || {});
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        const mapped = options.map((o) => (typeof o === 'string' ? D.t(o) : Object.assign({}, o, { text: D.t(o.text), sub: o.sub ? D.t(o.sub) : o.sub })));
        if (opts.prompt) opts.prompt = D.t(opts.prompt);
        if (typeof opts.who === 'string') opts.who = D.speaker(opts.who);
        const v = await ui.choose(mapped, opts);
        guard();
        return v;
      },
      async aiChat(messages, opts) {
        guard();
        opts = Object.assign({}, opts || {});
        await ensureVisible();
        const fa = core.getActor('faisca');
        let prev = null;
        opts.onThinking = (on) => {
          if (!fa) return;
          if (on) { prev = fa.baseAnim; if (fa.baseAnim !== 'type') fa.anim = 'type'; fa.animT = 0; }
          else { fa.anim = prev || fa.baseAnim; fa.animT = 0; }
        };
        if (opts.title) opts.title = D.t(opts.title);
        const msgs = messages.map((m) => Object.assign({}, m, { text: D.t(m.text) }));
        await ui.aiChat(msgs, opts);
        if (fa && fa.anim === 'type' && fa.baseAnim !== 'type') fa.anim = fa.baseAnim;
        guard();
      },
      async cutscene(fn) {
        guard();
        cutsceneDepth++;
        ui.showSkip(true);
        try {
          await fn();
        } finally {
          cutsceneDepth = Math.max(0, cutsceneDepth - 1);
          if (!cutsceneDepth) {
            ui.showSkip(false);
            if (P2.skipping) core.setSkipping(false);
          }
        }
        guard();
      },

      // ---------------- Palco
      scene(id, params) { guard(); core.setScene(id, params); return G; },
      sceneParams(p) { core.sceneParams(p); return G; },
      async sceneFade(id, params, d) {
        guard();
        await core.fadeOut(d == null ? 0.5 : d);
        guard();
        core.setScene(id, params);
        await core.fadeIn(d == null ? 0.5 : d);
        guard();
      },
      spot(name) { return core.spot(name); },
      actor(id, opts) {
        const a = core.actor(id);
        if (opts) a.set(opts);
        return a;
      },
      has(id) { const a = core.getActor(id); return !!(a && a.visible); },
      clearActors() { core.clearActors(); },
      async wait(s) { guard(); await core.wait(s); guard(); },
      async fadeOut(d, color) { guard(); await core.fadeOut(d, color); guard(); },
      async fadeIn(d) { guard(); await core.fadeIn(d); guard(); },
      flash(color, d) { core.flash(color, d); },
      shake(mag, d) { core.shake(mag, d); },
      async zoom(scale, d) { guard(); await core.zoom(scale, d); guard(); },
      /** Câmera: shot(nome|{target,yaw,pitch,dist,fov}, dur), focus(ator, 'close'|'medio'|'plano'|'geral', {side,angle,pitch,zoom,dur}), two(a, b, opts), reset(). */
      cam: {
        async shot(s, d, ease) { guard(); await core.cam.shot(s, d, ease); guard(); },
        async focus(a, kind, o) { guard(); await core.cam.focus(a, kind, o); guard(); },
        async two(a, b, o) { guard(); await core.cam.two(a, b, o); guard(); },
        reset() { core.cam.reset(); },
        handheld(v) { core.cam.handheld = v == null ? 0.6 : v; },
      },
      /**
       * PRIMEIRA PESSOA. G.player.fp() / G.player.cine() trocam o modo de câmera;
       * lookAt(ator|ponto|{x,y,z}) vira a cabeça; walkTo(ponto) anda sozinho (a câmera vai junto).
       */
      player: {
        fp() { core.player.setMode('fp'); },
        cine() { core.player.setMode('cine'); },
        get mode() { return core.player.mode; },
        lookAt(t) {
          if (typeof t === 'string') { const a = core.getActor(t); if (a) t = a; else { const s = core.spot(t); t = { x: s.x, y: 1.3, z: s.z }; } }
          core.player.lookAt(t);
        },
        async walkTo(spot, speed) { guard(); await core.actor('pai').walk(spot, speed); guard(); },
        lock() { core.player.setMove(false); },
        /** Define para onde a visão aponta: pitch (+ = para cima) e, opcional, yaw absoluto. */
        setLook(pitch, yaw) { if (pitch != null) core.player.pitch = pitch; if (yaw != null) core.player.yaw = yaw; core.player.lookAt(null); },
      },
      /**
       * EXPLORAÇÃO livre em primeira pessoa até o jogador escolher um ponto obrigatório.
       * o: { objetivo, hotspots: [{id, label, icon, actor | at | pos:{x,y,z}, radius, optional, onInteract: async (G)=>{}}] }
       * Pontos opcionais rodam onInteract e a exploração continua. Retorna o id do ponto obrigatório escolhido.
       */
      async explore(o) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        o = o || {};
        const pl = core.player;
        pl.setMode('fp');
        pl.lookAt(null);
        const R = ui.refs();
        const clearPanel = () => { ui.setMode('dialog'); if (R.text) R.text.innerHTML = ''; if (R.name) R.name.hidden = true; ui.markEmpty(true); };
        clearPanel();
        const list = (o.hotspots || []).map((h) => Object.assign({}, h, { label: D.t(h.label || '') }));
        const required = list.filter((h) => !h.optional);
        const objetivo = D.t(o.objetivo || '');
        const showObj = () => ui.hud.set({ objetivo: { text: objetivo, go: required.length ? () => core.hotspots.pick(required[0], true) : null } });
        showObj();
        pl.setMove(true);
        let busy = false;
        const id = await core.track((resolve, reject) => {
          core.hotspots.set(list, async (h) => {
            if (busy) return;
            if (h.onInteract) {
              busy = true;
              pl.setMove(false);
              core.hotspots.suspended = true;
              ui.hud.set({ objetivo: null });
              try { await h.onInteract(G); } catch (e) { reject(e); return; }
              busy = false;
              core.hotspots.suspended = false;
              if (h.optional && h.once !== false) core.hotspots.remove(h.id);
              clearPanel();
              if (h.optional) { showObj(); pl.setMove(true); return; }
            }
            if (!h.optional) resolve(h.id);
          });
        });
        core.hotspots.clear();
        pl.setMove(false);
        ui.hud.set({ objetivo: null });
        guard();
        return id;
      },
      /** Câmera automática que enquadra quem fala (padrão: ligada). */
      talkCam(on) { talkCam.on = on !== false; talkCam.last = null; },
      tint(color, a) { core.tint(color, a); },
      async letterbox(on, d) { guard(); await core.letterbox(on, d); guard(); },
      async rewind(d) { guard(); await core.rewind(d); guard(); },
      fx: core.fx,
      music(name, o) { if (P2.audio) P2.audio.music(name, o); },
      /** Toca um efeito. Com {loop:true} retorna {stop()} (ex.: telefone tocando). */
      sfx(name, o) { if (P2.audio && !P2.skipping) return P2.audio.sfx(name, o); return null; },
      stopSfx() { if (P2.audio && P2.audio.stopSfx) P2.audio.stopSfx(); },

      // ---------------- HUD, cartões e avisos
      hud: ui.hud,
      async titleCard(o) {
        guard();
        o = Object.assign({ kicker: def.num, title: def.title, sub: def.subtitle }, o || {});
        if (o.kicker) o.kicker = D.t(o.kicker);
        if (o.title) o.title = D.t(o.title);
        if (o.sub) o.sub = D.t(o.sub);
        await ui.titleCard(o);
        guard();
      },
      async fact(keyOrObj, extra) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        const list = (Array.isArray(keyOrObj) ? keyOrObj : [keyOrObj]).map((k) => {
          if (typeof k === 'string') {
            const f = P2.FONTES && P2.FONTES[k];
            if (!f) { console.warn('Fonte não encontrada:', k); return null; }
            return f;
          }
          return k;
        }).filter(Boolean);
        if (!list.length) return;
        extra = extra || {};
        let opts;
        if (list.length === 1 && !extra.titulo) {
          const f = Object.assign({}, list[0], extra);
          opts = { kind: 'fact', kicker: 'Fato real', icon: '📚', titulo: D.t(f.titulo), texto: D.t(f.texto), fontes: [f], sfx: 'jingle_fato', node: D.selo(f) };
        } else {
          const node = ui.el('div', 'fact-list');
          list.forEach((f) => {
            const item = ui.el('div', 'fact-item', [ui.el('h3', null, D.t(f.titulo)), ui.el('div', 'fact-tx', ui.rich(D.t(f.texto))), D.selo(f)]);
            if (f.url) {
              const a = ui.el('a', 'fact-src', 'Fonte: ' + (f.fonte || f.curta) + ' ↗');
              a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
              a.addEventListener('click', (e) => { e.stopPropagation(); D.achieve('leitor_de_fontes'); });
              item.appendChild(a);
            }
            node.appendChild(item);
          });
          opts = { kind: 'fact', kicker: 'Fatos reais', icon: '📚', titulo: D.t(extra.titulo || ''), texto: extra.texto ? D.t(extra.texto) : '', node, sfx: 'jingle_fato' };
        }
        await ui.card(opts);
        guard();
      },
      async lesson(texto, o) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        o = o || {};
        await ui.card({ kind: 'lesson', kicker: o.kicker || 'Lição do capítulo', icon: o.icon || '💡', titulo: D.t(o.titulo || ''), texto: D.t(texto), sfx: 'chime' });
        guard();
      },
      async card(o) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        o = Object.assign({}, o || {});
        ['titulo', 'texto', 'kicker', 'botao'].forEach((k) => { if (o[k]) o[k] = D.t(o[k]); });
        if (o.botoes) o.botoes = o.botoes.map((b) => Object.assign({}, b, { label: D.t(b.label) }));
        const v = await ui.card(o);
        guard();
        return v;
      },
      toast(text, o) { ui.toast(D.t(text), o); },
      achieve(id) { return D.achieve(id); },
      hasAchievement(id) { return !!data.achievements[id]; },

      // ---------------- Minigames
      async mini(build, o) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        await ensureVisible();
        o = Object.assign({}, o || {});
        if (o.title) o.title = D.t(o.title);
        if (o.intro) o.intro = D.t(o.intro);
        if (typeof o.introWho === 'string') o.introWho = D.speaker(o.introWho);
        const r = await ui.mini((root, done, api) => {
          api.G = G;
          api.t = D.t;
          const say0 = api.say;
          api.say = (text, who) => say0(D.t(text), typeof who === 'string' ? D.speaker(who) : who);
          build(root, done, api);
        }, o);
        guard();
        return r;
      },
      async overlay(build, o) {
        guard();
        if (P2.skipping) core.setSkipping(false);
        const r = await ui.overlay((root, done, api) => { api.G = G; api.t = D.t; build(root, done, api); }, o);
        guard();
        return r;
      },

      // ---------------- Estado
      stats(obj) {
        const st = data.progress.stats;
        st[def.id] = Object.assign(st[def.id] || {}, obj || {});
        P2.save.write();
        return st[def.id];
      },
      allStats() { return JSON.parse(JSON.stringify(data.progress.stats || {})); },
      flag(name, value) {
        if (value === undefined) return data.progress.flags[name];
        data.progress.flags[name] = value;
        P2.save.write();
        return value;
      },
      save() { P2.save.write(); },
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      },
      pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
      guard,
    };
    ACTOR_IDS.forEach((id) => {
      Object.defineProperty(G, id, { get: () => core.actor(id), enumerable: false });
    });
    return G;
  }
  D.makeG = makeG;

  // ------------------------------------------------------------------
  // Rodar capítulos
  // ------------------------------------------------------------------
  function resetStage() {
    if (P2.audio && P2.audio.stopSfx) P2.audio.stopSfx();
    talkCam.on = true;
    talkCam.last = null;
    if (core.hotspots) core.hotspots.clear();
    if (core.player) { core.player.setMove(false); core.player.lookAt(null); core.player.setMode('fp'); }
    if (core.clearFx) core.clearFx();
    core.clearActors();
    core.resetCamera();
    core.tint(null);
    core.world.letterbox = 0;
    core.world.rewind.on = false;
    ui.hud.clear();
    ui.clearToasts();
    cutsceneDepth = 0;
    ui.showSkip(false);
    core.setSkipping(false);
    ui.setMode('dialog');
    const R = ui.refs();
    if (R.text) R.text.innerHTML = '';
    if (R.name) R.name.hidden = true;
    if (R.portraitWrap) R.portraitWrap.hidden = true;
  }

  D.abort = function () {
    if (P2.audio && P2.audio.stopSfx) P2.audio.stopSfx();
    if (core.hotspots) core.hotspots.clear();
    if (core.player) { core.player.setMove(false); core.player.lookAt(null); }
    core.abortAll();
    ui.resetAll();
    cutsceneDepth = 0;
    core.setSkipping(false);
    running = null;
  };

  D.nextId = function (id) {
    const i = P2.CHAPTER_ORDER.indexOf(id);
    return i >= 0 && i < P2.CHAPTER_ORDER.length - 1 ? P2.CHAPTER_ORDER[i + 1] : null;
  };
  D.isUnlocked = function (id) {
    const data = P2.save.data;
    const i = P2.CHAPTER_ORDER.indexOf(id);
    if (i <= 0) return true;
    if (data.settings.unlockAll) return true;
    if (data.progress.completed[id]) return true;
    if (data.progress.current && data.progress.current.id === id) return true;
    return !!data.progress.completed[P2.CHAPTER_ORDER[i - 1]];
  };

  D.start = async function (id, part) {
    D.abort();
    const def = P2.chapters[id];
    if (!def) { console.error('Capítulo não encontrado:', id); return; }
    const data = P2.save.data;
    part = Math.max(0, Math.min(part || 0, def.parts.length - 1));
    if (part === 0) {
      data.progress.vars[id] = {};
      data.progress.stats[id] = {};
    }
    running = { id };
    ui.clearLog();
    resetStage();
    core.setFade(1, '#000');
    if (P2.main && P2.main.onChapterStart) P2.main.onChapterStart(def);
    if (def.music && P2.audio) P2.audio.music(def.music);
    try {
      for (let i = part; i < def.parts.length; i++) {
        data.progress.current = { id, part: i };
        P2.save.write();
        if (i > part && core.world.fade.a < 0.99) await core.fadeOut(0.35);
        resetStage();
        core.setFade(1);
        const G = makeG(def);
        await def.parts[i](G);
      }
      data.progress.completed[id] = true;
      const next = D.nextId(id);
      data.progress.current = next ? { id: next, part: 0 } : null;
      P2.save.write();
      running = null;
      cutsceneDepth = 0;
      ui.showSkip(false);
      if (P2.main && P2.main.chapterDone) await P2.main.chapterDone(def, next, makeG(def));
    } catch (e) {
      if (e === P2.ABORT) return;
      console.error('Erro no capítulo', id, e);
      running = null;
      if (P2.main && P2.main.chapterError) P2.main.chapterError(def, e);
    }
  };
})();

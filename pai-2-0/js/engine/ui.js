/* PAI 2.0 — ui.js
 * Camada HTML do jogo: painel de diálogo com texto letra por letra,
 * escolhas, janela de chat com a IA, cartões (Fato real, Lição), cartão de
 * título, notificações, HUD sobre o palco, minigames, menu de pausa,
 * histórico de falas e opções. Teclado e toque funcionam igual.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const ui = (P2.ui = {});
  const core = P2.core;

  const $ = (s, r) => (r || document).querySelector(s);
  const sfx = (n) => { if (P2.audio && !P2.skipping) P2.audio.sfx(n); };

  // ------------------------------------------------------------------
  // Utilidades de DOM
  // ------------------------------------------------------------------
  function el(tag, cls, content) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    append(e, content);
    return e;
  }
  function append(e, content) {
    if (content == null || content === false) return e;
    if (Array.isArray(content)) content.forEach((c) => append(e, c));
    else if (content instanceof Node) e.appendChild(content);
    else e.appendChild(document.createTextNode(String(content)));
    return e;
  }
  ui.el = el;
  ui.append = append;
  /** Botão padrão. opts: {cls, key, title, disabled} */
  ui.btn = function (label, onClick, opts) {
    opts = opts || {};
    const b = el('button', 'btn ' + (opts.cls || ''), null);
    b.type = 'button';
    if (opts.key) {
      b.dataset.key = String(opts.key);
      b.appendChild(el('span', 'kbd', String(opts.key)));
    }
    if (label instanceof Node) b.appendChild(label);
    else b.appendChild(rich(String(label), true));
    if (opts.title) b.title = opts.title;
    if (opts.disabled) b.disabled = true;
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (b.disabled) return;
      if (onClick) onClick(ev, b);
    });
    return b;
  };

  // ------------------------------------------------------------------
  // Texto: tokens e marcação simples (*negrito*, \n, "- " lista)
  // ------------------------------------------------------------------
  function parseRich(str) {
    const lines = String(str == null ? '' : str).split('\n');
    return lines.map((line) => {
      let cls = '';
      if (/^\s*[-•]\s+/.test(line)) { cls = 'li'; line = line.replace(/^\s*[-•]\s+/, ''); }
      else if (/^\s*\d+[.)]\s+/.test(line)) cls = 'num';
      const segs = [];
      let bold = false, buf = '';
      for (const ch of line) {
        if (ch === '*') { if (buf) segs.push({ t: buf, b: bold }); buf = ''; bold = !bold; }
        else buf += ch;
      }
      if (buf) segs.push({ t: buf, b: bold });
      return { cls, segs };
    });
  }
  /** Converte texto com marcação em nós (sem animação). inline=true evita blocos. */
  function rich(str, inline) {
    const frag = document.createDocumentFragment();
    const lines = parseRich(str);
    lines.forEach((ln, i) => {
      const holder = inline ? frag : el('div', 'line ' + ln.cls);
      ln.segs.forEach((s) => holder.appendChild(s.b ? el('strong', null, s.t) : document.createTextNode(s.t)));
      if (inline) { if (i < lines.length - 1) frag.appendChild(el('br')); }
      else {
        if (!ln.segs.length) holder.classList.add('blank');
        frag.appendChild(holder);
      }
    });
    return frag;
  }
  ui.rich = rich;
  ui.plain = function (str) { return String(str).replace(/\*/g, ''); };
  /** Injeta CSS específico (ex.: de um capítulo) uma única vez. */
  ui.css = function (id, cssText) {
    const key = 'css-' + id;
    if (document.getElementById(key)) return;
    const st = document.createElement('style');
    st.id = key;
    st.textContent = cssText;
    document.head.appendChild(st);
  };

  // ------------------------------------------------------------------
  // Máquina de escrever
  // ------------------------------------------------------------------
  const SPEEDS = { lenta: 22, normal: 40, rapida: 80, instantanea: Infinity };
  ui.cps = function () {
    const s = (P2.settings && P2.settings.speed) || 'normal';
    return SPEEDS[s] || 40;
  };
  function typewriter(container, text, opts) {
    opts = opts || {};
    container.innerHTML = '';
    const chars = [];
    parseRich(text).forEach((ln) => {
      const line = el('div', 'line ' + ln.cls);
      if (!ln.segs.length) line.classList.add('blank');
      ln.segs.forEach((s) => {
        const host = s.b ? el('strong') : line;
        if (s.b) line.appendChild(host);
        // agrupa por palavra para quebrar linha só entre palavras
        const parts = s.t.split(/(\s+)/);
        parts.forEach((part) => {
          if (!part) return;
          const isSpace = /^\s+$/.test(part);
          const wrap = isSpace ? host : el('span', 'w');
          for (const ch of part) {
            const sp = el('span', 'ch', ch);
            wrap.appendChild(sp);
            chars.push({ sp, ch });
          }
          if (!isSpace) host.appendChild(wrap);
        });
      });
      container.appendChild(line);
    });
    let i = 0, acc = 0, pauseT = 0, done = false, blipN = 0;
    const cps = ui.cps() * (opts.speedMul || 1);
    let resolveDone;
    const promise = new Promise((r) => (resolveDone = r));
    function revealAll() {
      for (; i < chars.length; i++) chars[i].sp.className = 'ch on';
    }
    function finish() {
      if (done) return;
      revealAll();
      done = true;
      off();
      resolveDone();
    }
    const off = core.onFrame((dt) => {
      if (done || P2.paused) return;
      if (pauseT > 0) { pauseT -= dt; return; }
      acc += dt * cps;
      while (acc >= 1 && i < chars.length) {
        const c = chars[i];
        c.sp.className = 'ch on';
        acc -= 1;
        i++;
        if (/[\wÀ-ÿ]/.test(c.ch) && opts.who && (blipN++ % 2 === 0) && P2.audio) P2.audio.voice(opts.who);
        const next = i < chars.length ? chars[i].ch : ' ';
        if (/\s/.test(next)) {
          if ('.!?…'.indexOf(c.ch) >= 0) { pauseT = 0.24 / (opts.speedMul || 1); acc = 0; break; }
          if (',;:'.indexOf(c.ch) >= 0) { pauseT = 0.09 / (opts.speedMul || 1); acc = 0; break; }
        }
        if (opts.onScroll) opts.onScroll();
      }
      if (i >= chars.length) finish();
    });
    if (!isFinite(cps) || P2.skipping || !chars.length) finish();
    return {
      promise,
      complete: finish,
      get done() { return done; },
      cancel() { done = true; off(); },
    };
  }
  ui.typewriter = typewriter;

  // ------------------------------------------------------------------
  // Referências e modos do painel
  // ------------------------------------------------------------------
  let R = {};
  ui.init = function () {
    R = {
      app: $('#app'),
      panel: $('#panel'),
      dialog: $('#dialog'),
      name: $('#dlg-name'),
      text: $('#dlg-text'),
      sr: $('#dlg-sr'),
      next: $('#dlg-next'),
      portraitWrap: $('#dlg-portrait'),
      portrait: $('#dlg-portrait canvas'),
      choices: $('#choices'),
      chat: $('#chat'),
      mini: $('#mini'),
      menuPanel: $('#panel-menu'),
      hud: $('#hud'),
      toasts: $('#toasts'),
      stageOverlay: $('#stage-overlay'),
      skip: $('#btn-skip'),
      modal: $('#modal'),
      overlay: $('#overlay'),
      ach: $('#ach-toasts'),
      menu: $('#menu'),
      stageWrap: $('#stage-wrap'),
    };
    R.pctx = R.portrait.getContext('2d');
    setupInput();
    setupPortrait();
    R.skip.addEventListener('click', (e) => { e.stopPropagation(); ui.skipCutscene(); });
    ui.applySettings();
  };
  ui.refs = () => R;

  const MODES = ['dialog', 'choices', 'chat', 'mini', 'menuPanel'];
  function setMode(m) {
    MODES.forEach((k) => { if (R[k]) R[k].hidden = k !== m; });
    ui.markEmpty(m === 'dialog' && !(R.text && R.text.textContent));
    R.panel.dataset.mode = m || 'none';
    document.body.classList.toggle('mode-mini', m === 'mini');
    document.body.classList.toggle('mode-chat', m === 'chat');
  }
  ui.setMode = setMode;
  ui.markEmpty = function (on) { if (R.panel) R.panel.classList.toggle('empty', !!on); };

  // ------------------------------------------------------------------
  // Entrada (teclado e toque) — pilha de manipuladores
  // ------------------------------------------------------------------
  const stack = [];
  function pushInput(h) { stack.push(h); return h; }
  function popInput(h) { const i = stack.lastIndexOf(h); if (i >= 0) stack.splice(i, 1); }
  ui.pushInput = pushInput;
  ui.popInput = popInput;
  function top() { return stack[stack.length - 1] || null; }

  function setupInput() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing && e.key !== 'Escape') return;
      if (P2.audio) P2.audio.init();
      // Menu de pausa
      if (e.key === 'Escape') {
        if (menuOpen) { ui.closeMenu(); e.preventDefault(); return; }
        const t = top();
        if (t && t.escape) { t.escape(); e.preventDefault(); return; }
        if (ui.canOpenMenu && ui.canOpenMenu()) { ui.openMenu(); e.preventDefault(); }
        return;
      }
      if (menuOpen) {
        // dentro do menu, só atalhos numéricos de botões
        if (/^[1-9]$/.test(e.key)) clickKey(R.menu, e.key, e);
        return;
      }
      const t = top();
      if (!t) return;
      if (t.key && t.key(e) === true) { e.preventDefault(); return; }
      if (/^[1-9]$/.test(e.key) && t.root) { if (clickKey(t.root, e.key, e)) return; }
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        if (t.advance) {
          // Não "rouba" Enter/Espaço de um botão focado dentro da área ativa
          const tgt = e.target;
          if (tgt && tgt.tagName === 'BUTTON' && t.root && t.root.contains(tgt)) return;
          if (tgt && tgt.blur && tgt !== document.body) tgt.blur();
          e.preventDefault();
          t.advance();
        }
      }
    });
    // Toque/clique no painel ou no palco avança o diálogo
    const adv = (e) => {
      if (P2.audio) P2.audio.init();
      if (menuOpen) return;
      if (e.target.closest('button, a, input, textarea, select, label, .no-advance')) return;
      const t = top();
      if (t && t.advance && t.clickAdvance !== false) t.advance();
    };
    $('#panel').addEventListener('click', adv);
    $('#stage-wrap').addEventListener('click', adv);
  }
  function clickKey(root, key, e) {
    if (!root) return false;
    const list = Array.from(root.querySelectorAll('[data-key="' + key + '"]')).filter((b) => !b.disabled && b.offsetParent !== null);
    if (list.length) {
      e.preventDefault();
      list[0].click();
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------
  // Retrato do falante
  // ------------------------------------------------------------------
  // Retrato: no 3D a câmera enquadra quem fala, então o retrato fica oculto.
  let portraitState = null;
  function setupPortrait() { /* sem retrato no 3D */ }
  function showPortrait() { portraitState = null; if (R.portraitWrap) R.portraitWrap.hidden = true; }

  function readableOn(hex) {
    try {
      const [r, g, b] = P2.gfx.hexToRgb(hex);
      const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return L > 0.62 ? '#1a1830' : '#ffffff';
    } catch (e) { return '#ffffff'; }
  }

  // ------------------------------------------------------------------
  // Histórico de falas
  // ------------------------------------------------------------------
  const LOG = [];
  ui.log = function (name, text, color) {
    LOG.push({ name, text: ui.plain(text), color });
    if (LOG.length > 120) LOG.shift();
  };
  ui.clearLog = () => { LOG.length = 0; };

  // ------------------------------------------------------------------
  // Diálogo
  // ------------------------------------------------------------------
  let lastAdvanceAt = 0;
  /**
   * sp: {id, name, color, voice, portrait, style:'say'|'narrate'|'think'}
   * opts: {actor, auto}
   */
  ui.dialog = function (sp, text, opts) {
    opts = opts || {};
    return core.track((resolve) => {
      setMode('dialog');
      R.dialog.className = 'dialog style-' + (sp.style || 'say');
      // Nome
      if (sp.name) {
        R.name.hidden = false;
        R.name.textContent = sp.name;
        R.name.style.background = sp.color || '#5b5768';
        R.name.style.color = readableOn(sp.color || '#5b5768');
      } else {
        R.name.hidden = true;
      }
      // Retrato
      const actor = opts.actor || null;
      let talking = true;
      if (sp.portrait) {
        showPortrait(sp.portrait, () => {
          const base = {};
          if (sp.expr) base.expr = sp.expr;
          base.talking = talking && !tw.done;
          return base;
        });
      } else showPortrait(null);
      R.sr.textContent = (sp.name ? sp.name + ': ' : '') + ui.plain(text);
      ui.markEmpty(false);
      R.next.classList.remove('on');
      const tw = typewriter(R.text, text, { who: sp.voice });
      if (actor) actor.talking = true;
      let readyAt = Infinity;
      let autoT = null;
      tw.promise.then(() => {
        talking = false;
        if (actor) actor.talking = false;
        readyAt = performance.now() + 140;
        R.next.classList.add('on');
        if (opts.auto && !P2.skipping) autoT = setTimeout(() => finish(), opts.auto * 1000);
      });
      const h = pushInput({
        root: R.dialog,
        skippable: true,
        advance() {
          if (!tw.done) { tw.complete(); return; }
          if (performance.now() < readyAt) return;
          finish();
        },
        skip() { tw.complete(); finish(); },
      });
      function finish() {
        if (autoT) clearTimeout(autoT);
        if (actor) actor.talking = false;
        tw.cancel();
        R.next.classList.remove('on');
        popInput(h);
        lastAdvanceAt = performance.now();
        sfx('blip');
        resolve();
      }
    });
  };

  // ------------------------------------------------------------------
  // Escolhas
  // ------------------------------------------------------------------
  ui.choose = function (options, opts) {
    opts = opts || {};
    return core.track((resolve) => {
      setMode('choices');
      const box = R.choices;
      box.innerHTML = '';
      if (opts.prompt) {
        const pr = el('div', 'choice-prompt');
        if (opts.who && opts.who.name) {
          const tag = el('span', 'mini-tag', opts.who.name);
          tag.style.background = opts.who.color || '#5b5768';
          tag.style.color = readableOn(opts.who.color || '#5b5768');
          pr.appendChild(tag);
        }
        pr.appendChild(rich(opts.prompt, true));
        box.appendChild(pr);
      }
      const list = el('div', 'choice-list' + (options.length > 2 ? ' many' : ''));
      box.appendChild(list);
      let focus = -1;
      let locked = true;
      const btns = options.map((o, i) => {
        const opt = typeof o === 'string' ? { text: o } : o;
        const b = el('button', 'choice');
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.appendChild(el('span', 'num', String(i + 1)));
        const txt = el('span', 'txt');
        txt.appendChild(rich(opt.text, true));
        if (opt.sub) txt.appendChild(el('small', null, rich(opt.sub, true)));
        b.appendChild(txt);
        if (opt.disabled) b.disabled = true;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (locked || b.disabled) return;
          pick(i);
        });
        b.addEventListener('mouseenter', () => setFocus(i, false));
        list.appendChild(b);
        return { b, opt };
      });
      box.classList.add('lock');
      // trava curta para evitar toque acidental vindo do diálogo anterior
      setTimeout(() => { locked = false; box.classList.remove('lock'); }, 380);
      function setFocus(i, scroll) {
        focus = i;
        btns.forEach((x, j) => x.b.classList.toggle('focus', j === i));
        if (scroll) btns[i].b.focus({ preventScroll: false });
      }
      function pick(i) {
        const o = btns[i];
        if (!o || o.opt.disabled) return;
        sfx('confirm');
        btns.forEach((x) => (x.b.disabled = true));
        o.b.classList.add('picked');
        popInput(h);
        ui.log('Escolha', ui.plain(o.opt.text), '#7ee0b8');
        setTimeout(() => resolve(o.opt.value !== undefined ? o.opt.value : i), 160);
      }
      const h = pushInput({
        root: box,
        capture: true,
        key(e) {
          if (locked) return true;
          if (/^[1-9]$/.test(e.key)) { const i = +e.key - 1; if (i < btns.length) pick(i); return true; }
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { setFocus((focus + 1) % btns.length, true); sfx('select'); return true; }
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { setFocus((focus - 1 + btns.length) % btns.length, true); sfx('select'); return true; }
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { if (focus >= 0) pick(focus); return true; }
          return false;
        },
      });
    });
  };

  // ------------------------------------------------------------------
  // Janela de chat com a IA
  // ------------------------------------------------------------------
  /** Cria uma visualização de chat dentro de um container. */
  ui.chatView = function (container, opts) {
    opts = opts || {};
    const win = el('div', 'chat-win');
    const head = el('div', 'chat-head', [el('span', 'chat-dot'), el('b', null, opts.title || 'Faísca'), el('small', null, opts.subtitle || 'assistente de IA')]);
    const body = el('div', 'chat-body');
    win.appendChild(head);
    win.appendChild(body);
    container.appendChild(win);
    const scroll = () => { body.scrollTop = body.scrollHeight; };
    return {
      win, body,
      /** Adiciona mensagem. from: 'voce'|'ia'|'nota'. Retorna {bubble, tw?} */
      add(from, text, o) {
        o = o || {};
        const row = el('div', 'msg ' + from);
        if (from === 'ia') row.appendChild(el('span', 'avatar'));
        const bubble = el('div', 'bubble');
        row.appendChild(bubble);
        if (o.label) row.appendChild(el('div', 'msg-label', o.label));
        body.appendChild(row);
        if (o.instant || from === 'nota') { bubble.appendChild(rich(text)); scroll(); return { row, bubble, tw: null }; }
        const tw = typewriter(bubble, text, { who: from === 'ia' ? 'faisca' : null, speedMul: from === 'ia' ? 1.8 : 3, onScroll: scroll });
        tw.promise.then(scroll);
        scroll();
        return { row, bubble, tw };
      },
      dots() {
        const row = el('div', 'msg ia');
        row.appendChild(el('span', 'avatar'));
        const bubble = el('div', 'bubble typing', [el('i'), el('i'), el('i')]);
        row.appendChild(bubble);
        body.appendChild(row);
        scroll();
        return row;
      },
      scroll,
    };
  };

  ui.aiChat = function (messages, opts) {
    opts = opts || {};
    return core.track((resolve, reject) => {
      setMode('chat');
      R.chat.innerHTML = '';
      const view = ui.chatView(R.chat, opts);
      const foot = el('div', 'chat-foot');
      R.chat.appendChild(foot);
      let onAdv = null;
      const h = pushInput({
        root: R.chat,
        skippable: true,
        advance() { if (onAdv) onAdv(); },
        skip() { skipAll = true; if (onAdv) onAdv(); },
      });
      let skipAll = P2.skipping;
      const adv = () => new Promise((r) => { onAdv = () => { onAdv = null; r(); }; });
      const run = async () => {
        for (const m of messages) {
          const from = m.from === 'você' ? 'voce' : m.from || 'ia';
          if (from === 'ia' && !skipAll) {
            const dots = view.dots();
            if (opts.onThinking) opts.onThinking(true);
            sfx('typing');
            await Promise.race([core.wait(m.thinking != null ? m.thinking : opts.thinking != null ? opts.thinking : 1.2), adv()]);
            onAdv = null;
            if (opts.onThinking) opts.onThinking(false);
            dots.remove();
          }
          const r = view.add(from, m.text, { instant: skipAll, label: m.label });
          if (from === 'ia') sfx('pop');
          if (r.tw && !skipAll) {
            onAdv = () => r.tw.complete();
            await r.tw.promise;
            onAdv = null;
          } else if (r.tw) r.tw.complete();
          ui.log(from === 'ia' ? 'Faísca (IA)' : from === 'voce' ? 'Você' : 'Nota', m.text, from === 'ia' ? '#f26b3a' : '#4166a8');
          if (!skipAll) await core.wait(0.25);
        }
        if (!skipAll) {
          const b = ui.btn(opts.botao || 'Continuar ▶', () => { if (onAdv) onAdv(); }, { cls: 'primary small' });
          foot.appendChild(b);
          await new Promise((r) => {
            const t0 = performance.now();
            onAdv = () => { if (performance.now() - t0 < 250) return; onAdv = null; r(); };
          });
        }
        popInput(h);
        sfx('blip');
        resolve();
      };
      run().catch((e) => { popInput(h); reject(e); });
    });
  };

  // ------------------------------------------------------------------
  // Cartões (modal): Fato real, Lição, genéricos
  // ------------------------------------------------------------------
  let modalDepth = 0;
  ui.card = function (o) {
    o = o || {};
    return core.track((resolve) => {
      const m = R.modal;
      m.innerHTML = '';
      m.hidden = false;
      modalDepth++;
      const card = el('div', 'card card-' + (o.kind || 'info'));
      card.setAttribute('role', 'dialog');
      if (o.kicker) card.appendChild(el('div', 'card-kicker', [o.icon ? el('span', 'ic', o.icon) : null, o.kicker]));
      if (o.titulo) card.appendChild(el('h2', 'card-title', rich(o.titulo, true)));
      const body = el('div', 'card-text');
      if (o.html) body.innerHTML = o.html;
      else if (o.texto) body.appendChild(rich(o.texto));
      card.appendChild(body);
      if (o.node) card.appendChild(o.node);
      if (o.fontes && o.fontes.length) {
        const fl = el('div', 'card-sources');
        o.fontes.forEach((f) => {
          if (!f) return;
          const row = el('div', 'src');
          row.appendChild(el('span', 'src-label', 'Fonte: '));
          if (f.url) {
            const a = el('a', null, (f.fonte || f.curta || 'link') + ' ↗');
            a.href = f.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.addEventListener('click', (e) => { e.stopPropagation(); if (P2.director) P2.director.achieve('leitor_de_fontes'); });
            row.appendChild(a);
          } else row.appendChild(el('span', null, f.fonte || f.curta));
          fl.appendChild(row);
        });
        card.appendChild(fl);
      }
      const actions = el('div', 'card-actions');
      const buttons = (o.botoes || [{ label: o.botao || 'Continuar', value: true, primary: true }]).slice();
      if (!buttons.some((b) => b.primary)) buttons[buttons.length - 1] = Object.assign({}, buttons[buttons.length - 1], { primary: true });
      let locked = true;
      setTimeout(() => (locked = false), 450);
      let primaryBtn = null;
      buttons.forEach((bd, i) => {
        const b = ui.btn(bd.label, () => { if (!locked) close(bd.value); }, { cls: bd.primary ? 'primary' : '', key: buttons.length > 1 ? String(i + 1) : null });
        if (bd.primary) primaryBtn = b;
        actions.appendChild(b);
      });
      card.appendChild(actions);
      m.appendChild(card);
      requestAnimationFrame(() => m.classList.add('show'));
      if (o.sfx !== false) sfx(o.sfx || 'page');
      const h = pushInput({
        root: m,
        capture: true,
        key(e) {
          if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && !locked && primaryBtn && document.activeElement && document.activeElement.tagName !== 'A' && document.activeElement.tagName !== 'BUTTON') {
            primaryBtn.click();
            return true;
          }
          return false;
        },
      });
      setTimeout(() => { if (primaryBtn) primaryBtn.focus({ preventScroll: true }); }, 60);
      function close(v) {
        popInput(h);
        m.classList.remove('show');
        modalDepth--;
        setTimeout(() => { if (modalDepth <= 0) { m.hidden = true; m.innerHTML = ''; } }, 180);
        sfx('confirm');
        resolve(v);
      }
    });
  };

  // ------------------------------------------------------------------
  // Cartão de título do capítulo (sobre o palco)
  // ------------------------------------------------------------------
  ui.titleCard = function (o) {
    o = o || {};
    return core.track((resolve) => {
      const ov = R.stageOverlay;
      ov.innerHTML = '';
      ov.hidden = false;
      const box = el('div', 'title-card', [
        o.kicker ? el('div', 'tc-kicker', o.kicker) : null,
        el('div', 'tc-title', o.title || ''),
        o.sub ? el('div', 'tc-sub', o.sub) : null,
        el('div', 'tc-hint', 'toque para continuar'),
      ]);
      ov.appendChild(box);
      requestAnimationFrame(() => box.classList.add('show'));
      sfx('jingle_capitulo');
      const t0 = performance.now();
      let timer = null;
      const h = pushInput({
        root: ov,
        skippable: true,
        advance() { if (performance.now() - t0 > 700) close(); },
        skip() { close(); },
      });
      if (!P2.skipping) timer = setTimeout(close, (o.dur || 3.6) * 1000);
      else setTimeout(close, 0);
      let closed = false;
      function close() {
        if (closed) return;
        closed = true;
        if (timer) clearTimeout(timer);
        popInput(h);
        box.classList.remove('show');
        box.classList.add('hide');
        setTimeout(() => { ov.hidden = true; ov.innerHTML = ''; }, P2.skipping ? 0 : 350);
        resolve();
      }
    });
  };

  // ------------------------------------------------------------------
  // Notificações no palco e conquistas
  // ------------------------------------------------------------------
  ui.toast = function (text, o) {
    o = o || {};
    if (P2.skipping) return;
    const t = el('div', 'toast toast-' + (o.kind || 'notif'), [
      el('span', 'toast-ic', o.icon || '🔔'),
      el('span', 'toast-tx', rich(text, true)),
    ]);
    R.toasts.appendChild(t);
    while (R.toasts.children.length > 4) R.toasts.removeChild(R.toasts.firstChild);
    requestAnimationFrame(() => t.classList.add('show'));
    if (o.sfx !== false) sfx(o.sfx || (o.kind === 'email' ? 'email' : o.kind === 'warn' ? 'buzz' : 'notify'));
    const dur = (o.dur || 3.2) * 1000;
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, dur);
  };
  ui.clearToasts = function () { if (R.toasts) R.toasts.innerHTML = ''; };

  ui.achToast = function (a) {
    const t = el('div', 'ach', [
      el('span', 'ach-ic', a.icon || '🏆'),
      el('span', 'ach-tx', [el('small', null, 'Conquista desbloqueada!'), el('b', null, a.titulo), el('span', null, a.desc)]),
    ]);
    R.ach.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    if (P2.audio) P2.audio.sfx('achievement');
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 4200);
  };

  // ------------------------------------------------------------------
  // HUD (sobre o palco)
  // ------------------------------------------------------------------
  const hudState = {};
  const HEART_SVG = '<svg viewBox="0 0 7 6" aria-hidden="true"><path d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>';
  ui.hud = {
    set(o) {
      Object.keys(o || {}).forEach((k) => {
        if (o[k] == null) delete hudState[k];
        else hudState[k] = typeof o[k] === 'object' ? Object.assign({}, hudState[k] || {}, o[k]) : o[k];
      });
      renderHud();
    },
    clear() { Object.keys(hudState).forEach((k) => delete hudState[k]); renderHud(); },
    get: () => hudState,
  };
  let lastHud = {};
  function renderHud() {
    const h = R.hud;
    if (!h) return;
    h.innerHTML = '';
    const s = hudState;
    if (s.clock) {
      h.appendChild(el('div', 'hud-box hud-clock', [el('span', 'hud-ic', '🕘'), el('b', null, String(s.clock))]));
    }
    const right = el('div', 'hud-right');
    if (s.rep) {
      const v = Math.max(0, Math.min(s.rep.max || 100, s.rep.value || 0));
      const pct = (v / (s.rep.max || 100)) * 100;
      const bar = el('div', 'hud-bar', el('i'));
      bar.firstChild.style.width = pct + '%';
      bar.firstChild.style.background = pct > 66 ? '#3fbf8f' : pct > 33 ? '#f2a53a' : '#e94b5a';
      const box = el('div', 'hud-box hud-rep', [el('span', 'hud-lbl', s.rep.label || 'Reputação'), bar]);
      if (lastHud.rep != null && lastHud.rep !== v) box.classList.add(v > lastHud.rep ? 'up' : 'down');
      lastHud.rep = v;
      right.appendChild(box);
    }
    if (s.hearts) {
      const box = el('div', 'hud-box hud-hearts', el('span', 'hud-lbl', s.hearts.label || 'Paciência'));
      const row = el('span', 'hearts');
      for (let i = 0; i < (s.hearts.max || 3); i++) {
        const sp = el('span', 'heart' + (i < s.hearts.value ? ' on' : ''));
        sp.innerHTML = HEART_SVG;
        row.appendChild(sp);
      }
      box.appendChild(row);
      if (lastHud.hearts != null && lastHud.hearts > s.hearts.value) box.classList.add('down');
      lastHud.hearts = s.hearts.value;
      right.appendChild(box);
    }
    if (s.score) {
      right.appendChild(el('div', 'hud-box hud-score', [el('span', 'hud-lbl', s.score.label || 'Pontos'), el('b', null, String(s.score.value))]));
    }
    if (right.children.length) h.appendChild(right);
    if (s.boss) {
      const pct = Math.max(0, Math.min(100, (s.boss.hp / (s.boss.max || 100)) * 100));
      const bar = el('div', 'hud-bar boss', el('i'));
      bar.firstChild.style.width = pct + '%';
      const box = el('div', 'hud-box hud-boss', [el('span', 'hud-lbl', s.boss.name || 'A Dúvida'), bar]);
      if (lastHud.boss != null && lastHud.boss !== s.boss.hp) box.classList.add(s.boss.hp < lastHud.boss ? 'hit' : 'heal');
      lastHud.boss = s.boss.hp;
      h.appendChild(box);
    }
    if (s.meter) {
      const v = Math.max(0, Math.min(100, s.meter.value || 0));
      const bar = el('div', 'hud-bar meter', el('i'));
      bar.firstChild.style.width = v + '%';
      bar.firstChild.style.background = s.meter.color || (v > 66 ? '#3fbf8f' : v > 33 ? '#f2a53a' : '#e94b5a');
      h.appendChild(el('div', 'hud-box hud-meter', [el('span', 'hud-lbl', s.meter.label || 'Qualidade'), bar]));
    }
    if (!Object.keys(s).length) lastHud = {};
  }

  // ------------------------------------------------------------------
  // Minigames e telas cheias
  // ------------------------------------------------------------------
  const cleanups = new Set();
  function makeApi(rootHolder, sayEl) {
    const timers = [];
    const api = {
      el, append,
      btn: ui.btn,
      rich,
      stars(n, max) {
        max = max || 3;
        const s = el('span', 'stars');
        for (let i = 0; i < max; i++) s.appendChild(el('span', 'star' + (i < n ? ' on' : ''), '★'));
        s.setAttribute('aria-label', n + ' de ' + max + ' estrelas');
        return s;
      },
      meter(value, label, color) {
        const m = el('div', 'meter', [label ? el('span', 'meter-lbl', label) : null, el('div', 'hud-bar', el('i'))]);
        const fill = m.querySelector('i');
        const set = (v, c) => {
          v = Math.max(0, Math.min(100, v));
          fill.style.width = v + '%';
          fill.style.background = c || color || (v > 66 ? '#3fbf8f' : v > 33 ? '#f2a53a' : '#e94b5a');
        };
        set(value || 0);
        m.set = set;
        return m;
      },
      shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      },
      sfx(n) { if (P2.audio) P2.audio.sfx(n); },
      say(text, who) {
        if (!sayEl) return;
        sayEl.innerHTML = '';
        if (who && who.name) {
          const tag = el('span', 'mini-tag', who.name);
          tag.style.background = who.color || '#f26b3a';
          tag.style.color = readableOn(who.color || '#f26b3a');
          sayEl.appendChild(tag);
        }
        sayEl.appendChild(rich(text, true));
        sayEl.classList.remove('pulse');
        void sayEl.offsetWidth;
        sayEl.classList.add('pulse');
      },
      timeout(fn, ms) { const id = setTimeout(fn, ms); timers.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(fn, ms); timers.push(() => clearInterval(id)); return id; },
      chat(container, o) { return ui.chatView(container, o); },
      typewriter,
    };
    api._cleanup = () => { timers.forEach((f) => f()); timers.length = 0; };
    return api;
  }

  ui.mini = function (build, opts) {
    opts = opts || {};
    return core.track((resolve, reject) => {
      setMode('mini');
      document.body.classList.toggle('mini-l', opts.size === 'l');
      const box = R.mini;
      box.innerHTML = '';
      const head = el('div', 'mini-head');
      if (opts.title) head.appendChild(el('div', 'mini-title', rich(opts.title, true)));
      const say = el('div', 'mini-say');
      head.appendChild(say);
      box.appendChild(head);
      const root = el('div', 'mini-root');
      box.appendChild(root);
      box.scrollTop = 0;
      R.panel.scrollTop = 0;
      const api = makeApi(root, say);
      if (opts.intro) api.say(opts.intro, opts.introWho);
      let finished = false;
      const h = pushInput({ root: box });
      const cleanup = () => { api._cleanup(); popInput(h); document.body.classList.remove('mini-l'); };
      cleanups.add(cleanup);
      const done = (result) => {
        if (finished) return;
        finished = true;
        cleanups.delete(cleanup);
        cleanup();
        box.innerHTML = '';
        setMode('dialog');
        resolve(result);
      };
      try {
        build(root, done, api);
      } catch (e) {
        console.error('Erro no minigame', e);
        cleanups.delete(cleanup);
        cleanup();
        reject(e);
      }
    });
  };

  ui.overlay = function (build, opts) {
    opts = opts || {};
    return core.track((resolve, reject) => {
      const ov = R.overlay;
      ov.innerHTML = '';
      ov.hidden = false;
      ov.className = 'overlay ' + (opts.cls || '');
      const inner = el('div', 'overlay-inner');
      ov.appendChild(inner);
      ov.scrollTop = 0;
      const api = makeApi(inner, null);
      const h = pushInput({ root: ov });
      let finished = false;
      const cleanup = () => { api._cleanup(); popInput(h); };
      cleanups.add(cleanup);
      requestAnimationFrame(() => ov.classList.add('show'));
      const done = (result) => {
        if (finished) return;
        finished = true;
        cleanups.delete(cleanup);
        cleanup();
        ov.classList.remove('show');
        setTimeout(() => { if (finished) { ov.hidden = true; ov.innerHTML = ''; } }, 250);
        resolve(result);
      };
      try { build(inner, done, api); } catch (e) { console.error(e); cleanups.delete(cleanup); cleanup(); reject(e); }
    });
  };

  // ------------------------------------------------------------------
  // Pular cena
  // ------------------------------------------------------------------
  ui.showSkip = function (on) {
    if (R.skip) R.skip.hidden = !on;
  };
  ui.skipCutscene = function () {
    if (!P2.director || !P2.director.inCutscene()) return;
    sfx('whoosh');
    core.setSkipping(true);
    // resolve o que estiver na tela agora
    for (let i = stack.length - 1; i >= 0; i--) {
      const h = stack[i];
      if (h.skippable && h.skip) { h.skip(); break; }
    }
  };

  // ------------------------------------------------------------------
  // Limpeza geral (ao sair de um capítulo)
  // ------------------------------------------------------------------
  ui.resetAll = function () {
    cleanups.forEach((f) => { try { f(); } catch (e) { /* nada */ } });
    cleanups.clear();
    stack.length = 0;
    portraitState = null;
    if (!R.app) return;
    R.text.innerHTML = '';
    R.name.hidden = true;
    R.portraitWrap.hidden = true;
    R.next.classList.remove('on');
    R.choices.innerHTML = '';
    R.chat.innerHTML = '';
    R.mini.innerHTML = '';
    R.modal.innerHTML = '';
    R.modal.hidden = true;
    R.modal.classList.remove('show');
    modalDepth = 0;
    R.overlay.innerHTML = '';
    R.overlay.hidden = true;
    R.stageOverlay.innerHTML = '';
    R.stageOverlay.hidden = true;
    ui.clearToasts();
    ui.hud.clear();
    ui.showSkip(false);
    document.body.classList.remove('mode-mini', 'mini-l', 'mode-chat');
    setMode('dialog');
  };

  // ------------------------------------------------------------------
  // Configurações
  // ------------------------------------------------------------------
  const SPEED_LABEL = { lenta: 'Lenta', normal: 'Normal', rapida: 'Rápida', instantanea: 'Instantânea' };
  const SPEED_ORDER = ['lenta', 'normal', 'rapida', 'instantanea'];
  const FONT_ORDER = ['A', 'A+', 'A++'];
  ui.applySettings = function () {
    const s = P2.settings || {};
    document.documentElement.dataset.font = s.font === 'A++' ? 'xl' : s.font === 'A' ? 'm' : 'l';
    document.documentElement.classList.toggle('reduce-motion', !!s.reduceMotion);
    if (P2.audio) {
      P2.audio.setEnabled(s.sound !== false);
      P2.audio.setVolumes({ music: s.music == null ? 0.6 : s.music, sfx: s.sfx == null ? 0.85 : s.sfx });
    }
    const bs = $('#btn-sound');
    if (bs) {
      bs.querySelector('.ic').textContent = s.sound === false ? '🔇' : '🔊';
      bs.querySelector('.lb').textContent = s.sound === false ? 'Som: não' : 'Som: sim';
      bs.setAttribute('aria-pressed', s.sound === false ? 'false' : 'true');
    }
    const bsp = $('#btn-speed');
    if (bsp) bsp.querySelector('.lb').textContent = 'Texto: ' + (SPEED_LABEL[s.speed] || 'Normal');
    const bf = $('#btn-font');
    if (bf) bf.querySelector('.ic').textContent = s.font || 'A+';
  };
  function saveSettings() {
    ui.applySettings();
    if (P2.save) P2.save.write();
  }
  ui.toggleSound = function () {
    P2.settings.sound = P2.settings.sound === false;
    if (P2.audio) P2.audio.init();
    saveSettings();
    if (P2.settings.sound) sfx('select');
  };
  ui.cycleSpeed = function () {
    const i = SPEED_ORDER.indexOf(P2.settings.speed);
    P2.settings.speed = SPEED_ORDER[(i + 1) % SPEED_ORDER.length];
    saveSettings();
    sfx('select');
  };
  ui.cycleFont = function () {
    const i = FONT_ORDER.indexOf(P2.settings.font);
    P2.settings.font = FONT_ORDER[(i + 1) % FONT_ORDER.length];
    saveSettings();
    sfx('select');
  };

  /** Monta o painel de opções dentro de um container. */
  ui.optionsPanel = function (container) {
    const s = P2.settings;
    const wrap = el('div', 'options');
    const row = (label, control, hint) => {
      const r = el('div', 'opt-row', [el('div', 'opt-label', [el('b', null, label), hint ? el('small', null, hint) : null]), control]);
      wrap.appendChild(r);
      return r;
    };
    const seg = (items, cur, onPick) => {
      const g = el('div', 'seg');
      items.forEach(([val, lab]) => {
        const b = el('button', 'seg-btn' + (val === cur ? ' on' : ''), lab);
        b.type = 'button';
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          Array.from(g.children).forEach((c) => c.classList.remove('on'));
          b.classList.add('on');
          onPick(val);
          saveSettings();
          sfx('select');
        });
        g.appendChild(b);
      });
      return g;
    };
    const slider = (val, onSet) => {
      const i = el('input', 'slider');
      i.type = 'range'; i.min = 0; i.max = 100; i.step = 5; i.value = Math.round(val * 100);
      i.addEventListener('input', () => { onSet(i.value / 100); saveSettings(); });
      i.addEventListener('change', () => sfx('select'));
      return i;
    };
    row('Som', seg([[true, 'Ligado'], [false, 'Desligado']], s.sound !== false, (v) => { s.sound = v; if (P2.audio) P2.audio.init(); }));
    row('Volume da música', slider(s.music == null ? 0.6 : s.music, (v) => (s.music = v)));
    row('Volume dos efeitos', slider(s.sfx == null ? 0.85 : s.sfx, (v) => (s.sfx = v)));
    row('Velocidade do texto', seg(SPEED_ORDER.map((k) => [k, SPEED_LABEL[k]]), s.speed, (v) => (s.speed = v)));
    row('Tamanho da letra', seg([['A', 'A'], ['A+', 'A+'], ['A++', 'A++']], s.font, (v) => (s.font = v)), 'Deixe do tamanho mais confortável.');
    row('Menos tremores e flashes', seg([[false, 'Não'], [true, 'Sim']], !!s.reduceMotion, (v) => (s.reduceMotion = v)), 'Suaviza efeitos de tela.');
    container.appendChild(wrap);
    return wrap;
  };

  // ------------------------------------------------------------------
  // Menu de pausa
  // ------------------------------------------------------------------
  let menuOpen = false;
  ui.isMenuOpen = () => menuOpen;
  ui.openMenu = function (view) {
    const m = R.menu;
    menuOpen = true;
    P2.paused = true;
    if (P2.audio && P2.audio.duck) P2.audio.duck(true);
    m.hidden = false;
    m.innerHTML = '';
    const box = el('div', 'menu-box');
    m.appendChild(box);
    const close = () => ui.closeMenu();
    const head = el('div', 'menu-head', [el('h2', null, 'Pausa'), ui.btn('✕', close, { cls: 'icon-btn', title: 'Fechar' })]);
    box.appendChild(head);
    const body = el('div', 'menu-body');
    box.appendChild(body);
    const show = (v) => {
      body.innerHTML = '';
      if (v === 'log') {
        head.querySelector('h2').textContent = 'Histórico de falas';
        const list = el('div', 'log-list');
        if (!LOG.length) list.appendChild(el('p', 'muted', 'Nada por aqui ainda.'));
        LOG.forEach((l) => {
          const r = el('div', 'log-row');
          if (l.name) { const n = el('b', null, l.name + ': '); n.style.color = l.color || ''; r.appendChild(n); }
          r.appendChild(el('span', null, l.text));
          list.appendChild(r);
        });
        body.appendChild(list);
        body.appendChild(ui.btn('◀ Voltar', () => show('main'), { cls: 'ghost' }));
        setTimeout(() => { list.scrollTop = list.scrollHeight; }, 0);
      } else if (v === 'opts') {
        head.querySelector('h2').textContent = 'Opções';
        ui.optionsPanel(body);
        body.appendChild(ui.btn('◀ Voltar', () => show('main'), { cls: 'ghost' }));
      } else {
        head.querySelector('h2').textContent = 'Pausa';
        const list = el('div', 'menu-list');
        list.appendChild(ui.btn('Continuar jogando', close, { cls: 'primary', key: '1' }));
        list.appendChild(ui.btn('Histórico de falas', () => show('log'), { key: '2' }));
        list.appendChild(ui.btn('Opções (som, letra, velocidade)', () => show('opts'), { key: '3' }));
        if (P2.main && P2.main.inChapter()) {
          list.appendChild(ui.btn('Escolher capítulo', () => { ui.closeMenu(); P2.main.leaveTo('chapters'); }, { key: '4' }));
          list.appendChild(ui.btn('Tela inicial', () => { ui.closeMenu(); P2.main.leaveTo('title'); }, { key: '5' }));
          const save = P2.save && P2.save.available;
          list.appendChild(el('p', 'muted small', save ? 'O progresso é salvo automaticamente a cada parte do capítulo.' : 'Atenção: este navegador não está deixando salvar o progresso.'));
        }
        body.appendChild(list);
      }
    };
    show(view || 'main');
    m.onclick = (e) => { if (e.target === m) close(); };
    requestAnimationFrame(() => m.classList.add('show'));
    sfx('select');
  };
  ui.closeMenu = function () {
    const m = R.menu;
    menuOpen = false;
    P2.paused = false;
    if (P2.audio && P2.audio.duck) P2.audio.duck(false);
    m.classList.remove('show');
    m.hidden = true;
    m.innerHTML = '';
  };
})();

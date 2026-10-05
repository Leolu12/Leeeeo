/* PAI 2.0 — main.js
 * Início: carregamento, tela de título em 3D, preparação (feita pelo
 * filho/filha), entrega, capítulos, conquistas, opções, Guia do CEO,
 * fontes e créditos. Também cuida do layout (painel sobre a cena).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const core = P2.core;
  const ui = P2.ui;
  const D = P2.director;
  const el = ui.el;
  const $ = (s) => document.querySelector(s);

  const main = (P2.main = {});
  let screenEl = null;
  let onTitle = false;

  // ------------------------------------------------------------------
  // Utilidades de tela
  // ------------------------------------------------------------------
  function openScreen(build) {
    screenEl.innerHTML = '';
    screenEl.hidden = false;
    screenEl.scrollTop = 0;
    const inner = el('div', 'screen-inner');
    screenEl.appendChild(inner);
    build(inner);
    requestAnimationFrame(() => screenEl.classList.add('show'));
  }
  function closeScreen() {
    screenEl.classList.remove('show');
    screenEl.hidden = true;
    screenEl.innerHTML = '';
  }
  main.openScreen = openScreen;
  main.closeScreen = closeScreen;
  function sfx(n) { if (P2.audio) P2.audio.sfx(n); }
  function chapterLabel(def) { return def ? (def.num ? def.num + ' · ' : '') + def.title : ''; }
  function setTopLabel(text) { const l = $('#chap-label'); if (l) l.textContent = text || 'Pai 2.0'; }
  function confirmCard(titulo, texto, sim, nao) {
    return ui.card({ kind: 'warn', kicker: 'Confirmar', icon: '⚠️', titulo, texto, botoes: [{ label: nao || 'Cancelar', value: false }, { label: sim || 'Sim', value: true, primary: true }] }).catch(() => false);
  }
  const backBtn = (fn) => ui.btn('◀ Voltar', fn || (() => { closeScreen(); main.showTitle(); }), { cls: 'ghost' });

  // ------------------------------------------------------------------
  // Tela de título (cena 3D girando devagar)
  // ------------------------------------------------------------------
  main.inChapter = () => !!D.running();
  main.showTitle = function () {
    D.abort();
    closeScreen();
    setTopLabel('Pai 2.0');
    onTitle = true;
    core.player.setMode('cine');
    core.clearActors();
    core.resetCamera();
    core.tint(null);
    const envId = P2.envs.titulo ? 'titulo' : P2.envs.escritorio ? 'escritorio' : 'void';
    core.setScene(envId, envId === 'escritorio' ? { time: 'tarde', screen: 'chat', papers: 0.3 } : {});
    core.setFade(1);
    core.fadeIn(1.2).catch(() => {});
    const env = core.world.env;
    const fs = env && env.spots && (env.spots.faisca || env.spots.centro);
    const fa = core.actor('faisca');
    fa.at(fs || { x: 0, z: 0 });
    fa.y = fs && fs.y != null ? fs.y : 1.2;
    fa.setAnim('idle');
    fa.face('camera', true);
    if (P2.audio && P2.audio.current !== 'titulo') P2.audio.music('titulo');
    // logo
    const ov = ui.refs().stageOverlay;
    ov.innerHTML = '';
    ov.hidden = false;
    ov.appendChild(el('div', 'logo-wrap', [
      el('div', 'logo', [document.createTextNode('Pai '), el('span', 'two', '2.0')]),
      el('div', 'logo-sub', 'um dia de CEO com a IA'),
    ]));
    // menu no painel
    ui.setMode('menuPanel');
    const box = ui.refs().menuPanel;
    box.innerHTML = '';
    const menu = el('div', 'title-menu');
    const data = P2.save.data;
    const cur = data.progress.current;
    let k = 1;
    if (data.profile && cur && P2.chapters[cur.id]) {
      const def = P2.chapters[cur.id];
      menu.appendChild(ui.btn('▶ Continuar: ' + chapterLabel(def), () => startChapter(cur.id, cur.part), { cls: 'primary big', key: String(k++) }));
    }
    menu.appendChild(ui.btn(data.profile ? 'Novo jogo' : '▶ Começar', () => newGame(), { cls: data.profile ? '' : 'primary big', key: String(k++) }));
    if (data.profile) menu.appendChild(ui.btn('Capítulos', () => showChapters(), { key: String(k++) }));
    menu.appendChild(ui.btn('📘 Guia do CEO', () => openGuide(), { key: String(k++) }));
    menu.appendChild(ui.btn('Conquistas', () => showAchievements(), { key: String(k++) }));
    menu.appendChild(ui.btn('Opções', () => showOptions(), { key: String(k++) }));
    menu.appendChild(ui.btn('Fontes e créditos', () => showCredits(), { key: String(k++) }));
    box.appendChild(menu);
    const foot = el('div', 'title-foot');
    foot.textContent = data.profile ? 'Preparado com carinho para ' + D.profile().pai + '.' : 'Uma aventura de 60 a 90 minutos, em capítulos curtos. Dá para parar e continuar depois.';
    box.appendChild(foot);
    if (!P2.save.available) box.appendChild(el('p', 'title-foot', 'Aviso: este navegador não está permitindo salvar o progresso.'));
    if (titleInput) ui.popInput(titleInput);
    titleInput = ui.pushInput({ root: box });
  };
  let titleInput = null;
  function leaveTitle() {
    onTitle = false;
    if (titleInput) { ui.popInput(titleInput); titleInput = null; }
    const ov = ui.refs().stageOverlay;
    ov.innerHTML = '';
    ov.hidden = true;
  }
  function startChapter(id, part) {
    leaveTitle();
    closeScreen();
    if (P2.audio) P2.audio.init();
    D.start(id, part || 0);
  }
  main.startChapter = startChapter;

  // ------------------------------------------------------------------
  // Preparação (feita por quem dá o presente)
  // ------------------------------------------------------------------
  async function newGame() {
    const data = P2.save.data;
    if (data.profile && (data.progress.current || Object.keys(data.progress.completed).length)) {
      const ok = await confirmCard('Começar do zero?', 'Isso apaga o progresso atual (as conquistas continuam). Quer mesmo começar um jogo novo?', 'Sim, começar de novo', 'Não');
      if (!ok) return;
    }
    showSetup(false);
  }
  const SKINS = [['claro', 'Claro', '#f2c9a6'], ['medio', 'Médio', '#d39a6e'], ['escuro', 'Escuro', '#8a5a3c']];
  function showSetup(editOnly) {
    const prev = P2.save.data.profile || {};
    const st = {
      pai: prev.pai || '', apelido: prev.apelido || 'Pai', filho: prev.filho || '', genero: prev.genero || 'filho',
      skin: prev.skin || 'medio', empresa: prev.empresa || '', setor: prev.setor || '', recado: prev.recado || '',
    };
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', editOnly ? 'Editar personalização' : 'Antes de entregar o presente…'));
      root.appendChild(el('p', 'screen-sub', 'Esta parte é para quem vai dar o jogo. O nome, o jeito de chamar e a empresa aparecem na história e nos exemplos. Leva dois minutos. Depois é só entregar.'));
      const form = el('div', 'paper form');
      root.appendChild(form);
      const field = (label, control, hint) => { const f = el('div', 'field', [el('div', 'flabel', label), control, hint ? el('small', null, hint) : null]); form.appendChild(f); return f; };
      const input = (val, ph, max, onIn) => {
        const i = el('input', 'input');
        i.type = 'text'; i.value = val; i.placeholder = ph; i.maxLength = max; i.autocomplete = 'off';
        i.addEventListener('input', () => onIn(i.value));
        return i;
      };
      const inPai = input(st.pai, 'Ex.: Carlos', 24, (v) => { st.pai = v; refreshBtn(); });
      field('Nome do seu pai', inPai);
      const inAp = input(st.apelido, 'Pai', 18, (v) => { st.apelido = v; refreshBtn(); });
      const chips = el('div', 'chips');
      ['Pai', 'Paizão', 'Painho', 'Papai', 'Velho', 'Coroa'].forEach((c) => {
        const b = el('button', 'mg-chip', c);
        b.type = 'button';
        b.addEventListener('click', () => { inAp.value = c; st.apelido = c; refreshBtn(); sfx('select'); });
        chips.appendChild(b);
      });
      field('Como você chama ele?', el('div', 'mg-col', [inAp, chips]), 'É assim que você fala com ele no jogo.');
      const inFi = input(st.filho, 'Seu nome', 24, (v) => { st.filho = v; });
      field('Seu nome', inFi);
      const gen = el('div', 'seg');
      [['filho', 'Sou filho'], ['filha', 'Sou filha']].forEach(([v, l]) => {
        const b = el('button', 'seg-btn' + (st.genero === v ? ' on' : ''), l);
        b.type = 'button';
        b.addEventListener('click', () => { st.genero = v; Array.from(gen.children).forEach((c) => c.classList.remove('on')); b.classList.add('on'); sfx('select'); });
        gen.appendChild(b);
      });
      field('Quem está dando o jogo?', gen);
      const inEmp = input(st.empresa, 'Ex.: Andrade Alimentos (opcional)', 40, (v) => { st.empresa = v; });
      field('Nome da empresa dele', inEmp, 'Opcional. Aparece em placas, no certificado e nos prompts prontos.');
      const inSet = input(st.setor, 'Ex.: distribuição de alimentos, construção, varejo… (opcional)', 60, (v) => { st.setor = v; });
      field('Ramo da empresa', inSet, 'Opcional. Usado para deixar os prompts do Guia do CEO prontos para o negócio dele.');
      const sw = el('div', 'swatches');
      SKINS.forEach(([v, l, c]) => {
        const i = el('i');
        i.style.background = c;
        const b = el('button', 'swatch' + (st.skin === v ? ' on' : ''), [i, l]);
        b.type = 'button';
        b.addEventListener('click', () => { st.skin = v; Array.from(sw.children).forEach((x) => x.classList.remove('on')); b.classList.add('on'); sfx('select'); });
        sw.appendChild(b);
      });
      field('Tom de pele dos personagens (ele e você)', sw);
      const ta = el('textarea', 'textarea');
      ta.maxLength = 700;
      ta.placeholder = 'Ex.: Pai, fiz isso porque sei o quanto você trabalha. Não precisa virar expert: é só testar do seu jeito. Te amo.';
      ta.value = st.recado;
      ta.addEventListener('input', () => { st.recado = ta.value; });
      field('Um recado seu para ele ler no final (opcional)', ta, 'Aparece numa carta no fim do jogo.');
      const err = el('div', 'error-msg');
      form.appendChild(err);
      const actions = el('div', 'form-actions');
      actions.appendChild(backBtn());
      const go = ui.btn('Pronto!', () => submit(), { cls: 'primary big' });
      actions.appendChild(go);
      form.appendChild(actions);
      function refreshBtn() {
        const ap = (st.apelido || 'Pai').trim() || 'Pai';
        go.textContent = editOnly ? 'Salvar ▶' : 'Pronto! Entregar para o ' + ap + ' ▶';
      }
      refreshBtn();
      function submit() {
        ['pai', 'filho', 'apelido', 'empresa', 'setor'].forEach((k) => (st[k] = (st[k] || '').trim()));
        st.apelido = st.apelido || 'Pai';
        if (!st.pai) { err.textContent = 'Falta o nome do seu pai.'; inPai.focus(); sfx('error'); return; }
        if (!st.filho) { err.textContent = 'Falta o seu nome.'; inFi.focus(); sfx('error'); return; }
        sfx('confirm');
        if (editOnly) {
          P2.save.data.profile = Object.assign({}, st);
          P2.save.write();
          closeScreen();
          main.showTitle();
          return;
        }
        P2.save.resetProgress();
        P2.save.data.profile = Object.assign({}, st);
        P2.save.data.progress.current = { id: 'prologo', part: 0 };
        P2.save.write();
        showHandoff();
      }
      setTimeout(() => { if (!st.pai) inPai.focus(); }, 80);
    });
  }
  function showHandoff() {
    const pr = D.profile();
    openScreen((root) => {
      const box = el('div', 'handoff');
      box.appendChild(el('div', 'screen-sub', 'Tudo pronto. Agora é só entregar o ' + (window.innerWidth < 700 ? 'celular' : 'computador') + ' para ele.'));
      box.appendChild(el('div', 'big', 'Oi, ' + pr.pai + '!'));
      box.appendChild(el('p', null, D.t('{filho} preparou este jogo para você. São capítulos curtos, dá para parar e continuar depois.')));
      box.appendChild(el('p', 'screen-sub', 'Para avançar: toque na caixa de texto ou aperte Espaço/Enter. Arraste a cena para olhar em volta. A letra aumenta no botão "A+" lá em cima.'));
      const b = ui.btn('Sou o ' + pr.pai + '. Vamos começar ▶', () => startChapter('prologo', 0), { cls: 'primary big' });
      box.appendChild(b);
      root.appendChild(box);
      setTimeout(() => b.focus(), 100);
    });
  }

  // ------------------------------------------------------------------
  // Capítulos, conquistas, opções, créditos
  // ------------------------------------------------------------------
  function showChapters() {
    const data = P2.save.data;
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', 'Capítulos'));
      root.appendChild(el('p', 'screen-sub', 'Os capítulos abrem conforme você avança. Dá para rejogar qualquer um já liberado.'));
      const grid = el('div', 'chap-grid');
      P2.CHAPTER_ORDER.forEach((id) => {
        const def = P2.chapters[id];
        if (!def) return;
        const unlocked = D.isUnlocked(id);
        const done = !!data.progress.completed[id];
        const isCur = data.progress.current && data.progress.current.id === id;
        const card = el('button', 'chap-card' + (done ? ' done' : '') + (!unlocked ? ' locked' : '') + (isCur ? ' current' : ''));
        card.type = 'button';
        card.appendChild(el('span', 'ck', def.num || ''));
        card.appendChild(el('span', 'ct', def.title));
        if (def.subtitle) card.appendChild(el('span', 'cs', def.subtitle));
        if (def.minutes) card.appendChild(el('span', 'cs', '≈ ' + def.minutes + ' min'));
        card.appendChild(el('span', 'cstate', !unlocked ? '🔒' : done ? '✓ feito' : isCur ? '▶ atual' : ''));
        if (!unlocked) card.disabled = true;
        card.addEventListener('click', async () => {
          if (!unlocked) return;
          sfx('confirm');
          let part = 0;
          if (isCur && data.progress.current.part > 0) {
            const cont = await ui.card({ kind: 'info', kicker: def.num, icon: '📖', titulo: def.title, texto: 'Você parou no meio deste capítulo. Quer continuar de onde parou?', botoes: [{ label: 'Recomeçar', value: false }, { label: 'Continuar de onde parei', value: true, primary: true }] }).catch(() => null);
            if (cont === null) return;
            if (cont) part = data.progress.current.part;
          }
          startChapter(id, part);
        });
        grid.appendChild(card);
      });
      root.appendChild(grid);
      const foot = el('div', 'form-actions');
      foot.style.marginTop = '20px';
      foot.appendChild(backBtn());
      if (!data.settings.unlockAll) {
        foot.appendChild(ui.btn('Liberar todos (para quem deu o presente testar)', async () => {
          const ok = await confirmCard('Liberar todos os capítulos?', 'Útil para quem vai dar o presente dar uma olhada antes. O ideal para o pai é jogar na ordem.', 'Liberar');
          if (ok) { data.settings.unlockAll = true; P2.save.write(); showChapters(); }
        }, { cls: 'small' }));
      }
      root.appendChild(foot);
    });
  }
  function showAchievements() {
    const got = P2.save.data.achievements || {};
    openScreen((root) => {
      const n = P2.ACHIEVEMENTS.filter((a) => got[a.id]).length;
      root.appendChild(el('div', 'screen-title', 'Conquistas'));
      root.appendChild(el('p', 'screen-sub', n + ' de ' + P2.ACHIEVEMENTS.length + ' desbloqueadas.'));
      const grid = el('div', 'ach-grid');
      P2.ACHIEVEMENTS.forEach((a) => grid.appendChild(el('div', 'ach-card' + (got[a.id] ? ' on' : ''), [el('span', 'ai', a.icon), el('div', null, [el('b', null, a.titulo), el('span', null, a.desc)])])));
      root.appendChild(grid);
      const foot = el('div', 'form-actions');
      foot.style.marginTop = '20px';
      foot.appendChild(backBtn());
      root.appendChild(foot);
    });
  }
  function showOptions() {
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', 'Opções'));
      const paper = el('div', 'paper');
      ui.optionsPanel(paper);
      root.appendChild(paper);
      const more = el('div', 'form-actions');
      more.style.marginTop = '18px';
      more.appendChild(backBtn());
      const right = el('div', 'mg-row');
      if (P2.save.data.profile) right.appendChild(ui.btn('Editar nomes e empresa', () => showSetup(true), { cls: 'small' }));
      right.appendChild(ui.btn('Apagar progresso', async () => {
        const ok = await confirmCard('Apagar todo o progresso?', 'Isso apaga capítulos concluídos, personalização e conquistas deste navegador.', 'Apagar tudo');
        if (ok) {
          P2.save.resetProgress();
          P2.save.data.achievements = {};
          P2.save.data.profile = null;
          P2.save.write();
          closeScreen();
          main.showTitle();
        }
      }, { cls: 'small' }));
      more.appendChild(right);
      root.appendChild(more);
    });
  }
  function showCredits() {
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', 'Fontes e créditos'));
      root.appendChild(el('p', 'screen-sub', 'Todo número que aparece no jogo vem de uma pesquisa, relatório ou reportagem. Aqui estão os links para conferir — afinal, conferir é a lição número 1.'));
      const paper = el('div', 'paper src-list');
      const keys = P2.FONTES_ORDEM || Object.keys(P2.FONTES || {});
      keys.forEach((k) => {
        const f = P2.FONTES && P2.FONTES[k];
        if (!f) return;
        const a = el('a', null, f.fonte + ' ↗');
        a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.addEventListener('click', () => D.achieve('leitor_de_fontes'));
        paper.appendChild(el('div', 'src-item', [el('b', null, f.titulo), el('br'), a]));
      });
      if (!keys.length) paper.appendChild(el('p', null, 'Lista de fontes indisponível.'));
      root.appendChild(paper);
      const cred = el('div', 'paper');
      cred.style.marginTop = '16px';
      cred.appendChild(el('p', null, [el('b', null, 'Pai 2.0'), ' — uma aventura sobre usar IA com honestidade, cuidado e bom humor.']));
      cred.appendChild(el('p', null, 'Feito com HTML, CSS e JavaScript. Os cenários e personagens 3D são modelados pelo próprio código (Three.js, licença MIT); a música e os efeitos são sintetizados no navegador.'));
      cred.appendChild(el('p', null, 'Tipografia: Atkinson Hyperlegible (Braille Institute) e Plus Jakarta Sans, via Google Fonts.'));
      cred.appendChild(el('p', 'muted small', 'A Faísca e todos os personagens são fictícios. Nomes de ferramentas de IA citados são só exemplos; o jogo não tem ligação com nenhuma empresa.'));
      root.appendChild(cred);
      const foot = el('div', 'form-actions');
      foot.style.marginTop = '20px';
      foot.appendChild(backBtn());
      root.appendChild(foot);
    });
  }
  function openGuide() {
    if (P2.guia && P2.guia.open) { P2.guia.open(); return; }
    ui.card({ kind: 'guide', kicker: 'Guia do CEO', icon: '📘', titulo: 'Em breve', texto: 'O guia com prompts prontos aparece aqui.' }).catch(() => {});
  }
  main.openGuide = openGuide;

  // ------------------------------------------------------------------
  // Ganchos do diretor
  // ------------------------------------------------------------------
  main.onChapterStart = function (def) { leaveTitle(); setTopLabel(chapterLabel(def)); };
  main.chapterDone = async function (def, next, G) {
    const lines = [];
    try { if (def.summary) (def.summary(G) || []).forEach((l) => lines.push(l)); } catch (e) { /* nada */ }
    if (def.id === 'epilogo') { main.showTitle(); return; }
    const nextDef = next ? P2.chapters[next] : null;
    const texto = lines.length ? lines.map((l) => '- ' + l).join('\n') : 'Progresso salvo.';
    const botoes = [{ label: 'Menu inicial', value: 'menu' }];
    if (nextDef) botoes.push({ label: 'Próximo: ' + chapterLabel(nextDef) + ' ▶', value: 'next', primary: true });
    let v = 'menu';
    try { v = await ui.card({ kind: 'ok', kicker: 'Capítulo concluído', icon: '✓', titulo: chapterLabel(def), texto, botoes, sfx: 'jingle_vitoria' }); } catch (e) { return; }
    if (v === 'next' && nextDef) startChapter(next, 0);
    else main.showTitle();
  };
  main.chapterError = async function (def, e) {
    try {
      const v = await ui.card({ kind: 'warn', kicker: 'Ops', icon: '🛠️', titulo: 'Algo deu errado neste capítulo', texto: 'Desculpe! Foi um erro do jogo, não seu. Dá para tentar de novo a partir do último ponto salvo.\n\n(' + (e && e.message ? e.message : e) + ')', botoes: [{ label: 'Menu inicial', value: 'menu' }, { label: 'Tentar de novo', value: 'retry', primary: true }] });
      const cur = P2.save.data.progress.current;
      if (v === 'retry' && cur) startChapter(cur.id, cur.part);
      else main.showTitle();
    } catch (err) { main.showTitle(); }
  };
  main.leaveTo = function (dest) {
    D.abort();
    main.showTitle();
    if (dest === 'chapters') showChapters();
  };

  // ------------------------------------------------------------------
  // Layout: painel por cima da cena (desktop) ou embaixo (celular em pé)
  // ------------------------------------------------------------------
  function updateLayout() {
    const stack = window.matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
    const side = window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
    document.body.classList.toggle('layout-stack', stack);
    const panel = $('#panel'), stage = $('#stage-wrap');
    if (!panel || !stage) return;
    if (stack || side || panel.hidden) { core.cam.screenShift = 0; return; }
    const h = stage.clientHeight || 1;
    const covered = panel.offsetHeight + 16;
    core.cam.screenShift = Math.min(0.24, (covered / h) * 0.48);
  }
  main.updateLayout = updateLayout;

  // ------------------------------------------------------------------
  // Início
  // ------------------------------------------------------------------
  function boot() {
    P2.save.load();
    screenEl = $('#screen');
    ui.init();
    core.init($('#stage-wrap'));
    $('#btn-sound').addEventListener('click', (e) => { e.currentTarget.blur(); ui.toggleSound(); });
    $('#btn-speed').addEventListener('click', (e) => { e.currentTarget.blur(); ui.cycleSpeed(); });
    $('#btn-font').addEventListener('click', (e) => { e.currentTarget.blur(); ui.cycleFont(); });
    $('#btn-guide').addEventListener('click', (e) => { e.currentTarget.blur(); openGuide(); });
    $('#btn-menu').addEventListener('click', (e) => { e.currentTarget.blur(); if (ui.isMenuOpen()) ui.closeMenu(); else ui.openMenu(); });
    ui.canOpenMenu = () => true;
    if (core.isTouch && core.isTouch()) document.body.classList.add('touch');
    // Áudio só depois do primeiro gesto (regra dos navegadores)
    const unlock = () => { if (P2.audio) { P2.audio.init(); ui.applySettings(); } };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    ui.applySettings();
    // layout
    if (window.ResizeObserver) new ResizeObserver(updateLayout).observe($('#panel'));
    window.addEventListener('resize', updateLayout);
    core.onFrame((dt) => {
      if (onTitle && !P2.paused) core.cam.cur.yaw += dt * 0.045;
    });
    setTimeout(updateLayout, 50);
    // some a tela de carregamento depois do primeiro quadro
    requestAnimationFrame(() => requestAnimationFrame(() => { const b = $('#boot'); if (b) { b.classList.add('gone'); setTimeout(() => b.remove(), 700); } }));

    // Atalhos de teste: ?cap=cap3&genero=filha&speed=instantanea&unlock=1
    const qs = new URLSearchParams(location.search);
    const cap = qs.get('cap');
    if (cap && P2.chapters[cap]) {
      if (!P2.save.data.profile || qs.get('genero') || qs.get('empresa')) {
        P2.save.data.profile = Object.assign({ pai: 'Carlos', apelido: 'Pai', filho: 'Lucas', genero: 'filho', skin: 'medio', empresa: '', setor: '', recado: '' }, P2.save.data.profile || {});
        if (qs.get('genero')) {
          P2.save.data.profile.genero = qs.get('genero');
          if (qs.get('genero') === 'filha' && P2.save.data.profile.filho === 'Lucas') P2.save.data.profile.filho = 'Júlia';
        }
        if (qs.get('empresa')) P2.save.data.profile.empresa = qs.get('empresa');
        if (qs.get('setor')) P2.save.data.profile.setor = qs.get('setor');
      }
      if (qs.get('speed')) P2.save.data.settings.speed = qs.get('speed');
      if (qs.get('unlock')) P2.save.data.settings.unlockAll = true;
      ui.applySettings();
      startChapter(cap, +(qs.get('part') || 0));
      return;
    }
    main.showTitle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

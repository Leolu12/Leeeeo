/* PAI 2.0 — main.js
 * Início do jogo: tela de título, preparação (feita pelo filho/filha),
 * entrega, seleção de capítulos, conquistas, opções, fontes e créditos.
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
  function sfx(n) { if (P2.audio) P2.audio.sfx(n); }
  function chapterLabel(def) {
    if (!def) return '';
    return (def.num ? def.num + ' · ' : '') + def.title;
  }
  function setTopLabel(text) {
    const l = $('#chap-label');
    if (l) l.textContent = text || 'Pai 2.0';
  }
  function confirmCard(titulo, texto, sim, nao) {
    return ui.card({ kind: 'warn', kicker: 'Confirmar', icon: '⚠️', titulo, texto, botoes: [{ label: nao || 'Cancelar', value: false }, { label: sim || 'Sim', value: true, primary: true }] }).catch(() => false);
  }

  // ------------------------------------------------------------------
  // Tela de título
  // ------------------------------------------------------------------
  main.inChapter = () => !!D.running();
  main.showTitle = function () {
    D.abort();
    closeScreen();
    setTopLabel('Pai 2.0');
    core.clearActors();
    core.resetCamera();
    core.tint(null);
    core.setScene('titulo', {});
    core.setFade(1);
    core.fadeIn(0.8).catch(() => {});
    const fa = core.actor('faisca', { x: 160, dir: 1 });
    fa.setAnim('idle');
    fa.y = core.floorY();
    if (P2.audio && P2.audio.current !== 'titulo') P2.audio.music('titulo');
    // logo
    const ov = ui.refs().stageOverlay;
    ov.innerHTML = '';
    ov.hidden = false;
    ov.appendChild(el('div', 'logo-wrap', [
      el('div', 'logo', [document.createTextNode('PAI '), el('span', 'two', '2.0')]),
      el('div', 'logo-sub', 'um dia com a IA'),
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
    menu.appendChild(ui.btn('Conquistas', () => showAchievements(), { key: String(k++) }));
    menu.appendChild(ui.btn('Opções', () => showOptions(), { key: String(k++) }));
    menu.appendChild(ui.btn('Fontes e créditos', () => showCredits(), { key: String(k++) }));
    box.appendChild(menu);
    const foot = el('div', 'title-foot');
    if (data.profile) foot.textContent = 'Preparado com carinho para ' + D.profile().pai + '.';
    else foot.textContent = 'Uma aventura de 60 a 90 minutos. Dá para parar e continuar depois.';
    box.appendChild(foot);
    if (!P2.save.available) box.appendChild(el('p', 'title-foot', 'Aviso: este navegador não está permitindo salvar o progresso.'));
    if (window.innerHeight > window.innerWidth && window.innerWidth < 600) box.appendChild(el('p', 'title-foot', '📱 Dica: com o celular deitado, a cena fica maior.'));
    // teclado: números acionam botões do menu
    if (titleInput) ui.popInput(titleInput);
    titleInput = ui.pushInput({ root: box });
  };
  let titleInput = null;
  function leaveTitle() {
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

  const SKINS = [
    ['claro', 'Claro', '#f7c9a8'],
    ['medio', 'Médio', '#d9a07a'],
    ['escuro', 'Escuro', '#8a5a3c'],
  ];
  function showSetup(editOnly) {
    const prev = P2.save.data.profile || {};
    const st = {
      pai: prev.pai || '',
      apelido: prev.apelido || 'Pai',
      filho: prev.filho || '',
      genero: prev.genero || 'filho',
      prof: prev.prof || null,
      skin: prev.skin || 'medio',
      recado: prev.recado || '',
    };
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', editOnly ? 'Editar personalização' : 'Antes de entregar o presente…'));
      root.appendChild(el('p', 'screen-sub', 'Esta parte é para quem vai dar o jogo. Preencha com calma: o nome, o jeito de chamar e a profissão aparecem na história toda. Depois é só entregar.'));
      const form = el('div', 'paper form');
      root.appendChild(form);
      const field = (label, control, hint) => {
        const f = el('div', 'field', [el('div', 'flabel', label), control, hint ? el('small', null, hint) : null]);
        form.appendChild(f);
        return f;
      };
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
      const apWrap = el('div', 'mg-col', [inAp, chips]);
      field('Como você chama ele?', apWrap, 'É assim que você vai falar com ele no jogo.');
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
      const grid = el('div', 'prof-grid');
      P2.PROF_ORDER.forEach((id) => {
        const p = P2.PROFS[id];
        const b = el('button', 'prof-card' + (st.prof === id ? ' on' : ''), [el('span', 'pi', p.icon), el('span', null, [el('b', null, p.label), el('small', null, p.desc)])]);
        b.type = 'button';
        b.addEventListener('click', () => {
          st.prof = id;
          Array.from(grid.children).forEach((c) => c.classList.remove('on'));
          b.classList.add('on');
          sfx('select');
          err.textContent = '';
        });
        grid.appendChild(b);
      });
      field('Profissão dele', grid, 'As tarefas, o chefe ou cliente e as dicas finais mudam conforme a profissão.');
      const sw = el('div', 'swatches');
      SKINS.forEach(([v, l, c]) => {
        const i = el('i');
        i.style.background = c;
        const b = el('button', 'swatch' + (st.skin === v ? ' on' : ''), [i, l]);
        b.type = 'button';
        b.addEventListener('click', () => { st.skin = v; Array.from(sw.children).forEach((x) => x.classList.remove('on')); b.classList.add('on'); sfx('select'); });
        sw.appendChild(b);
      });
      field('Tom de pele dos personagens (pai e você)', sw);
      const ta = el('textarea', 'textarea');
      ta.maxLength = 600;
      ta.placeholder = 'Ex.: Pai, fiz isso porque acho que vai te poupar tempo. Não precisa virar expert, só testar. Te amo.';
      ta.value = st.recado;
      ta.addEventListener('input', () => { st.recado = ta.value; });
      field('Um recado seu para ele ler no final (opcional)', ta, 'Aparece numa carta no fim do jogo. Até 600 letras.');
      const err = el('div', 'error-msg');
      form.appendChild(err);
      const actions = el('div', 'form-actions');
      actions.appendChild(ui.btn('◀ Voltar', () => { closeScreen(); main.showTitle(); }, { cls: 'ghost' }));
      const go = ui.btn('Pronto!', () => submit(), { cls: 'primary big' });
      actions.appendChild(go);
      form.appendChild(actions);
      function refreshBtn() {
        const ap = (st.apelido || 'Pai').trim() || 'Pai';
        go.textContent = editOnly ? 'Salvar ▶' : 'Pronto! Entregar para o ' + ap + ' ▶';
      }
      refreshBtn();
      function submit() {
        st.pai = (st.pai || '').trim();
        st.filho = (st.filho || '').trim();
        st.apelido = (st.apelido || '').trim() || 'Pai';
        if (!st.pai) { err.textContent = 'Falta o nome do seu pai.'; inPai.focus(); sfx('error'); return; }
        if (!st.filho) { err.textContent = 'Falta o seu nome.'; inFi.focus(); sfx('error'); return; }
        if (!st.prof) { err.textContent = 'Escolha a profissão dele.'; sfx('error'); grid.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
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
      box.appendChild(el('p', null, D.t('{filho} preparou este jogo para você. São uns capítulos curtos, dá para parar e continuar depois.')));
      box.appendChild(el('p', 'muted', 'Para avançar o texto: toque na caixa de diálogo, ou aperte Espaço/Enter. O tamanho da letra muda no botão "A+" lá em cima.'));
      const b = ui.btn('Sou o ' + pr.pai + '. Vamos começar ▶', () => startChapter('prologo', 0), { cls: 'primary big' });
      box.appendChild(b);
      root.appendChild(box);
      setTimeout(() => b.focus(), 100);
    });
  }

  // ------------------------------------------------------------------
  // Capítulos
  // ------------------------------------------------------------------
  function showChapters() {
    const data = P2.save.data;
    openScreen((root) => {
      root.appendChild(el('div', 'screen-title', 'Capítulos'));
      root.appendChild(el('p', 'screen-sub', 'Os capítulos abrem conforme você avança. Dá para rejogar qualquer um já liberado.'));
      const grid = el('div', 'chap-grid');
      P2.CHAPTER_ORDER.forEach((id) => {
        const def = P2.chapters[id];
        const unlocked = D.isUnlocked(id) && !!def;
        const done = !!data.progress.completed[id];
        const isCur = data.progress.current && data.progress.current.id === id;
        const card = el('button', 'chap-card' + (done ? ' done' : '') + (!unlocked ? ' locked' : '') + (isCur ? ' current' : ''));
        card.type = 'button';
        card.appendChild(el('span', 'ck', def ? def.num || '' : id));
        card.appendChild(el('span', 'ct', def ? def.title : 'Em breve'));
        if (def && def.subtitle) card.appendChild(el('span', 'cs', def.subtitle));
        if (def && def.minutes) card.appendChild(el('span', 'cs', '≈ ' + def.minutes + ' min'));
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
      foot.appendChild(ui.btn('◀ Voltar', () => { closeScreen(); main.showTitle(); }, { cls: 'ghost' }));
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
      P2.ACHIEVEMENTS.forEach((a) => {
        grid.appendChild(el('div', 'ach-card' + (got[a.id] ? ' on' : ''), [el('span', 'ai', a.icon), el('div', null, [el('b', null, got[a.id] ? a.titulo : a.titulo), el('span', null, a.desc)])]));
      });
      root.appendChild(grid);
      const foot = el('div', 'form-actions');
      foot.style.marginTop = '20px';
      foot.appendChild(ui.btn('◀ Voltar', () => { closeScreen(); main.showTitle(); }, { cls: 'ghost' }));
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
      more.appendChild(ui.btn('◀ Voltar', () => { closeScreen(); main.showTitle(); }, { cls: 'ghost' }));
      const right = el('div', 'mg-row');
      if (P2.save.data.profile) right.appendChild(ui.btn('Editar nomes e profissão', () => showSetup(true), { cls: 'small' }));
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
      root.appendChild(el('p', 'screen-sub', 'Todo número que aparece no jogo vem de uma pesquisa ou reportagem. Aqui estão os links para conferir — afinal, conferir é a lição número 1.'));
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
      cred.appendChild(el('p', null, 'Feito só com HTML, CSS e JavaScript. A pixel art, a música e os efeitos sonoros são desenhados e tocados pelo próprio código, sem arquivos externos.'));
      cred.appendChild(el('p', null, 'Fontes tipográficas: Atkinson Hyperlegible (Braille Institute) e Pixelify Sans, via Google Fonts.'));
      cred.appendChild(el('p', 'muted small', 'A Faísca e todos os personagens são fictícios. Os nomes de assistentes de IA citados são só exemplos; o jogo não tem ligação com nenhuma empresa.'));
      root.appendChild(cred);
      const foot = el('div', 'form-actions');
      foot.style.marginTop = '20px';
      foot.appendChild(ui.btn('◀ Voltar', () => { closeScreen(); main.showTitle(); }, { cls: 'ghost' }));
      root.appendChild(foot);
    });
  }

  // ------------------------------------------------------------------
  // Ganchos do diretor
  // ------------------------------------------------------------------
  main.onChapterStart = function (def) {
    leaveTitle();
    setTopLabel(chapterLabel(def));
  };
  main.chapterDone = async function (def, next, G) {
    const lines = [];
    try { if (def.summary) (def.summary(G) || []).forEach((l) => lines.push(l)); } catch (e) { /* nada */ }
    if (def.id === 'epilogo') {
      main.showTitle();
      return;
    }
    const nextDef = next ? P2.chapters[next] : null;
    const texto = lines.length ? lines.map((l) => '- ' + l).join('\n') : 'Progresso salvo.';
    const botoes = [{ label: 'Menu inicial', value: 'menu' }];
    if (nextDef) botoes.push({ label: 'Próximo: ' + chapterLabel(nextDef) + ' ▶', value: 'next', primary: true });
    let v = 'menu';
    try {
      v = await ui.card({ kind: 'ok', kicker: 'Capítulo concluído', icon: '✓', titulo: chapterLabel(def), texto, botoes, sfx: 'jingle_vitoria' });
    } catch (e) { return; }
    if (v === 'next' && nextDef) startChapter(next, 0);
    else main.showTitle();
  };
  main.chapterError = async function (def, e) {
    try {
      const v = await ui.card({ kind: 'warn', kicker: 'Ops', icon: '🛠️', titulo: 'Algo deu errado neste capítulo', texto: 'Desculpe! Foi um erro do jogo, não seu. Você pode tentar de novo a partir do último ponto salvo.\n\n(' + (e && e.message ? e.message : e) + ')', botoes: [{ label: 'Menu inicial', value: 'menu' }, { label: 'Tentar de novo', value: 'retry', primary: true }] });
      const cur = P2.save.data.progress.current;
      if (v === 'retry' && cur) startChapter(cur.id, cur.part);
      else main.showTitle();
    } catch (err) { main.showTitle(); }
  };
  main.leaveTo = function (dest) {
    D.abort();
    if (dest === 'chapters') { main.showTitle(); showChapters(); }
    else main.showTitle();
  };

  // ------------------------------------------------------------------
  // Início
  // ------------------------------------------------------------------
  function boot() {
    P2.save.load();
    screenEl = $('#screen');
    ui.init();
    core.init($('#stage'));
    // barra superior
    $('#btn-sound').addEventListener('click', (e) => { e.currentTarget.blur(); ui.toggleSound(); });
    $('#btn-speed').addEventListener('click', (e) => { e.currentTarget.blur(); ui.cycleSpeed(); });
    $('#btn-font').addEventListener('click', (e) => { e.currentTarget.blur(); ui.cycleFont(); });
    $('#btn-menu').addEventListener('click', (e) => { e.currentTarget.blur(); if (ui.isMenuOpen()) ui.closeMenu(); else ui.openMenu(); });
    ui.canOpenMenu = () => true;
    // Áudio só depois do primeiro gesto (regra dos navegadores)
    let unlocked = false;
    const unlock = () => {
      if (!P2.audio) return;
      P2.audio.init();
      ui.applySettings();
      if (unlocked) return;
      unlocked = true;
      // toca a faixa que já deveria estar tocando (pedida antes do primeiro gesto)
      const r = D.running();
      const def = r && P2.chapters[r.id];
      const want = P2.audio.current || (def ? def.music : 'titulo');
      if (want) P2.audio.music(want, { force: true });
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    ui.applySettings();

    // Atalhos de teste: ?cap=cap3&part=0&prof=saude
    const qs = new URLSearchParams(location.search);
    const cap = qs.get('cap');
    if (cap && P2.chapters[cap]) {
      if (!P2.save.data.profile || qs.get('prof') || qs.get('genero')) {
        P2.save.data.profile = Object.assign({ pai: 'Carlos', apelido: 'Pai', filho: 'Lucas', genero: 'filho', prof: 'escritorio', skin: 'medio', recado: '' }, P2.save.data.profile || {});
        if (qs.get('prof')) P2.save.data.profile.prof = qs.get('prof');
        if (qs.get('genero')) {
          P2.save.data.profile.genero = qs.get('genero');
          if (qs.get('genero') === 'filha' && P2.save.data.profile.filho === 'Lucas') P2.save.data.profile.filho = 'Júlia';
        }
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

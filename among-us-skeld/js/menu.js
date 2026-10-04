/* Telas: título, criação da partida, lobby, revelação de função e relatório final. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;
  const h = U.h;
  const STORE_KEY = 'skeld-dedução-config-v1';

  const Menu = {
    S: null,

    load() {
      const saved = U.store.get(STORE_KEY, null);
      const base = C.buildSettings(saved && saved.preset ? saved.preset : 'classico');
      /* preset que mudou de padrão numa versão nova: quem estava nele recebe o valor novo (senão abriria como
         "Personalizado" com o número antigo) */
      if (saved && saved.preset === 'hardcore' && saved.rules && saved.rules.killCooldown === 35) saved.rules.killCooldown = 40;
      if (saved) U.merge(base, saved);
      if (!C.COLOR[base.profile.color]) base.profile.color = 'ciano';
      base.preset = C.matchPreset(base);
      this.S = base;
      return base;
    },
    save() { U.store.set(STORE_KEY, this.S); },

    /* ---------------- som ----------------
       Configurações, pausa e o botão do jogo mexem no mesmo lugar: vale na hora e fica salvo. */
    applySound() {
      const ui = this.S.ui;
      AU.Audio.setEnabled(ui.sound !== false);
      AU.Audio.setVolume((ui.volume == null ? 100 : ui.volume) / 100);
      AU.Audio.setAmbienceOn(ui.ambience !== false);
    },
    setSound(patch) {
      Object.assign(this.S.ui, patch);
      this.save();
      this.applySound();
      const g = AU.App && AU.App.game;
      if (g) Object.assign(g.S.ui, patch);
      if (AU.HUD && AU.HUD.syncSoundBtn) AU.HUD.syncSoundBtn();
    },
    /* som ligado, volume e som ambiente (prefixo: ids únicos em cada tela) */
    soundControls(prefix, change) {
      const ui = this.S.ui;
      const done = () => (change ? change() : null);
      const vol = this.range(prefix + '-vol', 0, 100, 5, () => (ui.volume == null ? 100 : ui.volume), (v) => { this.setSound({ volume: v }); done(); }, (v) => v + '%');
      /* soltou o controle: toca um som para ouvir o volume escolhido */
      vol.querySelector('input').addEventListener('change', () => AU.Audio.play('ok'));
      return h('div', { class: 'grid2 sound-ctl' },
        this.toggle(prefix + '-sound', 'Som', () => ui.sound !== false, (v) => { this.setSound({ sound: v }); done(); }),
        this.toggle(prefix + '-amb', 'Som ambiente das salas', () => ui.ambience !== false, (v) => { this.setSound({ ambience: v }); done(); }, 'Motores, reator, bipes; os efeitos continuam'),
        this.field('Volume', vol));
    },

    /* ---------------- título ---------------- */
    title(root) {
      root.innerHTML = '';
      const beans = h('div', { class: 'title-beans', 'aria-hidden': 'true' });
      ['vermelho', 'azul', 'verde', 'rosa', 'laranja', 'amarelo', 'ciano', 'roxo', 'branco'].forEach((c, i) => {
        beans.appendChild(h('span', { class: 'float-bean', style: { left: 6 + i * 10.5 + '%', animationDelay: -i * 1.7 + 's', animationDuration: 11 + (i % 4) * 2 + 's' }, html: AU.Render.beanSVG(c, { size: 44 + (i % 3) * 14 }) }));
      });
      root.append(beans,
        h('div', { class: 'title-card' },
          h('p', { class: 'eyebrow' }, 'Nave The Skeld · dedução social'),
          h('h1', { class: 'title' }, 'Impostor a Bordo'),
          h('p', { class: 'lede' }, 'Tripulantes controlados por IA com memória, visão limitada e personalidade própria. Ninguém sabe quem é quem, só os impostores se conhecem.'),
          h('div', { class: 'title-actions' },
            h('button', { class: 'btn primary', onclick: () => AU.App.show('create') }, 'Criar partida'),
            h('button', { class: 'btn', onclick: () => { AU.App.quickStart(); } }, 'Partida rápida')),
          h('p', { class: 'fine' }, 'Jogo de fã, sem vínculo com a Innersloth. Funciona offline no navegador.')));
    },

    /* ---------------- criação ---------------- */
    create(root) {
      root.innerHTML = '';
      this.S.preset = C.matchPreset(this.S);
      const sections = [
        ['preset', 'Presets'], ['perfil', 'Seu perfil'], ['sala', 'Sala'], ['regras', 'Regras de jogo'],
        ['funcoes', 'Funções especiais'], ['bots', 'Bots'], ['ia', 'IA das conversas'], ['interface', 'Narração e interface'], ['casa', 'Regras da casa'],
      ];
      const nav = h('nav', { class: 'cfg-nav', 'aria-label': 'Seções' });
      const main = h('div', { class: 'cfg-main' });
      sections.forEach(([id, label], i) => {
        nav.appendChild(h('a', { href: '#cfg-' + id, class: 'cfg-link', onclick: (e) => {
          e.preventDefault();
          const el = document.getElementById('cfg-' + id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } }, h('span', { class: 'num' }, String(i).padStart(2, '0')), label));
      });
      const rerender = () => {
        const y = main.scrollTop;
        this.create(root);
        const m = root.querySelector('.cfg-main');
        if (m) m.scrollTop = y;
      };
      /* qualquer mudança que saia de um preset vira "Personalizado" (e voltar a bater com um preset o destaca de novo) */
      const change = () => {
        this.S.preset = C.matchPreset(this.S);
        this.save();
        summary.textContent = this.summary();
        root.querySelectorAll('.preset[data-id]').forEach((b) => {
          const on = b.dataset.id === this.S.preset;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      };
      main.appendChild(this.secPreset(rerender));
      main.appendChild(this.secProfile(change));
      main.appendChild(this.secRoom(change, rerender));
      main.appendChild(this.secRules(change));
      main.appendChild(this.secRoles(change));
      main.appendChild(this.secBots(change, rerender));
      main.appendChild(this.secAI(change));
      main.appendChild(this.secUI(change));
      main.appendChild(this.secHouse(change));
      const summary = h('div', { class: 'cfg-summary' }, this.summary());
      const foot = h('div', { class: 'cfg-foot' },
        h('button', { class: 'btn ghost', onclick: () => AU.App.show('title') }, '← Voltar'),
        summary,
        h('button', { class: 'btn primary', onclick: () => { this.save(); AU.App.toLobby(true); } }, 'Ir para o lobby →'));
      root.append(h('header', { class: 'cfg-head' }, h('h2', {}, 'Criar partida'), h('p', {}, 'Tudo aqui é opcional: o que você não mudar fica no padrão do preset.')),
        h('div', { class: 'cfg-body' }, nav, main), foot);
    },

    summary() {
      const S = this.S;
      const draw = { A: 'sorteio aleatório', B: 'você é impostor', C: 'você é tripulante', D: S.room.drawChance + '% de chance de ser impostor' }[S.room.draw];
      return `${C.presetName(S.preset)} · ${S.room.players} jogadores · ${S.room.impostors} impostor${S.room.impostors > 1 ? 'es' : ''} · ${draw}`;
    },

    sec(id, title, desc, ...content) {
      return h('section', { class: 'cfg-sec', id: 'cfg-' + id }, h('h3', {}, title), desc ? h('p', { class: 'cfg-desc' }, desc) : null, ...content);
    },

    field(label, control, hint) {
      return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
    },
    toggle(id, label, get, set, hint) {
      const inp = h('input', { type: 'checkbox', id, checked: !!get() });
      inp.addEventListener('change', () => set(inp.checked));
      return h('label', { class: 'toggle', for: id }, inp, h('span', { class: 'sw', 'aria-hidden': 'true' }), h('span', { class: 'toggle-text' }, label, hint ? h('small', {}, hint) : null));
    },
    range(id, min, max, step, get, set, fmt) {
      const out = h('output', { for: id }, fmt ? fmt(get()) : String(get()));
      const inp = h('input', { type: 'range', id, min, max, step, value: String(get()) });
      inp.addEventListener('input', () => {
        const v = +inp.value;
        set(v);
        out.textContent = fmt ? fmt(v) : String(v);
      });
      return h('div', { class: 'range' }, inp, out);
    },
    select(id, opts, get, set) {
      const sel = h('select', { id });
      for (const [v, l] of opts) sel.appendChild(h('option', { value: v, selected: String(get()) === String(v) }, l));
      sel.addEventListener('change', () => set(sel.value));
      return sel;
    },
    seg(name, opts, get, set) {
      const wrap = h('div', { class: 'seg', role: 'radiogroup' });
      for (const [v, l, d] of opts) {
        const id = name + '-' + v;
        const inp = h('input', { type: 'radio', name, id, value: v, checked: String(get()) === String(v) });
        inp.addEventListener('change', () => set(v));
        wrap.appendChild(h('label', { for: id, class: 'seg-opt' }, inp, h('span', {}, l, d ? h('small', {}, d) : null)));
      }
      return wrap;
    },

    secPreset(rerender) {
      const S = this.S;
      const grid = h('div', { class: 'preset-grid' });
      for (const id of Object.keys(C.PRESETS)) {
        const p = C.PRESETS[id];
        grid.appendChild(h('button', {
          class: 'preset' + (S.preset === id ? ' on' : ''), 'aria-pressed': S.preset === id ? 'true' : 'false', 'data-id': id,
          onclick: () => {
            const keep = { profile: U.clone(S.profile), room: U.clone(S.room), ui: U.clone(S.ui) };
            this.S = C.buildSettings(id, keep);
            this.save();
            rerender();
          },
        }, h('strong', {}, p.name), h('span', {}, p.desc)));
      }
      /* não se escolhe: acende sozinho quando as regras não batem com nenhum preset */
      grid.appendChild(h('button', {
        class: 'preset custom' + (S.preset === 'personalizado' ? ' on' : ''), 'aria-pressed': S.preset === 'personalizado' ? 'true' : 'false', 'data-id': 'personalizado',
        title: 'Acende sozinho quando você muda uma regra, função, bot ou regra da casa',
        onclick: () => {
          const el = document.getElementById('cfg-regras');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },
      }, h('strong', {}, 'Personalizado'), h('span', {}, 'Suas próprias regras. Acende sozinho quando você muda algo que não bate com nenhum preset.')));
      return this.sec('preset', 'Presets rápidos', 'Escolher um preset reaplica regras, funções e bots. Seu perfil e a sala são mantidos. Mudou alguma regra? O modo vira Personalizado.', grid);
    },

    secProfile(change) {
      const S = this.S;
      const preview = h('div', { class: 'profile-preview' });
      const drawPrev = () => {
        preview.innerHTML = '';
        const cv = h('canvas', { width: 220, height: 220 });
        preview.appendChild(cv);
        const ctx = cv.getContext('2d');
        AU.Render.drawBean(ctx, 110, 130, 150, S.profile.color, { hat: S.profile.hat, visor: S.profile.visor, facing: 1 });
        AU.Render.drawPet(ctx, 190, 170, 150, S.profile.pet, S.profile.color, 1);
        preview.appendChild(h('div', { class: 'preview-name' }, S.profile.name || 'Jogador'));
      };
      const name = h('input', { type: 'text', id: 'cfg-name', maxlength: '14', value: S.profile.name, autocomplete: 'off' });
      name.addEventListener('input', () => {
        S.profile.name = name.value.trim() || 'Jogador';
        drawPrev();
        change();
      });
      const sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Cor' });
      for (const c of C.COLORS) {
        const b = h('button', {
          class: 'swatch' + (S.profile.color === c.id ? ' on' : ''), title: c.name, 'aria-label': c.name, 'aria-pressed': S.profile.color === c.id ? 'true' : 'false',
          style: { background: c.hex, boxShadow: `inset 0 -6px 0 ${c.shade}` },
          onclick: () => {
            S.profile.color = c.id;
            sw.querySelectorAll('.swatch').forEach((x) => {
              x.classList.remove('on');
              x.setAttribute('aria-pressed', 'false');
            });
            b.classList.add('on');
            b.setAttribute('aria-pressed', 'true');
            drawPrev();
            change();
          },
        });
        sw.appendChild(b);
      }
      const hat = this.select('cfg-hat', C.HATS.map((x) => [x.id, x.name]), () => S.profile.hat, (v) => { S.profile.hat = v; drawPrev(); change(); });
      const visor = this.select('cfg-visor', C.VISORS.map((x) => [x.id, x.name]), () => S.profile.visor, (v) => { S.profile.visor = v; drawPrev(); change(); });
      const pet = this.select('cfg-pet', C.PETS.map((x) => [x.id, x.name]), () => S.profile.pet, (v) => { S.profile.pet = v; drawPrev(); change(); });
      drawPrev();
      return this.sec('perfil', 'Seu perfil', 'Os bots podem citar sua cor e seus cosméticos no chat.',
        h('div', { class: 'profile' }, preview,
          h('div', { class: 'profile-fields' },
            this.field('Nome', name),
            this.field('Cor', sw),
            h('div', { class: 'row3' }, this.field('Chapéu', hat), this.field('Visor', visor), this.field('Pet', pet)))));
    },

    secRoom(change, rerender) {
      const S = this.S;
      const maxImp = () => C.MAX_IMPOSTORS(S.room.players);
      const impWrap = h('div', {});
      const drawImp = () => {
        impWrap.innerHTML = '';
        if (S.room.impostors > maxImp()) S.room.impostors = maxImp();
        const rec = C.RECOMMENDED_IMPOSTORS(S.room.players);
        impWrap.appendChild(this.field('Impostores', this.seg('imp', [1, 2, 3].filter((n) => n <= maxImp()).map((n) => [n, String(n), n === rec ? 'recomendado' : '']), () => S.room.impostors, (v) => { S.room.impostors = +v; change(); })));
      };
      const players = this.range('cfg-players', 4, 15, 1, () => S.room.players, (v) => { S.room.players = v; drawImp(); change(); });
      drawImp();
      const chanceWrap = h('div', { hidden: S.room.draw !== 'D' }, this.field('Chance de você ser impostor', this.range('cfg-chance', 0, 100, 5, () => S.room.drawChance, (v) => { S.room.drawChance = v; change(); }, (v) => v + '%')));
      const draw = this.seg('draw', [
        ['A', 'Aleatório puro', 'Você descobre na tela de revelação'],
        ['B', 'Sempre impostor', 'Bots dividem as vagas restantes'],
        ['C', 'Sempre tripulante', 'Todos os impostores são bots'],
        ['D', 'Personalizada', 'Chance que você escolher'],
      ], () => S.room.draw, (v) => { S.room.draw = v; chanceWrap.hidden = v !== 'D'; change(); });
      return this.sec('sala', 'Sala', null, this.field('Jogadores (você incluído)', players), impWrap, this.field('Sorteio do impostor', draw), chanceWrap);
    },

    secRules(change) {
      const R = this.S.rules;
      const num = (id, label, min, max, step, key, fmt, hint) => this.field(label, this.range(id, min, max, step, () => R[key], (v) => { R[key] = v; change(); }, fmt), hint);
      const sec = (v) => v + 's';
      const x = (v) => (+v).toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + 'x';
      return this.sec('regras', 'Regras de jogo', null,
        h('div', { class: 'grid2' },
          this.toggle('r-confirm', 'Confirmar ejeções', () => R.confirmEjects, (v) => { R.confirmEjects = v; change(); }, 'Revela se o ejetado era impostor'),
          this.toggle('r-anon', 'Votos anônimos', () => R.anonymousVotes, (v) => { R.anonymousVotes = v; change(); }),
          this.toggle('r-visual', 'Tarefas visuais', () => R.visualTasks, (v) => { R.visualTasks = v; change(); }, 'Scan, escudos, asteroides e lixo aparecem para os outros'),
          this.field('Barra de tarefas', this.select('r-bar', [['sempre', 'Sempre'], ['reunioes', 'Só nas reuniões'], ['nunca', 'Nunca']], () => R.taskBar, (v) => { R.taskBar = v; change(); })),
          num('r-meet', 'Reuniões de emergência por jogador', 0, 9, 1, 'emergencyMeetings'),
          num('r-meetcd', 'Recarga do botão de emergência', 0, 60, 5, 'emergencyCooldown', sec),
          num('r-disc', 'Tempo de discussão', 0, 120, 15, 'discussionTime', sec),
          num('r-vote', 'Tempo de votação', 15, 300, 15, 'votingTime', sec),
          num('r-speed', 'Velocidade dos jogadores', 0.5, 3, 0.25, 'playerSpeed', x),
          num('r-crewv', 'Visão do tripulante', 0.25, 5, 0.25, 'crewVision', x),
          num('r-impv', 'Visão do impostor', 0.25, 5, 0.25, 'impostorVision', x),
          num('r-kcd', 'Recarga de abate', 10, 60, 2.5, 'killCooldown', sec),
          this.field('Distância de abate', this.select('r-kd', [['curta', 'Curta'], ['media', 'Média'], ['longa', 'Longa']], () => R.killDistance, (v) => { R.killDistance = v; change(); })),
          num('r-common', 'Tarefas comuns', 0, 2, 1, 'commonTasks'),
          num('r-long', 'Tarefas longas', 0, 3, 1, 'longTasks'),
          num('r-short', 'Tarefas curtas', 0, 5, 1, 'shortTasks'),
          num('r-crit', 'Tempo para consertar reator/O2', 20, 90, 5, 'critTime', sec, 'Se ninguém consertar a tempo, os impostores vencem'),
          num('r-sabcd', 'Espera entre sabotagens', 10, 60, 5, 'sabCooldown', sec, 'Conta a partir do conserto da anterior (no jogo original são 30 s). Portas têm a própria espera'),
          num('r-door', 'Portas trancadas por', 5, 20, 1, 'doorTime', sec),
          num('r-doorcd', 'Recarga das portas (depois de abrir)', 5, 60, 1, 'doorCooldown', sec)));
    },

    secRoles(change) {
      const RL = this.S.roles;
      const list = h('div', { class: 'roles' });
      for (const id of C.ROLE_IDS) {
        const r = C.ROLES[id];
        const cfg = RL[id];
        const desc = h('p', {}, C.roleDesc(id, this.S));
        const extra = (C.ROLE_OPTS[id] || []).map(([key, label, min, max, step]) =>
          this.field(label, this.range('role-' + key + '-' + id, min, max, step, () => cfg[key], (v) => { cfg[key] = v; desc.textContent = C.roleDesc(id, this.S); change(); }, (v) => v + 's')));
        list.appendChild(h('div', { class: 'role-row ' + r.team },
          h('div', { class: 'role-info' }, h('strong', {}, r.name), h('span', { class: 'role-team' }, r.team === 'crew' ? 'Tripulação' : 'Impostor'), desc),
          this.field(id === 'anjo' ? 'Quantidade máxima' : 'Quantidade', this.range('role-n-' + id, 0, id === 'anjo' ? 5 : 3, 1, () => cfg.n, (v) => { cfg.n = v; change(); })),
          this.field(id === 'anjo' ? 'Chance (a cada morte)' : 'Chance', this.range('role-c-' + id, 0, 100, 10, () => cfg.chance, (v) => { cfg.chance = v; change(); }, (v) => v + '%')),
          extra.length ? h('div', { class: 'role-opts' }, extra) : null));
      }
      return this.sec('funcoes', 'Funções especiais', 'Cada vaga sorteia a função com a chance definida no começo da partida. Funções de impostor só vão para impostores. O Anjo da Guarda é diferente, como no jogo original: é sorteado quando um tripulante sem função morre.', list);
    },

    secBots(change, rerender) {
      const B = this.S.bots;
      const custom = h('textarea', { id: 'b-names', rows: 2, placeholder: 'Nomes separados por vírgula', value: B.customNames });
      custom.addEventListener('input', () => { B.customNames = custom.value; change(); });
      const customWrap = h('div', { hidden: B.names !== 'custom' }, custom);
      const allowed = h('div', { class: 'chips', hidden: B.personalities !== 'escolher' });
      for (const id of C.PERSONALITY_IDS) {
        const p = C.PERSONALITIES[id];
        const on = B.allowed.includes(id);
        const b = h('button', {
          class: 'chip-t' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', title: p.desc,
          onclick: () => {
            const i = B.allowed.indexOf(id);
            if (i >= 0) {
              if (B.allowed.length > 1) B.allowed.splice(i, 1);
            } else B.allowed.push(id);
            const now = B.allowed.includes(id);
            b.classList.toggle('on', now);
            b.setAttribute('aria-pressed', now ? 'true' : 'false');
            change();
          },
        }, p.name);
        allowed.appendChild(b);
      }
      const persList = h('ul', { class: 'pers-list' });
      for (const id of C.PERSONALITY_IDS) persList.appendChild(h('li', {}, h('strong', {}, C.PERSONALITIES[id].name), ' — ', C.PERSONALITIES[id].desc));
      const levels = h('div', { class: 'level-grid' });
      for (const id of Object.keys(C.IMP_LEVELS)) {
        const L = C.IMP_LEVELS[id];
        const inp = h('input', { type: 'radio', name: 'implvl', id: 'lvl-' + id, value: id, checked: B.impostorLevel === id });
        inp.addEventListener('change', () => { B.impostorLevel = id; change(); });
        levels.appendChild(h('label', { class: 'level', for: 'lvl-' + id }, inp, h('span', {}, h('strong', {}, L.name), h('small', {}, L.desc))));
      }
      return this.sec('bots', 'Comportamento dos bots', null,
        h('div', { class: 'grid2' },
          this.field('Nomes dos bots', this.seg('bnames', [['auto', 'Automáticos'], ['custom', 'Você define']], () => B.names, (v) => { B.names = v; customWrap.hidden = v !== 'custom'; change(); })),
          this.field('Personalidades', this.select('b-pers', [['sorteadas', 'Sorteadas sem repetir'], ['escolher', 'Você escolhe quais entram'], ['manual', 'Você atribui no lobby'], ['caos', 'Puxadas para o caos']], () => B.personalities, (v) => { B.personalities = v; allowed.hidden = v !== 'escolher'; change(); }))),
        customWrap, allowed,
        h('details', { class: 'pers-details' }, h('summary', {}, 'Ver as 10 personalidades'), persList),
        this.field('Nível dos impostores controlados por IA', levels),
        h('div', { class: 'grid3' },
          this.field('Erro humano', this.seg('berr', Object.keys(C.HUMAN_ERROR).map((k) => [k, C.HUMAN_ERROR[k].name]), () => B.humanError, (v) => { B.humanError = v; change(); }), 'Atenção, memória e confusão de cores'),
          (() => {
            /* a explicação do tom acompanha a escolha */
            const hint = h('span', { class: 'field-hint' }, C.CHAT_TONE_HINT[B.chatTone] || '');
            const seg = this.seg('btone', Object.keys(C.CHAT_TONES).map((k) => [k, C.CHAT_TONES[k]]), () => B.chatTone, (v) => {
              B.chatTone = v;
              hint.textContent = C.CHAT_TONE_HINT[v] || '';
              change();
            });
            return h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Tom do chat'), seg, hint);
          })(),
          this.field('Ritmo do chat', this.seg('bpace', Object.keys(C.CHAT_PACE).map((k) => [k, C.CHAT_PACE[k].name]), () => B.chatPace, (v) => { B.chatPace = v; change(); }))));
    },

    /* Status da IA numa linha, atualizado ao vivo. */
    aiStatusEl() {
      const L = AU.LLM;
      const el = h('div', { class: 'ai-status' });
      const bar = h('div', { class: 'ai-bar' }, h('div', {}));
      const txt = h('span', {});
      const btn = h('button', { class: 'btn ai-retry', type: 'button', hidden: true, onclick: () => (L.status === 'available' ? L.warmup() : L.retry()) }, '');
      el.append(h('span', { class: 'ai-dot' }), txt, btn, bar);
      const paint = () => {
        el.className = 'ai-status ' + L.status;
        const who = L.provider ? L.label() : 'regras';
        const head = { ready: 'IA ativa: ' + who, available: 'IA disponível: ' + who, loading: 'Preparando a IA…', limited: 'IA pausada (limite de uso)', error: 'IA com problema', off: 'IA desligada' }[L.status] || L.status;
        txt.textContent = head + (L.detail ? ' — ' + L.detail : '');
        const act = { available: 'Ativar agora', limited: 'Tentar de novo', error: 'Tentar de novo' }[L.status];
        btn.hidden = !act || (L.status === 'available' && L.provider !== 'claude');
        btn.textContent = act || '';
        bar.hidden = L.status !== 'loading';
        bar.firstChild.style.width = Math.round((L.progress || 0) * 100) + '%';
      };
      paint();
      const off = L.onChange(() => {
        if (!el.isConnected) return off();
        paint();
      });
      return el;
    },

    /* mente própria: cada bot com uma IA só dele (vale mais que "votos e ações", que é a IA comandando o time) */
    mindField(UI, change) {
      return this.field('Mente dos bots', this.seg('ai-mind', Object.keys(C.AI_MIND).map((k) => [k, C.AI_MIND[k]]), () => UI.aiMind || 'on', (v) => { UI.aiMind = v; change(); }),
        'Com mente própria, cada bot é uma IA separada: só sabe o que viu, decide sozinho para onde ir, quem seguir, quando chamar reunião ou fazer o sinal de "vem comigo", o que falar e em quem votar. O corpo (andar, regras) continua sendo o jogo. Usa bem mais IA; se ela cair ou atingir o limite, os bots voltam ao sistema de regras sozinhos.');
    },

    secAI(change) {
      const L = AU.LLM, cfg = L.cfg, UI = this.S.ui;
      const inClaude = L.inClaude;
      const body = h('div', { class: 'ai-body' });
      const draw = () => {
        body.innerHTML = '';
        if (inClaude) {
          body.appendChild(this.field('Fonte da IA', this.seg('ai-mode', [['auto', 'Claude', 'Grátis pelo seu acesso ao claude.ai'], ['off', 'Desligada', 'Só o sistema de regras']], () => (cfg.mode === 'off' ? 'off' : 'auto'), (v) => {
            cfg.mode = v;
            L.save();
            L.applyMode(false);
            draw();
          })));
          body.append(
            h('p', { class: 'cfg-desc' }, 'Você abriu o jogo pelo claude.ai: os bots conversam usando o Claude, sem instalar nada. Na primeira vez o claude.ai mostra um aviso pedindo permissão; é só aceitar. As mensagens contam no seu uso do Claude.'),
            h('p', { class: 'cfg-desc' }, 'Dentro do claude.ai a página não tem acesso à internet, então o modelo no navegador e as APIs grátis só aparecem quando você abre o arquivo do jogo direto no navegador (veja o README).'),
            h('div', { class: 'row-btns' }, h('button', { class: 'btn', type: 'button', onclick: async () => {
              if (cfg.mode === 'off') {
                cfg.mode = 'auto';
                L.save();
                draw();
              }
              await L.applyMode(false);
              L.test();
            } }, 'Ativar e testar o Claude')));
          body.appendChild(this.field('Uso da IA nas reuniões', this.seg('ai-use', Object.keys(C.AI_CHAT).map((k) => [k, C.AI_CHAT[k]]), () => UI.aiChat, (v) => { UI.aiChat = v; change(); })));
          body.appendChild(this.mindField(UI, change));
          body.appendChild(this.field('Votos e ações dos bots', this.seg('ai-act', Object.keys(C.AI_ACTIONS).map((k) => [k, C.AI_ACTIONS[k]]), () => UI.aiActions || 'on', (v) => { UI.aiActions = v; change(); }), 'Vale com a mente própria desligada: a IA escolhe em quem votar, o que fazer, quem seguir e (os impostores) quando sabotar e quem caçar. Usa mais o seu Claude.'));
          return;
        }
        const modes = [['auto', 'Automático', 'Usa o que estiver configurado abaixo']];
        modes.push(['webllm', 'Modelo no navegador', 'Grátis, roda no seu computador']);
        modes.push(['api', 'API grátis', 'OpenRouter, Groq, Gemini ou Ollama']);
        modes.push(['off', 'Desligada', 'Só o sistema de regras']);
        body.appendChild(this.field('Fonte da IA', this.seg('ai-mode', modes, () => cfg.mode, (v) => {
          cfg.mode = v;
          L.save();
          L.applyMode(false);
          draw();
        })));
        const showWeb = cfg.mode === 'webllm' || (cfg.mode === 'auto' && !inClaude && !cfg.key);
        const showApi = cfg.mode === 'api' || (cfg.mode === 'auto' && !inClaude && !!cfg.key);
        if (showWeb) {
          const sel = this.select('ai-web-model', L.WEBLLM_MODELS.map((m) => [m.id, m.name + ' — ' + m.note]), () => cfg.webllmModel, (v) => {
            cfg.webllmModel = v;
            L.engine = null;
            L.save();
          });
          const btn = h('button', { class: 'btn', type: 'button', onclick: () => {
            cfg.mode = cfg.mode === 'auto' ? 'webllm' : cfg.mode;
            L.save();
            L.loadWebLLM();
          } }, L.engine ? 'Modelo carregado' : 'Baixar e ativar');
          body.append(
            h('p', { class: 'cfg-desc' }, L.hasWebGPU
              ? 'Um modelo de linguagem gratuito que roda no seu próprio computador, sem conta e sem enviar nada para a internet. O download acontece só uma vez e fica guardado no navegador. Precisa de uma placa de vídeo razoável.'
              : 'Este navegador não tem WebGPU, que o modelo local precisa. Use Chrome ou Edge atualizados num computador, ou escolha "API grátis".'),
            this.field('Modelo', sel), h('div', { class: 'row-btns' }, btn));
        }
        if (showApi || cfg.mode === 'api') {
          const P = L.API_PRESETS;
          const presetSel = this.select('ai-preset', Object.keys(P).map((k) => [k, P[k].name]), () => cfg.preset, (v) => {
            cfg.preset = v;
            cfg.base = P[v].base;
            cfg.model = P[v].model;
            L.save();
            L.applyMode(false);
            draw();
          });
          const base = h('input', { type: 'text', id: 'ai-base', value: cfg.base, placeholder: 'https://…/v1', autocomplete: 'off' });
          base.addEventListener('change', () => { cfg.base = base.value.trim(); L.save(); L.applyMode(false); });
          const key = h('input', { type: 'password', id: 'ai-key', value: cfg.key, placeholder: P[cfg.preset] && P[cfg.preset].needsKey ? 'cole sua chave aqui' : 'opcional', autocomplete: 'off' });
          key.addEventListener('change', () => { cfg.key = key.value.trim(); L.save(); L.applyMode(false); });
          const dl = h('datalist', { id: 'ai-models' });
          const model = h('input', { type: 'text', id: 'ai-model', value: cfg.model, list: 'ai-models', placeholder: 'nome do modelo', autocomplete: 'off' });
          model.addEventListener('change', () => { cfg.model = model.value.trim(); L.save(); L.applyMode(false); });
          const msg = h('span', { class: 'fine' }, '');
          const listBtn = h('button', { class: 'btn', type: 'button', onclick: async () => {
            msg.textContent = 'Buscando modelos…';
            try {
              const list = await L.listModels();
              dl.innerHTML = '';
              list.slice(0, 200).forEach((id) => dl.appendChild(h('option', { value: id })));
              msg.textContent = list.length + ' modelos encontrados' + (list.some((id) => /:free$/.test(id)) ? ' (os grátis aparecem primeiro).' : '.');
              if (!cfg.model && list[0]) {
                cfg.model = list[0];
                model.value = list[0];
                L.save();
                L.applyMode(false);
              }
            } catch (e) {
              msg.textContent = 'Não consegui listar: ' + e.message;
            }
          } }, 'Listar modelos');
          const testBtn = h('button', { class: 'btn', type: 'button', onclick: async () => {
            cfg.mode = cfg.mode === 'auto' ? 'api' : cfg.mode;
            L.save();
            await L.applyMode(false);
            L.test();
          } }, 'Testar');
          const pr = P[cfg.preset];
          body.append(
            h('p', { class: 'cfg-desc' }, 'Serviços com plano gratuito: crie uma chave no site do serviço e cole abaixo. A chave fica guardada só neste navegador e as conversas da reunião são enviadas para esse serviço.'),
            h('div', { class: 'grid2' },
              this.field('Serviço', presetSel, pr && pr.keyUrl ? h('span', {}, 'Criar chave: ', h('a', { href: pr.keyUrl, target: '_blank', rel: 'noopener' }, pr.keyUrl.replace(/^https?:\/\//, ''))) : null),
              this.field('Endereço (base URL)', base),
              this.field('Chave da API', key),
              this.field('Modelo', h('div', {}, model, dl))),
            h('div', { class: 'row-btns' }, listBtn, testBtn, msg));
        }
        body.appendChild(this.field('Uso da IA nas reuniões', this.seg('ai-use', Object.keys(C.AI_CHAT).map((k) => [k, C.AI_CHAT[k]]), () => UI.aiChat, (v) => { UI.aiChat = v; change(); })));
        body.appendChild(this.mindField(UI, change));
        body.appendChild(this.field('Votos e ações dos bots', this.seg('ai-act', Object.keys(C.AI_ACTIONS).map((k) => [k, C.AI_ACTIONS[k]]), () => UI.aiActions || 'on', (v) => { UI.aiActions = v; change(); }), 'Vale com a mente própria desligada: a IA escolhe em quem votar, o que fazer, quem seguir e (os impostores) quando sabotar e quem caçar.'));
      };
      draw();
      const off = L.onChange(() => {
        if (!body.isConnected) return off();
        const b = body.querySelector('.row-btns .btn');
        if (b && L.engine && b.textContent === 'Baixar e ativar') b.textContent = 'Modelo carregado';
      });
      return this.sec('ia', 'IA das conversas', 'Com IA, os bots respondem de verdade ao que você escreve na reunião, cada um com a própria personalidade e só com o que viu. Sem IA, eles usam o sistema de regras.', this.aiStatusEl(), body);
    },

    secUI(change) {
      const UI = this.S.ui;
      return this.sec('interface', 'Narração e interface', null,
        h('div', { class: 'grid2' },
          this.field('Narrador', this.seg('ui-narr', Object.keys(C.NARRATION).map((k) => [k, C.NARRATION[k]]), () => UI.narration, (v) => { UI.narration = v; change(); }), 'Descrições de salas, sabotagens e ambiente'),
          this.toggle('ui-report', 'Relatório final', () => UI.finalReport, (v) => { UI.finalReport = v; change(); }, 'Revela funções e a linha do tempo completa')),
        this.soundControls('ui', change));
    },

    secHouse(change) {
      const Hs = this.S.house;
      const custom = h('input', { type: 'text', id: 'house-custom', maxlength: '80', value: Hs.custom, placeholder: 'Ex.: ninguém fica nas câmeras no começo' });
      custom.addEventListener('input', () => { Hs.custom = custom.value; change(); });
      return this.sec('casa', 'Regras da casa', 'São aplicadas a você e aos bots.',
        h('div', { class: 'grid2' },
          this.toggle('h-dk', 'Proibido abate duplo com o parceiro', () => Hs.noDoubleKill, (v) => { Hs.noDoubleKill = v; change(); }),
          this.toggle('h-vc', 'Sem entrar no duto na frente de alguém', () => Hs.noVentChase, (v) => { Hs.noVentChase = v; change(); }),
          this.toggle('h-crit', 'Sabotagem crítica só após o 1º corpo', () => Hs.critAfterFirstBody, (v) => { Hs.critAfterFirstBody = v; change(); }),
          this.toggle('h-vis', 'Tarefa visual não inocenta de vez', () => Hs.noVisualHardClear, (v) => { Hs.noVisualHardClear = v; change(); }),
          this.toggle('h-sr', 'Proibido self-report', () => Hs.noSelfReport, (v) => { Hs.noSelfReport = v; change(); })),
        this.field('Regra personalizada (mostrada na pausa)', custom));
    },

    /* ---------------- lobby ---------------- */
    buildRoster(S, keep) {
      const n = S.room.players;
      const human = { name: S.profile.name || 'Jogador', color: S.profile.color, hat: S.profile.hat, visor: S.profile.visor, pet: S.profile.pet, isHuman: true };
      let names = S.bots.names === 'custom' ? S.bots.customNames.split(',').map((x) => x.trim()).filter(Boolean) : [];
      names = names.concat(U.shuffle(C.BOT_NAMES)).filter((x, i, a) => a.indexOf(x) === i && U.norm(x) !== U.norm(human.name));
      const colors = U.shuffle(C.COLORS.map((c) => c.id).filter((c) => c !== human.color));
      let pool;
      if (S.bots.personalities === 'escolher') pool = S.bots.allowed.slice();
      else if (S.bots.personalities === 'caos') pool = ['caotico', 'falador', 'impulsivo', 'caotico', 'falador', 'inexperiente', 'impulsivo', 'caotico', 'lider', 'cetico'];
      else pool = C.PERSONALITY_IDS.slice();
      let bag = [];
      const roster = [human];
      for (let i = 0; i < n - 1; i++) {
        if (!bag.length) bag = U.shuffle(pool);
        const prev = keep && keep[i + 1];
        roster.push({
          name: prev ? prev.name : names[i % names.length],
          color: prev && prev.color !== human.color ? prev.color : colors[i % colors.length],
          personality: prev && prev.personality ? prev.personality : bag.pop(),
          hat: prev ? prev.hat : U.chance(0.45) ? U.pick(C.HATS.slice(1)).id : 'nenhum',
          visor: 'classico',
          pet: prev ? prev.pet : U.chance(0.15) ? U.pick(C.PETS.slice(1)).id : 'nenhum',
        });
      }
      const used = new Set([human.color]);
      for (const r of roster.slice(1)) {
        if (used.has(r.color)) r.color = C.COLORS.map((c) => c.id).find((c) => !used.has(c));
        used.add(r.color);
      }
      return roster;
    },

    lobby(root, roster) {
      const S = this.S;
      root.innerHTML = '';
      const grid = h('div', { class: 'lobby-grid' });
      const manual = S.bots.personalities === 'manual';
      const redraw = () => this.lobby(root, roster);
      roster.forEach((r, i) => {
        const card = h('div', { class: 'lobby-card' + (r.isHuman ? ' me' : '') });
        card.appendChild(h('div', { class: 'lobby-bean', html: AU.Render.beanSVG(r.color, { size: 56, visor: r.visor }) }));
        if (r.isHuman) {
          card.appendChild(h('div', { class: 'lobby-info' }, h('strong', {}, r.name + ' (você)'), h('span', {}, C.COLOR[r.color].name)));
        } else {
          const nm = h('input', { type: 'text', class: 'lobby-name', id: 'bot-name-' + i, maxlength: '12', value: r.name, 'aria-label': 'Nome do bot' });
          nm.addEventListener('input', () => (r.name = nm.value.trim() || r.name));
          const col = h('select', { class: 'lobby-color', id: 'bot-color-' + i, 'aria-label': 'Cor do bot' });
          const taken = new Set(roster.filter((x) => x !== r).map((x) => x.color));
          for (const c of C.COLORS) if (!taken.has(c.id)) col.appendChild(h('option', { value: c.id, selected: c.id === r.color }, c.name));
          col.addEventListener('change', () => {
            r.color = col.value;
            redraw();
          });
          let pers;
          if (manual) {
            pers = h('select', { class: 'lobby-pers', id: 'bot-pers-' + i, 'aria-label': 'Personalidade' });
            for (const id of C.PERSONALITY_IDS) pers.appendChild(h('option', { value: id, selected: id === r.personality }, C.PERSONALITIES[id].name));
            pers.addEventListener('change', () => (r.personality = pers.value));
          } else pers = h('span', { class: 'lobby-pers-label', title: C.PERSONALITIES[r.personality].desc }, C.PERSONALITIES[r.personality].name);
          card.appendChild(h('div', { class: 'lobby-info' }, nm, h('div', { class: 'lobby-row' }, col, pers)));
        }
        grid.appendChild(card);
      });
      /* chat do lobby: você digita, os bots conversam e respondem (a conversa sobrevive a trocar cor/nome) */
      const chat = h('div', { class: 'lobby-chat', 'aria-live': 'polite' });
      if (!this._lobbyChat || this._lobbyChat.roster !== roster) {
        if (this._lobbyChat) this._lobbyChat.stop();
        this._lobbyChat = AU.Lobby.create(roster, S);
      }
      const lc = this._lobbyChat;
      const nameCol = (r) => {
        const hex = C.COLOR[r.color].hex, n = parseInt(hex.slice(1), 16);
        const lum = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
        return lum < 90 ? '#aab4c4' : hex;
      };
      const show = (m) => {
        if (!chat.isConnected && chat.childElementCount) return;
        const atBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 40;
        chat.appendChild(h('div', { class: 'lobby-line' + (m.from.isHuman ? ' mine' : '') }, h('b', { style: { color: nameCol(m.from) } }, m.from.name + ': '), m.text));
        while (chat.children.length > 60) chat.firstChild.remove();
        if (atBottom || m.from.isHuman) chat.scrollTop = chat.scrollHeight;
      };
      lc.msgs.forEach(show);
      lc.start(show);
      lc.onMsg = show;
      const input = h('input', { class: 'lobby-input', type: 'text', maxlength: '160', placeholder: 'Diga algo no lobby…', autocomplete: 'off', 'aria-label': 'Mensagem no chat do lobby' });
      const form = h('form', {
        class: 'lobby-form',
        onsubmit: (ev) => {
          ev.preventDefault();
          const v = input.value.trim();
          if (!v) return;
          input.value = '';
          lc.onHuman(v);
        },
      }, input, h('button', { class: 'btn small', type: 'submit' }, 'Enviar'));
      root.append(
        h('header', { class: 'cfg-head' }, h('h2', {}, 'Lobby'), h('p', {}, this.summary())),
        h('div', { class: 'lobby-body' }, grid, h('aside', { class: 'lobby-side' }, h('h3', {}, 'Chat do lobby'), chat, form,
          h('p', { class: 'fine' }, manual ? 'Atribua a personalidade de cada bot antes de começar.' : 'As personalidades não mudam durante a partida. As funções só são sorteadas ao começar.'),
          h('h3', { class: 'lobby-ai-h' }, 'IA das conversas'), this.aiStatusEl(),
          h('p', { class: 'fine' }, 'Para trocar a fonte da IA, volte às configurações.'))),
        h('div', { class: 'cfg-foot' },
          h('button', { class: 'btn ghost', onclick: () => { lc.stop(); this._lobbyChat = null; AU.App.show('create'); } }, '← Configurações'),
          h('button', { class: 'btn', onclick: () => { AU.App.roster = this.buildRoster(S); this.lobby(root, AU.App.roster); } }, 'Sortear bots de novo'),
          h('button', { class: 'btn primary', onclick: () => { lc.stop(); this._lobbyChat = null; AU.App.startGame(); } }, 'Começar partida →')));
    },

    /* ---------------- revelação ---------------- */
    reveal(root, g, done) {
      root.innerHTML = '';
      const hp = g.human;
      const imp = hp.isImp;
      const nImp = g.players.filter((p) => p.isImp).length;
      const team = imp ? g.players.filter((p) => p.isImp) : g.players;
      const row = h('div', { class: 'reveal-row' });
      team.forEach((p, i) => row.appendChild(h('div', { class: 'reveal-p' + (p === hp ? ' me' : ''), style: { animationDelay: 0.15 + i * 0.06 + 's' } }, h('span', { html: AU.Render.beanSVG(p.color, { size: p === hp ? 110 : 70, visor: p.visor }) }), h('span', { class: imp ? 'imp' : '' }, p.name))));
      const sp = hp.special ? C.ROLES[hp.special] : null;
      root.append(h('div', { class: 'reveal ' + (imp ? 'imp' : 'crew') },
        h('div', { class: 'reveal-sub' }, imp ? (nImp > 1 ? 'Você e seu parceiro' : 'Elimine a tripulação sem ser descoberto') : `Há ${nImp} impostor${nImp > 1 ? 'es' : ''} entre nós`),
        h('div', { class: 'reveal-title' }, imp ? 'Impostor' : 'Tripulante'),
        sp ? h('div', { class: 'reveal-role' }, sp.name + ': ' + sp.desc) : null,
        row,
        h('div', { class: 'reveal-draw' }, this.drawNote(g, nImp)),
        h('button', { class: 'btn primary', onclick: () => done() }, 'Começar')));
      AU.Audio.play('reveal');
      this._revealT = setTimeout(done, 6500);
    },

    /* como foi o sorteio desta partida (para dar para conferir que é justo) */
    drawNote(g, nImp) {
      const S = g.S, n = g.players.length, d = S.room.draw;
      const pct = (x) => Math.round(x) + '%';
      if (d === 'B') return 'Sorteio: você sempre impostor (configuração da sala).';
      if (d === 'C') return 'Sorteio: você sempre tripulante (configuração da sala).';
      if (d === 'D') return 'Sorteio personalizado: ' + pct(S.room.drawChance || 0) + ' de chance de você ser impostor.';
      return 'Sorteio aleatório puro: cada um dos ' + n + ' tinha ' + pct((100 * nImp) / n) + ' de chance de ser impostor.';
    },

    /* ---------------- fim ---------------- */
    end(root, g) {
      root.innerHTML = '';
      const hp = g.human;
      const won = hp ? (g.winner === 'impostor') === hp.isImp : false;
      const name = (id) => (id == null ? 'alguém' : g.players[id].name);
      const area = (a) => (M.AREA[a] ? M.AREA[a].name : a);
      const fate = (p) => {
        if (p.alive) return 'Sobreviveu';
        if (p.ejected) return 'Ejetado aos ' + U.fmtTime(p.deathT);
        return (p.killerId == null ? 'Morreu' : 'Morto por ' + name(p.killerId)) + ' aos ' + U.fmtTime(p.deathT);
      };
      const rows = g.players.map((p) => {
        const done = p.tasks.filter((t) => t.done).length;
        const b = p.brain;
        let top = '';
        if (b && !p.isImp && b.lastTop && b.lastTop.id != null) top = name(b.lastTop.id) + ' (' + Math.round(b.lastTop.s) + ')';
        return h('tr', { class: p.isImp ? 'imp' : '' },
          h('td', {}, h('span', { class: 'cell-bean', html: AU.Render.beanSVG(p.color, { size: 28, visor: p.visor, x: !p.alive }) }), p.name + (p.isHuman ? ' (você)' : '')),
          h('td', {}, p.isImp ? 'Impostor' : 'Tripulante', p.special ? h('small', {}, C.ROLES[p.special].name) : null),
          h('td', {}, p.personality ? C.PERSONALITIES[p.personality].name : '—', b && !p.isImp && b.habits && b.habits.length ? h('small', { title: b.habits.map((k) => C.HABITS[k].name).join(', ') }, b.habits.map((k) => C.HABITS[k].short).join(' · ')) : null),
          h('td', {}, fate(p)),
          h('td', { class: 'num' }, p.isImp ? '—' : done + '/' + p.tasks.length),
          h('td', {}, top || '—'));
      });
      const SAB = { lights: 'Luzes', reactor: 'Reator', o2: 'O2', comms: 'Comunicações' };
      const tl = h('ol', { class: 'timeline' });
      for (const e of g.events) {
        let txt = null, cls = '';
        switch (e.type) {
          case 'start': txt = 'Partida iniciada na Cafeteria.'; break;
          case 'kill':
            txt = `${name(e.killer)} matou ${name(e.victim)} em ${area(e.area)}` + (e.apparent !== e.killer ? ` (disfarçado de ${name(e.apparent)})` : '') + '.' + (e.witnesses.length ? ' Testemunhas: ' + e.witnesses.map(name).join(', ') + '.' : ' Ninguém viu.');
            cls = 'kill';
            break;
          case 'report': txt = `${name(e.by)} reportou o corpo de ${name(e.victim)} em ${area(e.area)}.`; cls = 'meet'; break;
          case 'emergency': txt = `${name(e.by)} apertou o botão de emergência.`; cls = 'meet'; break;
          case 'vote': {
            if (e.ejected != null) {
              const p = g.players[e.ejected];
              txt = `Reunião ${e.index}: ${p.name} foi ejetado (${p.isImp ? 'impostor' : 'tripulante'}).`;
            } else txt = `Reunião ${e.index}: ninguém foi ejetado${e.tie ? ' (empate)' : ''}.`;
            const who = Object.keys(e.votes || {}).map((v) => `${name(+v)}→${e.votes[v] === 'skip' ? 'pulou' : name(e.votes[v])}`);
            if (who.length) txt += ' Votos: ' + who.join(', ') + '.';
            cls = 'meet';
            break;
          }
          case 'sabotage': txt = `${name(e.by)} sabotou: ${SAB[e.sab]}.`; cls = 'sab'; break;
          case 'sabFix': txt = e.meeting ? `${SAB[e.sab]} resolvido pela reunião.` : `${SAB[e.sab]} consertado${e.by != null ? ' por ' + name(e.by) : ''} em ${Math.round(e.dur)}s.`; break;
          case 'doors': txt = `${name(e.by)} trancou as portas de ${area(e.room)}.`; cls = 'sab'; break;
          case 'vent':
            if (e.dir === 'in') txt = `${name(e.by)} entrou no duto em ${area(M.VENT[e.vent].area)}.` + (e.witnesses.length ? ' Visto por ' + e.witnesses.map(name).join(', ') + '.' : '');
            break;
          case 'shift': txt = `${name(e.by)} se transformou em ${name(e.into)}.`; break;
          case 'vanish': txt = `${name(e.by)} ficou invisível.`; break;
          case 'angel': txt = `${name(e.who)} virou Anjo da Guarda.`; break;
          case 'protect': txt = `${name(e.by)} protegeu ${name(e.target)}.`; break;
          case 'protectBlock': txt = `O escudo de ${name(e.victim)} bloqueou um ataque de ${name(e.killer)}.`; break;
          case 'track': txt = `${name(e.by)} rastreou ${name(e.target)}.`; break;
          case 'end': txt = (e.winner === 'crew' ? 'Tripulação vence: ' : 'Impostores vencem: ') + e.reason; cls = 'end'; break;
          default: break;
        }
        if (txt) tl.appendChild(h('li', { class: cls }, h('time', {}, U.fmtTime(e.t)), h('span', {}, txt)));
      }
      const show = g.S.ui.finalReport;
      root.append(
        h('div', { class: 'end-head ' + (won ? 'win' : 'lose') },
          h('div', { class: 'end-title' }, won ? 'Vitória' : 'Derrota'),
          h('div', { class: 'end-sub' }, (g.winner === 'crew' ? 'A tripulação venceu. ' : 'Os impostores venceram. ') + g.endReason)),
        show ? h('div', { class: 'end-body' },
          h('div', { class: 'end-table-wrap' }, h('table', { class: 'end-table' },
            h('thead', {}, h('tr', {}, h('th', {}, 'Jogador'), h('th', {}, 'Função'), h('th', {}, 'Personalidade'), h('th', {}, 'Destino'), h('th', { class: 'num' }, 'Tarefas'), h('th', {}, 'Principal suspeito na última reunião'))),
            h('tbody', {}, rows))),
          h('h3', {}, 'Linha do tempo'), tl,
          (g.meetingLog || []).length ? h('h3', {}, 'Conversas das reuniões') : null,
          (g.meetingLog || []).filter((mt) => mt.closed).map((mt) => AU.MeetingView.historyElement(g, mt))) : h('p', { class: 'fine' }, 'Relatório final desativado nas configurações.'),
        h('div', { class: 'cfg-foot' },
          h('button', { class: 'btn ghost', onclick: () => AU.App.show('title') }, 'Menu inicial'),
          h('button', { class: 'btn', onclick: () => AU.App.toLobby(false) }, 'Voltar ao lobby'),
          h('button', { class: 'btn primary', onclick: () => AU.App.startGame() }, 'Jogar de novo')));
      AU.Audio.play(won ? 'win' : 'lose');
    },
  };

  AU.Menu = Menu;
})();

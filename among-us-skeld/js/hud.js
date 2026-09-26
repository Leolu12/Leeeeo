/* HUD em jogo: tarefas, ações, mapa, câmeras, admin, vitais, narrador e controles de toque. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;
  const h = U.h;

  const ROOM_TEXT = {
    cafeteria: 'A Cafeteria cheira a café requentado. O botão de emergência repousa sob a cúpula de vidro, no centro das mesas.',
    weapons: 'Em Armas, o assento do canhão gira devagar diante da janela; lá fora, poeira de asteroides cintila.',
    o2: 'O O2 zumbe com o ruído dos filtros. Plantas hidropônicas balançam sob a luz branca.',
    navigation: 'Na Navegação, o painel projeta a rota sobre a escuridão. Estrelas escorrem pela janela.',
    shields: 'Os Escudos pulsam em hexágonos azulados. O ar aqui é mais frio.',
    comms: 'Em Comunicações, as antenas estalam com estática e vozes distantes que não formam palavras.',
    storage: 'O Depósito é um labirinto de caixotes. Cada sombra parece esconder alguém.',
    admin: 'No Admin, o mapa holográfico pisca pontos verdes sem dizer a quem pertencem.',
    electrical: 'A Elétrica é apertada e escura. Cabos pendurados zumbem e o painel de distribuição pisca em âmbar.',
    lowerEngine: 'O Motor Inferior ronca alto o bastante para abafar passos.',
    upperEngine: 'O Motor Superior vibra sob os pés; o calor sobe pelas grades.',
    reactor: 'O Reator brilha num azul intenso. Dois scanners de mão aguardam nas paredes.',
    security: 'Na Segurança, os monitores mostram corredores em preto e verde.',
    medbay: 'A MedBay tem cheiro de antisséptico. O scanner no chão emite um anel verde suave.',
  };
  const AMBIENT = [
    'Um duto range em algum lugar da nave.',
    'As luzes do corredor oscilam por um instante.',
    'O casco estala com a mudança de temperatura.',
    'Passos metálicos ecoam, longe demais para saber de onde vêm.',
    'A ventilação sopra ar frio contra o seu visor.',
    'O ronco dos motores muda de rotação.',
    'Um bipe baixo soa no painel mais próximo e silencia.',
  ];
  const SAB_TEXT = {
    lights: 'As luzes se apagam. Só a lanterna do capacete ilumina alguns passos à frente.',
    reactor: 'Sirenes! O núcleo do Reator entra em colapso: alguém precisa segurar os dois scanners ao mesmo tempo.',
    o2: 'Alerta de oxigênio: o ar começa a rarear. Os teclados do O2 e do Admin precisam do código.',
    comms: 'A estática toma os fones. Lista de tarefas, câmeras e Admin ficam cegos.',
  };
  const SAB_NAME = { lights: 'Luzes', reactor: 'Colapso do reator', o2: 'Oxigênio esgotando', comms: 'Comunicações' };

  const HUD = {
    g: null,
    el: {},
    overlay: null,
    feed: [],
    visited: new Set(),
    ambientT: 60,
    lastArea: null,
    seenBodies: new Set(),

    mount(root, g) {
      this.g = g;
      this.visited = new Set();
      this.seenBodies = new Set();
      this.ambientT = U.rf(40, 70);
      this.lastArea = null;
      this.feed = [];
      root.innerHTML = '';
      const e = this.el;
      e.taskList = h('ul', { class: 'hud-task-list' });
      e.taskBar = h('div', { class: 'hud-taskbar' }, h('div', { class: 'fill' }), h('span', { class: 'label' }, 'Tarefas concluídas'));
      e.role = h('div', { class: 'hud-role' });
      e.tasksToggle = h('button', { class: 'hud-collapse', 'aria-label': 'Recolher tarefas', onclick: () => e.tasks.classList.toggle('collapsed') }, '▾');
      e.tasks = h('div', { class: 'hud-tasks' }, h('div', { class: 'hud-tasks-head' }, e.role, e.tasksToggle), e.taskBar, e.taskList);
      e.sab = h('div', { class: 'hud-sab', hidden: true });
      e.toast = h('div', { class: 'hud-toast', 'aria-live': 'polite' });
      e.feedBox = h('div', { class: 'hud-feed', 'aria-live': 'polite' });
      e.mapBtn = h('button', { class: 'hud-btn', title: 'Mapa (M)', onclick: () => this.toggleMap() }, '🗺', h('span', {}, 'Mapa'));
      e.soundBtn = h('button', { class: 'hud-btn', title: 'Som', onclick: () => this.toggleSound() }, AU.Audio.enabled ? '🔊' : '🔈', h('span', {}, 'Som'));
      e.menuBtn = h('button', { class: 'hud-btn', title: 'Menu (Esc)', onclick: () => this.openPause() }, '☰', h('span', {}, 'Menu'));
      e.histBtn = h('button', { class: 'hud-btn', title: 'Conversas das reuniões (H)', onclick: () => this.openHistory() }, '📜', h('span', {}, 'Chats'));
      const topRight = h('div', { class: 'hud-topright' }, e.mapBtn, e.histBtn, e.soundBtn, e.menuBtn);
      const act = (id, icon, label, key, fn, cls) => {
        const cd = h('span', { class: 'cd' });
        const b = h('button', { class: 'act ' + (cls || ''), 'data-act': id, onclick: fn, title: label + ' (' + key + ')' },
          h('span', { class: 'ico' }, icon), h('span', { class: 'lbl' }, label), h('kbd', {}, key), cd);
        b._cd = cd;
        b._lbl = b.querySelector('.lbl');
        return b;
      };
      e.actUse = act('use', '✋', 'Usar', 'E', () => this.doUse());
      e.actReport = act('report', '📢', 'Reportar', 'R', () => this.doReport(), 'red');
      e.actKill = act('kill', '🔪', 'Matar', 'Q', () => this.doKill(), 'red');
      e.actVent = act('vent', '🕳', 'Duto', 'V', () => this.doVent());
      e.actSab = act('sab', '⚠', 'Sabotar', 'X', () => this.toggleMap(true), 'red');
      e.actAbility = act('ability', '✦', 'Habilidade', 'F', () => this.doAbility(), 'violet');
      e.actions = h('div', { class: 'hud-actions' }, e.actAbility, e.actSab, e.actVent, e.actKill, e.actReport, e.actUse);
      e.ventNav = h('div', { class: 'hud-ventnav', hidden: true });
      e.joy = h('div', { class: 'hud-joy', 'aria-hidden': 'true' }, h('div', { class: 'knob' }));
      root.append(e.tasks, topRight, e.sab, e.toast, e.feedBox, e.actions, e.ventNav, e.joy);
      if (window.innerWidth < 600) e.tasks.classList.add('collapsed');
      this.setupJoystick(e.joy);
      const hp = g.human;
      if (hp) {
        const sp = hp.special ? ' · ' + C.ROLES[hp.special].name : '';
        e.role.textContent = (hp.isImp ? 'Impostor' : 'Tripulante') + sp;
        e.role.className = 'hud-role ' + (hp.isImp ? 'imp' : 'crew');
      }
      this.renderTasks(true);
      this.narrate('A tripulação se reúne ao redor da mesa da Cafeteria. O zumbido da nave preenche o silêncio.', 'intro');
    },

    unmount() {
      this.closeOverlay();
      AU.MG.close(true);
      this.g = null;
    },

    /* ---------- mensagens ---------- */
    toast(text, ms) {
      const t = this.el.toast;
      if (!t) return;
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => t.classList.remove('show'), ms || 2600);
    },
    narrate(text, level) {
      const g = this.g;
      if (!g || !this.el.feedBox) return;
      const n = g.S.ui.narration;
      if (n === 'conciso' && (level === 'ambient' || level === 'room')) return;
      if (n === 'padrao' && level === 'room') return;
      const line = h('div', { class: 'feed-line ' + (level || '') }, text);
      this.el.feedBox.appendChild(line);
      while (this.el.feedBox.children.length > 4) this.el.feedBox.firstChild.remove();
      setTimeout(() => line.classList.add('fade'), 9000);
      setTimeout(() => line.remove(), 10500);
    },

    /* ---------- lista de tarefas ---------- */
    renderTasks(force) {
      const g = this.g, hp = g && g.human;
      if (!hp) return;
      const comms = g.commsDown() && hp.alive;
      const key = hp.tasks.map((t) => t.step + ':' + t.done + ':' + g.taskAvailable(t)).join('|') + comms + hp.isImp + (g.sab ? g.sab.type : '');
      if (!force && key === this._taskKey) return;
      this._taskKey = key;
      const list = this.el.taskList;
      list.innerHTML = '';
      if (hp.isImp) list.appendChild(h('li', { class: 'imp-goal' }, 'Sabote e elimine a tripulação.' + (g.players.filter((p) => p.isImp).length > 1 ? ' Parceiros: ' + g.players.filter((p) => p.isImp && p !== hp).map((p) => p.name).join(', ') : '')));
      if (g.sab) list.appendChild(h('li', { class: 'sab' }, '⚠ ' + SAB_NAME[g.sab.type] + (g.sab.type === 'comms' ? '' : ' — conserte!')));
      if (comms) {
        list.appendChild(h('li', { class: 'comms' }, 'Comunicações sabotadas.'));
        return;
      }
      if (hp.isImp) list.appendChild(h('li', { class: 'fake-head' }, 'Tarefas falsas:'));
      for (const tk of hp.tasks) {
        const st = M.STATIONS[tk.steps[Math.min(tk.step, tk.steps.length - 1)]];
        const room = M.AREA[st.area] ? M.AREA[st.area].name : '';
        let txt = room + ': ' + tk.def.name;
        if (tk.steps.length > 1 && !tk.done) txt += ' (' + tk.step + '/' + tk.steps.length + ')';
        if (tk.id === 'inspect' && tk.step === 1 && !tk.done && !g.taskAvailable(tk)) txt += ' — aguarde ' + Math.ceil(tk.readyAt - g.t) + 's';
        const cls = tk.done ? 'done' : tk.step > 0 ? 'prog' : '';
        list.appendChild(h('li', { class: cls }, txt));
      }
    },

    /* ---------- ciclo ---------- */
    update(dt) {
      const g = this.g;
      if (!g) return;
      const hp = g.human;
      if (!hp) return;
      const e = this.el;
      const busy = AU.MG.isOpen() || !!this.overlay;
      hp.frozen = busy;
      if (g.phase === 'play') {
        this.renderTasks();
        if (hp.tasks.some((t) => t.id === 'inspect' && t.step === 1 && !t.done && !g.taskAvailable(t))) this._taskKey = null;
      }
      const tp = g.taskProgress();
      const barMode = g.S.rules.taskBar;
      if (barMode === 'nunca') e.taskBar.hidden = true;
      else if (barMode === 'sempre' || g.phase === 'meeting') {
        e.taskBar.hidden = false;
        e.taskBar.firstChild.style.width = Math.round(tp.ratio * 100) + '%';
      }
      if (g.commsDown() && barMode !== 'nunca') e.taskBar.firstChild.style.width = '0%';
      if (g.sab) {
        const s = g.sab;
        let txt = '⚠ ' + SAB_NAME[s.type];
        if (s.timer != null) txt += ' · ' + Math.max(0, Math.ceil(s.timer)) + 's';
        if (s.type === 'o2') txt += ' · código ' + (s.done.A ? '✓' : '✗') + ' O2 / ' + (s.done.B ? '✓' : '✗') + ' Admin';
        if (e.sab.textContent !== txt) e.sab.textContent = txt;
        e.sab.hidden = false;
        e.sab.classList.toggle('crit', s.timer != null);
      } else e.sab.hidden = true;
      this.updateActions();
      this.updateVentNav();
      this.updateNarration(dt);
      if (this.overlay && this.overlay.tick) this.overlay.tick(dt);
    },

    setAct(b, visible, enabled, label, cd) {
      if (b.hidden !== !visible) b.hidden = !visible;
      if (!visible) return;
      b.disabled = !enabled;
      b.classList.toggle('ready', !!enabled);
      if (label && b._lbl.textContent !== label) b._lbl.textContent = label;
      const cdt = cd > 0 ? String(Math.ceil(cd)) : '';
      if (b._cd.textContent !== cdt) b._cd.textContent = cdt;
    },

    updateActions() {
      const g = this.g, hp = g.human, e = this.el;
      const play = g.phase === 'play';
      const use = play ? g.useTarget(hp) : null;
      const useOk = !!use && (hp.alive || use.kind === 'task');
      this.setAct(e.actUse, true, useOk && !hp.inVent, use ? use.label : 'Usar');
      const body = play ? g.bodyInReach(hp) : null;
      this.setAct(e.actReport, hp.alive, !!body);
      const isImp = hp.isImp;
      const target = play && isImp ? g.killTargetFor(hp) : null;
      this.setAct(e.actKill, isImp && hp.alive, !!target && hp.killCd <= 0 && !(hp.invisUntil > g.t), null, hp.killCd);
      const canVent = (isImp || hp.special === 'engenheiro') && hp.alive;
      const vent = canVent && play ? g.nearestVent(hp) : null;
      this.setAct(e.actVent, canVent, !!hp.inVent || (!!vent && !(hp.special === 'engenheiro' && hp.abilityCd > 0)), hp.inVent ? 'Sair' : 'Duto', hp.special === 'engenheiro' && !hp.inVent ? hp.abilityCd : 0);
      this.setAct(e.actSab, isImp, play && !hp.inVent, 'Sabotar', g.sab ? 0 : g.sabCd);
      const sp = hp.special;
      let abl = null, ablOk = false, ablCd = hp.abilityCd;
      if (sp === 'metamorfo' && hp.alive) {
        abl = hp.shiftAs != null ? 'Metamorfose' : 'Transformar';
        ablOk = play && hp.shiftAs == null && hp.abilityCd <= 0 && !hp.inVent;
      } else if (sp === 'fantasma' && hp.alive) {
        abl = 'Sumir';
        ablOk = play && hp.abilityCd <= 0 && !(hp.invisUntil > g.t) && !hp.inVent;
      } else if (sp === 'rastreador' && hp.alive) {
        abl = 'Rastrear';
        ablOk = play && hp.abilityCd <= 0 && g.players.some((q) => q.alive && q !== hp && U.dist(q, hp) <= 3.5 && Nav.los(hp.x, hp.y, q.x, q.y));
      } else if (sp === 'cientista' && hp.alive) {
        abl = 'Vitais ' + Math.floor(hp.battery) + 's';
        ablOk = play && hp.battery >= 1;
        ablCd = 0;
      } else if (sp === 'anjo' && !hp.alive && !hp.isImp) {
        abl = 'Proteger';
        ablOk = play && hp.abilityCd <= 0 && g.players.some((q) => q.alive && U.dist(q, hp) <= 4);
      }
      this.setAct(e.actAbility, !!abl, ablOk, abl, ablCd);
    },

    /* ---------- ações do jogador ---------- */
    doUse() {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play' || hp.inVent || AU.MG.isOpen() || this.overlay) return;
      const u = g.useTarget(hp);
      if (!u) return;
      AU.Audio.play('click');
      if (u.kind === 'task') AU.MG.openTask(g, hp, u.task);
      else if (u.kind === 'sab' && hp.alive) AU.MG.openSab(g, hp, u.station);
      else if (u.kind === 'button' && hp.alive) {
        if (!g.tryEmergency(hp)) {
          if (hp.emergencyLeft <= 0) this.toast('Você não tem mais reuniões de emergência.');
          else if (g.sabCritical()) this.toast('Não dá para chamar reunião durante uma sabotagem crítica.');
          else this.toast('Botão em recarga: ' + Math.ceil(g.emergencyCdUntil - g.t) + 's');
        }
      } else if (u.kind === 'cams' && hp.alive) this.openCams();
      else if (u.kind === 'admin') this.openAdmin();
    },
    doReport() {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play') return;
      const b = g.bodyInReach(hp);
      if (b) g.tryReport(hp, b);
    },
    doKill() {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play' || !hp.isImp) return;
      const t = g.killTargetFor(hp);
      if (t && !g.tryKill(hp, t) && g.S.house.noDoubleKill && g.partnerKilledRecently(hp)) this.toast('Regra da casa: sem abate duplo com o parceiro.');
    },
    doVent() {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play') return;
      if (hp.inVent) {
        g.exitVent(hp);
        return;
      }
      const v = g.nearestVent(hp);
      if (!v) return;
      if (g.S.house.noVentChase && g.players.some((q) => q.alive && !q.isImp && q !== hp && g.canSeePoint(hp, q.x, q.y))) {
        this.toast('Regra da casa: sem entrar no duto na frente de alguém.');
        return;
      }
      if (AU.MG.isOpen()) AU.MG.close();
      g.enterVent(hp, v);
    },
    doAbility() {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play') return;
      const sp = hp.special;
      if (sp === 'fantasma') {
        if (g.vanish(hp)) this.toast('Você está invisível por 10s.');
      } else if (sp === 'metamorfo') {
        if (hp.shiftAs != null || hp.abilityCd > 0) return;
        this.openPicker('Transformar em…', g.players.filter((q) => q !== hp), (q) => g.shapeshift(hp, q.id));
      } else if (sp === 'rastreador') {
        const near = g.players.filter((q) => q.alive && q !== hp && U.dist(q, hp) <= 3.5 && Nav.los(hp.x, hp.y, q.x, q.y));
        if (near.length === 1) {
          if (g.track(hp, near[0].id)) this.toast('Rastreando ' + g.appear(near[0]).name + ' por 30s.');
        } else if (near.length) this.openPicker('Rastrear quem?', near, (q) => g.track(hp, q.id) && this.toast('Rastreando ' + g.appear(q).name + '.'));
      } else if (sp === 'cientista') this.openVitals();
      else if (sp === 'anjo') {
        const near = g.players.filter((q) => q.alive && U.dist(q, hp) <= 4);
        this.openPicker('Proteger quem?', near, (q) => g.protect(hp, q.id) && this.toast(q.name + ' está protegido por 35s.'));
      }
    },

    /* ---------- dutos ---------- */
    updateVentNav() {
      const g = this.g, hp = g.human, nav = this.el.ventNav;
      if (!hp.inVent || g.phase !== 'play') {
        if (!nav.hidden) {
          nav.hidden = true;
          nav.innerHTML = '';
          this._ventId = null;
        }
        return;
      }
      if (this._ventId === hp.inVent) return;
      this._ventId = hp.inVent;
      nav.hidden = false;
      nav.innerHTML = '';
      const cur = M.VENT[hp.inVent];
      cur.links.forEach((vid, i) => {
        const v = M.VENT[vid];
        const a = Math.atan2(v.y - cur.y, v.x - cur.x);
        const b = h('button', {
          class: 'vent-arrow', style: { left: `calc(50% + ${Math.cos(a) * 120}px)`, top: `calc(50% + ${Math.sin(a) * 120}px)` },
          title: M.AREA[v.area].name + ' (' + (i + 1) + ')',
          onclick: () => g.ventTo(hp, vid),
        }, h('span', { style: { transform: `rotate(${a}rad)` } }, '➤'), h('small', {}, M.AREA[v.area].name));
        nav.appendChild(b);
      });
    },
    ventKey(i) {
      const g = this.g, hp = g && g.human;
      if (!hp || !hp.inVent) return false;
      const cur = M.VENT[hp.inVent];
      if (cur.links[i]) {
        g.ventTo(hp, cur.links[i]);
        return true;
      }
      return false;
    },

    /* ---------- narrador ---------- */
    updateNarration(dt) {
      const g = this.g, hp = g.human;
      if (g.phase !== 'play') return;
      const a = M.areaAt(hp.x, hp.y);
      if (a.kind === 'room' && a.id !== this.lastArea) {
        this.lastArea = a.id;
        if (!this.visited.has(a.id)) {
          this.visited.add(a.id);
          if (this.visited.size > 1 && ROOM_TEXT[a.id]) this.narrate(ROOM_TEXT[a.id], 'room');
        }
      }
      for (const b of g.bodies) {
        if (b.gone || this.seenBodies.has(b.id)) continue;
        if (AU.Render.visibleToHuman(g, b.x, b.y) && hp.alive) {
          this.seenBodies.add(b.id);
          if (b.killer !== hp.id) this.narrate('Um corpo. ' + g.players[b.pid].name + ' está caído ' + (M.AREA[b.area].kind === 'room' ? 'em ' + M.AREA[b.area].name : 'no ' + M.AREA[b.area].name) + '. Reporte!', 'event');
        }
      }
      this.ambientT -= dt;
      if (this.ambientT <= 0) {
        this.ambientT = U.rf(45, 85);
        this.narrate(U.pick(AMBIENT), 'ambient');
      }
    },

    /* ---------- sobreposições ---------- */
    closeOverlay() {
      if (!this.overlay) return;
      const o = this.overlay;
      this.overlay = null;
      if (o.onClose) o.onClose();
      o.el.remove();
    },
    openOverlay(title, body, opts) {
      this.closeOverlay();
      AU.MG.close(true);
      opts = opts || {};
      const el = h('div', { class: 'ov-wrap' + (opts.cls ? ' ' + opts.cls : '') },
        h('div', { class: 'ov-panel', role: 'dialog', 'aria-label': title },
          h('div', { class: 'ov-head' }, h('div', { class: 'ov-title' }, title), h('button', { class: 'mg-close', 'aria-label': 'Fechar', onclick: () => this.closeOverlay() }, '✕')),
          body));
      el.addEventListener('pointerdown', (ev) => {
        if (ev.target === el) this.closeOverlay();
      });
      document.getElementById('overlay-layer').appendChild(el);
      this.overlay = { el, tick: opts.tick, onClose: opts.onClose, kind: opts.kind };
      return this.overlay;
    },

    drawMiniMap(cv, opts) {
      const g = this.g, hp = g.human;
      const ctx = cv.getContext('2d');
      const sx = cv.width / M.W, sy = cv.height / M.H;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = 'rgba(8,12,22,0.9)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      for (const a of M.AREAS) {
        ctx.fillStyle = a.kind === 'room' ? 'rgba(111,211,255,0.22)' : 'rgba(111,211,255,0.12)';
        for (const [x, y, w, hh] of a.rects) ctx.fillRect(x * sx, y * sy, w * sx, hh * sy);
      }
      ctx.strokeStyle = 'rgba(111,211,255,0.55)';
      ctx.lineWidth = 1.5;
      for (const r of M.ROOMS) ctx.strokeRect(r.rect[0] * sx, r.rect[1] * sy, r.rect[2] * sx, r.rect[3] * sy);
      ctx.fillStyle = '#d7e6ff';
      ctx.font = `700 ${Math.max(9, cv.width / 90)}px "Chakra Petch", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      for (const r of M.ROOMS) ctx.fillText(r.name, (r.rect[0] + r.rect[2] / 2) * sx, (r.rect[1] + 1.8) * sy);
      for (const d of M.DOORS) {
        if (!d.closed) continue;
        ctx.fillStyle = '#ff4747';
        ctx.fillRect(d.rect[0] * sx, d.rect[1] * sy, Math.max(3, d.rect[2] * sx), Math.max(3, d.rect[3] * sy));
      }
      if (opts.admin) {
        const counts = {};
        for (const q of g.players) {
          if (!q.alive || q.inVent) continue;
          const a = M.areaAt(q.x, q.y);
          if (a.kind === 'room') counts[a.id] = (counts[a.id] || 0) + 1;
        }
        for (const b of g.bodies) if (!b.gone && M.AREA[b.area].kind === 'room') counts[b.area] = (counts[b.area] || 0) + 1;
        for (const r of M.ROOMS) {
          const n = counts[r.id] || 0;
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = '#e9edf5';
            ctx.beginPath();
            ctx.arc((r.rect[0] + 2 + (i % 5) * 2.2) * sx, (r.rect[1] + r.rect[3] / 2 + Math.floor(i / 5) * 2.2) * sy, Math.max(3, sx * 0.8), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        return;
      }
      if (!hp.isImp && !g.commsDown()) {
        for (const tk of hp.tasks) {
          if (tk.done) continue;
          const st = M.STATIONS[tk.steps[tk.step]];
          ctx.fillStyle = g.taskAvailable(tk) ? '#ffd640' : 'rgba(255,214,64,0.4)';
          ctx.beginPath();
          ctx.arc(st.x * sx, st.y * sy, Math.max(3.5, sx * 0.7), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (g.sab) for (const st of g.sabStationsNeeded()) {
        const s = M.SAB_STATIONS[st];
        ctx.fillStyle = '#ff4747';
        ctx.beginPath();
        ctx.arc(s.x * sx, s.y * sy, Math.max(5, sx), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const pg of g.pings) {
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pg.x * sx, pg.y * sy, Math.max(6, sx * 1.5), 0, Math.PI * 2);
        ctx.stroke();
      }
      if (hp.trackTarget != null && hp.trackUntil > g.t) {
        const q = g.players[hp.trackTarget];
        if (q.alive) {
          ctx.fillStyle = '#6fe3ff';
          ctx.beginPath();
          ctx.arc(q.x * sx, q.y * sy, Math.max(4, sx * 0.9), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = C.COLOR[hp.color].hex;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hp.x * sx, hp.y * sy, Math.max(4.5, sx * 1.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },

    toggleMap(sabMode) {
      const g = this.g, hp = g && g.human;
      if (!hp || g.phase !== 'play') return;
      if (this.overlay && this.overlay.kind === 'map') {
        this.closeOverlay();
        return;
      }
      const cv = h('canvas', { class: 'ov-map', width: 1088, height: 608 });
      const wrap = h('div', { class: 'ov-map-wrap' }, cv);
      const body = h('div', { class: 'ov-body' }, wrap);
      const sabUI = hp.isImp;
      let sabBtns = [];
      if (sabUI) {
        const row = h('div', { class: 'sab-row' });
        const mk = (type, label) => {
          const b = h('button', { class: 'sab-btn', onclick: () => {
            if (g.sabotage(type, hp)) {
              this.closeOverlay();
            } else if ((type === 'reactor' || type === 'o2') && !g.critAllowed()) this.toast('Regra da casa: sabotagem crítica só depois do primeiro corpo.');
          } }, label);
          b._type = type;
          row.appendChild(b);
          sabBtns.push(b);
        };
        mk('lights', '💡 Luzes');
        mk('reactor', '☢ Reator');
        mk('o2', '🫁 O2');
        mk('comms', '📡 Comms');
        body.appendChild(row);
        for (const room of M.DOOR_ROOMS) {
          const r = M.AREA[room];
          const b = h('button', {
            class: 'door-btn', title: 'Fechar portas: ' + r.name,
            style: { left: ((r.rect[0] + r.rect[2] / 2) / M.W) * 100 + '%', top: ((r.rect[1] + r.rect[3] / 2 + 1.5) / M.H) * 100 + '%' },
            onclick: () => g.closeDoors(room, hp),
          }, '🚪');
          b._room = room;
          wrap.appendChild(b);
          sabBtns.push(b);
        }
      }
      this.openOverlay(sabMode && sabUI ? 'Sabotagem' : 'Mapa da Skeld', body, {
        kind: 'map', cls: 'map',
        tick: () => {
          this.drawMiniMap(cv, {});
          for (const b of sabBtns) {
            if (b._type) {
              const ok = g.canSabotage(hp) && ((b._type !== 'reactor' && b._type !== 'o2') || g.critAllowed());
              b.disabled = !ok;
              b.dataset.cd = !g.sab && g.sabCd > 0 ? Math.ceil(g.sabCd) + 's' : '';
            } else if (b._room) {
              b.disabled = !g.doorReady(b._room) || hp.inVent;
            }
          }
        },
      });
    },

    openCams() {
      const g = this.g, hp = g.human;
      const grid = h('div', { class: 'cams' });
      const cvs = M.CAMS.map((cam) => {
        const cv = h('canvas', { width: 480, height: 300 });
        grid.appendChild(h('figure', {}, cv, h('figcaption', {}, cam.name)));
        return cv;
      });
      const off = h('div', { class: 'cams-off', hidden: true }, 'SEM SINAL — comunicações sabotadas');
      grid.appendChild(off);
      hp.onCams = true;
      let tt = 0;
      this.openOverlay('Câmeras de segurança', h('div', { class: 'ov-body' }, grid), {
        kind: 'cams', cls: 'cams-ov',
        tick: (dt) => {
          tt += dt;
          const down = g.commsDown();
          off.hidden = !down;
          if (!down) cvs.forEach((cv, i) => AU.Render.drawCam(cv, g, M.CAMS[i], tt));
          if (U.d2(hp.x, hp.y, M.SECURITY.x, M.SECURITY.y) > 2.5 || !hp.alive || g.phase !== 'play') this.closeOverlay();
        },
        onClose: () => (hp.onCams = false),
      });
    },

    openAdmin() {
      const g = this.g, hp = g.human;
      const cv = h('canvas', { class: 'ov-map', width: 1088, height: 608 });
      const off = h('div', { class: 'cams-off', hidden: true }, 'SEM SINAL — comunicações sabotadas');
      hp.onAdmin = true;
      this.openOverlay('Mapa do Admin', h('div', { class: 'ov-body' }, h('div', { class: 'ov-map-wrap' }, cv, off)), {
        kind: 'admin', cls: 'map',
        tick: () => {
          const down = g.commsDown();
          off.hidden = !down;
          if (!down) this.drawMiniMap(cv, { admin: true });
          if (U.d2(hp.x, hp.y, M.ADMIN_TABLE.x, M.ADMIN_TABLE.y) > 2.6 || g.phase !== 'play') this.closeOverlay();
        },
        onClose: () => (hp.onAdmin = false),
      });
    },

    openVitals() {
      const g = this.g, hp = g.human;
      const list = h('div', { class: 'vitals' });
      const bat = h('div', { class: 'vitals-bat' });
      this.openOverlay('Sinais vitais', h('div', { class: 'ov-body' }, bat, list), {
        kind: 'vitals',
        tick: (dt) => {
          hp.battery = Math.max(0, hp.battery - dt);
          bat.textContent = 'Bateria: ' + hp.battery.toFixed(1) + 's';
          if (hp.battery <= 0 || g.phase !== 'play') {
            this.closeOverlay();
            return;
          }
          const key = g.players.map((q) => q.alive).join();
          if (key === this._vkey) return;
          this._vkey = key;
          list.innerHTML = '';
          for (const q of g.players) {
            list.appendChild(h('div', { class: 'vital ' + (q.alive ? 'ok' : 'dead') },
              h('span', { html: AU.Render.beanSVG(q.color, { size: 30, visor: q.visor }) }), h('span', { class: 'nm' }, q.name),
              h('span', { class: 'st' }, q.alive ? 'OK' : q.ejected ? 'DESC.' : 'MORTO'), h('span', { class: 'wave' })));
          }
        },
        onClose: () => (this._vkey = null),
      });
    },

    openHistory() {
      const g = this.g;
      if (!g || g.phase !== 'play') return;
      if (this.overlay && this.overlay.kind === 'history') {
        this.closeOverlay();
        return;
      }
      const past = (g.meetingLog || []).filter((mt) => mt.closed);
      const body = h('div', { class: 'ov-body history' },
        past.length ? past.slice().reverse().map((mt, i) => {
          const el = AU.MeetingView.historyElement(g, mt);
          if (i === 0) el.open = true;
          return el;
        }) : h('p', {}, 'Ainda não houve reuniões nesta partida.'));
      this.openOverlay('Conversas das reuniões', body, { kind: 'history', cls: 'wide' });
    },

    openPicker(title, players, fn) {
      const list = h('div', { class: 'picker' });
      for (const q of players) {
        list.appendChild(h('button', {
          class: 'pick', onclick: () => {
            this.closeOverlay();
            fn(q);
          },
        }, h('span', { html: AU.Render.beanSVG(q.color, { size: 34, visor: q.visor }) }), h('span', {}, q.name)));
      }
      this.openOverlay(title, h('div', { class: 'ov-body' }, list), { kind: 'picker' });
    },

    openPause() {
      const g = this.g;
      if (!g) return;
      if (this.overlay && this.overlay.kind === 'pause') {
        this.closeOverlay();
        return;
      }
      const S = g.S;
      const house = [];
      if (S.house.noDoubleKill) house.push('Sem abate duplo');
      if (S.house.noVentChase) house.push('Sem entrar no duto na frente de alguém');
      if (S.house.critAfterFirstBody) house.push('Sabotagem crítica só após o 1º corpo');
      if (S.house.noVisualHardClear) house.push('Visual não inocenta de vez');
      if (S.house.noSelfReport) house.push('Proibido self-report');
      if (S.house.custom) house.push(S.house.custom);
      const body = h('div', { class: 'ov-body pause' },
        h('p', {}, 'A partida está pausada. Os bots também param.'),
        house.length ? h('div', { class: 'pause-rules' }, h('strong', {}, 'Regras da casa: '), house.join(' · ')) : null,
        h('div', { class: 'pause-keys' }, 'WASD/setas: andar · E: usar · R: reportar · Q: matar · V: duto · X: sabotar · F: habilidade · M: mapa · H: conversas · 1-3: trocar de duto'),
        h('div', { class: 'pause-ai' }, h('strong', {}, 'IA das conversas: '), AU.Menu.aiStatusEl()),
        h('div', { class: 'mg-row' },
          h('button', { class: 'mg-btn big', onclick: () => this.closeOverlay() }, 'Continuar'),
          h('button', { class: 'mg-btn big danger', onclick: () => { this.closeOverlay(); AU.App.quitToMenu(); } }, 'Sair para o menu')));
      this.openOverlay('Pausa', body, { kind: 'pause', onClose: () => (AU.App.paused = false) });
      AU.App.paused = true;
    },

    toggleSound() {
      AU.Audio.setEnabled(!AU.Audio.enabled);
      this.el.soundBtn.firstChild.textContent = AU.Audio.enabled ? '🔊' : '🔈';
      if (this.g) this.g.S.ui.sound = AU.Audio.enabled;
    },

    killedScreen(killer) {
      const layer = document.getElementById('overlay-layer');
      const el = h('div', { class: 'killed' },
        h('div', { class: 'killed-bean', html: AU.Render.beanSVG(killer.color, { size: 140, visor: killer.visor }) }),
        h('div', { class: 'killed-title' }, 'Você foi morto'),
        h('div', { class: 'killed-sub' }, 'Por ' + killer.name));
      layer.appendChild(el);
      setTimeout(() => el.classList.add('fade'), 2200);
      setTimeout(() => el.remove(), 3000);
      const hp = this.g.human;
      setTimeout(() => {
        if (this.g) this.toast(hp.isImp ? 'Você é um fantasma. Ainda pode sabotar.' : hp.special === 'anjo' ? 'Você é um fantasma e Anjo da Guarda: proteja os vivos.' : 'Você é um fantasma. Termine suas tarefas.', 4000);
      }, 3100);
    },

    /* ---------- joystick ---------- */
    setupJoystick(el) {
      const knob = el.firstChild;
      let id = null, cx = 0, cy = 0;
      const R = 50;
      el.addEventListener('pointerdown', (e) => {
        id = e.pointerId;
        const r = el.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        el.setPointerCapture(id);
        move(e);
      });
      const move = (e) => {
        if (e.pointerId !== id) return;
        let dx = e.clientX - cx, dy = e.clientY - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) {
          dx = (dx / d) * R;
          dy = (dy / d) * R;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        AU.App.touchVec = { x: dx / R, y: dy / R };
      };
      const end = (e) => {
        if (e.pointerId !== id) return;
        id = null;
        knob.style.transform = '';
        AU.App.touchVec = { x: 0, y: 0 };
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    },
  };

  HUD.SAB_TEXT = SAB_TEXT;
  AU.HUD = HUD;
})();

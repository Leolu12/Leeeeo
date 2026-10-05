/* Controlador do app: telas, laço de jogo, teclado e ligação entre engine e interface. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U;

  const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };

  const App = {
    screen: 'title',
    game: null,
    roster: null,
    paused: false,
    keys: {},
    touchVec: { x: 0, y: 0 },
    last: 0,

    init() {
      AU.Menu.load();
      AU.Menu.applySound();
      AU.LLM.detect();
      this.el = {
        title: document.getElementById('screen-title'),
        create: document.getElementById('screen-create'),
        lobby: document.getElementById('screen-lobby'),
        reveal: document.getElementById('screen-reveal'),
        game: document.getElementById('screen-game'),
        end: document.getElementById('screen-end'),
        online: document.getElementById('screen-online'),
        canvas: document.getElementById('world'),
        canvas3d: document.getElementById('world3d'),
        hud: document.getElementById('hud'),
      };
      AU.MG.host = document.getElementById('mg-layer');
      window.addEventListener('resize', () => {
        AU.Render.resize();
        if (AU.R3D && AU.R3D.active) AU.R3D.resize();
      });
      window.addEventListener('keydown', (e) => this.onKey(e, true));
      window.addEventListener('keyup', (e) => this.onKey(e, false));
      window.addEventListener('blur', () => (this.keys = {}));
      document.addEventListener('pointerdown', () => AU.Audio.unlock(), { once: true });
      document.body.classList.toggle('touch', window.matchMedia('(pointer: coarse)').matches);
      this.show('title');
      requestAnimationFrame((t) => this.loop(t));
    },

    show(name) {
      this.screen = name;
      for (const k of ['title', 'create', 'lobby', 'reveal', 'game', 'end', 'online']) this.el[k].hidden = k !== name;
      if (name === 'title') AU.Menu.title(this.el.title);
      if (name !== 'game') this.prewarm();
      if (name === 'online') AU.Net.screen(this.el.online);
      if (name === 'create') AU.Menu.create(this.el.create);
      /* o relatório final guarda a partida inteira: saindo dele, solta */
      if (name !== 'end') this.el.end.innerHTML = '';
      if (name !== 'reveal') this.el.reveal.innerHTML = '';
      if (name !== 'game') {
        AU.Audio.alarm(false);
        AU.Audio.ambience(null);
      }
    },

    toLobby(fresh) {
      if (fresh || !this.roster || this.roster.length !== AU.Menu.S.room.players) this.roster = AU.Menu.buildRoster(AU.Menu.S);
      else {
        const S = AU.Menu.S;
        Object.assign(this.roster[0], { name: S.profile.name, color: S.profile.color, hat: S.profile.hat, visor: S.profile.visor, pet: S.profile.pet });
      }
      this.show('lobby');
      AU.Menu.lobby(this.el.lobby, this.roster);
    },

    quickStart() {
      /* regras do Clássico; perfil e preferências de interface (som, narrador, IA) ficam como o jogador deixou */
      AU.Menu.S = AU.C.buildSettings('classico', { profile: AU.Menu.S.profile, ui: U.clone(AU.Menu.S.ui) });
      this.roster = AU.Menu.buildRoster(AU.Menu.S);
      this.startGame();
    },

    /* online: o anfitrião começa com o elenco da sala (amigos nos lugares deles, bots no resto) */
    startOnlineHost(host, roster) {
      this.roster = roster;
      this.startGame({ net: host });
    },
    /* online, no aparelho do amigo: monta a mesma nave e mostra o papel quando ele chega (criptografado) */
    startOnlineClient(cl, d) {
      const S = U.clone(d.S);
      S.ui = U.clone(AU.Menu.S.ui);
      const roster = d.roster.map((r, i) => ({ name: r.name, color: r.color, hat: r.hat, visor: r.visor, pet: r.pet, isHuman: i === cl.mySlot }));
      this.teardown(true);
      this.online = { role: 'client', cl };
      const g = new AU.Game(S, roster, { ui: this.makeUi(), client: true });
      for (const p of g.players) {
        p.role = 'crew';
        p.special = null;
        p.tasks = [];
      }
      g.nImpKnown = d.nImp;
      AU.Net.patchClient(g, cl);
      this.game = g;
      this.paused = false;
      this.startTicker();
      let shown = false;
      const go = () => {
        if (shown || this.game !== g) return;
        shown = true;
        this.show('reveal');
        let started = false;
        AU.Menu.reveal(this.el.reveal, g, () => {
          if (started) return;
          started = true;
          clearTimeout(AU.Menu._revealT);
          this.whenGraphicsReady(() => {
            if (this.game !== g) return;
            this.show('game');
            AU.Render.setup(this.el.canvas);
            AU.Render.cam.x = g.human.x;
            AU.Render.cam.y = g.human.y;
            AU.HUD.mount(this.el.hud, g);
            this.applyGraphics();
            this.last = 0;
          });
        });
      };
      if (cl.privOK) go();
      else {
        cl.onPriv = () => {
          cl.onPriv = null;
          go();
        };
        cl.flushPriv();
        setTimeout(go, 5000);
      }
    },
    /* a conexão com a sala caiu */
    onlineLost(why) {
      AU.HUD.toast(why || 'A conexão com a sala caiu.', 4000);
      setTimeout(() => {
        if (this.online) this.quitToMenu();
      }, 3000);
    },

    makeUi() {
      return {

        toast: (t) => AU.HUD.toast(t),
        narrate: (t, l) => AU.HUD.narrate(t, l),
        closeOverlays: () => {
          AU.HUD.closeOverlay();
          AU.MG.close(true);
        },
        onHumanKilled: (killer, apparent) => AU.HUD.killedScreen(apparent),
        onMeetingStart: () => {
          AU.HUD.closeOverlay();
          AU.MG.close(true);
          this.keys = {};
        },
        onSabotage: (s) => {
          AU.HUD.narrate(AU.HUD.SAB_TEXT[s.type], 'event');
          AU.HUD._taskKey = null;
        },
        onSabFixed: (s) => {
          AU.HUD.narrate(s.type === 'lights' ? 'As luzes voltam, uma a uma.' : 'Sistema restaurado. O alarme silencia.', 'event');
          AU.HUD._taskKey = null;
        },
        onTaskProgress: () => (AU.HUD._taskKey = null),
        onGameEnd: () => {
          setTimeout(() => {
            if (this.game && this.game.phase === 'ended') {
              this.show('end');
              AU.Menu.end(this.el.end, this.game);
            }
          }, 1600);
        },
      };
    },

    startGame(o) {
      o = o || {};
      /* clique em "Começar": momento certo para pedir a permissão do Claude, se for o caso */
      if (AU.Menu.S.ui.aiChat !== 'off') AU.LLM.ensure(true);
      const S = U.clone(AU.Menu.S);
      if (!o.net && (!this.roster || this.roster.length !== S.room.players)) this.roster = AU.Menu.buildRoster(AU.Menu.S);
      this.teardown(!!o.net);
      const ui = this.makeUi();
      const roster = this.roster.map((r) => Object.assign({}, r));
      this.game = new AU.Game(S, roster, { ui, net: o.net || null });
      if (o.net) {
        this.online = { role: 'host', host: o.net };
        o.net.attach(this.game);
        this.startTicker();
      }

      this.paused = true;
      this.show('reveal');
      let started = false;
      AU.Menu.reveal(this.el.reveal, this.game, () => {
        if (started) return;
        started = true;
        clearTimeout(AU.Menu._revealT);
        const g = this.game;
        this.whenGraphicsReady(() => {
          if (this.game !== g) return;
          this.show('game');
          AU.Render.setup(this.el.canvas);
          AU.Render.cam.x = g.human.x;
          AU.Render.cam.y = g.human.y;
          this.applyGraphics();
          AU.HUD.mount(this.el.hud, g);
          this.paused = false;
          this.last = 0;
        });
      });
    },

    /* liga o 3D (se escolhido e possível) ou volta ao 2D; force: reconstrói com a qualidade nova. Se o 3D ainda
       está sendo montado, a partida segue no 2D e troca sozinha quando ele fica pronto (nada de tela travada) */
    applyGraphics(force) {
      const g = this.game, R3 = AU.R3D;
      if (!g || this.screen !== 'game') {
        this.prewarm();
        return;
      }
      const ui = AU.Menu.S.ui;
      const want = AU.Menu.wants3d(ui);
      const lv = ui.quality === 'auto' ? null : ui.quality;
      if (want) {
        if (force && R3.renderer) R3.dispose();
        const c3 = (this.el.canvas3d = document.getElementById('world3d'));
        R3.onSlow = () => this.graphicsTooSlow();
        if (R3.ready(c3, lv) && R3.setup(c3, this.el.canvas, lv)) {
          c3.hidden = false;
          R3.resize();
          R3.reset(g);
          this.mode3d = true;
          return;
        }
        R3.prepare(c3, this.el.canvas, lv).then((ok) => {
          if (ok && this.game === g && this.screen === 'game' && !this.mode3d) this.applyGraphics();
        });
      }
      if (R3) R3.hide();
      this.el.canvas3d.hidden = true;
      this.mode3d = false;
      AU.Render.setup(this.el.canvas);
    },
    /* o 3D não aguenta neste aparelho (lento mesmo na menor resolução): na qualidade automática desce um degrau;
       no degrau mais baixo passa para o 2D nesta sessão. Com qualidade escolhida à mão, só avisa uma vez */
    graphicsTooSlow() {
      const R3 = AU.R3D, ui = AU.Menu.S.ui;
      if (!this.mode3d || !R3) return;
      if (ui.quality !== 'auto') {
        if (!this._slowTold) {
          this._slowTold = true;
          AU.HUD.toast('O 3D está pesado neste aparelho: baixe a qualidade ou use o 2D (Menu → Gráficos).', 6000);
        }
        return;
      }
      const i = R3.ORDER.indexOf(R3.levelName);
      if (i > 0) {
        R3.capLevel = R3.ORDER[i - 1];
        AU.HUD.toast('Deixando o 3D mais leve para rodar liso…', 3000);
        this.applyGraphics(true);
      } else {
        R3.no3d = true;
        AU.HUD.toast('O 3D está pesado demais neste aparelho: o jogo passou para o 2D. Dá para voltar em Menu → Gráficos.', 7000);
        this.applyGraphics();
      }
    },
    /* o navegador perdeu o contexto de vídeo (aba no fundo, tela bloqueada): remonta o 3D; enquanto isso, 2D */
    check3dLost() {
      const R3 = AU.R3D;
      if (!this.mode3d || !R3 || !R3.lost || R3.job) return;
      R3.lost = false;
      this.applyGraphics(true);
    },
    /* monta o 3D aos poucos enquanto você está nos menus (a partida já começa com ele pronto) */
    prewarm(now) {
      const R3 = AU.R3D, ui = AU.Menu.S.ui;
      const want = AU.Menu.wants3d(ui);
      if (R3 && !want && R3.job) R3.dispose(); /* escolheu o 2D no meio da montagem: para e solta a memória */
      if (!want) return null;
      const lv = ui.quality === 'auto' ? null : ui.quality;
      const c3 = (this.el.canvas3d = document.getElementById('world3d'));
      if (R3.ready(c3, lv)) return Promise.resolve(true);
      clearTimeout(this._warmT);
      if (now) return R3.prepare(c3, this.el.canvas, lv);
      this._warmT = setTimeout(() => {
        if (this.screen !== 'game') R3.prepare(c3, this.el.canvas, lv);
      }, 700);
      return null;
    },
    /* depois de ver o papel: espera o 3D terminar de montar (no máximo alguns segundos) */
    whenGraphicsReady(cb) {
      const p = this.prewarm(true);
      if (!p) return cb();
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        clearTimeout(t);
        cb();
      };
      const btn = this.el.reveal.querySelector('.btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Preparando a nave em 3D…';
      }
      /* online a partida já está correndo: espera menos (o 3D entra sozinho quando ficar pronto) */
      const t = setTimeout(go, this.online ? 3000 : 9000);
      p.then(go, go);
    },

    teardown(keepNet) {
      if (!keepNet && AU.Net) AU.Net.leave();
      if (!keepNet) this.online = null;
      this.stopTicker();
      if (this.game) {
        const mt = this.game.meeting;
        if (mt && mt.ui) mt.ui.destroy();
        this.game.phase = 'ended';
      }
      AU.HUD.unmount();
      AU.Audio.alarm(false);
      document.getElementById('meeting-layer').innerHTML = '';
      document.getElementById('overlay-layer').innerHTML = '';
      this.game = null;
    },

    quitToMenu() {
      this.teardown();
      this.show('title');
    },

    onKey(e, down) {
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (typing && e.key !== 'Escape') return;
      if (KEYMAP[e.code]) {
        if (this.screen === 'game') e.preventDefault();
        this.keys[KEYMAP[e.code]] = down;
        return;
      }
      if (!down || this.screen !== 'game' || !this.game) return;
      const g = this.game;
      if (g.phase === 'meeting') {
        if (e.key === 'Enter') {
          const inp = document.getElementById('mt-input');
          if (inp) inp.focus();
        }
        return;
      }
      const HUD = AU.HUD;
      switch (e.code) {
        case 'Escape':
          if (AU.MG.isOpen()) AU.MG.close();
          else if (HUD.overlay) HUD.closeOverlay();
          else if (HUD.el.ghostPanel && !HUD.el.ghostPanel.hidden) HUD.toggleGhost(false);
          else HUD.openPause();
          break;
        case 'KeyE':
        case 'Space':
          e.preventDefault();
          HUD.doUse();
          break;
        case 'KeyR': HUD.doReport(); break;
        case 'KeyQ': HUD.doKill(); break;
        case 'KeyV': HUD.doVent(); break;
        case 'KeyF': HUD.doAbility(); break;
        case 'KeyX': if (g.human && g.human.isImp) HUD.toggleMap(true); break;
        case 'KeyM':
        case 'Tab':
          e.preventDefault();
          HUD.toggleMap();
          break;
        case 'KeyH': HUD.openHistory(); break;
        case 'KeyG': HUD.doFollow(); break;
        case 'Enter':
          if (g.human && !g.human.alive) {
            e.preventDefault();
            HUD.toggleGhost(true);
          }
          break;
        case 'Digit1': HUD.ventKey(0); break;
        case 'Digit2': HUD.ventKey(1); break;
        case 'Digit3': HUD.ventKey(2); break;
        default: break;
      }
    },

    /* simulação online num relógio próprio: o navegador para de dar quadros a uma aba em segundo plano, e o anfitrião
       não pode congelar a partida de todo mundo quando troca de aba. Um "worker" bate o relógio (timers de worker não
       são freados como os da página); se o navegador não deixar, fica num setInterval comum. */
    startTicker() {
      if (this.ticker) return;
      const tick = () => {
        const g = this.game;
        if (!g || !this.online || (this.screen !== 'game' && this.screen !== 'end')) return;
        /* aba visível: a simulação anda junto com o desenho (60 por segundo, movimento liso); o relógio só assume
           quando o navegador para de dar quadros */
        if (this.screen === 'game' && performance.now() - (this.rafSimAt || 0) < 150) return;
        this.simNow(g);
      };
      try {
        const src = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},33);'], { type: 'text/javascript' }));
        const w = new Worker(src);
        w.onmessage = tick;
        this.ticker = { stop: () => w.terminate() };
      } catch (e) {
        const iv = setInterval(tick, 33);
        this.ticker = { stop: () => clearInterval(iv) };
      }
    },
    stopTicker() {
      if (this.ticker) this.ticker.stop();
      this.ticker = null;
    },
    /* um passo da simulação online até agora (o relógio e os quadros usam o mesmo marcador: nunca contam o mesmo
       tempo duas vezes) */
    simNow(g) {
      const now = performance.now();
      const dt = this.simAt ? Math.min(0.25, (now - this.simAt) / 1000) : 0;
      this.simAt = now;
      if (dt > 0) this.stepSim(g, dt);
    },
    stepSim(g, dt) {
      const k = this.keys;
      let x = (k.right ? 1 : 0) - (k.left ? 1 : 0), y = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (!x && !y) {
        x = this.touchVec.x;
        y = this.touchVec.y;
      }
      g.input.x = x;
      g.input.y = y;
      let rest = dt;
      while (rest > 0) {
        const step = Math.min(0.034, rest);
        try {
          g.update(step);
        } catch (err) {
          if (window.console) console.error(err);
        }
        rest -= step;
      }
    },

    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0.016;
      this.last = ts;
      const g = this.game;
      if (!g || this.screen !== 'game') return;
      /* online: com a aba visível a simulação anda aqui, quadro a quadro; escondida, no relógio próprio */
      if (this.online && this.ticker) {
        this.simNow(g);
        this.rafSimAt = performance.now();
        this.check3dLost();
        if (g.phase !== 'meeting' || !g.meeting) {
          if (this.mode3d && AU.R3D.active) {
            try {
              AU.R3D.draw(g, ts / 1000);
            } catch (err) {
              if (window.console) console.error(err);
              AU.R3D.failed = true;
              this.applyGraphics();
            }
          } else AU.Render.draw(g, ts / 1000);
        }
        AU.HUD.update(dt);
        return;
      }
      const k = this.keys;
      let x = (k.right ? 1 : 0) - (k.left ? 1 : 0), y = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (!x && !y) {
        x = this.touchVec.x;
        y = this.touchVec.y;
      }
      g.input.x = x;
      g.input.y = y;
      /* online a partida não para (a pausa só abre o menu) */
      if (!this.paused || this.online) {
        let rest = dt;
        while (rest > 0) {
          const step = Math.min(0.034, rest);
          try {
            g.update(step);
          } catch (err) {
            if (window.console) console.error(err);
          }
          rest -= step;
        }
      }
      this.check3dLost();
      /* na reunião a tela dela (e a abertura, opaca) cobre o mapa: não gasta desenhando o que ninguém vê */
      if (g.phase !== 'meeting' || !g.meeting) {
        if (this.mode3d && AU.R3D.active) {
          try {
            AU.R3D.draw(g, ts / 1000);
          } catch (err) {
            /* 3D falhou no meio da partida: segue no 2D */
            if (window.console) console.error(err);
            AU.R3D.failed = true;
            this.applyGraphics();
          }
        } else AU.Render.draw(g, ts / 1000);
      }
      AU.HUD.update(dt);
    },
  };

  /* Simulação sem interface, usada para testar partidas inteiras entre bots. */
  AU.debug = {
    simulate(opts) {
      opts = opts || {};
      const S = AU.C.buildSettings(opts.preset || 'classico', opts.overrides || {});
      S.room.players = opts.players || 10;
      S.room.impostors = opts.impostors || 2;
      const roster = AU.Menu.buildRoster(S);
      const g = new AU.Game(S, roster, { headless: true, autopilot: true });
      const dt = 0.05;
      let steps = 0;
      const max = (opts.maxSeconds || 900) / dt;
      while (g.phase !== 'ended' && steps++ < max) g.update(dt);
      return {
        winner: g.winner, reason: g.endReason, time: Math.round(g.t), meetings: g.meetings,
        kills: g.events.filter((e) => e.type === 'kill').length,
        ejects: g.events.filter((e) => e.type === 'vote' && e.ejected != null).map((e) => (g.players[e.ejected].isImp ? 'imp' : 'crew')),
        sabotages: g.events.filter((e) => e.type === 'sabotage').length,
        vents: g.events.filter((e) => e.type === 'vent' && e.dir === 'in').length,
        tasks: g.taskProgress(),
        game: g,
      };
    },
  };

  AU.App = App;
  window.addEventListener('DOMContentLoaded', () => App.init());
})();

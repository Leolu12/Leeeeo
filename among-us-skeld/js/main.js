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
      AU.Audio.setEnabled(AU.Menu.S.ui.sound !== false);
      AU.LLM.detect();
      this.el = {
        title: document.getElementById('screen-title'),
        create: document.getElementById('screen-create'),
        lobby: document.getElementById('screen-lobby'),
        reveal: document.getElementById('screen-reveal'),
        game: document.getElementById('screen-game'),
        end: document.getElementById('screen-end'),
        canvas: document.getElementById('world'),
        hud: document.getElementById('hud'),
      };
      AU.MG.host = document.getElementById('mg-layer');
      window.addEventListener('resize', () => AU.Render.resize());
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
      for (const k of ['title', 'create', 'lobby', 'reveal', 'game', 'end']) this.el[k].hidden = k !== name;
      if (name === 'title') AU.Menu.title(this.el.title);
      if (name === 'create') AU.Menu.create(this.el.create);
      if (name !== 'game') AU.Audio.alarm(false);
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
      AU.Menu.S = AU.C.buildSettings('classico', { profile: AU.Menu.S.profile });
      this.roster = AU.Menu.buildRoster(AU.Menu.S);
      this.startGame();
    },

    startGame() {
      /* clique em "Começar": momento certo para pedir a permissão do Claude, se for o caso */
      if (AU.Menu.S.ui.aiChat !== 'off') AU.LLM.ensure();
      const S = U.clone(AU.Menu.S);
      if (!this.roster || this.roster.length !== S.room.players) this.roster = AU.Menu.buildRoster(AU.Menu.S);
      this.teardown();
      const ui = {
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
      const roster = this.roster.map((r) => Object.assign({}, r));
      this.game = new AU.Game(S, roster, { ui });
      this.paused = true;
      this.show('reveal');
      let started = false;
      AU.Menu.reveal(this.el.reveal, this.game, () => {
        if (started) return;
        started = true;
        clearTimeout(AU.Menu._revealT);
        this.show('game');
        AU.Render.setup(this.el.canvas);
        AU.Render.cam.x = this.game.human.x;
        AU.Render.cam.y = this.game.human.y;
        AU.HUD.mount(this.el.hud, this.game);
        this.paused = false;
        this.last = 0;
      });
    },

    teardown() {
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
        case 'Digit1': HUD.ventKey(0); break;
        case 'Digit2': HUD.ventKey(1); break;
        case 'Digit3': HUD.ventKey(2); break;
        default: break;
      }
    },

    loop(ts) {
      requestAnimationFrame((t) => this.loop(t));
      const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0.016;
      this.last = ts;
      const g = this.game;
      if (!g || this.screen !== 'game') return;
      const k = this.keys;
      let x = (k.right ? 1 : 0) - (k.left ? 1 : 0), y = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      if (!x && !y) {
        x = this.touchVec.x;
        y = this.touchVec.y;
      }
      g.input.x = x;
      g.input.y = y;
      if (!this.paused) {
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
      if (g.phase !== 'meeting' || !g.meeting || g.meeting.phase === 'intro') AU.Render.draw(g, ts / 1000);
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

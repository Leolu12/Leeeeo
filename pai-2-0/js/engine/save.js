/* PAI 2.0 — save.js
 * Progresso e configurações no localStorage (sempre com try/catch:
 * se o navegador bloquear, o jogo funciona normalmente sem salvar).
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});
  const KEY = 'pai20_save_v1';

  function defaults() {
    return {
      v: 1,
      settings: {
        sound: true,
        music: 0.6,
        sfx: 0.85,
        speed: 'normal',      // lenta | normal | rapida | instantanea
        font: 'A+',           // A | A+ | A++
        reduceMotion: false,
        unlockAll: false,
      },
      profile: null,          // {pai, apelido, filho, genero, prof, skin, recado}
      progress: {
        current: null,        // {id, part}
        completed: {},        // {cap1: true}
        vars: {},             // variáveis por capítulo
        stats: {},            // estatísticas por capítulo
        flags: {},            // flags globais
      },
      achievements: {},       // {id: timestamp}
      created: Date.now(),
    };
  }

  function merge(base, extra) {
    if (!extra || typeof extra !== 'object') return base;
    Object.keys(extra).forEach((k) => {
      const v = extra[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') merge(base[k], v);
      else base[k] = v;
    });
    return base;
  }

  const save = (P2.save = {
    data: defaults(),
    available: false,
    load() {
      let raw = null;
      try {
        raw = window.localStorage.getItem(KEY);
        this.available = true;
      } catch (e) {
        this.available = false;
      }
      this.data = defaults();
      if (raw) {
        try { merge(this.data, JSON.parse(raw)); } catch (e) { /* save corrompido: ignora */ }
      }
      P2.settings = this.data.settings;
      return this.data;
    },
    write() {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(this.data));
        this.available = true;
        return true;
      } catch (e) {
        this.available = false;
        return false;
      }
    },
    /** Apaga o progresso (mantém configurações). */
    resetProgress() {
      const keepSettings = this.data.settings;
      this.data = defaults();
      this.data.settings = keepSettings;
      P2.settings = this.data.settings;
      this.write();
    },
    hasGame() {
      return !!(this.data.profile && (this.data.progress.current || Object.keys(this.data.progress.completed).length));
    },
  });
  save.defaults = defaults;
})();

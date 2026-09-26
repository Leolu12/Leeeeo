/* Efeitos sonoros sintetizados com WebAudio (sem arquivos externos). */
(function () {
  'use strict';
  const AU = window.AU;
  let ctx = null, master = null, enabled = true, alarmNode = null;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      } catch (e) {
        enabled = false;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slide) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const gn = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(gn);
    gn.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, when, freq) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq || 1200;
    const gn = c.createGain();
    gn.gain.value = vol || 0.4;
    src.connect(f);
    f.connect(gn);
    gn.connect(master);
    src.start(t0);
  }

  const S = {
    click: () => tone(660, 0.06, 'square', 0.08),
    ok: () => { tone(880, 0.09, 'triangle', 0.2); tone(1320, 0.14, 'triangle', 0.18, 0.08); },
    task: () => { tone(740, 0.1, 'triangle', 0.22); tone(988, 0.1, 'triangle', 0.22, 0.09); tone(1480, 0.2, 'triangle', 0.2, 0.18); },
    fail: () => tone(180, 0.25, 'sawtooth', 0.15, 0, 120),
    kill: () => { noise(0.18, 0.6, 0, 2400); tone(220, 0.3, 'sawtooth', 0.25, 0.02, 60); },
    report: () => { for (let i = 0; i < 3; i++) { tone(520, 0.18, 'square', 0.2, i * 0.22); tone(780, 0.18, 'square', 0.14, i * 0.22 + 0.09); } },
    meeting: () => { for (let i = 0; i < 4; i++) tone(i % 2 ? 620 : 880, 0.2, 'square', 0.18, i * 0.2); },
    vote: () => tone(520, 0.1, 'triangle', 0.2),
    vent: () => { noise(0.12, 0.35, 0, 600); tone(140, 0.12, 'square', 0.12); },
    door: () => { noise(0.25, 0.4, 0, 300); tone(90, 0.25, 'sawtooth', 0.2); },
    sabotage: () => { tone(300, 0.3, 'sawtooth', 0.2, 0, 600); tone(300, 0.3, 'sawtooth', 0.2, 0.35, 600); },
    eject: () => { noise(1.2, 0.3, 0, 500); tone(400, 1.2, 'sine', 0.15, 0, 80); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.22, i * 0.15)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, i * 0.18)),
    reveal: () => { tone(110, 1.2, 'sawtooth', 0.12, 0, 55); tone(220, 1.2, 'triangle', 0.1, 0.1); },
    chat: () => tone(1200, 0.04, 'sine', 0.06),
    shield: () => tone(1000, 0.3, 'sine', 0.2, 0, 1500),
  };

  AU.Audio = {
    play(name) {
      if (!enabled) return;
      try {
        S[name] && S[name]();
      } catch (e) {
        /* áudio indisponível */
      }
    },
    unlock() { ensure(); },
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) AU.Audio.alarm(false);
    },
    get enabled() { return enabled; },
    alarm(on) {
      if (on && !alarmNode && enabled) {
        const c = ensure();
        if (!c) return;
        let i = 0;
        alarmNode = setInterval(() => { tone(i++ % 2 ? 440 : 660, 0.25, 'square', 0.1); }, 450);
      } else if (!on && alarmNode) {
        clearInterval(alarmNode);
        alarmNode = null;
      }
    },
  };
})();

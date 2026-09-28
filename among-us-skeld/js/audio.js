/* Efeitos sonoros sintetizados com WebAudio (sem arquivos externos).
   Organizados como no original: sons de jogador (passos que mudam com o piso, duto, abate), sons gerais
   (reunião, sabotagem, portas), sons dos painéis de tarefa e um ambiente de nave que muda de sala em sala.
   Cada som recebe o contexto e a saída, então dá para renderizar tudo offline para conferir volume e duração. */
(function () {
  'use strict';
  const AU = window.AU;
  let ctx = null, bus = null, enabled = true, alarmT = null, lastStep = 0;
  /* volume geral (0 a 1), ambiente das salas ligado ou não, e o ambiente pedido pelo jogo (para religar depois) */
  let volume = 1, ambOn = true;
  const MASTER = 0.42;

  /* ---------- cadeia de saída: sfx + envio para reverb curto → compressor → master ---------- */
  function makeBus(c) {
    const master = c.createGain();
    master.gain.value = MASTER * volume;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    comp.connect(master);
    master.connect(c.destination);
    const sfx = c.createGain();
    sfx.connect(comp);
    /* reverb metálico curto: a nave é um casco de aço */
    const rev = c.createConvolver();
    const len = Math.floor(c.sampleRate * 0.9);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 40 ? i / 40 : 1);
    }
    rev.buffer = ir;
    const send = c.createGain();
    send.gain.value = 0.16;
    sfx.connect(send);
    send.connect(rev);
    rev.connect(comp);
    const ambBus = c.createGain();
    ambBus.gain.value = 1;
    ambBus.connect(comp);
    return { master, sfx, ambBus, noise: null };
  }

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        bus = makeBus(ctx);
      } catch (e) {
        enabled = false;
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function noiseBuf(c, b) {
    if (b.noise) return b.noise;
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    b.noise = buf;
    return buf;
  }

  /* envelope simples: ataque, sustentação e queda exponencial */
  function env(g, t0, a, hold, rel, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.max(0.002, a));
    if (hold > 0) g.gain.setValueAtTime(Math.max(0.0002, vol), t0 + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel);
    return t0 + a + hold + rel;
  }

  /* oscilador com envelope, deslize de altura e filtro opcional */
  function osc(c, out, t0, o) {
    const a = o.a == null ? 0.005 : o.a, hold = o.hold || 0, rel = o.rel == null ? 0.1 : o.rel;
    const n = c.createOscillator();
    n.type = o.type || 'sine';
    n.frequency.setValueAtTime(o.f, t0);
    if (o.to) n.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.slide || a + hold + rel));
    if (o.detune) n.detune.value = o.detune;
    const g = c.createGain();
    const end = env(g, t0, a, hold, rel, o.vol == null ? 0.2 : o.vol);
    let last = n;
    if (o.lp || o.hp || o.bp) {
      const f = c.createBiquadFilter();
      f.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
      f.frequency.setValueAtTime(o.lp || o.hp || o.bp, t0);
      if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, end);
      f.Q.value = o.q || 0.8;
      last.connect(f);
      last = f;
    }
    last.connect(g);
    g.connect(out);
    n.start(t0);
    n.stop(end + 0.05);
    return end;
  }

  /* ruído filtrado com envelope (e varredura de filtro) */
  function nz(c, b, out, t0, o) {
    const src = c.createBufferSource();
    src.buffer = noiseBuf(c, b);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    f.Q.value = o.q == null ? 1 : o.q;
    const g = c.createGain();
    const end = env(g, t0, o.a == null ? 0.004 : o.a, o.hold || 0, o.rel == null ? 0.1 : o.rel, o.vol == null ? 0.3 : o.vol);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, end);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t0, Math.random() * 1.5);
    src.stop(end + 0.05);
    return end;
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- biblioteca de sons: (c, b, out, t) ---------- */
  const S = {
    /* interface */
    click: (c, b, o, t) => { nz(c, b, o, t, { f: 3200, q: 3, rel: 0.03, vol: 0.12 }); osc(c, o, t, { f: 1500, type: 'triangle', rel: 0.05, vol: 0.06 }); },
    ok: (c, b, o, t) => { osc(c, o, t, { f: 880, type: 'triangle', rel: 0.12, vol: 0.18 }); osc(c, o, t + 0.08, { f: 1320, type: 'triangle', rel: 0.2, vol: 0.16 }); },
    fail: (c, b, o, t) => { osc(c, o, t, { f: 120, type: 'square', hold: 0.18, rel: 0.08, vol: 0.12, lp: 900 }); osc(c, o, t, { f: 127, type: 'square', hold: 0.18, rel: 0.08, vol: 0.08, lp: 900 }); },
    chat: (c, b, o, t) => { osc(c, o, t, { f: 900, to: 1400, slide: 0.03, rel: 0.06, vol: 0.09 }); },
    type: (c, b, o, t) => { nz(c, b, o, t, { f: 4000, q: 4, rel: 0.02, vol: 0.05 }); },
    /* tarefa concluída: arpejo de sino brilhante */
    task: (c, b, o, t) => {
      [784, 988, 1175, 1568].forEach((f, i) => {
        osc(c, o, t + i * 0.075, { f, type: 'sine', a: 0.004, rel: 0.45, vol: 0.14 });
        osc(c, o, t + i * 0.075, { f: f * 2.01, type: 'sine', a: 0.004, rel: 0.2, vol: 0.04 });
      });
      nz(c, b, o, t + 0.28, { type: 'highpass', f: 7000, q: 0.5, a: 0.01, rel: 0.35, vol: 0.05 });
    },
    /* passos: cada piso tem o seu timbre, com variação a cada pisada */
    stepMetal: (c, b, o, t) => { const p = rnd(0.9, 1.12); nz(c, b, o, t, { f: 2600 * p, q: 6, rel: 0.05, vol: 0.09 }); osc(c, o, t, { f: 95 * p, to: 60, rel: 0.06, vol: 0.12 }); osc(c, o, t + 0.004, { f: 3100 * p, type: 'sine', rel: 0.08, vol: 0.02 }); },
    stepTile: (c, b, o, t) => { const p = rnd(0.9, 1.12); nz(c, b, o, t, { f: 1800 * p, q: 2.5, rel: 0.035, vol: 0.09 }); osc(c, o, t, { f: 140 * p, to: 90, rel: 0.04, vol: 0.08 }); },
    stepCarpet: (c, b, o, t) => { const p = rnd(0.9, 1.12); nz(c, b, o, t, { type: 'lowpass', f: 700 * p, q: 0.7, a: 0.01, rel: 0.06, vol: 0.12 }); osc(c, o, t, { f: 80 * p, to: 55, rel: 0.05, vol: 0.08 }); },
    /* duto: tampa de metal batendo + vulto deslizando */
    vent: (c, b, o, t) => {
      nz(c, b, o, t, { f: 950, q: 9, rel: 0.18, vol: 0.28 });
      osc(c, o, t, { f: 1240, type: 'triangle', rel: 0.22, vol: 0.06, detune: 12 });
      osc(c, o, t, { f: 160, to: 70, rel: 0.12, vol: 0.2 });
      nz(c, b, o, t + 0.06, { type: 'lowpass', f: 2400, to: 300, a: 0.03, rel: 0.3, vol: 0.14 });
      nz(c, b, o, t + 0.2, { f: 900, q: 8, rel: 0.1, vol: 0.12 });
    },
    ventMove: (c, b, o, t) => { for (let i = 0; i < 4; i++) nz(c, b, o, t + i * 0.07 + rnd(0, 0.02), { f: rnd(500, 900), q: 5, rel: 0.05, vol: 0.1 }); },
    /* abate: corte cortante, pancada surda e respingo */
    kill: (c, b, o, t) => {
      nz(c, b, o, t, { type: 'highpass', f: 6000, to: 1800, a: 0.003, rel: 0.1, vol: 0.4 });
      osc(c, o, t + 0.05, { f: 110, to: 38, rel: 0.25, vol: 0.4 });
      nz(c, b, o, t + 0.06, { f: 420, to: 180, q: 2, a: 0.01, rel: 0.25, vol: 0.3 });
      nz(c, b, o, t + 0.12, { f: 1200, q: 3, rel: 0.12, vol: 0.12 });
    },
    /* a cena de quem morreu: acorde dissonante que cresce */
    dead: (c, b, o, t) => {
      S.kill(c, b, o, t + 0.7);
      [55, 58.3, 82.4, 116.5].forEach((f) => osc(c, o, t + 0.7, { f, type: 'sawtooth', a: 0.05, hold: 0.6, rel: 1.1, vol: 0.09, lp: 1800, fTo: 200 }));
      osc(c, o, t, { f: 220, to: 880, slide: 0.7, type: 'sawtooth', a: 0.6, rel: 0.05, vol: 0.05, lp: 1200 });
    },
    /* corpo reportado: sirene que sobe e desce, com eco */
    report: (c, b, o, t) => {
      const whoop = (t0, v) => {
        osc(c, o, t0, { f: 320, to: 980, slide: 0.32, type: 'sawtooth', a: 0.01, hold: 0.3, rel: 0.25, vol: v, lp: 2400 });
        osc(c, o, t0, { f: 323, to: 990, slide: 0.32, type: 'square', a: 0.01, hold: 0.3, rel: 0.25, vol: v * 0.5, lp: 1800 });
      };
      for (let k = 0; k < 2; k++) {
        whoop(t + k * 0.62, 0.14);
        whoop(t + k * 0.62 + 0.21, 0.05);
      }
    },
    /* reunião de emergência: buzina de metal em três toques */
    meeting: (c, b, o, t) => {
      [0, 0.3, 0.6].forEach((d, i) => {
        const len = i === 2 ? 0.6 : 0.18;
        [0, 7].forEach((semi) => {
          const f = 196 * Math.pow(2, semi / 12);
          osc(c, o, t + d, { f, type: 'sawtooth', a: 0.02, hold: len, rel: 0.18, vol: 0.12, lp: 900, fTo: 2600 });
          osc(c, o, t + d, { f: f * 1.005, type: 'square', a: 0.02, hold: len, rel: 0.18, vol: 0.05, lp: 1400 });
        });
      });
      osc(c, o, t, { f: 98, type: 'sine', a: 0.02, hold: 1.1, rel: 0.4, vol: 0.14 });
    },
    /* voto: bip do tablet e o carimbo do selo */
    vote: (c, b, o, t) => { osc(c, o, t, { f: 660, type: 'triangle', rel: 0.08, vol: 0.14 }); osc(c, o, t + 0.07, { f: 120, to: 60, rel: 0.1, vol: 0.2 }); nz(c, b, o, t + 0.07, { type: 'lowpass', f: 900, rel: 0.06, vol: 0.12 }); },
    /* portas: pistão pneumático e o baque de metal */
    door: (c, b, o, t) => {
      nz(c, b, o, t, { type: 'highpass', f: 2500, to: 5000, a: 0.02, rel: 0.25, vol: 0.14 });
      osc(c, o, t + 0.22, { f: 70, to: 40, rel: 0.35, vol: 0.4 });
      nz(c, b, o, t + 0.22, { f: 320, q: 2, rel: 0.25, vol: 0.3 });
      nz(c, b, o, t + 0.22, { f: 2100, q: 12, rel: 0.4, vol: 0.05 });
    },
    doorOpen: (c, b, o, t) => { nz(c, b, o, t, { type: 'highpass', f: 5000, to: 2000, a: 0.01, rel: 0.3, vol: 0.12 }); osc(c, o, t, { f: 90, to: 60, rel: 0.2, vol: 0.15 }); },
    /* sabotagem: o som grave de sistema caindo */
    sabotage: (c, b, o, t) => {
      osc(c, o, t, { f: 420, to: 90, slide: 0.7, type: 'sawtooth', a: 0.01, hold: 0.4, rel: 0.4, vol: 0.12, lp: 1600 });
      osc(c, o, t, { f: 60, type: 'sine', a: 0.02, hold: 0.5, rel: 0.4, vol: 0.2 });
      nz(c, b, o, t, { f: 180, q: 1, a: 0.05, hold: 0.3, rel: 0.4, vol: 0.12 });
    },
    lightsOff: (c, b, o, t) => { osc(c, o, t, { f: 240, to: 40, slide: 0.9, type: 'sawtooth', a: 0.01, hold: 0.5, rel: 0.4, vol: 0.1, lp: 800 }); nz(c, b, o, t, { f: 120, q: 4, a: 0.01, hold: 0.4, rel: 0.2, vol: 0.12 }); },
    fixed: (c, b, o, t) => { osc(c, o, t, { f: 60, to: 240, slide: 0.4, type: 'sawtooth', a: 0.02, hold: 0.2, rel: 0.3, vol: 0.08, lp: 900 }); [523, 784].forEach((f, i) => osc(c, o, t + 0.3 + i * 0.1, { f, type: 'triangle', rel: 0.3, vol: 0.12 })); },
    /* sirene de crise (reator/O2): o "wee-woo" com deslize */
    alarm: (c, b, o, t) => {
      osc(c, o, t, { f: 520, to: 780, slide: 0.35, type: 'square', a: 0.02, hold: 0.33, rel: 0.05, vol: 0.05, lp: 1600 });
      osc(c, o, t + 0.4, { f: 780, to: 520, slide: 0.35, type: 'square', a: 0.02, hold: 0.33, rel: 0.05, vol: 0.05, lp: 1600 });
    },
    /* ejeção: vácuo e um baque distante */
    eject: (c, b, o, t) => {
      nz(c, b, o, t, { type: 'lowpass', f: 400, to: 3000, a: 0.3, hold: 0.4, rel: 1.4, vol: 0.2 });
      osc(c, o, t, { f: 70, to: 35, rel: 1.4, vol: 0.2 });
      osc(c, o, t + 0.3, { f: 440, to: 110, slide: 2, type: 'sine', a: 0.4, rel: 1.8, vol: 0.05 });
    },
    win: (c, b, o, t) => {
      [523, 659, 784, 1046].forEach((f, i) => {
        osc(c, o, t + i * 0.14, { f, type: 'triangle', a: 0.01, rel: 0.5, vol: 0.16 });
        osc(c, o, t + i * 0.14, { f: f / 2, type: 'sine', a: 0.01, rel: 0.5, vol: 0.06 });
      });
      [523, 659, 784].forEach((f) => osc(c, o, t + 0.6, { f, type: 'sawtooth', a: 0.05, hold: 0.5, rel: 0.8, vol: 0.05, lp: 2200 }));
    },
    lose: (c, b, o, t) => {
      [392, 370, 330, 262].forEach((f, i) => osc(c, o, t + i * 0.22, { f, type: 'triangle', a: 0.01, rel: 0.45, vol: 0.15 }));
      [131, 156, 196].forEach((f) => osc(c, o, t + 0.8, { f, type: 'sawtooth', a: 0.1, hold: 0.6, rel: 1, vol: 0.05, lp: 700 }));
    },
    /* revelação da função: o "shhh" e o impacto grave */
    reveal: (c, b, o, t) => {
      nz(c, b, o, t, { type: 'highpass', f: 3500, q: 0.4, a: 0.25, hold: 0.35, rel: 0.4, vol: 0.09 });
      osc(c, o, t + 0.9, { f: 55, to: 36, rel: 1.4, vol: 0.4 });
      nz(c, b, o, t + 0.9, { type: 'lowpass', f: 600, to: 120, rel: 0.8, vol: 0.25 });
      [110, 164.8, 220].forEach((f) => osc(c, o, t + 0.9, { f, type: 'sawtooth', a: 0.05, hold: 0.4, rel: 1.2, vol: 0.05, lp: 1400, fTo: 300 }));
    },
    shield: (c, b, o, t) => { osc(c, o, t, { f: 600, to: 1800, slide: 0.4, type: 'sine', a: 0.02, hold: 0.1, rel: 0.4, vol: 0.14 }); osc(c, o, t + 0.05, { f: 1200, to: 3000, slide: 0.4, type: 'sine', rel: 0.4, vol: 0.05 }); },
    /* painéis de tarefa */
    spark: (c, b, o, t) => { nz(c, b, o, t, { type: 'highpass', f: 5000, rel: 0.05, vol: 0.18 }); nz(c, b, o, t + 0.03, { type: 'highpass', f: 6000, rel: 0.04, vol: 0.1 }); osc(c, o, t, { f: 1760, rel: 0.12, vol: 0.06 }); },
    laser: (c, b, o, t) => { osc(c, o, t, { f: 1800, to: 300, slide: 0.14, type: 'square', rel: 0.14, vol: 0.06, lp: 3000 }); },
    boom: (c, b, o, t) => { nz(c, b, o, t, { type: 'lowpass', f: 1500, to: 150, rel: 0.4, vol: 0.3 }); osc(c, o, t, { f: 90, to: 40, rel: 0.3, vol: 0.25 }); },
    lever: (c, b, o, t) => { osc(c, o, t, { f: 180, to: 90, rel: 0.12, vol: 0.2 }); nz(c, b, o, t, { f: 1400, q: 8, rel: 0.1, vol: 0.12 }); },
    dump: (c, b, o, t) => { nz(c, b, o, t, { type: 'lowpass', f: 500, a: 0.05, hold: 0.8, rel: 0.5, vol: 0.2 }); for (let i = 0; i < 8; i++) nz(c, b, o, t + i * 0.11 + rnd(0, 0.05), { f: rnd(700, 2200), q: 6, rel: 0.06, vol: 0.08 }); },
    scan: (c, b, o, t) => { osc(c, o, t, { f: 220, type: 'sawtooth', a: 0.1, hold: 0.8, rel: 0.2, vol: 0.04, lp: 700 }); osc(c, o, t, { f: 880, to: 1320, slide: 1, type: 'sine', a: 0.1, hold: 0.8, rel: 0.2, vol: 0.03 }); },
    pour: (c, b, o, t) => { for (let i = 0; i < 6; i++) osc(c, o, t + i * 0.09, { f: rnd(300, 700), to: rnd(700, 1100), slide: 0.06, rel: 0.07, vol: 0.05 }); },
  };

  /* ganho de cada som, para equilibrar: eventos grandes perto de -12 dB, médios -18 dB, sutis -28 dB */
  const GAIN = { click: 2, chat: 2, type: 6, stepMetal: 1.8, stepTile: 2.2, stepCarpet: 2.2, vent: 2.6, ventMove: 6, laser: 3, lever: 2, alarm: 1.6, spark: 1.4, pour: 1.6, doorOpen: 1.5, ok: 1.3, vote: 1.2 };
  const route = (c, b, name, dest) => {
    dest = dest || b.sfx;
    const k = GAIN[name];
    if (!k) return dest;
    const g = c.createGain();
    g.gain.value = k;
    g.connect(dest);
    return g;
  };
  /* ---------- som 3D ----------
     O ouvinte fica no jogador olhando para o alto da tela: o que está acima no mapa soa à frente, abaixo soa atrás,
     à direita soa à direita. No computador usa HRTF (com fone dá para perceber frente e trás); no celular, o
     panorama mais leve. A distância e a parede são tratadas à parte (ganho e filtro), o panner só dá a direção. */
  const HRTF = typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(pointer: coarse)').matches;
  function panner3d(c) {
    const p = c.createPanner();
    p.panningModel = HRTF ? 'HRTF' : 'equalpower';
    p.distanceModel = 'linear';
    p.rolloffFactor = 0;
    return p;
  }
  function place(p, dx, dy, now) {
    /* 1 tile = 1 metro; um pouco acima do chão, para nada ficar exatamente "dentro da cabeça" */
    const x = dx, y = 0.8, z = dy;
    if (p.positionX) {
      if (now == null) {
        p.positionX.value = x;
        p.positionY.value = y;
        p.positionZ.value = z;
      } else {
        p.positionX.setTargetAtTime(x, now, 0.12);
        p.positionY.setTargetAtTime(y, now, 0.12);
        p.positionZ.setTargetAtTime(z, now, 0.12);
      }
    } else p.setPosition(x, y, z);
  }
  /* som que vem de um ponto do mapa: at = { gain, dx, dy (tiles a partir do jogador), muffle (parede no meio) } */
  function spatial(c, b, at) {
    let node = b.sfx;
    if (!at) return node;
    if (at.dx != null) {
      const p = panner3d(c);
      place(p, at.dx, at.dy || 0);
      p.connect(node);
      node = p;
    }
    if (at.muffle) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 650;
      f.Q.value = 0.5;
      f.connect(node);
      node = f;
    }
    if (at.gain != null && at.gain !== 1) {
      const g = c.createGain();
      g.gain.value = Math.max(0, at.gain);
      g.connect(node);
      node = g;
    }
    return node;
  }

  /* ---------- ambiente da nave, por sala: zumbido base + a assinatura de cada sala ---------- */
  const AMB = {
    corridor: { hum: 55, lp: 260, vol: 0.05 },
    engine: { hum: 41, lp: 520, vol: 0.12, rumble: true },
    reactor: { hum: 49, lp: 380, vol: 0.09, pulse: 0.5 },
    electrical: { hum: 60, lp: 1800, vol: 0.05, buzz: 120 },
    cafeteria: { hum: 55, lp: 700, vol: 0.05, air: true },
    medbay: { hum: 58, lp: 400, vol: 0.04, beep: 1320 },
    o2: { hum: 50, lp: 900, vol: 0.05, air: true },
    comms: { hum: 62, lp: 500, vol: 0.04, beep: 1760 },
    quiet: { hum: 52, lp: 300, vol: 0.04 },
  };
  function startAmb(c, kind, dest) {
    const k = AMB[kind] || AMB.corridor;
    const out = c.createGain();
    out.gain.value = 0.0001;
    out.connect(dest || bus.ambBus);
    const nodes = [];
    const hum = c.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = k.hum;
    const hg = c.createGain();
    hg.gain.value = 0.5;
    hum.connect(hg);
    hg.connect(out);
    nodes.push(hum);
    const src = c.createBufferSource();
    src.buffer = noiseBuf(c, bus);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = k.lp;
    const ng = c.createGain();
    ng.gain.value = k.rumble ? 1.4 : 0.8;
    src.connect(f);
    f.connect(ng);
    ng.connect(out);
    nodes.push(src);
    if (k.pulse) {
      const lfo = c.createOscillator();
      lfo.frequency.value = k.pulse;
      const lg = c.createGain();
      lg.gain.value = 0.35;
      lfo.connect(lg);
      lg.connect(hg.gain);
      nodes.push(lfo);
    }
    if (k.buzz) {
      const bz = c.createOscillator();
      bz.type = 'sawtooth';
      bz.frequency.value = k.buzz;
      const bf = c.createBiquadFilter();
      bf.type = 'bandpass';
      bf.frequency.value = 240;
      bf.Q.value = 3;
      const bg = c.createGain();
      bg.gain.value = 0.12;
      bz.connect(bf);
      bf.connect(bg);
      bg.connect(out);
      nodes.push(bz);
    }
    if (k.air) {
      const af = c.createBiquadFilter();
      af.type = 'highpass';
      af.frequency.value = 2500;
      const ag = c.createGain();
      ag.gain.value = 0.25;
      src.connect(af);
      af.connect(ag);
      ag.connect(out);
    }
    nodes.forEach((n) => n.start());
    const now = c.currentTime;
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(k.vol, now + 1.2);
    let beepT = null;
    if (k.beep) {
      beepT = setInterval(() => {
        if (!ctx || !enabled || document.hidden) return;
        osc(ctx, out, ctx.currentTime, { f: k.beep, rel: 0.12, vol: 0.12 });
        osc(ctx, out, ctx.currentTime + 0.14, { f: k.beep * 0.75, rel: 0.12, vol: 0.08 });
      }, 2600 + Math.random() * 1500);
    }
    return {
      stop() {
        if (beepT) clearInterval(beepT);
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        nodes.forEach((n) => {
          try {
            n.stop(t + 0.9);
          } catch (e) {
            /* já parado */
          }
        });
        setTimeout(() => out.disconnect(), 1200);
      },
    };
  }

  /* piso e ambiente de cada área da nave */
  const SURF = { cafeteria: 'tile', medbay: 'tile', o2: 'tile', navigation: 'tile', admin: 'carpet', comms: 'carpet', security: 'carpet' };
  const AMB_OF = { upperEngine: 'engine', lowerEngine: 'engine', reactor: 'reactor', electrical: 'electrical', cafeteria: 'cafeteria', medbay: 'medbay', o2: 'o2', comms: 'comms', admin: 'quiet', security: 'quiet', navigation: 'quiet', weapons: 'quiet', shields: 'electrical', storage: 'corridor' };

  /* ---------- ambiente em 3D ----------
     Cada sala com máquina é uma fonte de som no mapa: dentro dela o som envolve (vem do meio da sala); fora, vem
     do ponto da sala mais perto de você, some com a distância e sai abafado se não há caminho de visão até lá
     (parede, porta fechada). Por baixo, o zumbido baixo da nave, sempre. Só as 4 fontes mais fortes tocam. */
  const EMIT = [
    { area: 'reactor', kind: 'reactor', range: 12, vol: 1.1 },
    { area: 'upperEngine', kind: 'engine', range: 11, vol: 1 },
    { area: 'lowerEngine', kind: 'engine', range: 11, vol: 1 },
    { area: 'electrical', kind: 'electrical', range: 7, vol: 1 },
    { area: 'shields', kind: 'electrical', range: 6, vol: 0.7 },
    { area: 'medbay', kind: 'medbay', range: 7, vol: 1 },
    { area: 'comms', kind: 'comms', range: 7, vol: 1 },
    { area: 'o2', kind: 'o2', range: 7, vol: 1 },
    { area: 'cafeteria', kind: 'cafeteria', range: 8, vol: 1 },
  ];
  const MAX_EMIT = 4;
  let bed = null, scene = null;
  const live = new Map();
  function stopAll() {
    if (bed) bed.stop();
    bed = null;
    for (const e of live.values()) e.stop();
    live.clear();
  }
  function startEmitter(c, def) {
    const g = c.createGain();
    g.gain.value = 0;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 16000;
    const pn = panner3d(c);
    g.connect(lp);
    lp.connect(pn);
    pn.connect(bus.ambBus);
    const src = startAmb(c, def.kind, g);
    return {
      g, lp, pn, quietT: 0,
      stop() {
        src.stop();
        setTimeout(() => {
          try { pn.disconnect(); } catch (e) { /* já solto */ }
        }, 1300);
      },
    };
  }
  /* o que cada fonte faz com o jogador em (lx, ly) */
  function hear(def, sc) {
    const M = AU.Map, a = M && M.AREA[def.area];
    if (!a || !a.rect) return null;
    const [rx, ry, rw, rh] = a.rect;
    const cx = rx + rw / 2, cy = ry + rh / 2;
    const lx = sc.x, ly = sc.y;
    const nx = Math.max(rx, Math.min(rx + rw, lx)), ny = Math.max(ry, Math.min(ry + rh, ly));
    const out = Math.hypot(lx - nx, ly - ny);
    if (out > def.range) return null;
    let gain = def.vol * (out <= 0 ? 1 : Math.pow(1 - out / def.range, 1.6));
    let dx, dy, muffle = false;
    if (out <= 0) {
      /* dentro da sala: vem do meio dela, sem puxar demais para um lado */
      dx = (cx - lx) * 0.45;
      dy = (cy - ly) * 0.45;
    } else {
      dx = nx - lx + (cx - nx) * 0.15;
      dy = ny - ly + (cy - ny) * 0.15;
      /* linha até um ponto logo dentro da sala (pela porta aberta, por exemplo) */
      const k = Math.min(0.9, 0.9 / Math.max(0.01, Math.hypot(cx - nx, cy - ny)));
      const px = nx + (cx - nx) * k, py = ny + (cy - ny) * k;
      if (sc.los && !sc.los(lx, ly, px, py)) muffle = true;
    }
    if (sc.inVent) muffle = true;
    if (muffle) gain *= 0.45;
    if (!sc.alive) gain *= 0.7;
    return { gain, dx, dy, muffle };
  }
  function refresh() {
    if (!scene || !enabled || !ambOn) {
      stopAll();
      return;
    }
    const c = ensure();
    if (!c) return;
    const now = c.currentTime;
    /* zumbido de fundo (fantasma ouve a nave mais distante) */
    const bedKind = scene.alive ? 'corridor' : 'quiet';
    if (bed && bed.kind !== bedKind) {
      bed.stop();
      bed = null;
    }
    if (!bed) {
      try {
        bed = startAmb(c, bedKind);
        bed.kind = bedKind;
      } catch (e) {
        bed = null;
      }
    }
    const want = [];
    for (const def of EMIT) {
      const h = hear(def, scene);
      if (h && h.gain > 0.015) want.push({ def, h });
    }
    want.sort((a, b) => b.h.gain - a.h.gain);
    const keep = new Set(want.slice(0, MAX_EMIT).map((w) => w.def));
    for (const w of want) {
      if (!keep.has(w.def)) continue;
      let e = live.get(w.def);
      if (!e) {
        try {
          e = startEmitter(c, w.def);
        } catch (err) {
          continue;
        }
        live.set(w.def, e);
        place(e.pn, w.h.dx, w.h.dy);
      } else place(e.pn, w.h.dx, w.h.dy, now);
      e.quietT = 0;
      e.on = true;
      e.g.gain.setTargetAtTime(w.h.gain, now, 0.25);
      e.lp.frequency.setTargetAtTime(w.h.muffle ? 480 : 16000, now, 0.2);
    }
    /* fontes que saíram do alcance: baixam e, depois de um tempo quietas, são desligadas */
    for (const [def, e] of live) {
      if (keep.has(def)) continue;
      e.on = false;
      e.g.gain.setTargetAtTime(0, now, 0.3);
      if ((e.quietT += 1) > 15) {
        e.stop();
        live.delete(def);
      }
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend().catch(() => {});
      else if (enabled) ctx.resume().catch(() => {});
    });
  }

  AU.Audio = {
    surfaceOf: (areaId) => SURF[areaId] || 'metal',
    ambienceOf: (areaId) => AMB_OF[areaId] || 'corridor',
    /* at (opcional): { gain, pan, muffle } para sons que acontecem num ponto do mapa (ver Game.sfxAt) */
    play(name, when, at) {
      /* aba escondida: o jogo para (sem quadros) e o som também, senão os sons se acumulam e saem todos juntos na volta */
      if (!enabled || !S[name] || (typeof document !== 'undefined' && document.hidden)) return;
      const c = ensure();
      if (!c) return;
      try {
        S[name](c, bus, route(c, bus, name, spatial(c, bus, at)), c.currentTime + (when || 0));
      } catch (e) {
        /* áudio indisponível */
      }
    },
    /* passo do jogador: piso metal, azulejo ou carpete; no máximo um a cada 0,15 s */
    step(surface) {
      if (!enabled) return;
      const now = performance.now();
      if (now - lastStep < 150) return;
      lastStep = now;
      AU.Audio.play(surface === 'tile' ? 'stepTile' : surface === 'carpet' ? 'stepCarpet' : 'stepMetal');
    },
    /* Ambiente 3D: o jogo chama várias vezes por segundo com a posição do jogador.
       sc = { x, y, alive, inVent, los(x0, y0, x1, y1) }; null desliga (reunião, menus). */
    listen(sc) {
      scene = sc || null;
      refresh();
    },
    /* compatibilidade: ambience(null) desliga o ambiente */
    ambience(kind) {
      if (kind == null) AU.Audio.listen(null);
    },
    unlock() { ensure(); },
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) AU.Audio.alarm(false);
      refresh();
    },
    get enabled() { return enabled; },
    /* volume geral, de 0 a 1 */
    setVolume(v) {
      volume = Math.max(0, Math.min(1, +v || 0));
      if (ctx && bus) bus.master.gain.setTargetAtTime(MASTER * volume, ctx.currentTime, 0.03);
    },
    get volume() { return volume; },
    /* som ambiente das salas (motores, reator, bipes) ligado ou não, sem mexer nos efeitos */
    setAmbienceOn(on) {
      ambOn = !!on;
      refresh();
    },
    get ambienceOn() { return ambOn; },
    /* ambiente tocando agora: fontes ativas (null = nenhum) */
    get ambiencePlaying() {
      if (!bed && !live.size) return null;
      return [...live].filter(([, e]) => e.on).map(([d]) => d.area).join(',') || 'fundo';
    },
    alarm(on) {
      if (on && !alarmT && enabled) {
        if (!ensure()) return;
        AU.Audio.play('alarm');
        alarmT = setInterval(() => AU.Audio.play('alarm'), 820);
      } else if (!on && alarmT) {
        clearInterval(alarmT);
        alarmT = null;
      }
    },
    /* para conferir níveis: renderiza um som num contexto offline e devolve pico, RMS e duração audível */
    async analyze(name, secs) {
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const c = new OC(1, Math.floor(44100 * (secs || 3)), 44100);
      const b = makeBus(c);
      S[name](c, b, route(c, b, name), 0.01);
      const buf = await c.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0, sum = 0, last = 0;
      for (let i = 0; i < d.length; i++) {
        const a = Math.abs(d[i]);
        if (a > peak) peak = a;
        sum += d[i] * d[i];
        if (a > 0.003) last = i;
      }
      return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), dur: +(last / 44100).toFixed(2) };
    },
    names: () => Object.keys(S),
  };
})();

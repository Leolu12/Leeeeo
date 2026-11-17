/* O corpo de cada bot: o jeito próprio de mexer o personagem, como cada pessoa mexe o seu.
   Quem joga de verdade segura um controle: no teclado o boneco só anda em 8 direções (vira seco, de 45 em 45 graus,
   e às vezes passa do ponto e volta um pouquinho); no celular ou no controle, o polegar faz curvas e balança um pouco.
   Ninguém para perfeitamente imóvel esperando: uns olham em volta, dão passinhos, giram o boneco, rodam pela sala.
   Cada bot sorteia o seu estilo (puxado pela personalidade) e o humor do momento muda o jeito de andar: nervoso olha
   mais em volta e não para quieto, entediado gira e anda à toa, apressado corta caminho e não hesita.
   Medido antes: 14 viradas bruscas por minuto em ângulos que nenhum controle faz, e o boneco trocando de lado ~10
   vezes por minuto (às vezes por menos de 0,3 s) só por um desvio mínimo do caminho. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U;

  const TAU = Math.PI * 2;
  const wrap = (a) => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };

  /* temperamento do corpo por personalidade: [hesitação, inquietação, olhar em volta, oscilação] (multiplicadores) */
  const TEMPER = {
    analitico: [1.2, 0.6, 1.4, 0.8],
    impulsivo: [0.5, 1.4, 0.9, 1.2],
    falador: [0.8, 1.3, 1.1, 1.1],
    silencioso: [1, 0.5, 0.6, 0.8],
    caotico: [0.6, 1.9, 1, 1.5],
    lider: [0.7, 0.8, 1.2, 0.9],
    defensor: [1, 0.8, 1, 1],
    cetico: [1.1, 0.7, 1.6, 0.9],
    seguidor: [1, 0.8, 1.1, 1],
    inexperiente: [1.6, 1.1, 1.4, 1.6],
  };

  /* o que o humor muda: [hesitação, inquietação, olhar, oscilação, corte de quina] */
  const MOOD = {
    calmo: [1, 1, 1, 1, 1],
    nervoso: [0.45, 1.7, 1.9, 1.6, 1.1],
    desconfiado: [0.9, 0.9, 1.8, 1, 1],
    entediado: [1.5, 2.2, 0.8, 1.1, 0.9],
    apressado: [0.25, 0.3, 0.4, 0.9, 1.4],
    focado: [0.7, 0.5, 0.6, 0.8, 1.2],
  };
  const MOODS = Object.keys(MOOD);

  const Motor = {
    MOODS,
    /* estilo sorteado para o bot (uma vez por partida) */
    make(b) {
      const t = TEMPER[b.p && b.p.personality] || [1, 1, 1, 1];
      const keyboard = Math.random() < 0.58;
      const lostish = b.pers && b.pers.lost ? 1.3 : 1;
      return {
        input: keyboard ? 'teclado' : 'analogico',
        /* joystick: quão rápido o polegar gira o boneco (rad/s) e quanto ele balança */
        turn: U.rf(9, 15) / Math.sqrt(t[3]),
        wobble: keyboard ? 0 : U.rf(0.02, 0.07) * t[3],
        /* quanto antes da quina já começa a virar (tiles) */
        cut: U.rf(0.35, 1.0),
        /* teclado: solta a tecla um pouco tarde e passa do ponto */
        overshoot: keyboard ? U.rf(0.08, 0.32) * lostish : U.rf(0, 0.1),
        /* parar para decidir o próximo passo (s) */
        hesitate: U.rf(0.12, 0.7) * t[0] * lostish,
        /* não fica parado quieto: frequência dos gestos */
        fidget: U.clamp(U.rf(0.25, 1) * t[1], 0.08, 2),
        /* parar/virar para olhar quem passa ou a sala em que entrou */
        look: U.clamp(U.rf(0.15, 0.6) * t[2], 0.05, 1.2),
        /* depois da reunião, demora para começar a andar (lendo o chat, olhando o mapa) */
        startLag: U.rf(0.15, 1.6) * t[0],
        /* todos andam na velocidade do jogo; no joystick, às vezes o polegar não vai até o fim */
        speed: keyboard ? 1 : U.rf(0.93, 1),
        /* gestos preferidos quando parado */
        gestures: U.shuffle(['olhar', 'olhar', 'passinho', 'girar', 'rodar']).slice(0, 3),
        phase: Math.random() * 100,
      };
    },

    /* humor do momento: o que a mente escolheu, ou o que o próprio corpo sente (susto, pressa, tédio) */
    mood(b) {
      const g = b.g, p = b.p, t = g.t;
      if (b.moodSet && t < b.moodSet.until) return b.moodSet.kind;
      if ((b.fear && t - b.fear.t < 25) || (b.shock && t < b.shock.until + 15) || (b.escape && t - b.escape.t0 < 20)) return 'nervoso';
      if (g.sabCritical && g.sabCritical()) return 'apressado';
      if (p.isImp ? b.plan && (b.plan.type === 'hunt' || b.plan.type === 'prowl') : false) return 'focado';
      if (!p.isImp && p.alive && p.tasks.every((tk) => tk.done) && t - g.roundStart > 25) return 'entediado';
      return 'calmo';
    },
    setMood(b, kind, secs) {
      if (!MOOD[kind]) return;
      b.moodSet = { kind, until: b.g.t + (secs || 60) };
    },
    k(b, i) {
      return MOOD[Motor.mood(b)][i];
    },

    /* direção que o controle consegue fazer, a partir da direção desejada (vetor unitário) */
    steer(b, dt, vx, vy) {
      const st = b.motor, g = b.g;
      const want = Math.atan2(vy, vx);
      if (st.input === 'teclado') {
        /* 8 direções; só troca de tecla quando a direção desejada sai bem do setor (sem tremer entre duas) */
        const cur = b.keyDir;
        if (cur == null || Math.abs(wrap(want - cur)) > (Math.PI / 8) * 1.45) b.keyDir = Math.round(want / (Math.PI / 4)) * (Math.PI / 4);
        b.heading = b.keyDir;
        return { x: Math.cos(b.keyDir), y: Math.sin(b.keyDir) };
      }
      /* joystick: o polegar gira o boneco até a direção desejada (meia-volta é mais rápida: a pessoa puxa o
         polegar para o outro lado) e balança um pouquinho */
      let h = b.heading == null ? want : b.heading;
      const d = wrap(want - h), rate = st.turn * (Math.abs(d) > 2.2 ? 2.4 : 1) * (1 + 0.2 * (Motor.k(b, 4) - 1));
      h += U.clamp(d, -rate * dt, rate * dt);
      b.heading = wrap(h);
      const w = st.wobble * Motor.k(b, 3) * Math.sin(g.t * 2.3 + st.phase) * Math.sin(g.t * 0.9 + st.phase * 2);
      return { x: Math.cos(b.heading + w), y: Math.sin(b.heading + w) };
    },
    /* parou de andar: o controle volta ao centro */
    release(b) {
      b.keyDir = null;
    },

    /* para que lado o boneco olha: segue o lado para onde a pessoa empurra o controle de verdade, sem trocar por um
       desvio mínimo (era isso que fazia o boneco piscar de lado nos corredores) */
    face(b, vx) {
      const p = b.p, g = b.g, st = b.motor;
      const want = vx < 0 ? -1 : 1;
      if (want === p.facing) return;
      const strong = st.input === 'teclado' ? Math.abs(vx) > 0.3 : Math.abs(vx) > 0.45;
      if (!strong) return;
      if (st.input !== 'teclado' && g.t - (b.faceAt || 0) < 0.22 && Math.abs(vx) < 0.85) return;
      p.facing = want;
      b.faceAt = g.t;
    },

    /* hora de começar a andar para um destino novo? (pessoa leva um instante para decidir e sair) */
    holding(b) {
      return b.holdUntil && b.g.t < b.holdUntil;
    },
    hesitate(b, urgent) {
      if (urgent) {
        b.holdUntil = 0;
        return;
      }
      const s = b.motor.hesitate * Motor.k(b, 0) * U.rf(0.5, 1.6);
      if (s > 0.08) b.holdUntil = b.g.t + s;
    },

    /* entrou numa sala com gente: às vezes para um instante olhando (como quem confere quem está ali) */
    enterRoom(b, people) {
      const st = b.motor;
      const pr = Math.min(0.55, st.look * Motor.k(b, 2) * (people ? 0.35 : 0.12));
      if (Math.random() < pr) b.holdUntil = Math.max(b.holdUntil || 0, b.g.t + U.rf(0.25, 0.8));
    },

    /* parado esperando (não numa tarefa): gestos de quem segura o controle sem ter o que fazer */
    idle(b, dt) {
      const g = b.g, p = b.p, st = b.motor;
      if (b.micro) return Motor.microStep(b, dt);
      b.idleT = (b.idleT == null ? U.rf(0.6, 2) : b.idleT) - dt;
      if (b.spin) {
        b.spin.t -= dt;
        if (b.spin.t <= 0) {
          p.facing = -p.facing;
          b.spin.n--;
          b.spin.t = U.rf(0.09, 0.2);
          if (b.spin.n <= 0) b.spin = null;
        }
        return;
      }
      if (b.idleT > 0) return;
      const fid = st.fidget * Motor.k(b, 1);
      b.idleT = U.rf(0.9, 3.2) / Math.max(0.15, fid);
      if (Math.random() > Math.min(0.92, 0.35 + fid * 0.4)) return;
      /* alguém por perto: quem gosta de olhar vira para a pessoa */
      const near = (b.seenNow || []).filter((q) => q.alive && U.dist(p, q) < 6);
      const lookK = st.look * Motor.k(b, 2);
      if (near.length && Math.random() < Math.min(0.8, lookK)) {
        const q = U.pick(near);
        if (Math.abs(q.x - p.x) > 0.2) p.facing = q.x < p.x ? -1 : 1;
        return;
      }
      const bored = Motor.mood(b) === 'entediado';
      const gs = bored ? ['girar', 'rodar', 'passinho'] : st.gestures;
      let gst = U.pick(gs);
      /* rodar pela sala só quem é bem inquieto ou está entediado (andar à toa sem motivo parece robô) */
      if (gst === 'rodar' && !bored && fid < 0.9) gst = 'passinho';
      if (gst === 'olhar') p.facing = -p.facing;
      else if (gst === 'girar') b.spin = { n: U.rint(2, 6), t: 0.1 };
      else if (gst === 'passinho' || gst === 'rodar') {
        const r = gst === 'rodar' ? U.rf(0.8, 1.8) : U.rf(0.2, 0.5);
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
          if (g.canStand(x, y, !p.alive) && AU.Nav.clearLine(p.x, p.y, x, y, !p.alive)) {
            b.micro = { pts: gst === 'rodar' ? [{ x, y }, { x: p.x + (p.x - x) * 0.4, y: p.y + (p.y - y) * 0.4 }, { x: p.x, y: p.y }] : [{ x, y }, { x: p.x, y: p.y }], i: 0 };
            break;
          }
        }
      }
    },
    /* passinhos de quem está esperando: anda devagar até cada ponto e volta */
    microStep(b, dt) {
      const g = b.g, p = b.p, m = b.micro;
      const pt = m.pts[m.i];
      if (!pt) {
        b.micro = null;
        return;
      }
      const dx = pt.x - p.x, dy = pt.y - p.y, d = Math.hypot(dx, dy);
      const sp = g.speedOf(p) * (b.motor.input === 'teclado' ? 1 : 0.7);
      if (d < 0.06 || d < sp * dt) {
        m.i++;
        if (m.i >= m.pts.length) b.micro = null;
        return;
      }
      const bx = p.x, by = p.y;
      g.moveEntity(p, (dx / d) * sp, (dy / d) * sp, dt, true);
      Motor.face(b, dx / d);
      if (Math.hypot(p.x - bx, p.y - by) < sp * dt * 0.3) b.micro = null;
    },
    /* para tudo (o plano mudou, começou a andar de verdade) */
    stopIdle(b) {
      b.micro = null;
      b.spin = null;
    },
  };

  AU.Motor = Motor;
})();

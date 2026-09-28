/* Minitarefas interativas (tarefas e consertos de sabotagem). */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, M = AU.Map;
  const h = U.h;

  let cur = null;
  let raf = 0;

  const MG = {
    host: null,
    isOpen() { return !!cur; },
    current() { return cur; },
    close(silent) {
      if (!cur) return;
      const c = cur;
      cur = null;
      cancelAnimationFrame(raf);
      try {
        c.cleanup.forEach((f) => f());
      } catch (e) {
        /* ignora */
      }
      c.el.remove();
      if (c.onClose) c.onClose(!!silent);
    },
  };

  function frame(ts) {
    if (!cur) return;
    const dt = Math.min(0.05, (ts - (cur.last || ts)) / 1000);
    cur.last = ts;
    if (cur.tick) {
      try {
        cur.tick(dt);
      } catch (e) {
        if (window.console) console.error(e);
      }
    }
    if (cur) raf = requestAnimationFrame(frame);
  }

  function open(spec) {
    MG.close(true);
    const body = h('div', { class: 'mg-body' });
    const status = h('div', { class: 'mg-status', role: 'status' });
    const closeBtn = h('button', { class: 'mg-close', 'aria-label': 'Fechar tarefa', title: 'Fechar (Esc)' }, '✕');
    const el = h('div', { class: 'mg-wrap' + (spec.cls ? ' ' + spec.cls : '') },
      h('div', { class: 'mg-panel', role: 'dialog', 'aria-label': spec.title },
        h('div', { class: 'mg-head' },
          h('div', {}, h('div', { class: 'mg-title' }, spec.title), spec.sub ? h('div', { class: 'mg-sub' }, spec.sub) : null),
          closeBtn),
        body, status));
    cur = { el, cleanup: [], onClose: spec.onClose, tick: null, finished: false };
    closeBtn.addEventListener('click', () => MG.close());
    el.addEventListener('pointerdown', (e) => {
      if (e.target === el) MG.close();
    });
    (MG.host || document.body).appendChild(el);
    const api = {
      body,
      msg(t, kind) {
        status.textContent = t || '';
        status.className = 'mg-status' + (kind ? ' ' + kind : '');
      },
      done(delay) {
        if (!cur || cur.finished) return;
        cur.finished = true;
        const mine = cur;
        if (spec.onDone) spec.onDone();
        setTimeout(() => {
          if (cur === mine) MG.close(true);
        }, delay == null ? 550 : delay);
      },
      onCleanup(f) { cur.cleanup.push(f); },
      get finished() { return !cur || cur.finished; },
    };
    const res = spec.build(body, api) || {};
    if (cur) {
      cur.tick = res.tick || null;
      if (res.cleanup) cur.cleanup.push(res.cleanup);
      cur.last = 0;
      raf = requestAnimationFrame(frame);
    }
    return api;
  }

  /* Canvas com coordenadas lógicas e captura de ponteiro. */
  function mkCanvas(root, w, hgt) {
    const c = h('canvas', { class: 'mg-canvas', width: w * 2, height: hgt * 2 });
    c.style.aspectRatio = w + ' / ' + hgt;
    root.appendChild(c);
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * hgt) / r.height };
    };
    const on = (down, move, up) => {
      let active = false;
      c.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        active = down(pos(e), e) !== false;
        if (active) {
          try {
            c.setPointerCapture(e.pointerId);
          } catch (er) {
            /* ignora */
          }
        }
      });
      c.addEventListener('pointermove', (e) => {
        if (active && move) move(pos(e), e);
      });
      const end = (e) => {
        if (active && up) up(pos(e), e);
        active = false;
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
    };
    return { c, ctx, pos, on, w, h: hgt };
  }

  /* ---------- arte comum: metal escovado, rebites, faixas de perigo, telas ---------- */
  const rr = (c, x, y, w, hh, r) => AU.Render.rr(c, x, y, w, hh, r);
  const A = {
    plate(c, x, y, w, hh, o) {
      o = o || {};
      const g = c.createLinearGradient(0, y, 0, y + hh);
      g.addColorStop(0, o.top || '#5f6879');
      g.addColorStop(1, o.bottom || '#3a414f');
      c.fillStyle = g;
      rr(c, x, y, w, hh, o.r == null ? 8 : o.r);
      c.fill();
      /* escovado */
      c.save();
      rr(c, x, y, w, hh, o.r == null ? 8 : o.r);
      c.clip();
      c.globalAlpha = 0.06;
      c.strokeStyle = '#ffffff';
      c.lineWidth = 1;
      for (let i = 0; i < hh; i += 3) {
        c.beginPath();
        c.moveTo(x, y + i + ((i * 7) % 5) * 0.2);
        c.lineTo(x + w, y + i);
        c.stroke();
      }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + 6, y + 1.5);
      c.lineTo(x + w - 6, y + 1.5);
      c.stroke();
      c.strokeStyle = o.line || '#151922';
      c.lineWidth = o.lw || 2;
      rr(c, x, y, w, hh, o.r == null ? 8 : o.r);
      c.stroke();
      if (o.rivets) {
        const m = 9;
        [[x + m, y + m], [x + w - m, y + m], [x + m, y + hh - m], [x + w - m, y + hh - m]].forEach(([rx, ry]) => A.rivet(c, rx, ry));
      }
    },
    rivet(c, x, y, r) {
      r = r || 3.2;
      const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 0, x, y, r);
      g.addColorStop(0, '#c9d1de');
      g.addColorStop(1, '#4a5160');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)';
      c.lineWidth = 1;
      c.stroke();
    },
    hazard(c, x, y, w, hh) {
      c.save();
      c.beginPath();
      c.rect(x, y, w, hh);
      c.clip();
      c.fillStyle = '#e8b923';
      c.fillRect(x, y, w, hh);
      c.fillStyle = '#1b1d22';
      for (let i = -hh; i < w + hh; i += 18) {
        c.beginPath();
        c.moveTo(x + i, y + hh);
        c.lineTo(x + i + 9, y + hh);
        c.lineTo(x + i + 9 + hh, y);
        c.lineTo(x + i + hh, y);
        c.closePath();
        c.fill();
      }
      c.restore();
      c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1);
    },
    screen(c, x, y, w, hh, o) {
      o = o || {};
      A.plate(c, x - 6, y - 6, w + 12, hh + 12, { r: 10, top: '#2c323d', bottom: '#1b1f27' });
      const g = c.createRadialGradient(x + w / 2, y + hh / 2, 0, x + w / 2, y + hh / 2, Math.max(w, hh) * 0.7);
      g.addColorStop(0, o.inner || '#0d2a1d');
      g.addColorStop(1, o.outer || '#050d09');
      c.fillStyle = g;
      rr(c, x, y, w, hh, o.r == null ? 6 : o.r);
      c.fill();
    },
    scanlines(c, x, y, w, hh, a) {
      c.save();
      c.beginPath();
      c.rect(x, y, w, hh);
      c.clip();
      c.fillStyle = `rgba(0,0,0,${a == null ? 0.18 : a})`;
      for (let i = 0; i < hh; i += 3) c.fillRect(x, y + i, w, 1);
      c.fillStyle = 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + w * 0.45, y);
      c.lineTo(x + w * 0.25, y + hh);
      c.lineTo(x, y + hh);
      c.closePath();
      c.fill();
      c.restore();
    },
    led(c, x, y, r, color, on) {
      if (on) {
        const g = c.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = 0.55;
        c.fillStyle = g;
        c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
        c.globalAlpha = 1;
      }
      c.fillStyle = on ? color : '#2a2f38';
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#11141a';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.beginPath();
      c.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
      c.fill();
    },
    text(c, s, x, y, size, color, align, font) {
      c.font = `700 ${size}px ${font || '"Chakra Petch", monospace'}`;
      c.textAlign = align || 'center';
      c.textBaseline = 'middle';
      c.fillStyle = color;
      c.fillText(s, x, y);
      c.textBaseline = 'alphabetic';
    },
    /* cabo grosso com contorno e brilho, como os fios do painel elétrico */
    cable(c, x1, y1, x2, y2, color, wdt) {
      wdt = wdt || 14;
      c.lineCap = 'round';
      c.strokeStyle = '#0d0f14';
      c.lineWidth = wdt + 4;
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y2);
      c.stroke();
      c.strokeStyle = color;
      c.lineWidth = wdt;
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = wdt * 0.22;
      c.beginPath();
      c.moveTo(x1, y1 - wdt * 0.22);
      c.lineTo(x2, y2 - wdt * 0.22);
      c.stroke();
    },
    hex(c, x, y, r, rot) {
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + (rot == null ? Math.PI / 6 : rot);
        if (k) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath();
    },
    stars(seed, n, w, hh) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const r1 = Math.sin((seed + i) * 91.3) * 43758.5, r2 = Math.sin((seed + i) * 17.7) * 24634.6, r3 = Math.sin((seed + i) * 5.1) * 1234.5;
        out.push({ x: (r1 - Math.floor(r1)) * w, y: (r2 - Math.floor(r2)) * hh, b: 0.3 + (r3 - Math.floor(r3)) * 0.7 });
      }
      return out;
    },
  };
  const panelBg = (ctx, w, hh) => {
    A.plate(ctx, 0, 0, w, hh, { rivets: true, r: 10 });
  };

  /* ================= TAREFAS ================= */
  const B = {};

  B.swipe = (root, api, ctx) => {
    const K = mkCanvas(root, 400, 260);
    const me = ctx && ctx.p;
    let stage = 'wallet';
    const card = { x: 70, y: 186, tx: 70, ty: 186 };
    let drag = null, light = 0, lightC = '#3ae08a', t = 0;
    let msg = 'INSIRA O CARTÃO', msgC = '#7df9c1';
    const result = (ok, text, col) => {
      msg = text;
      msgC = col;
      light = 1.2;
      lightC = ok ? '#3ae08a' : '#ff4040';
    };
    K.on(
      (p) => {
        if (api.finished) return false;
        if (stage === 'wallet' && p.x > 40 && p.x < 220 && p.y > 150) {
          stage = 'swipe';
          card.tx = 30;
          card.ty = 104;
          msg = 'DESLIZE O CARTÃO';
          msgC = '#7df9c1';
          return false;
        }
        if (stage === 'swipe' && Math.abs(card.y - card.ty) < 2 && p.x > card.x && p.x < card.x + 110 && p.y > card.y - 10 && p.y < card.y + 70) {
          drag = { off: p.x - card.x, t0: performance.now() };
          return true;
        }
        return false;
      },
      (p) => {
        if (drag) card.x = card.tx = U.clamp(p.x - drag.off, 30, 290);
      },
      () => {
        if (!drag) return;
        const dur = (performance.now() - drag.t0) / 1000;
        if (card.x >= 285) {
          if (dur < 0.55) {
            result(false, 'MUITO RÁPIDO. TENTE DE NOVO.', '#ff6b6b');
            AU.Audio.play('fail');
          } else if (dur > 1.35) {
            result(false, 'MUITO DEVAGAR. TENTE DE NOVO.', '#ff6b6b');
            AU.Audio.play('fail');
          } else {
            result(true, 'ACEITO. OBRIGADO.', '#7df9c1');
            api.done(800);
          }
        } else {
          msg = 'PASSE O CARTÃO ATÉ O FIM.';
          msgC = '#ffd166';
        }
        if (!api.finished) card.tx = 30;
        drag = null;
      }
    );
    api.msg('Clique no cartão, depois arraste-o pelo leitor num ritmo constante.');
    const drawCard = (c) => {
      const x = card.x, y = card.y;
      c.fillStyle = '#f2f4f8';
      rr(c, x, y, 110, 64, 8);
      c.fill();
      c.strokeStyle = '#9aa3b4';
      c.lineWidth = 1.5;
      c.stroke();
      c.fillStyle = '#3b6fd8';
      rr(c, x, y, 110, 14, [8, 8, 0, 0]);
      c.fill();
      A.text(c, 'THE SKELD · ID', x + 55, y + 7.5, 8, '#ffffff');
      c.fillStyle = '#cfe2ff';
      c.fillRect(x + 8, y + 19, 32, 38);
      if (me) AU.Render.drawBean(c, x + 24, y + 42, 30, me.color, { hat: me.hat, visor: me.visor });
      c.fillStyle = '#1b2231';
      c.fillRect(x + 46, y + 22, 56, 5);
      A.text(c, me ? me.name.toUpperCase().slice(0, 10) : 'TRIPULANTE', x + 46, y + 35, 8, '#1b2231', 'left');
      for (let i = 0; i < 18; i++) c.fillRect(x + 46 + i * 3, y + 44, i % 3 ? 1 : 2, 12);
    };
    return {
      tick(dt) {
        t += dt;
        light = Math.max(0, light - dt);
        card.x += (card.tx - card.x) * Math.min(1, dt * 12);
        card.y += (card.ty - card.y) * Math.min(1, dt * 10);
        const c = K.ctx;
        panelBg(c, 400, 260);
        /* leitor: visor verde e duas luzes */
        A.plate(c, 16, 12, 368, 72, { r: 10, top: '#3a4150', bottom: '#262b35' });
        A.screen(c, 32, 24, 262, 46, {});
        A.text(c, msg, 163, 47, msg.length > 18 ? 12 : 15, msgC);
        A.scanlines(c, 32, 24, 262, 46);
        A.led(c, 322, 47, 9, '#ff4040', light > 0 && lightC === '#ff4040');
        A.led(c, 352, 47, 9, '#3ae08a', light > 0 && lightC === '#3ae08a');
        /* canaleta onde o cartão corre */
        c.fillStyle = '#0a0c11';
        rr(c, 16, 96, 368, 16, 4);
        c.fill();
        /* carteira */
        if (stage === 'wallet' || card.y > 150) {
          c.fillStyle = '#6b4526';
          rr(c, 36, 176, 190, 78, 12);
          c.fill();
        }
        drawCard(c);
        /* borda do leitor por cima do cartão: parece enfiado na fenda */
        if (stage === 'swipe') {
          const g = c.createLinearGradient(0, 92, 0, 112);
          g.addColorStop(0, '#6b7486');
          g.addColorStop(1, '#3a404c');
          c.fillStyle = g;
          c.fillRect(16, 92, 368, 18);
          c.strokeStyle = '#151922';
          c.lineWidth = 2;
          c.strokeRect(16, 92, 368, 18);
          if (!drag && !api.finished) {
            c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3;
            A.text(c, '→ → →', 250, 190, 18, '#ffd23b');
            c.globalAlpha = 1;
          }
        }
        if (stage === 'wallet' || card.y > 150) {
          /* aba da frente da carteira, com costura */
          c.fillStyle = '#80552f';
          rr(c, 36, 204, 190, 50, [4, 4, 12, 12]);
          c.fill();
          c.strokeStyle = '#3b2412';
          c.lineWidth = 2;
          c.stroke();
          c.setLineDash([5, 4]);
          c.strokeStyle = '#d9b27c';
          c.lineWidth = 1.2;
          rr(c, 42, 210, 178, 38, [3, 3, 9, 9]);
          c.stroke();
          c.setLineDash([]);
          if (stage === 'wallet') {
            c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3;
            A.text(c, 'toque na carteira', 131, 230, 11, '#f7e3c0', 'center', '"Nunito", sans-serif');
            c.globalAlpha = 1;
          }
        }
      },
    };
  };

  B.wires = (root, api) => {
    const K = mkCanvas(root, 400, 300);
    const cols = ['#e8322e', '#2f5fe0', '#f2d021', '#e24ad0'];
    const ly = [62, 122, 182, 242];
    const perm = U.shuffle([0, 1, 2, 3]);
    const conn = [null, null, null, null];
    const lit = [0, 0, 0, 0];
    let drag = null;
    K.on(
      (p) => {
        if (p.x > 80) return false;
        const i = ly.findIndex((y) => Math.abs(y - p.y) < 24);
        if (i < 0 || conn[i] != null) return false;
        drag = { i, x: p.x, y: p.y };
        return true;
      },
      (p) => {
        if (drag) {
          drag.x = p.x;
          drag.y = p.y;
        }
      },
      (p) => {
        if (!drag) return;
        if (p.x > 310) {
          const j = ly.findIndex((y) => Math.abs(y - p.y) < 26);
          if (j >= 0 && perm[j] === drag.i && !conn.includes(j)) {
            conn[drag.i] = j;
            AU.Audio.play('click');
            if (conn.every((c) => c != null)) api.done(800);
          }
        }
        drag = null;
      }
    );
    api.msg('Arraste cada fio até o conector da mesma cor.');
    const plug = (c, x, y, col) => {
      /* ponta de cobre com o capuz colorido */
      c.fillStyle = col;
      rr(c, x - 12, y - 10, 16, 20, 4);
      c.fill();
      c.strokeStyle = '#0d0f14';
      c.lineWidth = 2;
      c.stroke();
      const g = c.createLinearGradient(0, y - 6, 0, y + 6);
      g.addColorStop(0, '#f3c27a');
      g.addColorStop(1, '#a86a22');
      c.fillStyle = g;
      c.fillRect(x + 4, y - 5, 10, 10);
      c.strokeRect(x + 4, y - 5, 10, 10);
    };
    return {
      tick(dt) {
        const c = K.ctx;
        panelBg(c, 400, 300);
        A.hazard(c, 10, 8, 380, 12);
        A.hazard(c, 10, 280, 380, 12);
        /* furos de onde saem os fios e os soquetes */
        A.plate(c, 0, 28, 56, 246, { r: 6, top: '#2b313c', bottom: '#1d222b' });
        A.plate(c, 344, 28, 56, 246, { r: 6, top: '#2b313c', bottom: '#1d222b' });
        for (let i = 0; i < 4; i++) {
          if (conn.includes(i)) lit[i] = Math.min(1, lit[i] + dt * 4);
          c.fillStyle = '#07090d';
          c.beginPath();
          c.ellipse(10, ly[i], 7, 12, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#07090d';
          c.fillRect(350, ly[i] - 12, 12, 24);
          /* bloco colorido do conector */
          c.fillStyle = cols[perm[i]];
          rr(c, 360, ly[i] - 13, 36, 26, 4);
          c.fill();
          c.strokeStyle = '#0d0f14';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.3)';
          c.fillRect(363, ly[i] - 10, 30, 5);
          A.led(c, 378, ly[i] - 24, 5, '#ffe36b', lit[i] > 0.5);
        }
        for (let i = 0; i < 4; i++) {
          let x2 = 44, y2 = ly[i];
          if (conn[i] != null) {
            x2 = 352;
            y2 = ly[conn[i]];
          } else if (drag && drag.i === i) {
            x2 = drag.x;
            y2 = drag.y;
          }
          A.cable(c, 4, ly[i], x2 - 6, y2, cols[i], 14);
          if (conn[i] == null) plug(c, x2 - 2, y2, cols[i]);
        }
      },
    };
  };

  B.calibrate = (root, api) => {
    const K = mkCanvas(root, 400, 270);
    const speeds = [2.1, 3.0, 3.9];
    const ang = [U.rf(0, 6), U.rf(0, 6), U.rf(0, 6)];
    const locked = [false, false, false];
    const colors = ['#ffd23b', '#3bd4ff', '#b06bff'];
    let k = 0, flash = 0;
    const btns = h('div', { class: 'mg-row' });
    const mk = (i) => h('button', {
      class: 'mg-btn', onclick: () => {
        if (i !== k || api.finished) return;
        const a = ((ang[i] % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const d = Math.min(a, Math.PI * 2 - a);
        if (d < 0.38) {
          locked[i] = true;
          ang[i] = 0;
          k++;
          AU.Audio.play('click');
          if (k === 3) api.done();
        } else {
          flash = 0.4;
          AU.Audio.play('fail');
        }
      },
    }, 'Calibrar ' + (i + 1));
    const bs = [0, 1, 2].map(mk);
    bs.forEach((b) => btns.appendChild(b));
    root.appendChild(btns);
    api.msg('Aperte "Calibrar" quando o ponteiro passar pela marca no topo.');
    return {
      tick(dt) {
        flash = Math.max(0, flash - dt);
        for (let i = 0; i < 3; i++) if (!locked[i]) ang[i] += speeds[i] * dt;
        bs.forEach((b, i) => (b.disabled = i !== k));
        const c = K.ctx;
        panelBg(c, 400, 270);
        A.hazard(c, 14, 12, 372, 10);
        for (let i = 0; i < 3; i++) {
          const cx = 70 + i * 130, cy = 140;
          A.led(c, cx, 42, 6, locked[i] ? '#3ae08a' : i === k ? '#ffd23b' : '#ff4040', locked[i] || i === k ? true : Math.sin(performance.now() / 300) > 0.6);
          /* aro metálico */
          const bz = c.createLinearGradient(cx - 60, cy - 60, cx + 60, cy + 60);
          bz.addColorStop(0, '#aab3c2');
          bz.addColorStop(1, '#3c4350');
          c.fillStyle = bz;
          c.beginPath();
          c.arc(cx, cy, 60, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#151922';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = flash > 0 && i === k ? '#4a1414' : '#0c1119';
          c.beginPath();
          c.arc(cx, cy, 50, 0, Math.PI * 2);
          c.fill();
          /* faixas coloridas do disco */
          for (let q = 0; q < 12; q++) {
            c.strokeStyle = q % 2 ? colors[i] : 'rgba(255,255,255,0.12)';
            c.lineWidth = 6;
            c.beginPath();
            c.arc(cx, cy, 44, (q / 12) * Math.PI * 2 + ang[i], ((q + 0.8) / 12) * Math.PI * 2 + ang[i]);
            c.stroke();
          }
          c.fillStyle = 'rgba(58,224,138,0.35)';
          c.beginPath();
          c.moveTo(cx, cy);
          c.arc(cx, cy, 50, -Math.PI / 2 - 0.38, -Math.PI / 2 + 0.38);
          c.closePath();
          c.fill();
          c.fillStyle = '#3ae08a';
          c.beginPath();
          c.moveTo(cx, cy - 62);
          c.lineTo(cx - 7, cy - 72);
          c.lineTo(cx + 7, cy - 72);
          c.closePath();
          c.fill();
          const a = ang[i] - Math.PI / 2;
          c.strokeStyle = '#0d0f14';
          c.lineWidth = 8;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
          c.stroke();
          c.strokeStyle = locked[i] ? '#3ae08a' : '#f4f6fb';
          c.lineWidth = 5;
          c.stroke();
          const hub = c.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 10);
          hub.addColorStop(0, '#e9edf5');
          hub.addColorStop(1, '#5a6275');
          c.fillStyle = hub;
          c.beginPath();
          c.arc(cx, cy, 9, 0, Math.PI * 2);
          c.fill();
          if (locked[i]) {
            c.strokeStyle = 'rgba(58,224,138,0.6)';
            c.lineWidth = 3;
            c.beginPath();
            c.arc(cx, cy, 56, 0, Math.PI * 2);
            c.stroke();
          }
          A.text(c, locked[i] ? 'OK' : 'CAL ' + (i + 1), cx, 234, 12, locked[i] ? '#3ae08a' : '#cfd6e4');
        }
      },
    };
  };

  B.chart = (root, api) => {
    const K = mkCanvas(root, 400, 260);
    const pts = [0, 1, 2, 3, 4].map((i) => ({ x: 40 + i * 80, y: U.rf(50, 210) }));
    const ship = { x: pts[0].x, y: pts[0].y };
    let next = 1, drag = false;
    K.on(
      (p) => {
        if (U.d2(p.x, p.y, ship.x, ship.y) > 30) return false;
        drag = true;
        return true;
      },
      (p) => {
        if (!drag || api.finished) return;
        ship.x = p.x;
        ship.y = p.y;
        const n = pts[next];
        if (U.d2(p.x, p.y, n.x, n.y) < 18) {
          ship.x = n.x;
          ship.y = n.y;
          next++;
          AU.Audio.play('click');
          if (next >= pts.length) {
            drag = false;
            api.done();
          }
        }
      },
      () => {
        drag = false;
        if (!api.finished) {
          ship.x = pts[next - 1].x;
          ship.y = pts[next - 1].y;
        }
      }
    );
    api.msg('Arraste a nave pelos pontos da rota, sem soltar.');
    const stars = A.stars(3, 60, 400, 260);
    let t = 0;
    return {
      tick(dt) {
        t += dt;
        const c = K.ctx;
        c.fillStyle = '#081026';
        c.fillRect(0, 0, 400, 260);
        const neb = c.createRadialGradient(320, 200, 0, 320, 200, 180);
        neb.addColorStop(0, 'rgba(60,110,200,0.25)');
        neb.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = neb;
        c.fillRect(0, 0, 400, 260);
        c.strokeStyle = 'rgba(90,140,220,0.14)';
        c.lineWidth = 1;
        for (let x = 0; x < 400; x += 25) {
          c.beginPath();
          c.moveTo(x, 0);
          c.lineTo(x, 260);
          c.stroke();
        }
        for (let y = 0; y < 260; y += 25) {
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(400, y);
          c.stroke();
        }
        for (const st of stars) {
          c.fillStyle = `rgba(255,255,255,${st.b * (0.7 + 0.3 * Math.sin(t * 2 + st.x))})`;
          c.fillRect(st.x, st.y, 1.5, 1.5);
        }
        /* planeta no canto */
        const pg = c.createRadialGradient(360, 30, 4, 370, 40, 46);
        pg.addColorStop(0, '#f0b36a');
        pg.addColorStop(1, '#6a3a1a');
        c.fillStyle = pg;
        c.beginPath();
        c.arc(372, 38, 40, 0, Math.PI * 2);
        c.fill();
        /* rota: trechos feitos acesos, próximos tracejados */
        c.lineWidth = 3;
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i - 1], p1 = pts[i];
          c.setLineDash(i < next ? [] : [6, 6]);
          c.strokeStyle = i < next ? '#3ae08a' : 'rgba(120,170,255,0.7)';
          c.beginPath();
          c.moveTo(p0.x, p0.y);
          c.lineTo(p1.x, p1.y);
          c.stroke();
        }
        c.setLineDash([]);
        pts.forEach((p, i) => {
          const done = i < next;
          if (i === next) {
            c.strokeStyle = `rgba(255,210,59,${0.5 + Math.sin(t * 6) * 0.4})`;
            c.lineWidth = 2;
            c.beginPath();
            c.arc(p.x, p.y, 15 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
            c.stroke();
          }
          c.fillStyle = done ? '#3ae08a' : '#ffd23b';
          c.strokeStyle = '#0b0d12';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(p.x, p.y, 8, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        /* navezinha apontando para o próximo ponto */
        const tgt = pts[Math.min(next, pts.length - 1)];
        const ang = next < pts.length ? Math.atan2(tgt.y - ship.y, tgt.x - ship.x) : 0;
        c.save();
        c.translate(ship.x, ship.y);
        c.rotate(ang);
        c.fillStyle = 'rgba(255,160,60,0.8)';
        c.beginPath();
        c.moveTo(-10, -4);
        c.lineTo(-18 - Math.random() * 6, 0);
        c.lineTo(-10, 4);
        c.fill();
        c.fillStyle = '#e9edf5';
        c.strokeStyle = '#0b0d12';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(16, 0);
        c.lineTo(-10, -11);
        c.lineTo(-6, 0);
        c.lineTo(-10, 11);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#6fc8ff';
        c.beginPath();
        c.arc(4, 0, 3.5, 0, Math.PI * 2);
        c.fill();
        c.restore();
        A.scanlines(c, 0, 0, 400, 260, 0.08);
      },
    };
  };

  B.cleanO2 = (root, api) => {
    const K = mkCanvas(root, 400, 280);
    const leaves = [];
    for (let i = 0; i < 7; i++) leaves.push({ x: U.rf(170, 370), y: U.rf(40, 240), a: U.rf(0, 6), vx: U.rf(-6, 6), vy: U.rf(-6, 6) });
    let drag = null;
    K.on(
      (p) => {
        drag = leaves.find((l) => U.d2(l.x, l.y, p.x, p.y) < 24) || null;
        return !!drag;
      },
      (p) => {
        if (drag) {
          drag.x = p.x;
          drag.y = p.y;
        }
      },
      () => {
        if (drag && drag.x < 85) {
          leaves.splice(leaves.indexOf(drag), 1);
          AU.Audio.play('click');
          if (!leaves.length) api.done();
        }
        drag = null;
      }
    );
    api.msg('Arraste todas as folhas até a saída à esquerda.');
    let t = 0;
    return {
      tick(dt) {
        t += dt;
        const c = K.ctx;
        panelBg(c, 400, 280);
        /* grade do filtro */
        c.fillStyle = '#1a2028';
        rr(c, 90, 16, 300, 248, 8);
        c.fill();
        c.strokeStyle = 'rgba(120,140,160,0.25)';
        c.lineWidth = 1;
        for (let x = 90; x < 390; x += 12) {
          c.beginPath();
          c.moveTo(x, 16);
          c.lineTo(x + 40, 264);
          c.stroke();
          c.beginPath();
          c.moveTo(x + 40, 16);
          c.lineTo(x, 264);
          c.stroke();
        }
        /* saída de sucção com ventoinha girando e setas */
        A.plate(c, 8, 36, 74, 208, { r: 8, top: '#2a303a', bottom: '#1a1e25' });
        c.fillStyle = '#05070a';
        c.beginPath();
        c.arc(45, 140, 30, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(45, 140);
        c.rotate(t * 9);
        c.fillStyle = '#5a6275';
        for (let k = 0; k < 5; k++) {
          c.rotate((Math.PI * 2) / 5);
          c.beginPath();
          c.ellipse(14, 0, 13, 5, 0.4, 0, Math.PI * 2);
          c.fill();
        }
        c.restore();
        for (let k = 0; k < 3; k++) {
          const x = 88 - ((t * 40 + k * 20) % 60);
          c.globalAlpha = Math.min(1, (x - 28) / 30);
          A.text(c, '◀', x, 60 + k * 80, 14, '#7df9c1');
        }
        c.globalAlpha = 1;
        for (const l of leaves) {
          if (l !== drag) {
            l.x = U.clamp(l.x + l.vx * dt, 105, 380);
            l.y = U.clamp(l.y + l.vy * dt, 30, 255);
            l.a += dt;
          }
          c.save();
          c.translate(l.x, l.y);
          c.rotate(l.a);
          if (l === drag) c.scale(1.15, 1.15);
          drawTrash(c, { kind: 'leaf', x: 0, y: 0, a: 0, r: 18, col: l.col || (l.col = U.pick(['#4f9d3a', '#6cb84a', '#3d7f30', '#8ac24f'])) });
          c.restore();
        }
      },
    };
  };

  const ACCEPT_LABEL = { acceptUpper: 'MOT. SUP', acceptLower: 'MOT. INF', acceptWeap: 'ARMAS', acceptShields: 'ESCUDOS', acceptNav: 'NAV', acceptO2: 'O2', acceptComms: 'COMMS', acceptSec: 'SEGUR.' };

  B.divert = (root, api, ctx) => {
    const K = mkCanvas(root, 400, 270);
    const target = M.ACCEPT.indexOf(ctx.task.steps[1]);
    let hy = 225, drag = false;
    const tx = 30 + target * 48;
    K.on(
      (p) => {
        if (Math.abs(p.x - tx) > 22 || Math.abs(p.y - hy) > 26) return false;
        drag = true;
        return true;
      },
      (p) => {
        if (!drag || api.finished) return;
        hy = U.clamp(p.y, 45, 225);
        if (hy <= 50) {
          drag = false;
          api.done();
        }
      },
      () => {
        drag = false;
      }
    );
    api.msg('Suba a alavanca destacada para desviar a energia.');
    let t = 0, flow = 0;
    return {
      tick(dt) {
        t += dt;
        if (!drag && hy < 225 && !api.finished) hy = Math.min(225, hy + 200 * dt);
        if (api.finished) flow = Math.min(1, flow + dt * 2);
        const c = K.ctx;
        panelBg(c, 400, 270);
        /* barramento principal com a energia correndo até a alavanca destacada */
        c.strokeStyle = '#151922';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(18, 24);
        c.lineTo(382, 24);
        c.stroke();
        c.strokeStyle = '#f2b632';
        c.lineWidth = 3;
        c.stroke();
        M.ACCEPT.forEach((id, i) => {
          const x = 30 + i * 48, on = i === target;
          c.strokeStyle = on ? '#f2b632' : '#3a404c';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x, 24);
          c.lineTo(x, 40);
          c.stroke();
          if (on) {
            for (let k = 0; k < 3; k++) {
              const u = (t * 1.4 + k / 3) % 1;
              c.fillStyle = `rgba(255,230,120,${1 - u})`;
              c.beginPath();
              c.arc(x + (1 - u) * 0, 24 + u * 16, 3, 0, Math.PI * 2);
              c.fill();
            }
          }
          /* trilho com marcações */
          c.fillStyle = on ? '#2e2a14' : '#0d1119';
          rr(c, x - 9, 42, 18, 192, 6);
          c.fill();
          c.strokeStyle = on ? `rgba(255,210,59,${0.5 + Math.sin(t * 6) * 0.4})` : '#20262f';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = 'rgba(255,255,255,0.18)';
          for (let m = 0; m < 6; m++) c.fillRect(x + 11, 52 + m * 34, 5, 2);
          if (on && flow > 0) {
            c.fillStyle = `rgba(255,210,59,${0.5 * flow})`;
            rr(c, x - 7, hy, 14, 232 - hy, 5);
            c.fill();
          }
          const y = on ? hy : 225;
          const hg = c.createLinearGradient(0, y - 10, 0, y + 10);
          hg.addColorStop(0, on ? '#ffe27a' : '#8a93a6');
          hg.addColorStop(1, on ? '#c9941a' : '#4a5263');
          c.fillStyle = hg;
          rr(c, x - 17, y - 10, 34, 20, 5);
          c.fill();
          c.strokeStyle = '#0d0f14';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = 'rgba(0,0,0,0.35)';
          for (let g2 = -1; g2 <= 1; g2++) c.fillRect(x - 10, y + g2 * 4 - 1, 20, 1.5);
          A.text(c, ACCEPT_LABEL[id], x, 254, 8.5, on ? '#ffd23b' : '#98a2b5');
        });
      },
    };
  };

  B.accept = (root, api) => {
    let on = false;
    const lever = h('button', { class: 'mg-lever', 'aria-pressed': 'false' }, h('span', {}));
    lever.addEventListener('click', () => {
      if (on) return;
      on = true;
      lever.classList.add('on');
      lever.setAttribute('aria-pressed', 'true');
      AU.Audio.play('click');
      api.done(700);
    });
    root.appendChild(h('div', { class: 'mg-center' }, h('div', { class: 'mg-dev center', style: { paddingTop: '34px' } }, lever, h('div', { class: 'mg-mono' }, 'ENERGIA DESVIADA'))));
    api.msg('Clique no interruptor para aceitar a energia desviada.');
  };

  B.shields = (root, api) => {
    const K = mkCanvas(root, 360, 300);
    const cx = 180, cy = 150;
    const hexes = [{ x: cx, y: cy }];
    for (let i = 0; i < 6; i++) hexes.push({ x: cx + Math.cos((i / 6) * Math.PI * 2) * 78, y: cy + Math.sin((i / 6) * Math.PI * 2) * 78 });
    const reds = U.shuffle(hexes).slice(0, U.rint(3, 5));
    reds.forEach((x) => (x.red = true));
    K.on((p) => {
      const hx = hexes.find((x) => U.d2(x.x, x.y, p.x, p.y) < 38);
      if (!hx || api.finished) return false;
      hx.red = !hx.red;
      AU.Audio.play('click');
      if (hexes.every((x) => !x.red)) api.done();
      return false;
    });
    api.msg('Toque nos hexágonos vermelhos até todos ficarem brancos.');
    let t = 0, glow = 0;
    return {
      tick(dt) {
        t += dt;
        if (api.finished) glow = Math.min(1, glow + dt * 3);
        const c = K.ctx;
        panelBg(c, 360, 300);
        c.fillStyle = '#10151f';
        A.hex(c, cx, cy, 138, 0);
        c.fill();
        c.strokeStyle = '#2d3850';
        c.lineWidth = 3;
        c.stroke();
        if (glow) {
          c.fillStyle = `rgba(90,170,255,${0.35 * glow})`;
          A.hex(c, cx, cy, 138 + glow * 6, 0);
          c.fill();
        }
        for (const hx of hexes) {
          A.hex(c, hx.x, hx.y, 40);
          const g = c.createLinearGradient(hx.x - 30, hx.y - 36, hx.x + 30, hx.y + 36);
          if (hx.red) {
            g.addColorStop(0, '#ff7a70');
            g.addColorStop(1, '#9c1a1f');
          } else {
            g.addColorStop(0, glow ? '#e8f4ff' : '#ffffff');
            g.addColorStop(1, glow ? '#7fb6ff' : '#aeb9cc');
          }
          c.fillStyle = g;
          c.fill();
          c.strokeStyle = '#0b0d12';
          c.lineWidth = 4;
          c.stroke();
          /* reflexo de vidro */
          c.save();
          A.hex(c, hx.x, hx.y, 36);
          c.clip();
          c.fillStyle = 'rgba(255,255,255,0.25)';
          c.beginPath();
          c.moveTo(hx.x - 40, hx.y - 10);
          c.lineTo(hx.x + 10, hx.y - 40);
          c.lineTo(hx.x + 22, hx.y - 40);
          c.lineTo(hx.x - 40, hx.y + 4);
          c.closePath();
          c.fill();
          c.restore();
          if (hx.red) {
            c.strokeStyle = `rgba(255,120,120,${0.4 + Math.sin(t * 6) * 0.3})`;
            c.lineWidth = 2;
            A.hex(c, hx.x, hx.y, 30);
            c.stroke();
          }
        }
      },
    };
  };

  B.stabilize = (root, api) => {
    const K = mkCanvas(root, 300, 300);
    const a = U.rf(0, 6), r = U.rf(70, 110);
    const cross = { x: 150 + Math.cos(a) * r, y: 150 + Math.sin(a) * r };
    let drag = false, hold = 0;
    K.on(
      (p) => {
        if (U.d2(p.x, p.y, cross.x, cross.y) > 40) return false;
        drag = true;
        return true;
      },
      (p) => {
        if (drag && !api.finished) {
          cross.x = U.clamp(p.x, 20, 280);
          cross.y = U.clamp(p.y, 20, 280);
        }
      },
      () => {
        drag = false;
      }
    );
    api.msg('Arraste a mira até o centro do radar e segure.');
    return {
      tick(dt) {
        const near = U.d2(cross.x, cross.y, 150, 150) < 10;
        hold = near ? hold + dt : 0;
        if (hold > 0.35 && !api.finished) {
          cross.x = 150;
          cross.y = 150;
          api.done();
        }
        const c = K.ctx;
        panelBg(c, 300, 300);
        const t = performance.now() / 1000;
        const g = c.createRadialGradient(150, 150, 0, 150, 150, 132);
        g.addColorStop(0, '#0f3350');
        g.addColorStop(1, '#061626');
        c.fillStyle = '#20262f';
        c.beginPath();
        c.arc(150, 150, 140, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = g;
        c.beginPath();
        c.arc(150, 150, 130, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.beginPath();
        c.arc(150, 150, 130, 0, Math.PI * 2);
        c.clip();
        /* varredura do radar */
        const sw = t * 2;
        const sg = c.createConicGradient ? c.createConicGradient(sw, 150, 150) : null;
        if (sg) {
          sg.addColorStop(0, 'rgba(90,200,255,0.35)');
          sg.addColorStop(0.15, 'rgba(90,200,255,0)');
          sg.addColorStop(1, 'rgba(90,200,255,0)');
          c.fillStyle = sg;
          c.fillRect(20, 20, 260, 260);
        }
        c.strokeStyle = 'rgba(90,170,230,0.5)';
        c.lineWidth = 1.5;
        [40, 80, 120].forEach((rr2) => {
          c.beginPath();
          c.arc(150, 150, rr2, 0, Math.PI * 2);
          c.stroke();
        });
        c.beginPath();
        c.moveTo(150, 20);
        c.lineTo(150, 280);
        c.moveTo(20, 150);
        c.lineTo(280, 150);
        c.stroke();
        c.fillStyle = 'rgba(90,170,230,0.5)';
        for (let a2 = 0; a2 < 36; a2++) {
          const aa = (a2 / 36) * Math.PI * 2;
          c.fillRect(150 + Math.cos(aa) * 124 - 1, 150 + Math.sin(aa) * 124 - 1, 2, 2);
        }
        c.restore();
        c.strokeStyle = near ? '#3ae08a' : '#ffd23b';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(cross.x, cross.y, 16, 0, Math.PI * 2);
        c.moveTo(cross.x - 26, cross.y);
        c.lineTo(cross.x - 8, cross.y);
        c.moveTo(cross.x + 8, cross.y);
        c.lineTo(cross.x + 26, cross.y);
        c.moveTo(cross.x, cross.y - 26);
        c.lineTo(cross.x, cross.y - 8);
        c.moveTo(cross.x, cross.y + 8);
        c.lineTo(cross.x, cross.y + 26);
        c.stroke();
        c.fillStyle = near ? '#3ae08a' : '#ffd23b';
        c.beginPath();
        c.arc(cross.x, cross.y, 3, 0, Math.PI * 2);
        c.fill();
        A.scanlines(c, 20, 20, 260, 260, 0.08);
      },
    };
  };

  B.manifolds = (root, api) => {
    const nums = U.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    let next = 1;
    const grid = h('div', { class: 'mg-grid5' });
    const btns = nums.map((n) => {
      const b = h('button', { class: 'mg-key' }, String(n));
      b.addEventListener('click', () => {
        if (api.finished) return;
        if (n === next) {
          b.classList.add('lit');
          next++;
          AU.Audio.play('click');
          if (next > 10) api.done();
        } else {
          next = 1;
          btns.forEach((x) => x.classList.remove('lit'));
          grid.classList.add('err');
          AU.Audio.play('fail');
          setTimeout(() => grid.classList.remove('err'), 300);
        }
      });
      grid.appendChild(b);
      return b;
    });
    root.appendChild(h('div', { class: 'mg-dev' }, grid));
    api.msg('Aperte os botões em ordem, de 1 a 10.');
  };

  B.reactor = (root, api) => {
    const lights = h('div', { class: 'mg-lights' });
    const dots = [0, 1, 2, 3, 4].map(() => lights.appendChild(h('span', {})));
    const disp = h('div', { class: 'mg-simon disp' });
    const inp = h('div', { class: 'mg-simon inp' });
    const dcells = [], icells = [];
    for (let i = 0; i < 9; i++) {
      dcells.push(disp.appendChild(h('div', { class: 'cell' })));
      const b = h('button', { class: 'cell', 'aria-label': 'Botão ' + (i + 1) });
      b.addEventListener('click', () => press(i));
      icells.push(inp.appendChild(b));
    }
    root.appendChild(h('div', { class: 'mg-dev center' }, lights, h('div', { class: 'mg-row' }, disp, inp)));
    let seq = [U.rint(0, 8)];
    let round = 1, showT = 0, showI = 0, input = [], phase = 'show';
    function press(i) {
      if (phase !== 'input' || api.finished) return;
      icells[i].classList.add('lit');
      setTimeout(() => icells[i].classList.remove('lit'), 160);
      input.push(i);
      const k = input.length - 1;
      if (seq[k] !== i) {
        AU.Audio.play('fail');
        api.msg('Sequência errada. Recomeçando.', 'bad');
        seq = [U.rint(0, 8)];
        round = 1;
        restart();
        return;
      }
      AU.Audio.play('click');
      if (input.length === seq.length) {
        dots[round - 1].classList.add('on');
        if (round === 5) {
          api.done();
          return;
        }
        round++;
        seq.push(U.rint(0, 8));
        restart();
      }
    }
    function restart() {
      phase = 'show';
      showT = -0.6;
      showI = 0;
      input = [];
      dots.forEach((d, i) => d.classList.toggle('on', i < round - 1));
    }
    api.msg('Memorize a sequência da esquerda e repita à direita (5 rodadas).');
    restart();
    return {
      tick(dt) {
        if (phase !== 'show') return;
        showT += dt;
        dcells.forEach((c) => c.classList.remove('lit'));
        if (showT < 0) return;
        const idx = Math.floor(showT / 0.55);
        if (idx >= seq.length) {
          phase = 'input';
          api.msg('Sua vez: repita a sequência.');
          return;
        }
        if (showT % 0.55 < 0.4) dcells[seq[idx]].classList.add('lit');
        showI = idx;
      },
    };
  };

  B.align = (root, api) => {
    const K = mkCanvas(root, 360, 280);
    let y = U.chance(0.5) ? U.rf(40, 90) : U.rf(190, 240);
    let drag = false, hold = 0;
    K.on(
      (p) => {
        if (p.x < 280 || Math.abs(p.y - y) > 26) return false;
        drag = true;
        return true;
      },
      (p) => {
        if (drag && !api.finished) y = U.clamp(p.y, 30, 250);
      },
      () => {
        drag = false;
      }
    );
    api.msg('Arraste a alavanca até alinhar o feixe com a linha central.');
    return {
      tick(dt) {
        const ok = Math.abs(y - 140) < 6;
        hold = ok ? hold + dt : 0;
        if (hold > 0.4 && !api.finished) api.done();
        const c = K.ctx;
        panelBg(c, 360, 280);
        const t = performance.now() / 1000;
        A.screen(c, 18, 22, 262, 236, { inner: '#0e1d2e', outer: '#050b13' });
        c.strokeStyle = 'rgba(58,224,138,0.8)';
        c.setLineDash([4, 6]);
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(24, 140);
        c.lineTo(276, 140);
        c.stroke();
        c.setLineDash([]);
        /* motor: carcaça cilíndrica com bocal */
        const eg = c.createLinearGradient(0, 104, 0, 176);
        eg.addColorStop(0, '#9aa3b2');
        eg.addColorStop(0.5, '#5a6275');
        eg.addColorStop(1, '#2c323e');
        c.fillStyle = eg;
        rr(c, 26, 108, 64, 64, 10);
        c.fill();
        c.strokeStyle = '#11141a';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#3a404c';
        c.beginPath();
        c.moveTo(90, 120);
        c.lineTo(104, 128);
        c.lineTo(104, 152);
        c.lineTo(90, 160);
        c.closePath();
        c.fill();
        c.stroke();
        for (let k2 = 0; k2 < 3; k2++) c.fillRect(34 + k2 * 18, 112, 4, 56);
        /* feixe */
        const bx = 104, by = 140;
        const bg = c.createLinearGradient(bx, by, 276, y);
        bg.addColorStop(0, ok ? 'rgba(58,224,138,0.95)' : 'rgba(255,154,60,0.95)');
        bg.addColorStop(1, ok ? 'rgba(58,224,138,0.2)' : 'rgba(255,154,60,0.2)');
        c.strokeStyle = bg;
        c.lineWidth = 10 + Math.sin(t * 20) * 2;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(276, y);
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.8)';
        c.lineWidth = 2;
        c.stroke();
        A.scanlines(c, 18, 22, 262, 236, 0.1);
        /* alavanca em trilho curvo */
        A.plate(c, 290, 20, 56, 240, { r: 10, top: '#434a58', bottom: '#2a2f3a' });
        c.fillStyle = '#0a0d12';
        rr(c, 311, 32, 14, 216, 7);
        c.fill();
        for (let m = 0; m <= 10; m++) {
          c.fillStyle = m === 5 ? '#3ae08a' : 'rgba(255,255,255,0.3)';
          c.fillRect(296, 30 + m * 22 - 1, m === 5 ? 12 : 7, 2);
        }
        const hg = c.createLinearGradient(0, y - 12, 0, y + 12);
        hg.addColorStop(0, ok ? '#8dffb9' : '#ffe27a');
        hg.addColorStop(1, ok ? '#1f9d55' : '#c9941a');
        c.fillStyle = hg;
        rr(c, 294, y - 12, 48, 24, 6);
        c.fill();
        c.strokeStyle = '#0d0f14';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = 'rgba(0,0,0,0.35)';
        for (let g2 = -1; g2 <= 1; g2++) c.fillRect(302, y + g2 * 5 - 1, 32, 1.5);
      },
    };
  };

  B.fuel = (root, api, ctx) => {
    const engine = ctx.step % 2 === 1;
    const gauge = h('div', { class: 'mg-gauge' }, h('div', { class: 'fill' }));
    const pct = h('div', { class: 'mg-mono' }, '0%');
    const btn = h('button', { class: 'mg-btn big' }, engine ? 'Segure para abastecer o motor' : 'Segure para encher o galão');
    let holding = false, v = 0;
    const down = (e) => {
      e.preventDefault();
      holding = true;
    };
    const up = () => (holding = false);
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointerleave', up);
    btn.addEventListener('pointercancel', up);
    root.appendChild(h('div', { class: 'mg-dev center', style: { paddingTop: '36px' } }, h('div', { class: 'mg-can' + (engine ? ' eng' : '') }, gauge), h('div', { class: 'mg-screen' }, pct), btn));
    api.msg(engine ? 'Despeje o combustível no motor.' : 'Encha o galão de combustível.');
    return {
      tick(dt) {
        if (holding && !api.finished) v = Math.min(1, v + dt / 3.2);
        gauge.classList.toggle('filling', holding && v < 1);
        gauge.firstChild.style.height = v * 100 + '%';
        pct.textContent = Math.round(v * 100) + '%';
        if (v >= 1 && !api.finished) api.done();
      },
    };
  };

  const ICON = {
    folder: '<svg viewBox="0 0 64 52"><path d="M4 8h20l6 6h30v30a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#d9a032" stroke="#0b0d12" stroke-width="3" stroke-linejoin="round"/><path d="M4 20h56v24a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" fill="#f7cf62" stroke="#0b0d12" stroke-width="3" stroke-linejoin="round"/></svg>',
    file: '<svg viewBox="0 0 30 38"><path d="M3 3h16l8 8v24H3z" fill="#fff" stroke="#0b0d12" stroke-width="3" stroke-linejoin="round"/><path d="M19 3v8h8" fill="none" stroke="#0b0d12" stroke-width="3"/><path d="M8 18h14M8 24h14M8 30h10" stroke="#8a94a8" stroke-width="2.5"/></svg>',
    dish: '<svg viewBox="0 0 64 56"><path d="M29 36 22 54h20l-7-18" fill="#8a94a8" stroke="#0b0d12" stroke-width="3" stroke-linejoin="round"/><path d="M6 10a30 30 0 0 0 44 32z" fill="#dfe5ef" stroke="#0b0d12" stroke-width="3" stroke-linejoin="round"/><path d="M28 26 46 8" stroke="#0b0d12" stroke-width="3"/><circle cx="48" cy="7" r="4.5" fill="#e24b4b" stroke="#0b0d12" stroke-width="2"/></svg>',
  };
  const HAND_SVG = '<svg viewBox="0 0 100 120" aria-hidden="true"><g fill="currentColor"><rect x="24" y="52" width="56" height="54" rx="20"/><rect x="26" y="16" width="11" height="46" rx="5.5"/><rect x="40" y="6" width="11" height="52" rx="5.5"/><rect x="54" y="9" width="11" height="50" rx="5.5"/><rect x="68" y="22" width="10" height="42" rx="5"/><rect x="22" y="58" width="13" height="42" rx="6.5" transform="rotate(-36 28 98)"/></g><g fill="none" stroke="rgba(0,0,0,.28)" stroke-width="1.5" stroke-linecap="round"><path d="M40 78q12 8 26 0M44 92q8 4 16 0"/></g></svg>';

  B.transfer = (root, api, ctx) => {
    const up = ctx.step === 1;
    const bar = h('div', { class: 'mg-bar' }, h('div', { class: 'fill' }));
    const label = h('div', { class: 'mg-mono' }, 'Tempo estimado: —');
    let run = false, v = 0;
    const btn = h('button', { class: 'mg-btn big' }, up ? 'Enviar' : 'Baixar');
    btn.addEventListener('click', () => {
      run = true;
      btn.disabled = true;
    });
    const file = h('span', { class: 'file', html: ICON.file });
    root.appendChild(h('div', { class: 'mg-dev center' },
      h('div', { class: 'mg-folders' }, h('span', { html: ICON.folder }), file, h('span', { html: up ? ICON.dish : ICON.folder })),
      bar, h('div', { class: 'mg-screen' }, label), btn));
    api.msg(up ? 'Envie os dados para a sede. Não feche até terminar.' : 'Baixe os dados. Não feche até terminar.');
    return {
      tick(dt) {
        if (!run || api.finished) return;
        v = Math.min(1, v + dt / 7.5);
        bar.firstChild.style.width = v * 100 + '%';
        label.textContent = 'Tempo estimado: ' + Math.ceil((1 - v) * 7.5) + 's';
        /* os arquivos voam em arco de uma pasta para a outra */
        const u = (v * 9) % 1;
        file.style.opacity = String(Math.min(1, Math.sin(u * Math.PI) * 2.5));
        file.style.transform = `translate(${(u - 0.5) * 150}px, ${-Math.sin(u * Math.PI) * 30}px) rotate(${(u - 0.5) * 40}deg)`;
        if (v >= 1) {
          label.textContent = 'Concluído';
          file.style.opacity = '0';
          api.done();
        }
      },
    };
  };

  B.inspect = (root, api, ctx) => {
    const g = ctx.g, task = ctx.task;
    const tubes = h('div', { class: 'mg-tubes' });
    const ts = [0, 1, 2, 3, 4].map(() => tubes.appendChild(h('button', { class: 'tube', disabled: true }, h('span', {}))));
    root.appendChild(h('div', { class: 'mg-dev center' }, h('div', { class: 'mg-hazard' }), tubes));
    if (task.step === 0) {
      const btn = h('button', { class: 'mg-btn big' }, '▶ Iniciar análise');
      btn.addEventListener('click', () => {
        btn.disabled = true;
        ts.forEach((t) => t.classList.add('filled'));
        api.msg('Análise iniciada. Volte em 60 segundos — pode sair.', 'ok');
        api.done(1400);
      });
      root.appendChild(h('div', { class: 'mg-center' }, btn));
      api.msg('Inicie a análise da amostra.');
      return {};
    }
    if (g.t < task.readyAt) {
      ts.forEach((t) => t.classList.add('filled'));
      const lab = h('div', { class: 'mg-mono big' }, '');
      root.appendChild(lab);
      api.msg('A análise ainda está em andamento.');
      return {
        tick() {
          const left = Math.ceil(task.readyAt - g.t);
          lab.textContent = left > 0 ? 'Aguarde: ' + left + 's' : 'Pronto! Reabra a tarefa.';
        },
      };
    }
    const bad = U.rint(0, 4);
    ts.forEach((t, i) => {
      t.disabled = false;
      t.classList.add('filled');
      if (i === bad) t.classList.add('anomaly');
      t.addEventListener('click', () => {
        if (api.finished) return;
        if (i === bad) api.done();
        else {
          AU.Audio.play('fail');
          api.msg('Resultado incorreto. O teste será reiniciado.', 'bad');
          g.resetInspect(task);
          setTimeout(() => MG.close(), 900);
        }
      });
    });
    api.msg('Selecione a amostra com anomalia.');
    return {};
  };

  B.scan = (root, api, ctx) => {
    const p = ctx.p;
    const info = h('div', { class: 'mg-mono' });
    const bar = h('div', { class: 'mg-bar' }, h('div', { class: 'fill' }));
    root.appendChild(h('div', { class: 'mg-dev center' }, h('div', { class: 'mg-scanbox' }, h('div', { class: 'mg-scanbean', html: AU.Render.beanSVG(p.color, { size: 100, visor: p.visor, hat: p.hat }) }), h('i', { class: 'mg-scanline' })), bar, h('div', { class: 'mg-screen' }, info)));
    const lines = ['ID: ' + p.name, 'Cor: ' + AU.C.COLOR[p.color].name, 'Altura: 1,07 m', 'Massa: 42 kg', 'Tipo sanguíneo: O-', 'Status: tripulante'];
    let v = 0;
    api.msg('Fique na plataforma até o escaneamento terminar.');
    return {
      tick(dt) {
        if (api.finished) return;
        v = Math.min(1, v + dt / 10);
        if (ctx.g.S.rules.visualTasks) p.visual = { type: 'scan', until: ctx.g.t + 0.4 };
        bar.firstChild.style.width = v * 100 + '%';
        info.textContent = lines.slice(0, Math.ceil(v * lines.length)).join('  ·  ');
        if (v >= 1) api.done();
      },
      cleanup() {
        if (p.visual && p.visual.type === 'scan') p.visual = null;
      },
    };
  };

  B.asteroids = (root, api, ctx) => {
    const K = mkCanvas(root, 400, 320);
    const rocks = [], shots = [], booms = [];
    const stars = A.stars(7, 70, 400, 320);
    let hits = 0, spawn = 0, t = 0;
    const aim = { x: 200, y: 160 };
    K.c.addEventListener('pointermove', (e) => {
      const p = K.pos(e);
      aim.x = p.x;
      aim.y = p.y;
    });
    K.on((p) => {
      if (api.finished) return false;
      aim.x = p.x;
      aim.y = p.y;
      shots.push({ x: p.x, y: p.y, t: 0.16 });
      const r = rocks.find((a) => U.d2(a.x, a.y, p.x, p.y) < a.r + 6);
      if (r) {
        rocks.splice(rocks.indexOf(r), 1);
        booms.push({ x: r.x, y: r.y, r: r.r, t: 0, parts: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: (i / 8) * Math.PI * 2 + U.rf(-0.3, 0.3), v: U.rf(40, 110), s: U.rf(3, 7) })) });
        hits++;
        AU.Audio.play('click');
        if (hits >= 20) api.done(700);
      }
      return false;
    });
    api.msg('Clique nos asteroides para destruí-los (20).');
    return {
      tick(dt) {
        t += dt;
        if (ctx.g.S.rules.visualTasks && !api.finished) ctx.p.visual = { type: 'asteroids', until: ctx.g.t + 0.4 };
        spawn -= dt;
        if (spawn <= 0 && rocks.length < 7) {
          spawn = U.rf(0.35, 0.8);
          const r = U.rf(14, 24);
          rocks.push({ x: 420, y: U.rf(30, 270), vx: -U.rf(60, 130), vy: U.rf(-25, 25), r, a: 0, va: U.rf(-2, 2), shape: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(() => U.rf(0.78, 1.05)), craters: [0, 1, 2].map(() => ({ x: U.rf(-0.4, 0.4), y: U.rf(-0.4, 0.4), r: U.rf(0.12, 0.22) })) });
        }
        for (const r of rocks) {
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.a += r.va * dt;
        }
        for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].x < -30) rocks.splice(i, 1);
        const c = K.ctx;
        c.fillStyle = '#03060d';
        c.fillRect(0, 0, 400, 320);
        for (const st of stars) {
          const x = (st.x - t * 12 * st.b + 400) % 400;
          c.fillStyle = `rgba(255,255,255,${st.b})`;
          c.fillRect(x, st.y, st.b > 0.8 ? 2 : 1, st.b > 0.8 ? 2 : 1);
        }
        const neb = c.createRadialGradient(300, 80, 0, 300, 80, 160);
        neb.addColorStop(0, 'rgba(90,60,160,0.18)');
        neb.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = neb;
        c.fillRect(0, 0, 400, 320);
        for (const r of rocks) {
          c.save();
          c.translate(r.x, r.y);
          c.rotate(r.a);
          const g = c.createRadialGradient(-r.r * 0.4, -r.r * 0.4, 1, 0, 0, r.r * 1.1);
          g.addColorStop(0, '#9c8f7c');
          g.addColorStop(1, '#4a4239');
          c.fillStyle = g;
          c.beginPath();
          r.shape.forEach((k, i) => {
            const a = (i / r.shape.length) * Math.PI * 2;
            if (i) c.lineTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k);
            else c.moveTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k);
          });
          c.closePath();
          c.fill();
          c.strokeStyle = '#211d18';
          c.lineWidth = 2;
          c.stroke();
          c.fillStyle = 'rgba(40,34,28,0.55)';
          for (const cr of r.craters) {
            c.beginPath();
            c.arc(cr.x * r.r, cr.y * r.r, cr.r * r.r, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        }
        for (let i = booms.length - 1; i >= 0; i--) {
          const b = booms[i];
          b.t += dt;
          const k = b.t / 0.5;
          if (k >= 1) {
            booms.splice(i, 1);
            continue;
          }
          c.fillStyle = `rgba(255,${Math.round(220 - k * 140)},80,${1 - k})`;
          c.beginPath();
          c.arc(b.x, b.y, b.r * (0.6 + k * 1.2), 0, Math.PI * 2);
          c.fill();
          c.fillStyle = `rgba(255,255,220,${(1 - k) * 0.9})`;
          c.beginPath();
          c.arc(b.x, b.y, b.r * 0.5 * (1 - k), 0, Math.PI * 2);
          c.fill();
          c.fillStyle = `rgba(140,128,110,${1 - k})`;
          for (const q of b.parts) c.fillRect(b.x + Math.cos(q.a) * q.v * b.t - q.s / 2, b.y + Math.sin(q.a) * q.v * b.t - q.s / 2, q.s, q.s);
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s2 = shots[i];
          s2.t -= dt;
          const a = s2.t / 0.16;
          c.strokeStyle = `rgba(120,255,200,${0.95 * a})`;
          c.lineWidth = 4 * a + 1;
          c.beginPath();
          c.moveTo(22, 306);
          c.lineTo(s2.x, s2.y);
          c.moveTo(378, 306);
          c.lineTo(s2.x, s2.y);
          c.stroke();
          if (s2.t <= 0) shots.splice(i, 1);
        }
        /* canhões nos cantos e a mira que segue o ponteiro */
        for (const cx of [22, 378]) {
          c.fillStyle = '#4a5262';
          c.beginPath();
          c.arc(cx, 320, 26, Math.PI, 0);
          c.fill();
          c.strokeStyle = '#151922';
          c.lineWidth = 2;
          c.stroke();
          c.save();
          c.translate(cx, 306);
          c.rotate(Math.atan2(aim.y - 306, aim.x - cx));
          c.fillStyle = '#8a94a8';
          c.fillRect(0, -5, 26, 10);
          c.strokeRect(0, -5, 26, 10);
          c.restore();
        }
        c.strokeStyle = 'rgba(120,255,160,0.9)';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(aim.x, aim.y, 14, 0, Math.PI * 2);
        c.moveTo(aim.x - 22, aim.y);
        c.lineTo(aim.x - 8, aim.y);
        c.moveTo(aim.x + 8, aim.y);
        c.lineTo(aim.x + 22, aim.y);
        c.moveTo(aim.x, aim.y - 22);
        c.lineTo(aim.x, aim.y - 8);
        c.moveTo(aim.x, aim.y + 8);
        c.lineTo(aim.x, aim.y + 22);
        c.stroke();
        /* moldura de mira e placar */
        c.strokeStyle = 'rgba(120,255,160,0.5)';
        c.lineWidth = 3;
        for (const [x, y, dx, dy] of [[8, 8, 1, 1], [392, 8, -1, 1], [8, 280, 1, -1], [392, 280, -1, -1]]) {
          c.beginPath();
          c.moveTo(x, y + dy * 20);
          c.lineTo(x, y);
          c.lineTo(x + dx * 20, y);
          c.stroke();
        }
        c.fillStyle = 'rgba(0,20,10,0.7)';
        rr(c, 14, 12, 150, 24, 5);
        c.fill();
        A.text(c, 'DESTRUÍDOS: ' + hits + '/20', 22, 24, 13, '#7df9c1', 'left');
        A.scanlines(c, 0, 0, 400, 320, 0.1);
      },
      cleanup() {
        if (ctx.p.visual && ctx.p.visual.type === 'asteroids') ctx.p.visual = null;
      },
    };
  };

  /* Esvaziar lixo como no original: a calha tem uma janela com o lixo empilhado; puxar e segurar a alavanca
     abre o alçapão e o lixo despenca de verdade (gravidade e empilhamento), e a tarefa termina quando esvazia. */
  const TRASH_SETS = {
    garbageO2: ['leaf', 'leaf', 'leaf', 'leaf', 'twig', 'leaf'],
    garbageCaf: ['bottle', 'can', 'banana', 'paper', 'apple', 'cup', 'can', 'paper'],
    garbageStorage: ['bottle', 'can', 'leaf', 'paper', 'banana', 'box', 'can', 'apple'],
  };
  function drawTrash(c, it) {
    const r = it.r;
    c.save();
    c.translate(it.x, it.y);
    c.rotate(it.a);
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(10,12,16,0.85)';
    switch (it.kind) {
      case 'leaf': {
        c.fillStyle = it.col || '#4f9d3a';
        c.beginPath();
        c.moveTo(-r, 0);
        c.quadraticCurveTo(0, -r * 0.8, r, 0);
        c.quadraticCurveTo(0, r * 0.8, -r, 0);
        c.fill();
        c.stroke();
        c.strokeStyle = 'rgba(20,60,20,0.8)';
        c.beginPath();
        c.moveTo(-r * 0.9, 0);
        c.lineTo(r * 0.9, 0);
        for (let i = -1; i <= 1; i++) {
          c.moveTo(i * r * 0.35, 0);
          c.lineTo(i * r * 0.35 + r * 0.2, -r * 0.3);
          c.moveTo(i * r * 0.35, 0);
          c.lineTo(i * r * 0.35 + r * 0.2, r * 0.3);
        }
        c.stroke();
        break;
      }
      case 'twig':
        c.strokeStyle = '#6b4a2b';
        c.lineWidth = r * 0.3;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(-r, 0);
        c.lineTo(r, 0);
        c.moveTo(0, 0);
        c.lineTo(r * 0.5, -r * 0.5);
        c.stroke();
        break;
      case 'bottle':
        c.fillStyle = it.col || '#3f8f4a';
        rr(c, -r * 0.45, -r * 0.6, r * 0.9, r * 1.5, r * 0.3);
        c.fill();
        c.stroke();
        c.fillRect(-r * 0.18, -r * 1.05, r * 0.36, r * 0.5);
        c.strokeRect(-r * 0.18, -r * 1.05, r * 0.36, r * 0.5);
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(-r * 0.3, -r * 0.4, r * 0.15, r * 1.0);
        break;
      case 'can':
        c.fillStyle = it.col || '#c0392b';
        c.fillRect(-r * 0.5, -r * 0.7, r, r * 1.4);
        c.strokeRect(-r * 0.5, -r * 0.7, r, r * 1.4);
        c.fillStyle = '#d7dbe2';
        c.fillRect(-r * 0.5, -r * 0.7, r, r * 0.22);
        c.fillRect(-r * 0.5, r * 0.48, r, r * 0.22);
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fillRect(-r * 0.1, -r * 0.3, r * 0.5, r * 0.5);
        break;
      case 'banana':
        c.fillStyle = '#f2d23c';
        c.beginPath();
        c.arc(0, -r * 0.4, r, 0.35, Math.PI - 0.35);
        c.arc(0, -r * 0.9, r * 1.1, Math.PI - 0.5, 0.5, true);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#5a4020';
        c.fillRect(r * 0.75, r * 0.05, r * 0.25, r * 0.2);
        break;
      case 'paper':
        c.fillStyle = '#eef0f3';
        c.beginPath();
        for (let i = 0; i < 9; i++) {
          const aa = (i / 9) * Math.PI * 2, rr2 = r * (0.75 + ((i * 7) % 3) * 0.12);
          if (i) c.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2);
          else c.moveTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2);
        }
        c.closePath();
        c.fill();
        c.stroke();
        c.strokeStyle = 'rgba(80,90,110,0.5)';
        c.beginPath();
        c.moveTo(-r * 0.4, -r * 0.2);
        c.lineTo(r * 0.3, r * 0.1);
        c.moveTo(-r * 0.1, r * 0.4);
        c.lineTo(r * 0.2, -r * 0.4);
        c.stroke();
        break;
      case 'apple':
        c.fillStyle = '#e8dcae';
        rr(c, -r * 0.35, -r * 0.6, r * 0.7, r * 1.2, r * 0.3);
        c.fill();
        c.stroke();
        c.fillStyle = '#c0392b';
        c.beginPath();
        c.ellipse(0, -r * 0.65, r * 0.55, r * 0.25, 0, 0, Math.PI * 2);
        c.ellipse(0, r * 0.65, r * 0.55, r * 0.25, 0, 0, Math.PI * 2);
        c.fill();
        break;
      case 'cup':
        c.fillStyle = '#f4f4f4';
        c.beginPath();
        c.moveTo(-r * 0.6, -r * 0.7);
        c.lineTo(r * 0.6, -r * 0.7);
        c.lineTo(r * 0.4, r * 0.7);
        c.lineTo(-r * 0.4, r * 0.7);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#d0342c';
        c.fillRect(-r * 0.52, -r * 0.2, r * 1.04, r * 0.3);
        break;
      default:
        c.fillStyle = '#b58a52';
        c.fillRect(-r * 0.7, -r * 0.6, r * 1.4, r * 1.2);
        c.strokeRect(-r * 0.7, -r * 0.6, r * 1.4, r * 1.2);
        c.strokeStyle = 'rgba(80,50,20,0.7)';
        c.beginPath();
        c.moveTo(-r * 0.7, -r * 0.1);
        c.lineTo(r * 0.7, -r * 0.1);
        c.stroke();
    }
    c.restore();
  }

  B.garbage = (root, api, ctx) => {
    const K = mkCanvas(root, 360, 300);
    const vis = ctx.step === 1;
    const station = ctx.task.steps[ctx.step];
    const set = TRASH_SETS[station] || TRASH_SETS.garbageStorage;
    const L = 34, R = 246, TOP = 22, FLOOR = 252;
    const LEAFC = ['#4f9d3a', '#6cb84a', '#3d7f30', '#8ac24f'];
    const items = [];
    const n = station === 'garbageO2' ? 46 : 40;
    for (let i = 0; i < n; i++) {
      const kind = set[i % set.length];
      items.push({
        kind, x: U.rf(L + 16, R - 16), y: U.rf(TOP + 10, FLOOR - 40), vx: 0, vy: 0, a: U.rf(0, 6), va: 0,
        r: kind === 'leaf' ? U.rf(11, 15) : kind === 'twig' ? 12 : U.rf(12, 16),
        col: kind === 'leaf' ? U.pick(LEAFC) : kind === 'can' ? U.pick(['#c0392b', '#2e7bd6', '#e0a526']) : kind === 'bottle' ? U.pick(['#3f8f4a', '#7a4a1e']) : null,
      });
    }
    let ly = 60, drag = false, open = 0, shake = 0, t = 0, clunk = false;
    const step = (dt) => {
      const floorOpen = open > 0.45;
      for (const it of items) {
        it.vy += 900 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        it.a += it.va * dt;
        it.va *= 0.96;
        if (it.x < L + it.r) {
          it.x = L + it.r;
          it.vx = Math.abs(it.vx) * 0.3;
        }
        if (it.x > R - it.r) {
          it.x = R - it.r;
          it.vx = -Math.abs(it.vx) * 0.3;
        }
        if (!floorOpen && it.y > FLOOR - it.r && it.y < FLOOR + 6) {
          it.y = FLOOR - it.r;
          it.vy = -it.vy * 0.15;
          it.vx *= 0.8;
          it.va *= 0.7;
        }
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          for (let j = i + 1; j < items.length; j++) {
            const q = items[j];
            const dx = q.x - p.x, dy = q.y - p.y, min = (p.r + q.r) * 0.82;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2), push = (min - d) / 2, nx = dx / d, ny = dy / d;
            p.x -= nx * push;
            p.y -= ny * push;
            q.x += nx * push;
            q.y += ny * push;
            const rel = (q.vx - p.vx) * nx + (q.vy - p.vy) * ny;
            if (rel < 0) {
              p.vx += nx * rel * 0.5;
              p.vy += ny * rel * 0.5;
              q.vx -= nx * rel * 0.5;
              q.vy -= ny * rel * 0.5;
              p.va += rel * 0.01;
              q.va -= rel * 0.01;
            }
          }
        }
      }
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].y > 330) {
          items.splice(i, 1);
        }
      }
    };
    /* o lixo já chega assentado na calha */
    for (let i = 0; i < 150; i++) step(1 / 60);
    K.on(
      (p) => {
        if (p.x < 270 || Math.abs(p.y - ly) > 34) return false;
        drag = true;
        return true;
      },
      (p) => {
        if (drag && !api.finished) ly = U.clamp(p.y, 60, 230);
      },
      () => {
        drag = false;
      }
    );
    api.msg('Puxe a alavanca para baixo e segure até esvaziar.');
    return {
      tick(dt) {
        t += dt;
        if (!drag && ly > 60) ly = Math.max(60, ly - 300 * dt);
        const down = ly >= 225;
        open = U.clamp(open + (down ? dt * 4 : -dt * 3), 0, 1);
        if (down && !clunk) {
          clunk = true;
          AU.Audio.play('door');
        }
        if (!down) clunk = false;
        if (down) {
          shake = 1;
          if (vis && ctx.g.S.rules.visualTasks) ctx.p.visual = { type: 'garbage', until: ctx.g.t + 0.4 };
        } else shake = Math.max(0, shake - dt * 4);
        step(dt);
        if (!items.length && !api.finished) api.done(700);
        const c = K.ctx;
        panelBg(c, 360, 300);
        const sx = shake ? Math.sin(t * 70) * 1.6 : 0;
        c.save();
        c.translate(sx, 0);
        /* calha: moldura, fundo escuro e o que sobrou */
        A.plate(c, L - 14, TOP - 12, R - L + 28, FLOOR - TOP + 34, { r: 12, top: '#4a5262', bottom: '#2c323e' });
        c.fillStyle = '#0b0e14';
        c.fillRect(L, TOP, R - L, FLOOR - TOP);
        c.save();
        c.beginPath();
        c.rect(L, TOP, R - L, 400);
        c.clip();
        for (const it of items) drawTrash(c, it);
        c.restore();
        /* alçapão: duas abas que giram para baixo */
        const hw = (R - L) / 2, ang = open * 1.35;
        c.fillStyle = '#3d4452';
        c.strokeStyle = '#11141a';
        c.lineWidth = 2;
        c.save();
        c.translate(L, FLOOR);
        c.rotate(ang);
        c.fillRect(0, 0, hw, 8);
        c.strokeRect(0, 0, hw, 8);
        c.restore();
        c.save();
        c.translate(R, FLOOR);
        c.rotate(-ang);
        c.fillRect(-hw, 0, hw, 8);
        c.strokeRect(-hw, 0, hw, 8);
        c.restore();
        A.hazard(c, L - 14, FLOOR + 10, R - L + 28, 10);
        /* vidro */
        c.fillStyle = 'rgba(170,210,255,0.07)';
        c.fillRect(L, TOP, R - L, FLOOR - TOP);
        c.fillStyle = 'rgba(255,255,255,0.08)';
        c.beginPath();
        c.moveTo(L + 20, TOP);
        c.lineTo(L + 70, TOP);
        c.lineTo(L + 10, FLOOR);
        c.lineTo(L, FLOOR);
        c.lineTo(L, TOP + 40);
        c.closePath();
        c.fill();
        c.restore();
        /* alavanca */
        A.plate(c, 282, 36, 44, 220, { r: 10, top: '#434a58', bottom: '#2a2f3a', rivets: false });
        c.fillStyle = '#0d1016';
        rr(c, 298, 50, 12, 192, 6);
        c.fill();
        c.fillStyle = '#9aa3b2';
        c.fillRect(300, 50, 8, ly - 50);
        c.strokeStyle = '#11141a';
        c.lineWidth = 2;
        c.strokeRect(300, 50, 8, ly - 50);
        const kg = c.createRadialGradient(298, ly - 6, 2, 304, ly, 20);
        kg.addColorStop(0, down ? '#8dffb9' : '#ff8a8a');
        kg.addColorStop(1, down ? '#1f9d55' : '#b3202a');
        c.fillStyle = kg;
        c.beginPath();
        c.arc(304, ly, 18, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        if (!drag && !down && !api.finished) {
          const k = (t * 1.5) % 1;
          c.globalAlpha = 1 - k;
          A.text(c, '▼', 304, 90 + k * 30, 16, '#ffd23b');
          c.globalAlpha = 1;
        }
        A.led(c, 342, 60, 6, '#ffb020', down && Math.sin(t * 12) > 0);
        const left = items.length / n;
        c.fillStyle = '#0d1016';
        rr(c, 336, 90, 12, 150, 5);
        c.fill();
        c.fillStyle = left > 0.3 ? '#e0a526' : '#3ae08a';
        rr(c, 338, 92 + 146 * (1 - left), 8, 146 * left, 4);
        c.fill();
      },
      cleanup() {
        if (ctx.p.visual && ctx.p.visual.type === 'garbage') ctx.p.visual = null;
      },
    };
  };

  /* ================= SABOTAGENS ================= */
  const SB = {};
  SB.lights = (root, api, ctx) => {
    const g = ctx.g;
    const row = h('div', { class: 'mg-switches' });
    const sws = [0, 1, 2, 3, 4].map((i) => {
      const b = h('button', { class: 'mg-switch', 'aria-label': 'Interruptor ' + (i + 1) }, h('span', {}));
      b.addEventListener('click', () => {
        g.fixLightsToggle(i, ctx.p);
        AU.Audio.play('click');
      });
      row.appendChild(b);
      return b;
    });
    root.appendChild(h('div', { class: 'mg-dev', style: { padding: 0 } }, row));
    api.msg('Ligue todos os interruptores (para cima).');
    return {
      tick() {
        const s = g.sab;
        if (!s || s.type !== 'lights') {
          api.msg('Luzes restauradas.', 'ok');
          api.done(600);
          return;
        }
        sws.forEach((b, i) => b.classList.toggle('on', !!s.switches[i]));
      },
    };
  };
  SB.reactor = (root, api, ctx) => {
    const g = ctx.g, which = ctx.station === 'reactorA' ? 'A' : 'B';
    let holding = false;
    const pad = h('div', { class: 'mg-hand', role: 'button', 'aria-label': 'Scanner de mão', html: HAND_SVG });
    const down = (e) => {
      e.preventDefault();
      holding = true;
      pad.classList.add('on');
    };
    const up = () => {
      holding = false;
      pad.classList.remove('on');
    };
    pad.addEventListener('pointerdown', down);
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointerleave', up);
    pad.addEventListener('pointercancel', up);
    root.appendChild(h('div', { class: 'mg-center' }, h('div', { class: 'mg-dev' }, pad)));
    api.msg('Segure a mão no scanner. Outra pessoa precisa segurar o outro scanner ao mesmo tempo.');
    return {
      tick() {
        const s = g.sab;
        if (!s || s.type !== 'reactor') {
          api.msg('Reator estabilizado.', 'ok');
          api.done(700);
          return;
        }
        if (holding) g.reactorHold(ctx.p, which);
        const other = which === 'A' ? 'B' : 'A';
        const otherOn = g.t - s.hold[other] < 0.3;
        if (holding) api.msg(otherOn ? 'Os dois scanners estão ativos… segurando!' : 'Aguardando alguém no outro scanner…', otherOn ? 'ok' : '');
      },
    };
  };
  SB.o2 = (root, api, ctx) => {
    const g = ctx.g, which = ctx.station === 'o2A' ? 'A' : 'B';
    let val = '';
    const disp = h('div', { class: 'mg-display' }, '');
    const note = h('div', { class: 'mg-note' }, 'Código de hoje: ' + (g.sab ? g.sab.code : '-----'));
    const pad = h('div', { class: 'mg-keypad' });
    const press = (k) => {
      if (api.finished) return;
      if (k === 'C') val = '';
      else if (k === 'OK') {
        if (g.o2Enter(which, val, ctx.p)) {
          AU.Audio.play('ok');
          api.msg('Código aceito.', 'ok');
          api.done(600);
        } else {
          AU.Audio.play('fail');
          api.msg('Código incorreto.', 'bad');
          val = '';
        }
      } else if (val.length < 5) val += k;
      disp.textContent = val;
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].forEach((k) => {
      const b = h('button', { class: 'mg-key' }, k);
      b.addEventListener('click', () => press(k));
      pad.appendChild(b);
    });
    root.appendChild(h('div', { class: 'mg-row' }, note, h('div', { class: 'mg-dev center' }, disp, pad)));
    api.msg('Digite o código do bilhete e confirme.');
    return {
      tick() {
        const s = g.sab;
        if ((!s || s.type !== 'o2') && !api.finished) {
          api.msg('Oxigênio restaurado.', 'ok');
          api.done(600);
        } else if (s && s.done[which] && !api.finished) api.done(400);
      },
    };
  };
  SB.comms = (root, api, ctx) => {
    const g = ctx.g;
    const K = mkCanvas(root, 380, 260);
    let ang = U.rf(-2.4, 2.4), drag = null, hold = 0, ph = 0;
    const knob = { x: 300, y: 130 };
    K.on(
      (p) => {
        if (U.d2(p.x, p.y, knob.x, knob.y) > 50) return false;
        drag = { a0: Math.atan2(p.y - knob.y, p.x - knob.x), ang0: ang };
        return true;
      },
      (p) => {
        if (!drag) return;
        const a = Math.atan2(p.y - knob.y, p.x - knob.x);
        let d = a - drag.a0;
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        ang = U.clamp(drag.ang0 + d, -2.6, 2.6);
      },
      () => {
        drag = null;
      }
    );
    api.msg('Gire o botão até o sinal ficar limpo.');
    return {
      tick(dt) {
        const s = g.sab;
        if (!s || s.type !== 'comms') {
          if (!api.finished) {
            api.msg('Comunicações restauradas.', 'ok');
            api.done(600);
          }
          return;
        }
        const diff = Math.abs(ang - s.target);
        hold = diff < 0.14 ? hold + dt : 0;
        if (hold > 0.9 && !api.finished) {
          g.fixComms(ctx.p);
          return;
        }
        ph += dt * 6;
        const c = K.ctx;
        panelBg(c, 380, 260);
        A.screen(c, 20, 40, 226, 176, { inner: '#0b2417', outer: '#040b07' });
        const clean = diff < 0.14;
        c.save();
        c.beginPath();
        c.rect(20, 40, 226, 176);
        c.clip();
        /* chiado de estática */
        const noiseA = Math.min(1, diff / 1.2);
        for (let k = 0; k < 90 * noiseA; k++) {
          c.fillStyle = `rgba(200,255,220,${Math.random() * 0.35})`;
          c.fillRect(20 + Math.random() * 226, 40 + Math.random() * 176, 2, 2);
        }
        c.strokeStyle = 'rgba(125,249,193,0.18)';
        c.lineWidth = 1;
        for (let gx = 20; gx < 246; gx += 22) {
          c.beginPath();
          c.moveTo(gx, 40);
          c.lineTo(gx, 216);
          c.stroke();
        }
        c.strokeStyle = clean ? '#3ae08a' : '#7df9c1';
        c.lineWidth = clean ? 3 : 2;
        c.shadowColor = '#3ae08a';
        c.shadowBlur = clean ? 10 : 4;
        c.beginPath();
        for (let x = 0; x <= 226; x += 3) {
          const noise = Math.min(1, diff / 1.5) * (Math.random() - 0.5) * 120;
          const yv = 128 + Math.sin(x / 18 + ph) * 40 * (1 - Math.min(1, diff)) + noise;
          if (x) c.lineTo(20 + x, yv);
          else c.moveTo(20 + x, yv);
        }
        c.stroke();
        c.shadowBlur = 0;
        c.restore();
        A.scanlines(c, 20, 40, 226, 176);
        A.text(c, clean ? 'SINAL OK' : 'SEM SINAL', 133, 22, 12, clean ? '#3ae08a' : '#ff6b6b');
        A.led(c, 30, 22, 5, clean ? '#3ae08a' : '#ff4040', clean || Math.sin(ph) > 0);
        /* botão de sintonia serrilhado com escala */
        for (let m = -6; m <= 6; m++) {
          const aa = -Math.PI / 2 + (m / 6) * 2.6;
          c.strokeStyle = 'rgba(255,255,255,0.35)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(knob.x + Math.cos(aa) * 56, knob.y + Math.sin(aa) * 56);
          c.lineTo(knob.x + Math.cos(aa) * 62, knob.y + Math.sin(aa) * 62);
          c.stroke();
        }
        c.fillStyle = '#151922';
        c.beginPath();
        c.arc(knob.x, knob.y, 50, 0, Math.PI * 2);
        c.fill();
        c.save();
        c.translate(knob.x, knob.y);
        c.rotate(ang);
        for (let k = 0; k < 24; k++) {
          c.rotate((Math.PI * 2) / 24);
          c.fillStyle = '#3a404c';
          c.fillRect(-3, -48, 6, 8);
        }
        const kg = c.createRadialGradient(-12, -12, 4, 0, 0, 42);
        kg.addColorStop(0, '#9aa3b2');
        kg.addColorStop(1, '#3a404c');
        c.fillStyle = kg;
        c.beginPath();
        c.arc(0, 0, 40, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#0d0f14';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = '#ffd23b';
        rr(c, -4, -38, 8, 22, 3);
        c.fill();
        c.restore();
      },
    };
  };

  /* ================= abertura ================= */
  function kindFor(task) {
    const s = task.step;
    switch (task.id) {
      case 'divert': return s === 0 ? 'divert' : 'accept';
      case 'upload': return 'transfer';
      case 'fuel': return 'fuel';
      default: return task.id;
    }
  }

  MG.openTask = function (g, p, task) {
    const st = M.STATIONS[task.steps[task.step]];
    const kind = kindFor(task);
    const builder = B[kind];
    if (!builder) return;
    const stepIdx = task.step;
    const ctx = { g, p, task, step: stepIdx };
    const room = M.AREA[st.area] ? M.AREA[st.area].name : '';
    const total = task.steps.length;
    p.busy = { minigame: true, task: task.id, station: st.id };
    open({
      title: task.def.name,
      sub: room + (total > 1 ? ' · etapa ' + (stepIdx + 1) + '/' + total : ''),
      build: (root, api) => builder(root, api, ctx),
      onDone: () => {
        if (!task.done && task.step === stepIdx) {
          g.completeStep(p, task);
          AU.Audio.play('task');
        }
      },
      onClose: () => {
        p.busy = null;
      },
    });
  };

  MG.openSab = function (g, p, station) {
    const kind = station.startsWith('reactor') ? 'reactor' : station.startsWith('o2') ? 'o2' : station;
    const builder = SB[kind];
    if (!builder) return;
    const titles = { lights: 'Consertar Luzes', reactor: 'Parar Colapso do Reator', o2: 'Restaurar Oxigênio', comms: 'Restaurar Comunicações' };
    p.busy = { minigame: true, fix: station };
    open({
      title: titles[kind],
      sub: M.SAB_STATIONS[station].name,
      cls: 'sab',
      build: (root, api) => builder(root, api, { g, p, station }),
      onClose: () => {
        p.busy = null;
      },
    });
  };

  MG.openPanel = function (spec) {
    return open(spec);
  };

  AU.MG = MG;
})();

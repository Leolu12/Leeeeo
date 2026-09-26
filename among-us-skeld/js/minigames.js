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

  const panelBg = (ctx, w, hh) => {
    ctx.fillStyle = '#1b2231';
    ctx.fillRect(0, 0, w, hh);
    ctx.strokeStyle = '#2d3850';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, hh - 2);
  };

  /* ================= TAREFAS ================= */
  const B = {};

  B.swipe = (root, api) => {
    const K = mkCanvas(root, 400, 260);
    let stage = 'wallet';
    const card = { x: 70, y: 180 };
    let drag = null;
    let msg = 'INSIRA O CARTÃO', msgC = '#7df9c1';
    K.on(
      (p) => {
        if (api.finished) return false;
        if (stage === 'wallet' && p.x > 40 && p.x < 190 && p.y > 150) {
          stage = 'swipe';
          card.x = 30;
          card.y = 104;
          msg = 'DESLIZE O CARTÃO';
          msgC = '#7df9c1';
          return false;
        }
        if (stage === 'swipe' && p.x > card.x && p.x < card.x + 110 && p.y > card.y - 10 && p.y < card.y + 70) {
          drag = { off: p.x - card.x, t0: performance.now() };
          return true;
        }
        return false;
      },
      (p) => {
        if (drag) card.x = U.clamp(p.x - drag.off, 30, 290);
      },
      () => {
        if (!drag) return;
        const dur = (performance.now() - drag.t0) / 1000;
        if (card.x >= 285) {
          if (dur < 0.55) {
            msg = 'MUITO RÁPIDO. TENTE DE NOVO.';
            msgC = '#ff6b6b';
            AU.Audio.play('fail');
          } else if (dur > 1.35) {
            msg = 'MUITO DEVAGAR. TENTE DE NOVO.';
            msgC = '#ff6b6b';
            AU.Audio.play('fail');
          } else {
            msg = 'ACEITO. OBRIGADO.';
            msgC = '#7df9c1';
            api.done(700);
          }
        } else {
          msg = 'PASSE O CARTÃO ATÉ O FIM.';
          msgC = '#ffd166';
        }
        if (!api.finished) card.x = 30;
        drag = null;
      }
    );
    api.msg('Clique no cartão, depois arraste-o pelo leitor num ritmo constante.');
    return {
      tick() {
        const c = K.ctx;
        panelBg(c, 400, 260);
        c.fillStyle = '#2b3446';
        c.fillRect(20, 16, 360, 64);
        c.fillStyle = '#0c1a14';
        c.fillRect(34, 26, 332, 44);
        c.fillStyle = msgC;
        c.font = '700 15px "Chakra Petch", monospace';
        c.textAlign = 'center';
        c.fillText(msg, 200, 54);
        c.fillStyle = '#0d1018';
        c.fillRect(20, 96, 360, 10);
        if (stage === 'wallet') {
          c.fillStyle = '#6b4a2b';
          c.fillRect(40, 190, 170, 60);
        }
        c.fillStyle = '#e9edf5';
        AU.Render.rr(c, card.x, card.y, 110, 62, 8);
        c.fill();
        c.fillStyle = '#49a7ff';
        c.fillRect(card.x + 8, card.y + 10, 30, 36);
        c.fillStyle = '#222';
        c.fillRect(card.x + 46, card.y + 16, 54, 6);
        c.fillRect(card.x + 46, card.y + 28, 40, 6);
        if (stage === 'wallet') {
          c.fillStyle = '#7c5733';
          c.fillRect(40, 205, 170, 45);
        }
      },
    };
  };

  B.wires = (root, api) => {
    const K = mkCanvas(root, 400, 300);
    const cols = ['#ff3b3b', '#3b7bff', '#ffd23b', '#ff4fd8'];
    const ly = [60, 120, 180, 240];
    const perm = U.shuffle([0, 1, 2, 3]);
    const conn = [null, null, null, null];
    let drag = null;
    K.on(
      (p) => {
        if (p.x > 70) return false;
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
        if (p.x > 320) {
          const j = ly.findIndex((y) => Math.abs(y - p.y) < 26);
          if (j >= 0 && perm[j] === drag.i && !conn.includes(j)) {
            conn[drag.i] = j;
            AU.Audio.play('click');
            if (conn.every((c) => c != null)) api.done();
          }
        }
        drag = null;
      }
    );
    api.msg('Arraste cada fio até o conector da mesma cor.');
    return {
      tick() {
        const c = K.ctx;
        panelBg(c, 400, 300);
        c.fillStyle = '#2a2f3a';
        c.fillRect(0, 20, 50, 260);
        c.fillRect(350, 20, 50, 260);
        for (let i = 0; i < 4; i++) {
          c.fillStyle = cols[i];
          c.fillRect(0, ly[i] - 10, 46, 20);
          c.fillStyle = cols[perm[i]];
          c.fillRect(354, ly[i] - 10, 46, 20);
          c.fillStyle = conn.includes(i) ? '#ffe36b' : '#555';
          c.fillRect(372, ly[i] - 26, 10, 8);
        }
        c.lineCap = 'round';
        c.lineWidth = 14;
        for (let i = 0; i < 4; i++) {
          if (conn[i] == null) continue;
          c.strokeStyle = cols[i];
          c.beginPath();
          c.moveTo(46, ly[i]);
          c.lineTo(354, ly[conn[i]]);
          c.stroke();
        }
        if (drag) {
          c.strokeStyle = cols[drag.i];
          c.beginPath();
          c.moveTo(46, ly[drag.i]);
          c.lineTo(drag.x, drag.y);
          c.stroke();
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
        for (let i = 0; i < 3; i++) {
          const cx = 70 + i * 130, cy = 135;
          c.fillStyle = flash > 0 && i === k ? '#5a1a1a' : '#10151f';
          c.beginPath();
          c.arc(cx, cy, 52, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = colors[i];
          c.lineWidth = 3;
          c.stroke();
          c.fillStyle = '#3ae08a';
          c.beginPath();
          c.moveTo(cx, cy);
          c.arc(cx, cy, 52, -Math.PI / 2 - 0.38, -Math.PI / 2 + 0.38);
          c.closePath();
          c.globalAlpha = 0.35;
          c.fill();
          c.globalAlpha = 1;
          const a = ang[i] - Math.PI / 2;
          c.strokeStyle = locked[i] ? '#3ae08a' : '#fff';
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46);
          c.stroke();
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
    return {
      tick() {
        const c = K.ctx;
        panelBg(c, 400, 260);
        c.setLineDash([6, 6]);
        c.strokeStyle = '#4c6a9a';
        c.lineWidth = 2;
        c.beginPath();
        pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
        c.stroke();
        c.setLineDash([]);
        pts.forEach((p, i) => {
          c.fillStyle = i < next ? '#3ae08a' : '#ffd23b';
          c.beginPath();
          c.arc(p.x, p.y, 9, 0, Math.PI * 2);
          c.fill();
        });
        c.fillStyle = '#e9edf5';
        c.beginPath();
        c.moveTo(ship.x + 16, ship.y);
        c.lineTo(ship.x - 10, ship.y - 10);
        c.lineTo(ship.x - 6, ship.y);
        c.lineTo(ship.x - 10, ship.y + 10);
        c.closePath();
        c.fill();
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
    return {
      tick(dt) {
        const c = K.ctx;
        panelBg(c, 400, 280);
        c.fillStyle = '#0b0f16';
        c.fillRect(8, 40, 70, 200);
        c.strokeStyle = '#2d3850';
        for (let y = 50; y < 240; y += 14) {
          c.beginPath();
          c.moveTo(10, y);
          c.lineTo(76, y);
          c.stroke();
        }
        for (const l of leaves) {
          if (l !== drag) {
            l.x = U.clamp(l.x + l.vx * dt, 95, 385);
            l.y = U.clamp(l.y + l.vy * dt, 20, 260);
            l.a += dt;
          }
          c.save();
          c.translate(l.x, l.y);
          c.rotate(l.a);
          c.fillStyle = '#5bbf4a';
          c.beginPath();
          c.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = '#2f6e25';
          c.beginPath();
          c.moveTo(-16, 0);
          c.lineTo(16, 0);
          c.stroke();
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
    return {
      tick(dt) {
        if (!drag && hy < 225 && !api.finished) hy = Math.min(225, hy + 200 * dt);
        const c = K.ctx;
        panelBg(c, 400, 270);
        c.font = '700 9px "Chakra Petch", monospace';
        c.textAlign = 'center';
        M.ACCEPT.forEach((id, i) => {
          const x = 30 + i * 48;
          c.fillStyle = i === target ? '#3a3317' : '#10151f';
          c.fillRect(x - 10, 40, 20, 195);
          c.fillStyle = i === target ? '#ffd23b' : '#7d8699';
          c.fillText(ACCEPT_LABEL[id], x, 255);
          const y = i === target ? hy : 225;
          c.fillStyle = i === target ? '#ffd23b' : '#4a5263';
          c.fillRect(x - 16, y - 8, 32, 16);
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
    root.appendChild(h('div', { class: 'mg-center' }, lever));
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
    return {
      tick() {
        const c = K.ctx;
        panelBg(c, 360, 300);
        for (const hx of hexes) {
          c.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
            const px = hx.x + Math.cos(a) * 40, py = hx.y + Math.sin(a) * 40;
            if (k) c.lineTo(px, py);
            else c.moveTo(px, py);
          }
          c.closePath();
          c.fillStyle = hx.red ? '#d33a3a' : '#e9edf5';
          c.fill();
          c.strokeStyle = '#10151f';
          c.lineWidth = 4;
          c.stroke();
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
        c.strokeStyle = '#2f6e9a';
        c.lineWidth = 2;
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
        c.strokeStyle = near ? '#3ae08a' : '#ffd23b';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(cross.x, cross.y, 16, 0, Math.PI * 2);
        c.moveTo(cross.x - 24, cross.y);
        c.lineTo(cross.x + 24, cross.y);
        c.moveTo(cross.x, cross.y - 24);
        c.lineTo(cross.x, cross.y + 24);
        c.stroke();
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
    root.appendChild(grid);
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
    root.appendChild(lights);
    root.appendChild(h('div', { class: 'mg-row' }, disp, inp));
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
        c.strokeStyle = '#3ae08a';
        c.setLineDash([4, 6]);
        c.beginPath();
        c.moveTo(20, 140);
        c.lineTo(290, 140);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = '#5a6275';
        AU.Render.rr(c, 20, 110, 70, 60, 10);
        c.fill();
        c.strokeStyle = ok ? '#3ae08a' : '#ff9a3c';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(90, 140);
        c.lineTo(300, y);
        c.stroke();
        c.fillStyle = '#10151f';
        c.fillRect(296, 30, 18, 220);
        c.fillStyle = ok ? '#3ae08a' : '#ffd23b';
        c.fillRect(286, y - 10, 40, 20);
      },
    };
  };

  B.fuel = (root, api, ctx) => {
    const engine = ctx.step % 2 === 1;
    const gauge = h('div', { class: 'mg-gauge' }, h('div', { class: 'fill' }));
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
    root.appendChild(h('div', { class: 'mg-center col' }, gauge, btn));
    api.msg(engine ? 'Despeje o combustível no motor.' : 'Encha o galão de combustível.');
    return {
      tick(dt) {
        if (holding && !api.finished) v = Math.min(1, v + dt / 3.2);
        gauge.firstChild.style.height = v * 100 + '%';
        if (v >= 1 && !api.finished) api.done();
      },
    };
  };

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
    root.appendChild(h('div', { class: 'mg-center col' },
      h('div', { class: 'mg-folders' }, h('span', { class: 'folder' }, '📁'), h('span', { class: 'file' }, '📄'), h('span', { class: 'folder' }, up ? '🛰️' : '📁')),
      bar, label, btn));
    api.msg(up ? 'Envie os dados para a sede. Não feche até terminar.' : 'Baixe os dados. Não feche até terminar.');
    return {
      tick(dt) {
        if (!run || api.finished) return;
        v = Math.min(1, v + dt / 7.5);
        bar.firstChild.style.width = v * 100 + '%';
        label.textContent = 'Tempo estimado: ' + Math.ceil((1 - v) * 7.5) + 's';
        root.querySelector('.file').style.transform = `translateX(${(v * 8) % 1 * 60 - 30}px)`;
        if (v >= 1) {
          label.textContent = 'Concluído';
          api.done();
        }
      },
    };
  };

  B.inspect = (root, api, ctx) => {
    const g = ctx.g, task = ctx.task;
    const tubes = h('div', { class: 'mg-tubes' });
    const ts = [0, 1, 2, 3, 4].map(() => tubes.appendChild(h('button', { class: 'tube', disabled: true }, h('span', {}))));
    root.appendChild(tubes);
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
    root.appendChild(h('div', { class: 'mg-center col' }, h('div', { class: 'mg-scanbean', html: AU.Render.beanSVG(p.color, { size: 90, visor: p.visor }) }), bar, info));
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
    const rocks = [];
    let hits = 0, spawn = 0;
    const shots = [];
    K.on((p) => {
      if (api.finished) return false;
      shots.push({ x: p.x, y: p.y, t: 0.15 });
      const r = rocks.find((a) => U.d2(a.x, a.y, p.x, p.y) < a.r + 6);
      if (r) {
        rocks.splice(rocks.indexOf(r), 1);
        hits++;
        AU.Audio.play('click');
        if (hits >= 20) api.done();
      }
      return false;
    });
    api.msg('Clique nos asteroides para destruí-los (20).');
    return {
      tick(dt) {
        if (ctx.g.S.rules.visualTasks && !api.finished) ctx.p.visual = { type: 'asteroids', until: ctx.g.t + 0.4 };
        spawn -= dt;
        if (spawn <= 0 && rocks.length < 7) {
          spawn = U.rf(0.35, 0.8);
          rocks.push({ x: 420, y: U.rf(30, 290), vx: -U.rf(60, 130), vy: U.rf(-25, 25), r: U.rf(14, 24), a: 0 });
        }
        for (const r of rocks) {
          r.x += r.vx * dt;
          r.y += r.vy * dt;
          r.a += dt;
        }
        for (let i = rocks.length - 1; i >= 0; i--) if (rocks[i].x < -30) rocks.splice(i, 1);
        const c = K.ctx;
        c.fillStyle = '#050810';
        c.fillRect(0, 0, 400, 320);
        c.fillStyle = '#6a7690';
        for (const r of rocks) {
          c.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + r.a;
            const rr2 = r.r * (0.8 + ((k * 37) % 5) / 20);
            if (k) c.lineTo(r.x + Math.cos(a) * rr2, r.y + Math.sin(a) * rr2);
            else c.moveTo(r.x + Math.cos(a) * rr2, r.y + Math.sin(a) * rr2);
          }
          c.closePath();
          c.fill();
        }
        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.t -= dt;
          c.strokeStyle = 'rgba(120,255,200,0.9)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(0, 320);
          c.lineTo(s.x, s.y);
          c.moveTo(400, 320);
          c.lineTo(s.x, s.y);
          c.stroke();
          if (s.t <= 0) shots.splice(i, 1);
        }
        c.fillStyle = '#7df9c1';
        c.font = '700 14px "Chakra Petch", monospace';
        c.fillText('DESTRUÍDOS: ' + hits + '/20', 14, 22);
      },
      cleanup() {
        if (ctx.p.visual && ctx.p.visual.type === 'asteroids') ctx.p.visual = null;
      },
    };
  };

  B.garbage = (root, api, ctx) => {
    const K = mkCanvas(root, 360, 300);
    let ly = 60, drag = false, hold = 0, level = 1;
    const vis = ctx.step === 1;
    K.on(
      (p) => {
        if (p.x < 270 || Math.abs(p.y - ly) > 30) return false;
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
        if (!drag && ly > 60) ly = Math.max(60, ly - 260 * dt);
        const down = ly >= 225;
        if (down) {
          hold += dt;
          level = Math.max(0, level - dt / 1.6);
          if (vis && ctx.g.S.rules.visualTasks) ctx.p.visual = { type: 'garbage', until: ctx.g.t + 0.4 };
        }
        if (level <= 0 && !api.finished) api.done();
        const c = K.ctx;
        panelBg(c, 360, 300);
        c.fillStyle = '#10151f';
        c.fillRect(40, 30, 200, 240);
        c.fillStyle = '#7a6442';
        c.fillRect(40, 30 + 240 * (1 - level), 200, 240 * level);
        c.fillStyle = '#2a2f3a';
        c.fillRect(296, 50, 14, 190);
        c.fillStyle = down ? '#3ae08a' : '#d33a3a';
        c.beginPath();
        c.arc(303, ly, 18, 0, Math.PI * 2);
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
    root.appendChild(row);
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
    const pad = h('div', { class: 'mg-hand', role: 'button', 'aria-label': 'Scanner de mão' }, '✋');
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
    root.appendChild(h('div', { class: 'mg-center' }, pad));
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
    root.appendChild(h('div', { class: 'mg-row' }, note, h('div', { class: 'mg-center col' }, disp, pad)));
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
        c.fillStyle = '#07120c';
        c.fillRect(16, 40, 230, 180);
        c.strokeStyle = diff < 0.14 ? '#3ae08a' : '#7df9c1';
        c.lineWidth = 2;
        c.beginPath();
        for (let x = 0; x <= 230; x += 3) {
          const noise = Math.min(1, diff / 1.5) * (Math.random() - 0.5) * 120;
          const y = 130 + Math.sin(x / 18 + ph) * 40 * (1 - Math.min(1, diff)) + noise;
          if (x) c.lineTo(16 + x, y);
          else c.moveTo(16 + x, y);
        }
        c.stroke();
        c.fillStyle = '#2a2f3a';
        c.beginPath();
        c.arc(knob.x, knob.y, 46, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffd23b';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(knob.x, knob.y);
        c.lineTo(knob.x + Math.sin(ang) * 40, knob.y - Math.cos(ang) * 40);
        c.stroke();
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

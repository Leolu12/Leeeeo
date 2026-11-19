/* Cenas de tela cheia desenhadas em canvas: o abate visto pela vítima (faca ou língua, o corpo se parte com
   respingos na cor dela) e a abertura das reuniões (botão de emergência com raios girando; corpo reportado com
   megafone). Usam o mesmo desenho dos personagens do jogo. */
(function () {
  'use strict';
  const AU = window.AU;
  const C = AU.C;

  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const rnd = (s) => {
    const x = Math.sin(s * 91.7) * 43758.5453;
    return x - Math.floor(x);
  };

  function fit(cv) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    return { W: cv.width, H: cv.height, dpr };
  }

  function rays(ctx, cx, cy, R, n, rot, c1, c2) {
    for (let i = 0; i < n; i++) {
      const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------------- abate ---------------- */
  function drawKill(ctx, S, t, d) {
    const { W, H } = S;
    const u = Math.min(W, H) * 0.34;
    const base = H * 0.62;
    const hit = 0.72;
    ctx.fillStyle = '#120204';
    ctx.fillRect(0, 0, W, H);
    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    grd.addColorStop(0, 'rgba(150,10,20,0.9)');
    grd.addColorStop(1, 'rgba(10,0,2,1)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    /* riscos de velocidade */
    ctx.strokeStyle = 'rgba(255,120,120,0.18)';
    ctx.lineWidth = Math.max(2, H * 0.006);
    for (let i = 0; i < 22; i++) {
      const y = rnd(i) * H, len = (0.1 + rnd(i + 9) * 0.2) * W;
      const x = ((rnd(i + 3) * W * 2 - t * W * 1.8) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    /* chão */
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(W / 2, base + u * 0.36, W * 0.42, u * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    const K = d.killer, V = d.victim;
    const kx = W * (-0.2 + 0.56 * ease(t / 0.3)), vx = W * 0.64;
    const drawBean = AU.Render.drawBean;
    /* vítima */
    const shake = t < hit ? Math.sin(t * 60) * u * 0.02 : 0;
    const cutY = base - u * 0.12;
    if (t < hit) {
      drawBean(ctx, vx + shake, base, u, V.color, { facing: -1, hat: V.hat, visor: V.visor });
    } else {
      const dt = t - hit;
      /* metade de baixo fica, com o osso */
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, cutY, W, H);
      ctx.clip();
      drawBean(ctx, vx, base, u, V.color, { facing: -1 });
      ctx.restore();
      ctx.fillStyle = '#7a0f1a';
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = u * 0.06;
      ctx.beginPath();
      ctx.ellipse(vx, cutY, u * 0.34, u * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const boneUp = Math.min(1, dt * 5);
      ctx.fillStyle = '#f4f0e6';
      ctx.fillRect(vx - u * 0.05, cutY - u * 0.3 * boneUp, u * 0.1, u * 0.3 * boneUp);
      ctx.strokeRect(vx - u * 0.05, cutY - u * 0.3 * boneUp, u * 0.1, u * 0.3 * boneUp);
      ctx.beginPath();
      ctx.arc(vx - u * 0.055, cutY - u * 0.32 * boneUp, u * 0.065, 0, Math.PI * 2);
      ctx.arc(vx + u * 0.055, cutY - u * 0.32 * boneUp, u * 0.065, 0, Math.PI * 2);
      ctx.fill();
      /* metade de cima voa girando */
      if (dt < 1.4) {
        ctx.save();
        ctx.globalAlpha = clamp(1.4 - dt, 0, 1);
        const ox = dt * W * 0.55, oy = -dt * H * 1.1 + dt * dt * H * 1.3;
        ctx.translate(vx + ox, cutY + oy);
        ctx.rotate(dt * 7);
        ctx.translate(-vx, -cutY);
        ctx.beginPath();
        ctx.rect(0, 0, W, cutY);
        ctx.clip();
        drawBean(ctx, vx, base, u, V.color, { facing: -1, hat: V.hat, visor: V.visor });
        ctx.restore();
      }
      /* respingos na cor da vítima */
      const col = C.COLOR[V.color] || C.COLORS[0];
      for (let i = 0; i < 30; i++) {
        const a = -Math.PI / 2 + (rnd(i * 2.1) - 0.5) * 2.4, sp = (0.4 + rnd(i * 3.7) * 0.9) * H;
        const px = vx + Math.cos(a) * sp * dt, py = cutY + Math.sin(a) * sp * dt + dt * dt * H * 1.6;
        if (py > base + u * 0.4) continue;
        ctx.globalAlpha = clamp(1.3 - dt, 0, 1);
        ctx.fillStyle = i % 3 === 0 ? '#8a0f1c' : i % 3 === 1 ? col.hex : col.shade;
        ctx.beginPath();
        ctx.arc(px, py, u * (0.035 + rnd(i) * 0.03), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    /* impostor */
    drawBean(ctx, kx, base, u, K.color, { facing: 1, hat: K.hat, visor: K.visor });
    const hx = kx + u * 0.34, hy = base - u * 0.15;
    if (d.style === 'knife') {
      /* faca: levanta e desce num golpe */
      let ang;
      if (t < 0.3) ang = -2.4;
      else if (t < 0.62) ang = -2.4 + ((t - 0.3) / 0.32) * 0.5;
      else if (t < hit) ang = -1.9 + ((t - 0.62) / (hit - 0.62)) * 2.6;
      else ang = 0.7;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      ctx.fillStyle = '#4a2a1a';
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = u * 0.04;
      ctx.fillRect(-u * 0.04, -u * 0.05, u * 0.2, u * 0.1);
      ctx.strokeRect(-u * 0.04, -u * 0.05, u * 0.2, u * 0.1);
      ctx.fillStyle = '#dfe6f2';
      ctx.beginPath();
      ctx.moveTo(u * 0.16, -u * 0.06);
      ctx.lineTo(u * 0.62, 0);
      ctx.lineTo(u * 0.16, u * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (t > 0.62 && t < hit + 0.05) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = u * 0.05;
        ctx.beginPath();
        ctx.arc(hx, hy, u * 0.6, -1.9, 0.7);
        ctx.stroke();
      }
    } else {
      /* língua: a boca abre embaixo do visor e a língua atravessa */
      const open = clamp((t - 0.3) / 0.25, 0, 1) * (t < hit + 0.4 ? 1 : clamp(1 - (t - hit - 0.4) * 3, 0, 1));
      if (open > 0) {
        const mx = kx + u * 0.12, my = base - u * 0.14;
        ctx.fillStyle = '#3a0508';
        ctx.strokeStyle = '#0b0d12';
        ctx.lineWidth = u * 0.04;
        ctx.beginPath();
        ctx.ellipse(mx, my, u * 0.2, u * 0.13 * open, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(mx - u * 0.14 + i * u * 0.09, my - u * 0.12 * open);
          ctx.lineTo(mx - u * 0.1 + i * u * 0.09, my - u * 0.04 * open);
          ctx.lineTo(mx - u * 0.06 + i * u * 0.09, my - u * 0.12 * open);
          ctx.fill();
        }
        const ext = t < 0.55 ? 0 : t < hit ? (t - 0.55) / (hit - 0.55) : t < hit + 0.35 ? 1 : clamp(1 - (t - hit - 0.35) * 3, 0, 1);
        if (ext > 0) {
          const tx = mx + (vx - mx) * ext;
          ctx.strokeStyle = '#e8628a';
          ctx.lineWidth = u * 0.09;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.quadraticCurveTo((mx + tx) / 2, my - u * 0.12, tx, cutY);
          ctx.stroke();
          ctx.fillStyle = '#f2f2f2';
          ctx.beginPath();
          ctx.moveTo(tx, cutY - u * 0.08);
          ctx.lineTo(tx + u * 0.16, cutY);
          ctx.lineTo(tx, cutY + u * 0.08);
          ctx.fill();
        }
      }
    }
    /* clarão do golpe */
    if (t > hit && t < hit + 0.18) {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - (t - hit) / 0.18)})`;
      ctx.fillRect(0, 0, W, H);
    }
    /* texto */
    if (t > 1.05) {
      const k = ease((t - 1.05) / 0.35);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(Math.min(H * 0.11, W * 0.115) * (0.8 + 0.2 * k))}px "Chakra Petch", system-ui, sans-serif`;
      ctx.lineWidth = H * 0.012;
      ctx.strokeStyle = '#0b0d12';
      ctx.fillStyle = '#ff4a4a';
      ctx.strokeText('VOCÊ MORREU', W / 2, H * 0.16);
      ctx.fillText('VOCÊ MORREU', W / 2, H * 0.16);
      ctx.font = `700 ${Math.round(Math.min(H * 0.04, W * 0.05))}px "Nunito", system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('por ' + K.name, W / 2, H * 0.27);
      ctx.restore();
    }
  }

  /* ---------------- aberturas das reuniões ---------------- */
  function drawMeeting(ctx, S, t, d) {
    const { W, H } = S;
    const portrait = H > W * 1.2;
    const cx = W / 2, cy = H * (portrait ? 0.44 : 0.36);
    const R = Math.hypot(W, H);
    const report = d.kind === 'report';
    ctx.fillStyle = report ? '#1a0306' : '#170808';
    ctx.fillRect(0, 0, W, H);
    rays(ctx, cx, cy, R, 18, t * 0.35, report ? 'rgba(255,70,70,0.22)' : 'rgba(255,190,40,0.22)', 'rgba(0,0,0,0)');
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.45);
    grd.addColorStop(0, report ? 'rgba(255,80,80,0.45)' : 'rgba(255,200,60,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    const u = (portrait ? W * 0.32 : Math.min(W * 0.28, H * 0.27)) * (0.6 + 0.4 * ease(t / 0.35));
    const drawBean = AU.Render.drawBean;
    const cc = C.COLOR[d.caller.color] || C.COLORS[0];
    const mitt = (x, y, r) => {
      ctx.fillStyle = cc.hex;
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = u * 0.045;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    if (report) {
      /* quem achou grita no megafone apontando para o corpo */
      const bx = cx + u * 0.8, by = cy + u * 0.42;
      drawBean(ctx, bx, by, u * 1.15, d.body.color, { dead: true });
      const px = cx - u * 0.62, py = cy + u * 0.2;
      const lean = Math.sin(t * 26) * u * 0.015;
      drawBean(ctx, px + lean, py, u, d.caller.color, { facing: 1, hat: d.caller.hat, visor: d.caller.visor });
      const mx = px + u * 0.42, my = py - u * 0.2;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-0.12 + Math.sin(t * 26) * 0.03);
      ctx.fillStyle = '#e8e3d6';
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = u * 0.045;
      ctx.beginPath();
      ctx.moveTo(-u * 0.1, -u * 0.08);
      ctx.lineTo(u * 0.3, -u * 0.24);
      ctx.lineTo(u * 0.3, u * 0.24);
      ctx.lineTo(-u * 0.1, u * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c9c2b0';
      ctx.beginPath();
      ctx.ellipse(u * 0.3, 0, u * 0.06, u * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e24b4b';
      ctx.fillRect(-u * 0.18, -u * 0.09, u * 0.09, u * 0.18);
      ctx.strokeRect(-u * 0.18, -u * 0.09, u * 0.09, u * 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = u * 0.035;
      for (let i = 0; i < 3; i++) {
        const k = (t * 2.2 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.arc(u * 0.3, 0, u * (0.18 + k * 0.45), -0.6, 0.6);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      mitt(mx - u * 0.02, my + u * 0.1, u * 0.09);
    } else {
      /* quem chamou bate no botão da mesa do refeitório */
      const tx = cx + u * 0.42, ty = cy + u * 0.5;
      ctx.fillStyle = '#5a6272';
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = u * 0.045;
      ctx.beginPath();
      ctx.moveTo(tx - u * 0.12, ty);
      ctx.lineTo(tx - u * 0.18, ty + u * 0.42);
      ctx.lineTo(tx + u * 0.18, ty + u * 0.42);
      ctx.lineTo(tx + u * 0.12, ty);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8a93a6';
      ctx.beginPath();
      ctx.ellipse(tx, ty, u * 0.62, u * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c8cfdc';
      ctx.beginPath();
      ctx.ellipse(tx, ty - u * 0.02, u * 0.5, u * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      const beat = (t * 2.4) % 1, down = beat < 0.25 ? beat / 0.25 : beat < 0.45 ? 1 : clamp(1 - (beat - 0.45) / 0.3, 0, 1);
      const press = down * u * 0.04;
      ctx.fillStyle = '#e02b36';
      ctx.beginPath();
      ctx.ellipse(tx, ty - u * 0.08 + press, u * 0.2, u * 0.08, 0, Math.PI, 0);
      ctx.lineTo(tx + u * 0.2, ty - u * 0.03);
      ctx.ellipse(tx, ty - u * 0.03, u * 0.2, u * 0.07, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      /* redoma de vidro aberta, inclinada para trás */
      ctx.strokeStyle = 'rgba(200,230,255,0.7)';
      ctx.fillStyle = 'rgba(160,210,255,0.18)';
      ctx.lineWidth = u * 0.025;
      ctx.beginPath();
      ctx.ellipse(tx + u * 0.34, ty - u * 0.2, u * 0.12, u * 0.24, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const px = cx - u * 0.18, py = cy + u * 0.3;
      const sh = Math.sin(t * 40) * u * 0.02;
      drawBean(ctx, px + sh, py, u, d.caller.color, { facing: 1, hat: d.caller.hat, visor: d.caller.visor });
      mitt(tx - u * 0.02, ty - u * 0.2 + down * u * 0.1, u * 0.1);
      if (down > 0.9) {
        ctx.strokeStyle = 'rgba(255,240,180,0.9)';
        ctx.lineWidth = u * 0.03;
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + (i / 4) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(a) * u * 0.28, ty - u * 0.08 + Math.sin(a) * u * 0.14);
          ctx.lineTo(tx + Math.cos(a) * u * 0.4, ty - u * 0.08 + Math.sin(a) * u * 0.22);
          ctx.stroke();
        }
      }
      /* sirene girando em cima */
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = u * 0.03;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.45;
        const k = (t * 3 + i * 0.25) % 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * u * (0.7 + k * 0.2), py - u * 0.25 + Math.sin(a) * u * (0.7 + k * 0.2));
        ctx.lineTo(px + Math.cos(a) * u * (0.9 + k * 0.2), py - u * 0.25 + Math.sin(a) * u * (0.9 + k * 0.2));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* toca a cena no canvas; devolve uma função que para */
  function play(cv, kind, data, dur) {
    const ctx = cv.getContext('2d');
    let S = fit(cv);
    const onResize = () => (S = fit(cv));
    window.addEventListener('resize', onResize);
    const draw = kind === 'kill' ? drawKill : drawMeeting;
    let stopped = false;
    const t0 = performance.now();
    const frame = () => {
      if (stopped) return;
      const t = (performance.now() - t0) / 1000;
      ctx.save();
      draw(ctx, S, reduced() ? dur * 0.8 : Math.min(t, dur), data);
      ctx.restore();
      if (t < dur && !reduced()) requestAnimationFrame(frame);
    };
    frame();
    return () => {
      stopped = true;
      window.removeEventListener('resize', onResize);
    };
  }

  AU.Scenes = { play };
})();

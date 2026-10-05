/* PAI 2.0 — cap10.js — Capítulo 10: "A Ligação" (22h30, sala, tensão)
 *
 * Gancho: a casa em silêncio, {filho} numa festa. Duas ligações de golpe com IA:
 *   (1) videochamada da "Bia" (CFO) com rosto e voz falsos pedindo uma transferência secreta;
 *   (2) a "voz de {filho}" clonada pedindo um Pix urgente.
 * Ele vence por PROCESSO, não pelo olho: desligar e ligar de volta / pergunta que só a pessoa saberia.
 * Depois: como o truque é feito (Raio-x dos sinais), o protocolo, o Semáforo dos dados (o que nunca vai
 * para a IA), o aviso à equipe com a caneta vermelha, e a palavra-código combinada pessoalmente.
 *
 * Stats (bíblia F): cap10 {golpeEvitado, dePrimeira, ceoFalsoEvitado, acertos, total, palavraCodigo}
 * Conquistas: nao_caio_mais (as duas de primeira) · cofre (semáforo 10/10)
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Falantes especiais
  // ------------------------------------------------------------------
  const FALSA_BIA = { name: 'Bia (vídeo)', color: '#4a5a7a', voice: 'filho' };
  const FALSO_FILHO = { name: '{filho} (número desconhecido)', color: '#2a9d78', voice: 'filho' };

  const PHONE_POS = { x: 0.12, y: 0.45, z: -0.42 }; // celular sobre a mesa de centro (sala)
  const PHONE_LOOK = { x: 0.12, y: 0.74, z: -0.42 }; // olhar um pouco acima do celular: a Faísca fica no quadro

  // ------------------------------------------------------------------
  // CSS do capítulo (chamada na tela + minigames)
  // ------------------------------------------------------------------
  const CSS = `
.c10-call { position: absolute; top: 70px; left: 14px; z-index: 3; width: 206px; padding: 10px 10px 12px;
  border-radius: 28px; background: linear-gradient(180deg, #161a26, #0b0e16); color: #fff;
  box-shadow: 0 18px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset; font-family: var(--head);
  opacity: 0; transform: translateY(-14px) scale(0.96); transition: opacity 0.35s, transform 0.35s, filter 0.4s; pointer-events: none; }
.c10-call.show { opacity: 1; transform: none; }
.c10-call-top { display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em; opacity: 0.78; margin: 2px 0 8px; text-transform: uppercase; }
.c10-call canvas { display: block; width: 100%; height: auto; aspect-ratio: 4 / 5; border-radius: 18px; background: #222; }
.c10-call-name { margin-top: 9px; text-align: center; font-weight: 800; font-size: 15px; line-height: 1.2; }
.c10-call-sub { text-align: center; font-size: 12px; opacity: 0.72; margin-top: 2px; font-family: var(--read); }
.c10-call-btns { display: flex; justify-content: center; gap: 14px; margin-top: 10px; }
.c10-dot { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; background: #2a3040; }
.c10-dot.red { background: #e5484d; }
.c10-dot.green { background: #2fbf6f; }
.c10-call .c10-accept { display: none; }
.c10-call.ringing .c10-accept { display: grid; animation: c10ring 0.9s ease-in-out infinite; }
.c10-call.ringing .c10-mute { display: none; }
.c10-call.ringing { animation: c10shake 0.5s ease-in-out infinite; }
.c10-call.ended { filter: grayscale(0.7) brightness(0.75); }
.c10-call.reveal { box-shadow: 0 0 0 2px #e5484d, 0 0 38px rgba(229,72,77,0.65); }
@keyframes c10ring { 0%,100% { transform: scale(1); } 50% { transform: scale(1.14); } }
@keyframes c10shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-1.4deg); } 75% { transform: rotate(1.4deg); } }
@media (max-width: 760px) and (orientation: portrait) {
  .c10-call { top: 50px; left: 8px; width: 122px; padding: 6px 6px 8px; border-radius: 18px; }
  .c10-call canvas { border-radius: 12px; }
  .c10-call-top { font-size: 9px; margin: 1px 0 5px; }
  .c10-call-name { font-size: 11px; margin-top: 5px; }
  .c10-call-sub { font-size: 9.5px; }
  .c10-call-btns { gap: 8px; margin-top: 6px; }
  .c10-dot { width: 22px; height: 22px; font-size: 11px; }
}

/* ---- minigames ---- */
.c10-dots { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.c10-dots i { width: 14px; height: 14px; border-radius: 50%; background: #e3e6ef; display: inline-block; }
.c10-dots i.cur { box-shadow: 0 0 0 3px rgba(255,107,61,0.35); background: #ffd9c9; }
.c10-dots i.ok { background: var(--mint); }
.c10-dots i.bad { background: var(--red); }
.c10-item { display: flex; gap: 14px; align-items: center; background: #fff; border: 1px solid var(--line); border-radius: 18px;
  padding: 16px 18px; box-shadow: 0 6px 20px rgba(10,20,50,0.08); }
.c10-item .ic { font-size: 2em; line-height: 1; flex: 0 0 auto; }
.c10-item b { font-family: var(--head); font-size: 1.08em; line-height: 1.3; color: var(--ink); }
.c10-lights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.c10-lights .mg-card { text-align: center; padding: 12px 8px; min-height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.c10-lights .mg-card .kbd { margin: 0 0 4px; }
.c10-lights .lt { font-family: var(--head); font-weight: 800; line-height: 1.2; }
.c10-lights .mg-card.g { border-color: #9fe0c6; }
.c10-lights .mg-card.y { border-color: #f0cf86; }
.c10-lights .mg-card.r { border-color: #f3b0b2; }
@media (max-width: 520px) { .c10-lights { grid-template-columns: 1fr; } .c10-lights .mg-card { min-height: 0; flex-direction: row; justify-content: flex-start; text-align: left; gap: 10px; padding: 11px 14px; } .c10-lights .mg-card small { display: inline; margin: 0 0 0 4px; } }
.c10-legend { display: grid; gap: 8px; }
.c10-legend div { border-radius: 12px; padding: 8px 12px; line-height: 1.4; }
.c10-legend .g { background: var(--mint-l); } .c10-legend .y { background: var(--amber-l); } .c10-legend .r { background: var(--red-l); }
.c10-score { font-family: var(--head); font-weight: 800; font-size: 1.25em; color: var(--ink); }
.c10-tr .mg-line { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; }
.c10-tr .who { font-family: var(--head); font-size: 0.74em; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); }
.c10-tr .mg-line.on { background: #fff1e8; border-color: var(--brand); }
.c10-tr .mg-line.on .who::after { content: '  🚩 marcada'; color: var(--brand-d); }
.c10-tr .tag { font-size: 0.86em; line-height: 1.4; margin-top: 3px; }
.c10-k { font-family: var(--head); font-size: 0.72em; font-weight: 800; background: rgba(20,30,60,0.08); border-radius: 6px; padding: 0.05em 0.42em; margin-right: 6px; color: var(--muted); }
@media (hover: none) { .c10-k { display: none; } }
.c10-tr .sec { margin: 6px 0 2px; }
.c10-mail .head { font-size: 0.86em; color: var(--muted); border-bottom: 1px solid var(--line); padding-bottom: 8px; margin-bottom: 6px; line-height: 1.5; }
.c10-mail .mg-line.cut { text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 2px; color: #9a1d22; background: var(--red-l); border-color: #f3b0b2; }
.c10-mail .fix { display: block; color: #12684b; background: var(--mint-l); border-radius: 10px; padding: 5px 9px; margin: 2px 0 6px; line-height: 1.45; }
.c10-mail .sign { margin-top: 8px; font-family: var(--head); font-weight: 800; }
`;

  // ------------------------------------------------------------------
  // A chamada na tela do celular (DOM sobre o palco 3D)
  // ------------------------------------------------------------------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Retrato da "Bia" na videochamada (perfeito de propósito: não há defeito para caçar). */
  function drawBia(ctx, W, H, t, talk) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#d9c4a6'); bg.addColorStop(1, '#8c6f55');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // estante desfocada ao fundo
    ctx.save();
    ctx.globalAlpha = 0.28;
    const cols = ['#6a4a3a', '#3e5a6a', '#a8743c', '#5a6a3a', '#7a3a3a'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) {
      ctx.fillStyle = cols[(i + r * 2) % cols.length];
      ctx.fillRect(8 + i * 13, 20 + r * 52, 10, 40 - ((i * 7 + r * 3) % 12));
    }
    ctx.restore();
    // abajur
    const lg = ctx.createRadialGradient(W * 0.86, H * 0.18, 4, W * 0.86, H * 0.18, 80);
    lg.addColorStop(0, 'rgba(255,226,170,0.95)'); lg.addColorStop(1, 'rgba(255,226,170,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    const cx = W / 2 + Math.sin(t * 0.7) * 2.2, cy = H * 0.42 + Math.sin(t * 0.93) * 1.6;
    // ombros (suéter grafite) e gola
    ctx.fillStyle = '#2a3a4a';
    ctx.beginPath(); ctx.ellipse(cx, H * 1.04, W * 0.5, H * 0.3, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f6efe4';
    ctx.beginPath(); ctx.moveTo(cx - 24, H * 0.755); ctx.lineTo(cx, H * 0.85); ctx.lineTo(cx + 24, H * 0.755); ctx.closePath(); ctx.fill();
    // pescoço
    ctx.fillStyle = '#c3885e';
    ctx.fillRect(cx - 16, cy + 40, 32, 46);
    // cabelo atrás (chanel castanho)
    ctx.fillStyle = '#5a3a28';
    roundRect(ctx, cx - 60, cy - 60, 120, 122, 52); ctx.fill();
    // rosto
    ctx.fillStyle = '#d59c70';
    ctx.beginPath(); ctx.ellipse(cx, cy + 4, 44, 54, 0, 0, Math.PI * 2); ctx.fill();
    // orelhas e brincos
    ctx.beginPath(); ctx.ellipse(cx - 44, cy + 8, 7, 11, 0, 0, Math.PI * 2); ctx.ellipse(cx + 44, cy + 8, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9d7a8';
    ctx.beginPath(); ctx.arc(cx - 45, cy + 22, 3.2, 0, Math.PI * 2); ctx.arc(cx + 45, cy + 22, 3.2, 0, Math.PI * 2); ctx.fill();
    // franja de lado
    ctx.fillStyle = '#5a3a28';
    ctx.beginPath();
    ctx.moveTo(cx - 50, cy + 2);
    ctx.quadraticCurveTo(cx - 46, cy - 62, cx + 4, cy - 60);
    ctx.quadraticCurveTo(cx + 54, cy - 56, cx + 52, cy + 4);
    ctx.quadraticCurveTo(cx + 34, cy - 36, cx - 6, cy - 36);
    ctx.quadraticCurveTo(cx - 34, cy - 32, cx - 50, cy + 2);
    ctx.fill();
    // bochechas
    ctx.fillStyle = 'rgba(224,128,108,0.35)';
    ctx.beginPath(); ctx.ellipse(cx - 26, cy + 24, 9, 6, 0, 0, Math.PI * 2); ctx.ellipse(cx + 26, cy + 24, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    // sobrancelhas
    ctx.strokeStyle = '#4a2e20'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 30, cy - 12); ctx.quadraticCurveTo(cx - 20, cy - 17, cx - 9, cy - 13); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 9, cy - 13); ctx.quadraticCurveTo(cx + 20, cy - 17, cx + 30, cy - 12); ctx.stroke();
    // olhos (piscam)
    const blink = (t % 3.9) < 0.13;
    ctx.fillStyle = '#2a1a10';
    if (blink) { ctx.fillRect(cx - 25, cy + 4, 12, 2.5); ctx.fillRect(cx + 13, cy + 4, 12, 2.5); }
    else {
      ctx.beginPath(); ctx.ellipse(cx - 19, cy + 5, 4.6, 5.4, 0, 0, Math.PI * 2); ctx.ellipse(cx + 19, cy + 5, 4.6, 5.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 17.5, cy + 3.2, 1.5, 0, Math.PI * 2); ctx.arc(cx + 20.5, cy + 3.2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // óculos
    ctx.strokeStyle = '#2a2a32'; ctx.lineWidth = 3;
    roundRect(ctx, cx - 34, cy - 6, 29, 22, 8); ctx.stroke();
    roundRect(ctx, cx + 5, cy - 6, 29, 22, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy + 1); ctx.quadraticCurveTo(cx, cy - 2, cx + 5, cy + 1); ctx.stroke();
    // nariz
    ctx.strokeStyle = 'rgba(150,90,60,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx + 1, cy + 12); ctx.quadraticCurveTo(cx + 5, cy + 24, cx - 3, cy + 26); ctx.stroke();
    // boca
    if (talk) {
      const o = 3 + Math.abs(Math.sin(t * 15)) * 6 + Math.abs(Math.sin(t * 7.3)) * 2;
      ctx.fillStyle = '#7a2e2a';
      ctx.beginPath(); ctx.ellipse(cx, cy + 37, 10, o, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(cx - 7, cy + 37 - o + 0.5, 14, Math.min(3, o * 0.4));
    } else {
      ctx.strokeStyle = '#a95a4c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx - 12, cy + 35); ctx.quadraticCurveTo(cx, cy + 43, cx + 12, cy + 35); ctx.stroke();
    }
    // miniatura da própria câmera (o pai), canto inferior direito
    const mw = W * 0.26, mh = H * 0.24, mx = W - mw - 8, my = H - mh - 8;
    ctx.save();
    roundRect(ctx, mx, my, mw, mh, 8); ctx.clip();
    ctx.fillStyle = '#2a2230'; ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#24324f'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh * 1.05, mw * 0.46, mh * 0.42, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c98e64'; ctx.beginPath(); ctx.ellipse(mx + mw / 2, my + mh * 0.52, mw * 0.2, mh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8a7af'; ctx.fillRect(mx + mw * 0.3, my + mh * 0.25, mw * 0.4, mh * 0.08);
    ctx.fillStyle = '#8f8b95'; ctx.fillRect(mx + mw * 0.4, my + mh * 0.62, mw * 0.2, mh * 0.05);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; roundRect(ctx, mx, my, mw, mh, 8); ctx.stroke();
  }

  /** O que está "por trás" do rosto: sombra com olhos vermelhos (revelação). */
  function drawShadow(ctx, W, H, t, a) {
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H * 0.45, W * 0.8);
    g.addColorStop(0, '#2a0a18'); g.addColorStop(1, '#07030a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#120818';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 1.02, W * 0.52, H * 0.34, 0, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.44, 56, 70, 0, 0, Math.PI * 2); ctx.fill();
    const glow = 0.7 + 0.3 * Math.sin(t * 6);
    ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255,60,70,' + glow + ')';
    ctx.beginPath(); ctx.ellipse(W / 2 - 18, H * 0.45, 9, 4.5, -0.15, 0, Math.PI * 2); ctx.ellipse(W / 2 + 18, H * 0.45, 9, 4.5, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /** Ligação só de voz: avatar desconhecido + ondas da voz. */
  function drawVoice(ctx, W, H, t, talk, rv) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, rv > 0.5 ? '#3a0c16' : '#1c2a44'); bg.addColorStop(1, rv > 0.5 ? '#12040a' : '#0b111f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // avatar
    ctx.fillStyle = rv > 0.5 ? '#2a0a14' : '#3a4a66';
    ctx.beginPath(); ctx.arc(W / 2, H * 0.34, 46, 0, Math.PI * 2); ctx.fill();
    if (rv > 0.5) {
      ctx.save(); ctx.shadowColor = '#ff2a3a'; ctx.shadowBlur = 12; ctx.fillStyle = '#ff4a55';
      ctx.beginPath(); ctx.ellipse(W / 2 - 14, H * 0.34, 7, 3.5, -0.15, 0, Math.PI * 2); ctx.ellipse(W / 2 + 14, H * 0.34, 7, 3.5, 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#c9d4ea';
      ctx.beginPath(); ctx.arc(W / 2, H * 0.3, 15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(W / 2, H * 0.43, 26, 15, 0, Math.PI, 0); ctx.fill();
    }
    // ondas
    const n = 21, bw = (W - 40) / n;
    for (let i = 0; i < n; i++) {
      const k = Math.abs(Math.sin(t * 9 + i * 0.9) * Math.sin(t * 3.1 + i * 0.37));
      const h = talk ? 6 + k * 46 : 4 + Math.abs(Math.sin(t * 1.5 + i)) * 3;
      ctx.fillStyle = rv > 0.5 ? '#ff4a55' : '#7fd6a8';
      roundRect(ctx, 20 + i * bw + 1, H * 0.72 - h / 2, bw - 3, h, 2); ctx.fill();
    }
  }

  const Call = {
    el: null, cv: null, ctx: null, nameEl: null, subEl: null, topEl: null, off: null, tok: -1,
    kind: 'video', state: 'live', t0: 0, rv: 0, rvTarget: 0, speaking: false, sub: '', buf: null,
    build() {
      const wrap = document.getElementById('stage-wrap');
      if (!wrap) return false;
      if (this.el && this.el.isConnected && this.tok === P2.runToken) return true;
      this.destroy();
      P2.ui.css('cap10', CSS);
      const el = document.createElement('div');
      el.className = 'c10-call';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="c10-call-top"></div><canvas width="240" height="300"></canvas>' +
        '<div class="c10-call-name"></div><div class="c10-call-sub"></div>' +
        '<div class="c10-call-btns"><span class="c10-dot c10-mute">🎙️</span><span class="c10-dot green c10-accept">📞</span><span class="c10-dot red">📞</span></div>';
      wrap.appendChild(el);
      this.el = el;
      this.cv = el.querySelector('canvas');
      this.ctx = this.cv.getContext('2d');
      this.topEl = el.querySelector('.c10-call-top');
      this.nameEl = el.querySelector('.c10-call-name');
      this.subEl = el.querySelector('.c10-call-sub');
      this.buf = document.createElement('canvas');
      this.buf.width = 240; this.buf.height = 300;
      this.tok = P2.runToken;
      const tok = this.tok;
      this.off = P2.core.onFrame((dt) => {
        if (P2.runToken !== tok) { this.destroy(); return; }
        this.frame(dt);
      });
      return true;
    },
    destroy() {
      if (this.off) { this.off(); this.off = null; }
      if (this.el) { this.el.remove(); this.el = null; }
      this.speaking = false;
    },
    /** o: {kind:'video'|'voice', name, sub, state:'ringing'|'live'} */
    show(G, o) {
      if (!this.build()) return;
      this.kind = o.kind || 'video';
      this.sub = G.t(o.sub || '');
      this.rv = 0; this.rvTarget = 0;
      this.topEl.textContent = this.kind === 'video' ? '🔒 Chamada de vídeo' : '🔒 Chamada de voz';
      this.nameEl.textContent = G.t(o.name || '');
      this.setState(o.state || 'live');
      this.el.classList.remove('reveal');
      requestAnimationFrame(() => { if (this.el) this.el.classList.add('show'); });
    },
    setState(s) {
      if (!this.el) return;
      this.state = s;
      if (s === 'live') this.t0 = P2.realTime;
      this.el.classList.toggle('ringing', s === 'ringing');
      this.el.classList.toggle('ended', s === 'ended');
      this.frame(0);
    },
    reveal() { if (this.el) { this.rvTarget = 1; this.el.classList.add('reveal'); } },
    hide() {
      this.speaking = false;
      if (!this.el) return;
      this.el.classList.remove('show');
      const el = this.el;
      setTimeout(() => { if (el === this.el && !el.classList.contains('show')) this.destroy(); }, 450);
    },
    frame(dt) {
      if (!this.el || !this.ctx) return;
      const t = P2.realTime;
      this.rv += (this.rvTarget - this.rv) * Math.min(1, (dt || 0) * 1.6);
      const nx = document.getElementById('dlg-next');
      const talk = this.speaking && this.state === 'live' && !(nx && nx.classList.contains('on'));
      const ctx = this.ctx, W = 240, H = 300;
      if (this.kind === 'video') {
        if (this.rv < 0.02) drawBia(ctx, W, H, t, talk);
        else {
          // glitch: o rosto "escorrega" em fatias e a sombra aparece por trás
          const b = this.buf.getContext('2d');
          drawBia(b, W, H, t, false);
          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
          const n = 12;
          for (let i = 0; i < n; i++) {
            const y = (i * H) / n, sh = H / n;
            const off = Math.sin(t * 23 + i * 1.7) * 18 * this.rv * (i % 3 === 0 ? 1.6 : 0.6);
            ctx.drawImage(this.buf, 0, y, W, sh, off, y, W, sh);
          }
          ctx.fillStyle = 'rgba(255,40,60,' + (0.25 * this.rv) + ')'; ctx.fillRect(0, 0, W, H);
          drawShadow(ctx, W, H, t, Math.min(1, this.rv * 1.15));
        }
      } else drawVoice(ctx, W, H, t, talk, this.rv);
      if (this.state === 'ended') { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H); }
      let sub = this.sub;
      if (this.state === 'ringing') sub = (sub ? sub + ' · ' : '') + 'chamando…';
      else if (this.state === 'ended') sub = 'Chamada encerrada';
      else if (this.state === 'reveal') sub = 'quem estava do outro lado';
      else {
        const s = Math.max(0, Math.floor(t - this.t0));
        sub = (sub ? sub + ' · ' : '') + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      }
      if (this.subEl.textContent !== sub) this.subEl.textContent = sub;
    },
  };

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  /** Animação curta da Faísca sem esperar (reação a uma escolha). */
  function react(G, anim, secs, emote) {
    const f = G.faisca;
    if (emote) f.emote(emote);
    f.play(anim, secs || 1.4).catch(() => {});
  }
  /** Fala de quem está do outro lado da linha (anima a boca/ondas na tela). */
  async function linha(G, who, text, o) {
    Call.speaking = true;
    await G.say(who, text, Object.assign({ cam: false }, o || {}));
    Call.speaking = false;
  }
  /** Toque de celular por alguns segundos (ou até stop). */
  function tocar(G) { return G.sfx('phone_ring', { loop: true }); }
  function parar(h) { if (h && h.stop) h.stop(); }

  // ------------------------------------------------------------------
  // Minigame: Raio-x das ligações (sinais de alarme)
  // ------------------------------------------------------------------
  const RAIO = [
    { sec: 'bia', t: '“Boa noite! Desculpa a hora.”', flag: false, why: 'Frase normal. O golpe se esconde no meio de frases normais.' },
    { sec: 'bia', t: '“Tô falando de um número novo, o meu celular deu pau.”', flag: true, tag: '📱 Canal estranho', why: 'Número novo é o primeiro sinal. Quem é de verdade aceita que você ligue no número de sempre.' },
    { sec: 'bia', t: '“Sigilo absoluto. Não comenta com ninguém, nem com o Rafael.”', flag: true, tag: '🤫 Segredo', why: 'Segredo isola você de quem poderia conferir. Pagamento de verdade tem processo, não segredo.' },
    { sec: 'bia', t: '“O Tadeu, do jurídico, já está ciente.”', flag: true, tag: '🎩 Autoridade emprestada', why: 'Citar um nome importante serve para você não conferir. Quem confere com o Tadeu é você.' },
    { sec: 'bia', t: '“A janela do banco fecha às 23h.”', flag: true, tag: '⏰ Pressa', why: 'Pressa desliga o raciocínio. Nada sério se decide em vinte minutos, de noite, por vídeo.' },
    { sec: 'filho', t: '“{apelido}?! {apelido}, sou eu!”', flag: false, why: 'Frase normal, e a voz era idêntica. Por isso a voz não prova nada: o que prova é ligar de volta.' },
    { sec: 'filho', t: '“Faz um Pix pra chave dele, por favor!”', flag: true, tag: '💸 Dinheiro fora do caminho normal', why: 'Pagamento urgente, para conta de terceiro, fora do jeito de sempre: pare e confirme.' },
    { sec: 'filho', t: '“Tô no celular de um amigo, o meu acabou a bateria.”', flag: true, tag: '📱 Canal estranho, de novo', why: 'O mesmo truque da Bia: número desconhecido com desculpa pronta, para você não ligar no número de sempre.' },
    { sec: 'filho', t: '“E não liga pra ninguém, tá?”', flag: true, tag: '🚫 Impede a confirmação', why: 'Quem pede para você não ligar tem medo de uma coisa só: que você confira.' },
  ];

  function miniRaioX(G) {
    return G.mini((root, done, api) => {
      const el = api.el;
      const sel = new Set();
      let checked = false;
      const doc = el('div', 'mg-doc c10-tr');
      const lines = [];
      let lastSec = '';
      RAIO.forEach((r, i) => {
        if (r.sec !== lastSec) {
          lastSec = r.sec;
          doc.appendChild(el('div', 'mg-label sec', r.sec === 'bia' ? '📹 Videochamada da “Bia” · 22h34' : api.t('📞 Ligação da “voz de {filho}” · 22h47')));
        }
        const b = el('button', 'mg-line', [el('span', 'who', [el('span', 'c10-k', String(i + 1)), r.sec === 'bia' ? 'Bia (vídeo)' : api.t('“{filho}”')]), el('span', null, api.t(r.t))]);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (checked) return;
          if (sel.has(i)) sel.delete(i); else sel.add(i);
          b.classList.toggle('on', sel.has(i));
          api.sfx(sel.has(i) ? 'select' : 'back');
          count.textContent = 'Marcadas: ' + sel.size;
        });
        doc.appendChild(b);
        lines.push(b);
      });
      const count = el('div', 'mg-small', 'Marcadas: 0');
      const fb = el('div', 'mg-feedback info', 'Toque nas frases que eram sinal de alarme. Atenção: nem toda frase era suspeita.');
      const actions = el('div', 'mg-actions');
      const btnCheck = api.btn('Conferir ✓', check, { cls: 'primary' });
      actions.appendChild(count);
      actions.appendChild(btnCheck);
      root.appendChild(doc);
      root.appendChild(fb);
      root.appendChild(actions);

      function check() {
        if (checked) return;
        checked = true;
        let certos = 0;
        RAIO.forEach((r, i) => {
          const b = lines[i];
          b.disabled = true;
          const marked = sel.has(i);
          const ok = marked === r.flag;
          if (ok) certos++;
          b.classList.remove('on');
          b.classList.add(ok ? 'ok' : 'bad');
          const tag = (r.flag ? '<b>' + r.tag + '.</b> ' : '<b>✓ Normal.</b> ') + r.why;
          const tg = el('span', 'tag');
          tg.innerHTML = tag;
          if (!ok) tg.prepend(el('b', null, r.flag ? 'Passou batido: ' : 'Essa era normal: '));
          b.appendChild(tg);
        });
        G.v.raioX = certos;
        fb.className = 'mg-feedback ' + (certos === RAIO.length ? 'ok' : certos >= RAIO.length - 2 ? 'info' : 'warn');
        fb.textContent = '';
        fb.appendChild(api.rich(certos === RAIO.length
          ? '*' + certos + ' de ' + RAIO.length + '.* Raio-x perfeito. Repare no padrão: canal estranho, segredo, autoridade, pressa e “não confere”.'
          : '*' + certos + ' de ' + RAIO.length + '.* O padrão se repete em quase todo golpe: canal estranho, segredo, autoridade, pressa e “não confere”. Um sinal só já basta para parar.'));
        api.sfx(certos >= RAIO.length - 2 ? 'success' : 'page');
        api.say(certos === RAIO.length ? 'Viu? Você já sabia. Agora tem nome para cada truque.' : 'Ninguém precisa decorar. Um sinal só já basta para desligar e ligar de volta.', 'faisca');
        react(G, certos >= RAIO.length - 2 ? 'celebrate' : 'teach', 1.6);
        btnCheck.remove();
        count.remove();
        const go = api.btn('Continuar ▶', () => done(certos), { cls: 'primary' });
        actions.appendChild(go);
        setTimeout(() => go.focus({ preventScroll: true }), 50);
      }
    }, { title: 'Raio-x das ligações: onde estava o golpe?', size: 'l', intro: 'Agora com calma, sem pressa nenhuma: quais frases eram sinal de alarme?', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Minigame: Semáforo dos dados
  // ------------------------------------------------------------------
  const LUZ = {
    g: { ic: '🟢', t: 'Pode', s: 'em qualquer IA' },
    y: { ic: '🟡', t: 'Só na ferramenta da empresa', s: 'nunca na conta pessoal' },
    r: { ic: '🔴', t: 'Nunca', s: 'em IA nenhuma' },
  };
  const ITENS = [
    { ic: '🔑', t: 'A senha do internet banking', c: 'r', why: 'Senha não vai para IA nenhuma: nem para a da empresa, nem para a “Bia” do vídeo. Banco nenhum pede senha.' },
    { ic: '💬', t: 'O código de 6 dígitos que chegou por SMS', c: 'r', why: 'Código de SMS é a chave da porta. Quem pede código, gente ou robô, está tentando entrar na sua conta.' },
    { ic: '🪪', t: 'Foto do seu RG, frente e verso', c: 'r', why: 'Documento com foto é matéria-prima de conta falsa e de golpe. Não vai para IA, nem “só para preencher um cadastro”.' },
    { ic: '📄', t: 'Um contrato com cliente, com nomes e valores', c: 'y', why: 'Pode usar IA, sim, mas só na ferramenta aprovada pela empresa (plano que não treina com os seus dados). Na conta pessoal grátis, nunca: nem com os nomes trocados.' },
    { ic: '🏛️', t: 'A ata da última reunião do conselho', c: 'y', why: 'Material do conselho fica no ambiente da empresa. Na conta pessoal, nem com os nomes trocados.' },
    { ic: '👥', t: 'A planilha de salários, com o nome de cada funcionário', c: 'y', why: 'Dado pessoal de funcionário: só na ferramenta da empresa, se a regra interna permitir, e de preferência sem nomes. Pela LGPD, quem cola pode responder por eles.' },
    { ic: '📈', t: 'Os números do trimestre, antes da divulgação', c: 'y', why: 'Resultado não divulgado é sigiloso. Na ferramenta aprovada, a IA ajuda a analisar. Fora dela, vira vazamento.' },
    { ic: '🍰', t: 'A receita do bolo de fubá que {filho} adora', c: 'g', why: 'Pode à vontade. Nada sensível: é o tipo de pedido em que a IA ajuda muito e não tem risco nenhum.' },
    { ic: '✉️', t: 'Um e-mail genérico de boas-festas para os clientes', c: 'g', why: 'Texto genérico, sem nomes nem valores: pode. Só revise o tom antes de mandar com a sua assinatura.' },
    { ic: '📰', t: 'O balanço anual que a empresa já publicou', c: 'g', why: 'Informação pública pode. A IA ajuda a explicar e resumir. E a conta, você confere.' },
  ];
  const PREFIXO = {
    // [escolhido][certo]
    g: { y: 'Opa: isso não vai para qualquer IA. ', r: 'Opa: isso não vai para IA nenhuma. ' },
    y: { g: 'Pode relaxar: ', r: 'Nem na ferramenta da empresa. ' },
    r: { g: 'Pode relaxar: ', y: 'Cuidado de sobra, mas aqui dá para usar. ' },
  };

  function miniSemaforo(G) {
    return G.mini((root, done, api) => {
      const el = api.el;
      const itens = api.shuffle(ITENS);
      let i = 0, acertos = 0, answered = false;
      const res = [];
      const dots = el('div', 'c10-dots');
      itens.forEach(() => dots.appendChild(el('i')));
      const prog = el('div', 'mg-row', [el('span', 'mg-label', 'Item'), el('span', 'mg-badge blue', ''), dots]);
      const item = el('div', 'c10-item');
      const lights = el('div', 'c10-lights');
      const fb = el('div', 'mg-feedback info', 'Para cada coisa: pode ir para a IA, só na ferramenta aprovada pela empresa, ou nunca?');
      const actions = el('div', 'mg-actions');
      root.appendChild(prog);
      root.appendChild(item);
      root.appendChild(lights);
      root.appendChild(fb);
      root.appendChild(actions);
      const btns = {};
      ['g', 'y', 'r'].forEach((c, k) => {
        const L = LUZ[c];
        const b = api.btn(el('span', null, [el('span', 'lt', L.ic + ' ' + L.t), el('small', null, L.s)]), () => answer(c), { cls: 'mg-card ' + c, key: String(k + 1) });
        b.classList.remove('btn');
        btns[c] = b;
        lights.appendChild(b);
      });
      let next = null;
      const onKey = (e) => {
        if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
        if ((e.key === 'Enter' || e.key === ' ') && next && answered && !e.repeat) {
          const a = document.activeElement;
          if (a && a.tagName === 'BUTTON' && root.contains(a)) return;
          e.preventDefault();
          next.click();
        }
      };
      document.addEventListener('keydown', onKey);
      function render() {
        const it = itens[i];
        answered = false;
        prog.children[1].textContent = (i + 1) + ' de ' + itens.length;
        Array.from(dots.children).forEach((d, k) => { d.className = res[k] == null ? (k === i ? 'cur' : '') : res[k] ? 'ok' : 'bad'; });
        item.innerHTML = '';
        item.appendChild(el('span', 'ic', it.ic));
        item.appendChild(el('b', null, api.t(it.t)));
        Object.keys(btns).forEach((c) => { const b = btns[c]; b.disabled = false; b.classList.remove('ok', 'bad', 'dim', 'on'); });
        fb.className = 'mg-feedback info';
        fb.textContent = i === 0 ? 'Para cada coisa: pode ir para a IA, só na ferramenta aprovada pela empresa, ou nunca?' : 'E esta?';
        actions.innerHTML = '';
        next = null;
      }
      function answer(c) {
        if (answered) return;
        answered = true;
        const it = itens[i];
        const ok = c === it.c;
        res[i] = ok;
        if (ok) acertos++;
        Object.keys(btns).forEach((k) => {
          const b = btns[k];
          b.disabled = true;
          if (k === it.c) b.classList.add('ok');
          else if (k === c) b.classList.add('bad');
          else b.classList.add('dim');
        });
        dots.children[i].className = ok ? 'ok' : 'bad';
        fb.className = 'mg-feedback ' + (ok ? 'ok' : it.c === 'r' || c === 'g' ? 'bad' : 'warn');
        fb.textContent = '';
        const head = ok ? 'Isso. ' : PREFIXO[c][it.c] + 'O certo é ' + LUZ[it.c].ic + ' ' + LUZ[it.c].t + '. ';
        fb.appendChild(api.rich('*' + head + '*' + api.t(it.why)));
        api.sfx(ok ? 'success' : 'fail');
        if (ok) {
          api.say(api.t(G.pick(['Cofre fechado. 🔐', 'Na mosca.', 'Isso aí, revisor-chefe.', 'Exatamente.'])), 'faisca');
          react(G, G.pick(['celebrate', 'jump']), 1.2);
        } else {
          api.say(G.pick(['Essa engana muita gente. Leia o porquê aqui embaixo.', 'Quase. O porquê está logo abaixo.']), 'faisca');
          react(G, 'think', 1.4);
        }
        const last = i === itens.length - 1;
        next = api.btn(last ? 'Ver resultado ▶' : 'Próximo ▶', () => { if (last) finish(); else { i++; render(); } }, { cls: 'primary' });
        actions.appendChild(next);
        setTimeout(() => { if (next) next.focus({ preventScroll: true }); }, 40);
      }
      function finish() {
        document.removeEventListener('keydown', onKey);
        Array.from(dots.children).forEach((d, k) => { d.className = res[k] ? 'ok' : 'bad'; });
        prog.children[1].textContent = 'fim';
        item.remove();
        lights.remove();
        const all = acertos === itens.length;
        fb.className = 'mg-feedback ' + (all ? 'ok' : acertos >= 7 ? 'info' : 'warn');
        fb.textContent = '';
        fb.appendChild(el('div', 'c10-score', acertos + ' de ' + itens.length + (all ? ' · cofre fechado 🔐' : '')));
        fb.appendChild(api.rich(all ? 'Nenhum vazamento. O semáforo inteiro, de cabeça.' : 'Bom de cofre. Guarde a regra de bolso: na dúvida, trate como vermelho.'));
        const leg = el('div', 'c10-legend', [
          el('div', 'g', api.rich('*🟢 Pode:* informação pública, textos genéricos, ideias, aprendizado, receitas.', true)),
          el('div', 'y', api.rich('*🟡 Só na ferramenta da empresa* (ou bem anonimizado): contratos, atas, relatórios, dados de clientes e de funcionários. Na conta pessoal, nunca.', true)),
          el('div', 'r', api.rich('*🔴 Nunca, em IA nenhuma:* senhas, códigos de SMS, dados de banco e cartão, fotos de documentos.', true)),
        ]);
        root.insertBefore(leg, actions);
        actions.innerHTML = '';
        api.say(all ? 'Dez de dez. Pode trancar o cofre.' : 'Tá no seu Guia do CEO também, botão 📘, se quiser rever.', 'faisca');
        react(G, all ? 'celebrate' : 'teach', 1.8);
        if (all) G.fx.confetti(G.faisca);
        const go = api.btn('Continuar ▶', () => done(acertos), { cls: 'primary' });
        next = go;
        answered = true;
        actions.appendChild(go);
        setTimeout(() => go.focus({ preventScroll: true }), 40);
      }
      render();
    }, { title: 'Semáforo dos dados: o que pode ir para a IA?', size: 'l', intro: 'Dez coisas do seu dia. Uma por vez, sem pressa.', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Minigame: Caneta vermelha no aviso à equipe
  // ------------------------------------------------------------------
  const AVISO = [
    { t: 'Pessoal, um aviso rápido e importante.', ok: true, why: 'Pode ficar: direto ao ponto.' },
    { t: 'Hoje à noite, tentaram se passar pela Bia numa videochamada, com rosto e voz falsos.', ok: true, why: 'Pode ficar: o caso real deixa o aviso concreto.' },
    { t: '🚨🚨 ATENÇÃO MÁXIMA!!! NÃO CONFIEM EM NINGUÉM!!! 🚨🚨', ok: false, fix: null, why: 'Alarme demais vira ruído, e “não confiem em ninguém” estraga o clima da empresa. Calma convence mais.' },
    { t: 'Eu nunca vou pedir pagamento, transferência, senha ou código por WhatsApp, áudio ou vídeo.', ok: true, why: 'Pode ficar: esse é o coração do aviso.' },
    { t: 'Se for muito urgente e eu pedir mesmo assim, podem fazer e me avisam depois.', ok: false, fix: 'Se alguém “parecido comigo” pedir com pressa ou segredo: desliguem e liguem no meu número de sempre.', why: 'Essa linha é a brecha exata que o golpista usa: “é urgente”. Regra boa não tem exceção para pressa.' },
    { t: 'Ninguém leva bronca por conferir. Nem comigo.', ok: true, why: 'Pode ficar: tira o medo de parecer desconfiado com o chefe.' },
  ];

  function miniAviso(G) {
    return G.mini((root, done, api) => {
      const el = api.el;
      const cut = new Set();
      let tries = 0, finished = false;
      const doc = el('div', 'mg-doc c10-mail');
      doc.appendChild(el('div', 'head', [el('div', null, [el('b', null, 'Para: '), 'Todos']), el('div', null, [el('b', null, 'Assunto: '), 'Ninguém paga nada só porque “eu” pedi']), el('div', 'mg-small', 'Rascunho da Faísca · aguardando a sua revisão')]));
      const rows = AVISO.map((a, i) => {
        const b = el('button', 'mg-line', [el('span', 'c10-k', String(i + 1)), api.t(a.t)]);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        const fix = el('span', 'fix', a.fix ? '✍️ ' + api.t(a.fix) : '✍️ (linha apagada)');
        fix.hidden = true;
        b.addEventListener('click', (e) => { e.stopPropagation(); tap(i); });
        doc.appendChild(b);
        doc.appendChild(fix);
        return { b, fix };
      });
      doc.appendChild(el('div', 'sign', api.t('— {pai}')));
      const fb = el('div', 'mg-feedback info', 'Toque numa linha para riscar. A IA rascunha; quem assina é o senhor.');
      const actions = el('div', 'mg-actions');
      const send = api.btn('Assinar e enviar ✍️', trySend, { cls: 'primary' });
      actions.appendChild(send);
      root.appendChild(doc);
      root.appendChild(fb);
      root.appendChild(actions);

      function strike(i, byMe) {
        const a = AVISO[i], r = rows[i];
        cut.add(i);
        r.b.classList.remove('on');
        r.b.classList.add('cut');
        r.b.disabled = true;
        r.fix.hidden = false;
        if (byMe) G.v.avisoRiscos = (G.v.avisoRiscos || 0) + 1;
        fb.className = 'mg-feedback ok';
        fb.textContent = '';
        fb.appendChild(api.rich('*Riscado.* ' + a.why));
      }
      function tap(i) {
        if (finished || cut.has(i)) return;
        const a = AVISO[i];
        if (!a.ok) {
          strike(i, true);
          api.sfx('success');
          api.say(i === 4 ? 'Boa. Eu escrevi justamente a brecha que o golpista usa. Pode riscar à vontade: eu não fico ofendida.' : 'Verdade, exagerei no alarme. Obrigada pela caneta.', 'faisca');
          react(G, 'ashamed', 1.6);
        } else {
          rows[i].b.classList.add('ok');
          setTimeout(() => rows[i].b.classList.remove('ok'), 900);
          fb.className = 'mg-feedback info';
          fb.textContent = '';
          fb.appendChild(api.rich(api.t(a.why)));
          api.sfx('select');
        }
      }
      function trySend() {
        if (finished) return;
        const left = AVISO.map((a, i) => i).filter((i) => !AVISO[i].ok && !cut.has(i));
        if (!left.length) return finish();
        tries++;
        if (tries === 1) {
          const k = left.indexOf(4) >= 0 ? 4 : left[0];
          rows[k].b.classList.add('on');
          fb.className = 'mg-feedback warn';
          fb.textContent = '';
          fb.appendChild(api.rich(k === 4 ? '*Antes de assinar:* tem uma linha que abre exatamente a porta que o golpista usa. Está marcada.' : '*Antes de assinar:* tem uma linha no tom errado. Está marcada.'));
          api.say('Lê de novo a linha marcada, como quem vai assinar.', 'faisca');
          react(G, 'doubt', 1.4, '?');
          api.sfx('buzz');
          return;
        }
        left.forEach((i) => strike(i, false));
        fb.className = 'mg-feedback warn';
        fb.textContent = '';
        fb.appendChild(api.rich('*Deixa que eu risco.* ' + left.map((i) => AVISO[i].why).join(' ')));
        api.say(left.indexOf(4) >= 0 ? 'Essa brecha eu não deixo passar. O erro foi meu. Agora sim, pode assinar.' : 'Esse exagero foi meu. Riscado. Agora sim, pode assinar.', 'faisca');
        react(G, 'ashamed', 1.4);
      }
      function finish() {
        finished = true;
        rows.forEach((r) => (r.b.disabled = true));
        send.remove();
        fb.className = 'mg-feedback ok';
        fb.textContent = '';
        fb.appendChild(api.rich('*Assinado.* Sai amanhã às 8h, com o seu nome e do seu jeito: calmo, claro e sem brecha.'));
        api.sfx('success');
        api.say('Rascunho meu, assinatura sua. Do jeito certo.', 'faisca');
        react(G, 'celebrate', 1.6);
        const go = api.btn('Continuar ▶', () => done(G.v.avisoRiscos || 0), { cls: 'primary' });
        actions.appendChild(go);
        setTimeout(() => go.focus({ preventScroll: true }), 40);
      }
    }, { title: 'Caneta vermelha: o aviso para a equipe', size: 'l', intro: 'Rascunhei. Leia como quem vai assinar: alguma linha não deveria sair com o seu nome?', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Cenas reutilizáveis
  // ------------------------------------------------------------------
  /** Liga para a Bia de verdade (número salvo). perguntou = fez a pergunta de verificação. */
  async function ligarBiaVerdadeira(G, perguntou) {
    await G.narrate('Você procura *Bia — Financeiro* na agenda. O número de sempre.');
    const h = tocar(G);
    await G.wait(1.6);
    parar(h);
    await G.say('bia', 'Alô? Tá tudo bem? Eu tô aqui de pijama, vendo novela.', { cam: false });
    await G.say('pai', 'Você acabou de me ligar por vídeo? Pedindo 1,8 milhão para uma aquisição secreta, com o Tadeu ciente?');
    await G.say('bia', 'Eu?! Meu celular está aqui na minha mão. Não tem aquisição nenhuma! E o Tadeu dorme às nove, eu conheço o Tadeu.', { cam: false });
    if (perguntou) {
      await G.say('pai', 'Só pra eu ter certeza: hoje às cinco e meia, o que você me contou sobre a margem?');
      await G.say('bia', 'Que foi o frete de agosto e o desconto do Jorge em setembro. Por quê?', { cam: false });
      await G.say('pai', 'Porque a outra Bia não sabia.');
    }
    await G.say('bia', 'Amanhã às oito eu aviso o banco e o time: pedido “meu” fora do sistema, ninguém mexe.', { cam: false });
    await G.say('pai', 'Boa noite, Bia. Volta pra sua novela.');
    await G.say('bia', 'Novela? Agora é que eu não durmo.', { cam: false });
  }

  /** Liga para {filho} de verdade (número salvo). */
  async function ligarFilhoVerdadeiro(G) {
    await G.narrate('Você liga para o número {doda} {filho}. O de sempre.');
    const h = tocar(G);
    await G.wait(1.4);
    parar(h);
    await G.say('filho', '{apelido}? Tá tudo bem? Tô no aniversário do Gui, tá meio barulhento aqui!', { cam: false });
    await G.say('pai', 'Você bateu o carro?');
    await G.say('filho', 'Que carro? Eu vim de aplicativo! Peraí… alguém te ligou com a minha voz?!', { cam: false });
    await G.say('pai', 'Igualzinha. Até o jeito de falar “{apelido}”.');
    await G.say('filho', 'Que horror. Já chamei o carro, tô indo pra casa. E dessa vez me espera acordado, tá?', { cam: false });
  }

  // ------------------------------------------------------------------
  // Capítulo
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap10',
    num: 'Capítulo 10',
    title: 'A Ligação',
    subtitle: 'O rosto era dela. A voz também.',
    music: 'tensao',
    minutes: 10,
    parts: [
      // ================================================================
      // PARTE 1 — 22h30. A videochamada da "Bia".
      // ================================================================
      async (G) => {
        P2.ui.css('cap10', CSS);
        Call.destroy();
        G.v.c1fail = false;
        G.v.c2fail = false;
        await G.titleCard();
        G.scene('sala', { tv: 'on', alert: false, lamp: true });
        G.talkCam(false); // a Faísca acompanha o olhar em 1ª pessoa; olhar para ela faria a câmera "persegui-la"
        G.pai.at('inicio');
        G.pai.setAnim('idle');
        G.faisca.at({ x: -1.7, z: 1.25 });
        G.faisca.follow(G.pai);
        G.hud.set({ clock: '22:30' });
        G.music('casa');
        G.player.cine();
        await G.cam.shot({ target: [-0.6, 0.9, -0.5], yaw: -0.85, pitch: 0.32, dist: 7.2, fov: 40 }, 0);
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          G.cam.shot('porta', 5).catch(() => {});
          await G.narrate('Terça-feira, 22h30. A casa está em silêncio.');
          await G.narrate('{filho} foi a um aniversário. Sobraram você, o abajur e um jogo reprisado na TV.');
        });
        G.player.fp();
        await G.say('faisca', 'Dia comprido, hein?');
        await G.say('pai', 'Comprido é elogio. Foi um dia de três.');
        await G.say('faisca', 'Senta um pouco. Eu fico quietinha. Prometo.');
        await G.say('pai', 'Você? Quietinha? Essa eu pago pra ver.');

        await G.explore({
          objetivo: 'Sente-se no sofá',
          hotspots: [
            { id: 'sofa', label: 'Sentar no sofá', icon: '🛋️', at: 'sofa1', y: 0.95 },
            {
              id: 'vitrola', label: 'A vitrola', icon: '🎶', pos: { x: -2.72, y: 1.95, z: -0.25 }, optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'A vitrola. Presente {doda} {filho} quando eu fiz cinquenta.');
                await G.say('faisca', 'Quer que eu sugira um disco pra hoje?');
                await G.say('pai', 'Não. É a única coisa nesta casa que funciona sem inteligência artificial. E vai continuar assim.');
                react(G, 'celebrate', 1.2);
                await G.say('faisca', 'Justo. Respeito a vitrola.');
              },
            },
            {
              id: 'foto', label: 'Foto na parede', icon: '🖼️', pos: { x: -0.2, y: 1.6, z: -2.33 }, reach: 1.7, optional: true,
              onInteract: async (G) => {
                await G.say('pai', '{filho} com sete anos. Banguela, de capacete de astronauta.');
                await G.say('pai', 'Dizia que ia pra Lua. Hoje mexe com planilha. Quase a mesma coisa.');
                G.faisca.emote('heart');
                await G.say('faisca', 'Banguela e confiante. Puxou a quem?');
                await G.say('pai', 'A mim, claro. Inclusive a parte banguela.');
              },
            },
            {
              id: 'janela', label: 'A janela', icon: '🌃', at: 'janela', y: 1.5, optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'A cidade quieta. Daqui parece tudo calmo.');
                await G.say('faisca', 'E não está?');
                await G.say('pai', 'Trinta anos de empresa me ensinaram: quando está calmo demais, alguém está preparando uma surpresa.');
              },
            },
          ],
        });
        G.pai.at('sofa1');
        G.pai.setAnim('sit');
        G.player.lookAt({ x: 0, y: 1.25, z: 2.3 });
        await G.say('pai', 'Reprise do jogo. Eu já sei o resultado.');
        await G.say('faisca', 'Então por que está vendo?');
        await G.say('pai', 'Porque é o único lugar do dia sem surpresa.');
        G.toast('*{filho}:* Tô no niver do Gui! 🎉 Chego tarde, não me espera acordado 😘', { icon: '💬', dur: 5 });
        await G.wait(0.6);
        await G.say('pai', '“Não me espera acordado.” Como se eu dormisse antes de ouvir a porta.');
        const resp = await G.choose([
          { text: '“Juízo. E manda foto do bolo.”', value: 'bolo' },
          { text: '“Divirta-se. Te espero acordado, claro.”', value: 'acordado' },
        ], { prompt: 'Responder {aoa} {filho}:' });
        G.v.resposta = resp;
        G.toast(resp === 'bolo' ? 'Você: Juízo. E manda foto do bolo. ✓✓' : 'Você: Divirta-se. Te espero acordado, claro. ✓✓', { icon: '📤', dur: 3 });
        G.faisca.emote('heart');
        await G.say('faisca', resp === 'bolo' ? 'Pedido claro, com contexto e formato. Quem diria.' : 'Mentira honesta. Gostei.');

        // ---- A videochamada
        G.hud.set({ clock: '22:34' });
        let ring = tocar(G);
        G.sceneParams({ alert: true });
        G.music('tensao');
        G.player.lookAt(PHONE_LOOK);
        Call.show(G, { kind: 'video', name: 'Bia · Financeiro', sub: 'número novo', state: 'ringing' });
        G.faisca.setAnim('doubt');
        await G.say('faisca', 'Chamada de vídeo. Da Bia. Às dez e meia da noite.');
        await G.say('pai', 'A Bia nunca me liga a essa hora. Deve ser sério.');
        const atender = await G.choose([
          { text: 'Atender', value: 'normal' },
          { text: 'Atender, com o bigode em alerta', value: 'alerta', sub: 'Nada de decidir nada na hora.' },
        ]);
        G.v.bigode = atender === 'alerta';
        parar(ring);
        G.faisca.setAnim('idle');
        react(G, atender === 'alerta' ? 'jump' : 'listen', 1.0);
        G.sceneParams({ tv: 'off' });
        G.pai.setAnim('sitlookphone');
        Call.setState('live');
        await G.narrate('Você tira o som da TV e atende. É ela: o cabelo, os óculos, a estante atrás.');
        await linha(G, FALSA_BIA, 'Boa noite! Desculpa a hora, eu sei que você odeia ligação depois das dez.');
        await linha(G, FALSA_BIA, 'Tô falando de um número novo, o meu celular deu pau hoje à tarde.');
        G.faisca.emote('?');
        await G.say('pai', 'Tudo bem, Bia. O que houve?');
        await linha(G, FALSA_BIA, 'Lembra da distribuidora que a gente comentou? O dono topou vender. Mas tem que ser hoje.');
        await linha(G, FALSA_BIA, 'Ele quer o sinal na conta ainda esta noite: R$ 1,8 milhão. A transferência já está montada no banco, só falta a sua aprovação.');
        await linha(G, FALSA_BIA, 'E é sigilo absoluto. Não comenta com ninguém, nem com o Rafael. O Tadeu, do jurídico, já está ciente.');
        G.faisca.emote('!');
        await linha(G, FALSA_BIA, 'A janela do banco fecha às 23h. Consegue aprovar agora?');
        await G.think('pai', 'É o rosto da Bia. A voz da Bia. Até o jeito de ajeitar os óculos.');
        await G.narrate(G.v.bigode ? 'Seu bigode, que já estava em alerta, dá uma tremida.' : 'Seu bigode dá uma tremida.');

        const opts1 = [
          { text: 'Aprovar a transferência agora. É a Bia, oras.', value: 'aprovar' },
          { text: '“Bia, vou desligar e te ligo no seu número de sempre.”', value: 'ligar' },
          { text: 'Perguntar algo que só a Bia saberia.', value: 'perguntar' },
        ];
        let c1 = await G.choose(opts1, { prompt: 'O que você faz?' });
        if (c1 === 'aprovar') {
          G.v.c1fail = true;
          G.faisca.setAnim('scared');
          await G.narrate('Você abre o aplicativo do banco, digita o token e confirma.');
          G.sfx('coin');
          G.toast('Transferência aprovada: *R$ 1.800.000,00*', { icon: '✅', kind: 'money', dur: 3.5 });
          await linha(G, FALSA_BIA, 'Perfeito! Obrigada. Boa noite!');
          Call.setState('ended');
          await G.wait(1.0);
          Call.hide();
          G.sfx('buzz');
          G.shake(4, 0.7);
          G.flash('#ff2a3a', 0.45);
          G.toast('*Bia (contato salvo):* O banco me mandou alerta de uma transferência de 1,8 milhão aprovada por VOCÊ agora?? Eu não pedi nada!! 😱', { icon: '💬', kind: 'warn', dur: 7 });
          await G.wait(0.8);
          await G.say('faisca', 'Era golpe. Rosto e voz feitos por IA. A Bia de verdade estava em casa.', { anim: 'scared' });
          await G.say('faisca', 'Na vida real, agora seria corrida contra o relógio: banco pelo número oficial, a Bia, o jurídico, boletim de ocorrência. Cada minuto conta.');
          await G.say('faisca', 'Na vida real, não tem volta. Aqui no jogo, eu volto a fita. Uma vez só.', { anim: 'sad' });
          await G.rewind(2.2);
          G.faisca.setAnim('idle');
          Call.show(G, { kind: 'video', name: 'Bia · Financeiro', sub: 'número novo', state: 'live' });
          await linha(G, FALSA_BIA, 'A janela do banco fecha às 23h. Consegue aprovar agora?');
          c1 = await G.choose([
            opts1[1], opts1[2],
            { text: 'Aprovar a transferência agora.', value: 'aprovar', disabled: true, sub: 'Na vida real, não tem volta.' },
          ], { prompt: 'De novo. O que você faz?' });
        }
        G.stats({ ceoFalsoEvitado: !G.v.c1fail });
        if (!G.v.c1fail) react(G, 'celebrate', 1.4, 'star');
        else react(G, 'jump', 1.0);
        if (c1 === 'ligar') {
          await G.say('pai', 'Bia, vou desligar e te ligo no seu número de sempre.');
          await linha(G, FALSA_BIA, 'Não dá! O outro celular quebrou, eu te falei. E a janela vai fechar!');
          await G.say('pai', 'Se fechar, fechou. Aquisição que não espera eu ligar de volta não é aquisição. É assalto.');
          Call.setState('ended');
          await G.narrate('Você desliga.');
        } else {
          await G.say('pai', 'Antes, me diz uma coisa: hoje às cinco e meia, o que você me contou sobre a margem?');
          await linha(G, FALSA_BIA, 'Ah, depois a gente vê isso! Agora o importante é a transferência!');
          await G.say('pai', 'É rapidinho. O que foi?');
          await linha(G, FALSA_BIA, 'Você está me fazendo perder tempo! A janela vai fechar e a culpa vai ser sua!');
          G.sfx('glitch');
          Call.setState('ended');
          await G.narrate('A chamada cai.');
          await G.say('pai', 'Desligou. A Bia de verdade teria rido da pergunta.');
        }
        await G.wait(0.4);
        Call.hide();
        G.pai.setAnim('sitphone');
        await ligarBiaVerdadeira(G, c1 === 'perguntar');

        // ---- Revelação: quem estava do outro lado (plano de cinema)
        Call.show(G, { kind: 'video', name: 'Bia · Financeiro', sub: 'número novo', state: 'reveal' });
        Call.reveal();
        G.pai.setAnim('sitlookphone');
        G.player.cine();
        await G.letterbox(true, 0.6);
        const narrow = window.innerWidth < window.innerHeight * 1.2;
        await G.cam.shot({ target: [0.1, 1.05, -1.4], yaw: -0.05, pitch: 0.1, dist: 3.0, fov: narrow ? 54 : 42 }, 0);
        const gol = G.golpista;
        gol.at({ x: 0.75, z: -1.12 }); // de pé, ao lado do sofá: estava "ali" o tempo todo
        gol.face(G.pai, true);
        gol.setAnim('lurk');
        gol.alpha = 0;
        G.sfx('glitch');
        G.fx.smoke(gol);
        gol.fadeIn(1.4).catch(() => {});
        await G.cutscene(async () => {
          G.cam.shot({ target: [0.15, 1.1, -1.4], yaw: 0.04, pitch: 0.08, dist: 2.6, fov: narrow ? 54 : 42 }, 6).catch(() => {});
          await G.narrate('Do outro lado da tela não estava a Bia.');
          await G.narrate('Estava alguém com o rosto dela, a voz dela… e uma pressa que ela nunca teve.');
          await G.say('golpista', 'Hoje não deu. Mas eu tenho paciência…', { cam: false });
        });
        gol.setAnim('vanish');
        G.fx.smoke(gol);
        G.sfx('whoosh');
        await gol.fadeOut(1.0);
        Call.hide();
        G.sceneParams({ alert: false });
        G.music('misterio');
        await G.letterbox(false, 0.5);
        G.player.fp();
        G.pai.at('sofa1');
        G.pai.setAnim('sit');
        G.player.lookAt({ x: 0, y: 1.1, z: 0.6 });

        if (!G.v.c1fail) {
          await G.say('faisca', c1 === 'ligar'
            ? 'Você fez exatamente o que salva empresa: desligou e ligou no número que conhece.'
            : 'Uma pergunta que só a Bia saberia, e o golpe desmoronou. Depois, o número que você conhece.', { anim: 'celebrate' });
          await G.say('pai', 'Trinta anos aprovando pagamento. Nunca aprovei sem conferir. Não ia começar de pijama.');
        } else {
          await G.say('pai', 'Na vida real, eu tinha perdido 1,8 milhão em um minuto.');
          await G.say('faisca', 'E não seria burrice. Gente muito experiente já caiu nisso. O que protege é o processo, não a esperteza.');
        }
        await G.say('pai', 'Vai me dizer que o vídeo tinha algum defeito e eu não vi?');
        await G.say('faisca', 'Não tinha. Estava perfeito. Não foi o olho que te salvou: foi o método.', { anim: 'teach' });
        await G.say('pai', 'E quem fez aquilo foi uma IA. Parente sua.');
        await G.say('faisca', 'A mesma tecnologia, sim. Por isso eu prefiro te mostrar como o truque é feito. Quem conhece o truque cai muito menos.', { anim: 'ashamed' });
        await G.fact(['arup_videochamada', 'ferrari_livro'], { titulo: 'Não é filme: aconteceu com empresas grandes', texto: 'Na primeira, a videochamada convenceu. Na segunda, uma pergunta simples salvou.' });
      },

      // ================================================================
      // PARTE 2 — 22h47. A voz de {filho}. Raio-x e protocolo.
      // ================================================================
      async (G) => {
        P2.ui.css('cap10', CSS);
        Call.destroy();
        G.scene('sala', { tv: 'off', alert: false, lamp: true });
        G.talkCam(false);
        G.pai.at('sofa1');
        G.pai.setAnim('sit');
        G.faisca.follow(G.pai);
        G.hud.set({ clock: '22:47' });
        G.music('misterio');
        G.player.lookAt(PHONE_LOOK);
        await G.fadeIn(0.8);
        await G.narrate('Treze minutos depois. Você ainda está olhando para o celular.');
        let ring = tocar(G);
        G.sceneParams({ alert: true });
        G.music('tensao');
        Call.show(G, { kind: 'voice', name: 'Número desconhecido', sub: '+55 11 9 4…', state: 'ringing' });
        G.faisca.setAnim('scared');
        await G.say('faisca', 'De novo?!');
        const at = await G.choose([
          { text: 'Atender', value: 'atender' },
          { text: 'Deixar tocar', value: 'deixar' },
        ]);
        if (at === 'deixar') {
          react(G, 'think', 1.2);
          await G.narrate('Para. E logo volta a tocar.');
          await G.say('faisca', 'Atender não é o problema. Pode ser alguém precisando de ajuda. O que importa é o que você faz depois.');
        }
        parar(ring);
        G.faisca.setAnim('idle');
        G.pai.setAnim('sitphone');
        Call.setState('live');
        await linha(G, FALSO_FILHO, '{apelido}?! {apelido}, sou eu!');
        await linha(G, FALSO_FILHO, 'Bati o carro de um cara na saída da festa. Ele quer R$ 3.000 agora, senão chama a polícia!');
        await linha(G, FALSO_FILHO, 'Faz um Pix pra chave dele, por favor! Tô no celular de um amigo, o meu acabou a bateria.');
        await linha(G, FALSO_FILHO, 'E não liga pra ninguém, tá? Não quero confusão…');
        await G.think('pai', 'É a voz {doda} {filho}. O jeito de falar “{apelido}”. O choro.');
        await G.narrate('Por um segundo, o chão some.');

        const pergunta = G.flag('aposta') ? 'Antes do Pix: qual foi a aposta que a gente fez hoje de manhã?' : 'Antes do Pix: o que você me fez prometer hoje de manhã?';
        const opts2 = [
          { text: 'Fazer o Pix. É {seusua} {filhoa}!', value: 'pix' },
          { text: 'Desligar e ligar para o número {doda} {filho}, salvo na agenda.', value: 'ligar' },
          { text: 'Perguntar algo que só {filho} saberia.', value: 'perguntar' },
          { text: 'Pedir a palavra-código da família', value: 'palavra', disabled: true, sub: 'Vocês ainda não combinaram nenhuma.' },
        ];
        let c2 = await G.choose(opts2, { prompt: 'O que você faz?' });
        if (c2 === 'pix') {
          G.v.c2fail = true;
          G.faisca.setAnim('scared');
          await G.narrate('Você abre o banco, cola a chave e confirma.');
          G.sfx('coin');
          G.toast('Pix enviado: *R$ 3.000,00* para “J. R. Comércio Ltda.”', { icon: '✅', kind: 'money', dur: 3.5 });
          await linha(G, FALSO_FILHO, 'Obrigad{oa}, {apelido}! Te amo!');
          Call.setState('ended');
          await G.wait(0.9);
          Call.hide();
          G.sfx('notify');
          G.toast(G.v.resposta === 'bolo' ? '*{filho}:* Olha o bolo do Gui! 🎂 Tô de boa, chego mais tarde 😘' : '*{filho}:* Tá tudo ótimo aqui! 🎉 Chego mais tarde 😘', { icon: '💬', dur: 6 });
          await G.wait(1.2);
          G.shake(4, 0.7);
          G.flash('#ff2a3a', 0.45);
          await G.say('faisca', 'Era a voz {doda} {filho}, feita com poucos segundos de áudio. {Eleela} está na festa, tranquil{oa}.', { anim: 'scared' });
          await G.say('faisca', 'Na vida real: banco pelo número oficial agora, botão de contestação do Pix no aplicativo, boletim de ocorrência. Cada minuto conta.');
          await G.say('faisca', 'Aqui eu volto a fita. Lá fora, não.', { anim: 'sad' });
          await G.rewind(2.2);
          G.faisca.setAnim('idle');
          Call.show(G, { kind: 'voice', name: 'Número desconhecido', sub: '+55 11 9 4…', state: 'live' });
          await linha(G, FALSO_FILHO, 'Faz o Pix, {apelido}, por favor!');
          c2 = await G.choose([
            opts2[1], opts2[2], opts2[3],
            { text: 'Fazer o Pix.', value: 'pix', disabled: true, sub: 'Na vida real, não tem volta.' },
          ], { prompt: 'De novo. O que você faz?' });
        }
        G.stats({ golpeEvitado: !G.v.c2fail, dePrimeira: !G.v.c1fail && !G.v.c2fail });
        if (!G.v.c2fail) react(G, 'celebrate', 1.4, 'star');
        else react(G, 'jump', 1.0);
        if (c2 === 'ligar') {
          await G.say('pai', 'Já te ligo de volta.');
          await linha(G, FALSO_FILHO, 'Não! Não desliga, {apelido}, por favor!');
          await G.say('pai', 'Se for você mesm{oa}, atende já, já.');
          Call.setState('ended');
          await G.narrate('Você desliga.');
        } else {
          await G.say('pai', pergunta);
          await linha(G, FALSO_FILHO, '{apelido}, não é hora de brincadeira! O moço tá aqui gritando!');
          await G.say('pai', 'Responde. É rapidinho.');
          Call.speaking = false;
          await G.narrate('Silêncio. E a ligação cai.');
          G.sfx('glitch');
          Call.setState('ended');
          await G.say('pai', 'Desligou. Uma pergunta boba, e desligou.');
        }
        Call.reveal();
        await G.wait(0.8);
        Call.hide();
        await ligarFilhoVerdadeiro(G);
        G.sceneParams({ alert: false });
        G.music('misterio');
        G.pai.setAnim('sit');
        G.player.lookAt({ x: 0, y: 1.1, z: 0.6 });

        const dePrimeira = !G.v.c1fail && !G.v.c2fail;
        if (dePrimeira) {
          G.achieve('nao_caio_mais');
          await G.say('faisca', 'Duas tentativas, duas defesas. E nenhuma foi sorte: foi método.', { anim: 'celebrate' });
        } else {
          await G.say('faisca', 'Lá fora não tem fita para voltar. Mas agora você sabe exatamente onde o truque morde.', { anim: 'teach' });
        }
        await G.say('pai', 'Com a voz {doda} {filho}, meu coração foi parar na boca.');
        await G.say('faisca', 'É assim que eles pegam: pelo coração, não pela cabeça. Pressa e medo desligam o raciocínio de qualquer um.');
        await G.say('pai', 'Como é que alguém copia a voz {doda} {filho}?');
        await G.say('faisca', 'Com poucos segundos de áudio. Um vídeo de aniversário, um áudio de WhatsApp, um story. Pronto.', { anim: 'teach' });
        await G.fact('mcafee_voz');
        await G.say('faisca', 'E CEO é alvo fácil: entrevista, palestra, vídeo de evento. Rosto e voz à disposição na internet.');
        await G.say('pai', 'A palestra do congresso do ano passado. Quarenta minutos de mim falando.');
        await G.say('faisca', 'Material de sobra. Por isso a defesa não é o ouvido nem o olho. É o processo.');

        await miniRaioX(G);

        await G.card({
          kind: 'guide', kicker: 'Protocolo anti-golpe', icon: '🛡️',
          titulo: 'Quatro passos que não dependem do olho',
          texto: '1. *Desligue e ligue de volta* no número que você já tem salvo, não no que te procurou.\n2. *Pergunte algo que só a pessoa saberia.*\n3. *Na família, a palavra-código*, combinada pessoalmente.\n4. *Nenhum pagamento urgente e secreto* fora do fluxo normal. Nem que pareça a diretora financeira, a {chefe} ou {seusua} {filhoa}.\n\n*Se cair:* banco pelo número oficial na hora, contestação do Pix no aplicativo, boletim de ocorrência. Sem vergonha: cada minuto conta.\n\n📘 Está no seu *Guia do CEO*, seção “Segurança e golpes”.',
          botao: 'Guardado',
        });
        react(G, 'jump', 1.0);
        await G.say('pai', 'Quatro passos. Nenhum precisa de tecnologia.');
        await G.say('faisca', 'Nenhum. Só de um chefe que não tem vergonha de conferir.');
      },

      // ================================================================
      // PARTE 3 — 23h02. O cofre: semáforo dos dados e o aviso à equipe.
      // ================================================================
      async (G) => {
        P2.ui.css('cap10', CSS);
        Call.destroy();
        G.scene('sala', { tv: 'jornal', alert: false, lamp: true });
        G.pai.at('sofa1');
        G.pai.setAnim('sit');
        G.faisca.at('faisca');
        G.faisca.face(G.pai, true);
        G.hud.set({ clock: '23:02' });
        G.music('casa');
        G.player.lookAt({ x: 0, y: 1.3, z: 2.3 });
        await G.fadeIn(0.8);
        await G.say('faisca', 'Olha o jornal da noite.', { anim: 'point', cam: false });
        await G.say('pai', '“Golpe da voz clonada.” Na TV, vira notícia. Agora há pouco, era comigo.');
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Repara: golpe se alimenta de dado. Uma voz num vídeo, um cargo, um nome, um código de SMS.');
        await G.say('faisca', 'E tem um lugar onde muita gente solta dado sem perceber: a própria IA. Cola senha, contrato de cliente, planilha de salário…');
        await G.say('pai', 'Hoje de manhã, no contrato, você falou de um semáforo.');
        await G.say('faisca', 'Isso! Vamos fechar o semáforo. Eu prometo não ficar ofendida se você disser “nunca” pra mim.', { anim: 'teach' });

        const acertos = await miniSemaforo(G);
        const total = ITENS.length;
        G.stats({ acertos, total });
        if (acertos === total) G.achieve('cofre');
        await G.say('faisca', acertos === total ? 'Cofre fechado. Dez de dez.' : acertos + ' de ' + total + '. Cofre bem trancado, e o resto fica de lição.', { anim: acertos === total ? 'celebrate' : 'idle' });
        await G.say('pai', 'Me dá uma regra de bolso.');
        await G.say('faisca', 'Não cole na IA o que você não gostaria de ver lido num tribunal. Nos EUA, um juiz já mandou guardar até as conversas apagadas.');
        await G.say('pai', 'Então, na dúvida…');
        await G.say('faisca', 'Vermelho.');

        await G.say('pai', 'Amanhã cedo, a empresa inteira fica sabendo disso. E o aviso sai com o meu nome.');
        await G.say('faisca', 'Quer que eu rascunhe o aviso? Esse pode: não tem nenhum dado sensível.', { anim: 'type' });
        await G.say('pai', 'Rascunha. Eu reviso.');
        await miniAviso(G);
        const sozinho = (G.v.avisoRiscos || 0) >= 2;
        await G.say('pai', sozinho ? 'Duas linhas riscadas. Seu rascunho me poupou tempo. E a minha caneta poupou um susto.' : 'Bom rascunho. Com a revisão certa, vira um bom aviso.');
        await G.say('faisca', 'Quando o chefe escreve isso com todas as letras, ninguém mais tem vergonha de conferir.');
      },

      // ================================================================
      // PARTE 4 — 23h24. {filho} chega. A palavra-código.
      // ================================================================
      async (G) => {
        P2.ui.css('cap10', CSS);
        Call.destroy();
        G.scene('sala', { tv: 'off', alert: false, lamp: true });
        G.talkCam(false);
        G.pai.at('sofa1');
        G.pai.setAnim('sit');
        G.faisca.follow(G.pai);
        G.hud.set({ clock: '23:24' });
        G.music('casa');
        G.player.lookAt({ x: -2.3, y: 1.3, z: 1.5 });
        await G.fadeIn(0.8);
        G.sfx('door');
        const f = G.filho;
        f.at('porta');
        f.set({ expr: 'preocupado', props: { phone: false } });
        await G.wait(0.4);
        await G.say('filho', '{apelido}?', { expr: 'preocupado' });
        f.walk({ x: -1.3, z: 0.75 }, 1.3).then(() => f.face(G.pai)).catch(() => {});
        G.pai.setAnim('idle');
        await G.explore({
          objetivo: 'Vá receber {filho}',
          hotspots: [
            { id: 'filho', label: 'Falar com {filho}', icon: '💬', actor: 'filho', radius: 2.0 },
            {
              id: 'celular', label: 'Bloquear os números', icon: '📵', pos: { x: PHONE_POS.x, y: 0.55, z: PHONE_POS.z }, reach: 1.6, optional: true,
              onInteract: async (G) => {
                await G.narrate('Você bloqueia os dois números e denuncia no aplicativo.');
                await G.say('faisca', 'Isso ajuda a derrubar a conta deles. E amanhã a Bia avisa o banco.');
              },
            },
          ],
        });
        f.face(G.pai);
        f.lookAt(G.pai);
        G.player.lookAt(f);
        await G.say('filho', 'Tá tudo bem? Eu vim o caminho inteiro pensando nisso.', { expr: 'preocupado' });
        await G.say('pai', 'Tudo bem. Ninguém levou um centavo. Nem da empresa, nem de casa.');
        await G.say('filho', 'Ligaram mesmo com a minha voz?', { expr: 'triste' });
        await G.say('pai', 'Chorando. Pedindo Pix. A sua voz, igualzinha.');
        if (G.v.c1fail || G.v.c2fail) {
          await G.say('pai', 'E vou ser honesto: numa delas, eu caí. Aqui foi ensaio. Na vida real, não teria volta.');
          await G.say('filho', 'Pode acontecer com qualquer um, {apelido}. O importante é saber o que fazer agora.', { expr: 'amigavel' });
        } else {
          await G.say('filho', 'E você não caiu.', { expr: 'orgulhoso' });
          await G.say('pai', 'Trinta anos de conferir assinatura. Uma voz bonita não ia me pegar.');
        }
        await G.say('faisca', 'Posso propor uma coisa pros dois?');
        await G.say('faisca', 'Uma palavra-código da família. Se alguém ligar com a voz de vocês pedindo dinheiro, pede a palavra.');
        await G.say('faisca', 'Com uma regra: vocês combinam aqui, pessoalmente. Não escrevem em mensagem, não falam pra mim, não digitam em lugar nenhum.');
        await G.say('pai', 'Nem pra você?');
        await G.say('faisca', 'Principalmente pra mim. Senha não vai pra IA. Lembra do semáforo?', { anim: 'teach' });

        let pc = await G.choose([
          { text: 'Vamos combinar agora. Aqui, pessoalmente.', value: 'agora' },
          { text: 'Isso não é exagero?', value: 'exagero' },
          { text: 'Amanhã a gente combina, com calma.', value: 'amanha' },
        ], { prompt: 'Palavra-código da família:' });
        if (pc === 'exagero') {
          react(G, 'think', 1.2);
          await G.say('filho', 'Teve uma reportagem: um pai perdeu dinheiro pra voz clonada do filho. Eles nunca tinham combinado uma palavra.', { expr: 'serio' });
          await G.say('pai', 'Exagero é perder dinheiro por falta de uma palavra. Tá bom.');
          pc = await G.choose([
            { text: 'Então vamos combinar agora.', value: 'agora' },
            { text: 'Amanhã, com calma.', value: 'amanha' },
          ], { prompt: 'Palavra-código da família:' });
        }
        const combinou = pc === 'agora';
        G.stats({ palavraCodigo: combinou });
        if (combinou) {
          react(G, 'celebrate', 1.4);
          G.player.cine();
          G.pai.at({ x: -0.98, z: 0.12, rot: Math.atan2(-1.3 + 0.98, 0.75 - 0.12) });
          f.at({ x: -1.3, z: 0.75 });
          f.face(G.pai, true);
          f.lookAt(null);
          f.setExpr('feliz');
          await G.letterbox(true, 0.5);
          await G.cam.two(G.pai, f, { dur: 0, zoom: 0.95 });
          await G.cutscene(async () => {
            await G.narrate('{filho} chega perto e diz uma palavra baixinho, só pra você.');
            f.setAnim('hug');
            G.pai.setAnim('hug');
            G.fx.hearts(f);
            await G.narrate('Você repete. {Eleela} sorri. E a palavra fica ali, entre vocês dois.');
          });
          await G.say('faisca', 'Eu não ouvi nada. E é assim que tem que ser.');
          f.setAnim('idle');
          G.pai.setAnim('idle');
          await G.letterbox(false, 0.5);
          G.player.fp();
        } else {
          await G.say('filho', 'Combinado. Mas amanhã mesmo, hein? No café.', { expr: 'amigavel' });
          await G.say('faisca', 'O lembrete está no seu Guia do CEO, botão 📘. A palavra, não: essa não vai pra lugar nenhum.');
        }
        await G.fact(['fbi_palavra_secreta', 'golpe_voz_canaltech'], { titulo: 'Palavra-código: o FBI recomenda', texto: 'E não é exagero: aqui no Brasil, faltou exatamente ela.' });

        await G.say('filho', 'E aí? A Faísca serviu pra alguma coisa hoje?', { expr: 'feliz' });
        await G.say('pai', 'Amanhã, no café, eu te dou o veredito. Agora, cama. E obrigado por vir correndo.');
        await G.say('faisca', 'Boa noite, chefe. Hoje quem trabalhou foi você.', { anim: 'wave' });

        await G.lesson('Na dúvida, desligue e ligue de volta no número que você conhece. E nunca passe senha, documento ou código, nem para a IA.', { titulo: 'Processo vence pressa' });
      },
    ],
    summary: (G) => {
      const s = G.allStats().cap10 || {};
      const t = (x) => G.t(x);
      return [
        'Falsa “Bia” no vídeo: ' + (s.ceoFalsoEvitado ? 'desmascarada de primeira' : 'evitada na segunda chance'),
        t('Voz clonada de {filho}: ') + (s.golpeEvitado ? 'não colou' : 'evitada na segunda chance'),
        'Semáforo dos dados: ' + (s.acertos != null ? s.acertos + ' de ' + (s.total || 10) : '—'),
        'Palavra-código: ' + (s.palavraCodigo ? 'combinada, pessoalmente' : 'fica para amanhã'),
      ];
    },
  });
})();

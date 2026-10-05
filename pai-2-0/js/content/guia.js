/* PAI 2.0 — guia.js
 * GUIA DO CEO: o "manual de bolso" com os melhores jeitos de usar IA no
 * trabalho e na vida. Abre pelo botão 📘 (a qualquer momento) e pelo menu.
 * Cada seção libera quando o capítulo correspondente é concluído (dá para
 * ver tudo mesmo assim). Prompts prontos com botão "Copiar".
 *
 * O CONTEÚDO fica em P2.GUIA_DADOS (abaixo, em GUIA_DADOS). Tokens como
 * {empresaPrompt} e {setorPrompt} são trocados pelos dados da preparação.
 */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});

  // ------------------------------------------------------------------
  // Conteúdo (preenchido a partir da pesquisa — ver js/content/guia-dados.js
  // se existir; senão usa este conjunto básico)
  // ------------------------------------------------------------------
  P2.GUIA_DADOS = P2.GUIA_DADOS || {
    intro: 'Os jeitos que mais funcionam para um CEO usar IA — com cuidado. Copie, cole, troque o que está entre [colchetes] e confira o resultado.',
    secoes: [
      {
        id: 'pedir', icon: '🎯', titulo: 'Como pedir', cap: 'cap1',
        intro: 'Peça como quem explica um serviço para um diretor novo: contexto, tarefa e formato. Depois, refine.',
        itens: [
          { titulo: 'O pedido completo', quando: 'Sempre que for pedir algo importante.', prompt: 'Contexto: sou CEO de {empresaPrompt}, empresa de {setorPrompt}. [Explique a situação em 2 ou 3 frases.]\nTarefa: [o que você quer, exatamente].\nFormato: [ex.: 5 tópicos curtos / uma tabela / um e-mail de no máximo 10 linhas].\nSe faltar informação, me pergunte antes de responder. Se não souber algo, diga "não sei".', porque: 'Com contexto e formato, a resposta sai no ponto. Dar permissão para dizer "não sei" reduz invenções.', cuidado: 'Não cole senhas, dados pessoais de clientes ou segredos da empresa numa conta pessoal.' },
        ],
      },
    ],
  };

  const G = (P2.guia = {});
  function D() { return P2.director; }
  function t(s) { return D() ? D().t(s) : s; }
  function unlocked(sec) {
    const data = P2.save && P2.save.data;
    if (!sec.cap) return true;
    if (!data) return false;
    if (data.settings && data.settings.guiaTudo) return true;
    return !!(data.progress.completed[sec.cap] || data.progress.completed.epilogo);
  }
  G.unlockedCount = function () { return (P2.GUIA_DADOS.secoes || []).filter(unlocked).length; };

  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = '✓ Copiado!'; btn.classList.add('mint'); setTimeout(() => { btn.textContent = o; btn.classList.remove('mint'); }, 1600); if (P2.audio) P2.audio.sfx('success'); };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Selecione e copie'; }
      ta.remove();
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    } catch (e) { fallback(); }
  }
  G.copyText = copyText;

  /** Abre o guia numa tela cheia. secId opcional para abrir numa seção. */
  G.open = function (secId) {
    const ui = P2.ui, el = ui.el;
    const screen = document.getElementById('screen');
    const wasPaused = P2.paused;
    P2.paused = true;
    screen.innerHTML = '';
    screen.hidden = false;
    screen.scrollTop = 0;
    const inner = el('div', 'screen-inner');
    screen.appendChild(inner);
    requestAnimationFrame(() => screen.classList.add('show'));
    const data = P2.GUIA_DADOS;
    const secs = data.secoes || [];
    inner.appendChild(el('div', 'screen-title', '📘 Guia do CEO'));
    inner.appendChild(el('p', 'screen-sub', t(data.intro)));
    const tabs = el('div', 'guide-tabs');
    inner.appendChild(tabs);
    const body = el('div', 'guide-sec');
    inner.appendChild(body);
    let current = secId || (secs.find(unlocked) || secs[0] || {}).id;
    const close = () => {
      screen.classList.remove('show');
      screen.hidden = true;
      screen.innerHTML = '';
      P2.paused = wasPaused;
      document.removeEventListener('keydown', onKey, true);
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(); return; }
      if (!screen.contains(e.target)) e.stopPropagation(); // não deixa a história avançar por trás
    }
    document.addEventListener('keydown', onKey, true);
    function render() {
      tabs.innerHTML = '';
      secs.forEach((s) => {
        const open = unlocked(s);
        const b = el('button', 'seg-btn' + (s.id === current ? ' on' : ''), (open ? s.icon + ' ' : '🔒 ') + s.titulo);
        b.type = 'button';
        b.addEventListener('click', () => { current = s.id; render(); if (P2.audio) P2.audio.sfx('select'); });
        tabs.appendChild(b);
      });
      body.innerHTML = '';
      const s = secs.find((x) => x.id === current);
      if (!s) return;
      const open = unlocked(s);
      if (s.intro) body.appendChild(el('p', 'screen-sub', t(s.intro)));
      if (!open) {
        const capDef = P2.chapters && P2.chapters[s.cap];
        body.appendChild(el('div', 'paper', [
          el('p', null, '🔒 Esta parte libera quando você terminar ' + (capDef ? '"' + capDef.title + '"' : 'o capítulo correspondente') + '.'),
          ui.btn('Mostrar mesmo assim', () => { P2.save.data.settings.guiaTudo = true; P2.save.write(); render(); }, { cls: 'small' }),
        ]));
        return;
      }
      (s.itens || []).forEach((it) => {
        const card = el('div', 'guide-item');
        card.appendChild(el('h3', null, t(it.titulo)));
        if (it.quando) card.appendChild(el('div', 'when', t(it.quando)));
        if (it.prompt) {
          const txt = t(it.prompt);
          card.appendChild(el('div', 'guide-prompt', txt));
          const row = el('div', 'mg-actions');
          const b = ui.btn('Copiar prompt', () => copyText(txt, b), { cls: 'small primary' });
          row.appendChild(b);
          card.appendChild(row);
        }
        if (it.passos) {
          const ol = el('ol', null);
          it.passos.forEach((p) => ol.appendChild(el('li', null, t(p))));
          card.appendChild(ol);
        }
        if (it.porque) card.appendChild(el('p', 'small', [el('b', null, 'Por que funciona: '), t(it.porque)]));
        if (it.cuidado) card.appendChild(el('div', 'guide-care', '⚠️ ' + t(it.cuidado)));
        if (it.fonte) {
          const f = P2.FONTES && P2.FONTES[it.fonte];
          if (f) {
            const a = el('a', 'fact-src', 'Fonte: ' + f.curta + ' ↗');
            a.href = f.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            card.appendChild(a);
          }
        }
        body.appendChild(card);
      });
    }
    render();
    const foot = el('div', 'form-actions');
    foot.style.marginTop = '20px';
    foot.appendChild(ui.btn('◀ Fechar o guia', close, { cls: 'ghost' }));
    foot.appendChild(el('span', 'muted small', G.unlockedCount() + ' de ' + secs.length + ' seções liberadas'));
    inner.appendChild(foot);
    if (P2.audio) P2.audio.sfx('page');
  };
})();

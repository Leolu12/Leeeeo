/* PAI 2.0 — cap6.js — CAPÍTULO 6 "Números na Mesa" (~16h30, escritório ao pôr do sol)
 *
 * Dor: o DRE do 3º trimestre que a Bia (CFO) fechou bate com o relatório da manhã (Cap 2):
 * vendemos 12% mais e a margem bruta caiu de 18% para 16%. A Dona Marta quer, amanhã às 9h,
 * o PORQUÊ e o QUANTO.
 * Virada: a Faísca ensaia a explicação com ele (tabela do DRE, "explica de outro jeito").
 * Tropeço: perguntada "quanto custou", ela aplica a margem antiga sobre a receita do ano
 * PASSADO (base errada) e diz "R$ 0,1 mi, pouca coisa". Ele acha a linha (caneta vermelha +
 * calculadora). Antídoto: a planilha calcula, fórmulas à mostra, grau de certeza, outro
 * caminho (2 pontos × 140,0 = 2,8). A Bia (humana) confere e traz o porquê que a IA não via.
 * Fecho: pôr do sol na janela, a conta de luz de R$ 412 (paga no Cap 8), fatos e lição.
 *
 * Stats (bíblia F): cap6 { erroPego:bool, tentativas, minutosEconomizados }.
 * Conquista: conferente (pegou o erro de conta de primeira).
 * Ambiente: escritorio { time:'tarde', screen:'planilha', papers, tv, chat }; flash-forward
 * opcional na sala_reuniao. Fatos: contas_frageis, estudo_balancos_retirado,
 * reino_unido_copilot_tarefas.
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Dados do capítulo
  // ------------------------------------------------------------------
  // DRE do 3º trimestre (R$ milhões). Bate com o relatório do Cap 2 (nota da Bia: receita +12%,
  // margem de 18% para 16%, "por causa do frete"). Contas conferidas:
  // 140/125 = +12,0% · 117,6/102,5 = +14,7% · 22,5/125 = 18,0% · 22,4/140 = 16,0% · 22,4/22,5 = −0,4%
  // 13,0/12,5 = +4,0% · 9,4/10,0 = −6,0% · 10,0/125 = 8,0% · 9,4/140 = 6,7%
  // Impacto da queda de margem: 18% × 140,0 = 25,2 → 25,2 − 22,4 = 2,8 (= 2 pontos × 140,0).
  // Erro plantado: 18% × 125,0 (receita de 2025) = 22,5 → 22,5 − 22,4 = 0,1 ("pouca coisa").
  const DRE = [
    { id: 'rec', label: 'Receita líquida', a: '125,0', b: '140,0', v: '+12,0%', tone: 'up' },
    { id: 'cpv', label: '(−) Custo das vendas', a: '102,5', b: '117,6', v: '+14,7%', tone: 'dn' },
    { id: 'lb', label: '(=) Lucro bruto', a: '22,5', b: '22,4', v: '−0,4%', tone: 'dn', bold: true },
    { id: 'mb', label: 'Margem bruta', a: '18,0%', b: '16,0%', v: '−2,0 p.p.', tone: 'dn', bold: true },
    { id: 'desp', label: '(−) Despesas operacionais', a: '12,5', b: '13,0', v: '+4,0%', tone: 'dn' },
    { id: 'ebitda', label: '(=) EBITDA', a: '10,0', b: '9,4', v: '−6,0%', tone: 'dn', bold: true },
    { id: 'me', label: 'Margem EBITDA', a: '8,0%', b: '6,7%', v: '−1,3 p.p.', tone: 'dn' },
  ];

  // Ensaio (mini 1): três passos, cada um com versões "de outro jeito" e a conta.
  const AULA = [
    {
      titulo: 'O que aconteceu',
      rows: ['rec', 'cpv', 'lb'],
      main: 'Vocês venderam *12% a mais*: de R$ 125 para R$ 140 milhões. Só que o custo das vendas subiu *14,7%*. O custo correu mais rápido que a receita.',
      alts: [
        'Olhe o lucro bruto: vendemos *R$ 15 milhões a mais* e ele ficou parado, 22,5 → 22,4. O crescimento inteiro foi comido pelo custo.',
        'Em uma frase para o conselho: *crescemos em vendas, mas cada venda ficou mais cara de entregar.*',
      ],
      conta: 'Receita: 140,0 ÷ 125,0 = 1,120 → *+12,0%*\nCusto: 117,6 ÷ 102,5 = 1,147 → *+14,7%*\nLucro bruto: 22,4 − 22,5 = *−0,1*',
    },
    {
      titulo: 'A margem',
      rows: ['lb', 'mb'],
      main: 'A frase para o conselho: *de cada R$ 100 vendidos, sobravam R$ 18 depois do custo; agora sobram R$ 16.* São 2 *pontos* percentuais a menos, não 2%.',
      alts: [
        'Sem jargão nenhum: a margem bruta é o troco que fica de cada real vendido depois de pagar o custo da mercadoria. Era 18 centavos. Virou 16.',
        'Ponto percentual é a régua; “por cento” é o tamanho do tombo. De 18 para 16 são *2 pontos* na régua, mas a margem encolheu *uns 11%*. No conselho, alguém vai misturar os dois.',
      ],
      conta: '2025: 22,5 ÷ 125,0 = *18,0%*\n2026: 22,4 ÷ 140,0 = *16,0%*\nDiferença: 16,0 − 18,0 = *−2,0 pontos*',
    },
    {
      titulo: 'Por que caiu?',
      rows: ['rec', 'cpv'],
      main: 'A nota da Bia de hoje cedo diz *frete*. Pode ser, mas o DRE sozinho não prova. Daqui eu só levanto *suspeitos*: frete ou insumo mais caro, desconto para vender, ou mais venda dos produtos de margem menor. Quem dá o veredito é a Bia.',
      alts: [
        'O DRE mostra *o quê* aconteceu. O *porquê* está nas notas fiscais, nos contratos e na cabeça de quem toca a operação.',
        'É como um exame: mostra a febre, não a causa. Hipótese minha não é diagnóstico.',
      ],
      conta: 'Aqui não tem conta: tem *hipótese*. Cada uma se confirma com um dado: nota de frete, tabela de descontos, vendas por produto.',
    },
  ];

  // Rascunho da Faísca com o erro plantado (mini 2): a linha 3 usa a receita de 2025.
  const PASSOS = [
    { n: 1, txt: 'Receita do 3º tri de 2026: *R$ 140,0 mi*', ok: 'A linha 1 confere: o DRE mostra R$ 140,0 mi de receita no 3º tri de *2026*.' },
    { n: 2, txt: 'Margem bruta de 2025: 22,5 ÷ 125,0 = *18,0%*', ok: 'A linha 2 confere: 22,5 ÷ 125,0 = 0,18. É a margem do ano passado, calculada sobre a receita do ano passado. Certinho.' },
    { n: 3, txt: 'Lucro bruto se a margem de 18% fosse mantida: 18,0% × 125,0 = *R$ 22,5 mi*', bad: true, fix: '→ 18,0% × 140,0 = R$ 25,2 mi' },
    { n: 4, txt: 'Lucro bruto real de 2026: *R$ 22,4 mi*', ok: 'A linha 4 confere: o lucro bruto de 2026 no DRE é R$ 22,4 mi.' },
    { n: 5, txt: 'Impacto da queda: 22,5 − 22,4 = *R$ 0,1 mi*', near: true, fix: '→ 25,2 − 22,4 = R$ 2,8 mi', ok: 'Quase! A subtração está certa: 22,5 − 22,4 = 0,1. Mas ela usa um número que veio de cima. *De onde saiu esse 22,5?*' },
  ];

  const SLIDE_PAUTA = ['Dona Marta — amanhã, 9h', 'Resultado do 3º trimestre', 'Margem bruta: por que caiu?', 'Quanto isso custou?'];
  const SLIDE_PRONTO = ['Margem bruta — 3º trimestre', '18,0% → 16,0% (−2 pontos)', 'Impacto: R$ 2,8 mi no trimestre', 'Causas: confirmar com a Bia'];
  const SLIDE_FINAL = ['Margem bruta — 3º trimestre', '18,0% → 16,0% (−2 pontos)', 'Impacto: R$ 2,8 mi no trimestre', 'Causas: frete (ago.) e descontos (set.)'];
  const CHAT_ABRIU = [['eu', 'Me ajuda a explicar o DRE do 3º tri?'], ['ia', 'Claro! Vamos por partes: o que aconteceu, a margem e as hipóteses.']];
  const CHAT_ERRADO = [['eu', 'Quanto a queda de margem custou no trimestre?'], ['ia', '18% × 125,0 = 22,5 → impacto de R$ 0,1 mi. Pouca coisa!']];
  const CHAT_CERTO = [['eu', 'Refaz na planilha, com as fórmulas à mostra.'], ['ia', '18% × 140,0 = 25,2 → 25,2 − 22,4 = R$ 2,8 mi. Conferido por dois caminhos.']];

  // Pontos do escritório que não são "spots" do ambiente
  const MONITOR = { x: 0.92, y: 1.05, z: -1.3 };
  const PILHA = { x: 1.27, y: 1.0, z: -1.12 };
  const BIA_PE = { x: 0.3, z: 0.32, rot: Math.PI }; // em pé, atrás das cadeiras de visita, de frente para a mesa

  const office = (extra) => Object.assign({ time: 'tarde', screen: 'planilha', papers: 0.35, tv: SLIDE_PAUTA, chat: CHAT_ABRIU, typing: false }, extra || {});
  /** Promessa em segundo plano: evita "rejeição não tratada" se o capítulo for interrompido. */
  const bg = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  /** Rola o painel do minigame só o necessário para mostrar o elemento (celular). */
  const mostra = (node) => { setTimeout(() => { try { node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 30); };
  /** Animação temporária da Faísca (reação a uma escolha). */
  const fa = (G, anim, secs) => bg(G.faisca.play(anim, secs || 1.6));

  /** Coloca o pai sentado à mesa, a Faísca ao lado, e o olhar no monitor. */
  function sentaNaMesa(G) {
    G.pai.at('mesa');
    G.pai.setAnim('sit');
    G.faisca.follow(G.pai);
    G.faisca.setAnim('idle');
  }
  function olhaMonitor(G) { G.player.lookAt(MONITOR); }

  /** Bia entra pela porta e vem até a mesa. Devolve {bia, chegou}: dá para falar enquanto ela anda. */
  function biaEntra(G) {
    const bia = G.actor('bia');
    bia.set({ props: { tablet: true }, expr: 'preocupado' });
    bia.at('porta');
    G.sfx('door');
    G.player.lookAt(bia);
    const chegou = bg(bia.walk({ x: 1.45, z: 0.62 }).then(() => bia.walk(BIA_PE)).then(() => { bia.face(G.pai); }));
    return { bia, chegou };
  }
  /** Variável de outro capítulo (ex.: o ceticismo escolhido no Prólogo), se existir. */
  function varDe(cap, k) {
    const d = P2.save && P2.save.data && P2.save.data.progress;
    const v = d && d.vars && d.vars[cap];
    return v ? v[k] : undefined;
  }
  /** Bia sai (anda até a porta enquanto a conversa continua). */
  function biaSai(G, bia) {
    const p = bia.walk({ x: 1.45, z: 0.62 }).then(() => bia.walk('porta')).then(() => { G.sfx('door'); bia.remove(); });
    return bg(p);
  }

  // ------------------------------------------------------------------
  // Estilos do capítulo (tabela do DRE, rascunho com caneta vermelha, calculadora)
  // ------------------------------------------------------------------
  const CSS = `
  .c6-dre { width: 100%; border-collapse: collapse; font-size: 0.86em; font-variant-numeric: tabular-nums; }
  .c6-dre th { font-family: var(--head); font-size: 0.74em; letter-spacing: 0.04em; text-transform: uppercase; color: var(--muted); text-align: right; padding: 3px 6px 5px; border-bottom: 2px solid var(--line); white-space: nowrap; }
  .c6-dre th:first-child, .c6-dre td:first-child { text-align: left; padding-left: 8px; }
  .c6-dre td { padding: 5px 6px; text-align: right; border-bottom: 1px solid var(--line); white-space: nowrap; transition: background 0.25s; }
  .c6-dre td:first-child { white-space: normal; }
  .c6-dre tr.b td { font-weight: 700; }
  .c6-dre tr.hl td { background: #fff1cf; }
  .c6-dre tr.hl td:first-child { box-shadow: inset 4px 0 0 var(--amber); }
  .c6-dre td.up { color: #12684b; font-weight: 700; }
  .c6-dre td.dn { color: #b3261e; font-weight: 700; }
  .c6-doc h4 { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .c6-doc h4 small { font-family: var(--read); font-weight: 400; color: var(--muted); font-size: 0.78em; }
  .c6-pp { margin-top: 6px; font-size: 0.78em; color: var(--muted); }
  .c6-steps { display: flex; gap: 6px; align-items: center; }
  .c6-steps i { width: 11px; height: 11px; border-radius: 50%; background: #d9dde8; display: inline-block; }
  .c6-steps i.on { background: var(--brand); }
  .c6-steps i.ok { background: var(--mint); }
  .c6-expl { display: flex; flex-direction: column; gap: 10px; }
  .c6-expl .mg-feedback { font-size: 1em; }
  .c6-conta { font-variant-numeric: tabular-nums; }
  .c6-grid { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "src" "draft" "act" "calc"; }
  .c6-src { grid-area: src; } .c6-draft { grid-area: draft; } .c6-act { grid-area: act; } .c6-calc { grid-area: calc; }
  @media (min-width: 860px) {
    .c6-grid { grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.25fr); grid-template-areas: "src draft" "act draft" "calc draft"; grid-template-rows: auto auto 1fr; align-items: start; }
  }
  .c6-draft .mg-line { display: flex; gap: 10px; align-items: flex-start; min-height: 46px; padding: 8px 10px; }
  .c6-draft .mg-line .c6-n { flex: 0 0 auto; font-family: var(--head); font-weight: 800; background: #eef0f6; color: var(--ink); border-radius: 8px; min-width: 28px; text-align: center; padding: 1px 6px; }
  .c6-draft .mg-line.on .c6-n { background: var(--brand); color: #fff; }
  .c6-draft .mg-line .c6-tx { flex: 1 1 auto; }
  .c6-draft .mg-line .c6-ck { display: block; font-size: 0.82em; color: #12684b; font-weight: 700; margin-top: 2px; }
  .c6-draft .mg-line.c6-warn { background: var(--amber-l); border-color: #f0cf86; }
  .c6-draft .mg-line.c6-warn .c6-ck { color: #7a4d00; }
  .c6-x .c6-orig { text-decoration: line-through; text-decoration-color: #d0281f; text-decoration-thickness: 2px; color: #6d6f7a; }
  .c6-fix { display: block; color: #c62020; font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; font-weight: 700; font-size: 1.02em; margin-top: 2px; transform: rotate(-0.6deg); }
  .c6-concl { margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: #fff6ef; font-style: italic; }
  .c6-concl.c6-x { font-style: normal; }
  .c6-act { display: flex; flex-direction: column; gap: 10px; }
  .c6-act .btn { align-self: stretch; }
  .c6-calc-box { background: #f3f5fa; border: 1px solid var(--line); border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .c6-disp { background: #1c2236; color: #fff; border-radius: 12px; padding: 8px 12px; text-align: right; font-variant-numeric: tabular-nums; min-height: 64px; }
  .c6-disp .c6-e { font-size: 0.78em; color: #aab3cc; min-height: 1.2em; word-break: break-all; }
  .c6-disp .c6-r { font-family: var(--head); font-weight: 800; font-size: 1.35em; line-height: 1.2; word-break: break-all; }
  .c6-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .c6-chips .mg-chip { padding: 5px 11px; min-height: 40px; }
  .c6-chips .mg-chip small { display: block; font-size: 0.68em; color: var(--muted); line-height: 1.1; }
  .c6-keys { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .c6-keys button { font: inherit; font-family: var(--head); font-weight: 800; font-size: 1.05em; min-height: 46px; border-radius: 12px; border: 1px solid #d5d9e5; background: #fff; color: var(--ink); cursor: pointer; }
  .c6-keys button:active { transform: translateY(1px); }
  .c6-keys button.op { background: #eef2ff; color: #2b4a8a; }
  .c6-keys button.eq { grid-column: span 2; background: var(--brand); border-color: var(--brand); color: #fff; }
  .c6-keys button.cl { background: #fff1ef; color: #b3261e; }
  .c6-note { font-size: 0.88em; color: #6a3a1f; background: #fff4ee; border-radius: 10px; padding: 7px 10px; }
  .c6-note:empty { display: none; }
  .c6-paths { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .c6-path { background: var(--card2); border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; font-variant-numeric: tabular-nums; }
  .c6-path b { font-family: var(--head); }
  .c6-path .c6-r2 { font-family: var(--head); font-weight: 800; color: #12684b; }
  .c6-bate { text-align: center; font-family: var(--head); font-weight: 800; color: #12684b; background: var(--mint-l); border-radius: 12px; padding: 8px; }
  `;

  // ------------------------------------------------------------------
  // Componentes de minigame
  // ------------------------------------------------------------------
  /** Tabela do DRE. ids: quais linhas mostrar (todas, se vazio). Retorna {node, rows}. */
  function tabelaDRE(api, ids) {
    const el = api.el;
    const rows = {};
    const head = el('tr', null, [el('th', null, 'R$ milhões'), el('th', null, '3º tri 2025'), el('th', null, '3º tri 2026'), el('th', null, 'Var.')]);
    const body = el('tbody');
    DRE.filter((r) => !ids || ids.indexOf(r.id) >= 0).forEach((r) => {
      const tr = el('tr', r.bold ? 'b' : null, [el('td', null, r.label), el('td', null, r.a), el('td', null, r.b), el('td', r.tone, r.v)]);
      rows[r.id] = tr;
      body.appendChild(tr);
    });
    const table = el('table', 'c6-dre', [el('thead', null, head), body]);
    return { node: table, rows };
  }

  /** Mini 1 — "Ensaio para o conselho": a Faísca explica o DRE em 3 passos, com paciência. */
  function miniAula(G) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap6', CSS);
      const el = api.el;
      const R = (s) => api.rich(api.t(s), true);
      const doc = el('div', 'mg-doc c6-doc');
      doc.appendChild(el('h4', null, ['DRE do 3º trimestre ', el('small', null, api.t('{empresaNome}'))]));
      const tab = tabelaDRE(api);
      doc.appendChild(tab.node);
      doc.appendChild(el('div', 'c6-pp', 'p.p. = pontos percentuais'));

      const expl = el('div', 'c6-expl');
      const head = el('div', 'mg-row');
      const lbl = el('span', 'mg-label', '');
      const dots = el('span', 'c6-steps', AULA.map(() => el('i')));
      head.appendChild(dots); head.appendChild(lbl);
      const box = el('div', 'mg-feedback info');
      const conta = el('div', 'mg-hint c6-conta');
      conta.hidden = true;
      expl.appendChild(head); expl.appendChild(box); expl.appendChild(conta);

      const cols = el('div', 'mg-cols', [doc, expl]);
      root.appendChild(cols);
      const acts = el('div', 'mg-actions');
      const bOutro = api.btn('Explica de outro jeito 🔄', () => outro(), { key: '2' });
      const bConta = api.btn('Mostra a conta 🧮', () => mostraConta(), { key: '3' });
      const bOk = api.btn('Entendi ▶', () => proximo(), { cls: 'primary', key: '1' });
      acts.appendChild(bOutro); acts.appendChild(bConta); acts.appendChild(bOk);
      root.appendChild(acts);

      let step = 0, alt = 0, reexplica = 0, contas = 0;
      function render() {
        const s = AULA[step];
        Array.from(dots.children).forEach((d, i) => { d.className = i < step ? 'ok' : i === step ? 'on' : ''; });
        lbl.textContent = 'Passo ' + (step + 1) + ' de ' + AULA.length + ' · ' + s.titulo;
        Object.keys(tab.rows).forEach((k) => tab.rows[k].classList.toggle('hl', s.rows.indexOf(k) >= 0));
        box.innerHTML = '';
        box.appendChild(R(alt === 0 ? s.main : s.alts[alt - 1]));
        conta.hidden = true;
        conta.innerHTML = '';
        conta.appendChild(api.rich(s.conta));
        bOk.querySelector('.kbd') && (bOk.lastChild.textContent = step === AULA.length - 1 ? 'Entendi. Pronto ▶' : 'Entendi, próximo ▶');
      }
      function outro() {
        const s = AULA[step];
        alt = (alt + 1) % (s.alts.length + 1);
        reexplica++;
        api.sfx('pop');
        fa(G, 'teach', 1.8);
        api.say(alt === 0 ? 'Voltando à primeira versão. Pergunta repetida é comigo mesma.' : alt === 1 ? 'Claro! De outro jeito:' : 'Mais um jeito, sem pressa:', 'faisca');
        render();
      }
      function mostraConta() {
        contas++;
        conta.hidden = false;
        api.sfx('tick');
        api.say('A conta à mostra. Pode conferir cada número na tabela.', 'faisca');
      }
      function proximo() {
        api.sfx('confirm');
        if (step >= AULA.length - 1) {
          G.v.reexplica = reexplica;
          G.v.contasVistas = contas;
          done({ reexplica, contas });
          return;
        }
        step++; alt = 0;
        fa(G, 'teach', 1.4);
        api.say(step === 1 ? 'Agora a margem. Esse é o número que o conselho vai olhar.' : 'Por último: por que caiu. Aqui eu fico na hipótese.', 'faisca');
        render();
      }
      render();
    }, { title: 'Ensaio para o conselho: a margem em 3 passos', intro: 'Passo a passo, como para o conselho. Peça *de outro jeito* quantas vezes quiser.', introWho: 'faisca' });
  }

  // ---------------- Calculadora (mini 2)
  function fmtNum(r) {
    if (!isFinite(r)) return 'erro';
    const f = Math.round(r * 10000) / 10000;
    return String(f).replace('-', '−').replace('.', ',');
  }
  function avalia(expr) {
    const toks = expr.match(/\d+(?:,\d*)?%?|[×÷+−]/g);
    if (!toks) return null;
    const vals = [], ops = [];
    let querNum = true;
    for (const t of toks) {
      if (/^[×÷+−]$/.test(t)) { if (querNum) return null; ops.push(t); querNum = true; }
      else {
        if (!querNum) return null;
        let v = parseFloat(t.replace('%', '').replace(',', '.'));
        if (isNaN(v)) v = 0;
        if (t.endsWith('%')) v /= 100;
        vals.push(v); querNum = false;
      }
    }
    if (querNum) ops.pop();
    const v2 = [vals[0]], o2 = [];
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i], b = vals[i + 1];
      if (b === undefined) break;
      if (op === '×') v2[v2.length - 1] *= b;
      else if (op === '÷') v2[v2.length - 1] = b === 0 ? NaN : v2[v2.length - 1] / b;
      else { o2.push(op); v2.push(b); }
    }
    let r = v2[0];
    for (let i = 0; i < o2.length; i++) r = o2[i] === '+' ? r + v2[i + 1] : r - v2[i + 1];
    return r;
  }
  /** Comentário da Faísca sobre o resultado da calculadora (ajuda sem entregar). */
  function dicaConta(expr, r) {
    const near = (x) => Math.abs(r - x) < 0.006;
    if (near(25.2)) return '25,2: o lucro bruto com a margem antiga sobre a receita de 2026. Hmm… na minha linha 3 está 22,5.';
    if (near(2.8)) return '2,8 milhões? Bem longe dos meus 0,1. Alguma linha minha está torta…';
    if (near(22.5) && /125/.test(expr)) return '22,5, igualzinho à minha linha 3. A conta bate… mas 125,0 é a receita de que ano?';
    if (near(22.5)) return '22,5: o lucro bruto de 2025.';
    if (near(0.18) || near(18)) return '18%: a margem de 2025. A linha 2 confere.';
    if (near(0.16) || near(16)) return '16%: a margem de 2026.';
    if (near(1.4)) return '1,4 milhão: quanto vale cada ponto de margem neste trimestre.';
    if (near(15)) return '15 milhões: quanto a receita cresceu.';
    if (near(0.1) || near(-0.1)) return '0,1: o meu resumo. Mas de onde veio o 22,5 que eu usei?';
    if (near(0.02) || near(2) || near(-2)) return '2 pontos: a diferença entre as duas margens.';
    return '';
  }
  function calculadora(api) {
    const el = api.el;
    const wrap = el('div', 'c6-calc-box');
    const eLine = el('div', 'c6-e', '');
    const rLine = el('div', 'c6-r', '0');
    wrap.appendChild(el('div', 'c6-disp', [eLine, rLine]));
    const note = el('div', 'c6-note', '');
    let expr = '', fresh = false;
    const show = () => { rLine.textContent = expr || '0'; };
    const lastNum = () => { const m = expr.match(/[\d,]+%?$/); return m ? m[0] : ''; };
    function press(k) {
      api.sfx('tick');
      if (/^\d$/.test(k)) {
        if (fresh) { expr = ''; eLine.textContent = ''; }
        fresh = false;
        if (/%$/.test(expr)) expr += '×';
        expr += k;
      } else if (k === ',') {
        if (fresh) { expr = ''; fresh = false; }
        const n = lastNum();
        if (/%$/.test(n)) return;
        if (n.indexOf(',') < 0) expr += n ? ',' : '0,';
      } else if (k === '%') {
        fresh = false;
        if (/\d$/.test(expr)) expr += '%';
      } else if (/^[×÷+−]$/.test(k)) {
        fresh = false;
        if (!expr) expr = '0';
        expr = expr.replace(/[×÷+−,]$/, '');
        expr += k;
      } else if (k === '⌫') {
        fresh = false;
        expr = expr.slice(0, -1);
      } else if (k === 'C') {
        expr = ''; fresh = false; eLine.textContent = ''; note.textContent = '';
      } else if (k === '=') {
        const r = avalia(expr);
        if (r == null) return;
        const res = fmtNum(r);
        eLine.textContent = expr + ' =';
        const pct = r !== 0 && Math.abs(r) < 1 ? '  (' + fmtNum(r * 100) + '%)' : '';
        rLine.textContent = res + pct;
        note.textContent = dicaConta(expr, r);
        expr = res === 'erro' ? '' : res.replace('−', '');
        if (r < 0) expr = '';
        fresh = true;
        api.sfx('pop');
        return;
      }
      show();
    }
    function chip(v) {
      api.sfx('select');
      if (fresh) { expr = ''; eLine.textContent = ''; fresh = false; }
      expr = expr.replace(/[\d,]+%?$/, '') + v;
      show();
    }
    const chips = el('div', 'c6-chips');
    [['140,0', 'receita 2026'], ['125,0', 'receita 2025'], ['22,4', 'l. bruto 2026'], ['22,5', 'l. bruto 2025'], ['18%', 'margem 2025'], ['16%', 'margem 2026']].forEach(([v, s]) => {
      const b = el('button', 'mg-chip', [v, el('small', null, s)]);
      b.type = 'button';
      b.addEventListener('click', (e) => { e.stopPropagation(); chip(v); });
      chips.appendChild(b);
    });
    wrap.appendChild(chips);
    const keys = el('div', 'c6-keys');
    ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', ',', '='].forEach((k) => {
      const cls = k === '=' ? 'eq' : k === 'C' ? 'cl' : /^[×÷+−%⌫]$/.test(k) ? 'op' : '';
      const b = el('button', cls, k);
      b.type = 'button';
      b.setAttribute('aria-label', { '÷': 'dividir', '×': 'multiplicar', '−': 'menos', '+': 'mais', '⌫': 'apagar', 'C': 'limpar', '=': 'igual', ',': 'vírgula', '%': 'por cento' }[k] || k);
      b.addEventListener('click', (e) => { e.stopPropagation(); press(k); });
      keys.appendChild(b);
    });
    wrap.appendChild(keys);
    wrap.appendChild(note);
    return wrap;
  }

  /** Mini 2 — "Caneta vermelha nos números": achar a linha onde o erro nasce. */
  function miniCaneta(G) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap6', CSS);
      const el = api.el;
      const R = (s) => api.rich(api.t(s), true);
      const grid = el('div', 'c6-grid');

      // Fonte da verdade: o DRE
      const src = el('div', 'mg-doc c6-doc c6-src');
      src.appendChild(el('h4', null, ['📊 O DRE ', el('small', null, 'fonte da verdade')]));
      src.appendChild(tabelaDRE(api, ['rec', 'lb', 'mb']).node);
      grid.appendChild(src);

      // Rascunho da Faísca
      const draft = el('div', 'mg-doc c6-doc c6-draft');
      draft.appendChild(el('h4', null, ['✦ Rascunho da Faísca ', el('small', null, '“Quanto a queda de margem custou?”')]));
      const lines = PASSOS.map((p) => {
        const orig = el('span', 'c6-orig', R(p.txt));
        const tx = el('span', 'c6-tx', orig);
        const b = el('button', 'mg-line', [el('span', 'c6-n', String(p.n)), tx]);
        b.type = 'button';
        b.dataset.key = String(p.n);
        b.addEventListener('click', (e) => { e.stopPropagation(); seleciona(p.n); });
        draft.appendChild(b);
        return { p, b, tx, orig };
      });
      const concl = el('div', 'c6-concl', el('span', 'c6-orig', R('Resumo: “a queda custou só uns *R$ 100 mil*. Pouca coisa: dá para tranquilizar o conselho.”')));
      draft.appendChild(concl);
      grid.appendChild(draft);

      // Ação + retorno
      const act = el('div', 'c6-act');
      const bMarca = api.btn('Toque numa linha do rascunho', () => marca(), { cls: 'primary', disabled: true });
      const fb = el('div', 'mg-feedback', R('A calculadora é de graça: conferir *não conta* como tentativa. Só conta quando você marcar uma linha como errada.'));
      act.appendChild(fb);
      act.appendChild(bMarca);
      grid.appendChild(act);

      // Calculadora (recolhida no começo)
      const calc = el('div', 'c6-calc');
      const pad = calculadora(api);
      pad.hidden = true;
      const bCalc = api.btn('🧮 Abrir a calculadora', () => {
        pad.hidden = !pad.hidden;
        bCalc.lastChild.textContent = pad.hidden ? '🧮 Abrir a calculadora' : '🧮 Fechar a calculadora';
        api.sfx('select');
        if (!pad.hidden) mostra(pad);
      }, { cls: 'small' });
      calc.appendChild(bCalc);
      calc.appendChild(pad);
      grid.appendChild(calc);
      root.appendChild(grid);

      let sel = 0, tentativas = 0, erradas = 0, acabou = false;
      function setMarcaLabel(txt, enabled) {
        bMarca.innerHTML = '';
        bMarca.appendChild(api.rich(txt, true));
        bMarca.disabled = !enabled;
      }
      function seleciona(n) {
        if (acabou) return;
        const L = lines[n - 1];
        if (L.b.disabled) return;
        sel = n;
        lines.forEach((x) => x.b.classList.toggle('on', x.p.n === n));
        api.sfx('select');
        setMarcaLabel('✗ A linha ' + n + ' está errada', true);
        setTimeout(() => { try { bMarca.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 0);
        mostra(bMarca);
      }
      function feedback(kind, txt) {
        fb.className = 'mg-feedback ' + kind;
        fb.innerHTML = '';
        fb.appendChild(R(txt));
        mostra(fb);
      }
      function corrige() {
        const L3 = lines[2], L5 = lines[4];
        L3.b.classList.remove('on', 'ok');
        L3.b.classList.add('bad', 'c6-x');
        L3.tx.appendChild(el('span', 'c6-fix', PASSOS[2].fix));
        L5.b.classList.remove('on', 'ok', 'c6-warn');
        L5.b.classList.add('c6-x');
        const ck5 = L5.tx.querySelector('.c6-ck'); if (ck5) ck5.remove();
        L5.tx.appendChild(el('span', 'c6-fix', PASSOS[4].fix));
        concl.classList.add('c6-x');
        concl.appendChild(el('span', 'c6-fix', '→ custou R$ 2,8 mi. Não é pouca coisa.'));
        lines.forEach((x) => (x.b.disabled = true));
      }
      function fim(found) {
        acabou = true;
        corrige();
        const go = api.btn('Continuar ▶', () => done({ found, tentativas }), { cls: 'primary', key: '1' });
        bMarca.replaceWith(go);
        setTimeout(() => { try { go.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 0);
      }
      function marca() {
        if (acabou || !sel) return;
        const L = lines[sel - 1];
        tentativas++;
        if (L.p.bad) {
          api.sfx('success');
          fa(G, 'ashamed', 2.2);
          feedback('ok', '*Achou!* Os 18% estão certos, mas foram aplicados sobre R$ 125,0 mi, a receita de *2025*. A pergunta é sobre 2026: 18% × 140,0 = *R$ 25,2 mi*. A conta até bate na calculadora; o erro estava na *base*.');
          api.say(tentativas === 1 ? 'De primeira! Caneta vermelha certeira.' : 'Pegou! E repare: o erro nasceu na linha 3 e contaminou o resto.', 'faisca');
          fim(true);
          return;
        }
        erradas++;
        api.sfx(L.p.near ? 'select' : 'fail');
        L.b.classList.remove('on');
        L.b.classList.add(L.p.near ? 'c6-warn' : 'ok');
        L.b.disabled = true;
        L.tx.appendChild(el('span', 'c6-ck', L.p.near ? '≈ conta certa, número herdado' : '✓ confere'));
        sel = 0;
        setMarcaLabel('Toque em outra linha do rascunho', false);
        if (erradas >= 3) {
          fa(G, 'ashamed', 2.2);
          feedback('info', 'Era a *linha 3*: os 18% foram aplicados sobre R$ 125,0 mi, a receita de *2025*. Para 2026, o certo é 18% × 140,0 = *R$ 25,2 mi*. A conta batia na calculadora; a *base* é que estava errada.');
          api.say('Esse erro engana porque a conta em si está certinha. Por isso a gente confere linha por linha.', 'faisca');
          fim(false);
          return;
        }
        feedback(L.p.near ? 'warn' : 'bad', L.p.ok);
        fa(G, 'think', 1.4);
        if (erradas === 2) api.say('Dica de quem errou: em cada linha, repare de que *ano* é a receita usada.', 'faisca');
        else api.say('Essa confere. Procure a linha onde o erro *começa*.', 'faisca');
      }
    }, { title: 'Caneta vermelha: onde a conta escorregou?', intro: 'Uma linha do meu rascunho está errada. Toque na linha onde o erro *começa*.', introWho: 'faisca' });
  }

  /** Cartão "dois caminhos, o mesmo número". */
  function cartaoCaminhos(G) {
    const el = P2.ui.el;
    const node = el('div', 'c6-paths', [
      el('div', 'c6-path', [el('b', null, 'Caminho 1 · margem antiga sobre a receita de 2026'), el('br'), '18,0% × 140,0 = 25,2 → 25,2 − 22,4 = ', el('span', 'c6-r2', 'R$ 2,8 mi')]),
      el('div', 'c6-path', [el('b', null, 'Caminho 2 · diferença de margem'), el('br'), '(18,0% − 16,0%) × 140,0 = 2 pontos × 140,0 = ', el('span', 'c6-r2', 'R$ 2,8 mi')]),
      el('div', 'c6-bate', '✔ Bateu. Dá para levar ao conselho.'),
    ]);
    P2.ui.css('cap6', CSS);
    return G.card({ kind: 'ok', kicker: 'Teste 3: outro caminho', icon: '🧮', titulo: 'Dois caminhos, o mesmo número', node, botao: 'Continuar' });
  }

  // ------------------------------------------------------------------
  // Capítulo
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap6',
    num: 'Capítulo 6',
    title: 'Números na Mesa',
    subtitle: 'Vendemos mais e ganhamos menos. Quem faz a conta?',
    music: 'casa',
    minutes: 9,
    parts: [
      // ============================================================ PARTE 1 — 16h30, de volta à mesa
      async (G) => {
        await G.titleCard();
        G.scene('escritorio', office({ chat: [['eu', 'Resumo da reunião das 14h'], ['ia', 'Ata pronta e e-mail de follow-up enviado.']] }));
        G.pai.at('porta');
        G.faisca.follow(G.pai);
        G.hud.set({ clock: '16:30' });
        G.player.cine();
        await G.cam.shot('janela', 0);
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          bg(G.cam.shot('porta', 4.5));
          await G.narrate('16h30. A reunião infinita e o trânsito ficaram para trás. O sol entra baixo e pinta a sala de laranja.');
          G.cam.focus(G.faisca, 'close', { side: -1, dur: 0.8 }).catch(() => {});
          await G.say('faisca', 'Ufa, escritório quietinho! Parece até que o dia acabou.', { cam: false });
          fa(G, 'spin', 1.2);
          await G.say('pai', 'O dia de um CEO acaba quando o conselho vai dormir, Faísca.', { expr: 'cansado' });
        });
        G.player.fp();
        G.sfx('notify');
        G.toast('*Bia:* fechei o DRE do trimestre. Passo aí em 5 min?', { icon: '💬', dur: 4 });

        await G.explore({
          objetivo: 'Volte para a sua mesa',
          hotspots: [
            {
              id: 'janela', label: 'Olhar a cidade', icon: '🌇', at: 'janela', optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'Trinta anos olhando essa cidade. Cada prédio desses tem um DRE apanhando agora.', { expr: 'pensativo' });
                fa(G, 'think', 1.6);
                await G.say('faisca', 'Daqui dá para ver uns quatrocentos prédios. Contei de cabeça, então… melhor conferir.');
              },
            },
            {
              id: 'papeis', label: 'A pilha de papéis', icon: '📚', pos: PILHA, optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'A pilha baixou. De manhã ela chegava no meu queixo.');
                bg(G.faisca.jump(0.25));
                await G.say('faisca', 'Saiu o contrato, saiu a ata… Daqui a pouco aparece madeira nessa mesa!');
              },
            },
            {
              id: 'sofa', label: 'O sofá', icon: '🛋️', at: 'sofa', optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'Cinco minutos de olho fechado. Só cinco.', { expr: 'cansado' });
                fa(G, 'sleep', 1.8);
                await G.say('faisca', 'Se você deitar, eu durmo junto. E aí quem recebe a Bia?');
              },
            },
            { id: 'mesa', label: 'Sentar à mesa', icon: '🪑', at: 'mesa' },
          ],
        });
        sentaNaMesa(G);

        // A Bia traz a dor do dia
        const { bia, chegou } = biaEntra(G);
        await G.say('bia', '{pai}, licença. Tem um minuto? É o trimestre.', { expr: 'preocupado' });
        await chegou;
        await G.say('bia', 'Fechei o DRE completo. Bateu com a prévia do seu relatório: vendemos 12% a mais… e a margem bruta caiu de 18% para 16%.', { expr: 'preocupado' });
        await G.say('pai', 'Vendemos mais e ganhamos menos. Clássico.', { expr: 'desconfiado' });
        await G.say('bia', 'A Dona Marta leu o relatório e quer duas respostas amanhã às 9h: *por que*, exatamente, e *quanto* isso custou em reais.', { expr: 'determinado' });
        await G.say('bia', 'Agora vou fechar o fluxo de caixa com o time. Às cinco e meia eu passo aqui e a gente confere junto.', { expr: 'cansado' });
        await G.say('pai', 'Combinado. Até lá eu já sei explicar isso em duas frases.', { expr: 'determinado' });
        bia.setExpr('amigavel');
        const saida = biaSai(G, bia);
        G.toast('Bia enviou *DRE_3T_2026.xlsx*', { icon: '📎', kind: 'email', dur: 4 });
        await G.say('faisca', 'Quer que eu leia o DRE com você?', { cam: false });
        fa(G, 'wave', 1.2);

        const onde = await G.choose([
          { text: 'No app gratuito do meu celular', sub: 'conta pessoal, é mais rápido', value: 'gratis' },
          { text: 'Na ferramenta de IA aprovada pela empresa', sub: 'plano corporativo, aqui no computador', value: 'aprovada' },
          { text: 'Tiro o nome da empresa e colo em qualquer lugar', sub: 'disfarçado', value: 'disfarce' },
        ], { prompt: 'O resultado ainda não foi divulgado. Onde você abre o DRE com a Faísca?' });
        G.v.semaforo = onde;
        if (onde === 'gratis') {
          G.faisca.emote('!');
          fa(G, 'scared', 1.8);
          await G.say('faisca', 'Sinal vermelho! Resultado não divulgado é material de conselho: em conta pessoal gratuita, a conversa pode ficar guardada e até ser usada para treinar a IA.');
          await G.say('pai', 'Tá certo. Ferramenta da empresa.', { expr: 'sem_graca' });
        } else if (onde === 'disfarce') {
          fa(G, 'doubt', 1.8);
          await G.say('faisca', 'Trocar o nome não esconde os números: quem conhece o mercado reconhece a empresa pelo tamanho do faturamento. Resultado não divulgado, só na ferramenta aprovada.');
          await G.say('pai', 'Ferramenta da empresa, então.', { expr: 'sem_graca' });
        } else {
          fa(G, 'celebrate', 1.8);
          G.fx.sparkles(G.faisca);
          await G.say('faisca', 'Isso! Sinal amarelo: pode, desde que seja aqui, no plano da empresa, que não treina com os dados de vocês.');
        }
        await saida;
        G.sceneParams({ chat: CHAT_ABRIU });
        olhaMonitor(G);
        await G.say('faisca', 'Abri aqui no computador. Vamos por partes?', { cam: false });
      },

      // ============================================================ PARTE 2 — Ensaio para o conselho
      async (G) => {
        G.scene('escritorio', office());
        sentaNaMesa(G);
        G.hud.set({ clock: '16:45' });
        olhaMonitor(G);
        await G.fadeIn();
        await G.say('pai', 'Margem eu sei o que é, Faísca. Trinta anos de DRE.', { expr: 'desconfiado' });
        fa(G, 'teach', 1.8);
        await G.say('faisca', 'Eu sei! Não é aula, é ensaio: como explicar isso em duas frases para o conselho. Se alguma explicação ficar torta, peça de outro jeito.');

        const aula = await miniAula(G);
        olhaMonitor(G);
        await G.say('pai', 'Dois pontos, não dois por cento. O Dr. Almeida, do conselho, vive misturando os dois.', { expr: 'rindo' });
        if (aula && aula.reexplica > 0) {
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'E obrigada pelos “explica de outro jeito”. É assim mesmo: até a explicação ficar do seu jeito.');
        }

        // A pergunta do quanto — e a resposta confiante (e errada)
        await G.say('pai', 'Agora a pergunta que a Dona Marta vai fazer: quanto isso custou, em reais?', { expr: 'determinado' });
        G.sceneParams({ chat: CHAT_ERRADO });
        await G.aiChat([
          { from: 'voce', text: 'Quanto essa queda de margem custou, em reais, no trimestre?' },
          { from: 'ia', text: 'Fácil! Em 5 passos:\n1. Receita do 3º tri de 2026: R$ 140,0 mi\n2. Margem bruta de 2025: 22,5 ÷ 125,0 = 18,0%\n3. Lucro bruto se a margem fosse mantida: 18,0% × 125,0 = R$ 22,5 mi\n4. Lucro bruto real de 2026: R$ 22,4 mi\n5. Impacto: 22,5 − 22,4 = R$ 0,1 mi\n*A queda custou só uns R$ 100 mil.* Pouca coisa: dá para tranquilizar o conselho!', thinking: 1.4 },
        ], { title: 'Faísca', subtitle: 'ferramenta aprovada da empresa' });
        fa(G, 'celebrate', 1.8);
        await G.say('faisca', 'Prontinho! Pode dormir tranquilo hoje.', { cam: false });
        await G.narrate('*O bigode de {pai} dá aquela tremidinha.*');
        await G.think('pai', 'Cem mil? Num trimestre de 140 milhões, cada ponto de margem vale 1,4 milhão. E foram dois pontos. Isso não fecha.');

        const reacao = await G.choose([
          { text: 'Ótimo. Manda isso para a Dona Marta.', value: 'manda' },
          { text: 'Espera. Me mostra a conta, passo a passo.', value: 'passos' },
          { text: 'Qual o seu grau de certeza? O que pode estar errado?', value: 'certeza' },
        ], { prompt: 'R$ 100 mil, “pouca coisa”. E agora?' });
        G.v.reacao = reacao;
        if (reacao === 'manda') {
          G.sfx('whoosh');
          fa(G, 'type', 1.2);
          await G.say('faisca', 'Mandando!', { cam: false });
          // Flash-forward: amanhã, 9h03, sala do conselho
          await G.fadeOut(0.5, '#ffffff');
          G.scene('sala_reuniao', { clock: '09:03', time: 'dia', chaos: 0, slide: { title: 'Margem bruta — 3º trimestre', lines: ['Impacto da queda: R$ 0,1 mi', '“Pouca coisa”'] } });
          G.pai.at('cabeceira');
          G.pai.setAnim('sit');
          G.faisca.set({ x: G.pai.x - 0.5, z: G.pai.z + 0.6 });
          G.chefe.at('c4');
          G.chefe.set({ anim: 'sit', expr: 'desconfiado', props: { papers: true } });
          G.chefe.face(G.pai, true);
          G.tint('#7a5cff', 0.16);
          G.player.lookAt(G.chefe);
          await G.fadeIn(0.6);
          await G.narrate('Amanhã, 9h03. Sala do conselho.');
          await G.say('chefe', '{pai}, o seu e-mail diz que a queda custou R$ 100 mil. “Pouca coisa”.', { expr: 'desconfiado' });
          await G.say('chefe', 'A Bia fez outra conta e deu bem mais. Qual dos dois números eu levo a sério?', { expr: 'impaciente' });
          G.shake(2, 0.4);
          await G.rewind(1.6);
          await G.fadeOut(0.4, '#ffffff');
          G.chefe.remove();
          G.tint(null);
          G.scene('escritorio', office({ chat: CHAT_ERRADO }));
          sentaNaMesa(G);
          G.faisca.set({ x: G.pai.x + 0.6, z: G.pai.z + 0.9 });
          olhaMonitor(G);
          await G.fadeIn(0.5);
          fa(G, 'scared', 1.4);
          await G.say('faisca', 'Ufa! Foi só imaginação. Na vida real, e-mail enviado não volta.', { cam: false });
          await G.say('pai', 'Então a gente confere antes. Mostra a conta, passo a passo.', { expr: 'determinado' });
        } else if (reacao === 'passos') {
          fa(G, 'teach', 1.6);
          await G.say('faisca', 'Boa! Pedir a conta passo a passo é o primeiro teste: mostrar de onde veio cada número. Vou deixar os cinco passos na tela.', { cam: false });
        } else {
          fa(G, 'think', 1.8);
          await G.say('faisca', 'Alta… mas, sendo honesta: conta de cabeça é o meu ponto fraco. Posso ter pegado algum número da coluna errada.', { cam: false });
          await G.say('pai', 'Da coluna errada. Interessante. Vamos ver isso linha por linha.', { expr: 'desconfiado' });
        }
      },

      // ============================================================ PARTE 3 — Caneta vermelha nos números
      async (G) => {
        G.scene('escritorio', office({ chat: CHAT_ERRADO }));
        sentaNaMesa(G);
        G.hud.set({ clock: '17:00' });
        olhaMonitor(G);
        await G.fadeIn();
        await G.say('faisca', 'Os cinco passos estão na tela. Pode passar a caneta vermelha: eu não fico ofendida.', { cam: false });

        const r = await miniCaneta(G);
        const found = !!(r && r.found);
        const tentativas = (r && r.tentativas) || 0;
        G.stats({ erroPego: found, tentativas });
        if (found && tentativas === 1) G.achieve('conferente');

        // O momento: o faro dele pegou a IA no pulo (plano de cinema)
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('poder', 0.9);
        if (found) {
          await G.say('pai', tentativas === 1 ? 'Linha três. Você usou a receita do ano passado.' : 'Achei. Linha três: a receita do ano passado.', { expr: 'orgulhoso' });
          G.faisca.setAnim('ashamed');
          await G.cam.focus(G.faisca, 'close', { side: -1, dur: 0.7 });
          await G.say('faisca', 'Ai. Base errada: 18% sobre 125 milhões, quando era sobre 140. E a conta em si estava certinha: o pior tipo de erro, porque parece certo.');
          await G.say('faisca', 'Obrigada. Foi o seu faro que pegou: quem tem trinta anos de DRE sente quando um número não fecha.');
        } else {
          G.faisca.setAnim('ashamed');
          await G.cam.focus(G.faisca, 'close', { side: -1, dur: 0.7 });
          await G.say('faisca', 'Era a linha três. Usei a receita do ano passado: 18% sobre 125 milhões, quando era sobre 140.');
          await G.cam.shot('poder', 0.7);
          await G.say('pai', 'E a conta em si estava certa. Por isso enganava.', { expr: 'pensativo' });
          await G.cam.focus(G.faisca, 'close', { side: -1, dur: 0.6 });
          await G.say('faisca', 'Exato: o pior tipo de erro, porque parece certo. É por isso que se confere linha por linha.');
        }
        await G.cam.shot('poder', 0.7);
        if (varDe('prologo', 'ceticismo') === 'inventou') await G.say('pai', 'Hoje cedo eu disse que essa coisa inventa número. Pelo menos agora eu sei onde procurar.', { expr: 'desconfiado' });
        await G.say('pai', 'Achei que computador fosse bom de conta.', { expr: 'desconfiado' });
        G.faisca.setAnim('teach');
        await G.cam.focus(G.faisca, 'close', { side: -1, dur: 0.6 });
        await G.say('faisca', 'Calculadora é. Eu sou outra coisa: escrevo números do jeito que escrevo palavras. Para ler, explicar e organizar, sou ótima. Para fazer a conta, chame a planilha.');
        G.faisca.setAnim('idle');
        G.player.fp();
        G.talkCam(true);
        olhaMonitor(G);

        await G.fact('contas_frageis');

        // Antídoto 1: a planilha calcula, com as fórmulas à mostra
        await G.say('faisca', 'O antídoto: eu interpreto, a planilha calcula. Como você quer que eu refaça?', { cam: false });
        const como = await G.choose([
          { text: 'Na planilha, com as fórmulas à mostra', sub: 'ou na ferramenta de análise de dados, que faz a conta de verdade', value: 'planilha' },
          { text: 'De cabeça mesmo, agora com mais cuidado', value: 'cabeca' },
          { text: 'Deixa. Eu faço tudo na mão', value: 'mao' },
        ], { prompt: 'Como refazer a conta?' });
        G.v.refaz = como;
        if (como === 'planilha') {
          fa(G, 'celebrate', 1.6);
          await G.say('faisca', 'Isso! A planilha calcula, eu explico. Cada fórmula à vista, para você auditar.', { cam: false });
        } else if (como === 'cabeca') {
          fa(G, 'doubt', 1.8);
          await G.say('faisca', 'Com todo o respeito: “mais cuidado” não é método. Conta de cabeça é justamente onde eu escorrego. Posso usar a planilha e mostrar as fórmulas?', { cam: false });
          await G.say('pai', 'Justo. Mostra.', { expr: 'neutro' });
        } else {
          fa(G, 'wave', 1.4);
          await G.say('faisca', 'Pode! Quem assina é você. Uma ideia: eu monto a planilha com as fórmulas à mostra e você confere célula por célula. Fica rápido e auditável.', { cam: false });
          await G.say('pai', 'Monta. Mas eu confiro célula por célula.', { expr: 'desconfiado' });
        }
        G.sceneParams({ chat: CHAT_CERTO });
        await G.aiChat([
          { from: 'voce', text: 'Refaz na planilha, com as fórmulas à mostra.' },
          { from: 'ia', text: 'Feito, com cada fórmula à vista:\n- B1 · Receita 2026 = 140,0\n- B2 · Margem 2025 = 22,5 ÷ 125,0 → 18,0%\n- B3 · Lucro bruto com a margem antiga = B2 × B1 → 25,2\n- B4 · Lucro bruto real = 22,4\n- B5 · Impacto = B3 − B4 → *R$ 2,8 mi*\nPremissa (o que eu supus): a margem de 2025 como régua. O resto é conta.', thinking: 1.2 },
        ], { title: 'Faísca', subtitle: 'ferramenta aprovada da empresa · planilha' });

        // Antídoto 2: grau de certeza
        await G.say('pai', 'E agora, qual o seu grau de certeza?', { expr: 'desconfiado' });
        fa(G, 'teach', 1.6);
        await G.say('faisca', 'Na conta, alta: quem calculou foi a planilha. Nas causas, baixa: não vi nota de frete nem tabela de desconto. Isso é com a Bia.', { cam: false });

        // Antídoto 3: outro caminho
        const cam = await G.choose([
          { text: 'Pergunto de novo, do mesmo jeito', value: 'repete' },
          { text: 'Pela diferença de margem: 2 pontos sobre a receita deste ano', value: 'margem' },
          { text: 'Não precisa. Agora foi a planilha que calculou', value: 'confia' },
        ], { prompt: 'Último teste: conferir por outro caminho. Qual?' });
        G.v.outroCaminho = cam;
        if (cam === 'margem') {
          fa(G, 'celebrate', 1.8);
          await G.say('faisca', 'Esse é o caminho que o seu bigode fez lá atrás!', { cam: false });
        } else if (cam === 'repete') {
          fa(G, 'doubt', 1.8);
          await G.say('faisca', 'Repetir mostra se eu oscilo, mas eu posso tropeçar igualzinho. Um caminho *diferente* pega mais erro: pela diferença de margem, 2 pontos sobre 140.', { cam: false });
        } else {
          fa(G, 'think', 1.8);
          await G.say('faisca', 'A planilha calcula com perfeição o que a gente manda. Se a fórmula estiver torta, ela erra com perfeição também. Vamos pela diferença de margem: 2 pontos sobre 140.', { cam: false });
        }
        G.sfx('success');
        G.fx.sparkles(G.faisca);
        await cartaoCaminhos(G);
        await G.say('pai', 'R$ 2,8 milhões. Vinte e oito vezes o que você tinha dito.', { expr: 'determinado' });
        fa(G, 'ashamed', 1.6);
        await G.say('faisca', 'Vinte e oito vezes. E eu toda feliz dizendo “pouca coisa”.', { cam: false });
        await G.say('pai', 'A IA rascunha. A conta, eu confiro.', { expr: 'orgulhoso' });
        fa(G, 'celebrate', 1.6);
        await G.say('faisca', 'Anotado! Os pedidos certos para números estão no seu Guia do CEO, botão 📘, na seção Números. Inclusive o de conferir por dois caminhos.', { cam: false });
        G.sceneParams({ tv: SLIDE_PRONTO, papers: 0.32 });

        // Tempo poupado (estimativa honesta, já contando a conferência)
        let min = 45;
        if (como === 'mao') min = 30;
        if (!found) min -= 10;
        G.stats({ minutosEconomizados: min });
      },

      // ============================================================ PARTE 4 — 17h30: a Bia confere; o pôr do sol
      async (G) => {
        G.scene('escritorio', office({ tv: SLIDE_PRONTO, papers: 0.32, chat: CHAT_CERTO }));
        sentaNaMesa(G);
        const bia = G.actor('bia');
        bia.set({ props: { tablet: true }, expr: 'preocupado' });
        bia.at(BIA_PE);
        bia.face(G.pai, true);
        G.hud.set({ clock: '17:30' });
        G.player.lookAt(bia);
        await G.fadeIn();
        await G.say('bia', 'Cinco e meia em ponto. E aí, quanto custou?', { expr: 'preocupado' });
        await G.say('pai', 'R$ 2,8 milhões no trimestre. Conferido por dois caminhos.', { expr: 'determinado' });
        bg(bia.play('think', 1.6));
        await G.say('bia', '… Bate com o meu fechamento: dois e oito. Você fez isso sozinho?', { expr: 'surpreso' });

        const quem = await G.choose([
          { text: 'Com a Faísca. Ela rascunhou, eu conferi.', value: 'junto' },
          { text: 'Sozinho. Trinta anos de DRE.', value: 'sozinho' },
        ], { prompt: 'O que você responde para a Bia?' });
        G.v.contouBia = quem;
        if (quem === 'sozinho') {
          G.faisca.emote('?');
          fa(G, 'doubt', 1.6);
          bg(bia.play('laugh', 1.4));
          await G.say('bia', 'Sei. E esse cubinho laranja aí do seu lado?', { expr: 'rindo' });
          fa(G, 'wave', 1.2);
          await G.say('pai', 'Tá bom. Ela rascunhou, eu conferi. E peguei um erro dela no caminho.', { expr: 'sem_graca' });
        } else {
          fa(G, 'celebrate', 1.6);
          await G.say('pai', 'E peguei um erro dela no caminho.', { expr: 'orgulhoso' });
        }
        await G.say('bia', 'Pegou um erro da IA? Então me ensina. Meu time leva dois dias nessa explicação todo trimestre.', { expr: 'empolgado' });
        await G.say('bia', 'E o porquê eu te dou. O frete dos insumos subiu em agosto: isso já estava na minha nota.', { expr: 'determinado' });
        await G.say('bia', 'O que não estava: em setembro, o comercial deu desconto pesado para bater a meta.', { expr: 'desconfiado' });
        await G.say('pai', 'O Jorge.', { expr: 'cansado' });
        bg(bia.play('laugh', 1.4));
        await G.say('bia', 'O Jorge.', { expr: 'rindo' });
        fa(G, 'think', 1.6);
        await G.say('faisca', 'O desconto eu nunca ia adivinhar: não estava no DRE nem na nota. Eu só sei o que me contam.', { cam: false });
        await G.say('pai', 'E o reajuste de 6% que a gente aprovou hoje à tarde?', { expr: 'pensativo' });
        await G.say('bia', 'Recupera boa parte. Desde que o desconto de setembro não vire costume.', { expr: 'determinado' });
        G.sceneParams({ tv: SLIDE_FINAL, papers: 0.28 });
        G.sfx('page');
        await G.say('bia', 'Amanhã às nove, então: você apresenta, eu seguro as perguntas difíceis.', { expr: 'amigavel' });
        const saida = biaSai(G, bia);
        await G.say('pai', 'Fechado. E dá um desconto para o Jorge.', { expr: 'rindo' });
        await saida;

        // Exploração curta: até a janela, ver o pôr do sol
        await G.explore({
          objetivo: 'Vá até a janela',
          hotspots: [
            {
              id: 'tv', label: 'O slide de amanhã', icon: '📺', at: 'tv', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Quatro linhas e um número conferido duas vezes. Dá para dormir.');
                await G.say('faisca', 'E se alguém disser “caiu dois por cento”…');
                await G.say('pai', '… dois *pontos*. Eu corrijo. Com gentileza.', { expr: 'rindo' });
              },
            },
            { id: 'janela', label: 'Olhar o pôr do sol', icon: '🌇', at: 'janela' },
          ],
        });
        G.pai.at('janela');
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('janela', 1.4);
        G.sfx('phone_vibrate');
        G.toast('Conta de luz: *R$ 412,00* · vence sexta', { icon: '💡', kind: 'money', dur: 5 });
        await G.say('pai', 'Quatrocentos e doze reais de luz. Em casa ninguém me manda DRE… manda isso.', { expr: 'surpreso' });
        fa(G, 'teach', 1.4);
        await G.say('faisca', 'Essa eu te ajudo a entender hoje à noite, com a fatura na mão. Mas a soma…');
        await G.say('pai', '… eu confiro. Já entendi.', { expr: 'rindo' });
        await G.think('pai', 'Hoje à noite eu conto para {oa} {filho}: peguei a IA no pulo.');
        bg(G.faisca.jump(0.25));
        await G.say('faisca', 'Pode contar. Eu mesma confirmo.');
        await G.say('pai', 'E eu que li no jornal que a IA lê balanço melhor que analista.', { expr: 'desconfiado' });
        fa(G, 'teach', 1.8);
        await G.say('faisca', 'Aquele estudo famoso? Os próprios autores retiraram para revisão: acharam inconsistências nos dados. Até pesquisa sobre IA se confere.');

        await G.fact(['estudo_balancos_retirado', 'reino_unido_copilot_tarefas'], { titulo: 'Para o cético que mora em você' });
        await G.lesson('A IA ensina e interpreta. *A conta, você confere.*\n- Peça a conta à mostra, passo a passo.\n- Deixe a planilha (ou a ferramenta de análise) calcular, e confira os totais.\n- Refaça o número importante por outro caminho.\n- Causa de variação é hipótese: confirme com quem conhece a operação.', { titulo: 'Números na mesa' });
      },
    ],
    summary: (G) => {
      const s = (G.allStats() || {}).cap6 || {};
      const lines = [];
      if (s.erroPego) lines.push(s.tentativas === 1 ? 'Erro de conta da IA: pego de primeira ✔' : 'Erro de conta da IA: pego na ' + s.tentativas + 'ª tentativa ✔');
      else if (s.erroPego === false) lines.push('Erro de conta da IA: a Faísca mostrou a linha (da próxima, não passa)');
      lines.push('Impacto da margem conferido por dois caminhos: R$ 2,8 mi');
      if (s.minutosEconomizados) lines.push('Tempo poupado: ~' + s.minutosEconomizados + ' min (estimativa do jogo, já contando a conferência)');
      return lines;
    },
  });
})();

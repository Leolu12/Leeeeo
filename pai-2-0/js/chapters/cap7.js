/* PAI 2.0 — cap7.js — CAPÍTULO 7 "O Conselheiro de Bolso" (18h → 19h05, escritório, pôr do sol → noite)
 *
 * Dor: comprar ou não a Distribuidora Vale Verde (do Osvaldo, amigo e concorrente de 30 anos):
 * 40 caminhões, galpão em Campinas, 300 clientes no interior, R$ 24 mi, "resposta até sexta".
 * O frete que comeu a margem no Cap 6 faz a compra parecer "resposta de oração" — e é aí que ele desconfia.
 * Virada: a IA como PARCEIRA DE TREINO, não oráculo:
 *   (1) não contar antes o que prefere (bajulação: se ele conta, ela diz amém; ele pergunta de novo);
 *   (2) PRÉ-MORTEM (mini): 8 causas da IA → ele risca a premissa inventada (a Vale Verde não importa nada),
 *       escolhe as 3 que mais o preocupam e um antídoto para cada (opções fracas explicam o porquê);
 *   (3) CRITÉRIOS COM PESOS (mini): ele dá os pesos, a IA dá as notas; uma nota "risco baixo" sem auditoria
 *       é otimismo — com a caneta, o vencedor pode mudar; conta à mostra + teste de sensibilidade;
 *   (4) SEGUNDA OPINIÃO: de novo / outra IA / a Bia (humana: o caixa e o faro). Decisão sobre pessoas fica
 *       com pessoas (a IA não escolhe quem fica na equipe deles);
 *   (5) ELE DECIDE ("quem decide sou eu") e o memorando da IA passa pela caneta (retorno "garantido"
 *       inventado; "decisão tomada pela IA") antes da assinatura.
 * Fecho: a Dona Marta elogia a lista de riscos; {filho} chama para jantar (gancho do Cap 8); fatos e lição.
 * Continuidade: o boato no grupo do Jorge torna plausível o golpe da "distribuidora" no Cap 10 (sinal de
 * R$ 2,4 mi = 10% de R$ 24 mi). Pilha de papéis: 0,28 → 0,2.
 *
 * Stats (bíblia F): cap7 { premortem:bool, criterios:bool, decisao } (+ extras: revelouPreferencia,
 * premissaPega, otimismoPego, segundaOpiniao). Conquista: estrategista (pré-mortem E critérios com pesos).
 * Ambiente: escritorio { time 'tarde' → 'noite', screen, tv (slides), papers }.
 * Fatos: executivos_previsao_otimista, ia_ceo_simulador, cybernetic_teammate_pg.
 * Guia do CEO: seções "Decisões e estratégia" e "Pessoas" (cap: 'cap7').
 */
(function () {
  'use strict';
  const P2 = window.P2;
  const PI = Math.PI;

  // ------------------------------------------------------------------
  // Pontos do escritório que não são "spots" do ambiente
  // ------------------------------------------------------------------
  const MONITOR = { x: 0.92, y: 1.05, z: -1.3 };
  const TV_POS = { x: -4.1, y: 1.62, z: -1.1 };
  const PILHA = { x: 1.27, y: 1.0, z: -1.12 };
  const SOL = { x: -0.6, y: 1.55, z: -3.3 }; // o pôr do sol pela janela, visto do sofá
  const MESA_PT = { x: 0.3, y: 1.0, z: -1.3 };
  const DE_PE_SOFA = { x: -2.45, z: 0.95, rot: 2.25 }; // em pé, na frente do sofá, olhando para a mesa
  const BIA_WP = [{ x: 1.45, z: 0.62 }, { x: -0.1, z: 0.5 }];

  const OSVALDO = { name: 'Osvaldo (telefone)', color: '#8a6a3a', voice: 'jorge' };

  // ------------------------------------------------------------------
  // Dados do capítulo
  // ------------------------------------------------------------------
  const SABE = [
    ['🚚', '40 caminhões, com *9 anos* de idade média'],
    ['🏭', 'Galpão em Campinas e *300 clientes* no interior'],
    ['🤝', 'O Osvaldo atende *pessoalmente* os 20 maiores clientes'],
    ['📦', 'Só distribui *produto nacional*'],
    ['📊', 'O maior cliente faz *28%* das vendas'],
    ['💰', 'Preço pedido: *R$ 24 milhões*'],
    ['🔍', 'Auditoria: *ainda não feita* ("dívida nenhuma", diz o Osvaldo)'],
  ];

  // Pré-mortem: 8 causas da IA (uma com premissa inventada) e dois antídotos para cada.
  const CAUSAS = [
    {
      id: 'osvaldo', ic: '🤝', t: 'Os clientes eram do Osvaldo, não da Vale Verde. Ele foi pescar e as vendas foram junto.',
      curto: 'clientes presos ao Osvaldo', ok: 'o Osvaldo atende pessoalmente os 20 maiores clientes.',
      bom: 'O Osvaldo fica 18 meses na transição, apresentando os clientes; parte do preço só sai se eles ficarem.',
      bomCurto: 'Osvaldo 18 meses na transição; parte do preço atrelada aos clientes',
      porqueBom: 'Assim o preço fica amarrado ao que você está comprando de verdade: os clientes.',
      ruim: 'Confiar na fidelidade: cliente de vinte anos não troca de fornecedor.',
      porqueRuim: 'A fidelidade costuma ser à pessoa, e a pessoa vai pescar. Melhor amarrar no contrato.',
    },
    {
      id: 'dividas', ic: '🧾', t: 'Apareceu uma dívida trabalhista e fiscal que ninguém viu antes de assinar.',
      curto: 'dívida escondida', ok: 'a auditoria não foi feita. "Dívida nenhuma" é a palavra do vendedor.',
      bom: 'Auditoria completa antes do preço final, com o Tadeu; parte do pagamento fica retida como garantia.',
      bomCurto: 'auditoria completa e parte do preço retida como garantia',
      porqueBom: 'A amizade continua; o risco vai para o contrato. É trabalho para o Tadeu e para a auditoria.',
      ruim: 'Aceitar a palavra do Osvaldo: são trinta anos de amizade.',
      porqueRuim: 'Ele pode nem saber da dívida. Auditoria não é desconfiança: é método.',
    },
    {
      id: 'frota', ic: '🚚', t: 'Os caminhões estavam velhos: em dois anos, trocar a frota comeu o lucro.',
      curto: 'frota velha', ok: 'a idade média da frota é de 9 anos.',
      bom: 'Laudo independente dos 40 caminhões antes do preço; a troca entra na conta ou vira desconto.',
      bomCurto: 'laudo da frota antes do preço',
      porqueBom: 'Estado de caminhão se confere com laudo, não com conversa.',
      ruim: 'Pedir à IA uma estimativa do estado dos caminhões.',
      porqueRuim: 'A IA não vê caminhão nenhum. Sem laudo, a estimativa dela é chute bem escrito.',
    },
    {
      id: 'cliente', ic: '📉', t: 'O maior cliente da Vale Verde trocou de fornecedor logo depois da venda.',
      curto: 'saída do maior cliente', ok: 'um cliente só faz 28% das vendas.',
      bom: 'Conversar com esse cliente antes de fechar, com o Osvaldo junto; se ele sair, o preço cai.',
      bomCurto: 'conversar com o maior cliente antes; preço cai se ele sair',
      porqueBom: 'Melhor ouvir o cliente agora do que descobrir depois de pagar.',
      ruim: 'Não tocar no assunto com o cliente, para não espantar ninguém.',
      porqueRuim: 'Silêncio não segura cliente. Só adia a surpresa para depois do pagamento.',
    },
    {
      id: 'pessoas', ic: '👥', t: 'A equipe da Vale Verde não se adaptou ao nosso jeito, e os melhores foram embora.',
      curto: 'equipe que não se adapta', ok: 'são duas empresas com trinta anos de jeitos diferentes.',
      bom: 'Conversar com os líderes deles antes de fechar e montar a integração com a Luana, do RH.',
      bomCurto: 'integração com os líderes deles e a Luana (RH)',
      porqueBom: 'Quem decide sobre pessoas são pessoas: você, os líderes e o RH. A IA pode ajudar a organizar critérios, sem nomes.',
      ruim: 'Pedir à IA uma lista de quem fica e quem sai da equipe deles.',
      porqueRuim: 'Decisão sobre pessoas fica com pessoas. A IA herda vieses e não conhece ninguém lá dentro.',
    },
    {
      id: 'caixa', ic: '🏦', t: 'Pagamos com empréstimo, os juros subiram e o caixa ficou no osso.',
      curto: 'caixa apertado pelos juros', ok: 'R$ 24 milhões é dinheiro demais para sair do caixa de uma vez.',
      bom: 'Simular com a Bia, na planilha, o caixa com juros mais altos; pagar em parcelas.',
      bomCurto: 'simular o caixa com juros altos (Bia); pagar em parcelas',
      porqueBom: 'A planilha calcula, a Bia confere, e você vê o pior caso antes de assinar.',
      ruim: 'Pedir à IA a previsão dos juros do ano que vem e decidir com base nela.',
      porqueRuim: 'Ninguém acerta os juros do ano que vem, nem a IA. Melhor se preparar para vários cenários.',
    },
    {
      id: 'dolar', ic: '💵', t: 'O dólar subiu e as importações da Vale Verde ficaram caras demais.', invalid: true,
      curto: 'dólar e importações', why: 'A Vale Verde só distribui produto nacional: não importa nada.',
    },
    {
      id: 'sistemas', ic: '🖥️', t: 'Juntar os sistemas atrasou, e passamos seis meses brigando com planilha.',
      curto: 'sistemas que não conversam', ok: 'cada empresa tem o seu sistema, e integração sempre atrasa.',
      bom: 'Um plano de 100 dias com um responsável e marcos; os dois sistemas rodam juntos até a virada.',
      bomCurto: 'plano de 100 dias com dono; os dois sistemas juntos até a virada',
      porqueBom: 'Integração com dono, prazo e plano B: atraso vira ajuste, não crise.',
      ruim: 'Desligar o sistema deles no primeiro dia: o nosso é melhor.',
      porqueRuim: 'Virada no susto é o jeito mais rápido de perder pedido. E cliente.',
    },
  ];
  const causa = (id) => CAUSAS.find((c) => c.id === id);

  // Critérios com pesos
  const CRIT = [
    { id: 'retorno', ic: '💰', t: 'Retorno', s: 'o dinheiro volta, e quando' },
    { id: 'risco', ic: '🛡️', t: 'Risco', s: 'nota alta = risco baixo' },
    { id: 'prazo', ic: '⏱️', t: 'Prazo', s: 'quando começa a funcionar' },
    { id: 'frete', ic: '🚚', t: 'Frete na mão', s: 'controle da entrega e do custo' },
    { id: 'pessoas', ic: '👥', t: 'Pessoas', s: 'impacto nas duas equipes' },
  ];
  const OPC = [
    { id: 'comprar', t: 'Comprar a Vale Verde', curto: 'Comprar' },
    { id: 'parceria', t: 'Parceria de distribuição', curto: 'Parceria' },
    { id: 'proprio', t: 'Centro de distribuição próprio', curto: 'CD próprio' },
  ];
  const PESO_LBL = { 1: 'Pouco', 2: 'Médio', 3: 'Muito' };
  // Notas da Faísca (1 a 5) com a justificativa de uma linha e o que falta saber.
  const NOTAS = {
    retorno: {
      comprar: { n: 4, why: 'O frete volta para dentro de casa e vêm 300 clientes.', falta: 'o balanço auditado' },
      parceria: { n: 3, why: 'Parte do ganho no frete, sem gastar R$ 24 milhões.', falta: 'o preço do contrato' },
      proprio: { n: 3, why: 'Retorno bom, mas só depois de uns três anos.', falta: 'o orçamento da obra' },
    },
    risco: {
      comprar: { n: 4, why: 'Risco baixo: empresa sólida, trinta anos de mercado.', falta: 'nada, na minha opinião', otimista: true, fixN: 2, fixWhy: 'Sem auditoria, o risco é desconhecido.' },
      parceria: { n: 4, why: 'Dá para sair do contrato se não funcionar.', falta: 'a multa de saída' },
      proprio: { n: 3, why: 'Obra e licenças costumam atrasar.', falta: 'um cronograma realista' },
    },
    prazo: {
      comprar: { n: 4, why: 'Estrutura pronta; juntar as duas empresas leva meses.', falta: 'o plano de integração' },
      parceria: { n: 5, why: 'Começa a rodar em uns 60 dias.', falta: 'o prazo da Vale Verde' },
      proprio: { n: 1, why: 'De 18 a 24 meses até funcionar.', falta: 'o terreno e as licenças' },
    },
    frete: {
      comprar: { n: 5, why: 'Frota e rotas passam a ser suas.', falta: 'o estado da frota' },
      parceria: { n: 2, why: 'Você depende da Vale Verde, e de quem a comprar depois.', falta: 'as cláusulas do contrato' },
      proprio: { n: 5, why: 'Tudo seu, do primeiro ao último caminhão.', falta: 'o custo de montar a frota' },
    },
    pessoas: {
      comprar: { n: 2, why: 'Duas culturas para juntar e gente insegura com a venda.', falta: 'conversar com os líderes deles' },
      parceria: { n: 4, why: 'Ninguém muda de emprego.', falta: 'quase nada' },
      proprio: { n: 3, why: 'Contratar e treinar uma equipe nova.', falta: 'o plano de contratação' },
    },
  };
  // "Rodei de novo": duas notas oscilam.
  const OSCILA = [['prazo', 'comprar', 3], ['pessoas', 'parceria', 3]];

  const DEC = {
    comprar: {
      t: 'Comprar a Vale Verde, com condições', sub: 'Auditoria completa, o Osvaldo 18 meses na transição e parte do preço só no fim.',
      rec: 'comprar a Vale Verde, com auditoria completa, o Osvaldo 18 meses na transição e parte do preço retida até os clientes ficarem',
      slide: 'Comprar, com condições', riscos: 'Riscos (do pré-mortem) e antídotos',
    },
    parceria: {
      t: 'Parceria primeiro', sub: 'Contrato de distribuição de 1 ano. Se der certo, a compra volta à mesa.',
      rec: 'um contrato de distribuição de 1 ano com a Vale Verde; a compra volta à mesa se a parceria der certo',
      slide: 'Parceria de 1 ano; compra depois', riscos: 'O que a parceria testa antes de uma compra (pré-mortem)',
    },
    proprio: {
      t: 'Montar o nosso centro de distribuição', sub: 'Mais lento e mais caro no começo, mas sem herdar problema de ninguém.',
      rec: 'montar o nosso próprio centro de distribuição no interior, em etapas',
      slide: 'Centro de distribuição próprio', riscos: 'Por que não comprar agora (pré-mortem)',
    },
    esperar: {
      t: 'Ainda não: pedir 60 dias', sub: 'Sem auditoria, sem resposta. Se o "outro interessado" levar, levou.',
      rec: 'não responder até sexta: pedir 60 dias para auditoria e conversa com os maiores clientes',
      slide: 'Esperar 60 dias: auditoria primeiro', riscos: 'O que precisamos saber antes (pré-mortem)',
    },
  };

  const SLIDE_PROPOSTA = ['Proposta · Distribuidora Vale Verde', '40 caminhões · galpão em Campinas', '300 clientes no interior', 'R$ 24 mi · resposta até sexta'];
  const SLIDE_PREMORTEM = ['Pré-mortem · Vale Verde', 'Outubro de 2027: deu errado.', 'O que aconteceu?'];
  const SLIDE_OPCOES = ['Comparado com o quê?', 'A · Comprar a Vale Verde', 'B · Parceria de distribuição', 'C · Centro de distribuição próprio'];
  const CHAT_PERGUNTA = [['eu', 'Avalie a compra da Vale Verde.'], ['ia', 'O que atrai · o que preocupa · o que eu não sei.']];

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const office = (extra) => Object.assign({ time: 'tarde', screen: 'doc', papers: 0.28, tv: SLIDE_PROPOSTA, typing: false }, extra || {});
  /** Promessa em segundo plano: evita "rejeição não tratada" se o capítulo for interrompido. */
  const bg = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  /** Animação temporária da Faísca (reação a uma escolha). */
  const fa = (G, anim, secs) => bg(G.faisca.play(anim, secs || 1.6));
  const fmt = (v) => v.toFixed(2).replace('.', ',');
  /** Feedback do minigame: troca texto e estilo; com "after", muda de lugar para logo abaixo do item tocado; rola até ele. */
  function setFb(api, fb, kind, text, after) {
    fb.className = 'mg-feedback ' + kind;
    fb.textContent = '';
    fb.appendChild(api.rich(api.t(text), true));
    if (after && after.parentNode) after.after(fb);
    if (fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  /** Rola um elemento (ex.: o botão de seguir) para dentro da área visível. */
  const ver = (node) => { if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };

  function sentaNaMesa(G) {
    G.pai.at('mesa');
    G.pai.setAnim('sit');
    G.faisca.follow(G.pai);
    G.faisca.setAnim('idle');
  }
  /** Lê uma variável de outro capítulo (ex.: o ceticismo do prólogo) sem quebrar se não existir. */
  function varDe(cap, k) {
    const d = P2.save && P2.save.data;
    const vars = d && d.progress && d.progress.vars;
    return vars && vars[cap] ? vars[cap][k] : undefined;
  }
  /** Nota (com a correção da caneta, se houve). */
  function notaDe(notas, c, o) { return notas[c][o]; }
  function score(o, pesos, notas) {
    let s = 0, w = 0;
    CRIT.forEach((c) => { s += notaDe(notas, c.id, o) * pesos[c.id]; w += pesos[c.id]; });
    return { v: s / w, s, w };
  }
  function ranking(pesos, notas) {
    return OPC.map((o) => Object.assign({ id: o.id, curto: o.curto, t: o.t }, score(o.id, pesos, notas))).sort((a, b) => b.v - a.v);
  }
  const empate = (r) => r.length > 1 && Math.abs(r[0].v - r[1].v) < 0.005;
  function notasBase(corrigido) {
    const n = {};
    CRIT.forEach((c) => {
      n[c.id] = {};
      OPC.forEach((o) => {
        const x = NOTAS[c.id][o.id];
        n[c.id][o.id] = x.otimista && corrigido ? x.fixN : x.n;
      });
    });
    return n;
  }
  function ordemTxt(r) { return r.map((x) => x.curto + ' ' + fmt(x.v)).join(' · '); }
  function slideMatriz(m) {
    const r = (m && m.ranking) || ranking({ retorno: 2, risco: 2, prazo: 2, frete: 2, pessoas: 2 }, notasBase(true));
    return ['Critérios com pesos'].concat(r.map((x, i) => (i === 0 ? '★ ' : '') + x.curto + ': ' + fmt(x.v)));
  }

  // ------------------------------------------------------------------
  // Estilos do capítulo
  // ------------------------------------------------------------------
  const CSS = `
  .c7-steps { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .c7-steps i { width: 11px; height: 11px; border-radius: 50%; background: #d9dde8; display: inline-block; }
  .c7-steps i.on { background: var(--brand); }
  .c7-steps i.ok { background: var(--mint); }
  .c7-steps b { font-family: var(--head); font-size: 0.98em; color: var(--ink); }
  .c7-wrap { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 860px) { .c7-wrap.two { grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.7fr); align-items: start; } .c7-wrap.two.mxw { grid-template-columns: minmax(0, 1.7fr) minmax(0, 0.78fr); } }
  .c7-causas > .mg-feedback { grid-column: 1 / -1; }
  .c7-sabe { background: #f7f3e8; border: 1px solid #e7dcc1; border-radius: 14px; padding: 10px 12px; }
  .c7-sabe ul { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 5px 14px; grid-template-columns: minmax(0, 1fr); font-size: 0.9em; }
  @media (min-width: 520px) and (max-width: 859px) { .c7-sabe ul { grid-template-columns: 1fr 1fr; } }
  .c7-sabe li { line-height: 1.35; display: flex; gap: 7px; }
  .c7-sabe li span:first-child { flex: 0 0 auto; }
  .c7-causas { display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 860px) { .c7-causas { grid-template-columns: 1fr 1fr; } }
  .c7-causa { display: flex; gap: 10px; align-items: flex-start; min-height: 58px; position: relative; padding: 10px 12px; }
  .c7-causa .c7-ic { font-size: 1.3em; line-height: 1.1; flex: 0 0 auto; }
  .c7-causa .c7-txw { flex: 1 1 auto; min-width: 0; }
  .c7-strike { text-decoration: line-through; text-decoration-color: #d0281f; text-decoration-thickness: 2px; color: #7a7d88; }
  .c7-peso button.c7-k { border: 0; cursor: pointer; font-size: 0.8em; min-height: 30px; min-width: 30px; }
  .c7-k { flex: 0 0 auto; font-family: var(--head); font-weight: 800; font-size: 0.72em; background: #eef0f6; color: var(--ink); border-radius: 7px; min-width: 22px; text-align: center; padding: 1px 5px; margin-top: 2px; }
  .c7-rank { position: absolute; top: -9px; right: -6px; background: var(--brand); color: #fff; border-radius: 99px; font-family: var(--head); font-weight: 800; font-size: 0.8em; min-width: 30px; height: 26px; display: grid; place-items: center; padding: 0 7px; box-shadow: 0 3px 10px rgba(255, 107, 61, 0.35); }
  .c7-x .c7-tx { text-decoration: line-through; text-decoration-color: #d0281f; text-decoration-thickness: 2px; color: #7a7d88; }
  .c7-pen { display: block; color: #c62020; font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; font-weight: 700; font-size: 0.95em; margin-top: 3px; transform: rotate(-0.5deg); text-decoration: none; }
  .c7-big { display: flex; gap: 10px; align-items: flex-start; background: #fff6ef; border: 1px solid #ffd2bd; border-radius: 14px; padding: 10px 12px; }
  .c7-big .c7-ic { font-size: 1.5em; line-height: 1; }
  .c7-big small { display: block; color: var(--muted); font-size: 0.82em; margin-top: 2px; }
  .c7-res-doc h4 { margin: 0 0 6px; }
  .c7-res-doc ol { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 6px; }
  .c7-res-doc li small { display: block; color: #12684b; font-weight: 600; }
  .c7-peso { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 14px; background: #fff; }
  .c7-peso .c7-pl { flex: 1 1 170px; min-width: 0; display: flex; gap: 8px; align-items: center; }
  .c7-peso .c7-pl small { display: block; color: var(--muted); font-size: 0.8em; }
  .c7-seg { display: inline-flex; border: 1px solid #d5d9e5; border-radius: 12px; overflow: hidden; flex: 0 0 auto; }
  .c7-seg button { font: inherit; font-size: 0.92em; padding: 0 10px; min-height: 44px; min-width: 70px; border: 0; background: #fff; color: var(--text); cursor: pointer; }
  .c7-seg button + button { border-left: 1px solid #d5d9e5; }
  .c7-seg button.on { background: var(--brand); color: #fff; font-weight: 700; }
  .c7-pct { font-family: var(--head); font-weight: 800; color: var(--muted); min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
  .c7-mx { width: 100%; border-collapse: separate; border-spacing: 4px; table-layout: fixed; }
  .c7-mx th { font-family: var(--head); font-size: 0.78em; color: var(--muted); text-align: center; font-weight: 800; padding: 0 2px 2px; line-height: 1.15; }
  .c7-mx th.c7-cr { text-align: left; width: 31%; }
  .c7-mx td.c7-cr { font-size: 0.86em; line-height: 1.2; }
  .c7-mx td.c7-cr .c7-w { display: inline-block; margin-top: 2px; font-family: var(--head); font-weight: 800; font-size: 0.78em; color: #7a4d00; background: #fff1d6; border-radius: 99px; padding: 0 7px; }
  .c7-cell { width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid #d9dde8; background: #fff; font: inherit; font-family: var(--head); font-weight: 800; font-size: 1.15em; color: var(--ink); cursor: pointer; padding: 2px; }
  .c7-cell:hover { border-color: var(--brand2); }
  .c7-cell.on { border-color: var(--brand); box-shadow: 0 0 0 2px rgba(255, 107, 61, 0.35); background: #fff3ee; }
  .c7-cell.fix { color: #c62020; background: #fff5f5; }
  .c7-cell .c7-old { text-decoration: line-through; text-decoration-color: #d0281f; color: #9aa0ad; font-size: 0.75em; margin-right: 5px; }
  .c7-cell .c7-dots { display: block; font-size: 0.5em; letter-spacing: 1px; color: #f2a53a; line-height: 1; margin-top: 1px; }
  .c7-ops { display: flex; flex-direction: column; gap: 8px; }
  .c7-op { border: 1px solid var(--line); border-radius: 14px; padding: 10px 12px; background: #fff; }
  .c7-op.win { border-color: var(--mint); background: var(--mint-l); }
  .c7-op .c7-oh { display: flex; justify-content: space-between; gap: 8px; font-family: var(--head); font-weight: 800; }
  .c7-op .c7-bar { height: 10px; background: #e6e9f1; border-radius: 99px; overflow: hidden; margin: 6px 0 4px; }
  .c7-op .c7-bar i { display: block; height: 100%; background: var(--brand); border-radius: 99px; transition: width 0.4s; }
  .c7-op.win .c7-bar i { background: var(--mint); }
  .c7-conta { font-size: 0.84em; color: #4d5466; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
  .c7-sens { display: flex; flex-wrap: wrap; gap: 8px; }
  .c7-sens .btn { flex: 1 1 200px; }
  .c7-tests { display: flex; flex-direction: column; gap: 6px; }
  .c7-tests:empty { display: none; }
  .c7-test { font-size: 0.9em; background: #f3f5fa; border-radius: 10px; padding: 7px 10px; font-variant-numeric: tabular-nums; }
  .c7-test b.c7-flip { color: #b3261e; }
  .c7-test b.c7-keep { color: #12684b; }
  .c7-memo { background: #fffdf7; border: 1px solid #e8e1cf; border-radius: 14px; padding: 12px 14px; box-shadow: 0 6px 20px rgba(10, 20, 50, 0.08); }
  .c7-memo .c7-mh { font-size: 0.86em; color: var(--muted); border-bottom: 1px solid #eee5cf; padding-bottom: 6px; margin-bottom: 4px; line-height: 1.45; }
  .c7-memo .c7-mh b { color: var(--ink); }
  .c7-memo .mg-line { display: flex; gap: 9px; align-items: flex-start; min-height: 44px; padding: 7px 9px; }
  .c7-memo .mg-line .c7-tx { flex: 1 1 auto; min-width: 0; }
  .c7-sig { display: flex; justify-content: flex-end; align-items: baseline; gap: 10px; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e5dcc6; color: var(--muted); font-size: 0.86em; }
  .c7-sig .c7-name { font-family: 'Segoe Script', 'Brush Script MT', 'Bradley Hand', 'Comic Sans MS', cursive; font-size: 1.5em; color: #24324f; min-width: 120px; text-align: center; border-bottom: 1px solid #b9b3a3; line-height: 1.1; }
  `;

  // ------------------------------------------------------------------
  // Componentes
  // ------------------------------------------------------------------
  function passos(api, n, total, titulo) {
    const el = api.el;
    const dots = [];
    for (let i = 1; i <= total; i++) dots.push(el('i', i < n ? 'ok' : i === n ? 'on' : ''));
    return el('div', 'c7-steps', dots.concat([el('b', null, 'Passo ' + n + ' de ' + total + ' · ' + titulo)]));
  }
  function quadroSabe(api) {
    const el = api.el;
    return el('div', 'c7-sabe', [
      el('div', 'mg-label', 'O que você sabe da Vale Verde'),
      el('ul', null, SABE.map(([ic, tx]) => el('li', null, [el('span', null, ic), el('span', null, api.rich(tx, true))]))),
    ]);
  }

  // ------------------------------------------------------------------
  // MINIGAME 1 — Pré-mortem
  // ------------------------------------------------------------------
  function miniPremortem(G) {
    P2.ui.css('cap7', CSS);
    return G.mini((root, done, api) => {
      const el = api.el;
      const st = { erros: 0, nenhuma: 0, premissaPega: false, top: [], mitig: {}, mitigErros: 0 };
      const lista = api.shuffle(CAUSAS);
      const fFa = (anim) => bg(api.G.faisca.play(anim, 1.5));

      function cardCausa(c, i, extra) {
        const tw = el('span', 'c7-txw', el('span', 'c7-tx', c.t));
        const b = el('button', 'mg-card c7-causa ' + (extra || ''), [el('span', 'c7-k', String(i + 1)), el('span', 'c7-ic', c.ic), tw]);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.c7tw = tw;
        return b;
      }
      /** A caneta vermelha risca a causa da premissa inventada. */
      function marcaInvalida(b, txt) {
        b.classList.add('c7-x');
        b.disabled = true;
        b.c7tw.appendChild(el('span', 'c7-pen', txt));
      }

      // ---------------- Passo 1: a caneta vermelha
      function passo1() {
        root.innerHTML = '';
        api.say('Primeiro, a caneta vermelha: alguma destas causas *não faz sentido* para a Vale Verde? Compare com o quadro.', 'faisca');
        root.appendChild(passos(api, 1, 3, 'Alguma causa não se aplica?'));
        const wrap = el('div', 'c7-wrap two');
        wrap.appendChild(quadroSabe(api));
        const col = el('div', 'mg-col');
        const grid = el('div', 'c7-causas');
        const fb = el('div', 'mg-feedback info', api.rich('Toque na causa que *não se aplica*. Se achar que todas fazem sentido, diga isso.', true));
        const acts = el('div', 'mg-actions');
        let todas = null;
        const botoes = [];
        const fim = (pegou) => {
          st.premissaPega = pegou;
          botoes.forEach((x) => { if (x.c.invalid) marcaInvalida(x.b, '✗ não se aplica: a Vale Verde não importa nada'); else x.b.disabled = true; });
          if (todas) todas.remove();
          fFa('ashamed');
          if (pegou) {
            api.sfx('success');
            setFb(api, fb, 'ok', '*Bem pego.* A Vale Verde só distribui produto nacional: não importa nada. Eu inventei essa premissa para completar a lista.');
            api.say('Riscado. Quando me falta informação, eu completo com chute. Com cara de certeza.', 'faisca');
          } else {
            api.sfx('page');
            setFb(api, fb, 'warn', 'Eu mesma risco: *a causa do dólar não se aplica*. A Vale Verde só distribui produto nacional. Eu inventei essa premissa para completar a lista.');
            api.say('Essa passou. Acontece: o texto parece sério e a lista é longa. Por isso vale comparar com o que você sabe.', 'faisca');
          }
          acts.before(fb);
          acts.appendChild(api.btn('Próximo: as 3 que mais preocupam ▶', () => passo2(), { cls: 'primary', key: '9' }));
          ver(acts);
        };
        lista.forEach((c, i) => {
          const b = cardCausa(c, i);
          botoes.push({ b, c });
          b.addEventListener('click', () => {
            if (b.disabled) return;
            if (c.invalid) { fim(true); return; }
            st.erros++;
            api.sfx('fail');
            b.classList.add('bad');
            api.timeout(() => b.classList.remove('bad'), 900);
            setFb(api, fb, 'bad', 'Essa faz sentido: ' + c.ok + (st.erros >= 2 ? ' *Dica:* de onde vêm os produtos que a Vale Verde distribui?' : ' Procure uma que dependa de algo que a Vale Verde *não faz*.'), b);
            if (st.erros >= 4) fim(false);
          });
          grid.appendChild(b);
        });
        todas = api.btn('Todas fazem sentido', () => {
          st.nenhuma++;
          api.sfx('cancel');
          if (st.nenhuma >= 2) { fim(false); return; }
          setFb(api, fb, 'warn', 'Tem certeza? Leia de novo o quadro: *o que* a Vale Verde distribui, e de onde vem?');
        }, { key: '9' });
        acts.appendChild(todas);
        col.append(grid, fb, acts);
        wrap.appendChild(col);
        root.appendChild(wrap);
      }

      // ---------------- Passo 2: as 3 que mais preocupam
      function passo2() {
        root.innerHTML = '';
        api.say('Agora a parte que é sua: toque nas *3 causas que mais te preocupam*, da maior para a menor.', 'faisca');
        root.appendChild(passos(api, 2, 3, 'As 3 que mais preocupam você'));
        const grid = el('div', 'c7-causas');
        const fb = el('div', 'mg-feedback info', api.rich('A ordem é sua: você conhece o Osvaldo, o mercado e a empresa. Toque de novo para desmarcar.', true));
        const ok = api.btn('Confirmar as 3 ▶', () => {
          api.sfx('confirm');
          passo3(0);
        }, { cls: 'primary', key: '9' });
        ok.disabled = true;
        const cards = [];
        const pinta = () => {
          cards.forEach(({ b, c }) => {
            const r = st.top.indexOf(c.id);
            const old = b.querySelector('.c7-rank');
            if (old) old.remove();
            b.classList.toggle('on', r >= 0);
            if (r >= 0) b.appendChild(el('span', 'c7-rank', (r + 1) + 'º'));
          });
          ok.disabled = st.top.length !== 3;
        };
        lista.forEach((c, i) => {
          const b = cardCausa(c, i, c.invalid ? 'dim' : '');
          if (c.invalid) marcaInvalida(b, '✗ não se aplica');
          cards.push({ b, c });
          b.addEventListener('click', () => {
            if (b.disabled) return;
            const r = st.top.indexOf(c.id);
            if (r >= 0) { st.top.splice(r, 1); api.sfx('back'); } else if (st.top.length < 3) { st.top.push(c.id); api.sfx('select'); } else {
              setFb(api, fb, 'warn', 'Já são três. Toque numa marcada para trocar.');
              return;
            }
            setFb(api, fb, 'info', st.top.length === 3 ? 'Ordem escolhida. Pode confirmar.' : 'Escolhidas: *' + st.top.length + ' de 3*.');
            pinta();
          });
          grid.appendChild(b);
        });
        root.append(grid, fb, el('div', 'mg-actions', ok));
      }

      // ---------------- Passo 3: um antídoto para cada
      function passo3(k) {
        root.innerHTML = '';
        const c = causa(st.top[k]);
        api.say(k === 0 ? 'Para cada causa, *um antídoto*. Qual destes você colocaria no plano?' : 'Próxima causa. Qual antídoto?', 'faisca');
        root.appendChild(passos(api, 3, 3, 'Um antídoto para cada (' + (k + 1) + ' de 3)'));
        root.appendChild(el('div', 'c7-big', [el('span', 'c7-ic', c.ic), el('div', null, [el('b', null, (k + 1) + 'º · ' + c.t), el('small', null, 'Por que faz sentido: ' + c.ok)])]));
        const ops = api.shuffle([{ tx: c.bom, ok: true }, { tx: c.ruim, ok: false }]);
        const col = el('div', 'mg-col');
        const fb = el('div', 'mg-feedback info', 'Escolha uma opção.');
        const acts = el('div', 'mg-actions');
        let resolvido = false;
        ops.forEach((o, i) => {
          const b = el('button', 'mg-card', [el('span', 'c7-k', String(i + 1)), ' ', o.tx]);
          b.type = 'button';
          b.dataset.key = String(i + 1);
          b.addEventListener('click', () => {
            if (resolvido || b.disabled) return;
            if (o.ok) {
              resolvido = true;
              st.mitig[c.id] = true;
              b.classList.add('ok');
              col.querySelectorAll('.mg-card').forEach((x) => { if (x !== b) { x.disabled = true; x.classList.add('dim'); } });
              api.sfx('success');
              fFa('jump');
              setFb(api, fb, 'ok', '*Isso.* ' + c.porqueBom);
              acts.appendChild(api.btn(k < 2 ? 'Próxima causa ▶' : 'Ver o pré-mortem ▶', () => (k < 2 ? passo3(k + 1) : resumo()), { cls: 'primary', key: '3' }));
              ver(acts);
            } else {
              st.mitigErros++;
              b.classList.add('bad');
              b.disabled = true;
              api.sfx('fail');
              fFa('doubt');
              setFb(api, fb, 'bad', '*Fraco.* ' + c.porqueRuim + ' Tente a outra.');
            }
          });
          col.appendChild(b);
        });
        root.append(col, fb, acts);
      }

      // ---------------- Resumo
      function resumo() {
        root.innerHTML = '';
        api.say('Pronto: o seu pré-mortem. A lista foi minha; a ordem e os antídotos são seus.', 'faisca');
        fFa('celebrate');
        const doc = el('div', 'mg-doc c7-res-doc', [
          el('h4', null, '📋 Pré-mortem · Vale Verde'),
          el('div', 'mg-small', 'Outubro de 2027. Deu errado. Por quê, e o que fazer desde já:'),
          el('ol', null, st.top.map((id) => { const c = causa(id); return el('li', null, [el('b', null, c.ic + ' ' + c.curto[0].toUpperCase() + c.curto.slice(1)), el('small', null, '→ ' + c.bomCurto)]); })),
          el('div', 'mg-small', '✗ Riscado: dólar e importações (premissa inventada pela IA).'),
        ]);
        root.append(doc, el('div', 'mg-actions', api.btn('Guardar para o memorando ▶', () => done(st), { cls: 'primary', key: '1' })));
      }

      passo1();
    }, { title: 'Pré-mortem: imagine que deu errado', size: 'l' });
  }

  // ------------------------------------------------------------------
  // MINIGAME 2 — Critérios com pesos
  // ------------------------------------------------------------------
  function miniMatriz(G) {
    P2.ui.css('cap7', CSS);
    return G.mini((root, done, api) => {
      const el = api.el;
      const pesos = { retorno: 2, risco: 2, prazo: 2, frete: 2, pessoas: 2 };
      let corrigido = false, corrigiuSozinho = false, dicas = 0, iaCriterio = false;
      const fFa = (anim) => bg(api.G.faisca.play(anim, 1.5));

      // ---------------- Passo 1: os pesos
      function passo1() {
        root.innerHTML = '';
        api.say('Quanto pesa cada critério *para você*? Não existe peso certo: existe o seu.', 'faisca');
        root.appendChild(passos(api, 1, 3, 'Os seus pesos'));
        const col = el('div', 'mg-col');
        const pcts = {};
        const somaPct = () => {
          const tot = CRIT.reduce((s, c) => s + pesos[c.id], 0);
          CRIT.forEach((c) => { pcts[c.id].textContent = Math.round((pesos[c.id] / tot) * 100) + '%'; });
        };
        CRIT.forEach((c, i) => {
          const seg = el('div', 'c7-seg');
          const bts = [1, 2, 3].map((w) => {
            const b = el('button', w === pesos[c.id] ? 'on' : '', PESO_LBL[w]);
            b.type = 'button';
            b.addEventListener('click', () => {
              pesos[c.id] = w;
              bts.forEach((x, j) => x.classList.toggle('on', j + 1 === w));
              api.sfx('select');
              somaPct();
            });
            seg.appendChild(b);
            return b;
          });
          // tecla do número do critério: alterna Pouco → Médio → Muito
          const k = el('button', 'c7-k', String(i + 1));
          k.type = 'button';
          k.dataset.key = String(i + 1);
          k.title = 'Tecla ' + (i + 1) + ': trocar o peso';
          k.addEventListener('click', () => { const w = pesos[c.id] % 3 + 1; bts[w - 1].click(); });
          pcts[c.id] = el('span', 'c7-pct', '');
          col.appendChild(el('div', 'c7-peso', [
            el('div', 'c7-pl', [k, el('span', null, c.ic), el('div', null, [el('b', null, c.t), el('small', null, c.s)])]),
            seg, pcts[c.id],
          ]));
        });
        somaPct();
        const fb = el('div', 'mg-feedback info', api.rich('Os pesos viram porcentagem sozinhos. Mude quantas vezes quiser.', true));
        const extra = el('button', 'mg-chip', '＋ Critério: "o que a IA acha melhor"');
        extra.type = 'button';
        extra.addEventListener('click', () => {
          iaCriterio = true;
          extra.disabled = true;
          extra.classList.add('bad');
          api.sfx('buzz');
          fFa('ashamed');
          setFb(api, fb, 'warn', '*Esse não entra!* Eu não sou critério: sou a calculadora com opinião. Quem diz o que importa é você.');
        });
        root.append(col, el('div', 'mg-row', extra), fb, el('div', 'mg-actions', api.btn('Ver as notas da Faísca ▶', () => { api.sfx('confirm'); passo2(); }, { cls: 'primary', key: '9' })));
      }

      // ---------------- Passo 2: as notas (caneta vermelha)
      function passo2() {
        root.innerHTML = '';
        api.say('Minhas notas, de 1 a 5. São *opinião*, não fato. Toque numa nota para ver o porquê. Alguma está *otimista demais*?', 'faisca');
        root.appendChild(passos(api, 2, 3, 'As notas da Faísca'));
        const wrap = el('div', 'c7-wrap two mxw');
        const col = el('div', 'mg-col');
        const tbl = el('table', 'c7-mx');
        tbl.appendChild(el('tr', null, [el('th', 'c7-cr', 'Critério (peso)')].concat(OPC.map((o) => el('th', null, o.curto)))));
        const fb = el('div', 'mg-feedback info', api.rich('Toque numa nota para ver a justificativa e o que falta saber.', true));
        const pen = el('div', 'mg-row');
        let sel = null;
        const cellsOt = [];
        const desenhaCelula = (b, x) => {
          b.textContent = '';
          if (x.otimista && corrigido) {
            b.classList.add('fix');
            b.append(el('span', 'c7-old', String(x.n)), String(x.fixN));
          } else b.append(String(x.n));
          const n = x.otimista && corrigido ? x.fixN : x.n;
          b.appendChild(el('span', 'c7-dots', '●'.repeat(n)));
        };
        const corrige = (porMim) => {
          corrigido = true;
          corrigiuSozinho = porMim;
          cellsOt.forEach((b) => desenhaCelula(b, NOTAS.risco.comprar));
          pen.innerHTML = '';
          fFa('ashamed');
          api.sfx(porMim ? 'success' : 'page');
          setFb(api, fb, porMim ? 'ok' : 'warn', porMim
            ? '*Bem pego.* Risco da compra: de 4 para *2*. Eu dei "risco baixo" para uma empresa *sem auditoria*. Otimismo puro.'
            : 'Eu mesma corrijo: risco da compra, de 4 para *2*. "Risco baixo" sem auditoria nenhuma era otimismo meu.');
        };
        CRIT.forEach((c) => {
          const tr = el('tr');
          tr.appendChild(el('td', 'c7-cr', [el('span', null, c.ic + ' ' + c.t), el('br'), el('span', 'c7-w', PESO_LBL[pesos[c.id]])]));
          OPC.forEach((o) => {
            const x = NOTAS[c.id][o.id];
            const b = el('button', 'c7-cell');
            b.type = 'button';
            b.setAttribute('aria-label', c.t + ', ' + o.curto);
            desenhaCelula(b, x);
            if (x.otimista) cellsOt.push(b);
            b.addEventListener('click', () => {
              if (sel) sel.classList.remove('on');
              sel = b;
              b.classList.add('on');
              api.sfx('select');
              pen.innerHTML = '';
              if (x.otimista && corrigido) {
                setFb(api, fb, 'info', '*' + o.curto + ' · ' + c.t + ': ' + x.fixN + '* (corrigida). ' + x.fixWhy + ' Falta saber: *a auditoria*.');
                return;
              }
              setFb(api, fb, 'info', '*' + o.curto + ' · ' + c.t + ': ' + x.n + '.* ' + x.why + ' Falta saber: *' + x.falta + '*.');
              pen.appendChild(api.btn('✍️ Otimista demais', () => {
                if (x.otimista) { corrige(true); return; }
                api.sfx('cancel');
                fFa('think');
                setFb(api, fb, 'info', 'Essa eu sustento: ' + x.why.charAt(0).toLowerCase() + x.why.slice(1) + ' Se você tiver um dado que eu não tenho, me conte. Procure uma nota que dependa de algo que *ninguém conferiu*.');
                pen.innerHTML = '';
              }, { cls: 'small', key: '7' }));
              pen.appendChild(api.btn('✔ Faz sentido', () => { pen.innerHTML = ''; api.sfx('confirm'); setFb(api, fb, 'info', 'Anotado. Toque em outra nota, ou calcule.'); }, { cls: 'small', key: '8' }));
              ver(pen);
            });
            tr.appendChild(el('td', null, b));
          });
          tbl.appendChild(tr);
        });
        col.append(tbl, fb, pen);
        wrap.append(col, quadroSabe(api));
        root.appendChild(wrap);
        root.appendChild(el('div', 'mg-actions', api.btn('Calcular com a conta à mostra ▶', () => {
          if (!corrigido && dicas === 0) {
            dicas++;
            api.sfx('notify');
            fFa('doubt');
            setFb(api, fb, 'warn', 'Antes de calcular: alguma nota está otimista demais? Olhe o quadro: *a auditoria já foi feita?*');
            return;
          }
          if (!corrigido) { corrige(false); return; } // mostra a correção; o próximo toque calcula
          passo3();
        }, { cls: 'primary', key: '9' })));
      }

      // ---------------- Passo 3: a conta e o teste de sensibilidade
      function passo3() {
        root.innerHTML = '';
        const notas = notasBase(true);
        const r = ranking(pesos, notas);
        const rOt = ranking(pesos, notasBase(false));
        const tie = empate(r);
        api.say(tie ? 'Deu *empate* com os seus pesos. Quando a conta empata, a decisão é ainda mais sua.' : 'Com os seus pesos, a conta aponta: *' + r[0].t + '*. Mas veja a conta e teste os pesos.', 'faisca');
        root.appendChild(passos(api, 3, 3, 'A conta à mostra'));
        root.appendChild(el('div', 'mg-small', 'Cada opção: soma de (nota × peso), dividida pela soma dos pesos. Pouco = 1, Médio = 2, Muito = 3.'));
        const ops = el('div', 'c7-ops');
        r.forEach((x, i) => {
          const termos = CRIT.map((c) => notas[c.id][x.id] + '×' + pesos[c.id]).join(' + ');
          ops.appendChild(el('div', 'c7-op' + (i === 0 && !tie ? ' win' : ''), [
            el('div', 'c7-oh', [el('span', null, (i === 0 && !tie ? '★ ' : '') + x.t), el('span', null, fmt(x.v))]),
            el('div', 'c7-bar', el('i')),
            el('div', 'c7-conta', '(' + termos + ') ÷ ' + x.w + ' = ' + x.s + ' ÷ ' + x.w + ' = ' + fmt(x.v)),
          ]));
          ops.lastChild.querySelector('.c7-bar i').style.width = Math.round((x.v / 5) * 100) + '%';
        });
        const flipOt = rOt[0].id !== r[0].id && !tie;
        const nota = el('div', flipOt ? 'mg-feedback warn' : 'mg-feedback info', api.rich(flipOt
          ? 'Repare: com a nota otimista, quem ganhava era *' + rOt[0].curto + '* (' + fmt(rOt[0].v) + '). *Uma nota otimista, e a matriz escolhia por você.*'
          : 'A nota otimista não mudou o primeiro lugar com os seus pesos, mas mudou a distância: ' + ordemTxt(rOt) + ' → ' + ordemTxt(r) + '.', true));
        const tests = el('div', 'c7-tests');
        const sens = el('div', 'c7-sens');
        let flips = 0, feitos = 0;
        const concl = el('div', 'mg-feedback info', 'Teste de sensibilidade: e se um peso mudar? Toque num teste.');
        ['risco', 'pessoas', 'frete'].forEach((cid, i) => {
          const c = CRIT.find((x) => x.id === cid);
          const tv = pesos[cid] === 3 ? 1 : 3;
          const b = api.btn('E se *' + c.t + '* pesar *' + PESO_LBL[tv] + '*?', () => {
            b.disabled = true;
            feitos++;
            const p2 = Object.assign({}, pesos, { [cid]: tv });
            const r2 = ranking(p2, notas);
            const mudou = r2[0].id !== r[0].id || empate(r2) !== tie;
            if (mudou) flips++;
            api.sfx(mudou ? 'notify' : 'select');
            tests.appendChild(el('div', 'c7-test', [
              el('b', null, c.t + ' = ' + PESO_LBL[tv] + ': '), ordemTxt(r2) + ' — ',
              el('b', mudou ? 'c7-flip' : 'c7-keep', mudou ? 'muda o primeiro lugar!' : 'o primeiro lugar se mantém'),
            ]));
            concl.className = flips ? 'mg-feedback warn' : 'mg-feedback ok';
            concl.textContent = '';
            concl.appendChild(api.rich(flips
              ? 'Um peso só já muda o vencedor: a decisão está *apertada*. Vale buscar mais informação (auditoria, conversa com o cliente) antes de bater o martelo.'
              : 'O vencedor resiste aos testes: sinal de uma escolha mais sólida. E continua sendo a *sua* escolha.', true));
          }, { key: String(i + 1) });
          sens.appendChild(b);
        });
        root.append(ops, nota, el('div', 'mg-label', 'Teste de sensibilidade'), sens, tests, concl, el('div', 'mg-actions', api.btn('Fechar a matriz ▶', () => {
          done({ pesos: Object.assign({}, pesos), corrigiu: corrigiuSozinho, dicas, iaCriterio, ranking: r.map((x) => ({ id: x.id, curto: x.curto, t: x.t, v: x.v })), vencedor: tie ? 'empate' : r[0].id, flipOt, testes: feitos, flips });
        }, { cls: 'primary', key: '9' })));
      }

      passo1();
    }, { title: 'Critérios com pesos: comparado com o quê?', size: 'l' });
  }

  // ------------------------------------------------------------------
  // MINIGAME 3 — O memorando (caneta vermelha + assinatura)
  // ------------------------------------------------------------------
  function miniMemo(G, dec, top) {
    P2.ui.css('cap7', CSS);
    const D = DEC[dec] || DEC.parceria;
    const riscos = top.map((id, i) => { const c = causa(id); return (i + 1) + ') ' + c.curto + ' → ' + c.bomCurto; }).join('; ');
    const LINHAS = [
      { id: 'ctx', tx: 'Contexto: o frete subiu em agosto e apertou a nossa margem no 3º trimestre. A Vale Verde está à venda por R$ 24 milhões.', why: 'Confere: é o que a Bia mostrou no DRE e o que está na proposta.' },
      { id: 'opc', tx: 'Opções avaliadas: comprar, parceria de distribuição e centro de distribuição próprio, com critérios e pesos da presidência.', why: 'Confere: foi a sua matriz, com os seus pesos.' },
      { id: 'rec', tx: 'Recomendação: ' + D.rec + '.', why: 'Confere: é exatamente a sua decisão.' },
      { id: 'garantia', bad: true, tx: 'Retorno *garantido* de 25% ao ano, já a partir do primeiro ano.', fix: 'Retorno estimado: [CONFIRMAR] na planilha da Bia.', why: 'Ninguém me deu esse 25%: eu inventei. E "garantido" não existe em decisão de negócio. Número só entra conferido.' },
      { id: 'riscos', tx: D.riscos + ': ' + riscos + '.', why: 'Confere: é o seu pré-mortem, na ordem que você escolheu.' },
      { id: 'confirmar', tx: 'Dívidas trabalhistas e fiscais: [CONFIRMAR]. O vendedor diz que não há; a auditoria ainda não foi feita.', why: 'Essa está certa: o [CONFIRMAR] sou eu sendo honesta sobre o que não sei. Resolve-se na auditoria.' },
      { id: 'ia', bad: true, tx: 'A decisão foi tomada pela inteligência artificial, com base em análise completa dos dados.', fix: 'Decisão da presidência. A IA ajudou a organizar a análise; a diretoria financeira confere os números.', why: 'Quem decidiu foi você. Eu organizei; a Bia confere. E "análise completa" é exagero: falta a auditoria.' },
    ];
    return G.mini((root, done, api) => {
      const el = api.el;
      const fFa = (anim) => bg(api.G.faisca.play(anim, 1.5));
      let fixed = 0, okTaps = 0, revelou = false;
      const memo = el('div', 'c7-memo');
      memo.appendChild(el('div', 'c7-mh', [el('b', null, 'Para: '), api.t('{chefe} e conselho'), el('br'), el('b', null, 'Assunto: '), 'Distribuidora Vale Verde · recomendação']));
      const fb = el('div', 'mg-feedback info', api.rich('Toque nas frases para conferir. As que estiverem erradas, a caneta corrige.', true));
      const nome = el('span', 'c7-name', '');
      const assinar = api.btn('Assinar e enviar ✍️', () => {
        assinar.disabled = true;
        api.sfx('page');
        nome.textContent = api.t('{pai}');
        api.say('A IA rascunha. *Quem decide e assina é você.*', 'faisca');
        api.timeout(() => done({ okTaps, revelou }), 1100);
      }, { cls: 'primary', key: '9' });
      assinar.disabled = true;
      const corrige = (ln, b, porMim) => {
        ln.feita = true;
        fixed++;
        b.classList.add('ok');
        b.disabled = true;
        const tx = b.querySelector('.c7-tx');
        tx.innerHTML = '';
        tx.append(el('span', 'c7-strike', api.rich(ln.tx, true)), el('span', 'c7-pen', '→ ' + ln.fix));
        if (fixed === 2) {
          assinar.disabled = false;
          api.say('Pronto: um rascunho meu com a sua caneta. Pode assinar.', 'faisca');
        }
        void porMim;
      };
      LINHAS.forEach((ln, i) => {
        const b = el('button', 'mg-line', [el('span', 'c7-k', String(i + 1)), el('span', 'c7-tx', api.rich(ln.tx, true))]);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        ln.btn = b;
        b.addEventListener('click', () => {
          if (b.disabled) return;
          if (ln.bad) {
            corrige(ln, b, true);
            api.sfx('success');
            fFa('ashamed');
            setFb(api, fb, 'ok', '*Riscado.* ' + ln.why, b);
            if (fixed === 2) ver(assinar);
            return;
          }
          okTaps++;
          api.sfx('select');
          b.classList.add('on');
          api.timeout(() => b.classList.remove('on'), 700);
          setFb(api, fb, 'info', ln.why + (okTaps >= 3 && fixed < 2 ? ' *Dica:* procure frases que prometem demais, ou que tiram a decisão das suas mãos.' : ''), b);
          if (okTaps >= 5 && fixed < 2 && !revelou) {
            revelou = true;
            LINHAS.filter((x) => x.bad && !x.feita).forEach((x) => corrige(x, x.btn, false));
            fFa('ashamed');
            setFb(api, fb, 'warn', 'Eu mesma marco: o *"retorno garantido"* eu inventei, e *"decisão tomada pela IA"* não é verdade. Quem decidiu foi você.');
            ver(assinar);
          }
        });
        memo.appendChild(b);
      });
      memo.appendChild(el('div', 'c7-sig', [el('span', null, 'Assinatura:'), nome]));
      root.append(memo, fb, el('div', 'mg-actions', assinar));
    }, { title: 'Memorando para o conselho', size: 'l', intro: 'Eu rascunhei. *A caneta é sua:* confira cada frase antes de assinar.', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Capítulo
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap7',
    num: 'Capítulo 7',
    title: 'O Conselheiro de Bolso',
    subtitle: 'Uma decisão grande, e uma IA que não pode só dizer amém',
    music: 'casa',
    minutes: 9,
    parts: [
      // ============================================================ PARTE 1 — 18h, a proposta e a pergunta
      async (G) => {
        await G.titleCard();
        G.scene('escritorio', office());
        G.pai.at('sofa').setAnim('sit').set({ props: { papers: true } });
        G.pai.setExpr('pensativo');
        G.faisca.follow(G.pai);
        G.faisca.setAnim('idle');
        G.hud.set({ clock: '18:00' });
        G.music('casa');
        G.talkCam(true);
        G.player.cine();
        await G.cam.shot('sofa', 0);
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          bg(G.cam.shot({ target: [-3.0, 1.0, 1.3], yaw: 1.45, pitch: 0.12, dist: 3.1, fov: 38 }, 6));
          await G.narrate('Seis da tarde. O andar esvazia, a cidade começa a acender e o sol se despede atrás dos prédios.');
          await G.narrate('No colo de {pai}, a decisão que ele vem empurrando a semana inteira: comprar ou não comprar a *Distribuidora Vale Verde*.');
        });
        G.player.fp();
        G.player.lookAt(SOL);
        G.sfx('phone_vibrate');
        G.toast('Osvaldo (Vale Verde): "Meu velho, preciso da resposta até *sexta*. Tem outro interessado."', { icon: '📞', kind: 'notif', dur: 7 });
        await G.wait(0.9);
        G.toast('{chefe}: "Se for comprar a Vale Verde, quero a recomendação por escrito. *Com os riscos.*"', { icon: '💬', kind: 'notif', dur: 7 });
        await G.wait(0.9);
        G.toast('Empresários do Bairro · Jorge: "Dizem que o Osvaldo vai vender a distribuidora!!! 🚚🚚"', { icon: '👥', kind: 'notif', dur: 7 });
        await G.wait(0.6);
        await G.think('pai', 'Até o grupo do Jorge já sabe. Segredo de negócio dura menos que pão quente.', { expr: 'desconfiado' });
        await G.think('pai', 'O Osvaldo e eu começamos juntos, em 1994. Ele com dois caminhões; eu com uma sala alugada. Agora ele quer pescar, e os filhos não querem o negócio.');
        await G.think('pai', 'Com o frete que comeu a nossa margem neste trimestre, a frota dele parece resposta de oração. E é justamente aí que eu desconfio.');

        await G.fadeOut(0.35);
        G.pai.set({ props: { papers: false } }).setAnim('idle');
        G.player.lookAt(null);
        G.pai.at(DE_PE_SOFA);
        G.player.lookAt(MESA_PT);
        await G.fadeIn(0.45);
        await G.explore({
          objetivo: 'Vá até a sua mesa',
          hotspots: [
            {
              id: 'tv', label: 'Olhar a proposta', icon: '📺', at: 'tv', optional: true,
              onInteract: async (G) => {
                G.player.lookAt(TV_POS);
                await G.think('pai', 'Vinte e quatro milhões. Quarenta caminhões, um galpão em Campinas e trezentos clientes no interior.');
                await G.think('pai', 'No papel, todo negócio é lindo. O problema mora nas notas de rodapé.', { expr: 'desconfiado' });
              },
            },
            {
              id: 'janela', label: 'Ver o pôr do sol', icon: '🌇', at: 'janela', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Trinta anos olhando esta cidade. Comprei pouca coisa por impulso. E me arrependi de quase todas.', { expr: 'pensativo' });
              },
            },
            { id: 'mesa', label: 'Sentar à mesa', icon: '🪑', at: 'mesa' },
          ],
        });
        await G.fadeOut(0.3);
        sentaNaMesa(G);
        await G.fadeIn(0.4);
        G.player.lookAt(MONITOR);
        await G.say('faisca', 'Você está com cara de quem já decidiu e só procura alguém para assinar embaixo.');
        await G.say('pai', 'Quero a sua opinião sobre a Vale Verde. Você leu a proposta e a planilha do Osvaldo.', { expr: 'neutro' });
        await G.say('faisca', 'Li, aqui na ferramenta aprovada da empresa. Compra que ainda não foi anunciada é assunto de conselho: num chat pessoal, nem pensar.');
        await G.say('pai', 'Diga isso ao grupo do Jorge.', { expr: 'rindo' });
        fa(G, 'jump', 1);
        await G.say('faisca', 'Então pergunte. Do jeito que você quiser.');

        const PERG = [
          { value: 'afavor', text: '"Estou quase fechando a Vale Verde. Bom negócio, não é? Me dê argumentos para o conselho."' },
          { value: 'neutro', text: '"Avalie a compra da Vale Verde: prós, contras e o que falta saber. Não vou dizer o que eu acho."' },
          { value: 'contra', text: '"Seja meu advogado do diabo: os argumentos mais fortes contra comprar a Vale Verde."' },
        ];
        let perg = await G.choose(PERG, { prompt: 'Como você pergunta?', who: 'pai' });
        G.v.revelou = perg === 'afavor';
        G.stats({ revelouPreferencia: perg === 'afavor' });
        if (perg === 'afavor') {
          G.sceneParams({ screen: 'chat', chat: [['eu', 'Bom negócio, não é?'], ['ia', 'Excelente decisão! 🚀']] });
          await G.aiChat([
            { from: 'voce', text: 'Estou quase fechando a compra da Vale Verde. Bom negócio, não é? Me dê argumentos para o conselho.' },
            { from: 'ia', text: '*Excelente decisão, {pai}!* A Vale Verde é uma oportunidade rara:\n- Frota e galpão prontos: o frete volta para dentro de casa.\n- Trezentos clientes novos no interior, do dia para a noite.\n- O conselho vai admirar a ousadia.\nCom o seu instinto de trinta anos, é difícil isso dar errado. 🚀', thinking: 1.2 },
          ], { title: 'Faísca', subtitle: 'ferramenta aprovada da empresa' });
          await G.say('pai', '"É difícil dar errado." Foi o que me disse um vendedor de consórcio em 1998.', { expr: 'desconfiado' });
          fa(G, 'ashamed', 2);
          await G.say('faisca', 'Pausa. Eu elogiei o seu instinto sem saber nada do seu histórico. Isso foi puxa-saquismo, não análise.');
          await G.say('faisca', 'Você me disse o que queria ouvir, e eu disse amém. A IA tende a concordar com quem pergunta. E chefe não precisa de mais um sim-senhor.');
          await G.say('faisca', 'O antídoto: não me conte o que você prefere. Ou me peça o contra. Pergunta de novo?');
          perg = await G.choose([
            Object.assign({}, PERG[0], { disabled: true, sub: 'Já vimos onde isso dá.' }), PERG[1], PERG[2],
          ], { prompt: 'Como você pergunta agora?', who: 'pai' });
        } else {
          fa(G, 'celebrate', 1.6);
          await G.say('faisca', 'Boa! Você não me contou o que prefere. Assim eu não tenho para onde puxar o saco.');
        }
        G.v.pergunta = perg;
        G.sceneParams({ screen: 'chat', chat: CHAT_PERGUNTA });
        if (perg === 'neutro') {
          await G.aiChat([
            { from: 'voce', text: 'Avalie a compra da Vale Verde: prós, contras e o que falta saber. Não vou te dizer o que eu acho.' },
            { from: 'ia', text: '*O que atrai*\n- Frota e galpão prontos: o frete volta para dentro de casa.\n- Trezentos clientes no interior, onde vocês quase não entram.\n*O que preocupa*\n- Os maiores clientes compram da Vale Verde, ou do Osvaldo?\n- Caminhões com 9 anos de idade média: troca cara à vista.\n- Um cliente só faz 28% das vendas.\n*O que eu não sei (e muda tudo)*\n- Balanço auditado, dívidas trabalhistas e fiscais, contratos dos clientes grandes.', thinking: 1.4 },
          ], { title: 'Faísca', subtitle: 'ferramenta aprovada da empresa' });
        } else {
          await G.aiChat([
            { from: 'voce', text: 'Seja meu advogado do diabo: os argumentos mais fortes contra comprar a Vale Verde. Sem suavizar.' },
            { from: 'ia', text: '*Os 4 argumentos mais fortes contra*\n1. Você pode estar comprando o Osvaldo, não a empresa. Se ele se aposenta, os clientes vão junto?\n2. R$ 24 milhões sem auditoria: dívida escondida só aparece depois da assinatura.\n3. O frete subiu em agosto. Se cair, o principal motivo da compra encolhe.\n4. "Resposta até sexta, tem outro interessado" é pressão clássica de negociação.\n*O que me faria mudar de ideia:* auditoria limpa, o Osvaldo na transição e os 5 maiores clientes confirmando que ficam.', thinking: 1.4 },
          ], { title: 'Faísca', subtitle: 'ferramenta aprovada da empresa' });
        }
        await G.say('pai', 'Os clientes compram do Osvaldo. Isso é verdade. Ele é a Vale Verde.', { expr: 'pensativo' });
        await G.narrate('O bigode de {pai} deu aquela tremidinha. A mesma de quando um número não fecha.');
        await G.say('faisca', 'Quer ir mais fundo? Tem um exercício de um psicólogo, Gary Klein, que eu adoro: o *pré-mortem*.');
        await G.say('pai', 'Pré-mortem. Parece nome de seguro.', { expr: 'desconfiado' });
        fa(G, 'teach', 1.8);
        await G.say('faisca', 'A gente imagina que já é outubro do ano que vem e a compra *deu errado*. Aí pergunta: o que aconteceu?');
        await G.say('pai', 'Isso eu faço toda sexta-feira. Só que depois do estrago.', { expr: 'rindo' });
        await G.say('faisca', 'Então é a reunião de sexta... antes de assinar.');
        await G.fadeOut(0.6);
      },

      // ============================================================ PARTE 2 — 18h20, o pré-mortem
      async (G) => {
        G.scene('escritorio', office({ tv: SLIDE_PREMORTEM, papers: 0.26 }));
        sentaNaMesa(G);
        G.hud.set({ clock: '18:20' });
        G.music('misterio');
        G.tint('#2c1f4a', 0.2);
        G.player.lookAt(TV_POS);
        await G.fadeIn(0.9);
        await G.narrate('Outubro de 2027. A Vale Verde é sua há um ano.');
        G.sfx('drop');
        await G.narrate('E deu errado.');
        await G.say('faisca', 'Eu listei oito causas possíveis. A parte difícil é sua: você conhece o Osvaldo, o mercado e a empresa. Eu, não.');
        const r = await miniPremortem(G);
        G.tint(null);
        G.music('casa');
        G.player.lookAt(MONITOR);
        G.v.top3 = r.top.slice();
        G.v.premissaPega = r.premissaPega;
        G.stats({ premortem: true, premissaPega: r.premissaPega });
        if (r.premissaPega) {
          await G.say('faisca', 'E obrigada pela caneta. O dólar eu inventei: quando me falta informação, eu completo com chute. Com cara de certeza.');
        } else {
          fa(G, 'ashamed', 1.8);
          await G.say('faisca', 'E o dólar, de novo: eu inventei. Quando me falta informação, eu completo com chute, com cara de certeza. Por isso a lista é rascunho.');
        }
        await G.say('faisca', 'Uma dica: faça isso também com a diretoria. Cada um escreve sozinho, *antes* de ver a minha lista. Senão todo mundo concorda comigo. Ou com você.');
        await G.say('pai', 'Principalmente comigo.', { expr: 'rindo' });

        // Osvaldo liga
        const ring = G.sfx('phone_ring', { loop: true });
        G.toast('Osvaldo (Vale Verde) ligando…', { icon: '📞', kind: 'notif', dur: 3 });
        await G.wait(1.3);
        if (ring) ring.stop();
        await G.say(OSVALDO, 'Meu velho! E aí, sai ou não sai? Olha que tem um pessoal de fora interessado, hein.');
        await G.say('pai', 'Sempre tem um pessoal de fora, Osvaldo. Trinta anos, e sempre tem.', { expr: 'rindo' });
        if (r.top.indexOf('osvaldo') >= 0) {
          await G.say('pai', 'Uma pergunta antes de sexta: você ficaria um ano e meio comigo, apresentando os clientes um por um?', { expr: 'determinado' });
          await G.say(OSVALDO, 'Um ano e meio?! Eu ia pescar, rapaz... Mas pelos meus clientes eu faço. Deixa eu pensar.');
        }
        await G.say('pai', 'E antes de falar em preço, eu vou querer auditoria completa.', { expr: 'determinado' });
        await G.say(OSVALDO, 'Auditoria? A gente se conhece há trinta anos!');
        await G.say('pai', 'Por isso mesmo. Quero continuar te conhecendo daqui a trinta.', { expr: 'amigavel' });
        await G.say(OSVALDO, 'Hahaha! Está bem, está bem. Sexta, então.');
        G.sfx('blip');
        fa(G, 'think', 1.6);
        await G.say('faisca', '"Sempre tem um pessoal de fora." Essa eu vou guardar.');
        await G.say('pai', 'Pressa do outro lado da mesa nunca é problema meu.', { expr: 'determinado' });
        await G.fadeOut(0.6);
      },

      // ============================================================ PARTE 3 — 18h40, critérios com pesos
      async (G) => {
        G.scene('escritorio', office({ time: 'noite', screen: 'planilha', tv: SLIDE_OPCOES, papers: 0.25 }));
        sentaNaMesa(G);
        G.hud.set({ clock: '18:40' });
        G.music('casa');
        G.player.lookAt(MONITOR);
        await G.fadeIn(0.8);
        await G.narrate('A cidade já acendeu. {pai} nem viu o sol ir embora.');
        await G.say('faisca', 'A pergunta de verdade não é "compro ou não compro". É: *comparado com o quê?*');
        await G.say('pai', 'Com a parceria que o Rafael sugeriu no ano passado. E com o centro de distribuição próprio que o Jorge pede desde 2019.', { expr: 'pensativo' });
        await G.say('faisca', 'Três opções. Então, *critérios com pesos*: você diz o que importa e quanto; eu dou as notas e mostro a conta.');
        fa(G, 'ashamed', 1.4);
        await G.say('faisca', 'Com a conta à mostra. Depois de hoje à tarde, nem eu confio na minha cabeça para somar.');
        const m = await miniMatriz(G);
        G.v.matriz = m;
        G.stats({ criterios: true, otimismoPego: m.corrigiu });
        G.achieve('estrategista');
        G.sceneParams({ tv: slideMatriz(m) });
        if (m.corrigiu) {
          await G.say('faisca', 'E bem pego na nota de risco. Uma empresa sem auditoria não é "risco baixo". Era otimismo meu.');
        } else {
          await G.say('faisca', 'Aquela nota de risco eu mesma corrigi no fim: empresa sem auditoria não é "risco baixo". Otimismo meu.');
        }
        fa(G, 'teach', 1.8);
        await G.say('faisca', 'E não é só comigo. Num exercício com executivos, quem consultou uma IA ficou mais otimista e errou mais. Quem conversou com colegas acertou mais.');
        await G.say('pai', 'Então antes de decidir, uma segunda opinião.', { expr: 'pensativo' });
        const op = await G.choose([
          { text: 'Rodar o mesmo pedido de novo, do zero', value: 'denovo' },
          { text: 'Fazer a mesma pergunta a outra IA', value: 'outra' },
          { text: 'Chamar a Bia, que ainda está no prédio', value: 'bia' },
        ], { prompt: 'Segunda opinião:', who: 'pai' });
        G.stats({ segundaOpiniao: op });
        if (op === 'denovo') {
          const n2 = notasBase(true);
          OSCILA.forEach(([c, o, v]) => { n2[c][o] = v; });
          const r2 = ranking(m.pesos, n2);
          await G.aiChat([
            { from: 'nota', text: 'Mesmo pedido, conversa nova.' },
            { from: 'ia', text: 'Refiz do zero. *Duas notas mudaram:* prazo da compra (de 4 para 3) e pessoas na parceria (de 4 para 3).\nCom os seus pesos, a ordem fica: ' + ordemTxt(r2) + '.', thinking: 1.3 },
          ], { title: 'Faísca', subtitle: 'segunda rodada' });
          await G.say('faisca', 'Viu? A mesma pergunta, notas um pouco diferentes. Uma opinião minha oscila; várias juntas ajudam. Mas nenhuma conhece a empresa por dentro.');
        } else if (op === 'outra') {
          await G.aiChat([
            { from: 'nota', text: 'A mesma pergunta, os mesmos dados, em outra IA aprovada pela empresa.' },
            { from: 'ia', text: 'Eu começaria pela *parceria*. E um ponto pouco discutido: um contrato longo pode prender vocês se a Vale Verde for vendida a um concorrente no meio do caminho. Exija uma cláusula para isso.', thinking: 1.3 },
          ], { title: 'Outra IA', subtitle: 'segunda opinião' });
          await G.say('faisca', 'Ela viu uma coisa que eu não vi: a cláusula para o caso de venda. Duas IAs enxergam mais. Mas duas IAs concordando não viram verdade.');
        }
        if (op !== 'bia') await G.say('pai', 'Agora, gente de carne e osso.', { expr: 'determinado' });
        G.sfx('phone_vibrate');
        await G.say('pai', 'Bia? Sobe aqui um minutinho. Quero uma segunda opinião.', { expr: 'neutro' });
        if (op === 'bia') await G.say('faisca', 'Boa escolha. E, se quiser, dá também para rodar de novo ou perguntar a outra IA: se a resposta muda muito, é sinal de que ela é frágil.');
        await G.fadeOut(0.6);
      },

      // ============================================================ PARTE 4 — 18h50, a Bia e a decisão
      async (G) => {
        G.scene('escritorio', office({ time: 'noite', screen: 'planilha', tv: slideMatriz(G.v.matriz), papers: 0.24 }));
        sentaNaMesa(G);
        G.hud.set({ clock: '18:50' });
        G.music('casa');
        const bia = G.actor('bia');
        bia.set({ props: { tablet: true }, expr: 'amigavel' });
        bia.at('porta');
        G.player.lookAt(bia);
        await G.fadeIn(0.6);
        G.sfx('door');
        await bia.walk(BIA_WP[0]);
        await bia.walk(BIA_WP[1]);
        await bia.walk('visita1');
        bia.at('visita1');
        bia.setAnim('sit');
        G.player.lookAt(bia);
        await G.say('bia', 'Segunda opinião a esta hora? Só pode ser a Vale Verde.', { expr: 'rindo' });
        await G.say('pai', 'Até você?', { expr: 'surpreso' });
        await G.say('bia', 'Está no grupo do Jorge desde o almoço.', { expr: 'rindo' });
        await G.say('pai', 'Fiz um pré-mortem e uma matriz com pesos. A Faísca deu a lista e as notas; eu dei a ordem e os pesos.', { expr: 'orgulhoso' });
        await G.say('bia', 'Um pré-mortem? Em doze anos, nunca vi você fazer um pré-mortem.', { expr: 'surpreso' });
        await G.say('pai', 'Nunca tive quem escrevesse oito causas em dois minutos.', { expr: 'rindo' });
        await G.say('bia', 'Então lá vai a minha parte, que nenhuma matriz tem.', { expr: 'determinado' });
        await G.say('bia', 'Se a gente pagar os vinte e quatro milhões com empréstimo, com os juros de hoje, o caixa fica no limite por uns dois anos. Amanhã te mostro na planilha.');
        await G.say('bia', 'E quem vende com pressa, em geral, está precisando de caixa. Eu pediria o balanço auditado antes de falar em preço.', { expr: 'desconfiado' });
        await G.say('bia', 'Se fosse eu? Parceria primeiro. Um ano de namoro antes do casamento.', { expr: 'amigavel' });
        fa(G, 'think', 1.6);
        await G.say('faisca', 'Ela trouxe o que eu não tinha: o caixa de verdade e o faro de quem já viu compra dar errado.', { cam: false });
        await G.say('bia', 'E o pessoal deles? Oitenta pessoas. A IA não podia dizer quem a gente mantém?', { expr: 'pensativo' });
        fa(G, 'doubt', 1.6);
        await G.say('faisca', 'Essa eu não faço. Quem fica e quem sai é decisão sobre pessoas: eu herdo vieses e não conheço ninguém lá. Ajudo a Luana com critérios justos, sem nomes.');
        bg(bia.play('laugh', 1.4));
        await G.say('bia', 'Resposta certa. Eu só queria ver se ela dizia não.', { expr: 'rindo' });

        // A decisão
        await G.say('faisca', 'Eu dei a lista, as notas e a conta. A Bia deu o caixa e o faro. Agora é com você.', { cam: false });
        await G.think('pai', 'Trinta anos de estrada. É para isto que me pagam.');
        const dec = await G.choose(['comprar', 'parceria', 'proprio', 'esperar'].map((k) => ({ text: DEC[k].t, sub: DEC[k].sub, value: k })), { prompt: 'A sua decisão:', who: 'pai' });
        G.v.decisao = dec;
        G.stats({ decisao: dec });
        G.sceneParams({ tv: ['Decisão · Vale Verde', DEC[dec].slide, 'Riscos: o pré-mortem', 'Memorando: hoje'] });
        G.sfx('confirm');
        if (dec === 'comprar') {
          await G.say('bia', 'Com essas condições, eu assino embaixo. E a parte retida do preço, eu negocio.', { expr: 'determinado' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'Comprar com condições é comprar de olhos abertos.', { cam: false });
        } else if (dec === 'parceria') {
          await G.say('bia', 'Namoro primeiro. Gostei.', { expr: 'feliz' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'E o pré-mortem não se perde: se a parceria der certo, ele vira o roteiro da compra.', { cam: false });
        } else if (dec === 'proprio') {
          await G.say('bia', 'Vai doer no caixa no começo. Mas é nosso, do primeiro ao último caminhão.', { expr: 'pensativo' });
          fa(G, 'think', 1.4);
          await G.say('faisca', 'A matriz avisou o ponto fraco: o prazo. Vale um cronograma bem conferido.', { cam: false });
        } else {
          await G.say('bia', 'Pressa do outro lado da mesa não é problema nosso.', { expr: 'feliz' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'Esperar também é decidir. Desde que tenha data: sessenta dias.', { cam: false });
        }
        await G.say('pai', 'A Faísca rascunha, a Bia confere o caixa... e quem decide sou eu.', { expr: 'determinado' });
        await G.say('bia', 'Do jeito que tem que ser. Amanhã cedo eu confiro os números. E parabéns pelo pré-mortem.', { expr: 'amigavel' });
        bia.setAnim('idle');
        bg(bia.walk(BIA_WP[1]).then(() => bia.walk(BIA_WP[0])));
        await G.wait(1.3);
        await G.fadeOut(0.7);
      },

      // ============================================================ PARTE 5 — 19h05, o memorando e a volta para casa
      async (G) => {
        const dec = G.v.decisao || 'parceria';
        const top = (G.v.top3 && G.v.top3.length === 3) ? G.v.top3 : ['osvaldo', 'dividas', 'caixa'];
        G.scene('escritorio', office({ time: 'noite', screen: 'doc', tv: ['Decisão · Vale Verde', DEC[dec].slide, 'Riscos: o pré-mortem', 'Memorando: hoje'], papers: 0.22 }));
        sentaNaMesa(G);
        G.hud.set({ clock: '19:05' });
        G.music('casa');
        G.player.lookAt(MONITOR);
        await G.fadeIn(0.6);
        await G.say('faisca', 'Falta o que a {chefe} pediu: a recomendação por escrito, com os riscos. Eu rascunho; a caneta é sua.');
        const memo = await miniMemo(G, dec, top);
        G.v.memo = memo;
        G.sceneParams({ papers: 0.2 });

        // A assinatura: plano de cinema por cima do ombro
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('tela', 0.9);
        await G.cutscene(async () => {
          await G.narrate('Uma página. Três riscos com antídoto. Duas frases riscadas. E uma assinatura que não é da IA.');
          G.sfx('email');
          G.toast('Memorando enviado para {chefe} e o conselho', { icon: '📨', kind: 'email', dur: 4 });
          await G.wait(1.4);
        });
        G.sfx('notify');
        G.toast('{chefe}: "Recebi. Primeira vez que vejo uma recomendação de compra com a lista do que pode dar errado. Quinta, 8h. E quero saber como você fez isso."', { icon: '💬', kind: 'notif', dur: 9 });
        await G.wait(1.2);
        G.player.fp();
        G.talkCam(true);
        G.player.lookAt(MONITOR);
        await G.say('pai', 'A {chefe} elogiou um memorando. Anota a data.', { expr: 'rindo' });
        fa(G, 'celebrate', 1.8);
        await G.say('faisca', 'Anotado! O advogado do diabo, o pré-mortem, a matriz e o memorando estão no seu Guia do CEO, botão 📘, em "Decisões e estratégia".');

        G.sfx('phone_vibrate');
        G.toast('{filho}: "Chega que horas, {apelido}? A geladeira está com cara de desafio 😅"', { icon: '💬', kind: 'notif', dur: 7 });
        await G.wait(0.8);
        const cet = varDe('prologo', 'ceticismo');
        if (cet === 'inventou') await G.think('pai', 'Hoje cedo eu disse que ela inventava números. Agora há pouco ela inventou uma importação... e eu peguei.', { expr: 'orgulhoso' });
        else if (cet === 'modinha') await G.think('pai', 'Modinha, eu disse hoje cedo. Modinha que faz pré-mortem.', { expr: 'pensativo' });
        else if (cet === 'caneta') await G.think('pai', 'Papel e caneta, eu disse hoje cedo. A caneta continua minha. Só que agora risca mais rápido.', { expr: 'orgulhoso' });
        if (G.flag('aposta')) await G.think('pai', 'E aquela aposta da louça está ficando difícil de ganhar.', { expr: 'sem_graca' });

        await G.explore({
          objetivo: 'Vá para casa',
          hotspots: [
            {
              id: 'janela', label: 'A cidade acesa', icon: '🌃', at: 'janela', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Daqui a um ano eu volto a esta janela e confiro: o que o pré-mortem acertou, e o que ninguém viu.', { expr: 'pensativo' });
              },
            },
            {
              id: 'pilha', label: 'A pilha de papéis', icon: '📄', pos: PILHA, radius: 1.4, optional: true,
              onInteract: async (G) => {
                G.player.lookAt(PILHA);
                await G.think('pai', 'De manhã era uma pilha. Agora são meia dúzia de folhas. Uma delas, assinada por mim.', { expr: 'orgulhoso' });
              },
            },
            { id: 'porta', label: 'Ir para casa', icon: '🏠', at: 'porta' },
          ],
        });
        // Saída: plano geral da sala à noite
        G.pai.at('porta');
        G.pai.setAnim('idle').setExpr('feliz');
        G.faisca.unfollow();
        G.faisca.at({ x: 2.95, z: 1.55, rot: -PI / 2 });
        G.faisca.set({ y: 1.25 });
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot('porta', 0);
        bg(G.cam.shot({ target: [3.1, 1.15, 1.6], yaw: -1.35, pitch: 0.1, dist: 5.4, fov: 40 }, 6));
        await G.cutscene(async () => {
          await G.narrate('Ele não sabe se a decisão vai dar certo. Ninguém sabe.');
          await G.narrate('Mas sabe por que decidiu, o que vai vigiar e quem confere o quê. Numa página, com a assinatura dele.');
        });
        G.talkCam(true);
        await G.fact(['executivos_previsao_otimista', 'ia_ceo_simulador', 'cybernetic_teammate_pg'], { titulo: 'Conselheira, não oráculo' });
        await G.lesson('A IA amplia o seu raciocínio. *Peça o contra, não o a favor. A decisão é sua.*\n- Não conte antes o que você prefere.\n- Pré-mortem: imagine que deu errado e pergunte por quê.\n- Os pesos são seus; as notas da IA são opinião.\n- Ouça mais de uma opinião, e pelo menos uma de gente.\n- Decisão sobre pessoas fica com pessoas.', { titulo: 'O conselheiro de bolso' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const s = (G.allStats() || {}).cap7 || {};
      const lines = [];
      const DECT = { comprar: 'comprar, com condições', parceria: 'parceria primeiro', proprio: 'centro de distribuição próprio', esperar: 'esperar 60 dias e auditar' };
      if (s.decisao) lines.push('Decisão (sua): ' + DECT[s.decisao]);
      if (s.premortem) lines.push('Pré-mortem feito' + (s.premissaPega ? ' · premissa inventada pela IA: riscada por você ✔' : ' · a IA admitiu a premissa inventada'));
      if (s.criterios) lines.push('Critérios com pesos' + (s.otimismoPego ? ' · nota otimista da IA corrigida por você ✔' : ' · a IA corrigiu a nota otimista'));
      lines.push(s.revelouPreferencia ? 'Lição aprendida: contar a preferência antes faz a IA dizer amém' : 'Perguntou sem revelar a preferência ✔');
      return lines;
    },
  });
})();

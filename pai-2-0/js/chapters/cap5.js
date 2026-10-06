/* PAI 2.0 — cap5.js — CAPÍTULO 5: "A Reunião Infinita"
 * 13h50 → 16h08. Sala do conselho (sala_reuniao) → banco de trás do carro (carro).
 *
 * Parte 1 — Antes: a sala vazia (exploração), a pauta de 60 minutos (minigame
 *           "Pauta que cabe na mesa"), o briefing no estilo Nadella e as 3 perguntas
 *           duras; o pai corrige a IA com o que só ele sabe (caneta vermelha).
 * Parte 2 — Durante: a diretoria chega; transcrição SÓ com aviso e consentimento
 *           (stats.consentimento); montagem cômica 14:00 → 15:40 (relógio, caos,
 *           HUD); saída da sala (exploração curta: Tadeu valida, Jorge reclama).
 * Parte 3 — Depois, no carro: ditado por voz; minigame "Ata em 1 minuto"
 *           (8 trechos → Decisão / Responsável / Prazo / A definir / Só conversa);
 *           minigame "Confira a ata" (o "13" que virou "30" e o dono inventado);
 *           o e-mail de acompanhamento ditado (risca o enfeite); mensagem d@ filh@
 *           (afeto vai na voz dele). Fatos reais + lição.
 *
 * stats.cap5 = { acertos, total: 15, minutosEconomizados, consentimento }
 *   acertos = trechos classificados de primeira (8) + linhas da ata conferidas
 *   certo de primeira (7). Conquista: ata_perfeita (15/15).
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Dados do capítulo
  // ------------------------------------------------------------------
  const PAUTA = [
    { id: 'reajuste', ic: '💰', t: 'Reajuste de preços', nm: 'reajuste', curto: 'Reajuste de preços', quem: 'Bia e Jorge', min: 20, ok: true,
      why: 'Mexe com margem, vendas e cliente ao mesmo tempo: precisa de todo mundo na mesa.' },
    { id: 'fornecedor', ic: '📦', t: 'Atrasos do fornecedor', nm: 'fornecedor', curto: 'Fornecedor de embalagens', quem: 'Rafael e Tadeu', min: 15, ok: true,
      why: 'Operação e jurídico juntos: o atraso de um lado, a multa do contrato do outro.' },
    { id: 'contratacoes', ic: '🧑‍🤝‍🧑', t: 'Contratações do turno novo', nm: 'contratações', curto: 'Contratações do turno novo', quem: 'Luana', min: 10, ok: true,
      why: 'Precisa do sim do caixa (Bia) e da operação (Rafael). É decisão de grupo.' },
    { id: 'viagens', ic: '✈️', t: 'Congelar viagens no trimestre', nm: 'viagens', curto: 'Congelar viagens', quem: 'Bia', min: 10, ok: true,
      why: 'Decisão rápida que vale para todas as áreas. Cabe em dez minutos.' },
    { id: 'aniversarios', ic: '🎂', t: 'Aniversariantes do mês', nm: 'aniversários', curto: 'Aniversariantes', quem: 'todos', min: 10, ok: false,
      why: 'Carinho, sim. Pauta de diretoria, não: isso vai num e-mail caprichado.' },
    { id: 'slides', ic: '📊', t: 'Tendências 2030 (40 slides)', nm: 'slides do Jorge', curto: 'Tendências 2030 (Jorge)', quem: 'Jorge', min: 30, ok: false,
      why: 'Informação sem decisão: manda antes por e-mail, e quem tiver dúvida pergunta.' },
    { id: 'gerente', ic: '🔒', t: 'Desempenho de um gerente', nm: 'caso do gerente', curto: 'Desempenho de um gerente', quem: 'Luana', min: 15, ok: false,
      why: 'Assunto de uma pessoa só: conversa reservada, não mesa com cinco diretores e transcrição ligada.' },
    { id: 'uniforme', ic: '🎨', t: 'A cor do uniforme novo', nm: 'uniforme', curto: 'Cor do uniforme', quem: 'Rafael', min: 10, ok: false,
      why: 'Dá para resolver em dois e-mails. Ou deixar com quem entende de uniforme.' },
  ];
  const PAUTA_LIMITE = 60;

  const CATS = [
    { id: 'decisao', ic: '✅', t: 'Decisão', sub: 'o que ficou resolvido' },
    { id: 'resp', ic: '👤', t: 'Responsável', sub: 'quem faz' },
    { id: 'prazo', ic: '📅', t: 'Prazo', sub: 'até quando' },
    { id: 'adefinir', ic: '❓', t: 'A definir', sub: 'sem dono ou sem dado' },
    { id: 'conversa', ic: '💬', t: 'Só conversa', sub: 'fica fora da ata' },
  ];
  const CAT_BY = {};
  CATS.forEach((c) => (CAT_BY[c.id] = c));

  // Os 8 trechos da transcrição (como a máquina transcreveu — inclusive o "30")
  const TRECHOS = [
    { h: '14:21', who: 'Você', txt: 'Então está decidido: reajuste de 6% a partir do mês que vem.', cat: 'decisao',
      why: 'Ficou resolvido, com número e data de início. É a primeira linha da ata.',
      alt: { prazo: '“A partir do mês que vem” faz parte da decisão. O coração do trecho é “está decidido”.' } },
    { h: '14:47', who: 'Você', txt: 'Rafael, a conversa com o fornecedor é sua. Tadeu, a carta de cobrança.', cat: 'resp',
      why: 'Diz *quem* faz. Tarefa sem dono vira tarefa de ninguém.',
      alt: { decisao: 'Você não decidiu um rumo aqui: você deu dono às tarefas.' } },
    { h: '14:51', who: 'Tadeu', txt: 'A carta sai até o dia 30. Sem falta.', cat: 'prazo',
      why: 'Diz *até quando*. Prazo sem data vira “um dia desses”. (Achou a data estranha? Guarde: a conferência vem já.)',
      alt: { resp: 'O dono da carta (Tadeu) você já tinha definido. O que este trecho acrescenta é a data.' } },
    { h: '15:04', who: 'Jorge', txt: 'Falando em atraso… alguém viu o jogo ontem? Que golaço!', cat: 'conversa',
      why: 'Simpático, mas não é ata. Ata registra decisões, não o placar.' },
    { h: '15:09', who: 'Luana', txt: 'Campanha de fim de ano: quem pega? (silêncio) — Jorge: A gente vê depois.', cat: 'adefinir',
      why: 'Ninguém assumiu. Entra na ata como pendência “a definir”, sem inventar dono.',
      alt: { conversa: 'Parece conversa, mas é um assunto de trabalho sem dono: é pendência.', resp: 'Ninguém assumiu, então não há responsável. Fica “a definir”.' } },
    { h: '15:31', who: 'Você', txt: 'Bia, o fluxo de caixa novo é com você.', cat: 'resp',
      why: 'Nome e tarefa: a Bia é a responsável.' },
    { h: '15:32', who: 'Você', txt: 'Tem que estar pronto até quinta, antes do conselho.', cat: 'prazo',
      why: 'A data que amarra a tarefa da Bia: quinta, antes do conselho.',
      alt: { resp: 'A responsável (Bia) veio no trecho anterior. Este traz a data.' } },
    { h: '15:38', who: 'Luana', txt: 'E as contratações do turno novo, doze ou oito? — Bia: Depende de o reajuste pegar.', cat: 'adefinir',
      why: 'Faltou um dado para decidir. Vai como pendência, com o motivo anotado.',
      alt: { decisao: 'Ninguém decidiu: dependia do reajuste. Fica “a definir”.' } },
  ];

  // A ata que a IA montou (2 erros: o "30" da transcrição e o dono inventado)
  const ATA = [
    { sec: 'Decisões', txt: 'Reajuste de 6% a partir do mês que vem.', ok: true,
      src: { h: '14:21', who: 'Você', fala: 'Então está decidido: reajuste de 6% a partir do mês que vem.' },
      fb: 'Confere com o áudio, palavra por palavra.' },
    { sec: 'Decisões', txt: 'Viagens congeladas até o fim do trimestre.', ok: true,
      src: { h: '15:24', who: 'Bia', fala: 'Fica aprovado: viagens congeladas até o fim do trimestre.' },
      fb: 'Confere: decisão e prazo, como a Bia falou.' },
    { sec: 'Tarefas', txt: 'Conversar com o fornecedor de embalagens · *Rafael* · prazo: a definir', ok: true,
      src: { h: '14:47', who: 'Você', fala: 'Rafael, a conversa com o fornecedor é sua. Tadeu, a carta de cobrança.' },
      fb: 'Confere. Ninguém deu prazo, e a ata não inventou: “a definir”. Vale cobrar uma data do Rafael.' },
    { sec: 'Tarefas', txt: 'Carta de cobrança da multa · *Tadeu* · até o dia 30', ok: false,
      src: { h: '14:51', who: 'Tadeu', fala: 'A carta sai até o dia… *treze*. Sem falta.' },
      fix: 'Carta de cobrança da multa · *Tadeu* · até o dia 13',
      fb: 'A transcrição ouviu “trinta” onde o Tadeu disse “treze”, e a IA copiou. Número e data: confira no áudio ou com a pessoa.' },
    { sec: 'Tarefas', txt: 'Fluxo de caixa novo para o conselho · *Bia* · até quinta', ok: true,
      src: { h: '15:31', who: 'Você', fala: 'Bia, o fluxo de caixa novo é com você. Tem que estar pronto até quinta, antes do conselho.' },
      fb: 'Confere: dona e prazo batem com o áudio.' },
    { sec: 'Tarefas', txt: 'Campanha de fim de ano · *Jorge* · até 30/11', ok: false,
      src: { h: '15:09', who: 'Luana e Jorge', fala: 'Luana: Campanha de fim de ano: quem pega? (silêncio) — Jorge: A gente vê depois.' },
      fix: 'Campanha de fim de ano · responsável e prazo: *a definir*',
      fb: 'Ninguém assumiu. A IA “completou a lacuna” e inventou dono e data. Na ata, o que não foi dito fica “a definir”.' },
    { sec: 'Em aberto', txt: 'Contratações do turno novo: doze ou oito? Depende do reajuste.', ok: true,
      src: { h: '15:38', who: 'Luana e Bia', fala: 'Luana: E as contratações, doze ou oito? — Bia: Depende de o reajuste pegar.' },
      fb: 'Confere: pendência com o motivo. Na próxima reunião, isso vira decisão.' },
  ];
  const TOTAL = TRECHOS.length + ATA.length; // 15

  // De pé ao lado da cabeceira, virado para quem ficou na sala (Tadeu e Jorge)
  const PAI_DE_PE = { x: 3.1, z: 0.7, rot: -0.96 };
  // Tadeu perto da quina da mesa, Jorge no centro: da cabeceira os dois cabem no quadro (a 1,6 m, o
  // rótulo do Tadeu não sobe para cima do objetivo no celular); da porta, ficam ~22° um do outro
  // (em pe2, o Jorge se despedia escondido atrás do Tadeu)
  const TADEU_DE_PE = { x: 1.95, z: 1.8, rot: Math.PI };
  const CHAT_CARRO = [['eu', '🎙️ Reajuste aprovado, Rafael com o fornecedor, Tadeu com a carta, Bia com o caixa.'], ['ia', 'Anotado. Puxando os trechos da transcrição…']];
  const SLIDE_VELHA = { title: 'Pauta da reunião passada', lines: ['11 itens discutidos', 'Itens decididos: nenhum', 'Próxima reunião: terça, 14h'] };
  function slidePauta(sel) {
    const itens = PAUTA.filter((p) => sel.indexOf(p.id) >= 0);
    const tot = itens.reduce((a, p) => a + p.min, 0);
    let lines = itens.map((p) => p.curto + ' · ' + p.min + ' min');
    if (lines.length > 5) lines = lines.slice(0, 4).concat(['+ ' + (lines.length - 4) + ' itens']);
    if (!lines.length) lines = ['(pauta livre)'];
    return { title: 'Pauta de hoje · ' + tot + ' min', lines };
  }

  // Em 1ª pessoa, a Faísca que "segue" o pai fica presa ao olhar dele: quando ela fala, o olhar
  // automático a persegue e a visão gira. Nas conversas, ela pousa num ponto fixo perto dele.
  function pousa(G, x, z, y) { G.faisca.unfollow(); G.faisca.at({ x, z }, y); G.faisca.face(G.pai); }
  // Na cabeceira: pousada na mesa, à esquerda do pai, na linha das cadeiras vazias (c5/c6), abaixo da
  // linha dos rostos. A 1,4 m ela não toma a tela do celular nem tapa o telão ou um diretor.
  const FAISCA_MESA = [1.5, 0.42, 0.88];
  // No carro: entre os encostos dos bancos da frente (a ~0,8 m do pai) e o celular no suporte
  const FAISCA_CARRO = { x: -0.12, z: 0.02, y: 0.98 };
  const CELULAR = { x: -0.19, y: 0.99, z: -0.38 };

  // Esvazia a caixa de fala (como o motor faz ao abrir uma exploração): no corte para o relógio
  // da montagem, a última fala não fica pendurada na tela.
  function limpaFala(G) {
    const R = G.ui && G.ui.refs && G.ui.refs();
    if (!R) return;
    G.ui.setMode('dialog');
    if (R.text) R.text.innerHTML = '';
    if (R.name) R.name.hidden = true;
    if (G.ui.markEmpty) G.ui.markEmpty(true);
  }

  // Animação curta sem esperar (e sem promessa solta ao sair do capítulo)
  function anim(actor, name, secs) {
    if (!actor) return;
    const p = actor.play(name, secs == null ? 1.4 : secs);
    if (p && p.catch) p.catch(() => {});
  }

  // ------------------------------------------------------------------
  // CSS do capítulo (só classes c5-*, por cima das mg-*)
  // ------------------------------------------------------------------
  const CSS = `
  .c5-sticky { position: sticky; bottom: -20px; z-index: 3; margin: 0 -4px -4px; padding: 10px 4px 6px;
    background: linear-gradient(180deg, rgba(255,255,255,0) 0, rgba(255,255,255,0.97) 14px, #fff 100%); display: flex; flex-direction: column; gap: 8px; }
  @media (max-width: 760px) and (orientation: portrait) { .c5-sticky { bottom: -18px; } }
  .c5-pauta { display: grid; gap: 8px; grid-template-columns: 1fr; }
  @media (min-width: 820px) { .c5-pauta { grid-template-columns: 1fr 1fr; } }
  .c5-item { display: flex; gap: 10px; align-items: center; padding: 8px 12px; min-height: 54px; text-align: left; }
  .c5-item .ic { font-size: 1.3em; flex: 0 0 auto; width: 1.35em; text-align: center; }
  .c5-item .tx { flex: 1 1 auto; min-width: 0; line-height: 1.25; }
  .c5-item .tx b { display: block; font-size: 0.95em; }
  .c5-item .tx small { margin-top: 2px; }
  .c5-item .tx small i { font-style: normal; font-family: var(--head); font-weight: 800; color: var(--ink); }
  .c5-item.on .tx small i { color: var(--brand-d); }
  .c5-item .chk { flex: 0 0 auto; width: 1.45em; height: 1.45em; border-radius: 8px; border: 2px solid #cfd5e3; display: grid; place-items: center; font-size: 0.78em; font-weight: 800; color: transparent; background: #fff; }
  .c5-item.on .chk { background: var(--brand); border-color: var(--brand); color: #fff; }
  .c5-kbd { font-family: var(--head); font-size: 0.66em; font-weight: 800; background: rgba(20,30,60,0.07); color: var(--muted); border-radius: 6px; padding: 0.1em 0.45em; flex: 0 0 auto; }
  .c5-pauta.confirm .c5-kbd { visibility: hidden; }
  @media (max-width: 760px) { .c5-kbd { display: none; } } /* no celular, atalho de teclado só polui */
  .c5-pauta.lock .c5-item { cursor: default; }
  .c5-meter { display: flex; align-items: center; gap: 10px; background: #f4f6fa; border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
  .c5-meter .lb { font-family: var(--head); font-weight: 800; font-size: 0.85em; white-space: nowrap; }
  .c5-meter .meter { flex: 1 1 auto; }
  .c5-meter .meter .hud-bar { height: 12px; }
  .c5-meter b { font-family: var(--head); font-size: 0.9em; white-space: nowrap; }
  .c5-meter b.over { color: var(--red); }
  .c5-sticky .mg-feedback { font-size: 0.95em; }
  @media (min-width: 820px) {
    .c5-sticky.row { flex-direction: row; flex-wrap: wrap; align-items: center; }
    .c5-sticky.row .mg-feedback { flex: 1 1 380px; margin: 0; }
    .c5-sticky.row .mg-actions { flex: 0 0 auto; margin: 0 0 0 auto; }
  }
  .c5-prog { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .c5-dots { display: flex; gap: 5px; flex-wrap: wrap; }
  .c5-dots i { width: 12px; height: 12px; border-radius: 50%; background: #dfe3ec; display: block; }
  .c5-dots i.ok { background: var(--mint); } .c5-dots i.bad { background: var(--amber); } .c5-dots i.cur { box-shadow: 0 0 0 3px rgba(255,107,61,0.45); background: #fff; border: 2px solid var(--brand); }
  .c5-frag { display: flex; gap: 12px; align-items: flex-start; background: #f7f8fb; border: 1px solid var(--line); border-left: 5px solid #8a94ad; border-radius: 14px; padding: 12px 14px; }
  .c5-frag .h { font-family: var(--head); font-weight: 800; font-size: 0.78em; color: #fff; background: #4a5a7a; border-radius: 8px; padding: 3px 8px; flex: 0 0 auto; margin-top: 2px; }
  .c5-frag .who { font-family: var(--head); font-weight: 800; font-size: 0.82em; color: var(--muted); display: block; }
  .c5-frag q { quotes: '“' '”'; font-size: 1.04em; line-height: 1.4; }
  .c5-cats { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (min-width: 820px) { .c5-cats { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
  .c5-cat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 12px; min-height: 64px; position: relative; }
  .c5-cat .ic { font-size: 1.25em; }
  .c5-cat b { font-family: var(--head); font-size: 0.95em; }
  .c5-cat small { margin-top: 0 !important; }
  .c5-cat .c5-kbd { position: absolute; bottom: 8px; right: 10px; }
  .c5-cats .c5-cat:last-child:nth-child(odd) { grid-column: 1 / -1; }
  /* Celular em pé: cartões de categoria compactos (ícone e nome na mesma linha), para as cinco caberem sem rolar */
  @media (max-width: 760px) and (orientation: portrait) {
    .c5-cat { flex-direction: row; flex-wrap: wrap; align-items: center; column-gap: 8px; row-gap: 1px; min-height: 52px; padding: 8px 10px; }
    .c5-cat small { flex-basis: 100%; line-height: 1.2; }
    .c5-frag { padding: 10px 12px; gap: 10px; }
  }
  @media (min-width: 820px) { .c5-cats .c5-cat:last-child:nth-child(odd) { grid-column: auto; } }
  .c5-ata { padding: 12px 14px; }
  .c5-ata .head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; border-bottom: 2px solid var(--ink); padding-bottom: 6px; margin-bottom: 4px; }
  .c5-ata .head b { font-family: var(--head); font-weight: 800; letter-spacing: 0.04em; }
  .c5-ata h5 { margin: 10px 0 2px; font-family: var(--head); font-size: 0.74em; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
  .c5-ata .mg-line { display: flex; gap: 10px; align-items: center; min-height: 46px; }
  .c5-ata .mg-line .lt { flex: 1 1 auto; min-width: 0; }
  .c5-ata .mg-line .st { flex: 0 0 auto; font-size: 0.9em; }
  .c5-ata .mg-line.fixed .lt s { color: #b0485a; }
  .c5-ata .mg-line:disabled { opacity: 1; }
  .c5-ata .fora { font-size: 0.84em; color: var(--muted); font-style: italic; margin-top: 8px; }
  .c5-ata .c5-nada { padding: 8px 12px; border: 1px dashed #cfd5e3; border-radius: 10px; color: var(--muted); font-size: 0.95em; }
  .c5-ata .c5-nada.fixed { color: var(--ink); border-color: #e7b9c2; background: #fff6f7; }
  .c5-ata .c5-nada s { color: #b0485a; }
  .c5-audio { border: 1px solid #c9d4ee; background: var(--blue-l); border-radius: 14px; padding: 10px 12px; margin: 4px 0 8px; display: flex; flex-direction: column; gap: 8px; scroll-margin: 12px 0 170px; }
  .c5-audio .top { display: flex; align-items: center; gap: 10px; }
  .c5-audio .play { width: 34px; height: 34px; border-radius: 50%; background: #2b4a8a; color: #fff; display: grid; place-items: center; flex: 0 0 auto; font-size: 0.8em; }
  .c5-wave { display: flex; align-items: center; gap: 3px; height: 26px; flex: 1 1 auto; overflow: hidden; }
  .c5-wave i { width: 4px; border-radius: 2px; background: #6f8fd6; display: block; animation: c5w 1s ease-in-out infinite; }
  @keyframes c5w { 0%,100% { transform: scaleY(0.45); } 50% { transform: scaleY(1); } }
  html.reduce-motion .c5-wave i { animation: none; }
  .c5-audio .meta { font-family: var(--head); font-size: 0.76em; font-weight: 800; color: #2b4a8a; white-space: nowrap; }
  .c5-audio .fala { font-style: italic; line-height: 1.4; }
  .c5-audio .mg-actions { margin-top: 0; justify-content: flex-start; }
  .c5-score { font-family: var(--head); font-weight: 800; }
  `;

  // ------------------------------------------------------------------
  // Minigame 1 — "Pauta que cabe na mesa"
  // ------------------------------------------------------------------
  function miniPauta(G) {
    P2.ui.css('cap5', CSS);
    return G.mini((root, done, api) => {
      const { el } = api;
      const sel = new Set();
      const ordem = api.shuffle(PAUTA);
      // Orçamento de tempo no topo (sempre visível ao abrir)
      const meterRow = el('div', 'c5-meter');
      const meter = api.meter(0, null);
      const meterTx = el('b', null, '0 de ' + PAUTA_LIMITE + ' min');
      meterRow.appendChild(el('span', 'lb', '⏱️ Pauta'));
      meterRow.appendChild(meter);
      meterRow.appendChild(meterTx);
      root.appendChild(meterRow);
      const grid = el('div', 'c5-pauta');
      root.appendChild(grid);
      const cards = {};
      ordem.forEach((it, i) => {
        const b = el('button', 'mg-card c5-item');
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.dataset.k = String(i + 1);
        b.setAttribute('aria-pressed', 'false');
        b.appendChild(el('span', 'chk', '✓'));
        b.appendChild(el('span', 'ic', it.ic));
        b.appendChild(el('span', 'tx', [el('b', null, it.t), el('small', null, [it.quem + ' · ', el('i', null, it.min + ' min')])]));
        b.appendChild(el('span', 'c5-kbd', String(i + 1)));
        b.addEventListener('click', (e) => { e.stopPropagation(); toggle(it); });
        grid.appendChild(b);
        cards[it.id] = b;
      });
      const foot = el('div', 'c5-sticky row');
      const fb = el('div', 'mg-feedback info');
      fb.appendChild(api.rich('Toque para pôr ou tirar. Entra o que pede *decisão* de várias áreas. Sem pressa: a pauta é sua.', true));
      const actions = el('div', 'mg-actions');
      const lblFechar = el('span', null, 'Fechar a pauta ▶');
      const btnFechar = api.btn(lblFechar, () => fechar(), { cls: 'primary', key: '9' });
      btnFechar.disabled = true;
      actions.appendChild(btnFechar);
      foot.appendChild(fb);
      foot.appendChild(actions);
      root.appendChild(foot);

      let confirmando = false, fechado = false, extra = null;
      function total() { return PAUTA.filter((p) => sel.has(p.id)).reduce((a, p) => a + p.min, 0); }
      function refresh() {
        const t = total();
        meter.set(Math.min(100, (t / PAUTA_LIMITE) * 100), t > PAUTA_LIMITE ? '#e5484d' : t >= 45 ? '#2dbf8f' : '#f2a53a');
        meterTx.textContent = t + ' de ' + PAUTA_LIMITE + ' min' + (t > PAUTA_LIMITE ? ' · estourou' : '');
        meterTx.classList.toggle('over', t > PAUTA_LIMITE);
        lblFechar.textContent = sel.size ? 'Fechar a pauta · ' + t + ' min ▶' : 'Fechar a pauta ▶';
        btnFechar.disabled = sel.size === 0 || fechado;
        PAUTA.forEach((p) => { const c = cards[p.id]; c.classList.toggle('on', sel.has(p.id)); c.setAttribute('aria-pressed', sel.has(p.id) ? 'true' : 'false'); });
      }
      function feedback(kind, txt) {
        fb.className = 'mg-feedback ' + kind;
        fb.textContent = '';
        fb.appendChild(api.rich(txt, true));
      }
      // No "palpite", as teclas 1–3 passam para os três botões de resposta (os cartões continuam clicáveis)
      function setConfirm(on) {
        confirmando = on;
        grid.classList.toggle('confirm', on);
        Object.keys(cards).forEach((id) => { const c = cards[id]; if (on) delete c.dataset.key; else c.dataset.key = c.dataset.k; });
        if (!on && extra) { extra.remove(); extra = null; }
        btnFechar.hidden = on;
      }
      function lock() {
        fechado = true;
        grid.classList.add('lock');
        Object.keys(cards).forEach((id) => { cards[id].disabled = true; });
        if (extra) extra.querySelectorAll('button').forEach((b) => (b.disabled = true));
        btnFechar.disabled = true;
      }
      function toggle(it) {
        if (fechado) return;
        if (confirmando) setConfirm(false);
        if (sel.has(it.id)) {
          sel.delete(it.id);
          api.sfx('back');
          feedback('info', 'Fora da pauta: *' + it.t + '*.');
        } else {
          sel.add(it.id);
          if (it.ok) {
            api.sfx('select');
            feedback('ok', '✅ *' + it.t + '* — ' + it.why);
            anim(G.faisca, 'jump', 0.8);
          } else {
            api.sfx('buzz');
            feedback('warn', '🤔 *' + it.t + '* — ' + it.why + ' Pode manter, se quiser: a pauta é sua.');
            anim(G.faisca, 'doubt', 1.4);
          }
        }
        refresh();
      }
      function resultado(ajustou) {
        const ids = PAUTA.filter((p) => sel.has(p.id)).map((p) => p.id);
        const ruins = ids.filter((id) => !PAUTA.find((p) => p.id === id).ok);
        const faltam = PAUTA.filter((p) => p.ok && !sel.has(p.id)).map((p) => p.id);
        done({ sel: ids, ruins, faltam, perfeita: !ruins.length && !faltam.length, ajustou: !!ajustou, total: total() });
      }
      function fechar() {
        if (fechado || !sel.size) return;
        const ruins = PAUTA.filter((p) => sel.has(p.id) && !p.ok);
        const faltam = PAUTA.filter((p) => p.ok && !sel.has(p.id));
        if (!ruins.length && !faltam.length) {
          lock();
          api.sfx('success');
          anim(G.faisca, 'celebrate', 1.6);
          G.fx.sparkles(G.faisca);
          feedback('ok', '🎯 Quatro decisões, ' + total() + ' minutos. Pauta enxuta: cada item pede a mesa inteira.');
          api.timeout(() => resultado(false), P2.skipping ? 0 : 1100);
          return;
        }
        const lista = (arr) => { const n = arr.map((p) => p.nm); return '*' + (n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0]) + '*'; };
        const partes = [];
        if (ruins.length) partes.push(lista(ruins) + (ruins.length > 1 ? ' cabem' : ' cabe') + ' num e-mail ou numa conversa a sós.');
        if (faltam.length) partes.push(lista(faltam) + (faltam.length > 1 ? ' precisam' : ' precisa') + ' da mesa hoje.');
        feedback('warn', '💡 Palpite da Faísca: ' + partes.join(' ') + ' Você decide.');
        anim(G.faisca, 'think', 1.4);
        setConfirm(true);
        extra = el('div', 'mg-actions');
        extra.appendChild(api.btn('Mexer mais', () => { api.sfx('back'); setConfirm(false); feedback('info', 'À vontade. Toque nos itens para pôr ou tirar.'); }, { key: '1' }));
        extra.appendChild(api.btn('Fechar do meu jeito', () => { lock(); api.sfx('confirm'); resultado(false); }, { key: '2' }));
        extra.appendChild(api.btn('✂️ Aceitar o palpite', () => {
          ruins.forEach((p) => sel.delete(p.id));
          faltam.forEach((p) => sel.add(p.id));
          refresh();
          lock();
          api.sfx('success');
          anim(G.faisca, 'celebrate', 1.2);
          feedback('ok', 'Ajustado: quatro decisões, ' + total() + ' minutos. O resto vai por e-mail.');
          api.timeout(() => resultado(true), P2.skipping ? 0 : 1000);
        }, { cls: 'primary', key: '3' }));
        foot.appendChild(extra);
        setTimeout(() => { try { extra && extra.lastChild.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 30);
      }
      refresh();
    }, { title: '🗓️ Pauta que cabe na mesa', size: 'l', intro: 'Oito pedidos de pauta chegaram. A reunião tem 60 minutos: o que merece a mesa da diretoria?', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Minigame 2 — "Ata em 1 minuto" (classificar trechos)
  // ------------------------------------------------------------------
  function miniClassifica(G) {
    P2.ui.css('cap5', CSS);
    return G.mini((root, done, api) => {
      const { el } = api;
      let idx = 0, acertos = 0;
      const res = [];
      const prog = el('div', 'c5-prog');
      const progTx = el('span', 'mg-label', '');
      const dots = el('div', 'c5-dots');
      TRECHOS.forEach(() => dots.appendChild(el('i')));
      prog.appendChild(progTx);
      prog.appendChild(dots);
      root.appendChild(prog);
      const frag = el('div', 'c5-frag');
      root.appendChild(frag);
      const cats = el('div', 'c5-cats');
      const btns = {};
      CATS.forEach((c, i) => {
        const b = el('button', 'mg-card c5-cat');
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.appendChild(el('span', 'ic', c.ic));
        b.appendChild(el('b', null, c.t));
        b.appendChild(el('small', null, c.sub));
        b.appendChild(el('span', 'c5-kbd', String(i + 1)));
        b.addEventListener('click', (e) => { e.stopPropagation(); responder(c.id); });
        cats.appendChild(b);
        btns[c.id] = { b };
      });
      root.appendChild(cats);
      const foot = el('div', 'c5-sticky row');
      const fb = el('div', 'mg-feedback info');
      fb.hidden = true;
      const actions = el('div', 'mg-actions');
      const nextLbl = el('span', null, 'Próximo trecho ▶');
      const btnNext = api.btn(nextLbl, () => proximo(), { cls: 'primary', key: '6' });
      btnNext.hidden = true;
      actions.appendChild(btnNext);
      foot.appendChild(fb);
      foot.appendChild(actions);
      root.appendChild(foot);

      function mostrar() {
        const t = TRECHOS[idx];
        progTx.textContent = 'Trecho ' + (idx + 1) + ' de ' + TRECHOS.length;
        Array.from(dots.children).forEach((d, i) => { d.className = i < idx ? (res[i] ? 'ok' : 'bad') : i === idx ? 'cur' : ''; });
        frag.innerHTML = '';
        frag.appendChild(el('span', 'h', t.h));
        frag.appendChild(el('div', null, [el('span', 'who', t.who), el('q', null, t.txt)]));
        CATS.forEach((c) => { const x = btns[c.id]; x.b.disabled = false; x.b.classList.remove('ok', 'bad', 'dim'); });
        fb.hidden = true;
        btnNext.hidden = true;
      }
      function responder(cat) {
        const t = TRECHOS[idx];
        if (btnNext.hidden === false) return;
        const certo = cat === t.cat;
        res[idx] = certo;
        if (certo) acertos++;
        CATS.forEach((c) => {
          const x = btns[c.id];
          x.b.disabled = true;
          if (c.id === t.cat) x.b.classList.add('ok');
          else if (c.id === cat) x.b.classList.add('bad');
          else x.b.classList.add('dim');
        });
        fb.hidden = false;
        if (certo) {
          api.sfx('success');
          fb.className = 'mg-feedback ok';
          fb.textContent = '';
          fb.appendChild(api.rich('✅ *' + CAT_BY[t.cat].t + '.* ' + t.why, true));
          anim(G.faisca, idx % 2 ? 'jump' : 'celebrate', 1);
          api.say(['Isso.', 'Na mosca.', 'Exato.', 'Boa.', 'Perfeito.'][idx % 5], 'faisca');
        } else {
          api.sfx('fail');
          fb.className = 'mg-feedback bad';
          fb.textContent = '';
          const extra = (t.alt && t.alt[cat]) ? t.alt[cat] + ' ' : '';
          fb.appendChild(api.rich('Vai em *' + CAT_BY[t.cat].ic + ' ' + CAT_BY[t.cat].t + '*. ' + extra + t.why, true));
          anim(G.faisca, 'doubt', 1.2);
          api.say('Quase. Esse engana mesmo.', 'faisca');
        }
        btnNext.hidden = false;
        nextLbl.textContent = idx === TRECHOS.length - 1 ? 'Montar a ata ▶' : 'Próximo trecho ▶';
        setTimeout(() => { try { btnNext.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 30);
      }
      function proximo() {
        if (idx >= TRECHOS.length - 1) {
          Array.from(dots.children).forEach((d, i) => { d.className = res[i] ? 'ok' : 'bad'; });
          done({ acertos, total: TRECHOS.length, res: res.slice() });
          return;
        }
        idx++;
        api.sfx('page');
        mostrar();
      }
      mostrar();
    }, { title: '📝 Ata em 1 minuto', size: 'l', intro: 'Oito trechos da transcrição, em ordem. Para cada um: é decisão, quem faz, até quando, o que ficou sem dono… ou só conversa?', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Minigame 3 — "Confira a ata" (linha por linha, contra o áudio)
  // ------------------------------------------------------------------
  function miniConfere(G) {
    P2.ui.css('cap5', CSS);
    return G.mini((root, done, api) => {
      const { el } = api;
      let acertos = 0, achados = 0, conferidas = 0, falsos = 0, pegos = 0;
      const est = ATA.map(() => null); // null | 'ok' | 'fix'
      const doc = el('div', 'mg-doc c5-ata');
      doc.appendChild(el('div', 'head', [el('b', null, 'ATA · DIRETORIA'), el('span', 'mg-small', 'terça · 14h às 15h40 · rascunho da IA')]));
      root.appendChild(doc);
      const rows = [];
      let lastSec = null, aberto = -1, painel = null;
      ATA.forEach((ln, i) => {
        if (ln.sec !== lastSec) { doc.appendChild(el('h5', null, ln.sec)); lastSec = ln.sec; }
        const b = el('button', 'mg-line');
        b.type = 'button';
        const lt = el('span', 'lt');
        lt.appendChild(api.rich(ln.txt, true));
        const st = el('span', 'st', '🔍');
        b.appendChild(lt);
        b.appendChild(st);
        b.addEventListener('click', (e) => { e.stopPropagation(); abrir(i); });
        doc.appendChild(b);
        rows.push({ b, lt, st });
      });
      // A 4ª parte da ata: o que a própria IA achou que precisava conferir
      doc.appendChild(el('h5', null, 'A conferir (segundo a IA)'));
      const nada = el('div', 'c5-nada', 'Nenhum trecho ambíguo.');
      doc.appendChild(nada);
      doc.appendChild(el('div', 'fora', '(Fora da ata: o golaço e o pão de queijo.)'));
      const foot = el('div', 'c5-sticky row');
      // Rodapé fixo enxuto (no celular ele não pode tapar os botões do áudio): o retorno aparece
      // depois do 1º veredito, e o "Assinar" só quando todas as linhas foram conferidas.
      const fb = el('div', 'mg-feedback info');
      fb.hidden = true;
      const actions = el('div', 'mg-actions');
      const btnAssinar = api.btn('✍️ Assinar a ata', () => assinar(), { cls: 'primary', key: '9' });
      btnAssinar.disabled = true;
      btnAssinar.hidden = true;
      actions.appendChild(btnAssinar);
      foot.appendChild(fb);
      foot.appendChild(actions);
      root.appendChild(foot);

      function setFb(kind, txt) {
        fb.hidden = false;
        fb.className = 'mg-feedback ' + kind;
        fb.textContent = '';
        fb.appendChild(api.rich(txt, true));
      }
      function fechaPainel() {
        if (painel) { painel.remove(); painel = null; }
        if (aberto >= 0 && est[aberto] == null) { rows[aberto].b.disabled = false; rows[aberto].b.classList.remove('on'); }
        aberto = -1;
      }
      function abrir(i, quieto) {
        if (est[i] != null) return;
        fechaPainel();
        aberto = i;
        const ln = ATA[i];
        const r = rows[i];
        r.b.classList.add('on');
        r.b.disabled = true;
        if (!quieto) api.sfx('select');
        painel = el('div', 'c5-audio');
        const wave = el('div', 'c5-wave');
        for (let k = 0; k < 26; k++) {
          const bar = el('i');
          bar.style.height = (8 + ((k * 37) % 18)) + 'px';
          bar.style.animationDelay = ((k % 7) * 0.09) + 's';
          wave.appendChild(bar);
        }
        painel.appendChild(el('div', 'top', [el('span', 'play', '▶'), wave, el('span', 'meta', ln.src.h + ' · ' + ln.src.who)]));
        const fala = el('div', 'fala');
        fala.appendChild(api.rich('“' + ln.src.fala + '”', true));
        painel.appendChild(fala);
        const acts = el('div', 'mg-actions');
        acts.appendChild(api.btn('✓ Confere', () => veredito(i, true), { cls: 'mint', key: '1' }));
        acts.appendChild(api.btn('✗ Está errada', () => veredito(i, false), { key: '2' }));
        painel.appendChild(acts);
        r.b.insertAdjacentElement('afterend', painel);
        api.say('Linha ' + (i + 1) + ' de ' + ATA.length + ': o áudio das ' + ln.src.h + '. Confere com a ata?', 'faisca');
        anim(G.faisca, 'listen', 1.4);
        api.timeout(() => encaixa(true), 40);
        api.timeout(() => encaixa(false), 600); // 2ª passada: garante os dois botões acima do rodapé fixo
      }
      // Rola o painel do áudio para cima do rodapé fixo (no celular, o rodapé tapava o “Está errada”)
      function encaixa(suave) {
        if (!painel) return;
        try {
          let sc = painel.parentElement;
          while (sc && sc !== document.body) {
            const o = getComputedStyle(sc).overflowY;
            if ((o === 'auto' || o === 'scroll') && sc.scrollHeight > sc.clientHeight + 2) break;
            sc = sc.parentElement;
          }
          if (!sc || sc === document.body) { painel.scrollIntoView({ block: 'nearest' }); return; }
          const sr = sc.getBoundingClientRect(), pr = painel.getBoundingClientRect(), fr = foot.getBoundingClientRect();
          const limite = Math.min(sr.bottom, fr.height ? fr.top : sr.bottom) - 10;
          let d = pr.bottom > limite ? pr.bottom - limite : 0;
          if (pr.top - d < sr.top + 8) d = pr.top - sr.top - 8;
          if (Math.abs(d) > 1) sc.scrollBy({ top: d, behavior: suave ? 'smooth' : 'auto' });
        } catch (e) { /* nada */ }
      }
      function proxima(from) {
        for (let k = 1; k <= ATA.length; k++) { const j = (from + k) % ATA.length; if (est[j] == null) return j; }
        return -1;
      }
      function veredito(i, disseConfere) {
        const ln = ATA[i];
        const r = rows[i];
        const certo = disseConfere === ln.ok;
        if (certo) acertos++;
        conferidas++;
        if (painel) { painel.remove(); painel = null; }
        aberto = -1;
        r.b.classList.remove('on');
        r.b.disabled = true;
        if (ln.ok) {
          est[i] = 'ok';
          r.b.classList.add('ok');
          r.st.textContent = '✓';
          if (certo) { api.sfx('confirm'); setFb('ok', '✓ ' + ln.fb); anim(G.faisca, 'jump', 0.8); }
          else { falsos++; api.sfx('select'); setFb('info', 'Desconfiar é bom, mas esta confere. ' + ln.fb); anim(G.faisca, 'think', 1.2); }
        } else {
          est[i] = 'fix';
          achados++;
          if (certo) pegos++;
          r.b.classList.add('fixed');
          r.lt.textContent = '';
          const s = el('s');
          s.appendChild(api.rich(ln.txt, true));
          r.lt.appendChild(s);
          r.lt.appendChild(el('br'));
          r.lt.appendChild(api.rich('✏️ ' + ln.fix, true));
          r.st.textContent = '🖊️';
          r.b.classList.add('ok');
          // A "parte 4" da ata (o que a IA achou que não precisava conferir) também leva caneta
          nada.textContent = '';
          nada.appendChild(el('s', null, 'Nenhum trecho ambíguo.'));
          nada.appendChild(document.createTextNode(' ✏️ ' + (achados > 1 ? achados + ' trechos errados, corrigidos por você.' : '1 trecho errado, corrigido por você.')));
          nada.classList.add('fixed');
          if (certo) { api.sfx('success'); setFb('ok', '🖊️ Pegou! ' + ln.fb); anim(G.faisca, 'ashamed', 1.6); }
          else { api.sfx('fail'); setFb('bad', 'Esta não confere: compare com o áudio. ' + ln.fb + ' Corrigido com a sua caneta.'); anim(G.faisca, 'ashamed', 1.6); }
        }
        const restam = ATA.length - conferidas;
        if (!restam) {
          btnAssinar.hidden = false;
          btnAssinar.disabled = false;
          api.say('Tudo conferido. Agora sim: pode assinar.', 'faisca');
          setTimeout(() => { try { btnAssinar.focus({ preventScroll: true }); } catch (e) { /* nada */ } }, 30);
        } else {
          fb.appendChild(el('div', 'mg-small', 'Conferidas: ' + conferidas + ' de ' + ATA.length + '. Abrindo a próxima linha…'));
          const nx = proxima(i);
          api.timeout(() => { if (aberto < 0 && nx >= 0 && est[nx] == null) abrir(nx, true); }, P2.skipping ? 0 : 700);
        }
      }
      function assinar() {
        if (btnAssinar.disabled) return;
        btnAssinar.disabled = true;
        api.sfx('success');
        anim(G.faisca, 'celebrate', 1.6);
        done({ acertos, total: ATA.length, achados, falsos, pegos });
      }
      abrir(0, true);
    }, { title: '🔍 Confira a ata antes de assinar', size: 'l', intro: 'A IA montou a ata em quatro partes. Antes de assinar, confira linha por linha contra o áudio.', introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // CAPÍTULO
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap5',
    num: 'Capítulo 5',
    title: 'A Reunião Infinita',
    subtitle: 'Duas horas de reunião. E na quarta, quem lembra o que ficou decidido?',
    music: 'trabalho',
    minutes: 10,
    parts: [
      // ================================================================
      // PARTE 1 — Antes: a sala vazia, a pauta e o briefing
      // ================================================================
      async (G) => {
        await G.titleCard();
        P2.ui.css('cap5', CSS);
        G.scene('sala_reuniao', { clock: '13:50', chaos: 0, slide: SLIDE_VELHA });
        G.pai.at('porta');
        pousa(G, 3.6, 1.55, 1.4); // à frente e um pouco à direita: inteira na tela também no celular em pé
        G.hud.set({ clock: '13:50' });
        G.music('trabalho');
        G.player.cine();
        await G.cam.shot('geral', 0);
        await G.fadeIn(1);
        await G.narrate('Terça, 13h50. Sede antiga, do outro lado da cidade: a diretoria se reúne aqui desde a fundação. A mesma mesa comprida, o mesmo relógio na parede.');
        await G.cam.shot('relogio', 1.8);
        await G.narrate('Reunião de diretoria às 14h. Duração prevista: uma hora. Recorde da casa: três horas e quarenta. Esse relógio viu tudo.');
        G.player.fp();
        G.pai.at('porta');
        await G.say('pai', 'Toda terça é igual. Duas horas de reunião, e na quarta ninguém lembra quem ficou com o quê.', { expr: 'cansado' });
        await G.say('pai', 'E a Sônia está de folga. Ou seja: hoje, nem ata vai ter.', { expr: 'desconfiado' });
        await G.say('faisca', 'Vai ter, sim. Eu anoto, você confere. E chegamos dez minutos antes: dá tempo de arrumar a pauta.', { anim: 'wave' });

        const env = G.core.world.env || {};
        const rel = env.shots && env.shots.relogio;
        const relPos = rel ? { x: rel.target[0], y: rel.target[1], z: rel.target[2] } : { x: 4.2, y: 2.1, z: -0.3 };
        G.faisca.follow(G.pai);
        await G.explore({
          objetivo: 'Sente-se na cabeceira antes de a diretoria chegar',
          hotspots: [
            {
              id: 'tela', label: 'A pauta da semana passada', icon: '📺', at: 'tela', y: 1.6, optional: true,
              onInteract: async (G) => {
                G.player.lookAt({ x: -4.2, y: 1.6, z: 0 });
                await G.say('pai', 'A pauta da semana passada ainda está na tela. Onze itens. Lembro de ter discutido todos.', { expr: 'pensativo' });
                await G.say('faisca', 'E decidido?', { anim: 'doubt', cam: false });
                await G.say('pai', 'Próxima pergunta.', { expr: 'sem_graca' });
              },
            },
            {
              id: 'janela', label: 'Olhar a cidade', icon: '🌆', at: 'janela', y: 2.0, optional: true, // alto: o rótulo não encavala com o da cabeceira
              onInteract: async (G) => {
                G.player.lookAt({ x: 0.2, y: 1.2, z: -6 });
                await G.say('pai', 'Lá embaixo, a marginal parada. Aqui em cima, a pauta parada. Pelo menos a marginal anda de madrugada.', { expr: 'desconfiado' });
              },
            },
            {
              id: 'relogio', label: 'O relógio da fundação', icon: '🕰️', pos: relPos, optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'Esse relógio está aqui desde o primeiro dia. Já viu reunião acabar no escuro. Eu estava em todas.', { expr: 'orgulhoso' });
                await G.say('faisca', 'Ele merecia hora extra.', { anim: 'spin', cam: false });
              },
            },
            { id: 'cabeceira', label: 'Sentar na cabeceira', icon: '🪑', at: 'cabeceira', y: 1.2 },
          ],
        });
        G.pai.at('cabeceira');
        G.pai.setAnim('sit');
        pousa(G, ...FAISCA_MESA);
        G.player.lookAt(null);
        await G.say('faisca', 'Posso ajudar antes, durante e depois. Antes: uma pauta enxuta e o que cada diretor deve trazer.', { anim: 'teach' });
        await G.say('faisca', 'Aqui eu rodo na ferramenta aprovada pela empresa, que não treina com os dados da casa. E só vejo o e-mail e a agenda que a TI liberou.');
        await G.say('pai', 'Então junta os pedidos de pauta que chegaram. Mas quem fecha a pauta sou eu.', { expr: 'determinado' });

        const pauta = await miniPauta(G);
        G.v.pauta = pauta.sel;
        G.v.pautaPerfeita = pauta.perfeita;
        G.v.pautaRuins = pauta.ruins;
        G.v.pautaAjustou = pauta.ajustou;
        G.sceneParams({ slide: slidePauta(pauta.sel) });
        G.player.lookAt({ x: -4.2, y: 1.6, z: 0 });
        if (pauta.ajustou) {
          await G.say('faisca', 'Pauta ajustada e na tela: quatro decisões, cinquenta e cinco minutos. O resto vai por e-mail, e ninguém sai perdendo.', { anim: 'teach', cam: false });
          await G.say('pai', 'E sobram cinco para o Jorge chegar atrasado.', { expr: 'rindo' });
        } else if (pauta.perfeita) {
          await G.say('faisca', 'Quatro decisões, cinquenta e cinco minutos. Sobram cinco para o Jorge chegar atrasado.', { anim: 'celebrate', cam: false });
          await G.say('pai', 'Você já conhece o Jorge.', { expr: 'rindo' });
        } else {
          await G.say('faisca', 'A pauta é sua, e está na tela. Só guardo o palpite: o que não pede decisão costuma caber num e-mail.', { anim: 'think', cam: false });
          await G.say('pai', 'Anotado. Hoje vai assim.', { expr: 'determinado' });
        }

        // Briefing no estilo Nadella (com a ressalva honesta)
        await G.say('faisca', 'Agora, um pedido que o CEO da Microsoft contou, em público, que faz ao assistente dele.', { anim: 'teach' });
        await G.fact('nadella_cinco_prompts');
        await G.say('pai', 'O homem vende a ferramenta. Claro que ele usa.', { expr: 'desconfiado' });
        await G.say('faisca', 'Justo. Então julgue pelo resultado, não pelo vendedor. Vamos testar com a sua diretoria?', { anim: 'point' });
        await G.aiChat([
          { from: 'voce', text: 'Com base nas minhas conversas recentes com cada diretor: o que deve estar na cabeça de cada um para hoje? E o que cada um precisa trazer?' },
          { from: 'ia', text: '- *Bia:* a margem, que vem apertando, e a renovação da linha de crédito com o banco. Trazer: o fluxo de caixa.\n- *Rafael:* o terceiro atraso do fornecedor. Trazer: as datas.\n- *Tadeu:* a multa do contrato, nunca cobrada. Trazer: a cláusula.\n- *Luana:* gente para o turno novo. Trazer: o custo por contratação.\n- *Jorge:* pediu por e-mail prioridade para o cliente do Sul. Trazer: o volume desse cliente.' },
        ], { title: 'Faísca · ferramenta da empresa' });
        const risca = await G.choose([
          { text: 'Risca a linha de crédito: a Bia resolveu isso ontem com o banco, no corredor.', value: 'risca', sub: 'Você corrige com o que só você sabe' },
          { text: 'Deixa como está. Melhor sobrar do que faltar.', value: 'deixa' },
        ], { prompt: 'A Faísca acha que a Bia está preocupada com a linha de crédito. Mas você sabe de uma coisa que ela não sabe…' });
        if (risca === 'risca') {
          G.faisca.emote('idea');
          await G.say('faisca', 'Riscado. Conversa de corredor não passa pelo e-mail: eu não tinha como saber. Eu só sei o que você me conta.', { anim: 'think' });
          await G.say('pai', 'Pode riscar à vontade, então?', { expr: 'desconfiado' });
          await G.say('faisca', 'À vontade. Eu não fico ofendida.', { anim: 'jump' });
        } else {
          await G.say('faisca', 'Pode deixar. Mas esse e-mail é da semana passada. Se você sabe de algo mais novo, a sua informação ganha da minha.', { anim: 'doubt' });
          await G.say('pai', '…É. A Bia resolveu ontem, no corredor. Risca.', { expr: 'sem_graca' });
          await G.say('faisca', 'Riscado. Eu só sei o que você me conta.', { anim: 'jump' });
        }
        G.v.riscou = risca === 'risca';

        await G.say('pai', 'E o reajuste? Seis ou doze, vai ter chiadeira.', { expr: 'desconfiado' });
        await G.aiChat([
          { from: 'voce', text: 'Vou propor o reajuste da tabela hoje, entre 6% e 12%. Quais as 3 perguntas mais duras que a diretoria pode me fazer?' },
          { from: 'ia', text: '1. Quanto do faturamento é do cliente do Sul, e o que acontece se ele sair?\n2. Quanto volume a gente perde com 12%? E com 6%?\n3. Com o fornecedor de embalagens atrasando, vamos subir o preço justo quando a entrega piora?' },
        ], { title: 'Faísca · ferramenta da empresa' });
        await G.say('pai', 'As duas primeiras eu já tinha na cabeça. A terceira, não: subir preço com a entrega atrasando. Boa.', { expr: 'pensativo' });
        await G.say('faisca', 'Você tem trinta anos de mesa. Eu tenho três segundos de leitura. Juntos, a gente chega preparado.', { anim: 'celebrate' });
        await G.say('faisca', 'Mando a pauta para a diretoria, com o que cada um deve trazer? Está na tela, para você ler antes.');
        await G.say('pai', 'Li. Pode mandar. E da próxima vez, na véspera: dez minutos antes ninguém traz nada.', { expr: 'determinado' });
        await G.say('faisca', 'Anotado. Na segunda à tarde, eu te lembro.', { anim: 'jump' });
        G.toast('Pauta enviada à diretoria · com o que cada um deve trazer', { icon: '📨', kind: 'email' });
        await G.wait(0.6);
      },

      // ================================================================
      // PARTE 2 — Durante: consentimento, a montagem e a saída
      // ================================================================
      async (G) => {
        P2.ui.css('cap5', CSS);
        const sel = G.v.pauta || PAUTA.filter((p) => p.ok).map((p) => p.id);
        G.scene('sala_reuniao', { clock: '14:02', chaos: 0, slide: slidePauta(sel) });
        G.pai.at('cabeceira');
        G.pai.setAnim('sit');
        pousa(G, ...FAISCA_MESA);
        const bia = G.actor('bia').at('c4').setAnim('sit').setExpr('neutro');
        const rafael = G.actor('rafael').at('c3').setAnim('sitcoffee').setExpr('cansado');
        const luana = G.actor('luana').at('c2').setAnim('sit').setExpr('amigavel');
        const tadeu = G.actor('tadeu').at('c7').setAnim('sit').setExpr('pensativo');
        [bia, rafael, luana, tadeu].forEach((a) => a.lookAt(G.pai));
        G.hud.set({ clock: '14:02' });
        G.music('trabalho');
        G.player.lookAt(rafael);
        await G.fadeIn();
        await G.narrate('14h02. Bia, financeiro. Rafael, operações. Luana, RH. Tadeu, jurídico. E uma cadeira vazia: a do Jorge, comercial.');

        G.jorge.at('porta');
        G.jorge.setAnim('idle').setExpr('empolgado');
        G.jorge.face(G.pai);
        await G.say('jorge', 'Cheguei! Trouxe pão de queijo!', { emote: '!', anim: 'wave' });
        await G.jorge.walk('c8');
        G.jorge.setAnim('sit');
        G.jorge.lookAt(G.pai);
        await G.say('pai', 'Jorge, a reunião era às duas.', { expr: 'impaciente' });
        await G.say('jorge', 'E são duas! E dois minutinhos. Detalhe.', { expr: 'rindo' });

        // Transcrição: com aviso e consentimento
        await G.say('faisca', 'Psst. Quer que eu transcreva? Depois eu monto a ata a partir do que for dito.', { anim: 'listen' });
        const modo = await G.choose([
          { text: '“Pessoal, vou ligar a transcrição para fazer a ata. Todos de acordo?”', value: 'pede', sub: 'Avisa e pede o ok de todos, na ferramenta da empresa' },
          { text: '“Liga baixinho, Faísca. Ninguém precisa saber.”', value: 'escondido', sub: 'Grava sem avisar' },
          { text: '“Grava no meu celular pessoal, que é mais rápido.”', value: 'celular', sub: 'Usa um aplicativo pessoal' },
        ], { prompt: 'Como você liga a transcrição?' });
        G.v.consentimento = modo === 'pede';
        if (modo === 'pede') {
          G.faisca.emote('heart');
          anim(G.faisca, 'celebrate', 1.2);
          G.sfx('chime');
          await G.say('pai', 'Pessoal, vou ligar a transcrição para fazer a ata. Todos de acordo?', { expr: 'determinado' });
        } else if (modo === 'escondido') {
          await G.say('faisca', 'Gravar cinco diretores escondido? Se alguém descobre, a ata vira o menor dos seus problemas.', { anim: 'scared' });
          await G.say('faisca', 'E na ferramenta da empresa todo mundo vê o aviso de qualquer jeito. Perguntar custa dez segundos.', { anim: 'teach' });
          await G.say('pai', 'Tá bom, tá bom. Pessoal, vou ligar a transcrição para fazer a ata. Todos de acordo?', { expr: 'sem_graca' });
        } else {
          await G.say('faisca', 'No celular pessoal, a reunião da diretoria vai parar num lugar sem contrato com a empresa. E a voz e a opinião de cada um são dados pessoais.', { anim: 'doubt' });
          await G.say('faisca', 'Na ferramenta da empresa, com aviso para todos, fica limpo.', { anim: 'teach' });
          await G.say('pai', 'Certo. Pessoal, vou ligar a transcrição na ferramenta da empresa para fazer a ata. Todos de acordo?', { expr: 'determinado' });
        }
        await G.say('bia', 'Por mim, tudo bem.', { expr: 'amigavel' });
        await G.say('luana', 'Só uma coisa: se entrar assunto de alguém da equipe, a gente pausa?', { expr: 'pensativo' });
        await G.say('pai', 'Pausa. Assunto de gente não fica gravado.', { expr: 'determinado' });
        await G.say('tadeu', 'E transcrição é rascunho, hein? Na ata oficial, só o que for decidido de verdade.', { expr: 'desconfiado' });
        await G.say('pai', 'De acordo. A Faísca rascunha. Quem assina a ata sou eu.', { expr: 'orgulhoso' });
        G.toast('Transcrição ligada · todos os participantes foram avisados', { icon: '🔴', kind: 'warn', dur: 4 });

        // ---------------- A montagem: 14h → 15h40
        const tem = (id) => sel.indexOf(id) >= 0;
        const ditos = {};
        const jorge = G.jorge;
        await G.cutscene(async () => {
          G.talkCam(false);
          G.player.cine();
          const tick = async (hhmm, chaos, shot) => {
            limpaFala(G);
            G.sceneParams({ clock: hhmm, chaos });
            G.hud.set({ clock: hhmm });
            G.sfx('tick');
            await G.cam.shot('relogio', 0.6);
            await G.wait(0.8);
            await G.cam.shot(shot, 0.9);
          };
          await tick('14:20', 0.12, 'mesa');
          bia.setAnim('sittalk');
          await G.say('bia', 'Sem reajuste no mês que vem, a margem não volta. Simples assim.', { expr: 'determinado' });
          bia.setAnim('sit');
          await G.say('jorge', 'Seis eu seguro. Doze, o cliente do Sul vai embora. Ainda mais com entrega atrasando.', { expr: 'preocupado' });
          await G.say('pai', 'Então está decidido: reajuste de 6% a partir do mês que vem.', { expr: 'determinado' });
          if (tem('aniversarios')) {
            await G.narrate('14h30: parabéns aos aniversariantes do mês. Cantado duas vezes, porque o Jorge errou a letra.');
          }
          await tick('14:45', 0.35, 'lateral');
          await G.say('rafael', 'O fornecedor de embalagens atrasou de novo. Terceira vez no trimestre.', { expr: 'cansado', emote: 'sweat' });
          await G.say('tadeu', 'E aquele contrato de oitenta páginas tem multa por atraso. Que a gente nunca cobrou.', { expr: 'desconfiado' });
          await G.say('pai', 'Rafael, a conversa com o fornecedor é sua. Tadeu, a carta de cobrança.');
          // Close no Tadeu, de frente (fala para a mesa): o “13” que a transcrição vai ouvir como “30”
          tadeu.lookAt(null);
          await G.cam.focus(tadeu, 'close', { yaw: tadeu.rot + 0.25, pitch: 0.06, zoom: 1.45, dur: 0.5 });
          await G.say('tadeu', 'A carta sai até o dia *13*. Sem falta.', { expr: 'determinado' });
          tadeu.lookAt(G.pai);
          if (tem('slides')) {
            await G.say('jorge', 'Agora, rapidinho: slide 23 de 40. As tendências para 2030!', { expr: 'empolgado' });
            await G.narrate('Às 15h, ninguém lembra de tendência nenhuma. Só do slide 23.');
          }
          await tick('15:05', 0.55, 'mesa');
          await G.say('jorge', 'Falando em atraso… alguém viu o jogo ontem? Que golaço!', { expr: 'rindo', emote: 'note' });
          if (tem('gerente')) {
            await G.say('luana', 'E o desempenho daquele gerente… prefiro tratar em particular. Ainda mais com transcrição ligada.', { expr: 'preocupado' });
            await G.say('pai', 'Tem razão. Isso é conversa a sós, Luana. Amanhã cedo, na minha sala.', { expr: 'determinado' });
          }
          await G.say('luana', 'Gente, foco. Campanha de fim de ano: quem pega?', { expr: 'impaciente' });
          [bia, rafael, tadeu, luana, jorge].forEach((a) => a.emote('...'));
          await G.narrate('Silêncio. Cinco diretores descobrem, ao mesmo tempo, algo fascinante dentro da própria xícara.');
          await G.say('jorge', 'A gente vê depois.', { expr: 'sem_graca' });
          if (tem('uniforme')) {
            await G.narrate('15h15: vinte minutos sobre o tom exato de azul do uniforme. Decisão: nenhuma.');
          }
          await tick('15:25', 0.8, 'geral');
          await G.say('bia', 'Fica aprovado, então: viagens congeladas até o fim do trimestre.', { expr: 'determinado' });
          await G.say('rafael', 'Acabou o pão de queijo. De novo.', { expr: 'triste' });
          await G.say('pai', 'Bia, o fluxo de caixa novo é com você. Tem que estar pronto até quinta, antes do conselho.');
          await tick('15:40', 1, 'lateral');
          await G.say('luana', 'E as contratações do turno novo? Doze ou oito?', { expr: 'pensativo' });
          await G.say('bia', 'Depende de o reajuste pegar. Sem esse número, não fecho.', { expr: 'desconfiado' });
          await G.say('pai', 'Então fica para a próxima. Reunião encerrada.', { expr: 'cansado' });
          jorge.lookAt(null);
          G.faisca.hide(); // pousada na mesa, ela ficaria entre a câmera e o Jorge neste close
          await G.cam.focus(jorge, 'close', { yaw: jorge.rot + 0.25, pitch: 0.06, zoom: 1.45, dur: 0.5 });
          G.fx.confetti(jorge);
          await G.say('jorge', 'Uma hora e quarenta! Nunca terminou tão cedo!', { expr: 'empolgado', emote: 'star' });
          ditos.fim = true;
        });
        G.talkCam(true);
        G.faisca.show();
        G.sceneParams({ clock: '15:40', chaos: 1 });
        G.hud.set({ clock: '15:40' });
        G.player.fp();
        G.pai.at('cabeceira');
        G.pai.setAnim('sit');
        if ((G.v.pautaRuins || []).length) {
          await G.say('faisca', 'Previsão: sessenta minutos. Realizado: cem. E um bom pedaço foi para o que não pedia decisão.', { anim: 'think' });
        } else if (PAUTA.some((p) => p.ok && !tem(p.id))) {
          await G.say('faisca', 'Previsão: sessenta minutos. Realizado: cem. O que ficou fora da pauta entrou do mesmo jeito, sem hora marcada.', { anim: 'think' });
        } else {
          await G.say('faisca', 'Previsão: sessenta minutos. Realizado: cem. Ainda assim, a mais curta que esse relógio já viu. E com decisões.', { anim: 'spin' });
        }
        await G.say('pai', 'E você não encurtou nada.', { expr: 'desconfiado' });
        // Honestidade: a IA não encurta reunião (copilot_campo_email, já mostrado no Cap 2)
        const viuCap2 = !!(G.allStats().cap2);
        if (viuCap2) {
          await G.say('faisca', 'Nem tento. Lembra do estudo de hoje cedo? A IA cortou o tempo de e-mail. O de reunião ficou igual.', { anim: 'think' });
        } else {
          await G.say('faisca', 'Nem tento. Num experimento em empresas de verdade, a IA cortou o tempo de e-mail. O de reunião ficou igual.', { anim: 'think' });
          await G.fact('copilot_campo_email');
        }
        await G.say('faisca', 'Reunião, quem encurta é a pauta. Eu fico com o antes e o depois. E o depois está gravado, com a licença de todos.', { anim: 'teach' });

        // A sala esvazia num corte rápido (ninguém atravessa a mesa); Tadeu e Jorge ficam de pé
        await G.fadeOut(0.5);
        [bia, rafael, luana].forEach((a) => a.remove());
        G.pai.setAnim('idle');
        G.pai.at(PAI_DE_PE);
        // Tadeu perto da quina da mesa e Jorge no centro: vistos da porta, um não fica atrás do outro
        tadeu.setAnim('idle').setExpr('neutro').at(TADEU_DE_PE);
        tadeu.face(G.pai);
        tadeu.lookAt(G.pai);
        jorge.setAnim('idle').setExpr('feliz').at('centro');
        jorge.face(G.pai);
        jorge.lookAt(G.pai);
        G.hud.set({ clock: '15:43' });
        G.faisca.follow(G.pai);
        await G.fadeIn(0.6);
        await G.explore({
          objetivo: 'Desça para o carro: a ata se faz no caminho',
          hotspots: [
            {
              id: 'tadeu', label: 'Falar com o Tadeu', actor: 'tadeu', optional: true,
              onInteract: async (G) => {
                G.actor('tadeu').face(G.pai);
                await G.say('tadeu', 'A carta de cobrança eu escrevo. Se a IA ajudar, ótimo, mas a cláusula da multa eu confiro na fonte.', { expr: 'amigavel' });
                await G.say('pai', 'Nem precisava dizer. A IA localiza, o jurídico valida.', { expr: 'orgulhoso' });
                await G.say('tadeu', 'Olha só quem está falando de IA agora.', { expr: 'rindo' });
                await G.say('pai', 'Falo. Mas quem responde pela cláusula continua sendo você.', { expr: 'amigavel' });
              },
            },
            {
              id: 'jorge', label: 'Falar com o Jorge', actor: 'jorge', optional: true,
              onInteract: async (G) => {
                G.jorge.face(G.pai);
                await G.say('jorge', 'E aí, a sua IA gravou o meu comentário do golaço?', { expr: 'empolgado' });
                await G.say('pai', 'Gravou. E vai ficar fora da ata, Jorge.', { expr: 'desconfiado' });
                await G.say('jorge', 'Censura! Era o melhor momento da reunião.', { expr: 'rindo', anim: 'laugh' });
              },
            },
            { id: 'porta', label: 'Descer para o carro', icon: '🚗', at: 'porta', y: 1.3 },
          ],
        });
        // a exploração termina ainda longe da porta (raio do ponto): ele chega até ela antes da despedida
        await G.player.walkTo('porta');
        G.jorge.face(G.pai);
        await G.say('jorge', 'Até amanhã, chefe! Amanhã eu chego na hora. Quase.', { expr: 'rindo', anim: 'wave' });
      },

      // ================================================================
      // PARTE 3 — Depois: o carro, a ata, o e-mail e {filho}
      // ================================================================
      async (G) => {
        P2.ui.css('cap5', CSS);
        const consentiu = !!G.v.consentimento;
        G.scene('carro', { time: 'tarde', phone: 'chat', speed: 1, chat: CHAT_CARRO });
        G.pai.at('banco');
        G.pai.setAnim('sitphone');
        G.faisca.at('centro');
        G.faisca.face(G.pai);
        G.hud.set({ clock: '15:52' });
        G.music('trabalho');
        G.player.cine();
        await G.cam.shot('geral', 0);
        await G.fadeIn(1);
        await G.narrate('15h52. De volta para o escritório, no trânsito da tarde.');
        // (o plano 'banco' enquadra mal no celular em pé: do plano geral, corta direto para a 1ª pessoa)
        G.player.fp();
        G.pai.at('banco');
        G.pai.setAnim('sit');
        // Em 1ª pessoa, o 'centro' fica colado no rosto do pai: ela pousa entre os bancos da frente
        pousa(G, FAISCA_CARRO.x, FAISCA_CARRO.z, FAISCA_CARRO.y);
        G.faisca.set({ scale: 0.75 }); // a 0,8 m do rosto: menor, para não dominar o quadro no computador
        G.player.lookAt({ x: -1.2, y: 1.05, z: 0.1 }); // a rua pelo vão entre os bancos: o celular e a Faísca cabem no quadro
        await G.say('pai', 'Antigamente, eu passava esse trajeto tentando lembrar quem prometeu o quê.', { expr: 'cansado' });
        await G.say('faisca', 'Hoje a ata sai no caminho. Você fala, eu organizo. Falar é bem mais rápido que digitar no celular.', { anim: 'listen' });
        G.faisca.setAnim('listen');
        await G.say('pai', 'Então anota: reajuste aprovado, Rafael com o fornecedor, Tadeu com a carta, Bia com o caixa. O resto você puxa da transcrição.', { expr: 'determinado' });
        G.faisca.setAnim('idle');
        await G.say('faisca', 'Anotado. Meu rascunho da ata já está pronto, mas antes separe oito trechos da transcrição. Assim você sabe o que cobrar de mim.', { anim: 'teach' });

        G.player.lookAt(CELULAR); // durante o minijogo, a cena mostra o celular no suporte (a transcrição)
        const cl = await miniClassifica(G);
        G.v.classAcertos = cl.acertos;
        if (cl.acertos === cl.total) {
          await G.say('faisca', 'Oito de oito. Você separa como quem já fez mil atas.', { anim: 'celebrate' });
          await G.say('pai', 'Fiz. Só que à mão, e de madrugada.', { expr: 'orgulhoso' });
        } else {
          const nome = ['Nenhum', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete'][cl.acertos] || String(cl.acertos);
          await G.say('faisca', nome + (cl.acertos ? ' de oito de primeira. ' : ' de primeira, e tudo bem: separar ata é treino. ') + 'O critério que mais importa: o que ninguém assumiu fica “a definir”. Não se inventa dono.', { anim: 'teach' });
        }
        await G.say('faisca', 'Agora, o meu rascunho, em quatro partes: decisões, tarefas, pendências e o que conferir. Nomes, números e prazos: essa parte é sua.', { anim: 'point' });

        G.player.lookAt(CELULAR);
        const cf = await miniConfere(G);
        G.v.confAcertos = cf.acertos;
        G.v.confFalsos = cf.falsos;
        G.v.confPegos = cf.pegos;
        const abertura = cf.pegos === 2 ? 'Dois erros meus, e você pegou os dois.'
          : cf.pegos === 1 ? 'Dois erros meus. Um você pegou de primeira; o outro passou. Erro de ata parece certo.'
          : 'Dois erros meus, e os dois passaram pela primeira olhada. Erro de ata parece certo.';
        await G.say('faisca', abertura + ' O “trinta” veio da transcrição: ela ouviu errado, e eu copiei sem piscar.', { anim: 'ashamed' });
        const campanhaCerta = !!(cl.res && cl.res[4]); // o trecho da campanha (“a gente vê depois”)
        await G.say('faisca', (campanhaCerta ? 'E o Jorge na campanha… você tinha separado como “a definir”, e eu completei a lacuna.' : 'E o Jorge na campanha… ninguém assumiu, e eu completei a lacuna.') + ' Ainda escrevi “nenhum trecho ambíguo”. Com toda a confiança.', { anim: 'sad' });
        await G.say('pai', 'Por isso eu confiro.', { expr: 'determinado' });
        await G.say('faisca', 'Por isso. O antídoto cabe no pedido: “se ninguém assumiu, escreva *a definir*; não invente”. E nome, número e prazo, sempre no áudio.', { anim: 'teach' });
        await G.fact('transcricao_inventa');

        // O e-mail de acompanhamento, ditado
        await G.say('faisca', 'Ata assinada. Quer ditar o e-mail de acompanhamento? Fala solto, que eu arrumo.', { anim: 'listen' });
        await G.aiChat([
          { from: 'voce', text: '(ditado) Pessoal… é… obrigado pela reunião. Seguem as decisões: reajuste de seis, viagens congeladas. Rafael com o fornecedor, Tadeu com a carta até dia treze, Bia com o caixa até quinta. Campanha e contratações, na próxima. Qualquer coisa, me liguem.' },
          { from: 'ia', text: '*Assunto:* Diretoria de terça: decisões e próximos passos\n\nPessoal, obrigado pela reunião. Foi uma tarde extremamente produtiva e inspiradora!\n\n*Decidido:* reajuste de 6% a partir do mês que vem; viagens congeladas até o fim do trimestre.\n*Tarefas:* Rafael fala com o fornecedor de embalagens (prazo a combinar) · Tadeu envia a carta de cobrança até o dia 13 · Bia leva o fluxo de caixa ao conselho até quinta.\n*Em aberto:* campanha de fim de ano e contratações do turno novo.\n\nQualquer dúvida, me liguem.' },
        ], { title: 'Faísca · e-mail de acompanhamento' });
        const enfeite = await G.choose([
          { text: 'Risca o “extremamente produtiva e inspiradora”. Eu não falo assim.', value: 'risca', sub: 'Caneta vermelha' },
          { text: 'Deixa. Um elogio não mata ninguém.', value: 'deixa' },
        ], { prompt: 'Tem uma frase no e-mail que você não ditou…' });
        if (enfeite === 'risca') {
          await G.say('faisca', 'Riscado! Eu enfeitei. Você disse “obrigado pela reunião” e pronto.', { anim: 'ashamed' });
          await G.say('pai', 'Cem minutos, e ainda acabou o pão de queijo. Isso não é inspirador. É terça.', { expr: 'desconfiado' });
        } else {
          await G.say('faisca', 'O e-mail é seu. Só lembro: quem te conhece vai estranhar. Você nunca escreveu “inspiradora” na vida.', { anim: 'doubt' });
          await G.say('pai', '…Verdade. Risca.', { expr: 'sem_graca' });
        }
        G.v.riscouEnfeite = enfeite === 'risca';
        await G.say('pai', 'Li inteiro. Agora pode mandar.');
        G.toast('E-mail enviado à diretoria · com as suas palavras', { icon: '📨', kind: 'email' });
        await G.wait(0.5);

        // Mensagem d{oa} {filho}: afeto vai na voz dele
        G.sceneParams({ phone: 'chat' });
        G.toast('{filho}: E aí, {apelido}? Sobreviveu à diretoria? 😄', { icon: '💬', kind: 'notif', dur: 4.5 });
        await G.wait(0.4);
        await G.say('faisca', 'Mensagem {doda} {filho}. Quer que eu escreva a resposta?', { anim: 'point' });
        const resp = await G.choose([
          { text: 'Essa não. Essa eu mesmo dito, do meu jeito.', value: 'eu' },
          { text: 'Escreve aí, você escreve bem.', value: 'ia' },
        ], { prompt: '{filho} perguntou: “E aí, {apelido}? Sobreviveu à diretoria? 😄”' });
        if (resp === 'eu') {
          G.faisca.emote('heart');
          await G.say('faisca', 'Perfeito. Mensagem de afeto vai melhor na sua voz. Eu só atrapalharia.', { anim: 'celebrate' });
        } else {
          await G.say('faisca', 'Escrevo, se você quiser. Mas mensagem de afeto vai melhor na sua voz: quem recebe sente a diferença.', { anim: 'think' });
          await G.say('pai', 'Tá. Do meu jeito, então.', { expr: 'amigavel' });
        }
        // Callback da aposta do Prólogo (a louça por um mês)
        const aposta = !!G.flag('aposta');
        const fez = G.v.confPegos === 2 ? 'Sobrevivi. A Faísca fez a ata e eu achei dois erros dela.' : 'Sobrevivi. A Faísca fez a ata e eu conferi linha por linha.';
        await G.say('pai', '(ditando) ' + fez + (aposta ? ' A louça continua em disputa. Te conto no jantar.' : ' Te conto no jantar.'), { expr: 'orgulhoso' });
        G.toast(aposta ? '{filho}: 😂 “Em disputa” já é quase um elogio, {apelido}. Te vejo à noite!' : '{filho}: 😂 Quem diria! Te vejo à noite.', { icon: '💬', kind: 'notif', dur: 4.5 });
        await G.wait(0.6);

        // Chegada
        G.sceneParams({ speed: 0 });
        G.hud.set({ clock: '16:08' });
        await G.narrate('16h08. O carro para na frente do escritório.');
        await G.say('pai', 'Cem minutos de reunião, e a ata pronta antes do elevador. Conferida por mim.', { expr: 'orgulhoso' });
        await G.say('faisca', 'E assinada por você. Ditar e resumir com IA ganham tempo de verdade, mas deixam escapar detalhe. Os estudos mostram os dois lados.', { anim: 'celebrate' });

        // Estatísticas e conquista
        const acertos = (G.v.classAcertos || 0) + (G.v.confAcertos || 0);
        const minutos = 25 + 30 + 10; // preparar (pauta + briefing) · ata · e-mail — estimativa do jogo
        G.v.minutos = minutos;
        G.stats({ acertos, total: TOTAL, minutosEconomizados: minutos, consentimento: consentiu });
        if (acertos === TOTAL) G.achieve('ata_perfeita');

        await G.fact(['stanford_voz', 'microsoft_reuniao_perdida'], { titulo: 'Mais rápido, sim. Sem conferir, não.' });
        await G.say('faisca', 'Os pedidos de hoje estão no seu Guia do CEO, botão 📘: pauta e ata em “Reuniões”; ditado e mensagem de afeto em “Comunicação”.', { anim: 'point' });
        await G.lesson('Falar é mais rápido que digitar. A IA organiza a bagunça; você confirma quem faz o quê e até quando.', { titulo: 'A ata é da IA. A assinatura é sua.' });
      },
    ],
    summary: (G) => {
      const st = (G.allStats().cap5) || {};
      const out = [];
      if (st.total) out.push('Ata: ' + (st.acertos || 0) + ' de ' + st.total + ' acertos (' + TRECHOS.length + ' trechos + ' + ATA.length + ' linhas conferidas)');
      out.push(st.consentimento ? 'Transcrição: com aviso e o ok de todos, desde o começo' : 'Transcrição: com aviso, depois do puxão de orelha da Faísca');
      if (st.minutosEconomizados) out.push('Tempo poupado: ≈ ' + st.minutosEconomizados + ' min (estimativa do jogo)');
      out.push(G.v.confPegos === 2 ? 'Erros da IA que você pegou: o “13” que virou “30” e o dono inventado' : 'Erros da IA na ata: o “13” que virou “30” e o dono inventado (' + (G.v.confPegos || 0) + ' de 2 pegos de primeira)');
      return out;
    },
  });
})();

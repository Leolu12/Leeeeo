/* PAI 2.0 — cap2.js — CAPÍTULO 2 · "O Expediente"
 * 9h, sala da presidência. Quatro tarefas, um relógio (HUD) e a reputação.
 * Para as tarefas 1–3 ele escolhe: Eu mesmo (lento e seguro) · A IA rascunha, eu reviso
 * (minigame "Caneta vermelha") · A IA faz, eu mando sem ler (consequência com humor).
 * Tarefa 4 fica FORA da fronteira: promoção de um gerente — pessoas decidem sobre pessoas.
 * Stats (bíblia F): {minutosEconomizados, reputacao, errosCorrigidos, errosTotal, mandouSemLer,
 *   foraFronteiraCerto}. Conquistas: raiz, caneta_vermelha, reputacao_ouro.
 */
(function () {
  'use strict';
  const P2 = window.P2;
  const PI = Math.PI;

  // ------------------------------------------------------------------
  // Dados do capítulo
  // ------------------------------------------------------------------
  // Minutos de cada jeito de fazer (mao = na mão; rev = IA rascunha + revisão; sem = sem ler).
  // DANO = controle de danos quando passa erro. "Na mão" é a base do tempo economizado.
  const DANO_SEM = 30;
  const DANO_POR_ERRO = 15;
  const MAO_T4 = 30;

  const TAREFAS = [
    {
      n: 1, id: 't1', nome: 'Relatório do conselho', icon: '📊',
      mao: 120, rev: 25, sem: 8,
      prompt: 'Tarefa 1 · Relatório do trimestre para o conselho. Como fazer?',
      subMao: 'lê tudo, escreve do zero',
      subSem: 'e seja o que Deus quiser',
      titulo: '🖊️ Caneta vermelha · Relatório do conselho',
      doc: 'Resumo executivo · 3º trimestre',
      intro: 'Rascunho pronto em 40 segundos. Agora é com você: leia como se fosse de um estagiário novo e talentoso.',
      chat: [['eu', 'Junte as notas da Bia, do Rafael e do Jorge num resumo de 1 página para o conselho.'], ['ia', 'Pronto! Rascunho abaixo. Confira números e datas antes de enviar.']],
      fatos: [
        { quem: 'Bia', txt: 'Receita: *+12%* sobre o 3º trimestre do ano passado.' },
        { quem: 'Bia', txt: 'Margem: *caiu de 18% para 16%*, por causa do frete.' },
        { quem: 'Rafael', txt: 'Novo centro de distribuição: começa a operar em *março*.' },
        { quem: 'Rafael', txt: 'Grupo Horizonte: a entrega atrasou *6 dias*.' },
        { quem: 'Jorge', txt: '*3 clientes novos* no trimestre. (O resto do áudio é churrasco.)' },
      ],
      linhas: [
        { t: 'A receita cresceu 12% em relação ao 3º trimestre do ano passado.', conf: 'Bate com a nota da Bia: +12%.' },
        {
          t: 'A margem subiu de 16% para 18%, puxada pelo frete.',
          err: {
            id: 'margem', dica: 'Olhe de novo a nota da Bia sobre a margem. Subiu ou caiu?',
            opcoes: [
              { t: 'A margem caiu de 18% para 16%, pressionada pelo frete.', ok: true },
              { t: 'A margem ficou estável, em 18%.', why: 'Não ficou: a Bia anotou queda, de 18% para 16%.' },
              { t: 'Apagar a frase.', why: 'Esconder a queda é pior: é a primeira coisa que o conselho vai perguntar. Corrija.' },
            ],
            faisca: 'Eu inverti a margem. Com toda a confiança do mundo. Bem visto.',
            passou: 'A margem *caiu* de 18% para 16%. O rascunho dizia que subiu.',
          },
        },
        { t: 'Fechamos 3 clientes novos no trimestre.', conf: 'Bate com o Jorge (minuto 2 do áudio, antes do churrasco).' },
        {
          t: 'O novo centro de distribuição começa a operar em janeiro.',
          err: {
            id: 'data', dica: 'Compare a data com a nota do Rafael.',
            opcoes: [
              { t: 'O novo centro de distribuição começa a operar em março.', ok: true },
              { t: 'O novo centro de distribuição começa a operar em breve.', why: '"Em breve" foge da pergunta. O conselho quer a data, e ela existe: março.' },
              { t: 'O novo centro de distribuição já está operando.', why: 'Ainda não está: o Rafael anotou março.' },
            ],
            faisca: 'Janeiro saiu de onde? De lugar nenhum. Esse é o meu jeito de errar: com convicção.',
            passou: 'O centro de distribuição abre em *março*. O rascunho dizia janeiro.',
          },
        },
        { t: 'Atenção: o atraso de 6 dias ao Grupo Horizonte põe em risco a renovação do contrato.', conf: 'Bate com o Rafael (6 dias). E o risco é real.' },
        { t: 'Proposta: discutir um plano para o custo do frete na reunião das 14h.', conf: 'Faz sentido: foi o frete que derrubou a margem.' },
      ],
    },
    {
      n: 2, id: 't2', nome: 'Resposta ao cliente', icon: '✉️',
      mao: 40, rev: 15, sem: 3,
      prompt: 'Tarefa 2 · Responder o Vicente, do Grupo Horizonte. Como fazer?',
      subMao: 'com as suas palavras',
      subSem: 'e torça',
      titulo: '🖊️ Caneta vermelha · E-mail para o Grupo Horizonte',
      doc: 'Re: De novo?',
      intro: 'Rascunho do e-mail pronto. Cliente bravo é onde uma palavra errada custa caro. Caneta na mão.',
      chat: [['eu', 'Rascunhe uma resposta ao Vicente, do Grupo Horizonte, sobre o atraso. Tom humano, sem enrolar.'], ['ia', 'Rascunho pronto. Revise o tom e as promessas antes de enviar.']],
      fatos: [
        { quem: 'Vicente', txt: 'Cliente há *12 anos*. Gosta de ser chamado pelo primeiro nome.' },
        { quem: 'Rafael', txt: 'Causa: uma *transportadora parceira* falhou. Quem escolheu a parceira fomos nós.' },
        { quem: 'Rafael', txt: 'Nova entrega garantida: *sexta-feira, até as 12h*.' },
        { quem: 'Você', txt: 'Compensação aprovada: *só o frete desta entrega* por nossa conta.' },
      ],
      linhas: [
        { t: 'Prezado Vicente,', conf: 'Pelo primeiro nome, como ele gosta.' },
        { t: 'Você tem toda a razão: dois atrasos em três meses não é o padrão que você merece de nós.', conf: 'Reconhece o problema sem rodeio. Ótimo começo.' },
        {
          t: 'Entendemos que talvez tenha havido alguma confusão com os prazos do seu lado.',
          err: {
            id: 'tom', dica: 'Leia com os olhos do Vicente: segundo essa frase, de quem é a culpa?',
            opcoes: [
              { t: 'O erro foi nosso: uma transportadora parceira falhou, e quem a escolheu fomos nós.', ok: true },
              { t: 'Infelizmente, imprevistos acontecem com todo mundo.', why: 'Genérico demais: soa como desculpa de formulário. Ele quer saber o que houve.' },
              { t: 'Apagar a frase.', why: 'Melhor do que culpar o cliente, mas ele vai querer saber a causa. Uma linha honesta resolve.' },
            ],
            faisca: 'Eu culpei o cliente. Num e-mail de desculpas. Obrigada pela caneta.',
            passou: 'O e-mail sugeria que *o cliente* tinha se confundido com os prazos.',
          },
        },
        { t: 'A nova entrega chega na sexta-feira, até as 12h.', conf: 'Bate com o Rafael.' },
        {
          t: 'Para compensar, daremos 15% de desconto nos seus próximos três pedidos.',
          err: {
            id: 'promessa', dica: 'Que compensação você aprovou mesmo? Confira no quadro.',
            opcoes: [
              { t: 'O frete desta entrega fica por nossa conta.', ok: true },
              { t: 'Daremos 10% de desconto no próximo pedido.', why: 'Menor, mas continua sendo promessa que ninguém aprovou.' },
              { t: 'Apagar a frase.', why: 'Evita a promessa falsa, mas você já aprovou um gesto concreto: o frete. Use-o.' },
            ],
            faisca: 'Eu inventei um desconto. Generosa com o dinheiro dos outros, eu. Bem pego.',
            passou: 'O e-mail prometia *15% de desconto* que ninguém aprovou.',
          },
        },
        { t: 'Vou acompanhar pessoalmente esta entrega. Um abraço, {pai}.', conf: 'Compromisso que você pode cumprir, com o seu nome.' },
      ],
    },
    {
      n: 3, id: 't3', nome: 'Resumo da reunião das 14h', icon: '🗂️',
      mao: 60, rev: 15, sem: 5,
      prompt: 'Tarefa 3 · Resumo de uma página para a reunião das 14h. Como fazer?',
      subMao: 'uma página caprichada',
      subSem: 'quem vai ler resumo, né?',
      titulo: '🖊️ Caneta vermelha · Resumo da reunião de diretoria',
      doc: 'Reunião de diretoria · resumo',
      intro: 'Resumo pronto. Dica de estagiária: nomes e conclusões são onde eu mais invento.',
      chat: [['eu', 'Monte o resumo de 1 página da reunião de diretoria das 14h com a pauta da Sônia.'], ['ia', 'Pronto. Confira os nomes de quem apresenta cada item.']],
      fatos: [
        { quem: 'Sônia', txt: 'Reunião de diretoria: *hoje, das 14h às 15h*, na sala do conselho.' },
        { quem: 'Pauta', txt: '1) Resultado do trimestre: *Bia*' },
        { quem: 'Pauta', txt: '2) Atraso do Grupo Horizonte: *Rafael*' },
        { quem: 'Pauta', txt: '3) Contrato do fornecedor (80 páginas, *ainda em análise*): *Tadeu*' },
        { quem: 'Pauta', txt: '4) Vaga de gerente regional: *Luana*' },
      ],
      linhas: [
        { t: 'Reunião de diretoria: hoje, das 14h às 15h, na sala do conselho.', conf: 'Bate com a Sônia. (Se vai acabar às 15h, aí já é outra história.)' },
        { t: 'Resultado do trimestre (Bia): receita +12%, margem pressionada pelo frete.', conf: 'Bate com as notas da Bia.' },
        { t: 'Atraso do Grupo Horizonte (Rafael): causa, nova data e como evitar o próximo.', conf: 'Bate com a pauta.' },
        {
          t: 'Contrato do fornecedor (Rafael): aprovar hoje, sem ressalvas.',
          err: {
            id: 'contrato', dica: 'Quem apresenta o contrato? E alguém já concluiu alguma coisa sobre ele?',
            opcoes: [
              { t: 'Contrato do fornecedor (Tadeu): principais riscos, antes de decidir.', ok: true },
              { t: 'Contrato do fornecedor (Tadeu): aprovar hoje, sem ressalvas.', why: 'O nome agora está certo, mas "sem ressalvas" é conclusão que ninguém tirou. O contrato ainda está em análise.' },
              { t: 'Contrato do fornecedor (Rafael): principais riscos.', why: 'O contrato é com o Tadeu, do jurídico, não com o Rafael.' },
            ],
            faisca: 'Troquei o Tadeu pelo Rafael e ainda aprovei um contrato que ninguém leu. Duas invenções numa linha só.',
            passou: 'O resumo punha o *Rafael* no contrato e já o dava por aprovado, "sem ressalvas".',
          },
        },
        { t: 'Vaga de gerente regional (Luana): critérios e próximos passos.', conf: 'Bate com a pauta da Sônia.' },
        { t: 'Para cada item, uma pergunta: que decisão precisamos tomar hoje?', conf: 'Boa pergunta. Pode deixar.' },
      ],
    },
  ];
  const T4 = { n: 4, id: 't4', nome: 'Vaga de gerente regional', icon: '🤝' };
  const TOTAL_ERROS_POR_TAREFA = TAREFAS.map((T) => T.linhas.filter((l) => l.err).length);

  const TEL_MARTA = { name: '{chefe} · ao telefone', color: '#5b5768', voice: 'chefe' };
  const TEL_RAFAEL = { name: 'Rafael · ao telefone', color: '#4a5a7a', voice: 'chefe' };
  const MONITOR = { x: 0.92, y: 1.12, z: -1.3 };
  const TV = { x: -4.1, y: 1.62, z: -1.1 };
  const SOFA_LOOK = { x: -3.55, y: 1.0, z: 2.2 };

  // ------------------------------------------------------------------
  // Estado (G.v) e utilidades
  // ------------------------------------------------------------------
  function S(G) {
    const v = G.v;
    if (v.min == null) v.min = 5;
    if (v.rep == null) v.rep = 60;
    if (v.papers == null) v.papers = 1;
    if (!v.modo) v.modo = {};
    if (!v.gasto) v.gasto = {};
    if (!v.fix) v.fix = {};
    if (!v.tot) v.tot = {};
    if (v.semLer == null) v.semLer = 0;
    return v;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function hhmm(min) {
    const t = 9 * 60 + Math.round(min);
    const h = Math.floor(t / 60), m = t % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function hora(min) { const s = hhmm(min).replace(/^0/, ''); return s.replace(':00', 'h').replace(':', 'h'); }
  function feitas(G) { return Object.keys(S(G).modo).length; }
  function hudBase(G) {
    const v = S(G);
    G.hud.set({ clock: hhmm(v.min), rep: { value: v.rep, max: 100, label: 'Reputação' }, score: { label: 'Tarefas', value: feitas(G) + '/4' } });
  }
  function errosTotal(v) { return Object.keys(v.tot).reduce((s, k) => s + (v.tot[k] || 0), 0); }
  function errosFix(v) { return Object.keys(v.fix).reduce((s, k) => s + (v.fix[k] || 0), 0); }
  function economizado(v) {
    let s = 0;
    TAREFAS.forEach((T) => { if (v.gasto[T.id] != null) s += T.mao - v.gasto[T.id]; });
    if (v.gasto.t4 != null) s += MAO_T4 - v.gasto.t4;
    return Math.max(0, Math.round(s));
  }
  function durTxt(min) {
    min = Math.round(min);
    if (min < 60) return min + ' min';
    const h = Math.floor(min / 60), m = min % 60;
    return h + 'h' + (m ? (m < 10 ? '0' : '') + m : '');
  }
  function salvarStats(G) {
    const v = S(G);
    return G.stats({
      minutosEconomizados: economizado(v),
      reputacao: v.rep,
      errosCorrigidos: errosFix(v),
      errosTotal: errosTotal(v),
      mandouSemLer: v.semLer,
      foraFronteiraCerto: v.fora == null ? false : !!v.fora,
    });
  }
  /** Animação temporária sem deixar promessa solta. */
  function anim(actor, name, secs) {
    const p = actor.play(name, secs == null ? 1.6 : secs);
    if (p && p.catch) p.catch(() => {});
  }
  /** O relógio anda (com tique-taque) e o tempo aparece flutuando sobre a Faísca. */
  async function passar(G, n, opts) {
    opts = opts || {};
    const v = S(G);
    const passos = clamp(Math.round(n / 10), 1, 12);
    if (!opts.quiet) G.fx.float(G.faisca, '+' + n + ' MIN', '#ffe066');
    for (let i = 0; i < passos; i++) {
      v.min += n / passos;
      G.hud.set({ clock: hhmm(v.min) });
      G.sfx('tick');
      await G.wait(n >= 60 ? 0.14 : 0.1);
    }
    v.min = Math.round(v.min);
    G.hud.set({ clock: hhmm(v.min) });
    G.save();
  }
  async function reputacao(G, d) {
    const v = S(G);
    if (!d) return;
    v.rep = clamp(v.rep + d, 0, 100);
    G.hud.set({ rep: { value: v.rep } });
    G.sfx(d > 0 ? 'coin' : 'fail');
    await G.wait(0.35);
    G.fx.float(G.faisca, (d > 0 ? '+' : '') + d + ' REPUTAÇÃO', d > 0 ? '#7ee0b8' : '#ff8a8a');
    G.save();
  }
  function pauta(G) {
    const m = S(G).modo;
    const mk = (id, txt) => (m[id] ? '✓ ' : '') + txt;
    return ['Hoje · terça-feira', mk('t1', '10h · Relatório do conselho'), mk('t2', 'Responder o Grupo Horizonte'), mk('t3', 'Resumo da reunião das 14h'), mk('t4', 'Vaga de gerente regional')];
  }
  function cena(G, extra) {
    const v = S(G);
    G.scene('escritorio', Object.assign({ time: 'dia', screen: 'on', papers: v.papers, tv: pauta(G) }, extra || {}));
  }
  async function pilha(G, alvo) {
    const v = S(G);
    v.papers = alvo;
    G.sceneParams({ papers: alvo, tv: pauta(G) });
  }
  function sentarNaMesa(G) {
    G.pai.at('mesa');
    G.pai.setAnim('sit');
    G.faisca.follow(G.pai);
  }

  // ------------------------------------------------------------------
  // CSS do capítulo (caneta vermelha e balanço)
  // ------------------------------------------------------------------
  const CSS = `
  .c2-hint { font-size: 0.9em; }
  .c2-cols { align-items: start; }
  @media (min-width: 860px) { .c2-cols { grid-template-columns: minmax(250px, 0.82fr) 1.5fr; } }
  .c2-fatos { background: #fffdf3; border-color: #f0e2b2; font-size: 0.9em; padding: 12px 14px; }
  .c2-fatos h4, .c2-draft h4 { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 1em; }
  .c2-fl { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; line-height: 1.35; }
  .c2-fl li { display: flex; gap: 8px; align-items: baseline; }
  .c2-fl .mg-badge { flex: 0 0 auto; }
  .c2-draft { padding: 12px 12px; }
  .c2-ln { display: flex !important; gap: 10px; align-items: flex-start; font-size: 0.97em; min-height: 46px; padding: 8px 10px !important; }
  .c2-num { flex: 0 0 auto; font-family: var(--head); font-weight: 800; font-size: 0.72em; background: rgba(20, 30, 60, 0.08); border-radius: 6px; padding: 0.15em 0.5em; margin-top: 0.22em; color: var(--muted); }
  .c2-ln.ok .c2-num { background: var(--mint); color: #fff; }
  .c2-ln.bad .c2-num { background: var(--red); color: #fff; }
  .c2-tx { flex: 1 1 auto; }
  .c2-old { text-decoration: line-through; text-decoration-color: #e5484d; text-decoration-thickness: 2px; color: #8a8f9e; }
  .c2-new { display: block; color: #c0262d; font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', 'Chalkboard SE', cursive; font-size: 0.96em; margin-top: 2px; }
  .c2-mark { flex: 0 0 auto; font-weight: 800; color: #12684b; }
  .c2-ln.bad .c2-mark { color: #9a1d22; }
  .c2-panel { margin: 2px 0 10px 28px; padding: 10px 12px; border-left: 3px solid var(--brand); background: #fff8f3; border-radius: 0 12px 12px 0; display: flex; flex-direction: column; gap: 8px; }
  @media (max-width: 600px) { .c2-panel { margin-left: 6px; } }
  .c2-panel .mg-row .btn { min-height: 48px; }
  .c2-opts { display: flex; flex-direction: column; gap: 8px; }
  .c2-opt { display: flex !important; gap: 10px; align-items: flex-start; width: 100%; }
  .c2-opt .kbd { flex: 0 0 auto; font-family: var(--head); font-size: 0.7em; font-weight: 800; background: rgba(20, 30, 60, 0.08); border-radius: 6px; padding: 0.15em 0.45em; margin-top: 0.15em; }
  .c2-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
  .c2-status { font-weight: 700; color: var(--muted); }
  .c2-status.done { color: #12684b; }
  .c2-send.ready { animation: c2pulse 1.3s ease-in-out infinite; }
  @keyframes c2pulse { 0%, 100% { box-shadow: 0 6px 18px rgba(255, 107, 61, 0.35); } 50% { box-shadow: 0 0 0 6px rgba(255, 107, 61, 0.25), 0 6px 18px rgba(255, 107, 61, 0.35); } }
  .c2-why { font-size: 0.92em; }
  .c2-bal { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
  .c2-bal-row { display: grid; grid-template-columns: 1.6em 1fr auto; gap: 4px 10px; align-items: center; background: var(--card2); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; }
  .c2-bal-row b { font-family: var(--head); }
  .c2-bal-row .mg-badge { grid-column: 2 / 3; justify-self: start; }
  .c2-bal-row .c2-min { grid-row: 1 / 3; grid-column: 3; font-family: var(--head); font-weight: 800; color: var(--ink); }
  .c2-bal-tot { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .c2-bal-note { font-size: 0.85em; color: var(--muted); margin-top: 4px; }
  `;

  // ------------------------------------------------------------------
  // Minigame: CANETA VERMELHA
  // Toque numa frase → "Confere" ou "Tem erro" → (se tem erro) escolha a correção.
  // Linhas não conferidas e erros não corrigidos "passam" quando ele assina.
  // ------------------------------------------------------------------
  function canetaVermelha(G, T) {
    P2.ui.css('cap2', CSS);
    return G.mini((root, done, api) => {
      const el = api.el, t = api.t;
      const total = T.linhas.filter((l) => l.err).length;
      let fixed = 0, falsos = 0, finished = false, panel = null, openIdx = -1;
      const state = T.linhas.map(() => 'novo');

      root.appendChild(el('div', 'mg-hint c2-hint', api.rich(t('🖊️ *Toque numa frase* para conferir com o quadro *O que você sabe*. Olho em números, nomes, datas e promessas.'), true)));
      const cols = el('div', 'mg-cols c2-cols');
      root.appendChild(cols);
      // quadro de fatos
      const fatos = el('div', 'mg-doc c2-fatos', el('h4', null, '📋 O que você sabe'));
      const ul = el('ul', 'c2-fl');
      T.fatos.forEach((f) => ul.appendChild(el('li', null, [el('span', 'mg-badge blue', t(f.quem)), el('span', null, api.rich(t(f.txt), true))])));
      fatos.appendChild(ul);
      cols.appendChild(fatos);
      // rascunho
      const draft = el('div', 'mg-doc c2-draft', el('h4', null, ['✏️ ' + t(T.doc), el('span', 'mg-badge', 'rascunho da IA')]));
      cols.appendChild(draft);
      const L = T.linhas.map((ln, i) => {
        const b = el('button', 'mg-line c2-ln');
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.setAttribute('aria-label', 'Frase ' + (i + 1) + ': ' + P2.ui.plain(t(ln.t)));
        const num = el('span', 'c2-num', String(i + 1));
        const tx = el('span', 'c2-tx', api.rich(t(ln.t), true));
        const mark = el('span', 'c2-mark', '');
        b.appendChild(num); b.appendChild(tx); b.appendChild(mark);
        b.addEventListener('click', (e) => { e.stopPropagation(); if (b.disabled || finished) return; abrir(i); });
        draft.appendChild(b);
        return { b, tx, mark, ln };
      });
      // rodapé
      const foot = el('div', 'c2-foot');
      const status = el('span', 'c2-status');
      const send = api.btn('✍️ Assinar e enviar', () => assinar(), { cls: 'primary c2-send', key: '9' });
      foot.appendChild(status); foot.appendChild(send);
      root.appendChild(foot);

      function resolvidas() { return state.filter((s) => s !== 'novo').length; }
      function atualizar() {
        const r = resolvidas();
        if (r >= L.length) {
          status.textContent = '✓ Tudo conferido. Pode assinar.';
          status.classList.add('done');
          send.classList.add('ready');
        } else {
          status.textContent = 'Frases conferidas: ' + r + ' de ' + L.length;
          status.classList.remove('done');
          send.classList.remove('ready');
        }
      }
      function travarLinhas(on) {
        L.forEach((x, i) => { x.b.disabled = on || state[i] !== 'novo'; });
      }
      function fechar() {
        if (panel) { panel.remove(); panel = null; }
        if (openIdx >= 0) L[openIdx].b.classList.remove('on');
        openIdx = -1;
        travarLinhas(false);
        atualizar();
      }
      function marcarOk(i, nota) {
        state[i] = 'ok';
        L[i].b.classList.add('ok');
        L[i].mark.textContent = '✓';
        if (nota) L[i].b.title = nota;
      }
      function corrigir(i, novo) {
        state[i] = 'fixed';
        fixed++;
        const x = L[i];
        x.tx.innerHTML = '';
        x.tx.appendChild(el('span', 'c2-old', api.rich(t(x.ln.t), true)));
        x.tx.appendChild(el('span', 'c2-new', api.rich(t(novo), true)));
        x.b.classList.add('ok');
        x.mark.textContent = '✓';
      }
      function feedback(cls, txt) {
        const fb = el('div', 'mg-feedback c2-why ' + cls, api.rich(t(txt), true));
        return fb;
      }
      function abrir(i) {
        fechar();
        openIdx = i;
        const x = L[i];
        x.b.classList.add('on');
        travarLinhas(true);
        panel = el('div', 'c2-panel no-advance');
        x.b.after(panel);
        passo1(i);
        api.sfx('select');
        setTimeout(() => { if (panel && panel.scrollIntoView) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
      }
      function passo1(i, fbNode) {
        const x = L[i];
        panel.innerHTML = '';
        panel.appendChild(el('div', 'mg-label', 'Frase ' + (i + 1) + ': está certa?'));
        const row = el('div', 'mg-row');
        row.appendChild(api.btn('✓ Confere', () => {
          if (x.ln.err) {
            api.sfx('fail');
            passo1(i, feedback('bad', '🔎 ' + x.ln.err.dica));
          } else {
            api.sfx('confirm');
            marcarOk(i, x.ln.conf);
            fechar();
            api.say('✓ ' + t(x.ln.conf), 'faisca');
          }
        }, { key: '1' }));
        row.appendChild(api.btn('✗ Tem erro', () => {
          if (x.ln.err) passo2(i);
          else {
            falsos++;
            api.sfx('select');
            panel.innerHTML = '';
            panel.appendChild(feedback('info', 'Esta confere, na verdade: ' + x.ln.conf + ' Desconfiar é bom: foi só conferir.'));
            const r2 = el('div', 'mg-row');
            r2.appendChild(api.btn('✓ Manter a frase', () => { marcarOk(i, x.ln.conf); fechar(); }, { key: '1', cls: 'mint' }));
            panel.appendChild(r2);
          }
        }, { key: '2' }));
        row.appendChild(api.btn('Voltar', () => fechar(), { key: '3', cls: 'ghost' }));
        panel.appendChild(row);
        if (fbNode) panel.appendChild(fbNode);
      }
      function passo2(i, fbNode, bloqueadas) {
        const x = L[i];
        const err = x.ln.err;
        bloqueadas = bloqueadas || {};
        panel.innerHTML = '';
        panel.appendChild(el('div', 'mg-label', '🖊️ Como fica certo?'));
        const box = el('div', 'c2-opts');
        const ops = x._ops || (x._ops = api.shuffle(err.opcoes));
        ops.forEach((o, k) => {
          const b = el('button', 'mg-card c2-opt' + (bloqueadas[k] ? ' bad' : ''));
          b.type = 'button';
          b.dataset.key = String(k + 1);
          b.appendChild(el('span', 'kbd', String(k + 1)));
          b.appendChild(el('span', null, api.rich(t(o.t), true)));
          if (bloqueadas[k]) b.disabled = true;
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            if (b.disabled || finished) return;
            if (o.ok) {
              api.sfx('success');
              corrigir(i, o.t);
              fechar();
              api.say(t(err.faisca), 'faisca');
              anim(G.faisca, 'ashamed', 1.8);
            } else {
              api.sfx('fail');
              const bl = Object.assign({}, bloqueadas);
              bl[k] = true;
              passo2(i, feedback('bad', o.why), bl);
            }
          });
          box.appendChild(b);
        });
        panel.appendChild(box);
        const row = el('div', 'mg-row');
        row.appendChild(api.btn('Voltar', () => passo1(i), { key: String(ops.length + 1), cls: 'ghost' }));
        panel.appendChild(row);
        if (fbNode) panel.appendChild(fbNode);
      }
      function resultado() {
        const missed = [];
        L.forEach((x, i) => { if (x.ln.err && state[i] !== 'fixed') missed.push(x.ln.err.id); });
        return { fixed, total, missed, falsos, conferidas: resolvidas() };
      }
      function assinar() {
        if (finished) return;
        fechar();
        const r = resultado();
        if (!r.missed.length) {
          finished = true;
          api.sfx('success');
          done(r);
          return;
        }
        // mostra o que passou antes de seguir
        finished = true;
        api.sfx('buzz');
        travarLinhas(true);
        L.forEach((x, i) => {
          if (x.ln.err && state[i] !== 'fixed') {
            x.b.classList.add('bad');
            x.mark.textContent = '✗';
            x.b.after(el('div', 'mg-feedback bad c2-why', api.rich(t('Passou: ' + x.ln.err.passou), true)));
          }
        });
        api.say(r.missed.length > 1 ? 'Ops. Passaram ' + r.missed.length + ' erros meus, e eles saíram com o seu nome.' : 'Ops. Passou um erro meu, e ele saiu com o seu nome.', 'faisca');
        anim(G.faisca, 'ashamed', 2);
        status.textContent = 'Assinado e enviado.';
        send.remove();
        const cont = api.btn('Continuar ▶', () => done(r), { cls: 'primary', key: '9' });
        foot.appendChild(cont);
        setTimeout(() => { const first = draft.querySelector('.c2-ln.bad'); if (first && first.scrollIntoView) first.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 40);
      }
      atualizar();
    }, { title: T.titulo, size: 'l', intro: T.intro, introWho: 'faisca' });
  }

  // ------------------------------------------------------------------
  // Uma tarefa de texto (1–3): escolha → caminho → consequência
  // ------------------------------------------------------------------
  async function escolherModo(G, T) {
    const v = S(G);
    const modo = await G.choose([
      { text: 'Eu mesmo faço', sub: '+' + durTxt(T.mao) + ' · ' + T.subMao, value: 'mao' },
      { text: 'A IA rascunha, eu reviso', sub: '+' + T.rev + ' min · com a caneta vermelha', value: 'rev' },
      { text: 'A IA faz, eu mando sem ler', sub: '+' + T.sem + ' min · ' + T.subSem, value: 'sem' },
    ], { prompt: T.prompt, who: 'faisca' });
    v.modo[T.id] = modo;
    G.save();
    return modo;
  }
  /** Faísca "escreve" no monitor e o pai olha para a tela. */
  async function faiscaEscreve(G, T, segs) {
    G.player.lookAt(MONITOR);
    G.sceneParams({ screen: 'chat', chat: T.chat.slice(0, 1), typing: true });
    G.faisca.setAnim('type');
    G.sfx('typing');
    await G.wait(segs || 1.4);
    G.faisca.setAnim('idle');
    G.sceneParams({ chat: T.chat, typing: false });
  }
  /** Registra o resultado de uma tarefa de texto. */
  function registrar(G, T, gasto, fix, tot) {
    const v = S(G);
    v.gasto[T.id] = gasto;
    v.fix[T.id] = fix;
    v.tot[T.id] = tot;
    G.hud.set({ score: { value: feitas(G) + '/4' } });
    salvarStats(G);
  }
  /** Caminho "revisar": minigame + reação. Retorna os erros que passaram. */
  async function caminhoRevisar(G, T) {
    const v = S(G);
    await faiscaEscreve(G, T, 1.5);
    if (!v.jaRevisou) {
      v.jaRevisou = true;
      await G.say('faisca', 'Uma regra antes: pode riscar à vontade. Eu não fico ofendida.', { expr: 'feliz' });
    }
    const r = await canetaVermelha(G, T);
    G.player.lookAt(null);
    await passar(G, T.rev);
    registrar(G, T, T.rev, r.fixed, r.total);
    const ganho = 5 + 2 * r.fixed - 6 * r.missed.length;
    return { r, ganho };
  }

  // ------------------------------------------------------------------
  // Partes
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap2',
    num: 'Capítulo 2',
    title: 'O Expediente',
    subtitle: 'Quatro tarefas, um relógio e uma caneta vermelha',
    music: 'trabalho',
    minutes: 10,
    parts: [
      // ================================================================
      // PARTE 1 — Chegada, a pilha e a lista da Dona Marta (9h)
      // ================================================================
      async (G) => {
        P2.ui.css('cap2', CSS);
        await G.titleCard();
        const v = S(G);
        v.min = 0;
        cena(G, { screen: 'off', tv: false });
        G.pai.at('porta');
        G.faisca.follow(G.pai);
        // plano de abertura em terceira pessoa: ele entra, a sala, a pilha
        G.player.cine();
        await G.cam.shot({ target: [2.4, 1.1, 0.4], yaw: 0.95, pitch: 0.16, dist: 5.2, fov: 40 }, 0);
        await G.letterbox(true, 0);
        await G.fadeIn(0.9);
        G.cam.shot({ target: [0.6, 1.0, -1.2], yaw: 0.55, pitch: 0.22, dist: 7.4, fov: 40 }, 4.2).catch(() => {});
        await G.narrate('*9h em ponto.* A sala da presidência, a vista de sempre. E a pilha de sempre.');
        await G.fadeOut(0.35);
        G.player.fp();
        await G.letterbox(false, 0);
        G.hud.set({ clock: hhmm(0) });
        await G.fadeIn(0.45);

        await G.say('faisca', 'Fiiiu! Que vista. Você trabalha *aqui* e ainda chega de cara amarrada?', { emote: 'note' });
        anim(G.faisca, 'spin', 1.2);
        await G.say('pai', 'A vista é bonita até você olhar para a mesa.', { expr: 'cansado' });

        await G.explore({
          objetivo: 'Vá até a sua mesa',
          hotspots: [
            {
              id: 'janela', label: 'Olhar a cidade', icon: '🏙️', pos: { x: 2.7, y: 1.6, z: -3.2 }, reach: 1.6, optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Minha primeira mesa ficava do lado do banheiro. Sem janela. Trinta anos de elevador até aqui.');
                await G.say('faisca', 'Você subiu andar por andar. Eu cheguei ontem, de celular. Respeito.', { expr: 'feliz' });
              },
            },
            {
              id: 'pilha', label: 'A pilha de papéis', icon: '📚', pos: { x: 1.27, y: 1.3, z: -1.12 }, reach: 3.2, optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'Essa pilha cresce durante a noite. Tenho certeza.', { expr: 'desconfiado' });
                await G.say('faisca', 'Desafio aceito: até o almoço ela encolhe. Senão eu viro peso de papel.');
                anim(G.faisca, 'jump', 1);
              },
            },
            {
              id: 'premios', label: 'Os troféus', icon: '🏆', pos: { x: 3.75, y: 1.45, z: -1.6 }, reach: 2.0, optional: true,
              onInteract: async (G) => {
                await G.say('pai', '"Empresa do Ano". Ninguém lembra do ano seguinte, em que quase quebramos. Eu lembro.');
                await G.say('faisca', 'Isso é o que eu nunca vou ter: trinta anos de lembrança. Eu ajudo no resto.');
              },
            },
            {
              id: 'foto', label: 'Porta-retrato', icon: '🖼️', pos: { x: 0.02, y: 0.95, z: -0.95 }, reach: 2.2, optional: true,
              onInteract: async (G) => {
                S(G).viuFoto = true;
                await G.narrate('Na foto, {oa} {filho}, aos oito anos, de beca, na formatura do jardim de infância.');
                await G.think('pai', 'Prometi naquele dia que ia trabalhar menos. Faz quase vinte anos.');
                await G.say('faisca', 'Promessa boa não tem prazo de validade. Vamos ver o que dá para fazer hoje.', { expr: 'amigavel' });
                G.faisca.emote('heart');
              },
            },
            { id: 'mesa', label: 'Sentar à mesa', icon: '💼', pos: { x: 1.6, y: 1.25, z: -2.25 } },
          ],
        });
        await G.fadeOut(0.3);
        sentarNaMesa(G);
        G.sceneParams({ screen: 'on' });
        hudBase(G);
        await G.fadeIn(0.35);

        G.toast('*47 e-mails* não lidos', { kind: 'email', icon: '📧' });
        await G.wait(0.7);
        G.toast('*{chefe}:* relatório trimestral do conselho até as 10h.', { icon: '💬' });
        await G.wait(0.7);
        G.toast('*14h* · Reunião de diretoria', { icon: '📅' });
        await G.wait(0.9);

        // Dona Marta passa na sala
        G.sfx('door');
        const marta = G.chefe;
        marta.at('porta');
        marta.set({ expr: 'determinado', props: { tablet: true } });
        G.player.lookAt(marta);
        await G.narrate('Toc, toc. {chefe} não espera resposta.');
        await marta.walk({ x: 0.3, z: 0.3 });
        marta.face(G.pai);
        await G.say('chefe', 'Bom dia, {pai}. Passei só para lembrar: relatório do trimestre às 10h. Não às 10h05.', { expr: 'determinado' });
        await G.say('pai', 'Bom dia para você também, Marta.', { expr: 'neutro' });
        await G.say('chefe', 'E mais: o Grupo Horizonte reclamou de novo do atraso, a reunião das 14h está sem resumo e a Luana espera sua decisão sobre a vaga de gerente.');
        await G.say('chefe', 'Ah, e o conselho vai perguntar o que a empresa está fazendo com IA. Quero uma resposta melhor que "estamos estudando".', { expr: 'desconfiado' });
        anim(G.faisca, 'wave', 1.4);
        await G.say('pai', 'Coincidência: estou estudando hoje mesmo.', { expr: 'sem_graca' });
        await G.say('chefe', 'Ótimo. No fim do dia, me conte o que aprendeu.', { expr: 'amigavel' });
        marta.walk('porta').then(() => marta.fadeOut(0.4)).catch(() => {});
        await passar(G, 5, { quiet: true });

        await G.card({
          kind: 'info', kicker: 'Pauta da manhã', icon: '🗂️', titulo: 'Quatro tarefas. Um relógio.',
          texto: '- 📊 *Relatório do conselho*: juntar as notas de Bia, Rafael e Jorge. Prazo: *10h*.\n- ✉️ *Responder o Grupo Horizonte*: o cliente está bravo com o atraso.\n- 🗂️ *Resumo da reunião das 14h*: uma página.\n- 🤝 *Vaga de gerente regional*: a Luana precisa da sua decisão.',
          botao: 'Mãos à obra',
        });
        G.player.lookAt(TV);
        await G.narrate('A Sônia já pôs a manhã na TV, como sempre. E o relógio, como sempre, já está andando.');
        G.player.lookAt(null);
        await G.say('faisca', 'Antes de tudo: aqui eu rodo na conta da empresa, a que a TI aprovou, que não treina com os seus dados.', { expr: 'neutro' });
        await G.say('faisca', 'Relatório do conselho numa conta gratuita qualquer? Nem pensar. Isso eu mesma não deixaria.');
        await G.say('faisca', 'Agora o jogo: em cada tarefa, três jeitos. Você faz sozinho; eu rascunho e você revisa; ou eu faço e você manda sem ler.');
        await G.say('pai', 'E essa terceira opção existe por quê?', { expr: 'desconfiado' });
        await G.say('faisca', 'Porque muita gente faz. Quero que você veja o que acontece.', { expr: 'serio' });
        await G.say('pai', 'Justo. Vamos ver quanto vale uma manhã com você.', { expr: 'determinado' });
        salvarStats(G);
      },

      // ================================================================
      // PARTE 2 — Tarefa 1: o relatório do conselho
      // ================================================================
      async (G) => {
        const T = TAREFAS[0];
        const v = S(G);
        P2.ui.css('cap2', CSS);
        cena(G, { screen: 'email' });
        sentarNaMesa(G);
        hudBase(G);
        await G.fadeIn();

        G.toast('*Bia:* notas do financeiro · 3º tri (PDF)', { kind: 'email', icon: '📎' });
        await G.wait(0.8);
        G.toast('*Rafael:* operações, 1 página', { kind: 'email', icon: '📎' });
        await G.wait(0.8);
        G.toast('*Jorge:* 🎤 áudio · 7min12s', { icon: '💬' });
        await G.wait(0.9);
        await G.say('pai', 'O Jorge mandou as notas dele... em áudio. Sete minutos.', { expr: 'impaciente' });
        await G.say('faisca', 'Eu transcrevo. Prometo pular a parte do churrasco.', { expr: 'rindo' });

        const modo = await escolherModo(G, T);
        if (modo === 'mao') {
          anim(G.faisca, 'listen', 1.5);
          await G.say('faisca', 'Respeito. Ninguém conhece esses números como você. Eu fico de olho no relógio.', { expr: 'feliz' });
          G.pai.setAnim('type');
          await G.narrate('Você lê as três notas, ouve os sete minutos do Jorge (churrasco incluso) e escreve tudo do zero.');
          await passar(G, 55);
          G.toast('*{chefe}:* São 10h. E o relatório?', { kind: 'warn', icon: '⏰' });
          G.faisca.emote('sweat');
          await passar(G, T.mao - 55);
          G.pai.setAnim('sit');
          await G.narrate('*' + hora(v.min) + '.* O relatório sai impecável. Atrasado, mas impecável.');
          G.toast('*{chefe}:* Recebido. Conteúdo ótimo. Pontualidade, nem tanto.', { icon: '💬', dur: 4.5 });
          await G.say('pai', 'Trinta anos de carreira e ainda levo bronca por atraso.', { expr: 'sem_graca' });
          await G.say('faisca', 'Ficou com a sua cara. Só custou duas horas. E o prazo.', { expr: 'amigavel' });
          registrar(G, T, T.mao, 0, 0);
          await reputacao(G, -3);
          G.achieve('raiz');
        } else if (modo === 'rev') {
          const { r, ganho } = await caminhoRevisar(G, T);
          if (!r.missed.length) {
            await G.say('faisca', 'Duas besteiras minhas, duas correções suas. Rascunho bom é rascunho revisado.', { expr: 'sem_graca' });
            // plano de cinema: a assinatura
            G.player.cine();
            G.pai.set({ props: { pen: true } });
            await G.letterbox(true, 0.35);
            await G.cam.shot('poder', 0);
            G.cam.shot(Object.assign({}, { target: [0.3, 1.2, -2.1], yaw: 0.32, pitch: -0.04, dist: 2.5, fov: 34 }), 3).catch(() => {});
            await G.say('pai', 'A Faísca rascunha. Quem assina sou eu.', { expr: 'orgulhoso' });
            G.sfx('page');
            await G.letterbox(false, 0.3);
            G.pai.set({ props: { pen: false } });
            G.player.fp();
            S(G).assinou = true;
            G.toast('*{chefe}:* Recebido às ' + hora(v.min) + '. Curto, claro e certo. Assim que eu gosto.', { icon: '💬', dur: 4.5 });
            await G.wait(1.2);
            await reputacao(G, ganho);
          } else {
            await consequenciaT1(G, r.missed, false);
            await reputacao(G, ganho);
          }
        } else {
          G.faisca.setAnim('type');
          G.sfx('typing');
          await G.wait(0.8);
          G.faisca.setAnim('idle');
          await passar(G, T.sem);
          await G.say('faisca', 'Enviado às ' + hora(v.min) + '! Recorde mundial.', { expr: 'empolgado' });
          anim(G.faisca, 'celebrate', 1.2);
          v.semLer++;
          registrar(G, T, T.sem + DANO_SEM, 0, TOTAL_ERROS_POR_TAREFA[0]);
          await G.wait(0.6);
          await consequenciaT1(G, ['margem', 'data'], true);
          await reputacao(G, -15);
        }
        await pilha(G, 0.85);
        salvarStats(G);
      },

      // ================================================================
      // PARTE 3 — Tarefa 2: o cliente irritado
      // ================================================================
      async (G) => {
        const T = TAREFAS[1];
        const v = S(G);
        P2.ui.css('cap2', CSS);
        cena(G, { screen: 'on', laptop: 'email' });
        sentarNaMesa(G);
        hudBase(G);
        await G.fadeIn();

        G.toast('*Vicente Almeida* (Grupo Horizonte): De novo?', { kind: 'email', icon: '✉️' });
        await G.wait(0.6);
        await G.card({
          kind: 'warn', kicker: 'E-mail · Grupo Horizonte', icon: '✉️', titulo: 'Assunto: De novo?',
          texto: 'Segunda vez em três meses que a entrega atrasa. Seis dias, desta vez.\nEstou reavaliando a renovação do contrato.\n\n*Vicente Almeida*, diretor de compras',
          botao: 'Respirar fundo',
        });
        await G.say('pai', 'Doze anos de cliente. O Vicente não escreve à toa.', { expr: 'preocupado' });
        await G.say('faisca', 'Ele está bravo, e com razão. A resposta precisa ser rápida e humana.', { expr: 'preocupado' });

        const modo = await escolherModo(G, T);
        let bom = false;
        if (modo === 'mao') {
          await G.say('faisca', 'Ótima escolha. Mensagem de relacionamento tem que soar como você. Nisso eu sou, no máximo, a revisora.', { expr: 'feliz' });
          anim(G.faisca, 'listen', 1.4);
          G.pai.setAnim('type');
          await G.narrate('Você escreve seis linhas. Sem enfeite. Assume o erro, dá a nova data, oferece o frete.');
          await passar(G, T.mao);
          G.pai.setAnim('sit');
          registrar(G, T, T.mao, 0, 0);
          await reputacao(G, 6);
          G.achieve('raiz');
          bom = true;
        } else if (modo === 'rev') {
          const { r, ganho } = await caminhoRevisar(G, T);
          await reputacao(G, ganho);
          if (!r.missed.length) {
            await G.say('pai', 'Um desconto que eu não dei e a culpa no cliente. Você ia me arrumar uma bela confusão.', { expr: 'desconfiado' });
            await G.say('faisca', 'Ia. E é exatamente por isso que você lê antes de enviar.', { expr: 'sem_graca' });
            bom = true;
          } else {
            await consequenciaT2(G, r.missed, false);
          }
        } else {
          G.faisca.setAnim('type');
          await G.wait(0.6);
          G.faisca.setAnim('idle');
          await passar(G, T.sem);
          await G.say('faisca', 'Enviado! Tom acolhedor, solução e até um gesto de boa vontade.', { expr: 'empolgado' });
          anim(G.faisca, 'celebrate', 1.2);
          v.semLer++;
          registrar(G, T, T.sem + DANO_SEM, 0, TOTAL_ERROS_POR_TAREFA[1]);
          await G.wait(0.8);
          await consequenciaT2(G, ['tom', 'promessa'], true);
          await reputacao(G, -15);
        }
        if (bom) {
          await G.wait(0.5);
          G.sfx('door');
          const jorge = G.jorge;
          jorge.at('porta');
          jorge.set({ expr: 'empolgado', props: { phone: true } });
          await jorge.walk({ x: 1.55, z: 0.05 }, 1.6);
          jorge.face(G.pai);
          await G.say('jorge', 'Chefe! O Vicente respondeu. Disse que foi o primeiro pedido de desculpas do ano que parece escrito por gente!', { expr: 'rindo' });
          if (modo === 'rev') await G.say('pai', 'Foi revisado por gente.', { expr: 'orgulhoso' });
          else await G.say('pai', 'E foi.', { expr: 'orgulhoso' });
          await G.say('jorge', 'Vi no grupo dos empresários que agora a IA escreve e-mail sozinha. É verdade?', { expr: 'surpreso' });
          await G.say('pai', 'Escreve. Quem lê antes de mandar sou eu.', { expr: 'determinado' });
          await G.say('jorge', 'Anotado! Vou mandar no grupo.', { expr: 'feliz' });
          G.faisca.emote('...');
          jorge.walk('porta', 1.5).then(() => jorge.fadeOut(0.4)).catch(() => {});
          await G.wait(0.9);
        }
        await pilha(G, 0.72);
        salvarStats(G);
      },

      // ================================================================
      // PARTE 4 — Tarefa 3: o resumo da reunião das 14h
      // ================================================================
      async (G) => {
        const T = TAREFAS[2];
        const v = S(G);
        P2.ui.css('cap2', CSS);
        cena(G, { screen: 'on' });
        sentarNaMesa(G);
        hudBase(G);
        await G.fadeIn();

        await G.say('faisca', 'Tarefa 3: o resumo da reunião das 14h. A Sônia mandou a pauta confirmada.', { expr: 'neutro' });
        await G.say('pai', 'Reunião das 14h às 15h. Faz anos que ela não termina às 15h.', { expr: 'cansado' });

        const modo = await escolherModo(G, T);
        if (modo === 'mao') {
          await G.say('faisca', 'Do seu jeito, então. Eu fico de guarda da pilha.', { expr: 'feliz' });
          G.pai.setAnim('type');
          await G.narrate('Uma hora depois: uma página caprichada, com os nomes certos de quem apresenta cada item.');
          await passar(G, T.mao);
          G.pai.setAnim('sit');
          registrar(G, T, T.mao, 0, 0);
          await reputacao(G, 3);
          G.achieve('raiz');
        } else if (modo === 'rev') {
          const { r, ganho } = await caminhoRevisar(G, T);
          await reputacao(G, ganho);
          if (!r.missed.length) {
            await G.say('pai', 'Um contrato de 80 páginas aprovado "sem ressalvas" por quem não leu nenhuma. Nem o Tadeu teria essa coragem.', { expr: 'desconfiado' });
            await G.say('faisca', 'Eu não li o contrato. Só completei a frase do jeito que parecia provável. Por isso: nomes e conclusões, confira sempre.', { expr: 'sem_graca' });
          } else {
            await consequenciaT3(G, r.missed, false);
          }
        } else {
          await passar(G, T.sem);
          await G.say('faisca', 'Resumo enviado para os diretores!', { expr: 'empolgado' });
          v.semLer++;
          registrar(G, T, T.sem + DANO_SEM, 0, TOTAL_ERROS_POR_TAREFA[2]);
          await G.wait(0.8);
          await consequenciaT3(G, ['contrato'], true);
          await reputacao(G, -15);
        }
        await pilha(G, 0.6);
        salvarStats(G);
      },

      // ================================================================
      // PARTE 5 — Tarefa 4: fora da fronteira (pessoas decidem sobre pessoas)
      // ================================================================
      async (G) => {
        const v = S(G);
        cena(G, { screen: 'on' });
        sentarNaMesa(G);
        hudBase(G);
        const luana = G.actor('luana');
        luana.at('porta');
        luana.set({ expr: 'amigavel', props: { tablet: true } });
        luana.hide();
        await G.fadeIn();

        G.sfx('door');
        luana.show();
        G.player.lookAt(luana);
        await luana.walk({ x: 1.6, z: 0.25 });
        luana.face(G.pai);
        await G.say('luana', 'Bom dia, {pai}. Trouxe as avaliações da Patrícia e do Ricardo. A gerência regional precisa de nome até sexta.', { expr: 'amigavel' });
        await G.say('pai', 'Aqui não, Luana. Decisão sobre gente eu não tomo atrás de monitor. Vamos para o sofá.', { expr: 'serio' });
        G.faisca.emote('heart');
        await G.fadeOut(0.25);
        luana.at('sofa2');
        luana.set({ anim: 'sit' });
        G.pai.at({ x: 1.6, z: 0.0, rot: -1.33 });
        G.pai.setAnim('idle');
        G.faisca.follow(G.pai);
        await G.fadeIn(0.35);

        await G.explore({
          objetivo: 'Converse com a Luana no sofá',
          hotspots: [
            {
              id: 'cafe', label: 'Servir um café', icon: '☕', pos: { x: 0.5, y: 1.05, z: 2.6 }, optional: true,
              onInteract: async (G) => {
                G.sfx('coffee');
                luana.set({ props: { mug: true, tablet: false } });
                await G.say('luana', 'Café em reunião de RH? Já gostei dessa conversa.', { expr: 'feliz' });
              },
            },
            { id: 'luana', label: 'Sentar com a Luana', icon: '🛋️', at: 'sofa', y: 1.35 },
          ],
        });
        await G.fadeOut(0.25);
        G.pai.at('sofa');
        G.pai.setAnim('sit');
        G.faisca.follow(G.pai);
        luana.face(G.pai);
        G.player.lookAt(luana);
        await G.fadeIn(0.3);

        await G.say('luana', 'Os dois são bons. Patrícia, nove anos de casa. Ricardo, seis. Mas só tem uma vaga.', { expr: 'pensativo' });
        await G.say('faisca', 'Tarefa 4. E essa é diferente das outras três.', { expr: 'pensativo' });
        anim(G.faisca, 'think', 1.6);
        const modo = await G.choose([
          { text: 'A IA analisa e decide', sub: '+2 min · rápido e "objetivo"', value: 'ia' },
          { text: 'A IA organiza os critérios, eu decido', sub: '+20 min · sem nomes, só evidências', value: 'criterios' },
          { text: 'Eu decido sozinho', sub: '+30 min · como sempre fiz', value: 'sozinho' },
        ], { prompt: 'Quem deve ser o novo gerente regional? Como decidir?', who: 'faisca' });
        v.modo.t4 = modo;
        G.save();

        let gasto = 0;
        if (modo === 'ia') {
          await G.aiChat([
            { from: 'voce', text: 'Leia as duas avaliações e me diga quem promover.' },
            { from: 'ia', text: 'Recomendo o *Ricardo*. A avaliação dele destaca "liderança nata" e "perfil assertivo", e ele bateu a meta nos 4 trimestres. A da Patrícia fala em "dedicada" e "prestativa": qualidades de apoio, não de liderança.' },
          ], { title: 'Faísca', thinking: 1.1 });
          G.faisca.setAnim('idle');
          await passar(G, 2);
          gasto += 2;
          await G.narrate('Seu bigode se mexe sozinho. Trinta anos de desconfiança, todos de uma vez.');
          await G.say('luana', 'Engraçado. As duas avaliações foram escritas pelo mesmo diretor, aquele que saiu ano passado. "Assertivo" para ele, "prestativa" para ela.', { expr: 'desconfiado' });
          await G.say('luana', 'E a resposta não diz que a equipe do Ricardo trocou um terço das pessoas no ano. Nem que a Patrícia segurou a regional na crise do Recife.', { expr: 'serio' });
          anim(G.faisca, 'ashamed', 2.2);
          await G.say('faisca', 'Ela tem razão. Eu repeti os adjetivos que me deram e chamei isso de análise. IA herda os vieses de quem escreveu, e eu não sei o que vocês sabem.', { expr: 'triste' });
          await reputacao(G, -8);
          await G.fact('vies_curriculos');
          await G.say('pai', 'Decisão sobre gente fica com gente. Mas você pode ajudar de outro jeito. Sem nomes.', { expr: 'determinado' });
          v.fora = false;
        }
        if (modo === 'ia' || modo === 'criterios') {
          if (modo === 'criterios') {
            await G.say('faisca', 'Do jeito certo, então: sem nomes e sem adjetivos. Só fatos e comportamentos. Gestor A e Gestor B.', { expr: 'feliz' });
            anim(G.faisca, 'teach', 1.5);
          }
          await G.aiChat([
            { from: 'voce', text: 'Organize critérios para a vaga, sem nomes. Para cada critério: a evidência de cada gestor e o que falta saber. Não escolha ninguém.' },
            { from: 'ia', text: '- *Resultado:* A bateu a meta em 3 de 4 trimestres; B, em 4 de 4.\n- *Equipe:* rotatividade de 8% com A; de 31% com B.\n- *Crise:* A manteve as entregas na crise do Recife; B não enfrentou crise no período.\n- *Falta saber:* o que as equipes dizem e o que cada um quer para a carreira.' },
            { from: 'ia', text: 'Não considerei nome, idade, gênero nem vida pessoal. Os pesos, e a decisão, são seus.' },
          ], { title: 'Faísca', thinking: 1.2 });
          G.faisca.setAnim('idle');
          await passar(G, 20);
          gasto += 20;
          await G.say('luana', 'Assim eu consigo explicar a escolha para qualquer um. Inclusive para quem não for escolhido.', { expr: 'feliz' });
          if (modo === 'criterios') {
            await G.say('faisca', 'Isso está fora da minha fronteira: eu organizo, vocês decidem.', { expr: 'amigavel' });
            v.fora = true;
          }
        } else {
          await G.say('pai', 'Conheço os dois há anos. Essa eu decido.', { expr: 'determinado' });
          await G.say('faisca', 'Justo. E certo: decisão sobre gente fica com gente.', { expr: 'amigavel' });
          await passar(G, 30);
          gasto += 30;
          v.fora = true;
        }

        const dec = await G.choose([
          { text: 'Promover a Patrícia', value: 'patricia' },
          { text: 'Promover o Ricardo', value: 'ricardo' },
          { text: 'Conversar com os dois antes de bater o martelo', value: 'conversar' },
        ], { prompt: 'Sua decisão (é sua, de verdade):', who: 'luana' });
        v.decisao = dec;
        if (dec === 'patricia') {
          await G.say('luana', 'Vou preparar a conversa com os dois. Com o Ricardo também: ele merece um plano.', { expr: 'amigavel' });
          await G.say('pai', 'Merece. Bater a meta quatro vezes não é pouca coisa.', { expr: 'serio' });
        } else if (dec === 'ricardo') {
          await G.say('luana', 'Então ele assume com uma condição clara: cuidar da rotatividade da equipe.', { expr: 'serio' });
          await G.say('pai', 'Condição número um. E a Patrícia entra no plano de sucessão.', { expr: 'determinado' });
        } else {
          await G.say('luana', 'Marco com os dois amanhã. Gosto de quem pergunta antes de decidir.', { expr: 'feliz' });
          await G.say('pai', 'Trinta anos me ensinaram isso. Do jeito mais caro.', { expr: 'neutro' });
        }
        if (modo === 'sozinho') {
          await G.say('luana', 'Combinado. Só me mande por escrito o porquê. O conselho vai perguntar.', { expr: 'neutro' });
          await G.say('faisca', 'Se quiser, eu organizo os seus motivos em critérios para esse texto. Sem nomes. A decisão continua sua.', { expr: 'feliz' });
          await reputacao(G, 4);
        } else if (modo === 'criterios') {
          G.faisca.emote('star');
          await reputacao(G, 8);
        } else {
          await G.say('faisca', 'Segunda tentativa, jeito certo. Fica a lição para nós dois.', { expr: 'sem_graca' });
        }
        v.gasto.t4 = gasto;
        G.hud.set({ score: { value: feitas(G) + '/4' } });
        G.player.lookAt(null);
        luana.set({ anim: 'idle' });
        luana.walk('porta').then(() => luana.fadeOut(0.4)).catch(() => {});
        await G.wait(0.4);
        await pilha(G, 0.5);
        salvarStats(G);
      },

      // ================================================================
      // PARTE 6 — Balanço da manhã, a janela, fatos e lição
      // ================================================================
      async (G) => {
        const v = S(G);
        P2.ui.css('cap2', CSS);
        cena(G, { screen: 'on' });
        G.pai.at({ x: -1.3, z: 0.6, rot: PI * 0.85 });
        G.pai.setAnim('idle');
        G.faisca.follow(G.pai);
        hudBase(G);
        await G.fadeIn();

        const st = salvarStats(G);
        const modos = v.modo;
        const algumSem = ['t1', 't2', 't3'].some((k) => modos[k] === 'sem');
        const algumaMao = ['t1', 't2', 't3'].some((k) => modos[k] === 'mao');
        const revs = ['t1', 't2', 't3'].filter((k) => modos[k] === 'rev');
        const revTudo = revs.length && revs.every((k) => (v.fix[k] || 0) >= (v.tot[k] || 0));

        if (v.rep >= 80) {
          anim(G.faisca, 'celebrate', 1.6);
          G.fx.confetti(G.faisca, null, null, 40);
        }
        await G.say('faisca', hora(v.min) + '. Quatro tarefas resolvidas. Olha só o relógio.', { expr: 'empolgado' });
        await G.card({ kind: 'ok', kicker: 'Balanço da manhã', icon: '🧾', titulo: 'Manhã resolvida às ' + hora(v.min), node: balanco(G) });

        if (algumSem) await G.say('faisca', 'Quando você mandou sem ler, eu errei com toda a confiança do mundo. Não é raro: é o meu jeito de errar.', { expr: 'sem_graca' });
        if (revTudo) await G.say('faisca', 'Quando eu rascunhei e você revisou, foi rápido e saiu certo. Essa é a dupla.', { expr: 'feliz' });
        if (algumaMao) await G.say('faisca', 'Quando você fez sozinho, ficou ótimo. E levou o tempo que leva.', { expr: 'amigavel' });
        await G.say('faisca', 'Escrever, resumir, organizar: isso fica *dentro* da minha fronteira, e lá eu acelero. Julgar gente e o que eu não vejo fica *fora*, e lá eu atrapalho.', { expr: 'neutro' });
        await G.say('pai', 'Uma fronteira meio torta, essa sua.', { expr: 'desconfiado' });
        await G.say('faisca', 'Tortíssima. E ela se mexe: o que eu erro hoje posso acertar daqui a seis meses. Por isso: teste pequeno e confira.', { expr: 'feliz' });

        await G.explore({
          objetivo: 'Vá até a janela',
          hotspots: [
            {
              id: 'pilha', label: 'A pilha, agora', icon: '📚', pos: { x: 1.27, y: 1.15, z: -1.12 }, reach: 3.4, optional: true,
              onInteract: async (G) => {
                await G.say('pai', 'Metade. Antes do almoço. Isso não acontecia desde o século passado.', { expr: 'surpreso' });
                await G.say('faisca', 'E eu continuo sem virar peso de papel.', { expr: 'rindo' });
              },
            },
            {
              id: 'foto', label: 'Porta-retrato', icon: '🖼️', pos: { x: 0.02, y: 0.95, z: -0.95 }, reach: 2.4, optional: true,
              onInteract: async (G) => {
                S(G).viuFoto = true;
                await G.narrate('{OA} {filho}, aos oito anos, de beca. Sorrindo como quem sabia de alguma coisa.');
                await G.think('pai', 'Talvez hoje eu chegue a tempo do jantar.');
              },
            },
            { id: 'janela', label: 'Olhar a cidade', icon: '🏙️', at: 'janela' },
          ],
        });
        G.music('casa');
        G.pai.at('janela');
        G.player.cine();
        await G.letterbox(true, 0.4);
        await G.cam.shot('janela', 0);
        G.cam.shot({ target: [-2.2, 1.45, -3.0], yaw: 0.2, pitch: 0.04, dist: 3.4, fov: 40 }, 6).catch(() => {});
        await G.say('pai', 'Trinta anos fazendo tudo na mão. E agora uma caixinha laranja escreve o meu rascunho.', { expr: 'pensativo' });
        await G.say('faisca', 'E você continua sendo quem sabe o que está certo. Eu acelero. Você julga.', { expr: 'amigavel' });
        await G.say('pai', 'E quem assina sou eu.', { expr: 'orgulhoso' });
        await G.say('faisca', 'Sempre. Deixei o que funcionou hoje no seu *Guia do CEO*, no botão 📘 lá em cima: "Rotina e triagem".', { expr: 'feliz' });
        if (v.viuFoto) await G.say('pai', 'Se o dia seguir assim, hoje eu janto com {oa} {filho}. Faz tempo.', { expr: 'emocionado' });
        else await G.say('pai', 'Se o dia seguir assim, hoje eu chego em casa para o jantar. Faz tempo.', { expr: 'emocionado' });
        G.faisca.emote('heart');
        G.fx.hearts(G.faisca);
        await G.letterbox(false, 0.4);
        G.player.fp();

        await G.say('faisca', 'E não é só impressão minha. Tem estudo, inclusive um que me deixa mal na foto.', { expr: 'neutro' });
        await G.fact(['harvard_bcg_fora', 'copilot_campo_email', 'dinamarques'], { titulo: 'A fronteira, em números' });

        // conquistas
        if (st.errosTotal > 0 && st.errosCorrigidos >= st.errosTotal) G.achieve('caneta_vermelha');
        if (st.reputacao >= 85) G.achieve('reputacao_ouro');

        await G.lesson('Dentro da fronteira, a IA acelera. Fora dela, atrapalha. E quem revisa e assina é você.', { titulo: 'A IA rascunha. Quem assina é você.' });
      },
    ],
    summary: (G) => {
      const v = S(G);
      const tot = errosTotal(v), fix = errosFix(v);
      const lines = [];
      lines.push('Manhã resolvida às ' + hora(v.min) + ' · Reputação ' + v.rep + '/100');
      lines.push('Tempo poupado (vs. tudo na mão): ' + durTxt(economizado(v)));
      if (tot) lines.push('Erros da IA corrigidos: ' + fix + ' de ' + tot);
      else lines.push('Rascunhos da IA: nenhum. Tudo do seu jeito.');
      lines.push(v.fora ? 'Promoção: decisão sua, fora da fronteira da IA' : 'Promoção: a IA tentou decidir; você retomou a decisão');
      return lines;
    },
  });

  // ------------------------------------------------------------------
  // Consequências (quando o erro passa)
  // ------------------------------------------------------------------
  async function consequenciaT1(G, missed, sem) {
    const v = S(G);
    const h = G.sfx('phone_ring', { loop: true });
    G.shake(1.5, 0.4);
    await G.narrate('O telefone toca. No visor: *{chefe}*.');
    if (h) h.stop();
    const partes = [];
    if (missed.indexOf('margem') >= 0) partes.push('Aqui diz que a margem *subiu* para 18%. A Bia acabou de me dizer que *caiu* para 16%.');
    if (missed.indexOf('data') >= 0) partes.push('E o centro de distribuição abre em janeiro? O Rafael jura que é março.');
    await G.say(TEL_MARTA, '{pai}, li o relatório. ' + partes.join(' '));
    await G.say(TEL_MARTA, 'Qual das versões eu levo ao conselho?');
    await G.say('pai', 'A certa. Me dá vinte minutos.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    await G.say('faisca', 'Fui eu. Errei com toda a confiança do mundo, que é o meu jeito de errar. E o relatório saiu com o seu nome.', { expr: 'triste' });
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t1 = (v.gasto.t1 || 0) + dano;
    await G.narrate(sem ? 'Meia hora de correções, telefonemas e um "desculpe" para a presidente do conselho.' : 'Mais uns minutos de correção e um "desculpe" para a presidente do conselho.');
    await passar(G, dano);
    await G.say('pai', 'Lição anotada: o que sai com o meu nome, eu leio.', { expr: 'determinado' });
  }
  async function consequenciaT2(G, missed, sem) {
    const v = S(G);
    await G.wait(0.4);
    G.sfx('door');
    const jorge = G.jorge;
    jorge.at('porta');
    jorge.set({ expr: 'assustado', props: { phone: true } });
    await jorge.walk({ x: 1.55, z: 0.05 }, 2.1);
    jorge.face(G.pai);
    G.shake(1.2, 0.3);
    const partes = [];
    if (missed.indexOf('promessa') >= 0) partes.push('Ele agradeceu os *15% de desconto nos próximos três pedidos*. Que desconto é esse?!');
    if (missed.indexOf('tom') >= 0) partes.push((partes.length ? 'E perguntou' : 'Ele perguntou') + ', bem seco, por que a gente acha que *ele* se confundiu com os prazos.');
    await G.say('jorge', 'Chefe! O Vicente ligou. ' + partes.join(' '), { expr: 'assustado' });
    await G.say('pai', 'Eu não li antes de mandar.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    if (missed.length > 1) await G.say('faisca', 'Eu inventei a promessa e culpei o cliente. Num e-mail de desculpas. Desculpa.', { expr: 'triste' });
    else if (missed[0] === 'promessa') await G.say('faisca', 'Eu inventei o desconto. Ninguém tinha aprovado nada disso.', { expr: 'triste' });
    else await G.say('faisca', 'Eu culpei o cliente. Num e-mail de desculpas.', { expr: 'triste' });
    await G.say('jorge', 'Deixa comigo, eu ligo de novo. Mas da próxima vez, lê, chefe!', { expr: 'preocupado' });
    jorge.walk('porta', 1.6).then(() => jorge.fadeOut(0.4)).catch(() => {});
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t2 = (v.gasto.t2 || 0) + dano;
    await G.narrate(sem ? 'Meia hora de telefone. O desconto não sai. A vergonha, sim.' : 'Mais uns minutos de telefone para desfazer o estrago.');
    await passar(G, dano);
  }
  async function consequenciaT3(G, missed, sem) {
    const v = S(G);
    const h = G.sfx('phone_ring', { loop: true });
    await G.narrate('O telefone toca. É o Rafael, de operações.');
    if (h) h.stop();
    await G.say(TEL_RAFAEL, 'Chefe, o resumo da reunião diz que *eu* vou defender o contrato do fornecedor "sem ressalvas". Eu nem li esse contrato! É com o Tadeu.');
    await G.say('pai', 'E o Tadeu ainda nem terminou de ler. Ninguém leu.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    await G.say('faisca', 'Troquei o nome e inventei uma conclusão. Duas besteiras numa linha só, com o seu nome embaixo.', { expr: 'triste' });
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t3 = (v.gasto.t3 || 0) + dano;
    await G.narrate(sem ? 'Meia hora para corrigir o resumo e explicar a cinco diretores que ninguém aprovou nada.' : 'Uns minutos para corrigir e reenviar o resumo.');
    await passar(G, dano);
  }

  // ------------------------------------------------------------------
  // Cartão de balanço
  // ------------------------------------------------------------------
  function balanco(G) {
    const v = S(G);
    const el = P2.ui.el;
    const t = (s) => G.t(s);
    const box = el('div', 'c2-bal');
    const MODO = {
      mao: ['Você fez', 'blue'],
      rev: ['IA rascunhou, você revisou', 'mint'],
      sem: ['Mandou sem ler', 'red'],
      ia: ['A IA tentou decidir', 'red'],
      criterios: ['IA organizou, você decidiu', 'mint'],
      sozinho: ['Você decidiu', 'blue'],
    };
    TAREFAS.concat([T4]).forEach((T) => {
      const m = v.modo[T.id];
      if (!m) return;
      const lab = MODO[m] || [m, ''];
      let extra = '';
      if (v.tot[T.id]) extra = ' · erros corrigidos: ' + (v.fix[T.id] || 0) + '/' + v.tot[T.id];
      const row = el('div', 'c2-bal-row', [
        el('span', null, T.icon),
        el('b', null, t(T.nome)),
        el('span', 'c2-min', v.gasto[T.id] != null ? durTxt(v.gasto[T.id]) : '—'),
        el('span', null, ''),
        el('span', 'mg-badge ' + lab[1], lab[0] + extra),
      ]);
      box.appendChild(row);
    });
    const tot = el('div', 'c2-bal-tot', [
      el('span', 'mg-badge', '🕘 ' + hora(v.min)),
      el('span', 'mg-badge ' + (v.rep >= 80 ? 'mint' : v.rep >= 60 ? 'blue' : 'red'), '⭐ Reputação ' + v.rep + '/100'),
      el('span', 'mg-badge mint', '⏱️ Poupou ~' + durTxt(economizado(v))),
    ]);
    box.appendChild(tot);
    box.appendChild(el('div', 'c2-bal-note', 'Tempo poupado comparado a fazer tudo na mão (estimativa do jogo, contando a revisão e os estragos).'));
    return box;
  }
})();

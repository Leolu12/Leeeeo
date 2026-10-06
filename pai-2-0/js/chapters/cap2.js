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
      chat: [['eu', 'Use o pedido que montei no café: junte as notas da Bia, do Rafael e do Jorge num resumo de 1 página para o conselho.'], ['ia', 'Pronto! Rascunho abaixo. Confira números e datas antes de enviar.']],
      fatos: [
        { quem: 'Bia', txt: 'Receita: *+14%* sobre o 3º trimestre do ano passado.' },
        { quem: 'Bia', txt: 'Margem bruta: *caiu de 35% para 30%*. As causas, ainda estou apurando.' },
        { quem: 'Rafael', txt: 'Novo centro de distribuição: começa a operar em *março*.' },
        { quem: 'Rafael', txt: 'Grupo Horizonte: a entrega atrasou *6 dias*. É o *segundo atraso* em três meses.' },
        { quem: 'Jorge', txt: '*3 clientes novos* no trimestre. (O resto do áudio é churrasco.)' },
      ],
      linhas: [
        { t: 'A receita cresceu 14% em relação ao 3º trimestre do ano passado.', conf: 'Bate com a nota da Bia: +14%.' },
        {
          t: 'A margem bruta subiu de 30% para 35%, sinal de mais eficiência.',
          err: {
            id: 'margem', dica: 'Olhe de novo a nota da Bia sobre a margem. Subiu ou caiu?',
            opcoes: [
              { t: 'A margem bruta caiu de 35% para 30%. A Bia está apurando as causas.', ok: true },
              { t: 'A margem bruta ficou estável, perto de 35%.', why: 'Não ficou: a Bia anotou queda, de 35% para 30%.' },
              { t: 'Apagar a frase.', why: 'Esconder a queda é pior: é a primeira coisa que o conselho vai perguntar. Corrija.' },
            ],
            faisca: 'Eu inverti a margem e ainda chamei de eficiência. Com toda a confiança do mundo. Bem visto.',
            passou: 'A margem bruta *caiu* de 35% para 30%. O rascunho dizia que subiu.',
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
            faisca: 'Janeiro saiu de lugar nenhum. Quando me falta uma data, às vezes eu preencho uma. Por isso data se confere.',
            passou: 'O centro de distribuição abre em *março*. O rascunho dizia janeiro.',
          },
        },
        { t: 'Atenção: segundo atraso em três meses ao Grupo Horizonte, de 6 dias desta vez.', conf: 'Bate com o Rafael: 6 dias, e é o segundo em três meses.' },
        { t: 'Próximo passo: a Bia está apurando as causas da queda de margem.', conf: 'Bate com a Bia. Honesto: o porquê ainda está com ela, e ninguém inventou um.' },
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
      chat: [['eu', 'Retome o rascunho do café para o Vicente, agora com os dados do Rafael. Tom humano, sem enrolar.'], ['ia', 'Rascunho pronto. Revise o tom e as promessas antes de enviar.']],
      fatos: [
        { quem: 'Você', txt: 'O Vicente é cliente há *12 anos*, o maior que temos no Sul. Gosta de ser chamado pelo primeiro nome.' },
        { quem: 'Rafael', txt: 'Causa: não foi a transportadora. O *fornecedor de embalagens* atrasou, e *nós não avisamos* o cliente a tempo.' },
        { quem: 'Rafael', txt: 'Nova entrega garantida: *sexta-feira, até as 12h*.' },
        { quem: 'Você', txt: 'Compensação aprovada: *só o frete desta entrega* por nossa conta.' },
        { quem: 'Você', txt: 'Esta entrega, você vai acompanhar *pessoalmente*.' },
      ],
      linhas: [
        { t: 'Prezado Vicente,', conf: 'Pelo primeiro nome, como ele gosta.' },
        { t: 'Você tem razão: dois atrasos em três meses estão longe do padrão que você merece de nós.', conf: 'Reconhece o problema sem rodeio. Ótimo começo.' },
        {
          t: 'Entendemos que talvez tenha havido alguma confusão com os prazos do seu lado.',
          err: {
            id: 'tom', dica: 'Leia com os olhos do Vicente: segundo essa frase, de quem é a culpa?',
            opcoes: [
              { t: 'O erro foi nosso: um fornecedor atrasou, e nós não avisamos você a tempo.', ok: true },
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
        { t: 'Vou acompanhar pessoalmente esta entrega. Um abraço, {pai}.', conf: 'Bate com o quadro: um compromisso seu, que você pode cumprir.' },
      ],
    },
    {
      n: 3, id: 't3', nome: 'Memorando do reajuste', icon: '🗂️',
      mao: 60, rev: 15, sem: 5,
      prompt: 'Tarefa 3 · Memorando de uma página sobre o reajuste, para a reunião das 14h. Como fazer?',
      subMao: 'uma página caprichada',
      subSem: 'quem lê memorando, né?',
      titulo: '🖊️ Caneta vermelha · Memorando do reajuste',
      doc: 'Memorando · Reajuste de preços',
      intro: 'Memorando pronto. Dica de estagiária: é nas conclusões que eu mais invento.',
      chat: [['eu', 'Monte um memorando de 1 página sobre o reajuste para a diretoria, com as notas da Bia e do Jorge.'], ['ia', 'Pronto. Revise antes de mandar para a diretoria.']],
      fatos: [
        { quem: 'Bia', txt: 'Proposta: reajuste de *6%*, a partir do *mês que vem*.' },
        { quem: 'Bia', txt: 'Sem reajuste, a margem do semestre *não fecha*.' },
        { quem: 'Jorge', txt: 'Acima de 6%, risco de perder o *Grupo Horizonte*.' },
        { quem: 'Jorge', txt: 'Com o Horizonte, *ainda não falei* de preço. Hoje não é o dia.' },
        { quem: 'Você', txt: 'Quem decide o reajuste é *a diretoria, na reunião*.' },
      ],
      linhas: [
        { t: 'Para a diretoria · reunião de hoje, 14h · Assunto: reajuste de preços.', conf: 'Bate com a agenda.' },
        {
          t: 'Proposta da Bia: reajuste de 8% a partir do mês que vem.',
          err: {
            id: 'numero', dica: 'Confira o percentual na nota da Bia.',
            opcoes: [
              { t: 'Proposta da Bia: reajuste de 6% a partir do mês que vem.', ok: true },
              { t: 'Proposta da Bia: reajuste entre 6% e 8% a partir do mês que vem.', why: 'Ninguém falou em 8%. Uma faixa inventada continua sendo invenção.' },
              { t: 'Proposta da Bia: reajuste a definir.', why: 'A proposta existe e tem número: 6%. A diretoria precisa dele para decidir.' },
            ],
            faisca: 'Troquei o 6 pelo 8. Parece pouco. Para o Jorge, é a diferença entre segurar e perder um cliente.',
            passou: 'O memorando dizia que a Bia propôs *8%*. Ela propôs *6%*.',
          },
        },
        { t: 'Motivo: sem reajuste, a margem do semestre não fecha.', conf: 'Bate com a Bia, palavra por palavra.' },
        { t: 'Risco: acima de 6%, podemos perder o Grupo Horizonte, nosso maior cliente no Sul.', conf: 'Bate com o Jorge. E, depois desta manhã, o risco é bem real.' },
        {
          t: 'O Grupo Horizonte já foi consultado e concordou com o novo preço.',
          err: {
            id: 'consulta', dica: 'Alguém já conversou com o Grupo Horizonte sobre preço? Veja a nota do Jorge.',
            opcoes: [
              { t: 'O Grupo Horizonte ainda não foi consultado sobre o novo preço.', ok: true },
              { t: 'O Grupo Horizonte deve concordar com o novo preço.', why: '"Deve concordar" é palpite fantasiado de fato. O Jorge nem falou de preço com eles.' },
              { t: 'Apagar a frase.', why: 'Melhor do que inventar, mas a diretoria precisa saber que o cliente ainda não foi ouvido. Diga isso.' },
            ],
            faisca: 'Inventei a resposta de um cliente que ninguém consultou. Escrevi o que parecia provável, não o que aconteceu.',
            passou: 'O memorando dizia que o Grupo Horizonte *já tinha concordado*. Ninguém falou de preço com eles.',
          },
        },
        { t: 'Decisão para hoje: aprovar ou não o reajuste, e de quanto.', conf: 'É isso que a reunião precisa decidir. E quem decide é a diretoria.' },
      ],
    },
  ];
  const T4 = { n: 4, id: 't4', nome: 'Vaga de gerente regional', icon: '🤝' };
  const TOTAL_ERROS_POR_TAREFA = TAREFAS.map((T) => T.linhas.filter((l) => l.err).length);

  const TEL_MARTA = { name: '{chefe} · ao telefone', color: '#5b5768', voice: 'chefe' };
  const TEL_BIA = { name: 'Bia · ao telefone', color: '#4a5a7a', voice: 'filho' };
  const MONITOR = { x: 0.92, y: 1.12, z: -1.3 };
  const TV = { x: -4.1, y: 1.62, z: -1.1 };
  // De pé diante da mesa, à vista de quem está sentado (o monitor fica à esquerda do olhar).
  const VISITA = { x: 0.3, z: 0.35 };
  // Conversa no sofá em plano de cinema: os dois sentados, de frente para a sala; a câmera do lado da
  // mesa de centro. A Faísca flutua entre as cabeças, um pouco à frente, sem tapar ninguém.
  const FAISCA_SOFA = { x: -3.3, z: 1.75, rot: PI / 2 };
  const SOFA_SHOT = { target: [-3.45, 0.98, 1.75], yaw: PI / 2 + 0.2, pitch: 0.08, dist: 3.0, fov: 40 };

  // ------------------------------------------------------------------
  // Estado (G.v) e utilidades
  // ------------------------------------------------------------------
  /**
   * Contorno de motor: em primeira pessoa, a câmera automática de diálogo vira a visão para quem
   * fala; como a Faísca flutua num ponto relativo à própria visão, a visão "persegue" a Faísca e
   * gira sem parar. Aqui as falas da Faísca não mexem na câmera (o mesmo que {cam:false}).
   */
  function prep(G) {
    if (G._c2prep) return G;
    const say0 = G.say;
    G.say = (who, text, o) => say0(who, text, who === 'faisca' ? Object.assign({ cam: false }, o || {}) : o);
    G._c2prep = true;
    return G;
  }
  function S(G) {
    prep(G);
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
  function resolvido(v) { return (v.min < 180 ? 'Manhã resolvida às ' : 'Tudo resolvido às ') + hora(v.min); }
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
    return ['Hoje · terça-feira', mk('t1', '10h · Relatório do conselho'), mk('t2', 'Responder o Grupo Horizonte'), mk('t3', 'Memorando do reajuste (14h)'), mk('t4', 'Vaga de gerente regional')];
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
    G.player.lookAt(null);
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
  .c2-pf { display: none; font-size: 0.84em; background: #fffdf3; border: 1px solid #f0e2b2; border-radius: 10px; padding: 7px 10px; line-height: 1.35; }
  .c2-pf b.c2-pft { display: block; font-size: 0.92em; margin-bottom: 3px; }
  .c2-pf div + div { margin-top: 3px; }
  @media (max-width: 859px) { .c2-pf { display: block; } }
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

      root.appendChild(el('div', 'mg-hint c2-hint', api.rich(t('🖊️ *Toque numa frase* (ou aperte o número dela) e confira com o quadro *O que você sabe*. Olho em números, nomes, datas e promessas.'), true)));
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
      /** No celular o quadro fica lá em cima: repete os fatos, compactos, junto da frase aberta. */
      function fatosPerto() {
        const box = el('div', 'c2-pf', el('b', 'c2-pft', '📋 O que você sabe'));
        T.fatos.forEach((f) => box.appendChild(el('div', null, api.rich(t('*' + f.quem + ':* ' + f.txt.replace(/\*/g, '')), true))));
        return box;
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
        panel.appendChild(fatosPerto());
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
        panel.appendChild(fatosPerto());
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
    minutes: 12,
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
        G.pai.at('inicio'); // logo após a porta, já de frente para a mesa e a janela
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
        G.player.lookAt({ x: 0.6, y: 1.35, z: -2.8 }); // a mesa, a pilha e a vista
        await G.fadeIn(0.45);

        await G.say('faisca', 'Fiiiu! Que vista. Você trabalha *aqui* e ainda chega de cara amarrada?', { emote: 'note' });
        anim(G.faisca, 'spin', 1.2);
        await G.say('pai', 'A vista é bonita até você olhar para a mesa.', { expr: 'cansado' });

        await G.explore({
          objetivo: 'Vá até a sua mesa',
          hotspots: [
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
                await G.think('pai', 'Minha primeira mesa ficava do lado do banheiro. Sem janela. Foram muitos andares até aqui.');
                await G.say('faisca', 'Isso eu nunca vou ter: trinta anos de lembrança. Eu ajudo no resto.');
              },
            },
            {
              id: 'foto', label: 'Porta-retrato', icon: '🖼️', pos: { x: 0.02, y: 0.95, z: -0.95 }, reach: 2.2, optional: true,
              onInteract: async (G) => {
                S(G).viuFoto = true;
                await G.narrate('Na foto, {oa} {filho}, aos seis anos, de beca, na formatura do jardim de infância.');
                await G.think('pai', 'Prometi naquele dia que ia trabalhar menos. Faz mais de vinte anos.');
                await G.say('faisca', 'Promessa boa não tem prazo de validade. Vamos ver o que dá para fazer hoje.', { expr: 'amigavel' });
                G.faisca.emote('heart');
              },
            },
            // no corredor à direita da mesa (o caminho até a cadeira): dá para chegar andando reto da porta
            { id: 'mesa', label: 'Sentar à mesa', icon: '💼', pos: { x: 1.75, y: 1.6, z: -1.95 }, reach: 1.6 },
          ],
        });
        await G.fadeOut(0.3);
        sentarNaMesa(G);
        G.sceneParams({ screen: 'on' });
        hudBase(G);
        await G.fadeIn(0.35);

        G.toast('*47 e-mails* não lidos', { kind: 'email', icon: '📧' });
        await G.wait(0.7);
        G.toast('Grupo *Empresários do Bairro*: 348 mensagens', { icon: '💬' });
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
        await G.say('pai', 'Bom dia para você também, {chefe}.', { expr: 'neutro' });
        await G.say('chefe', 'E o Vicente, do Grupo Horizonte, me ligou ontem à noite. Atrasaram a entrega dele de novo? Doze anos de cliente, {pai}.', { expr: 'preocupado' });
        await G.say('pai', 'Eu sei. Ele recebe uma resposta minha ainda hoje de manhã.', { expr: 'serio' });
        await G.say('chefe', 'Ah, e o conselho vai perguntar o que a empresa está fazendo com IA. Quero uma resposta melhor que "estamos estudando".', { expr: 'desconfiado' });
        anim(G.faisca, 'wave', 1.4);
        await G.say('pai', 'Por acaso, estou testando uma hoje. Em período de experiência.', { expr: 'serio' });
        await G.say('chefe', 'Ótimo. No fim do dia, quero saber se foi efetivada.', { expr: 'amigavel' });
        marta.walk('porta').then(() => marta.fadeOut(0.4)).catch(() => {});
        await passar(G, 5, { quiet: true });

        await G.card({
          kind: 'info', kicker: 'Pauta da manhã', icon: '🗂️', titulo: 'Quatro tarefas. Um relógio.',
          texto: '- 📊 *Relatório do conselho*: juntar as notas de Bia, Rafael e Jorge. Prazo: *10h*.\n- ✉️ *Responder o Grupo Horizonte*: o cliente está bravo com o atraso.\n- 🗂️ *Memorando do reajuste*: uma página para a reunião das 14h.\n- 🤝 *Vaga de gerente regional*: a Luana precisa da sua decisão.',
          botao: 'Mãos à obra',
        });
        G.player.lookAt(TV);
        await G.narrate('A Sônia, de folga hoje, deixou a pauta programada na TV. E o relógio já está andando.');
        G.player.lookAt(null);
        await G.say('faisca', 'Antes de tudo: em casa eu rodava no seu celular, numa conta pessoal. Aqui é a conta da empresa: a TI aprovou, e ela não usa os seus dados para treinar a IA.', { expr: 'neutro' });
        await G.say('pai', 'E quem garante que essa tal conta da empresa não espalha nada?', { expr: 'desconfiado' });
        await G.say('faisca', 'O contrato com o fornecedor e a TI, que conferiu as configurações. Material do conselho, só aqui. E senha ou código do banco, nem aqui.', { expr: 'neutro' });
        await G.say('faisca', 'Agora, o combinado da manhã: em cada tarefa, três jeitos. Você faz sozinho; eu rascunho e você revisa; ou eu faço e você manda sem ler.');
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
          await G.say('pai', 'Cabelo grisalho, sala da presidência, e ainda levo bronca por atraso.', { expr: 'sem_graca' });
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
            await G.say('pai', 'Você rascunha. Quem assina sou eu.', { expr: 'orgulhoso' });
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
          texto: 'Segunda vez em três meses que a entrega atrasa. Seis dias, desta vez.\nEstou reavaliando a renovação do contrato.\n\n*Vicente Almeida*, diretor de compras · Grupo Horizonte, Porto Alegre',
          botao: 'Respirar fundo',
        });
        await G.say('pai', 'O Vicente não escreve à toa. Muito menos liga para a {chefe}.', { expr: 'preocupado' });
        await G.say('faisca', 'Ele está bravo, e com razão. A resposta precisa ser rápida e humana.', { expr: 'preocupado' });

        const modo = await escolherModo(G, T);
        let bom = false;
        if (modo === 'mao') {
          await G.say('faisca', 'Boa. Mensagem de relacionamento tem que soar como você. Se quiser, no fim eu só dou uma revisada.', { expr: 'feliz' });
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
          if (!r.missed.length) {
            await reputacao(G, ganho);
            await G.say('pai', 'Um desconto que eu não dei e a culpa no cliente. Você ia me arrumar uma bela confusão.', { expr: 'desconfiado' });
            await G.say('faisca', 'Ia. E é exatamente por isso que você lê antes de enviar.', { expr: 'sem_graca' });
            bom = true;
          } else {
            await consequenciaT2(G, r.missed, false);
            await reputacao(G, ganho);
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
          await jorge.walk(VISITA, 1.6);
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

        G.toast('*Bia:* proposta de reajuste · 1 planilha', { kind: 'email', icon: '📎' });
        await G.wait(0.7);
        G.toast('*Jorge:* 🎤 áudio · 4min05s', { icon: '💬' });
        await G.wait(0.8);
        await G.say('faisca', 'Tarefa 3: o memorando do reajuste para a reunião das 14h. A Bia e o Jorge mandaram as notas.', { expr: 'neutro' });
        await G.say('pai', 'Reajuste é aquele assunto em que todo mundo concorda. Até a hora de falar com o cliente.', { expr: 'desconfiado' });

        const modo = await escolherModo(G, T);
        if (modo === 'mao') {
          await G.say('faisca', 'Do seu jeito, então. Eu fico de guarda da pilha.', { expr: 'feliz' });
          G.pai.setAnim('type');
          await G.narrate('Uma hora depois: uma página caprichada, com o número certo e sem falar em nome de cliente nenhum.');
          await passar(G, T.mao);
          G.pai.setAnim('sit');
          registrar(G, T, T.mao, 0, 0);
          await reputacao(G, 3);
          G.achieve('raiz');
        } else if (modo === 'rev') {
          const { r, ganho } = await caminhoRevisar(G, T);
          if (!r.missed.length) {
            await reputacao(G, ganho);
            await G.say('pai', 'Oito por cento e um cliente que "já concordou". O Jorge nem falou de preço com o Vicente.', { expr: 'desconfiado' });
            await G.say('faisca', 'E você pegou os dois antes da diretoria. A caneta vale mais onde tem número e conclusão.', { expr: 'sem_graca' });
          } else {
            await consequenciaT3(G, r.missed, false);
            await reputacao(G, ganho);
          }
        } else {
          G.faisca.setAnim('type');
          await G.wait(0.6);
          G.faisca.setAnim('idle');
          await passar(G, T.sem);
          await G.say('faisca', 'Memorando enviado para a diretoria! Claro, objetivo e otimista.', { expr: 'empolgado' });
          anim(G.faisca, 'celebrate', 1.2);
          v.semLer++;
          registrar(G, T, T.sem + DANO_SEM, 0, TOTAL_ERROS_POR_TAREFA[2]);
          await G.wait(0.8);
          await consequenciaT3(G, ['numero', 'consulta'], true);
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
        await luana.walk(VISITA);
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
                S(G).cafe = true;
                await G.think('pai', 'Dois cafés da garrafa térmica. Conversa difícil desce melhor com café.');
              },
            },
            { id: 'luana', label: 'Sentar com a Luana', icon: '🛋️', at: 'sofa', y: 1.35 },
          ],
        });
        await G.fadeOut(0.25);
        G.pai.at('sofa');
        G.pai.setAnim('sit');
        G.pai.set({ rot: PI / 2 - 0.3 }); // os dois levemente virados um para o outro
        luana.set({ rot: PI / 2 + 0.3 });
        G.faisca.unfollow();
        G.faisca.at(FAISCA_SOFA, 1.4);
        if (v.cafe) { luana.set({ props: { mug: true, tablet: false } }); G.pai.set({ props: { mug: true } }); }
        // decisão sobre gente: plano de cinema dos dois no sofá (na primeira pessoa, lado a lado, ficava apertado)
        G.player.cine();
        G.talkCam(false);
        await G.cam.shot(SOFA_SHOT, 0);
        G.cam.shot(Object.assign({}, SOFA_SHOT, { dist: SOFA_SHOT.dist - 0.45 }), 16).catch(() => {});
        await G.fadeIn(0.3);

        if (v.cafe) await G.say('luana', 'Café em reunião de RH? Já gostei dessa conversa.', { expr: 'feliz' });
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
          G.pai.setExpr('desconfiado');
          G.pai.emote('?');
          await G.narrate('Seu bigode se mexe sozinho. Promoção decidida por adjetivo?');
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
            { from: 'nota', text: 'A Luana passa os dados do RH sem nomes nem adjetivos: Gestor A e Gestor B.' },
            { from: 'voce', text: 'Organize critérios para a vaga, sem nomes. Para cada critério: a evidência de cada gestor e o que falta saber. Não escolha ninguém.' },
            { from: 'ia', text: '- *Resultado:* A bateu a meta em 3 de 4 trimestres; B, em 4 de 4.\n- *Equipe:* rotatividade de 8% com A; de 31% com B.\n- *Crise:* A manteve as entregas na crise do Recife; B não enfrentou crise no período.\n- *Falta saber:* o que as equipes dizem e o que cada um quer para a carreira.' },
            { from: 'ia', text: 'Não considerei nome, idade, gênero nem vida pessoal. Os pesos, e a decisão, são seus.' },
          ], { title: 'Faísca', thinking: 1.2 });
          G.faisca.setAnim('idle');
          await passar(G, 20);
          gasto += 20;
          await G.say('luana', 'Agora, os nomes de volta: A é a Patrícia; B, o Ricardo.', { expr: 'neutro' });
          await G.say('luana', 'Assim eu consigo explicar a escolha para qualquer um. Inclusive para quem não for escolhido.', { expr: 'feliz' });
          if (modo === 'criterios') {
            await G.say('faisca', 'Decidir sobre gente fica fora da minha fronteira: eu organizo, vocês decidem.', { expr: 'amigavel' });
            v.fora = true;
          }
        } else {
          await G.say('pai', 'Conheço os dois há anos. Essa eu decido.', { expr: 'determinado' });
          await G.say('faisca', 'Justo. E certo: decisão sobre gente fica com gente.', { expr: 'amigavel' });
          await G.think('pai', 'A Patrícia segurou a regional na crise do Recife. O Ricardo bate todas as metas, mas a equipe dele não para de trocar.');
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
          await G.say('luana', 'Vou preparar a conversa com os dois. O Ricardo merece um plano também.', { expr: 'amigavel' });
          await G.say('pai', 'Merece. Bater a meta quatro vezes não é pouca coisa.', { expr: 'serio' });
        } else if (dec === 'ricardo') {
          await G.say('luana', 'Então ele assume com uma condição clara: cuidar da rotatividade da equipe.', { expr: 'serio' });
          await G.say('pai', 'Condição número um. E a Patrícia entra no plano de sucessão.', { expr: 'determinado' });
        } else {
          await G.say('luana', 'Marco com os dois amanhã. Gosto de quem pergunta antes de decidir.', { expr: 'feliz' });
          await G.say('pai', 'A vida me ensinou isso. Do jeito mais caro.', { expr: 'neutro' });
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
        // de volta à primeira pessoa, ainda no sofá: a Luana sai contornando a mesa de centro
        G.talkCam(true);
        G.player.fp();
        G.player.lookAt(luana);
        luana.set({ anim: 'idle', props: { mug: false } });
        luana.walk({ x: -2.9, z: 2.65 }).then(() => luana.walk('porta')).then(() => luana.fadeOut(0.4)).catch(() => {});
        await G.wait(1.2);
        G.player.lookAt(null);
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
        G.flag('cap2_fim', 9 * 60 + Math.round(v.min)); // o cap. 3 começa depois disto
        const modos = v.modo;
        const algumSem = ['t1', 't2', 't3'].some((k) => modos[k] === 'sem');
        const algumaMao = ['t1', 't2', 't3'].some((k) => modos[k] === 'mao');
        const revs = ['t1', 't2', 't3'].filter((k) => modos[k] === 'rev');
        const revTudo = revs.length && revs.every((k) => (v.fix[k] || 0) >= (v.tot[k] || 0));

        if (v.rep >= 80) {
          anim(G.faisca, 'celebrate', 1.6);
          G.fx.confetti(G.faisca, null, null, 40);
        }
        if (v.rep < 50) await G.say('faisca', hora(v.min) + '. Quatro tarefas feitas. Agora olha a reputação.', { expr: 'sem_graca' });
        else if (v.min < 120) await G.say('faisca', hora(v.min) + '. Quatro tarefas resolvidas. Olha só o relógio.', { expr: 'empolgado' });
        else await G.say('faisca', hora(v.min) + '. Quatro tarefas resolvidas, e bem resolvidas. O relógio é que não colaborou.', { expr: 'amigavel' });
        await G.card({ kind: 'ok', kicker: 'Balanço da manhã', icon: '🧾', titulo: resolvido(v), node: balanco(G) });

        if (algumSem) await G.say('faisca', 'Quando você mandou sem ler, os meus erros saíram com o seu nome. E eu erro sem mudar o tom de voz: rascunho meu precisa de leitor.', { expr: 'sem_graca' });
        if (revTudo) await G.say('faisca', 'Quando eu rascunhei e você revisou, foi rápido e saiu certo. Essa é a dupla.', { expr: 'feliz' });
        else if (revs.length) await G.say('faisca', 'Quando eu rascunhei e você revisou, foi rápido. O que escapou da caneta é que saiu caro.', { expr: 'sem_graca' });
        if (algumaMao) await G.say('faisca', 'Quando você fez sozinho, ficou ótimo. E levou o tempo que leva.', { expr: 'amigavel' });
        await G.say('faisca', 'Escrever, resumir, organizar: isso fica *dentro* da minha fronteira, e lá eu acelero. Julgar gente e o que eu não vejo fica *fora*, e lá eu atrapalho.', { expr: 'neutro' });
        await G.say('pai', 'Uma fronteira meio torta, essa sua.', { expr: 'desconfiado' });
        await G.say('faisca', 'Tortíssima. E não é impressão minha: tem estudo, inclusive um pedaço que me deixa mal na foto.', { expr: 'neutro' });
        await G.fact(['harvard_bcg', 'harvard_bcg_fora'], { titulo: 'A fronteira, medida' });
        await G.say('pai', 'Quem errou foi quem copiou sem questionar. Então o problema não era só a máquina.', { expr: 'pensativo' });
        await G.say('faisca', 'Era a dupla sem revisor. E a fronteira se mexe: o que eu erro hoje posso acertar daqui a seis meses. Por isso: teste pequeno e confira.', { expr: 'feliz' });

        await G.explore({
          objetivo: 'Vá até a janela',
          hotspots: [
            {
              id: 'pilha', label: 'A pilha, agora', icon: '📚', pos: { x: 1.27, y: 1.15, z: -1.12 }, reach: 3.4, optional: true,
              onInteract: async (G) => {
                if (S(G).min < 180) await G.say('pai', 'Metade. Antes do almoço. Isso não acontecia desde o século passado.', { expr: 'surpreso' });
                else await G.say('pai', 'Metade. O almoço já era, mas a pilha encolheu.', { expr: 'cansado' });
                await G.say('faisca', 'E eu continuo sem virar peso de papel.', { expr: 'rindo' });
              },
            },
            // o porta-retrato só volta para quem não o viu de manhã
            ...(v.viuFoto ? [] : [{
              id: 'foto', label: 'Porta-retrato', icon: '🖼️', pos: { x: 0.02, y: 0.95, z: -0.95 }, reach: 2.4, optional: true,
              onInteract: async (G) => {
                S(G).viuFoto = true;
                await G.narrate('{OA} {filho}, aos seis anos, de beca. Sorrindo como quem sabia de alguma coisa.');
                await G.think('pai', 'Prometi trabalhar menos naquele dia. Talvez hoje eu chegue a tempo do jantar.');
              },
            }]),
            { id: 'janela', label: 'Olhar a cidade', icon: '🏙️', at: 'janela' },
          ],
        });
        G.music('casa');
        G.pai.at('janela');
        G.player.cine();
        await G.letterbox(true, 0.4);
        await G.cam.shot('janela', 0);
        G.cam.shot({ target: [-2.2, 1.45, -3.0], yaw: 0.2, pitch: 0.04, dist: 3.4, fov: 40 }, 6).catch(() => {});
        const usouIA = ['t1', 't2', 't3'].some((k) => modos[k] && modos[k] !== 'mao');
        if (usouIA) {
          await G.say('pai', 'Trinta anos fazendo tudo na mão. E agora uma caixinha laranja escreve o meu rascunho.', { expr: 'pensativo' });
          await G.say('faisca', 'E você continua sendo quem sabe o que está certo. Eu acelero. Você julga.', { expr: 'amigavel' });
        } else {
          await G.say('pai', 'Trinta anos fazendo tudo na mão. E hoje, de novo, tudo na mão.', { expr: 'pensativo' });
          await G.say('faisca', 'Do seu jeito, e bem feito. Quando quiser testar, eu rascunho e você julga.', { expr: 'amigavel' });
        }
        await G.say('pai', 'E quem assina sou eu.', { expr: 'orgulhoso' });
        await G.say('faisca', 'Sempre.', { expr: 'feliz' });
        const jantar = v.viuFoto ? 'hoje eu janto com {oa} {filho}' : 'hoje eu chego em casa para o jantar';
        if (usouIA && v.semLer) await G.say('pai', 'Se no resto do dia eu ler antes de assinar, ' + jantar + '. Faz tempo.', { expr: 'emocionado' });
        else if (usouIA) await G.say('pai', 'Se o dia seguir assim, ' + jantar + '. Faz tempo.', { expr: 'emocionado' });
        else await G.say('pai', v.viuFoto ? 'Da próxima, eu deixo você rascunhar. Quem sabe assim eu janto com {oa} {filho}.' : 'Da próxima, eu deixo você rascunhar. Quem sabe assim eu chego para o jantar.', { expr: 'emocionado' });
        G.faisca.emote('heart');
        G.fx.hearts(G.faisca);
        await G.letterbox(false, 0.4);
        G.pai.at({ x: -2.15, z: -2.35, rot: 0.55 }); // de costas para o vidro, olhando a sala
        G.player.fp();

        await G.say('faisca', 'Sobre o jantar, uma coisa honesta: o placar de hoje é estimativa do jogo. Na vida real, quem mediu achou ganho menor e desigual. O seu, só medindo.', { expr: 'neutro' });
        await G.fact(['copilot_campo_email', 'dinamarques'], { titulo: 'E na vida real, quanto tempo poupa?' });
        await G.say('pai', 'Uma máquina que mostra o número contra ela mesma. Isso eu respeito.', { expr: 'pensativo' });
        await G.say('faisca', 'Deixei tudo no seu *Guia do CEO*, no botão 📘 lá em cima, em "Rotina e triagem": a fronteira, a caneta vermelha e como medir o ganho em 30 dias.', { expr: 'feliz' });

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
      lines.push(resolvido(v) + ' · Reputação ' + v.rep + '/100');
      lines.push('Tempo poupado vs. tudo na mão (estimativa do jogo): ' + durTxt(economizado(v)) + (v.semLer ? ', mas a reputação pagou a conta' : ''));
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
    if (missed.indexOf('margem') >= 0) partes.push('Aqui diz que a margem bruta *subiu* para 35%. A Bia acabou de me dizer que *caiu* para 30%.');
    if (missed.indexOf('data') >= 0) partes.push((partes.length ? 'E o' : 'O') + ' centro de distribuição abre em janeiro? O Rafael jura que é março.');
    await G.say(TEL_MARTA, '{pai}, li o relatório. ' + partes.join(' '));
    await G.say(TEL_MARTA, 'Qual das versões eu levo ao conselho?');
    await G.say('pai', 'A certa. Me dá uns minutos.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    await G.say('faisca', 'Fui eu. Errei sem mudar o tom de voz, e o relatório saiu com o seu nome.', { expr: 'triste' });
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t1 = (v.gasto.t1 || 0) + dano;
    await G.narrate(sem ? 'Meia hora de correções, telefonemas e um "desculpe" para a presidente do conselho.' : 'Mais uns minutos de correção e um "desculpe" para a presidente do conselho.');
    await passar(G, dano);
    await G.say('pai', sem ? 'Lição anotada: o que sai com o meu nome, eu leio.' : 'Lição anotada: li por cima. Número se confere um por um.', { expr: 'determinado' });
  }
  async function consequenciaT2(G, missed, sem) {
    const v = S(G);
    await G.wait(0.4);
    G.sfx('door');
    const jorge = G.jorge;
    jorge.at('porta');
    jorge.set({ expr: 'assustado', props: { phone: true } });
    await jorge.walk(VISITA, 2.1);
    jorge.face(G.pai);
    G.shake(1.2, 0.3);
    const partes = [];
    if (missed.indexOf('promessa') >= 0) partes.push('Ele agradeceu os *15% de desconto nos próximos três pedidos*. Que desconto é esse?!');
    if (missed.indexOf('tom') >= 0) partes.push((partes.length ? 'E perguntou' : 'Ele perguntou') + ', bem seco, por que a gente acha que *ele* se confundiu com os prazos.');
    await G.say('jorge', 'Chefe! O Vicente ligou. ' + partes.join(' '), { expr: 'assustado' });
    await G.say('pai', sem ? 'Eu não li antes de mandar.' : 'Eu li. Mas não com a caneta na mão.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    if (missed.length > 1) await G.say('faisca', 'Eu inventei a promessa e culpei o cliente. Num e-mail de desculpas. Desculpa.', { expr: 'triste' });
    else if (missed[0] === 'promessa') await G.say('faisca', 'Eu inventei o desconto. Ninguém tinha aprovado nada disso.', { expr: 'triste' });
    else await G.say('faisca', 'Eu culpei o cliente. Num e-mail de desculpas.', { expr: 'triste' });
    await G.say('jorge', sem ? 'Deixa comigo, eu ligo de novo. Mas da próxima vez, lê, chefe!' : 'Deixa comigo, eu ligo de novo. Mas da próxima vez, lê com calma, chefe!', { expr: 'preocupado' });
    jorge.walk('porta', 1.6).then(() => jorge.fadeOut(0.4)).catch(() => {});
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t2 = (v.gasto.t2 || 0) + dano;
    await G.narrate(sem ? 'Meia hora de telefone. O desconto não sai. A vergonha, sim.' : 'Mais uns minutos de telefone para desfazer o estrago.');
    await passar(G, dano);
  }
  async function consequenciaT3(G, missed, sem) {
    const v = S(G);
    const h = G.sfx('phone_ring', { loop: true });
    await G.narrate('O telefone toca. É a Bia, do financeiro.');
    if (h) h.stop();
    const num = missed.indexOf('numero') >= 0, cons = missed.indexOf('consulta') >= 0;
    const partes = ['Chefe, li o memorando.'];
    if (num) partes.push('Eu propus *6%*, não 8%. Já tem diretor fazendo conta com oito.');
    if (cons) partes.push((num ? 'E que' : 'Que') + ' história é essa de o Grupo Horizonte *já ter concordado*? O Jorge nem tocou em preço com eles!');
    await G.say(TEL_BIA, partes.join(' '));
    await G.say('pai', sem ? 'Ninguém concordou com nada. Eu não li antes de mandar.' : 'Ninguém concordou com nada. E passou pela minha revisão.', { expr: 'sem_graca' });
    anim(G.faisca, 'ashamed', 2.2);
    if (num && cons) await G.say('faisca', 'Inventei um número e a resposta de um cliente. Duas besteiras, com o seu nome embaixo.', { expr: 'triste' });
    else if (num) await G.say('faisca', 'Troquei o 6 pelo 8. Parece pouco. Para o Jorge, é a diferença entre segurar e perder um cliente.', { expr: 'triste' });
    else await G.say('faisca', 'Inventei a resposta de um cliente que ninguém consultou. Escrevi o que parecia provável, não o que aconteceu.', { expr: 'triste' });
    const dano = sem ? DANO_SEM : DANO_POR_ERRO * missed.length;
    if (!sem) v.gasto.t3 = (v.gasto.t3 || 0) + dano;
    await G.narrate(sem ? 'Meia hora para corrigir o memorando e avisar cinco diretores que ninguém concordou com nada.' : 'Uns minutos para corrigir e reenviar o memorando.');
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
      let extra = '', cls = lab[1];
      if (v.tot[T.id]) extra = ' · erros corrigidos: ' + (v.fix[T.id] || 0) + '/' + v.tot[T.id];
      if (m === 'rev' && (v.fix[T.id] || 0) < (v.tot[T.id] || 0)) cls = ''; // revisou, mas passou erro
      const row = el('div', 'c2-bal-row', [
        el('span', null, T.icon),
        el('b', null, t(T.nome)),
        el('span', 'c2-min', v.gasto[T.id] != null ? durTxt(v.gasto[T.id]) : '—'),
        el('span', null, ''),
        el('span', 'mg-badge ' + cls, lab[0] + extra),
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

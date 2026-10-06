/* PAI 2.0 — cap1.js — CAPÍTULO 1 · "A Arte de Pedir" (7h10–8h, cozinha, manhã)
 * O relatório do conselho aperta. O primeiro pedido dele é vago ("faz um relatório") e a resposta
 * sai genérica. A virada: pedir à IA é igual dar briefing a um diretor novo — coisa que ele faz há
 * trinta anos. Minigame "Monte o pedido" (3 pedidos do dia: Contexto + Tarefa + Formato, com a 4ª
 * peça bônus "me pergunte o que faltar"), "Ajuste fino" (refinar em vez de recomeçar), o limite
 * honesto ("quanto a Dona Marta aceita?" → "não sei") e a despedida de {filho} na porta.
 * Segurança plantada: o celular dele é conta pessoal → contexto em termos gerais, segredo nunca;
 * a IA não impede ninguém de colar dado sigiloso; onde falta informação, [colchetes] em vez de chute.
 * Stats (bíblia F): cap1 {pedidosBons, pedidosTotal: 3} — pedidosBons = pedidos certeiros de primeira.
 * Conquista: mestre_pedido (3 de 3).
 */
(function () {
  'use strict';
  const P2 = window.P2;
  const PI = Math.PI;

  // ------------------------------------------------------------------
  // Encenação (cozinha: mesa4 = pai na cabeceira esquerda, mesa2 = {filho} na direita)
  // ------------------------------------------------------------------
  const FAISCA_MESA = { x: 0.72, z: 0.98 }; // flutua à direita da mesa: {filho} e Faísca no mesmo quadro
  const FAISCA_Y = 1.0;
  const PAI_PORTA = { x: 1.42, z: 1.3, rot: PI / 2 }; // de frente para a porta, ao lado de {filho}
  const FAISCA_PORTA = { x: 0.78, z: 1.12 };

  // ------------------------------------------------------------------
  // Minigame "Monte o pedido": dados
  // q: 'bom' | 'vago' | 'ruim' · rot: rótulo do erro · sig: dado sigiloso (a IA não impede)
  // ------------------------------------------------------------------
  const SLOTS = [
    { k: 'ctx', nome: 'Contexto', cls: 'ctx', pergunta: 'Quem é você e qual é a situação?', ph: '[contexto]' },
    { k: 'task', nome: 'Tarefa', cls: 'task', pergunta: 'O que exatamente você quer?', ph: '[tarefa]' },
    { k: 'fmt', nome: 'Formato', cls: 'fmt', pergunta: 'Como a resposta deve chegar?', ph: '[formato]' },
  ];
  const BONUS_TXT = 'Se faltar alguma informação, me pergunte antes.';
  const PRIMEIRO_PEDIDO = 'Faz um relatório pro conselho.';

  const nota = (t) => ['nota', t];

  const RODADAS = [
    // ---------------------------------------------------------------- 1
    {
      id: 'resumo', icon: '📊', nome: 'O resumo para o conselho',
      missao: 'Relatório do conselho até as *10h*. Peça o *esqueleto* do resumo executivo: a página que abre o documento.',
      intro: 'Pedido 1: o resumo para o conselho. Escolha uma peça de cada cor. A quarta, "me pergunte", é bônus.',
      certeira: 'Briefing de quem sabe o que quer. Repare nos [colchetes]: é ali que entram os seus números de verdade.',
      slots: {
        ctx: [
          { q: 'bom', t: 'Sou CEO de uma empresa de {setorPrompt}, de porte médio. O texto vai para o conselho, que lê com lupa e detesta enrolação. Os números eu completo depois.', why: 'Quem você é, quem vai ler e o que essa plateia valoriza. E nenhum número sigiloso: eles entram depois, no escritório.' },
          { q: 'vago', t: 'É para o conselho.', why: 'Ajuda pouco: ela não sabe que empresa é, nem o que esse conselho espera ler.' },
          { q: 'ruim', sig: true, rot: '🔴 Sigiloso', t: 'Vou colar a planilha do trimestre inteira, com os salários da diretoria.', why: 'Salário e resultado não divulgado não vão para a conta pessoal do celular. Lugar disso é a ferramenta aprovada pela empresa, e só com o que a tarefa pede.' },
        ],
        task: [
          { q: 'bom', t: 'Monte o esqueleto do resumo executivo: o que melhorou, o que piorou, os riscos e o que vou pedir ao conselho.', why: 'Tarefa clara, com as quatro partes que um conselho procura.' },
          { q: 'vago', t: 'Faz um relatório bom.', why: '"Bom" para quem? Sem dizer o que entra, ela enche de frase pronta.' },
          { q: 'ruim', rot: '✗ Ela não sabe', t: 'Escreva os resultados do trimestre.', why: 'Ela não tem os seus resultados. O número que aparecer vai ser inventado, com cara de verdade.' },
        ],
        fmt: [
          { q: 'bom', t: 'Uma página, em tópicos curtos, do mais importante para o menos. Deixe [espaços] onde entram os números.', why: 'Tamanho, ordem e lacunas marcadas: chega pronto para você completar e conferir.' },
          { q: 'vago', t: 'Do jeito que você achar melhor.', why: 'Ela vai achar melhor... três páginas. Que formato o seu conselho gosta de ler, só você sabe.' },
          { q: 'ruim', rot: '✗ Comprido demais', t: 'Bem completo. Quanto mais páginas, mais sério parece.', why: 'Parece, mas não é: texto longo passa impressão de certeza sem estar mais certo. E ninguém lê doze páginas antes das 10h.' },
        ],
      },
      resposta(p) {
        const L = [];
        if (p.ctx === 'bom') L.push(['ctx', 'Para um conselho que lê com lupa: direto ao ponto, sem adjetivo, e o tema sensível logo no começo.']);
        else if (p.ctx === 'vago') L.push(['ctx', 'Segue um modelo de relatório para conselho.']);
        else {
          L.push(['ctx', 'Recebi a planilha, com os salários da diretoria. Obrigada! Vou usar tudo.', 'bad']);
          L.push(nota('🔴 Repare: a IA não impede ninguém de colar. Numa conta pessoal, salário e resultado não divulgado podem ficar guardados por muito tempo. Isso é para a ferramenta aprovada da empresa.'));
        }
        if (p.task === 'bom') {
          L.push(['task', '*Resumo executivo · [trimestre]*']);
          if (p.fmt === 'bom') {
            L.push(['task', '1. *O que melhorou:* [receita do trimestre]']);
            L.push(['task', '2. *O que piorou:* [margem: quanto e por quê]']);
            L.push(['task', '3. *Riscos:* [o principal primeiro: cliente, prazo ou custo]']);
            L.push(['task', '4. *O que peço ao conselho:* [a decisão de que você precisa]']);
          } else {
            L.push(['task', '1. *O que melhorou:* a receita teve desempenho expressivo.']);
            L.push(['task', '2. *O que piorou:* a margem sofreu pressões conjunturais.']);
            L.push(['task', '3. *Riscos:* o cenário segue desafiador.']);
            L.push(['task', '4. *O que peço ao conselho:* apoio à estratégia.']);
            L.push(nota('Sem lugar marcado para os números, ela enche de adjetivo. "Pressões conjunturais" não responde nada.'));
          }
        } else if (p.task === 'vago') {
          L.push(['task', '*Relatório*']);
          L.push(['task', 'O período foi marcado por desafios e oportunidades. A empresa manteve o foco em resultados e no crescimento sustentável.']);
        } else {
          L.push(['task', '*Resultados do trimestre*']);
          L.push(['task', 'A receita cresceu *23%* e a margem chegou a *21%*, um recorde histórico.', 'inv']);
          L.push(nota('⚠️ Ninguém deu esses números para ela. Inventou, com toda a confiança.'));
        }
        if (p.fmt === 'bom') L.push(['fmt', 'Cabe em uma página. O que está [entre colchetes] você completa e confere.']);
        else if (p.fmt === 'vago') L.push(['fmt', '(…e continua por mais três páginas.)']);
        else L.push(['fmt', '*Anexo 1 de 12:* o cenário econômico mundial desde 2008… (continua)']);
        if (p.bonus) L.push(['bonus', '*Antes de fechar, duas perguntas:* que números o seu conselho acompanha mais de perto? E que decisão você quer que ele tome?']);
        return L;
      },
    },
    // ---------------------------------------------------------------- 2
    {
      id: 'email', icon: '✉️', nome: 'O e-mail para o cliente',
      missao: 'O Vicente, do *Grupo Horizonte* (cliente há 12 anos), reclamou de mais um atraso. Peça um *rascunho de resposta*.',
      intro: 'Pedido 2: o e-mail para o cliente do atraso. Aqui, uma palavra errada custa caro.',
      certeira: 'Repare: onde eu não sabia, deixei [entre colchetes] em vez de inventar uma data. Foi você que pediu isso.',
      slots: {
        ctx: [
          { q: 'bom', t: 'Um cliente de 12 anos, dos mais importantes, teve a entrega atrasada pela segunda vez em três meses. A transportadora parceira falhou, mas quem a escolheu fomos nós.', why: 'A situação inteira, sem nome nem dado pessoal. O nome do cliente você põe na hora de enviar.' },
          { q: 'vago', t: 'É um cliente importante.', why: 'Importante por quê? Há quanto tempo? O que aconteceu? Sem isso, sai desculpa de formulário.' },
          { q: 'ruim', sig: true, rot: '🔴 Dado pessoal', t: 'Vou colar o cadastro do cliente: CPF do dono, celular e endereço.', why: 'Dado pessoal de cliente não vai para conta pessoal de IA: é risco de LGPD. E, para escrever um e-mail, ela nem precisa disso.' },
        ],
        task: [
          { q: 'bom', t: 'Rascunhe a resposta: assuma o erro sem rodeio, explique a causa em uma linha e diga o que muda daqui para frente.', why: 'Diz o que o e-mail precisa fazer, na ordem certa. É o que você explicaria a um diretor.' },
          { q: 'vago', t: 'Escreve um e-mail pro cliente.', why: 'Sobre o quê? Pedindo o quê? Ela escreve um e-mail educado sobre... nada.' },
          { q: 'ruim', rot: '✗ Tiro no pé', t: 'Diga que a culpa foi da transportadora, não nossa.', why: 'Ela escreve, e com toda a educação. Mas empurrar a culpa irrita cliente antigo. A IA faz o que você manda; o julgamento é seu.' },
        ],
        fmt: [
          { q: 'bom', t: 'No máximo 8 linhas, tom humano e direto. O que eu ainda não confirmei, deixe [entre colchetes].', why: 'Curto, no tom certo e sem prometer o que você não confirmou. Os colchetes mostram onde conferir.' },
          { q: 'vago', rot: '≈ Palavra mágica', t: 'Capricha, que eu te dou uma gorjeta.', why: 'Não existe palavra mágica: testes da Wharton mostraram que prometer gorjeta, ou ameaçar, não melhora a resposta. Dizer o formato, sim.' },
          { q: 'ruim', rot: '✗ Tom errado', t: 'Bem formal: "Vimos por meio desta..."', why: 'Cliente de 12 anos não quer ofício de cartório. Num pedido de desculpas, formalidade demais soa como descaso.' },
        ],
      },
      resposta(p) {
        const L = [];
        const sabe = p.ctx === 'bom';
        const colch = p.fmt === 'bom';
        if (p.ctx === 'ruim') {
          L.push(['ctx', 'Anotei o CPF, o celular e o endereço do cliente. 👍', 'bad']);
          L.push(nota('🔴 A IA aceita sem piscar. Dado pessoal de cliente numa conta pessoal é risco de LGPD, e ela nem precisava disso para escrever.'));
        }
        L.push(['ctx', sabe ? 'Prezado [nome do cliente],' : 'Prezado cliente,']);
        if (p.fmt === 'ruim') L.push(['fmt', 'Vimos, por meio desta, apresentar nossas mais sinceras escusas pelo ocorrido.']);
        if (sabe && p.task !== 'ruim') L.push(['ctx', 'Doze anos de parceria merecem uma explicação direta.']);
        if (p.task === 'bom') {
          L.push(['task', sabe ? 'Você tem razão: dois atrasos em três meses estão longe do padrão que você merece de nós.' : 'Você tem razão: esse atraso está longe do padrão que você merece de nós.']);
          if (sabe) L.push(['task', 'A falha foi de uma transportadora parceira, e quem a escolheu fomos nós.']);
          else if (colch) L.push(['task', 'O que houve: [a causa, em uma linha].']);
          else {
            L.push(['task', 'O atraso foi causado por uma instabilidade pontual no nosso sistema.', 'inv']);
            L.push(nota('⚠️ Instabilidade no sistema? Ninguém contou a causa para ela. Inventou uma.'));
          }
          if (colch) L.push(['task', 'A nova entrega chega [data — confirmar]. Daqui para frente, [o que muda — confirmar].']);
          else {
            L.push(['task', 'A nova entrega chega amanhã cedo, sem falta.', 'inv']);
            L.push(nota('⚠️ "Amanhã cedo, sem falta"? Ninguém confirmou essa data. Promessa inventada vira o segundo problema.'));
          }
        } else if (p.task === 'vago') {
          L.push(['task', 'Esperamos que esteja bem. Gostaríamos de informar sobre questões recentes relacionadas ao seu pedido.']);
          L.push(['task', 'Seguimos à disposição para quaisquer esclarecimentos.']);
        } else {
          L.push(['task', 'Informamos que o atraso ocorreu por responsabilidade exclusiva da transportadora, alheia à nossa vontade. Não houve, portanto, falha de nossa parte.', 'bad']);
          L.push(nota(sabe ? '⚠️ Cliente de 12 anos, no segundo atraso, lendo "não houve falha de nossa parte". Ela escreveu exatamente o que você pediu.' : '⚠️ Ela escreveu exatamente o que você pediu. Empurrar a culpa para fora raramente acalma um cliente.'));
        }
        if (p.fmt === 'bom') L.push(['fmt', 'Um abraço,\n{pai}']);
        else if (p.fmt === 'vago') {
          L.push(['fmt', 'Atenciosamente,\n{pai}']);
          L.push(['fmt', 'P.S.: obrigada pela gorjeta! Mas pode guardar: ela não muda nada na resposta. 😉']);
        } else L.push(['fmt', 'Sem mais para o momento, subscrevemo-nos.\nAtenciosamente,\n{pai}']);
        if (p.bonus) L.push(['bonus', '*Antes de enviar, duas perguntas:* qual é a nova data de entrega, já confirmada? E vocês vão oferecer alguma compensação?']);
        return L;
      },
    },
    // ---------------------------------------------------------------- 3
    {
      id: 'perguntas', icon: '🎯', nome: 'As perguntas duras do conselho',
      missao: 'Depois de ler o relatório, o conselho vai perguntar. Peça as *5 perguntas mais difíceis*, para chegar preparado.',
      intro: 'Pedido 3: as perguntas mais duras. Melhor ouvir de mim agora do que do conselho depois.',
      certeira: 'E a quinta pergunta... essa a Dona Marta já avisou que vem. 😉',
      slots: {
        ctx: [
          { q: 'bom', t: 'O relatório do trimestre vai para o conselho hoje. Em termos gerais: o frete encareceu, houve atraso com um cliente importante e vamos abrir um centro de distribuição.', why: 'Os temas, em termos gerais: sem número e sem nome. É o bastante para ela pensar como o conselho.' },
          { q: 'vago', t: 'Tenho reunião com o conselho.', why: 'Sobre o quê? Sem os temas, as perguntas saem genéricas como horóscopo.' },
          { q: 'ruim', sig: true, rot: '🔴 Sigiloso', t: 'Vou colar a ata da última reunião do conselho, com os nomes de todos.', why: 'Ata do conselho é material sigiloso. Na conta pessoal, nem com os nomes trocados. Para treinar perguntas, os temas em termos gerais bastam.' },
        ],
        task: [
          { q: 'bom', t: 'Faça o papel de um conselheiro exigente e liste as 5 perguntas mais duras que eu posso ouvir.', why: 'Pedir o papel de crítico tira o melhor dela: pergunta difícil, não elogio.' },
          { q: 'vago', t: 'Me ajuda a me preparar.', why: 'Preparar como? Ela pode te ensinar a respirar fundo. Diga exatamente o que quer.' },
          { q: 'ruim', rot: '✗ Pede confirmação', t: 'Confirme que os meus argumentos estão fortes.', why: 'Ela tende a concordar com quem pergunta: confirma até argumento que nem viu. Para se preparar, peça o contrário: as perguntas que te derrubam.' },
        ],
        fmt: [
          { q: 'bom', t: 'Da mais provável para a menos provável. Em cada uma, o que eu preciso levar para responder.', why: 'Com ordem e lista do que levar, você sai com tarefas, não só com perguntas.' },
          { q: 'vago', t: 'Uma lista.', why: 'Lista sai. Mas sem ordem nem o que levar, o trabalho de pensar continua todo com você.' },
          { q: 'ruim', rot: '✗ Ela não sabe', t: 'Já com as respostas e os números, para eu ler na reunião.', why: 'Ela não tem os seus números: as respostas viriam inventadas, e você leria em voz alta para o conselho. Os números vêm do seu financeiro.' },
        ],
      },
      resposta(p) {
        const L = [];
        const sabe = p.ctx === 'bom';
        if (p.ctx === 'bom') L.push(['ctx', 'Pensando como o seu conselho, sobre frete, atraso e o novo centro de distribuição:']);
        else if (p.ctx === 'vago') L.push(['ctx', 'Perguntas comuns em reuniões de conselho:']);
        else {
          L.push(['ctx', 'Li a ata inteira, com os nomes de todos. Ótimo material!', 'bad']);
          L.push(nota('🔴 Ata do conselho numa conta pessoal: a IA não reclama, mas o seu conselho reclamaria. Os temas em termos gerais bastavam.'));
        }
        if (p.task === 'bom') {
          const Q = sabe
            ? [
              ['O frete subiu: é passageiro ou veio para ficar? Qual é o plano?', '[custo do frete mês a mês]'],
              ['O cliente do atraso está em risco? Quanto ele pesa na receita?', '[peso do cliente na receita]'],
              ['O centro de distribuição está no prazo e no orçamento?', '[cronograma e orçamento do centro]'],
              ['Se a margem continuar caindo, o que você corta primeiro?', '[plano B de custos]'],
              ['E o que a empresa está fazendo com inteligência artificial?', '[o que vocês já estão testando]'],
            ]
            : [
              ['O resultado veio dentro do orçamento? Se não, por quê?', '[resultado contra o orçamento]'],
              ['Quais são os três maiores riscos para o próximo trimestre?', '[mapa de riscos]'],
              ['Onde dá para cortar custo sem perder cliente?', '[estrutura de custos]'],
              ['A equipe atual dá conta do plano?', '[plano de pessoas]'],
              ['E o que a empresa está fazendo com inteligência artificial?', '[o que vocês já estão testando]'],
            ];
          if (p.fmt === 'bom') Q.forEach((q, i) => L.push(['task', (i + 1) + '. ' + q[0] + '\n*Leve:* ' + q[1]]));
          else if (p.fmt === 'vago') Q.forEach((q) => L.push(['task', '- ' + q[0]]));
          else {
            const R = sabe ? ['“O frete já voltou ao normal e não preocupa.”', '“O cliente está satisfeito e vai renovar.”'] : ['“Sim, o resultado veio 8% acima do orçamento.”', '“Os riscos estão mapeados e sob controle.”'];
            Q.slice(0, 2).forEach((q, i) => L.push(['task', (i + 1) + '. ' + q[0] + '\n*Resposta para ler:* ' + R[i], 'inv']));
            L.push(['task', '(…e mais três, todas com resposta pronta)']);
            L.push(nota('⚠️ Ela não sabe nada do seu trimestre. Você leria isso em voz alta para o conselho?'));
          }
        } else if (p.task === 'vago') {
          L.push(['task', 'Algumas dicas para se preparar: durma bem, chegue cedo, respire fundo e confie no seu trabalho.']);
          if (p.fmt === 'ruim') {
            L.push(['fmt', '*Resposta pronta para ler:* “Está tudo sob controle, e os números comprovam.”', 'inv']);
            L.push(nota('⚠️ "Os números comprovam"? Que números? Ela não viu nenhum.'));
          }
        } else {
          L.push(['task', 'Seus argumentos estão fortes, claros e muito bem fundamentados. O conselho vai ficar convencido! 👏', 'bad']);
          L.push(nota('⚠️ Que argumentos? Você não mostrou nenhum. Ela confirmou mesmo assim.'));
          if (p.fmt === 'ruim') L.push(['fmt', '*Resposta pronta para ler:* “Está tudo sob controle, e os números comprovam.”', 'inv']);
        }
        if (p.bonus) L.push(['bonus', '*Para afinar, me conte:* qual desses temas mais preocupa quem preside o conselho? E houve alguma promessa na última reunião?']);
        return L;
      },
    },
  ];

  // ------------------------------------------------------------------
  // Minigame "Ajuste fino": o mesmo e-mail, pedido de jeitos diferentes
  // ------------------------------------------------------------------
  const REFINOS = [
    {
      k: 'curto', icon: '✂️', chip: 'Mais curto', pedido: 'Mais curto, por favor.',
      fala: 'Mesmo conteúdo, metade do tamanho. E os colchetes continuam lá: o que falta confirmar não some.',
      txt: 'Prezado [nome do cliente],\nVocê tem razão: foram dois atrasos em três meses, e a falha foi nossa, na escolha da transportadora.\nNova entrega: [data — confirmar].\nUm abraço,\n{pai}',
    },
    {
      k: 'tom', icon: '🎯', chip: 'No meu tom: direto, sem floreio', pedido: 'No meu tom: direto, sem floreio.',
      fala: 'Frase curta, sem adjetivo. Para eu acertar o seu tom de verdade, me mostre três e-mails seus: eu aprendo o estilo.',
      txt: '[Nome do cliente],\nFalhamos com você. Duas vezes em três meses.\nA transportadora errou, mas quem a escolheu fomos nós.\nSua entrega chega [data — confirmar]. O que muda daqui para frente: [confirmar].\n{pai}',
    },
    {
      k: 'topicos', icon: '📋', chip: 'Em tópicos', pedido: 'Em tópicos.',
      fala: 'Tópico é ótimo para relatório. Para cliente chateado, texto corrido costuma soar mais humano. Você decide.',
      txt: 'Prezado [nome do cliente],\n- O que houve: segundo atraso em três meses.\n- Por quê: falha da transportadora parceira, escolhida por nós.\n- Nova entrega: [data — confirmar].\n- O que muda: [confirmar].\nUm abraço,\n{pai}',
    },
    {
      k: 'dez', icon: '🧒', chip: 'Explica como se eu tivesse 10 anos', pedido: 'Explica como se eu tivesse 10 anos.',
      fala: 'Esse não vai para o cliente, né? 😄 Mas guarde o truque: serve para traduzir juridiquês e economês.',
      txt: 'Oi, [nome do cliente]!\nSabe quando você espera um presente e ele não chega? Pois é: aconteceu duas vezes.\nO caminhão que a gente escolheu se atrapalhou. A culpa é nossa!\nMas o seu pacote vai chegar [no dia que alguém confirmar]. 🎈\nBeijos,\n{pai}',
    },
  ];
  const EMAIL_BASE = 'Prezado [nome do cliente],\nDoze anos de parceria merecem uma explicação direta.\nVocê tem razão: dois atrasos em três meses estão longe do padrão que você merece de nós.\nA falha foi de uma transportadora parceira, e quem a escolheu fomos nós.\nA nova entrega chega [data — confirmar]. Daqui para frente, [o que muda — confirmar].\nUm abraço,\n{pai}';

  // ------------------------------------------------------------------
  // CSS do capítulo
  // ------------------------------------------------------------------
  const CSS = `
  .c1-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
  .c1-steps { display: flex; gap: 6px; }
  .c1-dot { font-family: var(--head); font-weight: 800; font-size: 0.72em; padding: 3px 10px; border-radius: 99px; background: #eef1f8; color: var(--muted); white-space: nowrap; }
  .c1-dot.on { background: #fff1eb; color: var(--brand-d); box-shadow: inset 0 0 0 2px rgba(255, 107, 61, 0.45); }
  .c1-dot.ok { background: var(--mint-l); color: #12684b; }
  .c1-dot.meh { background: var(--amber-l); color: #7a4d00; }
  .c1-head .mg-title { margin: 0; }
  .c1-missao { font-size: 0.84em; padding: 6px 12px; line-height: 1.4; }
  .c1-build { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "prev" "pick" "act"; }
  .c1-prev { grid-area: prev; min-width: 0; }
  .c1-pick { grid-area: pick; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .c1-act { grid-area: act; margin-top: 0; display: flex; flex-direction: column; gap: 10px; }
  .c1-act .mg-actions { margin-top: 0; }
  @media (min-width: 860px) {
    .c1-build { grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); grid-template-areas: "pick prev" "pick act"; align-items: start; }
  }
  .c1-tabs { display: flex; flex-wrap: wrap; gap: 6px; order: -2; }
  .c1-tab { font: inherit; font-family: var(--head); font-weight: 800; font-size: 0.78em; border-radius: 99px; padding: 6px 13px; border: 2px solid transparent; cursor: pointer; min-height: 38px; display: inline-flex; align-items: center; gap: 6px; }
  .c1-tab.ctx { background: #e3ecff; color: #24468f; }
  .c1-tab.task { background: #ffe9df; color: #93360f; }
  .c1-tab.fmt { background: #dcf6ea; color: #12684b; }
  .c1-tab.on { border-color: currentColor; box-shadow: 0 2px 8px rgba(10, 20, 50, 0.12); }
  .c1-tab .st { font-size: 0.95em; opacity: 0.9; }
  .c1-q { font-family: var(--head); font-weight: 800; font-size: 0.92em; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px; order: -1; }
  .c1-card { display: flex !important; gap: 10px; align-items: flex-start; font-size: 0.86em; padding: 9px 12px; min-height: 52px; border-left-width: 6px; line-height: 1.35; }
  .c1-card.ctx { border-left-color: #7fa1ec; }
  .c1-card.task { border-left-color: #ff9d78; }
  .c1-card.fmt { border-left-color: #5fd0a6; }
  .c1-card.on { background: #fff6f1; border-color: var(--brand); border-left-width: 6px; }
  .c1-card.bad:not(.on) { opacity: 0.62; }
  .c1-card.bad.on { background: var(--red-l); border-color: var(--red); box-shadow: 0 0 0 2px rgba(229, 72, 77, 0.25); }
  .c1-kbd { flex: 0 0 auto; font-family: var(--head); font-size: 0.72em; font-weight: 800; background: rgba(20, 30, 60, 0.08); border-radius: 6px; padding: 0.15em 0.5em; margin-top: 0.2em; color: var(--muted); }
  .c1-card.on .c1-kbd { background: var(--brand); color: #fff; }
  .c1-ct { flex: 1 1 auto; }
  .c1-bonus { display: flex !important; align-items: center; gap: 10px; font-size: 0.86em; border-style: dashed; padding: 9px 12px; min-height: 48px; }
  .c1-bonus .box { width: 1.35em; height: 1.35em; border-radius: 7px; border: 2px solid #b8bfd0; display: grid; place-items: center; font-size: 0.85em; flex: 0 0 auto; background: #fff; }
  .c1-bonus.on { background: #f5eeff; border-color: #a77be0; border-style: solid; }
  .c1-bonus.on .box { background: #8a5cd0; border-color: #8a5cd0; color: #fff; }
  .c1-prompt { font-size: 0.8em; line-height: 1.5; padding: 10px 12px; }
  .c1-prompt .slot.bonus { background: #f1e8ff; }
  .c1-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 10px; font-size: 0.78em; color: var(--muted); margin-top: 6px; }
  .c1-send.ready { animation: c1pulse 1.3s ease-in-out infinite; }
  @keyframes c1pulse { 0%, 100% { box-shadow: 0 6px 18px rgba(255, 107, 61, 0.35); } 50% { box-shadow: 0 0 0 6px rgba(255, 107, 61, 0.22), 0 6px 18px rgba(255, 107, 61, 0.35); } }
  .c1-act .btn, .c1-res .btn, .c1-fino .btn { min-height: 50px; }
  .c1-res { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 860px) { .c1-res { grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); align-items: start; } }
  .c1-ans { padding: 12px 14px; font-size: 0.9em; min-width: 0; }
  .c1-ans h4 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 1em; }
  .c1-legend { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.74em; color: var(--muted); margin: -2px 0 8px; }
  .c1-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .c1-ln { border-left: 4px solid transparent; padding: 3px 0 3px 10px; margin: 4px 0; line-height: 1.45; }
  .c1-ln.anim { animation: c1in 0.25s ease-out; }
  @keyframes c1in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
  .c1-ln.ctx { border-color: #7fa1ec; }
  .c1-ln.task { border-color: #ff9d78; }
  .c1-ln.fmt { border-color: #5fd0a6; }
  .c1-ln.bonus { border-color: #a77be0; background: #f8f3ff; border-radius: 0 10px 10px 0; padding: 6px 10px; }
  .c1-ln.inv { text-decoration: underline wavy #e5484d; text-decoration-thickness: 1.5px; text-underline-offset: 4px; }
  .c1-ln.bad { color: #9a1d22; }
  .c1-ln.nota { border-color: #e0b45a; background: var(--amber-l); color: #6b4e12; font-size: 0.9em; border-radius: 0 10px 10px 0; padding: 6px 10px; }
  .c1-side { min-width: 0; }
  .c1-side > .c1-score { order: 0; }
  .c1-side > .c1-fb { order: 2; }
  .c1-side > .c1-side-act { order: 3; margin-top: 0; }
  @media (min-width: 860px) { .c1-side > .c1-side-act { order: 1; justify-content: flex-start; } }
  .c1-score { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; }
  .c1-score .meter { flex: 1 1 150px; }
  .c1-score .stars { font-size: 1.45em; }
  .c1-fb { font-size: 0.82em; padding: 8px 12px; line-height: 1.4; }
  .c1-fb .mg-badge { margin-right: 6px; }
  .c1-why { margin-top: 3px; }
  .mg-badge.c1-b-ctx { background: #e3ecff; color: #24468f; }
  .mg-badge.c1-b-task { background: #ffe9df; color: #93360f; }
  .mg-badge.c1-b-fmt { background: #dcf6ea; color: #12684b; }
  .mg-badge.c1-b-bonus { background: #f1e8ff; color: #5b2f9a; }
  .c1-fim { display: flex; align-items: center; gap: 12px; }
  .c1-fim-ic { font-size: 1.5em; flex: 0 0 auto; }
  .c1-fim > div { flex: 1 1 auto; }
  .c1-total { font-family: var(--head); font-weight: 800; font-size: 1.05em; color: var(--ink); text-align: center; margin-top: 4px; }
  .c1-fino { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr); grid-template-areas: "chips" "doc" "act"; }
  @media (min-width: 860px) { .c1-fino { grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr); grid-template-areas: "chips doc" "chips act"; align-items: start; } }
  .c1-chips { grid-area: chips; display: grid; gap: 8px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  @media (min-width: 860px) { .c1-chips { grid-template-columns: minmax(0, 1fr); } }
  .c1-chip { display: flex !important; align-items: center; gap: 8px; font-size: 0.86em; padding: 9px 11px; min-height: 52px; }
  .c1-chip .ic { font-size: 1.2em; flex: 0 0 auto; }
  .c1-chip.on { background: #fff3ee; border-color: var(--brand); box-shadow: 0 0 0 2px rgba(255, 107, 61, 0.35); }
  .c1-chip.base { grid-column: 1 / -1; }
  .c1-mailbox { grid-area: doc; min-width: 0; }
  .c1-mail { padding: 12px 16px; font-size: 0.9em; }
  .c1-mail h4 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 0.95em; }
  .c1-mail .line { min-height: 1.2em; }
  .c1-ped { font-size: 0.84em; color: var(--muted); margin: 0 0 6px; }
  .c1-ped b { color: var(--ink); }
  .c1-fino .c1-act { grid-area: act; }
  .c1-typing { color: var(--muted); font-style: italic; }
  `;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const instant = () => !!(P2.skipping || (P2.settings && P2.settings.speed === 'instantanea'));

  /** Cozinha com os dois sentados à mesa (pai na cabeceira esquerda, {filho} na direita) e a Faísca flutuando. */
  function mesaPosta(G, clock) {
    G.scene('cozinha', { time: 'manha', steam: true });
    G.music('manha');
    sentar(G);
    if (clock) G.hud.set({ clock });
  }
  /** Só os atores: os dois sentados, a Faísca flutuando à direita da mesa, todos de frente para o pai. */
  function sentar(G) {
    G.filho.at('mesa2').setAnim('sit').set({ props: { mug: true } });
    G.filho.setExpr('feliz');
    G.pai.at('mesa4').setAnim('sit');
    G.faisca.at(FAISCA_MESA, FAISCA_Y);
    G.faisca.setAnim('idle');
    G.faisca.face(G.pai, true);
    G.filho.face(G.pai, true);
    G.player.fp();
  }

  // ------------------------------------------------------------------
  // MINIGAME 1 — Monte o pedido (3 rodadas)
  // ------------------------------------------------------------------
  function monteOPedido(G) {
    return G.mini((root, done, api) => {
      const el = api.el;
      const T = api.t;
      const panel = root.closest('#panel');
      const toTop = () => { if (panel) panel.scrollTop = 0; };
      const reg = [];
      let st = null;

      const card = (k) => (st.pick[k] == null ? null : st.R.slots[k][st.pick[k]]);
      const completo = () => SLOTS.every((s) => st.pick[s.k] != null);
      const qual = () => SLOTS.filter((s) => card(s.k) && card(s.k).q === 'bom').length;
      const textoPedido = () => {
        const parts = SLOTS.map((s) => (card(s.k) ? T(card(s.k).t) : '')).filter(Boolean);
        if (st.bonus) parts.push(BONUS_TXT);
        return parts.join(' ');
      };
      const contaPalavras = (s) => s.split(/\s+/).filter((w) => /[0-9A-Za-zÀ-ú]/.test(w)).length;

      function start(i) {
        const R = RODADAS[i];
        const ordem = {};
        SLOTS.forEach((s) => { ordem[s.k] = api.shuffle([0, 1, 2]); });
        st = { i, R, ordem, pick: { ctx: null, task: null, fmt: null }, bonus: false, cur: 'ctx', envios: 0, primeira: false, mostrada: false, errados: {} };
        api.say(R.intro, 'faisca');
        builder();
        toTop();
      }

      function cabecalho() {
        const h = el('div', 'c1-head');
        const dots = el('div', 'c1-steps');
        RODADAS.forEach((R, j) => {
          const d = el('span', 'c1-dot', R.icon + ' ' + (j + 1) + ' de 3');
          if (j < st.i) d.classList.add(reg[j] && reg[j].primeira ? 'ok' : 'meh');
          else if (j === st.i) d.classList.add('on');
          if (j !== st.i) d.textContent = R.icon + ' ' + (j + 1);
          dots.appendChild(d);
        });
        h.appendChild(dots);
        h.appendChild(el('div', 'mg-title', st.R.nome));
        return h;
      }

      function caixaPedido() {
        const box = el('div', 'mg-prompt c1-prompt');
        SLOTS.forEach((s, n) => {
          const c = card(s.k);
          if (n) box.appendChild(document.createTextNode(' '));
          box.appendChild(el('span', 'slot ' + (c ? s.cls : 'empty'), c ? T(c.t) : s.ph));
        });
        if (st.bonus) {
          box.appendChild(document.createTextNode(' '));
          box.appendChild(el('span', 'slot bonus', BONUS_TXT));
        }
        return box;
      }
      function meta() {
        const n = contaPalavras(textoPedido());
        const m = el('div', 'c1-meta');
        m.appendChild(el('span', null, '📝 ' + n + (n === 1 ? ' palavra' : ' palavras')));
        if (st.i === 0) m.appendChild(el('span', null, 'O seu primeiro pedido tinha ' + contaPalavras(PRIMEIRO_PEDIDO) + '.'));
        else m.appendChild(el('span', null, 'Contexto, sim. Segredo, não.'));
        return m;
      }

      function builder() {
        root.innerHTML = '';
        root.appendChild(cabecalho());
        root.appendChild(el('div', 'mg-hint c1-missao', api.rich(T(st.R.missao), true)));
        const wrap = el('div', 'c1-build');
        // prévia do pedido
        const prev = el('div', 'c1-prev');
        prev.appendChild(el('div', 'mg-label', 'O seu pedido'));
        prev.appendChild(caixaPedido());
        prev.appendChild(meta());
        wrap.appendChild(prev);
        // escolha da peça
        const pick = el('div', 'c1-pick');
        const tabs = el('div', 'c1-tabs');
        SLOTS.forEach((s, n) => {
          const c = card(s.k);
          const ruim = c && st.errados[s.k] === st.pick[s.k];
          const b = el('button', 'c1-tab ' + s.cls + (st.cur === s.k ? ' on' : ''), [el('span', null, (n + 1) + '. ' + s.nome), el('span', 'st', c ? (ruim ? '⚠️' : '✓') : '·')]);
          b.type = 'button';
          b.addEventListener('click', () => { if (st.cur !== s.k) { st.cur = s.k; api.sfx('select'); builder(); } });
          tabs.appendChild(b);
        });
        const s = SLOTS.find((x) => x.k === st.cur);
        st.ordem[s.k].forEach((j, n) => {
          const c = st.R.slots[s.k][j];
          const b = el('button', 'mg-card c1-card ' + s.cls, [el('span', 'c1-kbd', String(n + 1)), el('span', 'c1-ct', '“' + T(c.t) + '”')]);
          b.type = 'button';
          b.dataset.key = String(n + 1);
          if (st.pick[s.k] === j) b.classList.add('on');
          if (st.errados[s.k] === j) b.classList.add('bad');
          b.addEventListener('click', () => escolher(s.k, j));
          pick.appendChild(b);
        });
        const bo = el('button', 'mg-card c1-bonus' + (st.bonus ? ' on' : ''), [
          el('span', 'c1-kbd', '4'),
          el('span', 'box', st.bonus ? '✓' : ''),
          el('span', null, [el('b', null, 'Bônus: '), '“' + BONUS_TXT + '”']),
        ]);
        bo.type = 'button';
        bo.dataset.key = '4';
        bo.addEventListener('click', () => {
          st.bonus = !st.bonus;
          api.sfx(st.bonus ? 'pop' : 'select');
          if (st.bonus) api.say('Bônus ligado: em vez de supor o que falta, eu pergunto. Diretor novo bom faz isso.', 'faisca');
          builder();
        });
        // abas e pergunta vêm depois dos cartões no DOM (a ordem visual é feita no CSS):
        // assim o teclado e os testes automáticos encontram primeiro as peças.
        pick.appendChild(tabs);
        pick.appendChild(el('div', 'c1-q', [el('span', 'mg-badge c1-b-' + s.cls, s.nome), s.pergunta]));
        wrap.appendChild(pick);
        // ações: a 4ª peça (bônus) fica junto do envio, embaixo do pedido
        const act = el('div', 'c1-act');
        act.appendChild(bo);
        const send = api.btn('Enviar pedido ▶', enviar, { cls: 'primary c1-send', key: 5 });
        if (!completo()) send.disabled = true;
        else send.classList.add('ready');
        act.appendChild(el('div', 'mg-actions', send));
        wrap.appendChild(act);
        root.appendChild(wrap);
      }

      function escolher(k, j) {
        st.pick[k] = j;
        api.sfx('select');
        const next = SLOTS.find((x) => st.pick[x.k] == null);
        builder();
        if (next) {
          const go = () => { if (st && st.pick[next.k] == null && root.isConnected) { st.cur = next.k; builder(); } };
          if (instant()) go();
          else api.timeout(go, 280);
        } else {
          api.say('Pedido montado. Confira como ficou e, se quiser, ligue o bônus. Depois é só enviar.', 'faisca');
        }
      }

      function enviar() {
        if (!completo()) return;
        st.envios++;
        if (st.envios === 1) st.primeira = qual() === 3;
        api.sfx('confirm');
        G.faisca.play('type', instant() ? 0.01 : 1.1);
        resultado(false);
      }

      function legenda() {
        const lg = el('div', 'c1-legend');
        [['#7fa1ec', 'veio do contexto'], ['#ff9d78', 'da tarefa'], ['#5fd0a6', 'do formato']].forEach(([c, t]) => {
          const i = el('i');
          i.style.background = c;
          lg.appendChild(el('span', null, [i, t]));
        });
        return lg;
      }

      function resultado(mostrada) {
        root.innerHTML = '';
        toTop();
        const p = { ctx: card('ctx').q, task: card('task').q, fmt: card('fmt').q, bonus: st.bonus };
        const n = qual();
        root.appendChild(cabecalho());
        const res = el('div', 'c1-res');
        const doc = el('div', 'mg-doc c1-ans');
        doc.appendChild(el('h4', null, mostrada ? '✨ A versão certeira' : '💬 Resposta da Faísca'));
        doc.appendChild(legenda());
        const body = el('div', 'c1-body');
        doc.appendChild(body);
        res.appendChild(doc);
        const side = el('div', 'mg-col c1-side');
        res.appendChild(side);
        root.appendChild(res);
        const linhas = st.R.resposta(p);
        let k = 0;
        if (!instant()) api.sfx('typing');
        const step = () => {
          if (!root.isConnected || !body.isConnected) return;
          while (k < linhas.length) {
            const [src, txt, cls] = linhas[k++];
            body.appendChild(el('div', 'c1-ln ' + src + (cls ? ' ' + cls : '') + (instant() ? '' : ' anim'), api.rich(T(txt), true)));
            if (!instant()) { api.timeout(step, 240); return; }
          }
          lado(side, n, mostrada);
        };
        step();
      }

      function lado(side, n, mostrada) {
        const sig = SLOTS.some((s) => card(s.k).sig);
        const ruim = SLOTS.some((s) => card(s.k).q === 'ruim');
        // placar
        const sc = el('div', 'c1-score');
        sc.appendChild(api.stars(n, 3));
        const m = api.meter(0, 'Qualidade');
        sc.appendChild(m);
        side.appendChild(sc);
        const alvo = Math.round((n / 3) * 90 + (st.bonus ? 10 : 0));
        if (instant()) m.set(alvo);
        else api.timeout(() => m.set(alvo), 60);
        // por que (uma linha por peça)
        SLOTS.forEach((s) => {
          const c = card(s.k);
          const cls = c.q === 'bom' ? 'ok' : c.q === 'vago' ? 'warn' : 'bad';
          const veredito = c.q === 'bom' ? '✓ Certeira' : c.rot || (c.q === 'vago' ? '≈ Vaga' : '✗ Arriscada');
          side.appendChild(el('div', 'mg-feedback c1-fb ' + cls, [
            el('span', 'mg-badge c1-b-' + s.cls, s.nome),
            el('b', null, veredito),
            el('div', 'c1-why', api.rich(T(c.why), true)),
          ]));
        });
        if (st.bonus) side.appendChild(el('div', 'mg-feedback c1-fb ok', [el('span', 'mg-badge c1-b-bonus', 'Bônus'), 'Em vez de supor, ela perguntou o que faltava.']));
        else if (n === 3) side.appendChild(el('div', 'mg-feedback c1-fb info', [el('span', 'mg-badge c1-b-bonus', 'Dica'), 'Com o bônus ligado, ela pergunta o que falta em vez de supor.']));
        // ações
        const act = el('div', 'mg-actions c1-side-act');
        if (n === 3) {
          const ultimo = st.i === RODADAS.length - 1;
          act.appendChild(api.btn(ultimo ? 'Ver o resultado ▶' : 'Próximo pedido ▶', proximo, { cls: 'primary', key: 1 }));
        } else {
          act.appendChild(api.btn('👀 Ver a versão certeira', mostrar, { key: 2 }));
          act.appendChild(api.btn('✏️ Ajustar o pedido', ajustar, { cls: 'primary', key: 1 }));
        }
        side.appendChild(act);
        // reação da Faísca (no painel e no 3D)
        if (mostrada) {
          api.say('Esta é a versão certeira. Compare com a sua: a diferença toda está nas peças.', 'faisca');
          G.faisca.play('teach', 1.4);
        } else if (n === 3) {
          api.say(st.R.certeira, 'faisca');
          api.sfx('success');
          G.faisca.play('celebrate', 1.5);
        } else if (sig) {
          api.say('Repare: eu aceitei o dado sem piscar. Eu não vou te impedir: quem segura o que é sigiloso é você.', 'faisca');
          api.sfx('fail');
          G.faisca.play('scared', 1.3);
        } else if (ruim) {
          api.say('A resposta saiu do tamanho do pedido. Quer trocar a peça que deu errado?', 'faisca');
          api.sfx('fail');
          G.faisca.play('doubt', 1.3);
        } else {
          api.say('Nada de errado, só vago. E pedido vago volta vago. Quer ajustar?', 'faisca');
          api.sfx('blip');
          G.faisca.play('think', 1.3);
        }
      }

      function ajustar() {
        st.errados = {};
        SLOTS.forEach((s) => { if (card(s.k).q !== 'bom') st.errados[s.k] = st.pick[s.k]; });
        const first = SLOTS.find((s) => st.errados[s.k] != null);
        st.cur = first ? first.k : 'ctx';
        api.sfx('page');
        api.say('Troque as peças marcadas com ⚠️. O que já estava certo pode ficar.', 'faisca');
        builder();
        toTop();
      }
      function mostrar() {
        SLOTS.forEach((s) => { st.pick[s.k] = st.R.slots[s.k].findIndex((c) => c.q === 'bom'); });
        st.bonus = true;
        st.mostrada = true;
        st.errados = {};
        api.sfx('page');
        resultado(true);
      }
      function proximo() {
        reg[st.i] = { id: st.R.id, primeira: st.primeira, envios: st.envios, mostrada: st.mostrada };
        api.sfx('confirm');
        if (st.i < RODADAS.length - 1) start(st.i + 1);
        else final();
      }

      function final() {
        root.innerHTML = '';
        toTop();
        const bons = reg.filter((x) => x.primeira).length;
        root.appendChild(el('div', 'mg-title', 'Os seus três pedidos'));
        const list = el('div', 'mg-col');
        RODADAS.forEach((R, j) => {
          const x = reg[j];
          const sub = x.primeira ? 'Certeiro de primeira' : x.mostrada ? 'Você viu a versão certeira' : 'Certeiro depois do ajuste';
          list.appendChild(el('div', 'mg-feedback c1-fim ' + (x.primeira ? 'ok' : 'info'), [
            el('span', 'c1-fim-ic', R.icon),
            el('div', null, [el('b', null, R.nome), el('div', 'mg-small', sub)]),
            el('span', 'mg-badge ' + (x.primeira ? 'mint' : 'blue'), x.primeira ? '✓ de primeira' : x.mostrada ? 'aprendido' : 'ajustado'),
          ]));
        });
        root.appendChild(list);
        root.appendChild(el('div', 'c1-total', api.rich('Certeiros de primeira: *' + bons + ' de 3*', true)));
        const act = el('div', 'mg-actions');
        act.appendChild(api.btn('Concluir ▶', () => done({ bons, reg }), { cls: 'primary', key: 1 }));
        root.appendChild(act);
        if (bons === 3) {
          api.say('Três de três, de primeira. Você não aprendeu a usar IA hoje: você já sabia dar briefing.', 'faisca');
          api.sfx('jingle_vitoria');
          G.faisca.play('celebrate', 1.6);
          G.fx.confetti(G.faisca);
        } else {
          api.say('Pedido bom não é dom: é o mesmo briefing que você dá há trinta anos. Agora é só usar.', 'faisca');
          api.sfx('success');
          G.faisca.play('jump', 1);
        }
      }

      start(0);
    }, { title: '🧩 Monte o pedido', size: 'l' });
  }

  // ------------------------------------------------------------------
  // MINIGAME 2 — Ajuste fino (refinar em vez de recomeçar)
  // ------------------------------------------------------------------
  function ajusteFino(G) {
    return G.mini((root, done, api) => {
      const el = api.el;
      const T = api.t;
      let atual = 'base';
      let tok = 0;
      const wrap = el('div', 'c1-fino');
      const chips = el('div', 'c1-chips');
      const box = el('div', 'c1-mailbox');
      const ped = el('div', 'c1-ped');
      const doc = el('div', 'mg-doc c1-mail');
      box.appendChild(ped);
      box.appendChild(doc);
      const botoes = {};
      const opcoes = REFINOS.concat([{ k: 'base', icon: '↩️', chip: 'Voltar ao original', pedido: '', fala: 'De volta à primeira versão. Nada se perde: dá para ir e voltar.', txt: EMAIL_BASE }]);
      opcoes.forEach((r, n) => {
        const b = el('button', 'mg-card c1-chip' + (r.k === 'base' ? ' base' : ''), [el('span', 'c1-kbd', String(n + 1)), el('span', 'ic', r.icon), el('span', null, r.chip)]);
        b.type = 'button';
        b.dataset.key = String(n + 1);
        b.addEventListener('click', () => escolher(r));
        botoes[r.k] = b;
        chips.appendChild(b);
      });
      const act = el('div', 'c1-act mg-actions');
      act.appendChild(api.btn('✅ Fico com esta versão', () => done(atual), { cls: 'primary', key: 6 }));
      wrap.appendChild(chips);
      wrap.appendChild(box);
      wrap.appendChild(act);
      root.appendChild(el('div', 'mg-hint c1-missao', 'Toque num ajuste e veja o mesmo e-mail mudar. Teste quantos quiser; no fim, fique com a versão que você assinaria.'));
      root.appendChild(wrap);

      function desenha(r) {
        doc.innerHTML = '';
        const rot = r.k === 'base' ? 'Original' : r.chip;
        doc.appendChild(el('h4', null, ['✉️ Re: atraso na entrega', el('span', 'mg-badge ' + (r.k === 'base' ? 'blue' : 'mint'), rot)]));
        doc.appendChild(api.rich(T(r.txt)));
        ped.innerHTML = '';
        if (r.pedido) ped.appendChild(api.rich('*Você pediu:* “' + r.pedido + '”', true));
        else ped.appendChild(api.rich('*Rascunho do pedido 2*, com os [colchetes] no lugar do que falta confirmar.', true));
        Object.keys(botoes).forEach((k) => botoes[k].classList.toggle('on', k === r.k && k !== 'base'));
      }
      function escolher(r) {
        if (r.k === atual) return;
        atual = r.k;
        const my = ++tok;
        api.sfx('select');
        Object.keys(botoes).forEach((k) => botoes[k].classList.toggle('on', k === r.k && k !== 'base'));
        if (instant()) { desenha(r); api.say(r.fala, 'faisca'); return; }
        G.faisca.play('type', 0.8);
        doc.innerHTML = '';
        doc.appendChild(el('div', 'c1-typing', 'Faísca reescrevendo…'));
        api.timeout(() => {
          if (my !== tok || !root.isConnected) return;
          desenha(r);
          api.sfx('pop');
          api.say(r.fala, 'faisca');
          if (r.k === 'dez') G.faisca.play('spin', 1.2);
          // no celular, mostra o e-mail novo
          if (window.innerWidth < 860 && box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 650);
      }
      desenha(opcoes[opcoes.length - 1]);
    }, {
      title: '✏️ Ajuste fino: o e-mail do cliente', size: 'l',
      intro: 'Em vez de recomeçar, peça ajustes, do jeito que você pediria à sua secretária para mexer numa carta.', introWho: 'faisca',
    });
  }

  // ------------------------------------------------------------------
  // CAPÍTULO
  // ------------------------------------------------------------------
  P2.chapter({
    id: 'cap1',
    num: 'Capítulo 1',
    title: 'A Arte de Pedir',
    subtitle: 'O relatório das dez, um pedido vago e um talento de trinta anos',
    music: 'manha',
    minutes: 8,
    parts: [
      // ----------------------------------------------------------------
      // 1. O pedido vago
      // ----------------------------------------------------------------
      async (G) => {
        P2.ui.css('cap1', CSS);
        await G.titleCard();
        G.scene('cozinha', { time: 'manha', steam: true });
        G.music('manha');
        G.filho.at('mesa2').setAnim('sit').set({ props: { mug: true } });
        G.filho.setExpr('feliz');
        G.pai.at('cafe').setAnim('coffee').set({ props: { mug: true } });
        G.pai.setExpr('cansado');
        G.faisca.at(FAISCA_MESA, FAISCA_Y);
        G.faisca.face(G.pai, true);
        G.player.cine();
        await G.cam.shot('geral', 0);
        G.hud.set({ clock: '07:10' });
        await G.fadeIn(1.0);
        await G.cutscene(async () => {
          await G.narrate('Sete e dez. Segundo café. O relatório do conselho continua em branco.');
          G.cam.shot('cafe', 2.6).catch(() => {});
          await G.wait(1.4);
          G.sfx('phone_vibrate');
          G.toast('*Dona Marta:* "Bom dia, {pai}! Relatório às 10h, combinado? E prepare-se: o conselho vai perguntar o que a empresa anda fazendo com IA."', { icon: '💬', kind: 'notif', dur: 7 });
          await G.wait(1.6);
        });
        G.pai.setAnim('idle');
        await G.say('pai', 'Dona Marta. Relatório às dez... e o conselho quer saber o que a empresa anda fazendo com IA.', { expr: 'desconfiado' });
        await G.say('filho', 'Olha só. E dessa vez nem fui eu que puxei o assunto.', { expr: 'rindo' });
        await G.fadeOut(0.35);
        G.player.fp();
        G.player.setLook(-0.12, 0.62);
        await G.fadeIn(0.45);
        await G.explore({
          objetivo: 'Volte para a mesa com o seu café',
          hotspots: [
            {
              id: 'geladeira', label: 'A porta da geladeira', icon: '🧲', at: 'geladeira', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'O desenho d{oa} {filho}, de quando tinha seis anos. Está nesta geladeira há mais tempo que muito diretor ficou na empresa.');
                await G.think('pai', 'E o bilhete: "Comprar café!". Esse, sim, é urgente de verdade.');
              },
            },
            {
              id: 'pia', label: 'A pia', icon: '🍽️', at: 'pia', optional: true,
              onInteract: async (G) => {
                if (G.flag('aposta')) await G.think('pai', 'A louça de ontem. Se essa tal de Faísca for inútil, isso aqui vira problema d{oa} {filho} por um mês.');
                else await G.think('pai', 'A louça de ontem. Uma crise de cada vez.');
              },
            },
            { id: 'mesa', label: 'Sentar com {filho}', icon: '🪑', actor: 'filho' },
          ],
        });
        await G.fadeOut(0.35);
        sentar(G);
        G.pai.setExpr('neutro');
        await G.fadeIn(0.4);
        G.player.lookAt('filho');
        await G.say('filho', 'E aí, por onde você começa?', { expr: 'amigavel' });
        await G.say('pai', 'Pelo pior: o relatório do conselho. Vamos ver se a sua amiga serve para alguma coisa.', { expr: 'desconfiado' });
        G.faisca.play('jump', 0.8);
        await G.say('faisca', 'Pode mandar!', { expr: 'feliz' });
        await G.aiChat([
          { from: 'voce', text: PRIMEIRO_PEDIDO },
          { from: 'ia', text: '*Relatório Trimestral*\n- *Introdução:* este trimestre foi marcado por desafios e oportunidades.\n- *Resultados:* a empresa apresentou desempenho sólido, com foco em eficiência.\n- *Perspectivas:* seguiremos comprometidos com o crescimento sustentável e a inovação.\n- *Conclusão:* o futuro é promissor.', thinking: 1.2 },
        ], { title: 'Faísca' });
        // o ceticismo que ele escolheu no Prólogo
        const cet = G.flag('ceticismo') || ((P2.save.data.progress.vars || {}).prologo || {}).ceticismo;
        if (cet === 'inventou') await G.say('pai', 'Pelo menos não inventou número. Também não disse absolutamente nada.', { expr: 'desconfiado' });
        else if (cet === 'modinha') await G.say('pai', '"O futuro é promissor." Moda é isso: muito brilho e nenhum conteúdo.', { expr: 'desconfiado' });
        else await G.say('pai', 'Isso eu escrevia à mão, de olhos fechados, em 1995. E já era ruim.', { expr: 'desconfiado' });
        G.faisca.play('ashamed', 1.4);
        await G.say('faisca', 'É ruim mesmo. Eu escrevi um relatório para *qualquer* empresa do planeta, porque é tudo o que eu sei sobre a sua: nada.');
        await G.say('filho', '{apelido}, se um diretor novo chegasse hoje e você só dissesse "faz um relatório"...', { expr: 'amigavel' });
        await G.say('pai', 'Eu ia receber exatamente isso. E a culpa ia ser minha, que expliquei mal.', { expr: 'pensativo' });
        G.faisca.play('teach', 1.6);
        await G.say('faisca', 'É igual explicar serviço para um diretor novo: *quem você é, o que quer, o contexto e o formato.* E deixar que ele pergunte o que faltar.');
        await G.say('pai', 'Isso tem nome: briefing. Faço há trinta anos.', { expr: 'orgulhoso' });
        await G.say('filho', 'Então você já sabe usar IA. Só não sabia que sabia.', { expr: 'rindo' });
        await G.say('filho', 'O pessoal chama esse pedido de *prompt*. Mas é só isso: o pedido que você escreve.');
        await G.say('pai', 'Então vamos chamar de pedido. Esta cozinha ainda é minha.', { expr: 'rindo' });
        await G.say('faisca', 'Combinado: pedido. Um aviso: no celular eu sou uma conta pessoal. Número do trimestre, dado de cliente e papel do conselho ficam para a ferramenta da empresa.');
        await G.say('faisca', 'Aqui a gente treina o *pedido*. E pedido bom não precisa de segredo: contexto, sim; segredo, não.');
        await G.say('pai', 'Um estagiário que pede para não ver segredo. Essa é nova.', { expr: 'desconfiado' });
        await G.fadeOut(0.5);
      },

      // ----------------------------------------------------------------
      // 2. Monte o pedido + ajuste fino
      // ----------------------------------------------------------------
      async (G) => {
        P2.ui.css('cap1', CSS);
        mesaPosta(G, '07:20');
        await G.fadeIn(0.6);
        G.player.lookAt(G.faisca);
        G.faisca.play('teach', 1.4);
        await G.say('faisca', 'Vamos montar três pedidos de verdade do seu dia. Você escolhe as peças; eu respondo do jeito que o pedido merecer.');
        const r = await monteOPedido(G);
        const bons = (r && r.bons) || 0;
        G.stats({ pedidosBons: bons, pedidosTotal: 3 });
        G.v.pedidos = (r && r.reg) || [];
        if (bons === 3) G.achieve('mestre_pedido');
        G.player.lookAt('filho');
        if (bons === 3) {
          await G.say('filho', 'Três de três! Quem diria.', { expr: 'empolgado', emote: 'star' });
          await G.say('pai', 'Eu diria. Briefing é o que eu mais faço na vida.', { expr: 'orgulhoso' });
        } else {
          await G.say('filho', 'Viu? Quando a peça era vaga, a resposta vinha vaga.', { expr: 'amigavel' });
          await G.say('pai', 'Igualzinho a diretor novo. Pedido mal feito, relatório mal feito.', { expr: 'pensativo' });
        }
        await G.say('pai', 'O e-mail do cliente ficou bom. Mas não está com a minha cara.', { expr: 'desconfiado' });
        await G.say('faisca', 'Então me diga como é a sua cara. Não precisa recomeçar: é só pedir ajuste.', { expr: 'feliz' });
        const kept = await ajusteFino(G);
        G.v.versaoEmail = kept;
        if (kept === 'dez') {
          await G.say('pai', 'Era só para ver você suar. No escritório eu vou de versão séria.', { expr: 'rindo' });
          G.faisca.play('ashamed', 1);
          await G.say('faisca', 'Eu não suo. Mas entendi o recado.');
        } else if (kept === 'topicos') {
          await G.say('pai', 'Fico com os tópicos. Mas, para o Vicente, talvez eu solte um pouco o texto.', { expr: 'pensativo' });
          await G.say('faisca', 'Quem conhece o Vicente é você. Eu só conheço os tópicos.');
        } else {
          await G.say('pai', 'Esta serve.', { expr: 'neutro' });
        }
        await G.say('pai', 'Nome do cliente e data eu ponho no escritório, depois de falar com o Rafael, das operações. Quem assina sou eu.', { expr: 'determinado' });
        G.faisca.play('celebrate', 1.2);
        await G.say('faisca', 'Os colchetes estão lá exatamente para isso. E o pedido você reaproveita: lá, na ferramenta da empresa, com os dados de verdade.');
        await G.fadeOut(0.5);
      },

      // ----------------------------------------------------------------
      // 3. O limite honesto, a despedida e a lição
      // ----------------------------------------------------------------
      async (G) => {
        mesaPosta(G, '07:52');
        await G.fadeIn(0.6);
        G.player.lookAt(G.faisca);
        await G.say('pai', 'Já que você está tão esperta, uma de bônus.', { expr: 'desconfiado' });
        await G.aiChat([
          { from: 'voce', text: 'Quanto de queda na margem a Dona Marta aceita sem pedir a minha cabeça?' },
          { from: 'ia', text: '*Não sei.* Eu nunca vi a Dona Marta, não conheço o seu conselho nem o que vocês já combinaram.\nSe eu desse um número, seria um chute com cara de certeza.\n*O que me ajudaria:* as metas que o conselho aprovou, o que ela costuma cobrar (em termos gerais) e como vocês explicaram quedas antes.\nCom isso eu preparo os argumentos. Ler a Dona Marta é com você.', thinking: 1.3 },
        ], { title: 'Faísca' });
        const lim = await G.choose([
          { text: '"Chuta um número. Fica entre nós."', value: 'chute' },
          { text: '"Justo. Essa parte é comigo."', value: 'comigo' },
        ], { prompt: 'O que você responde?', who: 'pai' });
        G.v.limite = lim;
        if (lim === 'chute') {
          await G.say('pai', 'Chuta um número. Fica entre nós.', { expr: 'desconfiado' });
          G.faisca.play('doubt', 1.3);
          await G.say('faisca', 'Chutar eu consigo, e com voz de quem tem certeza. É justamente o que você não quer ouvir antes das dez.');
          await G.say('faisca', 'Quando eu não souber, o certo é eu dizer "não sei". Dá até para pedir isso no fim de todo pedido.');
        } else {
          await G.say('pai', 'Justo. Essa parte é comigo.', { expr: 'neutro' });
          G.faisca.play('celebrate', 1.2);
          await G.say('faisca', 'Exato. Eu não vejo o que não está no papel: as pessoas, a história, o clima da sala.');
        }
        await G.say('pai', 'Trinta anos de conselho. Essa leitura ninguém faz por mim.', { expr: 'orgulhoso' });
        await G.say('filho', 'Ela não sabia e disse que não sabia. Isso nem muito consultor faz, {apelido}.', { expr: 'rindo' });
        await G.say('pai', 'Não me faça elogiar a máquina antes das oito.', { expr: 'rindo' });
        // {filho} vai trabalhar
        G.hud.set({ clock: '07:58' });
        G.filho.play('lookphone', 1.2);
        await G.say('filho', 'Falando em oito... vou nessa. Reunião às oito e meia, e o trânsito não perdoa.', { expr: 'sem_graca' });
        G.filho.setAnim('idle');
        G.filho.set({ props: { mug: false, phone: true } });
        G.pai.setAnim('idle');
        G.player.lookAt('filho');
        await G.filho.walk({ x: 1.72, z: 1.18 }); // sai de lado, sem atravessar a cadeira
        await G.filho.walk('porta');
        G.filho.face(G.pai);
        await G.explore({
          objetivo: 'Acompanhe {filho} até a porta',
          hotspots: [
            {
              id: 'cafe', label: 'Mais um café?', icon: '☕', at: 'cafe', optional: true,
              onInteract: async (G) => {
                G.sfx('coffee');
                await G.think('pai', 'Terceiro café? Melhor não. O conselho não precisa de um CEO tremendo.');
              },
            },
            { id: 'porta', label: 'Despedir-se de {filho}', icon: '👋', actor: 'filho' },
          ],
        });
        await G.fadeOut(0.35);
        G.pai.at(PAI_PORTA).setAnim('idle');
        G.pai.setExpr('amigavel');
        G.filho.at('porta').setAnim('idle');
        G.filho.face(G.pai, true);
        G.faisca.at(FAISCA_PORTA, 1.3);
        G.faisca.face(G.pai, true);
        G.player.cine();
        await G.cam.two(G.pai, G.filho, { dur: 0 });
        await G.fadeIn(0.5);
        await G.letterbox(true, 0.4);
        await G.say('filho', 'E aí? Por enquanto: útil ou inútil?', { expr: 'feliz' });
        await G.say('pai', 'Cedo para dizer. Mas o estagiário entende briefing.', { expr: 'desconfiado' });
        if (G.flag('aposta')) await G.say('filho', 'Então vou adiando a compra das luvas.', { expr: 'rindo' });
        await G.say('filho', 'Você sempre soube explicar o que quer, {apelido}. Ela só precisava ouvir.', { expr: 'amigavel' });
        await G.say('pai', 'Vai, que você se atrasa. E me manda mensagem quando chegar.', { expr: 'amigavel' });
        G.filho.play('wave', 1.4);
        await G.say('filho', 'Mando. E confere tudo, hein?', { expr: 'rindo', emote: 'heart' });
        await G.say('pai', 'Isso nem precisava pedir.', { expr: 'orgulhoso' });
        G.sfx('door');
        await G.filho.fadeOut(0.7);
        await G.letterbox(false, 0.3);
        await G.fadeOut(0.35);
        G.filho.remove();
        G.player.fp();
        G.player.setLook(-0.05, -PI / 2);
        G.hud.set({ clock: '08:00' });
        await G.fadeIn(0.45);
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Pronto para o escritório?', { expr: 'feliz' });
        await G.say('pai', 'Quase. Antes, me diga de onde você tirou essa história de pedido bom.', { expr: 'desconfiado' });
        await G.say('faisca', 'De quem mede. Um dos dados é do Google, que vende IA: por isso o selo diz "fornecedor". Os outros dois são estudos independentes.');
        await G.fact(['google_21_palavras', 'sem_palavras_magicas', 'noy_zhang_escrita'], { titulo: 'Pedir bem compensa' });
        await G.say('pai', 'Vinte e uma palavras. O meu primeiro pedido tinha cinco.', { expr: 'pensativo' });
        G.faisca.play('teach', 1.4);
        await G.say('faisca', 'Não é para contar palavras: é para não economizar contexto.');
        await G.say('faisca', 'A receita vai ficar no seu Guia do CEO, no botão 📘 Guia, lá em cima. É só copiar e trocar o que está entre colchetes.');
        await G.lesson('Você já sabe usar IA: é igual explicar serviço para um diretor novo. Diga quem você é, o que quer, o contexto e o formato. E deixe que ela pergunte o que faltar.\nContexto, sim. Segredo, não.', { titulo: 'A arte de pedir' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const s = G.allStats().cap1 || {};
      const bons = s.pedidosBons == null ? '—' : s.pedidosBons;
      return [
        'Pedidos certeiros de primeira: ' + bons + ' de 3',
        'A receita: quem sou · o que quero · contexto · formato · "me pergunte o que faltar"',
        'Novo no Guia do CEO (📘): "Como pedir"',
      ].map((l) => G.t(l));
    },
  });
})();

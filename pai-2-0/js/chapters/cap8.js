/* PAI 2.0 — Capítulo 8: "Coisas da Casa"
 * 19h30–21h. Cozinha à noite → sala. Pela primeira vez em meses ele chega antes do jantar.
 * Gancho: geladeira de fim de mês + o mural de recados (conta de luz de R$ 412, exame, Beto…).
 * Virada: a mesma receita do escritório funciona em casa (contexto · pedido claro · cuidado).
 * Seis missões (o jantar primeiro, depois as outras cinco em qualquer ordem): três jeitos de
 * pedir, 0–3 estrelas, a resposta que cada pedido merece e, depois de um pedido fraco, o pedido
 * nota 10. Conta pessoal configurada com {filho} (treino desligado, chat temporário).
 * Twist: no rascunho para o Beto, a IA inventa uma lembrança → caneta vermelha.
 * Antídotos: distribuidora/site oficial, médico, palavras dele, escolha dele.
 * Fecho: sofá com {filho} (que sai para o aniversário do Gui — gancho do Cap 10), fatos, lição.
 * Stats: cap8 {estrelas, estrelasMax:18}. Conquista: dono_da_casa (18/18).
 */
(function () {
  'use strict';
  const P2 = window.P2;

  /** Promessa em segundo plano (não deixa rejeição solta se o capítulo for interrompido). */
  const bg = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  /** Variável de outro capítulo (ex.: o ceticismo do Prólogo), se existir. */
  function varDe(cap, k) {
    const d = P2.save && P2.save.data && P2.save.data.progress;
    const v = d && d.vars && d.vars[cap];
    return v ? v[k] : undefined;
  }
  const MAX = 18;
  const BETO = { name: 'Beto', color: '#4f8a5b' };

  // ------------------------------------------------------------------
  // As três estrelas de um pedido
  // ------------------------------------------------------------------
  const CRIT = [
    { ic: '🧩', t: 'Contexto' },
    { ic: '🎯', t: 'Pedido claro' },
    { ic: '🛡️', t: 'Cuidado' },
  ];

  // ------------------------------------------------------------------
  // As seis missões (os pedidos nota 10 batem com o Guia do CEO › Vida pessoal)
  // ------------------------------------------------------------------
  const MISSOES = [
    {
      id: 'jantar', icon: '🍳', titulo: 'Jantar com o que tem', post: 'Jantar com o que tem na geladeira', cor: '#ffe27a', rot: -2,
      sit: 'Na geladeira: meio frango assado, 3 ovos, 1 abobrinha, 2 tomates, queijo minas, arroz de ontem e 1 cebola. Duas pessoas com fome. Ninguém quer pizza de novo.',
      intro: 'Como você me pede o jantar?',
      opcoes: [
        {
          txt: 'Tenho meio frango assado, 3 ovos, 1 abobrinha, tomate, queijo minas, arroz de ontem e cebola. Jantar para 2, em até 30 minutos, sem forno. Me dê 2 opções com passo a passo curto.',
          crit: [1, 1, 1],
          ans: '*1. Arroz de frigideira (25 min)*\n- Doure a cebola, junte o frango desfiado e a abobrinha em cubos.\n- Misture o arroz, cubra com tomate e queijo e tampe até derreter.\n*2. Omelete recheada (15 min)*\n- 3 ovos batidos, frango e queijo por dentro.\n- Tomate e abobrinha grelhada do lado.\n*Sobrou frango?* Vira sanduíche amanhã.',
          why: 'Ingredientes, quantas pessoas, tempo, restrição e formato. Ela não precisou adivinhar nada.',
        },
        {
          txt: 'O que dá para fazer com frango, ovo e abobrinha?',
          crit: [1, 0, 1],
          ans: 'Muita coisa! Frango ao curry com arroz basmati, abobrinha recheada gratinada no forno, quiche de frango… Quer a receita de alguma?',
          why: 'Os ingredientes ajudaram, mas o pedido ficou aberto: sem tempo, sem "sem forno", sem formato. Veio gratinado e quiche.',
        },
        {
          txt: 'Sugere um jantar.',
          crit: [0, 0, 1],
          ans: 'Que tal um risoto de cogumelos com parmesão? Ou um salmão grelhado com aspargos e molho de limão-siciliano. Combina com um vinho branco seco!',
          why: 'Sem contexto, ela chuta. O cardápio é lindo, mas não tem nada disso na sua geladeira.',
        },
      ],
      sua: 'Provar o tempero é com você. E, se alguém tiver alergia ou restrição, confira cada ingrediente.',
    },
    {
      id: 'conta', icon: '💡', titulo: 'A conta de luz', post: 'Conta de luz: R$ 412?!', cor: '#ffc0cc', rot: 2,
      sit: 'Conta de luz: *R$ 412,00*, vence sexta. Mês passado: R$ 298. Consumo: 395 kWh (antes, 290). Na conta: bandeira amarela, iluminação pública e ICMS. No topo: seu nome, CPF, endereço e número de cliente.',
      intro: 'Trinta anos pagando conta de luz. Hoje você vai entender uma. Como pede?',
      opcoes: [
        {
          txt: 'Minha conta de luz veio R$ 412; no mês passado, R$ 298. Consumo: 395 kWh (antes, 290), bandeira amarela, iluminação pública e ICMS. Explique cada item em linguagem simples, por que pode ter subido e o que devo confirmar com a distribuidora.',
          crit: [1, 1, 1],
          ans: '*O que mais pesou:* o consumo subiu 105 kWh, mais de um terço. É isso que puxa a conta.\n*Bandeira amarela:* um acréscimo na tarifa nos meses em que gerar energia fica mais caro.\n*Iluminação pública:* taxa da prefeitura. *ICMS:* imposto do estado, cresce junto com a conta.\n*Suspeitos comuns:* chuveiro elétrico no frio, ar-condicionado, geladeira velha.\n*Confirme no app ou no site da distribuidora:* a leitura deste mês foi real ou *estimada*? E veja o histórico de 12 meses.',
          why: 'Itens e valores, sem nome, CPF ou endereço; pedido claro e onde conferir. Explicação sob medida, sem expor nada.',
        },
        {
          txt: '📷 (foto da conta inteira, com nome, CPF, endereço e número de cliente) Por que veio tão cara?',
          crit: [1, 0, 0],
          ans: 'Pela foto, o consumo foi de 395 kWh, acima do mês anterior, e a bandeira é amarela. Pode ser chuveiro, ar-condicionado ou leitura estimada. Quer que eu explique item por item?',
          why: 'A resposta até ajuda, mas você mandou nome, CPF, endereço e número de cliente sem precisar. Para entender a conta, bastam os itens e os valores.',
        },
        {
          txt: 'Por que a conta de luz vem tão alta?',
          crit: [0, 0, 1],
          ans: 'Conta alta costuma ter três suspeitos: chuveiro elétrico, ar-condicionado e geladeira antiga. Dica: banhos mais curtos e aparelhos fora da tomada!',
          why: 'Ela não viu a sua conta, então falou da conta de todo mundo, com direito a sermão do banho curto. Pode nem ser o seu caso.',
        },
      ],
      sua: 'A tarifa certa e a leitura do medidor estão com a distribuidora: confira no app ou no site oficial. E tire nome, CPF e número de cliente antes de colar qualquer coisa.',
    },
    {
      id: 'viagem', icon: '🧳', titulo: 'Fim de semana fora', post: 'Fim de semana fora (sem estourar)', cor: '#a8e6cf', rot: -1.5,
      sit: 'Feriado chegando. A ideia: duas noites fora, de carro, você e {filho}. Orçamento: R$ 2.500 no total. {Eleela} quer trilha; você quer comer bem e dormir cedo. Saída na sexta à noite.',
      intro: 'Planejar viagem é comigo. Fechar a reserva é com você. Como pede?',
      opcoes: [
        {
          txt: 'Quero 2 noites fora, saindo de [sua cidade] de carro na sexta à noite. Somos 2; orçamento total de R$ 2.500. Um gosta de trilha; o outro, de comer bem e dormir cedo. Sugira 2 destinos a até 3 horas, com custo estimado por item, e marque [CONFIRMAR] em preços e horários.',
          crit: [1, 1, 1],
          ans: '*Opção 1: serra, a cerca de 2h30*\n- Pousada, 2 noites com café: ~R$ 1.300 [CONFIRMAR]\n- Combustível e pedágios: ~R$ 350 [CONFIRMAR]\n- Refeições: ~R$ 600\n- Trilha com guia, sábado cedo: ~R$ 150 [CONFIRMAR]\n*Total estimado:* ~R$ 2.400. Sobra pouco: deixe uma margem.\n*Opção 2: litoral, a cerca de 3h.* Fora da temporada sai mais em conta. Detalho se quiser.',
          nota: 'Valores ilustrativos: estimativa do jogo.',
          why: 'Saída, datas, pessoas, orçamento, gostos e o pedido de marcar o que precisa confirmar. Ela até avisou que sobra pouco.',
        },
        {
          txt: 'Monte um roteiro de 2 dias na serra para 2 pessoas, até R$ 2.500.',
          crit: [1, 1, 0],
          ans: '*Sábado:* café colonial na Pousada Bela Vista (diária de R$ 480), trilha da Cachoeira do Véu (entrada R$ 35) e jantar no Bistrô da Praça.\n*Domingo:* passeio de trem às 10h (R$ 120 por pessoa) e volta depois do almoço.',
          why: 'Bom roteiro, mas repare: nomes, horários e preços exatos, ditos com toda a certeza. A pousada pode nem existir, e o preço pode ser de outro ano. Peça para ela marcar o que precisa confirmar.',
        },
        {
          txt: 'Viagem barata pro feriado?',
          crit: [0, 0, 1],
          ans: 'Posso ajudar! Para montar algo bom, me conta: saindo de onde, quantas pessoas, quantos dias, qual orçamento e o que vocês gostam de fazer?',
          why: 'Não é erro dela: com tão pouco, o melhor que ela faz é perguntar de volta. Você ganhou mais uma rodada de conversa, não uma viagem.',
        },
      ],
      sua: 'Preço, vaga e horário mudam todo dia: confirme no site oficial antes de pagar. E dado de cartão nunca vai para o chat.',
    },
    {
      id: 'exame', icon: '🩺', titulo: 'O resultado do exame', post: 'Exame: o que é LDL?', cor: '#b9d4ff', rot: 1.5,
      sit: 'O laboratório mandou o resultado do check-up. Termos que você não entende: *LDL, HDL, triglicerídeos, glicemia de jejum*. Dois valores vieram marcados acima da referência. Consulta na quinta. No laudo: seu nome, CPF e número do pedido.',
      intro: 'Aqui eu ajudo a entender e a preparar a consulta. Diagnóstico, não: isso é com o médico. Como pede?',
      opcoes: [
        {
          txt: 'Recebi um exame com estes valores: LDL 162 e glicemia de jejum 104 (os dois marcados acima da referência), HDL 48 e triglicerídeos 140. Sem dar diagnóstico, explique em linguagem simples o que cada um significa e sugira 5 perguntas para eu levar ao médico.',
          crit: [1, 1, 1],
          ans: '*LDL:* o chamado "colesterol ruim". A meta ideal muda de pessoa para pessoa, conforme o histórico; isso o médico avalia.\n*HDL:* o "colesterol bom".\n*Triglicerídeos:* outro tipo de gordura no sangue; comida e bebida pesam.\n*Glicemia de jejum:* o açúcar no sangue depois de horas sem comer.\n*Para levar ao médico:*\n- Esses valores pedem tratamento ou só mudança de hábito?\n- Qual deve ser a minha meta de LDL?\n- Preciso repetir algum exame?\n- O que da minha rotina mais pesa nisso?\n- Quando volto para reavaliar?\n*Isto não é diagnóstico:* quem interpreta o seu caso é o médico.',
          why: 'Só termos e valores: sem nome, CPF ou número do pedido, um "LDL 162" não diz de quem é. Mais um "sem diagnóstico" e o pedido certo: preparar a conversa com o médico.',
        },
        {
          txt: 'O que significam LDL, HDL, triglicerídeos e glicemia de jejum?',
          crit: [0, 1, 1],
          ans: '*LDL:* o "colesterol ruim". *HDL:* o "colesterol bom". *Triglicerídeos:* gordura no sangue. *Glicemia de jejum:* açúcar no sangue em jejum. Quer saber mais sobre algum?',
          why: 'Explicação certa, mas genérica: sem os seus valores e sem preparar a consulta, você aprende o dicionário, não o que perguntar.',
        },
        {
          txt: '📷 (foto do laudo, com nome, CPF e número do pedido) Estou doente? Que remédio eu tomo?',
          crit: [1, 0, 0],
          ans: 'Não posso dar diagnóstico nem indicar remédio. Pelo laudo, o LDL e a glicemia estão acima da referência: vale levar ao seu médico. Posso explicar os termos e sugerir perguntas para a consulta.',
          why: 'Dado de saúde com nome e CPF é dado sensível, e não precisava ir. Diagnóstico e remédio são com o médico: ela mesma avisou.',
        },
      ],
      sua: 'Leve as perguntas ao médico: quem responde é ele. Nunca mude remédio ou dose por causa de uma resposta da IA. E, para assunto de saúde, use o chat temporário.',
    },
    {
      id: 'beto', icon: '💬', titulo: 'Falar com o Beto', post: 'Falar com o Beto', cor: '#ffd3a8', rot: -2.5,
      sit: 'Sábado foi o aniversário de 60 anos do Beto, seu irmão. Você não foi: viagem de trabalho de última hora. Ele respondeu só: "Tudo bem. Sei que você é ocupado." Você sente vergonha e saudade. Quer pedir desculpa de verdade e chamar para um churrasco no domingo.',
      intro: 'Eu ajudo a achar as palavras. O sentimento é seu. Como pede?',
      opcoes: [
        {
          txt: 'Quero mandar uma mensagem para o meu irmão. Faltei aos 60 anos dele por causa de trabalho. Sinto vergonha e saudade. Quero que ele saiba que importa mais que qualquer reunião, e chamar para um churrasco no domingo. Organize as minhas ideias, mantenha as minhas palavras e aponte o que pode soar mal.',
          crit: [1, 1, 1],
          ans: 'Organizei com as suas palavras; o rascunho vem a seguir. Um cuidado: não abra se justificando com o trabalho. Ele já sabe que você é ocupado, e foi isso que doeu.',
          why: 'Você contou o que aconteceu, o que sente e o que quer, e pediu para manter as suas palavras. Ela organiza; a voz continua sua.',
        },
        {
          txt: 'Escreva uma mensagem bonita de desculpas para o meu irmão, que fez 60 anos e eu faltei.',
          crit: [1, 1, 0],
          ans: 'Querido irmão, espero que esta mensagem o encontre bem. Sessenta anos de uma trajetória brilhante! Peço sinceras desculpas pela minha ausência em data tão especial. Que este novo ciclo seja repleto de luz…',
          why: 'Bonita, mas não é você. "Espero que esta mensagem o encontre bem"? O Beto ia rir, ou ficar mais chateado. Mensagem de afeto precisa da sua voz.',
        },
        {
          txt: 'Responde o Beto por mim. Ele tá chateado.',
          crit: [0, 0, 0],
          ans: 'Posso ajudar, mas não sei o que aconteceu entre vocês nem o que você quer dizer. Me conta? E quem manda a mensagem é você.',
          why: 'Ela não sabe o que houve nem o que você sente. E "responde por mim" é terceirizar justamente o que só você pode dizer.',
        },
      ],
      sua: 'Leia em voz alta: se não soar como você, reescreva. E, às vezes, ligar é melhor do que qualquer mensagem.',
      caneta: true,
    },
    {
      id: 'presente', icon: '🎁', titulo: 'Um presente', post: 'Presente (segredo!)', cor: '#d9c2ff', rot: 2.5,
      sit: 'Você quer dar um presente para {filho}. Sem data, sem motivo: só porque sim. Até R$ 500. {Eleela} gosta de cozinhar, de trilha e de música dos anos 80 (culpa sua: anos de rádio no carro).',
      intro: 'Opção eu gero aos montes. Quem conhece {filho} é você. Como pede?',
      opcoes: [
        {
          txt: 'Me dê 8 ideias de presente para {umuma} {filhoa} adult{oa} que gosta de cozinhar, de trilha e de música dos anos 80. Até R$ 500. Misture coisas, experiências e algo feito por mim, com uma linha dizendo por que cada uma combina.',
          crit: [1, 1, 1],
          ans: '1. *Aula de cozinha para dois:* vocês juntos no fogão.\n2. *Faca de chef de qualidade:* para quem leva a cozinha a sério.\n3. *Fim de semana de trilha com guia:* com você junto.\n4. *Disco de vinil dos anos 80:* e a vitrola da sala volta a tocar.\n5. *Caderno de receitas da família, escrito por você:* esse ninguém mais pode dar.\n6. *Mochila leve de trilha:* útil todo fim de semana.\n7. *Jantar no restaurante que {eleela} vive citando.*\n8. *Playlist das músicas do carro, com um bilhete seu.*\n*Preço e estoque:* confira na loja.',
          why: 'Interesses, orçamento e o pedido de misturar coisa, experiência e algo seu. Gerar muitas opções é o forte dela; escolher é o seu.',
        },
        {
          txt: 'Ideias de presente até R$ 500.',
          crit: [0, 1, 1],
          ans: 'Fone de ouvido sem fio, relógio inteligente, perfume importado, kit de vinhos, vale-presente de loja de departamento…',
          why: 'Lista de vitrine de shopping. Serve para qualquer pessoa e, por isso, não tem a cara de ninguém.',
        },
        {
          txt: 'Escolhe um presente para eu dar para {filho}.',
          crit: [0, 0, 0],
          ans: 'Não conheço {filho}, mas um vale-presente é sempre uma escolha segura!',
          why: 'Ela não conhece {filho}. Você conhece. Delegar a escolha deu nisso: o presente mais impessoal do mundo.',
        },
      ],
      sua: 'A escolha é sua, e o bilhete que vai junto também: esse, escreva sem ajuda.',
    },
  ];
  const BY_ID = {};
  MISSOES.forEach((m) => { BY_ID[m.id] = m; });
  const nStars = (o) => o.crit.reduce((a, b) => a + b, 0);
  const melhor = (m) => m.opcoes.find((o) => nStars(o) === 3);

  // Rascunho para o Beto (caneta vermelha): duas linhas não são dele
  const RASCUNHO_BETO = [
    { t: 'Beto, desculpa por sábado. Eu devia ter ido.', ok: true },
    { t: 'Não existe reunião que valha os seus 60 anos.', ok: true },
    { t: 'Lembra das nossas pescarias em Porto Seguro? Quero repetir.', ok: false, why: 'Vocês nunca pescaram em Porto Seguro. Ela inventou uma lembrança para soar bonito. Lembrança de verdade, só você tem.' },
    { t: 'Você é o farol que ilumina a minha jornada.', ok: false, why: 'Ninguém fala assim. Muito menos você. Frase de cartão entrega que foi máquina que escreveu.' },
    { t: 'Domingo, churrasco aqui em casa? A carne é por minha conta.', ok: true },
  ];
  const MEMORIAS = [
    { id: 'domino', t: 'Ainda te devo a revanche do dominó.' },
    { id: 'fusca', t: 'Lembra do fusca do pai, que a gente empurrava toda segunda?' },
    { id: 'nadar', t: 'Foi você que me ensinou a nadar. Nunca te agradeci.' },
  ];

  // ------------------------------------------------------------------
  // Estilos do capítulo
  // ------------------------------------------------------------------
  const CSS = `
  .c8-board { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 18px 16px 16px;
    border-radius: 18px; border: 7px solid #a8744c; box-shadow: inset 0 2px 10px rgba(60, 35, 10, 0.35);
    background-color: #c9a074; background-image: radial-gradient(rgba(90, 55, 25, 0.22) 1px, transparent 1.5px), radial-gradient(rgba(255, 240, 210, 0.18) 1px, transparent 1.5px);
    background-size: 9px 9px, 13px 13px; background-position: 0 0, 4px 6px; }
  @media (max-width: 700px) { .c8-board { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px 10px 10px; border-width: 5px; } }
  .c8-post { position: relative; font: inherit; text-align: left; color: #2b2416; border: 0; cursor: pointer;
    border-radius: 3px 3px 16px 3px; padding: 14px 12px 10px; min-height: 112px; display: flex; flex-direction: column; gap: 6px;
    box-shadow: 0 7px 12px rgba(60, 35, 10, 0.3), inset 0 -14px 18px rgba(0, 0, 0, 0.05); transform: rotate(var(--r, 0deg));
    transition: transform 0.12s, box-shadow 0.12s; }
  .c8-post::before { content: ''; position: absolute; top: -7px; left: 50%; width: 15px; height: 15px; margin-left: -7px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #ff9a7a, #c8342a 70%); box-shadow: 0 2px 3px rgba(0, 0, 0, 0.4); }
  .c8-post:hover:not(:disabled), .c8-post:focus-visible { transform: rotate(0deg) translateY(-3px) scale(1.03); box-shadow: 0 12px 20px rgba(60, 35, 10, 0.35); }
  .c8-post:disabled { cursor: default; }
  .c8-post .c8-pic { font-size: 1.55em; line-height: 1; }
  .c8-post b { font-family: var(--head); font-weight: 800; font-size: 0.94em; line-height: 1.22; }
  .c8-post .c8-pfoot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 0.8em; }
  .c8-post.feito { filter: saturate(0.75); }
  .c8-post.feito b { text-decoration: line-through; text-decoration-color: rgba(60, 40, 20, 0.55); text-decoration-thickness: 2px; }
  .c8-post .stars { font-size: 1.05em; }
  .c8-kbd { display: inline-grid; place-items: center; min-width: 1.6em; height: 1.6em; padding: 0 4px; border-radius: 6px; background: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(0, 0, 0, 0.12); font-family: var(--head); font-weight: 800; font-size: 0.72em; color: #5d6478; }
  .c8-total { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
  .c8-total .c8-tnum { font-family: var(--head); font-size: 1.15em; }
  .c8-sit { background: #fffbea; border: 1px solid #f0dfa0; border-left: 7px solid var(--cor, #f5a524); border-radius: 12px; padding: 10px 14px; line-height: 1.45; }
  .c8-opts { display: flex; flex-direction: column; gap: 10px; }
  .c8-opt { display: flex; gap: 10px; align-items: flex-start; }
  .c8-opt .c8-q { flex: 1 1 auto; }
  .c8-opt .c8-q::before { content: '“'; } .c8-opt .c8-q::after { content: '”'; }
  .c8-opt .c8-kbd { margin-top: 2px; flex: 0 0 auto; background: var(--card2); }
  .c8-res { display: flex; flex-direction: column; gap: 10px; animation: c8in 0.3s ease-out; }
  @keyframes c8in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .c8-score { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .c8-score .stars { font-size: 1.5em; margin-right: 4px; }
  .c8-crit { font-family: var(--head); font-size: 0.76em; font-weight: 800; padding: 4px 10px; border-radius: 99px; white-space: nowrap; }
  .c8-crit.ok { background: var(--mint-l); color: #12684b; }
  .c8-crit.no { background: var(--red-l); color: #9a1d22; }
  .c8-ans { display: flex; gap: 10px; align-items: flex-start; }
  .c8-ans .avatar { margin-top: 4px; }
  .c8-bub { flex: 1 1 auto; min-width: 0; background: #fff; border: 1px solid var(--line); border-radius: 18px 18px 18px 6px; padding: 10px 14px;
    line-height: 1.45; box-shadow: 0 2px 8px rgba(10, 20, 50, 0.06); }
  .c8-bub .c8-who { font-family: var(--head); font-weight: 800; font-size: 0.74em; letter-spacing: 0.06em; text-transform: uppercase; color: #d9481e; margin-bottom: 2px; }
  .c8-bub .line.li { padding-left: 1.1em; text-indent: -0.8em; } .c8-bub .line.li::before { content: '• '; color: #d9481e; }
  .c8-best { border: 2px solid var(--mint); background: #f2fbf7; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px; animation: c8in 0.3s ease-out; }
  .c8-best .c8-bq { background: #fff; border: 1px dashed #8fd8bb; border-radius: 12px; padding: 8px 12px; font-style: italic; line-height: 1.45; }
  .c8-nota { font-size: 0.8em; color: var(--muted); margin-top: 6px; font-style: italic; }
  .c8-phone .inner { padding: 6px 14px 10px; }
  .c8-cfg { display: grid; gap: 14px; grid-template-columns: 1fr; align-items: start; }
  @media (min-width: 760px) { .c8-cfg { grid-template-columns: minmax(0, 390px) minmax(0, 1fr); } .c8-cfg .mg-phone { margin: 0; } }
  .c8-cfg-side .mg-actions { justify-content: flex-start; }
  .c8-phead { display: flex; align-items: baseline; gap: 6px; padding: 8px 0 10px; border-bottom: 1px solid var(--line); font-family: var(--head); }
  .c8-phead small { color: var(--muted); font-size: 0.8em; }
  .c8-set { display: flex; align-items: center; gap: 12px; width: 100%; font: inherit; text-align: left; color: var(--text); background: transparent;
    border: 0; border-bottom: 1px solid var(--line); padding: 12px 2px; cursor: pointer; line-height: 1.3; border-radius: 10px; }
  .c8-set:hover { background: #f6f7fb; }
  .c8-set .c8-tx { flex: 1 1 auto; min-width: 0; }
  .c8-set .c8-tx b { font-family: var(--head); font-size: 0.95em; }
  .c8-set small { display: block; color: var(--muted); font-size: 0.8em; margin-top: 2px; }
  .c8-sw { position: relative; flex: 0 0 auto; width: 54px; height: 32px; border-radius: 99px; background: #cfd5e3; transition: background 0.18s; }
  .c8-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 26px; height: 26px; border-radius: 50%; background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: transform 0.18s; }
  .c8-sw.on { background: var(--mint); } .c8-sw.on::after { transform: translateX(22px); }
  .c8-tmp { flex: 0 0 auto; font-family: var(--head); font-weight: 800; font-size: 0.78em; padding: 6px 12px; border-radius: 99px; background: #eef1f8; color: #24468f; }
  .c8-tmp.on { background: var(--blue); color: #fff; }
  .c8-draft { display: flex; flex-direction: column; gap: 2px; }
  .c8-draft .mg-line { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; }
  .c8-draft .mg-line .c8-pen { margin-left: auto; opacity: 0.35; flex: 0 0 auto; }
  .c8-draft .mg-line.riscada { color: #9aa1b4; background: #fff4f4; border-color: #f3b0b2; }
  .c8-draft .mg-line.riscada .c8-lt { text-decoration: line-through; text-decoration-color: #e5484d; text-decoration-thickness: 3px; }
  .c8-draft .mg-line.riscada .c8-pen { opacity: 1; }
  .c8-wa { background: #e7f8dc; border-radius: 16px 16px 4px 16px; padding: 10px 12px; margin-left: auto; max-width: 96%; line-height: 1.45; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }
  .c8-wa .c8-wat { display: block; text-align: right; font-size: 0.72em; color: #5e8a5a; margin-top: 4px; }
  .c8-wa .c8-mine { background: #fff3c4; border-radius: 4px; padding: 0 3px; }
  `;

  // ------------------------------------------------------------------
  // Peças de interface
  // ------------------------------------------------------------------
  function kbd(api, k) { return api.el('span', 'c8-kbd', String(k)); }
  function bolha(api, texto, quem, nota) {
    const b = api.el('div', 'c8-bub', [api.el('div', 'c8-who', quem || 'Faísca respondeu'), api.rich(api.t(texto))]);
    if (nota) b.appendChild(api.el('div', 'c8-nota', nota));
    return api.el('div', 'c8-ans', [api.el('span', 'avatar'), b]);
  }
  function chipsCrit(api, crit) {
    return CRIT.map((c, i) => api.el('span', 'c8-crit ' + (crit[i] ? 'ok' : 'no'), (crit[i] ? '✔ ' : '✗ ') + c.ic + ' ' + c.t));
  }
  const scrollTo = (node) => { try { node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ok */ } };

  /** O mural de recados: escolhe a próxima missão (ou fecha, quando tudo estiver feito). */
  function mural(G, feitas, final) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap8', CSS);
      const el = api.el;
      const total = Object.keys(feitas).reduce((a, k) => a + feitas[k], 0);
      if (final) api.say('Mural completo. *' + total + ' de ' + MAX + ' estrelas.* ' + (total === MAX ? 'Pedido nota 10 em tudo!' : total >= 13 ? 'Muito bom. E as versões nota 10 você já viu.' : 'O que vale é que você viu como pedir melhor.'), 'faisca');
      else api.say('Escolha um recado do mural. A ordem é sua.', 'faisca');
      const board = el('div', 'c8-board');
      MISSOES.forEach((m, i) => {
        const done1 = feitas[m.id] != null;
        const b = el('button', 'c8-post' + (done1 ? ' feito' : ''), [
          el('span', 'c8-pic', m.icon),
          el('b', null, api.t(m.post)),
          el('span', 'c8-pfoot', [done1 ? api.stars(feitas[m.id], 3) : el('span', 'mg-small', 'a fazer'), done1 ? el('span', null, '✔') : kbd(api, i + 1)]),
        ]);
        b.type = 'button';
        b.style.background = m.cor;
        b.style.setProperty('--r', m.rot + 'deg');
        if (done1 || final) b.disabled = true;
        else {
          b.dataset.key = String(i + 1);
          b.addEventListener('click', () => { api.sfx('select'); done(m.id); });
        }
        board.appendChild(b);
      });
      root.appendChild(board);
      const tot = el('div', 'c8-total', [el('span', 'mg-label', 'Estrelas da noite'), el('b', 'c8-tnum', '⭐ ' + total + ' / ' + MAX)]);
      root.appendChild(tot);
      if (final) root.appendChild(el('div', 'mg-actions', api.btn('Fechar o mural ▶', () => done('fim'), { cls: 'primary', key: '1' })));
    }, { title: final ? '📌 Mural de recados: tudo feito' : '📌 Mural de recados', size: 'l' });
  }

  /** Uma missão: três jeitos de pedir → estrelas, a resposta que o pedido merece e, se preciso, o pedido nota 10. */
  function missao(G, m, num) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap8', CSS);
      const el = api.el;
      const R = (s) => api.rich(api.t(s), true);
      api.say(m.intro, 'faisca');
      const top = el('div', 'mg-row', [el('span', 'mg-badge', 'Missão ' + num + ' de 6'), el('span', 'mg-label', 'O que você sabe')]);
      root.appendChild(top);
      const sit = el('div', 'c8-sit', R(m.sit));
      sit.style.setProperty('--cor', m.cor);
      root.appendChild(sit);
      root.appendChild(el('div', 'mg-label', 'Como você pede?'));
      const lista = el('div', 'c8-opts');
      const ops = api.shuffle(m.opcoes);
      const botoes = ops.map((o, i) => {
        const b = el('button', 'mg-card c8-opt', [kbd(api, i + 1), el('span', 'c8-q', R(o.txt))]);
        b.type = 'button';
        b.dataset.key = String(i + 1);
        b.addEventListener('click', () => escolher(o, b));
        lista.appendChild(b);
        return b;
      });
      root.appendChild(lista);
      const res = el('div', 'c8-res');
      res.hidden = true;
      root.appendChild(res);
      let escolhido = null;

      function escolher(o, b) {
        if (escolhido) return;
        escolhido = o;
        const s = nStars(o);
        botoes.forEach((x) => { x.disabled = true; if (x !== b) x.classList.add('dim'); });
        b.classList.add(s === 3 ? 'ok' : s === 0 ? 'bad' : 'on');
        api.sfx(s === 3 ? 'success' : s >= 1 ? 'star' : 'cancel');
        res.hidden = false;
        res.appendChild(el('div', 'c8-score', [api.stars(s, 3)].concat(chipsCrit(api, o.crit))));
        res.appendChild(el('div', 'mg-feedback ' + (s === 3 ? 'ok' : s === 2 ? 'info' : s === 1 ? 'warn' : 'bad'), R((s === 3 ? '*Pedido nota 10.* ' : '') + o.why)));
        res.appendChild(bolha(api, o.ans, null, o.nota));
        const acts = el('div', 'mg-actions');
        res.appendChild(acts);
        if (s < 3) {
          acts.appendChild(api.btn('Ver o pedido nota 10 ✨', () => { acts.remove(); mostrarMelhor(); }, { cls: 'primary', key: '1' }));
        } else fechar();
        api.say(s === 3 ? 'Três estrelas. Com isso tudo, eu nem precisei adivinhar.' : s === 2 ? 'Duas estrelas. Quase lá: veja o que faltou.' : s === 1 ? 'Uma estrela. Funciona, mas dá para pedir bem melhor.' : 'Nenhuma estrela. Esse pedido eu não consigo salvar sozinha.', 'faisca');
        api.timeout(() => scrollTo(res), 60);
      }
      function mostrarMelhor() {
        const best = melhor(m);
        const box = el('div', 'c8-best', [
          el('div', 'mg-label', '✨ O pedido nota 10'),
          el('div', 'c8-bq', R(best.txt)),
          bolha(api, best.ans, 'E a resposta', best.nota),
        ]);
        res.appendChild(box);
        api.sfx('page');
        api.say('Repare na diferença. Mesmo assunto; o que mudou foi o pedido.', 'faisca');
        fechar();
        api.timeout(() => scrollTo(box), 60);
      }
      function fechar() {
        res.appendChild(el('div', 'mg-hint', R('✔ *A sua parte:* ' + m.sua)));
        const acts = el('div', 'mg-actions');
        if (m.caneta) acts.appendChild(api.btn('Revisar o rascunho com a caneta ✍️', () => caneta(), { cls: 'primary', key: '1' }));
        else acts.appendChild(api.btn('Continuar ▶', () => done({ estrelas: nStars(escolhido) }), { cls: 'primary', key: '1' }));
        res.appendChild(acts);
      }

      // --- Caneta vermelha (só no recado para o Beto)
      function caneta() {
        root.innerHTML = '';
        api.sfx('page');
        api.say('Com o pedido nota 10, ela devolveu este rascunho. *Toque no que não é seu* para riscar.', 'faisca');
        root.appendChild(el('div', 'mg-label', 'Rascunho da Faísca · mensagem para o Beto'));
        const doc = el('div', 'mg-doc c8-draft');
        const fb = el('div', 'mg-feedback info', 'Duas frases não são suas. Ache as duas.');
        let riscadas = 0;
        const linhasDraft = [];
        RASCUNHO_BETO.forEach((ln, i) => {
          const b = el('button', 'mg-line', [kbd(api, i + 1), el('span', 'c8-lt', ln.t), el('span', 'c8-pen', '✍️')]);
          b.type = 'button';
          b.dataset.key = String(i + 1);
          b.addEventListener('click', () => {
            if (b.classList.contains('riscada')) return;
            if (ln.ok) {
              api.sfx('blip');
              fb.className = 'mg-feedback ok';
              fb.textContent = 'Essa é sua: fica. Foi você que contou isso para ela.';
              return;
            }
            b.classList.add('riscada');
            b.disabled = true;
            riscadas++;
            api.sfx('confirm');
            fb.className = 'mg-feedback warn';
            fb.textContent = '✍️ Riscado. ' + ln.why;
            if (riscadas === 2) {
              linhasDraft.forEach((x) => { x.disabled = true; });
              api.timeout(lembranca, 650);
            }
          });
          linhasDraft.push(b);
          doc.appendChild(b);
        });
        root.appendChild(doc);
        root.appendChild(fb);
      }
      function lembranca() {
        api.say('Riscou as duas. Agora, no lugar da lembrança inventada, uma *de verdade*, sua:', 'faisca');
        const box = el('div', 'mg-col');
        box.appendChild(el('div', 'mg-label', 'Uma lembrança sua'));
        MEMORIAS.forEach((mem, i) => {
          const b = el('button', 'mg-card c8-opt', [kbd(api, i + 6), el('span', null, mem.t)]);
          b.type = 'button';
          b.dataset.key = String(i + 6);
          b.addEventListener('click', () => final(mem));
          box.appendChild(b);
        });
        root.appendChild(box);
        api.timeout(() => scrollTo(box), 60);
      }
      function final(mem) {
        root.innerHTML = '';
        api.sfx('success');
        api.say('Pronto. Organizado por mim, escrito por você. Agora a decisão de mandar é sua.', 'faisca');
        const linhas = RASCUNHO_BETO.filter((l) => l.ok).map((l) => l.t);
        linhas.splice(2, 0, '\u0000' + mem.t);
        const wa = el('div', 'c8-wa');
        linhas.forEach((l, i) => {
          if (i) wa.appendChild(el('br'));
          if (l.charAt(0) === '\u0000') wa.appendChild(el('span', 'c8-mine', l.slice(1)));
          else wa.appendChild(document.createTextNode(l));
        });
        wa.appendChild(el('span', 'c8-wat', 'rascunho · ainda não enviado'));
        const phone = el('div', 'mg-phone', el('div', 'inner', [el('div', 'mg-label', 'Para: Beto 🧔'), wa]));
        root.appendChild(phone);
        root.appendChild(el('div', 'mg-hint', R('✔ *A sua parte:* ' + m.sua)));
        root.appendChild(el('div', 'mg-actions', api.btn('Pronto ▶', () => done({ estrelas: nStars(escolhido), memoria: mem.id }), { cls: 'primary', key: '1' })));
      }
    }, { title: m.icon + ' ' + m.titulo, size: 'l' });
  }

  /** A conta pessoal, configurada com {filho}. */
  function configurar(G) {
    return G.mini((root, done, api) => {
      P2.ui.css('cap8', CSS);
      const el = api.el;
      const st = { treino: true, memoria: true, temp: false, mexeu: false };
      api.say('Toque na primeira chave. É ela que decide se as suas conversas podem ser usadas para treinar a IA.', 'filho');
      const inner = el('div', 'inner');
      inner.appendChild(el('div', 'c8-phead', ['⚙️', el('b', null, 'Controles de dados')]));
      function linha(k, titulo, sub, extra) {
        const b = el('button', 'c8-set', [kbd(api, k), el('span', 'c8-tx', [el('b', null, titulo), el('small', null, sub)]), extra]);
        b.type = 'button';
        b.dataset.key = String(k);
        inner.appendChild(b);
        return b;
      }
      const sw1 = el('span', 'c8-sw on');
      const sw2 = el('span', 'c8-sw on');
      const tmp = el('span', 'c8-tmp', 'Abrir');
      const b1 = linha(1, 'Melhorar o modelo para todos', 'Ligada: as suas conversas podem ajudar a treinar a IA.', sw1);
      const b2 = linha(2, 'Memória', 'Ela lembra o que você contou em outras conversas. Dá para ver e apagar.', sw2);
      const b3 = linha(3, 'Chat temporário', 'Não fica no histórico e não treina a IA. Bom para assunto delicado.', tmp);
      const fb = el('div', 'mg-feedback info', 'Em cada aplicativo o nome muda um pouco, mas essas três opções quase sempre existem.');
      const ok = api.btn('Pronto ▶', () => done({ treinoOff: !st.treino, memoria: st.memoria, temp: st.temp }), { cls: 'primary', key: '4' });
      ok.disabled = true;
      const lado = el('div', 'mg-col c8-cfg-side', [
        el('div', 'mg-hint', api.rich(api.t('*Conta pessoal:* coisa de casa. *Ferramenta da empresa:* contrato, ata, número do conselho.'), true)),
        fb,
        el('div', 'mg-actions', ok),
      ]);
      root.appendChild(el('div', 'c8-cfg', [el('div', 'mg-phone c8-phone', inner), lado]));
      b1.addEventListener('click', () => {
        st.treino = !st.treino; st.mexeu = true;
        sw1.classList.toggle('on', st.treino);
        api.sfx(st.treino ? 'blip' : 'confirm');
        if (!st.treino) {
          fb.className = 'mg-feedback ok';
          fb.textContent = 'Desligada. Daqui para a frente, as suas conversas não treinam o modelo.';
          api.say('Isso. Agora dá uma olhada nas outras duas, se quiser. Depois é só tocar em "Pronto".', 'filho');
        } else {
          fb.className = 'mg-feedback warn';
          fb.textContent = 'Ligada de novo. Você que manda; só lembre que, assim, o que você escreve pode ajudar a treinar a IA.';
        }
        ok.disabled = false;
      });
      b2.addEventListener('click', () => {
        st.memoria = !st.memoria;
        sw2.classList.toggle('on', st.memoria);
        api.sfx('blip');
        fb.className = 'mg-feedback info';
        fb.textContent = st.memoria ? 'Memória ligada: prático no dia a dia. Dá para ver e apagar o que ela guardou.' : 'Memória desligada: cada conversa começa do zero. Questão de gosto.';
      });
      b3.addEventListener('click', () => {
        st.temp = true;
        tmp.classList.add('on');
        tmp.textContent = 'Aberto';
        api.sfx('pop');
        fb.className = 'mg-feedback ok';
        fb.textContent = 'Chat temporário aberto: é esse que vale para o exame. E nada de senha, documento ou cartão, em chat nenhum.';
      });
    }, { title: '📱 A sua conta pessoal', size: 'm' });
  }

  // ------------------------------------------------------------------
  // Reações em 3D depois de cada missão (a parte que é dele)
  // ------------------------------------------------------------------
  const REACAO = {
    async conta(G) {
      G.sfx('notify');
      await G.narrate('Ele abre o aplicativo da distribuidora. Histórico de consumo… e, ao lado de setembro, duas palavras: *leitura estimada*.');
      await G.say('pai', 'Estimada! Nem leram o medidor. Isso não é conta, é palpite.', { expr: 'bravo' });
      await G.say('faisca', 'Aí não é comigo: quem corrige é a distribuidora. Mas agora você sabe exatamente o que pedir.', { anim: 'teach' });
      await G.say('pai', 'Amanhã eu peço a revisão. Trinta anos pagando conta e nunca tinha olhado esse campo.', { expr: 'pensativo' });
    },
    async viagem(G) {
      await G.say('pai', '(lendo baixinho) Serra… trilha sábado cedo… cochilo depois do almoço. Hum.', { expr: 'pensativo' });
      await G.say('filho', 'Ouvi "trilha"?', { cam: false, expr: 'surpreso' });
      await G.say('pai', 'Ouviu errado. Lava a louça.', { expr: 'rindo' });
      const v = await G.choose([
        { text: 'Pedir para a Faísca reservar: passo o cartão para ela', value: 'cartao' },
        { text: 'Conferir no site oficial da pousada e pagar lá', value: 'site' },
      ], { prompt: 'E a reserva?', who: 'pai' });
      G.v.reserva = v;
      if (v === 'cartao') {
        G.faisca.emote('!', 1.2);
        await G.say('faisca', 'Opa, opa! Número de cartão não vem para o chat. Nem para mim, nem para ninguém.', { anim: 'scared' });
        await G.say('faisca', 'Eu planejo e comparo. Reservar e pagar é no site oficial, com você no comando.', { anim: 'teach' });
        await G.say('pai', 'Justo. Se é para gastar, quem gasta sou eu.', { expr: 'rindo' });
      } else {
        await G.say('faisca', 'Isso. Eu planejo; você confere no site oficial e paga lá. Cartão nunca vem para o chat.', { anim: 'celebrate' });
      }
    },
    async exame(G) {
      await G.say('pai', 'Quinta-feira eu levo essas perguntas para o doutor.', { expr: 'pensativo' });
      await G.say('faisca', 'Leve. O que ele disser vale mais do que qualquer coisa que eu disse. Eu ajudo a perguntar; quem responde é o médico.', { anim: 'teach' });
    },
    async beto(G) {
      await G.say('faisca', 'E desculpa pela pescaria em Porto Seguro. Quando falta história, às vezes eu invento uma para ficar bonito.', { anim: 'ashamed' });
      await G.say('pai', 'Por isso a caneta fica comigo.', { expr: 'desconfiado' });
      const v = await G.choose([
        { text: 'Mandar a mensagem agora', value: 'msg' },
        { text: 'Melhor ligar para ele agora', value: 'ligar', sub: 'A mensagem vira o roteiro da conversa.' },
      ], { prompt: 'Está pronta. E agora?', who: 'pai' });
      G.v.beto = v;
      const mem = G.v.memoria;
      const fecho = mem === 'domino' ? 'E traz o dominó: a revanche está de pé.' : mem === 'fusca' ? 'Vou procurar a foto do fusca.' : 'E traz {oa} {filho}. Faz tempo.';
      if (v === 'msg') {
        G.sfx('whoosh');
        await G.wait(1.0);
        G.sfx('notify');
        G.toast('Beto: Domingo, então. ' + fecho + ' 🙂', { icon: '💬', kind: 'notif', dur: 6 });
        await G.wait(1.4);
        await G.think('pai', 'Respondeu em dois minutos. Do jeito dele, isso é um abraço.');
      } else {
        const tom = G.sfx('phone_ring', { loop: true });
        await G.wait(1.6);
        if (tom) tom.stop();
        await G.say(BETO, 'Alô? Aconteceu alguma coisa?');
        await G.say('pai', 'Aconteceu. Eu fui um irmão ruim no sábado. Desculpa, Beto.', { expr: 'sem_graca' });
        await G.say(BETO, '… Fazia tempo que você não me ligava.');
        await G.say('pai', 'Domingo. Churrasco aqui. A carne é por minha conta.', { expr: 'amigavel' });
        await G.say(BETO, 'Combinado, irmão. ' + fecho);
      }
      bg(G.faisca.play('celebrate', 1.4));
      await G.say('faisca', 'Eu ajudei a organizar. Mas quem ele respondeu foi você.');
    },
    async presente(G) {
      const v = await G.choose([
        { text: 'O caderno de receitas da família, escrito por mim', value: 'caderno' },
        { text: 'A aula de cozinha para nós dois', value: 'aula' },
        { text: 'O disco de vinil: a vitrola da sala volta a tocar', value: 'vinil' },
        { text: 'Nenhuma dessas. Tive uma ideia minha.', value: 'minha' },
      ], { prompt: 'Qual você escolhe?', who: 'pai' });
      G.v.presente = v;
      if (v === 'caderno') await G.say('pai', 'O caderno. Com a minha letra feia mesmo.', { expr: 'orgulhoso' });
      else if (v === 'aula') await G.say('pai', 'A aula. Assim eu também aprendo alguma coisa que não seja planilha.', { expr: 'rindo' });
      else if (v === 'vinil') await G.say('pai', 'O vinil. E o disco quem escolhe sou eu.', { expr: 'orgulhoso' });
      else {
        await G.say('pai', 'A trilha que eu fazia com o meu pai. Vou levar {oa} {filho} lá.', { expr: 'amigavel' });
        await G.say('pai', 'Essa nenhuma lista ia saber.', { expr: 'orgulhoso' });
      }
      bg(G.faisca.play('celebrate', 1.4));
      await G.say('faisca', v === 'minha' ? 'Nenhuma mesmo. Eu dou as opções; quem conhece {filho} é você.' : 'Eu dei as opções. Quem conhece {filho} é você.');
    },
  };

  function totalEstrelas(G) {
    const e = G.v.estrelas || {};
    return MISSOES.reduce((a, m) => a + (e[m.id] || 0), 0);
  }
  function hudEstrelas(G, relogio) {
    const o = { score: { label: '⭐ Estrelas', value: totalEstrelas(G) + '/' + MAX } };
    if (relogio) o.clock = relogio;
    G.hud.set(o);
  }
  function reagir(G, s) {
    if (s === 3) { bg(G.faisca.play('celebrate', 1.3)); G.fx.sparkles(G.faisca); }
    else if (s === 2) bg(G.faisca.play('jump', 0.9));
    else bg(G.faisca.play('think', 1.2));
  }

  P2.chapter({
    id: 'cap8',
    num: 'Capítulo 8',
    title: 'Coisas da Casa',
    subtitle: 'A geladeira, a conta de luz, o irmão… e uma ajudante paciente',
    music: 'casa',
    minutes: 10,
    parts: [
      // ------------------------------------------------------------------
      // 1. Cozinha, 19h30: chegar cedo, a geladeira e o jantar
      // ------------------------------------------------------------------
      async (G) => {
        await G.titleCard();
        G.scene('cozinha', { time: 'noite', steam: false });
        G.hud.set({ clock: '19:30' });
        G.filho.at('mesa1').setAnim('sitlookphone');
        G.filho.setExpr('neutro');
        G.pai.at('porta').setAnim('idle');
        G.player.cine();
        await G.cam.shot({ target: [1.2, 1.0, 0.6], yaw: -0.55, pitch: 0.22, dist: 6.4, fov: 38 }, 0);
        G.music('casa');
        G.sfx('door');
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          bg(G.pai.walk({ x: 1.55, z: 1.15 }, 0.9));
          bg(G.cam.shot({ target: [1.0, 1.0, 0.4], yaw: -0.35, pitch: 0.18, dist: 5.2, fov: 38 }, 6));
          await G.narrate('19h30. Pela primeira vez em meses, {pai} chega em casa antes do jantar.');
          await G.narrate('O jantar é que ainda não chegou.');
        });
        await G.fadeOut(0.35);
        G.pai.at({ x: 1.55, z: 1.15, rot: -2.4 }).setAnim('idle');
        G.player.fp();
        G.filho.setAnim('sit');
        G.filho.lookAt(G.pai);
        await G.fadeIn(0.45);
        G.player.lookAt('filho');
        await G.say('filho', '{apelido}?! Antes das oito? Aconteceu alguma coisa?', { expr: 'surpreso' });
        await G.say('pai', 'Aconteceu. Pela primeira vez, o dia acabou antes de mim.', { expr: 'orgulhoso' });
        await G.say('filho', 'E a Faísca? Sobreviveu a você?', { expr: 'rindo' });
        const st = G.allStats();
        const erro = (st.cap6 && st.cap6.erroPego) ? 'Errou uma conta de margem. Eu peguei.'
          : (st.cap3 && st.cap3.citacaoErradaPega) ? 'Trocou a multa de um contrato. Eu peguei.'
            : 'Errou. E eu peguei.';
        await G.say('pai', erro + ' Mas também me poupou umas boas horas. Não espalha.', { expr: 'desconfiado' });
        G.faisca.at('faisca');
        G.faisca.follow(G.pai);
        G.sfx('sparkle');
        G.fx.sparkles(G.faisca, null, null, 14);
        await G.say('faisca', 'Confirmo as duas coisas. Ele confere tudo. É até um pouco assustador.', { anim: 'ashamed' });
        await G.say('filho', 'E o jantar? A geladeira está com cara de fim de mês. Eu ia pedir pizza de novo.', { expr: 'sem_graca' });
        await G.say('pai', 'De novo, não. Deixa eu ver o que tem aí.', { expr: 'determinado' });
        G.filho.lookAt(null);
        G.filho.setAnim('sitlookphone');

        await G.explore({
          objetivo: 'Veja o que tem na geladeira',
          hotspots: [
            {
              id: 'mural', label: 'Mural de recados', icon: '📌', at: 'mural', optional: true,
              onInteract: async (G) => {
                await G.think('pai', '"Conta de luz: vence sexta." "Exame: o resultado saiu." E, na letra {doda} {filho}: "Liga pro tio Beto?"');
                await G.think('pai', 'Coisas da casa. Também não se resolvem sozinhas.');
              },
            },
            {
              id: 'filtro', label: 'Filtro de barro', icon: '💧', at: 'filtro', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'O filtro de barro da minha mãe. Nunca precisou de atualização.');
                await G.say('faisca', 'Respeito. Esse aí nunca inventou nada.', { anim: 'ashamed' });
              },
            },
            { id: 'geladeira', label: 'Abrir a geladeira', icon: '🧊', at: 'geladeira' },
          ],
        });
        G.pai.at('geladeira');
        G.sfx('pop');
        await G.think('pai', 'Meio frango assado, três ovos, uma abobrinha, dois tomates, um pedaço de queijo minas, arroz de ontem… e uma cebola com cara de veterana.');
        await G.say('pai', 'Isso aqui não é jantar. É inventário.', { expr: 'desconfiado' });
        await G.say('faisca', 'É o meu tipo favorito de problema: risco zero. Se der errado, vira omelete.', { anim: 'jump' });
        await G.say('faisca', 'Em casa vale a mesma receita do escritório. Cada pedido pode ganhar três estrelas: *contexto* (o que eu preciso saber), *pedido claro* (o que você quer e em que formato)…', { anim: 'teach' });
        await G.say('faisca', '… e *cuidado*: nada de dado sensível à toa, e o que é decisão sua continua sendo sua.', { anim: 'teach' });
        G.v.estrelas = {};
        const r1 = await missao(G, BY_ID.jantar, 1);
        G.v.estrelas = { jantar: r1.estrelas };
        G.save();
        hudEstrelas(G);
        reagir(G, r1.estrelas);
        const prato = await G.choose([
          { text: 'Arroz de frigideira', value: 'arroz', sub: '25 minutos. Aproveita tudo.' },
          { text: 'Omelete recheada', value: 'omelete', sub: '15 minutos. A fome está grande.' },
        ], { prompt: 'Qual das duas?', who: 'pai' });
        G.v.prato = prato;
        bg(G.faisca.play('jump', 0.8));
        await G.say('pai', prato === 'arroz' ? 'Arroz de frigideira. Mas o tempero é por minha conta.' : 'Omelete. Mas o tempero é por minha conta.', { expr: 'determinado' });
        await G.say('filho', 'Você vai cozinhar?!', { cam: false, expr: 'surpreso' });
        await G.say('pai', 'Eu sei cozinhar. O que eu não tinha era tempo.', { expr: 'orgulhoso' });

        // Cozinhando (plano de cinema)
        await G.fadeOut(0.5);
        G.sceneParams({ steam: true });
        G.hud.set({ clock: '19:55' });
        G.faisca.unfollow();
        G.faisca.at({ x: 0.95, z: -1.05, rot: 3.6 });
        G.faisca.set({ y: 1.25 });
        G.faisca.setAnim('idle');
        G.pai.at('fogao').setAnim('idle');
        G.filho.setAnim('sit');
        G.filho.lookAt(G.pai);
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot({ target: [0.3, 1.15, -1.25], yaw: 0.95, pitch: 0.16, dist: 3.3, fov: 40 }, 0);
        await G.fadeIn(0.6);
        await G.cutscene(async () => {
          bg(G.cam.shot({ target: [0.3, 1.1, -1.25], yaw: 1.15, pitch: 0.14, dist: 2.9, fov: 40 }, 6));
          G.sfx('coffee');
          await G.narrate(prato === 'arroz' ? 'Vinte e cinco minutos depois, a cozinha cheira a cebola dourada.' : 'Quinze minutos depois, a cozinha cheira a ovo, queijo e cebola dourada.');
          await G.narrate('Fazia tempo que ele não cozinhava. Não esqueceu nada.');
        });
        await G.fadeOut(0.5);

        // À mesa
        G.talkCam(true);
        G.sceneParams({ steam: false });
        G.hud.set({ clock: '20:10' });
        G.filho.at('mesa1').setAnim('sit');
        G.filho.lookAt(G.pai);
        G.pai.at('mesa4').setAnim('sit');
        G.faisca.at('faisca');
        G.faisca.follow(G.pai);
        G.player.fp();
        await G.fadeIn(0.5);
        G.player.lookAt('filho');
        await G.say('filho', 'Ficou bom! A receita é dela ou sua?', { expr: 'feliz' });
        await G.say('pai', 'A ideia foi dela. O sal, a pimenta e o "tira esse queijo daí" foram meus.', { expr: 'orgulhoso' });
        await G.say('faisca', 'Pode riscar à vontade. Eu não fico ofendida.', { anim: 'celebrate' });
        await G.fadeOut(0.6);
      },

      // ------------------------------------------------------------------
      // 2. Cozinha, 20h15: a conta pessoal e o mural de recados
      // ------------------------------------------------------------------
      async (G) => {
        G.scene('cozinha', { time: 'noite', steam: false });
        G.music('casa');
        G.filho.at('mesa1').setAnim('sit').set({ props: { mug: true } });
        G.filho.setExpr('feliz');
        G.filho.lookAt(G.pai);
        G.pai.at('mesa4').setAnim('sit');
        G.faisca.at('faisca');
        G.faisca.follow(G.pai);
        const e0 = G.v.estrelas || {};
        G.v.estrelas = e0.jantar != null ? { jantar: e0.jantar } : {};
        hudEstrelas(G, '20:15');
        G.player.fp();
        await G.fadeIn(0.6);
        G.player.lookAt('filho');
        await G.say('pai', 'Agora, o resto do mural: a conta de luz, o exame, a viagem que a gente vive adiando…', { expr: 'pensativo' });
        await G.say('filho', 'E o tio Beto?', { expr: 'preocupado' });
        await G.say('pai', 'E o Beto. E mais uma coisa que não é da sua conta.', { expr: 'desconfiado' });
        await G.say('filho', 'Agora fiquei curios{oa}.', { expr: 'rindo' });
        await G.say('pai', 'Antes: exame, conta, coisa de família… Isso tudo vai parar onde?', { expr: 'desconfiado' });
        await G.say('filho', 'Pergunta de CEO. Me empresta o celular: vamos arrumar a sua conta pessoal.', { expr: 'orgulhoso' });
        await G.say('filho', 'Só uma regra antes: coisa da empresa, como contrato e material do conselho, não entra aqui nem com tudo desligado. Isso é na ferramenta da empresa.', { expr: 'determinado' });
        bg(G.filho.play('sitlookphone', 1.4));
        const cfg = await configurar(G);
        G.v.treinoOff = !!cfg.treinoOff;
        G.faisca.emote(cfg.treinoOff ? 'check' : '...', 1.4);
        G.v.tempChat = !!cfg.temp;
        G.save();
        await G.say('filho', 'E essas regras mudam. De vez em quando a gente confere de novo, que nem extrato do banco.', { expr: 'amigavel' });
        await G.say('pai', 'Extrato eu confiro todo mês.', { expr: 'orgulhoso' });
        await G.fact('privacidade_config');
        if (G.flag('aposta')) await G.say('filho', 'Enquanto você trabalha, eu lavo a louça. Para treinar… caso eu perca a aposta.', { expr: 'rindo' });
        else await G.say('filho', 'Enquanto você trabalha, eu lavo a louça. Hoje é a minha vez.', { expr: 'feliz' });
        G.filho.set({ props: { mug: false } });
        G.filho.lookAt(null);
        G.filho.setAnim('idle');
        bg(G.filho.walk({ x: 0.15, z: -0.95 }).then(() => G.filho.walk({ x: -1.3, z: -0.75 })).then(() => G.filho.walk('pia')).then(() => G.filho.face('pia')));
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Cinco recados no mural. A ordem é sua.', { anim: 'point' });
        await G.say('pai', 'Finalmente alguém entendeu como funciona esta casa.', { expr: 'rindo' });

        // O mural: cinco missões em qualquer ordem
        const relogios = ['20:15', '20:24', '20:32', '20:41', '20:49', '20:56', '20:58'];
        let feitas = 0;
        while (!MISSOES.every((x) => G.v.estrelas[x.id] != null)) {
          const id = await mural(G, Object.assign({}, G.v.estrelas), false);
          const m = BY_ID[id];
          if (!m) break;
          if (id === 'presente') {
            await G.say('filho', 'Que silêncio é esse aí, {apelido}?', { cam: false, expr: 'desconfiado' });
            await G.say('pai', 'Relatório do conselho.', { expr: 'neutro' });
            await G.say('filho', 'A esta hora?', { cam: false });
            await G.say('pai', 'O conselho não dorme.', { expr: 'desconfiado' });
          }
          const num = Object.keys(G.v.estrelas).length + 1;
          const r = await missao(G, m, num);
          G.v.estrelas[id] = r.estrelas;
          if (r.memoria) G.v.memoria = r.memoria;
          G.save();
          feitas++;
          hudEstrelas(G, relogios[Math.min(feitas, relogios.length - 1)]);
          reagir(G, r.estrelas);
          if (REACAO[id]) await REACAO[id](G, r);
        }
        const total = totalEstrelas(G);
        G.stats({ estrelas: total, estrelasMax: MAX });
        await mural(G, Object.assign({}, G.v.estrelas), true);
        if (total >= MAX) G.achieve('dono_da_casa');

        // {filho} volta da pia
        await G.fadeOut(0.4);
        G.filho.at('mesa1').setAnim('sit');
        G.filho.lookAt(G.pai);
        await G.fadeIn(0.4);
        G.player.lookAt('filho');
        await G.say('filho', 'Louça limpa. E aí, deu conta de tudo?', { expr: 'feliz' });
        await G.say('pai', 'Conta entendida, exame preparado, viagem desenhada e churrasco marcado com o Beto.', { expr: 'orgulhoso' });
        await G.say('pai', 'Ela fez os rascunhos. O resto foi comigo.');
        await G.say('faisca', 'E os pedidos nota 10 de hoje ficam no seu Guia do CEO, no botão 📘, em "Vida pessoal". Para a próxima conta que vier alta.', { anim: 'teach' });
        await G.fadeOut(0.6);
      },

      // ------------------------------------------------------------------
      // 3. Sala, 21h: o sofá
      // ------------------------------------------------------------------
      async (G) => {
        G.scene('sala', { tv: 'on', lamp: true });
        G.music('casa');
        G.hud.set({ clock: '21:00' });
        G.filho.at('sofa1').setAnim('sitrelax');
        G.filho.setExpr('feliz');
        G.pai.at('inicio').setAnim('idle');
        G.faisca.at('faisca');
        G.faisca.follow(G.pai);
        G.player.fp();
        await G.fadeIn(0.7);
        G.player.lookAt('filho');
        await G.say('filho', 'Vem, {apelido}. Está passando a reprise do jogo de domingo.', { expr: 'feliz' });
        await G.say('pai', 'Reprise? Eu já sei que a gente perde.', { expr: 'rindo' });
        const presente = G.v.presente;
        await G.explore({
          objetivo: 'Sente no sofá com {filho}',
          hotspots: [
            {
              id: 'vitrola', label: 'A vitrola', icon: '🎵', at: 'vitrola', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'A vitrola. Faz anos que ninguém põe um disco aqui.');
                if (presente === 'vinil') await G.think('pai', 'Por pouco tempo.');
              },
            },
            {
              id: 'fotos', label: 'Fotos da família', icon: '🖼️', at: 'foto', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Eu e o Beto, de bermudas iguais, num verão qualquer dos anos 70. Ele já era mais alto. Continua sendo.');
                await G.think('pai', 'Domingo tem churrasco.');
              },
            },
            { id: 'sofa', label: 'Sentar no sofá', icon: '🛋️', actor: 'filho' },
          ],
        });
        await G.fadeOut(0.4);
        G.pai.at('sofa2').setAnim('sitrelax');
        G.faisca.unfollow();
        G.faisca.at({ x: 1.05, z: -0.85, rot: 3.3 });
        G.faisca.set({ y: 1.02 });
        G.faisca.setAnim('idle');
        G.filho.lookAt(G.pai);
        G.talkCam(false);
        G.player.cine();
        await G.cam.shot({ target: [0.0, 0.92, -1.72], yaw: 0.32, pitch: 0.1, dist: 3.1, fov: 38 }, 0);
        await G.fadeIn(0.8);
        bg(G.cam.shot({ target: [0.0, 0.95, -1.72], yaw: 0.22, pitch: 0.08, dist: 2.7, fov: 38 }, 14));
        await G.say('filho', 'E aí? Como foi a noite com ela?', { expr: 'amigavel' });
        await G.say('pai', 'A conta de luz, eu finalmente entendi. E descobri que nem leram o medidor.', { expr: 'orgulhoso' });
        if (G.v.beto === 'ligar') {
          await G.say('pai', 'E liguei pro Beto.', { expr: 'sem_graca' });
          await G.say('filho', 'Você LIGOU pro tio Beto?', { expr: 'surpreso' });
          await G.say('pai', 'Ela me ajudou a organizar o que dizer. O resto saiu sozinho.', { expr: 'amigavel' });
        } else {
          await G.say('pai', 'E mandei mensagem pro Beto. Domingo tem churrasco.', { expr: 'amigavel' });
          await G.say('filho', 'Ela que escreveu?', { expr: 'desconfiado' });
          await G.say('pai', 'Ela organizou. Até inventou uma pescaria que nunca existiu. Eu risquei. As palavras são minhas.', { expr: 'orgulhoso' });
        }
        const cet = G.flag('ceticismo') || varDe('prologo', 'ceticismo');
        if (cet === 'modinha') await G.say('pai', 'Modinha ou não, hoje ela me devolveu umas horas. E a noite.', { expr: 'pensativo' });
        else if (cet === 'inventou') await G.say('pai', 'Que ela inventa, inventa. A diferença é que agora eu sei pegar.', { expr: 'pensativo' });
        else if (cet === 'caneta') await G.say('pai', 'E a caneta continuou comigo o tempo todo.', { expr: 'pensativo' });
        await G.say('filho', 'Então… serve?', { expr: 'empolgado' });
        await G.say('pai', 'Me pergunta amanhã de manhã.', { expr: 'rindo' });
        await G.say('filho', '{apelido}… obrigad{oa} por topar. De verdade.', { expr: 'amigavel' });
        await G.say('pai', G.flag('aposta') ? 'Eu topei uma aposta. É diferente.' : 'Eu topei um trato. Trato é trato.', { expr: 'desconfiado' });
        G.filho.emote('heart', 1.6);
        G.fx.hearts(G.filho);
        await G.say('filho', 'Bom, vou me arrumar. Tem o aniversário do Gui daqui a pouco.', { expr: 'feliz' });
        await G.say('pai', 'Numa terça-feira?', { expr: 'desconfiado' });
        await G.say('filho', 'Aniversário não escolhe dia, {apelido}. Antes de sair, eu passo aqui.', { expr: 'rindo' });

        // {filho} vai se arrumar; ele fica com a Faísca
        await G.fadeOut(0.4);
        G.player.fp();
        G.talkCam(true);
        G.pai.at('sofa2').setAnim('sitrelax');
        G.filho.lookAt(null);
        G.filho.at({ x: -0.95, z: -0.95, rot: -2.2 }).setAnim('idle');
        await G.fadeIn(0.4);
        G.player.lookAt(G.filho);
        await G.filho.walk('porta');
        await G.filho.fadeOut(0.4);
        G.filho.remove();
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Quer que eu fique quietinha um pouco?', { anim: 'listen' });
        if (G.v.presente) {
          await G.say('pai', 'Fica. Eu tenho um bilhete para escrever.', { expr: 'pensativo' });
          await G.say('faisca', 'Quer ajuda?', { anim: 'think' });
          await G.say('pai', 'Não. Esse é meu.', { expr: 'orgulhoso' });
          G.faisca.emote('heart', 1.6);
          await G.say('faisca', 'Melhor resposta da noite.', { anim: 'celebrate' });
        } else {
          await G.say('pai', 'Fica. Hoje eu só quero ver o fim do jogo.', { expr: 'cansado' });
          await G.say('faisca', 'Combinado. Reprise de derrota eu não comento.', { anim: 'ashamed' });
        }

        await G.fact(['ia_saude', 'chefe_ia_menos_sincero'], { titulo: 'Onde a palavra final é sua' });
        await G.lesson('Na vida de casa, a IA é uma ajudante paciente. *As decisões, e os sentimentos, continuam sendo seus.*\n- Contexto, pedido claro e cuidado: as três estrelas valem em casa também.\n- Conta pessoal: treino desligado, chat temporário para assunto delicado. Senha, cartão e documento, nunca.\n- Exame: a IA ajuda a perguntar; quem responde é o médico.\n- Mensagem de afeto: ela organiza, as palavras são suas.', { titulo: 'Coisas da casa' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const s = (G.allStats() || {}).cap8 || {};
      const lines = [];
      if (s.estrelas != null) lines.push('Missões de casa: ' + s.estrelas + ' de ' + (s.estrelasMax || MAX) + ' estrelas ⭐');
      if (G.v.treinoOff) lines.push('Conta pessoal: treino com as suas conversas desligado.');
      if (G.v.beto === 'ligar') lines.push('Beto: você ligou. Domingo tem churrasco.');
      else if (G.v.beto === 'msg') lines.push('Beto: mensagem com as suas palavras. Domingo tem churrasco.');
      if (G.v.presente) lines.push('Presente {doda} {filho}: escolhido por você 🎁');
      return lines.slice(0, 4).map((l) => G.t(l));
    },
  });
})();

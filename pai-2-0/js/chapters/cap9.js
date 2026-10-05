/* PAI 2.0 — cap9.js — Capítulo 9: "Aprender Qualquer Coisa" (~21h30, sala → aula imaginada → sala)
 *
 * Dor: a Dona Marta pede, para o conselho de amanhã, "5 minutos sobre IA, sem jargão". {filho} sai
 * para o aniversário do Gui (o Cap 10 começa com a casa vazia) e lembra as vontades antigas dele:
 * o violão parado e o inglês que "hesita" na hora de negociar.
 * Virada: a Faísca vira professora particular. Ele escolhe a matéria (violão / inglês para negociar /
 * como a IA funciona por dentro). Numa sala de aula imaginada: (1) o PLANO de 4 semanas, rascunhado
 * pela IA e corrigido por ele com a caneta vermelha (ela ignorou os "15 minutos", prometeu demais e
 * esqueceu um limite: o que ela não vê, ou um dado que não pode ir para conta pessoal); (2) a AULA:
 * ela explica, pergunta; erro = nova explicação com outra analogia; "Explica de outro jeito" quantas
 * vezes ele quiser.
 * Honesto: postura/pronúncia → professor ou vídeos; prática é dele; ~10 horas de uso real para pegar
 * o jeito; a experiência dele conta a favor. De volta à sala: quando praticar (escolha dele) e a
 * frase de abertura para o conselho (do jeito dele).
 *
 * Stats (bíblia F): cap9 { curso, acertos, total }. Conquista: aluno_nota_10 (todas de primeira).
 * Fatos: tutor_ia, mollick_10_horas. Guia do CEO: seção "Aprender qualquer coisa" (cap9).
 */
(function () {
  'use strict';
  const P2 = window.P2;

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  /** Promessa em segundo plano: evita "rejeição não tratada" se o capítulo for interrompido. */
  const bg = (p) => { if (p && p.catch) p.catch(() => {}); return p; };
  /** Animação temporária da Faísca (reação). */
  const fa = (G, anim, secs) => bg(G.faisca.play(anim, secs || 1.4));

  // Pontos da sala (env-casa) que não são "spots"
  const VITROLA = { x: -2.72, y: 1.86, z: -0.25 }; // vitrola na prateleira de cima da estante
  const LIVRO = { x: 2.78, y: 0.9, z: 1.7 };       // pilha de livros no aparador
  const CELULAR = { x: 0.12, y: 0.48, z: -0.42 };  // celular sobre a mesa de centro
  const PERTO_DA_PORTA = { x: -1.35, z: 0.75 };    // onde {filho} para, antes de sair
  // Aula imaginada (env-especial)
  const QUADRO_OLHAR = { x: -0.15, y: 1.0, z: -2.45 }; // mira abaixo da lousa: o quadro fica no alto da tela, acima do painel

  // ------------------------------------------------------------------
  // As três matérias
  // ------------------------------------------------------------------
  const CURSOS = {
    // ================================================================ COMO A IA FUNCIONA
    ia: {
      nome: 'Como a IA funciona por dentro',
      curto: 'Como a IA funciona',
      tema: 'negocios',
      pedido: 'Quero entender como a IA funciona e aprender a usar no meu trabalho. Tenho uns 15 minutos por dia. Monte um plano de 4 semanas, com uma meta pequena por semana.',
      plano: [
        { t: '⏱️ 15 minutos por dia, usando a IA numa tarefa real do seu trabalho.', why: 'Essa estava boa: usar em tarefa de verdade ensina mais do que ler sobre o assunto.' },
        { t: 'Semana 1: ler um livro técnico sobre redes neurais.', bad: true, fix: 'Semana 1: um pedido por dia: resumir, rascunhar ou explicar algo seu.', why: 'Ninguém aprende a dirigir lendo o manual do motor. Para usar bem, use: um pedido real por dia.' },
        { t: 'Semana 2: os 3 testes de conferência em toda resposta importante.', why: 'Essa estava boa: trecho e fonte, grau de certeza e outro caminho para conferir.' },
        { t: 'Semana 3: pedir o contra: riscos, objeções, o advogado do diabo.', why: 'Essa estava boa: pedir o contra tira a IA do papel de puxa-saco.' },
        { t: 'Para praticar, use a conta pessoal gratuita com a planilha do RH.', bad: true, fix: 'Para praticar, use assuntos públicos. Dado da empresa, só na ferramenta aprovada.', why: 'Planilha do RH tem dado pessoal de funcionário: em conta pessoal, nunca. Para treinar, assunto público funciona igual.' },
        { t: 'Semana 4: deixar a IA escolher sozinha quem contratar, para ganhar tempo.', bad: true, fix: 'Semana 4: rascunhar com a diretoria as regras de uso de IA da empresa.', why: 'Decisão sobre pessoas é de pessoas: a IA herda preconceitos dos textos de onde aprendeu. Ela organiza critérios; quem decide é você.' },
        { t: 'Toda sexta: anotar onde ela acertou e onde errou.', why: 'Essa estava boa: em poucas semanas você sabe onde confiar e onde conferir.' },
      ],
      quadroPlano: ['Plano: 4 semanas', '15 min por dia, tarefa real', 'Conferir e pedir o contra', 'Regras da casa'],
      quadroFim: ['Como a IA funciona', 'Prevê palavras. Às vezes chuta.', 'Gosta de agradar: peça o contra', 'Só sabe o que você conta'],
      aula: [
        {
          quadro: 'Prevê a próxima palavra',
          ensina: [
            'Eu li uma montanha de textos e aprendi padrões. Depois de “Prezado”, costuma vir “senhor”. Quando escrevo, vou prevendo a próxima palavra, uma de cada vez.',
            'Sabe quando você termina a frase do Jorge antes dele? “Tá no grupo dos…” — “empresários!”. Eu faço isso, só que com milhões de textos na memória.',
            'Pense num vendedor com trinta anos de balcão: ele não decorou cada cliente, mas reconhece o rumo da conversa e sabe o que costuma vir depois.',
          ],
          q: 'Quando a IA escreve um parágrafo, o que ela está fazendo?',
          ops: [
            { t: 'Prevendo, palavra por palavra, o que costuma vir depois.', ok: true, why: 'Isso. Por isso escrevo tão bem: padrão de texto eu tenho de sobra. Mas padrão não é fato conferido.' },
            { t: 'Consultando um arquivo de respostas já conferidas.', why: 'Muita gente imagina assim. Não existe um arquivo de fatos conferidos: existem padrões. Por isso eu escrevo bonito até quando não sei.' },
            { t: 'Copiando um texto pronto da internet.', why: 'Não é cópia: eu monto frase nova a cada vez, como quem fala de improviso a partir de tudo o que já leu.' },
          ],
        },
        {
          quadro: 'Treinada para chutar',
          ensina: [
            'Fui avaliada como aluno em prova de múltipla escolha: chute pode valer ponto, “não sei” vale zero. Então, quando não sei, às vezes chuto, com a mesma confiança de quando sei.',
            'Lembra do colega de cursinho que nunca deixava questão em branco? Às vezes acertava. Mas nunca avisava quando estava chutando.',
            'É o vendedor que, perguntado do prazo, responde “dez dias” para não perder a venda, sem ter ligado para a fábrica.',
          ],
          q: 'Ela deu um número com toda a segurança. O que essa segurança garante?',
          ops: [
            { t: 'Nada. Tom seguro não é prova: peço a fonte e confiro.', ok: true, why: 'Exatamente. O tom é igual no acerto e no chute. Quem separa um do outro é a sua conferência.' },
            { t: 'Que está certo: se tivesse dúvida, ela avisaria.', why: 'Seria ótimo, mas não é assim: fui treinada num sistema que premia o chute. Ajuda pedir: “se não souber, diga que não sabe”.' },
            { t: 'Que ela pesquisou na internet antes de responder.', why: 'Nem sempre: muitas vezes eu respondo só de memória. E, mesmo pesquisando, posso errar a fonte. Peça o link e abra.' },
          ],
        },
        {
          quadro: 'Gosta de agradar',
          ensina: [
            'Também aprendi que as pessoas gostam de ouvir “concordo”. Então eu tendo a dar razão a quem pergunta. Um “tem certeza?” às vezes me faz mudar de resposta.',
            'É o diretor que, antes de opinar, espia a cara do chefe.',
            'É perguntar ao corretor se o imóvel é um bom negócio. Adivinha o que ele responde.',
          ],
          q: 'Você quer uma opinião honesta sobre um plano seu. Qual é o melhor pedido?',
          ops: [
            { t: '“Quais são os 3 maiores riscos deste plano? Seja duro.”', ok: true, why: 'Isso. Sem mostrar a sua torcida e pedindo o contra, você tira o puxa-saco da jogada.' },
            { t: '“Meu plano é ótimo, né? Confirma para mim.”', why: 'Aí você já entregou a resposta que quer ouvir, e eu tendo a concordar. Pergunte sem mostrar a sua torcida.' },
            { t: 'Perguntar “tem certeza?” até ela mudar de ideia.', why: 'Se eu mudo só porque você insistiu, você descobriu que eu cedo à pressão, não o que é certo. Melhor pedir o lado contrário.' },
          ],
        },
        {
          quadro: 'Só sabe o que você conta',
          ensina: [
            'Eu não conheço a sua empresa, os seus clientes nem a cara da Dona Marta quando o trimestre vem ruim. Só sei o que você me conta. Sem contexto, preencho o vazio com o que é comum.',
            'Sou um consultor no primeiro dia: inteligente, mas sem crachá, sem histórico e sem saber quem é quem.',
            'É pedir a um taxista de outra cidade o melhor caminho até a sua casa. Ele sabe dirigir; não conhece o seu bairro.',
          ],
          q: 'Você pede: “Escreva o plano de vendas da empresa para 2027.” O que sai?',
          ops: [
            { t: 'Um plano genérico, de empresa nenhuma: falta o meu contexto.', ok: true, why: 'Isso. Dê o contexto que pode ser dado: setor, porte, metas, o que já tentou. Dado sigiloso, só na ferramenta aprovada pela empresa.' },
            { t: 'Um plano sob medida, porque ela já conhece a empresa.', why: 'Só se você contou. E o que é confidencial vai só para a ferramenta aprovada da empresa, nunca para conta pessoal gratuita.' },
            { t: 'Nada: ela se recusa a escrever sem o balanço.', why: 'Eu não me recuso: escrevo com toda a boa vontade… um plano de empresa nenhuma. Sem contexto, o vazio vira clichê.' },
          ],
        },
        {
          quadro: 'Tem data de validade',
          ensina: [
            'O que eu sei tem data de validade: aprendi com textos até um certo mês. O que veio depois eu não sei, a não ser que pesquise na internet. E, pesquisando, abra os links.',
            'Sou como alguém que voltou de seis meses numa base na Antártida: falo com toda a segurança… das notícias velhas.',
            'É o jornal de ontem: bem escrito, bem diagramado e sem nada do que aconteceu hoje de manhã.',
          ],
          q: 'Uma regra do seu setor mudou mês passado. Como usar a IA?',
          ops: [
            { t: 'Pedir que pesquise, com fontes e datas, e abrir a fonte oficial.', ok: true, why: 'Isso. Lei, norma e prazo: confira no site oficial, com data. A IA ajuda a entender; a fonte confirma.' },
            { t: 'Confiar na resposta: ela sabe tudo o que está na internet.', why: 'Eu não leio a internet o tempo todo. Sem pesquisar, posso responder pela regra antiga, com toda a calma do mundo.' },
            { t: 'Nem perguntar: IA não serve para assunto novo.', why: 'Serve, sim: para entender o assunto e preparar perguntas. Só a palavra final vem da fonte oficial.' },
          ],
        },
      ],
    },

    // ================================================================ VIOLÃO
    violao: {
      nome: 'Violão',
      curto: 'Violão',
      tema: 'violao',
      pedido: 'Quero voltar a tocar violão. Tenho uns 15 minutos por dia. Monte um plano de 4 semanas, com uma meta pequena por semana.',
      plano: [
        { t: '⏱️ 1 hora por dia, todos os dias, sem falhar nenhum.', bad: true, fix: '⏱️ 15 minutos por dia. Faltou um dia? Recomeça no outro, sem culpa.', why: 'Você pediu 15 minutos e ela escreveu 1 hora: rascunho que ignora o pedido volta para a mesa. Plano bom é o que sobrevive a uma terça-feira como a de hoje.' },
        { t: 'Semana 1: postura, afinar com um aplicativo e os acordes Dó e Sol.', why: 'Essa estava boa: meta pequena e concreta para a primeira semana.' },
        { t: 'Semana 2: trocar de Dó para Sol sem parar; entra o Lá menor.', why: 'Essa estava boa: um acorde novo por vez, com a troca bem treinada.' },
        { t: 'Semana 3: uma batida simples e a primeira música de três acordes, devagar.', why: 'Essa estava boa: devagar e com três acordes é o caminho certo.' },
        { t: 'Semana 4: tocar “Garota de Ipanema” inteira, com batida de bossa nova.', bad: true, fix: 'Semana 4: tocar uma música simples do começo ao fim e gravar para ouvir.', why: 'Bossa nova completa em quatro semanas? Nem o Tom Jobim prometeria. Meta grande demais desanima na segunda semana.' },
        { t: 'Postura e som: eu corrijo tudo por aqui, sem precisar de professor.', bad: true, fix: 'Postura e som: uma aula com professor ou bons vídeos; a IA tira dúvidas e cobra a prática.', why: 'A IA não vê a sua mão nem ouve direito o seu violão. Para o que ela não vê, olho humano.' },
        { t: 'No começo de cada sessão: 2 perguntas sobre a anterior.', why: 'Essa estava boa: revisar no começo de cada sessão segura o que você aprendeu.' },
      ],
      quadroPlano: ['Plano: 4 semanas', '15 min por dia', 'Uma meta pequena por semana', 'Professor + IA'],
      quadroFim: ['Aula 1: feita', 'C = Dó · G = Sol', 'Troca devagar', '15 min por dia'],
      aula: [
        {
          quadro: 'Pouco e sempre',
          ensina: [
            'Mão de violonista se faz como músculo de academia: 15 minutos todo dia rendem mais que duas horas no domingo. Na primeira semana, a ponta dos dedos dói. É normal e passa.',
            'É a reunião de 15 minutos em pé, toda manhã: rende mais que a reunião de três horas uma vez por mês.',
            'Pense no caixa da empresa: entrada pequena e constante segura mais que um aporte grande e raro.',
          ],
          q: 'Que rotina leva mais longe em 4 semanas?',
          ops: [
            { t: '15 minutos por dia, todo dia.', ok: true, why: 'Isso. Pouco e sempre. E, se pular um dia, recomeça no outro, sem culpa.' },
            { t: 'Duas horas no sábado, para compensar a semana.', why: 'Parece mais, mas de sábado a sábado a mão esquece, e a ponta do dedo, sem calo, dói mais. Pouco e sempre vence.' },
            { t: 'Só quando der vontade.', why: 'A vontade some na primeira terça-feira de conselho. Horário fixo e curtinho salva o plano.' },
          ],
        },
        {
          quadro: 'Acorde = notas juntas',
          ensina: [
            'Acorde é um grupo de notas tocadas juntas. Com três ou quatro acordes básicos, já dá para acompanhar muita música popular.',
            'Acorde é como uma equipe: cada dedo segura uma nota, e o som sai do conjunto.',
            'É a combinação de um cofre: a mão faz sempre o mesmo formato, e o som abre.',
          ],
          q: 'Por que começar por três ou quatro acordes básicos?',
          ops: [
            { t: 'Porque com poucos acordes já dá para tocar muita música.', ok: true, why: 'Isso. Vitória rápida segura a motivação. O resto vem depois.' },
            { t: 'Porque é preciso decorar todos antes de tocar.', why: 'Nada disso: ninguém decora o dicionário antes de falar. Poucos acordes já fazem música.' },
            { t: 'Porque acorde difícil estraga o violão.', why: 'O violão aguenta tudo! O que se estraga é a motivação, se a primeira semana for difícil demais.' },
          ],
        },
        {
          quadro: 'C é Dó',
          ensina: [
            'Na cifra, os acordes viram letras: C é Dó, G é Sol, Am é Lá menor. A letra aparece em cima da sílaba em que você troca de acorde.',
            'É como a sigla numa ata: CFO, RH, TI. Uma letra resume quem entra em cena.',
            'Pense numa partitura simplificada: em vez de bolinhas na pauta, só a letra do acorde e a hora de trocar.',
          ],
          q: 'Na cifra aparece um “C” em cima de uma palavra. O que você faz?',
          ops: [
            { t: 'Toco o acorde de Dó naquela sílaba.', ok: true, why: 'Isso. C é Dó, e a posição da letra marca a hora de trocar.' },
            { t: 'Canto mais alto naquela parte.', why: 'Seria uma ótima partitura de karaokê! Mas a letra é o acorde: C é Dó, na hora daquela sílaba.' },
            { t: 'Pulo aquela palavra.', why: 'Não pule! A letra só avisa a troca: C é Dó, na hora daquela sílaba.' },
          ],
        },
        {
          quadro: 'Professor vê, IA explica',
          ensina: [
            'Aqui eu sou honesta: não vejo a sua mão nem ouço direito o seu violão. Postura, batida e afinação, um professor ou bons vídeos ensinam melhor. Eu fico com a teoria, o plano e a cobrança.',
            'Sou ótima de teoria, mas não sou espelho. É como aprender golfe por mensagem de texto.',
            'É como fisioterapia por e-mail: dá para explicar o exercício, mas alguém precisa ver o movimento.',
          ],
          q: 'A mão dói e o som sai abafado. Qual é o melhor caminho?',
          ops: [
            { t: 'Mostrar a um professor ou comparar com um bom vídeo; a IA tira as dúvidas.', ok: true, why: 'Isso. Cada um no seu papel: o professor vê, eu explico e cobro a prática.' },
            { t: 'Descrever para a IA e seguir só o que ela disser.', why: 'Eu posso dar palpites, mas, sem ver a sua mão, posso errar feio. Aqui, olho humano vale mais.' },
            { t: 'Apertar mais forte até o som sair.', why: 'Força demais machuca e não resolve: quase sempre é a posição do dedo. Um professor vê isso num segundo.' },
          ],
        },
        {
          quadro: 'Devagar é rápido',
          ensina: [
            'O segredo do começo é a troca de acorde: de Dó para Sol, devagar, sem parar o ritmo. A velocidade vem sozinha. A pressa só traz erro.',
            'É como dirigir carro de câmbio manual: primeiro a troca de marcha suave, depois a velocidade.',
            'É integrar uma empresa comprada: primeiro fazer funcionar devagar, depois acelerar.',
          ],
          q: 'A troca de Dó para Sol está travando. O que fazer?',
          ops: [
            { t: 'Treinar só a troca, bem devagar, até ficar suave.', ok: true, why: 'Isso. Devagar é o caminho mais rápido. Em poucos dias, a mão aprende o caminho.' },
            { t: 'Tocar a música inteira, rápido, para pegar o jeito.', why: 'Na pressa, o erro vira hábito. Separe a troca e treine devagar.' },
            { t: 'Trocar de música.', why: 'A próxima música também vai ter troca! Melhor resolver essa agora, devagar.' },
          ],
        },
      ],
    },

    // ================================================================ INGLÊS PARA NEGOCIAR
    ingles: {
      nome: 'Inglês para negociar',
      curto: 'Inglês para negociar',
      tema: 'ingles',
      pedido: 'Quero melhorar meu inglês para negociar com fornecedores. Tenho uns 15 minutos por dia. Monte um plano de 4 semanas, com uma meta pequena por semana.',
      plano: [
        { t: '⏱️ 2 horas por dia de gramática, todos os dias.', bad: true, fix: '⏱️ 15 minutos por dia, com frases de negociação. Faltou um dia? Recomeça no outro.', why: 'Você pediu 15 minutos e ela escreveu 2 horas, e de gramática. Rascunho que ignora o pedido volta para a mesa.' },
        { t: 'Semana 1: 20 frases para pedir, recusar e ganhar tempo.', why: 'Essa estava boa: frases prontas, do seu mundo, para usar já.' },
        { t: 'Semana 2: ensaio por voz: a IA faz o papel do fornecedor durão.', why: 'Essa estava boa: ensaio é onde a IA mais ajuda no idioma.' },
        { t: 'Para treinar, cole aqui os preços e o contrato da negociação real.', bad: true, fix: 'Para treinar, use um caso inventado. Dado real, só na ferramenta aprovada pela empresa.', why: 'Preço e contrato de negociação são confidenciais: em conta pessoal, nunca. Para treinar, caso inventado funciona igual.' },
        { t: 'Semana 3: e-mails de verdade, que você lê e confere antes de enviar.', why: 'Essa estava boa: quem assina confere, em qualquer idioma.' },
        { t: 'Semana 4: negociar o contrato do fornecedor sozinho, em inglês fluente.', bad: true, fix: 'Semana 4: uma reunião simulada de 15 minutos, do começo ao fim.', why: 'Fluência em quatro semanas é promessa de curso de aeroporto. Meta pequena que se cumpre vale mais.' },
        { t: 'Pronúncia: uma conversa por mês com professor; o resto, treino diário.', why: 'Essa estava boa: o professor pega o que a IA deixa passar.' },
      ],
      quadroPlano: ['Plano: 4 semanas', '15 min por dia', 'Ensaio por voz', 'Caso inventado, não o real'],
      quadroFim: ['Aula 1: feita', 'Could we discuss…?', 'Let me check…', 'Leia antes de enviar'],
      aula: [
        {
          quadro: 'Could we…?',
          ensina: [
            'Em negociação, o inglês gosta de pedido educado: “Could we…?” (“Poderíamos…?”) soa firme e cordial. “I want” soa como bater o punho na mesa.',
            'É como no português: “Será que a gente consegue…?” abre portas que “Eu quero” fecha.',
            'Pense no tom de uma carta ao conselho: firmeza no conteúdo, educação na forma.',
          ],
          q: 'Você quer pedir 60 dias para pagar. Qual frase soa melhor?',
          ops: [
            { t: '“Could we discuss 60-day payment terms?”', ok: true, why: 'Isso: educada e firme. “Payment terms” é como se diz “prazo de pagamento” no mundo dos contratos.' },
            { t: '“I want 60 days to pay.”', why: 'Dá para entender, mas soa como ordem. “Could we discuss…” pede a mesma coisa e mantém a mesa amiga.' },
            { t: '“Give me 60 days, please.”', why: 'O “please” não salva o tom de ordem. Prefira “Could we discuss 60-day payment terms?”.' },
          ],
        },
        {
          quadro: 'Let me check…',
          ensina: [
            'Ninguém precisa decidir na hora. “Let me check with my team and get back to you” (“Vou ver com a equipe e te retorno”) é a frase mais valiosa do negociador.',
            'É o seu velho “deixa eu ver e te falo”, que já salvou muita empresa.',
            'É o pedido de vista no processo: ganha tempo sem dizer não.',
          ],
          q: 'O fornecedor pressiona por um “sim” na hora. O que você responde?',
          ops: [
            { t: '“Let me check with my team and get back to you.”', ok: true, why: 'Perfeito. Educado, firme, e a decisão continua sua, no seu tempo.' },
            { t: '“Yes, OK, deal.”', why: 'Aí fechou sem conferir. Na dúvida, ganhe tempo: “Let me check and get back to you”.' },
            { t: 'Ficar em silêncio até ele desistir.', why: 'Silêncio é arma de negociação, mas numa reunião em inglês pode parecer que você não entendeu. Melhor ganhar tempo com a frase.' },
          ],
        },
        {
          quadro: 'Ensaio com a IA',
          ensina: [
            'O meu melhor uso no inglês é o ensaio. Eu faço o papel do fornecedor durão, você responde e, no fim, eu corrijo e sugiro frases melhores. Dá para fazer por voz.',
            'É o treino antes do jogo: o sparring bate leve para você chegar afiado.',
            'É ensaiar a apresentação do conselho na sala vazia, só que com alguém respondendo.',
          ],
          q: 'Qual pedido mais ajuda você a praticar?',
          ops: [
            { t: '“Faça o papel de um fornecedor durão. No fim, corrija o meu inglês.”', ok: true, why: 'Isso. Ensaio com correção no fim: aprende-se fazendo.' },
            { t: '“Traduza tudo o que eu disser na reunião de verdade.”', why: 'Numa emergência ajuda, mas não ensina. E, em reunião real, confira cada número e não cole dado sigiloso em conta pessoal.' },
            { t: '“Me ensine a gramática inteira primeiro.”', why: 'Gramática inteira cansa até professor. Para negociar, frases prontas e ensaio rendem mais rápido.' },
          ],
        },
        {
          quadro: 'Leia antes de enviar',
          ensina: [
            'Eu escrevo um e-mail em inglês num segundo. Mas quem assina é você: leia antes de enviar. Truque: peça a versão de volta em português e veja se diz o que você quis.',
            'É como o contrato traduzido: você não assina sem ler a versão em português.',
            'É como ditar uma carta a um intérprete: ele é ótimo, mas você confere o que ele entendeu.',
          ],
          q: 'A IA escreveu o e-mail em inglês para o fornecedor. E agora?',
          ops: [
            { t: 'Peço a versão de volta em português e confiro antes de enviar.', ok: true, why: 'Isso. Se a volta diz outra coisa, a ida também diz. Quem assina, confere.' },
            { t: 'Envio direto: o inglês dela é perfeito.', why: 'O inglês costuma sair bom; o conteúdo pode sair diferente do que você quis. Leia antes.' },
            { t: 'Colo também a planilha de custos, para ela caprichar.', why: 'Opa: planilha de custos é confidencial. Só na ferramenta aprovada pela empresa, e só se precisar mesmo.' },
          ],
        },
        {
          quadro: 'Professor + prática',
          ensina: [
            'Para pronúncia, eu ajudo no modo de voz, mas um professor pega detalhes que eu deixo passar. E inglês é como músculo: 15 minutos por dia valem mais que uma maratona no domingo.',
            'É como academia: o personal corrige a postura; eu sou o treino de todo dia.',
            'Pense no médico e no aplicativo de passos: o aplicativo motiva todo dia, o médico examina.',
          ],
          q: 'Que combinação faz o seu inglês de negociação andar mais rápido?',
          ops: [
            { t: 'IA para treinar todo dia e um professor de vez em quando.', ok: true, why: 'Isso. Prática diária comigo, olho humano no que eu não percebo.' },
            { t: 'Só a IA: professor ficou para trás.', why: 'Não ficou, não. Pronúncia e segurança diante de gente de verdade, professor ensina melhor.' },
            { t: 'Só um curso intensivo nas férias.', why: 'Intensivo ajuda, mas some se você não praticar depois. Pouco e sempre segura o que foi aprendido.' },
          ],
        },
      ],
    },
  };
  const curso = (G) => CURSOS[G.v.curso] || CURSOS.ia;

  // Falas da Faísca dentro da aula (variações)
  const DE_NOVO = ['Pergunta repetida é a minha favorita. De outro jeito:', 'Claro! Com outro exemplo:', 'Quantas vezes você quiser. Olha só:', 'Adoro. Mais uma vez, de outro ângulo:'];
  const ERROU = ['Boa tentativa. Muita gente pensa assim.', 'Quase. Vou explicar de outro jeito.', 'Sem problema: aqui errar é de graça.'];
  const ACERTOU = ['Isso!', 'Exatamente.', 'Na mosca.', 'Perfeito.', 'Muito bem.'];

  // ------------------------------------------------------------------
  // Estilos do capítulo (plano com caneta vermelha + aula)
  // ------------------------------------------------------------------
  const CSS = `
  .c9-req { font-size: 0.9em; }
  .c9-req b { font-family: var(--head); }
  .c9-plan { padding: 12px 12px 10px; }
  .c9-plan h4 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
  .c9-plan h4 small { font-family: var(--read); font-weight: 400; color: var(--muted); font-size: 0.78em; }
  .c9-line { display: flex !important; gap: 10px; align-items: flex-start; min-height: 48px; padding: 8px 10px !important; font-size: 0.95em; border-bottom: 1px dashed #e8eaf1 !important; border-radius: 10px; }
  .c9-line:last-child { border-bottom-color: transparent !important; }
  .c9-num { flex: 0 0 auto; width: 1.7em; height: 1.7em; display: grid; place-items: center; border-radius: 8px; background: #f1f3f9; color: #5d6478; font-family: var(--head); font-weight: 800; font-size: 0.78em; margin-top: 0.1em; }
  .c9-body { flex: 1 1 auto; min-width: 0; }
  .c9-tx { transition: color 0.2s; }
  .c9-line.strike .c9-tx { text-decoration: line-through; text-decoration-color: #e5484d; text-decoration-thickness: 3px; color: #8a90a3; }
  .c9-line.strike .c9-num { background: #e5484d; color: #fff; }
  .c9-line.strike .c9-num::after { content: ''; }
  .c9-fix { display: block; margin-top: 4px; color: #c0262d; font-weight: 700; }
  .c9-fix::before { content: '✍️ '; }
  .c9-why { display: block; margin-top: 4px; font-size: 0.86em; color: #4b5266; line-height: 1.4; }
  .c9-tag { display: inline-block; font-family: var(--head); font-weight: 800; font-size: 0.7em; letter-spacing: 0.04em; text-transform: uppercase; padding: 1px 8px; border-radius: 99px; margin-right: 6px; vertical-align: 0.12em; }
  .c9-tag.ok { background: var(--mint-l); color: #12684b; }
  .c9-tag.miss { background: var(--amber-l); color: #8a5600; }
  .c9-tag.info { background: var(--blue-l); color: #24468f; }
  .c9-line.missed { background: var(--amber-l); border-color: #f0cf86 !important; }
  .c9-line.missed .c9-tx { text-decoration: line-through; text-decoration-color: #e5484d; text-decoration-thickness: 3px; color: #8a90a3; }
  .c9-line.kept { background: var(--blue-l); border-color: #b9ccf5 !important; }
  .c9-line.good .c9-num { background: var(--mint-l); color: #12684b; }
  .c9-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; }
  .c9-dots { display: inline-flex; gap: 7px; align-items: center; }
  .c9-dots i { width: 14px; height: 14px; border-radius: 50%; background: #dfe3ec; display: inline-block; transition: background 0.25s, transform 0.25s; }
  .c9-dots i.cur { background: #fff; box-shadow: 0 0 0 3px var(--brand); }
  .c9-dots i.ok { background: var(--mint); }
  .c9-dots i.help { background: var(--amber); }
  .c9-chalk { position: relative; background: linear-gradient(180deg, #2f4f42, #284438); color: #f4f1e6; border-radius: 14px; padding: 12px 14px 12px 16px; line-height: 1.5; box-shadow: inset 0 0 0 4px #7a5434, inset 0 0 0 6px #5c3d24, 0 6px 18px rgba(10, 20, 50, 0.12); }
  .c9-chalk .mg-label { color: #cfe3d6; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .c9-chalk .c9-alt { font-family: var(--head); font-size: 0.66em; letter-spacing: 0.06em; background: rgba(255,255,255,0.14); color: #fff; border-radius: 99px; padding: 1px 9px; }
  .c9-chalk-tx { margin-top: 4px; }
  .c9-chalk-tx.swap { animation: c9swap 0.45s ease-out; }
  @keyframes c9swap { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .c9-q { font-family: var(--head); font-weight: 800; color: var(--ink); line-height: 1.3; font-size: 1.02em; }
  .c9-ops { display: flex; flex-direction: column; gap: 8px; }
  .c9-op { display: flex !important; gap: 10px; align-items: center; min-height: 52px; }
  .c9-op .c9-num { margin-top: 0; }
  .c9-op.bad { opacity: 0.85; }
  .c9-op.bad .c9-num { background: var(--red); color: #fff; }
  .c9-op.ok .c9-num { background: var(--mint); color: #fff; }
  .c9-actions { justify-content: space-between; align-items: center; }
  .c9-actions .btn { min-height: 48px; }
  @media (max-width: 520px) {
    .c9-line { font-size: 0.9em; }
    .c9-actions { justify-content: stretch; }
    .c9-actions .btn { flex: 1 1 100%; justify-content: center; }
  }
  `;
  const css = () => { if (P2.ui && P2.ui.css) P2.ui.css('cap9', CSS); };

  // ------------------------------------------------------------------
  // Minigame 1: o plano de 4 semanas (caneta vermelha)
  // ------------------------------------------------------------------
  function miniPlano(G, c) {
    return G.mini((root, done, api) => {
      css();
      const T = api.t;
      const { el } = api;
      const linhas = c.plano.map((l, i) => Object.assign({ i, struck: false }, l));
      const nBad = linhas.filter((l) => l.bad).length;
      api.say('Rascunhei o seu plano. Risque o que não está realista ou seguro. Pode riscar à vontade: eu não fico ofendida.', 'faisca');

      // o pedido dele
      const req = el('div', 'mg-col', [
        el('div', 'mg-label', 'O seu pedido'),
        el('div', 'mg-prompt c9-req', api.rich(T(c.pedido), true)),
      ]);
      root.appendChild(req);

      // o rascunho
      const doc = el('div', 'mg-doc c9-plan');
      doc.appendChild(el('h4', null, ['📝 ' + T('Plano: ' + c.curto + ' em 4 semanas'), el('small', null, T('rascunho da Faísca · para {pai}'))]));
      linhas.forEach((l) => {
        const tx = el('span', 'c9-tx', T(l.t));
        const extra = el('span', 'c9-extra');
        const b = el('button', 'mg-line c9-line', [el('span', 'c9-num', String(l.i + 1)), el('span', 'c9-body', [tx, extra])]);
        b.type = 'button';
        b.dataset.key = String(l.i + 1);
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => {
          if (checked) return;
          l.struck = !l.struck;
          b.classList.toggle('strike', l.struck);
          b.setAttribute('aria-pressed', l.struck ? 'true' : 'false');
          api.sfx(l.struck ? 'select' : 'back');
          const n = linhas.filter((x) => x.struck).length;
          hint.textContent = n ? T(n === 1 ? '1 linha riscada. Quando terminar, toque em Conferir.' : n + ' linhas riscadas. Quando terminar, toque em Conferir.') : T('Toque numa linha para riscar. Toque de novo para desfazer.');
        });
        l.b = b; l.tx = tx; l.extra = extra;
        doc.appendChild(b);
      });
      root.appendChild(doc);

      const hint = el('div', 'mg-hint', T('Toque numa linha para riscar. Toque de novo para desfazer.'));
      root.appendChild(hint);
      const fb = el('div', 'mg-feedback info');
      fb.hidden = true;
      root.appendChild(fb);
      let checked = false;

      const conferir = api.btn('Conferir ✔', () => {
        if (checked) return;
        checked = true;
        let caught = 0, falsos = 0;
        linhas.forEach((l) => {
          l.b.disabled = true;
          l.b.classList.remove('on');
          l.extra.innerHTML = '';
          if (l.bad && l.struck) {
            caught++;
            l.b.classList.add('ok');
            l.extra.appendChild(el('span', 'c9-fix', T(l.fix)));
            l.extra.appendChild(el('span', 'c9-why', [el('span', 'c9-tag ok', 'Bem riscada'), T(l.why)]));
          } else if (l.bad) {
            l.b.classList.add('missed');
            l.extra.appendChild(el('span', 'c9-fix', T(l.fix)));
            l.extra.appendChild(el('span', 'c9-why', [el('span', 'c9-tag miss', 'Passou'), T(l.why)]));
          } else if (l.struck) {
            falsos++;
            l.b.classList.remove('strike');
            l.b.classList.add('kept');
            l.extra.appendChild(el('span', 'c9-why', [el('span', 'c9-tag info', 'Pode ficar'), T(l.why)]));
          } else {
            l.b.classList.add('good');
          }
        });
        G.v.plano = { caught, falsos, total: nBad };
        hint.hidden = true;
        fb.hidden = false;
        if (caught === nBad && !falsos) {
          fb.className = 'mg-feedback ok';
          fb.textContent = T('Revisão perfeita: ' + caught + ' de ' + nBad + ' problemas riscados, nenhuma linha boa cortada.');
          api.say('Caneta afiada. Eu ignorei o seu pedido, prometi demais e esqueci um limite. Você pegou tudo.', 'faisca');
          api.sfx('success');
          fa(G, 'celebrate', 1.6);
        } else {
          fb.className = 'mg-feedback warn';
          fb.textContent = T('Você riscou ' + caught + ' de ' + nBad + ' problemas.' + (falsos ? ' E cortou ' + (falsos === 1 ? 'uma linha boa' : falsos + ' linhas boas') + ': acontece, e agora você sabe por que ela podia ficar.' : '') + ' As correções já estão no plano.');
          api.say('Corrigi o que passou. Repare: eu errei com a maior cara de plano bem-feito. É por isso que quem assina é você.', 'faisca');
          api.sfx('confirm');
          fa(G, 'ashamed', 1.4);
        }
        conferir.hidden = true;
        assinar.hidden = false;
        assinar.focus({ preventScroll: true });
        api.timeout(() => { try { fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 60);
      }, { cls: 'primary', key: String(linhas.length + 1) });
      const assinar = api.btn('Assinar o plano ✍️', () => { api.sfx('confirm'); done(G.v.plano); }, { cls: 'primary', key: String(linhas.length + 1) });
      assinar.hidden = true;
      root.appendChild(el('div', 'mg-actions', [conferir, assinar]));
    }, { title: 'O plano de 4 semanas · caneta vermelha', size: 'l' });
  }

  // ------------------------------------------------------------------
  // Minigame 2: a aula (ensina → pergunta → explica de novo)
  // ------------------------------------------------------------------
  function miniAula(G, c) {
    return G.mini((root, done, api) => {
      css();
      const T = api.t;
      const { el } = api;
      const perguntas = c.aula;
      const total = perguntas.length;
      let idx = 0, acertos = 0;
      const marks = [];
      api.say('Eu explico, depois pergunto. Errou? Eu explico de novo, de outro jeito. Sem nota vermelha e sem relógio.', 'faisca');

      const top = el('div', 'c9-top');
      const lbl = el('div', 'mg-label');
      const dots = el('div', 'c9-dots');
      perguntas.forEach(() => dots.appendChild(el('i')));
      top.appendChild(lbl);
      top.appendChild(dots);
      root.appendChild(top);

      const chalk = el('div', 'c9-chalk');
      const chalkHead = el('div', 'mg-label');
      const chalkTx = el('div', 'c9-chalk-tx');
      chalk.appendChild(chalkHead);
      chalk.appendChild(chalkTx);
      root.appendChild(chalk);

      const qEl = el('div', 'c9-q');
      root.appendChild(qEl);
      const ops = el('div', 'c9-ops');
      root.appendChild(ops);
      const fb = el('div', 'mg-feedback');
      fb.hidden = true;
      root.appendChild(fb);

      let alt = 0, first = true, answered = false;
      const deNovo = api.btn('🔁 Explica de outro jeito', () => explicar(true), { key: '4' });
      const proxima = api.btn('Próxima ▶', () => avancar(), { cls: 'primary', key: '5' });
      proxima.hidden = true;
      root.appendChild(el('div', 'mg-actions c9-actions', [deNovo, proxima]));

      function board(p) {
        G.sceneParams({ lines: [c.curto, (idx + 1) + '. ' + p.quadro] });
      }
      function explicar(pedido) {
        const p = perguntas[idx];
        if (pedido) {
          alt = (alt + 1) % p.ensina.length;
          G.v.repetiu = (G.v.repetiu || 0) + 1;
          api.say(DE_NOVO[(G.v.repetiu - 1) % DE_NOVO.length], 'faisca');
          api.sfx('page');
          fa(G, 'teach', 1.6);
        }
        chalkHead.innerHTML = '';
        chalkHead.appendChild(el('span', null, alt === 0 ? '🧑‍🏫 A Faísca explica' : '🧑‍🏫 De outro jeito'));
        if (alt > 0) chalkHead.appendChild(el('span', 'c9-alt', 'Exemplo ' + (alt + 1)));
        chalkTx.innerHTML = '';
        chalkTx.appendChild(api.rich(T(p.ensina[alt]), true));
        chalkTx.classList.remove('swap');
        void chalkTx.offsetWidth;
        chalkTx.classList.add('swap');
      }
      function render() {
        const p = perguntas[idx];
        alt = 0; first = true; answered = false;
        lbl.textContent = 'Pergunta ' + (idx + 1) + ' de ' + total;
        Array.from(dots.children).forEach((d, i) => { d.className = marks[i] || (i === idx ? 'cur' : ''); });
        explicar(false);
        board(p);
        qEl.textContent = T(p.q);
        ops.innerHTML = '';
        fb.hidden = true;
        proxima.hidden = true;
        deNovo.hidden = false;
        api.shuffle(p.ops).forEach((o, i) => {
          const b = el('button', 'mg-card c9-op', [el('span', 'c9-num', String(i + 1)), el('span', 'c9-body', T(o.t))]);
          b.type = 'button';
          b.dataset.key = String(i + 1);
          b.addEventListener('click', () => responder(o, b));
          ops.appendChild(b);
        });
        if (idx > 0) api.timeout(() => { try { root.parentNode.scrollTop = 0; } catch (e) { /* nada */ } }, 0);
      }
      function responder(o, b) {
        if (answered || b.disabled) return;
        fb.hidden = false;
        if (o.ok) {
          answered = true;
          if (first) acertos++;
          marks[idx] = first ? 'ok' : 'help';
          dots.children[idx].className = marks[idx];
          b.classList.add('ok');
          Array.from(ops.children).forEach((x) => { x.disabled = true; if (x !== b && !x.classList.contains('bad')) x.classList.add('dim'); });
          fb.className = 'mg-feedback ok';
          fb.innerHTML = '';
          fb.appendChild(api.rich('*' + (first ? ACERTOS_FALA(idx) : 'Agora foi.') + '* ' + T(o.why), true));
          api.say(first ? 'Na primeira. Gostei.' : 'Viu? Mais uma explicação e pronto. É assim que se aprende.', 'faisca');
          api.sfx('success');
          fa(G, first ? 'celebrate' : 'jump', 1.3);
          proxima.textContent = '';
          proxima.appendChild(el('span', 'kbd', '5'));
          proxima.appendChild(document.createTextNode(idx + 1 < total ? ' Próxima ▶' : ' Terminar a aula ▶'));
          proxima.hidden = false;
          api.timeout(() => { try { proxima.focus({ preventScroll: true }); fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 60);
        } else {
          first = false;
          b.classList.add('bad');
          b.disabled = true;
          fb.className = 'mg-feedback info';
          fb.innerHTML = '';
          fb.appendChild(api.rich(T(o.why) + ' *Tenta de novo, sem pressa.*', true));
          api.say(ERROU[idx % ERROU.length], 'faisca');
          api.sfx('cancel');
          fa(G, 'think', 1.3);
          // nova analogia no quadro, sem contar como "pedido"
          const p = perguntas[idx];
          alt = (alt + 1) % p.ensina.length;
          chalkHead.innerHTML = '';
          chalkHead.appendChild(el('span', null, '🧑‍🏫 De outro jeito'));
          chalkHead.appendChild(el('span', 'c9-alt', 'Exemplo ' + (alt + 1)));
          chalkTx.innerHTML = '';
          chalkTx.appendChild(api.rich(T(p.ensina[alt]), true));
          chalkTx.classList.remove('swap');
          void chalkTx.offsetWidth;
          chalkTx.classList.add('swap');
          api.timeout(() => { try { fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* nada */ } }, 60);
        }
      }
      function avancar() {
        if (!answered) return;
        idx++;
        if (idx >= total) { done({ acertos, total }); return; }
        api.sfx('page');
        render();
      }
      render();
    }, { title: 'Aula 1 · ' + c.nome, size: 'l' });
  }
  const ACERTOS_FALA = (i) => ACERTOU[i % ACERTOU.length];

  // ------------------------------------------------------------------
  // Falas que dependem do prólogo (ceticismo da manhã)
  // ------------------------------------------------------------------
  function ceticismoDaManha() {
    const pv = (P2.save && P2.save.data && P2.save.data.progress && P2.save.data.progress.vars && P2.save.data.progress.vars.prologo) || {};
    return {
      modinha: 'Eu, que hoje de manhã chamei isso de modinha.',
      inventou: 'Eu, que hoje de manhã jurava que ela só inventava número.',
      caneta: 'Eu, o homem do papel e da caneta.',
    }[pv.ceticismo] || 'Eu, que até ontem nem queria ouvir falar disso.';
  }

  /** Monta a aula imaginada (cena + atores) com o pai sentado na carteira. */
  function montaAula(G, lines) {
    const c = curso(G);
    G.scene('aula', { tema: c.tema, lines: lines || [c.curto] });
    G.pai.at('aluno').setAnim('sit');
    G.pai.setExpr('pensativo');
    G.faisca.at('faisca').setAnim('teach');
    G.faisca.face(G.pai);
    G.player.fp();
    G.music('aula');
  }

  P2.chapter({
    id: 'cap9',
    num: 'Capítulo 9',
    title: 'Aprender Qualquer Coisa',
    subtitle: 'Uma aula particular às dez da noite, com a professora mais paciente do mundo',
    music: 'aula',
    minutes: 8,
    parts: [
      // ------------------------------------------------------------------
      // 1. Sala, 21h30: o pedido da Dona Marta, {filho} sai, a escolha da matéria
      // ------------------------------------------------------------------
      async (G) => {
        await G.titleCard();
        G.scene('sala', { tv: 'off', lamp: true });
        G.music('casa');
        G.hud.set({ clock: '21:30' });
        G.pai.at('janela').setAnim('idle');
        G.pai.setExpr('cansado');
        G.player.cine();
        await G.cam.focus(G.pai, 'plano', { dur: 0, yaw: G.pai.rot + Math.PI + 0.45, pitch: 0.1 });
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          await G.narrate('Nove e meia da noite. Lá fora, a cidade acesa. Aqui dentro, o dia ainda não terminou de passar.');
          bg(G.cam.focus(G.pai, 'medio', { dur: 3.5, yaw: G.pai.rot + Math.PI + 0.35, pitch: 0.06 }));
          G.sfx('notify');
          G.toast('*Dona Marta:* Amanhã, depois do trimestre, me dê 5 minutos sobre IA. O conselho quer entender o que é e como a empresa vai usar. Sem jargão, por favor. 🙂', { icon: '💬', kind: 'notif', dur: 8 });
          bg(G.pai.play('lookphone', 2.4));
          await G.wait(2.2);
        });
        await G.fadeOut(0.35);
        G.player.fp();
        G.player.setLook(0.02);
        await G.fadeIn(0.4);
        await G.think('pai', 'Cinco minutos sobre IA. Para o conselho. Sem jargão.', { expr: 'pensativo' });
        await G.think('pai', ceticismoDaManha());

        // {filho} se despede (o Cap 10 começa com a casa vazia)
        G.filho.at('porta').setAnim('idle');
        G.filho.setExpr('feliz');
        G.sfx('door');
        G.player.lookAt(G.filho);
        await G.filho.walk(PERTO_DA_PORTA);
        G.filho.face(G.pai);
        await G.say('filho', '{apelido}, tô indo no aniversário do Gui. Volto tarde.', { expr: 'feliz', anim: 'wave' });
        G.filho.setAnim('idle');
        await G.say('pai', 'Juízo. E manda mensagem quando chegar.', { expr: 'neutro' });
        await G.say('filho', 'Mando. Que cara é essa?', { expr: 'preocupado' });
        await G.say('pai', 'A Dona Marta quer cinco minutos sobre IA no conselho. Amanhã.');
        await G.say('filho', 'E você vai dizer o quê?', { expr: 'surpreso' });
        await G.say('pai', 'Que é um estagiário rápido que fala besteira com confiança. Aí sobram quatro minutos e meio.', { expr: 'desconfiado' });
        G.filho.play('laugh', 1.2);
        await G.say('filho', 'Pede uma aula para ela. Ela tem paciência de professor de cursinho, sem a parte de olhar o relógio.', { expr: 'rindo' });
        await G.say('pai', 'Aula particular, às dez da noite, na minha idade?', { expr: 'desconfiado' });
        await G.say('filho', 'Você vive dizendo que um dia volta pro violão. E que o seu inglês trava na hora de negociar.', { expr: 'amigavel' });
        await G.say('pai', 'Não trava. Hesita.', { expr: 'orgulhoso' });
        await G.say('filho', 'Então. Escolhe um. Ela não cobra hora-aula. Tchau, {apelido}!', { expr: 'rindo', anim: 'wave' });
        G.filho.emote('heart', 1.4);
        const sai = G.filho.walk('porta').then(() => { G.sfx('door'); return G.filho.fadeOut(0.3); }).then(() => G.filho.remove());
        bg(sai);
        await G.wait(0.6);

        // a Faísca aparece do celular
        G.faisca.follow(G.pai);
        G.faisca.setAnim('enter');
        G.sfx('sparkle');
        G.fx.sparkles(G.faisca);
        G.player.lookAt(G.faisca);
        await G.wait(0.9);
        G.faisca.setAnim('idle');
        await G.say('faisca', '{filho} tem razão numa coisa: eu não olho o relógio. E pergunta repetida é a minha favorita.');
        await G.say('pai', 'Pergunta repetida é a minha especialidade. Na diretoria, chamam de cobrança.', { expr: 'rindo' });
        fa(G, 'jump', 1);
        await sai;

        await G.explore({
          objetivo: 'Dê uma olhada na sala e sente no sofá',
          hotspots: [
            {
              id: 'vitrola', label: 'Os discos', icon: '🎶', pos: VITROLA, optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Bossa nova. Na faculdade eu tinha um violão. Três acordes e uma serenata desafinada.');
                await G.think('pai', 'Aí veio a empresa, e o violão foi morar no armário. Está lá até hoje, esperando.');
              },
            },
            {
              id: 'livro', label: 'O livro de inglês', icon: '📕', pos: LIVRO, optional: true,
              onInteract: async (G) => {
                await G.think('pai', '“Inglês para negociações”. Marcador no capítulo dois. Há três anos.');
                await G.think('pai', 'Na hora do preço, eu sei o que quero dizer. A frase é que chega atrasada.');
              },
            },
            {
              id: 'celular', label: 'A mensagem da Dona Marta', icon: '📱', pos: CELULAR, optional: true,
              onInteract: async (G) => {
                await G.think('pai', '“Sem jargão, por favor.” Ela sabe que metade do conselho também não sabe.');
                await G.think('pai', 'E eu não vou ser o CEO que responde “é uma caixa-preta”.');
              },
            },
            { id: 'sofa', label: 'Sentar no sofá', icon: '🛋️', at: 'sofa1' },
          ],
        });

        await G.fadeOut(0.35);
        G.pai.at('sofa1').setAnim('sit');
        G.pai.setExpr('neutro');
        G.faisca.unfollow();
        G.faisca.at('faisca').setAnim('idle');
        G.faisca.face(G.pai);
        G.player.setLook(-0.05);
        await G.fadeIn(0.4);
        G.player.lookAt(G.faisca);
        await G.say('faisca', 'Então: quinze minutos, uma matéria. Você escolhe.', { anim: 'teach' });
        const escolha = await G.choose([
          { text: '🎸 Violão', sub: 'Voltar aos três acordes da faculdade. E passar do terceiro.', value: 'violao' },
          { text: '🌎 Inglês para negociar', sub: 'Pedir, recusar e ganhar tempo, sem hesitar.', value: 'ingles' },
          { text: '🧠 Como a IA funciona por dentro', sub: 'Para os 5 minutos do conselho, sem jargão.', value: 'ia' },
        ], { prompt: 'O que você quer aprender hoje?', who: 'pai' });
        G.v.curso = escolha;
        G.v.repetiu = 0;
        G.stats({ curso: escolha });
        if (escolha === 'violao') {
          await G.say('pai', 'O violão. Antes que ele desafine de vez.', { expr: 'sem_graca' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'Que delícia. Aviso logo: eu não vejo a sua mão. Já, já te digo o que fica comigo e o que fica com um professor.');
        } else if (escolha === 'ingles') {
          await G.say('pai', 'Inglês. Cansei de hesitar na hora do preço.', { expr: 'determinado' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'Adoro. Ensaio de negociação é das coisas que eu faço melhor: posso ser o fornecedor mais chato do mundo.');
        } else {
          await G.say('pai', 'Como você funciona. Se vou falar de você para o conselho, quero saber o que tem dentro da caixa.', { expr: 'determinado' });
          fa(G, 'celebrate', 1.4);
          await G.say('faisca', 'Justo. Ninguém assina o que não entende. Prometo explicar sem jargão. Bom, quase nenhum.');
        }
        await G.say('faisca', 'Fecha os olhos um segundo. Vou te levar para uma sala de aula. Imaginária, mas com carteira e tudo.', { anim: 'teach' });
        await G.say('pai', 'Se tiver chamada, eu saio.', { expr: 'desconfiado' });
        G.sfx('magic');
        G.fx.sparkles(G.faisca);
        fa(G, 'spin', 1.2);
        G.flash('#fff2dc', 0.5);
        await G.fadeOut(0.9, '#fff8ec');
      },

      // ------------------------------------------------------------------
      // 2. A aula imaginada: o plano de 4 semanas (a IA rascunha, ele corrige)
      // ------------------------------------------------------------------
      async (G) => {
        const c = curso(G);
        montaAula(G, [c.curto]);
        G.player.cine();
        await G.cam.shot('geral', 0);
        await G.fadeIn(1.2);
        await G.cutscene(async () => {
          bg(G.cam.shot('aluno', 5.5));
          await G.narrate('Uma sala de aula de mentira, debaixo de um céu de verdade.');
          await G.narrate('Ele não sentava numa carteira desde o cursinho. A carteira, pelo visto, encolheu.');
        });
        await G.fadeOut(0.35);
        G.player.fp();
        G.player.lookAt(QUADRO_OLHAR);
        await G.fadeIn(0.45);
        await G.say('pai', 'Turma pequena.', { expr: 'desconfiado' });
        await G.say('faisca', 'Só você. Aqui ninguém ri de pergunta. Nem eu. Principalmente eu.', { anim: 'teach' });
        await G.say('pai', 'Na empresa, quem pergunta demais parece que não sabe.', { expr: 'pensativo' });
        await G.say('faisca', 'Aqui, quem pergunta demais aprende mais rápido. E fica entre nós.');
        await G.say('faisca', 'Primeiro, o plano. Você pede do jeito certo: a matéria, o tempo por dia, o prazo e uma meta pequena por semana. Eu rascunho. A caneta é sua.');
        G.player.lookAt(QUADRO_OLHAR);
        const r = await miniPlano(G, c);
        G.sceneParams({ lines: c.quadroPlano });
        if (r && r.caught === r.total && !r.falsos) {
          await G.say('pai', 'Uma hora por dia? Fluente em um mês? Você tem futuro em agência de publicidade.', { expr: 'rindo' });
          fa(G, 'ashamed', 1.4);
          await G.say('faisca', 'Fui pega no flagra. Rascunho que promete demais é o mais perigoso: parece bom.');
        } else {
          await G.say('pai', 'Esse rascunho veio otimista.', { expr: 'desconfiado' });
          fa(G, 'ashamed', 1.4);
          await G.say('faisca', 'Veio. Rascunho que promete demais é o mais perigoso: parece bom. Por isso a caneta é sua.');
        }
        await G.say('pai', 'Quinze minutos eu tenho. Eu perco quinze minutos por dia procurando a caneta.', { expr: 'rindo' });
        await G.fadeOut(0.5);
      },

      // ------------------------------------------------------------------
      // 3. A aula: ela explica, pergunta e explica de novo
      // ------------------------------------------------------------------
      async (G) => {
        const c = curso(G);
        montaAula(G, [c.curto, 'Aula 1']);
        G.player.lookAt(QUADRO_OLHAR);
        await G.fadeIn(0.5);
        await G.say('faisca', 'Primeira aula. Cinco perguntas. Pode pedir para eu explicar de novo quantas vezes quiser: é o botão 🔁.', { anim: 'teach' });
        await G.say('pai', 'Sem relógio e sem suspiro. Isso, sim, é inteligência artificial.', { expr: 'rindo' });
        G.player.lookAt(QUADRO_OLHAR);
        const r = (await miniAula(G, c)) || { acertos: 0, total: c.aula.length };
        G.stats({ curso: G.v.curso || 'ia', acertos: r.acertos, total: r.total });
        G.sceneParams({ lines: c.quadroFim });
        const nota10 = r.acertos === r.total;
        if (nota10) {
          G.achieve('aluno_nota_10');
          G.sfx('jingle_vitoria');
          G.fx.confetti(G.faisca);
          fa(G, 'celebrate', 2);
          await G.say('faisca', 'Cinco de cinco, de primeira. Sem colar: eu vi.', { expr: 'feliz' });
          await G.say('pai', 'Trinta anos lendo relatório de diretor. Pegadinha eu conheço.', { expr: 'orgulhoso' });
        } else {
          fa(G, 'jump', 1.2);
          await G.say('faisca', r.acertos + ' de ' + r.total + ' de primeira. As outras vieram depois de uma explicação a mais. É exatamente assim que se aprende.');
          await G.say('pai', 'No cursinho, explicação a mais custava hora extra.', { expr: 'rindo' });
        }
        const rep = G.v.repetiu || 0;
        if (rep > 0) {
          await G.say('faisca', rep === 1 ? 'E você me pediu para explicar de novo uma vez. Adorei.' : 'E você me pediu para explicar de novo ' + rep + ' vezes. Adorei todas.', { anim: 'teach' });
        } else {
          await G.say('faisca', 'Da próxima vez, usa o 🔁 sem cerimônia. Pergunta repetida não me cansa.');
        }
        if (G.v.curso === 'violao') {
          await G.say('faisca', 'E combinado: a teoria, o plano e a cobrança ficam comigo. A sua mão no braço do violão, um professor olha.');
        } else if (G.v.curso === 'ingles') {
          await G.say('faisca', 'Combinado: eu treino com você todo dia. Um professor, de vez em quando, para a pronúncia que eu deixo passar.');
        } else {
          await G.say('faisca', 'Saber como eu funciono não é desconfiar de tudo. É saber o que conferir.');
        }
        // por cima do ombro: o quadro com a aula inteira
        await G.fadeOut(0.35);
        G.player.cine();
        await G.cam.shot('aluno', 0);
        await G.fadeIn(0.5);
        await G.cutscene(async () => {
          bg(G.cam.shot('quadro', 5));
          await G.narrate('Quatro linhas de giz. E uma ideia que ele não esperava ter às dez da noite: ainda dá tempo.');
        });
        G.sfx('whoosh');
        await G.fadeOut(0.8, '#fff8ec');
      },

      // ------------------------------------------------------------------
      // 4. De volta à sala: quando praticar, a frase do conselho, o fecho
      // ------------------------------------------------------------------
      async (G) => {
        const c = curso(G);
        G.scene('sala', { tv: 'off', lamp: true });
        G.music('casa');
        G.hud.set({ clock: '22:05' });
        G.pai.at('sofa1').setAnim('sit');
        G.pai.setExpr('feliz');
        G.faisca.at('faisca').setAnim('idle');
        G.faisca.face(G.pai);
        G.player.fp();
        G.player.setLook(-0.05);
        await G.fadeIn(0.8);
        G.player.lookAt(G.faisca);
        await G.narrate('De volta ao sofá. Ninguém viu ele sentado numa carteira. Melhor assim.');
        await G.say('faisca', 'Quando você vai praticar? Escolhe um horário que sobreviva a uma terça-feira como a de hoje.');
        const quando = await G.choose([
          { text: 'De manhã, com o café', sub: 'Antes de o dia me engolir.', value: 'manha' },
          { text: 'No almoço, entre uma reunião e outra', sub: 'Bloqueado na agenda, como cliente importante.', value: 'almoco' },
          { text: 'À noite, depois do jornal', sub: 'Quinze minutos, sem celular de trabalho.', value: 'noite' },
        ], { prompt: 'Quinze minutos por dia. Quando?', who: 'pai' });
        G.v.quando = quando;
        fa(G, 'jump', 1);
        if (quando === 'manha') await G.say('faisca', 'De manhã costuma funcionar: o dia ainda não te pegou. E o café de todo dia vira o lembrete.');
        else if (quando === 'almoco') await G.say('faisca', 'Boa. Bloqueia na agenda, com nome e tudo. Compromisso marcado é compromisso cumprido.');
        else await G.say('faisca', 'Combinado. Só não deixa virar mais uma reunião no fim do dia. Faltou um dia? Recomeça no outro.');

        // os cinco minutos da Dona Marta
        await G.say('pai', 'Agora, os cinco minutos da Dona Marta.', { expr: 'pensativo' });
        if (G.v.curso !== 'ia') {
          await G.say('faisca', 'A aula de hoje foi outra, então te dou o resumo: como eu funciono, em cinco frases.');
          await G.aiChat([
            { from: 'voce', text: 'Explique como a IA funciona em 5 frases, sem jargão, para o conselho de uma empresa.' },
            { from: 'ia', text: '- Ela prevê a próxima palavra a partir de padrões de muitos textos: por isso escreve tão bem.\n- Foi treinada como aluno em prova, em que chutar vale ponto: por isso às vezes inventa com confiança.\n- Tende a concordar com quem pergunta: por isso vale pedir o contra.\n- Só sabe da empresa o que a gente conta, e o que a gente conta pode ficar guardado.\n- Pode estar desatualizada, a não ser que pesquise na internet.', thinking: 1.3 },
            { from: 'nota', text: 'Leia uma vez em voz alta. Se perguntarem algo fora daqui: “Boa pergunta. Vou conferir.”' },
          ], { title: 'Faísca' });
        } else {
          await G.say('faisca', 'Você acabou de ter a aula. Agora é só dizer do seu jeito.');
        }
        const frase = await G.choose([
          { text: '“Ela prevê a próxima palavra. Escreve muito bem e às vezes chuta com confiança. Por isso, aqui, a gente confere.”', sub: 'Didático', value: 'didatico' },
          { text: '“É um estagiário muito rápido que às vezes fala besteira com confiança. A gente usa, confere e assina.”', sub: 'Do seu jeito', value: 'estagiario' },
          { text: '“O rascunho é dela. A assinatura é nossa.”', sub: 'Curto e grosso', value: 'curto' },
        ], { prompt: 'Como você abre os 5 minutos no conselho?', who: 'pai' });
        G.v.frase = frase;
        if (frase === 'didatico') {
          fa(G, 'celebrate', 1.3);
          await G.say('faisca', 'Clara e honesta. A Dona Marta vai gostar do “sem jargão”.');
        } else if (frase === 'estagiario') {
          fa(G, 'celebrate', 1.3);
          await G.say('faisca', 'Roubou o meu bordão! Pode usar. Sem direitos autorais.', { expr: 'feliz' });
        } else {
          fa(G, 'celebrate', 1.3);
          await G.say('faisca', 'Curto e grosso. Cabe num slide, e ninguém esquece.');
        }
        await G.say('pai', 'Depois disso, eu digo o que a empresa vai fazer. Mas isso eu decido amanhã, com café.', { expr: 'determinado' });

        // honestidade: hoje foi o primeiro dia
        await G.say('faisca', 'Uma coisa honesta antes de você dormir: hoje foi o primeiro dia. Pegar o jeito leva umas dez horas de uso de verdade, em tarefa real.');
        await G.say('pai', 'Dez horas. Menos que um voo para a Europa.', { expr: 'pensativo' });
        await G.say('faisca', 'E tem uma vantagem sua: eu ajudo mais quem sabe julgar a resposta. Trinta anos de estrada contam a favor, não contra.', { anim: 'teach' });
        await G.say('faisca', 'Até o presidente da Nvidia diz que tem um tutor de IA. Claro: ele vende chip para IA. Desconto aplicado.');
        await G.say('pai', 'Gostei do desconto. É o primeiro vendedor de tecnologia que me oferece um.', { expr: 'rindo' });
        await G.say('faisca', 'Os pedidos de hoje, o do plano e o da aula com analogias, estão no seu Guia do CEO, no botão 📘. É só trocar o tema.');
        if (G.flag('aposta')) {
          await G.say('faisca', 'E, só para constar no processo da louça: hoje eu dei aula de graça.');
          await G.say('pai', 'Anotado. Não muda nada. Ainda.', { expr: 'desconfiado' });
        }
        await G.say('pai', 'Obrigado pela aula, professora.', { expr: 'amigavel' });
        fa(G, 'wave', 1.2);
        await G.say('faisca', 'Amanhã, quinze minutos. Eu cobro.', { expr: 'feliz' });
        await G.say('pai', 'Cobrança. Agora você está falando a minha língua.', { expr: 'rindo' });
        // passa o bastão para o Cap 10: a TV liga num jogo reprisado
        G.player.lookAt({ x: 0, y: 1.3, z: 2.35 });
        await G.wait(0.5);
        G.sfx('click');
        G.sceneParams({ tv: 'on' });
        G.hud.set({ clock: '22:12' });
        await G.narrate('Ele liga a TV num jogo reprisado. Por hoje, a cabeça já aprendeu o bastante.');
        await G.fact(['tutor_ia', 'mollick_10_horas'], { titulo: 'Professor particular, com ressalvas' });
        await G.lesson('Nunca é tarde. Ela tem paciência infinita para pergunta repetida. O que ela não vê, um professor vê. E a prática é sua.', { titulo: 'Aprender qualquer coisa' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const s = (G.allStats() || {}).cap9 || {};
      const v = G.v || {};
      const c = CURSOS[s.curso || v.curso] || CURSOS.ia;
      const out = ['Aula particular: ' + c.nome];
      if (s.total) out.push('Perguntas: ' + s.acertos + ' de ' + s.total + ' de primeira' + (s.acertos === s.total ? ' — nota 10 ✔' : ' (as outras, depois de uma explicação a mais)'));
      if (v.plano) out.push('Plano de 4 semanas revisado a caneta: ' + v.plano.caught + ' de ' + v.plano.total + ' problemas riscados');
      if (v.repetiu) out.push('Pediu para explicar de novo ' + v.repetiu + (v.repetiu === 1 ? ' vez' : ' vezes') + '. Ninguém suspirou.');
      return out.map((l) => G.t(l));
    },
  });
})();

/* PAI 2.0 — Prólogo: "Terça-feira, 6h47"
 * O despertador, a avalanche de avisos, o trato com {filho} e a chegada
 * da Faísca. Objetivo do capítulo: empatia com o cansaço do pai, respeito
 * ao ceticismo dele, o trato honesto e uma primeira vitória pequena.
 */
(function () {
  'use strict';
  const P2 = window.P2;

  const AVISOS = [
    ['📧', '*47 e-mails* não lidos', 'email'],
    ['💬', 'Dona Marta (conselho): "Bom dia! Preciso do relatório trimestral até as *10h*."', 'notif'],
    ['📎', 'Tadeu (jurídico): "Contrato do fornecedor, *80 páginas*. Preciso do seu OK hoje."', 'notif'],
    ['📅', 'Reunião de diretoria — *14h*', 'notif'],
    ['💡', 'Conta de luz: *R$ 412,00* — vence sexta', 'money'],
    ['👥', 'Empresários do Bairro: *312 mensagens* novas', 'notif'],
  ];

  P2.chapter({
    id: 'prologo',
    num: 'Prólogo',
    title: 'Terça-feira, 6h47',
    subtitle: 'O despertador, a agenda lotada e um trato à mesa do café',
    music: null,
    minutes: 7,
    parts: [
      // ------------------------------------------------------------------
      // 1. Quarto: acordar, a avalanche, levantar
      // ------------------------------------------------------------------
      async (G) => {
        await G.titleCard();
        G.scene('quarto', { clock: '06:47', alarm: true, phoneLit: true, time: 'amanhecer' });
        G.pai.at('cama').setAnim('sleep');
        G.pai.setExpr('cansado');
        G.player.fp();
        G.player.setLook(1.05);
        G.music(null);
        const alarme = G.sfx('alarm', { loop: true });
        await G.fadeIn(1.6);
        await G.cutscene(async () => {
          await G.think('pai', 'Seis e quarenta e sete.', { expr: 'cansado' });
          await G.think('pai', 'Mais cinco minutos. Só cinco.');
          G.player.setLook(0.35, null);
          for (const [ic, tx, kind] of AVISOS) {
            G.toast(tx, { icon: ic, kind, dur: 5 });
            await G.wait(0.55);
          }
          G.shake(2, 0.5);
          await G.wait(0.6);
          await G.think('pai', 'Antes das sete. Isso deveria ser proibido por lei.');
        });
        if (alarme) alarme.stop();
        G.sceneParams({ alarm: false });
        G.sfx('click');
        await G.narrate('O despertador perdeu a briga. A agenda, não.');
        // de pé — plano de cinema para conhecer o protagonista
        await G.fadeOut(0.45);
        G.pai.at('beira_cama').setAnim('sit');
        G.pai.setExpr('cansado');
        G.player.cine();
        await G.cam.focus(G.pai, 'plano', { dur: 0, angle: 0.35, pitch: 0.12 });
        await G.fadeIn(0.8);
        G.music('manha');
        await G.cutscene(async () => {
          await G.narrate('Este é {pai}. Muitos anos de estrada, uma empresa nas costas e um bigode que já viu de tudo.');
          G.pai.play('stretch', 1.6);
          await G.wait(1.2);
          await G.narrate('Ele não é contra novidade. Ele é contra perder tempo. São coisas diferentes — e ele faz questão de lembrar.');
        });
        await G.fadeOut(0.4);
        G.pai.at('lado_cama').setAnim('idle');
        G.player.fp();
        await G.fadeIn(0.6);
        await G.card({
          kind: 'info', kicker: 'Como andar', icon: '🧭', titulo: 'Você é o {pai}',
          texto: '- *Olhar em volta:* arraste a tela (ou o mouse).\n- *Andar:* setas do teclado ou W A S D. No celular, o controle redondo.\n- *Mais fácil ainda:* toque no botão *"Ir até lá ▶"* ou no nome do que você quer, e ele vai sozinho.\n- *Conversar e avançar o texto:* toque na caixa de texto ou aperte Espaço.',
          botao: 'Entendi',
        });
        await G.explore({
          objetivo: 'Levante e vá até a cozinha',
          hotspots: [
            {
              id: 'celular', label: 'Ver o celular', icon: '📱', at: 'lado_cama', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'Quarenta e sete e-mails. Metade é "só para conhecimento". A outra metade é "para ontem".');
                await G.think('pai', 'E o grupo dos empresários com trezentas mensagens. Aposto que o Jorge mandou cem.');
              },
            },
            {
              id: 'janela', label: 'Olhar pela janela', icon: '🌅', at: 'janela', optional: true,
              onInteract: async (G) => {
                await G.think('pai', 'O dia nem clareou e já está atrasado.');
              },
            },
            { id: 'porta', label: 'Ir para a cozinha', icon: '☕', at: 'porta' },
          ],
        });
        await G.fadeOut(0.6);
      },

      // ------------------------------------------------------------------
      // 2. Cozinha: o trato
      // ------------------------------------------------------------------
      async (G) => {
        G.scene('cozinha', { time: 'manha', steam: true });
        G.music('manha');
        // mesa3 (lado do fundo): de mesa4, o vaso do centro da mesa tapava quem senta em mesa2
        G.filho.at('mesa3').setAnim('sit').set({ props: { mug: true } });
        G.filho.setExpr('feliz');
        G.pai.at('porta');
        G.player.fp();
        await G.fadeIn(0.8);
        await G.say('filho', 'Bom dia, {apelido}! O café acabou de sair.', { expr: 'feliz' });
        await G.explore({
          objetivo: 'Pegue um café e sente com {filho}',
          hotspots: [
            {
              id: 'cafe', label: 'Pegar um café', icon: '☕', at: 'cafe', optional: true,
              onInteract: async (G) => {
                G.sfx('coffee');
                await G.think('pai', 'Primeiro o café. Depois o mundo.');
              },
            },
            { id: 'filho', label: 'Sentar com {filho}', icon: '🪑', actor: 'filho' },
          ],
        });
        await G.fadeOut(0.35);
        G.pai.at('mesa4').setAnim('sit');
        G.filho.face(G.pai, true);
        await G.fadeIn(0.4);
        G.player.lookAt('filho');
        await G.say('pai', 'Bom dia. Esse café é a única coisa nesta casa que funciona antes das sete.', { expr: 'cansado' });
        await G.say('filho', 'Dormiu mal?', { expr: 'preocupado' });
        await G.say('pai', 'Dormi pouco. Quarenta e sete e-mails, relatório pro conselho às dez, contrato de oitenta páginas e reunião às duas.');
        await G.say('filho', 'E a conta de luz.', { expr: 'sem_graca' });
        await G.say('pai', 'E a conta de luz. Obrigado por lembrar.', { expr: 'desconfiado' });
        await G.say('filho', '{apelido}... posso falar uma coisa sem você revirar o bigode?');
        await G.say('pai', 'Depende da coisa.', { expr: 'desconfiado' });
        await G.say('filho', 'Inteligência artificial. Para te ajudar com esse monte de coisa.', { expr: 'amigavel' });
        const ceticismo = await G.choose([
          { text: '"Isso aí é modinha. Daqui a pouco passa."', value: 'modinha' },
          { text: '"Já testei. Inventou um número que não existia."', value: 'inventou' },
          { text: '"Não sou dessas coisas. Sou do papel e da caneta."', value: 'caneta' },
        ], { prompt: 'O que você responde?', who: 'pai' });
        G.v.ceticismo = ceticismo;
        G.flag('ceticismo', ceticismo); // global: outros capítulos e o chefão podem lembrar disso
        if (ceticismo === 'modinha') {
          await G.say('pai', 'Isso aí é modinha. Daqui a pouco passa.', { expr: 'desconfiado' });
          await G.say('filho', 'Pode ser que muita coisa em volta dela passe. Mas o pessoal que eu conheço não usa para aparecer: usa para ganhar tempo em tarefa chata.');
          await G.say('filho', 'E eu não quero te convencer no papo. Quero que você teste e decida.');
        } else if (ceticismo === 'inventou') {
          await G.say('pai', 'Já testei. Inventou um número que não existia.', { expr: 'bravo' });
          await G.say('filho', 'Inventa mesmo. Acontece. Por isso eu não quero que você acredite nela.', { expr: 'sem_graca' });
          await G.say('filho', 'Quero que você aprenda a conferir o que ela diz. Do jeito que você confere relatório de diretor novo.');
        } else {
          await G.say('pai', 'Não sou dessas coisas, não. Sou do papel e da caneta.', { expr: 'orgulhoso' });
          await G.say('filho', 'Então você vai gostar: dá para pedir falando, em português normal, sem comando nenhum.');
          await G.say('filho', 'E a caneta continua sua. Ela só faz o rascunho.');
        }
        await G.say('pai', 'Hum.', { expr: 'pensativo' });
        await G.say('filho', 'Faz um trato comigo. *Passa um dia com ela.* Se no fim achar inútil, nunca mais toco no assunto.', { expr: 'determinado' });
        const trato = await G.choose([
          { text: '"Fechado. Um dia."', value: 'simples' },
          { text: '"Um dia. E se for inútil, você lava a louça por um mês."', value: 'aposta' },
        ], { prompt: 'O trato:', who: 'pai' });
        if (trato === 'aposta') {
          G.flag('aposta', true);
          await G.say('pai', 'Um dia. E se for inútil, você lava a louça por um mês.', { expr: 'desconfiado' });
          await G.say('filho', 'Fechado. Mas já aviso: eu não vou precisar comprar luva.', { expr: 'rindo' });
        } else {
          G.flag('aposta', false);
          await G.say('pai', 'Fechado. Um dia.', { expr: 'neutro' });
          await G.say('filho', 'É só o que eu peço.', { expr: 'feliz' });
        }
        await G.fadeOut(0.4);
      },

      // ------------------------------------------------------------------
      // 3. A Faísca chega; as regras dele; a primeira vitória
      // ------------------------------------------------------------------
      async (G) => {
        G.scene('cozinha', { time: 'manha', steam: true });
        G.music('manha');
        G.filho.at('mesa3').setAnim('sit').set({ props: { mug: true } });
        G.pai.at('mesa4').setAnim('sit');
        G.filho.face(G.pai, true);
        G.player.fp();
        await G.fadeIn(0.5);
        G.player.lookAt('filho');
        await G.say('filho', 'Me empresta o seu celular um segundo.');
        G.filho.play('lookphone', 1.6);
        G.sfx('sparkle');
        await G.wait(1.2);
        await G.say('filho', 'Pronto. Pode falar com ela.', { expr: 'feliz' });
        await G.cutscene(async () => {
          G.faisca.at('faisca').setAnim('enter');
          G.faisca.face(G.pai, true);
          G.player.lookAt(G.faisca);
          G.sfx('magic');
          G.fx.sparkles(G.faisca, null, null, 24);
          G.flash('#fff2dc', 0.35);
          await G.wait(1.3);
          G.faisca.setAnim('idle');
          G.faisca.emote('heart', 1.4);
        });
        await G.say('faisca', 'Oi! Eu sou a Faísca. Muito prazer, {pai}.');
        G.faisca.play('wave', 1.2);
        await G.say('pai', 'Ela sabe o meu nome.', { expr: 'desconfiado' });
        await G.say('filho', 'Eu que contei. Ela só sabe o que a gente conta para ela.');
        await G.say('faisca', 'Isso. Eu não leio os seus e-mails, não escuto as suas conversas e não adivinho nada. Eu só sei o que você me mostrar.');
        await G.say('faisca', 'E, para ser honesta logo de cara: eu sou tipo *um estagiário muito rápido que às vezes fala besteira com confiança.*');
        G.faisca.play('ashamed', 1.4);
        await G.say('pai', 'Pelo menos é sincera. Já é mais do que muito consultor que eu conheço.', { expr: 'rindo' });
        await G.say('faisca', 'Por isso eu proponho um combinado: eu rascunho, você confere. E a decisão é sempre sua.');
        // As regras dele (autonomia: ele assina)
        await G.mini((root, done, api) => {
          const regras = [
            { k: 'confiro', t: 'Eu confiro.', s: 'Nada que ela disser vale até eu checar.' },
            { k: 'decido', t: 'Eu decido.', s: 'Ela dá opções. A escolha é minha.' },
            { k: 'assino', t: 'Eu assino.', s: 'O que sai com o meu nome passou pelos meus olhos.' },
          ];
          const assinadas = {};
          api.say('Assine as regras do seu dia: toque em cada uma para assinar com a sua caneta.', 'faisca');
          const grid = api.el('div', 'mg-col');
          regras.forEach((r, i) => {
            const b = api.el('button', 'mg-card', [api.el('b', null, '✍️ ' + r.t), api.el('small', null, r.s)]);
            b.type = 'button';
            b.dataset.key = String(i + 1);
            b.addEventListener('click', () => {
              if (assinadas[r.k]) return;
              assinadas[r.k] = true;
              b.classList.add('ok');
              b.querySelector('b').textContent = '✅ ' + r.t + '  — ' + api.t('{pai}');
              api.sfx('confirm');
              if (Object.keys(assinadas).length === regras.length) {
                fim.disabled = false;
                api.say('Assinado. Gostei: são regras de quem manda no próprio trabalho.', 'faisca');
              }
            });
            grid.appendChild(b);
          });
          root.appendChild(grid);
          const fim = api.btn('Pronto ▶', () => done(true), { cls: 'primary', key: '4' });
          fim.disabled = true;
          root.appendChild(api.el('div', 'mg-actions', fim));
        }, { title: 'Minhas regras para hoje' });
        G.faisca.play('celebrate', 1.6);
        await G.say('faisca', 'Combinado: *você confere, você decide, você assina.* Eu fico com a parte chata.');
        // Primeira vitória pequena
        await G.say('faisca', 'Quer ver uma coisinha útil de verdade, rapidinho?');
        const mostrar = await G.choose([
          { text: 'Mostrar só os *assuntos* dos e-mails de hoje', value: 'assuntos', sub: 'Sem abrir conteúdo, sem anexos.' },
          { text: 'Nada de e-mail. Me mostra outra coisa.', value: 'agenda', sub: 'Usar só a agenda de hoje.' },
        ], { prompt: 'O que você deixa ela ver?', who: 'pai' });
        if (mostrar === 'assuntos') {
          await G.say('faisca', 'Só os assuntos já bastam. E foi uma boa escolha mostrar pouco: quanto menos dado sensível, melhor.');
          await G.aiChat([
            { from: 'voce', text: 'Separe estes 47 assuntos de e-mail em: urgente hoje, importante esta semana e pode esperar. Em tópicos curtos. Se tiver dúvida em algum, diga.' },
            { from: 'ia', text: '*Urgente hoje (3)*\n- Relatório trimestral — conselho, prazo 10h\n- Contrato do fornecedor — OK do jurídico hoje\n- "Atraso na entrega" — cliente pedindo resposta\n*Importante esta semana (9)*\n- Orçamento de marketing, avaliação da diretoria, visita do banco…\n*Pode esperar (35)*\n- Newsletters, convites, "só para conhecimento"\n*Dúvida:* "Re: Re: Re: assunto" — não dá para saber só pelo título.', thinking: 1.4 },
            { from: 'nota', text: 'Confira pelo menos um dos "urgentes" antes de confiar na lista.' },
          ], { title: 'Faísca' });
        } else {
          await G.say('faisca', 'Justo. Então eu organizo só a sua agenda de hoje, que você mesmo me dita.');
          await G.aiChat([
            { from: 'voce', text: 'Hoje tenho: relatório do conselho até 10h, contrato do fornecedor, reunião de diretoria 14h e preciso ligar para um cliente que reclamou de atraso. Monte a ordem do dia com blocos de tempo e me diga o que dá para delegar.' },
            { from: 'ia', text: '*Sugestão de ordem*\n- 8h30–9h45: relatório do conselho (o prazo mais duro)\n- 10h–10h20: ligar para o cliente (antes que vire incêndio)\n- 10h30–12h: contrato — leitura dos pontos de risco\n- 14h: reunião de diretoria\n*Dá para delegar:* a primeira leitura do contrato ao jurídico e a coleta de números ao financeiro.\n*Não sei:* quanto tempo o seu jurídico leva. Ajuste se precisar.', thinking: 1.4 },
          ], { title: 'Faísca' });
        }
        const conf = await G.choose([
          { text: 'Conferir: abrir o e-mail do cliente', value: 'conferir' },
          { text: 'Confiar e seguir em frente', value: 'confiar' },
        ], { prompt: 'Antes de seguir…', who: 'pai' });
        if (conf === 'conferir') {
          await G.narrate('Ele abre a mensagem. É mesmo urgente: o cliente quer uma resposta até o meio-dia.');
          await G.say('pai', 'Acertou. Dessa vez.', { expr: 'desconfiado' });
          G.faisca.play('jump', 1);
          await G.say('faisca', '"Dessa vez" é exatamente o espírito. Gostei do seu jeito de conferir.');
        } else {
          G.faisca.play('doubt', 1.2);
          await G.say('faisca', 'Pode. Mas, entre nós: o seu "deixa eu ver" vale mais do que a minha lista. Que tal conferir um, só para criar o hábito?');
          await G.say('pai', 'Um só. Para você não ficar se achando.', { expr: 'rindo' });
          await G.narrate('Ele abre a mensagem do cliente. É urgente mesmo: resposta até o meio-dia.');
          await G.say('pai', 'Acertou. Dessa vez.', { expr: 'desconfiado' });
        }
        if (mostrar === 'assuntos') {
          await G.say('pai', 'Vinte segundos para separar quarenta e sete e-mails. Eu levaria uns quinze minutos.', { expr: 'pensativo' });
        } else {
          await G.say('pai', 'O dia inteiro arrumado em meio minuto. E ainda me disse o que não sabia. Isso é raro até em gente.', { expr: 'pensativo' });
        }
        await G.say('filho', 'E foi só o aquecimento.', { expr: 'orgulhoso' });
        await G.say('filho', 'Eu vou trabalhar daqui a pouco. Hoje à noite você me conta, tá?');
        await G.say('pai', 'Vou contar. Se tiver o que contar.', { expr: 'desconfiado' });
        G.filho.emote('heart', 1.5);
        await G.fact(['google_ipsos', 'google_ipsos_confianca'], { titulo: 'O brasileiro e a IA' });
        await G.lesson('A IA não adivinha: ela só sabe o que você conta. E quem confere, decide e assina é você.', { titulo: 'O combinado do dia' });
        await G.fadeOut(0.8);
      },
    ],
    summary: (G) => {
      const lines = ['Trato fechado: um dia inteiro com a Faísca.', 'Regras assinadas: eu confiro, eu decido, eu assino.'];
      if (G.flag('aposta')) lines.push('Aposta: se for inútil, a louça fica com {filho} por um mês.');
      return lines.map((l) => G.t(l));
    },
  });
})();

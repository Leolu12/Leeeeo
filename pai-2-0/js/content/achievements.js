/* PAI 2.0 — achievements.js — conquistas (edição CEO). */
(function () {
  'use strict';
  const P2 = (window.P2 = window.P2 || {});

  P2.ACHIEVEMENTS = [
    { id: 'mestre_pedido', icon: '🎯', titulo: 'Mestre do Pedido', desc: 'Montou os 3 pedidos certeiros no Capítulo 1.' },
    { id: 'raiz', icon: '✍️', titulo: 'Raiz', desc: 'Fez uma tarefa na mão. Às vezes é o melhor jeito mesmo.' },
    { id: 'caneta_vermelha', icon: '🖊️', titulo: 'Caneta Vermelha', desc: 'Corrigiu todos os erros dos rascunhos da IA no expediente.' },
    { id: 'reputacao_ouro', icon: '🏅', titulo: 'Reputação de Ouro', desc: 'Terminou o expediente com a reputação lá em cima.' },
    { id: 'olho_aguia', icon: '🦅', titulo: 'Olho de Águia', desc: 'Pegou a citação errada do contrato logo de primeira.' },
    { id: 'lupa', icon: '🔍', titulo: 'Lupa', desc: 'Achou a ordem escondida dentro do documento.' },
    { id: 'detector', icon: '🔎', titulo: 'Detector de Lorota', desc: 'Não deixou passar nenhuma lorota no Capítulo 4.' },
    { id: 'contrapeso', icon: '⚖️', titulo: 'Contrapeso', desc: 'Pediu para a IA argumentar contra a sua própria opinião.' },
    { id: 'ata_perfeita', icon: '📝', titulo: 'Ata Perfeita', desc: 'Organizou a reunião inteira sem errar nenhum trecho.' },
    { id: 'conferente', icon: '🧮', titulo: 'Conferente', desc: 'Pegou o erro de conta da IA logo de primeira.' },
    { id: 'estrategista', icon: '♟️', titulo: 'Estrategista', desc: 'Fez o pré-mortem e decidiu com critérios e pesos.' },
    { id: 'dono_da_casa', icon: '🏠', titulo: 'Dono da Casa', desc: 'Tirou 3 estrelas em todas as missões de casa.' },
    { id: 'aluno_nota_10', icon: '🎓', titulo: 'Aluno Nota 10', desc: 'Acertou todas as perguntas da aula particular.' },
    { id: 'nao_caio_mais', icon: '🛡️', titulo: 'Não Caio Mais', desc: 'Desmascarou o falso diretor e a voz clonada de primeira.' },
    { id: 'cofre', icon: '🔐', titulo: 'Cofre Fechado', desc: 'Separou certinho o que pode e o que nunca vai para a IA.' },
    { id: 'diplomata', icon: '🕊️', titulo: 'Diplomata', desc: 'Venceu a Dúvida sem perder nenhum coração de paciência.' },
    { id: 'leitor_de_fontes', icon: '📚', titulo: 'Leitor de Fontes', desc: 'Abriu o link de uma fonte para conferir. Isso aí!' },
    { id: 'lider_exemplo', icon: '🧭', titulo: 'Líder pelo Exemplo', desc: 'Escreveu as regras da casa sobre IA para a empresa.' },
    { id: 'pai_2_0', icon: '⭐', titulo: 'Pai 2.0', desc: 'Terminou o jogo. Do seu jeito: conferindo, decidindo e assinando.' },
  ];
  P2.ACH_BY_ID = {};
  P2.ACHIEVEMENTS.forEach((a) => (P2.ACH_BY_ID[a.id] = a));
})();

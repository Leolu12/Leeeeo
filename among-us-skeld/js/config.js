/* Configuração: cores, cosméticos, personalidades, níveis, presets e padrões. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U;
  const C = {};

  C.COLORS = [
    { id: 'vermelho', name: 'Vermelho', hex: '#C51111', shade: '#7A0838', alias: ['vermelho', 'vermelha', 'verm', 'red'] },
    { id: 'azul', name: 'Azul', hex: '#132ED1', shade: '#09158E', alias: ['azul', 'blue'] },
    { id: 'verde', name: 'Verde', hex: '#117F2D', shade: '#0A4D2E', alias: ['verde', 'green'] },
    { id: 'rosa', name: 'Rosa', hex: '#ED54BA', shade: '#AB2BAD', alias: ['rosa', 'pink'] },
    { id: 'laranja', name: 'Laranja', hex: '#EF7D0D', shade: '#B33E15', alias: ['laranja', 'orange'] },
    { id: 'amarelo', name: 'Amarelo', hex: '#F5F557', shade: '#C38823', alias: ['amarelo', 'amarela', 'yellow'] },
    { id: 'preto', name: 'Preto', hex: '#3F474E', shade: '#1E1F26', alias: ['preto', 'preta', 'black'] },
    { id: 'branco', name: 'Branco', hex: '#D6E0F0', shade: '#8394BF', alias: ['branco', 'branca', 'white'] },
    { id: 'roxo', name: 'Roxo', hex: '#6B2FBB', shade: '#3B177C', alias: ['roxo', 'roxa', 'purple'] },
    { id: 'marrom', name: 'Marrom', hex: '#71491E', shade: '#5E2615', alias: ['marrom', 'brown'] },
    { id: 'ciano', name: 'Ciano', hex: '#38FEDC', shade: '#24A8BE', alias: ['ciano', 'ciana', 'cyan'] },
    { id: 'lima', name: 'Lima', hex: '#50EF39', shade: '#15A742', alias: ['lima', 'lime', 'verde limao', 'verde claro'] },
    { id: 'bordo', name: 'Bordô', hex: '#6B2B3C', shade: '#410F1D', alias: ['bordo', 'vinho', 'maroon'] },
    { id: 'rose', name: 'Rosé', hex: '#ECC0D3', shade: '#DE92B3', alias: ['rose', 'rosinha', 'rosa claro'] },
    { id: 'banana', name: 'Banana', hex: '#FFFEBE', shade: '#D2BC89', alias: ['banana'] },
    { id: 'cinza', name: 'Cinza', hex: '#758593', shade: '#46565F', alias: ['cinza', 'gray', 'grey'] },
    { id: 'bege', name: 'Bege', hex: '#918877', shade: '#51413E', alias: ['bege', 'tan'] },
    { id: 'coral', name: 'Coral', hex: '#D76464', shade: '#B4435B', alias: ['coral'] },
  ];
  C.COLOR = {};
  C.COLORS.forEach((c) => (C.COLOR[c.id] = c));

  /* Pares de cores que se confundem sob estresse (erro humano). */
  C.CONFUSABLE = {
    vermelho: ['coral', 'bordo'], coral: ['vermelho', 'rosa'], bordo: ['vermelho', 'marrom'],
    rosa: ['rose', 'roxo'], rose: ['rosa', 'branco'], verde: ['lima'], lima: ['verde', 'ciano'],
    amarelo: ['banana', 'laranja'], banana: ['amarelo', 'branco'], branco: ['cinza', 'banana'],
    cinza: ['branco', 'preto'], preto: ['cinza'], marrom: ['bege', 'bordo'], bege: ['marrom', 'cinza'],
    azul: ['roxo', 'ciano'], roxo: ['azul', 'rosa'], ciano: ['azul', 'lima'], laranja: ['amarelo', 'coral'],
  };

  C.HATS = [
    { id: 'nenhum', name: 'Nenhum' },
    { id: 'cowboy', name: 'Chapéu de cowboy' },
    { id: 'coroa', name: 'Coroa' },
    { id: 'cogumelo', name: 'Cogumelo' },
    { id: 'festa', name: 'Chapéu de festa' },
    { id: 'obra', name: 'Capacete de obra' },
    { id: 'bone', name: 'Boné' },
    { id: 'flor', name: 'Flor' },
    { id: 'antena', name: 'Antena' },
  ];
  C.PETS = [
    { id: 'nenhum', name: 'Nenhum' },
    { id: 'mini', name: 'Mini tripulante' },
    { id: 'robo', name: 'Robô' },
    { id: 'slime', name: 'Gosma' },
  ];
  C.VISORS = [
    { id: 'classico', name: 'Clássico', hex: '#9ED7F0' },
    { id: 'dourado', name: 'Dourado', hex: '#F2C94C' },
    { id: 'menta', name: 'Menta', hex: '#8EF0B0' },
    { id: 'rosado', name: 'Rosado', hex: '#F7A6D8' },
    { id: 'escuro', name: 'Fumê', hex: '#5B6B82' },
  ];

  C.PERSONALITIES = {
    analitico: { name: 'Analítico', desc: 'Memoriza caminhos e exige dados lógicos.', talk: 0.7, att: 0.92, mem: 0.95, thr: 46, voteDelay: 0.7, follow: 0.15, hunch: 0, trust: 0.55, taskSpeed: 1.1, times: true },
    impulsivo: { name: 'Impulsivo', desc: 'Vota por pressentimento e se assusta com perseguições.', talk: 0.65, att: 0.6, mem: 0.6, thr: 28, voteDelay: 0.12, follow: 0.3, hunch: 0.35, trust: 0.62, taskSpeed: 1.0, panic: true, caps: true },
    falador: { name: 'Falador', desc: 'Inunda o chat com perguntas e relatos sem foco.', talk: 1, att: 0.6, mem: 0.7, thr: 40, voteDelay: 0.45, follow: 0.4, hunch: 0.1, trust: 0.7, taskSpeed: 0.9, offtopic: 0.5 },
    silencioso: { name: 'Silencioso', desc: 'Focado em tarefas; o isolamento atrai suspeitas.', talk: 0.2, att: 0.8, mem: 0.8, thr: 50, voteDelay: 0.5, follow: 0.3, hunch: 0, trust: 0.5, taskSpeed: 1.15 },
    caotico: { name: 'Caótico', desc: 'Cria confusão inocente.', talk: 0.75, att: 0.5, mem: 0.55, thr: 30, voteDelay: 0.3, follow: 0.2, hunch: 0.4, trust: 0.6, taskSpeed: 0.85, chaos: 0.5 },
    lider: { name: 'Líder', desc: 'Coordena tarefas visuais e votações.', talk: 0.85, att: 0.8, mem: 0.85, thr: 45, voteDelay: 0.55, follow: 0.15, hunch: 0, trust: 0.6, taskSpeed: 1.0, leader: true },
    defensor: { name: 'Defensor', desc: 'Cobra o benefício da dúvida.', talk: 0.6, att: 0.75, mem: 0.8, thr: 62, voteDelay: 0.6, follow: 0.2, hunch: 0, trust: 0.75, taskSpeed: 1.0, defend: true },
    cetico: { name: 'Cético', desc: 'Questiona cada álibi.', talk: 0.65, att: 0.85, mem: 0.85, thr: 40, voteDelay: 0.55, follow: 0.1, hunch: 0.05, trust: 0.35, taskSpeed: 1.0, skeptic: true },
    seguidor: { name: 'Seguidor', desc: 'Acompanha o consenso do grupo.', talk: 0.35, att: 0.6, mem: 0.65, thr: 52, voteDelay: 0.9, follow: 0.9, hunch: 0, trust: 0.8, taskSpeed: 0.95 },
    inexperiente: { name: 'Inexperiente', desc: 'Se perde pelas salas.', talk: 0.45, att: 0.45, mem: 0.5, thr: 35, voteDelay: 0.4, follow: 0.6, hunch: 0.2, trust: 0.75, taskSpeed: 0.75, lost: 0.45 },
  };
  C.PERSONALITY_IDS = Object.keys(C.PERSONALITIES);

  C.IMP_LEVELS = {
    iniciante: { name: 'Iniciante', desc: 'Arrisca abates com gente por perto e mente mal.', need: 0.3, eager: 0.95, miss: 0.35, riskTol: 0.3, useVents: 0.35, sabotage: 0.25, lie: 0.3, selfReport: 0.15, bus: 0, stalk: 0.2, fakeVisual: 0.45, camsAware: false, sabKill: false },
    competente: { name: 'Competente', desc: 'Só mata sem testemunhas e cria álibis simples.', need: 0.55, eager: 0.92, miss: 0.2, riskTol: 0.1, useVents: 0.6, sabotage: 0.5, lie: 0.6, selfReport: 0.3, bus: 0.1, stalk: 0.4, fakeVisual: 0.1, camsAware: false, sabKill: false },
    veterano: { name: 'Veterano', desc: 'Checa câmeras, usa dutos com calma e sabe entregar o parceiro.', need: 0.6, eager: 0.82, miss: 0.09, riskTol: 0.04, useVents: 0.75, sabotage: 0.7, lie: 0.8, selfReport: 0.4, bus: 0.35, stalk: 0.6, fakeVisual: 0, camsAware: true, sabKill: false },
    implacavel: { name: 'Implacável', desc: 'Usa sabotagens para isolar vítimas e mente com detalhes.', need: 0.5, eager: 0.85, miss: 0.02, riskTol: 0.02, useVents: 0.85, sabotage: 0.9, lie: 0.95, selfReport: 0.5, bus: 0.5, stalk: 0.8, fakeVisual: 0, camsAware: true, sabKill: true },
  };

  C.HUMAN_ERROR = {
    baixo: { name: 'Baixo', mult: 0.5 },
    medio: { name: 'Médio', mult: 1 },
    alto: { name: 'Alto', mult: 1.7 },
  };
  C.CHAT_TONES = { limpo: 'Limpo', casual: 'Casual', raiz: 'Raiz' };
  C.CHAT_PACE = { calmo: { name: 'Calmo', mult: 1.6 }, normal: { name: 'Normal', mult: 1 }, frenetico: { name: 'Frenético', mult: 0.6 } };
  C.AI_ACTIONS = { on: 'IA decide votos e ações no mapa', off: 'Só a conversa (votos e ações pelo motor)' };
  C.AI_CHAT = { full: 'Respostas e conversa entre bots', replies: 'Só respostas ao que você escreve', off: 'Desligada (só regras)' };
  C.NARRATION = { conciso: 'Conciso', padrao: 'Padrão', cinematografico: 'Cinematográfico' };

  C.ROLES = {
    cientista: { name: 'Cientista', team: 'crew', desc: 'Vê os sinais vitais de qualquer lugar, com bateria limitada.' },
    engenheiro: { name: 'Engenheiro', team: 'crew', desc: 'Pode usar os dutos por tempo limitado.' },
    rastreador: { name: 'Rastreador', team: 'crew', desc: 'Marca um jogador próximo e acompanha a posição dele por 30s.' },
    barulhento: { name: 'Barulhento', team: 'crew', desc: 'Quando morre, dispara um alerta que mostra onde está o corpo.' },
    anjo: { name: 'Anjo da Guarda', team: 'crew', desc: 'Depois de morrer, pode proteger um vivo de um abate.' },
    metamorfo: { name: 'Metamorfo', team: 'impostor', desc: 'Assume a aparência de outro jogador por 30s.' },
    fantasma: { name: 'Fantasma', team: 'impostor', desc: 'Fica invisível por 10s (não pode matar invisível).' },
  };
  C.ROLE_IDS = Object.keys(C.ROLES);

  C.BOT_NAMES = [
    'Kaio', 'Mari', 'Dudu', 'Tiagão', 'Lulu', 'Nando', 'Bia', 'Rafa', 'Gui', 'Juju', 'Pedrinho', 'Carol', 'Zé', 'Nina',
    'Thay', 'Vini', 'Manu', 'Duda', 'Lari', 'Caio', 'Bruna', 'Fê', 'Gabs', 'Rê', 'Lipe', 'Tati', 'Otávio', 'Paulinha', 'Beto', 'Lia',
  ];

  C.DEFAULTS = {
    preset: 'classico',
    profile: { name: 'Jogador', color: 'ciano', hat: 'nenhum', visor: 'classico', pet: 'nenhum' },
    room: { players: 10, impostors: 2, draw: 'A', drawChance: 50 },
    rules: {
      confirmEjects: true, emergencyMeetings: 3, emergencyCooldown: 15, discussionTime: 15, votingTime: 120,
      anonymousVotes: false, playerSpeed: 1, crewVision: 1, impostorVision: 1.5, killCooldown: 25, killDistance: 'media',
      taskBar: 'sempre', visualTasks: true, commonTasks: 1, longTasks: 2, shortTasks: 3,
    },
    roles: {
      cientista: { n: 0, chance: 100 }, engenheiro: { n: 0, chance: 100 }, rastreador: { n: 0, chance: 100 },
      barulhento: { n: 0, chance: 100 }, anjo: { n: 0, chance: 100 }, metamorfo: { n: 0, chance: 100 }, fantasma: { n: 0, chance: 100 },
    },
    bots: {
      names: 'auto', customNames: '', personalities: 'sorteadas', allowed: C.PERSONALITY_IDS.slice(),
      impostorLevel: 'competente', humanError: 'medio', chatTone: 'casual', chatPace: 'normal',
    },
    ui: { narration: 'cinematografico', hud: true, finalReport: true, sound: true, ghostsSilent: true, aiChat: 'full', aiActions: 'on' },
    house: { noDoubleKill: false, noVentChase: false, critAfterFirstBody: false, noVisualHardClear: false, noSelfReport: false, custom: '' },
  };

  C.PRESETS = {
    classico: { name: 'Clássico', desc: 'Regras padrão, bots de nível médio, tarefas visuais ligadas.', apply: {} },
    competitivo: {
      name: 'Competitivo',
      desc: 'Ejeções não confirmadas, sem tarefas visuais, barra só nas reuniões, impostores veteranos.',
      apply: { rules: { confirmEjects: false, visualTasks: false, taskBar: 'reunioes', emergencyMeetings: 1, killCooldown: 30 }, bots: { impostorLevel: 'veterano', humanError: 'baixo' } },
    },
    hardcore: {
      name: 'Hardcore',
      desc: 'Visão reduzida, votos anônimos, sem barra de tarefas, bots falham mais e impostores implacáveis.',
      apply: { rules: { crewVision: 0.6, confirmEjects: false, anonymousVotes: true, taskBar: 'nunca', visualTasks: false, killCooldown: 22.5 }, bots: { impostorLevel: 'implacavel', humanError: 'alto' } },
    },
    caos: {
      name: 'Caos',
      desc: 'Todas as funções especiais, visão curta, bots caóticos e faladores.',
      apply: {
        rules: { crewVision: 0.75, killCooldown: 20 },
        roles: { cientista: { n: 1, chance: 100 }, engenheiro: { n: 1, chance: 100 }, rastreador: { n: 1, chance: 100 }, barulhento: { n: 1, chance: 100 }, anjo: { n: 1, chance: 100 }, metamorfo: { n: 1, chance: 100 }, fantasma: { n: 1, chance: 100 } },
        bots: { humanError: 'alto', chatPace: 'frenetico', chatTone: 'raiz', personalities: 'caos' },
      },
    },
    casual: {
      name: 'Casual',
      desc: 'Visão ampla, cooldown longo, bots inexperientes. Bom para aprender.',
      apply: { rules: { crewVision: 1.5, killCooldown: 40, votingTime: 150, discussionTime: 30 }, bots: { impostorLevel: 'iniciante', chatTone: 'limpo' } },
    },
  };

  C.buildSettings = function (presetId, overrides) {
    const s = U.clone(C.DEFAULTS);
    const pr = C.PRESETS[presetId] || C.PRESETS.classico;
    U.merge(s, U.clone(pr.apply));
    s.preset = presetId;
    if (overrides) U.merge(s, overrides);
    return s;
  };

  C.RECOMMENDED_IMPOSTORS = (n) => (n <= 6 ? 1 : n <= 11 ? 2 : 3);
  C.MAX_IMPOSTORS = (n) => (n <= 6 ? 1 : n <= 8 ? 2 : 3);

  AU.C = C;
})();

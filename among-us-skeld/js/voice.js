/* Voz dos bots com IA nas reuniões.
   O motor de regras continua decidindo O QUE cada bot sabe, suspeita, afirma e vota (as "falas planejadas").
   Um diretor junta essas falas em rodadas e pede ao modelo de linguagem para escrevê-las como um chat de verdade,
   respondendo ao jogador e aos outros bots. Nos silêncios ele também dá a vez a quem tem motivo para falar
   (foi acusado, recebeu pergunta, desconfia de alguém, quer cobrar quem não falou).
   O modelo nunca vê quem é impostor: o impostor aparece só com a versão que ele conta. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, T = AU.Talk;

  const STYLE = {
    analitico: 'raciocina em voz alta, cita salas e ordem dos acontecimentos, pede dados concretos',
    impulsivo: 'reage rápido e emotivo, acusa por impulso, às vezes escreve em CAPS',
    falador: 'fala bastante, faz várias perguntas, conta detalhe demais e às vezes sai do assunto',
    silencioso: 'responde curtíssimo, 1 a 4 palavras, só quando precisa',
    caotico: 'zoeiro, faz piada, usa kkkk, joga desconfiança de brincadeira',
    lider: 'organiza a conversa, chama cada um pelo nome, resume e propõe em quem votar ou pular',
    defensor: 'pede provas e defende quem é acusado sem evidência',
    cetico: 'desconfia de todo álibi, pergunta "quem confirma?", não engole resposta vaga',
    seguidor: 'concorda com quem parece saber, "+1", "faz sentido", raramente toma a frente',
    inexperiente: 'meio perdido, confunde nomes de sala, pergunta o básico, inseguro',
  };
  const TONE = {
    limpo: 'TOM LIMPO (o mais fácil de entender): todo mundo escreve frases completas, simples e claras, em português correto, com acentos. NADA de siglas, abreviações, gírias ou termos em inglês (não use sus, safe, skip, vent, imp, self report, task, vc, pq, tb, ngm, tava, pra, tá, kkk). Diga "suspeito", "inocente", "pular o voto", "usou o duto", "impostor", "tarefa", "estava", "para", e os nomes das salas por extenso (Cafeteria, Elétrica, Navegação, Segurança, Depósito, Armas, Escudos, Comunicações, Motor Superior, Motor Inferior, MedBay, Reator, Admin, O2).',
    casual: 'TOM CASUAL (como a maioria das pessoas escreve num chat de jogo): frases curtas e naturais, quase tudo minúsculo, abreviações comuns (vc, pq, tava, pra, tá), "kkk" de vez em quando; dos termos do jogo, só os que todo mundo usa (skip, sus, task) e não o tempo todo. SEM gíria pesada (nada de tlgd, tá ligado, slk, pqp, véi, mano, mds) e as salas com o nome comum em português (cafeteria, elétrica, navegação, segurança, depósito, armas, escudos, comunicações, medbay, motor de cima, motor de baixo, reator, admin, o2) — nada de apelido como café, elec, nav, med, sec, storage, weapons, upper, lower.',
    raiz: 'TOM RAIZ (o mais caótico): chat de jogador raiz. Gírias pesadas (mano, tlgd, tá ligado, slk, pqp, véi, mds, sla, caraca), siglas (n, q, vc, tb, td, cmg, dps, mt, msm, agr, ngm, pfv, ss), termos de jogador (sus, safe, skip, vent, imp, self, task, stack), apelidos das salas (café, elec, nav, med, sec, storage, weapons, upper, lower, comms, shields), "kkkk", CAPS quando se exalta, frases cortadas, quase sem acento e sem pontuação, provocação leve (sem ofensa pesada). Mesmo assim cada um no seu jeito.',
  };
  /* Exemplo com jeitos diferentes de escrever (não é para copiar). */
  const EXAMPLES = {
    limpo: [
      'Lipe: Onde foi?',
      'Bia: Na Elétrica, perto dos fios.',
      'Rafa: Quem estava para aquele lado? Vamos um por vez.',
      'Zé: Eu estava no Depósito com o azul.',
      'Nina: Confirmo.',
      'Bia: Vi o vermelho saindo de lá uns 10 segundos antes.',
      'Beto: Eu? Estava na MedBay fazendo o escaneamento.',
      'Nina: Eu vi o escaneamento dele. Ele é inocente.',
      'Rafa: Sem prova, é melhor pular.',
    ],
    casual: [
      'Lipe: onde?',
      'Bia: elétrica, perto dos fios',
      'Rafa: quem tava pra aquele lado? um de cada vez',
      'Zé: eu tava no depósito com o azul',
      'Nina: confirmo',
      'Bia: vi o vermelho saindo de lá uns 10s antes',
      'Beto: eu?? tava na medbay fazendo scan',
      'Nina: eu vi o scan dele, é inocente',
      'Caio: pera, e o laranja? não falou nada',
      'Rafa: sem prova melhor skip',
    ],
    raiz: [
      'Lipe: ond',
      'Bia: elec perto dos fio',
      'Rafa: qm tava p aquele lado mano',
      'Zé: storage c o azul tlgd',
      'Nina: ss',
      'Bia: VI O VERMELHO SAINDO DE LA',
      'Beto: EU?? tava na med de scan pqp',
      'Nina: vi o scan dele, safe',
      'Caio: e o laranja q n falou nd kkkk',
      'Rafa: sem prova skipa',
    ],
  };
  /* Jeito de escrever de cada bot: sorteado uma vez por partida, puxado pela personalidade e pelo clima do lobby. */
  const REGISTERS = {
    formal: 'escreve direitinho: frases completas, maiúscula no começo, pontuação e acentos; nada de gíria',
    neutro: 'escreve normal: frases curtas, alguma pontuação, uma abreviação ou outra (vc, pq)',
    informal: 'escreve rápido: tudo minúsculo, quase sem pontuação, abreviações (vc, tb, tava, ngm, sla)',
    giria: 'bem solto: minúsculas, gírias (mano, pô, slk, oxe, tlgd, tá ligado), "kkkk", apelido das salas (elec, café, nav, med)',
    solto: 'escreve rápido e solto: tudo minúsculo, quase sem pontuação, "kkk" às vezes, abreviações comuns (vc, pq, tava), sem gíria pesada',
    caotico: 'caótico: siglas pra tudo (n, q, cmg, dps, mt, td), gíria pesada (mano, pqp, slk, mds, tlgd), CAPS quando se exalta, "kkkkk", frase cortada',
    claro: 'escreve de forma simples e clara: frases curtas e completas, palavras comuns, sem abreviações, siglas ou gírias',
  };
  const REG_BY_PERS = {
    analitico: { formal: 5, neutro: 3, informal: 1 }, impulsivo: { informal: 3, giria: 3, neutro: 1 }, falador: { informal: 3, giria: 2, neutro: 2 },
    silencioso: { neutro: 2, informal: 3, formal: 1 }, caotico: { giria: 5, informal: 2 }, lider: { formal: 3, neutro: 4, informal: 1 },
    defensor: { formal: 3, neutro: 3, informal: 1 }, cetico: { neutro: 4, formal: 2, informal: 2 }, seguidor: { informal: 4, neutro: 2, giria: 1 },
    inexperiente: { informal: 3, neutro: 3, giria: 1 },
  };
  const QUIRKS = ['às vezes começa com "então"', 'usa "tipo" de vez em quando', 'costuma perguntar de volta', 'usa "pera" quando quer falar', 'termina frase com "?" mesmo afirmando', 'fala "hmm" quando duvida', 'chama os outros pela cor', 'chama os outros pelo nome', 'usa "sério?" quando duvida', 'responde com uma palavra quando concorda', 'escreve "ss" para sim e "n" para não', 'usa "ué" quando se surpreende', 'às vezes manda "?" sozinho', 'usa "blz" e "fechou"', 'escreve "rs" em vez de kkk'];

  const REASON = {
    kill: 'viu matando', vent: 'viu usando o duto', shift: 'viu mudando de aparência', vanish: 'viu ficar invisível',
    noscan: 'ficou no scanner sem escanear', fakeTask: 'terminou uma tarefa e a barra não subiu (tarefa falsa)', follow: 'estava seguindo alguém', nearBody: 'estava perto do corpo',
    lastWith: 'estava com a vítima pouco antes', fromBody: 'vinha da direção do corpo', lie: 'mentiu ou o álibi não bate', tracker: 'o rastreador mostrou',
    sus: 'está suspeito', hunch: 'pressentimento', claim: 'contaram no chat', vote: 'vai votar nele', fastReport: 'reportou o corpo pouco depois da vítima ser vista viva (possível self report)',
  };
  const VOUCH = { visual: 'viu fazendo tarefa visual (inocente)', together: 'estava junto', claim: 'confirma o que ele disse' };

  const V = {
    active(mt) {
      const g = mt.g;
      return !g.headless && g.S.ui.aiChat !== 'off' && AU.LLM.ready();
    },

    who(g, id) {
      const p = g.players[id];
      return p ? `${p.name} (${C.COLOR[p.color].name})` : 'alguém';
    },
    area(a) {
      return M.AREA[a] ? M.AREA[a].name : a;
    },

    /* O que todo jogador sabe da partida: regras, funções que existem, como se argumenta. */
    rules(g) {
      const R = g.S.rules, H = g.S.house || {};
      const on = (r) => ((g.S.roles && g.S.roles[r]) || {}).n > 0;
      const out = [
        'Como o jogo funciona (todos sabem):',
        '- Tripulantes fazem tarefas; impostores fingem tarefas, matam (depois de cada abate precisam esperar ~' + Math.round(R.killCooldown) + 's), andam pelos dutos (vent) e sabotam: luzes (quase ninguém enxerga), comunicações (desliga câmeras, admin e a lista de tarefas), reator e O2 (alarme; se ninguém consertar, os impostores vencem) e portas.',
        '- A tripulação vence terminando as tarefas ou ejetando todos os impostores. Os impostores vencem quando ficam em número igual ao de tripulantes.',
        '- Nesta partida há ' + g.S.room.impostors + ' impostor' + (g.S.room.impostors > 1 ? 'es' : '') + '. Ejeções ' + (R.confirmEjects ? 'são confirmadas (aparece se era impostor).' : 'NÃO são confirmadas.') + (R.anonymousVotes ? ' Votos anônimos.' : ''),
        R.visualTasks
          ? '- Tarefas visuais (scan da MedBay, asteroides em Armas, escudos, lixo) mostram para quem vê que a pessoa é tripulante' + (H.noVisualHardClear ? ' (regra da casa: não inocenta de vez).' : '.')
          : '- Tarefas visuais estão desligadas nesta partida: ver alguém no scan não prova nada.',
        '- Onde se vigia: câmeras na Segurança (vigiam os corredores de fora da Segurança, da MedBay, do Admin e da Navegação), mapa do Admin (mostra quantas pessoas por sala, sem cores). Botão de emergência na Cafeteria.',
        '- Dutos da Skeld (só dá para ir entre salas ligadas): Elétrica ↔ MedBay ↔ Segurança; Cafeteria ↔ Admin ↔ corredor dos Escudos; Armas ↔ Navegação (norte); Navegação (sul) ↔ Escudos; Motor Superior ↔ Reator ↔ Motor Inferior. Quem aparece do nada numa sala ligada por duto ao local do corpo pode ter ventado.',
        '- A Elétrica é o lugar mais perigoso (entrada estreita, duto no canto). Navegação, Escudos e Comunicações são isoladas. Impostor não consegue fazer tarefa visual: quem fica parado numa tarefa visual sem a animação está fingindo.',
        '- Argumentos comuns: self report (o impostor reporta o próprio corpo), stack kill (matar no meio de um grupo), "quem estava sozinho?", "quem confirma o álibi?", "estava perto do corpo", "saiu do duto". Quem mente no álibi fica suspeito. Pular (skip) quando não há prova é normal.',
      ];
      const roles = Object.keys(C.ROLES).filter(on);
      const IMPL = {
        metamorfo: 'por isso "eu vi fulano" pode ter sido o metamorfo disfarçado dele',
        fantasma: 'então alguém pode passar sem ser visto ou "sumir do nada"',
        engenheiro: 'então ver alguém no duto não prova 100% que é impostor',
        cientista: 'pode dizer há quanto tempo alguém morreu',
        rastreador: 'pode dizer por onde alguém andou',
        barulhento: 'quando morre, todos recebem um alerta com o local do corpo',
        anjo: 'depois de morto protege alguém; um abate pode falhar',
      };
      if (roles.length) {
        out.push('Funções especiais que EXISTEM nesta partida (ninguém sabe quem tem; alguém pode dizer que tem, e pode ser mentira):');
        for (const r of roles) out.push('- ' + C.ROLES[r].name + ' (' + (C.ROLES[r].team === 'crew' ? 'tripulante' : 'impostor') + '): ' + C.roleDesc(r, g.S) + ' — ' + IMPL[r] + '.');
        const off = Object.keys(C.ROLES).filter((r) => !on(r));
        if (off.length) out.push('Funções que NÃO existem nesta partida: ' + off.map((r) => C.ROLES[r].name).join(', ') + '. Se alguém falar delas, dá para corrigir.');
      } else out.push('Nesta partida não há funções especiais (nada de metamorfo, fantasma, engenheiro, cientista etc.). Se alguém falar disso, dá para corrigir: não tem isso nessa partida.');
      out.push('Os personagens conhecem bem o jogo: usam essas regras para argumentar, levam a sério teorias que fazem sentido (inclusive sobre as funções) e discordam das que não fazem.');
      return out.join('\n');
    },

    system(g) {
      return [
        'Você escreve as mensagens de chat de vários jogadores numa partida de um jogo de dedução social igual a Among Us, na nave The Skeld. Eles estão numa reunião: conversam para descobrir o impostor e depois votam para ejetar alguém ou pular (skip).',
        'Como escrever:',
        '- Chat de jogo online de verdade, de jogadores brasileiros: mensagens curtas (até 120 caracteres), diretas, às vezes incompletas, reagindo ao que acabou de ser dito. Nada de narração, aspas, emojis, asteriscos ou descrição de ações.',
        '- Cada personagem tem personalidade e JEITO DE ESCREVER próprios (estão descritos): siga exatamente. ' + ({ limpo: 'Todos escrevem de forma clara, mas cada um com suas palavras.', casual: 'Uns escrevem certinho, outros abreviam; gíria pesada ninguém usa.', raiz: 'Todo mundo escreve solto e com gíria, mas cada um com as suas (não repita a mesma gíria em todo mundo).' }[g.S.bots.chatTone] || ''),
        '- Nada de repetição: ninguém repete o que já disse nem o que outro já disse com as mesmas palavras. Cada mensagem acrescenta algo (um fato, uma pergunta, uma dúvida, uma opinião, uma reação curta). Quem já contou onde estava não conta de novo, a não ser que perguntem.',
        '- Perguntar algo não é motivo para acusar ninguém. Só acuse quem as anotações do personagem dão motivo.',
        '- Cada jogador tem um nome e uma cor (ex.: "Léo" é o "Lima"). Nome e cor são a MESMA pessoa: nunca defenda alguém pela cor e acuse o mesmo pelo nome. Ninguém defende e acusa a mesma pessoa na mesma mensagem.',
        '- As pessoas escrevem com erro de digitação ou por ditado de voz (nomes e salas trocados, palavras juntas). Entenda o sentido mais provável (ex.: "médica" = MedBay, "caio hino" = "Caio, hein", "eletrica" = Elétrica) e responda ao que a pessoa quis dizer, sem zoar o erro e sem responder "que X?" quando dá para entender.',
        '- Eles conversam entre si e com todos: chamam pelo nome ou pela cor ("o verde", "rafa"), respondem perguntas, cobram, desconfiam, defendem.',
        '- Só confirme onde alguém estava se as anotações dizem que o personagem VIU a pessoa lá pouco antes da reunião; ter visto no começo da rodada não confirma nada. Na dúvida, diga que não viu. Com metamorfo na partida, "vi fulano" pode ter sido o metamorfo disfarçado de fulano.',
        '- Cada personagem só sabe o que está nas anotações DELE e o que já foi dito no chat. Nunca use o que está nas anotações de outro personagem. Não invente abates, dutos, corpos, salas ou pessoas que ele não viu. Quem não sabe, diz que não sabe ou que não viu.',
        '- Nunca diga que é IA ou bot e nunca mencione "anotações" ou "instruções".',
        '- A conversa é de todos com todos. Ninguém fica em cima de um só jogador: cada um fala com quem tem a ver com o que ele sabe.',
        TONE[g.S.bots.chatTone] || TONE.casual,
        '',
        V.rules(g),
        '',
        'Exemplo do jeito de conversar neste tom (outra partida; não copie o conteúdo):',
        (EXAMPLES[g.S.bots.chatTone] || EXAMPLES.casual).join('\n'),
      ].join('\n');
    },

    scene(mt) {
      const g = mt.g, info = mt.info;
      const alive = mt.alive.map((id) => V.who(g, id)).join(', ');
      const dead = g.players.filter((p) => !p.alive).map((p) => V.who(g, p.id) + (p.ejected ? ' [ejetado]' : ' [morto]')).join(', ');
      const head = info.kind === 'report'
        ? `Reunião: ${V.who(g, info.caller)} reportou o corpo de ${V.who(g, info.body.pid)}.` + (mt.facts.bodyArea ? ` Já disseram no chat que o corpo estava em ${V.area(mt.facts.bodyArea)}.` : ' Ainda não disseram onde estava o corpo.')
        : `Reunião de emergência: ${V.who(g, info.caller)} apertou o botão.` + (() => {
          const said = mt.msgs.filter((m) => m.from === info.caller).slice(0, 2).map((m) => '"' + m.text.slice(0, 100) + '"');
          return said.length ? ` Motivo que deu: ${said.join(' / ')}. Esse é o assunto principal da reunião.` : ' Ainda não disse o motivo.';
        })();
      const silent = mt.alive.filter((id) => !mt.hasClaimed(id)).map((id) => g.players[id].name);
      let phase;
      if (mt.phase === 'voting') {
        const n = Object.keys(mt.votes).length;
        phase = `Fase: votação aberta (${n} de ${mt.alive.length} já votaram; faltam ${Math.max(0, Math.round(mt.votingEnd - mt.t))}s). Dá para continuar conversando enquanto votam.`;
      } else phase = `Fase: discussão (a votação abre em ${Math.max(0, Math.round(mt.votingStart - mt.t))}s).`;
      const prev = (g.events || []).filter((e) => e.type === 'vote' && e.index < info.index).slice(-2).map((e) => {
        if (e.ejected == null) return 'ninguém foi ejetado';
        const q = g.players[e.ejected];
        return V.who(g, e.ejected) + ' foi ejetado' + (g.S.rules.confirmEjects ? (q.isImp ? ' e ERA impostor' : ' e NÃO era impostor') : '');
      });
      const pub = [];
      const SAB = { lights: 'as luzes caíram', comms: 'as comunicações caíram', reactor: 'o alarme do reator tocou', o2: 'o alarme do O2 tocou' };
      for (const e of (g.events || []).filter((x) => x.t >= info.roundStart && x.type === 'sabotage')) pub.push(SAB[e.sab] || 'houve sabotagem');
      if (g.S.rules.taskBar === 'sempre') {
        const tp = g.taskProgress();
        if (tp.total) pub.push('barra de tarefas em ' + Math.round((tp.done / tp.total) * 100) + '%');
      }
      const roster = g.players.map((p) => p.name + ' = ' + C.COLOR[p.color].name).join(', ');
      return [
        head,
        'Quem é quem (nome = cor; a mesma pessoa pode ser chamada pelo nome OU pela cor): ' + roster + '.',
        pub.length ? 'Desde a última reunião: ' + pub.join('; ') + '.' : '',
        `Vivos: ${alive}.`,
        dead ? `Fora do jogo: ${dead}.` : '',
        prev.length ? 'Reuniões anteriores: ' + prev.join('; ') + '.' : '',
        g.S.rules.confirmEjects ? `Impostores restantes: ${mt.impostorsLeft}.` : '',
        phase,
        silent.length ? 'Ainda não disseram onde estavam: ' + silent.join(', ') + '.' : '',
      ].filter(Boolean).join('\n');
    },

    transcript(mt, n) {
      const g = mt.g;
      return mt.msgs.slice(-(n || 22)).map((m) => `${V.who(g, m.from)}: ${m.text}`).join('\n') || '(ninguém falou ainda)';
    },

    persona(b) {
      const p = b.p;
      const pers = C.PERSONALITIES[p.personality] || C.PERSONALITIES.analitico;
      const own = b.traitLine ? b.traitLine() : '';
      return `${V.who(b.g, p.id)} — ${pers.name}: ${STYLE[p.personality] || pers.desc}.${own ? ' Traços próprios: ' + own + '.' : ''} Jeito de escrever: ${V.voiceOf(b)}`;
    },
    voiceOf(b) {
      if (b.voiceStyle) return b.voiceStyle;
      const g = b.g, tone = g.S.bots.chatTone;
      const w = Object.assign({}, REG_BY_PERS[b.p.personality] || { neutro: 1 });
      if (tone === 'limpo') {
        /* tom limpo: só jeitos claros de escrever, sem abreviação */
        for (const k of Object.keys(w)) delete w[k];
        w.formal = 3;
        w.claro = 2;
      } else if (tone === 'raiz') {
        /* raiz: todo mundo solto; ninguém escreve certinho */
        delete w.formal;
        w.giria = (w.giria || 0) + 3;
        w.caotico = (w.caotico || 0) + 2;
        w.informal = (w.informal || 0) + 1;
      } else {
        /* casual: como gente normal; gíria pesada fica para o raiz */
        if (w.giria) w.solto = (w.solto || 0) + w.giria;
        delete w.giria;
      }
      const keys = Object.keys(w);
      const reg = U.weighted(keys, (k) => w[k]);
      const quirks = tone === 'limpo' ? QUIRKS.filter((q) => !/ss|blz|rs|tipo|"\?"|pera/.test(q)) : tone === 'casual' ? QUIRKS.filter((q) => !/"ss"/.test(q)) : QUIRKS;
      const qs = U.shuffle(quirks.slice()).slice(0, 2);
      b.voiceStyle = REGISTERS[reg] + '; ' + qs.join('; ') + '.';
      return b.voiceStyle;
    },

    /* Por que um bot desconfia de alguém, em poucas palavras (só com o que ele sabe). */
    reasonOf(b, id) {
      const ev = ((b.ev && b.ev[id]) || []).filter((e) => e.w > 0).sort((a, c) => c.w - a.w)[0];
      if (ev) {
        const t = { fastReport: 'reportou rápido demais (self report?)', ventLink: 'apareceu numa sala ligada por duto ao corpo', fromBody: 'vinha da direção do corpo', kill: 'você viu matando', vent: 'você viu no duto', shift: 'você viu mudando de forma', vanish: 'você viu sumindo', noscan: 'fingiu o scan', fakeTask: 'terminou tarefa e a barra não subiu', follow: 'ficou te seguindo', nearBody: 'estava perto do corpo', lastWith: 'estava com a vítima', withVictim: 'andava colado na vítima', odd: 'agiu estranho na rodada (te chamou e ficou enrolando / ficou na sua cola)' }[ev.reason];
        if (t) return t + (ev.area ? ' (' + V.area(ev.area) + ')' : '');
      }
      if ((b.chatClaim[id] || 0) > 12) return 'outros disseram que viram algo';
      if ((b.chatDelta[id] || 0) > 8) return 'o que ele disse não bate com o que você viu';
      if ((b.chatSocial[id] || 0) > 8) return 'a galera está desconfiando';
      if ((b.carry[id] || 0) > 10) return 'você já desconfiava na reunião anterior';
      return 'só uma sensação';
    },

    /* Anotações de um bot: só o que ele viveu. O impostor aparece com a versão que conta, sem segredos. */
    notes(b, opts) {
      opts = opts || {};
      const g = b.g, p = b.p, mt = b.mt, info = mt.info;
      const out = [];
      const nm = (id) => V.who(g, id);
      const al = b.getAlibi();
      out.push('Onde esteve: ' + al.rooms.map(V.area).join(' → ') + (al.task ? ', fazendo ' + M.TASKS[al.task].name : '') + (al.with != null ? ', junto com ' + nm(al.with) : '') + '.');
      if (b.pact && g.players[b.pact.who]) out.push('Estava em dupla combinada com ' + nm(b.pact.who) + (g.players[b.pact.who].alive ? '.' : ' (que morreu).'));
      if (b.pactReq) out.push('Combinou nesta reunião andar junto com ' + nm(b.pactReq.who) + ' na próxima rodada' + (b.pactReq.lead === 'me' ? ' (vai na frente)' : ' (vai seguir)') + '.');
      if (info.kind === 'report') {
        if (b.knowsBody) out.push('O corpo de ' + nm(info.body.pid) + ' estava em ' + V.area(b.knowsBody) + (b.sawBodyMyself ? ' (viu com os próprios olhos).' : '.'));
        if (b.killWindow && !p.isImp) {
          const w = b.killWindow, a0 = Math.round(info.t - w.t0);
          out.push('Pelas suas contas o abate aconteceu nos últimos ' + a0 + 's antes do corpo ser achado' + (w.mine ? ' (você passou lá e não tinha corpo).' : '.'));
          const al = Object.keys(b.ev || {}).filter((id) => (b.ev[id] || []).some((e) => e.reason === 'alibi' && e.cover >= 0.5)).map((id) => nm(+id));
          if (al.length) out.push('Você viu longe do corpo nessa hora (não dá tempo de ter ido matar): ' + al.join(', ') + '.');
        }
        else out.push('Não sabe onde estava o corpo de ' + nm(info.body.pid) + '.');
      }
      if (!p.isImp) {
        const strongTxt = { kill: 'matando alguém', vent: 'entrando ou saindo de um duto', shift: 'mudando de aparência', vanish: 'ficando invisível' };
        for (const id of Object.keys(b.ev || {})) {
          for (const e of b.ev[id]) {
            if (strongTxt[e.reason]) out.push('VIU ' + nm(+id) + ' ' + strongTxt[e.reason] + (e.area ? ' em ' + V.area(e.area) : '') + (e.past ? ' numa rodada anterior (e ele continua vivo)' : '') + '. Tem certeza absoluta.');
            if (e.reason === 'visual') out.push('Viu ' + nm(+id) + ' fazendo ' + (M.VISUAL_NAMES[e.task] || 'uma tarefa visual') + (e.past ? ' numa rodada anterior' : '') + ': é tripulante com certeza, lembra disso e NUNCA acusa ' + nm(+id) + ' por coisa fraca (seguir, estar perto, jeito estranho).');
            if (e.reason === 'lie' && e.past) out.push('Já pegou ' + nm(+id) + ' mentindo sobre onde estava numa reunião anterior.');
            if (e.reason === 'spared') out.push('Já ficou sozinho com ' + nm(+id) + ' (' + Math.round(e.secs) + 's no total) e não morreu.');
            if (e.reason === 'fakeTask') out.push('Viu ' + nm(+id) + ' terminar uma tarefa' + (e.area ? ' em ' + V.area(e.area) : '') + ' e a barra de tarefas NÃO subiu: a tarefa era falsa.');
            if (e.reason === 'noscan') out.push('Viu ' + nm(+id) + ' parado ' + ({ scan: 'no scanner da MedBay', asteroids: 'na arma de asteroides', shields: 'no painel dos escudos' }[e.task] || 'numa tarefa visual') + ' sem a animação aparecer (tarefa falsa).');
            if (e.reason === 'ventLink') out.push('Viu ' + nm(+id) + ' aparecer em ' + V.area(e.area) + ', que tem duto ligado a ' + V.area(e.bodyArea) + ' (onde estava o corpo), pouco antes.');
            if (e.reason === 'withVictim' || e.reason === 'lastWith') out.push('Viu ' + nm(+id) + ' junto da vítima pouco antes' + (e.area ? ', em ' + V.area(e.area) : '') + '.');
            if (e.reason === 'nearBody' && e.w >= 14) out.push('Viu ' + nm(+id) + ' perto de onde estava o corpo' + (e.area ? ' (' + V.area(e.area) + ')' : '') + ' pouco antes.');
            if (e.reason === 'together' && e.secs >= 20) out.push('Ficou um tempo junto de ' + nm(+id) + ' e nada aconteceu.');
            if (e.reason === 'fastReport') out.push(nm(+id) + ' reportou o corpo só uns ' + e.ago + 's depois de a vítima ser vista viva: rápido demais, pode ser self report (o impostor reportando o próprio abate).');
            if (e.reason === 'fromBody') out.push('Viu ' + nm(+id) + ' vindo da direção de ' + V.area(e.bodyArea) + ' (onde estava o corpo), andando por ' + V.area(e.area) + ', pouco antes.');
          }
        }
      }
      for (const e of b.mem.events) {
        if (e.t < info.roundStart || !g.players[e.who]) continue;
        if (e.type === 'escort') out.push(nm(e.who) + ' fez sinal de "vem comigo" e você foi junto.');
        if (e.type === 'escortEnd' && (e.why === 'não' || e.why === '!' || e.why === '...')) out.push('Você parou de seguir ' + nm(e.who) + (e.why === '!' ? ' porque ficou com medo dele.' : ' porque achou estranho.'));
        if (e.type === 'escortVisual') out.push('Você seguiu ' + nm(e.who) + ' e viu fazer tarefa visual: é inocente.');
        if (e.type === 'noProof') out.push(nm(e.who) + ' disse que ia provar com tarefa visual, você seguiu e ele NÃO fez: suspeito.');
      }
      if (b.invite && b.invite.who != null && g.players[b.invite.who] && !p.isImp) out.push('Você chamou ' + nm(b.invite.who) + ' para te acompanhar' + (b.shownVisual ? ' e fez tarefa visual na frente dele.' : '.'));
      /* a última vez que viu cada um (uma linha por pessoa, com as áreas em ordem) */
      const recent = b.mem.seen.filter((s) => s.t1 >= b.graceT() && s.t1 >= info.t - 45 && s.via !== 'track' && g.players[s.who] && s.who !== p.id);
      const byWho = new Map();
      for (const s of recent) {
        const r = byWho.get(s.who) || { areas: [], t1: 0, cams: false };
        if (r.areas[r.areas.length - 1] !== s.area) r.areas.push(s.area);
        r.t1 = Math.max(r.t1, s.t1);
        r.cams = r.cams || s.via === 'cams';
        byWho.set(s.who, r);
      }
      [...byWho.entries()].sort((a, c) => c[1].t1 - a[1].t1).slice(0, 5).forEach(([id, r]) => out.push('Viu ' + nm(id) + ' em ' + r.areas.slice(-2).map(V.area).join(' → ') + ' (última vez uns ' + Math.max(5, Math.round((info.t - r.t1) / 5) * 5) + 's antes da reunião)' + (r.cams ? ' (pelas câmeras)' : '') + '.'));
      /* álibi que não bate com o que outra pessoa contou ter visto */
      if (!p.isImp && b.claims) {
        for (const id of Object.keys(b.claims)) {
          if (+id === p.id || !b.claimClash) continue;
          const m = mt.msgs.find((x) => x.from !== +id && x.intents.some((j) => j.who === +id && j.area && (j.type === 'accuse' || j.type === 'sawAt') && b.claimClash(+id, j.area)));
          if (!m) continue;
          const j = m.intents.find((x) => x.who === +id && x.area && b.claimClash(+id, x.area));
          out.push(nm(+id) + ' disse que estava em ' + (b.claims[id] || []).map(V.area).join(' → ') + ', mas ' + nm(m.from) + ' contou que viu ' + nm(+id) + ' em ' + V.area(j.area) + ': não bate.');
        }
      }
      if (p.isImp) {
        if (b.scapegoat != null && g.players[b.scapegoat].alive) out.push('Desconfia de ' + nm(b.scapegoat) + ', mas sem prova concreta.');
        if (!opts.noLean) {
          const t = b.impTarget ? b.impTarget() : null;
          out.push(t != null ? 'Está pensando em votar em ' + nm(t) + '.' : 'Sem prova, tende a pular (skip).');
        }
      } else {
        const ranked = mt.alive.filter((id) => id !== p.id).map((id) => ({ id, s: b.susp[id] || 0 })).sort((a, c) => c.s - a.s);
        const tops = ranked.filter((x) => x.s >= 22).slice(0, 2);
        if (tops.length) out.push('Desconfia de: ' + tops.map((x) => nm(x.id) + ' (' + (x.s >= 60 ? 'muito' : x.s >= 35 ? 'bastante' : 'um pouco') + '; ' + V.reasonOf(b, x.id) + ')').join('; ') + '.');
        else out.push('Não tem suspeito claro.');
        if (!opts.noLean) {
          const lean = b.voteLean();
          out.push(lean != null ? 'Está inclinado a votar em ' + nm(lean) + '.' : 'Tende a pular (skip) se ninguém trouxer prova.');
        }
        const trusted = ranked.filter((x) => x.s <= -20).slice(0, 2);
        if (trusted.length) out.push('Confia em: ' + trusted.map((x) => nm(x.id)).join(', ') + '.');
      }
      const accusers = Object.keys(b.accusedMe || {}).map(Number);
      if (accusers.length) out.push('Foi acusado por: ' + accusers.map(nm).join(', ') + '.');
      return out.slice(0, 15);
    },

    /* Mensagens que cobram este bot desde a última vez que ele falou. */
    pending(mt, id) {
      const res = { accused: [], asked: [], mentioned: [] };
      for (let i = mt.msgs.length - 1, n = 0; i >= 0 && n < 16; i--, n++) {
        const m = mt.msgs[i];
        if (m.from === id) break;
        for (const it of m.intents) {
          if (it.who !== id) continue;
          if (it.type === 'accuse' && !res.accused.includes(m)) res.accused.push(m);
          else if (it.type === 'askWhere' && !res.asked.includes(m)) res.asked.push(m);
          else if ((it.type === 'mention' || it.type === 'sawAt' || it.type === 'quiet') && !res.mentioned.includes(m)) res.mentioned.push(m);
        }
      }
      return res;
    },

    said(mt, id) {
      return mt.msgs.filter((m) => m.from === id).slice(-3).map((m) => '"' + m.text + '"');
    },

    /* O que uma fala planejada pelo motor quer dizer, em linguagem natural. */
    describeBeat(mt, x) {
      const g = mt.g, nm = (id) => V.who(g, id);
      const parts = [];
      for (const it of x.intents) {
        switch (it.type) {
          case 'accuse': parts.push('acusar ' + nm(it.who) + ' (' + (REASON[it.reason] || 'suspeito') + (it.area ? ', ' + V.area(it.area) : '') + ')' + (it.strong ? ' — tem certeza' : '')); break;
          case 'vouch': parts.push('defender ' + nm(it.who) + ' (' + (VOUCH[it.reason] || 'acha inocente') + ')'); break;
          case 'claimLoc': parts.push('dizer onde estava: ' + (it.rooms || []).map(V.area).join(' → ') + (it.with && it.with.length ? ', com ' + it.with.map(nm).join(', ') : '')); break;
          case 'sawAt': parts.push('dizer que viu ' + nm(it.who) + ' em ' + V.area(it.area)); break;
          case 'askWhere': parts.push('perguntar a ' + nm(it.who) + ' onde estava'); break;
          case 'askAll': parts.push('pedir para cada um dizer onde estava'); break;
          case 'askBody': parts.push('perguntar onde estava o corpo'); break;
          case 'askProof': parts.push('pedir prova'); break;
          case 'deny': parts.push('negar que foi ele'); break;
          case 'skip': parts.push('sugerir pular (skip)'); break;
          case 'agree': parts.push('concordar sobre ' + nm(it.who)); break;
          case 'reportInfo': parts.push('contar que achou o corpo de ' + nm(it.victim) + ' em ' + V.area(it.area)); break;
          case 'bodyArea': parts.push('dizer que o corpo estava em ' + V.area(it.area)); break;
          case 'quiet': parts.push('cobrar ' + nm(it.who) + ', que está quieto'); break;
          case 'roleClaim': parts.push('dizer que é ' + (T.ROLE_TXT[it.role] || it.role)); break;
          case 'offerVisual': parts.push('se oferecer para provar inocência fazendo a tarefa visual na frente de quem quiser seguir'); break;
          case 'roleTheory': parts.push('comentar a teoria de ' + (T.ROLE_TXT[it.role] || it.role)); break;
          default: break;
        }
      }
      const k = x.meta.kind;
      if (k === 'vote') parts.unshift(x.meta.vote === 'skip' ? 'avisar que votou skip (' + (x.meta.reason || 'sem prova') + ')' : 'avisar que votou em ' + nm(x.meta.vote) + ' (' + (x.meta.reason || 'suspeito') + ')');
      let s = parts.length ? parts.join('; ') : 'comentar';
      if (x.meta.srcFrom != null && x.meta.srcText) s += ' — respondendo a ' + g.players[x.meta.srcFrom].name + ' ("' + x.meta.srcText.slice(0, 90) + '")';
      return s;
    },

    describeMotive(mt, b, m) {
      const g = mt.g, nm = (id) => V.who(g, id), hp = g.human;
      const quote = (msg) => g.players[msg.from].name + ': "' + msg.text.slice(0, 90) + '"';
      switch (m.kind) {
        case 'answerHuman': {
          const msg = m.msg;
          const it = msg.intents;
          let how = 'responda com o que você sabe; se não souber, diga que não viu nada';
          if (it.some((i) => i.type === 'askWhere' && i.who === b.p.id)) how = 'diga onde esteve e o que fazia';
          else if (it.some((i) => i.type === 'accuse' && i.who === b.p.id)) how = 'defenda-se, com o seu álibi';
          else if (it.some((i) => i.who === b.p.id)) how = 'responda ao que falaram de você';
          else if (it.some((i) => i.type === 'claimLoc')) how = 'reaja ao álibi: confirme só se viu, duvide ou pergunte algo';
          else if (it.some((i) => i.type === 'accuse')) how = 'diga se concorda, se viu algo ou peça prova';
          return 'responder a ' + (hp ? hp.name : 'quem falou') + ', que escreveu: "' + msg.text.slice(0, 120) + '" — ' + how + '. Seja breve e não acuse ' + (hp ? hp.name : 'ele') + ' sem motivo nas suas anotações.';
        }
        case 'defend': return 'foi acusado (' + m.by.map(quote).join(' / ') + '): defenda-se com o seu álibi e questione a acusação.';
        case 'answer': return 'perguntaram onde você estava (' + m.by.map(quote).join(' / ') + '): responda.';
        case 'mentioned': return 'falaram de você (' + m.by.map(quote).join(' / ') + '): responda.';
        case 'plead': return 'você está levando votos: tente convencer a galera a não votar em você.';
        case 'claim': return 'você ainda não disse onde estava: conte.';
        case 'pressClaims': return 'cobre quem ainda não disse onde estava: ' + m.who.map((id) => g.players[id].name).join(', ') + '.';
        case 'askHuman': return 'pergunte a ' + nm(hp.id) + ' onde estava e com quem (ainda não disse).';
        case 'push': return b.p.isImp
          ? 'puxe a conversa para ' + nm(m.who) + ', de leve, com dúvida, sem inventar prova.'
          : 'diga o que acha de ' + nm(m.who) + ' (' + V.reasonOf(b, m.who) + '): pressione ou peça explicação.';
        case 'react': return 'reaja à mensagem de ' + quote(m.msg) + ': concorde, duvide, pergunte algo ou complemente com o que você sabe.';
        case 'replyBot': return 'responda a ' + quote(m.msg) + ' — ' + m.how + '.';
        case 'summary': return 'resuma a situação em uma frase e proponha em quem votar ou pular, conforme o que você pensa.';
        case 'joke': return 'solte um comentário descontraído rápido, sem atrapalhar.';
        default: return 'fale algo útil para a discussão.';
      }
    },

    speakerBlock(mt, s, i) {
      const b = s.b, id = b.p.id;
      const said = V.said(mt, id);
      const pend = V.pending(mt, id);
      const lines = ['### ' + (i + 1) + '. ' + V.persona(b), 'Só ' + b.p.name + ' sabe:'];
      V.notes(b).forEach((l) => lines.push('- ' + l));
      lines.push(said.length ? 'Já disse nesta reunião (não repita): ' + said.join(' / ') : 'Ainda não falou nesta reunião.');
      const cob = pend.accused.concat(pend.asked).slice(0, 2);
      if (cob.length) lines.push('Cobraram ' + b.p.name + ' e ainda não respondeu: ' + cob.map((m) => mt.g.players[m.from].name + ': "' + m.text.slice(0, 80) + '"').join(' / '));
      const todo = s.beats.map((x) => 'o sentido é: ' + V.describeBeat(mt, x) + '. Frase-guia (reescreva do seu jeito): "' + x.text + '"');
      if (s.motive) todo.push(V.describeMotive(mt, b, s.motive));
      lines.push('Nesta vez, ' + b.p.name + ' deve: ' + todo.join(' E TAMBÉM ') );
      return lines.join('\n');
    },

    /* Linhas "Nome: texto" da resposta, na ordem, até 2 por personagem. */
    parseRound(text, round) {
      const out = [];
      const count = {};
      const keys = round.map((s) => ({ s, n: U.norm(s.b.p.name), c: U.norm(C.COLOR[s.b.p.color].name) }));
      const rows = String(text || '').split(/\n+/);
      for (const raw of rows) {
        const line = raw.replace(/^[\s*\-•>#\d.)]+/, '').replace(/\*\*/g, '').trim();
        const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
        if (!m) continue;
        const who = U.norm(m[1].replace(/\([^)]*\)/g, '').replace(/[@*"]/g, '')).trim();
        const k = keys.find((x) => x.n === who) || keys.find((x) => x.c === who) || keys.find((x) => who.startsWith(x.n + ' '));
        if (!k) continue;
        const id = k.s.b.p.id;
        if ((count[id] || 0) >= 2) continue;
        let t = tidy(m[2]);
        t = t.replace(new RegExp('^' + escapeRe(k.s.b.p.name) + '\\s*[:\\-–—]\\s*', 'i'), '');
        if (t.length < 1 || /^\(?(nada|sem resposta|\.\.\.)\)?$/i.test(t)) continue;
        count[id] = (count[id] || 0) + 1;
        out.push({ s: k.s, text: t });
      }
      if (!out.length && round.length === 1) {
        const only = rows.map((l) => l.trim()).filter(Boolean)[0];
        if (only) out.push({ s: round[0], text: tidy(only.replace(/^[^:]{1,24}:\s*/, '')) });
      }
      return out;
    },

    /* Intenções de uma fala livre: só as que batem com o que o bot sabe (o modelo não decide o jogo). */
    validIntents(b, text, motive, mt) {
      const g = b.g, p = b.p, id = p.id;
      const parsed = T.parse(text, g, { self: id, addressed: motive && motive.msg ? motive.msg.from : mt.lastSpeaker });
      const out = [];
      for (const it of parsed) {
        switch (it.type) {
          case 'accuse':
            if (it.who === id || !g.players[it.who] || !g.players[it.who].alive) break;
            if (p.isImp ? !g.players[it.who].isImp : (b.susp[it.who] || 0) >= 18) out.push(Object.assign({}, it, { strong: false, reason: STRONGS[it.reason] ? 'sus' : it.reason }));
            break;
          case 'vouch':
            if (p.isImp || (b.susp[it.who] || 0) <= -8) out.push(it);
            break;
          case 'claimLoc': {
            const al = b.getAlibi();
            out.push({ type: 'claimLoc', rooms: al.rooms, with: al.with != null ? [al.with] : [] });
            break;
          }
          case 'sawAt':
            if (p.isImp || b.sawTimes(it.who).some((s) => s.area === it.area || M.isNear(s.area, it.area))) out.push(it);
            break;
          case 'bodyArea':
            if (b.knowsBody && it.area === b.knowsBody) out.push(it);
            break;
          default:
            out.push(it);
        }
      }
      return out;
    },

    director(mt) {
      return new Director(mt);
    },
  };
  const STRONGS = { kill: 1, vent: 1, shift: 1, vanish: 1 };

  class Director {
    constructor(mt) {
      this.mt = mt;
      this.g = mt.g;
      this.beats = [];
      this.busy = false;
      this.calls = 0;
      this.fails = 0;
      this.nextRoundAt = 0;
      this.free = {};
      this.humanMsg = null;
      this.aiLines = 0;
      this.answered = {};
      this.aiVotes = {};
      this.votePending = new Set();
      this.voteTried = new Set();
      this.voteBusy = false;
      this.nextVoteCall = 0;
    }

    /* ---------- votos decididos pela IA ---------- */
    /* Pede os votos de quem está para votar nos próximos segundos, com o chat até ali. */
    voteTick() {
      const mt = this.mt, g = this.g, t = mt.t;
      if (mt.phase !== 'voting' || !this.on() || this.voteBusy || t < this.nextVoteCall || g.S.ui.aiActions === 'off') return;
      const list = mt.alive.map((id) => g.players[id]).filter((p) => p.brain && mt.votes[p.id] === undefined && !this.aiVotes[p.id] && !this.voteTried.has(p.id) && mt.voteAt[p.id] != null && mt.voteAt[p.id] <= t + 16);
      if (!list.length) return;
      this.nextVoteCall = t + 8;
      this.planVotes(list);
    }
    /* O voto deste bot deve esperar a IA? */
    waitVote(id) {
      return this.g.S.ui.aiActions !== 'off' && this.on() && !this.aiVotes[id] && !this.voteTried.has(id) && this.mt.t < this.mt.votingEnd - 6;
    }
    async planVotes(list) {
      this.voteBusy = true;
      list.forEach((p) => this.votePending.add(p.id));
      const crew = list.filter((p) => !p.isImp), imps = list.filter((p) => p.isImp);
      try {
        await Promise.all([crew.length ? this.askVotes(crew, false) : null, imps.length ? this.askVotes(imps, true) : null]);
      } catch (e) {
        /* sem IA, o motor decide */
      }
      list.forEach((p) => {
        this.votePending.delete(p.id);
        this.voteTried.add(p.id);
      });
      this.voteBusy = false;
    }
    async askVotes(list, imp) {
      const mt = this.mt, g = this.g;
      const alive = mt.alive.map((id) => g.players[id]);
      /* sem ejeção confirmada, cada bot estima quantos impostores sobram; o impostor sabe */
      const impsLeft = g.S.rules.confirmEjects ? mt.impostorsLeft : imp ? alive.filter((q) => q.isImp).length : Math.round(list.reduce((a, q) => a + q.brain.impsLeftEst(), 0) / list.length);
      const crewLeft = alive.length - impsLeft;
      const crisis = crewLeft <= impsLeft + 1;
      const heat = alive.map((q) => ({ q, h: mt.heat[q.id] || 0, acc: Object.keys(mt.accusers[q.id] || {}).length, def: Object.keys(mt.defenders[q.id] || {}).length })).filter((x) => x.h > 0 || x.def).sort((a, b) => b.h - a.h);
      const heatTxt = heat.length ? heat.slice(0, 5).map((x) => x.q.name + ': ' + x.acc + ' acusando, ' + x.def + ' defendendo').join('; ') : 'ninguém foi muito acusado';
      const lines = [V.scene(mt), '', 'Chat da reunião (mais antigo primeiro):', V.transcript(mt, 30), '', 'Pressão no chat: ' + heatTxt + '.', 'Situação: ' + alive.length + ' vivos' + (g.S.rules.confirmEjects ? ', ' + impsLeft + ' impostor(es) restante(s)' : '') + (crisis ? '. SITUAÇÃO CRÍTICA: se pularem, o próximo abate pode dar a vitória aos impostores.' : '.'), ''];
      if (!imp) {
        lines.push('Agora é a votação. Decida o voto de cada tripulante abaixo usando SÓ o que ele sabe (as anotações dele) e o que foi dito no chat.');
        lines.push('Como um jogador esperto decide: vota em quem tem prova (viu matar, ventar, mudar de forma) ou contradição clara de álibi; pesa se quem acusa é confiável; nunca vota em quem ele viu fazer tarefa visual; desconfia de quem acusa sem prova ou defende demais alguém suspeito; desconfia de quem reportou o corpo segundos depois de a vítima ser vista viva (self report); se não há nada concreto, pula.');
        lines.push('Voto dividido não tira ninguém: se o mais votado também é suspeito para ele e quem puxou trouxe prova, junta ali.');
        if (g.S.rules.visualTasks) lines.push('Quem se ofereceu para provar com tarefa visual ("me segue que eu faço os escudos/o scan") e não tem prova forte contra ganha o benefício da dúvida, principalmente no começo da partida: o normal é pular e acompanhar a pessoa na próxima rodada. Só não vale para quem já prometeu antes e não provou.');
        if (crisis && (g.S.rules.visualTasks || g.S.rules.confirmEjects)) lines.push('SITUAÇÃO CRÍTICA: NINGUÉM PULA. Se ninguém sair, o próximo abate encerra o jogo. Cada um vota no mais provável (fora quem ele sabe que é inocente) e, se possível, todos no mesmo.');
        else if (crisis) lines.push('SITUAÇÃO CRÍTICA, mas sem tarefa visual e sem confirmação ninguém prova nada: vota quem tem pista concreta (viu algo, relato forte); sem pista, pular dá tempo de terminar as tarefas — voto no chute costuma tirar inocente, porque os impostores votam juntos.');
      } else {
        const team = g.players.filter((q) => q.isImp && q.alive).map((q) => q.name).join(', ');
        lines.push('Você decide o voto dos IMPOSTORES abaixo (os tripulantes não sabem quem são). Impostores vivos: ' + team + '.');
        lines.push('Estratégia esperta: votar junto na pessoa que o chat já está acusando (desde que não seja parceiro) para ejetar um tripulante; não defender o parceiro às claras; se o parceiro estiver perdido (várias acusações com prova), votar nele para ganhar confiança; não votar sozinho em alguém que ninguém acusou; pular quando todo mundo está pulando.');
        if (crisis) lines.push('RETA FINAL: se ninguém de vocês sair, o próximo abate ganha o jogo. Votem os dois no MESMO tripulante (o mais acusado) ou pulem juntos; nunca num parceiro.');
      }
      lines.push('Opções de voto: pular, ou um destes: ' + alive.map((q) => q.name).join(', ') + '.', '');
      for (const p of list) {
        lines.push('### ' + V.persona(p.brain));
        V.notes(p.brain, { noLean: true }).forEach((l) => lines.push('- ' + l));
        if (imp) {
          const mate = g.players.filter((q) => q.isImp && q !== p && q.alive).map((q) => q.name);
          if (mate.length) lines.push('- (segredo) parceiro(s): ' + mate.join(', ') + '.');
          lines.push('- Acusações contra ' + p.name + ': ' + Object.keys(mt.accusers[p.id] || {}).length + '.');
        }
        lines.push('');
      }
      lines.push('Formato: uma linha por personagem, exatamente assim (motivo curto, como ele diria no chat):');
      list.forEach((p) => lines.push(p.name + ': <nome ou pular> | <motivo>'));
      this.calls++;
      const text = await AU.LLM.complete(V.system(g), lines.join('\n'), { maxTokens: 80 + list.length * 45 });
      if (!text) return;
      for (const raw of String(text).split(/\n+/)) {
        const line = raw.replace(/^[\s*\-•>#\d.)]+/, '').replace(/\*\*/g, '').trim();
        const m = line.match(/^([^:|]{1,40}):\s*(?:voto\s*:?\s*)?([^|]+?)\s*(?:\|\s*(?:motivo\s*:?\s*)?(.+))?$/i);
        if (!m) continue;
        const wn = U.norm(m[1].replace(/\([^)]*\)/g, '')).trim();
        const p = list.find((x) => U.norm(x.name) === wn || U.norm(C.COLOR[x.color].name) === wn);
        if (!p) continue;
        const tt = U.norm(m[2]).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
        let target = null;
        if (/^(pular|pulo|pula|skip|ninguem|nenhum)/.test(tt)) target = 'skip';
        else {
          const q = alive.find((x) => tt === U.norm(x.name) || tt === U.norm(C.COLOR[x.color].name) || tt.split(' ').includes(U.norm(x.name)));
          if (q) target = q.id;
        }
        if (target == null || target === p.id) continue;
        if (!p.isImp && target !== 'skip' && ((p.brain.ev && p.brain.ev[target]) || []).some((e) => e.reason === 'visual')) continue;
        /* trava da reta final: tripulante não pula na crise se o motor tem um candidato */
        if (!p.isImp && crisis && target === 'skip') {
          const eng = p.brain.mVote();
          if (eng != null && eng !== 'skip') target = eng;
        }
        /* impostor nunca vota no parceiro por engano da IA (entregar o parceiro é decisão do motor) */
        if (p.isImp && target !== 'skip' && g.players[target] && g.players[target].isImp) {
          const eng = p.brain.mVote();
          target = eng != null ? eng : 'skip';
        }
        this.aiVotes[p.id] = { target, reason: tidy(m[3] || '').slice(0, 90) };
      }
    }
    get webllm() {
      return AU.LLM.provider === 'webllm';
    }
    /* teto de chamadas por reunião, para não gastar o uso de quem joga nem bater no limite */
    maxCalls() {
      return this.webllm ? 24 : 40;
    }
    on() {
      return V.active(this.mt) && this.calls < this.maxCalls() && this.fails < 3;
    }
    accepts(meta) {
      if (!this.on()) return false;
      const mode = this.g.S.ui.aiChat;
      return mode === 'full' || (mode === 'replies' && !!meta.toHuman);
    }
    /* Fala que só repete algo recente (mesma pergunta, mesmo álibi, mesma acusação) não entra. */
    redundant(b, intents) {
      const mt = this.mt, id = b.p.id;
      const recent = mt.msgs.filter((m) => mt.t - m.t < 30);
      const queued = this.beats.filter((x) => x.b === b);
      for (const it of intents) {
        if (it.type === 'claimLoc' && (recent.some((m) => m.from === id && m.intents.some((i) => i.type === 'claimLoc')) || queued.some((x) => x.intents.some((i) => i.type === 'claimLoc')))) return true;
        if (it.type === 'askWhere' && (recent.some((m) => m.intents.some((i) => i.type === 'askWhere' && i.who === it.who) && mt.t - m.t < 15) || mt.hasClaimed(it.who))) return true;
        if ((it.type === 'accuse' || it.type === 'vouch' || it.type === 'agree') && recent.some((m) => m.from === id && m.intents.some((i) => i.type === it.type && i.who === it.who))) return true;
        if (it.type === 'askAll' && recent.some((m) => m.intents.some((i) => i.type === 'askAll'))) return true;
      }
      return false;
    }
    enqueue(b, m, meta) {
      const mt = this.mt;
      if (!meta.toHuman && meta.kind !== 'vote' && (m.intents || []).length && this.redundant(b, m.intents)) return;
      const pri = meta.toHuman ? 3 : meta.direct ? 2 : meta.important ? 1 : 0;
      this.beats.push({ b, text: m.text, intents: m.intents || [], meta, at: mt.t, pri, until: Math.max(mt.t, mt.durI) + (pri >= 2 ? 22 : pri ? 30 : 16) });
    }
    onHuman(msg) {
      if (!V.active(this.mt)) return;
      this.humanMsg = msg;
      /* espera um instante para juntar as reações do motor a esta mensagem na mesma rodada */
      this.nextRoundAt = this.mt.t + 0.45;
    }
    pendingLines() {
      return this.mt.sched.filter((x) => x.dir).length;
    }
    /* Fala do motor sem passar pela IA (IA fora do ar, lenta ou sem resposta para ela). */
    postRaw(x, delay) {
      const mt = this.mt, p = x.b.p;
      mt.schedule(delay || 0.2, x.b, () => {
        if (!p.alive || mt.closed) return;
        mt.post(p, x.text, x.intents);
      }, { ttl: 15, dir: true, force: x.pri >= 2 });
    }
    flush() {
      const list = this.beats;
      this.beats = [];
      list.forEach((x, i) => this.postRaw(x, 0.2 + i * 0.4));
    }

    tick() {
      const mt = this.mt, t = mt.t;
      if (mt.phase !== 'discussion' && mt.phase !== 'voting') return;
      this.voteTick();
      const on = this.on();
      for (const x of this.beats.slice()) {
        if (t <= x.until && x.b.p.alive) continue;
        /* com a IA ativa, fala importante atrasada ganha mais um tempo; o resto perde a vez (nada de frase pronta no meio) */
        if (on && x.pri >= 1 && !x.extended && x.b.p.alive) {
          x.extended = true;
          x.until = t + 12;
          continue;
        }
        this.beats.splice(this.beats.indexOf(x), 1);
        if (!on && x.pri >= 1 && x.b.p.alive) this.postRaw(x);
      }
      if (this.busy || t < this.nextRoundAt) return;
      if (!on) {
        if (this.beats.length) this.flush();
        return;
      }
      if (this.pendingLines() > 1 && !this.humanMsg) return;
      const round = this.plan();
      if (round) this.run(round);
    }

    /* Monta a próxima rodada: falas planejadas primeiro, depois quem tem motivo para falar. */
    plan() {
      const mt = this.mt, g = this.g, t = mt.t;
      const maxSp = this.webllm ? 2 : 5;
      const sp = new Map();
      const add = (b, beat, motive) => {
        const id = b.p.id;
        let s = sp.get(id);
        if (!s) {
          if (sp.size >= maxSp) return false;
          s = { b, beats: [], motive: null };
          sp.set(id, s);
        }
        if (beat) {
          if (s.beats.length >= 2) return false;
          s.beats.push(beat);
        }
        if (motive && !s.motive) s.motive = motive;
        return true;
      };
      const taken = [];
      const due = this.beats.filter((x) => x.at <= t + 0.01 && x.b.p.alive).sort((a, c) => c.pri - a.pri || a.at - c.at);
      for (const x of due) if (add(x.b, x)) taken.push(x);
      const mode = g.S.ui.aiChat;
      const hm = this.humanMsg;
      if (hm) {
        this.humanMsg = null;
        const already = [...sp.values()].filter((s) => s.beats.some((x) => x.meta.toHuman)).length;
        const want = Math.max(1, Math.min(3, maxSp) - already);
        let n = 0;
        for (const q of this.responders(hm)) {
          if (n >= want) break;
          if (sp.has(q.id) && sp.get(q.id).beats.some((x) => x.meta.toHuman)) continue;
          if (add(q.brain, null, { kind: 'answerHuman', msg: hm })) n++;
        }
      }
      if (mode === 'full' && t > mt.durI + 2 && sp.size < maxSp) {
        /* conversa entre eles: quem foi citado, contestado ou tem algo a dizer sobre a última fala entra na rodada */
        const quiet = t - mt.lastMsgT;
        const ms = this.motives().filter((m) => !sp.has(m.b.p.id));
        const strong = ms.filter((m) => m.s >= 55);
        let n = Math.min(2, strong.length, maxSp - sp.size);
        for (const m of strong.slice(0, n)) add(m.b, null, m);
        if (sp.size < 2 && quiet > (mt.phase === 'voting' ? 4.5 : 2.2)) {
          const rest = ms.filter((m) => !sp.has(m.b.p.id));
          n = sp.size ? 1 : U.chance(0.6) ? 2 : 1;
          for (const m of rest.slice(0, n)) add(m.b, null, m);
        }
      }
      if (!sp.size) return null;
      this.beats = this.beats.filter((x) => !taken.includes(x));
      for (const s of sp.values()) {
        if (!s.motive) continue;
        if (s.motive.msg) this.answered[s.motive.msg.id] = (this.answered[s.motive.msg.id] || 0) + 1;
        if (s.motive.kind !== 'answerHuman' && s.motive.kind !== 'defend' && s.motive.kind !== 'answer') this.free[s.b.p.id] = (this.free[s.b.p.id] || 0) + 1;
        if (s.motive.kind === 'askHuman') {
          mt.askedHumanAt = t;
          mt.askedHumanBy = s.b.p.id;
        }
      }
      const rank = (s) => (s.beats.some((x) => x.meta.toHuman) || (s.motive && s.motive.kind === 'answerHuman') ? 2 : 0);
      return [...sp.values()].sort((a, c) => rank(c) - rank(a));
    }

    /* Quem responde ao jogador: só quem ele citou ou cobrou, quem sabe algo do assunto,
       e alguém a mais apenas quando é uma pergunta para todos. */
    responders(msg) {
      const mt = this.mt, g = this.g, hp = g.human;
      const out = [];
      const add = (p) => {
        if (p && p.alive && p.brain && p !== hp && !out.includes(p)) out.push(p);
      };
      const intents = msg.intents || [];
      const n = U.norm(msg.text);
      const alive = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && q !== hp);
      for (const it of intents) if (it.who != null && ['askWhere', 'accuse', 'vouch', 'sawAt', 'mention'].includes(it.type)) add(g.players[it.who]);
      if (!out.length && /\b(vc|voce|tu|ce)\b/.test(n) && mt.lastToHuman != null) add(g.players[mt.lastToHuman]);
      /* quem tem informação sobre o assunto */
      for (const it of intents) {
        if (it.type === 'accuse' && it.who != null) add(alive.find((q) => !q.isImp && q.id !== it.who && ((q.brain.ev && q.brain.ev[it.who]) || []).some((e) => Math.abs(e.w) >= 14)));
        if (it.type === 'claimLoc') add(alive.find((q) => q.brain.sawTimes && q.brain.sawTimes(hp.id).length));
        if (it.type === 'roleTheory' || it.type === 'roleClaim') add(alive.find((q) => q.brain.pers.times || q.brain.pers.skeptic));
      }
      const question = /\?/.test(msg.text) || intents.some((i) => i.type === 'askWho' || i.type === 'askAll' || i.type === 'askBody');
      const directed = intents.some((i) => i.who != null);
      const pool = alive.filter((q) => !out.includes(q) && !mt.typing.has(q.id));
      const pick = () => U.weighted(pool.filter((q) => !out.includes(q)), (q) => 0.2 + q.brain.pers.talk + (q.brain.pers.leader || q.brain.pers.skeptic ? 0.4 : 0));
      if (!directed && question && out.length < 2) {
        add(pick());
        if (out.length < 2 && U.chance(0.5)) add(pick());
      } else if (!out.length && U.chance(0.55)) add(pick());
      return out.slice(0, 2);
    }

    /* Conversa entre bots: mensagens recentes de bots que pedem resposta de quem sabe algo sobre elas. */
    threads() {
      const mt = this.mt, g = this.g;
      const out = [];
      const nm = (id) => g.players[id].name;
      const recent = mt.msgs.slice(-8).filter((m) => !g.players[m.from].isHuman && (this.answered[m.id] || 0) < 2 && mt.t - m.t < 25);
      const bots = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && !q.isHuman && !mt.typing.has(q.id));
      for (const m of recent.reverse()) {
        const A = m.from;
        for (const it of m.intents) {
          for (const q of bots) {
            const b = q.brain, id = q.id;
            if (id === A) continue;
            const add = (how, s, intents, bump) => out.push({ b, kind: 'replyBot', msg: m, how, s, intents: intents || [], bump });
            const X = it.who;
            if (it.type === 'claimLoc') {
              if (q.isImp) continue;
              const rooms = it.rooms || [];
              const seen = b.sawTimes(A).filter((x) => x.t1 >= mt.info.t - 40);
              const match = seen.find((x) => rooms.some((r) => r === x.area || M.isNear(r, x.area)));
              const miss = seen.filter((x) => !rooms.some((r) => r === x.area || M.isNear(r, x.area))).pop();
              if (match) add('confirme: você viu ' + nm(A) + ' em ' + V.area(match.area), 62, [{ type: 'vouch', who: A, reason: 'claim' }], -6);
              else if (miss) add('conteste: você viu ' + nm(A) + ' em ' + V.area(miss.area) + ', não bate com o que ele disse', 78, [{ type: 'accuse', who: A, reason: 'lie', area: miss.area }], 12);
              else if ((b.getAlibi().rooms || []).some((r) => rooms.includes(r)) && b.myStay && rooms.some((r) => b.myStay(r) >= 12)) add('você também esteve em ' + rooms.filter((r) => b.getAlibi().rooms.includes(r)).map(V.area).join('/') + ' e não viu ' + nm(A) + ' lá: questione', 66, [{ type: 'accuse', who: A, reason: 'sus' }], 8);
              else if (b.pers.skeptic) add('pergunte quem confirma o que ' + nm(A) + ' disse', 50, []);
              else if (b.pers.times) add('pergunte a ' + nm(A) + ' fazendo o quê e com quem', 42, []);
            } else if (it.type === 'accuse' && X != null && X !== id && g.players[X] && g.players[X].alive) {
              const sx = b.susp[X] || 0, sa = b.susp[A] || 0;
              if (q.isImp) {
                const heat = (mt.heat[X] || 0) + (it.strong ? 30 : 0);
                if (g.players[X].isImp) {
                  if (heat >= 55 && U.chance(b.lvl.bus)) add('concorde com cautela que ' + nm(X) + ' está estranho', 50, [{ type: 'agree', who: X }]);
                  else if (heat < 40 && U.chance(b.lvl.lie * 0.5)) add('ponha em dúvida a acusação contra ' + nm(X) + ' com calma (pergunte pela prova), sem parecer que está defendendo', 52, [{ type: 'askProof' }]);
                } else add('concorde que ' + nm(X) + ' está estranho', 48, [{ type: 'agree', who: X }]);
                continue;
              }
              if (sx <= -15) add('defenda ' + nm(X) + ': você confia nele (' + (((b.ev && b.ev[X]) || []).some((e) => e.reason === 'visual') ? 'viu fazer tarefa visual' : 'estava junto / o álibi bate') + ')', 72, [{ type: 'vouch', who: X, reason: 'together' }], null);
              else if (sx >= 25) add('concorde e diga por que: ' + V.reasonOf(b, X), 60, [{ type: 'agree', who: X }]);
              else if (sa >= 30) add('questione ' + nm(A) + ', de quem você desconfia (' + V.reasonOf(b, A) + ')', 58, [{ type: 'accuse', who: A, reason: 'sus' }]);
              else if (b.pers.defend && !it.strong) add('peça prova para ' + nm(A), 52, [{ type: 'askProof' }]);
            } else if (it.type === 'vouch' && X != null && X !== id) {
              if (!q.isImp && (b.susp[X] || 0) >= 30) add('duvide da defesa: você desconfia de ' + nm(X) + ' (' + V.reasonOf(b, X) + ')', 56, []);
            } else if (it.type === 'deny' && !q.isImp) {
              const ev = ((b.ev && b.ev[A]) || []).find((e) => e.w >= 14);
              if (ev) add('pressione ' + nm(A) + ': ' + V.reasonOf(b, A), 64, [{ type: 'accuse', who: A, reason: ev.reason === 'nearBody' || ev.reason === 'lastWith' ? ev.reason : 'sus', area: ev.area }]);
            } else if (it.type === 'roleClaim' && !q.isImp && b.pers.skeptic) {
              add('duvide: qualquer um pode dizer que é ' + (T.ROLE_TXT[it.role] || it.role), 54, []);
            }
          }
        }
      }
      return out;
    }

    /* Quem tem motivo para falar agora e qual. */
    motives() {
      const mt = this.mt, g = this.g, t = mt.t, hp = g.human;
      const bots = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && !q.isHuman);
      const recent = mt.msgs.slice(-3).map((m) => m.from);
      const claimed = new Set(mt.alive.filter((id) => mt.hasClaimed(id)));
      const unclaimed = mt.alive.filter((id) => !claimed.has(id));
      const threadsBy = new Map();
      for (const th of this.threads()) {
        const k = th.b.p.id;
        if (!threadsBy.has(k)) threadsBy.set(k, []);
        threadsBy.get(k).push(th);
      }
      const out = [];
      for (const q of bots) {
        const b = q.brain, id = q.id;
        if (mt.typing.has(id)) continue;
        const pend = V.pending(mt, id);
        const cand = [];
        if (pend.accused.length) cand.push({ kind: 'defend', by: pend.accused.slice(0, 2), s: 85 });
        if (pend.asked.length) cand.push({ kind: 'answer', by: pend.asked.slice(0, 2), s: 80 });
        if (pend.mentioned.length) cand.push({ kind: 'mentioned', by: pend.mentioned.slice(0, 2), s: 45 });
        const cap = 1 + Math.round(b.pers.talk * 3);
        if (!cand.length && (this.free[id] || 0) >= cap) continue;
        if (mt.phase === 'voting' && mt.saidOn(id) >= 2 && !recent.includes(id)) cand.push({ kind: 'plead', s: 75 });
        if (!claimed.has(id) && t > mt.durI + 6) cand.push({ kind: 'claim', s: 38 + b.pers.talk * 20 });
        const others = unclaimed.filter((x) => x !== id && !(hp && x === hp.id && mt.askedHumanAt != null));
        if ((b.pers.leader || b.pers.skeptic) && others.length && t > mt.durI + 8) cand.push({ kind: 'pressClaims', who: others.slice(0, 3), s: 48 });
        if (hp && hp.alive && !mt.humanClaimed && !mt.hasClaimed(hp.id) && t > mt.durI + 12 && mt.askedHumanAt == null && (b.pers.leader || b.pers.skeptic || b.pers.talk >= 0.7)) cand.push({ kind: 'askHuman', s: 40 });
        /* desconfiança sobre os OUTROS: o jogador só entra se houver prova de verdade contra ele */
        let top = null;
        const fair = (x) => !(hp && x === hp.id) || ((b.ev && b.ev[x]) || []).some((e) => e.w >= 14);
        if (q.isImp) top = b.scapegoat != null && g.players[b.scapegoat].alive && fair(b.scapegoat) ? { id: b.scapegoat, s: 36 } : null;
        else {
          const ranked = mt.alive.filter((x) => x !== id && fair(x)).map((x) => ({ id: x, s: b.susp[x] || 0 })).sort((a, c) => c.s - a.s);
          const ts = ranked[0];
          const need = b.pers.talk >= 0.6 || b.pers.hunch ? 26 : Math.min(b.pers.thr * 0.8, 40);
          if (ts && ts.s >= need) top = ts;
        }
        if (top) cand.push({ kind: 'push', who: top.id, s: 30 + Math.min(40, top.s / 2) });
        if (b.pers.leader && mt.msgs.length > 8) cand.push({ kind: 'summary', s: 32 });
        /* reage de preferência a outro bot; ao jogador só se ninguém respondeu ainda */
        const last = mt.msgs.slice().reverse().find((m) => m.from !== id && (!g.players[m.from].isHuman || !(this.answered[m.id] > 0)));
        if (last) cand.push({ kind: 'react', msg: last, s: 24 + b.pers.talk * 22 - (g.players[last.from].isHuman ? 10 : 0) });
        if (b.pers.offtopic && U.chance(b.pers.offtopic * 0.4)) cand.push({ kind: 'joke', s: 18 });
        for (const th of threadsBy.get(id) || []) cand.push(th);
        if (!cand.length) continue;
        cand.sort((a, c) => c.s - a.s);
        const m = cand[0];
        out.push(Object.assign({ b, score: m.s + U.rf(0, 18) + b.pers.talk * 10 - (recent.includes(id) ? 35 : 0) }, m));
      }
      return out.sort((a, c) => c.score - a.score);
    }

    prompt(round) {
      const mt = this.mt, g = this.g;
      const last = mt.msgs[mt.msgs.length - 1];
      return [
        V.scene(mt),
        '',
        'Chat da reunião até agora (mais antigo primeiro):',
        V.transcript(mt, this.webllm ? 12 : 24),
        '',
        'Agora falam, nesta ordem:',
        round.map((s, i) => V.speakerBlock(mt, s, i)).join('\n\n'),
        '',
        'Regras desta rodada:',
        '- Escreva a próxima mensagem de cada personagem acima, continuando o chat a partir da última mensagem' + (last ? ' (' + g.players[last.from].name + ': "' + last.text.slice(0, 80) + '")' : '') + '.',
        '- Quando está escrito "o sentido é", mantenha exatamente os fatos (quem, onde, o quê), mas com as palavras e o jeito do personagem, ligando com o que acabou de ser dito.',
        '- Nas outras falas, siga só o objetivo e o que o personagem sabe.',
        '- É uma conversa entre eles: quem responde a alguém cita o nome de quem está respondendo; um personagem pode responder a outro desta mesma rodada. Não fiquem todos falando da mesma pessoa.',
        '- O que quem chamou a reunião contou (e o que o jogador humano diz) é assunto: ninguém ignora. Pode acreditar, duvidar com motivo, perguntar detalhe (onde, quando, quem mais viu) ou cobrar o acusado, mas sempre levando em conta o que foi dito.',
        '- Cada um escreve 1 mensagem (no máximo 2 curtas, se ficar mais natural quebrar). Até 120 caracteres cada. Não repita frases já ditas.',
        'Formato: só as linhas, uma por mensagem, assim:',
        round.map((s) => s.b.p.name + ': mensagem').join('\n'),
      ].join('\n');
    }

    async run(round) {
      const mt = this.mt, g = this.g;
      this.busy = true;
      this.calls++;
      round.forEach((s) => mt.typing.add(s.b.p.id));
      if (mt.ui) mt.ui.renderTyping();
      let text = null;
      try {
        const call = AU.LLM.complete(V.system(g), this.prompt(round), { maxTokens: 90 + round.length * 90, timeout: this.webllm ? 40000 : 25000 });
        const limit = this.webllm ? 45000 : 30000;
        text = await Promise.race([call, new Promise((res) => setTimeout(() => res(null), limit))]);
      } catch (e) {
        text = null;
      }
      this.busy = false;
      round.forEach((s) => mt.typing.delete(s.b.p.id));
      if (mt.ui) mt.ui.renderTyping();
      if (mt.closed || (mt.phase !== 'discussion' && mt.phase !== 'voting' && mt.phase !== 'intro')) return;
      const lines = text ? V.parseRound(text, round) : [];
      if (!lines.length) {
        this.fails++;
        round.forEach((s) => s.beats.forEach((x, i) => this.postRaw(x, 0.2 + i * 0.5)));
        this.nextRoundAt = mt.t + 1;
        return;
      }
      this.fails = 0;
      mt.aiUsed = true;
      const firstOf = new Set();
      let delay = 0.25;
      const seenText = mt.msgs.slice(-18).map((m) => ({ from: m.from, text: m.text }));
      for (const ln of lines) {
        const s = ln.s, b = s.b, p = b.p;
        /* linha repetida descartada: a mesma pessoa dizendo quase a mesma coisa, ou cópia de outra fala longa */
        const dup = seenText.some((x) => (x.from === p.id ? similar(x.text, ln.text) >= 0.6 : !s.beats.length && words(ln.text).size >= 5 && similar(x.text, ln.text) >= 0.85));
        if (dup) continue;
        seenText.push({ from: p.id, text: ln.text });
        let intents;
        if (!firstOf.has(p.id)) {
          firstOf.add(p.id);
          intents = [].concat(...s.beats.map((x) => x.intents));
          const extra = V.validIntents(b, ln.text, s.motive, mt).filter((it) => !s.beats.length || ['askWhere', 'askWho', 'askBody', 'mention', 'skip'].includes(it.type));
          intents = intents.concat(extra);
          if (s.motive && ['claim', 'answer', 'defend'].includes(s.motive.kind) && !b.claimed) {
            const al = b.getAlibi();
            intents.push({ type: 'claimLoc', rooms: al.rooms, with: al.with != null ? [al.with] : [] });
            b.claimed = true;
          }
          if (s.motive && s.motive.kind === 'defend') intents.push({ type: 'deny' });
          if (s.motive && s.motive.kind === 'replyBot') {
            /* a resposta carrega o que o motor sabe (confirma, contesta, defende) e mexe na suspeita de quem fala */
            intents = intents.concat(s.motive.intents || []);
            if (s.motive.bump) b.bump(s.motive.msg.from, s.motive.bump);
          }
        } else intents = V.validIntents(b, ln.text, s.motive, mt).filter((it) => ['askWhere', 'askWho', 'askBody', 'mention', 'skip'].includes(it.type));
        intents = dedupe(intents);
        /* contradição: defende e acusa a mesma pessoa (nome e cor confundidos) */
        const pro = new Set(intents.filter((i) => i.type === 'vouch').map((i) => i.who));
        const contra = new Set(V.validIntents(b, ln.text, s.motive, mt).filter((i) => i.type === 'accuse' || i.type === 'agree').map((i) => i.who).concat(intents.filter((i) => i.type === 'accuse' || i.type === 'agree').map((i) => i.who)));
        const confirming = /\b(verdade|confirmo|confirma|tava mesmo|estava mesmo|isso ai|e isso|eh isso)\b/.test(U.norm(ln.text));
        const parsedPro = new Set(T.parse(ln.text, g, { self: p.id }).filter((i) => i.type === 'vouch' || (confirming && i.type === 'sawAt')).map((i) => i.who));
        if ([...contra].some((w) => pro.has(w) || parsedPro.has(w))) {
          if (s.beats.length) s.beats.forEach((x) => this.postRaw(x, delay + 0.4));
          continue;
        }
        if (intents.some((i) => i.type === 'claimLoc')) b.claimed = true;
        const toHuman = s.beats.some((x) => x.meta.toHuman) || (s.motive && s.motive.kind === 'answerHuman');
        mt.schedule(delay, b, () => {
          if (!p.alive || mt.closed) return;
          this.aiLines++;
          mt.post(p, T.toneFilter(ln.text, g.S.bots.chatTone), intents, { ai: true });
        }, { ttl: 30, force: toHuman, dir: true });
        delay += 0.5 + Math.min(2.2, ln.text.length / 40) * U.rf(0.7, 1.2);
      }
      /* falas planejadas que o modelo pulou saem com o texto do motor */
      for (const s of round) if (s.beats.length && !firstOf.has(s.b.p.id)) s.beats.forEach((x) => this.postRaw(x, delay + 0.5));
      /* intervalo mínimo entre chamadas: menos pedidos, rodadas com mais falas */
      this.nextRoundAt = mt.t + (AU.LLM.provider === 'claude' ? 3 : 1);
    }

    /* Primeira rodada começa já na abertura da reunião, para as falas saírem assim que a discussão abre. */
    opening() {
      const mt = this.mt, g = this.g;
      if (!this.accepts({})) return;
      const list = [];
      for (const id of mt.alive) {
        const p = g.players[id];
        if (!p.brain || !p.brain.queue) continue;
        const it = p.brain.queue.find((x) => x.pre && x.pre.text);
        if (it) list.push({ b: p.brain, it });
      }
      list.sort((a, c) => (c.b.p.id === mt.info.caller) - (a.b.p.id === mt.info.caller) || U.rf(-1, 1));
      for (const x of list.slice(0, this.webllm ? 2 : 4)) {
        x.b.queue.splice(x.b.queue.indexOf(x.it), 1);
        x.it.posted = true;
        this.enqueue(x.b, x.it.pre, { kind: x.it.k, important: true });
        /* quem chamou e viu o abate: a acusação vai junto na primeira rodada */
        if (x.b.p.id === mt.info.caller) {
          const nx = x.b.queue.find((it) => it.pre && it.pre.text && it.k === 'accuse');
          if (nx) {
            x.b.queue.splice(x.b.queue.indexOf(nx), 1);
            nx.posted = true;
            this.enqueue(x.b, nx.pre, { kind: nx.k, important: true });
          }
        }
      }
      const round = this.plan();
      if (round) this.run(round);
    }
  }

  function words(t) {
    return new Set(U.norm(t).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1));
  }
  function similar(a, b) {
    const A = words(a), B = words(b);
    if (!A.size || !B.size) return U.norm(a).trim() === U.norm(b).trim() ? 1 : 0;
    let n = 0;
    for (const w of A) if (B.has(w)) n++;
    return n / Math.max(A.size, B.size);
  }
  function dedupe(list) {
    const seen = new Set();
    return list.filter((it) => {
      const k = it.type + ':' + (it.who != null ? it.who : '') + ':' + (it.area || '') + ':' + (it.rooms ? it.rooms.join(',') : '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function tidy(s) {
    let t = String(s || '').trim().replace(/^["'“”«»]+|["'“”«»]+$/g, '').replace(/\s+/g, ' ');
    if (t.length > 170) t = t.slice(0, 167).replace(/\s+\S*$/, '') + '…';
    return t;
  }

  AU.Voice = V;
})();

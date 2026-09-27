/* Linguagem do chat: frases dos bots, tom (limpo/casual/raiz) e leitura das mensagens do jogador. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;
  const pick = U.pick;

  const TASK_CHAT = {
    swipe: 'card', wires: 'os fios', calibrate: 'o distribuidor', chart: 'a rota', stabilize: 'a direção', cleanO2: 'o filtro',
    divert: 'a energia', shields: 'os escudos', manifolds: 'os coletores', reactor: 'o reator', align: 'o motor', fuel: 'a gasolina',
    inspect: 'a amostra', scan: 'o scan', upload: 'o download', asteroids: 'os asteroides', garbage: 'o lixo',
  };

  /* Ajudantes de referência, ligados a um jogo e a um falante. */
  function helpers(g, sp) {
    const x = {};
    x.R = (pid, form) => {
      const q = g.players[pid];
      if (!q) return 'alguém';
      const byName = q.isHuman ? U.chance(0.45) : U.chance(0.18);
      const col = C.COLOR[q.color].name.toLowerCase();
      if (byName) {
        const n = q.name;
        if (form === 'com') return 'com ' + n;
        if (form === 'de') return 'de ' + n;
        if (form === 'no') return 'em ' + n;
        return n;
      }
      if (form === 'o') return 'o ' + col;
      if (form === 'com') return 'com o ' + col;
      if (form === 'de') return 'do ' + col;
      if (form === 'no') return 'no ' + col;
      return col;
    };
    /* com adjetivo que muda com o gênero (morto, sozinho, suspeito, quieto) usa a cor: "o roxo", nunca "Mari morto" */
    x.Rc = (pid, form) => {
      const q = g.players[pid];
      if (!q) return 'alguém';
      const col = C.COLOR[q.color].name.toLowerCase();
      return ({ o: 'o ', com: 'com o ', de: 'do ', no: 'no ' }[form] || '') + col;
    };
    /* nome da sala conforme o tom: limpo = nome oficial ("na Elétrica"); casual = nome comum em português
       ("na elétrica", "na cafeteria", "no depósito"); raiz = apelido de jogador ("na elec", "no café", "no storage") */
    const tone = g && g.S && g.S.bots ? g.S.bots.chatTone : 'casual';
    const alias = (a) => {
      const A = M.AREA[a], ch = (A && A.chat) || [];
      if (tone === 'limpo' && A) {
        const hit = ch.find((c) => U.norm(c[0]) === U.norm(A.name));
        if (hit) return [A.name, hit[1], hit[2]];
        return A.kind === 'room' ? [A.name, (ch[0] || [])[1] || 'na', (ch[0] || [])[2] || 'da'] : [A.name, 'no', 'do'];
      }
      const slang = ch.filter((c) => SLANG_ROOM.has(c[0]));
      const plain = ch.filter((c) => !SLANG_ROOM.has(c[0]));
      if (tone === 'raiz') return slang.length && U.chance(0.85) ? U.pick(slang) : U.pick(ch);
      return plain.length ? U.pick(plain) : A ? [A.name.toLowerCase(), (ch[0] || [])[1] || 'no', (ch[0] || [])[2] || 'do'] : U.pick(ch);
    };
    x.inA = (a) => {
      const al = alias(a);
      return al[1] + ' ' + al[0];
    };
    x.deA = (a) => {
      const al = alias(a);
      return al[2] + ' ' + al[0];
    };
    /* "para a Elétrica" (limpo) / "pra elétrica", "pro depósito", "pros escudos" */
    x.toA = (a) => {
      const al = alias(a);
      const k = { no: 0, na: 1, nos: 2, nas: 3, em: 4 }[al[1]];
      if (tone === 'limpo') return 'para ' + ['o ', 'a ', 'os ', 'as ', ''][k == null ? 4 : k] + al[0];
      return ['pro ', 'pra ', 'pros ', 'pras ', 'pra '][k == null ? 4 : k] + al[0];
    };
    x.nA = (a) => alias(a)[0];
    x.tone = tone;
    x.task = (id) => TASK_CHAT[id] || 'task';
    x.vis = (type) => M.VISUAL_NAMES[type] || 'visual';
    x.ago = (s) => {
      if (s < 12) return 'agora pouco';
      if (s < 35) return 'uns ' + Math.round(s / 5) * 5 + 's antes';
      if (s < 75) return 'uns ' + Math.round(s / 10) * 10 + 's antes';
      return 'lá no começo';
    };
    x.sp = sp;
    return x;
  }

  /* apelidos de sala que só o tom raiz usa */
  const SLANG_ROOM = new Set(['café', 'upper', 'lower', 'sec', 'cams', 'med', 'weapons', 'nav', 'shields', 'comms', 'storage', 'elec', 'corredor da med', 'corredor do comms', 'corredor da nav']);

  const P = {
    reportInfo: (d, x) => pick([
      `corpo ${x.inA(d.area)}`,
      `achei o corpo ${x.R(d.victim, 'de')} ${x.inA(d.area)}`,
      `${x.R(d.victim, 'o')} morreu, corpo ${x.inA(d.area)}`,
      `corpo ${x.inA(d.area)}, era ${x.R(d.victim, 'o')}`,
      `${x.inA(d.area)}! ${x.R(d.victim, 'o')} morreu`,
    ]),
    reportWhy: (d, x) => pick([
      `estava indo fazer ${x.task(d.task)} e achei`,
      `passei por lá e o corpo já estava lá`,
      `acabei de achar`,
      `estava indo ${x.inA(d.area)} e dei de cara com o corpo`,
    ]),
    callReason: (d, x) => {
      const w = d.who != null ? x.R(d.who, 'o') : 'alguém';
      switch (d.reason) {
        case 'vent': return pick([`EU VI ${w.toUpperCase()} VENTAR`, `${w} ventou ${x.inA(d.area)}`, `chamei porque vi ${w} saindo do vent ${x.inA(d.area)}`, `${w} entrou no vent ${x.inA(d.area)}, certeza`]);
        case 'kill': return pick([`${w} matou ${x.R(d.victim, 'o')} ${x.inA(d.area)}`, `vi ${w} matando ${x.R(d.victim, 'o')}`, `EU VI! ${w} matou`]);
        case 'shift': return pick([`${w} se transformou em outra pessoa na minha frente`, `vi ${w} mudando de cor, é metamorfo`]);
        case 'vanish': return pick([`${w} sumiu do nada ${x.inA(d.area)}`, `${w} ficou invisível, é impostor`]);
        case 'fakeTask': return pick([`chamei porque ${w} fingiu tarefa ${d.area ? x.inA(d.area) : ''}: terminou e a barra não subiu`.replace(/\s+:/, ':'), `${w} tá fingindo task, vi ${d.area ? x.inA(d.area) : 'agora'} e a barra não mexeu`]);
        case 'noscan': return pick([`chamei porque ${w} ficou parado no scanner e não escaneou`, `${w} fingiu o scan, eu vi`]);
        case 'vitals': return pick([`sou cientista: ${d.victim != null ? x.R(d.victim, 'o') : 'alguém'} morreu e ninguém achou o corpo`, `o vitals mostra ${d.victim != null ? x.Rc(d.victim, 'o') : 'alguém'} morto, chamei pra avisar`]);
        case 'sus': return pick([`${w} tá muito estranho, chamei por isso`, `precisava falar: ${w} tá sus demais`, `apertei porque ${w} tá estranho`]);
        case 'chaos': return pick([`foi mal, apertei sem querer kkk`, `só queria ver quem está vivo`, `reunião surpresa kkkk`, `alguém tem info?`]);
        default: return pick([`alguém tem info?`, `chamei pra gente conversar`]);
      }
    },
    organize: () => pick([`todo mundo fala onde estava`, `bora, cada um fala onde estava e com quem`, `calma gente, um de cada vez: onde vocês estavam?`, `vamos organizar: sala e com quem estava`]),
    askWhere: (d, x) => pick([`e você, ${x.R(d.who)}?`, `${x.R(d.who)}, onde você estava?`, `${x.R(d.who)} estava onde?`, `e ${x.R(d.who, 'o')}? não falou nada ainda`]),
    askBody: () => pick([`onde foi o corpo?`, `onde?`, `cadê o corpo?`, `onde estava o corpo??`, `quem morreu e onde?`]),
    answerBody: (d, x) => pick([`${x.inA(d.area)}`, `foi ${x.inA(d.area)}`, `o corpo estava ${x.inA(d.area)}`]),
    claimLoc: (d, x) => {
      /* sem repetir sala seguida ("em armas, depois em armas") */
      const rs = d.rooms.filter((r, i, a) => i === 0 || x.nA(r) !== x.nA(a[i - 1]));
      const w = d.with != null ? ' ' + x.R(d.with, 'com') : '';
      const tk = d.task ? ' fazendo ' + x.task(d.task) : '';
      const pers = (x.sp && x.sp.pers) || {};
      const last = rs[rs.length - 1];
      /* muita gente responde curto, só onde estava no fim (no raiz e entre os caladões, mais ainda) */
      const short = x.tone === 'raiz' ? 0.5 : pers.talk != null && pers.talk < 0.35 ? 0.45 : x.tone === 'limpo' ? 0.1 : 0.2;
      if (rs.length && !(d.times && d.leftAgo) && U.chance(short)) {
        return pick([`${x.inA(last)}${tk}${w}`, `tava ${x.inA(last)}${tk}${w}`, `${x.nA(last)}${tk}${w}`]);
      }
      if (rs.length >= 3) {
        const [a, b, c] = rs.slice(-3);
        return pick([
          `passei ${x.inA(a)}, ${x.inA(b)} e agora ${x.inA(c)}${tk}${w}`,
          `fui ${x.deA(a)} ${x.toA(b)} e depois ${x.toA(c)}${tk}`,
          `${x.nA(a)}, ${x.nA(b)} e ${x.nA(c)}${tk}${w}`,
          `tava ${x.inA(c)}${tk}${w}, antes passei ${x.inA(b)}`,
        ]);
      }
      if (rs.length === 2) {
        const a = rs[0], b = rs[1];
        if (d.times && d.leftAgo) return `estava ${x.inA(a)} até uns ${d.leftAgo}s antes, depois fui ${x.toA(b)}${tk}${w}`;
        return pick([`estava ${x.inA(a)}, depois ${x.inA(b)}${tk}${w}`, `fui ${x.deA(a)} ${x.toA(b)}${tk}`, `eu estava ${x.inA(b)}${tk}${w}, antes ${x.inA(a)}`, `${x.nA(a)} e depois ${x.nA(b)}${tk}${w}`]);
      }
      const r = rs[0];
      return pick([`eu estava ${x.inA(r)}${tk}${w}`, `estava ${x.inA(r)}${tk}${w}`, `${x.inA(r)}${tk}${w}`]);
    },
    claimNone: () => pick([`estava fazendo task, não vi nada`, `sem info, estava nas minhas tasks`, `não vi nada`]),
    sawAt: (d, x) => pick([`vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `${x.R(d.who, 'o')} estava ${x.inA(d.area)}`, `${x.R(d.who, 'o')} passou por mim ${x.inA(d.area)}`]) + (d.ago != null && d.times ? ` (${x.ago(d.ago)})` : ''),
    sawNearBody: (d, x) => (d.area === d.bodyArea ? pick([
      `vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`,
      `${x.R(d.who, 'o')} estava ${x.inA(d.area)}`,
      `${x.R(d.who, 'o')} estava bem ali ${x.inA(d.area)}`,
    ]) : pick([
      `vi ${x.R(d.who, 'o')} ${x.inA(d.area)}, bem perto ${x.deA(d.bodyArea)}`,
      `${x.R(d.who, 'o')} estava saindo ${x.deA(d.bodyArea)}`,
      `${x.R(d.who, 'o')} estava perto ${x.deA(d.bodyArea)}`,
    ])) + (d.ago != null && d.times ? (d.ago < 12 ? ' pouco antes do report' : ` uns ${Math.round(d.ago / 5) * 5}s antes do report`) : ''),
    lastWithVictim: (d, x) => pick([
      `${x.Rc(d.who, 'o')} estava sozinho ${x.R(d.victim, 'com')} ${x.inA(d.area)}`,
      `a última vez que vi ${x.R(d.victim, 'o')}, estava ${x.R(d.who, 'com')}`,
      `${x.R(d.victim, 'o')} estava ${x.inA(d.area)} ${x.R(d.who, 'com')}`,
    ]),
    withVictim: (d, x) => pick([
      `${x.R(d.who, 'o')} estava seguindo ${x.R(d.victim, 'o')} ${x.inA(d.area)}`,
      `vi ${x.R(d.who, 'o')} andando colado ${x.R(d.victim, 'com')} ${x.inA(d.area)}`,
      `${x.R(d.who, 'o')} e ${x.R(d.victim, 'o')} estavam juntos ${x.inA(d.area)} pouco antes`,
    ]),
    sawVictimAlive: (d, x) => pick([`vi ${x.Rc(d.victim, 'o')} vivo ${x.inA(d.area)} uns ${d.ago}s antes`, `uns ${d.ago}s antes eu vi ${x.R(d.victim, 'o')} ${x.inA(d.area)}`, `${x.R(d.victim, 'o')} tava ${x.inA(d.area)} uns ${d.ago}s antes, eu vi`]),
    passedNoBody: (d, x) => pick([`passei ${x.inA(d.area)} uns ${d.ago}s antes e não tinha corpo`, `uns ${d.ago}s antes eu tava ${x.inA(d.area)} e não tinha nada lá`, `${x.inA(d.area)} tava vazio uns ${d.ago}s antes, eu passei lá`]),
    noOneNear: (d, x) => pick([`não vi ninguém perto ${x.deA(d.area)}`, `passei ${x.inA(d.area)} antes e não tinha ninguém`]),
    noOneNearBy: (d, x) => pick([`passei perto ${x.deA(d.area)} e não vi ninguém`, `passei do lado ${x.deA(d.area)}, não tinha ninguém por ali`]),
    notSureWith: (d, x) => pick([`comigo? não lembro de você lá, ${x.R(d.who)}`, `hmm, não reparei em você comigo`, `acho que ${x.R(d.who, 'o')} só passou por mim`, `não tenho certeza se tava comigo`]),
    accuse: (d, x) => {
      const w = x.R(d.who, 'o');
      switch (d.reason) {
        case 'kill': return pick([`EU VI ${w.toUpperCase()} MATAR`, `${w} matou, eu vi`, `vi ${w} matando ${d.victim != null ? x.R(d.victim, 'o') : ''}`.trim()]);
        case 'vent': return pick([`vi ${w} ventar ${d.area ? x.inA(d.area) : ''}`.trim(), `${w} saiu do vent ${d.area ? x.inA(d.area) : ''}`.trim(), `${w} é impostor, vi ventando`]);
        case 'shift': return pick([`${w} é metamorfo, vi ele se transformar`, `${w} mudou de aparência na minha frente`]);
        case 'vanish': return pick([`${w} ficou invisível do nada, é impostor`, `vi ${w} sumir no ar`]);
        case 'noscan': return pick([`${w} ficou parado no scanner e não escaneou`, `${w} fingiu o scan`]);
        case 'fakeTask': return pick([`vi ${w} terminar a tarefa ${d.area ? x.inA(d.area) : ''} e a barra não subiu`.replace(/\s+/g, ' '), `${w} fingiu tarefa, a barra não mexeu`, `${w} fez tarefa na minha frente e a barra ficou parada`]);
        case 'fastReport': return pick([
          `${w} reportou rápido demais, ${d.victim != null ? x.Rc(d.victim, 'o') + ' tava vivo' : 'a vítima tava viva'} uns ${d.ago || 10}s antes`,
          `self report? ${w} achou o corpo logo depois de ${d.victim != null ? x.R(d.victim, 'o') : 'ele'} ser visto`,
          `estranho ${w} achar o corpo tão rápido`,
        ]);
        case 'follow': return pick([`${w} estava me seguindo, muito suspeito`, `${w} ficou atrás de mim um tempão`]);
        case 'nearBody': return pick([`${x.Rc(d.who, 'o')} é suspeito, estava perto ${x.deA(d.area)}`, `acho que foi ${w}, estava lá perto`]);
        case 'lastWith': return pick([`foi ${x.Rc(d.who, 'o')}, estava sozinho ${d.victim != null ? x.R(d.victim, 'com') : 'com a vítima'}`, `${w} foi o último com ${d.victim != null ? x.R(d.victim, 'o') : 'ele'}`]);
        case 'lie': return pick([`${w} está mentindo`, `isso não bate, ${x.R(d.who)}`, `${w} mentiu, eu vi`]);
        case 'tracker': return pick([`rastreei ${w} e ele estava ${x.inA(d.area)} na hora`]);
        case 'vote': return pick([`vota ${x.R(d.who, 'no')}`, `bora votar ${x.R(d.who, 'no')}`]);
        case 'hunch': return pick([`${x.Rc(d.who, 'o')} está estranho`, `sei lá, acho que é ${w}`, `${x.Rc(d.who, 'o')} suspeito`, `meu instinto diz ${w}`]);
        default: return pick([`${x.Rc(d.who, 'o')} suspeito`, `acho que é ${w}`]);
      }
    },
    vouch: (d, x) => {
      const w = x.R(d.who, 'o');
      if (d.reason === 'visual') return pick([`${w} é safe, vi fazendo ${x.vis(d.task)}`, `vi ${w} fazendo ${x.vis(d.task)}, é inocente`, `confio ${x.R(d.who, 'no')}, vi a visual`]);
      if (d.reason === 'together') return pick([`${w} estava comigo`, `${w} estava comigo ${d.area ? x.inA(d.area) : ''}`.trim(), `pode tirar ${w}, estava comigo`]);
      return pick([`vi ${w} fazendo task ${d.area ? x.inA(d.area) : ''}`.trim(), `pra mim ${w} é inocente`]);
    },
    alsoVouch: (d, x) => pick([`também vi, ${x.R(d.who, 'o')} é safe`, `confirmo, vi ${x.R(d.who, 'o')} fazendo ${x.vis(d.task)} também`, `+1, eu também vi a visual ${x.R(d.who, 'de')}`, `verdade, vi também`]),
    confirm: (d, x) => pick([`confirmo, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `verdade, ${x.R(d.who, 'o')} estava ${x.inA(d.area)}`, `é, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`]),
    confirmWith: (d, x) => pick([`sim, ${x.R(d.who, 'o')} estava comigo`, `confirmo, estava comigo`, `verdade, estava comigo`]),
    denyWith: (d, x) => pick([`comigo? não`, `${x.R(d.who, 'o')} não estava comigo não`, `mentira, não estava comigo`]),
    fromBody: (d, x) => pick([`vi ${x.R(d.who, 'o')} vindo lá do lado ${x.deA(d.bodyArea)}`, `${x.R(d.who, 'o')} tava vindo da direção ${x.deA(d.bodyArea)}`, `quando eu passei ${x.inA(d.area)}, ${x.R(d.who, 'o')} vinha lá ${x.deA(d.bodyArea)}`]),
    atBody: (d, x) => pick([`pera, ${x.R(d.who)} disse que tava ${x.inA(d.area)}... foi lá o corpo`, `${x.R(d.who)}, você tava ${x.inA(d.area)}? e não viu o corpo?`, `${x.inA(d.area)} é onde tava o corpo, ${x.R(d.who)}`]),
    knewBody: (d, x) => pick([`como ${x.R(d.who, 'o')} sabe onde tava o corpo? ninguém falou ainda`, `ué ${x.R(d.who)}, ninguém disse onde era o corpo`, `${x.R(d.who, 'o')} sabia do corpo antes de falarem... sus`]),
    contradictStay: (d, x) => pick([`eu fiquei ${x.inA(d.area)} um tempão e não vi ${x.R(d.who, 'o')}`, `${x.R(d.who)}, eu estava ${x.inA(d.area)} e você não passou lá`]),
    contradictSeen: (d, x) => pick([`mas eu vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `${x.R(d.who)}, eu te vi ${x.inA(d.area)}, não ${x.inA(d.claimed)}`, `estranho, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`]),
    /* reação ao assunto de quem chamou a reunião (ou a uma acusação do jogador) */
    askCaller: (d, x) => pick([`fala, por que apertou?`, `o que houve?`, `${x.R(d.who)}, por que chamou?`, `e aí ${x.R(d.who)}, o que rolou?`, `chamou por quê?`]),
    topicWhat: (d, x) => pick([`como assim?`, `explica melhor`, `o que aconteceu?`, `viu alguma coisa?`, `e aí, o que foi que você viu?`]),
    topicAsk: (d, x) => {
      const w = x.R(d.who, 'o');
      const wh = d.area ? `${x.inA(d.area)}? quando foi isso?` : 'onde foi isso?';
      if (d.reason === 'shift') return pick([`em quem ${w} se transformou?`, `sério? ${wh}`, `você tem certeza que era ${w}?`, `virou quem? ${d.area ? '' : 'e onde?'}`.trim()]);
      if (d.reason === 'vanish') return pick([`sumiu onde?`, `sério? ${wh}`, `ficou invisível do nada? ${d.area ? '' : 'onde?'}`.trim()]);
      if (d.reason === 'kill') return pick([`${w} matou quem?`, `sério? ${wh}`, `e o corpo, ficou onde?`]);
      if (d.reason === 'vent') return pick([`qual duto?`, `sério? ${wh}`, `${w} entrou ou saiu do duto?`]);
      if (d.reason === 'follow') return pick([`seguindo onde?`, `por quanto tempo?`, `seguir não é prova... mas onde foi?`]);
      return pick([`por que ${w}?`, `o que ${w} fez?`, `viu o quê?`, `tem prova?`]);
    },
    topicBelieve: (d, x) => pick([`se você viu, eu voto ${x.R(d.who, 'no')}`, `acredito, bora ${x.R(d.who, 'no')}`, `então é ${x.R(d.who, 'o')}`, `faz sentido, ${x.R(d.who, 'o')} tava sumido`, `${x.R(d.who)}, explica isso aí`]),
    topicDoubt: (d, x) => pick([`só você viu? aí fica difícil`, `é a sua palavra contra a ${x.R(d.who, 'de')}`, `hmm, sem mais ninguém ter visto eu não sei`, `não sei não... e se for você querendo se livrar?`, `alguém mais viu isso?`]),
    topicAskAccused: (d, x) => pick([`${x.R(d.who)}, e aí? fala aí`, `${x.R(d.who)}, onde você tava?`, `${x.R(d.who)}, se defende`, `e aí ${x.R(d.who)}, o que tem a dizer?`]),
    topicSawAt: (d, x) => pick([`e o que ${x.R(d.who, 'o')} tava fazendo ${x.inA(d.area)}?`, `${x.R(d.who)}, é verdade? tava ${x.inA(d.area)}?`, `${x.inA(d.area)}? e depois?`]),
    crisis: (d, x) => pick([`gente, atenção: somos ${d.n} e ${d.imps > 1 ? 'tem ' + d.imps + ' impostores vivos' : 'ainda tem impostor vivo'}. se pular e matarem mais um, acabou`, `cuidado com o skip: mais uma morte e a gente perde`, `não dá pra errar agora, se pular e morrer mais um é vitória deles`]),
    summary: (d, x) => {
      const names = (d.cleared || []).map((id) => x.R(id, 'o'));
      const c = names.length > 1 ? names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1] : names[0] || '';
      const lim = c ? (names.length > 1 ? `${c} são inocentes` : `${c} é inocente`) : '';
      if (d.who == null) return pick([`resumindo: ${lim}. do resto ninguém tem prova, eu pulo`, `então: ${lim}. sem prova contra mais ninguém, skip`]);
      return pick([`resumindo: ${lim ? lim + '. ' : ''}quem pesa é ${x.R(d.who, 'o')} (${d.why}). voto ${x.R(d.who, 'no')}`, `então: ${lim ? lim + '; ' : ''}contra ${x.R(d.who, 'o')}: ${d.why}. eu vou ${x.R(d.who, 'no')}`]);
    },
    claimClash: (d, x) => pick([`${x.R(d.who, 'o')} disse que tava ${x.inA(d.claimed)}, mas ${d.by != null ? x.R(d.by, 'o') + ' viu ele' : 'viram ele'} ${x.inA(d.area)}`, `pera, ${x.R(d.who)} falou ${x.inA(d.claimed)}... e ${d.by != null ? x.R(d.by, 'o') : 'ele'} ${d.by != null ? 'viu' : 'foi visto'} ${x.inA(d.area)}? não bate`, `${x.R(d.who)}, você não disse que tava ${x.inA(d.claimed)}? como te viram ${x.inA(d.area)}?`]),
    sawAgo: (d, x) => pick([`vi ${x.R(d.who, 'o')} ${x.inA(d.area)}, mas faz uns ${d.ago}s`, `${x.R(d.who, 'o')} tava ${x.inA(d.area)} uns ${d.ago}s antes, depois não vi mais`]),
    shiftDoubt: (d, x) => pick([`vi alguém igual a você ${x.inA(d.area)}, ${x.R(d.who)}... ou você mente, ou era o metamorfo com a sua cara`, `${x.R(d.who)}, te vi ${x.inA(d.area)}, não ${x.inA(d.claimed)}. se não era você, era o metamorfo disfarçado`]),
    shiftTheory: (d, x) => pick([`se ${x.R(d.who, 'o')} tava com ${x.R(d.by, 'o')}, quem eu vi ${x.inA(d.area)} era o metamorfo disfarçado`, `então era o metamorfo com a cara ${x.R(d.who, 'de')}`, `hmm, o metamorfo tava disfarçado ${x.R(d.who, 'de')}, não era ${x.R(d.who)} de verdade`]),
    hidBodyRoom: (d, x) => pick([`mas eu te vi ${x.inA(d.area)}, ${x.R(d.who)}, bem onde tava o corpo`, `${x.R(d.who)}, você tava ${x.inA(d.area)} e não falou isso`, `estranho, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}, perto do corpo, e agora diz ${x.inA(d.claimed)}`]),
    notThere: (d, x) => pick([`eu nem passei ${x.inA(d.area)}`, `mentira, eu não estava ${x.inA(d.area)}`, `quê? eu estava ${x.inA(d.mine)}`]),
    wasThere: (d, x) => pick([`sim, eu estava ${x.inA(d.area)}`, `é, passei ${x.inA(d.area)}`]),
    deny: (d, x) => pick([`não fui eu`, d.area ? `o quê? eu estava ${x.inA(d.area)}` : `o quê?`, d.area ? `não, eu estava ${x.inA(d.area)}` : `não sou eu`, `não fui eu, juro`, `por que eu?`]),
    denyStrong: (d, x) => pick([d.area ? `mentira! eu estava ${x.inA(d.area)}` : `mentira!`, `${x.R(d.accuser)} está mentindo${d.area ? ', eu estava ' + x.inA(d.area) : ''}`, `quem acusa assim é impostor`]),
    counter: (d, x) => pick([`está me acusando por quê? você que é suspeito, ${x.R(d.who)}`, `${x.R(d.who, 'o')} está tentando se livrar`, `quem acusa sem prova é impostor, vota ${x.R(d.who, 'no')}`]),
    askProof: (d, x) => pick([`prova?`, `você viu?`, `quem viu?`, `tem prova disso?`, `calma, sem prova não dá pra votar`, d.who != null ? `por que ${x.R(d.who, 'o')}?` : `por quê?`]),
    askConfirm: (d, x) => pick([`alguém confirma ${x.R(d.who, 'o')}?`, `quem estava ${x.R(d.who, 'com')}?`, `alguém viu ${x.R(d.who, 'o')} lá?`]),
    quiet: (d, x) => pick([`${x.Rc(d.who, 'o')} está quieto hein`, `${x.R(d.who)}, fala alguma coisa`, `${x.R(d.who, 'o')} não falou nada`]),
    skip: () => pick([`sem info, skip`, `skip`, `vamos de skip`, `sem certeza, vou pular`, `sem prova, skip`]),
    agree: (d, x) => pick([`+1`, `concordo`, `vota ${x.R(d.who, 'no')}`, `bora ${x.R(d.who, 'o')}`, `faz sentido`, `eu também acho`]),
    alsoSaw: (d, x) => pick([`é verdade, eu também vi`, `confirmo, vi também`, `eu vi a mesma coisa`]),
    disagree: (d, x) => pick([`não acho que é ${x.R(d.who, 'o')}`, `${x.R(d.who, 'o')}? sei não`, `calma, ${x.R(d.who, 'o')} pode ser inocente`]),
    voteSay: (d, x) => (d.who == null ? pick([`skipei`, `votei skip`, `pulei`]) : pick([`votei ${x.R(d.who, 'no')}`, `meu voto é ${x.R(d.who, 'o')}`])),
    vitals: (d, x) => pick([`pelo vitals, ${x.R(d.victim, 'o')} morreu uns ${d.ago}s antes do report`, `sou cientista: ${x.R(d.victim, 'o')} morreu tipo ${d.ago}s antes`]),
    tracker: (d, x) => `rastreei ${x.R(d.who, 'o')}: ${d.areas.map((a) => x.nA(a)).join(' → ')}`,
    camsInfo: (d, x) => pick([`estava nas cams e vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `pelas câmeras vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`]),
    adminInfo: (d, x) => pick([`no admin tinha ${d.n} ${x.inA(d.area)}`, `olhei o admin: ${d.n} ${x.inA(d.area)}`]),
    offtopic: () => pick([
      `alguém sabe onde é o download?`, `gente como faz a do lixo`, `kkkkkkk`, `que medo`, `essa nave é gigante`,
      `alguém me espera na elétrica pfv`, `eu sempre morro primeiro`, `quem ainda tem task?`, `a barra de task está enchendo`,
    ]),
    panic: (d, x) => pick([`${x.R(d.who, 'o').toUpperCase()} ESTAVA ME SEGUINDO`, `gente, ${x.R(d.who, 'o')} ficou atrás de mim, fiquei com medo`]),
    lost: (d, x) => pick([`eu me perdi kkk`, `demorei achando ${x.nA(d.area)}`, `fiquei perdido ${x.inA(d.area)}`]),
    ghost: (d, x) => pick([`foi ${x.R(d.who, 'o')} que me matou`, `${x.R(d.who, 'o')} impostor, confia`, `morri pro ${x.R(d.who)} kkk`]),
    ghostIdle: () => pick([`rip`, `ah não`, `vai tripulação`, `agora é com vocês`, `nãaao`]),
    defendPartner: (d, x) => pick([`sei lá, ${x.R(d.who, 'o')} estava fazendo task`, `vocês estão votando sem prova`, `acho que não é ${x.R(d.who, 'o')}`]),
    whoSus: (d, x) => (d.who == null ? pick([`não sei, sem info`, `ninguém ainda`]) : pick([`acho que é ${x.R(d.who, 'o')}`, `${x.R(d.who, 'o')} pra mim`])),
    leaderVote: (d, x) => (d.who == null ? pick([`sem prova, todo mundo skip`, `ninguém tem certeza, skip`]) : pick([`vamos votar ${x.R(d.who, 'no')}, ninguém confirma ele`, `votem ${x.R(d.who, 'no')}`])),
    huh: () => pick([`?`, `quê?`, `hã?`, `não entendi`]),
    offerVisual: (d, x) => pick([`tenho ${d.task ? x.task(d.task) : 'tarefa visual'}, posso fazer na frente de vocês`, `me segue na próxima que eu faço ${d.task ? x.task(d.task) : 'a visual'}`, `quem desconfiar me acompanha, eu provo com ${d.task ? x.task(d.task) : 'a visual'}`]),
    willFollow: (d, x) => pick([`blz, vou te seguir então, ${x.R(d.who)}`, `fechou, eu vou junto com ${x.R(d.who, 'o')}`, `então eu te acompanho, ${x.R(d.who)}`]),
    sawVisualSafe: (d, x) => pick([`${x.R(d.who, 'o')} é inocente, segui e vi ${d.task ? x.task(d.task) : 'a visual'}`, `pode tirar ${x.R(d.who, 'o')}, fui junto e vi fazendo ${d.task ? x.task(d.task) : 'a visual'}`, `eu segui ${x.R(d.who, 'o')}, fez ${d.task ? x.task(d.task) : 'visual'} na minha frente, safe`]),
    roleNotInGame: (d) => pick([`não tem ${ROLE_TXT[d.role]} nessa partida`, `${ROLE_TXT[d.role]}? nem tem isso nesse jogo`, `não tem ${ROLE_TXT[d.role]} aqui, olha a config`]),
    roleMaybe: (d, x) => {
      if (d.role === 'metamorfo') return pick([`verdade, pode ter sido o metamorfo disfarçado`, d.who != null ? `se for metamorfo, quem a gente viu pode nem ser ${x.R(d.who, 'o')}` : `metamorfo muda de cara, "eu vi" não prova muito`, `tem metamorfo, então cuidado com "eu vi fulano"`]);
      if (d.role === 'fantasma') return pick([`fantasma fica invisível, pode ter passado sem ninguém ver`, `pode ser o fantasma, ele some`]);
      if (d.role === 'engenheiro') return pick([`engenheiro também usa duto, duto sozinho não prova`, `pode ser engenheiro, eles ventam`]);
      return pick([`pode ser`, `faz sentido`]);
    },
    roleClaim: (d) => {
      if (d.role === 'engenheiro') return pick([`sou engenheiro, por isso tava no duto`, `EU SOU ENGENHEIRO, posso usar duto`, `sou engenheiro gente`]);
      if (d.role === 'cientista') return pick([`sou cientista, vi pelos vitais`, `cientista aqui`]);
      if (d.role === 'rastreador') return pick([`sou rastreador`, `rastreador aqui, eu tava seguindo gente`]);
      return `sou ${ROLE_TXT[d.role]}`;
    },
    roleDoubt: (d, x) => pick([`${x.R(d.who, 'o')} disse que é ${ROLE_TXT[d.role]}... sei não`, `${ROLE_TXT[d.role]}? conveniente né`, `qualquer um pode dizer que é ${ROLE_TXT[d.role]}`]),
    ack: () => pick([`ok`, `hmm`, `faz sentido`, `entendi`]),
    thanks: () => pick([`valeu`, `obrigado`, `viu?`]),
  };

  /* Converte o texto base para o tom do chat e a personalidade.
     limpo  = o mais fácil de entender: português completo, nomes oficiais das salas, nada de sigla ou jargão.
     casual = como a maioria das pessoas digita num chat: minúsculas, vc/pq/tava/pra, kkk às vezes, skip e sus
              de vez em quando, salas com o nome comum (cafeteria, elétrica, depósito), SEM gíria pesada.
     raiz   = o mais caótico: apelidos das salas (café, elec, nav, med, storage, weapons, upper), siglas (n, q,
              cmg, dps, mt, ss), gírias (mano, tlgd, tá ligado, slk, pqp, mds), CAPS quando se exalta, frases cortadas. */
  const CASUAL = [
    [/\bvocês\b/g, 'vcs', 0.45], [/\bvocê\b/g, 'vc', 0.5], [/\btambém\b/g, 'tb', 0.3], [/\bporque\b/g, 'pq', 0.5],
    [/\bpor que\b/g, 'pq', 0.5], [/\bpor quê\b/g, 'pq', 0.5], [/\bestava\b/g, 'tava', 0.8], [/\bestou\b/g, 'tô', 0.6],
    [/\bestá\b/g, 'tá', 0.6], [/\bpara\b/g, 'pra', 0.85], [/\bmesmo\b/g, 'msm', 0.1], [/\bagora\b/g, 'agr', 0.1],
    [/\bbeleza\b/g, 'blz', 0.4], [/\bninguém\b/g, 'ngm', 0.15], [/\bobrigado\b/g, 'vlw', 0.4],
    [/\bimpostor\b/g, 'impostor', 1], [/\bimps\b/g, 'impostores', 1], [/\bimp\b/g, 'impostor', 1], [/\bsafe\b/g, 'inocente', 0.5],
  ];
  const RAIZ = [
    [/\bnão\b/g, 'n', 0.6], [/\bque\b/g, 'q', 0.6], [/\bquem\b/g, 'qm', 0.45], [/\btudo\b/g, 'td', 0.6], [/\bsuspeito\b/g, 'sus', 0.95],
    [/\binocente\b/g, 'safe', 0.75], [/\bimpostores\b/g, 'imps', 0.7], [/\bimpostor\b/g, 'imp', 0.7], [/\bpular\b/g, 'skipar', 0.7], [/\bpulei\b/g, 'skipei', 0.8],
    [/\bpula\b/g, 'skipa', 0.7], [/\bninguém\b/g, 'ngm', 0.85], [/\bagora\b/g, 'agr', 0.75], [/\bmesmo\b/g, 'msm', 0.7], [/\bpor favor\b/g, 'pfv', 0.9],
    [/\bvocê\b/g, 'vc', 1], [/\bvocês\b/g, 'vcs', 1], [/\btambém\b/g, 'tb', 0.85], [/\bcom\b/g, 'c', 0.25], [/\bbeleza\b/g, 'blz', 0.9],
    [/\bcomigo\b/g, 'cmg', 0.55], [/\bdepois\b/g, 'dps', 0.6], [/\bmuito\b/g, 'mt', 0.6], [/\bsim\b/g, 'ss', 0.5], [/\bporque\b/g, 'pq', 1],
    [/\bpor que\b/g, 'pq', 1], [/\bestava\b/g, 'tava', 1], [/\bestá\b/g, 'ta', 0.9], [/\btá\b/g, 'ta', 0.6], [/\btarefas\b/g, 'tasks', 0.8], [/\btarefa\b/g, 'task', 0.8],
    [/\bduto\b/g, 'vent', 0.75], [/\bsei lá\b/g, 'sla', 0.8], [/\bmeu deus\b/g, 'mds', 0.9], [/\bhoje\b/g, 'hj', 0.8], [/\bnada\b/g, 'nd', 0.3],
  ];
  /* limpo: frases fáceis de entender, sem siglas nem gírias */
  const CLEAN = [
    [/^é, /i, 'Sim, '], [/^((?:o|a) [a-zà-ú]+) suspeito$/i, '$1 está suspeito'], [/^((?:o|a) [a-zà-ú]+) suspeito([,.])/i, '$1 está suspeito$2'],
    [/\bsem self ?report\b/gi, 'nada de reportar o próprio abate'], [/^salve,? galera\b/gi, 'Olá, pessoal'], [/^salve\b/gi, 'Olá'], [/^eai\b/gi, 'Oi'], [/^opa\b/gi, 'Oi'],
    [/\bvotei skip\b/gi, 'votei para pular'], [/\bvamos de skip\b/gi, 'vamos pular'], [/,\s*skip\b/gi, ', vamos pular'], [/^skip$/gi, 'Vou pular'],
    [/\bsem info\b/gi, 'sem informação'], [/\binfo\b/gi, 'informação'], [/\bo scan\b/gi, 'o escaneamento'], [/\bscan\b/gi, 'escaneamento'], [/\bme segue\b/gi, 'me siga'],
    [/\bsus\b/gi, 'suspeito'], [/\bsafe\b/gi, 'inocente'], [/\bskipei\b/gi, 'pulei'], [/\bskipar\b/gi, 'pular'], [/\bskipa\b/gi, 'pula'], [/\bskip\b/gi, 'pular'],
    [/^self ?report\?/gi, 'Será que reportou o próprio abate?'], [/\bself ?report\b/gi, 'reportar o próprio abate'], [/\bventou\b/gi, 'usou o duto'], [/\bventando\b/gi, 'usando o duto'], [/\bventar\b/gi, 'usar o duto'],
    [/\bvent\b/gi, 'duto'], [/\bimps\b/gi, 'impostores'], [/\bimp\b/gi, 'impostor'], [/\bvcs\b/gi, 'vocês'], [/\bvc\b/gi, 'você'],
    [/\btbm\b/gi, 'também'], [/\btb\b/gi, 'também'], [/\bpq\b/gi, 'por que'], [/\bmsm\b/gi, 'mesmo'], [/\bagr\b/gi, 'agora'], [/\bngm\b/gi, 'ninguém'],
    [/\bblz\b/gi, 'certo'], [/\bvlw\b/gi, 'obrigado'], [/\bpfv\b/gi, 'por favor'], [/\bqm\b/gi, 'quem'], [/\btd\b/gi, 'tudo'], [/\bq\b/gi, 'que'],
    [/\bcmg\b/gi, 'comigo'], [/\bdps\b/gi, 'depois'], [/\bmt\b/gi, 'muito'], [/\bss\b/gi, 'sim'], [/\bmds\b/gi, 'meu Deus'],
    [/\bsla\b/gi, 'sei lá'], [/\btlgd\b/gi, ''], [/\bt[aá] ligado\b/gi, ''], [/\bslk\b/gi, ''], [/\bpqp\b,?/gi, ''], [/\bmano\b,?/gi, ''], [/\bpô\b,?/gi, ''], [/\boxe\b,?/gi, ''], [/\bvéi\b,?/gi, ''], [/\bué\b,?/gi, ''],
    [/\bkk+\b/gi, ''], [/\brs\b/gi, ''], [/\bcams\b/gi, 'câmeras'], [/\bstack kill\b/gi, 'abate no meio do grupo'], [/\bcrew\b/gi, 'tripulação'],
    [/\btavam\b/gi, 'estavam'], [/\btava\b/gi, 'estava'], [/\btá\b/gi, 'está'], [/\btô\b/gi, 'estou'], [/\bpros\b/gi, 'para os'], [/\bpras\b/gi, 'para as'],
    [/\bpro\b/gi, 'para o'], [/\bpra\b/gi, 'para'], [/\bfechou\b/gi, 'certo'], [/\bbora\b/gi, 'vamos'], [/\bpera\b/gi, 'espera'], [/\bné\b/gi, ''],
    [/\bagora pouco\b/gi, 'agora há pouco'], [/\b(\d+) ?s\b/g, '$1 segundos'], [/\btasks\b/gi, 'tarefas'], [/\btask\b/gi, 'tarefa'], [/\bcard\b/gi, 'cartão'],
    [/\bdo report\b/gi, 'de acharem o corpo'], [/\ba visual\b/gi, 'a tarefa visual'], [/\bpelo vitals\b/gi, 'pelos sinais vitais'], [/\bo vitals mostra\b/gi, 'os sinais vitais mostram'], [/\bno vitals\b/gi, 'nos sinais vitais'], [/\bvitals\b/gi, 'sinais vitais'], [/^\+1$/, 'concordo'],
  ];
  /* \b do JavaScript não entende acento ("está", "você", "tá"): troca por uma fronteira de palavra que entende */
  const UB = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
  const ub = (re) => new RegExp(re.source.replace(/\\b/g, UB), re.flags.includes('u') ? re.flags : re.flags + 'u');
  for (const list of [CASUAL, RAIZ, CLEAN]) for (const r of list) r[0] = ub(r[0]);
  function clean(t) {
    let s = unslang(String(t), true);
    for (const [re, rep] of CLEAN) s = s.replace(re, rep);
    return s.replace(/\s{2,}/g, ' ').replace(/\s+([,.?!])/g, '$1').replace(/^[\s,]+/, '').trim();
  }

  /* Troca o nome de uma sala mantendo a preposição certa ("no café" ↔ "na cafeteria", "na weapons" ↔ "em armas"). */
  const ROOM_SWAP = [
    // apelido, nome comum, gênero do apelido, gênero do nome comum
    ['caf[eé]', 'cafeteria', 'cafeteria', 'm', 'f', 'Cafeteria'], ['elec', 'el[eé]trica', 'elétrica', 'f', 'f', 'Elétrica'], ['nav', 'navega[cç][aã]o', 'navegação', 'f', 'f', 'Navegação'],
    ['med', 'medbay', 'medbay', 'f', 'f', 'MedBay'], ['sec', 'seguran[cç]a', 'segurança', 'f', 'f', 'Segurança'], ['storage', 'dep[oó]sito', 'depósito', 'm', 'm', 'Depósito'],
    ['weapons', 'armas', 'armas', 'f', 'n', 'Armas'], ['upper', 'motor de cima', 'motor de cima', 'm', 'm', 'Motor Superior'], ['lower', 'motor de baixo', 'motor de baixo', 'm', 'm', 'Motor Inferior'],
    ['shields', 'escudos', 'escudos', 'm', 'mp', 'Escudos'], ['comms', 'comunica[cç][oõ]es', 'comunicações', 'm', 'fp', 'Comunicações'], ['cams', 'c[aâ]meras', 'câmeras', 'fp', 'fp', 'câmeras'],
    /* nomes comuns sem apelido: no limpo viram o nome oficial */
    ['(?!x)x', 'refeit[oó]rio', 'refeitório', 'm', 'm', 'Cafeteria', 'f'], ['(?!x)x', 'enfermaria', 'enfermaria', 'f', 'f', 'MedBay'],
    ['(?!x)x', 'oxig[eê]nio', 'oxigênio', 'm', 'm', 'O2'], ['(?!x)x', 'motor superior', 'motor superior', 'm', 'm', 'Motor Superior'], ['(?!x)x', 'motor inferior', 'motor inferior', 'm', 'm', 'Motor Inferior'],
    ['(?!x)x', 'reator', 'reator', 'm', 'm', 'Reator'],
  ];
  const SLANG_WORD = { 'caf[eé]': 'café', elec: 'elec', nav: 'nav', med: 'med', sec: 'sec', storage: 'storage', weapons: 'weapons', upper: 'upper', lower: 'lower', shields: 'shields', comms: 'comms', cams: 'cams' };
  const PREP = { in: { m: 'no', f: 'na', mp: 'nos', fp: 'nas', n: 'em' }, of: { m: 'do', f: 'da', mp: 'dos', fp: 'das', n: 'de' }, to: { m: 'pro', f: 'pra', mp: 'pros', fp: 'pras', n: 'pra' }, art: { m: 'o', f: 'a', mp: 'os', fp: 'as', n: '' } };
  const PREP_KIND = {};
  for (const k of Object.keys(PREP)) for (const v of Object.values(PREP[k])) if (v && !PREP_KIND[v]) PREP_KIND[v] = k;
  /* no tom limpo, "pra" de sala vira "para a/para o" */
  const PREP_LIMPO = Object.assign({}, PREP, { to: { m: 'para o', f: 'para a', mp: 'para os', fp: 'para as', n: 'para' } });
  function swapRoom(s, fromRe, to, toCls, prob, table) {
    const re = new RegExp('(^|[^\\p{L}])(?:(no|na|nos|nas|em|do|da|dos|das|de|pro|pra|pros|pras|para|o|a|os|as) )?(' + fromRe + ')(?![\\p{L}])', 'giu');
    return s.replace(re, (m, lead, pre) => {
      if (prob != null && !U.chance(prob)) return m;
      if (!pre) return lead + to;
      const kind = pre.toLowerCase() === 'para' ? 'to' : PREP_KIND[pre.toLowerCase()];
      const np = (table || PREP)[kind][toCls];
      return lead + (np ? np + ' ' : '') + to;
    });
  }
  /* casual: nomes comuns em vez de apelido, e nada de gíria pesada */
  function unslang(t, official) {
    let s = String(t);
    for (const [slang, fullRe, full, , fullCls, off, offCls] of ROOM_SWAP) {
      s = swapRoom(s, slang, official ? off : full, official ? offCls || fullCls : fullCls, null, official ? PREP_LIMPO : null);
      /* limpo: também o nome comum vira o oficial, com a preposição certa ("para a Elétrica") */
      if (official) s = swapRoom(s, fullRe, off, offCls || fullCls, null, PREP_LIMPO);
    }
    s = s.replace(/(^|[^\p{L}])(tlgd|t[aá] ligado|slk|pqp|v[eé]i|mano|p[oô]|mds|oxe)(?![\p{L}]),?/giu, '$1');
    return s.replace(/\s{2,}/g, ' ').replace(/^[\s,]+/, '').trim();
  }
  /* raiz: apelido de jogador para as salas */
  function slangify(t, prob) {
    let s = String(t);
    for (const [slang, fullRe, , slangCls] of ROOM_SWAP) if (SLANG_WORD[slang]) s = swapRoom(s, fullRe, SLANG_WORD[slang], slangCls, prob);
    return s;
  }
  /* filtro final para texto que veio da IA (ou de frase fixa) conforme o tom */
  function toneFilter(t, tone) {
    if (tone === 'limpo') return U.cap(clean(t)).replace(/([.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase()) || t;
    if (tone === 'casual') return unslang(t) || t;
    return t;
  }

  function stripAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* interjeição no raiz: só quando combina com o momento (susto, bronca, negação, dúvida), não em qualquer frase */
  const RAIZ_PRE = {
    hot: ['mano ', 'pqp ', 'mds ', 'slk ', 'véi ', 'caraca '],
    deny: ['oxe ', 'ué ', 'slk ', 'mano ', 'q isso ', 'tá loco? '],
    ask: ['ué ', 'pera ', 'mano ', 'oxe '],
  };
  const KIND_MOOD = {
    accuse: 'hot', panic: 'hot', knewBody: 'hot', claimClash: 'hot', contradictSeen: 'hot', hidBodyRoom: 'hot', atBody: 'hot', callReason: 'hot', reportInfo: 'hot', crisis: 'hot',
    deny: 'deny', denyStrong: 'deny', notThere: 'deny', counter: 'deny', denyWith: 'deny',
    topicAsk: 'ask', askProof: 'ask', topicDoubt: 'ask', huh: 'ask', askWhere: 'ask', askCaller: 'ask', topicWhat: 'ask', askConfirm: 'ask',
  };
  const RAIZ_LAUGH = new Set(['offtopic', 'deny', 'huh', 'agree', 'askProof', 'lost', 'ghost', 'topicDoubt', 'counter', 'callReason']);

  function style(text, g, brain, opts) {
    opts = opts || {};
    const tone = g.S.bots.chatTone;
    const pers = brain ? brain.pers : {};
    let s = String(text).trim();
    if (tone === 'limpo') {
      s = clean(s) || 'ok';
      s = U.cap(s).replace(/([.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
      if (!/[?!.]$/.test(s) && U.chance(0.5)) s += '.';
      return s;
    }
    const lowerKeep = /[A-Z]{4,}/.test(s) && U.chance(0.7);
    if (!lowerKeep) s = s.toLowerCase();
    if (tone === 'raiz') {
      s = slangify(s, 0.85);
      for (const [re, rep, pr] of CASUAL) if (!/impostor|safe/.test(rep)) s = s.replace(re, (m) => (U.chance(Math.min(1, pr + 0.3)) ? rep : m));
      for (const [re, rep, pr] of RAIZ) s = s.replace(re, (m) => (U.chance(pr) ? rep : m));
      const mood = KIND_MOOD[opts.kind];
      if (mood && U.chance(mood === 'hot' ? 0.45 : 0.35)) s = pick(RAIZ_PRE[mood]) + s;
      const words = s.split(/\s+/).length, greet = /^(oi|eai|e ai|salve|opa|fala|ol[aá]|boa (noite|tarde|dia))\b/.test(s);
      if (!mood && !greet && words >= 4 && opts.kind !== 'claimLoc' && U.chance(0.1)) s = pick(['tipo ', 'mano ']) + s;
      else if (!/\?$/.test(s) && !mood && !greet && words >= 4 && U.chance(0.14)) s += pick([' tlgd', ', tá ligado', ' tlgd']);
      if (RAIZ_LAUGH.has(opts.kind) && !/k{3,}/i.test(s) && U.chance(0.3)) s += ' ' + pick(['kkkk', 'kkkkkk', 'KKKKK']);
      if (opts.strong && U.chance(0.4)) s = s.toUpperCase();
      if (U.chance(0.55)) s = stripAccents(s);
      s = s.replace(/[.,]$/, '');
    } else {
      s = unslang(s);
      for (const [re, rep, pr] of CASUAL) s = s.replace(re, (m) => (U.chance(pr) ? rep : m));
      s = s.replace(/\bnão\b/g, (m) => (U.chance(0.2) ? 'nao' : m));
      if (U.chance(0.25)) s = stripAccents(s);
      s = s.replace(/[.]$/, '');
    }
    if ((pers.chaos || pers.offtopic) && U.chance(tone === 'raiz' ? 0.25 : 0.15) && !/k{3,}/i.test(s)) s += ' ' + pick(['kkk', 'kkkkk', 'KKKK']);
    if (pers.caps && opts.strong && U.chance(0.6)) s = s.toUpperCase() + '!!';
    if (opts.question && !/\?$/.test(s)) s += '?';
    if (pers.offtopic && U.chance(0.2)) s = s.replace(/\?$/, '??');
    return s.replace(/\s{2,}/g, ' ').trim();
  }

  function line(kind, d, g, brain, opts) {
    const f = P[kind];
    if (!f) return '';
    const base = f(d || {}, helpers(g, brain));
    return style(base, g, brain, Object.assign({ kind }, opts || {}));
  }

  /* ---------- leitura das mensagens do jogador ---------- */
  function aliasTable(g) {
    const list = [];
    for (const p of g.players) {
      const col = C.COLOR[p.color];
      col.alias.forEach((a) => list.push({ a: U.norm(a), pid: p.id }));
      const nm = U.norm(p.name).replace(/[^a-z0-9 ]/g, '').trim();
      if (nm.length >= 2) list.push({ a: nm, pid: p.id });
    }
    list.sort((x, y) => y.a.length - x.a.length);
    return list;
  }
  const ROOM_ALIASES = [];
  M.ROOMS.forEach((r) => r.aliases.forEach((a) => ROOM_ALIASES.push({ a: U.norm(a), area: r.id })));
  ROOM_ALIASES.sort((x, y) => y.a.length - x.a.length);

  const COMMON = new Set(['tava', 'onde', 'quem', 'votei', 'voto', 'vota', 'eles', 'elas', 'acho', 'sabe', 'nada', 'mesmo', 'cade', 'agora', 'depois', 'antes', 'perto', 'junto', 'certo', 'entao', 'porque', 'quando', 'estava', 'fazendo', 'tarefa', 'corpo', 'morto', 'matou', 'vent', 'duto', 'skip', 'pula', 'pulei', 'tambem', 'aqui', 'isso', 'esse', 'essa', 'foram', 'vamos', 'bora', 'verdade', 'mentira', 'sozinho', 'prova', 'scan']);
  /* distância de edição no máximo 1 (troca, falta, sobra ou inversão de uma letra) */
  function lev1(a, b) {
    if (a === b) return true;
    const la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    let i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
  }

  function findAll(n, table, key) {
    const used = new Array(n.length).fill(false);
    const found = [];
    for (const it of table) {
      const re = new RegExp('(^|[^a-z0-9])(' + it.a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^a-z0-9])', 'g');
      let m;
      while ((m = re.exec(n))) {
        const start = m.index + m[1].length, end = start + m[2].length;
        let free = true;
        for (let i = start; i < end; i++) if (used[i]) free = false;
        if (!free) continue;
        for (let i = start; i < end; i++) used[i] = true;
        found.push({ [key]: it[key], i: start });
      }
    }
    if (key === 'pid' || key === 'area') {
      /* tolera um erro de digitação em nomes e cores (4+ letras) e em salas (5+ letras: "eletrca", "reatro") */
      const min = key === 'area' ? 5 : 4;
      const re = /[a-z0-9]+/g;
      let m;
      while ((m = re.exec(n))) {
        const w = m[0];
        if (w.length < min || COMMON.has(w) || used[m.index]) continue;
        const hit = table.find((it) => it.a.length >= min && !it.a.includes(' ') && it.a[0] === w[0] && lev1(w, it.a));
        if (hit) {
          for (let i = m.index; i < m.index + w.length; i++) used[i] = true;
          found.push({ [key]: hit[key], i: m.index });
        }
      }
    }
    found.sort((a, b) => a.i - b.i);
    return found;
  }

  const ROLE_TXT = { metamorfo: 'metamorfo', fantasma: 'fantasma', engenheiro: 'engenheiro', cientista: 'cientista', rastreador: 'rastreador', anjo: 'anjo da guarda', barulhento: 'barulhento' };
  const ROLE_WORDS = {
    metamorfo: 'metamorf\\w*|shape ?shift\\w*|shifter|disfarc\\w*|transformou|mudou de (?:cor|forma|aparencia|cara)',
    fantasma: 'fantasma|phantom|invisivel|sumiu do nada',
    engenheiro: 'engenheir\\w*|engineer',
    cientista: 'cientista|scientist|vitais|vitals',
    rastreador: 'rastreador\\w*|tracker',
    anjo: 'anjo|guardian|angel',
    barulhento: 'barulhent\\w*|noisemaker',
  };
  const ROLE_RX = {};
  const ROLE_CLAIM = {};
  for (const r of Object.keys(ROLE_WORDS)) {
    ROLE_RX[r] = new RegExp('\\b(' + ROLE_WORDS[r] + ')\\b');
    ROLE_CLAIM[r] = new RegExp('\\b(sou|eu sou|eu eh|eu e|to de|tou de)\\s+(o |a |um |uma )?(' + ROLE_WORDS[r] + ')\\b');
  }
  const RX = {
    vi: /\b(vi|vio|avistei|enxerguei|flagrei|peguei|olhei)\b/,
    kill: /\b(matou|matando|matar|mata|kill\w*|assassin\w*|esfaque\w*)\b/,
    vent: /\b(vent\w*|duto|dutos|bueiro)\b/,
    sus: /\b(sus|suspeit\w*|impostor\w*|impo|imp|culpad\w*|estranh\w*)\b|\bfoi (o|a|ele|ela)\b/,
    vote: /\b(vot\w*|eject\w*|expuls\w*|tira)\b/,
    safe: /\b(safe|limp[oa]|inocente|confi\w*|crew|tripulante)\b|\bnao (e|eh) (ele|ela)\b/,
    visual: /\b(scan\w*|escane\w*|visual|asteroide\w*|escudo\w*|lixo)\b/,
    comigo: /\b(comigo|junto|juntos)\b/,
    been: /\b(tava|estava|estive|fiquei|fui|to|estou|passei|vim|vinha|fazendo|fiz|indo)\b/,
    deny: /\b(nao fui eu|n fui eu|nao foi eu|n foi eu|nao sou eu|sou inocente|to limpo|tou limpo|sou crew|nao matei|n matei|nao sou impostor|nao sou imp|nao fui)\b/,
    lie: /\b(mentir\w*|mentindo|mentiroso|mentirosa|fake|falso|falsa)\b/,
    skip: /\b(skip\w*|pul(a|ar|o|ei|em)|ninguem|ngm)\b/,
    where: /\b(onde|cade|aonde)\b/,
    who: /\b(quem|qm)\b/,
    body: /\b(corpo|morto|morta|morreu|body)\b/,
    self: /\b(eu|mim|me)\b/,
    you: /\b(vc|voce|tu|vcs)\b/,
    comX: /\bcom (o |a )?$/,
    /* testemunha de habilidade: "a rosa se transformou na minha frente", "vi o verde sumir do nada" */
    shift: /\b(se transformou|se transformando|se transformar|transformou|transformar|virou (o|a|outr\w*)|(mudou|mudar|mudando) de (cor|forma|aparencia|cara|skin|roupa)|shapeshift\w*|shiftou|metamorfou)\b/,
    vanish: /\b(sumiu|sumir|desapareceu|desaparecer|ficou invisivel|invisivel|sumindo|desaparecendo)\b/,
    /* "sumiu" também é "não vi mais": só vale como habilidade se foi na frente de alguém / do nada / invisível */
    vanishSeen: /\b(invisivel|do nada|na minha frente|na frente|do meu lado)\b|\bvi\b.*\b(sumir|desaparecer|sumindo|desaparecendo)\b/,
    follow: /\b(seguindo|me seguiu|me segue|seguiu|atras de mim|na minha cola|colad[oa] em mim)\b/,
    selfrep: /\b(self ?report\w*|reportou (muito )?rapido|achou (o corpo )?(muito )?rapido)\b/,
    hypo: /\b(pode|podia|talvez|sera|acho|deve|devia|se for|caso|quem sabe|pode ter)\b/,
    offer: /\b(me segue|me sigam|me segue[m]?|me acompanh\w*|posso provar|vou provar|provo|fac\w* (o |a )?(scan|visual|escaneamento|asteroide\w*|escudo\w*|lixo) na frente|na frente de voces|mostro (a )?visual)\b/,
  };

  function parse(text, g, ctx) {
    ctx = ctx || {};
    const me = ctx.self != null ? ctx.self : g.human ? g.human.id : -1;
    /* "é" (verbo) vira "eh" antes de tirar acentos, para não virar a conjunção "e" */
    const pre = String(text).replace(/(^|[^\p{L}])[éÉ](?=$|[^\p{L}])/gu, '$1 eh ');
    const n = ' ' + U.norm(pre).replace(/[^a-z0-9?!\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    const isQ = /\?/.test(text);
    const table = aliasTable(g);
    const intents = [];
    /* "e" só separa orações quando começa uma nova (e eu..., e vi..., e depois...) */
    const clauses = n
      .replace(/ e (?=(eu|o|a|os|as|ele|ela|depois|vi|tava|estava|fui|fiquei|passei|ai|dai|ninguem|ngm|quem|onde)\b)/g, ' | ')
      .split(/ \| | mas | depois | dai | ai | entao | porem |[,.;!?]/)
      .map((c) => ' ' + c.trim() + ' ')
      .filter((c) => c.trim());
    const all = { players: findAll(n, table, 'pid'), rooms: findAll(n, ROOM_ALIASES, 'area') };

    if (RX.deny.test(n)) intents.push({ type: 'deny' });
    if (RX.offer.test(n)) intents.push({ type: 'offerVisual' });
    if (RX.where.test(n) && RX.body.test(n)) intents.push({ type: 'askBody' });
    /* "passei na elétrica uns 20s antes e não tinha corpo": dá a janela do abate para os outros */
    if (all.rooms.length && /\b(passei|tava|estava|fui|olhei)\b/.test(n) && /\b(nao tinha|vazi[oa]|ninguem|nada)\b/.test(n)) {
      const wm = n.match(/\b(\d{1,3}) ?(s|seg|segundos)\b/);
      intents.push({ type: 'window', area: all.rooms[0].area, ago: wm ? +wm[1] : 30 });
    }

    let lastOthers = [];
    for (const c of clauses) {
      const ps = findAll(c, table, 'pid');
      const rooms = findAll(c, ROOM_ALIASES, 'area').map((r) => r.area);
      let others = ps.filter((x) => x.pid !== me).map((x) => x.pid);
      const selfNamed = ps.some((x) => x.pid === me);
      const has = (k) => RX[k].test(c);
      if (!others.length && RX.you.test(c) && ctx.addressed != null) others = [ctx.addressed];
      /* "..., sus" / "..., vota nele": herda o jogador da oração anterior */
      if (!others.length && lastOthers.length && (has('sus') || has('vote') || has('safe') || has('lie') || has('kill') || has('vent')) && !rooms.length) others = lastOthers;
      if (others.length) lastOthers = others;
      const area = rooms[0] || null;

      if (has('where') && !has('body')) {
        if (others.length) intents.push({ type: 'askWhere', who: others[0] });
        continue;
      }
      if (has('body') && rooms.length && !has('where') && !others.length) {
        intents.push({ type: 'bodyArea', area });
        continue;
      }
      /* "eu tava no admin com o verde" */
      if (others.length && has('been') && rooms.length && /\bcom\b/.test(c) && !has('vi')) {
        intents.push({ type: 'claimLoc', rooms, with: others });
        others.forEach((pid) => intents.push({ type: 'vouch', who: pid, reason: 'together', area }));
        continue;
      }
      if (others.length) {
        const who = others[0];
        if (has('kill')) intents.push({ type: 'accuse', who, reason: 'kill', area, strong: true });
        else if (has('vent')) intents.push({ type: 'accuse', who, reason: 'vent', area, strong: true });
        else if (has('shift') && !has('hypo')) intents.push({ type: 'accuse', who, reason: 'shift', area, strong: true });
        else if (has('vanish') && has('vanishSeen') && !has('hypo')) intents.push({ type: 'accuse', who, reason: 'vanish', area, strong: true });
        else if (has('lie')) intents.push({ type: 'accuse', who, reason: 'lie' });
        else if (has('safe') || (has('visual') && !has('sus'))) intents.push({ type: 'vouch', who, reason: has('visual') ? 'visual' : 'claim' });
        else if (has('comigo')) intents.push({ type: 'vouch', who, reason: 'together', area });
        else if (has('sus') || has('vote')) others.forEach((pid) => intents.push({ type: 'accuse', who: pid, reason: has('vote') ? 'vote' : 'sus' }));
        else if (has('follow') && !has('offer')) intents.push({ type: 'accuse', who, reason: 'follow', area });
        else if (has('selfrep')) intents.push({ type: 'accuse', who, reason: 'fastReport' });
        else if (has('body')) intents.push({ type: 'accuse', who, reason: 'nearBody', area });
        else if (rooms.length && (has('vi') || has('been'))) intents.push({ type: 'sawAt', who, area });
        else if (isQ && c.trim().split(' ').length <= 3) intents.push({ type: 'askWhere', who });
        else intents.push({ type: 'mention', who });
        continue;
      }
      if (has('visual') && selfNamed) {
        intents.push({ type: 'deny' });
        continue;
      }
      if (rooms.length) {
        if (ctx.humanReported && !ctx.bodyKnown && !intents.some((i) => i.type === 'bodyArea')) {
          intents.push({ type: 'bodyArea', area });
          continue;
        }
        intents.push({ type: 'claimLoc', rooms, with: [] });
        continue;
      }
      if (has('skip')) {
        intents.push({ type: 'skip' });
        continue;
      }
      if (has('lie') && ctx.addressed != null && !all.players.some((x) => x.pid !== me)) {
        intents.push({ type: 'accuse', who: ctx.addressed, reason: 'lie' });
        continue;
      }
      if (has('who') && isQ) {
        intents.push({ type: 'askWho' });
        continue;
      }
      if (selfNamed && has('safe')) intents.push({ type: 'deny' });
    }
    /* funções especiais: "pode ser metamorfo", "sou engenheiro" */
    const witnessed = (reason) => intents.some((i) => i.type === 'accuse' && i.reason === reason);
    for (const r of Object.keys(ROLE_RX)) {
      if (!ROLE_RX[r].test(n)) continue;
      /* quem viu a habilidade está acusando, não levantando hipótese */
      if ((r === 'metamorfo' && witnessed('shift')) || (r === 'fantasma' && witnessed('vanish'))) continue;
      if (ROLE_CLAIM[r].test(n)) intents.push({ type: 'roleClaim', role: r });
      else {
        const o = all.players.find((x) => x.pid !== me);
        intents.push({ type: 'roleTheory', role: r, who: o ? o.pid : null });
      }
    }
    if (!intents.length && all.players.length === 0 && all.rooms.length === 0 && /\?/.test(text)) intents.push({ type: 'askWho' });
    /* agrupa "mention" quando a mesma pessoa já recebeu uma intenção mais clara */
    const firm = new Set(intents.filter((i) => i.type !== 'mention' && i.who != null).map((i) => i.who));
    const seen = new Set();
    return intents.filter((it) => {
      if (it.type === 'mention' && firm.has(it.who)) return false;
      const k = it.type + ':' + (it.who != null ? it.who : '') + ':' + (it.area || '') + ':' + (it.rooms ? it.rooms.join(',') : '');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  AU.Talk = { P, line, style, clean, unslang, slangify, toneFilter, parse, helpers, TASK_CHAT, ROLE_TXT };
})();

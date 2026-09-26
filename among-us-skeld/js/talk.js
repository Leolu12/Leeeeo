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
    x.inA = (a) => {
      const al = M.chatAlias(a);
      return al[1] + ' ' + al[0];
    };
    x.deA = (a) => {
      const al = M.chatAlias(a);
      return al[2] + ' ' + al[0];
    };
    x.nA = (a) => M.chatAlias(a)[0];
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

  const P = {
    reportInfo: (d, x) => pick([
      `corpo ${x.inA(d.area)}`,
      `achei ${x.R(d.victim, 'o')} morto ${x.inA(d.area)}`,
      `${x.R(d.victim, 'o')} está morto ${x.inA(d.area)}`,
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
        case 'chaos': return pick([`foi mal, apertei sem querer kkk`, `só queria ver quem está vivo`, `reunião surpresa kkkk`, `alguém tem info?`]);
        default: return pick([`alguém tem info?`, `chamei pra gente conversar`]);
      }
    },
    organize: () => pick([`todo mundo fala onde estava`, `bora, cada um fala onde estava e com quem`, `calma gente, um de cada vez: onde vocês estavam?`, `vamos organizar: sala e com quem estava`]),
    askWhere: (d, x) => pick([`e você, ${x.R(d.who)}?`, `${x.R(d.who)}, onde você estava?`, `${x.R(d.who)} estava onde?`, `e ${x.R(d.who, 'o')}? não falou nada ainda`]),
    askBody: () => pick([`onde foi o corpo?`, `onde?`, `cadê o corpo?`, `onde estava o corpo??`, `quem morreu e onde?`]),
    answerBody: (d, x) => pick([`${x.inA(d.area)}`, `foi ${x.inA(d.area)}`, `o corpo estava ${x.inA(d.area)}`]),
    claimLoc: (d, x) => {
      const rs = d.rooms;
      const w = d.with != null ? ' ' + x.R(d.with, 'com') : '';
      const tk = d.task ? ' fazendo ' + x.task(d.task) : '';
      if (rs.length >= 3) {
        const [a, b, c] = rs.slice(-3);
        return pick([`passei ${x.inA(a)}, ${x.inA(b)} e agora ${x.inA(c)}${tk}${w}`, `fui ${x.deA(a)} pra ${x.nA(b)} e depois ${x.inA(c)}${tk}`]);
      }
      if (rs.length === 2) {
        const a = rs[0], b = rs[1];
        if (d.times && d.leftAgo) return `estava ${x.inA(a)} até uns ${d.leftAgo}s antes, depois fui ${x.inA(b)}${tk}${w}`;
        return pick([`estava ${x.inA(a)}, depois ${x.inA(b)}${tk}${w}`, `fui ${x.deA(a)} pra ${x.nA(b)}${tk}`, `eu estava ${x.inA(b)}${tk}${w}, antes ${x.inA(a)}`]);
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
    ])) + (d.ago != null && d.times ? ` ${x.ago(d.ago)} do report` : ''),
    lastWithVictim: (d, x) => pick([
      `${x.R(d.who, 'o')} estava sozinho ${x.R(d.victim, 'com')} ${x.inA(d.area)}`,
      `a última vez que vi ${x.R(d.victim, 'o')} ele estava ${x.R(d.who, 'com')}`,
      `${x.R(d.victim, 'o')} estava ${x.inA(d.area)} ${x.R(d.who, 'com')}`,
    ]),
    withVictim: (d, x) => pick([
      `${x.R(d.who, 'o')} estava seguindo ${x.R(d.victim, 'o')} ${x.inA(d.area)}`,
      `vi ${x.R(d.who, 'o')} andando colado ${x.R(d.victim, 'com')} ${x.inA(d.area)}`,
      `${x.R(d.who, 'o')} e ${x.R(d.victim, 'o')} estavam juntos ${x.inA(d.area)} pouco antes`,
    ]),
    noOneNear: (d, x) => pick([`não vi ninguém perto ${x.deA(d.area)}`, `passei ${x.inA(d.area)} antes e não tinha ninguém`]),
    accuse: (d, x) => {
      const w = x.R(d.who, 'o');
      switch (d.reason) {
        case 'kill': return pick([`EU VI ${w.toUpperCase()} MATAR`, `${w} matou, eu vi`, `vi ${w} matando ${d.victim != null ? x.R(d.victim, 'o') : ''}`.trim()]);
        case 'vent': return pick([`vi ${w} ventar ${d.area ? x.inA(d.area) : ''}`.trim(), `${w} saiu do vent ${d.area ? x.inA(d.area) : ''}`.trim(), `${w} é impostor, vi ventando`]);
        case 'shift': return pick([`${w} é metamorfo, vi ele se transformar`, `${w} mudou de aparência na minha frente`]);
        case 'vanish': return pick([`${w} ficou invisível do nada, é impostor`, `vi ${w} sumir no ar`]);
        case 'noscan': return pick([`${w} ficou parado no scanner e não escaneou`, `${w} fingiu o scan`]);
        case 'follow': return pick([`${w} estava me seguindo, muito suspeito`, `${w} ficou atrás de mim um tempão`]);
        case 'nearBody': return pick([`${w} é suspeito, estava perto ${x.deA(d.area)}`, `acho que foi ${w}, estava lá perto`]);
        case 'lastWith': return pick([`foi ${w}, estava sozinho ${d.victim != null ? x.R(d.victim, 'com') : 'com a vítima'}`, `${w} foi o último com ${d.victim != null ? x.R(d.victim, 'o') : 'ele'}`]);
        case 'lie': return pick([`${w} está mentindo`, `isso não bate, ${x.R(d.who)}`, `${w} mentiu, eu vi`]);
        case 'tracker': return pick([`rastreei ${w} e ele estava ${x.inA(d.area)} na hora`]);
        case 'vote': return pick([`vota ${x.R(d.who, 'no')}`, `bora votar ${x.R(d.who, 'no')}`]);
        case 'hunch': return pick([`${w} está estranho`, `sei lá, acho que é ${w}`, `${w} suspeito`, `meu instinto diz ${w}`]);
        default: return pick([`${w} suspeito`, `acho que é ${w}`]);
      }
    },
    vouch: (d, x) => {
      const w = x.R(d.who, 'o');
      if (d.reason === 'visual') return pick([`${w} é safe, vi fazendo ${x.vis(d.task)}`, `${w} limpo, fez ${x.vis(d.task)}`, `confio ${x.R(d.who, 'no')}, vi a visual`]);
      if (d.reason === 'together') return pick([`${w} estava comigo`, `${w} estava comigo ${d.area ? x.inA(d.area) : ''}`.trim(), `pode tirar ${w}, estava comigo`]);
      return pick([`vi ${w} fazendo task ${d.area ? x.inA(d.area) : ''}`.trim(), `${w} está limpo pra mim`]);
    },
    confirm: (d, x) => pick([`confirmo, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `verdade, ${x.R(d.who, 'o')} estava ${x.inA(d.area)}`, `é, vi ele ${x.inA(d.area)}`]),
    confirmWith: (d, x) => pick([`sim, ${x.R(d.who, 'o')} estava comigo`, `confirmo, estava comigo`, `verdade, estava comigo`]),
    denyWith: (d, x) => pick([`comigo? não`, `${x.R(d.who, 'o')} não estava comigo não`, `mentira, não estava comigo`]),
    contradictStay: (d, x) => pick([`eu fiquei ${x.inA(d.area)} um tempão e não vi ${x.R(d.who, 'o')}`, `${x.R(d.who)}, eu estava ${x.inA(d.area)} e você não passou lá`]),
    contradictSeen: (d, x) => pick([`mas eu vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`, `${x.R(d.who)}, eu te vi ${x.inA(d.area)}, não ${x.inA(d.claimed)}`, `estranho, vi ${x.R(d.who, 'o')} ${x.inA(d.area)}`]),
    notThere: (d, x) => pick([`eu nem passei ${x.inA(d.area)}`, `mentira, eu não estava ${x.inA(d.area)}`, `quê? eu estava ${x.inA(d.mine)}`]),
    wasThere: (d, x) => pick([`sim, eu estava ${x.inA(d.area)}`, `é, passei ${x.inA(d.area)}`]),
    deny: (d, x) => pick([`não fui eu`, d.area ? `o quê? eu estava ${x.inA(d.area)}` : `o quê?`, d.area ? `não, eu estava ${x.inA(d.area)}` : `não sou eu`, `não fui eu, juro`, `por que eu?`]),
    denyStrong: (d, x) => pick([d.area ? `mentira! eu estava ${x.inA(d.area)}` : `mentira!`, `${x.R(d.accuser)} está mentindo${d.area ? ', eu estava ' + x.inA(d.area) : ''}`, `quem acusa assim é impostor`]),
    counter: (d, x) => pick([`está me acusando por quê? você que é suspeito, ${x.R(d.who)}`, `${x.R(d.who, 'o')} está tentando se livrar`, `quem acusa sem prova é impostor, vota ${x.R(d.who, 'no')}`]),
    askProof: (d, x) => pick([`prova?`, `você viu?`, `quem viu?`, `tem prova disso?`, `calma, sem prova não dá pra votar`, d.who != null ? `por que ${x.R(d.who, 'o')}?` : `por quê?`]),
    askConfirm: (d, x) => pick([`alguém confirma ${x.R(d.who, 'o')}?`, `quem estava ${x.R(d.who, 'com')}?`, `alguém viu ${x.R(d.who, 'o')} lá?`]),
    quiet: (d, x) => pick([`${x.R(d.who, 'o')} está quieto hein`, `${x.R(d.who)}, fala alguma coisa`, `${x.R(d.who, 'o')} não falou nada`]),
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
    ack: () => pick([`ok`, `hmm`, `faz sentido`, `entendi`]),
    thanks: () => pick([`valeu`, `obrigado`, `viu?`]),
  };

  /* Converte o texto base para o tom do chat e a personalidade. */
  const CASUAL = [
    [/\bvocês\b/g, 'vcs', 0.8], [/\bvocê\b/g, 'vc', 0.85], [/\btambém\b/g, 'tbm', 0.8], [/\bporque\b/g, 'pq', 0.85],
    [/\bpor que\b/g, 'pq', 0.8], [/\bpor quê\b/g, 'pq', 0.8], [/\bestava\b/g, 'tava', 0.9], [/\bestou\b/g, 'to', 0.8],
    [/\bestá\b/g, 'tá', 0.7], [/\bpara\b/g, 'pra', 0.9], [/\bmesmo\b/g, 'msm', 0.3], [/\bagora\b/g, 'agr', 0.3],
    [/\bbeleza\b/g, 'blz', 0.8], [/\bninguém\b/g, 'ngm', 0.4], [/\bquê\?/g, 'q?', 0.5], [/\bobrigado\b/g, 'vlw', 0.7],
  ];
  const RAIZ = [[/\bnão\b/g, 'n', 0.55], [/\bque\b/g, 'q', 0.45], [/\bquem\b/g, 'qm', 0.2], [/\btudo\b/g, 'td', 0.4], [/\bsuspeito\b/g, 'sus', 0.8]];

  function stripAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function style(text, g, brain, opts) {
    opts = opts || {};
    const tone = g.S.bots.chatTone;
    const pers = brain ? brain.pers : {};
    let s = String(text).trim();
    if (tone === 'limpo') {
      s = s.replace(/k{3,}/g, '').trim() || 'ok';
      s = U.cap(s);
      if (!/[?!.]$/.test(s) && U.chance(0.5)) s += '.';
      return s;
    }
    const lowerKeep = /[A-Z]{4,}/.test(s) && U.chance(0.7);
    if (!lowerKeep) s = s.toLowerCase();
    for (const [re, rep, pr] of CASUAL) s = s.replace(re, (m) => (U.chance(pr) ? rep : m));
    s = s.replace(/\bnão\b/g, (m) => (U.chance(0.25) ? 'nao' : m));
    if (tone === 'raiz') {
      for (const [re, rep, pr] of RAIZ) s = s.replace(re, (m) => (U.chance(pr) ? rep : m));
      if (U.chance(0.15)) s = pick(['mano ', 'pô ', 'slk ', 'véi ', 'pqp ']) + s;
      if (U.chance(0.35)) s = stripAccents(s);
    } else if (U.chance(0.25)) s = stripAccents(s);
    s = s.replace(/[.]$/, '');
    if ((pers.chaos || pers.offtopic) && U.chance(0.2)) s += ' ' + pick(['kkk', 'kkkkk', 'KKKK']);
    if (pers.caps && opts.strong && U.chance(0.6)) s = s.toUpperCase() + '!!';
    if (opts.question && !/\?$/.test(s)) s += '?';
    if (pers.offtopic && U.chance(0.2)) s = s.replace(/\?$/, '??');
    return s;
  }

  function line(kind, d, g, brain, opts) {
    const f = P[kind];
    if (!f) return '';
    const base = f(d || {}, helpers(g, brain));
    return style(base, g, brain, opts);
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
    found.sort((a, b) => a.i - b.i);
    return found;
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
    if (RX.where.test(n) && RX.body.test(n)) intents.push({ type: 'askBody' });

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
        else if (has('lie')) intents.push({ type: 'accuse', who, reason: 'lie' });
        else if (has('safe') || (has('visual') && !has('sus'))) intents.push({ type: 'vouch', who, reason: has('visual') ? 'visual' : 'claim' });
        else if (has('comigo')) intents.push({ type: 'vouch', who, reason: 'together', area });
        else if (has('sus') || has('vote')) others.forEach((pid) => intents.push({ type: 'accuse', who: pid, reason: has('vote') ? 'vote' : 'sus' }));
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

  AU.Talk = { P, line, style, parse, helpers, TASK_CHAT };
})();

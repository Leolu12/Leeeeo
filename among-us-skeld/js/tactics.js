/* Estrategista com IA durante a partida: de tempos em tempos o modelo de linguagem escolhe o que cada bot
   vai fazer (tarefa, seguir, vigiar, câmeras, sinal; e, para os impostores, caçar, fingir tarefa, sabotar,
   duto, atrair, double kill). O motor executa as ordens e mantém as regras e os reflexos (reportar corpo,
   fugir de quem viu matar, não matar com testemunha). Sem IA, os bots decidem pelo motor, como antes.
   Tripulantes e impostores são pedidos em chamadas separadas: o modelo dos tripulantes nunca sabe quem é impostor. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;

  const CREW_ACTIONS = [
    'tarefa [nome da tarefa] — ir fazer uma tarefa',
    'seguir NOME — andar junto de alguém de confiança (álibi, segurança)',
    'vigiar NOME — seguir de longe quem é suspeito',
    'evitar NOME — não ficar sozinho perto dessa pessoa',
    'sinal NOME — fazer zigue-zague "vem comigo" para a pessoa e mostrar uma tarefa visual',
    'cameras — olhar as câmeras na Segurança',
    'admin — olhar o mapa do Admin',
    'patrulhar — rodar pelas salas vazias procurando corpos (bom para quem já terminou as tarefas)',
    'ir SALA — ir para uma sala (ex.: juntar-se ao grupo, checar um lugar)',
    'botao — ir apertar o botão de emergência (com motivo: viu abate/duto/transformação, pegou alguém fingindo tarefa ou o scan, ou, sendo cientista, viu uma morte nos sinais vitais que ninguém reportou)',
  ];
  const IMP_ACTIONS = [
    'cacar NOME — escolher a próxima vítima e ir atrás quando ela estiver sozinha',
    'procurar — com o abate pronto e ninguém por perto: ir até onde viu alguém sozinho há pouco, ou ficar de tocaia numa sala isolada',
    'fingir SALA — fingir tarefa numa sala (criar álibi)',
    'grupo — andar com o grupo para parecer inocente',
    'sabotar luzes|comms|reator|o2 — sabotagem (luzes ajudam a matar; reator/o2 separam o grupo; comms desliga câmeras e admin)',
    'portas SALA — trancar as portas de uma sala (Cafeteria, MedBay, Segurança, Elétrica, Depósito, Motor Superior, Motor Inferior)',
    'duto — entrar no duto e sair em outro lugar',
    'atrair NOME — chamar alguém sozinho para um canto vazio',
    'double NOME_DO_PARCEIRO — combinar double kill com o parceiro quando houver dois tripulantes juntos',
    'ir SALA — ir para uma sala',
  ];

  const T = {
    create(g) {
      return new Strategist(g);
    },
    active(g) {
      return !g.headless && g.S.ui.aiChat !== 'off' && g.S.ui.aiActions !== 'off' && AU.LLM.ready();
    },
  };

  class Strategist {
    constructor(g) {
      this.g = g;
      this.busy = { crew: false, imp: false };
      this.next = { crew: 0, imp: 0 };
      this.calls = 0;
      this.log = [];
    }
    /* Início de rodada (depois de reunião) e sabotagens pedem decisão logo. */
    poke(team, delay) {
      const t = this.g.t + (delay || 0);
      if (team !== 'imp') this.next.crew = Math.min(this.next.crew, t);
      if (team !== 'crew') this.next.imp = Math.min(this.next.imp, t);
    }
    tick() {
      const g = this.g;
      if (g.phase !== 'play' || !T.active(g)) return;
      const t = g.t;
      if (t - g.roundStart < 4) return;
      if (!this.busy.crew && t >= this.next.crew) {
        const bots = g.players.filter((p) => p.alive && p.brain && !p.isImp);
        if (bots.length) this.decide('crew', bots);
        this.next.crew = t + U.rf(26, 34);
      }
      if (!this.busy.imp && t >= this.next.imp) {
        const bots = g.players.filter((p) => p.alive && p.brain && p.isImp);
        if (bots.length) this.decide('imp', bots);
        this.next.imp = t + U.rf(16, 22);
      }
    }

    who(id) {
      const p = this.g.players[id];
      return p ? `${p.name} (${C.COLOR[p.color].name})` : 'alguém';
    }
    room(p) {
      const a = M.areaAt(p.x, p.y);
      return M.roomOf(a, p.x, p.y).name + (a.kind === 'hall' ? ' (' + a.name + ')' : '');
    }

    /* O que um bot sabe agora, em poucas linhas. */
    state(p) {
      const g = this.g, b = p.brain, out = [];
      out.push('Está em ' + this.room(p) + (p.busy ? ', fazendo algo' : '') + '.');
      const seen = b.seenNow.filter((q) => q.alive).map((q) => g.appearId(q));
      out.push(seen.length ? 'Vê agora: ' + seen.map((id) => this.who(id)).join(', ') + '.' : 'Não vê ninguém agora (está sozinho).');
      if (!p.isImp) {
        const open = p.tasks.filter((tk) => !tk.done && g.taskAvailable(tk));
        if (open.length) out.push('Tarefas que faltam: ' + open.slice(0, 5).map((tk) => tk.def.name + ' (' + (M.STATIONS[tk.steps[tk.step]].area ? M.AREA[M.STATIONS[tk.steps[tk.step]].area].name : '?') + ')' + (tk.def.visual ? ' [visual]' : '')).join(', ') + '.');
        else out.push('Terminou as tarefas.');
        const ranked = g.players.filter((q) => q.alive && q !== p).map((q) => ({ id: q.id, s: b.liveSusp(q.id) })).sort((a, c) => c.s - a.s);
        const sus = ranked.filter((x) => x.s >= 20).slice(0, 2);
        const ok = ranked.filter((x) => x.s <= -15).slice(0, 2);
        if (sus.length) out.push('Desconfia de: ' + sus.map((x) => this.who(x.id) + (x.s >= 80 ? ' (viu fazer algo de impostor!)' : '')).join(', ') + '.');
        if (ok.length) out.push('Confia em: ' + ok.map((x) => this.who(x.id)).join(', ') + '.');
        if (p.special) out.push('Função: ' + C.ROLES[p.special].name + '.');
        const caught = b.mem.events.filter((e) => (e.type === 'fakeTask' || e.type === 'noscan') && e.t >= g.roundStart && g.players[e.who] && g.players[e.who].alive);
        if (caught.length) out.push('Pegou ' + this.who(caught[0].who) + ' fingindo tarefa (' + (caught[0].type === 'noscan' ? 'parado no scanner sem escanear' : 'terminou e a barra não subiu') + ').');
        const vit = Object.keys(b.mem.vitals || {}).map(Number).filter((id) => g.bodies.some((bd) => bd.pid === id && !bd.reported && !bd.gone));
        if (vit.length) out.push('Viu nos sinais vitais que ' + vit.map((id) => g.players[id].name).join(', ') + (vit.length > 1 ? ' morreram' : ' morreu') + ' e ninguém achou o corpo ainda.');
      } else {
        out.push('Recarga do abate: ' + (p.killCd > 0 ? Math.ceil(p.killCd) + 's' : 'PRONTO') + '.');
        const alone = b.crewVisible();
        if (alone.length === 1) out.push(this.who(alone[0].id) + ' está sozinho perto dele.');
        if (b.layLowUntil && g.t < b.layLowUntil) out.push('Foi acusado na última reunião: precisa parecer inocente por um tempo.');
        if (b.grudge != null && g.players[b.grudge].alive) out.push(this.who(b.grudge) + ' o acusou.');
        const cleared = [...new Set(b.mem.events.filter((e) => e.type === 'visual' && g.players[e.who] && g.players[e.who].alive && !g.players[e.who].isImp).map((e) => e.who))];
        if (cleared.length) out.push('Já provaram inocência com tarefa visual (os outros confiam neles; bons alvos): ' + cleared.map((id) => this.who(id)).join(', ') + '.');
        const near = M.VENTS.filter((v) => U.d2(v.x, v.y, p.x, p.y) < 6).map((v) => M.AREA[v.area].name);
        if (near.length) out.push('Duto perto: ' + near[0] + '.');
        const sawMe = g.players.filter((q) => q.alive && !q.isImp && b.lastSeenAt[q.id] && g.t - b.lastSeenAt[q.id].t < 18 && U.d2(b.lastSeenAt[q.id].x, b.lastSeenAt[q.id].y, p.x, p.y) < 11);
        if (sawMe.length) out.push('Foi visto por aqui há pouco por ' + sawMe.map((q) => this.who(q.id)).join(', ') + ' (matar agora nesta área o deixaria como suspeito).');
        /* o jeito de cada impostor (a IA decide por ele, mas respeitando o estilo dele) */
        if (b.sabStyle) {
          const sty = b.sabStyle();
          const fav = Object.keys(sty).sort((a, c) => sty[c] - sty[a])[0];
          out.push('Estilo próprio: ' + ({ lights: 'gosta de apagar as luzes antes de agir', comms: 'gosta de cortar as comunicações (câmeras/admin)', doors: 'gosta de trancar portas', crit: 'gosta de sabotar reator/O2 para separar o grupo' }[fav]) + '; usa duto ' + (b.lvl.useVents > 0.6 ? 'bastante' : 'pouco') + '; ' + (b.lvl.stalk > 0.5 ? 'persegue a vítima' : 'espera a vítima vir') + '.');
        }
        const lone = g.players.filter((q) => q.alive && !q.isImp && b.lastSeenAt[q.id] && g.t - b.lastSeenAt[q.id].t < 30).map((q) => ({ q, s: b.lastSeenAt[q.id] }))
          .filter((x) => !g.players.some((o) => o !== x.q && o.alive && !o.isImp && b.lastSeenAt[o.id] && Math.abs(b.lastSeenAt[o.id].t - x.s.t) < 4 && U.d2(b.lastSeenAt[o.id].x, b.lastSeenAt[o.id].y, x.s.x, x.s.y) < 7));
        if (lone.length) out.push('Viu sozinho há pouco: ' + lone.slice(0, 3).map((x) => this.who(x.q.id) + ' em ' + (M.AREA[x.s.area] ? M.AREA[x.s.area].name : '?') + ' (' + Math.round(g.t - x.s.t) + 's atrás)').join(', ') + '.');
        if (p.special) out.push('Função: ' + C.ROLES[p.special].name + '.');
      }
      if (p.emergencyLeft > 0 && !p.isImp) out.push('Botões de emergência restantes: ' + p.emergencyLeft + '.');
      return out;
    }

    prompt(team, bots) {
      const g = this.g;
      const sab = g.sab ? 'Sabotagem ativa: ' + g.sab.type + '.' : g.canSabotage && bots[0] && bots[0].isImp ? (g.canSabotage(bots[0]) ? 'Sabotagem disponível.' : 'Sabotagem em recarga.') : '';
      const tp = g.taskProgress();
      const head = [
        'Partida de dedução social igual a Among Us, na nave The Skeld. Você decide a PRÓXIMA AÇÃO de alguns personagens durante a rodada (fora da reunião).',
        AU.Voice.rules(g),
        '',
        'Agora: ' + Math.round(g.t - g.roundStart) + 's desde a última reunião. Barra de tarefas: ' + (tp.total ? Math.round((tp.done / tp.total) * 100) : 0) + '%. ' + sab,
        'Vivos: ' + g.players.filter((p) => p.alive).map((p) => this.who(p.id)).join(', ') + '.',
        '',
      ];
      if (team === 'crew') {
        const alive = g.players.filter((p) => p.alive), crewB = alive.filter((p) => p.brain && !p.isImp);
        const imps = g.S.rules.confirmEjects ? alive.filter((p) => p.isImp).length : crewB.length ? Math.round(crewB.reduce((a, p) => a + p.brain.impsLeftEst(), 0) / crewB.length) : g.S.room.impostors;
        const endgame = alive.length - imps <= imps + 2;
        head.push('Estes são TRIPULANTES. Cada um só sabe o que está na própria lista. Decida como um jogador esperto: fazer tarefas é o principal; andar em dupla com quem confia; vigiar de longe quem é suspeito; nunca ficar sozinho com suspeito; mostrar tarefa visual para quem desconfia de você; quem terminou as tarefas não fica parado: patrulha as salas isoladas procurando corpos, olha câmeras/admin ou acompanha quem ainda tem tarefa; botão com motivo concreto (viu algo de impostor, pegou tarefa falsa, cientista viu morte sem corpo).' + (endgame ? ' RETA FINAL: poucos vivos — ninguém anda sozinho; grudar em quem já provou ser inocente.' : ''));
        head.push('Ações possíveis:', CREW_ACTIONS.map((a) => '- ' + a).join('\n'));
      } else {
        const team2 = g.players.filter((p) => p.isImp && p.alive).map((p) => p.name).join(', ');
        head.push('Estes são os IMPOSTORES (' + team2 + '). Os tripulantes não sabem quem são. Decida como impostores espertos: matar só quem está sozinho e sem testemunha, longe das câmeras; criar álibi fingindo tarefa e andando com o grupo; usar duto para fugir ou chegar; sabotar para separar o grupo ou apagar as luzes antes de matar; combinar double kill; atrair vítimas; não andar colado no parceiro o tempo todo; se foi acusado, ficar na moita; com o abate pronto e ninguém por perto, "procurar" em vez de ficar fingindo tarefa; não matar logo depois de ter sido visto na mesma área; não reportar o próprio abate na hora (a vítima pode ter sido vista viva segundos antes: self report denuncia).');
        head.push('Ações possíveis:', IMP_ACTIONS.map((a) => '- ' + a).join('\n'));
      }
      head.push('');
      for (const p of bots) {
        const pers = C.PERSONALITIES[p.personality] || C.PERSONALITIES.analitico;
        head.push('### ' + this.who(p.id) + ' — ' + pers.name + (p.brain && p.brain.traitLine && p.brain.traitLine() ? ' (' + p.brain.traitLine() + ')' : ''));
        this.state(p).forEach((l) => head.push('- ' + l));
        head.push('');
      }
      head.push('Responda uma linha por personagem, sem explicar: Nome: ação alvo');
      bots.forEach((p) => head.push(p.name + ': ...'));
      return head.join('\n');
    }

    async decide(team, bots) {
      const g = this.g;
      this.busy[team] = true;
      this.calls++;
      let text = null;
      try {
        text = await AU.LLM.complete('Você comanda personagens de um jogo e responde só no formato pedido.', this.prompt(team, bots), { maxTokens: 40 + bots.length * 30 });
      } catch (e) {
        text = null;
      }
      this.busy[team] = false;
      if (!text || g.phase !== 'play') return;
      for (const raw of String(text).split(/\n+/)) {
        const line = raw.replace(/^[\s*\-•>#\d.)]+/, '').replace(/\*\*/g, '').trim();
        const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
        if (!m) continue;
        const wn = U.norm(m[1].replace(/\([^)]*\)/g, '')).trim();
        const p = bots.find((x) => U.norm(x.name) === wn || U.norm(C.COLOR[x.color].name) === wn);
        if (!p || !p.alive) continue;
        const order = this.parseOrder(m[2], p);
        if (!order) continue;
        p.brain.aiOrder = order;
        this.log.push({ t: g.t, who: p.name, order: order.kind + (order.target != null ? ' ' + g.players[order.target].name : '') + (order.room ? ' ' + order.room : '') + (order.sab ? ' ' + order.sab : '') });
        if (this.log.length > 60) this.log.shift();
      }
    }

    /* "vigiar Rafa", "sabotar luzes", "fingir elétrica" → ordem para o motor. */
    parseOrder(txt, p) {
      const g = this.g;
      const n = U.norm(txt).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      const verb = n.split(' ')[0];
      const rest = n.slice(verb.length).trim();
      const findP = () => {
        const alive = g.players.filter((q) => q.alive && q !== p);
        return alive.find((q) => rest.split(' ').includes(U.norm(q.name)) || rest.includes(U.norm(C.COLOR[q.color].name)));
      };
      const findRoom = () => {
        for (const r of M.ROOMS) if (r.aliases.some((a) => rest.includes(U.norm(a))) || rest.includes(U.norm(r.name))) return r.id;
        return null;
      };
      const until = g.t + U.rf(18, 30);
      const K = {
        tarefa: 'task', tarefas: 'task', task: 'task', seguir: 'follow', vigiar: 'tail', evitar: 'avoid', sinal: 'signal', cameras: 'cams', camera: 'cams',
        admin: 'admin', ir: 'go', botao: 'button', cacar: 'hunt', fingir: 'fake', grupo: 'group', sabotar: 'sab', portas: 'doors', porta: 'doors',
        duto: 'vent', atrair: 'lure', double: 'double', patrulhar: 'patrol', patrulha: 'patrol', rondar: 'patrol', ronda: 'patrol', procurar: 'prowl', tocaia: 'prowl',
      }[verb];
      if (!K) return null;
      const o = { kind: K, until, at: g.t };
      if (['follow', 'tail', 'avoid', 'signal', 'hunt', 'lure', 'double'].includes(K)) {
        const q = findP();
        if (!q) return null;
        o.target = q.id;
        if (!p.isImp && ['hunt', 'lure', 'double'].includes(K)) return null;
        if (p.isImp && ['avoid', 'signal'].includes(K)) return null;
      }
      if (K === 'task') o.task = rest;
      if (['go', 'fake', 'doors'].includes(K)) o.room = findRoom();
      if (K === 'sab') {
        o.sab = /luz|luzes|light/.test(rest) ? 'lights' : /comm|comunic/.test(rest) ? 'comms' : /reator|reactor/.test(rest) ? 'reactor' : /o2|oxigen/.test(rest) ? 'o2' : null;
        if (!o.sab) return null;
      }
      if (!p.isImp && ['fake', 'group', 'sab', 'doors', 'vent'].includes(K)) return null;
      if (p.isImp && ['task', 'cams', 'admin', 'button', 'follow', 'tail', 'patrol'].includes(K)) return null;
      if (!p.isImp && K === 'prowl') return null;
      return o;
    }
  }

  AU.Tactics = T;
})();

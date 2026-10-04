/* Mente própria: cada bot é uma IA separada. Ela só sabe o que o próprio personagem viveu (o que viu, por onde
   andou, o que ouviu na reunião) e as anotações que ela mesma escreveu; decide sozinha o que fazer na nave, o que
   falar e em quem votar. Uma chamada ao modelo por personagem, nunca juntando dois personagens na mesma chamada.
   O "corpo" continua sendo o motor do jogo: andar, desviar, executar o que a mente decidiu e os reflexos (levar
   susto, fugir de quem acabou de matar na frente). Sem IA (ou se ela cair), o motor volta a jogar sozinho. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;

  const Minds = {
    /* a pessoa deixou a mente própria ligada (é o padrão quando há IA) */
    wanted(g) {
      return g.S.ui.aiMind !== 'off' && g.S.ui.aiChat !== 'off';
    },
    online(g) {
      return Minds.wanted(g) && !!AU.LLM && AU.LLM.ready() && (!g.headless || !!g.forceMinds);
    },
    create(g) {
      return new Hub(g);
    },
  };

  const who = (g, id) => {
    const q = g.players[id];
    return q ? `${q.name} (${C.COLOR[q.color].name})` : 'alguém';
  };
  const area = (a) => (M.AREA[a] ? M.AREA[a].name : a || '?');
  const roomName = (x, y) => {
    const a = M.areaAt(x, y);
    return a.kind === 'hall' ? a.name : M.roomOf(a, x, y).name;
  };
  const clock = (g, t) => U.fmtTime(Math.max(0, t));
  const SAB = { lights: 'luzes apagadas', comms: 'comunicações cortadas (sem câmeras e sem admin)', reactor: 'REATOR derretendo', o2: 'O2 acabando' };

  /* Como a nave é (para planejar caminhos e entender o que viu) */
  const MAP_TXT = [
    'A nave (The Skeld):',
    '- Cafeteria no centro de cima (botão de emergência na mesa do meio). Dela saem: corredor de cima para oeste (MedBay e Motor Superior), Armas a leste e o corredor do Admin para o sul (Admin e Depósito).',
    '- Lado oeste: Motor Superior, Reator (no meio, extremo oeste), Segurança (entre os motores, ao lado do Reator, com as câmeras) e Motor Inferior.',
    '- Centro: MedBay (perto do corredor de cima), Elétrica (embaixo, entrada estreita, perigosa), Admin (ao lado da Cafeteria, mapa da nave), Depósito (grande, no centro-sul).',
    '- Lado leste: Armas (em cima), O2, Navegação (extremo leste), Escudos (embaixo à direita) e Comunicações (embaixo, entre Depósito e Escudos).',
  ].join('\n');

  const CREW_ACTS = [
    'tarefa NOME — ir fazer uma das suas tarefas (use o nome dela)',
    'ir SALA — andar até uma sala',
    'seguir NOME — andar junto de alguém',
    'vigiar NOME — seguir alguém de longe',
    'evitar NOME — não ficar perto dessa pessoa',
    'sinal NOME — chamar a pessoa com o zigue-zague ("vem comigo") e mostrar uma tarefa visual a ela',
    'responder NOME — devolver o zigue-zague (ok, tô indo) e ir junto de quem te chamou',
    'esperar — ficar onde está uns segundos olhando',
    'patrulhar — rodar pelas salas vazias',
    'cameras — olhar as câmeras na Segurança',
    'admin — olhar o mapa no Admin',
    'reportar — reportar o corpo que você vê (ou que acabou de achar)',
    'botao MOTIVO — ir apertar o botão de emergência e chamar uma reunião',
    'consertar — ir consertar a sabotagem',
  ];
  const IMP_ACTS = [
    'fingir TAREFA_OU_SALA — fingir que faz tarefa (álibi)',
    'ir SALA — andar até uma sala',
    'seguir NOME — andar junto de alguém (parecer inocente)',
    'grupo — ficar no meio do pessoal',
    'esperar — ficar onde está uns segundos',
    'cacar NOME — ir atrás da pessoa e matar quando ela estiver sozinha e ninguém estiver vendo',
    'matar NOME — matar assim que alcançar, mesmo com risco de alguém ver',
    'procurar — matar o primeiro que encontrar sozinho, sem testemunha',
    'atrair NOME — chamar a pessoa sozinha para um canto',
    'responder NOME — devolver o zigue-zague de quem te chamou e ir junto',
    'sabotar luzes|comms|reator|o2 — sabotar',
    'portas SALA — trancar as portas de uma sala (Cafeteria, MedBay, Segurança, Elétrica, Depósito, Motor Superior, Motor Inferior)',
    'duto SALA — entrar no duto e sair em outra sala ligada por ele',
    'reportar — reportar um corpo que você vê (até o seu)',
    'botao MOTIVO — ir apertar o botão de emergência',
    'consertar — ir consertar a sabotagem (impostor também pode, para parecer inocente)',
  ];
  const ROLE_ACTS = {
    cientista: ['vitals — olhar os sinais vitais (gasta bateria)'],
    rastreador: ['rastrear NOME — marcar alguém que está pertinho e acompanhar por onde anda'],
    engenheiro: ['duto SALA — usar o duto como atalho para outra sala'],
    metamorfo: ['transformar NOME — ficar com a aparência de outra pessoa', 'desfazer — voltar à sua aparência'],
    fantasma: ['sumir — ficar invisível por uns segundos (invisível não mata nem entra no duto)', 'aparecer — voltar a ficar visível'],
  };

  /* Extrai o JSON da resposta (o modelo às vezes escreve algo antes ou depois). */
  function parseJSON(text) {
    if (!text) return null;
    const s = String(text);
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    const raw = s.slice(a, b + 1);
    try {
      return JSON.parse(raw);
    } catch (e) {
      try {
        return JSON.parse(raw.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1'));
      } catch (e2) {
        return null;
      }
    }
  }
  const tidy = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^["'\s]+|["'\s]+$/g, '').slice(0, n || 160);

  /* ---------------------------------------------------------------------------------------------------------- */
  class Mind {
    constructor(hub, p) {
      this.hub = hub;
      this.g = hub.g;
      this.p = p;
      this.notes = '';
      this.diary = [];
      this.queue = [];
      this.thought = '';
      this.want = 0; /* 0 nada; 1 revisar o plano; 2 sem plano; 3 urgente */
      this.why = [];
      this.lastAsk = -99;
      this.lastPlanAt = -99;
      this.inflight = false;
      this.urgent = null;
      this.ix = { seen: 0, ev: 0, bodies: 0, trail: 0 };
      this.lastRoom = null;
      this.doneTasks = new Set();
      this.calls = 0;
      this.planned = 0;
      this.idle = null;
    }
    get b() {
      return this.p.brain;
    }
    log(text, t) {
      const g = this.g;
      this.diary.push({ t: t != null ? t : g.t, round: g.meetings, text });
      if (this.diary.length > 90) this.diary.splice(0, this.diary.length - 90);
    }
    ask(level, why) {
      if (level > this.want) this.want = level;
      if (why && !this.why.includes(why)) this.why.push(why);
      if (this.why.length > 4) this.why.shift();
    }
    /* próximo passo do plano para o corpo executar */
    nextOrder() {
      while (this.queue.length) {
        const o = this.queue.shift();
        if (!o) continue;
        o.until = this.g.t + (o.kind === 'task' || o.kind === 'fake' ? 70 : o.kind === 'go' || o.kind === 'patrol' ? 40 : 28);
        o.at = this.g.t;
        return o;
      }
      return null;
    }
    /* o plano acabou e a próxima decisão ainda não veio: segue o que a própria mente disse para fazer nesse meio
       tempo ("depois"), como quem continua fazendo tarefa enquanto pensa */
    idleOrder() {
      const g = this.g, p = this.p;
      let base = this.idle;
      if (!base) base = p.isImp ? { kind: 'fake', mind: true, label: 'fingir tarefa' } : p.tasks.some((tk) => !tk.done && g.taskAvailable(tk)) ? { kind: 'task', mind: true, label: 'tarefas' } : { kind: 'patrol', mind: true, label: 'patrulhar' };
      const o = Object.assign({}, base, { done: false, at: g.t, idle: true });
      o.until = g.t + (o.kind === 'task' || o.kind === 'fake' ? 70 : 30);
      return o;
    }
    /* o corpo encontrou algo que pede decisão agora; se a mente não responder a tempo, o corpo faz o óbvio */
    urge(kind, data, text, def, wait) {
      const g = this.g;
      this.urgent = { kind, data, at: g.t, until: g.t + (wait || 6), def };
      if (text) this.log(text);
      this.ask(3, text || kind);
    }

    /* --- o que a mente lembra --- */
    observe() {
      const g = this.g, b = this.b, p = this.p, mem = b.mem;
      /* por onde eu andei (só salas, para não encher de corredor) */
      const a = M.areaAt(p.x, p.y);
      const rm = M.roomOf(a, p.x, p.y);
      if (a.kind === 'room' && rm.id !== this.lastRoom) {
        this.lastRoom = rm.id;
        const there = b.seenNow.filter((q) => q.alive && M.roomOf(M.areaAt(q.x, q.y), q.x, q.y).id === rm.id).map((q) => who(g, g.appearId(q)));
        this.log('você entrou em ' + rm.name + (there.length ? ' (estavam lá: ' + there.join(', ') + ')' : ' (vazia)'));
      }
      for (const tk of p.tasks) {
        if (tk.done && !this.doneTasks.has(tk.id) && !p.isImp) {
          this.doneTasks.add(tk.id);
          this.log('você terminou a tarefa ' + tk.def.name);
        }
      }
      /* fatos que viu acontecer */
      for (; this.ix.ev < mem.events.length; this.ix.ev++) {
        const e = mem.events[this.ix.ev];
        const line = this.eventLine(e);
        if (!line) continue;
        this.log(line.text, e.t);
        if (line.urgent) this.ask(line.urgent, line.text);
      }
      for (; this.ix.bodies < mem.bodies.length; this.ix.bodies++) {
        const bd = mem.bodies[this.ix.bodies];
        const body = g.bodies.find((x) => x.id === bd.id);
        if (!body || body.reported || body.gone) continue;
        /* o próprio abate já está na memória (e o corpo sai de perto sozinho) */
        if (p.isImp && body.killer === p.id) continue;
        const near = (bd.near || []).filter((id) => id !== p.id && id !== bd.pid).map((id) => who(g, id));
        const mate = p.isImp && g.players[body.killer] && g.players[body.killer].isImp;
        const txt = (mate ? 'você viu o corpo de ' + who(g, bd.pid) + ' (abate do seu parceiro)' : 'você ACHOU O CORPO de ' + who(g, bd.pid)) + ' em ' + area(bd.area) + (bd.via === 'cams' ? ' (pelas câmeras)' : '') + (near.length ? '; perto do corpo estavam: ' + near.join(', ') : '');
        if (bd.via === 'cams') {
          this.log(txt, bd.t);
          this.ask(3, txt);
        } else this.urge('body', body.id, txt, p.isImp ? 'leave' : 'report', p.isImp ? 7 : 5);
      }
    }
    eventLine(e) {
      const g = this.g, p = this.p;
      const W = (id) => (id === p.id ? 'você' : who(g, id));
      const via = e.via === 'cams' ? ' (pelas câmeras)' : '';
      switch (e.type) {
        case 'kill':
          return { text: 'VOCÊ VIU ' + W(e.who) + ' MATAR ' + W(e.victim) + ' em ' + area(e.area) + via, urgent: 3 };
        case 'vent':
          return { text: 'viu ' + W(e.who) + (e.dir === 'out' ? ' SAIR de um duto' : ' ENTRAR num duto') + ' em ' + area(e.area) + via, urgent: 3 };
        case 'shift':
          return { text: 'viu ' + W(e.who) + ' SE TRANSFORMAR em outra pessoa em ' + area(e.area) + via, urgent: 3 };
        case 'vanish':
          return { text: 'viu ' + W(e.who) + ' FICAR INVISÍVEL em ' + area(e.area) + via, urgent: 3 };
        case 'oddAbility':
          return { text: 'viu de longe algo estranho com ' + W(e.who) + ' em ' + area(e.area) + ' (pareceu ' + (e.kind === 'shift' ? 'mudar de aparência' : 'sumir') + '; não deu para ter certeza)', urgent: 2 };
        case 'visual':
          return { text: 'viu ' + W(e.who) + ' fazendo ' + (M.VISUAL_NAMES[e.task] || 'tarefa visual') + ' com a animação aparecendo (só tripulante consegue)' + via };
        case 'noscan':
          return { text: 'viu ' + W(e.who) + ' parado ' + ({ scan: 'no scanner da MedBay', asteroids: 'na arma de asteroides' }[e.task] || 'numa tarefa visual') + ' sem a animação aparecer', urgent: 2 };
        case 'fakeTask':
          return { text: 'viu ' + W(e.who) + ' ficar numa tarefa em ' + area(e.area) + ' pelo tempo dela, sair, e a barra de tarefas não subiu', urgent: 2 };
        case 'follow':
          return { text: W(e.who) + ' ficou andando atrás de você em ' + area(e.area), urgent: 1 };
        case 'noise':
          return { text: 'tocou o alarme do barulhento: alguém morreu em ' + area(e.area), urgent: 3 };
        case 'twin':
          return { text: e.self ? 'viu alguém com a SUA cara em ' + area(e.a1) + (e.kill != null ? ', matando ' + W(e.kill) : '') + ' (era o metamorfo disfarçado de você)' : 'viu DOIS ' + W(e.who) + ' ao mesmo tempo (' + area(e.a1) + (e.a2 && e.a2 !== e.a1 ? ' e ' + area(e.a2) : '') + '): um deles era o metamorfo disfarçado' + (e.kill != null ? '; um deles matou ' + W(e.kill) : ''), urgent: 3 };
        case 'myKill': {
          const sb = (e.seenBy || []).filter((id) => id !== e.victim && id !== p.id);
          return { text: 'VOCÊ MATOU ' + W(e.victim) + ' em ' + area(e.area) + (sb.length ? '; quem podia ter visto: ' + sb.map(W).join(', ') : '; ninguém à vista'), urgent: 3 };
        }
        case 'partnerKill':
          return { text: 'seu parceiro ' + W(e.who) + ' matou ' + W(e.victim) + ' em ' + area(e.area), urgent: 2 };
        case 'escortVisual':
          return { text: 'você acompanhou ' + W(e.who) + ' e viu a tarefa visual' };
        default:
          return null;
      }
    }
    /* última vez que viu cada pessoa nesta rodada e quanto tempo ficou perto dela */
    sightings() {
      const g = this.g, b = this.b, p = this.p, out = [];
      const t0 = g.roundStart;
      for (const q of g.players) {
        if (q === p || !q.alive) continue;
        const ls = b.lastSeenAt[q.id];
        const near = b.mem.seen.filter((s) => s.who === q.id && s.t1 >= t0 && s.via === 'eyes').reduce((a, s) => a + (s.t1 - s.t0), 0);
        if (!ls || ls.t < t0) {
          out.push(who(g, q.id) + ': não viu nesta rodada');
          continue;
        }
        out.push(who(g, q.id) + ': ' + area(ls.area) + ', há ' + Math.max(1, Math.round(g.t - ls.t)) + 's' + (near >= 8 ? ' (vocês ficaram perto uns ' + Math.round(near) + 's nesta rodada)' : ''));
      }
      return out;
    }
    memoryLines(n) {
      const g = this.g;
      const lines = [];
      let round = -1;
      for (const d of this.diary.slice(-n)) {
        if (d.round !== round) {
          round = d.round;
          lines.push(round === 0 ? '(começo da partida)' : '(depois da reunião ' + round + ')');
        }
        lines.push('[' + clock(g, d.t) + '] ' + d.text);
      }
      return lines;
    }

    pastChatLines(n) {
      const g = this.g, pc = this.hub.pastChat;
      if (!pc.length) return [];
      return ['', 'O que foi dito na reunião ' + pc[0].index + ' (as últimas falas):', ...pc.slice(-n).map((x) => (x.from === this.p.id ? 'VOCÊ' : who(g, x.from)) + ': ' + x.text)];
    }

    /* --- quem sou eu --- */
    identity() {
      const g = this.g, p = this.p, b = this.b;
      const V = AU.Voice;
      const lines = [];
      lines.push('Você é ' + who(g, p.id) + ', um dos ' + g.players.length + ' jogadores de uma partida de Among Us na nave The Skeld. Você controla só esse personagem: decide sozinho para onde ir, o que fazer, o que falar e em quem votar. Ninguém te dá ordens.');
      lines.push('Seu jeito: ' + (V && V.persona ? V.persona(b) : (C.PERSONALITIES[p.personality] || {}).desc || ''));
      if (p.isImp) {
        const mates = g.players.filter((q) => q.isImp && q !== p).map((q) => who(g, q.id) + (q.alive ? '' : ' (morto)'));
        lines.push('SEGREDO: você é IMPOSTOR.' + (mates.length ? ' Seu parceiro: ' + mates.join(', ') + '.' : ' Você é o único impostor.') + ' Ninguém mais sabe. Você vence quando os impostores ficarem em número igual ao de tripulantes (ou se uma sabotagem crítica não for consertada).');
      } else lines.push('Você é TRIPULANTE. Você vence terminando as tarefas ou tirando todos os impostores na votação. Você não sabe quem são os impostores.');
      if (p.special && C.ROLES[p.special]) lines.push('Sua função: ' + C.ROLES[p.special].name + ' — ' + C.roleDesc(p.special, g.S) + '.');
      lines.push('Jogue como um jogador humano joga Among Us de verdade: preste atenção em quem anda com quem e onde, lembre do que viu, desconfie com motivo, chame reunião (aperte o botão) quando tiver um motivo forte, reporte corpo, ande com quem confia, faça a "chamadinha" (sinal de vem comigo) para mostrar tarefa visual, e na reunião defenda-se, acuse e vote. ' + (p.isImp ? 'Como impostor, finja tarefas, mate quando ninguém estiver vendo, fuja da cena, use dutos e sabotagens, e minta com cuidado na reunião.' : 'Como tripulante, faça suas tarefas, mas fique de olho.'));
      lines.push('Você só sabe o que o seu personagem viveu (a sua memória abaixo) e o que for dito no chat. Não invente o que não viu.');
      return lines.join('\n');
    }
    rules() {
      const V = AU.Voice;
      return MAP_TXT + '\n' + (V && V.rules ? V.rules(this.g) : '');
    }

    /* --- o que está acontecendo agora --- */
    now() {
      const g = this.g, p = this.p, b = this.b, out = [];
      out.push('Agora: ' + Math.round(g.t - g.roundStart) + 's desde ' + (g.meetings ? 'a última reunião' : 'o começo') + '. Você está em ' + roomName(p.x, p.y) + (p.busy ? ', no meio de uma tarefa' : '') + '.');
      const seen = b.seenNow.filter((q) => q.alive);
      if (seen.length) {
        out.push('Você vê agora: ' + seen.map((q) => {
          const aid = g.appearId(q);
          const d = U.dist(p, q);
          const act = q.visual && g.S.rules.visualTasks ? 'fazendo ' + (M.VISUAL_NAMES[q.visual.type] || 'tarefa visual') + ' (animação aparecendo)' : q.busy ? 'parado mexendo num painel' : q.moving ? 'andando' : 'parado';
          return who(g, aid) + ' a ' + Math.max(1, Math.round(d)) + 'm, ' + act;
        }).join('; ') + '.');
      } else out.push('Não tem ninguém à sua vista.');
      const bodies = b.bodiesNow.filter((x) => !x.reported && !x.gone);
      if (bodies.length) out.push('CORPO à vista: ' + bodies.map((x) => who(g, x.pid) + ' em ' + area(x.area)).join(', ') + '.');
      if (g.sab) out.push('SABOTAGEM ATIVA: ' + (SAB[g.sab.type] || g.sab.type) + (g.sab.timer != null ? ' (faltam ' + Math.ceil(g.sab.timer) + 's)' : '') + '.');
      if (!p.isImp) {
        const open = p.tasks.filter((tk) => !tk.done);
        if (open.length) out.push('Suas tarefas que faltam: ' + open.map((tk) => {
          const st = M.STATIONS[tk.steps[tk.step]];
          return tk.def.name + ' (' + (st && st.area ? area(st.area) : '?') + ')' + (tk.def.visual && g.S.rules.visualTasks ? ' [visual]' : '') + (g.taskAvailable(tk) ? '' : ' [indisponível agora]');
        }).join(', ') + '.');
        else out.push('Você já terminou todas as suas tarefas.');
      } else {
        out.push('Recarga do abate: ' + (p.killCd > 0 ? Math.ceil(p.killCd) + 's' : 'PRONTO') + '. Sabotagem: ' + (g.sab ? 'já tem uma ativa' : g.canSabotage(p) ? 'disponível' : 'em recarga') + '.');
        const fake = p.tasks.filter((tk) => !tk.done).slice(0, 5).map((tk) => {
          const st = M.STATIONS[tk.steps[tk.step]];
          return tk.def.name + ' (' + (st && st.area ? area(st.area) : '?') + ')';
        });
        if (fake.length) out.push('Tarefas de fachada (para fingir): ' + fake.join(', ') + '.');
        const vents = M.VENTS.filter((v) => U.d2(v.x, v.y, p.x, p.y) < 7);
        if (vents.length) out.push('Duto aqui perto (' + area(vents[0].area) + '), liga com: ' + vents[0].links.map((id) => area(M.VENT[id].area)).join(', ') + '.');
      }
      if (p.special === 'cientista') out.push('Bateria dos sinais vitais: ' + Math.round(p.battery || 0) + 's.');
      if (p.special === 'metamorfo') out.push(p.shiftAs != null ? 'Você está disfarçado de ' + who(g, p.shiftAs) + '.' : 'Transformação: ' + (p.abilityCd > 0 ? 'em recarga (' + Math.ceil(p.abilityCd) + 's)' : 'pronta') + '.');
      if (p.special === 'fantasma') out.push(p.invisUntil > g.t ? 'Você está invisível.' : 'Sumir: ' + (p.abilityCd > 0 ? 'em recarga (' + Math.ceil(p.abilityCd) + 's)' : 'pronto') + '.');
      if (p.special === 'rastreador') out.push('Rastrear: ' + (p.abilityCd > 0 ? 'em recarga (' + Math.ceil(p.abilityCd) + 's)' : 'pronto (precisa estar pertinho da pessoa)') + '.');
      if (p.special === 'engenheiro') out.push('Duto de engenheiro: ' + (p.abilityCd > 0 ? 'em recarga' : 'pronto') + '.');
      const gone = g.players.filter((q) => !q.alive).map((q) => who(g, q.id) + (q.ejected ? ' (ejetado)' : ''));
      if (gone.length) out.push('Fora do jogo: ' + gone.join(', ') + '.');
      out.push('Botões de emergência que você ainda tem: ' + p.emergencyLeft + '.');
      const pl = b.plan;
      if (pl && this.cur) out.push('Você estava fazendo: ' + this.cur.label + '.');
      return out;
    }

    fieldPrompt() {
      const p = this.p;
      const acts = (p.isImp ? IMP_ACTS : CREW_ACTS).concat(ROLE_ACTS[p.special] || []);
      const lines = [];
      lines.push(...this.now());
      lines.push('', 'Última vez que você viu cada um:', ...this.sightings().map((l) => '- ' + l));
      lines.push('', 'Sua memória desta partida (o que você viveu):', ...this.memoryLines(26));
      lines.push('', 'Suas anotações (você mesmo escreveu): ' + (this.notes || '(nenhuma ainda)'));
      if (this.g.t - this.g.roundStart < 45) lines.push(...this.pastChatLines(10));
      if (this.why.length) lines.push('', 'O que acabou de acontecer: ' + this.why.join('; ') + '.');
      lines.push('', 'O que você pode fazer (escreva cada passo do plano assim):', ...acts.map((a) => '- ' + a));
      lines.push('', 'Decida o que fazer agora, como você jogaria. Responda SÓ com um JSON neste formato:');
      lines.push('{"pensamento": "o que você está pensando, curto", "plano": ["primeiro passo", "segundo passo", "terceiro passo"], "depois": "o que fazer quando o plano acabar, enquanto pensa no próximo (um passo, ex.: ' + (p.isImp ? '\'fingir\', \'grupo\'' : '\'tarefa\', \'patrulhar\'') + ' ou \'seguir NOME\')", "notas": "o que quer lembrar daqui pra frente (suspeitas, álibis, planos); deixe vazio para manter as anteriores"}');
      lines.push('O plano tem de 1 a 5 passos, na ordem (pense uns 30 a 60 segundos à frente). "tarefa" sem nome = a tarefa mais perto.');
      return lines.join('\n');
    }

    /* "tarefa Fios", "vigiar Rafa", "sabotar luzes" → ordem para o corpo */
    parseStep(raw) {
      const g = this.g, p = this.p;
      const txt = tidy(raw, 120);
      const n = U.norm(txt).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!n) return null;
      const verb = n.split(' ')[0];
      const rest = n.slice(verb.length).trim();
      const findP = () => {
        const alive = g.players.filter((q) => q.alive && q !== p);
        const words = rest.split(' ');
        return alive.find((q) => words.includes(U.norm(q.name)) || rest.includes(U.norm(q.name))) || alive.find((q) => rest.includes(U.norm(C.COLOR[q.color].name)));
      };
      const findRoom = () => {
        for (const r of M.ROOMS) if (rest.includes(U.norm(r.name)) || (r.aliases || []).some((a) => rest.includes(U.norm(a)))) return r.id;
        return null;
      };
      const K = {
        tarefa: 'task', tarefas: 'task', task: 'task', fazer: 'task', ir: 'go', andar: 'go', seguir: 'follow', acompanhar: 'follow', vigiar: 'tail', evitar: 'avoid',
        sinal: 'signal', chamar: 'signal', responder: 'reply', esperar: 'wait', parar: 'wait', patrulhar: 'patrol', rondar: 'patrol', cameras: 'cams', camera: 'cams', admin: 'admin',
        reportar: 'report', botao: 'button', emergencia: 'button', consertar: 'fix', fingir: 'fake', grupo: 'group', cacar: 'hunt', matar: 'kill', procurar: 'prowl',
        atrair: 'lure', sabotar: 'sab', portas: 'doors', porta: 'doors', trancar: 'doors', duto: 'vent', ventar: 'vent', vitals: 'vitals', sinais: 'vitals',
        rastrear: 'track', transformar: 'shift', desfazer: 'unshift', sumir: 'vanish', aparecer: 'appear',
      }[verb];
      if (!K) return null;
      const o = { kind: K, mind: true, label: txt };
      if (['follow', 'tail', 'avoid', 'signal', 'reply', 'hunt', 'kill', 'lure', 'track', 'shift'].includes(K)) {
        const q = findP();
        if (!q) return null;
        o.target = q.id;
      }
      if (['task', 'fake'].includes(K)) {
        o.task = rest;
        o.room = findRoom();
      }
      if (['go', 'doors', 'vent'].includes(K)) o.room = findRoom();
      if (K === 'button') o.why = tidy(txt.replace(/^\S+\s*/, ''), 100);
      if (K === 'sab') {
        o.sab = /luz|luzes|light/.test(rest) ? 'lights' : /comm|comunic|coms/.test(rest) ? 'comms' : /reator|reactor/.test(rest) ? 'reactor' : /o2|oxigen/.test(rest) ? 'o2' : null;
        if (!o.sab) return null;
      }
      /* o que cada lado pode fazer (regras do jogo) */
      const impOnly = ['fake', 'group', 'hunt', 'kill', 'prowl', 'lure', 'sab', 'doors'];
      const crewOnly = ['task', 'signal', 'cams', 'admin', 'patrol'];
      if (!p.isImp && impOnly.includes(K)) return null;
      if (p.isImp && crewOnly.includes(K) && K !== 'cams' && K !== 'admin' && K !== 'patrol') return K === 'task' ? Object.assign(o, { kind: 'fake' }) : null;
      if (K === 'vent' && !p.isImp && p.special !== 'engenheiro') return null;
      if (K === 'vitals' && p.special !== 'cientista') return null;
      if (K === 'track' && p.special !== 'rastreador') return null;
      if ((K === 'shift' || K === 'unshift') && p.special !== 'metamorfo') return null;
      if ((K === 'vanish' || K === 'appear') && p.special !== 'fantasma') return null;
      return o;
    }
    applyField(j) {
      const g = this.g;
      if (!j) return false;
      if (typeof j.notas === 'string' && tidy(j.notas, 700)) this.notes = tidy(j.notas, 700);
      if (typeof j.pensamento === 'string') this.thought = tidy(j.pensamento, 200);
      const steps = Array.isArray(j.plano) ? j.plano : typeof j.plano === 'string' ? [j.plano] : [];
      const orders = steps.slice(0, 5).map((s) => this.parseStep(typeof s === 'string' ? s : s && (s.acao || s.passo || ''))).filter(Boolean);
      if (!orders.length) return false;
      const idle = typeof j.depois === 'string' ? this.parseStep(j.depois) : null;
      this.idle = idle && !['button', 'report', 'kill', 'sab', 'doors', 'vent', 'vitals', 'shift', 'unshift', 'vanish', 'appear', 'track', 'signal', 'lure', 'reply'].includes(idle.kind) ? idle : null;
      this.queue = orders;
      this.planned++;
      this.lastPlanAt = g.t;
      /* o plano novo vale já: larga o que estava fazendo (menos uma tarefa no meio, que termina) */
      const b = this.b;
      if (b && !(this.p.busy && b.plan && b.plan.type === 'task')) {
        if (b.plan && !['flee', 'report', 'button'].includes(b.plan.type)) b.plan = null;
      }
      this.urgent = null;
      return true;
    }

    /* --- reunião --- */
    meetPrompt(mt) {
      const g = this.g, p = this.p, info = mt.info;
      const lines = [];
      const reason = info.kind === 'report'
        ? who(g, info.caller) + ' REPORTOU O CORPO de ' + who(g, info.body.pid) + (mt.facts.bodyArea ? ' (achado em ' + area(mt.facts.bodyArea) + ')' : info.caller === p.id ? ' (achado em ' + area(info.body.area) + ')' : '')
        : who(g, info.caller) + ' apertou o BOTÃO DE EMERGÊNCIA';
      lines.push('REUNIÃO ' + (info.index || g.meetings) + ': ' + reason + '.');
      if (info.caller === p.id) lines.push('Foi VOCÊ que chamou esta reunião' + (this.callWhy ? ' (motivo que você tinha: ' + this.callWhy + ')' : '') + '. Comece explicando.');
      const alive = mt.alive.map((id) => who(g, id));
      const dead = g.players.filter((q) => !q.alive).map((q) => who(g, q.id) + (q.ejected ? ' (ejetado)' : ''));
      lines.push('Vivos: ' + alive.join(', ') + '.');
      if (dead.length) lines.push('Fora do jogo: ' + dead.join(', ') + '.');
      if (mt.phase === 'voting') {
        const left = Math.max(0, Math.round(mt.votingEnd - mt.t));
        const voted = mt.alive.filter((id) => mt.votes[id] !== undefined).map((id) => g.players[id].name);
        lines.push('VOTAÇÃO aberta (faltam ' + left + 's). Já votaram: ' + (voted.length ? voted.join(', ') : 'ninguém') + '. Você ' + (mt.votes[p.id] !== undefined ? 'já votou.' : 'ainda NÃO votou: decida o seu voto agora.'));
      } else lines.push('Discussão (a votação abre em ' + Math.max(0, Math.round(mt.votingStart - mt.t)) + 's).');
      lines.push('', 'Última vez que você viu cada um nesta rodada:', ...this.sightings().map((l) => '- ' + l));
      lines.push('', 'Sua memória (o que você viveu):', ...this.memoryLines(24));
      lines.push('', 'Suas anotações: ' + (this.notes || '(nenhuma)'));
      lines.push(...this.pastChatLines(12));
      lines.push('', 'Chat da reunião (mais antigo primeiro):');
      const msgs = mt.msgs.filter((m) => !m.ghost).slice(-40);
      if (!msgs.length) lines.push('(ninguém falou ainda)');
      for (const m of msgs) lines.push((m.from === p.id ? 'VOCÊ' : who(g, m.from)) + ': ' + m.text);
      const mine = mt.msgs.filter((m) => m.from === p.id).length;
      lines.push('');
      lines.push('Escreva como no chat do jogo: mensagens curtas (até uns 100 caracteres), do seu jeito de escrever. Você já mandou ' + mine + ' mensagem(ns) nesta reunião. Mande de 0 a 2 mensagens novas: fale se tem algo a contar, perguntar, responder, acusar ou defender; se não tem nada útil, fique quieto (lista vazia). Não repita o que já foi dito.');
      if (p.isImp) lines.push('Lembre: você é impostor e ninguém sabe. Não se entregue nem entregue o parceiro sem motivo.');
      const voteTxt = mt.votes[p.id] !== undefined ? 'null (você já votou)'
        : mt.phase === 'voting' ? '"Nome de quem você vota" ou "pular" (ou null se ainda quer esperar a conversa; o tempo acaba)'
        : '"Nome" ou "pular": em quem você votaria se fosse agora (ou null se ainda não sabe)';
      lines.push('Responda SÓ com um JSON: {"mensagens": ["..."], "voto": ' + voteTxt + ', "notas": "o que quer lembrar (vazio mantém as anteriores)"}');
      return lines.join('\n');
    }
  }

  /* ---------------------------------------------------------------------------------------------------------- */
  class Hub {
    constructor(g) {
      this.g = g;
      this.minds = new Map();
      for (const p of g.players) if (p.brain) this.minds.set(p.id, new Mind(this, p));
      this.inflight = 0;
      this.stats = { calls: 0, ok: 0, fail: 0, ms: 0, field: 0, meet: 0, votes: 0 };
      this.failStreak = 0;
      this.lastSab = null;
      this.table = null;
      this.round = -1;
      this.pauseUntil = -1;
      this.wasOn = null;
      this.pastChat = [];
    }
    mind(p) {
      return p ? this.minds.get(p.id) : null;
    }
    online() {
      return Minds.online(this.g) && this.g.t >= this.pauseUntil;
    }
    /* várias chamadas seguidas sem resposta: o motor joga por um minuto e depois a mente tenta de novo */
    failed() {
      this.failStreak++;
      if (this.failStreak >= 4) {
        this.failStreak = 0;
        this.pauseUntil = this.g.t + 60;
      }
    }
    /* a mente comanda este corpo agora? (fantasma continua com o motor) */
    controls(p) {
      return !!p && p.alive && this.minds.has(p.id) && this.online();
    }
    maxInflight() {
      return AU.LLM.provider === 'api' ? 2 : 1;
    }

    tick() {
      const g = this.g;
      const on = this.online();
      if (on !== this.wasOn) {
        /* avisa quando liga e quando a IA cai no meio (só depois de ter ligado) */
        const now = performance.now();
        if (!g.headless && AU.HUD && AU.HUD.toast && (on || this.wasOn) && now - (this.toastAt || -1e9) > 60000) {
          this.toastAt = now;
          AU.HUD.toast(on ? 'Mente própria: cada bot é uma IA separada e decide sozinho o que fazer, falar e votar.' : 'IA indisponível agora: os bots voltaram a jogar pelo sistema de regras até ela voltar.', 4500);
        }
        this.wasOn = on;
        if (on) this.round = -1;
      }
      if (!on) return;
      if (this.round !== g.meetings) {
        this.round = g.meetings;
        for (const m of this.minds.values()) {
          m.queue = [];
          m.urgent = null;
          m.want = 0;
          m.why = [];
          m.ask(2, g.meetings ? 'a reunião acabou e a rodada recomeçou' : 'a partida começou');
        }
      }
      /* sabotagem começou/terminou: todo mundo percebe (alarme e luzes) */
      const s = g.sab ? g.sab.type + ':' + g.sab.t0 : null;
      if (s !== this.lastSab) {
        const prev = this.lastSab;
        this.lastSab = s;
        for (const m of this.minds.values()) {
          if (!m.p.alive) continue;
          if (g.sab) {
            const crit = g.sab.type === 'reactor' || g.sab.type === 'o2';
            const txt = 'SABOTAGEM: ' + (SAB[g.sab.type] || g.sab.type);
            if (m.p.isImp) {
              m.log(txt);
              m.ask(1, txt);
            } else m.urge('sab', g.sab.type, txt, crit ? 'fix' : g.sab.type === 'lights' ? 'fixMaybe' : null, crit ? 6 : 10);
          } else if (prev) m.log('a sabotagem foi consertada');
        }
      }
      for (const m of this.minds.values()) {
        if (!m.p.alive || !m.p.brain) continue;
        m.observe();
        /* plano antigo: dá uma chance de rever (gente muda de ideia) */
        if (!m.want && g.t - m.lastPlanAt > 45 && g.t - m.lastAsk > 20) m.ask(1, '');
      }
      if (g.phase !== 'play') return;
      while (this.inflight < this.maxInflight()) {
        const m = this.pickField();
        if (!m) break;
        this.thinkField(m);
      }
    }
    pickField() {
      const g = this.g;
      let best = null, bs = 0;
      for (const m of this.minds.values()) {
        if (!m.p.alive || m.inflight || !m.want) continue;
        if (g.t - m.lastAsk < (m.want >= 3 ? 1.5 : m.want >= 2 ? 3 : 15)) continue;
        if (g.t - g.roundStart < 2) continue;
        const s = m.want * 100 + Math.min(60, g.t - m.lastAsk);
        if (s > bs) {
          bs = s;
          best = m;
        }
      }
      return best;
    }
    async call(system, prompt, maxTokens) {
      const t0 = performance.now();
      this.inflight++;
      this.stats.calls++;
      let text = null;
      /* resposta que não chega não pode prender a vez de todo mundo */
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), 40000) : null;
      try {
        text = await AU.LLM.complete(system, prompt, { maxTokens, temperature: 0.9, timeout: 30000, signal: ctl ? ctl.signal : undefined });
      } catch (e) {
        text = null;
      } finally {
        if (timer) clearTimeout(timer);
        this.inflight--;
      }
      const ms = performance.now() - t0;
      this.stats.ms = this.stats.ms ? this.stats.ms * 0.8 + ms * 0.2 : ms;
      return text;
    }
    async thinkField(m) {
      const g = this.g;
      m.inflight = true;
      m.lastAsk = g.t;
      const round = g.meetings, level = m.want;
      m.want = 0;
      const prompt = m.fieldPrompt();
      m.why = [];
      m.calls++;
      this.stats.field++;
      const text = await this.call(m.identity() + '\n\n' + m.rules(), prompt, 260);
      m.inflight = false;
      if (g.meetings !== round || g.phase !== 'play' || !m.p.alive) return;
      const j = parseJSON(text);
      if (j && m.applyField(j)) {
        this.stats.ok++;
        this.failStreak = 0;
      } else {
        this.stats.fail++;
        if (!text) this.failed();
        /* sem resposta útil: pede de novo daqui a pouco */
        m.ask(Math.max(level, 2), '');
      }
    }
    /* reunião: devolve a "mesa" que faz cada mente falar e votar sozinha */
    meeting(mt) {
      this.table = new Table(this, mt);
      return this.table;
    }
    /* o que ficou da reunião na memória de cada um */
    afterMeeting(mt, result) {
      const g = this.g;
      const ej = result && result.ejected != null ? g.players[result.ejected] : null;
      let txt = 'REUNIÃO ' + (mt.info.index || g.meetings) + ' terminou: ';
      if (ej) txt += who(g, ej.id) + ' foi ejetado' + (g.S.rules.confirmEjects ? (ej.isImp ? ' — ERA impostor' : ' — NÃO era impostor') : ' (não confirmam se era impostor)');
      else txt += 'ninguém foi ejetado' + (result && result.tie ? ' (empate)' : '');
      if (!g.S.rules.anonymousVotes && result && result.votes) {
        const v = Object.keys(result.votes).map((id) => g.players[+id].name + '→' + (result.votes[id] === 'skip' ? 'pulou' : g.players[result.votes[id]] ? g.players[result.votes[id]].name : '?'));
        if (v.length) txt += '. Votos: ' + v.join(', ');
      }
      for (const m of this.minds.values()) {
        if (!m.p.alive) continue;
        m.log(txt, g.t);
        m.callWhy = null;
      }
      /* o que foi dito (todo mundo ouviu): as últimas falas ficam para a rodada seguinte e a próxima reunião */
      this.pastChat = mt.msgs.filter((x) => !x.ghost).slice(-16).map((x) => ({ from: x.from, text: tidy(x.text, 110), index: mt.info.index || g.meetings }));
    }
  }

  /* ---------------------------------------------------------------------------------------------------------- */
  /* A mesa da reunião: cada mente é chamada sozinha, lê o chat e decide se fala (e, na votação, em quem vota). */
  class Table {
    constructor(hub, mt) {
      this.hub = hub;
      this.mt = mt;
      this.g = mt.g;
      this.aiVotes = {};
      this.aiLines = 0;
      this.calls = 0;
      this.fails = 0;
      this.last = {};
      this.want = {};
      this.talking = new Set();
      this.started = false;
      this.intent = {};
      this.voteAsks = {};
      this.mind = true;
    }
    on() {
      return this.hub.online() && this.fails < 4;
    }
    /* este personagem fala por conta própria agora (o motor não fala por ele) */
    speaksFor(p) {
      return !!p && p.alive && this.hub.minds.has(p.id) && this.on();
    }
    /* falas do motor não passam por aqui (a mente fala por si) */
    accepts() {
      return false;
    }
    enqueue() {}
    flush() {}
    maxCalls() {
      return 48;
    }
    pendingLines() {
      return 0;
    }
    opening() {
      const mt = this.mt, g = this.g;
      this.started = true;
      const c = g.players[mt.info.caller];
      if (c && c.brain && c.alive) this.want[c.id] = 3;
    }
    /* alguém falou: quem foi citado ou cobrado quer responder */
    onPost(msg) {
      const mt = this.mt, g = this.g;
      if (!msg || msg.ghost) return;
      const n = ' ' + U.norm(msg.text) + ' ';
      for (const id of mt.alive) {
        const q = g.players[id];
        if (!q.brain || id === msg.from) continue;
        const named = n.includes(' ' + U.norm(q.name) + ' ') || n.includes(U.norm(q.name) + ',') || n.includes(' ' + U.norm(C.COLOR[q.color].name));
        this.want[id] = Math.max(this.want[id] || 0, named ? 3 : 1);
      }
    }
    /* o que o jogador escreve já passa por onPost */
    onHuman() {}
    /* o voto espera a mente decidir; se o tempo acabar, vale o que ela disse que votaria na discussão */
    waitVote(id) {
      if (!this.on() || this.aiVotes[id]) return false;
      const mt = this.mt, g = this.g;
      if (mt.t < mt.votingEnd - 4 && (this.voteAsks[id] || 0) < 4) return true;
      const it = this.intent[id];
      if (it != null && (it === 'skip' || (g.players[it] && g.players[it].alive))) this.aiVotes[id] = { target: it, reason: '' };
      return false;
    }
    voteTick() {}
    tick() {
      const mt = this.mt, hub = this.hub;
      if (!this.on() || !this.started || mt.closed) return;
      if (mt.phase !== 'discussion' && mt.phase !== 'voting') return;
      if (mt.paused) return;
      while (hub.inflight < hub.maxInflight()) {
        const p = this.pick();
        if (!p) break;
        this.speak(p);
      }
    }
    pick() {
      const mt = this.mt, g = this.g, t = mt.t;
      let best = null, bs = 0;
      for (const id of mt.alive) {
        const p = g.players[id];
        if (!p.brain || this.talking.has(id) || !this.hub.minds.has(id)) continue;
        const since = t - (this.last[id] != null ? this.last[id] : -99);
        const w = this.want[id] || 0;
        const voteDue = mt.phase === 'voting' && mt.votes[id] === undefined && !this.aiVotes[id] && (this.voteAsks[id] || 0) < 4;
        if (since < (w >= 3 ? 2.5 : 7) && !(voteDue && since > 4)) continue;
        /* já falou e nada novo aconteceu (ninguém escreveu nada desde então): não chama de novo à toa */
        if (this.last[id] != null && !w && !voteDue) continue;
        if (this.calls >= this.maxCalls() && !voteDue) continue;
        const spoke = mt.msgs.filter((m) => m.from === id).length;
        const talk = p.brain.pers ? p.brain.pers.talk : 0.5;
        let s = w * 20 + (this.last[id] == null ? 14 : 0) + Math.min(25, since) * 0.6 + talk * 6 - spoke * 2 + (voteDue ? 18 : 0);
        if (s > bs) {
          bs = s;
          best = p;
        }
      }
      return best && bs >= 8 ? best : null;
    }
    async speak(p) {
      const mt = this.mt, g = this.g, hub = this.hub, m = hub.minds.get(p.id);
      if (!m) return;
      this.talking.add(p.id);
      this.last[p.id] = mt.t;
      this.want[p.id] = 0;
      this.calls++;
      hub.stats.meet++;
      const phase = mt.phase;
      if (phase === 'voting' && mt.votes[p.id] === undefined) this.voteAsks[p.id] = (this.voteAsks[p.id] || 0) + 1;
      const text = await hub.call(m.identity() + '\n\n' + m.rules(), m.meetPrompt(mt), 280);
      this.talking.delete(p.id);
      if (mt.closed || !p.alive) return;
      const j = parseJSON(text);
      if (!j) {
        this.fails++;
        if (!text) hub.failed();
        return;
      }
      this.fails = 0;
      hub.failStreak = 0;
      hub.stats.ok++;
      if (typeof j.notas === 'string' && tidy(j.notas, 700)) m.notes = tidy(j.notas, 700);
      const said = new Set(mt.msgs.filter((x) => x.from === p.id).map((x) => U.norm(x.text)));
      const msgs = (Array.isArray(j.mensagens) ? j.mensagens : typeof j.mensagens === 'string' ? [j.mensagens] : []).map((s) => tidy(s, 160)).filter((s) => s && !said.has(U.norm(s)) && !(AU.Voice && AU.Voice.misrule && AU.Voice.misrule(s, g.S, p))).slice(0, 2);
      let delay = 0.4;
      for (const s of msgs) {
        const typing = 0.6 + Math.min(3.5, s.length / 28);
        delay += typing;
        mt.schedule(delay, p.brain, () => {
          if (mt.closed || !p.alive) return;
          const intents = AU.Talk.parse(s, g, { self: p.id, addressed: mt.lastSpeaker });
          mt.post(p, AU.Talk.toneFilter ? AU.Talk.toneFilter(s, g.S.bots.chatTone) : s, intents, { ai: true, mind: true });
          this.aiLines++;
        }, { ttl: 40, dir: true });
      }
      /* voto: na discussão é só a intenção (vale se o tempo acabar antes de ela decidir); na votação, vale */
      const v = j.voto;
      if (typeof v === 'string' && v.trim() && mt.votes[p.id] === undefined) {
        const vn = U.norm(v).replace(/[^a-z0-9 ]/g, ' ').trim();
        let target = null;
        if (/^(pular|pulo|pula|skip|ninguem|nenhum|branco)/.test(vn)) target = 'skip';
        else {
          const q = mt.alive.map((id) => g.players[id]).find((x) => x.id !== p.id && (vn === U.norm(x.name) || vn.split(' ').includes(U.norm(x.name)) || vn.includes(U.norm(C.COLOR[x.color].name))));
          if (q) target = q.id;
        }
        if (target != null) this.intent[p.id] = target;
        if (phase === 'voting' || mt.phase === 'voting') {
          if (target != null) {
            this.aiVotes[p.id] = { target, reason: '' };
            hub.stats.votes++;
            /* o clique vem logo depois da decisão (e depois das mensagens que ela quis mandar) */
            mt.voteAt[p.id] = Math.min(mt.voteAt[p.id] != null ? mt.voteAt[p.id] : 1e9, mt.t + delay + U.rf(0.4, 1.6));
          }
        }
      }
    }
  }

  Minds.parseJSON = parseJSON;
  AU.Minds = Minds;
})();

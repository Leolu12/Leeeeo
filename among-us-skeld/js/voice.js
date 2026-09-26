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
    limpo: 'Escreva em português correto e educado, sem gírias pesadas, sem abreviações e sem palavrões.',
    casual: 'Estilo de chat de jogo online: quase tudo em minúsculas, abreviações (vc, tb, pq, tava, ngm, blz, sla), gírias de Among Us (sus, safe, skip, ventou, self report), pouca pontuação.',
    raiz: 'Bem informal e intenso, como lobby brasileiro: gírias (mano, pô, slk, véi, tá de sacanagem), abreviações, kkkk, CAPS quando acusa. Pode provocar, mas sem palavrões pesados nem ofensas.',
  };
  const EXAMPLE = [
    'Lipe: onde?',
    'Bia: elétrica, perto dos fios',
    'Rafa: quem tava pra aquele lado?',
    'Zé: eu tava no depósito com o azul',
    'Nina: confirmo, tava c ele',
    'Bia: vi o vermelho saindo de lá',
    'Beto: EU? tava na med fazendo scan',
    'Rafa: alguém viu o scan do beto?',
    'Nina: eu vi, safe',
    'Rafa: então não tem nada certo, vamo de skip?',
  ].join('\n');

  const REASON = {
    kill: 'viu matando', vent: 'viu usando o duto', shift: 'viu mudando de aparência', vanish: 'viu ficar invisível',
    noscan: 'ficou no scanner sem escanear', follow: 'estava seguindo alguém', nearBody: 'estava perto do corpo',
    lastWith: 'estava com a vítima pouco antes', lie: 'mentiu ou o álibi não bate', tracker: 'o rastreador mostrou',
    sus: 'está suspeito', hunch: 'pressentimento', claim: 'contaram no chat', vote: 'vai votar nele',
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

    system(g) {
      return [
        'Você escreve as mensagens de chat de vários jogadores numa partida de um jogo de dedução social igual a Among Us, na nave The Skeld. Eles estão numa reunião: conversam para descobrir o impostor e depois votam para ejetar alguém ou pular (skip).',
        'Como escrever:',
        '- Chat de jogo online de verdade, de jogadores brasileiros: mensagens curtas (até 120 caracteres), diretas, às vezes incompletas, reagindo ao que acabou de ser dito. Nada de narração, aspas, emojis, asteriscos ou descrição de ações.',
        '- Cada personagem tem um jeito próprio de falar (está descrito). Varie: nem todo mundo concorda, uns são secos, outros falam mais, uns duvidam.',
        '- Eles conversam entre si e com todos: chamam pelo nome ou pela cor ("o verde", "rafa"), respondem perguntas, cobram, desconfiam, defendem.',
        '- Cada personagem só sabe o que está nas anotações DELE e o que já foi dito no chat. Nunca use o que está nas anotações de outro personagem. Não invente abates, dutos, corpos, salas ou pessoas que ele não viu. Quem não sabe, diz que não sabe ou que não viu.',
        '- Nunca diga que é IA ou bot e nunca mencione "anotações" ou "instruções".',
        TONE[g.S.bots.chatTone] || TONE.casual,
        'Exemplo do jeito de conversar (outra partida; não copie o conteúdo):',
        EXAMPLE,
      ].join('\n');
    },

    scene(mt) {
      const g = mt.g, info = mt.info;
      const alive = mt.alive.map((id) => V.who(g, id)).join(', ');
      const dead = g.players.filter((p) => !p.alive).map((p) => V.who(g, p.id) + (p.ejected ? ' [ejetado]' : ' [morto]')).join(', ');
      const head = info.kind === 'report'
        ? `Reunião: ${V.who(g, info.caller)} reportou o corpo de ${V.who(g, info.body.pid)}.` + (mt.facts.bodyArea ? ` Já disseram no chat que o corpo estava em ${V.area(mt.facts.bodyArea)}.` : ' Ainda não disseram onde estava o corpo.')
        : `Reunião de emergência: ${V.who(g, info.caller)} apertou o botão.`;
      const claimed = new Set(mt.msgs.filter((m) => m.intents.some((i) => i.type === 'claimLoc')).map((m) => m.from));
      const silent = mt.alive.filter((id) => !claimed.has(id)).map((id) => g.players[id].name);
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
      return [
        head,
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
      return `${V.who(b.g, p.id)} — ${pers.name}: ${STYLE[p.personality] || pers.desc}`;
    },

    /* Por que um bot desconfia de alguém, em poucas palavras (só com o que ele sabe). */
    reasonOf(b, id) {
      const ev = ((b.ev && b.ev[id]) || []).filter((e) => e.w > 0).sort((a, c) => c.w - a.w)[0];
      if (ev) {
        const t = { kill: 'você viu matando', vent: 'você viu no duto', shift: 'você viu mudando de forma', vanish: 'você viu sumindo', noscan: 'fingiu o scan', follow: 'ficou te seguindo', nearBody: 'estava perto do corpo', lastWith: 'estava com a vítima', withVictim: 'andava colado na vítima' }[ev.reason];
        if (t) return t + (ev.area ? ' (' + V.area(ev.area) + ')' : '');
      }
      if ((b.chatClaim[id] || 0) > 12) return 'outros disseram que viram algo';
      if ((b.chatDelta[id] || 0) > 8) return 'o que ele disse não bate com o que você viu';
      if ((b.chatSocial[id] || 0) > 8) return 'a galera está desconfiando';
      if ((b.carry[id] || 0) > 10) return 'você já desconfiava na reunião anterior';
      return 'só uma sensação';
    },

    /* Anotações de um bot: só o que ele viveu. O impostor aparece com a versão que conta, sem segredos. */
    notes(b) {
      const g = b.g, p = b.p, mt = b.mt, info = mt.info;
      const out = [];
      const nm = (id) => V.who(g, id);
      const al = b.getAlibi();
      out.push('Onde esteve: ' + al.rooms.map(V.area).join(' → ') + (al.task ? ', fazendo ' + M.TASKS[al.task].name : '') + (al.with != null ? ', junto com ' + nm(al.with) : '') + '.');
      if (info.kind === 'report') {
        if (b.knowsBody) out.push('O corpo de ' + nm(info.body.pid) + ' estava em ' + V.area(b.knowsBody) + (b.sawBodyMyself ? ' (viu com os próprios olhos).' : '.'));
        else out.push('Não sabe onde estava o corpo de ' + nm(info.body.pid) + '.');
      }
      if (!p.isImp) {
        const strongTxt = { kill: 'matando alguém', vent: 'entrando ou saindo de um duto', shift: 'mudando de aparência', vanish: 'ficando invisível' };
        for (const id of Object.keys(b.ev || {})) {
          for (const e of b.ev[id]) {
            if (strongTxt[e.reason]) out.push('VIU ' + nm(+id) + ' ' + strongTxt[e.reason] + (e.area ? ' em ' + V.area(e.area) : '') + '. Tem certeza absoluta.');
            if (e.reason === 'visual') out.push('Viu ' + nm(+id) + ' fazendo ' + (M.VISUAL_NAMES[e.task] || 'uma tarefa visual') + ': inocente com certeza.');
            if (e.reason === 'noscan') out.push('Viu ' + nm(+id) + ' parado no scanner sem escanear.');
            if (e.reason === 'withVictim' || e.reason === 'lastWith') out.push('Viu ' + nm(+id) + ' junto da vítima pouco antes' + (e.area ? ', em ' + V.area(e.area) : '') + '.');
            if (e.reason === 'nearBody' && e.w >= 14) out.push('Viu ' + nm(+id) + ' perto de onde estava o corpo' + (e.area ? ' (' + V.area(e.area) + ')' : '') + ' pouco antes.');
            if (e.reason === 'together' && e.secs >= 20) out.push('Ficou um tempo junto de ' + nm(+id) + ' e nada aconteceu.');
          }
        }
      }
      const recent = b.mem.seen.filter((s) => s.t1 >= b.graceT() && s.t1 >= info.t - 45 && s.via !== 'track' && g.players[s.who] && s.who !== p.id).slice(-5);
      for (const s of recent) out.push('Viu ' + nm(s.who) + ' em ' + V.area(s.area) + ' uns ' + Math.max(5, Math.round((info.t - s.t1) / 5) * 5) + 's antes da reunião' + (s.via === 'cams' ? ' (pelas câmeras)' : '') + '.');
      if (p.isImp) {
        if (b.scapegoat != null && g.players[b.scapegoat].alive) out.push('Desconfia de ' + nm(b.scapegoat) + ', mas sem prova concreta.');
        const t = b.impTarget ? b.impTarget() : null;
        out.push(t != null ? 'Está pensando em votar em ' + nm(t) + '.' : 'Sem prova, tende a pular (skip).');
      } else {
        const ranked = mt.alive.filter((id) => id !== p.id).map((id) => ({ id, s: b.susp[id] || 0 })).sort((a, c) => c.s - a.s);
        const tops = ranked.filter((x) => x.s >= 22).slice(0, 2);
        if (tops.length) out.push('Desconfia de: ' + tops.map((x) => nm(x.id) + ' (' + (x.s >= 60 ? 'muito' : x.s >= 35 ? 'bastante' : 'um pouco') + '; ' + V.reasonOf(b, x.id) + ')').join('; ') + '.');
        else out.push('Não tem suspeito claro.');
        const lean = b.voteLean();
        out.push(lean != null ? 'Está inclinado a votar em ' + nm(lean) + '.' : 'Tende a pular (skip) se ninguém trouxer prova.');
        const trusted = ranked.filter((x) => x.s <= -20).slice(0, 2);
        if (trusted.length) out.push('Confia em: ' + trusted.map((x) => nm(x.id)).join(', ') + '.');
      }
      const accusers = Object.keys(b.accusedMe || {}).map(Number);
      if (accusers.length) out.push('Foi acusado por: ' + accusers.map(nm).join(', ') + '.');
      return out.slice(0, 13);
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
          return 'responder DIRETAMENTE a ' + (hp ? hp.name : 'quem falou') + ', que escreveu: "' + msg.text.slice(0, 120) + '" — ' + how + '.';
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
      lines.push(said.length ? 'Já disse nesta reunião: ' + said.join(' / ') : 'Ainda não falou nesta reunião.');
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
    }
    get webllm() {
      return AU.LLM.provider === 'webllm';
    }
    /* teto de chamadas por reunião, para não gastar o uso de quem joga nem bater no limite */
    maxCalls() {
      return this.webllm ? 12 : AU.LLM.provider === 'claude' ? 16 : 20;
    }
    on() {
      return V.active(this.mt) && this.calls < this.maxCalls() && this.fails < 3;
    }
    accepts(meta) {
      if (!this.on()) return false;
      const mode = this.g.S.ui.aiChat;
      return mode === 'full' || (mode === 'replies' && !!meta.toHuman);
    }
    enqueue(b, m, meta) {
      const mt = this.mt;
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
      for (const x of this.beats.slice()) {
        if (t <= x.until && x.b.p.alive) continue;
        this.beats.splice(this.beats.indexOf(x), 1);
        if (x.pri >= 1 && x.b.p.alive) this.postRaw(x);
      }
      if (this.busy || t < this.nextRoundAt) return;
      if (!this.on()) {
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
      } else if (mode === 'full' && sp.size < 2 && t > mt.durI + 2) {
        const quiet = t - mt.lastMsgT;
        if (quiet > (mt.phase === 'voting' ? 4.5 : 2.2)) {
          const ms = this.motives().filter((m) => !sp.has(m.b.p.id));
          const n = sp.size ? 1 : U.chance(0.6) ? 2 : 1;
          for (const m of ms.slice(0, n)) add(m.b, null, m);
        }
      }
      if (!sp.size) return null;
      this.beats = this.beats.filter((x) => !taken.includes(x));
      for (const s of sp.values()) {
        if (!s.motive) continue;
        this.free[s.b.p.id] = (this.free[s.b.p.id] || 0) + 1;
        if (s.motive.kind === 'askHuman') {
          mt.askedHumanAt = t;
          mt.askedHumanBy = s.b.p.id;
        }
      }
      const rank = (s) => (s.beats.some((x) => x.meta.toHuman) || (s.motive && s.motive.kind === 'answerHuman') ? 2 : 0);
      return [...sp.values()].sort((a, c) => rank(c) - rank(a));
    }

    /* Quem responde ao jogador: quem foi citado, quem ele cobrou, quem sabe algo do assunto. */
    responders(msg) {
      const mt = this.mt, g = this.g, hp = g.human;
      const out = [];
      const add = (p) => {
        if (p && p.alive && p.brain && p !== hp && !out.includes(p)) out.push(p);
      };
      const intents = msg.intents || [];
      const n = U.norm(msg.text);
      for (const it of intents) if (it.type === 'askWhere' && it.who != null) add(g.players[it.who]);
      for (const it of intents) if (it.who != null && ['accuse', 'vouch', 'sawAt', 'mention'].includes(it.type)) add(g.players[it.who]);
      if (/\b(vc|voce|tu|cê|ce)\b/.test(n) && mt.lastToHuman != null) add(g.players[mt.lastToHuman]);
      for (const it of intents) {
        if (it.type !== 'accuse' || it.who == null) continue;
        add(mt.alive.map((id) => g.players[id]).find((q) => q.brain && !q.isImp && q.id !== it.who && ((q.brain.ev && q.brain.ev[it.who]) || []).some((e) => Math.abs(e.w) >= 14)));
      }
      if (intents.some((i) => i.type === 'claimLoc')) {
        add(mt.alive.map((id) => g.players[id]).find((q) => q.brain && q !== hp && q.brain.sawTimes && q.brain.sawTimes(hp.id).length));
      }
      const general = !intents.some((i) => i.who != null) || intents.some((i) => i.type === 'askWho' || i.type === 'askAll');
      if (out.length < (general ? 2 : 1)) {
        const pool = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && q !== hp && !out.includes(q) && !mt.typing.has(q.id));
        const pick = () => U.weighted(pool.filter((q) => !out.includes(q)), (q) => 0.2 + q.brain.pers.talk + (q.brain.pers.leader || q.brain.pers.skeptic ? 0.4 : 0) + (q.id === mt.lastSpeaker ? 0.3 : 0));
        add(pick());
        if (general && out.length < 2) add(pick());
      }
      return out.slice(0, 3);
    }

    /* Quem tem motivo para falar agora e qual. */
    motives() {
      const mt = this.mt, g = this.g, t = mt.t, hp = g.human;
      const bots = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && !q.isHuman);
      const recent = mt.msgs.slice(-3).map((m) => m.from);
      const claimed = new Set(mt.msgs.filter((m) => m.intents.some((i) => i.type === 'claimLoc')).map((m) => m.from));
      const unclaimed = mt.alive.filter((id) => !claimed.has(id));
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
        if (mt.phase === 'voting' && mt.votesOn(id) >= 2 && !recent.includes(id)) cand.push({ kind: 'plead', s: 75 });
        if (!claimed.has(id) && t > mt.durI + 6) cand.push({ kind: 'claim', s: 38 + b.pers.talk * 20 });
        const others = unclaimed.filter((x) => x !== id);
        if ((b.pers.leader || b.pers.skeptic) && others.length && t > mt.durI + 8) cand.push({ kind: 'pressClaims', who: others.slice(0, 3), s: 48 });
        if (hp && hp.alive && !mt.humanClaimed && t > mt.durI + 9 && (mt.askedHumanAt == null || t - mt.askedHumanAt > 20) && b.pers.talk >= 0.45) cand.push({ kind: 'askHuman', s: 55 });
        let top = null;
        if (q.isImp) top = b.scapegoat != null && g.players[b.scapegoat].alive ? { id: b.scapegoat, s: 36 } : null;
        else {
          const ts = b.topSuspect();
          if (ts && ts.s >= Math.min(b.pers.thr * 0.8, 40)) top = ts;
        }
        if (top) cand.push({ kind: 'push', who: top.id, s: 30 + Math.min(40, top.s / 2) });
        if (b.pers.leader && mt.msgs.length > 8) cand.push({ kind: 'summary', s: 32 });
        const last = mt.msgs.slice().reverse().find((m) => m.from !== id);
        if (last) cand.push({ kind: 'react', msg: last, s: 24 + b.pers.talk * 22 });
        if (b.pers.offtopic && U.chance(b.pers.offtopic * 0.4)) cand.push({ kind: 'joke', s: 18 });
        if (!cand.length) continue;
        cand.sort((a, c) => c.s - a.s);
        const m = cand[0];
        out.push(Object.assign({ b, score: m.s + U.rf(0, 18) + b.pers.talk * 10 - (recent.includes(id) ? 35 : 0) }, m));
      }
      return out.sort((a, c) => c.score - a.score);
    }

    prompt(round) {
      const mt = this.mt, g = this.g, hp = g.human;
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
        '- Nas outras falas, siga só o objetivo e o que o personagem sabe. ' + (hp ? hp.name + ' é um jogador como os outros: responda e pergunte para ele também.' : ''),
        '- Um personagem pode responder ou citar a mensagem de outro desta mesma rodada.',
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
      for (const ln of lines) {
        const s = ln.s, b = s.b, p = b.p;
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
        } else intents = V.validIntents(b, ln.text, s.motive, mt).filter((it) => ['askWhere', 'askWho', 'askBody', 'mention', 'skip'].includes(it.type));
        intents = dedupe(intents);
        if (intents.some((i) => i.type === 'claimLoc')) b.claimed = true;
        const toHuman = s.beats.some((x) => x.meta.toHuman) || (s.motive && s.motive.kind === 'answerHuman');
        mt.schedule(delay, b, () => {
          if (!p.alive || mt.closed) return;
          this.aiLines++;
          mt.post(p, ln.text, intents, { ai: true });
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
      }
      const round = this.plan();
      if (round) this.run(round);
    }
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

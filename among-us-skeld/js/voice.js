/* Voz dos bots com IA nas reuniões. O motor de regras continua decidindo O QUE cada bot sabe,
   suspeita e vota; a IA escreve COMO ele fala e responde ao que o jogador digita.
   Cada bot recebe só as próprias anotações: nada de papéis alheios nem fatos que ele não viu. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, T = AU.Talk;

  const STYLE = {
    analitico: 'cita salas e tempos, raciocina com lógica, pede dados concretos',
    impulsivo: 'acusa rápido, é emotivo, às vezes escreve em CAPS',
    falador: 'fala bastante, faz perguntas, conta detalhes e às vezes foge do assunto',
    silencioso: 'responde curtíssimo, só o essencial, poucas palavras',
    caotico: 'zoeiro, faz piada, usa kkkk, às vezes acusa por brincadeira',
    lider: 'organiza a conversa, pede para cada um falar, propõe em quem votar ou pular',
    defensor: 'pede provas e defende quem é acusado sem evidência',
    cetico: 'desconfia dos álibis, pergunta "quem confirma?", não aceita nada fácil',
    seguidor: 'concorda com a maioria, "+1", "faz sentido", segue quem parece saber',
    inexperiente: 'meio perdido, confunde coisas, pergunta o básico, fala com insegurança',
  };
  const TONE = {
    limpo: 'Escreva em português correto e educado, sem gírias pesadas, sem abreviações e sem palavrões.',
    casual: 'Estilo de chat de jogo online: quase tudo em minúsculas, abreviações (vc, tb, pq, tava, ngm, blz), gírias de Among Us (sus, safe, skip, ventou), pouca pontuação.',
    raiz: 'Bem informal e intenso, como lobby brasileiro: gírias (mano, pô, slk, véi), abreviações, kkkk, CAPS quando acusa. Pode provocar, mas sem palavrões pesados nem ofensas.',
  };

  const V = {
    active(mt) {
      const g = mt.g;
      return !g.headless && g.S.ui.aiChat !== 'off' && AU.LLM.ready();
    },

    who(g, id) {
      const p = g.players[id];
      return p ? `${p.name} (${C.COLOR[p.color].name})` : 'alguém';
    },

    system(g) {
      return [
        'Você escreve mensagens de chat para personagens de um jogo de dedução social parecido com Among Us, na nave The Skeld.',
        'Tripulantes fazem tarefas e tentam descobrir os impostores; impostores matam escondidos, usam dutos e mentem. Nas reuniões todos conversam e depois votam para ejetar alguém ou pular (skip).',
        'Escreva como jogadores brasileiros de verdade num chat: mensagens curtas (no máximo 110 caracteres), sem emojis, sem aspas, sem narração, sem descrever ações entre asteriscos. Nunca diga que é uma IA ou um bot.',
        'Cada personagem só sabe o que está nas próprias anotações e o que foi dito no chat. Não invente abates, dutos, salas ou tarefas que não estejam nas anotações; pode opinar, duvidar, perguntar, concordar, brincar ou dizer que não sabe.',
        TONE[g.S.bots.chatTone] || TONE.casual,
      ].join('\n');
    },

    scene(mt) {
      const g = mt.g, info = mt.info;
      const alive = mt.alive.map((id) => V.who(g, id)).join(', ');
      const dead = g.players.filter((p) => !p.alive).map((p) => V.who(g, p.id) + (p.ejected ? ' [ejetado]' : ' [morto]')).join(', ');
      const head = info.kind === 'report'
        ? `Reunião: ${V.who(g, info.caller)} reportou o corpo de ${V.who(g, info.body.pid)}.` + (mt.facts.bodyArea ? ` Já disseram no chat que o corpo estava em ${M.AREA[mt.facts.bodyArea].name}.` : '')
        : `Reunião de emergência: ${V.who(g, info.caller)} apertou o botão.`;
      return `${head}\nVivos: ${alive}.` + (dead ? `\nFora do jogo: ${dead}.` : '') + `\nImpostores restantes (se confirmado): ${g.S.rules.confirmEjects ? mt.impostorsLeft : 'desconhecido'}.`;
    },

    transcript(mt, n) {
      const g = mt.g;
      return mt.msgs.slice(-(n || 16)).map((m) => `${V.who(g, m.from)}: ${m.text}`).join('\n') || '(ninguém falou ainda)';
    },

    persona(b) {
      const g = b.g, p = b.p;
      const pers = C.PERSONALITIES[p.personality] || C.PERSONALITIES.analitico;
      return `${V.who(g, p.id)} — ${pers.name}: ${STYLE[p.personality] || pers.desc}`;
    },

    /* Anotações privadas de um bot, derivadas só da memória dele. */
    notes(b) {
      const g = b.g, p = b.p, mt = b.mt;
      const out = [];
      const nm = (id) => V.who(g, id);
      const area = (a) => (M.AREA[a] ? M.AREA[a].name : a);
      const rooms = b.myRooms();
      const task = b.myTask(rooms);
      if (p.isImp) {
        const partners = g.players.filter((q) => q.isImp && q !== p && q.alive);
        out.push('SEGREDO (nunca revele nem dê pistas disso): você é um dos impostores' + (partners.length ? '; seu parceiro é ' + partners.map((q) => nm(q.id)).join(' e ') + ' — defenda-o com discrição, sem ser óbvio' : '') + '.');
        out.push('Seu álibi, a versão que você sustenta: esteve em ' + rooms.map(area).join(' → ') + (task ? ' fazendo ' + M.TASKS[task].name : '') + '.');
        if (b.scapegoat != null && g.players[b.scapegoat].alive) out.push('Você quer que suspeitem de ' + nm(b.scapegoat) + (b.scapegoatReal ? ' (você realmente viu essa pessoa perto do corpo).' : ' (não tem prova real; seja sutil).'));
        const tgt = b.impTarget ? b.impTarget() : null;
        out.push(tgt != null ? 'Você pretende votar em ' + nm(tgt) + '.' : 'Você pretende pular (skip) se ninguém for muito acusado.');
      } else {
        out.push('Onde você esteve (verdade): ' + rooms.map(area).join(' → ') + (task ? ', fazendo ' + M.TASKS[task].name : '') + '.');
      }
      const info = mt.info;
      if (info.kind === 'report') {
        if (b.knowsBody) out.push('O corpo de ' + nm(info.body.pid) + ' estava em ' + area(b.knowsBody) + (b.sawBodyMyself ? ' (você viu).' : '.'));
        else out.push(nm(info.body.pid) + ' morreu; você não sabe onde estava o corpo.');
      }
      if (!p.isImp) {
        const strongTxt = { kill: 'matando alguém', vent: 'entrando ou saindo de um duto', shift: 'mudando de aparência', vanish: 'ficando invisível' };
        for (const id of Object.keys(b.ev || {})) {
          for (const e of b.ev[id]) {
            if (strongTxt[e.reason]) out.push('Você VIU ' + nm(+id) + ' ' + strongTxt[e.reason] + (e.area ? ' em ' + area(e.area) : '') + '. Tem certeza.');
            if (e.reason === 'visual') out.push('Você viu ' + nm(+id) + ' fazendo ' + (M.VISUAL_NAMES[e.task] || 'uma tarefa visual') + ': é inocente com certeza.');
            if (e.reason === 'noscan') out.push('Você viu ' + nm(+id) + ' parado no scanner sem escanear (suspeito).');
            if (e.reason === 'withVictim' || e.reason === 'lastWith') out.push('Você viu ' + nm(+id) + ' junto da vítima pouco antes' + (e.area ? ', em ' + area(e.area) : '') + '.');
            if (e.reason === 'nearBody' && e.w >= 14) out.push('Você viu ' + nm(+id) + ' perto do local do corpo' + (e.area ? ' (' + area(e.area) + ')' : '') + ' pouco antes.');
            if (e.reason === 'together' || e.reason === 'spared') out.push('Você ficou um tempo junto de ' + nm(+id) + ' e nada aconteceu.');
          }
        }
      }
      const recent = b.mem.seen.filter((s) => s.t1 >= b.graceT() && s.t1 >= info.t - 45 && s.via !== 'track' && g.players[s.who] && s.who !== p.id).slice(-5);
      for (const s of recent) out.push('Viu ' + nm(s.who) + ' em ' + area(s.area) + ' uns ' + Math.max(5, Math.round((info.t - s.t1) / 5) * 5) + 's antes da reunião' + (s.via === 'cams' ? ' (pelas câmeras)' : '') + '.');
      if (!p.isImp) {
        const top = b.topSuspect();
        if (top && top.s >= Math.min(35, b.pers.thr * 0.8)) out.push('Seu principal suspeito agora: ' + nm(top.id) + ' (pontuação ' + Math.round(top.s) + ').');
        else out.push('Você não tem suspeito claro; tende a pular (skip).');
        const trusted = mt.alive.filter((id) => id !== p.id && (b.susp[id] || 0) <= -20).slice(0, 2);
        if (trusted.length) out.push('Você confia em: ' + trusted.map(nm).join(', ') + '.');
      }
      const accusers = Object.keys(b.accusedMe || {}).map(Number);
      if (accusers.length) out.push('Acusaram você: ' + accusers.map(nm).join(', ') + '.');
      return out.slice(0, 12);
    },

    block(b) {
      return '### ' + V.persona(b) + '\n' + V.notes(b).map((l) => '- ' + l).join('\n');
    },

    /* Lê "Nome: texto" por personagem esperado. */
    parseLines(text, bots) {
      const out = {};
      const lines = String(text || '').split(/\n+/);
      for (const raw of lines) {
        const line = raw.replace(/^[\s*\-•>#]+/, '').replace(/\*\*/g, '').trim();
        for (const b of bots) {
          if (out[b.p.id]) continue;
          const nm = b.p.name;
          const col = C.COLOR[b.p.color].name;
          const re = new RegExp('^(' + escapeRe(nm) + ')(\\s*\\(' + escapeRe(col) + '\\))?\\s*[:\\-–—]\\s*(.+)$', 'i');
          const m = line.match(re);
          if (m) out[b.p.id] = tidy(m[3]);
        }
      }
      if (bots.length === 1 && !out[bots[0].p.id]) {
        const only = lines.map((l) => l.trim()).filter(Boolean)[0];
        if (only) out[bots[0].p.id] = tidy(only.replace(/^[^:]{1,24}:\s*/, ''));
      }
      return out;
    },

    /* ---------- falas de abertura: a IA reescreve o que o motor planejou ---------- */
    async opening(mt) {
      if (!V.active(mt)) return;
      const g = mt.g;
      const items = [];
      for (const id of mt.alive) {
        const p = g.players[id];
        if (!p.brain || !p.brain.queue) continue;
        for (const it of p.brain.queue) if (it.pre && it.pre.text) items.push({ b: p.brain, it });
      }
      if (!items.length) return;
      const bots = [...new Set(items.map((x) => x.b))];
      const prompt = [
        V.scene(mt),
        '',
        'Personagens (estilo de cada um):',
        bots.map((b) => '- ' + V.persona(b)).join('\n'),
        '',
        'Abaixo estão as primeiras falas planejadas de cada um nesta reunião. Reescreva cada fala como uma mensagem de chat natural no estilo de quem fala, mantendo exatamente o mesmo sentido e os mesmos fatos (nomes, cores, salas, acusações e defesas). Não invente fatos, não junte falas e não mude quem fala.',
        items.map((x, i) => `[${i + 1}] ${x.b.p.name}: ${x.it.pre.text}`).join('\n'),
        '',
        'Responda uma linha por fala, no formato: [número] mensagem',
      ].join('\n');
      mt.holdUntil = mt.durI + 7;
      const text = await AU.LLM.complete(V.system(g), prompt, { maxTokens: 60 + items.length * 45 });
      mt.holdUntil = 0;
      if (!text || mt.closed) return;
      for (const raw of text.split(/\n+/)) {
        const m = raw.trim().match(/^\[?(\d+)\]?[\s.):\-–—]*(.+)$/);
        if (!m) continue;
        const x = items[+m[1] - 1];
        if (!x || x.it.posted) continue;
        let t = m[2].trim();
        t = t.replace(new RegExp('^' + escapeRe(x.b.p.name) + '\\s*[:\\-–—]\\s*', 'i'), '');
        t = tidy(t);
        if (t.length >= 2) x.it.pre.text = t;
      }
      mt.aiUsed = true;
    },

    /* ---------- quem responde ao jogador ---------- */
    pickResponders(mt, text, intents) {
      const g = mt.g, hp = g.human;
      const out = [];
      const add = (p) => {
        if (p && p.alive && p.brain && p !== hp && !out.includes(p)) out.push(p);
      };
      const n = U.norm(text);
      for (const it of intents) if (it.type === 'askWhere' && it.who != null) add(g.players[it.who]);
      if (/\b(vc|voce|tu)\b/.test(n) && mt.lastToHuman != null) add(g.players[mt.lastToHuman]);
      for (const it of intents) if (it.who != null && ['accuse', 'vouch', 'sawAt', 'mention'].includes(it.type)) add(g.players[it.who]);
      for (const it of intents) {
        if (it.type !== 'accuse' || it.who == null) continue;
        const w = mt.alive.map((id) => g.players[id]).find((q) => q.brain && !q.isImp && q.id !== it.who && ((q.brain.ev && q.brain.ev[it.who]) || []).some((e) => e.w >= 14 || e.w <= -20));
        add(w);
      }
      if (out.length < 2) {
        const pool = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && q !== hp && !out.includes(q));
        const extra = U.weighted(pool, (q) => 0.2 + q.brain.pers.talk + (q.brain.pers.leader || q.brain.pers.skeptic ? 0.4 : 0) + (q.id === mt.lastSpeaker ? 0.3 : 0));
        add(extra);
        if (out.length < 2 && U.chance(0.45)) add(U.weighted(pool.filter((q) => !out.includes(q)), (q) => 0.2 + q.brain.pers.talk));
      }
      let res = out.slice(0, 3);
      const imps = res.filter((q) => q.isImp);
      if (imps.length > 1) res = res.filter((q) => !q.isImp || q === imps[0]);
      return res;
    },

    /* ---------- respostas ao que o jogador digitou ---------- */
    async reply(mt, msg, responders) {
      const g = mt.g, hp = g.human;
      if (!responders.length) return;
      const crew = responders.filter((q) => !q.isImp);
      const imps = responders.filter((q) => q.isImp);
      const groups = [];
      if (crew.length) groups.push(crew);
      imps.forEach((q) => groups.push([q]));
      responders.forEach((q) => mt.typing.add(q.id));
      if (mt.ui) mt.ui.renderTyping();
      await Promise.all(groups.map((grp) => V.replyGroup(mt, msg, grp)));
      responders.forEach((q) => mt.typing.delete(q.id));
      if (mt.ui) mt.ui.renderTyping();
      void hp;
    },

    async replyGroup(mt, msg, grp) {
      const g = mt.g, hp = g.human;
      const bots = grp.map((q) => q.brain);
      const prompt = [
        V.scene(mt),
        '',
        'Chat da reunião até agora (mais recente por último):',
        V.transcript(mt, 18),
        '',
        `${V.who(g, hp.id)} acabou de escrever: ${msg.text}`,
        '',
        'Quem responde agora (cada um só sabe o que está nas próprias anotações):',
        bots.map(V.block).join('\n\n'),
        '',
        `Escreva UMA mensagem de chat para cada personagem acima, respondendo diretamente ao que ${hp.name} escreveu, levando em conta a conversa. Cada um no próprio estilo, no máximo 110 caracteres. Não repita frases já ditas. Se perguntarem algo que o personagem não sabe, ele diz que não sabe.`,
        'Formato, uma linha por personagem:',
        bots.map((b) => `${b.p.name}: mensagem`).join('\n'),
      ].join('\n');
      const text = await AU.LLM.complete(V.system(g), prompt, { maxTokens: 70 + bots.length * 60 });
      if (!text || mt.closed) return;
      const lines = V.parseLines(text, bots);
      let delay = 0.2;
      for (const b of bots) {
        const t = lines[b.p.id];
        if (!t) continue;
        const p = b.p;
        mt.schedule(delay, b, () => {
          if (!p.alive || mt.closed) return;
          mt.post(p, t, T.parse(t, g, { self: p.id, addressed: hp.id }), { ai: true });
        }, { ttl: 20, force: true });
        delay += U.rf(1.2, 2.6) * mt.pace;
      }
      mt.aiUsed = true;
    },

    /* ---------- conversa extra entre bots (poucas vezes por reunião) ---------- */
    async followup(mt) {
      const g = mt.g;
      if (!V.active(mt) || g.S.ui.aiChat !== 'full' || mt.followups >= 2 || mt.aiBusy) return;
      const pool = mt.alive.map((id) => g.players[id]).filter((q) => q.brain && !q.isHuman);
      if (!pool.length) return;
      const recentSpeakers = new Set(mt.msgs.slice(-4).map((m) => m.from));
      const scored = pool.map((q) => {
        const b = q.brain;
        const top = !q.isImp ? b.topSuspect() : null;
        return { q, s: (top ? top.s : 20) + b.pers.talk * 25 - (recentSpeakers.has(q.id) ? 30 : 0) + U.rf(0, 15) };
      }).sort((a, b) => b.s - a.s);
      const first = scored[0].q;
      const grp = [first];
      if (!first.isImp) {
        const second = scored.slice(1).find((x) => !x.q.isImp);
        if (second) grp.push(second.q);
      }
      mt.followups++;
      mt.aiBusy = true;
      grp.forEach((q) => mt.typing.add(q.id));
      if (mt.ui) mt.ui.renderTyping();
      const bots = grp.map((q) => q.brain);
      const prompt = [
        V.scene(mt),
        '',
        'Chat da reunião até agora (mais recente por último):',
        V.transcript(mt, 18),
        '',
        'Quem fala agora (cada um só sabe o que está nas próprias anotações):',
        bots.map(V.block).join('\n\n'),
        '',
        'Continue a discussão: cada personagem acima escreve UMA mensagem reagindo ao que já foi dito — confirmar ou contestar um álibi com base nas próprias anotações, cobrar alguém que está quieto, fazer uma pergunta, propor em quem votar ou sugerir pular. No máximo 110 caracteres, sem repetir o que já foi dito.',
        'Formato, uma linha por personagem:',
        bots.map((b) => `${b.p.name}: mensagem`).join('\n'),
      ].join('\n');
      const text = await AU.LLM.complete(V.system(g), prompt, { maxTokens: 70 + bots.length * 60 });
      grp.forEach((q) => mt.typing.delete(q.id));
      mt.aiBusy = false;
      if (mt.ui) mt.ui.renderTyping();
      if (!text || mt.closed) return;
      const lines = V.parseLines(text, bots);
      let delay = 0.3;
      for (const b of bots) {
        const t = lines[b.p.id];
        if (!t) continue;
        const p = b.p;
        mt.schedule(delay, b, () => {
          if (!p.alive || mt.closed) return;
          mt.post(p, t, T.parse(t, g, { self: p.id, addressed: g.human ? g.human.id : null }), { ai: true });
        }, { ttl: 20 });
        delay += U.rf(1.5, 3) * mt.pace;
      }
    },
  };

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

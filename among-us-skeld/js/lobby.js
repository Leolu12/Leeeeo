/* Chat do lobby: antes da partida os bots se cumprimentam, comentam as regras escolhidas, combinam coisas e
   respondem ao que você escreve (pela IA quando ela está ligada; sem IA, com frases próprias). */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C;

  const GREET = ['oi', 'eai', 'salve galera', 'opa', 'olá pessoal', 'fala', 'oi oi', 'boa noite, gente'];
  const BANTER = [
    'alguém faz as tasks comigo?', 'se eu for imp já peço desculpa', 'não matem no café pfv', 'sem self report hein',
    'eu sempre sou o primeiro a morrer', 'ninguém vai pra elétrica sozinho', 'boa sorte a todos', 'bora bora',
    'vou direto fazer minhas tasks', 'quem morrer primeiro fica de fantasma kkk', 'hoje eu pego o impostor',
    'se chamar reunião sem motivo eu voto em quem chamou kkk', 'confia em mim', 'vou ficar de olho em todo mundo',
  ];
  const REPLY = {
    hello: ['oi, {h}', 'eai {h}', 'salve', 'opa, bem-vindo', 'oi oi'],
    go: ['bora', 'vamo', 'só esperando começar kkk', 'bora que eu tô pronto'],
    imp: ['saberemos kkk', 'não sou eu, confia', 'eu nem sei ainda kkk', 'o impostor é sempre quem pergunta', 'vai descobrir na hora'],
    named: ['oi?', 'fala, {h}', 'eu?', 'que foi, {h}?', 'tô aqui'],
    tip: ['faz o scan na frente de alguém que ajuda', 'anda em dupla que é mais seguro', 'olha as câmeras quando terminar as tasks'],
    generic: ['kkk', 'verdade', 'boa', 'pode crer', 'haha', 'é isso', 'justo', 'tmj'],
  };

  class LobbyChat {
    constructor(roster, S) {
      this.roster = roster;
      this.S = S;
      this.msgs = [];
      this.used = new Set();
      this.timer = null;
      this.aiBusy = false;
      this.aiCalls = 0;
      this.onMsg = null;
      this.idle = 0;
      this.stopped = false;
    }
    bots() {
      return this.roster.filter((r) => !r.isHuman);
    }
    human() {
      return this.roster.find((r) => r.isHuman);
    }
    /* frases sobre as regras que foram escolhidas */
    settingsLines() {
      const S = this.S, R = S.rules, out = [];
      out.push(R.visualTasks ? 'visual ligado, bom' : 'sem tarefa visual? vai ser tenso');
      out.push(S.room.impostors + (S.room.impostors > 1 ? ' impostores' : ' impostor') + ' com ' + S.room.players + '... ' + (S.room.impostors >= 3 ? 'vai ser difícil' : 'justo'));
      if (!R.confirmEjects) out.push('sem confirmar ejeção, cuidado no voto');
      if (R.anonymousVotes) out.push('voto anônimo, ninguém vai saber quem votou em quem');
      if (R.killCooldown <= 20) out.push('cooldown baixo, vai ser rápido');
      if (R.crewVision < 1) out.push('visão curta... medo');
      const roles = C.ROLE_IDS.filter((id) => (S.roles[id] || {}).n > 0);
      if (roles.length) {
        const r = C.ROLES[U.pick(roles)].name.toLowerCase();
        out.push('tem ' + r + ' nessa, fiquem espertos');
        if (roles.includes('engenheiro')) out.push('se me virem no duto é porque sou engenheiro kkk');
        if (roles.includes('metamorfo')) out.push('cuidado com o metamorfo, não confiem só na cor');
      }
      return out;
    }
    pick(list, vars) {
      const fill = (s) => s.replace(/\{h\}/g, (vars && vars.h) || '');
      const fresh = list.filter((s) => !this.used.has(fill(s)));
      const s = fill(U.pick(fresh.length ? fresh : list));
      this.used.add(s);
      return s;
    }
    styled(r, text) {
      return AU.Talk && AU.Talk.style ? AU.Talk.style(text, { S: this.S }, { pers: C.PERSONALITIES[r.personality] || C.PERSONALITIES.analitico }) : text;
    }
    post(r, text) {
      if (this.stopped || !text) return;
      const m = { from: r, text };
      this.msgs.push(m);
      if (this.msgs.length > 60) this.msgs.shift();
      if (this.onMsg) this.onMsg(m);
    }
    /* começa a conversa: cumprimentos, comentários das regras, combinações; depois vai rareando */
    start(onMsg) {
      this.onMsg = onMsg;
      if (this.started) return;
      this.started = true;
      const bots = U.shuffle(this.bots());
      const plan = [];
      bots.slice(0, 3).forEach((b, i) => plan.push({ at: 0.8 + i * U.rf(0.9, 1.6), who: b, text: () => this.pick(GREET) }));
      const sl = U.shuffle(this.settingsLines()).slice(0, 2);
      sl.forEach((t, i) => plan.push({ at: 4.5 + i * U.rf(2, 3.5), who: U.pick(bots), text: () => t }));
      plan.sort((a, b) => a.at - b.at);
      this.queue = plan;
      this.t0 = performance.now();
      this.loop();
    }
    loop() {
      clearTimeout(this.timer);
      if (this.stopped) return;
      const now = (performance.now() - this.t0) / 1000;
      while (this.queue.length && this.queue[0].at <= now) {
        const it = this.queue.shift();
        this.post(it.who, this.styled(it.who, typeof it.text === 'function' ? it.text() : it.text));
      }
      if (!this.queue.length) {
        /* conversa solta, cada vez mais espaçada (ninguém fica falando sozinho no lobby para sempre) */
        this.idle++;
        if (this.idle < 14) {
          const b = U.pick(this.bots());
          this.queue.push({ at: now + U.rf(4, 7) * (1 + this.idle * 0.25), who: b, text: () => this.pick(BANTER) });
        }
      }
      /* sem nada na fila e a conversa já rareou: para o relógio até alguém falar */
      if (!this.queue.length) {
        this.timer = null;
        return;
      }
      this.timer = setTimeout(() => this.loop(), 400);
    }
    kick() {
      if (!this.timer && !this.stopped && this.started) this.loop();
    }
    stop() {
      this.stopped = true;
      clearTimeout(this.timer);
    }

    /* você escreveu no chat do lobby */
    onHuman(text) {
      text = String(text || '').trim().slice(0, 160);
      const h = this.human();
      if (!text || !h) return;
      this.post(h, text);
      this.idle = Math.max(0, this.idle - 4);
      const n = U.norm(text);
      const bots = this.bots();
      const named = bots.filter((b) => n.split(/\W+/).includes(U.norm(b.name)) || n.includes(U.norm(C.COLOR[b.color].name)));
      const who = named.length ? named.slice(0, 2) : U.shuffle(bots).slice(0, U.chance(0.45) ? 2 : 1);
      if (this.aiOn()) this.aiReply(text, who);
      else this.templateReply(n, who, named.length > 0);
      this.kick();
    }
    templateReply(n, who, named) {
      const h = this.human();
      const now = (performance.now() - this.t0) / 1000;
      /* a pergunta vem antes do cumprimento: um responde a pergunta, outro cumprimenta */
      const kinds = [];
      if (/\b(imp|impostor|impostores|quem e|sus)\b/.test(n)) kinds.push(REPLY.imp);
      if (/\b(dica|como joga|ajuda|como faz)\b/.test(n)) kinds.push(REPLY.tip);
      if (/\b(bora|vamos|vamo|comeca|comecar|start)\b/.test(n)) kinds.push(REPLY.go);
      if (/^(oi|ola|eai|e ai|salve|opa|fala|hey|hello|boa (noite|tarde|dia))\b/.test(n)) kinds.push(REPLY.hello);
      if (named && !kinds.length) kinds.push(REPLY.named);
      if (!kinds.length) kinds.push(REPLY.generic);
      who.forEach((b, i) => {
        const list = kinds[i % kinds.length];
        const b0 = b;
        this.queue.push({ at: now + U.rf(1.2, 2.6) + i * U.rf(1.2, 2.2), who: b0, text: () => this.pick(list, { h: h.name }) });
      });
      this.queue.sort((a, b) => a.at - b.at);
    }
    aiOn() {
      return this.S.ui.aiChat !== 'off' && AU.LLM && AU.LLM.ready() && this.aiCalls < 20 && !this.aiBusy;
    }
    async aiReply(text, who) {
      const h = this.human();
      const V = AU.Voice;
      this.aiBusy = true;
      this.aiCalls++;
      const persona = (r) => {
        const pb = (r._voice = r._voice || { g: { S: this.S }, p: r });
        const pers = C.PERSONALITIES[r.personality] || C.PERSONALITIES.analitico;
        return '### ' + r.name + ' (' + C.COLOR[r.color].name + ') — ' + pers.name + ': ' + pers.desc + ' Jeito de escrever: ' + (V && V.voiceOf ? V.voiceOf(pb) : 'natural');
      };
      const prompt = [
        'Lobby de uma partida igual a Among Us (nave The Skeld), ANTES de começar: ninguém sabe ainda quem é impostor. Os jogadores se cumprimentam, comentam as regras e brincam.',
        'Regras escolhidas: ' + this.S.room.players + ' jogadores, ' + this.S.room.impostors + ' impostor(es); ' + this.settingsLines().join('; ') + '.',
        '',
        'Chat do lobby até agora:',
        this.msgs.slice(-12).map((m) => m.from.name + ': ' + m.text).join('\n'),
        '',
        h.name + ' (o jogador) acabou de escrever: "' + text + '". Quem responde:',
        ...who.map(persona),
        '',
        'Escreva 1 mensagem curta para cada um, no formato "Nome: mensagem".',
      ].join('\n');
      const system = 'Você escreve o chat do lobby de um jogo igual a Among Us, jogado por brasileiros. Mensagens curtas de chat (até 90 caracteres), cada um no seu jeito de escrever, sem narração, sem aspas, sem emojis. Entenda erros de digitação. Nunca diga que é IA ou bot.';
      let out = null;
      try {
        out = await AU.LLM.complete(system, prompt, { maxTokens: 40 + who.length * 40 });
      } catch (e) {
        out = null;
      }
      this.aiBusy = false;
      if (this.stopped) return;
      const lines = [];
      for (const raw of String(out || '').split(/\n+/)) {
        const m = raw.replace(/^[\s*\-•>#]+/, '').replace(/\*\*/g, '').match(/^([^:]{1,30}):\s*(.+)$/);
        if (!m) continue;
        const nm = U.norm(m[1].replace(/\([^)]*\)/g, '')).trim();
        const r = who.find((b) => U.norm(b.name) === nm || U.norm(C.COLOR[b.color].name) === nm);
        let t = m[2].replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/^["“]|["”]$/g, '').trim().slice(0, 140);
        if (AU.Talk.toneFilter) t = AU.Talk.toneFilter(t, this.S.bots.chatTone) || t;
        if (r && t) lines.push({ r, t });
      }
      if (!lines.length) {
        this.templateReply(U.norm(text), who, false);
        return this.kick();
      }
      const now = (performance.now() - this.t0) / 1000;
      lines.slice(0, 2).forEach((l, i) => this.queue.push({ at: now + U.rf(0.6, 1.4) + i * U.rf(1, 2), who: l.r, text: l.t }));
      this.queue.sort((a, b) => a.at - b.at);
      this.kick();
    }
  }

  AU.Lobby = { create: (roster, S) => new LobbyChat(roster, S) };
})();

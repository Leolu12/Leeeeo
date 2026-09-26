/* Chat dos fantasmas: quem morreu conversa com os outros mortos, durante a rodada e nas reuniões.
   Os vivos nunca leem. Cada fantasma-bot sabe quem o matou e o que viu depois de morrer (fantasma
   atravessa paredes e enxerga longe). Com IA ativa as falas vêm do modelo; sem IA, de frases prontas. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;

  /* {k} {v} {x}: nome ("Carol") ou cor com artigo ("o rosa"); {kn} {vn} {xn}: só o nome (depois de preposição
     ou chamando a pessoa); {a}: sala com preposição ("na Elétrica", "no Motor Superior"). */
  const LINES = {
    greet: ['rip {vn}', 'bem-vindo ao clube, {vn}', 'mais um aqui kkk', 'ih, pegaram {v}', 'quem te pegou, {vn}?', 'f {vn}', '{vn} chegou', 'nãao, {v} também'],
    greetHuman: ['bem-vindo, {vn}', 'rip {vn}', 'quem te matou, {vn}?', 'pegaram você também, {vn}?', 'f {vn}', 'e aí {vn}, quem foi?'],
    selfKiller: ['foi {k}', '{k} me matou {a}', '{k} é impostor, me pegou {a}', 'morri, foi {k} kkk', 'tava sozinho {a} e {k} veio', '{k}... nem vi chegar'],
    selfUnknown: ['nem vi quem foi', 'morri do nada', 'nem sei quem me pegou'],
    sawKill: ['{k} acabou de matar {v}!!', 'vish, {k} pegou {v} {a}', 'eu vi, foi {k} que pegou {v}', 'caramba, {k} matou {v} {a}'],
    sawKillAgain: ['{k} de novo...', 'de novo {kn}, que isso', '{k} pegou mais um'],
    ejImp: ['gg, era eu mesmo', 'fui pego kkk', 'é, era eu', 'me pegaram, bem jogado', 'ok ok, era eu'],
    ejCrew: ['eu era inocente!!', 'votaram errado, que raiva', 'não era eu gente', 'sério que me ejetaram?', 'tô bravo, eu fazendo task'],
    reactEjImp: ['boa, acertaram', 'finalmente', 'aee', 'mandaram bem'],
    reactEjCrew: ['votaram errado...', 'coitado', 'sabia que ia dar ruim', 'não acredito'],
    tellHuman: ['{k} que me pegou, fica de olho', 'quem me pegou foi {k}, {a}', '{k} me matou, espero que votem certo'],
    whoKnown: ['foi {k}', '{k}, certeza', '{k} me pegou {a}', '{k}, {a}'],
    whoAgain: ['já falei, foi {k}', '{k}, já disse', '{k}, eu falei ali em cima', 'foi {k} mesmo'],
    whoSaw: ['vi {k} matando {v}', '{k}, vi pegar {v}'],
    whoUnknown: ['não vi', 'sei não', 'não faço ideia', 'nem imagino'],
    whoUnknownEj: ['fui ejetado, não sei de nada', 'sei não, me votaram antes'],
    hello: ['oi', 'eai', 'salve', 'opa', 'fala'],
    agree: ['verdade', 'pois é', 'é isso', 'kkk', 'total', 'também acho', 'faz sentido'],
    nameReact: ['sabia', 'vish, {x}?', '{x}? não esperava', 'faz sentido, tava estranho', 'hmm, {x}'],
    idleKnown: ['{k} tá solto ainda', 'votem em {kn} pfv', 'ninguém desconfia de {kn}...', 'fica de olho em {kn}, tripulação'],
    idle: ['vamo tripulação', 'termina as tasks aí gente', 'que partida', 'tô torcendo aqui', 'esse jogo tá tenso', 'alguém faz as tasks'],
    impIdle: ['vai parceiro', 'ainda dá pra ganhar', 'kkk tão perdidos', 'tá indo bem'],
    protect: ['protegi {x}', 'escudo em {xn}', 'tô cuidando de {xn}', 'coloquei escudo em {xn}'],
    shieldHit: ['o escudo salvou {x}!!', 'kkk o escudo funcionou em {xn}', 'salvei {x}'],
  };

  const G = {
    create(g) {
      return new GhostRoom(g);
    },
  };

  class GhostRoom {
    constructor(g) {
      this.g = g;
      this.msgs = [];
      this.know = {};
      this.queue = [];
      this.clock = 0;
      this.idleAt = U.rf(45, 80);
      this.aiBusy = false;
      this.aiNext = 0;
      this.aiCalls = 0;
      this.used = new Set();
      this.seq = 0;
      this.lastHumanAt = -99;
    }
    get open() {
      const h = this.g.human;
      return !!h && !h.alive;
    }
    ghostBots() {
      return this.g.players.filter((p) => !p.alive && p.brain);
    }
    name(id) {
      const p = this.g.players[id];
      return p ? p.name : 'alguém';
    }
    /* "na Elétrica", "no Motor Superior", "em Armas" */
    room(a) {
      const A = M.AREA[a];
      if (!A) return 'em algum lugar';
      const ch = A.chat || [];
      const hit = ch.find((c) => U.norm(c[0]) === U.norm(A.name)) || ch[0];
      return (hit ? hit[1] : 'na') + ' ' + A.name;
    }
    k(id) {
      return this.know[id] || (this.know[id] = { killer: null, area: null, saw: [], ejected: false, protect: [] });
    }
    aiOn() {
      const g = this.g;
      return !g.headless && g.S.ui.aiChat !== 'off' && AU.LLM && AU.LLM.ready() && this.aiCalls < 40;
    }

    /* ---------- eventos do jogo ---------- */
    onKill(killer, victim, apparent, area) {
      const kv = this.k(victim.id);
      kv.killer = apparent;
      kv.area = area;
      for (const p of this.g.players) {
        if (p.alive || p === victim || !p.brain) continue;
        if (U.d2(p.x, p.y, victim.x, victim.y) > 11) continue;
        this.k(p.id).saw.push({ killer: apparent, victim: victim.id, area });
        if (this.open && U.chance(0.6)) this.later(p, U.rf(1, 3), { kind: 'sawKill', k: apparent, v: victim.id, a: area });
      }
      this.joined(victim);
    }
    onEject(p) {
      this.k(p.id).ejected = true;
      this.joined(p, true);
    }
    onProtect(by, target) {
      this.k(by.id).protect.push(target.id);
      if (this.open && by.brain && U.chance(0.45)) this.later(by, U.rf(0.8, 2.5), { kind: 'protect', x: target.id });
    }
    onShield(victim) {
      if (!this.open) return;
      const angel = this.ghostBots().find((q) => this.k(q.id).protect.includes(victim.id));
      if (angel) this.later(angel, U.rf(0.8, 2), { kind: 'shieldHit', x: victim.id });
    }
    joined(v, ejected) {
      const g = this.g;
      if (v.isHuman) {
        /* o jogador acabou de morrer: os outros fantasmas recebem ele (uma fala por fantasma; quem viu o abate já falou) */
        const others = this.ghostBots();
        const spoke = new Set(this.queue.map((q) => q.who));
        const fresh = U.shuffle(others.filter((q) => !spoke.has(q.id)));
        fresh.slice(0, 2).forEach((q, i) => this.later(q, 3.5 + i * 2.2 + U.rf(0, 1.5), { kind: 'greetHuman', v: v.id }));
        const teller = U.shuffle(others.slice()).find((q) => !fresh.slice(0, 2).includes(q) && this.k(q.id).killer != null && g.players[this.k(q.id).killer] && g.players[this.k(q.id).killer].alive)
          || (others.length === 1 && this.k(others[0].id).killer != null ? others[0] : null);
        if (teller && U.chance(0.7)) this.later(teller, U.rf(9, 13), { kind: 'tellHuman' });
        return;
      }
      if (!this.open) return;
      const kv = this.k(v.id);
      if (ejected) {
        if (U.chance(0.75)) this.later(v, U.rf(2, 5), { kind: v.isImp && g.S.rules.confirmEjects ? 'ejImp' : v.isImp ? (U.chance(0.5) ? 'ejImp' : 'ejCrew') : 'ejCrew' });
        const r = this.ghostBots().filter((q) => q !== v);
        if (r.length && U.chance(0.6)) this.later(U.pick(r), U.rf(4, 7), { kind: g.S.rules.confirmEjects ? (v.isImp ? 'reactEjImp' : 'reactEjCrew') : 'agree', v: v.id });
        return;
      }
      const others = this.ghostBots().filter((q) => q !== v);
      if (others.length && U.chance(0.55)) this.later(U.pick(others), U.rf(1.5, 4), { kind: 'greet', v: v.id });
      if (U.chance(0.7)) this.later(v, U.rf(3, 6), { kind: kv.killer != null ? 'selfKiller' : 'selfUnknown', k: kv.killer, a: kv.area });
    }

    /* ---------- o jogador fala ---------- */
    onHuman(text, recorded) {
      const g = this.g, hp = g.human;
      if (!hp || hp.alive) return;
      text = String(text || '').trim().slice(0, 160);
      if (!text) return;
      if (!recorded) this.record({ from: hp.id, text });
      this.lastHumanAt = this.clock;
      const bots = this.ghostBots();
      if (!bots.length) return;
      const n = U.norm(text);
      const named = bots.filter((q) => n.includes(U.norm(q.name)) || n.includes(U.norm(C.COLOR[q.color].name)));
      let resp = named.length ? named.slice(0, 2) : U.shuffle(bots.slice()).slice(0, bots.length > 1 && U.chance(0.45) ? 2 : 1);
      resp.forEach((q, i) => this.later(q, U.rf(1.4, 3) + i * U.rf(1.5, 2.5), { kind: 'reply', text, human: true }));
    }

    /* ---------- fila de falas ---------- */
    later(p, delay, ctx) {
      this.queue.push({ at: this.clock + delay, who: p.id, ctx, tries: 0 });
    }
    tick(dt) {
      this.clock += dt;
      if (!this.open) {
        this.queue.length = 0;
        return;
      }
      const due = this.queue.filter((q) => q.at <= this.clock);
      if (due.length) {
        this.queue = this.queue.filter((q) => q.at > this.clock);
        const alive = due.filter((d) => {
          const p = this.g.players[d.who];
          return p && !p.alive;
        });
        if (alive.length) this.deliver(alive);
      }
      if (this.clock >= this.idleAt) {
        this.idleAt = this.clock + U.rf(45, 85);
        const bots = this.ghostBots();
        if (bots.length && this.g.phase === 'play' && U.chance(0.5)) this.later(U.pick(bots), 0.1, { kind: 'idle' });
      }
    }
    deliver(items) {
      if (this.aiOn() && !this.aiBusy && this.clock >= this.aiNext) {
        this.aiLines(items);
        return;
      }
      if (this.aiOn()) {
        /* a IA está ocupada: espera um pouco antes de cair nas frases prontas */
        const retry = items.filter((it) => it.tries++ < 3);
        retry.forEach((it) => (it.at = this.clock + 1.5));
        this.queue.push(...retry);
        items.filter((it) => !retry.includes(it)).forEach((it) => this.say(this.g.players[it.who], this.template(this.g.players[it.who], it.ctx)));
        return;
      }
      items.forEach((it) => this.say(this.g.players[it.who], this.template(this.g.players[it.who], it.ctx)));
    }

    /* ---------- frases prontas ---------- */
    /* nome ou cor ("Carol" / "o rosa"), como no resto do chat */
    ref(id) {
      const q = this.g.players[id];
      if (!q) return 'alguém';
      return U.chance(0.6) ? q.name : 'o ' + C.COLOR[q.color].name.toLowerCase();
    }
    fill(s, ctx) {
      const r = {};
      const R = (key) => (r[key] || (r[key] = this.ref(ctx[key])));
      return s
        .replace(/\{kn\}/g, () => this.name(ctx.k))
        .replace(/\{vn\}/g, () => this.name(ctx.v))
        .replace(/\{xn\}/g, () => this.name(ctx.x))
        .replace(/\{k\}/g, () => R('k'))
        .replace(/\{v\}/g, () => R('v'))
        .replace(/\{x\}/g, () => R('x'))
        .replace(/\{a\}/g, () => this.room(ctx.a));
    }
    choose(list, ctx) {
      const fresh = list.map((s) => this.fill(s, ctx)).filter((s) => !this.used.has(s));
      const s = fresh.length ? U.pick(fresh) : this.fill(U.pick(list), ctx);
      this.used.add(s);
      return s;
    }
    template(p, ctx) {
      const g = this.g, kp = this.k(p.id);
      const liveKiller = () => {
        if (kp.killer != null && g.players[kp.killer] && g.players[kp.killer].alive) return { k: kp.killer, a: kp.area };
        const s = kp.saw.find((x) => g.players[x.killer] && g.players[x.killer].alive);
        return s ? { k: s.killer, a: s.area } : null;
      };
      switch (ctx.kind) {
        case 'reply': {
          const n = U.norm(ctx.text);
          if (/\b(quem|qm)\b.*\b(mat|pegou|foi|imp)|\bimpostor|\bimp\b|\bsus\b/.test(n)) {
            if (kp.killer != null) return this.choose(this.saidName(p, kp.killer) ? LINES.whoAgain : LINES.whoKnown, { k: kp.killer, a: kp.area });
            if (kp.saw.length) return this.choose(LINES.whoSaw, { k: kp.saw[0].killer, v: kp.saw[0].victim });
            return this.choose(kp.ejected ? LINES.whoUnknownEj : LINES.whoUnknown, {});
          }
          if (/^(oi|ola|eai|e ai|salve|opa|fala|hey|hello)\b/.test(n)) return this.choose(LINES.hello, {});
          const x = g.players.find((q) => q !== g.human && (n.split(/\W+/).includes(U.norm(q.name)) || n.includes(U.norm(C.COLOR[q.color].name))));
          if (x && x !== p) return this.choose(LINES.nameReact, { x: x.id });
          return this.choose(LINES.agree, {});
        }
        case 'idle': {
          if (p.isImp) return this.choose(LINES.impIdle, {});
          const lk = liveKiller();
          return lk && U.chance(0.7) ? this.choose(LINES.idleKnown, lk) : this.choose(LINES.idle, {});
        }
        case 'tellHuman': {
          const lk = liveKiller();
          if (lk && this.saidName(p, lk.k)) return null;
          return lk ? this.choose(LINES.tellHuman, lk) : null;
        }
        case 'sawKill':
          return this.choose(ctx.k === kp.killer ? LINES.sawKillAgain : LINES.sawKill, ctx);
        default:
          return this.choose(LINES[ctx.kind] || LINES.agree, ctx);
      }
    }

    /* esse fantasma já citou essa pessoa há pouco? (não repete a mesma informação) */
    saidName(p, id) {
      const q = this.g.players[id];
      if (!q) return false;
      const keys = [U.norm(q.name), U.norm(C.COLOR[q.color].name)];
      return this.msgs.slice(-12).some((m) => m.from === p.id && keys.some((k) => U.norm(m.text).includes(k)));
    }

    /* ---------- IA ---------- */
    fact(p) {
      const g = this.g, kp = this.k(p.id), out = [];
      if (kp.ejected) out.push('Foi ejetado na votação' + (g.S.rules.confirmEjects ? ' (todos viram se era impostor).' : '.'));
      else if (kp.killer != null) out.push('Foi morto por ' + AU.Voice.who(g, kp.killer) + ' ' + this.room(kp.area) + '.');
      if (p.isImp) {
        const mates = g.players.filter((q) => q.isImp && q !== p).map((q) => q.name);
        out.push('Era IMPOSTOR' + (mates.length ? ' (parceiro: ' + mates.join(', ') + ')' : '') + '. Morto, pode admitir ou zoar; não precisa mais mentir.');
      }
      kp.saw.forEach((s) => out.push('Depois de morto viu ' + AU.Voice.who(g, s.killer) + ' matar ' + this.name(s.victim) + ' ' + this.room(s.area) + '.'));
      if (p.special === 'anjo' && !p.isImp) out.push('É Anjo da Guarda: pode pôr escudo em um vivo' + (kp.protect.length ? '; já protegeu ' + kp.protect.map((id) => this.name(id)).join(', ') : '') + '.');
      return out.join(' ');
    }
    describe(it) {
      const g = this.g, c = it.ctx, p = g.players[it.who];
      const hp = g.human;
      switch (c.kind) {
        case 'reply': return AU.Voice.who(g, hp.id) + ' escreveu: "' + c.text + '". ' + p.name + ' responde a isso.';
        case 'greet': return this.name(c.v) + ' acabou de morrer e chegou no chat dos fantasmas. ' + p.name + ' recebe.';
        case 'greetHuman': return this.name(c.v) + ' (o jogador) acabou de morrer. ' + p.name + ' recebe e talvez pergunte quem matou.';
        case 'selfKiller': return p.name + ' acabou de morrer e conta quem o matou.';
        case 'selfUnknown': return p.name + ' acabou de morrer sem ver quem foi.';
        case 'sawKill': return p.name + ' (fantasma) acabou de ver ' + this.name(c.k) + ' matar ' + this.name(c.v) + ' ' + this.room(c.a) + '.';
        case 'ejImp': case 'ejCrew': return p.name + ' acabou de ser ejetado e comenta.';
        case 'reactEjImp': case 'reactEjCrew': case 'agree': return this.name(c.v) + ' foi ejetado; ' + p.name + ' comenta.';
        case 'tellHuman': return p.name + ' conta ao jogador recém-chegado o que sabe.';
        case 'protect': return p.name + ' (anjo) acabou de pôr escudo em ' + this.name(c.x) + '.';
        case 'shieldHit': return 'O escudo que ' + p.name + ' pôs em ' + this.name(c.x) + ' acabou de bloquear um abate!';
        default: return p.name + ' comenta a partida, do seu jeito.';
      }
    }
    async aiLines(items) {
      const g = this.g, V = AU.Voice;
      const speakers = [];
      for (const it of items) if (!speakers.includes(it.who)) speakers.push(it.who);
      const ps = speakers.map((id) => g.players[id]).filter((p) => p && p.brain).slice(0, 3);
      if (!ps.length) return;
      this.aiBusy = true;
      this.aiCalls++;
      const tp = g.taskProgress();
      const dead = g.players.filter((q) => !q.alive).map((q) => q.name + (q.ejected ? ' (ejetado' + (g.S.rules.confirmEjects ? (q.isImp ? ', era impostor' : ', era inocente') : '') + ')' : ''));
      const prompt = [
        'Partida estilo Among Us na nave The Skeld. Este é o CHAT DOS FANTASMAS: só os mortos leem; os vivos não veem nada daqui e os fantasmas não podem votar nem avisar os vivos.',
        'Fase: ' + (g.phase === 'meeting' ? 'reunião em andamento (os vivos estão discutindo)' : 'rodada em andamento') + '. Barra de tarefas: ' + (tp.total ? Math.round((tp.done / tp.total) * 100) : 0) + '%.',
        'Vivos: ' + g.players.filter((q) => q.alive).map((q) => V.who(g, q.id)).join(', ') + '.',
        'Mortos (fantasmas): ' + dead.join(', ') + '.',
        '',
        'Chat dos fantasmas até agora:',
        this.msgs.slice(-14).map((m) => this.name(m.from) + ': ' + m.text).join('\n') || '(vazio)',
        '',
        'O que acabou de acontecer:',
        ...items.filter((it) => ps.some((p) => p.id === it.who)).map((it) => '- ' + this.describe(it)),
        '',
        'Quem escreve agora:',
        ...ps.map((p) => '### ' + V.persona(p.brain) + '\n' + (this.fact(p) || 'Não sabe quem o matou.')),
        '',
        'Escreva 1 mensagem curta para cada um (no máximo 2), no formato "Nome: mensagem". Cada um só sabe o que está no próprio bloco e o que foi dito aqui.',
      ].join('\n');
      const system = [
        'Você escreve as mensagens do chat dos fantasmas de um jogo igual a Among Us, jogado por brasileiros.',
        '- Chat de jogo de verdade: mensagens curtas (até 100 caracteres), sem narração, sem aspas, sem emojis, sem asteriscos.',
        '- Cada um tem o próprio jeito de escrever (descrito): siga. Ninguém repete o que já foi dito.',
        '- Fantasmas lamentam, zoam, torcem, comentam a partida e respondem quem falou. Contam quem os matou se sabem. Não inventam o que não viram.',
        '- Entenda erros de digitação e ditado de voz pelo sentido mais provável.',
        '- Nunca diga que é IA ou bot.',
      ].join('\n');
      let text = null;
      try {
        text = await AU.LLM.complete(system, prompt, { maxTokens: 50 + ps.length * 45 });
      } catch (e) {
        text = null;
      }
      this.aiBusy = false;
      this.aiNext = this.clock + 3;
      const round = ps.map((p) => ({ b: p.brain, beats: [] }));
      const lines = text ? V.parseRound(text, round) : [];
      if (!lines.length) {
        items.forEach((it) => {
          const p = g.players[it.who];
          if (p && !p.alive) this.say(p, this.template(p, it.ctx));
        });
        return;
      }
      let delay = 0;
      for (const ln of lines) {
        const p = ln.s.b.p;
        const t = ln.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
        if (!t || this.msgs.slice(-10).some((m) => U.norm(m.text) === U.norm(t))) continue;
        setTimeout(() => {
          if (this.g.phase !== 'ended' && !p.alive) this.say(p, t);
        }, delay);
        delay += U.rf(900, 2200);
      }
    }

    /* ---------- saída ---------- */
    record(m) {
      const msg = { id: ++this.seq, from: m.from, text: m.text, t: this.clock, meeting: this.g.phase === 'meeting' };
      this.msgs.push(msg);
      if (this.msgs.length > 120) this.msgs.shift();
      return msg;
    }
    say(p, text) {
      if (!p || p.alive || !text) return;
      const g = this.g;
      if (g.phase === 'meeting' && g.meeting && !g.meeting.closed) g.meeting.post(p, text, []);
      else this.record({ from: p.id, text });
    }
  }

  AU.Ghosts = G;
})();

/* Reuniões: fluxo de discussão/votação, chat em tempo real (com IA quando disponível) e ejeção. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, T = AU.Talk, M = AU.Map;
  const h = U.h;
  const STRONG = { kill: 1, vent: 1, shift: 1, vanish: 1 };

  class Meeting {
    constructor(g, info) {
      this.g = g;
      this.info = info;
      this.S = g.S;
      this.t = 0;
      this.phase = 'intro';
      this.durI = g.headless ? 0.2 : 2.8;
      this.durD = Math.max(0, g.S.rules.discussionTime);
      this.durV = Math.max(10, g.S.rules.votingTime);
      this.pace = (C.CHAT_PACE[g.S.bots.chatPace] || C.CHAT_PACE.normal).mult;
      this.msgs = [];
      this.ghostMsgs = [];
      this.sched = [];
      this.votes = {};
      this.heat = {};
      this.facts = { bodyArea: null };
      this.accusers = {};
      this.defenders = {};
      this.alive = g.players.filter((p) => p.alive).map((p) => p.id);
      /* onde o jogador estava quando a reunião começou (só para ele ver no mapinha) */
      const hp0 = g.human;
      this.myPos = hp0 ? { x: hp0.x, y: hp0.y, area: M.areaAt(hp0.x, hp0.y).id } : null;
      this.impostorsLeft = g.S.room.impostors - g.players.filter((p) => p.ejected && p.isImp).length;
      this.humanClaimed = false;
      this.humanSpoke = false;
      this.closed = false;
      this.paused = false;
      this.msgId = 0;
      this.voteAt = {};
      this.result = null;
      this.lastToHuman = null;
      this.lastSpeaker = null;
      this.askedHumanAt = null;
      this.askedHumanBy = null;
      this.flags = {};
      this.replyCount = {};
      this.nextSlot = 0;
      this.endT = null;
      this.typing = new Set();
      this.lastMsgT = 0;
      this.askedAt = {};
      this.answered = {};
      /* a IA (se houver) conduz a conversa; sem ela, as falas saem direto do motor */
      if (!g.headless && g.S.ui.aiChat !== 'off' && AU.LLM) AU.LLM.ensure();
      this.dir = !g.headless && AU.Voice ? AU.Voice.director(this) : null;
      this.ui = g.headless ? null : new MeetingUI(this);
      for (const p of g.players) if (p.brain && p.alive && p.brain.mStart) p.brain.mStart(this);
      for (const p of g.players) {
        if (g.ghosts) break; /* o chat dos fantasmas cuida disso (e já reagiu na hora da morte) */
        if (!p.brain || p.alive || p.ejected || p.deathT == null || p.deathT < info.roundStart) continue;
        if (!U.chance(0.6)) continue;
        this.schedule(U.rf(4, 14), p.brain, () => {
          const kind = p.brain.killedBy != null ? 'ghost' : 'ghostIdle';
          this.post(p, T.line(kind, { who: p.brain.killedBy }, g, p.brain), []);
        });
      }
      if (this.dir) this.dir.opening();
    }

    get votingStart() { return this.durI + this.durD; }
    get votingEnd() { return this.durI + this.durD + this.durV; }

    schedule(delay, brain, fn, opts) {
      opts = opts || {};
      const base = Math.max(this.t, this.durI);
      const at = base + Math.max(0.2, delay);
      this.sched.push({ at, brain, fn, deadline: opts.ttl ? at + opts.ttl : null, agenda: !!opts.agenda, force: !!opts.force, dir: !!opts.dir, raw: !!opts.raw });
    }

    /* Fala de um bot: com IA ativa vai para o diretor da conversa; sem IA sai direto. */
    say(brain, m, meta) {
      if (!m || !m.text || this.closed) return;
      meta = meta || {};
      if (brain && brain.vet) {
        m = brain.vet(m, meta);
        if (!m) return;
      }
      if (this.dir && this.dir.accepts(meta)) this.dir.enqueue(brain, m, meta);
      else this.post(brain.p, m.text, m.intents || []);
    }

    setPaused(v) {
      this.paused = !!v;
      if (this.ui) this.ui.onPause();
    }

    update(dt) {
      if (this.closed) return;
      if (this.paused && (this.phase === 'discussion' || this.phase === 'voting')) {
        if (this.ui) this.ui.tick();
        return;
      }
      this.t += dt;
      const t = this.t;
      if (this.phase === 'intro' && t >= this.durI) {
        this.phase = this.durD > 0 ? 'discussion' : 'voting';
        if (this.phase === 'voting') this.startVoting();
        if (this.ui) this.ui.onPhase();
      }
      if (this.phase === 'discussion' && t >= this.votingStart) {
        this.phase = 'voting';
        this.startVoting();
        if (this.ui) this.ui.onPhase();
      }
      if (this.phase === 'discussion' || this.phase === 'voting') {
        /* respostas diretas ao jogador passam na frente da fila */
        this.sched.sort((a, b) => (a.force ? a.at - 6 : a.at) - (b.force ? b.at - 6 : b.at));
        let guard = 0;
        while (this.sched.length && this.sched[0].at <= t && guard++ < 20) {
          const it = this.sched.shift();
          if (it.deadline != null && t > it.deadline) continue;
          const b = it.brain;
          /* "raw": só entrega a fala ao diretor da IA, sem postar; não precisa esperar a vez */
          if (b && b.p.alive && !it.raw) {
            /* ritmo humano: um bot digita uma mensagem por vez e a sala não recebe rajadas */
            const free = Math.max(this.nextSlot || 0, it.force ? 0 : b.nextSpeak || 0);
            const forceWaiting = !it.force && this.sched.some((x) => x.force && x.at <= t);
            if (t < free || forceWaiting) {
              it.at = Math.max(free, t) + (it.force ? 0.05 : U.rf(0.3, 1.0));
              this.sched.push(it);
              continue;
            }
          }
          try {
            it.fn();
          } catch (e) {
            if (window.console) console.warn('fala falhou', e);
          }
        }
        this.checkPrompts();
        if (this.dir) this.dir.tick();
        this.updateTyping();
      }
      if (this.phase === 'voting') {
        for (const id of Object.keys(this.voteAt)) {
          if (this.votes[id] !== undefined || t < this.voteAt[id]) continue;
          const p = this.g.players[+id];
          if (!p.alive) {
            delete this.voteAt[id];
            continue;
          }
          /* com IA, o voto espera a decisão dela (o motor só decide se a IA não responder) */
          const dir = this.dir;
          const ai = dir && dir.aiVotes[+id];
          if (!ai && dir && dir.waitVote(+id)) {
            this.voteAt[id] = t + 1;
            continue;
          }
          delete this.voteAt[id];
          let v = 'skip';
          try {
            v = ai && (ai.target === 'skip' || (this.g.players[ai.target] && this.g.players[ai.target].alive)) ? ai.target : p.brain.mVote();
            if (AU.debug && AU.debug.trace && p.brain.why) (p.brain.whyLog = p.brain.whyLog || {})[this.info.index] = p.brain.why;
          } catch (e) {
            if (window.console) console.warn('voto falhou', e);
          }
          this.castVote(+id, v);
          const aiTalk = this.dir && this.dir.on();
          if (U.chance(aiTalk ? 0.35 + p.brain.pers.talk * 0.35 : 0.3 + p.brain.pers.talk * 0.3)) {
            /* anunciar o voto influencia quem ainda não votou (quem segue a maioria presta atenção) */
            const vi = v === 'skip' ? [{ type: 'skip' }] : [{ type: 'accuse', who: v, reason: 'vote' }];
            const why = ai && ai.target === v && ai.reason ? ai.reason : p.brain.voteReason ? p.brain.voteReason(v) : '';
            this.say(p.brain, { text: T.line('voteSay', { who: v === 'skip' ? null : v }, this.g, p.brain), intents: vi }, { kind: 'vote', vote: v, reason: why });
          }
        }
        const allVoted = this.alive.every((id) => this.votes[id] !== undefined);
        if (allVoted && this.endT == null) this.endT = t + 1.2;
        if (t >= this.votingEnd || (this.endT != null && t >= this.endT)) this.finishVoting();
      }
      if (this.phase === 'results' && t >= this.resultsEnd) {
        this.phase = 'eject';
        if (this.ui) this.ui.showEject();
        this.ejectEnd = t + (this.g.headless ? 0.1 : 6);
      }
      if (this.phase === 'eject' && t >= this.ejectEnd) this.close();
      if (this.ui) this.ui.tick();
    }

    /* "Fulano está digitando…": quem tem fala prestes a sair ou está esperando a IA. */
    updateTyping() {
      if (!this.ui) return;
      const soon = new Set(this.typing);
      const next = this.sched
        .filter((it) => it.brain && it.brain.p.alive && it.at - this.t < 1.6)
        .sort((a, b) => a.at - b.at);
      for (const it of next) {
        if (soon.size >= Math.max(2, this.typing.size)) break;
        soon.add(it.brain.p.id);
      }
      const key = [...soon].sort().join(',');
      if (key !== this._typingKey) {
        this._typingKey = key;
        this.ui.renderTyping(soon);
      }
    }

    checkPrompts() {
      const g = this.g, h0 = g.human, t = this.t;
      const bots = this.alive.map((id) => g.players[id]).filter((p) => p.brain);
      if (!bots.length) return;
      if (h0 && h0.alive && this.info.kind === 'report' && this.info.caller === h0.id && !this.facts.bodyArea && !this.flags.askBody && t > this.durI + 6) {
        this.flags.askBody = true;
        const b = U.pick(bots);
        this.say(b.brain, { text: T.line('askBody', {}, g, b.brain, { question: true }), intents: [{ type: 'askBody' }] }, { kind: 'askBody', important: true });
      }
      /* o jogador apertou o botão e ainda não falou: alguém pergunta o motivo */
      if (h0 && h0.alive && this.info.kind === 'emergency' && this.info.caller === h0.id && !this.humanSpoke && !this.flags.askCaller && t > this.durI + 4.5) {
        this.flags.askCaller = true;
        const b = U.weighted(bots, (q) => 0.3 + q.brain.pers.talk + (q.brain.pers.leader || q.brain.pers.skeptic ? 0.6 : 0));
        if (b) {
          this.lastToHuman = b.id;
          this.say(b.brain, { text: T.line('askCaller', { who: h0.id }, g, b.brain, { question: true }), intents: [{ type: 'askWhy', who: h0.id }] }, { kind: 'askCaller', important: true });
        }
      }
      if (h0 && h0.alive && !this.humanSpoke && !this.flags.quiet && t > this.durI + 40) {
        this.flags.quiet = true;
        const b = bots.find((p) => p.brain.pers.skeptic || p.brain.pers.leader) || null;
        if (b) this.say(b.brain, { text: T.line('quiet', { who: h0.id }, g, b.brain), intents: [{ type: 'quiet', who: h0.id }] }, { kind: 'quiet', important: true });
      }
      if (h0 && h0.alive && this.askedHumanAt != null && !this.humanClaimed && !this.hasClaimed(h0.id) && !this.flags.unanswered && t - this.askedHumanAt > 18) {
        this.flags.unanswered = true;
        const b = g.players[this.askedHumanBy];
        if (b && b.alive && b.brain) b.brain.bump(h0.id, 10);
      }
    }

    startVoting() {
      const g = this.g;
      for (const id of this.alive) {
        const p = g.players[id];
        if (!p.brain) continue;
        const b = p.brain;
        let vt = U.rf(1.5, 5) + this.durV * 0.55 * b.pers.voteDelay * U.rf(0.5, 1.1);
        const top = !p.isImp && b.topSuspect ? b.topSuspect() : null;
        if (top && top.s >= 90) vt *= 0.4;
        this.voteAt[id] = this.votingStart + Math.min(vt, this.durV - 3);
      }
    }

    humanSay(text) {
      const g = this.g, hp = g.human;
      text = String(text || '').trim().slice(0, 160);
      if (!text || !hp || this.closed) return;
      if (this.phase !== 'discussion' && this.phase !== 'voting') return;
      if (!hp.alive) {
        this.post(hp, text, []);
        if (g.ghosts) g.ghosts.onHuman(text, true);
        return;
      }
      const intents = T.parse(text, g, {
        addressed: this.lastToHuman != null ? this.lastToHuman : this.lastSpeaker,
        humanReported: this.info.kind === 'report' && this.info.caller === hp.id,
        bodyKnown: !!this.facts.bodyArea,
      });
      const msg = this.post(hp, text, intents);
      if (msg) this.engageHuman(msg);
      if (msg && this.dir) this.dir.onHuman(msg);
    }

    /* O que o jogador fala vira assunto. Quem chamou a reunião tem o motivo discutido por 2 ou 3 pessoas
       (perguntam detalhe, acreditam, duvidam, cobram o acusado); uma acusação dele sempre ganha resposta.
       O acusado se defende na própria reação. Quem já respondeu por conta própria conta na soma. */
    engageHuman(msg) {
      const g = this.g, hp = g.human;
      if (!hp || !hp.alive || this.closed) return;
      const accIt = msg.intents.find((i) => i.type === 'accuse' && i.who != null && i.who !== hp.id && i.reason !== 'vote');
      const X = accIt ? accIt.who : null;
      const caller = this.info.caller === hp.id;
      const nth = this.msgs.filter((m) => m.from === hp.id).length;
      let want = 0;
      if (caller && nth <= 4 && accIt && !this.flags.topicAcc) {
        this.flags.topicAcc = true;
        want = 3;
      } else if (caller && nth <= 2 && !this.flags.topicWhat && !this.flags.topicAcc && (msg.intents.some((i) => i.type === 'sawAt') || (!msg.intents.length && msg.text.length >= 8))) {
        this.flags.topicWhat = true;
        want = 2;
      } else if (accIt) want = 1;
      if (!want) return;
      const bots = this.alive.map((id) => g.players[id]).filter((q) => q.brain && q !== hp && q.id !== X);
      const replied = (q) => q.brain.repliedTo && q.brain.repliedTo.has(msg.id);
      want -= bots.filter(replied).length;
      if (want <= 0) return;
      const knows = (q) => (X != null && ((q.brain.ev && q.brain.ev[X]) || []).some((e) => Math.abs(e.w) >= 8) ? 2 : 0);
      const pool = bots.filter((q) => !replied(q)).map((q) => ({ q, s: knows(q) + (q.brain.pers.leader || q.brain.pers.skeptic ? 1 : 0) + q.brain.pers.talk + Math.random() * 1.2 }));
      pool.sort((a, b) => b.s - a.s);
      let asked = this.msgs.some((m) => m.from !== hp.id && m.t >= msg.t && m.intents.some((i) => i.type === 'askProof'));
      for (const { q } of pool) {
        if (want <= 0) break;
        const role = accIt && !asked && caller ? 'ask' : 'judge';
        if (q.brain.topicReply(msg, role)) {
          want--;
          if (role === 'ask') asked = true;
        }
      }
    }

    post(p, text, intents, opts) {
      if (this.closed || !text) return null;
      opts = opts || {};
      const g = this.g;
      /* bot não repete a mesma frase, nem (sem IA) a mesma defesa/acusação pela mesma razão na reunião */
      if (p.brain && p.alive) {
        const mine = this.msgs.filter((m) => m.from === p.id);
        const nt = U.norm(text);
        if (mine.some((m) => U.norm(m.text) === nt)) return null;
        /* frase idêntica à de outra pessoa há pouco ("ngm tem certeza, skip" duas vezes): só voto/concordância, então nem manda */
        const same = this.msgs.some((m) => m.from !== p.id && this.t - m.t < 25 && U.norm(m.text) === nt);
        if (!opts.ai && same && (intents || []).every((it) => ['skip', 'agree'].includes(it.type) || (it.type === 'accuse' && it.reason === 'vote'))) return null;
        const strong = (intents || []).filter((it) => (it.type === 'vouch' || it.type === 'accuse') && it.who != null && it.reason !== 'vote');
        if (!opts.ai && strong.length && strong.every((it) => mine.some((m) => m.intents.some((j) => j.type === it.type && j.who === it.who && j.reason === it.reason)))) return null;
      }
      const msg = { id: ++this.msgId, from: p.id, text, intents: intents || [], t: this.t, fromHuman: p.isHuman, ghost: !p.alive, ai: !!opts.ai, bodyKnown: !!this.facts.bodyArea };
      /* respondeu a um "onde você tava?" (mesmo sem citar sala reconhecível): não perguntam de novo */
      if (!msg.ghost && this.askedAt && this.askedAt[p.id] != null && this.t - this.askedAt[p.id] < 30) this.answered[p.id] = msg.id;
      if (msg.ghost) {
        this.ghostMsgs.push(msg);
        if (g.ghosts) g.ghosts.record({ from: p.id, text });
        if (this.ui) this.ui.addMsg(msg);
        return msg;
      }
      this.msgs.push(msg);
      this.lastMsgT = this.t;
      if (p.isHuman) {
        this.humanSpoke = true;
        this.nextSlot = Math.max(this.nextSlot || 0, this.t + 1.2 * this.pace);
      } else {
        this.lastSpeaker = p.id;
        this.typing.delete(p.id);
        this.nextSlot = this.t + U.rf(1.0, 2.2) * this.pace;
        if (p.brain) p.brain.nextSpeak = this.t + (1.8 + text.length / 11) * this.pace * (p.brain.pers.talk < 0.3 ? 1.5 : 1);
      }
      const hp = g.human;
      /* quem diz "voto no X" ou "skip" no chat fica comprometido com isso */
      if (p.brain) {
        if (msg.intents.some((it) => it.type === 'claimLoc')) p.brain.claimPosted = true;
        for (const it of msg.intents) {
          if (it.type === 'accuse' && it.reason === 'vote' && it.who !== p.id) p.brain.committed = it.who;
          if (it.type === 'skip') p.brain.skipLean = (p.brain.skipLean || 0) + 1;
        }
      }
      for (const it of msg.intents) {
        if (it.type === 'accuse' || it.type === 'agree') {
          const w = it.type === 'agree' ? 8 : STRONG[it.reason] ? 30 : it.reason === 'vote' ? 5 : 12;
          this.heat[it.who] = (this.heat[it.who] || 0) + w;
          (this.accusers[it.who] = this.accusers[it.who] || {})[p.id] = 1;
        } else if (it.type === 'vouch') {
          this.heat[it.who] = (this.heat[it.who] || 0) - 10;
          (this.defenders[it.who] = this.defenders[it.who] || {})[p.id] = 1;
        } else if ((it.type === 'reportInfo' || it.type === 'bodyArea') && it.area && !this.facts.bodyArea) {
          this.facts.bodyArea = it.area;
        } else if (it.type === 'claimLoc' && p.isHuman) {
          this.humanClaimed = true;
        }
        if (hp && !p.isHuman && it.who === hp.id && (it.type === 'askWhere' || it.type === 'accuse' || it.type === 'quiet')) this.lastToHuman = p.id;
        if (it.type === 'askWhere' && it.who != null && it.who !== p.id) this.askedAt[it.who] = this.t;
        if (it.type === 'claimLoc') this.answered[p.id] = msg.id;
      }
      if (this.ui) this.ui.addMsg(msg);
      for (const q of g.players) {
        if (q.brain && q.alive && q.id !== p.id && q.brain.mOnMessage) {
          try {
            q.brain.mOnMessage(msg);
          } catch (e) {
            if (window.console) console.warn('reação falhou', e);
          }
        }
      }
      return msg;
    }

    castVote(voter, target) {
      if (this.phase !== 'voting' || this.votes[voter] !== undefined) return false;
      const p = this.g.players[voter];
      if (!p || !p.alive) return false;
      if (target !== 'skip' && (!this.g.players[target] || !this.g.players[target].alive)) return false;
      this.votes[voter] = target;
      if (this.ui) this.ui.onVote(voter);
      if (!this.g.headless) AU.Audio.play('vote');
      return true;
    }
    /* já disse onde estava (ou respondeu quando perguntaram) */
    hasClaimed(id) {
      return this.answered[id] != null;
    }
    canReply(msgId) {
      return (this.replyCount[msgId] || 0) < 2;
    }
    noteReply(msgId) {
      this.replyCount[msgId] = (this.replyCount[msgId] || 0) + 1;
    }
    votesOn(id) {
      let n = 0;
      for (const k of Object.keys(this.votes)) if (this.votes[k] === id) n++;
      return n;
    }
    /* O que dá para saber da votação sem espiar: no jogo só aparece QUEM já votou, não em quem. Então os bots contam
       apenas os votos anunciados no chat ("voto no X", "eu pulo"), valendo o último de cada um. Quem diz que viu
       alguém matar, ventar ou se transformar vai votar nele: conta como voto anunciado. */
    saidVotes() {
      const out = {};
      for (const m of this.msgs) {
        for (const it of m.intents) {
          if (it.type === 'skip') out[m.from] = 'skip';
          else if (it.type === 'accuse' && it.who != null && it.who !== m.from && (it.reason === 'vote' || STRONG[it.reason])) out[m.from] = it.who;
        }
      }
      return out;
    }
    saidOn(id) {
      const s = this.saidVotes();
      let n = 0;
      for (const k of Object.keys(s)) if (s[k] === id) n++;
      return n;
    }
    saidLeading() {
      const s = this.saidVotes(), counts = {};
      for (const k of Object.keys(s)) if (s[k] !== 'skip') counts[s[k]] = (counts[s[k]] || 0) + 1;
      let best = null;
      for (const id of Object.keys(counts)) if (!best || counts[id] > best.count) best = { id: +id, count: counts[id] };
      return best;
    }
    leading() {
      const counts = {};
      for (const k of Object.keys(this.votes)) {
        const v = this.votes[k];
        if (v !== 'skip') counts[v] = (counts[v] || 0) + 1;
      }
      let best = null;
      for (const id of Object.keys(counts)) if (!best || counts[id] > best.count) best = { id: +id, count: counts[id] };
      return best;
    }

    finishVoting() {
      if (this.phase !== 'voting') return;
      for (const id of this.alive) if (this.votes[id] === undefined) this.votes[id] = 'skip';
      const counts = {};
      let skip = 0;
      for (const k of Object.keys(this.votes)) {
        const v = this.votes[k];
        if (v === 'skip') skip++;
        else counts[v] = (counts[v] || 0) + 1;
      }
      let max = 0, top = null, tie = false;
      for (const id of Object.keys(counts)) {
        if (counts[id] > max) {
          max = counts[id];
          top = +id;
          tie = false;
        } else if (counts[id] === max) tie = true;
      }
      let ejected = null;
      if (top != null && !tie && max > skip) ejected = top;
      this.result = { ejected, tie: tie && max >= skip, skip, counts, votes: Object.assign({}, this.votes) };
      this.phase = 'results';
      this.paused = false;
      this.resultsEnd = this.t + (this.g.headless ? 0.1 : 4.2);
      if (this.ui) this.ui.showResults();
    }

    close() {
      if (this.closed) return;
      this.closed = true;
      /* a interface some da tela e é solta (o histórico usa só as mensagens) */
      if (this.ui) this.ui.destroy();
      this.ui = null;
      this.g.finishMeeting(this.result || { ejected: null, votes: {} });
    }
  }

  /* Cor do nome legível sobre o balão branco: cores claras usam o tom de sombra, escurecido. */
  function readable(col) {
    const hex = col.hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16), gg = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
    if (lum < 0.62) return col.hex;
    const sh = col.shade.replace('#', '');
    const f = 0.62;
    const c = (i) => Math.round(parseInt(sh.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0');
    return '#' + c(0) + c(2) + c(4);
  }

  function mentionsHuman(g, text) {
    const hp = g.human;
    if (!hp) return false;
    const n = ' ' + U.norm(text) + ' ';
    const al = [U.norm(hp.name)].concat(C.COLOR[hp.color].alias.map(U.norm)).filter((a) => a.length >= 2);
    return al.some((a) => new RegExp('(^|[^a-z0-9])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])').test(n));
  }

  /* Uma mensagem do chat (usada na reunião e no histórico). */
  function msgElement(g, msg) {
    const p = g.players[msg.from];
    const col = C.COLOR[p.color];
    const mention = !msg.fromHuman && mentionsHuman(g, msg.text);
    return h('div', { class: 'mt-msg' + (msg.fromHuman ? ' mine' : '') + (msg.ghost ? ' ghost' : '') + (mention ? ' mention' : '') },
      h('span', { class: 'mt-msg-bean', html: AU.Render.beanSVG(p.color, { size: 26, visor: p.visor, ghost: msg.ghost }) }),
      h('div', { class: 'mt-msg-body' },
        h('div', { class: 'mt-msg-name', style: { color: readable(col) } }, p.name + (msg.ghost ? ' 👻' : '')),
        h('div', { class: 'mt-msg-text' }, msg.text)));
  }

  /* Quadro de álibis: resumo do que cada um disse e do que disseram sobre ele (só informação pública do chat). */
  const REASON_TXT = { kill: 'viu matar', vent: 'viu ventar', shift: 'viu se transformar', vanish: 'viu sumir', noscan: 'fingiu scan', follow: 'estava seguindo', nearBody: 'perto do corpo', lastWith: 'junto da vítima', lie: 'mentindo', tracker: 'rastreado', vote: 'pediu voto', sus: 'suspeito', hunch: 'palpite', claim: 'suspeito', mention: '' };
  function boardData(g, msgs, ids) {
    const rows = {};
    ids.forEach((id) => (rows[id] = { claims: null, pro: new Map(), contra: new Map(), acc: new Map(), visual: false, denied: false }));
    for (const m of msgs) {
      for (const it of m.intents || []) {
        if (it.type === 'claimLoc' && rows[m.from]) rows[m.from].claims = it.rooms;
        if (it.type === 'deny' && rows[m.from]) rows[m.from].denied = true;
        const r = it.who != null ? rows[it.who] : null;
        if (!r || it.who === m.from) continue;
        if (it.type === 'vouch') {
          r.pro.set(m.from, it.reason === 'visual' ? 'visual' : it.reason === 'together' ? 'estava junto' : 'confirma');
          if (it.reason === 'visual') r.visual = true;
        } else if (it.type === 'accuse' && it.reason === 'lie') r.contra.set(m.from, 'contesta o álibi');
        else if (it.type === 'accuse') r.acc.set(m.from, REASON_TXT[it.reason] || 'suspeito');
        else if (it.type === 'agree') r.acc.set(m.from, 'concorda');
      }
    }
    return rows;
  }
  function boardElement(g, msgs, ids, extra) {
    const rows = boardData(g, msgs, ids);
    const nm = (id) => g.players[id].name;
    const list = h('div', { class: 'board' });
    for (const id of ids) {
      const p = g.players[id];
      const r = rows[id];
      const items = [];
      items.push(h('div', { class: 'bd-claim' }, '📍 ', r.claims ? r.claims.map((a) => (M.AREA[a] ? M.AREA[a].name : a)).join(' → ') : h('em', {}, p.isHuman ? 'você ainda não disse onde estava' : 'não disse onde estava')));
      if (r.visual) items.push(h('div', { class: 'bd-pro' }, '✅ fez tarefa visual'));
      if (r.pro.size) items.push(h('div', { class: 'bd-pro' }, '✔ ', [...r.pro].map(([k, v]) => nm(k) + ' (' + v + ')').join(', ')));
      if (r.contra.size) items.push(h('div', { class: 'bd-contra' }, '✖ ', [...r.contra].map(([k, v]) => nm(k) + ' (' + v + ')').join(', ')));
      if (r.acc.size) items.push(h('div', { class: 'bd-acc' }, '⚠ ', [...r.acc].map(([k, v]) => nm(k) + (v ? ' (' + v + ')' : '')).join(', ')));
      if (extra && extra.votes && extra.votes[id] !== undefined) items.push(h('div', { class: 'bd-vote' }, '🗳 votou: ' + (extra.votes[id] === 'skip' ? 'pulou' : nm(extra.votes[id]))));
      list.appendChild(h('div', { class: 'bd-row' + (p.isHuman ? ' me' : '') },
        h('span', { class: 'bd-bean', html: AU.Render.beanSVG(p.color, { size: 30, visor: p.visor }) }),
        h('div', { class: 'bd-info' }, h('div', { class: 'bd-name' }, p.name, h('small', {}, ' ' + C.COLOR[p.color].name)), items)));
    }
    return list;
  }

  /* ---------------- interface ---------------- */
  class MeetingUI {
    constructor(mt) {
      this.mt = mt;
      const g = mt.g;
      this.g = g;
      const info = mt.info;
      const hp = g.human;
      const isReport = info.kind === 'report';
      const caller = g.players[info.caller];
      this.pinned = true;
      this.unread = 0;
      this.root = h('div', { class: 'meeting', role: 'dialog', 'aria-label': 'Reunião' });
      /* abertura animada: raios girando atrás de quem chamou (botão) ou do corpo com o megafone (report) */
      const splashCv = h('canvas', { class: 'mt-splash-cv', 'aria-hidden': 'true' });
      this.splash = h('div', { class: 'mt-splash ' + (isReport ? 'report' : 'emergency') }, splashCv,
        h('div', { class: 'mt-splash-title' }, isReport ? 'Corpo reportado' : 'Reunião de emergência'),
        h('div', { class: 'mt-splash-sub' }, isReport ? `${caller.name} encontrou o corpo de ${g.players[info.body.pid].name}` : `${caller.name} apertou o botão`));
      this.timer = h('div', { class: 'mt-timer' }, '');
      this.pauseBtn = h('button', { class: 'mt-pause', type: 'button', title: 'Pausar a reunião para ler com calma', onclick: () => this.mt && this.mt.setPaused(!this.mt.paused) }, '⏸ Pausar');
      this.aiBadge = h('button', { class: 'mt-ai', type: 'button', onclick: () => this.aiClick() }, '');
      this.paintAI();
      this.cards = h('div', { class: 'mt-cards' });
      this.log = h('div', { class: 'mt-log', 'aria-live': 'polite' });
      this.log.addEventListener('scroll', () => {
        const atBottom = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 28;
        this.pinned = atBottom;
        if (atBottom) this.clearUnread();
      });
      this.newPill = h('button', { class: 'mt-newpill', type: 'button', hidden: true, onclick: () => this.scrollBottom() }, '');
      this.typingEl = h('div', { class: 'mt-typing', 'aria-live': 'off' }, '');
      this.board = h('div', { class: 'mt-board' });
      this.input = h('input', { class: 'mt-input', id: 'mt-input', type: 'text', maxlength: '160', placeholder: hp && hp.alive ? 'Digite no chat… (Enter envia)' : 'Chat dos fantasmas…', autocomplete: 'off' });
      this.sendBtn = h('button', { class: 'mt-send', type: 'submit' }, 'Enviar');
      const form = h('form', { class: 'mt-form' }, this.input, this.sendBtn);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.send();
      });
      this.input.addEventListener('keydown', (e) => e.stopPropagation());
      const chips = ['onde foi o corpo?', 'onde vocês estavam?', 'eu tava na ', 'vi o ', 'quem confirma?', 'skip'].map((c) =>
        h('button', {
          class: 'chip', type: 'button', onclick: () => {
            if (/ $/.test(c)) {
              this.input.value = c;
              this.input.focus();
            } else {
              this.input.value = c;
              this.send();
            }
          },
        }, c.trim()));
      this.skipBtn = h('button', { class: 'mt-skip', type: 'button', onclick: () => this.pick('skip') }, 'Pular voto');
      this.skipVotes = h('div', { class: 'mt-voters' });
      this.status = h('div', { class: 'mt-status' }, '');
      const head = h('div', { class: 'mt-head' },
        h('div', { class: 'mt-head-l' }, h('div', { class: 'mt-title' }, isReport ? 'Corpo reportado' : 'Reunião de emergência'),
          h('div', { class: 'mt-sub' }, isReport ? `${caller.name} reportou · vítima: ${g.players[info.body.pid].name}` : `Chamada por ${caller.name}`, ' · ', this.aiBadge)),
        h('div', { class: 'mt-head-r' }, this.pauseBtn, this.timer));
      this.tabs = h('div', { class: 'mt-tabs', role: 'tablist' },
        ['players', 'chat', 'board'].map((k) => h('button', { class: 'mt-tab', type: 'button', role: 'tab', 'data-tab': k, onclick: () => this.setTab(k) },
          k === 'players' ? 'Jogadores' : k === 'chat' ? 'Chat' : h('span', {}, h('span', { class: 'tab-long' }, 'Quadro de álibis'), h('span', { class: 'tab-short' }, 'Álibis')))));
      this.myMap = this.buildMyMap();
      const left = h('div', { class: 'mt-left' }, this.cards, h('div', { class: 'mt-skiprow' }, this.skipBtn, this.skipVotes), this.status, this.myMap);
      const logWrap = h('div', { class: 'mt-logwrap' }, this.log, this.newPill);
      this.voteCta = h('button', { class: 'mt-votecta', type: 'button', onclick: () => this.setTab('players') }, '🗳 Votação aberta — toque aqui para votar');
      const right = h('div', { class: 'mt-right' }, this.voteCta, logWrap, this.board, this.typingEl, h('div', { class: 'mt-chips' }, chips), form);
      this.body = h('div', { class: 'mt-body', 'data-tab': 'chat' }, left, right);
      this.panel = h('div', { class: 'mt-panel' }, head, this.tabs, this.body);
      this.eject = h('div', { class: 'mt-eject', hidden: true });
      this.root.appendChild(this.panel);
      this.root.appendChild(this.splash);
      this.root.appendChild(this.eject);
      document.getElementById('meeting-layer').appendChild(this.root);
      this.stopSplash = AU.Scenes.play(splashCv, isReport ? 'report' : 'emergency', {
        kind: isReport ? 'report' : 'emergency',
        caller: { color: caller.color, hat: caller.hat, visor: caller.visor },
        body: isReport ? { color: g.players[info.body.pid].color } : null,
      }, 3.2);
      this.cardEls = {};
      this.selected = null;
      g.players.forEach((p) => this.makeCard(p));
      this.setTab('chat');
      this.onPhase();
    }
    setTab(k) {
      this.tab = k;
      this.body.setAttribute('data-tab', k);
      this.tabs.querySelectorAll('.mt-tab').forEach((b) => {
        const on = b.getAttribute('data-tab') === k;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (k === 'board') this.renderBoard();
      if (k === 'players' && this.paintMyMap) requestAnimationFrame(() => this.paintMyMap && this.paintMyMap());
      if (k === 'chat' && this.pinned) this.scrollBottom();
    }
    renderBoard() {
      const mt = this.mt;
      if (this.tab !== 'board') return;
      this.board.innerHTML = '';
      this.board.appendChild(h('p', { class: 'bd-help' }, 'Resumo automático do que foi dito no chat: onde cada um disse que estava, quem confirmou, quem contestou e quem acusou.'));
      this.board.appendChild(boardElement(this.g, mt.msgs, mt.alive, null));
    }
    makeCard(p) {
      const g = this.g, mt = this.mt, hp = g.human;
      const dead = !p.alive;
      const partner = hp && hp.isImp && p.isImp;
      /* os cliques guardam só o número do jogador (guardar o jogador prenderia a partida inteira na memória) */
      const pid = p.id;
      const conf = h('div', { class: 'mt-confirm', hidden: true },
        h('button', { class: 'yes', type: 'button', 'aria-label': 'Confirmar voto', onclick: (e) => { e.stopPropagation(); this.confirm(pid); } }, '✓'),
        h('button', { class: 'no', type: 'button', 'aria-label': 'Cancelar', onclick: (e) => { e.stopPropagation(); this.cancel(); } }, '✕'));
      const voters = h('div', { class: 'mt-voters' });
      const badge = h('span', { class: 'mt-badge', hidden: true }, 'VOTOU');
      const card = h('button', {
        class: 'mt-card' + (dead ? ' dead' : '') + (p.isHuman ? ' me' : '') + (partner ? ' partner' : ''),
        type: 'button', disabled: dead,
        onclick: () => this.pick(pid),
      },
      h('span', { class: 'mt-card-bean', html: AU.Render.beanSVG(p.color, { size: 40, visor: p.visor, x: dead }) }),
      h('span', { class: 'mt-card-text' },
        h('span', { class: 'mt-card-name' }, p.name + (p.isHuman ? ' (você)' : '')),
        h('span', { class: 'mt-card-col' }, C.COLOR[p.color].name + (dead ? (p.ejected ? ' · ejetado' : ' · morto') : ''))),
      mt.info.caller === p.id ? h('span', { class: 'mt-mega', title: 'Chamou a reunião' }, '📣') : null,
      badge, conf, voters);
      this.cards.appendChild(card);
      this.cardEls[p.id] = { card, conf, voters, badge };
    }
    onPhase() {
      const mt = this.mt, hp = this.g.human;
      if (mt.phase !== 'intro' && !this.splash.classList.contains('gone')) {
        this.splash.classList.add('gone');
        setTimeout(() => this.stopSplash(), 450);
      }
      const canVote = mt.phase === 'voting' && hp && hp.alive && mt.votes[hp.id] === undefined;
      this.root.classList.toggle('can-vote', !!canVote);
      this.root.classList.toggle('dead-me', !!hp && !hp.alive);
      this.skipBtn.disabled = !canVote;
      if (mt.phase === 'discussion' && hp && hp.alive && window.matchMedia('(pointer:fine)').matches) setTimeout(() => this.input.focus(), 60);
      const pt = this.tabs.querySelector(".mt-tab[data-tab='players']");
      if (pt) pt.textContent = canVote ? '🗳 Votar' : 'Jogadores';
      if (mt.phase === 'voting' && canVote && window.innerWidth <= 860 && !this.autoSwitched) {
        /* tela estreita: a votação abre direto na aba de votar */
        this.autoSwitched = true;
        this.tabs.classList.add('flash');
        this.setTab('players');
      }
      this.status.textContent = !hp || !hp.alive ? 'Você está morto: só pode assistir e falar no chat dos fantasmas.' : mt.phase === 'discussion' ? 'Discussão: a votação ainda não abriu. Toque num jogador para citá-lo no chat.' : mt.phase === 'voting' ? (canVote ? 'Clique num jogador para votar, ou pule.' : 'Voto registrado.') : '';
    }
    onPause() {
      const p = this.mt.paused;
      this.pauseBtn.textContent = p ? '▶ Continuar' : '⏸ Pausar';
      this.pauseBtn.classList.toggle('on', p);
      this.root.classList.toggle('paused', p);
    }
    /* Selo da IA no cabeçalho: diz se está ativa e, se não estiver, por quê. */
    paintAI() {
      const mt = this.mt, L = AU.LLM, g = mt.g;
      if (!this.aiBadge) return;
      let cls = 'mt-ai', txt, tip;
      if (g.S.ui.aiChat === 'off') {
        txt = 'IA desligada';
        tip = 'A IA das conversas está desligada nas configurações da partida.';
      } else if (AU.Voice && AU.Voice.active(mt) && (!mt.dir || mt.dir.on())) {
        cls += ' on';
        txt = 'IA: ' + L.label();
        tip = 'As falas dos bots estão sendo escritas pela IA (' + L.label() + ')' + (mt.dir && mt.dir.aiLines ? ': ' + mt.dir.aiLines + ' mensagens nesta reunião.' : '.');
      } else if (L.status === 'loading') {
        cls += ' wait';
        txt = 'IA: aguardando…';
        tip = L.detail || 'Preparando a IA.';
      } else if (L.status === 'available') {
        cls += ' wait';
        txt = 'IA: toque para ativar';
        tip = L.detail;
      } else if (L.status === 'limited') {
        cls += ' wait';
        txt = 'IA pausada: limite de uso';
        tip = L.detail;
      } else if (mt.dir && mt.dir.calls >= mt.dir.maxCalls()) {
        cls += ' wait';
        txt = 'IA: cota da reunião usada';
        tip = 'Esta reunião já usou as chamadas de IA previstas; o resto sai pelo sistema de regras. Na próxima reunião volta.';
      } else {
        cls += ' err';
        txt = L.status === 'error' || (mt.dir && mt.dir.fails >= 3) ? 'IA com problema' : 'IA indisponível';
        tip = (L.detail || 'Sem IA configurada.') + (L.lastError ? ' Último erro: ' + L.lastError.message : '');
      }
      const key = cls + '|' + txt + '|' + tip;
      if (key === this._aiKey) return;
      this._aiKey = key;
      this.aiBadge.className = cls;
      this.aiBadge.textContent = txt;
      this.aiBadge.title = tip;
      this.aiBadge.setAttribute('aria-label', txt + '. ' + tip);
    }
    aiClick() {
      const L = AU.LLM, mt = this.mt;
      if (L.status === 'available') L.warmup();
      else if (L.status === 'error' || L.status === 'limited' || (mt.dir && mt.dir.fails >= 3)) {
        if (mt.dir) mt.dir.fails = 0;
        L.retry();
      }
      AU.HUD.toast(this.aiBadge.title || this.aiBadge.textContent);
    }

    tick() {
      const mt = this.mt;
      this.paintAI();
      let label = '';
      if (mt.phase === 'discussion') label = 'Discussão · ' + Math.ceil(mt.votingStart - mt.t) + 's';
      else if (mt.phase === 'voting') label = 'Votação · ' + U.fmtTime(mt.votingEnd - mt.t);
      else if (mt.phase === 'results') label = 'Resultado';
      if (mt.paused) label = 'Pausado · ' + label;
      if (this.timer.textContent !== label) this.timer.textContent = label;
      this.pauseBtn.hidden = !(mt.phase === 'discussion' || mt.phase === 'voting');
    }
    renderTyping(set) {
      const mt = this.mt, g = this.g;
      const ids = [...(set || mt.typing)].filter((id) => g.players[id] && g.players[id].alive);
      if (!ids.length) {
        this.typingEl.textContent = '';
        this.typingEl.classList.remove('on');
        return;
      }
      const names = ids.slice(0, 3).map((id) => g.players[id].name);
      const more = ids.length > 3 ? ' e mais ' + (ids.length - 3) : '';
      this.typingEl.textContent = names.join(', ') + more + (ids.length === 1 ? ' está digitando…' : ' estão digitando…');
      this.typingEl.classList.add('on');
    }
    pick(id) {
      const mt = this.mt, hp = this.g.human;
      if (mt.phase === 'discussion' && id !== 'skip') {
        const p = this.g.players[id];
        this.input.value = (this.input.value ? this.input.value + ' ' : '') + C.COLOR[p.color].name.toLowerCase() + ' ';
        if (window.innerWidth <= 860) this.setTab('chat');
        this.input.focus();
        return;
      }
      if (mt.phase !== 'voting' || !hp || !hp.alive || mt.votes[hp.id] !== undefined) return;
      if (id === 'skip') {
        mt.castVote(hp.id, 'skip');
        this.cancel();
        this.onPhase();
        return;
      }
      this.cancel();
      this.selected = id;
      this.cardEls[id].conf.hidden = false;
      this.cardEls[id].card.classList.add('sel');
    }
    confirm(id) {
      const mt = this.mt, hp = this.g.human;
      if (!hp) return;
      mt.castVote(hp.id, id);
      this.cancel();
      this.onPhase();
    }
    cancel() {
      if (this.selected != null) {
        this.cardEls[this.selected].conf.hidden = true;
        this.cardEls[this.selected].card.classList.remove('sel');
      }
      this.selected = null;
    }
    onVote(voter) {
      const el = this.cardEls[voter];
      if (el) el.badge.hidden = false;
    }
    send() {
      const v = this.input.value.trim();
      if (!v) return;
      const now = performance.now();
      if (this.lastSend && now - this.lastSend < 700) return;
      this.lastSend = now;
      this.mt.humanSay(v);
      this.input.value = '';
      this.scrollBottom();
    }
    scrollBottom() {
      this.log.scrollTop = this.log.scrollHeight;
      this.pinned = true;
      this.clearUnread();
    }
    clearUnread() {
      this.unread = 0;
      this.newPill.hidden = true;
    }
    addMsg(msg) {
      const g = this.g, hp = g.human;
      if (msg.ghost && hp && hp.alive) return;
      const line = msgElement(g, msg);
      this.log.appendChild(line);
      if (this.pinned || msg.fromHuman) {
        this.log.scrollTop = this.log.scrollHeight;
      } else {
        this.unread++;
        this.newPill.textContent = '↓ ' + this.unread + (this.unread === 1 ? ' nova mensagem' : ' novas mensagens');
        this.newPill.hidden = false;
      }
      if (!msg.fromHuman) AU.Audio.play('chat');
      if (this.tab === 'board') this.renderBoard();
    }
    showResults() {
      const mt = this.mt, g = this.g;
      const r = mt.result;
      this.root.classList.remove('can-vote');
      this.onPause();
      this.cancel();
      const anon = g.S.rules.anonymousVotes;
      const chip = (voter) => {
        const p = g.players[+voter];
        return h('span', { class: 'mt-vchip', title: anon ? '' : p.name, style: { background: anon ? '#8b93a7' : C.COLOR[p.color].hex } });
      };
      for (const voter of Object.keys(r.votes)) {
        const tgt = r.votes[voter];
        if (tgt === 'skip') this.skipVotes.appendChild(chip(voter));
        else if (this.cardEls[tgt]) this.cardEls[tgt].voters.appendChild(chip(voter));
      }
      if (window.innerWidth <= 860) this.setTab('players');
      this.status.textContent = r.ejected != null ? 'Votos contados.' : r.tie ? 'Empate: ninguém será ejetado.' : 'A maioria pulou.';
    }
    showEject() {
      const mt = this.mt, g = this.g, r = mt.result;
      const conf = g.S.rules.confirmEjects;
      let line1, line2 = '';
      let bean = '';
      if (r.ejected == null) {
        line1 = r.tie ? 'Ninguém foi ejetado. (Empate)' : 'Ninguém foi ejetado. (Pulado)';
      } else {
        const p = g.players[r.ejected];
        bean = AU.Render.beanSVG(p.color, { size: 110, visor: p.visor });
        const remaining = g.players.filter((q) => q.alive && q.isImp && q.id !== p.id).length;
        if (conf) {
          line1 = `${p.name} ${p.isImp ? 'era' : 'não era'} ${g.S.room.impostors > 1 ? 'um Impostor' : 'o Impostor'}.`;
          line2 = `${remaining} Impostor${remaining === 1 ? '' : 'es'} restante${remaining === 1 ? '' : 's'}.`;
        } else line1 = `${p.name} foi ejetado.`;
      }
      this.eject.innerHTML = '';
      this.eject.appendChild(h('div', { class: 'mt-eject-space' }));
      if (bean) this.eject.appendChild(h('div', { class: 'mt-eject-bean', html: bean }));
      const t1 = h('div', { class: 'mt-eject-text' }, '');
      const t2 = h('div', { class: 'mt-eject-sub' }, '');
      this.eject.appendChild(t1);
      this.eject.appendChild(t2);
      this.eject.hidden = false;
      this.panel.classList.add('gone');
      AU.Audio.play('eject');
      let i = 0;
      const full = line1;
      const iv = setInterval(() => {
        i++;
        t1.textContent = full.slice(0, i);
        if (i % 2 === 0 && full[i - 1] !== ' ') AU.Audio.play('type');
        if (i >= full.length) {
          clearInterval(iv);
          t2.textContent = line2;
        }
      }, 45);
      this.iv = iv;
    }
    /* Mapinha só com o lugar onde VOCÊ estava quando a reunião começou (nada de corpo nem dos outros). */
    buildMyMap() {
      const mt = this.mt, g = mt.g, hp = g.human, pos = mt.myPos;
      if (!hp || !pos || !AU.HUD || !AU.HUD.drawMapBase) return null;
      const cv = h('canvas', { class: 'mt-map-cv', width: 544, height: 304, 'aria-hidden': 'true' });
      const A = M.AREA[pos.area];
      const box = h('div', { class: 'mt-map' },
        h('div', { class: 'mt-map-h' }, '🗺 Onde você estava', h('span', {}, A ? A.name : '')), cv);
      const col = C.COLOR[hp.color].hex;
      /* redesenha quando aparece na tela: o tamanho do texto depende do tamanho real do mapa */
      const paint = () => {
        if (!cv.isConnected) return;
        const { ctx, sx, sy } = AU.HUD.drawMapBase(cv);
        const x = pos.x * sx, y = pos.y * sy;
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(x, y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#10151f';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      };
      this.paintMyMap = () => {
        try {
          paint();
        } catch (e) {
          /* mapa é só um enfeite */
        }
      };
      requestAnimationFrame(() => this.paintMyMap && this.paintMyMap());
      return box;
    }

    destroy() {
      if (this.iv) clearInterval(this.iv);
      if (this.stopSplash) this.stopSplash();
      /* campo de texto com foco preso num nó removido segura a reunião inteira na memória */
      if (document.activeElement && this.root.contains(document.activeElement)) document.activeElement.blur();
      this.root.remove();
      /* o navegador às vezes ainda guarda o último campo de texto: corta a ligação com a partida */
      this.mt = null;
      this.g = null;
      this.paintMyMap = null;
    }
  }

  /* Histórico: conversa e quadro de uma reunião já encerrada. */
  function historyElement(g, mt) {
    const info = mt.info;
    const title = info.kind === 'report' ? `Reunião ${info.index}: ${g.players[info.caller].name} reportou o corpo de ${g.players[info.body.pid].name}` : `Reunião ${info.index}: emergência chamada por ${g.players[info.caller].name}`;
    const r = mt.result;
    let res = '';
    if (r) res = r.ejected != null ? `${g.players[r.ejected].name} foi ejetado.` : r.tie ? 'Empate: ninguém ejetado.' : 'Ninguém ejetado (pulado).';
    const log = h('div', { class: 'hist-log' });
    mt.msgs.forEach((m) => log.appendChild(msgElement(g, m)));
    if (!mt.msgs.length) log.appendChild(h('p', { class: 'fine' }, 'Ninguém falou nesta reunião.'));
    return h('details', { class: 'hist' },
      h('summary', {}, title, res ? h('small', {}, ' — ' + res) : null),
      h('div', { class: 'hist-body' }, log, h('div', { class: 'hist-board' }, h('h4', {}, 'Quadro de álibis'), boardElement(g, mt.msgs, mt.alive, r ? { votes: r.votes } : null))));
  }

  AU.Meeting = Meeting;
  AU.MeetingView = { msgElement, boardElement, historyElement };
})();

/* Reuniões: fluxo de discussão/votação, chat em tempo real e ejeção. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, T = AU.Talk;
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
      this.impostorsLeft = g.S.room.impostors - g.players.filter((p) => p.ejected && p.isImp).length;
      this.humanClaimed = false;
      this.humanSpoke = false;
      this.closed = false;
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
      this.ui = g.headless ? null : new MeetingUI(this);
      for (const p of g.players) if (p.brain && p.alive && p.brain.mStart) p.brain.mStart(this);
      for (const p of g.players) {
        if (!p.brain || p.alive || p.ejected || p.deathT == null || p.deathT < info.roundStart) continue;
        if (!U.chance(0.6)) continue;
        this.schedule(U.rf(4, 14), p.brain, () => {
          const kind = p.brain.killedBy != null ? 'ghost' : 'ghostIdle';
          this.post(p, T.line(kind, { who: p.brain.killedBy }, g, p.brain), []);
        });
      }
    }

    get votingStart() { return this.durI + this.durD; }
    get votingEnd() { return this.durI + this.durD + this.durV; }

    schedule(delay, brain, fn, opts) {
      const base = Math.max(this.t, this.durI);
      const at = base + Math.max(0.2, delay);
      this.sched.push({ at, brain, fn, deadline: opts && opts.ttl ? at + opts.ttl : null });
    }

    update(dt) {
      if (this.closed) return;
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
        this.sched.sort((a, b) => a.at - b.at);
        let guard = 0;
        while (this.sched.length && this.sched[0].at <= t && guard++ < 20) {
          const it = this.sched.shift();
          if (it.deadline != null && t > it.deadline) continue;
          const b = it.brain;
          if (b && b.p.alive) {
            /* ritmo humano: um bot digita uma mensagem por vez e a sala não recebe rajadas */
            const free = Math.max(this.nextSlot || 0, b.nextSpeak || 0);
            if (t < free) {
              it.at = free + U.rf(0.05, 0.6);
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
      }
      if (this.phase === 'voting') {
        for (const id of Object.keys(this.voteAt)) {
          if (this.votes[id] !== undefined || t < this.voteAt[id]) continue;
          const p = this.g.players[+id];
          delete this.voteAt[id];
          if (!p.alive) continue;
          let v = 'skip';
          try {
            v = p.brain.mVote();
            if (AU.debug && AU.debug.trace && p.brain.why) (p.brain.whyLog = p.brain.whyLog || {})[this.info.index] = p.brain.why;
          } catch (e) {
            if (window.console) console.warn('voto falhou', e);
          }
          this.castVote(+id, v);
          if (U.chance(0.18 + p.brain.pers.talk * 0.2)) {
            this.post(p, T.line('voteSay', { who: v === 'skip' ? null : v }, this.g, p.brain), []);
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

    checkPrompts() {
      const g = this.g, h0 = g.human, t = this.t;
      const bots = this.alive.map((id) => g.players[id]).filter((p) => p.brain);
      if (!bots.length) return;
      if (h0 && h0.alive && this.info.kind === 'report' && this.info.caller === h0.id && !this.facts.bodyArea && !this.flags.askBody && t > this.durI + 6) {
        this.flags.askBody = true;
        const b = U.pick(bots);
        this.post(b, T.line('askBody', {}, g, b.brain, { question: true }), [{ type: 'askBody' }]);
      }
      if (h0 && h0.alive && !this.humanSpoke && !this.flags.quiet && t > this.durI + 24) {
        this.flags.quiet = true;
        const b = bots.find((p) => p.brain.pers.skeptic || p.brain.pers.leader) || null;
        if (b) this.post(b, T.line('quiet', { who: h0.id }, g, b.brain), [{ type: 'quiet', who: h0.id }]);
      }
      if (h0 && h0.alive && this.askedHumanAt != null && !this.humanClaimed && !this.flags.unanswered && t - this.askedHumanAt > 16) {
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
        let vt = U.rf(1.5, 5) + this.durV * 0.5 * b.pers.voteDelay * U.rf(0.5, 1.1);
        const top = !p.isImp && b.topSuspect ? b.topSuspect() : null;
        if (top && top.s >= 90) vt *= 0.4;
        this.voteAt[id] = this.votingStart + Math.min(vt, this.durV - 3);
      }
    }

    humanSay(text) {
      const g = this.g, hp = g.human;
      text = String(text || '').trim().slice(0, 120);
      if (!text || !hp || this.closed) return;
      if (this.phase !== 'discussion' && this.phase !== 'voting') return;
      if (!hp.alive) {
        this.post(hp, text, []);
        return;
      }
      const intents = T.parse(text, g, {
        addressed: this.lastToHuman != null ? this.lastToHuman : this.lastSpeaker,
        humanReported: this.info.kind === 'report' && this.info.caller === hp.id,
        bodyKnown: !!this.facts.bodyArea,
      });
      this.post(hp, text, intents);
    }

    post(p, text, intents) {
      if (this.closed || !text) return;
      const g = this.g;
      const msg = { id: ++this.msgId, from: p.id, text, intents: intents || [], t: this.t, fromHuman: p.isHuman, ghost: !p.alive };
      if (msg.ghost) {
        this.ghostMsgs.push(msg);
        if (this.ui) this.ui.addMsg(msg);
        return;
      }
      this.msgs.push(msg);
      if (p.isHuman) {
        this.humanSpoke = true;
        this.nextSlot = Math.max(this.nextSlot || 0, this.t + 0.8 * this.pace);
      } else {
        this.lastSpeaker = p.id;
        this.nextSlot = this.t + U.rf(0.55, 1.5) * this.pace;
        if (p.brain) p.brain.nextSpeak = this.t + (1.3 + text.length / 13) * this.pace * (p.brain.pers.talk < 0.3 ? 1.5 : 1);
      }
      const hp = g.human;
      for (const it of msg.intents) {
        if (it.type === 'accuse' || it.type === 'agree') {
          const w = it.type === 'agree' ? 8 : STRONG[it.reason] ? 30 : 12;
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
      this.resultsEnd = this.t + (this.g.headless ? 0.1 : 4.2);
      if (this.ui) this.ui.showResults();
    }

    close() {
      if (this.closed) return;
      this.closed = true;
      if (this.ui) this.ui.destroy();
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
      this.root = h('div', { class: 'meeting', role: 'dialog', 'aria-label': 'Reunião' });
      this.splash = h('div', { class: 'mt-splash ' + (isReport ? 'report' : 'emergency') },
        h('div', { class: 'mt-splash-icon', html: isReport ? AU.Render.beanSVG(g.players[info.body.pid].color, { dead: true, size: 150 }) : '<div class="mt-bell">!</div>' }),
        h('div', { class: 'mt-splash-title' }, isReport ? 'Corpo reportado' : 'Reunião de emergência'),
        h('div', { class: 'mt-splash-sub' }, isReport ? `${caller.name} encontrou o corpo de ${g.players[info.body.pid].name}` : `${caller.name} apertou o botão`));
      this.timer = h('div', { class: 'mt-timer' }, '');
      this.cards = h('div', { class: 'mt-cards' });
      this.log = h('div', { class: 'mt-log', 'aria-live': 'polite' });
      this.input = h('input', { class: 'mt-input', id: 'mt-input', type: 'text', maxlength: '120', placeholder: hp && hp.alive ? 'Digite no chat… (Enter envia)' : 'Chat dos fantasmas…', autocomplete: 'off' });
      this.sendBtn = h('button', { class: 'mt-send', type: 'submit' }, 'Enviar');
      const form = h('form', { class: 'mt-form' }, this.input, this.sendBtn);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.send();
      });
      this.input.addEventListener('keydown', (e) => e.stopPropagation());
      const chips = ['onde foi o corpo?', 'onde vocês estavam?', 'eu tava na ', 'vi o ', 'skip', 'quem?'].map((c) =>
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
        h('div', {}, h('div', { class: 'mt-title' }, isReport ? 'Corpo reportado' : 'Reunião de emergência'),
          h('div', { class: 'mt-sub' }, isReport ? `${caller.name} reportou · vítima: ${g.players[info.body.pid].name}` : `Chamada por ${caller.name}`)),
        this.timer);
      const left = h('div', { class: 'mt-left' }, this.cards, h('div', { class: 'mt-skiprow' }, this.skipBtn, this.skipVotes), this.status);
      const right = h('div', { class: 'mt-right' }, this.log, h('div', { class: 'mt-chips' }, chips), form);
      this.panel = h('div', { class: 'mt-panel' }, head, h('div', { class: 'mt-body' }, left, right));
      this.eject = h('div', { class: 'mt-eject', hidden: true });
      this.root.appendChild(this.panel);
      this.root.appendChild(this.splash);
      this.root.appendChild(this.eject);
      document.getElementById('meeting-layer').appendChild(this.root);
      this.cardEls = {};
      this.selected = null;
      g.players.forEach((p) => this.makeCard(p));
      this.onPhase();
    }
    makeCard(p) {
      const g = this.g, mt = this.mt, hp = g.human;
      const dead = !p.alive;
      const partner = hp && hp.isImp && p.isImp;
      const conf = h('div', { class: 'mt-confirm', hidden: true },
        h('button', { class: 'yes', type: 'button', 'aria-label': 'Confirmar voto', onclick: (e) => { e.stopPropagation(); this.confirm(p.id); } }, '✓'),
        h('button', { class: 'no', type: 'button', 'aria-label': 'Cancelar', onclick: (e) => { e.stopPropagation(); this.cancel(); } }, '✕'));
      const voters = h('div', { class: 'mt-voters' });
      const badge = h('span', { class: 'mt-badge', hidden: true }, 'VOTOU');
      const card = h('button', {
        class: 'mt-card' + (dead ? ' dead' : '') + (p.isHuman ? ' me' : '') + (partner ? ' partner' : ''),
        type: 'button', disabled: dead,
        onclick: () => this.pick(p.id),
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
      if (mt.phase !== 'intro') this.splash.classList.add('gone');
      const canVote = mt.phase === 'voting' && hp && hp.alive && mt.votes[hp.id] === undefined;
      this.root.classList.toggle('can-vote', !!canVote);
      this.skipBtn.disabled = !canVote;
      if (mt.phase === 'discussion' && hp && hp.alive && window.matchMedia('(pointer:fine)').matches) setTimeout(() => this.input.focus(), 60);
      this.status.textContent = !hp || !hp.alive ? 'Você está morto: só pode assistir e falar no chat dos fantasmas.' : mt.phase === 'discussion' ? 'Discussão: a votação ainda não abriu.' : mt.phase === 'voting' ? (canVote ? 'Clique num jogador para votar, ou pule.' : 'Voto registrado.') : '';
    }
    tick() {
      const mt = this.mt;
      let label = '';
      if (mt.phase === 'discussion') label = 'Discussão · ' + Math.ceil(mt.votingStart - mt.t) + 's';
      else if (mt.phase === 'voting') label = 'Votação · ' + U.fmtTime(mt.votingEnd - mt.t);
      else if (mt.phase === 'results') label = 'Resultado';
      if (this.timer.textContent !== label) this.timer.textContent = label;
    }
    pick(id) {
      const mt = this.mt, hp = this.g.human;
      if (mt.phase === 'discussion' && id !== 'skip') {
        const p = this.g.players[id];
        this.input.value = (this.input.value ? this.input.value + ' ' : '') + C.COLOR[p.color].name.toLowerCase();
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
    }
    addMsg(msg) {
      const g = this.g, hp = g.human;
      if (msg.ghost && hp && hp.alive) return;
      const p = g.players[msg.from];
      const col = C.COLOR[p.color];
      const line = h('div', { class: 'mt-msg' + (msg.fromHuman ? ' mine' : '') + (msg.ghost ? ' ghost' : '') },
        h('span', { class: 'mt-msg-bean', html: AU.Render.beanSVG(p.color, { size: 26, visor: p.visor, ghost: msg.ghost }) }),
        h('div', { class: 'mt-msg-body' },
          h('div', { class: 'mt-msg-name', style: { color: readable(col) } }, p.name + (msg.ghost ? ' 👻' : '')),
          h('div', { class: 'mt-msg-text' }, msg.text)));
      const stick = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 60;
      this.log.appendChild(line);
      if (stick || msg.fromHuman) this.log.scrollTop = this.log.scrollHeight;
      if (!msg.fromHuman) AU.Audio.play('chat');
    }
    showResults() {
      const mt = this.mt, g = this.g;
      const r = mt.result;
      this.root.classList.remove('can-vote');
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
        if (i >= full.length) {
          clearInterval(iv);
          t2.textContent = line2;
        }
      }, 45);
      this.iv = iv;
    }
    destroy() {
      if (this.iv) clearInterval(this.iv);
      this.root.remove();
    }
  }

  AU.Meeting = Meeting;
})();

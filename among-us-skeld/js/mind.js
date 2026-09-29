/* Raciocínio dos bots nas reuniões: evidências, suspeita, fala, reações e voto. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, M = AU.Map, T = AU.Talk, C = AU.C;
  const B = AU.Brain.prototype;

  const STRONG = { kill: 1, vent: 0.85, shift: 1, vanish: 0.95 };
  const CLAIM_W = { kill: 70, vent: 58, shift: 36, vanish: 32, noscan: 32, fakeTask: 30, follow: 8, nearBody: 13, lastWith: 16, lie: 24, tracker: 30, sus: 16, hunch: 3, claim: 16, vote: 7, mention: 4, fromBody: 14, fastReport: 16, voteSkip: 12, votePush: 6, pactVictim: 0 };

  B.mStart = function (mt) {
    const g = this.g, p = this.p;
    this.mt = mt;
    this.rs = mt.info.roundStart;
    this.budget = Math.round(1 + this.pers.talk * 3.2 + (this.pers.offtopic ? 1 : 0));
    this.claimed = false;
    this.claimPosted = false;
    this.heardAcc = {};
    this.sharedWindow = null;
    this.killWindow = null;
    this.denies = 0;
    this.nextSpeak = 0;
    this.chatDelta = {};
    this.chatSocial = {};
    this.chatClaim = {};
    this.noise = {};
    this.accusedMe = {};
    this.defendedBy = {};
    this.skipLean = 0;
    this.replied = new Set();
    this.repliedTo = new Set();
    this.lastAccusation = null;
    this.knowsBody = null;
    this.sawBodyMyself = false;
    this.claims = {};
    this.claimFull = {};
    this.contraBump = {};
    this.clashAdj = {};
    this.clashList = [];
    this.voted = false;
    this.askedHuman = false;
    this.alibi = null;
    this.committed = null;
    this.verify = null;
    this.offered = null;
    this.pactReq = null;
    this.pactAsked = null;
    this.deniedTo = new Set();
    const body = mt.info.body;
    if (body && (this.mem.bodies.some((b) => b.id === body.id) || mt.info.caller === p.id)) {
      this.knowsBody = body.area;
      this.sawBodyMyself = true;
    }
    for (const q of g.players) this.noise[q.id] = this.pers.hunch ? U.rf(-12, 18) * this.pers.hunch * 2 : 0;
    if (p.isImp) this.impPrep();
    else this.evidence();
    this.queue = this.buildAgenda();
    /* as primeiras falas já saem compostas, para a IA poder reescrevê-las no estilo do bot */
    let pre = 0;
    for (const it of this.queue) {
      if (pre >= 2 || !PRECOMPOSE.has(it.k) || it.late) continue;
      const m = this.compose(it);
      if (m) {
        it.pre = m;
        pre++;
      } else it.dead = true;
    }
    this.queue = this.queue.filter((it) => !it.dead);
    /* o jogador apertou o botão: a palavra é dele primeiro (os outros esperam ouvir o motivo) */
    const humanCalled = g.human && g.human.alive && mt.info.caller === g.human.id && mt.info.kind === 'emergency';
    const first = (mt.info.caller === p.id ? U.rf(0.8, 1.8) : humanCalled ? U.rf(8, 14) : U.rf(2.5, 8)) * mt.pace;
    mt.schedule(first, this, () => this.nextAgenda(), { agenda: true });
  };
  const PRECOMPOSE = new Set(['reportInfo', 'reportDetail', 'callReason', 'organize', 'accuse', 'panic', 'claimLoc', 'vouch', 'vitals', 'tracker', 'camsInfo', 'adminInfo', 'offtopic', 'lost', 'frame', 'twin']);

  /* ---------- evidências (tripulante) ---------- */
  B.evidence = function () {
    const g = this.g, me = this.p.id, rs = this.rs;
    const ev = {};
    const add = (id, w, reason, extra) => {
      if (id === me || id == null) return;
      (ev[id] = ev[id] || []).push(Object.assign({ w, reason }, extra || {}));
    };
    const engineers = (g.S.roles.engenheiro || {}).n > 0;
    const visDone = new Set();
    const twinDone = new Set();
    for (const e of this.mem.events) {
      /* vi dois iguais: o dono da cara não é o metamorfo; com um impostor só em jogo, ele e quem estava à vista nessa
         hora são tripulantes com certeza */
      if (e.type === 'twin') {
        if (!e.self && !twinDone.has(e.who)) {
          twinDone.add(e.who);
          add(e.who, e.solo ? -60 : -14, 'twin', { area: e.a1, area2: e.a2, past: e.t < rs, solo: e.solo, t: e.t });
        }
        if (e.solo) for (const id of e.with || []) if (!twinDone.has('w' + id)) {
          twinDone.add('w' + id);
          add(id, -30, 'twinWith', { area: e.a1, past: e.t < rs, t: e.t });
        }
        continue;
      }
      /* memória da partida inteira: tarefa visual vista em qualquer rodada inocenta; o que viu de grave antes continua valendo */
      if ((e.type === 'visual' || e.type === 'escortVisual') && g.S.rules.visualTasks && !visDone.has(e.who)) {
        visDone.add(e.who);
        add(e.who, g.S.house.noVisualHardClear ? -25 : -70, 'visual', { task: e.task, area: e.area, past: e.t < rs });
        continue;
      }
      /* com metamorfo na partida, "vi fulano matar" pode ser o disfarce (o metamorfo mata na frente dos outros com a
         cara de alguém): prova forte, mas não certeza */
      const kw = roleOn(g, 'metamorfo') ? 0.6 : 1;
      if (e.t < rs) {
        if (e.type === 'kill') add(e.who, 90 * kw, 'kill', { area: e.area, victim: e.victim, past: true, t: e.t });
        else if (e.type === 'vent') add(e.who, engineers ? 40 : 75, 'vent', { area: e.area, past: true, t: e.t });
        else if (e.type === 'shift' || e.type === 'vanish') add(e.who, 80, e.type, { area: e.area, past: true });
        continue;
      }
      if (e.type === 'kill') add(e.who, 100 * kw, 'kill', { area: e.area, victim: e.victim, t: e.t });
      else if (e.type === 'vent') add(e.who, engineers ? 50 : 88, 'vent', { area: e.area, t: e.t });
      else if (e.type === 'shift') add(e.who, 100, 'shift', { area: e.area });
      else if (e.type === 'vanish') add(e.who, 95, 'vanish', { area: e.area });
      else if (e.type === 'noscan') add(e.who, 32, 'noscan', { area: e.area, t: e.t, task: e.task });
      else if (e.type === 'fakeTask') add(e.who, 34, 'fakeTask', { area: e.area, t: e.t });
      else if (e.type === 'follow') add(e.who, 6, 'follow', { area: e.area, t: e.t });
    }
    /* mentiras que ele mesmo pegou em reuniões anteriores; e quem já ficou sozinho com ele sem matar */
    for (const id of Object.keys(this.mem.lies || {})) if (this.mem.lies[id] > 0) add(+id, Math.min(30, 12 * this.mem.lies[id]), 'lie', { past: true });
    for (const id of Object.keys(this.mem.spared || {})) if (this.mem.spared[id] >= 10) add(+id, -Math.min(14, this.mem.spared[id] * 0.6), 'spared', { secs: Math.round(this.mem.spared[id]), past: true });
    const tog = this.togetherMap();
    for (const id of Object.keys(tog)) if (tog[id] >= 20) add(+id, -12, 'together', { secs: tog[id] });
    /* comportamento estranho durante a rodada (chamou para seguir e enrolou, ficou na cola) */
    for (const id of Object.keys(this.fieldSus || {})) if (this.fieldSus[id] >= 6) add(+id, Math.min(22, this.fieldSus[id]), 'odd');
    /* prometeu provar com tarefa visual, foi seguido e não provou */
    for (const e of this.mem.events) if (e.type === 'noProof' && e.t >= rs) add(e.who, 16, 'noProof');
    /* combinou dupla com quem morreu nesta rodada (todo mundo ouviu o combinado): cadê o parceiro? */
    for (const pc of g.publicPacts || []) {
      if (!(pc.from === g.meetings - 1 || (pc.scope === 'game' && pc.from < g.meetings))) continue;
      for (const [v, x] of [[pc.a, pc.b], [pc.b, pc.a]]) {
        const V = g.players[v], X = g.players[x];
        if (!V || !X || V.alive || V.ejected || !X.alive || V.deathT < rs) continue;
        add(x, 3, 'pactVictim', { victim: v });
      }
    }
    /* "fiquei sozinho com ele e ele não me matou" */
    const alone = this.aloneWith || {};
    for (const id of Object.keys(alone)) if (alone[id] >= 6) add(+id, -9, 'spared', { secs: alone[id] });
    this.ev = ev;
    if (this.knowsBody) this.bodyEvidence(this.knowsBody);
    this.dropWeakOnCleared();
    this.twinDiscount();
    this.recalc();
  };
  /* O que "o X" fez perto da hora em que eu vi dois X (o disfarce dura no máximo o tempo da habilidade, para trás e
     para frente) pode ter sido o metamorfo com a cara dele: a pista contra o X perde quase toda a força. */
  B.twinDiscount = function () {
    if (!this.ev) return;
    const dur = this.g.ro('metamorfo', 'dur', 30) + 2;
    const cut = (id, e, any) => {
      for (const x of this.ev[id] || []) {
        if (x.w <= 0 || x.twinCut || (!any && (x.t == null || Math.abs(x.t - e.t) > dur))) continue;
        x.twinCut = true;
        x.w *= any ? 0.1 : 0.25;
      }
    };
    for (const e of this.mem.events) {
      if (e.type !== 'twin') continue;
      /* com um impostor só, o metamorfo era o único: o dono da cara (e quem estava à vista) nunca foi impostor, então
         tudo o que "eles" fizeram de suspeito foi o disfarce */
      if (!e.self) cut(e.who, e, !!e.solo);
      if (e.solo) for (const id of e.with || []) cut(id, e, true);
    }
  };
  /* Quem já provou ser tripulante não leva acusação fraca (seguiu, perto do corpo, estranho...): o bot lembra. */
  B.dropWeakOnCleared = function () {
    if (!this.ev) return;
    for (const id of Object.keys(this.ev)) {
      if (!this.hardCleared(+id)) continue;
      this.ev[id] = this.ev[id].filter((e) => e.w <= 0 || STRONG[e.reason]);
    }
  };

  /* Os primeiros segundos de cada rodada acontecem com todos juntos na Cafeteria: não contam como pista. */
  const GRACE = 9;
  B.graceT = function () {
    return this.rs + GRACE;
  };

  B.togetherMap = function () {
    const tog = {};
    const g0 = this.graceT();
    for (const s of this.mem.seen) {
      if (s.t1 < g0 || s.via !== 'eyes') continue;
      tog[s.who] = (tog[s.who] || 0) + (s.t1 - s.t0);
    }
    return tog;
  };

  /* tempo junto (visto com os próprios olhos) a partir de um instante */
  B.togetherSince = function (from) {
    const tog = {};
    for (const s of this.mem.seen) {
      if (s.t1 < from || s.via !== 'eyes') continue;
      tog[s.who] = (tog[s.who] || 0) + (s.t1 - Math.max(s.t0, from));
    }
    return tog;
  };
  /* o trecho da rodada que o álibi cobre: os últimos ~45s antes da reunião */
  B.claimWindow = function () {
    return Math.max(this.graceT(), (this.mt ? this.mt.info.t : this.g.t) - 45);
  };

  /* fração da janela do abate vigiando alguém para ele contar como "não foi ele" */
  B.watchCov = 0.9;

  B.bodyEvidence = function (bodyArea) {
    if (this.p.isImp || !this.ev) return;
    const mt = this.mt, me = this.p.id;
    const victim = mt.info.body ? mt.info.body.pid : null;
    const reporter = mt.info.kind === 'report' ? mt.info.caller : null;
    const tR = mt.info.t;
    for (const id of Object.keys(this.ev)) this.ev[id] = this.ev[id].filter((e) => !['nearBody', 'lastWith', 'alibi', 'withVictim', 'fromBody', 'ventLink', 'fastReport', 'tracker', 'trackedAway'].includes(e.reason));
    const add = (id, w, reason, extra) => {
      if (id === me || id === victim) return;
      if (w > 0 && this.hardCleared(id)) return;
      const list = (this.ev[id] = this.ev[id] || []);
      const ex = list.find((e) => e.reason === reason);
      if (ex) {
        if (Math.abs(w) > Math.abs(ex.w)) Object.assign(ex, { w }, extra);
        return;
      }
      list.push(Object.assign({ w, reason }, extra || {}));
    };
    const g0 = this.graceT();
    const vSeen = victim != null ? this.mem.seen.filter((s) => s.who === victim && s.t1 >= g0) : [];
    const lastV = vSeen[vSeen.length - 1];
    const myBody = this.mem.bodies.find((b) => mt.info.body && b.id === mt.info.body.id);
    const tFound = myBody ? Math.min(myBody.t, tR) : tR;
    const tFrom = Math.max(g0, lastV ? lastV.t1 - 5 : g0);
    const hall = M.AREA[bodyArea] && M.AREA[bodyArea].kind === 'hall';
    for (const s of this.mem.seen) {
      if (s.t1 < tFrom || s.who === victim || s.t1 - s.t0 < 0.3 || s.t0 > tFound + 1) continue;
      /* quem reporta anda até o corpo: essa aproximação não é pista */
      if (s.who === reporter && s.t1 > tR - 10) continue;
      const inBody = s.area === bodyArea;
      if (!inBody && !M.isNear(s.area, bodyArea)) continue;
      const age = tFound - s.t1;
      /* só presença recente perto do corpo diz algo; passagens antigas são ruído */
      const w = inBody ? (age < 15 ? 24 : age < 25 ? 11 : 0) : age < 8 ? 12 : age < 15 ? 7 : 0;
      if (w > 0) add(s.who, w * (hall ? 0.75 : 1), 'nearBody', { area: s.area, bodyArea, t: s.t1 });
    }
    if (lastV) {
      const recentV = tFound - lastV.t1 < 30;
      const ids = [...new Set(this.mem.seen
        .filter((s) => s.who !== victim && s.who !== me && s.area === lastV.area && s.t1 >= lastV.t0 - 3 && s.t0 <= lastV.t1 + 3)
        .map((s) => s.who))];
      if (recentV) {
        if (ids.length === 1) add(ids[0], 18, 'lastWith', { area: lastV.area, victim, t: lastV.t1 });
        else ids.forEach((id) => add(id, 6, 'lastWith', { area: lastV.area, victim, t: lastV.t1 }));
      }
    }
    /* ---------- janela do abate ----------
       Começa na última vez que vi a vítima viva, na última vez que EU passei na sala do corpo (e não tinha corpo)
       ou no que alguém de confiança contou ("passei lá há 20s e não tinha corpo"). Quem eu vi longe durante a
       janela, longe demais para ir até o corpo e voltar, não pode ter matado: álibi proporcional à cobertura. */
    let tStart = lastV ? lastV.t1 : null;
    const BA = M.AREA[bodyArea];
    const seeAll = BA && BA.kind === 'room' && Math.max(BA.rect[2], BA.rect[3]) <= 18;
    const myPass = seeAll ? this.mem.trail.filter((x) => x.t1 >= g0 && x.area === bodyArea && x.t1 <= tFound - 1 && x.t1 - x.t0 >= 2).pop() : null;
    if (myPass) tStart = Math.max(tStart || 0, myPass.t1);
    if (this.sharedWindow && this.sharedWindow.area === bodyArea) tStart = Math.max(tStart || 0, this.sharedWindow.t);
    this.killWindow = tStart != null && tFound - tStart < 90 ? { t0: tStart, t1: tFound, area: bodyArea, mine: !!myPass && myPass.t1 === tStart } : null;
    /* reportou rápido demais: a vítima estava viva poucos segundos antes do report. Nas partidas de teste, quem acha
       o corpo até ~8s depois do abate era o próprio impostor em mais da metade das vezes (self report) */
    if (reporter != null && reporter !== me && tStart != null && tR - tStart <= 10) {
      const fresh = Math.max(0, tR - tStart);
      /* se eu estava vendo quem reportou durante esse tempo (fomos juntos até o corpo), não foi ele */
      let watched = 0;
      for (const x of this.mem.seen) if (x.who === reporter && x.via === 'eyes') watched += Math.max(0, Math.min(x.t1, tR) - Math.max(x.t0, tStart));
      if (watched < Math.max(1, fresh) * 0.5) add(reporter, Math.round(24 - fresh), 'fastReport', { ago: Math.max(1, Math.round(fresh)), victim, area: bodyArea });
    }
    if (this.killWindow) {
      const W0 = this.killWindow.t0, W1 = tFound, len = Math.max(2, W1 - W0);
      const byWho = {};
      for (const s of this.mem.seen) {
        if (s.who === victim || s.who === me || s.via === 'track' || s.t1 < W0 - 25 || s.t0 > W1) continue;
        if (s.area === bodyArea || M.isNear(s.area, bodyArea)) continue;
        const T = this.reachTime(s.area, bodyArea, s.who);
        (byWho[s.who] = byWho[s.who] || []).push([Math.max(W0, s.t0 - T), Math.min(W1, s.t1 + T), s.area]);
      }
      for (const id of Object.keys(byWho)) {
        const iv = byWho[id].filter((x) => x[1] > x[0]).sort((x, y) => x[0] - y[0]);
        let cov = 0, cur = null;
        for (const [a, b] of iv) {
          if (!cur || a > cur[1]) {
            if (cur) cov += cur[1] - cur[0];
            cur = [a, b];
          } else cur[1] = Math.max(cur[1], b);
        }
        if (cur) cov += cur[1] - cur[0];
        const c = Math.min(1, cov / len);
        /* com mais de um impostor vivo, estar longe só prova que não foi ELE neste abate (pode ser o parceiro) */
        const impsLeft = this.g.S.rules.confirmEjects ? mt.impostorsLeft : this.g.S.room.impostors;
        const k = impsLeft > 1 ? 0.5 : 1;
        if (c >= 0.25) add(+id, -Math.round((10 + 24 * c) * k), 'alibi', { area: iv[iv.length - 1] ? iv[iv.length - 1][2] : null, cover: c, solo: impsLeft <= 1 });
      }
    }
    /* rastreador: onde o rastreado estava na janela do abate (depois da última vez que a vítima foi vista viva).
       Parado na sala do corpo nessa janela = prova forte; longe o tempo todo = álibi. Passar lá antes não conta. */
    if (this.p.special === 'rastreador') {
      const W0 = this.killWindow ? this.killWindow.t0 : tFound - 12;
      const byWho = {};
      for (const x of this.mem.track) if (x.t >= W0 - 1 && x.t <= tFound) (byWho[x.who] = byWho[x.who] || []).push(x);
      for (const id of Object.keys(byWho)) {
        const xs = byWho[id];
        const inRoom = xs.filter((x) => x.area === bodyArea).length;
        if (inRoom >= 1) add(+id, (this.killWindow ? 30 : 16) + (inRoom >= 3 ? 10 : 0), 'tracker', { area: bodyArea });
        else if (!xs.some((x) => x.area === bodyArea || M.isNear(x.area, bodyArea)) && xs.length >= Math.min(10, (tFound - W0) * 0.6)) add(+id, -18, 'trackedAway', { area: xs[xs.length - 1].area });
      }
    }
    /* quem foi visto vindo da direção do corpo, pouco antes de ele ser achado */
    const bc = M.AREA[bodyArea];
    if (bc) {
      for (const s of this.mem.seen) {
        if (s.who === victim || s.who === me || s.x0 == null || s.t1 < tFrom || s.t0 > tFound + 1 || tFound - s.t1 > 25) continue;
        if (s.who === reporter && s.t1 > tR - 10) continue;
        if (s.area !== bodyArea && !M.isNear(s.area, bodyArea)) continue;
        const d0 = Math.hypot(s.x0 - bc.cx, s.y0 - bc.cy), d1 = Math.hypot(s.x - bc.cx, s.y - bc.cy);
        if (d1 - d0 >= 2.5) add(s.who, 15, 'fromBody', { area: s.area, bodyArea, t: s.t1 });
      }
    }
    /* apareceu do nada numa sala ligada por duto à sala do corpo, pouco antes de acharem */
    const linked = new Set();
    for (const v of M.VENTS) if (v.area === bodyArea) v.links.forEach((l) => linked.add(M.VENT[l].area));
    linked.delete(bodyArea);
    if (linked.size) {
      for (const s of this.mem.seen) {
        if (s.who === victim || s.who === me || s.via !== 'eyes' || !linked.has(s.area)) continue;
        if (s.t0 < tFound - 20 || s.t0 > tFound + 1) continue;
        /* "apareceu": o bot já estava na sala e a pessoa surgiu no meio dela (não pela porta) */
        const r = M.AREA[s.area];
        if (!r || r.kind !== 'room' || s.x0 == null || Math.hypot(s.x0 - r.cx, s.y0 - r.cy) > Math.min(r.rect[2], r.rect[3]) * 0.45) continue;
        if (this.myStay(s.area) < 6) continue;
        add(s.who, 8, 'ventLink', { area: s.area, bodyArea, t: s.t0 });
      }
    }
    /* quem foi visto andando colado na vítima pouco antes */
    if (victim != null) {
      for (const k of Object.keys(this.mem.pairs)) {
        const pr = this.mem.pairs[k];
        if (pr.a !== victim && pr.b !== victim) continue;
        const other = pr.a === victim ? pr.b : pr.a;
        if (other === me || pr.t1 < g0 || tFound - pr.t1 > 25 || pr.n < 4) continue;
        if (pr.area !== bodyArea && !M.isNear(pr.area, bodyArea)) continue;
        add(other, pr.alone ? 14 : 7, 'withVictim', { area: pr.area, victim, t: pr.t1 });
      }
    }
    /* fiquei vendo a pessoa quase o tempo todo desde que a vítima foi vista viva: não foi ela neste abate
       (então "estava com a vítima" ou "perto do corpo" não é pista contra ela) */
    const W0 = this.killWindow ? this.killWindow.t0 : lastV ? lastV.t1 : null;
    if (W0 != null && tFound - W0 >= 4) {
      const len = tFound - W0, cov = {};
      for (const x of this.mem.seen) {
        if (x.via !== 'eyes' || x.who === victim || x.who === me) continue;
        const a = Math.max(W0, x.t0), b = Math.min(tFound, x.t1);
        if (b > a) cov[x.who] = (cov[x.who] || 0) + (b - a);
      }
      for (const id of Object.keys(cov)) {
        if (cov[id] / len < this.watchCov) continue;
        if (this.ev[id]) this.ev[id] = this.ev[id].filter((e) => !['lastWith', 'withVictim', 'nearBody', 'fromBody', 'ventLink'].includes(e.reason));
        const many = (this.g.S.rules.confirmEjects ? mt.impostorsLeft : this.g.S.room.impostors) > 1;
        add(+id, many ? -14 : -24, 'alibi', { area: null, cover: Math.min(1, cov[id] / len), solo: !many });
      }
    }
    /* "ficou comigo e não me matou" não apaga "estava com a vítima / vinha do corpo": só prova que não me matou */
    for (const id of Object.keys(this.ev)) {
      const list = this.ev[id];
      if (!list.some((e) => ['lastWith', 'withVictim', 'fromBody'].includes(e.reason) || (e.reason === 'nearBody' && e.w >= 15))) continue;
      for (const e of list) if ((e.reason === 'together' || e.reason === 'spared') && e.w < -4) e.w = -4;
    }
    this.twinDiscount();
    this.recalc();
  };

  B.recalc = function () {
    const g = this.g;
    for (const q of g.players) {
      if (q.id === this.p.id) continue;
      const cd = this.chatDelta[q.id] || 0, cs = this.chatSocial[q.id] || 0, cc = this.chatClaim[q.id] || 0;
      const cx = (this.clashAdj && this.clashAdj[q.id]) || 0;
      let s = (this.carry[q.id] || 0) * 0.5 + (this.noise[q.id] || 0) + cd + U.clamp(cs, -35, 28) + U.clamp(cc, -40, 70) + U.clamp(cx, -12, 30);
      if (this.ev && this.ev[q.id]) for (const e of this.ev[q.id]) s += e.w;
      if (this.pers.skeptic) s += 4;
      if (this.pers.defend && s > 0) s *= 0.75;
      this.susp[q.id] = U.clamp(s, -100, 160);
    }
  };

  B.trust = function (id) {
    if (id === this.p.id) return 1;
    /* quem já mentiu, ou acusou alguém que eu sei que é inocente, perde credibilidade */
    const lies = (this.mem && this.mem.lies && this.mem.lies[id]) || 0;
    const fa = (this.falseAcc && this.falseAcc[id]) || 0;
    const known = this.hardCleared && this.hardCleared(id) ? 0.25 : 0;
    return U.clamp(this.pers.trust - (this.susp[id] || 0) / 110 - lies * 0.2 - fa * 0.3 + known, 0.05, 1.3);
  };

  /* kind: 'own' (o que o próprio bot viu), 'social' (opinião alheia, limitada), 'claim' (relato forte de outro). */
  B.bump = function (id, d, kind) {
    if (id == null || id === this.p.id) return;
    const bag = kind === 'social' ? this.chatSocial : kind === 'claim' ? this.chatClaim : this.chatDelta;
    bag[id] = (bag[id] || 0) + d;
    this.recalc();
  };

  /* ---------- mentira do impostor ---------- */
  B.impPrep = function () {
    const g = this.g, p = this.p, rs = this.rs, mt = this.mt;
    const kills = this.mem.events.filter((e) => e.type === 'myKill' && e.t >= rs);
    const bad = (seg) => kills.some((k) => (seg.area === k.area || M.isNear(seg.area, k.area)) && seg.t1 >= k.t - 14 && seg.t0 <= k.t + 10);
    const from = Math.max(rs + 5, mt.info.t - 35);
    const trail = this.mem.trail.filter((s) => s.t1 >= from && s.t1 - Math.max(s.t0, from) >= 1.5);
    /* impostor esperto não esconde o que alguém viu: se tinha tripulante olhando quando passou perto do abate,
       admite que passou lá ("passei, mas não vi nada") em vez de ser pego na mentira */
    const watched = (seg) => this.mem.seen.some((x) => x.via === 'eyes' && g.players[x.who] && g.players[x.who].alive && !g.players[x.who].isImp &&
      x.t1 >= seg.t0 - 1 && x.t0 <= seg.t1 + 1 && (x.area === seg.area || M.isNear(x.area, seg.area)));
    let safe = trail.filter((s) => !bad(s) || (this.lvl.lie >= 0.5 && watched(s)));
    const exposed = kills.some((k) => (k.seenBy || []).length > 0);
    this.fakeRooms = [];
    const roomsOf = (segs) => {
      const out = [];
      for (const s of segs) {
        const r = placeOf(s, s.t1 - Math.max(s.t0, from));
        if (r && out[out.length - 1] !== r) out.push(r);
      }
      return out;
    };
    let rooms = roomsOf(safe).filter((r, i, a) => a.lastIndexOf(r) === i).slice(-3);
    if (!rooms.length) {
      const near = kills.length ? M.ROOMS.filter((r) => r.id !== kills[0].area && !M.isNear(r.id, kills[0].area)) : M.ROOMS;
      rooms = [U.pick(near).id];
    }
    if (exposed && kills.length) {
      const ka = M.AREA[kills[0].area];
      const kr = ka.kind === 'room' ? ka.id : M.roomOf(ka, ka.cx, ka.cy).id;
      if (!rooms.includes(kr)) rooms = [kr].concat(rooms).slice(-2);
    }
    this.fakeRooms = rooms;
    const tk = p.tasks.find((x) => M.STATIONS[x.steps[0]].area === rooms[rooms.length - 1]);
    this.fakeTask = tk ? tk.id : null;
    const bodyArea = mt.info.body ? mt.info.body.area : null;
    const cands = g.players.filter((q) => q.alive && !q.isImp);
    let best = null, bs = -1e9;
    for (const q of cands) {
      let s = (this.carry[q.id] || 0) * 0.4 + U.rf(0, 12) - (q.isHuman ? 6 : 0) + (q.id === this.framedX ? 45 : 0);
      if (bodyArea && this.mem.seen.some((x) => x.who === q.id && x.t1 >= this.graceT() && (x.area === bodyArea || M.isNear(x.area, bodyArea)))) s += 22;
      if (s > bs) {
        bs = s;
        best = q;
      }
    }
    this.scapegoat = best ? best.id : null;
    this.scapegoatReal = best && bodyArea ? best.id === this.framedX || this.mem.seen.some((x) => x.who === best.id && x.t1 >= this.graceT() && (x.area === bodyArea || M.isNear(x.area, bodyArea))) : false;
    this.framedX = null;
    this.ev = {};
    for (const q of g.players) this.susp[q.id] = q.isImp ? -100 : (this.carry[q.id] || 0) * 0.3;
  };

  /* ---------- agenda de falas ---------- */
  B.buildAgenda = function () {
    const g = this.g, p = this.p, mt = this.mt, pers = this.pers;
    const items = [];
    const info = mt.info;
    if (info.kind === 'report' && info.caller === p.id) {
      items.push({ k: 'reportInfo' });
      items.push({ k: 'reportDetail' });
    }
    if (info.kind === 'emergency' && info.caller === p.id) items.push({ k: 'callReason' });
    if (pers.leader && info.caller !== p.id) items.push({ k: 'organize' });
    if (!p.isImp) {
      const strong = [];
      /* flagrante perto da hora em que vi dois iguais pode ter sido o disfarce: não acuso, conto os dois (item 'twin') */
      for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) if (STRONG[e.reason] && !e.twinCut && !(info.kind === 'emergency' && info.caller === p.id && this.wantButton && this.wantButton.who === +id)) {
        /* viu no duto alguém que já provou ser tripulante, e tem engenheiro na partida: pergunta em vez de acusar */
        /* com engenheiro na partida, quase todo mundo que se vê no duto é ele: pergunta antes (acusa direto só quem já era suspeito) */
        if (e.reason === 'vent' && roleOn(g, 'engenheiro') && (this.carry[+id] || 0) < 25) strong.push({ k: 'askEng', who: +id, area: e.area });
        else strong.push({ k: 'accuse', who: +id, reason: e.reason, area: e.area, victim: e.victim });
      }
      /* sou engenheiro e alguém pode ter me visto no duto: já aviso antes de me acusarem */
      if (p.special === 'engenheiro' && this.engSeen && this.engSeen >= this.rs) items.push({ k: 'engClaim' });
      /* quem reporta e viu o abate: primeiro onde está o corpo, logo em seguida quem matou */
      if (strong.length && info.kind === 'report' && info.caller === p.id) {
        const i = items.findIndex((x) => x.k === 'reportDetail');
        if (i >= 0) items.splice(i, 1);
      }
      items.push(...strong);
      /* vi dois iguais nesta rodada (ou alguém com a minha cara): conta. Se chamei a reunião por isso, já contei. */
      const called = info.kind === 'emergency' && info.caller === p.id && this.wantButton && /^twin/.test(this.wantButton.reason) ? this.wantButton : null;
      const tw = this.mem.events.filter((e) => e.type === 'twin' && e.t >= this.rs && !(called && called.who === e.who));
      for (const e of tw) {
        /* o abate (ou duto) com a cara de alguém já diz tudo: não repete o "vi dois" simples da mesma pessoa */
        if (e.kill == null && !e.vent && tw.some((x) => x !== e && x.who === e.who && (x.kill != null || x.vent))) continue;
        items.push({ k: 'twin', e });
      }
      items.push({ k: 'claimLoc' });
      if (p.special === 'cientista' && Object.keys(this.mem.vitals).length) items.push({ k: 'vitals' });
      items.push({ k: 'bodyIntel' });
      /* a janela do abate só fica pronta quando se sabe onde está o corpo: decide na hora de falar */
      if (info.kind === 'report' && U.chance(info.caller === p.id ? 0.5 : 0.75)) items.push({ k: 'window', late: true });
      for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) {
        if (e.reason === 'visual' && g.players[+id].alive) items.push({ k: 'vouch', who: +id, reason: 'visual', task: e.task });
        if (e.twinCut) continue;
        if (e.reason === 'noscan') items.push({ k: 'accuse', who: +id, reason: 'noscan', task: e.task });
        if (e.reason === 'fakeTask') items.push({ k: 'accuse', who: +id, reason: 'fakeTask', area: e.area });
        if (e.reason === 'fastReport') items.push({ k: 'accuse', who: +id, reason: 'fastReport', ago: e.ago, victim: e.victim, late: true });
        /* dupla com a vítima: nos testes quase nunca era o assassino (o impostor esperto não mata o parceiro) — vira só pergunta */
        if (e.reason === 'pactVictim' && U.chance(0.5) && !items.some((x) => x.k === 'askPact' && x.who === +id)) items.push({ k: 'askPact', who: +id, victim: e.victim });
        /* não acusa de "me seguir" quem estava junto comigo fazendo tarefa (é o meu álibi) */
        if (e.reason === 'follow' && (this.togetherMap()[+id] || 0) < 12 && this.getAlibi().with !== +id) items.push({ k: pers.panic ? 'panic' : 'accuse', who: +id, reason: 'follow' });
      }
      if (this.mem.track.some((x) => x.t >= this.rs)) items.push({ k: 'tracker' });
      /* voto aberto da reunião anterior: "o verde pulou quando todo mundo tirou o impostor" */
      for (const id of Object.keys(this.voteNotes || {})) {
        const vn = this.voteNotes[id];
        if (g.players[+id] && g.players[+id].alive && vn.w >= 7 && U.chance(0.45 + (pers.skeptic || pers.times ? 0.3 : 0))) items.push(Object.assign({ k: 'accuse', who: +id }, vn));
      }
      this.voteNotes = {};
      /* combinou de andar junto (sinal) e ficou junto: vira álibi para os dois */
      const tog = this.togetherMap();
      for (const e of this.mem.events) {
        if (e.type !== 'escort' || e.t < this.rs || !g.players[e.who] || !g.players[e.who].alive) continue;
        if ((tog[e.who] || 0) >= 12) items.push({ k: 'vouch', who: e.who, reason: 'together' });
      }
      /* andou em dupla combinada: o parceiro é o meu álibi (e eu o dele) */
      if (this.pact && g.players[this.pact.who] && g.players[this.pact.who].alive && (tog[this.pact.who] || 0) >= 12 && !items.some((x) => x.k === 'vouch' && x.who === this.pact.who)) items.push({ k: 'vouch', who: this.pact.who, reason: 'together' });
      if (this.mem.seen.some((s) => s.via === 'cams' && s.t1 >= this.rs)) items.push({ k: 'camsInfo' });
      if (this.mem.admin.some((a) => a.t >= this.rs)) items.push({ k: 'adminInfo' });
      if (pers.hunch > 0.3 && U.chance(pers.hunch)) items.push({ k: 'hunch' });
      /* conta de cabeça: se pular e morrer mais um, acabou */
      const impsLeft = this.impsLeftEst();
      if (mt.alive.length - impsLeft <= impsLeft + 1 && (pers.leader || pers.times || pers.skeptic || U.chance(0.3)) && !mt.flags.crisisSaid) items.push({ k: 'crisis' });
      /* quem organiza a conversa fecha com um resumo: quem está limpo, quem pesa mais e por quê */
      if ((pers.leader || pers.times) && U.chance(0.75)) items.push({ k: 'summary', late: true });
    } else {
      items.push({ k: 'claimLoc' });
      if (this.scapegoat != null && U.chance(this.lvl.lie * 0.8)) items.push({ k: 'frame' });
      const vis = this.mem.events.filter((e) => e.type === 'visual' && e.t >= this.rs && g.players[e.who] && !g.players[e.who].isImp);
      if (vis.length && U.chance(0.6)) items.push({ k: 'vouch', who: vis[0].who, reason: 'visual', task: vis[0].task });
    }
    /* combinar de andar junto na próxima rodada: com quem já provou ser tripulante ou esteve comigo (o impostor
       também propõe, para ganhar álibi) */
    if (mt.alive.length >= 5) {
      const tg = this.togetherMap();
      const pals = mt.alive.filter((id) => id !== p.id && (p.isImp ? !g.players[id].isImp && (this.carry[id] || 0) <= 10 : this.hardCleared(id) || this.clearedByVisual(id) || (this.carry[id] || 0) <= -15 || (tg[id] || 0) >= 20));
      const want = p.isImp ? this.lvl.lie * 0.12 : 0.1 + (pers.follow || 0) * 0.25 + ((mt.heat[p.id] || 0) >= 15 ? 0.15 : 0) + (this.hab('escolta') ? 0.15 : 0) - (this.hab('solitario') ? 0.1 : 0);
      if (pals.length && U.chance(want)) items.push({ k: 'pactAsk', who: U.pick(pals), lead: U.chance(0.5) ? 'me' : 'them', late: true });
    }
    if (pers.offtopic && U.chance(pers.offtopic)) items.push({ k: 'offtopic' });
    if (pers.lost && this.lostCount > 0 && U.chance(0.5)) items.push({ k: 'lost' });
    if (g.human && g.human.alive && g.human !== p && (pers.leader || pers.skeptic || pers.offtopic) && U.chance(0.5)) items.push({ k: 'askHuman', late: true });
    if ((pers.leader || pers.skeptic) && U.chance(0.7)) items.push({ k: 'leaderVote', late: true });
    const firstPri = items.filter((it) => ['reportInfo', 'reportDetail', 'callReason', 'organize', 'engClaim', 'askEng'].includes(it.k) || (it.k === 'accuse' && (STRONG[it.reason] || it.reason === 'tracker')) ||
      (it.k === 'twin' && (it.e.kill != null || it.e.self)));
    const rest = items.filter((it) => !firstPri.includes(it));
    const keep = rest.filter((it) => it.k === 'claimLoc' || it.k === 'bodyIntel' || it.k === 'window' || it.k === 'crisis' || it.k === 'summary' || it.k === 'twin' || (it.k === 'vouch' && it.reason === 'visual') || U.chance(0.35 + pers.talk * 0.6));
    return firstPri.concat(keep.filter((it) => !it.late), keep.filter((it) => it.late));
  };

  B.nextAgenda = function () {
    const mt = this.mt;
    if (!mt || mt.closed || !this.p.alive) return;
    while (this.queue.length) {
      const it = this.queue.shift();
      if (it.k === 'bodyIntel' && !this.knowsBody && !this.p.isImp) {
        if ((it.tries = (it.tries || 0) + 1) <= 3) {
          this.queue.splice(Math.min(1, this.queue.length), 0, it);
          continue;
        }
      }
      const msg = it.pre || this.compose(it);
      if (msg) {
        const important = ['reportInfo', 'callReason', 'claimLoc', 'twin'].includes(it.k) || (it.k === 'accuse' && STRONG[it.reason]);
        if (!important) {
          if (this.budget <= 0) continue;
          this.budget--;
        }
        it.posted = true;
        mt.say(this, msg, { kind: it.k, important });
        break;
      }
    }
    /* depois de dizer onde está o corpo, quem viu o abate já fala quem foi */
    const urgent = this.queue.length && this.queue[0].k === 'accuse' && STRONG[this.queue[0].reason];
    if (this.queue.length) mt.schedule(urgent ? U.rf(0.8, 1.5) * mt.pace : this.typeDelay(), this, () => this.nextAgenda(), { agenda: true, force: !!urgent });
  };

  B.typeDelay = function (text) {
    const L = text ? text.length : 30;
    const pace = this.mt.pace;
    return (U.rf(2, 4.5) + L / U.rf(8, 13)) * pace * (this.pers.talk < 0.3 ? 1.6 : 1);
  };

  /* frase igualzinha à de outra pessoa na reunião ("no admin fazendo os fios" três vezes) soa robô: reformula */
  B.say = function (kind, d, opts) {
    let t = T.line(kind, d, this.g, this, opts);
    const mt = this.mt, me = this.p.id;
    const dup = (x) => mt && mt.msgs.some((m) => m.from !== me && U.norm(m.text) === U.norm(x));
    for (let i = 0; i < 4 && dup(t); i++) t = T.line(kind, d, this.g, this, opts);
    return t;
  };

  /* Local de um trecho do rastro, como um jogador contaria: a sala em que entrou; corredor só se ficou um bom
     tempo nele (passar pelo corredor da Segurança não é "estava na Segurança"). */
  const placeOf = (seg, dur) => {
    const a = M.AREA[seg.area];
    if (a.kind === 'room') return dur >= 1.5 ? a.id : null;
    return dur >= 6 ? a.id : null;
  };
  /* Distância andando entre duas áreas (em tiles), para saber se dava tempo de ir de uma à outra. */
  const TRAVEL = {};
  /* Ponto de referência de cada área: o lugar livre mais perto do centro. Fixo, para a conta de "dava tempo de ir de
     lá até o corpo?" ser a mesma em toda sessão (com um ponto sorteado, o primeiro sorteio valia para o resto da
     sessão: um ponto no canto de uma sala grande deixava as contas de álibi tortas em todas as partidas). */
  const ANCHOR = {};
  const anchorOf = (a) => {
    if (ANCHOR[a]) return ANCHOR[a];
    const A = M.AREA[a];
    const ok = (x, y) => M.walkAt(x, y) && M.walkAt(x - 0.4, y - 0.4) && M.walkAt(x + 0.4, y - 0.4) && M.walkAt(x - 0.4, y + 0.4) && M.walkAt(x + 0.4, y + 0.4) &&
      M.chamferGap(x, y) >= 0.4 && (!M.propGap || M.propGap(x, y) >= 0.4) && M.areaAt(x, y).id === a;
    for (let r = 0; r <= 14; r += 0.5) {
      const n = Math.max(1, Math.round(r * 8));
      for (let k = 0; k < n; k++) {
        const x = A.cx + Math.cos((k / n) * Math.PI * 2) * r, y = A.cy + Math.sin((k / n) * Math.PI * 2) * r;
        if (ok(x, y)) return (ANCHOR[a] = { x, y });
      }
    }
    return (ANCHOR[a] = M.randomPointIn(a));
  };
  const travel = (a, b) => {
    if (!a || !b || a === b) return 0;
    const k = a < b ? a + '|' + b : b + '|' + a;
    if (TRAVEL[k] != null) return TRAVEL[k];
    const A = M.AREA[a], Bb = M.AREA[b];
    if (!A || !Bb) return 0;
    const pa = anchorOf(a), pb = anchorOf(b);
    const path = AU.Nav.find(pa.x, pa.y, pb.x, pb.y, false);
    let d = 0, px = pa.x, py = pa.y;
    if (path && path.length) {
      for (const pt of path) {
        d += Math.hypot(pt.x - px, pt.y - py);
        px = pt.x;
        py = pt.y;
      }
    } else d = U.d2(A.cx, A.cy, Bb.cx, Bb.cy) * 1.4;
    return (TRAVEL[k] = d);
  };
  B.travelTime = function (a, b, who) {
    const q = who != null ? this.g.players[who] : this.p;
    return travel(a, b) / Math.max(0.5, this.g.speedOf(q));
  };
  /* Quanto tempo alguém levaria para chegar ao corpo contando os dutos (qualquer um pode ser impostor):
     de uma sala com duto ligado (até 2 saltos) à sala do corpo, ou a uma vizinha, chega em poucos segundos. */
  const ventHops = (fromArea, toArea) => {
    const starts = M.VENTS.filter((v) => v.area === fromArea);
    if (!starts.length) return null;
    const goal = (v) => v.area === toArea || M.isNear(v.area, toArea);
    let frontier = starts.map((v) => v.id), seen = new Set(frontier);
    for (let h = 0; h <= 2; h++) {
      if (frontier.some((id) => goal(M.VENT[id]))) return h;
      const next = [];
      for (const id of frontier) for (const l of M.VENT[id].links) if (!seen.has(l)) {
        seen.add(l);
        next.push(l);
      }
      frontier = next;
    }
    return null;
  };
  B.reachTime = function (a, b, who) {
    const walk = this.travelTime(a, b, who);
    const h = ventHops(a, b);
    return h == null ? walk : Math.min(walk, 4 + h * 1.5);
  };
  /* Salas por onde o bot passou nos últimos ~35s (o que um jogador conta no álibi). */
  B.recentRooms = function () {
    const from = Math.max(this.rs + 5, this.mt.info.t - 35);
    const body = this.knowsBody || (this.mt.info.body && this.mt.info.body.area);
    const out = [];
    const segs = this.mem.trail.filter((s) => s.t1 >= from);
    segs.forEach((s, k) => {
      const dur = s.t1 - Math.max(s.t0, from);
      const a = M.AREA[s.area];
      /* a sala onde estava na hora da reunião e a passagem pela sala do corpo contam mesmo se foram rápidas */
      /* onde estava na hora da reunião sempre entra (sala ou corredor); a passagem pela sala do corpo também */
      const r = placeOf(s, dur) || (k === segs.length - 1 ? a.id : a.kind === 'room' && s.area === body && dur >= 0.5 ? a.id : null);
      if (!r) return;
      const i = out.indexOf(r);
      if (i >= 0) out.splice(i, 1);
      out.push(r);
    });
    if (out.length <= 3) return out;
    /* conta as 3 últimas, mas não esconde que passou na sala do corpo (tripulante é honesto) */
    const bi = body ? out.findIndex((r) => r === body || M.isNear(r, body)) : -1;
    if (bi >= 0 && bi < out.length - 3) return [out[bi]].concat(out.slice(-2));
    return out.slice(-3);
  };
  B.myRooms = function () {
    if (this.p.isImp) return this.fakeRooms.slice();
    let rooms = this.recentRooms();
    if (!rooms.length) {
      const a = M.areaAt(this.p.x, this.p.y);
      rooms = [M.roomOf(a, this.p.x, this.p.y).id];
    }
    /* erro de memória raro e plausível: troca a sala mais antiga por uma vizinha (nunca a última, onde estava) */
    if (rooms.length >= 2 && U.chance((1 - this.pers.mem) * 0.04 * this.err)) {
      const r = rooms[0];
      const alt = M.ROOMS.filter((x) => x.id !== r && !rooms.includes(x.id) && M.CORRIDORS.some((c) => c.near.includes(r) && c.near.includes(x.id)));
      if (alt.length) rooms[0] = U.pick(alt).id;
    }
    return rooms;
  };
  B.myTask = function (rooms) {
    if (this.p.isImp) return this.fakeTask;
    const last = rooms[rooms.length - 1];
    const segs = this.mem.trail.filter((s) => s.t1 >= this.rs && s.tasks.length);
    for (let i = segs.length - 1; i >= 0; i--) {
      const a = M.AREA[segs[i].area];
      const r = a.kind === 'room' ? a.id : M.roomOf(a, a.cx, a.cy).id;
      if (r === last) return segs[i].tasks[segs[i].tasks.length - 1];
    }
    return null;
  };
  /* "com quem estava": só quem ficou junto no trecho que o álibi conta, nas salas que ele cita
     (ter cruzado com alguém no começo da rodada não é "estava com") */
  B.companion = function (rooms) {
    const from = this.claimWindow();
    const T = this.mt ? this.mt.info.t : this.g.t;
    const endFrom = Math.max(from, T - 12);
    const tog = this.togetherSince(from);
    const last = rooms[rooms.length - 1];
    let best = null, bt = 0;
    for (const id of Object.keys(tog)) {
      const q = this.g.players[+id];
      if (!q || !q.alive || tog[id] < 4) continue;
      /* junto no fim (últimos ~12s) ou na última sala que ele conta: quem se separou antes não é "com quem estava" */
      let atEnd = 0, inLast = 0;
      for (const s of this.mem.seen) {
        if (s.who !== +id || s.via !== 'eyes' || s.t1 < from) continue;
        if (s.t1 >= endFrom) atEnd += s.t1 - Math.max(s.t0, endFrom);
        if (last && s.area === last) inLast += s.t1 - Math.max(s.t0, from);
      }
      const sc = atEnd * 2 + inLast;
      if ((atEnd >= 3 || inLast >= 4) && sc > bt) {
        bt = sc;
        best = +id;
      }
    }
    return best;
  };

  /* O álibi da reunião é decidido uma vez só: o que o bot conta e o que a IA escreve precisam bater. */
  B.getAlibi = function () {
    if (!this.alibi) {
      const rooms = this.myRooms();
      this.alibi = { rooms, task: this.myTask(rooms), with: this.p.isImp ? null : this.companion(rooms) };
    }
    return this.alibi;
  };

  /* Em quem o tripulante votaria agora (sem sorteio), para a fala combinar com o voto. */
  B.voteLean = function () {
    if (!this.mt) return null;
    if (this.p.isImp) return this.impTarget();
    const ranked = this.mt.alive.filter((id) => id !== this.p.id).map((id) => ({ id, s: this.susp[id] || 0 })).sort((a, b) => b.s - a.s);
    const top = ranked[0], second = ranked[1] || { s: -999 };
    return top && top.s >= this.pers.thr && top.s - second.s >= 8 ? top.id : null;
  };

  /* Motivo curto do voto, só com o que o bot sabe. */
  B.voteReason = function (v) {
    const g = this.g, mt = this.mt;
    if (v === 'skip' || v == null) return this.p.isImp ? 'não tem nada concreto' : 'sem prova suficiente';
    if (this.p.isImp) return v === this.scapegoat ? 'desconfia dele desde o começo' : mt.saidOn(v) >= 2 ? 'a maioria está votando nele' : 'o álibi dele não convenceu';
    const ev = ((this.ev && this.ev[v]) || []).filter((e) => e.w > 0).sort((a, b) => b.w - a.w)[0];
    if (ev) {
      const t = { kill: 'viu matando', vent: 'viu no duto', shift: 'viu mudando de forma', vanish: 'viu sumindo', noscan: 'fingiu o scan', fakeTask: 'fingiu tarefa (a barra não subiu)', follow: 'estava seguindo', nearBody: 'estava perto do corpo', lastWith: 'estava com a vítima', withVictim: 'andava com a vítima', fastReport: 'reportou rápido demais (self report?)', voteSkip: 'não votou no impostor que saiu (voto aberto)', pactVictim: 'tinha combinado dupla com quem morreu', votePush: 'votou num inocente que saiu' }[ev.reason];
      if (t) return t;
    }
    if ((this.chatDelta[v] || 0) > 8) return 'o álibi não bate com o que viu';
    if ((this.chatClaim[v] || 0) > 12) return 'acusaram com prova no chat';
    if (mt.saidOn(v) >= 2) return 'a maioria está votando nele';
    void g;
    return 'está suspeito';
  };

  B.compose = function (it) {
    const g = this.g, p = this.p, mt = this.mt, pers = this.pers;
    const msg = (kind, d, intents, opts) => ({ text: this.say(kind, d, opts), intents: intents || [] });
    switch (it.k) {
      case 'reportInfo': {
        const b = mt.info.body;
        return msg('reportInfo', { area: b.area, victim: b.pid }, [{ type: 'reportInfo', area: b.area, victim: b.pid }]);
      }
      case 'reportDetail': {
        const b = mt.info.body;
        if (p.isImp) {
          if (!this.selfReport && U.chance(0.4)) return null;
          return msg('reportWhy', { task: this.fakeTask, area: b.area }, []);
        }
        const mb = this.mem.bodies.find((x) => x.id === b.id);
        const near = mb ? mb.near.filter((id) => id !== p.id && g.players[id].alive && !this.twinDoubt(id, mb.t)) : [];
        if (near.length) return msg('sawNearBody', { who: near[0], area: b.area, bodyArea: b.area }, [{ type: 'accuse', who: near[0], reason: 'nearBody', area: b.area }]);
        /* ninguém em volta na hora, mas quem reporta também conta quem viu antes (vindo de lá, com a vítima...) */
        const bi = this.compose({ k: 'bodyIntel', reporter: true });
        if (bi && bi.intents.length) return bi;
        return msg('noOneNear', { area: b.area }, []);
      }
      case 'callReason': {
        const w = this.wantButton || { reason: this.p.isImp ? 'info' : 'chaos' };
        if (p.isImp && this.scapegoat != null && U.chance(this.lvl.lie)) {
          return msg('accuse', { who: this.scapegoat, reason: 'hunch' }, [{ type: 'accuse', who: this.scapegoat, reason: 'hunch' }]);
        }
        const intents = w.who != null && (STRONG[w.reason] || w.reason === 'fakeTask' || w.reason === 'noscan') ? [{ type: 'accuse', who: w.who, reason: w.reason, area: w.area, victim: w.victim, strong: !!STRONG[w.reason] }] : [];
        if (w.reason === 'vitals') intents.push({ type: 'roleClaim', role: 'cientista' });
        /* chamei porque vi o metamorfo com a cara de alguém (matando, ou com a minha cara) */
        if (w.reason === 'twinKill' || w.reason === 'twinSelf') {
          if (w.who !== p.id && g.players[w.who] && g.players[w.who].alive) intents.push({ type: 'vouch', who: w.who, reason: 'twin' });
          intents.push({ type: 'roleTheory', role: 'metamorfo', who: w.who });
          return msg('callReason', Object.assign({}, w, { self: w.who === p.id }), intents, { strong: true });
        }
        return msg('callReason', w, intents, { strong: intents.some((i) => i.strong) });
      }
      case 'organize':
        return msg('organize', {}, [{ type: 'askAll' }]);
      case 'twin': {
        /* "vi dois X ao mesmo tempo" / "tinha alguém com a MINHA cara": conta onde, o que o falso fez (se viu), e o que
           isso prova (o X de verdade não é o metamorfo; com um impostor só, é inocente) */
        const e = it.e, X = e.who, q = g.players[X];
        if (!q || mt.flags['twin' + p.id + ':' + X + ':' + (e.kill != null ? e.kill : '')]) return null;
        mt.flags['twin' + p.id + ':' + X + ':' + (e.kill != null ? e.kill : '')] = true;
        /* o que "o X" fez de suspeito nessa hora, na minha frente, fica explicado (o abate/duto do disfarce) */
        const dur = g.ro('metamorfo', 'dur', 30) + 2;
        const did = e.self ? null : this.mem.events.find((x) => (x.type === 'kill' || x.type === 'vent') && x.who === X && Math.abs(x.t - e.t) <= dur);
        const d = { who: X, self: e.self, a1: e.a1, a2: e.a2, cams: e.via === 'cams', solo: !!e.solo && q.alive, victim: e.kill != null ? e.kill : did && did.type === 'kill' ? did.victim : null, vent: e.vent || (did && did.type === 'vent' ? did.area : null), seenKill: e.kill != null, doubt: !!did, real: e.real };
        const intents = [{ type: 'roleTheory', role: 'metamorfo', who: X }];
        if (!e.self && q.alive) intents.unshift({ type: 'vouch', who: X, reason: 'twin' });
        return msg(e.self ? 'twinSelf' : 'twinSaw', d, intents, { strong: e.kill != null });
      }
      case 'accuse': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        this.lastAccusation = it;
        if (it.reason === 'fastReport') {
          if (mt.flags['fast' + it.who]) return null;
          mt.flags['fast' + it.who] = true;
        }
        return msg('accuse', it, [{ type: 'accuse', who: it.who, reason: it.reason, area: it.area, victim: it.victim, strong: !!STRONG[it.reason] }], { strong: !!STRONG[it.reason] });
      }
      case 'panic':
        if (!g.players[it.who] || !g.players[it.who].alive) return null;
        return msg('panic', { who: it.who }, [{ type: 'accuse', who: it.who, reason: 'follow' }], { strong: true });
      case 'claimLoc': {
        if (this.claimed) return null;
        this.claimed = true;
        const al = this.getAlibi();
        const rooms = al.rooms;
        const w = al.with;
        const task = al.task;
        const segs = this.mem.trail.filter((s) => s.t1 >= this.rs);
        const leftAgo = segs.length > 1 ? Math.round((mt.info.t - segs[segs.length - 2].t1) / 5) * 5 : null;
        if (!rooms.length) return msg('claimNone', {}, []);
        return msg('claimLoc', { rooms, with: w, task, times: pers.times, leftAgo }, [{ type: 'claimLoc', rooms, with: w != null ? [w] : [] }]);
      }
      case 'window': {
        const w = this.killWindow;
        if (!w) return null;
        const ago = Math.max(5, Math.round((mt.info.t - w.t0) / 5) * 5);
        /* só vale contar se ajuda: visto há pouco, e mais recente do que o que já disseram */
        if (ago > 35) return null;
        const said = mt.msgs.flatMap((m) => m.intents.filter((j) => j.type === 'window' && j.ago != null).map((j) => j.ago));
        if (said.length && Math.min(...said) <= ago) return null;
        if (w.mine) return msg('passedNoBody', { area: w.area, ago }, [{ type: 'window', area: w.area, ago }]);
        const victim = mt.info.body ? mt.info.body.pid : null;
        const vs = victim != null ? this.mem.seen.filter((x) => x.who === victim).pop() : null;
        return msg('sawVictimAlive', { victim, area: vs ? vs.area : w.area, ago }, [{ type: 'window', area: w.area, ago }]);
      }
      case 'bodyIntel': {
        if (p.isImp || !this.knowsBody || (mt.info.caller === p.id && !it.reporter)) return null;
        const list = [];
        for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) if ((e.reason === 'nearBody' || e.reason === 'lastWith' || e.reason === 'withVictim' || e.reason === 'fromBody') && g.players[+id].alive) list.push(Object.assign({ who: +id }, e));
        list.sort((a, b) => b.w - a.w);
        const top = list[0];
        if (!top) {
          /* "passei lá e não tinha ninguém" só se passou mesmo; "perto" se passou no corredor ao lado */
          const ba = this.knowsBody;
          const segs = this.mem.trail.filter((x) => x.t1 >= this.rs + 5 && x.t1 - x.t0 >= 0.8);
          const inside = segs.some((x) => x.area === ba);
          const beside = inside || segs.some((x) => M.isNear(x.area, ba));
          /* viu alguém lá (mesmo que só quem reportou): não diz "não tinha ninguém" */
          const sawSomeone = this.mem.seen.some((x) => x.who !== p.id && x.t1 >= this.rs + 5 && x.via === 'eyes' && (x.area === ba || M.isNear(x.area, ba)) && mt.info.t - x.t1 <= 30);
          /* alguém já foi colocado lá na conversa ("tava no corredor da elétrica"): "não vi ninguém" soaria contraditório */
          const placed = mt.msgs.some((m) => m.intents.some((j) => (j.type === 'claimLoc' && (j.rooms || []).includes(ba)) || (j.area === ba && (j.type === 'accuse' || j.type === 'sawAt'))));
          if (!beside || sawSomeone || placed || !U.chance(0.35)) return null;
          return msg(inside ? 'noOneNear' : 'noOneNearBy', { area: ba }, []);
        }
        let who = top.who;
        if (U.chance((1 - pers.mem) * 0.12 * this.err)) who = this.confuse(who);
        if (top.reason === 'lastWith') return msg('lastWithVictim', { who, victim: top.victim, area: top.area }, [{ type: 'accuse', who, reason: 'lastWith', area: top.area }]);
        if (top.reason === 'withVictim') return msg('withVictim', { who, victim: top.victim, area: top.area }, [{ type: 'accuse', who, reason: 'lastWith', area: top.area }]);
        if (top.reason === 'fromBody') return msg('fromBody', { who, area: top.area, bodyArea: this.knowsBody }, [{ type: 'accuse', who, reason: 'nearBody', area: top.area }]);
        const ago = mt.info.t - (top.t || mt.info.t);
        const intent = top.w >= 15 ? { type: 'accuse', who, reason: 'nearBody', area: top.area } : { type: 'sawAt', who, area: top.area, ago: Math.round(ago) };
        return msg('sawNearBody', { who, area: top.area, bodyArea: this.knowsBody, ago, times: pers.times }, [intent]);
      }
      case 'vouch': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        const escorted = it.reason === 'visual' && this.mem.events.some((e) => (e.type === 'escortVisual' || e.type === 'escort') && e.who === it.who && e.t >= this.rs);
        if (escorted) return msg('sawVisualSafe', { who: it.who, task: it.task }, [{ type: 'vouch', who: it.who, reason: 'visual', task: it.task }]);
        /* alguém já garantiu essa pessoa: confirma em vez de repetir a mesma frase */
        const before = mt.msgs.find((m) => m.from !== p.id && m.intents.some((j) => j.type === 'vouch' && j.who === it.who && j.reason === it.reason));
        if (before && it.reason === 'visual') return msg('alsoVouch', { who: it.who, by: before.from, task: it.task }, [{ type: 'vouch', who: it.who, reason: 'visual', task: it.task }]);
        return msg('vouch', it, [{ type: 'vouch', who: it.who, reason: it.reason, task: it.task }]);
      }
      case 'vitals': {
        const b = mt.info.body;
        /* sem corpo (reunião de emergência): a morte mais recente que eu vi nos sinais vitais nesta rodada */
        const ids = Object.keys(this.mem.vitals).map(Number).filter((id) => !g.players[id].ejected && this.mem.vitals[id].to >= this.rs)
          .sort((a, c) => this.mem.vitals[a].to - this.mem.vitals[c].to);
        const id = b ? b.pid : ids[ids.length - 1];
        const v = id != null ? this.mem.vitals[id] : null;
        if (!v) return null;
        const ago = Math.max(5, Math.round((mt.info.t - (v.from + v.to) / 2) / 5) * 5);
        return msg('vitals', { victim: id, ago, btn: !b }, [{ type: 'roleClaim', role: 'cientista' }]);
      }
      case 'tracker': {
        const tr = this.mem.track.filter((x) => x.t >= this.rs);
        if (!tr.length) return null;
        const who = tr[tr.length - 1].who;
        const areas = [];
        tr.filter((x) => x.who === who).forEach((x) => {
          if (areas[areas.length - 1] !== x.area) areas.push(x.area);
        });
        const ev = (this.ev && this.ev[who]) || [];
        const hit = ev.find((e) => e.reason === 'tracker');
        /* rastreou quem estava na sala do corpo: acusa com a prova; rastreou quem estava longe: dá o álibi */
        if (hit) return msg('accuse', { who, reason: 'tracker', area: hit.area }, [{ type: 'roleClaim', role: 'rastreador' }, { type: 'accuse', who, reason: 'tracker', area: hit.area }]);
        const away = ev.find((e) => e.reason === 'trackedAway');
        return msg('tracker', { who, areas: areas.slice(-4) }, [{ type: 'roleClaim', role: 'rastreador' }].concat(away ? [{ type: 'vouch', who, reason: 'claim' }] : [{ type: 'sawAt', who, area: areas[areas.length - 1], ago: 0 }]));
      }
      case 'camsInfo': {
        const segs = this.mem.seen.filter((s) => s.via === 'cams' && s.t1 >= this.rs && g.players[s.who].alive);
        if (!segs.length) return null;
        let s = segs[segs.length - 1];
        if (this.knowsBody) s = segs.find((x) => x.area === this.knowsBody || M.isNear(x.area, this.knowsBody)) || s;
        return msg('camsInfo', { who: s.who, area: s.area }, [{ type: 'sawAt', who: s.who, area: s.area, ago: Math.round(mt.info.t - s.t1) }]);
      }
      case 'adminInfo': {
        const a = this.mem.admin.filter((x) => x.t >= this.rs).pop();
        if (!a) return null;
        let area = this.knowsBody && a.counts[this.knowsBody] ? this.knowsBody : null;
        if (!area) {
          const ks = Object.keys(a.counts);
          if (!ks.length) return null;
          area = U.pick(ks);
        }
        return msg('adminInfo', { area, n: a.counts[area] }, []);
      }
      case 'hunch': {
        /* palpite, mas sobre quem tem ALGUMA coisa contra (o que viu, o que ouviu), nunca sorteado; o jogador só entra
           com pista de verdade (palpite solto contra ele parece perseguição) */
        const real = (id) => (this.susp[id] || 0) - (this.noise[id] || 0);
        const ids = g.players.filter((q) => q.alive && q !== p && !this.hardCleared(q.id) && real(q.id) >= (q.isHuman ? 18 : 6)).map((q) => q.id);
        ids.sort((a, b) => (this.susp[b] || 0) - (this.susp[a] || 0));
        const who = ids[0];
        if (who == null) return null;
        return msg('accuse', { who, reason: 'hunch' }, [{ type: 'accuse', who, reason: 'hunch' }]);
      }
      case 'frame': {
        const who = this.scapegoat;
        if (who == null || !g.players[who].alive) return null;
        const bodyArea = mt.facts.bodyArea || (mt.info.body && mt.info.body.area);
        if (this.scapegoatReal && bodyArea) return msg('sawNearBody', { who, area: bodyArea, bodyArea }, [{ type: 'accuse', who, reason: 'nearBody', area: bodyArea }]);
        if (this.lvl.lie >= 0.9 && bodyArea) return msg('sawNearBody', { who, area: bodyArea, bodyArea }, [{ type: 'accuse', who, reason: 'nearBody', area: bodyArea, fake: true }]);
        return msg('accuse', { who, reason: 'hunch' }, [{ type: 'accuse', who, reason: 'hunch' }]);
      }
      case 'crisis': {
        if (mt.flags.crisisSaid) return null;
        mt.flags.crisisSaid = true;
        return msg('crisis', { n: mt.alive.length, imps: this.impsLeftEst(), maybe: !g.S.rules.confirmEjects && g.players.some((q) => q.ejected) }, []);
      }
      case 'summary': {
        /* espera a conversa andar: resumo cedo demais não resume nada */
        if (mt.phase !== 'voting' && mt.t < mt.durD * 0.55 && (it.tries = (it.tries || 0) + 1) < 5) {
          this.queue.push(it);
          return null;
        }
        if (mt.flags.summaryDone) return null;
        mt.flags.summaryDone = true;
        const cleared = mt.alive.filter((id) => id !== p.id && (this.hardCleared(id) || this.clearedByVisual(id))).slice(0, 3);
        const top = this.topSuspect();
        const strongTop = top && top.s >= this.pers.thr * 0.8 && this.fairOn(top.id);
        const SAY = { 'viu matando': 'eu vi matando', 'viu no duto': 'eu vi no duto', 'viu mudando de forma': 'eu vi se transformando', 'viu sumindo': 'eu vi sumindo', 'o álibi não bate com o que viu': 'o álibi não bate com o que eu vi', 'acusaram com prova no chat': 'tem acusação com prova', 'a maioria está votando nele': 'a maioria tá nele' };
        const why0 = strongTop ? this.voteReason(top.id) : null;
        const why = why0 ? SAY[why0] || why0 : null;
        if (!cleared.length && !strongTop) return null;
        return msg('summary', { cleared, who: strongTop ? top.id : null, why }, strongTop ? [{ type: 'accuse', who: top.id, reason: 'vote' }] : [{ type: 'skip' }]);
      }
      case 'offtopic':
        return msg('offtopic', {}, []);
      case 'lost': {
        const r = U.pick(M.ROOMS).id;
        return msg('lost', { area: r }, []);
      }
      case 'askHuman': {
        const h = g.human;
        if (!h || !h.alive || mt.humanClaimed || mt.hasClaimed(h.id)) return null;
        this.askedHuman = true;
        mt.askedHumanAt = mt.t;
        mt.askedHumanBy = p.id;
        return msg('askWhere', { who: h.id }, [{ type: 'askWhere', who: h.id }], { question: true });
      }
      case 'askPact': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        return msg('accuse', { who: it.who, reason: 'pactVictim', victim: it.victim }, [{ type: 'askWhere', who: it.who }]);
      }
      case 'askEng': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        return msg('askEng', { who: it.who, area: it.area }, [{ type: 'sawAt', who: it.who, area: it.area, ago: 0 }, { type: 'roleTheory', role: 'engenheiro', who: it.who }, { type: 'askRole', who: it.who, role: 'engenheiro' }]);
      }
      case 'engClaim':
        if (mt.flags['engC' + p.id]) return null;
        mt.flags['engC' + p.id] = true;
        return msg('engClaim', {}, [{ type: 'roleClaim', role: 'engenheiro' }]);
      case 'pactAsk': {
        const q = g.players[it.who];
        if (!q || !q.alive || this.pactReq || this.pactAsked || (mt.flags.pactAskN || 0) >= 2) return null;
        mt.flags.pactAskN = (mt.flags.pactAskN || 0) + 1;
        this.pactAsked = { who: it.who, lead: it.lead };
        return msg('pactAsk', { who: it.who, lead: it.lead }, [{ type: 'pact', who: it.who, to: it.who, lead: it.lead === 'me' ? 'speaker' : 'addressee', scope: 'round' }]);
      }
      case 'leaderVote': {
        if (mt.phase !== 'voting' && mt.t < mt.durD * 0.6) {
          if ((it.tries = (it.tries || 0) + 1) < 4) {
            this.queue.push(it);
            return null;
          }
        }
        const top = this.topSuspect();
        if (p.isImp) {
          const t2 = this.impTarget();
          return msg('leaderVote', { who: t2 }, t2 != null ? [{ type: 'accuse', who: t2, reason: 'vote' }] : [{ type: 'skip' }]);
        }
        if (top && top.s >= this.pers.thr && this.fairOn(top.id)) return msg('leaderVote', { who: top.id }, [{ type: 'accuse', who: top.id, reason: 'vote' }]);
        return msg('leaderVote', { who: null }, [{ type: 'skip' }]);
      }
      default:
        return null;
    }
  };

  B.topSuspect = function () {
    const mt = this.mt;
    let best = null;
    for (const id of mt.alive) {
      if (id === this.p.id) continue;
      const s = this.susp[id] || 0;
      if (!best || s > best.s) best = { id, s };
    }
    return best;
  };

  /* ---------- reações ---------- */
  B.reply = function (delay, fn, direct) {
    const mt = this.mt;
    if (!mt || mt.closed) return;
    const src = this.curMsg;
    const so = this.curMsgObj;
    const meta = { kind: 'reply', direct: !!direct, toHuman: !!(so && so.fromHuman), srcFrom: so ? so.from : null, srcText: so ? so.text : null };
    if (!direct) {
      if (this.budget <= 0) return;
      if (src != null && !mt.canReply(src)) return;
      this.budget--;
      if (src != null) mt.noteReply(src);
    }
    if (src != null) (this.repliedTo = this.repliedTo || new Set()).add(src);
    /* com IA o diretor cuida do ritmo: a reação entra logo na fila da próxima rodada */
    const viaAI = mt.dir && mt.dir.accepts(meta);
    const wait = viaAI ? U.rf(0.15, meta.toHuman ? 0.3 : 1.2) : delay * mt.pace + U.rf(0.8, 2.4);
    mt.schedule(wait, this, () => {
      if (!this.p.alive || mt.closed) return;
      const m = fn();
      if (!m || !m.text) return;
      /* a conversa andou desde a mensagem respondida: diz com quem está falando ("verde, pq eu?") */
      if (src != null && so && so.from !== this.p.id) {
        const after = mt.msgs.filter((x) => x.id > src && x.from !== this.p.id);
        if (after.length >= 2 || (after.length && mt.t - so.t > 6)) m.text = this.addressTo(so.from, m.text);
      }
      mt.say(this, m, meta);
    }, { ttl: direct ? 20 : 9, raw: viaAI });
  };
  /* Coerência de quem fala, na hora de postar: não repete a mesma defesa, não acusa quem ele mesmo inocentou, não repete
     a mesma acusação, nega uma vez para cada acusador e não ataca quem já tem duas tarefas visuais confirmadas. */
  B.vet = function (m, meta) {
    const mt = this.mt, me = this.p.id, imp = this.p.isImp;
    if (!mt || !m || !m.intents || !m.intents.length) return m;
    const mine = mt.msgs.filter((x) => x.from === me);
    const prev = (type, who) => [].concat(...mine.map((x) => x.intents.filter((j) => j.type === type && j.who === who)));
    for (const it of m.intents) {
      if (it.type === 'vouch' && it.who != null) {
        const pv = prev('vouch', it.who).map((j) => j.reason);
        /* já defendeu: só volta a falar se agora viu a visual (prova mais forte) */
        if (pv.length && (it.reason !== 'visual' || pv.includes('visual'))) return null;
        if (imp && prev('accuse', it.who).some((j) => j.reason !== 'vote')) return null;
      }
      if (it.type === 'accuse' && it.who != null && it.reason !== 'vote' && !STRONG[it.reason]) {
        const pv = prev('vouch', it.who);
        if (!imp && (this.hardCleared(it.who) || pv.some((j) => j.reason === 'visual' || j.reason === 'together'))) return null;
        /* confirmou onde a pessoa estava e depois "acho que é ele" por palpite: não */
        if (!imp && pv.length && ['hunch', 'sus', 'quiet', 'follow'].includes(it.reason)) return null;
        if (imp && pv.length) return null;
        if (prev('accuse', it.who).some((j) => j.reason === it.reason && (j.area || null) === (it.area || null))) return null;
        const vis = mt.msgs.filter((x) => x.from !== it.who && x.from !== me && x.intents.some((j) => j.type === 'vouch' && j.who === it.who && j.reason === 'visual')).length;
        if (vis >= 2 && (!imp || U.chance(0.5 + this.lvl.lie * 0.5))) return null;
      }
      if (it.type === 'agree' && it.who != null && !imp && this.hardCleared(it.who)) return null;
      if (it.type === 'deny') {
        const by = meta && meta.srcFrom != null ? meta.srcFrom : 'x';
        this.deniedTo = this.deniedTo || new Set();
        if (this.deniedTo.has(by) || this.deniedTo.size >= 2) return null;
      }
    }
    if (m.intents.some((it) => it.type === 'deny')) this.deniedTo.add(meta && meta.srcFrom != null ? meta.srcFrom : 'x');
    return m;
  };
  B.addressTo = function (id, text) {
    const g = this.g, q = g.players[id];
    if (!q || !text) return text;
    const col = C.COLOR[q.color].name.toLowerCase();
    const n = U.norm(text);
    if (n.includes(U.norm(q.name)) || new RegExp('\\b' + U.norm(col) + '\\b').test(n)) return text;
    /* a fala já chama alguém ("verde, você não disse..."): não põe um segundo nome na frente */
    const lead = n.replace(/[^a-z0-9, ]/g, ' ').replace(/\s+/g, ' ').trim().match(/^((?:[a-z0-9]+ ){0,2}[a-z0-9]+),/);
    if (lead) {
      const ws = lead[1].split(' ');
      for (let k = 0; k < ws.length; k++) {
        const tail = ws.slice(k).join(' ');
        if (g.players.some((x) => U.norm(x.name) === tail || U.norm(C.COLOR[x.color].name) === tail)) return text;
      }
    }
    const tone = g.S.bots.chatTone;
    const who = q.isHuman || U.chance(0.3) ? q.name : col;
    if (tone === 'limpo') return (who === col ? U.cap(col) : who) + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
    return (tone === 'raiz' ? who.toLowerCase() + ' ' : who.toLowerCase() + ', ') + text;
  };

  B.mOnMessage = function (msg) {
    if (!this.mt || msg.from === this.p.id || !this.p.alive) return;
    const g = this.g, p = this.p;
    this.curMsg = msg.id;
    this.curMsgObj = msg;
    for (const it of msg.intents) {
      try {
        this.react(msg, it);
      } catch (e) {
        if (window.console) console.warn('reação falhou', e);
      }
    }
    /* versões de onde cada um estava: refaz a conta quando chega álibi, acusação com lugar ou confirmação */
    if (!p.isImp && msg.intents.some((it) => it.type === 'claimLoc' || it.type === 'vouch' || placeIntent(it))) this.updateClashes();
    /* "hã?" só para mensagem curta ou embolada; frase clara sem pedido não precisa de resposta */
    const garbled = msg.text && msg.text.trim().split(/\s+/).length <= 2 && !/^(k+|rs+|ss|sim|n|nao|não|ok|blz|beleza|oi|hmm+|\?+|!+)$/i.test(msg.text.trim());
    if (msg.fromHuman && garbled && !msg.intents.length && !(this.mt.dir && this.mt.dir.on()) && U.chance(0.06 + this.pers.talk * 0.06) && !this.replied.has('huh' + msg.id)) {
      this.replied.add('huh' + msg.id);
      this.reply(1, () => ({ text: this.say('huh'), intents: [] }));
    }
    this.curMsg = null;
    this.curMsgObj = null;
    void g;
    void p;
  };

  B.react = function (msg, it) {
    const g = this.g, p = this.p, mt = this.mt, pers = this.pers, me = p.id, S = msg.from;
    const say = (kind, d, intents, opts) => ({ text: this.say(kind, d, opts), intents: intents || [] });
    switch (it.type) {
      case 'reportInfo':
      case 'bodyArea': {
        /* sabia onde era o corpo antes de alguém contar (e não foi quem reportou): deslize */
        /* só se acertou a sala (chutar errado não é saber) */
        if (it.type === 'bodyArea' && !msg.bodyKnown && mt.info.kind === 'report' && S !== mt.info.caller && !p.isImp && mt.info.body && it.area === mt.info.body.area && !(this.ev[S] || []).some((e) => e.reason === 'visual')) {
          this.bump(S, 28, 'own');
          if (!mt.flags['knew' + S] && (pers.times || pers.skeptic || U.chance(0.4))) {
            mt.flags['knew' + S] = true;
            this.reply(0.8, () => say('knewBody', { who: S }, [{ type: 'accuse', who: S, reason: 'lie', proof: true }]), true);
          }
        }
        if (!this.knowsBody && it.area) {
          this.knowsBody = it.area;
          if (!p.isImp) this.bodyEvidence(it.area);
        }
        break;
      }
      case 'askAll':
        if (!this.claimed) this.reply(1, () => this.compose({ k: 'claimLoc' }), true);
        break;
      case 'askWhere':
        if (it.who === me) {
          if (!this.claimed) this.reply(pers.talk < 0.3 ? 2.5 : 1, () => this.compose({ k: 'claimLoc' }), true);
          else if (this.claimPosted && !this.replied.has('reclaim')) {
            /* já tinha falado e perguntaram de novo: "já falei, tava na elétrica" (se ainda não saiu, é só esperar) */
            this.replied.add('reclaim');
            this.reply(1, () => {
              this.claimed = false;
              const m = this.compose({ k: 'claimLoc' });
              if (!m) return null;
              const tone = g.S.bots.chatTone;
              const pre = tone === 'limpo' ? 'Já falei: ' : U.pick(tone === 'raiz' ? ['ja falei ', 'ja disse mano ', 'de novo: '] : ['já falei, ', 'já disse, ', 'de novo: ']);
              m.text = pre + m.text.charAt(0).toLowerCase() + m.text.slice(1);
              return m;
            }, true);
          }
        }
        break;
      case 'askBody':
        if (this.knowsBody && this.sawBodyMyself && !this.replied.has('body')) {
          this.replied.add('body');
          this.reply(0.6, () => say('answerBody', { area: this.knowsBody }, [{ type: 'bodyArea', area: this.knowsBody }]), true);
        }
        break;
      case 'claimLoc':
        this.claims[S] = it.rooms;
        /* "tava na elétrica" fala de onde estava no fim, não do caminho; lista de salas ou "o tempo todo" cobre a rodada */
        this.claimFull[S] = !!it.stay || (it.rooms || []).length >= 2;
        if (S === g.human?.id) mt.humanClaimed = true;
        if (!p.isImp) {
          this.checkClaim(S, it);
          this.checkBodyRoom(S, it, msg);
          this.trackerCheck(S, it);
        } else this.impOnClaim(S, it);
        break;
      case 'sawAt':
        this.checkSawAt(S, it);
        break;
      case 'accuse':
        this.onAccuse(S, it);
        break;
      case 'vouch':
        this.onVouch(S, it);
        break;
      case 'deny':
        if (this.lastAccusation && this.lastAccusation.who === S && STRONG[this.lastAccusation.reason] && !this.replied.has('restate' + S)) {
          this.replied.add('restate' + S);
          this.reply(1, () => say('accuse', this.lastAccusation, [{ type: 'accuse', who: S, reason: this.lastAccusation.reason, strong: true }], { strong: true }), true);
        } else if (pers.skeptic && U.chance(0.3) && !this.replied.has('denyq' + S)) {
          this.replied.add('denyq' + S);
          this.reply(1.2, () => say('askConfirm', { who: S }, []));
        }
        break;
      case 'skip':
        this.skipLean++;
        break;
      case 'askProof':
        if (this.lastAccusation && !this.replied.has('proof')) {
          this.replied.add('proof');
          this.reply(1, () => say('accuse', this.lastAccusation, [{ type: 'accuse', who: this.lastAccusation.who, reason: this.lastAccusation.reason }]), true);
        }
        break;
      case 'askWho':
        if (!this.replied.has('who' + msg.id) && U.chance(0.25 + pers.talk * 0.4)) {
          this.replied.add('who' + msg.id);
          this.reply(1.2, () => {
            const top = p.isImp ? { id: this.impTarget(), s: 50 } : this.topSuspect();
            const who = top && top.id != null && top.s >= this.pers.thr * 0.6 && (p.isImp || this.fairOn(top.id)) ? top.id : null;
            return say('whoSus', { who }, who != null ? [{ type: 'accuse', who, reason: 'sus' }] : []);
          });
        }
        break;
      case 'mention':
        if (it.who === me && msg.fromHuman && !this.replied.has('ment' + msg.id)) {
          this.replied.add('ment' + msg.id);
          this.reply(0.8, () => say('huh', {}, []), true);
        } else if (msg.fromHuman && (pers.defend || pers.skeptic) && U.chance(0.35)) {
          this.reply(1.2, () => say('askProof', { who: it.who }, [{ type: 'askProof' }]));
        }
        break;
      case 'window':
        /* alguém passou na sala do corpo há pouco e não tinha corpo: janela menor, álibis melhores */
        if (S !== me && !p.isImp && this.trust(S) >= 0.55 && it.area && it.ago != null) {
          const t = mt.info.t - it.ago;
          if (!this.sharedWindow || t > this.sharedWindow.t) {
            this.sharedWindow = { area: it.area, t };
            if (this.knowsBody === it.area) this.bodyEvidence(this.knowsBody);
            /* com essa janela, quem reportou achou o corpo rápido demais? */
            const rep = mt.info.kind === 'report' ? mt.info.caller : null;
            const fe = rep != null && ((this.ev[rep] || []).find((e) => e.reason === 'fastReport'));
            if (fe && !mt.flags['fast' + rep] && rep !== me) {
              mt.flags['fast' + rep] = true;
              this.reply(1.2, () => say('accuse', { who: rep, reason: 'fastReport', ago: fe.ago, victim: fe.victim }, [{ type: 'accuse', who: rep, reason: 'fastReport' }]));
            }
          }
        }
        break;
      case 'quiet':
        if (it.who !== me) this.bump(it.who, 3, 'social');
        break;
      case 'explainTask': {
        /* "desisti da tarefa / não consegui": quem viu a barra parada acredita em parte (o cético, menos) */
        if (p.isImp || S === me) break;
        let had = false;
        for (const e of (this.ev && this.ev[S]) || []) if ((e.reason === 'fakeTask' || e.reason === 'noscan') && !e.explained) {
          e.explained = true;
          e.w *= pers.skeptic ? 0.6 : 0.4;
          had = true;
        }
        if (had) {
          this.chatClaim[S] = (this.chatClaim[S] || 0) * 0.6;
          this.recalc();
          if (!this.replied.has('expl' + S) && U.chance(0.4)) {
            this.replied.add('expl' + S);
            this.reply(1, () => say(pers.skeptic ? 'askProof' : 'ack', { who: S }, []));
          }
        }
        break;
      }
      case 'pact': {
        /* "vamos ficar juntos" / "fica comigo" / "eu te sigo": aceito se confio (o impostor aceita pelo álibi) */
        if (S === me || msg.intents.some((x) => x.type === 'offerVisual')) break;
        const toMe = it.to === me, open = it.to == null;
        if (!toMe && !open) break;
        if (this.pactReq) break;
        if (open && (mt.flags['pactTaken' + S] || !U.chance(0.35 + (pers.follow || 0) * 0.3))) break;
        const s = p.isImp ? 0 : (this.susp[S] || 0) + (this.carry[S] || 0) * 0.3;
        const lead = it.lead === 'addressee' ? 'me' : 'them';
        /* sem tarefa visual ninguém prova nada: com quem não conheço (nunca estive junto, sem confirmação) topo menos */
        const unknown = !g.S.rules.visualTasks && !this.hardCleared(S) && (this.carry[S] || 0) > -5 && (this.togetherMap()[S] || 0) < 20;
        if (!p.isImp && (s >= 22 || (this.hab('solitario') && s >= 8 && U.chance(0.5)) || (unknown && U.chance(0.45)))) {
          if (toMe) this.reply(0.8, () => say('pactNo', { who: S }, [{ type: 'pactNo', who: S }]), true);
          break;
        }
        if (p.isImp && g.players[S].isImp) break;
        mt.flags['pactTaken' + S] = true;
        this.pactReq = { who: S, lead, scope: it.scope || 'round' };
        this.bump(S, -2, 'social');
        this.reply(0.7, () => say('pactOk', { who: S, lead, scope: it.scope }, [{ type: 'pactOk', who: S, lead: lead === 'me' ? 'speaker' : 'addressee', scope: it.scope }]), true);
        break;
      }
      case 'askRole':
        /* "você é engenheiro?": o engenheiro confirma; o impostor às vezes blefa */
        if (it.who === me && it.role === 'engenheiro' && !this.replied.has('askRole')) {
          const yes = p.special === 'engenheiro' || (p.isImp && roleOn(g, 'engenheiro') && U.chance(this.lvl.lie * 0.8));
          this.replied.add('askRole');
          this.reply(0.6, () => (yes ? say('roleClaim', { role: 'engenheiro' }, [{ type: 'deny' }, { type: 'roleClaim', role: 'engenheiro' }]) : say('deny', {}, [{ type: 'deny' }])), true);
        }
        break;
      case 'pactOk':
        /* aceitaram o combinado que eu propus */
        if (it.who === me && this.pactAsked && this.pactAsked.who === S) this.pactReq = { who: S, lead: it.lead === 'speaker' ? 'them' : 'me', scope: it.scope || 'round' };
        break;
      case 'yes':
        /* "fechou" / "bora" do jogador em resposta ao meu convite */
        if (this.pactAsked && this.pactAsked.who === S && (it.to == null || it.to === me)) this.pactReq = { who: S, lead: this.pactAsked.lead, scope: 'round' };
        break;
      case 'offerVisual': {
        if (S === me || p.isImp || !g.S.rules.visualTasks) break;
        if (this.offered) this.offered.to.push(S);
        /* quem desconfia topa quase sempre; os outros às vezes (no máximo dois vão junto) */
        const doubt = (this.susp[S] || 0) >= 12 || (mt.accusers[S] && mt.accusers[S][me]) || pers.skeptic || pers.leader;
        const n = mt.flags['verN' + S] || 0;
        if (!this.verify && n < 2 && U.chance(doubt ? 0.85 : 0.25 + pers.talk * 0.25)) {
          mt.flags['verN' + S] = n + 1;
          this.verify = { who: S };
          this.bump(S, -3, 'social');
          if (!mt.flags['willF' + S] && U.chance(0.7)) {
            mt.flags['willF' + S] = true;
            this.reply(0.9, () => say('willFollow', { who: S }, []), true);
          }
        }
        break;
      }
      case 'roleTheory':
        this.onRoleTalk(S, it, false);
        break;
      case 'roleClaim':
        this.onRoleTalk(S, it, true);
        break;
      default:
        break;
    }
  };

  /* Conversa sobre funções especiais. Todos sabem quais funções a partida tem (vem da configuração do lobby). */
  const roleOn = (g, r) => ((g.S.roles && g.S.roles[r]) || {}).n > 0;
  B.onRoleTalk = function (S, it, claim) {
    const g = this.g, mt = this.mt, p = this.p, pers = this.pers, role = it.role;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    if (!roleOn(g, role)) {
      /* a função nem existe nesta partida: alguém corrige (e quem alegou tê-la vira suspeito) */
      if (claim && !p.isImp) this.bump(S, 25, 'own');
      const key = 'noRole' + role + (claim ? S : '');
      if (!mt.flags[key] && (pers.times || pers.skeptic || pers.leader || U.chance(0.3))) {
        mt.flags[key] = true;
        this.reply(0.8, () => say('roleNotInGame', { role }, claim && !p.isImp ? [{ type: 'accuse', who: S, reason: 'lie', proof: true }] : []), true);
      }
      return;
    }
    /* regra errada no ar ("o metamorfo disfarçado fez os escudos", "o fantasma matou invisível"): alguém corrige */
    if (!claim && !p.isImp && this.fixRule(role, it)) return;
    if (claim) {
      /* alegações são públicas: mais gente dizendo ter a função do que ela existe = alguém mente */
      const claims = (g.roleClaims = g.roleClaims || {});
      const list = (claims[role] = claims[role] || []);
      if (!list.includes(S)) list.push(S);
      const n = (g.S.roles[role] || {}).n || 1;
      if (list.length > n && !p.isImp && S !== p.id) {
        const others = list.filter((id) => id !== S);
        const trusted = others.filter((id) => this.hardCleared(id) || this.clearedByVisual(id) || (this.carry[id] || 0) <= -20);
        this.bump(S, trusted.length ? 35 : 14, 'own');
        if (!trusted.length) for (const id of others) if (id !== p.id) this.bump(id, 8, 'own');
        if (!this.replied.has('dup' + role) && (pers.times || pers.skeptic || pers.leader || U.chance(0.4))) {
          this.replied.add('dup' + role);
          this.reply(0.8, () => say('roleDup', { role, n, who: others[0] }, trusted.length ? [{ type: 'accuse', who: S, reason: 'lie', proof: true }] : [{ type: 'accuse', who: S, reason: 'sus' }]), true);
        }
      }
      if (role === 'engenheiro' && !p.isImp) {
        /* engenheiro explica o duto: a prova perde força (o cético desconfia mais) */
        const ev = (this.ev && this.ev[S]) || [];
        let had = false;
        for (const e of ev) if (e.reason === 'vent' && !e.explained) {
          e.w *= pers.skeptic ? 0.6 : 0.4;
          e.explained = true;
          had = true;
        }
        this.chatClaim[S] = (this.chatClaim[S] || 0) * 0.5;
        this.recalc();
        if ((had || pers.skeptic) && !this.replied.has('roleq' + S) && U.chance(pers.skeptic ? 0.7 : 0.3)) {
          this.replied.add('roleq' + S);
          this.reply(1.2, () => say('roleDoubt', { who: S, role }, []));
        }
      } else if ((role === 'cientista' || role === 'rastreador') && !p.isImp) this.bump(S, -4, 'social');
      return;
    }
    /* teoria: "pode ter sido o metamorfo", "pode ser engenheiro", "o fantasma sumiu" */
    if (!p.isImp && role === 'metamorfo') {
      /* "não era eu, era o metamorfo": quando quem fala é o acusado (ou não disse de quem), a teoria é sobre ele mesmo */
      const accusedS = mt.accusers[S] && Object.keys(mt.accusers[S]).length > 0;
      const X = it.who == null || it.who === S || (accusedS && mt.accusers[S][it.who]) ? S : it.who;
      if (X !== p.id && this.disguiseTheory(X, S)) return;
    } else if (!p.isImp && role === 'engenheiro' && !this.replied.has('doubteng')) {
      this.replied.add('doubteng');
      for (const id of Object.keys(this.ev || {})) {
        if (it.who != null && +id !== it.who) continue;
        for (const e of this.ev[id]) if (e.reason === 'vent') e.w *= 0.7;
      }
      for (const id of Object.keys(this.chatClaim)) if (it.who == null || +id === it.who) this.chatClaim[id] *= 0.7;
      this.recalc();
    }
    const key = 'roleTalk' + role;
    const wants = p.isImp ? U.chance(0.35) : pers.times || pers.defend || pers.skeptic || U.chance(0.25);
    if (!mt.flags[key] && wants) {
      mt.flags[key] = true;
      this.reply(1, () => say('roleMaybe', { role, who: it.who }, []));
    }
  };

  /* Impostor não faz tarefa de verdade, nem disfarçado de metamorfo: tarefa visual (scan, asteroides, escudos, lixo)
     é sempre de tripulante. E o fantasma não mata nem entra no duto invisível. Quem falar o contrário é corrigido
     (uma vez por reunião), e quem "fez a visual" continua valendo como tripulante. */
  const VIS_DID = /\b(fez|faz|fazendo|fazia|feito|terminou|terminando)\s+(o |os |a |as )?(tarefa visual|visual|escudos|scan|escaneamento|asteroides|lixo)\b|\bescane(ou|ando|ava)\b/;
  const VIS_NOT = /fing|parad|sem (a )?anima|n(a|ã)o (fez|faz|consegue|pode|da)|nem (fez|faz)/;
  B.fixRule = function (role, it) {
    const mt = this.mt, pers = this.pers;
    const txt = U.norm((this.curMsgObj && this.curMsgObj.text) || '');
    if (!txt) return false;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    const sure = pers.times || pers.skeptic || pers.leader || U.chance(0.5);
    if (role === 'metamorfo' && /metamorf|disfar/.test(txt) && VIS_DID.test(txt) && !VIS_NOT.test(txt)) {
      if (mt.flags.fixVis || !sure) return false;
      mt.flags.fixVis = true;
      const task = /escud/.test(txt) ? 'shields' : /scan|escane/.test(txt) ? 'scan' : /asteroid/.test(txt) ? 'asteroids' : /lixo/.test(txt) ? 'garbage' : null;
      const X = it.who != null && it.who !== this.p.id ? it.who : null;
      this.reply(0.9, () => say('noTaskImp', { who: X, task }, X != null ? [{ type: 'vouch', who: X, reason: 'claim' }] : []), true);
      return true;
    }
    if (role === 'fantasma' && /invis/.test(txt) && /\bmat(ou|ar|ando|a)\b|\bduto\b|\bventou\b/.test(txt) && !/n(a|ã)o (mata|pode|consegue)/.test(txt)) {
      if (mt.flags.fixPh || !sure) return false;
      mt.flags.fixPh = true;
      this.reply(0.9, () => say('phantomNoKill', {}, []), true);
      return true;
    }
    return false;
  };

  /* O que alguém contou ter visto ("vi o X perto do corpo", "vi o X saindo do Depósito") bate com onde o X disse
     que estava? */
  const PLACE_REASONS = ['nearBody', 'lastWith', 'withVictim', 'fromBody'];
  B.claimClash = function (who, area, j) {
    const rooms = this.claims[who];
    if (!rooms || !rooms.length || !area || !M.AREA[area]) return false;
    if (rooms.some((r) => r === area || M.isNear(r, area))) return false;
    /* quem disse uma sala só falou de onde estava no fim, não do caminho: ter sido visto em outro lugar antes não
       desmente. Só desmente o que foi visto agora há pouco, ou se ele disse que ficou lá o tempo todo. */
    if (!(this.claimFull && this.claimFull[who]) && !(j && j.ago != null && j.ago <= 12)) return false;
    return true;
  };
  const placeIntent = (j) => j.who != null && j.area && ((j.type === 'accuse' && PLACE_REASONS.includes(j.reason)) || (j.type === 'sawAt' && (j.ago == null || j.ago <= 30)));
  /* Versões que não batem: A diz que viu X em W, X disse que estava em outro lugar. Um dos dois mente (nas
     partidas de teste, em ~85% desses casos um deles é impostor: ou X esconde onde estava, ou A inventou).
     Ganha a versão que outras pessoas confirmam; sem confirmação, os dois ficam na mira (o acusado um pouco mais,
     porque quem fala o lugar costuma ter visto). O que eu mesmo vi conta como confirmação. */
  B.updateClashes = function () {
    const mt = this.mt, me = this.p.id, out = {}, list = [];
    if (!mt || this.p.isImp) return;
    const add = (id, w) => {
      if (id !== me) out[id] = (out[id] || 0) + w;
    };
    const done = new Set();
    for (const m of mt.msgs) {
      const A = m.from;
      for (const j of m.intents) {
        if (!placeIntent(j) || j.who === A || A === me || j.who === me) continue;
        const X = j.who, key = A + ':' + X;
        if (done.has(key) || !this.claimClash(X, j.area, j)) continue;
        done.add(key);
        const near = (a) => a === j.area || M.isNear(a, j.area);
        const rooms = this.claims[X] || [];
        let forA = 0, forX = 0;
        const mine = this.sawTimes(X).filter((q) => mt.info.t - q.t1 <= 40);
        if (mine.some((q) => near(q.area))) forA += 1.5;
        else if (mine.some((q) => rooms.some((r) => r === q.area || M.isNear(r, q.area)) && mt.info.t - q.t1 <= 15)) forX += 1;
        if ((this.ev[X] || []).some((e) => e.reason === 'visual' || (e.reason === 'together' && e.secs >= 20))) forX += 1.5;
        for (const m2 of mt.msgs) {
          if (m2.from === A || m2.from === X || m2.from === me) continue;
          const t = this.trust(m2.from);
          if (t < 0.45) continue;
          for (const k of m2.intents) {
            if (k.who !== X) continue;
            if (placeIntent(k) && near(k.area)) forA += t;
            else if (k.type === 'vouch' && (k.reason === 'claim' || k.reason === 'together' || k.reason === 'visual')) forX += t;
          }
        }
        const tA = this.trust(A);
        let res;
        if (forX >= 0.9 && forA < 0.5) {
          res = 'X';
          add(A, 14);
          add(X, -6);
        } else if (forA >= 0.9 && forX < 0.5) {
          res = 'A';
          add(X, 20);
        } else {
          res = '?';
          add(X, 11 * tA);
          add(A, 5);
        }
        list.push({ A, X, area: j.area, res });
      }
    }
    this.clashAdj = out;
    this.clashList = list;
    this.recalc();
  };
  B.sayClash = function (who, area, by) {
    const mt = this.mt, rooms = this.claims[who] || [];
    if (mt.flags['clash' + who] || !rooms.length) return;
    const c = (this.clashList || []).find((x) => x.X === who && x.A === by);
    if (c && c.res === 'X') return;
    mt.flags['clash' + who] = true;
    this.reply(1.2, () => ({ text: this.say('claimClash', { who, area, by, claimed: rooms[rooms.length - 1] }), intents: [{ type: 'accuse', who, reason: 'lie', area }] }));
  };
  B.sawTimes = function (id) {
    const g0 = this.graceT();
    return this.mem.seen.filter((s) => s.who === id && s.t1 >= g0 && s.via !== 'track');
  };
  B.myStay = function (area) {
    let tot = 0;
    const from = Math.max(this.graceT(), this.mt ? this.mt.info.t - 30 : 0);
    for (const s of this.mem.trail) if (s.t1 >= from && s.area === area) tot += s.t1 - Math.max(s.t0, from);
    return tot;
  };

  B.checkClaim = function (S, it) {
    const g = this.g, me = this.p.id, pers = this.pers;
    const say = (kind, d, intents, opts) => ({ text: this.say(kind, d, opts), intents: intents || [] });
    const rooms = it.rooms || [];
    const withIds = it.with || [];
    /* já provou ser tripulante: álibi que não bate é engano, não mentira (pergunta em vez de acusar) */
    const known = this.hardCleared(S);
    if (withIds.includes(me)) {
      /* confirma o que viu no trecho que o álibi cobre; ter cruzado antes na rodada é só "não reparei" */
      const tog = this.togetherSince(this.claimWindow())[S] || 0;
      const iWasThere = known || rooms.some((r) => this.myStay(r) >= 3) || (this.togetherMap()[S] || 0) >= 3;
      if (tog >= 3) {
        this.bump(S, -10);
        this.reply(0.9, () => say('confirmWith', { who: S }, [{ type: 'vouch', who: S, reason: 'together' }]), true);
      } else if (tog > 0.5 || iWasThere) {
        /* estava lá mas mal reparou: dúvida, não acusação */
        this.bump(S, 5, 'social');
        this.reply(1, () => say('notSureWith', { who: S }, []), true);
      } else {
        this.bump(S, 30);
        this.mem.lies[S] = (this.mem.lies[S] || 0) + 1;
        this.reply(0.9, () => say('denyWith', { who: S }, [{ type: 'accuse', who: S, reason: 'lie' }]), true);
      }
      return;
    }
    /* alguém já tinha contado ter visto S num lugar que não está no álibi que S acabou de dar */
    const told = this.mt.msgs.filter((m) => m.from !== S && m.from !== me).map((m) => ({ m, it: m.intents.find((j) => j.who === S && j.area &&
      ((j.type === 'accuse' && PLACE_REASONS.includes(j.reason)) || (j.type === 'sawAt' && (j.ago == null || j.ago <= 30)))) })).filter((x) => x.it && this.claimClash(S, x.it.area, x.it));
    if (told.length) {
      const best = told.sort((a, b) => this.trust(b.m.from) - this.trust(a.m.from))[0];
      this.updateClashes();
      if (this.trust(best.m.from) >= 0.6 && (pers.times || pers.skeptic || U.chance(0.3))) this.sayClash(S, best.it.area, best.m.from);
    }
    const seen = this.sawTimes(S);
    const matchR = (area) => rooms.some((r) => r === area || M.isNear(r, area));
    if (!seen.length) {
      /* "eu fiquei lá e não te vi": só com permanência longa na última sala dita, e raramente */
      const r = rooms[rooms.length - 1];
      if (r && !known && !this.replied.has('stay' + S) && this.myStay(r) >= 22 && U.chance(0.12 + (pers.skeptic ? 0.15 : 0))) {
        this.replied.add('stay' + S);
        this.bump(S, 8, 'social');
        this.reply(1.2, () => say('contradictStay', { who: S, area: r }, [{ type: 'accuse', who: S, reason: 'sus' }]));
        return;
      }
      if (pers.skeptic && !withIds.length && U.chance(0.3)) this.reply(1.3, () => say('askConfirm', { who: S }, []));
      return;
    }
    const T0 = this.mt.info.t;
    const last = rooms[rooms.length - 1];
    /* visto agora há pouco: tem que bater com a ÚLTIMA sala que disse (ou dar tempo de chegar lá) */
    const recentBad = (s) => {
      const dt = T0 - s.t1;
      if (!last || dt > 12 || s.area === last || M.isNear(last, s.area)) return false;
      return dt + 3 < this.travelTime(s.area, last, S);
    };
    const matches = seen.filter((s) => matchR(s.area) && !recentBad(s));
    const bodyA = this.knowsBody;
    /* só é contradição se não bate de verdade: visto perto do corpo e escondeu isso, ou visto há tão pouco tempo
       num lugar tão longe que não daria para chegar na sala que disse */
    const full = this.claimFull && this.claimFull[S];
    const omit = [];
    /* disse uma sala só e eu vi a pessoa lá pouco antes: ela contou onde estava (fazendo tarefa), não onde parou na
       hora da reunião — gente conta assim. Ter sido vista saindo de lá depois não é mentira (só o corpo pede pergunta) */
    const sawInClaim = !full && matches.some((m) => T0 - m.t1 <= 45);
    const mism = seen.filter((s) => {
      if (s.t1 - s.t0 < 1.2 || matches.some((m) => m.t1 > s.t1)) return false;
      if (sawInClaim) {
        /* exceção: visto há segundos perto do corpo, longe demais para ter voltado à sala que disse — isso esconde */
        const nearBody = bodyA && (s.area === bodyA || M.isNear(s.area, bodyA)) && T0 - s.t1 <= 35;
        if (nearBody && recentBad(s)) return true;
        if (nearBody) omit.push(s);
        return false;
      }
      if (recentBad(s)) return true;
      if (matchR(s.area)) return false;
      const dt = T0 - s.t1;
      if (bodyA && (s.area === bodyA || M.isNear(s.area, bodyA)) && dt <= 35) {
        /* passou perto do corpo e não falou: se ele contou o caminho todo, escondeu; se disse uma sala só, pode só não
           ter mencionado (pergunta antes de acusar) */
        if (full) return true;
        omit.push(s);
        return false;
      }
      if (!last || dt > 20) return false;
      return dt + 3 < this.travelTime(s.area, last, S);
    });
    /* confirmar só com o que viu há pouco e que bate com onde ele diz que estava no fim (ver lá no começo da rodada não prova nada) */
    const fits = (s) => last && (s.area === last || M.isNear(last, s.area)) && !seen.some((o) => o.t1 > s.t1 && !matchR(o.area));
    const confirmable = matches.filter((s) => T0 - s.t1 <= 15 && fits(s));
    const oldSight = matches.filter((s) => T0 - s.t1 > 15 && T0 - s.t1 <= 40 && fits(s));
    if (confirmable.length && !mism.length && U.chance(0.35 + pers.talk * 0.3)) {
      const s = confirmable[confirmable.length - 1];
      const bodyA = this.knowsBody || (this.mt.facts && this.mt.facts.bodyArea);
      const atBody = bodyA && (s.area === bodyA || M.isNear(s.area, bodyA));
      const against = ((this.ev && this.ev[S]) || []).some((e) => e.w >= 12 && !['visual', 'together', 'alibi'].includes(e.reason));
      if (atBody || against) {
        this.reply(1.1, () => say('confirm', { who: S, area: s.area }, [{ type: 'sawAt', who: S, area: s.area, ago: Math.round(T0 - s.t1) }]));
      } else {
        this.bump(S, -7);
        this.reply(1.1, () => say('confirm', { who: S, area: s.area }, [{ type: 'vouch', who: S, reason: 'claim' }]));
      }
    } else if (oldSight.length && !mism.length && U.chance(0.25 + pers.talk * 0.2)) {
      /* viu lá, mas faz tempo: só informa, não serve de álibi */
      const s = oldSight[oldSight.length - 1];
      this.reply(1.1, () => say('sawAgo', { who: S, area: s.area, ago: Math.round((T0 - s.t1) / 5) * 5 }, []));
    } else if (mism.length && known) {
      if (!this.replied.has('ask' + S) && U.chance(0.4)) {
        this.replied.add('ask' + S);
        this.reply(1.2, () => say('askConfirm', { who: S }, []));
      }
    } else if (mism.length) {
      const s = mism[mism.length - 1];
      const rel = this.knowsBody && (s.area === this.knowsBody || M.isNear(s.area, this.knowsBody));
      if (rel || U.chance(0.75)) {
        /* com metamorfo na partida, "te vi lá" pode ter sido o disfarce: pesa menos e fala isso */
        const shift = roleOn(this.g, 'metamorfo');
        const bw = (rel ? 28 : 18) * (shift ? 0.6 : 1);
        this.bump(S, bw);
        this.contraBump[S] = (this.contraBump[S] || 0) + bw;
        /* mentira "guardada" para as próximas reuniões só quando é clara: escondeu que passou no corpo, ou contou o
           caminho todo e não bate (um desencontro de sala sozinho pode ser só jeito de contar) */
        if (!shift && (rel || full)) this.mem.lies[S] = (this.mem.lies[S] || 0) + 1;
        this.reply(1, () => say(shift ? 'shiftDoubt' : rel ? 'hidBodyRoom' : 'contradictSeen', { who: S, area: s.area, claimed: rooms[rooms.length - 1] }, [{ type: 'accuse', who: S, reason: 'lie', area: s.area }]));
      }
    }
    /* passou perto do corpo e não citou (disse uma sala só): pergunta, como gente faria */
    if (!mism.length && omit.length && !this.replied.has('passed' + S) && (pers.times || pers.skeptic || U.chance(0.35))) {
      this.replied.add('passed' + S);
      const s = omit[omit.length - 1];
      this.bump(S, 4, 'social');
      this.reply(1.2, () => say('askPassed', { who: S, area: s.area }, [{ type: 'askWhere', who: S }]));
    }
    void g;
  };

  /* Disse que estava justamente na sala do corpo (sem ter reportado): chama atenção. */
  B.checkBodyRoom = function (S, it, msg) {
    const mt = this.mt, g = this.g, pers = this.pers;
    const info = mt.info;
    if (info.kind !== 'report' || S === info.caller || !info.body) return;
    const bodyArea = this.knowsBody || mt.facts.bodyArea;
    if (!bodyArea) return;
    const rooms = it.rooms || [];
    const last = rooms[rooms.length - 1];
    /* só pesa se foi a ÚLTIMA sala dita (perto da hora do abate) e não é sala de passagem */
    if (last !== bodyArea || ['cafeteria', 'admin', 'storage'].includes(bodyArea)) return;
    if (((this.ev && this.ev[S]) || []).some((e) => e.reason === 'visual' || e.reason === 'alibi' || e.reason === 'together')) return;
    this.bump(S, 4, 'own');
    const inRoom = true;
    if (inRoom && !mt.flags['atBody' + S] && !this.replied.has('atBody') && (pers.skeptic || pers.times || U.chance(0.2))) {
      mt.flags['atBody' + S] = true;
      this.replied.add('atBody');
      this.reply(1, () => ({ text: this.say('atBody', { who: S, area: bodyArea }), intents: [{ type: 'accuse', who: S, reason: 'nearBody', area: bodyArea }] }), true);
    }
    void g;
    void msg;
  };

  B.impOnClaim = function (S, it) {
    const g = this.g, L = this.lvl;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    const q = g.players[S];
    if (q && q.isImp && q !== this.p && U.chance(L.lie * 0.3) && it.rooms && it.rooms.length) {
      this.reply(1.2, () => say('confirm', { who: S, area: it.rooms[it.rooms.length - 1] }, [{ type: 'vouch', who: S, reason: 'claim' }]));
    }
    if (q && !q.isImp && (it.with || []).includes(this.p.id)) {
      this.reply(1, () => say('confirmWith', { who: S }, [{ type: 'vouch', who: S, reason: 'together' }]), true);
    }
  };

  B.checkSawAt = function (S, it) {
    const me = this.p.id, T2 = it.who;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    if (T2 === me) {
      if (this.p.isImp) {
        if (!this.fakeRooms.includes(it.area) && U.chance(0.5)) this.reply(1, () => say('notThere', { area: it.area, mine: this.fakeRooms[this.fakeRooms.length - 1] }, [{ type: 'deny' }]), true);
        return;
      }
      const stay = this.myStay(it.area) + this.mem.trail.filter((s) => s.t1 >= this.rs && M.isNear(s.area, it.area)).length;
      if (stay > 0) {
        if (U.chance(0.4)) this.reply(1, () => say('wasThere', { area: it.area }, []));
      } else {
        this.bump(S, 20);
        const mine = this.myRooms();
        this.reply(1, () => say('notThere', { area: it.area, mine: mine[mine.length - 1] }, [{ type: 'accuse', who: S, reason: 'lie' }]), true);
      }
      return;
    }
    if (this.p.isImp) return;
    const seen = this.sawTimes(T2).filter((s) => this.mt.info.t - s.t1 <= 40);
    if (seen.some((s) => s.area === it.area || M.isNear(s.area, it.area))) {
      this.bump(T2, 6);
      if (U.chance(0.35)) this.reply(1.2, () => say('confirm', { who: T2, area: it.area }, []));
    } else {
      this.bump(T2, 8 * this.trust(S), 'social');
    }
    /* visto há pouco num lugar que não está no álibi dele */
    if (T2 !== S && (it.ago == null || it.ago <= 30) && this.claimClash(T2, it.area, it) && this.trust(S) >= 0.6 && U.chance(0.4)) this.sayClash(T2, it.area, S);
  };

  B.onAccuse = function (S, it) {
    const g = this.g, p = this.p, me = p.id, pers = this.pers, L = this.lvl, mt = this.mt;
    const T2 = it.who;
    const target = g.players[T2];
    if (!target) return;
    const say = (kind, d, intents, opts) => ({ text: this.say(kind, d, opts), intents: intents || [] });
    const strong = STRONG[it.reason] || 0;
    const w = CLAIM_W[it.reason] || 15;
    if (T2 === me) {
      this.accusedMe[S] = (this.accusedMe[S] || 0) + 1;
      this.denies = (this.denies || 0) + 1;
      if (this.accusedMe[S] > 1 || this.denies > 3) return;
      const mine = this.myRooms();
      const area = mine[mine.length - 1];
      /* acusação pelo lugar onde eu mesmo disse que estava: "não, eu estava lá" se contradiz. Admite e nega o abate */
      const there = !!(it.area && PLACE_REASONS.includes(it.reason) && mine.some((r) => r === it.area || M.isNear(r, it.area)));
      if (there && !strong) {
        this.bump(S, p.isImp ? 0 : 6);
        this.reply(0.8, () => say('denyThere', { area: it.area }, [{ type: 'deny' }]), true);
        return;
      }
      if (it.reason === 'vent' && roleOn(g, 'engenheiro') && (p.special === 'engenheiro' || (p.isImp && U.chance(L.lie * 0.7)))) {
        /* engenheiro de verdade (ou impostor blefando) explica o duto */
        this.reply(0.7, () => say('roleClaim', { role: 'engenheiro' }, [{ type: 'deny' }, { type: 'roleClaim', role: 'engenheiro' }]), true);
        return;
      }
      const vis = g.S.rules.visualTasks ? p.tasks.find((tk) => !tk.done && tk.def && tk.def.visual) : null;
      if (!this.offered && (vis ? !p.isImp && U.chance(0.55) : p.isImp && g.S.rules.visualTasks && U.chance(L.lie * 0.25))) {
        this.offered = { to: [S] };
        const task = vis ? vis.id : 'scan';
        this.reply(0.8, () => say('offerVisual', { task }, [{ type: 'deny' }, { type: 'offerVisual' }]), true);
        return;
      }
      /* eu mesmo vi alguém com a minha cara nesta rodada: sei que o metamorfo andou por aí disfarçado de mim */
      const selfTwin = !p.isImp ? this.mem.events.find((e) => e.type === 'twin' && e.self && e.t >= this.rs) : null;
      if (selfTwin && (strong || it.area || PLACE_REASONS.includes(it.reason) || it.reason === 'lie')) {
        this.bump(S, strong ? 4 : 2);
        this.reply(0.8, () => say('twinSelfDeny', { area: selfTwin.a1, mine: area }, [{ type: 'deny' }, { type: 'roleTheory', role: 'metamorfo', who: me }]), true);
        return;
      }
      /* com metamorfo na partida: me "viram" num lugar onde eu não estava (ou matando, e eu sei que não matei) —
         quem acusa pode estar sendo honesto e ter visto o disfarce. Explico em vez de chamar de mentiroso. */
      if (!p.isImp && roleOn(g, 'metamorfo') && (strong || (it.area && (PLACE_REASONS.includes(it.reason) || it.reason === 'lie')))) {
        const T0 = mt.info.t;
        const wasThere = it.area && this.mem.trail.some((s) => s.t1 >= T0 - 45 && (s.area === it.area || M.isNear(s.area, it.area)));
        if (!wasThere && (it.reason === 'kill' || it.reason === 'shift' || it.area)) {
          this.bump(S, strong ? 8 : 3);
          this.reply(0.8, () => say('notMeShift', { area: it.area, mine: area }, [{ type: 'deny' }, { type: 'roleTheory', role: 'metamorfo', who: me }]), true);
          return;
        }
      }
      if (!p.isImp) {
        this.bump(S, strong ? 45 : 10);
        if (strong && !pers.defend && U.chance(0.6)) this.reply(0.8, () => say('denyStrong', { accuser: S, area }, [{ type: 'deny' }, { type: 'accuse', who: S, reason: 'lie' }], { strong: true }), true);
        else this.reply(0.8, () => say('deny', { area }, [{ type: 'deny' }]), true);
      } else {
        if (U.chance(0.4 + L.lie * 0.5)) this.reply(0.8, () => say('denyStrong', { accuser: S, area }, [{ type: 'deny' }, { type: 'accuse', who: S, reason: 'lie' }]), true);
        else this.reply(0.8, () => say('deny', { area }, [{ type: 'deny' }]), true);
        if (strong && U.chance(L.lie * 0.6) && !this.replied.has('counter' + S)) {
          this.replied.add('counter' + S);
          this.reply(2.2, () => say('counter', { who: S }, [{ type: 'accuse', who: S, reason: 'lie' }]), true);
        }
      }
      return;
    }
    if (p.isImp) {
      if (target.isImp) {
        /* parceiro acusado: se a coisa está feia, larga ele (ou até vota nele); se está leve, defende com discrição */
        const heat = (mt.heat[T2] || 0) + (strong ? 30 : 0);
        const others = Object.keys(mt.defenders[T2] || {}).filter((id) => +id !== me).length;
        if (heat >= 55 && U.chance(L.bus) && !this.replied.has('bus' + T2)) {
          this.replied.add('bus' + T2);
          this.reply(1.8, () => say('agree', { who: T2 }, [{ type: 'agree', who: T2 }]));
        } else if (heat < 40 && !this.replied.has('defp' + T2) && U.chance(0.3 + L.lie * 0.35) && others < 2) {
          this.replied.add('defp' + T2);
          /* discreto: às vezes só pede prova em vez de defender abertamente */
          if (U.chance(0.5)) this.reply(1.6, () => say('askProof', { who: T2 }, [{ type: 'askProof' }]));
          else this.reply(1.6, () => say('defendPartner', { who: T2 }, [{ type: 'vouch', who: T2, reason: 'claim' }]));
        }
      } else if (U.chance(0.25 + L.lie * 0.2) && !this.replied.has('agree' + T2)) {
        this.replied.add('agree' + T2);
        this.reply(1.3, () => say('agree', { who: T2 }, [{ type: 'agree', who: T2 }]));
      }
      return;
    }
    let belief = w * this.trust(S);
    /* apertou o botão para contar isso: se expôs, e impostor raramente chama reunião só para inventar */
    if (mt.info.kind === 'emergency' && mt.info.caller === S && strong) belief *= 1.2;
    /* quem já provou ser tripulante (tarefa visual) não tem motivo para inventar que viu matar/ventar/transformar */
    if (strong && S !== T2 && (this.hardCleared(S) || this.clearedByVisual(S))) belief *= 1.5;
    /* a mesma pessoa repetindo a mesma acusação não vale como prova nova */
    this.heardAcc = this.heardAcc || {};
    const hk = S + ':' + T2;
    const heard = this.heardAcc[hk] || 0;
    this.heardAcc[hk] = heard + 1;
    if (heard && !STRONG[it.reason]) belief *= 0.3;
    /* "vi se transformar / sumir": uma testemunha sozinha pode estar enganada (ou mentindo); duas fecham o caso */
    if (it.reason === 'shift' || it.reason === 'vanish') {
      const more = mt.msgs.some((m) => m.from !== S && m.from !== me && m.intents.some((j) => j.type === 'accuse' && j.who === T2 && (j.reason === 'shift' || j.reason === 'vanish')));
      if (more) belief *= 1.9;
      else if ((pers.skeptic || pers.defend) && !this.replied.has('proof' + T2)) {
        this.replied.add('proof' + T2);
        this.reply(1.1, () => say('askProof', { who: T2 }, [{ type: 'askProof' }]));
      }
    }
    /* a acusação diz onde ele estava, e ele disse outro lugar: um dos dois mente (a conta fica em updateClashes) */
    const clash = it.area && PLACE_REASONS.includes(it.reason) && T2 !== S && this.claimClash(T2, it.area, it);
    if (clash && this.trust(S) >= 0.6 && (pers.times || pers.skeptic || pers.leader || U.chance(0.35))) this.sayClash(T2, it.area, S);
    /* revide: acusado que devolve "mentiroso" sem dizer nada concreto não é prova nova contra quem acusou */
    if (it.reason === 'lie' && !it.area && mt.accusers[S] && mt.accusers[S][T2]) {
      belief *= 0.25;
      this.bump(S, 3, 'social');
    } else if (it.reason === 'lie' && !it.area && !it.proof) {
      /* "mentiroso" sem dizer onde nem por quê não dá para conferir: nas partidas de teste, quase sempre era o
         impostor defendendo a si ou ao parceiro */
      belief *= 0.4;
    }
    /* quem reportou estava no corpo, claro: "vi fulano perto do corpo" contra quem achou o corpo não diz nada */
    const reporterNear = mt.info.kind === 'report' && T2 === mt.info.caller && (it.reason === 'nearBody' || it.reason === 'fromBody') &&
      (!it.area || !mt.info.body || it.area === mt.info.body.area || M.isNear(it.area, mt.info.body.area));
    if (reporterNear) belief *= 0.25;
    /* com metamorfo na partida, "vi o X matando" de uma testemunha só pode ter sido o disfarce: pesa um pouco menos
       e alguém pergunta quem estava com o X */
    if (it.reason === 'kill' && roleOn(g, 'metamorfo') && S !== T2) {
      const others = mt.msgs.some((m) => m.from !== S && m.from !== me && m.intents.some((j) => j.type === 'accuse' && j.who === T2 && j.reason === 'kill'));
      if (!others) {
        belief *= 0.8;
        if (!mt.flags['disgQ' + T2] && (pers.times || pers.skeptic || pers.leader) && U.chance(0.6)) {
          mt.flags['disgQ' + T2] = true;
          this.reply(1.3, () => say('roleMaybe', { role: 'metamorfo', who: T2 }, []));
          this.reply(2.6, () => say('askConfirm', { who: T2 }, []));
        }
      }
    }
    const myEv = (this.ev && this.ev[T2]) || [];
    const clearedByMe = myEv.some((e) => e.reason === 'together' || e.reason === 'alibi');
    if (clearedByMe && !STRONG[it.reason]) {
      belief *= 0.3;
      this.bump(S, 9, 'own');
      this.falseAcc = this.falseAcc || {};
      this.falseAcc[S] = (this.falseAcc[S] || 0) + 1;
    }
    const myVisual = myEv.some((e) => e.reason === 'visual');
    const iSawStrong = myEv.some((e) => STRONG[e.reason] && !e.twinCut);
    /* eu vi dois T2 ao mesmo tempo: o que "o T2" fez nessa hora pode ter sido o metamorfo (com um impostor só, o T2 é
       inocente de qualquer jeito) */
    const twinE = myEv.find((e) => e.reason === 'twin' && (!e.past || e.solo));
    const twinFits = twinE && (twinE.solo || ['kill', 'vent', 'fakeTask', 'noscan', 'follow', 'lie'].concat(PLACE_REASONS).includes(it.reason));
    if (twinFits && !iSawStrong && !(myVisual && !g.S.house.noVisualHardClear)) {
      belief *= twinE.solo ? 0.1 : 0.4;
      if (!this.replied.has('twinD' + T2)) {
        this.replied.add('twinD' + T2);
        this.reply(0.9, () => say('twinDefend', { who: T2, area: twinE.area, area2: twinE.area2, solo: !!twinE.solo, strong: !!strong }, [{ type: 'vouch', who: T2, reason: 'twin' }, { type: 'roleTheory', role: 'metamorfo', who: T2 }]), true);
      }
    } else if (myVisual && !g.S.house.noVisualHardClear) {
      belief *= 0.12;
      this.bump(S, strong ? 25 : 6);
      this.falseAcc = this.falseAcc || {};
      this.falseAcc[S] = (this.falseAcc[S] || 0) + (strong ? 2 : 1);
      if (!this.replied.has('vis' + T2)) {
        this.replied.add('vis' + T2);
        const e = myEv.find((x) => x.reason === 'visual');
        this.reply(0.9, () => say('vouch', { who: T2, reason: 'visual', task: e.task }, [{ type: 'vouch', who: T2, reason: 'visual' }]), true);
      }
    } else if (iSawStrong) {
      if (!this.replied.has('also' + T2)) {
        this.replied.add('also' + T2);
        this.reply(0.8, () => say('alsoSaw', { who: T2 }, [{ type: 'agree', who: T2 }]));
      }
    } else {
      const tog = this.togetherMap()[T2] || 0;
      const sawThere = it.area && !reporterNear && this.sawTimes(T2).some((s) => mt.info.t - s.t1 <= 45 && (s.area === it.area || M.isNear(s.area, it.area)));
      if (sawThere) {
        belief *= 1.4;
        if (U.chance(0.45)) this.reply(1.1, () => say('confirm', { who: T2, area: it.area }, [{ type: 'agree', who: T2 }]));
      } else if (tog >= 25 && strong) {
        belief *= 0.35;
        if (!this.replied.has('tog' + T2)) {
          this.replied.add('tog' + T2);
          this.reply(1, () => say('vouch', { who: T2, reason: 'together' }, [{ type: 'vouch', who: T2, reason: 'together' }]));
        }
      } else if (pers.defend && !strong && U.chance(0.55) && !this.replied.has('proof' + T2)) {
        this.replied.add('proof' + T2);
        this.reply(1.1, () => say('askProof', { who: T2 }, [{ type: 'askProof' }]));
      } else if (pers.skeptic && U.chance(strong ? 0.25 : 0.4) && !this.replied.has('proof' + T2)) {
        this.replied.add('proof' + T2);
        this.reply(1.1, () => say('askProof', { who: T2 }, [{ type: 'askProof' }]));
      } else if (pers.follow > 0.5 && (mt.heat[T2] || 0) > 30 && U.chance(0.45) && !this.replied.has('agree' + T2)) {
        this.replied.add('agree' + T2);
        this.reply(1.2, () => say('agree', { who: T2 }, [{ type: 'agree', who: T2 }]));
      }
    }
    this.bump(T2, belief, strong ? 'claim' : 'social');
  };

  /* Entrar no assunto: quem chamou a reunião (ou o jogador acusando alguém) não fica falando sozinho.
     Cada um reage do seu jeito, com o que sabe: pergunta detalhe, acredita, duvida, defende ou cobra o acusado. */
  B.topicReply = function (msg, role) {
    const g = this.g, p = this.p, mt = this.mt, pers = this.pers, H = msg.from;
    if (!mt || mt.closed || !p.alive || H === p.id || this.repliedTo.has(msg.id)) return false;
    const say = (kind, d, intents, opts) => ({ text: this.say(kind, d, opts), intents: intents || [] });
    const acc = msg.intents.find((i) => i.type === 'accuse' && i.who != null && i.who !== H && i.reason !== 'vote');
    let fn = null;
    if (acc && acc.who === p.id) return false;
    if (acc) {
      const X = acc.who, strong = !!STRONG[acc.reason];
      const myEv = (this.ev && this.ev[X]) || [];
      const vis = myEv.find((e) => e.reason === 'visual');
      const mine = myEv.filter((e) => e.w >= 8).sort((a, b) => b.w - a.w)[0];
      if (p.isImp) {
        /* impostor também participa: com o parceiro na mira pede prova; com um inocente, embarca */
        if (g.players[X].isImp) fn = () => say('topicDoubt', { who: X }, [{ type: 'askProof' }]);
        else fn = () => say(U.chance(0.5) ? 'topicBelieve' : 'topicAskAccused', { who: X }, U.chance(0.5) ? [{ type: 'agree', who: X }] : [{ type: 'askWhere', who: X }]);
      } else if (vis && !g.S.house.noVisualHardClear) {
        fn = () => say('vouch', { who: X, reason: 'visual', task: vis.task }, [{ type: 'vouch', who: X, reason: 'visual' }]);
      } else if (mine) {
        /* tem pista própria: soma ao que foi dito (o mesmo que viu, ou o que ele tem contra) */
        if (mine.reason === acc.reason) fn = () => say('alsoSaw', { who: X }, [{ type: 'agree', who: X }]);
        else fn = () => say('accuse', { who: X, reason: mine.reason, area: mine.area, victim: mine.victim }, [{ type: 'agree', who: X }, { type: 'accuse', who: X, reason: mine.reason, area: mine.area }]);
      } else if (role === 'ask') {
        fn = () => say('topicAsk', { who: X, reason: acc.reason, area: acc.area }, [], { question: true });
        mt.lastToHuman = p.id;
      } else {
        const t = this.trust(H) + (strong ? 0.15 : 0) + pers.follow * 0.25 - (pers.skeptic ? 0.25 : 0) - (pers.defend ? 0.15 : 0) + ((this.susp[X] || 0) > 15 ? 0.2 : 0) - ((this.susp[X] || 0) < -15 ? 0.3 : 0);
        if (t >= 0.85) {
          fn = () => say('topicBelieve', { who: X }, [{ type: 'agree', who: X }]);
          this.bump(X, strong ? 10 : 5, 'social');
        } else if (t < 0.5) fn = () => say('topicDoubt', { who: X }, [{ type: 'askProof' }]);
        else fn = () => say('topicAskAccused', { who: X }, [{ type: 'askWhere', who: X }]);
      }
    } else {
      const sawAt = msg.intents.find((i) => i.type === 'sawAt' && i.who != null && i.who !== p.id);
      if (sawAt && sawAt.area) fn = () => say('topicSawAt', { who: sawAt.who, area: sawAt.area }, [], { question: true });
      else if (!msg.intents.some((i) => ['claimLoc', 'bodyArea', 'reportInfo', 'skip', 'vouch'].includes(i.type))) {
        fn = () => say('topicWhat', {}, [], { question: true });
        mt.lastToHuman = p.id;
      }
    }
    if (!fn) return false;
    const c0 = this.curMsg, o0 = this.curMsgObj;
    this.curMsg = msg.id;
    this.curMsgObj = msg;
    this.reply(role === 'ask' ? 0.5 : 1.1, fn, true);
    this.curMsg = c0;
    this.curMsgObj = o0;
    return true;
  };

  /* "Quem vocês viram era o metamorfo com a cara do X." Confere com o que eu sei: se eu mesmo vi o X em outro lugar
     nessa hora, ou estava com ele, ou ele já provou ser tripulante, é o disfarce mesmo — tiro o que pesava contra ele
     por lugar/mentira e defendo. Sem nada que confirme, a pista de "te vi lá" perde bastante força (com metamorfo na
     partida ela prova pouco), mas não inocento de vez: o próprio impostor pode usar essa desculpa. */
  B.disguiseTheory = function (X, by) {
    const g = this.g, mt = this.mt, pers = this.pers;
    if (this.replied.has('disgT' + X)) return false;
    this.replied.add('disgT' + X);
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    const T0 = mt.info.t;
    const near = (a, b) => a === b || M.isNear(a, b);
    /* onde disseram ter visto o X (as versões que pesam contra ele) */
    const told = [];
    for (const m of mt.msgs) {
      if (m.from === X) continue;
      for (const j of m.intents) if (j.who === X && j.area && (placeIntent(j) || (j.type === 'accuse' && (j.reason === 'lie' || j.reason === 'kill')))) told.push({ from: m.from, area: j.area, kill: j.reason === 'kill' });
    }
    const myEv = (this.ev && this.ev[X]) || [];
    const withMe = myEv.find((e) => e.reason === 'together' && e.secs >= 10);
    const visual = myEv.some((e) => e.reason === 'visual') || this.clearedByVisual(X);
    /* eu vi o X, recentemente, num lugar diferente de onde disseram: dois X ao mesmo tempo */
    const mine = this.sawTimes(X).filter((q) => T0 - q.t1 <= 45);
    const clash = told.length ? mine.find((q) => told.every((tt) => !near(q.area, tt.area)) && q.t1 - q.t0 >= 1) : null;
    const place = ['nearBody', 'lastWith', 'withVictim', 'fromBody', 'lie'];
    /* eu mesmo vi o X matar (ou entrar no duto, mudar de forma) e nada me diz que era outro: a teoria não me convence */
    const strongMine = myEv.find((e) => STRONG[e.reason] && !e.twinCut);
    if (strongMine && !withMe && !visual) {
      if (!this.replied.has('rev' + X)) {
        this.replied.add('rev' + X);
        this.reply(1, () => say('accuse', { who: X, reason: strongMine.reason, area: strongMine.area, victim: strongMine.victim }, [{ type: 'accuse', who: X, reason: strongMine.reason, strong: true }]), true);
      }
      return true;
    }
    if (withMe || visual || clash) {
      this.ev[X] = myEv.filter((e) => !place.includes(e.reason));
      this.bump(X, -((this.contraBump[X] || 0) + 14), 'own');
      this.contraBump[X] = 0;
      this.chatClaim[X] = (this.chatClaim[X] || 0) * 0.35;
      this.chatSocial[X] = (this.chatSocial[X] || 0) * 0.5;
      this.recalc();
      const area = told.length ? told[told.length - 1].area : null;
      const myLast = this.recentRooms ? this.recentRooms().slice(-1)[0] : null;
      const mineArea = clash ? clash.area : withMe ? myLast : null;
      if (area && mineArea && !near(area, mineArea)) {
        this.reply(1, () => say('disguiseYes', { who: X, area, mine: mineArea, with: !!withMe }, [{ type: 'vouch', who: X, reason: withMe ? 'together' : 'claim' }]), true);
      } else if (visual) {
        /* a explicação da visual basta uma vez na reunião; os outros só mudam de ideia */
        if (mt.flags['visDisg' + X]) return true;
        mt.flags['visDisg' + X] = true;
        const vEv = this.mem.events.find((e) => e.type === 'visual' && e.who === X);
        const vMsg = !vEv && mt.msgs.map((m) => m.intents.find((j) => j.type === 'vouch' && j.who === X && j.reason === 'visual')).filter(Boolean).pop();
        const task = vEv ? vEv.task : vMsg ? vMsg.task : null;
        /* o que eu mesmo vi "o X" fazer de impostor (matar) é o que o disfarce explica */
        const kd = strongMine && strongMine.reason === 'kill' ? { kill: true, victim: strongMine.victim, area: strongMine.area } : { area };
        this.reply(1, () => say('visualDisguise', Object.assign({ who: X, task, sawVis: !!vEv }, kd), [{ type: 'vouch', who: X, reason: vEv ? 'visual' : 'claim', task }]), true);
      } else {
        this.reply(1, () => say('roleMaybe', { role: 'metamorfo', who: X }, [{ type: 'vouch', who: X, reason: 'claim' }]), true);
      }
      return true;
    }
    /* sem confirmação: "eu vi" perde força, mas pergunta quem confirma */
    const f = pers.times ? 0.6 : 0.5;
    for (const e of myEv) if (place.includes(e.reason)) e.w *= f;
    if (this.contraBump[X]) {
      this.bump(X, -this.contraBump[X] * 0.5, 'own');
      this.contraBump[X] *= 0.5;
    }
    this.chatClaim[X] = (this.chatClaim[X] || 0) * (told.some((tt) => tt.kill) ? 0.75 : 0.6);
    this.chatSocial[X] = (this.chatSocial[X] || 0) * 0.75;
    this.recalc();
    if ((pers.times || pers.skeptic || pers.defend || U.chance(0.3)) && !mt.flags['disgAsk' + X]) {
      mt.flags['disgAsk' + X] = true;
      this.reply(1.2, () => say('disguiseMaybe', { who: X }, [{ type: 'askConfirm', who: X }]));
    }
    void by;
    void g;
    return true;
  };

  B.onVouch = function (S, it) {
    const me = this.p.id, T2 = it.who, mt = this.mt;
    if (T2 === me || this.p.isImp) return;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    const myEv = (this.ev && this.ev[T2]) || [];
    /* Metamorfo: eu "vi o X" perto do corpo, mas alguém de confiança estava com ele → era o disfarce.
       Tira a culpa do X e aperta quem não tem ninguém confirmando onde estava. */
    /* "vi dois X ao mesmo tempo": o que eu vi "o X" fazendo (até duto, tarefa falsa) pode ter sido o disfarce */
    const twin = it.reason === 'twin';
    const visV = it.reason === 'visual';
    const bodyE0 = myEv.find((e) => ['kill', 'nearBody', 'lastWith', 'withVictim', 'fromBody'].concat(twin ? ['vent', 'fakeTask', 'noscan', 'follow'] : []).includes(e.reason));
    /* com tarefa visual, estar perto do corpo não precisa de explicação (tripulante também passa lá): só o abate que
       eu vi "o X" fazer é que só pode ter sido o disfarce */
    const bodyE = visV && !twin ? (bodyE0 && bodyE0.reason === 'kill' ? bodyE0 : null) : bodyE0;
    if (bodyE && roleOn(this.g, 'metamorfo') && (it.reason === 'together' || visV || twin) && this.trust(S) >= 0.5 && S !== T2 && !this.replied.has('disg' + T2)) {
      this.replied.add('disg' + T2);
      this.ev[T2] = myEv.filter((e) => e !== bodyE);
      this.bump(T2, -Math.min(45, bodyE.w), 'own');
      const task = it.task || (this.mem.events.find((e) => e.type === 'visual' && e.who === T2) || {}).task;
      const dd = { who: T2, by: S, area: bodyE.area, kill: bodyE.reason === 'kill', victim: bodyE.victim, task };
      if (!(visV && !twin && mt.flags['visDisg' + T2])) {
        if (visV && !twin) mt.flags['visDisg' + T2] = true;
        this.reply(1, () => say(twin ? 'twinAgree' : visV ? 'visualDisguise' : 'shiftTheory', dd, [{ type: 'vouch', who: T2, reason: 'claim' }]), true);
      }
      const vouched = (id) => mt.msgs.some((m) => m.from !== id && m.intents.some((x) => x.type === 'vouch' && x.who === id));
      const open = mt.alive.filter((id) => id !== me && id !== T2 && !this.hardCleared(id) && !vouched(id));
      for (const id of open) this.bump(id, 7, 'social');
      const top = open.sort((a, b) => (this.susp[b] || 0) - (this.susp[a] || 0))[0];
      if (top != null) this.reply(2.4, () => say('askConfirm', { who: top }, []));
      return;
    }
    const strongE = myEv.find((e) => STRONG[e.reason]);
    if (strongE) {
      this.bump(S, 15);
      if (!this.replied.has('rev' + T2)) {
        this.replied.add('rev' + T2);
        this.reply(0.9, () => say('accuse', { who: T2, reason: strongE.reason, area: strongE.area, victim: strongE.victim }, [{ type: 'accuse', who: T2, reason: strongE.reason, strong: true }], { strong: true }), true);
      }
      return;
    }
    let w = it.reason === 'visual' ? 30 : twin ? 22 : it.reason === 'together' ? 16 : 9;
    /* dupla que só se confirma entre si (ninguém mais confirma nenhum dos dois) pode ser a dupla de impostores */
    const vouchedBy = (id) => mt.msgs.filter((m) => m.from !== id && m.intents.some((x) => x.type === 'vouch' && x.who === id)).map((m) => m.from);
    const byS = vouchedBy(S);
    if (it.reason !== 'visual' && !this.hardCleared(S) && byS.length && byS.every((id) => id === T2) && vouchedBy(T2).every((id) => id === S)) w *= 0.5;
    this.bump(T2, -w * this.trust(S), it.reason === 'visual' ? 'claim' : 'social');
    /* com metamorfo na partida, "estava comigo" contra "vi matando" sugere disfarce: a acusação forte pesa menos */
    if (roleOn(this.g, 'metamorfo') && (it.reason === 'together' || it.reason === 'visual' || twin) && this.trust(S) >= 0.6 &&
        mt.msgs.some((m) => m.from !== S && m.intents.some((x) => x.type === 'accuse' && x.who === T2 && STRONG[x.reason]))) {
      this.bump(T2, -30 * this.trust(S), 'claim');
    }
  };

  /* ---------- voto ---------- */
  /* inocentado por tarefa visual que um tripulante de confiança relatou no chat */
  B.clearedByVisual = function (id) {
    const mt = this.mt;
    if (!mt || this.g.S.house.noVisualHardClear) return false;
    return mt.msgs.some((m) => m.from !== id && m.intents.some((it) => it.type === 'vouch' && it.who === id && it.reason === 'visual') && this.trust(m.from) >= 0.5);
  };

  B.impTarget = function () {
    const g = this.g, mt = this.mt, me = this.p.id;
    let best = null, bs = -1e9;
    for (const id of mt.alive) {
      const q = g.players[id];
      if (id === me || q.isImp) continue;
      const s = (mt.heat[id] || 0) + (this.accusedMe[id] ? 25 : 0) + (id === this.scapegoat ? 12 : 0) + mt.saidOn(id) * 12;
      if (s > bs) {
        bs = s;
        best = id;
      }
    }
    return bs >= 18 ? best : null;
  };

  B.mVote = function () {
    const g = this.g, mt = this.mt, me = this.p.id, pers = this.pers;
    const alive = mt.alive.filter((id) => id !== me);
    if (this.p.isImp) {
      const partners = alive.filter((id) => g.players[id].isImp);
      for (const pid of partners) {
        const on = mt.saidOn(pid);
        if (on >= Math.ceil((mt.alive.length - 1) / 2) - 1 && on >= 2 && U.chance(this.lvl.bus)) return pid;
      }
      /* reta final (mais um abate e ganhamos): os impostores votam juntos no mesmo tripulante */
      const impsAlive = mt.alive.filter((id) => g.players[id].isImp).length;
      if (mt.alive.length - impsAlive <= impsAlive + 1 && partners.length) {
        const said = mt.saidVotes();
        const mateVote = partners.map((pid) => said[pid]).find((v) => v != null && v !== 'skip' && g.players[v] && !g.players[v].isImp);
        if (mateVote != null) return mateVote;
        const lead0 = mt.saidLeading();
        if (lead0 && !g.players[lead0.id].isImp && lead0.id !== me) return lead0.id;
        /* sem voto anunciado para seguir: os dois escolhem pelo mesmo critério público (o mais acusado no chat) */
        const pick = mt.alive.filter((id) => !g.players[id].isImp).sort((a, b) => (mt.heat[b] || 0) - (mt.heat[a] || 0) || a - b)[0];
        if (pick != null) return pick;
      }
      const t = this.impTarget();
      if (t != null) return t;
      const lead = mt.saidLeading();
      if (lead && !g.players[lead.id].isImp && lead.count >= 2) return lead.id;
      return 'skip';
    }
    const WEAK = { hunch: 1, vote: 1, sus: 1, mention: 1 };
    /* eliminação: quem já foi inocentado sai da lista; se sobram poucos, os que sobram pesam mais */
    const cleared = (id) => ((this.ev && this.ev[id]) || []).some((e) => e.reason === 'visual') || this.clearedByVisual(id);
    /* álibi firme: esteve comigo um bom tempo nesta rodada, ou alguém de confiança confirmou que estavam juntos */
    const solid = (id) => cleared(id) || ((this.ev && this.ev[id]) || []).some((e) => (e.reason === 'together' && e.secs >= 20) || (e.reason === 'alibi' && e.cover >= 0.7 && e.solo)) ||
      mt.msgs.some((m) => m.from !== id && m.from !== me && this.trust(m.from) >= 0.75 && m.intents.some((x) => x.type === 'vouch' && x.who === id && (x.reason === 'together' || x.reason === 'visual')));
    const impsLeft = this.impsLeftEst();
    const open = alive.filter((id) => !solid(id));
    const elim = open.length > 0 && open.length <= impsLeft + 1 ? 22 : open.length <= impsLeft + 2 ? 12 : open.length <= impsLeft + 3 ? 5 : 0;
    /* linhas de prova independentes contra alguém: o que eu vi + acusações de gente diferente em quem confio */
    const lines = (id) => {
      const own = new Set(((this.ev && this.ev[id]) || []).filter((e) => e.w >= 8).map((e) => e.reason));
      const acc = new Set(mt.msgs.filter((m) => m.from !== me && m.from !== id && this.trust(m.from) >= 0.6 &&
        m.intents.some((x) => x.type === 'accuse' && x.who === id && !WEAK[x.reason])).map((m) => m.from)).size;
      return own.size + Math.min(2, acc) + ((this.mem.lies && this.mem.lies[id]) ? 1 : 0);
    };
    /* quem disse no chat em quem ia votar tende a manter a palavra */
    const said = (id) => (this.committed === id && !cleared(id) ? 16 : 0);
    /* ir na onda só se quem puxou a acusação for alguém em quem confio E trouxe um motivo concreto
       ("acho que é ele", "vota nele" e "concordo" sozinhos não são motivo) */
    const leadOk = (id) => mt.msgs.some((m) => m.from !== me && m.from !== id && this.trust(m.from) >= 0.6 &&
      m.intents.some((x) => x.type === 'accuse' && x.who === id && !WEAK[x.reason]));
    /* sem tarefa visual e sem ejeção confirmada ninguém prova nada. Com a visão curta, ainda por cima, quase ninguém vê
       nada por conta própria e o chat vira terreno dos impostores: aí o que só se falou no chat pesa bem menos e o voto
       pede pista própria ou relato forte (vale para qualquer reunião) */
    const blind = !g.S.rules.visualTasks && !g.S.rules.confirmEjects;
    const chatBlind = blind && g.S.rules.crewVision < 1;
    const grounded = (id) => ((this.ev && this.ev[id]) || []).some((e) => e.w > 0) || (this.chatClaim[id] || 0) > 12;
    /* quem se ofereceu para provar com tarefa visual ("me segue que eu faço os escudos") ganha o benefício da dúvida,
       principalmente no começo: dá para conferir na próxima rodada. Não vale contra prova forte, contra quem já
       prometeu antes e não provou, nem na reta final. */
    const strongOn = (id) => ((this.ev && this.ev[id]) || []).some((e) => STRONG[e.reason] || e.reason === 'noProof' || e.reason === 'fakeTask' || e.reason === 'noscan');
    const offered = (id) => g.S.rules.visualTasks && !this.hardCleared(id) && !this.mem.events.some((e) => e.type === 'noProof' && e.who === id) && mt.msgs.some((m) => m.from === id && m.intents.some((x) => x.type === 'offerVisual'));
    const earlyGame = g.meetings <= 2 || alive.length >= 7;
    const relief = (id) => (offered(id) && !strongOn(id) ? (earlyGame ? 16 : 9) : 0);
    /* quem eu mesmo defendi nesta reunião ("tava comigo", "vi fazendo a visual", "era o metamorfo com a cara dele"):
       votar nele seria desdizer o que eu falei; só com prova forte (vi matar/ventar, ou alguém de confiança viu) */
    const strongChat = (id) => mt.msgs.some((m) => m.from !== me && m.from !== id && this.trust(m.from) >= 0.6 && m.intents.some((x) => x.type === 'accuse' && x.who === id && STRONG[x.reason]));
    const myWord = (id) => mt.msgs.some((m) => m.from === me && m.intents.some((x) => x.type === 'vouch' && x.who === id)) && !strongOn(id) && !strongChat(id);
    const score = (id) => {
      const v = (this.susp[id] || 0) + (elim && open.includes(id) ? elim : 0) + (leadOk(id) ? pers.follow * (mt.heat[id] || 0) * 0.3 + mt.saidOn(id) * pers.follow * 7 : 0) + said(id) - (solid(id) ? 12 : 0) - relief(id) - (myWord(id) ? 35 : 0);
      return chatBlind && v > 0 && !grounded(id) ? v * 0.55 : v;
    };
    const ranked = alive.filter((id) => !myWord(id)).map((id) => ({ id, s: score(id) })).sort((a, b) => b.s - a.s);
    if (AU.debug && AU.debug.trace) {
      this.why = ranked.slice(0, 3).map((r) => ({ id: r.id, s: Math.round(r.s), susp: Math.round(this.susp[r.id] || 0), chat: Math.round(this.chatDelta[r.id] || 0), carry: Math.round((this.carry[r.id] || 0) * 0.5), heat: mt.heat[r.id] || 0, votes: mt.saidOn(r.id), ev: ((this.ev && this.ev[r.id]) || []).map((e) => e.reason + ':' + Math.round(e.w)) }));
    }
    const top = ranked[0], second = ranked[1] || { s: -999 };
    if (!top) return 'skip';
    /* conta de cabeça: se o próximo abate pode dar a vitória aos impostores, pular é perigoso */
    const crewLeft = mt.alive.length - impsLeft;
    const crisis = crewLeft <= impsLeft + 1;
    const ln = lines(top.id);
    const thr = pers.thr * (this.skipLean > 2 ? 1.12 : 1) * (crisis ? 0.75 : 1) * (ln >= 3 ? 0.65 : ln >= 2 ? 0.8 : 1);
    if (top.s >= thr && top.s - second.s >= (crisis ? 6 : 8)) return top.id;
    const lead = mt.saidLeading();
    const saidV = mt.saidVotes();
    const trustedLead = (id) => leadOk(id) || Object.keys(saidV).some((v) => +v !== me && saidV[v] === id && this.trust(+v) >= 0.7 && (this.hardCleared(+v) || this.clearedByVisual(+v)));
    /* voto dividido não tira ninguém: se quem está na frente também é suspeito para mim e quem puxou trouxe prova
       (ou já provou ser tripulante), junto ali */
    if (lead && lead.count >= 2 && lead.id !== me && !cleared(lead.id) && !myWord(lead.id) && trustedLead(lead.id) && (!chatBlind || grounded(lead.id))) {
      const lc = ranked.find((r) => r.id === lead.id);
      if (lc && ranked.indexOf(lc) <= 1 && lc.s >= thr * (pers.follow > 0.7 ? 0.35 : 0.55)) return lead.id;
    }
    /* crise: pular entrega o jogo (mais um abate e eles ganham). Vota em quem pesa mais entre os não inocentados;
       só vai no que está na frente se ele também é um dos meus dois mais suspeitos e quem puxou é confiável */
    /* reta final às cegas: voto só pelo que se falou no chat vira chute (e os dois impostores votando juntos ganham o
       chute). Só força o voto quem tem pista própria ou relato forte; sem isso, pular dá tempo de terminar as tarefas. */
    if (crisis && (!blind || ranked.some((r) => !cleared(r.id) && grounded(r.id)))) {
      /* na reta final até pista fraca decide: admitiu ter passado na sala do corpo, disse que estava numa sala onde
         eu fiquei um tempo e não o vi, ou ninguém confirmou onde estava */
      const bodyA = this.knowsBody || mt.facts.bodyArea;
      const vouched = (id) => mt.msgs.some((m) => m.from !== id && m.intents.some((x) => x.type === 'vouch' && x.who === id));
      const tie = (id) => {
        let t = 0;
        const rooms = this.claims[id] || [];
        if (bodyA && rooms.some((r) => r === bodyA)) t += 6;
        const last = rooms[rooms.length - 1];
        if (last && this.myStay(last) >= 8 && !this.sawTimes(id).some((x) => mt.info.t - x.t1 <= 35 && (x.area === last || M.isNear(x.area, last)))) t += 5;
        if (!vouched(id)) t += 3;
        if (!rooms.length) t += 4;
        return t;
      };
      for (const r of ranked) r.s += tie(r.id);
      ranked.sort((a, b) => b.s - a.s);
      const pool = ranked.filter((r) => !cleared(r.id) && !myWord(r.id) && (!blind || grounded(r.id)));
      if (pool.length) {
        const lc = lead && pool.find((r) => r.id === lead.id);
        if (lc && pool.indexOf(lc) <= 1 && trustedLead(lc.id)) return lc.id;
        if (pool[0].s > -20) return pool[0].id;
      }
    }
    if (pers.hunch > 0.3 && top.s >= thr * 0.6 && (!chatBlind || grounded(top.id)) && this.fairOn(top.id) && U.chance(0.45)) return top.id;
    return 'skip';
  };
  /* Contra o jogador, palpite não basta: acusar ou votar nele "por instinto" parece perseguição. Precisa de alguma
     pista de verdade (o que o bot viu, o que ouviu com motivo), não só do "santo que não bateu" (noise). */
  B.fairOn = function (id) {
    const q = this.g.players[id];
    if (!q || !q.isHuman) return true;
    return (this.susp[id] || 0) - ((this.noise && this.noise[id]) || 0) >= 18;
  };

  /* Quantos impostores ainda estão vivos. Com ejeção confirmada é público. Sem confirmação, o tripulante estima pelo
     que achava de cada ejetado (se estava quase certo de que era impostor, conta um a menos); o impostor sabe. */
  B.impsLeftEst = function () {
    const g = this.g, mt = this.mt;
    if (g.S.rules.confirmEjects && mt) return mt.impostorsLeft;
    if (this.p.isImp) return g.players.filter((q) => q.isImp && q.alive).length;
    let e = g.S.room.impostors;
    for (const id of Object.keys(this.mem.ejImp || {})) e -= this.mem.ejImp[id];
    return Math.max(1, Math.round(e));
  };

  B.mEnd = function (result) {
    const g = this.g;
    if (!this.mt) return;
    const conf = g.S.rules.confirmEjects;
    /* ejeção sem confirmação: guarda o quanto eu achava que o ejetado era impostor (para a conta de quantos sobram) */
    if (result.ejected != null && !conf && !this.p.isImp && result.ejected !== this.p.id) {
      const ej = result.ejected, ev = (this.ev && this.ev[ej]) || [], s = this.susp[ej] || 0;
      const pImp = ev.some((e) => STRONG[e.reason] && e.w > 0) ? 0.95 : this.hardCleared(ej) ? 0.05 : U.clamp(0.25 + s / 120, 0.1, 0.85);
      (this.mem.ejImp = this.mem.ejImp || {})[ej] = pImp;
    }
    for (const q of g.players) {
      if (q.id === this.p.id) continue;
      this.carry[q.id] = U.clamp((this.susp[q.id] || 0) * 0.55, -45, 110);
      if (!this.p.isImp && this.hardCleared(q.id)) this.carry[q.id] = Math.min(this.carry[q.id], -30);
    }
    for (const id of Object.keys(this.aloneWith || {})) this.mem.spared[id] = (this.mem.spared[id] || 0) + this.aloneWith[id];
    if (result.ejected != null && conf && !this.p.isImp) {
      const ej = g.players[result.ejected];
      /* quem votou em quem só dá para saber com o voto aberto */
      if (!g.S.rules.anonymousVotes) {
        for (const [voter, target] of Object.entries(result.votes || {})) {
          if (+voter === this.p.id) continue;
          if (target === result.ejected) this.carry[voter] = (this.carry[voter] || 0) + (ej.isImp ? -10 : this.pers.skeptic ? 16 : 10);
        }
      }
      if (ej.isImp) {
        for (const id of Object.keys(this.mt.defenders[result.ejected] || {})) this.carry[id] = (this.carry[id] || 0) + 22;
      } else {
        for (const id of Object.keys(this.mt.accusers[result.ejected] || {})) this.carry[id] = (this.carry[id] || 0) + 18;
      }
    }
    this.noteVotes(result);
    this.lastTop = this.p.isImp ? null : this.topSuspect();
    this.planAfterMeeting(result);
    if (this.p.alive) this.setupPact(result);
    this.mt = null;
  };

  /* O que a reunião muda no campo: vigiar o suspeito, andar com quem é de confiança,
     provar inocência com tarefa visual; o impostor acusado se esconde no grupo e guarda rancor. */
  B.planAfterMeeting = function (result) {
    const g = this.g, mt = this.mt, p = this.p, pers = this.pers;
    this.watch = null;
    this.buddy = null;
    this.prove = false;
    this.layLowUntil = 0;
    this.grudge = null;
    if (!p.alive || !mt) return;
    const alive = g.players.filter((q) => q.alive && q !== p && q.id !== result.ejected);
    const heatMe = mt.heat[p.id] || 0;
    const accusers = Object.keys(this.accusedMe || {}).map(Number).filter((id) => g.players[id] && g.players[id].alive && id !== result.ejected);
    if (p.isImp) {
      if (heatMe >= 25 || accusers.length) this.layLowUntil = g.t + U.rf(25, 45) * (0.6 + this.lvl.lie * 0.6);
      if (accusers.length) this.grudge = accusers.sort((a, b) => (this.accusedMe[b] || 0) - (this.accusedMe[a] || 0))[0];
      return;
    }
    const ranked = alive.map((q) => ({ id: q.id, c: this.carry[q.id] || 0 })).sort((a, b) => b.c - a.c);
    const top = ranked[0];
    if (top && top.c >= 38 && pers.talk > 0.25 && U.chance(0.45 + (pers.leader || pers.skeptic || pers.times ? 0.3 : 0))) this.watch = { who: top.id, until: g.t + U.rf(25, 45) };
    const trust = ranked.filter((x) => x.c <= -25);
    if (trust.length && U.chance(0.25 + pers.follow * 0.5)) this.buddy = U.pick(trust).id;
    if ((heatMe >= 20 || accusers.length) && g.S.rules.visualTasks) this.prove = true;
    this.proveTo = null;
    if (this.offered) {
      this.prove = g.S.rules.visualTasks;
      this.proveTo = this.offered.to.filter((id) => g.players[id] && g.players[id].alive);
    }
    if (this.verify && g.players[this.verify.who] && g.players[this.verify.who].alive && this.verify.who !== result.ejected) {
      this.watch = { who: this.verify.who, until: g.t + U.rf(40, 60), purpose: 'verify' };
    }
  };
  /* Rastreador: a pessoa disse uma sala, mas o rastreio mostra que ela estava em outra no fim da rodada = mentira
     com prova (só o rastreador sabe; ele conta e revela a função). */
  B.trackerCheck = function (S, it) {
    const mt = this.mt, p = this.p;
    if (p.special !== 'rastreador' || !it.rooms || !it.rooms.length || this.replied.has('trk' + S)) return;
    const xs = this.mem.track.filter((x) => x.who === S && x.t >= this.rs && x.t >= mt.info.t - 30);
    if (xs.length < 6) return;
    const last = xs[xs.length - 1].area;
    const claimed = it.rooms;
    const fits = (a) => claimed.some((r) => r === a || M.isNear(r, a));
    if (xs.some((x) => fits(x.area))) return;
    this.replied.add('trk' + S);
    this.bump(S, 40, 'own');
    this.reply(0.7, () => ({ text: this.say('accuse', { who: S, reason: 'trackerLie', area: last, claimed: claimed[claimed.length - 1] }), intents: [{ type: 'roleClaim', role: 'rastreador' }, { type: 'accuse', who: S, reason: 'lie', proof: true }] }), true);
  };

  /* Voto aberto: todo mundo vê quem votou em quem. Guarda o histórico e tira conclusões como gente faz:
     pulou (ou votou em outro) quando todo mundo tirou um impostor confirmado = pode estar protegendo o parceiro
     (nos testes, ~80% das vezes era mesmo); votou num inocente que saiu = pesa pouco (muita gente vai na onda). */
  B.noteVotes = function (result) {
    const g = this.g, p = this.p;
    if (g.S.rules.anonymousVotes || !result || !result.votes) return;
    const votes = result.votes, E = result.ejected;
    const known = (id) => (g.S.rules.confirmEjects ? g.players[id].isImp : (this.mem.ejImp && this.mem.ejImp[id] >= 0.9) ? true : (this.mem.ejImp && this.mem.ejImp[id] <= 0.1) ? false : null);
    const hist = (this.mem.voteHist = this.mem.voteHist || []);
    const eImp = E != null ? known(E) : null;
    hist.push({ i: g.meetings, votes: Object.assign({}, votes), ejected: E, eImp });
    if (p.isImp) return;
    const notes = (this.voteNotes = {});
    const add = (v, w, reason, d) => {
      if (+v === p.id || !g.players[v] || !g.players[v].alive || this.hardCleared(+v)) return;
      this.carry[v] = (this.carry[v] || 0) + w;
      if (w > 0 && (!notes[v] || notes[v].w < w)) notes[v] = Object.assign({ reason, w }, d);
    };
    const voters = Object.keys(votes).filter((v) => +v !== E);
    if (E != null && eImp === true) {
      const onE = voters.filter((v) => votes[v] === E).length;
      for (const v of voters) {
        if (votes[v] === E) continue;
        if (onE >= 2) add(v, votes[v] === 'skip' ? 9 : 14, 'voteSkip', { imp: E, other: votes[v] === 'skip' ? null : votes[v] });
      }
    } else if (E != null && eImp === false) {
      for (const v of voters) if (votes[v] === E) add(v, 5, 'votePush', { inn: E });
    }
  };

  /* combinado de andar junto: vale a rodada (ou a partida toda, se foi o que combinaram) */
  B.setupPact = function (result) {
    const g = this.g;
    const old = this.pact;
    this.pact = null;
    const alive = (id) => g.players[id] && g.players[id].alive && id !== result.ejected;
    if (this.pactReq && alive(this.pactReq.who)) {
      const r = this.pactReq;
      this.pact = { who: r.who, lead: r.lead, scope: r.scope, since: g.t, until: r.scope === 'game' ? Infinity : g.t + 999 };
    } else if (old && old.scope === 'game' && alive(old.who)) this.pact = Object.assign(old, { since: g.t, lost: 0 });
    if (this.pact) this.buddy = null;
  };
})();

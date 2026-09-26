/* Raciocínio dos bots nas reuniões: evidências, suspeita, fala, reações e voto. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, M = AU.Map, T = AU.Talk;
  const B = AU.Brain.prototype;

  const STRONG = { kill: 1, vent: 0.85, shift: 1, vanish: 0.95 };
  const CLAIM_W = { kill: 70, vent: 58, shift: 70, vanish: 65, noscan: 32, follow: 8, nearBody: 13, lastWith: 16, lie: 24, tracker: 30, sus: 16, hunch: 9, claim: 16, vote: 7, mention: 4, fromBody: 14 };

  B.mStart = function (mt) {
    const g = this.g, p = this.p;
    this.mt = mt;
    this.rs = mt.info.roundStart;
    this.budget = Math.round(1 + this.pers.talk * 3.2 + (this.pers.offtopic ? 1 : 0));
    this.claimed = false;
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
    this.lastAccusation = null;
    this.knowsBody = null;
    this.sawBodyMyself = false;
    this.claims = {};
    this.voted = false;
    this.askedHuman = false;
    this.alibi = null;
    this.committed = null;
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
    const first = (mt.info.caller === p.id ? U.rf(0.8, 1.8) : U.rf(2.5, 8)) * mt.pace;
    mt.schedule(first, this, () => this.nextAgenda(), { agenda: true });
  };
  const PRECOMPOSE = new Set(['reportInfo', 'reportDetail', 'callReason', 'organize', 'accuse', 'panic', 'claimLoc', 'vouch', 'vitals', 'tracker', 'camsInfo', 'adminInfo', 'offtopic', 'lost', 'frame']);

  /* ---------- evidências (tripulante) ---------- */
  B.evidence = function () {
    const g = this.g, me = this.p.id, rs = this.rs;
    const ev = {};
    const add = (id, w, reason, extra) => {
      if (id === me || id == null) return;
      (ev[id] = ev[id] || []).push(Object.assign({ w, reason }, extra || {}));
    };
    const engineers = (g.S.roles.engenheiro || {}).n > 0;
    for (const e of this.mem.events) {
      if (e.t < rs) continue;
      if (e.type === 'kill') add(e.who, 100, 'kill', { area: e.area, victim: e.victim });
      else if (e.type === 'vent') add(e.who, engineers ? 50 : 88, 'vent', { area: e.area });
      else if (e.type === 'shift') add(e.who, 100, 'shift', { area: e.area });
      else if (e.type === 'vanish') add(e.who, 95, 'vanish', { area: e.area });
      else if (e.type === 'visual') add(e.who, g.S.house.noVisualHardClear ? -25 : -70, 'visual', { task: e.task, area: e.area });
      else if (e.type === 'noscan') add(e.who, 32, 'noscan', { area: e.area });
      else if (e.type === 'follow') add(e.who, 6, 'follow', { area: e.area });
    }
    const tog = this.togetherMap();
    for (const id of Object.keys(tog)) if (tog[id] >= 20) add(+id, -12, 'together', { secs: tog[id] });
    /* comportamento estranho durante a rodada (chamou para seguir e enrolou, ficou na cola) */
    for (const id of Object.keys(this.fieldSus || {})) if (this.fieldSus[id] >= 6) add(+id, Math.min(22, this.fieldSus[id]), 'odd');
    /* "fiquei sozinho com ele e ele não me matou" */
    const alone = this.aloneWith || {};
    for (const id of Object.keys(alone)) if (alone[id] >= 6) add(+id, -9, 'spared', { secs: alone[id] });
    this.ev = ev;
    if (this.knowsBody) this.bodyEvidence(this.knowsBody);
    this.recalc();
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

  B.bodyEvidence = function (bodyArea) {
    if (this.p.isImp || !this.ev) return;
    const mt = this.mt, me = this.p.id;
    const victim = mt.info.body ? mt.info.body.pid : null;
    const reporter = mt.info.kind === 'report' ? mt.info.caller : null;
    const tR = mt.info.t;
    for (const id of Object.keys(this.ev)) this.ev[id] = this.ev[id].filter((e) => !['nearBody', 'lastWith', 'alibi', 'withVictim', 'fromBody', 'ventLink'].includes(e.reason));
    const add = (id, w, reason, extra) => {
      if (id === me || id === victim) return;
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
        if (ids.length === 1) add(ids[0], 18, 'lastWith', { area: lastV.area, victim });
        else ids.forEach((id) => add(id, 6, 'lastWith', { area: lastV.area, victim }));
      }
      /* janela curta entre ver a vítima viva e achar o corpo: quem estava longe tem álibi */
      if (tFound - lastV.t1 < 40) {
        for (const s of this.mem.seen) {
          if (s.who === victim || s.who === me || s.t1 < lastV.t1 || s.t1 - s.t0 < 3) continue;
          if (s.area === bodyArea || M.isNear(s.area, bodyArea)) continue;
          add(s.who, -12, 'alibi', { area: s.area });
        }
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
        add(s.who, 8, 'ventLink', { area: s.area, bodyArea });
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
    this.recalc();
  };

  B.recalc = function () {
    const g = this.g;
    for (const q of g.players) {
      if (q.id === this.p.id) continue;
      const cd = this.chatDelta[q.id] || 0, cs = this.chatSocial[q.id] || 0, cc = this.chatClaim[q.id] || 0;
      let s = (this.carry[q.id] || 0) * 0.5 + (this.noise[q.id] || 0) + cd + U.clamp(cs, -35, 36) + U.clamp(cc, -40, 70);
      if (this.ev && this.ev[q.id]) for (const e of this.ev[q.id]) s += e.w;
      if (this.pers.skeptic) s += 4;
      if (this.pers.defend && s > 0) s *= 0.75;
      this.susp[q.id] = U.clamp(s, -100, 160);
    }
  };

  B.trust = function (id) {
    if (id === this.p.id) return 1;
    return U.clamp(this.pers.trust - (this.susp[id] || 0) / 110, 0.05, 1.2);
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
    let safe = trail.filter((s) => !bad(s));
    const exposed = kills.some((k) => (k.seenBy || []).length > 0);
    this.fakeRooms = [];
    const roomsOf = (segs) => {
      const out = [];
      for (const s of segs) {
        const a = M.AREA[s.area];
        const r = a.kind === 'room' ? a.id : M.roomOf(a, a.cx, a.cy).id;
        if (out[out.length - 1] !== r) out.push(r);
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
      let s = (this.carry[q.id] || 0) * 0.4 + U.rf(0, 12) - (q.isHuman ? 6 : 0);
      if (bodyArea && this.mem.seen.some((x) => x.who === q.id && x.t1 >= this.graceT() && (x.area === bodyArea || M.isNear(x.area, bodyArea)))) s += 22;
      if (s > bs) {
        bs = s;
        best = q;
      }
    }
    this.scapegoat = best ? best.id : null;
    this.scapegoatReal = best && bodyArea ? this.mem.seen.some((x) => x.who === best.id && x.t1 >= this.graceT() && (x.area === bodyArea || M.isNear(x.area, bodyArea))) : false;
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
      for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) if (STRONG[e.reason] && !(info.kind === 'emergency' && info.caller === p.id && this.wantButton && this.wantButton.who === +id)) strong.push({ k: 'accuse', who: +id, reason: e.reason, area: e.area, victim: e.victim });
      /* quem reporta e viu o abate: primeiro onde está o corpo, logo em seguida quem matou */
      if (strong.length && info.kind === 'report' && info.caller === p.id) {
        const i = items.findIndex((x) => x.k === 'reportDetail');
        if (i >= 0) items.splice(i, 1);
      }
      items.push(...strong);
      items.push({ k: 'claimLoc' });
      if (p.special === 'cientista' && Object.keys(this.mem.vitals).length) items.push({ k: 'vitals' });
      items.push({ k: 'bodyIntel' });
      for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) {
        if (e.reason === 'visual' && g.players[+id].alive) items.push({ k: 'vouch', who: +id, reason: 'visual', task: e.task });
        if (e.reason === 'noscan') items.push({ k: 'accuse', who: +id, reason: 'noscan' });
        if (e.reason === 'follow') items.push({ k: pers.panic ? 'panic' : 'accuse', who: +id, reason: 'follow' });
      }
      if (this.mem.track.some((x) => x.t >= this.rs)) items.push({ k: 'tracker' });
      /* combinou de andar junto (sinal) e ficou junto: vira álibi para os dois */
      const tog = this.togetherMap();
      for (const e of this.mem.events) {
        if (e.type !== 'escort' || e.t < this.rs || !g.players[e.who] || !g.players[e.who].alive) continue;
        if ((tog[e.who] || 0) >= 12) items.push({ k: 'vouch', who: e.who, reason: 'together' });
      }
      if (this.mem.seen.some((s) => s.via === 'cams' && s.t1 >= this.rs)) items.push({ k: 'camsInfo' });
      if (this.mem.admin.some((a) => a.t >= this.rs)) items.push({ k: 'adminInfo' });
      if (pers.hunch > 0.3 && U.chance(pers.hunch)) items.push({ k: 'hunch' });
    } else {
      items.push({ k: 'claimLoc' });
      if (this.scapegoat != null && U.chance(this.lvl.lie * 0.8)) items.push({ k: 'frame' });
      const vis = this.mem.events.filter((e) => e.type === 'visual' && e.t >= this.rs && g.players[e.who] && !g.players[e.who].isImp);
      if (vis.length && U.chance(0.6)) items.push({ k: 'vouch', who: vis[0].who, reason: 'visual', task: vis[0].task });
    }
    if (pers.offtopic && U.chance(pers.offtopic)) items.push({ k: 'offtopic' });
    if (pers.lost && this.lostCount > 0 && U.chance(0.5)) items.push({ k: 'lost' });
    if (g.human && g.human.alive && g.human !== p && (pers.leader || pers.skeptic || pers.offtopic) && U.chance(0.5)) items.push({ k: 'askHuman', late: true });
    if ((pers.leader || pers.skeptic) && U.chance(0.7)) items.push({ k: 'leaderVote', late: true });
    const firstPri = items.filter((it) => ['reportInfo', 'reportDetail', 'callReason', 'organize'].includes(it.k) || (it.k === 'accuse' && STRONG[it.reason]));
    const rest = items.filter((it) => !firstPri.includes(it));
    const keep = rest.filter((it) => it.k === 'claimLoc' || it.k === 'bodyIntel' || U.chance(0.35 + pers.talk * 0.6));
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
        const important = ['reportInfo', 'callReason', 'claimLoc'].includes(it.k) || (it.k === 'accuse' && STRONG[it.reason]);
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

  B.say = function (kind, d, opts) {
    return T.line(kind, d, this.g, this, opts);
  };

  /* Local real (ou inventado) para o álibi. */
  const toRoom = (areaId) => {
    const a = M.AREA[areaId];
    return a.kind === 'room' ? a.id : M.roomOf(a, a.cx, a.cy).id;
  };
  /* Salas por onde o bot passou nos últimos ~35s (o que um jogador conta no álibi). */
  B.recentRooms = function () {
    const from = Math.max(this.rs + 5, this.mt.info.t - 35);
    const out = [];
    for (const s of this.mem.trail) {
      if (s.t1 < from || s.t1 - Math.max(s.t0, from) < 1.5) continue;
      const r = toRoom(s.area);
      const i = out.indexOf(r);
      if (i >= 0) out.splice(i, 1);
      out.push(r);
    }
    return out.slice(-3);
  };
  B.myRooms = function () {
    if (this.p.isImp) return this.fakeRooms.slice();
    let rooms = this.recentRooms();
    if (!rooms.length) {
      const a = M.areaAt(this.p.x, this.p.y);
      rooms = [M.roomOf(a, this.p.x, this.p.y).id];
    }
    if (U.chance((1 - this.pers.mem) * 0.12 * this.err) && rooms.length) {
      const r = M.AREA[rooms[rooms.length - 1]];
      const alt = M.ROOMS.filter((x) => x.id !== r.id && U.d2(x.cx, x.cy, r.cx, r.cy) < 30);
      if (alt.length) rooms[rooms.length - 1] = U.pick(alt).id;
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
  B.companion = function (rooms) {
    const tog = this.togetherMap();
    let best = null, bt = 12;
    for (const id of Object.keys(tog)) {
      const q = this.g.players[+id];
      if (!q || !q.alive) continue;
      if (tog[id] > bt && this.mem.seen.some((s) => s.who === +id && s.t1 >= this.graceT() && rooms.includes(s.area))) {
        bt = tog[id];
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
    if (this.p.isImp) return v === this.scapegoat ? 'desconfia dele desde o começo' : mt.votesOn(v) >= 2 ? 'a maioria está votando nele' : 'o álibi dele não convenceu';
    const ev = ((this.ev && this.ev[v]) || []).filter((e) => e.w > 0).sort((a, b) => b.w - a.w)[0];
    if (ev) {
      const t = { kill: 'viu matando', vent: 'viu no duto', shift: 'viu mudando de forma', vanish: 'viu sumindo', noscan: 'fingiu o scan', follow: 'estava seguindo', nearBody: 'estava perto do corpo', lastWith: 'estava com a vítima', withVictim: 'andava com a vítima' }[ev.reason];
      if (t) return t;
    }
    if ((this.chatDelta[v] || 0) > 8) return 'o álibi não bate com o que viu';
    if ((this.chatClaim[v] || 0) > 12) return 'acusaram com prova no chat';
    if (mt.votesOn(v) >= 2) return 'a maioria está votando nele';
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
        const near = mb ? mb.near.filter((id) => id !== p.id && g.players[id].alive) : [];
        if (near.length) return msg('sawNearBody', { who: near[0], area: b.area, bodyArea: b.area }, [{ type: 'accuse', who: near[0], reason: 'nearBody', area: b.area }]);
        return msg('noOneNear', { area: b.area }, []);
      }
      case 'callReason': {
        const w = this.wantButton || { reason: this.p.isImp ? 'info' : 'chaos' };
        if (p.isImp && this.scapegoat != null && U.chance(this.lvl.lie)) {
          return msg('accuse', { who: this.scapegoat, reason: 'hunch' }, [{ type: 'accuse', who: this.scapegoat, reason: 'hunch' }]);
        }
        const intents = w.who != null && STRONG[w.reason] ? [{ type: 'accuse', who: w.who, reason: w.reason, area: w.area, victim: w.victim, strong: true }] : [];
        return msg('callReason', w, intents, { strong: !!intents.length });
      }
      case 'organize':
        return msg('organize', {}, [{ type: 'askAll' }]);
      case 'accuse': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        this.lastAccusation = it;
        return msg('accuse', it, [{ type: 'accuse', who: it.who, reason: it.reason, area: it.area, victim: it.victim, strong: !!STRONG[it.reason] }], { strong: !!STRONG[it.reason] });
      }
      case 'panic':
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
      case 'bodyIntel': {
        if (p.isImp || !this.knowsBody || mt.info.caller === p.id) return null;
        const list = [];
        for (const id of Object.keys(this.ev)) for (const e of this.ev[id]) if ((e.reason === 'nearBody' || e.reason === 'lastWith' || e.reason === 'withVictim' || e.reason === 'fromBody') && g.players[+id].alive) list.push(Object.assign({ who: +id }, e));
        list.sort((a, b) => b.w - a.w);
        const top = list[0];
        if (!top) return U.chance(0.35) ? msg('noOneNear', { area: this.knowsBody }, []) : null;
        let who = top.who;
        if (U.chance((1 - pers.mem) * 0.12 * this.err)) who = this.confuse(who);
        if (top.reason === 'lastWith') return msg('lastWithVictim', { who, victim: top.victim, area: top.area }, [{ type: 'accuse', who, reason: 'lastWith', area: top.area }]);
        if (top.reason === 'withVictim') return msg('withVictim', { who, victim: top.victim, area: top.area }, [{ type: 'accuse', who, reason: 'lastWith', area: top.area }]);
        if (top.reason === 'fromBody') return msg('fromBody', { who, area: top.area, bodyArea: this.knowsBody }, [{ type: 'accuse', who, reason: 'nearBody', area: top.area }]);
        const ago = mt.info.t - (top.t || mt.info.t);
        const intent = top.w >= 15 ? { type: 'accuse', who, reason: 'nearBody', area: top.area } : { type: 'sawAt', who, area: top.area };
        return msg('sawNearBody', { who, area: top.area, bodyArea: this.knowsBody, ago, times: pers.times }, [intent]);
      }
      case 'vouch': {
        const q = g.players[it.who];
        if (!q || !q.alive) return null;
        return msg('vouch', it, [{ type: 'vouch', who: it.who, reason: it.reason, task: it.task }]);
      }
      case 'vitals': {
        const b = mt.info.body;
        const ids = Object.keys(this.mem.vitals).map(Number).filter((id) => !g.players[id].ejected);
        const id = b ? b.pid : ids[ids.length - 1];
        const v = this.mem.vitals[id];
        if (!v) return null;
        const ago = Math.max(5, Math.round((mt.info.t - (v.from + v.to) / 2) / 5) * 5);
        return msg('vitals', { victim: id, ago }, [{ type: 'roleClaim', role: 'cientista' }]);
      }
      case 'tracker': {
        const tr = this.mem.track.filter((x) => x.t >= this.rs);
        if (!tr.length) return null;
        const who = tr[0].who;
        const areas = [];
        tr.filter((x) => x.who === who).forEach((x) => {
          if (areas[areas.length - 1] !== x.area) areas.push(x.area);
        });
        return msg('tracker', { who, areas: areas.slice(-4) }, []);
      }
      case 'camsInfo': {
        const segs = this.mem.seen.filter((s) => s.via === 'cams' && s.t1 >= this.rs && g.players[s.who].alive);
        if (!segs.length) return null;
        let s = segs[segs.length - 1];
        if (this.knowsBody) s = segs.find((x) => x.area === this.knowsBody || M.isNear(x.area, this.knowsBody)) || s;
        return msg('camsInfo', { who: s.who, area: s.area }, [{ type: 'sawAt', who: s.who, area: s.area }]);
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
        const ids = g.players.filter((q) => q.alive && q !== p).map((q) => q.id);
        ids.sort((a, b) => (this.susp[b] || 0) - (this.susp[a] || 0));
        const who = U.chance(0.6) ? ids[0] : U.pick(ids);
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
        if (top && top.s >= this.pers.thr) return msg('leaderVote', { who: top.id }, [{ type: 'accuse', who: top.id, reason: 'vote' }]);
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
    /* com IA o diretor cuida do ritmo: a reação entra logo na fila da próxima rodada */
    const viaAI = mt.dir && mt.dir.accepts(meta);
    const wait = viaAI ? U.rf(0.15, meta.toHuman ? 0.3 : 1.2) : delay * mt.pace + U.rf(0.8, 2.4);
    mt.schedule(wait, this, () => {
      if (!this.p.alive || mt.closed) return;
      const m = fn();
      if (m && m.text) mt.say(this, m, meta);
    }, { ttl: direct ? 20 : 9, raw: viaAI });
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
    if (msg.fromHuman && !msg.intents.length && !(this.mt.dir && this.mt.dir.on()) && U.chance(0.06 + this.pers.talk * 0.06) && !this.replied.has('huh' + msg.id)) {
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
        if (it.type === 'bodyArea' && !msg.bodyKnown && mt.info.kind === 'report' && S !== mt.info.caller && !p.isImp && !(this.ev[S] || []).some((e) => e.reason === 'visual')) {
          this.bump(S, 28, 'own');
          if (!mt.flags['knew' + S] && (pers.times || pers.skeptic || U.chance(0.4))) {
            mt.flags['knew' + S] = true;
            this.reply(0.8, () => say('knewBody', { who: S }, [{ type: 'accuse', who: S, reason: 'lie' }]), true);
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
          else if (!this.replied.has('reclaim')) {
            this.replied.add('reclaim');
            this.reply(1, () => {
              this.claimed = false;
              return this.compose({ k: 'claimLoc' });
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
        if (S === g.human?.id) mt.humanClaimed = true;
        if (!p.isImp) {
          this.checkClaim(S, it);
          this.checkBodyRoom(S, it, msg);
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
            const who = top && top.id != null && top.s >= this.pers.thr * 0.6 ? top.id : null;
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
      case 'quiet':
        if (it.who !== me) this.bump(it.who, 3, 'social');
        break;
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
        this.reply(0.8, () => say('roleNotInGame', { role }, claim && !p.isImp ? [{ type: 'accuse', who: S, reason: 'lie' }] : []), true);
      }
      return;
    }
    if (claim) {
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
    if (!p.isImp && (role === 'metamorfo' || role === 'engenheiro') && !this['doubt' + role]) {
      this['doubt' + role] = true;
      const kinds = role === 'metamorfo' ? ['nearBody', 'lastWith', 'withVictim'] : ['vent'];
      const f = role === 'metamorfo' ? (pers.times ? 0.75 : 0.62) : 0.7;
      for (const id of Object.keys(this.ev || {})) {
        if (it.who != null && +id !== it.who) continue;
        for (const e of this.ev[id]) if (kinds.includes(e.reason)) e.w *= f;
      }
      for (const id of Object.keys(this.chatClaim)) if (it.who == null || +id === it.who) this.chatClaim[id] *= f;
      this.recalc();
    }
    const key = 'roleTalk' + role;
    const wants = p.isImp ? U.chance(0.35) : pers.times || pers.defend || pers.skeptic || U.chance(0.25);
    if (!mt.flags[key] && wants) {
      mt.flags[key] = true;
      this.reply(1, () => say('roleMaybe', { role, who: it.who }, []));
    }
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
    if (withIds.includes(me)) {
      const tog = this.togetherMap()[S] || 0;
      if (tog >= 5) {
        this.bump(S, -10);
        this.reply(0.9, () => say('confirmWith', { who: S }, [{ type: 'vouch', who: S, reason: 'together' }]), true);
      } else {
        this.bump(S, 30);
        this.reply(0.9, () => say('denyWith', { who: S }, [{ type: 'accuse', who: S, reason: 'lie' }]), true);
      }
      return;
    }
    const seen = this.sawTimes(S);
    const matchR = (area) => rooms.some((r) => r === area || M.isNear(r, area));
    if (!seen.length) {
      /* "eu fiquei lá e não te vi": só com permanência longa na última sala dita, e raramente */
      const r = rooms[rooms.length - 1];
      if (r && !this.replied.has('stay' + S) && this.myStay(r) >= 22 && U.chance(0.12 + (pers.skeptic ? 0.15 : 0))) {
        this.replied.add('stay' + S);
        this.bump(S, 8, 'social');
        this.reply(1.2, () => say('contradictStay', { who: S, area: r }, [{ type: 'accuse', who: S, reason: 'sus' }]));
        return;
      }
      if (pers.skeptic && !withIds.length && U.chance(0.3)) this.reply(1.3, () => say('askConfirm', { who: S }, []));
      return;
    }
    const recent = this.mt.info.t - 30;
    const matches = seen.filter((s) => matchR(s.area));
    const mism = seen.filter((s) => !matchR(s.area) && s.t1 >= recent && s.t1 - s.t0 >= 1.2 && !matches.some((m) => m.t1 > s.t1));
    if (matches.length && U.chance(0.35 + pers.talk * 0.3)) {
      this.bump(S, -7);
      const s = matches[matches.length - 1];
      this.reply(1.1, () => say('confirm', { who: S, area: s.area }, [{ type: 'vouch', who: S, reason: 'claim' }]));
    } else if (mism.length) {
      const s = mism[mism.length - 1];
      const rel = this.knowsBody && (s.area === this.knowsBody || M.isNear(s.area, this.knowsBody));
      if (rel || U.chance(0.3)) {
        this.bump(S, rel ? 28 : 10);
        this.reply(1, () => say('contradictSeen', { who: S, area: s.area, claimed: rooms[rooms.length - 1] }, [{ type: 'accuse', who: S, reason: 'lie', area: s.area }]));
      }
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
    this.bump(S, 9, 'own');
    const inRoom = true;
    if (inRoom && !mt.flags['atBody' + S] && (pers.skeptic || pers.times || U.chance(0.2))) {
      mt.flags['atBody' + S] = true;
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
    const seen = this.sawTimes(T2);
    if (seen.some((s) => s.area === it.area || M.isNear(s.area, it.area))) {
      this.bump(T2, 6);
      if (U.chance(0.35)) this.reply(1.2, () => say('confirm', { who: T2, area: it.area }, []));
    } else {
      this.bump(T2, 8 * this.trust(S), 'social');
    }
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
      if (it.reason === 'vent' && roleOn(g, 'engenheiro') && (p.special === 'engenheiro' || (p.isImp && U.chance(L.lie * 0.7)))) {
        /* engenheiro de verdade (ou impostor blefando) explica o duto */
        this.reply(0.7, () => say('roleClaim', { role: 'engenheiro' }, [{ type: 'deny' }, { type: 'roleClaim', role: 'engenheiro' }]), true);
        return;
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
    const myEv = (this.ev && this.ev[T2]) || [];
    const clearedByMe = myEv.some((e) => e.reason === 'together' || e.reason === 'alibi');
    if (clearedByMe && !STRONG[it.reason]) {
      belief *= 0.3;
      this.bump(S, 9, 'own');
    }
    const myVisual = myEv.some((e) => e.reason === 'visual');
    const iSawStrong = myEv.some((e) => STRONG[e.reason]);
    if (myVisual && !g.S.house.noVisualHardClear) {
      belief *= 0.12;
      this.bump(S, strong ? 25 : 6);
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
      const sawThere = it.area && this.sawTimes(T2).some((s) => s.area === it.area || M.isNear(s.area, it.area));
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

  B.onVouch = function (S, it) {
    const me = this.p.id, T2 = it.who;
    if (T2 === me || this.p.isImp) return;
    const say = (kind, d, intents) => ({ text: this.say(kind, d), intents: intents || [] });
    const myEv = (this.ev && this.ev[T2]) || [];
    const strongE = myEv.find((e) => STRONG[e.reason]);
    if (strongE) {
      this.bump(S, 15);
      if (!this.replied.has('rev' + T2)) {
        this.replied.add('rev' + T2);
        this.reply(0.9, () => say('accuse', { who: T2, reason: strongE.reason, area: strongE.area, victim: strongE.victim }, [{ type: 'accuse', who: T2, reason: strongE.reason, strong: true }], { strong: true }), true);
      }
      return;
    }
    const w = it.reason === 'visual' ? 30 : it.reason === 'together' ? 16 : 9;
    this.bump(T2, -w * this.trust(S), it.reason === 'visual' ? 'claim' : 'social');
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
      const s = (mt.heat[id] || 0) + (this.accusedMe[id] ? 25 : 0) + (id === this.scapegoat ? 12 : 0) + mt.votesOn(id) * 12;
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
        const on = mt.votesOn(pid);
        if (on >= Math.ceil((mt.alive.length - 1) / 2) - 1 && on >= 2 && U.chance(this.lvl.bus)) return pid;
      }
      const t = this.impTarget();
      if (t != null) return t;
      const lead = mt.leading();
      if (lead && !g.players[lead.id].isImp && lead.count >= 2) return lead.id;
      return 'skip';
    }
    /* eliminação: quem já foi inocentado sai da lista; se sobram poucos, os que sobram pesam mais */
    const cleared = (id) => ((this.ev && this.ev[id]) || []).some((e) => e.reason === 'visual') || this.clearedByVisual(id);
    const impsLeft = g.S.rules.confirmEjects ? mt.impostorsLeft : g.S.room.impostors;
    const open = alive.filter((id) => !cleared(id));
    const elim = open.length > 0 && open.length <= impsLeft + 1 ? 22 : open.length <= impsLeft + 2 ? 10 : 0;
    /* quem disse no chat em quem ia votar tende a manter a palavra */
    const said = (id) => (this.committed === id && !cleared(id) ? 16 : 0);
    const score = (id) => (this.susp[id] || 0) + (elim && open.includes(id) ? elim : 0) + pers.follow * (mt.heat[id] || 0) * 0.3 + mt.votesOn(id) * pers.follow * 7 + said(id);
    const ranked = alive.map((id) => ({ id, s: score(id) })).sort((a, b) => b.s - a.s);
    if (AU.debug && AU.debug.trace) {
      this.why = ranked.slice(0, 3).map((r) => ({ id: r.id, s: Math.round(r.s), susp: Math.round(this.susp[r.id] || 0), chat: Math.round(this.chatDelta[r.id] || 0), carry: Math.round((this.carry[r.id] || 0) * 0.5), heat: mt.heat[r.id] || 0, votes: mt.votesOn(r.id), ev: ((this.ev && this.ev[r.id]) || []).map((e) => e.reason + ':' + Math.round(e.w)) }));
    }
    const top = ranked[0], second = ranked[1] || { s: -999 };
    if (!top) return 'skip';
    /* conta de cabeça: se o próximo abate pode dar a vitória aos impostores, pular é perigoso */
    const crewLeft = mt.alive.length - impsLeft;
    const crisis = crewLeft <= impsLeft + 1;
    const thr = pers.thr * (this.skipLean > 2 ? 1.12 : 1) * (crisis ? 0.75 : 1);
    if (top.s >= thr && top.s - second.s >= (crisis ? 6 : 8)) return top.id;
    if (pers.follow > 0.7) {
      const lead = mt.leading();
      if (lead && lead.count >= 2 && lead.id !== me && (this.susp[lead.id] || 0) > 12 && !cleared(lead.id)) return lead.id;
    }
    if (pers.hunch > 0.3 && top.s >= thr * 0.6 && U.chance(0.45)) return top.id;
    return 'skip';
  };

  B.mEnd = function (result) {
    const g = this.g;
    if (!this.mt) return;
    const conf = g.S.rules.confirmEjects;
    for (const q of g.players) {
      if (q.id === this.p.id) continue;
      this.carry[q.id] = U.clamp((this.susp[q.id] || 0) * 0.55, -45, 110);
    }
    if (result.ejected != null && conf && !this.p.isImp) {
      const ej = g.players[result.ejected];
      for (const [voter, target] of Object.entries(result.votes || {})) {
        if (+voter === this.p.id) continue;
        if (target === result.ejected) this.carry[voter] = (this.carry[voter] || 0) + (ej.isImp ? -10 : this.pers.skeptic ? 16 : 10);
      }
      if (ej.isImp) {
        for (const id of Object.keys(this.mt.defenders[result.ejected] || {})) this.carry[id] = (this.carry[id] || 0) + 22;
      } else {
        for (const id of Object.keys(this.mt.accusers[result.ejected] || {})) this.carry[id] = (this.carry[id] || 0) + 18;
      }
    }
    this.lastTop = this.p.isImp ? null : this.topSuspect();
    this.planAfterMeeting(result);
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
  };
})();

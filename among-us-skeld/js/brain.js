/* Mente dos bots em campo: percepção limitada, memória, rotas, tarefas e estratégia de impostor. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;

  const VISUAL_ST = ['scan', 'asteroids', 'shields'];
  const HIGH_TRAFFIC = new Set(['cafeteria', 'admin', 'storage', 'hallAdmin', 'hallUpper', 'hallStorage', 'hallRight', 'hallLower', 'hallLeft', 'hallWeapons']);

  class Memory {
    constructor() {
      this.seen = [];
      this.last = {};
      this.events = [];
      this.trail = [];
      this.bodies = [];
      this.admin = [];
      this.track = [];
      this.vitals = {};
      this.keys = new Set();
      this.ignoreUntil = {};
      this.pairs = {};
    }
    see(t, who, area, act, via, x, y) {
      const l = this.last[who];
      if (l && l.area === area && t - l.t1 < 2.5 && l.via === via) {
        l.t1 = t;
        l.x = x;
        l.y = y;
        if (act) l.acts.add(act);
      } else {
        const e = { who, area, t0: t, t1: t, acts: new Set(act ? [act] : []), via, x, y, x0: x, y0: y };
        this.seen.push(e);
        this.last[who] = e;
      }
    }
    event(e, key) {
      if (key) {
        if (this.keys.has(key)) return false;
        this.keys.add(key);
      }
      this.events.push(e);
      return true;
    }
    trailAt(t, area, task) {
      const l = this.trail[this.trail.length - 1];
      if (l && l.area === area) {
        l.t1 = t;
        if (task && !l.tasks.includes(task)) l.tasks.push(task);
      } else this.trail.push({ area, t0: t, t1: t, tasks: task ? [task] : [] });
    }
    bodySeen(b, t, nearIds, via) {
      if (this.bodies.some((x) => x.id === b.id)) return;
      this.bodies.push({ id: b.id, pid: b.pid, area: b.area, t, near: nearIds, via });
    }
  }

  class Brain {
    constructor(g, p) {
      this.g = g;
      this.p = p;
      this.pers = C.PERSONALITIES[p.personality] || C.PERSONALITIES.analitico;
      this.err = (C.HUMAN_ERROR[g.S.bots.humanError] || C.HUMAN_ERROR.medio).mult;
      this.lvl = C.IMP_LEVELS[g.S.bots.impostorLevel] || C.IMP_LEVELS.competente;
      this.mem = new Memory();
      this.susp = {};
      this.carry = {};
      this.plan = null;
      this.path = null;
      this.pi = 0;
      this.dest = null;
      this.thinkT = U.rf(0.2, 1.2);
      this.retryT = 0;
      this.dynT = 0;
      this.stuck = 0;
      this.fix = null;
      this.seenNow = [];
      this.bodiesNow = [];
      this.lastSeenAt = {};
      this.followWatch = {};
      this.fieldSus = {};
      this.scanWatch = {};
      this.wantButton = null;
      this.chaosButton = false;
      this.fear = null;
      this.escape = null;
      this.ventPlan = null;
      this.killedBy = null;
      this.sabThink = U.rf(8, 16);
      this.vitalsT = U.rf(15, 30);
      this.lastVitals = 0;
      this.speedMul = U.rf(0.93, 1.02);
      this.lostCount = 0;
      this.trackT = 0;
      this.trailT = 0;
      this.startDelay = U.rf(0.3, 2.2);
      this.isoT = 0;
      this.isoTarget = null;
      this.eagerRoll = null;
      this.readyT = null;
      this.skipUntil = 0;
    }

    /* ---------- ciclo ---------- */
    update(dt) {
      const g = this.g, p = this.p;
      if (g.phase !== 'play') return;
      if (this.startDelay > 0) {
        this.startDelay -= dt;
        return;
      }
      if (!p.alive) return this.ghostUpdate(dt);
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.5;
        const a = M.areaAt(p.x, p.y);
        this.mem.trailAt(g.t, a.id, p.busy && p.busy.task ? p.busy.task : null);
      }
      this.thinkT -= dt;
      if (this.thinkT <= 0) {
        this.thinkT = 0.22 + Math.random() * 0.12;
        if (p.isImp) this.thinkImp();
        else this.thinkCrew();
        this.thinkRoles();
      }
      this.act(dt);
    }

    setPlan(pl) {
      const p = this.p;
      p.onCams = false;
      p.onAdmin = false;
      p.busy = null;
      this.plan = pl;
      this.path = null;
      this.pi = 0;
      this.dest = null;
      this.dynT = 0;
      if (pl && pl.x != null) this.routeTo(pl.x, pl.y);
      if (pl && !pl.stage) pl.stage = 'go';
    }
    routeTo(x, y) {
      const p = this.p;
      this.dest = { x, y };
      this.path = Nav.find(p.x, p.y, x, y, !p.alive) || [];
      this.pi = 0;
    }
    moveAlong(dt) {
      const p = this.p, g = this.g;
      if (!this.dest) return true;
      if (!this.path || this.pi >= this.path.length) {
        if (U.d2(p.x, p.y, this.dest.x, this.dest.y) < 0.9) return true;
        this.retryT -= dt;
        if (this.retryT <= 0) {
          this.retryT = 1;
          this.routeTo(this.dest.x, this.dest.y);
          if (this.plan) {
            this.plan.fails = (this.plan.fails || 0) + 1;
            if (this.plan.fails > 6) this.plan = null;
          }
        }
        return false;
      }
      const pt = this.path[this.pi];
      const dx = pt.x - p.x, dy = pt.y - p.y, d = Math.hypot(dx, dy);
      const sp = g.speedOf(p) * this.speedMul;
      const step = sp * dt;
      if (Math.abs(dx) > 0.02) p.facing = dx < 0 ? -1 : 1;
      if (d <= step || d < 0.05) {
        if (g.canStand(pt.x, pt.y, !p.alive)) {
          p.x = pt.x;
          p.y = pt.y;
        }
        this.pi++;
        p.moving = true;
        p.walkT += dt;
        return this.pi >= this.path.length && U.d2(p.x, p.y, this.dest.x, this.dest.y) < 0.9;
      }
      const bx = p.x, by = p.y;
      g.moveEntity(p, (dx / d) * sp, (dy / d) * sp, dt);
      if (Math.hypot(p.x - bx, p.y - by) < step * 0.3) {
        this.stuck += dt;
        if (this.stuck > 0.5) {
          this.stuck = 0;
          this.routeTo(this.dest.x, this.dest.y);
        }
      } else this.stuck = 0;
      return false;
    }
    act(dt) {
      const pl = this.plan;
      if (!pl) return;
      const g = this.g;
      if (pl.dyn) {
        this.dynT -= dt;
        if (this.dynT <= 0) {
          this.dynT = pl.dynEvery || 0.5;
          const tg = pl.dyn();
          if (!tg) {
            this.plan = null;
            return;
          }
          const d = U.d2(this.p.x, this.p.y, tg.x, tg.y);
          if (d > (pl.keep || 0.8)) {
            this.routeTo(tg.x, tg.y);
            pl.stage = 'go';
          } else {
            this.path = [];
            this.dest = null;
          }
        }
        if (pl.endAt && g.t >= pl.endAt) {
          this.plan = null;
          return;
        }
        if (this.dest) this.moveAlong(dt);
        if (pl.tick) pl.tick(dt, pl);
        return;
      }
      if (pl.stage === 'go') {
        if (this.moveAlong(dt)) {
          pl.stage = 'do';
          if (pl.onArrive) pl.onArrive(pl);
          if (pl.until == null) pl.until = g.t;
        }
      } else if (pl.stage === 'do') {
        if (pl.tick) pl.tick(dt, pl);
        if (this.plan === pl && g.t >= pl.until) {
          pl.stage = 'done';
          this.p.busy = null;
          if (this.plan === pl) this.plan = null;
          if (pl.onDone) pl.onDone(pl);
        }
      }
    }

    /* ---------- planos ---------- */
    planWander(areaId, idle) {
      const g = this.g;
      const pos = M.randomPointIn(areaId);
      this.setPlan({ type: 'wander', area: areaId, x: pos.x, y: pos.y, onArrive: (pl) => (pl.until = g.t + (idle != null ? idle : U.rf(2, 6))) });
    }
    planTask(tk) {
      const g = this.g, p = this.p;
      const st = g.stationOfTask(tk);
      const stepIdx = tk.step;
      const base = tk.def.dur[stepIdx] || 3;
      const dur = (base / this.pers.taskSpeed) * U.rf(0.9, 1.3) * (1 + (this.err - 1) * 0.15);
      this.setPlan({
        type: 'task', task: tk, x: st.x, y: st.y,
        onArrive: (pl) => {
          if (tk.done || tk.step !== stepIdx || !g.taskAvailable(tk)) {
            pl.until = g.t;
            return;
          }
          pl.until = g.t + dur;
          p.busy = { task: tk.id, station: st.id, until: pl.until };
          const vis = tk.def.visual;
          if (vis && vis !== 'shields' && p.alive && g.S.rules.visualTasks && (tk.def.visualStep == null || tk.def.visualStep === stepIdx)) {
            p.visual = { type: vis, until: pl.until };
          }
        },
        onDone: () => {
          if (!tk.done && tk.step === stepIdx && g.taskAvailable(tk)) g.completeStep(p, tk);
          /* pausa humana: olhar a lista, conferir o mapa, hesitar */
          if (p.alive && !this.plan) {
            const idle = U.rf(0.6, 3.2) * (this.pers.lost ? 1.6 : 1) * (this.pers.offtopic ? 1.3 : 1);
            this.setPlan({ type: 'pause', stage: 'do', until: g.t + idle });
          }
        },
      });
    }
    planFakeTask(preferArea) {
      const g = this.g, p = this.p, L = this.lvl;
      let pool = p.tasks.filter((tk) => !tk.done);
      if (!pool.length) {
        p.tasks.forEach((tk) => {
          tk.done = false;
          tk.step = 0;
        });
        pool = p.tasks.slice();
      }
      pool = pool.filter((tk) => {
        const vis = tk.def.visual && (tk.def.visualStep == null || tk.def.visualStep === tk.step);
        return !vis || U.chance(L.fakeVisual);
      });
      if (!pool.length) return this.planWander(U.pick(M.ROOMS).id);
      let tk;
      if (preferArea) tk = pool.find((x) => M.STATIONS[x.steps[x.step]].area === preferArea);
      if (!tk) {
        pool.sort((a, b) => {
          const sa = M.STATIONS[a.steps[a.step]], sb = M.STATIONS[b.steps[b.step]];
          return U.d2(p.x, p.y, sa.x, sa.y) - U.d2(p.x, p.y, sb.x, sb.y);
        });
        tk = U.chance(0.6) ? pool[0] : U.pick(pool);
      }
      const st = M.STATIONS[tk.steps[tk.step]];
      const dur = (tk.def.dur[tk.step] || 3) * U.rf(0.8, 1.4);
      this.setPlan({
        type: 'fake', task: tk, x: st.x, y: st.y,
        onArrive: (pl) => {
          pl.until = g.t + dur;
          p.busy = { task: tk.id, station: st.id, until: pl.until, fake: true };
        },
        onDone: () => {
          tk.step++;
          if (tk.step >= tk.steps.length) tk.done = true;
        },
      });
    }
    planReport(body) {
      const g = this.g, p = this.p;
      this.setPlan({ type: 'report', body, x: body.x, y: body.y, onArrive: () => g.tryReport(p, body) });
    }
    planButton() {
      const g = this.g, p = this.p;
      this.setPlan({
        type: 'button', x: M.EMERGENCY.x + U.rf(-0.8, 0.8), y: M.EMERGENCY.y + 1.3,
        onArrive: (pl) => {
          pl.until = g.t + 20;
        },
        tick: (dt, pl) => {
          if (g.canEmergency(p) && g.nearButton(p)) {
            g.tryEmergency(p);
          } else if (p.emergencyLeft <= 0) {
            this.wantButton = null;
            pl.until = g.t;
          }
        },
        onDone: () => (this.wantButton = null),
      });
    }
    planFix(st) {
      const g = this.g, p = this.p;
      const pos = M.SAB_STATIONS[st];
      const kind = st.startsWith('reactor') ? 'reactor' : st.startsWith('o2') ? 'o2' : st;
      this.setPlan({
        type: 'fix', st, x: pos.x, y: pos.y,
        onArrive: (pl) => {
          pl.until = g.t + (kind === 'reactor' ? 60 : kind === 'lights' ? U.rf(2, 4) : kind === 'comms' ? U.rf(3.5, 5.5) : U.rf(2.5, 4));
          p.busy = { fix: st, until: pl.until };
        },
        tick: (dt, pl) => {
          if (!g.sab || !g.sabStationsNeeded().includes(st)) {
            pl.until = g.t;
            return;
          }
          if (kind === 'reactor') g.reactorHold(p, st === 'reactorA' ? 'A' : 'B');
        },
        onDone: () => {
          const s = g.sab;
          this.fix = null;
          if (!s) return;
          if (kind === 'lights') g.botFixLights(p);
          else if (kind === 'comms') g.fixComms(p);
          else if (kind === 'o2') g.o2Enter(st === 'o2A' ? 'A' : 'B', s.code, p);
        },
      });
    }
    planCams(dur) {
      const g = this.g, p = this.p;
      this.setPlan({
        type: 'cams', x: M.SECURITY.x, y: M.SECURITY.y + 0.6,
        onArrive: (pl) => {
          pl.until = g.t + dur;
          p.onCams = true;
        },
        tick: (dt, pl) => {
          if (g.commsDown()) pl.until = g.t;
        },
        onDone: () => (p.onCams = false),
      });
    }
    planAdmin() {
      const g = this.g, p = this.p;
      this.setPlan({
        type: 'admin', x: M.ADMIN_TABLE.x, y: M.ADMIN_TABLE.y + 1.2,
        onArrive: (pl) => {
          pl.until = g.t + U.rf(4, 8);
          p.onAdmin = true;
          if (!g.commsDown()) {
            const counts = {};
            for (const q of g.players) {
              if (!q.alive || q.inVent) continue;
              const a = M.areaAt(q.x, q.y);
              if (a.kind === 'room') counts[a.id] = (counts[a.id] || 0) + 1;
            }
            this.mem.admin.push({ t: g.t, counts });
          }
        },
        onDone: () => (p.onAdmin = false),
      });
    }
    planFollow(q, dur, keep) {
      const g = this.g;
      this.setPlan({
        type: 'follow', target: q.id, dyn: () => {
          if (!q.alive && this.p.alive) return null;
          const s = this.lastSeenAt[g.appearId(q)];
          if (!s || g.t - s.t > 5) return null;
          return { x: s.x, y: s.y };
        },
        keep: keep || 2.2, endAt: g.t + dur, dynEvery: 0.6,
      });
    }
    /* Zigue-zague no lugar ("vem comigo"); depois segue o plano "then". */
    planWiggle(text, then) {
      const g = this.g, p = this.p, t0 = g.t;
      const axis = g.canStand(p.x + 0.7, p.y) && g.canStand(p.x - 0.7, p.y) ? 'x' : 'y';
      this.setPlan({
        type: 'wiggle', stage: 'do', until: g.t + 1.2,
        tick: (dt) => {
          const ph = Math.floor((g.t - t0) / 0.17) % 2 ? 1 : -1;
          const s = g.speedOf(p) * 0.85;
          g.moveEntity(p, axis === 'x' ? ph * s : 0, axis === 'y' ? ph * s : 0, dt);
        },
        onDone: () => {
          if (then) then();
        },
      });
      g.gesture(p, 'wiggle');
      void text;
    }
    /* Sem balões: a comunicação no mapa é só pelo movimento. */
    emote() {}
    /* ---------- ordens da IA (estrategista) ---------- */
    /* Executa a ordem atual; devolve false para o motor escolher sozinho. */
    runOrder() {
      const g = this.g, p = this.p, o = this.aiOrder;
      if (!o || o.done || g.t > o.until) return false;
      const q = o.target != null ? g.players[o.target] : null;
      const seen = q && q.alive ? this.lastSeenAt[g.appearId(q)] : null;
      const fresh = seen && g.t - seen.t < 6;
      const goToward = () => (seen ? this.planWander(M.AREA[seen.area] ? M.roomOf(M.AREA[seen.area], seen.x, seen.y).id : 'cafeteria', U.rf(1, 3)) : false);
      o.done = true;
      switch (o.kind) {
        case 'task': {
          const avail = p.tasks.filter((tk) => !tk.done && g.taskAvailable(tk));
          const w = U.norm(o.task || '');
          const tk = w && avail.find((x) => U.norm(x.def.name).split(' ').some((part) => part.length > 3 && w.includes(part)));
          return tk ? this.planTask(tk) : false;
        }
        case 'follow':
          if (!q || !q.alive) return false;
          return fresh ? this.planFollow(q, U.rf(15, 25), 2.4) : goToward();
        case 'tail':
          if (!q || !q.alive) return false;
          return fresh ? this.planFollow(q, U.rf(12, 20), U.rf(4.2, 5.5)) : goToward();
        case 'avoid':
          if (q) this.avoid = { who: q.id, until: o.until };
          return false;
        case 'signal': {
          if (!q || !q.alive) return false;
          if (fresh && U.dist(p, q) < 6) {
            this.invitedRound = true;
            this.invite = { who: g.appearId(q), until: g.t + 30 };
            const vis = p.tasks.filter((tk) => !tk.done && g.taskAvailable(tk) && tk.def.visual);
            return this.planWiggle('vem!', () => {
              if (vis.length) {
                this.shownVisual = true;
                this.planTask(vis[0]);
              }
            });
          }
          o.done = false;
          return goToward();
        }
        case 'cams':
          return g.commsDown() ? false : this.planCams(U.rf(12, 22));
        case 'admin':
          return g.commsDown() ? false : this.planAdmin();
        case 'go':
          return o.room ? this.planWander(o.room, U.rf(2, 5)) : false;
        case 'button':
          if (p.emergencyLeft <= 0) return false;
          {
            const top = this.topSuspectLive();
            this.wantButton = top && top.s >= 30 ? { reason: 'sus', who: top.id } : { reason: 'info' };
          }
          return false;
        /* impostor */
        case 'hunt':
          if (!q || !q.alive || q.isImp) return false;
          this.prey = { id: q.id, until: o.until };
          if (fresh) return this.planStalk(q);
          return goToward();
        case 'fake':
          return this.planFakeTask(o.room || undefined);
        case 'group': {
          const crowd = this.seenNow.filter((x) => !x.isImp && x.alive);
          return crowd.length ? this.planFollow(U.pick(crowd), U.rf(8, 14), 2.8) : this.planWander('cafeteria', U.rf(2, 4));
        }
        case 'sab':
          if (g.canSabotage(p) && g.sabotage(o.sab, p)) return false;
          o.done = false;
          return false;
        case 'doors':
          if (o.room && g.doorReady(o.room) && g.closeDoors(o.room, p)) return false;
          return false;
        case 'vent': {
          const v = g.nearestVent(p);
          if (v && g.enterVent(p, v)) {
            this.ventPlan = { steps: [U.pick(v.links)], nextT: g.t + U.rf(0.6, 1)};
            return true;
          }
          const vv = M.VENTS.slice().sort((a, b) => U.d2(p.x, p.y, a.x, a.y) - U.d2(p.x, p.y, b.x, b.y))[0];
          o.done = false;
          return this.setPlan({ type: 'wander', x: vv.x, y: vv.y, onArrive: (pl) => (pl.until = g.t + 0.3) });
        }
        case 'lure':
          if (!q || !q.alive || q.isImp) return false;
          if (fresh && U.dist(p, q) < 6 && this.crewVisible().length === 1) {
            this.invitedRound = true;
            this.invite = { who: q.id, until: g.t + 25, lure: true };
            const quiet = M.ROOMS.filter((rm) => !['cafeteria', 'admin', 'storage'].includes(rm.id));
            return this.planWiggle('vem!', () => this.planFakeTask(U.pick(quiet).id));
          }
          this.prey = { id: q.id, until: o.until };
          return fresh ? this.planStalk(q) : goToward();
        case 'double':
          if (!q || !q.alive || !q.isImp) return false;
          this.dk = { with: q.id, until: g.t + 18 };
          if (q.brain) q.brain.dk = { with: p.id, until: g.t + 18 };
          return fresh ? this.planFollow(q, 12, 3) : false;
        default:
          return false;
      }
    }
    topSuspectLive() {
      let best = null;
      for (const q of this.g.players) {
        if (!q.alive || q === this.p) continue;
        const s = this.liveSusp(q.id);
        if (!best || s > best.s) best = { id: q.id, s };
      }
      return best;
    }

    /* Suspeita "ao vivo" durante a rodada: o que ficou das reuniões + o que viu agora. */
    liveSusp(id) {
      const g = this.g, rs = g.roundStart;
      let s = Math.max(this.susp[id] || 0, (this.carry[id] || 0) * 0.8);
      const eng = ((g.S.roles && g.S.roles.engenheiro) || {}).n > 0;
      for (const e of this.mem.events) {
        if (e.who !== id || e.t < rs) continue;
        if (e.type === 'kill' || e.type === 'shift' || e.type === 'vanish') s = Math.max(s, 100);
        else if (e.type === 'vent') s = Math.max(s, eng ? 55 : 85);
        else if (e.type === 'noscan') s += 25;
        else if (e.type === 'follow') s += 8;
        else if (e.type === 'visual' && g.S.rules.visualTasks) s -= 60;
      }
      for (const b of this.mem.bodies) if (b.t >= rs && (b.near || []).includes(id)) s += 25;
      return s + ((this.fieldSus && this.fieldSus[id]) || 0);
    }
    /* Segue quem chamou, mas de olho: parado à toa, sozinho demais num canto ou fazendo algo estranho = para de seguir. */
    startEscort(q) {
      const g = this.g, p = this.p;
      const aid = g.appearId(q);
      const until = g.t + U.rf(22, 38);
      this.escort = { who: aid, until, since: g.t, idle: 0, alone: 0, lx: q.x, ly: q.y };
      this.setPlan({
        type: 'follow', escort: true, target: q.id, keep: 2.0, endAt: until, dynEvery: 0.5,
        dyn: () => {
          if (!q.alive && p.alive) return null;
          const s = this.lastSeenAt[g.appearId(q)];
          if (!s || g.t - s.t > 4) {
            this.endEscort('?');
            return null;
          }
          return { x: s.x, y: s.y };
        },
        tick: (dt) => this.checkEscort(q, dt),
      });
      this.mem.event({ type: 'escort', t: g.t, who: aid }, 'escort:' + aid + ':' + g.meetings);
    }
    checkEscort(q, dt) {
      const g = this.g, e = this.escort;
      if (!e) return;
      const aid = e.who;
      if (g.t >= e.until - 0.3) return this.endEscort('blz');
      const moved = Math.hypot(q.x - e.lx, q.y - e.ly);
      if (moved < 0.05 && !q.busy && !q.visual) e.idle += dt;
      else e.idle = Math.max(0, e.idle - dt * 0.5);
      e.lx = q.x;
      e.ly = q.y;
      const alone = this.seenNow.length === 1 && this.seenNow[0] === q;
      if (alone) e.alone += dt;
      else e.alone = Math.max(0, e.alone - dt);
      if (e.idle > 6) {
        /* chamou para seguir e ficou parado sem fazer nada: estranho */
        this.fieldSus[aid] = (this.fieldSus[aid] || 0) + 10;
        e.idle = 0;
      }
      const s = this.liveSusp(aid);
      const cautious = this.pers.skeptic || this.pers.panic || this.pers.times;
      const dark = g.sab && g.sab.type === 'lights';
      if (s >= 55) {
        this.endEscort('!');
        this.fear = { who: aid, t: g.t };
        return this.planFlee(q);
      }
      if (s >= 30) return this.endEscort('não');
      if (e.alone > (cautious ? 7 : 12) + (s < 0 ? 20 : 0) && (dark || s >= 10 || U.chance(cautious ? 0.03 : 0.01))) return this.endEscort('...');
    }
    endEscort(text) {
      const g = this.g;
      if (this.escort) this.mem.event({ type: 'escortEnd', t: g.t, who: this.escort.who, why: text }, 'escortEnd:' + this.escort.who + ':' + g.meetings);
      this.escort = null;
      if (text) this.emote(text);
      if (this.plan && this.plan.escort) this.plan = null;
    }
    /* Alguém fez sinal perto: atende (segue), recusa ou desconfia. O impostor pode fingir que topa. */
    onGesture(q, kind) {
      const g = this.g, p = this.p, t = g.t;
      if (kind !== 'wiggle' || !p.alive || p.inVent || g.phase !== 'play') return;
      if (this.plan && ['report', 'flee', 'fix', 'button', 'hunt', 'wiggle'].includes(this.plan.type)) return;
      if (this.wantButton || this.fix || this.escape) return;
      const aid = g.appearId(q);
      if (p.isImp && q.isImp) {
        /* parceiro fez sinal: combinado, fico perto e mato junto quando ele matar */
        this.dk = { with: q.id, until: t + 14 };
        this.emote('fechou');
        this.planFollow(q, 12, 2.4);
        return;
      }
      if (this.invite && this.invite.who === aid && t < this.invite.until) {
        /* resposta ao meu próprio chamado: combinado */
        this.emote('ok');
        return;
      }
      if (this.escort && this.escort.who === aid && t < this.escort.until) return;
      const s = p.isImp ? 0 : this.liveSusp(aid);
      let pAcc;
      if (p.isImp) pAcc = q.isImp ? 0.2 : 0.2 + this.lvl.lie * 0.25;
      else {
        /* depende de quanto confia, da personalidade e do clima: escuro, corpo recente, pouca gente por perto */
        const recentBody = this.mem.bodies.some((b) => g.t - b.t < 40) || g.t - g.roundStart < 25 && g.meetings > 0 && (g.events || []).some((e) => e.type === 'kill' && e.t > g.roundStart - 60);
        const crowd = this.seenNow.filter((o) => o !== q).length;
        pAcc = s >= 35 ? 0 : 0.45 + this.pers.follow * 0.35 + (this.pers.leader ? 0.1 : 0) - (this.pers.skeptic ? 0.15 : 0) - (this.pers.panic ? 0.1 : 0) + (q.isHuman ? 0.12 : 0)
          - Math.max(0, s) / 45 + Math.max(0, -s) / 200 - (g.sab && g.sab.type === 'lights' ? 0.2 : 0) - (recentBody ? 0.12 : 0) + (crowd >= 1 ? 0.08 : 0);
      }
      if (p.busy && !U.chance(0.35)) pAcc *= 0.3;
      if (U.chance(pAcc)) {
        this.emote('ok');
        this.startEscort(q);
      } else this.emote(!p.isImp && s >= 20 ? 'não' : '?');
    }
    /* Alguém me segue (a meu pedido ou de confiança): mostro uma tarefa visual para provar que sou tripulante. */
    showVisual(follower) {
      const g = this.g, p = this.p;
      if (p.isImp || this.shownVisual || !g.S.rules.visualTasks || p.busy) return false;
      if (this.plan && ['report', 'flee', 'fix', 'button', 'wiggle'].includes(this.plan.type)) return false;
      const vis = p.tasks.filter((tk) => !tk.done && g.taskAvailable(tk) && tk.def && tk.def.visual);
      if (!vis.length) return false;
      vis.sort((a, b) => {
        const sa = g.stationOfTask(a), sb = g.stationOfTask(b);
        return U.d2(p.x, p.y, sa.x, sa.y) - U.d2(p.x, p.y, sb.x, sb.y);
      });
      this.shownVisual = true;
      this.emote('olha', 1.8);
      this.planTask(vis[0]);
      void follower;
      return true;
    }
    planFlee(threat) {
      const g = this.g, p = this.p;
      let best = null, bs = -1e9;
      for (const r of M.ROOMS) {
        const dThreat = U.d2(r.cx, r.cy, threat.x, threat.y);
        const dMe = U.d2(r.cx, r.cy, p.x, p.y);
        const s = dThreat - dMe * 0.6 + (r.id === 'cafeteria' ? 10 : 0);
        if (s > bs) {
          bs = s;
          best = r;
        }
      }
      const pos = M.randomPointIn(best.id);
      this.setPlan({ type: 'flee', x: pos.x, y: pos.y, onArrive: (pl) => (pl.until = g.t + 1.5) });
    }
    planHunt(tgt) {
      const g = this.g;
      this.setPlan({
        type: 'hunt', target: tgt.id, keep: g.killDist * 0.7, dynEvery: 0.3,
        dyn: () => {
          const s = this.lastSeenAt[g.appearId(tgt)];
          if (!tgt.alive || !s || g.t - s.t > 2.5) return null;
          return { x: s.x, y: s.y };
        },
        endAt: g.t + 20,
      });
    }
    planStalk(tgt) {
      const g = this.g;
      this.setPlan({
        type: 'stalk', target: tgt.id, keep: U.rf(4, 6), dynEvery: 0.7,
        dyn: () => {
          const s = this.lastSeenAt[g.appearId(tgt)];
          if (!tgt.alive || !s || g.t - s.t > 4) return null;
          return { x: s.x, y: s.y };
        },
        endAt: g.t + U.rf(10, 22),
      });
    }

    /* ---------- tripulante ---------- */
    hardSusp(id) {
      let s = 0;
      for (const e of this.mem.events) {
        if (e.who !== id || e.t < this.g.roundStart) continue;
        if (e.type === 'kill' || e.type === 'shift' || e.type === 'vanish') s = Math.max(s, 100);
        else if (e.type === 'vent') s = Math.max(s, 85);
      }
      return Math.max(s, (this.carry[id] || 0) > 70 ? this.carry[id] : 0);
    }
    threatNear() {
      const p = this.p, g = this.g;
      if (this.seenNow.length !== 1) return null;
      const q = this.seenNow[0];
      if (U.dist(p, q) > 5.5) return null;
      if (this.hardSusp(g.appearId(q)) >= 80) return q;
      if (this.avoid && g.t < this.avoid.until && g.appearId(q) === this.avoid.who && U.dist(p, q) < 4.5) return q;
      const ls = this.liveSusp(g.appearId(q));
      if (ls >= 45 && U.dist(p, q) < 4) return q;
      if (ls >= 30 && U.dist(p, q) < 3 && (g.sab && g.sab.type === 'lights')) return q;
      if (this.fear && g.t - this.fear.t < 6 && this.fear.who === g.appearId(q)) return q;
      return null;
    }
    thinkCrew() {
      const g = this.g, p = this.p;
      const body = this.bodiesNow.find((b) => !b.reported && !b.gone);
      if (body) {
        if (!this.plan || this.plan.type !== 'report' || this.plan.body !== body) {
          if (!(this.fear && g.t - this.fear.t < 1.5 && this.plan && this.plan.type === 'flee')) this.planReport(body);
        }
        if (this.plan && this.plan.type === 'report') g.tryReport(p, body);
        return;
      }
      if (this.plan && this.plan.type === 'report') {
        if (this.plan.body.reported || this.plan.body.gone) this.plan = null;
        else {
          g.tryReport(p, this.plan.body);
          return;
        }
      }
      if (this.wantButton) {
        if (p.emergencyLeft <= 0) this.wantButton = null;
        else {
          if (!this.plan || this.plan.type !== 'button') this.planButton();
          return;
        }
      }
      const threat = this.threatNear();
      if (threat && (!this.plan || this.plan.type !== 'flee')) {
        this.fear = { who: g.appearId(threat), t: g.t };
        this.planFlee(threat);
        return;
      }
      if (this.plan && this.plan.type === 'flee') return;
      if (this.fix) {
        if (!g.sab || !g.sabStationsNeeded().includes(this.fix)) {
          this.fix = null;
          if (this.plan && this.plan.type === 'fix') this.plan = null;
        } else {
          if (!this.plan || this.plan.type !== 'fix') this.planFix(this.fix);
          return;
        }
      }
      if (this.plan) return;
      this.chooseCrewActivity();
    }
    chooseCrewActivity() {
      const g = this.g, p = this.p, pers = this.pers;
      if (g.sab && g.sab.type === 'lights' && !this.fix) {
        const pal = this.seenNow.filter((q) => q.alive && U.dist(p, q) < 6 && this.liveSusp(g.appearId(q)) <= 5);
        if (pal.length && U.chance(0.5 + pers.follow * 0.3)) return this.planFollow(pal[0], U.rf(8, 14), 1.8);
      }
      if (this.aiOrder && this.runOrder() !== false && this.plan) return;
      const open = p.tasks.filter((tk) => !tk.done);
      const avail = open.filter((tk) => g.taskAvailable(tk));
      if (avail.length) {
        if (pers.lost && this.lostCount < 3 && U.chance(pers.lost * 0.25 * this.err)) {
          this.lostCount++;
          return this.planWander(U.pick(M.ROOMS).id, U.rf(1, 3));
        }
        const dist = (tk) => {
          const s = g.stationOfTask(tk);
          return U.d2(p.x, p.y, s.x, s.y) + U.rf(0, 8);
        };
        /* depois da reunião: vigiar o suspeito ou andar com alguém de confiança, uma vez por rodada */
        if (this.watch && g.t < this.watch.until) {
          const q = g.players[this.watch.who];
          const s = q && q.alive ? this.lastSeenAt[q.id] : null;
          if (s && g.t - s.t < 3) {
            this.watch = null;
            return this.planFollow(q, U.rf(12, 20), U.rf(4, 5.5));
          }
        }
        if (this.buddy != null) {
          const q = g.players[this.buddy];
          const s = q && q.alive ? this.lastSeenAt[q.id] : null;
          if (s && g.t - s.t < 3) {
            this.buddy = null;
            return this.planFollow(q, U.rf(15, 28), 2.4);
          }
        }
        /* chama alguém de confiança que está perto para ver a tarefa visual (vira álibi) */
        const visAvail = g.S.rules.visualTasks ? avail.filter((x) => x.def && x.def.visual) : [];
        if (visAvail.length && !this.invitedRound && g.t > g.roundStart + 6) {
          const near = this.seenNow.filter((q) => q.alive && !q.inVent && U.dist(p, q) < 5 && this.liveSusp(g.appearId(q)) < 15);
          const who = near.find((q) => q.isHuman) || near[0];
          if (who && U.chance(0.16 + pers.talk * 0.18 + (pers.leader ? 0.12 : 0) + (who.isHuman ? 0.1 : 0) + (this.prove ? 0.25 : 0))) {
            this.invitedRound = true;
            this.invite = { who: g.appearId(who), until: g.t + 30 };
            const tk2 = visAvail.slice().sort((a, b) => dist(a) - dist(b))[0];
            return this.planWiggle('vem!', () => {
              this.shownVisual = true;
              this.planTask(tk2);
            });
          }
        }
        const visual = (tk) => (this.prove && M.TASKS[tk.id] && M.TASKS[tk.id].visual ? -400 : 0);
        let tk;
        if ((pers.lost || pers.chaos) && U.chance(0.45)) tk = U.pick(avail);
        else tk = avail.slice().sort((a, b) => dist(a) + visual(a) - dist(b) - visual(b))[0];
        if (this.prove && M.TASKS[tk.id] && M.TASKS[tk.id].visual) this.prove = false;
        return this.planTask(tk);
      }
      if (open.length) {
        const st = g.stationOfTask(open[0]);
        return this.planWander(st.area || 'medbay', U.rf(2, 5));
      }
      this.planPostTasks();
    }
    planPostTasks() {
      const g = this.g, p = this.p, pers = this.pers;
      const r = Math.random();
      /* sem tarefas: seguir de longe quem é suspeito, ou andar junto de alguém de confiança */
      const sus = this.seenNow.filter((q) => q.alive && (this.susp[g.appearId(q)] || 0) >= 30);
      if (sus.length && (pers.leader || pers.skeptic || pers.times) && r < 0.4) return this.planFollow(sus[0], U.rf(12, 22), U.rf(4, 5.5));
      const pals = this.seenNow.filter((q) => q.alive && (this.susp[g.appearId(q)] || 0) <= -20);
      if (pals.length && r < 0.25 + pers.follow * 0.3) return this.planFollow(U.pick(pals), U.rf(12, 22), 2.4);
      if (!pers.panic && r < 0.2) return this.planWander(U.pick(['electrical', 'navigation', 'shields', 'comms']), U.rf(1.5, 3));
      const watcher = pers.leader || pers.times || pers.skeptic;
      if (watcher && r < 0.3 && !g.commsDown()) return this.planCams(U.rf(12, 25));
      if (watcher && r < 0.42 && !g.commsDown()) return this.planAdmin();
      if (pers.follow > 0.5 && r < 0.75) {
        const cand = this.seenNow.filter((q) => (this.susp[g.appearId(q)] || 0) < 30);
        if (cand.length) return this.planFollow(U.pick(cand), U.rf(12, 25));
      }
      if (pers.chaos && !this.chaosButton && U.chance(0.12) && p.emergencyLeft > 0) {
        this.chaosButton = true;
        this.wantButton = { reason: 'chaos' };
        return;
      }
      const room = U.chance(0.3) ? 'cafeteria' : U.pick(M.ROOMS).id;
      this.planWander(room);
    }

    /* ---------- impostor ---------- */
    crewVisible() {
      const g = this.g, p = this.p, t = g.t, L = this.lvl;
      if (!p.isImp) return this.seenNow.filter((q) => !q.isImp);
      /* desatenção: quem está na borda da visão às vezes passa despercebido */
      this.missed = this.missed || {};
      return this.seenNow.filter((q) => {
        if (q.isImp) return false;
        const d = U.dist(p, q);
        if (d < 4.5) return true;
        let m = this.missed[q.id];
        if (!m || t > m.until) m = this.missed[q.id] = { until: t + 1.5, miss: U.chance(L.miss || 0) };
        return !m.miss;
      });
    }
    thinkImp() {
      const g = this.g, p = this.p, t = g.t, L = this.lvl;
      if (p.inVent) return this.ventThink();
      const others = this.crewVisible();
      if (this.escape) {
        const e = this.escape;
        if (!e.decided && t - e.t0 < 7 && others.length && !g.S.house.noSelfReport && !e.body.reported) {
          if (others.some((q) => U.d2(q.x, q.y, e.body.x, e.body.y) < 9)) {
            e.decided = true;
            if (U.chance(L.selfReport)) {
              this.selfReport = true;
              this.planReport(e.body);
              return;
            }
          }
        }
        if (this.plan && this.plan.type === 'report') {
          g.tryReport(p, this.plan.body);
          return;
        }
        if (!e.moved) {
          e.moved = true;
          this.planEscape();
          return;
        }
        if (t - e.t0 > 14) this.escape = null;
        if (this.plan) return;
      }
      if (this.plan && this.plan.type === 'report') {
        if (this.plan.body.reported || this.plan.body.gone) this.plan = null;
        else {
          g.tryReport(p, this.plan.body);
          return;
        }
      }
      const body = this.bodiesNow.find((b) => !b.reported && !b.gone);
      if (body && !this.escape) {
        if (others.length && U.chance(0.35 + L.selfReport * 0.5)) {
          this.planReport(body);
          return;
        }
        if (!this.plan || (this.plan.type !== 'leave' && this.plan.type !== 'fake')) {
          const far = M.ROOMS.filter((r) => U.d2(r.cx, r.cy, body.x, body.y) > 18);
          const r = U.pick(far);
          const pos = M.randomPointIn(r.id);
          this.setPlan({ type: 'leave', x: pos.x, y: pos.y, onArrive: (pl) => (pl.until = g.t + 1) });
        }
        return;
      }
      this.sabThink -= 0.3;
      const ao = this.aiOrder;
      if (ao && !ao.done && g.t < ao.until && (ao.kind === 'sab' || ao.kind === 'doors' || ao.kind === 'double')) this.runOrder();
      if (this.sabThink <= 0) {
        this.sabThink = U.rf(4, 9);
        if (!(ao && (ao.kind === 'sab') && g.t < ao.until)) this.maybeSabotage(others);
      }
      if (p.killCd > 0) this.readyT = null;
      else if (this.readyT == null) this.readyT = t;
      if (this.dkTarget != null && p.killCd <= 0) {
        const q = g.players[this.dkTarget];
        if (!q || !q.alive || !others.includes(q) || (this.plan && this.plan.type === 'hunt' && this.plan.target !== q.id)) this.dkTarget = null;
        else {
          if (U.dist(p, q) <= g.killDist && g.tryKill(p, q)) {
            this.dkTarget = null;
            return;
          }
          if (!this.plan || this.plan.type !== 'hunt') this.planHunt(q);
          return;
        }
      }
      /* dois tripulantes juntos e o parceiro do lado: combina um double kill */
      if (p.killCd <= 0 && others.length === 2 && !g.S.house.noDoubleKill && !(this.layLowUntil && t < this.layLowUntil) && !this.dk) {
        const mate = g.players.find((q) => q.isImp && q !== p && q.alive && !q.inVent && q.killCd <= 0 && U.dist(p, q) < 5);
        if (mate && this.noWitness(others[0], [others[0]]) && U.chance(L.lie * 0.12)) {
          const [a, b] = others.slice().sort((x, y) => U.dist(p, x) - U.dist(p, y));
          if (mate.brain) {
            mate.brain.dkTarget = b.id;
            mate.brain.emote('ok', 1);
          } else if (mate.isHuman) {
            /* parceiro é o jogador: faz o sinal e espera ele matar primeiro */
            this.dk = { with: mate.id, until: t + 10 };
            this.planWiggle('duplo?');
            return;
          }
          this.dkTarget = a.id;
          this.emote('!', 0.8);
          return this.planHunt(a);
        }
      }
      if (p.killCd <= 0 && !(p.invisUntil > t)) {
        const tgt = others.length === 1 ? others[0] : null;
        /* só age depois de ver a vítima isolada por um tempo, e nem sempre na primeira chance */
        if (tgt && tgt === this.isoTarget && this.noWitness(tgt, others)) this.isoT += 0.3;
        else {
          this.isoTarget = tgt;
          this.isoT = 0;
          this.eagerRoll = null;
        }
        const busy = HIGH_TRAFFIC.has(M.areaAt(tgt ? tgt.x : p.x, tgt ? tgt.y : p.y).id);
        const lowKey = this.layLowUntil && t < this.layLowUntil;
        const grudge = tgt && (tgt.id === this.grudge || (this.prey && t < this.prey.until && tgt.id === this.prey.id));
        const nearVent = tgt && M.VENTS.some((v) => U.d2(v.x, v.y, tgt.x, tgt.y) < 4.5);
        const threat = tgt && ((tgt.brain && (tgt.brain.pers.leader || tgt.brain.pers.times)) || this.mem.events.some((e) => e.type === 'visual' && e.who === tgt.id));
        const need = L.need * (busy ? 1.8 : 1) * (lowKey ? 1.8 : 1) * (grudge ? 0.75 : 1) * (nearVent && L.useVents > 0.5 ? 0.92 : 1) * (threat ? 0.92 : 1);
        if (tgt && this.eagerRoll == null && this.isoT >= need) {
          const waited = t - this.readyT;
          this.eagerRoll = U.chance(L.eager * U.clamp(0.7 + waited / 15, 0.7, 1) * (busy ? 0.7 : 1) * (lowKey && !grudge ? 0.55 : 1));
          if (!this.eagerRoll) this.skipUntil = t + U.rf(1.5, 3.5);
        }
        if (this.skipUntil && t >= this.skipUntil) {
          this.skipUntil = 0;
          this.eagerRoll = null;
          this.isoT = need * 0.5;
        }
        const committed = tgt && (this.eagerRoll || (this.plan && this.plan.type === 'hunt' && this.plan.target === tgt.id));
        if (tgt && committed) {
          const d = U.dist(p, tgt);
          if (p.special === 'metamorfo' && p.abilityCd <= 0 && p.shiftAs == null && d < 9 && U.chance(0.3 + L.lie * 0.4)) {
            const disguise = U.pick(g.players.filter((q) => q.alive && q !== p && q !== tgt && !q.isImp && !others.includes(q)));
            if (disguise && this.noWitness(tgt, others)) g.shapeshift(p, disguise.id);
          }
          if (d <= g.killDist && this.safeToKill(tgt, others)) {
            if (g.tryKill(p, tgt)) return;
          }
          if (!this.plan || this.plan.type !== 'hunt' || this.plan.target !== tgt.id) {
            if (this.noWitness(tgt, others) || U.chance(L.riskTol)) this.planHunt(tgt);
          }
          return;
        } else if (!tgt && this.plan && this.plan.type === 'hunt') {
          this.plan = null;
        }
      }
      if (g.sabCritical() && !this.plan && U.chance(0.35)) {
        const st = U.pick(g.sabStationsNeeded());
        if (st) {
          const pos = M.SAB_STATIONS[st];
          this.setPlan({ type: 'loiter', x: pos.x + U.rf(-2, 2), y: pos.y + U.rf(-2, 2), onArrive: (pl) => (pl.until = g.t + U.rf(2, 5)) });
          return;
        }
      }
      if (!this.plan) this.chooseImpActivity(others);
    }
    noWitness(tgt, others) {
      const g = this.g, p = this.p;
      if (others.length > 1) return false;
      for (const id of Object.keys(this.lastSeenAt)) {
        const s = this.lastSeenAt[id];
        const q = g.players[+id];
        if (!q || q.isImp || q === tgt || !q.alive) continue;
        if (g.t - s.t < 1.6 && U.d2(s.x, s.y, p.x, p.y) < 10 && !others.some((o) => g.appearId(o) === +id)) return false;
      }
      return true;
    }
    safeToKill(tgt, others) {
      const g = this.g, p = this.p, L = this.lvl;
      if (others.length > 1) return U.chance(L.riskTol * 0.25);
      if (!this.noWitness(tgt, others) && !U.chance(L.riskTol)) return false;
      if (L.camsAware && g.anyoneOnCams() && M.CAMS.some((c) => U.d2(c.x, c.y, p.x, p.y) <= M.CAM_R && Nav.los(c.x, c.y, p.x, p.y))) return false;
      if (g.S.house.noDoubleKill && g.partnerKilledRecently(p)) return false;
      return true;
    }
    planEscape() {
      const g = this.g, p = this.p, L = this.lvl;
      const e = this.escape;
      const clear = this.crewVisible().length === 0;
      let vent = null, vd = 7;
      for (const v of M.VENTS) {
        const d = U.d2(p.x, p.y, v.x, v.y);
        if (d < vd) {
          vd = d;
          vent = v;
        }
      }
      if (vent && clear && U.chance(L.useVents)) {
        this.setPlan({
          type: 'toVent', x: vent.x, y: vent.y,
          onArrive: (pl) => {
            pl.until = g.t;
            const vis = this.crewVisible().length;
            if (vis === 0 || U.chance(L.riskTol)) {
              if (g.enterVent(p, vent)) {
                const opts = [];
                vent.links.forEach((l) => {
                  opts.push([l]);
                  M.VENT[l].links.forEach((l2) => {
                    if (l2 !== vent.id) opts.push([l, l2]);
                  });
                });
                this.ventPlan = { steps: U.pick(opts).slice(), nextT: g.t + U.rf(0.5, 1) };
              }
            }
          },
        });
        return;
      }
      if (p.special === 'fantasma' && p.abilityCd <= 0 && U.chance(0.7)) g.vanish(p);
      const far = M.ROOMS.filter((r) => r.id !== e.area && U.d2(r.cx, r.cy, p.x, p.y) > 14 && U.d2(r.cx, r.cy, p.x, p.y) < 45);
      const room = far.length ? U.pick(far) : U.pick(M.ROOMS);
      if (U.chance(0.6)) this.planFakeTask(room.id);
      else this.planWander(room.id, U.rf(2, 5));
    }
    ventThink() {
      const g = this.g, p = this.p, t = g.t;
      const vp = this.ventPlan || (this.ventPlan = { steps: [], nextT: t + 1 });
      if (t < vp.nextT) return;
      if (vp.steps.length) {
        g.ventTo(p, vp.steps.shift());
        vp.nextT = t + U.rf(0.6, 1.1);
        return;
      }
      const r = g.visionOf(p);
      const vis = g.players.filter((q) => q.alive && !q.isImp && !q.inVent && U.d2(q.x, q.y, p.x, p.y) <= r && Nav.los(p.x, p.y, q.x, q.y));
      if (vis.length === 0 || t - p.ventT > 12) {
        g.exitVent(p);
        this.ventPlan = null;
        const a = M.areaAt(p.x, p.y);
        if (U.chance(0.7)) this.planFakeTask(M.roomOf(a, p.x, p.y).id);
        else this.planWander(M.roomOf(a, p.x, p.y).id, U.rf(1, 3));
      } else {
        const cur = M.VENT[p.inVent];
        if (U.chance(0.5)) vp.steps.push(U.pick(cur.links));
        vp.nextT = t + U.rf(0.7, 1.3);
      }
    }
    maybeSabotage(others) {
      const g = this.g, p = this.p, L = this.lvl;
      if (!g.canSabotage(p)) return;
      const lastKill = Math.max(...g.players.filter((q) => q.isImp).map((q) => q.lastKillT));
      const sinceKill = g.t - Math.max(lastKill, g.roundStart);
      if (L.sabKill && others.length === 1 && p.killCd < 3 && U.chance(0.35)) return g.sabotage('lights', p);
      if (others.length === 1 && p.killCd < 2 && U.chance(L.sabotage * 0.5)) {
        const a = M.roomOf(M.areaAt(p.x, p.y), p.x, p.y);
        const ta = M.areaAt(others[0].x, others[0].y);
        if (a && ta && a.id === ta.id && M.DOOR_ROOMS.includes(a.id) && g.doorReady(a.id)) return g.closeDoors(a.id, p);
      }
      if (this.escape && g.t - this.escape.t0 < 8 && L.camsAware && g.critAllowed() && U.chance(0.3)) return g.sabotage(U.pick(['reactor', 'o2']), p);
      if (sinceKill > 50 && g.critAllowed() && U.chance(L.sabotage * 0.22)) return g.sabotage(U.pick(['reactor', 'o2', 'lights']), p);
      if (g.anyoneOnCams() && U.chance(L.sabotage * 0.25)) return g.sabotage('comms', p);
      if (U.chance(L.sabotage * 0.07)) return g.sabotage(U.pick(['lights', 'comms']), p);
    }
    chooseImpActivity(others) {
      const g = this.g, L = this.lvl;
      const r = Math.random();
      if (this.aiOrder) {
        const res = this.runOrder();
        if (res !== false && (this.plan || this.p.inVent)) return;
      }
      /* começo da rodada: anda com alguém para ter álibi, depois se separa para caçar */
      if (!this.groupedRound && g.t - g.roundStart < 25) {
        this.groupedRound = true;
        const crowd = this.seenNow.filter((q) => !q.isImp && q.alive);
        if (crowd.length && U.chance(0.35 + L.lie * 0.4)) return this.planFollow(U.pick(crowd), U.rf(8, 14), 2.6);
      }
      /* acusado na reunião: fica perto do grupo, fazendo "tarefa" à vista */
      if (this.layLowUntil && g.t < this.layLowUntil && r < 0.55) {
        const crowd = this.seenNow.filter((q) => !q.isImp);
        if (crowd.length) return this.planFollow(U.pick(crowd), U.rf(8, 14), 3);
        return this.planFakeTask();
      }
      if (this.grudge != null && r < 0.3) {
        const q = others.find((o) => o.id === this.grudge);
        if (q) return this.planStalk(q);
      }
      /* isca: chama um tripulante sozinho para "vir junto" e leva para um canto vazio */
      if (others.length === 1 && !this.invitedRound && !(this.layLowUntil && g.t < this.layLowUntil) && U.chance(0.05 + L.lie * 0.08)) {
        const q = others[0];
        this.invitedRound = true;
        this.invite = { who: q.id, until: g.t + 25, lure: true };
        const quiet = M.ROOMS.filter((rm) => !['cafeteria', 'admin', 'storage'].includes(rm.id));
        return this.planWiggle('vem!', () => this.planFakeTask(U.pick(quiet).id));
      }
      if (r < L.stalk * 0.45) {
        const cands = others.length ? others : [];
        if (cands.length) return this.planStalk(U.pick(cands));
      }
      if (r < 0.7) return this.planFakeTask();
      if (r < 0.82) {
        const crowd = this.seenNow.filter((q) => !q.isImp);
        if (crowd.length >= 2) return this.planFollow(U.pick(crowd), U.rf(8, 15), 3);
      }
      this.planWander(U.chance(0.25) ? 'cafeteria' : U.pick(M.ROOMS).id);
    }

    /* ---------- funções especiais ---------- */
    thinkRoles() {
      const g = this.g, p = this.p, t = g.t;
      if (p.special === 'cientista') {
        this.vitalsT -= 0.3;
        if (this.vitalsT <= 0 && p.battery >= 2) {
          this.vitalsT = U.rf(18, 30);
          p.battery -= 2;
          for (const q of g.players) {
            if (!q.alive && !q.ejected && !this.mem.vitals[q.id]) this.mem.vitals[q.id] = { from: this.lastVitals, to: t };
          }
          this.lastVitals = t;
        }
      }
      if (p.special === 'rastreador' && p.abilityCd <= 0) {
        const cand = this.seenNow.filter((q) => U.dist(p, q) < 3.4);
        if (cand.length) {
          cand.sort((a, b) => (this.susp[g.appearId(b)] || 0) - (this.susp[g.appearId(a)] || 0));
          g.track(p, cand[0].id);
        }
      }
      if (p.special === 'engenheiro' && !p.inVent && p.abilityCd <= 0 && this.seenNow.length === 0 && U.chance(0.01)) {
        const v = g.nearestVent(p);
        if (v && g.enterVent(p, v)) {
          this.engVent = { exitAt: t + U.rf(1.5, 3), next: U.pick(v.links) };
        }
      }
      if (p.inVent && this.engVent) {
        if (this.engVent.next) {
          g.ventTo(p, this.engVent.next);
          this.engVent.next = null;
        } else if (t >= this.engVent.exitAt) {
          g.exitVent(p);
          this.engVent = null;
          this.plan = null;
        }
      }
    }

    /* ---------- fantasma ---------- */
    ghostUpdate(dt) {
      const g = this.g, p = this.p;
      this.thinkT -= dt;
      if (this.thinkT <= 0) {
        this.thinkT = 0.5;
        if (p.isImp) {
          this.sabThink -= 0.5;
          if (this.sabThink <= 0) {
            this.sabThink = U.rf(12, 25);
            if (g.canSabotage(p) && U.chance(this.lvl.sabotage * 0.5)) {
              const opts = ['lights', 'comms'];
              if (g.critAllowed()) opts.push('reactor', 'o2');
              g.sabotage(U.pick(opts), p);
            }
          }
          if (!this.plan) this.planWander(U.pick(M.ROOMS).id, U.rf(3, 8));
        } else if (p.special === 'anjo' && p.abilityCd <= 0) {
          const cands = g.players.filter((q) => q.alive);
          cands.sort((a, b) => (this.susp[a.id] || 0) - (this.susp[b.id] || 0));
          const tg = cands[Math.min(cands.length - 1, U.rint(0, 2))];
          if (tg) {
            if (U.dist(p, tg) <= 3.5) {
              g.protect(p, tg.id);
              this.plan = null;
            } else if (!this.plan || this.plan.type !== 'guard') {
              this.setPlan({ type: 'guard', dyn: () => (tg.alive ? { x: tg.x, y: tg.y } : null), keep: 2.5, endAt: g.t + 20, dynEvery: 0.8 });
            }
          }
        } else if (!this.plan) {
          const avail = p.tasks.filter((tk) => !tk.done && g.taskAvailable(tk));
          if (avail.length) {
            avail.sort((a, b) => {
              const sa = g.stationOfTask(a), sb = g.stationOfTask(b);
              return U.d2(p.x, p.y, sa.x, sa.y) - U.d2(p.x, p.y, sb.x, sb.y);
            });
            this.planTask(avail[0]);
          } else this.planWander(U.pick(M.ROOMS).id, U.rf(3, 8));
        }
      }
      this.act(dt);
    }

    /* ---------- percepção e eventos ---------- */
    confuse(id) {
      const q = this.g.players[id];
      const alts = (C.CONFUSABLE[q.color] || []).map((c) => this.g.players.find((x) => x.color === c)).filter(Boolean);
      return alts.length ? U.pick(alts).id : id;
    }
    perceive(seen, bodies, via) {
      const g = this.g, p = this.p, t = g.t, pers = this.pers, mem = this.mem;
      if (via === 'eyes') {
        this.seenNow = seen;
        this.bodiesNow = bodies.slice();
      } else {
        for (const b of bodies) if (!this.bodiesNow.includes(b)) this.bodiesNow.push(b);
      }
      for (const q of seen) {
        const aid = g.appearId(q);
        const area = M.areaAt(q.x, q.y).id;
        this.lastSeenAt[aid] = { t, x: q.x, y: q.y, area };
        const l = mem.last[aid];
        const isNew = !l || l.area !== area || t - l.t1 > 2.5 || l.via !== via;
        if (isNew && U.chance((1 - pers.att) * 0.2 * this.err)) mem.ignoreUntil[aid] = t + 3;
        if ((mem.ignoreUntil[aid] || 0) > t) continue;
        let act = null;
        if (q.visual && g.S.rules.visualTasks) act = 'visual';
        else if (q.busy) act = 'task';
        else if (q.onCams) act = 'cams';
        else if (q.onAdmin) act = 'admin';
        mem.see(t, aid, area, act, via, q.x, q.y);
        if (act === 'visual') mem.event({ type: 'visual', t, who: aid, task: q.visual.type, area, via }, 'visual:' + aid + ':' + g.meetings);
        if (via === 'eyes' && !p.isImp && seen.length === 1 && U.dist(p, q) < 5 && t >= g.roundStart + 9) {
          this.aloneWith = this.aloneWith || {};
          this.aloneWith[aid] = (this.aloneWith[aid] || 0) + 0.2;
        }
        if (via === 'eyes' && !p.isImp) {
          const d = U.dist(p, q);
          if (d < 3.8 && q.moving && p.moving) this.followWatch[aid] = (this.followWatch[aid] || 0) + 0.2;
          else this.followWatch[aid] = Math.max(0, (this.followWatch[aid] || 0) - 0.08);
          const invited = this.invite && this.invite.who === aid && t < this.invite.until;
          const friendly = invited || (this.susp[aid] || 0) < 8;
          if (this.followWatch[aid] >= 3 && friendly && !this.shownVisual && U.chance(invited ? 1 : 0.35) && this.showVisual(q)) {
            this.followWatch[aid] = 0;
          }
          if (invited && this.followWatch[aid] >= 7) this.followWatch[aid] = 0;
          if (!invited && this.followWatch[aid] >= 4 && this.liveSusp(aid) >= 20 && !(this.plan && ['flee', 'report', 'fix', 'button'].includes(this.plan.type))) {
            this.followWatch[aid] = 0;
            this.fieldSus[aid] = (this.fieldSus[aid] || 0) + 6;
            this.emote('?');
            this.fear = { who: aid, t };
            this.planFlee(q);
          }
          if (this.followWatch[aid] >= 7) {
            this.followWatch[aid] = 0;
            if (mem.event({ type: 'follow', t, who: aid, area }, 'follow:' + aid + ':' + g.meetings) && pers.panic) {
              this.fear = { who: aid, t };
              this.planFlee(q);
            }
          }
          /* parado numa tarefa visual sem a animação aparecer = tarefa falsa */
          const vst = g.S.rules.visualTasks ? VISUAL_ST.find((k) => U.d2(q.x, q.y, M.STATIONS[k].x, M.STATIONS[k].y) < 0.9) : null;
          if (vst && !q.visual && !q.moving) {
            this.scanWatch[aid] = (this.scanWatch[aid] || 0) + 0.2;
            if (this.scanWatch[aid] >= 3.2) mem.event({ type: 'noscan', t, who: aid, area, task: vst }, 'noscan:' + aid + ':' + g.meetings);
          }
        }
      }
      for (const b of bodies) mem.bodySeen(b, t, seen.map((q) => g.appearId(q)), via);
      /* quem anda junto de quem (base para "o X estava seguindo o Y") */
      if (via === 'eyes' && seen.length >= 2 && seen.length <= 4) {
        for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) {
          const a = seen[i], b = seen[j];
          if (U.dist(a, b) > 4.5) continue;
          const ia = g.appearId(a), ib = g.appearId(b);
          const key = ia < ib ? ia + ':' + ib : ib + ':' + ia;
          const pr = mem.pairs[key];
          const area = M.areaAt(a.x, a.y).id;
          if (pr && t - pr.t1 < 3) {
            pr.t1 = t;
            pr.n++;
            pr.area = area;
          } else mem.pairs[key] = { a: ia, b: ib, t0: t, t1: t, n: 1, area, alone: seen.length === 2 };
        }
      }
    }
    perceiveTrack(q) {
      const g = this.g;
      if (g.t - this.trackT < 1) return;
      this.trackT = g.t;
      this.mem.track.push({ who: q.id, area: M.areaAt(q.x, q.y).id, t: g.t });
    }
    onWitnessKill(apparent, victimId, area, via, body) {
      const g = this.g, pers = this.pers;
      if (this.p.isImp) {
        this.mem.event({ type: 'partnerKill', t: g.t, who: apparent, victim: victimId, area });
        return;
      }
      if (!U.chance(0.9 + 0.1 * pers.att)) return;
      let who = apparent;
      if (U.chance((1 - pers.mem) * 0.1 * this.err)) who = this.confuse(who);
      this.mem.event({ type: 'kill', t: g.t, who, victim: victimId, area, via }, 'kill:' + victimId);
      this.susp[who] = 100;
      if (pers.panic || via === 'cams') this.fear = { who, t: g.t };
      this.wantButton = { reason: 'kill', who, victim: victimId, area };
      if (pers.panic) this.planFlee(g.players[apparent]);
    }
    onWitnessVent(apparent, dir, v, via) {
      const g = this.g, p = this.p, pers = this.pers;
      if (p.isImp) return;
      if (!U.chance(0.55 + 0.45 * pers.att)) return;
      let who = apparent;
      if (U.chance((1 - pers.mem) * 0.08 * this.err)) who = this.confuse(who);
      if (this.mem.event({ type: 'vent', t: g.t, who, area: v.area, dir, via }, 'vent:' + who + ':' + g.meetings)) {
        const engineers = (g.S.roles.engenheiro || {}).n > 0;
        if ((!engineers || pers.hunch > 0.2) && p.emergencyLeft > 0) this.wantButton = { reason: 'vent', who, area: v.area };
      }
    }
    onWitnessShift(realId, intoId, via) {
      const g = this.g;
      if (this.p.isImp) return;
      const area = M.areaAt(g.players[realId].x, g.players[realId].y).id;
      if (this.mem.event({ type: 'shift', t: g.t, who: realId, into: intoId, area, via }, 'shift:' + realId + ':' + g.meetings) && this.p.emergencyLeft > 0) {
        this.wantButton = { reason: 'shift', who: realId, area };
      }
    }
    onWitnessVanish(realId, via) {
      const g = this.g;
      if (this.p.isImp) return;
      const area = M.areaAt(g.players[realId].x, g.players[realId].y).id;
      if (this.mem.event({ type: 'vanish', t: g.t, who: realId, area, via }, 'vanish:' + realId + ':' + g.meetings) && this.p.emergencyLeft > 0) {
        this.wantButton = { reason: 'vanish', who: realId, area };
      }
    }
    onNoise(body) {
      const p = this.p;
      if (!p.alive || p.isImp) return;
      if (U.d2(p.x, p.y, body.x, body.y) < 45 && U.chance(0.75)) {
        this.mem.event({ type: 'noise', t: this.g.t, victim: body.pid, area: body.area });
        this.planReport(body);
      }
    }
    /* Parceiro acabou de matar perto: se combinado (ou se dá), mata a testemunha que sobrou. */
    onPartnerKill(k, v, wit) {
      const g = this.g, p = this.p, L = this.lvl;
      if (p.killCd > 0 || U.dist(p, k) > 7) return;
      const agreed = this.dk && g.t < this.dk.until && this.dk.with === k.id;
      const cands = wit.map((w) => w.p).filter((q) => q.alive && !q.isImp && q !== p && U.dist(p, q) < 5 && q.id !== v.id);
      if (!cands.length) return;
      if (!agreed && !U.chance(L.lie * 0.3 + L.riskTol)) return;
      /* só se ninguém mais além dessas testemunhas estiver vendo */
      const others = this.crewVisible().filter((q) => !cands.includes(q));
      if (others.length && !agreed) return;
      cands.sort((a, b) => U.dist(p, a) - U.dist(p, b));
      const tgt = cands[0];
      this.dk = null;
      this.dkTarget = tgt.id;
      this.emote('!', 0.8);
      this.planHunt(tgt);
    }
    onKilled(victim, body) {
      this.escape = { t0: this.g.t, body, area: body.area, victim: victim.id, moved: false, decided: false };
      this.mem.event({ type: 'myKill', t: this.g.t, victim: victim.id, area: body.area, seenBy: this.crewVisible().map((q) => this.g.appearId(q)) });
      this.plan = null;
    }
    onDeath(killer, apparent) {
      this.killedBy = apparent;
      this.plan = null;
      this.path = null;
      this.fix = null;
      this.p.busy = null;
    }
    onSabotage() {}
    onSabFixed() {
      if (this.fix) this.fix = null;
      if (this.plan && this.plan.type === 'fix') this.plan = null;
    }
    onDoors() {
      if (this.dest) this.routeTo(this.dest.x, this.dest.y);
    }
    assignFix(st) {
      if (this.fix || !this.p.alive) return;
      if (this.plan && (this.plan.type === 'report' || this.plan.type === 'button')) return;
      this.fix = st;
    }
    onMeetingEnd(result) {
      if (this.mEnd) this.mEnd(result);
      this.plan = null;
      this.path = null;
      this.dest = null;
      this.fix = null;
      this.wantButton = null;
      this.fear = null;
      this.escape = null;
      this.ventPlan = null;
      this.engVent = null;
      this.followWatch = {};
      this.scanWatch = {};
      this.aloneWith = {};
      this.seenNow = [];
      this.bodiesNow = [];
      this.selfReport = false;
      this.invite = null;
      this.dk = null;
      this.dkTarget = null;
      this.aiOrder = null;
      this.prey = null;
      this.avoid = null;
      this.invitedRound = false;
      this.groupedRound = false;
      this.escort = null;
      this.shownVisual = false;
      this.startDelay = U.rf(0.5, 2.5);
      this.lostCount = Math.max(0, this.lostCount - 1);
    }
  }

  AU.Brain = Brain;
  AU.Memory = Memory;
})();

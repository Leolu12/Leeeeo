/* Engine de regras: jogadores, abates, dutos, sabotagens, tarefas, reuniões e vitória. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map, Nav = AU.Nav;

  const BASE_SPEED = 5.2;
  const BASE_VISION = 7;
  const KILL_DIST = { curta: 1.3, media: 1.9, longa: 2.6 };
  const USE_DIST = 1.7, REPORT_DIST = 3.6, BUTTON_DIST = 2.6, VENT_DIST = 1.4;
  const CRIT_TIME = 45;
  /* duração da animação do abate (respingo e corpo caindo): antes disso o corpo não pode ser reportado, para ninguém
     cortar a animação com a reunião (como no original, o corpo só aparece quando a animação acaba) */
  const KILL_ANIM = 1.1;

  class Player {
    constructor(id, o) {
      this.id = id;
      this.name = o.name;
      this.color = o.color;
      this.isHuman = !!o.isHuman;
      this.hat = o.hat || 'nenhum';
      this.pet = o.pet || 'nenhum';
      this.visor = o.visor || 'classico';
      this.personality = o.personality || null;
      this.role = 'crew';
      this.special = null;
      this.x = 0;
      this.y = 0;
      this.facing = 1;
      this.moving = false;
      this.walkT = 0;
      this.alive = true;
      this.tasks = [];
      this.killCd = 10;
      this.inVent = null;
      this.ventT = 0;
      this.emergencyLeft = 0;
      this.shiftAs = null;
      this.shiftUntil = 0;
      this.abilityCd = 10;
      this.invisUntil = 0;
      this.protectedUntil = 0;
      this.trackTarget = null;
      this.trackUntil = 0;
      this.battery = 10;
      this.visual = null;
      this.busy = null;
      this.deathT = null;
      this.killerId = null;
      this.ejected = false;
      this.brain = null;
      this.onCams = false;
      this.onAdmin = false;
      this.lastKillT = -99;
      this.petX = 0;
      this.petY = 0;
    }
    get isImp() { return this.role === 'impostor'; }
    get colorObj() { return C.COLOR[this.color]; }
  }

  class Game {
    constructor(settings, roster, opts) {
      opts = opts || {};
      this.S = settings;
      this.ui = opts.ui || {};
      this.headless = !!opts.headless;
      this.t = 0;
      this.phase = 'play';
      this.players = roster.map((r, i) => new Player(i, r));
      this.human = this.players.find((p) => p.isHuman) || null;
      this.bodies = [];
      this.sab = null;
      this.sabCd = 12;
      this.doorUntil = {};
      this.doorCd = {};
      this.events = [];
      this.meeting = null;
      this.meetings = 0;
      this.bodyFound = false;
      this.emergencyCdUntil = settings.rules.emergencyCooldown;
      this.pings = [];
      this.fx = [];
      this.lightLevel = 1;
      this.winner = null;
      this.endReason = '';
      this.input = { x: 0, y: 0 };
      this.killDist = KILL_DIST[settings.rules.killDistance] || KILL_DIST.media;
      this.percT = 0;
      this.dispatchT = 0;
      this.roundStart = 0;
      this.tactics = !this.headless && AU.Tactics ? AU.Tactics.create(this) : null;
      this.ghosts = !this.headless && AU.Ghosts ? AU.Ghosts.create(this) : null;
      this.consts = { USE_DIST, REPORT_DIST, BUTTON_DIST, VENT_DIST, BASE_VISION };
      M.resetDoors();
      this.assignRoles();
      this.assignTasks();
      this.players.forEach((p) => {
        p.emergencyLeft = settings.rules.emergencyMeetings;
        p.killCd = 10;
      });
      this.placeAtTable();
      this.players.forEach((p) => {
        if (!p.isHuman || opts.autopilot) p.brain = new AU.Brain(this, p);
      });
      /* mente própria: cada bot com uma IA só dele (liga e desliga sozinha conforme a IA está disponível) */
      this.minds = AU.Minds && (!this.headless || opts.minds) ? AU.Minds.create(this) : null;
      if (this.minds && opts.minds) this.forceMinds = true;
      this.log({ type: 'start' });
    }

    /* ---------- configuração inicial ---------- */
    assignRoles() {
      const S = this.S;
      const nImp = Math.min(S.room.impostors, Math.max(1, Math.floor((this.players.length - 1) / 2)));
      const human = this.human;
      const bots = this.players.filter((p) => p !== human);
      let humanImp = null;
      if (human) {
        if (S.room.draw === 'B') humanImp = true;
        else if (S.room.draw === 'C') humanImp = false;
        else if (S.room.draw === 'D') humanImp = U.chance((S.room.drawChance || 0) / 100);
      }
      let imps;
      if (humanImp === null) imps = U.shuffle(this.players).slice(0, nImp);
      else {
        imps = humanImp ? [human] : [];
        imps = imps.concat(U.shuffle(bots).slice(0, nImp - imps.length));
      }
      imps.forEach((p) => (p.role = 'impostor'));
      const crew = U.shuffle(this.players.filter((p) => !p.isImp));
      const impl = U.shuffle(imps);
      for (const rid of C.ROLE_IDS) {
        /* anjo da guarda não é sorteado no começo: vem na morte (maybeAngel) */
        if (rid === 'anjo') continue;
        const cfg = S.roles[rid] || { n: 0, chance: 0 };
        for (let i = 0; i < cfg.n; i++) {
          if (!U.chance((cfg.chance || 0) / 100)) continue;
          const pool = C.ROLES[rid].team === 'crew' ? crew : impl;
          const cand = pool.find((p) => !p.special);
          if (cand) cand.special = rid;
        }
      }
      for (const p of this.players) if (p.special === 'cientista') p.battery = this.ro('cientista', 'dur', 10);
    }

    assignTasks() {
      const R = this.S.rules;
      const commonIds = U.shuffle(M.TASK_KINDS.common).slice(0, R.commonTasks);
      const commonSteps = {};
      commonIds.forEach((id) => (commonSteps[id] = M.TASKS[id].steps()));
      for (const p of this.players) {
        const ids = commonIds.slice();
        U.shuffle(M.TASK_KINDS.long).slice(0, R.longTasks).forEach((id) => ids.push(id));
        U.shuffle(M.TASK_KINDS.short).slice(0, R.shortTasks).forEach((id) => ids.push(id));
        p.tasks = ids.map((id) => ({
          id,
          def: M.TASKS[id],
          steps: commonSteps[id] ? commonSteps[id].slice() : M.TASKS[id].steps(),
          step: 0,
          done: false,
          readyAt: 0,
          fake: p.isImp,
        }));
      }
    }

    placeAtTable() {
      const alive = this.players;
      const n = alive.length;
      alive.forEach((p, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        p.x = M.EMERGENCY.x + Math.cos(a) * 3.4;
        p.y = M.EMERGENCY.y + Math.sin(a) * 3.4;
        p.petX = p.x;
        p.petY = p.y;
        p.facing = Math.cos(a) > 0 ? -1 : 1;
        p.inVent = null;
        p.busy = null;
        p.visual = null;
        p.onCams = false;
        p.onAdmin = false;
      });
    }

    /* ---------- utilidades ---------- */
    appearId(p) { return p.shiftAs != null ? p.shiftAs : p.id; }
    appear(p) { return this.players[this.appearId(p)]; }
    isPartner(a, b) { return a !== b && a.isImp && b.isImp; }
    alivePlayers() { return this.players.filter((p) => p.alive); }
    speedOf(p) {
      let s = BASE_SPEED * this.S.rules.playerSpeed;
      if (!p.alive) s *= 1.3;
      return s;
    }
    visionOf(p) {
      if (!p.alive) return 60;
      if (p.isImp) return BASE_VISION * this.S.rules.impostorVision;
      return BASE_VISION * this.S.rules.crewVision * (0.25 + 0.75 * this.lightLevel);
    }
    canSeePoint(p, x, y) {
      if (!p.alive) return true;
      if (p.inVent) return false;
      const r = this.visionOf(p);
      return U.d2(p.x, p.y, x, y) <= r && Nav.los(p.x, p.y, x, y);
    }
    commsDown() { return !!(this.sab && this.sab.type === 'comms'); }
    sabCritical() { return !!(this.sab && (this.sab.type === 'reactor' || this.sab.type === 'o2')); }
    anyoneOnCams() { return this.players.some((p) => p.alive && p.onCams) && !this.commsDown(); }
    areaOf(p) { return M.areaAt(p.x, p.y); }
    /* opção de uma função (duração/recarga) com o padrão do jogo original como reserva */
    ro(id, key, def) {
      const r = this.S.roles && this.S.roles[id];
      return r && r[key] != null ? r[key] : def;
    }
    log(ev) {
      ev.t = this.t;
      this.events.push(ev);
    }
    say(kind, ...a) {
      if (this.ui[kind]) this.ui[kind](...a);
    }
    sfx(name) { if (!this.headless) AU.Audio.play(name); }
    /* Som de algo que acontece num ponto do mapa (duto, abate, porta, escudo): como no Among Us, só se ouve perto
       (mais ou menos o que cabe na tela), mais baixo com a distância e do lado de onde vem. Atrás de parede sai
       abafado e só bem perto. Vale também para o fantasma, que antes ouvia a nave inteira.
       o.sight: só toca se o jogador enxerga o ponto (abate e escudo, que não fazem barulho que atravesse a sala).
       o.range: alcance em tiles (porta batendo se ouve mais longe que a tampa do duto).
       o.sides: pontos dos dois lados de uma porta (a porta fechada tapa a linha até ela mesma). */
    sfxAt(name, x, y, o) {
      const h = this.human;
      if (this.headless || !h) return;
      o = o || {};
      const sight = !!o.sight, HEAR = o.range || 10;
      const d = U.d2(h.x, h.y, x, y);
      if (d > HEAR) return;
      const seen = (px, py) => (sight ? this.canSeePoint(h, px, py) : !h.inVent && Nav.los(h.x, h.y, px, py));
      const clear = !h.alive || (o.sides ? o.sides.some((q) => seen(q[0], q[1])) : seen(x, y));
      if (sight && !clear) return;
      if (!clear && d > HEAR / 2) return;
      const gain = (1 - 0.7 * U.clamp((d - 2) / (HEAR - 2), 0, 1)) * (clear ? 1 : 0.55);
      AU.Audio.play(name, 0, { gain, dx: x - h.x, dy: y - h.y, muffle: !clear });
    }
    /* som das portas de uma sala, vindo da porta mais perto do jogador */
    doorSfx(name, room) {
      const h = this.human;
      if (this.headless || !h) return;
      let best = null, bd = Infinity;
      for (const d of M.DOORS) {
        if (d.room !== room) continue;
        const [rx, ry, rw, rh] = d.rect;
        const x = rx + rw / 2, y = ry + rh / 2;
        const dd = U.d2(h.x, h.y, x, y);
        if (dd >= bd) continue;
        bd = dd;
        best = { x, y, sides: rw > rh ? [[x, ry - 0.5], [x, ry + rh + 0.5]] : [[rx - 0.5, y], [rx + rw + 0.5, y]] };
      }
      if (best) this.sfxAt(name, best.x, best.y, { range: 14, sides: best.sides });
    }
    addFx(fx) {
      fx.t0 = this.t;
      this.fx.push(fx);
    }

    /* ---------- sinais com o corpo ---------- */
    /* Zigue-zague do jogador (vai e volta 3 vezes sem sair do lugar) = "vem comigo". */
    trackMotion() {
      const h = this.human, t = this.t;
      if (!h || h.inVent) return;
      const mv = (h.mv = h.mv || []);
      mv.push({ x: h.x, y: h.y });
      while (mv.length > 8) mv.shift();
      if (mv.length < 8 || (h.gestT && t - h.gestT < 3)) return;
      let rx = 0, ry = 0, path = 0, lx = 0, ly = 0;
      for (let i = 1; i < mv.length; i++) {
        const dx = mv[i].x - mv[i - 1].x, dy = mv[i].y - mv[i - 1].y;
        path += Math.hypot(dx, dy);
        if (Math.abs(dx) > 0.08) {
          const sx = Math.sign(dx);
          if (lx && sx !== lx) rx++;
          lx = sx;
        }
        if (Math.abs(dy) > 0.08) {
          const sy = Math.sign(dy);
          if (ly && sy !== ly) ry++;
          ly = sy;
        }
      }
      const net = Math.hypot(mv[mv.length - 1].x - mv[0].x, mv[mv.length - 1].y - mv[0].y);
      if ((rx >= 3 || ry >= 3) && path > 1.2 && net < 1.6) this.gesture(h, 'wiggle');
    }
    /* O zigue-zague não aparece como texto: quem está olhando talvez perceba (atenção, distância, ocupado, escuro). */
    gesture(p, kind, opts) {
      const t = this.t;
      opts = opts || {};
      p.gestT = t;
      this.log({ type: 'gesture', by: p.id, kind, to: opts.to != null ? opts.to : undefined, reply: opts.reply || undefined });
      /* fantasma chamando fantasma: os outros fantasmas por perto veem (só eles se enxergam) e vão junto */
      if (!p.alive) {
        for (const q of this.players) {
          if (q === p || q.alive || !q.brain || q.isHuman || U.dist(p, q) > 8) continue;
          if (U.chance(0.85)) q.brain.ghostCome(p, null, 'sinal');
        }
        return;
      }
      for (const q of this.players) {
        if (q === p || !q.alive || !q.brain || !q.brain.seenNow) continue;
        if (!q.brain.seenNow.includes(p)) continue;
        const d = U.dist(p, q);
        if (d > 7) continue;
        const notice = (0.45 + (q.brain.pers.att || 0.7) * 0.5) * (d < 3.5 ? 1 : d < 5.5 ? 0.7 : 0.4) * (q.busy ? 0.6 : 1) * (this.sab && this.sab.type === 'lights' ? 0.6 : 1);
        if (!U.chance(notice)) continue;
        /* resposta a um chamado de outra pessoa ("ok, tô indo" para quem chamou): quem está do lado entende que não é com ele */
        if (opts.reply && opts.to !== q.id) continue;
        try {
          q.brain.onGesture(p, kind, opts);
        } catch (e) {
          if (window.console) console.warn('gesto falhou', e);
        }
      }
    }

    canStand(x, y, ghost) {
      if (ghost) return x > 0.5 && y > 0.5 && x < M.W - 0.5 && y < M.H - 0.5;
      const r = 0.3;
      return M.walkAt(x - r, y - r) && M.walkAt(x + r, y - r) && M.walkAt(x - r, y + r) && M.walkAt(x + r, y + r) && M.chamferGap(x, y) >= r && M.propGap(x, y) >= r;
    }
    moveEntity(p, vx, vy, dt) {
      const ghost = !p.alive;
      const nx = p.x + vx * dt, ny = p.y + vy * dt;
      let moved = false;
      if (this.canStand(nx, p.y, ghost)) { p.x = nx; moved = true; }
      if (this.canStand(p.x, ny, ghost)) { p.y = ny; moved = true; }
      /* encostado numa parede diagonal ou num móvel redondo: desliza em volta em vez de travar
         (tenta a direção desejada girada um pouco para cada lado, com a velocidade que sobra) */
      if (!moved && !ghost && (vx || vy)) {
        const sp = Math.hypot(vx, vy), a0 = Math.atan2(vy, vx);
        for (const da of [0.45, -0.45, 0.9, -0.9, 1.3, -1.3]) {
          const k = sp * Math.cos(da) * dt;
          const nx2 = p.x + Math.cos(a0 + da) * k, ny2 = p.y + Math.sin(a0 + da) * k;
          if (this.canStand(nx2, ny2, ghost)) {
            p.x = nx2;
            p.y = ny2;
            moved = true;
            break;
          }
        }
      }
      if (Math.abs(vx) > 0.01) p.facing = vx < 0 ? -1 : 1;
      p.moving = moved && (Math.abs(vx) + Math.abs(vy) > 0.01);
      if (p.moving) {
        p.walkT += dt;
        /* passos do jogador, no ritmo da passada e com o som do piso */
        if (p.isHuman && p.alive && !this.headless) {
          const k = Math.floor((p.walkT * 11) / Math.PI);
          if (k !== p.stepK) {
            p.stepK = k;
            AU.Audio.step(AU.Audio.surfaceOf((M.areaAt(p.x, p.y) || {}).id));
          }
        }
      }
      return moved;
    }

    /* ---------- laço principal ---------- */
    update(dt) {
      if (this.phase === 'ended') return;
      if (this.ghosts) this.ghosts.tick(dt);
      if (this.phase === 'meeting') {
        if (this.meeting) this.meeting.update(dt);
        return;
      }
      this.t += dt;
      const t = this.t;
      /* rastro curto do jogador: os bots percebem para onde ele está indo (ex.: qual lado do reator) */
      if (this.human && (this.trailT = (this.trailT || 0) - dt) <= 0) {
        this.trailT = 0.5;
        this.hTrail = (this.hTrail || []).concat({ x: this.human.x, y: this.human.y, t }).slice(-6);
      }
      /* ambiente sonoro em 3D em volta do jogador (máquinas das salas por perto, abafadas atrás de parede) */
      if (!this.headless && this.human && (this.ambT = (this.ambT || 0) - dt) <= 0) {
        this.ambT = 0.1;
        const h = this.human;
        AU.Audio.listen({ x: h.x, y: h.y, alive: h.alive, inVent: !!h.inVent, los: Nav.los });
      }
      for (const p of this.players) {
        p.killCd = Math.max(0, p.killCd - dt);
        p.abilityCd = Math.max(0, p.abilityCd - dt);
        if (p.special === 'cientista' && p.battery < this.ro('cientista', 'dur', 10)) p.battery = Math.min(this.ro('cientista', 'dur', 10), p.battery + dt * 0.04);
        if (p.shiftAs != null && t >= p.shiftUntil) this.unshift(p);
        if (p.invisUntil && t >= p.invisUntil) this.reappear(p);
        if (p.inVent && p.special === 'engenheiro' && t - p.ventT > this.ro('engenheiro', 'dur', 15)) this.exitVent(p);
        if (p.visual && p.visual.until < t) p.visual = null;
        if (p.busy && p.busy.until && p.busy.until < t - 0.5 && !p.isHuman) p.busy = null;
        p.moving = false;
      }
      this.sabCd = Math.max(0, this.sabCd - dt);
      const lightTarget = this.sab && this.sab.type === 'lights' ? 0 : 1;
      this.lightLevel += U.clamp(lightTarget - this.lightLevel, -dt / 1.5, dt / 1.5);
      for (const room of M.DOOR_ROOMS) {
        if (this.doorUntil[room] && t >= this.doorUntil[room]) {
          this.doorUntil[room] = 0;
          M.setDoorsClosed(room, false);
          this.markDoors(room);
          this.doorSfx('doorOpen', room);
        }
      }
      if (this.sab) {
        if (this.sab.timer != null) {
          this.sab.timer -= dt;
          if (this.sab.type === 'reactor') {
            const h = this.sab.hold;
            if (t - h.A < 0.3 && t - h.B < 0.3) {
              this.sab.both += dt;
              if (this.sab.both >= 1.2) this.sabFixed(null);
            } else this.sab.both = 0;
          }
          if (this.sab && this.sab.timer <= 0) {
            this.end('impostor', this.sab.type === 'reactor' ? 'O reator derreteu.' : 'O oxigênio acabou.');
            return;
          }
        }
        this.dispatchT -= dt;
        if (this.dispatchT <= 0) {
          this.dispatchT = this.sab && (this.sab.type === 'reactor' || this.sab.type === 'o2') ? 1 : 3;
          this.dispatchFix();
        }
      }

      const h = this.human;
      if (h && this.phase === 'play' && !h.inVent && !h.frozen) {
        const len = Math.hypot(this.input.x, this.input.y);
        if (len > 0.05) {
          const s = this.speedOf(h) * Math.min(1, len);
          this.moveEntity(h, (this.input.x / len) * s, (this.input.y / len) * s, dt);
          if (h.busy && !h.busy.minigame) h.busy = null;
          h.ghostFollow = null;
        } else if (!h.alive && h.ghostFollow != null) {
          /* fantasma seguindo alguém: vai atrás atravessando paredes */
          const q = this.players[h.ghostFollow];
          if (!q || !q.alive) h.ghostFollow = null;
          else {
            const dx = q.x - h.x, dy = q.y - h.y, d = Math.hypot(dx, dy);
            if (d > 1.1) {
              const s = this.speedOf(h) * (d > 6 ? 1.8 : d > 2.5 ? 1.15 : 0.9);
              this.moveEntity(h, (dx / d) * s, (dy / d) * s, dt);
            }
          }
        }
      }
      for (const p of this.players) if (p.brain) p.brain.update(dt);
      if (this.phase !== 'play') return;

      this.percT -= dt;
      if (this.percT <= 0) {
        this.percT = 0.2;
        this.perceive();
        this.trackMotion();
        if (this.tactics) this.tactics.tick();
        if (this.minds) this.minds.tick();
      }
      for (const p of this.players) {
        const tx = p.x - p.facing * 0.9, ty = p.y + 0.25;
        p.petX += (tx - p.petX) * Math.min(1, dt * 4);
        p.petY += (ty - p.petY) * Math.min(1, dt * 4);
      }
      this.fx = this.fx.filter((f) => t - f.t0 < (f.dur || 1));
      this.pings = this.pings.filter((pg) => pg.until > t);
      this.checkWin();
    }

    /* ---------- percepção dos bots ---------- */
    perceive() {
      const t = this.t;
      const targets = this.players.filter((q) => q.alive && !q.inVent && !(q.invisUntil > t));
      const bodies = this.bodies.filter((b) => !b.gone);
      const commsDown = this.commsDown();
      for (const b of this.players) {
        if (!b.brain || !b.alive || b.inVent) continue;
        const r = this.visionOf(b);
        const seen = [];
        for (const q of targets) {
          if (q === b) continue;
          if (U.d2(b.x, b.y, q.x, q.y) <= r && Nav.los(b.x, b.y, q.x, q.y)) seen.push(q);
        }
        const bs = bodies.filter((bd) => U.d2(b.x, b.y, bd.x, bd.y) <= r && Nav.los(b.x, b.y, bd.x, bd.y));
        b.brain.perceive(seen, bs, 'eyes');
        if (b.onCams && !commsDown) {
          const cs = [], cb = [];
          for (const cam of M.CAMS) {
            for (const q of targets) {
              if (q === b || cs.includes(q) || seen.includes(q)) continue;
              if (U.d2(cam.x, cam.y, q.x, q.y) <= M.CAM_R && Nav.los(cam.x, cam.y, q.x, q.y)) cs.push(q);
            }
            for (const bd of bodies) {
              if (!cb.includes(bd) && U.d2(cam.x, cam.y, bd.x, bd.y) <= M.CAM_R && Nav.los(cam.x, cam.y, bd.x, bd.y)) cb.push(bd);
            }
          }
          if (cs.length || cb.length) b.brain.perceive(cs, cb, 'cams');
        }
        if (b.trackTarget != null && b.trackUntil > t) {
          const q = this.players[b.trackTarget];
          if (q.alive) b.brain.perceiveTrack(q);
        }
      }
    }

    witnesses(points, exclude) {
      const res = [];
      const commsDown = this.commsDown();
      for (const b of this.players) {
        if (!b.alive || b.inVent || exclude.includes(b.id)) continue;
        const r = this.visionOf(b);
        let via = null;
        if (points.some((pt) => U.d2(b.x, b.y, pt.x, pt.y) <= r && Nav.los(b.x, b.y, pt.x, pt.y))) via = 'eyes';
        else if (b.onCams && !commsDown && points.some((pt) => M.CAMS.some((c) => U.d2(c.x, c.y, pt.x, pt.y) <= M.CAM_R && Nav.los(c.x, c.y, pt.x, pt.y)))) via = 'cams';
        if (via) res.push({ p: b, via });
      }
      return res;
    }

    /* ---------- abate e reporte ---------- */
    killTargetFor(k) {
      if (!k.alive || !k.isImp || k.inVent) return null;
      let best = null, bd = 1e9;
      for (const v of this.players) {
        if (!v.alive || v.isImp || v.inVent || v === k) continue;
        const d = U.dist(k, v);
        if (d <= this.killDist && d < bd && Nav.los(k.x, k.y, v.x, v.y)) {
          bd = d;
          best = v;
        }
      }
      return best;
    }

    partnerKilledRecently(k) {
      return this.players.some((p) => p !== k && p.isImp && this.t - p.lastKillT < 8);
    }

    tryKill(k, v) {
      const t = this.t;
      if (this.phase !== 'play' || !k.alive || !k.isImp || k.killCd > 0 || !v || !v.alive || v.isImp || k.inVent || v.inVent) return false;
      if (k.invisUntil > t) return false;
      if (U.dist(k, v) > this.killDist + 0.05) return false;
      if (this.S.house.noDoubleKill && this.partnerKilledRecently(k)) return false;
      if (v.protectedUntil > t) {
        v.protectedUntil = 0;
        k.killCd = this.S.rules.killCooldown * 0.5;
        this.addFx({ type: 'shield', x: v.x, y: v.y, dur: 1.2 });
        this.log({ type: 'protectBlock', killer: k.id, victim: v.id });
        if (this.ghosts) this.ghosts.onShield(v);
        if (k.isHuman || v.isHuman) this.say('toast', 'Um escudo de anjo bloqueou o abate!');
        if (k.isHuman || v.isHuman) this.sfx('shield');
        else this.sfxAt('shield', v.x, v.y, { sight: true });
        return false;
      }
      const kx = k.x, ky = k.y;
      const area = M.areaAt(v.x, v.y);
      const apparent = this.appearId(k);
      v.alive = false;
      v.deathT = t;
      v.killerId = k.id;
      v.killerApparent = apparent;
      v.busy = null;
      v.visual = null;
      v.onCams = false;
      v.onAdmin = false;
      v.trackTarget = null;
      this.maybeAngel(v);
      const body = { id: this.bodies.length, pid: v.id, x: v.x, y: v.y, t, area: area.id, reported: false, gone: false, killer: k.id };
      this.bodies.push(body);
      k.x = v.x;
      k.y = v.y;
      k.killCd = this.S.rules.killCooldown;
      k.lastKillT = t;
      k.busy = null;
      const wit = this.witnesses([{ x: kx, y: ky }, { x: v.x, y: v.y }], [k.id, v.id]);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessKill(apparent, v.id, area.id, w.via, body, k);
      if (k.brain) k.brain.onKilled(v, body, wit);
      /* double kill: parceiro impostor por perto aproveita e mata uma testemunha */
      if (!this.S.house.noDoubleKill) {
        for (const q of this.players) {
          if (q === k || !q.isImp || !q.alive || !q.brain || q.inVent) continue;
          try {
            q.brain.onPartnerKill(k, v, wit);
          } catch (e) {
            if (window.console) console.warn('double kill falhou', e);
          }
        }
      }
      if (v.brain) v.brain.onDeath(k, apparent);
      if (this.ghosts) this.ghosts.onKill(k, v, apparent, area.id);
      this.addFx({ type: 'kill', x: v.x, y: v.y, dur: KILL_ANIM, color: v.color, seed: Math.random() * 100 });
      this.log({ type: 'kill', killer: k.id, victim: v.id, area: area.id, apparent, witnesses: wit.map((w) => w.p.id) });
      const h = this.human;
      if (v.isHuman) {
        this.sfx('dead');
        this.say('onHumanKilled', k, this.players[apparent]);
      } else if (k.isHuman) {
        this.sfx('kill');
      } else if (h && h.alive && this.canSeePoint(h, v.x, v.y)) {
        this.sfxAt('kill', v.x, v.y, { sight: true });
        this.say('narrate', 'Você viu um abate acontecer diante dos seus olhos.', 'event');
      }
      if (v.special === 'barulhento') {
        this.pings.push({ x: v.x, y: v.y, until: t + this.ro('barulhento', 'dur', 10), pid: v.id });
        for (const p of this.players) if (p.brain && p.alive) p.brain.onNoise(body);
        if (h && h.alive) this.say('toast', 'Alerta! Um tripulante morreu — siga o sinal.');
      }
      this.checkWin();
      return true;
    }

    bodyInReach(p) {
      if (!p.alive || p.inVent) return null;
      let best = null, bd = 1e9;
      for (const b of this.bodies) {
        if (b.gone || b.reported || this.t - b.t < KILL_ANIM) continue;
        const d = U.d2(p.x, p.y, b.x, b.y);
        if (d <= REPORT_DIST && d < bd && Nav.los(p.x, p.y, b.x, b.y)) {
          bd = d;
          best = b;
        }
      }
      if (best && this.S.house.noSelfReport && best.killer === p.id) return null;
      return best;
    }

    tryReport(p, body) {
      if (this.phase !== 'play' || !p.alive || !body || body.reported || body.gone) return false;
      if (this.t - body.t < KILL_ANIM) return false;
      if (U.d2(p.x, p.y, body.x, body.y) > REPORT_DIST + 0.2 || !Nav.los(p.x, p.y, body.x, body.y)) return false;
      if (this.S.house.noSelfReport && body.killer === p.id) return false;
      body.reported = true;
      this.bodyFound = true;
      this.log({ type: 'report', by: p.id, victim: body.pid, area: body.area });
      this.startMeeting({ kind: 'report', caller: p.id, body });
      return true;
    }

    canEmergency(p) {
      return this.phase === 'play' && p.alive && !p.inVent && p.emergencyLeft > 0 && this.t >= this.emergencyCdUntil && !this.sabCritical();
    }
    nearButton(p) { return U.d2(p.x, p.y, M.EMERGENCY.x, M.EMERGENCY.y) <= BUTTON_DIST; }
    tryEmergency(p) {
      if (!this.canEmergency(p) || !this.nearButton(p)) return false;
      p.emergencyLeft--;
      this.log({ type: 'emergency', by: p.id });
      this.startMeeting({ kind: 'emergency', caller: p.id });
      return true;
    }

    /* ---------- reuniões ---------- */
    startMeeting(info) {
      this.phase = 'meeting';
      this.say('closeOverlays');
      if (!this.headless) AU.Audio.ambience(null);
      if (this.sabCritical()) {
        this.log({ type: 'sabFix', sab: this.sab.type, by: null, meeting: true });
        this.sab = null;
        AU.Audio.alarm(false);
      }
      for (const p of this.players) {
        if (p.inVent) p.inVent = null;
        /* reunião no meio do disfarce: volta ao normal e a habilidade conta como usada */
        if (p.shiftAs != null) {
          p.shiftAs = null;
          p.abilityCd = Math.max(p.abilityCd, this.ro('metamorfo', 'cd', 25));
        }
        p.morph = null;
        p.invisUntil = 0;
        p.onCams = false;
        p.onAdmin = false;
        p.busy = null;
        p.visual = null;
        p.moving = false;
      }
      for (const room of M.DOOR_ROOMS) {
        this.doorUntil[room] = 0;
        M.setDoorsClosed(room, false);
      }
      this.meetings++;
      info.index = this.meetings;
      info.t = this.t;
      info.roundStart = this.roundStart;
      this.log({ type: 'meeting', kind: info.kind, by: info.caller, index: this.meetings });
      /* som da reunião: toca junto com a abertura, na tela da reunião (que pode esperar a cena da sua morte acabar) */
      this.meeting = new AU.Meeting(this, info);
      this.meetingLog = this.meetingLog || [];
      this.meetingLog.push(this.meeting);
      this.say('onMeetingStart', this.meeting);
    }

    finishMeeting(result) {
      const ej = result.ejected != null ? this.players[result.ejected] : null;
      if (ej) {
        ej.alive = false;
        ej.ejected = true;
        ej.deathT = this.t;
        ej.busy = null;
        this.maybeAngel(ej);
        if (this.ghosts) this.ghosts.onEject(ej);
      }
      this.log({ type: 'vote', index: this.meeting ? this.meeting.info.index : this.meetings, ejected: ej ? ej.id : null, tie: !!result.tie, votes: result.votes });
      /* duplas combinadas no chat são públicas: todo mundo ouviu quem vai andar com quem */
      this.publicPacts = this.publicPacts || [];
      if (this.meeting) for (const m of this.meeting.msgs) for (const it of m.intents || []) if (it.type === 'pactOk' && it.who != null) this.publicPacts.push({ a: m.from, b: it.who, from: this.meetings, scope: it.scope || 'round' });
      this.bodies.forEach((b) => (b.gone = true));
      this.placeAtTable();
      for (const p of this.players) {
        if (p.isImp) p.killCd = this.S.rules.killCooldown;
        if (p.special) p.abilityCd = Math.max(p.abilityCd, 10);
      }
      this.sabCd = Math.max(this.sabCd, 12);
      this.emergencyCdUntil = this.t + this.S.rules.emergencyCooldown;
      this.roundStart = this.t;
      if (this.minds && this.meeting) this.minds.afterMeeting(this.meeting, result);
      for (const p of this.players) if (p.brain) p.brain.onMeetingEnd(result);
      if (this.tactics) this.tactics.poke('both', 5);
      this.meeting = null;
      this.phase = 'play';
      this.checkWin();
    }

    /* ---------- sabotagem ---------- */
    canSabotage(p) {
      return !!p && p.isImp && this.phase === 'play' && !this.sab && this.sabCd <= 0 && !p.inVent;
    }
    critAllowed() { return !this.S.house.critAfterFirstBody || this.bodyFound; }
    sabotage(type, p) {
      if (!this.canSabotage(p)) return false;
      if ((type === 'reactor' || type === 'o2') && !this.critAllowed()) return false;
      const s = { type, t0: this.t, by: p.id };
      if (type === 'lights') {
        s.switches = [0, 1, 2, 3, 4].map(() => U.chance(0.5));
        if (s.switches.every(Boolean)) s.switches[U.rint(0, 4)] = false;
        s.switches[U.rint(0, 4)] = false;
      } else if (type === 'reactor') {
        s.timer = this.S.rules.critTime || CRIT_TIME;
        s.hold = { A: -9, B: -9 };
        s.both = 0;
      } else if (type === 'o2') {
        s.timer = this.S.rules.critTime || CRIT_TIME;
        s.code = String(U.rint(10000, 99999));
        s.done = { A: false, B: false };
      } else if (type === 'comms') {
        s.target = U.rf(-2.4, 2.4);
      } else return false;
      this.sab = s;
      this.dispatchT = 0;
      if (this.tactics) this.tactics.poke('crew', 1);
      this.log({ type: 'sabotage', sab: type, by: p.id });
      for (const q of this.players) if (q.brain) q.brain.onSabotage(s);
      this.say('onSabotage', s);
      this.sfx(type === 'lights' ? 'lightsOff' : 'sabotage');
      if (type === 'reactor' || type === 'o2') {
        if (!this.headless) AU.Audio.alarm(true);
      }
      return true;
    }
    sabFixed(by) {
      if (!this.sab) return;
      const s = this.sab;
      this.log({ type: 'sabFix', sab: s.type, by: by ? by.id : null, dur: this.t - s.t0 });
      this.sab = null;
      this.sabCd = this.S.rules.sabCooldown != null ? this.S.rules.sabCooldown : 30;
      AU.Audio.alarm(false);
      this.sfx('fixed');
      for (const q of this.players) if (q.brain) q.brain.onSabFixed(s);
      this.say('onSabFixed', s);
    }
    fixLightsToggle(i, p) {
      const s = this.sab;
      if (!s || s.type !== 'lights') return;
      s.switches[i] = !s.switches[i];
      if (s.switches.every(Boolean)) this.sabFixed(p);
    }
    botFixLights(p) {
      if (this.sab && this.sab.type === 'lights') {
        this.sab.switches = this.sab.switches.map(() => true);
        this.sabFixed(p);
      }
    }
    reactorHold(p, which) {
      if (this.sab && this.sab.type === 'reactor') this.sab.hold[which] = this.t;
    }
    o2Enter(which, code, p) {
      const s = this.sab;
      if (!s || s.type !== 'o2') return false;
      if (String(code) !== s.code) return false;
      s.done[which] = true;
      this.log({ type: 'o2pad', which, by: p.id });
      if (s.done.A && s.done.B) this.sabFixed(p);
      return true;
    }
    fixComms(p) {
      if (this.sab && this.sab.type === 'comms') this.sabFixed(p);
    }
    sabStationsNeeded() {
      const s = this.sab;
      if (!s) return [];
      if (s.type === 'lights') return ['lights'];
      if (s.type === 'comms') return ['comms'];
      if (s.type === 'reactor') return ['reactorA', 'reactorB'];
      if (s.type === 'o2') return ['o2A', 'o2B'].filter((k) => !s.done[k.slice(-1)]);
      return [];
    }
    /* para qual painel o jogador está indo: parado ao lado dele, ou se aproximando depressa nos últimos ~2 s */
    humanHeading(need) {
      const h = this.human;
      if (!h || !h.alive || h.brain || h.inVent) return null;
      const tr = this.hTrail || [];
      const old = tr.length >= 4 ? tr[tr.length - 4] : null;
      let best = null;
      for (const k of need) {
        const pos = M.SAB_STATIONS[k];
        const d = Math.sqrt(U.d2(h.x, h.y, pos.x, pos.y));
        if (d < 2.5) return { k, d: 0 };
        if (!old || d > 40) continue;
        const ap = Math.sqrt(U.d2(old.x, old.y, pos.x, pos.y)) - d;
        if (ap > 2 && (!best || ap > best.ap + 0.5 || (Math.abs(ap - best.ap) <= 0.5 && d < best.d))) best = { k, d, ap };
      }
      return best;
    }
    /* Reator e O2 têm dois painéis: a tripulação se divide como gente faz. A cada segundo escolhe, entre todas as
       combinações, a que deixa os dois lados cobertos mais cedo, contando quem já está segurando, quem já está a
       caminho e para onde o jogador está indo; um lado vazio puxa quem estiver sobrando do outro. Um pouco de
       inércia evita que alguém fique indo e voltando. */
    dispatchSplit(s, need) {
      const crew = this.players.filter((p) => p.alive && p.brain && !p.isImp && !p.inVent);
      const eta = (p, k) => {
        const pos = M.SAB_STATIONS[k];
        const d = Math.sqrt(U.d2(p.x, p.y, pos.x, pos.y));
        return d < 1.8 ? 0 : d * 1.3;
      };
      const target = 2;
      const H = crew.filter((p) => need.includes(p.brain.fix));
      const hum = this.humanHeading(need);
      const free = crew.filter((p) => !p.brain.fix && p.brain.canHelpFix());
      const want = () => {
        let n = target * need.length - (hum ? 1 : 0);
        /* painel ainda muito longe de todo mundo: chama reforço */
        for (const k of need) {
          const bestK = Math.min(hum && hum.k === k ? hum.d * 1.3 : 1e9, ...H.map((p) => eta(p, k)));
          if (bestK > 55) n++;
        }
        return Math.min(n, need.length * 2);
      };
      while (H.length < want() && free.length) {
        free.sort((a, b) => Math.min(...need.map((k) => eta(a, k))) - Math.min(...need.map((k) => eta(b, k))));
        H.push(free.shift());
      }
      if (!H.length) return;
      const nS = need.length, n = H.length;
      let best = null;
      for (let mask = 0; mask < Math.pow(nS, n); mask++) {
        const pick = [];
        let m = mask;
        for (let i = 0; i < n; i++) {
          pick.push(need[m % nS]);
          m = Math.floor(m / nS);
        }
        let cover = 0, sum = 0, changes = 0;
        const cnt = need.map(() => 0);
        for (let si = 0; si < nS; si++) {
          const k = need[si];
          let mn = hum && hum.k === k ? hum.d * 1.3 : 1e9;
          if (hum && hum.k === k) cnt[si]++;
          for (let i = 0; i < n; i++) {
            if (pick[i] !== k) continue;
            cnt[si]++;
            const e = eta(H[i], k);
            sum += e;
            mn = Math.min(mn, e);
          }
          cover = Math.max(cover, mn);
        }
        for (let i = 0; i < n; i++) if (H[i].brain.fix && H[i].brain.fix !== pick[i]) changes++;
        const score = cover + 0.15 * sum + 3 * (Math.max(...cnt) - Math.min(...cnt)) + 6 * changes;
        if (!best || score < best.score) best = { score, pick };
      }
      H.forEach((p, i) => {
        if (p.brain.fix !== best.pick[i]) p.brain.reassignFix(best.pick[i]);
      });
      /* lado que já tem gente de sobra (contando o jogador): quem está mais longe volta ao que fazia */
      for (const k of need) {
        const mine = H.filter((p) => p.brain.fix === k).sort((a, b) => eta(b, k) - eta(a, k));
        let extra = mine.length + (hum && hum.k === k ? 1 : 0) - target;
        for (const p of mine) {
          if (extra <= 0) break;
          p.brain.reassignFix(null);
          extra--;
        }
      }
    }
    dispatchFix() {
      const s = this.sab;
      if (!s) return;
      const need = this.sabStationsNeeded();
      if ((s.type === 'reactor' || s.type === 'o2') && need.length) return this.dispatchSplit(s, need);
      const want = s.type === 'lights' ? 2 : s.type === 'comms' ? 1 : 2;
      for (const st of need) {
        const pos = M.SAB_STATIONS[st];
        const assigned = this.players.filter((p) => p.alive && p.brain && p.brain.fix === st);
        if (assigned.length >= want) continue;
        const cands = this.players
          .filter((p) => p.alive && p.brain && !p.isImp && !p.brain.fix && !p.inVent)
          .sort((a, b) => U.d2(a.x, a.y, pos.x, pos.y) - U.d2(b.x, b.y, pos.x, pos.y));
        for (const c of cands.slice(0, want - assigned.length)) c.brain.assignFix(st);
      }
    }

    doorReady(room) { return (this.doorCd[room] || 0) <= this.t; }
    /* marca a hora em que as portas da sala mudaram (para a animação de abrir e fechar) */
    markDoors(room) {
      for (const d of M.DOORS) if (d.room === room) d.animT = this.t;
    }
    closeDoors(room, p) {
      if (!p || !p.isImp || this.phase !== 'play' || !this.doorReady(room) || !M.DOOR_ROOMS.includes(room)) return false;
      const dt0 = this.S.rules.doorTime || 10;
      this.doorUntil[room] = this.t + dt0;
      this.doorCd[room] = this.t + dt0 + (this.S.rules.doorCooldown != null ? this.S.rules.doorCooldown : 16);
      M.setDoorsClosed(room, true);
      this.markDoors(room);
      this.unstickFromDoors();
      this.log({ type: 'doors', room, by: p.id });
      for (const q of this.players) if (q.brain) q.brain.onDoors(room);
      this.doorSfx('door', room);
      return true;
    }

    /* Quem estava no vão da porta quando ela fechou é empurrado para o lado livre mais perto (como no jogo original). */
    unstickFromDoors() {
      for (const q of this.players) {
        if (!q.alive || q.inVent || this.canStand(q.x, q.y)) continue;
        let best = null, bd = 1e9;
        for (let r = 0.25; r <= 3 && !best; r += 0.25) {
          for (let a = 0; a < 16; a++) {
            const x = q.x + Math.cos((a / 16) * Math.PI * 2) * r, y = q.y + Math.sin((a / 16) * Math.PI * 2) * r;
            if (!this.canStand(x, y)) continue;
            const d = Math.hypot(x - q.x, y - q.y);
            if (d < bd) {
              bd = d;
              best = { x, y };
            }
          }
        }
        if (best) {
          q.x = best.x;
          q.y = best.y;
          if (q.brain) q.brain.path = null;
        }
      }
    }

    /* ---------- dutos ---------- */
    canVent(p) { return p.alive && (p.isImp || p.special === 'engenheiro') && this.phase === 'play'; }
    nearestVent(p) {
      let best = null, bd = VENT_DIST;
      for (const v of M.VENTS) {
        const d = U.d2(p.x, p.y, v.x, v.y);
        if (d <= bd) {
          bd = d;
          best = v;
        }
      }
      return best;
    }
    enterVent(p, v) {
      if (!this.canVent(p) || p.inVent || !v) return false;
      if (p.special === 'engenheiro' && p.abilityCd > 0) return false;
      if (p.invisUntil > this.t) return false;
      p.inVent = v.id;
      p.x = v.x;
      p.y = v.y;
      p.ventT = this.t;
      p.busy = null;
      p.onCams = false;
      const wit = this.witnesses([v], [p.id]);
      const ap = this.appearId(p);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessVent(ap, 'in', v, w.via);
      const apc = this.appear(p);
      this.addFx({ type: 'ventIn', x: v.x, y: v.y, dur: 0.6, color: apc.color, hat: apc.hat, visor: apc.visor, facing: p.facing, who: p.id });
      this.log({ type: 'vent', by: p.id, vent: v.id, dir: 'in', witnesses: wit.map((w) => w.p.id) });
      if (p.isHuman) this.sfx('vent');
      else this.sfxAt('vent', v.x, v.y);
      return true;
    }
    ventTo(p, vid) {
      if (!p.inVent) return false;
      const cur = M.VENT[p.inVent];
      if (!cur.links.includes(vid)) return false;
      const v = M.VENT[vid];
      p.inVent = vid;
      p.x = v.x;
      p.y = v.y;
      if (p.isHuman) this.sfx('ventMove');
      return true;
    }
    exitVent(p) {
      if (!p.inVent) return false;
      const v = M.VENT[p.inVent];
      p.inVent = null;
      const wit = this.witnesses([v], [p.id]);
      const ap = this.appearId(p);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessVent(ap, 'out', v, w.via);
      this.addFx({ type: 'ventOut', x: v.x, y: v.y, dur: 0.5, who: p.id });
      /* sai do duto "pulando": o desenho cresce de dentro da tampa */
      p.popT = this.t;
      this.log({ type: 'vent', by: p.id, vent: v.id, dir: 'out', witnesses: wit.map((w) => w.p.id) });
      if (p.special === 'engenheiro') p.abilityCd = this.ro('engenheiro', 'cd', 20);
      if (p.isHuman) this.sfx('vent');
      else this.sfxAt('vent', v.x, v.y);
      return true;
    }

    /* ---------- habilidades especiais ---------- */
    shapeshift(p, targetId) {
      const t = this.t;
      if (p.special !== 'metamorfo' || !p.alive || p.abilityCd > 0 || p.inVent || p.shiftAs != null || this.phase !== 'play') return false;
      const tg = this.players[targetId];
      if (!tg || tg === p) return false;
      const wit = this.witnesses([p], [p.id]);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessShift(p.id, targetId, w.via);
      this.morphFrom(p);
      p.shiftAs = targetId;
      p.shiftT0 = t;
      p.shiftUntil = t + this.ro('metamorfo', 'dur', 30);
      this.addFx({ type: 'puff', x: p.x, y: p.y, dur: 0.6 });
      this.log({ type: 'shift', by: p.id, into: targetId, witnesses: wit.map((w) => w.p.id) });
      return true;
    }
    /* a aparência de antes, para a animação da troca (a velha se desfaz na nova) */
    morphFrom(p) {
      const a = this.appear(p);
      p.morph = { t0: this.t, color: a.color, hat: a.hat, visor: a.visor };
    }
    unshift(p) {
      if (p.shiftAs == null) return;
      const wit = this.witnesses([p], [p.id]);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessShift(p.id, p.shiftAs, w.via);
      this.morphFrom(p);
      p.shiftAs = null;
      p.abilityCd = this.ro('metamorfo', 'cd', 25);
      this.addFx({ type: 'puff', x: p.x, y: p.y, dur: 0.6 });
    }
    vanish(p) {
      if (p.special !== 'fantasma' || !p.alive || p.abilityCd > 0 || p.inVent || p.invisUntil > this.t || this.phase !== 'play') return false;
      const wit = this.witnesses([p], [p.id]);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessVanish(p.id, w.via);
      p.invisUntil = this.t + this.ro('fantasma', 'dur', 10);
      this.addFx({ type: 'puff', x: p.x, y: p.y, dur: 0.6 });
      this.log({ type: 'vanish', by: p.id, witnesses: wit.map((w) => w.p.id) });
      return true;
    }
    reappear(p) {
      p.invisUntil = 0;
      p.abilityCd = this.ro('fantasma', 'cd', 25);
      const wit = this.witnesses([p], [p.id]);
      for (const w of wit) if (w.p.brain) w.p.brain.onWitnessVanish(p.id, w.via);
      this.addFx({ type: 'puff', x: p.x, y: p.y, dur: 0.6 });
    }
    track(p, targetId) {
      if (p.special !== 'rastreador' || !p.alive || p.abilityCd > 0) return false;
      const tg = this.players[targetId];
      if (!tg || !tg.alive || tg === p || U.dist(p, tg) > 3.5) return false;
      p.trackTarget = targetId;
      p.trackUntil = this.t + this.ro('rastreador', 'dur', 30);
      p.abilityCd = this.ro('rastreador', 'cd', 45);
      this.log({ type: 'track', by: p.id, target: targetId });
      return true;
    }
    /* Anjo da guarda como no Among Us: o tripulante sem função que morre (abatido ou ejetado) tem a chance
       configurada de virar anjo, na ordem das mortes, até a quantidade máxima. */
    maybeAngel(p) {
      const cfg = (this.S.roles && this.S.roles.anjo) || {};
      if (!p || p.isImp || p.special || !(cfg.n > 0)) return false;
      if (this.players.filter((q) => q.special === 'anjo').length >= cfg.n) return false;
      if (!U.chance((cfg.chance == null ? 100 : cfg.chance) / 100)) return false;
      p.special = 'anjo';
      p.abilityCd = Math.min(10, this.ro('anjo', 'cd', 60));
      this.log({ type: 'angel', who: p.id });
      return true;
    }
    protect(p, targetId) {
      if (p.special !== 'anjo' || p.alive || p.abilityCd > 0 || p.isImp) return false;
      const tg = this.players[targetId];
      if (!tg || !tg.alive || U.dist(p, tg) > 4) return false;
      /* padrão do jogo original: escudo de 10s, recarga de 60s */
      tg.protectedUntil = this.t + this.ro('anjo', 'dur', 10);
      p.abilityCd = this.ro('anjo', 'cd', 60);
      this.log({ type: 'protect', by: p.id, target: targetId });
      if (this.ghosts) this.ghosts.onProtect(p, tg);
      return true;
    }

    /* ---------- tarefas ---------- */
    stationOfTask(task) {
      if (task.done) return null;
      return M.STATIONS[task.steps[task.step]];
    }
    taskAvailable(task) {
      if (task.done) return false;
      if (task.id === 'inspect' && task.step === 1 && this.t < task.readyAt) return false;
      return true;
    }
    completeStep(p, task) {
      if (task.done) return;
      if (task.id === 'inspect' && task.step === 0) task.readyAt = this.t + (task.def.wait || 45);
      task.step++;
      if (task.step >= task.steps.length) {
        task.done = true;
        if (!p.isImp) this.log({ type: 'task', by: p.id, task: task.id });
        if (p.special === 'cientista') p.battery = Math.min(this.ro('cientista', 'dur', 10), p.battery + 3);
      }
      if (task.def.visual === 'shields' && task.done) p.visual = { type: 'shields', until: this.t + 2.5 };
      this.say('onTaskProgress', p, task);
      if (!p.isImp) this.checkWin();
    }
    resetInspect(task) {
      task.step = 0;
      task.readyAt = 0;
    }
    taskProgress() {
      let total = 0, done = 0;
      for (const p of this.players) {
        if (p.isImp) continue;
        for (const tk of p.tasks) {
          total++;
          if (tk.done) done++;
        }
      }
      return { total, done, ratio: total ? done / total : 0 };
    }

    /* Alvo de "Usar" para um jogador (humano). */
    useTarget(p) {
      if (this.phase !== 'play' || p.inVent) return null;
      const near = (x, y, d) => U.d2(p.x, p.y, x, y) <= (d || USE_DIST);
      const s = this.sab;
      if (s && p.alive) {
        for (const st of this.sabStationsNeeded()) {
          const pos = M.SAB_STATIONS[st];
          if (near(pos.x, pos.y)) return { kind: 'sab', station: st, label: 'Consertar' };
        }
      } else if (s && !p.alive && !p.isImp) {
        /* fantasmas não consertam sabotagens */
      }
      if (!p.isImp) {
        for (const tk of p.tasks) {
          if (tk.done) continue;
          const st = M.STATIONS[tk.steps[tk.step]];
          if (near(st.x, st.y)) return { kind: 'task', task: tk, station: st, label: 'Tarefa' };
        }
      }
      if (p.alive && near(M.EMERGENCY.x, M.EMERGENCY.y, BUTTON_DIST)) return { kind: 'button', label: 'Emergência' };
      if (p.alive && near(M.SECURITY.x, M.SECURITY.y)) return { kind: 'cams', label: 'Câmeras' };
      if (near(M.ADMIN_TABLE.x, M.ADMIN_TABLE.y, 2.2)) return { kind: 'admin', label: 'Admin' };
      return null;
    }

    /* ---------- vitória ---------- */
    checkWin() {
      if (this.phase === 'ended' || this.phase === 'meeting') return;
      const alive = this.alivePlayers();
      const imp = alive.filter((p) => p.isImp).length;
      const crew = alive.length - imp;
      if (imp === 0) return this.end('crew', 'Todos os impostores foram eliminados.');
      if (imp >= crew) return this.end('impostor', 'Os impostores igualaram o número de tripulantes.');
      const tp = this.taskProgress();
      if (tp.total > 0 && tp.done >= tp.total) return this.end('crew', 'Todas as tarefas foram concluídas.');
    }
    end(winner, reason) {
      if (!this.headless) AU.Audio.ambience(null);
      if (this.phase === 'ended') return;
      this.phase = 'ended';
      this.winner = winner;
      this.endReason = reason;
      AU.Audio.alarm(false);
      this.log({ type: 'end', winner, reason });
      this.say('closeOverlays');
      this.say('onGameEnd', { winner, reason });
    }
  }

  AU.Game = Game;
  AU.Player = Player;
})();

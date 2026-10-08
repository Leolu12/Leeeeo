/* Modo online: pessoas de verdade jogando juntas (e com os bots), pelo link do jogo no claude.ai.

   Como funciona:
   - A "sala ao vivo" do claude.ai (capacidade room) liga quem está com o jogo aberto ao mesmo tempo. Cada partida tem
     uma sala própria com um código de 4 letras. O banco de dados (capacidade db) guarda a lista de salas abertas e o
     histórico das últimas partidas online.
   - Quem cria a sala é o anfitrião: a partida inteira roda no aparelho dele (regras, bots, IA das mentes). Os outros
     mandam a posição (o próprio corpo anda na hora, sem esperar) e as ações (matar, reportar, duto, tarefa, voto,
     chat); o anfitrião confere tudo pelas regras e devolve o estado da nave várias vezes por segundo.
   - Papel, função e tarefas de cada um vão criptografados só para a pessoa (ECDH + AES-GCM): quem só escuta a sala não
     descobre quem é impostor.
   - Comandos dos jogadores vão na "presença" de cada um (estado que a sala mantém e reenvia sozinha) e são confirmados
     pelo anfitrião; os acontecimentos do anfitrião têm número de série e quem perder algum pede de novo.
   Fora do claude.ai (arquivo aberto direto no navegador) não há servidor: o modo online avisa e fica desligado. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, C = AU.C, M = AU.Map;
  const h = U.h;
  const V = 1;

  /* ---------- utilidades ---------- */
  const b64 = (buf) => {
    const a = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  };
  const unb64 = (s) => {
    const bin = atob(s), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  };
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const newCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁠-⁯]/g, '').trim().slice(0, n || 24);
  const r2 = (x) => Math.round(x * 100) / 100;

  /* criptografia por jogador (quando o navegador tem WebCrypto) */
  const CRY = typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null;
  async function keyPair() {
    if (!CRY) return null;
    const kp = await CRY.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    const pub = b64(await CRY.exportKey('raw', kp.publicKey));
    return { kp, pub };
  }
  async function shared(mine, theirPub) {
    if (!CRY || !mine || !theirPub) return null;
    const pk = await CRY.importKey('raw', unb64(theirPub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return CRY.deriveKey({ name: 'ECDH', public: pk }, mine.kp.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(key, obj) {
    const txt = JSON.stringify(obj);
    if (!key) return { p: txt };
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await CRY.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(txt));
    return { iv: b64(iv), d: b64(ct) };
  }
  async function open(key, box) {
    if (box.p != null) return JSON.parse(box.p);
    if (!key) return null;
    const pt = await CRY.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.d));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---------- acesso às capacidades do claude.ai ---------- */
  /* erros da sala que valem para a página inteira (esta conta não conecta) */
  const TERMINAL = new Set(['not_granted', 'revoked', 'capability_disabled', 'capability_removed', 'transform_error']);
  const Net = {
    room: null,
    db: null,
    ready: null,
    state: 'checking',
    /* versão do jogo (aparece no diagnóstico: ajuda a saber se o amigo está com a página antiga) */
    version: 39,
    async init() {
      if (this.ready) return this.ready;
      this.ready = (async () => {
        const cl = typeof window !== 'undefined' ? window.claude : null;
        try {
          this.framed = window.top !== window;
        } catch (e) {
          this.framed = true;
        }
        if (!cl || typeof cl.use !== 'function') {
          this.state = 'off';
          this.why = 'fora';
          return false;
        }
        this.inClaude = true;
        const [room, db, perm] = await Promise.all(['room', 'db', 'permissions'].map((n) => new Promise((r) => r(cl.use(n))).catch(() => null)));
        this.db = db;
        if (perm) {
          try {
            this.perms = await perm.state();
          } catch (e) {
            this.perms = null;
          }
        }
        if (room) {
          /* a sala pode carregar e mesmo assim recusar esta conta (not_granted): espera a primeira resposta */
          await new Promise((res) => {
            let tm = 0;
            const done = () => {
              clearTimeout(tm);
              res();
            };
            tm = setTimeout(done, 4000);
            try {
              room.onConnection((c) => {
                this.conn = c;
                if (c) done();
              }, (e) => {
                this.roomErr = (e && e.code) || 'erro';
                this.conn = false;
                done();
              });
            } catch (e) {
              done();
            }
          });
          this.room = this.roomErr && TERMINAL.has(this.roomErr) ? null : room;
        }
        if (!this.room) this.why = !this.framed ? 'pagina' : this.perms && this.perms.room === 'denied' ? 'negada' : 'conta';
        this.state = this.room ? 'on' : 'off';
        return !!this.room;
      })();
      return this.ready;
    },
    /* o que dá para ver daqui sobre a conexão, em texto para copiar e mandar (sem nada pessoal) */
    diagText() {
      const yn = (v) => (v ? 'sim' : 'não');
      const L = ['Impostor a Bordo · versão ' + this.version];
      L.push('Dentro do claude.ai: ' + yn(this.inClaude) + ' · janela: ' + (this.framed ? 'dentro do claude.ai' : 'página própria'));
      L.push('Sala ao vivo: ' + (this.room ? 'disponível' : 'indisponível') + (this.why ? ' (' + this.why + ')' : ''));
      let peers = null;
      try {
        peers = this.room ? this.room.peers() : null;
      } catch (e) {
        peers = null;
      }
      let conn = this.conn;
      try {
        if (this.room) conn = this.room.connected();
      } catch (e) {
        /* sem resposta */
      }
      L.push('Conexão: ' + (conn ? 'conectado' : 'desconectado') + (this.roomErr ? ' · erro: ' + this.roomErr : ''));
      if (peers) {
        const me = peers.find((p) => p.isMe && p.sameTab);
        L.push('Pessoas com o jogo aberto agora: ' + peers.filter((p) => p.kind === 'viewer').length + ' · você é convidado de fora: ' + yn(me && me.guest));
        L.push('Salas abertas vistas: ' + this.listRooms().length);
      }
      L.push('Banco de dados: ' + (this.db ? 'disponível' : 'indisponível'));
      if (this.perms) L.push('Permissões: ' + (Object.keys(this.perms).map((k) => k + '=' + this.perms[k]).join(', ') || 'nenhuma'));
      if (this.lastErr) L.push('Último erro: ' + this.lastErr);
      const ua = navigator.userAgent || '';
      L.push('Navegador: ' + (/Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'outro') + (/Mobi|Android|iPhone|iPad/.test(ua) ? ' (celular)' : ''));
      return L.join('\n');
    },
    available() {
      return !!this.room;
    },
    /* salas abertas: anfitriões anunciam na presença da sala geral; o banco guarda a lista também */
    listRooms() {
      const out = new Map();
      if (this.room) {
        for (const p of this.room.peers()) {
          const pr = p.presence || {};
          if (pr.app !== 'au' || !pr.host || p.isMe) continue;
          const hh = pr.host;
          if (typeof hh.code !== 'string' || !/^[A-Z]{4}$/.test(hh.code)) continue;
          out.set(hh.code, { code: hh.code, name: clean(hh.name), n: +hh.n || 1, max: +hh.max || 10, st: hh.st === 'play' ? 'play' : 'lobby', live: true });
        }
      }
      for (const d of this.dbRooms || []) {
        if (out.has(d.code) || Date.now() - (d.at || 0) > 45000) continue;
        out.set(d.code, Object.assign({ live: false }, d));
      }
      return [...out.values()];
    },
    watchRooms(cb) {
      const offs = [];
      if (this.room) offs.push(this.room.onPeers(() => cb(), () => {}));
      if (this.db) {
        try {
          offs.push(this.db.collection('salas').onSnapshot((snap) => {
            this.dbRooms = snap.docs.map((d) => d.data()).filter((d) => d && /^[A-Z]{4}$/.test(d.code || '')).map((d) => ({ code: d.code, name: clean(d.name), n: +d.n || 1, max: +d.max || 10, st: d.st === 'play' ? 'play' : 'lobby', at: +d.at || 0 }));
            /* salas abandonadas (aba fechada sem sair): apaga as velhas, poucas por vez */
            this.pruned = this.pruned || new Set();
            let k = 0;
            for (const d of snap.docs) {
              const v = d.data() || {};
              if (k >= 5 || this.pruned.has(d.id) || Date.now() - (+v.at || 0) < 15 * 60000) continue;
              this.pruned.add(d.id);
              k++;
              this.db.doc('salas/' + d.id).delete().catch(() => {});
            }
            cb();
          }, () => {}));
        } catch (e) {
          /* banco indisponível: só a presença */
        }
      }
      return () => offs.forEach((f) => f && f());
    },
    async history() {
      if (!this.db) return [];
      try {
        const d = await this.db.doc('historico/ultimas').get();
        const v = d.exists ? d.data() : null;
        return v && Array.isArray(v.list) ? v.list.slice(-15).reverse() : [];
      } catch (e) {
        return [];
      }
    },
    async saveHistory(item) {
      if (!this.db) return;
      try {
        const ref = this.db.doc('historico/ultimas');
        const d = await ref.get();
        const list = d.exists && Array.isArray(d.data().list) ? d.data().list.slice(-29) : [];
        list.push(item);
        await ref.set({ list });
      } catch (e) {
        /* sem permissão de escrita (quem só pode ver): tudo bem */
      }
    },
    async publishRoom(info) {
      if (!this.db) return;
      try {
        if (info) await this.db.doc('salas/' + info.code).set(Object.assign({ at: Date.now() }, info));
      } catch (e) {
        /* idem */
      }
    },
    async unpublishRoom(code) {
      if (!this.db || !code) return;
      try {
        await this.db.doc('salas/' + code).delete();
      } catch (e) {
        /* idem */
      }
    },
  };

  /* ---------- estado público da nave (o anfitrião manda; todos aplicam) ---------- */
  /* quanto o amigo desenha os outros no passado: o intervalo entre estados (0,08 s, mais a folga do quadro) mais o
     atraso variável da rede, medido (ver applySnapshot) */
  const NET_DELAY = 0.13;
  const FL = { alive: 1, vent: 2, moving: 4, invis: 8, shield: 16, busy: 32, cams: 64, pop: 128, morph: 256, ejected: 512 };
  function snapshot(g) {
    const t = g.t;
    const pl = g.players.map((p) => {
      let f = 0;
      if (p.alive) f |= FL.alive;
      if (p.inVent) f |= FL.vent;
      if (p.moving) f |= FL.moving;
      if (p.invisUntil > t) f |= FL.invis;
      if (p.protectedUntil > t) f |= FL.shield;
      if (p.busy) f |= FL.busy;
      if (p.onCams) f |= FL.cams;
      if (p.popT != null && t - p.popT < 0.4) f |= FL.pop;
      if (p.morph && t - p.morph.t0 < 0.6) f |= FL.morph;
      if (p.ejected) f |= FL.ejected;
      return [r2(p.x), r2(p.y), p.facing, f, g.appearId(p), Math.round(p.walkT * 10) / 10, p.visual ? p.visual.type : 0, p.inVent || 0];
    });
    const s = g.sab;
    let sab = 0;
    if (s) {
      sab = { ty: s.type, t0: r2(s.t0) };
      if (s.timer != null) sab.tm = r2(s.timer);
      if (s.switches) sab.sw = s.switches.map((b) => (b ? 1 : 0));
      if (s.code) sab.cd = s.code;
      if (s.done) sab.dn = [s.done.A ? 1 : 0, s.done.B ? 1 : 0];
      if (s.hold) sab.hd = [r2(t - s.hold.A), r2(t - s.hold.B)];
      if (s.target != null) sab.tg = r2(s.target);
    }
    let dr = 0;
    M.DOORS.forEach((d, i) => {
      if (d.closed) dr |= 1 << i;
    });
    return {
      t: r2(t), ph: g.phase, pl,
      bd: g.bodies.filter((b) => !b.gone).map((b) => [b.id, b.pid, r2(b.x), r2(b.y), b.area, b.reported ? 1 : 0]),
      dr, sab, ll: r2(g.lightLevel), sc: r2(g.sabCd), ec: r2(g.emergencyCdUntil - t),
      pg: g.pings.map((q) => [r2(q.x), r2(q.y), r2(q.until - t), q.pid]),
      tp: (() => {
        const tp = g.taskProgress();
        return [tp.done, tp.total];
      })(),
    };
  }
  function applySnapshot(g, sn, me) {
    const t = sn.t;
    g.hostT = t;
    g.hostAt = performance.now();
    /* relógio do anfitrião visto daqui: segue o estado que chegou mais rápido (menos atraso de rede) e se ajusta
       devagar quando todos começam a atrasar */
    const off = t - g.hostAt / 1000;
    g.netOff = g.netOff == null || off > g.netOff ? off : g.netOff + (off - g.netOff) * 0.02;
    /* quanto este estado chegou atrasado em relação ao mais rápido; o pior recente (que esquece devagar) decide quanto
       desenhar os outros no passado: o suficiente para quase sempre ter o próximo estado na mão */
    g.netLate = Math.max(g.netOff - off, (g.netLate || 0) * 0.99);
    g.netDelayT = U.clamp(NET_DELAY + g.netLate, 0.15, 0.6);
    if (g.t < t - 0.5 || g.t > t + 0.5) g.t = t;
    sn.pl.forEach((a, i) => {
      const p = g.players[i];
      if (!p) return;
      const [x, y, facing, f, apId, walkT, vis, vent] = a;
      const wasAlive = p.alive;
      p.alive = !!(f & FL.alive);
      p.ejected = !!(f & FL.ejected);
      if (wasAlive && !p.alive && p.deathT == null) p.deathT = t;
      p.inVent = vent || null;
      p.netVis = vis || null;
      p.visual = vis ? { type: vis, until: g.t + 0.6 } : null;
      p.protectedUntil = f & FL.shield ? g.t + 1 : 0;
      p.onCams = !!(f & FL.cams);
      p.busy = f & FL.busy ? p.busy || { net: true } : p.netOwnBusy || null;
      if (f & FL.pop && (p.popT == null || g.t - p.popT > 0.5)) p.popT = g.t;
      if (apId !== p.id) p.shiftAs = apId;
      else if (p.shiftAs != null) p.shiftAs = null;
      if (f & FL.morph && !p.morph) p.morph = { t0: g.t, color: p.color, hat: p.hat, visor: p.visor };
      if (!(f & FL.morph)) p.morph = null;
      p.invisUntil = f & FL.invis ? g.t + 1 : 0;
      if (p === me) {
        /* o próprio corpo anda aqui. A posição que volta do anfitrião é de um instante atrás (ida e volta pela rede:
           300 a 500 ms, 1,5 a 2,6 tiles andando): comparar com a posição de agora puxava o personagem para trás
           o tempo todo. Só corrige se ela não bate com nenhum ponto por onde passei nos últimos 2 s, ou seja, quando
           o anfitrião mudou mesmo a minha posição (duto, reunião, porta que fechou na frente) */
        const hist = g.netMyHist || [];
        let near = U.d2(p.x, p.y, x, y);
        for (let k = hist.length - 1; k >= 0 && near > 0.9; k--) near = Math.min(near, U.d2(hist[k][1], hist[k][2], x, y));
        if (near > 0.9 || p.inVent) {
          p.x = x;
          p.y = y;
          g.netMyHist = [];
        }
        return;
      }
      /* os outros: guarda o ponto com o relógio do anfitrião; o quadro desenha um pouco no passado, entre dois pontos
         conhecidos (ver Client.update) */
      const buf = p.netBuf || (p.netBuf = []);
      if (!buf.length || t > buf[buf.length - 1][0]) buf.push([t, x, y, f & FL.moving ? 1 : 0, facing]);
      if (buf.length > 12) buf.shift();
      if (p.netInit == null) {
        p.x = x;
        p.y = y;
        p.facing = facing;
        p.netInit = 1;
      }
      if (Math.abs(walkT - p.walkT) > 1) p.walkT = walkT;
    });
    /* corpos */
    const keep = new Set();
    for (const [id, pid, x, y, area, rep] of sn.bd) {
      keep.add(id);
      let b = g.bodies.find((q) => q.id === id);
      if (!b) {
        b = { id, pid, x, y, t: g.t, area, reported: !!rep, gone: false };
        g.bodies.push(b);
      }
      b.reported = !!rep;
    }
    for (const b of g.bodies) if (!keep.has(b.id)) b.gone = true;
    /* portas: anima quando muda */
    M.DOORS.forEach((d, i) => {
      const c = !!(sn.dr & (1 << i));
      if (c !== d.closed) {
        d.closed = c;
        d.animT = g.t;
      }
    });
    /* sabotagem */
    const before = g.sab ? g.sab.type + g.sab.t0 : null;
    if (sn.sab) {
      const s = g.sab && g.sab.type === sn.sab.ty && g.sab.t0 === sn.sab.t0 ? g.sab : { type: sn.sab.ty, t0: sn.sab.t0 };
      if (sn.sab.tm != null) s.timer = sn.sab.tm;
      if (sn.sab.sw) s.switches = sn.sab.sw.map(Boolean);
      if (sn.sab.cd) s.code = sn.sab.cd;
      if (sn.sab.dn) s.done = { A: !!sn.sab.dn[0], B: !!sn.sab.dn[1] };
      if (sn.sab.hd) s.hold = { A: g.t - sn.sab.hd[0], B: g.t - sn.sab.hd[1] };
      if (sn.sab.tg != null) s.target = sn.sab.tg;
      g.sab = s;
    } else g.sab = null;
    const after = g.sab ? g.sab.type + g.sab.t0 : null;
    if (before !== after) {
      if (g.sab) {
        g.say('onSabotage', g.sab);
        g.sfx(g.sab.type === 'lights' ? 'lightsOff' : 'sabotage');
        AU.Audio.alarm(g.sab.type === 'reactor' || g.sab.type === 'o2');
      } else if (before) {
        g.say('onSabFixed', { type: before.replace(/[\d.-]+$/, '') });
        g.sfx('fixed');
        AU.Audio.alarm(false);
      }
    }
    g.lightLevel = sn.ll;
    g.sabCd = sn.sc;
    g.emergencyCdUntil = g.t + sn.ec;
    g.pings = sn.pg.map(([x, y, left, pid]) => ({ x, y, until: g.t + left, pid }));
    g.netTasks = sn.tp;
  }

  /* dados que só o próprio jogador recebe (criptografados) */
  function privOf(g, p) {
    return {
      slot: p.id,
      role: p.role,
      special: p.special,
      mates: p.isImp ? g.players.filter((q) => q.isImp && q !== p).map((q) => q.id) : [],
      tasks: p.tasks.map((tk) => [tk.id, tk.steps, tk.step, tk.done ? 1 : 0, tk.readyAt ? r2(tk.readyAt - g.t) : 0]),
      el: p.emergencyLeft,
      kc: r2(p.killCd),
      ac: r2(p.abilityCd),
      bat: r2(p.battery),
      tt: p.trackTarget,
      tu: p.trackUntil ? r2(p.trackUntil - g.t) : 0,
      su: p.shiftAs != null ? r2(p.shiftUntil - g.t) : 0,
      iu: p.invisUntil > g.t ? r2(p.invisUntil - g.t) : 0,
      pr: p.protectTarget != null ? p.protectTarget : null,
    };
  }
  function applyPriv(g, me, pv) {
    if (!pv || !me) return;
    me.role = pv.role;
    me.special = pv.special || null;
    for (const q of g.players) if (q !== me) q.role = pv.mates.includes(q.id) ? 'impostor' : q.roleKnown || 'crew';
    const old = new Map(me.tasks.map((tk) => [tk.id, tk]));
    me.tasks = pv.tasks.map(([id, steps, step, done, ready]) => {
      const tk = old.get(id) || { id, def: M.TASKS[id] };
      tk.def = M.TASKS[id];
      tk.steps = steps;
      /* o passo local pode estar à frente (já mandei, o anfitrião ainda não confirmou) */
      if (!(tk.netAhead && tk.step > step && performance.now() - tk.netAhead < 4000)) {
        tk.step = step;
        tk.done = !!done;
        tk.netAhead = 0;
      }
      tk.readyAt = ready ? g.t + ready : 0;
      return tk;
    });
    me.emergencyLeft = pv.el;
    me.killCd = pv.kc;
    me.abilityCd = pv.ac;
    me.battery = pv.bat;
    me.trackTarget = pv.tt;
    me.trackUntil = pv.tu ? g.t + pv.tu : 0;
    if (pv.su) me.shiftUntil = g.t + pv.su;
    if (pv.iu) me.invisUntil = g.t + pv.iu;
  }

  /* =================================================================================================== */
  /* Anfitrião */
  class Host {
    constructor(code) {
      this.code = code;
      this.peers = new Map(); /* peer -> {slot, pres, key, ack, last} */
      this.seq = 0;
      this.ring = [];
      this.sentAt = new Map();
      this.snN = 0;
      this.g = null;
      this.snapT = 0;
      this.privT = 0;
      this.lastPriv = new Map();
      this.closed = false;
      this.onChange = null;
    }
    async start() {
      this.keys = await keyPair();
      this.gr = await Net.room.join('au-' + this.code.toLowerCase());
      /* só quem pode mandar eventos (acesso de colaborador ou mais) consegue rodar a partida: testa antes de abrir
         (o teste tem número 0, que os amigos ignoram) */
      try {
        await this.gr.emit('ev', { s: 0, k: 'ping' });
      } catch (e) {
        if (e && e.code === 'not_permitted') {
          this.gr.leave().catch(() => {});
          throw e;
        }
      }
      this.unsub = [
        this.gr.onPeers((ch) => this.onPeers(ch), () => {}),
      ];
      this.setPres();
      this.advertise();
      this.advT = setInterval(() => this.advertise(), 10000);
    }
    nick() {
      return clean(AU.Menu.S.profile.name || 'Anfitrião');
    }
    setPres(extra) {
      const pres = Object.assign({ app: 'au', v: V, role: 'host', code: this.code, hpk: this.keys ? this.keys.pub : null, st: this.g ? 'play' : 'lobby', nick: this.nick() }, extra || {});
      this.gr.presence(pres).catch(() => {});
    }
    /* anuncia a sala (presença da sala geral + banco) só quando algo muda, ou a cada ~10 s. Antes isto rodava a cada
       atualização de qualquer amigo (15 vezes por segundo cada um): estourava o limite de envios da sala, o estado da
       partida ficava esperando na fila e todo mundo via o jogo travar */
    advertise() {
      if (this.closed) return;
      const info = { code: this.code, name: this.nick(), n: 1 + this.players().length, max: AU.Menu.S.room.players, st: this.g ? 'play' : 'lobby' };
      const key = JSON.stringify(info), now = performance.now();
      if (key === this.advKey && now - (this.advAt || 0) < 9000) return;
      this.advKey = key;
      this.advAt = now;
      Net.room.presence({ app: 'au', v: V, host: info }).catch(() => {});
      Net.publishRoom(info);
    }
    players() {
      return [...this.peers.values()].filter((x) => x.pres && x.pres.role === 'cl');
    }
    onPeers(ch) {
      let changed = ch.left.length > 0;
      for (const p of ch.peers) {
        if (p.isMe || p.kind !== 'viewer') continue;
        const pr = p.presence || {};
        if (pr.app !== 'au' || pr.role !== 'cl') continue;
        let e = this.peers.get(p.peer);
        if (!e) {
          if (this.g) continue; /* partida já começou: não entra no meio */
          if (this.players().length >= AU.Menu.S.room.players - 1) continue;
          e = { peer: p.peer, ack: 0, slot: null, key: null };
          this.peers.set(p.peer, e);
          changed = true;
        }
        if (!this.g && e.pres && e.pres.nick !== pr.nick) changed = true;
        e.pres = pr;
        e.seen = performance.now();
        if (pr.pk && pr.pk !== e.pk) {
          e.pk = pr.pk;
          shared(this.keys, pr.pk).then((k) => (e.key = k)).catch(() => (e.key = null));
        }
      }
      for (const p of ch.left) {
        const e = this.peers.get(p.peer);
        if (!e) continue;
        this.peers.delete(p.peer);
        if (this.g && e.slot != null) this.dropPlayer(e.slot, true);
      }
      if (!changed) return;
      this.advertise();
      if (this.onChange) this.onChange();
    }
    /* amigo saiu no meio: um bot assume o lugar dele */
    dropPlayer(slot, left) {
      const g = this.g, p = g && g.players[slot];
      if (!p || !p.remote) return;
      p.remote = null;
      p.busy = null;
      p.onCams = p.onAdmin = false;
      p.brain = new AU.Brain(g, p);
      if (g.minds && g.minds.adopt) g.minds.adopt(p);
      /* no meio de uma reunião: o bot se prepara e vota no lugar dele */
      const mt = g.meeting;
      if (mt && !mt.closed && p.alive) {
        try {
          if (p.brain.mStart) p.brain.mStart(mt);
        } catch (err) {
          if (window.console) console.warn('preparo do bot substituto falhou', err);
        }
        if (mt.phase === 'voting' && mt.votes[p.id] === undefined) mt.voteAt[p.id] = mt.t + U.rf(1.5, 4);
      }
      if (left) g.say('toast', p.name + ' saiu; um bot assumiu o lugar.');
    }
    /* monta o elenco: você, os amigos e os bots */
    roster() {
      const S = AU.Menu.S;
      const base = AU.Menu.buildRoster(S);
      const used = new Set([base[0].color]);
      let slot = 1;
      for (const e of this.players()) {
        if (slot >= base.length) break;
        const pr = e.pres;
        const lk = pr.look || {};
        let color = C.COLOR[lk.color] ? lk.color : null;
        if (!color || used.has(color)) color = C.COLORS.map((c) => c.id).find((c) => !used.has(c));
        used.add(color);
        base[slot] = { name: clean(pr.nick) || 'Amigo ' + slot, color, hat: C.HATS.some((x) => x.id === lk.hat) ? lk.hat : 'nenhum', visor: C.VISORS.some((x) => x.id === lk.visor) ? lk.visor : 'classico', pet: C.PETS.some((x) => x.id === lk.pet) ? lk.pet : 'nenhum', remote: e.peer };
        e.slot = slot;
        slot++;
      }
      /* bots sem repetir cor de ninguém */
      for (let i = 1; i < base.length; i++) {
        if (base[i].remote) continue;
        if (used.has(base[i].color)) base[i].color = C.COLORS.map((c) => c.id).find((c) => !used.has(c)) || base[i].color;
        used.add(base[i].color);
      }
      return base;
    }
    /* a partida começou no anfitrião */
    attach(g) {
      this.g = g;
      g.net = this;
      g.netHost = this;
      this.setPres();
      this.advertise();
      const pub = g.players.map((p) => ({ name: p.name, color: p.color, hat: p.hat, visor: p.visor, pet: p.pet, remote: p.remote ? 1 : 0 }));
      const slots = {};
      for (const e of this.players()) if (e.slot != null) slots[e.peer] = e.slot;
      const S = U.clone(g.S);
      this.emit('start', { S, roster: pub, slots, nImp: g.players.filter((p) => p.isImp).length, hpk: this.keys ? this.keys.pub : null });
      this.sendPriv(true);
    }
    emit(k, d) {
      const ev = { s: ++this.seq, k, d };
      this.ring.push(ev);
      this.sentAt.set(ev.s, performance.now());
      if (this.ring.length > 500) this.sentAt.delete(this.ring.shift().s);
      this.gr.emit('ev', ev).catch(() => {});
    }
    /* ---------- a cada quadro do jogo ---------- */
    tick(dt) {
      const g = this.g;
      if (!g || this.closed) return;
      const now = performance.now();
      for (const e of this.peers.values()) {
        if (e.slot == null || !e.pres) continue;
        const p = g.players[e.slot];
        if (!p || !p.remote) continue;
        this.movePlayer(p, e.pres, dt);
        this.runCommands(p, e);
        /* perdeu acontecimentos: manda de novo os que faltam. Só os que já deviam ter chegado (mandados há mais de
           0,8 s): o recibo do amigo vem pela presença dele, com atraso, e reenviar o que ainda está a caminho dobrava
           o tráfego à toa */
        const have = +e.pres.have || 0;
        if (have < this.seq && now - (e.resent || 0) > 900) {
          const first = this.ring.find((x) => x.s > have);
          const miss = this.ring.filter((x) => x.s > have && now - (this.sentAt.get(x.s) || 0) > 800).slice(0, 20);
          if (miss.length) {
            e.resent = now;
            if (first && first.s > have + 1) this.emit('resync', { to: e.peer });
            for (const ev of miss) this.gr.emit('ev', ev).catch(() => {});
          }
        }
      }
    }
    /* no fim do quadro, quando todo mundo (bots, você, os amigos) já andou: o estado da nave e os dados secretos.
       Mandar o estado no meio do quadro (antes de os bots andarem) fazia todo bot aparecer parado para os amigos,
       deslizando sem mexer as pernas e sem som de passo */
    post(dt) {
      const g = this.g;
      if (!g || this.closed) return;
      this.snapT -= dt;
      if (this.snapT <= 0) {
        this.snapT = 0.08;
        const acks = {};
        for (const e of this.peers.values()) acks[e.peer] = e.ack;
        this.setPres({ sn: snapshot(g), ack: acks, seq: this.seq, n: ++this.snN });
      }
      this.privT -= dt;
      if (this.privT <= 0) {
        this.privT = 0.25;
        this.sendPriv(false);
      }
    }
    /* dados secretos de cada amigo (papel, tarefas, recargas), cifrados para ele. Todos os que mudaram vão juntos num
       envio só (em vez de um por amigo) */
    async sendPriv(force) {
      if (this.privBusy) return;
      this.privBusy = true;
      const g = this.g, out = [];
      try {
        for (const e of this.peers.values()) {
          if (e.slot == null) continue;
          const p = g.players[e.slot];
          if (!p) continue;
          const pv = privOf(g, p);
          const key = JSON.stringify(Object.assign({}, pv, { kc: Math.ceil(pv.kc), ac: Math.ceil(pv.ac), bat: Math.round(pv.bat), tu: 0, su: 0, iu: 0 }));
          const last = this.lastPriv.get(e.peer);
          if (!force && last && last.k === key && performance.now() - last.at < 3000) continue;
          try {
            const box = await seal(e.key, pv);
            this.lastPriv.set(e.peer, { k: key, at: performance.now() });
            out.push(Object.assign({ to: e.peer }, box));
          } catch (err) {
            /* tenta de novo no próximo ciclo */
            this.lastPriv.delete(e.peer);
          }
        }
        /* até ~3,4 KB por envio (o limite da sala é 4 KB) */
        let pack = [], size = 0;
        for (const b of out) {
          const n = JSON.stringify(b).length;
          if (pack.length && size + n > 3400) {
            this.emit('pvs', { list: pack });
            pack = [];
            size = 0;
          }
          pack.push(b);
          size += n + 1;
        }
        if (pack.length) this.emit('pvs', { list: pack });
      } finally {
        this.privBusy = false;
      }
    }
    /* posição que o amigo mandou: aceita se dava para chegar lá andando no tempo que passou (sem atravessar parede);
       longe demais, anda até o limite em linha reta, ou fica onde está (o aparelho dele é corrigido pelo estado).
       A posição aceita é um alvo: o boneco desliza até ela a cada quadro. A presença chega ~15 vezes por segundo e o
       jogo roda a 60; pulando direto para ela, aqui o amigo andava aos trancos e as pernas piscavam entre andar e
       parado (e isso ia no estado para os outros) */
    movePlayer(p, pr, dt) {
      const g = this.g;
      if (g.phase !== 'play' || p.inVent) {
        p.netLastT = g.t;
        p.netAx = null;
        return;
      }
      /* o jogo mudou a posição por conta própria (saiu do duto, matou e foi para o corpo, reunião): recomeça dali */
      if (p.netAx == null || p.x !== p.netSx || p.y !== p.netSy) {
        /* o jogo levou o amigo para longe: as posições que ele mandou antes de saber disso ainda estão chegando e o
           puxariam de volta. Espera o aparelho dele chegar ao lugar novo (no máximo 2 s) */
        if (p.netAx != null && U.d2(p.x, p.y, p.netSx, p.netSy) > 1) p.netHold = g.t + 2;
        p.netAx = p.x;
        p.netAy = p.y;
      }
      /* o amigo manda a posição e o rastro do último segundo; valida trecho por trecho, a partir do ponto do rastro
         mais perto de onde ele está aqui: cada pedacinho sem atravessar parede e a soma dentro da velocidade. Validar
         só a reta até o último ponto recusava a curva numa esquina quando as posições chegavam juntas (rede lenta) e
         deixava o amigo para trás; e um passo curto atravessando parede fina passava */
      const pos = Array.isArray(pr.pos) ? pr.pos : null;
      const x = pos ? +pos[0] : NaN, y = pos ? +pos[1] : NaN;
      const okPt = (qx, qy) => isFinite(qx) && isFinite(qy) && qx >= 0 && qy >= 0 && qx <= M.W && qy <= M.H;
      let fresh = okPt(x, y);
      if (fresh && p.netHold) {
        if (g.t < p.netHold && U.d2(p.netAx, p.netAy, x, y) > 1.5) fresh = false;
        else p.netHold = 0;
      }
      if (fresh) {
        const ghost = !p.alive, ax = p.netAx, ay = p.netAy;
        const pts = [];
        if (Array.isArray(pr.tr)) for (const q of pr.tr.slice(-20)) if (Array.isArray(q) && okPt(+q[0], +q[1])) pts.push([+q[0], +q[1]]);
        pts.push([x, y]);
        let from = pts.length - 1, best = Infinity;
        for (let i = 0; i < pts.length; i++) {
          const d = U.d2(ax, ay, pts[i][0], pts[i][1]);
          if (d < best) {
            best = d;
            from = i;
          }
        }
        if (best > 1.2) from = pts.length - 1;
        const since = Math.min(1.5, Math.max(dt, g.t - (p.netLastT == null ? g.t - dt : p.netLastT)));
        const allowed = g.speedOf(p) * since * 1.35 + 0.35;
        /* a mesma colisão do movimento (o teste de linha do mapa de navegação tem folga maior perto da parede e
           recusava quem anda encostado nela), amostrada ao longo do trecho. Um passo curto que raspa uma quina vale
           se o ponto final é um lugar onde dá para ficar (o movimento desliza na parede eixo a eixo) */
        /* a posição viaja arredondada em 0,01: encostado na parede, o arredondamento pode pôr o corpo um fio dentro
           dela. Acha o ponto válido mais perto (até 0,02 de distância) */
        const NUDGE = [[0, 0], [0.012, 0], [-0.012, 0], [0, 0.012], [0, -0.012], [0.012, 0.012], [-0.012, 0.012], [0.012, -0.012], [-0.012, -0.012]];
        const spot = (qx, qy) => {
          for (const [ox, oy] of NUDGE) if (g.canStand(qx + ox, qy + oy, false)) return [qx + ox, qy + oy];
          return null;
        };
        const free = (x0, y0, x1, y1) => {
          if (ghost) return g.canStand(x1, y1, true) ? [x1, y1] : null;
          const q = spot(x1, y1);
          if (!q) return null;
          const d = U.d2(x0, y0, q[0], q[1]), n = Math.max(1, Math.ceil(d / 0.2));
          let ok = true;
          for (let k = 1; k < n && ok; k++) ok = !!spot(x0 + ((q[0] - x0) * k) / n, y0 + ((q[1] - y0) * k) / n);
          return ok || d <= 0.6 ? q : null;
        };
        let cx = ax, cy = ay, used = 0, moved = false;
        for (let i = from; i < pts.length; i++) {
          const [qx, qy] = pts[i];
          const seg = U.d2(cx, cy, qx, qy);
          if (seg < 0.002) continue;
          if (used + seg > allowed) {
            /* passou do que dava para andar: vai até o limite nesse trecho */
            const k = (allowed - used) / seg, f = k > 0.05 ? free(cx, cy, cx + (qx - cx) * k, cy + (qy - cy) * k) : null;
            if (f) {
              cx = f[0];
              cy = f[1];
              moved = true;
            }
            break;
          }
          const f = free(cx, cy, qx, qy);
          if (!f) break;
          cx = f[0];
          cy = f[1];
          used += seg;
          moved = true;
        }
        if (moved) {
          p.netAx = cx;
          p.netAy = cy;
          p.netLastT = g.t;
        } else if (U.d2(ax, ay, x, y) < 0.002) p.netLastT = g.t;
      }
      /* desliza até o alvo (um pouco mais rápido que a passada, para não ficar para trás; atrasado, recupera). Entre
         uma posição e outra o boneco chega antes da próxima: segue "andando" um instante, sem a perna parar e voltar */
      const dx = p.netAx - p.x, dy = p.netAy - p.y, dd = Math.hypot(dx, dy);
      if (dd > 0.002) {
        /* fica cerca de um pacote atrás do alvo (~0,08 s de caminhada): mais longe, acelera; mais perto, freia. Assim
           o boneco não chega antes da próxima posição e para (a rede não entrega no compasso certo) */
        const sp = g.speedOf(p), cushion = sp * 0.12;
        const want = sp * U.clamp(dd / cushion, 0.5, 3);
        p.netRate = p.netRate == null ? want : p.netRate + (want - p.netRate) * Math.min(1, dt * 5);
        const k = Math.min(1, (Math.max(p.netRate, sp * 0.35) * dt) / dd);
        if (Math.abs(dx) > 0.01) p.facing = dx < 0 ? -1 : 1;
        p.x += dx * k;
        p.y += dy * k;
        p.netWalkUntil = g.t + 0.14;
      }
      if (dd > 0.002 || g.t < (p.netWalkUntil || 0)) {
        p.moving = true;
        p.walkT += dt;
        g.footstep(p);
      }
      p.netSx = p.x;
      p.netSy = p.y;
      const f = pr.f || {};
      p.onCams = !!f.cams && p.alive && U.d2(p.x, p.y, M.SECURITY.x, M.SECURITY.y) < 3;
      p.onAdmin = !!f.admin && U.d2(p.x, p.y, M.ADMIN_TABLE.x, M.ADMIN_TABLE.y) < 3;
      p.busy = f.busy ? { task: f.busy, until: g.t + 1, net: true } : null;
      if (p.alive && (f.hold === 'A' || f.hold === 'B')) {
        const st = M.SAB_STATIONS['reactor' + f.hold];
        if (st && U.d2(p.x, p.y, st.x, st.y) < 2.4) g.reactorHold(p, f.hold);
      }
      if (f.vis && g.S.rules.visualTasks && !p.isImp) p.visual = { type: f.vis, until: g.t + 0.4 };
    }
    /* ações pedidas pelo amigo, na ordem, cada uma uma vez só */
    runCommands(p, e) {
      const list = Array.isArray(e.pres.cmd) ? e.pres.cmd : [];
      for (const c of list) {
        if (!Array.isArray(c)) continue;
        const [seq, k, a] = c;
        if (!(seq > e.ack)) continue;
        e.ack = seq;
        /* a ação vale onde o amigo está de verdade (a última posição validada), não onde o boneco desenhado aqui
           vem deslizando um pouco atrás */
        const ox = p.x, oy = p.y, ax = p.netAx, ay = p.netAy;
        const atA = ax != null && !p.inVent;
        if (atA) {
          p.x = ax;
          p.y = ay;
        }
        try {
          this.exec(p, k, a);
        } catch (err) {
          if (window.console) console.warn('comando online falhou', k, err);
        }
        /* a ação não mudou o lugar dele (duto, abate): o desenho continua de onde estava */
        if (atA && p.x === ax && p.y === ay) {
          p.x = ox;
          p.y = oy;
        }
      }
    }
    exec(p, k, a) {
      const g = this.g, mt = g.meeting;
      const P = (id) => (Number.isInteger(id) ? g.players[id] : null);
      const near = (st) => U.d2(p.x, p.y, M.SAB_STATIONS[st].x, M.SAB_STATIONS[st].y) < 2.4;
      switch (k) {
        case 'kill': {
          const v = P(a);
          if (v && g.phase === 'play') g.tryKill(p, v);
          break;
        }
        case 'report': {
          const b = g.bodyInReach(p);
          if (b && g.phase === 'play') g.tryReport(p, b);
          break;
        }
        case 'button':
          if (g.phase === 'play' && g.nearButton(p)) g.tryEmergency(p);
          break;
        case 'vin': {
          const v = g.nearestVent(p);
          if (v && g.phase === 'play') g.enterVent(p, v);
          break;
        }
        case 'vout':
          if (p.inVent) g.exitVent(p);
          break;
        case 'vto':
          if (p.inVent && typeof a === 'string' && M.VENT[a]) g.ventTo(p, a);
          break;
        case 'sab':
          if (['lights', 'comms', 'reactor', 'o2'].includes(a)) g.sabotage(a, p);
          break;
        case 'doors':
          if (M.DOOR_ROOMS.includes(a) && p.isImp && g.doorReady(a)) g.closeDoors(a, p);
          break;
        case 'step': {
          const tk = Array.isArray(a) ? p.tasks.find((x) => x.id === a[0]) : null;
          if (!tk || tk.done || tk.step !== a[1] || !g.taskAvailable(tk)) break;
          const st = M.STATIONS[tk.steps[tk.step]];
          if (st && U.d2(p.x, p.y, st.x, st.y) <= 2.4) g.completeStep(p, tk);
          break;
        }
        case 'rinsp': {
          const tk = p.tasks.find((x) => x.id === a);
          if (tk) g.resetInspect(tk);
          break;
        }
        /* sabotagem: só vivo conserta (como no jogo local), e perto do painel */
        case 'lt':
          if (p.alive && Number.isInteger(a) && a >= 0 && a < 5 && near('lights')) g.fixLightsToggle(a, p);
          break;
        case 'o2':
          if (p.alive && Array.isArray(a) && (a[0] === 'A' || a[0] === 'B') && near('o2' + a[0])) g.o2Enter(a[0], String(a[1]).slice(0, 5), p);
          break;
        case 'comms':
          if (p.alive && near('comms')) g.fixComms(p);
          break;
        case 'shift': {
          const q = P(a);
          if (q) g.shapeshift(p, q.id);
          break;
        }
        case 'unshift':
          g.unshift(p);
          break;
        case 'vanish':
          g.vanish(p);
          break;
        case 'appear':
          if (p.invisUntil > g.t) g.reappear(p);
          break;
        case 'track': {
          const q = P(a);
          if (q) g.track(p, q.id);
          break;
        }
        case 'protect': {
          const q = P(a);
          if (q) g.protect(p, q.id);
          break;
        }
        case 'say':
          if (mt && typeof a === 'string') mt.remoteSay(p, clean(a, 160));
          break;
        case 'vote':
          if (mt && mt.phase === 'voting' && p.alive && (a === 'skip' || (P(a) && P(a).alive))) mt.castVote(p.id, a);
          break;
        default:
          break;
      }
    }
    /* ---------- acontecimentos do jogo que todos precisam ver ---------- */
    fx(f) {
      this.emit('fx', { ty: f.type, x: r2(f.x), y: r2(f.y), ox: f.ox == null ? undefined : r2(f.ox), oy: f.oy == null ? undefined : r2(f.oy), c: f.color, fa: f.facing, ht: f.hat, vs: f.visor, sd: f.seed, du: f.dur, w: f.who });
    }
    meeting(mt) {
      const info = mt.info;
      this.emit('meet', { kind: info.kind, caller: info.caller, body: info.body ? { pid: info.body.pid, area: info.body.area } : null, index: info.index, alive: mt.alive.slice() });
    }
    msg(m) {
      this.emit('msg', { from: m.from, text: m.text, gh: m.ghost ? 1 : 0 });
    }
    vote(voter) {
      this.emit('vote', { v: voter });
    }
    result(r) {
      this.emit('res', { ej: r.ejected, tie: r.tie ? 1 : 0, skip: r.skip, counts: r.counts, votes: r.votes });
    }
    meetingEnd(result) {
      this.emit('mend', { ej: result && result.ejected != null ? result.ejected : null });
    }
    end(g) {
      const roles = g.players.map((p) => [p.role, p.special || 0, p.alive ? 1 : 0]);
      this.emit('end', { w: g.winner, r: g.endReason, roles });
      Net.saveHistory({ at: Date.now(), code: this.code, winner: g.winner, reason: g.endReason, players: g.players.map((p) => ({ n: p.name, c: p.color, r: p.role, h: p.isHuman || p.remote ? 1 : 0, a: p.alive ? 1 : 0 })) });
      Net.unpublishRoom(this.code);
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      clearInterval(this.advT);
      for (const u of this.unsub || []) u && u();
      if (this.gr) this.gr.leave().catch(() => {});
      if (Net.room) Net.room.presence({ host: null }).catch(() => {});
      Net.unpublishRoom(this.code);
    }
  }

  /* =================================================================================================== */
  /* Amigo (cliente) */
  class Client {
    constructor(code) {
      this.code = code;
      this.cmdSeq = 0;
      this.cmds = [];
      this.have = 0;
      this.buf = new Map();
      this.hostPeer = null;
      this.g = null;
      this.closed = false;
      this.presT = 0;
      this.flags = {};
      this.onChange = null;
      this.onStart = null;
      this.onLeave = null;
      this.privQueue = [];
    }
    async start() {
      this.keys = await keyPair();
      /* o amigo não manda eventos (posição e ações vão na presença, que qualquer um pode): entra com qualquer nível
         de acesso, inclusive Leitor */
      this.gr = await Net.room.join('au-' + this.code.toLowerCase());
      this.unsub = [
        this.gr.onPeers((ch) => this.onPeers(ch), () => {}),
        this.gr.on('ev', (m) => this.onEvent(m), () => {}),
      ];
      this.setPres();
    }
    setPres() {
      const S = AU.Menu.S;
      const h0 = this.g && this.g.human;
      const pres = {
        app: 'au', v: V, role: 'cl', nick: clean(S.profile.name || 'Jogador'),
        look: { color: S.profile.color, hat: S.profile.hat, visor: S.profile.visor, pet: S.profile.pet },
        pk: this.keys ? this.keys.pub : null,
        have: this.have,
        cmd: this.cmds.slice(-12),
        pos: h0 ? [r2(h0.x), r2(h0.y)] : null,
        tr: this.trail || [],
        f: this.flags,
      };
      this.gr.presence(pres).catch(() => {});
    }
    cmd(k, a) {
      this.cmds.push([++this.cmdSeq, k, a == null ? null : a]);
      this.setPres();
    }
    onPeers(ch) {
      for (const p of ch.peers) {
        const pr = p.presence || {};
        if (pr.app === 'au' && pr.role === 'host') {
          if (this.hostPeer !== p.peer) {
            this.hostPeer = p.peer;
            if (pr.hpk && pr.hpk !== this.hpk) {
              this.hpk = pr.hpk;
              shared(this.keys, pr.hpk).then((k) => {
                this.key = k;
                this.flushPriv();
              }).catch(() => (this.key = null));
            }
          }
          this.hostPres = pr;
          this.onHostPres(pr);
        }
      }
      if (this.hostPeer && ch.left.some((p) => p.peer === this.hostPeer)) {
        this.hostPeer = null;
        if (this.onLeave) this.onLeave('O anfitrião saiu da sala.');
        this.close();
        return;
      }
      if (this.onChange) this.onChange();
    }
    onHostPres(pr) {
      /* confirmações: tira da lista o que o anfitrião já fez */
      const ack = pr.ack && this.gr ? pr.ack[this.myPeer()] : null;
      if (ack != null) this.cmds = this.cmds.filter((c) => c[0] > ack);
      /* a presença do anfitrião chega de novo sempre que QUALQUER um muda a sua (cada amigo, 15 vezes por segundo):
         só aplica um estado novo. Reaplicar o mesmo estado velho puxava o relógio do anfitrião para trás e os outros
         passavam a ser desenhados cada vez mais atrasados */
      if (pr.n != null && pr.n === this.snN) return;
      this.snN = pr.n;
      if (pr.sn && this.g && this.g.phase !== 'ended') applySnapshot(this.g, pr.sn, this.g.human);
    }
    myPeer() {
      if (this.mePeer) return this.mePeer;
      const me = this.gr.peers().find((p) => p.isMe && p.sameTab);
      if (me) this.mePeer = me.peer;
      return me ? me.peer : null;
    }
    onEvent(m) {
      if (m.isMe || (this.hostPeer && m.peer !== this.hostPeer)) return;
      const ev = m.data;
      if (!ev || typeof ev.s !== 'number') return;
      if (ev.s <= this.have) return;
      this.buf.set(ev.s, ev);
      while (this.buf.has(this.have + 1)) {
        const e = this.buf.get(this.have + 1);
        this.buf.delete(this.have + 1);
        this.have++;
        try {
          this.apply(e);
        } catch (err) {
          if (window.console) console.warn('evento online falhou', e.k, err);
        }
      }
      /* buraco na sequência há muito tempo (entrou depois ou perdeu muito): pula para frente */
      if (this.buf.size > 60) {
        const min = Math.min(...this.buf.keys());
        this.have = min - 1;
        this.buf.forEach(() => {});
      }
      this.presT = 0;
    }
    apply(e) {
      const d = e.d || {};
      const g = this.g;
      switch (e.k) {
        case 'start':
          if (this.started) break;
          this.started = true;
          this.startPayload = d;
          this.mySlot = d.slots ? d.slots[this.myPeer()] : null;
          if (this.mySlot == null) {
            if (this.onLeave) this.onLeave('A partida começou sem você (a sala já estava cheia).');
            this.close();
            break;
          }
          if (this.onStart) this.onStart(d);
          break;
        case 'pv':
          if (d.to !== this.myPeer()) break;
          this.privQueue.push(d);
          this.flushPriv();
          break;
        case 'pvs': {
          const mine = Array.isArray(d.list) ? d.list.find((x) => x && x.to === this.myPeer()) : null;
          if (!mine) break;
          this.privQueue.push(mine);
          this.flushPriv();
          break;
        }
        case 'fx':
          if (!g) break;
          g.addFx({ type: d.ty, x: d.x, y: d.y, ox: d.ox, oy: d.oy, color: d.c, facing: d.fa, hat: d.ht, visor: d.vs, seed: d.sd, dur: d.du, who: Number.isInteger(d.w) ? d.w : undefined });
          if (d.ty === 'kill') {
            g.sfxAt('kill', d.x, d.y, { sight: true, h: 0.7 });
            const v = g.players.find((q) => q.color === d.c);
            if (v && v === g.human && g.ui.onHumanKilled) {
              /* quem matou: o mais perto do corpo, com a cara que ele tinha */
              const k = g.players.filter((q) => q !== v && q.alive).sort((a, b) => U.d2(a.x, a.y, d.x, d.y) - U.d2(b.x, b.y, d.x, d.y))[0];
              if (k) g.ui.onHumanKilled(k, g.appear(k));
            }
          } else if (d.ty === 'ventIn' || d.ty === 'ventOut') g.sfxAt('vent', d.x, d.y, { h: 0.1 });
          else if (d.ty === 'shield') g.sfxAt('shield', d.x, d.y, { sight: true, h: 0.8 });
          break;
        case 'meet':
          if (g) Net.clientMeeting(g, d);
          break;
        case 'msg':
          if (g && g.meeting && !g.meeting.closed) g.meeting.post(g.players[d.from], d.text, AU.Talk.parse(d.text, g, { self: d.from }), { net: true });
          break;
        case 'vote':
          if (g && g.meeting && g.meeting.votes[d.v] === undefined) {
            g.meeting.votes[d.v] = 'hidden';
            if (g.meeting.ui) g.meeting.ui.onVote(d.v);
            AU.Audio.play('vote');
          }
          break;
        case 'res':
          if (g && g.meeting) Net.clientResult(g, d);
          break;
        case 'mend':
          if (g && g.meeting && !g.meeting.closed && g.meeting.phase !== 'eject') {
            g.meeting.phase = 'eject';
            g.meeting.ejectEnd = g.meeting.t + 0.2;
          }
          break;
        case 'end':
          if (g) Net.clientEnd(g, d);
          break;
        case 'resync':
          if (d.to === this.myPeer()) this.have = Math.max(this.have, (this.hostPres && this.hostPres.seq ? this.hostPres.seq : this.have) - 25);
          break;
        default:
          break;
      }
    }
    async flushPriv() {
      if (!this.g) return;
      while (this.privQueue.length) {
        const d = this.privQueue[0];
        if (d.iv && !this.key) return;
        this.privQueue.shift();
        try {
          const pv = await open(this.key, d);
          applyPriv(this.g, this.g.human, pv);
          this.privOK = true;
          if (this.onPriv) this.onPriv();
        } catch (e) {
          /* chave errada ou dado corrompido: o próximo envio corrige */
        }
      }
    }
    /* quadro do jogo no aparelho do amigo: o próprio corpo anda aqui; o resto vem do anfitrião */
    update(dt) {
      const g = this.g;
      if (!g || this.closed) return;
      if (g.phase === 'meeting') {
        if (g.meeting) g.meeting.update(dt);
      } else if (g.phase === 'play') {
        g.t += dt;
        const hh = g.human;
        if (hh) {
          /* por onde andei (para não ser puxado para trás pelo atraso da rede; ver applySnapshot) */
          const hist = g.netMyHist || (g.netMyHist = []), now = performance.now();
          hist.push([now, hh.x, hh.y]);
          while (hist.length && now - hist[0][0] > 2000) hist.shift();
        }
        if (hh && !hh.inVent && !hh.frozen) {
          const len = Math.hypot(g.input.x, g.input.y);
          if (len > 0.05) {
            const s = g.speedOf(hh) * Math.min(1, len);
            g.moveEntity(hh, (g.input.x / len) * s, (g.input.y / len) * s, dt);
            if (hh.busy && !hh.busy.minigame) hh.busy = null;
          } else hh.moving = false;
        }
        /* interpolação: desenha os outros NET_DELAY atrás do relógio do anfitrião, em linha reta entre os dois
           estados em volta desse instante. Velocidade constante (perseguir o último ponto fazia o boneco acelerar e
           frear 12 vezes por segundo) */
        const want = g.netDelayT || 0.15;
        g.netDelay = g.netDelay == null ? want : g.netDelay + (want - g.netDelay) * Math.min(1, dt * 1.5);
        const rt = performance.now() / 1000 + (g.netOff || 0) - g.netDelay;
        for (const p of g.players) {
          if (p === hh) continue;
          const buf = p.netBuf;
          if (buf && buf.length) {
            let j = 0;
            while (j < buf.length && buf[j][0] < rt) j++;
            let a, b, u = 0, ex = 0;
            if (j === 0) a = b = buf[0];
            else if (j === buf.length) {
              a = b = buf[buf.length - 1];
              /* o próximo estado atrasou: segue andando na mesma direção por um instante, em vez de parar e pular */
              const q = buf[buf.length - 2];
              if (q && b[3] && b[0] > q[0]) ex = Math.min(rt - b[0], 0.15) / (b[0] - q[0]);
              if (ex > 0) a = q;
            } else {
              a = buf[j - 1];
              b = buf[j];
              u = (rt - a[0]) / Math.max(0.001, b[0] - a[0]);
            }
            /* salto grande (duto, reunião): troca de uma vez quando chega a hora */
            if (Math.hypot(b[1] - a[1], b[2] - a[2]) > 3) {
              u = u < 1 ? 0 : 1;
              ex = 0;
            }
            if (ex > 0) {
              const nx = b[1] + (b[1] - a[1]) * ex, ny = b[2] + (b[2] - a[2]) * ex;
              const ok = !p.alive || g.canStand(nx, ny, false);
              p.x = ok ? nx : b[1];
              p.y = ok ? ny : b[2];
              a = b;
            } else {
              p.x = a[1] + (b[1] - a[1]) * u;
              p.y = a[2] + (b[2] - a[2]) * u;
            }
            p.facing = b[4];
            p.moving = !!(a[3] || b[3]) && (b !== a || buf.length < 2 || rt - b[0] < 0.25);
            if (p.moving) {
              p.walkT += dt;
              g.footstep(p);
            }
          }
          const tx = p.x - p.facing * 0.9, ty = p.y + 0.25;
          p.petX += (tx - p.petX) * Math.min(1, dt * 4);
          p.petY += (ty - p.petY) * Math.min(1, dt * 4);
        }
        if (hh) {
          const tx = hh.x - hh.facing * 0.9, ty = hh.y + 0.25;
          hh.petX += (tx - hh.petX) * Math.min(1, dt * 4);
          hh.petY += (ty - hh.petY) * Math.min(1, dt * 4);
          hh.killCd = Math.max(0, hh.killCd - dt);
          hh.abilityCd = Math.max(0, hh.abilityCd - dt);
          if ((g.ambT = (g.ambT || 0) - dt) <= 0) {
            g.ambT = 0.1;
            AU.Audio.listen({ x: hh.x, y: hh.y, alive: hh.alive, inVent: !!hh.inVent, los: AU.Nav.los, area: (M.areaAt(hh.x, hh.y) || {}).id });
          }
        }
        if (g.sab && g.sab.timer != null) g.sab.timer = Math.max(0, g.sab.timer - dt);
        g.fx = g.fx.filter((f) => g.t - f.t0 < (f.dur || 1));
        g.pings = g.pings.filter((pg) => pg.until > g.t);
      }
      /* presença: posição e estados contínuos ~15 vezes por segundo */
      this.presT -= dt;
      if (this.presT <= 0) {
        this.presT = 0.066;
        const hh = g.human;
        /* rastro do último segundo (o anfitrião valida o caminho, não só o ponto final) */
        if (hh && g.phase === 'play') {
          const tr = this.trail || (this.trail = []), last = tr[tr.length - 1], px = r2(hh.x), py = r2(hh.y);
          if (!last || last[0] !== px || last[1] !== py) tr.push([px, py]);
          if (tr.length > 16) tr.shift();
        }
        this.flags = {
          cams: hh && hh.onCams ? 1 : 0,
          admin: hh && hh.onAdmin ? 1 : 0,
          busy: hh && hh.busy && hh.busy.task ? (hh.busy.task.id || hh.busy.task) : 0,
          hold: this.hold && performance.now() - this.holdAt < 300 ? this.hold : 0,
          vis: hh && hh.visual && hh.visual.until > g.t ? hh.visual.type : 0,
        };
        this.setPres();
      }
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      for (const u of this.unsub || []) u && u();
      if (this.gr) this.gr.leave().catch(() => {});
    }
  }

  /* ---------- jogo do amigo: as ações viram pedidos ao anfitrião ---------- */
  Net.patchClient = function (g, cl) {
    g.netClient = cl;
    g.net = null;
    cl.g = g;
    const me = () => g.human;
    const mine = (p) => p === me();
    const send = (k, a) => cl.cmd(k, a);
    g.update = (dt) => cl.update(dt);
    g.checkWin = () => {};
    g.tryKill = (k, v) => {
      if (mine(k) && v) send('kill', v.id);
      return false;
    };
    g.tryReport = (p, body) => {
      if (mine(p)) send('report', body ? body.id : null);
      return false;
    };
    g.tryEmergency = (p) => {
      if (mine(p)) send('button');
      return false;
    };
    g.enterVent = (p) => {
      if (mine(p)) send('vin');
      return false;
    };
    g.exitVent = (p) => {
      if (mine(p)) send('vout');
      return false;
    };
    g.ventTo = (p, vid) => {
      if (mine(p)) send('vto', vid);
      return false;
    };
    g.sabotage = (type, p) => {
      if (mine(p) && g.canSabotage(p)) {
        send('sab', type);
        return true;
      }
      return false;
    };
    g.closeDoors = (room, p) => {
      if (mine(p)) send('doors', room);
      return true;
    };
    g.shapeshift = (p, id) => {
      if (mine(p)) send('shift', id);
      return true;
    };
    g.unshift = (p) => {
      if (mine(p)) send('unshift');
    };
    g.vanish = (p) => {
      if (mine(p)) send('vanish');
      return true;
    };
    g.reappear = (p) => {
      if (mine(p)) send('appear');
    };
    g.track = (p, id) => {
      if (mine(p)) send('track', id);
      return true;
    };
    g.protect = (p, id) => {
      if (mine(p)) send('protect', id);
      return true;
    };
    /* tarefa: avança na hora (o painel fecha) e o anfitrião confirma */
    g.completeStep = (p, task) => {
      if (!mine(p) || task.done) return;
      send('step', [task.id, task.step]);
      if (task.id === 'inspect' && task.step === 0) task.readyAt = g.t + (task.def.wait || 45);
      task.step++;
      task.netAhead = performance.now();
      if (task.step >= task.steps.length) task.done = true;
      g.say('onTaskProgress', p, task);
    };
    g.resetInspect = (task) => {
      task.step = 0;
      task.readyAt = 0;
      send('rinsp', task.id);
    };
    g.fixLightsToggle = (i, p) => {
      const s = g.sab;
      if (!s || s.type !== 'lights' || !mine(p)) return;
      s.switches[i] = !s.switches[i];
      send('lt', i);
    };
    g.reactorHold = (p, which) => {
      if (!mine(p)) return;
      cl.hold = which;
      cl.holdAt = performance.now();
    };
    g.o2Enter = (which, code, p) => {
      const s = g.sab;
      if (!s || s.type !== 'o2' || String(code) !== String(s.code)) return false;
      send('o2', [which, String(code)]);
      s.done = s.done || {};
      s.done[which] = true;
      return true;
    };
    g.fixComms = (p) => {
      if (mine(p)) send('comms');
    };
    g.sabFixed = () => {};
    g.addFx = (fx) => {
      fx.t0 = g.t;
      g.fx.push(fx);
    };
  };

  /* reunião no aparelho do amigo: a mesma tela; as falas e os votos vêm do anfitrião */
  Net.clientMeeting = function (g, d) {
    if (g.meeting && !g.meeting.closed) return;
    AU.HUD.closeOverlay && AU.HUD.closeOverlay();
    AU.MG && AU.MG.close && AU.MG.close(true);
    g.phase = 'meeting';
    g.meetings = d.index || g.meetings + 1;
    for (const p of g.players) {
      p.inVent = null;
      p.busy = null;
      p.visual = null;
      p.moving = false;
      p.onCams = false;
      p.onAdmin = false;
    }
    if (g.human) {
      g.human.onCams = false;
      g.human.onAdmin = false;
    }
    const body = d.body ? g.bodies.find((b) => b.pid === d.body.pid) || { pid: d.body.pid, area: d.body.area, x: 0, y: 0 } : null;
    const info = { kind: d.kind, caller: d.caller, body, index: d.index, t: g.t, roundStart: g.roundStart };
    g.say('closeOverlays');
    AU.Audio.ambience(null);
    g.meeting = new AU.Meeting(g, info);
    g.meeting.alive = d.alive || g.meeting.alive;
    g.meetingLog = g.meetingLog || [];
    g.meetingLog.push(g.meeting);
    g.say('onMeetingStart', g.meeting);
  };
  Net.clientResult = function (g, d) {
    const mt = g.meeting;
    if (mt.result) return;
    mt.votes = Object.assign({}, d.votes || {});
    mt.result = { ejected: d.ej, tie: !!d.tie, skip: d.skip, counts: d.counts || {}, votes: mt.votes };
    mt.phase = 'results';
    mt.paused = false;
    mt.resultsEnd = mt.t + 4.2;
    if (mt.ui) mt.ui.showResults();
  };
  Net.clientEnd = function (g, d) {
    if (g.phase === 'ended') return;
    (d.roles || []).forEach(([role, special, alive], i) => {
      const p = g.players[i];
      if (!p) return;
      p.role = role;
      p.special = special || null;
      if (!alive && p.alive) {
        p.alive = false;
        if (p.deathT == null) p.deathT = g.t;
      }
    });
    if (g.meeting && g.meeting.ui) g.meeting.ui.destroy();
    g.meeting = null;
    g.winner = d.w;
    g.endReason = d.r;
    g.phase = 'ended';
    AU.Audio.alarm(false);
    AU.Audio.play(g.human && (d.w === 'impostor') === g.human.isImp ? 'win' : 'lose');
    if (g.ui.onGameEnd) g.ui.onGameEnd();
  };

  /* =================================================================================================== */
  /* Tela "Jogar online" */
  Net.screen = function (root) {
    root.innerHTML = '';
    const S = AU.Menu.S;
    const card = h('div', { class: 'online-card' });
    root.append(h('div', { class: 'online-wrap' }, card));
    const back = () => {
      Net.leave();
      AU.App.show('title');
    };
    const title = h('div', { class: 'online-head' }, h('h2', {}, 'Jogar online'), h('button', { class: 'btn ghost', onclick: back }, '← Voltar'));
    card.append(title, h('p', { class: 'online-msg' }, 'Procurando a sala ao vivo do claude.ai…'));
    Net.init().then((ok) => {
      if (!root.isConnected) return;
      card.innerHTML = '';
      /* voltando de "Configurar partida" com a sala aberta: mostra a sala de novo */
      if (Net.host && !Net.host.closed && !Net.host.g) return hostView(card, Net.host);
      if (Net.client && !Net.client.closed && !Net.client.started) return clientView(card, Net.client);
      card.append(title);
      if (!ok && Net.inClaude) {
        /* no claude.ai, mas a sala ao vivo não abriu para esta pessoa: diz o motivo provável e o que fazer */
        const why = Net.why;
        if (why === 'pagina') {
          card.append(
            h('p', { class: 'online-msg' }, 'O jogo está aberto numa página própria, fora da janela do claude.ai, e aí a sala ao vivo não carrega.'),
            h('ul', { class: 'online-list' },
              h('li', {}, 'Abra o jogo pelo link do claude.ai (claude.ai/artifact/…), sem a opção de tela cheia ou nova aba.')));
        } else if (why === 'negada') {
          card.append(
            h('p', { class: 'online-msg' }, 'A permissão da sala ao vivo foi recusada para este jogo.'),
            h('ul', { class: 'online-list' },
              h('li', {}, 'Libere no menu de permissões do jogo, no claude.ai, e recarregue a página.')));
        } else {
          card.append(
            h('p', { class: 'online-msg' }, 'A sala ao vivo não abriu para a sua conta.'),
            h('ul', { class: 'online-list' },
              h('li', {}, 'Ela funciona para quem está com login no claude.ai e foi convidado para este jogo (conta gratuita serve).'),
              h('li', {}, 'Entre com o mesmo e-mail que recebeu o convite e abra pelo link do convite.'),
              h('li', {}, 'Quem chega pelo link público não conecta. Se o jogo também está liberado para "Qualquer pessoa com o link", peça para quem compartilhou deixar só os convites por e-mail.'),
              h('li', {}, 'Abra o jogo original, não uma cópia salva ou remixada (a cópia é outro jogo, com outra sala).')),
            h('p', { class: 'fine' }, 'Para entrar na sala de um amigo, qualquer nível de acesso serve. Para criar uma sala, é preciso acesso de Colaborador ou mais.'));
        }
        card.append(diagPanel());
        return;
      }
      if (!ok) {
        card.append(
          h('p', { class: 'online-msg' }, 'O modo online funciona no link do jogo no claude.ai: quem estiver com o link aberto ao mesmo tempo joga junto, cada um no seu aparelho.'),
          h('ul', { class: 'online-list' },
            h('li', {}, 'Abra o jogo pelo link do claude.ai (não pelo arquivo baixado).'),
            h('li', {}, 'Compartilhe o link com seus amigos pelo botão de compartilhar do claude.ai.'),
            h('li', {}, 'Um cria a sala; os outros entram pelo código.')),
          h('p', { class: 'fine' }, 'Aqui o jogo está aberto fora do claude.ai, sem a sala ao vivo.'));
        return;
      }
      lobbyMenu(card, title, S);
    });
  };
  /* painel "Diagnóstico do online": o texto de Net.diagText() para copiar e mandar para quem compartilhou */
  function diagPanel() {
    const txt = h('textarea', { class: 'diag-text', readonly: 'readonly', rows: '9', spellcheck: 'false' });
    const fill = () => (txt.value = Net.diagText());
    txt.addEventListener('focus', () => txt.select());
    const note = h('span', { class: 'fine' }, '');
    const copy = h('button', { class: 'btn', onclick: () => {
      fill();
      const ok = () => (note.textContent = 'Copiado.');
      const manual = () => {
        txt.focus();
        txt.select();
        note.textContent = 'Selecionado: copie com Ctrl+C (ou segure e copie no celular).';
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt.value).then(ok, manual);
        else manual();
      } catch (e) {
        manual();
      }
    } }, 'Copiar');
    const box = h('details', { class: 'online-diag' },
      h('summary', {}, 'Diagnóstico do online'),
      h('p', { class: 'fine' }, 'Se o online não funcionar, copie isto e mande para quem compartilhou o jogo. Não tem nada pessoal.'),
      txt,
      h('div', { class: 'row-btns' }, copy, note));
    box.addEventListener('toggle', fill);
    fill();
    return box;
  }
  function lobbyMenu(card, title, S) {
    const nick = h('input', { type: 'text', maxlength: '16', value: S.profile.name || '', placeholder: 'Seu nome no jogo' });
    nick.addEventListener('change', () => {
      S.profile.name = clean(nick.value, 16) || S.profile.name;
      AU.Menu.save();
    });
    const code = h('input', { type: 'text', maxlength: '4', placeholder: 'ABCD', class: 'code-in', autocapitalize: 'characters' });
    const list = h('div', { class: 'online-rooms' });
    const hist = h('div', { class: 'online-hist' });
    const msg = h('p', { class: 'online-msg' }, '');
    const join = (c) => {
      c = String(c || '').toUpperCase().replace(/[^A-Z]/g, '');
      if (c.length !== 4) {
        msg.textContent = 'O código tem 4 letras.';
        return;
      }
      Net.joinRoom(c, card);
    };
    card.append(
      h('div', { class: 'grid2' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, 'Seu nome'), nick),
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Entrar com código'), h('div', { class: 'row-btns' }, code, h('button', { class: 'btn', onclick: () => join(code.value) }, 'Entrar')))),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn primary', onclick: () => Net.hostRoom(card) }, 'Criar sala'),
        h('span', { class: 'fine' }, 'Quem cria a sala usa as configurações de partida dele; os lugares que sobrarem ficam com bots.')),
      msg,
      h('h3', {}, 'Salas abertas'),
      list,
      h('h3', {}, 'Últimas partidas online'),
      hist,
      diagPanel());
    const draw = () => {
      if (!list.isConnected) return stop();
      list.innerHTML = '';
      const rooms = Net.listRooms();
      if (!rooms.length) list.append(h('p', { class: 'fine' }, 'Nenhuma sala aberta agora. Crie uma e passe o código para os amigos.'));
      for (const r of rooms) {
        list.append(h('div', { class: 'room-row' },
          h('span', { class: 'room-code' }, r.code),
          h('span', {}, r.name + ' · ' + r.n + '/' + r.max + (r.st === 'play' ? ' · em jogo' : '')),
          r.st === 'play' ? h('span', { class: 'fine' }, 'começou') : h('button', { class: 'btn', onclick: () => join(r.code) }, 'Entrar')));
      }
    };
    const stop = Net.watchRooms(draw);
    draw();
    Net.history().then((hs) => {
      if (!hist.isConnected) return;
      hist.innerHTML = '';
      if (!hs.length) hist.append(h('p', { class: 'fine' }, 'Nenhuma partida online ainda.'));
      for (const it of hs) {
        hist.append(h('div', { class: 'room-row' },
          h('span', {}, new Date(it.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })),
          h('span', { class: it.winner === 'crew' ? 'win-crew' : 'win-imp' }, it.winner === 'crew' ? 'Tripulação venceu' : 'Impostores venceram'),
          h('span', { class: 'fine' }, (it.players || []).filter((p) => p.h).map((p) => clean(p.n)).join(', '))));
      }
    });
  }

  /* criar sala */
  Net.hostRoom = async function (card) {
    Net.leave();
    const code = newCode();
    const host = new Host(code);
    Net.host = host;
    const draw = hostView(card, host);
    try {
      await host.start();
    } catch (e) {
      Net.lastErr = 'criar sala: ' + ((e && (e.code || e.message)) || 'erro');
      if (Net.host === host) Net.leave();
      card.innerHTML = '';
      card.append(h('div', { class: 'online-head' }, h('h2', {}, 'Criar sala'), h('button', { class: 'btn ghost', onclick: () => Net.screen(card.parentNode.parentNode) }, '← Voltar')));
      card.append(h('p', { class: 'online-msg bad' }, e && e.code === 'not_permitted'
        ? 'Para criar uma sala você precisa de acesso de Colaborador (ou mais) a este jogo — peça para quem compartilhou o link. Para entrar na sala de um amigo, qualquer nível de acesso serve.'
        : 'Não deu para abrir a sala agora. Tente de novo em instantes.'), diagPanel());
      return;
    }
    draw();
  };
  function hostView(card, host) {
    const code = host.code;
    card.innerHTML = '';
    const players = h('div', { class: 'online-rooms' });
    const back = h('button', { class: 'btn ghost', onclick: () => {
      Net.leave();
      Net.screen(card.parentNode.parentNode);
    } }, '← Sair da sala');
    const start = h('button', { class: 'btn primary', onclick: () => {
      const roster = host.roster();
      AU.App.startOnlineHost(host, roster);
    } }, 'Começar partida');
    card.append(
      h('div', { class: 'online-head' }, h('h2', {}, 'Sua sala'), back),
      h('div', { class: 'big-code', title: 'Código da sala' }, code),
      h('p', { class: 'online-msg' }, 'Passe este código para os amigos (eles abrem o mesmo link do jogo no claude.ai, vão em "Jogar online" e entram com o código).'),
      h('h3', {}, 'Na sala'),
      players,
      h('p', { class: 'fine' }, AU.Menu.summary ? 'Partida: ' + AU.Menu.summary() : ''),
      h('div', { class: 'row-btns' }, start, h('button', { class: 'btn', onclick: () => AU.App.show('create') }, 'Configurar partida')));
    const draw = () => {
      if (!players.isConnected) return;
      players.innerHTML = '';
      const S = AU.Menu.S;
      players.append(h('div', { class: 'room-row' }, h('span', { html: AU.Render.beanSVG(S.profile.color, { size: 28 }) }), h('span', {}, clean(S.profile.name) + ' (você, anfitrião)')));
      for (const e of host.players()) {
        const lk = (e.pres && e.pres.look) || {};
        players.append(h('div', { class: 'room-row' }, h('span', { html: AU.Render.beanSVG(C.COLOR[lk.color] ? lk.color : 'branco', { size: 28 }) }), h('span', {}, clean(e.pres.nick) || 'Amigo')));
      }
      const left = S.room.players - 1 - host.players().length;
      if (left > 0) players.append(h('p', { class: 'fine' }, left + ' lugar' + (left > 1 ? 'es' : '') + ' com bot' + (left > 1 ? 's' : '') + '.'));
    };
    host.onChange = draw;
    if (host.gr) draw();
    return draw;
  }

  /* entrar numa sala */
  Net.joinRoom = async function (code, card) {
    Net.leave();
    const cl = new Client(code);
    Net.client = cl;
    const status = clientView(card, cl);
    try {
      await cl.start();
    } catch (e) {
      Net.lastErr = 'entrar em ' + code + ': ' + ((e && (e.code || e.message)) || 'erro');
      status.textContent = e && e.code === 'not_permitted'
        ? 'Sua conta não pode usar as salas deste jogo. Peça para quem compartilhou te convidar pelo e-mail (pelo link público o online não conecta).'
        : 'Não deu para entrar agora. Confira o código e tente de novo.';
      return;
    }
    setTimeout(() => {
      if (!cl.hostPeer && !cl.closed && status.isConnected) {
        Net.lastErr = 'sala ' + code + ': anfitrião não encontrado';
        status.textContent = 'Ninguém está com a sala ' + code + ' aberta. Confira o código (e se você e quem criou a sala estão no mesmo jogo, não numa cópia).';
      }
    }, 6000);
    cl.onChange();
  };
  function clientView(card, cl) {
    const code = cl.code;
    card.innerHTML = '';
    const status = h('p', { class: 'online-msg' }, 'Entrando na sala ' + code + '…');
    const players = h('div', { class: 'online-rooms' });
    card.append(
      h('div', { class: 'online-head' }, h('h2', {}, 'Sala ' + code), h('button', { class: 'btn ghost', onclick: () => {
        Net.leave();
        Net.screen(card.parentNode.parentNode);
      } }, '← Sair')),
      status, players, diagPanel());
    cl.onChange = () => {
      if (!players.isConnected) return;
      const hp = cl.hostPres;
      status.textContent = hp ? (hp.st === 'play' && !cl.started ? 'Essa partida já começou.' : 'Você está na sala de ' + clean(hp.nick || 'anfitrião') + '. Esperando começar…') : 'Procurando o anfitrião da sala ' + code + '…';
      players.innerHTML = '';
      for (const p of cl.gr.peers()) {
        const pr = p.presence || {};
        if (pr.app !== 'au') continue;
        const lk = pr.look || {};
        players.append(h('div', { class: 'room-row' }, h('span', { html: AU.Render.beanSVG(C.COLOR[lk.color] ? lk.color : 'vermelho', { size: 28 }) }), h('span', {}, (clean(pr.nick) || 'Jogador') + (pr.role === 'host' ? ' (anfitrião)' : '') + (p.isMe ? ' (você)' : ''))));
      }
    };
    cl.onStart = (d) => AU.App.startOnlineClient(cl, d);
    cl.onLeave = (why) => {
      if (AU.App.screen === 'game' || AU.App.screen === 'reveal') AU.App.onlineLost(why);
      else status.textContent = why;
    };
    if (cl.gr) cl.onChange();
    return status;
  }

  Net.leave = function () {
    if (Net.host) Net.host.close();
    if (Net.client) Net.client.close();
    Net.host = null;
    Net.client = null;
  };

  AU.Net = Net;
  Net._test = { snapshot, applySnapshot, privOf, applyPriv, Host, Client, seal, open, keyPair, shared };
})();

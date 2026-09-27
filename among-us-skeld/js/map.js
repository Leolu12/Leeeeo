/* Mapa The Skeld: grade de tiles, salas, corredores, portas, dutos, estações e tarefas. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U;

  const W = 136, H = 76;

  /* chat: apelidos usados no chat [texto, preposição "em"] ; de: preposição "de" */
  const ROOMS = [
    { id: 'upperEngine', name: 'Motor Superior', rect: [8, 6, 16, 14], cut: { tl: 3, bl: 3 }, floor: '#39414f', chat: [['motor de cima', 'no', 'do'], ['upper', 'no', 'do'], ['motor superior', 'no', 'do']], aliases: ['motor de cima', 'motor superior', 'upper engine', 'upper', 'motor cima'] },
    { id: 'reactor', name: 'Reator', rect: [1, 26, 13, 20], cut: { tl: 4, bl: 4 }, floor: '#2f3a4a', chat: [['reator', 'no', 'do']], aliases: ['reator', 'reactor'] },
    { id: 'security', name: 'Segurança', rect: [22, 28, 12, 12], floor: '#353c4c', chat: [['segurança', 'na', 'da'], ['sec', 'na', 'da'], ['cams', 'nas', 'das']], aliases: ['seguranca', 'security', 'sec', 'cams', 'cameras', 'camera'] },
    { id: 'lowerEngine', name: 'Motor Inferior', rect: [8, 52, 16, 14], cut: { tl: 3, bl: 3 }, floor: '#39414f', chat: [['motor de baixo', 'no', 'do'], ['lower', 'no', 'do'], ['motor inferior', 'no', 'do']], aliases: ['motor de baixo', 'motor inferior', 'lower engine', 'lower', 'motor baixo'] },
    { id: 'medbay', name: 'MedBay', rect: [38, 20, 14, 14], floor: '#2d4b52', chat: [['med', 'na', 'da'], ['medbay', 'na', 'da'], ['enfermaria', 'na', 'da']], aliases: ['medbay', 'med', 'enfermaria', 'medical', 'medica', 'medico', 'med bay', 'hospital', 'medibay'] },
    { id: 'cafeteria', name: 'Cafeteria', rect: [56, 2, 26, 24], cut: { tl: 5, tr: 5, bl: 5, br: 5 }, floor: '#4a5160', chat: [['café', 'no', 'do'], ['cafeteria', 'na', 'da'], ['refeitório', 'no', 'do']], aliases: ['cafeteria', 'cafe', 'refeitorio', 'caf', 'botao', 'mesa'] },
    { id: 'weapons', name: 'Armas', rect: [92, 4, 16, 14], cut: { tr: 4 }, floor: '#3a3f55', chat: [['armas', 'em', 'de'], ['weapons', 'na', 'da']], aliases: ['armas', 'weapons', 'weapon', 'arma'] },
    { id: 'o2', name: 'O2', rect: [86, 22, 12, 10], floor: '#2f4a44', chat: [['o2', 'no', 'do'], ['oxigênio', 'no', 'do']], aliases: ['o2', 'oxigenio', 'oxygen'] },
    { id: 'navigation', name: 'Navegação', rect: [116, 28, 18, 16], cut: { tr: 6, br: 6 }, floor: '#33405a', chat: [['nav', 'na', 'da'], ['navegação', 'na', 'da']], aliases: ['navegacao', 'nav', 'navigation', 'cabine', 'pilotagem'] },
    { id: 'shields', name: 'Escudos', rect: [94, 52, 16, 14], cut: { br: 4 }, floor: '#3b3f58', chat: [['escudos', 'nos', 'dos'], ['shields', 'no', 'do']], aliases: ['escudos', 'escudo', 'shields', 'shield'] },
    { id: 'comms', name: 'Comunicações', rect: [74, 62, 16, 12], floor: '#383e50', chat: [['comms', 'no', 'do'], ['comunicações', 'nas', 'das']], aliases: ['comms', 'comunicacoes', 'comunicacao', 'coms', 'radio'] },
    { id: 'storage', name: 'Depósito', rect: [54, 44, 18, 22], floor: '#4a4538', chat: [['storage', 'no', 'do'], ['depósito', 'no', 'do']], aliases: ['storage', 'deposito', 'armazem', 'estoque'] },
    { id: 'admin', name: 'Admin', rect: [74, 34, 14, 12], floor: '#3b4658', chat: [['admin', 'no', 'do']], aliases: ['admin', 'adm', 'administracao', 'mapa do admin'] },
    { id: 'electrical', name: 'Elétrica', rect: [36, 38, 14, 12], floor: '#3d3a33', chat: [['elétrica', 'na', 'da'], ['elec', 'na', 'da']], aliases: ['eletrica', 'elec', 'eletric', 'electrical'] },
  ];

  const CORRIDORS = [
    { id: 'hallUpper', name: 'Corredor da MedBay', rects: [[24, 12, 32, 4], [42, 16, 4, 4]], near: ['upperEngine', 'medbay', 'cafeteria'], chat: [['corredor da med', 'no', 'do'], ['corredor de cima', 'no', 'do']] },
    { id: 'hallLeft', name: 'Corredor do Reator', rects: [[16, 20, 4, 32], [14, 34, 2, 4], [20, 32, 2, 4]], near: ['upperEngine', 'reactor', 'security', 'lowerEngine'], chat: [['corredor do reator', 'no', 'do'], ['corredor da segurança', 'no', 'do']] },
    { id: 'hallLower', name: 'Corredor da Elétrica', rects: [[24, 56, 30, 4], [42, 50, 4, 6]], near: ['lowerEngine', 'electrical', 'storage'], chat: [['corredor da elétrica', 'no', 'do'], ['corredor de baixo', 'no', 'do']] },
    { id: 'hallAdmin', name: 'Corredor do Admin', rects: [[62, 26, 4, 18], [66, 38, 8, 4]], near: ['cafeteria', 'admin', 'storage'], chat: [['corredor do admin', 'no', 'do']] },
    { id: 'hallWeapons', name: 'Corredor de Armas', rects: [[82, 8, 10, 4]], near: ['cafeteria', 'weapons'], chat: [['corredor de armas', 'no', 'do']] },
    { id: 'hallRight', name: 'Corredor do O2', rects: [[100, 18, 4, 34], [98, 25, 2, 4], [104, 34, 12, 4]], near: ['weapons', 'o2', 'navigation', 'shields'], chat: [['corredor do o2', 'no', 'do'], ['corredor da nav', 'no', 'do']] },
    { id: 'hallStorage', name: 'Corredor dos Escudos', rects: [[72, 56, 22, 4], [80, 60, 4, 2]], near: ['storage', 'comms', 'shields'], chat: [['corredor do comms', 'no', 'do'], ['corredor dos escudos', 'no', 'do']] },
  ];

  const AREAS = [];
  const AREA = {};
  ROOMS.forEach((r) => {
    r.kind = 'room';
    r.rects = [r.rect];
    AREA[r.id] = r;
  });
  CORRIDORS.forEach((c) => {
    c.kind = 'hall';
    AREA[c.id] = c;
  });
  CORRIDORS.forEach((c) => AREAS.push(c));
  ROOMS.forEach((r) => AREAS.push(r));

  const floor = new Uint8Array(W * H);
  const areaIdx = new Int16Array(W * H).fill(-1);
  /* cantos chanfrados (salas não retangulares) */
  const inCut = (a, xx, yy) => {
    const c = a.cut;
    if (!c) return false;
    const [x, y, w, h] = a.rect;
    const L = xx - x, R = x + w - 1 - xx, T = yy - y, B = y + h - 1 - yy;
    return (c.tl && L + T < c.tl) || (c.tr && R + T < c.tr) || (c.bl && L + B < c.bl) || (c.br && R + B < c.br);
  };
  AREAS.forEach((a, i) => {
    a.index = i;
    a.rects.forEach(([x, y, w, h]) => {
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
        if (inCut(a, xx, yy)) continue;
        floor[yy * W + xx] = 1;
        areaIdx[yy * W + xx] = i;
      }
    });
    const r0 = a.rects[0];
    a.cx = r0[0] + r0[2] / 2;
    a.cy = r0[1] + r0[3] / 2;
  });

  /* Vizinhança entre áreas (para raciocínio de "perto do corpo"). */
  ROOMS.forEach((r) => (r.near = []));
  CORRIDORS.forEach((c) => c.near.forEach((rid) => {
    if (!AREA[rid].near.includes(c.id)) AREA[rid].near.push(c.id);
  }));

  const DOORS = [
    { id: 'cafL', room: 'cafeteria', rect: [55, 12, 1, 4] },
    { id: 'cafR', room: 'cafeteria', rect: [82, 8, 1, 4] },
    { id: 'cafB', room: 'cafeteria', rect: [62, 26, 4, 1] },
    { id: 'med', room: 'medbay', rect: [42, 19, 4, 1] },
    { id: 'sec', room: 'security', rect: [21, 32, 1, 4] },
    { id: 'elec', room: 'electrical', rect: [42, 50, 4, 1] },
    { id: 'stoT', room: 'storage', rect: [62, 43, 4, 1] },
    { id: 'stoL', room: 'storage', rect: [53, 56, 1, 4] },
    { id: 'stoR', room: 'storage', rect: [72, 56, 1, 4] },
    { id: 'upR', room: 'upperEngine', rect: [24, 12, 1, 4] },
    { id: 'upB', room: 'upperEngine', rect: [16, 20, 4, 1] },
    { id: 'loR', room: 'lowerEngine', rect: [24, 56, 1, 4] },
    { id: 'loT', room: 'lowerEngine', rect: [16, 51, 4, 1] },
  ];
  const DOOR_ROOMS = ['cafeteria', 'medbay', 'security', 'electrical', 'storage', 'upperEngine', 'lowerEngine'];
  const doorAt = new Int16Array(W * H).fill(-1);
  DOORS.forEach((d, i) => {
    d.index = i;
    d.closed = false;
    const [x, y, w, h] = d.rect;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) doorAt[yy * W + xx] = i;
  });

  const VENTS = [
    { id: 'vUpper', area: 'upperEngine', x: 12.5, y: 17.5, links: ['vReactor'] },
    { id: 'vReactor', area: 'reactor', x: 5.5, y: 31.5, links: ['vUpper', 'vLower'] },
    { id: 'vLower', area: 'lowerEngine', x: 11.5, y: 55.5, links: ['vReactor'] },
    { id: 'vMed', area: 'medbay', x: 49.5, y: 31.5, links: ['vSec', 'vElec'] },
    { id: 'vSec', area: 'security', x: 31.5, y: 38.5, links: ['vMed', 'vElec'] },
    { id: 'vElec', area: 'electrical', x: 38.5, y: 48.5, links: ['vMed', 'vSec'] },
    { id: 'vCaf', area: 'cafeteria', x: 77.5, y: 5.5, links: ['vAdmin', 'vHall'] },
    { id: 'vAdmin', area: 'admin', x: 86.5, y: 44.5, links: ['vCaf', 'vHall'] },
    { id: 'vHall', area: 'hallStorage', x: 88.5, y: 57.5, links: ['vCaf', 'vAdmin'] },
    { id: 'vWeap', area: 'weapons', x: 104.5, y: 8.5, links: ['vNavT'] },
    { id: 'vNavT', area: 'navigation', x: 119.5, y: 30.5, links: ['vWeap'] },
    { id: 'vNavB', area: 'navigation', x: 119.5, y: 41.5, links: ['vShield'] },
    { id: 'vShield', area: 'shields', x: 105.5, y: 62.5, links: ['vNavB'] },
  ];
  const VENT = {};
  VENTS.forEach((v) => (VENT[v.id] = v));

  const EMERGENCY = { x: 69, y: 14 };
  const SECURITY = { x: 27.5, y: 29.5 };
  const ADMIN_TABLE = { x: 80.5, y: 39.5 };
  const CAMS = [
    { id: 'c1', name: 'Corredor da MedBay', x: 47, y: 14 },
    { id: 'c2', name: 'Corredor do Admin', x: 64, y: 36 },
    { id: 'c3', name: 'Corredor da Navegação', x: 108, y: 36 },
    { id: 'c4', name: 'Corredor do Reator', x: 18, y: 44 },
  ];
  const CAM_R = 7;

  const SAB_STATIONS = {
    lights: { x: 38.5, y: 39.5, area: 'electrical', name: 'Painel de luz' },
    reactorA: { x: 4.5, y: 28.5, area: 'reactor', name: 'Scanner do reator (norte)' },
    reactorB: { x: 4.5, y: 43.5, area: 'reactor', name: 'Scanner do reator (sul)' },
    o2A: { x: 96.5, y: 23.5, area: 'o2', name: 'Teclado do O2' },
    o2B: { x: 75.5, y: 35.5, area: 'admin', name: 'Teclado do Admin' },
    comms: { x: 88.5, y: 70.5, area: 'comms', name: 'Painel de comunicações' },
  };

  const STATIONS = {
    swipe: { x: 84.5, y: 35.5 },
    wiresElec: { x: 46.5, y: 38.5 }, wiresStorage: { x: 55.5, y: 45.5 }, wiresAdmin: { x: 74.5, y: 43.5 },
    wiresNav: { x: 127.5, y: 29.5 }, wiresCaf: { x: 57.5, y: 11.5 }, wiresSec: { x: 32.5, y: 28.5 },
    calibrate: { x: 48.5, y: 44.5 }, chart: { x: 131.5, y: 35.5 }, stabilize: { x: 129.5, y: 39.5 },
    cleanO2: { x: 88.5, y: 29.5 }, divert: { x: 36.5, y: 43.5 },
    acceptUpper: { x: 22.5, y: 7.5 }, acceptLower: { x: 22.5, y: 64.5 }, acceptWeap: { x: 93.5, y: 16.5 },
    acceptShields: { x: 108.5, y: 53.5 }, acceptNav: { x: 117.5, y: 36.5 }, acceptO2: { x: 96.5, y: 30.5 },
    acceptComms: { x: 75.5, y: 72.5 }, acceptSec: { x: 23.5, y: 38.5 },
    shields: { x: 101.5, y: 58.5 }, manifolds: { x: 7.5, y: 27.5 }, reactor: { x: 7.5, y: 44.5 },
    garbageCaf: { x: 77.5, y: 23.5 }, garbageO2: { x: 92.5, y: 30.5 }, garbageStorage: { x: 60.5, y: 64.5 },
    alignUpper: { x: 10.5, y: 9.5 }, alignLower: { x: 10.5, y: 62.5 },
    fuelStorage: { x: 70.5, y: 63.5 }, fuelUpper: { x: 18.5, y: 17.5 }, fuelLower: { x: 18.5, y: 54.5 },
    inspect: { x: 50.5, y: 22.5 }, scan: { x: 43.5, y: 29.5 },
    dlCaf: { x: 73.5, y: 3.5 }, dlWeap: { x: 92.5, y: 5.5 }, dlNav: { x: 126.5, y: 42.5 }, dlComms: { x: 76.5, y: 63.5 }, dlElec: { x: 48.5, y: 48.5 },
    upload: { x: 79.5, y: 44.5 },
    asteroids: { x: 99.5, y: 10.5 },
  };

  const ACCEPT = ['acceptUpper', 'acceptLower', 'acceptWeap', 'acceptShields', 'acceptNav', 'acceptO2', 'acceptComms', 'acceptSec'];
  const DOWNLOADS = ['dlCaf', 'dlWeap', 'dlNav', 'dlComms', 'dlElec'];
  const WIRES = ['wiresElec', 'wiresStorage', 'wiresAdmin', 'wiresNav', 'wiresCaf', 'wiresSec'];

  /* Definição das tarefas. dur = segundos que um bot leva em cada etapa. */
  const TASKS = {
    swipe: { name: 'Passar Cartão', kind: 'common', dur: [3.5], steps: () => ['swipe'] },
    wires: { name: 'Consertar Fiação', kind: 'common', dur: [3.5, 3.5, 3.5], steps: () => U.shuffle(WIRES).slice(0, 3) },
    calibrate: { name: 'Calibrar Distribuidor', kind: 'short', dur: [5], steps: () => ['calibrate'] },
    chart: { name: 'Traçar Rota', kind: 'short', dur: [4], steps: () => ['chart'] },
    stabilize: { name: 'Estabilizar Direção', kind: 'short', dur: [2.5], steps: () => ['stabilize'] },
    cleanO2: { name: 'Limpar Filtro de O2', kind: 'short', dur: [5], steps: () => ['cleanO2'] },
    divert: { name: 'Desviar Energia', kind: 'short', dur: [3, 1.5], steps: () => ['divert', U.pick(ACCEPT)] },
    shields: { name: 'Ativar Escudos', kind: 'short', visual: 'shields', dur: [3], steps: () => ['shields'] },
    manifolds: { name: 'Destravar Coletores', kind: 'short', dur: [5], steps: () => ['manifolds'] },
    reactor: { name: 'Ligar Reator', kind: 'long', dur: [13], steps: () => ['reactor'] },
    align: { name: 'Alinhar Motores', kind: 'long', dur: [3, 3], steps: () => ['alignUpper', 'alignLower'] },
    fuel: { name: 'Abastecer Motores', kind: 'long', dur: [4, 4, 4, 4], steps: () => ['fuelStorage', 'fuelUpper', 'fuelStorage', 'fuelLower'] },
    inspect: { name: 'Inspecionar Amostra', kind: 'long', wait: 60, dur: [3, 3], steps: () => ['inspect', 'inspect'] },
    scan: { name: 'Enviar Escaneamento', kind: 'long', visual: 'scan', dur: [10], steps: () => ['scan'] },
    upload: { name: 'Enviar Dados', kind: 'long', dur: [8, 8], steps: () => [U.pick(DOWNLOADS), 'upload'] },
    asteroids: { name: 'Destruir Asteroides', kind: 'long', visual: 'asteroids', dur: [15], steps: () => ['asteroids'] },
    garbage: { name: 'Esvaziar Lixo', kind: 'long', visual: 'garbage', visualStep: 1, dur: [3, 3], steps: () => [U.pick(['garbageCaf', 'garbageO2']), 'garbageStorage'] },
  };
  const TASK_KINDS = { common: [], long: [], short: [] };
  Object.keys(TASKS).forEach((k) => {
    TASKS[k].id = k;
    TASK_KINDS[TASKS[k].kind].push(k);
  });
  const VISUAL_NAMES = { scan: 'scan na MedBay', shields: 'os escudos', asteroids: 'os asteroides', garbage: 'o lixo' };

  function areaAtTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return null;
    const i = areaIdx[ty * W + tx];
    return i >= 0 ? AREAS[i] : null;
  }

  const M = {
    inCut, W, H, ROOMS, CORRIDORS, AREAS, AREA, DOORS, DOOR_ROOMS, VENTS, VENT, EMERGENCY, SECURITY, ADMIN_TABLE,
    CAMS, CAM_R, SAB_STATIONS, STATIONS, TASKS, TASK_KINDS, VISUAL_NAMES, ACCEPT, DOWNLOADS, floor, areaIdx, doorAt,
  };

  Object.keys(STATIONS).forEach((k) => {
    const s = STATIONS[k];
    s.id = k;
    const a = areaAtTile(Math.floor(s.x), Math.floor(s.y));
    s.area = a ? a.id : null;
  });

  M.isFloor = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && floor[ty * W + tx] === 1;
  M.isWalk = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
    const i = ty * W + tx;
    if (!floor[i]) return false;
    const d = doorAt[i];
    return d < 0 || !DOORS[d].closed;
  };
  M.walkAt = (x, y) => M.isWalk(Math.floor(x), Math.floor(y));
  M.opaque = (tx, ty) => !M.isWalk(tx, ty);

  /* Cantos em diagonal: a parede desenhada é uma reta lisa (du + dv = k + 0.5), não a escadinha de tiles.
     Visão e colisão usam essa mesma reta, para a luz e o personagem pararem onde a parede aparece. */
  const CH = [];
  const cutTile = new Uint8Array(W * H);
  ROOMS.forEach((r) => {
    if (!r.cut) return;
    const [x, y, w, h] = r.rect;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (inCut(r, xx, yy)) cutTile[yy * W + xx] = 1;
    for (const key of ['tl', 'tr', 'bl', 'br']) {
      const k = r.cut[key];
      if (!k) continue;
      const a = k + 0.5;
      const right = key[1] === 'r', bottom = key[0] === 'b';
      const sx = right ? -1 : 1, sy = bottom ? -1 : 1;
      const ox = right ? x + w : x, oy = bottom ? y + h : y;
      /* f(p) = (sx*(px-ox) + sy*(py-oy) - a) / √2: distância até a parede, positiva do lado de dentro */
      CH.push({ room: r, rect: r.rect, sx, sy, ox, oy, a, x1: ox + sx * a, y1: oy, x2: ox, y2: oy + sy * a });
    }
  });
  const chF = (c, px, py) => (c.sx * (px - c.ox) + c.sy * (py - c.oy) - c.a) * Math.SQRT1_2;
  const inRect = (rc, px, py) => px >= rc[0] && py >= rc[1] && px <= rc[0] + rc[2] && py <= rc[1] + rc[3];
  M.CHAMFERS = CH;
  M.isCutTile = (tx, ty) => tx >= 0 && ty >= 0 && tx < W && ty < H && cutTile[ty * W + tx] === 1;
  /* para raios de visão: tile de canto diagonal não bloqueia (quem bloqueia é a reta da parede) */
  M.opaqueRay = (tx, ty) => !M.isWalk(tx, ty) && !M.isCutTile(tx, ty);
  /* folga até a parede diagonal mais próxima (Infinity longe de cantos) */
  M.chamferGap = (px, py) => {
    let best = Infinity;
    for (const c of CH) if (inRect(c.rect, px, py)) best = Math.min(best, chF(c, px, py));
    return best;
  };
  /* o raio (x0,y0)->(dx,dy) atravessa alguma parede diagonal antes de maxT? devolve a distância */
  M.chamferHit = (x0, y0, dx, dy, maxT) => {
    let best = Infinity;
    for (const c of CH) {
      const rc = c.rect;
      const bx0 = Math.min(x0, x0 + dx * maxT), bx1 = Math.max(x0, x0 + dx * maxT), by0 = Math.min(y0, y0 + dy * maxT), by1 = Math.max(y0, y0 + dy * maxT);
      if (bx1 < rc[0] - 1 || bx0 > rc[0] + rc[2] + 1 || by1 < rc[1] - 1 || by0 > rc[1] + rc[3] + 1) continue;
      const f0 = chF(c, x0, y0);
      const df = (c.sx * dx + c.sy * dy) * Math.SQRT1_2;
      if (f0 < -0.05 || df >= 0) continue;
      const t = f0 / -df;
      if (t < 0 || t > maxT || t >= best) continue;
      /* só vale dentro do trecho desenhado da parede */
      const hx = x0 + dx * t, hy = y0 + dy * t;
      const u = ((hx - c.x1) * (c.x2 - c.x1) + (hy - c.y1) * (c.y2 - c.y1)) / ((c.x2 - c.x1) ** 2 + (c.y2 - c.y1) ** 2);
      if (u < -0.02 || u > 1.02) continue;
      best = t;
    }
    return best;
  };
  M.areaAt = (x, y) => areaAtTile(Math.floor(x), Math.floor(y)) || M.nearestArea(x, y);
  M.nearestArea = (x, y) => {
    let best = null, bd = 1e9;
    for (const a of AREAS) {
      for (const [rx, ry, rw, rh] of a.rects) {
        const dx = Math.max(rx - x, 0, x - (rx + rw));
        const dy = Math.max(ry - y, 0, y - (ry + rh));
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = a;
        }
      }
    }
    return best;
  };
  /* Sala "principal" de uma área (corredores contam como a sala vizinha mais próxima). */
  M.roomOf = (area, x, y) => {
    if (!area) return null;
    if (area.kind === 'room') return area;
    let best = null, bd = 1e9;
    for (const rid of area.near) {
      const r = AREA[rid];
      const d = U.d2(x, y, r.cx, r.cy);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  };
  M.isNear = (a, b) => {
    if (!a || !b) return false;
    if (a === b) return true;
    const A = AREA[a], B = AREA[b];
    return A.near.includes(b) || B.near.includes(a);
  };
  M.randomPointIn = (areaId) => {
    const a = AREA[areaId];
    for (let i = 0; i < 40; i++) {
      const [x, y, w, h] = U.pick(a.rects);
      const px = x + 1 + Math.random() * Math.max(0.1, w - 2);
      const py = y + 1 + Math.random() * Math.max(0.1, h - 2);
      /* com folga para o corpo do personagem (nada de ponto espremido no canto diagonal) */
      const r = 0.4;
      if (M.walkAt(px, py) && M.walkAt(px - r, py - r) && M.walkAt(px + r, py - r) && M.walkAt(px - r, py + r) && M.walkAt(px + r, py + r) && M.chamferGap(px, py) >= r) return { x: px, y: py };
    }
    return { x: a.cx, y: a.cy };
  };
  M.setDoorsClosed = (roomId, closed) => {
    DOORS.forEach((d) => {
      if (d.room === roomId) d.closed = closed;
    });
  };
  M.resetDoors = () => DOORS.forEach((d) => (d.closed = false));
  M.chatAlias = (areaId) => U.pick(AREA[areaId].chat);
  M.stationOf = (id) => STATIONS[id] || SAB_STATIONS[id];

  AU.Map = M;
})();

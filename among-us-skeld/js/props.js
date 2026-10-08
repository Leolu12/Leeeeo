/* Objetos da nave: forma no chão (colisão), sala e tipo de desenho. A colisão, as rotas dos bots e o desenho do mapa
   leem desta mesma lista, então o que aparece sólido na tela é sólido para todo mundo (fantasma atravessa).
   Coordenadas em tiles. rect: [x, y, w, h] (canto de cima à esquerda); circle: [cx, cy, r]. */
(function () {
  'use strict';
  const AU = window.AU;
  const M = AU.Map;
  const W = M.W, H = M.H;

  const PROPS = [
    /* Motor Superior: turbina grande, bocal de escape saindo pela parede da esquerda, bocal de combustível embaixo */
    { room: 'upperEngine', kind: 'engine', rect: [12, 9.6, 8.5, 5.8], p: { flip: false } },
    { room: 'upperEngine', kind: 'nozzle', rect: [8, 10.9, 4, 3.2] },
    { room: 'upperEngine', kind: 'fuelPort', rect: [17.8, 15.4, 1.4, 1], p: { down: true } },
    { room: 'upperEngine', kind: 'barrels', rect: [21.3, 17.6, 2.2, 1.9], solid: true },
    /* Motor Inferior: espelhado */
    { room: 'lowerEngine', kind: 'engine', rect: [12, 56.6, 8.5, 5.8], p: { flip: true } },
    { room: 'lowerEngine', kind: 'nozzle', rect: [8, 57.9, 4, 3.2] },
    { room: 'lowerEngine', kind: 'fuelPort', rect: [17.8, 55.6, 1.4, 1], p: { down: false } },
    { room: 'lowerEngine', kind: 'barrels', rect: [21.3, 52.5, 2.2, 1.9] },

    /* Reator: núcleo, dois tanques de refrigeração */
    { room: 'reactor', kind: 'reactorCore', circle: [6.4, 36, 3.0] },
    { room: 'reactor', kind: 'coolant', circle: [11.6, 29.6, 0.85] },
    { room: 'reactor', kind: 'coolant', circle: [11.6, 42.4, 0.85] },

    /* Segurança: mesa dos monitores, cadeira, servidores */
    { room: 'security', kind: 'monitorDesk', rect: [23.4, 28, 8.4, 1.05] },
    { room: 'security', kind: 'officeChair', circle: [27.5, 30.6, 0.45], solid: false },
    { room: 'security', kind: 'serverRack', rect: [32.75, 31, 1.2, 6] },

    { room: 'security', kind: 'lockers', rect: [22.05, 28.3, 1.1, 3.0] },
    { room: 'security', kind: 'cooler', circle: [25.4, 39.25, 0.38] },

    /* MedBay: quatro macas, analisador de amostras, armário de remédios */
    { room: 'medbay', kind: 'bed', rect: [38.3, 21.3, 3.6, 2.2] },
    { room: 'medbay', kind: 'bed', rect: [38.3, 24.1, 3.6, 2.2] },
    { room: 'medbay', kind: 'bed', rect: [38.3, 26.9, 3.6, 2.2] },
    { room: 'medbay', kind: 'bed', rect: [38.3, 29.7, 3.6, 2.2] },
    { room: 'medbay', kind: 'analyzer', rect: [49.3, 20, 2.7, 1.55] },
    { room: 'medbay', kind: 'cabinet', rect: [51, 24.2, 1, 3.4] },
    { room: 'medbay', kind: 'plant', circle: [51.2, 33.1, 0.45] },

    /* Cafeteria: mesa central com o botão, quatro mesas redondas, máquinas de lanche */
    { room: 'cafeteria', kind: 'buttonTable', circle: [69, 14, 2.0] },
    { room: 'cafeteria', kind: 'roundTable', circle: [63, 8.5, 1.5] },
    { room: 'cafeteria', kind: 'roundTable', circle: [75, 8.5, 1.5] },
    { room: 'cafeteria', kind: 'roundTable', circle: [63, 19.5, 1.5] },
    { room: 'cafeteria', kind: 'roundTable', circle: [75, 19.5, 1.5] },
    { room: 'cafeteria', kind: 'vending', rect: [61.3, 2, 2.1, 1.35], p: { c: '#3d6fb3', label: 'drink' } },
    { room: 'cafeteria', kind: 'vending', rect: [63.6, 2, 2.1, 1.35], p: { c: '#c0392b', label: 'snack' } },
    { room: 'cafeteria', kind: 'vending', rect: [65.9, 2, 2.1, 1.35], p: { c: '#2e9b5f', label: 'fruit' } },
    { room: 'cafeteria', kind: 'plant', circle: [79.2, 13.9, 0.45] },
    { room: 'cafeteria', kind: 'bin', circle: [58.6, 17.6, 0.35] },

    /* Armas: console de mira com a cadeira do atirador, caixas de munição */
    { room: 'weapons', kind: 'gunConsole', rect: [98.5, 7.8, 2, 1.35] },
    { room: 'weapons', kind: 'gunChair', circle: [99.5, 10.7, 0.5], solid: false },
    { room: 'weapons', kind: 'ammo', rect: [92.3, 12.9, 2.1, 1.7] },
    { room: 'weapons', kind: 'missiles', rect: [106.7, 11.4, 1.3, 4.2] },

    /* O2: jardineiras, cilindros de oxigênio, árvore */
    { room: 'o2', kind: 'planters', rect: [87, 22, 7.6, 1.6] },
    { room: 'o2', kind: 'o2Tank', rect: [86, 25, 1.1, 1.5] },
    { room: 'o2', kind: 'o2Tank', rect: [86, 26.7, 1.1, 1.5] },
    { room: 'o2', kind: 'tree', circle: [92.2, 27, 0.95] },

    /* Navegação: console de rota na parede da frente, pedestal de estabilização, mesa de estrelas, cadeiras */
    { room: 'navigation', kind: 'chartConsole', rect: [132.4, 34.4, 1.6, 2.2] },
    { room: 'navigation', kind: 'steerPedestal', rect: [130.2, 39, 1.2, 1.2] },
    { room: 'navigation', kind: 'starTable', circle: [123.4, 36, 1.3] },
    { room: 'navigation', kind: 'pilotChair', circle: [129.3, 34.2, 0.45], solid: false },
    { room: 'navigation', kind: 'pilotChair', circle: [128.4, 37.1, 0.45], solid: false },
    /* painéis colados no para-brisa diagonal (círculos seguem a diagonal) */
    { room: 'navigation', kind: 'navPanel', circle: [130.35, 30.55, 0.42], p: { diag: 'tr' } },
    { room: 'navigation', kind: 'navPanel', circle: [131.35, 31.55, 0.42], p: { diag: 'tr' } },
    { room: 'navigation', kind: 'navPanel', circle: [131.35, 40.45, 0.42], p: { diag: 'br' } },
    { room: 'navigation', kind: 'navPanel', circle: [130.35, 41.45, 0.42], p: { diag: 'br' } },

    /* Escudos: gerador hexagonal, console, capacitores */
    { room: 'shields', kind: 'shieldGen', circle: [98.6, 61.2, 1.8] },
    { room: 'shields', kind: 'shieldConsole', rect: [101, 57.05, 1, 0.85] },
    { room: 'shields', kind: 'capacitor', circle: [109.2, 57.6, 0.6] },
    { room: 'shields', kind: 'capacitor', circle: [109.2, 59.4, 0.6] },

    /* Comunicações: bancada de monitores, servidores, antena */
    { room: 'comms', kind: 'commsDesk', rect: [77, 71.9, 9, 2.1] },
    { room: 'comms', kind: 'serverRack', rect: [74, 65.4, 1.15, 5] },
    { room: 'comms', kind: 'dish', circle: [87.1, 65.1, 1.3] },
    { room: 'comms', kind: 'officeChair', circle: [79, 71.2, 0.42], solid: false },
    { room: 'comms', kind: 'officeChair', circle: [83.3, 71.2, 0.42], solid: false },
    { room: 'comms', kind: 'tapes', rect: [85.9, 62, 2.6, 0.9] },

    /* Depósito: pilhas de caixas nos quatro cantos, tambores, compactador de lixo, galões */
    { room: 'storage', kind: 'crates', rect: [56.4, 48.8, 4.5, 4.2], p: { n: 4 } },
    { room: 'storage', kind: 'crates', rect: [67.1, 46.4, 4, 3.1], p: { n: 3 } },
    { room: 'storage', kind: 'crates', rect: [69, 51, 2.3, 2.3], p: { n: 1 } },
    { room: 'storage', kind: 'crates', rect: [66.8, 60.8, 2.5, 1.9], p: { n: 2 } },
    { room: 'storage', kind: 'drums', rect: [55.6, 61.9, 2.3, 1.9] },
    { room: 'storage', kind: 'compactor', rect: [58.7, 65.1, 3.6, 0.9] },
    { room: 'storage', kind: 'fuelRack', rect: [71.05, 62.1, 0.95, 2.8] },

    /* Admin: mesa holográfica, arquivos */
    { room: 'admin', kind: 'adminTable', rect: [78.2, 38.2, 4.6, 2.6] },
    { room: 'admin', kind: 'filing', rect: [86.9, 37.1, 1.1, 3.6] },
    { room: 'admin', kind: 'plant', circle: [87.35, 35.0, 0.45] },

    /* Elétrica: transformador no meio, bancada de baterias */
    { room: 'electrical', kind: 'transformer', rect: [40.6, 42, 3.8, 3.2] },
    { room: 'electrical', kind: 'batteries', rect: [36, 45.8, 1.3, 2.2] },
  ];

  /* Consoles das estações presos na parede: o lado da parede mais perto decide a orientação. O que avança sobre o
     piso (menos de meio tile) também é sólido. Estações com móvel próprio ficam de fora. */
  const OWN = new Set(['scan', 'asteroids', 'fuelStorage', 'garbageStorage', 'inspect', 'chart', 'stabilize', 'shields', 'fuelUpper', 'fuelLower']);
  const ART = {};
  const artKind = (id) => {
    if (/^wires/.test(id)) return 'wires';
    if (/^dl/.test(id)) return 'download';
    if (id === 'upload') return 'upload';
    if (/^accept/.test(id)) return 'accept';
    if (/^garbage/.test(id)) return 'chute';
    if (/^align/.test(id)) return 'align';
    if (/^reactor[AB]$/.test(id)) return 'handScanner';
    if (/^o2[AB]$/.test(id)) return 'keypad';
    return { divert: 'divert', calibrate: 'calibrate', cleanO2: 'filter', manifolds: 'manifolds', reactor: 'simon', swipe: 'swipe', lights: 'lightsPanel', comms: 'radio' }[id] || 'terminal';
  };
  const wallSide = (x, y) => {
    let best = null;
    for (const [side, dx, dy] of [['top', 0, -1], ['bottom', 0, 1], ['left', -1, 0], ['right', 1, 0]]) {
      for (let d = 0.5; d <= 3; d += 0.5) {
        if (!M.isFloor(Math.floor(x + dx * d), Math.floor(y + dy * d))) {
          /* borda exata da parede (limite do tile) */
          const edge = dx ? (dx < 0 ? Math.floor(x + dx * d) + 1 : Math.floor(x + dx * d)) : dy < 0 ? Math.floor(y + dy * d) + 1 : Math.floor(y + dy * d);
          const dist = dx ? Math.abs(edge - x) : Math.abs(edge - y);
          if (!best || dist < best.dist) best = { side, edge, dist };
          break;
        }
      }
    }
    return best;
  };
  const addConsole = (id, st) => {
    if (OWN.has(id)) return;
    const ws = wallSide(st.x, st.y);
    if (!ws) return;
    const kind = artKind(id), wide = ['divert', 'simon', 'lightsPanel', 'radio', 'manifolds'].includes(kind) ? 1.5 : 1.15;
    const depth = Math.min(0.45, Math.max(0.15, ws.dist - 0.75));
    let rect;
    if (ws.side === 'top') rect = [st.x - wide / 2, ws.edge, wide, depth];
    else if (ws.side === 'bottom') rect = [st.x - wide / 2, ws.edge - depth, wide, depth];
    else if (ws.side === 'left') rect = [ws.edge, st.y - wide / 2, depth, wide];
    else rect = [ws.edge - depth, st.y - wide / 2, depth, wide];
    ART[id] = { kind, side: ws.side, edge: ws.edge, wide, depth, x: st.x, y: st.y };
    /* o filtro do O2 é uma grade no chão: não bloqueia */
    PROPS.push({ room: M.areaAt(st.x, st.y).id, kind: 'station', station: id, rect, solid: kind !== 'filter' && kind !== 'chute' });
  };
  for (const [id, st] of Object.entries(M.STATIONS)) addConsole(id, st);
  for (const [id, st] of Object.entries(M.SAB_STATIONS)) addConsole(id, st);
  M.STATION_ART = ART;

  PROPS.forEach((pr, i) => {
    pr.id = i;
    if (pr.solid == null) pr.solid = true;
    if (pr.rect) {
      const [x, y, w, h] = pr.rect;
      pr.box = [x, y, x + w, y + h];
    } else {
      const [cx, cy, r] = pr.circle;
      pr.box = [cx - r, cy - r, cx + r, cy + r];
    }
  });
  const SOLID = PROPS.filter((pr) => pr.solid);

  /* distância com sinal até a borda do objeto (negativa dentro) */
  const gapTo = (pr, x, y) => {
    if (pr.circle) return Math.hypot(x - pr.circle[0], y - pr.circle[1]) - pr.circle[2];
    const [x0, y0, x1, y1] = pr.box;
    const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1);
    if (dx || dy) return Math.hypot(dx, dy);
    return -Math.min(x - x0, x1 - x, y - y0, y1 - y);
  };

  /* índice por célula de 4 tiles, para a colisão não percorrer a lista toda */
  const CELL = 4, CW = Math.ceil(W / CELL), CH_ = Math.ceil(H / CELL);
  const cells = Array.from({ length: CW * CH_ }, () => []);
  for (const pr of SOLID) {
    const [x0, y0, x1, y1] = pr.box;
    for (let cy = Math.max(0, Math.floor((y0 - 1) / CELL)); cy <= Math.min(CH_ - 1, Math.floor((y1 + 1) / CELL)); cy++) {
      for (let cx = Math.max(0, Math.floor((x0 - 1) / CELL)); cx <= Math.min(CW - 1, Math.floor((x1 + 1) / CELL)); cx++) cells[cy * CW + cx].push(pr);
    }
  }
  /* folga até o objeto sólido mais próximo (Infinity se não há nada por perto) */
  M.propGap = (x, y) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= CW || cy >= CH_) return Infinity;
    let best = Infinity;
    for (const pr of cells[cy * CW + cx]) {
      const d = gapTo(pr, x, y);
      if (d < best) best = d;
    }
    return best;
  };
  /* tile que o personagem não consegue ocupar pelo centro: fora das rotas dos bots */
  const blocked = new Uint8Array(W * H);
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (M.propGap(tx + 0.5, ty + 0.5) < 0.3) blocked[ty * W + tx] = 1;
  M.isPass = (tx, ty) => M.isWalk(tx, ty) && !blocked[ty * W + tx];
  M.PROPS = PROPS;
  M.propAt = (x, y) => SOLID.find((pr) => gapTo(pr, x, y) < 0) || null;
})();

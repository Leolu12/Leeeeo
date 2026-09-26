/* Navegação: A* na grade, suavização de rota, linha de visão e polígono de visão. */
(function () {
  'use strict';
  const AU = window.AU;
  const U = AU.U, M = AU.Map;
  const W = M.W, H = M.H, N_ = W * H;

  const g = new Float32Array(N_);
  const came = new Int32Array(N_);
  const stamp = new Uint32Array(N_);
  const closed = new Uint32Array(N_);
  let gen = 1;
  const SQ2 = Math.SQRT2;
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];

  function nearestWalk(tx, ty, ghost) {
    const ok = ghost ? M.isFloor : M.isWalk;
    if (ok(tx, ty)) return [tx, ty];
    for (let r = 1; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (ok(tx + dx, ty + dy)) return [tx + dx, ty + dy];
      }
    }
    return null;
  }

  /* Distância "segura" de paredes: prefere o meio dos corredores. */
  const wallCost = new Float32Array(N_);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!M.isFloor(x, y)) continue;
    let near = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!M.isFloor(x + dx, y + dy)) near++;
    wallCost[y * W + x] = near ? 0.35 : 0;
  }

  function find(sx, sy, tx, ty, ghost) {
    const ok = ghost ? M.isFloor : M.isWalk;
    const s = nearestWalk(Math.floor(sx), Math.floor(sy), ghost);
    const t = nearestWalk(Math.floor(tx), Math.floor(ty), ghost);
    if (!s || !t) return null;
    gen++;
    const si = s[1] * W + s[0], ti = t[1] * W + t[0];
    const heap = new U.Heap();
    g[si] = 0;
    stamp[si] = gen;
    came[si] = -1;
    const hx = t[0], hy = t[1];
    const h = (x, y) => {
      const dx = Math.abs(x - hx), dy = Math.abs(y - hy);
      return Math.max(dx, dy) + (SQ2 - 1) * Math.min(dx, dy);
    };
    heap.push(h(s[0], s[1]), si);
    let found = false, guard = 0;
    while (heap.size && guard++ < 20000) {
      const cur = heap.pop();
      if (closed[cur] === gen) continue;
      closed[cur] = gen;
      if (cur === ti) {
        found = true;
        break;
      }
      const cx = cur % W, cy = (cur / W) | 0;
      for (const [dx, dy, c] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (!ok(nx, ny)) continue;
        if (dx && dy && (!ok(cx + dx, cy) || !ok(cx, cy + dy))) continue;
        const ni = ny * W + nx;
        if (closed[ni] === gen) continue;
        const ng = g[cur] + c + wallCost[ni];
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen;
          g[ni] = ng;
          came[ni] = cur;
          heap.push(ng + h(nx, ny), ni);
        }
      }
    }
    if (!found) return null;
    const pts = [];
    let c = ti;
    while (c !== -1 && c !== si) {
      pts.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 });
      c = came[c];
    }
    pts.reverse();
    if (pts.length) {
      pts[pts.length - 1] = { x: tx, y: ty };
      if (!ok(Math.floor(tx), Math.floor(ty))) pts[pts.length - 1] = { x: t[0] + 0.5, y: t[1] + 0.5 };
    }
    return smooth({ x: sx, y: sy }, pts, ghost);
  }

  function clearLine(ax, ay, bx, by, ghost) {
    const ok = ghost ? M.isFloor : M.isWalk;
    const d = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(d / 0.25));
    const r = 0.32;
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, y = ay + ((by - ay) * i) / n;
      if (!ok(Math.floor(x - r), Math.floor(y - r)) || !ok(Math.floor(x + r), Math.floor(y - r)) ||
          !ok(Math.floor(x - r), Math.floor(y + r)) || !ok(Math.floor(x + r), Math.floor(y + r))) return false;
    }
    return true;
  }

  function smooth(start, pts, ghost) {
    if (pts.length < 3) return pts;
    const out = [];
    let anchor = start, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !clearLine(anchor.x, anchor.y, pts[j].x, pts[j].y, ghost)) j--;
      out.push(pts[j]);
      anchor = pts[j];
      i = j + 1;
    }
    return out;
  }

  function pathLength(path, from) {
    if (!path) return Infinity;
    let L = 0, p = from;
    for (const q of path) {
      L += Math.hypot(q.x - p.x, q.y - p.y);
      p = q;
    }
    return L;
  }

  /* Linha de visão por DDA (Amanatides & Woo). Paredes e portas fechadas bloqueiam. */
  function los(x0, y0, x1, y1) {
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? tx + 1 - x0 : x0 - tx) * tdx : Infinity;
    let tmy = dy !== 0 ? (dy > 0 ? ty + 1 - y0 : y0 - ty) * tdy : Infinity;
    let guard = 0;
    while ((tx !== ex || ty !== ey) && guard++ < 400) {
      if (tmx < tmy) {
        tmx += tdx;
        tx += sx;
      } else {
        tmy += tdy;
        ty += sy;
      }
      if (M.opaque(tx, ty)) return false;
    }
    return true;
  }

  /* Distância até a parede ao longo de um raio (para o polígono de visão). */
  function rayDist(x0, y0, ang, maxD) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? tx + 1 - x0 : x0 - tx) * tdx : Infinity;
    let tmy = dy !== 0 ? (dy > 0 ? ty + 1 - y0 : y0 - ty) * tdy : Infinity;
    let t = 0;
    while (t < maxD) {
      if (tmx < tmy) {
        t = tmx;
        tmx += tdx;
        tx += sx;
      } else {
        t = tmy;
        tmy += tdy;
        ty += sy;
      }
      if (M.opaque(tx, ty)) return Math.min(t, maxD);
    }
    return maxD;
  }

  function visPoly(x, y, r, rays) {
    rays = rays || 220;
    const pts = [];
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const d = rayDist(x, y, a, r) + 0.12;
      pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
    }
    return pts;
  }

  AU.Nav = { find, clearLine, los, visPoly, rayDist, pathLength };
})();

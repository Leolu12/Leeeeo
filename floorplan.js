// ═══════════════════════════════════════════════════════════════
// FLOOR PLAN DATA
// ═══════════════════════════════════════════════════════════════
const ROOMS = [
  { id:'terraco-social',      name:'Terraço social',       type:'terrace',  x:30,   y:30,  w:370, h:205, defaultColor:'#d4edda', dims:{w:9.25,h:5.1} },
  { id:'living',              name:'Living',                type:'living',   x:30,   y:235, w:370, h:380, defaultColor:'#fff8e1', dims:{w:9.25,h:9.5} },
  { id:'gourmet',             name:'Gourmet',               type:'room',     x:30,   y:615, w:145, h:120, defaultColor:'#fff3e0', dims:{w:3.13,h:3.0} },
  { id:'jantar',              name:'Jantar',                type:'room',     x:175,  y:615, w:225, h:120, defaultColor:'#fff8e1', dims:{w:5.46,h:3.0} },
  { id:'hall-social',         name:'Hall social',           type:'hall',     x:400,  y:310, w:115, h:175, defaultColor:'#f5f5f5', dims:{w:2.9,h:4.4} },
  { id:'almoco',              name:'Almoço',                type:'room',     x:400,  y:485, w:115, h:130, defaultColor:'#fff8e1', dims:{w:2.9,h:3.25} },
  { id:'hall-lavabo',         name:'Hall / Lavabo',         type:'bathroom', x:400,  y:615, w:115, h:120, defaultColor:'#e8eaf6', dims:{w:2.9,h:3.0} },
  { id:'suite3',              name:'Suíte 3',               type:'bedroom',  x:515,  y:30,  w:185, h:280, defaultColor:'#e3f2fd', dims:{w:4.6,h:7.0} },
  { id:'banho3',              name:'Banho 3',               type:'bathroom', x:515,  y:30,  w:115, h:130, defaultColor:'#e8eaf6', dims:{w:2.9,h:3.25} },
  { id:'elevadores-sociais',  name:'Elevadores sociais',    type:'utility',  x:700,  y:30,  w:130, h:175, defaultColor:'#eceff1', dims:{w:3.25,h:4.4} },
  { id:'suite2',              name:'Suíte 2',               type:'bedroom',  x:830,  y:30,  w:185, h:280, defaultColor:'#e3f2fd', dims:{w:4.6,h:7.0} },
  { id:'banho2',              name:'Banho 2',               type:'bathroom', x:830,  y:30,  w:100, h:115, defaultColor:'#e8eaf6', dims:{w:2.5,h:2.9} },
  { id:'corredor',            name:'Corredor',              type:'hall',     x:515,  y:310, w:315, h:175, defaultColor:'#f5f5f5', dims:{w:7.9,h:4.4} },
  { id:'cozinha',             name:'Cozinha',               type:'kitchen',  x:515,  y:485, w:310, h:130, defaultColor:'#fff3e0', dims:{w:7.75,h:3.25} },
  { id:'area-servico',        name:'Área de serviço',       type:'service',  x:515,  y:615, w:115, h:120, defaultColor:'#f3e5f5', dims:{w:2.9,h:3.0} },
  { id:'banho-servico',       name:'Banho serviço',         type:'bathroom', x:630,  y:530, w:100, h:100, defaultColor:'#e8eaf6', dims:{w:2.5,h:2.5} },
  { id:'terraco-tecnico',     name:'Terraço técnico',       type:'terrace',  x:630,  y:630, w:100, h:105, defaultColor:'#d4edda', dims:{w:2.5,h:2.6} },
  { id:'hall-servico',        name:'Hall serviço',          type:'hall',     x:730,  y:530, w:100, h:205, defaultColor:'#f5f5f5', dims:{w:2.5,h:5.1} },
  { id:'area-tecnica',        name:'Área técnica',          type:'utility',  x:1015, y:30,  w:100, h:115, defaultColor:'#eceff1', dims:{w:2.5,h:2.9} },
  { id:'terraco-master',      name:'Terraço suíte master',  type:'terrace',  x:1015, y:145, w:195, h:165, defaultColor:'#d4edda', dims:{w:4.9,h:4.1} },
  { id:'suite-master',        name:'Suíte Master',          type:'bedroom',  x:1015, y:310, w:195, h:220, defaultColor:'#e3f2fd', dims:{w:4.9,h:5.5} },
  { id:'closet-sr',           name:'Closet Sr.',            type:'closet',   x:1015, y:530, w:97,  h:100, defaultColor:'#fce4ec', dims:{w:2.4,h:2.5} },
  { id:'banho-sr',            name:'Banho Sr.',             type:'bathroom', x:1115, y:30,  w:100, h:115, defaultColor:'#e8eaf6', dims:{w:2.5,h:2.9} },
  { id:'closet-sra',          name:'Closet Sra.',           type:'closet',   x:1115, y:145, w:100, h:165, defaultColor:'#fce4ec', dims:{w:2.5,h:4.1} },
  { id:'banho-sra',           name:'Banho Sra.',            type:'bathroom', x:1115, y:310, w:100, h:320, defaultColor:'#e8eaf6', dims:{w:2.5,h:8.0} },
  { id:'elevador-servico',    name:'Elevador de serviço',   type:'utility',  x:1112, y:530, w:103, h:100, defaultColor:'#eceff1', dims:{w:2.6,h:2.5} },
];

const ROOM_TYPE_COLORS = {
  terrace:'#c8e6c9', living:'#fff9c4', room:'#fff8e1', bedroom:'#bbdefb',
  bathroom:'#c5cae9', kitchen:'#ffe0b2', hall:'#f5f5f5', service:'#e1bee7',
  closet:'#f8bbd0', utility:'#cfd8dc',
};

// Outer boundary (clockwise)
const OUTER_BOUNDARY = [
  [30,30],[1215,30],[1215,630],[1112,630],[1112,535],
  [830,535],[830,735],[630,735],[630,630],[30,630],[30,30],
];

// ─────────────────────────────────────────────────────────────
// BUILD FLOOR PLAN SVG
// ─────────────────────────────────────────────────────────────
function buildFloorPlan(svg, roomColors, roomTextures={}, showLabels=true, showDims=false) {
  const ns = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';

  // ── DEFS ──────────────────────────────────────────────────
  const defs = document.createElementNS(ns, 'defs');

  // Hatch for terraces
  addPattern(defs, ns, 'hatch-terrace', 12, 12, 45, (p) => {
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1','0'); l.setAttribute('y1','0'); l.setAttribute('x2','0'); l.setAttribute('y2','12');
    l.setAttribute('stroke','rgba(0,0,0,0.07)'); l.setAttribute('stroke-width','4');
    p.appendChild(l);
  });

  // Floor textures
  addParquetPattern(defs, ns);
  addTilesPattern(defs, ns);
  addMarblePattern(defs, ns);
  addCarpetPattern(defs, ns);
  addConcretePattern(defs, ns);

  svg.appendChild(defs);

  // ── BACKGROUND FILL ───────────────────────────────────────
  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('x','0'); bg.setAttribute('y','0');
  bg.setAttribute('width','1250'); bg.setAttribute('height','780');
  bg.setAttribute('fill','transparent');
  svg.appendChild(bg);

  // ── ROOMS ─────────────────────────────────────────────────
  ROOMS.forEach(room => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('data-room-id', room.id);
    g.classList.add('room-group');

    const color = roomColors[room.id] || room.defaultColor || ROOM_TYPE_COLORS[room.type] || '#ffffff';

    // Base rect
    const rect = document.createElementNS(ns, 'rect');
    setAttrs(rect, { x:room.x, y:room.y, width:room.w, height:room.h, fill:color, stroke:'#2c2c2c', 'stroke-width':'1.5', 'class':'room', 'data-room-id':room.id });
    g.appendChild(rect);

    // Texture overlay
    const tex = roomTextures[room.id];
    if (tex && tex !== 'none') {
      const tr = document.createElementNS(ns, 'rect');
      setAttrs(tr, { x:room.x, y:room.y, width:room.w, height:room.h, fill:`url(#tex-${tex})`, 'pointer-events':'none', opacity:'0.35' });
      g.appendChild(tr);
    }

    // Terrace hatch
    if (room.type === 'terrace') {
      const hr = document.createElementNS(ns, 'rect');
      setAttrs(hr, { x:room.x, y:room.y, width:room.w, height:room.h, fill:'url(#hatch-terrace)', 'pointer-events':'none' });
      g.appendChild(hr);
    }

    // Label
    if (showLabels) {
      const words = room.name.split(' ');
      const cx = room.x + room.w / 2;
      const cy = room.y + room.h / 2;
      const fs = Math.max(8, Math.min(13, Math.min(room.w, room.h) / 4.5));

      if (words.length <= 2) {
        const t = makeSVGText(ns, cx, cy, room.name, fs, '#222', '600');
        t.classList.add('room-label'); t.setAttribute('pointer-events','none');
        g.appendChild(t);
      } else {
        // Split into 2 lines
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        const text = document.createElementNS(ns, 'text');
        text.setAttribute('text-anchor','middle'); text.setAttribute('font-family','Segoe UI,system-ui,sans-serif');
        text.setAttribute('font-size',fs); text.setAttribute('fill','#222'); text.setAttribute('font-weight','600');
        text.classList.add('room-label'); text.setAttribute('pointer-events','none');
        [line1, line2].forEach((line, i) => {
          const ts = document.createElementNS(ns, 'tspan');
          ts.setAttribute('x', cx);
          ts.setAttribute('dy', i === 0 ? -(fs * 0.6) : fs * 1.3);
          ts.textContent = line;
          text.appendChild(ts);
        });
        g.appendChild(text);
      }
    }

    // Dimensions
    if (showDims && room.dims) {
      const dt = makeSVGText(ns, room.x + room.w / 2, room.y + room.h - 5, `${room.dims.w}×${room.dims.h}m`, 8, '#666', 'normal');
      dt.classList.add('dimension-label'); dt.setAttribute('pointer-events','none');
      g.appendChild(dt);
    }

    svg.appendChild(g);
  });

  // ── OUTER BORDER ──────────────────────────────────────────
  const border = document.createElementNS(ns, 'polygon');
  border.setAttribute('points', OUTER_BOUNDARY.map(p => p.join(',')).join(' '));
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', '#1a1a1a');
  border.setAttribute('stroke-width', '5');
  border.setAttribute('pointer-events', 'none');
  svg.appendChild(border);

  // ── TITLE BLOCK ───────────────────────────────────────────
  const title = makeSVGText(ns, 625, 760, '290m²  ·  3 Suítes  ·  4 Vagas  ·  Planta Tipo', 11, '#666', 'normal');
  title.setAttribute('text-anchor', 'middle');
  title.setAttribute('pointer-events','none');
  svg.appendChild(title);
}

// ─────────────────────────────────────────────────────────────
// PATTERN HELPERS
// ─────────────────────────────────────────────────────────────
function addPattern(defs, ns, id, w, h, rotate, fillFn) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id, patternUnits:'userSpaceOnUse', width:w, height:h });
  if (rotate) p.setAttribute('patternTransform', `rotate(${rotate})`);
  fillFn(p);
  defs.appendChild(p);
}

function addParquetPattern(defs, ns) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id:'tex-parquet', patternUnits:'userSpaceOnUse', width:'20', height:'20' });
  [['0,0,20,20','rgba(150,100,50,0.8)'],['0,0,10,10','rgba(140,90,40,0.6)'],['10,10,10,10','rgba(140,90,40,0.6)']].forEach(([xywh, fill]) => {
    const r = document.createElementNS(ns, 'rect');
    const [x,y,w,h] = xywh.split(','); setAttrs(r,{x,y,width:w,height:h,fill}); p.appendChild(r);
  });
  const l1 = mkLine(ns,0,10,10,10,'rgba(100,60,20,0.4)',0.5); p.appendChild(l1);
  const l2 = mkLine(ns,10,0,10,10,'rgba(100,60,20,0.4)',0.5); p.appendChild(l2);
  defs.appendChild(p);
}

function addTilesPattern(defs, ns) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id:'tex-tiles', patternUnits:'userSpaceOnUse', width:'20', height:'20' });
  const r = document.createElementNS(ns, 'rect'); setAttrs(r,{x:'0',y:'0',width:'20',height:'20',fill:'rgba(200,200,200,0.5)'}); p.appendChild(r);
  p.appendChild(mkLine(ns,0,0,20,0,'rgba(150,150,150,0.6)',0.8));
  p.appendChild(mkLine(ns,0,0,0,20,'rgba(150,150,150,0.6)',0.8));
  p.appendChild(mkLine(ns,10,0,10,20,'rgba(180,180,180,0.3)',0.5));
  p.appendChild(mkLine(ns,0,10,20,10,'rgba(180,180,180,0.3)',0.5));
  defs.appendChild(p);
}

function addMarblePattern(defs, ns) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id:'tex-marble', patternUnits:'userSpaceOnUse', width:'40', height:'40' });
  const r = document.createElementNS(ns, 'rect'); setAttrs(r,{x:'0',y:'0',width:'40',height:'40',fill:'rgba(230,225,220,0.6)'}); p.appendChild(r);
  [[0,10,15,35,'rgba(200,190,180,0.4)'],[5,0,25,20,'rgba(190,185,175,0.3)'],[20,5,40,30,'rgba(210,200,195,0.35)']].forEach(([x1,y1,x2,y2,stroke]) => {
    const path = document.createElementNS(ns,'path');
    path.setAttribute('d',`M ${x1} ${y1} Q ${(x1+x2)/2+5} ${(y1+y2)/2-5} ${x2} ${y2}`);
    path.setAttribute('fill','none'); path.setAttribute('stroke',stroke); path.setAttribute('stroke-width','1.5');
    p.appendChild(path);
  });
  defs.appendChild(p);
}

function addCarpetPattern(defs, ns) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id:'tex-carpet', patternUnits:'userSpaceOnUse', width:'8', height:'8' });
  const r = document.createElementNS(ns, 'rect'); setAttrs(r,{x:'0',y:'0',width:'8',height:'8',fill:'rgba(180,160,200,0.4)'}); p.appendChild(r);
  ['0,0,8,8','0,8,8,0'].forEach(d => {
    const l = document.createElementNS(ns,'line');
    const [x1,y1,x2,y2]=d.split(','); setAttrs(l,{x1,y1,x2,y2,stroke:'rgba(150,130,170,0.3)','stroke-width':'0.5'}); p.appendChild(l);
  });
  defs.appendChild(p);
}

function addConcretePattern(defs, ns) {
  const p = document.createElementNS(ns, 'pattern');
  setAttrs(p, { id:'tex-concrete', patternUnits:'userSpaceOnUse', width:'30', height:'30' });
  const r = document.createElementNS(ns, 'rect'); setAttrs(r,{x:'0',y:'0',width:'30',height:'30',fill:'rgba(160,160,160,0.25)'}); p.appendChild(r);
  for(let i=0;i<5;i++){
    const c=document.createElementNS(ns,'circle');
    setAttrs(c,{cx:Math.random()*30,cy:Math.random()*30,r:'1',fill:'rgba(120,120,120,0.3)'}); p.appendChild(c);
  }
  defs.appendChild(p);
}

function mkLine(ns,x1,y1,x2,y2,stroke,sw) {
  const l=document.createElementNS(ns,'line');
  setAttrs(l,{x1,y1,x2,y2,stroke,'stroke-width':sw}); return l;
}

function setAttrs(el, attrs) { Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v)); }

function makeSVGText(ns, x, y, text, fontSize, fill, fontWeight) {
  const t = document.createElementNS(ns, 'text');
  setAttrs(t, { x, y, 'text-anchor':'middle', 'dominant-baseline':'middle', 'font-family':'Segoe UI,system-ui,sans-serif', 'font-size':fontSize, fill, 'font-weight':fontWeight });
  t.textContent = text;
  return t;
}

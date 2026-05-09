// Floor plan room definitions
// All coordinates in pixels at scale 1px = ~0.025m (40px/m)
// Total plan: ~28m x ~18m = ~1120x720px

const SCALE = 40; // px per meter

const ROOMS = [
  // ── LEFT: TERRAÇO SOCIAL ──────────────────────────────────────
  {
    id: 'terraco-social',
    name: 'Terraço social',
    type: 'terrace',
    x: 30, y: 30, w: 370, h: 205,
    defaultColor: '#d4edda',
    dims: { w: 9.25, h: 5.1 }
  },

  // ── LEFT: LIVING ──────────────────────────────────────────────
  {
    id: 'living',
    name: 'Living',
    type: 'living',
    x: 30, y: 235, w: 370, h: 380,
    defaultColor: '#fff8e1',
    dims: { w: 9.25, h: 12.16 }
  },

  // ── BOTTOM LEFT: GOURMET / JANTAR ─────────────────────────────
  {
    id: 'gourmet',
    name: 'Gourmet',
    type: 'room',
    x: 30, y: 615, w: 145, h: 120,
    defaultColor: '#fff3e0',
    dims: { w: 3.13, h: 3.0 }
  },
  {
    id: 'jantar',
    name: 'Jantar',
    type: 'room',
    x: 175, y: 615, w: 225, h: 120,
    defaultColor: '#fff8e1',
    dims: { w: 5.46, h: 3.0 }
  },

  // ── CENTRAL COLUMN: HALL SOCIAL / ALMOÇO / LAVABO ─────────────
  {
    id: 'hall-social',
    name: 'Hall social',
    type: 'hall',
    x: 400, y: 310, w: 115, h: 175,
    defaultColor: '#f5f5f5',
    dims: { w: 2.9, h: 4.4 }
  },
  {
    id: 'almoco',
    name: 'Almoço',
    type: 'room',
    x: 400, y: 485, w: 115, h: 130,
    defaultColor: '#fff8e1',
    dims: { w: 2.9, h: 3.25 }
  },
  {
    id: 'hall-lavabo',
    name: 'Hall / Lavabo',
    type: 'bathroom',
    x: 400, y: 615, w: 115, h: 120,
    defaultColor: '#e8eaf6',
    dims: { w: 2.9, h: 3.0 }
  },

  // ── BEDROOM WING TOP ──────────────────────────────────────────
  {
    id: 'suite3',
    name: 'Suíte 3',
    type: 'bedroom',
    x: 515, y: 30, w: 185, h: 280,
    defaultColor: '#e3f2fd',
    dims: { w: 4.6, h: 7.0 }
  },
  {
    id: 'banho3',
    name: 'Banho 3',
    type: 'bathroom',
    x: 515, y: 30, w: 115, h: 130,
    defaultColor: '#e8eaf6',
    dims: { w: 2.9, h: 3.25 }
  },
  {
    id: 'elevadores-sociais',
    name: 'Elevadores sociais',
    type: 'utility',
    x: 700, y: 30, w: 130, h: 175,
    defaultColor: '#eceff1',
    dims: { w: 3.25, h: 4.4 }
  },
  {
    id: 'suite2',
    name: 'Suíte 2',
    type: 'bedroom',
    x: 830, y: 30, w: 185, h: 280,
    defaultColor: '#e3f2fd',
    dims: { w: 4.6, h: 7.0 }
  },
  {
    id: 'banho2',
    name: 'Banho 2',
    type: 'bathroom',
    x: 830, y: 30, w: 100, h: 115,
    defaultColor: '#e8eaf6',
    dims: { w: 2.5, h: 2.9 }
  },

  // ── KITCHEN / SERVICE AREA ────────────────────────────────────
  {
    id: 'cozinha',
    name: 'Cozinha',
    type: 'kitchen',
    x: 515, y: 485, w: 310, h: 130,
    defaultColor: '#fff3e0',
    dims: { w: 7.75, h: 3.25 }
  },
  {
    id: 'area-servico',
    name: 'Área de serviço',
    type: 'service',
    x: 515, y: 615, w: 115, h: 120,
    defaultColor: '#f3e5f5',
    dims: { w: 2.9, h: 3.0 }
  },
  {
    id: 'banho-servico',
    name: 'Banho serviço',
    type: 'bathroom',
    x: 630, y: 530, w: 100, h: 100,
    defaultColor: '#e8eaf6',
    dims: { w: 2.5, h: 2.5 }
  },
  {
    id: 'terraco-tecnico',
    name: 'Terraço técnico',
    type: 'terrace',
    x: 630, y: 630, w: 100, h: 105,
    defaultColor: '#d4edda',
    dims: { w: 2.5, h: 2.6 }
  },

  // ── CORRIDOR (between kitchen and master wing) ────────────────
  {
    id: 'corredor',
    name: 'Corredor',
    type: 'hall',
    x: 515, y: 310, w: 315, h: 175,
    defaultColor: '#f5f5f5',
    dims: { w: 7.9, h: 4.4 }
  },

  // ── MASTER SUITE WING ─────────────────────────────────────────
  {
    id: 'area-tecnica',
    name: 'Área técnica',
    type: 'utility',
    x: 1015, y: 30, w: 100, h: 115,
    defaultColor: '#eceff1',
    dims: { w: 2.5, h: 2.9 }
  },
  {
    id: 'terraco-master',
    name: 'Terraço suíte master',
    type: 'terrace',
    x: 1015, y: 145, w: 195, h: 165,
    defaultColor: '#d4edda',
    dims: { w: 4.9, h: 4.1 }
  },
  {
    id: 'suite-master',
    name: 'Suíte Master',
    type: 'bedroom',
    x: 1015, y: 310, w: 195, h: 220,
    defaultColor: '#e3f2fd',
    dims: { w: 4.9, h: 5.5 }
  },
  {
    id: 'closet-sr',
    name: 'Closet Sr.',
    type: 'closet',
    x: 1015, y: 530, w: 97, h: 100,
    defaultColor: '#fce4ec',
    dims: { w: 2.4, h: 2.5 }
  },
  {
    id: 'banho-sr',
    name: 'Banho Sr.',
    type: 'bathroom',
    x: 1115, y: 30, w: 100, h: 115,
    defaultColor: '#e8eaf6',
    dims: { w: 2.5, h: 2.9 }
  },
  {
    id: 'closet-sra',
    name: 'Closet Sra.',
    type: 'closet',
    x: 1115, y: 145, w: 100, h: 165,
    defaultColor: '#fce4ec',
    dims: { w: 2.5, h: 4.1 }
  },
  {
    id: 'banho-sra',
    name: 'Banho Sra.',
    type: 'bathroom',
    x: 1115, y: 310, w: 100, h: 320,
    defaultColor: '#e8eaf6',
    dims: { w: 2.5, h: 8.0 }
  },

  // ── FAR RIGHT: SERVICE ────────────────────────────────────────
  {
    id: 'elevador-servico',
    name: 'Elevador de serviço',
    type: 'utility',
    x: 1112, y: 530, w: 103, h: 100,
    defaultColor: '#eceff1',
    dims: { w: 2.6, h: 2.5 }
  },
  {
    id: 'hall-servico',
    name: 'Hall serviço',
    type: 'hall',
    x: 730, y: 530, w: 100, h: 205,
    defaultColor: '#f5f5f5',
    dims: { w: 2.5, h: 5.1 }
  },
];

// Room type colors (default if not overridden)
const ROOM_TYPE_COLORS = {
  terrace:  '#c8e6c9',
  living:   '#fff9c4',
  room:     '#fff8e1',
  bedroom:  '#bbdefb',
  bathroom: '#c5cae9',
  kitchen:  '#ffe0b2',
  hall:     '#f5f5f5',
  service:  '#e1bee7',
  closet:   '#f8bbd0',
  utility:  '#cfd8dc',
};

// Outer boundary polygon (approximate outline of the apartment)
const OUTER_BOUNDARY = [
  [30, 30],
  [1215, 30],
  [1215, 630],
  [1112, 630],
  [1112, 535],
  [830, 535],
  [830, 735],
  [630, 735],
  [630, 630],
  [30, 630],
  [30, 30],
];

// Draw the floor plan into the SVG
function buildFloorPlan(svg, roomColors, showLabels, showDims) {
  svg.innerHTML = '';

  const ns = 'http://www.w3.org/2000/svg';

  // Defs (patterns, filters)
  const defs = document.createElementNS(ns, 'defs');

  // Hatch pattern for terraces
  const hatch = document.createElementNS(ns, 'pattern');
  hatch.setAttribute('id', 'hatch-terrace');
  hatch.setAttribute('patternUnits', 'userSpaceOnUse');
  hatch.setAttribute('width', '12');
  hatch.setAttribute('height', '12');
  hatch.setAttribute('patternTransform', 'rotate(45)');
  const hatchLine = document.createElementNS(ns, 'line');
  hatchLine.setAttribute('x1', '0'); hatchLine.setAttribute('y1', '0');
  hatchLine.setAttribute('x2', '0'); hatchLine.setAttribute('y2', '12');
  hatchLine.setAttribute('stroke', 'rgba(0,0,0,0.08)'); hatchLine.setAttribute('stroke-width', '4');
  hatch.appendChild(hatchLine);
  defs.appendChild(hatch);
  svg.appendChild(defs);

  // Draw rooms
  ROOMS.forEach(room => {
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('data-room-id', room.id);
    g.classList.add('room-group');

    // Room rect
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', room.x);
    rect.setAttribute('y', room.y);
    rect.setAttribute('width', room.w);
    rect.setAttribute('height', room.h);
    rect.classList.add('room');
    rect.setAttribute('data-room-id', room.id);

    const color = roomColors[room.id] || room.defaultColor || ROOM_TYPE_COLORS[room.type] || '#ffffff';
    rect.setAttribute('fill', color);
    rect.setAttribute('stroke', '#2c2c2c');
    rect.setAttribute('stroke-width', '2');

    if (room.type === 'terrace') {
      rect.setAttribute('fill', color);
    }

    g.appendChild(rect);

    // Hatch overlay for terraces
    if (room.type === 'terrace') {
      const overlay = document.createElementNS(ns, 'rect');
      overlay.setAttribute('x', room.x);
      overlay.setAttribute('y', room.y);
      overlay.setAttribute('width', room.w);
      overlay.setAttribute('height', room.h);
      overlay.setAttribute('fill', 'url(#hatch-terrace)');
      overlay.setAttribute('pointer-events', 'none');
      g.appendChild(overlay);
    }

    // Room label
    if (showLabels) {
      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', room.x + room.w / 2);
      text.setAttribute('y', room.y + room.h / 2);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'Segoe UI, system-ui, sans-serif');
      text.setAttribute('font-size', Math.max(9, Math.min(14, room.w / 8)));
      text.setAttribute('fill', '#222');
      text.setAttribute('font-weight', '600');
      text.classList.add('room-label');
      text.setAttribute('pointer-events', 'none');

      // Word wrap for long names
      const words = room.name.split(' ');
      if (words.length > 2 || room.name.length > 14) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(' ');
        const line2 = words.slice(mid).join(' ');
        const tspan1 = document.createElementNS(ns, 'tspan');
        tspan1.setAttribute('x', room.x + room.w / 2);
        tspan1.setAttribute('dy', '-7');
        tspan1.textContent = line1;
        const tspan2 = document.createElementNS(ns, 'tspan');
        tspan2.setAttribute('x', room.x + room.w / 2);
        tspan2.setAttribute('dy', '15');
        tspan2.textContent = line2;
        text.appendChild(tspan1);
        text.appendChild(tspan2);
      } else {
        text.textContent = room.name;
      }
      g.appendChild(text);
    }

    // Dimensions
    if (showDims && room.dims) {
      const dim = document.createElementNS(ns, 'text');
      dim.setAttribute('x', room.x + room.w / 2);
      dim.setAttribute('y', room.y + room.h - 6);
      dim.setAttribute('text-anchor', 'middle');
      dim.setAttribute('font-family', 'Segoe UI, system-ui, sans-serif');
      dim.setAttribute('font-size', '9');
      dim.setAttribute('fill', '#555');
      dim.classList.add('dimension-label');
      dim.setAttribute('pointer-events', 'none');
      dim.textContent = `${room.dims.w}m × ${room.dims.h}m`;
      g.appendChild(dim);
    }

    svg.appendChild(g);
  });

  // Draw thick outer border
  const border = document.createElementNS(ns, 'polygon');
  border.setAttribute('points', OUTER_BOUNDARY.map(p => p.join(',')).join(' '));
  border.setAttribute('fill', 'none');
  border.setAttribute('stroke', '#1a1a1a');
  border.setAttribute('stroke-width', '5');
  border.setAttribute('pointer-events', 'none');
  svg.appendChild(border);
}

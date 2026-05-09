// ─────────────────────────────────────────────────────────────
// APP STATE
// ─────────────────────────────────────────────────────────────
const state = {
  tool: 'select',           // select | wall | door | window | text | erase
  selectedFurniture: null,  // { type, w, h, label }
  selectedItemId: null,     // id of selected item on canvas
  selectedRoomId: null,     // id of selected SVG room
  items: [],                // placed items (furniture, walls, doors, text)
  roomColors: {},           // roomId -> color
  roomLabels: {},           // roomId -> custom label
  showLabels: true,
  showDims: false,
  zoom: 1,
  panX: 0,
  panY: 0,
  gridSize: 20,
  snapToGrid: false,
  wallThickness: 15,
  wallColor: '#444444',
  bgColor: '#f0ece4',
  svgWallColor: '#2c2c2c',
  gridVisible: true,
  // drawing state
  isDrawingWall: false,
  wallStart: null,
  isDragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
  isPanning: false,
  panStart: null,
  // undo/redo
  history: [],
  historyIndex: -1,
  // pending text
  pendingTextPos: null,
};

let itemCounter = 0;
const SVG_W = 1250;
const SVG_H = 780;

// ─────────────────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────────────────
const gridCanvas     = document.getElementById('grid-canvas');
const interCanvas    = document.getElementById('interaction-canvas');
const floorSVG       = document.getElementById('floor-plan-svg');
const canvasWrapper  = document.getElementById('canvas-wrapper');
const propertiesBar  = document.getElementById('properties-bar');
const toolbarHint    = document.getElementById('toolbar-hint');
const zoomLevelEl    = document.getElementById('zoom-level');

const ctx  = interCanvas.getContext('2d');
const gctx = gridCanvas.getContext('2d');

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
function init() {
  resizeCanvases();
  floorSVG.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
  floorSVG.setAttribute('width', SVG_W);
  floorSVG.setAttribute('height', SVG_H);
  renderAll();
  bindEvents();
  loadFromStorage();
}

function resizeCanvases() {
  const rect = canvasWrapper.getBoundingClientRect();
  gridCanvas.width = rect.width;
  gridCanvas.height = rect.height;
  interCanvas.width = rect.width;
  interCanvas.height = rect.height;
}

// ─────────────────────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────────────────────
function renderAll() {
  applyTransform();
  drawGrid();
  buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
  drawItems();
}

function applyTransform() {
  const t = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  floorSVG.style.transformOrigin = '0 0';
  floorSVG.style.transform = t;
  gridCanvas.style.transformOrigin = '0 0';
  // Grid and interaction canvas don't transform — they are drawn in screen space
}

function drawGrid() {
  const c = gridCanvas;
  gctx.clearRect(0, 0, c.width, c.height);
  if (!state.gridVisible) return;

  const gs = state.gridSize * state.zoom;
  const ox = state.panX % gs;
  const oy = state.panY % gs;

  gctx.strokeStyle = 'rgba(255,255,255,0.04)';
  gctx.lineWidth = 1;
  gctx.beginPath();
  for (let x = ox; x < c.width; x += gs) {
    gctx.moveTo(x, 0); gctx.lineTo(x, c.height);
  }
  for (let y = oy; y < c.height; y += gs) {
    gctx.moveTo(0, y); gctx.lineTo(c.width, y);
  }
  gctx.stroke();
}

function drawItems() {
  const c = interCanvas;
  ctx.clearRect(0, 0, c.width, c.height);

  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  state.items.forEach(item => {
    drawItem(item);
  });

  // Draw wall in progress
  if (state.isDrawingWall && state.wallStart) {
    drawWallPreview();
  }

  ctx.restore();
}

function drawItem(item) {
  const isSelected = item.id === state.selectedItemId;

  ctx.save();
  ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
  ctx.rotate((item.rotation || 0) * Math.PI / 180);
  if (item.flipH) ctx.scale(-1, 1);
  if (item.flipV) ctx.scale(1, -1);

  if (item.type === 'wall') {
    drawWallItem(item, isSelected);
  } else if (item.type === 'door') {
    drawDoorItem(item, isSelected);
  } else if (item.type === 'window') {
    drawWindowItem(item, isSelected);
  } else if (item.type === 'text') {
    drawTextItem(item, isSelected);
  } else {
    drawFurnitureItem(item, isSelected);
  }

  // Selection handles
  if (isSelected) {
    const hw = item.w / 2, hh = item.h / 2;
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 2 / state.zoom;
    ctx.setLineDash([5 / state.zoom, 3 / state.zoom]);
    ctx.strokeRect(-hw - 4, -hh - 4, item.w + 8, item.h + 8);
    ctx.setLineDash([]);
    // Corner handles
    ctx.fillStyle = '#c9a84c';
    [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 5 / state.zoom, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

function drawFurnitureItem(item, isSelected) {
  const hw = item.w / 2, hh = item.h / 2;

  // Shadow
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Body
  ctx.fillStyle = item.fillColor || getFurnitureColor(item.furnitureType);
  ctx.strokeStyle = isSelected ? '#c9a84c' : '#333';
  ctx.lineWidth = isSelected ? 2 / state.zoom : 1.5 / state.zoom;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, item.w, item.h, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.stroke();

  // Icon or details
  drawFurnitureDetails(item);

  // Label
  ctx.fillStyle = '#222';
  ctx.font = `${Math.max(8, Math.min(12, item.w / 8))}px Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.label || item.furnitureType, 0, 0);
}

function drawFurnitureDetails(item) {
  const hw = item.w / 2, hh = item.h / 2;
  const t = item.furnitureType;

  ctx.save();
  if (t === 'cama-casal' || t === 'cama-solteiro') {
    // Pillow
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-hw + 8, -hh + 8, item.w - 16, hh * 0.5);
    // Blanket
    ctx.fillStyle = 'rgba(100,150,255,0.15)';
    ctx.fillRect(-hw + 8, -hh + 8 + hh * 0.5, item.w - 16, hh * 0.8);
  } else if (t === 'sofa-3' || t === 'sofa-2') {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    const segments = t === 'sofa-3' ? 3 : 2;
    const sw = (item.w - 16) / segments;
    for (let i = 0; i < segments; i++) {
      ctx.fillRect(-hw + 8 + i * sw + 2, -hh + 8, sw - 4, item.h - 16);
    }
  } else if (t === 'tv') {
    ctx.fillStyle = '#111';
    ctx.fillRect(-hw + 4, -hh + 2, item.w - 8, item.h - 4);
    ctx.fillStyle = '#1a6aad';
    ctx.fillRect(-hw + 6, -hh + 4, item.w - 12, item.h - 8);
  } else if (t === 'piscina') {
    ctx.fillStyle = 'rgba(100,200,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, hw - 6, hh - 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (t === 'banheira') {
    ctx.fillStyle = 'rgba(150,200,255,0.3)';
    ctx.fillRect(-hw + 6, -hh + 6, item.w - 12, item.h - 20);
    // Faucet
    ctx.fillStyle = '#aaa';
    ctx.fillRect(-6, hh - 18, 12, 6);
  } else if (t === 'vaso') {
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.roundRect(-hw + 6, -hh + 4, item.w - 12, item.h - 10, 3);
    ctx.fill();
  }
  ctx.restore();
}

function getFurnitureColor(type) {
  const colors = {
    'sofa-3': '#d7ccc8', 'sofa-2': '#d7ccc8', 'poltrona': '#bcaaa4',
    'mesa-centro': '#a5895e', 'tv': '#37474f', 'rack': '#5d4037',
    'cama-casal': '#b0bec5', 'cama-solteiro': '#b0bec5',
    'guarda-roupa': '#795548', 'criado-mudo': '#8d6e63',
    'escrivaninha': '#8d6e63',
    'mesa-jantar-6': '#a5895e', 'mesa-jantar-4': '#a5895e',
    'cadeira': '#8d6e63', 'bancada': '#90a4ae', 'ilha': '#90a4ae',
    'fogao': '#757575', 'geladeira': '#bdbdbd',
    'banheira': '#b3e5fc', 'chuveiro': '#e1f5fe',
    'vaso': '#f5f5f5', 'pia': '#e0e0e0',
    'piscina': '#4fc3f7', 'churrasqueira': '#78909c',
    'espreguicadeira': '#d7ccc8', 'vaso-planta': '#66bb6a',
    'atv': '#ff8f00', 'moto': '#37474f', 'carro': '#546e7a',
  };
  return colors[type] || '#c8a96e';
}

function drawWallItem(item, isSelected) {
  const hw = item.w / 2, hh = item.h / 2;
  ctx.fillStyle = item.fillColor || state.svgWallColor;
  ctx.strokeStyle = isSelected ? '#c9a84c' : item.fillColor || state.svgWallColor;
  ctx.lineWidth = 1;
  ctx.fillRect(-hw, -hh, item.w, item.h);
}

function drawDoorItem(item, isSelected) {
  const hw = item.w / 2, hh = item.h / 2;
  ctx.strokeStyle = isSelected ? '#c9a84c' : '#555';
  ctx.lineWidth = 2 / state.zoom;
  // Door frame
  ctx.strokeRect(-hw, -hh, item.w, item.h);
  // Arc
  ctx.beginPath();
  ctx.arc(-hw, -hh, item.w, 0, Math.PI / 2);
  ctx.stroke();
}

function drawWindowItem(item, isSelected) {
  const hw = item.w / 2, hh = item.h / 2;
  ctx.strokeStyle = isSelected ? '#c9a84c' : '#4fc3f7';
  ctx.lineWidth = 3 / state.zoom;
  ctx.strokeRect(-hw, -hh, item.w, item.h);
  // Glass lines
  ctx.lineWidth = 1 / state.zoom;
  ctx.beginPath();
  ctx.moveTo(-hw, 0); ctx.lineTo(hw, 0);
  ctx.stroke();
}

function drawTextItem(item, isSelected) {
  ctx.fillStyle = item.textColor || '#eaeaea';
  ctx.font = `${item.fontSize || 14}px Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.text || '', 0, 0);
  if (isSelected) {
    const m = ctx.measureText(item.text || '');
    const tw = m.width + 8;
    const th = (item.fontSize || 14) + 8;
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(-tw / 2, -th / 2, tw, th);
    ctx.setLineDash([]);
  }
}

function drawWallPreview() {
  if (!state.wallStart) return;
  const end = state._mousePos || state.wallStart;
  ctx.strokeStyle = state.wallColor;
  ctx.lineWidth = state.wallThickness;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(state.wallStart.x, state.wallStart.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────
// COORDINATE HELPERS
// ─────────────────────────────────────────────────────────────
function screenToWorld(sx, sy) {
  return {
    x: (sx - state.panX) / state.zoom,
    y: (sy - state.panY) / state.zoom,
  };
}

function snapCoord(v) {
  if (!state.snapToGrid) return v;
  return Math.round(v / state.gridSize) * state.gridSize;
}

function getCanvasPos(e) {
  const rect = interCanvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

// ─────────────────────────────────────────────────────────────
// HIT TESTING
// ─────────────────────────────────────────────────────────────
function hitTestItems(wx, wy) {
  // Test in reverse (top items first)
  for (let i = state.items.length - 1; i >= 0; i--) {
    const item = state.items[i];
    if (item.type === 'wall') {
      // Line hit test
      const dx = item.x2 - item.x, dy = item.y2 - item.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const t = ((wx - item.x) * dx + (wy - item.y) * dy) / (len * len);
      const clampedT = Math.max(0, Math.min(1, t));
      const px = item.x + clampedT * dx;
      const py = item.y + clampedT * dy;
      const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2);
      if (dist < (item.w / 2 + 5)) return item;
    } else {
      if (wx >= item.x && wx <= item.x + item.w &&
          wy >= item.y && wy <= item.y + item.h) return item;
    }
  }
  return null;
}

function hitTestRooms(wx, wy) {
  for (let i = ROOMS.length - 1; i >= 0; i--) {
    const r = ROOMS[i];
    if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) return r;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// PLACE FURNITURE
// ─────────────────────────────────────────────────────────────
function placeFurniture(wx, wy) {
  const sf = state.selectedFurniture;
  if (!sf) return;

  const x = snapCoord(wx - sf.w / 2);
  const y = snapCoord(wy - sf.h / 2);

  pushHistory();
  state.items.push({
    id: ++itemCounter,
    type: 'furniture',
    furnitureType: sf.type,
    label: sf.label,
    x, y,
    w: sf.w,
    h: sf.h,
    rotation: 0,
    flipH: false,
    flipV: false,
  });
  drawItems();
}

// ─────────────────────────────────────────────────────────────
// HISTORY
// ─────────────────────────────────────────────────────────────
function pushHistory() {
  const snapshot = JSON.stringify({ items: state.items, roomColors: state.roomColors, roomLabels: state.roomLabels });
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(snapshot);
  state.historyIndex = state.history.length - 1;
  // Cap at 50 steps
  if (state.history.length > 50) {
    state.history.shift();
    state.historyIndex--;
  }
}

function undo() {
  if (state.historyIndex <= 0) return;
  state.historyIndex--;
  restoreSnapshot(state.history[state.historyIndex]);
}

function redo() {
  if (state.historyIndex >= state.history.length - 1) return;
  state.historyIndex++;
  restoreSnapshot(state.history[state.historyIndex]);
}

function restoreSnapshot(snapshot) {
  const data = JSON.parse(snapshot);
  state.items = data.items;
  state.roomColors = data.roomColors;
  state.roomLabels = data.roomLabels;
  state.selectedItemId = null;
  renderAll();
  updatePropertiesBar();
}

// ─────────────────────────────────────────────────────────────
// SELECT / DESELECT
// ─────────────────────────────────────────────────────────────
function selectItem(item) {
  state.selectedItemId = item ? item.id : null;
  state.selectedRoomId = null;
  updatePropertiesBar();
  // Deselect SVG rooms
  document.querySelectorAll('.room').forEach(r => r.classList.remove('selected-room'));
  drawItems();
}

function selectRoom(room) {
  state.selectedRoomId = room ? room.id : null;
  state.selectedItemId = null;
  updatePropertiesBar();
  document.querySelectorAll('.room').forEach(r => {
    r.classList.toggle('selected-room', r.getAttribute('data-room-id') === state.selectedRoomId);
  });
  if (room) {
    document.getElementById('room-label-input').value = state.roomLabels[room.id] || room.name;
  }
  drawItems();
}

function updatePropertiesBar() {
  if (state.selectedItemId !== null) {
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (item) {
      propertiesBar.style.display = 'flex';
      document.getElementById('prop-label').textContent = item.label || item.type;
      document.getElementById('prop-rotation').value = item.rotation || 0;
      document.getElementById('prop-width').value = Math.round(item.w);
      document.getElementById('prop-height').value = Math.round(item.h);
      return;
    }
  }
  propertiesBar.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────
// TOOL STATE
// ─────────────────────────────────────────────────────────────
function setTool(tool) {
  state.tool = tool;
  state.isDrawingWall = false;
  state.wallStart = null;
  // Update mode buttons
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`tool-${tool}`);
  if (btn) btn.classList.add('active');

  const hints = {
    select: 'Clique para selecionar · Arraste para mover',
    wall: 'Clique e arraste para desenhar uma parede',
    door: 'Clique na planta para posicionar uma porta',
    window: 'Clique na planta para posicionar uma janela',
    text: 'Clique na planta para adicionar um texto',
    erase: 'Clique em um item para apagá-lo',
  };
  toolbarHint.textContent = hints[tool] || '';

  const cursors = { select: 'default', wall: 'crosshair', door: 'crosshair', window: 'crosshair', text: 'text', erase: 'not-allowed' };
  interCanvas.style.cursor = cursors[tool] || 'default';
}

// ─────────────────────────────────────────────────────────────
// CANVAS EVENTS
// ─────────────────────────────────────────────────────────────
function bindEvents() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });

  // Tool buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.id.replace('tool-', '')));
  });

  // Furniture items
  document.querySelectorAll('.furniture-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.furniture-item').forEach(i => i.classList.remove('selected-tool'));
      item.classList.add('selected-tool');
      state.selectedFurniture = {
        type: item.dataset.type,
        w: parseInt(item.dataset.w),
        h: parseInt(item.dataset.h),
        label: item.dataset.label,
      };
      setTool('select');
      toolbarHint.textContent = `Clique na planta para posicionar: ${item.dataset.label}`;
      interCanvas.style.cursor = 'copy';
    });
  });

  // Sidebar wall tool buttons
  document.getElementById('btn-draw-wall').addEventListener('click', () => setTool('wall'));
  document.getElementById('btn-draw-door').addEventListener('click', () => setTool('door'));
  document.getElementById('btn-draw-window').addEventListener('click', () => setTool('window'));
  document.getElementById('btn-delete-selected').addEventListener('click', deleteSelected);

  // Mode buttons also set tab
  document.getElementById('tool-wall').addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="paredes"]').classList.add('active');
    document.getElementById('tab-paredes').classList.add('active');
  });

  // Canvas mouse events
  interCanvas.addEventListener('mousedown', onMouseDown);
  interCanvas.addEventListener('mousemove', onMouseMove);
  interCanvas.addEventListener('mouseup', onMouseUp);
  interCanvas.addEventListener('wheel', onWheel, { passive: false });
  interCanvas.addEventListener('contextmenu', e => e.preventDefault());

  // Room selection on SVG
  floorSVG.addEventListener('click', onSVGClick);

  // Properties bar
  document.getElementById('prop-rotation').addEventListener('input', updateSelectedItemProp);
  document.getElementById('prop-width').addEventListener('input', updateSelectedItemProp);
  document.getElementById('prop-height').addEventListener('input', updateSelectedItemProp);
  document.getElementById('prop-flip-h').addEventListener('click', () => { modifySelectedItem(i => i.flipH = !i.flipH); });
  document.getElementById('prop-flip-v').addEventListener('click', () => { modifySelectedItem(i => i.flipV = !i.flipV); });
  document.getElementById('prop-duplicate').addEventListener('click', duplicateSelected);
  document.getElementById('prop-delete').addEventListener('click', deleteSelected);

  // Room customization
  document.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      document.getElementById('room-custom-color').value = sw.dataset.color;
    });
  });
  document.getElementById('btn-apply-room-color').addEventListener('click', applyRoomColor);
  document.getElementById('btn-apply-room-label').addEventListener('click', applyRoomLabel);
  document.getElementById('toggle-room-labels').addEventListener('change', e => {
    state.showLabels = e.target.checked;
    buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
  });
  document.getElementById('toggle-dimensions').addEventListener('change', e => {
    state.showDims = e.target.checked;
    buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
  });

  // Config
  document.getElementById('cfg-bg-color').addEventListener('input', e => {
    state.bgColor = e.target.value;
    document.getElementById('canvas-area').style.background = e.target.value;
  });
  document.getElementById('cfg-wall-color').addEventListener('input', e => {
    state.svgWallColor = e.target.value;
    buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
  });
  document.getElementById('cfg-grid').addEventListener('change', e => {
    state.gridVisible = e.target.checked;
    drawGrid();
  });
  document.getElementById('cfg-snap').addEventListener('change', e => {
    state.snapToGrid = e.target.checked;
  });
  document.getElementById('cfg-grid-size').addEventListener('input', e => {
    state.gridSize = parseInt(e.target.value) || 20;
    drawGrid();
  });

  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoom(1.2));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoom(0.8));
  document.getElementById('btn-zoom-reset').addEventListener('click', resetZoom);

  // Header actions
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Apagar todos os itens colocados?')) {
      pushHistory();
      state.items = [];
      state.roomColors = {};
      state.roomLabels = {};
      state.selectedItemId = null;
      state.selectedRoomId = null;
      renderAll();
    }
  });
  document.getElementById('btn-export').addEventListener('click', exportPNG);

  // Save/load
  document.getElementById('btn-save').addEventListener('click', saveToStorage);
  document.getElementById('btn-load').addEventListener('click', loadFromStorage);

  // Text modal
  document.getElementById('text-confirm').addEventListener('click', confirmText);
  document.getElementById('text-cancel').addEventListener('click', () => {
    document.getElementById('text-modal').style.display = 'none';
    state.pendingTextPos = null;
  });

  // Wall tool props
  document.getElementById('wall-thickness').addEventListener('change', e => { state.wallThickness = parseInt(e.target.value); });
  document.getElementById('wall-color').addEventListener('input', e => { state.wallColor = e.target.value; });

  // Keyboard shortcuts
  document.addEventListener('keydown', onKeyDown);

  // Resize
  window.addEventListener('resize', () => { resizeCanvases(); renderAll(); });

  // Initialize tool
  setTool('select');
  pushHistory(); // initial state
}

// ─────────────────────────────────────────────────────────────
// MOUSE EVENTS
// ─────────────────────────────────────────────────────────────
function onMouseDown(e) {
  if (e.button === 1 || e.button === 2 || e.altKey) {
    // Middle click or Alt = pan
    state.isPanning = true;
    state.panStart = { x: e.clientX - state.panX, y: e.clientY - state.panY };
    interCanvas.style.cursor = 'grabbing';
    return;
  }

  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x, sp.y);
  wp.x = snapCoord(wp.x);
  wp.y = snapCoord(wp.y);

  if (state.tool === 'select') {
    if (state.selectedFurniture) {
      // Place furniture
      placeFurniture(wp.x, wp.y);
      return;
    }
    const hit = hitTestItems(wp.x, wp.y);
    if (hit) {
      selectItem(hit);
      state.isDragging = true;
      state.dragOffsetX = wp.x - hit.x;
      state.dragOffsetY = wp.y - hit.y;
    } else {
      selectItem(null);
    }
  } else if (state.tool === 'wall') {
    if (!state.isDrawingWall) {
      state.isDrawingWall = true;
      state.wallStart = { x: wp.x, y: wp.y };
    } else {
      // Finish wall
      finishWall(wp);
    }
  } else if (state.tool === 'door') {
    placeDoorOrWindow('door', wp.x, wp.y);
  } else if (state.tool === 'window') {
    placeDoorOrWindow('window', wp.x, wp.y);
  } else if (state.tool === 'text') {
    state.pendingTextPos = wp;
    document.getElementById('text-modal').style.display = 'flex';
    document.getElementById('text-input').value = '';
    document.getElementById('text-input').focus();
  } else if (state.tool === 'erase') {
    const hit = hitTestItems(wp.x, wp.y);
    if (hit) {
      pushHistory();
      state.items = state.items.filter(i => i.id !== hit.id);
      state.selectedItemId = null;
      renderAll();
    }
  }
}

function onMouseMove(e) {
  if (state.isPanning) {
    state.panX = e.clientX - state.panStart.x;
    state.panY = e.clientY - state.panStart.y;
    renderAll();
    return;
  }

  const sp = getCanvasPos(e);
  const wp = screenToWorld(sp.x, sp.y);
  state._mousePos = { x: snapCoord(wp.x), y: snapCoord(wp.y) };

  if (state.isDrawingWall) {
    drawItems();
    return;
  }

  if (state.isDragging && state.selectedItemId !== null) {
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (item) {
      item.x = snapCoord(wp.x - state.dragOffsetX);
      item.y = snapCoord(wp.y - state.dragOffsetY);
      drawItems();
    }
  }

  // Cursor feedback
  if (state.tool === 'select' && !state.selectedFurniture) {
    const wp2 = screenToWorld(sp.x, sp.y);
    const hit = hitTestItems(wp2.x, wp2.y);
    interCanvas.style.cursor = hit ? (state.isDragging ? 'grabbing' : 'grab') : 'default';
  }
}

function onMouseUp(e) {
  if (state.isPanning) {
    state.isPanning = false;
    interCanvas.style.cursor = state.tool === 'select' ? 'default' : 'crosshair';
    return;
  }

  if (state.isDragging) {
    state.isDragging = false;
    pushHistory();
  }
}

function onSVGClick(e) {
  const roomEl = e.target.closest('[data-room-id]');
  if (roomEl) {
    const roomId = roomEl.getAttribute('data-room-id');
    const room = ROOMS.find(r => r.id === roomId);
    if (room) {
      selectRoom(room);
      // Switch to rooms tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('[data-tab="quartos"]').classList.add('active');
      document.getElementById('tab-quartos').classList.add('active');
    }
  } else {
    selectRoom(null);
  }
}

function onWheel(e) {
  e.preventDefault();
  const sp = getCanvasPos(e);
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  zoomAt(factor, sp.x, sp.y);
}

// ─────────────────────────────────────────────────────────────
// ZOOM / PAN
// ─────────────────────────────────────────────────────────────
function zoom(factor) {
  zoomAt(factor, interCanvas.width / 2, interCanvas.height / 2);
}

function zoomAt(factor, cx, cy) {
  const newZoom = Math.min(Math.max(state.zoom * factor, 0.2), 5);
  const ratio = newZoom / state.zoom;
  state.panX = cx - ratio * (cx - state.panX);
  state.panY = cy - ratio * (cy - state.panY);
  state.zoom = newZoom;
  zoomLevelEl.textContent = Math.round(state.zoom * 100) + '%';
  renderAll();
}

function resetZoom() {
  // Fit floor plan in view
  const rect = canvasWrapper.getBoundingClientRect();
  const scaleX = (rect.width - 40) / SVG_W;
  const scaleY = (rect.height - 40) / SVG_H;
  state.zoom = Math.min(scaleX, scaleY, 1);
  state.panX = (rect.width - SVG_W * state.zoom) / 2;
  state.panY = (rect.height - SVG_H * state.zoom) / 2;
  zoomLevelEl.textContent = Math.round(state.zoom * 100) + '%';
  renderAll();
}

// ─────────────────────────────────────────────────────────────
// WALLS, DOORS, WINDOWS
// ─────────────────────────────────────────────────────────────
function finishWall(wp) {
  if (!state.wallStart) return;
  const s = state.wallStart;
  const dx = wp.x - s.x, dy = wp.y - s.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 5) { state.isDrawingWall = false; state.wallStart = null; return; }

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  pushHistory();
  state.items.push({
    id: ++itemCounter,
    type: 'wall',
    x: s.x,
    y: s.y - state.wallThickness / 2,
    x2: wp.x,
    y2: wp.y,
    w: len,
    h: state.wallThickness,
    rotation: angle,
    fillColor: state.wallColor,
    flipH: false,
    flipV: false,
  });

  state.wallStart = wp; // chain walls
  drawItems();
}

function placeDoorOrWindow(type, wx, wy) {
  pushHistory();
  const w = type === 'door' ? 80 : 90;
  const h = type === 'door' ? 80 : 15;
  state.items.push({
    id: ++itemCounter,
    type,
    label: type === 'door' ? 'Porta' : 'Janela',
    x: snapCoord(wx - w / 2),
    y: snapCoord(wy - h / 2),
    w, h,
    rotation: 0,
    flipH: false,
    flipV: false,
  });
  drawItems();
}

// ─────────────────────────────────────────────────────────────
// TEXT
// ─────────────────────────────────────────────────────────────
function confirmText() {
  const text = document.getElementById('text-input').value.trim();
  if (!text || !state.pendingTextPos) {
    document.getElementById('text-modal').style.display = 'none';
    return;
  }
  pushHistory();
  const pos = state.pendingTextPos;
  const fontSize = parseInt(document.getElementById('text-size').value) || 14;
  const textColor = document.getElementById('text-color').value;

  state.items.push({
    id: ++itemCounter,
    type: 'text',
    text,
    label: text,
    x: pos.x - 60,
    y: pos.y - fontSize / 2,
    w: 120,
    h: fontSize + 8,
    fontSize,
    textColor,
    rotation: 0,
    flipH: false,
    flipV: false,
  });
  document.getElementById('text-modal').style.display = 'none';
  state.pendingTextPos = null;
  drawItems();
}

// ─────────────────────────────────────────────────────────────
// ROOM CUSTOMIZATION
// ─────────────────────────────────────────────────────────────
function applyRoomColor() {
  if (!state.selectedRoomId) { alert('Clique em um cômodo primeiro!'); return; }
  const color = document.getElementById('room-custom-color').value;
  pushHistory();
  state.roomColors[state.selectedRoomId] = color;
  buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
  // Re-select
  document.querySelectorAll('.room').forEach(r => {
    r.classList.toggle('selected-room', r.getAttribute('data-room-id') === state.selectedRoomId);
  });
}

function applyRoomLabel() {
  if (!state.selectedRoomId) { alert('Clique em um cômodo primeiro!'); return; }
  const label = document.getElementById('room-label-input').value.trim();
  pushHistory();
  state.roomLabels[state.selectedRoomId] = label;
  // Update the room name display in SVG
  const room = ROOMS.find(r => r.id === state.selectedRoomId);
  if (room && label) room.name = label;
  buildFloorPlan(floorSVG, state.roomColors, state.showLabels, state.showDims);
}

// ─────────────────────────────────────────────────────────────
// ITEM MANIPULATION
// ─────────────────────────────────────────────────────────────
function modifySelectedItem(fn) {
  const item = state.items.find(i => i.id === state.selectedItemId);
  if (!item) return;
  pushHistory();
  fn(item);
  drawItems();
}

function updateSelectedItemProp() {
  const item = state.items.find(i => i.id === state.selectedItemId);
  if (!item) return;
  item.rotation = parseInt(document.getElementById('prop-rotation').value) || 0;
  item.w = parseInt(document.getElementById('prop-width').value) || item.w;
  item.h = parseInt(document.getElementById('prop-height').value) || item.h;
  drawItems();
}

function duplicateSelected() {
  const item = state.items.find(i => i.id === state.selectedItemId);
  if (!item) return;
  pushHistory();
  const copy = { ...item, id: ++itemCounter, x: item.x + 20, y: item.y + 20 };
  state.items.push(copy);
  selectItem(copy);
  drawItems();
}

function deleteSelected() {
  if (state.selectedItemId !== null) {
    pushHistory();
    state.items = state.items.filter(i => i.id !== state.selectedItemId);
    state.selectedItemId = null;
    updatePropertiesBar();
    drawItems();
  }
}

// ─────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────
function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const key = e.key.toLowerCase();

  if (e.ctrlKey || e.metaKey) {
    if (key === 'z') { e.preventDefault(); undo(); }
    if (key === 'y') { e.preventDefault(); redo(); }
    if (key === 'd') { e.preventDefault(); duplicateSelected(); }
    return;
  }

  if (key === 'v' || key === 'escape') { setTool('select'); state.selectedFurniture = null; document.querySelectorAll('.furniture-item').forEach(i => i.classList.remove('selected-tool')); interCanvas.style.cursor = 'default'; }
  if (key === 'w') setTool('wall');
  if (key === 'd') setTool('door');
  if (key === 'n') setTool('window');
  if (key === 't') setTool('text');
  if (key === 'e') setTool('erase');
  if (key === 'delete' || key === 'backspace') deleteSelected();

  // Escape stops wall drawing
  if (key === 'escape') { state.isDrawingWall = false; state.wallStart = null; drawItems(); }

  // Arrow keys to nudge selected item
  if (['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
    e.preventDefault();
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (item) {
      const d = e.shiftKey ? 10 : 1;
      if (key === 'arrowup') item.y -= d;
      if (key === 'arrowdown') item.y += d;
      if (key === 'arrowleft') item.x -= d;
      if (key === 'arrowright') item.x += d;
      drawItems();
    }
  }
  // Rotate with R
  if (key === 'r') {
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (item) { item.rotation = ((item.rotation || 0) + 45) % 360; document.getElementById('prop-rotation').value = item.rotation; drawItems(); }
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORT PNG
// ─────────────────────────────────────────────────────────────
function exportPNG() {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = SVG_W;
  exportCanvas.height = SVG_H;
  const ectx = exportCanvas.getContext('2d');

  // Background
  ectx.fillStyle = '#f0ece4';
  ectx.fillRect(0, 0, SVG_W, SVG_H);

  // Draw SVG into canvas via image
  const svgData = new XMLSerializer().serializeToString(floorSVG);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();

  img.onload = () => {
    ectx.drawImage(img, 0, 0, SVG_W, SVG_H);
    URL.revokeObjectURL(url);

    // Draw items on top
    ectx.save();
    state.items.forEach(item => {
      ectx.save();
      ectx.translate(item.x + item.w / 2, item.y + item.h / 2);
      ectx.rotate((item.rotation || 0) * Math.PI / 180);
      const hw = item.w / 2, hh = item.h / 2;
      if (item.type === 'wall') {
        ectx.fillStyle = item.fillColor || '#444';
        ectx.fillRect(-hw, -hh, item.w, item.h);
      } else if (item.type === 'text') {
        ectx.fillStyle = item.textColor || '#222';
        ectx.font = `${item.fontSize || 14}px Segoe UI`;
        ectx.textAlign = 'center';
        ectx.textBaseline = 'middle';
        ectx.fillText(item.text || '', 0, 0);
      } else {
        ectx.fillStyle = getFurnitureColor(item.furnitureType);
        ectx.strokeStyle = '#333';
        ectx.lineWidth = 1.5;
        ectx.beginPath();
        ectx.roundRect(-hw, -hh, item.w, item.h, 4);
        ectx.fill();
        ectx.stroke();
        ectx.fillStyle = '#333';
        ectx.font = `${Math.max(8, Math.min(11, item.w / 8))}px Segoe UI`;
        ectx.textAlign = 'center';
        ectx.textBaseline = 'middle';
        ectx.fillText(item.label || '', 0, 0);
      }
      ectx.restore();
    });
    ectx.restore();

    const a = document.createElement('a');
    a.download = 'planta-apartamento.png';
    a.href = exportCanvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
}

// ─────────────────────────────────────────────────────────────
// SAVE / LOAD
// ─────────────────────────────────────────────────────────────
function saveToStorage() {
  const data = {
    items: state.items,
    roomColors: state.roomColors,
    roomLabels: state.roomLabels,
    zoom: state.zoom,
    panX: state.panX,
    panY: state.panY,
  };
  localStorage.setItem('apartment_layout', JSON.stringify(data));
  alert('Layout salvo com sucesso!');
}

function loadFromStorage() {
  const raw = localStorage.getItem('apartment_layout');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    state.items = data.items || [];
    state.roomColors = data.roomColors || {};
    state.roomLabels = data.roomLabels || {};
    if (data.zoom) state.zoom = data.zoom;
    if (data.panX !== undefined) state.panX = data.panX;
    if (data.panY !== undefined) state.panY = data.panY;
    if (data.items && data.items.length > 0) {
      itemCounter = Math.max(...data.items.map(i => i.id || 0));
    }
    renderAll();
    zoomLevelEl.textContent = Math.round(state.zoom * 100) + '%';
  } catch (err) {
    console.warn('Erro ao carregar layout', err);
  }
}

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  init();
  // Auto-fit on load
  setTimeout(resetZoom, 100);
});

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
const state = {
  tool: 'select',
  selectedFurniture: null,
  selectedIds: new Set(),          // multi-select
  items: [],
  roomColors: {},
  roomTextures: {},
  roomLabels: {},
  showLabels: true,
  showDims: false,
  showAreaHover: true,
  zoom: 1,
  panX: 0, panY: 0,
  gridSize: 20, gridVisible: true, snapToGrid: false, snapToObjects: false,
  shadowsEnabled: true,
  wallThickness: 15, wallColor: '#444444',
  svgWallColor: '#2c2c2c',
  units: 'm',                      // m | cm | ft
  rulerVisible: false,
  showMinimap: true,
  // drawing
  isDrawingWall: false, wallStart: null,
  isMeasuring: false, measureStart: null,
  isDragging: false, dragOffsetX: 0, dragOffsetY: 0,
  dragGroup: [],                   // offsets for multi-drag
  isBoxSelecting: false, boxStart: null, boxEnd: null,
  isPanning: false, panStart: null,
  _mousePos: null,
  pendingTextPos: null,
  // clipboard
  clipboard: [],
  // undo/redo
  history: [], historyIndex: -1,
  // theme
  theme: 'dark',
};

let itemCounter = 0;
const SVG_W = 1250, SVG_H = 780;

// ═══════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════
const gridCanvas    = document.getElementById('grid-canvas');
const interCanvas   = document.getElementById('interaction-canvas');
const floorSVG      = document.getElementById('floor-plan-svg');
const canvasInner   = document.getElementById('canvas-inner');
const propertiesBar = document.getElementById('properties-bar');
const toolbarHint   = document.getElementById('toolbar-hint');
const selInfo       = document.getElementById('selection-info');
const zoomLevelEl   = document.getElementById('zoom-level');
const alignGroup    = document.getElementById('align-group');
const areaTooltip   = document.getElementById('area-tooltip');
const minimapCanvas = document.getElementById('minimap-canvas');

const ctx  = interCanvas.getContext('2d');
const gctx = gridCanvas.getContext('2d');
const mctx = minimapCanvas.getContext('2d');

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function init() {
  resizeCanvases();
  floorSVG.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
  floorSVG.setAttribute('width', SVG_W);
  floorSVG.setAttribute('height', SVG_H);
  renderAll();
  bindEvents();
  loadFromStorage();
  pushHistory();
}

function resizeCanvases() {
  const rect = canvasInner.getBoundingClientRect();
  gridCanvas.width    = rect.width  || 1000;
  gridCanvas.height   = rect.height || 700;
  interCanvas.width   = rect.width  || 1000;
  interCanvas.height  = rect.height || 700;
  // ruler canvases
  const rh = document.getElementById('ruler-h-canvas');
  const rv = document.getElementById('ruler-v-canvas');
  if (rh) { rh.width = rect.width || 1000; rh.height = 20; }
  if (rv) { rv.width = 20; rv.height = rect.height || 700; }
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function renderAll() {
  applyTransform();
  drawGrid();
  drawRulers();
  buildFloorPlan(floorSVG, state.roomColors, state.roomTextures, state.showLabels, state.showDims);
  drawItems();
  drawMinimap();
  updateAlignButtons();
  updateSelectionInfo();
}

function applyTransform() {
  const t = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
  floorSVG.style.transformOrigin = '0 0';
  floorSVG.style.transform = t;
}

// ── GRID ────────────────────────────────────────────────────────
function drawGrid() {
  gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  if (!state.gridVisible) return;
  const gs = state.gridSize * state.zoom;
  const ox = state.panX % gs, oy = state.panY % gs;
  gctx.strokeStyle = 'rgba(255,255,255,0.04)';
  gctx.lineWidth = 1;
  gctx.beginPath();
  for (let x = ox; x < gridCanvas.width; x += gs) { gctx.moveTo(x, 0); gctx.lineTo(x, gridCanvas.height); }
  for (let y = oy; y < gridCanvas.height; y += gs) { gctx.moveTo(0, y); gctx.lineTo(gridCanvas.width, y); }
  gctx.stroke();
}

// ── RULERS ──────────────────────────────────────────────────────
function drawRulers() {
  const rh = document.getElementById('ruler-h-canvas');
  const rv = document.getElementById('ruler-v-canvas');
  if (!rh || !rv || !state.rulerVisible) {
    if (rh) { const c = rh.getContext('2d'); c.clearRect(0,0,rh.width,rh.height); }
    if (rv) { const c = rv.getContext('2d'); c.clearRect(0,0,rv.width,rv.height); }
    return;
  }
  const rhCtx = rh.getContext('2d');
  const rvCtx = rv.getContext('2d');
  const pxPerM = 40 * state.zoom;
  const unitLabel = state.units;
  const unitScale = state.units === 'cm' ? 100 : state.units === 'ft' ? 3.281 : 1;

  // Horizontal ruler
  rhCtx.clearRect(0, 0, rh.width, rh.height);
  rhCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#16213e';
  rhCtx.fillRect(0, 0, rh.width, 20);
  rhCtx.fillStyle = '#888'; rhCtx.font = '9px sans-serif'; rhCtx.textAlign = 'center';
  const startX = Math.floor(-state.panX / pxPerM);
  const endX   = Math.ceil((rh.width - state.panX) / pxPerM);
  for (let m = startX; m <= endX; m++) {
    const x = m * pxPerM + state.panX;
    const v = (m * unitScale).toFixed(0);
    if (m % 5 === 0) { rhCtx.fillRect(x, 12, 1, 8); rhCtx.fillText(v, x, 10); }
    else { rhCtx.fillRect(x, 16, 1, 4); }
  }

  // Vertical ruler
  rvCtx.clearRect(0, 0, rv.width, rv.height);
  rvCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface') || '#16213e';
  rvCtx.fillRect(0, 0, 20, rv.height);
  rvCtx.fillStyle = '#888'; rvCtx.font = '9px sans-serif'; rvCtx.textAlign = 'right';
  const startY = Math.floor(-state.panY / pxPerM);
  const endY   = Math.ceil((rv.height - state.panY) / pxPerM);
  for (let m = startY; m <= endY; m++) {
    const y = m * pxPerM + state.panY;
    const v = (m * unitScale).toFixed(0);
    rvCtx.save();
    rvCtx.translate(10, y);
    rvCtx.rotate(-Math.PI / 2);
    if (m % 5 === 0) { rvCtx.fillText(v, 0, 4); rvCtx.restore(); rvCtx.fillRect(12, y, 8, 1); }
    else { rvCtx.restore(); rvCtx.fillRect(16, y, 4, 1); }
  }
}

// ═══════════════════════════════════════════════════════════════
// DRAW ITEMS
// ═══════════════════════════════════════════════════════════════
function drawItems() {
  ctx.clearRect(0, 0, interCanvas.width, interCanvas.height);
  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);

  // Draw hidden items ghosted
  state.items.forEach(item => {
    if (item.visible === false) {
      ctx.save(); ctx.globalAlpha = 0.2;
      drawItem(item, false);
      ctx.restore();
    } else {
      drawItem(item, state.selectedIds.has(item.id));
    }
  });

  // Box selection rect
  if (state.isBoxSelecting && state.boxStart && state.boxEnd) {
    const bx = Math.min(state.boxStart.x, state.boxEnd.x);
    const by = Math.min(state.boxStart.y, state.boxEnd.y);
    const bw = Math.abs(state.boxEnd.x - state.boxStart.x);
    const bh = Math.abs(state.boxEnd.y - state.boxStart.y);
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5 / state.zoom;
    ctx.setLineDash([5/state.zoom, 3/state.zoom]);
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = 'rgba(201,168,76,0.06)'; ctx.fillRect(bx, by, bw, bh);
    ctx.setLineDash([]);
  }

  // Wall preview
  if (state.isDrawingWall && state.wallStart && state._mousePos) drawWallPreview();
  // Measure preview
  if (state.isMeasuring && state.measureStart && state._mousePos) drawMeasurePreview();

  ctx.restore();
}

function drawItem(item, isSelected) {
  ctx.save();
  ctx.globalAlpha = (item.opacity !== undefined ? item.opacity : 100) / 100;
  ctx.translate(item.x + item.w / 2, item.y + item.h / 2);
  ctx.rotate((item.rotation || 0) * Math.PI / 180);
  if (item.flipH) ctx.scale(-1, 1);
  if (item.flipV) ctx.scale(1, -1);

  if      (item.type === 'wall')       drawWallItem(item, isSelected);
  else if (item.type === 'door')       drawDoorItem(item, isSelected);
  else if (item.type === 'sliding')    drawSlidingDoor(item, isSelected);
  else if (item.type === 'window')     drawWindowItem(item, isSelected);
  else if (item.type === 'column')     drawColumnItem(item, isSelected);
  else if (item.type === 'stairs')     drawStairsItem(item, isSelected);
  else if (item.type === 'text')       drawTextItem(item, isSelected);
  else if (item.type === 'measure')    drawMeasureItem(item, isSelected);
  else if (item.type === 'sticky-note') drawStickyNote(item, isSelected);
  else if (item.type === 'arrow-annot') drawArrowAnnot(item, isSelected);
  else if (item.type === 'circle-hl') drawCircleHL(item, isSelected);
  else if (item.type === 'dim-arrow')  drawDimArrow(item, isSelected);
  else if (item.type === 'north-arrow') drawNorthArrow(item, isSelected);
  else if (item.type === 'scale-bar')  drawScaleBar(item, isSelected);
  else if (item.type === 'room-badge') drawRoomBadge(item, isSelected);
  else if (item.type === 'area-label') drawAreaLabel(item, isSelected);
  else                                 drawFurnitureItem(item, isSelected);

  // Lock icon
  if (item.locked) {
    ctx.fillStyle = '#ffc107'; ctx.font = `${12/state.zoom}px sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('🔒', item.w/2, -item.h/2);
  }

  // Selection handles
  if (isSelected) {
    const hw = item.w/2, hh = item.h/2;
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1.5/state.zoom;
    ctx.setLineDash([5/state.zoom, 3/state.zoom]);
    ctx.strokeRect(-hw-4, -hh-4, item.w+8, item.h+8);
    ctx.setLineDash([]);
    ctx.fillStyle = '#c9a84c';
    [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh],[0,-hh],[0,hh],[-hw,0],[hw,0]].forEach(([cx,cy]) => {
      ctx.beginPath(); ctx.arc(cx, cy, 4/state.zoom, 0, Math.PI*2); ctx.fill();
    });
  }
  ctx.restore();
}

// ── FURNITURE ───────────────────────────────────────────────────
function drawFurnitureItem(item, isSelected) {
  const hw = item.w/2, hh = item.h/2;
  if (state.shadowsEnabled) {
    ctx.shadowColor='rgba(0,0,0,.3)'; ctx.shadowBlur=6/state.zoom;
    ctx.shadowOffsetX=2/state.zoom; ctx.shadowOffsetY=2/state.zoom;
  }
  ctx.fillStyle = item.fillColor || getFurnitureColor(item.furnitureType);
  ctx.strokeStyle = isSelected ? '#c9a84c' : 'rgba(0,0,0,0.4)';
  ctx.lineWidth = isSelected ? 2/state.zoom : 1/state.zoom;
  ctx.beginPath();
  roundRect(ctx, -hw, -hh, item.w, item.h, 3);
  ctx.fill(); ctx.shadowColor='transparent'; ctx.stroke();
  drawFurnitureDetail(item);

  if (item.showLabel !== false) {
    ctx.fillStyle = isDark(item.fillColor || getFurnitureColor(item.furnitureType)) ? '#eee' : '#222';
    ctx.font = `${Math.max(7, Math.min(11, item.w/9))}px Segoe UI, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.label || '', 0, 0);
  }
}

function drawFurnitureDetail(item) {
  const hw=item.w/2, hh=item.h/2, t=item.furnitureType;
  ctx.save();
  if (t==='cama-casal'||t==='cama-queen'||t==='cama-solteiro') {
    ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillRect(-hw+6,-hh+6,item.w-12,hh*0.45);
    ctx.fillStyle='rgba(100,150,255,0.15)';
    ctx.fillRect(-hw+6,-hh+6+hh*0.45,item.w-12,hh*0.85);
  } else if (t==='sofa-3'||t==='sofa-2'||t==='sofa-externo') {
    ctx.fillStyle='rgba(255,255,255,0.18)';
    const segs=t==='sofa-3'?3:2, sw=(item.w-12)/segs;
    for(let i=0;i<segs;i++) ctx.fillRect(-hw+6+i*sw+2,-hh+6,sw-4,item.h-12);
  } else if (t==='tv') {
    ctx.fillStyle='#0d1117'; ctx.fillRect(-hw+2,-hh+2,item.w-4,item.h-4);
    ctx.fillStyle='#1a6aad'; ctx.fillRect(-hw+4,-hh+4,item.w-8,item.h-8);
  } else if (t==='piscina'||t==='banheira-redonda') {
    ctx.fillStyle='rgba(100,200,255,0.4)';
    ctx.beginPath(); ctx.ellipse(0,0,hw-6,hh-6,0,0,Math.PI*2); ctx.fill();
  } else if (t==='fogao'||t==='forno') {
    ctx.fillStyle='rgba(50,50,50,0.5)';
    ctx.fillRect(-hw+6,-hh+6,item.w-12,item.h-12);
    [[-hw/2,-hh/2],[hw/2,-hh/2],[-hw/2,hh/2],[hw/2,hh/2]].forEach(([cx,cy])=>{
      ctx.strokeStyle='#aaa'; ctx.lineWidth=1; ctx.beginPath();
      ctx.arc(cx,cy,4,0,Math.PI*2); ctx.stroke();
    });
  } else if (t==='mesa-redonda') {
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,Math.min(hw,hh)-4,0,Math.PI*2); ctx.stroke();
  } else if (t==='beliche') {
    ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-hw+4,0); ctx.lineTo(hw-4,0); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.3)';
    ctx.fillRect(-hw+4,-hh+4,item.w-8,(item.h/2)-6);
    ctx.fillRect(-hw+4,4,item.w-8,(item.h/2)-8);
  } else if (t==='vaso') {
    ctx.fillStyle='rgba(240,240,240,0.8)';
    ctx.beginPath(); ctx.ellipse(0,0,hw-8,hh-6,0,0,Math.PI*2); ctx.fill();
  } else if (t==='chuveiro') {
    ctx.strokeStyle='rgba(100,180,255,0.6)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,Math.min(hw,hh)-8,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,-hh+4); ctx.lineTo(0,hh-4);
    ctx.moveTo(-hw+4,0); ctx.lineTo(hw-4,0); ctx.stroke();
  } else if (t==='north-arrow') {
    ctx.fillStyle='#c9a84c'; ctx.font=`bold ${Math.min(hw,hh)*0.8}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('↑N',0,0);
  } else if (t==='scale-bar') {
    ctx.strokeStyle='#c9a84c'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-hw+10,0); ctx.lineTo(hw-10,0); ctx.stroke();
    ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-hw+10,-6); ctx.lineTo(-hw+10,6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw-10,-6); ctx.lineTo(hw-10,6); ctx.stroke();
    ctx.fillStyle='#c9a84c'; ctx.font=`${9/state.zoom}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText('5 m',0,-4);
  } else if (t==='room-badge') {
    ctx.fillStyle='#c9a84c';
    ctx.beginPath(); ctx.arc(0,0,Math.min(hw,hh)-3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#111'; ctx.font=`bold ${Math.min(hw,hh)*0.7}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.badgeNum||'1',0,0);
  } else if (t==='area-label') {
    ctx.fillStyle='rgba(201,168,76,.15)'; ctx.fillRect(-hw,-hh,item.w,item.h);
    ctx.fillStyle='#c9a84c'; ctx.font=`bold ${Math.max(8,item.h*0.5)}px sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.areaValue||'00.00 m²',0,0);
  }
  ctx.restore();
}

// ── WALLS & STRUCTURAL ──────────────────────────────────────────
function drawWallItem(item, isSel) {
  const hw=item.w/2, hh=item.h/2;
  ctx.fillStyle = item.fillColor || '#444';
  ctx.fillRect(-hw,-hh,item.w,item.h);
  if(isSel){ctx.strokeStyle='#c9a84c';ctx.lineWidth=2/state.zoom;ctx.strokeRect(-hw,-hh,item.w,item.h);}
}

function drawDoorItem(item, isSel) {
  const hw=item.w/2,hh=item.h/2;
  ctx.strokeStyle=isSel?'#c9a84c':'#666'; ctx.lineWidth=2/state.zoom;
  ctx.strokeRect(-hw,-hh,item.w,item.h);
  ctx.beginPath(); ctx.arc(-hw,-hh,item.w,0,Math.PI/2); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.moveTo(-hw,-hh); ctx.lineTo(hw,-hh);
  ctx.arc(-hw,-hh,item.w,0,Math.PI/2,false); ctx.closePath(); ctx.fill();
}

function drawSlidingDoor(item, isSel) {
  const hw=item.w/2,hh=item.h/2;
  ctx.strokeStyle=isSel?'#c9a84c':'#4fc3f7'; ctx.lineWidth=2/state.zoom;
  ctx.strokeRect(-hw,-hh,item.w,item.h);
  ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(0,hh); ctx.stroke();
  ctx.strokeStyle=isSel?'#c9a84c':'rgba(79,195,247,0.5)'; ctx.lineWidth=4/state.zoom;
  ctx.beginPath(); ctx.moveTo(-hw+4,-hh+4); ctx.lineTo(4,-hh+4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,hh-4); ctx.lineTo(hw-4,hh-4); ctx.stroke();
}

function drawWindowItem(item, isSel) {
  const hw=item.w/2,hh=item.h/2;
  ctx.strokeStyle=isSel?'#c9a84c':'#4fc3f7'; ctx.lineWidth=3/state.zoom;
  ctx.strokeRect(-hw,-hh,item.w,item.h);
  ctx.lineWidth=1/state.zoom;
  ctx.beginPath(); ctx.moveTo(-hw,0); ctx.lineTo(hw,0); ctx.stroke();
  ctx.fillStyle='rgba(79,195,247,0.08)'; ctx.fillRect(-hw,-hh,item.w,item.h);
}

function drawColumnItem(item, isSel) {
  const r=Math.min(item.w,item.h)/2;
  ctx.fillStyle=item.fillColor||'#555'; ctx.strokeStyle=isSel?'#c9a84c':'#888';
  ctx.lineWidth=2/state.zoom;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1/state.zoom;
  ctx.beginPath(); ctx.arc(0,0,r-4,0,Math.PI*2); ctx.stroke();
}

function drawStairsItem(item, isSel) {
  const hw=item.w/2,hh=item.h/2, steps=8;
  ctx.fillStyle=item.fillColor||'#90a4ae'; ctx.fillRect(-hw,-hh,item.w,item.h);
  ctx.strokeStyle=isSel?'#c9a84c':'#555'; ctx.lineWidth=1/state.zoom;
  ctx.strokeRect(-hw,-hh,item.w,item.h);
  const sh=item.h/steps;
  ctx.strokeStyle='rgba(0,0,0,0.3)';
  for(let i=1;i<steps;i++){
    const y=-hh+i*sh;
    ctx.beginPath(); ctx.moveTo(-hw,y); ctx.lineTo(hw,y); ctx.stroke();
  }
  ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=2/state.zoom;
  ctx.beginPath(); ctx.moveTo(-hw+4,-hh+4); ctx.lineTo(-hw+4,hh-4);
  ctx.lineTo(hw-4,hh-4); ctx.stroke();
}

// ── ANNOTATIONS ─────────────────────────────────────────────────
function drawTextItem(item, isSel) {
  ctx.fillStyle = item.textColor || '#eaeaea';
  ctx.font = `${item.bold?'bold ':''} ${item.fontSize||14}px Segoe UI, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(item.text||'', 0, 0);
  if(isSel){
    const m=ctx.measureText(item.text||'');
    const tw=m.width+10, th=(item.fontSize||14)+10;
    ctx.strokeStyle='#c9a84c'; ctx.lineWidth=1/state.zoom;
    ctx.setLineDash([3/state.zoom,3/state.zoom]);
    ctx.strokeRect(-tw/2,-th/2,tw,th); ctx.setLineDash([]);
  }
}

function drawMeasureItem(item, isSel) {
  ctx.strokeStyle=isSel?'#c9a84c':'#ff9800'; ctx.lineWidth=2/state.zoom;
  const hw=item.w/2;
  ctx.beginPath(); ctx.moveTo(-hw,0); ctx.lineTo(hw,0); ctx.stroke();
  ctx.lineWidth=1/state.zoom;
  ctx.beginPath(); ctx.moveTo(-hw,-8); ctx.lineTo(-hw,8);
  ctx.moveTo(hw,-8); ctx.lineTo(hw,8); ctx.stroke();
  ctx.fillStyle='#ff9800'; ctx.font=`bold ${12/state.zoom}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(item.distLabel||'', 0, -4);
}

function drawStickyNote(item, isSel) {
  const hw=item.w/2, hh=item.h/2;
  ctx.fillStyle='rgba(255,235,59,0.85)'; ctx.strokeStyle=isSel?'#c9a84c':'#f9a825';
  ctx.lineWidth=isSel?2/state.zoom:1/state.zoom;
  roundRect(ctx,-hw,-hh,item.w,item.h,3); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(230,200,0,0.4)'; ctx.fillRect(-hw,-hh,item.w,10);
  if(item.text){ ctx.fillStyle='#333'; ctx.font=`${Math.max(8,(item.fontSize||11))/state.zoom*state.zoom}px Segoe UI`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(item.text,0,6); }
}

function drawArrowAnnot(item, isSel) {
  const hw=item.w/2;
  ctx.strokeStyle=isSel?'#c9a84c':'#ff5722'; ctx.lineWidth=2/state.zoom;
  ctx.beginPath(); ctx.moveTo(-hw,0); ctx.lineTo(hw,0); ctx.stroke();
  ctx.fillStyle=isSel?'#c9a84c':'#ff5722';
  ctx.beginPath(); ctx.moveTo(hw,0); ctx.lineTo(hw-10,-5); ctx.lineTo(hw-10,5); ctx.closePath(); ctx.fill();
}

function drawCircleHL(item, isSel) {
  const r=Math.min(item.w,item.h)/2;
  ctx.strokeStyle=isSel?'#c9a84c':'#ff5722'; ctx.lineWidth=2/state.zoom;
  ctx.setLineDash([6/state.zoom,3/state.zoom]);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,87,34,0.08)'; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
}

function drawDimArrow(item, isSel) {
  drawMeasureItem(item, isSel);
}

function drawNorthArrow(item, isSel) {
  const r=Math.min(item.w,item.h)/2-4;
  ctx.strokeStyle=isSel?'#c9a84c':'#c9a84c'; ctx.fillStyle='#c9a84c';
  ctx.lineWidth=2/state.zoom;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*0.4,r*0.5); ctx.lineTo(0,r*0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(201,168,76,0.2)';
  ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(-r*0.4,r*0.5); ctx.lineTo(0,r*0.3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#c9a84c'; ctx.lineWidth=1/state.zoom;
  ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(-r*0.4,r*0.5); ctx.lineTo(0,r*0.3); ctx.closePath(); ctx.stroke();
  ctx.fillStyle='#c9a84c'; ctx.font=`bold ${8/state.zoom*state.zoom}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('N',0,-r+8);
}

function drawScaleBar(item, isSel) {
  drawFurnitureDetail({ ...item, furnitureType:'scale-bar' });
  if(isSel){ const hw=item.w/2,hh=item.h/2; ctx.strokeStyle='#c9a84c'; ctx.lineWidth=1/state.zoom; ctx.setLineDash([4/state.zoom,2/state.zoom]); ctx.strokeRect(-hw,-hh,item.w,item.h); ctx.setLineDash([]); }
}

function drawRoomBadge(item, isSel) { drawFurnitureDetail({ ...item, furnitureType:'room-badge' }); }
function drawAreaLabel(item, isSel)  { drawFurnitureDetail({ ...item, furnitureType:'area-label' }); }

// ── WALL/MEASURE PREVIEW ─────────────────────────────────────────
function drawWallPreview() {
  ctx.strokeStyle=state.wallColor; ctx.lineWidth=state.wallThickness; ctx.lineCap='square';
  ctx.beginPath(); ctx.moveTo(state.wallStart.x,state.wallStart.y);
  ctx.lineTo(state._mousePos.x,state._mousePos.y); ctx.stroke();
}

function drawMeasurePreview() {
  ctx.strokeStyle='#ff9800'; ctx.lineWidth=2/state.zoom; ctx.setLineDash([6/state.zoom,3/state.zoom]);
  ctx.beginPath(); ctx.moveTo(state.measureStart.x,state.measureStart.y);
  ctx.lineTo(state._mousePos.x,state._mousePos.y); ctx.stroke(); ctx.setLineDash([]);
  const dx=state._mousePos.x-state.measureStart.x, dy=state._mousePos.y-state.measureStart.y;
  const dist=Math.sqrt(dx*dx+dy*dy)/40;
  const label=formatDist(dist);
  const mx=(state.measureStart.x+state._mousePos.x)/2, my=(state.measureStart.y+state._mousePos.y)/2;
  ctx.fillStyle='#ff9800'; ctx.font=`bold ${14/state.zoom}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(label,mx,my-4);
}

// ── MINIMAP ─────────────────────────────────────────────────────
function drawMinimap() {
  const mc=minimapCanvas; const mw=mc.width, mh=mc.height;
  mctx.clearRect(0,0,mw,mh);
  mctx.fillStyle='rgba(0,0,0,0.3)'; mctx.fillRect(0,0,mw,mh);
  const scaleX=mw/SVG_W, scaleY=mh/SVG_H;
  const ms=Math.min(scaleX,scaleY);
  const ox=(mw-SVG_W*ms)/2, oy=(mh-SVG_H*ms)/2;

  // Draw rooms
  ROOMS.forEach(r=>{
    mctx.fillStyle=state.roomColors[r.id]||r.defaultColor||'#ccc';
    mctx.fillRect(ox+r.x*ms,oy+r.y*ms,r.w*ms,r.h*ms);
    mctx.strokeStyle='rgba(0,0,0,0.3)'; mctx.lineWidth=0.5;
    mctx.strokeRect(ox+r.x*ms,oy+r.y*ms,r.w*ms,r.h*ms);
  });

  // Draw items as dots
  state.items.forEach(item=>{
    mctx.fillStyle='rgba(201,168,76,0.7)';
    mctx.fillRect(ox+item.x*ms,oy+item.y*ms,Math.max(2,item.w*ms),Math.max(2,item.h*ms));
  });

  // Viewport rect
  const vp=document.getElementById('minimap-vp');
  const vpX = (-state.panX/state.zoom)*ms+ox;
  const vpY = (-state.panY/state.zoom)*ms+oy;
  const vpW = (interCanvas.width/state.zoom)*ms;
  const vpH = (interCanvas.height/state.zoom)*ms;
  vp.style.left=vpX+'px'; vp.style.top=vpY+'px';
  vp.style.width=vpW+'px'; vp.style.height=vpH+'px';
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
}

function isDark(hex) {
  if (!hex) return true;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)<128;
}

function getFurnitureColor(type) {
  const c={
    'sofa-3':'#8d7b6e','sofa-2':'#8d7b6e','sofa-externo':'#7a8d6e','poltrona':'#7d6e63',
    'mesa-centro':'#a5895e','tv':'#263238','rack':'#4e342e',
    'cama-casal':'#78909c','cama-queen':'#78909c','cama-solteiro':'#90a4ae',
    'beliche':'#7986cb','berco':'#fff176','guarda-roupa':'#6d4c41','criado-mudo':'#795548',
    'escrivaninha':'#6d4c41','cofre':'#455a64',
    'mesa-jantar-8':'#a5895e','mesa-jantar-6':'#a5895e','mesa-jantar-4':'#a5895e',
    'mesa-redonda':'#a5895e','cadeira':'#8d6e63','bancada':'#90a4ae','ilha':'#90a4ae',
    'fogao':'#616161','forno':'#616161','geladeira':'#bdbdbd','lava-loucas':'#b0bec5',
    'microondas':'#78909c','adega':'#4a148c','cafeteira':'#5d4037',
    'banheira':'#b3e5fc','banheira-redonda':'#b3e5fc','chuveiro':'#e1f5fe',
    'vaso':'#f5f5f5','pia':'#e0e0e0','bidet':'#e8eaf6',
    'maq-lavar':'#c5cae9','secadora':'#b0bec5',
    'esteira':'#37474f','bicicleta-erg':'#455a64','banco-musculacao':'#546e7a',
    'monitor':'#263238','impressora':'#424242','livreiro':'#5d4037',
    'estante':'#6d4c41','lareira':'#bf360c','piano':'#212121','home-bar':'#4e342e',
    'aquario':'#0277bd','mesa-lateral':'#8d6e63',
    'piscina':'#0288d1','churrasqueira':'#546e7a','espreguicadeira':'#8d6e63',
    'vaso-planta':'#388e3c','rede':'#c49a2a','aquecedor':'#bf360c','ac-unit':'#b0bec5',
    'atv':'#e65100','moto':'#263238','carro':'#37474f','cama-pet':'#a1887f',
    'tomada':'#bdbdbd','interruptor':'#bdbdbd','luminaria-teto':'#fff176',
    'spot':'#fff176','luminaria-piso':'#fff176','painel-eletrico':'#455a64',
    'difusor-ar':'#b3e5fc','thermostat':'#e0e0e0','dreno':'#90a4ae','regis-agua':'#64b5f6',
    'camera-seg':'#37474f','detector-fumaca':'#f44336','extintor':'#e53935',
    'speaker':'#263238','router':'#37474f','smart-hub':'#283593',
    'sticky-note':'#fff176','arrow-annot':'#ff5722','circle-hl':'transparent',
    'dim-arrow':'#ff9800','north-arrow':'transparent','scale-bar':'transparent',
    'room-badge':'#c9a84c','area-label':'rgba(201,168,76,0.1)',
  };
  return c[type]||'#c8a96e';
}

function formatDist(meters) {
  if (state.units==='cm') return (meters*100).toFixed(0)+' cm';
  if (state.units==='ft') return (meters*3.281).toFixed(2)+' ft';
  return meters.toFixed(2)+' m';
}

function screenToWorld(sx,sy){ return { x:(sx-state.panX)/state.zoom, y:(sy-state.panY)/state.zoom }; }
function snapCoord(v){ return state.snapToGrid ? Math.round(v/state.gridSize)*state.gridSize : v; }
function getCanvasPos(e){ const r=interCanvas.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }

// ═══════════════════════════════════════════════════════════════
// HIT TESTING
// ═══════════════════════════════════════════════════════════════
function hitTestItems(wx,wy) {
  for (let i=state.items.length-1; i>=0; i--) {
    const item=state.items[i];
    if (item.visible===false) continue;
    if (pointInItem(wx,wy,item)) return item;
  }
  return null;
}

function pointInItem(wx,wy,item) {
  const cos=Math.cos(-(item.rotation||0)*Math.PI/180);
  const sin=Math.sin(-(item.rotation||0)*Math.PI/180);
  const cx=item.x+item.w/2, cy=item.y+item.h/2;
  const rx=(wx-cx)*cos-(wy-cy)*sin;
  const ry=(wx-cx)*sin+(wy-cy)*cos;
  return Math.abs(rx)<=item.w/2+4 && Math.abs(ry)<=item.h/2+4;
}

function hitTestRooms(wx,wy) {
  for (let i=ROOMS.length-1; i>=0; i--) {
    const r=ROOMS[i];
    if (wx>=r.x && wx<=r.x+r.w && wy>=r.y && wy<=r.y+r.h) return r;
  }
  return null;
}

function itemsInBox(bx,by,bw,bh) {
  return state.items.filter(item => {
    const cx=item.x+item.w/2, cy=item.y+item.h/2;
    return cx>=bx && cx<=bx+bw && cy>=by && cy<=by+bh;
  });
}

// ═══════════════════════════════════════════════════════════════
// SELECTION
// ═══════════════════════════════════════════════════════════════
function selectItem(item, additive=false) {
  if (!additive) state.selectedIds.clear();
  if (item) state.selectedIds.add(item.id);
  updateSelectionInfo();
  updatePropertiesBar();
  updateAlignButtons();
  document.querySelectorAll('.room').forEach(r=>r.classList.remove('selected-room'));
  drawItems();
}

function selectItems(items) {
  state.selectedIds = new Set(items.map(i=>i.id));
  updateSelectionInfo();
  updatePropertiesBar();
  updateAlignButtons();
  drawItems();
}

function clearSelection() {
  state.selectedIds.clear();
  updatePropertiesBar();
  updateAlignButtons();
  updateSelectionInfo();
}

function selectRoom(room) {
  clearSelection();
  document.querySelectorAll('.room').forEach(r=>{
    r.classList.toggle('selected-room', r.getAttribute('data-room-id')===room?.id);
  });
  const info=document.getElementById('selected-room-info');
  const nameEl=document.getElementById('selected-room-name');
  if(room){ info.style.display='block'; nameEl.textContent=state.roomLabels[room.id]||room.name; document.getElementById('room-label-input').value=state.roomLabels[room.id]||room.name; }
  else { info.style.display='none'; }
  state._selectedRoom = room;
  drawItems();
}

function updateSelectionInfo() {
  const n=state.selectedIds.size;
  selInfo.textContent = n>1 ? `${n} itens selecionados` : n===1 ? '1 item selecionado' : '';
}

function updateAlignButtons() {
  const n=state.selectedIds.size;
  alignGroup.style.opacity = n>=2 ? '1' : '0.3';
  alignGroup.style.pointerEvents = n>=2 ? 'auto' : 'none';
}

// ═══════════════════════════════════════════════════════════════
// PROPERTIES BAR
// ═══════════════════════════════════════════════════════════════
function updatePropertiesBar() {
  if (state.selectedIds.size===0) { propertiesBar.style.display='none'; return; }
  propertiesBar.style.display='flex';
  if (state.selectedIds.size===1) {
    const item=state.items.find(i=>i.id===[...state.selectedIds][0]);
    if (!item) { propertiesBar.style.display='none'; return; }
    document.getElementById('prop-label').textContent=item.label||item.type||'Item';
    document.getElementById('prop-rotation').value=item.rotation||0;
    document.getElementById('prop-width').value=Math.round(item.w);
    document.getElementById('prop-height').value=Math.round(item.h);
    document.getElementById('prop-opacity').value=item.opacity!==undefined?item.opacity:100;
    document.getElementById('prop-fill-color').value=item.fillColor||getFurnitureColor(item.furnitureType)||'#c8a96e';
    const lockBtn=document.getElementById('prop-lock');
    lockBtn.textContent=item.locked?'🔒':'🔓'; lockBtn.classList.toggle('locked',!!item.locked);
    document.getElementById('prop-visible').textContent=item.visible===false?'🙈':'👁';
  } else {
    document.getElementById('prop-label').textContent=`${state.selectedIds.size} itens`;
  }
}

// ═══════════════════════════════════════════════════════════════
// PLACE ITEMS
// ═══════════════════════════════════════════════════════════════
function placeFurniture(wx,wy) {
  const sf=state.selectedFurniture; if(!sf) return;
  const x=snapCoord(wx-sf.w/2), y=snapCoord(wy-sf.h/2);
  pushHistory();
  const item={ id:++itemCounter, type:'furniture', furnitureType:sf.type, label:sf.label, x, y, w:sf.w, h:sf.h, rotation:0, flipH:false, flipV:false, opacity:100, visible:true, locked:false };
  state.items.push(item);
  selectItem(item);
}

function placeWall(end) {
  if (!state.wallStart) return;
  const s=state.wallStart;
  const dx=end.x-s.x, dy=end.y-s.y;
  const len=Math.sqrt(dx*dx+dy*dy);
  if (len<5) { state.isDrawingWall=false; state.wallStart=null; return; }
  const angle=Math.atan2(dy,dx)*180/Math.PI;
  pushHistory();
  state.items.push({ id:++itemCounter, type:'wall', x:s.x, y:s.y-state.wallThickness/2, x2:end.x, y2:end.y, w:len, h:state.wallThickness, rotation:angle, fillColor:state.wallColor, flipH:false, flipV:false, opacity:100, visible:true, locked:false });
  state.wallStart=end;
  drawItems();
}

function placeDoorOrWindow(type,wx,wy) {
  pushHistory();
  const typeMap={ door:{w:80,h:80,label:'Porta'}, sliding:{w:90,h:15,label:'P. Correr'}, window:{w:90,h:15,label:'Janela'}, column:{w:40,h:40,label:'Coluna'}, stairs:{w:100,h:180,label:'Escada'} };
  const cfg=typeMap[type]||{w:80,h:80,label:type};
  state.items.push({ id:++itemCounter, type, label:cfg.label, x:snapCoord(wx-cfg.w/2), y:snapCoord(wy-cfg.h/2), w:cfg.w, h:cfg.h, rotation:0, flipH:false, flipV:false, opacity:100, visible:true, locked:false });
  drawItems();
}

// ═══════════════════════════════════════════════════════════════
// ALIGNMENT & DISTRIBUTION (features 42-49)
// ═══════════════════════════════════════════════════════════════
function getSelectedItems() { return state.items.filter(i=>state.selectedIds.has(i.id)); }

function alignLeft()    { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const minX=Math.min(...items.map(i=>i.x)); items.forEach(i=>i.x=minX); drawItems(); }
function alignRight()   { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const maxR=Math.max(...items.map(i=>i.x+i.w)); items.forEach(i=>i.x=maxR-i.w); drawItems(); }
function alignTop()     { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const minY=Math.min(...items.map(i=>i.y)); items.forEach(i=>i.y=minY); drawItems(); }
function alignBottom()  { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const maxB=Math.max(...items.map(i=>i.y+i.h)); items.forEach(i=>i.y=maxB-i.h); drawItems(); }
function alignCenterH() { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const cx=items.reduce((s,i)=>s+i.x+i.w/2,0)/items.length; items.forEach(i=>i.x=cx-i.w/2); drawItems(); }
function alignCenterV() { const items=getSelectedItems(); if(!items.length) return; pushHistory(); const cy=items.reduce((s,i)=>s+i.y+i.h/2,0)/items.length; items.forEach(i=>i.y=cy-i.h/2); drawItems(); }

function distributeH() {
  const items=getSelectedItems().sort((a,b)=>a.x-b.x); if(items.length<3) return;
  pushHistory();
  const left=items[0].x, right=items[items.length-1].x+items[items.length-1].w;
  const totalW=items.reduce((s,i)=>s+i.w,0);
  const gap=(right-left-totalW)/(items.length-1);
  let x=left;
  items.forEach(i=>{ i.x=x; x+=i.w+gap; });
  drawItems();
}

function distributeV() {
  const items=getSelectedItems().sort((a,b)=>a.y-b.y); if(items.length<3) return;
  pushHistory();
  const top=items[0].y, bottom=items[items.length-1].y+items[items.length-1].h;
  const totalH=items.reduce((s,i)=>s+i.h,0);
  const gap=(bottom-top-totalH)/(items.length-1);
  let y=top;
  items.forEach(i=>{ i.y=y; y+=i.h+gap; });
  drawItems();
}

// ═══════════════════════════════════════════════════════════════
// GROUP / UNGROUP (features 56-57)
// ═══════════════════════════════════════════════════════════════
function groupSelected() {
  const items=getSelectedItems(); if(items.length<2) return;
  pushHistory();
  const minX=Math.min(...items.map(i=>i.x)), minY=Math.min(...items.map(i=>i.y));
  const maxX=Math.max(...items.map(i=>i.x+i.w)), maxY=Math.max(...items.map(i=>i.y+i.h));
  const groupId=++itemCounter;
  const group={ id:groupId, type:'group', label:'Grupo', x:minX, y:minY, w:maxX-minX, h:maxY-minY, rotation:0, flipH:false, flipV:false, opacity:100, visible:true, locked:false, children:items.map(i=>i.id) };
  state.items=state.items.filter(i=>!state.selectedIds.has(i.id));
  state.items.push(...items); // keep originals, add group handle
  state.items.push(group);
  selectItem(group);
}

function ungroupSelected() {
  const items=getSelectedItems().filter(i=>i.type==='group');
  if(!items.length) return;
  pushHistory();
  items.forEach(g=>{ state.items=state.items.filter(i=>i.id!==g.id); });
  drawItems();
}

// ═══════════════════════════════════════════════════════════════
// Z-ORDER (features 53-56)
// ═══════════════════════════════════════════════════════════════
function bringToFront()  { const ids=[...state.selectedIds]; pushHistory(); const sel=state.items.filter(i=>ids.includes(i.id)); state.items=state.items.filter(i=>!ids.includes(i.id)).concat(sel); drawItems(); }
function sendToBack()    { const ids=[...state.selectedIds]; pushHistory(); const sel=state.items.filter(i=>ids.includes(i.id)); state.items=sel.concat(state.items.filter(i=>!ids.includes(i.id))); drawItems(); }
function bringForward()  { const ids=[...state.selectedIds]; pushHistory(); ids.forEach(id=>{ const idx=state.items.findIndex(i=>i.id===id); if(idx<state.items.length-1){const tmp=state.items[idx]; state.items[idx]=state.items[idx+1]; state.items[idx+1]=tmp;} }); drawItems(); }
function sendBackward()  { const ids=[...state.selectedIds]; pushHistory(); ids.forEach(id=>{ const idx=state.items.findIndex(i=>i.id===id); if(idx>0){const tmp=state.items[idx]; state.items[idx]=state.items[idx-1]; state.items[idx-1]=tmp;} }); drawItems(); }

// ═══════════════════════════════════════════════════════════════
// CLIPBOARD (features 58-61)
// ═══════════════════════════════════════════════════════════════
function copySelected(cut=false) {
  const items=getSelectedItems(); if(!items.length) return;
  state.clipboard=items.map(i=>JSON.parse(JSON.stringify(i)));
  if(cut){ pushHistory(); state.items=state.items.filter(i=>!state.selectedIds.has(i.id)); clearSelection(); drawItems(); }
}

function pasteClipboard(offset=true) {
  if(!state.clipboard.length) return;
  pushHistory();
  const newItems=state.clipboard.map(i=>({ ...JSON.parse(JSON.stringify(i)), id:++itemCounter, x:i.x+(offset?20:0), y:i.y+(offset?20:0) }));
  state.items.push(...newItems);
  selectItems(newItems);
  drawItems();
}

// ═══════════════════════════════════════════════════════════════
// SELECT ALL (feature 38)
// ═══════════════════════════════════════════════════════════════
function selectAll() { selectItems(state.items.filter(i=>i.visible!==false)); }
function invertSelection() {
  const allIds=new Set(state.items.map(i=>i.id));
  const newSel=state.items.filter(i=>!state.selectedIds.has(i.id)&&i.visible!==false);
  selectItems(newSel);
}

// ═══════════════════════════════════════════════════════════════
// LOCK / VISIBILITY / OPACITY (features 50-52)
// ═══════════════════════════════════════════════════════════════
function modifySelectedItem(fn) {
  const items=getSelectedItems(); if(!items.length) return;
  pushHistory(); items.forEach(fn); updatePropertiesBar(); drawItems();
}
function toggleLock()    { modifySelectedItem(i=>i.locked=!i.locked); }
function toggleVisible() { modifySelectedItem(i=>{ if(i.visible===false) i.visible=true; else i.visible=false; }); }

// ═══════════════════════════════════════════════════════════════
// DELETE (feature)
// ═══════════════════════════════════════════════════════════════
function deleteSelected() {
  if(!state.selectedIds.size) return;
  pushHistory();
  state.items=state.items.filter(i=>!state.selectedIds.has(i.id));
  clearSelection(); drawItems();
}

// ═══════════════════════════════════════════════════════════════
// DUPLICATE
// ═══════════════════════════════════════════════════════════════
function duplicateSelected() {
  const items=getSelectedItems(); if(!items.length) return;
  pushHistory();
  const newItems=items.map(i=>({ ...JSON.parse(JSON.stringify(i)), id:++itemCounter, x:i.x+20, y:i.y+20 }));
  state.items.push(...newItems); selectItems(newItems); drawItems();
}

// ═══════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════
function pushHistory() {
  const snap=JSON.stringify({ items:state.items, roomColors:state.roomColors, roomTextures:state.roomTextures, roomLabels:state.roomLabels });
  state.history=state.history.slice(0,state.historyIndex+1);
  state.history.push(snap);
  state.historyIndex=state.history.length-1;
  if(state.history.length>80){state.history.shift();state.historyIndex--;}
  // auto-save
  autoSave();
}

function undo() { if(state.historyIndex<=0) return; state.historyIndex--; restoreSnapshot(state.history[state.historyIndex]); }
function redo() { if(state.historyIndex>=state.history.length-1) return; state.historyIndex++; restoreSnapshot(state.history[state.historyIndex]); }

function restoreSnapshot(snap) {
  const d=JSON.parse(snap);
  state.items=d.items; state.roomColors=d.roomColors; state.roomTextures=d.roomTextures||{}; state.roomLabels=d.roomLabels;
  clearSelection(); renderAll();
}

// ═══════════════════════════════════════════════════════════════
// THEME (features 73-77)
// ═══════════════════════════════════════════════════════════════
function applyTheme(t) {
  state.theme=t;
  document.body.className=`theme-${t}`;
  localStorage.setItem('apt_theme',t);
  renderAll();
}

// ═══════════════════════════════════════════════════════════════
// UNITS (feature 80)
// ═══════════════════════════════════════════════════════════════
function cycleUnits() {
  const order=['m','cm','ft'];
  const idx=order.indexOf(state.units);
  state.units=order[(idx+1)%order.length];
  document.getElementById('btn-units').textContent=state.units;
  buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims);
}

// ═══════════════════════════════════════════════════════════════
// ROOM CUSTOMIZATION
// ═══════════════════════════════════════════════════════════════
function applyRoomColor() {
  const r=state._selectedRoom; if(!r){alert('Clique em um cômodo!');return;}
  const c=document.getElementById('room-custom-color').value;
  pushHistory(); state.roomColors[r.id]=c;
  buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims);
  document.querySelectorAll('.room').forEach(el=>el.classList.toggle('selected-room',el.getAttribute('data-room-id')===r.id));
}

function resetRoomColor() {
  const r=state._selectedRoom; if(!r) return;
  pushHistory(); delete state.roomColors[r.id];
  buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims);
}

function applyRoomTexture(tex) {
  const r=state._selectedRoom; if(!r) return;
  pushHistory(); state.roomTextures[r.id]=tex;
  buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims);
}

function applyRoomLabel() {
  const r=state._selectedRoom; if(!r) return;
  const lbl=document.getElementById('room-label-input').value.trim();
  pushHistory(); state.roomLabels[r.id]=lbl;
  if(lbl) r.name=lbl;
  buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims);
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS (feature 97)
// ═══════════════════════════════════════════════════════════════
function showStats() {
  const counts={};
  state.items.forEach(i=>{ const k=i.furnitureType||i.type; counts[k]=(counts[k]||0)+1; });
  const total=state.items.length;
  const totalArea=ROOMS.reduce((s,r)=>s+(r.dims?.w||0)*(r.dims?.h||0),0);

  let html=`<div class="stats-grid">
    <div class="stat-card"><div class="sv">${total}</div><div class="sk">Total de itens</div></div>
    <div class="stat-card"><div class="sv">${ROOMS.length}</div><div class="sk">Cômodos</div></div>
    <div class="stat-card"><div class="sv">290m²</div><div class="sk">Área privativa</div></div>
  </div>
  <table class="stats-table"><thead><tr><th>Tipo</th><th>Qtd</th></tr></thead><tbody>`;
  Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{ html+=`<tr><td>${k}</td><td>${v}</td></tr>`; });
  html+=`</tbody></table>`;
  document.getElementById('stats-content').innerHTML=html;
  showModal('stats-modal');
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY (feature 98)
// ═══════════════════════════════════════════════════════════════
function showInventory() {
  let html=`<table class="inventory-table"><thead><tr><th>#</th><th>Label</th><th>Tipo</th><th>X</th><th>Y</th><th>W×H</th><th>Ações</th></tr></thead><tbody>`;
  state.items.forEach((item,i)=>{
    html+=`<tr>
      <td>${i+1}</td>
      <td>${item.label||'—'}</td>
      <td>${item.furnitureType||item.type}</td>
      <td>${Math.round(item.x)}</td>
      <td>${Math.round(item.y)}</td>
      <td>${Math.round(item.w)}×${Math.round(item.h)}</td>
      <td class="inv-actions"><button onclick="selectItemById(${item.id});closeModal('inventory-modal')">Sel</button> <button onclick="deleteItemById(${item.id})">Del</button></td>
    </tr>`;
  });
  html+=`</tbody></table>`;
  document.getElementById('inventory-content').innerHTML=html;
  showModal('inventory-modal');
}

function selectItemById(id) { const item=state.items.find(i=>i.id===id); if(item) selectItem(item); }
function deleteItemById(id) {
  pushHistory(); state.items=state.items.filter(i=>i.id!==id);
  if(state.selectedIds.has(id)){ clearSelection(); }
  drawItems(); showInventory();
}

// ═══════════════════════════════════════════════════════════════
// EXPORT (features 89-95)
// ═══════════════════════════════════════════════════════════════
function exportPNG() {
  const ec=document.createElement('canvas'); ec.width=SVG_W; ec.height=SVG_H;
  const ectx=ec.getContext('2d');
  ectx.fillStyle='#f0ece4'; ectx.fillRect(0,0,SVG_W,SVG_H);
  const svgData=new XMLSerializer().serializeToString(floorSVG);
  const blob=new Blob([svgData],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=()=>{
    ectx.drawImage(img,0,0); URL.revokeObjectURL(url);
    state.items.forEach(item=>{
      ectx.save();
      ectx.translate(item.x+item.w/2,item.y+item.h/2);
      ectx.rotate((item.rotation||0)*Math.PI/180);
      const hw=item.w/2,hh=item.h/2;
      if(item.type==='wall'){ectx.fillStyle=item.fillColor||'#444';ectx.fillRect(-hw,-hh,item.w,item.h);}
      else if(item.type==='text'){ectx.fillStyle=item.textColor||'#222';ectx.font=`${item.fontSize||14}px Segoe UI`;ectx.textAlign='center';ectx.textBaseline='middle';ectx.fillText(item.text||'',0,0);}
      else{ectx.fillStyle=getFurnitureColor(item.furnitureType);ectx.strokeStyle='#333';ectx.lineWidth=1.5;roundRect(ectx,-hw,-hh,item.w,item.h,3);ectx.fill();ectx.stroke();ectx.fillStyle='#333';ectx.font=`${Math.max(7,Math.min(10,item.w/9))}px Segoe UI`;ectx.textAlign='center';ectx.textBaseline='middle';ectx.fillText(item.label||'',0,0);}
      ectx.restore();
    });
    const a=document.createElement('a'); a.download='planta-apartamento.png'; a.href=ec.toDataURL('image/png'); a.click();
  };
  img.src=url;
}

function exportSVG() {
  const svgStr=new XMLSerializer().serializeToString(floorSVG);
  const blob=new Blob([svgStr],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.download='planta-apartamento.svg'; a.href=url; a.click(); URL.revokeObjectURL(url);
}

function exportJSON() {
  const data={ items:state.items, roomColors:state.roomColors, roomTextures:state.roomTextures, roomLabels:state.roomLabels, zoom:state.zoom, panX:state.panX, panY:state.panY };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.download='planta-layout.json'; a.href=url; a.click(); URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      pushHistory();
      state.items=data.items||[]; state.roomColors=data.roomColors||{}; state.roomTextures=data.roomTextures||{}; state.roomLabels=data.roomLabels||{};
      if(data.zoom) state.zoom=data.zoom; if(data.panX!==undefined) state.panX=data.panX; if(data.panY!==undefined) state.panY=data.panY;
      if(state.items.length) itemCounter=Math.max(...state.items.map(i=>i.id||0));
      renderAll();
    } catch(err){ alert('Arquivo JSON inválido!'); }
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════
// SAVE / LOAD (features 92-95)
// ═══════════════════════════════════════════════════════════════
function autoSave() {
  const data={ items:state.items, roomColors:state.roomColors, roomTextures:state.roomTextures, roomLabels:state.roomLabels, zoom:state.zoom, panX:state.panX, panY:state.panY };
  localStorage.setItem('apartment_layout', JSON.stringify(data));
}

function saveToStorage() { autoSave(); alert('Layout salvo!'); }

function loadFromStorage() {
  const raw=localStorage.getItem('apartment_layout'); if(!raw) return;
  try{
    const d=JSON.parse(raw);
    state.items=d.items||[]; state.roomColors=d.roomColors||{}; state.roomTextures=d.roomTextures||{}; state.roomLabels=d.roomLabels||{};
    if(d.zoom) state.zoom=d.zoom; if(d.panX!==undefined) state.panX=d.panX; if(d.panY!==undefined) state.panY=d.panY;
    if(state.items.length) itemCounter=Math.max(...state.items.map(i=>i.id||0),0);
    const t=localStorage.getItem('apt_theme')||'dark';
    state.theme=t; document.body.className=`theme-${t}`;
    document.getElementById('theme-select').value=t;
    renderAll(); zoomLevelEl.textContent=Math.round(state.zoom*100)+'%';
  } catch(e){ console.warn('load error',e); }
}

// ═══════════════════════════════════════════════════════════════
// ZOOM / PAN (features 83-88)
// ═══════════════════════════════════════════════════════════════
function zoom(f) { zoomAt(f,interCanvas.width/2,interCanvas.height/2); }
function zoomAt(f,cx,cy) {
  const nz=Math.min(Math.max(state.zoom*f,0.15),6);
  const r=nz/state.zoom;
  state.panX=cx-r*(cx-state.panX); state.panY=cy-r*(cy-state.panY);
  state.zoom=nz; zoomLevelEl.textContent=Math.round(nz*100)+'%';
  renderAll();
}

function resetZoom() {
  const rect=canvasInner.getBoundingClientRect();
  const sx=(rect.width-40)/SVG_W, sy=(rect.height-40)/SVG_H;
  state.zoom=Math.min(sx,sy,1);
  state.panX=(rect.width-SVG_W*state.zoom)/2;
  state.panY=(rect.height-SVG_H*state.zoom)/2;
  zoomLevelEl.textContent=Math.round(state.zoom*100)+'%';
  renderAll();
}

function zoomToSelection() {
  const items=getSelectedItems(); if(!items.length) return;
  const minX=Math.min(...items.map(i=>i.x)), minY=Math.min(...items.map(i=>i.y));
  const maxX=Math.max(...items.map(i=>i.x+i.w)), maxY=Math.max(...items.map(i=>i.y+i.h));
  const rect=canvasInner.getBoundingClientRect();
  const sx=(rect.width-80)/(maxX-minX+40), sy=(rect.height-80)/(maxY-minY+40);
  state.zoom=Math.min(sx,sy,3);
  state.panX=rect.width/2-((minX+maxX)/2)*state.zoom;
  state.panY=rect.height/2-((minY+maxY)/2)*state.zoom;
  zoomLevelEl.textContent=Math.round(state.zoom*100)+'%'; renderAll();
}

function zoomToRoom(room) {
  const rect=canvasInner.getBoundingClientRect();
  const sx=(rect.width-80)/room.w, sy=(rect.height-80)/room.h;
  state.zoom=Math.min(sx,sy,3);
  state.panX=rect.width/2-(room.x+room.w/2)*state.zoom;
  state.panY=rect.height/2-(room.y+room.h/2)*state.zoom;
  zoomLevelEl.textContent=Math.round(state.zoom*100)+'%'; renderAll();
}

function toggleFullscreen() {
  if(!document.fullscreenElement){ document.documentElement.requestFullscreen(); }
  else { document.exitFullscreen(); }
}

// ═══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════════════
function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ═══════════════════════════════════════════════════════════════
// TOOL STATE
// ═══════════════════════════════════════════════════════════════
function setTool(tool) {
  state.tool=tool; state.isDrawingWall=false; state.wallStart=null;
  state.isMeasuring=false; state.measureStart=null;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
  const btn=document.getElementById(`tool-${tool}`); if(btn) btn.classList.add('active');
  const hints={ select:'↖ Clique para selecionar · Shift+clique = multi · Arraste vazio = caixa', wall:'🧱 Clique e arraste para parede · Esc = cancelar', door:'🚪 Clique para posicionar porta', window:'🪟 Clique para posicionar janela', text:'T Clique para adicionar texto', measure:'📐 Clique em 2 pontos para medir', erase:'✕ Clique em item para apagar' };
  toolbarHint.textContent=hints[tool]||'';
  const cursors={ select:'default', wall:'crosshair', door:'crosshair', window:'crosshair', text:'text', measure:'crosshair', erase:'not-allowed' };
  interCanvas.style.cursor=cursors[tool]||'default';
}

// ═══════════════════════════════════════════════════════════════
// MOUSE EVENTS
// ═══════════════════════════════════════════════════════════════
function onMouseDown(e) {
  hideContextMenu();
  if (e.button===2) { onRightClick(e); return; }
  if (e.button===1 || e.altKey) { state.isPanning=true; state.panStart={x:e.clientX-state.panX,y:e.clientY-state.panY}; interCanvas.style.cursor='grabbing'; return; }

  const sp=getCanvasPos(e), wp=screenToWorld(sp.x,sp.y);
  wp.x=snapCoord(wp.x); wp.y=snapCoord(wp.y);

  if (state.tool==='select') {
    if (state.selectedFurniture) { placeFurniture(wp.x,wp.y); return; }
    const hit=hitTestItems(wp.x,wp.y);
    if (hit) {
      if (hit.locked) return;
      if (e.shiftKey) {
        if(state.selectedIds.has(hit.id)) state.selectedIds.delete(hit.id);
        else state.selectedIds.add(hit.id);
        updateSelectionInfo(); updatePropertiesBar(); updateAlignButtons(); drawItems();
      } else {
        if (!state.selectedIds.has(hit.id)) selectItem(hit);
        state.isDragging=true;
        const items=getSelectedItems();
        state.dragGroup=items.map(i=>({ id:i.id, ox:wp.x-i.x, oy:wp.y-i.y }));
      }
    } else {
      if(!e.shiftKey) clearSelection();
      state.isBoxSelecting=true; state.boxStart={...wp}; state.boxEnd={...wp};
    }
  }
  else if (state.tool==='wall') {
    if (!state.isDrawingWall) { state.isDrawingWall=true; state.wallStart={x:wp.x,y:wp.y}; }
    else { placeWall(wp); }
  }
  else if (state.tool==='door')   placeDoorOrWindow('door',wp.x,wp.y);
  else if (state.tool==='window') placeDoorOrWindow('window',wp.x,wp.y);
  else if (state.tool==='text')   { state.pendingTextPos=wp; showModal('text-modal'); setTimeout(()=>document.getElementById('text-input').focus(),50); }
  else if (state.tool==='measure') {
    if(!state.isMeasuring){ state.isMeasuring=true; state.measureStart={x:wp.x,y:wp.y}; }
    else {
      const dx=wp.x-state.measureStart.x, dy=wp.y-state.measureStart.y;
      const len=Math.sqrt(dx*dx+dy*dy);
      const angle=Math.atan2(dy,dx)*180/Math.PI;
      const label=formatDist(len/40);
      pushHistory();
      state.items.push({ id:++itemCounter, type:'measure', label:'Medida', distLabel:label, x:state.measureStart.x, y:state.measureStart.y-5, w:len, h:10, rotation:angle, flipH:false, flipV:false, opacity:100, visible:true, locked:false });
      state.isMeasuring=false; state.measureStart=null; drawItems();
    }
  }
  else if (state.tool==='erase') {
    const hit=hitTestItems(wp.x,wp.y);
    if(hit){ pushHistory(); state.items=state.items.filter(i=>i.id!==hit.id); state.selectedIds.delete(hit.id); drawItems(); }
  }
}

function onMouseMove(e) {
  if(state.isPanning){ state.panX=e.clientX-state.panStart.x; state.panY=e.clientY-state.panStart.y; renderAll(); return; }
  const sp=getCanvasPos(e), wp=screenToWorld(sp.x,sp.y);
  const snapped={ x:snapCoord(wp.x), y:snapCoord(wp.y) };
  state._mousePos=snapped;

  if(state.isBoxSelecting){ state.boxEnd=snapped; drawItems(); return; }
  if(state.isDrawingWall||state.isMeasuring){ drawItems(); return; }

  if(state.isDragging&&state.selectedIds.size>0){
    state.dragGroup.forEach(dg=>{ const item=state.items.find(i=>i.id===dg.id); if(item&&!item.locked){ item.x=snapCoord(wp.x-dg.ox); item.y=snapCoord(wp.y-dg.oy); } });
    drawItems(); drawMinimap();
  }

  // Area hover
  if(state.showAreaHover&&state.tool==='select'&&!state.isDragging){
    const room=hitTestRooms(wp.x,wp.y);
    if(room&&room.dims){
      const area=(room.dims.w*room.dims.h).toFixed(1);
      areaTooltip.textContent=`${room.name} · ${area} m²`;
      areaTooltip.style.display='block';
      areaTooltip.style.left=(sp.x+16)+'px'; areaTooltip.style.top=(sp.y-10)+'px';
    } else { areaTooltip.style.display='none'; }
  }

  // Cursor
  if(state.tool==='select'&&!state.selectedFurniture){
    const hit=hitTestItems(wp.x,wp.y);
    interCanvas.style.cursor=hit?(state.isDragging?'grabbing':'grab'):'default';
  }
}

function onMouseUp(e) {
  if(state.isPanning){ state.isPanning=false; interCanvas.style.cursor=state.tool==='select'?'default':'crosshair'; return; }
  if(state.isBoxSelecting){
    state.isBoxSelecting=false;
    const bx=Math.min(state.boxStart.x,state.boxEnd.x), by=Math.min(state.boxStart.y,state.boxEnd.y);
    const bw=Math.abs(state.boxEnd.x-state.boxStart.x), bh=Math.abs(state.boxEnd.y-state.boxStart.y);
    if(bw>5&&bh>5){ const hits=itemsInBox(bx,by,bw,bh); if(hits.length) selectItems(hits); }
    state.boxStart=null; state.boxEnd=null; drawItems(); return;
  }
  if(state.isDragging){ state.isDragging=false; pushHistory(); }
}

function onSVGClick(e) {
  const roomEl=e.target.closest('[data-room-id]');
  if(roomEl){
    const room=ROOMS.find(r=>r.id===roomEl.getAttribute('data-room-id'));
    if(room){
      selectRoom(room);
      switchTab('quartos');
      // Double click: zoom to room
    }
  } else { selectRoom(null); }
}

function onSVGDblClick(e) {
  const roomEl=e.target.closest('[data-room-id]');
  if(roomEl){ const room=ROOMS.find(r=>r.id===roomEl.getAttribute('data-room-id')); if(room) zoomToRoom(room); }
}

function onWheel(e) {
  e.preventDefault();
  const sp=getCanvasPos(e); const f=e.deltaY<0?1.1:0.9; zoomAt(f,sp.x,sp.y);
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT MENU (feature 100)
// ═══════════════════════════════════════════════════════════════
function onRightClick(e) {
  e.preventDefault();
  const sp=getCanvasPos(e), wp=screenToWorld(sp.x,sp.y);
  const hit=hitTestItems(wp.x,wp.y);
  if(hit&&!state.selectedIds.has(hit.id)) selectItem(hit);
  const cm=document.getElementById('context-menu');
  cm.style.left=e.clientX+'px'; cm.style.top=e.clientY+'px';
  cm.classList.add('show');
}

function hideContextMenu() { document.getElementById('context-menu').classList.remove('show'); }

function handleContextAction(action) {
  hideContextMenu();
  const map={ copy:()=>copySelected(), cut:()=>copySelected(true), paste:()=>pasteClipboard(), duplicate:duplicateSelected, 'select-all':selectAll, 'to-front':bringToFront, 'to-back':sendToBack, lock:toggleLock, hide:toggleVisible, delete:deleteSelected };
  if(map[action]) map[action]();
}

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════
function onKeyDown(e) {
  const tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;

  if(e.ctrlKey||e.metaKey){
    switch(e.key.toLowerCase()){
      case 'z': e.preventDefault(); undo(); break;
      case 'y': e.preventDefault(); redo(); break;
      case 'a': e.preventDefault(); selectAll(); break;
      case 'c': e.preventDefault(); copySelected(); break;
      case 'x': e.preventDefault(); copySelected(true); break;
      case 'v': e.preventDefault(); pasteClipboard(); break;
      case 'd': e.preventDefault(); duplicateSelected(); break;
      case 'g': e.preventDefault(); e.shiftKey?ungroupSelected():groupSelected(); break;
      case 'p': e.preventDefault(); window.print(); break;
    }
    return;
  }

  switch(e.key.toLowerCase()){
    case 'v': case 'escape': setTool('select'); state.selectedFurniture=null; document.querySelectorAll('.furniture-item').forEach(i=>i.classList.remove('selected-tool')); interCanvas.style.cursor='default'; if(e.key==='Escape'&&state.isDrawingWall){state.isDrawingWall=false;state.wallStart=null;drawItems();} if(e.key==='Escape'&&state.isMeasuring){state.isMeasuring=false;state.measureStart=null;drawItems();} break;
    case 'w': setTool('wall'); break;
    case 'd': setTool('door'); break;
    case 'n': setTool('window'); break;
    case 't': setTool('text'); break;
    case 'm': setTool('measure'); break;
    case 'e': setTool('erase'); break;
    case 'f': resetZoom(); break;
    case 'delete': case 'backspace': e.preventDefault(); deleteSelected(); break;
    case 'r': modifySelectedItem(i=>i.rotation=((i.rotation||0)+45)%360); updatePropertiesBar(); break;
    case 'l': toggleLock(); break;
    case 'h': toggleVisible(); break;
    case '[': sendBackward(); break;
    case ']': bringForward(); break;
    case 'tab': e.preventDefault();
      const items=state.items; if(!items.length) break;
      const ids=items.map(i=>i.id);
      const curIdx=state.selectedIds.size===1?ids.indexOf([...state.selectedIds][0]):-1;
      const next=items[(curIdx+1)%items.length]; selectItem(next); break;
  }

  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){
    e.preventDefault();
    const d=e.shiftKey?10:1;
    modifySelectedItem(i=>{ if(e.key==='ArrowUp') i.y-=d; if(e.key==='ArrowDown') i.y+=d; if(e.key==='ArrowLeft') i.x-=d; if(e.key==='ArrowRight') i.x+=d; });
  }
}

// ═══════════════════════════════════════════════════════════════
// BIND EVENTS
// ═══════════════════════════════════════════════════════════════
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-content').forEach(c=>c.classList.toggle('active',c.id===`tab-${name}`));
}

function bindEvents() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.id.replace('tool-',''))));

  // Furniture items
  document.querySelectorAll('.furniture-item').forEach(item=>{
    item.addEventListener('click',()=>{
      document.querySelectorAll('.furniture-item').forEach(i=>i.classList.remove('selected-tool'));
      item.classList.add('selected-tool');
      state.selectedFurniture={ type:item.dataset.type, w:parseInt(item.dataset.w), h:parseInt(item.dataset.h), label:item.dataset.label };
      setTool('select'); toolbarHint.textContent=`Clique na planta para colocar: ${item.dataset.label}`; interCanvas.style.cursor='copy';
    });
  });

  // Furniture search
  document.getElementById('furniture-search').addEventListener('input',function(){
    const q=this.value.toLowerCase();
    document.querySelectorAll('.furniture-item').forEach(item=>item.classList.toggle('hidden',q.length>0&&!item.dataset.label.toLowerCase().includes(q)&&!item.dataset.type.toLowerCase().includes(q)));
  });

  // Canvas events
  interCanvas.addEventListener('mousedown',onMouseDown);
  interCanvas.addEventListener('mousemove',onMouseMove);
  interCanvas.addEventListener('mouseup',onMouseUp);
  interCanvas.addEventListener('wheel',onWheel,{passive:false});
  interCanvas.addEventListener('contextmenu',e=>e.preventDefault());
  interCanvas.addEventListener('mouseleave',()=>{ areaTooltip.style.display='none'; });

  // SVG room clicks
  floorSVG.addEventListener('click',onSVGClick);
  floorSVG.addEventListener('dblclick',onSVGDblClick);

  // Context menu
  document.getElementById('context-menu').addEventListener('click',e=>{ const item=e.target.closest('.ctx-item'); if(item) handleContextAction(item.dataset.action); });
  document.addEventListener('mousedown',e=>{ if(!e.target.closest('#context-menu')) hideContextMenu(); });

  // Alignment
  document.getElementById('align-left').addEventListener('click',alignLeft);
  document.getElementById('align-center-h').addEventListener('click',alignCenterH);
  document.getElementById('align-right').addEventListener('click',alignRight);
  document.getElementById('align-top').addEventListener('click',alignTop);
  document.getElementById('align-center-v').addEventListener('click',alignCenterV);
  document.getElementById('align-bottom').addEventListener('click',alignBottom);
  document.getElementById('dist-h').addEventListener('click',distributeH);
  document.getElementById('dist-v').addEventListener('click',distributeV);
  document.getElementById('btn-group').addEventListener('click',groupSelected);
  document.getElementById('btn-ungroup').addEventListener('click',ungroupSelected);

  // Z-order
  document.getElementById('z-front').addEventListener('click',bringToFront);
  document.getElementById('z-up').addEventListener('click',bringForward);
  document.getElementById('z-down').addEventListener('click',sendBackward);
  document.getElementById('z-back').addEventListener('click',sendToBack);

  // Properties bar
  document.getElementById('prop-rotation').addEventListener('input',()=>modifySelectedItem(i=>{i.rotation=parseInt(document.getElementById('prop-rotation').value)||0;}));
  document.getElementById('prop-width').addEventListener('input',()=>modifySelectedItem(i=>{i.w=parseInt(document.getElementById('prop-width').value)||i.w;}));
  document.getElementById('prop-height').addEventListener('input',()=>modifySelectedItem(i=>{i.h=parseInt(document.getElementById('prop-height').value)||i.h;}));
  document.getElementById('prop-opacity').addEventListener('input',()=>modifySelectedItem(i=>{i.opacity=parseInt(document.getElementById('prop-opacity').value);}));
  document.getElementById('prop-fill-color').addEventListener('input',()=>modifySelectedItem(i=>{i.fillColor=document.getElementById('prop-fill-color').value;}));
  document.getElementById('prop-flip-h').addEventListener('click',()=>modifySelectedItem(i=>i.flipH=!i.flipH));
  document.getElementById('prop-flip-v').addEventListener('click',()=>modifySelectedItem(i=>i.flipV=!i.flipV));
  document.getElementById('prop-rotate90').addEventListener('click',()=>modifySelectedItem(i=>i.rotation=((i.rotation||0)+90)%360));
  document.getElementById('prop-duplicate').addEventListener('click',duplicateSelected);
  document.getElementById('prop-lock').addEventListener('click',toggleLock);
  document.getElementById('prop-visible').addEventListener('click',toggleVisible);
  document.getElementById('prop-delete').addEventListener('click',deleteSelected);

  // Room customization
  document.querySelectorAll('.color-swatch').forEach(sw=>{ sw.addEventListener('click',()=>{ document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active')); sw.classList.add('active'); document.getElementById('room-custom-color').value=sw.dataset.color; }); });
  document.getElementById('btn-apply-room-color').addEventListener('click',applyRoomColor);
  document.getElementById('btn-reset-room-color').addEventListener('click',resetRoomColor);
  document.getElementById('btn-apply-room-label').addEventListener('click',applyRoomLabel);

  // Textures
  document.querySelectorAll('.texture-item').forEach(ti=>{ ti.addEventListener('click',()=>{ document.querySelectorAll('.texture-item').forEach(t=>t.classList.remove('active')); ti.classList.add('active'); applyRoomTexture(ti.dataset.texture); }); });

  // Toggles
  document.getElementById('toggle-room-labels').addEventListener('change',e=>{ state.showLabels=e.target.checked; buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims); });
  document.getElementById('toggle-dimensions').addEventListener('change',e=>{ state.showDims=e.target.checked; buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims); });
  document.getElementById('toggle-area-hover').addEventListener('change',e=>{ state.showAreaHover=e.target.checked; });

  // Config
  document.getElementById('cfg-bg-color').addEventListener('input',e=>{ document.getElementById('canvas-area').style.background=e.target.value; });
  document.getElementById('cfg-wall-color').addEventListener('input',e=>{ state.svgWallColor=e.target.value; buildFloorPlan(floorSVG,state.roomColors,state.roomTextures,state.showLabels,state.showDims); });
  document.getElementById('cfg-grid').addEventListener('change',e=>{ state.gridVisible=e.target.checked; drawGrid(); });
  document.getElementById('cfg-snap').addEventListener('change',e=>{ state.snapToGrid=e.target.checked; });
  document.getElementById('cfg-snap-obj').addEventListener('change',e=>{ state.snapToObjects=e.target.checked; });
  document.getElementById('cfg-shadows').addEventListener('change',e=>{ state.shadowsEnabled=e.target.checked; drawItems(); });
  document.getElementById('cfg-grid-size').addEventListener('input',e=>{ state.gridSize=parseInt(e.target.value)||20; drawGrid(); });

  // Zoom
  document.getElementById('btn-zoom-in').addEventListener('click',()=>zoom(1.2));
  document.getElementById('btn-zoom-out').addEventListener('click',()=>zoom(0.83));
  document.getElementById('btn-zoom-fit').addEventListener('click',resetZoom);
  document.getElementById('btn-zoom-sel').addEventListener('click',zoomToSelection);

  // Wall tools
  document.getElementById('btn-draw-wall').addEventListener('click',()=>setTool('wall'));
  document.getElementById('btn-draw-door').addEventListener('click',()=>setTool('door'));
  document.getElementById('btn-draw-window').addEventListener('click',()=>setTool('window'));
  document.getElementById('btn-draw-sliding').addEventListener('click',()=>{ setTool('select'); pushHistory(); });
  document.getElementById('btn-draw-column').addEventListener('click',()=>{ /* next click places column */ state.selectedFurniture={type:'column',w:40,h:40,label:'Coluna'}; interCanvas.style.cursor='copy'; toolbarHint.textContent='Clique para colocar coluna/pilar'; });
  document.getElementById('btn-draw-stairs').addEventListener('click',()=>{ state.selectedFurniture={type:'stairs',w:100,h:180,label:'Escada'}; interCanvas.style.cursor='copy'; toolbarHint.textContent='Clique para colocar escada'; });
  document.getElementById('btn-delete-selected').addEventListener('click',deleteSelected);
  document.getElementById('wall-thickness').addEventListener('change',e=>state.wallThickness=parseInt(e.target.value));
  document.getElementById('wall-color').addEventListener('input',e=>state.wallColor=e.target.value);

  // Annotation tab tools
  document.getElementById('btn-tool-text').addEventListener('click',()=>setTool('text'));
  document.getElementById('btn-tool-measure').addEventListener('click',()=>setTool('measure'));

  // Header
  document.getElementById('btn-undo').addEventListener('click',undo);
  document.getElementById('btn-redo').addEventListener('click',redo);
  document.getElementById('btn-reset').addEventListener('click',()=>{ if(confirm('Apagar todos os itens e personalização?')){ pushHistory(); state.items=[]; state.roomColors={}; state.roomTextures={}; state.roomLabels={}; clearSelection(); renderAll(); } });
  document.getElementById('btn-export-png').addEventListener('click',exportPNG);
  document.getElementById('btn-export-svg').addEventListener('click',exportSVG);
  document.getElementById('btn-export-json').addEventListener('click',exportJSON);
  document.getElementById('btn-import-json').addEventListener('click',()=>document.getElementById('import-file-input').click());
  document.getElementById('import-file-input').addEventListener('change',e=>{ if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; });
  document.getElementById('btn-print').addEventListener('click',()=>window.print());
  document.getElementById('btn-stats').addEventListener('click',showStats);
  document.getElementById('btn-inventory').addEventListener('click',showInventory);
  document.getElementById('btn-shortcuts').addEventListener('click',()=>showModal('shortcuts-modal'));
  document.getElementById('btn-fullscreen').addEventListener('click',toggleFullscreen);
  document.getElementById('btn-units').addEventListener('click',cycleUnits);
  document.getElementById('btn-ruler').addEventListener('click',()=>{ state.rulerVisible=!state.rulerVisible; document.getElementById('btn-ruler').style.color=state.rulerVisible?'var(--accent)':''; drawRulers(); });
  document.getElementById('theme-select').addEventListener('change',e=>applyTheme(e.target.value));

  // Save/load
  document.getElementById('btn-save').addEventListener('click',saveToStorage);
  document.getElementById('btn-load').addEventListener('click',loadFromStorage);
  document.getElementById('btn-clear-storage').addEventListener('click',()=>{ if(confirm('Limpar storage?')){ localStorage.removeItem('apartment_layout'); state.items=[]; state.roomColors={}; state.roomTextures={}; clearSelection(); renderAll(); } });

  // Text modal
  document.getElementById('text-confirm').addEventListener('click',confirmText);
  document.getElementById('text-cancel').addEventListener('click',()=>closeModal('text-modal'));
  document.getElementById('text-input').addEventListener('keydown',e=>{ if(e.key==='Enter') confirmText(); });

  // Modal close buttons
  document.getElementById('close-stats').addEventListener('click',()=>closeModal('stats-modal'));
  document.getElementById('close-inventory').addEventListener('click',()=>closeModal('inventory-modal'));
  document.getElementById('close-shortcuts').addEventListener('click',()=>closeModal('shortcuts-modal'));

  // Close modal on backdrop click
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{ if(e.target===m) m.classList.remove('show'); }));

  // Keyboard
  document.addEventListener('keydown',onKeyDown);

  // Resize
  window.addEventListener('resize',()=>{ resizeCanvases(); renderAll(); });

  setTool('select');
}

// ═══════════════════════════════════════════════════════════════
// TEXT CONFIRM
// ═══════════════════════════════════════════════════════════════
function confirmText() {
  const text=document.getElementById('text-input').value.trim();
  if(!text||!state.pendingTextPos){ closeModal('text-modal'); return; }
  pushHistory();
  const fontSize=parseInt(document.getElementById('text-size').value)||14;
  const textColor=document.getElementById('text-color').value;
  const bold=document.getElementById('text-bold').checked;
  const pos=state.pendingTextPos;
  state.items.push({ id:++itemCounter, type:'text', text, label:text, x:pos.x-80, y:pos.y-fontSize/2, w:160, h:fontSize+10, fontSize, textColor, bold, rotation:0, flipH:false, flipV:false, opacity:100, visible:true, locked:false });
  closeModal('text-modal'); state.pendingTextPos=null; drawItems();
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded',()=>{
  init();
  setTimeout(resetZoom,120);
});

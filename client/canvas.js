// Drawing and coordinate mapping. Raw Canvas API only.

const canvas = {
  el: null,
  cursorEl: null,
  ctx: null,
  cursorCtx: null,
  strokes: [],
  userColors: {}
};

function getCanvasCoords(ev, el) {
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  const scaleX = el.width / rect.width;
  const scaleY = el.height / rect.height;
  
  let clientX = 0;
  let clientY = 0;
  
  if (ev.clientX != null && ev.clientY != null) {
    clientX = ev.clientX;
    clientY = ev.clientY;
  } else if (ev.touches && ev.touches.length > 0) {
    clientX = ev.touches[0].clientX;
    clientY = ev.touches[0].clientY;
  } else if (ev.changedTouches && ev.changedTouches.length > 0) {
    clientX = ev.changedTouches[0].clientX;
    clientY = ev.changedTouches[0].clientY;
  }
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function init(el, cursorEl) {
  canvas.el = el;
  canvas.cursorEl = cursorEl;
  canvas.ctx = el.getContext('2d');
  canvas.cursorCtx = cursorEl.getContext('2d');
  resize();
}

function resize() {
  if (!canvas.el || !canvas.cursorEl) return;
  const wrap = canvas.el.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.el.width = w;
  canvas.el.height = h;
  canvas.cursorEl.width = w;
  canvas.cursorEl.height = h;
  redraw();
  drawCursors();
}

function setSize(w, h) {
  if (!canvas.el || !canvas.cursorEl) return;
  canvas.el.width = w;
  canvas.el.height = h;
  canvas.cursorEl.width = w;
  canvas.cursorEl.height = h;
  redraw();
}

function redraw() {
  const ctx = canvas.ctx;
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.el.width, canvas.el.height);
  for (const stroke of canvas.strokes) {
    drawStroke(ctx, stroke);
  }
}

function drawStroke(ctx, stroke) {
  const segments = stroke.segments || [];
  if (segments.length === 0) return;
  const tool = stroke.tool || 'brush';
  const style = stroke.style || {};
  const color = style.color || canvas.userColors[stroke.userId] || '#000';
  const width = style.width != null ? style.width : 5;

  ctx.save();
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.strokeStyle = color;
  }
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  const first = segments[0];
  ctx.moveTo(first.start.x, first.start.y);
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    ctx.lineTo(seg.end.x, seg.end.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSegment(ctx, stroke, start, end, style) {
  const tool = stroke.tool || 'brush';
  const color = style && style.color || canvas.userColors[stroke.userId] || '#000';
  const width = (style && style.width != null) ? style.width : 5;
  ctx.save();
  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    ctx.strokeStyle = color;
  }
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function addStroke(stroke) {
  canvas.strokes.push(stroke);
  redraw();
}

let pendingRedraw = false;

function appendSegment(strokeId, start, end) {
  const s = canvas.strokes.find(x => x.id === strokeId);
  if (!s) return;
  if (!s.segments) s.segments = [];
  s.segments.push({ start, end });
  
  const ctx = canvas.ctx;
  if (ctx) {
    drawSegment(ctx, s, start, end, s.style);
  }
  
  if (!pendingRedraw) {
    pendingRedraw = true;
    requestAnimationFrame(() => {
      pendingRedraw = false;
    });
  }
}

function removeStroke(strokeId) {
  const i = canvas.strokes.findIndex(x => x.id === strokeId);
  if (i >= 0) {
    canvas.strokes.splice(i, 1);
    redraw();
  }
}

function redoStroke(stroke) {
  canvas.strokes.push(stroke);
  redraw();
}

function setFullState(data) {
  canvas.strokes = (data.history || []).map(s => ({ ...s, segments: (s.segments || []).map(seg => ({ ...seg })) }));
  redraw();
}

function setUserColor(userId, color) {
  canvas.userColors[userId] = color;
}

const cursors = {};
const userInfo = {};

function setUserInfo(userId, info) {
  userInfo[userId] = info;
}

function setCursor(userId, x, y) {
  cursors[userId] = { x, y };
}

function drawCursors() {
  const ctx = canvas.cursorCtx;
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.cursorEl.width, canvas.cursorEl.height);
  for (const [userId, pos] of Object.entries(cursors)) {
    const color = canvas.userColors[userId] || '#666';
    const info = userInfo[userId] || { id: userId };
    const label = info.name || info.id || userId;
    const shortLabel = label.length > 8 ? label.slice(0, 8) + '...' : label;
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const textWidth = ctx.measureText(shortLabel).width;
    const padding = 4;
    const labelX = pos.x + 12;
    const labelY = pos.y - 16;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(labelX - padding, labelY - padding, textWidth + padding * 2, 16 + padding * 2);
    
    ctx.fillStyle = '#fff';
    ctx.fillText(shortLabel, labelX, labelY);
    ctx.restore();
  }
}

function getCursors() {
  return cursors;
}

function applyStrokeStart(data) {
  const stroke = { ...data, segments: data.segments || [] };
  addStroke(stroke);
}

function applyStrokeSegment(data) {
  appendSegment(data.strokeId, data.start, data.end);
}

function applyStrokeEnd(data) {
  // no-op; segment list already complete
}

function applyUndo(data) {
  removeStroke(data.strokeId);
}

function applyRedo(data) {
  if (data.stroke) redoStroke(data.stroke);
}

function applyCursor(data) {
  setCursor(data.userId, data.x, data.y);
  if (data.userName || data.userId) {
    setUserInfo(data.userId, { id: data.userId, name: data.userName });
  }
  drawCursors();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    canvas,
    getCanvasCoords,
    init,
    resize,
    setSize,
    redraw,
    addStroke,
    appendSegment,
    removeStroke,
    redoStroke,
    setFullState,
    setUserColor,
    setUserInfo,
    setCursor,
    drawCursors,
    getCursors,
    applyStrokeStart,
    applyStrokeSegment,
    applyStrokeEnd,
    applyUndo,
    applyRedo,
    applyCursor
  };
} else {
  window.canvasModule = {
    canvas,
    getCanvasCoords,
    init,
    resize,
    setSize,
    redraw,
    addStroke,
    appendSegment,
    removeStroke,
    redoStroke,
    setFullState,
    setUserColor,
    setUserInfo,
    setCursor,
    drawCursors,
    getCursors,
    applyStrokeStart,
    applyStrokeSegment,
    applyStrokeEnd,
    applyUndo,
    applyRedo,
    applyCursor
  };
}

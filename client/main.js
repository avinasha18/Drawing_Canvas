
const canvasEl = document.getElementById('canvas');
const cursorLayer = document.getElementById('cursor-layer');
const strokeWidthInput = document.getElementById('stroke-width');
const widthVal = document.getElementById('width-val');
const userListEl = document.getElementById('user-list');
const btnBrush = document.getElementById('btn-brush');
const btnEraser = document.getElementById('btn-eraser');
const btnUndo = document.getElementById('btn-undo');
const btnRedo = document.getElementById('btn-redo');

const canvasMod = window.canvasModule;
const wsMod = window.wsModule;

let tool = 'brush';
let color = '#000000';
let strokeWidth = 5;
let isDrawing = false;
let currentStrokeId = null;
let lastPos = null;
let segmentThrottle = 0;
const THROTTLE_MS = 8;
let cursorThrottle = 0;
const CURSOR_THROTTLE_MS = 50;
let rafId = null;

canvasMod.init(canvasEl, cursorLayer);

function handleResize() {
  canvasMod.resize();
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

handleResize();
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  setTimeout(handleResize, 100);
});

strokeWidthInput.addEventListener('input', () => {
  strokeWidth = parseInt(strokeWidthInput.value, 10);
  widthVal.textContent = strokeWidth;
});

document.querySelectorAll('.color').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    color = btn.dataset.color;
  });
});
document.querySelector('.color').classList.add('active');

btnBrush.addEventListener('click', () => {
  tool = 'brush';
  btnBrush.classList.add('active');
  btnEraser.classList.remove('active');
});
btnEraser.addEventListener('click', () => {
  tool = 'eraser';
  btnEraser.classList.add('active');
  btnBrush.classList.remove('active');
});

btnUndo.addEventListener('click', () => {
  wsMod.send('undo');
});
btnRedo.addEventListener('click', () => {
  wsMod.send('redo');
});

function getCoords(ev) {
  return canvasMod.getCanvasCoords(ev, canvasEl);
}

function genId() {
  return 's-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function emitSegment(start, end) {
  if (!currentStrokeId) return;
  wsMod.send('stroke_segment', { strokeId: currentStrokeId, start, end });
}

function emitCursor(x, y) {
  const now = Date.now();
  if (now - cursorThrottle < CURSOR_THROTTLE_MS) return;
  cursorThrottle = now;
  wsMod.send('cursor', { x, y });
}

function pointerDown(ev) {
  if (ev.pointerType === 'mouse' && ev.button !== 0) return;
  if (ev.touches && ev.touches.length > 1) return;
  ev.preventDefault();
  const pos = getCoords(ev);
  isDrawing = true;
  lastPos = pos;
  currentStrokeId = genId();
  wsMod.send('stroke_start', {
    strokeId: currentStrokeId,
    tool,
    style: { color, width: strokeWidth }
  });
  canvasMod.addStroke({
    id: currentStrokeId,
    userId: 'local',
    tool,
    style: { color, width: strokeWidth },
    segments: []
  });
  canvasMod.appendSegment(currentStrokeId, lastPos, pos);
  emitSegment(lastPos, pos);
}

function pointerMove(ev) {
  if (ev.touches && ev.touches.length > 1) {
    if (isDrawing) pointerUp(ev);
    return;
  }
  const pos = getCoords(ev);
  emitCursor(pos.x, pos.y);
  if (!isDrawing || !lastPos) return;
  ev.preventDefault();
  
  canvasMod.appendSegment(currentStrokeId, lastPos, pos);
  
  const now = Date.now();
  if (now - segmentThrottle >= THROTTLE_MS) {
    segmentThrottle = now;
    emitSegment(lastPos, pos);
  }
  lastPos = pos;
}

function pointerUp(ev) {
  if (!isDrawing) return;
  ev.preventDefault();
  const pos = getCoords(ev);
  if (lastPos && (lastPos.x !== pos.x || lastPos.y !== pos.y)) {
    emitSegment(lastPos, pos);
    canvasMod.appendSegment(currentStrokeId, lastPos, pos);
  }
  wsMod.send('stroke_end', { strokeId: currentStrokeId });
  isDrawing = false;
  currentStrokeId = null;
  lastPos = null;
}

canvasEl.addEventListener('pointerdown', pointerDown);
canvasEl.addEventListener('pointermove', pointerMove);
canvasEl.addEventListener('pointerup', pointerUp);
canvasEl.addEventListener('pointerleave', pointerUp);
canvasEl.addEventListener('pointercancel', pointerUp);

canvasEl.addEventListener('touchstart', ev => {
  if (ev.touches.length > 1) {
    ev.preventDefault();
  }
}, { passive: false });
canvasEl.addEventListener('touchmove', ev => ev.preventDefault(), { passive: false });
canvasEl.addEventListener('touchend', ev => {
  if (isDrawing) pointerUp(ev);
}, { passive: false });
canvasEl.addEventListener('touchcancel', ev => {
  if (isDrawing) pointerUp(ev);
}, { passive: false });

canvasEl.addEventListener('contextmenu', ev => ev.preventDefault());

function setUserList(users) {
  userListEl.innerHTML = '';
  (users || []).forEach(u => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = u.color || '#999';
    li.appendChild(dot);
    const name = u.name || u.id || 'User';
    const displayName = name.length > 10 ? name.slice(0, 10) + '...' : name;
    li.appendChild(document.createTextNode(displayName));
    li.title = u.id;
    userListEl.appendChild(li);
  });
}

wsMod.setHandlers({
  onOpen: () => {
    wsMod.send('join_room', { roomId: 'default' });
  },
  full_state: (data) => {
    canvasMod.setFullState(data);
  },
  user_list: (data) => {
    setUserList(data.users);
    (data.users || []).forEach(u => {
      canvasMod.setUserColor(u.id, u.color);
      canvasMod.setUserInfo(u.id, { id: u.id, name: u.name || u.id });
    });
  },
  user_joined: (data) => {
    setUserList(data.users);
    if (data.user) {
      canvasMod.setUserColor(data.user.id, data.user.color);
      canvasMod.setUserInfo(data.user.id, { id: data.user.id, name: data.user.name || data.user.id });
    }
  },
  user_left: (data) => {
    setUserList(data.users);
  },
  stroke_start: (data) => {
    if (data.id && !canvasMod.canvas.strokes.some(s => s.id === data.id)) {
      canvasMod.applyStrokeStart(data);
    }
  },
  stroke_segment: (data) => {
    canvasMod.applyStrokeSegment(data);
  },
  stroke_end: (data) => {
    canvasMod.applyStrokeEnd(data);
  },
  cursor: (data) => {
    canvasMod.applyCursor(data);
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        canvasMod.drawCursors();
        rafId = null;
      });
    }
  },
  undo_applied: (data) => {
    canvasMod.applyUndo(data);
  },
  redo_applied: (data) => {
    canvasMod.applyRedo(data);
  }
});

wsMod.connect();

// redraw cursors periodically to keep them visible
setInterval(() => {
  canvasMod.drawCursors();
}, 50);

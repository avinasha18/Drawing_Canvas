// Per-room stroke history and redo stack. Server is source of truth.

const history = new Map();
const redoStack = new Map();

const DEFAULT_ROOM = 'default';

function getHistory(roomId) {
  const id = roomId || DEFAULT_ROOM;
  if (!history.has(id)) history.set(id, []);
  return history.get(id);
}

function getRedoStack(roomId) {
  const id = roomId || DEFAULT_ROOM;
  if (!redoStack.has(id)) redoStack.set(id, []);
  return redoStack.get(id);
}

function addStroke(roomId, stroke) {
  const h = getHistory(roomId);
  if (!stroke.timestamp) stroke.timestamp = Date.now();
  h.push(stroke);
  return stroke;
}

function appendSegment(roomId, strokeId, start, end) {
  const h = getHistory(roomId);
  const stroke = h.find(s => s.id === strokeId);
  if (!stroke) return null;
  if (!stroke.segments) stroke.segments = [];
  stroke.segments.push({ start, end });
  return stroke;
}

function findStroke(roomId, strokeId) {
  const h = getHistory(roomId);
  return h.find(s => s.id === strokeId);
}

function undo(roomId) {
  const h = getHistory(roomId);
  const r = getRedoStack(roomId);
  if (h.length === 0) return null;
  const stroke = h.pop();
  r.push(stroke);
  return stroke;
}

function redo(roomId) {
  const h = getHistory(roomId);
  const r = getRedoStack(roomId);
  if (r.length === 0) return null;
  const stroke = r.pop();
  h.push(stroke);
  return stroke;
}

function getFullState(roomId) {
  return {
    history: getHistory(roomId).map(s => ({ ...s })),
    redoStack: getRedoStack(roomId).map(s => ({ ...s }))
  };
}

module.exports = {
  getHistory,
  getRedoStack,
  addStroke,
  appendSegment,
  findStroke,
  undo,
  redo,
  getFullState,
  DEFAULT_ROOM
};

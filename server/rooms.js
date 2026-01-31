// Room membership and broadcast. Assigns user color.

const rooms = new Map();
const socketToUser = new Map();

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e'
];
let colorIndex = 0;

function nextColor() {
  const c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

function ensureRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  return rooms.get(roomId);
}

let userCounter = 0;

function joinRoom(ws, roomId, userId, userName) {
  const id = roomId || 'default';
  const room = ensureRoom(id);
  const color = nextColor();
  userCounter++;
  const uid = userId || ws.id || String(Date.now());
  const name = userName || `User ${userCounter}`;
  const user = { id: uid, name, color, socketId: ws.id };
  socketToUser.set(ws.id, { roomId: id, user });
  room.add(ws.id);
  return user;
}

function leaveRoom(ws) {
  const meta = socketToUser.get(ws.id);
  if (!meta) return null;
  const { roomId, user } = meta;
  socketToUser.delete(ws.id);
  const room = rooms.get(roomId);
  if (room) {
    room.delete(ws.id);
    if (room.size === 0) rooms.delete(roomId);
  }
  return { roomId, user };
}

function getUsersInRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  const users = [];
  for (const sid of room) {
    const m = socketToUser.get(sid);
    if (m) users.push(m.user);
  }
  return users;
}

function getSocketUser(ws) {
  return socketToUser.get(ws.id);
}

function broadcastToRoom(roomId, sendToSocket, event, payload, excludeSocketId) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = JSON.stringify({ event, data: payload });
  for (const sid of room) {
    if (sid === excludeSocketId) continue;
    const ws = sendToSocket(sid);
    if (ws && ws.readyState === 1) ws.send(msg);
  }
}

module.exports = {
  joinRoom,
  leaveRoom,
  getUsersInRoom,
  getSocketUser,
  broadcastToRoom,
  ensureRoom,
  rooms,
  socketToUser
};

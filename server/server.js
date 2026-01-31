const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const rooms = require('./rooms');
const drawingState = require('./drawing-state');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// need a way to get ws by id for broadcast
const socketsById = new Map();

function sendToSocket(socketId) {
  return socketsById.get(socketId) || null;
}

wss.on('connection', (ws, req) => {
  const id = req.headers['sec-websocket-key'] || String(Date.now());
  ws.id = id;
  socketsById.set(id, ws);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (_) {
      return;
    }
    const { event, data } = msg;
    const meta = rooms.getSocketUser(ws);
    const roomId = meta ? meta.roomId : drawingState.DEFAULT_ROOM;

    switch (event) {
      case 'join_room': {
        const userId = (data && data.userId) || id;
        const userName = (data && data.userName) || null;
        const rId = (data && data.roomId) || drawingState.DEFAULT_ROOM;
        const user = rooms.joinRoom(ws, rId, userId, userName);
        const users = rooms.getUsersInRoom(rId);
        ws.send(JSON.stringify({ event: 'user_list', data: { users } }));
        const full = drawingState.getFullState(rId);
        ws.send(JSON.stringify({ event: 'full_state', data: full }));
        rooms.broadcastToRoom(rId, sendToSocket, 'user_joined', { user, users }, ws.id);
        break;
      }
      case 'stroke_start': {
        const stroke = drawingState.addStroke(roomId, {
          id: data.strokeId,
          userId: meta ? meta.user.id : id,
          tool: data.tool || 'brush',
          style: data.style || {},
          segments: []
        });
        rooms.broadcastToRoom(roomId, sendToSocket, 'stroke_start', stroke, ws.id);
        break;
      }
      case 'stroke_segment': {
        drawingState.appendSegment(roomId, data.strokeId, data.start, data.end);
        rooms.broadcastToRoom(roomId, sendToSocket, 'stroke_segment', data, ws.id);
        break;
      }
      case 'stroke_end': {
        rooms.broadcastToRoom(roomId, sendToSocket, 'stroke_end', { strokeId: data.strokeId }, ws.id);
        break;
      }
      case 'cursor': {
        const user = meta ? meta.user : { id, name: `User ${id.slice(0, 4)}` };
        rooms.broadcastToRoom(roomId, sendToSocket, 'cursor', {
          userId: user.id,
          userName: user.name,
          x: data.x,
          y: data.y
        }, ws.id);
        break;
      }
      case 'undo': {
        const removed = drawingState.undo(roomId);
        if (removed) {
          rooms.broadcastToRoom(roomId, sendToSocket, 'undo_applied', {
            strokeId: removed.id,
            userId: removed.userId
          }, null);
        }
        break;
      }
      case 'redo': {
        const restored = drawingState.redo(roomId);
        if (restored) {
          rooms.broadcastToRoom(roomId, sendToSocket, 'redo_applied', { stroke: restored }, null);
        }
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    const left = rooms.leaveRoom(ws);
    socketsById.delete(ws.id);
    if (left) {
      const { roomId, user } = left;
      const users = rooms.getUsersInRoom(roomId);
      rooms.broadcastToRoom(roomId, sendToSocket, 'user_left', { user, users }, null);
    }
  });
});

server.listen(PORT, () => {
  console.log('Server on http://localhost:' + PORT);
});

// Socket connect, send, receive. Parses JSON and calls handlers.

let ws = null;
let handlers = {};
let reconnectTimer = null;
const RECONNECT_DELAY = 2000;

function getWsUrl() {
  if (typeof window !== 'undefined' && window.__WS_SERVER_URL__) {
    return window.__WS_SERVER_URL__;
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.host;
  return proto + '//' + host;
}

function send(event, data) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ event, data: data || {} }));
}

function connect() {
  const url = getWsUrl();
  ws = new WebSocket(url);

  ws.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (handlers.onOpen) handlers.onOpen();
  };

  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch (_) {
      return;
    }
    const { event, data } = msg;
    const fn = handlers[event];
    if (fn) fn(data);
  };

  ws.onclose = () => {
    if (handlers.onClose) handlers.onClose();
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY);
    }
  };

  ws.onerror = () => {
    if (handlers.onError) handlers.onError();
  };
}

function setHandlers(h) {
  handlers = h;
}

function isConnected() {
  return ws && ws.readyState === 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { send, connect, setHandlers, isConnected };
} else {
  window.wsModule = { send, connect, setHandlers, isConnected };
}

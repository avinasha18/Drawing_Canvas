# Collaborative Canvas

Real-time multi-user drawing on a shared canvas. Brush, eraser, colors, stroke width. Global undo/redo. User cursors and online list.

## Run

```bash
npm install
npm start
```

Open http://localhost:3000 (or the port printed in the console).

## Test with multiple users

1. Start the server with `npm start`.
2. Open the same URL in two browser tabs (or two devices on the same network).
3. Draw in one tab; strokes appear in the other as you draw.
4. Use Undo in one tab; the last stroke (any user’s) is removed for everyone.
5. Redo puts it back. Check the “Online” list and other users’ cursors on the canvas.

## Deploy

**Vercel does not support this app as-is.** Vercel is serverless: it runs short-lived functions, not a long-running process. This app needs a persistent Node server for WebSockets and in-memory state (rooms, history). Deploy the full app to a platform that supports WebSockets and a single long-running process.

### Option A: Deploy full app (recommended)

**Railway**

1. Push the repo to GitHub.
2. Go to [railway.app](https://railway.app), sign in, New Project → Deploy from GitHub repo.
3. Select the repo; Railway detects Node and runs `npm start`. Add a root `package.json` with `"start": "node server/server.js"` if needed.
4. Settings → Generate Domain. Use the generated URL (e.g. `https://your-app.up.railway.app`). Open it; the app and WebSockets work from that URL.

**Render**

1. Push to GitHub. Go to [render.com](https://render.com) → New → Web Service.
2. Connect the repo. Build: `npm install`. Start: `npm start`.
3. Create Web Service; note the URL (e.g. `https://your-app.onrender.com`). Render keeps the process running so WebSockets work.

### Option B: Frontend on Vercel, server elsewhere

If you want the static client on Vercel and the Node server on Railway/Render:

1. Deploy the **server** to Railway or Render (same as above). Note the server URL (e.g. `https://your-api.up.railway.app`).
2. Deploy only the **client** to Vercel:
   - In the project root, add `vercel.json` with `"rewrites": [{ "source": "/(.*)", "destination": "/client/$1" }]` and set the root to the repo so Vercel serves `client/` (or put `client/` contents at repo root and point Vercel at that).
   - Set the WebSocket URL for the client: before loading your scripts, set `window.__WS_SERVER_URL__ = "wss://your-api.up.railway.app"` (use `wss://` and the same host as your server, no path). You can do this with a small inline script in `client/index.html` that reads from a build env or a config endpoint.
3. Ensure the server allows CORS/requests from your Vercel domain if needed. WebSocket connections are to the server host; same-origin is not an issue as long as the browser can connect to that host.

For the simplest “one URL” experience, use Option A and deploy the full app to Railway or Render.

## Known limitations

- No persistence: refreshing the page clears the canvas (server keeps state until restart).
- Single room: everyone shares one canvas.
- Reconnect: on disconnect the client reconnects and gets full state again; in-flight strokes during disconnect may be lost.
- No auth: any client can join and draw.

## Time spent

(Fill before submission: e.g. “X hours over Y days”.)

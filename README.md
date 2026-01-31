# Collaborative Canvas

Multiple people can draw on the same canvas at the same time. What you draw shows up for everyone live.

## How to use

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser.

To try it with two users: open the same URL in two tabs (or two devices on the same network). Draw in one tab and you’ll see it in the other. Undo and redo work for everyone—anyone can undo the last stroke.

## Features

- **Drawing:** Brush, eraser, a few colors, adjustable stroke width.
- **Live sync:** Strokes appear as you draw, not after you finish.
- **User indicators:** You see other users’ cursors and their names on the canvas. The “Online” list shows who’s connected.
- **Global undo/redo:** One shared history. Any user can undo or redo the last stroke.
- **Mobile:** Works on touch devices; you can draw with your finger.

## Limitations

- Nothing is saved. Refresh or restart the server and the canvas is empty again.
- One shared room—everyone is on the same canvas.
- No sign-in. Anyone with the link can draw.
- If you disconnect and reconnect, you get the current canvas back; anything you were drawing during the drop might not sync.

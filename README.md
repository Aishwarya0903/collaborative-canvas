# Collaborative Canvas

A real-time multi-user drawing application where multiple users can draw on the same canvas simultaneously.

The application uses HTML5 Canvas for drawing and Socket.IO for real-time communication between connected users.

## Live Demo

🔗 https://collaborative-canvas-p1sm.onrender.com

## Features

- Real-time collaborative drawing
- Multiple users can draw simultaneously
- Brush tool
- Eraser tool
- Color selection
- Adjustable stroke width
- Live drawing synchronization
- Remote cursor indicators
- Online user list
- Automatically assigned user colors
- Global Undo
- Global Redo
- Global Clear Canvas
- Server-authoritative drawing history

## Tech Stack

### Frontend

- TypeScript
- Vanilla JavaScript DOM APIs
- HTML5 Canvas
- CSS

### Backend

- Node.js
- Express
- Socket.IO

## Project Structure

```text
collaborative-canvas/
│
├── client/
│   ├── index.html
│   ├── style.css
│   ├── canvas.ts
│   ├── websocket.ts
│   └── main.ts
│
├── server/
│   └── server.ts
│
├── package.json
├── README.md
└── ARCHITECTURE.md

# Architecture

## Overview

Collaborative Canvas is a real-time multi-user drawing application built using TypeScript, HTML5 Canvas, Node.js, Express, and Socket.IO.

The application allows multiple connected users to draw simultaneously on a shared canvas. Drawing operations and cursor movements are transmitted through Socket.IO so other connected users can see updates in real time.

---

# Data Flow

```text
User Pointer Event
        │
        ▼
DrawingCanvas
        │
        ▼
Drawing Callback
        │
        ▼
Socket.IO Client
        │
        ▼
Node.js + Socket.IO Server
        │
        ▼
Broadcast to Other Connected Clients
        │
        ▼
Socket.IO Client
        │
        ▼
drawRemoteSegment()
        │
        ▼
HTML5 Canvas
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();

const httpServer =
  createServer(app);

const io =
  new Server(httpServer);

const PORT =
  process.env.PORT || 3000;

const clientPath =
  path.join(
    process.cwd(),
    "client"
  );

app.use(
  express.static(clientPath)
);

app.get(
  "/",
  (_request, response) => {
    response.sendFile(
      path.join(
        clientPath,
        "index.html"
      )
    );
  }
);


/* Types */

type Point = {
  x: number;
  y: number;
};

type Tool =
  | "brush"
  | "eraser";

type StrokeSettings = {
  tool: Tool;
  color: string;
  width: number;
};

type DrawingStroke = {
  points: Point[];
  settings: StrokeSettings;
};


/* Global canvas state */

const strokes:
  DrawingStroke[] = [];

const redoStack:
  DrawingStroke[] = [];


/* Users */

const userColors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899"
];

const users =
  new Map<
    string,
    {
      id: string;
      color: string;
    }
  >();


io.on(
  "connection",
  (socket) => {

    const color =
      userColors[
        users.size %
        userColors.length
      ];

    const user = {
      id: socket.id,
      color
    };

    users.set(
      socket.id,
      user
    );

    console.log(
      `User connected: ${socket.id}`
    );


    /* Send existing canvas to new user */

    socket.emit(
      "canvas-state",
      strokes
    );


    /* Update all users */

    io.emit(
      "users-updated",
      Array.from(
        users.values()
      )
    );


    /* Real-time drawing */

    socket.on(
      "draw-segment",
      (data) => {
        socket.broadcast.emit(
          "draw-segment",
          {
            userId:
              socket.id,

            ...data
          }
        );
      }
    );


    /*
     * Completed stroke.
     * Store the full stroke on the server.
     */

    socket.on(
      "stroke-complete",
      (
        stroke: DrawingStroke
      ) => {

        strokes.push(
          stroke
        );

        /*
         * A new drawing action means
         * redo history is no longer valid.
         */

        redoStack.length = 0;


        /*
         * Broadcast authoritative
         * canvas state to everyone.
         */

        io.emit(
          "canvas-state",
          strokes
        );
      }
    );


    /* Global undo */

    socket.on(
      "undo",
      () => {

        const lastStroke =
          strokes.pop();

        if (lastStroke) {
          redoStack.push(
            lastStroke
          );

          io.emit(
            "canvas-state",
            strokes
          );
        }
      }
    );


    /* Global redo */

    socket.on(
      "redo",
      () => {

        const stroke =
          redoStack.pop();

        if (stroke) {
          strokes.push(
            stroke
          );

          io.emit(
            "canvas-state",
            strokes
          );
        }
      }
    );


    /* Global clear */

    socket.on(
      "clear-canvas",
      () => {

        strokes.length = 0;

        redoStack.length = 0;

        io.emit(
          "canvas-state",
          strokes
        );
      }
    );


    /* Live cursor */

    socket.on(
      "cursor-move",
      (data: {
        x: number;
        y: number;
      }) => {

        socket.broadcast.emit(
          "cursor-move",
          {
            userId:
              socket.id,

            x: data.x,
            y: data.y,
            color
          }
        );
      }
    );


    /* Disconnect */

    socket.on(
      "disconnect",
      () => {

        users.delete(
          socket.id
        );

        console.log(
          `User disconnected: ${socket.id}`
        );


        socket.broadcast.emit(
          "cursor-remove",
          {
            userId:
              socket.id
          }
        );


        io.emit(
          "users-updated",
          Array.from(
            users.values()
          )
        );
      }
    );
  }
);


httpServer.listen(
  PORT,
  () => {
    console.log(
      `Server running at http://localhost:${PORT}`
    );
  }
);
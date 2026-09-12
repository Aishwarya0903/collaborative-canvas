import {
  DrawingCanvas,
  Tool,
  Point,
  StrokeSettings,
  DrawingStroke
} from "./canvas.js";

import {
  WebSocketClient
} from "./websocket.js";


const canvasElement =
  document.querySelector<HTMLCanvasElement>(
    "#drawing-canvas"
  );

if (!canvasElement) {
  throw new Error(
    "Canvas element not found"
  );
}


const websocket =
  new WebSocketClient();


const drawingCanvas =
  new DrawingCanvas(
    canvasElement,
    {
      /*
       * Send segments immediately so
       * other users see drawing in real time.
       */

      onStrokeMove: (
        from: Point,
        to: Point,
        settings: StrokeSettings
      ) => {
        websocket.socket.emit(
          "draw-segment",
          {
            from,
            to,
            settings
          }
        );
      },


      /*
       * When a stroke is finished,
       * send the complete stroke to
       * the server for global history.
       */

      onStrokeEnd: (
        stroke?: DrawingStroke
      ) => {
        if (!stroke) {
          return;
        }

        websocket.socket.emit(
          "stroke-complete",
          stroke
        );
      }
    }
  );


/* Connection status */

const connectionText =
  document.querySelector<HTMLSpanElement>(
    "#connection-text"
  );

const statusDot =
  document.querySelector<HTMLSpanElement>(
    ".status-dot"
  );


websocket.onConnect(() => {
  if (connectionText) {
    connectionText.textContent =
      "Connected";
  }

  if (statusDot) {
    statusDot.style.background =
      "#22c55e";
  }
});


websocket.onDisconnect(() => {
  if (connectionText) {
    connectionText.textContent =
      "Disconnected";
  }

  if (statusDot) {
    statusDot.style.background =
      "#ef4444";
  }
});


/* Online users */

type OnlineUser = {
  id: string;
  color: string;
};


const usersList =
  document.querySelector<HTMLDivElement>(
    "#users-list"
  );

const userCount =
  document.querySelector<HTMLSpanElement>(
    "#user-count"
  );


function renderUsers(
  users: OnlineUser[]
): void {

  if (!usersList) {
    return;
  }

  usersList.innerHTML = "";


  if (userCount) {
    userCount.textContent =
      users.length.toString();
  }


  users.forEach(
    (user, index) => {

      const userItem =
        document.createElement("div");

      userItem.className =
        "user-item";


      const colorDot =
        document.createElement("span");

      colorDot.className =
        "user-color";

      colorDot.style.background =
        user.color;


      const userName =
        document.createElement("span");

      userName.className =
        "user-name";


      const isCurrentUser =
        user.id ===
        websocket.socket.id;


      userName.textContent =
        isCurrentUser
          ? "You"
          : `User ${index + 1}`;


      userItem.appendChild(
        colorDot
      );

      userItem.appendChild(
        userName
      );

      usersList.appendChild(
        userItem
      );
    }
  );
}


websocket.socket.on(
  "users-updated",
  (users: OnlineUser[]) => {
    renderUsers(users);
  }
);


/*
 * Authoritative canvas state.
 *
 * The server sends this after:
 * - a completed stroke
 * - undo
 * - redo
 * - clear
 */

websocket.socket.on(
  "canvas-state",
  (strokes: DrawingStroke[]) => {
    drawingCanvas.setStrokes(
      strokes
    );
  }
);


/* Receive real-time drawing */

websocket.socket.on(
  "draw-segment",
  (data: {
    userId: string;
    from: Point;
    to: Point;
    settings: StrokeSettings;
  }) => {

    drawingCanvas.drawRemoteSegment(
      data.from,
      data.to,
      data.settings
    );
  }
);


/* Live cursor indicators */

const canvasContainer =
  canvasElement.parentElement;

const remoteCursors =
  new Map<
    string,
    HTMLDivElement
  >();


canvasElement.addEventListener(
  "pointermove",
  (event) => {

    const rect =
      canvasElement.getBoundingClientRect();


    websocket.socket.emit(
      "cursor-move",
      {
        x:
          event.clientX -
          rect.left,

        y:
          event.clientY -
          rect.top
      }
    );
  }
);


websocket.socket.on(
  "cursor-move",
  (data: {
    userId: string;
    x: number;
    y: number;
    color: string;
  }) => {

    if (!canvasContainer) {
      return;
    }


    let cursor =
      remoteCursors.get(
        data.userId
      );


    if (!cursor) {

      cursor =
        document.createElement("div");

      cursor.className =
        "remote-cursor";

      cursor.style.background =
        data.color;


      canvasContainer.appendChild(
        cursor
      );


      remoteCursors.set(
        data.userId,
        cursor
      );
    }


    cursor.style.left =
      `${data.x}px`;

    cursor.style.top =
      `${data.y}px`;
  }
);


websocket.socket.on(
  "cursor-remove",
  (data: {
    userId: string;
  }) => {

    const cursor =
      remoteCursors.get(
        data.userId
      );


    if (cursor) {

      cursor.remove();


      remoteCursors.delete(
        data.userId
      );
    }
  }
);


/* Toolbar */

const brushButton =
  document.querySelector<HTMLButtonElement>(
    "#brush-btn"
  );

const eraserButton =
  document.querySelector<HTMLButtonElement>(
    "#eraser-btn"
  );

const colorPicker =
  document.querySelector<HTMLInputElement>(
    "#color-picker"
  );

const strokeWidth =
  document.querySelector<HTMLInputElement>(
    "#stroke-width"
  );

const strokeWidthValue =
  document.querySelector<HTMLSpanElement>(
    "#stroke-width-value"
  );

const undoButton =
  document.querySelector<HTMLButtonElement>(
    "#undo-btn"
  );

const redoButton =
  document.querySelector<HTMLButtonElement>(
    "#redo-btn"
  );

const clearButton =
  document.querySelector<HTMLButtonElement>(
    "#clear-btn"
  );


function setActiveTool(
  tool: Tool
): void {

  drawingCanvas.setTool(
    tool
  );


  brushButton?.classList.toggle(
    "active",
    tool === "brush"
  );


  eraserButton?.classList.toggle(
    "active",
    tool === "eraser"
  );
}


/* Brush */

brushButton?.addEventListener(
  "click",
  () => {
    setActiveTool(
      "brush"
    );
  }
);


/* Eraser */

eraserButton?.addEventListener(
  "click",
  () => {
    setActiveTool(
      "eraser"
    );
  }
);


/* Color */

colorPicker?.addEventListener(
  "input",
  () => {

    drawingCanvas.setColor(
      colorPicker.value
    );
  }
);


/* Stroke width */

strokeWidth?.addEventListener(
  "input",
  () => {

    const width =
      Number(
        strokeWidth.value
      );


    drawingCanvas.setWidth(
      width
    );


    if (strokeWidthValue) {
      strokeWidthValue.textContent =
        `${width}px`;
    }
  }
);


/*
 * Global Undo
 *
 * Server decides which operation
 * is removed and broadcasts the
 * new canvas state to everyone.
 */

undoButton?.addEventListener(
  "click",
  () => {

    websocket.socket.emit(
      "undo"
    );
  }
);


/*
 * Global Redo
 */

redoButton?.addEventListener(
  "click",
  () => {

    websocket.socket.emit(
      "redo"
    );
  }
);


/*
 * Global Clear
 */

clearButton?.addEventListener(
  "click",
  () => {

    const shouldClear =
      window.confirm(
        "Clear the entire canvas for all users?"
      );


    if (shouldClear) {

      websocket.socket.emit(
        "clear-canvas"
      );
    }
  }
);
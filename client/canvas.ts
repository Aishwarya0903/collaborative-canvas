export type Point = {
  x: number;
  y: number;
};

export type Tool = "brush" | "eraser";

export type StrokeSettings = {
  tool: Tool;
  color: string;
  width: number;
};

export type DrawingStroke = {
  points: Point[];
  settings: StrokeSettings;
};

export type DrawingCallbacks = {
  onStrokeStart?: (
    point: Point,
    settings: StrokeSettings
  ) => void;

  onStrokeMove?: (
    from: Point,
    to: Point,
    settings: StrokeSettings
  ) => void;

  onStrokeEnd?: (
    stroke?: DrawingStroke
  ) => void;
};

export class DrawingCanvas {
  private canvas: HTMLCanvasElement;

  private context: CanvasRenderingContext2D;

  private isDrawing = false;

  private lastPoint: Point | null = null;

  private currentColor = "#2563eb";

  private currentWidth = 5;

  private currentTool: Tool = "brush";

  private callbacks: DrawingCallbacks;

  private history: DrawingStroke[] = [];

  private redoStack: DrawingStroke[] = [];

  private currentStroke:
    | DrawingStroke
    | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: DrawingCallbacks = {}
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Could not create Canvas context"
      );
    }

    this.context = context;

    this.resizeCanvas();

    this.setupPointerEvents();

    window.addEventListener(
      "resize",
      () => {
        this.resizeCanvas();
        this.redrawCanvas();
      }
    );
  }

  public setTool(
    tool: Tool
  ): void {
    this.currentTool = tool;
  }

  public setColor(
    color: string
  ): void {
    this.currentColor = color;
  }

  public setWidth(
    width: number
  ): void {
    this.currentWidth = width;
  }

  public drawRemoteSegment(
    from: Point,
    to: Point,
    settings: StrokeSettings
  ): void {
    this.drawLineWithSettings(
      from,
      to,
      settings
    );
  }

  /*
   * Server-authoritative canvas state.
   * All users receive the same completed
   * stroke history from the server.
   */

  public setStrokes(
    strokes: DrawingStroke[]
  ): void {
    this.history =
      strokes.map((stroke) => ({
        points: stroke.points.map(
          (point) => ({
            x: point.x,
            y: point.y
          })
        ),
        settings: {
          ...stroke.settings
        }
      }));

    this.redoStack = [];

    this.redrawCanvas();
  }

  public clear(): void {
    this.history = [];
    this.redoStack = [];
    this.currentStroke = null;

    this.context.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  private getSettings(): StrokeSettings {
    return {
      tool: this.currentTool,
      color: this.currentColor,
      width: this.currentWidth
    };
  }

  private resizeCanvas(): void {
    const rect =
      this.canvas.getBoundingClientRect();

    this.canvas.width =
      Math.max(
        1,
        Math.floor(rect.width)
      );

    this.canvas.height =
      Math.max(
        1,
        Math.floor(rect.height)
      );
  }

  private getCanvasPoint(
    event: PointerEvent
  ): Point {
    const rect =
      this.canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  private setupPointerEvents(): void {
    this.canvas.addEventListener(
      "pointerdown",
      (event) => {
        this.isDrawing = true;

        const point =
          this.getCanvasPoint(event);

        this.lastPoint = point;

        const settings =
          this.getSettings();

        this.currentStroke = {
          points: [point],
          settings: {
            ...settings
          }
        };

        this.canvas.setPointerCapture(
          event.pointerId
        );

        this.drawDotWithSettings(
          point,
          settings
        );

        this.callbacks.onStrokeStart?.(
          point,
          settings
        );
      }
    );

    this.canvas.addEventListener(
      "pointermove",
      (event) => {
        if (
          !this.isDrawing ||
          !this.lastPoint ||
          !this.currentStroke
        ) {
          return;
        }

        const currentPoint =
          this.getCanvasPoint(event);

        const settings =
          this.currentStroke.settings;

        this.drawLineWithSettings(
          this.lastPoint,
          currentPoint,
          settings
        );

        this.currentStroke.points.push(
          currentPoint
        );

        this.callbacks.onStrokeMove?.(
          this.lastPoint,
          currentPoint,
          settings
        );

        this.lastPoint =
          currentPoint;
      }
    );

    const finishStroke = (
      event?: PointerEvent
    ): void => {
      if (!this.isDrawing) {
        return;
      }

      this.isDrawing = false;

      this.lastPoint = null;

      const completedStroke =
        this.currentStroke;

      if (
        completedStroke &&
        completedStroke.points.length > 0
      ) {
        this.history.push(
          completedStroke
        );

        this.redoStack = [];
      }

      this.currentStroke = null;

      if (event) {
        try {
          this.canvas.releasePointerCapture(
            event.pointerId
          );
        } catch {
          // Pointer may already have been released.
        }
      }

      this.callbacks.onStrokeEnd?.(
        completedStroke ?? undefined
      );
    };

    this.canvas.addEventListener(
      "pointerup",
      finishStroke
    );

    this.canvas.addEventListener(
      "pointercancel",
      finishStroke
    );
  }

  private redrawCanvas(): void {
    this.context.clearRect(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    for (
      const stroke of this.history
    ) {
      this.drawStroke(stroke);
    }
  }

  private drawStroke(
    stroke: DrawingStroke
  ): void {
    const {
      points,
      settings
    } = stroke;

    if (points.length === 0) {
      return;
    }

    if (points.length === 1) {
      this.drawDotWithSettings(
        points[0],
        settings
      );

      return;
    }

    for (
      let index = 1;
      index < points.length;
      index++
    ) {
      this.drawLineWithSettings(
        points[index - 1],
        points[index],
        settings
      );
    }
  }

  private drawLineWithSettings(
    from: Point,
    to: Point,
    settings: StrokeSettings
  ): void {
    this.context.beginPath();

    this.context.moveTo(
      from.x,
      from.y
    );

    this.context.lineTo(
      to.x,
      to.y
    );

    this.context.strokeStyle =
      settings.tool === "eraser"
        ? "#ffffff"
        : settings.color;

    this.context.lineWidth =
      settings.width;

    this.context.lineCap =
      "round";

    this.context.lineJoin =
      "round";

    this.context.stroke();
  }

  private drawDotWithSettings(
    point: Point,
    settings: StrokeSettings
  ): void {
    this.context.beginPath();

    this.context.arc(
      point.x,
      point.y,
      settings.width / 2,
      0,
      Math.PI * 2
    );

    this.context.fillStyle =
      settings.tool === "eraser"
        ? "#ffffff"
        : settings.color;

    this.context.fill();
  }
}
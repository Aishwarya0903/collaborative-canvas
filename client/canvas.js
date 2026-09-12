export class DrawingCanvas {
    constructor(canvas, callbacks = {}) {
        this.isDrawing = false;
        this.lastPoint = null;
        this.currentColor = "#2563eb";
        this.currentWidth = 5;
        this.currentTool = "brush";
        this.history = [];
        this.redoStack = [];
        this.currentStroke = null;
        this.canvas = canvas;
        this.callbacks = callbacks;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not create Canvas context");
        }
        this.context = context;
        this.resizeCanvas();
        this.setupPointerEvents();
        window.addEventListener("resize", () => {
            this.resizeCanvas();
            this.redrawCanvas();
        });
    }
    setTool(tool) {
        this.currentTool = tool;
    }
    setColor(color) {
        this.currentColor = color;
    }
    setWidth(width) {
        this.currentWidth = width;
    }
    drawRemoteSegment(from, to, settings) {
        this.drawLineWithSettings(from, to, settings);
    }
    /*
     * Server-authoritative canvas state.
     * All users receive the same completed
     * stroke history from the server.
     */
    setStrokes(strokes) {
        this.history =
            strokes.map((stroke) => ({
                points: stroke.points.map((point) => ({
                    x: point.x,
                    y: point.y
                })),
                settings: {
                    ...stroke.settings
                }
            }));
        this.redoStack = [];
        this.redrawCanvas();
    }
    clear() {
        this.history = [];
        this.redoStack = [];
        this.currentStroke = null;
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    getSettings() {
        return {
            tool: this.currentTool,
            color: this.currentColor,
            width: this.currentWidth
        };
    }
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width =
            Math.max(1, Math.floor(rect.width));
        this.canvas.height =
            Math.max(1, Math.floor(rect.height));
    }
    getCanvasPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    setupPointerEvents() {
        this.canvas.addEventListener("pointerdown", (event) => {
            this.isDrawing = true;
            const point = this.getCanvasPoint(event);
            this.lastPoint = point;
            const settings = this.getSettings();
            this.currentStroke = {
                points: [point],
                settings: {
                    ...settings
                }
            };
            this.canvas.setPointerCapture(event.pointerId);
            this.drawDotWithSettings(point, settings);
            this.callbacks.onStrokeStart?.(point, settings);
        });
        this.canvas.addEventListener("pointermove", (event) => {
            if (!this.isDrawing ||
                !this.lastPoint ||
                !this.currentStroke) {
                return;
            }
            const currentPoint = this.getCanvasPoint(event);
            const settings = this.currentStroke.settings;
            this.drawLineWithSettings(this.lastPoint, currentPoint, settings);
            this.currentStroke.points.push(currentPoint);
            this.callbacks.onStrokeMove?.(this.lastPoint, currentPoint, settings);
            this.lastPoint =
                currentPoint;
        });
        const finishStroke = (event) => {
            if (!this.isDrawing) {
                return;
            }
            this.isDrawing = false;
            this.lastPoint = null;
            const completedStroke = this.currentStroke;
            if (completedStroke &&
                completedStroke.points.length > 0) {
                this.history.push(completedStroke);
                this.redoStack = [];
            }
            this.currentStroke = null;
            if (event) {
                try {
                    this.canvas.releasePointerCapture(event.pointerId);
                }
                catch {
                    // Pointer may already have been released.
                }
            }
            this.callbacks.onStrokeEnd?.(completedStroke ?? undefined);
        };
        this.canvas.addEventListener("pointerup", finishStroke);
        this.canvas.addEventListener("pointercancel", finishStroke);
    }
    redrawCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const stroke of this.history) {
            this.drawStroke(stroke);
        }
    }
    drawStroke(stroke) {
        const { points, settings } = stroke;
        if (points.length === 0) {
            return;
        }
        if (points.length === 1) {
            this.drawDotWithSettings(points[0], settings);
            return;
        }
        for (let index = 1; index < points.length; index++) {
            this.drawLineWithSettings(points[index - 1], points[index], settings);
        }
    }
    drawLineWithSettings(from, to, settings) {
        this.context.beginPath();
        this.context.moveTo(from.x, from.y);
        this.context.lineTo(to.x, to.y);
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
    drawDotWithSettings(point, settings) {
        this.context.beginPath();
        this.context.arc(point.x, point.y, settings.width / 2, 0, Math.PI * 2);
        this.context.fillStyle =
            settings.tool === "eraser"
                ? "#ffffff"
                : settings.color;
        this.context.fill();
    }
}

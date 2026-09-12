export class WebSocketClient {
    constructor() {
        this.socket = io();
    }
    onConnect(callback) {
        this.socket.on("connect", callback);
    }
    onDisconnect(callback) {
        this.socket.on("disconnect", callback);
    }
}

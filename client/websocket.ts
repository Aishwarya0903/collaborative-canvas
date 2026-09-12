declare const io: () => SocketIOClient.Socket;

declare namespace SocketIOClient {
  interface Socket {
    id?: string;

    on(
      event: string,
      callback: (...args: any[]) => void
    ): void;

    emit(
      event: string,
      ...args: any[]
    ): void;
  }
}

export class WebSocketClient {
  public readonly socket: SocketIOClient.Socket;

  constructor() {
    this.socket = io();
  }

  public onConnect(
    callback: () => void
  ): void {
    this.socket.on("connect", callback);
  }

  public onDisconnect(
    callback: () => void
  ): void {
    this.socket.on("disconnect", callback);
  }
}
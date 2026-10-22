import type { Socket } from "socket.io";

export function registerGeneralHandlers(socket: Socket) {
  socket.emit("welcome", "Welcome to Jam! 🎵");
}

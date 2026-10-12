import type { Socket } from "socket.io";

export function registerGeneralHandlers(socket: Socket) {
  socket.on("message", (message) => {
    console.log("Message received:", message);
    socket.broadcast.emit("message", message);
  });

  socket.emit("welcome", "Welcome to Jam! 🎵");
}

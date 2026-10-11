
import type { Server, Socket } from "socket.io";
import { rooms } from "../services/roomService.js";

export function registerRoomHandlers(
  io: Server,
  socket: Socket
) {
  socket.on("room-message", ({ roomId, message }) => {
    if (!rooms.has(roomId)) {
      console.log(`Message rejected: room ${roomId} not found`);
      return;
    }

    io.to(roomId).emit("room-message", message);

    console.log(`Message sent to room ${roomId}: ${message}`);
  });
}

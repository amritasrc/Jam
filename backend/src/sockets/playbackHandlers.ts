import type { Server, Socket } from "socket.io";
import { roomHosts, roomStates, roomExists } from "../services/roomService.js";

export function registerPlaybackHandlers(io: Server, socket: Socket) {
  socket.on("playback-update", ({ roomId, isPlaying, currentTime }) => {
    if (!roomExists(roomId)) return;

    if (socket.data.currentRoom !== roomId) return;

    const hostId = roomHosts.get(roomId);

    if (socket.id !== hostId) return;

    const roomState = roomStates.get(roomId);

    if (!roomState) return;

    roomState.isPlaying = isPlaying;
    roomState.currentTime = currentTime;

    io.to(roomId).emit("playback-update", {
      isPlaying,
      currentTime,
    });
  });
}

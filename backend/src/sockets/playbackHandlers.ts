import type { Server, Socket } from "socket.io";
import { roomHosts, roomStates, roomExists } from "../services/roomService.js";
import {
  clearRoomPlaybackTimer,
  pausePlayback,
  startPlayback,
  startRoomPlaybackTimer,
} from "../services/playbackService.js";

export function registerPlaybackHandlers(io: Server, socket: Socket) {
  socket.on("playback-update", ({ roomId, isPlaying }) => {
    if (!roomExists(roomId)) return;
    if (socket.data.currentRoom !== roomId) return;

    const hostId = roomHosts.get(roomId);
    if (socket.id !== hostId) return;

    if (typeof isPlaying !== "boolean") return;

    const roomState = roomStates.get(roomId);
    if (!roomState) return;

    if (!roomState.currentSong) return;

    if (isPlaying) {
      startPlayback(roomState);
      startRoomPlaybackTimer(io, roomId);
    } else {
      pausePlayback(roomState);
      clearRoomPlaybackTimer(roomId);
    }

    io.to(roomId).emit("playback-update", {
      isPlaying: roomState.isPlaying,
      currentTime: roomState.currentTime,
    });
  });
}

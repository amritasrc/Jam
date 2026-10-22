import type { Server, Socket } from "socket.io";
import { roomHosts, roomStates, roomExists } from "../services/roomService.js";

const playbackTimers = new Map<string, ReturnType<typeof setInterval>>();

export function clearRoomPlaybackTimer(roomId: string) {
  const timer = playbackTimers.get(roomId);

  if (timer) {
    clearInterval(timer);
    playbackTimers.delete(roomId);
  }
}

export function registerPlaybackHandlers(io: Server, socket: Socket) {
  socket.on("playback-update", ({ roomId, isPlaying, currentTime }) => {
    if (!roomExists(roomId)) return;
    if (socket.data.currentRoom !== roomId) return;

    const hostId = roomHosts.get(roomId);
    if (socket.id !== hostId) return;

    if (
      typeof isPlaying !== "boolean" ||
      typeof currentTime !== "number" ||
      !Number.isFinite(currentTime) ||
      currentTime < 0
    ) {
      return;
    }

    const roomState = roomStates.get(roomId);
    if (!roomState) return;

    roomState.isPlaying = isPlaying;
    roomState.currentTime = currentTime;

    clearRoomPlaybackTimer(roomId);

    if (isPlaying) {
      const timer = setInterval(() => {
        const state = roomStates.get(roomId);

        if (!state || !state.isPlaying || !roomExists(roomId)) {
          clearInterval(timer);
          playbackTimers.delete(roomId);
          return;
        }

        state.currentTime += 1;

        if (
          state.currentSong?.duration &&
          state.currentTime >= state.currentSong.duration
        ) {
          state.currentTime = state.currentSong.duration;
          state.isPlaying = false;
          clearInterval(timer);
          playbackTimers.delete(roomId);
        }

        io.to(roomId).emit("playback-update", {
          isPlaying: state.isPlaying,
          currentTime: state.currentTime,
        });
      }, 1000);

      playbackTimers.set(roomId, timer);
    }

    io.to(roomId).emit("playback-update", {
      isPlaying: roomState.isPlaying,
      currentTime: roomState.currentTime,
    });
  });
}

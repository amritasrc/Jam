import type { Server, Socket } from "socket.io";
import { roomHosts, roomStates, roomExists } from "../services/roomService.js";
import type { Song } from "../services/roomService.js";
import { startRoomPlaybackTimer } from "../services/playbackService.js";

function isValidSong(song: unknown): song is Song {
  if (!song || typeof song !== "object") return false;

  const candidate = song as Partial<Song>;

  if (typeof candidate.videoId !== "string" || !candidate.videoId.trim()) return false;
  if (typeof candidate.title !== "string" || !candidate.title.trim()) return false;
  if (typeof candidate.channelTitle !== "string") return false;

  if (
    candidate.thumbnail !== undefined &&
    (typeof candidate.thumbnail !== "string" || !candidate.thumbnail.startsWith("https://"))
  ) {
    return false;
  }

  if (
    candidate.duration !== undefined &&
    (typeof candidate.duration !== "number" ||
      !Number.isFinite(candidate.duration) ||
      candidate.duration <= 0)
  ) {
    return false;
  }

  return true;
}

export function registerSongHandlers(io: Server, socket: Socket) {
  socket.on("select-song", ({ roomId, song }) => {
    if (!roomExists(roomId)) return;

    if (socket.data.currentRoom !== roomId) return;

    const hostId = roomHosts.get(roomId);

    if (socket.id !== hostId) return;

    if (!isValidSong(song)) return;

    const roomState = roomStates.get(roomId);

    if (!roomState) return;

    // Track recently played for better autoplay recommendations
    if (!roomState.recentlyPlayed) {
      roomState.recentlyPlayed = [];
    }
    if (roomState.currentSong) {
      roomState.recentlyPlayed = roomState.recentlyPlayed.filter(
        (s) => s.videoId !== roomState.currentSong?.videoId
      );
      roomState.recentlyPlayed.unshift(roomState.currentSong);
      if (roomState.recentlyPlayed.length > 20) {
        roomState.recentlyPlayed = roomState.recentlyPlayed.slice(0, 20);
      }
    }

    roomState.currentSong = song;
    roomState.currentTime = 0;
    roomState.isPlaying = true;
    roomState.startedAt = Date.now();

    startRoomPlaybackTimer(io, roomId);

    io.to(roomId).emit("song-selected", {
      song,
      isPlaying: roomState.isPlaying,
      currentTime: roomState.currentTime,
    });

    console.log(`Song selected in room ${roomId}: ${song.title}`);
  });
}

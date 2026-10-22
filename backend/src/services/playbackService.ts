import type { Server } from "socket.io";
import { roomExists, roomStates } from "./roomService.js";
import type { RoomState } from "./roomService.js";

const TICK_INTERVAL_MS = 1000;

const playbackTimers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * The room state keeps `currentTime` as the position that was captured at
 * `startedAt`. While a track is playing the live position is derived from the
 * wall clock so slow ticks or blocked event loops never make the room drift.
 */
export function getLivePosition(state: RoomState, now = Date.now()): number {
  if (!state.isPlaying || state.startedAt === null) {
    return state.currentTime;
  }

  return state.currentTime + Math.max(0, (now - state.startedAt) / 1000);
}

/** Folds the elapsed time into `currentTime` and re-anchors the clock. */
export function syncStateToNow(state: RoomState, now = Date.now()): void {
  if (!state.isPlaying || state.startedAt === null) return;

  state.currentTime = getLivePosition(state, now);
  state.startedAt = now;
}

/** Starts playback from the authoritative position, keeping it untouched. */
export function startPlayback(state: RoomState): void {
  syncStateToNow(state);

  const duration = state.currentSong?.duration;

  if (duration && duration > 0 && state.currentTime >= duration) {
    state.currentTime = 0;
  }

  state.isPlaying = true;
  state.startedAt = Date.now();
}

/** Pauses playback, freezing the position where it actually was. */
export function pausePlayback(state: RoomState): void {
  syncStateToNow(state);

  state.isPlaying = false;
  state.startedAt = null;
}

/** A client facing snapshot of the room state with a fresh position. */
export function snapshotRoomState(state: RoomState) {
  return {
    currentSong: state.currentSong,
    isPlaying: state.isPlaying,
    currentTime: getLivePosition(state),
  };
}

export function clearRoomPlaybackTimer(roomId: string): void {
  const timer = playbackTimers.get(roomId);

  if (!timer) return;

  clearInterval(timer);
  playbackTimers.delete(roomId);
}

/**
 * Starts the single playback timer for a room. Any previous timer is cleared
 * first so repeated play events can never run two timers for the same room.
 */
export function startRoomPlaybackTimer(io: Server, roomId: string): void {
  clearRoomPlaybackTimer(roomId);

  const timer = setInterval(() => {
    const state = roomStates.get(roomId);

    if (!state || !state.isPlaying || !roomExists(roomId)) {
      clearRoomPlaybackTimer(roomId);
      return;
    }

    syncStateToNow(state);

    const duration = state.currentSong?.duration;

    if (duration && duration > 0 && state.currentTime >= duration) {
      state.currentTime = duration;
      state.isPlaying = false;
      state.startedAt = null;
      clearRoomPlaybackTimer(roomId);

      io.to(roomId).emit("playback-update", {
        isPlaying: false,
        currentTime: duration,
      });
      return;
    }

    io.to(roomId).emit("playback-update", {
      isPlaying: true,
      currentTime: state.currentTime,
    });
  }, TICK_INTERVAL_MS);

  playbackTimers.set(roomId, timer);
}

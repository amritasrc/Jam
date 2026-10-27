import axios from "axios";
import type { Server } from "socket.io";
import { roomExists, roomStates } from "./roomService.js";
import type { RoomState, Song } from "./roomService.js";

const TICK_INTERVAL_MS = 1000;

const playbackTimers = new Map<string, ReturnType<typeof setInterval>>();
const advancingRooms = new Set<string>();

export function getLivePosition(state: RoomState, now = Date.now()): number {
  if (!state.isPlaying || state.startedAt === null) {
    return state.currentTime;
  }

  return state.currentTime + Math.max(0, (now - state.startedAt) / 1000);
}

export function syncStateToNow(state: RoomState, now = Date.now()): void {
  if (!state.isPlaying || state.startedAt === null) return;

  state.currentTime = getLivePosition(state, now);
  state.startedAt = now;
}

export function startPlayback(state: RoomState): void {
  syncStateToNow(state);

  const duration = state.currentSong?.duration;

  if (duration && duration > 0 && state.currentTime >= duration) {
    state.currentTime = 0;
  }

  state.isPlaying = true;
  state.startedAt = Date.now();
}

export function pausePlayback(state: RoomState): void {
  syncStateToNow(state);
  state.isPlaying = false;
  state.startedAt = null;
}

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

function buildAutoplayQuery(currentSong: Song): string {
  // Try to generate more varied, relevant queries instead of just title+channel
  const queries = [
    currentSong.title,
    currentSong.channelTitle,
    // Mix them differently for variety
    `${currentSong.title.split(/[\(\)\[\]\-\/]/)[0].trim()}`,
  ].filter((q) => q && q.trim().length > 0);
  
  // Pick a varied query - sometimes just artist/channel, sometimes just title part
  if (queries.length === 0) {
    return currentSong.title || currentSong.channelTitle || "";
  }
  // Randomly choose between strategies for more variety like YouTube
  const strategies = [
    `${currentSong.title} ${currentSong.channelTitle}`,
    currentSong.channelTitle, // More from same artist/channel
    currentSong.title.split(/[\(\)\[\]\-\/]/)[0].trim(), // Just main part of title
  ].filter((q) => q && q.trim().length > 0);
  
  const selectedQuery = strategies[Math.floor(Math.random() * strategies.length)];
  return selectedQuery;
}

async function playRandomNextSong(io: Server, roomId: string): Promise<void> {
  if (advancingRooms.has(roomId)) return;

  const state = roomStates.get(roomId);
  const currentSong = state?.currentSong;

  if (!state || !currentSong || !roomExists(roomId)) return;

  advancingRooms.add(roomId);

  try {
    // Add current song to recently played before advancing
    if (!state.recentlyPlayed) {
      state.recentlyPlayed = [];
    }
    // Avoid duplicates in recently played
    state.recentlyPlayed = state.recentlyPlayed.filter(
      (s) => s.videoId !== currentSong.videoId
    );
    state.recentlyPlayed.unshift(currentSong);
    // Keep only last 20 songs to avoid growing unbounded
    if (state.recentlyPlayed.length > 20) {
      state.recentlyPlayed = state.recentlyPlayed.slice(0, 20);
    }

    const query = buildAutoplayQuery(currentSong);
    const recentlyPlayedIds = (state.recentlyPlayed || [])
      .map((s) => s.videoId)
      .join(",");

    const response = await axios.get(
      `${process.env.API_BASE_URL ?? "http://localhost:3000"}/api/songs/autoplay`,
      {
        params: {
          q: query,
          exclude: currentSong.videoId,
          recentlyPlayed: recentlyPlayedIds,
        },
        timeout: 10000,
      }
    );

    const nextSong = response.data?.song as Song | null | undefined;

    const latestState = roomStates.get(roomId);

    if (!latestState || !roomExists(roomId)) return;

    if (!nextSong?.videoId || nextSong.videoId === currentSong.videoId) {
      latestState.isPlaying = false;
      latestState.startedAt = null;
      clearRoomPlaybackTimer(roomId);

      io.to(roomId).emit("playback-update", {
        isPlaying: false,
        currentTime: latestState.currentTime,
      });
      return;
    }

    // Validate song has required fields
    if (!nextSong.title || !nextSong.videoId) {
      latestState.isPlaying = false;
      latestState.startedAt = null;
      clearRoomPlaybackTimer(roomId);

      io.to(roomId).emit("playback-update", {
        isPlaying: false,
        currentTime: latestState.currentTime,
      });
      return;
    }

    latestState.currentSong = nextSong;
    latestState.currentTime = 0;
    latestState.isPlaying = true;
    latestState.startedAt = Date.now();

    io.to(roomId).emit("song-selected", {
      song: nextSong,
      isPlaying: true,
      currentTime: 0,
    });
    startRoomPlaybackTimer(io, roomId);
  } catch (error) {
    console.error("Autoplay failed:", error);

    const latestState = roomStates.get(roomId);

    if (latestState && roomExists(roomId)) {
      latestState.isPlaying = false;
      latestState.startedAt = null;

      io.to(roomId).emit("playback-update", {
        isPlaying: false,
        currentTime: latestState.currentTime,
      });
    }
  } finally {
    advancingRooms.delete(roomId);
  }
}

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

      void playRandomNextSong(io, roomId);
      return;
    }

    io.to(roomId).emit("playback-update", {
      isPlaying: true,
      currentTime: state.currentTime,
    });
  }, TICK_INTERVAL_MS);

  playbackTimers.set(roomId, timer);
}
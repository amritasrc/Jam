export type Song = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail?: string;
  duration?: number;
};

export type RoomState = {
  currentSong: Song | null;
  isPlaying: boolean;
  /** Position captured at `startedAt`, in seconds. */
  currentTime: number;
  /** Epoch ms when `currentTime` was captured, null while paused. */
  startedAt: number | null;
};

export const rooms = new Set<string>();

export const roomHosts = new Map<string, string>();

export const roomStates = new Map<string, RoomState>();

export function createRoomState(): RoomState {
  return {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    startedAt: null,
  };
}


export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

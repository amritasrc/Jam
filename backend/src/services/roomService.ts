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
  currentTime: number;
};

export const rooms = new Set<string>();

export const roomHosts = new Map<string, string>();

export const roomStates = new Map<string, RoomState>();

export function createRoomState(): RoomState {
  return {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
  };
}


export function roomExists(roomId: string): boolean {
  return rooms.has(roomId);
}

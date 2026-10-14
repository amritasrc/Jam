export type RoomState = {
  currentSong: string | null;
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

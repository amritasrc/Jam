export const rooms = new Set<string>();

export const roomHosts = new Map<string, string>();

export const roomStates = new Map<
  string,
  {
    currentSong: string | null;
    isPlaying: boolean;
    currentTime: number;
  }
>();

export function createRoomState() {
  return {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
  };
}
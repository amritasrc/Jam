import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";
import type { Song } from "../lib/api";

export type RoomState = {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
};

type PlaybackPayload = {
  isPlaying: boolean;
  currentTime: number;
};

/** How often the elapsed time is re-rendered between server updates. */
const TICK_INTERVAL_MS = 200;

export function useJamSocket() {
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
  });
  const [messages, setMessages] = useState<string[]>([]);

  // The last position the server confirmed, plus the moment it arrived, so
  // the elapsed time can be interpolated locally between updates.
  const anchorRef = useRef({ currentTime: 0, receivedAt: 0 });

  const applyPlayback = useCallback((payload: PlaybackPayload) => {
    anchorRef.current = {
      currentTime: payload.currentTime,
      receivedAt: Date.now(),
    };

    setRoomState((prev) => ({
      ...prev,
      isPlaying: payload.isPlaying,
      currentTime: payload.currentTime,
    }));
  }, []);

  const resetPlayback = useCallback(() => {
    anchorRef.current = { currentTime: 0, receivedAt: Date.now() };
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected:", socket.id);
    };

    const handleRoomMembers = (count: number) => {
      setMembers(count);
    };

    const handleRoomHost = (hostId: string) => {
      setIsHost(hostId === socket.id);
    };

    const handlePlaybackState = (state: RoomState) => {
      if (!state) return;

      setRoomState((prev) => ({ ...prev, currentSong: state.currentSong ?? null }));
      applyPlayback(state);
    };

    const handlePlaybackUpdate = (payload: PlaybackPayload) => {
      applyPlayback(payload);
    };

    const handleRoomMessage = (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleSongSelected = (payload: {
      song: Song;
      isPlaying: boolean;
      currentTime: number;
    }) => {
      setRoomState((prev) => ({ ...prev, currentSong: payload.song }));
      applyPlayback(payload);
    };

    socket.on("connect", handleConnect);
    socket.on("room-members", handleRoomMembers);
    socket.on("room-host", handleRoomHost);
    socket.on("playback-state", handlePlaybackState);
    socket.on("playback-update", handlePlaybackUpdate);
    socket.on("room-message", handleRoomMessage);
    socket.on("song-selected", handleSongSelected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room-members", handleRoomMembers);
      socket.off("room-host", handleRoomHost);
      socket.off("playback-state", handlePlaybackState);
      socket.off("playback-update", handlePlaybackUpdate);
      socket.off("room-message", handleRoomMessage);
      socket.off("song-selected", handleSongSelected);
    };
  }, [applyPlayback]);

  // The server ticks once a second, so the clock is advanced locally between
  // updates to keep every member on the same second.
  useEffect(() => {
    const id = window.setInterval(() => {
      setRoomState((prev) => {
        if (!prev.isPlaying) return prev;

        const { currentTime, receivedAt } = anchorRef.current;

        if (!receivedAt) return prev;

        const live = currentTime + (Date.now() - receivedAt) / 1000;

        if (Math.abs(live - prev.currentTime) < 0.05) return prev;

        return { ...prev, currentTime: live };
      });
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, []);

  const createRoom = () => {
    socket.emit("create-room", (id: string) => {
      setRoomId(id);
      setMessage("Room created — share the code to jam together!");
      setIsHost(true);
      setMembers(1);
      setRoomState({
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
      });
      resetPlayback();
      setMessages([]);
    });
  };

  const joinRoom = (joinCode: string) => {
    const code = joinCode.trim();

    if (!code) {
      setMessage("Please enter a room code.");
      return;
    }

    socket.emit(
      "join-room",
      code,
      (response: {
        success: boolean;
        message: string;
        isHost?: boolean;
        roomState?: RoomState;
      }) => {
        setMessage(response.message);

        if (response.success) {
          setRoomId(code);
          if (typeof response.isHost === "boolean") setIsHost(response.isHost);
          if (response.roomState) {
            setRoomState(response.roomState);
            applyPlayback(response.roomState);
          }
          setMessages([]);
        }
      }
    );
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();

    if (!roomId || !trimmed) return;

    socket.emit("room-message", { roomId, message: trimmed });
  };

  const togglePlayback = () => {
    if (!isHost || !roomId) return;
    if (!roomState.currentSong) return;

    // The room owns the position, so only the intent is sent.
    socket.emit("playback-update", {
      roomId,
      isPlaying: !roomState.isPlaying,
    });
  };

  const selectSong = (song: Song) => {
    if (!isHost || !roomId) return;

    socket.emit("select-song", { roomId, song });
  };

  const leaveRoom = () => {
    socket.emit("leave-room");

    setRoomId("");
    setMessage("");
    setMembers(0);
    setIsHost(false);
    setRoomState({
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
    });
    resetPlayback();
    setMessages([]);
  };

  return {
    roomId,
    message,
    members,
    isHost,
    roomState,
    messages,
    createRoom,
    joinRoom,
    sendMessage,
    togglePlayback,
    selectSong,
    leaveRoom,
  };
}

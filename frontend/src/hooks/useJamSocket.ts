import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

export type RoomState = {
  currentSong: string | null;
  isPlaying: boolean;
  currentTime: number;
};

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
      if (state) setRoomState(state);
    };

    const handlePlaybackUpdate = (payload: {
      isPlaying: boolean;
      currentTime: number;
    }) => {
      setRoomState((prev) => ({
        ...prev,
        isPlaying: payload.isPlaying,
        currentTime: payload.currentTime,
      }));
    };

    const handleRoomMessage = (msg: string) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("connect", handleConnect);
    socket.on("room-members", handleRoomMembers);
    socket.on("room-host", handleRoomHost);
    socket.on("playback-state", handlePlaybackState);
    socket.on("playback-update", handlePlaybackUpdate);
    socket.on("room-message", handleRoomMessage);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room-members", handleRoomMembers);
      socket.off("room-host", handleRoomHost);
      socket.off("playback-state", handlePlaybackState);
      socket.off("playback-update", handlePlaybackUpdate);
      socket.off("room-message", handleRoomMessage);
    };
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
          if (response.roomState) setRoomState(response.roomState);
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
    socket.emit("playback-update", {
      roomId,
      isPlaying: !roomState.isPlaying,
      currentTime: roomState.currentTime,
    });
  };

  const leaveRoom = () => {
    setRoomId("");
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
    leaveRoom,
  };
}
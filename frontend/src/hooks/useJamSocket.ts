import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

export function useJamSocket() {
  const [roomId, setRoomId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected:", socket.id);
    };

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  const createRoom = () => {
    socket.emit("create-room", (id: string) => {
      setRoomId(id);
      setMessage("Room created successfully!");
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
      (response: { success: boolean; message: string }) => {
        setMessage(response.message);

        if (response.success) {
          setRoomId(code);
        }
      }
    );
  };

  return {
    roomId,
    message,
    createRoom,
    joinRoom,
  };
}

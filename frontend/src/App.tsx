import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

(window as any).jamSocket = socket; // Temporary testing line

function App() {
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected:", socket.id);

      socket.emit("create-room", (id: string) => {
        console.log("Created room:", id);
        setRoomId(id);
      });
    };

    const handleRoomMessage = (message: string) => {
      console.log("Room message:", message);
    };

    socket.on("connect", handleConnect);
    socket.on("room-message", handleRoomMessage);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room-message", handleRoomMessage);
    };
  }, []);

  return (
    <div>
      <h1>Jam</h1>

      {roomId && (
        <div>
          <p>Your room code:</p>
          <h2>{roomId}</h2>
          <p>Share this code with your friends!</p>
        </div>
      )}
    </div>
  );
}

export default App;
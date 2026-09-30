import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {

  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      socket.emit("create-room", (id: string) => {
        console.log("Created room:", id);
        setRoomId(id);
      });

      socket.on("room-message", (message: string) => {
        console.log("Room message:", message);
      });

      return () => {
        socket.off("connect");
        socket.off("room-message");
      };
    }), []
  });

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
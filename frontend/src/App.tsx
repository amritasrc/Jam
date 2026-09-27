import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      socket.emit("create-room", (roomId: string) => {
        console.log("Created room:", roomId);
      });
    });

    socket.on("room-message", (message: string) => {
      console.log("Room message:", message);
    });

    return () => {
      socket.off("connect");
      socket.off("room-message");
    };
  }, []);

  const sendMessage = () => {
    socket.emit("room-message", {
      roomId: "room-A",
      message: "Hello from room A!",
    });
  };

  return (
    <div>
      <h1>Jam</h1>
      <button onClick={sendMessage}>Send Room Message</button>
    </div>
  );
}

export default App;
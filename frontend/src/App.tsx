import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

function App() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      socket.emit("message", "Hello from Jam!");
    });

    socket.on("welcome", (message) => {
      console.log(message);
    });

    socket.on("message", (message) => {
      console.log("Broadcast received:", message);
    });

    return () => {
      socket.off("connect");
      socket.off("welcome");
      socket.off("message");
    };
  }, []);

  return <h1>Jam</h1>;
}

export default App;
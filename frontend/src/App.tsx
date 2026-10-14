import { useEffect, useState } from "react";
import { socket } from "./lib/socket";

function App() {
  const [roomId, setRoomId] = useState("");
  const [joinCode, setJoinCode] = useState("");
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

  const joinRoom = () => {
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
      }) => {
        setMessage(response.message);

        if (response.success) {
          setRoomId(code);
        }
      }
    );
  };

  return (
    <div>
      <h1>Jam 🎵</h1>
      <p>Listen together, wherever you are.</p>

      <button onClick={createRoom}>Create Room</button>

      <hr />

      <h2>Join a Room</h2>

      <input
        type="text"
        placeholder="Enter room code"
        value={joinCode}
        onChange={(event) => setJoinCode(event.target.value)}
      />

      <button onClick={joinRoom}>Join Room</button>

      {message && <p>{message}</p>}

      {roomId && (
        <div>
          <h2>Your room code: {roomId}</h2>
          <p>Share this code with your friends!</p>
        </div>
      )}
    </div>
  );
}

export default App;

import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerRoomHandlers } from "./sockets/roomHandlers.js";
import { roomHosts, roomStates } from "./services/roomService.js";
import { registerPlaybackHandlers } from "./sockets/playbackHandlers.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.data.currentRoom = null as string | null;

  registerRoomHandlers(io, socket);
  registerPlaybackHandlers(io, socket);

  socket.on("message", (message) => {
    console.log("Message received:", message);
    socket.broadcast.emit("message", message);
  });

  socket.emit("welcome", "Welcome to Jam! 🎵");
});

httpServer.listen(PORT, () => {
  console.log(`Jam server running on port ${PORT}`);
});

import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { registerRoomHandlers } from "./sockets/roomHandlers.js";
import { registerPlaybackHandlers } from "./sockets/playbackHandlers.js";
import { registerSongHandlers } from "./sockets/songHandlers.js";
import { registerGeneralHandlers } from "./sockets/generalHandlers.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://jam-six-wheat.vercel.app",
    ],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.data.currentRoom = null as string | null;

  registerRoomHandlers(io, socket);
  registerPlaybackHandlers(io, socket);
  registerSongHandlers(io, socket);
  registerGeneralHandlers(socket);

});

httpServer.listen(PORT, () => {
  console.log(`Jam server running on port ${PORT}`);
});

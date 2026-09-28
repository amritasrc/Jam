import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

dotenv.config();

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = new Set<string>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("create-room", (callback) => {
    const roomId = nanoid(8);

    rooms.add(roomId);
    socket.join(roomId);

    callback(roomId);

    console.log(`Room created: ${roomId}`);
  });

  socket.on("join-room", (roomId, callback) => {
    if (!rooms.has(roomId)) {
      callback({ success: false, message: "Room not found" });
      return;
    }

    socket.join(roomId);

    callback({ success: true, message: "Joined room successfully" });

    console.log(`${socket.id} joined room: ${roomId}`);
  });

  socket.on("room-message", ({ roomId, message }) => {
    io.to(roomId).emit("room-message", message);
  });

  socket.on("message", (message) => {
    console.log("Message received:", message);

    socket.broadcast.emit("message", message);
  });

  socket.emit("welcome", "Welcome to Jam! 🎵");

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Jam server running on port ${PORT}`);
});
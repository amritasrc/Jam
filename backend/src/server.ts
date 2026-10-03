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

  let currentRoom: string | null = null;

  socket.on("create-room", (callback) => {
    const roomId = nanoid(8);

    rooms.add(roomId);
    socket.join(roomId);

    currentRoom = roomId;

    callback(roomId);

    console.log(`Room created: ${roomId}`);
  });

  socket.on("join-room", async (roomId, callback) => {
    if (!rooms.has(roomId)) {
      callback({
        success: false,
        message: "Room not found",
      });
      return;
    }

    socket.join(roomId);
    currentRoom = roomId;

    const members = await io.in(roomId).fetchSockets();

    console.log(`Members in room ${roomId}: ${members.length}`);

    io.to(roomId).emit("room-members", members.length);

    callback({
      success: true,
      message: "Joined room successfully",
    });

    console.log(`${socket.id} joined room: ${roomId}`);
  });

  socket.on("room-message", ({ roomId, message }) => {
    if (!rooms.has(roomId)) {
      console.log(`Message rejected: room ${roomId} not found`);
      return;
    }

    io.to(roomId).emit("room-message", message);

    console.log(`Message sent to room ${roomId}: ${message}`);
  });

  socket.on("message", (message) => {
    console.log("Message received:", message);
    socket.broadcast.emit("message", message);
  });

  socket.emit("welcome", "Welcome to Jam! 🎵");

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (currentRoom) {
      const members = await io.in(currentRoom).fetchSockets();

      console.log(
        `Members remaining in room ${currentRoom}: ${members.length}`
      );

      io.to(currentRoom).emit("room-members", members.length);

      if (members.length === 0) {
        rooms.delete(currentRoom);
        console.log(`Room deleted: ${currentRoom}`);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Jam server running on port ${PORT}`);
});
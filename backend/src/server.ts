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
const roomHosts = new Map<string, string>();
const roomStates = new Map<
  string,
  {
    currentSong: string | null;
    isPlaying: boolean;
    currentTime: number;
  }
>();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  let currentRoom: string | null = null;

  socket.on("create-room", (callback) => {
    const roomId = nanoid(8);

    rooms.add(roomId);
    roomHosts.set(roomId, socket.id);

    roomStates.set(roomId, {
      currentSong: null,
      isPlaying: false,
      currentTime: 0,
    });

    socket.join(roomId);
    currentRoom = roomId;

    callback(roomId);

    socket.join(roomId);
    currentRoom = roomId;

    io.to(roomId).emit("room-host", socket.id);

    callback(roomId);

    console.log(`Room created: ${roomId}`);
    console.log(`Host: ${socket.id}`);
  });

  socket.on("join-room", async (roomId, callback) => {
    if (!rooms.has(roomId)) {
      callback({
        success: false,
        message: "Room not found",
      });
      return;
    }

    if (currentRoom === roomId) {
      callback({
        success: false,
        message: "Already in this room",
      });
      return;
    }

    if (currentRoom) {
      socket.leave(currentRoom);
    }

    socket.join(roomId);
    currentRoom = roomId;

    const members = await io.in(roomId).fetchSockets();
    const hostId = roomHosts.get(roomId);
    const roomState = roomStates.get(roomId);

    const isHost = socket.id === hostId;

    callback({
      success: true,
      message: "Joined room successfully",
      isHost,
      roomState,
    });

    io.to(roomId).emit("room-members", members.length);
    io.to(roomId).emit("room-host", hostId);

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

      // Room is empty
      if (members.length === 0) {
        rooms.delete(currentRoom);
        roomHosts.delete(currentRoom);

        console.log(`Room deleted: ${currentRoom}`);
        return;
      }

      // Host disconnected
      if (roomHosts.get(currentRoom) === socket.id) {
        const newHost = members[0];

        roomHosts.set(currentRoom, newHost.id);

        io.to(currentRoom).emit("room-host", newHost.id);

        console.log(
          `Host disconnected. New host: ${newHost.id}`
        );
      }

      if (members.length === 0) {
        rooms.delete(currentRoom);
        roomHosts.delete(currentRoom);
        roomStates.delete(currentRoom);

        console.log(`Room deleted: ${currentRoom}`);
        return;
      }
    }
  });
  socket.on("playback-update", ({ roomId, isPlaying, currentTime }) => {
    const hostId = roomHosts.get(roomId);

    if (socket.id !== hostId) {
      return;
    }

    const roomState = roomStates.get(roomId);

    if (!roomState) {
      return;
    }

    roomState.isPlaying = isPlaying;
    roomState.currentTime = currentTime;

    io.to(roomId).emit("playback-update", {
      isPlaying,
      currentTime,
    });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Jam server running on port ${PORT}`);
});
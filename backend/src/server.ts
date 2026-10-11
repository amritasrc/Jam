import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import { registerRoomHandlers } from "./sockets/roomHandlers.js";
import { rooms, roomHosts, roomStates } from "./services/roomService.js";

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

  const leaveRoom = async (roomId: string) => {
    socket.leave(roomId);

    const members = await io.in(roomId).fetchSockets();

    io.to(roomId).emit("room-members", members.length);

    if (members.length === 0) {
      rooms.delete(roomId);
      roomHosts.delete(roomId);
      roomStates.delete(roomId);

      console.log(`Room deleted: ${roomId}`);
      return;
    }

    if (roomHosts.get(roomId) === socket.id) {
      const newHost = members[0];

      roomHosts.set(roomId, newHost.id);

      io.to(roomId).emit("room-host", newHost.id);

      console.log(`Host transferred to: ${newHost.id}`);
    }
  };

  socket.on("join-room", async (roomId, callback) => {
    if (!rooms.has(roomId)) {
      callback({
        success: false,
        message: "Room not found",
      });
      return;
    }

    if (socket.data.currentRoom === roomId) {
      callback({
        success: false,
        message: "Already in this room",
      });
      return;
    }

    if (socket.data.currentRoom) {
      await leaveRoom(socket.data.currentRoom);
      socket.data.currentRoom = null;
    }

    socket.join(roomId);
    socket.data.currentRoom = roomId;

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

    socket.emit("playback-state", roomState);

    io.to(roomId).emit("room-members", members.length);
    io.to(roomId).emit("room-host", hostId);

    console.log(`${socket.id} joined room: ${roomId}`);
  });

  socket.on("message", (message) => {
    console.log("Message received:", message);
    socket.broadcast.emit("message", message);
  });

  socket.emit("welcome", "Welcome to Jam! 🎵");

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (socket.data.currentRoom) {
      await leaveRoom(socket.data.currentRoom);
      socket.data.currentRoom = null;
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
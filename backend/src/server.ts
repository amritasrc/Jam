import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import { Server } from "socket.io";

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

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
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
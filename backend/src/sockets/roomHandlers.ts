import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  rooms,
  roomHosts,
  roomStates,
  createRoomState,
  roomExists,
} from "../services/roomService.js";

export function registerRoomHandlers(io: Server, socket: Socket) {
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
    if (!roomExists(roomId)) {
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

  socket.on("room-message", ({ roomId, message }) => {
    if (!roomExists(roomId)) {
      console.log(`Message rejected: room ${roomId} not found`);
      return;
    }

    if (socket.data.currentRoom !== roomId) {
      console.log("Message rejected: sender is not in this room");
      return;
    }

    io.to(roomId).emit("room-message", message);

    console.log(`Message sent to room ${roomId}: ${message}`);
  });

  socket.on("create-room", async (callback) => {
    if (socket.data.currentRoom) {
      await leaveRoom(socket.data.currentRoom);
      socket.data.currentRoom = null;
    }

    const roomId = nanoid(8);

    rooms.add(roomId);
    roomHosts.set(roomId, socket.id);
    roomStates.set(roomId, createRoomState());

    socket.join(roomId);
    socket.data.currentRoom = roomId;
    socket.data.isHost = true;

    io.to(roomId).emit("room-host", socket.id);

    callback(roomId);

    console.log(`Room created: ${roomId}`);
    console.log(`Host: ${socket.id}`);
  });

  socket.on("leave-room", async () => {
    if (!socket.data.currentRoom) {
      return;
    }

    const roomId = socket.data.currentRoom;

    await leaveRoom(roomId);

    socket.data.currentRoom = null;
    socket.data.isHost = false;
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (socket.data.currentRoom) {
      await leaveRoom(socket.data.currentRoom);
      socket.data.currentRoom = null;
    }
  });
}

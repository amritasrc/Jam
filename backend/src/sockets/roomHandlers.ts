import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
  rooms,
  roomHosts,
  roomStates,
  createRoomState,
  roomExists,
} from "../services/roomService.js";
import { clearRoomPlaybackTimer, snapshotRoomState } from "../services/playbackService.js";

export function registerRoomHandlers(io: Server, socket: Socket) {
  const leaveRoom = async (roomId: string) => {
    socket.leave(roomId);

    socket.data.isHost = false;

    const members = await io.in(roomId).fetchSockets();

    io.to(roomId).emit("room-members", members.length);

    if (members.length === 0) {

      clearRoomPlaybackTimer(roomId);

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

    // A late joiner must land on the position the room is playing right now,
    // not on the last value that happened to be broadcast.
    const snapshot = roomState ? snapshotRoomState(roomState) : null;

    callback({
      success: true,
      message: "Joined room successfully",
      isHost,
      roomState: snapshot,
    });

    socket.emit("playback-state", snapshot);

    io.to(roomId).emit("room-members", members.length);
    io.to(roomId).emit("room-host", hostId);

    console.log(`${socket.id} joined room: ${roomId}`);
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
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);

    if (socket.data.currentRoom) {
      await leaveRoom(socket.data.currentRoom);
      socket.data.currentRoom = null;
    }
  });
}

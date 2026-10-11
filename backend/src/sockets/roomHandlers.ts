import type { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import {
    rooms,
    roomHosts,
    roomStates,
} from "../services/roomService.js";

export function registerRoomHandlers(
    io: Server,
    socket: Socket
) {

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

    socket.on("room-message", ({ roomId, message }) => {
        if (!rooms.has(roomId)) {
            console.log(`Message rejected: room ${roomId} not found`);
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

        roomStates.set(roomId, {
            currentSong: null,
            isPlaying: false,
            currentTime: 0,
        });

        socket.join(roomId);
        socket.data.currentRoom = roomId;
        socket.data.isHost = true;

        io.to(roomId).emit("room-host", socket.id);

        callback(roomId);

        console.log(`Room created: ${roomId}`);
        console.log(`Host: ${socket.id}`);
    });

}

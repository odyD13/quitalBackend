import type { Socket } from "socket.io";
import type { FastifyInstance } from "fastify";
import { ObjectId } from "@fastify/mongodb";

export const conversationHandler = (server: FastifyInstance, socket: Socket) => {
    let roomID: string;

    socket.on("chat:with", (payload, callback) => {

        roomID = payload;
        const conversation = server.database.conversations?.find({ _id: new ObjectId(roomID) });

        if (!conversation)
            return socket.disconnect();


        socket.join(roomID);

    });

    socket.on("message", (message) => {
        socket.to(roomID).emit("message", message);
    });
} 
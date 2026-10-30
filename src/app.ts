import fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyMongo, { ObjectId } from '@fastify/mongodb';

import { Server } from "socket.io";
import { envars } from "./const.ts";

import { AuthRoute } from "./routes/auth.route.ts";
import { ConversationRoute } from "./routes/conversation.route.ts";

export async function buildApp(opts = {}) {
    const app = fastify(opts);

    /*
        Client creates an account/Signs in
                        |
                        |
                        V
        All conversations are shown to the Client 
                        |
                        |
                        V
        Client selects a contact (taking the conversation's ID) 
                        |
                        |
                        V
        Client sends a message with the conversation's ID
        to the server to redirect the client to the associated room.
                        |
                        |
                        V
        Client connects to the room and start sending real-time messages
        with the contact of the conversation.
                        

    */
    const socketio = new Server(app.server, {});

    app.register(fastifyJwt, {
        secret: envars.JWT_SECRET as string
    });

    await app.register(fastifyMongo, {
        url: `mongodb+srv://${encodeURIComponent(envars.MONGO_USERNAME)}:${encodeURIComponent(envars.MONGO_PASSWD)}@testdb.7c97eba.mongodb.net/`,
        database: envars.MONGO_DBNAME as string
    });

    app.decorate("verifyJWT", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // jwtVerify() busca automáticamente el token en la cabecera 'Authorization: Bearer <TOKEN>'
            // Si es válido, mete el contenido del token en request.user
            await request.jwtVerify();
        } catch (err) {
            reply.status(401).send({ error: "Token inválido o expirado" });
        }
    });

    app.decorate("database", {
        users: app.mongo.db?.collection('users'),
        conversations: app.mongo.db?.collection('conversations')
    });

    const USERS_DATABASE = app.mongo.db?.collection('users');
    const CONVERSATION_DATABASE = app.mongo.db?.collection('conversations');

    socketio.on("connection", socket => {
        console.log("new client connected");
        let roomID: string;

        socket.on("chat:with", (payload, callback) =>{

            roomID = payload;
            const conversation = CONVERSATION_DATABASE?.find({_id: new ObjectId(roomID)});

            if(!conversation)
                return socket.disconnect();


            socket.join(roomID);

        });

        socket.on("message", (message) => {
            socket.to(roomID).emit("message", message);
        });
    });

    app.addHook("preClose", (done) => {
        // close all active connections on this server
        socketio.local.disconnectSockets(true);
        socketio.close();
        done();
    });

    app.register(AuthRoute, { prefix: "/auth" });
    app.register(ConversationRoute, { prefix: "/conversation" });

    app.get("/", (request, reply) => USERS_DATABASE?.find({}).toArray());

    app.get('/me', { preHandler: [app.verifyJWT] }, async (request, reply) => {
        return reply.send({
            authenticated: true,
            user: request.user
        });
    });

    return {app, socketio, CONVERSATION_DATABASE, USERS_DATABASE};
}
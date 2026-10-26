import fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyMongo from '@fastify/mongodb';

import { Server } from "socket.io";
import { envars } from "./const.ts";

import { AuthRoute } from "./routes/auth.route.ts";
import { ConversationRoute } from "./routes/conversation.route.ts";

export async function buildApp(opts = {}) {
    const app = fastify(opts);
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
    })

    const USERS_DATABASE = app.mongo.db?.collection('users');
    const CONVERSATION_DATABASE = app.mongo.db?.collection('conversations');

    socketio.on("connection", socket => {
        console.log("new client connected");
    });

    app.addHook("preClose", (done) => {
        // close all active connections on this server
        socketio.local.disconnectSockets(true);
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

    return {app, CONVERSATION_DATABASE, USERS_DATABASE}
}
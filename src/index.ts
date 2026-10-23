import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import fastifyJwt from '@fastify/jwt';
import fastifyMongo from '@fastify/mongodb';
import { Server } from 'socket.io';
import { envars } from './const.ts';

import { AuthRoute } from "./routes/auth.route.ts";
import { ConversationRoute } from "./routes/conversation.route.ts";

// const server = fastify({logger: true})
const server = fastify();
const socketio = new Server(server.server, {});


server.register(fastifyJwt, {
    secret: envars.JWT_SECRET as string
});

await server.register(fastifyMongo, {
    url: `mongodb+srv://${encodeURIComponent(envars.MONGO_USERNAME)}:${encodeURIComponent(envars.MONGO_PASSWD)}@testdb.7c97eba.mongodb.net/`,
    database: envars.MONGO_DBNAME as string
});

server.decorate("verifyJWT", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        // jwtVerify() busca automáticamente el token en la cabecera 'Authorization: Bearer <TOKEN>'
        // Si es válido, mete el contenido del token en request.user
        await request.jwtVerify();
    } catch (err) {
        reply.status(401).send({ error: "Token inválido o expirado" });
    }
});


export const USERS_DATABASE = server.mongo.db?.collection('users');
export const CONVERSATION_DATABASE = server.mongo.db?.collection('conversations');

socketio.on("connection", socket => {
    console.log("new client connected");
});

server.addHook("preClose", (done) => {
    // close all active connections on this server
    socketio.local.disconnectSockets(true);
    done();
});

server.register(AuthRoute, { prefix: "/auth" });
server.register(ConversationRoute, { prefix: "/conversation" });

server.get("/", (request, reply) => USERS_DATABASE?.find({}).toArray());

server.get('/me', { preHandler: [server.verifyJWT] }, async (request, reply) => {
    return reply.send({
        authenticated: true,
        user: request.user
    });
});

server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`Server listening at ${address}`)
});

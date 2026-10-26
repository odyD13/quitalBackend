import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import fastifyJwt from '@fastify/jwt';
import fastifyMongo from '@fastify/mongodb';

import { envars } from './const.ts';

export async function AppBuild() {
    const server = fastify();

    server.register(fastifyJwt, {
        secret: envars.JWT_SECRET as string
    });

    await server.register(fastifyMongo, {
        url: `mongodb+srv://${encodeURIComponent(envars.MONGO_USERNAME)}:${encodeURIComponent(envars.MONGO_PASSWD)}@testdb.7c97eba.mongodb.net/`,
        database: envars.MONGO_DBNAME as string
    });
    server.get('/', function (request, reply) {
        reply.send({ hello: 'world' })
    })

    return server
}


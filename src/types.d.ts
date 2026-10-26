import type { FastifyReply, FastifyRequest } from "fastify";
import type { Collection, Document } from "mongodb";

export interface IUser {
    userID: string,
    username: string,
    password: string
}

declare module "fastify" {
    interface FastifyInstance {
        verifyJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        database: {
            users: Collection<Document> | undefined;
            conversations: Collection<Document> | undefined;
        };
    }
}
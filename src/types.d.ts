import type { FastifyReply, FastifyRequest } from "fastify";
import type { Collection, Document } from "mongodb";

export interface UserDTO {
    username: string,
    password: string
}

export type IUser = UserDTO & {
    userID: string,
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
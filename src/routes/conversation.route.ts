import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import { USERS_DATABASE, CONVERSATION_DATABASE } from "../index.ts";
import type { IUser } from "../types.js";
import { ObjectId } from "@fastify/mongodb";

export const ConversationRoute: FastifyPluginCallback = (fastify, opts, done) => {
    fastify.post("/:id", {preHandler: [fastify.verifyJWT]}, async (request, reply) => {
        const {id}: any = request.params;
        const {userID} = request.user as IUser;

        /* 1. Primero comprobamos si existe el user del ID proporcionado */
        const userExists = await USERS_DATABASE?.findOne({_id: new ObjectId(id)});

        if(!userExists)
            return reply.code(404).send({
                message: "User Not Found"
            });

        /* 2. Luego comprobamos que no existe una conversación ya existente. */

        const conversationExists = await CONVERSATION_DATABASE?.findOne({participants: { $all: [new ObjectId(userID), new ObjectId(id)], $size: 2 }})

        if(conversationExists)
            return reply.send({
                message: "Conversation already exists"
        })
        /* 3. Creamos la sesión si los dos requisitos se cumplen */

        CONVERSATION_DATABASE?.insertOne({
            "participants": [
                new ObjectId(id),
                new ObjectId(userID),
            ]
        })
        
        return {
            id, 
            userID
        }
        // const conversationExists = await CONVERSATION_DATABASE?.findOne({
            
        // })
    })

    done();
}
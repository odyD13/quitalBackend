import type { FastifyPluginAsync } from "fastify";
import type { IUser } from "../types.js";
import { ObjectId } from "@fastify/mongodb";

export const ConversationRoute: FastifyPluginAsync = async (fastify) => {
    const usersDatabase = fastify.database.users;
    const conversationsDatabase = fastify.database.conversations;

    fastify.get("/", {preHandler: [fastify.verifyJWT]}, async (request, reply) => {
        const {userID} = request.user as IUser;

        const conversationsFound = await conversationsDatabase?.find({participants: new ObjectId(userID)}).toArray();

        if(!conversationsFound)
            return reply.send({
                message: "There is no conversations saved"
        })

        return reply.send(conversationsFound)
        
    })

    fastify.get("/:id", {preHandler: [fastify.verifyJWT]}, async (request, reply) => {
        const {id}: any = request.params;
        const {userID} = request.user as IUser;

        /* 1. Primero comprobamos si existe el user del ID proporcionado */
        const userExists = await usersDatabase?.findOne({_id: new ObjectId(id)});

        if(!userExists)
            return reply.code(404).send({
                message: "User Not Found"
            });


        const conversationFound = await conversationsDatabase?.findOne({participants: { $all: [new ObjectId(userID), new ObjectId(id)], $size: 2 }})

        if(!conversationFound)
            return reply.send({
                message: "Conversation doesn't exist"
        })

        return reply.send(conversationFound)
        
    })

    fastify.post("/:id", {preHandler: [fastify.verifyJWT]}, async (request, reply) => {
        const {id}: any = request.params;
        const {userID} = request.user as IUser;

        /* 1. Primero comprobamos si existe el user del ID proporcionado */
        const userExists = await usersDatabase?.findOne({_id: new ObjectId(id)});

        if(!userExists)
            return reply.code(404).send({
                message: "User Not Found"
            });

        /* 2. Luego comprobamos que no existe una conversación ya existente. */

        const conversationExists = await conversationsDatabase?.findOne({participants: { $all: [new ObjectId(userID), new ObjectId(id)], $size: 2 }})

        if(conversationExists)
            return reply.send({
                message: "Conversation already exists"
        })
        /* 3. Creamos la sesión si los dos requisitos se cumplen */

        await conversationsDatabase?.insertOne({
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

    fastify.delete("/:id", {preHandler: [fastify.verifyJWT]}, async (request, reply) => {
        const {id}: any = request.params;
        const {userID} = request.user as IUser;

        /* 1. Primero comprobamos si existe el user del ID proporcionado */
        const userExists = await usersDatabase?.findOne({_id: new ObjectId(id)});

        if(!userExists)
            return reply.code(404).send({
                message: "User Not Found"
            });

        /* 2. Luego comprobamos que no existe una conversación ya existente. */

        const conversationExists = await conversationsDatabase?.findOneAndDelete({participants: { $all: [new ObjectId(userID), new ObjectId(id)], $size: 2 }})

        if(!conversationExists)
            return reply.send({
                message: "Conversation doesn't exist"
        })
        /* 3. Creamos la sesión si los dos requisitos se cumplen */

        return reply.send(conversationExists);
            
        // })
    })

};
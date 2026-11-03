import type { FastifyPluginAsync } from "fastify";
import type { IUser, GroupDTO } from "../types.js";
import { ObjectId } from "@fastify/mongodb";

export const GroupRoute: FastifyPluginAsync = async (fastify) => {
    const usersDatabase = fastify.database.users;
    const conversationsDatabase = fastify.database.conversations;

    fastify.get("/", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { userID } = request.user as IUser;

        const groupsFound = await conversationsDatabase?.find({ type: "group", participants: new ObjectId(userID) }).toArray();


        if (!groupsFound)
            return reply.send({
                message: "There is no conversations saved"
            })

        return reply.send(groupsFound)
    });

    fastify.get("/:id", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { id }: any = request.params;
        const { userID } = request.user as IUser;

        /* 1. Primero comprobamos si existe el user del ID proporcionado */

        const groupFound = await conversationsDatabase?.findOne({
            _id: new ObjectId(id),
            type: "group",
            participants: new ObjectId(userID)
        });

        if (!groupFound)
            return reply.send({
                message: "Conversation doesn't exist"
            })

        return reply.send(groupFound)

    });


    // 1. Crear un grupo
    fastify.post("/", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { userID } = request.user as IUser;
        const { name, members } = request.body as GroupDTO;

        if (!name || !Array.isArray(members)) {
            return reply.code(400).send({ message: "Name and members array are required" });
        }

        const memberObjectIds = Array.from(
            new Set([userID, ...members])
        ).map((id) => new ObjectId(id));

        if (memberObjectIds.length < 3) {
            return reply.code(400).send({ message: "A group must have at least 3 members" });
        }

        const newGroup = {
            type: "group",
            name,
            admin: new ObjectId(userID),
            participants: memberObjectIds,
            createdAt: new Date(),
        };

        const result = await conversationsDatabase?.insertOne(newGroup);

        return reply.code(201).send({
            message: "Group created successfully",
            groupId: result?.insertedId,
            ...newGroup,
        });
    });

    // 2. Añadir un usuario al grupo
    fastify.post("/:id/members", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { id } = request.params as { id: string };
        const { memberId } = request.body as { memberId: string };
        const { userID } = request.user as IUser;

        // Comprobar que el usuario a añadir existe
        const userToAdd = await usersDatabase?.findOne({ _id: new ObjectId(memberId) });
        if (!userToAdd) {
            return reply.code(404).send({ message: "User to add not found" });
        }

        // Buscar el grupo y verificar que el solicitante forma parte de él
        const group = await conversationsDatabase?.findOne({
            _id: new ObjectId(id),
            type: "group",
            participants: new ObjectId(userID),
        });

        if (!group) {
            return reply.code(404).send({ message: "Group not found or access denied" });
        }

        // Añadir el miembro usando $addToSet para evitar duplicados
        await conversationsDatabase?.updateOne(
            { _id: new ObjectId(id) },
            { $addToSet: { participants: new ObjectId(memberId) } }
        );

        return reply.send({ message: "Member added successfully" });
    });

    // 3. Eliminar un usuario del grupo (o salir del grupo)
    fastify.delete("/:id/members/:memberId", { preHandler: [fastify.verifyJWT] }, async (request, reply) => {
        const { id, memberId } = request.params as { id: string; memberId: string };
        const { userID } = request.user as IUser;

        const group = await conversationsDatabase?.findOne({
            _id: new ObjectId(id),
            type: "group",
            participants: new ObjectId(userID),
        });

        if (!group) {
            return reply.code(404).send({ message: "Group not found or access denied" });
        }

        // Lógica opcional: solo el admin puede expulsar a otros, pero cualquiera puede salir
        const isSelfRemoval = userID === memberId;
        const isAdmin = group.admin?.toString() === userID;

        if (!isSelfRemoval && !isAdmin) {
            return reply.code(403).send({ message: "Only group admins can remove members" });
        }

        // Eliminar el participante usando $pull
        await conversationsDatabase?.updateOne(
            { _id: new ObjectId(id) },
            { $pull: { participants: new ObjectId(memberId) } }
        );

        return reply.send({ message: "Member removed successfully" });
    });

    // 4. Obtener información del grupo
};


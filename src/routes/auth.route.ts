import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
// import { users } from "../index.ts";
import { USERS_DATABASE } from "../index.ts";
import type { IUser } from "../types.js";

declare module "fastify" {
    interface FastifyInstance {
        verifyJWT: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

export const AuthRoute: FastifyPluginCallback = (fastify, opts, done) => {

    fastify.get('/signup', (request, reply) => {
        return "GET /signup"
    });

    fastify.post('/signup', (request, reply) => {
        console.log(request.headers['content-type']);
        const { username, password } = request.body as IUser;
        USERS_DATABASE?.insertOne({username, password});
        reply.status(200).send({ username, password });
    });

    fastify.post("/login", async (request, reply) => {
        const { username, password } = request.body as IUser;

        // const userExists = users.some(user => user.username === username && user.password === password);
        const userFound = await USERS_DATABASE?.findOne({username});


        if (!userFound) {
            return reply.status(401).send({ error: "Nombre de usuario o contraseña incorrectos" });
        }

        // Generamos el JWT. Expirará en 15 minutos para mitigar riesgos de seguridad.
        if(userFound.password !== password)
            return reply.status(401).send({ error: "Nombre de usuario o contraseña incorrectos" });

        const token = fastify.jwt.sign(
            { username, userID: userFound._id},
            { expiresIn: '15m' }
        );

        // Devolvemos el token al frontend
        return reply.send({
            message: "Login exitoso",
            token: token
        });
    });

    fastify.get('/signout', (request, reply) => {
        //logic for removing the cookie with the JWT
    });

    // fastify.post('/signup', (request, reply) => {
    //     console.log(request.body["username"]);
    // });
    done();
};
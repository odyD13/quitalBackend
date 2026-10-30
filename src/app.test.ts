import { buildApp } from "./app.ts";
import test, { type TestContext } from "node:test";
import assert from "node:assert";
import type { UserDTO } from "./types.d.ts";

test("Get users in '/' route", async (t: TestContext) => {
    const { app } = await buildApp();

    let newUser: UserDTO;
    const usersDatabase = app.database.users;

    await t.test("Create User", async () => {
        await usersDatabase.drop();
        newUser = { username: "test", password: "testpasswd" };
        
        await app.inject({
            method: "POST",
            url: "/auth/signup",
            body: newUser
        });
    });

    await t.test("Get user created", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/",
        });

        const { username, password } = response.json()[0];
        const userResponsed = { username, password };

        assert.deepStrictEqual(userResponsed, newUser);
    });

    t.after(async () => {
        await app.close();
    });
});

test("Make conversations with other users", async (t: TestContext) => {
    const { app } = await buildApp();
    const usersDatabase = app.database.users;
    const conversationsDatabase = app.database.conversations;

    let userAId: string;
    let userBId: string;
    let tokenUserA: string;

    await t.test("Setup users and login", async () => {
        // AGREGADO 'await' aquí para evitar fugas asíncronas y MongoPoolClosedError
        await usersDatabase?.drop();
        await conversationsDatabase?.drop();

        const userA: UserDTO = { username: "userA", password: "passwordA" };
        const userB: UserDTO = { username: "userB", password: "passwordB" };

        await app.inject({ method: "POST", url: "/auth/signup", body: userA });
        await app.inject({ method: "POST", url: "/auth/signup", body: userB });

        // Retrieve created users to get their _id
        const usersRes = await app.inject({ method: "GET", url: "/" });
        const allUsers = usersRes.json();
        userAId = allUsers.find((u: UserDTO & { _id: string }) => u.username === userA.username)?._id;
        userBId = allUsers.find((u: UserDTO & { _id: string }) => u.username === userB.username)?._id;

        // Login with userA to obtain JWT
        const loginRes = await app.inject({
            method: "POST",
            url: "/auth/login",
            body: userA
        });

        const loginBody = loginRes.json();
        // Asegúrate de extraer la clave correcta según el contrato de tu backend
        tokenUserA = loginBody.token || loginBody.accessToken; 
    });

    await t.test("Create conversation with userB", async () => {
        const response = await app.inject({
            method: "POST",
            url: `/conversation/${userBId}`,
            headers: {
                authorization: `Bearer ${tokenUserA}`
            }
        });

        assert.strictEqual(response.statusCode, 200, `Expected 200 OK but got ${response.statusCode}: ${response.body}`);

        assert.deepStrictEqual(response.json(), {
            id: userBId,
            userID: userAId
        }, "Conversation creation failed");
    });

    await t.test("Get all conversations for userA", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/conversation",
            headers: {
                authorization: `Bearer ${tokenUserA}`
            }
        });

        assert.strictEqual(response.statusCode, 200, `Expected 200 OK but got ${response.statusCode}: ${response.body}`);

        const conversations = response.json();
        assert.ok(Array.isArray(conversations), "Response should be an array of conversations");
        assert.strictEqual(conversations.length, 1, "User A should have exactly 1 conversation");

        const conv = conversations[0];
        assert.ok(conv?.participants, "Conversation object must contain 'participants'");
        assert.strictEqual(conv.participants.includes(userAId), true, "Participants must include userA");
        assert.strictEqual(conv.participants.includes(userBId), true, "Participants must include userB");
    });

    await t.test("Get conversation by participant userB ID", async () => {
        const response = await app.inject({
            method: "GET",
            url: `/conversation/${userBId}`,
            headers: {
                authorization: `Bearer ${tokenUserA}`
            }
        });

        const conversation = response.json();
        assert.ok(conversation?.participants, "Response object must contain 'participants'");
        assert.strictEqual(conversation.participants.includes(userAId), true);
        assert.strictEqual(conversation.participants.includes(userBId), true);
    });

    await t.test("Delete conversation with userB", async () => {
        const response = await app.inject({
            method: "DELETE",
            url: `/conversation/${userBId}`,
            headers: {
                authorization: `Bearer ${tokenUserA}`
            }
        });

        const deletedConv = response.json();
        assert.ok(deletedConv?.participants, "Response object must contain 'participants'");
        assert.strictEqual(deletedConv.participants.includes(userAId), true);
        assert.strictEqual(deletedConv.participants.includes(userBId), true);
    });

    t.after(async () => {
        await app.close();
    });
});
import { buildApp } from "./app.ts"
import test from "node:test";
import type { UserDTO } from "./types.js";

const TESTS_LENGTH = 2;

test("get users in '/' route", async (t) => {
    const { app } = await buildApp();

    app.listen({ port: 0 }, (err, address) => {
        if (err) {
            app.log.error(err)
            process.exit(1)
        }
        console.log(`Testing server Started...`)
    });

    let newUser: UserDTO;
    const usersDatabase = app.database.users;
    t.plan(TESTS_LENGTH);

    await t.test("Create User", async (t) => {
        await usersDatabase?.drop();
        newUser = { username: "test", password: "testpasswd" };
        const response = await app.inject({
            method: "POST",
            url: "/auth/signup",
            body: newUser
        });


    });

    await t.test("Get user created", async (t) => {
        newUser = { username: "test", password: "testpasswd" };
        const response = await app.inject({
            method: "GET",
            url: "/",
        });

        const { username, password } = response.json()[0];
        const userResponsed = { username, password };

        t.assert.deepEqual(userResponsed, newUser);
    });

    t.after(async () => {
        await app.close();
    });
});

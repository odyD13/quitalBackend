import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:8080";

async function main() {
    const rl = readline.createInterface({ input, output });

    try {
        console.log("=== Login ===");
        const username = await rl.question("Username: ");
        const password = await rl.question("Password: ");

        // 1. Login with POST /auth/login
        const loginRes = await fetch(`${SERVER_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error("Login error:", loginData);
            rl.close();
            return;
        }

        const token = loginData.token;
        console.log("Login successful!");

        // 2. Ask for the other user ID to create/get a conversation
        console.log("\n=== Start Conversation ===");
        const targetUserId = await rl.question("Enter other user ID (_id): ");

        // Try creating the conversation (POST /conversation/:id)
        const createConvRes = await fetch(`${SERVER_URL}/conversation/${targetUserId.trim()}`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const createConvData = await createConvRes.json();
        if (!createConvRes.ok && createConvRes.status !== 400) {
            console.error("Error creating conversation:", createConvData);
        }

        // 3. Obtain conversation details (GET /conversation/:id) to get its _id
        const getConvRes = await fetch(`${SERVER_URL}/conversation/${targetUserId.trim()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const convData = await getConvRes.json();
        if (!getConvRes.ok || !convData._id) {
            console.error("Failed to retrieve conversation:", convData);
            rl.close();
            return;
        }

        const conversationId = convData._id;
        console.log(`Found conversation with ID: ${conversationId}`);

        // 4. Connect to socket.io and join room
        console.log("\nConnecting to Socket.IO server...");
        const socket = io(SERVER_URL);

        socket.on("connect", () => {
            console.log(`Socket connected (id: ${socket.id}). Joined room: ${conversationId}`);
            socket.emit("chat:with", conversationId);
            console.log("You can start chatting now! Type your message and hit Enter (type /exit to leave):\n");

            rl.setPrompt("> ");
            rl.prompt();
        });

        // Listen for incoming messages from the room
        socket.on("message", (msg) => {
            // Clear current prompt line before logging to avoid overlapping
            process.stdout.write("\r\x1b[K");
            if (typeof msg === "object" && msg !== null) {
                console.log(`[${msg.sender || "partner"}]: ${msg.text || JSON.stringify(msg)}`);
            } else {
                console.log(`[partner]: ${msg}`);
            }
            rl.prompt();
        });

        socket.on("disconnect", () => {
            console.log("\nSocket disconnected.");
            process.exit(0);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
        });

        // Prompt loop for sending real-time messages continuously
        rl.on("line", (line) => {
            const trimmed = line.trim();
            if (trimmed === "/exit") {
                socket.disconnect();
                rl.close();
                process.exit(0);
            }

            if (trimmed.length > 0) {
                socket.emit("message", {
                    room: conversationId,
                    text: trimmed,
                    sender: username
                });
            }

            rl.prompt();
        });

    } catch (err) {
        console.error("An error occurred:", err);
        rl.close();
    }
}

main();

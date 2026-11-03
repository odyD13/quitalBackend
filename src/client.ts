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

        // 2. Select conversation type (Direct 1-to-1 or Group)
        console.log("\n=== Choose Chat Mode ===");
        console.log("1. Direct (1-to-1) Conversation");
        console.log("2. Create New Group");
        console.log("3. Join Existing Group by ID");
        const mode = (await rl.question("Select option (1/2/3): ")).trim();

        let roomId: string | null = null;

        if (mode === "2") {
            // Create a group
            console.log("\n=== Create Group ===");
            const groupName = await rl.question("Group Name: ");
            const membersInput = await rl.question("Member User IDs (comma-separated, at least 2 other users): ");
            const members = membersInput
                .split(",")
                .map((m) => m.trim())
                .filter((m) => m.length > 0);

            const createGroupRes = await fetch(`${SERVER_URL}/group`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name: groupName, members })
            });

            const groupData = await createGroupRes.json();
            if (!createGroupRes.ok) {
                console.error("Failed to create group:", groupData);
                rl.close();
                return;
            }

            roomId = groupData.groupId || groupData._id;
            console.log(`Group created successfully! Group ID: ${roomId}`);

        } else if (mode === "3") {
            // Join existing group
            console.log("\n=== Join Existing Group ===");
            const groupId = (await rl.question("Enter Group ID: ")).trim();

            const getGroupRes = await fetch(`${SERVER_URL}/group/${groupId}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const groupData = await getGroupRes.json();
            if (!getGroupRes.ok || !groupData._id) {
                console.error("Failed to fetch group info:", groupData);
                rl.close();
                return;
            }

            roomId = groupData._id;
            console.log(`Connected to group "${groupData.name}" (${roomId})`);

        } else {
            // Direct 1-to-1 conversation
            console.log("\n=== Start Direct Conversation ===");
            const targetUserId = (await rl.question("Enter other user ID (_id): ")).trim();

            // Try creating the conversation (POST /conversation/:id)
            const createConvRes = await fetch(`${SERVER_URL}/conversation/${targetUserId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            const createConvData = await createConvRes.json();
            if (!createConvRes.ok && createConvRes.status !== 400) {
                console.error("Error creating conversation:", createConvData);
            }

            // Obtain conversation details (GET /conversation/:id) to get its _id
            const getConvRes = await fetch(`${SERVER_URL}/conversation/${targetUserId}`, {
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

            roomId = convData._id;
            console.log(`Found conversation with ID: ${roomId}`);
        }

        if (!roomId) {
            console.error("Invalid room ID.");
            rl.close();
            return;
        }

        // 3. Connect to socket.io and join room
        console.log("\nConnecting to Socket.IO server...");
        const socket = io(SERVER_URL);

        socket.on("connect", () => {
            console.log(`Socket connected (id: ${socket.id}). Joined room: ${roomId}`);
            socket.emit("chat:with", roomId);
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
                    room: roomId,
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

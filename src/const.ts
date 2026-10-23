import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envFile = fileURLToPath(new URL("../.env", import.meta.url));

if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
}

const mongoUsername = process.env.MONGODB_USERNAME;
const mongoPassword = process.env.MONGODB_PASSWORD;
const databaseName = process.env.MONGODB_DBNAME;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUsername || !mongoPassword) {
    throw new Error("MONGODB_USERNAME and MONGODB_PASSWORD must be set in src/.env or the process environment");
}

export const envars = {
    MONGO_USERNAME: mongoUsername,
    MONGO_PASSWD: mongoPassword,
    MONGO_DBNAME: databaseName,
    JWT_SECRET: jwtSecret
}
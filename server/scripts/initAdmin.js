import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");
const DB_PATH = path.join(serverDir, "db.json");

function ensureDir() {
  if (!existsSync(serverDir)) mkdirSync(serverDir, { recursive: true });
}

function readDb() {
  ensureDir();
  if (!existsSync(DB_PATH)) return { articles: [] };
  return JSON.parse(readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

const db = readDb();
if (!db.adminToken) {
  db.adminToken = randomBytes(16).toString("hex");
  writeDb(db);
  console.log("Admin token created:", db.adminToken);
} else {
  console.log("Admin token exists:", db.adminToken);
}



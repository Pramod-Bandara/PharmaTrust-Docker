import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let database: Db | null = null;

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "pharmatrust";

export async function getDb(): Promise<Db> {
  if (database) return database;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI. Set it in your environment variables (e.g., .env.local)."
    );
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(dbName);
  return database;
}

export async function disconnectDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}

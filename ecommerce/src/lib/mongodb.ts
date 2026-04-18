import { Db, MongoClient } from "mongodb";

const mongoDbName = process.env.MONGODB_DB_NAME ?? "firaangi";

type MongoGlobal = typeof globalThis & {
  __firaangiMongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

function getMongoClientPromise() {
  const existingPromise = globalForMongo.__firaangiMongoClientPromise;

  if (existingPromise) {
    return existingPromise;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  const clientPromise = new MongoClient(mongoUri).connect();

  if (process.env.NODE_ENV !== "production") {
    globalForMongo.__firaangiMongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(mongoDbName);
}

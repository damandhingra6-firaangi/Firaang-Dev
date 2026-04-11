import { Db, MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB_NAME ?? "firaangi";

if (!mongoUri) {
  throw new Error("MONGODB_URI is not configured");
}

type MongoGlobal = typeof globalThis & {
  __firaangiMongoClientPromise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as MongoGlobal;

const mongoClientPromise =
  globalForMongo.__firaangiMongoClientPromise ??
  new MongoClient(mongoUri)
    .connect()
    .then((client) => client);

if (process.env.NODE_ENV !== "production") {
  globalForMongo.__firaangiMongoClientPromise = mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await mongoClientPromise;
  return client.db(mongoDbName);
}

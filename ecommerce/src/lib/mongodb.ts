import { Db, MongoClient, type MongoClientOptions } from "mongodb";

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

  const mongoClientOptions: MongoClientOptions = {
    serverSelectionTimeoutMS: 15000,
    tls: true,
  };

  // Emergency-only switch for diagnosing broken CA bundles on host providers.
  if (process.env.MONGODB_TLS_INSECURE === "true") {
    mongoClientOptions.tlsAllowInvalidCertificates = true;
    mongoClientOptions.tlsAllowInvalidHostnames = true;
  }

  const clientPromise = new MongoClient(mongoUri, mongoClientOptions)
    .connect()
    .catch((error) => {
      // Allow subsequent retries after a transient failure instead of caching a rejected promise.
      if (globalForMongo.__firaangiMongoClientPromise === clientPromise) {
        globalForMongo.__firaangiMongoClientPromise = undefined;
      }
      throw error;
    });

  globalForMongo.__firaangiMongoClientPromise = clientPromise;

  return clientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(mongoDbName);
}

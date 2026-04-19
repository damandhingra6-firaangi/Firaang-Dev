import { MongoClient } from "mongodb";

const REQUIRED_ENV_KEYS = [
  "MONGODB_URI",
  "MONGODB_DB_NAME",
  "MONGODB_FEEDBACK_COLLECTION",
  "MONGODB_NEWSLETTER_COLLECTION",
];

function maskMongoUri(uri) {
  return uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

function printMissingEnvAndExit() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missing.length === 0) {
    return;
  }

  console.error("Missing required environment variables:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }

  console.error("\nSet these in your host (cPanel Node.js app env settings), then retry.");
  process.exit(1);
}

function printErrorHint(errorMessage) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("bad auth") || normalized.includes("authentication failed")) {
    console.error("Hint: Mongo username/password is incorrect, or password is not URL-encoded.");
    return;
  }

  if (normalized.includes("enotfound") || normalized.includes("querysrv")) {
    console.error("Hint: Cluster hostname in MONGODB_URI appears invalid.");
    return;
  }

  if (normalized.includes("econnrefused") || normalized.includes("server selection")) {
    console.error("Hint: Atlas network access may be blocked. Check IP allowlist and firewall.");
    return;
  }

  if (normalized.includes("not authorized")) {
    console.error("Hint: DB user may not have readWrite permissions on your database.");
  }
}

async function main() {
  printMissingEnvAndExit();

  const mongoUri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const feedbackCollection = process.env.MONGODB_FEEDBACK_COLLECTION;
  const newsletterCollection = process.env.MONGODB_NEWSLETTER_COLLECTION;

  if (!mongoUri.startsWith("mongodb+srv://") && !mongoUri.startsWith("mongodb://")) {
    console.error("MONGODB_URI must start with mongodb+srv:// or mongodb://");
    process.exit(1);
  }

  console.log("Checking MongoDB connection...");
  console.log(`URI: ${maskMongoUri(mongoUri)}`);
  console.log(`Database: ${dbName}`);

  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionNames = new Set(collections.map((collection) => collection.name));

    console.log("\nConnection successful.");
    console.log(`Feedback collection configured: ${feedbackCollection}`);
    console.log(`Newsletter collection configured: ${newsletterCollection}`);
    console.log(
      `Feedback collection exists: ${collectionNames.has(feedbackCollection) ? "yes" : "no (will be created automatically)"}`,
    );
    console.log(
      `Newsletter collection exists: ${collectionNames.has(newsletterCollection) ? "yes" : "no (will be created automatically)"}`,
    );

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("\nMongoDB check failed.");
    console.error(`Error: ${message}`);
    printErrorHint(message);
    process.exit(1);
  } finally {
    await client.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("Unexpected failure:", error);
  process.exit(1);
});

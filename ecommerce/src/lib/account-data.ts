import { randomBytes, createHash } from "node:crypto";
import { ObjectId, type Collection } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

export type AccountProfile = {
  fullName: string;
  email: string;
  avatarUrl: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  authProvider: "google";
};

export type AccountOrderItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AccountOrder = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed";
  paymentId?: string;
  items: AccountOrderItem[];
};

export type AccountSessionSnapshot = {
  profile: AccountProfile;
  orders: AccountOrder[];
};

type AccountUserDocument = {
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  authProvider: "google";
  googleSub: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedInAt: Date;
};

type AccountSessionDocument = {
  userId: ObjectId;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

type AccountOrderDocument = {
  userId: ObjectId;
  orderId: string;
  paymentId?: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed";
  items: AccountOrderItem[];
  createdAt: Date;
  updatedAt: Date;
};

const USERS_COLLECTION_NAME = process.env.MONGODB_USERS_COLLECTION ?? "users";
const SESSIONS_COLLECTION_NAME = process.env.MONGODB_SESSIONS_COLLECTION ?? "account_sessions";
const ORDERS_COLLECTION_NAME = process.env.MONGODB_ORDERS_COLLECTION ?? "orders";

let ensureAccountIndexesPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function mapProfile(document: AccountUserDocument): AccountProfile {
  return {
    fullName: document.fullName ?? "",
    email: document.email,
    avatarUrl: document.avatarUrl ?? "",
    phone: document.phone ?? "",
    address: document.address ?? "",
    city: document.city ?? "",
    state: document.state ?? "",
    pinCode: document.pinCode ?? "",
    authProvider: document.authProvider,
  };
}

function mapOrder(document: AccountOrderDocument): AccountOrder {
  return {
    id: document.orderId,
    createdAt: document.createdAt.toISOString(),
    totalAmount: document.totalAmount,
    currencyCode: document.currencyCode,
    status: document.status,
    paymentId: document.paymentId,
    items: document.items,
  };
}

async function getCollections() {
  const db = await getMongoDb();

  const users = db.collection<AccountUserDocument>(USERS_COLLECTION_NAME);
  const sessions = db.collection<AccountSessionDocument>(SESSIONS_COLLECTION_NAME);
  const orders = db.collection<AccountOrderDocument>(ORDERS_COLLECTION_NAME);

  if (!ensureAccountIndexesPromise) {
    ensureAccountIndexesPromise = Promise.all([
      users.createIndex({ email: 1 }, { name: "user_email_unique", unique: true }),
      users.createIndex({ googleSub: 1 }, { name: "user_google_sub_unique", unique: true }),
      sessions.createIndex({ tokenHash: 1 }, { name: "session_token_hash_unique", unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { name: "session_expires_ttl", expireAfterSeconds: 0 }),
      orders.createIndex({ orderId: 1 }, { name: "order_id_unique", unique: true }),
      orders.createIndex({ userId: 1, createdAt: -1 }, { name: "order_user_created_desc" }),
    ])
      .then(() => undefined)
      .catch((error) => {
        ensureAccountIndexesPromise = null;
        throw error;
      });
  }

  await ensureAccountIndexesPromise;
  return { users, sessions, orders };
}

async function listOrdersForUserId(orders: Collection<AccountOrderDocument>, userId: ObjectId) {
  const documents = await orders.find({ userId }, { sort: { createdAt: -1 }, limit: 50 }).toArray();
  return documents.map(mapOrder);
}

export async function upsertGoogleAccount(input: {
  email: string;
  fullName: string;
  avatarUrl?: string;
  googleSub: string;
}) {
  const { users } = await getCollections();
  const now = new Date();
  const email = normalizeEmail(input.email);

  await users.updateOne(
    { email },
    {
      $set: {
        email,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl ?? "",
        googleSub: input.googleSub,
        authProvider: "google",
        updatedAt: now,
        lastSignedInAt: now,
      },
      $setOnInsert: {
        phone: "",
        address: "",
        city: "",
        state: "",
        pinCode: "",
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const user = await users.findOne({ email });

  if (!user) {
    throw new Error("Failed to load Google account after upsert");
  }

  return {
    userId: user._id.toHexString(),
    profile: mapProfile(user),
  };
}

export async function createAccountSession(userId: string) {
  const { sessions } = await getCollections();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

  await sessions.insertOne({
    userId: new ObjectId(userId),
    tokenHash: hashSessionToken(token),
    createdAt: now,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

export async function deleteAccountSession(token: string) {
  const { sessions } = await getCollections();
  await sessions.deleteOne({ tokenHash: hashSessionToken(token) });
}

export async function getAccountSnapshotBySessionToken(token: string): Promise<AccountSessionSnapshot | null> {
  const { users, sessions, orders } = await getCollections();
  const tokenHash = hashSessionToken(token);
  const session = await sessions.findOne({ tokenHash });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await sessions.deleteOne({ _id: session._id });
    return null;
  }

  const user = await users.findOne({ _id: session.userId });

  if (!user) {
    return null;
  }

  const mappedOrders = await listOrdersForUserId(orders, session.userId);

  return {
    profile: mapProfile(user),
    orders: mappedOrders,
  };
}

export async function updateAccountProfileBySessionToken(
  token: string,
  updates: Partial<Omit<AccountProfile, "email" | "authProvider">>,
): Promise<AccountProfile | null> {
  const { users, sessions } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return null;
  }

  await users.updateOne(
    { _id: session.userId },
    {
      $set: {
        fullName: updates.fullName,
        avatarUrl: updates.avatarUrl,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        pinCode: updates.pinCode,
        updatedAt: new Date(),
      },
    },
  );

  const updatedUser = await users.findOne({ _id: session.userId });
  return updatedUser ? mapProfile(updatedUser) : null;
}

export async function createPendingOrderForSessionToken(
  token: string,
  input: {
    orderId: string;
    totalAmount: number;
    currencyCode: string;
    items: AccountOrderItem[];
  },
) {
  const { sessions, orders } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return null;
  }

  const now = new Date();

  await orders.updateOne(
    { orderId: input.orderId },
    {
      $set: {
        userId: session.userId,
        totalAmount: input.totalAmount,
        currencyCode: input.currencyCode,
        items: input.items,
        status: "pending",
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const document = await orders.findOne({ orderId: input.orderId });
  return document ? mapOrder(document) : null;
}

export async function markOrderPaidForSessionToken(token: string, input: { orderId: string; paymentId: string }) {
  const { sessions, orders } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return null;
  }

  await orders.updateOne(
    { orderId: input.orderId, userId: session.userId },
    {
      $set: {
        status: "paid",
        paymentId: input.paymentId,
        updatedAt: new Date(),
      },
    },
  );

  const updatedOrder = await orders.findOne({ orderId: input.orderId, userId: session.userId });
  return updatedOrder ? mapOrder(updatedOrder) : null;
}
import { randomBytes, createHash, randomInt, scrypt as scryptCallback, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ObjectId, type Collection } from "mongodb";
import { ORDER_CANCELLATION_WINDOW_DAYS } from "@/lib/checkout-config";
import { getMongoDb } from "@/lib/mongodb";

const scrypt = promisify(scryptCallback);

export type AccountProfile = {
  fullName: string;
  email: string;
  avatarUrl: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  authProvider: "google" | "email" | "mobile";
};

export type AccountOrderItem = {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type AccountOrderEvent = {
  type: "created" | "reserved" | "committed" | "released" | "paid" | "synced" | "fulfilled" | "cancelled" | "refunded";
  at: string;
  note?: string;
};

export type AccountInventorySyncAttempt = {
  variantId: string;
  quantity: number;
  status: "reserved" | "released" | "failed" | "skipped";
  message?: string;
  inventoryItemId?: string;
};

export type AccountOrder = {
  id: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
  status: "paid" | "pending" | "failed" | "cancelled";
  paymentMethod: "online" | "cod";
  paymentGateway?: "razorpay";
  paymentStatus?: "created" | "authorized" | "captured" | "failed" | "refunded";
  cancelledAt?: string;
  cancelReason?: string;
  paymentId?: string;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  shopifyOrderId?: string;
  shopifySyncStatus?: "pending" | "synced" | "failed" | "skipped";
  shopifySyncError?: string;
  inventorySyncStatus?: "pending" | "reserved" | "released" | "partial" | "failed" | "skipped";
  inventorySyncError?: string;
  inventorySyncAttempts?: AccountInventorySyncAttempt[];
  fulfillmentStatus?: "unfulfilled" | "processing" | "fulfilled" | "cancelled";
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
  events?: AccountOrderEvent[];
  items: AccountOrderItem[];
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
};

export type AccountSessionSnapshot = {
  profile: AccountProfile;
  orders: AccountOrder[];
};

export type AccountOrderWithCustomer = {
  order: AccountOrder;
  customer: {
    email: string;
    fullName: string;
  } | null;
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
  authProvider: "google" | "email" | "mobile";
  googleSub: string;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedInAt: Date;
};

type AccountMobileOtpDocument = {
  phone: string;
  otpHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
};

type InventoryMovementDocument = {
  orderId: string;
  userId: ObjectId;
  type: "reserved" | "committed" | "released" | "refunded";
  items: AccountOrderItem[];
  note?: string;
  createdAt: Date;
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
  status: "paid" | "pending" | "failed" | "cancelled";
  paymentMethod?: "online" | "cod";
  paymentGateway?: "razorpay";
  paymentStatus?: "created" | "authorized" | "captured" | "failed" | "refunded";
  cancelledAt?: Date;
  cancelReason?: string;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: Date;
  shopifyOrderId?: string;
  shopifySyncStatus?: "pending" | "synced" | "failed" | "skipped";
  shopifySyncError?: string;
  inventorySyncStatus?: "pending" | "reserved" | "released" | "partial" | "failed" | "skipped";
  inventorySyncError?: string;
  inventorySyncAttempts?: AccountInventorySyncAttempt[];
  fulfillmentStatus?: "unfulfilled" | "processing" | "fulfilled" | "cancelled";
  shippingCarrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  events?: Array<{ type: AccountOrderEvent["type"]; at: Date; note?: string }>;
  items: AccountOrderItem[];
  createdAt: Date;
  updatedAt: Date;
  shippingName?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPinCode?: string;
};

const USERS_COLLECTION_NAME = process.env.MONGODB_USERS_COLLECTION ?? "users";
const SESSIONS_COLLECTION_NAME = process.env.MONGODB_SESSIONS_COLLECTION ?? "account_sessions";
const ORDERS_COLLECTION_NAME = process.env.MONGODB_ORDERS_COLLECTION ?? "orders";
const MOBILE_OTPS_COLLECTION_NAME = process.env.MONGODB_MOBILE_OTPS_COLLECTION ?? "account_mobile_otps";
const INVENTORY_MOVEMENTS_COLLECTION_NAME = process.env.MONGODB_INVENTORY_COLLECTION ?? "inventory_movements";
const MOBILE_OTP_COOLDOWN_MS = 45 * 1000;

let ensureAccountIndexesPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeShopifyNumericId(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const gidMatch = trimmed.match(/\/(\d+)$/);
  return gidMatch?.[1] ?? "";
}

function buildShopifyOrderIdCandidates(orderId: string) {
  const numeric = normalizeShopifyNumericId(orderId);

  if (!numeric) {
    return [];
  }

  return [numeric, `gid://shopify/Order/${numeric}`];
}

export function normalizePhoneNumber(phone: string) {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return "";
}

export function isSupportedMobileNumber(phone: string) {
  return /^\+91[6-9]\d{9}$/.test(phone);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashOtpCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const stored = Buffer.from(hashHex, "hex");
  const derived = Buffer.from(scryptSync(password, salt, stored.length));
  return stored.length === derived.length && timingSafeEqual(stored, derived);
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
    paymentMethod: document.paymentMethod ?? "online",
    paymentGateway: document.paymentGateway,
    paymentStatus: document.paymentStatus,
    cancelledAt: document.cancelledAt?.toISOString(),
    cancelReason: document.cancelReason,
    paymentId: document.paymentId,
    refundId: document.refundId,
    refundAmount: document.refundAmount,
    refundedAt: document.refundedAt?.toISOString(),
    shopifyOrderId: document.shopifyOrderId,
    shopifySyncStatus: document.shopifySyncStatus,
    shopifySyncError: document.shopifySyncError,
    inventorySyncStatus: document.inventorySyncStatus,
    inventorySyncError: document.inventorySyncError,
    inventorySyncAttempts: document.inventorySyncAttempts,
    fulfillmentStatus: document.fulfillmentStatus,
    shippingCarrier: document.shippingCarrier,
    trackingNumber: document.trackingNumber,
    trackingUrl: document.trackingUrl,
    shippedAt: document.shippedAt?.toISOString(),
    deliveredAt: document.deliveredAt?.toISOString(),
    events: document.events?.map((event) => ({
      type: event.type,
      at: event.at.toISOString(),
      note: event.note,
    })),
    items: document.items,
    shippingName: document.shippingName,
    shippingAddress: document.shippingAddress,
    shippingCity: document.shippingCity,
    shippingState: document.shippingState,
    shippingPinCode: document.shippingPinCode,
  };
}

async function getCollections() {
  const db = await getMongoDb();

  const users = db.collection<AccountUserDocument>(USERS_COLLECTION_NAME);
  const sessions = db.collection<AccountSessionDocument>(SESSIONS_COLLECTION_NAME);
  const orders = db.collection<AccountOrderDocument>(ORDERS_COLLECTION_NAME);
  const mobileOtps = db.collection<AccountMobileOtpDocument>(MOBILE_OTPS_COLLECTION_NAME);
  const inventoryMovements = db.collection<InventoryMovementDocument>(INVENTORY_MOVEMENTS_COLLECTION_NAME);

  if (!ensureAccountIndexesPromise) {
    ensureAccountIndexesPromise = Promise.all([
      users.createIndex({ email: 1 }, { name: "user_email_unique", unique: true }),
      users.createIndex({ googleSub: 1 }, { name: "user_google_sub_unique", unique: true }),
      sessions.createIndex({ tokenHash: 1 }, { name: "session_token_hash_unique", unique: true }),
      sessions.createIndex({ expiresAt: 1 }, { name: "session_expires_ttl", expireAfterSeconds: 0 }),
      orders.createIndex({ orderId: 1 }, { name: "order_id_unique", unique: true }),
      orders.createIndex({ shopifyOrderId: 1 }, { name: "order_shopify_id_lookup", sparse: true }),
      orders.createIndex({ userId: 1, createdAt: -1 }, { name: "order_user_created_desc" }),
      orders.createIndex({ paymentId: 1 }, { name: "order_payment_id_lookup", sparse: true }),
      inventoryMovements.createIndex({ orderId: 1, type: 1 }, { name: "inventory_order_type_unique", unique: true }),
      inventoryMovements.createIndex({ createdAt: -1 }, { name: "inventory_created_desc" }),
      mobileOtps.createIndex({ phone: 1, createdAt: -1 }, { name: "mobile_otp_phone_created_desc" }),
        users.createIndex(
          { phone: 1 },
          {
            name: "user_phone_unique_non_empty",
            unique: true,
            partialFilterExpression: {
              phone: {
                $exists: true,
                $gt: "",
              },
            },
          },
        ),
      mobileOtps.createIndex({ expiresAt: 1 }, { name: "mobile_otp_expires_ttl", expireAfterSeconds: 0 }),
    ])
      .then(() => undefined)
      .catch((error) => {
        ensureAccountIndexesPromise = null;
        throw error;
      });
  }

  await ensureAccountIndexesPromise;
  return { users, sessions, orders, mobileOtps, inventoryMovements };
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

export async function createEmailAccount(input: {
  email: string;
  fullName: string;
  password: string;
}) {
  const { users } = await getCollections();
  const now = new Date();
  const email = normalizeEmail(input.email);

  const existing = await users.findOne({ email });

  if (existing) {
    throw new Error(existing.authProvider === "google" ? "EMAIL_EXISTS_GOOGLE" : "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const insertResult = await users.insertOne({
    email,
    fullName: input.fullName,
    avatarUrl: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    authProvider: "email",
    googleSub: `email:${email}`,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    lastSignedInAt: now,
  });

  const user = await users.findOne({ _id: insertResult.insertedId });

  if (!user) {
    throw new Error("FAILED_TO_CREATE_EMAIL_ACCOUNT");
  }

  return {
    userId: user._id.toHexString(),
    profile: mapProfile(user),
  };
}

export async function createMobileOtp(phone: string) {
  const { mobileOtps } = await getCollections();
  const latestRecord = await mobileOtps.findOne({ phone }, { sort: { createdAt: -1 } });

  if (latestRecord) {
    const elapsedMs = Date.now() - latestRecord.createdAt.getTime();

    if (elapsedMs < MOBILE_OTP_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((MOBILE_OTP_COOLDOWN_MS - elapsedMs) / 1000);
      throw new Error(`OTP_COOLDOWN:${retryAfterSeconds}`);
    }
  }

  const code = `${randomInt(0, 1000000)}`.padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 5);

  await mobileOtps.deleteMany({ phone });

  await mobileOtps.insertOne({
    phone,
    otpHash: hashOtpCode(phone, code),
    attempts: 0,
    createdAt: now,
    expiresAt,
  });

  return {
    code,
    expiresAt,
  };
}

export async function verifyMobileOtpCode(phone: string, code: string) {
  const { mobileOtps } = await getCollections();
  const record = await mobileOtps.findOne(
    { phone, consumedAt: { $exists: false } },
    { sort: { createdAt: -1 } },
  );

  if (!record) {
    return { ok: false as const, reason: "OTP_NOT_FOUND" as const };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: "OTP_EXPIRED" as const };
  }

  if (record.attempts >= 5) {
    return { ok: false as const, reason: "OTP_TOO_MANY_ATTEMPTS" as const };
  }

  if (record.otpHash !== hashOtpCode(phone, code)) {
    await mobileOtps.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { ok: false as const, reason: "OTP_INVALID" as const };
  }

  await mobileOtps.updateOne(
    { _id: record._id },
    {
      $set: {
        consumedAt: new Date(),
      },
    },
  );

  return { ok: true as const };
}

export async function upsertMobileAccount(input: { phone: string }) {
  const { users } = await getCollections();
  const now = new Date();
  const existingByPhone = await users.findOne({ phone: input.phone });

  if (existingByPhone) {
    await users.updateOne(
      { _id: existingByPhone._id },
      {
        $set: {
          lastSignedInAt: now,
          updatedAt: now,
        },
      },
    );

    const refreshedUser = await users.findOne({ _id: existingByPhone._id });

    if (!refreshedUser) {
      throw new Error("FAILED_TO_LOAD_MOBILE_ACCOUNT");
    }

    return {
      userId: refreshedUser._id.toHexString(),
      profile: mapProfile(refreshedUser),
    };
  }

  const syntheticEmail = `mobile.${input.phone.replace(/\D/g, "")}@firaangi.local`;

  await users.updateOne(
    { email: syntheticEmail },
    {
      $set: {
        email: syntheticEmail,
        fullName: "Firaangi Shopper",
        avatarUrl: "",
        phone: input.phone,
        authProvider: "mobile",
        googleSub: `mobile:${input.phone}`,
        updatedAt: now,
        lastSignedInAt: now,
      },
      $setOnInsert: {
        address: "",
        city: "",
        state: "",
        pinCode: "",
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const user = await users.findOne({ email: syntheticEmail });

  if (!user) {
    throw new Error("FAILED_TO_CREATE_MOBILE_ACCOUNT");
  }

  return {
    userId: user._id.toHexString(),
    profile: mapProfile(user),
  };
}

export async function authenticateEmailAccount(input: { email: string; password: string }) {
  const { users } = await getCollections();
  const email = normalizeEmail(input.email);
  const user = await users.findOne({ email });

  if (!user || user.authProvider !== "email" || !user.passwordHash) {
    return null;
  }

  if (!verifyPassword(input.password, user.passwordHash)) {
    return null;
  }

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        lastSignedInAt: new Date(),
      },
    },
  );

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

export async function saveShippingAddressForSessionToken(
  token: string,
  addr: {
    fullName?: string;
    address: string;
    city?: string;
    state: string;
    pinCode?: string;
  },
): Promise<void> {
  const { users, sessions } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });
  if (!session) return;
  const setFields: Record<string, unknown> = {
    address: addr.address,
    state: addr.state,
    updatedAt: new Date(),
  };
  if (addr.fullName) setFields.fullName = addr.fullName;
  if (addr.city) setFields.city = addr.city;
  if (addr.pinCode) setFields.pinCode = addr.pinCode;
  await users.updateOne({ _id: session.userId }, { $set: setFields });
}

export async function createPendingOrderForSessionToken(
  token: string,
  input: {
    orderId: string;
    totalAmount: number;
    currencyCode: string;
    paymentMethod?: "online" | "cod";
    items: AccountOrderItem[];
    shippingName?: string;
    shippingAddress?: string;
    shippingCity?: string;
    shippingState?: string;
    shippingPinCode?: string;
  },
) {
  const { sessions, orders } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return null;
  }

  const now = new Date();
  const isOnlinePayment = (input.paymentMethod ?? "online") === "online";
  const initialEvents = [
    { type: "created" as const, at: now, note: "Checkout order created" },
    { type: "reserved" as const, at: now, note: "Inventory reserved from cart" },
  ];

  await orders.updateOne(
    { orderId: input.orderId },
    {
      $set: {
        userId: session.userId,
        totalAmount: input.totalAmount,
        currencyCode: input.currencyCode,
        paymentMethod: input.paymentMethod ?? "online",
        paymentGateway: isOnlinePayment ? "razorpay" : undefined,
        paymentStatus: isOnlinePayment ? "created" : undefined,
        inventorySyncStatus: "pending",
        items: input.items,
        status: "pending",
        fulfillmentStatus: "unfulfilled",
        shippingName: input.shippingName,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingState: input.shippingState,
        shippingPinCode: input.shippingPinCode,
        events: initialEvents,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const document = await orders.findOne({ orderId: input.orderId });

  if (document) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: session.userId,
      type: "reserved",
      items: input.items,
      note: "Inventory reserved at checkout",
    });
  }

  return document ? mapOrder(document) : null;
}

export async function appendOrderEventByOrderId(input: { orderId: string; type: AccountOrderEvent["type"]; note?: string }) {
  const { orders } = await getCollections();
  const now = new Date();

  await orders.updateOne(
    { orderId: input.orderId },
    {
      $push: {
        events: {
          type: input.type,
          at: now,
          ...(input.note ? { note: input.note } : {}),
        },
      },
      $set: { updatedAt: now },
    },
  );

  const updated = await orders.findOne({ orderId: input.orderId });
  return updated ? mapOrder(updated) : null;
}

export async function updateInventorySyncStatusByOrderId(
  orderId: string,
  input: {
    status: NonNullable<AccountOrderDocument["inventorySyncStatus"]>;
    error?: string;
    attempts?: AccountInventorySyncAttempt[];
  },
) {
  const { orders } = await getCollections();
  const now = new Date();

  await orders.updateOne(
    { orderId },
    {
      $set: {
        inventorySyncStatus: input.status,
        inventorySyncError: input.error,
        inventorySyncAttempts: input.attempts,
        updatedAt: now,
      },
    },
  );

  const updated = await orders.findOne({ orderId });
  return updated ? mapOrder(updated) : null;
}

export async function recordInventoryMovementByOrderId(input: {
  orderId: string;
  userId: ObjectId;
  type: "reserved" | "committed" | "released" | "refunded";
  items: AccountOrderItem[];
  note?: string;
}) {
  const { inventoryMovements } = await getCollections();
  const now = new Date();

  await inventoryMovements.updateOne(
    { orderId: input.orderId, type: input.type },
    {
      $set: {
        orderId: input.orderId,
        userId: input.userId,
        type: input.type,
        items: input.items,
        note: input.note,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

async function updateOrderByOrderId(
  orderId: string,
  updates: Partial<Omit<AccountOrderDocument, "orderId" | "userId" | "createdAt">>,
) {
  const { orders } = await getCollections();
  const now = new Date();

  await orders.updateOne(
    { orderId },
    {
      $set: {
        ...updates,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
  );

  const updated = await orders.findOne({ orderId });
  return updated ? mapOrder(updated) : null;
}

export async function markOrderPaidByOrderId(input: {
  orderId: string;
  paymentId: string;
  paymentStatus?: "authorized" | "captured";
}) {
  const { orders } = await getCollections();
  const orderDocument = await orders.findOne({ orderId: input.orderId });
  const order = await updateOrderByOrderId(input.orderId, {
    status: "paid",
    paymentId: input.paymentId,
    paymentGateway: "razorpay",
    paymentStatus: input.paymentStatus ?? "captured",
    fulfillmentStatus: "processing",
  });

  if (orderDocument) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: orderDocument.userId,
      type: "committed",
      items: orderDocument.items,
      note: "Payment captured and inventory committed",
    });
  }

  await appendOrderEventByOrderId({
    orderId: input.orderId,
    type: input.paymentStatus === "authorized" ? "paid" : "committed",
    note: input.paymentStatus === "authorized" ? "Payment authorized" : "Payment captured and inventory committed",
  });

  return order;
}

export async function markOrderFailedByOrderId(input: { orderId: string; paymentId?: string }) {
  const { orders } = await getCollections();
  const orderDocument = await orders.findOne({ orderId: input.orderId });
  const order = await updateOrderByOrderId(input.orderId, {
    status: "failed",
    paymentId: input.paymentId,
    paymentGateway: "razorpay",
    paymentStatus: "failed",
    fulfillmentStatus: "cancelled",
  });

  if (orderDocument) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: orderDocument.userId,
      type: "released",
      items: orderDocument.items,
      note: "Payment failed and inventory released",
    });
  }

  await appendOrderEventByOrderId({
    orderId: input.orderId,
    type: "released",
    note: "Payment failed and inventory released",
  });

  return order;
}

export async function markOrderRefundedByOrderId(input: {
  orderId: string;
  paymentId?: string;
  refundId: string;
  refundAmount?: number;
}) {
  const { orders } = await getCollections();
  const orderDocument = await orders.findOne({ orderId: input.orderId });
  const order = await updateOrderByOrderId(input.orderId, {
    status: "cancelled",
    paymentId: input.paymentId,
    paymentGateway: "razorpay",
    paymentStatus: "refunded",
    refundId: input.refundId,
    refundAmount: input.refundAmount,
    refundedAt: new Date(),
    fulfillmentStatus: "cancelled",
  });

  if (orderDocument) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: orderDocument.userId,
      type: "refunded",
      items: orderDocument.items,
      note: "Refund processed and inventory released",
    });
  }

  await appendOrderEventByOrderId({
    orderId: input.orderId,
    type: "refunded",
    note: "Refund processed and inventory released",
  });

  return order;
}

export async function attachShopifySyncResultToOrder(input: {
  orderId: string;
  shopifyOrderId?: string;
  shopifySyncStatus: "synced" | "failed" | "skipped";
  shopifySyncError?: string;
}) {
  const order = await updateOrderByOrderId(input.orderId, {
    shopifyOrderId: input.shopifyOrderId,
    shopifySyncStatus: input.shopifySyncStatus,
    shopifySyncError: input.shopifySyncError,
  });

  if (input.shopifySyncStatus === "synced") {
    await appendOrderEventByOrderId({
      orderId: input.orderId,
      type: "synced",
      note: "Order synced to Shopify Admin",
    });
  }

  return order;
}

export async function markOrderPaidForSessionToken(token: string, input: { orderId: string; paymentId: string }) {
  const { sessions, orders } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return null;
  }

  const existingOrder = await orders.findOne({ orderId: input.orderId, userId: session.userId });

  await orders.updateOne(
    { orderId: input.orderId, userId: session.userId },
    {
      $set: {
        status: "paid",
        paymentId: input.paymentId,
        paymentGateway: "razorpay",
        paymentStatus: "captured",
        fulfillmentStatus: "processing",
        updatedAt: new Date(),
      },
    },
  );

  if (existingOrder) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: session.userId,
      type: "committed",
      items: existingOrder.items,
      note: "Payment captured and inventory committed",
    });
  }

  await appendOrderEventByOrderId({
    orderId: input.orderId,
    type: "committed",
    note: "Payment captured and inventory committed",
  });

  const updatedOrder = await orders.findOne({ orderId: input.orderId, userId: session.userId });
  return updatedOrder ? mapOrder(updatedOrder) : null;
}

export async function cancelOrderForSessionToken(token: string, input: { orderId: string; reason?: string }) {
  const { sessions, orders } = await getCollections();
  const session = await sessions.findOne({ tokenHash: hashSessionToken(token) });

  if (!session) {
    return { order: null, reason: "UNAUTHENTICATED" as const };
  }

  const existingOrder = await orders.findOne({ orderId: input.orderId, userId: session.userId });

  if (!existingOrder) {
    return { order: null, reason: "NOT_FOUND" as const };
  }

  if (existingOrder.status === "cancelled") {
    return { order: mapOrder(existingOrder), reason: "ALREADY_CANCELLED" as const };
  }

  if (existingOrder.status === "failed") {
    return { order: null, reason: "FAILED_ORDER" as const };
  }

  const cancellationWindowMs = ORDER_CANCELLATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const isEligible = Date.now() - existingOrder.createdAt.getTime() <= cancellationWindowMs;

  if (!isEligible) {
    return { order: null, reason: "WINDOW_EXPIRED" as const };
  }

  const now = new Date();

  await orders.updateOne(
    { orderId: input.orderId, userId: session.userId },
    {
      $set: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: input.reason?.trim() || "User requested cancellation",
        updatedAt: now,
      },
    },
  );

  if (existingOrder) {
    await recordInventoryMovementByOrderId({
      orderId: input.orderId,
      userId: session.userId,
      type: "released",
      items: existingOrder.items,
      note: "Order cancelled and inventory released",
    });
  }

  await appendOrderEventByOrderId({
    orderId: input.orderId,
    type: "released",
    note: "Order cancelled and inventory released",
  });

  const updatedOrder = await orders.findOne({ orderId: input.orderId, userId: session.userId });
  return { order: updatedOrder ? mapOrder(updatedOrder) : null, reason: null as null };
}

export async function findOrderForTracking(input: { orderId: string; email: string }) {
  const { users, orders } = await getCollections();
  const email = input.email.trim().toLowerCase();
  const orderId = input.orderId.trim();

  if (!email || !orderId) {
    return null;
  }

  const user = await users.findOne({ email });

  if (!user) {
    return null;
  }

  const order = await orders.findOne({ orderId, userId: user._id });
  return order ? mapOrder(order) : null;
}

export async function findOrderWithCustomerByOrderId(orderId: string): Promise<AccountOrderWithCustomer | null> {
  const { users, orders } = await getCollections();
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    return null;
  }

  const orderDocument = await orders.findOne({ orderId: normalizedOrderId });

  if (!orderDocument) {
    return null;
  }

  const customer = await users.findOne({ _id: orderDocument.userId });

  return {
    order: mapOrder(orderDocument),
    customer: customer
      ? {
          email: customer.email,
          fullName: customer.fullName,
        }
      : null,
  };
}

export async function findOrderWithCustomerByPaymentId(paymentId: string): Promise<AccountOrderWithCustomer | null> {
  const { users, orders } = await getCollections();
  const normalizedPaymentId = paymentId.trim();

  if (!normalizedPaymentId) {
    return null;
  }

  const orderDocument = await orders.findOne({ paymentId: normalizedPaymentId });

  if (!orderDocument) {
    return null;
  }

  const customer = await users.findOne({ _id: orderDocument.userId });

  return {
    order: mapOrder(orderDocument),
    customer: customer
      ? {
          email: customer.email,
          fullName: customer.fullName,
        }
      : null,
  };
}

export async function listOrdersForAdmin(limit = 100) {
  const { users, orders } = await getCollections();
  const documents = await orders.find({}, { sort: { createdAt: -1 }, limit: Math.min(Math.max(1, limit), 500) }).toArray();

  const userIds = Array.from(new Set(documents.map((document) => document.userId.toHexString()))).map(
    (id) => new ObjectId(id),
  );
  const usersById = new Map(
    (await users.find({ _id: { $in: userIds } }).toArray()).map((user) => [user._id.toHexString(), user]),
  );

  return documents.map((document) => {
    const mapped = mapOrder(document);
    const customer = usersById.get(document.userId.toHexString());

    return {
      ...mapped,
      customer: customer
        ? {
            email: customer.email,
            fullName: customer.fullName,
          }
        : null,
    };
  });
}

export async function updateOrderForAdmin(
  orderId: string,
  updates: Partial<{
    status: AccountOrderDocument["status"];
    paymentStatus: AccountOrderDocument["paymentStatus"];
    paymentId: string;
    refundId: string;
    refundAmount: number;
    shopifyOrderId: string;
    shopifySyncStatus: NonNullable<AccountOrderDocument["shopifySyncStatus"]>;
    shopifySyncError: string;
    fulfillmentStatus: NonNullable<AccountOrderDocument["fulfillmentStatus"]>;
    shippingCarrier: string;
    trackingNumber: string;
    trackingUrl: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    cancelReason: string;
  }>,
) {
  const { orders } = await getCollections();
  const now = new Date();
  const $set: Record<string, unknown> = { updatedAt: now };
  const $unset: Record<string, ""> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      continue;
    }

    if (key === "shippedAt" || key === "deliveredAt") {
      if (value === null || value === "") {
        $unset[key] = "";
      } else {
        const parsed = new Date(String(value));
        if (!Number.isNaN(parsed.getTime())) {
          $set[key] = parsed;
        }
      }
      continue;
    }

    $set[key] = value;
  }

  if (updates.status === "cancelled" && !$set.cancelledAt) {
    $set.cancelledAt = now;
  }

  await orders.updateOne({ orderId }, { $set, ...(Object.keys($unset).length > 0 ? { $unset } : {}) });
  const updated = await orders.findOne({ orderId });
  return updated ? mapOrder(updated) : null;
}

export async function applyShopifyFulfillmentWebhook(input: {
  shopifyOrderId: string;
  fulfillmentId?: string;
  status?: string;
  shipmentStatus?: string;
  trackingCompany?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  eventAt?: string;
}) {
  const { orders } = await getCollections();
  const idCandidates = buildShopifyOrderIdCandidates(input.shopifyOrderId);

  if (idCandidates.length === 0) {
    return { ok: false as const, reason: "invalid_shopify_order_id" as const };
  }

  const existing = await orders.findOne({ shopifyOrderId: { $in: idCandidates } });

  if (!existing) {
    return { ok: false as const, reason: "order_not_found" as const };
  }

  const status = (input.status ?? "").trim().toLowerCase();
  const shipmentStatus = (input.shipmentStatus ?? "").trim().toLowerCase();
  const eventTime = input.eventAt ? new Date(input.eventAt) : new Date();
  const resolvedEventTime = Number.isNaN(eventTime.getTime()) ? new Date() : eventTime;

  const trackingCompany = (input.trackingCompany ?? "").trim();
  const trackingNumber = (input.trackingNumber ?? "").trim();
  const trackingUrl = (input.trackingUrl ?? "").trim();

  let nextFulfillmentStatus: NonNullable<AccountOrderDocument["fulfillmentStatus"]> = "processing";

  if (status === "cancelled") {
    nextFulfillmentStatus = "cancelled";
  } else if (shipmentStatus === "delivered") {
    nextFulfillmentStatus = "fulfilled";
  } else if (existing.fulfillmentStatus === "fulfilled") {
    nextFulfillmentStatus = "fulfilled";
  }

  const $set: Record<string, unknown> = {
    updatedAt: new Date(),
    fulfillmentStatus: nextFulfillmentStatus,
  };

  if (trackingCompany) {
    $set.shippingCarrier = trackingCompany;
  }

  if (trackingNumber) {
    $set.trackingNumber = trackingNumber;
  }

  if (trackingUrl) {
    $set.trackingUrl = trackingUrl;
  }

  if (nextFulfillmentStatus !== "cancelled" && !existing.shippedAt) {
    $set.shippedAt = resolvedEventTime;
  }

  if (nextFulfillmentStatus === "fulfilled") {
    $set.deliveredAt = existing.deliveredAt ?? resolvedEventTime;
  }

  await orders.updateOne({ _id: existing._id }, { $set });

  if (nextFulfillmentStatus === "fulfilled" && existing.fulfillmentStatus !== "fulfilled") {
    await appendOrderEventByOrderId({
      orderId: existing.orderId,
      type: "fulfilled",
      note: trackingCompany
        ? `Shipment delivered via ${trackingCompany}${trackingNumber ? ` (${trackingNumber})` : ""}`
        : "Order delivered",
    });
  }

  if (nextFulfillmentStatus === "cancelled" && existing.fulfillmentStatus !== "cancelled") {
    await appendOrderEventByOrderId({
      orderId: existing.orderId,
      type: "cancelled",
      note: input.fulfillmentId ? `Shopify fulfillment ${input.fulfillmentId} was cancelled` : "Shopify fulfillment was cancelled",
    });
  }

  const updated = await orders.findOne({ _id: existing._id });

  return {
    ok: true as const,
    order: updated ? mapOrder(updated) : null,
    orderId: existing.orderId,
  };
}
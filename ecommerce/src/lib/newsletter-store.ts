import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MongoServerError } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { NewsletterInput } from "@/lib/newsletter";

const NEWSLETTER_COLLECTION_NAME = process.env.MONGODB_NEWSLETTER_COLLECTION ?? "newsletter_subscribers";
const NEWSLETTER_EMAIL_INDEX_NAME = "newsletter_email_unique";
const NEWSLETTER_FALLBACK_DIRECTORY = path.join(process.cwd(), ".data");
const NEWSLETTER_FALLBACK_FILE = path.join(NEWSLETTER_FALLBACK_DIRECTORY, "newsletter-subscribers.json");

type NewsletterDocument = {
  email: string;
  subscribedAt: Date;
};

export type NewsletterSubscriber = {
  email: string;
  subscribedAt: string;
};

export type NewsletterStorageSource = "mongo" | "fallback";

export type NewsletterListResult = {
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  storage: NewsletterStorageSource;
};

export type NewsletterDateRange = {
  from?: Date;
  to?: Date;
};

let ensureNewsletterIndexesPromise: Promise<void> | null = null;

function isMongoConnectionError(error: unknown) {
  const visited = new Set<unknown>();
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (typeof current === "object") {
      const withCode = current as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown[] };
      const code = typeof withCode.code === "string" ? withCode.code : "";
      const message = typeof withCode.message === "string" ? withCode.message : "";
      const combined = `${code} ${message}`.toLowerCase();

      if (
        combined.includes("econnrefused") ||
        combined.includes("enotfound") ||
        combined.includes("eai_again") ||
        combined.includes("querysrv") ||
        combined.includes("mongodb_uri is not configured") ||
        combined.includes("server selection")
      ) {
        return true;
      }

      if (withCode.cause) {
        stack.push(withCode.cause);
      }

      if (Array.isArray(withCode.errors)) {
        for (const nestedError of withCode.errors) {
          stack.push(nestedError);
        }
      }
    }
  }

  return false;
}

function isInDateRange(value: string, dateRange?: NewsletterDateRange) {
  if (!dateRange?.from && !dateRange?.to) {
    return true;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  if (dateRange.from && date < dateRange.from) {
    return false;
  }

  if (dateRange.to && date >= dateRange.to) {
    return false;
  }

  return true;
}

async function readFallbackSubscribers(): Promise<NewsletterSubscriber[]> {
  try {
    const fileText = await readFile(NEWSLETTER_FALLBACK_FILE, "utf-8");
    const parsed = JSON.parse(fileText) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is NewsletterSubscriber => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const candidate = item as { email?: unknown; subscribedAt?: unknown };
        return typeof candidate.email === "string" && typeof candidate.subscribedAt === "string";
      })
      .sort((left, right) => right.subscribedAt.localeCompare(left.subscribedAt));
  } catch (error) {
    const withCode = error as { code?: string };
    if (withCode.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeFallbackSubscribers(items: NewsletterSubscriber[]) {
  await mkdir(NEWSLETTER_FALLBACK_DIRECTORY, { recursive: true });
  await writeFile(NEWSLETTER_FALLBACK_FILE, JSON.stringify(items, null, 2), "utf-8");
}

async function saveFallbackSubscription(input: NewsletterInput) {
  const email = input.email.trim().toLowerCase();
  const subscribers = await readFallbackSubscribers();

  const duplicate = subscribers.some((subscriber) => subscriber.email.toLowerCase() === email);
  if (duplicate) {
    return { created: false as const };
  }

  const nextItems: NewsletterSubscriber[] = [
    {
      email,
      subscribedAt: new Date().toISOString(),
    },
    ...subscribers,
  ];

  await writeFallbackSubscribers(nextItems);
  return { created: true as const };
}

function paginateSubscribers(
  items: NewsletterSubscriber[],
  page: number,
  pageSize: number,
  storage: NewsletterStorageSource,
): NewsletterListResult {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    items: items.slice(skip, skip + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
    storage,
  };
}

async function listFallbackByDateRange(page: number, pageSize: number, dateRange?: NewsletterDateRange) {
  const subscribers = await readFallbackSubscribers();
  const filtered = subscribers.filter((subscriber) => isInDateRange(subscriber.subscribedAt, dateRange));
  return paginateSubscribers(filtered, page, pageSize, "fallback");
}

async function listFallbackForExport(limit: number, dateRange?: NewsletterDateRange) {
  const safeLimit = Math.min(Math.max(1, limit), 10000);
  const subscribers = await readFallbackSubscribers();
  return subscribers
    .filter((subscriber) => isInDateRange(subscriber.subscribedAt, dateRange))
    .slice(0, safeLimit);
}

async function getNewsletterCollection() {
  const db = await getMongoDb();
  const collection = db.collection<NewsletterDocument>(NEWSLETTER_COLLECTION_NAME);

  if (!ensureNewsletterIndexesPromise) {
    ensureNewsletterIndexesPromise = collection
      .createIndex({ email: 1 }, { name: NEWSLETTER_EMAIL_INDEX_NAME, unique: true })
      .then(() => undefined)
      .catch((error) => {
        ensureNewsletterIndexesPromise = null;
        throw error;
      });
  }

  await ensureNewsletterIndexesPromise;
  return collection;
}

export async function saveNewsletterSubscription(input: NewsletterInput) {
  try {
    const collection = await getNewsletterCollection();

    try {
      await collection.insertOne({
        email: input.email,
        subscribedAt: new Date(),
      });

      return { created: true as const };
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return { created: false as const };
      }

      throw error;
    }
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return saveFallbackSubscription(input);
    }

    throw error;
  }
}

export async function listNewsletterSubscriptions(page: number, pageSize: number): Promise<NewsletterListResult> {
  return listNewsletterSubscriptionsByDateRange(page, pageSize);
}

function buildDateFilter(dateRange?: NewsletterDateRange) {
  if (!dateRange?.from && !dateRange?.to) {
    return {};
  }

  return {
    subscribedAt: {
      ...(dateRange.from ? { $gte: dateRange.from } : {}),
      ...(dateRange.to ? { $lt: dateRange.to } : {}),
    },
  };
}

export async function listNewsletterSubscriptionsByDateRange(
  page: number,
  pageSize: number,
  dateRange?: NewsletterDateRange,
): Promise<NewsletterListResult> {
  try {
    const collection = await getNewsletterCollection();
    const dateFilter = buildDateFilter(dateRange);

    const total = await collection.countDocuments(dateFilter);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const skip = (safePage - 1) * pageSize;

    const documents = await collection
      .find(dateFilter, { sort: { subscribedAt: -1 }, skip, limit: pageSize })
      .toArray();

    return {
      items: documents.map((document) => ({
        email: document.email,
        subscribedAt:
          document.subscribedAt instanceof Date
            ? document.subscribedAt.toISOString()
            : new Date(document.subscribedAt).toISOString(),
      })),
      total,
      page: safePage,
      pageSize,
      totalPages,
      storage: "mongo",
    };
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return listFallbackByDateRange(page, pageSize, dateRange);
    }

    throw error;
  }
}

export async function listNewsletterSubscriptionsForExport(
  limit: number,
  dateRange?: NewsletterDateRange,
): Promise<NewsletterSubscriber[]> {
  try {
    const collection = await getNewsletterCollection();
    const safeLimit = Math.min(Math.max(1, limit), 10000);
    const dateFilter = buildDateFilter(dateRange);

    const documents = await collection
      .find(dateFilter, { sort: { subscribedAt: -1 }, limit: safeLimit })
      .toArray();

    return documents.map((document) => ({
      email: document.email,
      subscribedAt:
        document.subscribedAt instanceof Date
          ? document.subscribedAt.toISOString()
          : new Date(document.subscribedAt).toISOString(),
    }));
  } catch (error) {
    if (isMongoConnectionError(error)) {
      return listFallbackForExport(limit, dateRange);
    }

    throw error;
  }
}

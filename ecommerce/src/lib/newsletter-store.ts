import { MongoServerError } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";
import type { NewsletterInput } from "@/lib/newsletter";

const NEWSLETTER_COLLECTION_NAME = process.env.MONGODB_NEWSLETTER_COLLECTION ?? "newsletter_subscribers";
const NEWSLETTER_EMAIL_INDEX_NAME = "newsletter_email_unique";

type NewsletterDocument = {
  email: string;
  subscribedAt: Date;
};

export type NewsletterSubscriber = {
  email: string;
  subscribedAt: string;
};

export type NewsletterListResult = {
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type NewsletterDateRange = {
  from?: Date;
  to?: Date;
};

let ensureNewsletterIndexesPromise: Promise<void> | null = null;

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
}

export async function listNewsletterSubscriptions(page: number, pageSize: number): Promise<NewsletterListResult> {
  const collection = await getNewsletterCollection();
  const total = await collection.countDocuments();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  const documents = await collection
    .find({}, { sort: { subscribedAt: -1 }, skip, limit: pageSize })
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
  };
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
  };
}

export async function listNewsletterSubscriptionsForExport(
  limit: number,
  dateRange?: NewsletterDateRange,
): Promise<NewsletterSubscriber[]> {
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
}

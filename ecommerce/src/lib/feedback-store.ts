import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WithId } from "mongodb";
import type { FeedbackInput } from "@/lib/feedback";
import { getMongoDb } from "@/lib/mongodb";

export type StoredFeedback = FeedbackInput & {
  id: string;
  submittedAt: string;
};

export type FeedbackStorageSource = "mongo" | "fallback";

export type FeedbackListResult = {
  items: StoredFeedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  storage: FeedbackStorageSource;
};

type FeedbackDocument = FeedbackInput & {
  submittedAt: Date;
};

const FEEDBACK_COLLECTION_NAME = process.env.MONGODB_FEEDBACK_COLLECTION ?? "feedback";
const FEEDBACK_FALLBACK_DIRECTORY = path.join(process.cwd(), ".data");
const FEEDBACK_FALLBACK_FILE = path.join(FEEDBACK_FALLBACK_DIRECTORY, "feedback.json");
let ensureFeedbackIndexesPromise: Promise<void> | null = null;

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

function mapDocumentToStoredFeedback(document: WithId<FeedbackDocument>): StoredFeedback {
  return {
    id: document._id.toHexString(),
    name: document.name ?? "",
    email: document.email ?? "",
    message: document.message,
    submittedAt:
      document.submittedAt instanceof Date
        ? document.submittedAt.toISOString()
        : new Date(document.submittedAt).toISOString(),
  };
}

async function getFeedbackCollection() {
  const db = await getMongoDb();
  const collection = db.collection<FeedbackDocument>(FEEDBACK_COLLECTION_NAME);

  if (!ensureFeedbackIndexesPromise) {
    ensureFeedbackIndexesPromise = collection
      .createIndex({ submittedAt: -1 }, { name: "feedback_submittedAt_desc" })
      .then(() => undefined)
      .catch((error) => {
        ensureFeedbackIndexesPromise = null;
        throw error;
      });
  }

  await ensureFeedbackIndexesPromise;
  return collection;
}

async function readFallbackFeedback(): Promise<StoredFeedback[]> {
  try {
    const fileText = await readFile(FEEDBACK_FALLBACK_FILE, "utf-8");
    const parsed = JSON.parse(fileText) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is StoredFeedback => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const candidate = item as Record<string, unknown>;

        return (
          typeof candidate.id === "string" &&
          typeof candidate.message === "string" &&
          typeof candidate.submittedAt === "string" &&
          (typeof candidate.name === "string" || typeof candidate.name === "undefined") &&
          (typeof candidate.email === "string" || typeof candidate.email === "undefined")
        );
      })
      .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
  } catch (error) {
    const withCode = error as { code?: string };
    if (withCode.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeFallbackFeedback(items: StoredFeedback[]) {
  await mkdir(FEEDBACK_FALLBACK_DIRECTORY, { recursive: true });
  await writeFile(FEEDBACK_FALLBACK_FILE, JSON.stringify(items, null, 2), "utf-8");
}

function paginateFeedback(
  items: StoredFeedback[],
  page: number,
  pageSize: number,
  storage: FeedbackStorageSource,
): FeedbackListResult {
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

export async function saveFeedback(input: FeedbackInput) {
  try {
    const collection = await getFeedbackCollection();
    const submittedAt = new Date();
    const insertResult = await collection.insertOne({
      ...input,
      submittedAt,
    });

    const record: StoredFeedback = {
      ...input,
      id: insertResult.insertedId.toHexString(),
      submittedAt: submittedAt.toISOString(),
    };

    return record;
  } catch (error) {
    if (!isMongoConnectionError(error)) {
      throw error;
    }

    const record: StoredFeedback = {
      ...input,
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
    };

    const existingItems = await readFallbackFeedback();
    await writeFallbackFeedback([record, ...existingItems]);
    return record;
  }
}

export async function listFeedback(page: number, pageSize: number): Promise<FeedbackListResult> {
  try {
    const collection = await getFeedbackCollection();

    const total = await collection.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const skip = (safePage - 1) * pageSize;

    const documents = await collection
      .find({}, { sort: { submittedAt: -1 }, skip, limit: pageSize })
      .toArray();

    return {
      items: documents.map((document) => mapDocumentToStoredFeedback(document)),
      total,
      page: safePage,
      pageSize,
      totalPages,
      storage: "mongo",
    };
  } catch (error) {
    if (!isMongoConnectionError(error)) {
      throw error;
    }

    const items = await readFallbackFeedback();
    return paginateFeedback(items, page, pageSize, "fallback");
  }
}

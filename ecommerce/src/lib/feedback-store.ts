import { ObjectId } from "mongodb";
import type { FeedbackInput } from "@/lib/feedback";
import { getMongoDb } from "@/lib/mongodb";

export type StoredFeedback = FeedbackInput & {
  id: string;
  submittedAt: string;
};

export type FeedbackListResult = {
  items: StoredFeedback[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FeedbackDocument = FeedbackInput & {
  _id: ObjectId;
  submittedAt: Date;
};

const FEEDBACK_COLLECTION_NAME = process.env.MONGODB_FEEDBACK_COLLECTION ?? "feedback";
let ensureFeedbackIndexesPromise: Promise<void> | null = null;

function mapDocumentToStoredFeedback(document: FeedbackDocument): StoredFeedback {
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

export async function saveFeedback(input: FeedbackInput) {
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
}

export async function listFeedback(page: number, pageSize: number): Promise<FeedbackListResult> {
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
  };
}

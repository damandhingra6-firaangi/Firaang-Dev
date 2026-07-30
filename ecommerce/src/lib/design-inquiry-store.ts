import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WithId } from "mongodb";
import type { DesignInquiryInput } from "@/lib/design-inquiry";
import { getMongoDb } from "@/lib/mongodb";

const INQUIRY_COLLECTION_NAME = process.env.MONGODB_DESIGN_INQUIRY_COLLECTION ?? "design_inquiries";
const INQUIRY_FALLBACK_DIRECTORY = path.join(process.cwd(), ".data");
const INQUIRY_FALLBACK_FILE = path.join(INQUIRY_FALLBACK_DIRECTORY, "design-inquiries.json");

export type StoredDesignInquiry = DesignInquiryInput & {
  id: string;
  submittedAt: string;
};

export type DesignInquiryStorageSource = "mongo" | "fallback";

export type SaveDesignInquiryResult = {
  record: StoredDesignInquiry;
  storage: DesignInquiryStorageSource;
};

type InquiryDocument = DesignInquiryInput & {
  submittedAt: Date;
};

function isMongoConnectionError(error: unknown): boolean {
  const visited = new Set<unknown>();
  const stack: unknown[] = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (typeof current === "object") {
      const withCode = current as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown[] };
      const combined = `${withCode.code ?? ""} ${withCode.message ?? ""}`.toLowerCase();
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
      if (withCode.cause) stack.push(withCode.cause);
      if (Array.isArray(withCode.errors)) {
        for (const nested of withCode.errors) stack.push(nested);
      }
    }
  }
  return false;
}

async function readFallbackInquiries(): Promise<StoredDesignInquiry[]> {
  try {
    const raw = await readFile(INQUIRY_FALLBACK_FILE, "utf-8");
    return JSON.parse(raw) as StoredDesignInquiry[];
  } catch {
    return [];
  }
}

async function writeFallbackInquiries(items: StoredDesignInquiry[]): Promise<void> {
  await mkdir(INQUIRY_FALLBACK_DIRECTORY, { recursive: true });
  await writeFile(INQUIRY_FALLBACK_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function saveDesignInquiry(input: DesignInquiryInput): Promise<SaveDesignInquiryResult> {
  const id = randomUUID();
  const submittedAt = new Date();

  const record: StoredDesignInquiry = {
    ...input,
    id,
    submittedAt: submittedAt.toISOString(),
  };

  try {
    const db = await getMongoDb();
    const collection = db.collection<InquiryDocument>(INQUIRY_COLLECTION_NAME);

    await collection.insertOne({
      ...input,
      submittedAt,
    } as WithId<InquiryDocument> & { _id?: unknown });

    return { record, storage: "mongo" };
  } catch (error) {
    if (!isMongoConnectionError(error)) {
      console.error("MongoDB design inquiry insert error:", error);
    }

    // Fallback to filesystem
    const existing = await readFallbackInquiries();
    existing.unshift(record);
    await writeFallbackInquiries(existing);
    return { record, storage: "fallback" };
  }
}

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const productReviewSchema = z.object({
  productId: z.string().trim().min(1),
  productHandle: z.string().trim().min(1),
  productName: z.string().trim().min(1).max(200),
  reviewerName: z.string().trim().max(120).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(800),
  verifiedPurchase: z.boolean().optional(),
});

export type ProductReviewInput = z.infer<typeof productReviewSchema>;

export type ProductReviewRecord = ProductReviewInput & {
  id: string;
  createdAt: string;
};

const REVIEWS_FILE = path.join(process.cwd(), ".data", "product-reviews.json");

async function readRecords(): Promise<ProductReviewRecord[]> {
  try {
    const fileText = await readFile(REVIEWS_FILE, "utf-8");
    const parsed = JSON.parse(fileText) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ProductReviewRecord => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Record<string, unknown>;

      return (
        typeof candidate.id === "string" &&
        typeof candidate.productId === "string" &&
        typeof candidate.productHandle === "string" &&
        typeof candidate.productName === "string" &&
        typeof candidate.rating === "number" &&
        typeof candidate.message === "string" &&
        typeof candidate.createdAt === "string"
      );
    });
  } catch (error) {
    const withCode = error as { code?: string };

    if (withCode.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeRecords(records: ProductReviewRecord[]) {
  await mkdir(path.dirname(REVIEWS_FILE), { recursive: true });
  await writeFile(REVIEWS_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export async function listProductReviews(productKey: string) {
  const normalized = productKey.trim().toLowerCase();
  const records = await readRecords();

  return records
    .filter((record) => record.productId.toLowerCase() === normalized || record.productHandle.toLowerCase() === normalized)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function saveProductReview(input: ProductReviewInput): Promise<ProductReviewRecord> {
  const record: ProductReviewRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  const existing = await readRecords();
  await writeRecords([record, ...existing]);
  return record;
}
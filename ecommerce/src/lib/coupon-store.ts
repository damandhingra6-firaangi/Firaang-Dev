import { ObjectId } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

const COUPONS_COLLECTION_NAME = process.env.MONGODB_COUPONS_COLLECTION ?? "coupons";

export type CouponDefinition = {
  code: string;
  label: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal: number;
  maxDiscountAmount?: number;
};

type CouponDocument = CouponDefinition & {
  _id: ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CouponRecord = CouponDefinition & {
  id: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

let ensureCouponIndexPromise: Promise<void> | null = null;

function mapCoupon(doc: CouponDocument): CouponRecord {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    label: doc.label,
    description: doc.description,
    type: doc.type,
    value: doc.value,
    minSubtotal: doc.minSubtotal,
    maxDiscountAmount: doc.maxDiscountAmount,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function getCouponsCollection() {
  const db = await getMongoDb();
  const coupons = db.collection<CouponDocument>(COUPONS_COLLECTION_NAME);

  if (!ensureCouponIndexPromise) {
    ensureCouponIndexPromise = coupons
      .createIndex({ code: 1 }, { name: "coupon_code_unique", unique: true })
      .then(() => undefined)
      .catch((error) => {
        ensureCouponIndexPromise = null;
        throw error;
      });
  }

  await ensureCouponIndexPromise;
  return coupons;
}

export async function listCoupons(): Promise<CouponRecord[]> {
  const coupons = await getCouponsCollection();
  const docs = await coupons.find({}, { sort: { createdAt: -1 } }).toArray();
  return docs.map(mapCoupon);
}

export async function getActiveCouponByCode(code: string): Promise<CouponRecord | null> {
  const coupons = await getCouponsCollection();
  const normalized = code.trim().toUpperCase();
  const doc = await coupons.findOne({ code: normalized, isActive: true });
  return doc ? mapCoupon(doc) : null;
}

export async function createCoupon(input: CouponDefinition): Promise<CouponRecord> {
  const coupons = await getCouponsCollection();
  const now = new Date();
  const doc: CouponDocument = {
    _id: new ObjectId(),
    code: input.code.trim().toUpperCase(),
    label: input.label.trim(),
    description: input.description.trim(),
    type: input.type,
    value: input.value,
    minSubtotal: input.minSubtotal,
    maxDiscountAmount: input.maxDiscountAmount,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await coupons.insertOne(doc);
  return mapCoupon(doc);
}

export async function updateCoupon(
  id: string,
  input: Partial<Omit<CouponRecord, "id" | "createdAt" | "updatedAt">>,
): Promise<CouponRecord | null> {
  const coupons = await getCouponsCollection();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return null;
  }

  const now = new Date();
  const updateFields: Partial<CouponDocument & { updatedAt: Date }> = { updatedAt: now };
  if (input.code !== undefined) updateFields.code = input.code.trim().toUpperCase();
  if (input.label !== undefined) updateFields.label = input.label.trim();
  if (input.description !== undefined) updateFields.description = input.description.trim();
  if (input.type !== undefined) updateFields.type = input.type;
  if (input.value !== undefined) updateFields.value = input.value;
  if (input.minSubtotal !== undefined) updateFields.minSubtotal = input.minSubtotal;
  if (input.maxDiscountAmount !== undefined) updateFields.maxDiscountAmount = input.maxDiscountAmount;
  if (input.isActive !== undefined) updateFields.isActive = input.isActive;

  await coupons.updateOne({ _id: oid }, { $set: updateFields });
  const updated = await coupons.findOne({ _id: oid });
  return updated ? mapCoupon(updated) : null;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const coupons = await getCouponsCollection();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return false;
  }
  const result = await coupons.deleteOne({ _id: oid });
  return result.deletedCount > 0;
}

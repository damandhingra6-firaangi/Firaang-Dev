#!/usr/bin/env node

/**
 * Test Coupon Creation Script
 * Creates TEST100 - a 100% discount coupon for admin testing
 * 
 * Usage:
 *   node scripts/create-test-coupon.mjs
 */

import { MongoClient } from "mongodb";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnvPkg from "@next/env";

const { loadEnvConfig } = nextEnvPkg;

const scriptFilePath = fileURLToPath(import.meta.url);
const scriptDirPath = path.dirname(scriptFilePath);
const projectRoot = path.resolve(scriptDirPath, "..");

// Load .env.local / .env so this script behaves like Next.js runtime config.
loadEnvConfig(projectRoot);

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "Firaang";
const COUPONS_COLLECTION_NAME = process.env.MONGODB_COUPONS_COLLECTION || "coupons";

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set.");
  console.error("Checked project env files from:", projectRoot);
  process.exit(1);
}

async function createTestCoupon() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(MONGODB_DB_NAME);
    const couponsCollection = db.collection(COUPONS_COLLECTION_NAME);

    // Create unique index on code
    await couponsCollection.createIndex({ code: 1 }, { unique: true }).catch(() => {
      // Index might already exist
    });

    const testCoupon = {
      code: "TEST100",
      label: "100% Test Discount",
      description: "Admin testing only - 100% discount on all orders",
      type: "percentage",
      value: 100,
      minSubtotal: 0,
      maxDiscountAmount: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Try to insert or update
    const result = await couponsCollection.updateOne(
      { code: "TEST100" },
      { $set: testCoupon },
      { upsert: true }
    );

    if (result.upsertedId) {
      console.log("Created TEST100 coupon (ID: " + result.upsertedId + ")");
    } else if (result.modifiedCount > 0) {
      console.log("Updated existing TEST100 coupon");
    } else {
      console.log("TEST100 coupon already exists (no changes)");
    }

    // Verify the coupon
    const created = await couponsCollection.findOne({ code: "TEST100" });
    if (created) {
      console.log("\nCoupon details:");
      console.log(`  Code: ${created.code}`);
      console.log(`  Label: ${created.label}`);
      console.log(`  Type: ${created.type}`);
      console.log(`  Value: ${created.value}%`);
      console.log(`  Min Subtotal: ₹${created.minSubtotal}`);
      console.log(`  Active: ${created.isActive}`);
      console.log(`  Created: ${created.createdAt.toISOString()}`);
    }

    console.log("\nTo test the coupon:");
    console.log("  1. Place a test order at /checkout");
    console.log("  2. Enter coupon code: TEST100");
    console.log("  3. Full order amount should be discounted (100% off)");
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createTestCoupon();

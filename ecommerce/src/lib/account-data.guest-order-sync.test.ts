import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

const mongoMocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  users: {
    createIndex: vi.fn(),
    indexes: vi.fn(),
    findOne: vi.fn(),
  },
  orders: {
    createIndex: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
  sessions: { createIndex: vi.fn() },
  mobileOtps: { createIndex: vi.fn() },
  inventoryMovements: { createIndex: vi.fn() },
}));

vi.mock("@/lib/mongodb", () => ({
  getMongoDb: mongoMocks.getMongoDb,
}));

describe("guest order synchronization", () => {
  const accountId = new ObjectId();
  const account = {
    _id: accountId,
    email: "Customer@Example.com",
    emailVerified: true,
    authProvider: "google" as const,
    fullName: "Customer",
    googleSub: "google-sub",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedInAt: new Date(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mongoMocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === "users") return mongoMocks.users;
        if (name === "orders") return mongoMocks.orders;
        if (name === "account_sessions") return mongoMocks.sessions;
        if (name === "account_mobile_otps") return mongoMocks.mobileOtps;
        return mongoMocks.inventoryMovements;
      },
    });
    mongoMocks.users.indexes.mockResolvedValue([]);
    mongoMocks.users.createIndex.mockResolvedValue("index");
    mongoMocks.orders.createIndex.mockResolvedValue("index");
    mongoMocks.orders.findOne.mockResolvedValue(null);
    mongoMocks.sessions.createIndex.mockResolvedValue("index");
    mongoMocks.mobileOtps.createIndex.mockResolvedValue("index");
    mongoMocks.inventoryMovements.createIndex.mockResolvedValue("index");
    mongoMocks.users.findOne.mockImplementation(({ _id }: { _id?: ObjectId }) => {
      if (_id?.equals(accountId)) return Promise.resolve(account);
      return Promise.resolve(null);
    });
    mongoMocks.orders.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("links normalized email matches to the verified account without requiring signup", async () => {
    const guestOrder = {
      _id: new ObjectId(),
      orderId: "order_guest",
      shippingEmail: "CUSTOMER@example.com",
      events: [{ type: "created", at: new Date(), note: "Guest checkout order created" }],
    };
    mongoMocks.orders.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([guestOrder]),
    });

    const { syncGuestOrdersWithUser } = await import("./account-data");
    const result = await syncGuestOrdersWithUser(accountId.toHexString());

    expect(result).toEqual({ linkedCount: 1, skippedUnverified: false });
    expect(mongoMocks.orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: guestOrder._id,
        userId: { $exists: false },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          userId: accountId,
          customerEmailNormalized: "customer@example.com",
        }),
      }),
    );
    expect(mongoMocks.orders.find.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        $and: expect.arrayContaining([
          expect.objectContaining({
            $or: expect.arrayContaining([
              { customerEmailNormalized: "customer@example.com" },
              { shippingEmail: { $regex: "^customer@example\\.com$", $options: "i" } },
            ]),
          }),
        ]),
      }),
    );
  });

  it("creates guest orders without assigning a synthetic account id", async () => {
    const { createGuestOrder } = await import("./account-data");
    await createGuestOrder({
      orderId: "order_new_guest",
      totalAmount: 1299,
      currencyCode: "INR",
      shippingEmail: " Customer@Example.com ",
      items: [],
    });

    expect(mongoMocks.orders.updateOne).toHaveBeenCalledWith(
      { orderId: "order_new_guest" },
      expect.objectContaining({
        $set: expect.not.objectContaining({
          userId: expect.anything(),
        }),
        $setOnInsert: expect.objectContaining({ createdAt: expect.any(Date) }),
      }),
      { upsert: true },
    );
    expect(mongoMocks.orders.updateOne.mock.calls[0][1].$set).toEqual(
      expect.objectContaining({ customerEmailNormalized: "customer@example.com" }),
    );
  });

  it("migrates only legacy guest orders whose synthetic owner no longer exists", async () => {
    const syntheticOwnerId = new ObjectId();
    const legacyGuestOrder = {
      _id: new ObjectId(),
      orderId: "order_legacy_guest",
      userId: syntheticOwnerId,
      shippingEmail: "customer@example.com",
      events: [{ type: "created", at: new Date(), note: "Guest checkout order created" }],
    };
    mongoMocks.orders.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([legacyGuestOrder]),
    });

    const { syncGuestOrdersWithUser } = await import("./account-data");
    const result = await syncGuestOrdersWithUser(accountId.toHexString());

    expect(result).toEqual({ linkedCount: 1, skippedUnverified: false });
    expect(mongoMocks.orders.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: legacyGuestOrder._id,
        userId: syntheticOwnerId,
        events: { $elemMatch: { note: "Guest checkout order created" } },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ userId: accountId }),
      }),
    );
  });

  it("does not search or link orders for an unverified email", async () => {
    mongoMocks.users.findOne.mockResolvedValueOnce({
      ...account,
      emailVerified: false,
      authProvider: "credentials",
    });

    const { syncGuestOrdersWithUser } = await import("./account-data");
    const result = await syncGuestOrdersWithUser(accountId.toHexString());

    expect(result).toEqual({ linkedCount: 0, skippedUnverified: true });
    expect(mongoMocks.orders.find).not.toHaveBeenCalled();
    expect(mongoMocks.orders.updateOne).not.toHaveBeenCalled();
  });

  it("does not overwrite an order owned by another registered user", async () => {
    const otherOwnerId = new ObjectId();
    const ownedGuestOrder = {
      _id: new ObjectId(),
      orderId: "order_already_owned",
      userId: otherOwnerId,
      customerEmailNormalized: "customer@example.com",
      events: [{ type: "created", at: new Date(), note: "Guest checkout order created" }],
    };
    mongoMocks.users.findOne.mockImplementation(({ _id }: { _id?: ObjectId }) => {
      if (_id?.equals(accountId)) return Promise.resolve(account);
      if (_id?.equals(otherOwnerId)) return Promise.resolve({ _id: otherOwnerId });
      return Promise.resolve(null);
    });
    mongoMocks.orders.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([ownedGuestOrder]),
    });

    const { syncGuestOrdersWithUser } = await import("./account-data");
    const result = await syncGuestOrdersWithUser(accountId.toHexString());

    expect(result).toEqual({ linkedCount: 0, skippedUnverified: false });
    expect(mongoMocks.orders.updateOne).not.toHaveBeenCalled();
  });
});

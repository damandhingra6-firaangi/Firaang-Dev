# TEST100 Coupon Setup Guide

## Option 1: Using the Script (Recommended)

This script will create a 100% discount test coupon in your MongoDB database.

### Prerequisites
- MongoDB connection configured with `MONGODB_URI` env var
- Local environment variables set (`.env.local`)

### Run the script:

```bash
node scripts/create-test-coupon.mjs
```

Expected output:
```
✓ Connected to MongoDB
✅ Created TEST100 coupon (ID: ...)

Coupon details:
  Code: TEST100
  Label: 100% Test Discount
  Description: Admin testing only - 100% discount on all orders
  Type: percentage
  Value: 100%
  Min Subtotal: ₹0
  Active: true
  Created: 2026-06-01T...

📝 To test the coupon:
  1. Place a test order at /checkout
  2. Enter coupon code: TEST100
  3. Full order amount should be discounted (100% off)
```

---

## Option 2: Using the API

Create the coupon via HTTP POST request:

### Request:
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST100",
    "label": "100% Test Discount",
    "description": "Admin testing only - 100% discount on all orders",
    "type": "percentage",
    "value": 100,
    "minSubtotal": 0
  }'
```

### Response (201):
```json
{
  "coupon": {
    "id": "60d5ec49c1234567890abcde",
    "code": "TEST100",
    "label": "100% Test Discount",
    "description": "Admin testing only - 100% discount on all orders",
    "type": "percentage",
    "value": 100,
    "minSubtotal": 0,
    "isActive": true,
    "createdAt": "2026-06-01T12:00:00.000Z",
    "updatedAt": "2026-06-01T12:00:00.000Z"
  }
}
```

---

## Testing the Coupon

### Frontend:
1. Go to `/checkout`
2. Add items to cart
3. In the checkout form, find the coupon code field
4. Enter: `TEST100`
5. The discount should apply instantly showing 100% off

### Backend:
Test the validation endpoint directly:

```bash
curl -X POST http://localhost:3000/api/coupons/validate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST100",
    "subtotalAmount": 1000
  }'
```

Response:
```json
{
  "valid": true,
  "coupon": {
    "code": "TEST100",
    "label": "100% Test Discount",
    "description": "Admin testing only - 100% discount on all orders",
    "discountAmount": 1000
  },
  "message": "TEST100 applied — you save ₹1000"
}
```

---

## Coupon Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `code` | `TEST100` | Unique identifier (case-insensitive) |
| `label` | 100% Test Discount | Display name |
| `description` | Admin testing only... | User-facing description |
| `type` | percentage | Discount type (percentage or fixed) |
| `value` | 100 | 100% discount |
| `minSubtotal` | 0 | Applies to all orders (₹0+) |
| `isActive` | true | Coupon is active |

---

## Disable the Coupon

When you're done testing, disable it:

```bash
curl -X PATCH http://localhost:3000/api/coupons/{id} \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

Or delete it:

```bash
curl -X DELETE http://localhost:3000/api/coupons/{id}
```

---

## Troubleshooting

### Coupon says "not valid or has expired"
- Check that `isActive: true` in the database
- Verify the code matches exactly (TEST100)
- Check minSubtotal requirement

### Discount not showing 100%
- Verify `type: "percentage"` and `value: 100`
- Check that no `maxDiscountAmount` cap is set (should be undefined)

### MongoDB connection error
- Verify `MONGODB_URI` is set in your environment
- Check MongoDB is accessible from your machine
- Verify connection string format

export const ORDER_CANCELLATION_WINDOW_DAYS = 7;
export const COD_FLAT_FEE_UPTO_2000_INR = 50;
export const COD_PERCENTAGE_ABOVE_2000 = 2.5;
export const DEFAULT_ITEM_WEIGHT_KG = 0.5;
export const HIGH_LOGISTICS_SURCHARGE_INR = 25;

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Chandigarh",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
] as const;

export type ShippingMethod = "surface" | "air";

type AppliedCheckoutCoupon = {
  code: string;
  label: string;
  description: string;
};

export type CheckoutPricingSummary = {
  subtotalAmount: number;
  shippingFee: number;
  shippingLabel: string;
  shippingStatus: "pending" | "resolved";
  normalizedShippingState: string;
  orderWeightKg: number;
  shippingMethod: ShippingMethod;
  baseShippingFee: number;
  regionSurchargeFee: number;
  discountAmount: number;
  codFee: number;
  totalAmount: number;
  appliedCoupon: AppliedCheckoutCoupon | null;
  couponStatus: "none" | "applied";
  couponMessage: string | null;
};

const HIGH_LOGISTICS_STATES = [
  "Andaman and Nicobar Islands",
  "Arunachal Pradesh",
  "Assam",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Sikkim",
  "Tripura",
] as const;

function normalizeTextToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

export function normalizeShippingState(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function roundWeight(value: number) {
  return Math.max(0, Math.round(value * 1000) / 1000);
}

function ceilPositive(value: number) {
  if (value <= 0) {
    return 0;
  }
  return Math.ceil(value - 1e-9);
}

export function calculateSurfaceShippingFee(weightKg: number) {
  const w = roundWeight(weightKg);

  if (w <= 0) return 0;
  if (w <= 0.5) return 65;
  if (w <= 1) return 95;
  if (w <= 2) return 126;
  if (w <= 3) return 170;
  if (w <= 4) return 214;
  if (w <= 5) return 223;
  if (w < 9) return 223 + 44 * ceilPositive(w - 5);
  if (w <= 10) return 356;
  if (w < 19) return 356 + 38 * ceilPositive(w - 10);
  if (w <= 20) return 652;
  return 652 + 34 * ceilPositive(w - 20);
}

export function calculateAirShippingFee(weightKg: number) {
  const w = roundWeight(weightKg);

  if (w <= 0) return 0;
  if (w <= 0.5) return 75;
  return 75 + 65 * ceilPositive(w - 0.5);
}

export function calculateCodFee(orderValueInr: number) {
  const value = Math.max(0, Math.round(orderValueInr));
  if (value <= 2000) {
    return COD_FLAT_FEE_UPTO_2000_INR;
  }
  return Math.round((value * COD_PERCENTAGE_ABOVE_2000) / 100);
}

export function isHighLogisticsState(state: string) {
  const normalizedState = normalizeTextToken(state);
  return HIGH_LOGISTICS_STATES.some((entry) => normalizeTextToken(entry) === normalizedState);
}

export function calculateShippingFee(input: {
  orderWeightKg: number;
  shippingMethod?: ShippingMethod;
  shippingState?: string;
}) {
  const shippingMethod: ShippingMethod = input.shippingMethod ?? "surface";
  const normalizedShippingState = normalizeShippingState(input.shippingState ?? "");
  const orderWeightKg = roundWeight(input.orderWeightKg);

  const baseShippingFee =
    shippingMethod === "air"
      ? calculateAirShippingFee(orderWeightKg)
      : calculateSurfaceShippingFee(orderWeightKg);
  const regionSurchargeFee =
    normalizedShippingState && baseShippingFee > 0 && isHighLogisticsState(normalizedShippingState)
      ? HIGH_LOGISTICS_SURCHARGE_INR
      : 0;
  const shippingFee = baseShippingFee + regionSurchargeFee;

  const methodLabel = shippingMethod === "air" ? "Air Shipping" : "Surface Shipping";
  const shippingLabel =
    normalizedShippingState && regionSurchargeFee > 0
      ? `${methodLabel} + High-logistics surcharge`
      : methodLabel;

  return {
    shippingFee,
    baseShippingFee,
    regionSurchargeFee,
    shippingLabel,
    normalizedShippingState,
  };
}

function parseWeightFromTags(tags?: string[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  const pattern = /(?:shipping[_\s-]?weight|weight)\s*[:=_-]?\s*(\d+(?:\.\d+)?)\s*(kg|g)?/i;

  for (const tag of tags) {
    const match = tag.match(pattern);
    if (!match) {
      continue;
    }
    const rawValue = Number.parseFloat(match[1]);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      continue;
    }
    const unit = (match[2] ?? "kg").toLowerCase();
    return unit === "g" ? rawValue / 1000 : rawValue;
  }

  return null;
}

export function resolveLineItemWeightKg(item: { weightKg?: number; tags?: string[] }) {
  if (typeof item.weightKg === "number" && Number.isFinite(item.weightKg) && item.weightKg > 0) {
    return roundWeight(item.weightKg);
  }

  const parsedFromTags = parseWeightFromTags(item.tags);
  if (typeof parsedFromTags === "number" && parsedFromTags > 0) {
    return roundWeight(parsedFromTags);
  }

  return DEFAULT_ITEM_WEIGHT_KG;
}

export function estimateOrderWeightKg(
  lineItems: Array<{ quantity: number; weightKg?: number; tags?: string[] }>,
) {
  const total = lineItems.reduce((sum, item) => {
    const quantity = Math.max(1, Math.floor(item.quantity || 1));
    return sum + resolveLineItemWeightKg(item) * quantity;
  }, 0);

  return roundWeight(total);
}

export function computeCouponDiscount(
  subtotalAmount: number,
  coupon: {
    type: "percentage" | "fixed";
    value: number;
    minSubtotal: number;
    maxDiscountAmount?: number;
  },
): { eligible: boolean; discountAmount: number } {
  if (subtotalAmount < coupon.minSubtotal) {
    return { eligible: false, discountAmount: 0 };
  }
  const baseDiscount =
    coupon.type === "fixed"
      ? coupon.value
      : Math.round((subtotalAmount * coupon.value) / 100);
  const discountAmount =
    typeof coupon.maxDiscountAmount === "number"
      ? Math.min(baseDiscount, coupon.maxDiscountAmount)
      : baseDiscount;
  return { eligible: true, discountAmount };
}

export function calculateCheckoutPricing(input: {
  subtotalAmount: number;
  shippingState?: string;
  shippingMethod?: ShippingMethod;
  orderWeightKg?: number;
  lineItems?: Array<{ quantity: number; weightKg?: number; tags?: string[] }>;
  paymentMethod?: "online" | "cod";
  validatedCoupon?: {
    code: string;
    label: string;
    description: string;
    discountAmount: number;
  } | null;
}): CheckoutPricingSummary {
  const subtotalAmount = Math.max(0, Math.round(input.subtotalAmount));
  const normalizedShippingState = normalizeShippingState(input.shippingState ?? "");
  const shippingStatus = normalizedShippingState ? "resolved" : "pending";
  const shippingMethod: ShippingMethod = input.shippingMethod ?? "surface";
  const orderWeightKg =
    typeof input.orderWeightKg === "number" && Number.isFinite(input.orderWeightKg) && input.orderWeightKg > 0
      ? roundWeight(input.orderWeightKg)
      : estimateOrderWeightKg(input.lineItems ?? []);

  const resolvedShipping =
    subtotalAmount > 0 && normalizedShippingState
      ? calculateShippingFee({
          orderWeightKg,
          shippingMethod,
          shippingState: normalizedShippingState,
        })
      : {
          shippingFee: 0,
          baseShippingFee: 0,
          regionSurchargeFee: 0,
          shippingLabel: "Select state to calculate shipping",
          normalizedShippingState,
        };

  const validatedCoupon = input.validatedCoupon ?? null;
  const couponStatus: CheckoutPricingSummary["couponStatus"] = validatedCoupon ? "applied" : "none";
  const discountAmount = validatedCoupon?.discountAmount ?? 0;
  const appliedCoupon: AppliedCheckoutCoupon | null = validatedCoupon
    ? { code: validatedCoupon.code, label: validatedCoupon.label, description: validatedCoupon.description }
    : null;
  const couponMessage: string | null = validatedCoupon ? `${validatedCoupon.code} applied successfully.` : null;

  const codFee = input.paymentMethod === "cod" ? calculateCodFee(subtotalAmount + resolvedShipping.shippingFee) : 0;

  return {
    subtotalAmount,
    shippingFee: resolvedShipping.shippingFee,
    shippingLabel: resolvedShipping.shippingLabel,
    shippingStatus,
    normalizedShippingState: resolvedShipping.normalizedShippingState,
    orderWeightKg,
    shippingMethod,
    baseShippingFee: resolvedShipping.baseShippingFee,
    regionSurchargeFee: resolvedShipping.regionSurchargeFee,
    discountAmount,
    codFee,
    totalAmount: Math.max(0, subtotalAmount + resolvedShipping.shippingFee + codFee - discountAmount),
    appliedCoupon,
    couponStatus,
    couponMessage,
  };
}

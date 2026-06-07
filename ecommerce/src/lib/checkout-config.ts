export const ORDER_CANCELLATION_WINDOW_DAYS = 7;
export const COD_FEE_INR = 49;
export const COD_MAX_SUBTOTAL_INR = 3000;

export const INDIAN_STATES = [
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

type ShippingRule = {
  feeInr: number;
  label: string;
  states: string[];
};

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
  discountAmount: number;
  totalAmount: number;
  appliedCoupon: AppliedCheckoutCoupon | null;
  couponStatus: "none" | "applied";
  couponMessage: string | null;
};

export const SHIPPING_RULES: ShippingRule[] = [
  {
    feeInr: 1,
    label: "North India",
    states: ["Delhi", "Haryana", "Punjab", "Rajasthan", "Uttar Pradesh", "Chandigarh"],
  },
  {
    feeInr: 1,
    label: "West India",
    states: ["Gujarat", "Maharashtra", "Madhya Pradesh", "Goa"],
  },
  {
    feeInr: 1,
    label: "South India",
    states: ["Karnataka", "Tamil Nadu", "Telangana", "Andhra Pradesh", "Puducherry"],
  },
  {
    feeInr: 1,
    label: "East and Central India",
    states: ["Bihar", "Jharkhand", "Odisha", "West Bengal", "Chhattisgarh"],
  },
  {
    feeInr: 1,
    label: "Remote and Special Zones",
    states: [
      "Assam",
      "Arunachal Pradesh",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Kerala",
      "Ladakh",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Sikkim",
      "Tripura",
      "Uttarakhand",
    ],
  },
];

const DEFAULT_SHIPPING_FEE_INR = 1;
const DEFAULT_SHIPPING_LABEL = "Rest of India";

function normalizeTextToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

export function normalizeShippingState(value: string) {
  return value.trim().replace(/\s+/g, " ");
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

function resolveShippingRule(state: string) {
  const normalizedState = normalizeTextToken(state);

  if (!normalizedState) {
    return null;
  }

  for (const rule of SHIPPING_RULES) {
    if (rule.states.some((entry) => normalizeTextToken(entry) === normalizedState)) {
      return rule;
    }
  }

  return {
    feeInr: DEFAULT_SHIPPING_FEE_INR,
    label: DEFAULT_SHIPPING_LABEL,
    states: [],
  } satisfies ShippingRule;
}

export function calculateCheckoutPricing(input: {
  subtotalAmount: number;
  shippingState?: string;
  validatedCoupon?: {
    code: string;
    label: string;
    description: string;
    discountAmount: number;
  } | null;
}): CheckoutPricingSummary {
  const subtotalAmount = Math.max(0, Math.round(input.subtotalAmount));
  const normalizedShippingState = normalizeShippingState(input.shippingState ?? "");
  const shippingRule = resolveShippingRule(normalizedShippingState);
  const shippingStatus = normalizedShippingState ? "resolved" : "pending";
  const shippingFee = subtotalAmount > 0 && shippingRule ? shippingRule.feeInr : 0;
  const shippingLabel = normalizedShippingState
    ? shippingRule?.label ?? DEFAULT_SHIPPING_LABEL
    : "Select state to calculate shipping";

  const validatedCoupon = input.validatedCoupon ?? null;
  const couponStatus: CheckoutPricingSummary["couponStatus"] = validatedCoupon ? "applied" : "none";
  const discountAmount = validatedCoupon?.discountAmount ?? 0;
  const appliedCoupon: AppliedCheckoutCoupon | null = validatedCoupon
    ? { code: validatedCoupon.code, label: validatedCoupon.label, description: validatedCoupon.description }
    : null;
  const couponMessage: string | null = validatedCoupon ? `${validatedCoupon.code} applied successfully.` : null;

  return {
    subtotalAmount,
    shippingFee,
    shippingLabel,
    shippingStatus,
    normalizedShippingState,
    discountAmount,
    totalAmount: Math.max(0, subtotalAmount + shippingFee - discountAmount),
    appliedCoupon,
    couponStatus,
    couponMessage,
  };
}

import { NextResponse } from "next/server";

export type ShippingAddressInput = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type ShippingOption = {
  address_index: number;
  serviceable: boolean;
  cod_serviceable: boolean;
  shipping_fee: number;
  cod_fee: number;
  delivery_days: number;
  label: string;
};

function normalizeValue(value?: string) {
  return (value ?? "").trim();
}

function isValidIndianPincode(value?: string) {
  return /^[1-9][0-9]{5}$/.test(normalizeValue(value));
}

function isIndianAddress(address: ShippingAddressInput) {
  const country = normalizeValue(address.country).toUpperCase();
  const pincode = normalizeValue(address.pincode);
  const state = normalizeValue(address.state);
  const city = normalizeValue(address.city);
  const line = normalizeValue(address.address);

  return (
    country === "IN" ||
    (!country && pincode.length > 0 && isValidIndianPincode(pincode)) ||
    (!country && state.length > 0 && city.length > 0 && line.length > 0)
  );
}

export function buildShippingOptions(
  addresses: ShippingAddressInput[],
  cartValue = 0,
): ShippingOption[] {
  return addresses.map((address, index) => {
    const hasStreet = normalizeValue(address.address).length > 0;
    const hasCity = normalizeValue(address.city).length > 0;
    const hasState = normalizeValue(address.state).length > 0;
    const hasPincode = isValidIndianPincode(address.pincode);
    const isDomestic = isIndianAddress(address);
    const serviceable = Boolean(
      isDomestic &&
        hasStreet &&
        hasCity &&
        hasState &&
        hasPincode,
    );

    const codServiceable =
      serviceable &&
      Number.isFinite(cartValue) &&
      cartValue >= 0 &&
      cartValue <= 250000;

    return {
      address_index: index,
      serviceable,
      cod_serviceable: codServiceable,
      shipping_fee: 0,
      cod_fee: 0,
      delivery_days: 3,
      label: "Standard Delivery",
    };
  });
}

export async function GET() {
  return NextResponse.json({
    shipping_options: [
      {
        address_index: 0,
        serviceable: true,
        cod_serviceable: true,
        shipping_fee: 0,
        cod_fee: 0,
        delivery_days: 3,
        label: "Standard Delivery",
      },
    ],
    currency: "INR",
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      addresses?: ShippingAddressInput[];
      cart_value?: number;
      currency?: string;
    };

    const addresses = Array.isArray(body.addresses) ? body.addresses : [];
    const cartValue = Number(body.cart_value ?? 0);

    const shippingOptions = buildShippingOptions(addresses, Number.isFinite(cartValue) ? cartValue : 0);

    return NextResponse.json(
      {
        shipping_options: shippingOptions,
        currency: body.currency ?? "INR",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid shipping request body" }, { status: 400 });
  }
}

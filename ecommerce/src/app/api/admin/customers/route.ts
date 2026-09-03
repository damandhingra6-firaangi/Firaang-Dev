import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomerPasswordAccountByAdmin } from "@/lib/account-data";

export const runtime = "nodejs";

const adminCustomerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().max(72).optional().or(z.literal("")),
  generatePassword: z.boolean().optional(),
}).superRefine((value, context) => {
  if (!value.email?.trim() && !value.phone?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Email or phone is required",
      path: ["email"],
    });
  }

  if (!value.generatePassword && !(value.password ?? "").trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Set an initial password or generate one",
      path: ["password"],
    });
  }

  if ((value.password ?? "").trim() && (value.password ?? "").length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Password must be at least 8 characters",
      path: ["password"],
    });
  }
});

function isAdminAuthorized(request: Request) {
  const adminKey = process.env.FEEDBACK_ADMIN_KEY;
  const requestKey = request.headers.get("x-admin-key");

  if (!adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "FEEDBACK_ADMIN_KEY is not configured" }, { status: 503 }) };
  }

  if (requestKey !== adminKey) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const auth = isAdminAuthorized(request);

  if (!auth.ok) {
    return auth.response;
  }

  const payload = (await request.json().catch(() => null)) as unknown;

  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminCustomerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid customer payload" }, { status: 400 });
  }

  try {
    const account = await createCustomerPasswordAccountByAdmin({
      ...parsed.data,
      createdByAdmin: {
        email: request.headers.get("x-admin-email") ?? undefined,
        fullName: request.headers.get("x-admin-name") ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      customer: {
        id: account.userId,
        fullName: account.profile.fullName,
        email: account.profile.email,
        phone: account.profile.phone,
        authProvider: account.profile.authProvider,
      },
      initialPassword: account.initialPassword,
      generatedPassword: account.generatedPassword,
      existingAccount: account.linkedExistingAccount,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_EXISTS") {
        return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
      }

      if (error.message === "PHONE_EXISTS") {
        return NextResponse.json({ error: "An account with this phone number already exists" }, { status: 409 });
      }

      if (error.message === "PHONE_INVALID") {
        return NextResponse.json({ error: "Please enter a valid Indian mobile number" }, { status: 400 });
      }

      if (error.message === "EMAIL_INVALID") {
        return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
      }

      if (error.message === "PASSWORD_REQUIRED") {
        return NextResponse.json({ error: "Set an initial password or generate one" }, { status: 400 });
      }

      if (error.message === "PASSWORD_INVALID_LENGTH") {
        return NextResponse.json({ error: "Password must be between 8 and 72 characters" }, { status: 400 });
      }

      if (error.message === "IDENTIFIER_CONFLICT") {
        return NextResponse.json({ error: "Email and phone already belong to different accounts" }, { status: 409 });
      }
    }

    console.error("Failed to create admin customer account", error);
    return NextResponse.json({ error: "Could not create customer account" }, { status: 500 });
  }
}
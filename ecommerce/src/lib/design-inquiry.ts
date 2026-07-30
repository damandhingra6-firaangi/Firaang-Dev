import { z } from "zod";

export const FIRAANG_SIGNATURE_TAGS = [
  "signature",
  "firaang-signature",
  "firaangsignature",
  "custom-design",
  "pod",
  "print-on-demand",
] as const;

export function isSignatureProduct(tags?: string[]): boolean {
  if (!tags || tags.length === 0) return false;
  const normalizedTags = tags.map((t) => t.trim().toLowerCase());
  return FIRAANG_SIGNATURE_TAGS.some((tag) => normalizedTags.includes(tag.toLowerCase()));
}

export const designInquirySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name too long"),
  email: z.string().trim().email("Enter a valid email address").max(160, "Email too long"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .min(10, "Describe your idea in at least 10 characters")
    .max(2000, "Description must be 2000 characters or fewer"),
  budget: z.string().trim().max(100, "Budget too long").optional().or(z.literal("")),
  expectedDelivery: z.string().trim().max(100, "Date too long").optional().or(z.literal("")),
  productName: z.string().trim().max(200).optional().or(z.literal("")),
  productId: z.string().trim().max(200).optional().or(z.literal("")),
  referenceImageUrls: z.array(z.string().max(2000)).max(5, "Maximum 5 reference images").optional(),
});

export type DesignInquiryInput = z.infer<typeof designInquirySchema>;

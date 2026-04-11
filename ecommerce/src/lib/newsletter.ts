import { z } from "zod";

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(160, "Email must be 160 characters or fewer"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

import { z } from "zod";

export const feedbackSchema = z.object({
  name: z.string().trim().max(120, "Name must be 120 characters or fewer").optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .max(160, "Email must be 160 characters or fewer")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters of feedback")
    .max(800, "Feedback must be 800 characters or fewer"),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

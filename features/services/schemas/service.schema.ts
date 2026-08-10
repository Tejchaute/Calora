import { z } from "zod";

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Service name is required.")
    .max(100, "Service name cannot exceed 100 characters."),

  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),

  duration: z.coerce
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes.")
    .max(480, "Duration cannot exceed 480 minutes."),

  price: z.coerce
    .number()
    .min(0, "Price cannot be negative."),

  status: z.enum([
    "active",
    "inactive",
  ]),
});

export type ServiceFormData =
  z.infer<typeof serviceSchema>;
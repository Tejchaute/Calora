import { z } from "zod";

export const customerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(100, "Customer name cannot exceed 100 characters."),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .optional()
    .or(z.literal("")),

  phone: z
    .string()
    .trim()
    .max(20, "Phone number cannot exceed 20 characters.")
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters.")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
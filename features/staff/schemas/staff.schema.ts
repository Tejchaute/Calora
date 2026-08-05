import { z } from "zod";

export const staffSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required.")
    .max(100, "Full name cannot exceed 100 characters."),

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

  employee_code: z
    .string()
    .trim()
    .max(30, "Employee code cannot exceed 30 characters.")
    .optional()
    .or(z.literal("")),

  role: z
    .string()
    .trim()
    .min(1, "Role is required.")
    .max(50, "Role cannot exceed 50 characters."),

  status: z.enum(["active", "inactive"]),
});

export type StaffFormData = z.infer<typeof staffSchema>;
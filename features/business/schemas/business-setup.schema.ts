import { z } from 'zod';

export const businessSetupSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Enter your business name.')
    .max(120, 'Business name cannot exceed 120 characters.')
    .refine(
      (name) => /[a-z0-9]/i.test(name),
      'Business name must include at least one letter or number.'
    ),
  businessTypeId: z.string().uuid('Choose the business type that fits best.'),
});

export type BusinessSetupFormData = z.infer<typeof businessSetupSchema>;

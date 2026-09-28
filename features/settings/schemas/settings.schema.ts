import { z } from 'zod';
import { CURRENCIES, TIMEZONES } from '@/constants';

const supportedCurrencies = new Set(CURRENCIES.map((currency) => currency.code));
const supportedTimezones = new Set(TIMEZONES);

export const settingsSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, 'Business name is required.')
    .max(100, 'Business name cannot exceed 100 characters.'),

  phone: z
    .string()
    .trim()
    .max(20, 'Phone number cannot exceed 20 characters.')
    .optional()
    .or(z.literal('')),

  email: z
    .string()
    .trim()
    .email('Please enter a valid email address.')
    .optional()
    .or(z.literal('')),

  address: z
    .string()
    .trim()
    .max(500, 'Address cannot exceed 500 characters.')
    .optional()
    .or(z.literal('')),

  logo_url: z
    .string()
    .trim()
    .url('Logo URL must be a valid URL.')
    .optional()
    .or(z.literal('')),

  currency: z
    .string()
    .trim()
    .min(1, 'Currency is required.')
    .refine(
      (currency) => supportedCurrencies.has(currency),
      'Choose a supported currency.'
    ),

  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone is required.')
    .refine(
      (timezone) => supportedTimezones.has(timezone),
      'Choose a valid supported IANA timezone.'
    ),

  booking_page_slug: z
    .string()
    .trim()
    .min(1, 'Booking page slug is required.')
    .max(100, 'Booking page slug cannot exceed 100 characters.')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can contain lowercase letters, numbers and hyphens only.'
    ),
});

export type SettingsFormData = z.infer<typeof settingsSchema>;

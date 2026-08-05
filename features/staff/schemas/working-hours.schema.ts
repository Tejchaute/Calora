import { z } from 'zod';

export const workingHoursSchema = z.object({
  is_open: z.boolean(),
  open_time: z.string().trim().min(1, 'Open time is required.'),
  close_time: z.string().trim().min(1, 'Close time is required.'),
  break_start: z.string().trim().optional().or(z.literal('')),
  break_end: z.string().trim().optional().or(z.literal('')),
});

export type WorkingHoursFormData = z.infer<typeof workingHoursSchema>;

export const holidaySchema = z.object({
  date: z.string().trim().min(1, 'Date is required.'),
  name: z
    .string()
    .trim()
    .max(100, 'Name cannot exceed 100 characters.')
    .optional()
    .or(z.literal('')),
});

export type HolidayFormData = z.infer<typeof holidaySchema>;

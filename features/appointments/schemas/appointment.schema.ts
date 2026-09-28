import { z } from 'zod';

export const appointmentSchema = z
  .object({
    customer_id: z.string().min(1, 'Customer is required.'),
    service_id: z.string().min(1, 'Service is required.'),
    staff_id: z.string(),

    appointment_date: z.string().min(1, 'Appointment date is required.'),

    start_time: z.string().min(1, 'Start time is required.'),
    end_time: z.string().min(1, 'End time is required.'),

    status: z.enum([
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show',
    ]),

    notes: z
      .string()
      .max(1000, 'Notes cannot exceed 1000 characters.')
      .optional()
      .or(z.literal('')),

    newCustomerName: z.string().optional().or(z.literal('')),
    newCustomerPhone: z.string().optional().or(z.literal('')),
    newCustomerEmail: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => data.customer_id !== '__select__' && data.customer_id !== '',
    {
      message: 'Please select or create a customer.',
      path: ['customer_id'],
    },
  )
  .refine(
    (data) =>
      data.customer_id !== '__new__' || (data.newCustomerName && data.newCustomerName.trim().length > 0),
    {
      message: 'Customer name is required when creating a new customer.',
      path: ['newCustomerName'],
    },
  )
  .refine((data) => data.start_time < data.end_time, {
    message: 'End time must be after start time.',
    path: ['end_time'],
  });

export type AppointmentFormData = z.infer<typeof appointmentSchema>;

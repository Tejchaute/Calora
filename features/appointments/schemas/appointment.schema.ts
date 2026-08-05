import { z } from "zod";

export const appointmentSchema = z
  .object({
    customer_id: z.string().uuid("Customer is required."),
    service_id: z.string().uuid("Service is required."),
    staff_id: z.string().uuid("Staff member is required."),

    appointment_date: z.string().min(1, "Appointment date is required."),

    start_time: z.string().min(1, "Start time is required."),
    end_time: z.string().min(1, "End time is required."),

    status: z.enum([
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
      "no_show",
    ]),

    notes: z
      .string()
      .max(1000, "Notes cannot exceed 1000 characters.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (data) => data.start_time < data.end_time,
    {
      message: "End time must be after start time.",
      path: ["end_time"],
    }
  );

export type AppointmentFormData = z.infer<typeof appointmentSchema>;
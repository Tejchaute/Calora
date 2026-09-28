/*
 * Align the legacy appointments status check with the authoritative
 * appointment_status enum. The enum already enforces this set; retaining the
 * check preserves the existing explicit invariant without blocking scheduled
 * or no_show records.
 */
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (
    status::text = ANY (
      ARRAY[
        'scheduled'::text,
        'confirmed'::text,
        'completed'::text,
        'cancelled'::text,
        'no_show'::text
      ]
    )
  );

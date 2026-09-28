-- Confirmation after cancellation must reconcile the existing deterministic
-- reminder identity. Do not resurrect a reminder whose delivery time passed.
CREATE OR REPLACE FUNCTION public.sync_appointment_email_reminder_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reminder_due_at timestamptz;
BEGIN
  IF NEW.event_type = 'appointment.confirmed'
     AND NEW.metadata ->> 'previous_status' = 'cancelled' THEN
    SELECT ((appointment.appointment_date + appointment.start_time)
              AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC'))
              - pg_catalog.make_interval(
                  hours => COALESCE(notification.reminder_hours_before, 24))
    INTO reminder_due_at
    FROM public.appointments AS appointment
    LEFT JOIN public.business_settings AS settings
      ON settings.business_id = appointment.business_id
    LEFT JOIN public.notification_settings AS notification
      ON notification.business_id = appointment.business_id
    WHERE appointment.id = NEW.appointment_id;

    IF reminder_due_at IS NULL OR reminder_due_at <= pg_catalog.now() THEN
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.event_type IN (
    'appointment.created',
    'appointment.confirmed',
    'appointment.rescheduled',
    'appointment.cancelled',
    'appointment.completed'
  ) THEN
    PERFORM public.reconcile_appointment_email_reminder(NEW.appointment_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Optional delivery scheduling must not roll back authoritative appointments.
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_appointment_email_reminder_from_event() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_appointment_email_reminder_from_event()
  FROM PUBLIC, anon, authenticated;

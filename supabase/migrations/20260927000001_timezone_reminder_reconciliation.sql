-- Appointments are business-local date/time values. Changing the timezone
-- changes their absolute start instant, and therefore an unsent reminder's due_at.
-- Process only this business's pending reminders; sent/terminal deliveries are immutable.
CREATE OR REPLACE FUNCTION public.reconcile_pending_reminders_after_timezone_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pending_status_id uuid;
  cancelled_status_id uuid;
  reminder record;
  reminder_due_at timestamptz;
  is_eligible boolean;
BEGIN
  SELECT id INTO pending_status_id FROM public.notification_statuses WHERE slug = 'pending';
  SELECT id INTO cancelled_status_id FROM public.notification_statuses WHERE slug = 'cancelled';
  IF pending_status_id IS NULL OR cancelled_status_id IS NULL THEN RETURN NEW; END IF;

  FOR reminder IN
    SELECT DISTINCT delivery.appointment_id
    FROM public.notification_deliveries AS delivery
    WHERE delivery.business_id = NEW.business_id
      AND delivery.status_id = pending_status_id
      AND delivery.appointment_id IS NOT NULL
      AND delivery.content ->> 'notification_type' = 'appointment_reminder'
  LOOP
    SELECT
      ((appointment.appointment_date + appointment.start_time)
        AT TIME ZONE COALESCE(NULLIF(NEW.timezone, ''), 'UTC'))
        - pg_catalog.make_interval(hours => COALESCE(notification.reminder_hours_before, 24)),
      appointment.status IN ('pending', 'scheduled', 'confirmed')
        AND COALESCE(notification.send_reminders, true)
    INTO reminder_due_at, is_eligible
    FROM public.appointments AS appointment
    LEFT JOIN public.notification_settings AS notification
      ON notification.business_id = appointment.business_id
    WHERE appointment.id = reminder.appointment_id
      AND appointment.business_id = NEW.business_id;

    IF is_eligible
       AND reminder_due_at > pg_catalog.now()
       AND NOT EXISTS (
         SELECT 1 FROM public.notification_deliveries AS prior
         JOIN public.notification_statuses AS prior_status ON prior_status.id = prior.status_id
         WHERE prior.business_id = NEW.business_id
           AND prior.appointment_id = reminder.appointment_id
           AND prior.content ->> 'notification_type' = 'appointment_reminder'
           AND prior_status.slug IN ('sent', 'delivered')
       ) THEN
      PERFORM public.reconcile_appointment_email_reminder(reminder.appointment_id);
    ELSE
      -- Never send a newly past-due reminder or resurrect a terminal delivery.
      UPDATE public.notification_deliveries AS delivery
      SET status_id = cancelled_status_id,
          processed_at = pg_catalog.now(),
          failure_category = 'reminder_stale',
          error_message = 'Reminder no longer matches the current appointment.',
          updated_at = pg_catalog.now()
      WHERE delivery.business_id = NEW.business_id
        AND delivery.appointment_id = reminder.appointment_id
        AND delivery.status_id = pending_status_id
        AND delivery.content ->> 'notification_type' = 'appointment_reminder';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.reconcile_pending_reminders_after_timezone_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reconcile_pending_reminders_after_timezone_change()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER business_settings_reconcile_pending_reminders_timezone
AFTER UPDATE OF timezone ON public.business_settings
FOR EACH ROW
WHEN (OLD.timezone IS DISTINCT FROM NEW.timezone)
EXECUTE FUNCTION public.reconcile_pending_reminders_after_timezone_change();

-- The scheduled recovery pass must not recreate a reminder whose newly
-- calculated due time has passed, or send another reminder after a prior send.
CREATE OR REPLACE FUNCTION public.reconcile_missing_appointment_email_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  appointment_record record;
  reconciled_count integer := 0;
BEGIN
  FOR appointment_record IN
    SELECT appointment.id
    FROM public.appointments AS appointment
    JOIN public.businesses AS business
      ON business.id = appointment.business_id AND business.status = 'active'
    LEFT JOIN public.business_settings AS settings
      ON settings.business_id = appointment.business_id
    LEFT JOIN public.notification_settings AS notification
      ON notification.business_id = appointment.business_id
    WHERE appointment.status IN ('pending', 'scheduled', 'confirmed')
      AND COALESCE(notification.send_reminders, true)
      AND ((appointment.appointment_date + appointment.start_time)
        AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC'))
        - pg_catalog.make_interval(hours => COALESCE(notification.reminder_hours_before, 24))
        > pg_catalog.now()
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_deliveries AS prior
        JOIN public.notification_statuses AS prior_status ON prior_status.id = prior.status_id
        WHERE prior.appointment_id = appointment.id
          AND prior.business_id = appointment.business_id
          AND prior.content ->> 'notification_type' = 'appointment_reminder'
          AND prior_status.slug IN ('sent', 'delivered')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.notification_deliveries AS delivery
        WHERE delivery.idempotency_key =
          'appointment-reminder-email:' || appointment.id::text || ':' ||
          EXTRACT(epoch FROM ((appointment.appointment_date + appointment.start_time)
            AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC')))::bigint::text || ':' ||
          (COALESCE(notification.reminder_hours_before, 24) * 60)::text
      )
  LOOP
    PERFORM public.reconcile_appointment_email_reminder(appointment_record.id);
    reconciled_count := reconciled_count + 1;
  END LOOP;
  RETURN reconciled_count;
END;
$$;

ALTER FUNCTION public.reconcile_missing_appointment_email_reminders() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reconcile_missing_appointment_email_reminders()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_missing_appointment_email_reminders()
  TO service_role;

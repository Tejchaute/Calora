-- Recover reminder scheduling if the failure-isolated lifecycle trigger could
-- not create a delivery. Called by the trusted processor before claiming due work.

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
    SELECT
      appointment.id,
      'appointment-reminder-email:' || appointment.id::text || ':' ||
      EXTRACT(
        epoch FROM (
          (appointment.appointment_date + appointment.start_time)
            AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC')
        )
      )::bigint::text || ':' ||
      (COALESCE(notification.reminder_hours_before, 24) * 60)::text
        AS expected_idempotency_key
    FROM public.appointments AS appointment
    JOIN public.businesses AS business
      ON business.id = appointment.business_id
     AND business.status = 'active'
    LEFT JOIN public.business_settings AS settings
      ON settings.business_id = appointment.business_id
    LEFT JOIN public.notification_settings AS notification
      ON notification.business_id = appointment.business_id
    WHERE appointment.status IN ('pending', 'confirmed')
      AND COALESCE(notification.send_reminders, true)
      AND (
        (appointment.appointment_date + appointment.start_time)
          AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC')
      ) > pg_catalog.now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.notification_deliveries AS delivery
        WHERE delivery.idempotency_key =
          'appointment-reminder-email:' || appointment.id::text || ':' ||
          EXTRACT(
            epoch FROM (
              (appointment.appointment_date + appointment.start_time)
                AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC')
            )
          )::bigint::text || ':' ||
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

COMMENT ON FUNCTION public.reconcile_missing_appointment_email_reminders() IS
  'Service-role recovery pass for missing deterministic reminder deliveries.';

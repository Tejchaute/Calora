-- Status compatibility only: pending is canonical; scheduled remains readable.
SET lock_timeout = '3s';
CREATE OR REPLACE FUNCTION public.get_business_analytics(p_business_id uuid, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  resolved_timezone text;
  business_now timestamp;
  period_end date;
  period_start date;
  result jsonb;
BEGIN
  IF NOT public.is_business_member_record(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to access business analytics'
      USING ERRCODE = '42501';
  END IF;

  IF p_days NOT IN (1, 7, 30, 90) THEN
    RAISE EXCEPTION 'Analytics range must be 1, 7, 30, or 90 days'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC')
  INTO resolved_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = p_business_id;

  resolved_timezone := COALESCE(resolved_timezone, 'UTC');
  business_now := pg_catalog.statement_timestamp() AT TIME ZONE resolved_timezone;
  period_end := business_now::date;
  period_start := period_end - (p_days - 1);

  WITH period_appointments AS (
    SELECT appointment.*
    FROM public.appointments AS appointment
    WHERE appointment.business_id = p_business_id
      AND appointment.appointment_date BETWEEN period_start AND period_end
  ),
  historical_outcomes AS (
    SELECT appointment.*
    FROM period_appointments AS appointment
    WHERE appointment.appointment_date < period_end
       OR (
         appointment.appointment_date = period_end
         AND appointment.end_time <= business_now::time
       )
  ),
  status_counts AS (
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE status::text IN ('pending', 'scheduled'))::integer AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::integer AS confirmed,
      COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::integer AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::integer AS no_show
    FROM period_appointments
  ),
  outcome_counts AS (
    SELECT
      COUNT(*)::integer AS eligible,
      COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::integer AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::integer AS no_show
    FROM historical_outcomes
  ),
  trend AS (
    SELECT
      day_value::date AS date,
      COUNT(appointment.id)::integer AS total,
      COUNT(appointment.id) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(appointment.id) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM pg_catalog.generate_series(period_start, period_end, interval '1 day') AS day_value
    LEFT JOIN period_appointments AS appointment
      ON appointment.appointment_date = day_value::date
    GROUP BY day_value
    ORDER BY day_value
  ),
  service_counts AS (
    SELECT
      appointment.service_id AS id,
      COALESCE(NULLIF(MAX(appointment.service_name_snapshot), ''), MAX(service.name), 'Unknown service') AS name,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM period_appointments AS appointment
    LEFT JOIN public.services AS service ON service.id = appointment.service_id
    GROUP BY appointment.service_id
    ORDER BY COUNT(*) DESC, name
    LIMIT 8
  ),
  staff_counts AS (
    SELECT
      appointment.staff_id AS id,
      COALESCE(NULLIF(MAX(appointment.staff_name_snapshot), ''), MAX(staff.full_name), 'Unassigned') AS name,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM period_appointments AS appointment
    LEFT JOIN public.staff AS staff ON staff.id = appointment.staff_id
    GROUP BY appointment.staff_id
    ORDER BY COUNT(*) DESC, name
    LIMIT 8
  ),
  period_customers AS (
    SELECT DISTINCT appointment.customer_id
    FROM period_appointments AS appointment
  ),
  customer_counts AS (
    SELECT
      (SELECT COUNT(*)::integer FROM public.customers AS customer WHERE customer.business_id = p_business_id) AS total,
      (SELECT COUNT(*)::integer FROM period_customers) AS with_appointments,
      (
        SELECT COUNT(*)::integer
        FROM public.customers AS customer
        WHERE customer.business_id = p_business_id
          AND (customer.created_at AT TIME ZONE resolved_timezone)::date BETWEEN period_start AND period_end
      ) AS new_customers,
      (
        SELECT COUNT(*)::integer
        FROM period_customers AS period_customer
        WHERE EXISTS (
          SELECT 1
          FROM public.appointments AS earlier
          WHERE earlier.business_id = p_business_id
            AND earlier.customer_id = period_customer.customer_id
            AND earlier.appointment_date < period_start
        )
      ) AS returning_customers
  )
  SELECT pg_catalog.jsonb_build_object(
    'clock', pg_catalog.jsonb_build_object(
      'server_now', pg_catalog.statement_timestamp(),
      'business_date', period_end,
      'business_time', business_now::time,
      'timezone', resolved_timezone
    ),
    'range', pg_catalog.jsonb_build_object(
      'days', p_days,
      'start_date', period_start,
      'end_date', period_end
    ),
    'appointments', (SELECT pg_catalog.to_jsonb(status_counts) FROM status_counts),
    'outcomes', (SELECT pg_catalog.to_jsonb(outcome_counts) FROM outcome_counts),
    'customers', (SELECT pg_catalog.to_jsonb(customer_counts) FROM customer_counts),
    'trend', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(trend)) FROM trend), '[]'::jsonb),
    'services', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(service_counts)) FROM service_counts), '[]'::jsonb),
    'staff', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(staff_counts)) FROM staff_counts), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.reconcile_appointment_email_reminder(target_appointment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  appointment_row public.appointments;
  business_timezone text;
  reminders_enabled boolean;
  lead_minutes integer;
  appointment_start_at timestamptz;
  email_channel_id uuid;
  pending_status_id uuid;
  cancelled_status_id uuid;
  customer_email text;
  reminder_key text;
BEGIN
  SELECT appointment.* INTO appointment_row
  FROM public.appointments AS appointment
  WHERE appointment.id = target_appointment_id;

  IF appointment_row.id IS NULL THEN RETURN; END IF;

  SELECT
    COALESCE(NULLIF(settings.timezone, ''), 'UTC'),
    COALESCE(notification.send_reminders, true),
    COALESCE(notification.reminder_hours_before, 24) * 60
  INTO business_timezone, reminders_enabled, lead_minutes
  FROM public.businesses AS business
  LEFT JOIN public.business_settings AS settings
    ON settings.business_id = business.id
  LEFT JOIN public.notification_settings AS notification
    ON notification.business_id = business.id
  WHERE business.id = appointment_row.business_id;

  appointment_start_at :=
    (appointment_row.appointment_date + appointment_row.start_time)
      AT TIME ZONE business_timezone;

  SELECT channel.id INTO email_channel_id
  FROM public.notification_channels AS channel WHERE channel.slug = 'email';
  SELECT status.id INTO pending_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'pending';
  SELECT status.id INTO cancelled_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'cancelled';

  IF email_channel_id IS NULL OR pending_status_id IS NULL OR cancelled_status_id IS NULL THEN
    -- Reminder infrastructure must never make an appointment mutation fail.
    RETURN;
  END IF;

  UPDATE public.notification_deliveries AS delivery
  SET status_id = cancelled_status_id,
      processed_at = pg_catalog.now(),
      failure_category = 'reminder_stale',
      error_message = 'Reminder no longer matches the current appointment.',
      updated_at = pg_catalog.now()
  FROM public.notification_statuses AS current_status
  WHERE delivery.appointment_id = appointment_row.id
    AND delivery.channel_id = email_channel_id
    AND delivery.content ->> 'notification_type' = 'appointment_reminder'
    AND current_status.id = delivery.status_id
    AND current_status.slug = 'pending'
    AND (
      NOT reminders_enabled
      OR appointment_row.status NOT IN ('pending', 'scheduled', 'confirmed')
      OR appointment_start_at <= pg_catalog.now()
      OR delivery.scheduled_for IS DISTINCT FROM appointment_start_at
      OR delivery.reminder_lead_minutes IS DISTINCT FROM lead_minutes
    );

  IF NOT reminders_enabled
     OR appointment_row.status NOT IN ('pending', 'scheduled', 'confirmed')
     OR appointment_start_at <= pg_catalog.now() THEN
    RETURN;
  END IF;

  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(customer.email)), '')
    INTO customer_email
  FROM public.customers AS customer
  WHERE customer.id = appointment_row.customer_id
    AND customer.business_id = appointment_row.business_id;

  reminder_key :=
    'appointment-reminder-email:' || appointment_row.id::text || ':' ||
    EXTRACT(epoch FROM appointment_start_at)::bigint::text || ':' ||
    lead_minutes::text;

  INSERT INTO public.notification_deliveries AS reminder_delivery (
    business_id, appointment_id, customer_id, channel_id, status_id,
    recipient, content, idempotency_key, due_at, scheduled_for,
    reminder_lead_minutes
  ) VALUES (
    appointment_row.business_id, appointment_row.id, appointment_row.customer_id,
    email_channel_id, pending_status_id, COALESCE(customer_email, ''),
    pg_catalog.jsonb_build_object('notification_type', 'appointment_reminder'),
    reminder_key,
    appointment_start_at - pg_catalog.make_interval(mins => lead_minutes),
    appointment_start_at,
    lead_minutes
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO UPDATE SET
    status_id = pending_status_id,
    recipient = EXCLUDED.recipient,
    due_at = EXCLUDED.due_at,
    scheduled_for = EXCLUDED.scheduled_for,
    reminder_lead_minutes = EXCLUDED.reminder_lead_minutes,
    processed_at = NULL,
    failure_category = NULL,
    error_message = '',
    updated_at = pg_catalog.now()
  WHERE reminder_delivery.status_id = cancelled_status_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.reconcile_missing_appointment_email_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    WHERE appointment.status IN ('pending', 'scheduled', 'confirmed')
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
$function$
;
CREATE OR REPLACE FUNCTION public.sync_business_email_reminders_from_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE appointment_record record;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (OLD.send_reminders, OLD.reminder_hours_before)
         IS NOT DISTINCT FROM
         (NEW.send_reminders, NEW.reminder_hours_before) THEN
    RETURN NEW;
  END IF;

  FOR appointment_record IN
    SELECT appointment.id
    FROM public.appointments AS appointment
    WHERE appointment.business_id = NEW.business_id
      AND appointment.status IN ('pending', 'scheduled', 'confirmed')
  LOOP
    PERFORM public.reconcile_appointment_email_reminder(appointment_record.id);
  END LOOP;
  RETURN NEW;
END;
$function$
;

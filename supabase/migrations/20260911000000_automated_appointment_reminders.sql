-- Phase 2E: durable, provider-independent appointment email reminders.
-- Appointment times are stored as business-local date/time and converted to
-- timestamptz with the authoritative business timezone.

ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_lead_minutes integer
    CHECK (reminder_lead_minutes IS NULL OR reminder_lead_minutes > 0);

CREATE INDEX IF NOT EXISTS notification_deliveries_due_idx
  ON public.notification_deliveries (status_id, due_at)
  WHERE due_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reconcile_appointment_email_reminder(
  target_appointment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
      OR appointment_row.status NOT IN ('pending', 'confirmed')
      OR appointment_start_at <= pg_catalog.now()
      OR delivery.scheduled_for IS DISTINCT FROM appointment_start_at
      OR delivery.reminder_lead_minutes IS DISTINCT FROM lead_minutes
    );

  IF NOT reminders_enabled
     OR appointment_row.status NOT IN ('pending', 'confirmed')
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
$$;

ALTER FUNCTION public.reconcile_appointment_email_reminder(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reconcile_appointment_email_reminder(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_appointment_email_reminder_from_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.event_type IN (
    'appointment.created',
    'appointment.rescheduled',
    'appointment.cancelled',
    'appointment.completed'
  ) THEN
    PERFORM public.reconcile_appointment_email_reminder(NEW.appointment_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Lifecycle and appointment writes remain authoritative even if optional
  -- reminder scheduling cannot be reconciled.
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_appointment_email_reminder_from_event() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_appointment_email_reminder_from_event()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointment_email_reminder_after_event
AFTER INSERT ON public.appointment_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_email_reminder_from_event();

CREATE OR REPLACE FUNCTION public.sync_business_email_reminders_from_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
      AND appointment.status IN ('pending', 'confirmed')
  LOOP
    PERFORM public.reconcile_appointment_email_reminder(appointment_record.id);
  END LOOP;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sync_business_email_reminders_from_settings() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.sync_business_email_reminders_from_settings()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER business_email_reminders_after_settings
AFTER INSERT OR UPDATE OF send_reminders, reminder_hours_before
ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_business_email_reminders_from_settings();

CREATE OR REPLACE FUNCTION public.claim_due_appointment_email_reminder()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_row public.notification_deliveries;
  appointment_row public.appointments;
  pending_status_id uuid;
  processing_status_id uuid;
  cancelled_status_id uuid;
  authoritative_email text;
  business_timezone text;
  business_name text;
  currency_code text;
  reminders_enabled boolean;
  configured_lead_minutes integer;
  appointment_start_at timestamptz;
BEGIN
  SELECT status.id INTO pending_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'pending';
  SELECT status.id INTO processing_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'processing';
  SELECT status.id INTO cancelled_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'cancelled';

  SELECT delivery.* INTO delivery_row
  FROM public.notification_deliveries AS delivery
  JOIN public.notification_statuses AS status ON status.id = delivery.status_id
  JOIN public.notification_channels AS channel ON channel.id = delivery.channel_id
  WHERE status.id = pending_status_id
    AND channel.slug = 'email'
    AND delivery.content ->> 'notification_type' = 'appointment_reminder'
    AND delivery.due_at <= pg_catalog.now()
  ORDER BY delivery.due_at, delivery.created_at
  LIMIT 1
  FOR UPDATE OF delivery SKIP LOCKED;

  IF delivery_row.id IS NULL THEN RETURN NULL; END IF;

  SELECT appointment.* INTO appointment_row
  FROM public.appointments AS appointment
  WHERE appointment.id = delivery_row.appointment_id
    AND appointment.business_id = delivery_row.business_id;

  SELECT
    COALESCE(NULLIF(settings.timezone, ''), 'UTC'),
    COALESCE(NULLIF(settings.business_name, ''), business.name),
    COALESCE(NULLIF(settings.currency, ''), 'USD'),
    COALESCE(notification.send_reminders, true),
    COALESCE(notification.reminder_hours_before, 24) * 60
  INTO business_timezone, business_name, currency_code,
       reminders_enabled, configured_lead_minutes
  FROM public.businesses AS business
  LEFT JOIN public.business_settings AS settings
    ON settings.business_id = business.id
  LEFT JOIN public.notification_settings AS notification
    ON notification.business_id = business.id
  WHERE business.id = delivery_row.business_id
    AND business.status = 'active'
    AND public.has_active_subscription(business.id);

  IF appointment_row.id IS NOT NULL THEN
    appointment_start_at :=
      (appointment_row.appointment_date + appointment_row.start_time)
        AT TIME ZONE business_timezone;
  END IF;

  IF appointment_row.id IS NULL
     OR business_name IS NULL
     OR NOT reminders_enabled
     OR appointment_row.status NOT IN ('pending', 'confirmed')
     OR appointment_start_at <= pg_catalog.now()
     OR delivery_row.scheduled_for IS DISTINCT FROM appointment_start_at
     OR delivery_row.reminder_lead_minutes IS DISTINCT FROM configured_lead_minutes THEN
    UPDATE public.notification_deliveries
    SET status_id = cancelled_status_id,
        processed_at = pg_catalog.now(),
        failure_category = 'reminder_ineligible',
        error_message = 'Reminder is no longer eligible.',
        updated_at = pg_catalog.now()
    WHERE id = delivery_row.id;
    RETURN pg_catalog.jsonb_build_object(
      'outcome', 'cancelled',
      'delivery_id', delivery_row.id,
      'failure_category', 'reminder_ineligible'
    );
  END IF;

  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(customer.email)), '')
    INTO authoritative_email
  FROM public.customers AS customer
  WHERE customer.id = appointment_row.customer_id
    AND customer.business_id = appointment_row.business_id;

  IF authoritative_email IS NULL THEN
    UPDATE public.notification_deliveries
    SET status_id = cancelled_status_id,
        processed_at = pg_catalog.now(),
        failure_category = 'recipient_missing',
        error_message = 'Customer email is unavailable.',
        updated_at = pg_catalog.now()
    WHERE id = delivery_row.id;
    RETURN pg_catalog.jsonb_build_object(
      'outcome', 'cancelled',
      'delivery_id', delivery_row.id,
      'failure_category', 'recipient_missing'
    );
  END IF;

  UPDATE public.notification_deliveries
  SET status_id = processing_status_id,
      recipient = authoritative_email,
      processed_at = pg_catalog.now(),
      failure_category = NULL,
      error_message = '',
      updated_at = pg_catalog.now()
  WHERE id = delivery_row.id AND status_id = pending_status_id;

  RETURN pg_catalog.jsonb_build_object(
    'outcome', 'claimed',
    'delivery_id', delivery_row.id,
    'appointment_id', appointment_row.id,
    'idempotency_key', delivery_row.idempotency_key,
    'recipient', authoritative_email,
    'customer_name', (
      SELECT customer.full_name FROM public.customers AS customer
      WHERE customer.id = appointment_row.customer_id
        AND customer.business_id = appointment_row.business_id
    ),
    'business_name', business_name,
    'service_name', appointment_row.service_name_snapshot,
    'appointment_date', appointment_row.appointment_date,
    'start_time', appointment_row.start_time,
    'timezone', business_timezone,
    'staff_name', NULLIF(appointment_row.staff_name_snapshot, ''),
    'price', appointment_row.price_snapshot,
    'currency', currency_code,
    'scheduled_for', delivery_row.scheduled_for
  );
END;
$$;

ALTER FUNCTION public.claim_due_appointment_email_reminder() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_due_appointment_email_reminder()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_due_appointment_email_reminder()
  TO service_role;

-- Existing future appointments receive the default/configured reminder.
-- Historical appointments are intentionally excluded.
DO $$
DECLARE appointment_record record;
BEGIN
  FOR appointment_record IN
    SELECT appointment.id
    FROM public.appointments AS appointment
    JOIN public.business_settings AS settings
      ON settings.business_id = appointment.business_id
    WHERE appointment.status IN ('pending', 'confirmed')
      AND (appointment.appointment_date + appointment.start_time)
            AT TIME ZONE COALESCE(NULLIF(settings.timezone, ''), 'UTC')
          > pg_catalog.now()
  LOOP
    PERFORM public.reconcile_appointment_email_reminder(appointment_record.id);
  END LOOP;
END;
$$;

-- Phase 2D: additive rescheduling-email integration.
-- Existing creation/cancellation functions remain unchanged.

CREATE OR REPLACE FUNCTION public.enqueue_appointment_rescheduled_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  appointment_row public.appointments;
  email_channel_id uuid;
  pending_status_id uuid;
  customer_email text;
BEGIN
  SELECT appointment.* INTO appointment_row
  FROM public.appointments AS appointment
  WHERE appointment.id = NEW.appointment_id
    AND appointment.business_id = NEW.business_id;

  IF appointment_row.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_NOTIFICATION_CONTEXT_UNAVAILABLE';
  END IF;

  SELECT channel.id INTO email_channel_id
  FROM public.notification_channels AS channel WHERE channel.slug = 'email';
  SELECT status.id INTO pending_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'pending';
  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(customer.email)), '')
    INTO customer_email
  FROM public.customers AS customer
  WHERE customer.id = appointment_row.customer_id
    AND customer.business_id = appointment_row.business_id;

  IF email_channel_id IS NULL OR pending_status_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'CALORA_NOTIFICATION_CONFIGURATION_INVALID';
  END IF;

  INSERT INTO public.notification_deliveries (
    business_id, appointment_id, customer_id, channel_id, status_id,
    recipient, content, event_id, idempotency_key
  ) VALUES (
    appointment_row.business_id, appointment_row.id, appointment_row.customer_id,
    email_channel_id, pending_status_id, COALESCE(customer_email, ''),
    pg_catalog.jsonb_build_object('notification_type', 'appointment_rescheduling'),
    NEW.id, 'appointment-rescheduled-email:' || NEW.id::text
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enqueue_appointment_rescheduled_email() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_appointment_rescheduled_email()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointment_rescheduled_email_after_event
AFTER INSERT ON public.appointment_lifecycle_events
FOR EACH ROW
WHEN (NEW.event_type = 'appointment.rescheduled')
EXECUTE FUNCTION public.enqueue_appointment_rescheduled_email();

CREATE OR REPLACE FUNCTION public.claim_appointment_rescheduled_email(
  target_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivery_row public.notification_deliveries;
  processing_status_id uuid;
  cancelled_status_id uuid;
  authoritative_email text;
  payload jsonb;
BEGIN
  SELECT status.id INTO processing_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'processing';
  SELECT status.id INTO cancelled_status_id
  FROM public.notification_statuses AS status WHERE status.slug = 'cancelled';

  SELECT delivery.* INTO delivery_row
  FROM public.notification_deliveries AS delivery
  JOIN public.appointment_lifecycle_events AS event ON event.id = delivery.event_id
  JOIN public.notification_channels AS channel ON channel.id = delivery.channel_id
  JOIN public.notification_statuses AS status ON status.id = delivery.status_id
  WHERE delivery.appointment_id = target_appointment_id
    AND event.event_type = 'appointment.rescheduled'
    AND channel.slug = 'email'
    AND status.slug = 'pending'
  ORDER BY event.event_sequence
  LIMIT 1
  FOR UPDATE OF delivery SKIP LOCKED;

  IF delivery_row.id IS NULL THEN RETURN NULL; END IF;

  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(customer.email)), '')
    INTO authoritative_email
  FROM public.customers AS customer
  WHERE customer.id = delivery_row.customer_id
    AND customer.business_id = delivery_row.business_id;

  IF authoritative_email IS NULL THEN
    UPDATE public.notification_deliveries
    SET status_id = cancelled_status_id,
        processed_at = pg_catalog.now(),
        failure_category = 'recipient_missing',
        error_message = 'Customer email is unavailable.',
        updated_at = pg_catalog.now()
    WHERE id = delivery_row.id;
    RETURN pg_catalog.jsonb_build_object(
      'outcome', 'cancelled', 'delivery_id', delivery_row.id,
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
  WHERE id = delivery_row.id;

  SELECT pg_catalog.jsonb_build_object(
    'outcome', 'claimed',
    'event_type', event.event_type,
    'delivery_id', delivery_row.id,
    'event_id', delivery_row.event_id,
    'appointment_id', appointment.id,
    'idempotency_key', delivery_row.idempotency_key,
    'recipient', authoritative_email,
    'customer_name', customer.full_name,
    'business_name', COALESCE(NULLIF(settings.business_name, ''), business.name),
    'service_name', appointment.service_name_snapshot,
    'appointment_date', event.appointment_date,
    'start_time', event.start_time,
    'previous_appointment_date', event.metadata ->> 'previous_appointment_date',
    'previous_start_time', event.metadata ->> 'previous_start_time',
    'timezone', COALESCE(NULLIF(event.timezone, ''), NULLIF(settings.timezone, ''), 'UTC'),
    'staff_name', NULLIF(appointment.staff_name_snapshot, ''),
    'price', appointment.price_snapshot,
    'currency', COALESCE(NULLIF(settings.currency, ''), 'USD')
  ) INTO payload
  FROM public.appointments AS appointment
  JOIN public.appointment_lifecycle_events AS event ON event.id = delivery_row.event_id
  JOIN public.customers AS customer
    ON customer.id = appointment.customer_id
   AND customer.business_id = appointment.business_id
  JOIN public.businesses AS business ON business.id = appointment.business_id
  LEFT JOIN public.business_settings AS settings ON settings.business_id = appointment.business_id
  WHERE appointment.id = delivery_row.appointment_id
    AND appointment.business_id = delivery_row.business_id;

  IF payload IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_NOTIFICATION_CONTEXT_UNAVAILABLE';
  END IF;
  RETURN payload;
END;
$$;

ALTER FUNCTION public.claim_appointment_rescheduled_email(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_appointment_rescheduled_email(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_appointment_rescheduled_email(uuid)
  TO service_role;

COMMENT ON FUNCTION public.enqueue_appointment_rescheduled_email() IS
  'Creates one provider-independent email delivery after an authoritative appointment.rescheduled lifecycle event.';

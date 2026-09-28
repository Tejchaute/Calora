-- Phase 2C: enqueue customer email work only for authoritative
-- appointment.cancelled lifecycle events. Resend remains outside this transaction.

CREATE OR REPLACE FUNCTION public.enqueue_appointment_cancelled_email(
  lifecycle_event_id uuid,
  appointment_row public.appointments
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  email_channel_id uuid;
  pending_status_id uuid;
  customer_email text;
BEGIN
  SELECT channel.id INTO email_channel_id
  FROM public.notification_channels AS channel
  WHERE channel.slug = 'email';

  SELECT status.id INTO pending_status_id
  FROM public.notification_statuses AS status
  WHERE status.slug = 'pending';

  SELECT NULLIF(pg_catalog.lower(pg_catalog.btrim(customer.email)), '')
    INTO customer_email
  FROM public.customers AS customer
  WHERE customer.id = appointment_row.customer_id
    AND customer.business_id = appointment_row.business_id;

  IF email_channel_id IS NULL OR pending_status_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'CALORA_NOTIFICATION_CONFIGURATION_INVALID';
  END IF;

  INSERT INTO public.notification_deliveries (
    business_id, appointment_id, customer_id, channel_id, status_id,
    recipient, content, event_id, idempotency_key
  ) VALUES (
    appointment_row.business_id,
    appointment_row.id,
    appointment_row.customer_id,
    email_channel_id,
    pending_status_id,
    COALESCE(customer_email, ''),
    pg_catalog.jsonb_build_object('notification_type', 'appointment_cancellation'),
    lifecycle_event_id,
    'appointment-cancelled-email:' || lifecycle_event_id::text
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
END;
$$;

ALTER FUNCTION public.enqueue_appointment_cancelled_email(uuid, public.appointments) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_appointment_cancelled_email(uuid, public.appointments)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_appointment_lifecycle_event(
  appointment_row public.appointments,
  lifecycle_event_type text,
  lifecycle_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_sequence bigint;
  event_id uuid;
  business_timezone text;
BEGIN
  IF lifecycle_event_type NOT IN (
    'appointment.created', 'appointment.confirmed', 'appointment.cancelled',
    'appointment.rescheduled', 'appointment.completed'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_INVALID_APPOINTMENT_EVENT';
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC') INTO business_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = appointment_row.business_id;

  SELECT COALESCE(MAX(event.event_sequence), 0) + 1 INTO next_sequence
  FROM public.appointment_lifecycle_events AS event
  WHERE event.appointment_id = appointment_row.id;

  INSERT INTO public.appointment_lifecycle_events (
    business_id, appointment_id, customer_id, service_id, staff_id,
    event_type, event_sequence, appointment_date, start_time, end_time,
    timezone, actor_id, metadata, idempotency_key
  ) VALUES (
    appointment_row.business_id, appointment_row.id, appointment_row.customer_id,
    appointment_row.service_id, appointment_row.staff_id, lifecycle_event_type,
    next_sequence, appointment_row.appointment_date, appointment_row.start_time,
    appointment_row.end_time, COALESCE(business_timezone, 'UTC'), auth.uid(),
    COALESCE(lifecycle_metadata, '{}'::jsonb),
    appointment_row.id::text || ':' || next_sequence::text || ':' || lifecycle_event_type
  )
  RETURNING id INTO event_id;

  IF lifecycle_event_type = 'appointment.created' THEN
    PERFORM public.enqueue_appointment_created_email(event_id, appointment_row);
  ELSIF lifecycle_event_type = 'appointment.cancelled' THEN
    PERFORM public.enqueue_appointment_cancelled_email(event_id, appointment_row);
  END IF;

  RETURN event_id;
END;
$$;

ALTER FUNCTION public.record_appointment_lifecycle_event(public.appointments, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_appointment_lifecycle_event(public.appointments, text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_appointment_email(
  target_appointment_id uuid,
  target_event_type text
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
  IF target_event_type NOT IN ('appointment.created', 'appointment.cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_NOTIFICATION_EVENT_UNSUPPORTED';
  END IF;

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
    AND event.event_type = target_event_type
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

ALTER FUNCTION public.claim_appointment_email(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_appointment_email(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_appointment_email(uuid, text) TO service_role;

COMMENT ON FUNCTION public.claim_appointment_email(uuid, text) IS
  'Service-role-only atomic claim for supported appointment lifecycle emails; recipient and content context are resolved authoritatively.';

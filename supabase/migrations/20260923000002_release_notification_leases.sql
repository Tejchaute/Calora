-- Bounded leases on existing delivery rows; no second queue or scheduler.
SET lock_timeout = '3s';
ALTER TABLE public.notification_deliveries
  ADD COLUMN claim_token uuid,
  ADD COLUMN claim_expires_at timestamptz,
  ADD COLUMN first_claim_at timestamptz,
  ADD COLUMN attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 3),
  ADD COLUMN claim_payload jsonb;

CREATE OR REPLACE FUNCTION public.recover_appointment_email_claims()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE item record; recovered integer := 0;
BEGIN
  FOR item IN
    SELECT d.id, d.attempt_count, d.first_claim_at
    FROM public.notification_deliveries d
    JOIN public.notification_statuses s ON s.id = d.status_id
    JOIN public.notification_channels c ON c.id = d.channel_id
    WHERE c.slug = 'email' AND s.slug = 'processing'
      AND COALESCE(d.claim_expires_at, d.processed_at + interval '10 minutes', d.updated_at + interval '10 minutes') < clock_timestamp()
    ORDER BY d.updated_at LIMIT 100 FOR UPDATE OF d SKIP LOCKED
  LOOP
    UPDATE public.notification_deliveries
    SET status_id = (SELECT id FROM public.notification_statuses WHERE slug =
        CASE WHEN item.attempt_count < 3 AND item.first_claim_at > clock_timestamp() - interval '23 hours'
          THEN 'pending' ELSE 'failed' END),
      claim_token = NULL, claim_expires_at = NULL,
      failure_category = CASE WHEN item.attempt_count < 3 AND item.first_claim_at > clock_timestamp() - interval '23 hours'
        THEN 'claim_expired' ELSE 'retry_exhausted' END,
      error_message = 'Delivery worker lease expired.', updated_at = clock_timestamp()
    WHERE id = item.id;
    recovered := recovered + 1;
  END LOOP;
  RETURN recovered;
END;
$$;
REVOKE ALL ON FUNCTION public.recover_appointment_email_claims() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recover_appointment_email_claims() TO service_role;

-- Executed inside the same transaction as the original SKIP LOCKED claim.
CREATE OR REPLACE FUNCTION public.lease_appointment_email_claim(payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE d public.notification_deliveries; token uuid := gen_random_uuid();
BEGIN
  IF payload IS NULL OR payload->>'outcome' <> 'claimed' THEN RETURN payload; END IF;
  SELECT * INTO d FROM public.notification_deliveries WHERE id = (payload->>'delivery_id')::uuid FOR UPDATE;
  IF d.attempt_count >= 3 OR (d.first_claim_at IS NOT NULL AND d.first_claim_at <= clock_timestamp() - interval '23 hours') THEN
    UPDATE public.notification_deliveries SET status_id = (SELECT id FROM public.notification_statuses WHERE slug='failed'),
      failure_category='retry_exhausted', claim_token=NULL, claim_expires_at=NULL WHERE id=d.id;
    RETURN NULL;
  END IF;
  UPDATE public.notification_deliveries SET
    claim_token=token, claim_expires_at=clock_timestamp()+interval '10 minutes',
    first_claim_at=COALESCE(first_claim_at,clock_timestamp()), attempt_count=attempt_count+1,
    claim_payload=COALESCE(claim_payload,payload)
  WHERE id=d.id;
  RETURN COALESCE(d.claim_payload,payload) || jsonb_build_object('claim_token',token);
END;
$$;
REVOKE ALL ON FUNCTION public.lease_appointment_email_claim(jsonb) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.validate_appointment_email_claim(target_delivery_id uuid, target_claim_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE d public.notification_deliveries; a public.appointments; e public.appointment_lifecycle_events;
  zone text; kind text; eligible boolean;
BEGIN
  SELECT delivery.* INTO d FROM public.notification_deliveries delivery
  JOIN public.notification_statuses s ON s.id=delivery.status_id
  WHERE delivery.id=target_delivery_id AND delivery.claim_token=target_claim_token
    AND delivery.claim_expires_at > clock_timestamp() AND s.slug='processing' FOR UPDATE OF delivery;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO a FROM public.appointments WHERE id=d.appointment_id AND business_id=d.business_id;
  SELECT * INTO e FROM public.appointment_lifecycle_events WHERE id=d.event_id AND business_id=d.business_id;
  SELECT COALESCE(timezone,'UTC') INTO zone FROM public.business_settings WHERE business_id=d.business_id;
  kind := d.content->>'notification_type';
  eligible := a.id IS NOT NULL AND public.is_business_notification_enabled(d.business_id,kind);
  IF kind IN ('appointment_rescheduling','appointment_reminder') THEN
    eligible := eligible AND a.status IN ('pending','scheduled','confirmed')
      AND ((a.appointment_date+a.start_time) AT TIME ZONE COALESCE(zone,'UTC')) > clock_timestamp()
      AND public.has_active_subscription(d.business_id);
  END IF;
  IF kind='appointment_rescheduling' THEN
    eligible := eligible AND e.id IS NOT NULL
      AND (a.appointment_date,a.start_time,a.end_time,a.staff_id,a.service_id)
        IS NOT DISTINCT FROM (e.appointment_date,e.start_time,e.end_time,e.staff_id,e.service_id)
      AND NOT EXISTS (SELECT 1 FROM public.appointment_lifecycle_events newer
        WHERE newer.appointment_id=a.id AND newer.event_sequence>e.event_sequence
          AND newer.event_type IN ('appointment.rescheduled','appointment.cancelled','appointment.completed'));
  ELSIF kind='appointment_reminder' THEN
    eligible := eligible AND d.scheduled_for = ((a.appointment_date+a.start_time) AT TIME ZONE COALESCE(zone,'UTC'))
      AND d.reminder_lead_minutes = (SELECT COALESCE(reminder_hours_before,24)*60 FROM public.notification_settings WHERE business_id=d.business_id);
  END IF;
  IF NOT COALESCE(eligible,false) THEN
    UPDATE public.notification_deliveries SET status_id=(SELECT id FROM public.notification_statuses WHERE slug='cancelled'),
      failure_category='delivery_ineligible', error_message='Delivery no longer matches the appointment.',
      claim_token=NULL,claim_expires_at=NULL,updated_at=clock_timestamp() WHERE id=d.id;
    RETURN false;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_appointment_email_claim(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_appointment_email_claim(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_appointment_email_claim(
 target_delivery_id uuid,target_idempotency_key text,target_claim_token uuid,
 target_state text,target_provider_message_id text DEFAULT NULL,target_failure_category text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE d public.notification_deliveries; next_state text;
BEGIN
 IF target_state IS NULL OR target_state NOT IN ('sent','failed') THEN RAISE EXCEPTION 'CALORA_NOTIFICATION_STATE_INVALID'; END IF;
 SELECT delivery.* INTO d FROM public.notification_deliveries delivery JOIN public.notification_statuses s ON s.id=delivery.status_id
 WHERE delivery.id=target_delivery_id AND delivery.idempotency_key=target_idempotency_key
   AND delivery.claim_token=target_claim_token AND s.slug='processing' FOR UPDATE OF delivery;
 IF NOT FOUND THEN RETURN; END IF; -- expired worker must not overwrite another attempt
 next_state := CASE WHEN target_state='failed' AND target_failure_category IN ('network','timeout')
   AND d.attempt_count<3 AND d.first_claim_at>clock_timestamp()-interval '23 hours' THEN 'processing' ELSE target_state END;
 UPDATE public.notification_deliveries SET status_id=(SELECT id FROM public.notification_statuses WHERE slug=next_state),
   provider_message_id=CASE WHEN target_state='sent' THEN target_provider_message_id ELSE NULL END,
   sent_at=CASE WHEN target_state='sent' THEN clock_timestamp() ELSE NULL END,
   failure_category=CASE WHEN target_state='failed' THEN COALESCE(target_failure_category,'provider_failure') ELSE NULL END,
   error_message=CASE WHEN target_state='failed' THEN 'Appointment email could not be delivered.' ELSE '' END,
   claim_expires_at=CASE WHEN next_state='processing' THEN clock_timestamp()+interval '10 minutes' ELSE NULL END,
   claim_token=CASE WHEN next_state='processing' THEN claim_token ELSE NULL END, updated_at=clock_timestamp()
 WHERE id=d.id;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_appointment_email_claim(uuid,text,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_appointment_email_claim(uuid,text,uuid,text,text,text) TO service_role;

-- Existing workers may finish their first attempt during a rolling deployment,
-- but can never complete a recovered/newer attempt without its token.
CREATE OR REPLACE FUNCTION public.complete_appointment_email(target_delivery_id uuid, target_idempotency_key text, target_state text, target_provider_message_id text DEFAULT NULL::text, target_failure_category text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE next_status_id uuid;
BEGIN
  IF target_state NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_NOTIFICATION_STATE_INVALID';
  END IF;

  SELECT status.id INTO next_status_id
  FROM public.notification_statuses AS status
  WHERE status.slug = target_state;

  UPDATE public.notification_deliveries AS delivery
  SET status_id = next_status_id,
      provider_message_id = CASE WHEN target_state = 'sent' THEN target_provider_message_id ELSE NULL END,
      sent_at = CASE WHEN target_state = 'sent' THEN pg_catalog.now() ELSE NULL END,
      failure_category = CASE WHEN target_state = 'failed' THEN COALESCE(target_failure_category, 'provider_failure') ELSE NULL END,
      error_message = CASE WHEN target_state = 'failed' THEN 'Appointment email could not be delivered.' ELSE '' END,
      updated_at = pg_catalog.now()
  FROM public.notification_statuses AS current_status
  WHERE delivery.id = target_delivery_id
    AND delivery.idempotency_key = target_idempotency_key
    AND current_status.id = delivery.status_id
    AND current_status.slug = 'processing'
    AND delivery.attempt_count <= 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_NOTIFICATION_DELIVERY_NOT_PROCESSING';
  END IF;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_appointment_email(target_appointment_id uuid, target_event_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  delivery_row public.notification_deliveries;
  processing_status_id uuid;
  cancelled_status_id uuid;
  authoritative_email text;
  payload jsonb;
BEGIN
  PERFORM public.recover_appointment_email_claims();
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
  payload := public.lease_appointment_email_claim(payload);
  IF payload IS NOT NULL AND NOT public.validate_appointment_email_claim(
    (payload->>'delivery_id')::uuid,(payload->>'claim_token')::uuid) THEN RETURN NULL; END IF;
  RETURN payload;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_appointment_rescheduled_email(target_appointment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  delivery_row public.notification_deliveries;
  processing_status_id uuid;
  cancelled_status_id uuid;
  authoritative_email text;
  payload jsonb;
BEGIN
  PERFORM public.recover_appointment_email_claims();
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
  payload := public.lease_appointment_email_claim(payload);
  IF payload IS NOT NULL AND NOT public.validate_appointment_email_claim(
    (payload->>'delivery_id')::uuid,(payload->>'claim_token')::uuid) THEN RETURN NULL; END IF;
  RETURN payload;
END;
$function$
;

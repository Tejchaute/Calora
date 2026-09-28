CREATE OR REPLACE FUNCTION public.claim_due_appointment_email_reminder()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  PERFORM public.recover_appointment_email_claims();
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
     OR appointment_row.status NOT IN ('pending', 'scheduled', 'confirmed')
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

  RETURN public.lease_appointment_email_claim(pg_catalog.jsonb_build_object(
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
  ));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.list_retryable_appointment_emails()
RETURNS TABLE(appointment_id uuid,event_type text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 PERFORM public.recover_appointment_email_claims();
 RETURN QUERY SELECT d.appointment_id,e.event_type
 FROM public.notification_deliveries d
 JOIN public.notification_statuses s ON s.id=d.status_id
 JOIN public.appointment_lifecycle_events e ON e.id=d.event_id
 JOIN public.notification_channels c ON c.id=d.channel_id
 WHERE s.slug='pending' AND c.slug='email'
   AND e.event_type IN ('appointment.created','appointment.cancelled','appointment.rescheduled')
 ORDER BY d.created_at LIMIT 25;
END;
$$;
REVOKE ALL ON FUNCTION public.list_retryable_appointment_emails() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_retryable_appointment_emails() TO service_role;
-- Compatibility entry point delegates to the same lease-aware claim.
CREATE OR REPLACE FUNCTION public.claim_appointment_created_email(target_appointment_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.claim_appointment_email(target_appointment_id,'appointment.created'); $$;

-- Use lifecycle-neutral completion semantics for both created and cancelled email work.

CREATE OR REPLACE FUNCTION public.complete_appointment_email(
  target_delivery_id uuid,
  target_idempotency_key text,
  target_state text,
  target_provider_message_id text DEFAULT NULL,
  target_failure_category text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    AND current_status.slug = 'processing';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_NOTIFICATION_DELIVERY_NOT_PROCESSING';
  END IF;
END;
$$;

ALTER FUNCTION public.complete_appointment_email(uuid, text, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_appointment_email(uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_appointment_email(uuid, text, text, text, text)
  TO service_role;

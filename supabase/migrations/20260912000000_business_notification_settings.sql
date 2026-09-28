-- Phase 2F: business-owned operational customer email controls.
-- Lifecycle events remain authoritative; settings govern delivery eligibility.

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS send_rescheduling boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'notification_settings_reminder_hours_range'
      AND conrelid = 'public.notification_settings'::regclass
  ) THEN
    ALTER TABLE public.notification_settings
      ADD CONSTRAINT notification_settings_reminder_hours_range
      CHECK (reminder_hours_before BETWEEN 1 AND 720) NOT VALID;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_notification_enabled(
  target_business_id uuid,
  target_notification_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE target_notification_type
    WHEN 'appointment_confirmation' THEN
      COALESCE(settings.email_enabled, true)
      AND COALESCE(settings.send_confirmations, true)
    WHEN 'appointment_cancellation' THEN
      COALESCE(settings.email_enabled, true)
      AND COALESCE(settings.send_cancellations, true)
    WHEN 'appointment_rescheduling' THEN
      COALESCE(settings.email_enabled, true)
      AND COALESCE(settings.send_rescheduling, true)
    WHEN 'appointment_reminder' THEN
      COALESCE(settings.email_enabled, true)
      AND COALESCE(settings.send_reminders, true)
    ELSE false
  END
  FROM (SELECT target_business_id AS business_id) AS requested
  LEFT JOIN public.notification_settings AS settings
    ON settings.business_id = requested.business_id;
$$;

ALTER FUNCTION public.is_business_notification_enabled(uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_notification_enabled(uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_notification_delivery_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE notification_type text;
BEGIN
  notification_type := NEW.content ->> 'notification_type';
  IF notification_type IN (
    'appointment_confirmation',
    'appointment_cancellation',
    'appointment_rescheduling',
    'appointment_reminder'
  ) AND NOT public.is_business_notification_enabled(
    NEW.business_id,
    notification_type
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_notification_delivery_settings() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enforce_notification_delivery_settings()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_notification_delivery_settings_before_insert
  ON public.notification_deliveries;
CREATE TRIGGER enforce_notification_delivery_settings_before_insert
BEFORE INSERT ON public.notification_deliveries
FOR EACH ROW EXECUTE FUNCTION public.enforce_notification_delivery_settings();

CREATE OR REPLACE FUNCTION public.cancel_disabled_notification_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE cancelled_status_id uuid;
BEGIN
  SELECT status.id INTO cancelled_status_id
  FROM public.notification_statuses AS status
  WHERE status.slug = 'cancelled';

  UPDATE public.notification_deliveries AS delivery
  SET status_id = cancelled_status_id,
      processed_at = pg_catalog.now(),
      failure_category = 'notification_disabled',
      error_message = 'Notification disabled by business settings.',
      updated_at = pg_catalog.now()
  FROM public.notification_statuses AS current_status,
       public.notification_channels AS channel
  WHERE delivery.business_id = NEW.business_id
    AND current_status.id = delivery.status_id
    AND current_status.slug = 'pending'
    AND channel.id = delivery.channel_id
    AND channel.slug = 'email'
    AND delivery.content ->> 'notification_type' IN (
      'appointment_confirmation',
      'appointment_cancellation',
      'appointment_rescheduling',
      'appointment_reminder'
    )
    AND NOT public.is_business_notification_enabled(
      delivery.business_id,
      delivery.content ->> 'notification_type'
    );

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.cancel_disabled_notification_deliveries() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cancel_disabled_notification_deliveries()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cancel_disabled_notification_deliveries_after_settings
  ON public.notification_settings;
CREATE TRIGGER cancel_disabled_notification_deliveries_after_settings
AFTER INSERT OR UPDATE OF
  email_enabled,
  send_confirmations,
  send_cancellations,
  send_rescheduling,
  send_reminders
ON public.notification_settings
FOR EACH ROW EXECUTE FUNCTION public.cancel_disabled_notification_deliveries();

CREATE OR REPLACE FUNCTION public.update_notification_settings(
  target_business_id uuid,
  target_send_confirmations boolean,
  target_send_cancellations boolean,
  target_send_rescheduling boolean,
  target_send_reminders boolean,
  target_reminder_hours_before integer,
  expected_updated_at timestamptz DEFAULT NULL
)
RETURNS public.notification_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  previous_settings public.notification_settings;
  saved_settings public.notification_settings;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_business_admin(target_business_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'CALORA_NOTIFICATION_SETTINGS_FORBIDDEN';
  END IF;

  IF target_reminder_hours_before IS NULL
     OR target_reminder_hours_before NOT BETWEEN 1 AND 720 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'CALORA_NOTIFICATION_REMINDER_HOURS_INVALID';
  END IF;

  SELECT settings.* INTO previous_settings
  FROM public.notification_settings AS settings
  WHERE settings.business_id = target_business_id
  FOR UPDATE;

  IF previous_settings.id IS NULL THEN
    IF expected_updated_at IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'CALORA_NOTIFICATION_SETTINGS_STALE';
    END IF;

    INSERT INTO public.notification_settings (
      business_id,
      email_enabled,
      send_confirmations,
      send_cancellations,
      send_rescheduling,
      send_reminders,
      reminder_hours_before
    ) VALUES (
      target_business_id,
      target_send_confirmations OR target_send_cancellations
        OR target_send_rescheduling OR target_send_reminders,
      target_send_confirmations,
      target_send_cancellations,
      target_send_rescheduling,
      target_send_reminders,
      target_reminder_hours_before
    )
    RETURNING * INTO saved_settings;
  ELSE
    IF expected_updated_at IS NULL
       OR previous_settings.updated_at IS DISTINCT FROM expected_updated_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'CALORA_NOTIFICATION_SETTINGS_STALE';
    END IF;

    UPDATE public.notification_settings AS settings
    SET email_enabled =
          target_send_confirmations OR target_send_cancellations
          OR target_send_rescheduling OR target_send_reminders,
        send_confirmations = target_send_confirmations,
        send_cancellations = target_send_cancellations,
        send_rescheduling = target_send_rescheduling,
        send_reminders = target_send_reminders,
        reminder_hours_before = target_reminder_hours_before,
        updated_at = pg_catalog.now()
    WHERE settings.id = previous_settings.id
    RETURNING * INTO saved_settings;
  END IF;

  INSERT INTO public.audit_logs (
    business_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  ) VALUES (
    target_business_id,
    auth.uid(),
    'notification_settings.updated',
    'notification_settings',
    saved_settings.id,
    pg_catalog.jsonb_build_object(
      'previous', CASE
        WHEN previous_settings.id IS NULL THEN NULL
        ELSE pg_catalog.jsonb_build_object(
          'send_confirmations', previous_settings.send_confirmations,
          'send_cancellations', previous_settings.send_cancellations,
          'send_rescheduling', previous_settings.send_rescheduling,
          'send_reminders', previous_settings.send_reminders,
          'reminder_hours_before', previous_settings.reminder_hours_before
        )
      END,
      'current', pg_catalog.jsonb_build_object(
        'send_confirmations', saved_settings.send_confirmations,
        'send_cancellations', saved_settings.send_cancellations,
        'send_rescheduling', saved_settings.send_rescheduling,
        'send_reminders', saved_settings.send_reminders,
        'reminder_hours_before', saved_settings.reminder_hours_before
      )
    )
  );

  RETURN saved_settings;
END;
$$;

ALTER FUNCTION public.update_notification_settings(
  uuid, boolean, boolean, boolean, boolean, integer, timestamptz
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_notification_settings(
  uuid, boolean, boolean, boolean, boolean, integer, timestamptz
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_notification_settings(
  uuid, boolean, boolean, boolean, boolean, integer, timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.update_notification_settings(
  uuid, boolean, boolean, boolean, boolean, integer, timestamptz
) IS 'Owner/admin-only atomic notification settings update with optimistic concurrency.';

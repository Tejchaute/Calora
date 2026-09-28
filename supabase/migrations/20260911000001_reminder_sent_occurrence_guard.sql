-- Do not recreate a reminder for an unchanged appointment occurrence after
-- one was already sent. A genuinely new scheduled_for value remains eligible.

CREATE OR REPLACE FUNCTION public.prevent_duplicate_sent_appointment_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.content ->> 'notification_type' <> 'appointment_reminder' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notification_deliveries AS delivery
    JOIN public.notification_statuses AS status
      ON status.id = delivery.status_id
    WHERE delivery.appointment_id = NEW.appointment_id
      AND delivery.channel_id = NEW.channel_id
      AND delivery.content ->> 'notification_type' = 'appointment_reminder'
      AND delivery.scheduled_for = NEW.scheduled_for
      AND status.slug = 'sent'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.prevent_duplicate_sent_appointment_reminder() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prevent_duplicate_sent_appointment_reminder()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_duplicate_sent_appointment_reminder_before_insert
BEFORE INSERT ON public.notification_deliveries
FOR EACH ROW
WHEN ((NEW.content ->> 'notification_type') = 'appointment_reminder')
EXECUTE FUNCTION public.prevent_duplicate_sent_appointment_reminder();

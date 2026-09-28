-- Provider-independent appointment lifecycle and notification delivery foundation.
-- Scheduling validation remains owned by save_appointment(_core).

CREATE TABLE public.appointment_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'appointment.created',
    'appointment.confirmed',
    'appointment.cancelled',
    'appointment.rescheduled',
    'appointment.completed'
  )),
  event_sequence bigint NOT NULL CHECK (event_sequence > 0),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone text NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  idempotency_key text NOT NULL UNIQUE,
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  UNIQUE (appointment_id, event_sequence)
);

CREATE UNIQUE INDEX appointment_lifecycle_created_once_idx
  ON public.appointment_lifecycle_events (appointment_id)
  WHERE event_type = 'appointment.created';
CREATE INDEX appointment_lifecycle_events_business_created_idx
  ON public.appointment_lifecycle_events (business_id, created_at DESC);
CREATE INDEX appointment_lifecycle_events_appointment_idx
  ON public.appointment_lifecycle_events (appointment_id, event_sequence);

ALTER TABLE public.appointment_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointment_lifecycle_events_select
  ON public.appointment_lifecycle_events
  FOR SELECT TO authenticated
  USING (public.is_business_member_record(business_id));

REVOKE ALL ON TABLE public.appointment_lifecycle_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.appointment_lifecycle_events TO authenticated;

-- Extend the existing delivery model instead of creating a competing queue.
ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.appointment_lifecycle_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_event_recipient_unique
  ON public.notification_deliveries (event_id, channel_id, recipient)
  WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_idempotency_key_unique
  ON public.notification_deliveries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

INSERT INTO public.notification_statuses (name, slug, sort_order) VALUES
  ('Processing', 'processing', 2),
  ('Cancelled', 'cancelled', 6)
ON CONFLICT (slug) DO NOTHING;

-- Delivery writes belong to a future trusted dispatcher/provider, never a browser.
DROP POLICY IF EXISTS notification_deliveries_insert ON public.notification_deliveries;
DROP POLICY IF EXISTS notification_deliveries_update ON public.notification_deliveries;
DROP POLICY IF EXISTS notification_deliveries_delete ON public.notification_deliveries;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.notification_deliveries FROM PUBLIC, anon, authenticated;

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
    'appointment.created',
    'appointment.confirmed',
    'appointment.cancelled',
    'appointment.rescheduled',
    'appointment.completed'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_INVALID_APPOINTMENT_EVENT';
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC')
    INTO business_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = appointment_row.business_id;

  SELECT COALESCE(MAX(event.event_sequence), 0) + 1
    INTO next_sequence
  FROM public.appointment_lifecycle_events AS event
  WHERE event.appointment_id = appointment_row.id;

  INSERT INTO public.appointment_lifecycle_events (
    business_id, appointment_id, customer_id, service_id, staff_id,
    event_type, event_sequence, appointment_date, start_time, end_time,
    timezone, actor_id, metadata, idempotency_key
  ) VALUES (
    appointment_row.business_id,
    appointment_row.id,
    appointment_row.customer_id,
    appointment_row.service_id,
    appointment_row.staff_id,
    lifecycle_event_type,
    next_sequence,
    appointment_row.appointment_date,
    appointment_row.start_time,
    appointment_row.end_time,
    COALESCE(business_timezone, 'UTC'),
    auth.uid(),
    COALESCE(lifecycle_metadata, '{}'::jsonb),
    appointment_row.id::text || ':' || next_sequence::text || ':' || lifecycle_event_type
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

ALTER FUNCTION public.record_appointment_lifecycle_event(public.appointments, text, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.record_appointment_lifecycle_event(public.appointments, text, jsonb)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.emit_appointment_lifecycle_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.record_appointment_lifecycle_event(
      NEW,
      'appointment.created',
      pg_catalog.jsonb_build_object('initial_status', NEW.status)
    );
    RETURN NEW;
  END IF;

  IF (OLD.appointment_date, OLD.start_time, OLD.end_time, OLD.staff_id, OLD.service_id)
     IS DISTINCT FROM
     (NEW.appointment_date, NEW.start_time, NEW.end_time, NEW.staff_id, NEW.service_id) THEN
    PERFORM public.record_appointment_lifecycle_event(
      NEW,
      'appointment.rescheduled',
      pg_catalog.jsonb_build_object(
        'previous_appointment_date', OLD.appointment_date,
        'previous_start_time', OLD.start_time,
        'previous_end_time', OLD.end_time,
        'previous_staff_id', OLD.staff_id,
        'previous_service_id', OLD.service_id
      )
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.record_appointment_lifecycle_event(NEW, 'appointment.confirmed', pg_catalog.jsonb_build_object('previous_status', OLD.status));
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.record_appointment_lifecycle_event(NEW, 'appointment.cancelled', pg_catalog.jsonb_build_object('previous_status', OLD.status));
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.record_appointment_lifecycle_event(NEW, 'appointment.completed', pg_catalog.jsonb_build_object('previous_status', OLD.status));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.emit_appointment_lifecycle_events() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.emit_appointment_lifecycle_events() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS appointment_lifecycle_events_after_write ON public.appointments;
CREATE TRIGGER appointment_lifecycle_events_after_write
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.emit_appointment_lifecycle_events();

COMMENT ON TABLE public.appointment_lifecycle_events IS
  'Immutable provider-independent facts emitted by authoritative appointment writes.';
COMMENT ON COLUMN public.appointment_lifecycle_events.metadata IS
  'Lifecycle context only; customer contact details and authentication data are intentionally excluded.';

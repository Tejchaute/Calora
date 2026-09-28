-- Authoritative, concurrency-safe appointment availability enforcement.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_phone_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_email_snapshot text,
  ADD COLUMN IF NOT EXISTS staff_name_snapshot text;

CREATE OR REPLACE FUNCTION public.save_appointment(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_end_time time,
  p_notes text DEFAULT '',
  p_status text DEFAULT 'pending',
  p_appointment_id uuid DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_is_member boolean := false;
  selected_staff_id uuid;
  selected_staff_name text;
  selected_service public.services%ROWTYPE;
  selected_customer public.customers%ROWTYPE;
  business_hours public.working_hours%ROWTYPE;
  staff_hours public.working_hours%ROWTYPE;
  candidate record;
  result public.appointments%ROWTYPE;
  business_timezone text := 'UTC';
  minimum_notice integer := 0;
  maximum_advance integer := 90;
  buffer_minutes integer := 0;
  public_auto_confirm boolean := false;
  requested_start_at timestamptz;
  requested_duration integer;
  effective_status text;
  day_number integer;
BEGIN
  IF p_business_id IS NULL
     OR p_customer_id IS NULL
     OR p_service_id IS NULL
     OR p_appointment_date IS NULL
     OR p_start_time IS NULL
     OR p_end_time IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_INVALID_APPOINTMENT';
  END IF;

  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_INVALID_TIME_RANGE';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses AS business
    WHERE business.id = p_business_id
      AND business.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_BUSINESS_UNAVAILABLE';
  END IF;

  caller_is_member := auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.business_members AS membership
    WHERE membership.business_id = p_business_id
      AND membership.profile_id = auth.uid()
      AND membership.status = 'active'
  );

  IF NOT public.has_active_subscription(p_business_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_ACCESS_REQUIRED';
  END IF;

  IF p_appointment_id IS NOT NULL THEN
    IF NOT caller_is_member THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_NOT_AUTHORIZED';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.appointments AS appointment
      WHERE appointment.id = p_appointment_id
        AND appointment.business_id = p_business_id
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_APPOINTMENT_NOT_FOUND';
    END IF;
  ELSIF NOT caller_is_member AND NOT EXISTS (
    SELECT 1
    FROM public.business_settings AS settings
    WHERE settings.business_id = p_business_id
      AND settings.booking_page_slug IS NOT NULL
      AND settings.booking_page_slug <> ''
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_NOT_AUTHORIZED';
  END IF;

  SELECT service.*
  INTO selected_service
  FROM public.services AS service
  WHERE service.id = p_service_id
    AND service.business_id = p_business_id
    AND service.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_SERVICE_UNAVAILABLE';
  END IF;

  SELECT customer.*
  INTO selected_customer
  FROM public.customers AS customer
  WHERE customer.id = p_customer_id
    AND customer.business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_CUSTOMER_INVALID';
  END IF;

  requested_duration := (EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 60)::integer;
  IF requested_duration <= 0 OR requested_duration <> selected_service.duration THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_DURATION_MISMATCH';
  END IF;

  SELECT
    COALESCE(settings.timezone, 'UTC')
  INTO business_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = p_business_id;

  business_timezone := COALESCE(business_timezone, 'UTC');

  SELECT
    booking.min_lead_time_hours,
    booking.max_advance_days,
    booking.buffer_time_minutes,
    booking.auto_confirm
  INTO minimum_notice, maximum_advance, buffer_minutes, public_auto_confirm
  FROM public.booking_settings AS booking
  WHERE booking.business_id = p_business_id;

  minimum_notice := COALESCE(minimum_notice, 0);
  maximum_advance := COALESCE(maximum_advance, 90);
  buffer_minutes := COALESCE(buffer_minutes, 0);
  public_auto_confirm := COALESCE(public_auto_confirm, false);
  requested_start_at := (p_appointment_date + p_start_time) AT TIME ZONE business_timezone;

  IF requested_start_at < pg_catalog.now() + pg_catalog.make_interval(hours => minimum_notice) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_MINIMUM_NOTICE';
  END IF;

  IF p_appointment_date > ((pg_catalog.now() AT TIME ZONE business_timezone)::date + maximum_advance) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_BOOKING_HORIZON';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.business_holidays AS holiday
    WHERE holiday.business_id = p_business_id
      AND holiday.date = p_appointment_date
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_HOLIDAY';
  END IF;

  day_number := EXTRACT(DOW FROM p_appointment_date)::integer;

  SELECT hours.*
  INTO business_hours
  FROM public.working_hours AS hours
  WHERE hours.business_id = p_business_id
    AND hours.staff_id IS NULL
    AND hours.day_of_week = day_number;

  IF NOT FOUND OR NOT business_hours.is_open THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_CLOSED_DAY';
  END IF;

  IF business_hours.open_time IS NULL
     OR business_hours.close_time IS NULL
     OR p_start_time < business_hours.open_time
     OR p_end_time > business_hours.close_time THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_OUTSIDE_WORKING_HOURS';
  END IF;

  IF business_hours.break_start IS NOT NULL
     AND business_hours.break_end IS NOT NULL
     AND business_hours.break_start < p_end_time
     AND business_hours.break_end > p_start_time THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_DURING_BREAK';
  END IF;

  -- Serialize all booking decisions for one business/date. This protects
  -- explicit staff selections and automatic "any staff" assignment alike.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_business_id::text || ':' || p_appointment_date::text, 0)
  );

  IF p_staff_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.staff AS appointment_staff
      JOIN public.staff_services AS assignment
        ON assignment.staff_id = appointment_staff.id
       AND assignment.service_id = p_service_id
      WHERE appointment_staff.id = p_staff_id
        AND appointment_staff.business_id = p_business_id
        AND appointment_staff.status = 'active'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_STAFF_SERVICE_UNAVAILABLE';
    END IF;

    selected_staff_id := p_staff_id;
  ELSE
    FOR candidate IN
      SELECT appointment_staff.id
      FROM public.staff AS appointment_staff
      JOIN public.staff_services AS assignment
        ON assignment.staff_id = appointment_staff.id
       AND assignment.service_id = p_service_id
      WHERE appointment_staff.business_id = p_business_id
        AND appointment_staff.status = 'active'
      ORDER BY appointment_staff.id
    LOOP
      SELECT hours.*
      INTO staff_hours
      FROM public.working_hours AS hours
      WHERE hours.business_id = p_business_id
        AND hours.staff_id = candidate.id
        AND hours.day_of_week = day_number;

      IF NOT FOUND THEN
        staff_hours := business_hours;
      END IF;

      IF staff_hours.is_open
         AND staff_hours.open_time IS NOT NULL
         AND staff_hours.close_time IS NOT NULL
         AND p_start_time >= staff_hours.open_time
         AND p_end_time <= staff_hours.close_time
         AND NOT (
           staff_hours.break_start IS NOT NULL
           AND staff_hours.break_end IS NOT NULL
           AND staff_hours.break_start < p_end_time
           AND staff_hours.break_end > p_start_time
         )
         AND NOT EXISTS (
           SELECT 1
           FROM public.appointments AS appointment
           WHERE appointment.business_id = p_business_id
             AND appointment.staff_id = candidate.id
             AND appointment.appointment_date = p_appointment_date
             AND appointment.status <> 'cancelled'
             AND appointment.id IS DISTINCT FROM p_appointment_id
             AND appointment.start_time < p_end_time + pg_catalog.make_interval(mins => buffer_minutes)
             AND appointment.end_time > p_start_time - pg_catalog.make_interval(mins => buffer_minutes)
         ) THEN
        selected_staff_id := candidate.id;
        EXIT;
      END IF;
    END LOOP;

    IF selected_staff_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_TIME_UNAVAILABLE';
    END IF;
  END IF;

  SELECT hours.*
  INTO staff_hours
  FROM public.working_hours AS hours
  WHERE hours.business_id = p_business_id
    AND hours.staff_id = selected_staff_id
    AND hours.day_of_week = day_number;

  IF NOT FOUND THEN
    staff_hours := business_hours;
  END IF;

  IF NOT staff_hours.is_open
     OR staff_hours.open_time IS NULL
     OR staff_hours.close_time IS NULL
     OR p_start_time < staff_hours.open_time
     OR p_end_time > staff_hours.close_time THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_STAFF_NOT_WORKING';
  END IF;

  IF staff_hours.break_start IS NOT NULL
     AND staff_hours.break_end IS NOT NULL
     AND staff_hours.break_start < p_end_time
     AND staff_hours.break_end > p_start_time THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_DURING_BREAK';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.appointments AS appointment
    WHERE appointment.business_id = p_business_id
      AND appointment.staff_id = selected_staff_id
      AND appointment.appointment_date = p_appointment_date
      AND appointment.status <> 'cancelled'
      AND appointment.id IS DISTINCT FROM p_appointment_id
      AND appointment.start_time < p_end_time + pg_catalog.make_interval(mins => buffer_minutes)
      AND appointment.end_time > p_start_time - pg_catalog.make_interval(mins => buffer_minutes)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_STAFF_CONFLICT';
  END IF;

  SELECT appointment_staff.full_name
  INTO selected_staff_name
  FROM public.staff AS appointment_staff
  WHERE appointment_staff.id = selected_staff_id;

  effective_status := CASE
    WHEN caller_is_member THEN COALESCE(p_status, 'pending')
    WHEN public_auto_confirm THEN 'confirmed'
    ELSE 'pending'
  END;

  IF effective_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_INVALID_STATUS';
  END IF;

  IF p_appointment_id IS NULL THEN
    INSERT INTO public.appointments (
      business_id,
      customer_id,
      service_id,
      staff_id,
      appointment_date,
      start_time,
      end_time,
      status,
      service_name_snapshot,
      duration_snapshot,
      price_snapshot,
      customer_name_snapshot,
      customer_phone_snapshot,
      customer_email_snapshot,
      staff_name_snapshot,
      notes
    ) VALUES (
      p_business_id,
      p_customer_id,
      p_service_id,
      selected_staff_id,
      p_appointment_date,
      p_start_time,
      p_end_time,
      effective_status,
      selected_service.name,
      selected_service.duration,
      selected_service.price,
      selected_customer.full_name,
      selected_customer.phone,
      selected_customer.email,
      selected_staff_name,
      COALESCE(p_notes, '')
    )
    RETURNING * INTO result;
  ELSE
    UPDATE public.appointments
    SET
      customer_id = p_customer_id,
      service_id = p_service_id,
      staff_id = selected_staff_id,
      appointment_date = p_appointment_date,
      start_time = p_start_time,
      end_time = p_end_time,
      status = effective_status,
      service_name_snapshot = selected_service.name,
      duration_snapshot = selected_service.duration,
      price_snapshot = selected_service.price,
      customer_name_snapshot = selected_customer.full_name,
      customer_phone_snapshot = selected_customer.phone,
      customer_email_snapshot = selected_customer.email,
      staff_name_snapshot = selected_staff_name,
      notes = COALESCE(p_notes, '')
    WHERE id = p_appointment_id
      AND business_id = p_business_id
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

ALTER FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_appointment_status(
  p_business_id uuid,
  p_appointment_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.business_members AS membership
       WHERE membership.business_id = p_business_id
         AND membership.profile_id = auth.uid()
         AND membership.status = 'active'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_NOT_AUTHORIZED';
  END IF;

  IF NOT public.has_active_subscription(p_business_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_ACCESS_REQUIRED';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_INVALID_STATUS';
  END IF;

  UPDATE public.appointments
  SET status = p_status
  WHERE id = p_appointment_id
    AND business_id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_APPOINTMENT_NOT_FOUND';
  END IF;
END;
$$;

ALTER FUNCTION public.set_appointment_status(uuid, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_appointment_status(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_appointment_status(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_status(uuid, uuid, text) TO authenticated;

-- All client appointment creation/editing must pass through the functions above.
REVOKE INSERT, UPDATE ON TABLE public.appointments FROM anon, authenticated;

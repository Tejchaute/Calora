-- Keep public booking projections and mutations aligned with the authoritative
-- appointment rules without exposing business-owned tables directly.

CREATE OR REPLACE FUNCTION public.resolve_public_booking_business_id(
  p_booking_slug text
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT business.id
  FROM public.business_settings AS settings
  JOIN public.businesses AS business ON business.id = settings.business_id
  WHERE settings.booking_page_slug = btrim(p_booking_slug)
    AND settings.booking_page_slug <> ''
    AND business.status = 'active'
    AND public.has_active_subscription(business.id)
  LIMIT 1;
$$;

ALTER FUNCTION public.resolve_public_booking_business_id(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resolve_public_booking_business_id(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_booking_context(
  p_booking_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_business_id uuid;
  result jsonb;
BEGIN
  resolved_business_id := public.resolve_public_booking_business_id(p_booking_slug);

  IF resolved_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT pg_catalog.jsonb_build_object(
    'server_now', pg_catalog.statement_timestamp(),
    'business_date', (
      pg_catalog.statement_timestamp() AT TIME ZONE COALESCE(settings.timezone, 'UTC')
    )::date,
    'business', pg_catalog.jsonb_build_object(
      'id', business.id,
      'name', business.name,
      'slug', settings.booking_page_slug
    ),
    'business_settings', pg_catalog.jsonb_build_object(
      'business_name', settings.business_name,
      'logo_url', settings.logo_url,
      'currency', settings.currency,
      'timezone', settings.timezone,
      'booking_page_slug', settings.booking_page_slug
    ),
    'booking_settings', pg_catalog.jsonb_build_object(
      'min_lead_time_hours', COALESCE(booking.min_lead_time_hours, 0),
      'max_advance_days', COALESCE(booking.max_advance_days, 90),
      'buffer_time_minutes', COALESCE(booking.buffer_time_minutes, 0),
      'slot_interval_minutes', COALESCE(booking.slot_interval_minutes, 30),
      'auto_confirm', COALESCE(booking.auto_confirm, false)
    ),
    'minimum_booking_date', (
      (pg_catalog.statement_timestamp()
        + pg_catalog.make_interval(hours => COALESCE(booking.min_lead_time_hours, 0)))
      AT TIME ZONE COALESCE(settings.timezone, 'UTC')
    )::date,
    'minimum_booking_time', (
      (pg_catalog.statement_timestamp()
        + pg_catalog.make_interval(hours => COALESCE(booking.min_lead_time_hours, 0)))
      AT TIME ZONE COALESCE(settings.timezone, 'UTC')
    )::time,
    'maximum_booking_date', (
      (pg_catalog.statement_timestamp() AT TIME ZONE COALESCE(settings.timezone, 'UTC'))::date
      + COALESCE(booking.max_advance_days, 90)
    ),
    'services', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', service.id,
          'name', service.name,
          'description', service.description,
          'duration', service.duration,
          'price', service.price,
          'status', service.status
        ) ORDER BY service.name
      )
      FROM public.services AS service
      WHERE service.business_id = resolved_business_id
        AND service.status = 'active'
        AND service.duration > 0
    ), '[]'::jsonb),
    'staff', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', employee.id,
          'full_name', employee.full_name,
          'avatar_url', employee.avatar_url,
          'bio', employee.bio,
          'status', employee.status
        ) ORDER BY employee.full_name
      )
      FROM public.staff AS employee
      WHERE employee.business_id = resolved_business_id
        AND employee.status = 'active'
    ), '[]'::jsonb),
    'staff_services', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'staff_id', assignment.staff_id,
          'service_id', assignment.service_id
        )
      )
      FROM public.staff_services AS assignment
      JOIN public.staff AS employee
        ON employee.id = assignment.staff_id
       AND employee.business_id = resolved_business_id
       AND employee.status = 'active'
      JOIN public.services AS service
        ON service.id = assignment.service_id
       AND service.business_id = resolved_business_id
       AND service.status = 'active'
    ), '[]'::jsonb),
    'working_hours', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'staff_id', hours.staff_id,
          'day_of_week', hours.day_of_week,
          'is_open', hours.is_open,
          'open_time', hours.open_time,
          'close_time', hours.close_time,
          'break_start', hours.break_start,
          'break_end', hours.break_end
        ) ORDER BY hours.staff_id NULLS FIRST, hours.day_of_week
      )
      FROM public.working_hours AS hours
      WHERE hours.business_id = resolved_business_id
    ), '[]'::jsonb),
    'holidays', COALESCE((
      SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'date', holiday.date,
          'name', holiday.name
        ) ORDER BY holiday.date
      )
      FROM public.business_holidays AS holiday
      WHERE holiday.business_id = resolved_business_id
        AND holiday.date >= (
          pg_catalog.statement_timestamp() AT TIME ZONE COALESCE(settings.timezone, 'UTC')
        )::date
        AND holiday.date <= (
          (pg_catalog.statement_timestamp() AT TIME ZONE COALESCE(settings.timezone, 'UTC'))::date
          + COALESCE(booking.max_advance_days, 90)
        )
    ), '[]'::jsonb)
  )
  INTO result
  FROM public.businesses AS business
  JOIN public.business_settings AS settings ON settings.business_id = business.id
  LEFT JOIN public.booking_settings AS booking ON booking.business_id = business.id
  WHERE business.id = resolved_business_id;

  RETURN result;
END;
$$;

ALTER FUNCTION public.get_public_booking_context(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_booking_context(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_context(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_booked_slots(
  p_booking_slug text,
  p_date date,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_business_id uuid;
  business_timezone text;
  minimum_notice integer;
BEGIN
  resolved_business_id := public.resolve_public_booking_business_id(p_booking_slug);
  IF resolved_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC'), COALESCE(booking.min_lead_time_hours, 0)
  INTO business_timezone, minimum_notice
  FROM public.business_settings AS settings
  LEFT JOIN public.booking_settings AS booking ON booking.business_id = settings.business_id
  WHERE settings.business_id = resolved_business_id;

  RETURN pg_catalog.jsonb_build_object(
    'minimum_booking_date', (
      (pg_catalog.statement_timestamp() + pg_catalog.make_interval(hours => minimum_notice))
      AT TIME ZONE business_timezone
    )::date,
    'minimum_booking_time', (
      (pg_catalog.statement_timestamp() + pg_catalog.make_interval(hours => minimum_notice))
      AT TIME ZONE business_timezone
    )::time,
    'slots', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'start_time', appointment.start_time,
        'end_time', appointment.end_time,
        'staff_id', appointment.staff_id
      ))
      FROM public.appointments AS appointment
      WHERE appointment.business_id = resolved_business_id
        AND appointment.appointment_date = p_date
        AND appointment.status <> 'cancelled'
        AND (p_staff_id IS NULL OR appointment.staff_id = p_staff_id)
    ), '[]'::jsonb)
  );
END;
$$;

ALTER FUNCTION public.get_public_booked_slots(text, date, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_booked_slots(text, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(text, date, uuid) TO anon, authenticated;

-- The former UUID-scoped public projection functions are retained for database
-- compatibility but are no longer executable by browser roles.
REVOKE ALL ON FUNCTION public.get_public_booked_slots(uuid, date, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_booking_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_staff_services(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_or_create_public_customer(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Keep the established validation body private, then put a slug-aware
-- authorization wrapper in front of both authenticated and public callers.
ALTER FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid)
  RENAME TO save_appointment_core;

REVOKE ALL ON FUNCTION public.save_appointment_core(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid)
  FROM PUBLIC, anon, authenticated;

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
  p_appointment_id uuid DEFAULT NULL,
  p_public_booking_slug text DEFAULT NULL
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_is_member boolean;
BEGIN
  caller_is_member := auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.business_members AS membership
    WHERE membership.business_id = p_business_id
      AND membership.profile_id = auth.uid()
      AND membership.status = 'active'
  );

  IF NOT caller_is_member
     AND public.resolve_public_booking_business_id(p_public_booking_slug) IS DISTINCT FROM p_business_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_NOT_AUTHORIZED';
  END IF;

  RETURN public.save_appointment_core(
    p_business_id,
    p_customer_id,
    p_service_id,
    p_staff_id,
    p_appointment_date,
    p_start_time,
    p_end_time,
    p_notes,
    p_status,
    p_appointment_id
  );
END;
$$;

ALTER FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_appointment(uuid, uuid, uuid, uuid, date, time, time, text, text, uuid, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_booking_slug text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_service_id uuid,
  p_staff_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_end_time time,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_business_id uuid;
  normalized_name text := btrim(COALESCE(p_customer_name, ''));
  normalized_phone text := btrim(COALESCE(p_customer_phone, ''));
  normalized_email text := lower(btrim(COALESCE(p_customer_email, '')));
  phone_customer_id uuid;
  email_customer_id uuid;
  resolved_customer_id uuid;
  created_appointment public.appointments;
BEGIN
  resolved_business_id := public.resolve_public_booking_business_id(p_booking_slug);

  IF resolved_business_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_BUSINESS_UNAVAILABLE';
  END IF;

  IF normalized_name = '' OR char_length(normalized_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_CUSTOMER_INVALID';
  END IF;

  IF normalized_phone = '' AND normalized_email = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_CUSTOMER_CONTACT_REQUIRED';
  END IF;

  IF char_length(normalized_phone) > 32 OR char_length(normalized_email) > 254 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_CUSTOMER_INVALID';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      resolved_business_id::text || ':' || normalized_phone || ':' || normalized_email,
      2
    )
  );

  IF normalized_phone <> '' THEN
    SELECT customer.id
    INTO phone_customer_id
    FROM public.customers AS customer
    WHERE customer.business_id = resolved_business_id
      AND customer.phone = normalized_phone
    ORDER BY customer.created_at
    LIMIT 1;
  END IF;

  IF normalized_email <> '' THEN
    SELECT customer.id
    INTO email_customer_id
    FROM public.customers AS customer
    WHERE customer.business_id = resolved_business_id
      AND lower(customer.email) = normalized_email
    ORDER BY customer.created_at
    LIMIT 1;
  END IF;

  IF phone_customer_id IS NOT NULL
     AND email_customer_id IS NOT NULL
     AND phone_customer_id <> email_customer_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'CALORA_CUSTOMER_CONFLICT';
  END IF;

  resolved_customer_id := COALESCE(phone_customer_id, email_customer_id);

  IF resolved_customer_id IS NULL THEN
    INSERT INTO public.customers (business_id, full_name, phone, email)
    VALUES (
      resolved_business_id,
      normalized_name,
      NULLIF(normalized_phone, ''),
      NULLIF(normalized_email, '')
    )
    RETURNING id INTO resolved_customer_id;
  END IF;

  -- Any exception from the authoritative appointment function aborts this
  -- outer statement, rolling back a customer created above.
  created_appointment := public.save_appointment(
    resolved_business_id,
    resolved_customer_id,
    p_service_id,
    p_staff_id,
    p_appointment_date,
    p_start_time,
    p_end_time,
    p_notes,
    'pending',
    NULL,
    p_booking_slug
  );

  RETURN pg_catalog.jsonb_build_object(
    'appointment_id', created_appointment.id,
    'status', created_appointment.status,
    'staff_id', created_appointment.staff_id,
    'staff_name', created_appointment.staff_name_snapshot
  );
END;
$$;

ALTER FUNCTION public.create_public_booking(text, text, text, text, uuid, uuid, date, time, time, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_public_booking(text, text, text, text, uuid, uuid, date, time, time, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_booking(text, text, text, text, uuid, uuid, date, time, time, text)
  TO anon, authenticated;

-- Public booking now uses the minimal slug-scoped context RPC. Remove the
-- broad browser-readable projections while retaining member policies.
DROP POLICY IF EXISTS "businesses_select_anon" ON public.businesses;
DROP POLICY IF EXISTS "services_select_anon" ON public.services;
DROP POLICY IF EXISTS "working_hours_select_anon" ON public.working_hours;
DROP POLICY IF EXISTS "business_settings_select_anon" ON public.business_settings;
DROP POLICY IF EXISTS "booking_settings_select_anon" ON public.booking_settings;
DROP POLICY IF EXISTS "branding_settings_select_anon" ON public.branding_settings;

REVOKE SELECT ON TABLE public.businesses FROM anon;
REVOKE SELECT ON TABLE public.services FROM anon;
REVOKE SELECT ON TABLE public.working_hours FROM anon;
REVOKE SELECT ON TABLE public.business_settings FROM anon;
REVOKE SELECT ON TABLE public.booking_settings FROM anon;
REVOKE SELECT ON TABLE public.branding_settings FROM anon;
REVOKE SELECT ON TABLE public.business_holidays FROM anon;

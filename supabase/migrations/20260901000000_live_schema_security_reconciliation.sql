/*
 * Live-schema security reconciliation.
 *
 * This migration intentionally targets the evolved Calora schema. It does not
 * recreate the obsolete initial schema, seed working_hours, create holidays,
 * create subscriptions, or alter existing application data.
 */

-- ---------------------------------------------------------------------------
-- Privileged membership helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_business_member(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members AS membership
    WHERE membership.business_id = target_business_id
      AND membership.profile_id = auth.uid()
      AND membership.status = 'active'
  );
$$;

ALTER FUNCTION public.is_business_member(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_business_admin(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members AS membership
    WHERE membership.business_id = target_business_id
      AND membership.profile_id = auth.uid()
      AND membership.status = 'active'
      AND membership.role IN ('owner', 'admin')
  );
$$;

ALTER FUNCTION public.is_business_admin(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_business_admin(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Setup is the only client-accessible business-creation path
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "businesses_insert_authenticated" ON public.businesses;

-- Replace the legacy five-argument RPC with the three-argument signature used
-- by Setup and by the subsequent subscription migration. No subscription is
-- created during this reconciliation phase.
DROP FUNCTION IF EXISTS public.create_business_with_owner(text, text, uuid, text, text);

CREATE FUNCTION public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_business_type_id uuid
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_profile_id uuid := auth.uid();
  normalized_name text := btrim(p_name);
  normalized_slug text := lower(btrim(p_slug));
  created_business public.businesses;
BEGIN
  IF current_profile_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to create a business'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_name = '' OR char_length(normalized_name) > 120 THEN
    RAISE EXCEPTION 'Business name must contain between 1 and 120 characters'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_slug = '' OR normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Business name must produce a valid URL slug'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.business_types AS business_type
    WHERE business_type.id = p_business_type_id
  ) THEN
    RAISE EXCEPTION 'A valid business type is required'
      USING ERRCODE = '22023';
  END IF;

  -- Serializes duplicate Setup submissions for the same account.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_profile_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.business_members AS membership
    WHERE membership.profile_id = current_profile_id
      AND membership.status = 'active'
  ) THEN
    RAISE EXCEPTION 'This account is already associated with a business'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.businesses (name, slug, business_type_id, status)
  VALUES (normalized_name, normalized_slug, p_business_type_id, 'active')
  RETURNING * INTO created_business;

  INSERT INTO public.business_settings (
    business_id,
    business_name,
    booking_page_slug,
    currency,
    timezone
  )
  VALUES (
    created_business.id,
    created_business.name,
    created_business.slug,
    'INR',
    'Asia/Kolkata'
  );

  INSERT INTO public.business_members (
    business_id,
    profile_id,
    role,
    status
  )
  VALUES (
    created_business.id,
    current_profile_id,
    'owner',
    'active'
  );

  RETURN created_business;
END;
$$;

ALTER FUNCTION public.create_business_with_owner(text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Public booking: minimal customer resolution without exposing customer rows
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public booking can find customers" ON public.customers;
DROP POLICY IF EXISTS "Public booking can create customers" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_anon" ON public.customers;
DROP POLICY IF EXISTS "customers_select_anon" ON public.customers;

CREATE OR REPLACE FUNCTION public.find_or_create_public_customer(
  p_business_id uuid,
  p_full_name text,
  p_phone text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_name text := btrim(COALESCE(p_full_name, ''));
  normalized_phone text := btrim(COALESCE(p_phone, ''));
  normalized_email text := lower(btrim(COALESCE(p_email, '')));
  phone_customer_id uuid;
  email_customer_id uuid;
  customer_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses AS business
    WHERE business.id = p_business_id
      AND business.status = 'active'
      AND business.slug IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Public booking is not available for this business'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_name = '' OR char_length(normalized_name) > 120 THEN
    RAISE EXCEPTION 'A valid customer name is required'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_phone = '' AND normalized_email = '' THEN
    RAISE EXCEPTION 'A phone number or email address is required'
      USING ERRCODE = '22023';
  END IF;

  IF char_length(normalized_phone) > 32 OR char_length(normalized_email) > 254 THEN
    RAISE EXCEPTION 'Customer contact details are too long'
      USING ERRCODE = '22023';
  END IF;

  -- Prevent two simultaneous public requests from creating the same customer.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_business_id::text || ':' || normalized_phone || ':' || normalized_email,
      2
    )
  );

  IF normalized_phone <> '' THEN
    SELECT customer.id
    INTO phone_customer_id
    FROM public.customers AS customer
    WHERE customer.business_id = p_business_id
      AND customer.phone = normalized_phone
    ORDER BY customer.created_at
    LIMIT 1;
  END IF;

  IF normalized_email <> '' THEN
    SELECT customer.id
    INTO email_customer_id
    FROM public.customers AS customer
    WHERE customer.business_id = p_business_id
      AND lower(customer.email) = normalized_email
    ORDER BY customer.created_at
    LIMIT 1;
  END IF;

  IF phone_customer_id IS NOT NULL
    AND email_customer_id IS NOT NULL
    AND phone_customer_id <> email_customer_id THEN
    RAISE EXCEPTION 'The supplied contact details identify different customers'
      USING ERRCODE = '22023';
  END IF;

  customer_id := COALESCE(phone_customer_id, email_customer_id);

  IF customer_id IS NULL THEN
    INSERT INTO public.customers (
      business_id,
      full_name,
      phone,
      email
    )
    VALUES (
      p_business_id,
      normalized_name,
      NULLIF(normalized_phone, ''),
      NULLIF(normalized_email, '')
    )
    RETURNING id INTO customer_id;
  END IF;

  -- Only the opaque identifier needed to create the appointment is returned.
  RETURN customer_id;
END;
$$;

ALTER FUNCTION public.find_or_create_public_customer(uuid, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.find_or_create_public_customer(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_or_create_public_customer(uuid, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public booking: expose occupied times, not appointment/customer records
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_booked_slots(
  p_business_id uuid,
  p_date date,
  p_staff_id uuid DEFAULT NULL
)
RETURNS TABLE (
  start_time time,
  end_time time,
  staff_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT appointment.start_time, appointment.end_time, appointment.staff_id
  FROM public.appointments AS appointment
  WHERE appointment.business_id = p_business_id
    AND appointment.appointment_date = p_date
    AND appointment.status <> 'cancelled'
    AND (p_staff_id IS NULL OR appointment.staff_id = p_staff_id)
    AND EXISTS (
      SELECT 1
      FROM public.businesses AS business
      WHERE business.id = p_business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    );
$$;

ALTER FUNCTION public.get_public_booked_slots(uuid, date, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_booked_slots(uuid, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booked_slots(uuid, date, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public booking row visibility, scoped to active public businesses
-- ---------------------------------------------------------------------------

-- Public booking must behave the same for signed-out visitors and for users
-- who happen to have an authenticated Calora session in the same browser.
DROP POLICY IF EXISTS "businesses_select_anon" ON public.businesses;
CREATE POLICY "businesses_select_anon" ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (status = 'active' AND slug IS NOT NULL);

DROP POLICY IF EXISTS "services_select_anon" ON public.services;
CREATE POLICY "services_select_anon" ON public.services FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = services.business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  );

-- Staff contains private contact and employment fields, so public booking uses
-- a minimal projection RPC rather than anonymous table SELECT.
DROP POLICY IF EXISTS "staff_select_anon" ON public.staff;

CREATE OR REPLACE FUNCTION public.get_public_booking_staff(p_business_id uuid)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  full_name text,
  avatar_url text,
  bio text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT staff.id, staff.business_id, staff.full_name,
    staff.avatar_url, staff.bio, staff.status
  FROM public.staff AS staff
  WHERE staff.business_id = p_business_id
    AND staff.status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = p_business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  ORDER BY staff.full_name;
$$;

ALTER FUNCTION public.get_public_booking_staff(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_booking_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_staff(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "staff_services_select_anon" ON public.staff_services;

CREATE OR REPLACE FUNCTION public.get_public_staff_services(p_business_id uuid)
RETURNS TABLE (staff_id uuid, service_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT assignment.staff_id, assignment.service_id
  FROM public.staff_services AS assignment
  JOIN public.staff AS linked_staff ON linked_staff.id = assignment.staff_id
  JOIN public.services AS linked_service ON linked_service.id = assignment.service_id
  JOIN public.businesses AS business ON business.id = linked_staff.business_id
  WHERE linked_staff.business_id = p_business_id
    AND linked_service.business_id = p_business_id
    AND linked_staff.status = 'active'
    AND linked_service.status = 'active'
    AND business.status = 'active'
    AND business.slug IS NOT NULL;
$$;

ALTER FUNCTION public.get_public_staff_services(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_staff_services(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_staff_services(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "working_hours_select_anon" ON public.working_hours;
CREATE POLICY "working_hours_select_anon" ON public.working_hours FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = working_hours.business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "business_settings_select_anon" ON public.business_settings;
CREATE POLICY "business_settings_select_anon" ON public.business_settings FOR SELECT
  TO anon, authenticated
  USING (
    booking_page_slug IS NOT NULL
    AND booking_page_slug <> ''
    AND EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = business_settings.business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "branding_settings_select_anon" ON public.branding_settings;
CREATE POLICY "branding_settings_select_anon" ON public.branding_settings FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = branding_settings.business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "booking_settings_select_anon" ON public.booking_settings;
CREATE POLICY "booking_settings_select_anon" ON public.booking_settings FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = booking_settings.business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "appointments_insert_anon" ON public.appointments;
DROP POLICY IF EXISTS "appointments_insert_public" ON public.appointments;

CREATE OR REPLACE FUNCTION public.is_valid_public_appointment(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_staff_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.businesses AS business
      WHERE business.id = p_business_id
        AND business.status = 'active'
        AND business.slug IS NOT NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.customers AS customer
      WHERE customer.id = p_customer_id
        AND customer.business_id = p_business_id
    )
    AND EXISTS (
      SELECT 1 FROM public.services AS service
      WHERE service.id = p_service_id
        AND service.business_id = p_business_id
        AND service.status = 'active'
    )
    AND (
      p_staff_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.staff AS appointment_staff
        JOIN public.staff_services AS assignment
          ON assignment.staff_id = appointment_staff.id
         AND assignment.service_id = p_service_id
        WHERE appointment_staff.id = p_staff_id
          AND appointment_staff.business_id = p_business_id
          AND appointment_staff.status = 'active'
      )
    );
$$;

ALTER FUNCTION public.is_valid_public_appointment(uuid, uuid, uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_valid_public_appointment(uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_public_appointment(uuid, uuid, uuid, uuid) TO anon, authenticated;

CREATE POLICY "appointments_insert_public" ON public.appointments FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_valid_public_appointment(
      appointments.business_id,
      appointments.customer_id,
      appointments.service_id,
      appointments.staff_id
    )
  );

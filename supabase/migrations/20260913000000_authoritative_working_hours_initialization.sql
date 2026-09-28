/* Restore authoritative weekly defaults without overwriting owner changes. */

CREATE UNIQUE INDEX IF NOT EXISTS working_hours_scope_day_unique
  ON public.working_hours (business_id, staff_id, day_of_week) NULLS NOT DISTINCT;

INSERT INTO public.working_hours (
  business_id, staff_id, day_of_week, is_open, open_time, close_time,
  break_start, break_end
)
SELECT
  business.id, NULL, weekday.day_of_week,
  weekday.day_of_week BETWEEN 1 AND 5,
  '09:00'::time, '17:00'::time, NULL, NULL
FROM public.businesses AS business
CROSS JOIN pg_catalog.generate_series(0, 6) AS weekday(day_of_week)
ON CONFLICT (business_id, staff_id, day_of_week) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_business_with_owner(
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
  trial_start timestamptz := statement_timestamp();
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
  IF NOT EXISTS (SELECT 1 FROM public.business_types WHERE id = p_business_type_id) THEN
    RAISE EXCEPTION 'A valid business type is required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_profile_id::text, 0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(normalized_slug, 1)
  );

  IF EXISTS (
    SELECT 1 FROM public.business_members
    WHERE profile_id = current_profile_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'This account is already associated with a business'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.businesses (name, business_type_id, slug, status)
  VALUES (
    normalized_name,
    p_business_type_id,
    CASE WHEN EXISTS (SELECT 1 FROM public.businesses WHERE slug = normalized_slug)
      THEN normalized_slug || '-' || substr(gen_random_uuid()::text, 1, 8)
      ELSE normalized_slug END,
    'active'
  ) RETURNING * INTO created_business;

  INSERT INTO public.business_settings (
    business_id, business_name, booking_page_slug, currency, timezone
  ) VALUES (
    created_business.id, created_business.name, created_business.slug,
    'INR', 'Asia/Kolkata'
  );

  INSERT INTO public.business_members (business_id, profile_id, role, status)
  VALUES (created_business.id, current_profile_id, 'owner', 'active');

  INSERT INTO public.subscriptions (
    business_id, plan, status, trial_started_at, trial_ends_at
  ) VALUES (
    created_business.id, 'free_trial', 'trialing', trial_start,
    trial_start + interval '14 days'
  );

  INSERT INTO public.working_hours (
    business_id, staff_id, day_of_week, is_open, open_time, close_time,
    break_start, break_end
  )
  SELECT
    created_business.id, NULL, weekday.day_of_week,
    weekday.day_of_week BETWEEN 1 AND 5,
    '09:00'::time, '17:00'::time, NULL, NULL
  FROM pg_catalog.generate_series(0, 6) AS weekday(day_of_week)
  ON CONFLICT (business_id, staff_id, day_of_week) DO NOTHING;

  RETURN created_business;
END;
$$;

ALTER FUNCTION public.create_business_with_owner(text, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_business_with_owner(text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_business_with_owner(text, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_business_clock(p_business_id uuid)
RETURNS TABLE (server_now timestamptz, business_date date, business_time time, timezone text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  resolved_timezone text;
BEGIN
  IF NOT public.is_business_member_record(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to access this business dashboard'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC')
  INTO resolved_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = p_business_id;

  resolved_timezone := COALESCE(resolved_timezone, 'UTC');

  RETURN QUERY SELECT
    pg_catalog.statement_timestamp(),
    (pg_catalog.statement_timestamp() AT TIME ZONE resolved_timezone)::date,
    (pg_catalog.statement_timestamp() AT TIME ZONE resolved_timezone)::time,
    resolved_timezone;
END;
$$;

ALTER FUNCTION public.get_dashboard_business_clock(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_dashboard_business_clock(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_business_clock(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_business_clock(uuid) TO authenticated;

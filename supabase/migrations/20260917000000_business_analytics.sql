/*
 * Phase 3A-5: bounded, business-timezone-aware analytics projection.
 * Definitions:
 * - selected period ends on the current business-local date (inclusive)
 * - scheduled counts include appointments dated inside that period
 * - outcome metrics include only appointments that have ended by database time
 * - cancellation/no-show rates use ended appointments as their denominator
 * - returning customers had an appointment before the selected period
 */
CREATE OR REPLACE FUNCTION public.get_business_analytics(
  p_business_id uuid,
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  resolved_timezone text;
  business_now timestamp;
  period_end date;
  period_start date;
  result jsonb;
BEGIN
  IF NOT public.is_business_member_record(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to access business analytics'
      USING ERRCODE = '42501';
  END IF;

  IF p_days NOT IN (1, 7, 30, 90) THEN
    RAISE EXCEPTION 'Analytics range must be 1, 7, 30, or 90 days'
      USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(settings.timezone, 'UTC')
  INTO resolved_timezone
  FROM public.business_settings AS settings
  WHERE settings.business_id = p_business_id;

  resolved_timezone := COALESCE(resolved_timezone, 'UTC');
  business_now := pg_catalog.statement_timestamp() AT TIME ZONE resolved_timezone;
  period_end := business_now::date;
  period_start := period_end - (p_days - 1);

  WITH period_appointments AS (
    SELECT appointment.*
    FROM public.appointments AS appointment
    WHERE appointment.business_id = p_business_id
      AND appointment.appointment_date BETWEEN period_start AND period_end
  ),
  historical_outcomes AS (
    SELECT appointment.*
    FROM period_appointments AS appointment
    WHERE appointment.appointment_date < period_end
       OR (
         appointment.appointment_date = period_end
         AND appointment.end_time <= business_now::time
       )
  ),
  status_counts AS (
    SELECT
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE status = 'pending')::integer AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::integer AS confirmed,
      COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::integer AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::integer AS no_show
    FROM period_appointments
  ),
  outcome_counts AS (
    SELECT
      COUNT(*)::integer AS eligible,
      COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::integer AS cancelled,
      COUNT(*) FILTER (WHERE status = 'no_show')::integer AS no_show
    FROM historical_outcomes
  ),
  trend AS (
    SELECT
      day_value::date AS date,
      COUNT(appointment.id)::integer AS total,
      COUNT(appointment.id) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(appointment.id) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM pg_catalog.generate_series(period_start, period_end, interval '1 day') AS day_value
    LEFT JOIN period_appointments AS appointment
      ON appointment.appointment_date = day_value::date
    GROUP BY day_value
    ORDER BY day_value
  ),
  service_counts AS (
    SELECT
      appointment.service_id AS id,
      COALESCE(NULLIF(MAX(appointment.service_name_snapshot), ''), MAX(service.name), 'Unknown service') AS name,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM period_appointments AS appointment
    LEFT JOIN public.services AS service ON service.id = appointment.service_id
    GROUP BY appointment.service_id
    ORDER BY COUNT(*) DESC, name
    LIMIT 8
  ),
  staff_counts AS (
    SELECT
      appointment.staff_id AS id,
      COALESCE(NULLIF(MAX(appointment.staff_name_snapshot), ''), MAX(staff.full_name), 'Unassigned') AS name,
      COUNT(*)::integer AS total,
      COUNT(*) FILTER (WHERE appointment.status = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE appointment.status = 'cancelled')::integer AS cancelled
    FROM period_appointments AS appointment
    LEFT JOIN public.staff AS staff ON staff.id = appointment.staff_id
    GROUP BY appointment.staff_id
    ORDER BY COUNT(*) DESC, name
    LIMIT 8
  ),
  period_customers AS (
    SELECT DISTINCT appointment.customer_id
    FROM period_appointments AS appointment
  ),
  customer_counts AS (
    SELECT
      (SELECT COUNT(*)::integer FROM public.customers AS customer WHERE customer.business_id = p_business_id) AS total,
      (SELECT COUNT(*)::integer FROM period_customers) AS with_appointments,
      (
        SELECT COUNT(*)::integer
        FROM public.customers AS customer
        WHERE customer.business_id = p_business_id
          AND (customer.created_at AT TIME ZONE resolved_timezone)::date BETWEEN period_start AND period_end
      ) AS new_customers,
      (
        SELECT COUNT(*)::integer
        FROM period_customers AS period_customer
        WHERE EXISTS (
          SELECT 1
          FROM public.appointments AS earlier
          WHERE earlier.business_id = p_business_id
            AND earlier.customer_id = period_customer.customer_id
            AND earlier.appointment_date < period_start
        )
      ) AS returning_customers
  )
  SELECT pg_catalog.jsonb_build_object(
    'clock', pg_catalog.jsonb_build_object(
      'server_now', pg_catalog.statement_timestamp(),
      'business_date', period_end,
      'business_time', business_now::time,
      'timezone', resolved_timezone
    ),
    'range', pg_catalog.jsonb_build_object(
      'days', p_days,
      'start_date', period_start,
      'end_date', period_end
    ),
    'appointments', (SELECT pg_catalog.to_jsonb(status_counts) FROM status_counts),
    'outcomes', (SELECT pg_catalog.to_jsonb(outcome_counts) FROM outcome_counts),
    'customers', (SELECT pg_catalog.to_jsonb(customer_counts) FROM customer_counts),
    'trend', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(trend)) FROM trend), '[]'::jsonb),
    'services', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(service_counts)) FROM service_counts), '[]'::jsonb),
    'staff', COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(staff_counts)) FROM staff_counts), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

ALTER FUNCTION public.get_business_analytics(uuid, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_business_analytics(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_business_analytics(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_business_analytics(uuid, integer) TO authenticated;

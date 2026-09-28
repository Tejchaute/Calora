-- Bounded, tenant-scoped customer intelligence without PostgREST row caps.
CREATE OR REPLACE FUNCTION public.get_customer_appointment_counts(
  p_business_id uuid,
  p_customer_ids uuid[]
)
RETURNS TABLE (
  customer_id uuid,
  appointment_count bigint,
  completed_count bigint,
  cancelled_count bigint,
  operational_count bigint,
  next_appointment_id uuid,
  last_appointment_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  business_date date;
  business_time time;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to view this business' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(array_length(p_customer_ids, 1), 0) > 50 THEN
    RAISE EXCEPTION 'Too many customers requested' USING ERRCODE = '22023';
  END IF;

  SELECT clock.business_date, clock.business_time
  INTO business_date, business_time
  FROM public.get_dashboard_business_clock(p_business_id) AS clock;

  RETURN QUERY
  SELECT customer.id,
    count(appointment.id),
    count(appointment.id) FILTER (WHERE appointment.status = 'completed'),
    count(appointment.id) FILTER (WHERE appointment.status = 'cancelled'),
    count(appointment.id) FILTER (
      WHERE appointment.status IN ('pending', 'scheduled', 'confirmed')
        AND (appointment.appointment_date > business_date
          OR (appointment.appointment_date = business_date AND appointment.end_time > business_time))
    ),
    (array_agg(appointment.id ORDER BY appointment.appointment_date, appointment.start_time, appointment.id)
      FILTER (WHERE appointment.status IN ('pending', 'scheduled', 'confirmed')
        AND (appointment.appointment_date > business_date
          OR (appointment.appointment_date = business_date AND appointment.end_time > business_time))))[1],
    (array_agg(appointment.id ORDER BY appointment.appointment_date DESC, appointment.start_time DESC, appointment.id DESC)
      FILTER (WHERE appointment.id IS NOT NULL
        AND (appointment.status IN ('completed', 'cancelled', 'no_show')
          OR appointment.appointment_date < business_date
          OR (appointment.appointment_date = business_date AND appointment.end_time <= business_time))))[1]
  FROM public.customers AS customer
  LEFT JOIN public.appointments AS appointment
    ON appointment.customer_id = customer.id AND appointment.business_id = p_business_id
  WHERE customer.business_id = p_business_id
    AND customer.id = ANY(COALESCE(p_customer_ids, ARRAY[]::uuid[]))
  GROUP BY customer.id;
END;
$$;

ALTER FUNCTION public.get_customer_appointment_counts(uuid, uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_customer_appointment_counts(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_appointment_counts(uuid, uuid[]) TO authenticated;

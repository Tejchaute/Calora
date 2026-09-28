-- Replace a staff member's service assignments in one transaction.
CREATE OR REPLACE FUNCTION public.replace_staff_services(
  p_business_id uuid,
  p_staff_id uuid,
  p_service_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  unique_ids uuid[];
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_business_member(p_business_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this business' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.staff
  WHERE id = p_staff_id AND business_id = p_business_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff member not found in this business' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT service_id), ARRAY[]::uuid[])
  INTO unique_ids
  FROM unnest(COALESCE(p_service_ids, ARRAY[]::uuid[])) AS service_id;

  IF EXISTS (
    SELECT 1 FROM unnest(unique_ids) AS requested(service_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.services AS service
      WHERE service.id = requested.service_id
        AND service.business_id = p_business_id
    )
  ) THEN
    RAISE EXCEPTION 'A service does not belong to this business' USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.staff_services WHERE staff_id = p_staff_id;
  INSERT INTO public.staff_services (staff_id, service_id)
  SELECT p_staff_id, service_id FROM unnest(unique_ids) AS service_id;
END;
$$;

ALTER FUNCTION public.replace_staff_services(uuid, uuid, uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.replace_staff_services(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_staff_services(uuid, uuid, uuid[]) TO authenticated;

-- Direct browser inserts must obey the same tenant relationship as the RPC.
DROP POLICY IF EXISTS staff_services_insert ON public.staff_services;
CREATE POLICY staff_services_insert ON public.staff_services FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff AS member
    JOIN public.services AS service ON service.id = service_id
    WHERE member.id = staff_id
      AND member.business_id = service.business_id
      AND public.is_business_member(member.business_id)
  )
);

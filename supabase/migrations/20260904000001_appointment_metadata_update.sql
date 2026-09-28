-- Allow notes/status edits without revalidating an unchanged historical slot.
-- Scheduling fields remain immutable through this function.

CREATE OR REPLACE FUNCTION public.update_appointment_metadata(
  p_business_id uuid,
  p_appointment_id uuid,
  p_notes text,
  p_status text
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result public.appointments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.business_members AS membership
       WHERE membership.business_id = p_business_id
         AND membership.profile_id = auth.uid()
         AND membership.status = 'active'
     )
     OR NOT public.has_active_subscription(p_business_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'CALORA_NOT_AUTHORIZED';
  END IF;

  IF p_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_INVALID_STATUS';
  END IF;

  UPDATE public.appointments
  SET
    notes = COALESCE(p_notes, ''),
    status = p_status
  WHERE id = p_appointment_id
    AND business_id = p_business_id
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'CALORA_APPOINTMENT_NOT_FOUND';
  END IF;

  RETURN result;
END;
$$;

ALTER FUNCTION public.update_appointment_metadata(uuid, uuid, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_appointment_metadata(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_appointment_metadata(uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_metadata(uuid, uuid, text, text) TO authenticated;

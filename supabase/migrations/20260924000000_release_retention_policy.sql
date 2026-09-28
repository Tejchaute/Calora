-- Defense in depth after the scoped DELETE grant revocation.
SET lock_timeout = '3s';
DROP POLICY IF EXISTS appointments_delete ON public.appointments;

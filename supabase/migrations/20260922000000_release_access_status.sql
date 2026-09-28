-- Live inspection: status is TEXT; current RPCs emit pending, but the old
-- constraint allows only scheduled. Preserve BOTH labels and all existing rows.
-- pending remains the current application/creation contract; scheduled is a
-- backwards-compatible legacy label. No appointment data is rewritten.
ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending','scheduled','confirmed','completed','cancelled','no_show'));
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'pending';

-- Live inspection found this single SELECT policy. Fail closed if an unknown
-- permissive SELECT/ALL policy would undermine the self-only policy.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname = 'public'
    AND tablename = 'profiles' AND cmd IN ('SELECT','ALL') AND policyname <> 'profiles_select') THEN
    RAISE EXCEPTION 'Unexpected profile policy; review before applying';
  END IF;
END; $$;
ALTER POLICY profiles_select ON public.profiles TO authenticated USING ((SELECT auth.uid()) = id);

-- Retention is enforced by privileges as well as removal of the UI action.
-- Service-role/owner maintenance permissions are deliberately unchanged.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.appointments FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.appointment_lifecycle_events FROM PUBLIC, anon, authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notification_deliveries FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM PUBLIC, anon, authenticated;

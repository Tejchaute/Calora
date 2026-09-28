-- Phase 2A hardening after the foundation was applied through SQL Editor.
-- Keep authenticated member reads through RLS while removing anonymous table access.

REVOKE SELECT ON TABLE public.notification_deliveries FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.notification_deliveries TO authenticated;

-- The unique constraint on (appointment_id, event_sequence) already provides
-- the same btree access path, so the additional non-unique index is redundant.
DROP INDEX IF EXISTS public.appointment_lifecycle_events_appointment_idx;

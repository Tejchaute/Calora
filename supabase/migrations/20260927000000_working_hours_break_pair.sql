-- A break is either absent or has both endpoints. Existing order validation remains.
-- The live preflight found no half-defined rows; NOT VALID avoids a table rewrite.
ALTER TABLE public.working_hours
  ADD CONSTRAINT working_hours_break_pair_check
  CHECK ((break_start IS NULL) = (break_end IS NULL)) NOT VALID;

ALTER TABLE public.working_hours
  VALIDATE CONSTRAINT working_hours_break_pair_check;

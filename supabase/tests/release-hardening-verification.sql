-- Read-only release verification. Does not expose customer/profile values.
SELECT column_name, data_type, udt_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status';

/*
 * Align analytics status comparisons with the canonical appointment_status
 * enum used by the live schema. The preceding migration used legacy display
 * spellings that PostgreSQL cannot compare to the enum at execution time.
 */
DO $migration$
DECLARE
  function_definition text;
BEGIN
  SELECT pg_get_functiondef('public.get_business_analytics(uuid, integer)'::regprocedure)
  INTO function_definition;

  function_definition := replace(function_definition, '''pending''', '''scheduled''');
  function_definition := replace(function_definition, '''no-show''', '''no_show''');

  EXECUTE function_definition;
END;
$migration$;

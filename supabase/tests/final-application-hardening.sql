-- Executed only inside a transaction rolled back by the validation harness.
CREATE TEMP TABLE application_hardening_assertions(label text NOT NULL);
CREATE FUNCTION pg_temp.check_hardening(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Application hardening assertion failed: %', label; END IF;
  INSERT INTO application_hardening_assertions VALUES (label);
END $$;

DO $test$
#variable_conflict use_variable
DECLARE
  business_id uuid := gen_random_uuid();
  service_id uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  future_id uuid := gen_random_uuid();
  past_due_id uuid := gen_random_uuid();
  terminal_id uuid := gen_random_uuid();
  sent_id uuid := gen_random_uuid();
  pending_id uuid;
  cancelled_id uuid;
  sent_status_id uuid;
  old_due timestamptz;
  new_due timestamptz;
  old_scheduled timestamptz;
  failed boolean;
  local_start timestamp;
BEGIN
  INSERT INTO public.businesses(id,name,slug,status)
  VALUES (business_id,'ROLLBACK ONLY hardening business','hardening-'||business_id::text,'active');
  INSERT INTO public.business_settings(business_id,business_name,timezone,booking_page_slug,currency)
  VALUES (business_id,'ROLLBACK ONLY','UTC','hardening-'||business_id::text,'USD');
  INSERT INTO public.subscriptions(business_id,plan,status) VALUES (business_id,'legacy','active');
  INSERT INTO public.services(id,business_id,name,duration,price,status)
  VALUES (service_id,business_id,'ROLLBACK ONLY',30,0,'active');
  INSERT INTO public.customers(id,business_id,full_name) VALUES (customer_id,business_id,'ROLLBACK ONLY');
  INSERT INTO public.notification_settings(business_id,reminder_hours_before) VALUES (business_id,24);
  SELECT id INTO pending_id FROM public.notification_statuses WHERE slug='pending';
  SELECT id INTO cancelled_id FROM public.notification_statuses WHERE slug='cancelled';
  SELECT id INTO sent_status_id FROM public.notification_statuses WHERE slug='sent';

  INSERT INTO public.working_hours(business_id,day_of_week,is_open,open_time,close_time)
  VALUES (business_id,1,true,'09:00','17:00');
  PERFORM pg_temp.check_hardening((SELECT break_start IS NULL AND break_end IS NULL FROM public.working_hours WHERE working_hours.business_id=business_id AND day_of_week=1),'break: absent valid');
  UPDATE public.working_hours SET break_start='12:00',break_end='13:00'
  WHERE working_hours.business_id=business_id AND day_of_week=1;
  PERFORM pg_temp.check_hardening((SELECT break_start='12:00' AND break_end='13:00' FROM public.working_hours WHERE working_hours.business_id=business_id AND day_of_week=1),'break: complete valid');
  failed := false;
  BEGIN UPDATE public.working_hours SET break_end=NULL WHERE working_hours.business_id=business_id AND day_of_week=1;
  EXCEPTION WHEN check_violation THEN failed := true; END;
  PERFORM pg_temp.check_hardening(failed,'break: missing end rejected');
  failed := false;
  BEGIN UPDATE public.working_hours SET break_start=NULL WHERE working_hours.business_id=business_id AND day_of_week=1;
  EXCEPTION WHEN check_violation THEN failed := true; END;
  PERFORM pg_temp.check_hardening(failed,'break: missing start rejected');
  failed := false;
  BEGIN UPDATE public.working_hours SET break_start='13:00',break_end='13:00' WHERE working_hours.business_id=business_id AND day_of_week=1;
  EXCEPTION WHEN check_violation THEN failed := true; END;
  PERFORM pg_temp.check_hardening(failed,'break: equal endpoints rejected');
  PERFORM pg_temp.check_hardening((SELECT break_start='12:00' AND break_end='13:00' FROM public.working_hours WHERE working_hours.business_id=business_id AND day_of_week=1),'break: invalid save retains prior row');

  local_start := (pg_catalog.now() AT TIME ZONE 'UTC') + interval '5 days';
  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (future_id,business_id,customer_id,service_id,local_start::date,local_start::time,(local_start + interval '30 minutes')::time,'pending','ROLLBACK ONLY',30);
  SELECT due_at,scheduled_for INTO old_due,old_scheduled FROM public.notification_deliveries
  WHERE appointment_id=future_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id;
  PERFORM pg_temp.check_hardening(old_due IS NOT NULL,'timezone: initial pending reminder');
  UPDATE public.business_settings SET timezone='UTC' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 AND min(due_at)=old_due FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: unchanged is idempotent');
  UPDATE public.business_settings SET timezone='Asia/Kolkata' WHERE business_settings.business_id=business_id;
  SELECT due_at INTO new_due FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder';
  PERFORM pg_temp.check_hardening(new_due=old_due - interval '5 hours 30 minutes','timezone: future pending due recalculated');
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: exactly one pending reminder');
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=cancelled_id AND scheduled_for=old_scheduled),'timezone: obsolete pending cancelled');
  UPDATE public.business_settings SET timezone='Asia/Kolkata' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: repeated update no duplicate');

  UPDATE public.notification_settings SET reminder_hours_before=12 WHERE notification_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 AND min(reminder_lead_minutes)=720 FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: independent reminder setting still reconciles');
  UPDATE public.appointments SET status='cancelled' WHERE id=future_id;
  UPDATE public.business_settings SET timezone='UTC' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=future_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: cancelled remains ineligible');

  UPDATE public.notification_settings SET reminder_hours_before=24 WHERE notification_settings.business_id=business_id;
  local_start := (pg_catalog.now() AT TIME ZONE 'Pacific/Honolulu') + interval '36 hours';
  UPDATE public.business_settings SET timezone='Pacific/Honolulu' WHERE business_settings.business_id=business_id;
  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (past_due_id,business_id,customer_id,service_id,local_start::date,local_start::time,(local_start + interval '30 minutes')::time,'pending','ROLLBACK ONLY',30);
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 FROM public.notification_deliveries WHERE appointment_id=past_due_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: pre-change reminder is future due');
  UPDATE public.business_settings SET timezone='Pacific/Kiritimati' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=past_due_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: newly past-due reminder cancelled');
  PERFORM public.reconcile_missing_appointment_email_reminders();
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=past_due_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: recovery does not resurrect past-due reminder');

  local_start := (pg_catalog.now() AT TIME ZONE 'UTC') + interval '7 days';
  UPDATE public.business_settings SET timezone='UTC' WHERE business_settings.business_id=business_id;
  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (sent_id,business_id,customer_id,service_id,local_start::date,local_start::time,(local_start + interval '30 minutes')::time,'pending','ROLLBACK ONLY',30);
  UPDATE public.notification_deliveries SET status_id=sent_status_id WHERE appointment_id=sent_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder';
  UPDATE public.business_settings SET timezone='Asia/Kolkata' WHERE business_settings.business_id=business_id;
  PERFORM public.reconcile_missing_appointment_email_reminders();
  PERFORM pg_temp.check_hardening((SELECT count(*)=1 FROM public.notification_deliveries WHERE appointment_id=sent_id AND status_id=sent_status_id AND content->>'notification_type'='appointment_reminder'),'timezone: sent delivery unchanged');
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=sent_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: sent reminder not duplicated');

  local_start := (pg_catalog.now() AT TIME ZONE 'UTC') + interval '8 days';
  UPDATE public.business_settings SET timezone='UTC' WHERE business_settings.business_id=business_id;
  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (terminal_id,business_id,customer_id,service_id,local_start::date,local_start::time,(local_start + interval '30 minutes')::time,'pending','ROLLBACK ONLY',30);
  UPDATE public.appointments SET status='completed' WHERE id=terminal_id;
  UPDATE public.business_settings SET timezone='Asia/Kolkata' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=terminal_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: completed stays ineligible');
  UPDATE public.appointments SET status='no_show' WHERE id=terminal_id;
  UPDATE public.business_settings SET timezone='UTC' WHERE business_settings.business_id=business_id;
  PERFORM pg_temp.check_hardening((SELECT count(*)=0 FROM public.notification_deliveries WHERE appointment_id=terminal_id AND status_id=pending_id AND content->>'notification_type'='appointment_reminder'),'timezone: no-show stays ineligible');
END;
$test$;

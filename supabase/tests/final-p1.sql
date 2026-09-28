-- Runs only inside scripts/validate-final-p1.mjs's ROLLBACK transaction.
CREATE TEMP TABLE final_p1_assertions(label text NOT NULL);
CREATE FUNCTION pg_temp.check_p1(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Final P1 assertion failed: %', label; END IF;
  INSERT INTO final_p1_assertions VALUES (label);
END $$;

DO $test$
#variable_conflict use_variable
DECLARE
  owner_id uuid := gen_random_uuid();
  business_id uuid := gen_random_uuid();
  other_business_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  service_one uuid := gen_random_uuid();
  service_two uuid := gen_random_uuid();
  foreign_service uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  appointment_id uuid := gen_random_uuid();
  late_appointment_id uuid := gen_random_uuid();
  outcome record;
  failed boolean;
  pending_id uuid;
  cancelled_id uuid;
  day date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  INSERT INTO auth.users(id,email,raw_user_meta_data)
  VALUES (owner_id, owner_id::text || '@example.invalid', '{"full_name":"P1 rollback fixture"}');
  INSERT INTO public.profiles(id,full_name,email)
  VALUES (owner_id, 'P1 rollback fixture', owner_id::text || '@example.invalid')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.businesses(id,name,slug,status) VALUES
    (business_id,'ROLLBACK ONLY P1 business','p1-'||business_id::text,'active'),
    (other_business_id,'ROLLBACK ONLY foreign business','p1-'||other_business_id::text,'active');
  INSERT INTO public.business_members(business_id,profile_id,role,status)
  VALUES (business_id,owner_id,'owner','active');
  INSERT INTO public.business_settings(business_id,business_name,timezone,booking_page_slug,currency)
  VALUES (business_id,'ROLLBACK ONLY','Asia/Kolkata','p1-'||business_id::text,'INR')
  ON CONFLICT ON CONSTRAINT business_settings_pkey DO UPDATE SET timezone='Asia/Kolkata';
  INSERT INTO public.subscriptions(business_id,plan,status)
  VALUES (business_id,'legacy','active');
  INSERT INTO public.services(id,business_id,name,duration,price,status) VALUES
    (service_one,business_id,'P1 One',30,0,'active'),
    (service_two,business_id,'P1 Two',30,0,'active'),
    (foreign_service,other_business_id,'P1 Foreign',30,0,'active');
  INSERT INTO public.staff(id,business_id,full_name,status)
  VALUES (staff_id,business_id,'P1 Worker','active');
  INSERT INTO public.staff_services(staff_id,service_id) VALUES (staff_id,service_one);
  INSERT INTO public.customers(id,business_id,full_name)
  VALUES (customer_id,business_id,'P1 Customer');
  INSERT INTO public.notification_settings(business_id,reminder_hours_before)
  VALUES (business_id,24) ON CONFLICT ON CONSTRAINT notification_settings_pkey DO UPDATE SET reminder_hours_before=24;

  PERFORM pg_temp.check_p1(NOT has_function_privilege('anon','public.replace_staff_services(uuid,uuid,uuid[])','EXECUTE'),'staff: RPC anonymous access denied');
  PERFORM pg_temp.check_p1(NOT has_function_privilege('anon','public.get_customer_appointment_counts(uuid,uuid[])','EXECUTE'),'customer: aggregate anonymous access denied');

  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  PERFORM public.replace_staff_services(business_id,staff_id,ARRAY[service_two]);
  RESET ROLE;
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM public.staff_services AS assignment WHERE assignment.staff_id=staff_id AND assignment.service_id=service_two),'staff: valid replacement');

  SET LOCAL ROLE authenticated;
  failed := false;
  BEGIN
    PERFORM public.replace_staff_services(business_id,staff_id,ARRAY[service_one,foreign_service]);
  EXCEPTION WHEN OTHERS THEN failed := true;
  END;
  RESET ROLE;
  PERFORM pg_temp.check_p1(failed AND (SELECT count(*)=1 FROM public.staff_services AS assignment WHERE assignment.staff_id=staff_id AND assignment.service_id=service_two),'staff: rejected foreign service keeps previous assignment');
  SET LOCAL ROLE authenticated;
  failed := false;
  BEGIN INSERT INTO public.staff_services(staff_id,service_id) VALUES (staff_id,foreign_service);
  EXCEPTION WHEN OTHERS THEN failed := true; END;
  RESET ROLE;
  PERFORM pg_temp.check_p1(failed,'staff: direct cross-business assignment denied by RLS');
  SET LOCAL ROLE authenticated;
  PERFORM public.replace_staff_services(business_id,staff_id,ARRAY[]::uuid[]);
  RESET ROLE;
  PERFORM pg_temp.check_p1((SELECT count(*)=0 FROM public.staff_services AS assignment WHERE assignment.staff_id=staff_id),'staff: empty replacement');
  SET LOCAL ROLE authenticated;
  failed := false;
  BEGIN PERFORM public.replace_staff_services(other_business_id,staff_id,ARRAY[foreign_service]);
  EXCEPTION WHEN OTHERS THEN failed := true; END;
  RESET ROLE;
  PERFORM pg_temp.check_p1(failed,'staff: foreign business rejected');

  -- 1,001 retained rows exceed the common PostgREST default cap.
  INSERT INTO public.appointments(business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  SELECT business_id,customer_id,service_one,day-1,'12:00','12:30',
         CASE WHEN n <= 600 THEN 'completed' ELSE 'cancelled' END,'P1 One',30
  FROM generate_series(1,1001) AS n;
  SET LOCAL ROLE authenticated;
  SELECT * INTO outcome FROM public.get_customer_appointment_counts(business_id,ARRAY[customer_id]);
  RESET ROLE;
  PERFORM pg_temp.check_p1(outcome.appointment_count=1001 AND outcome.completed_count=600 AND outcome.cancelled_count=401,'customer: exact 1001-row counts');
  PERFORM pg_temp.check_p1((SELECT count(*)=50 FROM (SELECT id FROM public.appointments AS appointment WHERE appointment.business_id=business_id AND appointment.customer_id=customer_id ORDER BY appointment.appointment_date DESC, appointment.start_time DESC, appointment.id DESC LIMIT 50) AS page),'customer: first detail page bounded at 50');
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM (SELECT id FROM public.appointments AS appointment WHERE appointment.business_id=business_id AND appointment.customer_id=customer_id ORDER BY appointment.appointment_date DESC, appointment.start_time DESC, appointment.id DESC LIMIT 50 OFFSET 1000) AS page),'customer: detail page past API row limit remains available');
  PERFORM pg_temp.check_p1(outcome.operational_count=0 AND outcome.last_appointment_id IS NOT NULL,'customer: historical and next classification');
  SET LOCAL ROLE authenticated;
  failed := false;
  BEGIN PERFORM public.get_customer_appointment_counts(other_business_id,ARRAY[customer_id]);
  EXCEPTION WHEN OTHERS THEN failed := true; END;
  RESET ROLE;
  PERFORM pg_temp.check_p1(failed,'customer: foreign business rejected');

  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (appointment_id,business_id,customer_id,service_one,day+5,'12:00','12:30','pending','P1 One',30);
  SET LOCAL ROLE authenticated;
  SELECT * INTO outcome FROM public.get_customer_appointment_counts(business_id,ARRAY[customer_id]);
  RESET ROLE;
  PERFORM pg_temp.check_p1(outcome.appointment_count=1002 AND outcome.operational_count=1 AND outcome.next_appointment_id=appointment_id,'customer: nearest operational appointment after 1001 historical rows');
  SELECT id INTO pending_id FROM public.notification_statuses WHERE slug='pending';
  SELECT id INTO cancelled_id FROM public.notification_statuses WHERE slug='cancelled';
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id),'reminder: created eligible');
  UPDATE public.appointments SET status='cancelled' WHERE id=appointment_id;
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=cancelled_id),'reminder: cancelled');
  UPDATE public.appointments SET status='confirmed' WHERE id=appointment_id;
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id),'reminder: confirmation restores one');
  PERFORM public.reconcile_appointment_email_reminder(appointment_id);
  PERFORM pg_temp.check_p1((SELECT count(*)=1 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder'),'reminder: repeated reconciliation idempotent');
  UPDATE public.appointments SET status='completed' WHERE id=appointment_id;
  PERFORM pg_temp.check_p1((SELECT count(*)=0 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id),'reminder: completed ineligible');
  UPDATE public.appointments SET status='no_show' WHERE id=appointment_id;
  PERFORM public.reconcile_appointment_email_reminder(appointment_id);
  PERFORM pg_temp.check_p1((SELECT count(*)=0 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id),'reminder: no-show ineligible');

  UPDATE public.notification_settings SET reminder_hours_before=72 WHERE notification_settings.business_id=business_id;
  INSERT INTO public.appointments(id,business_id,customer_id,service_id,appointment_date,start_time,end_time,status,service_name_snapshot,duration_snapshot)
  VALUES (late_appointment_id,business_id,customer_id,service_one,day+1,'12:00','12:30','pending','P1 One',30);
  UPDATE public.appointments SET status='cancelled' WHERE id=late_appointment_id;
  UPDATE public.appointments SET status='confirmed' WHERE id=late_appointment_id;
  PERFORM pg_temp.check_p1((SELECT count(*)=0 FROM public.notification_deliveries AS delivery WHERE delivery.appointment_id=late_appointment_id AND content->>'notification_type'='appointment_reminder' AND status_id=pending_id),'reminder: expired delivery time not restored');
END;
$test$;

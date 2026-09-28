-- Executed only inside scripts/validate-release-corrections.mjs's ROLLBACK transaction.
CREATE TEMP TABLE release_assertions(label text NOT NULL);
CREATE FUNCTION pg_temp.check_release(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Release assertion failed: %', label; END IF;
 INSERT INTO release_assertions VALUES(label);
END $$;

DO $test$
DECLARE
 u uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 c uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); worker uuid:=gen_random_uuid();
 day date:=(now() AT TIME ZONE 'Asia/Kolkata')::date+1;
 slug text:='release-test-'||b::text;
 a public.appointments; other public.appointments; p jsonb; p2 jsonb; p3 jsonb;
 n integer; failed boolean; leave_id uuid; event_id uuid; delivery_id uuid;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
  (u,u::text||'@example.invalid','{"full_name":"Release test A"}'),
  (outsider,outsider::text||'@example.invalid','{"full_name":"Release test B"}');
 INSERT INTO public.profiles(id,full_name,email) VALUES
  (u,'Release test A',u::text||'@example.invalid'),
  (outsider,'Release test B',outsider::text||'@example.invalid') ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.businesses(id,name,slug,status) VALUES(b,'ROLLBACK ONLY release fixture',slug,'active');
 INSERT INTO public.business_members(business_id,profile_id,role,status) VALUES(b,u,'owner','active');
 INSERT INTO public.business_settings(business_id,business_name,timezone,booking_page_slug,currency)
 VALUES(b,'ROLLBACK ONLY','Asia/Kolkata',slug,'INR')
 ON CONFLICT(business_id) DO UPDATE SET timezone='Asia/Kolkata',booking_page_slug=EXCLUDED.booking_page_slug;
 INSERT INTO public.subscriptions(business_id,plan,status) VALUES(b,'legacy','active');
 INSERT INTO public.services(id,business_id,name,duration,price,status) VALUES(s,b,'Release fixture',30,0,'active');
 INSERT INTO public.staff(id,business_id,full_name,status) VALUES(worker,b,'Release fixture','active');
 INSERT INTO public.staff_services(staff_id,service_id) VALUES(worker,s);
 INSERT INTO public.customers(id,business_id,full_name,email) VALUES(c,b,'Release fixture',c::text||'@example.invalid');
 INSERT INTO public.working_hours(business_id,staff_id,day_of_week,is_open,open_time,close_time)
 SELECT b,NULL,d,true,'08:00'::time,'18:00'::time FROM generate_series(0,6) d
 ON CONFLICT DO NOTHING;
 UPDATE public.working_hours SET is_open=true,open_time='08:00',close_time='18:00',break_start=NULL,break_end=NULL WHERE business_id=b;
 INSERT INTO public.notification_settings(business_id) VALUES(b) ON CONFLICT DO NOTHING;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.profiles WHERE id=outsider;
 RESET ROLE;
 PERFORM pg_temp.check_release(n=0,'profile: unrelated user hidden');
 SET LOCAL ROLE authenticated;
 SELECT count(*) INTO n FROM public.profiles WHERE id=u;
 RESET ROLE;
 PERFORM pg_temp.check_release(n=1,'profile: own identity readable');

 SET LOCAL ROLE authenticated;
 a:=public.save_appointment(b,c,s,worker,day,'09:00','09:30');
 RESET ROLE;
 PERFORM pg_temp.check_release(a.status='pending','status: authoritative creation accepts pending');
 PERFORM public.set_appointment_status(b,a.id,'scheduled');
 PERFORM pg_temp.check_release((SELECT status='scheduled' FROM public.appointments WHERE id=a.id),'status: legacy scheduled preserved');
 PERFORM public.set_appointment_status(b,a.id,'confirmed');
 PERFORM pg_temp.check_release((SELECT status='confirmed' FROM public.appointments WHERE id=a.id),'status: legitimate confirmation');
 failed:=false;
 BEGIN PERFORM public.set_appointment_status(b,a.id,'invented'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_INVALID_STATUS'; END;
 PERFORM pg_temp.check_release(failed,'status: invalid transition target rejected');
 PERFORM public.set_appointment_status(b,a.id,'cancelled');
 other:=public.save_appointment(b,c,s,worker,day,'09:00','09:30');
 failed:=false;
 BEGIN PERFORM public.set_appointment_status(b,a.id,'confirmed'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_STAFF_CONFLICT'; END;
 PERFORM pg_temp.check_release(failed,'reactivation: conflicting appointment rejected by core');
 failed:=false;
 BEGIN PERFORM public.update_appointment_metadata(b,a.id,'test','pending'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_STAFF_CONFLICT'; END;
 PERFORM pg_temp.check_release(failed,'reactivation: metadata path rejects conflict');
 PERFORM public.set_appointment_status(b,other.id,'cancelled');
 PERFORM public.update_appointment_metadata(b,a.id,'retained notes','confirmed');
 PERFORM pg_temp.check_release((SELECT status='confirmed' FROM public.appointments WHERE id=a.id),'reactivation: free valid slot succeeds');
 PERFORM public.set_appointment_status(b,a.id,'cancelled');
 INSERT INTO public.business_holidays(business_id,date,name) VALUES(b,day,'Release fixture');
 failed:=false;
 BEGIN PERFORM public.set_appointment_status(b,a.id,'pending'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_HOLIDAY'; END;
 PERFORM pg_temp.check_release(failed,'reactivation: holiday revalidated');
 DELETE FROM public.business_holidays WHERE business_id=b;
 PERFORM public.set_appointment_status(b,a.id,'confirmed');

 INSERT INTO public.time_off(business_id,staff_id,start_at,end_at,status)
 VALUES(b,worker,(day+'10:30'::time) AT TIME ZONE 'Asia/Kolkata',(day+'11:30'::time) AT TIME ZONE 'Asia/Kolkata','approved') RETURNING id INTO leave_id;
 failed:=false;
 BEGIN PERFORM public.save_appointment(b,c,s,worker,day,'10:30','11:00'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_TIME_OFF'; END;
 PERFORM pg_temp.check_release(failed,'leave: explicit staff rejected in business timezone');
 failed:=false;
 BEGIN PERFORM public.save_appointment(b,c,s,NULL,day,'10:30','11:00'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_TIME_UNAVAILABLE'; END;
 PERFORM pg_temp.check_release(failed,'leave: any staff rejected when all eligible staff absent');
 other:=public.save_appointment(b,c,s,worker,day,'10:00','10:30');
 PERFORM pg_temp.check_release(other.id IS NOT NULL,'leave: exact start adjacency allowed');
 other:=public.save_appointment(b,c,s,worker,day,'11:30','12:00');
 PERFORM pg_temp.check_release(other.id IS NOT NULL,'leave: exact end adjacency allowed');
 UPDATE public.time_off SET staff_id=NULL WHERE id=leave_id;
 failed:=false;
 BEGIN PERFORM public.save_appointment(b,c,s,worker,day,'10:30','11:00'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_TIME_OFF'; END;
 PERFORM pg_temp.check_release(failed,'leave: business-wide approved leave blocks explicit staff');
 UPDATE public.time_off SET staff_id=worker,status='pending' WHERE id=leave_id;
 other:=public.save_appointment(b,c,s,worker,day,'10:30','11:00');
 PERFORM pg_temp.check_release(other.id IS NOT NULL,'leave: unapproved leave does not block');
 PERFORM public.set_appointment_status(b,other.id,'cancelled');
 UPDATE public.time_off SET status='approved' WHERE id=leave_id;

 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 SET LOCAL ROLE anon;
 failed:=false;
 BEGIN PERFORM public.create_public_booking(slug,'Release public','', 'public@example.invalid',s,worker,day,'10:30','11:00'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_TIME_OFF'; END;
 RESET ROLE;
 PERFORM pg_temp.check_release(failed,'public leave: explicit staff rejected');
 SET LOCAL ROLE anon;
 failed:=false;
 BEGIN PERFORM public.create_public_booking(slug,'Release public','', 'public@example.invalid',s,NULL,day,'10:30','11:00'); EXCEPTION WHEN SQLSTATE 'P0001' THEN failed:=SQLERRM='CALORA_TIME_UNAVAILABLE'; END;
 RESET ROLE;
 PERFORM pg_temp.check_release(failed,'public leave: any staff rejected');
 PERFORM pg_temp.check_release(NOT EXISTS(SELECT 1 FROM public.customers WHERE business_id=b AND email='public@example.invalid'),'public failure: customer insert rolled back');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 failed:=false;
 BEGIN DELETE FROM public.appointments WHERE id=a.id; EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 RESET ROLE;
 PERFORM pg_temp.check_release(failed AND EXISTS(SELECT 1 FROM public.appointments WHERE id=a.id),'retention: member cannot delete appointment');
 PERFORM pg_temp.check_release(NOT has_table_privilege('authenticated','public.appointment_lifecycle_events','DELETE'),'retention: lifecycle deletion denied');
 PERFORM pg_temp.check_release(NOT has_table_privilege('anon','public.appointments','DELETE'),'retention: anonymous deletion denied');

 -- Real lifecycle events/claims, but no provider is called.
 p:=public.claim_appointment_email(a.id,'appointment.created');
 PERFORM pg_temp.check_release(p->>'outcome'='claimed','delivery: normal claim');
 PERFORM pg_temp.check_release(public.claim_appointment_email(a.id,'appointment.created') IS NULL,'delivery: second worker cannot claim active lease');
 delivery_id:=(p->>'delivery_id')::uuid;
 UPDATE public.notification_deliveries SET claim_expires_at=clock_timestamp()-interval '1 second' WHERE id=delivery_id;
 PERFORM public.recover_appointment_email_claims();
 p2:=public.claim_appointment_email(a.id,'appointment.created');
 PERFORM pg_temp.check_release(p2->>'outcome'='claimed' AND p2->>'claim_token'<>p->>'claim_token','delivery: stale lease recovered with new token');
 PERFORM pg_temp.check_release(p2->>'idempotency_key'=p->>'idempotency_key' AND (p2-'claim_token')=(p-'claim_token'),'delivery: retry preserves idempotency and payload');
 PERFORM public.complete_appointment_email_claim(delivery_id,p->>'idempotency_key',(p->>'claim_token')::uuid,'sent','old-worker',NULL);
 PERFORM pg_temp.check_release((SELECT provider_message_id IS NULL FROM public.notification_deliveries WHERE id=delivery_id),'delivery: stale completion fenced');
 UPDATE public.notification_deliveries SET claim_expires_at=clock_timestamp()-interval '1 second' WHERE id=delivery_id;
 PERFORM public.recover_appointment_email_claims();
 p3:=public.claim_appointment_email(a.id,'appointment.created');
 UPDATE public.notification_deliveries SET claim_expires_at=clock_timestamp()-interval '1 second' WHERE id=delivery_id;
 PERFORM public.recover_appointment_email_claims();
 PERFORM pg_temp.check_release((SELECT attempt_count=3 AND status_id=(SELECT status.id FROM public.notification_statuses status WHERE status.slug='failed') FROM public.notification_deliveries WHERE id=delivery_id),'delivery: retry limit becomes terminal');
 PERFORM pg_temp.check_release(public.claim_appointment_email(a.id,'appointment.created') IS NULL,'delivery: terminal failed row not reclaimed');
 other:=public.save_appointment(b,c,s,worker,day,'16:00','16:30');
 p2:=public.claim_appointment_email(other.id,'appointment.created');
 PERFORM public.complete_appointment_email_claim((p2->>'delivery_id')::uuid,p2->>'idempotency_key',(p2->>'claim_token')::uuid,'failed',NULL,'timeout');
 PERFORM pg_temp.check_release((SELECT status_id=(SELECT status.id FROM public.notification_statuses status WHERE status.slug='processing') FROM public.notification_deliveries WHERE id=(p2->>'delivery_id')::uuid),'delivery: timeout retained for delayed retry');
 UPDATE public.notification_deliveries SET claim_expires_at=clock_timestamp()-interval '1 second',
   first_claim_at=clock_timestamp()-interval '24 hours' WHERE id=(p2->>'delivery_id')::uuid;
 PERFORM public.recover_appointment_email_claims();
 PERFORM pg_temp.check_release(public.claim_appointment_email(other.id,'appointment.created') IS NULL,'delivery: expired provider deduplication window never retried');
 UPDATE public.notification_deliveries SET due_at='-infinity'::timestamptz
 WHERE appointment_id=other.id AND content->>'notification_type'='appointment_reminder';
 p2:=public.claim_due_appointment_email_reminder();
 PERFORM pg_temp.check_release(p2->>'appointment_id'=other.id::text AND p2->>'claim_token' IS NOT NULL,'reminder: same lease model claims due reminder');
 UPDATE public.notification_deliveries SET claim_expires_at=clock_timestamp()-interval '1 second' WHERE id=(p2->>'delivery_id')::uuid;
 p3:=public.claim_due_appointment_email_reminder();
 PERFORM pg_temp.check_release(p3->>'delivery_id'=p2->>'delivery_id' AND p3->>'claim_token'<>p2->>'claim_token','reminder: stale claim recovers');
 DELETE FROM public.notification_settings WHERE business_id=b;
 PERFORM pg_temp.check_release(public.validate_appointment_email_claim((p3->>'delivery_id')::uuid,(p3->>'claim_token')::uuid),'reminder: absent settings preserves 24-hour default');
 INSERT INTO public.notification_settings(business_id) VALUES(b);
 PERFORM public.complete_appointment_email_claim((p3->>'delivery_id')::uuid,p3->>'idempotency_key',(p3->>'claim_token')::uuid,'failed',NULL,'configuration');
 PERFORM pg_temp.check_release((SELECT status_id=(SELECT status.id FROM public.notification_statuses status WHERE status.slug='failed') FROM public.notification_deliveries WHERE id=(p3->>'delivery_id')::uuid),'reminder: configuration failure terminal');

 a:=public.save_appointment(b,c,s,worker,day,'13:00','13:30','retained','confirmed',a.id);
 p:=public.claim_appointment_rescheduled_email(a.id);
 PERFORM pg_temp.check_release(p->>'outcome'='claimed' AND public.validate_appointment_email_claim((p->>'delivery_id')::uuid,(p->>'claim_token')::uuid),'reschedule: eligible before send');
 PERFORM public.complete_appointment_email_claim((p->>'delivery_id')::uuid,p->>'idempotency_key',(p->>'claim_token')::uuid,'sent','fixture-no-provider',NULL);
 PERFORM pg_temp.check_release(public.claim_appointment_rescheduled_email(a.id) IS NULL,'reschedule: repeated processing idempotent');
 a:=public.save_appointment(b,c,s,worker,day,'14:00','14:30','retained','confirmed',a.id);
 p:=public.claim_appointment_rescheduled_email(a.id);
 PERFORM public.set_appointment_status(b,a.id,'cancelled');
 PERFORM pg_temp.check_release(NOT public.validate_appointment_email_claim((p->>'delivery_id')::uuid,(p->>'claim_token')::uuid),'reschedule: cancellation after claim blocks send');
 p2:=public.claim_appointment_email(a.id,'appointment.cancelled');
 PERFORM pg_temp.check_release(p2->>'outcome'='claimed','cancellation: email remains claimable');
 PERFORM public.complete_appointment_email_claim((p2->>'delivery_id')::uuid,p2->>'idempotency_key',(p2->>'claim_token')::uuid,'sent','fixture-no-provider',NULL);
 PERFORM public.set_appointment_status(b,a.id,'confirmed');
 a:=public.save_appointment(b,c,s,worker,day,'15:00','15:30','retained','confirmed',a.id);
 PERFORM public.set_appointment_status(b,a.id,'cancelled');
 PERFORM pg_temp.check_release(public.claim_appointment_rescheduled_email(a.id) IS NULL,'reschedule: pending delivery suppressed after cancellation');
 PERFORM public.set_appointment_status(b,a.id,'confirmed');
 a:=public.save_appointment(b,c,s,worker,day,'15:30','16:00','retained','confirmed',a.id);
 PERFORM public.set_appointment_status(b,a.id,'no_show');
 PERFORM pg_temp.check_release(public.claim_appointment_rescheduled_email(a.id) IS NULL,'reschedule: no-show suppresses pending delivery');
 PERFORM public.set_appointment_status(b,a.id,'completed');
 PERFORM pg_temp.check_release((SELECT status='completed' FROM public.appointments WHERE id=a.id),'status: terminal correction preserves appointment');
 PERFORM pg_temp.check_release(NOT has_function_privilege('authenticated','public.recover_appointment_email_claims()','EXECUTE')
   AND NOT has_function_privilege('anon','public.validate_appointment_email_claim(uuid,uuid)','EXECUTE'),'delivery: privileged RPCs inaccessible to browser');
END $test$;
SELECT count(*) AS assertions_passed FROM release_assertions;

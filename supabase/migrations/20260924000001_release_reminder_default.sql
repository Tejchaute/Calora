-- Preserve the established 24-hour default when settings have not been persisted.
SET lock_timeout = '3s';
CREATE OR REPLACE FUNCTION public.validate_appointment_email_claim(target_delivery_id uuid, target_claim_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE d public.notification_deliveries; a public.appointments; e public.appointment_lifecycle_events;
  zone text; kind text; eligible boolean;
BEGIN
  SELECT delivery.* INTO d FROM public.notification_deliveries delivery
  JOIN public.notification_statuses s ON s.id=delivery.status_id
  WHERE delivery.id=target_delivery_id AND delivery.claim_token=target_claim_token
    AND delivery.claim_expires_at > clock_timestamp() AND s.slug='processing' FOR UPDATE OF delivery;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO a FROM public.appointments WHERE id=d.appointment_id AND business_id=d.business_id;
  SELECT * INTO e FROM public.appointment_lifecycle_events WHERE id=d.event_id AND business_id=d.business_id;
  SELECT COALESCE(timezone,'UTC') INTO zone FROM public.business_settings WHERE business_id=d.business_id;
  kind := d.content->>'notification_type';
  eligible := a.id IS NOT NULL AND public.is_business_notification_enabled(d.business_id,kind);
  IF kind IN ('appointment_rescheduling','appointment_reminder') THEN
    eligible := eligible AND a.status IN ('pending','scheduled','confirmed')
      AND ((a.appointment_date+a.start_time) AT TIME ZONE COALESCE(zone,'UTC')) > clock_timestamp()
      AND public.has_active_subscription(d.business_id);
  END IF;
  IF kind='appointment_rescheduling' THEN
    eligible := eligible AND e.id IS NOT NULL
      AND (a.appointment_date,a.start_time,a.end_time,a.staff_id,a.service_id)
        IS NOT DISTINCT FROM (e.appointment_date,e.start_time,e.end_time,e.staff_id,e.service_id)
      AND NOT EXISTS (SELECT 1 FROM public.appointment_lifecycle_events newer
        WHERE newer.appointment_id=a.id AND newer.event_sequence>e.event_sequence
          AND newer.event_type IN ('appointment.rescheduled','appointment.cancelled','appointment.completed'));
  ELSIF kind='appointment_reminder' THEN
    eligible := eligible AND d.scheduled_for = ((a.appointment_date+a.start_time) AT TIME ZONE COALESCE(zone,'UTC'))
      AND d.reminder_lead_minutes = COALESCE((SELECT reminder_hours_before*60 FROM public.notification_settings WHERE business_id=d.business_id),1440);
  END IF;
  IF NOT COALESCE(eligible,false) THEN
    UPDATE public.notification_deliveries SET status_id=(SELECT id FROM public.notification_statuses WHERE slug='cancelled'),
      failure_category='delivery_ineligible', error_message='Delivery no longer matches the appointment.',
      claim_token=NULL,claim_expires_at=NULL,updated_at=clock_timestamp() WHERE id=d.id;
    RETURN false;
  END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_appointment_email_claim(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_appointment_email_claim(uuid,uuid) TO service_role;

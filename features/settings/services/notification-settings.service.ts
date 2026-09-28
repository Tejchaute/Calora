import { supabase } from '@/lib/supabase/client';
import type { NotificationSettings } from '@/types/database';
import type { NotificationSettingsFormData } from '../schemas/notification-settings.schema';

export type BusinessNotificationSettings = Pick<
  NotificationSettings,
  | 'business_id'
  | 'send_confirmations'
  | 'send_cancellations'
  | 'send_rescheduling'
  | 'send_reminders'
  | 'reminder_hours_before'
  | 'updated_at'
>;

const defaults = (businessId: string): BusinessNotificationSettings => ({
  business_id: businessId,
  send_confirmations: true,
  send_cancellations: true,
  send_rescheduling: true,
  send_reminders: true,
  reminder_hours_before: 24,
  updated_at: '',
});

export async function getNotificationSettings(
  businessId: string,
): Promise<BusinessNotificationSettings> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select(
      'business_id, email_enabled, send_confirmations, send_cancellations, send_rescheduling, send_reminders, reminder_hours_before, updated_at',
    )
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return defaults(businessId);

  const emailEnabled = data.email_enabled;
  return {
    business_id: data.business_id,
    send_confirmations: emailEnabled && data.send_confirmations,
    send_cancellations: emailEnabled && data.send_cancellations,
    send_rescheduling: emailEnabled && data.send_rescheduling,
    send_reminders: emailEnabled && data.send_reminders,
    reminder_hours_before: data.reminder_hours_before,
    updated_at: data.updated_at,
  };
}

export async function updateNotificationSettings(
  businessId: string,
  values: NotificationSettingsFormData,
  expectedUpdatedAt: string,
): Promise<BusinessNotificationSettings> {
  const { data, error } = await supabase.rpc('update_notification_settings', {
    target_business_id: businessId,
    target_send_confirmations: values.send_confirmations,
    target_send_cancellations: values.send_cancellations,
    target_send_rescheduling: values.send_rescheduling,
    target_send_reminders: values.send_reminders,
    target_reminder_hours_before: values.reminder_hours_before,
    expected_updated_at: expectedUpdatedAt || null,
  });

  if (error) throw error;
  if (!data) throw new Error('Notification settings were not returned.');
  return data as BusinessNotificationSettings;
}

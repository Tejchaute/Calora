'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Clock3, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { handleError } from '@/lib/errors/error-handler';
import { useBusiness } from '@/features/business/hooks/use-business';
import {
  notificationSettingsSchema,
  type NotificationSettingsFormData,
} from '../schemas/notification-settings.schema';
import {
  getNotificationSettings,
  updateNotificationSettings,
  type BusinessNotificationSettings,
} from '../services/notification-settings.service';

const reminderOptions = [1, 2, 4, 12, 24, 48] as const;
const defaultValues: NotificationSettingsFormData = {
  send_confirmations: true,
  send_cancellations: true,
  send_rescheduling: true,
  send_reminders: true,
  reminder_hours_before: 24,
};

const notificationRows = [
  {
    key: 'send_confirmations' as const,
    name: 'Appointment confirmation',
    description: 'Send customers an email when an appointment is booked.',
  },
  {
    key: 'send_cancellations' as const,
    name: 'Appointment cancellation',
    description: 'Send customers an email when an appointment is cancelled.',
  },
  {
    key: 'send_rescheduling' as const,
    name: 'Appointment rescheduling',
    description: 'Send customers an email when an appointment is rescheduled.',
  },
  {
    key: 'send_reminders' as const,
    name: 'Appointment reminders',
    description: 'Send customers a reminder before their appointment.',
  },
];

export function NotificationSettingsCard() {
  const { business, membership } = useBusiness();
  const [values, setValues] =
    useState<NotificationSettingsFormData>(defaultValues);
  const [persisted, setPersisted] =
    useState<BusinessNotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const canEdit =
    membership?.role === 'owner' || membership?.role === 'admin';

  const load = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const settings = await getNotificationSettings(business.id);
      setPersisted(settings);
      setValues({
        send_confirmations: settings.send_confirmations,
        send_cancellations: settings.send_cancellations,
        send_rescheduling: settings.send_rescheduling,
        send_reminders: settings.send_reminders,
        reminder_hours_before: settings.reminder_hours_before,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!business?.id || !canEdit || saving) return;
    const parsed = notificationSettingsSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check notification settings.');
      return;
    }

    setSaving(true);
    try {
      const saved = await updateNotificationSettings(
        business.id,
        parsed.data,
        persisted?.updated_at ?? '',
      );
      setPersisted(saved);
      setValues({
        send_confirmations: saved.send_confirmations,
        send_cancellations: saved.send_cancellations,
        send_rescheduling: saved.send_rescheduling,
        send_reminders: saved.send_reminders,
        reminder_hours_before: saved.reminder_hours_before,
      });
      toast.success('Notification settings saved');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        String(error.message).includes('CALORA_NOTIFICATION_SETTINGS_STALE')
      ) {
        toast.error('These settings changed elsewhere. Reload and try again.');
        await load();
      } else {
        handleError(error, {
          fallbackMessage: 'Unable to save notification settings.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="h-5 w-5 text-primary" />
          Notification Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control the customer emails Calora sends for appointment activity.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4" aria-label="Loading notification settings">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-md border border-destructive/30 p-4">
            <p className="text-sm text-foreground">
              Notification settings could not be loaded.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="divide-y rounded-lg border">
              {notificationRows.map((row) => (
                <div
                  key={row.key}
                  className="flex min-h-20 items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Label
                      htmlFor={row.key}
                      className="text-sm font-medium text-foreground"
                    >
                      {row.name}
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.description}
                    </p>
                  </div>
                  <Switch
                    id={row.key}
                    checked={values[row.key]}
                    onCheckedChange={(checked) =>
                      setValues((current) => ({
                        ...current,
                        [row.key]: checked,
                      }))
                    }
                    disabled={!canEdit || saving}
                    aria-describedby={row.key + '-description'}
                  />
                  <span id={row.key + '-description'} className="sr-only">
                    {row.description}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <Label htmlFor="reminder_hours_before">Reminder timing</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    How far before the appointment should the reminder be sent?
                  </p>
                </div>
              </div>
              <Select
                value={String(values.reminder_hours_before)}
                onValueChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    reminder_hours_before: Number(value),
                  }))
                }
                disabled={!values.send_reminders || !canEdit || saving}
              >
                <SelectTrigger
                  id="reminder_hours_before"
                  className="w-full sm:w-44"
                  aria-label="Reminder timing"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reminderOptions.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>
                      {hours} {hours === 1 ? 'hour' : 'hours'} before
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!canEdit && (
              <p className="text-sm text-muted-foreground">
                Only business owners and administrators can change these settings.
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={!canEdit || saving}>
                {saving ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save notification settings
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

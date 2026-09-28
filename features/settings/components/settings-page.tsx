'use client';

import { SettingsForm } from './settings-form';
import { NotificationSettingsCard } from './notification-settings-card';
import { SubscriptionStatusCard } from '@/features/subscriptions/components/subscription-status-card';
import { Badge } from '@/components/ui/badge';
import { useBusiness } from '@/features/business/hooks/use-business';
import { SettingsWorkspaceLinks } from './settings-workspace-links';

export function SettingsPage() {
  const { business, membership } = useBusiness();
  const roleLabel = membership?.role
    ? membership.role.charAt(0).toUpperCase() + membership.role.slice(1)
    : 'Member';

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Business workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Manage the identity and operational configuration for{' '}
            {business?.name ?? 'your business'}.
          </p>
        </div>
        <Badge variant="outline" className="w-fit capitalize">
          {roleLabel}
        </Badge>
      </div>

      <SubscriptionStatusCard compact />
      <SettingsWorkspaceLinks />
      <SettingsForm />
      <section aria-labelledby="notification-settings-heading">
        <h2 id="notification-settings-heading" className="sr-only">
          Notification settings
        </h2>
        <NotificationSettingsCard />
      </section>
    </div>
  );
}

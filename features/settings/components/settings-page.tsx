'use client';

import { SettingsForm } from './settings-form';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your business information and preferences.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}

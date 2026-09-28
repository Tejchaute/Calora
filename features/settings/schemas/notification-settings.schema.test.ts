import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationSettingsSchema } from './notification-settings.schema';

const valid = {
  send_confirmations: true,
  send_cancellations: true,
  send_rescheduling: true,
  send_reminders: true,
  reminder_hours_before: 24,
};

test('supported reminder timing values are accepted', () => {
  for (const hours of [1, 2, 4, 12, 24, 48]) {
    assert.equal(
      notificationSettingsSchema.safeParse({
        ...valid,
        reminder_hours_before: hours,
      }).success,
      true,
    );
  }
});

test('invalid reminder timing values are rejected', () => {
  for (const hours of [0, -1, 1.5, 721]) {
    assert.equal(
      notificationSettingsSchema.safeParse({
        ...valid,
        reminder_hours_before: hours,
      }).success,
      false,
    );
  }
});

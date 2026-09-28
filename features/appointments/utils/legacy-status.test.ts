import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppointmentWithRelations } from '@/types/database';
import { getNextOperationalAppointment, getTodayStatusCounts } from '@/features/dashboard/utils/dashboard-operations';
import { getAppointmentTemporalState } from './appointment-temporal';

const legacy = {
  id: 'legacy', status: 'scheduled', appointment_date: '2026-09-23',
  start_time: '16:00', end_time: '17:00',
} as AppointmentWithRelations;

test('legacy scheduled rows remain operational and are included in pending summary', () => {
  assert.equal(getNextOperationalAppointment([legacy])?.id, 'legacy');
  assert.equal(getTodayStatusCounts([legacy]).pending, 1);
  assert.equal(getTodayStatusCounts([legacy]).total, 1);
});

test('legacy status compatibility does not change the exclusive end boundary', () => {
  assert.equal(getAppointmentTemporalState(legacy, '2026-09-23', '16:30'), 'in-progress');
  assert.equal(getAppointmentTemporalState(legacy, '2026-09-23', '17:00'), 'past');
});

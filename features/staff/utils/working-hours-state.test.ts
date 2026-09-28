import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkingHours } from '@/types/database';
import { restoreWorkingHoursDay } from './working-hours-state';

test('failed update restores the exact authoritative row and preserves other staff/days', () => {
  const previous = { id: 'original', staff_id: null, day_of_week: 2, open_time: '09:00' } as WorkingHours;
  const other = { id: 'other', staff_id: 'staff', day_of_week: 2 } as WorkingHours;
  const optimistic = { ...previous, open_time: '11:00' };
  assert.deepEqual(restoreWorkingHoursDay([optimistic, other], 2, previous), [other, previous]);
});
test('failed first configuration leaves the day absent, rather than phantom hours', () => {
  const optimistic = { id: 'pending', staff_id: null, day_of_week: 2 } as WorkingHours;
  assert.deepEqual(restoreWorkingHoursDay([optimistic], 2, undefined), []);
});

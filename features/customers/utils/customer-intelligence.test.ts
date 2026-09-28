import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AppointmentWithRelations,
  Customer,
  DashboardBusinessClock,
} from '@/types/database';
import { buildCustomerIntelligence } from './customer-intelligence';

const clock = {
  business_date: '2026-09-17',
  business_time: '10:30:00',
  timezone: 'Asia/Kolkata',
  server_now: '2026-09-17T05:00:00Z',
} satisfies DashboardBusinessClock;

const customer = {
  id: 'customer-a',
  business_id: 'business-a',
  full_name: 'Asha Rao',
  email: 'asha@example.test',
  phone: '',
  notes: '',
  date_of_birth: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
} satisfies Customer;

function appointment(
  id: string,
  status: AppointmentWithRelations['status'],
  date: string,
  start: string,
  end: string,
  customerId = customer.id,
) {
  return {
    id,
    customer_id: customerId,
    status,
    appointment_date: date,
    start_time: start,
    end_time: end,
    services: { id: 'service', name: 'Consultation', duration: 30, price: 100 },
    customers: { id: customerId, full_name: 'Asha Rao', email: '', phone: '' },
    staff: null,
  } as AppointmentWithRelations;
}

test('aggregates only appointments belonging to the customer', () => {
  const result = buildCustomerIntelligence(
    [customer],
    [
      appointment('1', 'completed', '2026-09-16', '09:00:00', '09:30:00'),
      appointment('2', 'cancelled', '2026-09-16', '10:00:00', '10:30:00'),
      appointment('3', 'confirmed', '2026-09-18', '09:00:00', '09:30:00'),
      appointment(
        'other',
        'confirmed',
        '2026-09-18',
        '08:00:00',
        '08:30:00',
        'customer-b',
      ),
    ],
    clock,
  )[0];
  assert.equal(result.appointment_count, 3);
  assert.equal(result.completed_count, 1);
  assert.equal(result.cancelled_count, 1);
  assert.equal(result.next_appointment?.id, '3');
});

test('in-progress appointment is operational and exact end boundary is historical', () => {
  const result = buildCustomerIntelligence(
    [customer],
    [
      appointment('ended', 'confirmed', '2026-09-17', '10:00:00', '10:30:00'),
      appointment('current', 'confirmed', '2026-09-17', '10:15:00', '10:45:00'),
    ],
    clock,
  )[0];
  assert.equal(result.next_appointment?.id, 'current');
  assert.equal(result.last_appointment?.id, 'ended');
});

test('completed and cancelled appointments remain in customer history totals', () => {
  const result = buildCustomerIntelligence(
    [customer],
    [
      appointment(
        'completed',
        'completed',
        '2026-09-20',
        '09:00:00',
        '09:30:00',
      ),
      appointment(
        'cancelled',
        'cancelled',
        '2026-09-20',
        '10:00:00',
        '10:30:00',
      ),
    ],
    clock,
  )[0];
  assert.equal(result.appointment_count, 2);
  assert.equal(result.next_appointment, null);
  assert.equal(result.completed_count, 1);
  assert.equal(result.cancelled_count, 1);
});

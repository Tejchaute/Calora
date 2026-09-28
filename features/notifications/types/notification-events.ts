export type AppointmentLifecycleEventType =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.cancelled'
  | 'appointment.rescheduled'
  | 'appointment.completed';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'in_app' | 'push';
export type NotificationDeliveryState =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface AppointmentLifecycleEventPayload {
  eventId: string;
  eventType: AppointmentLifecycleEventType;
  eventSequence: number;
  appointmentId: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  staffId: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface NotificationDispatchRequest {
  event: AppointmentLifecycleEventPayload;
  channel: NotificationChannel;
  recipient: string;
  idempotencyKey: string;
}

export interface NotificationDispatchResult {
  deliveryId: string;
  state: NotificationDeliveryState;
}

export interface NotificationChannelProvider {
  readonly channel: NotificationChannel;
  deliver(request: NotificationDispatchRequest): Promise<NotificationDispatchResult>;
}

export interface NotificationDispatcher {
  dispatch(event: AppointmentLifecycleEventPayload): Promise<NotificationDispatchResult[]>;
}

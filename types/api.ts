// Reserved for external API response shapes and edge function payloads.
// Populate as API integrations (payments, notifications, AI) are added.

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

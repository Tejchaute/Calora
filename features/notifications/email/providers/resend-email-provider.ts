import "server-only";

import { Resend } from "resend";
import type {
  EmailProvider,
  EmailProviderResult,
  TransactionalEmail,
} from "../contracts";
import type { EmailNotificationConfig } from "../config";

type ResendClient = Pick<Resend, "emails">;

export class ResendEmailProvider implements EmailProvider {
  private readonly client: ResendClient;

  constructor(
    private readonly config: EmailNotificationConfig,
    client?: ResendClient,
  ) {
    this.client = client ?? new Resend(config.apiKey);
  }

  async send(
    message: TransactionalEmail,
    idempotencyKey: string,
  ): Promise<EmailProviderResult> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("RESEND_REQUEST_TIMEOUT")),
          this.config.timeoutMs,
        );
      });

      const response = await Promise.race([
        this.client.emails.send(
          {
            from: this.config.fromEmail,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          },
          { idempotencyKey },
        ),
        timeoutPromise,
      ]);

      if (response.error || !response.data?.id) {
        return { ok: false, category: "provider" };
      }

      return { ok: true, providerMessageId: response.data.id };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "RESEND_REQUEST_TIMEOUT"
      ) {
        return { ok: false, category: "timeout" };
      }
      return { ok: false, category: "network" };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

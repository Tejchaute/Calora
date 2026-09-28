import type {
  AppointmentConfirmationEmailData,
  TransactionalEmail,
} from "../contracts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAppointmentDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatAppointmentTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  if (
    hours === undefined ||
    minutes === undefined ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, hours, minutes)));
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

export function buildAppointmentConfirmationEmail(
  data: AppointmentConfirmationEmailData,
): TransactionalEmail {
  const date = formatAppointmentDate(data.appointmentDate);
  const time = formatAppointmentTime(data.startTime);
  const price = formatPrice(data.price, data.currency);
  const subject = `Your appointment with ${data.businessName} is booked`;
  const staffRow = data.staffName
    ? `<tr><td style="padding:8px 0;color:#64748b;width:34%">Staff</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(data.staffName)}</td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">Your appointment with ${escapeHtml(data.businessName)} has been booked.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <tr><td style="padding:30px 32px 16px">
        <p style="margin:0 0 20px;color:#2563eb;font-size:14px;font-weight:700;letter-spacing:.04em">CALORA</p>
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#0f172a">Your appointment is booked</h1>
        <p style="margin:0;color:#475569;font-size:16px;line-height:1.6">Hi ${escapeHtml(data.customerName)}, your appointment with ${escapeHtml(data.businessName)} has been successfully booked.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px">
          <tr><td style="padding:8px 0;color:#64748b;width:34%">Service</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(data.serviceName)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(date)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(time)} <span style="display:block;color:#64748b;font-size:13px;font-weight:400">${escapeHtml(data.timezone)}</span></td></tr>
          ${staffRow}
          <tr><td style="padding:8px 0;color:#64748b">Price</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(price)}</td></tr>
        </table>
        <p style="margin:24px 0 0;color:#475569;font-size:15px;line-height:1.6">We look forward to seeing you.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const staffText = data.staffName ? `\nStaff: ${data.staffName}` : "";
  const text = `Your appointment is booked

Hi ${data.customerName},

Your appointment with ${data.businessName} has been successfully booked.

Service: ${data.serviceName}
Date: ${date}
Time: ${time}
Timezone: ${data.timezone}${staffText}
Price: ${price}

We look forward to seeing you.`;

  return { to: data.recipient, subject, html, text };
}

export const appointmentConfirmationFormatting = {
  formatAppointmentDate,
  formatAppointmentTime,
  formatPrice,
};

import type { ClaimedAppointmentEmail, TransactionalEmail } from '../contracts';
import { appointmentConfirmationFormatting } from './appointment-confirmation';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildAppointmentReschedulingEmail(
  data: ClaimedAppointmentEmail,
): TransactionalEmail {
  const date = appointmentConfirmationFormatting.formatAppointmentDate(
    data.appointmentDate,
  );
  const time = appointmentConfirmationFormatting.formatAppointmentTime(
    data.startTime,
  );
  const price = appointmentConfirmationFormatting.formatPrice(
    data.price,
    data.currency,
  );
  const previousDate = data.previousAppointmentDate
    ? appointmentConfirmationFormatting.formatAppointmentDate(
        data.previousAppointmentDate,
      )
    : null;
  const previousTime = data.previousStartTime
    ? appointmentConfirmationFormatting.formatAppointmentTime(
        data.previousStartTime,
      )
    : null;
  const subject = `Your appointment with ${data.businessName} has been rescheduled`;
  const previousHtml =
    previousDate && previousTime
      ? `<div style="margin:0 0 16px;padding:16px 20px;border:1px solid #e2e8f0;border-radius:12px"><p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Previous appointment</p><p style="margin:0;color:#475569;font-size:15px;line-height:1.6">${escapeHtml(previousDate)} at ${escapeHtml(previousTime)}<br><span style="font-size:13px">${escapeHtml(data.timezone)}</span></p></div>`
      : '';
  const staffRow = data.staffName
    ? `<tr><td style="padding:8px 0;color:#64748b;width:34%">Staff</td><td style="padding:8px 0;color:#0f172a;font-weight:600">${escapeHtml(data.staffName)}</td></tr>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">Your appointment with ${escapeHtml(data.businessName)} has been rescheduled.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <tr><td style="padding:30px 32px 16px">
        <p style="margin:0 0 20px;color:#2563eb;font-size:14px;font-weight:700;letter-spacing:.04em">CALORA</p>
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#0f172a">Your appointment has been rescheduled</h1>
        <p style="margin:0;color:#475569;font-size:16px;line-height:1.6">Hi ${escapeHtml(data.customerName)}, your appointment with ${escapeHtml(data.businessName)} has been rescheduled.</p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px">
        ${previousHtml}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border-radius:12px;padding:16px 20px">
          <tr><td colspan="2" style="padding:8px 0;color:#1d4ed8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">New appointment</td></tr>
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

  const previousText =
    previousDate && previousTime
      ? `Previous appointment: ${previousDate} at ${previousTime} (${data.timezone})\\n\\n`
      : '';
  const staffText = data.staffName ? `\\nStaff: ${data.staffName}` : '';
  const text = `Your appointment has been rescheduled

Hi ${data.customerName},

Your appointment with ${data.businessName} has been rescheduled.

${previousText}New appointment
Service: ${data.serviceName}
Date: ${date}
Time: ${time}
Timezone: ${data.timezone}${staffText}
Price: ${price}

We look forward to seeing you.`;

  return { to: data.recipient, subject, html, text };
}

import nodemailer from 'nodemailer';

let transport;

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST) {
    // geen SMTP ingesteld (lokaal ontwikkelen): mail in de terminal tonen
    console.log(`\n----- MAIL naar ${to} -----\n${subject}\n\n${text}\n---------------------------\n`);
    return;
  }
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });
}

export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

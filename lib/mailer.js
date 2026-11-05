import nodemailer from 'nodemailer';

let transport;

export async function sendMail({ to, subject, html, text }) {
  if (!process.env.SMTP_HOST) {
    // online zonder SMTP-instellingen gaat er niets de deur uit: dat moet een zichtbare fout zijn
    if (process.env.VERCEL) throw new Error('Mail is niet ingesteld: SMTP_HOST ontbreekt in Vercel');
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
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text,
  });
  // de SMTP-server kan een adres weigeren zonder dat sendMail een fout geeft
  if (info.rejected?.length) throw new Error(`Mailserver weigerde ${info.rejected.join(', ')}: ${info.response || ''}`);
  return info;
}

// Voor de testmail: via welke server en welk afzenderadres er verstuurd wordt (zonder wachtwoord)
export function mailSetup() {
  if (!process.env.SMTP_HOST) return null;
  return { host: process.env.SMTP_HOST, from: process.env.MAIL_FROM || process.env.SMTP_USER || '' };
}

export const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

import { randomBytes, createHash } from 'node:crypto';
import { getDb, rows } from '@/lib/db';
import { sendMail, escapeHtml } from '@/lib/mailer';
import { SITE_NAME, SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TOKEN_TTL = 30 * 60 * 1000;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return Response.json({ error: 'Vul een geldig e-mailadres in.' }, { status: 400 });
  }

  const db = await getDb();
  const now = Date.now();
  const [{ n }] = rows(await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?',
    args: [email, now - 60 * 60 * 1000],
  }));
  if (n >= 5) return Response.json({ error: 'Te veel aanvragen. Probeer het over een uur opnieuw.' }, { status: 429 });

  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  await db.execute({
    sql: 'INSERT INTO login_tokens (token_hash, email, expires_at, created_at) VALUES (?, ?, ?, ?)',
    args: [hash, email, now + TOKEN_TTL, now],
  });

  const link = `${SITE_URL}/login/verify?token=${token}`;
  await sendMail({
    to: email,
    subject: `Inloggen bij ${SITE_NAME}`,
    text: `Klik op de link om in te loggen bij ${SITE_NAME}:\n\n${link}\n\nDe link is 30 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;max-width:480px">
      <h2 style="margin:0 0 12px">Inloggen bij ${escapeHtml(SITE_NAME)}</h2>
      <p>Klik op de knop om in te loggen. De link is 30 minuten geldig.</p>
      <p><a href="${link}" style="display:inline-block;background:#0b66e4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Inloggen</a></p>
      <p style="color:#6b7280;font-size:13px">Heb je dit niet aangevraagd? Dan kun je deze mail negeren.</p>
    </div>`,
  });

  return Response.json({ ok: true });
}

import { randomBytes, createHash } from 'node:crypto';
import { getDb, rows } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { loginEmail } from '@/lib/emailTemplates';
import { SITE_URL } from '@/lib/config';

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
  await sendMail({ to: email, ...loginEmail(link) });

  return Response.json({ ok: true });
}

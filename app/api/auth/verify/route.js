import { randomUUID, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb, rows } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

// POST vanuit /login/verify (een formulier), zodat link-scanners in mailprogramma's de token niet opmaken
export async function POST(req) {
  const form = await req.formData();
  const token = String(form.get('token') || '');
  const hash = createHash('sha256').update(token).digest('hex');
  const db = await getDb();

  const [row] = rows(await db.execute({ sql: 'SELECT email, expires_at FROM login_tokens WHERE token_hash = ?', args: [hash] }));
  if (!row || row.expires_at < Date.now()) {
    return NextResponse.redirect(`${SITE_URL}/login?error=expired`, 303);
  }
  await db.execute({ sql: 'DELETE FROM login_tokens WHERE token_hash = ?', args: [hash] });

  let [user] = rows(await db.execute({ sql: 'SELECT id, email FROM users WHERE email = ?', args: [row.email] }));
  if (!user) {
    user = { id: randomUUID(), email: row.email };
    await db.execute({ sql: 'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)', args: [user.id, user.email, Date.now()] });
  }

  const res = NextResponse.redirect(`${SITE_URL}/dashboard`, 303);
  await setSessionCookie(res, user);
  return res;
}

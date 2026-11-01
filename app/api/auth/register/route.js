import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb, rows } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { EMAIL_RE, checkUsername, checkPassword, hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = b.password;

  const error = checkUsername(username)
    || (!EMAIL_RE.test(email) || email.length > 200 ? 'Vul een geldig e-mailadres in.' : null)
    || checkPassword(password);
  if (error) return Response.json({ error }, { status: 400 });

  const db = await getDb();
  const [taken] = rows(await db.execute({ sql: 'SELECT id FROM users WHERE username = ? COLLATE NOCASE', args: [username] }));
  if (taken) return Response.json({ error: 'Deze gebruikersnaam is al bezet.' }, { status: 409 });
  const [existing] = rows(await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email] }));
  if (existing) {
    return Response.json({ error: 'Er bestaat al een account met dit e-mailadres. Log in, of gebruik "Wachtwoord vergeten".' }, { status: 409 });
  }

  const user = { id: randomUUID(), email };
  await db.execute({
    sql: 'INSERT INTO users (id, email, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [user.id, email, username, await hashPassword(password), Date.now()],
  });

  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, user);
  return res;
}

import { NextResponse } from 'next/server';
import { getDb, rows } from '@/lib/db';
import { setSessionCookie } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
let dummyHash;

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const identifier = String(b.identifier || '').trim();
  const password = String(b.password || '');
  if (!identifier || !password) return Response.json({ error: 'Vul je gebruikersnaam en wachtwoord in.' }, { status: 400 });

  const db = await getDb();
  const key = identifier.toLowerCase();
  const now = Date.now();
  const [{ n }] = rows(await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM login_attempts WHERE attempt_key = ? AND at > ?',
    args: [key, now - WINDOW_MS],
  }));
  if (n >= MAX_FAILURES) return Response.json({ error: 'Te veel mislukte pogingen. Probeer het over 15 minuten opnieuw.' }, { status: 429 });

  const [user] = rows(await db.execute({
    sql: identifier.includes('@')
      ? 'SELECT id, email, password_hash FROM users WHERE email = ?'
      : 'SELECT id, email, password_hash FROM users WHERE username = ? COLLATE NOCASE',
    args: [identifier.includes('@') ? key : identifier],
  }));

  // ook zonder gebruiker een hash controleren, zodat de responstijd niet verraadt of een account bestaat
  dummyHash ||= await hashPassword('dummy-password');
  const ok = await verifyPassword(password, user?.password_hash || dummyHash) && !!user?.password_hash;
  if (!ok) {
    await db.execute({ sql: 'INSERT INTO login_attempts (attempt_key, at) VALUES (?, ?)', args: [key, now] });
    return Response.json({ error: 'Gebruikersnaam of wachtwoord klopt niet.' }, { status: 401 });
  }

  await db.execute({ sql: 'DELETE FROM login_attempts WHERE attempt_key = ?', args: [key] });
  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, user);
  return res;
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUser, SESSION_COOKIE } from '@/lib/session';
import { SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  await db.batch([
    { sql: 'DELETE FROM seen WHERE filter_id IN (SELECT id FROM filters WHERE user_id = ?)', args: [user.id] },
    { sql: 'DELETE FROM hits WHERE user_id = ?', args: [user.id] },
    { sql: 'DELETE FROM filters WHERE user_id = ?', args: [user.id] },
    { sql: 'DELETE FROM login_tokens WHERE email = ?', args: [user.email] },
    { sql: 'DELETE FROM login_attempts WHERE attempt_key = ?', args: [user.email] },
    { sql: 'DELETE FROM users WHERE id = ?', args: [user.id] },
  ], 'write');
  const res = NextResponse.redirect(`${SITE_URL}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

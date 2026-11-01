import { getDb, rows } from '@/lib/db';
import { getUser } from '@/lib/session';
import { checkUsername, checkPassword, hashPassword, verifyPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  const [u] = rows(await db.execute({ sql: 'SELECT email, username, password_hash FROM users WHERE id = ?', args: [user.id] }));
  if (!u) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  return Response.json({ email: u.email, username: u.username, hasPassword: !!u.password_hash });
}

// Gebruikersnaam instellen (eenmalig) en/of wachtwoord instellen of wijzigen
export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const db = await getDb();
  const [u] = rows(await db.execute({ sql: 'SELECT username, password_hash FROM users WHERE id = ?', args: [user.id] }));
  if (!u) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });

  if (u.password_hash && !(await verifyPassword(String(b.currentPassword || ''), u.password_hash))) {
    return Response.json({ error: 'Je huidige wachtwoord klopt niet.' }, { status: 400 });
  }

  let username = u.username;
  if (!username) {
    username = String(b.username || '').trim();
    const err = checkUsername(username);
    if (err) return Response.json({ error: err }, { status: 400 });
    const [taken] = rows(await db.execute({ sql: 'SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id != ?', args: [username, user.id] }));
    if (taken) return Response.json({ error: 'Deze gebruikersnaam is al bezet.' }, { status: 409 });
  }
  const err = checkPassword(b.password);
  if (err) return Response.json({ error: err }, { status: 400 });

  await db.execute({
    sql: 'UPDATE users SET username = ?, password_hash = ? WHERE id = ?',
    args: [username, await hashPassword(b.password), user.id],
  });
  return Response.json({ ok: true, username });
}

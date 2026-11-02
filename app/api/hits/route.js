import { getDb, rows } from '@/lib/db';
import { getUser } from '@/lib/session';
import { scanDue } from '@/lib/scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  // zolang het dashboard openstaat scannen we de filters van deze gebruiker die aan de beurt zijn,
  // zodat de site ook werkt als de externe cron even niet draait
  await scanDue(db, { userId: user.id, timeBudgetMs: 8000, limit: 5, source: 'dashboard' }).catch(e => console.error('Dashboard-scan mislukt', e));
  const hits = rows(await db.execute({
    sql: `SELECT h.*, f.name AS filter_name FROM hits h JOIN filters f ON f.id = h.filter_id
          WHERE h.user_id = ? ORDER BY h.id DESC LIMIT 200`,
    args: [user.id],
  }));
  return Response.json({ hits });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM hits WHERE user_id = ?', args: [user.id] });
  return Response.json({ ok: true });
}

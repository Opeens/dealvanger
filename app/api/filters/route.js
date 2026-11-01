import { randomUUID } from 'node:crypto';
import { getDb, rows } from '@/lib/db';
import { getUser } from '@/lib/session';
import { parseFilter, FILTER_FIELDS } from '@/lib/filters';
import { MAX_FILTERS_PER_USER } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  const filters = rows(await db.execute({ sql: 'SELECT * FROM filters WHERE user_id = ? ORDER BY created_at', args: [user.id] }));
  return Response.json({ filters, max: MAX_FILTERS_PER_USER, now: Date.now() });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const { error, value } = parseFilter(await req.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });

  const db = await getDb();
  const [{ n }] = rows(await db.execute({ sql: 'SELECT COUNT(*) AS n FROM filters WHERE user_id = ?', args: [user.id] }));
  if (n >= MAX_FILTERS_PER_USER) {
    return Response.json({ error: `Je kunt maximaal ${MAX_FILTERS_PER_USER} filters hebben.` }, { status: 400 });
  }

  const id = randomUUID();
  const cols = ['id', 'user_id', 'created_at', 'next_scan_at', ...FILTER_FIELDS];
  const args = [id, user.id, Date.now(), 0, ...FILTER_FIELDS.map(k => value[k])];
  await db.execute({
    sql: `INSERT INTO filters (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    args,
  });
  return Response.json({ id });
}

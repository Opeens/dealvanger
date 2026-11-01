import { getDb } from '@/lib/db';
import { getUser } from '@/lib/session';
import { parseFilter, FILTER_FIELDS } from '@/lib/filters';
import { scanDue } from '@/lib/scanner';

export const dynamic = 'force-dynamic';

// Volledige wijziging: zoekcriteria kunnen veranderd zijn, dus basislijn opnieuw zetten
export async function PUT(req, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const { id } = await params;
  const { error, value } = parseFilter(await req.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });

  const db = await getDb();
  const res = await db.execute({
    sql: `UPDATE filters SET ${FILTER_FIELDS.map(k => `${k} = ?`).join(', ')}, baseline_done = 0, next_scan_at = 0, last_error = NULL
          WHERE id = ? AND user_id = ?`,
    args: [...FILTER_FIELDS.map(k => value[k]), id, user.id],
  });
  if (!res.rowsAffected) return Response.json({ error: 'Filter niet gevonden' }, { status: 404 });
  await db.execute({ sql: 'DELETE FROM seen WHERE filter_id = ?', args: [id] });
  await scanDue(db, { userId: user.id, timeBudgetMs: 8000, limit: 3 }).catch(e => console.error('Scan na wijzigen mislukt', e));
  return Response.json({ ok: true });
}

// Alleen aan/uit-schakelaars
export async function PATCH(req, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const db = await getDb();
  if ('enabled' in b) {
    await db.execute({ sql: 'UPDATE filters SET enabled = ?, next_scan_at = 0 WHERE id = ? AND user_id = ?', args: [b.enabled ? 1 : 0, id, user.id] });
  }
  if ('email_deals' in b) {
    await db.execute({ sql: 'UPDATE filters SET email_deals = ? WHERE id = ? AND user_id = ?', args: [b.email_deals ? 1 : 0, id, user.id] });
  }
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  const res = await db.execute({ sql: 'DELETE FROM filters WHERE id = ? AND user_id = ?', args: [id, user.id] });
  if (res.rowsAffected) {
    await db.batch([
      { sql: 'DELETE FROM seen WHERE filter_id = ?', args: [id] },
      { sql: 'DELETE FROM hits WHERE filter_id = ?', args: [id] },
    ], 'write');
  }
  return Response.json({ ok: true });
}

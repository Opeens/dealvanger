import { randomUUID } from 'node:crypto';
import { getDb, getMeta, rows } from '@/lib/db';
import { getUser } from '@/lib/session';
import { parseFilter, FILTER_FIELDS } from '@/lib/filters';
import { maxFiltersFor, isOwner } from '@/lib/config';
import { scanDue } from '@/lib/scanner';
import { aiAvailable } from '@/lib/aiCheck';

export const dynamic = 'force-dynamic';
// de eerste scan kan met AI-controle wat langer duren
export const maxDuration = 60;

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const db = await getDb();
  const filters = rows(await db.execute({ sql: 'SELECT * FROM filters WHERE user_id = ? ORDER BY created_at', args: [user.id] }));
  const meta = await getMeta(db, ['mp_blocked_until', 'last_cron_at', 'last_mail_error', 'last_mail_ok_at']);
  let mailError = null;
  try { mailError = meta.last_mail_error ? JSON.parse(meta.last_mail_error) : null; } catch {}
  // alleen tonen aan de eigenaar, als de fout van het laatste etmaal is en er daarna geen mail is gelukt
  if (!isOwner(user) || !mailError || mailError.at < Date.now() - 86400000 || Number(meta.last_mail_ok_at || 0) > mailError.at) mailError = null;
  const blockedUntil = Number(meta.mp_blocked_until || 0);
  return Response.json({
    filters, max: maxFiltersFor(user), now: Date.now(), ai: aiAvailable(),
    blockedUntil: blockedUntil > Date.now() ? blockedUntil : null,
    // wanneer de externe cron (cron-job.org) voor het laatst scande; 0 = nog nooit
    lastCronAt: Number(meta.last_cron_at || 0),
    mailError,
  });
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const { error, value } = parseFilter(await req.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });

  const db = await getDb();
  const [{ n }] = rows(await db.execute({ sql: 'SELECT COUNT(*) AS n FROM filters WHERE user_id = ?', args: [user.id] }));
  const max = maxFiltersFor(user);
  if (n >= max) {
    return Response.json({ error: `Je kunt maximaal ${max} filters hebben.` }, { status: 400 });
  }

  const id = randomUUID();
  const cols = ['id', 'user_id', 'created_at', 'next_scan_at', ...FILTER_FIELDS];
  const args = [id, user.id, Date.now(), 0, ...FILTER_FIELDS.map(k => value[k])];
  await db.execute({
    sql: `INSERT INTO filters (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    args,
  });
  // eerste scan (basislijn) meteen doen, zodat de gebruiker niet op de cron hoeft te wachten
  await scanDue(db, { userId: user.id, timeBudgetMs: 8000, limit: 3 }).catch(e => console.error('Eerste scan mislukt', e));
  return Response.json({ id });
}

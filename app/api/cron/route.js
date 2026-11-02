import { getDb } from '@/lib/db';
import { scanDue } from '@/lib/scanner';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Aangeroepen door cron-job.org (elke minuut) of Vercel Cron, beveiligd met CRON_SECRET
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = url.searchParams.get('key') || req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (secret ? given !== secret : process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = await getDb();
    // cron-job.org wacht max. 30s op antwoord
    const result = await scanDue(db, { timeBudgetMs: 25000, source: 'cron' });

    // af en toe opruimen
    if (Math.random() < 0.02) {
      const now = Date.now();
      await db.batch([
        { sql: 'DELETE FROM seen WHERE seen_at < ?', args: [now - 30 * 86400000] },
        { sql: 'DELETE FROM hits WHERE found_at < ?', args: [now - 14 * 86400000] },
        { sql: 'DELETE FROM login_tokens WHERE expires_at < ?', args: [now] },
        { sql: 'DELETE FROM login_attempts WHERE at < ?', args: [now - 86400000] },
      ], 'write');
    }
    return Response.json(result);
  } catch (e) {
    // alleen zichtbaar met de juiste CRON_SECRET, handig om problemen te vinden
    console.error('Cron mislukt', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

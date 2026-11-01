import { getDb, rows } from '@/lib/db';
import { buildSearchUrl, fetchListings, matches, toHit, formatPrice, BlockedError } from '@/lib/marktplaats';
import { sendMail, escapeHtml } from '@/lib/mailer';
import { SITE_NAME, SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TIME_BUDGET_MS = 25000;   // cron-job.org wacht max. 30s op antwoord
const MIN_GAP_MS = 1200;        // tijd tussen twee requests naar Marktplaats
const BLOCK_PAUSE_MS = 10 * 60 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Aangeroepen door cron-job.org (elke minuut) of Vercel Cron, beveiligd met CRON_SECRET
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = url.searchParams.get('key') || req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (secret ? given !== secret : process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await getDb();
  const started = Date.now();
  const due = rows(await db.execute({
    sql: `SELECT f.*, u.email FROM filters f JOIN users u ON u.id = f.user_id
          WHERE f.enabled = 1 AND f.next_scan_at <= ? ORDER BY f.next_scan_at LIMIT 60`,
    args: [started],
  }));

  // identieke zoekopdrachten van verschillende gebruikers maar één keer ophalen
  const cache = new Map();
  let lastRequest = 0;
  let scanned = 0, newHits = 0, mails = 0, blocked = false;

  for (const f of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const searchUrl = buildSearchUrl(f);
    let listings;
    try {
      if (!cache.has(searchUrl)) {
        const wait = MIN_GAP_MS - (Date.now() - lastRequest);
        if (wait > 0) await sleep(wait);
        lastRequest = Date.now();
        cache.set(searchUrl, await fetchListings(searchUrl));
      }
      listings = cache.get(searchUrl);
    } catch (e) {
      blocked = e instanceof BlockedError;
      await db.execute({
        sql: 'UPDATE filters SET last_error = ?, next_scan_at = ? WHERE id = ?',
        args: [e.message, Date.now() + (blocked ? BLOCK_PAUSE_MS : f.interval_min * 60000), f.id],
      });
      if (blocked) break;
      continue;
    }

    const result = await processFilter(db, f, listings);
    scanned++;
    newHits += result.newCount;
    if (result.mailed) mails++;
  }

  // af en toe opruimen
  if (Math.random() < 0.02) {
    const now = Date.now();
    await db.batch([
      { sql: 'DELETE FROM seen WHERE seen_at < ?', args: [now - 30 * 86400000] },
      { sql: 'DELETE FROM hits WHERE found_at < ?', args: [now - 14 * 86400000] },
      { sql: 'DELETE FROM login_tokens WHERE expires_at < ?', args: [now] },
    ], 'write');
  }

  return Response.json({ due: due.length, scanned, newHits, mails, blocked, ms: Date.now() - started });
}

async function processFilter(db, f, listings) {
  const now = Date.now();
  const ids = listings.map(l => String(l.itemId)).filter(Boolean);
  let seenIds = new Set();
  if (ids.length) {
    const res = await db.execute({
      sql: `SELECT item_id FROM seen WHERE filter_id = ? AND item_id IN (${ids.map(() => '?').join(',')})`,
      args: [f.id, ...ids],
    });
    seenIds = new Set(rows(res).map(r => r.item_id));
  }

  const isBaseline = !f.baseline_done;
  const stmts = [];
  const hits = [];
  for (const l of listings) {
    const id = String(l.itemId || '');
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    stmts.push({ sql: 'INSERT OR IGNORE INTO seen (filter_id, item_id, seen_at) VALUES (?, ?, ?)', args: [f.id, id, now] });
    if (!matches(f, l)) continue;
    const h = toHit(f, l);
    hits.push(h);
    stmts.push({
      sql: `INSERT INTO hits (filter_id, user_id, item_id, title, price_cents, price_type, profit, city, distance_km, seller, image, url, is_new, is_deal, found_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [f.id, f.user_id, h.item_id, h.title, h.price_cents, h.price_type, h.profit, h.city, h.distance_km, h.seller, h.image, h.url, isBaseline ? 0 : 1, h.is_deal, now],
    });
  }
  // 5s speling zodat een filter van "elke minuut" bij elke cron-aanroep meedoet
  stmts.push({
    sql: 'UPDATE filters SET baseline_done = 1, last_scan_at = ?, last_error = NULL, next_scan_at = ? WHERE id = ?',
    args: [now, now + f.interval_min * 60000 - 5000, f.id],
  });
  await db.batch(stmts, 'write');

  let mailed = false;
  const deals = isBaseline ? [] : hits.filter(h => h.is_deal);
  if (f.email_deals && deals.length) {
    try {
      await sendDealMail(f, deals);
      mailed = true;
    } catch (e) {
      console.error('Mail mislukt', f.email, e.message);
    }
  }
  return { newCount: isBaseline ? 0 : hits.length, mailed };
}

async function sendDealMail(f, deals) {
  const subject = deals.length === 1
    ? `Deal: ${deals[0].title} – ${formatPrice(deals[0])} (+€${Math.round(deals[0].profit)})`
    : `${deals.length} nieuwe deals voor "${f.name}"`;
  const text = deals.map(d => `${d.title}\n${formatPrice(d)} · +€${Math.round(d.profit)} winst · ${d.city}\n${d.url}`).join('\n\n')
    + `\n\nBeheer je filters: ${SITE_URL}/dashboard`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.45;max-width:560px">
    <h2 style="margin:0 0 4px">Nieuwe deal${deals.length > 1 ? 's' : ''} voor &quot;${escapeHtml(f.name)}&quot;</h2>
    <p style="color:#6b7280;margin:0 0 16px">Wees er snel bij!</p>
    ${deals.map(d => `
      <a href="${escapeHtml(d.url)}" style="display:flex;gap:12px;text-decoration:none;color:#16181d;border:1px solid #e3e5ea;border-radius:10px;padding:10px;margin-bottom:10px">
        ${d.image ? `<img src="${escapeHtml(d.image)}" width="96" height="72" style="object-fit:cover;border-radius:6px" alt="">` : ''}
        <div>
          <div style="font-weight:600">${escapeHtml(d.title)}</div>
          <div><b>${escapeHtml(formatPrice(d))}</b> <span style="background:#e3f6ec;color:#0f8a4a;font-weight:700;padding:1px 6px;border-radius:5px;font-size:13px">+€${Math.round(d.profit)} winst</span></div>
          <div style="color:#6b7280;font-size:13px">${escapeHtml(d.city)}${d.distance_km != null ? ` · ${d.distance_km} km` : ''}</div>
        </div>
      </a>`).join('')}
    <p style="font-size:13px;color:#6b7280">Geen mails meer voor dit filter? Zet ze uit in je <a href="${SITE_URL}/dashboard">dashboard</a>.<br>${escapeHtml(SITE_NAME)}</p>
  </div>`;
  await sendMail({ to: f.email, subject, text, html });
}

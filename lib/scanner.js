import { rows } from './db';
import { buildSearchUrl, fetchListings, matches, toHit, BlockedError } from './marktplaats';
import { sendMail } from './mailer';
import { dealEmail } from './emailTemplates';

const MIN_GAP_MS = 1200;        // tijd tussen twee requests naar Marktplaats
const BLOCK_PAUSE_MS = 10 * 60 * 1000;
const CLAIM_MS = 60 * 1000;     // zolang een filter "bezet" is tijdens het scannen
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Scant alle filters waarvan de volgende scan is aangebroken; optioneel alleen die van één gebruiker.
// Wordt aangeroepen door de cron, bij het aanmaken van een filter en vanuit het open dashboard.
export async function scanDue(db, { userId = null, timeBudgetMs = 25000, limit = 60 } = {}) {
  const started = Date.now();
  const due = rows(await db.execute({
    sql: `SELECT f.*, u.email, u.blacklist AS user_blacklist FROM filters f JOIN users u ON u.id = f.user_id
          WHERE f.enabled = 1 AND f.next_scan_at <= ? ${userId ? 'AND f.user_id = ?' : ''}
          ORDER BY f.next_scan_at LIMIT ?`,
    args: userId ? [started, userId, limit] : [started, limit],
  }));

  // identieke zoekopdrachten van verschillende gebruikers maar één keer ophalen
  const cache = new Map();
  let lastRequest = 0;
  let scanned = 0, newHits = 0, mails = 0, blocked = false;

  for (const f of due) {
    if (Date.now() - started > timeBudgetMs) break;

    // filter claimen, zodat cron en dashboard hetzelfde filter niet tegelijk scannen
    const now = Date.now();
    const claim = await db.execute({
      sql: 'UPDATE filters SET next_scan_at = ? WHERE id = ? AND next_scan_at = ?',
      args: [now + CLAIM_MS, f.id, f.next_scan_at],
    });
    if (!claim.rowsAffected) continue;

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

  return { due: due.length, scanned, newHits, mails, blocked, ms: Date.now() - started };
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
  await sendMail({ to: f.email, ...dealEmail(f, deals) });
}

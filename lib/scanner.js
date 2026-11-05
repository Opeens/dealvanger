import { rows, getMeta, setMeta } from './db';
import { buildSearchUrl, fetchListings, matches, toHit, BlockedError } from './marktplaats';
import { sendMail } from './mailer';
import { dealEmail } from './emailTemplates';
import { checkListings } from './aiCheck';

const BASELINE_AI_LIMIT = 30;
// Marktplaats geeft ~400.000 advertentienummers per dag uit; deze marge (~1 uur) vangt advertenties
// op die iets later in de zoekresultaten verschijnen dan een nieuwere advertentie
const NEW_ID_TOLERANCE = 20000;

// "m2460562397" -> 2460562397; andere reeksen (bijv. "a1531937119") -> null
const itemNum = id => {
  const m = /^m(\d+)$/.exec(String(id || ''));
  return m ? Number(m[1]) : null;
};
const maxItemNum = ids => {
  const nums = [...ids].map(itemNum).filter(n => n != null);
  return nums.length ? Math.max(...nums) : null;
};

const MIN_GAP_MS = 1200;        // tijd tussen twee requests naar Marktplaats
// Blokkeert Marktplaats ons (403/429), dan pauzeren ALLE scans, steeds langer bij herhaling:
// 10, 20, 40 en daarna 60 minuten. Een geslaagde scan zet de teller weer op nul.
const BLOCK_PAUSES_MIN = [10, 20, 40, 60];
// het open dashboard scant alleen zelf als de cron de afgelopen 90 s niet heeft gedraaid,
// anders zouden cron en dashboard samen Marktplaats vaker bevragen dan nodig
const CRON_ACTIVE_MS = 90 * 1000;
const CLAIM_MS = 60 * 1000;     // zolang een filter "bezet" is tijdens het scannen
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Scant alle filters waarvan de volgende scan is aangebroken; optioneel alleen die van één gebruiker.
// Wordt aangeroepen door de cron, bij het aanmaken van een filter en vanuit het open dashboard.
// Het totale aantal requests is begrensd: elk filter hoogstens één keer per interval, per ronde
// hoogstens timeBudgetMs / MIN_GAP_MS requests. Zijn er meer filters dan in een ronde passen,
// dan schuiven de rest door naar de volgende ronde (oudste eerst) in plaats van sneller te scannen.
export async function scanDue(db, { userId = null, timeBudgetMs = 25000, limit = 60, source = 'other' } = {}) {
  const started = Date.now();
  const meta = await getMeta(db, ['mp_blocked_until', 'mp_block_level', 'last_cron_at']);
  const blockedUntil = Number(meta.mp_blocked_until || 0);
  // ook tijdens een pauze bijhouden dat de cron draait, anders waarschuwt het dashboard onterecht
  if (source === 'cron') await setMeta(db, { last_cron_at: started });
  if (blockedUntil > started) return { due: 0, scanned: 0, newHits: 0, mails: 0, blocked: true, pausedUntil: blockedUntil, ms: 0 };
  if (source === 'dashboard' && started - Number(meta.last_cron_at || 0) < CRON_ACTIVE_MS) {
    return { due: 0, scanned: 0, newHits: 0, mails: 0, blocked: false, skipped: 'cron actief', ms: 0 };
  }
  const blockLevel = Number(meta.mp_block_level || 0);

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
      if (blocked) {
        const pauseMin = BLOCK_PAUSES_MIN[Math.min(blockLevel, BLOCK_PAUSES_MIN.length - 1)];
        const until = Date.now() + pauseMin * 60000;
        await setMeta(db, { mp_blocked_until: until, mp_block_level: blockLevel + 1 });
        // filter vrijgeven: het wordt na de pauze gewoon weer gescand
        await db.execute({ sql: 'UPDATE filters SET next_scan_at = ? WHERE id = ?', args: [until, f.id] });
        console.warn(`Marktplaats blokkeert (${e.message}), alle scans ${pauseMin} min gepauzeerd`);
        break;
      }
      await db.execute({
        sql: 'UPDATE filters SET last_error = ?, next_scan_at = ? WHERE id = ?',
        args: [e.message, Date.now() + f.interval_min * 60000, f.id],
      });
      continue;
    }

    const result = await processFilter(db, f, listings);
    scanned++;
    newHits += result.newCount;
    if (result.mailed) mails++;
  }

  if (!blocked && scanned && blockLevel) await setMeta(db, { mp_block_level: 0 });
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
  // Hoogste advertentienummer dat dit filter eerder zag. Oude advertenties die omhoog geplaatst of
  // bewerkt zijn krijgen bij Marktplaats de datum "Vandaag", maar houden hun oude (lagere) nummer.
  const prevMax = f.max_item_num ?? maxItemNum(seenIds);
  let newMax = prevMax ?? 0;
  const isFresh = l => {
    const num = itemNum(l.itemId);
    if (num == null) return l.date === 'Vandaag'; // andere nummerreeks (bijv. bedrijfsadvertenties)
    return prevMax == null || num > prevMax - NEW_ID_TOLERANCE;
  };

  const stmts = [];
  const candidates = [];
  for (const l of listings) {
    const id = String(l.itemId || '');
    newMax = Math.max(newMax, itemNum(id) ?? 0);
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    stmts.push({ sql: 'INSERT OR IGNORE INTO seen (filter_id, item_id, seen_at) VALUES (?, ?, ?)', args: [f.id, id, now] });
    // na de eerste scan alleen echt nieuw geplaatste advertenties, geen omhoog geplaatste oude
    if (!isBaseline && !isFresh(l)) continue;
    if (!matches(f, l)) continue;
    candidates.push({ listing: l, hit: toHit(f, l) });
  }

  // AI-controle op foto + tekst; bij de eerste scan alleen de nieuwste advertenties om kosten te beperken
  if (f.ai_check) {
    const toCheck = isBaseline ? candidates.slice(0, BASELINE_AI_LIMIT) : candidates;
    const verdicts = await checkListings(f, toCheck);
    for (const { hit } of candidates) {
      const v = verdicts.get(hit.item_id);
      hit.ai_verdict = v ? (v.match ? 1 : 0) : null;
      hit.ai_reason = v?.reason ?? null;
      if (hit.ai_verdict === 0) hit.is_deal = 0;
    }
  }

  const hits = candidates.map(c => c.hit);
  for (const h of hits) {
    stmts.push({
      sql: `INSERT INTO hits (filter_id, user_id, item_id, title, price_cents, price_type, profit, city, distance_km, seller, image, url, is_new, is_deal, found_at, ai_verdict, ai_reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [f.id, f.user_id, h.item_id, h.title, h.price_cents, h.price_type, h.profit, h.city, h.distance_km, h.seller, h.image, h.url,
        isBaseline ? 0 : 1, h.is_deal, now, h.ai_verdict ?? null, h.ai_reason ?? null],
    });
  }
  // 5s speling zodat een filter van "elke minuut" bij elke cron-aanroep meedoet
  stmts.push({
    sql: 'UPDATE filters SET baseline_done = 1, last_scan_at = ?, last_error = NULL, next_scan_at = ?, max_item_num = ? WHERE id = ?',
    args: [now, now + f.interval_min * 60000 - 5000, newMax || null, f.id],
  });
  await db.batch(stmts, 'write');

  let mailed = false;
  const deals = isBaseline ? [] : hits.filter(h => h.is_deal && h.ai_verdict !== 0);
  if (f.email_deals && deals.length) {
    try {
      await sendDealMail(f, deals);
      mailed = true;
    } catch (e) {
      console.error('Mail mislukt', f.email, e.message);
    }
  }
  return { newCount: isBaseline ? 0 : hits.filter(h => h.ai_verdict !== 0).length, mailed };
}

async function sendDealMail(f, deals) {
  await sendMail({ to: f.email, ...dealEmail(f, deals) });
}

let client;
let ready;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_tokens (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS filters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    min_price REAL,
    max_price REAL,
    resale_price REAL,
    min_profit REAL,
    postcode TEXT,
    distance_km REAL,
    require_words TEXT,
    exclude_words TEXT,
    title_only INTEGER NOT NULL DEFAULT 1,
    skip_ads INTEGER NOT NULL DEFAULT 1,
    include_no_price INTEGER NOT NULL DEFAULT 0,
    email_deals INTEGER NOT NULL DEFAULT 1,
    interval_min INTEGER NOT NULL DEFAULT 1,
    enabled INTEGER NOT NULL DEFAULT 1,
    baseline_done INTEGER NOT NULL DEFAULT 0,
    next_scan_at INTEGER NOT NULL DEFAULT 0,
    last_scan_at INTEGER,
    last_error TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS filters_user ON filters(user_id)`,
  `CREATE INDEX IF NOT EXISTS filters_due ON filters(enabled, next_scan_at)`,
  `CREATE TABLE IF NOT EXISTS seen (
    filter_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    seen_at INTEGER NOT NULL,
    PRIMARY KEY (filter_id, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS hits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filter_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    title TEXT,
    price_cents INTEGER,
    price_type TEXT,
    profit REAL,
    city TEXT,
    distance_km INTEGER,
    seller TEXT,
    image TEXT,
    url TEXT,
    is_new INTEGER NOT NULL,
    is_deal INTEGER NOT NULL,
    found_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS hits_user ON hits(user_id, id)`,
];

export async function getDb() {
  if (!client) {
    const url = (process.env.TURSO_DATABASE_URL || 'file:local.db').trim();
    // externe database via de web-client (geen native module nodig op Vercel), lokaal bestand via de node-client
    const { createClient } = url.startsWith('file:') ? await import('@libsql/client') : await import('@libsql/client/web');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  }
  if (!ready) ready = client.batch(SCHEMA, 'write').catch(e => { ready = null; throw e; });
  await ready;
  return client;
}

// libsql-rijen omzetten naar gewone objecten (veilig voor JSON)
export function rows(result) {
  return result.rows.map(r => Object.fromEntries(result.columns.map(c => [c, r[c]])));
}

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
  `CREATE TABLE IF NOT EXISTS login_attempts (
    attempt_key TEXT NOT NULL,
    at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS login_attempts_key ON login_attempts(attempt_key, at)`,
  // losse instellingen/status van de site, bijv. tot wanneer Marktplaats-scans gepauzeerd zijn
  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )`,
];

// kolommen die later zijn toegevoegd; bestaan ze al, dan geeft SQLite een fout die we negeren
const MIGRATIONS = [
  'ALTER TABLE users ADD COLUMN username TEXT',
  'ALTER TABLE users ADD COLUMN password_hash TEXT',
  'ALTER TABLE users ADD COLUMN blacklist TEXT',
  'ALTER TABLE filters ADD COLUMN l1_category_id INTEGER',
  'ALTER TABLE filters ADD COLUMN l2_category_id INTEGER',
  'ALTER TABLE filters ADD COLUMN category_label TEXT',
  'ALTER TABLE filters ADD COLUMN attributes TEXT',
  'ALTER TABLE filters ADD COLUMN ranges TEXT',
  'ALTER TABLE filters ADD COLUMN ai_check INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE filters ADD COLUMN ai_description TEXT',
  'ALTER TABLE hits ADD COLUMN ai_verdict INTEGER',
  'ALTER TABLE hits ADD COLUMN ai_reason TEXT',
  'ALTER TABLE filters ADD COLUMN max_item_num INTEGER',
];
const AFTER_MIGRATIONS = [
  'CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username COLLATE NOCASE)',
];

async function setup(c) {
  await c.batch(SCHEMA, 'write');
  for (const sql of MIGRATIONS) {
    try { await c.execute(sql); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
  }
  await c.batch(AFTER_MIGRATIONS, 'write');
}

export async function getDb() {
  if (!client) {
    const url = (process.env.TURSO_DATABASE_URL || 'file:local.db').trim();
    // externe database via de web-client (geen native module nodig op Vercel), lokaal bestand via de node-client
    const { createClient } = url.startsWith('file:') ? await import('@libsql/client') : await import('@libsql/client/web');
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined });
  }
  if (!ready) ready = setup(client).catch(e => { ready = null; throw e; });
  await ready;
  return client;
}

export async function getMeta(db, keys) {
  const res = await db.execute({ sql: `SELECT key, value FROM meta WHERE key IN (${keys.map(() => '?').join(',')})`, args: keys });
  return Object.fromEntries(rows(res).map(r => [r.key, r.value]));
}

export async function setMeta(db, values) {
  await db.batch(Object.entries(values).map(([key, value]) => ({
    sql: 'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [key, String(value)],
  })), 'write');
}

// libsql-rijen omzetten naar gewone objecten (veilig voor JSON)
export function rows(result) {
  return result.rows.map(r => Object.fromEntries(result.columns.map(c => [c, r[c]])));
}

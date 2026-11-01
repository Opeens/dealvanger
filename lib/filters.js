import { INTERVAL_OPTIONS } from './config';

function num(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const str = (v, max) => String(v ?? '').trim().slice(0, max);

// Zet formulierinvoer om naar databasevelden; geeft { error } of { value }
export function parseFilter(b) {
  const query = str(b.query, 100);
  if (!query) return { error: 'Zoekterm is verplicht.' };
  const interval = Number(b.interval_min);
  const postcode = str(b.postcode, 7).toUpperCase().replace(/\s/g, '');
  if (postcode && !/^\d{4}[A-Z]{0,2}$/.test(postcode)) return { error: 'Postcode moet er uitzien als 1234AB.' };
  const value = {
    name: str(b.name, 60) || query,
    query,
    min_price: num(b.min_price),
    max_price: num(b.max_price),
    resale_price: num(b.resale_price),
    min_profit: num(b.min_profit),
    postcode: postcode || null,
    distance_km: num(b.distance_km),
    require_words: str(b.require_words, 200),
    exclude_words: str(b.exclude_words, 300),
    title_only: b.title_only ? 1 : 0,
    skip_ads: b.skip_ads ? 1 : 0,
    include_no_price: b.include_no_price ? 1 : 0,
    email_deals: b.email_deals ? 1 : 0,
    interval_min: INTERVAL_OPTIONS.includes(interval) ? interval : INTERVAL_OPTIONS[0],
  };
  if (value.min_price != null && value.max_price != null && value.min_price > value.max_price) {
    return { error: 'Minimumprijs is hoger dan maximumprijs.' };
  }
  return { value };
}

export const FILTER_FIELDS = [
  'name', 'query', 'min_price', 'max_price', 'resale_price', 'min_profit', 'postcode', 'distance_km',
  'require_words', 'exclude_words', 'title_only', 'skip_ads', 'include_no_price', 'email_deals', 'interval_min',
];

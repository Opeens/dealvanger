import { INTERVAL_OPTIONS } from './config';

function num(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const id = v => (Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 1e7 ? Number(v) : null);

// Gekozen kenmerken uit de Marktplaats-filters, bijv. [{ id: 31, label: 'Zo goed als nieuw', group: 'Conditie' }]
function parseAttributes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.slice(0, 60).map(a => ({ id: id(a?.id), label: str(a?.label, 80), group: str(a?.group, 60) }))
    .filter(a => a.id && !seen.has(a.id) && seen.add(a.id));
}

// Bereikfilters, bijv. [{ key: 'mileage', label: 'Kilometerstand', from: 0, to: 50000 }]
function parseRanges(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 30)
    .map(r => ({ key: str(r?.key, 40), label: str(r?.label, 60), from: num(r?.from), to: num(r?.to) }))
    .filter(r => /^[A-Za-z]+$/.test(r.key) && (r.from != null || r.to != null));
}

// Zet formulierinvoer om naar databasevelden; geeft { error } of { value }
export function parseFilter(b) {
  const query = str(b.query, 100);
  const l1 = id(b.l1_category_id);
  const l2 = l1 ? id(b.l2_category_id) : null;
  if (!query && !l1) return { error: 'Vul een zoekterm in of kies een categorie.' };
  const interval = Number(b.interval_min);
  const postcode = str(b.postcode, 7).toUpperCase().replace(/\s/g, '');
  if (postcode && !/^\d{4}[A-Z]{0,2}$/.test(postcode)) return { error: 'Postcode moet er uitzien als 1234AB.' };
  const categoryLabel = l1 ? str(b.category_label, 120) : '';
  const value = {
    name: str(b.name, 60) || query || categoryLabel || 'Filter',
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
    l1_category_id: l1,
    l2_category_id: l2,
    category_label: categoryLabel || null,
    attributes: JSON.stringify(parseAttributes(b.attributes)),
    ranges: JSON.stringify(parseRanges(b.ranges)),
    ai_check: b.ai_check ? 1 : 0,
    free_only: b.free_only ? 1 : 0,
    ai_description: str(b.ai_description, 500) || null,
  };
  if (value.min_price != null && value.max_price != null && value.min_price > value.max_price) {
    return { error: 'Minimumprijs is hoger dan maximumprijs.' };
  }
  return { value };
}

export const FILTER_FIELDS = [
  'name', 'query', 'min_price', 'max_price', 'resale_price', 'min_profit', 'postcode', 'distance_km',
  'require_words', 'exclude_words', 'title_only', 'skip_ads', 'include_no_price', 'email_deals', 'interval_min',
  'l1_category_id', 'l2_category_id', 'category_label', 'attributes', 'ranges', 'ai_check', 'ai_description', 'free_only',
];

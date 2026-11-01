const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export class BlockedError extends Error {}

export function buildSearchUrl(f) {
  const q = new URLSearchParams({
    // betaalde topadvertenties staan bovenaan en kunnen de eerste 30-70 plekken vullen, dus ruim ophalen
    limit: '100',
    offset: '0',
    sortBy: 'SORT_INDEX',
    sortOrder: 'DECREASING',
    viewOptions: 'list-view',
    query: f.query,
    searchInTitleAndDescription: f.title_only ? 'false' : 'true',
  });
  if (f.min_price != null || f.max_price != null) {
    const min = f.min_price != null ? Math.round(f.min_price * 100) : 'null';
    const max = f.max_price != null ? Math.round(f.max_price * 100) : 'null';
    q.append('attributeRanges[]', `PriceCents:${min}:${max}`);
  }
  if (f.postcode && f.distance_km) {
    q.set('postcode', f.postcode.replace(/\s/g, ''));
    q.set('distanceMeters', String(Math.round(f.distance_km * 1000)));
  }
  return 'https://www.marktplaats.nl/lrp/api/search?' + q.toString();
}

export async function fetchListings(url) {
  const doFetch = () => fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', 'Accept-Language': 'nl-NL,nl;q=0.9' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  let res;
  try {
    res = await doFetch();
  } catch {
    // tijdelijke netwerkfout: één keer opnieuw proberen
    res = await doFetch();
  }
  if (res.status === 429 || res.status === 403) throw new BlockedError(`Marktplaats remt af (HTTP ${res.status})`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.listings) ? data.listings : [];
}

const words = s => (s || '').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);

export function matches(f, l) {
  if (f.skip_ads && l.priorityProduct && l.priorityProduct !== 'NONE') return false;
  const pt = l.priceInfo?.priceType;
  if (!f.include_no_price && pt !== 'FIXED' && pt !== 'MIN_BID') return false;
  const title = String(l.title || '').toLowerCase();
  const hay = title + ' ' + String(l.description || '').toLowerCase();
  if (words(f.exclude_words).some(w => hay.includes(w))) return false;
  if (!words(f.require_words).every(w => title.includes(w))) return false;
  return true;
}

export function toHit(f, l) {
  const priceCents = Number(l.priceInfo?.priceCents || 0);
  const profit = f.resale_price != null && priceCents > 0 ? Math.round((f.resale_price - priceCents / 100) * 100) / 100 : null;
  const image = l.pictures?.[0]?.mediumUrl || (l.imageUrls?.[0] ? 'https:' + l.imageUrls[0] : null);
  const dist = l.location?.distanceMeters >= 0 ? Math.round(l.location.distanceMeters / 1000) : null;
  return {
    item_id: String(l.itemId),
    title: String(l.title || ''),
    price_cents: priceCents,
    price_type: String(l.priceInfo?.priceType || ''),
    profit,
    city: String(l.location?.cityName || ''),
    distance_km: dist,
    seller: String(l.sellerInformation?.sellerName || ''),
    image,
    url: 'https://www.marktplaats.nl' + (l.vipUrl || ''),
    is_deal: profit != null && f.min_profit != null && profit >= f.min_profit ? 1 : 0,
  };
}

export const PRICE_LABEL = { FAST_BID: 'Bieden', MIN_BID: 'Bieden', SEE_DESCRIPTION: 'Zie omschrijving', RESERVED: 'Gereserveerd', NOTK: 'N.o.t.k.', FREE: 'Gratis', EXCHANGE: 'Ruilen' };

export function formatPrice(h) {
  if (h.price_cents > 0) return '€ ' + (h.price_cents / 100).toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  return PRICE_LABEL[h.price_type] || h.price_type;
}

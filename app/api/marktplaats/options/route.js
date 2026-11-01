import { getUser } from '@/lib/session';
import { fetchSearch } from '@/lib/marktplaats';
import { MAIN_CATEGORIES } from '@/lib/categories';

export const dynamic = 'force-dynamic';

// Opties van Marktplaats kort onthouden, zodat het filterpaneel niet bij elke klik een nieuwe request doet
const cache = new Map();
const TTL_MS = 10 * 60 * 1000;

// facetten die we zelf al anders aanbieden of die geen id hebben om op te filteren
const SKIP = new Set(['PriceCents', 'RelevantCategories', 'offeredSince']);

async function cached(params) {
  const key = params.toString();
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - TTL_MS) return hit.data;
  const data = await fetchSearch(params);
  cache.set(key, { at: Date.now(), data });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return data;
}

const intParam = v => (/^\d{1,6}$/.test(v || '') ? v : null);

export async function GET(req) {
  if (!(await getUser())) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  const url = new URL(req.url);
  const query = (url.searchParams.get('query') || '').trim().slice(0, 100);
  const l1 = intParam(url.searchParams.get('l1'));
  const l2 = l1 ? intParam(url.searchParams.get('l2')) : null;

  try {
    const categories = MAIN_CATEGORIES;

    let subcategories = [];
    if (l1) {
      const res = await cached(new URLSearchParams({ limit: '1', offset: '0', viewOptions: 'list-view', l1CategoryId: l1 }));
      const tree = (res.facets || []).find(f => f.key === 'RelevantCategories');
      subcategories = (tree?.categories || [])
        .filter(c => String(c.parentId) === l1)
        .map(c => ({ id: c.id, label: c.label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'nl'));
    }

    // zonder zoekterm en categorie geeft Marktplaats geen resultaten (en dus geen kenmerken)
    const facets = [];
    if (!query && !l1) return Response.json({ categories, subcategories, facets });
    const p = new URLSearchParams({ limit: '1', offset: '0', viewOptions: 'list-view' });
    if (query) p.set('query', query);
    if (l1) p.set('l1CategoryId', l1);
    if (l2) p.set('l2CategoryId', l2);
    const res = await cached(p);
    for (const f of res.facets || []) {
      if (SKIP.has(f.key) || !f.label) continue;
      if (f.type === 'AttributeGroupFacet') {
        const options = (f.attributeGroup || [])
          .filter(o => o.attributeValueId)
          .map(o => ({ id: o.attributeValueId, label: o.attributeValueLabel, count: o.histogramCount ?? null }));
        if (options.length) facets.push({ key: f.key, label: f.label, type: 'group', options });
      } else if (f.type === 'AttributeRangeFacet' && /^[A-Za-z]+$/.test(f.key)) {
        facets.push({ key: f.key, label: f.label, type: 'range' });
      }
    }
    return Response.json({ categories, subcategories, facets });
  } catch (e) {
    return Response.json({ error: 'Kon de filters van Marktplaats niet ophalen. Probeer het later opnieuw.' }, { status: 502 });
  }
}

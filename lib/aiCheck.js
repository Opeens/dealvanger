import Anthropic from '@anthropic-ai/sdk';

// AI-controle: Claude bekijkt foto + titel + beschrijving en beoordeelt of de advertentie
// echt het product is dat de gebruiker zoekt (bijv. een complete uitlaat i.p.v. een los hitteschild).

// Haiku: ruim voldoende voor een ja/nee-beoordeling en veel goedkoper dan Opus
const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const IS_HAIKU = MODEL.startsWith('claude-haiku');
const CONCURRENCY = 6;
// server-side fallback bij een weigering wordt alleen door deze modellen ondersteund
const SUPPORTS_FALLBACKS = /^claude-(opus-5|fable-5|sonnet-5-5)/.test(MODEL);

const SCHEMA = {
  type: 'object',
  properties: {
    match: { type: 'boolean' },
    reason: { type: 'string' },
  },
  required: ['match', 'reason'],
  additionalProperties: false,
};

const SYSTEM = `Je beoordeelt Marktplaats-advertenties voor iemand die producten opkoopt om door te verkopen.
Je krijgt een omschrijving van wat de koper zoekt, plus de foto, titel, beschrijving en prijs van een advertentie.
Bepaal of de advertentie echt het gezochte product aanbiedt.
- Gebruik de foto als belangrijkste bewijs voor wát er verkocht wordt; titels bevatten vaak zoekwoorden van andere onderdelen of compatibele modellen.
- Losse onderdelen, accessoires, verpakkingen, "gezocht"-advertenties of iets voor een ander model tellen niet als match, tenzij de koper daar expliciet om vraagt.
- Twijfel je echt (bijv. geen bruikbare foto en vage tekst), kies dan match = true zodat de koper zelf kan kijken.
Geef in "reason" in maximaal 12 Nederlandse woorden aan wat er te zien is, bijv. "Complete SM06 uitlaat op foto" of "Alleen een hitteschild, geen uitlaat".`;

let client;
export const aiAvailable = () => !!process.env.ANTHROPIC_API_KEY;

async function checkOne(f, listing, hit) {
  client ||= new Anthropic();
  const text = [
    `Gezocht: ${f.ai_description || f.query}`,
    '',
    'Advertentie:',
    `Titel: ${listing.title || ''}`,
    `Beschrijving: ${listing.categorySpecificDescription || listing.description || ''}`,
    `Prijs: ${hit.price_cents > 0 ? '€ ' + (hit.price_cents / 100) : hit.price_type}`,
  ].join('\n');

  const request = withImage => ({
    model: MODEL,
    max_tokens: IS_HAIKU ? 300 : 4000,
    system: SYSTEM,
    // zonder nadenken: alleen het korte JSON-antwoord wordt betaald
    ...(IS_HAIKU ? { thinking: { type: 'disabled' } } : {}),
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    ...(SUPPORTS_FALLBACKS ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
    messages: [{
      role: 'user',
      content: [
        ...(withImage && hit.image ? [{ type: 'image', source: { type: 'url', url: hit.image } }] : []),
        { type: 'text', text },
      ],
    }],
  });

  let response;
  try {
    response = await client.beta.messages.create(request(true));
  } catch (e) {
    // foto niet op te halen? dan alleen op tekst beoordelen
    if (e instanceof Anthropic.BadRequestError && hit.image) response = await client.beta.messages.create(request(false));
    else throw e;
  }
  if (response.stop_reason === 'refusal') return null;
  const block = response.content.find(b => b.type === 'text');
  if (!block) return null;
  const out = JSON.parse(block.text);
  return { match: !!out.match, reason: String(out.reason || '').slice(0, 200) };
}

// Controleert een lijst kandidaten; geeft per item_id { match, reason } terug.
// Mislukte controles ontbreken in het resultaat (de advertentie wordt dan gewoon getoond).
export async function checkListings(f, candidates) {
  const results = new Map();
  if (!aiAvailable() || !candidates.length) return results;
  let next = 0;
  async function worker() {
    while (next < candidates.length) {
      const { listing, hit } = candidates[next++];
      try {
        const verdict = await checkOne(f, listing, hit);
        if (verdict) results.set(hit.item_id, verdict);
      } catch (e) {
        console.error('AI-controle mislukt', hit.item_id, e?.status ?? '', e?.message);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, candidates.length) }, worker));
  return results;
}

// "Echt gratis" herkennen: particulieren die iets weggeven, geen lokkertjes.
// Lokkertjes zijn vooral bedrijven en diensten die "gratis" of € 0 gebruiken om op te vallen
// (gratis offerte, gratis bezorging, verhuur, inkoop, reparatie, "vanaf"-prijzen).

// Woorden die bij weggeefadvertenties vrijwel nooit voorkomen, maar bij reclame wel. Bewust geen
// woorden als "btw" (ook: by the way), "reparatie" of "onze", die ook in gewone weggeefadvertenties staan.
// Gezocht in titel + beschrijving (kleine letters).
export const LURE_WORDS = [
  'gratis offerte', 'gratis taxatie', 'gratis advies', 'gratis bezorging', 'gratis bezorgd', 'gratis verzending',
  'gratis montage', 'gratis installatie', 'gratis proefles', 'gratis proef', 'gratis inspectie', 'gratis ophaalservice',
  'gratis opgehaald', 'gratis afvoeren', 'wij kopen', 'wij halen', 'inkoop', 'opkoper', 'opkopen', 'te huur', 'verhuur',
  'webshop', 'onze winkel', 'showroom', 'openingstijden', 'kvk', 'factuur',
  'garantie', 'abonnement', 'per stuk', 'per maand', 'vanaf €', 'vanaf  €', 'v.a. €', 'actieprijs', 'korting', 'aanbieding',
  'gezocht', 'ruilen', 'ruil ', 'te ruil', 'lid worden', 'inschrijven', 'aanmelden', 'whatsapp ons', 'bel ons',   'bitcoin', 'crypto', 'beleggen', 'bijverdienen', 'casino',
];

const lower = s => String(s || '').toLowerCase();

// Geeft null als de advertentie echt gratis lijkt, anders de reden waarom niet
export function fakeFreeReason(l) {
  const pt = l.priceInfo?.priceType;
  // "Gratis" is een eigen prijssoort; € 0 als vraagprijs of "bieden vanaf € 0" is bijna altijd een lokkertje
  if (pt !== 'FREE') {
    const zero = (pt === 'FIXED' || pt === 'MIN_BID') && !(Number(l.priceInfo?.priceCents) > 0);
    return zero ? 'prijs € 0 in plaats van "Gratis"' : 'geen gratis advertentie';
  }
  if (l.priorityProduct && l.priorityProduct !== 'NONE') return 'betaalde topadvertentie';
  // bedrijven met een eigen website of verificatie op Marktplaats
  const s = l.sellerInformation || {};
  if (s.showWebsiteUrl) return 'bedrijf (website)';
  const hay = lower(l.title) + ' ' + lower(l.categorySpecificDescription || l.description);
  const word = LURE_WORDS.find(w => hay.includes(w));
  if (word) return `reclamewoord "${word.trim()}"`;
  return null;
}

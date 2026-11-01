import { SITE_NAME } from '@/lib/config';

export const metadata = { title: 'Privacy', description: `Welke gegevens ${SITE_NAME} bewaart en waarom.` };

export default function Privacy() {
  return (
    <main className="prose">
      <h1>Privacyverklaring</h1>
      <p className="muted">Laatst bijgewerkt: november 2026</p>

      <h2>Welke gegevens bewaren we?</h2>
      <ul>
        <li><b>Je e-mailadres</b>, om je in te laten loggen en deal-meldingen te sturen.</li>
        <li><b>Je zoekfilters</b> (zoektermen, prijzen, postcode en afstand) om voor jou te kunnen scannen.</li>
        <li><b>Gevonden advertenties</b> (titel, prijs, plaats, link). Deze worden na 14 dagen automatisch verwijderd.</li>
      </ul>

      <h2>Waarvoor gebruiken we ze?</h2>
      <p>Alleen om de dienst te leveren: scannen, resultaten tonen en mailen. We verkopen of delen je gegevens niet en sturen geen reclame.</p>

      <h2>Cookies</h2>
      <p>We gebruiken één functionele cookie om je ingelogd te houden. Er zijn geen tracking- of advertentiecookies.</p>

      <h2>Waar staan je gegevens?</h2>
      <p>De website draait bij Vercel, de database bij Turso en e-mail wordt verstuurd via onze mailprovider. Deze partijen verwerken gegevens alleen in onze opdracht.</p>

      <h2>Je rechten</h2>
      <p>Je kunt je account met alle filters en resultaten op elk moment zelf verwijderen via het dashboard (&quot;Account verwijderen&quot;). Daarmee worden al je gegevens direct gewist.</p>

      <h2>Onafhankelijk</h2>
      <p>{SITE_NAME} is niet verbonden aan Marktplaats of Adevinta. Advertenties zijn eigendom van de adverteerders en worden alleen met een link getoond.</p>
    </main>
  );
}

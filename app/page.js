import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/config';
import './home.css';

const FAQ = [
  ['Wat is een Marktplaats sniper?', `Een sniper houdt je zoekopdrachten continu in de gaten en laat je direct weten wanneer er een nieuwe advertentie verschijnt. Zo ben je de eerste die reageert op een scherp geprijsd aanbod.`],
  ['Hoe snel zie ik nieuwe advertenties?', `${SITE_NAME} scant je filters zo vaak als elke minuut. Nieuwe advertenties verschijnen meteen in je dashboard.`],
  ['Wanneer krijg ik een e-mail?', 'Je stelt per filter in voor hoeveel je het product kunt doorverkopen en hoeveel winst je minimaal wilt. Zodra een nieuwe advertentie die winst oplevert, krijg je een mail met een directe link.'],
  ['Wat kost het?', `${SITE_NAME} is gratis. Maak een account met een gebruikersnaam, wachtwoord en e-mailadres.`],
  ['Is dit een dienst van Marktplaats?', `Nee. ${SITE_NAME} is een onafhankelijke dienst en is niet verbonden aan Marktplaats of Adevinta.`],
];

// Voorbeelden voor het nagebouwde dashboard: geen echte advertenties (zie het bijschrift)
const SAMPLE = [
  { title: 'Canon G7X Mark II, compleet met lader', city: 'Elp', price: '€ 320', profit: '+€ 231', tag: 'Deal', ai: 'Canon compactcamera op de foto, batterij en lader zichtbaar' },
  { title: 'iPhone 14 128GB middernacht', city: 'Zwolle', price: '€ 140', profit: '+€ 44', tag: 'Deal', ai: 'iPhone 14 op de foto, scherm en achterkant heel' },
  { title: 'JBL Charge 5 nieuw in doos', city: 'Amersfoort', price: '€ 25', profit: null, tag: 'Afgekeurd', ai: 'Namaak: logo en knoppen kloppen niet met het origineel', rejected: true },
];

const FEATURES = [
  ['Elke minuut', 'Nieuwe advertenties staan binnen een minuut in je dashboard, ook als je het niet openhebt.'],
  ['AI-controle op de foto', 'Claude bekijkt foto en tekst en keurt namaak, losse onderdelen en verkeerde modellen af.'],
  ['Alleen echt gratis', 'Een gratis-filter toont alleen de prijs Gratis. Lokkertjes van € 0 en reclame vallen weg.'],
  ['Omhoog geplaatst telt niet', 'Oude advertenties die opnieuw bovenaan staan, herkent hij aan hun advertentienummer.'],
  ['Filters delen', 'Kopieer je filters als tekst of plak er een, en hij staat er meteen in.'],
];

export default function Home() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebApplication', name: SITE_NAME, url: SITE_URL, applicationCategory: 'ShoppingApplication', operatingSystem: 'Web', inLanguage: 'nl-NL', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
      { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return (
    <main className="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="h-hero">
        <div className="container h-hero-grid">
          <div className="h-hero-text">
            <h1>Marktplaats-deals, binnen een minuut</h1>
            <p className="lead">Elke minuut gescand. Alleen een mail als de winst klopt.</p>
            <div className="h-actions">
              <Link href="/login?mode=register" className="h-btn">Gratis beginnen</Link>
              <a href="#mail" className="h-btn h-btn-ghost">Zo werkt de deal-mail</a>
            </div>
            <p className="h-terms">Gratis, met een gebruikersnaam en e-mailadres. Niet verbonden aan Marktplaats.</p>
          </div>

          <figure className="h-figure">
            <div className="h-app" aria-label="Voorbeeld van het dashboard">
              <div className="h-app-head">
                <span className="h-app-name">Canon G7 X Mark II/III</span>
                <span className="h-app-meta">verkoop € 551</span>
                <span className="h-app-meta">minimaal € 84 winst</span>
              </div>
              <ul className="h-feed">
                {SAMPLE.map(s => (
                  <li key={s.title} className={'h-row' + (s.rejected ? ' is-rejected' : '')}>
                    <span className="h-thumb" aria-hidden="true" />
                    <span className="h-row-main">
                      <span className="h-row-title">{s.title}</span>
                      <span className="h-row-meta"><span className={'h-tag' + (s.rejected ? ' is-quiet' : '')}>{s.tag}</span>{s.city}</span>
                      <span className="h-row-ai">AI: {s.ai}</span>
                    </span>
                    <span className="h-row-price">
                      <span className="h-price">{s.price}</span>
                      {s.profit && <span className="h-profit">{s.profit}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <figcaption>Voorbeeld van het dashboard. De advertenties zijn verzonnen; de AI keurt de namaak-JBL af.</figcaption>
          </figure>
        </div>
      </section>

      <section className="h-section" id="mail">
        <div className="container h-split">
          <div className="h-split-text">
            <h2>Een mail als de winst klopt</h2>
            <p className="lead">Je zet per filter wat je ervoor krijgt. {SITE_NAME} rekent elke advertentie door.</p>
            <ol className="h-facts">
              <li>Verkoopprijs min vraagprijs, per advertentie</li>
              <li>Alleen een mail boven je minimale winst</li>
              <li>Bij een gratis-filter: elke echte weggever</li>
            </ol>
          </div>
          <figure className="h-figure">
            <div className="h-mail" aria-label="Voorbeeld van een deal-mail">
              <p className="h-mail-subject">Deal: Canon G7X Mark II, € 320 (+€ 231 winst)</p>
              <div className="h-mail-card">
                <p className="h-mail-title">Canon G7X Mark II, compleet met lader</p>
                <p className="h-mail-place">Elp</p>
                <dl className="h-mail-sum">
                  <div><dt>Vraagprijs</dt><dd>€ 320</dd></div>
                  <div><dt>Jouw verkoopprijs</dt><dd>€ 551</dd></div>
                  <div className="is-total"><dt>Verwachte winst</dt><dd><span className="h-pill">+€ 231</span></dd></div>
                </dl>
                <span className="h-mail-btn">Bekijk advertentie</span>
              </div>
            </div>
            <figcaption>Voorbeeld van een deal-mail, met dezelfde verzonnen advertentie.</figcaption>
          </figure>
        </div>
      </section>

      <section className="h-section h-section-tight">
        <div className="container">
          <h2>Wat elk filter voor je doet</h2>
          <dl className="h-rows">
            {FEATURES.map(([t, d]) => (
              <div key={t} className="h-rows-item"><dt>{t}</dt><dd>{d}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <section className="h-section h-statement-wrap">
        <div className="container">
          <p className="h-statement">Zet het inkoopbod van een opkoper als verkoopprijs. Dan heeft elke melding al een koper.</p>
        </div>
      </section>

      <section className="h-section h-faq">
        <div className="container h-faq-grid">
          <h2>Vragen</h2>
          <div className="h-faq-list">
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="h-band">
        <div className="container h-band-inner">
          <h2>Maak je eerste filter</h2>
          <Link href="/login?mode=register" className="h-btn h-btn-on-ink">Maak gratis je eerste filter</Link>
        </div>
      </section>
    </main>
  );
}

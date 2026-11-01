import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/config';

const FAQ = [
  ['Wat is een Marktplaats sniper?', `Een sniper houdt je zoekopdrachten continu in de gaten en laat je direct weten wanneer er een nieuwe advertentie verschijnt. Zo ben je de eerste die reageert op een scherp geprijsd aanbod.`],
  ['Hoe snel zie ik nieuwe advertenties?', `${SITE_NAME} scant je filters zo vaak als elke minuut. Nieuwe advertenties verschijnen meteen in je dashboard.`],
  ['Wanneer krijg ik een e-mail?', 'Je stelt per filter in voor hoeveel je het product kunt doorverkopen en hoeveel winst je minimaal wilt. Zodra een nieuwe advertentie die winst oplevert, krijg je een mail met een directe link.'],
  ['Wat kost het?', `${SITE_NAME} is gratis. Je hebt alleen een e-mailadres nodig.`],
  ['Is dit een dienst van Marktplaats?', `Nee. ${SITE_NAME} is een onafhankelijke dienst en is niet verbonden aan Marktplaats of Adevinta.`],
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
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero">
        <h1>Zie nieuwe Marktplaats-koopjes als eerste</h1>
        <p>Stel zoekfilters in met prijs, afstand en winstmarge. {SITE_NAME} scant elke minuut en mailt je zodra er een deal binnenkomt. Zo koop je goedkoop in en verkoop je met winst door.</p>
        <Link href="/login" className="btn-primary">Gratis beginnen</Link>
      </section>

      <section className="section">
        <h2>Hoe het werkt</h2>
        <div className="grid3">
          <div className="panel"><h3>1. Filter instellen</h3><p>Zoekterm, min/max prijs, postcode en afstand, woorden die er wel of niet in mogen staan.</p></div>
          <div className="panel"><h3>2. Winst bepalen</h3><p>Vul in voor hoeveel je het doorverkoopt. Elke advertentie krijgt direct een winstberekening.</p></div>
          <div className="panel"><h3>3. Als eerste reageren</h3><p>Nieuwe advertenties staan binnen een minuut in je dashboard. Bij een deal krijg je meteen een e-mail.</p></div>
        </div>
      </section>

      <section className="section">
        <h2>Waarom {SITE_NAME}?</h2>
        <div className="grid3">
          <div className="panel"><h3>Elke minuut scannen</h3><p>Geen handmatig verversen meer. De beste koopjes zijn vaak binnen een uur weg.</p></div>
          <div className="panel"><h3>Geen ruis</h3><p>Betaalde topadvertenties, kapotte spullen en &quot;gezocht&quot;-advertenties filter je eruit.</p></div>
          <div className="panel"><h3>Alleen mail bij echte deals</h3><p>Je inbox stroomt niet vol: je krijgt alleen een mail als de winst boven je minimum ligt.</p></div>
        </div>
      </section>

      <section className="section faq">
        <h2>Veelgestelde vragen</h2>
        {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>

      <section className="hero" style={{ paddingTop: 24 }}>
        <Link href="/login" className="btn-primary">Maak gratis je eerste filter</Link>
      </section>
    </main>
  );
}

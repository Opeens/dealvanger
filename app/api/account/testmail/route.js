import { getUser } from '@/lib/session';
import { sendMail, mailSetup } from '@/lib/mailer';
import { dealEmail } from '@/lib/emailTemplates';
import { SITE_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';

// eenvoudige rem tegen spammen via deze knop (per serverinstantie)
const lastSent = new Map();

// Stuurt een voorbeeld-dealmail naar de ingelogde gebruiker, om de mailinstellingen te testen
export async function POST() {
  const user = await getUser();
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 });
  if (Date.now() - (lastSent.get(user.id) || 0) < 30000) {
    return Response.json({ error: 'Wacht even voordat je nog een testmail stuurt.' }, { status: 429 });
  }
  lastSent.set(user.id, Date.now());
  const f = { name: 'Testmail', resale_price: 551 };
  const deals = [{
    title: 'Voorbeeld: Canon G7 X Mark II', price_cents: 32000, price_type: 'FIXED', profit: 231,
    city: 'Elp', url: SITE_URL + '/dashboard', image: null, distance_km: null, ai_reason: 'Dit is een testmail, geen echte advertentie.',
  }];
  try {
    const info = await sendMail({ to: user.email, ...dealEmail(f, deals) });
    return Response.json({ ok: true, ...mailSetup(), response: info?.response || null });
  } catch (e) {
    return Response.json({ error: `Versturen mislukt: ${e.message}` }, { status: 500 });
  }
}

import { escapeHtml } from './mailer';
import { formatPrice } from './marktplaats';
import { SITE_NAME, SITE_URL } from './config';

// E-mailclients (vooral Gmail en Outlook) ondersteunen geen flexbox of externe CSS,
// daarom tabellen met inline stijlen.
const C = {
  bg: '#f3f4f6', card: '#ffffff', text: '#111827', muted: '#6b7280', border: '#e5e7eb',
  accent: '#0b66e4', good: '#0f8a4a', goodBg: '#e7f6ee', dark: '#0f172a',
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function layout({ preheader = '', body, footerNote = '' }) {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(SITE_NAME)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 14px;font-family:${FONT};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;"><div style="width:10px;height:10px;background:${C.good};border-radius:50%;font-size:0;line-height:0;">&nbsp;</div></td>
          <td style="padding-left:9px;font-size:18px;font-weight:700;color:${C.text};letter-spacing:-0.01em;">${escapeHtml(SITE_NAME)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:14px;padding:28px;font-family:${FONT};color:${C.text};">
        ${body}
      </td></tr>
      <tr><td style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">
        ${footerNote ? footerNote + '<br>' : ''}
        <a href="${SITE_URL}/dashboard" style="color:${C.muted};text-decoration:underline;">Dashboard</a>
        &nbsp;·&nbsp;
        <a href="${SITE_URL}/privacy" style="color:${C.muted};text-decoration:underline;">Privacy</a><br>
        ${escapeHtml(SITE_NAME)} is niet verbonden aan Marktplaats of Adevinta.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr>
    <td style="background:${C.accent};border-radius:9px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px;">${escapeHtml(label)}</a>
    </td></tr></table>`;
}

const eur = n => '€ ' + Number(n).toLocaleString('nl-NL', { maximumFractionDigits: 0 });

function dealCard(f, d) {
  const meta = [d.city, d.distance_km != null ? `${d.distance_km} km` : null, d.seller].filter(Boolean).map(escapeHtml).join(' &nbsp;·&nbsp; ');
  const image = d.image
    ? `<a href="${escapeHtml(d.url)}" style="text-decoration:none;"><img src="${escapeHtml(d.image)}" width="504" alt="${escapeHtml(d.title)}" style="display:block;width:100%;max-width:504px;height:auto;max-height:300px;object-fit:cover;border-radius:10px 10px 0 0;border:0;"></a>`
    : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:12px;margin:0 0 18px;">
    ${image ? `<tr><td style="padding:0;">${image}</td></tr>` : ''}
    <tr><td style="padding:18px 18px 4px;">
      <a href="${escapeHtml(d.url)}" style="font-size:17px;font-weight:700;line-height:1.35;color:${C.text};text-decoration:none;">${escapeHtml(d.title)}</a>
      ${meta ? `<div style="margin-top:6px;font-size:13px;color:${C.muted};">${meta}</div>` : ''}
    </td></tr>
    <tr><td style="padding:12px 18px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;">
        <tr><td style="padding:5px 0;color:${C.muted};">Vraagprijs</td><td align="right" style="padding:5px 0;font-weight:600;">${escapeHtml(formatPrice(d))}${d.price_type === 'MIN_BID' ? ' <span style="font-weight:400;color:' + C.muted + ';">(bieden)</span>' : ''}</td></tr>
        <tr><td style="padding:5px 0;color:${C.muted};">Jouw verkoopprijs</td><td align="right" style="padding:5px 0;">${eur(f.resale_price)}</td></tr>
        <tr><td style="padding:9px 0 5px;border-top:1px solid ${C.border};font-weight:700;">Verwachte winst</td>
            <td align="right" style="padding:9px 0 5px;border-top:1px solid ${C.border};"><span style="display:inline-block;background:${C.goodBg};color:${C.good};font-weight:700;padding:3px 10px;border-radius:999px;">+${eur(d.profit)}</span></td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 18px 18px;">${button(d.url, 'Bekijk advertentie')}</td></tr>
  </table>`;
}

export function dealEmail(f, deals) {
  const first = deals[0];
  const subject = deals.length === 1
    ? `Deal: ${first.title} – ${formatPrice(first)} (+${eur(first.profit)} winst)`
    : `${deals.length} nieuwe deals voor "${f.name}"`;
  const preheader = deals.length === 1
    ? `${formatPrice(first)} in ${first.city} · verwachte winst ${eur(first.profit)}`
    : `Beste deal: ${first.title} met ${eur(Math.max(...deals.map(d => d.profit)))} winst`;

  const sorted = [...deals].sort((a, b) => b.profit - a.profit);
  const body = `
    <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${C.good};">Nieuwe deal${deals.length > 1 ? 's' : ''} gevonden</div>
    <h1 style="margin:6px 0 4px;font-size:22px;line-height:1.3;color:${C.text};">${escapeHtml(f.name)}</h1>
    <p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:${C.muted};">${deals.length === 1 ? 'Er is net een advertentie geplaatst' : `Er zijn net ${deals.length} advertenties geplaatst`} die binnen je winstmarge valt. Goede deals zijn vaak snel weg, dus reageer snel.</p>
    ${sorted.map(d => dealCard(f, d)).join('')}
    <p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:${C.muted};">De winst is een schatting op basis van de verkoopprijs die je zelf hebt ingesteld (${eur(f.resale_price)}), zonder verzend- of andere kosten.</p>`;

  const text = sorted.map(d => `${d.title}\nVraagprijs: ${formatPrice(d)} · Verwachte winst: +${eur(d.profit)}\n${[d.city, d.distance_km != null ? d.distance_km + ' km' : null].filter(Boolean).join(' · ')}\n${d.url}`).join('\n\n')
    + `\n\nBeheer je filters of zet deze mails uit: ${SITE_URL}/dashboard`;

  return {
    subject,
    text,
    html: layout({
      preheader,
      body,
      footerNote: `Je krijgt deze mail omdat deal-meldingen aan staan voor filter "${escapeHtml(f.name)}". <a href="${SITE_URL}/dashboard" style="color:${C.muted};text-decoration:underline;">Zet ze uit</a> in je dashboard.`,
    }),
  };
}

export function loginEmail(link) {
  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;color:${C.text};">Inloggen bij ${escapeHtml(SITE_NAME)}</h1>
    <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:${C.muted};">Klik op de knop hieronder om in te loggen. De link is 30 minuten geldig en werkt één keer.</p>
    ${button(link, 'Inloggen')}
    <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:${C.muted};">Werkt de knop niet? Kopieer dan deze link in je browser:<br><a href="${escapeHtml(link)}" style="color:${C.accent};word-break:break-all;">${escapeHtml(link)}</a></p>`;
  return {
    subject: `Je inloglink voor ${SITE_NAME}`,
    text: `Klik op de link om in te loggen bij ${SITE_NAME}:\n\n${link}\n\nDe link is 30 minuten geldig. Heb je dit niet aangevraagd? Dan kun je deze mail negeren.`,
    html: layout({ preheader: 'Je inloglink is 30 minuten geldig.', body, footerNote: 'Heb je dit niet aangevraagd? Dan kun je deze mail negeren.' }),
  };
}

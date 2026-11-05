# Dealvanger – Marktplaats sniper

Publieke website (https://dealvanger.vercel.app) die Marktplaats elke minuut scant op zoekfilters van gebruikers
en alleen deals mailt. Communicatie met de eigenaar is in het Nederlands.

## Stack
- Next.js 15 (App Router, JavaScript, alias `@/*`) op Vercel Hobby; push naar `main` = automatische deploy.
- Database: Turso via `@libsql/client` (`/web` voor remote, `file:local.db` lokaal). Schema + migraties in `lib/db.js`
  (`ALTER TABLE` in `MIGRATIONS`, "duplicate column" wordt genegeerd).
- Mail: nodemailer via Gmail SMTP (`lib/mailer.js`, templates in `lib/emailTemplates.js`).
- Login: gebruikersnaam + wachtwoord (scrypt) of e-maillink; sessie = jose HS256 JWT-cookie (`lib/session.js`).
- AI-controle op foto + tekst: `lib/aiCheck.js`, standaard `claude-haiku-5-5` (`AI_MODEL` kan het overschrijven).
- Env-variabelen: zie `.env.example`. Echte waarden staan alleen in Vercel → Settings → Environment Variables.
  Nooit `.env*` committen.

## Scannen
- cron-job.org roept elke minuut `/api/cron?key=CRON_SECRET` aan (budget 25 s). Daarnaast scant het open dashboard
  (`/api/hits`) en het aanmaken/wijzigen van een filter.
- `lib/scanner.js`: `scanDue` claimt filters via `next_scan_at`; `processFilter` zet bij de eerste scan een basislijn
  (geen mails), daarna alleen nieuwe advertenties.
- Echt nieuw vs. omhoog geplaatst: advertentienummers `m\d+` lopen op (~400k/dag). Per filter wordt
  `max_item_num` bewaard; alleen nummers > max − `NEW_ID_TOLERANCE` (20000) tellen als nieuw.
- Blokkade (403/429): alle scans pauzeren globaal (10/20/40/60 min, tabel `meta`: `mp_blocked_until`,
  `mp_block_level`). Dashboard-scan (`source: 'dashboard'`) slaat over als de cron < 90 s geleden draaide.
- Filterlimiet: `MAX_FILTERS_PER_USER` (5), eigenaar(s) in `OWNER_EMAILS` krijgen `OWNER_MAX_FILTERS` (25).
- Filters importeren/delen als JSON via de zijbalk (`app/dashboard/ImportFilters.js`).
- cron-job.org draait elke minuut (sinds 5 nov 2026). Dashboard waarschuwt als `last_cron_at` > 5 min oud is.
- Mail: testmail-knop in Instellingen (`/api/account/testmail`); mislukte deal-mails staan in `meta.last_mail_error`.
  Eerste scan van een filter = basislijn: hits met `is_new = 0` tonen als "Al online", geen mail.
- `lib/marktplaats.js`: onofficiële API `https://www.marktplaats.nl/lrp/api/search` (limit 100, want betaalde
  topadvertenties vullen de eerste plekken; 204 zonder query én categorie).

## Structuur
- `app/api/*`: cron, filters, filters/[id], hits, account, auth/*, marktplaats/options (subcategorieën + facetten).
- `app/dashboard/*`: Dashboard, FilterForm, MarktplaatsFilters, AccountSettings. Stijl: minimalistisch groen
  (`app/globals.css`), geen "standaard AI-look".
- `LAUNCHEN.md`: deploy-handleiding.

## Openstaand
- AI-controle aanzetten op het filter "sm06 uitlaat".
- Google Search Console: `NEXT_PUBLIC_GOOGLE_VERIFICATION` invullen en sitemap indienen.

## Lokaal draaien
```
npm install
npm run dev
```
Zonder `.env.local` gebruikt hij `local.db` en worden mails in de terminal getoond.

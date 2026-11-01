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
- `lib/marktplaats.js`: onofficiële API `https://www.marktplaats.nl/lrp/api/search` (limit 100, want betaalde
  topadvertenties vullen de eerste plekken; 204 zonder query én categorie).

## Structuur
- `app/api/*`: cron, filters, filters/[id], hits, account, auth/*, marktplaats/options (subcategorieën + facetten).
- `app/dashboard/*`: Dashboard, FilterForm, MarktplaatsFilters, AccountSettings. Stijl: minimalistisch groen
  (`app/globals.css`), geen "standaard AI-look".
- `LAUNCHEN.md`: deploy-handleiding.

## Openstaand
- cron-job.org-account activeren en job elke minuut laten draaien.
- AI-controle aanzetten op het filter "sm06 uitlaat".
- Google Search Console: `NEXT_PUBLIC_GOOGLE_VERIFICATION` invullen en sitemap indienen.

## Lokaal draaien
```
npm install
npm run dev
```
Zonder `.env.local` gebruikt hij `local.db` en worden mails in de terminal getoond.

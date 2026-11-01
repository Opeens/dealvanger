# Dealvanger online zetten (gratis)

Je hebt vier gratis accounts nodig: **GitHub**, **Vercel**, **Turso** en **cron-job.org**. Voor e-mail gebruik je **Gmail** (of Resend als je een eigen domein hebt). Het kost ongeveer 30 minuten.

## 1. Code op GitHub zetten
1. Maak een account op https://github.com en maak een nieuwe, **private** repository aan, bijv. `dealvanger`.
2. Open een terminal in deze map en voer uit (vervang `JOUWNAAM`):
   ```
   git remote add origin https://github.com/JOUWNAAM/dealvanger.git
   git push -u origin main
   ```

## 2. Database (Turso)
1. Maak een account op https://turso.tech en maak een database aan (regio: Europa, bijv. Frankfurt of Amsterdam).
2. Kopieer de **Database URL** (begint met `libsql://`) en maak een **token** aan.
   De tabellen worden automatisch aangemaakt bij het eerste gebruik.

## 3. E-mail
**Optie A: Gmail (makkelijkst, max. ~500 mails per dag)**
1. Zet tweestapsverificatie aan op je Google-account.
2. Ga naar https://myaccount.google.com/apppasswords en maak een app-wachtwoord aan.
3. Gebruik: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=jij@gmail.com`, `SMTP_PASS=<app-wachtwoord>`.

**Optie B: Resend (beter voor veel gebruikers, eigen domein nodig)**
1. Account op https://resend.com, voeg je domein toe en verifieer het.
2. Gebruik: `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<api-key>`, `MAIL_FROM=Dealvanger <noreply@jouwdomein.nl>`.

## 4. Vercel
1. Account op https://vercel.com (log in met GitHub) en klik **Add New → Project**. Kies je repository.
2. Vul bij **Environment Variables** in (zie `.env.example`):
   | Naam | Waarde |
   |---|---|
   | `NEXT_PUBLIC_SITE_NAME` | Dealvanger (of je eigen naam) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` (of je eigen domein) |
   | `SESSION_SECRET` | lange willekeurige tekst, min. 32 tekens |
   | `CRON_SECRET` | nog een lange willekeurige tekst |
   | `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | uit stap 2 |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | uit stap 3 |
3. Klik **Deploy**. Elke `git push` zet daarna automatisch een nieuwe versie online.

## 5. Elke minuut laten scannen (cron-job.org)
1. Account op https://cron-job.org → **Create cronjob**.
2. URL: `https://<jouw-site>/api/cron?key=<CRON_SECRET>`
3. Schema: **elke minuut**. Opslaan.
4. Test: open die URL in je browser. Je ziet iets als `{"due":1,"scanned":1,...}`.
   Zie je bij een filter `Marktplaats remt af (HTTP 403)`, dan blokkeert Marktplaats de servers van Vercel. Laat het dan weten, dan zoeken we een andere oplossing.

## 6. Vindbaar in Google
1. Ga naar https://search.google.com/search-console en voeg je site toe (type "URL-voorvoegsel").
2. Kies verificatie via **HTML-tag**, kopieer alleen de code uit `content="..."` en zet die in Vercel als `NEXT_PUBLIC_GOOGLE_VERIFICATION`. Redeploy en klik op Verifiëren.
3. Dien bij **Sitemaps** `sitemap.xml` in.
4. Google heeft meestal een paar dagen tot weken nodig om de site op te nemen. Met een eigen domein (bijv. via TransIP, ~€10/jaar, koppelen in Vercel → Settings → Domains) word je beter gevonden dan met een `.vercel.app`-adres.

## Goed om te weten
- **Vercel Hobby (gratis) is alleen voor niet-commercieel gebruik.** Ga je geld vragen of advertenties tonen, dan heb je Vercel Pro nodig (~$20/maand).
- Marktplaats heeft geen officiële API voor dit gebruik. Hun voorwaarden verbieden geautomatiseerd uitlezen. Een openbare dienst valt meer op dan persoonlijk gebruik. De site scant daarom rustig: identieke zoekopdrachten worden samengevoegd, er zit pauze tussen requests en bij blokkades wordt 10 minuten gewacht.
- Per gebruiker zijn standaard 5 filters toegestaan (`MAX_FILTERS_PER_USER`). Eén scanronde doet ongeveer 20 unieke zoekopdrachten per minuut. Bij veel gebruikers schuiven scans dus op.

## Lokaal draaien
```
npm install
npm run dev
```
Open http://localhost:3000. Zonder SMTP-instellingen worden mails (ook inloglinks) in de terminal getoond.
Een scan start je lokaal handmatig door http://localhost:3000/api/cron te openen.

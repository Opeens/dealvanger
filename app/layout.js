import Link from 'next/link';
import { SITE_NAME, SITE_URL } from '@/lib/config';
import './globals.css';

const description = 'Marktplaats sniper: stel zoekfilters in en zie nieuwe advertenties binnen een minuut nadat ze geplaatst zijn. Met winstberekening en e-mail bij deals. Gratis.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – Marktplaats sniper & koopjes alert`, template: `%s | ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: ['marktplaats sniper', 'marktplaats alert', 'marktplaats melding nieuwe advertentie', 'koopjes', 'opkopen en doorverkopen', 'marktplaats zoekopdracht opslaan'],
  openGraph: { type: 'website', locale: 'nl_NL', siteName: SITE_NAME, title: `${SITE_NAME} – Marktplaats sniper`, description, url: '/' },
  alternates: { canonical: '/' },
  verification: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION } : undefined,
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        <header className="site-header">
          <Link href="/" className="brand"><span className="dot" />{SITE_NAME}</Link>
          <span style={{ flex: 1 }} />
          <Link href="/dashboard" className="nav-link">Dashboard</Link>
        </header>
        {children}
        <footer className="site-footer">
          <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          <Link href="/privacy">Privacy</Link>
          <span className="muted">Niet verbonden aan Marktplaats of Adevinta.</span>
        </footer>
      </body>
    </html>
  );
}

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Dealvanger';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const MAX_FILTERS_PER_USER = Number(process.env.MAX_FILTERS_PER_USER || 5);
// eigenaar(s) van de site mogen meer filters; e-mailadressen met komma gescheiden in OWNER_EMAILS
const OWNER_EMAILS = (process.env.OWNER_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
export const OWNER_MAX_FILTERS = Number(process.env.OWNER_MAX_FILTERS || 25);
export const isOwner = user => !!user?.email && OWNER_EMAILS.includes(String(user.email).toLowerCase());
export const maxFiltersFor = user => (isOwner(user) ? OWNER_MAX_FILTERS : MAX_FILTERS_PER_USER);
// scan-interval in minuten; de cron draait elke minuut
export const INTERVAL_OPTIONS = [1, 2, 5, 10, 15];

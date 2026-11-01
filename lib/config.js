export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Dealvanger';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const MAX_FILTERS_PER_USER = Number(process.env.MAX_FILTERS_PER_USER || 5);
// scan-interval in minuten; de cron draait elke minuut
export const INTERVAL_OPTIONS = [1, 2, 5, 10, 15];

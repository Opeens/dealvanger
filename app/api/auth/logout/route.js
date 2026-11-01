import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { SITE_URL } from '@/lib/config';

export async function POST() {
  const res = NextResponse.redirect(`${SITE_URL}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

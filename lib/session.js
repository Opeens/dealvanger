import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET ontbreekt of is korter dan 32 tekens');
    return new TextEncoder().encode('dev-only-secret-dev-only-secret-dev-only');
  }
  return new TextEncoder().encode(secret);
}

export async function setSessionCookie(response, user) {
  const token = await new SignJWT({ uid: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(key());
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function getUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { id: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}

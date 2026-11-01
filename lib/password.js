import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt$')) return false;
  const [, salt, hash] = stored.split('$');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), 64);
  const expected = Buffer.from(hash, 'base64');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export function checkUsername(username) {
  if (!USERNAME_RE.test(username)) return 'Gebruikersnaam: 3-20 tekens, alleen letters, cijfers, punt, streepje of underscore.';
  return null;
}

export function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Wachtwoord moet minstens 8 tekens zijn.';
  if (password.length > 200) return 'Wachtwoord is te lang.';
  return null;
}

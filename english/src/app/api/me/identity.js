import { timingSafeEqual } from 'node:crypto';
export function readIdentity(headers, secret, includeId = false) {
  const supplied = headers.get('x-english-gateway') || '';
  if (!secret || Buffer.byteLength(supplied) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) return null;
  const encoded = headers.get('x-userinfo');
  if (!encoded || encoded.length > 16384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  try {
    const user = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (typeof user.sub !== 'string' || !user.sub || typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) || user.email_verified !== true) return null;
    return { ...(includeId ? { id: user.sub } : {}), email: user.email, name: typeof user.name === 'string' ? user.name.slice(0, 200) : '' };
  } catch { return null; }
}

import { readFileSync } from 'node:fs';
import { readIdentity } from './identity';
export function currentUser(request) {
  try { return readIdentity(request.headers, readFileSync(process.env.KONG_IDENTITY_SECRET_FILE || '/app/.kong-identity-secret','utf8').trim(), true); }
  catch { return null; }
}

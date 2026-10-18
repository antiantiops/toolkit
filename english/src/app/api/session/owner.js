import { createHash } from 'node:crypto';
import { currentUser } from '../me/auth';
export function cacheOwner(request) {
  const user = currentUser(request);
  return user ? `account_${createHash('sha256').update(user.id).digest('hex')}` : null;
}

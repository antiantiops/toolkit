import { readFileSync } from 'node:fs';
import { NextResponse } from 'next/server';
import { readIdentity } from './identity';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  let secret = '';
  try { secret = readFileSync(process.env.KONG_IDENTITY_SECRET_FILE || '/app/.kong-identity-secret', 'utf8').trim(); } catch {}
  const user = readIdentity(request.headers, secret);
  return NextResponse.json({ user }, { status: user ? 200 : 401, headers: { 'Cache-Control': 'private, no-store' } });
}

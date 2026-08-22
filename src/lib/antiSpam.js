import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEVICE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAntiSpamSecret() {
  const secret = process.env.ANTI_SPAM_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('ANTI_SPAM_SECRET must contain at least 32 characters.');
  }
  return secret;
}

export function getClientIp(request) {
  const candidates = [
    request.headers.get('x-real-ip'),
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-forwarded-for')?.split(',')[0],
  ];

  return candidates.find((value) => value?.trim())?.trim().slice(0, 64) || 'unknown';
}

export function getDeviceId(request) {
  const deviceId = request.headers.get('x-device-id')?.trim() || '';
  return DEVICE_PATTERN.test(deviceId) ? deviceId.toLowerCase() : null;
}

export function hashIdentifier(kind, value) {
  return createHmac('sha256', getAntiSpamSecret())
    .update(`${kind}:${value}`)
    .digest('hex');
}

export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function verifyTurnstile({ token, ip, action, hostname }) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token || token.length > 2048) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
    idempotency_key: crypto.randomUUID(),
  });

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return false;

    const result = await response.json();
    if (!result.success || result.action !== action) return false;

    const expectedHost = hostname.split(':')[0].toLowerCase();
    const verifiedHost = String(result.hostname || '').toLowerCase();
    const expectedBuffer = Buffer.from(expectedHost);
    const verifiedBuffer = Buffer.from(verifiedHost);

    return expectedBuffer.length === verifiedBuffer.length
      && timingSafeEqual(expectedBuffer, verifiedBuffer);
  } catch {
    return false;
  }
}

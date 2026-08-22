import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import {
  getClientIp,
  getDeviceId,
  hashIdentifier,
  isSameOrigin,
  verifyTurnstile,
} from '@/lib/antiSpam';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const INVALID_CREDENTIALS_MESSAGE =
  'Login sau parolă incorectă. Verifică datele și încearcă din nou.';

function jsonResponse(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

async function recordAttempt(supabase, ipHash, deviceHash, successful) {
  return supabase.rpc('record_admin_login_attempt', {
    p_ip_hash: ipHash,
    p_device_hash: deviceHash,
    p_successful: successful,
  });
}

function invalidLoginResponse(limit) {
  const failureCount = Number(limit?.failure_count || 0);
  if (failureCount >= 5) {
    return jsonResponse({
      ok: false,
      code: 'temporarily_locked',
      retryAfter: 1_800,
      challengeRequired: false,
      message: 'Prea multe încercări. Autentificarea este blocată temporar.',
    }, 429);
  }

  return jsonResponse({
    ok: false,
    message: INVALID_CREDENTIALS_MESSAGE,
    challengeRequired: failureCount >= 2,
  }, 401);
}

export async function POST(request) {
  if (!isSameOrigin(request)) {
    return jsonResponse({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, 403);
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, 400);
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > 4_096) {
    return jsonResponse({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, 400);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, 400);
  }

  const login = String(body.login || '').trim().toLowerCase();
  const password = String(body.password || '');
  const deviceId = getDeviceId(request);
  if (!deviceId || login.length > 40 || password.length > 256) {
    return jsonResponse({ ok: false, message: INVALID_CREDENTIALS_MESSAGE }, 400);
  }

  let adminClient;
  let ipHash;
  let deviceHash;
  const ip = getClientIp(request);
  try {
    adminClient = getSupabaseAdmin();
    ipHash = hashIdentifier('admin-login-ip', ip);
    deviceHash = hashIdentifier('admin-login-device', deviceId);
  } catch {
    return jsonResponse({ ok: false, message: 'Autentificarea nu este configurată.' }, 503);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!adminEmail || !supabaseUrl || !anonKey) {
    return jsonResponse({ ok: false, message: 'Autentificarea nu este configurată.' }, 503);
  }

  const turnstileToken = String(body.turnstileToken || '');
  let turnstileVerified = false;
  if (turnstileToken) {
    turnstileVerified = await verifyTurnstile({
      token: turnstileToken,
      ip,
      action: 'admin_login',
      hostname: new URL(request.url).host,
    });
    if (!turnstileVerified) {
      return jsonResponse({
        ok: false,
        code: 'challenge_failed',
        challengeRequired: true,
        message: 'Verificarea anti-spam a expirat sau nu este validă. Încearcă din nou.',
      }, 403);
    }
  }

  const { data: limitData, error: limitError } = await adminClient.rpc(
    'begin_admin_login_attempt',
    {
      p_ip_hash: ipHash,
      p_device_hash: deviceHash,
      p_turnstile_verified: turnstileVerified,
    },
  );
  if (limitError) {
    return jsonResponse({ ok: false, message: 'Protecția autentificării nu este activă.' }, 503);
  }

  const limit = limitData?.[0];
  if (limit?.challenge_required) {
    return jsonResponse({
      ok: false,
      code: 'challenge_required',
      challengeRequired: true,
      message: 'Confirmă verificarea anti-spam pentru a continua.',
    }, 403);
  }
  if (!limit?.allowed) {
    return jsonResponse({
      ok: false,
      code: 'temporarily_locked',
      retryAfter: limit?.retry_after_seconds || 1_800,
      challengeRequired: false,
      message: 'Prea multe încercări. Autentificarea este blocată temporar.',
    }, 429);
  }

  if (login !== 'admin' || !password) {
    return invalidLoginResponse(limit);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: adminEmail,
    password,
  });

  if (authError || !authData.session) {
    return invalidLoginResponse(limit);
  }

  const authorizedClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${authData.session.access_token}` },
    },
  });
  const { data: isAdmin, error: adminError } = await authorizedClient.rpc(
    'is_current_user_admin',
  );

  if (adminError || !isAdmin) {
    await authClient.auth.signOut();
    return invalidLoginResponse(limit);
  }

  const { error: recordError } = await recordAttempt(adminClient, ipHash, deviceHash, true);
  if (recordError) {
    await authClient.auth.signOut();
    return jsonResponse({ ok: false, message: 'Autentificarea nu a putut fi finalizată.' }, 503);
  }

  return jsonResponse({
    ok: true,
    session: {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    },
  });
}

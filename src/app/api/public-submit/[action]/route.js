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

const ACTIONS = {
  'table-order': { databaseAction: 'table_order', turnstileAction: 'table_order' },
  contact: { databaseAction: 'contact', turnstileAction: 'contact_form' },
  reservation: { databaseAction: 'reservation', turnstileAction: 'reservation_form' },
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message, status, code) {
  return NextResponse.json({ ok: false, message, code }, { status });
}

async function readJsonBody(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('invalid_content_type');
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > 50_000) throw new Error('invalid_body');
  return JSON.parse(rawBody);
}

async function recordEvent(supabase, values) {
  await supabase.rpc('record_security_event', {
    p_action: values.action,
    p_outcome: values.outcome,
    p_reason: values.reason,
    p_ip_hash: values.ipHash,
    p_device_hash: values.deviceHash,
    p_scope_hash: values.scopeHash,
  });
}

async function submitBusinessAction(supabase, action, body) {
  if (action === 'table_order') {
    if (!UUID_PATTERN.test(body.token || '') || !UUID_PATTERN.test(body.requestId || '')) {
      return { error: new Error('invalid_order') };
    }
    return supabase.rpc('submit_table_order', {
      p_token: body.token,
      p_request_id: body.requestId,
      p_items: body.items,
      p_notes: body.notes || null,
    });
  }

  if (action === 'contact') {
    return supabase.rpc('submit_contact_message', {
      p_name: body.name,
      p_email: body.email,
      p_subject: body.subject,
      p_message: body.message,
    });
  }

  return supabase.rpc('submit_reservation', {
    p_name: body.name,
    p_phone: body.phone,
    p_date: body.date,
    p_time: body.time,
    p_guests: body.guests,
    p_table_number: body.tableNumber,
    p_message: body.message || null,
  });
}

export async function POST(request, { params }) {
  const { action: routeAction } = await params;
  const config = ACTIONS[routeAction];
  if (!config) return jsonError('Operațiune necunoscută.', 404, 'not_found');
  if (!isSameOrigin(request)) return jsonError('Cererea nu este permisă.', 403, 'invalid_origin');

  let body;
  try {
    body = await readJsonBody(request);
  } catch {
    return jsonError('Datele trimise nu sunt valide.', 400, 'invalid_request');
  }

  const deviceId = getDeviceId(request);
  if (!deviceId) return jsonError('Reîncarcă pagina și încearcă din nou.', 400, 'invalid_device');

  let supabase;
  let ipHash;
  let deviceHash;
  let scopeHash = null;
  const ip = getClientIp(request);

  try {
    supabase = getSupabaseAdmin();
    ipHash = hashIdentifier('ip', ip);
    deviceHash = hashIdentifier('device', deviceId);
    if (config.databaseAction === 'table_order') {
      scopeHash = hashIdentifier('qr', String(body.token || ''));
    }
  } catch {
    return jsonError('Serviciul nu este configurat momentan.', 503, 'not_configured');
  }

  let challengeRequired = config.databaseAction !== 'table_order';
  if (!challengeRequired) {
    const { data, error } = await supabase.rpc('has_recent_turnstile', {
      p_action: config.databaseAction,
      p_device_hash: deviceHash,
      p_scope_hash: scopeHash,
    });
    if (error) return jsonError('Protecția anti-spam nu este activă.', 503, 'not_configured');
    challengeRequired = !data;
  }

  if (challengeRequired) {
    const verified = await verifyTurnstile({
      token: String(body.turnstileToken || ''),
      ip,
      action: config.turnstileAction,
      hostname: new URL(request.url).host,
    });

    await recordEvent(supabase, {
      action: config.databaseAction,
      outcome: verified ? 'turnstile_pass' : 'turnstile_failed',
      reason: verified ? '' : 'challenge_failed',
      ipHash,
      deviceHash,
      scopeHash,
    });

    if (!verified) {
      return jsonError('Confirmă verificarea anti-spam și încearcă din nou.', 403, 'challenge_failed');
    }
  }

  const { data: limitData, error: limitError } = await supabase.rpc('check_public_submission_limit', {
    p_action: config.databaseAction,
    p_ip_hash: ipHash,
    p_device_hash: deviceHash,
    p_scope_hash: scopeHash,
  });
  if (limitError) return jsonError('Protecția anti-spam nu este activă.', 503, 'not_configured');

  const limitResult = limitData?.[0];
  if (!limitResult?.allowed) {
    return jsonError('Prea multe încercări. Te rugăm să încerci mai târziu.', 429, 'rate_limited');
  }

  const { data, error } = await submitBusinessAction(supabase, config.databaseAction, body);
  if (error) {
    return jsonError('Datele nu au putut fi salvate. Verifică formularul și încearcă din nou.', 400, 'submission_failed');
  }

  return NextResponse.json({ ok: true, data });
}

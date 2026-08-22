const DEVICE_KEY = 'artichoke_device_id';

export function getOrCreateDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, deviceId);
  return deviceId;
}

export async function submitPublicAction(action, payload) {
  const response = await fetch(`/api/public-submit/${action}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-device-id': getOrCreateDeviceId(),
    },
    body: JSON.stringify(payload),
  });

  let result = null;
  try {
    result = await response.json();
  } catch {
    // Răspunsurile invalide sunt tratate ca eroare generică.
  }

  if (!response.ok || !result?.ok) {
    const error = new Error(result?.message || 'Cererea nu a putut fi trimisă.');
    error.code = result?.code || 'request_failed';
    throw error;
  }

  return result.data;
}

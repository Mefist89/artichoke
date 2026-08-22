'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateDeviceId } from '@/lib/deviceId';
import TurnstileWidget from '@/components/TurnstileWidget';

const INVALID_CREDENTIALS_MESSAGE =
  'Login sau parolă incorectă. Verifică datele și încearcă din nou.';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [challengeRequired, setChallengeRequired] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const login = String(formData.get('login') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');

    if (challengeRequired && !turnstileToken) {
      setErrorMessage('Confirmă verificarea anti-spam pentru a continua.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-device-id': getOrCreateDeviceId(),
        },
        body: JSON.stringify({ login, password, turnstileToken }),
      });
      const result = await response.json();

      if (!response.ok || !result?.ok || !result.session) {
        if (result?.challengeRequired) setChallengeRequired(true);
        if (result?.code === 'temporarily_locked') {
          const minutes = Math.max(1, Math.ceil(Number(result.retryAfter || 1_800) / 60));
          setErrorMessage(`Prea multe încercări greșite. Încearcă din nou peste ${minutes} minute.`);
        } else {
          setErrorMessage(result?.message || INVALID_CREDENTIALS_MESSAGE);
        }
        if (challengeRequired || result?.challengeRequired || turnstileToken) {
          setTurnstileToken('');
          setTurnstileResetKey((value) => value + 1);
        }
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.session.accessToken,
        refresh_token: result.session.refreshToken,
      });
      if (sessionError) {
        setErrorMessage('Sesiunea nu a putut fi inițiată. Încearcă din nou.');
        return;
      }

      window.localStorage.setItem('artichoke_admin_last_activity', String(Date.now()));
      router.replace('/dashboard');
      router.refresh();
    } catch {
      setErrorMessage('Autentificarea nu este disponibilă momentan. Încearcă din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Acces securizat</p>
              <h1 className="section-title">Autentificare</h1>
              <p>Accesul este rezervat administratorului PLAY ROOM ARTICHOKE.</p>
            </div>
          </div>
        </section>

        <section className="section contact-section">
          <div className="container login-container">
            <article className="contact-form-card">
              <h2>Intrare administrator</h2>
              <p>Introdu loginul și parola administratorului.</p>

              <form className="contact-form" onSubmit={handleSubmit}>
                <label>
                  Login
                  <input
                    type="text"
                    name="login"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    minLength="3"
                    maxLength="40"
                    required
                    disabled={loading}
                  />
                </label>

                <label>
                  Parolă
                  <input
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </label>

                {challengeRequired && (
                  <TurnstileWidget
                    action="admin_login"
                    onTokenChange={setTurnstileToken}
                    resetKey={turnstileResetKey}
                  />
                )}

                <button type="submit" disabled={loading}>
                  {loading ? 'Se verifică...' : 'Intră în cont'}
                </button>

                {errorMessage && (
                  <p className="form-status is-error" role="alert" aria-live="polite">
                    {errorMessage}
                  </p>
                )}
              </form>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

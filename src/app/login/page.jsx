'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_LOGIN = 'admin';
const ADMIN_AUTH_EMAIL = 'jeniabortnic@gmail.com';
const INVALID_CREDENTIALS_MESSAGE =
  'Login sau parolă incorectă. Verifică datele și încearcă din nou.';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);
    const login = String(formData.get('login') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');

    if (login !== ADMIN_LOGIN) {
      setErrorMessage(INVALID_CREDENTIALS_MESSAGE);
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ADMIN_AUTH_EMAIL,
      password,
    });

    if (signInError) {
      setErrorMessage(INVALID_CREDENTIALS_MESSAGE);
      setLoading(false);
      return;
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc(
      'is_current_user_admin',
    );

    if (adminError || !isAdmin) {
      await supabase.auth.signOut();
      setErrorMessage('Acest cont nu are acces la panoul administratorului.');
      setLoading(false);
      return;
    }

    router.replace('/dashboard');
    router.refresh();
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

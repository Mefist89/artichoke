'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const form = event.currentTarget;
    const email = form.email.value.trim();
    const password = form.password.value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Mesaj intenționat generic: nu dezvăluie dacă adresa există.
      setErrorMessage('Email sau parolă incorectă. Verifică datele și încearcă din nou.');
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
              <p>Introdu emailul și parola contului creat în Supabase.</p>

              <form className="contact-form" onSubmit={handleSubmit}>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
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

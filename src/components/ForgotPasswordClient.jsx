'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordClient() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: '', text: '' });

    const email = event.currentTarget.email.value.trim();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      console.error('Password recovery request failed:', error.message);
      setStatus({ type: 'error', text: 'Linkul nu a putut fi trimis. Verifică adresa și încearcă din nou mai târziu.' });
    } else {
      setStatus({ type: 'success', text: 'Dacă adresa este înregistrată, vei primi imediat un link pentru schimbarea parolei.' });
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        <section className="section contact-section">
          <div className="container login-container">
            <article className="contact-form-card">
              <p className="section-kicker">Acces administrator</p>
              <h1>Restabilire parolă</h1>
              <p>Introdu emailul contului. Linkul este valabil o singură dată.</p>
              <form className="contact-form" onSubmit={handleSubmit}>
                <label>Email<input type="email" name="email" autoComplete="email" required disabled={loading} /></label>
                <button type="submit" disabled={loading}>{loading ? 'Se trimite…' : 'Trimite linkul'}</button>
                {status.text && <p className={`form-status is-${status.type}`} role="status" aria-live="polite">{status.text}</p>}
              </form>
              <p className="login-help-link"><Link href="/login">Înapoi la autentificare</Link></p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

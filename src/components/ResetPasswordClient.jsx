'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordClient() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const recoveryError = hashParams.get('error_description');

    if (recoveryError) {
      queueMicrotask(() => {
        if (!active) return;
        setStatus({ type: 'error', text: 'Linkul este expirat sau a fost deja utilizat. Solicită un link nou.' });
        setChecking(false);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setCanReset(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!active || recoveryError) return;
      if (error || !session) {
        setStatus({ type: 'error', text: 'Linkul este expirat sau invalid. Solicită un link nou.' });
      } else {
        setCanReset(true);
      }
      setChecking(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', text: '' });
    const form = event.currentTarget;
    const password = form.password.value;

    if (password !== form.confirmation.value) {
      setStatus({ type: 'error', text: 'Parolele introduse nu coincid.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      console.error('Password update failed:', error.message);
      setStatus({
        type: 'error',
        text: error.message?.toLowerCase().includes('weak')
          ? 'Parola este prea slabă. Folosește cel puțin 12 caractere diferite.'
          : 'Parola nu a putut fi schimbată. Solicită un link nou și încearcă din nou.',
      });
      setLoading(false);
      return;
    }

    setStatus({ type: 'success', text: 'Parola a fost schimbată. Vei fi redirecționat la autentificare.' });
    await supabase.auth.signOut({ scope: 'global' });
    setTimeout(() => router.replace('/login?password=changed'), 900);
  };

  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        <section className="section contact-section">
          <div className="container login-container">
            <article className="contact-form-card">
              <p className="section-kicker">Acces securizat</p>
              <h1>Parolă nouă</h1>
              {checking && <p role="status">Se verifică linkul…</p>}
              {!checking && canReset && (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <label>Parolă nouă<input type="password" name="password" minLength="12" maxLength="128" autoComplete="new-password" required disabled={loading} /></label>
                  <label>Repetă parola<input type="password" name="confirmation" minLength="12" maxLength="128" autoComplete="new-password" required disabled={loading} /></label>
                  <button type="submit" disabled={loading}>{loading ? 'Se salvează…' : 'Schimbă parola'}</button>
                </form>
              )}
              {status.text && <p className={`form-status is-${status.type}`} role="alert" aria-live="polite">{status.text}</p>}
              {!checking && !canReset && <p className="login-help-link"><Link href="/forgot-password">Solicită un link nou</Link></p>}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

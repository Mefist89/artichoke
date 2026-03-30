'use client';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/profile`
      }
    });
    
    if (error) {
      alert('Eroare autentificare: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <main className="contact-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Bine ai revenit</p>
              <h1 className="section-title">Autentificare</h1>
              <p>Autentificarea se face doar cu cont Google de tip Gmail.</p>
            </div>
          </div>
        </section>

        <section className="section contact-section">
          <div className="container login-container">
            <article className="contact-form-card">
              <h2>Login cu Google</h2>
              <div className="contact-form" style={{ textAlign: 'center' }}>
                <button 
                  type="button" 
                  className="google-auth-btn" 
                  onClick={handleGoogleLogin} 
                  disabled={loading}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '1rem auto' }}
                >
                  <svg className="google-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24" height="24">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  {loading ? 'Se conectează...' : 'Continuă cu Google'}
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

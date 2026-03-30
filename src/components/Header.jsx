'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    // Încarcă starea temei din localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    }

    // Auth State Observer
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

  const isActive = (path) => pathname === path ? 'is-active' : '';

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand" aria-label="Acasă">
            <span className="brand-icon material-icons-outlined">coffee</span>
            <span className="brand-text">PLAY ROOM ARTICHOKE</span>
          </Link>

          <nav className="site-nav" aria-label="Navigare principală">
            <Link href="/" className={isActive('/')}>Acasă</Link>
            <Link href="/galerie" className={isActive('/galerie')}>Galerie</Link>
            <Link href="/produse" className={isActive('/produse')}>Produse</Link>
            <Link href="/servicii" className={isActive('/servicii')}>Servicii</Link>
            <Link href="/reguli" className={isActive('/reguli')}>Reguli</Link>
            <Link href="/contact" className={isActive('/contact')}>Contacte</Link>
          </nav>

          <button
            className="nav-toggle"
            type="button"
            aria-label="Deschide meniul"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <span className="material-icons-outlined">{isNavOpen ? 'close' : 'menu'}</span>
          </button>

          <div className="header-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label="Schimbă tema"
              onClick={toggleTheme}
            >
              <span className="material-icons-outlined">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <Link className="book-btn" href="/rezervari">Rezervă</Link>
            
            <div className="auth-header-state" style={{ marginLeft: '0.5rem', display: 'flex', alignItems: 'center' }}>
              {user ? (
                <Link href="/profile" title={user.user_metadata?.name || 'Profil'} className="theme-toggle">
                  <span className="material-icons-outlined">account_circle</span>
                </Link>
              ) : (
                <Link href="/login" title="Intră" className="theme-toggle">
                  <span className="material-icons-outlined">login</span>
                </Link>
              )}
            </div>
            <Link href="/cos" className="theme-toggle" style={{ marginLeft: '0.5rem' }} title="Coșul de cumpărături">
              <span className="material-icons-outlined">shopping_cart</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className={`mobile-nav ${isNavOpen ? 'is-open' : ''}`} aria-label="Navigare mobilă">
        <div className="container mobile-nav-inner">
          <Link href="/" onClick={() => setIsNavOpen(false)} className={isActive('/')}>Acasă</Link>
          <Link href="/galerie" onClick={() => setIsNavOpen(false)} className={isActive('/galerie')}>Galerie</Link>
          <Link href="/produse" onClick={() => setIsNavOpen(false)} className={isActive('/produse')}>Produse</Link>
          <Link href="/servicii" onClick={() => setIsNavOpen(false)} className={isActive('/servicii')}>Servicii</Link>
          <Link href="/reguli" onClick={() => setIsNavOpen(false)} className={isActive('/reguli')}>Reguli</Link>
          <Link href="/contact" onClick={() => setIsNavOpen(false)} className={isActive('/contact')}>Contacte</Link>
          {user ? (
            <Link href="/profile" onClick={() => setIsNavOpen(false)} className={isActive('/profile')}>Profil ({user.user_metadata?.name || 'Cont'})</Link>
          ) : (
            <Link href="/login" onClick={() => setIsNavOpen(false)} className={isActive('/login')}>Intră / Logare</Link>
          )}
          <Link href="/cos" onClick={() => setIsNavOpen(false)} className={isActive('/cos')}>Coșul de cumpărături</Link>
        </div>
      </nav>
    </>
  );
}

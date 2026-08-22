'use client';
import { supabase } from '@/lib/supabase';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ORDER_STATUSES = {
  pending: { label: 'În așteptare', background: '#fff3cd', color: '#856404' },
  processing: { label: 'În procesare', background: '#dbeafe', color: '#1e40af' },
  completed: { label: 'Finalizată', background: '#d4edda', color: '#155724' },
  cancelled: { label: 'Anulată', background: '#fde2e2', color: '#9b1c1c' },
};

const UNKNOWN_ORDER_STATUS = {
  label: 'Stare necunoscută',
  background: '#e9ecef',
  color: '#495057',
};

function ProfileContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrderSuccess = searchParams.get('order') === 'success';

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadError('');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(`
            id, total, status, created_at, notes,
            order_items (
              product_name, quantity, price
            )
          `)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(ordersData || []);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setLoadError('Istoricul comenzilor nu a putut fi încărcat. Verifică conexiunea și încearcă din nou.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="contact-main header-padded">
          <p style={{ textAlign: 'center', marginTop: '4rem' }}>Se încarcă profilul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        
        {isOrderSuccess && (
          <div style={{ background: '#d4edda', color: '#155724', padding: '1rem', textAlign: 'center', marginBottom: '1rem', borderBottom: '1px solid #c3e6cb' }}>
            Comanda a fost trimisă cu succes! Îți mulțumim.
          </div>
        )}

        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Bine ai venit înapoi</p>
              <h1 className="section-title">Profilul Meu</h1>
              <p>Administrează-ți contul și vezi istoricul comenzilor tale</p>
            </div>
          </div>
        </section>

        <section className="section contact-section">
          <div className="container contact-layout">
            <aside className="contact-side">
              <article className="contact-card">
                <h2>Informații Cont</h2>
                <div className="contact-item">
                  <span className="material-icons-outlined">person</span>
                  <div>
                    <strong>Nume</strong>
                    <p>{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">mail</span>
                  <div>
                    <strong>Email</strong>
                    <p>{user?.email}</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">calendar_today</span>
                  <div>
                    <strong>Data Creării</strong>
                    <p>{new Date(user?.created_at).toLocaleDateString('ro-RO')}</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">lock</span>
                  <div>
                    <strong>Tip Cont</strong>
                    <p>{user?.app_metadata?.provider || 'Email'}</p>
                  </div>
                </div>
              </article>

              <div className="contact-card">
                <h2>Acțiuni Rapide</h2>
                <div className="contact-item" style={{ marginBottom: '1rem' }}>
                  <Link href="/cos" className="home-gallery-link">Coșul Meu</Link>
                </div>
                <div className="contact-item" style={{ marginBottom: '1rem' }}>
                  <Link href="/produse" className="home-gallery-link">Comandă Produse</Link>
                </div>
                <div className="contact-item" style={{ marginBottom: '1rem' }}>
                  <Link href="/rezervari" className="home-gallery-link">Fă o Rezervare</Link>
                </div>
                <div className="contact-item">
                  <button onClick={handleLogout} className="home-gallery-link" style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}>
                    Deconectare
                  </button>
                </div>
              </div>
            </aside>

            <article className="contact-form-card">
              <h2>Istoric Comenzi</h2>
              <p>Vezi comenzile tale anterioare și starea acestora.</p>

              <div className="contact-form">
                {loadError ? (
                  <div className="form-status is-error" role="alert">
                    <p>{loadError}</p>
                    <button type="button" className="home-gallery-link" onClick={() => window.location.reload()}>
                      Încearcă din nou
                    </button>
                  </div>
                ) : orders.length === 0 ? (
                  <p>Nu ai plasat nicio comandă până acum.</p>
                ) : (
                  orders.map(order => {
                    const orderStatus = ORDER_STATUSES[order.status] || UNKNOWN_ORDER_STATUS;

                    return (
                    <div key={order.id} style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>Comanda #{order.id.split('-')[0]}</strong>
                        <span style={{ 
                          background: orderStatus.background,
                          color: orderStatus.color,
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          fontSize: '0.85rem'
                        }}>
                          {orderStatus.label}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                        {new Date(order.created_at).toLocaleString('ro-RO')}
                      </p>
                      
                      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                        {order.order_items?.map((item, idx) => (
                          <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>{item.price * item.quantity} MDL</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Total</span>
                        <span style={{ color: 'var(--primary)' }}>{order.total} MDL</span>
                      </div>
                      {order.notes && (
                        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontStyle: 'italic', color: '#555' }}>Notă: {order.notes}</p>
                      )}
                    </div>
                    );
                  })
                )}
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper">
        <div className="contact-main header-padded">
          <p style={{ textAlign: 'center', marginTop: '4rem' }}>Se încarcă profilul...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}

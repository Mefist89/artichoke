'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddToCartButton({ product }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const requestInFlight = useRef(false);
  const feedbackTimer = useRef(null);
  const router = useRouter();

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const handleAdd = async () => {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setLoading(true);
    setAdded(false);

    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        alert('Te rugăm să te conectezi pentru a adăuga în coș!');
        router.push('/login');
        return;
      }

      // Clientul trimite doar ID-ul. Numele și prețul sunt citite de funcția
      // SQL din catalogul public.products, nu din date controlate de browser.
      const { error } = await supabase.rpc('add_to_cart', {
        p_product_id: product.id,
        p_quantity: 1,
      });

      if (error) throw error;

      setAdded(true);
      feedbackTimer.current = setTimeout(() => {
        setAdded(false);
        feedbackTimer.current = null;
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Produsul nu a putut fi adăugat în coș. Încearcă din nou.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <button 
      id={`btn-add-${product.id}`}
      className={`btn-add-cart ${added ? 'btn-success is-success' : ''}`}
      onClick={handleAdd}
      disabled={loading}
    >
      {loading ? (
        <span style={{ fontSize: '0.9rem' }}>Se adaugă...</span>
      ) : added ? (
        <>
          <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>check</span>
          <span style={{ fontSize: '0.9rem' }}>Adăugat</span>
        </>
      ) : (
        <>
          <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>add_shopping_cart</span>
          <span style={{ fontSize: '0.9rem' }}>În coș</span>
        </>
      )}
    </button>
  );
}

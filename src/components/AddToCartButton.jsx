'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AddToCartButton({ product }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdd = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Te rugăm să te conectezi pentru a adăuga în coș!");
      router.push('/login');
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .insert([
        { 
          user_id: session.user.id, 
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1
        }
      ]);

    if (error) {
      console.error(error);
      alert('Eroare la adăugarea în coș: ' + error.message);
      setLoading(false);
      return;
    }

    // Succes
    const btn = document.getElementById(`btn-add-${product.id}`);
    if (btn) {
      const oldText = btn.innerHTML;
      btn.innerHTML = `<span class="material-icons-outlined" style="font-size:1.1rem">check</span> <span style="font-size:0.9rem">Adăugat</span>`;
      btn.classList.add('btn-success', 'is-success');
      btn.style.backgroundColor = 'var(--success-color, #28a745)';
      btn.style.color = '#fff';
      
      setTimeout(() => {
        btn.innerHTML = oldText;
        btn.classList.remove('btn-success', 'is-success');
        btn.style.backgroundColor = '';
        btn.style.color = '';
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <button 
      id={`btn-add-${product.id}`}
      className="btn-add-cart" 
      onClick={handleAdd}
      disabled={loading}
    >
      {loading ? (
        <span style={{ fontSize: '0.9rem' }}>Se adaugă...</span>
      ) : (
        <>
          <span className="material-icons-outlined" style={{ fontSize: '1.1rem' }}>add_shopping_cart</span>
          <span style={{ fontSize: '0.9rem' }}>În coș</span>
        </>
      )}
    </button>
  );
}

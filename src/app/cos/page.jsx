'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CosPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const operationInFlight = useRef(false);
  const router = useRouter();

  const loadCart = useCallback(async () => {
    setLoadError('');
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (!session) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        created_at,
        products!inner (
          name,
          price
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    setItems((data || []).map(item => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products.name,
      price: Number(item.products.price),
      quantity: item.quantity,
      created_at: item.created_at,
    })));
  }, [router]);

  useEffect(() => {
    loadCart()
      .catch((error) => {
        console.error('Eroare încărcare coș:', error);
        setLoadError('Coșul nu a putut fi încărcat. Verifică conexiunea și încearcă din nou.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadCart]);

  const updateQuantity = async (id, delta) => {
    if (operationInFlight.current) return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1 || newQty > 99) return;

    operationInFlight.current = true;
    setUpdatingItemId(id);
    try {
      const { error } = await supabase.rpc('set_cart_item_quantity', {
        p_cart_item_id: id,
        p_quantity: newQty,
      });

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Eroare actualizare coș:', error);
      await loadCart().catch((syncError) => {
        console.error('Eroare resincronizare coș:', syncError);
      });
      alert('Cantitatea nu a putut fi actualizată. Coșul a fost resincronizat.');
    } finally {
      operationInFlight.current = false;
      setUpdatingItemId(null);
    }
  };

  const removeItem = async (id) => {
    if (operationInFlight.current) return;

    operationInFlight.current = true;
    setUpdatingItemId(id);
    try {
      const { error } = await supabase.rpc('remove_cart_item', {
        p_cart_item_id: id,
      });

      if (error) throw error;
      await loadCart();
    } catch (error) {
      console.error('Eroare ștergere produs:', error);
      await loadCart().catch((syncError) => {
        console.error('Eroare resincronizare coș:', syncError);
      });
      alert('Produsul nu a putut fi șters. Coșul a fost resincronizat.');
    } finally {
      operationInFlight.current = false;
      setUpdatingItemId(null);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0 || operationInFlight.current) return;

    operationInFlight.current = true;
    setIsOrdering(true);

    // Funcția SQL recitește produsele și prețurile canonice și creează
    // comanda, pozițiile și golirea coșului într-o singură tranzacție.
    const { error: orderError } = await supabase.rpc('checkout_cart', {
      p_notes: notes.trim() || null,
    });

    if (orderError) {
      console.error('Eroare creare comandă:', orderError);
      await loadCart().catch((syncError) => {
        console.error('Eroare resincronizare coș:', syncError);
      });
      alert('Comanda nu a putut fi creată. Verifică produsele din coș și încearcă din nou.');
      operationInFlight.current = false;
      setIsOrdering(false);
      return;
    }

    router.push('/profile?order=success');
  };

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="main-content header-padded">
          <section className="section bg-light" id="cos-section">
            <div className="container form-container">
              <p style={{ textAlign: 'center' }}>Se încarcă coșul...</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="main-content header-padded">
        <section className="section bg-light" id="cos-section">
          <div className="container form-container" style={{ maxWidth: '800px' }}>
            <h1 className="display-title products-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>Coșul Meu</h1>

            {loadError ? (
              <div className="cart-empty" role="alert">
                <span className="material-icons-outlined">cloud_off</span>
                <p>{loadError}</p>
                <button type="button" className="book-btn" onClick={() => {
                  setLoading(true);
                  loadCart()
                    .catch((error) => {
                      console.error('Eroare reîncărcare coș:', error);
                      setLoadError('Coșul nu a putut fi încărcat. Verifică conexiunea și încearcă din nou.');
                    })
                    .finally(() => setLoading(false));
                }}>Încearcă din nou</button>
              </div>
            ) : items.length === 0 ? (
              <div className="cart-empty">
                <span className="material-icons-outlined">shopping_cart</span>
                <p>Coșul tău este gol.</p>
                <Link href="/produse" className="book-btn">Navighează la meniu</Link>
              </div>
            ) : (
              <div id="cartContent">
                <div style={{ overflowX: 'auto' }}>
                  <table className="cart-table">
                    <thead>
                      <tr>
                        <th>Produs</th>
                        <th>Preț</th>
                        <th>Cantitate</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="product-name">{item.product_name}</td>
                          <td className="product-price">{item.price} MDL</td>
                          <td>
                            <div className="qty-control">
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1 || updatingItemId !== null || isOrdering}>-</button>
                              <span className="qty-value">{item.quantity}</span>
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= 99 || updatingItemId !== null || isOrdering}>+</button>
                            </div>
                          </td>
                          <td className="product-price">{(item.price * item.quantity).toFixed(2)} MDL</td>
                          <td>
                            <button className="remove-btn" onClick={() => removeItem(item.id)} disabled={updatingItemId !== null || isOrdering} aria-label="Șterge produsul">
                              <span className="material-icons-outlined">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="checkout-notes">
                  <textarea 
                    placeholder="Notițe pentru comandă (opțional)..." 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={1000}
                  ></textarea>
                </div>

                <div className="cart-summary">
                  <div>
                    <span className="cart-total-label">Total spre Plată:</span>
                    <div className="cart-total-amount">{total.toFixed(2)} <small>MDL</small></div>
                  </div>
                  
                  <button 
                    className="checkout-btn" 
                    id="checkoutBtn" 
                    disabled={isOrdering || updatingItemId !== null}
                    onClick={handleCheckout}
                  >
                    {isOrdering ? 'Se plasează...' : (
                      <>
                        Trimite Comanda
                        <span className="material-icons-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      
      <style jsx global>{`
        .cart-empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted, #888); }
        .cart-empty .material-icons-outlined { font-size: 3.5rem; display: block; margin-bottom: 0.75rem; opacity: 0.4; }
        .cart-empty p { margin-bottom: 1.25rem; }
        .cart-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
        .cart-table thead th { text-align: left; padding: 0.6rem 0.75rem; border-bottom: 2px solid var(--primary); font-family: 'Anton', sans-serif; letter-spacing: 0.03em; font-size: 0.85rem; text-transform: uppercase; color: var(--primary); }
        .cart-table tbody tr { border-bottom: 1px solid var(--bg); transition: background 0.15s; }
        .cart-table tbody tr:last-child { border-bottom: none; }
        .cart-table tbody tr:hover { background: var(--bg); }
        .cart-table td { padding: 0.75rem; vertical-align: middle; }
        .cart-table .product-name { font-weight: 600; }
        .cart-table .product-price { color: var(--primary); font-weight: 700; white-space: nowrap; }
        .qty-control { display: flex; align-items: center; gap: 0.4rem; }
        .qty-btn { width: 28px; height: 28px; border: 1px solid var(--primary); background: transparent; color: var(--primary); border-radius: 50%; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, color 0.15s; }
        .qty-btn:hover { background: var(--primary); color: #fff; }
        .qty-value { min-width: 24px; text-align: center; font-weight: 700; }
        .remove-btn { background: transparent; border: none; cursor: pointer; color: #c0392b; display: flex; align-items: center; padding: 0.25rem; border-radius: 50%; transition: background 0.15s; }
        .remove-btn:hover { background: #fde8e8; }
        .cart-summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; padding-top: 1rem; border-top: 2px solid var(--primary); }
        .cart-total-label { font-size: 1.1rem; }
        .cart-total-amount { font-family: 'Anton', sans-serif; font-size: 1.8rem; color: var(--primary); letter-spacing: 0.03em; }
        .checkout-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 2rem; background: var(--primary); color: #fff; border: none; border-radius: 999px; font-family: 'Comfortaa', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.15s; }
        .checkout-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .checkout-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .checkout-notes { width: 100%; margin-top: 1rem; }
        .checkout-notes textarea { width: 100%; min-height: 80px; resize: vertical; padding: 0.75rem; border-radius: 0.75rem; border: 1px solid var(--border, #ddd); background: var(--surface); color: var(--text); font-family: inherit; }
      `}</style>
    </div>
  );
}

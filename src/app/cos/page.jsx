'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSessionAndCart = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Eroare încărcare coș:', error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    };

    fetchSessionAndCart();
  }, [router]);

  const updateQuantity = async (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty < 1) return;

    // Optimistic update
    setItems(items.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    await supabase
      .from('cart_items')
      .update({ quantity: newQty })
      .eq('id', id);
  };

  const removeItem = async (id) => {
    setItems(items.filter(i => i.id !== id));
    await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsOrdering(true);

    const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

    // 1. Creează comanda
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{ user_id: user.id, total, notes, status: 'pending' }])
      .select()
      .single();

    if (orderError) {
      alert('Eroare la crearea comenzii: ' + orderError.message);
      setIsOrdering(false);
      return;
    }

    // 2. Mută itemurile în order_items
    const orderItemsRecord = items.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      price: item.price,
      quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsRecord);

    if (itemsError) {
      alert('Comanda a fost creată, dar a apărut o eroare la adăugarea produselor: ' + itemsError.message);
      setIsOrdering(false);
      return;
    }

    // 3. Golește coșul
    await supabase.from('cart_items').delete().eq('user_id', user.id);

    // 4. Redirecționează către profil
    router.push('/profile?order=success');
  };

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

  if (loading) {
    return (
      <div className="page-wrapper">
        <main className="main-content header-padded">
          <section className="section bg-light" id="cos-section">
            <div className="container form-container">
              <p style={{ textAlign: 'center' }}>Se încarcă coșul...</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <main className="main-content header-padded">
        <section className="section bg-light" id="cos-section">
          <div className="container form-container" style={{ maxWidth: '800px' }}>
            <h1 className="display-title products-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>Coșul Meu</h1>

            {items.length === 0 ? (
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
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)} disabled={item.quantity <= 1}>-</button>
                              <span className="qty-value">{item.quantity}</span>
                              <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                            </div>
                          </td>
                          <td className="product-price">{(item.price * item.quantity).toFixed(2)} MDL</td>
                          <td>
                            <button className="remove-btn" onClick={() => removeItem(item.id)} aria-label="Șterge produsul">
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
                    disabled={isOrdering}
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
      </main>
      
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { submitPublicAction } from '@/lib/deviceId';
import TurnstileWidget from '@/components/TurnstileWidget';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORY_LABELS = {
  'prod-cafea': 'Cafea',
  'prod-migdale': 'Băuturi cu lapte de migdale',
  'prod-ceai': 'Ceai și infuzii',
  'prod-desert': 'Deserturi',
  'prod-micdejun': 'Mic dejun',
};

export default function TableOrderClient({ token }) {
  const [loading, setLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState(null);
  const [products, setProducts] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [humanVerified, setHumanVerified] = useState(false);
  const requestIdRef = useRef(null);

  const loadMenu = useCallback(async () => {
    if (!UUID_PATTERN.test(token)) {
      setErrorMessage('Codul QR nu este valid. Solicită un cod nou personalului.');
      setLoading(false);
      return;
    }

    const [contextResult, productsResult] = await Promise.all([
      supabase.rpc('get_table_order_context', { p_token: token }),
      supabase
        .from('products')
        .select('id,name,price,category,description,image,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (contextResult.error || !contextResult.data?.[0]) {
      setErrorMessage('Sesiunea acestei mese este închisă. Solicită un cod QR nou personalului.');
    } else if (productsResult.error) {
      setErrorMessage('Meniul nu poate fi încărcat momentan. Încearcă din nou.');
    } else {
      setTableNumber(contextResult.data[0].table_number);
      setProducts(productsResult.data || []);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const cartRows = useMemo(() => products
    .filter((product) => Number(quantities[product.id] || 0) > 0)
    .map((product) => ({ ...product, quantity: Number(quantities[product.id]) })),
  [products, quantities]);

  const cartQuantity = useMemo(() => cartRows.reduce(
    (sum, product) => sum + product.quantity,
    0,
  ), [cartRows]);

  const estimatedTotal = useMemo(() => cartRows.reduce(
    (sum, product) => sum + Number(product.price) * product.quantity,
    0,
  ), [cartRows]);

  const changeQuantity = (productId, delta) => {
    requestIdRef.current = null;
    setQuantities((current) => {
      const nextQuantity = Math.max(0, Math.min(20, Number(current[productId] || 0) + delta));
      return { ...current, [productId]: nextQuantity };
    });
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    if (submitting || cartRows.length === 0) return;

    setSubmitting(true);
    setErrorMessage('');
    if (!humanVerified && !turnstileToken) {
      setErrorMessage('Confirmă verificarea anti-spam înainte de a trimite prima comandă.');
      setSubmitting(false);
      return;
    }
    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();

    const orderSnapshot = cartRows.map((product) => ({
      product_id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: product.quantity,
    }));

    try {
      const data = await submitPublicAction('table-order', {
        token,
        requestId: requestIdRef.current,
        items: orderSnapshot.map(({ product_id: productId, quantity }) => ({
          product_id: productId,
          quantity,
        })),
        notes: notes.trim() || null,
        turnstileToken,
      });
      if (!data?.[0]) throw new Error('submission_failed');

      setReceipt({
        orderNumber: data[0].order_number,
        total: Number(data[0].total),
        items: orderSnapshot,
      });
      setHumanVerified(true);
      setQuantities({});
      setNotes('');
      requestIdRef.current = null;
    } catch (error) {
      setErrorMessage(error.code === 'rate_limited'
        ? 'Au fost trimise prea multe comenzi. Solicită ajutorul personalului.'
        : error.message || 'Comanda nu a putut fi trimisă. Verifică sesiunea și încearcă din nou.');
    } finally {
      if (!humanVerified) {
        setTurnstileToken('');
        setTurnstileResetKey((value) => value + 1);
      }
      setSubmitting(false);
    }
  };

  const groupedProducts = useMemo(() => products.reduce((groups, product) => {
    const category = product.category || 'alte-produse';
    if (!groups[category]) groups[category] = [];
    groups[category].push(product);
    return groups;
  }, {}), [products]);

  if (loading) {
    return <div className="table-order-page header-padded"><p className="table-order-state">Se încarcă meniul…</p></div>;
  }

  if (!tableNumber) {
    return (
      <div className="table-order-page header-padded">
        <section className="table-order-invalid">
          <p>Comandă la masă</p>
          <h1>Cod indisponibil</h1>
          <span>{errorMessage}</span>
          <button type="button" onClick={loadMenu}>Încearcă din nou</button>
        </section>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="table-order-page header-padded">
        <section className="table-order-receipt">
          <p>Comanda a fost trimisă</p>
          <h1>ART-{receipt.orderNumber}</h1>
          <span>Masa {tableNumber}</span>
          <div className="table-order-receipt-items">
            {receipt.items.map((item) => (
              <div key={item.product_id}>
                <span>{item.name} × {item.quantity}</span>
                <strong>{(item.price * item.quantity).toFixed(2)} MDL</strong>
              </div>
            ))}
          </div>
          <div className="table-order-receipt-total">
            <span>Total de plată</span>
            <strong>{receipt.total.toFixed(2)} MDL</strong>
          </div>
          <p className="table-order-screenshot">Fă o captură de ecran și păstrează numărul comenzii.</p>
          <div className="table-order-receipt-actions">
            <Link href="/comenzi-live" target="_blank">Vezi starea comenzii</Link>
            <button type="button" onClick={() => setReceipt(null)}>Comandă din nou</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="table-order-page header-padded">
      <header className="table-order-heading">
        <div><p>Comandă la masă</p><h1>Masa {tableNumber}</h1></div>
        <span>{cartQuantity} produse</span>
      </header>

      {errorMessage && <p className="form-status is-error" role="alert">{errorMessage}</p>}

      <form className="table-order-layout" onSubmit={submitOrder}>
        <div className="table-order-menu">
          {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
            <section key={category} className="table-order-category">
              <h2>{CATEGORY_LABELS[category] || 'Alte produse'}</h2>
              <div className="table-order-products">
                {categoryProducts.map((product) => {
                  const quantity = Number(quantities[product.id] || 0);
                  const imagePath = product.image?.startsWith('/') ? product.image : '';
                  return (
                    <article key={product.id} className={quantity > 0 ? 'is-selected' : ''}>
                      <div className="table-order-product-image">
                        {imagePath ? (
                          <Image
                            src={imagePath}
                            alt=""
                            width={160}
                            height={120}
                            sizes="80px"
                          />
                        ) : (
                          <span aria-hidden="true">{product.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div>
                        <h3>{product.name}</h3>
                        {product.description && <p>{product.description}</p>}
                        <strong>{Number(product.price).toFixed(2)} MDL</strong>
                      </div>
                      <div className="table-order-quantity">
                        <button type="button" onClick={() => changeQuantity(product.id, -1)} disabled={quantity === 0} aria-label={`Scade ${product.name}`}>−</button>
                        <span>{quantity}</span>
                        <button type="button" onClick={() => changeQuantity(product.id, 1)} disabled={quantity >= 20} aria-label={`Adaugă ${product.name}`}>+</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="table-order-cart">
          <h2>Comanda ta</h2>
          {cartRows.length === 0 ? (
            <p className="table-order-cart-empty">Alege produsele din meniu.</p>
          ) : (
            <div className="table-order-cart-items">
              {cartRows.map((product) => (
                <div key={product.id}>
                  <span>{product.name} × {product.quantity}</span>
                  <strong>{(Number(product.price) * product.quantity).toFixed(2)} MDL</strong>
                </div>
              ))}
            </div>
          )}
          <label>
            Notă pentru bucătărie
            <textarea
              rows="3"
              maxLength="500"
              value={notes}
              onChange={(event) => {
                requestIdRef.current = null;
                setNotes(event.target.value);
              }}
              placeholder="Opțional"
            />
          </label>
          <div className="table-order-total"><span>Total</span><strong>{estimatedTotal.toFixed(2)} MDL</strong></div>
          {!humanVerified && (
            <TurnstileWidget
              action="table_order"
              onTokenChange={setTurnstileToken}
              resetKey={turnstileResetKey}
            />
          )}
          <button type="submit" disabled={cartRows.length === 0 || submitting}>
            {submitting ? 'Se trimite…' : 'Trimite comanda'}
          </button>
          <small>Prețul final este verificat în sistem înainte de creare.</small>
        </aside>
      </form>
    </div>
  );
}

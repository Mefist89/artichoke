'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const STATUS_LABELS = {
  pending: 'Nouă',
  processing: 'În pregătire',
  completed: 'Finalizată',
  executed: 'Executată',
  cancelled: 'Anulată',
};

function formatDate(value) {
  return new Intl.DateTimeFormat('ro-MD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatOrderNumber(order) {
  return order?.order_number ? `ART-${order.order_number}` : '';
}

export default function OrderVerificationClient() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        router.replace('/login');
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc('is_current_user_admin');
      if (adminError || !isAdmin) {
        router.replace('/profile');
        return;
      }

      if (active) setCheckingAccess(false);
    };

    verifyAccess();
    return () => {
      active = false;
    };
  }, [router]);

  const totals = useMemo(() => {
    if (!order) return { quantity: 0, amount: 0 };
    return {
      quantity: order.order_items?.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      ) || 0,
      amount: Number(order.total || 0),
    };
  }, [order]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSearching(true);
    setErrorMessage('');
    setOrder(null);

    const formData = new FormData(event.currentTarget);
    const rawNumber = String(formData.get('orderNumber') || '').trim().toUpperCase();
    const match = rawNumber.match(/^(?:ART[-\s]?)?(\d{1,12})$/);

    if (!match) {
      setErrorMessage('Introdu un număr valid, de exemplu ART-100001.');
      setSearching(false);
      return;
    }

    const { data, error } = await supabase
      .from('orders')
      .select('id,order_number,total,status,notes,created_at,order_items(product_name,price,quantity)')
      .eq('order_number', Number(match[1]))
      .maybeSingle();

    if (error) {
      setErrorMessage(
        error.code === '42703'
          ? 'Verificarea comenzilor nu este încă activată în Supabase.'
          : 'Comanda nu a putut fi verificată. Încearcă din nou.',
      );
    } else if (!data) {
      setErrorMessage('Nu a fost găsită nicio comandă cu acest număr.');
    } else {
      setOrder(data);
    }

    setSearching(false);
  };

  if (checkingAccess) {
    return (
      <div className="order-verification-page header-padded">
        <p className="dashboard-loading">Se verifică accesul…</p>
      </div>
    );
  }

  return (
    <div className="order-verification-page header-padded">
      <section className="order-verification-shell">
        <header className="order-verification-heading">
          <p className="section-kicker">Administrare</p>
          <h1>Verifică comanda</h1>
          <p>Introdu numărul primit pentru a vedea produsele și totalul de plată.</p>
        </header>

        <form className="order-verification-form" onSubmit={handleSubmit}>
          <label htmlFor="orderNumber">Numărul comenzii</label>
          <div>
            <input
              id="orderNumber"
              name="orderNumber"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="ART-100001"
              maxLength="16"
              required
              disabled={searching}
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Se verifică…' : 'Verifică'}
            </button>
          </div>
        </form>

        {errorMessage && <p className="form-status is-error" role="alert">{errorMessage}</p>}

        {order && (
          <article className="order-verification-result">
            <header>
              <p>Comanda</p>
              <h2>{formatOrderNumber(order)}</h2>
              <span>{formatDate(order.created_at)} · {STATUS_LABELS[order.status] || order.status}</span>
            </header>

            <div className="dashboard-report-table-wrap">
              <table className="dashboard-report-table">
                <thead>
                  <tr>
                    <th>Nr.</th>
                    <th>Produs</th>
                    <th>Preț unitar</th>
                    <th>Cantitate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items?.map((item, index) => (
                    <tr key={`${item.product_name}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.product_name}</td>
                      <td>{Number(item.price).toFixed(2)} MDL</td>
                      <td>{item.quantity}</td>
                      <td>{(Number(item.price) * item.quantity).toFixed(2)} MDL</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan="2">Total de plată</th>
                    <th aria-hidden="true"></th>
                    <th>{totals.quantity}</th>
                    <th>{totals.amount.toFixed(2)} MDL</th>
                  </tr>
                </tfoot>
              </table>
            </div>
            {order.notes && <p className="dashboard-report-note"><strong>Notă:</strong> {order.notes}</p>}
          </article>
        )}
      </section>
    </div>
  );
}

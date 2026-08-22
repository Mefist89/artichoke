'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const EMPTY_PRODUCT = {
  id: '',
  name: '',
  price: '',
  category: 'prod-cafea',
  description: '',
  image: '',
  active: true,
  sort_order: 0,
};

const TABS = [
  ['products', 'Produse'],
  ['orders', 'Comenzi'],
  ['reservations', 'Rezervări'],
  ['reports', 'Rapoarte'],
];

const CATEGORY_OPTIONS = [
  ['prod-cafea', 'Cafea'],
  ['prod-migdale', 'Lapte de migdale'],
  ['prod-ceai', 'Ceai și infuzii'],
  ['prod-desert', 'Deserturi'],
  ['prod-micdejun', 'Mic dejun'],
];

const ORDER_STATUS = [
  ['pending', 'Nouă'],
  ['processing', 'În pregătire'],
  ['completed', 'Finalizată'],
];

const RESERVATION_STATUS = [
  ['pending', 'Nouă'],
  ['confirmed', 'Confirmată'],
  ['completed', 'Finalizată'],
];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ro-MD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function getOrderStatusLabel(status) {
  return ORDER_STATUS.find(([value]) => value === status)?.[1] || status;
}

function formatOrderNumber(order) {
  return order.order_number
    ? `ART-${order.order_number}`
    : `#${order.id.slice(0, 8).toUpperCase()}`;
}

function StatusSelect({ value, options, disabled, onChange, label }) {
  return (
    <select
      className={`dashboard-status status-${value}`}
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map(([status, text]) => (
        <option key={status} value={status}>{text}</option>
      ))}
    </select>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState('');
  const [reportMode, setReportMode] = useState('day');
  const [reportDay, setReportDay] = useState('');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');

  const loadDashboard = useCallback(async () => {
    setErrorMessage('');

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      router.replace('/login');
      return;
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_current_user_admin');
    if (adminError) {
      setErrorMessage('Panoul nu este încă activat în Supabase. Rulează migrarea pentru dashboard.');
      setLoading(false);
      return;
    }
    if (!isAdmin) {
      router.replace('/profile');
      return;
    }

    const [productsResult, ordersResult, reservationsResult] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,price,active,category,description,image,sort_order,updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('orders')
        .select('id,order_number,user_id,total,status,notes,created_at,updated_at,order_items(product_name,price,quantity)')
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select('id,name,phone,reservation_date,reservation_time,guests,zone,message,status,created_at')
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false }),
    ]);

    const firstError = [productsResult, ordersResult, reservationsResult]
      .find((result) => result.error)?.error;
    if (firstError) {
      setErrorMessage('Datele nu au putut fi încărcate. Verifică schema și încearcă din nou.');
    } else {
      setProducts(productsResult.data || []);
      setOrders(ordersResult.data || []);
      setReservations(reservationsResult.data || []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // Citirea inițială sincronizează interfața cu sesiunea și baza externă.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const today = toLocalDateKey(new Date());
    // Data este inițializată în browser pentru a respecta fusul orar local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportDay(today);
    setReportStart(today);
    setReportEnd(today);
  }, []);

  const reportOrders = useMemo(() => {
    const startDate = reportMode === 'day' ? reportDay : reportStart;
    const endDate = reportMode === 'day' ? reportDay : reportEnd;
    if (!startDate || !endDate || startDate > endDate) return [];

    return orders.filter((order) => {
      const orderDate = toLocalDateKey(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  }, [orders, reportDay, reportEnd, reportMode, reportStart]);

  const reportTotals = useMemo(() => reportOrders.reduce((totals, order) => ({
    orders: totals.orders + 1,
    quantity: totals.quantity + (order.order_items?.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    ) || 0),
    amount: totals.amount + Number(order.total || 0),
  }), { orders: 0, quantity: 0, amount: 0 }), [reportOrders]);

  const counts = useMemo(() => ({
    products: products.length,
    orders: orders.filter((item) => item.status === 'pending').length,
    reservations: reservations.filter((item) => item.status === 'pending').length,
    reports: orders.length,
  }), [orders, products, reservations]);

  const resetProductForm = () => {
    setEditingId('');
    setProductForm(EMPTY_PRODUCT);
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setProductForm({
      ...product,
      price: String(product.price),
      image: product.image || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setNotice('');

    const { error } = await supabase.rpc('admin_upsert_product', {
      p_id: productForm.id,
      p_name: productForm.name,
      p_price: Number(productForm.price),
      p_category: productForm.category,
      p_description: productForm.description,
      p_image: productForm.image || null,
      p_active: productForm.active,
      p_sort_order: Number(productForm.sort_order),
    });

    if (error) {
      setErrorMessage('Produsul nu a fost salvat. Verifică toate câmpurile.');
    } else {
      setNotice(editingId ? 'Produsul a fost actualizat.' : 'Produsul a fost adăugat.');
      resetProductForm();
      await loadDashboard();
    }
    setSaving(false);
  };

  const updateStatus = async (kind, id, status) => {
    const rpcByKind = {
      order: ['admin_update_order_status', 'p_order_id'],
      reservation: ['admin_update_reservation_status', 'p_reservation_id'],
    };
    const [rpcName, idParameter] = rpcByKind[kind];
    setBusyId(id);
    setErrorMessage('');
    setNotice('');
    const { error } = await supabase.rpc(rpcName, { [idParameter]: id, p_status: status });
    if (error) {
      setErrorMessage('Starea nu a putut fi modificată. Încearcă din nou.');
    } else {
      setNotice('Starea a fost actualizată.');
      await loadDashboard();
    }
    setBusyId('');
  };

  if (loading) {
    return <div className="dashboard-page header-padded"><p className="dashboard-loading">Se încarcă panoul…</p></div>;
  }

  return (
    <div className="dashboard-page header-padded">
      <section className="dashboard-shell">
        <header className="dashboard-heading">
          <div>
            <p className="section-kicker">Administrare securizată</p>
            <h1>Panoul magazinului</h1>
            <p>Produse, comenzi, rezervări și rapoarte într-un singur loc.</p>
          </div>
          <div className="dashboard-heading-actions">
            <Link
              href="/comenzi-live"
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-board-link"
            >
              Ecran comenzi
            </Link>
            <Link
              href="/verifica-comanda"
              target="_blank"
              rel="noopener noreferrer"
              className="dashboard-verify-link"
            >
              Verifică comanda
            </Link>
            <button type="button" className="dashboard-refresh" onClick={loadDashboard}>Reîncarcă</button>
          </div>
        </header>

        {errorMessage && <p className="form-status is-error" role="alert">{errorMessage}</p>}
        {notice && <p className="form-status is-success" role="status">{notice}</p>}

        <div className="dashboard-tabs" role="tablist" aria-label="Secțiuni administrare">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? 'is-active' : ''}
              onClick={() => setActiveTab(id)}
            >
              {label}<span>{counts[id]}</span>
            </button>
          ))}
        </div>

        {activeTab === 'products' && (
          <div className="dashboard-products">
            <form className="dashboard-product-form" onSubmit={saveProduct}>
              <div className="dashboard-section-title">
                <div><h2>{editingId ? 'Modifică produsul' : 'Produs nou'}</h2><p>Prețul introdus aici devine prețul oficial din magazin.</p></div>
                {editingId && <button type="button" className="dashboard-link-button" onClick={resetProductForm}>Anulează</button>}
              </div>
              <div className="dashboard-form-grid">
                <label>ID produs<input required maxLength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={Boolean(editingId)} value={productForm.id} onChange={(e) => setProductForm({ ...productForm, id: e.target.value.toLowerCase() })} placeholder="ex: espresso-dublu" /></label>
                <label>Denumire<input required minLength="2" maxLength="100" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
                <label>Preț (MDL)<input required type="number" min="0.01" max="100000" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label>
                <label>Categorie<select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>{CATEGORY_OPTIONS.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
                <label>Ordine<input required type="number" min="0" max="9999" value={productForm.sort_order} onChange={(e) => setProductForm({ ...productForm, sort_order: e.target.value })} /></label>
                <label>Cale imagine<input maxLength="255" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} placeholder="/img/cofe/produs.jpg" /></label>
                <label className="dashboard-description">Descriere<textarea maxLength="1000" rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
                <label className="dashboard-checkbox"><input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })} />Produs activ și vizibil în meniu</label>
              </div>
              <button type="submit" className="dashboard-primary" disabled={saving}>{saving ? 'Se salvează…' : 'Salvează produsul'}</button>
            </form>

            <div className="dashboard-table-wrap">
              <table className="dashboard-table">
                <thead><tr><th>Produs</th><th>Categorie</th><th>Preț</th><th>Vizibilitate</th><th></th></tr></thead>
                <tbody>{products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.id}</small></td><td>{CATEGORY_OPTIONS.find(([id]) => id === product.category)?.[1] || product.category}</td><td>{Number(product.price).toFixed(2)} MDL</td><td><span className={`dashboard-badge ${product.active ? 'is-active' : 'is-inactive'}`}>{product.active ? 'Activ' : 'Ascuns'}</span></td><td><button type="button" className="dashboard-edit" onClick={() => editProduct(product)}>Modifică</button></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="dashboard-card-list is-compact">
            {orders.length === 0 ? (
              <p className="dashboard-empty">Nu există comenzi.</p>
            ) : orders.map((order) => {
              const itemCount = order.order_items?.reduce(
                (total, item) => total + Number(item.quantity || 0),
                0,
              ) || 0;

              return (
                <article key={order.id} className="dashboard-record dashboard-record-compact">
                  <div className="dashboard-record-head dashboard-compact-head">
                    <div className="dashboard-compact-title">
                      <span className="dashboard-record-code">{formatOrderNumber(order)}</span>
                      <div>
                        <h2>{Number(order.total).toFixed(2)} MDL</h2>
                        <p>{formatDate(order.created_at)} · {itemCount} produse</p>
                      </div>
                    </div>
                    <StatusSelect
                      value={order.status}
                      options={ORDER_STATUS}
                      disabled={busyId === order.id}
                      label="Starea comenzii"
                      onChange={(status) => updateStatus('order', order.id, status)}
                    />
                  </div>
                  <details className="dashboard-details">
                    <summary>Detalii comandă</summary>
                    <div className="dashboard-details-body">
                      <ul className="dashboard-items">
                        {order.order_items?.map((item, index) => (
                          <li key={`${item.product_name}-${index}`}>
                            <span>{item.product_name} × {item.quantity}</span>
                            <strong>{(Number(item.price) * item.quantity).toFixed(2)} MDL</strong>
                          </li>
                        ))}
                      </ul>
                      {order.notes && <p className="dashboard-note"><strong>Notă:</strong> {order.notes}</p>}
                    </div>
                  </details>
                </article>
              );
            })}
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="dashboard-card-list is-compact">
            {reservations.length === 0 ? (
              <p className="dashboard-empty">Nu există rezervări.</p>
            ) : reservations.map((reservation) => (
              <article key={reservation.id} className="dashboard-record dashboard-record-compact">
                <div className="dashboard-record-head dashboard-compact-head">
                  <div className="dashboard-compact-title">
                    <span className="dashboard-record-date">{reservation.reservation_date}</span>
                    <div>
                      <h2>{reservation.name}</h2>
                      <p>{reservation.reservation_time.slice(0, 5)} · {reservation.guests} persoane</p>
                    </div>
                  </div>
                  <StatusSelect
                    value={reservation.status}
                    options={RESERVATION_STATUS}
                    disabled={busyId === reservation.id}
                    label="Starea rezervării"
                    onChange={(status) => updateStatus('reservation', reservation.id, status)}
                  />
                </div>
                <details className="dashboard-details">
                  <summary>Detalii rezervare</summary>
                  <div className="dashboard-details-body">
                    <div className="dashboard-record-details">
                      <span>Telefon: <a href={`tel:${reservation.phone}`}>{reservation.phone}</a></span>
                      <span>Zona: {reservation.zone}</span>
                    </div>
                    {reservation.message && <p className="dashboard-note">{reservation.message}</p>}
                  </div>
                </details>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="dashboard-reports">
            <div className="dashboard-report-toolbar">
              <div className="dashboard-report-mode" aria-label="Tip raport">
                <button
                  type="button"
                  className={reportMode === 'day' ? 'is-active' : ''}
                  aria-pressed={reportMode === 'day'}
                  onClick={() => setReportMode('day')}
                >
                  Raport pe zi
                </button>
                <button
                  type="button"
                  className={reportMode === 'period' ? 'is-active' : ''}
                  aria-pressed={reportMode === 'period'}
                  onClick={() => setReportMode('period')}
                >
                  Raport pe perioadă
                </button>
              </div>

              <div className="dashboard-report-dates">
                {reportMode === 'day' ? (
                  <label>
                    Ziua
                    <input
                      type="date"
                      value={reportDay}
                      onChange={(event) => setReportDay(event.target.value)}
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      De la
                      <input
                        type="date"
                        value={reportStart}
                        max={reportEnd || undefined}
                        onChange={(event) => setReportStart(event.target.value)}
                      />
                    </label>
                    <label>
                      Până la
                      <input
                        type="date"
                        value={reportEnd}
                        min={reportStart || undefined}
                        onChange={(event) => setReportEnd(event.target.value)}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="dashboard-report-summary" aria-label="Totaluri raport">
              <div><span>Comenzi</span><strong>{reportTotals.orders}</strong></div>
              <div><span>Produse</span><strong>{reportTotals.quantity}</strong></div>
              <div><span>Valoare totală</span><strong>{reportTotals.amount.toFixed(2)} MDL</strong></div>
            </div>

            {reportMode === 'period' && reportStart > reportEnd ? (
              <p className="dashboard-empty">Data de început trebuie să fie înaintea datei de sfârșit.</p>
            ) : reportOrders.length === 0 ? (
              <p className="dashboard-empty">Nu există comenzi pentru data selectată.</p>
            ) : (
              <div className="dashboard-report-orders">
                {reportOrders.map((order) => {
                  const orderQuantity = order.order_items?.reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0,
                  ) || 0;

                  return (
                    <article key={order.id} className="dashboard-report-order">
                      <header className="dashboard-report-order-head">
                        <p>Comanda</p>
                        <h2>{formatOrderNumber(order)}</h2>
                        <span>{formatDate(order.created_at)} · {getOrderStatusLabel(order.status)}</span>
                      </header>

                      <div className="dashboard-report-table-wrap">
                        <table className="dashboard-report-table">
                          <thead>
                            <tr>
                              <th>Nr.</th>
                              <th>Produs</th>
                              <th>Cantitate</th>
                              <th>Preț unitar</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.order_items?.map((item, index) => (
                              <tr key={`${item.product_name}-${index}`}>
                                <td>{index + 1}</td>
                                <td>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>{Number(item.price).toFixed(2)} MDL</td>
                                <td>{(Number(item.price) * item.quantity).toFixed(2)} MDL</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th colSpan="2">Total de plată</th>
                              <th>{orderQuantity}</th>
                              <th aria-hidden="true"></th>
                              <th>{Number(order.total).toFixed(2)} MDL</th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {order.notes && <p className="dashboard-report-note"><strong>Notă:</strong> {order.notes}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import ReservationsPanel from '@/components/ReservationsPanel';

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
  ['tables', 'Mese'],
  ['reservations', 'Rezervări'],
  ['reports', 'Rapoarte'],
  ['audit', 'Jurnal'],
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
  ['executed', 'Executată'],
];

const AUDIT_ACTION_LABELS = {
  product_created: 'Produs creat',
  product_updated: 'Produs modificat',
  product_price_changed: 'Preț modificat',
  order_status_changed: 'Stare comandă modificată',
  table_opened: 'Masă deschisă',
  table_closed: 'Masă închisă',
  table_expired: 'Sesiune expirată automat',
  table_qr_rotated: 'Cod QR înlocuit',
};

const AUDIT_FIELD_LABELS = {
  name: 'Denumire',
  price: 'Preț',
  active: 'Activ',
  category: 'Categorie',
  order_number: 'Comandă',
  status: 'Stare',
  table_number: 'Masă',
  opened_at: 'Deschisă la',
  expires_at: 'Expiră la',
  closed_at: 'Închisă la',
  qr_replaced: 'QR înlocuit',
};

const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const ADMIN_ACTIVITY_STORAGE_KEY = 'artichoke_admin_last_activity';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ro-MD', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ro-MD', {
    hour: '2-digit',
    minute: '2-digit',
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

function formatAuditValue(field, value) {
  if (value === null || value === undefined) return '—';
  if (field === 'price') return `${Number(value).toFixed(2)} MDL`;
  if (field === 'active' || field === 'qr_replaced') return value ? 'Da' : 'Nu';
  if (field === 'status') return getOrderStatusLabel(value);
  if (field.endsWith('_at')) return formatDate(value);
  if (field === 'order_number') return `ART-${value}`;
  return String(value);
}

function getAuditEntity(log) {
  if (log.entity_type === 'products') {
    return log.new_value?.name || log.old_value?.name || log.entity_id;
  }
  if (log.entity_type === 'orders') {
    const number = log.new_value?.order_number || log.old_value?.order_number;
    return number ? `ART-${number}` : `Comandă ${log.entity_id.slice(0, 8)}`;
  }
  if (log.entity_type === 'table_sessions') {
    const tableNumber = log.new_value?.table_number || log.old_value?.table_number;
    return `Masa ${tableNumber || '—'}`;
  }
  return log.entity_id;
}

function AuditSnapshot({ title, value }) {
  if (!value) return <div className="dashboard-audit-snapshot is-empty"><span>{title}</span><em>—</em></div>;
  return (
    <div className="dashboard-audit-snapshot">
      <span>{title}</span>
      <dl>
        {Object.entries(value).map(([field, fieldValue]) => (
          <div key={field}>
            <dt>{AUDIT_FIELD_LABELS[field] || field}</dt>
            <dd>{formatAuditValue(field, fieldValue)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
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

function OrderRecord({ order, busyId, onStatusChange }) {
  const itemCount = order.order_items?.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  ) || 0;

  return (
    <article className="dashboard-record dashboard-record-compact">
      <div className="dashboard-record-head dashboard-compact-head">
        <div className="dashboard-compact-title">
          <span className="dashboard-record-code">{formatOrderNumber(order)}</span>
          <div>
            <h2>{Number(order.total).toFixed(2)} MDL</h2>
            <p>{formatDate(order.created_at)} · {itemCount} produse{order.table_number ? ` · Masa ${order.table_number}` : ''}</p>
          </div>
        </div>
        <StatusSelect
          value={order.status}
          options={ORDER_STATUS}
          disabled={busyId === order.id}
          label="Starea comenzii"
          onChange={(status) => onStatusChange(order.id, status)}
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
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState('');
  const [reportMode, setReportMode] = useState('day');
  const [reportDay, setReportDay] = useState('');
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [exportingReport, setExportingReport] = useState('');
  const [manualProductId, setManualProductId] = useState('');
  const [manualQuantity, setManualQuantity] = useState(1);
  const [manualOrderItems, setManualOrderItems] = useState([]);
  const [manualOrderNotes, setManualOrderNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [qrTable, setQrTable] = useState(null);
  const [siteOrigin, setSiteOrigin] = useState('');

  const expireAdminSession = useCallback(async () => {
    window.localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
    await supabase.auth.signOut();
    router.replace('/login?reason=inactive');
    router.refresh();
  }, [router]);

  useEffect(() => {
    let timeoutId;
    let lastStorageWrite = 0;

    const scheduleExpiration = () => {
      window.clearTimeout(timeoutId);
      const storedActivity = Number(window.localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY));
      const lastActivity = Number.isFinite(storedActivity) && storedActivity > 0
        ? storedActivity
        : Date.now();
      const remaining = ADMIN_INACTIVITY_LIMIT_MS - (Date.now() - lastActivity);

      if (remaining <= 0) {
        void expireAdminSession();
        return;
      }

      timeoutId = window.setTimeout(() => void expireAdminSession(), remaining);
    };

    const markActivity = () => {
      const now = Date.now();
      if (now - lastStorageWrite >= 15_000) {
        window.localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(now));
        lastStorageWrite = now;
      }
      scheduleExpiration();
    };

    const checkVisibility = () => {
      if (document.visibilityState === 'visible') scheduleExpiration();
    };

    if (!window.localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)) {
      window.localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(Date.now()));
    }
    scheduleExpiration();

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });
    window.addEventListener('storage', scheduleExpiration);
    document.addEventListener('visibilitychange', checkVisibility);

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActivity);
      });
      window.removeEventListener('storage', scheduleExpiration);
      document.removeEventListener('visibilitychange', checkVisibility);
    };
  }, [expireAdminSession]);

  const loadDashboard = useCallback(async () => {
    setErrorMessage('');

    const lastActivity = Number(window.localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY));
    if (Number.isFinite(lastActivity)
      && lastActivity > 0
      && Date.now() - lastActivity >= ADMIN_INACTIVITY_LIMIT_MS) {
      await expireAdminSession();
      return;
    }

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

    const securitySince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [productsResult, ordersResult, reservationsResult, tablesResult, securityResult, auditResult] = await Promise.all([
      supabase
        .from('products')
        .select('id,name,price,active,category,description,image,sort_order,updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('orders')
        .select('id,order_number,user_id,total,status,notes,table_number,table_session_id,created_at,updated_at,order_items(product_name,price,quantity)')
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select('id,reservation_number,name,phone,reservation_date,reservation_time,guests,zone,message,table_number,duration_minutes,table_session_id,status,created_at,updated_at')
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false }),
      supabase.rpc('admin_get_tables'),
      supabase
        .from('security_events')
        .select('id,action,outcome,reason,created_at')
        .in('outcome', ['blocked', 'turnstile_failed'])
        .gte('created_at', securitySince)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('admin_audit_log')
        .select('id,actor_user_id,actor_email,action,entity_type,entity_id,old_value,new_value,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    const firstError = [productsResult, ordersResult, reservationsResult, tablesResult, securityResult, auditResult]
      .find((result) => result.error)?.error;
    if (firstError) {
      setErrorMessage('Datele nu au putut fi încărcate. Verifică schema și încearcă din nou.');
    } else {
      setProducts(productsResult.data || []);
      setOrders(ordersResult.data || []);
      setReservations(reservationsResult.data || []);
      setTables(tablesResult.data || []);
      setSecurityEvents(securityResult.data || []);
      setAuditLogs(auditResult.data || []);
    }
    setLoading(false);
  }, [expireAdminSession, router]);

  useEffect(() => {
    // Citirea inițială sincronizează interfața cu sesiunea și baza externă.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadDashboard]);

  useEffect(() => {
    const today = toLocalDateKey(new Date());
    // Data este inițializată în browser pentru a respecta fusul orar local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReportDay(today);
    setReportStart(today);
    setReportEnd(today);
  }, []);

  useEffect(() => {
    // Originea este disponibilă doar în browser și este inclusă în QR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSiteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!qrTable?.expires_at) return undefined;
    const remaining = new Date(qrTable.expires_at).getTime() - Date.now();
    if (remaining <= 0) {
      const expiredTimer = window.setTimeout(() => {
        setQrTable(null);
        setNotice('Sesiunea QR a expirat. Deschide o sesiune nouă pentru masă.');
      }, 0);
      return () => window.clearTimeout(expiredTimer);
    }

    const expiryTimer = window.setTimeout(() => {
      setQrTable(null);
      setNotice('Sesiunea QR a expirat. Deschide o sesiune nouă pentru masă.');
    }, remaining);
    return () => window.clearTimeout(expiryTimer);
  }, [qrTable]);

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

  const downloadReport = async (format) => {
    if (reportOrders.length === 0 || exportingReport) return;

    setExportingReport(format);
    setErrorMessage('');
    setNotice('');

    try {
      const reportExport = await import('@/lib/reportExport');
      const report = {
        orders: reportOrders,
        mode: reportMode,
        day: reportDay,
        start: reportStart,
        end: reportEnd,
      };

      if (format === 'pdf') {
        await reportExport.exportReportPdf(report);
      } else {
        await reportExport.exportReportExcel(report);
      }

      setNotice(`Raportul ${format.toUpperCase()} a fost descărcat.`);
    } catch (error) {
      console.error('Report export failed:', error);
      setErrorMessage('Raportul nu a putut fi generat. Încearcă din nou.');
    } finally {
      setExportingReport('');
    }
  };

  const manualOrderRows = useMemo(() => manualOrderItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.product_id);
    return product ? { ...item, product } : null;
  }).filter(Boolean), [manualOrderItems, products]);

  const manualOrderTotal = useMemo(() => manualOrderRows.reduce(
    (total, item) => total + Number(item.product.price) * item.quantity,
    0,
  ), [manualOrderRows]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'executed'),
    [orders],
  );

  const archivedOrders = useMemo(
    () => orders.filter((order) => order.status === 'executed'),
    [orders],
  );

  const tableQrUrl = useMemo(() => (
    qrTable?.token && siteOrigin ? `${siteOrigin}/masa/${qrTable.token}` : ''
  ), [qrTable, siteOrigin]);

  const counts = useMemo(() => ({
    products: products.length,
    orders: activeOrders.length,
    tables: tables.filter((table) => table.session_id).length,
    reservations: reservations.filter((item) => item.status === 'pending').length,
    reports: orders.length,
    audit: auditLogs.length,
  }), [activeOrders.length, auditLogs.length, orders.length, products.length, reservations, tables]);

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

  const addManualOrderItem = () => {
    const quantity = Number(manualQuantity);
    const product = products.find((item) => item.id === manualProductId && item.active);
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      setErrorMessage('Alege un produs activ și o cantitate validă.');
      return;
    }

    setErrorMessage('');
    setManualOrderItems((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      if (!existing) return [...current, { product_id: product.id, quantity }];
      return current.map((item) => item.product_id === product.id
        ? { ...item, quantity: Math.min(99, item.quantity + quantity) }
        : item);
    });
    setManualProductId('');
    setManualQuantity(1);
  };

  const updateManualOrderQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1 || nextQuantity > 99) return;
    setManualOrderItems((current) => current.map((item) => item.product_id === productId
      ? { ...item, quantity: nextQuantity }
      : item));
  };

  const createManualOrder = async (event) => {
    event.preventDefault();
    if (manualOrderItems.length === 0 || creatingOrder) return;

    setCreatingOrder(true);
    setErrorMessage('');
    setNotice('');

    const { data: orderNumber, error } = await supabase.rpc('admin_create_order', {
      p_items: manualOrderItems,
      p_notes: manualOrderNotes.trim() || null,
    });

    if (error) {
      setErrorMessage('Comanda nu a putut fi creată. Verifică produsele și încearcă din nou.');
    } else {
      setManualOrderItems([]);
      setManualOrderNotes('');
      setNotice(`Comanda ART-${orderNumber} a fost creată.`);
      await loadDashboard();
    }
    setCreatingOrder(false);
  };

  const openTableSession = async (tableNumber) => {
    setBusyId(`table-${tableNumber}`);
    setErrorMessage('');
    setNotice('');

    const { data, error } = await supabase.rpc('admin_open_table_session', {
      p_table_number: tableNumber,
    });

    if (error || !data?.[0]?.token) {
      setErrorMessage('Sesiunea mesei nu a putut fi deschisă. Verifică migrarea Supabase.');
    } else {
      setQrTable({
        table_number: tableNumber,
        token: data[0].token,
        opened_at: data[0].opened_at,
        expires_at: data[0].expires_at,
      });
      setNotice(`Sesiunea pentru masa ${tableNumber} este activă.`);
      await loadDashboard();
    }
    setBusyId('');
  };

  const rotateTableSession = async (tableNumber) => {
    if (!window.confirm(`Creezi un QR nou pentru masa ${tableNumber}? Codul vechi nu va mai funcționa.`)) return;

    setBusyId(`table-${tableNumber}`);
    setErrorMessage('');
    setNotice('');

    const { data, error } = await supabase.rpc('admin_rotate_table_session', {
      p_table_number: tableNumber,
    });

    if (error || !data?.[0]?.token) {
      setErrorMessage('Codul QR nu a putut fi înlocuit. Sesiunea poate fi expirată.');
    } else {
      setQrTable({
        table_number: tableNumber,
        token: data[0].token,
        opened_at: data[0].opened_at,
        expires_at: data[0].expires_at,
      });
      setNotice(`A fost creat un QR nou pentru masa ${tableNumber}.`);
      await loadDashboard();
    }
    setBusyId('');
  };

  const closeTableSession = async (tableNumber) => {
    if (!window.confirm(`Închizi sesiunea pentru masa ${tableNumber}?`)) return;

    setBusyId(`table-${tableNumber}`);
    setErrorMessage('');
    setNotice('');

    const { error } = await supabase.rpc('admin_close_table_session', {
      p_table_number: tableNumber,
    });

    if (error) {
      setErrorMessage('Masa are comenzi nefinalizate sau sesiunea nu mai este activă.');
    } else {
      if (qrTable?.table_number === tableNumber) setQrTable(null);
      setNotice(`Sesiunea pentru masa ${tableNumber} a fost închisă.`);
      await loadDashboard();
    }
    setBusyId('');
  };

  const copyTableLink = async () => {
    if (!tableQrUrl) return;
    try {
      await navigator.clipboard.writeText(tableQrUrl);
      setNotice('Linkul mesei a fost copiat.');
    } catch {
      setErrorMessage('Linkul nu a putut fi copiat automat.');
    }
  };

  const updateStatus = async (kind, id, status) => {
    const rpcByKind = {
      order: ['admin_update_order_status', 'p_order_id'],
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
            <small className="dashboard-session-note">Sesiunea se închide după 30 de minute fără activitate.</small>
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
        {securityEvents.length > 0 && (
          <details className="dashboard-security-alert">
            <summary>
              Activitate suspectă detectată
              <span>{securityEvents.length} încercări blocate în ultimele 24 de ore</span>
            </summary>
            <ul>
              {securityEvents.slice(0, 10).map((event) => (
                <li key={event.id}>
                  <strong>{event.action === 'table_order' ? 'Comandă QR' : event.action === 'reservation' ? 'Rezervare' : 'Contact'}</strong>
                  <span>{event.outcome === 'turnstile_failed' ? 'Verificare anti-spam eșuată' : 'Limită de frecvență depășită'} · {formatDate(event.created_at)}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

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
          <div className="dashboard-orders">
            <details className="dashboard-manual-order">
              <summary>Creează o comandă</summary>
              <form className="dashboard-manual-order-form" onSubmit={createManualOrder}>
                <div className="dashboard-manual-picker">
                  <label>
                    Produs
                    <select value={manualProductId} onChange={(event) => setManualProductId(event.target.value)}>
                      <option value="">Alege produsul</option>
                      {products.filter((product) => product.active).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {Number(product.price).toFixed(2)} MDL
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Cantitate
                    <input type="number" min="1" max="99" step="1" value={manualQuantity} onChange={(event) => setManualQuantity(event.target.value)} />
                  </label>
                  <button type="button" className="dashboard-secondary" onClick={addManualOrderItem}>Adaugă</button>
                </div>

                {manualOrderRows.length === 0 ? (
                  <p className="dashboard-manual-empty">Adaugă cel puțin un produs în comandă.</p>
                ) : (
                  <div className="dashboard-manual-items">
                    {manualOrderRows.map(({ product_id: productId, quantity, product }) => (
                      <div key={productId} className="dashboard-manual-item">
                        <div><strong>{product.name}</strong><span>{Number(product.price).toFixed(2)} MDL / buc.</span></div>
                        <label>
                          <input aria-label={`Cantitate pentru ${product.name}`} type="number" min="1" max="99" step="1" value={quantity} onChange={(event) => updateManualOrderQuantity(productId, event.target.value)} />
                        </label>
                        <strong>{(Number(product.price) * quantity).toFixed(2)} MDL</strong>
                        <button type="button" className="dashboard-manual-remove" onClick={() => setManualOrderItems((current) => current.filter((item) => item.product_id !== productId))} aria-label={`Elimină ${product.name}`}>Elimină</button>
                      </div>
                    ))}
                  </div>
                )}

                <label className="dashboard-manual-notes">
                  Notă pentru comandă
                  <textarea rows="2" maxLength="500" value={manualOrderNotes} onChange={(event) => setManualOrderNotes(event.target.value)} placeholder="Opțional" />
                </label>

                <div className="dashboard-manual-footer">
                  <p>Total: <strong>{manualOrderTotal.toFixed(2)} MDL</strong></p>
                  <button type="submit" className="dashboard-primary" disabled={manualOrderItems.length === 0 || creatingOrder}>
                    {creatingOrder ? 'Se creează…' : 'Creează comanda'}
                  </button>
                </div>
              </form>
            </details>

            <details className="dashboard-order-archive">
              <summary>Comenzi arhivate <span>{archivedOrders.length}</span></summary>
              <div className="dashboard-card-list is-compact">
                {archivedOrders.length === 0 ? (
                  <p className="dashboard-empty">Arhiva este goală.</p>
                ) : archivedOrders.map((order) => (
                  <OrderRecord
                    key={order.id}
                    order={order}
                    busyId={busyId}
                    onStatusChange={(id, status) => updateStatus('order', id, status)}
                  />
                ))}
              </div>
            </details>

            <div className="dashboard-card-list is-compact">
            {activeOrders.length === 0 ? (
              <p className="dashboard-empty">Nu există comenzi.</p>
            ) : activeOrders.map((order) => (
              <OrderRecord
                key={order.id}
                order={order}
                busyId={busyId}
                onStatusChange={(id, status) => updateStatus('order', id, status)}
              />
            ))}
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <ReservationsPanel
            reservations={reservations}
            busyId={busyId}
            setBusyId={setBusyId}
            setErrorMessage={setErrorMessage}
            setNotice={setNotice}
            reload={loadDashboard}
            setQrTable={setQrTable}
          />
        )}

        {activeTab === 'tables' && (
          <section className="dashboard-tables">
            <div className="dashboard-tables-intro">
              <div>
                <h2>Comenzi la masă</h2>
                <p>Deschide o sesiune, arată QR-ul clientului și închide masa după finalizarea tuturor comenzilor.</p>
              </div>
              <span>{tables.filter((table) => table.session_id).length}/6 active</span>
            </div>

            <div className="dashboard-table-grid">
              {tables.map((table) => {
                const isActive = Boolean(table.session_id);
                const isBusy = busyId === `table-${table.table_number}`;
                return (
                  <article key={table.table_number} className={`dashboard-table-card ${isActive ? 'is-occupied' : 'is-free'}`}>
                    <button
                      type="button"
                      className="dashboard-table-main"
                      disabled={isBusy}
                      onClick={() => isActive
                        ? setQrTable({
                          table_number: table.table_number,
                          token: table.token,
                          opened_at: table.opened_at,
                          expires_at: table.expires_at,
                        })
                        : openTableSession(table.table_number)}
                    >
                      <span>Masa</span>
                      <strong>{table.table_number}</strong>
                      <small>{isActive ? 'Sesiune activă · Vezi QR' : 'Liberă · Deschide sesiunea'}</small>
                      {isActive && (
                        <time className="dashboard-table-session-time" dateTime={table.expires_at}>
                          Deschisă {formatTime(table.opened_at)} · expiră {formatTime(table.expires_at)}
                        </time>
                      )}
                    </button>

                    <div className="dashboard-table-meta">
                      <span>{Number(table.order_count || 0)} comenzi</span>
                      <span>{Number(table.open_order_count || 0)} în lucru</span>
                    </div>

                    {isActive && (
                      <div className="dashboard-table-actions">
                        <button type="button" className="dashboard-table-rotate" disabled={isBusy} onClick={() => rotateTableSession(table.table_number)}>QR nou</button>
                        <button type="button" className="dashboard-table-close" disabled={isBusy} onClick={() => closeTableSession(table.table_number)}>
                          {isBusy ? 'Se procesează…' : 'Închide sesiunea'}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
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

              <div className="dashboard-report-export-actions" aria-label="Descarcă raportul">
                <button
                  type="button"
                  className="dashboard-report-export dashboard-report-export-pdf"
                  disabled={reportOrders.length === 0 || Boolean(exportingReport)}
                  onClick={() => downloadReport('pdf')}
                >
                  {exportingReport === 'pdf' ? 'Se generează…' : 'Descarcă PDF'}
                </button>
                <button
                  type="button"
                  className="dashboard-report-export dashboard-report-export-excel"
                  disabled={reportOrders.length === 0 || Boolean(exportingReport)}
                  onClick={() => downloadReport('excel')}
                >
                  {exportingReport === 'excel' ? 'Se generează…' : 'Descarcă Excel'}
                </button>
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
                        <span>{formatDate(order.created_at)} · {getOrderStatusLabel(order.status)}{order.table_number ? ` · Masa ${order.table_number}` : ''}</span>
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

        {activeTab === 'audit' && (
          <section className="dashboard-audit">
            <div className="dashboard-section-title">
              <div>
                <h2>Jurnal administrativ</h2>
                <p>Ultimele 200 de modificări. Înregistrările pot fi citite, dar nu pot fi modificate din panou.</p>
              </div>
            </div>

            {auditLogs.length === 0 ? (
              <p className="dashboard-empty">Nu există încă acțiuni înregistrate.</p>
            ) : (
              <div className="dashboard-audit-list">
                {auditLogs.map((log) => (
                  <article key={log.id} className="dashboard-audit-record">
                    <header>
                      <div>
                        <span>{AUDIT_ACTION_LABELS[log.action] || log.action}</span>
                        <h3>{getAuditEntity(log)}</h3>
                      </div>
                      <time dateTime={log.created_at}>{formatDate(log.created_at)}</time>
                    </header>
                    <p className="dashboard-audit-actor">
                      Efectuat de: <strong>{log.actor_email || (log.actor_user_id ? 'Administrator' : 'Sistem / SQL Editor')}</strong>
                    </p>
                    <div className="dashboard-audit-values">
                      <AuditSnapshot title="Valoare veche" value={log.old_value} />
                      <AuditSnapshot title="Valoare nouă" value={log.new_value} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {qrTable && (
        <div className="dashboard-qr-backdrop" role="presentation" onMouseDown={() => setQrTable(null)}>
          <section
            className="dashboard-qr-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-qr-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="dashboard-qr-close" onClick={() => setQrTable(null)} aria-label="Închide">×</button>
            <p>Masa</p>
            <h2 id="table-qr-title">{qrTable.table_number}</h2>
            <span>Clientul scanează codul pentru a comanda.</span>
            <time className="dashboard-qr-expiry" dateTime={qrTable.expires_at}>
              Deschisă la {formatTime(qrTable.opened_at)} · valabilă până la {formatTime(qrTable.expires_at)}
            </time>
            {tableQrUrl && (
              <div className="dashboard-qr-code">
                <QRCodeSVG value={tableQrUrl} size={260} level="M" marginSize={2} title={`Comandă la masa ${qrTable.table_number}`} />
              </div>
            )}
            <div className="dashboard-qr-actions">
              <button type="button" className="dashboard-secondary" onClick={copyTableLink}>Copiază linkul</button>
              <button type="button" className="dashboard-secondary is-warning" onClick={() => rotateTableSession(qrTable.table_number)}>QR nou</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

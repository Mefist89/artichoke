'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 6;
const REFRESH_INTERVAL = 5_000;
const PAGE_INTERVAL = 8_000;

const STATUS_DETAILS = {
  pending: { label: 'Comandă nouă', className: 'is-new' },
  processing: { label: 'În pregătire', className: 'is-processing' },
  completed: { label: 'Gata de ridicare', className: 'is-ready' },
};

function formatClock(value) {
  return new Intl.DateTimeFormat('ro-MD', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

export default function LiveOrderBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [clock, setClock] = useState(null);

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_public_order_board');

    if (error) {
      setConnectionError(true);
    } else {
      setOrders(data || []);
      setConnectionError(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(loadOrders, 0);
    const refreshTimer = window.setInterval(loadOrders, REFRESH_INTERVAL);
    return () => {
      window.clearTimeout(initialLoadTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadOrders]);

  useEffect(() => {
    const initialClockTimer = window.setTimeout(() => setClock(new Date()), 0);
    const clockTimer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => {
      window.clearTimeout(initialClockTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));

  useEffect(() => {
    const pageTimer = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount);
    }, PAGE_INTERVAL);
    return () => window.clearInterval(pageTimer);
  }, [pageCount]);

  const visibleOrders = useMemo(() => {
    const safePageIndex = pageIndex % pageCount;
    return orders.slice(safePageIndex * PAGE_SIZE, (safePageIndex + 1) * PAGE_SIZE);
  }, [orders, pageCount, pageIndex]);

  const slots = Array.from({ length: PAGE_SIZE }, (_, index) => visibleOrders[index] || null);

  return (
    <div className="order-board-page">
      <header className="order-board-header">
        <div>
          <p>PLAY ROOM ARTICHOKE</p>
          <h1>Comenzile tale</h1>
        </div>
        <div className="order-board-clock" aria-label="Ora curentă">
          {clock ? formatClock(clock) : '--:--'}
        </div>
      </header>

      <div className="order-board-legend" aria-label="Stările comenzilor">
        <span className="is-new">Comandă nouă</span>
        <span className="is-processing">În pregătire</span>
        <span className="is-ready">Gata de ridicare</span>
      </div>

      {connectionError && (
        <p className="order-board-connection" role="status">
          Conexiune temporar indisponibilă. Reîncercăm automat…
        </p>
      )}

      <section className="order-board-grid" aria-live="polite" aria-busy={loading}>
        {slots.map((order, index) => {
          const status = order ? STATUS_DETAILS[order.status] : null;
          return (
            <article
              key={order ? `${order.order_number}-${order.status}` : `empty-${index}`}
              className={`order-board-card ${status?.className || 'is-empty'}`}
            >
              {order ? (
                <>
                  <p>Comanda</p>
                  <h2>ART-{order.order_number}</h2>
                  <span>{status.label}</span>
                </>
              ) : (
                <span className="order-board-empty-mark">—</span>
              )}
            </article>
          );
        })}
      </section>

      <footer className="order-board-footer">
        <p>Păstrează numărul comenzii până la ridicare.</p>
        {pageCount > 1 && (
          <div className="order-board-pages" aria-label={`Pagina ${(pageIndex % pageCount) + 1} din ${pageCount}`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <span key={index} className={index === pageIndex % pageCount ? 'is-active' : ''}></span>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

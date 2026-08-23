'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'arrived']);
const STATUS_LABELS = {
  pending: 'Nouă',
  confirmed: 'Confirmată',
  arrived: 'Client sosit',
  completed: 'Finalizată',
  cancelled: 'Anulată',
  no_show: 'Nu s-a prezentat',
};

function getChisinauDateKey(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Chisinau',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const getPart = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(getPart('year'), getPart('month') - 1, getPart('day') + offsetDays))
    .toISOString()
    .slice(0, 10);
}

function formatReservationNumber(reservation) {
  return reservation.reservation_number
    ? `REZ-${reservation.reservation_number}`
    : `#${reservation.id.slice(0, 8).toUpperCase()}`;
}

function formatReservationDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ro-MD', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
}

function formatTimeRange(reservation) {
  const [hours, minutes] = reservation.reservation_time.slice(0, 5).split(':').map(Number);
  const start = hours * 60 + minutes;
  const end = start + Number(reservation.duration_minutes || 120);
  const endHours = String(Math.floor(end / 60) % 24).padStart(2, '0');
  const endMinutes = String(end % 60).padStart(2, '0');
  return `${reservation.reservation_time.slice(0, 5)}–${endHours}:${endMinutes}`;
}

function matchesSearch(reservation, search) {
  if (!search) return true;
  const haystack = [
    formatReservationNumber(reservation),
    reservation.name,
    reservation.phone,
  ].join(' ').toLocaleLowerCase('ro');
  return haystack.includes(search.toLocaleLowerCase('ro'));
}

function ReservationDetails({ reservation }) {
  return (
    <details className="dashboard-details">
      <summary>Detalii rezervare</summary>
      <div className="dashboard-details-body">
        <div className="dashboard-record-details">
          <span>Telefon: <a href={`tel:${reservation.phone}`}>{reservation.phone}</a></span>
          <span>Masa solicitată: {reservation.table_number ? `Masa ${reservation.table_number}` : '—'}</span>
          <span>Durata: {reservation.duration_minutes || 120} minute</span>
        </div>
        {reservation.message && <p className="dashboard-note">{reservation.message}</p>}
      </div>
    </details>
  );
}

export default function ReservationsPanel({
  reservations,
  busyId,
  setBusyId,
  setErrorMessage,
  setNotice,
  reload,
  setQrTable,
}) {
  const today = getChisinauDateKey();
  const tomorrow = getChisinauDateKey(1);
  const [dateMode, setDateMode] = useState('today');
  const [calendarDate, setCalendarDate] = useState(today);
  const [search, setSearch] = useState('');
  const [tableSelections, setTableSelections] = useState({});

  const selectedDate = dateMode === 'today'
    ? today
    : dateMode === 'tomorrow'
      ? tomorrow
      : calendarDate;

  const visibleReservations = useMemo(() => reservations
    .filter((reservation) => ACTIVE_STATUSES.has(reservation.status))
    .filter((reservation) => reservation.reservation_date === selectedDate)
    .filter((reservation) => matchesSearch(reservation, search))
    .sort((first, second) => first.reservation_time.localeCompare(second.reservation_time)),
  [reservations, search, selectedDate]);

  const archivedReservations = useMemo(() => reservations
    .filter((reservation) => !ACTIVE_STATUSES.has(reservation.status))
    .filter((reservation) => matchesSearch(reservation, search)),
  [reservations, search]);

  const scheduledByTable = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const tableNumber = index + 1;
    return {
      tableNumber,
      reservations: visibleReservations.filter((reservation) => (
        reservation.table_number === tableNumber
        && ['confirmed', 'arrived'].includes(reservation.status)
      )),
    };
  }), [visibleReservations]);

  const getSelectedTable = (reservation) => (
    tableSelections[reservation.id] ?? reservation.table_number ?? ''
  );

  const manageReservation = async (reservation, nextStatus) => {
    const selectedTable = Number(getSelectedTable(reservation));
    if (['confirmed', 'arrived'].includes(nextStatus) && !selectedTable) {
      setErrorMessage('Selectează mai întâi masa pentru rezervare.');
      return;
    }

    if (nextStatus === 'cancelled' && !window.confirm('Anulezi această rezervare?')) return;
    if (nextStatus === 'no_show' && !window.confirm('Marchezi clientul ca neprezentat?')) return;

    setBusyId(`reservation-${reservation.id}`);
    setErrorMessage('');
    setNotice('');

    const { data, error } = await supabase.rpc('admin_manage_reservation', {
      p_reservation_id: reservation.id,
      p_status: nextStatus,
      p_table_number: selectedTable || null,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('schedule conflict')) {
        setErrorMessage('Masa este deja rezervată în acest interval. Alege altă masă.');
      } else if (message.includes('active session')) {
        setErrorMessage('Masa are deja o sesiune QR activă. Închide sesiunea sau alege altă masă.');
      } else if (message.includes('unfinished orders')) {
        setErrorMessage('Masa are comenzi nefinalizate. Finalizează comenzile înainte de închiderea rezervării.');
      } else {
        setErrorMessage('Rezervarea nu a putut fi actualizată. Verifică migrarea Supabase.');
      }
    } else {
      const result = data?.[0];
      if (nextStatus === 'arrived' && result?.session_token) {
        setQrTable({
          table_number: result.assigned_table,
          token: result.session_token,
          opened_at: result.session_opened_at,
          expires_at: result.session_expires_at,
        });
      }
      setNotice(nextStatus === 'arrived'
        ? `Clientul a sosit. Sesiunea QR pentru masa ${result?.assigned_table} este activă.`
        : 'Rezervarea a fost actualizată.');
      await reload();
    }

    setBusyId('');
  };

  const renderReservation = (reservation, archived = false) => {
    const isBusy = busyId === `reservation-${reservation.id}`;
    const selectedTable = getSelectedTable(reservation);

    return (
      <article key={reservation.id} className={`dashboard-reservation-card is-${reservation.status}`}>
        <header className="dashboard-reservation-head">
          <div>
            <span className="dashboard-reservation-code">{formatReservationNumber(reservation)}</span>
            <h3>{reservation.name}</h3>
            <p>{formatReservationDate(reservation.reservation_date)} · {formatTimeRange(reservation)} · {reservation.guests} persoane</p>
          </div>
          <span className={`dashboard-reservation-status is-${reservation.status}`}>
            {STATUS_LABELS[reservation.status] || reservation.status}
          </span>
        </header>

        {!archived && (
          <div className="dashboard-reservation-controls">
            <label>
              Masa
              <select
                value={selectedTable}
                disabled={reservation.status === 'arrived' || isBusy}
                onChange={(event) => setTableSelections((current) => ({
                  ...current,
                  [reservation.id]: event.target.value,
                }))}
              >
                <option value="">Alege masa</option>
                {Array.from({ length: 6 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>Masa {index + 1}</option>
                ))}
              </select>
            </label>

            <div className="dashboard-reservation-actions">
              {reservation.status === 'pending' && (
                <button type="button" disabled={isBusy} onClick={() => manageReservation(reservation, 'confirmed')}>Confirmă</button>
              )}
              {reservation.status === 'confirmed' && (
                <>
                  <button type="button" disabled={isBusy} onClick={() => manageReservation(reservation, 'confirmed')}>Salvează masa</button>
                  <button type="button" className="is-primary" disabled={isBusy} onClick={() => manageReservation(reservation, 'arrived')}>Client sosit</button>
                  <button type="button" disabled={isBusy} onClick={() => manageReservation(reservation, 'no_show')}>Nu s-a prezentat</button>
                </>
              )}
              {reservation.status === 'arrived' && (
                <button type="button" className="is-primary" disabled={isBusy} onClick={() => manageReservation(reservation, 'completed')}>Finalizează</button>
              )}
              {['pending', 'confirmed'].includes(reservation.status) && (
                <button type="button" className="is-danger" disabled={isBusy} onClick={() => manageReservation(reservation, 'cancelled')}>Anulează</button>
              )}
            </div>
          </div>
        )}

        <ReservationDetails reservation={reservation} />
      </article>
    );
  };

  return (
    <section className="dashboard-reservations">
      <div className="dashboard-reservation-toolbar">
        <div className="dashboard-reservation-date-modes" aria-label="Data rezervărilor">
          <button type="button" className={dateMode === 'today' ? 'is-active' : ''} onClick={() => setDateMode('today')}>Astăzi</button>
          <button type="button" className={dateMode === 'tomorrow' ? 'is-active' : ''} onClick={() => setDateMode('tomorrow')}>Mâine</button>
          <button type="button" className={dateMode === 'calendar' ? 'is-active' : ''} onClick={() => setDateMode('calendar')}>Calendar</button>
        </div>
        {dateMode === 'calendar' && (
          <label className="dashboard-reservation-calendar">
            Data
            <input type="date" value={calendarDate} onChange={(event) => setCalendarDate(event.target.value)} />
          </label>
        )}
        <label className="dashboard-reservation-search">
          Caută
          <input
            type="search"
            value={search}
            placeholder="Număr, nume sau telefon"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="dashboard-reservation-day-title">
        <div>
          <span>Program</span>
          <h2>{formatReservationDate(selectedDate)}</h2>
        </div>
        <strong>{visibleReservations.length} rezervări active</strong>
      </div>

      <div className="dashboard-reservation-schedule">
        {scheduledByTable.map(({ tableNumber, reservations: tableReservations }) => (
          <article key={tableNumber} className={tableReservations.length ? 'is-booked' : 'is-free'}>
            <header><span>Masa</span><strong>{tableNumber}</strong></header>
            {tableReservations.length === 0 ? (
              <p>Liberă</p>
            ) : tableReservations.map((reservation) => (
              <div key={reservation.id}>
                <time>{formatTimeRange(reservation)}</time>
                <span>{reservation.name}</span>
              </div>
            ))}
          </article>
        ))}
      </div>

      <div className="dashboard-reservation-list">
        {visibleReservations.length === 0 ? (
          <p className="dashboard-empty">Nu există rezervări active pentru data selectată.</p>
        ) : visibleReservations.map((reservation) => renderReservation(reservation))}
      </div>

      <details className="dashboard-reservation-archive">
        <summary>Arhiva rezervărilor <span>{archivedReservations.length}</span></summary>
        <div className="dashboard-reservation-list">
          {archivedReservations.length === 0 ? (
            <p className="dashboard-empty">Arhiva este goală.</p>
          ) : archivedReservations.map((reservation) => renderReservation(reservation, true))}
        </div>
      </details>
    </section>
  );
}

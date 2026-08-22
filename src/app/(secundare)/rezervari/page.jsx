'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RezervariPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });
  const dateInputRef = useRef(null);

  useEffect(() => {
    const dateInput = dateInputRef.current;
    if (!dateInput) return;

    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Chisinau',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const getPart = (type) => parts.find((part) => part.type === type)?.value;
    const year = Number(getPart('year'));
    const month = Number(getPart('month'));
    const day = Number(getPart('day'));
    const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const lastAvailableDate = new Date(Date.UTC(year, month - 1, day + 365))
      .toISOString()
      .slice(0, 10);

    dateInput.min = today;
    dateInput.max = lastAvailableDate;
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ text: 'Se trimite...', type: 'info' });

    const form = e.target;
    if (form.website.value) {
      setStatus({ text: 'Rezervarea a fost trimisă cu succes!', type: 'success' });
      setLoading(false);
      return;
    }
    const { error } = await supabase.rpc('submit_reservation', {
      p_name: form.name.value,
      p_phone: form.phone.value,
      p_date: form.date.value,
      p_time: form.time.value,
      p_guests: Number(form.guests.value),
      p_zone: form.zone.value,
      p_message: form.message.value || null,
    });

    if (error) {
      console.error(error);
      const rateLimited = error.message?.includes('Rate limit exceeded');
      setStatus({
        text: rateLimited
          ? 'Ai trimis prea multe rezervări. Te rugăm să încerci mai târziu.'
          : 'Eroare la trimitere. Încearcă din nou.',
        type: 'error',
      });
    } else {
      setStatus({ text: 'Rezervarea a fost trimisă cu succes!', type: 'success' });
      form.reset();
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Locul tău te așteaptă</p>
              <h1 className="section-title">Rezervări</h1>
              <p>
                Completează formularul de mai jos și îți confirmăm rezervarea în
                cel mai scurt timp.
              </p>
            </div>
          </div>
        </section>

        <section className="section contact-section" id="booking-form">
          <div className="container contact-layout">
            <aside className="contact-side">
              <article className="contact-card">
                <h2>Informații utile</h2>
                <div className="contact-item">
                  <span className="material-icons-outlined">event_seat</span>
                  <div>
                    <strong>Capacitate</strong>
                    <p>De la 2 la 12 persoane per rezervare.</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">schedule</span>
                  <div>
                    <strong>Interval orar</strong>
                    <p>Lun-Dum: 09:00 - 22:00</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">phone</span>
                  <div>
                    <strong>Confirmări</strong>
                    <p>069883294</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">place</span>
                  <div>
                    <strong>Adresă</strong>
                    <p>Orașul Cahul, strada 31 August 1989, 4j</p>
                  </div>
                </div>
              </article>

              <div
                className="map-card contact-map"
                role="img"
                aria-label="Locația cafenelei pe hartă"
              >
                <iframe
                  className="contact-map-embed"
                  src="https://maps.google.com/maps?q=Ora%C8%99ul%20Cahul%2C%20strada%2031%20August%201989%2C%204j&z=16&output=embed"
                  title="Harta locației PLAY ROOM ARTICHOKE"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
                <span className="map-note">Orașul Cahul, strada 31 August 1989, 4j</span>
              </div>
            </aside>

            <article className="contact-form-card">
              <h2>Formular rezervare</h2>
              <p>
                Te rugăm să introduci datele corecte pentru a putea confirma masa.
              </p>
              <form className="contact-form" onSubmit={handleSubmit}>
                <label className="form-honeypot" aria-hidden="true">
                  Website
                  <input type="text" name="website" tabIndex="-1" autoComplete="off" />
                </label>
                <div className="contact-form-row">
                  <label>
                    Nume
                    <input type="text" name="name" placeholder="Ion Popescu" minLength="2" maxLength="100" required />
                  </label>
                  <label>
                    Telefon
                    <input type="tel" name="phone" placeholder="+373 XX XXX XXX" minLength="6" maxLength="30" required />
                  </label>
                </div>
                <div className="contact-form-row">
                  <label>
                    Data
                    <input ref={dateInputRef} type="date" name="date" required />
                  </label>
                  <label>
                    Ora
                    <input type="time" name="time" min="09:00" max="22:00" required />
                  </label>
                </div>
                <div className="contact-form-row">
                  <label>
                    Număr persoane
                    <input type="number" name="guests" min="2" max="12" defaultValue="2" required />
                  </label>
                  <label>
                    Zonă
                    <select name="zone" required>
                      <option value="Interior">Interior</option>
                      <option value="Terasă">Terasă</option>
                      <option value="Lângă fereastră">Lângă fereastră</option>
                    </select>
                  </label>
                </div>
                <label>
                  Detalii suplimentare
                  <textarea name="message" rows="4" maxLength="1000" placeholder="Preferințe, ocazie specială, alergii..."></textarea>
                </label>
                <button type="submit" disabled={loading}>
                  {loading ? 'Se trimite...' : 'Trimite rezervarea'}
                </button>
                {status.text && (
                  <p className="form-status" style={{ color: status.type === 'error' ? 'red' : 'green', marginTop: '1rem' }}>
                    {status.text}
                  </p>
                )}
              </form>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

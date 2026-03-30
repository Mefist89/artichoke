'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RezervariPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ text: 'Se trimite...', type: 'info' });

    const form = e.target;
    const data = {
      name: form.name.value,
      phone: form.phone.value,
      date: form.date.value,
      time: form.time.value,
      guests: form.guests.value,
      zone: form.zone.value,
      message: form.message.value,
    };

    const { error } = await supabase.from('reservations').insert([data]);

    if (error) {
      console.error(error);
      setStatus({ text: 'Eroare la trimitere. Încearcă din nou.', type: 'error' });
    } else {
      setStatus({ text: 'Rezervarea a fost trimisă cu succes!', type: 'success' });
      form.reset();
    }
    setLoading(false);
  };

  return (
    <div className="page-wrapper">
      <main className="contact-main header-padded">
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
                <div className="contact-form-row">
                  <label>
                    Nume
                    <input type="text" name="name" placeholder="Ion Popescu" required />
                  </label>
                  <label>
                    Telefon
                    <input type="tel" name="phone" placeholder="+373 XX XXX XXX" required />
                  </label>
                </div>
                <div className="contact-form-row">
                  <label>
                    Data
                    <input type="date" name="date" required />
                  </label>
                  <label>
                    Ora
                    <input type="time" name="time" required />
                  </label>
                </div>
                <div className="contact-form-row">
                  <label>
                    Număr persoane
                    <input type="number" name="guests" min="1" max="12" defaultValue="2" required />
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
                  <textarea name="message" rows="4" placeholder="Preferințe, ocazie specială, alergii..."></textarea>
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
      </main>
    </div>
  );
}

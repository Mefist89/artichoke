'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ text: 'Se trimite...', type: 'info' });

    const form = e.target;
    if (form.website.value) {
      setStatus({ text: 'Mesajul a fost trimis cu succes!', type: 'success' });
      setLoading(false);
      return;
    }
    const { error } = await supabase.rpc('submit_contact_message', {
      p_name: form.name.value,
      p_email: form.email.value,
      p_subject: form.subject.value,
      p_message: form.message.value,
    });

    if (error) {
      console.error(error);
      const rateLimited = error.message?.includes('Rate limit exceeded');
      setStatus({
        text: rateLimited
          ? 'Ai trimis prea multe mesaje. Te rugăm să încerci mai târziu.'
          : 'Eroare la trimitere. Încearcă din nou.',
        type: 'error',
      });
    } else {
      setStatus({ text: 'Mesajul a fost trimis cu succes!', type: 'success' });
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
              <p className="section-kicker">Suntem aici pentru tine</p>
              <h1 className="section-title">Contacte</h1>
              <p>
                Ai întrebări, propuneri sau vrei să rezervi o masă? Scrie-ne și
                îți răspundem cât mai curând.
              </p>
            </div>
          </div>
        </section>

        <section className="section contact-section" id="contact-form">
          <div className="container contact-layout">
            <aside className="contact-side">
              <article className="contact-card">
                <h2>Date de contact</h2>
                <div className="contact-item">
                  <span className="material-icons-outlined">location_on</span>
                  <div>
                    <strong>Adresă</strong>
                    <p>Orașul Cahul, strada 31 August 1989, 4j</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">phone</span>
                  <div>
                    <strong>Telefon</strong>
                    <p>069883294</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">mail</span>
                  <div>
                    <strong>Email</strong>
                    <p>playroomartichokech@gmail.com</p>
                  </div>
                </div>
                <div className="contact-item">
                  <span className="material-icons-outlined">schedule</span>
                  <div>
                    <strong>Program</strong>
                    <p>Lun-Dum: 09:00 - 22:00</p>
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
              <h2>Scrie-ne</h2>
              <p>
                Completează formularul și revenim cu un răspuns în cel mai scurt
                timp.
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
                    Email
                    <input type="email" name="email" placeholder="ion@example.com" maxLength="254" required />
                  </label>
                </div>
                <label>
                  Subiect
                  <select name="subject" required>
                    <option value="">Alege un subiect</option>
                    <option value="Întrebări generale">Întrebări generale</option>
                    <option value="Rezervare masă">Rezervare masă</option>
                    <option value="Eveniment privat">Eveniment privat</option>
                    <option value="Feedback">Feedback</option>
                  </select>
                </label>
                <label>
                  Mesaj
                  <textarea name="message" rows="5" placeholder="Scrie mesajul tău..." minLength="10" maxLength="2000" required></textarea>
                </label>
                <button type="submit" disabled={loading}>
                  {loading ? 'Se trimite...' : 'Trimite'}
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

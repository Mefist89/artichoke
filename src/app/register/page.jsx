import Link from 'next/link';

export const metadata = {
  title: 'Înregistrare în curs de creare | Artichoke',
  description: 'Pagina de înregistrare Artichoke este în curs de creare.',
};

export default function RegisterPage() {
  return (
    <div className="page-wrapper">
      <div className="contact-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">În curând</p>
              <h1 className="section-title">Pagina este în curs de creare</h1>
              <p>
                Înregistrarea publică nu este disponibilă momentan. Lucrăm la
                această secțiune și o vom deschide în curând.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '12px',
                  marginTop: '28px',
                }}
              >
                <Link className="book-btn" href="/">
                  Înapoi acasă
                </Link>
                <Link className="home-gallery-link" href="/login">
                  Autentificare administrator
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

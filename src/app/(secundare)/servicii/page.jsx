import Link from 'next/link';

export const metadata = {
  title: 'Servicii | PLAY ROOM ARTICHOKE',
  description: 'Servicii PLAY ROOM ARTICHOKE: opțiuni de acces și supraveghere pentru copii.',
};

export default function ServiciiPage() {
  return (
    <div className="page-wrapper">
      <div className="contact-main servicii-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Timp pentru tine</p>
              <h1 className="section-title">Servicii</h1>
              <p>
                Alege tipul de acces potrivit pentru copilul tău. Serviciile sunt
                disponibile zilnic în intervalul programului.
              </p>
            </div>
          </div>
        </section>

        <section className="section services-section" id="servicii">
          <div className="container">
            <p className="section-kicker">Timp pentru tine</p>
            <h2 className="section-title">Servicii</h2>
            <div className="services-grid">
              <Link href="/rezervari" className="service-card" aria-label="Rezervare serviciu 1 oră">
                <img
                  className="service-illustration"
                  src="/img/servicii/serviciu-acces.svg"
                  alt="Serviciu de acces pentru 1 oră"
                />
                <h3>1 oră</h3>
                <p>Acces standard în zona de joacă pentru o sesiune rapidă.</p>
                <span className="service-price">40 MDL</span>
              </Link>
              <Link href="/rezervari" className="service-card" aria-label="Rezervare serviciu Rămânere 1 oră">
                <img
                  className="service-illustration"
                  src="/img/servicii/serviciu-ramanere.svg"
                  alt="Serviciu de rămânere 1 oră"
                />
                <h3>Rămânere 1 oră</h3>
                <p>Sesiune extinsă cu timp suplimentar pentru activități.</p>
                <span className="service-price">60 MDL</span>
              </Link>
              <Link href="/rezervari" className="service-card" aria-label="Rezervare serviciu 1 oră cu bonă">
                <img
                  className="service-illustration"
                  src="/img/servicii/serviciu-bona.svg"
                  alt="Serviciu de supraveghere cu bonă"
                />
                <h3>1 oră cu bonă</h3>
                <p>Supraveghere dedicată pentru perioade mai lungi.</p>
                <span className="service-price">100 MDL</span>
              </Link>
            </div>

            <div className="services-note-block">
              <p className="section-title services-note-title">Atenție</p>
              <p className="section-kicker services-note-kicker">
                Responsabilitatea pentru copilul lăsat fără părinți revine
                integral părinților.
              </p>
              <p className="section-kicker services-note-final">
                Joacă sigură, voie bună și noi prieteni!
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

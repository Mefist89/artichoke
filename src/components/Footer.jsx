import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer" id="contacts">
      <div className="container footer-grid">
        <div className="footer-col footer-col-brand">
          <div className="brand brand-footer">
            <span className="brand-icon material-icons-outlined">coffee</span>
            <span className="brand-text">PLAY ROOM ARTICHOKE</span>
          </div>
          <p>
            Atmosferă cozy și cea mai bună cafea din oraș. Vino la noi pentru inspirație. Ne găsești în centrul orașului.
          </p>
        </div>

        <div className="footer-col footer-col-links">
          <h3>Navigare</h3>
          <nav className="footer-menu" aria-label="Linkuri rapide">
            <Link href="/">Acasă</Link>
            <Link href="/galerie">Galerie</Link>
            <Link href="/produse">Produse</Link>
            <Link href="/servicii">Servicii</Link>
            <Link href="/reguli">Reguli</Link>
            <Link href="/contact">Contacte</Link>
          </nav>
        </div>

        <div className="footer-col footer-col-contact">
          <h3>Contact</h3>
          <div className="footer-contacts-list">
            <p>
              <strong>Adresă</strong>
              <span>Orașul Cahul, strada 31 August 1989, 4j</span>
            </p>
            <p>
              <strong>Telefon</strong>
              <span>069883294</span>
            </p>
            <p>
              <strong>Program</strong>
              <span>Lun-Dum: 09:00 - 22:00</span>
            </p>
          </div>
        </div>

        <div className="footer-col footer-col-social">
          <h3>Social</h3>
          <div className="footer-social-list" aria-label="Rețele sociale">
            <a className="footer-icon-btn" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H8.3V12h2.14V9.8c0-2.07 1.23-3.22 3.12-3.22.9 0 1.84.16 1.84.16v2.03h-1.04c-1.02 0-1.34.63-1.34 1.28V12h2.28l-.36 2.89h-1.92v6.99A10 10 0 0 0 22 12z" /></svg>
            </a>
            <a className="footer-icon-btn" href="https://www.instagram.com/playroomcopii?igsh=MWZrenc4bDl2cGZncA%3D%3D" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm9.75 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></svg>
            </a>
            <a className="footer-icon-btn" href="https://www.tiktok.com/" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 3h2.6c.2 1.5 1 2.7 2.3 3.5.9.5 1.9.8 3 .8v2.6c-1.2 0-2.4-.3-3.4-.8a7.2 7.2 0 0 1-1.9-1.4v7.6a6.2 6.2 0 1 1-6.2-6.2c.4 0 .8 0 1.2.1v2.7a3.3 3.3 0 0 0-1.2-.2 3.5 3.5 0 1 0 3.6 3.6V3z" /></svg>
            </a>
            <a className="footer-icon-btn" href="https://t.me/playroom_kidsroom" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 21 23 12 2 3l4 7 9 2-9 2-4 7z" /></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="container copyright">
        © 2026 SRL Play Room Artichoke. Toate drepturile rezervate.
      </div>
      <p className="container site-disclaimer">
        Acest website a fost realizat în cadrul competiției „Tekwill Junior Ambassadors” organizată de proiectul „Tekwill în Fiecare Școală” și nu reflectă neapărat opinia proiectului.
      </p>
    </footer>
  );
}

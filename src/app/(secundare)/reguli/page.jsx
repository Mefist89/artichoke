export const metadata = {
  title: 'Reguli | PLAY ROOM ARTICHOKE',
  description: 'Reguli PLAY ROOM ARTICHOKE: text, imagine și video pentru joacă sigură în spațiul destinat copiilor.',
};

export default function ReguliPage() {
  return (
    <div className="page-wrapper">
      <main className="rules-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Reguli pentru joacă sigură</p>
              <h1 className="section-title">Reguli</h1>
              <p>
                Pentru confortul tuturor copiilor și părinților, te rugăm să
                respecți regulile noastre de bază.
              </p>
            </div>
          </div>
        </section>

        <section className="section rules-section" id="reguli-lista">
          <div className="container rules-layout">
            <article className="rules-card">
              <h2>Reguli de joacă</h2>
              <ul className="rules-list">
                <li>Ne jucăm aici până la 6 ani.</li>
                <li>Adulții sunt mereu alături.</li>
                <li>Intrăm în șosete.</li>
                <li>Mâini curate - joacă veselă.</li>
                <li>Mâncarea și băuturile rămân afară.</li>
                <li>Avem grijă de jucării.</li>
                <li>Ne jucăm frumos, fără îmbrânceli.</li>
                <li>Dacă suntem bolnavi - stăm acasă.</li>
              </ul>
              <p className="rules-note">
                Vă mulțumim că respectați regulile. Împreună facem joaca sigură
                și fericită.
              </p>
            </article>
            <figure className="rules-card rules-image-card">
              <img
                src="/img/reguli/reguli.png"
                alt="Afiș cu reguli pentru joacă sigură"
              />
            </figure>
          </div>
        </section>

        <section className="section rules-video-section" id="reguli-video">
          <div className="container">
            <h2 className="section-title">Video</h2>
            <article className="gallery-video-card rules-video-card">
              <div className="rules-video-wrap">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/img/reguli/reguli.png"
                  aria-label="Video reguli PLAY ROOM ARTICHOKE"
                >
                  <source src="/img/reguli/reguli-video.mp4" type="video/mp4" />
                  Browserul tău nu suportă redarea video.
                </video>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

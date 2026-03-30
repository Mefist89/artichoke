export const metadata = {
  title: 'Galerie | PLAY ROOM ARTICHOKE',
  description: 'Descoperă atmosfera PLAY ROOM ARTICHOKE prin fotografii și un video de prezentare.',
};

export default function GaleriePage() {
  return (
    <div className="page-wrapper">
      <main className="gallery-main header-padded">
        <section className="section contact-hero">
          <div className="container">
            <div className="contact-hero-card">
              <p className="section-kicker">Momente din cafenea</p>
              <h1 className="section-title">Galerie</h1>
              <p>
                Descoperă atmosfera PLAY ROOM ARTICHOKE prin fotografii și un
                video de prezentare.
              </p>
            </div>
          </div>
        </section>

        <section className="section gallery-section" id="galerie-foto">
          <div className="container">
            <h2 className="section-title">Foto</h2>
            <div className="gallery-grid">
              <figure className="gallery-item gallery-item-wide">
                <img
                  src="/img/galeria/foto1.jpg"
                  alt="Interior luminos al cafenelei"
                />
              </figure>
              <figure className="gallery-item">
                <img
                  src="/img/galeria/foto2.jpg"
                  alt="Barista pregătește cafea la espressor"
                />
              </figure>
              <figure className="gallery-item">
                <img
                  src="/img/galeria/foto3.jpg"
                  alt="Pahare cu latte pe tejghea"
                />
              </figure>
              <figure className="gallery-item">
                <img
                  src="/img/galeria/foto4.jpg"
                  alt="Cafea și desert servite pe masă"
                />
              </figure>
              <figure className="gallery-item">
                <img
                  src="/img/galeria/foto5.jpg"
                  alt="Mese amenajate într-un colț de cafenea"
                />
              </figure>
              <figure className="gallery-item gallery-item-wide">
                <img
                  src="/img/galeria/foto6.jpg"
                  alt="Zonă de servire cu decor modern"
                />
              </figure>
              <figure className="gallery-item">
                <img
                  src="/img/galeria/foto10.jpg"
                  alt="Spațiu cozy din cafenea"
                />
              </figure>
            </div>
          </div>
        </section>

        <section className="section gallery-video-section" id="galerie-video">
          <div className="container">
            <h2 className="section-title">Video</h2>
            <article className="gallery-video-card">
              <div className="gallery-video-grid">
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/img/galeria/foto7.jpg"
                  aria-label="Video 1 PLAY ROOM ARTICHOKE"
                >
                  <source src="/img/video/video1.mp4" type="video/mp4" />
                  Browserul tău nu suportă redarea video.
                </video>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/img/galeria/foto8.jpg"
                  aria-label="Video 2 PLAY ROOM ARTICHOKE"
                >
                  <source src="/img/video/video2.mp4" type="video/mp4" />
                  Browserul tău nu suportă redarea video.
                </video>
                <video
                  controls
                  preload="metadata"
                  playsInline
                  poster="/img/galeria/foto9.jpg"
                  aria-label="Video 3 PLAY ROOM ARTICHOKE"
                >
                  <source src="/img/video/video3.mp4" type="video/mp4" />
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

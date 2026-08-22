import Link from 'next/link';
import Image from 'next/image';
import HeroSlider from '@/components/HeroSlider';

export default function Home() {
  return (
    <>
      <section className="section about" id="about">
        <div className="container about-grid">
          <HeroSlider />

          <div className="about-copy">
            <h1 className="display-title">DESPRE NOI</h1>
            <article className="quote-card">
              <p>
                „Cafea și Confort” este locul unde te poți bucura de cafea aromată, băuturi de autor și deserturi gustoase
                într-o atmosferă caldă, ca acasă. Cafeneaua noastră este creată pentru cei care caută un colț de liniște în mijlocul agitației urbane.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="hero-strip" aria-label="Banner decorativ">
        <Image src="/img/bg/latte-hero.jpg" alt="Latte și croissante" width={2400} height={700} sizes="100vw" />
      </section>

      <section className="section seasonal" id="seasonal">
        <div className="container">
          <p className="section-kicker">Arome speciale pentru această perioadă</p>
          <h2 className="section-title">Selecția sezonului</h2>

          <div className="seasonal-grid">
            <article className="season-card">
              <Image src="/img/oferte/latte-lavanda.jpg" alt="Latte cu lavandă" width={900} height={900} sizes="(max-width: 640px) 100vw, 50vw" />
              <div className="season-card-text">
                <h3>Latte cu lavandă</h3>
                <p>Espresso fin cu sirop de lavandă de casă și spumă de lapte catifelată.</p>
                <span>35 MDL</span>
              </div>
            </article>

            <article className="season-card">
              <Image src="/img/oferte/latte-dovleac.jpg" alt="Latte cu dovleac și condimente" width={900} height={900} sizes="(max-width: 640px) 100vw, 50vw" />
              <div className="season-card-text">
                <h3>Latte cu dovleac și condimente</h3>
                <p>Băutură reconfortantă cu piure de dovleac, scorțișoară și nucșoară.</p>
                <span>35 MDL</span>
              </div>
            </article>
          </div>

          <div className="seasonal-actions">
            <Link className="seasonal-cta" href="/produse">Vezi toate produsele</Link>
          </div>
        </div>
      </section>

      <section className="section menu" id="menu">
        <div className="container">
          <div className="menu-head">
            <p className="section-kicker">
              Descoperă băuturi și deserturi pregătite cu grijă, pentru fiecare moment al zilei.
            </p>
            <h2 className="section-title">Meniu</h2>
          </div>

          <div className="menu-block">
            <h3>Cafea</h3>
            <div className="menu-grid">
              <article className="menu-item">
                <Image src="/img/cofe/cappuccino.jpg" alt="Cappuccino" width={700} height={700} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Cappuccino</h4>
                <p>cu artă latte</p>
                <span>20 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/cofe/cacao.jpg" alt="Cacao" width={700} height={700} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Cacao</h4>
                <p>cu spumă de lapte</p>
                <span>20 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/cofe/espresso-macchiato.jpg" alt="Espresso macchiato" width={700} height={700} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Espresso macchiato</h4>
                <p>porție clasică</p>
                <span>20 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/cofe/flat-white.jpg" alt="Flat white" width={700} height={700} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Flat white</h4>
                <p>pe espresso dublu</p>
                <span>15 MDL</span>
              </article>
            </div>
          </div>

          <div className="menu-block menu-block-almond">
            <h3>Băuturi cu lapte de MIGDALE</h3>
            <div className="menu-grid">
              <article className="menu-item">
                <Image src="/img/migdale/americano-migdale.jpg" alt="Americano cu lapte de migdale" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Americano cu lapte de migdale</h4>
                <p>Aromă echilibrată și textură delicată.</p>
                <span>25 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/migdale/cappuccino-migdale.jpg" alt="Cappuccino cu lapte de migdale" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Cappuccino cu lapte de migdale</h4>
                <p>Spumă fină și gust cremos.</p>
                <span>30 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/migdale/latte-migdale.jpg" alt="Latte cu lapte de migdale" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Latte cu lapte de migdale</h4>
                <p>Latte catifelat cu note dulci.</p>
                <span>40 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/migdale/cacao-migdale.jpg" alt="Cacao cu lapte de migdale" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Cacao cu lapte de migdale</h4>
                <p>Cacao caldă și aromată.</p>
                <span>30 MDL</span>
              </article>
            </div>
          </div>

          <div className="menu-block menu-block-dessert">
            <h3>Deserturi</h3>
            <div className="menu-grid dessert-grid">
              <article className="menu-item">
                <Image src="/img/deserti/cupcake.jpg" alt="Cupcake" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Cupcake</h4>
                <p>cu cremă de ciocolată</p>
                <span>40 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/deserti/donut.jpg" alt="Donut" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Donut</h4>
                <p>cu glazură de căpșuni</p>
                <span>35 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/deserti/tort-pandispan.jpg" alt="Tort pandișpan" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Tort pandișpan</h4>
                <p>cu cremă fină</p>
                <span>50 MDL</span>
              </article>
              <article className="menu-item">
                <Image src="/img/deserti/inghetata-spaghetti.jpg" alt="Înghețată" width={900} height={900} sizes="(max-width: 640px) 100vw, 25vw" />
                <h4>Înghețată spaghetti</h4>
                <p>desert cu înghețată</p>
                <span>50 MDL</span>
              </article>
            </div>
          </div>

          <div className="seasonal-actions">
            <Link className="seasonal-cta" href="/produse">Vezi toate produsele</Link>
          </div>
        </div>
      </section>

      <section className="section services-section" id="servicii">
        <div className="container">
          <p className="section-kicker">Timp pentru tine</p>
          <h2 className="section-title">Servicii</h2>
          <div className="services-grid">
            <Link className="service-card" href="/rezervari" aria-label="Rezervare serviciu 1 oră">
              <img className="service-illustration" src="/img/servicii/serviciu-acces.svg" alt="Serviciu de acces pentru 1 oră" />
              <h3>1 oră</h3>
              <p>Acces standard în zona de joacă pentru o sesiune rapidă.</p>
              <span className="service-price">40 MDL</span>
            </Link>
            <Link className="service-card" href="/rezervari" aria-label="Rezervare serviciu Rămânere 1 oră">
              <img className="service-illustration" src="/img/servicii/serviciu-ramanere.svg" alt="Serviciu de rămânere 1 oră" />
              <h3>Rămânere 1 oră</h3>
              <p>Sesiune extinsă cu timp suplimentar pentru activități.</p>
              <span className="service-price">60 MDL</span>
            </Link>
            <Link className="service-card" href="/rezervari" aria-label="Rezervare serviciu 1 oră cu bonă">
              <img className="service-illustration" src="/img/servicii/serviciu-bona.svg" alt="Serviciu de supraveghere cu bonă" />
              <h3>1 oră cu bonă</h3>
              <p>Supraveghere dedicată pentru perioade mai lungi.</p>
              <span className="service-price">100 MDL</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-gallery" id="galeria">
        <div className="container">
          <p className="section-kicker">Momente din cafenea</p>
          <h2 className="section-title">Galeria</h2>
          <div className="gallery-grid home-gallery-grid">
            <figure className="gallery-item">
              <Image src="/img/galeria/foto1.jpg" alt="Detalii din interiorul cafenelei" width={960} height={1280} sizes="(max-width: 640px) 100vw, 33vw" />
              <figcaption>
                <h3>Relaxare</h3>
                <p>Atmosferă caldă pentru pauze liniștite și momente plăcute.</p>
                <Link className="home-gallery-link" href="/galerie">Vezi mai mult</Link>
              </figcaption>
            </figure>
            <figure className="gallery-item">
              <Image src="/img/galeria/foto2.jpg" alt="Cafea servită pe masă" width={960} height={1280} sizes="(max-width: 640px) 100vw, 33vw" />
              <figcaption>
                <h3>Cafea de autor</h3>
                <p>Băuturi pregătite cu grijă, gust echilibrat și aromă intensă.</p>
                <Link className="home-gallery-link" href="/galerie">Vezi mai mult</Link>
              </figcaption>
            </figure>
            <figure className="gallery-item">
              <Image src="/img/galeria/foto3.jpg" alt="Colț cozy în PLAY ROOM ARTICHOKE" width={1079} height={1168} sizes="(max-width: 640px) 100vw, 33vw" />
              <figcaption>
                <h3>Ambianță</h3>
                <p>Loc perfect pentru întâlniri cu prietenii sau timp pentru tine.</p>
                <Link className="home-gallery-link" href="/galerie">Vezi mai mult</Link>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="section reviews" id="reviews">
        <div className="container">
          <h2 className="section-title">Recenziile oaspeților</h2>
          <div className="reviews-track">
            <article className="review-card">
              <p>
                Un loc minunat! Latte-ul cu lavandă a devenit băutura mea
                preferată. Foarte confortabil, ca acasă.
              </p>
              <div className="review-author">
                <span>A</span>
                <div>
                  <h4>Ana S.</h4>
                  <small>★★★★★</small>
                </div>
              </div>
            </article>
            <article className="review-card">
              <p>
                Cea mai bună cafea din zonă. Personalul este mereu amabil, iar
                deserturile se topesc în gură.
              </p>
              <div className="review-author">
                <span>M</span>
                <div>
                  <h4>Mihai D.</h4>
                  <small>★★★★★</small>
                </div>
              </div>
            </article>
            <article className="review-card">
              <p>
                Un loc liniștit pentru lucru și relaxare. Latte-ul cu dovleac
                din această toamnă a fost magic.
              </p>
              <div className="review-author">
                <span>E</span>
                <div>
                  <h4>Elena C.</h4>
                  <small>★★★★☆</small>
                </div>
              </div>
            </article>
            <article className="review-card">
              <p>
                Ador cupcake-urile lor. Mereu proaspete și foarte frumoase. Le
                recomand tuturor prietenilor.
              </p>
              <div className="review-author">
                <span>C</span>
                <div>
                  <h4>Cristian V.</h4>
                  <small>★★★★★</small>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}

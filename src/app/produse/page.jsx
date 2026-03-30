import AddToCartButton from '@/components/AddToCartButton';
import productsData from '@/data/products.json';

export const metadata = {
  title: 'Produse | PLAY ROOM ARTICHOKE',
  description: 'Meniul complet cu cafea, deserturi și oferte de sezon la PLAY ROOM ARTICHOKE.',
};

export default function ProdusePage() {
  // Parsăm categoriile unice, păstrând ordinea în care apar primele.
  const categoriesMap = new Map();
  // Mapare nume categorii
  const categoryNames = {
    'prod-cafea': 'Cafea',
    'prod-migdale': 'Băuturi cu lapte de MIGDALE',
    'prod-ceai': 'Ceai și infuzii',
    'prod-desert': 'Deserturi',
    'prod-micdejun': 'Mic dejun'
  };

  // Descrieri
  const categoryDescriptions = {
    'prod-cafea': 'Băuturi clasice și de autor, cu boabe atent selecționate.',
    'prod-migdale': 'Alternative pe bază de lapte vegetal, aromate și echilibrate.',
    'prod-ceai': 'Sortimente pentru relaxare sau energie pe parcursul zilei.',
    'prod-desert': 'Prăjituri și gustări dulci, preparate zilnic.',
    'prod-micdejun': 'Opțiuni consistente, inspirate de meniul modern de cafenea.'
  };

  productsData.forEach(p => {
    if (!categoriesMap.has(p.category)) {
      categoriesMap.set(p.category, {
        id: p.category,
        name: categoryNames[p.category] || p.category,
        description: categoryDescriptions[p.category] || ''
      });
    }
  });

  const categories = Array.from(categoriesMap.values());

  return (
    <main className="products-main header-padded">
      <section className="section contact-hero">
        <div className="container">
          <div className="contact-hero-card">
            <p className="section-kicker">Selectează ce ți se potrivește</p>
            <h1 className="section-title">Produse</h1>
            <p>
              Inspirat din meniul de referință: băuturi, deserturi și opțiuni
              de mic dejun pentru orice moment al zilei.
            </p>
          </div>
        </div>
      </section>

      <section className="section products-section">
        <div className="container products-layout">
          <aside className="products-sidebar">
            <h2>Categorii</h2>
            <nav aria-label="Categorii produse">
              {categories.map((c, idx) => (
                <a key={idx} href={`#cat-${c.id}`}>
                  {c.name}
                </a>
              ))}
            </nav>
            <p className="products-side-note">
              Toate produsele sunt preparate din ingrediente proaspete, iar
              meniul poate fi personalizat la cerere.
            </p>
          </aside>

          <div className="products-content">
            {categories.map(category => (
              <section key={category.id} className="products-category" id={`cat-${category.id}`}>
                <h2>{category.name}</h2>
                <p>{category.description}</p>
                <div className="products-grid">
                  {productsData
                    .filter(p => p.category === category.id)
                    .map(product => {
                      const hasOldPrice = product.oldPrice && product.oldPrice > product.price;
                      return (
                        <article key={product.id} className="product-card">
                          <img src={`/${product.image}`} alt={product.name} />
                          <div className="product-card-body">
                            <h3>{product.name}</h3>
                            {product.description && <p>{product.description}</p>}
                            <div className="product-card-meta">
                              {hasOldPrice ? (
                                <>
                                  <span className="product-price">{product.price} MDL</span>
                                  <span className="old-price" style={{textDecoration: 'line-through', color: '#888', marginLeft: '0.5rem', fontSize: '0.9rem'}}>{product.oldPrice} MDL</span>
                                </>
                              ) : (
                                <span className="product-price">{product.price} MDL</span>
                              )}
                              <AddToCartButton product={product} />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

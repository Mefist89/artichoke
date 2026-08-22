'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import AddToCartButton from '@/components/AddToCartButton';
import { supabase } from '@/lib/supabase';

const CATEGORY_NAMES = {
  'prod-cafea': 'Cafea',
  'prod-migdale': 'Băuturi cu lapte de MIGDALE',
  'prod-ceai': 'Ceai și infuzii',
  'prod-desert': 'Deserturi',
  'prod-micdejun': 'Mic dejun',
};

const CATEGORY_DESCRIPTIONS = {
  'prod-cafea': 'Băuturi clasice și de autor, cu boabe atent selecționate.',
  'prod-migdale': 'Alternative pe bază de lapte vegetal, aromate și echilibrate.',
  'prod-ceai': 'Sortimente pentru relaxare sau energie pe parcursul zilei.',
  'prod-desert': 'Prăjituri și gustări dulci, preparate zilnic.',
  'prod-micdejun': 'Opțiuni consistente, inspirate de meniul modern de cafenea.',
};

export default function ProductsCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('id,name,price,category,description,image,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        setErrorMessage('Meniul nu poate fi încărcat momentan. Încearcă din nou puțin mai târziu.');
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    }

    loadProducts();
    return () => { active = false; };
  }, []);

  const categories = [...new Set(products.map((product) => product.category))];

  return (
    <div className="products-main header-padded">
      <section className="section contact-hero">
        <div className="container">
          <div className="contact-hero-card">
            <p className="section-kicker">Selectează ce ți se potrivește</p>
            <h1 className="section-title">Produse</h1>
            <p>Băuturi, deserturi și opțiuni de mic dejun pentru orice moment al zilei.</p>
          </div>
        </div>
      </section>

      <section className="section products-section">
        <div className="container products-layout">
          <aside className="products-sidebar">
            <h2>Categorii</h2>
            <nav aria-label="Categorii produse">
              {categories.map((category) => <a key={category} href={`#cat-${category}`}>{CATEGORY_NAMES[category] || category}</a>)}
            </nav>
            <p className="products-side-note">Toate produsele sunt preparate din ingrediente proaspete, iar meniul poate fi personalizat la cerere.</p>
          </aside>

          <div className="products-content">
            {loading && <p className="dashboard-empty" role="status">Se încarcă meniul…</p>}
            {errorMessage && <p className="form-status is-error" role="alert">{errorMessage}</p>}
            {!loading && !errorMessage && products.length === 0 && <p className="dashboard-empty">Momentan nu există produse disponibile.</p>}
            {categories.map((category) => (
              <section key={category} className="products-category" id={`cat-${category}`}>
                <h2>{CATEGORY_NAMES[category] || category}</h2>
                <p>{CATEGORY_DESCRIPTIONS[category] || ''}</p>
                <div className="products-grid">
                  {products.filter((product) => product.category === category).map((product) => (
                    <article key={product.id} className="product-card">
                      <Image
                        src={product.image || '/img/favicon.svg'}
                        alt={product.name}
                        width={900}
                        height={900}
                        sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      />
                      <div className="product-card-body">
                        <h3>{product.name}</h3>
                        {product.description && <p>{product.description}</p>}
                        <div className="product-card-meta">
                          <span className="product-price">{Number(product.price).toFixed(2)} MDL</span>
                          <AddToCartButton product={product} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

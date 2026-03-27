document.addEventListener("DOMContentLoaded", async () => {
  const productsContainer = document.getElementById("productsContainer");
  const categoryLinks = document.querySelectorAll(".products-sidebar .category-nav-link");

  if (!productsContainer) return;

  const categoryDescriptions = {
    "prod-cafea": "Băuturi clasice și de autor, cu boabe atent selecționate.",
    "prod-migdale": "Alternative pe bază de lapte vegetal, aromate și echilibrate.",
    "prod-ceai": "Sortimente pentru relaxare sau energie pe parcursul zilei.",
    "prod-desert": "Prăjituri și gustări dulci, preparate zilnic.",
    "prod-micdejun": "Opțiuni consistente, inspirate de meniul modern de cafenea.",
  };

  let allProducts = [];

  async function fetchProducts() {
    try {
      const productsJsonUrl = new URL("./products.json", import.meta.url);
      const response = await fetch(productsJsonUrl);

      if (!response.ok) {
        throw new Error(`Eroare HTTP: ${response.status}`);
      }

      allProducts = await response.json();
      renderProducts(allProducts);
    } catch (error) {
      console.error("Eroare la încărcarea produselor:", error);
      productsContainer.innerHTML =
        '<p class="form-status is-error" style="text-align: center; padding: 2rem;">Nu s-au putut încărca produsele. Verifică dacă fișierul <code>data/products.json</code> există și dacă serverul local pornește din rădăcina proiectului.</p>';
    }
  }

  function renderProducts(productsToRender) {
    productsContainer.innerHTML = "";

    const groupedProducts = productsToRender.reduce((accumulator, product) => {
      if (!accumulator[product.category]) {
        accumulator[product.category] = [];
      }

      accumulator[product.category].push(product);
      return accumulator;
    }, {});

    Object.entries(groupedProducts).forEach(([categoryId, products]) => {
      const categorySection = document.createElement("section");
      categorySection.classList.add("products-category", "product-category-section");
      categorySection.id = categoryId;

      const categoryLink = document.querySelector(`[data-category-id="${categoryId}"]`);
      const categoryName = categoryLink ? categoryLink.textContent.trim() : categoryId;
      const categoryDescriptionText = categoryDescriptions[categoryId] || "";

      categorySection.innerHTML = `
        <h2>${categoryName}</h2>
        <p>${categoryDescriptionText}</p>
        <div class="products-grid"></div>
      `;

      const productsGrid = categorySection.querySelector(".products-grid");

      products.forEach((product) => {
        const productCard = document.createElement("article");
        productCard.classList.add("product-card");
        productCard.innerHTML = `
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-card-body">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="product-card-meta">
              <span class="product-price">${product.price} MDL</span>
              <button type="button" class="add-to-cart-btn" data-name="${product.name}" data-price="${product.price}">În coș</button>
            </div>
          </div>
        `;
        productsGrid.appendChild(productCard);
      });

      productsContainer.appendChild(categorySection);
    });

    if (allProducts.length > 0 && categoryLinks.length > 0) {
      showCategory(categoryLinks[0].getAttribute("data-category-id"));
    }
  }

  function showCategory(categoryId) {
    document.querySelectorAll(".products-content .product-category-section").forEach((category) => {
      category.style.display = category.id === categoryId ? "block" : "none";
    });

    categoryLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("data-category-id") === categoryId);
    });
  }

  categoryLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showCategory(link.getAttribute("data-category-id"));
    });
  });

  productsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".add-to-cart-btn");
    if (!button) return;

    const name = button.getAttribute("data-name");
    const price = Number(button.getAttribute("data-price"));

    import("../scripts/supabase.js")
      .then(({ addToCart }) => addToCart(name, price, 1))
      .catch((error) => {
        console.error("Nu s-a putut încărca modulul pentru coș:", error);
        alert("Funcția de cumpărare nu este disponibilă momentan.");
      });
  });

  fetchProducts();
});

/**
 * cart.js — логика страницы корзины (cos.html)
 * Загружает cart_items пользователя, позволяет менять кол-во,
 * удалять позиции и оформить заказ (placeOrder).
 */
import { supabase, placeOrder, getActiveSession } from './supabase.js';

const cartLoading = document.getElementById('cartLoading');
const cartContent = document.getElementById('cartContent');

// ── Состояние ──────────────────────────────────────────────
let cartItems = [];   // { id, product_name, price, quantity }
let userId    = null;

// ── Загрузка сессии и корзины ──────────────────────────────
async function init() {
  const session = await getActiveSession();

  if (!session) {
    // Не авторизован — редирект
    cartLoading.innerHTML = `
      <div class="cart-empty">
        <span class="material-icons-outlined">lock</span>
        <p>Trebuie să fii autentificat pentru a vedea coșul.</p>
        <a href="login.html" class="book-btn">Autentificare</a>
      </div>`;
    return;
  }

  userId = session.user.id;
  await loadCart();
}

async function loadCart() {
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, product_name, price, quantity')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    cartLoading.innerHTML = `<p class="form-status is-error">Nu s-a putut încărca coșul: ${error.message}</p>`;
    return;
  }

  cartItems = data || [];
  cartLoading.style.display = 'none';
  cartContent.style.display = 'block';
  render();
}

// ── Рендер ─────────────────────────────────────────────────
function render() {
  if (cartItems.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <span class="material-icons-outlined">shopping_cart</span>
        <p>Coșul tău este gol.</p>
        <a href="produse.html" class="book-btn">Mergi la produse</a>
      </div>`;
    return;
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const rows = cartItems.map(item => `
    <tr data-id="${item.id}">
      <td class="product-name">${escHtml(item.product_name)}</td>
      <td class="product-price">${item.price.toFixed(2)} MDL</td>
      <td>
        <div class="qty-control">
          <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Scade cantitatea">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Crește cantitatea">+</button>
        </div>
      </td>
      <td class="product-price">${(item.price * item.quantity).toFixed(2)} MDL</td>
      <td>
        <button class="remove-btn" data-action="remove" data-id="${item.id}" aria-label="Elimină produsul">
          <span class="material-icons-outlined" style="font-size:1.1rem;">delete_outline</span>
        </button>
      </td>
    </tr>
  `).join('');

  cartContent.innerHTML = `
    <table class="cart-table" aria-label="Produse în coș">
      <thead>
        <tr>
          <th>Produs</th>
          <th>Preț unitar</th>
          <th>Cantitate</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="checkout-notes">
      <label for="orderNotes">Notă pentru comandă (opțional)</label>
      <textarea id="orderNotes" placeholder="Ex: fără zahăr, servit rapid..."></textarea>
    </div>

    <div class="cart-summary">
      <div>
        <div class="cart-total-label">Total comandă</div>
        <div class="cart-total-amount">${total.toFixed(2)} MDL</div>
      </div>
      <button class="checkout-btn" id="checkoutBtn" type="button">
        <span class="material-icons-outlined">check_circle</span>
        Finalizează comanda
      </button>
    </div>

    <p class="cart-status" id="cartStatus" aria-live="polite" style="display:none;"></p>
  `;

  // ── Обработчики ──────────────────────────────────────────
  cartContent.addEventListener('click', handleCartClick);
  document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
}

// ── Обработка кликов по кнопкам ────────────────────────────
async function handleCartClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id } = btn.dataset;

  if (action === 'inc') await changeQty(id, +1);
  if (action === 'dec') await changeQty(id, -1);
  if (action === 'remove') await removeItem(id);
}

async function changeQty(itemId, delta) {
  const item = cartItems.find(i => i.id === itemId);
  if (!item) return;

  const newQty = item.quantity + delta;

  if (newQty < 1) {
    await removeItem(itemId);
    return;
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: newQty })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (!error) {
    item.quantity = newQty;
    render();
  }
}

async function removeItem(itemId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (!error) {
    cartItems = cartItems.filter(i => i.id !== itemId);
    render();
  }
}

// ── Оформление заказа ──────────────────────────────────────
async function handleCheckout() {
  const btn      = document.getElementById('checkoutBtn');
  const statusEl = document.getElementById('cartStatus');
  const notes    = document.getElementById('orderNotes')?.value?.trim() || '';

  btn.disabled = true;
  btn.textContent = 'Se procesează...';
  showStatus(statusEl, '', '');

  const result = await placeOrder(userId, cartItems, notes);

  if (result.success) {
    showStatus(statusEl, '✓ Comanda a fost plasată cu succes! Redirecționare...', 'is-success');
    setTimeout(() => {
      window.location.href = 'profile.html?order=success';
    }, 1800);
  } else {
    showStatus(statusEl, `Eroare: ${result.error}`, 'is-error');
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-outlined">check_circle</span> Finalizează comanda';
  }
}

// ── Утилиты ────────────────────────────────────────────────
function showStatus(el, text, cls) {
  el.textContent = text;
  el.className   = `cart-status ${cls}`;
  el.style.display = text ? 'block' : 'none';
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Старт ──────────────────────────────────────────────────
init();

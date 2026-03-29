/**
 * profile.js — логика страницы профиля пользователя.
 * Загружает данные из Supabase: профиль + реальный список заказов.
 * supabase.js загружается через <script> в <head> — браузер кеширует модуль,
 * повторный import() возвращает тот же экземпляр без дублирования.
 */

document.addEventListener('DOMContentLoaded', async function () {
  const { supabase } = await import('./supabase.js');


  // ── DOM-элементы ────────────────────────────────────────
  const profileName      = document.getElementById('profileName');
  const profileEmail     = document.getElementById('profileEmail');
  const profileCreatedAt = document.getElementById('profileCreatedAt');
  const profileProvider  = document.getElementById('profileProvider');
  const ordersHistory    = document.getElementById('ordersHistory');
  const updateProfileBtn = document.getElementById('updateProfileBtn');
  const profileModal     = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const updateProfileForm = document.getElementById('updateProfileForm');
  const fullNameInput    = document.getElementById('fullName');
  const phoneNumberInput = document.getElementById('phoneNumber');
  const updateProfileStatus = document.getElementById('updateProfileStatus');

  // ── Баннер «Заказ оформлен» при редиректе с cos.html ────
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('order') === 'success') {
    const banner = document.createElement('div');
    banner.className = 'form-status is-success';
    banner.style.cssText = 'padding:1rem 1.5rem;border-radius:0.75rem;margin-bottom:1rem;font-weight:600;';
    banner.textContent = '✓ Comanda ta a fost plasată cu succes! Te vom contacta în curând.';
    ordersHistory.insertAdjacentElement('beforebegin', banner);
    // Убираем параметр из URL
    history.replaceState({}, '', window.location.pathname);
  }

  // ── Загрузка профиля ────────────────────────────────────
  async function loadUserProfile() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = 'login.html';
      return;
    }

    const user = session.user;

    profileName.textContent = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email
      || 'Necunoscut';
    profileEmail.textContent = user.email || '-';
    profileCreatedAt.textContent = new Date(user.created_at).toLocaleDateString('ro-RO');
    profileProvider.textContent = user.app_metadata?.provider || 'Google';

    await loadOrderHistory(user.id);
  }

  // ── Загрузка истории заказов из Supabase ────────────────
  async function loadOrderHistory(userId) {
    ordersHistory.innerHTML = `
      <div class="order-history-container">
        <p class="form-status">Se încarcă comenzile...</p>
      </div>`;

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        total,
        notes,
        created_at,
        order_items ( product_name, price, quantity )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      ordersHistory.innerHTML = `
        <div class="order-history-container">
          <p class="form-status is-error">Nu s-au putut încărca comenzile: ${error.message}</p>
        </div>`;
      return;
    }

    if (!orders || orders.length === 0) {
      ordersHistory.innerHTML = `
        <div class="order-history-container">
          <p class="form-status" style="text-align:center;padding:1.5rem 0;">
            Nu ai nicio comandă încă.
            <br/><br/>
            <a href="produse.html" class="home-gallery-link" style="display:inline-block;margin-top:0.5rem;">Explorează produsele</a>
          </p>
        </div>`;
      return;
    }

    const statusLabel = {
      pending:    { label: 'În așteptare', cls: 'pending'    },
      processing: { label: 'În procesare', cls: 'processing' },
      completed:  { label: 'Completată',   cls: 'completed'  },
      cancelled:  { label: 'Anulată',      cls: 'cancelled'  },
    };

    const rows = orders.map(order => {
      const s = statusLabel[order.status] || { label: order.status, cls: 'pending' };
      const date = new Date(order.created_at).toLocaleDateString('ro-RO', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      const products = order.order_items
        ?.map(i => `${i.product_name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`)
        .join(', ') || '—';

      return `
        <div class="order-item">
          <div class="order-info">
            <div class="order-date">${date}</div>
            <div class="order-products" style="font-size:0.9rem;color:var(--text-muted,#777);margin-top:0.2rem;">${products}</div>
            ${order.notes ? `<div style="font-size:0.82rem;color:var(--text-muted,#777);font-style:italic;margin-top:0.2rem;">${order.notes}</div>` : ''}
          </div>
          <div class="order-details">
            <div class="order-status ${s.cls}">${s.label}</div>
            <div class="order-total">${Number(order.total).toFixed(2)} MDL</div>
          </div>
        </div>`;
    }).join('');

    ordersHistory.innerHTML = `<div class="order-history-container">${rows}</div>`;
  }

  // ── Модальное окно «Обновить профиль» ───────────────────
  updateProfileBtn.addEventListener('click', () => {
    profileModal.style.display = 'grid';
    document.body.classList.add('lightbox-open');
  });

  closeProfileModal.addEventListener('click', closeModal);

  profileModal.addEventListener('click', e => {
    if (e.target === profileModal) closeModal();
  });

  function closeModal() {
    profileModal.style.display = 'none';
    document.body.classList.remove('lightbox-open');
  }

  // ── Сохранение профиля ──────────────────────────────────
  updateProfileForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      updateProfileStatus.textContent = 'Sesiune expirată. Te rugăm să te autentifici din nou.';
      updateProfileStatus.className = 'form-status is-error';
      return;
    }

    const fullName    = fullNameInput.value.trim();
    const phoneNumber = phoneNumberInput.value.trim();

    // Обновляем метаданные auth
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone_number: phoneNumber }
    });

    // Обновляем таблицу profiles
    await supabase.from('profiles').upsert([{
      id:        session.user.id,
      email:     session.user.email,
      full_name: fullName,
      phone:     phoneNumber,
    }], { onConflict: 'id' });

    if (authError) {
      updateProfileStatus.textContent = `Eroare: ${authError.message}`;
      updateProfileStatus.className = 'form-status is-error';
      return;
    }

    updateProfileStatus.textContent = 'Profil actualizat cu succes!';
    updateProfileStatus.className = 'form-status is-success';
    profileName.textContent = fullName || session.user.email || 'Necunoscut';

    setTimeout(closeModal, 1500);
  });

  // ── Старт ───────────────────────────────────────────────
  loadUserProfile();
});
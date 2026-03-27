// Script to handle profile page functionality
document.addEventListener('DOMContentLoaded', async function () {
    // Import the supabase client from the script tag
    const { supabase } = await import('./supabase.js');

    // Get DOM elements
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileCreatedAt = document.getElementById('profileCreatedAt');
    const profileProvider = document.getElementById('profileProvider');
    const ordersHistory = document.getElementById('ordersHistory');
    const updateProfileBtn = document.getElementById('updateProfileBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const updateProfileForm = document.getElementById('updateProfileForm');
    const fullNameInput = document.getElementById('fullName');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const updateProfileStatus = document.getElementById('updateProfileStatus');

    // Function to load user profile
    async function loadUserProfile() {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            console.error('Error getting session:', error);
            window.location.href = 'login.html';
            return;
        }

        const user = session.user;

        // Display user info
        profileName.textContent = user.user_metadata.full_name || user.user_metadata.name || user.email || 'Necunoscut';
        profileEmail.textContent = user.email || '-';

        // Format creation date
        const createdAt = new Date(user.created_at);
        profileCreatedAt.textContent = createdAt.toLocaleDateString('ro-RO');

        // Display provider
        profileProvider.textContent = user.app_metadata.provider || 'Google';

        // Load order history
        await loadOrderHistory(user.id);
    }

    // Function to load order history
    async function loadOrderHistory(userId) {
        // For now, we'll simulate order history since the schema isn't fully defined
        // In a real implementation, you would query the orders table
        ordersHistory.innerHTML = `
        <div class="order-history-container">
          <div class="order-item">
            <div class="order-info">
              <div class="order-date">2026-02-15</div>
              <div class="order-products">Cappuccino, Tiramisu</div>
            </div>
            <div class="order-details">
              <div class="order-status completed">Completată</div>
              <div class="order-total">125 MDL</div>
            </div>
          </div>
          <div class="order-item">
            <div class="order-info">
              <div class="order-date">2026-01-28</div>
              <div class="order-products">Latte, Croissant</div>
            </div>
            <div class="order-details">
              <div class="order-status processing">În procesare</div>
              <div class="order-total">95 MDL</div>
            </div>
          </div>
          <div class="order-item">
            <div class="order-info">
              <div class="order-date">2025-12-10</div>
              <div class="order-products">Espresso, Donut</div>
            </div>
            <div class="order-details">
              <div class="order-status pending">În așteptare</div>
              <div class="order-total">78 MDL</div>
            </div>
          </div>
          <div class="order-item">
            <div class="order-info">
              <div class="order-date">2025-11-05</div>
              <div class="order-products">Americano, Granola cu fructe</div>
            </div>
            <div class="order-details">
              <div class="order-status completed">Completată</div>
              <div class="order-total">142 MDL</div>
            </div>
          </div>
        </div>
      `;
    }

    // Event listeners for profile modal
    updateProfileBtn.addEventListener('click', function () {
        profileModal.style.display = 'grid';
        document.body.classList.add('lightbox-open');
    });

    closeProfileModal.addEventListener('click', function () {
        profileModal.style.display = 'none';
        document.body.classList.remove('lightbox-open');
    });

    // Close modal when clicking outside
    profileModal.addEventListener('click', function (e) {
        if (e.target === profileModal) {
            profileModal.style.display = 'none';
            document.body.classList.remove('lightbox-open');
        }
    });

    // Handle profile update form submission
    updateProfileForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            updateProfileStatus.textContent = 'Sesiune expirată. Te rugăm să te autentifici din nou.';
            updateProfileStatus.className = 'form-status is-error';
            return;
        }

        const userId = session.user.id;
        const fullName = fullNameInput.value.trim();
        const phoneNumber = phoneNumberInput.value.trim();

        // Update user metadata in Supabase
        const { error } = await supabase.auth.updateUser({
            data: {
                full_name: fullName,
                phone_number: phoneNumber
            }
        });

        if (error) {
            console.error('Error updating user:', error);
            updateProfileStatus.textContent = `Eroare: ${error.message}`;
            updateProfileStatus.className = 'form-status is-error';
        } else {
            updateProfileStatus.textContent = 'Profil actualizat cu succes!';
            updateProfileStatus.className = 'form-status is-success';

            // Update the displayed name
            profileName.textContent = fullName || session.user.email || 'Necunoscut';

            // Close modal after a short delay
            setTimeout(() => {
                profileModal.style.display = 'none';
                document.body.classList.remove('lightbox-open');
            }, 1500);
        }
    });

    // Initialize the page
    loadUserProfile();
});
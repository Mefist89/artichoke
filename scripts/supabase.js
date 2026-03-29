import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://vyqiuntqyarifqtzkyta.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cWl1bnRxeWFyaWZxdHpreXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkxNDIsImV4cCI6MjA5MDAxNTE0Mn0.urwNi_tsvWC9r6E-yz9NFKjtZ0eXLgNq3ESl1t_1pbU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const indexPageUrl = new URL("../index.html", import.meta.url);
const loginPageUrl = new URL("../pages/login.html", import.meta.url);
const registerPageUrl = new URL("../pages/register.html", import.meta.url);
const profilePageUrl = new URL("../pages/profile.html", import.meta.url);

const authUserNameEl = document.getElementById("authUserName");
const authLoginLinkEl = document.getElementById("authLoginLink");
const authLogoutBtnEl = document.getElementById("authLogoutBtn");

function setStatus(statusEl, text, type = "info") {
  if (!statusEl) return;

  statusEl.textContent = text;
  statusEl.classList.remove("is-error", "is-success");

  if (type === "error") statusEl.classList.add("is-error");
  if (type === "success") statusEl.classList.add("is-success");
}

function getProfileName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    "Cont Google"
  );
}

function updateAuthHeader(session) {
  if (!authUserNameEl || !authLoginLinkEl || !authLogoutBtnEl) return;

  if (session?.user) {
    authUserNameEl.textContent = getProfileName(session.user);
    authUserNameEl.hidden = false;
    authLoginLinkEl.hidden = true;
    authLogoutBtnEl.hidden = false;
    return;
  }

  authUserNameEl.textContent = "";
  authUserNameEl.hidden = true;
  authLoginLinkEl.hidden = false;
  authLogoutBtnEl.hidden = true;
}

function isAuthPage() {
  const currentPath = window.location.pathname;
  return currentPath.endsWith("/login.html") || currentPath.endsWith("/register.html");
}

function isGmailUser(user) {
  return typeof user?.email === "string" && user.email.toLowerCase().endsWith("@gmail.com");
}

async function getActiveSession() {
  try {
    // Пробуем получить сессию через SDK с таймаутом 3с
    const timeoutResult = { data: { session: null }, error: null, timedOut: true };
    const timeout = new Promise((resolve) => setTimeout(() => resolve(timeoutResult), 3000));
    const result = await Promise.race([supabase.auth.getSession(), timeout]);

    if (result.timedOut) {
      // SDK завис — пробуем достать сессию из localStorage
      return getSessionFromStorage();
    }

    const { data: { session }, error } = result;
    if (error) {
      console.error("Nu s-a putut obține sesiunea curentă:", error);
      return null;
    }

    return session;
  } catch (e) {
    console.error("Excepție la obținerea sesiunii:", e);
    return getSessionFromStorage();
  }
}

/**
 * Запасной метод: достаём сессию прямо из localStorage.
 * Supabase хранит её в ключе формата "sb-<ref>-auth-token".
 */
function getSessionFromStorage() {
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
    if (!key) return null;

    const raw = JSON.parse(localStorage.getItem(key));
    return raw || null;
  } catch {
    return null;
  }
}

async function syncProfile(user) {
  if (!user) return;

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    null;

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const { error } = await supabase.from("profiles").upsert(
    [
      {
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
        provider: "google",
      },
    ],
    { onConflict: "id" },
  );

  if (error) {
    console.error("Nu s-a putut sincroniza profilul:", error);
  }
}

async function enforceGmailAccount(session, statusEl = null) {
  if (!session?.user) return false;

  if (isGmailUser(session.user)) {
    await syncProfile(session.user);
    return true;
  }

  console.error("Autentificare refuzată: contul nu este Gmail.", session.user.email);
  await supabase.auth.signOut();
  setStatus(statusEl, "Se acceptă doar conturi Gmail.", "error");

  if (!isAuthPage()) {
    alert("Se acceptă doar autentificarea cu conturi Gmail.");
    window.location.href = loginPageUrl.href;
  }

  return false;
}

const googleAuthBtns = document.querySelectorAll(".google-auth-btn");

if (googleAuthBtns.length > 0) {
  googleAuthBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const statusEl = document.getElementById("authStatus");
      setStatus(statusEl, "Redirecționare către Google...");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: profilePageUrl.href,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });

      if (error) {
        console.error("Eroare la autentificarea cu Google:", error);
        setStatus(statusEl, `Eroare: ${error.message}`, "error");
      }
    });
  });
}

if (authLogoutBtnEl) {
  authLogoutBtnEl.addEventListener("click", async () => {
    authLogoutBtnEl.disabled = true;
    authLogoutBtnEl.textContent = "...";

    // 1. Curăță IMEDIAT sesiunea din localStorage (nu depinde de rețea)
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
        .forEach((k) => localStorage.removeItem(k));
    } catch (e) {}

    // 2. Încearcă signOut oficial cu timeout de 1.5s
    try {
      const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.race([supabase.auth.signOut({ scope: "local" }), timeout]);
    } catch (e) {}

    // 3. Actualizează UI și redirecționează
    updateAuthHeader(null);
    window.location.href = loginPageUrl.href;
  });
}

getActiveSession().then(async (session) => {
  updateAuthHeader(session);

  if (!session) {
    console.log("Utilizatorul nu este autentificat.");
    return;
  }

  const statusEl = document.getElementById("authStatus");
  const allowed = await enforceGmailAccount(session, statusEl);
  if (!allowed) return;

  console.log("Utilizator autentificat:", session.user.email);

  if (isAuthPage()) {
    window.location.replace(profilePageUrl.href);
  }
});

supabase.auth.onAuthStateChange(async (event, session) => {
  updateAuthHeader(session);

  if (event === "SIGNED_IN" && session?.user) {
    const statusEl = document.getElementById("authStatus");
    const allowed = await enforceGmailAccount(session, statusEl);

    if (allowed) {
      console.log("Autentificare reușită:", session.user.email);
      if (isAuthPage()) {
        window.location.replace(profilePageUrl.href);
      }
    }
  }

  if (event === "SIGNED_OUT") {
    console.log("Utilizatorul s-a deconectat.");
  }
});

export async function addToCart(productName, price, quantity = 1) {
  const session = await getActiveSession();

  if (!session) {
    window.location.href = loginPageUrl.href;
    return false;
  }

  const normalizedPrice    = Number(price);
  const normalizedQuantity = Number(quantity);

  if (!productName || !Number.isFinite(normalizedPrice) || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    console.error("Date invalide pentru adăugarea în coș:", { productName, price, quantity });
    return false;
  }

  const { error } = await supabase.from("cart_items").insert([
    {
      user_id: session.user.id,
      product_name: productName,
      price: normalizedPrice,
      quantity: normalizedQuantity,
    },
  ]);

  if (error) {
    console.error("Eroare la adăugarea în coș:", error);
    return false;
  }

  return true;
}

/**
 * placeOrder — переносит cartItems в orders + order_items, затем
 * очищает корзину пользователя. Возвращает { success, orderId?, error? }.
 */
export async function placeOrder(userId, cartItems, notes = '') {
  if (!userId || !cartItems || cartItems.length === 0) {
    return { success: false, error: 'Coșul este gol.' };
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 1. Создаём заказ
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{ user_id: userId, status: 'pending', total, notes }])
    .select('id')
    .single();

  if (orderError) {
    console.error('Eroare la crearea comenzii:', orderError);
    return { success: false, error: orderError.message };
  }

  const orderId = orderData.id;

  // 2. Добавляем позиции заказа
  const items = cartItems.map(item => ({
    order_id:     orderId,
    product_name: item.product_name,
    price:        item.price,
    quantity:     item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(items);

  if (itemsError) {
    console.error('Eroare la salvarea produselor comenzii:', itemsError);
    // Заказ создан, но позиции не вставлены — помечаем как отменённый
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    return { success: false, error: itemsError.message };
  }

  // 3. Очищаем корзину
  const { error: clearError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);

  if (clearError) {
    console.warn('Coșul nu a putut fi golit automat:', clearError);
    // Не критично — заказ уже создан
  }

  return { success: true, orderId };
}

export function openLoginPage() {
  window.location.href = loginPageUrl.href;
}

export function openRegisterPage() {
  window.location.href = registerPageUrl.href;
}

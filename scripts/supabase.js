import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ВАЖНО: Замените эти данные на ваши URL и ANON KEY из панели управления Supabase (Settings -> API)
const supabaseUrl = "https://YOUR_PROJECT_ID.supabase.co";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function setStatus(statusEl, text, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("is-error", "is-success");
    if (type === "error") statusEl.classList.add("is-error");
    if (type === "success") statusEl.classList.add("is-success");
}

// Обработка формы Логина
const loginForm = document.getElementById("loginForm");
const loginStatusEl = document.getElementById("loginStatus");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(loginStatusEl, "Se procesează...");

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setStatus(loginStatusEl, `Eroare: ${error.message}`, "error");
        } else {
            setStatus(loginStatusEl, "Autentificare cu succes!", "success");
            // Перенаправляем на главную или в будущий личный кабинет
            setTimeout(() => window.location.href = "../index.html", 1500);
        }
    });
}

// Обработка формы Регистрации
const registerForm = document.getElementById("registerForm");
const registerStatusEl = document.getElementById("registerStatus");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setStatus(registerStatusEl, "Se procesează...");

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setStatus(registerStatusEl, `Eroare: ${error.message}`, "error");
        } else {
            // По умолчанию Supabase требует подтверждения email. 
            // Если вы отключите Confirm Email в настройках Supabase Auth, пользователь сразу войдет.
            setStatus(registerStatusEl, "Cont creat cu succes! Verifică emailul pentru confirmare.", "success");
            registerForm.reset();
        }
    });
}

// Обработка входа/регистрации через Google
const googleAuthBtns = document.querySelectorAll(".google-auth-btn");

if (googleAuthBtns.length > 0) {
    googleAuthBtns.forEach(btn => {
        btn.addEventListener("click", async () => {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google'
            });
        });
    });
}
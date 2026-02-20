import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZkHxKXEYi_wGlmLg-3BdbAoZQWEsiZ-c",
  authDomain: "rezervari-e8d10.firebaseapp.com",
  databaseURL: "https://rezervari-e8d10-default-rtdb.firebaseio.com",
  projectId: "rezervari-e8d10",
  storageBucket: "rezervari-e8d10.firebasestorage.app",
  messagingSenderId: "341271581795",
  appId: "1:341271581795:web:cac44e827dcecd9d8b1456",
  measurementId: "G-77DZ2PZC5B",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function setStatus(statusEl, text, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.classList.remove("is-error", "is-success");
  if (type === "error") statusEl.classList.add("is-error");
  if (type === "success") statusEl.classList.add("is-success");
}

const bookingForm = document.getElementById("bookingForm");
const bookingStatusEl = document.getElementById("bookingStatus");

if (bookingForm) {
  const form = bookingForm;
  const statusEl = bookingStatusEl;
  const submitButton = form.querySelector('button[type="submit"]');
  const dateInput = form.querySelector('input[name="date"]');

  if (dateInput) {
    const today = new Date();
    const yyyy = String(today.getFullYear());
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(statusEl, "");

    const formData = new FormData(form);
    const data = {
      name: (formData.get("name") || "").toString().trim(),
      phone: (formData.get("phone") || "").toString().trim(),
      date: (formData.get("date") || "").toString().trim(),
      time: (formData.get("time") || "").toString().trim(),
      guests: Number(formData.get("guests") || 1),
      zone: (formData.get("zone") || "").toString().trim(),
      message: (formData.get("message") || "").toString().trim(),
      createdAt: serverTimestamp(),
      source: "website_rezervari_form",
    };

    if (!data.name || !data.phone || !data.date || !data.time) {
      setStatus(statusEl, "Completează câmpurile obligatorii.", "error");
      return;
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const docRef = await addDoc(collection(db, "rezervari"), data);
      form.reset();
      setStatus(statusEl, `Rezervarea a fost trimisă. ID: ${docRef.id}`, "success");
    } catch (error) {
      console.error("Failed to save reservation:", error);
      setStatus(statusEl, "Eroare la trimitere. Încearcă din nou.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

const contactForm = document.getElementById("contactForm");
const contactStatusEl = document.getElementById("contactStatus");

if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(contactStatusEl, "");

    const formData = new FormData(contactForm);
    const data = {
      name: (formData.get("name") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      subject: (formData.get("subject") || "").toString().trim(),
      message: (formData.get("message") || "").toString().trim(),
      createdAt: serverTimestamp(),
      source: "website_contact_form",
    };

    if (!data.name || !data.email || !data.subject || !data.message) {
      setStatus(contactStatusEl, "Completează câmpurile obligatorii.", "error");
      return;
    }

    if (submitButton) submitButton.disabled = true;

    try {
      const docRef = await addDoc(collection(db, "contact_messages"), data);
      contactForm.reset();
      setStatus(contactStatusEl, `Mesajul a fost trimis. ID: ${docRef.id}`, "success");
    } catch (error) {
      console.error("Failed to save contact message:", error);
      setStatus(contactStatusEl, "Eroare la trimitere. Încearcă din nou.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

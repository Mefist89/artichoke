const root = document.documentElement;
const themeBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const savedTheme = localStorage.getItem("coffee-theme");

if (savedTheme === "dark") {
  root.classList.add("dark");
}

const syncThemeIcon = () => {
  themeIcon.textContent = root.classList.contains("dark") ? "light_mode" : "dark_mode";
};

syncThemeIcon();

themeBtn?.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("coffee-theme", root.classList.contains("dark") ? "dark" : "light");
  syncThemeIcon();
});

const navToggle = document.getElementById("navToggle");
const mobileNav = document.getElementById("mobileNav");

const closeMobileNav = () => {
  document.body.classList.remove("nav-open");
  navToggle?.setAttribute("aria-expanded", "false");
};

navToggle?.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

mobileNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileNav();
  });
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("nav-open")) return;
  const target = event.target;
  if (navToggle?.contains(target) || mobileNav?.contains(target)) return;
  closeMobileNav();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileNav();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    closeMobileNav();
  }
});

const slides = Array.from(document.querySelectorAll(".slide"));
const dotsWrap = document.getElementById("sliderDots");
const sliderButtons = document.querySelectorAll("[data-slide]");

let currentIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
if (currentIndex < 0) currentIndex = 0;

const dots = slides.map((_, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "slider-dot";
  dot.setAttribute("aria-label", `Diapozitiv ${index + 1}`);
  dot.addEventListener("click", () => setSlide(index));
  dotsWrap?.append(dot);
  return dot;
});

const renderSlides = () => {
  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === currentIndex);
  });
  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === currentIndex);
  });
};

const setSlide = (index) => {
  currentIndex = (index + slides.length) % slides.length;
  renderSlides();
};

sliderButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.getAttribute("data-slide");
    setSlide(direction === "next" ? currentIndex + 1 : currentIndex - 1);
  });
});

if (slides.length > 1) {
  renderSlides();
  setInterval(() => {
    setSlide(currentIndex + 1);
  }, 5000);
}

const scrollTopBtn = document.createElement("button");
scrollTopBtn.type = "button";
scrollTopBtn.className = "scroll-top-btn";
scrollTopBtn.setAttribute("aria-label", "Sus");
scrollTopBtn.innerHTML = '<span class="material-icons-outlined" aria-hidden="true">north</span>';
document.body.append(scrollTopBtn);

const toggleScrollTopBtn = () => {
  const isVisible = window.scrollY > 360;
  scrollTopBtn.classList.toggle("is-visible", isVisible);
};

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", toggleScrollTopBtn, { passive: true });
toggleScrollTopBtn();

const lightboxImages = Array.from(document.querySelectorAll("main img"));

if (lightboxImages.length) {
  const lightboxOverlay = document.createElement("div");
  lightboxOverlay.className = "lightbox-overlay";
  lightboxOverlay.setAttribute("aria-hidden", "true");
  lightboxOverlay.innerHTML = `
    <div class="lightbox-frame" role="dialog" aria-modal="true" aria-label="Image preview">
      <button type="button" class="lightbox-close" aria-label="Close preview">
        <span class="material-icons-outlined" aria-hidden="true">close</span>
      </button>
      <button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image">
        <span class="material-icons-outlined" aria-hidden="true">chevron_left</span>
      </button>
      <img class="lightbox-image" alt="" />
      <button type="button" class="lightbox-nav lightbox-next" aria-label="Next image">
        <span class="material-icons-outlined" aria-hidden="true">chevron_right</span>
      </button>
      <p class="lightbox-caption"></p>
    </div>
  `;
  document.body.append(lightboxOverlay);

  const lightboxImage = lightboxOverlay.querySelector(".lightbox-image");
  const lightboxCaption = lightboxOverlay.querySelector(".lightbox-caption");
  const lightboxPrev = lightboxOverlay.querySelector(".lightbox-prev");
  const lightboxNext = lightboxOverlay.querySelector(".lightbox-next");
  const lightboxClose = lightboxOverlay.querySelector(".lightbox-close");

  let lightboxIndex = 0;

  const isLightboxOpen = () => lightboxOverlay.classList.contains("is-open");

  const renderLightbox = () => {
    const current = lightboxImages[lightboxIndex];
    if (!current || !lightboxImage || !lightboxCaption) return;
    lightboxImage.src = current.currentSrc || current.src;
    lightboxImage.alt = current.alt || "Image";
    lightboxCaption.textContent = current.alt || "";
    lightboxCaption.hidden = !current.alt;
  };

  const openLightbox = (index) => {
    lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
    renderLightbox();
    lightboxOverlay.classList.add("is-open");
    lightboxOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    closeMobileNav();
  };

  const closeLightbox = () => {
    lightboxOverlay.classList.remove("is-open");
    lightboxOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
  };

  const shiftLightbox = (step) => {
    lightboxIndex = (lightboxIndex + step + lightboxImages.length) % lightboxImages.length;
    renderLightbox();
  };

  lightboxImages.forEach((img, index) => {
    img.classList.add("lightbox-enabled");
    img.addEventListener("click", () => {
      openLightbox(index);
    });
  });

  lightboxOverlay.addEventListener("click", (event) => {
    if (event.target === lightboxOverlay) {
      closeLightbox();
    }
  });

  lightboxPrev?.addEventListener("click", () => {
    shiftLightbox(-1);
  });

  lightboxNext?.addEventListener("click", () => {
    shiftLightbox(1);
  });

  lightboxClose?.addEventListener("click", closeLightbox);

  window.addEventListener("keydown", (event) => {
    if (!isLightboxOpen()) return;

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      shiftLightbox(-1);
    } else if (event.key === "ArrowRight") {
      shiftLightbox(1);
    }
  });
}

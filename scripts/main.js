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

// Add profile link to navigation when user is authenticated
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have auth elements on the page
  const authUserNameEl = document.getElementById("authUserName");
  const authLoginLinkEl = document.getElementById("authLoginLink");

  if (authUserNameEl && authLoginLinkEl) {
    // Determine the correct path to the profile page based on current location
    const currentPath = window.location.pathname;
    let profilePath;

    if (currentPath.includes('/pages/')) {
      // If we're in the pages directory, go up one level
      profilePath = './profile.html';
    } else {
      // If we're in the root directory, go to pages subdirectory
      profilePath = './pages/profile.html';
    }

    // Create a profile link element for desktop navigation
    const profileLink = document.createElement('a');
    profileLink.href = profilePath;
    profileLink.textContent = 'Profil';
    profileLink.className = 'auth-link-btn';

    // Insert the profile link before the login link in desktop navigation
    authLoginLinkEl.parentNode.insertBefore(profileLink, authLoginLinkEl);

    // Store reference to the profile link for later use
    const profileLinkEl = authLoginLinkEl.previousElementSibling;

    // Also add profile link to mobile navigation if it exists
    const mobileNav = document.querySelector('.mobile-nav .mobile-nav-inner');
    if (mobileNav) {
      const mobileProfileLink = document.createElement('a');
      mobileProfileLink.href = profilePath;
      mobileProfileLink.textContent = 'Profil';
      mobileProfileLink.className = 'profile-mobile-link';

      // Find the login link in mobile navigation to insert before it
      const mobileLoginLink = mobileNav.querySelector('a[href="login.html"]');
      if (mobileLoginLink) {
        mobileNav.insertBefore(mobileProfileLink, mobileLoginLink);
      } else {
        // If no login link found, just append to the end
        mobileNav.appendChild(mobileProfileLink);
      }

      // Store reference to mobile profile link
      const mobileProfileLinkEl = mobileLoginLink ? mobileLoginLink.previousElementSibling : mobileNav.lastElementChild;

      // Hide/show mobile profile link based on auth state
      const hideMobileProfileLink = () => {
        if (mobileProfileLinkEl) {
          mobileProfileLinkEl.style.display = 'none';
        }
      };

      const showMobileProfileLink = () => {
        if (mobileProfileLinkEl) {
          mobileProfileLinkEl.style.display = 'block';
        }
      };

      // Update mobile profile link visibility based on auth state
      const updateMobileProfileLinkVisibility = () => {
        if (authUserNameEl.offsetParent !== null) { // Element is visible (user is logged in)
          showMobileProfileLink();
        } else { // Element is hidden (user is not logged in)
          hideMobileProfileLink();
        }
      };

      // Update mobile link when auth state changes
      updateMobileProfileLinkVisibility();
    }

    // Hide profile link when user is not logged in
    const hideProfileLink = () => {
      if (profileLinkEl) {
        profileLinkEl.style.display = 'none';
      }
    };

    // Show profile link when user is logged in
    const showProfileLink = () => {
      if (profileLinkEl) {
        profileLinkEl.style.display = 'inline-flex';
      }
    };

    // Listen for auth state changes to show/hide profile link
    // We'll check the visibility of the username element to determine auth state
    const checkAuthState = () => {
      if (authUserNameEl.offsetParent !== null) { // Element is visible
        showProfileLink();
        // Also update mobile navigation if it exists
        const mobileProfileLink = document.querySelector('.profile-mobile-link');
        if (mobileProfileLink) {
          mobileProfileLink.style.display = 'block';
        }
      } else { // Element is hidden
        hideProfileLink();
        // Also update mobile navigation if it exists
        const mobileProfileLink = document.querySelector('.profile-mobile-link');
        if (mobileProfileLink) {
          mobileProfileLink.style.display = 'none';
        }
      }
    };

    // Run check when page loads
    checkAuthState();

    // Set up a MutationObserver to watch for changes in the auth elements
    const observer = new MutationObserver(checkAuthState);
    observer.observe(authUserNameEl, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }
});

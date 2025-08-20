document.addEventListener("DOMContentLoaded", () => {
  // Initialisiert die Navigation auf jeder Seite
  handleNavSlider();
});

function handleNavSlider() {
  const nav = document.getElementById("main-nav");
  if (!nav) return;

  const slider = nav.querySelector(".nav-slider");
  const activeNavItem = nav.querySelector(
    ".nav-item > a.active"
  )?.parentElement;

  if (activeNavItem) {
    // Kurze Verzögerung, um sicherzustellen, dass der Browser das Layout berechnet hat
    // und die CSS-Transition ausgelöst wird.
    setTimeout(() => {
      slider.style.width = `${activeNavItem.offsetWidth}px`;
      slider.style.left = `${activeNavItem.offsetLeft}px`;
    }, 10);
  }
}

// NEU: Diese Funktion ist jetzt hier, damit sie global verfügbar ist.
function initializeCardNavigation(navId, sectionContainerId) {
  const cards = document.querySelectorAll(`#${navId} .card`);
  const sections = document.querySelectorAll(
    `#${sectionContainerId} .config-section`
  );

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      sections.forEach((s) => s.classList.remove("active"));
      cards.forEach((c) => c.classList.remove("active"));

      const targetId = card.dataset.target;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.classList.add("active");
      }
      card.classList.add("active");

      // Spezifische Aktionen nur für den Konfigurator
      if (navId === "config-nav" && targetId === "config-summary") {
        updateSummary();
      }
    });
  });
}

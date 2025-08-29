// static/js/main.js
// Allgemeine JavaScript-Funktionen für die Navigation und das Verhalten der Website.

document.addEventListener("DOMContentLoaded", () => {
  const headerLogo = document.getElementById("header-logo");

  // Klick auf das Logo führt zur Startseite
  if (headerLogo) {
    headerLogo.addEventListener("click", () => {
      window.location.href = "/";
    });
  }

  // Toggle-Funktion für Dropdown-Menüs
  const dropdowns = document.querySelectorAll(".has-dropdown");
  dropdowns.forEach((dropdown) => {
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation(); // Verhindert, dass der Klick die Seite weiterleitet
      dropdown.classList.toggle("open");
    });
  });

  // Dropdown schließen, wenn außerhalb geklickt wird
  document.addEventListener("click", () => {
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("open");
    });
  });
});

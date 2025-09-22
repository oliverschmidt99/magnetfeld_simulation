// static/js/library.js

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const libResponse = await fetch("/api/library");
    if (!libResponse.ok)
      throw new Error("Bibliotheksdaten konnten nicht geladen werden.");
    const library = await libResponse.json();

    // Initialisiere die neue vertikale Navigation
    initializeLibraryNavigation();

    // Initialisiere den Bauteil-Editor
    await initializeEditor(library);

    // Initialisiere den Material-Editor
    initializeMaterialEditor(library);
  } catch (error) {
    const container = document.getElementById("components");
    container.innerHTML = `<p style="color: red;">Fehler beim Initialisieren der Bibliothek: ${error.message}</p>`;
  }
});

/**
 * Initialisiert die vertikale Seitennavigation für die Bibliotheksseite.
 */
function initializeLibraryNavigation() {
  const navId = "library-nav";
  const sectionContainerId = "library-sections";
  const links = document.querySelectorAll(`#${navId} .nav-link`);
  const sections = document.querySelectorAll(
    `#${sectionContainerId} .config-section`
  );

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // Alle Sektionen ausblenden und Links deaktivieren
      sections.forEach((s) => s.classList.remove("active"));
      links.forEach((l) => l.classList.remove("active"));

      // Zielsektion und zugehörigen Link aktivieren
      const targetElement = document.getElementById(link.dataset.target);
      if (targetElement) {
        targetElement.classList.add("active");
      }
      link.classList.add("active");
    });
  });
}

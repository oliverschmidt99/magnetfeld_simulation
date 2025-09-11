// static/js/library.js

function openTab(evt, tabName) {
  const tabcontent = document.querySelectorAll(".tab-content");
  tabcontent.forEach((tab) => {
    tab.style.display = "none";
    tab.classList.remove("active");
  });

  const tablinks = document.querySelectorAll(".tab-link");
  tablinks.forEach((link) => {
    link.classList.remove("active");
  });

  const currentTab = document.getElementById(tabName);
  currentTab.style.display = "block";
  currentTab.classList.add("active");
  evt.currentTarget.classList.add("active");
}

document.addEventListener("DOMContentLoaded", async () => {
  // Da der HTML-Code jetzt direkt in der Seite ist, können wir den Editor sofort initialisieren.
  try {
    const libResponse = await fetch("/api/library");
    if (!libResponse.ok)
      throw new Error("Bibliotheksdaten konnten nicht geladen werden.");
    const library = await libResponse.json();

    // Initialisiere den Editor, nachdem der Inhalt geladen wurde
    await initializeEditor(library);
  } catch (error) {
    const container = document.getElementById("components");
    container.innerHTML = `<p style="color: red;">Fehler beim Initialisieren des Editors: ${error.message}</p>`;
  }

  // Klicke initial auf den ersten Tab, um ihn zu aktivieren
  const firstTab = document.querySelector(".tab-link");
  if (firstTab) {
    firstTab.click();
  }
});

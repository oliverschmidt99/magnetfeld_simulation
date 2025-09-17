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
  try {
    const libResponse = await fetch("/api/library");
    if (!libResponse.ok)
      throw new Error("Bibliotheksdaten konnten nicht geladen werden.");
    const library = await libResponse.json();

    // Initialisiere den Bauteil-Editor
    await initializeEditor(library);

    // Initialisiere den Material-Editor
    initializeMaterialEditor(library);
  } catch (error) {
    const container = document.getElementById("components");
    container.innerHTML = `<p style="color: red;">Fehler beim Initialisieren der Bibliothek: ${error.message}</p>`;
  }

  const firstTab = document.querySelector(".tab-link");
  if (firstTab) {
    firstTab.click();
  }
});

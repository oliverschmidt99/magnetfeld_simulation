// static/js/configurator-main.js

// Globale Variablen für den Zustand, die von anderen Skripten verwendet werden
let library, spielraumData, schrittweitenData, startposData;
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

document.addEventListener("DOMContentLoaded", () => {
  // Stellt sicher, dass das Skript nur auf der Simulationsseite läuft
  if (document.getElementById("simulation-form")) {
    // Initialisiere die globalen Daten-Konstanten, NACHDEM das DOM geladen ist
    library = JSON.parse(
      document.getElementById("library-data").textContent || "{}"
    );
    spielraumData = JSON.parse(
      document.getElementById("spielraum-data").textContent || "{}"
    );
    schrittweitenData = JSON.parse(
      document.getElementById("schrittweiten-data").textContent || "{}"
    );
    startposData = JSON.parse(
      document.getElementById("startpos-data").textContent || "{}"
    );

    initializeConfigurator();
  }
});

/**
 * Initialisiert die gesamte Konfigurator-Seite.
 */
async function initializeConfigurator() {
  // Zuerst die Blockintegral-Typen vom Backend holen
  let integralTypes = {};
  try {
    const response = await fetch("/api/block_integral_types");
    if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok.");
    integralTypes = await response.json();
  } catch (error) {
    console.error("Fehler beim Laden der Blockintegral-Typen:", error);
    const analysisContainer = document.getElementById("config-analysis");
    if (analysisContainer) {
      analysisContainer.innerHTML =
        "<p style='color: red;'>Fehler: Die Analyse-Optionen konnten nicht geladen werden.</p>";
    }
  }

  // HTML-Templates für die verschiedenen Sektionen laden
  document.getElementById("config-params").innerHTML = getParamsHtml();
  document.getElementById("config-phases").innerHTML = getPhasesHtml();
  document.getElementById("config-assemblies").innerHTML = getAssembliesHtml();
  document.getElementById("config-standalone").innerHTML = getStandaloneHtml();
  document.getElementById("config-analysis").innerHTML =
    getAnalysisSettingsHtml(integralTypes);
  document.getElementById("config-summary").innerHTML = getSummaryHtml();

  // Navigation und Steuer-Elemente initialisieren
  initializeVerticalNavigation("config-nav", "config-sections");
  setupAnalysisControls(); // NEU: Event Listeners für Buttons hinzufügen

  const form = document.getElementById("simulation-form");
  const debouncedUpdate = debounce(updateVisualization, 400);

  // Event-Listener, die bei jeder Änderung den Zustand speichern und die Vorschau aktualisieren
  form.addEventListener("input", (e) => {
    if (e.target.classList.contains("direction-preset")) {
      updateDirectionInputs(e.target);
    }
    saveState();
    debouncedUpdate();
  });

  form.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON" && e.target.type === "button") {
      setTimeout(() => {
        saveState();
        updateVisualization();
      }, 50);
    }
  });

  document.getElementById("ratedCurrent").addEventListener("change", () => {
    updateParametersFromCsv();
    updatePhaseCurrents();
    const data = gatherFormData();
    const asmList = document.getElementById("assemblies-list");
    asmList.innerHTML = "";
    assemblyCounter = 0;
    (data.assemblies || []).forEach((asm) => addAssembly(asm));
    updateAssemblyPhaseDropdowns();
  });

  // Formular-Absende-Logik
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const data = gatherFormData();
    fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.error) {
          alert(`Fehler: ${result.error}`);
        } else {
          alert(result.message);
          document
            .getElementById("simulation-runner")
            .classList.remove("initially-hidden");
        }
      });
  });

  // Event Listener für die Haupt-Aktionsbuttons
  document
    .getElementById("start-simulation-btn")
    ?.addEventListener("click", startSimulation);
  document
    .getElementById("save-config-btn")
    .addEventListener("click", saveConfiguration);
  document
    .getElementById("load-config-btn")
    .addEventListener("click", loadConfiguration);
  document
    .getElementById("load-sim-run-btn")
    .addEventListener("click", loadSimulationRun);

  setupDragAndDrop();
  loadState();
  populateLoadOptions();
  populateSimulationRunOptions();
}

/**
 * Fügt Event Listeners für die "Alle auswählen/abwählen"-Buttons hinzu.
 */
function setupAnalysisControls() {
  const selectAllBtn = document.getElementById("select-all-integrals");
  const deselectAllBtn = document.getElementById("deselect-all-integrals");
  const checkboxes = document.querySelectorAll(
    "#config-analysis .checkbox-item input"
  );

  selectAllBtn?.addEventListener("click", () => {
    checkboxes.forEach((cb) => (cb.checked = true));
  });

  deselectAllBtn?.addEventListener("click", () => {
    checkboxes.forEach((cb) => (cb.checked = false));
  });
}

/**
 * Hilfsfunktion, um eine Funktion nur nach einer kurzen Pause auszuführen (Debouncing).
 */
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// static/js/configurator-main.js

document.addEventListener("DOMContentLoaded", () => {
  // Stellt sicher, dass das Skript nur auf der Simulationsseite läuft
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

// Globale Variablen für den Zustand, die von anderen Skripten verwendet werden
const library = JSON.parse(
  document.getElementById("library-data").textContent || "{}"
);
const spielraumData = JSON.parse(
  document.getElementById("spielraum-data").textContent || "{}"
);
const schrittweitenData = JSON.parse(
  document.getElementById("schrittweiten-data").textContent || "{}"
);
const startposData = JSON.parse(
  document.getElementById("startpos-data").textContent || "{}"
);

let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

/**
 * Initialisiert die gesamte Konfigurator-Seite.
 */
function initializeConfigurator() {
  // HTML-Templates für die verschiedenen Sektionen laden
  document.getElementById("config-params").innerHTML = getParamsHtml();
  document.getElementById("config-phases").innerHTML = getPhasesHtml();
  document.getElementById("config-assemblies").innerHTML = getAssembliesHtml();
  document.getElementById("config-standalone").innerHTML = getStandaloneHtml();
  document.getElementById("config-summary").innerHTML = getSummaryHtml();

  // Navigation initialisieren
  initializeVerticalNavigation("config-nav", "config-sections");

  const form = document.getElementById("simulation-form");
  const debouncedUpdate = debounce(updateVisualization, 400);

  // Event-Listener, die bei jeder Änderung den Zustand speichern und die Vorschau aktualisieren
  form.addEventListener("input", (e) => {
    // Spezielle Behandlung für Richtungspresets, um direkte Aktualisierung zu erzwingen
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
    // Baugruppen-Dropdowns müssen auch aktualisiert werden, da sie vom Nennstrom abhängen
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

  // Richte Drag & Drop für den Dateiupload ein
  setupDragAndDrop();

  // Lade den letzten gespeicherten Zustand oder initialisiere die Seite
  loadState();

  // Fülle die Dropdowns mit gespeicherten Konfigurationen
  populateLoadOptions();
  populateSimulationRunOptions();
}

/**
 * Hilfsfunktion, um eine Funktion nur nach einer kurzen Pause auszuführen (Debouncing).
 * Verhindert, dass bei jeder kleinen Eingabe eine Neuberechnung stattfindet.
 * @param {Function} func Die auszuführende Funktion.
 * @param {number} delay Die Verzögerung in Millisekunden.
 */
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

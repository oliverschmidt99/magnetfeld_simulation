// static/js/configurator.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

const library = JSON.parse(
  document.getElementById("library-data")?.textContent || "{}"
);
const spielraumData = JSON.parse(
  document.getElementById("spielraum-data")?.textContent || "{}"
);
const schrittweitenData = JSON.parse(
  document.getElementById("schrittweiten-data")?.textContent || "{}"
);
const startposData = JSON.parse(
  document.getElementById("startpos-data")?.textContent || "{}"
);

const directionOptions = [
  { value: "Keine Bewegung", text: "Keine Bewegung" },
  { value: "Norden", text: "⬆️ Norden" },
  { value: "Osten", text: "➡️ Osten" },
  { value: "Süden", text: "⬇️ Süden" },
  { value: "Westen", text: "⬅️ Westen" },
  { value: "Nordosten", text: "↗️ Nordosten" },
  { value: "Nordwesten", text: "↖️ Nordwesten" },
  { value: "Südosten", text: "↘️ Südosten" },
  { value: "Südwesten", text: "↙️ Südwesten" },
];

const directionVectors = {
  "Keine Bewegung": { x: 0, y: 0 },
  Norden: { x: 0, y: 1 },
  Osten: { x: 1, y: 0 },
  Süden: { x: 0, y: -1 },
  Westen: { x: -1, y: 0 },
  Nordosten: { x: 1, y: 1 },
  Südosten: { x: 1, y: -1 },
  Südwesten: { x: -1, y: -1 },
  Nordwesten: { x: -1, y: 1 },
};

// Zähler für dynamische Elemente
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

/**
 * Initialisiert den gesamten Konfigurator.
 */
function initializeConfigurator() {
  // 1. HTML-Struktur aus Templates aufbauen
  document.getElementById("config-params").innerHTML =
    getParamsHtml(directionOptions);
  document.getElementById("config-phases").innerHTML = getPhasesHtml();
  document.getElementById("config-assemblies").innerHTML = getAssembliesHtml();
  document.getElementById("config-standalone").innerHTML = getStandaloneHtml();
  document.getElementById("config-summary").innerHTML = getSummaryHtml();

  // 2. Navigation und UI-Elemente initialisieren
  initializeVerticalNavigation("config-nav", "config-sections");
  const svg = document.getElementById("config-preview-svg");
  if (svg) {
    enablePanZoom(svg);
    setupCoordinateDisplay(
      svg,
      document.getElementById("config-preview-coords")
    );
  }

  // 3. Event-Listener zentral setzen
  setupEventListeners();

  // 4. Gespeicherten Zustand laden (oder Standardwerte, falls nichts gespeichert ist)
  loadState();
}

/**
 * Richtet alle zentralen Event-Listener für das Formular ein.
 */
function setupEventListeners() {
  const form = document.getElementById("simulation-form");
  const debouncedUpdate = debounce(updateVisualization, 400);

  // Listener für alle Änderungen an Eingabefeldern
  form.addEventListener("input", () => {
    saveState();
    debouncedUpdate();
  });

  // Listener für Klicks (fängt das Hinzufügen/Entfernen von Elementen ab)
  form.addEventListener("click", (e) => {
    // Prüfen, ob ein Button zum Hinzufügen/Entfernen geklickt wurde
    if (e.target.tagName === "BUTTON" && e.target.type === "button") {
      // Kurze Verzögerung, damit die DOM-Aktion (z.B. removeItem) zuerst ausgeführt wird
      setTimeout(() => {
        saveState();
        updateVisualization();
      }, 50);
    }
  });

  // Spezieller Listener für den Nennstrom, da er abhängige Felder aktualisiert
  document.getElementById("ratedCurrent").addEventListener("change", () => {
    updateParametersFromCsv();
    updatePhaseCurrents();
    // Baugruppen-Liste neu aufbauen, da die Wandler-Optionen sich ändern
    const currentState = gatherFormData(); // Aktuellen Stand sichern
    const asmList = document.getElementById("assemblies-list");
    asmList.innerHTML = "";
    assemblyCounter = 0;
    (currentState.assemblies || []).forEach((asm) => addAssembly(asm));
    updateAssemblyPhaseDropdowns();
    // Nach der Änderung den neuen Zustand speichern
    saveState();
  });

  // Listener für die "Bewegungsrichtung"-Presets
  document.querySelectorAll(".direction-preset").forEach((select) => {
    select.addEventListener("change", () => updateDirectionInputs(select));
  });

  // Formular-Submit-Handler
  form.addEventListener("submit", handleFormSubmit);

  // Simulations-Start-Button
  document
    .getElementById("start-simulation-btn")
    ?.addEventListener("click", startSimulation);
}

function handleFormSubmit(event) {
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
}

/**
 * Wandelt ein Preset (z.B. "Norden") in Vektor-Koordinaten um.
 */
function updateDirectionInputs(selectElement) {
  const selectedDirection = selectElement.value;
  const vector = directionVectors[selectedDirection];
  const targetXInput = document.getElementById(selectElement.dataset.targetX);
  const targetYInput = document.getElementById(selectElement.dataset.targetY);

  if (vector && targetXInput && targetYInput) {
    targetXInput.value = vector.x;
    targetYInput.value = vector.y;
  }
}

/**
 * Hilfsfunktion, um die Ausführung einer Funktion zu verzögern.
 */
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

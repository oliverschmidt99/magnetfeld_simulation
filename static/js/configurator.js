// static/js/configurator.js

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("simulation-form")) {
    initializeConfigurator();
  }
});

// Globale Variablen
const libraryDataElement = document.getElementById("library-data");
const library = libraryDataElement
  ? JSON.parse(libraryDataElement.textContent)
  : {};
const spielraumData = JSON.parse(
  document.getElementById("spielraum-data").textContent
);
const schrittweitenData = JSON.parse(
  document.getElementById("schrittweiten-data").textContent
);
const startposData = JSON.parse(
  document.getElementById("startpos-data").textContent
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

const SQRT2 = Math.sqrt(2);
let phaseCounter = 0;
let assemblyCounter = 0;
let standaloneCounter = 0;

function initializeConfigurator() {
  // HTML-Templates laden
  document.getElementById("config-params").innerHTML =
    getParamsHtml(directionOptions);
  document.getElementById("config-phases").innerHTML = getPhasesHtml();
  document.getElementById("config-assemblies").innerHTML = getAssembliesHtml();
  document.getElementById("config-standalone").innerHTML = getStandaloneHtml();
  document.getElementById("config-summary").innerHTML = getSummaryHtml();

  // Navigation und UI-Elemente initialisieren
  initializeVerticalNavigation("config-nav", "config-sections");
  // setupDragAndDrop(); // Falls du Drag&Drop wieder brauchst, hier einkommentieren

  const svg = document.getElementById("config-preview-svg");
  if (svg) {
    enableSvgZoom(svg);
    setupCoordinateDisplay(svg);
  }

  // Event-Listener setzen
  const form = document.getElementById("simulation-form");
  const debouncedUpdate = debounce(updateVisualization, 400);

  form.addEventListener("input", () => {
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

  form.addEventListener("submit", handleFormSubmit);

  document
    .getElementById("start-simulation-btn")
    ?.addEventListener("click", startSimulation);
  // document
  //   .getElementById("save-config-btn")
  //   .addEventListener("click", saveConfiguration);
  // document
  //   .getElementById("load-config-btn")
  //   .addEventListener("click", loadConfiguration);
  // document
  //   .getElementById("load-sim-run-btn")
  //   .addEventListener("click", loadSimulationRun);

  document.querySelectorAll(".direction-preset").forEach((select) => {
    select.addEventListener("change", () => updateDirectionInputs(select));
  });

  // Initialen Zustand laden
  loadState();
  // populateLoadOptions();
  // populateSimulationRunOptions();
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

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

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

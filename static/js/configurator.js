// static/js/configurator.js
// JavaScript für die Konfigurator-Seite
let libraryData = {};
let currentConfig = {};
const savedScenariosSelect = document.getElementById("saved-scenarios");
const assembliesList = document.getElementById("assemblies-list");
const standaloneList = document.getElementById("standalone-list");
const electricalSystemList = document.getElementById("electrical-system-list");
const summaryOutput = document.getElementById("summary-output");

document.addEventListener("DOMContentLoaded", () => {
  // Lade Bibliotheksdaten aus dem DOM
  try {
    libraryData = JSON.parse(
      document.getElementById("library-data").textContent
    );
  } catch (e) {
    console.error("Fehler beim Laden der Bibliotheksdaten:", e);
  }

  // Initialisiere mit einer Standardkonfiguration
  loadDefaultConfig();

  // Lade gespeicherte Szenarien
  loadSavedScenarios();

  // Event-Listener für die Navigation
  document.getElementById("config-nav").addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    document
      .querySelectorAll("#config-nav .card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    const targetId = card.dataset.target;
    document.querySelectorAll(".config-section").forEach((section) => {
      section.classList.remove("active");
    });
    document.getElementById(targetId).classList.add("active");
    if (targetId === "config-summary") {
      updateSummary();
    }
  });

  // Event-Listener für Buttons
  document
    .getElementById("save-scenario-btn")
    .addEventListener("click", saveScenario);
  document
    .getElementById("load-scenario-btn")
    .addEventListener("click", loadScenario);
  document
    .getElementById("delete-scenario-btn")
    .addEventListener("click", deleteScenario);
  document
    .getElementById("simulation-form")
    .addEventListener("submit", createSimulationFile);

  // Event-Listener für dynamische Listen
  assembliesList.addEventListener("input", updateConfigFromUI);
  standaloneList.addEventListener("input", updateConfigFromUI);
  electricalSystemList.addEventListener("input", updateConfigFromUI);
  document
    .getElementById("config-params")
    .addEventListener("input", updateConfigFromUI);
});

// Standardkonfiguration laden
function loadDefaultConfig() {
  currentConfig = {
    simulationParams: {
      frequencyHz: 50,
      problemDepthM: 30,
      coreRelPermeability: 2500,
    },
    electricalSystem: [{ name: "L1", phaseShiftDeg: 0, peakCurrentA: 5656.85 }],
    assemblies: [],
    standAloneComponents: [],
  };
  renderUIFromConfig();
}

// UI-Elemente basierend auf der aktuellen Konfiguration rendern
function renderUIFromConfig() {
  // Globale Parameter
  for (const key in currentConfig.simulationParams) {
    const input = document.getElementById(key);
    if (input) input.value = currentConfig.simulationParams[key];
  }
  // Dynamische Listen
  renderElectricalSystem();
  renderAssemblies();
  renderStandaloneComponents();
  updateSummary();
}

// UI für das elektrische System rendern
function renderElectricalSystem() {
  electricalSystemList.innerHTML = "";
  currentConfig.electricalSystem.forEach((phase, index) => {
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value="${phase.name}">
                </div>
                <div class="form-group">
                    <label>Phasenverschiebung (°)</label>
                    <input type="number" name="phaseShiftDeg" value="${phase.phaseShiftDeg}">
                </div>
                <div class="form-group">
                    <label>Spitzenstrom (A)</label>
                    <input type="number" step="any" name="peakCurrentA" value="${phase.peakCurrentA}">
                </div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem(this, 'electricalSystem', ${index})">&times;</button>
        `;
    electricalSystemList.appendChild(div);
  });
}
window.addPhase = () => {
  currentConfig.electricalSystem.push({
    name: "",
    phaseShiftDeg: 0,
    peakCurrentA: 0,
  });
  renderElectricalSystem();
};

// UI für Baugruppen rendern
function renderAssemblies() {
  assembliesList.innerHTML = "";
  currentConfig.assemblies.forEach((assembly, index) => {
    const availableRails = (libraryData.components.copperRails || []).map(
      (r) => r.templateProductInformation.name
    );
    const availableTransformers = (
      libraryData.components.transformers || []
    ).map((t) => t.templateProductInformation.name);
    const railOptions = availableRails
      .map(
        (r) =>
          `<option value="${r}" ${
            r === assembly.copperRailName ? "selected" : ""
          }>${r}</option>`
      )
      .join("");
    const transformerOptions = availableTransformers
      .map(
        (t) =>
          `<option value="${t}" ${
            t === assembly.transformerName ? "selected" : ""
          }>${t}</option>`
      )
      .join("");
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" name="name" value="${assembly.name}">
                </div>
                <div class="form-group">
                    <label>Phase</label>
                    <input type="text" name="phaseName" value="${assembly.phaseName}">
                </div>
                <div class="form-group">
                    <label>X-Position (mm)</label>
                    <input type="number" name="position.x" value="${assembly.position.x}">
                </div>
                <div class="form-group">
                    <label>Y-Position (mm)</label>
                    <input type="number" name="position.y" value="${assembly.position.y}">
                </div>
                <div class="form-group">
                    <label>Kupferschiene</label>
                    <select name="copperRailName">${railOptions}</select>
                </div>
                <div class="form-group">
                    <label>Wandler</label>
                    <select name="transformerName">${transformerOptions}</select>
                </div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem(this, 'assemblies', ${index})">&times;</button>
        `;
    assembliesList.appendChild(div);
  });
}
window.addAssembly = () => {
  currentConfig.assemblies.push({
    name: `Assembly_${currentConfig.assemblies.length + 1}`,
    phaseName: "L1",
    position: { x: 0, y: 0 },
    copperRailName: (libraryData.components.copperRails[0] || {})
      .templateProductInformation?.name,
    transformerName: (libraryData.components.transformers[0] || {})
      .templateProductInformation?.name,
  });
  renderAssemblies();
};

// UI für Einzelbauteile rendern
function renderStandaloneComponents() {
  standaloneList.innerHTML = "";
  currentConfig.standAloneComponents.forEach((component, index) => {
    const availableSheets = (
      libraryData.components.transformerSheets || []
    ).map((s) => s.templateProductInformation.name);
    const sheetOptions = availableSheets
      .map(
        (s) =>
          `<option value="${s}" ${
            s === component.name ? "selected" : ""
          }>${s}</option>`
      )
      .join("");
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group">
                    <label>Typ</label>
                    <select name="name">${sheetOptions}</select>
                </div>
                <div class="form-group">
                    <label>X-Position (mm)</label>
                    <input type="number" name="position.x" value="${component.position.x}">
                </div>
                <div class="form-group">
                    <label>Y-Position (mm)</label>
                    <input type="number" name="position.y" value="${component.position.y}">
                </div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem(this, 'standAloneComponents', ${index})">&times;</button>
        `;
    standaloneList.appendChild(div);
  });
}
window.addStandalone = () => {
  currentConfig.standAloneComponents.push({
    name: (libraryData.components.transformerSheets[0] || {})
      .templateProductInformation?.name,
    position: { x: 0, y: 0 },
  });
  renderStandaloneComponents();
};

// Elemente aus den Listen entfernen
window.removeDynamicItem = (btn, listName, index) => {
  currentConfig[listName].splice(index, 1);
  renderUIFromConfig();
};

// Konfiguration aus der UI aktualisieren
function updateConfigFromUI() {
  const form = document.getElementById("simulation-form");
  const formData = new FormData(form);

  // Globale Parameter
  currentConfig.simulationParams.frequencyHz =
    parseFloat(formData.get("frequencyHz")) || 0;
  currentConfig.simulationParams.problemDepthM =
    parseFloat(formData.get("problemDepthM")) || 0;
  currentConfig.simulationParams.coreRelPermeability =
    parseFloat(formData.get("coreRelPermeability")) || 0;

  // Dynamische Listen
  currentConfig.electricalSystem = parseDynamicList(electricalSystemList);
  currentConfig.assemblies = parseDynamicList(assembliesList);
  currentConfig.standAloneComponents = parseDynamicList(standaloneList);

  updateSummary();
}

function parseDynamicList(listElement) {
  const items = [];
  Array.from(listElement.children).forEach((item) => {
    const itemData = {};
    const inputs = item.querySelectorAll("input, select");
    inputs.forEach((input) => {
      let value = input.value;
      if (!isNaN(parseFloat(value)) && isFinite(value)) {
        value = parseFloat(value);
      }
      if (input.name.includes(".")) {
        // Handle nested objects like position.x
        const [parent, child] = input.name.split(".");
        if (!itemData[parent]) itemData[parent] = {};
        itemData[parent][child] = value;
      } else {
        itemData[input.name] = value;
      }
    });
    items.push(itemData);
  });
  return items;
}

// Zusammenfassung aktualisieren
function updateSummary() {
  summaryOutput.innerHTML = `<pre>${JSON.stringify(
    currentConfig,
    null,
    2
  )}</pre>`;
}

// Szenarien-Verwaltung
function loadSavedScenarios() {
  fetch("/api/scenarios")
    .then((response) => response.json())
    .then((scenarios) => {
      savedScenariosSelect.innerHTML =
        '<option value="">-- Szenario auswählen --</option>';
      scenarios.forEach((s) => {
        const option = document.createElement("option");
        option.value = s;
        option.textContent = s;
        savedScenariosSelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Fehler beim Laden der Szenarien:", error));
}

function saveScenario() {
  const scenarioName = document.getElementById("scenario-name").value;
  if (!scenarioName) {
    alert("Bitte gib einen Namen für das Szenario ein.");
    return;
  }
  fetch(`/api/scenarios/${scenarioName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentConfig),
  })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      loadSavedScenarios();
    })
    .catch((error) => alert(`Fehler beim Speichern: ${error.message}`));
}

function loadScenario() {
  const scenarioName = savedScenariosSelect.value;
  if (!scenarioName) {
    alert("Bitte wähle ein Szenario zum Laden aus.");
    return;
  }
  fetch(`/api/scenarios/${scenarioName}`)
    .then((response) => {
      if (!response.ok) throw new Error("Szenario nicht gefunden.");
      return response.json();
    })
    .then((data) => {
      currentConfig = data;
      renderUIFromConfig();
      alert(`Szenario "${scenarioName}" geladen.`);
    })
    .catch((error) => alert(`Fehler beim Laden: ${error.message}`));
}

function deleteScenario() {
  const scenarioName = savedScenariosSelect.value;
  if (!scenarioName) {
    alert("Bitte wähle ein Szenario zum Löschen aus.");
    return;
  }
  if (
    !confirm(`Soll das Szenario "${scenarioName}" wirklich gelöscht werden?`)
  ) {
    return;
  }
  fetch(`/api/scenarios/${scenarioName}`, { method: "DELETE" })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      loadSavedScenarios();
      loadDefaultConfig();
    })
    .catch((error) => alert(`Fehler beim Löschen: ${error.message}`));
}

// simulation.json erstellen
function createSimulationFile(event) {
  event.preventDefault();
  updateConfigFromUI();
  const payload = {
    baseConfig: currentConfig,
  };
  // Wir senden nur die Basiskonfiguration. Das 'scenario' wird
  // später auf der Simulation-Seite definiert und hinzugefügt.
  alert(
    "Simulation.json wurde erstellt und kann auf der Simulation-Seite verwendet werden."
  );
  console.log(" simulation.json content:", payload.baseConfig);
}

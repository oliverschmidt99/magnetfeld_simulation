// static/js/configurator.js
let libraryData = {};
let currentConfig = {};
const savedScenariosSelect = document.getElementById("saved-scenarios");
const assembliesList = document.getElementById("assemblies-list");
const standaloneList = document.getElementById("standalone-list");
const electricalSystemList = document.getElementById("electrical-system-list");
const summaryOutput = document.getElementById("summary-output");

// Funktion zum Anzeigen des richtigen Konfigurations-Abschnitts
function setActiveTab(targetId) {
  document.querySelectorAll(".config-section").forEach((section) => {
    section.classList.remove("active");
  });
  const targetSection = document.getElementById(targetId);
  if (targetSection) {
    targetSection.classList.add("active");
  }
  if (targetId === "config-summary") {
    updateSummary();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    libraryData = JSON.parse(
      document.getElementById("library-data").textContent
    );
  } catch (e) {
    console.error("Fehler beim Laden der Bibliotheksdaten:", e);
  }

  loadDefaultConfig();
  loadSavedScenarios();

  // Funktion, die aufgerufen wird, wenn sich der Hash in der URL ändert (z.B. #config-params)
  function handleHashChange() {
    const hash = window.location.hash.substring(1) || "config-summary";
    setActiveTab(hash);
  }

  window.addEventListener("hashchange", handleHashChange);
  handleHashChange(); // Direkt beim Laden der Seite ausführen

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

  // Event-Listener für Formular-Änderungen
  document
    .getElementById("config-params")
    .addEventListener("input", updateConfigFromUI);
  electricalSystemList.addEventListener("input", updateConfigFromUI);
  assembliesList.addEventListener("input", updateConfigFromUI);
  standaloneList.addEventListener("input", updateConfigFromUI);
});

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

function renderUIFromConfig() {
  for (const key in currentConfig.simulationParams) {
    const input = document.getElementById(key);
    if (input) input.value = currentConfig.simulationParams[key];
  }
  renderElectricalSystem();
  renderAssemblies();
  renderStandaloneComponents();
  updateSummary();
}

function renderElectricalSystem() {
  electricalSystemList.innerHTML = "";
  currentConfig.electricalSystem.forEach((phase, index) => {
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${phase.name}"></div>
                <div class="form-group"><label>Phasenverschiebung (°)</label><input type="number" name="phaseShiftDeg" value="${phase.phaseShiftDeg}"></div>
                <div class="form-group"><label>Spitzenstrom (A)</label><input type="number" step="any" name="peakCurrentA" value="${phase.peakCurrentA}"></div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem('electricalSystem', ${index})">&times;</button>`;
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

function renderAssemblies() {
  assembliesList.innerHTML = "";
  currentConfig.assemblies.forEach((assembly, index) => {
    const railOptions = (libraryData.components.copperRails || [])
      .map(
        (r) =>
          `<option value="${r.templateProductInformation.name}" ${
            r.templateProductInformation.name === assembly.copperRailName
              ? "selected"
              : ""
          }>${r.templateProductInformation.name}</option>`
      )
      .join("");
    const transformerOptions = (libraryData.components.transformers || [])
      .map(
        (t) =>
          `<option value="${t.templateProductInformation.name}" ${
            t.templateProductInformation.name === assembly.transformerName
              ? "selected"
              : ""
          }>${t.templateProductInformation.name}</option>`
      )
      .join("");
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group"><label>Name</label><input type="text" name="name" value="${assembly.name}"></div>
                <div class="form-group"><label>Phase</label><input type="text" name="phaseName" value="${assembly.phaseName}"></div>
                <div class="form-group"><label>X-Position (mm)</label><input type="number" name="position.x" value="${assembly.position.x}"></div>
                <div class="form-group"><label>Y-Position (mm)</label><input type="number" name="position.y" value="${assembly.position.y}"></div>
                <div class="form-group"><label>Kupferschiene</label><select name="copperRailName">${railOptions}</select></div>
                <div class="form-group"><label>Wandler</label><select name="transformerName">${transformerOptions}</select></div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem('assemblies', ${index})">&times;</button>`;
    assembliesList.appendChild(div);
  });
}

window.addAssembly = () => {
  currentConfig.assemblies.push({
    name: `Assembly_${currentConfig.assemblies.length + 1}`,
    phaseName: "L1",
    position: { x: 0, y: 0 },
    copperRailName:
      libraryData.components.copperRails?.[0]?.templateProductInformation
        ?.name || "",
    transformerName:
      libraryData.components.transformers?.[0]?.templateProductInformation
        ?.name || "",
  });
  renderAssemblies();
};

function renderStandaloneComponents() {
  standaloneList.innerHTML = "";
  currentConfig.standAloneComponents.forEach((component, index) => {
    const sheetOptions = (libraryData.components.transformerSheets || [])
      .map(
        (s) =>
          `<option value="${s.templateProductInformation.name}" ${
            s.templateProductInformation.name === component.name
              ? "selected"
              : ""
          }>${s.templateProductInformation.name}</option>`
      )
      .join("");
    const div = document.createElement("div");
    div.className = "dynamic-item";
    div.innerHTML = `
            <div class="form-group-wrapper">
                <div class="form-group"><label>Typ</label><select name="name">${sheetOptions}</select></div>
                <div class="form-group"><label>X-Position (mm)</label><input type="number" name="position.x" value="${component.position.x}"></div>
                <div class="form-group"><label>Y-Position (mm)</label><input type="number" name="position.y" value="${component.position.y}"></div>
            </div>
            <button type="button" class="remove-btn" onclick="removeDynamicItem('standAloneComponents', ${index})">&times;</button>`;
    standaloneList.appendChild(div);
  });
}

window.addStandalone = () => {
  currentConfig.standAloneComponents.push({
    name:
      libraryData.components.transformerSheets?.[0]?.templateProductInformation
        ?.name || "",
    position: { x: 0, y: 0 },
  });
  renderStandaloneComponents();
};

window.removeDynamicItem = (listName, index) => {
  currentConfig[listName].splice(index, 1);
  renderUIFromConfig();
};

function updateConfigFromUI() {
  // Globale Parameter
  currentConfig.simulationParams.frequencyHz =
    parseFloat(document.getElementById("frequencyHz").value) || 0;
  currentConfig.simulationParams.problemDepthM =
    parseFloat(document.getElementById("problemDepthM").value) || 0;
  currentConfig.simulationParams.coreRelPermeability =
    parseFloat(document.getElementById("coreRelPermeability").value) || 0;
  // Dynamische Listen
  currentConfig.electricalSystem = parseDynamicList(electricalSystemList);
  currentConfig.assemblies = parseDynamicList(assembliesList);
  currentConfig.standAloneComponents = parseDynamicList(standaloneList);
  updateSummary();
}

function parseDynamicList(listElement) {
  return Array.from(listElement.children).map((item) => {
    const itemData = {};
    item.querySelectorAll("input, select").forEach((input) => {
      let value = input.value;
      if (!isNaN(parseFloat(value)) && isFinite(value) && value.trim() !== "") {
        value = parseFloat(value);
      }
      if (input.name.includes(".")) {
        const [parent, child] = input.name.split(".");
        if (!itemData[parent]) itemData[parent] = {};
        itemData[parent][child] = value;
      } else {
        itemData[input.name] = value;
      }
    });
    return itemData;
  });
}

function updateSummary() {
  summaryOutput.innerHTML = `<pre>${JSON.stringify(
    currentConfig,
    null,
    2
  )}</pre>`;
}

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
  if (!scenarioName)
    return alert("Bitte gib einen Namen für das Szenario ein.");
  updateConfigFromUI();
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
  if (!scenarioName) return alert("Bitte wähle ein Szenario zum Laden aus.");
  fetch(`/api/scenarios/${scenarioName}`)
    .then((response) => {
      if (!response.ok) throw new Error("Szenario nicht gefunden.");
      return response.json();
    })
    .then((data) => {
      currentConfig = data;
      renderUIFromConfig();
      document.getElementById("scenario-name").value = scenarioName;
      alert(`Szenario "${scenarioName}" geladen.`);
    })
    .catch((error) => alert(`Fehler beim Laden: ${error.message}`));
}

function deleteScenario() {
  const scenarioName = savedScenariosSelect.value;
  if (!scenarioName) return alert("Bitte wähle ein Szenario zum Löschen aus.");
  if (!confirm(`Soll das Szenario "${scenarioName}" wirklich gelöscht werden?`))
    return;
  fetch(`/api/scenarios/${scenarioName}`, { method: "DELETE" })
    .then((response) => response.json())
    .then((data) => {
      alert(data.message);
      loadSavedScenarios();
      document.getElementById("scenario-name").value = "";
      loadDefaultConfig();
    })
    .catch((error) => alert(`Fehler beim Löschen: ${error.message}`));
}

function createSimulationFile(event) {
  event.preventDefault();
  updateConfigFromUI();
  localStorage.setItem("simulationConfig", JSON.stringify(currentConfig));
  alert(
    "Konfiguration wurde zwischengespeichert und kann auf der Simulation-Seite verwendet werden."
  );
  console.log("Gespeicherte Konfiguration:", currentConfig);
}

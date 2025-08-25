document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("run-simulation-form")) {
    initializeSimulationPage();
  }
});

let currentConfigData = null;
let libraryData = null;

async function initializeSimulationPage() {
  // Lade zuerst die Bibliothek, damit wir die Bauteile kennen
  await fetch("/library")
    .then((res) => res.json())
    .then((data) => {
      libraryData = data.library;
      populateSheetDropdown();
    });

  // Lade dann die Liste der gespeicherten Szenarien
  await updateScenarioList();

  document
    .getElementById("analysis-type")
    .addEventListener("change", handleScenarioChange);
  document
    .getElementById("load-base-scenario-btn")
    .addEventListener("click", loadAndPreviewScenario);
  document
    .getElementById("run-simulation-form")
    .addEventListener("submit", runSimulation);
}

async function updateScenarioList() {
  const select = document.getElementById("base-scenario-select");
  if (!select) return;
  try {
    const response = await fetch("/scenarios");
    const scenarios = await response.json();
    select.innerHTML =
      '<option value="">-- Bitte eine Konfiguration laden --</option>';
    scenarios.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
  } catch (e) {
    console.error("Szenarien konnten nicht geladen werden:", e);
  }
}

async function loadAndPreviewScenario() {
  const select = document.getElementById("base-scenario-select");
  const name = select.value;
  if (!name) {
    alert("Bitte wähle ein Szenario zum Laden aus.");
    return;
  }

  const response = await fetch(`/scenarios/${name}`);
  const data = await response.json();

  if (response.ok) {
    currentConfigData = data;
    const previewContainer = document.getElementById("config-preview");
    const jsonPreview = document.getElementById("config-json-preview");

    jsonPreview.textContent = JSON.stringify(data, null, 2);
    previewContainer.style.display = "block";

    populateAssemblyDropdown(data.assemblies);

    document.getElementById("run-simulation-btn").disabled = false;
    alert(`Szenario '${name}' geladen und bereit zur Simulation.`);
  } else {
    alert(`Fehler beim Laden: ${data.error}`);
    document.getElementById("run-simulation-btn").disabled = true;
  }
}

function handleScenarioChange() {
  document
    .querySelectorAll(".scenario-details")
    .forEach((el) => (el.style.display = "none"));
  const selectedValue = document.getElementById("analysis-type").value;
  if (selectedValue !== "none") {
    const targetElement = document.getElementById(`${selectedValue}-scenario`);
    if (targetElement) {
      targetElement.style.display = "block";
    }
  }
}

function populateAssemblyDropdown(assemblies = []) {
  const select = document.getElementById("distance-assembly");
  if (!select) return;
  select.innerHTML = "";

  assemblies.forEach((asm, index) => {
    const option = document.createElement("option");
    option.value = index; // Wir verwenden den Index, um die Baugruppe zu identifizieren
    option.textContent = asm.name || `Baugruppe ${index + 1}`;
    select.appendChild(option);

    // Setze Startwerte basierend auf der geladenen Konfiguration
    if (index === 0) {
      document.getElementById("distance-x-start").value = asm.position.x;
      document.getElementById("distance-y-start").value = asm.position.y;
      document.getElementById("distance-x-end").value = asm.position.x + 200;
      document.getElementById("distance-y-end").value = asm.position.y;
    }
  });
}

function populateSheetDropdown() {
  const select = document.getElementById("shielding-sheet");
  if (!select || !libraryData) return;
  select.innerHTML = "";

  libraryData.components.transformerSheets.forEach((sheet) => {
    const option = document.createElement("option");
    option.value = sheet.templateProductInformation.name;
    option.textContent = sheet.templateProductInformation.name;
    select.appendChild(option);
  });
}

async function runSimulation(event) {
  event.preventDefault();
  if (!currentConfigData) {
    alert("Bitte lade zuerst eine Basiskonfiguration.");
    return;
  }

  const statusDiv = document.getElementById("simulation-status");
  statusDiv.textContent = "Simulation wird vorbereitet...";

  const analysisType = document.getElementById("analysis-type").value;
  let scenarioParams = { type: analysisType };

  if (analysisType === "current") {
    scenarioParams.start = parseFloat(
      document.getElementById("current-start").value
    );
    scenarioParams.end = parseFloat(
      document.getElementById("current-end").value
    );
    scenarioParams.steps = parseInt(
      document.getElementById("current-steps").value
    );
  } else if (analysisType === "distance") {
    scenarioParams.assemblyIndex = parseInt(
      document.getElementById("distance-assembly").value
    );
    scenarioParams.x_start = parseFloat(
      document.getElementById("distance-x-start").value
    );
    scenarioParams.x_end = parseFloat(
      document.getElementById("distance-x-end").value
    );
    scenarioParams.y_start = parseFloat(
      document.getElementById("distance-y-start").value
    );
    scenarioParams.y_end = parseFloat(
      document.getElementById("distance-y-end").value
    );
    scenarioParams.steps = parseInt(
      document.getElementById("distance-steps").value
    );
  } else if (analysisType === "shielding") {
    scenarioParams.sheetName = document.getElementById("shielding-sheet").value;
    scenarioParams.x_start = parseFloat(
      document.getElementById("shielding-x-start").value
    );
    scenarioParams.x_end = parseFloat(
      document.getElementById("shielding-x-end").value
    );
    scenarioParams.y_start = parseFloat(
      document.getElementById("shielding-y-start").value
    );
    scenarioParams.y_end = parseFloat(
      document.getElementById("shielding-y-end").value
    );
    scenarioParams.steps = parseInt(
      document.getElementById("shielding-steps").value
    );
  }

  const payload = {
    baseConfig: currentConfigData,
    scenario: scenarioParams,
  };

  try {
    const response = await fetch("/run_simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (response.ok) {
      statusDiv.textContent = `Erfolg: ${result.message}. Die 'simulation_run.json' ist bereit.`;
    } else {
      statusDiv.textContent = `Fehler: ${result.error}`;
    }
  } catch (error) {
    statusDiv.textContent = `Ein Netzwerkfehler ist aufgetreten: ${error}`;
  }
}

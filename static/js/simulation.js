// static/js/simulation.js
// JavaScript für die Seite zur Durchführung der Simulation.

let baseConfig = {};
let libraryData = {};

document.addEventListener("DOMContentLoaded", () => {
  const baseScenarioSelect = document.getElementById("base-scenario-select");
  const loadBaseScenarioBtn = document.getElementById("load-base-scenario-btn");
  const runSimulationForm = document.getElementById("run-simulation-form");
  const runSimulationBtn = document.getElementById("run-simulation-btn");
  const analysisTypeSelect = document.getElementById("analysis-type");
  const configPreview = document.getElementById("config-preview");
  const configJsonPreview = document.getElementById("config-json-preview");

  // Lade Bibliotheks- und Szenario-Daten
  function loadData() {
    // Lade Bibliotheksdaten aus dem statischen Skript
    fetch("/api/library")
      .then((response) => response.json())
      .then((data) => {
        libraryData = data;
        populateDropdowns();
      })
      .catch((e) => console.error("Fehler beim Laden der Bibliothek:", e));

    // Lade gespeicherte Szenarien
    fetch("/api/scenarios")
      .then((response) => response.json())
      .then((scenarios) => {
        baseScenarioSelect.innerHTML =
          '<option value="">-- Bitte eine Konfiguration laden --</option>';
        scenarios.forEach((s) => {
          // Filtere die standardmäßigen JSON-Dateien aus
          if (s !== "library" && s !== "tags" && s !== "measurement_config") {
            const option = document.createElement("option");
            option.value = s;
            option.textContent = s;
            baseScenarioSelect.appendChild(option);
          }
        });
      })
      .catch((e) => console.error("Fehler beim Laden der Szenarien:", e));
  }

  // Füllt Dropdowns basierend auf den Bibliotheksdaten
  function populateDropdowns() {
    const assemblies = baseConfig.assemblies || [];
    const standaloneSheets = libraryData.components.transformerSheets || [];

    // Füllt den Baugruppen-Dropdown für die Abstandsanalyse
    const distanceAssemblySelect = document.getElementById("distance-assembly");
    distanceAssemblySelect.innerHTML = assemblies
      .map((a) => `<option value="${a.name}">${a.name}</option>`)
      .join("");

    // Füllt den Abschirmblech-Dropdown
    const shieldingSheetSelect = document.getElementById("shielding-sheet");
    shieldingSheetSelect.innerHTML = standaloneSheets
      .map(
        (s) =>
          `<option value="${s.templateProductInformation.name}">${s.templateProductInformation.name}</option>`
      )
      .join("");

    // Zeige die Szenario-Details an, falls bereits ein Typ ausgewählt wurde
    showScenarioDetails();
  }

  // Lade Basiskonfiguration
  loadBaseScenarioBtn.addEventListener("click", () => {
    const scenarioName = baseScenarioSelect.value;
    if (!scenarioName) {
      alert("Bitte wähle ein Szenario aus.");
      return;
    }

    fetch(`/api/scenarios/${scenarioName}`)
      .then((response) => {
        if (!response.ok) throw new Error("Szenario nicht gefunden.");
        return response.json();
      })
      .then((config) => {
        baseConfig = config;
        configJsonPreview.textContent = JSON.stringify(baseConfig, null, 2);
        configPreview.style.display = "block";
        runSimulationBtn.disabled = false;
        populateDropdowns();
      })
      .catch((error) => {
        alert(`Fehler beim Laden: ${error.message}`);
        runSimulationBtn.disabled = true;
      });
  });

  // Zeige/verstecke die Szenario-Details basierend auf der Auswahl
  analysisTypeSelect.addEventListener("change", showScenarioDetails);

  function showScenarioDetails() {
    document.querySelectorAll(".scenario-details").forEach((div) => {
      div.style.display = "none";
    });
    const selectedType = analysisTypeSelect.value;
    if (selectedType !== "none") {
      document.getElementById(`${selectedType}-scenario`).style.display =
        "block";
    }
  }

  // Formular absenden
  runSimulationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const analysisType = analysisTypeSelect.value;
    let scenarioParams = {};

    // Sammle die Parameter basierend auf dem ausgewählten Typ
    if (analysisType === "current") {
      scenarioParams = {
        type: "current",
        start: parseFloat(document.getElementById("current-start").value),
        end: parseFloat(document.getElementById("current-end").value),
        stepSize: parseFloat(
          document.getElementById("current-step-size").value
        ),
      };
    } else if (analysisType === "distance") {
      scenarioParams = {
        type: "distance",
        assembly: document.getElementById("distance-assembly").value,
        startX: parseFloat(document.getElementById("distance-x-start").value),
        endX: parseFloat(document.getElementById("distance-x-end").value),
        startY: parseFloat(document.getElementById("distance-y-start").value),
        endY: parseFloat(document.getElementById("distance-y-end").value),
        stepSize: parseFloat(
          document.getElementById("distance-step-size").value
        ),
      };
    } else if (analysisType === "shielding") {
      scenarioParams = {
        type: "shielding",
        sheet: document.getElementById("shielding-sheet").value,
        startX: parseFloat(document.getElementById("shielding-x-start").value),
        endX: parseFloat(document.getElementById("shielding-x-end").value),
        startY: parseFloat(document.getElementById("shielding-y-start").value),
        endY: parseFloat(document.getElementById("shielding-y-end").value),
        stepSize: parseFloat(
          document.getElementById("shielding-step-size").value
        ),
      };
    } else {
      scenarioParams = { type: "none" };
    }

    const payload = {
      baseConfig: baseConfig,
      scenario: {
        phaseSweep: {
          start: parseFloat(document.getElementById("phase-start").value),
          end: parseFloat(document.getElementById("phase-end").value),
          stepSize: parseFloat(
            document.getElementById("phase-step-size").value
          ),
        },
        ...scenarioParams,
      },
    };

    const statusDiv = document.getElementById("simulation-status");
    statusDiv.textContent = "Simulation wird gestartet...";
    statusDiv.style.color = "blue";

    fetch("/run_simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((response) => response.json())
      .then((data) => {
        statusDiv.textContent = data.message;
        statusDiv.style.color = "green";
      })
      .catch((error) => {
        statusDiv.textContent = `Fehler beim Starten der Simulation: ${error.message}`;
        statusDiv.style.color = "red";
      });
  });

  loadData();
});
